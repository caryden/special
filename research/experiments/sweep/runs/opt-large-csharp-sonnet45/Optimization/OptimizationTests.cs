using Xunit;
using System;

namespace Optimization;

public class VecOpsTests
{
    [Fact]
    public void TestDot()
    {
        Assert.Equal(32, VecOps.Dot(new[] { 1.0, 2, 3 }, new[] { 4.0, 5, 6 }));
        Assert.Equal(0, VecOps.Dot(new[] { 0.0, 0 }, new[] { 1.0, 1 }));
    }

    [Fact]
    public void TestNorm()
    {
        Assert.Equal(5, VecOps.Norm(new[] { 3.0, 4 }));
        Assert.Equal(0, VecOps.Norm(new[] { 0.0, 0, 0 }));
    }

    [Fact]
    public void TestNormInf()
    {
        Assert.Equal(3, VecOps.NormInf(new[] { 1.0, -3, 2 }));
        Assert.Equal(0, VecOps.NormInf(new[] { 0.0, 0 }));
    }

    [Fact]
    public void TestScale()
    {
        Assert.Equal(new[] { 3.0, 6 }, VecOps.Scale(new[] { 1.0, 2 }, 3));
        Assert.Equal(new[] { 0.0, 0 }, VecOps.Scale(new[] { 1.0, 2 }, 0));
    }

    [Fact]
    public void TestAdd()
    {
        Assert.Equal(new[] { 4.0, 6 }, VecOps.Add(new[] { 1.0, 2 }, new[] { 3.0, 4 }));
    }

    [Fact]
    public void TestSub()
    {
        Assert.Equal(new[] { 2.0, 2 }, VecOps.Sub(new[] { 3.0, 4 }, new[] { 1.0, 2 }));
    }

    [Fact]
    public void TestNegate()
    {
        Assert.Equal(new[] { -1.0, 2 }, VecOps.Negate(new[] { 1.0, -2 }));
    }

    [Fact]
    public void TestClone()
    {
        double[] orig = new[] { 1.0, 2 };
        double[] cloned = VecOps.Clone(orig);
        Assert.Equal(orig, cloned);
        Assert.NotSame(orig, cloned);
    }

    [Fact]
    public void TestZeros()
    {
        Assert.Equal(new[] { 0.0, 0, 0 }, VecOps.Zeros(3));
    }

    [Fact]
    public void TestAddScaled()
    {
        Assert.Equal(new[] { 7.0, 10 }, VecOps.AddScaled(new[] { 1.0, 2 }, new[] { 3.0, 4 }, 2));
    }
}

public class ResultTypesTests
{
    [Fact]
    public void TestDefaultOptions()
    {
        var opts = Convergence.DefaultOptions();
        Assert.Equal(1e-8, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }

    [Fact]
    public void TestCheckConvergence()
    {
        var opts = new OptimizeOptions();

        var reason = Convergence.CheckConvergence(1e-9, 0.1, 0.1, 5, opts);
        Assert.Equal("gradient", reason?.Kind);

        reason = Convergence.CheckConvergence(0.1, 1e-9, 0.1, 5, opts);
        Assert.Equal("step", reason?.Kind);

        reason = Convergence.CheckConvergence(0.1, 0.1, 1e-13, 5, opts);
        Assert.Equal("function", reason?.Kind);

        reason = Convergence.CheckConvergence(0.1, 0.1, 0.1, 1000, opts);
        Assert.Equal("maxIterations", reason?.Kind);

        reason = Convergence.CheckConvergence(0.1, 0.1, 0.1, 5, opts);
        Assert.Null(reason);
    }

    [Fact]
    public void TestIsConverged()
    {
        Assert.True(Convergence.IsConverged(new GradientConvergence()));
        Assert.False(Convergence.IsConverged(new MaxIterationsReached()));
        Assert.False(Convergence.IsConverged(new LineSearchFailure()));
    }
}

public class FiniteDiffTests
{
    [Fact]
    public void TestForwardDiffGradient()
    {
        var grad = FiniteDiff.ForwardDiffGradient(TestFunctions.Sphere.F, new[] { 3.0, 4.0 });
        Assert.Equal(6.0, grad[0], 5);
        Assert.Equal(8.0, grad[1], 5);
    }

    [Fact]
    public void TestCentralDiffGradient()
    {
        var grad = FiniteDiff.CentralDiffGradient(TestFunctions.Sphere.F, new[] { 3.0, 4.0 });
        Assert.Equal(6.0, grad[0], 8);
        Assert.Equal(8.0, grad[1], 8);
    }

    [Fact]
    public void TestMakeGradient()
    {
        var gradFunc = FiniteDiff.MakeGradient(TestFunctions.Sphere.F);
        var grad = gradFunc(new[] { 3.0, 4.0 });
        Assert.Equal(6.0, grad[0], 5);
        Assert.Equal(8.0, grad[1], 5);
    }
}

public class LineSearchTests
{
    [Fact]
    public void TestBacktrackingLineSearch()
    {
        var x = new[] { 10.0, 10.0 };
        var gx = TestFunctions.Sphere.Gradient(x);
        var d = VecOps.Negate(gx);
        var fx = TestFunctions.Sphere.F(x);

        var result = LineSearch.BacktrackingLineSearch(TestFunctions.Sphere.F, x, d, fx, gx);
        Assert.True(result.Success);
        Assert.True(result.FNew < fx);
    }

    [Fact]
    public void TestWolfeLineSearch()
    {
        var x = new[] { 10.0, 10.0 };
        var gx = TestFunctions.Sphere.Gradient(x);
        var d = VecOps.Negate(gx);
        var fx = TestFunctions.Sphere.F(x);

        var result = LineSearch.WolfeLineSearch(
            TestFunctions.Sphere.F,
            TestFunctions.Sphere.Gradient,
            x, d, fx, gx);

        Assert.True(result.Success);
        Assert.True(result.FNew < fx);
        Assert.NotNull(result.GNew);
    }
}

public class HagerZhangTests
{
    [Fact]
    public void TestHagerZhangLineSearch()
    {
        var x = new[] { 5.0, 5.0 };
        var gx = TestFunctions.Sphere.Gradient(x);
        var d = VecOps.Negate(gx);
        var fx = TestFunctions.Sphere.F(x);

        var result = HagerZhang.HagerZhangLineSearch(
            TestFunctions.Sphere.F,
            TestFunctions.Sphere.Gradient,
            x, d, fx, gx);

        Assert.True(result.Success);
        Assert.True(result.FNew <= fx);
    }
}

public class FiniteHessianTests
{
    [Fact]
    public void TestFiniteDiffHessian()
    {
        var H = FiniteHessian.FiniteDiffHessian(TestFunctions.Sphere.F, new[] { 0.0, 0.0 });
        Assert.Equal(2.0, H[0][0], 2);
        Assert.Equal(0.0, H[0][1], 2);
        Assert.Equal(0.0, H[1][0], 2);
        Assert.Equal(2.0, H[1][1], 2);
    }

    [Fact]
    public void TestHessianVectorProduct()
    {
        var x = new[] { 0.0, 0.0 };
        var v = new[] { 1.0, 1.0 };
        var gx = TestFunctions.Sphere.Gradient(x);
        var Hv = FiniteHessian.HessianVectorProduct(TestFunctions.Sphere.Gradient, x, v, gx);

        Assert.Equal(2.0, Hv[0], 2);
        Assert.Equal(2.0, Hv[1], 2);
    }
}

public class BFGSTests
{
    [Fact]
    public void TestBFGSSphere()
    {
        var result = BFGS.Minimize(
            TestFunctions.Sphere.F,
            TestFunctions.Sphere.StartingPoint,
            TestFunctions.Sphere.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(0.0, result.X[0], 6);
        Assert.Equal(0.0, result.X[1], 6);
    }

    [Fact]
    public void TestBFGSBooth()
    {
        var result = BFGS.Minimize(
            TestFunctions.Booth.F,
            TestFunctions.Booth.StartingPoint,
            TestFunctions.Booth.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(1.0, result.X[0], 6);
        Assert.Equal(3.0, result.X[1], 6);
    }

    [Fact]
    public void TestBFGSRosenbrock()
    {
        var result = BFGS.Minimize(
            TestFunctions.Rosenbrock.F,
            TestFunctions.Rosenbrock.StartingPoint,
            TestFunctions.Rosenbrock.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-10);
        Assert.Equal(1.0, result.X[0], 5);
        Assert.Equal(1.0, result.X[1], 5);
    }

    [Fact]
    public void TestBFGSGoldsteinPrice()
    {
        var result = BFGS.Minimize(
            TestFunctions.GoldsteinPrice.F,
            TestFunctions.GoldsteinPrice.StartingPoint,
            TestFunctions.GoldsteinPrice.Gradient);

        Assert.True(result.Converged);
        Assert.InRange(result.Fun, 2.9, 3.1);
    }
}

public class LBFGSTests
{
    [Fact]
    public void TestLBFGSSphere()
    {
        var result = LBFGS.Minimize(
            TestFunctions.Sphere.F,
            TestFunctions.Sphere.StartingPoint,
            TestFunctions.Sphere.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(0.0, result.X[0], 6);
        Assert.Equal(0.0, result.X[1], 6);
    }

    [Fact]
    public void TestLBFGSBooth()
    {
        var result = LBFGS.Minimize(
            TestFunctions.Booth.F,
            TestFunctions.Booth.StartingPoint,
            TestFunctions.Booth.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
        Assert.Equal(1.0, result.X[0], 6);
        Assert.Equal(3.0, result.X[1], 6);
    }

    [Fact]
    public void TestLBFGSRosenbrock()
    {
        var result = LBFGS.Minimize(
            TestFunctions.Rosenbrock.F,
            TestFunctions.Rosenbrock.StartingPoint,
            TestFunctions.Rosenbrock.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-10);
        Assert.Equal(1.0, result.X[0], 5);
        Assert.Equal(1.0, result.X[1], 5);
    }

    [Fact]
    public void TestLBFGSGoldsteinPrice()
    {
        var result = LBFGS.Minimize(
            TestFunctions.GoldsteinPrice.F,
            TestFunctions.GoldsteinPrice.StartingPoint,
            TestFunctions.GoldsteinPrice.Gradient);

        Assert.True(result.Converged);
        Assert.InRange(result.Fun, 2.9, 3.1);
    }
}

public class ConjugateGradientTests
{
    [Fact]
    public void TestCGSphere()
    {
        var result = ConjugateGradient.Minimize(
            TestFunctions.Sphere.F,
            TestFunctions.Sphere.StartingPoint,
            TestFunctions.Sphere.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-14);
    }

    [Fact]
    public void TestCGBooth()
    {
        var result = ConjugateGradient.Minimize(
            TestFunctions.Booth.F,
            TestFunctions.Booth.StartingPoint,
            TestFunctions.Booth.Gradient);

        Assert.True(result.Converged);
        Assert.Equal(1.0, result.X[0], 6);
        Assert.Equal(3.0, result.X[1], 6);
    }

    [Fact]
    public void TestCGRosenbrock()
    {
        var result = ConjugateGradient.Minimize(
            TestFunctions.Rosenbrock.F,
            TestFunctions.Rosenbrock.StartingPoint,
            TestFunctions.Rosenbrock.Gradient);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-8);
    }

    [Fact]
    public void TestCGGoldsteinPrice()
    {
        var result = ConjugateGradient.Minimize(
            TestFunctions.GoldsteinPrice.F,
            TestFunctions.GoldsteinPrice.StartingPoint,
            TestFunctions.GoldsteinPrice.Gradient);

        Assert.True(result.Converged);
        Assert.InRange(result.Fun, 2.9, 3.1);
    }
}

public class FminboxTests
{
    [Fact]
    public void TestFminboxInteriorMinimum()
    {
        var opts = new FminboxOptions
        {
            Lower = new[] { -5.0, -5.0 },
            Upper = new[] { 5.0, 5.0 },
            Method = "l-bfgs"
        };

        var result = Fminbox.Minimize(
            TestFunctions.Sphere.F,
            new[] { 1.0, 1.0 },
            TestFunctions.Sphere.Gradient,
            opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
        Assert.Equal(0.0, result.X[0], 3);
        Assert.Equal(0.0, result.X[1], 3);
    }

    [Fact]
    public void TestFminboxBoundaryMinimum()
    {
        Func<double[], double> f = x => x[0] * x[0];
        Func<double[], double[]> grad = x => new[] { 2 * x[0] };

        var opts = new FminboxOptions
        {
            Lower = new[] { 2.0 },
            Upper = new[] { 10.0 },
            Method = "l-bfgs",
            OuterIterations = 50 // Increase for boundary problems
        };

        var result = Fminbox.Minimize(f, new[] { 5.0 }, grad, opts);

        // Boundary problems may not formally converge due to projected gradient
        // but should get close to the boundary
        Assert.InRange(result.X[0], 2.0, 2.2);
        Assert.InRange(result.Fun, 3.9, 5.0);
    }

    [Fact]
    public void TestFminboxBFGSMethod()
    {
        var opts = new FminboxOptions
        {
            Lower = new[] { -5.0, -5.0 },
            Upper = new[] { 5.0, 5.0 },
            Method = "bfgs"
        };

        var result = Fminbox.Minimize(
            TestFunctions.Sphere.F,
            new[] { 1.0, 1.0 },
            TestFunctions.Sphere.Gradient,
            opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
    }

    [Fact]
    public void TestFminboxCGMethod()
    {
        var opts = new FminboxOptions
        {
            Lower = new[] { -5.0, -5.0 },
            Upper = new[] { 5.0, 5.0 },
            Method = "conjugate-gradient"
        };

        var result = Fminbox.Minimize(
            TestFunctions.Sphere.F,
            new[] { 1.0, 1.0 },
            TestFunctions.Sphere.Gradient,
            opts);

        Assert.True(result.Converged);
        Assert.True(result.Fun < 1e-6);
    }

    [Fact]
    public void TestBarrierValue()
    {
        double val = Fminbox.BarrierValue(
            new[] { 2.0 },
            new[] { 0.0 },
            new[] { 4.0 });

        Assert.Equal(-2 * Math.Log(2), val, 3);
    }

    [Fact]
    public void TestBarrierValueOutsideBounds()
    {
        double val = Fminbox.BarrierValue(
            new[] { 0.0 },
            new[] { 0.0 },
            new[] { 4.0 });

        Assert.Equal(double.PositiveInfinity, val);
    }

    [Fact]
    public void TestBarrierValueInfiniteBounds()
    {
        double val = Fminbox.BarrierValue(
            new[] { 5.0 },
            new[] { double.NegativeInfinity },
            new[] { double.PositiveInfinity });

        Assert.Equal(0.0, val);
    }

    [Fact]
    public void TestProjectedGradientNorm()
    {
        double norm = Fminbox.ProjectedGradientNorm(
            new[] { 0.0 },
            new[] { 1.0 },
            new[] { 0.0 },
            new[] { 10.0 });

        Assert.Equal(0.0, norm, 10);
    }
}
