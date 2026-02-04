namespace Optimization;

/// <summary>
/// Pure vector arithmetic for n-dimensional optimization.
/// All operations return new arrays and never mutate inputs.
/// </summary>
public static class VecOps
{
    /// <summary>Dot product of two vectors.</summary>
    public static double Dot(double[] a, double[] b)
    {
        double sum = 0;
        for (int i = 0; i < a.Length; i++)
        {
            sum += a[i] * b[i];
        }
        return sum;
    }

    /// <summary>Euclidean (L2) norm of a vector.</summary>
    public static double Norm(double[] v)
    {
        return Math.Sqrt(Dot(v, v));
    }

    /// <summary>Infinity norm (max absolute value) of a vector.</summary>
    public static double NormInf(double[] v)
    {
        double max = 0;
        foreach (double x in v)
        {
            double abs = Math.Abs(x);
            if (abs > max) max = abs;
        }
        return max;
    }

    /// <summary>Scalar multiplication.</summary>
    public static double[] Scale(double[] v, double s)
    {
        double[] result = new double[v.Length];
        for (int i = 0; i < v.Length; i++)
        {
            result[i] = v[i] * s;
        }
        return result;
    }

    /// <summary>Element-wise addition.</summary>
    public static double[] Add(double[] a, double[] b)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++)
        {
            result[i] = a[i] + b[i];
        }
        return result;
    }

    /// <summary>Element-wise subtraction.</summary>
    public static double[] Sub(double[] a, double[] b)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++)
        {
            result[i] = a[i] - b[i];
        }
        return result;
    }

    /// <summary>Element-wise negation.</summary>
    public static double[] Negate(double[] v)
    {
        return Scale(v, -1);
    }

    /// <summary>Deep copy of a vector.</summary>
    public static double[] Clone(double[] v)
    {
        return (double[])v.Clone();
    }

    /// <summary>Create a vector of n zeros.</summary>
    public static double[] Zeros(int n)
    {
        return new double[n];
    }

    /// <summary>Fused operation: a + s*b (avoids intermediate allocation).</summary>
    public static double[] AddScaled(double[] a, double[] b, double s)
    {
        double[] result = new double[a.Length];
        for (int i = 0; i < a.Length; i++)
        {
            result[i] = a[i] + s * b[i];
        }
        return result;
    }
}
