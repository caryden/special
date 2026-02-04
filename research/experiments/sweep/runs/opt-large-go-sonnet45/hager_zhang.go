package optimization

import "math"

// HagerZhangOptions contains parameters for the Hager-Zhang line search
type HagerZhangOptions struct {
	Delta           float64
	Sigma           float64
	Epsilon         float64
	Theta           float64
	Gamma           float64
	Rho             float64
	MaxBracketIter  int
	MaxSecantIter   int
}

// DefaultHagerZhangOptions returns default options
func DefaultHagerZhangOptions() HagerZhangOptions {
	return HagerZhangOptions{
		Delta:          0.1,
		Sigma:          0.9,
		Epsilon:        1e-6,
		Theta:          0.5,
		Gamma:          0.66,
		Rho:            5.0,
		MaxBracketIter: 50,
		MaxSecantIter:  50,
	}
}

// HagerZhangLineSearch implements the Hager-Zhang line search with approximate Wolfe conditions
func HagerZhangLineSearch(
	f func([]float64) float64,
	grad func([]float64) []float64,
	x, d []float64,
	fx float64,
	gx []float64,
	opts *HagerZhangOptions,
) LineSearchResult {
	// Use defaults if not provided
	var options HagerZhangOptions
	if opts == nil {
		options = DefaultHagerZhangOptions()
	} else {
		options = *opts
		// Fill in zero values with defaults
		defaults := DefaultHagerZhangOptions()
		if options.Delta == 0 {
			options.Delta = defaults.Delta
		}
		if options.Sigma == 0 {
			options.Sigma = defaults.Sigma
		}
		if options.Epsilon == 0 {
			options.Epsilon = defaults.Epsilon
		}
		if options.Theta == 0 {
			options.Theta = defaults.Theta
		}
		if options.Gamma == 0 {
			options.Gamma = defaults.Gamma
		}
		if options.Rho == 0 {
			options.Rho = defaults.Rho
		}
		if options.MaxBracketIter == 0 {
			options.MaxBracketIter = defaults.MaxBracketIter
		}
		if options.MaxSecantIter == 0 {
			options.MaxSecantIter = defaults.MaxSecantIter
		}
	}

	functionCalls := 0
	gradientCalls := 0

	phi0 := fx
	dphi0 := Dot(gx, d)
	epsK := options.Epsilon * math.Abs(phi0)

	// Helper to evaluate phi and dphi
	evalPhi := func(alpha float64) (float64, []float64, float64) {
		xNew := AddScaled(x, d, alpha)
		phiVal := f(xNew)
		functionCalls++
		gNew := grad(xNew)
		gradientCalls++
		dphiVal := Dot(gNew, d)
		return phiVal, gNew, dphiVal
	}

	// Check approximate Wolfe conditions
	satisfiesApproxWolfe := func(phi, dphi float64) bool {
		// Standard Wolfe
		standardWolfe := phi <= phi0+options.Delta*dphi0 && dphi >= options.Sigma*dphi0
		// Approximate Wolfe
		approxWolfe := phi <= phi0+epsK &&
			dphi >= options.Sigma*dphi0 &&
			dphi <= (2*options.Delta-1)*dphi0
		return standardWolfe || approxWolfe
	}

	// Phase 1: Bracket
	c := 1.0
	var phiC, dphiC float64
	var gNewC []float64

	for i := 0; i < options.MaxBracketIter; i++ {
		phiC, gNewC, dphiC = evalPhi(c)

		if satisfiesApproxWolfe(phiC, dphiC) {
			return LineSearchResult{
				Alpha:         c,
				FNew:          phiC,
				GNew:          gNewC,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Success:       true,
			}
		}

		// Check if we found a bracket
		if phiC > phi0+epsK || dphiC >= 0 {
			// Bracket is [0, c], proceed to secant phase
			break
		}

		// Expand
		c *= options.Rho
	}

	// Phase 2: Secant/Bisect
	aj := 0.0
	bj := c
	dphiA := dphi0
	dphiB := dphiC

	widthPrev := bj - aj

	for j := 0; j < options.MaxSecantIter; j++ {
		// Try secant interpolation
		var cj float64
		denom := dphiB - dphiA
		if math.Abs(denom) > 1e-30 {
			cj = aj - dphiA*(bj-aj)/denom
		} else {
			// Denominator too small, use bisection
			cj = aj + options.Theta*(bj-aj)
		}

		// Clamp to interior of bracket with small margin
		margin := 1e-10 * (bj - aj)
		cj = math.Max(aj+margin, math.Min(cj, bj-margin))

		var phiCj, dphiCj float64
		var gNewCj []float64
		phiCj, gNewCj, dphiCj = evalPhi(cj)

		if satisfiesApproxWolfe(phiCj, dphiCj) {
			return LineSearchResult{
				Alpha:         cj,
				FNew:          phiCj,
				GNew:          gNewCj,
				FunctionCalls: functionCalls,
				GradientCalls: gradientCalls,
				Success:       true,
			}
		}

		// Update bracket
		if phiCj > phi0+epsK || dphiCj >= 0 {
			bj = cj
			dphiB = dphiCj
		} else {
			aj = cj
			dphiA = dphiCj
		}

		// Check if bracket shrank enough
		widthNew := bj - aj
		if widthNew > options.Gamma*widthPrev {
			// Didn't shrink enough, force bisection
			cj = aj + options.Theta*(bj-aj)
			phiCj, gNewCj, dphiCj = evalPhi(cj)

			if satisfiesApproxWolfe(phiCj, dphiCj) {
				return LineSearchResult{
					Alpha:         cj,
					FNew:          phiCj,
					GNew:          gNewCj,
					FunctionCalls: functionCalls,
					GradientCalls: gradientCalls,
					Success:       true,
				}
			}

			// Update bracket after bisection
			if phiCj > phi0+epsK || dphiCj >= 0 {
				bj = cj
				dphiB = dphiCj
			} else {
				aj = cj
				dphiA = dphiCj
			}
		}

		widthPrev = widthNew
	}

	// Failed to find acceptable step - return midpoint with last evaluated phi
	midpoint := (aj + bj) / 2.0
	xMid := AddScaled(x, d, midpoint)
	fMid := f(xMid)
	functionCalls++

	return LineSearchResult{
		Alpha:         midpoint,
		FNew:          fMid,
		GNew:          nil,
		FunctionCalls: functionCalls,
		GradientCalls: gradientCalls,
		Success:       false,
	}
}
