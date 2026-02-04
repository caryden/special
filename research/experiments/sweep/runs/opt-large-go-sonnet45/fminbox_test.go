package optimization

import (
	"math"
	"testing"
)

func TestFminboxInteriorMinimumSphere(t *testing.T) {
	x0 := []float64{1, 1}
	opts := &FminboxOptions{
		Lower:  []float64{-5, -5},
		Upper:  []float64{5, 5},
		Method: "l-bfgs",
	}
	result := Fminbox(Sphere, x0, SphereGrad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
	if math.Abs(result.X[0]) > 1e-3 || math.Abs(result.X[1]) > 1e-3 {
		t.Errorf("Expected x ≈ [0,0], got %v", result.X)
	}
}

func TestFminboxBoundaryMinimum(t *testing.T) {
	f := func(x []float64) float64 {
		return x[0] * x[0]
	}
	grad := func(x []float64) []float64 {
		return []float64{2 * x[0]}
	}

	x0 := []float64{5}
	opts := &FminboxOptions{
		Lower:  []float64{2},
		Upper:  []float64{10},
		Method: "l-bfgs",
	}
	result := Fminbox(f, x0, grad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.X[0]-2.0) > 0.01 {
		t.Errorf("Expected x ≈ 2 (lower bound), got %v", result.X[0])
	}
}

func TestFminboxBoundConstrainedRosenbrock(t *testing.T) {
	x0 := []float64{2, 2}
	opts := &FminboxOptions{
		Lower:  []float64{1.5, 1.5},
		Upper:  []float64{3, 3},
		Method: "l-bfgs",
	}
	result := Fminbox(Rosenbrock, x0, RosenbrockGrad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	// Constrained minimum should be near [1.5, 2.25]
	if math.Abs(result.X[0]-1.5) > 0.1 {
		t.Errorf("Expected x[0] ≈ 1.5, got %v", result.X[0])
	}
}

func TestFminboxInvalidBounds(t *testing.T) {
	x0 := []float64{1}
	opts := &FminboxOptions{
		Lower: []float64{5},
		Upper: []float64{2},
	}
	result := Fminbox(Sphere, x0, SphereGrad, opts)

	if result.Converged {
		t.Error("Should not converge with invalid bounds")
	}
	if result.Message != "Invalid bounds: lower >= upper" {
		t.Errorf("Expected invalid bounds message, got %v", result.Message)
	}
}

func TestFminboxBarrierValue(t *testing.T) {
	// Test normal case
	val := BarrierValue([]float64{2}, []float64{0}, []float64{4})
	expected := -2 * math.Log(2)
	if math.Abs(val-expected) > 1e-10 {
		t.Errorf("BarrierValue([2], [0], [4]) = %v, want %v", val, expected)
	}

	// Test at bound (should be infinity)
	val = BarrierValue([]float64{0}, []float64{0}, []float64{4})
	if !math.IsInf(val, 1) {
		t.Errorf("BarrierValue at bound should be +Inf, got %v", val)
	}

	// Test with infinite bounds
	val = BarrierValue([]float64{5}, []float64{math.Inf(-1)}, []float64{math.Inf(1)})
	if val != 0 {
		t.Errorf("BarrierValue with infinite bounds should be 0, got %v", val)
	}
}

func TestFminboxProjectedGradientNorm(t *testing.T) {
	// At lower bound, gradient pointing outward is zeroed
	norm := ProjectedGradientNorm([]float64{0}, []float64{1}, []float64{0}, []float64{10})
	if norm != 0 {
		t.Errorf("Expected projected gradient norm = 0 at bound, got %v", norm)
	}

	// Interior point: projected gradient equals infinity norm
	norm = ProjectedGradientNorm([]float64{2, 3}, []float64{0.5, -0.3}, []float64{0, 0}, []float64{10, 10})
	if math.Abs(norm-0.5) > 1e-10 {
		t.Errorf("Expected projected gradient norm = 0.5, got %v", norm)
	}
}

func TestFminboxMethodBFGS(t *testing.T) {
	x0 := []float64{1, 1}
	opts := &FminboxOptions{
		Lower:  []float64{-5, -5},
		Upper:  []float64{5, 5},
		Method: "bfgs",
	}
	result := Fminbox(Sphere, x0, SphereGrad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence with BFGS, got %v", result.Message)
	}
}

func TestFminboxMethodConjugateGradient(t *testing.T) {
	x0 := []float64{1, 1}
	opts := &FminboxOptions{
		Lower:  []float64{-5, -5},
		Upper:  []float64{5, 5},
		Method: "conjugate-gradient",
	}
	result := Fminbox(Sphere, x0, SphereGrad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence with CG, got %v", result.Message)
	}
}
