namespace Optimization;

/// <summary>
/// Options for conjugate gradient optimizer.
/// </summary>
public class ConjugateGradientOptions : OptimizeOptions
{
    public double Eta { get; set; } = 0.4;
    public int? RestartInterval { get; set; } = null; // Defaults to n (dimension)
}

/// <summary>
/// Nonlinear conjugate gradient with Hager-Zhang beta and line search.
/// </summary>
public static class ConjugateGradient
{
    /// <summary>
    /// Minimize a function using conjugate gradient with Hager-Zhang.
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        Func<double[], double[]>? grad = null,
        ConjugateGradientOptions? options = null)
    {
        var opts = options ?? new ConjugateGradientOptions();
        var gradFunc = grad ?? FiniteDiff.MakeGradient(f);

        int restartInterval = opts.RestartInterval ?? x0.Length;

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

        // Initial direction: steepest descent
        double[] d = VecOps.Negate(gx);

        for (int iter = 0; iter < opts.MaxIterations; iter++)
        {
            // Hager-Zhang line search
            var lsResult = HagerZhang.HagerZhangLineSearch(f, gradFunc, x, d, fx, gx);
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

            // Check convergence
            double[] s = VecOps.Sub(xNew, x);
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

            // Compute Hager-Zhang beta
            double[] y = VecOps.Sub(gNew, gx);
            double dy = VecOps.Dot(d, y);

            double beta = 0;
            if (Math.Abs(dy) > 1e-14)
            {
                double yg = VecOps.Dot(y, gNew);
                double yy = VecOps.Dot(y, y);
                double dg = VecOps.Dot(d, gNew);

                double betaHZ = (yg - 2 * yy * dg / dy) / dy;

                // Apply eta guarantee
                double dNorm = VecOps.Norm(d);
                double gNormOld = VecOps.Norm(gx);
                double etaMin = Math.Min(opts.Eta, gNormOld);
                double betaMin = -1.0 / (dNorm * etaMin);

                beta = Math.Max(betaHZ, betaMin);
            }

            // Update direction
            d = VecOps.AddScaled(VecOps.Negate(gNew), d, beta);

            // Descent safety: restart if not a descent direction
            if (VecOps.Dot(d, gNew) >= 0)
            {
                d = VecOps.Negate(gNew);
            }

            // Periodic restart
            if ((iter + 1) % restartInterval == 0)
            {
                d = VecOps.Negate(gNew);
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
}
