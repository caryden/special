package optimization

import "math"

var fourthRootEps = math.Pow(2.220446049250313e-16, 0.25)

// FiniteDiffHessian computes the full Hessian matrix using central differences
func FiniteDiffHessian(f func([]float64) float64, x []float64) [][]float64 {
	n := len(x)
	H := make([][]float64, n)
	for i := range H {
		H[i] = make([]float64, n)
	}

	fx := f(x)
	h := make([]float64, n)
	for i := 0; i < n; i++ {
		h[i] = fourthRootEps * math.Max(math.Abs(x[i]), 1.0)
	}

	// Compute diagonal elements
	for i := 0; i < n; i++ {
		xPlus := Clone(x)
		xMinus := Clone(x)
		xPlus[i] += h[i]
		xMinus[i] -= h[i]

		fPlus := f(xPlus)
		fMinus := f(xMinus)

		H[i][i] = (fPlus - 2*fx + fMinus) / (h[i] * h[i])
	}

	// Compute off-diagonal elements (upper triangle)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			xPP := Clone(x)
			xPM := Clone(x)
			xMP := Clone(x)
			xMM := Clone(x)

			xPP[i] += h[i]
			xPP[j] += h[j]

			xPM[i] += h[i]
			xPM[j] -= h[j]

			xMP[i] -= h[i]
			xMP[j] += h[j]

			xMM[i] -= h[i]
			xMM[j] -= h[j]

			fPP := f(xPP)
			fPM := f(xPM)
			fMP := f(xMP)
			fMM := f(xMM)

			H[i][j] = (fPP - fPM - fMP + fMM) / (4 * h[i] * h[j])
			H[j][i] = H[i][j] // symmetry
		}
	}

	return H
}

// HessianVectorProduct computes H*v using finite differences of the gradient
func HessianVectorProduct(
	grad func([]float64) []float64,
	x, v []float64,
	gx []float64,
) []float64 {
	vNorm := Norm(v)
	h := fourthRootEps * math.Max(vNorm, 1.0)

	xPerturbed := AddScaled(x, v, h)
	gPerturbed := grad(xPerturbed)

	// (grad(x + h*v) - grad(x)) / h
	result := make([]float64, len(x))
	for i := range result {
		result[i] = (gPerturbed[i] - gx[i]) / h
	}

	return result
}
