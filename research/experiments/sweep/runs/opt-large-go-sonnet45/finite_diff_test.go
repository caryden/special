package optimization

import (
	"math"
	"testing"
)

func TestForwardDiffGradientSphere(t *testing.T) {
	x := []float64{3, 4}
	grad := ForwardDiffGradient(Sphere, x)
	expected := SphereGrad(x) // [6, 8]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-7 {
			t.Errorf("ForwardDiffGradient(Sphere, [3,4])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}

	// Test at origin
	x = []float64{0, 0}
	grad = ForwardDiffGradient(Sphere, x)
	expected = SphereGrad(x) // [0, 0]
	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-7 {
			t.Errorf("ForwardDiffGradient(Sphere, [0,0])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestCentralDiffGradientSphere(t *testing.T) {
	x := []float64{3, 4}
	grad := CentralDiffGradient(Sphere, x)
	expected := SphereGrad(x) // [6, 8]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-10 {
			t.Errorf("CentralDiffGradient(Sphere, [3,4])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}

	// Test at origin
	x = []float64{0, 0}
	grad = CentralDiffGradient(Sphere, x)
	expected = SphereGrad(x) // [0, 0]
	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-10 {
			t.Errorf("CentralDiffGradient(Sphere, [0,0])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestForwardDiffGradientRosenbrock(t *testing.T) {
	x := []float64{-1.2, 1.0}
	grad := ForwardDiffGradient(Rosenbrock, x)
	expected := RosenbrockGrad(x) // [-215.6, -88]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-4 {
			t.Errorf("ForwardDiffGradient(Rosenbrock, [-1.2,1.0])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestCentralDiffGradientRosenbrock(t *testing.T) {
	x := []float64{-1.2, 1.0}
	grad := CentralDiffGradient(Rosenbrock, x)
	expected := RosenbrockGrad(x) // [-215.6, -88]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-7 {
			t.Errorf("CentralDiffGradient(Rosenbrock, [-1.2,1.0])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestForwardDiffGradientBeale(t *testing.T) {
	x := []float64{1, 1}
	grad := ForwardDiffGradient(Beale, x)
	expected := BealeGrad(x) // [-1.5, 5.25]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-5 {
			t.Errorf("ForwardDiffGradient(Beale, [1,1])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestCentralDiffGradientBeale(t *testing.T) {
	x := []float64{1, 1}
	grad := CentralDiffGradient(Beale, x)
	expected := BealeGrad(x) // [-1.5, 5.25]

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-8 {
			t.Errorf("CentralDiffGradient(Beale, [1,1])[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}

func TestMakeGradient(t *testing.T) {
	// Test forward (default)
	gradFunc := MakeGradient(Sphere, "forward")
	x := []float64{3, 4}
	grad := gradFunc(x)
	expected := SphereGrad(x)

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-7 {
			t.Errorf("MakeGradient(forward)[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}

	// Test central
	gradFunc = MakeGradient(Sphere, "central")
	grad = gradFunc(x)

	for i := range grad {
		if math.Abs(grad[i]-expected[i]) > 1e-10 {
			t.Errorf("MakeGradient(central)[%d] = %v, want %v", i, grad[i], expected[i])
		}
	}
}
