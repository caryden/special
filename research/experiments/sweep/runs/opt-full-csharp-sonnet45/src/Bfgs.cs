namespace Optimization;

public static class Bfgs
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null, OptimizeOptions? options = null)
    {
        var opts = ResultTypes.MergeOptions(options);
        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));
        int n = x0.Length;

        double[] x = (double[])x0.Clone();
        double fx = f(x);
        double[] gx = gradFn(x);
        int functionCalls = 1;
        int gradientCalls = 1;

        double gradNorm = VecOps.NormInf(gx);
        if (gradNorm <= opts.GradTol)
        {
            return new OptimizeResult
            {
                X = x, Fun = fx, Gradient = (double[])gx.Clone(),
                Iterations = 0, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                Converged = true, Message = "Convergence: gradient norm below tolerance"
            };
        }

        // Initialize inverse Hessian as identity
        double[][] H = IdentityMatrix(n);

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            // Direction d = -H * g
            double[] d = MatVecMul(H, VecOps.Negate(gx));

            var ls = LineSearch.WolfeLineSearch(f, gradFn, x, d, fx, gx);
            functionCalls += ls.FunctionCalls;
            gradientCalls += ls.GradientCalls;

            if (!ls.Success)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = false, Message = "Stopped: line search failed"
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, ls.Alpha);
            double fNew = ls.FNew;
            double[] gNew = ls.GNew ?? gradFn(xNew);
            if (ls.GNew == null) gradientCalls++;

            double[] sk = VecOps.Sub(xNew, x);
            double[] yk = VecOps.Sub(gNew, gx);
            double yts = VecOps.Dot(yk, sk);

            double stepNorm = VecOps.NormInf(sk);
            double funcChange = Math.Abs(fNew - fx);

            x = xNew; fx = fNew; gx = gNew;
            gradNorm = VecOps.NormInf(gx);

            // Curvature guard
            if (yts > 1e-10)
            {
                double rhoK = 1.0 / yts;
                BfgsUpdate(H, sk, yk, rhoK);
            }

            var reason = ResultTypes.CheckConvergence(gradNorm, stepNorm, funcChange, iter, opts);
            if (reason != null)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = ResultTypes.IsConverged(reason), Message = ResultTypes.ConvergenceMessage(reason)
                };
            }
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = opts.MaxIterations, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = "Stopped: reached maximum iterations"
        };
    }

    public static double[][] IdentityMatrix(int n)
    {
        double[][] I = new double[n][];
        for (int i = 0; i < n; i++)
        {
            I[i] = new double[n];
            I[i][i] = 1.0;
        }
        return I;
    }

    public static double[] MatVecMul(double[][] M, double[] v)
    {
        int n = v.Length;
        double[] result = new double[n];
        for (int i = 0; i < n; i++)
        {
            double sum = 0;
            for (int j = 0; j < n; j++) sum += M[i][j] * v[j];
            result[i] = sum;
        }
        return result;
    }

    public static void BfgsUpdate(double[][] H, double[] s, double[] y, double rho)
    {
        int n = s.Length;
        // H_new = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
        double[] Hy = MatVecMul(H, y);
        double yHy = VecOps.Dot(y, Hy);

        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                H[i][j] = H[i][j] - rho * (s[i] * Hy[j] + Hy[i] * s[j]) + rho * (rho * yHy + 1) * s[i] * s[j];
            }
        }
    }
}
