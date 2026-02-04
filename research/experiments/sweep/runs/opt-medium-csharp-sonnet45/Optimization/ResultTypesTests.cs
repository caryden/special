namespace Optimization.Tests;

using Xunit;

public class ResultTypesTests
{
    [Fact]
    public void DefaultOptions_NoOverrides_ReturnsDefaults()
    {
        var opts = ResultTypes.DefaultOptions();

        Assert.Equal(1e-8, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }

    [Fact]
    public void DefaultOptions_WithOverrides_MergesCorrectly()
    {
        var opts = ResultTypes.DefaultOptions(o => o.GradTol = 1e-4);

        Assert.Equal(1e-4, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }

    [Fact]
    public void CheckConvergence_GradientBelowTolerance_ReturnsGradient()
    {
        var opts = ResultTypes.DefaultOptions();
        var reason = ResultTypes.CheckConvergence(1e-9, 0.1, 0.1, 5, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.Gradient>(reason);
    }

    [Fact]
    public void CheckConvergence_StepBelowTolerance_ReturnsStep()
    {
        var opts = ResultTypes.DefaultOptions();
        var reason = ResultTypes.CheckConvergence(0.1, 1e-9, 0.1, 5, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.Step>(reason);
    }

    [Fact]
    public void CheckConvergence_FunctionChangeBelowTolerance_ReturnsFunction()
    {
        var opts = ResultTypes.DefaultOptions();
        var reason = ResultTypes.CheckConvergence(0.1, 0.1, 1e-13, 5, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.Function>(reason);
    }

    [Fact]
    public void CheckConvergence_MaxIterationsReached_ReturnsMaxIterations()
    {
        var opts = ResultTypes.DefaultOptions();
        var reason = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 1000, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.MaxIterations>(reason);
    }

    [Fact]
    public void CheckConvergence_NoCriterionMet_ReturnsNull()
    {
        var opts = ResultTypes.DefaultOptions();
        var reason = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 5, opts);

        Assert.Null(reason);
    }

    [Fact]
    public void IsConverged_GradientReason_ReturnsTrue()
    {
        Assert.True(ResultTypes.IsConverged(new ConvergenceReason.Gradient()));
    }

    [Fact]
    public void IsConverged_StepReason_ReturnsTrue()
    {
        Assert.True(ResultTypes.IsConverged(new ConvergenceReason.Step()));
    }

    [Fact]
    public void IsConverged_FunctionReason_ReturnsTrue()
    {
        Assert.True(ResultTypes.IsConverged(new ConvergenceReason.Function()));
    }

    [Fact]
    public void IsConverged_MaxIterationsReason_ReturnsFalse()
    {
        Assert.False(ResultTypes.IsConverged(new ConvergenceReason.MaxIterations()));
    }

    [Fact]
    public void IsConverged_LineSearchFailedReason_ReturnsFalse()
    {
        Assert.False(ResultTypes.IsConverged(new ConvergenceReason.LineSearchFailed()));
    }

    [Fact]
    public void CheckConvergence_PriorityTest_GradientTakesPrecedence()
    {
        var opts = ResultTypes.DefaultOptions();
        // Both gradient and step below tolerance
        var reason = ResultTypes.CheckConvergence(1e-9, 1e-9, 0.1, 5, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.Gradient>(reason);
    }

    [Fact]
    public void CheckConvergence_PriorityTest_StepTakesPrecedenceOverFunction()
    {
        var opts = ResultTypes.DefaultOptions();
        // Both step and function below tolerance
        var reason = ResultTypes.CheckConvergence(0.1, 1e-9, 1e-13, 5, opts);

        Assert.NotNull(reason);
        Assert.IsType<ConvergenceReason.Step>(reason);
    }

    [Fact]
    public void ConvergenceMessage_AllReasons_ReturnsCorrectMessages()
    {
        Assert.Contains("Gradient", ResultTypes.ConvergenceMessage(new ConvergenceReason.Gradient()));
        Assert.Contains("Step", ResultTypes.ConvergenceMessage(new ConvergenceReason.Step()));
        Assert.Contains("Function", ResultTypes.ConvergenceMessage(new ConvergenceReason.Function()));
        Assert.Contains("iterations", ResultTypes.ConvergenceMessage(new ConvergenceReason.MaxIterations()));
        Assert.Contains("Line search", ResultTypes.ConvergenceMessage(new ConvergenceReason.LineSearchFailed()));
    }
}
