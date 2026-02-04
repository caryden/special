namespace Optimization;

/// <summary>
/// Full-memory BFGS quasi-Newton optimizer.
/// </summary>
public static class Bfgs
{
    /// <summary>Create an n×n identity matrix as array of row arrays</summary>
    private static double[][] IdentityMatrix(int n)
    {
        double[][] matrix = new double[n][];
        for (int i = 0; i < n; i++)
        {
            matrix[i] = new double[n];
            matrix[i][i] = 1.0;
        }
        return matrix;
    }

    /// <summary>Matrix-vector multiplication (M is array of rows)</summary>
    private static double[] MatVecMul(double[][] M, double[] v)
    {
        int n = M.Length;
        double[] result = new double[n];
        for (int i = 0; i < n; i++)
        {
            result[i] = VecOps.Dot(M[i], v);
        }
        return result;
    }

    /// <summary>Apply BFGS inverse Hessian update formula</summary>
    private static double[][] BfgsUpdate(double[][] H, double[] s, double[] y, double rho)
    {
        int n = H.Length;

        // Compute I - ρ*s*y^T
        double[][] I_rho_sy = IdentityMatrix(n);
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                I_rho_sy[i][j] -= rho * s[i] * y[j];
            }
        }

        // Compute I - ρ*y*s^T
        double[][] I_rho_ys = IdentityMatrix(n);
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                I_rho_ys[i][j] -= rho * y[i] * s[j];
            }
        }

        // Compute (I - ρ*s*y^T) * H
        double[][] temp = new double[n][];
        for (int i = 0; i < n; i++)
        {
            temp[i] = new double[n];
            for (int j = 0; j < n; j++)
            {
                temp[i][j] = 0.0;
                for (int k = 0; k < n; k++)
                {
                    temp[i][j] += I_rho_sy[i][k] * H[k][j];
                }
            }
        }

        // Compute temp * (I - ρ*y*s^T)
        double[][] H_new = new double[n][];
        for (int i = 0; i < n; i++)
        {
            H_new[i] = new double[n];
            for (int j = 0; j < n; j++)
            {
                H_new[i][j] = 0.0;
                for (int k = 0; k < n; k++)
                {
                    H_new[i][j] += temp[i][k] * I_rho_ys[k][j];
                }
            }
        }

        // Add ρ*s*s^T
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                H_new[i][j] += rho * s[i] * s[j];
            }
        }

        return H_new;
    }

    /// <summary>
    /// Minimize a function using BFGS quasi-Newton method.
    /// Nocedal & Wright, Chapter 6 (Eq. 6.17)
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        Func<double[], double[]>? grad = null,
        OptimizeOptions? options = null)
    {
        options ??= ResultTypes.DefaultOptions();
        int n = x0.Length;

        // Use finite differences if no gradient provided
        Func<double[], double[]> gradient = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));

        // Initialize
        double[] x = VecOps.Clone(x0);
        double fx = f(x);
        double[] gx = gradient(x);

        int functionCalls = 1;
        int gradientCalls = 1;

        // Check if already at minimum
        double gradNorm = VecOps.Norm(gx);
        if (gradNorm < options.GradTol)
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
                Message = ResultTypes.ConvergenceMessage(new ConvergenceReason.Gradient())
            };
        }

        double[][] H = IdentityMatrix(n);

        for (int iteration = 1; iteration <= options.MaxIterations; iteration++)
        {
            // Compute search direction: d = -H * g
            double[] d = VecOps.Negate(MatVecMul(H, gx));

            // Strong Wolfe line search
            var lsResult = LineSearch.WolfeLineSearch(f, gradient, x, d, fx, gx);
            functionCalls += lsResult.FunctionCalls;
            gradientCalls += lsResult.GradientCalls;

            if (!lsResult.Success)
            {
                return new OptimizeResult
                {
                    X = x,
                    Fun = fx,
                    Gradient = gx,
                    Iterations = iteration,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Converged = false,
                    Message = ResultTypes.ConvergenceMessage(new ConvergenceReason.LineSearchFailed())
                };
            }

            // Update position
            double[] xNew = VecOps.AddScaled(x, d, lsResult.Alpha);
            double fNew = lsResult.FNew;
            double[] gNew = lsResult.GNew ?? gradient(xNew);
            if (lsResult.GNew == null)
            {
                gradientCalls++;
            }

            // Compute s and y for BFGS update
            double[] s = VecOps.Sub(xNew, x);
            double[] y = VecOps.Sub(gNew, gx);

            // Check convergence
            double stepNorm = VecOps.Norm(s);
            double funcChange = Math.Abs(fNew - fx);
            gradNorm = VecOps.Norm(gNew);

            var reason = ResultTypes.CheckConvergence(gradNorm, stepNorm, funcChange, iteration, options);
            if (reason != null)
            {
                return new OptimizeResult
                {
                    X = xNew,
                    Fun = fNew,
                    Gradient = gNew,
                    Iterations = iteration,
                    FunctionCalls = functionCalls,
                    GradientCalls = gradientCalls,
                    Converged = ResultTypes.IsConverged(reason),
                    Message = ResultTypes.ConvergenceMessage(reason)
                };
            }

            // Curvature guard: only update H if y^T*s > 1e-10
            double yTs = VecOps.Dot(y, s);
            if (yTs > 1e-10)
            {
                double rho = 1.0 / yTs;
                H = BfgsUpdate(H, s, y, rho);
            }

            // Move to next iteration
            x = xNew;
            fx = fNew;
            gx = gNew;
        }

        // Reached max iterations
        return new OptimizeResult
        {
            X = x,
            Fun = fx,
            Gradient = gx,
            Iterations = options.MaxIterations,
            FunctionCalls = functionCalls,
            GradientCalls = gradientCalls,
            Converged = false,
            Message = ResultTypes.ConvergenceMessage(new ConvergenceReason.MaxIterations())
        };
    }
}
