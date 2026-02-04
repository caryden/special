namespace Optimization;

public static class NewtonTrustRegion
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null,
        Func<double[], double[][]>? hess = null,
        OptimizeOptions? options = null,
        double initialDelta = 1.0, double maxDelta = 100.0, double eta = 0.1)
    {
        var opts = ResultTypes.MergeOptions(options);
        int n = x0.Length;
        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));
        var hessFn = hess ?? (x => FiniteHessian.FiniteDiffHessian(f, x));

        double[] x = (double[])x0.Clone();
        double fx = f(x);
        double[] gx = gradFn(x);
        int functionCalls = 1;
        int gradientCalls = 1;
        double delta = initialDelta;

        double gradNorm = VecOps.NormInf(gx);
        var initialCheck = ResultTypes.CheckConvergence(gradNorm, double.PositiveInfinity, double.PositiveInfinity, 0, opts);
        if (initialCheck != null && ResultTypes.IsConverged(initialCheck))
        {
            return new OptimizeResult
            {
                X = x, Fun = fx, Gradient = (double[])gx.Clone(),
                Iterations = 0, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                Converged = true, Message = ResultTypes.ConvergenceMessage(initialCheck)
            };
        }

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            double[][] H = hessFn(x);
            double[] p = DoglegStep(gx, H, delta);

            double[] xTrial = new double[n];
            for (int i = 0; i < n; i++) xTrial[i] = x[i] + p[i];
            double fTrial = f(xTrial);
            functionCalls++;

            double[] Hp = MatVecMul(H, p);
            double predictedReduction = -(VecOps.Dot(gx, p) + 0.5 * VecOps.Dot(p, Hp));
            double actualReduction = fx - fTrial;
            double rho = predictedReduction > 0 ? actualReduction / predictedReduction : 0;

            double pNorm = VecNorm(p);
            if (rho < 0.25)
                delta = 0.25 * pNorm;
            else if (rho > 0.75 && pNorm >= 0.99 * delta)
                delta = Math.Min(2 * delta, maxDelta);

            if (rho > eta)
            {
                double[] gNew = gradFn(xTrial);
                gradientCalls++;

                double stepNorm = VecOps.NormInf(VecOps.Sub(xTrial, x));
                double funcChange = Math.Abs(actualReduction);
                gradNorm = VecOps.NormInf(gNew);

                x = xTrial; fx = fTrial; gx = gNew;

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
            else
            {
                if (delta < 1e-15)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                        Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                        Converged = false, Message = "Stopped: trust region radius below minimum"
                    };
                }
            }
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = opts.MaxIterations, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
        };
    }

    private static double[] DoglegStep(double[] g, double[][] H, double delta)
    {
        int n = g.Length;
        double[] negG = VecOps.Negate(g);
        double[]? pN = Newton.CholeskySolve(H, negG);

        if (pN != null && VecNorm(pN) <= delta) return pN;

        double[] Hg = MatVecMul(H, g);
        double gHg = VecOps.Dot(g, Hg);
        double gNormSq = VecOps.Dot(g, g);

        if (gHg <= 0)
        {
            double gNorm = Math.Sqrt(gNormSq);
            double sc = delta / gNorm;
            return VecOps.Scale(g, -sc);
        }

        double alphaC = gNormSq / gHg;
        double[] pC = VecOps.Scale(g, -alphaC);
        double pCNorm = VecNorm(pC);

        if (pCNorm >= delta)
        {
            double sc = delta / pCNorm;
            return VecOps.Scale(pC, sc);
        }

        if (pN == null) return pC;

        double[] diff = VecOps.Sub(pN, pC);
        double a = VecOps.Dot(diff, diff);
        double b = 2 * VecOps.Dot(pC, diff);
        double c = VecOps.Dot(pC, pC) - delta * delta;
        double disc = b * b - 4 * a * c;

        if (disc < 0 || a <= 0) return pC;
        double tau = (-b + Math.Sqrt(disc)) / (2 * a);
        tau = Math.Max(0, Math.Min(1, tau));

        double[] result = new double[n];
        for (int i = 0; i < n; i++) result[i] = pC[i] + tau * diff[i];
        return result;
    }

    private static double[] MatVecMul(double[][] M, double[] v)
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

    private static double VecNorm(double[] v)
    {
        double sum = 0;
        for (int i = 0; i < v.Length; i++) sum += v[i] * v[i];
        return Math.Sqrt(sum);
    }
}
