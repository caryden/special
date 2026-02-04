namespace Optimization;

/// <summary>
/// Standard optimization test functions with known optima.
/// </summary>
public class TestFunction
{
    public string Name { get; set; } = "";
    public int Dimensions { get; set; }
    public Func<double[], double> F { get; set; } = _ => 0;
    public Func<double[], double[]> Gradient { get; set; } = _ => Array.Empty<double>();
    public double[] MinimumAt { get; set; } = Array.Empty<double>();
    public double MinimumValue { get; set; }
    public double[] StartingPoint { get; set; } = Array.Empty<double>();
}

public static class TestFunctions
{
    public static TestFunction Sphere = new TestFunction
    {
        Name = "Sphere",
        Dimensions = 2,
        F = x => x.Sum(xi => xi * xi),
        Gradient = x => x.Select(xi => 2 * xi).ToArray(),
        MinimumAt = new[] { 0.0, 0.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 5.0, 5.0 }
    };

    public static TestFunction Booth = new TestFunction
    {
        Name = "Booth",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            return Math.Pow(x1 + 2 * x2 - 7, 2) + Math.Pow(2 * x1 + x2 - 5, 2);
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            return new[]
            {
                2 * (x1 + 2 * x2 - 7) + 4 * (2 * x1 + x2 - 5),
                4 * (x1 + 2 * x2 - 7) + 2 * (2 * x1 + x2 - 5)
            };
        },
        MinimumAt = new[] { 1.0, 3.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction Rosenbrock = new TestFunction
    {
        Name = "Rosenbrock",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            return Math.Pow(1 - x1, 2) + 100 * Math.Pow(x2 - x1 * x1, 2);
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            return new[]
            {
                -2 * (1 - x1) + 200 * (x2 - x1 * x1) * (-2 * x1),
                200 * (x2 - x1 * x1)
            };
        },
        MinimumAt = new[] { 1.0, 1.0 },
        MinimumValue = 0,
        StartingPoint = new[] { -1.2, 1.0 }
    };

    public static TestFunction Beale = new TestFunction
    {
        Name = "Beale",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            return Math.Pow(1.5 - x1 + x1 * x2, 2) +
                   Math.Pow(2.25 - x1 + x1 * x2 * x2, 2) +
                   Math.Pow(2.625 - x1 + x1 * x2 * x2 * x2, 2);
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            double t1 = 1.5 - x1 + x1 * x2;
            double t2 = 2.25 - x1 + x1 * x2 * x2;
            double t3 = 2.625 - x1 + x1 * x2 * x2 * x2;
            return new[]
            {
                2 * t1 * (-1 + x2) + 2 * t2 * (-1 + x2 * x2) + 2 * t3 * (-1 + x2 * x2 * x2),
                2 * t1 * x1 + 2 * t2 * (2 * x1 * x2) + 2 * t3 * (3 * x1 * x2 * x2)
            };
        },
        MinimumAt = new[] { 3.0, 0.5 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction Himmelblau = new TestFunction
    {
        Name = "Himmelblau",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            return Math.Pow(x1 * x1 + x2 - 11, 2) + Math.Pow(x1 + x2 * x2 - 7, 2);
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            return new[]
            {
                4 * x1 * (x1 * x1 + x2 - 11) + 2 * (x1 + x2 * x2 - 7),
                2 * (x1 * x1 + x2 - 11) + 4 * x2 * (x1 + x2 * x2 - 7)
            };
        },
        MinimumAt = new[] { 3.0, 2.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction GoldsteinPrice = new TestFunction
    {
        Name = "Goldstein-Price",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            double a = 1 + Math.Pow(x1 + x2 + 1, 2) *
                (19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2);
            double b = 30 + Math.Pow(2 * x1 - 3 * x2, 2) *
                (18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2);
            return a * b;
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            double s = x1 + x2 + 1;
            double q1 = 19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2;
            double a = 1 + s * s * q1;

            double t = 2 * x1 - 3 * x2;
            double q2 = 18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2;
            double b = 30 + t * t * q2;

            double dq1_dx1 = -14 + 6 * x1 + 6 * x2;
            double da_dx1 = 2 * s * q1 + s * s * dq1_dx1;

            double dq1_dx2 = -14 + 6 * x1 + 6 * x2;
            double da_dx2 = 2 * s * q1 + s * s * dq1_dx2;

            double dq2_dx1 = -32 + 24 * x1 - 36 * x2;
            double db_dx1 = 4 * t * q2 + t * t * dq2_dx1;

            double dq2_dx2 = 48 - 36 * x1 + 54 * x2;
            double db_dx2 = -6 * t * q2 + t * t * dq2_dx2;

            return new[] { da_dx1 * b + a * db_dx1, da_dx2 * b + a * db_dx2 };
        },
        MinimumAt = new[] { 0.0, -1.0 },
        MinimumValue = 3,
        StartingPoint = new[] { -0.1, -0.9 } // As specified in requirements
    };

    public static TestFunction[] AllTestFunctions = new[]
    {
        Sphere, Booth, Rosenbrock, Beale, Himmelblau, GoldsteinPrice
    };
}
