package optimization

import (
	"math"
	"testing"
)

func TestFiniteDiffHessianSphere(t *testing.T) {
	// Sphere: H = 2*I everywhere
	x := []float64{0, 0}
	H := FiniteDiffHessian(Sphere, x)

	// Expected: [[2, 0], [0, 2]]
	if math.Abs(H[0][0]-2.0) > 1e-5 {
		t.Errorf("H[0][0] = %v, want 2.0", H[0][0])
	}
	if math.Abs(H[1][1]-2.0) > 1e-5 {
		t.Errorf("H[1][1] = %v, want 2.0", H[1][1])
	}
	if math.Abs(H[0][1]) > 1e-5 {
		t.Errorf("H[0][1] = %v, want 0.0", H[0][1])
	}
	if math.Abs(H[1][0]) > 1e-5 {
		t.Errorf("H[1][0] = %v, want 0.0", H[1][0])
	}

	// Test at different point
	x = []float64{5, 3}
	H = FiniteDiffHessian(Sphere, x)
	if math.Abs(H[0][0]-2.0) > 1e-5 {
		t.Errorf("H[0][0] at [5,3] = %v, want 2.0", H[0][0])
	}
	if math.Abs(H[1][1]-2.0) > 1e-5 {
		t.Errorf("H[1][1] at [5,3] = %v, want 2.0", H[1][1])
	}
}

func TestFiniteDiffHessianBooth(t *testing.T) {
	// Booth: H = [[10, 8], [8, 10]] (constant)
	x := []float64{0, 0}
	H := FiniteDiffHessian(Booth, x)

	if math.Abs(H[0][0]-10.0) > 1e-4 {
		t.Errorf("H[0][0] = %v, want 10.0", H[0][0])
	}
	if math.Abs(H[0][1]-8.0) > 1e-4 {
		t.Errorf("H[0][1] = %v, want 8.0", H[0][1])
	}
	if math.Abs(H[1][0]-8.0) > 1e-4 {
		t.Errorf("H[1][0] = %v, want 8.0", H[1][0])
	}
	if math.Abs(H[1][1]-10.0) > 1e-4 {
		t.Errorf("H[1][1] = %v, want 10.0", H[1][1])
	}

	// Test at different point (should be same for quadratic)
	x = []float64{1, 3}
	H = FiniteDiffHessian(Booth, x)
	if math.Abs(H[0][0]-10.0) > 1e-4 {
		t.Errorf("H[0][0] at [1,3] = %v, want 10.0", H[0][0])
	}
}

func TestFiniteDiffHessianRosenbrock(t *testing.T) {
	// Rosenbrock at minimum [1, 1]: H = [[802, -400], [-400, 200]]
	x := []float64{1, 1}
	H := FiniteDiffHessian(Rosenbrock, x)

	if math.Abs(H[0][0]-802.0) > 5 {
		t.Errorf("H[0][0] at [1,1] = %v, want 802.0", H[0][0])
	}
	if math.Abs(H[0][1]+400.0) > 5 {
		t.Errorf("H[0][1] at [1,1] = %v, want -400.0", H[0][1])
	}
	if math.Abs(H[1][0]+400.0) > 5 {
		t.Errorf("H[1][0] at [1,1] = %v, want -400.0", H[1][0])
	}
	if math.Abs(H[1][1]-200.0) > 5 {
		t.Errorf("H[1][1] at [1,1] = %v, want 200.0", H[1][1])
	}

	// Rosenbrock at [-1.2, 1.0]: H = [[1330, 480], [480, 200]]
	x = []float64{-1.2, 1.0}
	H = FiniteDiffHessian(Rosenbrock, x)

	if math.Abs(H[0][0]-1330.0) > 10 {
		t.Errorf("H[0][0] at [-1.2,1.0] = %v, want 1330.0", H[0][0])
	}
	if math.Abs(H[0][1]-480.0) > 10 {
		t.Errorf("H[0][1] at [-1.2,1.0] = %v, want 480.0", H[0][1])
	}
	if math.Abs(H[1][1]-200.0) > 5 {
		t.Errorf("H[1][1] at [-1.2,1.0] = %v, want 200.0", H[1][1])
	}
}

func TestHessianVectorProductSphere(t *testing.T) {
	// Sphere: H*v = 2*v for any v
	x := []float64{5, 3}
	gx := SphereGrad(x)
	v := []float64{1, 2}

	Hv := HessianVectorProduct(SphereGrad, x, v, gx)

	expected := []float64{2, 4}
	for i := range Hv {
		if math.Abs(Hv[i]-expected[i]) > 1e-5 {
			t.Errorf("H*v[%d] = %v, want %v", i, Hv[i], expected[i])
		}
	}
}

func TestHessianVectorProductBooth(t *testing.T) {
	// Booth: H = [[10, 8], [8, 10]]
	x := []float64{0, 0}
	gx := BoothGrad(x)

	// H*[1, 0] = [10, 8]
	v := []float64{1, 0}
	Hv := HessianVectorProduct(BoothGrad, x, v, gx)
	if math.Abs(Hv[0]-10.0) > 1e-4 {
		t.Errorf("H*[1,0][0] = %v, want 10.0", Hv[0])
	}
	if math.Abs(Hv[1]-8.0) > 1e-4 {
		t.Errorf("H*[1,0][1] = %v, want 8.0", Hv[1])
	}

	// H*[1, 1] = [18, 18]
	v = []float64{1, 1}
	Hv = HessianVectorProduct(BoothGrad, x, v, gx)
	if math.Abs(Hv[0]-18.0) > 1e-4 {
		t.Errorf("H*[1,1][0] = %v, want 18.0", Hv[0])
	}
	if math.Abs(Hv[1]-18.0) > 1e-4 {
		t.Errorf("H*[1,1][1] = %v, want 18.0", Hv[1])
	}
}

func TestHessianVectorProductRosenbrock(t *testing.T) {
	// Rosenbrock at [1, 1]: H*[1, 1] = [402, -200]
	x := []float64{1, 1}
	gx := RosenbrockGrad(x)
	v := []float64{1, 1}

	Hv := HessianVectorProduct(RosenbrockGrad, x, v, gx)

	if math.Abs(Hv[0]-402.0) > 5 {
		t.Errorf("H*[1,1][0] = %v, want 402.0", Hv[0])
	}
	if math.Abs(Hv[1]+200.0) > 5 {
		t.Errorf("H*[1,1][1] = %v, want -200.0", Hv[1])
	}
}
