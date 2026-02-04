using System;

namespace Optimization
{
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
        public ConvergenceKind Kind { get; }

        public ConvergenceReason(ConvergenceKind kind)
        {
            Kind = kind;
        }
    }

    public static class ResultTypes
    {
        public static OptimizeOptions DefaultOptions(OptimizeOptions? overrides = null)
        {
            var opts = new OptimizeOptions();
            if (overrides != null)
            {
                // Apply overrides by checking if they differ from defaults
                // Since we can't distinguish "not set" from "set to default" with value types,
                // we just copy all fields from overrides
                opts.GradTol = overrides.GradTol;
                opts.StepTol = overrides.StepTol;
                opts.FuncTol = overrides.FuncTol;
                opts.MaxIterations = overrides.MaxIterations;
            }
            return opts;
        }

        /// <summary>
        /// Check convergence in order: gradient, step, function, maxIterations.
        /// Returns null if no criterion is met.
        /// </summary>
        public static ConvergenceReason? CheckConvergence(
            double gradNorm, double stepNorm, double funcChange,
            int iteration, OptimizeOptions opts)
        {
            if (gradNorm < opts.GradTol)
                return new ConvergenceReason(ConvergenceKind.Gradient);
            if (stepNorm < opts.StepTol)
                return new ConvergenceReason(ConvergenceKind.Step);
            if (funcChange < opts.FuncTol)
                return new ConvergenceReason(ConvergenceKind.Function);
            if (iteration >= opts.MaxIterations)
                return new ConvergenceReason(ConvergenceKind.MaxIterations);
            return null;
        }

        public static bool IsConverged(ConvergenceReason reason)
        {
            return reason.Kind == ConvergenceKind.Gradient
                || reason.Kind == ConvergenceKind.Step
                || reason.Kind == ConvergenceKind.Function;
        }

        public static string ConvergenceMessage(ConvergenceReason reason)
        {
            return reason.Kind switch
            {
                ConvergenceKind.Gradient => "Converged: gradient norm below tolerance",
                ConvergenceKind.Step => "Converged: step size below tolerance",
                ConvergenceKind.Function => "Converged: function change below tolerance",
                ConvergenceKind.MaxIterations => "Stopped: reached maximum iterations",
                ConvergenceKind.LineSearchFailed => "Stopped: line search failed",
                _ => "Unknown convergence reason"
            };
        }
    }
}
