package optimization

import (
	"math"
	"testing"
)

// Test functions

func booth(x []float64) float64 {
	a := x[0] + 2*x[1] - 7
	b := 2*x[0] + x[1] - 5
	return a*a + b*b
}

func boothGrad(x []float64) []float64 {
	a := x[0] + 2*x[1] - 7
	b := 2*x[0] + x[1] - 5
	return []float64{
		2*a + 4*b,
		4*a + 2*b,
	}
}

func himmelblau(x []float64) float64 {
	a := x[0]*x[0] + x[1] - 11
	b := x[0] + x[1]*x[1] - 7
	return a*a + b*b
}

func himmelblauGrad(x []float64) []float64 {
	a := x[0]*x[0] + x[1] - 11
	b := x[0] + x[1]*x[1] - 7
	return []float64{
		4*a*x[0] + 2*b,
		2*a + 4*b*x[1],
	}
}

func goldsteinPrice(x []float64) float64 {
	a := x[0] + x[1] + 1
	b := 19 - 14*x[0] + 3*x[0]*x[0] - 14*x[1] + 6*x[0]*x[1] + 3*x[1]*x[1]
	c := 2*x[0] - 3*x[1]
	d := 18 - 32*x[0] + 12*x[0]*x[0] + 48*x[1] - 36*x[0]*x[1] + 27*x[1]*x[1]
	return (1 + a*a*b) * (30 + c*c*d)
}

func goldsteinPriceGrad(x []float64) []float64 {
	// Complex derivatives - computed symbolically
	a := x[0] + x[1] + 1
	b := 19 - 14*x[0] + 3*x[0]*x[0] - 14*x[1] + 6*x[0]*x[1] + 3*x[1]*x[1]
	c := 2*x[0] - 3*x[1]
	d := 18 - 32*x[0] + 12*x[0]*x[0] + 48*x[1] - 36*x[0]*x[1] + 27*x[1]*x[1]

	dbdx0 := -14 + 6*x[0] + 6*x[1]
	dbdx1 := -14 + 6*x[0] + 6*x[1]
	dddx0 := -32 + 24*x[0] - 36*x[1]
	dddx1 := 48 - 36*x[0] + 54*x[1]

	term1 := 1 + a*a*b
	term2 := 30 + c*c*d

	dterm1dx0 := 2*a*b + a*a*dbdx0
	dterm1dx1 := 2*a*b + a*a*dbdx1
	dterm2dx0 := 2*c*2*d + c*c*dddx0
	dterm2dx1 := 2*c*(-3)*d + c*c*dddx1

	return []float64{
		dterm1dx0*term2 + term1*dterm2dx0,
		dterm1dx1*term2 + term1*dterm2dx1,
	}
}

func TestBFGS(t *testing.T) {
	t.Run("sphere from [5,5]", func(t *testing.T) {
		x0 := []float64{5, 5}
		result := BFGS(sphere, x0, sphereGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-8 {
			t.Errorf("Expected fun≈0, got %v", result.Fun)
		}
		if math.Abs(result.X[0]) > 1e-4 || math.Abs(result.X[1]) > 1e-4 {
			t.Errorf("Expected x≈[0,0], got %v", result.X)
		}
		if result.Iterations >= 20 {
			t.Errorf("Expected iterations < 20, got %v", result.Iterations)
		}
	})

	t.Run("booth from [0,0]", func(t *testing.T) {
		x0 := []float64{0, 0}
		result := BFGS(booth, x0, boothGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-8 {
			t.Errorf("Expected fun≈0, got %v", result.Fun)
		}
		// Booth minimum at [1, 3]
		if math.Abs(result.X[0]-1) > 1e-4 || math.Abs(result.X[1]-3) > 1e-4 {
			t.Errorf("Expected x≈[1,3], got %v", result.X)
		}
	})

	t.Run("rosenbrock from [-1.2,1]", func(t *testing.T) {
		x0 := []float64{-1.2, 1.0}
		result := BFGS(rosenbrock, x0, rosenbrockGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-10 {
			t.Errorf("Expected fun < 1e-10, got %v", result.Fun)
		}
		// Rosenbrock minimum at [1, 1]
		if math.Abs(result.X[0]-1) > 1e-4 || math.Abs(result.X[1]-1) > 1e-4 {
			t.Errorf("Expected x≈[1,1], got %v", result.X)
		}
	})

	t.Run("beale from [0,0]", func(t *testing.T) {
		x0 := []float64{0, 0}
		result := BFGS(beale, x0, bealeGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-8 {
			t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
		}
		// Beale minimum at [3, 0.5]
		if math.Abs(result.X[0]-3) > 1e-3 || math.Abs(result.X[1]-0.5) > 1e-3 {
			t.Errorf("Expected x≈[3,0.5], got %v", result.X)
		}
	})

	t.Run("himmelblau from [0,0]", func(t *testing.T) {
		x0 := []float64{0, 0}
		result := BFGS(himmelblau, x0, himmelblauGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-8 {
			t.Errorf("Expected fun < 1e-8, got %v", result.Fun)
		}
		// Himmelblau has four minima; from [0,0] we typically get [3,2]
		// Check we're near one of the minima
		minima := [][]float64{
			{3.0, 2.0},
			{-2.805118, 3.131312},
			{-3.779310, -3.283186},
			{3.584428, -1.848126},
		}
		nearMinimum := false
		for _, min := range minima {
			if math.Abs(result.X[0]-min[0]) < 0.1 && math.Abs(result.X[1]-min[1]) < 0.1 {
				nearMinimum = true
				break
			}
		}
		if !nearMinimum {
			t.Errorf("Expected x near one of the minima, got %v", result.X)
		}
	})

	t.Run("goldstein-price from [0,-0.5]", func(t *testing.T) {
		x0 := []float64{0, -0.5}
		result := BFGS(goldsteinPrice, x0, goldsteinPriceGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if math.Abs(result.Fun-3) > 1e-4 {
			t.Errorf("Expected fun≈3, got %v", result.Fun)
		}
		// Goldstein-Price minimum at [0, -1] with f=3
		if math.Abs(result.X[0]-0) > 1e-3 || math.Abs(result.X[1]+1) > 1e-3 {
			t.Errorf("Expected x≈[0,-1], got %v", result.X)
		}
	})
}

func TestBFGSFiniteDiff(t *testing.T) {
	t.Run("sphere without gradient", func(t *testing.T) {
		x0 := []float64{5, 5}
		result := BFGS(sphere, x0, nil, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true, got false")
		}
		if result.Fun > 1e-6 {
			t.Errorf("Expected fun≈0 (tolerance 1e-6), got %v", result.Fun)
		}
	})

	t.Run("rosenbrock without gradient", func(t *testing.T) {
		x0 := []float64{-1.2, 1.0}
		result := BFGS(rosenbrock, x0, nil, nil)

		// May not formally converge due to FD noise, but should get close
		if result.Fun > 1e-6 {
			t.Errorf("Expected fun < 1e-6, got %v", result.Fun)
		}
		if math.Abs(result.X[0]-1) > 0.01 || math.Abs(result.X[1]-1) > 0.01 {
			t.Errorf("Expected x≈[1,1], got %v", result.X)
		}
	})
}

func TestBFGSBehavioral(t *testing.T) {
	t.Run("returns gradient at solution", func(t *testing.T) {
		x0 := []float64{5, 5}
		result := BFGS(sphere, x0, sphereGrad, nil)

		if result.Gradient == nil {
			t.Errorf("Expected gradient to be non-nil")
		}
		if len(result.Gradient) != 2 {
			t.Errorf("Expected gradient length=2, got %v", len(result.Gradient))
		}
		// Gradient should be near zero at minimum
		if Norm(result.Gradient) > 1e-6 {
			t.Errorf("Expected gradient near zero, got %v", result.Gradient)
		}
	})

	t.Run("respects maxIterations", func(t *testing.T) {
		x0 := []float64{-1.2, 1.0}
		opts := &OptimizeOptions{MaxIterations: 3}
		result := BFGS(rosenbrock, x0, rosenbrockGrad, opts)

		if result.Iterations > 3 {
			t.Errorf("Expected iterations ≤ 3, got %v", result.Iterations)
		}
	})

	t.Run("already at minimum", func(t *testing.T) {
		x0 := []float64{0, 0}
		result := BFGS(sphere, x0, sphereGrad, nil)

		if !result.Converged {
			t.Errorf("Expected converged=true")
		}
		if result.Iterations != 0 {
			t.Errorf("Expected iterations=0, got %v", result.Iterations)
		}
	})

	t.Run("impossible tolerance", func(t *testing.T) {
		x0 := []float64{-1.2, 1.0}
		opts := &OptimizeOptions{
			MaxIterations: 2,
			GradTol:       1e-20, // impossible to achieve
		}
		result := BFGS(rosenbrock, x0, rosenbrockGrad, opts)

		if result.Converged {
			t.Errorf("Expected converged=false with impossible tolerance")
		}
		if result.Message != "Terminated: maximum iterations reached" {
			t.Errorf("Expected 'maximum iterations' message, got %v", result.Message)
		}
	})
}
