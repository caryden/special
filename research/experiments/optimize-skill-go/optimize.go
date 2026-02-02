// Package neldermead provides derivative-free optimization using the Nelder-Mead
// simplex method. Translated from the Type-O optimization reference library.
//
// Nodes implemented: vec-ops, result-types, nelder-mead.
package neldermead

import (
	"fmt"
	"math"
	"sort"
)

// ---------------------------------------------------------------------------
// vec-ops: Pure vector arithmetic for n-dimensional optimization.
// All operations return new slices and never mutate inputs.
// ---------------------------------------------------------------------------

// Dot returns the dot product of two vectors.
func Dot(a, b []float64) float64 {
	sum := 0.0
	for i := range a {
		sum += a[i] * b[i]
	}
	return sum
}

// Norm returns the Euclidean (L2) norm of a vector.
func Norm(v []float64) float64 {
	return math.Sqrt(Dot(v, v))
}

// NormInf returns the infinity norm (max absolute value) of a vector.
func NormInf(v []float64) float64 {
	m := 0.0
	for _, x := range v {
		a := math.Abs(x)
		if a > m {
			m = a
		}
	}
	return m
}

// Scale returns v * s (scalar multiplication).
func Scale(v []float64, s float64) []float64 {
	result := make([]float64, len(v))
	for i, x := range v {
		result[i] = x * s
	}
	return result
}

// Add returns element-wise a + b.
func Add(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + b[i]
	}
	return result
}

// Sub returns element-wise a - b.
func Sub(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] - b[i]
	}
	return result
}

// Negate returns -v (element-wise negation).
func Negate(v []float64) []float64 {
	return Scale(v, -1)
}

// Clone returns a deep copy of a vector.
func Clone(v []float64) []float64 {
	return append([]float64(nil), v...)
}

// Zeros returns a vector of n zeros.
func Zeros(n int) []float64 {
	return make([]float64, n)
}

// AddScaled returns a + s*b (fused scale-and-add, avoids intermediate allocation).
func AddScaled(a, b []float64, s float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + s*b[i]
	}
	return result
}

// ---------------------------------------------------------------------------
// result-types: Shared types and convergence logic.
// ---------------------------------------------------------------------------

// OptimizeOptions configures convergence criteria for optimization.
type OptimizeOptions struct {
	GradTol       float64 // Gradient infinity-norm tolerance (default 1e-8)
	StepTol       float64 // Step size tolerance (default 1e-8)
	FuncTol       float64 // Function value change tolerance (default 1e-12)
	MaxIterations int     // Maximum number of iterations (default 1000)
}

// DefaultOptions returns OptimizeOptions with standard defaults.
func DefaultOptions() OptimizeOptions {
	return OptimizeOptions{
		GradTol:       1e-8,
		StepTol:       1e-8,
		FuncTol:       1e-12,
		MaxIterations: 1000,
	}
}

// OptimizeResult holds the result of an optimization run.
type OptimizeResult struct {
	X             []float64 // Solution vector (minimizer)
	Fun           float64   // Objective function value at solution
	Gradient      []float64 // Gradient at solution (nil for derivative-free)
	Iterations    int       // Number of iterations performed
	FunctionCalls int       // Number of objective function evaluations
	GradientCalls int       // Number of gradient evaluations
	Converged     bool      // Whether a convergence criterion was met
	Message       string    // Human-readable termination reason
}

// ConvergenceReason describes why the optimizer stopped.
type ConvergenceReason struct {
	Kind       string  // "gradient", "step", "function", "maxIterations", "lineSearchFailed"
	GradNorm   float64 // populated for Kind=="gradient"
	StepNorm   float64 // populated for Kind=="step"
	FuncChange float64 // populated for Kind=="function"
	Iterations int     // populated for Kind=="maxIterations"
	Message    string  // populated for Kind=="lineSearchFailed"
}

// CheckConvergence checks criteria in order: gradient -> step -> function -> maxIterations.
// Returns nil if no criterion is met.
func CheckConvergence(gradNorm, stepNorm, funcChange float64, iteration int, opts OptimizeOptions) *ConvergenceReason {
	if gradNorm < opts.GradTol {
		return &ConvergenceReason{Kind: "gradient", GradNorm: gradNorm}
	}
	if stepNorm < opts.StepTol {
		return &ConvergenceReason{Kind: "step", StepNorm: stepNorm}
	}
	if funcChange < opts.FuncTol {
		return &ConvergenceReason{Kind: "function", FuncChange: funcChange}
	}
	if iteration >= opts.MaxIterations {
		return &ConvergenceReason{Kind: "maxIterations", Iterations: iteration}
	}
	return nil
}

// IsConverged returns true for gradient/step/function; false for maxIterations/lineSearchFailed.
func IsConverged(reason *ConvergenceReason) bool {
	return reason.Kind == "gradient" || reason.Kind == "step" || reason.Kind == "function"
}

// ConvergenceMessage returns a human-readable message for a convergence reason.
func ConvergenceMessage(reason *ConvergenceReason) string {
	switch reason.Kind {
	case "gradient":
		return fmt.Sprintf("Converged: gradient norm %.2e below tolerance", reason.GradNorm)
	case "step":
		return fmt.Sprintf("Converged: step size %.2e below tolerance", reason.StepNorm)
	case "function":
		return fmt.Sprintf("Converged: function change %.2e below tolerance", reason.FuncChange)
	case "maxIterations":
		return fmt.Sprintf("Stopped: reached maximum iterations (%d)", reason.Iterations)
	case "lineSearchFailed":
		return fmt.Sprintf("Stopped: line search failed (%s)", reason.Message)
	default:
		return "Unknown convergence reason"
	}
}

// ---------------------------------------------------------------------------
// nelder-mead: Derivative-free simplex optimizer.
// ---------------------------------------------------------------------------

// NelderMeadOptions extends OptimizeOptions with Nelder-Mead-specific parameters.
type NelderMeadOptions struct {
	OptimizeOptions
	Alpha              float64 // Reflection coefficient (default 1.0)
	Gamma              float64 // Expansion coefficient (default 2.0)
	Rho                float64 // Contraction coefficient (default 0.5)
	Sigma              float64 // Shrink coefficient (default 0.5)
	InitialSimplexScale float64 // Edge length scale (default 0.05)
}

// DefaultNelderMeadOptions returns NelderMeadOptions with standard defaults.
func DefaultNelderMeadOptions() NelderMeadOptions {
	return NelderMeadOptions{
		OptimizeOptions:    DefaultOptions(),
		Alpha:              1.0,
		Gamma:              2.0,
		Rho:                0.5,
		Sigma:              0.5,
		InitialSimplexScale: 0.05,
	}
}

// createInitialSimplex builds the n+1 vertex simplex.
// Vertex 0 = x0, vertex i = x0 + h*e_i where h = scale * max(|x0[i]|, 1).
func createInitialSimplex(x0 []float64, scale float64) [][]float64 {
	n := len(x0)
	simplex := make([][]float64, n+1)
	simplex[0] = Clone(x0)

	for i := 0; i < n; i++ {
		vertex := Clone(x0)
		h := scale * math.Max(math.Abs(x0[i]), 1.0)
		vertex[i] += h
		simplex[i+1] = vertex
	}

	return simplex
}

// NelderMead minimizes f starting from x0 using the Nelder-Mead simplex method.
// Pass nil for opts to use defaults.
func NelderMead(f func([]float64) float64, x0 []float64, opts *NelderMeadOptions) OptimizeResult {
	var o NelderMeadOptions
	if opts != nil {
		o = *opts
	} else {
		o = DefaultNelderMeadOptions()
	}

	n := len(x0)

	// Initialize simplex
	simplex := createInitialSimplex(x0, o.InitialSimplexScale)
	fValues := make([]float64, n+1)
	for i, v := range simplex {
		fValues[i] = f(v)
	}
	functionCalls := n + 1

	iteration := 0

	for iteration < o.MaxIterations {
		// Sort vertices by function value (ascending)
		indices := make([]int, n+1)
		for i := range indices {
			indices[i] = i
		}
		sort.Slice(indices, func(a, b int) bool {
			return fValues[indices[a]] < fValues[indices[b]]
		})
		newSimplex := make([][]float64, n+1)
		newFValues := make([]float64, n+1)
		for i, idx := range indices {
			newSimplex[i] = simplex[idx]
			newFValues[i] = fValues[idx]
		}
		simplex = newSimplex
		fValues = newFValues

		fBest := fValues[0]
		fWorst := fValues[n]
		fSecondWorst := fValues[n-1]

		// Check convergence: function value spread (std dev)
		fMean := 0.0
		for _, fv := range fValues {
			fMean += fv
		}
		fMean /= float64(n + 1)

		fStd := 0.0
		for _, fv := range fValues {
			fStd += (fv - fMean) * (fv - fMean)
		}
		fStd = math.Sqrt(fStd / float64(n+1))

		if fStd < o.FuncTol {
			return OptimizeResult{
				X:             Clone(simplex[0]),
				Fun:           fBest,
				Gradient:      nil,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Converged:     true,
				Message:       fmt.Sprintf("Converged: simplex function spread %.2e below tolerance", fStd),
			}
		}

		// Check convergence: simplex diameter
		diameter := 0.0
		for i := 1; i <= n; i++ {
			d := NormInf(Sub(simplex[i], simplex[0]))
			if d > diameter {
				diameter = d
			}
		}

		if diameter < o.StepTol {
			return OptimizeResult{
				X:             Clone(simplex[0]),
				Fun:           fBest,
				Gradient:      nil,
				Iterations:    iteration,
				FunctionCalls: functionCalls,
				GradientCalls: 0,
				Converged:     true,
				Message:       fmt.Sprintf("Converged: simplex diameter %.2e below tolerance", diameter),
			}
		}

		iteration++

		// Compute centroid of all vertices except the worst
		centroid := Clone(simplex[0])
		for i := 1; i < n; i++ {
			for j := 0; j < n; j++ {
				centroid[j] += simplex[i][j]
			}
		}
		for j := 0; j < n; j++ {
			centroid[j] /= float64(n)
		}

		// Reflection: x_r = centroid + alpha * (centroid - worst)
		reflected := AddScaled(centroid, Sub(centroid, simplex[n]), o.Alpha)
		fReflected := f(reflected)
		functionCalls++

		if fReflected < fSecondWorst && fReflected >= fBest {
			// Accept reflection
			simplex[n] = reflected
			fValues[n] = fReflected
			continue
		}

		if fReflected < fBest {
			// Try expansion: x_e = centroid + gamma * (reflected - centroid)
			expanded := AddScaled(centroid, Sub(reflected, centroid), o.Gamma)
			fExpanded := f(expanded)
			functionCalls++

			if fExpanded < fReflected {
				simplex[n] = expanded
				fValues[n] = fExpanded
			} else {
				simplex[n] = reflected
				fValues[n] = fReflected
			}
			continue
		}

		// Contraction
		if fReflected < fWorst {
			// Outside contraction
			contracted := AddScaled(centroid, Sub(reflected, centroid), o.Rho)
			fContracted := f(contracted)
			functionCalls++

			if fContracted <= fReflected {
				simplex[n] = contracted
				fValues[n] = fContracted
				continue
			}
		} else {
			// Inside contraction
			contracted := AddScaled(centroid, Sub(simplex[n], centroid), o.Rho)
			fContracted := f(contracted)
			functionCalls++

			if fContracted < fWorst {
				simplex[n] = contracted
				fValues[n] = fContracted
				continue
			}
		}

		// Shrink: move all vertices towards the best
		for i := 1; i <= n; i++ {
			simplex[i] = Add(simplex[0], Scale(Sub(simplex[i], simplex[0]), o.Sigma))
			fValues[i] = f(simplex[i])
			functionCalls++
		}
	}

	// Max iterations reached
	return OptimizeResult{
		X:             Clone(simplex[0]),
		Fun:           fValues[0],
		Gradient:      nil,
		Iterations:    iteration,
		FunctionCalls: functionCalls,
		GradientCalls: 0,
		Converged:     false,
		Message:       fmt.Sprintf("Stopped: reached maximum iterations (%d)", o.MaxIterations),
	}
}
