package optimization

import (
	"math"
	"sort"
)

// NelderMeadOptions contains Nelder-Mead specific parameters
type NelderMeadOptions struct {
	OptimizeOptions
	Alpha              float64 // Reflection coefficient
	Gamma              float64 // Expansion coefficient
	Rho                float64 // Contraction coefficient
	Sigma              float64 // Shrink coefficient
	InitialSimplexScale float64 // Edge length scale
}

// DefaultNelderMeadOptions returns default Nelder-Mead options
func DefaultNelderMeadOptions(overrides *NelderMeadOptions) NelderMeadOptions {
	opts := NelderMeadOptions{
		OptimizeOptions:     DefaultOptions(nil),
		Alpha:               1.0,
		Gamma:               2.0,
		Rho:                 0.5,
		Sigma:               0.5,
		InitialSimplexScale: 0.05,
	}

	if overrides != nil {
		if overrides.GradTol != 0 {
			opts.GradTol = overrides.GradTol
		}
		if overrides.StepTol != 0 {
			opts.StepTol = overrides.StepTol
		}
		if overrides.FuncTol != 0 {
			opts.FuncTol = overrides.FuncTol
		}
		if overrides.MaxIterations != 0 {
			opts.MaxIterations = overrides.MaxIterations
		}
		if overrides.Alpha != 0 {
			opts.Alpha = overrides.Alpha
		}
		if overrides.Gamma != 0 {
			opts.Gamma = overrides.Gamma
		}
		if overrides.Rho != 0 {
			opts.Rho = overrides.Rho
		}
		if overrides.Sigma != 0 {
			opts.Sigma = overrides.Sigma
		}
		if overrides.InitialSimplexScale != 0 {
			opts.InitialSimplexScale = overrides.InitialSimplexScale
		}
	}

	return opts
}

// NelderMead minimizes a function using the Nelder-Mead simplex method
func NelderMead(f func([]float64) float64, x0 []float64, options *NelderMeadOptions) OptimizeResult {
	opts := DefaultNelderMeadOptions(options)
	n := len(x0)

	// Create initial simplex
	simplex, fValues := createInitialSimplex(f, x0, opts.InitialSimplexScale)
	functionCalls := n + 1

	iteration := 0
	for {
		// Sort simplex by function values
		indices := make([]int, len(fValues))
		for i := range indices {
			indices[i] = i
		}
		sort.Slice(indices, func(i, j int) bool {
			return fValues[indices[i]] < fValues[indices[j]]
		})

		// Reorder simplex and fValues
		sortedSimplex := make([][]float64, len(simplex))
		sortedFValues := make([]float64, len(fValues))
		for i, idx := range indices {
			sortedSimplex[i] = simplex[idx]
			sortedFValues[i] = fValues[idx]
		}
		simplex = sortedSimplex
		fValues = sortedFValues

		// Check convergence
		reason := checkNelderMeadConvergence(simplex, fValues, iteration, opts)
		if reason != nil {
			return OptimizeResult{
				X:             Clone(simplex[0]),
				Fun:           fValues[0],
				Gradient:      nil,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Converged:     IsConverged(reason),
				Message:       ConvergenceMessage(reason),
			}
		}

		// Check max iterations
		if iteration >= opts.MaxIterations {
			return OptimizeResult{
				X:             Clone(simplex[0]),
				Fun:           fValues[0],
				Gradient:      nil,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Converged:     false,
				Message:       "maximum iterations reached",
			}
		}

		// Compute centroid of all vertices except worst
		centroid := Zeros(n)
		for i := 0; i < n; i++ {
			centroid = Add(centroid, simplex[i])
		}
		centroid = Scale(centroid, 1.0/float64(n))

		// Reflection
		reflected := AddScaled(centroid, Sub(centroid, simplex[n]), opts.Alpha)
		fReflected := f(reflected)
		functionCalls++

		// Accept reflection if between best and second-worst
		if fReflected >= fValues[0] && fReflected < fValues[n-1] {
			simplex[n] = reflected
			fValues[n] = fReflected
			iteration++
			continue
		}

		// Expansion (if reflection is best)
		if fReflected < fValues[0] {
			expanded := AddScaled(centroid, Sub(reflected, centroid), opts.Gamma)
			fExpanded := f(expanded)
			functionCalls++

			if fExpanded < fReflected {
				simplex[n] = expanded
				fValues[n] = fExpanded
			} else {
				simplex[n] = reflected
				fValues[n] = fReflected
			}
			iteration++
			continue
		}

		// Contraction
		var contracted []float64
		var fContracted float64

		if fReflected < fValues[n] {
			// Outside contraction
			contracted = AddScaled(centroid, Sub(reflected, centroid), opts.Rho)
			fContracted = f(contracted)
			functionCalls++

			if fContracted <= fReflected {
				simplex[n] = contracted
				fValues[n] = fContracted
				iteration++
				continue
			}
		} else {
			// Inside contraction
			contracted = AddScaled(centroid, Sub(simplex[n], centroid), opts.Rho)
			fContracted = f(contracted)
			functionCalls++

			if fContracted < fValues[n] {
				simplex[n] = contracted
				fValues[n] = fContracted
				iteration++
				continue
			}
		}

		// Shrink
		for i := 1; i <= n; i++ {
			simplex[i] = AddScaled(simplex[0], Sub(simplex[i], simplex[0]), opts.Sigma)
			fValues[i] = f(simplex[i])
		}
		functionCalls += n
		iteration++
	}
}

// createInitialSimplex creates the initial simplex for Nelder-Mead
func createInitialSimplex(f func([]float64) float64, x0 []float64, scale float64) ([][]float64, []float64) {
	n := len(x0)
	simplex := make([][]float64, n+1)
	fValues := make([]float64, n+1)

	// First vertex is x0
	simplex[0] = Clone(x0)
	fValues[0] = f(x0)

	// Remaining vertices: x0 + h*ei
	for i := 0; i < n; i++ {
		h := scale * math.Max(math.Abs(x0[i]), 1.0)
		vertex := Clone(x0)
		vertex[i] += h
		simplex[i+1] = vertex
		fValues[i+1] = f(vertex)
	}

	return simplex, fValues
}

// checkNelderMeadConvergence checks convergence based on simplex spread and diameter
func checkNelderMeadConvergence(simplex [][]float64, fValues []float64, iteration int, opts NelderMeadOptions) *ConvergenceReason {
	n := len(simplex[0])

	// Function value spread (standard deviation)
	mean := 0.0
	for _, fv := range fValues {
		mean += fv
	}
	mean /= float64(len(fValues))

	variance := 0.0
	for _, fv := range fValues {
		diff := fv - mean
		variance += diff * diff
	}
	variance /= float64(len(fValues))
	stdDev := math.Sqrt(variance)

	if stdDev < opts.FuncTol {
		return &ConvergenceReason{Kind: "function"}
	}

	// Simplex diameter (max distance from best vertex)
	maxDist := 0.0
	for i := 1; i <= n; i++ {
		dist := NormInf(Sub(simplex[i], simplex[0]))
		if dist > maxDist {
			maxDist = dist
		}
	}

	if maxDist < opts.StepTol {
		return &ConvergenceReason{Kind: "step"}
	}

	// No convergence
	return nil
}
