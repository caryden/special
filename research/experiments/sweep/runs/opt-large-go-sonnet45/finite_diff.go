package optimization

import "math"

const machineEpsilon = 2.220446049250313e-16

// ForwardDiffGradient computes the gradient using forward differences
func ForwardDiffGradient(f func([]float64) float64, x []float64) []float64 {
	n := len(x)
	grad := make([]float64, n)
	fx := f(x)
	xPerturb := Clone(x)

	sqrtEps := math.Sqrt(machineEpsilon)

	for i := 0; i < n; i++ {
		h := sqrtEps * math.Max(math.Abs(x[i]), 1.0)
		xPerturb[i] = x[i] + h
		fxPlusH := f(xPerturb)
		grad[i] = (fxPlusH - fx) / h
		xPerturb[i] = x[i] // restore
	}

	return grad
}

// CentralDiffGradient computes the gradient using central differences
func CentralDiffGradient(f func([]float64) float64, x []float64) []float64 {
	n := len(x)
	grad := make([]float64, n)
	xPerturb := Clone(x)

	cbrtEps := math.Pow(machineEpsilon, 1.0/3.0)

	for i := 0; i < n; i++ {
		h := cbrtEps * math.Max(math.Abs(x[i]), 1.0)
		xPerturb[i] = x[i] + h
		fxPlusH := f(xPerturb)
		xPerturb[i] = x[i] - h
		fxMinusH := f(xPerturb)
		grad[i] = (fxPlusH - fxMinusH) / (2.0 * h)
		xPerturb[i] = x[i] // restore
	}

	return grad
}

// MakeGradient returns a gradient function using the specified method
func MakeGradient(f func([]float64) float64, method string) func([]float64) []float64 {
	if method == "central" {
		return func(x []float64) []float64 {
			return CentralDiffGradient(f, x)
		}
	}
	// Default to forward
	return func(x []float64) []float64 {
		return ForwardDiffGradient(f, x)
	}
}
