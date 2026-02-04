namespace Optimization;

public static class GradientDescent
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null, OptimizeOptions? options = null)
    {
        var opts = ResultTypes.MergeOptions(options);
        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));

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

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            double[] d = VecOps.Negate(gx);

            var ls = LineSearch.BacktrackingLineSearch(f, x, d, fx, gx);
            functionCalls += ls.FunctionCalls;

            if (!ls.Success)
            {
                return new OptimizeResult
                {
                    X = x, Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = false, Message = "Stopped: line search failed"
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, ls.Alpha);
            double fNew = ls.FNew;
            double[] gNew = gradFn(xNew);
            gradientCalls++;

            double stepNorm = VecOps.NormInf(VecOps.Sub(xNew, x));
            double funcChange = Math.Abs(fNew - fx);

            x = xNew; fx = fNew; gx = gNew;
            gradNorm = VecOps.NormInf(gx);

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
}
