namespace Optimization;

/// <summary>
/// Options for Hager-Zhang line search.
/// </summary>
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

/// <summary>
/// Hager-Zhang line search with approximate Wolfe conditions.
/// Uses secant-based interpolation with bisection fallback.
/// </summary>
public static class HagerZhang
{
    /// <summary>
    /// Finds step size alpha > 0 satisfying approximate Wolfe conditions.
    /// </summary>
    public static LineSearchResult HagerZhangLineSearch(
        Func<double[], double> f,
        Func<double[], double[]> grad,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        HagerZhangOptions? options = null)
    {
        var opts = options ?? new HagerZhangOptions();
        int functionCalls = 0;
        int gradientCalls = 0;

        double dphi0 = VecOps.Dot(gx, d);
        double epsK = opts.Epsilon * Math.Abs(fx);

        // Phase 1: Bracket
        double alpha = 1.0;
        double c = alpha;

        for (int i = 0; i < opts.MaxBracketIter; i++)
        {
            double[] xc = VecOps.AddScaled(x, d, c);
            double phic = f(xc);
            functionCalls++;
            double[] gc = grad(xc);
            gradientCalls++;
            double dphic = VecOps.Dot(gc, d);

            // Check approximate Wolfe conditions
            if (SatisfiesApproximateWolfe(fx, phic, dphi0, dphic, c, epsK, opts))
            {
                return new LineSearchResult
                {
                    Alpha = c,
                    FNew = phic,
                    GNew = gc,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Success = true
                };
            }

            // If sufficient decrease violated or non-descent
            if (phic > fx + epsK || dphic >= 0)
            {
                // Bracket found: [0, c]
                return SecantBisect(f, grad, x, d, fx, gx, dphi0, 0, c, fx, phic, gc, epsK, opts, ref functionCalls, ref gradientCalls);
            }

            // Expand bracket
            c *= opts.Rho;
        }

        return new LineSearchResult
        {
            Alpha = c,
            FNew = double.NaN,
            GNew = null,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Success = false
        };
    }

    private static LineSearchResult SecantBisect(
        Func<double[], double> f,
        Func<double[], double[]> grad,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        double dphi0,
        double a,
        double b,
        double phia,
        double phib,
        double[] gb,
        double epsK,
        HagerZhangOptions opts,
        ref int functionCalls,
        ref int gradientCalls)
    {
        double[] ga = gx;
        double dphia = dphi0;
        double dphib = VecOps.Dot(gb, d);

        double prevWidth = b - a;

        for (int i = 0; i < opts.MaxSecantIter; i++)
        {
            // Compute secant step
            double c;
            if (Math.Abs(dphib - dphia) < 1e-14)
            {
                c = a + opts.Theta * (b - a);
            }
            else
            {
                c = a - dphia * (b - a) / (dphib - dphia);
                // Clamp to interior
                c = Math.Max(a + 1e-10 * (b - a), Math.Min(c, b - 1e-10 * (b - a)));
            }

            double[] xc = VecOps.AddScaled(x, d, c);
            double phic = f(xc);
            functionCalls++;
            double[] gc = grad(xc);
            gradientCalls++;
            double dphic = VecOps.Dot(gc, d);

            // Check approximate Wolfe conditions
            if (SatisfiesApproximateWolfe(fx, phic, dphi0, dphic, c, epsK, opts))
            {
                return new LineSearchResult
                {
                    Alpha = c,
                    FNew = phic,
                    GNew = gc,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Success = true
                };
            }

            // Update bracket
            if (phic > fx + epsK || dphic >= 0)
            {
                b = c;
                phib = phic;
                gb = gc;
                dphib = dphic;
            }
            else
            {
                a = c;
                phia = phic;
                ga = gc;
                dphia = dphic;
            }

            double newWidth = b - a;
            if (newWidth > opts.Gamma * prevWidth)
            {
                // Bisection step
                c = a + opts.Theta * (b - a);
                xc = VecOps.AddScaled(x, d, c);
                phic = f(xc);
                functionCalls++;
                gc = grad(xc);
                gradientCalls++;
                dphic = VecOps.Dot(gc, d);

                if (SatisfiesApproximateWolfe(fx, phic, dphi0, dphic, c, epsK, opts))
                {
                    return new LineSearchResult
                    {
                        Alpha = c,
                        FNew = phic,
                        GNew = gc,
                        FunctionCalls = functionCalls,
                        GradientCalls = gradientCalls,
                        Success = true
                    };
                }

                if (phic > fx + epsK || dphic >= 0)
                {
                    b = c;
                    phib = phic;
                    gb = gc;
                    dphib = dphic;
                }
                else
                {
                    a = c;
                    phia = phic;
                    ga = gc;
                    dphia = dphic;
                }

                newWidth = b - a;
            }

            prevWidth = newWidth;
        }

        return new LineSearchResult
        {
            Alpha = a,
            FNew = phia,
            GNew = ga,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Success = false
        };
    }

    private static bool SatisfiesApproximateWolfe(
        double phi0,
        double phi,
        double dphi0,
        double dphi,
        double alpha,
        double epsK,
        HagerZhangOptions opts)
    {
        // Standard Wolfe
        bool sufficientDecrease = phi <= phi0 + opts.Delta * alpha * dphi0;
        bool curvature = dphi >= opts.Sigma * dphi0;

        if (sufficientDecrease && curvature)
            return true;

        // Approximate Wolfe
        bool boundedValue = phi <= phi0 + epsK;
        bool boundedSlope = dphi >= opts.Sigma * dphi0 && dphi <= (2 * opts.Delta - 1) * dphi0;

        return boundedValue && boundedSlope;
    }
}
