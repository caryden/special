package optimization

import "math"

// LineSearchResult contains the result of a line search.
type LineSearchResult struct {
	Alpha         float64
	FNew          float64
	GNew          []float64 // nil if gradient not computed
	FunctionCalls int
	GradientCalls int
	Success       bool
}

// BacktrackingOptions contains options for backtracking line search.
type BacktrackingOptions struct {
	InitialAlpha float64
	C1           float64
	Rho          float64
	MaxIter      int
}

func defaultBacktrackingOptions() BacktrackingOptions {
	return BacktrackingOptions{
		InitialAlpha: 1.0,
		C1:           1e-4,
		Rho:          0.5,
		MaxIter:      20,
	}
}

// BacktrackingLineSearch performs backtracking line search with Armijo condition.
func BacktrackingLineSearch(
	f func([]float64) float64,
	x []float64,
	d []float64,
	fx float64,
	gx []float64,
	opts *BacktrackingOptions,
) LineSearchResult {
	if opts == nil {
		defaultOpts := defaultBacktrackingOptions()
		opts = &defaultOpts
	} else {
		// Fill in zero values with defaults
		if opts.InitialAlpha == 0 {
			opts.InitialAlpha = 1.0
		}
		if opts.C1 == 0 {
			opts.C1 = 1e-4
		}
		if opts.Rho == 0 {
			opts.Rho = 0.5
		}
		if opts.MaxIter == 0 {
			opts.MaxIter = 20
		}
	}

	alpha := opts.InitialAlpha
	slope := Dot(gx, d)
	functionCalls := 0

	// Check if d is a descent direction
	if slope >= 0 {
		return LineSearchResult{
			Alpha:         0,
			FNew:          fx,
			GNew:          nil,
			FunctionCalls: 0,
			GradientCalls: 0,
			Success:       false,
		}
	}

	for i := 0; i < opts.MaxIter; i++ {
		xNew := AddScaled(x, d, alpha)
		fNew := f(xNew)
		functionCalls++

		// Armijo condition
		if fNew <= fx+opts.C1*alpha*slope {
			return LineSearchResult{
				Alpha:         alpha,
				FNew:          fNew,
				GNew:          nil,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Success:       true,
			}
		}

		alpha *= opts.Rho
	}

	return LineSearchResult{
		Alpha:         alpha,
		FNew:          fx,
		GNew:          nil,
		FunctionCalls: functionCalls,
		GradientCalls: 0,
		Success:       false,
	}
}

// WolfeOptions contains options for Wolfe line search.
type WolfeOptions struct {
	C1       float64
	C2       float64
	AlphaMax float64
	MaxIter  int
}

func defaultWolfeOptions() WolfeOptions {
	return WolfeOptions{
		C1:       1e-4,
		C2:       0.9,
		AlphaMax: 1e6,
		MaxIter:  25,
	}
}

// WolfeLineSearch performs line search satisfying strong Wolfe conditions.
func WolfeLineSearch(
	f func([]float64) float64,
	grad func([]float64) []float64,
	x []float64,
	d []float64,
	fx float64,
	gx []float64,
	opts *WolfeOptions,
) LineSearchResult {
	if opts == nil {
		defaultOpts := defaultWolfeOptions()
		opts = &defaultOpts
	} else {
		// Fill in zero values with defaults
		if opts.C1 == 0 {
			opts.C1 = 1e-4
		}
		if opts.C2 == 0 {
			opts.C2 = 0.9
		}
		if opts.AlphaMax == 0 {
			opts.AlphaMax = 1e6
		}
		if opts.MaxIter == 0 {
			opts.MaxIter = 25
		}
	}

	functionCalls := 0
	gradientCalls := 0
	slope0 := Dot(gx, d)

	// Check if d is a descent direction
	if slope0 >= 0 {
		return LineSearchResult{
			Alpha:         0,
			FNew:          fx,
			GNew:          nil,
			FunctionCalls: 0,
			GradientCalls: 0,
			Success:       false,
		}
	}

	alphaMax := opts.AlphaMax
	alpha := 1.0
	fPrev := fx
	alphaPrev := 0.0

	for i := 0; i < opts.MaxIter; i++ {
		xNew := AddScaled(x, d, alpha)
		fNew := f(xNew)
		functionCalls++

		// Check Armijo condition and fNew > fPrev (indicates we stepped over minimum)
		if (fNew > fx+opts.C1*alpha*slope0) || (i > 0 && fNew >= fPrev) {
			result := zoom(f, grad, x, d, fx, gx, alphaPrev, alpha, fPrev, fNew, slope0, opts.C1, opts.C2, &functionCalls, &gradientCalls)
			result.FunctionCalls = functionCalls
			result.GradientCalls = gradientCalls
			return result
		}

		gNew := grad(xNew)
		gradientCalls++
		slopeNew := Dot(gNew, d)

		// Check curvature condition
		if math.Abs(slopeNew) <= -opts.C2*slope0 {
			return LineSearchResult{
				Alpha:         alpha,
				FNew:          fNew,
				GNew:          gNew,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Success:       true,
			}
		}

		// If slope is positive, we've gone past the minimum
		if slopeNew >= 0 {
			result := zoom(f, grad, x, d, fx, gx, alpha, alphaPrev, fNew, fPrev, slope0, opts.C1, opts.C2, &functionCalls, &gradientCalls)
			result.FunctionCalls = functionCalls
			result.GradientCalls = gradientCalls
			return result
		}

		// Expand the interval
		alphaPrev = alpha
		fPrev = fNew
		alpha = math.Min(2*alpha, alphaMax)

		if alpha >= alphaMax {
			break
		}
	}

	return LineSearchResult{
		Alpha:         alpha,
		FNew:          fx,
		GNew:          nil,
		FunctionCalls: functionCalls,
		GradientCalls: gradientCalls,
		Success:       false,
	}
}

// zoom narrows the bracket [alphaLo, alphaHi] to find a point satisfying Wolfe conditions.
func zoom(
	f func([]float64) float64,
	grad func([]float64) []float64,
	x []float64,
	d []float64,
	fx float64,
	gx []float64,
	alphaLo float64,
	alphaHi float64,
	fLo float64,
	fHi float64,
	slope0 float64,
	c1 float64,
	c2 float64,
	functionCalls *int,
	gradientCalls *int,
) LineSearchResult {
	maxZoomIter := 20

	for i := 0; i < maxZoomIter; i++ {
		// Bisection
		alpha := (alphaLo + alphaHi) / 2.0

		xNew := AddScaled(x, d, alpha)
		fNew := f(xNew)
		*functionCalls++

		// Check Armijo condition
		if (fNew > fx+c1*alpha*slope0) || (fNew >= fLo) {
			alphaHi = alpha
			fHi = fNew
		} else {
			gNew := grad(xNew)
			*gradientCalls++
			slopeNew := Dot(gNew, d)

			// Check curvature condition
			if math.Abs(slopeNew) <= -c2*slope0 {
				return LineSearchResult{
					Alpha:   alpha,
					FNew:    fNew,
					GNew:    gNew,
					Success: true,
				}
			}

			if slopeNew*(alphaHi-alphaLo) >= 0 {
				alphaHi = alphaLo
				fHi = fLo
			}

			alphaLo = alpha
			fLo = fNew
		}

		// Check if bracket is too small
		if math.Abs(alphaHi-alphaLo) < 1e-10 {
			break
		}
	}

	return LineSearchResult{
		Alpha:   alphaLo,
		FNew:    fLo,
		GNew:    nil,
		Success: false,
	}
}
