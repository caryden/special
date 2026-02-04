namespace Optimization;

/// <summary>
/// Hessian matrix estimation via finite differences.
/// </summary>
public static class FiniteHessian
{
    private const double EPS = 2.22e-16; // Machine epsilon

    /// <summary>
    /// Compute the full n x n Hessian matrix using central differences.
    /// Step size: h = eps^(1/4) * max(|x_i|, 1) ≈ 1.22e-4
    /// Cost: 1 + 2n + n*(n-1) function evaluations.
    /// </summary>
    public static double[][] FiniteDiffHessian(Func<double[], double> f, double[] x)
    {
        int n = x.Length;
        double[][] H = new double[n][];
        for (int i = 0; i < n; i++)
        {
            H[i] = new double[n];
        }

        double fx = f(x);
        double h0 = Math.Pow(EPS, 0.25);

        // Diagonal elements
        for (int i = 0; i < n; i++)
        {
            double h = h0 * Math.Max(Math.Abs(x[i]), 1.0);
            double[] xPlus = VecOps.Clone(x);
            double[] xMinus = VecOps.Clone(x);
            xPlus[i] += h;
            xMinus[i] -= h;
            double fPlus = f(xPlus);
            double fMinus = f(xMinus);
            H[i][i] = (fPlus - 2 * fx + fMinus) / (h * h);
        }

        // Off-diagonal elements (upper triangle only, then mirror)
        for (int i = 0; i < n; i++)
        {
            double hi = h0 * Math.Max(Math.Abs(x[i]), 1.0);
            for (int j = i + 1; j < n; j++)
            {
                double hj = h0 * Math.Max(Math.Abs(x[j]), 1.0);

                double[] xpp = VecOps.Clone(x);
                xpp[i] += hi;
                xpp[j] += hj;

                double[] xpm = VecOps.Clone(x);
                xpm[i] += hi;
                xpm[j] -= hj;

                double[] xmp = VecOps.Clone(x);
                xmp[i] -= hi;
                xmp[j] += hj;

                double[] xmm = VecOps.Clone(x);
                xmm[i] -= hi;
                xmm[j] -= hj;

                double fpp = f(xpp);
                double fpm = f(xpm);
                double fmp = f(xmp);
                double fmm = f(xmm);

                H[i][j] = (fpp - fpm - fmp + fmm) / (4 * hi * hj);
                H[j][i] = H[i][j]; // Symmetry
            }
        }

        return H;
    }

    /// <summary>
    /// Approximate H*v using finite differences of the gradient:
    /// Hv ≈ (grad(x + h*v) - grad(x)) / h
    /// Step size: h = eps^(1/4) * max(||v||, 1)
    /// Cost: 1 gradient evaluation (gx is provided by caller).
    /// </summary>
    public static double[] HessianVectorProduct(
        Func<double[], double[]> grad,
        double[] x,
        double[] v,
        double[] gx)
    {
        double h = Math.Pow(EPS, 0.25) * Math.Max(VecOps.Norm(v), 1.0);
        double[] xPlusHv = VecOps.AddScaled(x, v, h);
        double[] gPlusHv = grad(xPlusHv);
        return VecOps.Scale(VecOps.Sub(gPlusHv, gx), 1.0 / h);
    }
}
