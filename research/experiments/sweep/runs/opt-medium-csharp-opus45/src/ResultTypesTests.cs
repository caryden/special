using Xunit;
using Optimization;

namespace Optimization.Tests
{
    public class ResultTypesTests
    {
        [Fact]
        public void DefaultOptions_ReturnsDefaults()
        {
            var opts = ResultTypes.DefaultOptions();
            Assert.Equal(1e-8, opts.GradTol);
            Assert.Equal(1e-8, opts.StepTol);
            Assert.Equal(1e-12, opts.FuncTol);
            Assert.Equal(1000, opts.MaxIterations);
        }

        [Fact]
        public void DefaultOptions_WithOverrides()
        {
            var opts = ResultTypes.DefaultOptions(new OptimizeOptions { GradTol = 1e-4 });
            Assert.Equal(1e-4, opts.GradTol);
            Assert.Equal(1e-8, opts.StepTol);
            Assert.Equal(1e-12, opts.FuncTol);
            Assert.Equal(1000, opts.MaxIterations);
        }

        [Fact]
        public void CheckConvergence_GradientBelowTolerance()
        {
            var opts = ResultTypes.DefaultOptions();
            var reason = ResultTypes.CheckConvergence(1e-9, 0.1, 0.1, 5, opts);
            Assert.NotNull(reason);
            Assert.Equal(ConvergenceKind.Gradient, reason!.Kind);
        }

        [Fact]
        public void CheckConvergence_StepBelowTolerance()
        {
            var opts = ResultTypes.DefaultOptions();
            var reason = ResultTypes.CheckConvergence(0.1, 1e-9, 0.1, 5, opts);
            Assert.NotNull(reason);
            Assert.Equal(ConvergenceKind.Step, reason!.Kind);
        }

        [Fact]
        public void CheckConvergence_FunctionBelowTolerance()
        {
            var opts = ResultTypes.DefaultOptions();
            var reason = ResultTypes.CheckConvergence(0.1, 0.1, 1e-13, 5, opts);
            Assert.NotNull(reason);
            Assert.Equal(ConvergenceKind.Function, reason!.Kind);
        }

        [Fact]
        public void CheckConvergence_MaxIterations()
        {
            var opts = ResultTypes.DefaultOptions();
            var reason = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 1000, opts);
            Assert.NotNull(reason);
            Assert.Equal(ConvergenceKind.MaxIterations, reason!.Kind);
        }

        [Fact]
        public void CheckConvergence_NoCriterionMet()
        {
            var opts = ResultTypes.DefaultOptions();
            var reason = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 5, opts);
            Assert.Null(reason);
        }

        [Fact]
        public void CheckConvergence_PriorityOrder_GradientFirst()
        {
            var opts = ResultTypes.DefaultOptions();
            // Both gradient and step below tolerance, gradient wins
            var reason = ResultTypes.CheckConvergence(1e-9, 1e-9, 1e-13, 1000, opts);
            Assert.NotNull(reason);
            Assert.Equal(ConvergenceKind.Gradient, reason!.Kind);
        }

        [Fact]
        public void IsConverged_Gradient()
        {
            Assert.True(ResultTypes.IsConverged(new ConvergenceReason(ConvergenceKind.Gradient)));
        }

        [Fact]
        public void IsConverged_Step()
        {
            Assert.True(ResultTypes.IsConverged(new ConvergenceReason(ConvergenceKind.Step)));
        }

        [Fact]
        public void IsConverged_Function()
        {
            Assert.True(ResultTypes.IsConverged(new ConvergenceReason(ConvergenceKind.Function)));
        }

        [Fact]
        public void IsConverged_MaxIterations()
        {
            Assert.False(ResultTypes.IsConverged(new ConvergenceReason(ConvergenceKind.MaxIterations)));
        }

        [Fact]
        public void IsConverged_LineSearchFailed()
        {
            Assert.False(ResultTypes.IsConverged(new ConvergenceReason(ConvergenceKind.LineSearchFailed)));
        }

        [Fact]
        public void ConvergenceMessage_ReturnsDescriptiveStrings()
        {
            Assert.Contains("gradient", ResultTypes.ConvergenceMessage(new ConvergenceReason(ConvergenceKind.Gradient)));
            Assert.Contains("step", ResultTypes.ConvergenceMessage(new ConvergenceReason(ConvergenceKind.Step)));
            Assert.Contains("function", ResultTypes.ConvergenceMessage(new ConvergenceReason(ConvergenceKind.Function)));
            Assert.Contains("maximum iterations", ResultTypes.ConvergenceMessage(new ConvergenceReason(ConvergenceKind.MaxIterations)));
            Assert.Contains("line search", ResultTypes.ConvergenceMessage(new ConvergenceReason(ConvergenceKind.LineSearchFailed)));
        }
    }
}
