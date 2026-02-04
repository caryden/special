package optimization

import (
	"math"
	"testing"
)

func TestDot(t *testing.T) {
	tests := []struct {
		name string
		a, b []float64
		want float64
	}{
		{"basic", []float64{1, 2, 3}, []float64{4, 5, 6}, 32},
		{"zeros", []float64{0, 0}, []float64{1, 1}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Dot(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("Dot(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestNorm(t *testing.T) {
	tests := []struct {
		name string
		v    []float64
		want float64
	}{
		{"3-4 triangle", []float64{3, 4}, 5},
		{"zeros", []float64{0, 0, 0}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Norm(tt.v)
			if math.Abs(got-tt.want) > 1e-10 {
				t.Errorf("Norm(%v) = %v, want %v", tt.v, got, tt.want)
			}
		})
	}
}

func TestNormInf(t *testing.T) {
	tests := []struct {
		name string
		v    []float64
		want float64
	}{
		{"mixed signs", []float64{1, -3, 2}, 3},
		{"zeros", []float64{0, 0}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormInf(tt.v)
			if got != tt.want {
				t.Errorf("NormInf(%v) = %v, want %v", tt.v, got, tt.want)
			}
		})
	}
}

func TestScale(t *testing.T) {
	tests := []struct {
		name string
		v    []float64
		s    float64
		want []float64
	}{
		{"basic", []float64{1, 2}, 3, []float64{3, 6}},
		{"zero scalar", []float64{1, 2}, 0, []float64{0, 0}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Scale(tt.v, tt.s)
			if !vecEqual(got, tt.want) {
				t.Errorf("Scale(%v, %v) = %v, want %v", tt.v, tt.s, got, tt.want)
			}
			// Check immutability
			if &got[0] == &tt.v[0] {
				t.Errorf("Scale modified input vector")
			}
		})
	}
}

func TestAdd(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}
	want := []float64{4, 6}

	got := Add(a, b)
	if !vecEqual(got, want) {
		t.Errorf("Add(%v, %v) = %v, want %v", a, b, got, want)
	}

	// Check immutability
	if a[0] != 1 || b[0] != 3 {
		t.Errorf("Add modified input vectors")
	}
}

func TestSub(t *testing.T) {
	a := []float64{3, 4}
	b := []float64{1, 2}
	want := []float64{2, 2}

	got := Sub(a, b)
	if !vecEqual(got, want) {
		t.Errorf("Sub(%v, %v) = %v, want %v", a, b, got, want)
	}
}

func TestNegate(t *testing.T) {
	v := []float64{1, -2}
	want := []float64{-1, 2}

	got := Negate(v)
	if !vecEqual(got, want) {
		t.Errorf("Negate(%v) = %v, want %v", v, got, want)
	}
}

func TestClone(t *testing.T) {
	original := []float64{1, 2}
	cloned := Clone(original)

	if !vecEqual(cloned, original) {
		t.Errorf("Clone(%v) = %v, want %v", original, cloned, original)
	}

	// Verify it's a distinct array
	cloned[0] = 999
	if original[0] == 999 {
		t.Errorf("Clone did not create a distinct array")
	}
}

func TestZeros(t *testing.T) {
	got := Zeros(3)
	want := []float64{0, 0, 0}

	if !vecEqual(got, want) {
		t.Errorf("Zeros(3) = %v, want %v", got, want)
	}
}

func TestAddScaled(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}
	s := 2.0
	want := []float64{7, 10}

	got := AddScaled(a, b, s)
	if !vecEqual(got, want) {
		t.Errorf("AddScaled(%v, %v, %v) = %v, want %v", a, b, s, got, want)
	}
}

// Helper function to compare vectors with tolerance
func vecEqual(a, b []float64) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if math.Abs(a[i]-b[i]) > 1e-10 {
			return false
		}
	}
	return true
}
