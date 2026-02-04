package optimization

import "math"

// LineSearchResult contains the result of a line search
type LineSearchResult struct {
	Alpha         float64
	FNew          float64
	GNew          []float64 // nil if not computed
	FunctionCalls int
	GradientCalls int
	Success       bool
}

// BacktrackingLineSearch performs a simple backtracking line search (Armijo condition)
func BacktrackingLineSearch(
	f func([]float64) float64,
	x, d []float64,
	fx float64,
	gx []float64,
	c1 float64,
	rho float64,
	initialAlpha float64,
	maxIter int,
) LineSearchResult {
	// Set defaults
	if c1 == 0 {
		c1 = 1e-4
	}
	if rho == 0 {
		rho = 0.5
	}
	if initialAlpha == 0 {
		initialAlpha = 1.0
	}
	if maxIter == 0 {
		maxIter = 20
	}

	alpha := initialAlpha
	gxDotD := Dot(gx, d)
	functionCalls := 0

	for i := 0; i < maxIter; i++ {
		xNew := AddScaled(x, d, alpha)
		fNew := f(xNew)
		functionCalls++

		// Check Armijo condition
		if fNew <= fx+c1*alpha*gxDotD {
			return LineSearchResult{
				Alpha:         alpha,
				FNew:          fNew,
				GNew:          nil,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Success:       true,
			}
		}

		alpha *= rho
	}

	// Failed to find acceptable step
	return LineSearchResult{
		Alpha:         alpha,
		FNew:          f(AddScaled(x, d, alpha)),
		GNew:          nil,
		FunctionCalls: functionCalls + 1,
		GradientCalls: 0,
		Success:       false,
	}
}

// WolfeLineSearch performs a line search satisfying the strong Wolfe conditions
func WolfeLineSearch(
	f func([]float64) float64,
	grad func([]float64) []float64,
	x, d []float64,
	fx float64,
	gx []float64,
	c1 float64,
	c2 float64,
	alphaMax float64,
	maxIter int,
) LineSearchResult {
	// Set defaults
	if c1 == 0 {
		c1 = 1e-4
	}
	if c2 == 0 {
		c2 = 0.9
	}
	if alphaMax == 0 {
		alphaMax = 1e6
	}
	if maxIter == 0 {
		maxIter = 25
	}

	functionCalls := 0
	gradientCalls := 0
	gxDotD := Dot(gx, d)

	alpha1 := 1.0
	phi0 := fx
	dphi0 := gxDotD

	alphaPrev := 0.0
	phiPrev := phi0

	for i := 0; i < maxIter; i++ {
		xNew := AddScaled(x, d, alpha1)
		phi1 := f(xNew)
		functionCalls++

		// Check if we violate Armijo or if function increased from previous
		if (phi1 > phi0+c1*alpha1*dphi0) || (i > 0 && phi1 >= phiPrev) {
			result := zoom(f, grad, x, d, alphaPrev, alpha1, phi0, dphi0, phiPrev, phi1, c1, c2, &functionCalls, &gradientCalls)
			return result
		}

		gNew := grad(xNew)
		gradientCalls++
		dphi1 := Dot(gNew, d)

		// Check curvature condition
		if math.Abs(dphi1) <= -c2*dphi0 {
			return LineSearchResult{
				Alpha:         alpha1,
				FNew:          phi1,
				GNew:          gNew,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Success:       true,
			}
		}

		// Check if slope is positive (we've gone past minimum)
		if dphi1 >= 0 {
			result := zoom(f, grad, x, d, alpha1, alphaPrev, phi0, dphi0, phi1, phiPrev, c1, c2, &functionCalls, &gradientCalls)
			return result
		}

		// Expand bracket
		alphaPrev = alpha1
		phiPrev = phi1
		alpha1 = math.Min(alpha1*2.0, alphaMax)
	}

	// Failed to find acceptable step
	xNew := AddScaled(x, d, alpha1)
	fNew := f(xNew)
	functionCalls++

	return LineSearchResult{
		Alpha:         alpha1,
		FNew:          fNew,
		GNew:          nil,
		FunctionCalls: functionCalls,
		GradientCalls: gradientCalls,
		Success:       false,
	}
}

// zoom is the internal function for narrowing the bracket in Wolfe line search
func zoom(
	f func([]float64) float64,
	grad func([]float64) []float64,
	x, d []float64,
	alphaLo, alphaHi float64,
	phi0, dphi0 float64,
	phiLo, phiHi float64,
	c1, c2 float64,
	functionCalls *int,
	gradientCalls *int,
) LineSearchResult {
	const maxZoomIter = 20

	for i := 0; i < maxZoomIter; i++ {
		// Bisection (simple approach; cubic interpolation would be more sophisticated)
		alpha := (alphaLo + alphaHi) / 2.0

		xNew := AddScaled(x, d, alpha)
		phi := f(xNew)
		*functionCalls++

		if phi > phi0+c1*alpha*dphi0 || phi >= phiLo {
			alphaHi = alpha
			phiHi = phi
		} else {
			gNew := grad(xNew)
			*gradientCalls++
			dphi := Dot(gNew, d)

			if math.Abs(dphi) <= -c2*dphi0 {
				return LineSearchResult{
					Alpha:         alpha,
					FNew:          phi,
					GNew:          gNew,
					FunctionCalls: *functionCalls,
					GradientCalls: *gradientCalls,
					Success:       true,
				}
			}

			if dphi*(alphaHi-alphaLo) >= 0 {
				alphaHi = alphaLo
				phiHi = phiLo
			}

			alphaLo = alpha
			phiLo = phi
		}
	}

	// Failed to zoom in on acceptable step
	alpha := (alphaLo + alphaHi) / 2.0
	xNew := AddScaled(x, d, alpha)
	fNew := f(xNew)
	*functionCalls++

	return LineSearchResult{
		Alpha:         alpha,
		FNew:          fNew,
		GNew:          nil,
		FunctionCalls: *functionCalls,
		GradientCalls: *gradientCalls,
		Success:       false,
	}
}
