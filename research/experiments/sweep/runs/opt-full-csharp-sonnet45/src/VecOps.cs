namespace Optimization;

/// <summary>
/// Pure vector arithmetic for n-dimensional optimization.
/// All operations return new arrays and never mutate inputs.
/// </summary>
public static class VecOps
{
    public static double Dot(double[] a, double[] b)
    {
        double sum = 0;
        for (int i = 0; i < a.Length; i++) sum += a[i] * b[i];
        return sum;
    }

    public static double Norm(double[] v)
    {
        return Math.Sqrt(Dot(v, v));
    }

    public static double NormInf(double[] v)
    {
        double max = 0;
        for (int i = 0; i < v.Length; i++)
        {
            double abs = Math.Abs(v[i]);
            if (abs > max) max = abs;
        }
        return max;
    }

    public static double[] Scale(double[] v, double s)
    {
        double[] result = new double[v.Length];
        for (int i = 0; i < v.Length; i++) result[i] = v[i] * s;
        return result;
    }

    public static double[] Add(double[] a, double[] b)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++) result[i] = a[i] + b[i];
        return result;
    }

    public static double[] Sub(double[] a, double[] b)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++) result[i] = a[i] - b[i];
        return result;
    }

    public static double[] Negate(double[] v)
    {
        return Scale(v, -1);
    }

    public static double[] Clone(double[] v)
    {
        return (double[])v.Clone();
    }

    public static double[] Zeros(int n)
    {
        return new double[n];
    }

    public static double[] AddScaled(double[] a, double[] b, double s)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++) result[i] = a[i] + s * b[i];
        return result;
    }
}
