package optimization

import (
	"math"
	"testing"
)

func TestBacktrackingLineSearchSphere(t *testing.T) {
	x := []float64{10, 10}
	fx := Sphere(x)
	gx := SphereGrad(x)
	d := Negate(gx) // steepest descent direction

	result := BacktrackingLineSearch(Sphere, x, d, fx, gx, 1e-4, 0.5, 1.0, 20)

	if !result.Success {
		t.Error("Expected line search to succeed")
	}
	if result.Alpha != 0.5 {
		t.Errorf("Expected alpha = 0.5, got %v", result.Alpha)
	}
	if result.FNew != 0.0 {
		t.Errorf("Expected fNew = 0, got %v", result.FNew)
	}
}

func TestBacktrackingLineSearchRosenbrock(t *testing.T) {
	x := []float64{-1.2, 1.0}
	fx := Rosenbrock(x)
	gx := RosenbrockGrad(x)
	d := Negate(gx)

	result := BacktrackingLineSearch(Rosenbrock, x, d, fx, gx, 1e-4, 0.5, 1.0, 20)

	if !result.Success {
		t.Error("Expected line search to succeed")
	}
	if result.FNew >= fx {
		t.Errorf("Expected fNew < fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}

func TestBacktrackingLineSearchAscendingDirection(t *testing.T) {
	x := []float64{10, 10}
	fx := Sphere(x)
	gx := SphereGrad(x)
	d := gx // ascending direction (not descent)

	result := BacktrackingLineSearch(Sphere, x, d, fx, gx, 1e-4, 0.5, 1.0, 20)

	if result.Success {
		t.Error("Expected line search to fail with ascending direction")
	}
}

func TestWolfeLineSearchSphere(t *testing.T) {
	x := []float64{10, 10}
	fx := Sphere(x)
	gx := SphereGrad(x)
	d := Negate(gx)

	result := WolfeLineSearch(Sphere, SphereGrad, x, d, fx, gx, 1e-4, 0.9, 1e6, 25)

	if !result.Success {
		t.Error("Expected Wolfe line search to succeed")
	}
	if result.GNew == nil {
		t.Error("Expected gradient to be returned")
	}
	if len(result.GNew) != 2 {
		t.Errorf("Expected gradient length 2, got %d", len(result.GNew))
	}

	// Verify Armijo condition
	gxDotD := Dot(gx, d)
	if result.FNew > fx+1e-4*result.Alpha*gxDotD+1e-10 {
		t.Errorf("Armijo condition violated: fNew=%v, fx+c1*alpha*slope=%v", result.FNew, fx+1e-4*result.Alpha*gxDotD)
	}

	// Verify curvature condition
	gNewDotD := Dot(result.GNew, d)
	if math.Abs(gNewDotD) > -0.9*gxDotD+1e-10 {
		t.Errorf("Curvature condition violated: |gNew·d|=%v, c2*|gx·d|=%v", math.Abs(gNewDotD), -0.9*gxDotD)
	}
}

func TestWolfeLineSearchRosenbrock(t *testing.T) {
	x := []float64{-1.2, 1.0}
	fx := Rosenbrock(x)
	gx := RosenbrockGrad(x)
	d := Negate(gx)

	result := WolfeLineSearch(Rosenbrock, RosenbrockGrad, x, d, fx, gx, 1e-4, 0.9, 1e6, 25)

	if !result.Success {
		t.Error("Expected Wolfe line search to succeed")
	}
	if result.FNew >= fx {
		t.Errorf("Expected fNew < fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}
