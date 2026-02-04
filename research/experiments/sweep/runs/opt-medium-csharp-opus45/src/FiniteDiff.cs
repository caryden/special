using System;

namespace Optimization
{
    public static class FiniteDiff
    {
        // C# double.Epsilon is the smallest positive subnormal (~5e-324), NOT machine epsilon.
        // Machine epsilon for IEEE 754 double is 2^-52 ~ 2.22e-16.
        private const double MachineEpsilon = 2.220446049250313e-16;
        private static readonly double SqrtEps = Math.Sqrt(MachineEpsilon); // ~1.49e-8
        private static readonly double CbrtEps = Math.Cbrt(MachineEpsilon); // ~6.06e-6

        /// <summary>
        /// Forward difference gradient: g_i = (f(x + h*e_i) - f(x)) / h
        /// </summary>
        public static double[] ForwardDiffGradient(Func<double[], double> f, double[] x)
        {
            int n = x.Length;
            double fx = f(x);
            var grad = new double[n];

            for (int i = 0; i < n; i++)
            {
                double h = SqrtEps * Math.Max(Math.Abs(x[i]), 1.0);
                var xPerturbed = (double[])x.Clone();
                xPerturbed[i] += h;
                grad[i] = (f(xPerturbed) - fx) / h;
            }

            return grad;
        }

        /// <summary>
        /// Central difference gradient: g_i = (f(x + h*e_i) - f(x - h*e_i)) / (2h)
        /// </summary>
        public static double[] CentralDiffGradient(Func<double[], double> f, double[] x)
        {
            int n = x.Length;
            var grad = new double[n];

            for (int i = 0; i < n; i++)
            {
                double h = CbrtEps * Math.Max(Math.Abs(x[i]), 1.0);
                var xPlus = (double[])x.Clone();
                var xMinus = (double[])x.Clone();
                xPlus[i] += h;
                xMinus[i] -= h;
                grad[i] = (f(xPlus) - f(xMinus)) / (2 * h);
            }

            return grad;
        }

        /// <summary>
        /// Factory: returns a gradient function using the specified method.
        /// </summary>
        public static Func<double[], double[]> MakeGradient(
            Func<double[], double> f, string method = "forward")
        {
            if (method == "central")
                return x => CentralDiffGradient(f, x);
            return x => ForwardDiffGradient(f, x);
        }
    }
}
