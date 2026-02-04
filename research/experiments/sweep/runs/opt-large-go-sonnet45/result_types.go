package optimization

// OptimizeOptions contains convergence tolerances and iteration limits
type OptimizeOptions struct {
	GradTol        float64
	StepTol        float64
	FuncTol        float64
	MaxIterations  int
}

// DefaultOptions returns default optimization options with optional overrides
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

// OptimizeResult contains the solution and metadata from an optimization run
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

// ConvergenceReason represents why the optimization terminated
type ConvergenceReason struct {
	Kind string // "gradient", "step", "function", "maxIterations", "lineSearchFailed"
}

// CheckConvergence checks convergence criteria in order: gradient → step → function → maxIterations
// Returns nil if no criterion is met
// Pass stepNorm < 0 or funcChange < 0 to skip those checks (e.g., before first iteration)
func CheckConvergence(gradNorm, stepNorm, funcChange float64, iteration int, opts OptimizeOptions) *ConvergenceReason {
	if gradNorm < opts.GradTol {
		return &ConvergenceReason{Kind: "gradient"}
	}
	if stepNorm >= 0 && stepNorm < opts.StepTol {
		return &ConvergenceReason{Kind: "step"}
	}
	if funcChange >= 0 && funcChange < opts.FuncTol {
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
	return reason.Kind == "gradient" || reason.Kind == "step" || reason.Kind == "function"
}

// ConvergenceMessage returns a human-readable message for the convergence reason
func ConvergenceMessage(reason *ConvergenceReason) string {
	if reason == nil {
		return "No convergence"
	}
	switch reason.Kind {
	case "gradient":
		return "Converged: gradient norm below tolerance"
	case "step":
		return "Converged: step size below tolerance"
	case "function":
		return "Converged: function change below tolerance"
	case "maxIterations":
		return "Failed to converge: maximum iterations reached"
	case "lineSearchFailed":
		return "Failed to converge: line search could not find acceptable step"
	default:
		return "Unknown convergence reason"
	}
}
