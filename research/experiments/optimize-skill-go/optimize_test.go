package neldermead

import (
	"math"
	"testing"
)

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

const tol = 1e-10

func approxEqual(a, b, eps float64) bool {
	return math.Abs(a-b) < eps
}

func sliceEqual(t *testing.T, got, want []float64, eps float64) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("length mismatch: got %d, want %d", len(got), len(want))
	}
	for i := range got {
		if !approxEqual(got[i], want[i], eps) {
			t.Errorf("index %d: got %v, want %v", i, got[i], want[i])
		}
	}
}

// ---------------------------------------------------------------------------
// Test functions for optimization
// ---------------------------------------------------------------------------

func sphere(x []float64) float64 {
	s := 0.0
	for _, v := range x {
		s += v * v
	}
	return s
}

func booth(x []float64) float64 {
	// f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
	a := x[0] + 2*x[1] - 7
	b := 2*x[0] + x[1] - 5
	return a*a + b*b
}

func beale(x []float64) float64 {
	// f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
	a := 1.5 - x[0] + x[0]*x[1]
	b := 2.25 - x[0] + x[0]*x[1]*x[1]
	c := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]
	return a*a + b*b + c*c
}

func rosenbrock(x []float64) float64 {
	// f(x,y) = (1-x)^2 + 100(y - x^2)^2
	a := 1 - x[0]
	b := x[1] - x[0]*x[0]
	return a*a + 100*b*b
}

func himmelblau(x []float64) float64 {
	// f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
	a := x[0]*x[0] + x[1] - 11
	b := x[0] + x[1]*x[1] - 7
	return a*a + b*b
}

// ---------------------------------------------------------------------------
// vec-ops tests
// ---------------------------------------------------------------------------

func TestDot(t *testing.T) {
	if got := Dot([]float64{1, 2, 3}, []float64{4, 5, 6}); got != 32 {
		t.Errorf("Dot([1,2,3],[4,5,6]) = %v, want 32", got)
	}
	if got := Dot([]float64{0, 0}, []float64{1, 1}); got != 0 {
		t.Errorf("Dot([0,0],[1,1]) = %v, want 0", got)
	}
}

func TestNorm(t *testing.T) {
	if got := Norm([]float64{3, 4}); got != 5 {
		t.Errorf("Norm([3,4]) = %v, want 5", got)
	}
	if got := Norm([]float64{0, 0, 0}); got != 0 {
		t.Errorf("Norm([0,0,0]) = %v, want 0", got)
	}
}

func TestNormInf(t *testing.T) {
	if got := NormInf([]float64{1, -3, 2}); got != 3 {
		t.Errorf("NormInf([1,-3,2]) = %v, want 3", got)
	}
	if got := NormInf([]float64{0, 0}); got != 0 {
		t.Errorf("NormInf([0,0]) = %v, want 0", got)
	}
}

func TestScale(t *testing.T) {
	sliceEqual(t, Scale([]float64{1, 2}, 3), []float64{3, 6}, tol)
	sliceEqual(t, Scale([]float64{1, 2}, 0), []float64{0, 0}, tol)
}

func TestAdd(t *testing.T) {
	sliceEqual(t, Add([]float64{1, 2}, []float64{3, 4}), []float64{4, 6}, tol)
}

func TestSub(t *testing.T) {
	sliceEqual(t, Sub([]float64{3, 4}, []float64{1, 2}), []float64{2, 2}, tol)
}

func TestNegate(t *testing.T) {
	sliceEqual(t, Negate([]float64{1, -2}), []float64{-1, 2}, tol)
}

func TestClone(t *testing.T) {
	orig := []float64{1, 2}
	c := Clone(orig)
	sliceEqual(t, c, []float64{1, 2}, tol)
	// Verify it's a distinct slice
	c[0] = 999
	if orig[0] != 1 {
		t.Error("Clone must return a distinct slice")
	}
}

func TestZeros(t *testing.T) {
	sliceEqual(t, Zeros(3), []float64{0, 0, 0}, tol)
}

func TestAddScaled(t *testing.T) {
	sliceEqual(t, AddScaled([]float64{1, 2}, []float64{3, 4}, 2), []float64{7, 10}, tol)
}

// Purity checks
func TestAddPurity(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}
	Add(a, b)
	if a[0] != 1 || a[1] != 2 {
		t.Error("Add must not modify a")
	}
	if b[0] != 3 || b[1] != 4 {
		t.Error("Add must not modify b")
	}
}

func TestScalePurity(t *testing.T) {
	v := []float64{1, 2}
	Scale(v, 3)
	if v[0] != 1 || v[1] != 2 {
		t.Error("Scale must not modify v")
	}
}

// ---------------------------------------------------------------------------
// result-types tests
// ---------------------------------------------------------------------------

func TestDefaultOptions(t *testing.T) {
	opts := DefaultOptions()
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

func TestDefaultOptionsOverride(t *testing.T) {
	opts := DefaultOptions()
	opts.GradTol = 1e-4
	if opts.GradTol != 1e-4 {
		t.Errorf("GradTol override failed: got %v", opts.GradTol)
	}
	if opts.StepTol != 1e-8 {
		t.Errorf("StepTol should remain default: got %v", opts.StepTol)
	}
}

func TestCheckConvergence_Gradient(t *testing.T) {
	opts := DefaultOptions()
	r := CheckConvergence(1e-9, 0.1, 0.1, 5, opts)
	if r == nil || r.Kind != "gradient" {
		t.Errorf("expected gradient, got %v", r)
	}
}

func TestCheckConvergence_Step(t *testing.T) {
	opts := DefaultOptions()
	r := CheckConvergence(0.1, 1e-9, 0.1, 5, opts)
	if r == nil || r.Kind != "step" {
		t.Errorf("expected step, got %v", r)
	}
}

func TestCheckConvergence_Function(t *testing.T) {
	opts := DefaultOptions()
	r := CheckConvergence(0.1, 0.1, 1e-13, 5, opts)
	if r == nil || r.Kind != "function" {
		t.Errorf("expected function, got %v", r)
	}
}

func TestCheckConvergence_MaxIterations(t *testing.T) {
	opts := DefaultOptions()
	r := CheckConvergence(0.1, 0.1, 0.1, 1000, opts)
	if r == nil || r.Kind != "maxIterations" {
		t.Errorf("expected maxIterations, got %v", r)
	}
}

func TestCheckConvergence_None(t *testing.T) {
	opts := DefaultOptions()
	r := CheckConvergence(0.1, 0.1, 0.1, 5, opts)
	if r != nil {
		t.Errorf("expected nil, got %v", r)
	}
}

func TestCheckConvergence_Priority(t *testing.T) {
	// When multiple criteria are met, gradient should win (first in order)
	opts := DefaultOptions()
	r := CheckConvergence(1e-9, 1e-9, 1e-13, 1000, opts)
	if r == nil || r.Kind != "gradient" {
		t.Errorf("expected gradient (priority), got %v", r)
	}
}

func TestIsConverged(t *testing.T) {
	tests := []struct {
		kind string
		want bool
	}{
		{"gradient", true},
		{"step", true},
		{"function", true},
		{"maxIterations", false},
		{"lineSearchFailed", false},
	}
	for _, tc := range tests {
		r := &ConvergenceReason{Kind: tc.kind}
		if got := IsConverged(r); got != tc.want {
			t.Errorf("IsConverged(%q) = %v, want %v", tc.kind, got, tc.want)
		}
	}
}

func TestConvergenceMessage(t *testing.T) {
	tests := []struct {
		reason *ConvergenceReason
		substr string
	}{
		{&ConvergenceReason{Kind: "gradient", GradNorm: 1e-9}, "gradient norm"},
		{&ConvergenceReason{Kind: "step", StepNorm: 1e-9}, "step size"},
		{&ConvergenceReason{Kind: "function", FuncChange: 1e-13}, "function change"},
		{&ConvergenceReason{Kind: "maxIterations", Iterations: 1000}, "maximum iterations"},
		{&ConvergenceReason{Kind: "lineSearchFailed", Message: "no step"}, "line search failed"},
	}
	for _, tc := range tests {
		msg := ConvergenceMessage(tc.reason)
		if len(msg) == 0 {
			t.Errorf("empty message for %q", tc.reason.Kind)
		}
		// Just verify it contains relevant info
		if !containsSubstr(msg, tc.substr) {
			t.Errorf("ConvergenceMessage(%q) = %q, expected to contain %q", tc.reason.Kind, msg, tc.substr)
		}
	}
}

func containsSubstr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsHelper(s, sub))
}

func containsHelper(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// nelder-mead tests
// ---------------------------------------------------------------------------

func TestNelderMead_Sphere(t *testing.T) {
	result := NelderMead(sphere, []float64{5, 5}, nil)
	if !result.Converged {
		t.Fatalf("expected convergence, got: %s", result.Message)
	}
	if result.Fun >= 1e-6 {
		t.Errorf("fun = %v, want < 1e-6", result.Fun)
	}
	if !approxEqual(result.X[0], 0, 1e-3) || !approxEqual(result.X[1], 0, 1e-3) {
		t.Errorf("x = %v, want near [0,0]", result.X)
	}
}

func TestNelderMead_Booth(t *testing.T) {
	result := NelderMead(booth, []float64{0, 0}, nil)
	if !result.Converged {
		t.Fatalf("expected convergence, got: %s", result.Message)
	}
	if result.Fun >= 1e-6 {
		t.Errorf("fun = %v, want < 1e-6", result.Fun)
	}
	if !approxEqual(result.X[0], 1, 1e-3) || !approxEqual(result.X[1], 3, 1e-3) {
		t.Errorf("x = %v, want near [1,3]", result.X)
	}
}

func TestNelderMead_Beale(t *testing.T) {
	opts := DefaultNelderMeadOptions()
	opts.MaxIterations = 5000
	opts.FuncTol = 1e-15
	opts.StepTol = 1e-12
	result := NelderMead(beale, []float64{0, 0}, &opts)
	if !result.Converged {
		t.Fatalf("expected convergence, got: %s", result.Message)
	}
	if result.Fun >= 1e-6 {
		t.Errorf("fun = %v, want < 1e-6", result.Fun)
	}
}

func TestNelderMead_Rosenbrock(t *testing.T) {
	opts := DefaultNelderMeadOptions()
	opts.MaxIterations = 5000
	opts.FuncTol = 1e-15
	opts.StepTol = 1e-12
	result := NelderMead(rosenbrock, []float64{-1.2, 1.0}, &opts)
	if !result.Converged {
		t.Fatalf("expected convergence, got: %s", result.Message)
	}
	if result.Fun >= 1e-6 {
		t.Errorf("fun = %v, want < 1e-6", result.Fun)
	}
	if !approxEqual(result.X[0], 1, 1e-3) || !approxEqual(result.X[1], 1, 1e-3) {
		t.Errorf("x = %v, want near [1,1]", result.X)
	}
}

func TestNelderMead_Himmelblau(t *testing.T) {
	result := NelderMead(himmelblau, []float64{0, 0}, nil)
	if !result.Converged {
		t.Fatalf("expected convergence, got: %s", result.Message)
	}
	if result.Fun >= 1e-6 {
		t.Errorf("fun = %v, want < 1e-6", result.Fun)
	}
	// Should converge to one of four known minima:
	// (3, 2), (-2.805118, 3.131312), (-3.779310, -3.283186), (3.584428, -1.848126)
	knownMinima := [][]float64{
		{3, 2},
		{-2.805118, 3.131312},
		{-3.779310, -3.283186},
		{3.584428, -1.848126},
	}
	found := false
	for _, m := range knownMinima {
		if approxEqual(result.X[0], m[0], 1e-2) && approxEqual(result.X[1], m[1], 1e-2) {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("x = %v, not near any known Himmelblau minimum", result.X)
	}
}

// Behavioral tests

func TestNelderMead_RespectsMaxIterations(t *testing.T) {
	opts := DefaultNelderMeadOptions()
	opts.MaxIterations = 5
	result := NelderMead(rosenbrock, []float64{-1.2, 1.0}, &opts)
	if result.Converged {
		t.Error("should not converge with maxIterations=5")
	}
	if result.Iterations > 5 {
		t.Errorf("iterations = %d, want <= 5", result.Iterations)
	}
}

func TestNelderMead_GradientCallsAlwaysZero(t *testing.T) {
	result := NelderMead(sphere, []float64{5, 5}, nil)
	if result.GradientCalls != 0 {
		t.Errorf("gradientCalls = %d, want 0", result.GradientCalls)
	}
	if result.Gradient != nil {
		t.Error("gradient should be nil for Nelder-Mead")
	}
}

func TestNelderMead_FunctionCallsCounted(t *testing.T) {
	result := NelderMead(sphere, []float64{5, 5}, nil)
	if result.FunctionCalls < 3 {
		t.Errorf("functionCalls = %d, expected at least n+1=3", result.FunctionCalls)
	}
}

func TestDefaultNelderMeadOptions(t *testing.T) {
	opts := DefaultNelderMeadOptions()
	if opts.Alpha != 1.0 {
		t.Errorf("Alpha = %v, want 1.0", opts.Alpha)
	}
	if opts.Gamma != 2.0 {
		t.Errorf("Gamma = %v, want 2.0", opts.Gamma)
	}
	if opts.Rho != 0.5 {
		t.Errorf("Rho = %v, want 0.5", opts.Rho)
	}
	if opts.Sigma != 0.5 {
		t.Errorf("Sigma = %v, want 0.5", opts.Sigma)
	}
	if opts.InitialSimplexScale != 0.05 {
		t.Errorf("InitialSimplexScale = %v, want 0.05", opts.InitialSimplexScale)
	}
	if opts.MaxIterations != 1000 {
		t.Errorf("MaxIterations = %v, want 1000", opts.MaxIterations)
	}
}
