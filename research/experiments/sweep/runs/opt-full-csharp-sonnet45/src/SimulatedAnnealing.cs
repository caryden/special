namespace Optimization;

public static class SimulatedAnnealing
{
    public static double LogTemperature(int k)
    {
        return 1.0 / Math.Log(k);
    }

    public static double[] GaussianNeighbor(double[] x, Func<double> rng)
    {
        double[] proposal = new double[x.Length];
        for (int i = 0; i < x.Length; i++)
            proposal[i] = x[i] + BoxMullerNormal(rng);
        return proposal;
    }

    private static double BoxMullerNormal(Func<double> rng)
    {
        double u1 = rng();
        while (u1 == 0) u1 = rng();
        double u2 = rng();
        return Math.Sqrt(-2 * Math.Log(u1)) * Math.Cos(2 * Math.PI * u2);
    }

    public static Func<double> Mulberry32(int seed)
    {
        int s = seed;
        return () =>
        {
            s = unchecked(s + 0x6d2b79f5);
            int t = unchecked((int)((uint)(s ^ ((uint)s >> 15)) * (uint)(1 | s)));
            t = unchecked(t + (int)((uint)(t ^ ((uint)t >> 7)) * (uint)(61 | t))) ^ t;
            return (uint)(t ^ ((uint)t >> 14)) / 4294967296.0;
        };
    }

    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        OptimizeOptions? options = null,
        Func<int, double>? temperature = null,
        Func<double[], Func<double>, double[]>? neighbor = null,
        int? seed = null)
    {
        var opts = ResultTypes.MergeOptions(options);
        int maxIter = opts.MaxIterations;
        var tempFn = temperature ?? LogTemperature;
        var neighborFn = neighbor ?? GaussianNeighbor;
        Func<double> rng = seed.HasValue ? Mulberry32(seed.Value) : new Random().NextDouble;

        double[] xCurrent = (double[])x0.Clone();
        double fCurrent = f(xCurrent);
        double[] xBest = (double[])xCurrent.Clone();
        double fBest = fCurrent;
        int functionCalls = 1;

        for (int k = 1; k <= maxIter; k++)
        {
            double t = tempFn(k);
            double[] xProposal = neighborFn(xCurrent, rng);
            double fProposal = f(xProposal);
            functionCalls++;

            if (fProposal <= fCurrent)
            {
                xCurrent = xProposal;
                fCurrent = fProposal;
                if (fProposal < fBest)
                {
                    xBest = (double[])xProposal.Clone();
                    fBest = fProposal;
                }
            }
            else
            {
                double p = Math.Exp(-(fProposal - fCurrent) / t);
                if (rng() <= p)
                {
                    xCurrent = xProposal;
                    fCurrent = fProposal;
                }
            }
        }

        return new OptimizeResult
        {
            X = xBest, Fun = fBest, Gradient = Array.Empty<double>(),
            Iterations = maxIter, FunctionCalls = functionCalls, GradientCalls = 0,
            Converged = true, Message = $"Completed {maxIter} iterations"
        };
    }
}
