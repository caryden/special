namespace Optimization;

public class LBfgsOptions : OptimizeOptions
{
    public int Memory { get; set; } = 10;
}

public static class LBfgs
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null, OptimizeOptions? options = null)
    {
        int memory = 10;
        if (options is LBfgsOptions lbOpts) memory = lbOpts.Memory;
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

        var sHistory = new List<double[]>();
        var yHistory = new List<double[]>();
        var rhoHistory = new List<double>();
        double gammaK = 1.0;

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            // Compute direction via two-loop recursion
            double[] d;
            if (sHistory.Count == 0)
            {
                d = VecOps.Negate(gx);
            }
            else
            {
                d = TwoLoopRecursion(gx, sHistory, yHistory, rhoHistory, gammaK);
            }

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

            if (yts > 1e-10)
            {
                if (sHistory.Count >= memory)
                {
                    sHistory.RemoveAt(0);
                    yHistory.RemoveAt(0);
                    rhoHistory.RemoveAt(0);
                }
                sHistory.Add(sk);
                yHistory.Add(yk);
                rhoHistory.Add(1.0 / yts);
                gammaK = yts / VecOps.Dot(yk, yk);
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

    private static double[] TwoLoopRecursion(
        double[] g, List<double[]> sHist, List<double[]> yHist, List<double> rhoHist, double gamma)
    {
        int n = g.Length;
        int m = sHist.Count;
        double[] q = (double[])g.Clone();
        double[] alphas = new double[m];

        for (int i = m - 1; i >= 0; i--)
        {
            alphas[i] = rhoHist[i] * VecOps.Dot(sHist[i], q);
            q = VecOps.AddScaled(q, yHist[i], -alphas[i]);
        }

        double[] r = VecOps.Scale(q, gamma);

        for (int i = 0; i < m; i++)
        {
            double beta = rhoHist[i] * VecOps.Dot(yHist[i], r);
            r = VecOps.AddScaled(r, sHist[i], alphas[i] - beta);
        }

        return VecOps.Negate(r);
    }
}
