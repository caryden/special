package optimization

import "math"

// FminboxOptions contains box-constrained optimization parameters
type FminboxOptions struct {
	OptimizeOptions
	Lower            []float64
	Upper            []float64
	Method           string  // "bfgs", "l-bfgs", "conjugate-gradient"
	Mu0              *float64 // nil = auto
	MuFactor         float64
	OuterIterations  int
	OuterGradTol     float64
}

// DefaultFminboxOptions returns default fminbox options
func DefaultFminboxOptions(n int, opts *FminboxOptions) FminboxOptions {
	lower := make([]float64, n)
	upper := make([]float64, n)
	for i := range lower {
		lower[i] = math.Inf(-1)
		upper[i] = math.Inf(1)
	}

	options := FminboxOptions{
		OptimizeOptions: DefaultOptions(nil),
		Lower:           lower,
		Upper:           upper,
		Method:          "l-bfgs",
		Mu0:             nil,
		MuFactor:        0.001,
		OuterIterations: 20,
		OuterGradTol:    1e-8,
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
		if opts.Lower != nil {
			options.Lower = opts.Lower
		}
		if opts.Upper != nil {
			options.Upper = opts.Upper
		}
		if opts.Method != "" {
			options.Method = opts.Method
		}
		if opts.Mu0 != nil {
			options.Mu0 = opts.Mu0
		}
		if opts.MuFactor != 0 {
			options.MuFactor = opts.MuFactor
		}
		if opts.OuterIterations != 0 {
			options.OuterIterations = opts.OuterIterations
		}
		if opts.OuterGradTol != 0 {
			options.OuterGradTol = opts.OuterGradTol
		}
	}

	return options
}

// BarrierValue computes the logarithmic barrier function value
func BarrierValue(x, lower, upper []float64) float64 {
	sum := 0.0
	for i := range x {
		if !math.IsInf(lower[i], 0) {
			dx := x[i] - lower[i]
			if dx <= 0 {
				return math.Inf(1)
			}
			sum -= math.Log(dx)
		}
		if !math.IsInf(upper[i], 0) {
			dx := upper[i] - x[i]
			if dx <= 0 {
				return math.Inf(1)
			}
			sum -= math.Log(dx)
		}
	}
	return sum
}

// BarrierGradient computes the logarithmic barrier gradient
func BarrierGradient(x, lower, upper []float64) []float64 {
	grad := make([]float64, len(x))
	for i := range x {
		if !math.IsInf(lower[i], 0) {
			grad[i] -= 1.0 / (x[i] - lower[i])
		}
		if !math.IsInf(upper[i], 0) {
			grad[i] += 1.0 / (upper[i] - x[i])
		}
	}
	return grad
}

// ProjectedGradientNorm computes the infinity norm of the projected gradient
func ProjectedGradientNorm(x, g, lower, upper []float64) float64 {
	maxVal := 0.0
	for i := range x {
		// Projected point: clamp(x - g, lower, upper)
		proj := x[i] - g[i]
		proj = math.Max(lower[i], math.Min(upper[i], proj))

		// Projected gradient component
		diff := math.Abs(x[i] - proj)
		if diff > maxVal {
			maxVal = diff
		}
	}
	return maxVal
}

// nudgeToInterior adjusts x to be strictly inside bounds
func nudgeToInterior(x, lower, upper []float64) []float64 {
	xNew := Clone(x)
	for i := range xNew {
		lowerFinite := !math.IsInf(lower[i], 0)
		upperFinite := !math.IsInf(upper[i], 0)

		if lowerFinite && upperFinite {
			// Both bounds finite
			if xNew[i] <= lower[i] || xNew[i] >= upper[i] {
				xNew[i] = 0.99*lower[i] + 0.01*upper[i]
				if xNew[i] <= lower[i] {
					xNew[i] = lower[i] + 1e-8
				}
			}
		} else if lowerFinite && xNew[i] <= lower[i] {
			// Only lower bound finite
			xNew[i] = lower[i] + 1.0
		} else if upperFinite && xNew[i] >= upper[i] {
			// Only upper bound finite
			xNew[i] = upper[i] - 1.0
		}
	}
	return xNew
}

// clampToInterior ensures x stays strictly interior with safety margin
func clampToInterior(x, lower, upper []float64) []float64 {
	xNew := Clone(x)
	for i := range xNew {
		if !math.IsInf(lower[i], 0) {
			xNew[i] = math.Max(lower[i]+1e-15, xNew[i])
		}
		if !math.IsInf(upper[i], 0) {
			xNew[i] = math.Min(upper[i]-1e-15, xNew[i])
		}
	}
	return xNew
}

// Fminbox performs box-constrained optimization using log-barrier method
func Fminbox(
	f func([]float64) float64,
	x0 []float64,
	grad func([]float64) []float64,
	opts *FminboxOptions,
) OptimizeResult {
	n := len(x0)
	options := DefaultFminboxOptions(n, opts)

	// Validate bounds
	for i := range options.Lower {
		if options.Lower[i] >= options.Upper[i] {
			return OptimizeResult{
				X:             x0,
				Fun:           math.Inf(1),
				Gradient:      nil,
				Iterations:    0,
				FunctionCalls: 0,
				GradientCalls: 0,
				Converged:     false,
				Message:       "Invalid bounds: lower >= upper",
			}
		}
	}

	// Nudge x0 to strict interior
	x := nudgeToInterior(x0, options.Lower, options.Upper)

	// Compute initial mu if not provided
	mu := 0.0
	if options.Mu0 != nil {
		mu = *options.Mu0
	} else {
		// Auto-compute from gradient ratio
		gf := grad(x)
		gb := BarrierGradient(x, options.Lower, options.Upper)

		normGf := 0.0
		normGb := 0.0
		for i := range gf {
			normGf += math.Abs(gf[i])
			normGb += math.Abs(gb[i])
		}
		if normGb > 1e-30 {
			mu = options.MuFactor * normGf / normGb
		} else {
			mu = options.MuFactor
		}
	}

	totalFunctionCalls := 0
	totalGradientCalls := 0

	for outerIter := 0; outerIter < options.OuterIterations; outerIter++ {
		// Create barrier-augmented objective
		fAug := func(xVal []float64) float64 {
			fVal := f(xVal)
			bVal := BarrierValue(xVal, options.Lower, options.Upper)
			return fVal + mu*bVal
		}

		gradAug := func(xVal []float64) []float64 {
			gf := grad(xVal)
			gb := BarrierGradient(xVal, options.Lower, options.Upper)
			gAug := make([]float64, len(gf))
			for i := range gAug {
				gAug[i] = gf[i] + mu*gb[i]
			}
			return gAug
		}

		// Run inner optimizer
		var result OptimizeResult
		switch options.Method {
		case "bfgs":
			result = BFGS(fAug, x, gradAug, &options.OptimizeOptions)
		case "l-bfgs":
			lbfgsOpts := &LBFGSOptions{
				OptimizeOptions: options.OptimizeOptions,
				Memory:          10,
			}
			result = LBFGS(fAug, x, gradAug, lbfgsOpts)
		case "conjugate-gradient":
			cgOpts := &ConjugateGradientOptions{
				OptimizeOptions: options.OptimizeOptions,
				Eta:             0.4,
				RestartInterval: n,
			}
			result = ConjugateGradient(fAug, x, gradAug, cgOpts)
		default:
			return OptimizeResult{
				X:             x0,
				Fun:           math.Inf(1),
				Gradient:      nil,
				Iterations:    0,
				FunctionCalls: 0,
				GradientCalls: 0,
				Converged:     false,
				Message:       "Unknown method: " + options.Method,
			}
		}

		totalFunctionCalls += result.FunctionCalls
		totalGradientCalls += result.GradientCalls

		// Clamp result to interior
		x = clampToInterior(result.X, options.Lower, options.Upper)

		// Check projected gradient norm of original objective
		gf := grad(x)
		pgNorm := ProjectedGradientNorm(x, gf, options.Lower, options.Upper)

		if pgNorm < options.OuterGradTol {
			return OptimizeResult{
				X:             x,
				Fun:           f(x),
				Gradient:      gf,
				Iterations:    outerIter + 1,
				FunctionCalls: totalFunctionCalls + 1,
				GradientCalls: totalGradientCalls + 1,
				Converged:     true,
				Message:       "Converged: projected gradient norm below tolerance",
			}
		}

		// Reduce mu
		mu *= options.MuFactor
	}

	// Max outer iterations reached
	gf := grad(x)
	return OptimizeResult{
		X:             x,
		Fun:           f(x),
		Gradient:      gf,
		Iterations:    options.OuterIterations,
		FunctionCalls: totalFunctionCalls + 1,
		GradientCalls: totalGradientCalls + 1,
		Converged:     false,
		Message:       "Maximum outer iterations reached",
	}
}
