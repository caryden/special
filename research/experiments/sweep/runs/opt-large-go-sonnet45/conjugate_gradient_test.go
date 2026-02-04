package optimization

import (
	"math"
	"testing"
)

func TestConjugateGradientSphere(t *testing.T) {
	x0 := []float64{5, 5}
	result := ConjugateGradient(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-14 {
		t.Errorf("Expected fun < 1e-14, got %v", result.Fun)
	}
}

func TestConjugateGradientBooth(t *testing.T) {
	x0 := []float64{0, 0}
	result := ConjugateGradient(Booth, x0, BoothGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.X[0]-1) > 1e-3 || math.Abs(result.X[1]-3) > 1e-3 {
		t.Errorf("Expected x ≈ [1,3], got %v", result.X)
	}
}

func TestConjugateGradientRosenbrock(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	result := ConjugateGradient(Rosenbrock, x0, RosenbrockGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-8 {
		t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
	}
}

func TestConjugateGradientBeale(t *testing.T) {
	x0 := []float64{0, 0}
	result := ConjugateGradient(Beale, x0, BealeGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.X[0]-3) > 1e-2 || math.Abs(result.X[1]-0.5) > 1e-2 {
		t.Errorf("Expected x ≈ [3,0.5], got %v", result.X)
	}
}

func TestConjugateGradientHimmelblau(t *testing.T) {
	x0 := []float64{0, 0}
	result := ConjugateGradient(Himmelblau, x0, HimmelblauGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-10 {
		t.Errorf("Expected fun < 1e-10, got %v", result.Fun)
	}
}

func TestConjugateGradientGoldsteinPrice(t *testing.T) {
	x0 := []float64{-0.1, -0.9}
	result := ConjugateGradient(GoldsteinPrice, x0, GoldsteinPriceGrad, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if math.Abs(result.Fun-3.0) > 0.1 {
		t.Errorf("Expected fun ≈ 3, got %v", result.Fun)
	}
}

func TestConjugateGradientWithFiniteDiff(t *testing.T) {
	x0 := []float64{5, 5}
	result := ConjugateGradient(Sphere, x0, nil, nil)

	if !result.Converged {
		t.Errorf("Expected convergence with finite diff, got %v", result.Message)
	}
}

func TestConjugateGradientAlreadyAtMinimum(t *testing.T) {
	x0 := []float64{0, 0}
	result := ConjugateGradient(Sphere, x0, SphereGrad, nil)

	if !result.Converged {
		t.Error("Expected convergence")
	}
	if result.Iterations != 0 {
		t.Errorf("Expected 0 iterations, got %d", result.Iterations)
	}
}

func TestConjugateGradient1D(t *testing.T) {
	f := func(x []float64) float64 {
		return x[0] * x[0]
	}
	grad := func(x []float64) []float64 {
		return []float64{2 * x[0]}
	}

	x0 := []float64{5}
	result := ConjugateGradient(f, x0, grad, nil)

	if !result.Converged {
		t.Error("Expected convergence on 1D problem")
	}
}

func TestConjugateGradient5D(t *testing.T) {
	f := func(x []float64) float64 {
		sum := 0.0
		for _, xi := range x {
			sum += xi * xi
		}
		return sum
	}
	grad := func(x []float64) []float64 {
		g := make([]float64, len(x))
		for i := range g {
			g[i] = 2 * x[i]
		}
		return g
	}

	x0 := []float64{5, 5, 5, 5, 5}
	result := ConjugateGradient(f, x0, grad, nil)

	if !result.Converged {
		t.Error("Expected convergence on 5D sphere")
	}
}

func TestConjugateGradientMaxIterations(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &ConjugateGradientOptions{
		OptimizeOptions: OptimizeOptions{MaxIterations: 5},
	}
	result := ConjugateGradient(Rosenbrock, x0, RosenbrockGrad, opts)

	if result.Converged {
		t.Error("Should not converge with only 5 iterations on Rosenbrock")
	}
}
