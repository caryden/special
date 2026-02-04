package optimization

// OptimizeOptions contains convergence tolerances and iteration limits
type OptimizeOptions struct {
	GradTol        float64
	StepTol        float64
	FuncTol        float64
	MaxIterations  int
}

// OptimizeResult contains the solution and optimization metadata
type OptimizeResult struct {
	X             []float64
	Fun           float64
	Gradient      []float64 // nil for derivative-free methods
	Iterations    int
	FunctionCalls int
	GradientCalls int
	Converged     bool
	Message       string
}

// ConvergenceReason describes why optimization terminated
type ConvergenceReason struct {
	Kind string // "gradient", "step", "function", "maxIterations", "lineSearchFailed"
}

// DefaultOptions creates default optimization options with optional overrides
func DefaultOptions(overrides *OptimizeOptions) OptimizeOptions {
	opts := OptimizeOptions{
		GradTol:       1e-8,
		StepTol:       1e-8,
		FuncTol:       1e-12,
		MaxIterations: 1000,
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
	}

	return opts
}

// CheckConvergence checks convergence criteria in priority order
// Returns nil if no criterion is met
func CheckConvergence(gradNorm, stepNorm, funcChange float64, iteration int, opts OptimizeOptions) *ConvergenceReason {
	// Priority order: gradient → step → function → maxIterations
	if gradNorm < opts.GradTol {
		return &ConvergenceReason{Kind: "gradient"}
	}
	if stepNorm < opts.StepTol {
		return &ConvergenceReason{Kind: "step"}
	}
	if funcChange < opts.FuncTol {
		return &ConvergenceReason{Kind: "function"}
	}
	if iteration >= opts.MaxIterations {
		return &ConvergenceReason{Kind: "maxIterations"}
	}
	return nil
}

// IsConverged returns true if the reason indicates successful convergence
func IsConverged(reason *ConvergenceReason) bool {
	if reason == nil {
		return false
	}
	switch reason.Kind {
	case "gradient", "step", "function":
		return true
	case "maxIterations", "lineSearchFailed":
		return false
	default:
		return false
	}
}

// ConvergenceMessage returns a human-readable message for the convergence reason
func ConvergenceMessage(reason *ConvergenceReason) string {
	if reason == nil {
		return "no convergence"
	}
	switch reason.Kind {
	case "gradient":
		return "gradient norm below tolerance"
	case "step":
		return "step size below tolerance"
	case "function":
		return "function change below tolerance"
	case "maxIterations":
		return "maximum iterations reached"
	case "lineSearchFailed":
		return "line search failed"
	default:
		return "unknown reason"
	}
}
