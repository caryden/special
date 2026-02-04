namespace Optimization;

/// <summary>
/// Result of a line search operation.
/// </summary>
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
/// Options for backtracking line search.
/// </summary>
public class BacktrackingOptions
{
    public double InitialAlpha { get; set; } = 1.0;
    public double C1 { get; set; } = 1e-4;
    public double Rho { get; set; } = 0.5;
    public int MaxIter { get; set; } = 20;
}

/// <summary>
/// Options for Wolfe line search.
/// </summary>
public class WolfeOptions
{
    public double C1 { get; set; } = 1e-4;
    public double C2 { get; set; } = 0.9;
    public double AlphaMax { get; set; } = 1e6;
    public int MaxIter { get; set; } = 25;
}

/// <summary>
/// Line search algorithms for step size selection.
/// </summary>
public static class LineSearch
{
    /// <summary>
    /// Backtracking line search with Armijo condition.
    /// Finds alpha satisfying: f(x + alpha*d) <= f(x) + c1*alpha*grad(x)'*d
    /// </summary>
    public static LineSearchResult BacktrackingLineSearch(
        Func<double[], double> f,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        BacktrackingOptions? options = null)
    {
        var opts = options ?? new BacktrackingOptions();
        double alpha = opts.InitialAlpha;
        int functionCalls = 0;

        double dGrad = VecOps.Dot(gx, d);
        double threshold = fx + opts.C1 * alpha * dGrad;

        for (int i = 0; i < opts.MaxIter; i++)
        {
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            if (fNew <= threshold)
            {
                return new LineSearchResult
                {
                    Alpha = alpha,
                    FNew = fNew,
                    GNew = null,
                    FunctionCalls = functionCalls,
                    GradientCalls = 0,
                    Success = true
                };
            }

            alpha *= opts.Rho;
            threshold = fx + opts.C1 * alpha * dGrad;
        }

        return new LineSearchResult
        {
            Alpha = alpha,
            FNew = double.NaN,
            GNew = null,
            FunctionCalls = functionCalls,
            GradientCalls = 0,
            Success = false
        };
    }

    /// <summary>
    /// Strong Wolfe line search.
    /// Finds alpha satisfying both Wolfe conditions:
    /// 1. Armijo: f(x + alpha*d) <= f(x) + c1*alpha*grad(x)'*d
    /// 2. Curvature: |grad(x + alpha*d)'*d| <= c2*|grad(x)'*d|
    /// </summary>
    public static LineSearchResult WolfeLineSearch(
        Func<double[], double> f,
        Func<double[], double[]> grad,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        WolfeOptions? options = null)
    {
        var opts = options ?? new WolfeOptions();
        int functionCalls = 0;
        int gradientCalls = 0;

        double dGrad = VecOps.Dot(gx, d);
        double alphaPrev = 0;
        double fPrev = fx;
        double[] gPrev = gx;
        double alpha = 1.0;

        for (int i = 0; i < opts.MaxIter; i++)
        {
            if (alpha > opts.AlphaMax)
            {
                return new LineSearchResult
                {
                    Alpha = alpha,
                    FNew = double.NaN,
                    GNew = null,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Success = false
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            // Check Armijo condition
            if (fNew > fx + opts.C1 * alpha * dGrad || (i > 0 && fNew >= fPrev))
            {
                return Zoom(f, grad, x, d, fx, gx, alphaPrev, alpha, fPrev, fNew, dGrad, opts, ref functionCalls, ref gradientCalls);
            }

            double[] gNew = grad(xNew);
            gradientCalls++;
            double dGradNew = VecOps.Dot(gNew, d);

            // Check curvature condition
            if (Math.Abs(dGradNew) <= opts.C2 * Math.Abs(dGrad))
            {
                return new LineSearchResult
                {
                    Alpha = alpha,
                    FNew = fNew,
                    GNew = gNew,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Success = true
                };
            }

            if (dGradNew >= 0)
            {
                return Zoom(f, grad, x, d, fx, gx, alpha, alphaPrev, fNew, fPrev, dGrad, opts, ref functionCalls, ref gradientCalls);
            }

            alphaPrev = alpha;
            fPrev = fNew;
            gPrev = gNew;
            alpha = Math.Min(2 * alpha, opts.AlphaMax);
        }

        return new LineSearchResult
        {
            Alpha = alpha,
            FNew = double.NaN,
            GNew = null,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Success = false
        };
    }

    private static LineSearchResult Zoom(
        Func<double[], double> f,
        Func<double[], double[]> grad,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        double alphaLo,
        double alphaHi,
        double fLo,
        double fHi,
        double dGrad,
        WolfeOptions opts,
        ref int functionCalls,
        ref int gradientCalls)
    {
        for (int i = 0; i < opts.MaxIter; i++)
        {
            double alpha = (alphaLo + alphaHi) / 2;
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            if (fNew > fx + opts.C1 * alpha * dGrad || fNew >= fLo)
            {
                alphaHi = alpha;
                fHi = fNew;
            }
            else
            {
                double[] gNew = grad(xNew);
                gradientCalls++;
                double dGradNew = VecOps.Dot(gNew, d);

                if (Math.Abs(dGradNew) <= opts.C2 * Math.Abs(dGrad))
                {
                    return new LineSearchResult
                    {
                        Alpha = alpha,
                        FNew = fNew,
                        GNew = gNew,
                        FunctionCalls = functionCalls,
                        GradientCalls = gradientCalls,
                        Success = true
                    };
                }

                if (dGradNew * (alphaHi - alphaLo) >= 0)
                {
                    alphaHi = alphaLo;
                    fHi = fLo;
                }

                alphaLo = alpha;
                fLo = fNew;
            }
        }

        return new LineSearchResult
        {
            Alpha = alphaLo,
            FNew = fLo,
            GNew = null,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Success = false
        };
    }
}
