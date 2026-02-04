namespace Optimization.Tests;

using Xunit;

public class BfgsTests
{
    // Test functions
    private static double Sphere(double[] x)
    {
        return VecOps.Dot(x, x);
    }

    private static double[] SphereGrad(double[] x)
    {
        return VecOps.Scale(x, 2.0);
    }

    private static double Booth(double[] x)
    {
        double t1 = x[0] + 2.0 * x[1] - 7.0;
        double t2 = 2.0 * x[0] + x[1] - 5.0;
        return t1 * t1 + t2 * t2;
    }

    private static double[] BoothGrad(double[] x)
    {
        double t1 = x[0] + 2.0 * x[1] - 7.0;
        double t2 = 2.0 * x[0] + x[1] - 5.0;
        return new[]
        {
            2.0 * t1 + 4.0 * t2,
            4.0 * t1 + 2.0 * t2
        };
    }

    private static double Rosenbrock(double[] x)
    {
        double a = 1.0 - x[0];
        double b = x[1] - x[0] * x[0];
        return a * a + 100.0 * b * b;
    }

    private static double[] RosenbrockGrad(double[] x)
    {
        double a = 1.0 - x[0];
        double b = x[1] - x[0] * x[0];
        return new[]
        {
            -2.0 * a - 400.0 * b * x[0],
            200.0 * b
        };
    }

    private static double Beale(double[] x)
    {
        double t1 = 1.5 - x[0] + x[0] * x[1];
        double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
        double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
        return t1 * t1 + t2 * t2 + t3 * t3;
    }

    private static double[] BealeGrad(double[] x)
    {
        double t1 = 1.5 - x[0] + x[0] * x[1];
        double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
        double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];

        double dx0 = 2.0 * t1 * (-1.0 + x[1])
                   + 2.0 * t2 * (-1.0 + x[1] * x[1])
                   + 2.0 * t3 * (-1.0 + x[1] * x[1] * x[1]);

        double dx1 = 2.0 * t1 * x[0]
                   + 2.0 * t2 * (2.0 * x[0] * x[1])
                   + 2.0 * t3 * (3.0 * x[0] * x[1] * x[1]);

        return new[] { dx0, dx1 };
    }

    private static double Himmelblau(double[] x)
    {
        double t1 = x[0] * x[0] + x[1] - 11.0;
        double t2 = x[0] + x[1] * x[1] - 7.0;
        return t1 * t1 + t2 * t2;
    }

    private static double[] HimmelblauGrad(double[] x)
    {
        double t1 = x[0] * x[0] + x[1] - 11.0;
        double t2 = x[0] + x[1] * x[1] - 7.0;
        return new[]
        {
            4.0 * x[0] * t1 + 2.0 * t2,
            2.0 * t1 + 4.0 * x[1] * t2
        };
    }

    private static double GoldsteinPrice(double[] x)
    {
        double a = x[0] + x[1] + 1.0;
        double b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1];
        double c = 2.0 * x[0] - 3.0 * x[1];
        double d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1];
        return (1.0 + a * a * b) * (30.0 + c * c * d);
    }

    private static double[] GoldsteinPriceGrad(double[] x)
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

    [Fact]
    public void Bfgs_SphereFromFiveFive_ConvergesToMinimum()
    {
        var result = Bfgs.Minimize(Sphere, new[] { 5.0, 5.0 }, SphereGrad);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(0.0, result.X[0], 6);
        Assert.Equal(0.0, result.X[1], 6);
        Assert.True(result.Iterations < 20);
    }

    [Fact]
    public void Bfgs_BoothFromOrigin_ConvergesToMinimum()
    {
        var result = Bfgs.Minimize(Booth, new[] { 0.0, 0.0 }, BoothGrad);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(1.0, result.X[0], 5);
        Assert.Equal(3.0, result.X[1], 5);
    }

    [Fact]
    public void Bfgs_SphereWithFiniteDiff_Converges()
    {
        // No gradient provided, should use finite differences
        var result = Bfgs.Minimize(Sphere, new[] { 5.0, 5.0 });

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
    }

    [Fact]
    public void Bfgs_RosenbrockFromMinusOneTwoOne_Converges()
    {
        var result = Bfgs.Minimize(Rosenbrock, new[] { -1.2, 1.0 }, RosenbrockGrad);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-10);
        Assert.Equal(1.0, result.X[0], 4);
        Assert.Equal(1.0, result.X[1], 4);
    }

    [Fact]
    public void Bfgs_BealeFromOrigin_Converges()
    {
        var result = Bfgs.Minimize(Beale, new[] { 0.0, 0.0 }, BealeGrad);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(3.0, result.X[0], 3);
        Assert.Equal(0.5, result.X[1], 3);
    }

    [Fact]
    public void Bfgs_HimmelblauFromOrigin_Converges()
    {
        var result = Bfgs.Minimize(Himmelblau, new[] { 0.0, 0.0 }, HimmelblauGrad);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);

        // Himmelblau has 4 minima, check if we're close to one of them
        double[][] minima = new[]
        {
            new[] { 3.0, 2.0 },
            new[] { -2.805118, 3.131312 },
            new[] { -3.779310, -3.283186 },
            new[] { 3.584428, -1.848126 }
        };

        bool nearAnyMinimum = false;
        foreach (var min in minima)
        {
            double dist = Math.Sqrt(Math.Pow(result.X[0] - min[0], 2) + Math.Pow(result.X[1] - min[1], 2));
            if (dist < 0.1)
            {
                nearAnyMinimum = true;
                break;
            }
        }

        Assert.True(nearAnyMinimum);
    }

    [Fact]
    public void Bfgs_GoldsteinPriceFromMinusOneMinusNine_Converges()
    {
        // Using [-0.1, -0.9] as starting point per task instructions
        var result = Bfgs.Minimize(GoldsteinPrice, new[] { -0.1, -0.9 }, GoldsteinPriceGrad);

        Assert.True(result.Converged);
        Assert.Equal(3.0, result.Fun, 4);
        Assert.Equal(0.0, result.X[0], 2);
        Assert.Equal(-1.0, result.X[1], 2);
    }

    [Fact]
    public void Bfgs_RosenbrockWithFiniteDiff_NearlyConverges()
    {
        // Without gradient, may not formally converge due to FD noise
        var result = Bfgs.Minimize(Rosenbrock, new[] { -1.2, 1.0 });

        Assert.True(result.Fun < 1e-6);
        Assert.Equal(1.0, result.X[0], 2);
        Assert.Equal(1.0, result.X[1], 2);
    }

    [Fact]
    public void Bfgs_ReturnsGradientAtSolution()
    {
        var result = Bfgs.Minimize(Sphere, new[] { 5.0, 5.0 }, SphereGrad);

        Assert.NotNull(result.Gradient);
        Assert.Equal(2, result.Gradient.Length);
        // Gradient should be near zero at minimum
        Assert.True(VecOps.Norm(result.Gradient) < 1e-6);
    }

    [Fact]
    public void Bfgs_MaxIterations_RespectsLimit()
    {
        var options = ResultTypes.DefaultOptions(o => o.MaxIterations = 3);
        var result = Bfgs.Minimize(Rosenbrock, new[] { -1.2, 1.0 }, RosenbrockGrad, options);

        Assert.True(result.Iterations <= 3);
    }

    [Fact]
    public void Bfgs_AlreadyAtMinimum_ConvergesImmediately()
    {
        var result = Bfgs.Minimize(Sphere, new[] { 0.0, 0.0 }, SphereGrad);

        Assert.True(result.Converged);
        Assert.Equal(0, result.Iterations);
    }

    [Fact]
    public void Bfgs_ImpossibleTolerance_ReturnsMaxIterations()
    {
        var options = ResultTypes.DefaultOptions(o =>
        {
            o.MaxIterations = 2;
            o.GradTol = 1e-20;
        });
        var result = Bfgs.Minimize(Rosenbrock, new[] { -1.2, 1.0 }, RosenbrockGrad, options);

        Assert.False(result.Converged);
        Assert.Contains("iterations", result.Message);
    }
}
