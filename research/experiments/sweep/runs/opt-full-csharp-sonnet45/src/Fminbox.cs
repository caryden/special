namespace Optimization;

public static class Fminbox
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]> grad,
        double[]? lower = null, double[]? upper = null,
        string method = "l-bfgs", double? mu0 = null,
        double muFactor = 0.001, int outerIterations = 20,
        double outerGradTol = 1e-8, OptimizeOptions? innerOptions = null)
    {
        int n = x0.Length;
        lower ??= Enumerable.Repeat(double.NegativeInfinity, n).ToArray();
        upper ??= Enumerable.Repeat(double.PositiveInfinity, n).ToArray();

        for (int i = 0; i < n; i++)
        {
            if (lower[i] >= upper[i])
            {
                return new OptimizeResult
                {
                    X = (double[])x0.Clone(), Fun = f(x0), Gradient = grad(x0),
                    Iterations = 0, FunctionCalls = 1, GradientCalls = 1,
                    Converged = false, Message = "Invalid bounds: lower >= upper"
                };
            }
        }

        double[] x = (double[])x0.Clone();
        for (int i = 0; i < n; i++)
        {
            if (x[i] <= lower[i] || x[i] >= upper[i])
            {
                if (x[i] <= lower[i])
                {
                    x[i] = double.IsFinite(lower[i]) && double.IsFinite(upper[i])
                        ? 0.99 * lower[i] + 0.01 * upper[i]
                        : double.IsFinite(lower[i]) ? lower[i] + 1.0 : 0.0;
                }
                else
                {
                    x[i] = double.IsFinite(lower[i]) && double.IsFinite(upper[i])
                        ? 0.01 * lower[i] + 0.99 * upper[i]
                        : double.IsFinite(upper[i]) ? upper[i] - 1.0 : 0.0;
                }
            }
        }

        int functionCalls = 0;
        int gradientCalls = 0;

        double fx = f(x);
        double[] gx = grad(x);
        functionCalls++;
        gradientCalls++;

        double mu;
        if (mu0.HasValue)
        {
            mu = mu0.Value;
        }
        else
        {
            double objGradNorm = gx.Sum(g => Math.Abs(g));
            double[] bg = BarrierGradient(x, lower, upper);
            double barGradNorm = bg.Sum(g => Math.Abs(g));
            mu = barGradNorm > 0 ? muFactor * objGradNorm / barGradNorm : 1e-4;
        }

        double pgn = ProjectedGradientNorm(x, gx, lower, upper);
        if (pgn <= outerGradTol)
        {
            return new OptimizeResult
            {
                X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                Iterations = 0, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                Converged = true, Message = "Converged: projected gradient norm below tolerance"
            };
        }

        var opts = ResultTypes.MergeOptions(innerOptions);

        int outerIter = 0;
        double[] lo = lower, hi = upper;
        for (outerIter = 1; outerIter <= outerIterations; outerIter++)
        {
            double currentMu = mu;

            Func<double[], double> barrierF = xp =>
            {
                double bv = BarrierValue(xp, lo, hi);
                if (!double.IsFinite(bv)) return double.PositiveInfinity;
                return f(xp) + currentMu * bv;
            };

            Func<double[], double[]> barrierGrad = xp =>
            {
                double[] gObj = grad(xp);
                double[] gBar = BarrierGradient(xp, lo, hi);
                double[] result = new double[n];
                for (int i = 0; i < n; i++) result[i] = gObj[i] + currentMu * gBar[i];
                return result;
            };

            OptimizeResult innerResult = method switch
            {
                "bfgs" => Bfgs.Minimize(barrierF, x, barrierGrad, opts),
                "l-bfgs" => LBfgs.Minimize(barrierF, x, barrierGrad, opts),
                "conjugate-gradient" => ConjugateGradient.Minimize(barrierF, x, barrierGrad, opts),
                "gradient-descent" => GradientDescent.Minimize(barrierF, x, barrierGrad, opts),
                _ => LBfgs.Minimize(barrierF, x, barrierGrad, opts)
            };

            x = innerResult.X;
            for (int i = 0; i < n; i++)
            {
                if (double.IsFinite(lower[i])) x[i] = Math.Max(lower[i] + 1e-15, x[i]);
                if (double.IsFinite(upper[i])) x[i] = Math.Min(upper[i] - 1e-15, x[i]);
            }

            fx = f(x);
            gx = grad(x);
            functionCalls += innerResult.FunctionCalls + 1;
            gradientCalls += innerResult.GradientCalls + 1;

            pgn = ProjectedGradientNorm(x, gx, lower, upper);
            if (pgn <= outerGradTol)
            {
                return new OptimizeResult
                {
                    X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                    Iterations = outerIter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = true, Message = "Converged: projected gradient norm below tolerance"
                };
            }

            mu *= muFactor;
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = outerIter - 1, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = $"Stopped: reached maximum outer iterations ({outerIterations})"
        };
    }

    public static double BarrierValue(double[] x, double[] lower, double[] upper)
    {
        double val = 0;
        for (int i = 0; i < x.Length; i++)
        {
            if (double.IsFinite(lower[i]))
            {
                double d = x[i] - lower[i];
                if (d <= 0) return double.PositiveInfinity;
                val -= Math.Log(d);
            }
            if (double.IsFinite(upper[i]))
            {
                double d = upper[i] - x[i];
                if (d <= 0) return double.PositiveInfinity;
                val -= Math.Log(d);
            }
        }
        return val;
    }

    public static double[] BarrierGradient(double[] x, double[] lower, double[] upper)
    {
        double[] g = new double[x.Length];
        for (int i = 0; i < x.Length; i++)
        {
            if (double.IsFinite(lower[i])) g[i] += -1.0 / (x[i] - lower[i]);
            if (double.IsFinite(upper[i])) g[i] += 1.0 / (upper[i] - x[i]);
        }
        return g;
    }

    public static double ProjectedGradientNorm(double[] x, double[] g, double[] lower, double[] upper)
    {
        double maxVal = 0;
        for (int i = 0; i < x.Length; i++)
        {
            double projected = x[i] - Math.Max(lower[i], Math.Min(upper[i], x[i] - g[i]));
            maxVal = Math.Max(maxVal, Math.Abs(projected));
        }
        return maxVal;
    }
}
