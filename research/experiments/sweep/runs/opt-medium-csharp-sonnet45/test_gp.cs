using System;
using Optimization;

class Program
{
    static double GoldsteinPrice(double[] x)
    {
        double a = x[0] + x[1] + 1.0;
        double b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1];
        double c = 2.0 * x[0] - 3.0 * x[1];
        double d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1];
        return (1.0 + a * a * b) * (30.0 + c * c * d);
    }

    static double[] GoldsteinPriceGrad(double[] x)
    {
        double a = x[0] + x[1] + 1.0;
        double b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1];
        double c = 2.0 * x[0] - 3.0 * x[1];
        double d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1];

        double da_dx0 = 1.0;
        double da_dx1 = 1.0;
        double db_dx0 = -14.0 + 6.0 * x[0] + 6.0 * x[1];
        double db_dx1 = -14.0 + 6.0 * x[0] + 6.0 * x[1];
        double dc_dx0 = 2.0;
        double dc_dx1 = -3.0;
        double dd_dx0 = -32.0 + 24.0 * x[0] - 36.0 * x[1];
        double dd_dx1 = 48.0 - 36.0 * x[0] + 54.0 * x[1];

        double term1 = 1.0 + a * a * b;
        double term2 = 30.0 + c * c * d;

        double dterm1_dx0 = 2.0 * a * da_dx0 * b + a * a * db_dx0;
        double dterm1_dx1 = 2.0 * a * da_dx1 * b + a * a * db_dx1;
        double dterm2_dx0 = 2.0 * c * dc_dx0 * d + c * c * dd_dx0;
        double dterm2_dx1 = 2.0 * c * dc_dx1 * d + c * c * dd_dx1;

        return new[]
        {
            dterm1_dx0 * term2 + term1 * dterm2_dx0,
            dterm1_dx1 * term2 + term1 * dterm2_dx1
        };
    }

    static void Main()
    {
        var result = Bfgs.Minimize(GoldsteinPrice, new[] { 0.0, -0.5 }, GoldsteinPriceGrad);
        Console.WriteLine($"Converged: {result.Converged}");
        Console.WriteLine($"Message: {result.Message}");
        Console.WriteLine($"Fun: {result.Fun}");
        Console.WriteLine($"X: [{result.X[0]}, {result.X[1]}]");
        Console.WriteLine($"Iterations: {result.Iterations}");
    }
}
