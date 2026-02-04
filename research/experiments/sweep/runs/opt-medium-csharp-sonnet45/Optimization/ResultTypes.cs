namespace Optimization;

/// <summary>
/// Shared types and convergence logic used by all optimization algorithms.
/// </summary>

/// <summary>Optimization algorithm options</summary>
public class OptimizeOptions
{
    public double GradTol { get; set; } = 1e-8;
    public double StepTol { get; set; } = 1e-8;
    public double FuncTol { get; set; } = 1e-12;
    public int MaxIterations { get; set; } = 1000;
}

/// <summary>Optimization result</summary>
public class OptimizeResult
{
    public required double[] X { get; set; }
    public required double Fun { get; set; }
    public double[]? Gradient { get; set; }
    public required int Iterations { get; set; }
    public required int FunctionCalls { get; set; }
    public required int GradientCalls { get; set; }
    public required bool Converged { get; set; }
    public required string Message { get; set; }
}

/// <summary>Convergence reason (tagged union)</summary>
public abstract class ConvergenceReason
{
    public abstract string Kind { get; }

    public class Gradient : ConvergenceReason
    {
        public override string Kind => "gradient";
    }

    public class Step : ConvergenceReason
    {
        public override string Kind => "step";
    }

    public class Function : ConvergenceReason
    {
        public override string Kind => "function";
    }

    public class MaxIterations : ConvergenceReason
    {
        public override string Kind => "maxIterations";
    }

    public class LineSearchFailed : ConvergenceReason
    {
        public override string Kind => "lineSearchFailed";
    }
}

public static class ResultTypes
{
    /// <summary>Create default options with optional overrides</summary>
    public static OptimizeOptions DefaultOptions(Action<OptimizeOptions>? configure = null)
    {
        var options = new OptimizeOptions();
        configure?.Invoke(options);
        return options;
    }

    /// <summary>Check convergence criteria in order: gradient → step → function → maxIterations</summary>
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

    /// <summary>Check if a convergence reason represents actual convergence</summary>
    public static bool IsConverged(ConvergenceReason reason)
    {
        return reason is ConvergenceReason.Gradient
            or ConvergenceReason.Step
            or ConvergenceReason.Function;
    }

    /// <summary>Get human-readable message for convergence reason</summary>
    public static string ConvergenceMessage(ConvergenceReason reason)
    {
        return reason switch
        {
            ConvergenceReason.Gradient => "Gradient norm below tolerance",
            ConvergenceReason.Step => "Step size below tolerance",
            ConvergenceReason.Function => "Function change below tolerance",
            ConvergenceReason.MaxIterations => "Maximum iterations reached",
            ConvergenceReason.LineSearchFailed => "Line search failed",
            _ => "Unknown convergence reason"
        };
    }
}
