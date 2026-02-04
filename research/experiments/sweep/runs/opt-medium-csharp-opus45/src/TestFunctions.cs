using System;

namespace Optimization.Tests
{
    /// <summary>
    /// Standard test functions with analytic gradients for optimization testing.
    /// </summary>
    public static class TestFunctions
    {
        // Sphere: f(x) = sum(x_i^2), min at origin
        public static double Sphere(double[] x) => x[0] * x[0] + x[1] * x[1];
        public static double[] SphereGrad(double[] x) => new[] { 2 * x[0], 2 * x[1] };

        // Rosenbrock: f(x,y) = (1-x)^2 + 100*(y-x^2)^2, min at (1,1)
        public static double Rosenbrock(double[] x)
        {
            double a = 1 - x[0];
            double b = x[1] - x[0] * x[0];
            return a * a + 100 * b * b;
        }

        public static double[] RosenbrockGrad(double[] x)
        {
            double dx = -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] * x[0]);
            double dy = 200 * (x[1] - x[0] * x[0]);
            return new[] { dx, dy };
        }

        // Booth: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2, min at (1,3)
        public static double Booth(double[] x)
        {
            double a = x[0] + 2 * x[1] - 7;
            double b = 2 * x[0] + x[1] - 5;
            return a * a + b * b;
        }

        public static double[] BoothGrad(double[] x)
        {
            double a = x[0] + 2 * x[1] - 7;
            double b = 2 * x[0] + x[1] - 5;
            return new[] { 2 * a + 4 * b, 4 * a + 2 * b };
        }

        // Beale: min at (3, 0.5)
        public static double Beale(double[] x)
        {
            double x0 = x[0], x1 = x[1];
            double a = 1.5 - x0 + x0 * x1;
            double b = 2.25 - x0 + x0 * x1 * x1;
            double c = 2.625 - x0 + x0 * x1 * x1 * x1;
            return a * a + b * b + c * c;
        }

        public static double[] BealeGrad(double[] x)
        {
            double x0 = x[0], x1 = x[1];
            double a = 1.5 - x0 + x0 * x1;
            double b = 2.25 - x0 + x0 * x1 * x1;
            double c = 2.625 - x0 + x0 * x1 * x1 * x1;
            double da_dx0 = -1 + x1;
            double da_dx1 = x0;
            double db_dx0 = -1 + x1 * x1;
            double db_dx1 = 2 * x0 * x1;
            double dc_dx0 = -1 + x1 * x1 * x1;
            double dc_dx1 = 3 * x0 * x1 * x1;
            return new[]
            {
                2 * a * da_dx0 + 2 * b * db_dx0 + 2 * c * dc_dx0,
                2 * a * da_dx1 + 2 * b * db_dx1 + 2 * c * dc_dx1
            };
        }

        // Himmelblau: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
        // Four local minima, one at (3, 2)
        public static double Himmelblau(double[] x)
        {
            double a = x[0] * x[0] + x[1] - 11;
            double b = x[0] + x[1] * x[1] - 7;
            return a * a + b * b;
        }

        public static double[] HimmelblauGrad(double[] x)
        {
            double a = x[0] * x[0] + x[1] - 11;
            double b = x[0] + x[1] * x[1] - 7;
            return new[]
            {
                4 * x[0] * a + 2 * b,
                2 * a + 4 * x[1] * b
            };
        }

        // Goldstein-Price: min = 3 at (0, -1)
        public static double GoldsteinPrice(double[] x)
        {
            double x0 = x[0], x1 = x[1];
            double a = 1 + (x0 + x1 + 1) * (x0 + x1 + 1) *
                (19 - 14 * x0 + 3 * x0 * x0 - 14 * x1 + 6 * x0 * x1 + 3 * x1 * x1);
            double b = 30 + (2 * x0 - 3 * x1) * (2 * x0 - 3 * x1) *
                (18 - 32 * x0 + 12 * x0 * x0 + 48 * x1 - 36 * x0 * x1 + 27 * x1 * x1);
            return a * b;
        }

        public static double[] GoldsteinPriceGrad(double[] x)
        {
            // Use finite differences for this complex gradient
            double h = 1e-8;
            double fx = GoldsteinPrice(x);
            var grad = new double[2];
            for (int i = 0; i < 2; i++)
            {
                var xp = (double[])x.Clone();
                xp[i] += h;
                grad[i] = (GoldsteinPrice(xp) - fx) / h;
            }
            return grad;
        }
    }
}
