package optimization

import (
	"math"
	"testing"
)

func TestDot(t *testing.T) {
	if result := Dot([]float64{1, 2, 3}, []float64{4, 5, 6}); result != 32 {
		t.Errorf("Dot([1,2,3], [4,5,6]) = %v, want 32", result)
	}
	if result := Dot([]float64{0, 0}, []float64{1, 1}); result != 0 {
		t.Errorf("Dot([0,0], [1,1]) = %v, want 0", result)
	}
}

func TestNorm(t *testing.T) {
	if result := Norm([]float64{3, 4}); result != 5 {
		t.Errorf("Norm([3,4]) = %v, want 5", result)
	}
	if result := Norm([]float64{0, 0, 0}); result != 0 {
		t.Errorf("Norm([0,0,0]) = %v, want 0", result)
	}
}

func TestNormInf(t *testing.T) {
	if result := NormInf([]float64{1, -3, 2}); result != 3 {
		t.Errorf("NormInf([1,-3,2]) = %v, want 3", result)
	}
	if result := NormInf([]float64{0, 0}); result != 0 {
		t.Errorf("NormInf([0,0]) = %v, want 0", result)
	}
}

func TestScale(t *testing.T) {
	result := Scale([]float64{1, 2}, 3)
	if result[0] != 3 || result[1] != 6 {
		t.Errorf("Scale([1,2], 3) = %v, want [3,6]", result)
	}
	result = Scale([]float64{1, 2}, 0)
	if result[0] != 0 || result[1] != 0 {
		t.Errorf("Scale([1,2], 0) = %v, want [0,0]", result)
	}
}

func TestAdd(t *testing.T) {
	result := Add([]float64{1, 2}, []float64{3, 4})
	if result[0] != 4 || result[1] != 6 {
		t.Errorf("Add([1,2], [3,4]) = %v, want [4,6]", result)
	}
}

func TestSub(t *testing.T) {
	result := Sub([]float64{3, 4}, []float64{1, 2})
	if result[0] != 2 || result[1] != 2 {
		t.Errorf("Sub([3,4], [1,2]) = %v, want [2,2]", result)
	}
}

func TestNegate(t *testing.T) {
	result := Negate([]float64{1, -2})
	if result[0] != -1 || result[1] != 2 {
		t.Errorf("Negate([1,-2]) = %v, want [-1,2]", result)
	}
}

func TestClone(t *testing.T) {
	original := []float64{1, 2}
	cloned := Clone(original)
	if cloned[0] != 1 || cloned[1] != 2 {
		t.Errorf("Clone([1,2]) = %v, want [1,2]", cloned)
	}
	// Test that it's a distinct array
	cloned[0] = 99
	if original[0] != 1 {
		t.Errorf("Clone modified original array")
	}
}

func TestZeros(t *testing.T) {
	result := Zeros(3)
	if len(result) != 3 || result[0] != 0 || result[1] != 0 || result[2] != 0 {
		t.Errorf("Zeros(3) = %v, want [0,0,0]", result)
	}
}

func TestAddScaled(t *testing.T) {
	result := AddScaled([]float64{1, 2}, []float64{3, 4}, 2)
	if result[0] != 7 || result[1] != 10 {
		t.Errorf("AddScaled([1,2], [3,4], 2) = %v, want [7,10]", result)
	}
}

func TestPurity(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}

	// Test Add doesn't modify inputs
	Add(a, b)
	if a[0] != 1 || a[1] != 2 {
		t.Errorf("Add modified first argument")
	}
	if b[0] != 3 || b[1] != 4 {
		t.Errorf("Add modified second argument")
	}

	// Test Scale doesn't modify input
	v := []float64{1, 2}
	Scale(v, 3)
	if v[0] != 1 || v[1] != 2 {
		t.Errorf("Scale modified input")
	}
}

func almostEqual(a, b, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}
