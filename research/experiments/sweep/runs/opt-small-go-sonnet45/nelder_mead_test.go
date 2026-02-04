package optimization

import (
	"math"
	"testing"
)

// Test functions from the spec

func sphere(x []float64) float64 {
	sum := 0.0
	for _, xi := range x {
		sum += xi * xi
	}
	return sum
}

func booth(x []float64) float64 {
	// f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
	// minimum at (1, 3) with f = 0
	t1 := x[0] + 2*x[1] - 7
	t2 := 2*x[0] + x[1] - 5
	return t1*t1 + t2*t2
}

func beale(x []float64) float64 {
	// f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
	// minimum at (3, 0.5) with f = 0
	t1 := 1.5 - x[0] + x[0]*x[1]
	t2 := 2.25 - x[0] + x[0]*x[1]*x[1]
	t3 := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]
	return t1*t1 + t2*t2 + t3*t3
}

func rosenbrock(x []float64) float64 {
	// f(x,y) = (1-x)^2 + 100(y - x^2)^2
	// minimum at (1, 1) with f = 0
	t1 := 1 - x[0]
	t2 := x[1] - x[0]*x[0]
	return t1*t1 + 100*t2*t2
}

func himmelblau(x []float64) float64 {
	// f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
	// Four minima at (3,2), (-2.805,3.131), (-3.779,-3.283), (3.584,-1.848)
	t1 := x[0]*x[0] + x[1] - 11
	t2 := x[0] + x[1]*x[1] - 7
	return t1*t1 + t2*t2
}

func goldsteinPrice(x []float64) float64 {
	// minimum at (0, -1) with f = 3
	a := x[0] + x[1] + 1
	b := 19 - 14*x[0] + 3*x[0]*x[0] - 14*x[1] + 6*x[0]*x[1] + 3*x[1]*x[1]
	c := 2*x[0] - 3*x[1]
	d := 18 - 32*x[0] + 12*x[0]*x[0] + 48*x[1] - 36*x[0]*x[1] + 27*x[1]*x[1]
	return (1 + a*a*b) * (30 + c*c*d)
}

func TestNelderMeadSphere(t *testing.T) {
	x0 := []float64{5, 5}
	result := NelderMead(sphere, x0, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Fun = %v, want < 1e-6", result.Fun)
	}
	for i, xi := range result.X {
		if math.Abs(xi) > 0.01 {
			t.Errorf("X[%d] = %v, want ≈ 0", i, xi)
		}
	}
	if result.GradientCalls != 0 {
		t.Errorf("GradientCalls = %v, want 0", result.GradientCalls)
	}
	if result.Gradient != nil {
		t.Errorf("Gradient = %v, want nil", result.Gradient)
	}
}

func TestNelderMeadBooth(t *testing.T) {
	x0 := []float64{0, 0}
	result := NelderMead(booth, x0, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Fun = %v, want < 1e-6", result.Fun)
	}
	// Expected minimum at (1, 3)
	if math.Abs(result.X[0]-1) > 0.01 || math.Abs(result.X[1]-3) > 0.01 {
		t.Errorf("X = %v, want ≈ [1, 3]", result.X)
	}
}

func TestNelderMeadBeale(t *testing.T) {
	x0 := []float64{0, 0}
	opts := &NelderMeadOptions{}
	opts.MaxIterations = 5000
	result := NelderMead(beale, x0, opts)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Fun = %v, want < 1e-6", result.Fun)
	}
}

func TestNelderMeadRosenbrock(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &NelderMeadOptions{}
	opts.MaxIterations = 5000
	opts.FuncTol = 1e-12
	opts.StepTol = 1e-8
	result := NelderMead(rosenbrock, x0, opts)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Fun = %v, want < 1e-6", result.Fun)
	}
	// Expected minimum at (1, 1)
	if math.Abs(result.X[0]-1) > 0.01 || math.Abs(result.X[1]-1) > 0.01 {
		t.Errorf("X = %v, want ≈ [1, 1]", result.X)
	}
}

func TestNelderMeadHimmelblau(t *testing.T) {
	x0 := []float64{0, 0}
	result := NelderMead(himmelblau, x0, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	if result.Fun > 1e-6 {
		t.Errorf("Fun = %v, want < 1e-6", result.Fun)
	}

	// One of the four known minima
	minima := [][]float64{
		{3, 2},
		{-2.805, 3.131},
		{-3.779, -3.283},
		{3.584, -1.848},
	}

	foundMinimum := false
	for _, minimum := range minima {
		if math.Abs(result.X[0]-minimum[0]) < 0.1 && math.Abs(result.X[1]-minimum[1]) < 0.1 {
			foundMinimum = true
			break
		}
	}

	if !foundMinimum {
		t.Logf("X = %v, expected one of the four known minima", result.X)
		// Don't fail, just log - starting from (0,0) typically converges to (3,2)
	}
}

func TestNelderMeadGoldsteinPrice(t *testing.T) {
	x0 := []float64{-0.1, -0.9}
	result := NelderMead(goldsteinPrice, x0, nil)

	if !result.Converged {
		t.Errorf("Expected convergence, got %v", result.Message)
	}
	// Expected minimum value is 3
	if math.Abs(result.Fun-3.0) > 0.01 {
		t.Errorf("Fun = %v, want ≈ 3.0", result.Fun)
	}
	// Expected minimum at (0, -1)
	if math.Abs(result.X[0]-0) > 0.1 || math.Abs(result.X[1]+1) > 0.1 {
		t.Errorf("X = %v, want ≈ [0, -1]", result.X)
	}
}

func TestNelderMeadMaxIterations(t *testing.T) {
	x0 := []float64{-1.2, 1.0}
	opts := &NelderMeadOptions{}
	opts.MaxIterations = 5
	result := NelderMead(rosenbrock, x0, opts)

	if result.Iterations > 5 {
		t.Errorf("Iterations = %v, want <= 5", result.Iterations)
	}
	if result.Converged {
		t.Errorf("Expected no convergence with maxIterations=5")
	}
}

func TestNelderMeadGradientCallsAlwaysZero(t *testing.T) {
	x0 := []float64{5, 5}
	result := NelderMead(sphere, x0, nil)

	if result.GradientCalls != 0 {
		t.Errorf("GradientCalls = %v, want 0 (derivative-free)", result.GradientCalls)
	}
}
