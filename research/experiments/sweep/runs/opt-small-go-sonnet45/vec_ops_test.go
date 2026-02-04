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
		{"3-4-5 triangle", []float64{3, 4}, 5},
		{"zeros", []float64{0, 0, 0}, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Norm(tt.v)
			if got != tt.want {
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
		{"mixed", []float64{1, -3, 2}, 3},
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
			if !slicesEqual(got, tt.want) {
				t.Errorf("Scale(%v, %v) = %v, want %v", tt.v, tt.s, got, tt.want)
			}
		})
	}
}

func TestAdd(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}
	want := []float64{4, 6}

	got := Add(a, b)
	if !slicesEqual(got, want) {
		t.Errorf("Add(%v, %v) = %v, want %v", a, b, got, want)
	}

	// Purity check
	if a[0] != 1 || a[1] != 2 {
		t.Errorf("Add modified input a: got %v", a)
	}
	if b[0] != 3 || b[1] != 4 {
		t.Errorf("Add modified input b: got %v", b)
	}
}

func TestSub(t *testing.T) {
	a := []float64{3, 4}
	b := []float64{1, 2}
	want := []float64{2, 2}

	got := Sub(a, b)
	if !slicesEqual(got, want) {
		t.Errorf("Sub(%v, %v) = %v, want %v", a, b, got, want)
	}
}

func TestNegate(t *testing.T) {
	v := []float64{1, -2}
	want := []float64{-1, 2}

	got := Negate(v)
	if !slicesEqual(got, want) {
		t.Errorf("Negate(%v) = %v, want %v", v, got, want)
	}
}

func TestClone(t *testing.T) {
	v := []float64{1, 2}
	want := []float64{1, 2}

	got := Clone(v)
	if !slicesEqual(got, want) {
		t.Errorf("Clone(%v) = %v, want %v", v, got, want)
	}

	// Purity check: modifying clone shouldn't affect original
	got[0] = 99
	if v[0] != 1 {
		t.Errorf("Clone did not create independent copy: original modified to %v", v)
	}
}

func TestZeros(t *testing.T) {
	want := []float64{0, 0, 0}
	got := Zeros(3)
	if !slicesEqual(got, want) {
		t.Errorf("Zeros(3) = %v, want %v", got, want)
	}
}

func TestAddScaled(t *testing.T) {
	a := []float64{1, 2}
	b := []float64{3, 4}
	s := 2.0
	want := []float64{7, 10}

	got := AddScaled(a, b, s)
	if !slicesEqual(got, want) {
		t.Errorf("AddScaled(%v, %v, %v) = %v, want %v", a, b, s, got, want)
	}
}

func TestScalePurity(t *testing.T) {
	v := []float64{1, 2}
	original := []float64{1, 2}

	_ = Scale(v, 3)
	if !slicesEqual(v, original) {
		t.Errorf("Scale modified input: got %v, want %v", v, original)
	}
}

// Helper function
func slicesEqual(a, b []float64) bool {
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
