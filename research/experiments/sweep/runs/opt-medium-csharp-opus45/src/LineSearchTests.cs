using System;
using Xunit;
using Optimization;
using Optimization.Tests;

namespace Optimization.Tests
{
    public class LineSearchTests
    {
        [Fact]
        public void Backtracking_Sphere_FromFar()
        {
            var x = new[] { 10.0, 10.0 };
            double fx = TestFunctions.Sphere(x);
            var gx = TestFunctions.SphereGrad(x);
            var d = VecOps.Negate(gx); // steepest descent

            var result = LineSearch.Backtracking(TestFunctions.Sphere, x, d, fx, gx);

            Assert.True(result.Success);
            Assert.Equal(0.5, result.Alpha, 10);
            Assert.True(result.FNew < 1e-10);
        }

        [Fact]
        public void Backtracking_Rosenbrock_Descent()
        {
            var x = new[] { -1.2, 1.0 };
            double fx = TestFunctions.Rosenbrock(x);
            var gx = TestFunctions.RosenbrockGrad(x);
            var d = VecOps.Negate(gx);

            var result = LineSearch.Backtracking(TestFunctions.Rosenbrock, x, d, fx, gx);

            Assert.True(result.Success);
            Assert.True(result.FNew < fx);
        }

        [Fact]
        public void Backtracking_AscendingDirection_Fails()
        {
            var x = new[] { 10.0, 10.0 };
            double fx = TestFunctions.Sphere(x);
            var gx = TestFunctions.SphereGrad(x);
            var d = gx; // ascending direction (not negated)

            var result = LineSearch.Backtracking(TestFunctions.Sphere, x, d, fx, gx);

            Assert.False(result.Success);
        }

        [Fact]
        public void Wolfe_Sphere_SatisfiesBothConditions()
        {
            var x = new[] { 10.0, 10.0 };
            double fx = TestFunctions.Sphere(x);
            var gx = TestFunctions.SphereGrad(x);
            var d = VecOps.Negate(gx);

            var result = LineSearch.Wolfe(
                TestFunctions.Sphere, TestFunctions.SphereGrad, x, d, fx, gx);

            Assert.True(result.Success);

            // Verify Armijo condition
            double c1 = 1e-4;
            double dg = VecOps.Dot(gx, d);
            Assert.True(result.FNew <= fx + c1 * result.Alpha * dg);

            // Verify curvature condition
            double c2 = 0.9;
            Assert.NotNull(result.GNew);
            double dgNew = VecOps.Dot(result.GNew!, d);
            Assert.True(Math.Abs(dgNew) <= c2 * Math.Abs(dg));
        }

        [Fact]
        public void Wolfe_Rosenbrock_Descent()
        {
            var x = new[] { -1.2, 1.0 };
            double fx = TestFunctions.Rosenbrock(x);
            var gx = TestFunctions.RosenbrockGrad(x);
            var d = VecOps.Negate(gx);

            var result = LineSearch.Wolfe(
                TestFunctions.Rosenbrock, TestFunctions.RosenbrockGrad, x, d, fx, gx);

            Assert.True(result.Success);
            Assert.True(result.FNew < fx);
        }

        [Fact]
        public void Wolfe_ReturnsGradient()
        {
            var x = new[] { 10.0, 10.0 };
            double fx = TestFunctions.Sphere(x);
            var gx = TestFunctions.SphereGrad(x);
            var d = VecOps.Negate(gx);

            var result = LineSearch.Wolfe(
                TestFunctions.Sphere, TestFunctions.SphereGrad, x, d, fx, gx);

            Assert.NotNull(result.GNew);
            Assert.Equal(2, result.GNew!.Length);
        }
    }
}
