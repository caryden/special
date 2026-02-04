package optimization

import (
	"math"
	"testing"
)

// Test functions with known analytic gradients

func beale(x []float64) float64 {
	a := 1.5 - x[0] + x[0]*x[1]
	b := 2.25 - x[0] + x[0]*x[1]*x[1]
	c := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]
	return a*a + b*b + c*c
}

func bealeGrad(x []float64) []float64 {
	a := 1.5 - x[0] + x[0]*x[1]
	b := 2.25 - x[0] + x[0]*x[1]*x[1]
	c := 2.625 - x[0] + x[0]*x[1]*x[1]*x[1]

	dfdx0 := 2*a*(-1+x[1]) + 2*b*(-1+x[1]*x[1]) + 2*c*(-1+x[1]*x[1]*x[1])
	dfdx1 := 2*a*x[0] + 2*b*x[0]*2*x[1] + 2*c*x[0]*3*x[1]*x[1]

	return []float64{dfdx0, dfdx1}
}

func TestForwardDiffGradient(t *testing.T) {
	tests := []struct {
		name      string
		f         func([]float64) float64
		analyticG func([]float64) []float64
		x         []float64
		tol       float64
	}{
		{
			name:      "sphere at [3,4]",
			f:         sphere,
			analyticG: sphereGrad,
			x:         []float64{3, 4},
			tol:       1e-7,
		},
		{
			name:      "sphere at origin",
			f:         sphere,
			analyticG: sphereGrad,
			x:         []float64{0, 0},
			tol:       1e-7,
		},
		{
			name:      "rosenbrock at [-1.2,1]",
			f:         rosenbrock,
			analyticG: rosenbrockGrad,
			x:         []float64{-1.2, 1.0},
			tol:       1e-4,
		},
		{
			name:      "beale at [1,1]",
			f:         beale,
			analyticG: bealeGrad,
			x:         []float64{1, 1},
			tol:       1e-5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			numericGrad := ForwardDiffGradient(tt.f, tt.x)
			analyticGrad := tt.analyticG(tt.x)

			for i := range numericGrad {
				diff := math.Abs(numericGrad[i] - analyticGrad[i])
				if diff > tt.tol {
					t.Errorf("Component %d: numeric=%v, analytic=%v, diff=%v > tol=%v",
						i, numericGrad[i], analyticGrad[i], diff, tt.tol)
				}
			}
		})
	}
}

func TestCentralDiffGradient(t *testing.T) {
	tests := []struct {
		name      string
		f         func([]float64) float64
		analyticG func([]float64) []float64
		x         []float64
		tol       float64
	}{
		{
			name:      "sphere at [3,4]",
			f:         sphere,
			analyticG: sphereGrad,
			x:         []float64{3, 4},
			tol:       1e-10,
		},
		{
			name:      "sphere at origin",
			f:         sphere,
			analyticG: sphereGrad,
			x:         []float64{0, 0},
			tol:       1e-10,
		},
		{
			name:      "rosenbrock at [-1.2,1]",
			f:         rosenbrock,
			analyticG: rosenbrockGrad,
			x:         []float64{-1.2, 1.0},
			tol:       1e-7,
		},
		{
			name:      "beale at [1,1]",
			f:         beale,
			analyticG: bealeGrad,
			x:         []float64{1, 1},
			tol:       1e-8,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			numericGrad := CentralDiffGradient(tt.f, tt.x)
			analyticGrad := tt.analyticG(tt.x)

			for i := range numericGrad {
				diff := math.Abs(numericGrad[i] - analyticGrad[i])
				if diff > tt.tol {
					t.Errorf("Component %d: numeric=%v, analytic=%v, diff=%v > tol=%v",
						i, numericGrad[i], analyticGrad[i], diff, tt.tol)
				}
			}
		})
	}
}

func TestMakeGradient(t *testing.T) {
	x := []float64{3, 4}

	t.Run("default to forward", func(t *testing.T) {
		gradFunc := MakeGradient(sphere, "")
		numericGrad := gradFunc(x)
		forwardGrad := ForwardDiffGradient(sphere, x)

		if !vecEqual(numericGrad, forwardGrad) {
			t.Errorf("MakeGradient with empty method should use forward differences")
		}
	})

	t.Run("explicit forward", func(t *testing.T) {
		gradFunc := MakeGradient(sphere, "forward")
		numericGrad := gradFunc(x)
		forwardGrad := ForwardDiffGradient(sphere, x)

		if !vecEqual(numericGrad, forwardGrad) {
			t.Errorf("MakeGradient with 'forward' method should use forward differences")
		}
	})

	t.Run("central", func(t *testing.T) {
		gradFunc := MakeGradient(sphere, "central")
		numericGrad := gradFunc(x)
		centralGrad := CentralDiffGradient(sphere, x)

		if !vecEqual(numericGrad, centralGrad) {
			t.Errorf("MakeGradient with 'central' method should use central differences")
		}
	})
}

func TestFiniteDiffImmutability(t *testing.T) {
	x := []float64{3, 4}
	xCopy := Clone(x)

	ForwardDiffGradient(sphere, x)
	if !vecEqual(x, xCopy) {
		t.Errorf("ForwardDiffGradient modified input vector")
	}

	CentralDiffGradient(sphere, x)
	if !vecEqual(x, xCopy) {
		t.Errorf("CentralDiffGradient modified input vector")
	}
}
