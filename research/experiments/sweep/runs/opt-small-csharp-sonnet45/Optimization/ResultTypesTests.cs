namespace Optimization;

public class ResultTypesTests
{
    [Fact]
    public void DefaultOptions_CreatesDefaults()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        Assert.Equal(1e-8, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }

    [Fact]
    public void DefaultOptions_AllowsOverrides()
    {
        var opts = ResultTypesHelper.DefaultOptions(o => o.GradTol = 1e-4);
        Assert.Equal(1e-4, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }

    [Fact]
    public void CheckConvergence_GradientCriterion()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(1e-9, 0.1, 0.1, 5, opts);
        Assert.IsType<ConvergenceReason.Gradient>(reason);
    }

    [Fact]
    public void CheckConvergence_StepCriterion()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(0.1, 1e-9, 0.1, 5, opts);
        Assert.IsType<ConvergenceReason.Step>(reason);
    }

    [Fact]
    public void CheckConvergence_FunctionCriterion()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(0.1, 0.1, 1e-13, 5, opts);
        Assert.IsType<ConvergenceReason.Function>(reason);
    }

    [Fact]
    public void CheckConvergence_MaxIterations()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(0.1, 0.1, 0.1, 1000, opts);
        Assert.IsType<ConvergenceReason.MaxIterations>(reason);
    }

    [Fact]
    public void CheckConvergence_NoCriterionMet()
    {
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(0.1, 0.1, 0.1, 5, opts);
        Assert.Null(reason);
    }

    [Fact]
    public void IsConverged_SuccessCases()
    {
        Assert.True(ResultTypesHelper.IsConverged(new ConvergenceReason.Gradient()));
        Assert.True(ResultTypesHelper.IsConverged(new ConvergenceReason.Step()));
        Assert.True(ResultTypesHelper.IsConverged(new ConvergenceReason.Function()));
    }

    [Fact]
    public void IsConverged_FailureCases()
    {
        Assert.False(ResultTypesHelper.IsConverged(new ConvergenceReason.MaxIterations()));
        Assert.False(ResultTypesHelper.IsConverged(new ConvergenceReason.LineSearchFailed()));
    }

    [Fact]
    public void ConvergenceMessage_ReturnsReadableMessages()
    {
        Assert.Contains("gradient", ResultTypesHelper.ConvergenceMessage(new ConvergenceReason.Gradient()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("step", ResultTypesHelper.ConvergenceMessage(new ConvergenceReason.Step()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("function", ResultTypesHelper.ConvergenceMessage(new ConvergenceReason.Function()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("maximum iterations", ResultTypesHelper.ConvergenceMessage(new ConvergenceReason.MaxIterations()), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("line search", ResultTypesHelper.ConvergenceMessage(new ConvergenceReason.LineSearchFailed()), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CheckConvergence_PriorityOrder()
    {
        // When multiple criteria are met, gradient has priority
        var opts = ResultTypesHelper.DefaultOptions();
        var reason = ResultTypesHelper.CheckConvergence(1e-9, 1e-9, 1e-13, 5, opts);
        Assert.IsType<ConvergenceReason.Gradient>(reason);
    }
}
