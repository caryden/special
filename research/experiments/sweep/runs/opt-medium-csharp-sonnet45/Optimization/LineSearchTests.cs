namespace Optimization.Tests;

using Xunit;

public class LineSearchTests
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

    [Fact]
    public void BacktrackingLineSearch_SphereFromTenTen_FindsCorrectStep()
    {
        double[] x = new[] { 10.0, 10.0 };
        double fx = Sphere(x);
        double[] gx = SphereGrad(x);
        double[] d = VecOps.Negate(gx); // Descent direction

        var result = LineSearch.BacktrackingLineSearch(Sphere, x, d, fx, gx);

        Assert.True(result.Success);
        Assert.Equal(0.5, result.Alpha);
        Assert.Equal(0.0, result.FNew, 10);
    }

    [Fact]
    public void BacktrackingLineSearch_RosenbrockFromMinusOneTwoOne_Succeeds()
    {
        double[] x = new[] { -1.2, 1.0 };
        double fx = Rosenbrock(x);
        double[] gx = RosenbrockGrad(x);
        double[] d = VecOps.Negate(gx);

        var result = LineSearch.BacktrackingLineSearch(Rosenbrock, x, d, fx, gx);

        Assert.True(result.Success);
        Assert.True(result.FNew < fx);
    }

    [Fact]
    public void BacktrackingLineSearch_AscendingDirection_Fails()
    {
        double[] x = new[] { 1.0, 1.0 };
        double fx = Sphere(x);
        double[] gx = SphereGrad(x);
        double[] d = gx; // Ascending direction (not descent)

        var result = LineSearch.BacktrackingLineSearch(Sphere, x, d, fx, gx);

        Assert.False(result.Success);
    }

    [Fact]
    public void WolfeLineSearch_SphereFromTenTen_SatisfiesBothConditions()
    {
        double[] x = new[] { 10.0, 10.0 };
        double fx = Sphere(x);
        double[] gx = SphereGrad(x);
        double[] d = VecOps.Negate(gx);

        var result = LineSearch.WolfeLineSearch(Sphere, SphereGrad, x, d, fx, gx);

        Assert.True(result.Success);

        // Verify Armijo condition
        double directionalDerivative = VecOps.Dot(gx, d);
        double c1 = 1e-4;
        Assert.True(result.FNew <= fx + c1 * result.Alpha * directionalDerivative);

        // Verify curvature condition
        Assert.NotNull(result.GNew);
        double newDirectionalDerivative = VecOps.Dot(result.GNew, d);
        double c2 = 0.9;
        Assert.True(Math.Abs(newDirectionalDerivative) <= c2 * Math.Abs(directionalDerivative));
    }

    [Fact]
    public void WolfeLineSearch_RosenbrockFromMinusOneTwoOne_Succeeds()
    {
        double[] x = new[] { -1.2, 1.0 };
        double fx = Rosenbrock(x);
        double[] gx = RosenbrockGrad(x);
        double[] d = VecOps.Negate(gx);

        var result = LineSearch.WolfeLineSearch(Rosenbrock, RosenbrockGrad, x, d, fx, gx);

        Assert.True(result.Success);
        Assert.True(result.FNew < fx);
    }

    [Fact]
    public void WolfeLineSearch_ReturnsGradient()
    {
        double[] x = new[] { 10.0, 10.0 };
        double fx = Sphere(x);
        double[] gx = SphereGrad(x);
        double[] d = VecOps.Negate(gx);

        var result = LineSearch.WolfeLineSearch(Sphere, SphereGrad, x, d, fx, gx);

        Assert.NotNull(result.GNew);
        Assert.Equal(2, result.GNew.Length);
    }
}
