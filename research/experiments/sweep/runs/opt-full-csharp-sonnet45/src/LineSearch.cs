namespace Optimization;

public class LineSearchResult
{
    public double Alpha { get; set; }
    public double FNew { get; set; }
    public double[]? GNew { get; set; }
    public int FunctionCalls { get; set; }
    public int GradientCalls { get; set; }
    public bool Success { get; set; }
}

/// <summary>
/// Backtracking (Armijo) and Strong Wolfe line search.
/// </summary>
public static class LineSearch
{
    public static LineSearchResult BacktrackingLineSearch(
        Func<double[], double> f,
        double[] x, double[] d, double fx, double[] gx,
        double initialAlpha = 1.0, double c1 = 1e-4, double rho = 0.5, int maxIter = 20)
    {
        double dirDeriv = VecOps.Dot(gx, d);
        double alpha = initialAlpha;
        int functionCalls = 0;

        for (int i = 0; i < maxIter; i++)
        {
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            if (fNew <= fx + c1 * alpha * dirDeriv)
            {
                return new LineSearchResult
                {
                    Alpha = alpha, FNew = fNew, GNew = null,
                    FunctionCalls = functionCalls, GradientCalls = 0, Success = true
                };
            }
            alpha *= rho;
        }

        double[] xFinal = VecOps.AddScaled(x, d, alpha);
        double fFinal = f(xFinal);
        functionCalls++;
        return new LineSearchResult
        {
            Alpha = alpha, FNew = fFinal, GNew = null,
            FunctionCalls = functionCalls, GradientCalls = 0, Success = false
        };
    }

    public static LineSearchResult WolfeLineSearch(
        Func<double[], double> f, Func<double[], double[]> grad,
        double[] x, double[] d, double fx, double[] gx,
        double c1 = 1e-4, double c2 = 0.9, double alphaMax = 1e6, int maxIter = 25)
    {
        double dphi0 = VecOps.Dot(gx, d);
        int functionCalls = 0;
        int gradientCalls = 0;

        double alphaPrev = 0;
        double phiPrev = fx;
        double alpha = 1.0;

        for (int i = 0; i < maxIter; i++)
        {
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double phiAlpha = f(xNew);
            functionCalls++;

            // Armijo violation or not sufficient decrease compared to previous
            if (phiAlpha > fx + c1 * alpha * dphi0 || (i > 0 && phiAlpha >= phiPrev))
            {
                return Zoom(f, grad, x, d, fx, dphi0, alphaPrev, alpha, phiPrev, phiAlpha,
                    c1, c2, ref functionCalls, ref gradientCalls);
            }

            double[] gNew = grad(xNew);
            gradientCalls++;
            double dphiAlpha = VecOps.Dot(gNew, d);

            // Strong Wolfe curvature condition
            if (Math.Abs(dphiAlpha) <= c2 * Math.Abs(dphi0))
            {
                return new LineSearchResult
                {
                    Alpha = alpha, FNew = phiAlpha, GNew = gNew,
                    FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                };
            }

            if (dphiAlpha >= 0)
            {
                return Zoom(f, grad, x, d, fx, dphi0, alpha, alphaPrev, phiAlpha, phiPrev,
                    c1, c2, ref functionCalls, ref gradientCalls);
            }

            alphaPrev = alpha;
            phiPrev = phiAlpha;
            alpha = Math.Min(alpha * 2, alphaMax);
        }

        // Failed
        double[] xF = VecOps.AddScaled(x, d, alpha);
        double fF = f(xF);
        functionCalls++;
        double[] gF = grad(xF);
        gradientCalls++;
        return new LineSearchResult
        {
            Alpha = alpha, FNew = fF, GNew = gF,
            FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = false
        };
    }

    private static LineSearchResult Zoom(
        Func<double[], double> f, Func<double[], double[]> grad,
        double[] x, double[] d, double fx, double dphi0,
        double alphaLo, double alphaHi, double phiLo, double phiHi,
        double c1, double c2, ref int functionCalls, ref int gradientCalls)
    {
        for (int j = 0; j < 20; j++)
        {
            double alpha = (alphaLo + alphaHi) / 2;
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double phiAlpha = f(xNew);
            functionCalls++;

            if (phiAlpha > fx + c1 * alpha * dphi0 || phiAlpha >= phiLo)
            {
                alphaHi = alpha;
                phiHi = phiAlpha;
            }
            else
            {
                double[] gNew = grad(xNew);
                gradientCalls++;
                double dphiAlpha = VecOps.Dot(gNew, d);

                if (Math.Abs(dphiAlpha) <= c2 * Math.Abs(dphi0))
                {
                    return new LineSearchResult
                    {
                        Alpha = alpha, FNew = phiAlpha, GNew = gNew,
                        FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = true
                    };
                }

                if (dphiAlpha * (alphaHi - alphaLo) >= 0)
                {
                    alphaHi = alphaLo;
                    phiHi = phiLo;
                }

                alphaLo = alpha;
                phiLo = phiAlpha;
            }
        }

        double[] xFinal = VecOps.AddScaled(x, d, alphaLo);
        double fFinal = f(xFinal);
        functionCalls++;
        double[] gFinal = grad(xFinal);
        gradientCalls++;
        return new LineSearchResult
        {
            Alpha = alphaLo, FNew = fFinal, GNew = gFinal,
            FunctionCalls = functionCalls, GradientCalls = gradientCalls, Success = false
        };
    }
}
