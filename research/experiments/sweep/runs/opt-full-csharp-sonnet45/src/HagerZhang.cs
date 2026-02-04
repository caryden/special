namespace Optimization;

public class HagerZhangOptions
{
    public double Delta { get; set; } = 0.1;
    public double Sigma { get; set; } = 0.9;
    public double Epsilon { get; set; } = 1e-6;
    public double Theta { get; set; } = 0.5;
    public double Gamma { get; set; } = 0.66;
    public double Rho { get; set; } = 5.0;
    public int MaxBracketIter { get; set; } = 50;
    public int MaxSecantIter { get; set; } = 50;
}

public static class HagerZhang
{
    public static LineSearchResult Search(
        Func<double[], double> f, Func<double[], double[]> grad,
        double[] x, double[] d, double fx, double[] gx,
        HagerZhangOptions? options = null)
    {
        double delta = options?.Delta ?? 0.1;
        double sigma = options?.Sigma ?? 0.9;
        double epsilon = options?.Epsilon ?? 1e-6;
        double theta = options?.Theta ?? 0.5;
        double gamma = options?.Gamma ?? 0.66;
        double rho = options?.Rho ?? 5.0;
        int maxBracketIter = options?.MaxBracketIter ?? 50;
        int maxSecantIter = options?.MaxSecantIter ?? 50;

        int functionCalls = 0;
        int gradientCalls = 0;
        double phi0 = fx;
        double dphi0 = VecOps.Dot(gx, d);
        double epsK = epsilon * Math.Abs(phi0);

        double EvalPhi(double alpha)
        {
            functionCalls++;
            return f(VecOps.AddScaled(x, d, alpha));
        }

        (double val, double[] gNew) EvalDphi(double alpha)
        {
            gradientCalls++;
            double[] gNew = grad(VecOps.AddScaled(x, d, alpha));
            return (VecOps.Dot(gNew, d), gNew);
        }

        bool SatisfiesConditions(double alpha, double phiA, double dphiA)
        {
            bool curvature = dphiA >= sigma * dphi0;
            if (!curvature) return false;
            if (phiA <= phi0 + delta * alpha * dphi0) return true;
            return phiA <= phi0 + epsK && dphiA <= (2 * delta - 1) * dphi0;
        }

        // Bracket phase
        double c = 1.0;
        double phiC = EvalPhi(c);
        var (dphiC, gNewC) = EvalDphi(c);

        if (SatisfiesConditions(c, phiC, dphiC))
        {
            return new LineSearchResult
            {
                Alpha = c, FNew = phiC, GNew = gNewC,
                FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
            };
        }

        double aj, bj, phiAj, phiBj, dphiAj, dphiBj;
        bool bracketFound = true;

        if (phiC > phi0 + epsK || dphiC >= 0)
        {
            aj = 0; bj = c;
            phiAj = phi0; phiBj = phiC;
            dphiAj = dphi0; dphiBj = dphiC;
        }
        else
        {
            aj = 0; bj = c;
            phiAj = phi0; phiBj = phiC;
            dphiAj = dphi0; dphiBj = dphiC;
            bracketFound = false;

            double cPrev = 0, phiPrev = phi0, dphiPrev = dphi0;

            for (int i = 0; i < maxBracketIter; i++)
            {
                cPrev = c; phiPrev = phiC; dphiPrev = dphiC;
                c *= rho;
                phiC = EvalPhi(c);
                (dphiC, gNewC) = EvalDphi(c);

                if (SatisfiesConditions(c, phiC, dphiC))
                {
                    return new LineSearchResult
                    {
                        Alpha = c, FNew = phiC, GNew = gNewC,
                        FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                    };
                }

                if (phiC > phi0 + epsK || dphiC >= 0)
                {
                    aj = cPrev; bj = c;
                    phiAj = phiPrev; phiBj = phiC;
                    dphiAj = dphiPrev; dphiBj = dphiC;
                    bracketFound = true;
                    break;
                }
            }

            if (!bracketFound)
            {
                return new LineSearchResult
                {
                    Alpha = c, FNew = phiC, GNew = gNewC,
                    FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = false
                };
            }
        }

        // Secant/Bisect phase
        double lastWidth = bj - aj;
        for (int i = 0; i < maxSecantIter; i++)
        {
            double width = bj - aj;
            if (width < 1e-14)
            {
                double mid = (aj + bj) / 2;
                double phiMid = EvalPhi(mid);
                var (dphiMid, gMid) = EvalDphi(mid);
                return new LineSearchResult
                {
                    Alpha = mid, FNew = phiMid, GNew = gMid,
                    FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                };
            }

            double cj;
            double denom = dphiBj - dphiAj;
            if (Math.Abs(denom) > 1e-30)
            {
                cj = aj - dphiAj * (bj - aj) / denom;
                double margin = 1e-14 * width;
                cj = Math.Max(aj + margin, Math.Min(cj, bj - margin));
            }
            else
            {
                cj = aj + theta * (bj - aj);
            }

            double phiCj = EvalPhi(cj);
            var (dphiCj, gCj) = EvalDphi(cj);

            if (SatisfiesConditions(cj, phiCj, dphiCj))
            {
                return new LineSearchResult
                {
                    Alpha = cj, FNew = phiCj, GNew = gCj,
                    FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                };
            }

            if (phiCj > phi0 + epsK || dphiCj >= 0)
            {
                bj = cj; phiBj = phiCj; dphiBj = dphiCj;
            }
            else
            {
                aj = cj; phiAj = phiCj; dphiAj = dphiCj;
            }

            double newWidth = bj - aj;
            if (newWidth > gamma * lastWidth)
            {
                double mid2 = aj + theta * (bj - aj);
                double phiMid2 = EvalPhi(mid2);
                var (dphiMid2, gMid2) = EvalDphi(mid2);

                if (SatisfiesConditions(mid2, phiMid2, dphiMid2))
                {
                    return new LineSearchResult
                    {
                        Alpha = mid2, FNew = phiMid2, GNew = gMid2,
                        FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                    };
                }

                if (phiMid2 > phi0 + epsK || dphiMid2 >= 0)
                {
                    bj = mid2; phiBj = phiMid2; dphiBj = dphiMid2;
                }
                else
                {
                    aj = mid2; phiAj = phiMid2; dphiAj = dphiMid2;
                }
            }

            lastWidth = bj - aj;
        }

        // Exhausted
        double bestPhi = EvalPhi(aj);
        var (_, bestG) = EvalDphi(aj);
        return new LineSearchResult
        {
            Alpha = aj, FNew = bestPhi, GNew = bestG,
            FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = false
        };
    }
}
