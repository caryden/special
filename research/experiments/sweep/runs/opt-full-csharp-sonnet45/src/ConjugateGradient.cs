namespace Optimization;

public static class ConjugateGradient
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null, OptimizeOptions? options = null,
        double eta = 0.4, int? restartInterval = null)
    {
        var opts = ResultTypes.MergeOptions(options);
        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));
        int n = x0.Length;
        int restart = restartInterval ?? n;

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

        double[] d = VecOps.Negate(gx);
        int iteration = 0;

        for (iteration = 1; iteration <= opts.MaxIterations; iteration++)
        {
            var ls = HagerZhang.Search(f, gradFn, x, d, fx, gx);
            functionCalls += ls.FunctionCalls;
            gradientCalls += ls.GradientCalls;

            if (!ls.Success)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iteration, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = false, Message = "Stopped: line search failed to find acceptable step"
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, ls.Alpha);
            double fNew = ls.FNew;
            double[] gNew = ls.GNew ?? gradFn(xNew);
            if (ls.GNew == null) gradientCalls++;

            double[] sk = VecOps.Sub(xNew, x);
            double stepNorm = VecOps.NormInf(sk);
            double funcChange = Math.Abs(fNew - fx);

            double[] gOld = gx;
            x = xNew; fx = fNew; gx = gNew;
            gradNorm = VecOps.NormInf(gx);

            if (gradNorm <= opts.GradTol)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iteration, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = true, Message = "Convergence: gradient norm below tolerance"
                };
            }
            if (stepNorm <= opts.StepTol)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iteration, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = true, Message = "Convergence: step size below tolerance"
                };
            }
            if (funcChange <= opts.FuncTol)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iteration, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = true, Message = "Convergence: function change below tolerance"
                };
            }

            // Compute HZ beta
            double[] yk = VecOps.Sub(gx, gOld);
            double dDotY = VecOps.Dot(d, yk);

            double beta;
            if (Math.Abs(dDotY) < 1e-30 || iteration % restart == 0)
            {
                beta = 0;
            }
            else
            {
                double ykNormSq = VecOps.Dot(yk, yk);
                double coeff = 2 * ykNormSq / dDotY;
                double num = 0;
                for (int i = 0; i < n; i++)
                    num += (yk[i] - coeff * d[i]) * gx[i];
                beta = num / dDotY;

                double dNorm = VecOps.Norm(d);
                double gNorm = VecOps.Norm(gx);
                double etaK = -1.0 / (dNorm * Math.Min(eta, gNorm));
                beta = Math.Max(beta, etaK);
            }

            for (int i = 0; i < n; i++)
                d[i] = -gx[i] + beta * d[i];
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = iteration - 1, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
        };
    }
}
