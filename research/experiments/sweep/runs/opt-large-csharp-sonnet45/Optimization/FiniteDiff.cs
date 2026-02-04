namespace Optimization;

/// <summary>
/// Numerical gradient approximation via finite differences.
/// </summary>
public static class FiniteDiff
{
    private const double EPS = 2.22e-16; // Machine epsilon

    /// <summary>
    /// Forward difference gradient: (f(x+h*e_i) - f(x)) / h per component.
    /// Step size: h = sqrt(eps) * max(|x_i|, 1)
    /// </summary>
    public static double[] ForwardDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[] grad = new double[n];
        double fx = f(x);

        for (int i = 0; i < n; i++)
        {
            double h = Math.Sqrt(EPS) * Math.Max(Math.Abs(x[i]), 1.0);
            double[] xh = VecOps.Clone(x);
            xh[i] += h;
            double fxh = f(xh);
            grad[i] = (fxh - fx) / h;
        }

        return grad;
    }

    /// <summary>
    /// Central difference gradient: (f(x+h*e_i) - f(x-h*e_i)) / (2h) per component.
    /// Step size: h = cbrt(eps) * max(|x_i|, 1)
    /// </summary>
    public static double[] CentralDiffGradient(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[] grad = new double[n];

        for (int i = 0; i < n; i++)
        {
            double h = Math.Pow(EPS, 1.0 / 3.0) * Math.Max(Math.Abs(x[i]), 1.0);
            double[] xPlus = VecOps.Clone(x);
            double[] xMinus = VecOps.Clone(x);
            xPlus[i] += h;
            xMinus[i] -= h;
            double fPlus = f(xPlus);
            double fMinus = f(xMinus);
            grad[i] = (fPlus - fMinus) / (2 * h);
        }

        return grad;
    }

    /// <summary>
    /// Factory: returns a gradient function using the specified method.
    /// </summary>
    public static Func<double[], double[]> MakeGradient(
        Func<double[], double> f,
        string method = "forward")
    {
        return method switch
        {
            "forward" => (x) => ForwardDiffGradient(f, x),
            "central" => (x) => CentralDiffGradient(f, x),
            _ => throw new ArgumentException($"Unknown method: {method}")
        };
    }
}
