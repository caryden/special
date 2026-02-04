package optimization

import "math"

// BFGS performs quasi-Newton optimization using the BFGS algorithm.
func BFGS(
	f func([]float64) float64,
	x0 []float64,
	grad func([]float64) []float64,
	options *OptimizeOptions,
) OptimizeResult {
	opts := DefaultOptions(options)

	// Use finite differences if no gradient provided
	gradFunc := grad
	if gradFunc == nil {
		gradFunc = MakeGradient(f, "")
	}

	n := len(x0)
	x := Clone(x0)
	fx := f(x)
	gx := gradFunc(x)

	functionCalls := 1
	gradientCalls := 1

	// Initialize inverse Hessian approximation as identity
	H := identityMatrix(n)

	// Check if already at minimum
	gradNorm := Norm(gx)
	if gradNorm < opts.GradTol {
		return OptimizeResult{
			X:             x,
			Fun:           fx,
			Gradient:      gx,
			Iterations:    0,
			FunctionCalls: functionCalls,
			GradientCalls: gradientCalls,
			Converged:     true,
			Message:       "Converged: gradient norm below tolerance",
		}
	}

	var fxPrev float64
	iteration := 0

	for iteration < opts.MaxIterations {
		// Compute search direction: d = -H * g
		d := matVecMul(H, gx)
		d = Negate(d)

		// Perform line search
		lineResult := WolfeLineSearch(f, gradFunc, x, d, fx, gx, nil)
		functionCalls += lineResult.FunctionCalls
		gradientCalls += lineResult.GradientCalls

		if !lineResult.Success {
			return OptimizeResult{
				X:             x,
				Fun:           fx,
				Gradient:      gx,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Converged:     false,
				Message:       "Terminated: line search failed",
			}
		}

		// Update position
		xNew := AddScaled(x, d, lineResult.Alpha)
		fxNew := lineResult.FNew
		gxNew := lineResult.GNew
		if gxNew == nil {
			gxNew = gradFunc(xNew)
			gradientCalls++
		}

		// Compute step and gradient change
		s := Sub(xNew, x)
		y := Sub(gxNew, gx)

		// Check convergence
		fxPrev = fx
		fx = fxNew
		x = xNew
		gx = gxNew
		iteration++

		gradNorm = Norm(gx)
		stepNorm := Norm(s)
		funcChange := math.Abs(fx - fxPrev)

		reason := CheckConvergence(gradNorm, stepNorm, funcChange, iteration, opts)
		if reason != nil {
			return OptimizeResult{
				X:             x,
				Fun:           fx,
				Gradient:      gx,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Converged:     IsConverged(reason),
				Message:       ConvergenceMessage(reason),
			}
		}

		// BFGS update with curvature guard
		ys := Dot(y, s)
		if ys > 1e-10 {
			rho := 1.0 / ys
			H = bfgsUpdate(H, s, y, rho)
		}
	}

	// Should not reach here if CheckConvergence is correct, but for safety
	return OptimizeResult{
		X:             x,
		Fun:           fx,
		Gradient:      gx,
		Iterations:    iteration,
		FunctionCalls: functionCalls,
		GradientCalls: gradientCalls,
		Converged:     false,
		Message:       "Terminated: maximum iterations reached",
	}
}

// identityMatrix creates an n×n identity matrix.
func identityMatrix(n int) [][]float64 {
	matrix := make([][]float64, n)
	for i := 0; i < n; i++ {
		matrix[i] = make([]float64, n)
		matrix[i][i] = 1.0
	}
	return matrix
}

// matVecMul computes matrix-vector product where M is an array of row arrays.
func matVecMul(M [][]float64, v []float64) []float64 {
	n := len(M)
	result := make([]float64, n)
	for i := 0; i < n; i++ {
		result[i] = Dot(M[i], v)
	}
	return result
}

// bfgsUpdate applies the BFGS inverse Hessian update formula.
// H_{k+1} = (I - rho*s*y^T) * H * (I - rho*y*s^T) + rho*s*s^T
func bfgsUpdate(H [][]float64, s, y []float64, rho float64) [][]float64 {
	n := len(H)
	HNew := make([][]float64, n)

	// First term: (I - rho*s*y^T) * H
	// Second term: ... * (I - rho*y*s^T)
	// Third term: + rho*s*s^T

	// Compute H * (I - rho*y*s^T) first
	temp := make([][]float64, n)
	for i := 0; i < n; i++ {
		temp[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			// H[i,k] * (I - rho*y*s^T)[k,j]
			// = H[i,k] * (delta_kj - rho*y[k]*s[j])
			sum := 0.0
			for k := 0; k < n; k++ {
				delta := 0.0
				if k == j {
					delta = 1.0
				}
				sum += H[i][k] * (delta - rho*y[k]*s[j])
			}
			temp[i][j] = sum
		}
	}

	// Now compute (I - rho*s*y^T) * temp + rho*s*s^T
	for i := 0; i < n; i++ {
		HNew[i] = make([]float64, n)
		for j := 0; j < n; j++ {
			// (I - rho*s*y^T)[i,k] * temp[k,j]
			// = (delta_ik - rho*s[i]*y[k]) * temp[k,j]
			sum := 0.0
			for k := 0; k < n; k++ {
				delta := 0.0
				if i == k {
					delta = 1.0
				}
				sum += (delta - rho*s[i]*y[k]) * temp[k][j]
			}
			// Add third term: rho*s[i]*s[j]
			HNew[i][j] = sum + rho*s[i]*s[j]
		}
	}

	return HNew
}
