namespace Optimization;

/// <summary>
/// Test functions for optimization benchmarks.
/// </summary>
public static class TestFunctions
{
    // Sphere: f(x) = sum(x_i^2), minimum at origin
    public static double Sphere(double[] x) => x.Sum(xi => xi * xi);

    // Booth: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2, minimum at (1, 3)
    public static double Booth(double[] x)
    {
        double x1 = x[0], x2 = x[1];
        return Math.Pow(x1 + 2 * x2 - 7, 2) + Math.Pow(2 * x1 + x2 - 5, 2);
    }

    // Rosenbrock: f(x,y) = (1-x)^2 + 100*(y-x^2)^2, minimum at (1, 1)
    public static double Rosenbrock(double[] x)
    {
        double x1 = x[0], x2 = x[1];
        return Math.Pow(1 - x1, 2) + 100 * Math.Pow(x2 - x1 * x1, 2);
    }

    // Beale: minimum at (3, 0.5)
    public static double Beale(double[] x)
    {
        double x1 = x[0], x2 = x[1];
        return Math.Pow(1.5 - x1 + x1 * x2, 2) +
               Math.Pow(2.25 - x1 + x1 * x2 * x2, 2) +
               Math.Pow(2.625 - x1 + x1 * x2 * x2 * x2, 2);
    }

    // Himmelblau: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
    // Four minima at: (3, 2), (-2.805118, 3.131312), (-3.779310, -3.283186), (3.584428, -1.848126)
    public static double Himmelblau(double[] x)
    {
        double x1 = x[0], x2 = x[1];
        return Math.Pow(x1 * x1 + x2 - 11, 2) + Math.Pow(x1 + x2 * x2 - 7, 2);
    }

    public static readonly double[][] HimmelblauMinima = new[]
    {
        new[] { 3.0, 2.0 },
        new[] { -2.805118, 3.131312 },
        new[] { -3.779310, -3.283186 },
        new[] { 3.584428, -1.848126 }
    };
}

public class NelderMeadTests
{
    [Fact]
    public void MinimizesSphereFunction()
    {
        var result = NelderMead.Minimize(TestFunctions.Sphere, [5.0, 5.0]);

        Assert.True(result.Converged);
        Assert.Equal(0.0, result.Fun, 6);
        Assert.Equal(0.0, result.X[0], 4);
        Assert.Equal(0.0, result.X[1], 4);
        Assert.Equal(0, result.GradientCalls);
    }

    [Fact]
    public void MinimizesBoothFunction()
    {
        var result = NelderMead.Minimize(TestFunctions.Booth, [0.0, 0.0]);

        Assert.True(result.Converged);
        Assert.Equal(0.0, result.Fun, 6);
        Assert.Equal(1.0, result.X[0], 3);
        Assert.Equal(3.0, result.X[1], 3);
    }

    [Fact]
    public void MinimizesRosenbrockFromStandardStartingPoint()
    {
        var opts = new NelderMead.NelderMeadOptions
        {
            MaxIterations = 5000,
            FuncTol = 1e-10,
            StepTol = 1e-10
        };
        var result = NelderMead.Minimize(TestFunctions.Rosenbrock, [-1.2, 1.0], opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
        Assert.Equal(1.0, result.X[0], 2);
        Assert.Equal(1.0, result.X[1], 2);
    }

    [Fact]
    public void MinimizesBealeFunction()
    {
        var opts = new NelderMead.NelderMeadOptions
        {
            MaxIterations = 5000
        };
        var result = NelderMead.Minimize(TestFunctions.Beale, [0.0, 0.0], opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
    }

    [Fact]
    public void MinimizesHimmelblauToOneOfFourMinima()
    {
        var opts = new NelderMead.NelderMeadOptions
        {
            MaxIterations = 5000
        };
        var result = NelderMead.Minimize(TestFunctions.Himmelblau, [0.0, 0.0], opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);

        // Check that result is close to one of the four known minima
        bool closeToAny = TestFunctions.HimmelblauMinima.Any(min =>
        {
            double dist = VecOps.Norm([result.X[0] - min[0], result.X[1] - min[1]]);
            return dist < 0.01;
        });
        Assert.True(closeToAny);
    }

    [Fact]
    public void ReturnsIterationCountAndFunctionCalls()
    {
        var result = NelderMead.Minimize(TestFunctions.Sphere, [5.0, 5.0]);

        Assert.True(result.Iterations > 0);
        Assert.True(result.FunctionCalls > 0);
        Assert.Equal(0, result.GradientCalls);
    }

    [Fact]
    public void RespectsMaxIterations()
    {
        var opts = new NelderMead.NelderMeadOptions
        {
            MaxIterations = 5
        };
        var result = NelderMead.Minimize(TestFunctions.Rosenbrock, [-1.2, 1.0], opts);

        Assert.True(result.Iterations <= 5);
        Assert.False(result.Converged);
        Assert.Contains("maximum iterations", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CustomSimplexScale()
    {
        var opts = new NelderMead.NelderMeadOptions
        {
            InitialSimplexScale = 0.1
        };
        var result = NelderMead.Minimize(TestFunctions.Sphere, [5.0, 5.0], opts);

        Assert.True(result.Converged);
        Assert.Equal(0.0, result.Fun, 6);
    }
}
