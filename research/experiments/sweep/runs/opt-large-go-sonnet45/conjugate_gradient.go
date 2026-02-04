package optimization

import "math"

// ConjugateGradientOptions extends OptimizeOptions with CG-specific parameters
type ConjugateGradientOptions struct {
	OptimizeOptions
	Eta             float64
	RestartInterval int
}

// DefaultConjugateGradientOptions returns default CG options
func DefaultConjugateGradientOptions(opts *ConjugateGradientOptions, n int) ConjugateGradientOptions {
	options := ConjugateGradientOptions{
		OptimizeOptions: DefaultOptions(nil),
		Eta:             0.4,
		RestartInterval: n, // dimension by default
	}

	if opts != nil {
		if opts.GradTol != 0 {
			options.GradTol = opts.GradTol
		}
		if opts.StepTol != 0 {
			options.StepTol = opts.StepTol
		}
		if opts.FuncTol != 0 {
			options.FuncTol = opts.FuncTol
		}
		if opts.MaxIterations != 0 {
			options.MaxIterations = opts.MaxIterations
		}
		if opts.Eta != 0 {
			options.Eta = opts.Eta
		}
		if opts.RestartInterval != 0 {
			options.RestartInterval = opts.RestartInterval
		}
	}

	return options
}

// ConjugateGradient performs optimization using nonlinear conjugate gradient with Hager-Zhang
func ConjugateGradient(
	f func([]float64) float64,
	x0 []float64,
	grad func([]float64) []float64,
	opts *ConjugateGradientOptions,
) OptimizeResult {
	n := len(x0)
	options := DefaultConjugateGradientOptions(opts, n)

	// If no gradient provided, use finite differences
	if grad == nil {
		grad = func(x []float64) []float64 {
			return ForwardDiffGradient(f, x)
		}
	}

	x := Clone(x0)
	fx := f(x)
	gx := grad(x)

	functionCalls := 1
	gradientCalls := 1

	// Check if already at minimum (use -1 to skip step and function checks)
	gradNorm := Norm(gx)
	reason := CheckConvergence(gradNorm, -1, -1, 0, options.OptimizeOptions)
	if reason != nil && IsConverged(reason) {
		return OptimizeResult{
			X:             x,
			Fun:           fx,
			Gradient:      gx,
			Iterations:    0,
			FunctionCalls: functionCalls,
			GradientCalls: gradientCalls,
			Converged:     true,
			Message:       ConvergenceMessage(reason),
		}
	}

	// Initial direction: steepest descent
	d := Negate(gx)

	for iter := 0; iter < options.MaxIterations; iter++ {
		// Hager-Zhang line search
		lsResult := HagerZhangLineSearch(f, grad, x, d, fx, gx, nil)
		functionCalls += lsResult.FunctionCalls
		gradientCalls += lsResult.GradientCalls

		if !lsResult.Success {
			return OptimizeResult{
				X:             x,
				Fun:           fx,
				Gradient:      gx,
				Iterations:    iter + 1,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Converged:     false,
				Message:       ConvergenceMessage(&ConvergenceReason{Kind: "lineSearchFailed"}),
			}
		}

		// Update position
		xNew := AddScaled(x, d, lsResult.Alpha)
		fNew := lsResult.FNew
		gNew := lsResult.GNew
		s := Sub(xNew, x)

		// Compute Hager-Zhang beta
		y := Sub(gNew, gx)
		dDotY := Dot(d, y)

		var beta float64
		if math.Abs(dDotY) > 1e-30 {
			yDotGNew := Dot(y, gNew)
			yDotY := Dot(y, y)
			dDotGNew := Dot(d, gNew)

			betaHZ := (yDotGNew - 2*yDotY*dDotGNew/dDotY) / dDotY

			// Eta guarantee
			dNorm := Norm(d)
			gNorm := Norm(gx)
			etaK := -1.0 / (dNorm * math.Min(options.Eta, gNorm))
			beta = math.Max(betaHZ, etaK)
		} else {
			beta = 0.0
		}

		// Update direction
		for i := range d {
			d[i] = -gNew[i] + beta*d[i]
		}

		// Descent safety check
		if Dot(d, gNew) >= 0 {
			d = Negate(gNew)
		}

		// Periodic restart
		if (iter+1)%options.RestartInterval == 0 {
			d = Negate(gNew)
		}

		// Check convergence before updating
		gradNorm = Norm(gNew)
		stepNorm := Norm(s)
		funcChange := math.Abs(fNew - fx)

		// Update for next iteration
		x = xNew
		fx = fNew
		gx = gNew

		reason = CheckConvergence(gradNorm, stepNorm, funcChange, iter+1, options.OptimizeOptions)
		if reason != nil {
			return OptimizeResult{
				X:             x,
				Fun:           fx,
				Gradient:      gx,
				Iterations:    iter + 1,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Converged:     IsConverged(reason),
				Message:       ConvergenceMessage(reason),
			}
		}
	}

	// Should not reach here
	return OptimizeResult{
		X:             x,
		Fun:           fx,
		Gradient:      gx,
		Iterations:    options.MaxIterations,
		FunctionCalls: functionCalls,
		GradientCalls: gradientCalls,
		Converged:     false,
		Message:       "Maximum iterations reached",
	}
}
