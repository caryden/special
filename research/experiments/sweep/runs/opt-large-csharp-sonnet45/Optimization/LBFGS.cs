namespace Optimization;

/// <summary>
/// Options for L-BFGS optimizer.
/// </summary>
public class LBFGSOptions : OptimizeOptions
{
    public int Memory { get; set; } = 10;
}

/// <summary>
/// Limited-memory BFGS optimizer.
/// </summary>
public static class LBFGS
{
    /// <summary>
    /// Minimize a function using L-BFGS with two-loop recursion.
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        Func<double[], double[]>? grad = null,
        LBFGSOptions? options = null)
    {
        var opts = options ?? new LBFGSOptions();
        var gradFunc = grad ?? FiniteDiff.MakeGradient(f);

        double[] x = VecOps.Clone(x0);
        double fx = f(x);
        double[] gx = gradFunc(x);
        int functionCalls = 1;
        int gradientCalls = 1;

        // Check if already at minimum
        double gradNorm = VecOps.Norm(gx);
        if (gradNorm < opts.GradTol)
        {
            return new OptimizeResult
            {
                X = x,
                Fun = fx,
                Gradient = gx,
                Iterations = 0,
                FunctionCalls = functionCalls,
                GradientCalls = gradientCalls,
                Converged = true,
                Message = "Converged: gradient norm below tolerance"
            };
        }

        // Storage for correction pairs
        var sHistory = new List<double[]>();
        var yHistory = new List<double[]>();
        var rhoHistory = new List<double>();
        double gamma = 1.0;

        for (int iter = 0; iter < opts.MaxIterations; iter++)
        {
            // Compute search direction using two-loop recursion
            double[] d = TwoLoopRecursion(gx, sHistory, yHistory, rhoHistory, gamma);

            // Line search
            var lsResult = LineSearch.WolfeLineSearch(f, gradFunc, x, d, fx, gx);
            functionCalls += lsResult.FunctionCalls;
            gradientCalls += lsResult.GradientCalls;

            if (!lsResult.Success)
            {
                return new OptimizeResult
                {
                    X = x,
                    Fun = fx,
                    Gradient = gx,
                    Iterations = iter + 1,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Converged = false,
                    Message = "Terminated: line search failed"
                };
            }

            double[] xNew = VecOps.AddScaled(x, d, lsResult.Alpha);
            double fNew = lsResult.FNew;
            double[] gNew = lsResult.GNew!;

            // Compute s and y
            double[] s = VecOps.Sub(xNew, x);
            double[] y = VecOps.Sub(gNew, gx);
            double ys = VecOps.Dot(y, s);

            // Update history if curvature condition satisfied
            if (ys > 1e-10)
            {
                if (sHistory.Count >= opts.Memory)
                {
                    sHistory.RemoveAt(0);
                    yHistory.RemoveAt(0);
                    rhoHistory.RemoveAt(0);
                }

                sHistory.Add(s);
                yHistory.Add(y);
                rhoHistory.Add(1.0 / ys);

                // Update scaling factor
                double yy = VecOps.Dot(y, y);
                gamma = ys / yy;
            }

            // Check convergence
            double stepNorm = VecOps.Norm(s);
            double funcChange = Math.Abs(fNew - fx);
            gradNorm = VecOps.Norm(gNew);

            var reason = Convergence.CheckConvergence(gradNorm, stepNorm, funcChange, iter + 1, opts);
            if (reason != null)
            {
                return new OptimizeResult
                {
                    X = xNew,
                    Fun = fNew,
                    Gradient = gNew,
                    Iterations = iter + 1,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Converged = Convergence.IsConverged(reason),
                    Message = Convergence.ConvergenceMessage(reason)
                };
            }

            x = xNew;
            fx = fNew;
            gx = gNew;
        }

        return new OptimizeResult
        {
            X = x,
            Fun = fx,
            Gradient = gx,
            Iterations = opts.MaxIterations,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Converged = false,
            Message = "Terminated: maximum iterations reached"
        };
    }

    private static double[] TwoLoopRecursion(
        double[] g,
        List<double[]> sHistory,
        List<double[]> yHistory,
        List<double> rhoHistory,
        double gamma)
    {
        int m = sHistory.Count;
        if (m == 0)
        {
            return VecOps.Negate(g);
        }

        double[] q = VecOps.Clone(g);
        double[] alpha = new double[m];

        // First loop (backward)
        for (int i = m - 1; i >= 0; i--)
        {
            alpha[i] = rhoHistory[i] * VecOps.Dot(sHistory[i], q);
            q = VecOps.AddScaled(q, yHistory[i], -alpha[i]);
        }

        // Scale
        double[] r = VecOps.Scale(q, gamma);

        // Second loop (forward)
        for (int i = 0; i < m; i++)
        {
            double beta = rhoHistory[i] * VecOps.Dot(yHistory[i], r);
            r = VecOps.AddScaled(r, sHistory[i], alpha[i] - beta);
        }

        return VecOps.Negate(r);
    }
}
