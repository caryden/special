package optimization

import "math"

// identityMatrix creates an n×n identity matrix
func identityMatrix(n int) [][]float64 {
	H := make([][]float64, n)
	for i := range H {
		H[i] = make([]float64, n)
		H[i][i] = 1.0
	}
	return H
}

// matVecMul computes matrix-vector product
func matVecMul(M [][]float64, v []float64) []float64 {
	n := len(M)
	result := make([]float64, n)
	for i := 0; i < n; i++ {
		sum := 0.0
		for j := 0; j < n; j++ {
			sum += M[i][j] * v[j]
		}
		result[i] = sum
	}
	return result
}

// bfgsUpdate applies the BFGS inverse Hessian update formula
func bfgsUpdate(H [][]float64, s, y []float64, rho float64) [][]float64 {
	n := len(H)
	HNew := make([][]float64, n)
	for i := range HNew {
		HNew[i] = make([]float64, n)
	}

	// Compute I - rho*s*y^T
	Isy := make([][]float64, n)
	for i := 0; i < n; i++ {
		Isy[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			if i == j {
				Isy[i][j] = 1.0
			}
			Isy[i][j] -= rho * s[i] * y[j]
		}
	}

	// Compute I - rho*y*s^T
	Iys := make([][]float64, n)
	for i := 0; i < n; i++ {
		Iys[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			if i == j {
				Iys[i][j] = 1.0
			}
			Iys[i][j] -= rho * y[i] * s[j]
		}
	}

	// Compute (I - rho*s*y^T) * H
	IsyH := make([][]float64, n)
	for i := 0; i < n; i++ {
		IsyH[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			sum := 0.0
			for k := 0; k < n; k++ {
				sum += Isy[i][k] * H[k][j]
			}
			IsyH[i][j] = sum
		}
	}

	// Compute (I - rho*s*y^T) * H * (I - rho*y*s^T)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			sum := 0.0
			for k := 0; k < n; k++ {
				sum += IsyH[i][k] * Iys[k][j]
			}
			HNew[i][j] = sum
		}
	}

	// Add rho*s*s^T
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			HNew[i][j] += rho * s[i] * s[j]
		}
	}

	return HNew
}

// BFGS performs optimization using the BFGS quasi-Newton method
func BFGS(
	f func([]float64) float64,
	x0 []float64,
	grad func([]float64) []float64,
	opts *OptimizeOptions,
) OptimizeResult {
	n := len(x0)
	options := DefaultOptions(opts)

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
	reason := CheckConvergence(gradNorm, -1, -1, 0, options)
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

	// Initialize inverse Hessian to identity
	H := identityMatrix(n)

	for iter := 0; iter < options.MaxIterations; iter++ {
		// Compute search direction: d = -H * g
		d := matVecMul(H, gx)
		for i := range d {
			d[i] = -d[i]
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

		// Curvature condition guard
		ys := Dot(y, s)
		if ys > 1e-10 {
			rho := 1.0 / ys
			H = bfgsUpdate(H, s, y, rho)
		}

		// Check convergence before updating
		gradNorm = Norm(gNew)
		stepNorm := Norm(s)
		funcChange := math.Abs(fNew - fx)

		// Update for next iteration
		x = xNew
		fx = fNew
		gx = gNew

		reason = CheckConvergence(gradNorm, stepNorm, funcChange, iter+1, options)
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
