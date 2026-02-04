namespace Optimization.Tests;

using Xunit;

public class FiniteDiffTests
{
    // Test functions with analytic gradients
    private static double Sphere(double[] x)
    {
        return VecOps.Dot(x, x);
    }

    private static double[] SphereGrad(double[] x)
    {
        return VecOps.Scale(x, 2.0);
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

    [Fact]
    public void ForwardDiffGradient_SphereAtThreeFour_MatchesAnalytic()
    {
        double[] x = new[] { 3.0, 4.0 };
        double[] expected = SphereGrad(x);
        double[] actual = FiniteDiff.ForwardDiffGradient(Sphere, x);

        Assert.Equal(expected[0], actual[0], 6);
        Assert.Equal(expected[1], actual[1], 6);
    }

    [Fact]
    public void ForwardDiffGradient_SphereAtOrigin_MatchesAnalytic()
    {
        double[] x = new[] { 0.0, 0.0 };
        double[] expected = SphereGrad(x);
        double[] actual = FiniteDiff.ForwardDiffGradient(Sphere, x);

        Assert.Equal(expected[0], actual[0], 7);
        Assert.Equal(expected[1], actual[1], 7);
    }

    [Fact]
    public void ForwardDiffGradient_Rosenbrock_MatchesAnalytic()
    {
        double[] x = new[] { -1.2, 1.0 };
        double[] expected = RosenbrockGrad(x);
        double[] actual = FiniteDiff.ForwardDiffGradient(Rosenbrock, x);

        Assert.Equal(expected[0], actual[0], 4);
        Assert.Equal(expected[1], actual[1], 4);
    }

    [Fact]
    public void ForwardDiffGradient_Beale_MatchesAnalytic()
    {
        double[] x = new[] { 1.0, 1.0 };
        double[] expected = BealeGrad(x);
        double[] actual = FiniteDiff.ForwardDiffGradient(Beale, x);

        Assert.Equal(expected[0], actual[0], 5);
        Assert.Equal(expected[1], actual[1], 5);
    }

    [Fact]
    public void CentralDiffGradient_SphereAtThreeFour_MatchesAnalytic()
    {
        double[] x = new[] { 3.0, 4.0 };
        double[] expected = SphereGrad(x);
        double[] actual = FiniteDiff.CentralDiffGradient(Sphere, x);

        Assert.Equal(expected[0], actual[0], 9);
        Assert.Equal(expected[1], actual[1], 9);
    }

    [Fact]
    public void CentralDiffGradient_SphereAtOrigin_MatchesAnalytic()
    {
        double[] x = new[] { 0.0, 0.0 };
        double[] expected = SphereGrad(x);
        double[] actual = FiniteDiff.CentralDiffGradient(Sphere, x);

        Assert.Equal(expected[0], actual[0], 9);
        Assert.Equal(expected[1], actual[1], 9);
    }

    [Fact]
    public void CentralDiffGradient_Rosenbrock_MatchesAnalytic()
    {
        double[] x = new[] { -1.2, 1.0 };
        double[] expected = RosenbrockGrad(x);
        double[] actual = FiniteDiff.CentralDiffGradient(Rosenbrock, x);

        Assert.Equal(expected[0], actual[0], 7);
        Assert.Equal(expected[1], actual[1], 7);
    }

    [Fact]
    public void CentralDiffGradient_Beale_MatchesAnalytic()
    {
        double[] x = new[] { 1.0, 1.0 };
        double[] expected = BealeGrad(x);
        double[] actual = FiniteDiff.CentralDiffGradient(Beale, x);

        Assert.Equal(expected[0], actual[0], 8);
        Assert.Equal(expected[1], actual[1], 8);
    }

    [Fact]
    public void MakeGradient_DefaultMethod_MatchesForwardDiff()
    {
        var gradFn = FiniteDiff.MakeGradient(Sphere);
        double[] x = new[] { 3.0, 4.0 };

        double[] expected = FiniteDiff.ForwardDiffGradient(Sphere, x);
        double[] actual = gradFn(x);

        Assert.Equal(expected[0], actual[0]);
        Assert.Equal(expected[1], actual[1]);
    }

    [Fact]
    public void MakeGradient_CentralMethod_MatchesCentralDiff()
    {
        var gradFn = FiniteDiff.MakeGradient(Sphere, "central");
        double[] x = new[] { 3.0, 4.0 };

        double[] expected = FiniteDiff.CentralDiffGradient(Sphere, x);
        double[] actual = gradFn(x);

        Assert.Equal(expected[0], actual[0]);
        Assert.Equal(expected[1], actual[1]);
    }
}
