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
    public double[] X { get; set; } = Array.Empty<double>();
    public double Fun { get; set; }
    public double[]? Gradient { get; set; }
    public int Iterations { get; set; }
    public int FunctionCalls { get; set; }
    public int GradientCalls { get; set; }
    public bool Converged { get; set; }
    public string Message { get; set; } = "";
}

/// <summary>
/// Reason for convergence or termination.
/// </summary>
public abstract class ConvergenceReason
{
    public abstract string Kind { get; }
}

public class GradientConvergence : ConvergenceReason
{
    public override string Kind => "gradient";
}

public class StepConvergence : ConvergenceReason
{
    public override string Kind => "step";
}

public class FunctionConvergence : ConvergenceReason
{
    public override string Kind => "function";
}

public class MaxIterationsReached : ConvergenceReason
{
    public override string Kind => "maxIterations";
}

public class LineSearchFailure : ConvergenceReason
{
    public override string Kind => "lineSearchFailed";
}

/// <summary>
/// Shared convergence logic for optimization algorithms.
/// </summary>
public static class Convergence
{
    /// <summary>Create default options with optional overrides.</summary>
    public static OptimizeOptions DefaultOptions(OptimizeOptions? overrides = null)
    {
        if (overrides == null) return new OptimizeOptions();

        return new OptimizeOptions
        {
            GradTol = overrides.GradTol,
            StepTol = overrides.StepTol,
            FuncTol = overrides.FuncTol,
            MaxIterations = overrides.MaxIterations
        };
    }

    /// <summary>
    /// Check convergence criteria in order: gradient → step → function → maxIterations.
    /// Returns the first satisfied criterion, or null if none are met.
    /// </summary>
    public static ConvergenceReason? CheckConvergence(
        double gradNorm,
        double stepNorm,
        double funcChange,
        int iteration,
        OptimizeOptions opts)
    {
        if (gradNorm < opts.GradTol)
            return new GradientConvergence();

        if (stepNorm < opts.StepTol)
            return new StepConvergence();

        if (funcChange < opts.FuncTol)
            return new FunctionConvergence();

        if (iteration >= opts.MaxIterations)
            return new MaxIterationsReached();

        return null;
    }

    /// <summary>
    /// Returns true for gradient/step/function convergence,
    /// false for maxIterations/lineSearchFailed.
    /// </summary>
    public static bool IsConverged(ConvergenceReason reason)
    {
        return reason.Kind is "gradient" or "step" or "function";
    }

    /// <summary>Human-readable convergence message.</summary>
    public static string ConvergenceMessage(ConvergenceReason reason)
    {
        return reason.Kind switch
        {
            "gradient" => "Converged: gradient norm below tolerance",
            "step" => "Converged: step size below tolerance",
            "function" => "Converged: function change below tolerance",
            "maxIterations" => "Terminated: maximum iterations reached",
            "lineSearchFailed" => "Terminated: line search failed",
            _ => "Unknown termination reason"
        };
    }
}
