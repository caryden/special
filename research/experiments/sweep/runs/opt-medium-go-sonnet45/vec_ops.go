package optimization

import "math"

// Dot computes the dot product of two vectors.
func Dot(a, b []float64) float64 {
	sum := 0.0
	for i := range a {
		sum += a[i] * b[i]
	}
	return sum
}

// Norm computes the Euclidean (L2) norm of a vector.
func Norm(v []float64) float64 {
	return math.Sqrt(Dot(v, v))
}

// NormInf computes the infinity norm (max absolute value) of a vector.
func NormInf(v []float64) float64 {
	maxAbs := 0.0
	for _, val := range v {
		abs := math.Abs(val)
		if abs > maxAbs {
			maxAbs = abs
		}
	}
	return maxAbs
}

// Scale multiplies a vector by a scalar, returning a new vector.
func Scale(v []float64, s float64) []float64 {
	result := make([]float64, len(v))
	for i, val := range v {
		result[i] = val * s
	}
	return result
}

// Add performs element-wise addition of two vectors, returning a new vector.
func Add(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + b[i]
	}
	return result
}

// Sub performs element-wise subtraction of two vectors, returning a new vector.
func Sub(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] - b[i]
	}
	return result
}

// Negate negates all elements of a vector, returning a new vector.
func Negate(v []float64) []float64 {
	return Scale(v, -1)
}

// Clone creates a deep copy of a vector.
func Clone(v []float64) []float64 {
	return append([]float64(nil), v...)
}

// Zeros creates a vector of n zeros.
func Zeros(n int) []float64 {
	return make([]float64, n)
}

// AddScaled computes a + s*b, returning a new vector.
// This fused operation avoids intermediate allocation.
func AddScaled(a, b []float64, s float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + s*b[i]
	}
	return result
}
