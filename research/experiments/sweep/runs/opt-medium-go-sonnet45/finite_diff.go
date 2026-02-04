package optimization

import "math"

const eps = 2.220446049250313e-16 // machine epsilon

// ForwardDiffGradient approximates the gradient using forward differences.
func ForwardDiffGradient(f func([]float64) float64, x []float64) []float64 {
	n := len(x)
	grad := make([]float64, n)
	fx := f(x)

	for i := 0; i < n; i++ {
		h := math.Sqrt(eps) * math.Max(math.Abs(x[i]), 1.0)
		xPlusH := Clone(x)
		xPlusH[i] += h
		grad[i] = (f(xPlusH) - fx) / h
	}

	return grad
}

// CentralDiffGradient approximates the gradient using central differences.
func CentralDiffGradient(f func([]float64) float64, x []float64) []float64 {
	n := len(x)
	grad := make([]float64, n)

	for i := 0; i < n; i++ {
		h := math.Pow(eps, 1.0/3.0) * math.Max(math.Abs(x[i]), 1.0)
		xPlusH := Clone(x)
		xMinusH := Clone(x)
		xPlusH[i] += h
		xMinusH[i] -= h
		grad[i] = (f(xPlusH) - f(xMinusH)) / (2.0 * h)
	}

	return grad
}

// MakeGradient returns a gradient function using the specified method.
// If method is empty or "forward", uses forward differences.
// If method is "central", uses central differences.
func MakeGradient(f func([]float64) float64, method string) func([]float64) []float64 {
	if method == "central" {
		return func(x []float64) []float64 {
			return CentralDiffGradient(f, x)
		}
	}
	// Default to forward differences
	return func(x []float64) []float64 {
		return ForwardDiffGradient(f, x)
	}
}
