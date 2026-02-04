namespace Optimization;

/// <summary>
/// Approximate gradients numerically via finite differences.
/// </summary>
public static class FiniteDiff
{
    private const double MachineEpsilon = 2.220446049250313e-16;

    public static double[] ForwardDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double fx = f(x);
        double[] grad = new double[n];
        double[] xp = (double[])x.Clone();

        for (int i = 0; i < n; i++)
        {
            double h = Math.Sqrt(MachineEpsilon) * Math.Max(Math.Abs(x[i]), 1.0);
            double xi = xp[i];
            xp[i] = xi + h;
            grad[i] = (f(xp) - fx) / h;
            xp[i] = xi;
        }
        return grad;
    }

    public static double[] CentralDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[] grad = new double[n];
        double[] xp = (double[])x.Clone();

        for (int i = 0; i < n; i++)
        {
            double h = Math.Cbrt(MachineEpsilon) * Math.Max(Math.Abs(x[i]), 1.0);
            double xi = xp[i];
            xp[i] = xi + h;
            double fp = f(xp);
            xp[i] = xi - h;
            double fm = f(xp);
            grad[i] = (fp - fm) / (2 * h);
            xp[i] = xi;
        }
        return grad;
    }

    public static Func<double[], double[]> MakeGradient(Func<double[], double> f, string method = "forward")
    {
        if (method == "central")
            return x => CentralDiffGradient(f, x);
        return x => ForwardDiffGradient(f, x);
    }
}
