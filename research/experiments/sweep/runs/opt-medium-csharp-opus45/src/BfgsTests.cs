using System;
using Xunit;
using Optimization;
using Optimization.Tests;

namespace Optimization.Tests
{
    public class BfgsTests
    {
        [Fact]
        public void Sphere_WithAnalyticGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Sphere, new[] { 5.0, 5.0 }, TestFunctions.SphereGrad);

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-8);
            Assert.True(Math.Abs(result.X[0]) < 1e-4);
            Assert.True(Math.Abs(result.X[1]) < 1e-4);
            Assert.True(result.Iterations < 20);
        }

        [Fact]
        public void Booth_WithAnalyticGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Booth, new[] { 0.0, 0.0 }, TestFunctions.BoothGrad);

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-8);
            Assert.True(Math.Abs(result.X[0] - 1.0) < 1e-4);
            Assert.True(Math.Abs(result.X[1] - 3.0) < 1e-4);
        }

        [Fact]
        public void Sphere_WithFiniteDifferences()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Sphere, new[] { 5.0, 5.0 });

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-6);
        }

        [Fact]
        public void Rosenbrock_WithAnalyticGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Rosenbrock, new[] { -1.2, 1.0 }, TestFunctions.RosenbrockGrad);

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-10);
            Assert.True(Math.Abs(result.X[0] - 1.0) < 1e-4);
            Assert.True(Math.Abs(result.X[1] - 1.0) < 1e-4);
        }

        [Fact]
        public void Beale_WithAnalyticGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Beale, new[] { 0.0, 0.0 }, TestFunctions.BealeGrad);

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-8);
            Assert.True(Math.Abs(result.X[0] - 3.0) < 1e-3);
            Assert.True(Math.Abs(result.X[1] - 0.5) < 1e-3);
        }

        [Fact]
        public void Himmelblau_WithAnalyticGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Himmelblau, new[] { 0.0, 0.0 }, TestFunctions.HimmelblauGrad);

            Assert.True(result.Converged);
            Assert.True(result.Fun < 1e-8);

            // Should converge to one of the four minima
            bool atMinimum =
                (Math.Abs(result.X[0] - 3.0) < 0.1 && Math.Abs(result.X[1] - 2.0) < 0.1) ||
                (Math.Abs(result.X[0] + 2.805) < 0.1 && Math.Abs(result.X[1] - 3.131) < 0.1) ||
                (Math.Abs(result.X[0] + 3.779) < 0.1 && Math.Abs(result.X[1] + 3.283) < 0.1) ||
                (Math.Abs(result.X[0] - 3.584) < 0.1 && Math.Abs(result.X[1] + 1.848) < 0.1);
            Assert.True(atMinimum);
        }

        [Fact]
        public void GoldsteinPrice_WithGradient()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.GoldsteinPrice, new[] { 0.0, -0.5 }, TestFunctions.GoldsteinPriceGrad);

            Assert.True(result.Converged);
            Assert.True(Math.Abs(result.Fun - 3.0) < 1e-4);
            Assert.True(Math.Abs(result.X[0]) < 1e-3);
            Assert.True(Math.Abs(result.X[1] + 1.0) < 1e-3);
        }

        [Fact]
        public void Rosenbrock_WithFiniteDiff()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Rosenbrock, new[] { -1.2, 1.0 });

            Assert.True(result.Fun < 1e-6);
            Assert.True(Math.Abs(result.X[0] - 1.0) < 1e-3);
            Assert.True(Math.Abs(result.X[1] - 1.0) < 1e-3);
        }

        [Fact]
        public void ReturnsGradientAtSolution()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Sphere, new[] { 5.0, 5.0 }, TestFunctions.SphereGrad);

            Assert.NotNull(result.Gradient);
            Assert.True(Math.Abs(result.Gradient![0]) < 1e-4);
            Assert.True(Math.Abs(result.Gradient![1]) < 1e-4);
        }

        [Fact]
        public void MaxIterations_Respected()
        {
            var opts = new OptimizeOptions { MaxIterations = 3 };
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Rosenbrock, new[] { -1.2, 1.0 }, TestFunctions.RosenbrockGrad, opts);

            Assert.True(result.Iterations <= 3);
        }

        [Fact]
        public void AlreadyAtMinimum()
        {
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Sphere, new[] { 0.0, 0.0 }, TestFunctions.SphereGrad);

            Assert.True(result.Converged);
            Assert.Equal(0, result.Iterations);
        }

        [Fact]
        public void MaxIterations_NotConverged()
        {
            var opts = new OptimizeOptions { MaxIterations = 2, GradTol = 1e-20 };
            var result = BfgsOptimizer.Bfgs(
                TestFunctions.Rosenbrock, new[] { -1.2, 1.0 }, TestFunctions.RosenbrockGrad, opts);

            Assert.False(result.Converged);
            Assert.Contains("maximum iterations", result.Message);
        }
    }
}
