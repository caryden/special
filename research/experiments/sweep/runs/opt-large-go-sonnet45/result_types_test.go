package optimization

import "testing"

func TestDefaultOptions(t *testing.T) {
	opts := DefaultOptions(nil)
	if opts.GradTol != 1e-8 {
		t.Errorf("GradTol = %v, want 1e-8", opts.GradTol)
	}
	if opts.StepTol != 1e-8 {
		t.Errorf("StepTol = %v, want 1e-8", opts.StepTol)
	}
	if opts.FuncTol != 1e-12 {
		t.Errorf("FuncTol = %v, want 1e-12", opts.FuncTol)
	}
	if opts.MaxIterations != 1000 {
		t.Errorf("MaxIterations = %v, want 1000", opts.MaxIterations)
	}
}

func TestDefaultOptionsWithOverrides(t *testing.T) {
	opts := DefaultOptions(&OptimizeOptions{GradTol: 1e-4})
	if opts.GradTol != 1e-4 {
		t.Errorf("GradTol = %v, want 1e-4", opts.GradTol)
	}
	if opts.StepTol != 1e-8 {
		t.Errorf("StepTol = %v, want 1e-8", opts.StepTol)
	}
}

func TestCheckConvergence(t *testing.T) {
	opts := DefaultOptions(nil)

	// Test gradient convergence
	reason := CheckConvergence(1e-9, 0.1, 0.1, 5, opts)
	if reason == nil || reason.Kind != "gradient" {
		t.Errorf("Expected gradient convergence, got %v", reason)
	}

	// Test step convergence
	reason = CheckConvergence(0.1, 1e-9, 0.1, 5, opts)
	if reason == nil || reason.Kind != "step" {
		t.Errorf("Expected step convergence, got %v", reason)
	}

	// Test function convergence
	reason = CheckConvergence(0.1, 0.1, 1e-13, 5, opts)
	if reason == nil || reason.Kind != "function" {
		t.Errorf("Expected function convergence, got %v", reason)
	}

	// Test max iterations
	reason = CheckConvergence(0.1, 0.1, 0.1, 1000, opts)
	if reason == nil || reason.Kind != "maxIterations" {
		t.Errorf("Expected maxIterations, got %v", reason)
	}

	// Test no convergence
	reason = CheckConvergence(0.1, 0.1, 0.1, 5, opts)
	if reason != nil {
		t.Errorf("Expected nil (no convergence), got %v", reason)
	}

	// Test skipping step and function checks with negative values
	reason = CheckConvergence(0.1, -1, -1, 0, opts)
	if reason != nil {
		t.Errorf("Expected nil with negative step/func, got %v", reason)
	}
}

func TestPriority(t *testing.T) {
	opts := DefaultOptions(nil)
	// When multiple criteria are met, gradient should win
	reason := CheckConvergence(1e-9, 1e-9, 1e-13, 1000, opts)
	if reason == nil || reason.Kind != "gradient" {
		t.Errorf("Expected gradient (first priority), got %v", reason)
	}
}

func TestIsConverged(t *testing.T) {
	if !IsConverged(&ConvergenceReason{Kind: "gradient"}) {
		t.Error("gradient should be converged")
	}
	if !IsConverged(&ConvergenceReason{Kind: "step"}) {
		t.Error("step should be converged")
	}
	if !IsConverged(&ConvergenceReason{Kind: "function"}) {
		t.Error("function should be converged")
	}
	if IsConverged(&ConvergenceReason{Kind: "maxIterations"}) {
		t.Error("maxIterations should not be converged")
	}
	if IsConverged(&ConvergenceReason{Kind: "lineSearchFailed"}) {
		t.Error("lineSearchFailed should not be converged")
	}
	if IsConverged(nil) {
		t.Error("nil should not be converged")
	}
}

func TestConvergenceMessage(t *testing.T) {
	tests := []struct {
		kind string
		want string
	}{
		{"gradient", "Converged: gradient norm below tolerance"},
		{"step", "Converged: step size below tolerance"},
		{"function", "Converged: function change below tolerance"},
		{"maxIterations", "Failed to converge: maximum iterations reached"},
		{"lineSearchFailed", "Failed to converge: line search could not find acceptable step"},
	}

	for _, test := range tests {
		msg := ConvergenceMessage(&ConvergenceReason{Kind: test.kind})
		if msg != test.want {
			t.Errorf("ConvergenceMessage(%v) = %v, want %v", test.kind, msg, test.want)
		}
	}
}
