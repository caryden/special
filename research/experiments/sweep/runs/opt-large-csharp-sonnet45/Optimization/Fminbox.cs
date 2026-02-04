namespace Optimization;

/// <summary>
/// Options for box-constrained optimization.
/// </summary>
public class FminboxOptions : OptimizeOptions
{
    public double[]? Lower { get; set; }
    public double[]? Upper { get; set; }
    public string Method { get; set; } = "l-bfgs";
    public double? Mu0 { get; set; }
    public double MuFactor { get; set; } = 0.001;
    public int OuterIterations { get; set; } = 20;
    public double OuterGradTol { get; set; } = 1e-8;
}

/// <summary>
/// Box-constrained optimization via logarithmic barrier method.
/// </summary>
public static class Fminbox
{
    /// <summary>
    /// Minimize a function subject to box constraints: lower <= x <= upper.
    /// Uses logarithmic barrier method with inner unconstrained optimization.
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        Func<double[], double[]> grad,
        FminboxOptions? options = null)
    {
        var opts = options ?? new FminboxOptions();
        int n = x0.Length;

        // Set up bounds
        double[] lower = opts.Lower ?? Enumerable.Repeat(double.NegativeInfinity, n).ToArray();
        double[] upper = opts.Upper ?? Enumerable.Repeat(double.PositiveInfinity, n).ToArray();

        // Validate bounds
        for (int i = 0; i < n; i++)
        {
            if (lower[i] >= upper[i])
            {
                return new OptimizeResult
                {
                    X = x0,
                    Fun = double.NaN,
                    Gradient = null,
                    Iterations = 0,
                    FunctionCalls = 0,
                    GradientCalls = 0,
                    Converged = false,
                    Message = "Invalid bounds: lower must be less than upper"
                };
            }
        }

        // Nudge initial point to strict interior
        double[] x = NudgeToInterior(x0, lower, upper);

        // Compute initial mu if not provided
        double mu;
        if (opts.Mu0.HasValue)
        {
            mu = opts.Mu0.Value;
        }
        else
        {
            double[] gf = grad(x);
            double[] gb = BarrierGradient(x, lower, upper);
            double gfNorm = VecOps.NormInf(gf);
            double gbNorm = VecOps.NormInf(gb);
            mu = gbNorm > 0 ? opts.MuFactor * gfNorm / gbNorm : 1.0;
        }

        int totalFunctionCalls = 0;
        int totalGradientCalls = 0;

        for (int outerIter = 0; outerIter < opts.OuterIterations; outerIter++)
        {
            // Create barrier-augmented objective
            Func<double[], double> fAug = (xVal) => f(xVal) + mu * BarrierValue(xVal, lower, upper);
            Func<double[], double[]> gradAug = (xVal) =>
            {
                double[] gf = grad(xVal);
                double[] gb = BarrierGradient(xVal, lower, upper);
                return VecOps.Add(gf, VecOps.Scale(gb, mu));
            };

            // Run inner optimizer
            OptimizeResult innerResult;
            if (opts.Method == "bfgs")
            {
                innerResult = BFGS.Minimize(fAug, x, gradAug, opts);
            }
            else if (opts.Method == "l-bfgs")
            {
                var lbfgsOpts = new LBFGSOptions
                {
                    GradTol = opts.GradTol,
                    StepTol = opts.StepTol,
                    FuncTol = opts.FuncTol,
                    MaxIterations = opts.MaxIterations
                };
                innerResult = LBFGS.Minimize(fAug, x, gradAug, lbfgsOpts);
            }
            else if (opts.Method == "conjugate-gradient")
            {
                var cgOpts = new ConjugateGradientOptions
                {
                    GradTol = opts.GradTol,
                    StepTol = opts.StepTol,
                    FuncTol = opts.FuncTol,
                    MaxIterations = opts.MaxIterations
                };
                innerResult = ConjugateGradient.Minimize(fAug, x, gradAug, cgOpts);
            }
            else
            {
                throw new ArgumentException($"Unknown method: {opts.Method}");
            }

            totalFunctionCalls += innerResult.FunctionCalls;
            totalGradientCalls += innerResult.GradientCalls;

            // Clamp result to strict interior
            x = ClampToInterior(innerResult.X, lower, upper);

            // Check projected gradient norm of original objective
            double[] gOrig = grad(x);
            double projGradNorm = ProjectedGradientNorm(x, gOrig, lower, upper);

            if (projGradNorm < opts.OuterGradTol)
            {
                return new OptimizeResult
                {
                    X = x,
                    Fun = f(x),
                    Gradient = gOrig,
                    Iterations = outerIter + 1,
                    FunctionCalls = totalFunctionCalls,
                    GradientCalls = totalGradientCalls,
                    Converged = true,
                    Message = "Converged: projected gradient norm below tolerance"
                };
            }

            // Reduce barrier multiplier
            mu *= opts.MuFactor;
        }

        return new OptimizeResult
        {
            X = x,
            Fun = f(x),
            Gradient = grad(x),
            Iterations = opts.OuterIterations,
            FunctionCalls = totalFunctionCalls,
            GradientCalls = totalGradientCalls,
            Converged = false,
            Message = "Terminated: maximum outer iterations reached"
        };
    }

    /// <summary>
    /// Compute barrier value: sum(-log(x_i - l_i) - log(u_i - x_i)).
    /// Returns Infinity if x is outside the box.
    /// </summary>
    public static double BarrierValue(double[] x, double[] lower, double[] upper)
    {
        double value = 0;
        for (int i = 0; i < x.Length; i++)
        {
            if (!double.IsNegativeInfinity(lower[i]))
            {
                double d = x[i] - lower[i];
                if (d <= 0) return double.PositiveInfinity;
                value -= Math.Log(d);
            }
            if (!double.IsPositiveInfinity(upper[i]))
            {
                double d = upper[i] - x[i];
                if (d <= 0) return double.PositiveInfinity;
                value -= Math.Log(d);
            }
        }
        return value;
    }

    /// <summary>
    /// Compute barrier gradient: component i is -1/(x_i - l_i) + 1/(u_i - x_i).
    /// </summary>
    public static double[] BarrierGradient(double[] x, double[] lower, double[] upper)
    {
        double[] grad = new double[x.Length];
        for (int i = 0; i < x.Length; i++)
        {
            grad[i] = 0;
            if (!double.IsNegativeInfinity(lower[i]))
            {
                grad[i] -= 1.0 / (x[i] - lower[i]);
            }
            if (!double.IsPositiveInfinity(upper[i]))
            {
                grad[i] += 1.0 / (upper[i] - x[i]);
            }
        }
        return grad;
    }

    /// <summary>
    /// Compute projected gradient norm: infinity norm of x - clamp(x - g, lower, upper).
    /// </summary>
    public static double ProjectedGradientNorm(double[] x, double[] g, double[] lower, double[] upper)
    {
        double maxVal = 0;
        for (int i = 0; i < x.Length; i++)
        {
            double projected = x[i] - g[i];
            projected = Math.Max(lower[i], Math.Min(projected, upper[i]));
            double diff = Math.Abs(x[i] - projected);
            if (diff > maxVal) maxVal = diff;
        }
        return maxVal;
    }

    private static double[] NudgeToInterior(double[] x, double[] lower, double[] upper)
    {
        double[] result = VecOps.Clone(x);
        for (int i = 0; i < x.Length; i++)
        {
            if (result[i] <= lower[i])
            {
                if (double.IsPositiveInfinity(upper[i]))
                {
                    result[i] = lower[i] + 1.0;
                }
                else
                {
                    result[i] = 0.99 * lower[i] + 0.01 * upper[i];
                }
            }
            else if (result[i] >= upper[i])
            {
                if (double.IsNegativeInfinity(lower[i]))
                {
                    result[i] = upper[i] - 1.0;
                }
                else
                {
                    result[i] = 0.01 * lower[i] + 0.99 * upper[i];
                }
            }
        }
        return result;
    }

    private static double[] ClampToInterior(double[] x, double[] lower, double[] upper)
    {
        double[] result = new double[x.Length];
        for (int i = 0; i < x.Length; i++)
        {
            double range = upper[i] - lower[i];
            double epsilon = double.IsInfinity(range) ? 1e-8 : 1e-8 * range;
            result[i] = Math.Max(lower[i] + epsilon, Math.Min(x[i], upper[i] - epsilon));
        }
        return result;
    }
}
