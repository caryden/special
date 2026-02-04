namespace Optimization;

/// <summary>
/// Options for optimization algorithms.
/// </summary>
public class OptimizeOptions
{
    public double GradTol { get; set; } = 1e-8;
    public double StepTol { get; set; } = 1e-8;
    public double FuncTol { get; set; } = 1e-12;
    public int MaxIterations { get; set; } = 1000;
}

/// <summary>
/// Result of an optimization run.
/// </summary>
public class OptimizeResult
{
    public required double[] X { get; init; }
    public required double Fun { get; init; }
    public double[]? Gradient { get; init; }
    public required int Iterations { get; init; }
    public required int FunctionCalls { get; init; }
    public required int GradientCalls { get; init; }
    public required bool Converged { get; init; }
    public required string Message { get; init; }
}

/// <summary>
/// Tagged union representing convergence reasons.
/// </summary>
public abstract record ConvergenceReason
{
    public sealed record Gradient : ConvergenceReason;
    public sealed record Step : ConvergenceReason;
    public sealed record Function : ConvergenceReason;
    public sealed record MaxIterations : ConvergenceReason;
    public sealed record LineSearchFailed : ConvergenceReason;
}

/// <summary>
/// Functions for working with optimization options and convergence.
/// </summary>
public static class ResultTypesHelper
{
    /// <summary>
    /// Create default options with optional overrides.
    /// </summary>
    public static OptimizeOptions DefaultOptions(Action<OptimizeOptions>? configure = null)
    {
        var options = new OptimizeOptions();
        configure?.Invoke(options);
        return options;
    }

    /// <summary>
    /// Check convergence criteria in order: gradient → step → function → maxIterations.
    /// Returns null if no criterion is met.
    /// </summary>
    public static ConvergenceReason? CheckConvergence(
        double gradNorm,
        double stepNorm,
        double funcChange,
        int iteration,
        OptimizeOptions opts)
    {
        if (gradNorm < opts.GradTol)
            return new ConvergenceReason.Gradient();
        if (stepNorm < opts.StepTol)
            return new ConvergenceReason.Step();
        if (funcChange < opts.FuncTol)
            return new ConvergenceReason.Function();
        if (iteration >= opts.MaxIterations)
            return new ConvergenceReason.MaxIterations();
        return null;
    }

    /// <summary>
    /// Check if a convergence reason indicates successful convergence.
    /// </summary>
    public static bool IsConverged(ConvergenceReason reason)
    {
        return reason switch
        {
            ConvergenceReason.Gradient => true,
            ConvergenceReason.Step => true,
            ConvergenceReason.Function => true,
            ConvergenceReason.MaxIterations => false,
            ConvergenceReason.LineSearchFailed => false,
            _ => false
        };
    }

    /// <summary>
    /// Get a human-readable message for a convergence reason.
    /// </summary>
    public static string ConvergenceMessage(ConvergenceReason reason)
    {
        return reason switch
        {
            ConvergenceReason.Gradient => "Converged: gradient norm below tolerance",
            ConvergenceReason.Step => "Converged: step size below tolerance",
            ConvergenceReason.Function => "Converged: function change below tolerance",
            ConvergenceReason.MaxIterations => "Stopped: maximum iterations reached",
            ConvergenceReason.LineSearchFailed => "Stopped: line search failed",
            _ => "Unknown convergence reason"
        };
    }
}
