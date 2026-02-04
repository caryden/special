package optimization

import (
	"math"
	"testing"
)

// Test functions for line search
func sphere(x []float64) float64 {
	return Dot(x, x)
}

func sphereGrad(x []float64) []float64 {
	return Scale(x, 2.0)
}

func rosenbrock(x []float64) float64 {
	a := 1.0 - x[0]
	b := x[1] - x[0]*x[0]
	return a*a + 100*b*b
}

func rosenbrockGrad(x []float64) []float64 {
	a := 1.0 - x[0]
	b := x[1] - x[0]*x[0]
	return []float64{
		-2*a - 400*b*x[0],
		200 * b,
	}
}

func TestBacktrackingLineSearch(t *testing.T) {
	t.Run("sphere from [10,10]", func(t *testing.T) {
		x := []float64{10, 10}
		fx := sphere(x)
		gx := sphereGrad(x)
		d := Negate(gx) // descent direction

		result := BacktrackingLineSearch(sphere, x, d, fx, gx, nil)

		if !result.Success {
			t.Errorf("Expected success=true, got false")
		}
		if math.Abs(result.Alpha-0.5) > 1e-10 {
			t.Errorf("Expected alpha=0.5, got %v", result.Alpha)
		}
		if math.Abs(result.FNew) > 1e-10 {
			t.Errorf("Expected fNew≈0, got %v", result.FNew)
		}
	})

	t.Run("rosenbrock from [-1.2,1]", func(t *testing.T) {
		x := []float64{-1.2, 1}
		fx := rosenbrock(x)
		gx := rosenbrockGrad(x)
		d := Negate(gx)

		result := BacktrackingLineSearch(rosenbrock, x, d, fx, gx, nil)

		if !result.Success {
			t.Errorf("Expected success=true, got false")
		}
		if result.FNew >= fx {
			t.Errorf("Expected fNew < fx, got fNew=%v, fx=%v", result.FNew, fx)
		}
	})

	t.Run("ascending direction", func(t *testing.T) {
		x := []float64{10, 10}
		fx := sphere(x)
		gx := sphereGrad(x)
		d := gx // ascending direction (not descent)

		result := BacktrackingLineSearch(sphere, x, d, fx, gx, nil)

		if result.Success {
			t.Errorf("Expected success=false for ascending direction, got true")
		}
	})
}

func TestWolfeLineSearch(t *testing.T) {
	t.Run("sphere from [10,10]", func(t *testing.T) {
		x := []float64{10, 10}
		fx := sphere(x)
		gx := sphereGrad(x)
		d := Negate(gx)

		result := WolfeLineSearch(sphere, sphereGrad, x, d, fx, gx, nil)

		if !result.Success {
			t.Errorf("Expected success=true, got false")
		}

		// Verify Wolfe conditions
		c1 := 1e-4
		c2 := 0.9
		slope0 := Dot(gx, d)

		// Armijo condition
		if result.FNew > fx+c1*result.Alpha*slope0 {
			t.Errorf("Armijo condition violated: fNew=%v > %v", result.FNew, fx+c1*result.Alpha*slope0)
		}

		// Curvature condition
		if result.GNew != nil {
			slopeNew := Dot(result.GNew, d)
			if math.Abs(slopeNew) > -c2*slope0 {
				t.Errorf("Curvature condition violated: |%v| > %v", slopeNew, -c2*slope0)
			}
		}
	})

	t.Run("rosenbrock from [-1.2,1]", func(t *testing.T) {
		x := []float64{-1.2, 1}
		fx := rosenbrock(x)
		gx := rosenbrockGrad(x)
		d := Negate(gx)

		result := WolfeLineSearch(rosenbrock, rosenbrockGrad, x, d, fx, gx, nil)

		if !result.Success {
			t.Errorf("Expected success=true, got false")
		}
		if result.FNew >= fx {
			t.Errorf("Expected fNew < fx, got fNew=%v, fx=%v", result.FNew, fx)
		}
	})

	t.Run("returns gradient", func(t *testing.T) {
		x := []float64{10, 10}
		fx := sphere(x)
		gx := sphereGrad(x)
		d := Negate(gx)

		result := WolfeLineSearch(sphere, sphereGrad, x, d, fx, gx, nil)

		if result.GNew == nil {
			t.Errorf("Expected GNew to be non-nil")
		}
		if len(result.GNew) != 2 {
			t.Errorf("Expected GNew length=2, got %v", len(result.GNew))
		}
	})

	t.Run("ascending direction", func(t *testing.T) {
		x := []float64{10, 10}
		fx := sphere(x)
		gx := sphereGrad(x)
		d := gx // ascending direction

		result := WolfeLineSearch(sphere, sphereGrad, x, d, fx, gx, nil)

		if result.Success {
			t.Errorf("Expected success=false for ascending direction, got true")
		}
	})
}

func TestWolfeConditionsPostHoc(t *testing.T) {
	x := []float64{10, 10}
	fx := sphere(x)
	gx := sphereGrad(x)
	d := Negate(gx)

	result := WolfeLineSearch(sphere, sphereGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Skip("Line search failed, skipping post-hoc verification")
	}

	c1 := 1e-4
	c2 := 0.9
	slope0 := Dot(gx, d)

	// Armijo condition
	armijoRHS := fx + c1*result.Alpha*slope0
	if result.FNew > armijoRHS+1e-10 {
		t.Errorf("Armijo condition violated: %v > %v", result.FNew, armijoRHS)
	}

	// Curvature condition
	if result.GNew != nil {
		slopeNew := Dot(result.GNew, d)
		curvatureRHS := -c2 * slope0
		if math.Abs(slopeNew) > curvatureRHS+1e-10 {
			t.Errorf("Curvature condition violated: |%v| > %v", slopeNew, curvatureRHS)
		}
	}
}
