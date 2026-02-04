namespace Optimization;

/// <summary>
/// Shared types and convergence logic for all optimization algorithms.
/// </summary>
public class OptimizeOptions
{
    public double GradTol { get; set; } = 1e-8;
    public double StepTol { get; set; } = 1e-8;
    public double FuncTol { get; set; } = 1e-12;
    public int MaxIterations { get; set; } = 1000;
}

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

public enum ConvergenceKind
{
    Gradient,
    Step,
    Function,
    MaxIterations,
    LineSearchFailed
}

public class ConvergenceReason
{
    public ConvergenceKind Kind { get; set; }
}

public static class ResultTypes
{
    public static OptimizeOptions DefaultOptions(OptimizeOptions? overrides = null)
    {
        var opts = new OptimizeOptions();
        if (overrides != null)
        {
            opts.GradTol = overrides.GradTol;
            opts.StepTol = overrides.StepTol;
            opts.FuncTol = overrides.FuncTol;
            opts.MaxIterations = overrides.MaxIterations;
        }
        return opts;
    }

    public static OptimizeOptions MergeOptions(OptimizeOptions? overrides)
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

    public static ConvergenceReason? CheckConvergence(
        double gradNorm, double stepNorm, double funcChange, int iteration, OptimizeOptions opts)
    {
        if (gradNorm <= opts.GradTol)
            return new ConvergenceReason { Kind = ConvergenceKind.Gradient };
        if (stepNorm <= opts.StepTol)
            return new ConvergenceReason { Kind = ConvergenceKind.Step };
        if (funcChange <= opts.FuncTol)
            return new ConvergenceReason { Kind = ConvergenceKind.Function };
        if (iteration >= opts.MaxIterations)
            return new ConvergenceReason { Kind = ConvergenceKind.MaxIterations };
        return null;
    }

    public static bool IsConverged(ConvergenceReason reason)
    {
        return reason.Kind == ConvergenceKind.Gradient ||
               reason.Kind == ConvergenceKind.Step ||
               reason.Kind == ConvergenceKind.Function;
    }

    public static string ConvergenceMessage(ConvergenceReason reason)
    {
        return reason.Kind switch
        {
            ConvergenceKind.Gradient => "Convergence: gradient norm below tolerance",
            ConvergenceKind.Step => "Convergence: step size below tolerance",
            ConvergenceKind.Function => "Convergence: function change below tolerance",
            ConvergenceKind.MaxIterations => "Stopped: reached maximum iterations",
            ConvergenceKind.LineSearchFailed => "Stopped: line search failed",
            _ => "Unknown"
        };
    }
}
