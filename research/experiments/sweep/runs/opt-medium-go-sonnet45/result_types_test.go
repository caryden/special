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
		name        string
		gradNorm    float64
		stepNorm    float64
		funcChange  float64
		iteration   int
		wantKind    string
		wantNil     bool
	}{
		{
			name:       "gradient below tolerance",
			gradNorm:   1e-9,
			stepNorm:   0.1,
			funcChange: 0.1,
			iteration:  5,
			wantKind:   "gradient",
		},
		{
			name:       "step below tolerance",
			gradNorm:   0.1,
			stepNorm:   1e-9,
			funcChange: 0.1,
			iteration:  5,
			wantKind:   "step",
		},
		{
			name:       "function change below tolerance",
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
			name:       "no criterion met",
			gradNorm:   0.1,
			stepNorm:   0.1,
			funcChange: 0.1,
			iteration:  5,
			wantNil:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reason := CheckConvergence(tt.gradNorm, tt.stepNorm, tt.funcChange, tt.iteration, defaults)
			if tt.wantNil {
				if reason != nil {
					t.Errorf("CheckConvergence() = %v, want nil", reason)
				}
			} else {
				if reason == nil {
					t.Errorf("CheckConvergence() = nil, want %v", tt.wantKind)
				} else if reason.Kind != tt.wantKind {
					t.Errorf("CheckConvergence() = %v, want %v", reason.Kind, tt.wantKind)
				}
			}
		})
	}
}

func TestConvergencePriority(t *testing.T) {
	// When multiple criteria are met, gradient should win
	defaults := DefaultOptions(nil)
	reason := CheckConvergence(1e-9, 1e-9, 1e-13, 1000, defaults)
	if reason == nil || reason.Kind != "gradient" {
		t.Errorf("CheckConvergence() = %v, want gradient (priority test)", reason)
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
		{"gradient", &ConvergenceReason{Kind: "gradient"}, "Converged: gradient norm below tolerance"},
		{"step", &ConvergenceReason{Kind: "step"}, "Converged: step size below tolerance"},
		{"function", &ConvergenceReason{Kind: "function"}, "Converged: function change below tolerance"},
		{"maxIterations", &ConvergenceReason{Kind: "maxIterations"}, "Terminated: maximum iterations reached"},
		{"lineSearchFailed", &ConvergenceReason{Kind: "lineSearchFailed"}, "Terminated: line search failed"},
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
