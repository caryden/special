namespace Optimization;

/// <summary>
/// Line search strategies for finding step sizes that satisfy
/// sufficient decrease conditions.
/// </summary>

/// <summary>Line search result</summary>
public class LineSearchResult
{
    public required double Alpha { get; set; }
    public required double FNew { get; set; }
    public double[]? GNew { get; set; }
    public required int FunctionCalls { get; set; }
    public required int GradientCalls { get; set; }
    public required bool Success { get; set; }
}

/// <summary>Backtracking line search options</summary>
public class BacktrackingOptions
{
    public double InitialAlpha { get; set; } = 1.0;
    public double C1 { get; set; } = 1e-4;
    public double Rho { get; set; } = 0.5;
    public int MaxIter { get; set; } = 20;
}

/// <summary>Wolfe line search options</summary>
public class WolfeOptions
{
    public double C1 { get; set; } = 1e-4;
    public double C2 { get; set; } = 0.9;
    public double AlphaMax { get; set; } = 1e6;
    public int MaxIter { get; set; } = 25;
}

public static class LineSearch
{
    /// <summary>
    /// Backtracking line search satisfying Armijo condition.
    /// Nocedal & Wright, Algorithm 3.1
    /// </summary>
    public static LineSearchResult BacktrackingLineSearch(
        Func<double[], double> f,
        double[] x,
        double[] d,
        double fx,
        double[] gx,
        BacktrackingOptions? options = null)
    {
        options ??= new BacktrackingOptions();

        double alpha = options.InitialAlpha;
        double directionalDerivative = VecOps.Dot(gx, d);
        int functionCalls = 0;

        for (int i = 0; i < options.MaxIter; i++)
        {
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            // Armijo condition: f(x + α*d) ≤ f(x) + c1*α*∇f(x)ᵀd
            if (fNew <= fx + options.C1 * alpha * directionalDerivative)
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

            alpha *= options.Rho;
        }

        return new LineSearchResult
        {
            Alpha = alpha,
            FNew = fx,
            GNew = null,
            FunctionCalls = functionCalls,
            GradientCalls = 0,
            Success = false
        };
    }

    /// <summary>
    /// Strong Wolfe line search.
    /// Nocedal & Wright, Algorithms 3.5 + 3.6
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
        options ??= new WolfeOptions();

        int functionCalls = 0;
        int gradientCalls = 0;

        double directionalDerivative = VecOps.Dot(gx, d);
        double alphaPrev = 0.0;
        double fPrev = fx;
        double alpha = 1.0;

        for (int i = 0; i < options.MaxIter; i++)
        {
            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            // Check Armijo condition
            if (fNew > fx + options.C1 * alpha * directionalDerivative || (i > 0 && fNew >= fPrev))
            {
                var result = Zoom(f, grad, x, d, fx, gx, alphaPrev, alpha, fPrev, fNew,
                    directionalDerivative, options, ref functionCalls, ref gradientCalls);
                return result;
            }

            double[] gNew = grad(xNew);
            gradientCalls++;

            double newDirectionalDerivative = VecOps.Dot(gNew, d);

            // Check curvature condition
            if (Math.Abs(newDirectionalDerivative) <= options.C2 * Math.Abs(directionalDerivative))
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

            if (newDirectionalDerivative >= 0)
            {
                var result = Zoom(f, grad, x, d, fx, gx, alpha, alphaPrev, fNew, fPrev,
                    directionalDerivative, options, ref functionCalls, ref gradientCalls);
                return result;
            }

            alphaPrev = alpha;
            fPrev = fNew;
            alpha = Math.Min(2.0 * alpha, options.AlphaMax);
        }

        return new LineSearchResult
        {
            Alpha = alpha,
            FNew = fx,
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
        double directionalDerivative,
        WolfeOptions options,
        ref int functionCalls,
        ref int gradientCalls)
    {
        const int maxZoomIter = 10;

        for (int i = 0; i < maxZoomIter; i++)
        {
            double alpha = (alphaLo + alphaHi) / 2.0;

            double[] xNew = VecOps.AddScaled(x, d, alpha);
            double fNew = f(xNew);
            functionCalls++;

            if (fNew > fx + options.C1 * alpha * directionalDerivative || fNew >= fLo)
            {
                alphaHi = alpha;
                fHi = fNew;
            }
            else
            {
                double[] gNew = grad(xNew);
                gradientCalls++;

                double newDirectionalDerivative = VecOps.Dot(gNew, d);

                if (Math.Abs(newDirectionalDerivative) <= options.C2 * Math.Abs(directionalDerivative))
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

                if (newDirectionalDerivative * (alphaHi - alphaLo) >= 0)
                {
                    alphaHi = alphaLo;
                }

                alphaLo = alpha;
                fLo = fNew;
            }
        }

        // Fallback if zoom doesn't converge
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
