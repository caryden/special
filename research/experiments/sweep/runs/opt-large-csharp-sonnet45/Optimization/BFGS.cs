namespace Optimization;

/// <summary>
/// Full-memory BFGS quasi-Newton optimizer.
/// </summary>
public static class BFGS
{
    /// <summary>
    /// Minimize a function using BFGS with full Hessian approximation.
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        Func<double[], double[]>? grad = null,
        OptimizeOptions? options = null)
    {
        var opts = options ?? new OptimizeOptions();
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

        // Initialize inverse Hessian as identity
        double[][] H = IdentityMatrix(x.Length);

        for (int iter = 0; iter < opts.MaxIterations; iter++)
        {
            // Compute search direction
            double[] d = VecOps.Negate(MatVecMul(H, gx));

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

            // Update Hessian approximation if curvature condition satisfied
            if (ys > 1e-10)
            {
                double rho = 1.0 / ys;
                H = BFGSUpdate(H, s, y, rho);
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

    private static double[][] IdentityMatrix(int n)
    {
        double[][] I = new double[n][];
        for (int i = 0; i < n; i++)
        {
            I[i] = new double[n];
            I[i][i] = 1.0;
        }
        return I;
    }

    private static double[] MatVecMul(double[][] M, double[] v)
    {
        int n = M.Length;
        double[] result = new double[n];
        for (int i = 0; i < n; i++)
        {
            double sum = 0;
            for (int j = 0; j < n; j++)
            {
                sum += M[i][j] * v[j];
            }
            result[i] = sum;
        }
        return result;
    }

    private static double[][] BFGSUpdate(double[][] H, double[] s, double[] y, double rho)
    {
        int n = H.Length;
        double[][] HNew = new double[n][];

        // Compute H * y
        double[] Hy = MatVecMul(H, y);

        // BFGS formula: H_{k+1} = (I - rho*s*y^T) * H * (I - rho*y*s^T) + rho*s*s^T
        // Simplified: H_{k+1} = H - rho*s*y^T*H - rho*H*y*s^T + rho^2*s*y^T*H*y*s^T + rho*s*s^T

        double yHy = VecOps.Dot(y, Hy);

        for (int i = 0; i < n; i++)
        {
            HNew[i] = new double[n];
            for (int j = 0; j < n; j++)
            {
                HNew[i][j] = H[i][j]
                    - rho * s[i] * Hy[j]
                    - rho * Hy[i] * s[j]
                    + rho * rho * yHy * s[i] * s[j]
                    + rho * s[i] * s[j];
            }
        }

        return HNew;
    }
}
