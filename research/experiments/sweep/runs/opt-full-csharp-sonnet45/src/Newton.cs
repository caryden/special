namespace Optimization;

public static class Newton
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null,
        Func<double[], double[][]>? hess = null,
        OptimizeOptions? options = null,
        double initialTau = 1e-8, double tauFactor = 10, int maxRegularize = 20)
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
            double[][] H = hessFn(x);
            double[] negG = VecOps.Negate(gx);

            double[]? d = SolveWithRegularization(H, negG, initialTau, tauFactor, maxRegularize);

            if (d == null)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = false, Message = "Stopped: Hessian regularization failed"
                };
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
                    Converged = false, Message = "Stopped: line search failed to find acceptable step"
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, ls.Alpha);
            double fNew = ls.FNew;
            double[] gNew = ls.GNew ?? gradFn(xNew);
            if (ls.GNew == null) gradientCalls++;

            double stepNorm = VecOps.NormInf(VecOps.Sub(xNew, x));
            double funcChange = Math.Abs(fNew - fx);
            x = xNew; fx = fNew; gx = gNew;
            gradNorm = VecOps.NormInf(gx);

            if (gradNorm <= opts.GradTol)
                return MakeResult(x, fx, gx, iter, functionCalls, gradientCalls, true, "Convergence: gradient norm below tolerance");
            if (stepNorm <= opts.StepTol)
                return MakeResult(x, fx, gx, iter, functionCalls, gradientCalls, true, "Convergence: step size below tolerance");
            if (funcChange <= opts.FuncTol)
                return MakeResult(x, fx, gx, iter, functionCalls, gradientCalls, true, "Convergence: function change below tolerance");
        }

        return MakeResult(x, fx, gx, opts.MaxIterations, functionCalls, gradientCalls, false,
            $"Stopped: reached maximum iterations ({opts.MaxIterations})");
    }

    private static OptimizeResult MakeResult(double[] x, double fx, double[] gx, int iter, int fc, int gc, bool converged, string msg)
    {
        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = iter, FunctionCalls = fc, GradientCalls = gc,
            Converged = converged, Message = msg
        };
    }

    public static double[]? SolveWithRegularization(double[][] H, double[] b, double initialTau, double tauFactor, int maxAttempts)
    {
        int n = b.Length;
        double[]? d = CholeskySolve(H, b);
        if (d != null) return d;

        double tau = initialTau;
        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            double[][] Hreg = new double[n][];
            for (int i = 0; i < n; i++)
            {
                Hreg[i] = (double[])H[i].Clone();
                Hreg[i][i] += tau;
            }
            d = CholeskySolve(Hreg, b);
            if (d != null) return d;
            tau *= tauFactor;
        }
        return null;
    }

    public static double[]? CholeskySolve(double[][] A, double[] b)
    {
        int n = b.Length;
        if (n == 0) return Array.Empty<double>();

        double[][] L = new double[n][];
        for (int i = 0; i < n; i++) L[i] = new double[n];

        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j <= i; j++)
            {
                double sum = 0;
                for (int k = 0; k < j; k++) sum += L[i][k] * L[j][k];

                if (i == j)
                {
                    double diag = A[i][i] - sum;
                    if (diag <= 0) return null;
                    L[i][j] = Math.Sqrt(diag);
                }
                else
                {
                    L[i][j] = (A[i][j] - sum) / L[j][j];
                }
            }
        }

        double[] y = new double[n];
        for (int i = 0; i < n; i++)
        {
            double sum = 0;
            for (int j = 0; j < i; j++) sum += L[i][j] * y[j];
            y[i] = (b[i] - sum) / L[i][i];
        }

        double[] result = new double[n];
        for (int i = n - 1; i >= 0; i--)
        {
            double sum = 0;
            for (int j = i + 1; j < n; j++) sum += L[j][i] * result[j];
            result[i] = (y[i] - sum) / L[i][i];
        }
        return result;
    }
}
