package optimization

import "math"

// Dot computes the dot product of two vectors
func Dot(a, b []float64) float64 {
	sum := 0.0
	for i := range a {
		sum += a[i] * b[i]
	}
	return sum
}

// Norm computes the Euclidean (L2) norm of a vector
func Norm(v []float64) float64 {
	return math.Sqrt(Dot(v, v))
}

// NormInf computes the infinity norm (max absolute value) of a vector
func NormInf(v []float64) float64 {
	maxVal := 0.0
	for _, val := range v {
		absVal := math.Abs(val)
		if absVal > maxVal {
			maxVal = absVal
		}
	}
	return maxVal
}

// Scale returns a new vector scaled by scalar s
func Scale(v []float64, s float64) []float64 {
	result := make([]float64, len(v))
	for i, val := range v {
		result[i] = val * s
	}
	return result
}

// Add returns element-wise addition of two vectors
func Add(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + b[i]
	}
	return result
}

// Sub returns element-wise subtraction of two vectors (a - b)
func Sub(a, b []float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] - b[i]
	}
	return result
}

// Negate returns element-wise negation of a vector
func Negate(v []float64) []float64 {
	return Scale(v, -1.0)
}

// Clone returns a deep copy of a vector
func Clone(v []float64) []float64 {
	return append([]float64(nil), v...)
}

// Zeros returns a vector of n zeros
func Zeros(n int) []float64 {
	return make([]float64, n)
}

// AddScaled returns a + s*b (fused operation)
func AddScaled(a, b []float64, s float64) []float64 {
	result := make([]float64, len(a))
	for i := range a {
		result[i] = a[i] + s*b[i]
	}
	return result
}
