package optimization

import (
	"math"
	"testing"
)

func TestBFGSSphere(t *testing.T) {
	x0 := []float64{5, 5}
	result := BFGS(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
	if math.Abs(result.X[0]) > 1e-4 || math.Abs(result.X[1]) > 1e-4 {
		t.Errorf("Expected x ≈ [0,0], got %v", result.X)
	}
}

func TestBFGSBooth(t *testing.T) {
	x0 := []float64{0, 0}
	result := BFGS(Booth, x0, BoothGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
	if math.Abs(result.X[0]-1) > 1e-4 || math.Abs(result.X[1]-3) > 1e-4 {
		t.Errorf("Expected x ≈ [1,3], got %v", result.X)
	}
}

func TestBFGSRosenbrock(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	result := BFGS(Rosenbrock, x0, RosenbrockGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-10 {
		t.Errorf("Expected fun < 1e-10, got %v", result.Fun)
	}
	if math.Abs(result.X[0]-1) > 1e-3 || math.Abs(result.X[1]-1) > 1e-3 {
		t.Errorf("Expected x ≈ [1,1], got %v", result.X)
	}
}

func TestBFGSBeale(t *testing.T) {
	x0 := []float64{0, 0}
	result := BFGS(Beale, x0, BealeGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
	}
}

func TestBFGSGoldsteinPrice(t *testing.T) {
	x0 := []float64{-0.1, -0.9} // Using the starting point from the task requirements
	result := BFGS(GoldsteinPrice, x0, GoldsteinPriceGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.Fun-3.0) > 1e-4 {
		t.Errorf("Expected fun ≈ 3, got %v", result.Fun)
	}
}

func TestBFGSAlreadyAtMinimum(t *testing.T) {
	x0 := []float64{0, 0}
	result := BFGS(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Error("Expected convergence")
	}
	if result.Iterations != 0 {
		t.Errorf("Expected 0 iterations, got %d", result.Iterations)
	}
}

func TestBFGSMaxIterations(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &OptimizeOptions{MaxIterations: 2}
	result := BFGS(Rosenbrock, x0, RosenbrockGrad, opts)

	if result.Converged {
		t.Error("Should not converge with only 2 iterations")
	}
	if result.Iterations > 2 {
		t.Errorf("Expected ≤ 2 iterations, got %d", result.Iterations)
	}
}

func TestBFGSWithFiniteDiff(t *testing.T) {
	x0 := []float64{5, 5}
	result := BFGS(Sphere, x0, nil, nil)

	if !result.Converged {
		t.Errorf("Expected convergence with finite diff, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Expected fun ≈ 0, got %v", result.Fun)
	}
}
