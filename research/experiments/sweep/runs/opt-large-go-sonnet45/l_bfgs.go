package optimization

import "math"

// LBFGSOptions extends OptimizeOptions with L-BFGS specific parameters
type LBFGSOptions struct {
	OptimizeOptions
	Memory int
}

// DefaultLBFGSOptions returns default L-BFGS options
func DefaultLBFGSOptions(opts *LBFGSOptions) LBFGSOptions {
	options := LBFGSOptions{
		OptimizeOptions: DefaultOptions(nil),
		Memory:          10,
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
		if opts.Memory != 0 {
			options.Memory = opts.Memory
		}
	}

	return options
}

// twoLoopRecursion computes H*g using the L-BFGS two-loop recursion
func twoLoopRecursion(g []float64, sHistory, yHistory [][]float64, rhoHistory []float64, gamma float64) []float64 {
	m := len(sHistory)

	q := Clone(g)
	alpha := make([]float64, m)

	// First loop (backward)
	for i := m - 1; i >= 0; i-- {
		alpha[i] = rhoHistory[i] * Dot(sHistory[i], q)
		q = AddScaled(q, yHistory[i], -alpha[i])
	}

	// Scale by gamma * I
	r := Scale(q, gamma)

	// Second loop (forward)
	for i := 0; i < m; i++ {
		beta := rhoHistory[i] * Dot(yHistory[i], r)
		r = AddScaled(r, sHistory[i], alpha[i]-beta)
	}

	return r
}

// LBFGS performs optimization using the limited-memory BFGS method
func LBFGS(
	f func([]float64) float64,
	x0 []float64,
	grad func([]float64) []float64,
	opts *LBFGSOptions,
) OptimizeResult {
	options := DefaultLBFGSOptions(opts)

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

	// History storage (circular buffer)
	var sHistory [][]float64
	var yHistory [][]float64
	var rhoHistory []float64
	gamma := 1.0

	for iter := 0; iter < options.MaxIterations; iter++ {
		// Compute search direction
		var d []float64
		if len(sHistory) == 0 {
			// First iteration: steepest descent
			d = Negate(gx)
		} else {
			// Use two-loop recursion
			Hg := twoLoopRecursion(gx, sHistory, yHistory, rhoHistory, gamma)
			d = Negate(Hg)
		}

		// Wolfe line search
		lsResult := WolfeLineSearch(f, grad, x, d, fx, gx, 1e-4, 0.9, 1e6, 25)
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

		// Compute step and gradient change
		s := Sub(xNew, x)
		y := Sub(gNew, gx)

		// Curvature condition
		ys := Dot(y, s)
		if ys > 1e-10 {
			rho := 1.0 / ys

			// Add to history
			sHistory = append(sHistory, s)
			yHistory = append(yHistory, y)
			rhoHistory = append(rhoHistory, rho)

			// Maintain circular buffer
			if len(sHistory) > options.Memory {
				sHistory = sHistory[1:]
				yHistory = yHistory[1:]
				rhoHistory = rhoHistory[1:]
			}

			// Update gamma
			yy := Dot(y, y)
			gamma = ys / yy
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
