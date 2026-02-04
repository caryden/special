package optimization

// OptimizeOptions contains convergence tolerances and iteration limits.
type OptimizeOptions struct {
	GradTol        float64
	StepTol        float64
	FuncTol        float64
	MaxIterations  int
}

// OptimizeResult contains the result of an optimization run.
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

// ConvergenceReason describes why an optimization terminated.
type ConvergenceReason struct {
	Kind string
}

// DefaultOptions returns default optimization options with optional overrides.
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

// CheckConvergence checks convergence criteria in order: gradient → step → function → maxIterations.
// Returns nil if no criterion is met.
func CheckConvergence(gradNorm, stepNorm, funcChange float64, iteration int, opts OptimizeOptions) *ConvergenceReason {
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

// IsConverged returns true if the convergence reason indicates successful convergence.
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

// ConvergenceMessage returns a human-readable message for the convergence reason.
func ConvergenceMessage(reason *ConvergenceReason) string {
	if reason == nil {
		return "Not converged"
	}
	switch reason.Kind {
	case "gradient":
		return "Converged: gradient norm below tolerance"
	case "step":
		return "Converged: step size below tolerance"
	case "function":
		return "Converged: function change below tolerance"
	case "maxIterations":
		return "Terminated: maximum iterations reached"
	case "lineSearchFailed":
		return "Terminated: line search failed"
	default:
		return "Unknown termination reason"
	}
}
