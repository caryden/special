package optimization

import "testing"

func TestDefaultOptions(t *testing.T) {
	t.Run("no overrides", func(t *testing.T) {
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
	})

	t.Run("with overrides", func(t *testing.T) {
		opts := DefaultOptions(&OptimizeOptions{GradTol: 1e-4})
		if opts.GradTol != 1e-4 {
			t.Errorf("GradTol = %v, want 1e-4", opts.GradTol)
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
	})
}

func TestCheckConvergence(t *testing.T) {
	defaults := DefaultOptions(nil)

	tests := []struct {
		name       string
		gradNorm   float64
		stepNorm   float64
		funcChange float64
		iteration  int
		wantKind   string
		wantNil    bool
	}{
		{
			name:       "gradient converged",
			gradNorm:   1e-9,
			stepNorm:   0.1,
			funcChange: 0.1,
			iteration:  5,
			wantKind:   "gradient",
		},
		{
			name:       "step converged",
			gradNorm:   0.1,
			stepNorm:   1e-9,
			funcChange: 0.1,
			iteration:  5,
			wantKind:   "step",
		},
		{
			name:       "function converged",
			gradNorm:   0.1,
			stepNorm:   0.1,
			funcChange: 1e-13,
			iteration:  5,
			wantKind:   "function",
		},
		{
			name:       "max iterations",
			gradNorm:   0.1,
			stepNorm:   0.1,
			funcChange: 0.1,
			iteration:  1000,
			wantKind:   "maxIterations",
		},
		{
			name:       "no convergence",
			gradNorm:   0.1,
			stepNorm:   0.1,
			funcChange: 0.1,
			iteration:  5,
			wantNil:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CheckConvergence(tt.gradNorm, tt.stepNorm, tt.funcChange, tt.iteration, defaults)
			if tt.wantNil {
				if got != nil {
					t.Errorf("CheckConvergence() = %v, want nil", got)
				}
			} else {
				if got == nil {
					t.Errorf("CheckConvergence() = nil, want %v", tt.wantKind)
				} else if got.Kind != tt.wantKind {
					t.Errorf("CheckConvergence().Kind = %v, want %v", got.Kind, tt.wantKind)
				}
			}
		})
	}
}

func TestCheckConvergencePriority(t *testing.T) {
	defaults := DefaultOptions(nil)

	// When multiple criteria are met, gradient should win
	reason := CheckConvergence(1e-9, 1e-9, 1e-13, 1000, defaults)
	if reason == nil || reason.Kind != "gradient" {
		t.Errorf("Expected gradient convergence to have priority, got %v", reason)
	}
}

func TestIsConverged(t *testing.T) {
	tests := []struct {
		name   string
		reason *ConvergenceReason
		want   bool
	}{
		{"gradient", &ConvergenceReason{Kind: "gradient"}, true},
		{"step", &ConvergenceReason{Kind: "step"}, true},
		{"function", &ConvergenceReason{Kind: "function"}, true},
		{"maxIterations", &ConvergenceReason{Kind: "maxIterations"}, false},
		{"lineSearchFailed", &ConvergenceReason{Kind: "lineSearchFailed"}, false},
		{"nil", nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsConverged(tt.reason)
			if got != tt.want {
				t.Errorf("IsConverged(%v) = %v, want %v", tt.reason, got, tt.want)
			}
		})
	}
}

func TestConvergenceMessage(t *testing.T) {
	tests := []struct {
		name   string
		reason *ConvergenceReason
		want   string
	}{
		{"gradient", &ConvergenceReason{Kind: "gradient"}, "gradient norm below tolerance"},
		{"step", &ConvergenceReason{Kind: "step"}, "step size below tolerance"},
		{"function", &ConvergenceReason{Kind: "function"}, "function change below tolerance"},
		{"maxIterations", &ConvergenceReason{Kind: "maxIterations"}, "maximum iterations reached"},
		{"lineSearchFailed", &ConvergenceReason{Kind: "lineSearchFailed"}, "line search failed"},
		{"nil", nil, "no convergence"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ConvergenceMessage(tt.reason)
			if got != tt.want {
				t.Errorf("ConvergenceMessage(%v) = %v, want %v", tt.reason, got, tt.want)
			}
		})
	}
}
