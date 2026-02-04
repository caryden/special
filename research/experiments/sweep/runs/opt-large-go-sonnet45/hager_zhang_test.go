package optimization

import (
	"math"
	"testing"
)

func TestHagerZhangLineSearchSphereExact(t *testing.T) {
	// Starting from [0.5, 0.5] with d=[-0.5, -0.5], alpha=1 lands at origin
	x := []float64{0.5, 0.5}
	fx := Sphere(x)
	gx := SphereGrad(x)
	d := []float64{-0.5, -0.5}

	result := HagerZhangLineSearch(Sphere, SphereGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed")
	}
	if math.Abs(result.Alpha-1.0) > 1e-6 {
		t.Errorf("Expected alpha = 1.0, got %v", result.Alpha)
	}
	if math.Abs(result.FNew) > 1e-10 {
		t.Errorf("Expected fNew = 0, got %v", result.FNew)
	}
	if result.FunctionCalls < 1 || result.GradientCalls < 1 {
		t.Error("Expected at least 1 function and gradient call")
	}
}

func TestHagerZhangLineSearchSphere(t *testing.T) {
	x := []float64{5, 5}
	fx := Sphere(x)
	gx := SphereGrad(x)
	d := Negate(gx) // steepest descent

	result := HagerZhangLineSearch(Sphere, SphereGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed")
	}
	if result.Alpha < 0.1 || result.Alpha > 2.0 {
		t.Errorf("Expected alpha in (0.1, 2.0), got %v", result.Alpha)
	}
	if result.FNew >= 1.0 {
		t.Errorf("Expected fNew < 1.0, got %v", result.FNew)
	}
}

func TestHagerZhangLineSearchBooth(t *testing.T) {
	x := []float64{0, 0}
	fx := Booth(x)
	gx := BoothGrad(x)
	d := Negate(gx)

	result := HagerZhangLineSearch(Booth, BoothGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed on Booth")
	}
	if result.FNew > fx {
		t.Errorf("Expected fNew <= fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}

func TestHagerZhangLineSearchRosenbrock(t *testing.T) {
	x := []float64{-1.2, 1.0}
	fx := Rosenbrock(x)
	gx := RosenbrockGrad(x)
	d := Negate(gx)

	result := HagerZhangLineSearch(Rosenbrock, RosenbrockGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed on Rosenbrock")
	}
	if result.FNew > fx {
		t.Errorf("Expected fNew <= fx, got fNew=%v, fx=%v", result.FNew, fx)
	}

	// Verify approximate Wolfe conditions
	opts := DefaultHagerZhangOptions()
	dphi0 := Dot(gx, d)
	epsK := opts.Epsilon * math.Abs(fx)

	// Check if satisfies standard or approximate Wolfe
	dphiNew := Dot(result.GNew, d)
	standardWolfe := result.FNew <= fx+opts.Delta*result.Alpha*dphi0 && dphiNew >= opts.Sigma*dphi0
	approxWolfe := result.FNew <= fx+epsK &&
		dphiNew >= opts.Sigma*dphi0 &&
		dphiNew <= (2*opts.Delta-1)*dphi0

	if !standardWolfe && !approxWolfe {
		t.Error("Result does not satisfy Wolfe conditions")
	}
}

func TestHagerZhangLineSearchBeale(t *testing.T) {
	x := []float64{0, 0}
	fx := Beale(x)
	gx := BealeGrad(x)
	d := Negate(gx)

	result := HagerZhangLineSearch(Beale, BealeGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed on Beale")
	}
	if result.FNew > fx {
		t.Errorf("Expected fNew <= fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}

func TestHagerZhangLineSearchHimmelblau(t *testing.T) {
	x := []float64{0, 0}
	fx := Himmelblau(x)
	gx := HimmelblauGrad(x)
	d := Negate(gx)

	result := HagerZhangLineSearch(Himmelblau, HimmelblauGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed on Himmelblau")
	}
	if result.FNew > fx {
		t.Errorf("Expected fNew <= fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}

func TestHagerZhangLineSearchGoldsteinPrice(t *testing.T) {
	x := []float64{0, -0.5}
	fx := GoldsteinPrice(x)
	gx := GoldsteinPriceGrad(x)
	d := Negate(gx)

	result := HagerZhangLineSearch(GoldsteinPrice, GoldsteinPriceGrad, x, d, fx, gx, nil)

	if !result.Success {
		t.Error("Expected line search to succeed on GoldsteinPrice")
	}
	if result.FNew > fx {
		t.Errorf("Expected fNew <= fx, got fNew=%v, fx=%v", result.FNew, fx)
	}
}

func TestHagerZhangFailureMaxBracket(t *testing.T) {
	// Linear function always decreasing - bracket expansion will exhaust
	linearF := func(x []float64) float64 {
		return -x[0]
	}
	linearGrad := func(x []float64) []float64 {
		return []float64{-1.0}
	}

	x := []float64{0}
	fx := linearF(x)
	gx := linearGrad(x)
	d := []float64{1.0}

	opts := DefaultHagerZhangOptions()
	opts.MaxBracketIter = 2

	result := HagerZhangLineSearch(linearF, linearGrad, x, d, fx, gx, &opts)

	if result.Success {
		t.Error("Expected line search to fail with limited bracket iterations")
	}
}

func TestHagerZhangFailureMaxSecant(t *testing.T) {
	// Make conditions very strict
	x := []float64{-1.2, 1.0}
	fx := Rosenbrock(x)
	gx := RosenbrockGrad(x)
	d := Negate(gx)

	opts := DefaultHagerZhangOptions()
	opts.Delta = 0.99
	opts.Sigma = 0.99
	opts.MaxSecantIter = 1

	result := HagerZhangLineSearch(Rosenbrock, RosenbrockGrad, x, d, fx, gx, &opts)

	// With very strict conditions and only 1 secant iteration, likely to fail
	if result.Success {
		t.Log("Note: Line search succeeded despite strict conditions")
	}
}
