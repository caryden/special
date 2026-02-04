using System;

namespace Optimization
{
    public class LineSearchResult
    {
        public double Alpha { get; set; }
        public double FNew { get; set; }
        public double[]? GNew { get; set; }
        public int FunctionCalls { get; set; }
        public int GradientCalls { get; set; }
        public bool Success { get; set; }
    }

    public class BacktrackingOptions
    {
        public double InitialAlpha { get; set; } = 1.0;
        public double C1 { get; set; } = 1e-4;
        public double Rho { get; set; } = 0.5;
        public int MaxIter { get; set; } = 20;
    }

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
        /// Backtracking line search with Armijo (sufficient decrease) condition.
        /// </summary>
        public static LineSearchResult Backtracking(
            Func<double[], double> f,
            double[] x, double[] d, double fx, double[] gx,
            BacktrackingOptions? options = null)
        {
            var opts = options ?? new BacktrackingOptions();
            double dg = VecOps.Dot(gx, d);
            double alpha = opts.InitialAlpha;
            int functionCalls = 0;

            for (int i = 0; i < opts.MaxIter; i++)
            {
                var xNew = VecOps.AddScaled(x, d, alpha);
                double fNew = f(xNew);
                functionCalls++;

                if (fNew <= fx + opts.C1 * alpha * dg)
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
            }

            // Failed
            return new LineSearchResult
            {
                Alpha = alpha,
                FNew = f(VecOps.AddScaled(x, d, alpha)),
                GNew = null,
                FunctionCalls = functionCalls + 1,
                GradientCalls = 0,
                Success = false
            };
        }

        /// <summary>
        /// Strong Wolfe line search using bracket-and-zoom.
        /// </summary>
        public static LineSearchResult Wolfe(
            Func<double[], double> f,
            Func<double[], double[]> grad,
            double[] x, double[] d, double fx, double[] gx,
            WolfeOptions? options = null)
        {
            var opts = options ?? new WolfeOptions();
            double dg0 = VecOps.Dot(gx, d);
            int functionCalls = 0;
            int gradientCalls = 0;

            double alphaPrev = 0;
            double fPrev = fx;
            double alpha = 1.0;

            for (int i = 0; i < opts.MaxIter; i++)
            {
                var xNew = VecOps.AddScaled(x, d, alpha);
                double fNew = f(xNew);
                functionCalls++;

                if (fNew > fx + opts.C1 * alpha * dg0 || (i > 0 && fNew >= fPrev))
                {
                    return Zoom(f, grad, x, d, fx, dg0, opts.C1, opts.C2,
                        alphaPrev, alpha, fPrev, fNew, functionCalls, gradientCalls);
                }

                var gNew = grad(xNew);
                gradientCalls++;
                double dgNew = VecOps.Dot(gNew, d);

                if (Math.Abs(dgNew) <= opts.C2 * Math.Abs(dg0))
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

                if (dgNew >= 0)
                {
                    return Zoom(f, grad, x, d, fx, dg0, opts.C1, opts.C2,
                        alpha, alphaPrev, fNew, fPrev, functionCalls, gradientCalls);
                }

                alphaPrev = alpha;
                fPrev = fNew;
                alpha = Math.Min(2 * alpha, opts.AlphaMax);
            }

            // Failed
            var xFinal = VecOps.AddScaled(x, d, alpha);
            return new LineSearchResult
            {
                Alpha = alpha,
                FNew = f(xFinal),
                GNew = grad(xFinal),
                FunctionCalls = functionCalls + 1,
                GradientCalls = gradientCalls + 1,
                Success = false
            };
        }

        private static LineSearchResult Zoom(
            Func<double[], double> f,
            Func<double[], double[]> grad,
            double[] x, double[] d, double fx, double dg0,
            double c1, double c2,
            double alphaLo, double alphaHi,
            double fLo, double fHi,
            int functionCalls, int gradientCalls)
        {
            const int maxZoomIter = 20;

            for (int j = 0; j < maxZoomIter; j++)
            {
                double alpha = (alphaLo + alphaHi) / 2.0;
                var xNew = VecOps.AddScaled(x, d, alpha);
                double fNew = f(xNew);
                functionCalls++;

                if (fNew > fx + c1 * alpha * dg0 || fNew >= fLo)
                {
                    alphaHi = alpha;
                    fHi = fNew;
                }
                else
                {
                    var gNew = grad(xNew);
                    gradientCalls++;
                    double dgNew = VecOps.Dot(gNew, d);

                    if (Math.Abs(dgNew) <= c2 * Math.Abs(dg0))
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

                    if (dgNew * (alphaHi - alphaLo) >= 0)
                    {
                        alphaHi = alphaLo;
                        fHi = fLo;
                    }

                    alphaLo = alpha;
                    fLo = fNew;
                }

                if (Math.Abs(alphaHi - alphaLo) < 1e-14)
                    break;
            }

            // Return best found
            var xFinal = VecOps.AddScaled(x, d, alphaLo);
            return new LineSearchResult
            {
                Alpha = alphaLo,
                FNew = f(xFinal),
                GNew = grad(xFinal),
                FunctionCalls = functionCalls + 1,
                GradientCalls = gradientCalls + 1,
                Success = false
            };
        }
    }
}
