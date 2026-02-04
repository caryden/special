namespace Optimization;

/// <summary>
/// Finite difference gradient approximation methods.
/// </summary>
public static class FiniteDiff
{
    private const double MachineEpsilon = 2.22e-16;

    /// <summary>
    /// Approximate gradient using forward differences.
    /// Step size: h = √ε × max(|xᵢ|, 1)
    /// </summary>
    public static double[] ForwardDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[] gradient = new double[n];
        double fx = f(x);

        for (int i = 0; i < n; i++)
        {
            double h = Math.Sqrt(MachineEpsilon) * Math.Max(Math.Abs(x[i]), 1.0);
            double[] xPlusH = VecOps.Clone(x);
            xPlusH[i] += h;

            double fPlusH = f(xPlusH);
            gradient[i] = (fPlusH - fx) / h;
        }

        return gradient;
    }

    /// <summary>
    /// Approximate gradient using central differences.
    /// Step size: h = ∛ε × max(|xᵢ|, 1)
    /// </summary>
    public static double[] CentralDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[] gradient = new double[n];

        for (int i = 0; i < n; i++)
        {
            double h = Math.Pow(MachineEpsilon, 1.0 / 3.0) * Math.Max(Math.Abs(x[i]), 1.0);
            double[] xPlusH = VecOps.Clone(x);
            double[] xMinusH = VecOps.Clone(x);
            xPlusH[i] += h;
            xMinusH[i] -= h;

            double fPlusH = f(xPlusH);
            double fMinusH = f(xMinusH);
            gradient[i] = (fPlusH - fMinusH) / (2.0 * h);
        }

        return gradient;
    }

    /// <summary>
    /// Factory function that returns a gradient function using the specified method.
    /// </summary>
    public static Func<double[], double[]> MakeGradient(
        Func<double[], double> f,
        string method = "forward")
    {
        return method switch
        {
            "central" => x => CentralDiffGradient(f, x),
            "forward" => x => ForwardDiffGradient(f, x),
            _ => throw new ArgumentException($"Unknown method: {method}")
        };
    }
}
