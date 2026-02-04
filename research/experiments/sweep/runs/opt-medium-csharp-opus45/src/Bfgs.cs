using System;

namespace Optimization
{
    public static class BfgsOptimizer
    {
        /// <summary>
        /// Minimize a function using the BFGS quasi-Newton method.
        /// If no gradient function is provided, forward finite differences are used.
        /// </summary>
        public static OptimizeResult Bfgs(
            Func<double[], double> f,
            double[] x0,
            Func<double[], double[]>? grad = null,
            OptimizeOptions? options = null)
        {
            var opts = options != null ? ResultTypes.DefaultOptions(options) : ResultTypes.DefaultOptions();
            int n = x0.Length;

            Func<double[], double[]> gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));

            var x = (double[])x0.Clone();
            double fx = f(x);
            var gx = gradFn(x);
            int functionCalls = 1;
            int gradientCalls = 1;

            // Initialize inverse Hessian as identity
            var H = IdentityMatrix(n);

            double gradNorm = VecOps.NormInf(gx);
            var initialCheck = ResultTypes.CheckConvergence(gradNorm, double.PositiveInfinity, double.PositiveInfinity, 0, opts);
            if (initialCheck != null && ResultTypes.IsConverged(initialCheck))
            {
                return new OptimizeResult
                {
                    X = x,
                    Fun = fx,
                    Gradient = (double[])gx.Clone(),
                    Iterations = 0,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Converged = true,
                    Message = ResultTypes.ConvergenceMessage(initialCheck)
                };
            }

            for (int iteration = 1; iteration <= opts.MaxIterations; iteration++)
            {
                // Search direction: d = -H * g
                var d = VecOps.Negate(MatVecMul(H, gx));

                // Strong Wolfe line search
                var ls = LineSearch.Wolfe(f, gradFn, x, d, fx, gx);
                functionCalls += ls.FunctionCalls;
                gradientCalls += ls.GradientCalls;

                if (!ls.Success)
                {
                    return new OptimizeResult
                    {
                        X = x,
                        Fun = fx,
                        Gradient = (double[])gx.Clone(),
                        Iterations = iteration,
                        FunctionCalls = functionCalls,
                        GradientCalls = gradientCalls,
                        Converged = false,
                        Message = "Stopped: line search failed to find acceptable step"
                    };
                }

                var xNew = VecOps.AddScaled(x, d, ls.Alpha);
                double fNew = ls.FNew;
                var gNew = ls.GNew ?? gradFn(xNew);
                if (ls.GNew == null) gradientCalls++;

                var sk = VecOps.Sub(xNew, x);
                var yk = VecOps.Sub(gNew, gx);

                double stepNorm = VecOps.NormInf(sk);
                double funcChange = Math.Abs(fNew - fx);
                gradNorm = VecOps.NormInf(gNew);

                x = xNew;
                fx = fNew;
                gx = gNew;

                var reason = ResultTypes.CheckConvergence(gradNorm, stepNorm, funcChange, iteration, opts);
                if (reason != null)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(),
                        Fun = fx,
                        Gradient = (double[])gx.Clone(),
                        Iterations = iteration,
                        FunctionCalls = functionCalls,
                        GradientCalls = gradientCalls,
                        Converged = ResultTypes.IsConverged(reason),
                        Message = ResultTypes.ConvergenceMessage(reason)
                    };
                }

                // BFGS update
                double ys = VecOps.Dot(yk, sk);
                if (ys <= 1e-10)
                    continue;

                double rho = 1.0 / ys;
                H = BfgsUpdate(H, sk, yk, rho);
            }

            return new OptimizeResult
            {
                X = (double[])x.Clone(),
                Fun = fx,
                Gradient = (double[])gx.Clone(),
                Iterations = opts.MaxIterations,
                FunctionCalls = functionCalls,
                GradientCalls = gradientCalls,
                Converged = false,
                Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
            };
        }

        private static double[][] IdentityMatrix(int n)
        {
            var m = new double[n][];
            for (int i = 0; i < n; i++)
            {
                m[i] = new double[n];
                m[i][i] = 1.0;
            }
            return m;
        }

        private static double[] MatVecMul(double[][] M, double[] v)
        {
            int n = v.Length;
            var result = new double[n];
            for (int i = 0; i < n; i++)
            {
                double sum = 0;
                for (int j = 0; j < n; j++)
                    sum += M[i][j] * v[j];
                result[i] = sum;
            }
            return result;
        }

        private static double[][] BfgsUpdate(double[][] H, double[] s, double[] y, double rho)
        {
            int n = s.Length;
            var Hy = MatVecMul(H, y);
            double yHy = VecOps.Dot(y, Hy);

            var Hnew = new double[n][];
            for (int i = 0; i < n; i++)
            {
                Hnew[i] = new double[n];
                for (int j = 0; j < n; j++)
                {
                    Hnew[i][j] = H[i][j]
                        - rho * (s[i] * Hy[j] + Hy[i] * s[j])
                        + rho * (1 + rho * yHy) * s[i] * s[j];
                }
            }
            return Hnew;
        }
    }
}
