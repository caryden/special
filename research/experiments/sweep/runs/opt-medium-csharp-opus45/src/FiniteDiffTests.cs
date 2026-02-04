using System;
using Xunit;
using Optimization;
using Optimization.Tests;

namespace Optimization.Tests
{
    public class FiniteDiffTests
    {
        private static void AssertClose(double expected, double actual, double tol)
        {
            Assert.True(Math.Abs(expected - actual) < tol,
                $"Expected {expected} +/- {tol}, but got {actual} (diff={Math.Abs(expected - actual)})");
        }

        [Fact]
        public void ForwardDiff_Sphere_At_3_4()
        {
            var grad = FiniteDiff.ForwardDiffGradient(TestFunctions.Sphere, new[] { 3.0, 4.0 });
            AssertClose(6.0, grad[0], 1e-6);
            AssertClose(8.0, grad[1], 1e-6);
        }

        [Fact]
        public void ForwardDiff_Sphere_AtOrigin()
        {
            var grad = FiniteDiff.ForwardDiffGradient(TestFunctions.Sphere, new[] { 0.0, 0.0 });
            Assert.True(Math.Abs(grad[0]) < 1e-7);
            Assert.True(Math.Abs(grad[1]) < 1e-7);
        }

        [Fact]
        public void ForwardDiff_Rosenbrock()
        {
            var grad = FiniteDiff.ForwardDiffGradient(TestFunctions.Rosenbrock, new[] { -1.2, 1.0 });
            AssertClose(-215.6, grad[0], 1e-4);
            AssertClose(-88.0, grad[1], 1e-4);
        }

        [Fact]
        public void ForwardDiff_Beale()
        {
            // Verify against analytic gradient at (1,1)
            var analytic = TestFunctions.BealeGrad(new[] { 1.0, 1.0 });
            var grad = FiniteDiff.ForwardDiffGradient(TestFunctions.Beale, new[] { 1.0, 1.0 });
            AssertClose(analytic[0], grad[0], 1e-5);
            AssertClose(analytic[1], grad[1], 1e-5);
        }

        [Fact]
        public void CentralDiff_Sphere_At_3_4()
        {
            var grad = FiniteDiff.CentralDiffGradient(TestFunctions.Sphere, new[] { 3.0, 4.0 });
            AssertClose(6.0, grad[0], 1e-9);
            AssertClose(8.0, grad[1], 1e-9);
        }

        [Fact]
        public void CentralDiff_Sphere_AtOrigin()
        {
            var grad = FiniteDiff.CentralDiffGradient(TestFunctions.Sphere, new[] { 0.0, 0.0 });
            Assert.True(Math.Abs(grad[0]) < 1e-10);
            Assert.True(Math.Abs(grad[1]) < 1e-10);
        }

        [Fact]
        public void CentralDiff_Rosenbrock()
        {
            var grad = FiniteDiff.CentralDiffGradient(TestFunctions.Rosenbrock, new[] { -1.2, 1.0 });
            AssertClose(-215.6, grad[0], 1e-6);
            AssertClose(-88.0, grad[1], 1e-6);
        }

        [Fact]
        public void CentralDiff_Beale()
        {
            // Verify against analytic gradient at (1,1)
            var analytic = TestFunctions.BealeGrad(new[] { 1.0, 1.0 });
            var grad = FiniteDiff.CentralDiffGradient(TestFunctions.Beale, new[] { 1.0, 1.0 });
            AssertClose(analytic[0], grad[0], 1e-7);
            AssertClose(analytic[1], grad[1], 1e-7);
        }

        [Fact]
        public void MakeGradient_Default_MatchesForward()
        {
            var gradFn = FiniteDiff.MakeGradient(TestFunctions.Sphere);
            var grad = gradFn(new[] { 3.0, 4.0 });
            var expected = FiniteDiff.ForwardDiffGradient(TestFunctions.Sphere, new[] { 3.0, 4.0 });
            Assert.Equal(expected[0], grad[0], 15);
            Assert.Equal(expected[1], grad[1], 15);
        }

        [Fact]
        public void MakeGradient_Central_MatchesCentral()
        {
            var gradFn = FiniteDiff.MakeGradient(TestFunctions.Sphere, "central");
            var grad = gradFn(new[] { 3.0, 4.0 });
            var expected = FiniteDiff.CentralDiffGradient(TestFunctions.Sphere, new[] { 3.0, 4.0 });
            Assert.Equal(expected[0], grad[0], 15);
            Assert.Equal(expected[1], grad[1], 15);
        }
    }
}
