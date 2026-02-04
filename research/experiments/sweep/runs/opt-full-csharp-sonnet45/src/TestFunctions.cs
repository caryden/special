namespace Optimization;

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
    public static TestFunction Sphere => new()
    {
        Name = "Sphere",
        Dimensions = 2,
        F = x => x[0] * x[0] + x[1] * x[1],
        Gradient = x => new[] { 2 * x[0], 2 * x[1] },
        MinimumAt = new[] { 0.0, 0.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 5.0, 5.0 }
    };

    public static TestFunction Booth => new()
    {
        Name = "Booth",
        Dimensions = 2,
        F = x =>
        {
            double t1 = x[0] + 2 * x[1] - 7;
            double t2 = 2 * x[0] + x[1] - 5;
            return t1 * t1 + t2 * t2;
        },
        Gradient = x =>
        {
            double t1 = x[0] + 2 * x[1] - 7;
            double t2 = 2 * x[0] + x[1] - 5;
            return new[] { 2 * t1 + 4 * t2, 4 * t1 + 2 * t2 };
        },
        MinimumAt = new[] { 1.0, 3.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction Rosenbrock => new()
    {
        Name = "Rosenbrock",
        Dimensions = 2,
        F = x =>
        {
            double a = 1 - x[0];
            double b = x[1] - x[0] * x[0];
            return a * a + 100 * b * b;
        },
        Gradient = x =>
        {
            double dx = -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] * x[0]);
            double dy = 200 * (x[1] - x[0] * x[0]);
            return new[] { dx, dy };
        },
        MinimumAt = new[] { 1.0, 1.0 },
        MinimumValue = 0,
        StartingPoint = new[] { -1.2, 1.0 }
    };

    public static TestFunction Beale => new()
    {
        Name = "Beale",
        Dimensions = 2,
        F = x =>
        {
            double t1 = 1.5 - x[0] + x[0] * x[1];
            double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
            double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
            return t1 * t1 + t2 * t2 + t3 * t3;
        },
        Gradient = x =>
        {
            double t1 = 1.5 - x[0] + x[0] * x[1];
            double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
            double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
            double dx = 2 * t1 * (-1 + x[1]) + 2 * t2 * (-1 + x[1] * x[1]) + 2 * t3 * (-1 + x[1] * x[1] * x[1]);
            double dy = 2 * t1 * x[0] + 2 * t2 * 2 * x[0] * x[1] + 2 * t3 * 3 * x[0] * x[1] * x[1];
            return new[] { dx, dy };
        },
        MinimumAt = new[] { 3.0, 0.5 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction Himmelblau => new()
    {
        Name = "Himmelblau",
        Dimensions = 2,
        F = x =>
        {
            double t1 = x[0] * x[0] + x[1] - 11;
            double t2 = x[0] + x[1] * x[1] - 7;
            return t1 * t1 + t2 * t2;
        },
        Gradient = x =>
        {
            double t1 = x[0] * x[0] + x[1] - 11;
            double t2 = x[0] + x[1] * x[1] - 7;
            return new[] { 4 * x[0] * t1 + 2 * t2, 2 * t1 + 4 * x[1] * t2 };
        },
        MinimumAt = new[] { 3.0, 2.0 },
        MinimumValue = 0,
        StartingPoint = new[] { 0.0, 0.0 }
    };

    public static TestFunction GoldsteinPrice => new()
    {
        Name = "Goldstein-Price",
        Dimensions = 2,
        F = x =>
        {
            double x1 = x[0], x2 = x[1];
            double a = 1 + (x1 + x2 + 1) * (x1 + x2 + 1) *
                (19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2);
            double b = 30 + (2 * x1 - 3 * x2) * (2 * x1 - 3 * x2) *
                (18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2);
            return a * b;
        },
        Gradient = x =>
        {
            double x1 = x[0], x2 = x[1];
            double s = x1 + x2 + 1;
            double p = 19 - 14 * x1 + 3 * x1 * x1 - 14 * x2 + 6 * x1 * x2 + 3 * x2 * x2;
            double A = 1 + s * s * p;
            double dAdx1 = 2 * s * p + s * s * (-14 + 6 * x1 + 6 * x2);
            double dAdx2 = 2 * s * p + s * s * (-14 + 6 * x1 + 6 * x2);

            double t = 2 * x1 - 3 * x2;
            double q = 18 - 32 * x1 + 12 * x1 * x1 + 48 * x2 - 36 * x1 * x2 + 27 * x2 * x2;
            double B = 30 + t * t * q;
            double dBdx1 = 2 * t * 2 * q + t * t * (-32 + 24 * x1 - 36 * x2);
            double dBdx2 = 2 * t * (-3) * q + t * t * (48 - 36 * x1 + 54 * x2);

            return new[] { dAdx1 * B + A * dBdx1, dAdx2 * B + A * dBdx2 };
        },
        MinimumAt = new[] { 0.0, -1.0 },
        MinimumValue = 3,
        StartingPoint = new[] { 0.0, -0.5 }
    };
}
