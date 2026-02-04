package optimization

import (
	"math"
	"testing"
)

func TestLBFGSSphere(t *testing.T) {
	x0 := []float64{5, 5}
	result := LBFGS(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
}

func TestLBFGSBooth(t *testing.T) {
	x0 := []float64{0, 0}
	result := LBFGS(Booth, x0, BoothGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
}

func TestLBFGSRosenbrock(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	result := LBFGS(Rosenbrock, x0, RosenbrockGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-10 {
		t.Errorf("Expected fun < 1e-10, got %v", result.Fun)
	}
}

func TestLBFGSBeale(t *testing.T) {
	x0 := []float64{0, 0}
	result := LBFGS(Beale, x0, BealeGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
	}
}

func TestLBFGSHimmelblau(t *testing.T) {
	x0 := []float64{0, 0}
	result := LBFGS(Himmelblau, x0, HimmelblauGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
	}
}

func TestLBFGSGoldsteinPrice(t *testing.T) {
	x0 := []float64{-0.1, -0.9}
	result := LBFGS(GoldsteinPrice, x0, GoldsteinPriceGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.Fun-3.0) > 1e-4 {
		t.Errorf("Expected fun ≈ 3, got %v", result.Fun)
	}
}

func TestLBFGSCustomMemory(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &LBFGSOptions{Memory: 3}
	result := LBFGS(Rosenbrock, x0, RosenbrockGrad, opts)

	if !result.Converged {
		t.Errorf("Expected convergence with memory=3, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Expected fun < 1e-6, got %v", result.Fun)
	}
}

func TestLBFGSAlreadyAtMinimum(t *testing.T) {
	x0 := []float64{0, 0}
	result := LBFGS(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Error("Expected convergence")
	}
	if result.Iterations != 0 {
		t.Errorf("Expected 0 iterations, got %d", result.Iterations)
	}
}

func TestLBFGSMaxIterations(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &LBFGSOptions{
		OptimizeOptions: OptimizeOptions{MaxIterations: 2},
	}
	result := LBFGS(Rosenbrock, x0, RosenbrockGrad, opts)

	if result.Converged {
		t.Error("Should not converge with only 2 iterations")
	}
}

func TestLBFGSWithFiniteDiff(t *testing.T) {
	x0 := []float64{5, 5}
	result := LBFGS(Sphere, x0, nil, nil)

	if !result.Converged {
		t.Errorf("Expected convergence with finite diff, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
}
