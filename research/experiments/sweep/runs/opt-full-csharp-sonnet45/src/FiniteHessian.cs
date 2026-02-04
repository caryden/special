namespace Optimization;

/// <summary>
/// Estimate the Hessian matrix via finite differences.
/// </summary>
public static class FiniteHessian
{
    private const double MachineEpsilon = 2.220446049250313e-16;

    public static double[][] FiniteDiffHessian(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[][] H = new double[n][];
        for (int i = 0; i < n; i++) H[i] = new double[n];

        double f0 = f(x);
        double[] xp = (double[])x.Clone();

        // Step size: eps^(1/4)
        double epsFourth = Math.Pow(MachineEpsilon, 0.25);

        double[] h = new double[n];
        for (int i = 0; i < n; i++)
            h[i] = epsFourth * Math.Max(Math.Abs(x[i]), 1.0);

        // Diagonal entries
        for (int i = 0; i < n; i++)
        {
            double xi = xp[i];
            xp[i] = xi + h[i];
            double fp = f(xp);
            xp[i] = xi - h[i];
            double fm = f(xp);
            xp[i] = xi;
            H[i][i] = (fp - 2 * f0 + fm) / (h[i] * h[i]);
        }

        // Off-diagonal entries (upper triangle, then mirror)
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                double xi = xp[i], xj = xp[j];

                xp[i] = xi + h[i]; xp[j] = xj + h[j];
                double fpp = f(xp);
                xp[j] = xj - h[j];
                double fpm = f(xp);
                xp[i] = xi - h[i]; xp[j] = xj + h[j];
                double fmp = f(xp);
                xp[j] = xj - h[j];
                double fmm = f(xp);

                xp[i] = xi; xp[j] = xj;
                H[i][j] = (fpp - fpm - fmp + fmm) / (4 * h[i] * h[j]);
                H[j][i] = H[i][j];
            }
        }

        return H;
    }

    public static double[] HessianVectorProduct(
        Func<double[], double[]> grad, double[] x, double[] v, double[] gx)
    {
        double epsFourth = Math.Pow(MachineEpsilon, 0.25);
        double vNorm = VecOps.Norm(v);
        double hStep = epsFourth * Math.Max(vNorm, 1.0);

        double[] xph = VecOps.AddScaled(x, v, hStep);
        double[] gph = grad(xph);

        double[] Hv = new double[x.Length];
        for (int i = 0; i < x.Length; i++)
            Hv[i] = (gph[i] - gx[i]) / hStep;
        return Hv;
    }
}
