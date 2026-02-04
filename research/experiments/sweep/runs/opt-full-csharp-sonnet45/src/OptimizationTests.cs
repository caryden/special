using Xunit;
using Optimization;

namespace OptimizationTests;

public class VecOpsTests
{
    [Fact] public void Dot_BasicVectors() => Assert.Equal(32, VecOps.Dot(new[] { 1.0, 2, 3 }, new[] { 4.0, 5, 6 }));
    [Fact] public void Dot_ZeroVector() => Assert.Equal(0, VecOps.Dot(new[] { 0.0, 0 }, new[] { 1.0, 1 }));
    [Fact] public void Norm_3_4() => Assert.Equal(5, VecOps.Norm(new[] { 3.0, 4 }));
    [Fact] public void Norm_Zero() => Assert.Equal(0, VecOps.Norm(new[] { 0.0, 0, 0 }));
    [Fact] public void NormInf_Basic() => Assert.Equal(3, VecOps.NormInf(new[] { 1.0, -3, 2 }));
    [Fact] public void NormInf_Zero() => Assert.Equal(0, VecOps.NormInf(new[] { 0.0, 0 }));
    [Fact] public void Scale_Basic() => Assert.Equal(new[] { 3.0, 6 }, VecOps.Scale(new[] { 1.0, 2 }, 3));
    [Fact] public void Scale_Zero() => Assert.Equal(new[] { 0.0, 0 }, VecOps.Scale(new[] { 1.0, 2 }, 0));
    [Fact] public void Add_Basic() => Assert.Equal(new[] { 4.0, 6 }, VecOps.Add(new[] { 1.0, 2 }, new[] { 3.0, 4 }));
    [Fact] public void Sub_Basic() => Assert.Equal(new[] { 2.0, 2 }, VecOps.Sub(new[] { 3.0, 4 }, new[] { 1.0, 2 }));
    [Fact] public void Negate_Basic() => Assert.Equal(new[] { -1.0, 2 }, VecOps.Negate(new[] { 1.0, -2 }));
    [Fact] public void Clone_Basic()
    {
        var orig = new[] { 1.0, 2 };
        var cloned = VecOps.Clone(orig);
        Assert.Equal(orig, cloned);
        cloned[0] = 99;
        Assert.Equal(1.0, orig[0]);
    }
    [Fact] public void Zeros_3() => Assert.Equal(new[] { 0.0, 0, 0 }, VecOps.Zeros(3));
    [Fact] public void AddScaled_Basic() => Assert.Equal(new[] { 7.0, 10 }, VecOps.AddScaled(new[] { 1.0, 2 }, new[] { 3.0, 4 }, 2));
    [Fact] public void Add_Purity()
    {
        var a = new[] { 1.0, 2 }; var b = new[] { 3.0, 4 };
        VecOps.Add(a, b);
        Assert.Equal(1.0, a[0]); Assert.Equal(3.0, b[0]);
    }
}

public class ResultTypesTests
{
    [Fact] public void DefaultOptions_AllDefaults()
    {
        var opts = ResultTypes.DefaultOptions();
        Assert.Equal(1e-8, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
        Assert.Equal(1e-12, opts.FuncTol);
        Assert.Equal(1000, opts.MaxIterations);
    }
    [Fact] public void DefaultOptions_WithOverride()
    {
        var opts = ResultTypes.DefaultOptions(new OptimizeOptions { GradTol = 1e-4 });
        Assert.Equal(1e-4, opts.GradTol);
        Assert.Equal(1e-8, opts.StepTol);
    }
    [Fact] public void CheckConvergence_Gradient()
    {
        var r = ResultTypes.CheckConvergence(1e-9, 0.1, 0.1, 5, new OptimizeOptions());
        Assert.NotNull(r); Assert.Equal(ConvergenceKind.Gradient, r!.Kind);
    }
    [Fact] public void CheckConvergence_Step()
    {
        var r = ResultTypes.CheckConvergence(0.1, 1e-9, 0.1, 5, new OptimizeOptions());
        Assert.NotNull(r); Assert.Equal(ConvergenceKind.Step, r!.Kind);
    }
    [Fact] public void CheckConvergence_Function()
    {
        var r = ResultTypes.CheckConvergence(0.1, 0.1, 1e-13, 5, new OptimizeOptions());
        Assert.NotNull(r); Assert.Equal(ConvergenceKind.Function, r!.Kind);
    }
    [Fact] public void CheckConvergence_MaxIter()
    {
        var r = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 1000, new OptimizeOptions());
        Assert.NotNull(r); Assert.Equal(ConvergenceKind.MaxIterations, r!.Kind);
    }
    [Fact] public void CheckConvergence_Null()
    {
        var r = ResultTypes.CheckConvergence(0.1, 0.1, 0.1, 5, new OptimizeOptions());
        Assert.Null(r);
    }
    [Fact] public void IsConverged_True() => Assert.True(ResultTypes.IsConverged(new ConvergenceReason { Kind = ConvergenceKind.Gradient }));
    [Fact] public void IsConverged_False_MaxIter() => Assert.False(ResultTypes.IsConverged(new ConvergenceReason { Kind = ConvergenceKind.MaxIterations }));
    [Fact] public void IsConverged_False_LS() => Assert.False(ResultTypes.IsConverged(new ConvergenceReason { Kind = ConvergenceKind.LineSearchFailed }));
}

public class TestFunctionsTests
{
    [Fact] public void Sphere_AtMin() => Assert.Equal(0, TestFunctions.Sphere.F(new[] { 0.0, 0 }));
    [Fact] public void Booth_AtMin() => Assert.Equal(0, TestFunctions.Booth.F(new[] { 1.0, 3 }));
    [Fact] public void Rosenbrock_AtMin() => Assert.Equal(0, TestFunctions.Rosenbrock.F(new[] { 1.0, 1 }));
    [Fact] public void Beale_AtMin() => Assert.True(Math.Abs(TestFunctions.Beale.F(new[] { 3.0, 0.5 })) < 1e-10);
    [Fact] public void Himmelblau_AtMin() => Assert.True(Math.Abs(TestFunctions.Himmelblau.F(new[] { 3.0, 2 })) < 1e-10);
    [Fact] public void GP_AtMin() => Assert.True(Math.Abs(TestFunctions.GoldsteinPrice.F(new[] { 0.0, -1 }) - 3) < 1e-10);
    [Fact] public void Sphere_GradAtMin() => Assert.Equal(0, VecOps.Norm(TestFunctions.Sphere.Gradient(new[] { 0.0, 0 })));
    [Fact] public void Rosenbrock_GradAtMin() => Assert.Equal(0, VecOps.Norm(TestFunctions.Rosenbrock.Gradient(new[] { 1.0, 1 })));
}

public class FiniteDiffTests
{
    [Fact] public void Forward_Sphere_34()
    {
        var g = FiniteDiff.ForwardDiffGradient(TestFunctions.Sphere.F, new[] { 3.0, 4 });
        Assert.True(Math.Abs(g[0] - 6) < 1e-7); Assert.True(Math.Abs(g[1] - 8) < 1e-7);
    }
    [Fact] public void Central_Sphere_34()
    {
        var g = FiniteDiff.CentralDiffGradient(TestFunctions.Sphere.F, new[] { 3.0, 4 });
        Assert.True(Math.Abs(g[0] - 6) < 1e-8); Assert.True(Math.Abs(g[1] - 8) < 1e-8);
    }
    [Fact] public void Forward_Rosenbrock()
    {
        var g = FiniteDiff.ForwardDiffGradient(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 });
        Assert.True(Math.Abs(g[0] - (-215.6)) < 1e-4); Assert.True(Math.Abs(g[1] - (-88)) < 1e-4);
    }
    [Fact] public void MakeGradient_Default()
    {
        var gf = FiniteDiff.MakeGradient(TestFunctions.Sphere.F);
        var g = gf(new[] { 3.0, 4 });
        Assert.True(Math.Abs(g[0] - 6) < 1e-7);
    }
    [Fact] public void MakeGradient_Central()
    {
        var gf = FiniteDiff.MakeGradient(TestFunctions.Sphere.F, "central");
        var g = gf(new[] { 3.0, 4 });
        Assert.True(Math.Abs(g[0] - 6) < 1e-10);
    }
}

public class FiniteHessianTests
{
    [Fact] public void Sphere_Hessian()
    {
        var H = FiniteHessian.FiniteDiffHessian(TestFunctions.Sphere.F, new[] { 0.0, 0 });
        Assert.True(Math.Abs(H[0][0] - 2) < 0.01); Assert.True(Math.Abs(H[1][1] - 2) < 0.01);
        Assert.True(Math.Abs(H[0][1]) < 0.01);
    }
    [Fact] public void Booth_Hessian()
    {
        var H = FiniteHessian.FiniteDiffHessian(TestFunctions.Booth.F, new[] { 0.0, 0 });
        Assert.True(Math.Abs(H[0][0] - 10) < 0.1); Assert.True(Math.Abs(H[0][1] - 8) < 0.1);
        Assert.True(Math.Abs(H[1][1] - 10) < 0.1);
    }
    [Fact] public void HVP_Sphere()
    {
        var Hv = FiniteHessian.HessianVectorProduct(TestFunctions.Sphere.Gradient, new[] { 0.0, 0 }, new[] { 1.0, 0 }, TestFunctions.Sphere.Gradient(new[] { 0.0, 0 }));
        Assert.True(Math.Abs(Hv[0] - 2) < 0.01); Assert.True(Math.Abs(Hv[1]) < 0.01);
    }
}

public class Brent1dTests
{
    [Fact] public void Quadratic()
    {
        var r = Brent1d.Minimize(x => x * x, -2, 2);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X) < 1e-6); Assert.True(Math.Abs(r.Fun) < 1e-12);
    }
    [Fact] public void ShiftedQuadratic()
    {
        var r = Brent1d.Minimize(x => (x - 3) * (x - 3), 0, 10);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X - 3) < 1e-6);
    }
    [Fact] public void Sine()
    {
        var r = Brent1d.Minimize(x => -Math.Sin(x), 0, Math.PI);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X - Math.PI / 2) < 1e-6);
    }
    [Fact] public void ReversedBracket()
    {
        var r = Brent1d.Minimize(x => x * x, 2, -2);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X) < 1e-6);
    }
    [Fact] public void MaxIterFailure()
    {
        var r = Brent1d.Minimize(x => x * x, -100, 100, new Brent1dOptions { MaxIter = 3 });
        Assert.False(r.Converged); Assert.Contains("Maximum iterations", r.Message);
    }
}

public class LineSearchTests
{
    [Fact] public void Backtracking_Sphere()
    {
        var tf = TestFunctions.Sphere;
        double[] x = new[] { 10.0, 10 }; double[] g = tf.Gradient(x);
        var r = LineSearch.BacktrackingLineSearch(tf.F, x, VecOps.Negate(g), tf.F(x), g);
        Assert.True(r.Success); Assert.True(Math.Abs(r.Alpha - 0.5) < 0.01);
    }
    [Fact] public void Backtracking_Ascending()
    {
        var tf = TestFunctions.Sphere;
        double[] x = new[] { 10.0, 10 }; double[] g = tf.Gradient(x);
        var r = LineSearch.BacktrackingLineSearch(tf.F, x, g, tf.F(x), g);
        Assert.False(r.Success);
    }
    [Fact] public void Wolfe_Sphere()
    {
        var tf = TestFunctions.Sphere;
        double[] x = new[] { 10.0, 10 }; double[] g = tf.Gradient(x);
        var r = LineSearch.WolfeLineSearch(tf.F, tf.Gradient, x, VecOps.Negate(g), tf.F(x), g);
        Assert.True(r.Success); Assert.NotNull(r.GNew);
    }
    [Fact] public void Wolfe_Rosenbrock()
    {
        var tf = TestFunctions.Rosenbrock;
        double[] x = tf.StartingPoint; double[] g = tf.Gradient(x);
        var r = LineSearch.WolfeLineSearch(tf.F, tf.Gradient, x, VecOps.Negate(g), tf.F(x), g);
        Assert.True(r.Success); Assert.True(r.FNew < tf.F(x));
    }
}

public class HagerZhangTests
{
    [Fact] public void Sphere_ExactStep()
    {
        var tf = TestFunctions.Sphere;
        double[] x = new[] { 0.5, 0.5 }; double[] d = new[] { -0.5, -0.5 };
        var r = HagerZhang.Search(tf.F, tf.Gradient, x, d, tf.F(x), tf.Gradient(x));
        Assert.True(r.Success); Assert.True(Math.Abs(r.Alpha - 1.0) < 0.01);
    }
    [Fact] public void AllFunctions_Succeed()
    {
        foreach (var tf in new[] { TestFunctions.Sphere, TestFunctions.Booth, TestFunctions.Rosenbrock,
            TestFunctions.Beale, TestFunctions.Himmelblau, TestFunctions.GoldsteinPrice })
        {
            double[] x = tf.StartingPoint; double fx = tf.F(x); double[] gx = tf.Gradient(x);
            double[] d = VecOps.Negate(gx);
            if (VecOps.Norm(gx) < 1e-12) continue;
            var r = HagerZhang.Search(tf.F, tf.Gradient, x, d, fx, gx);
            Assert.True(r.Success, $"Failed on {tf.Name}");
            Assert.True(r.FNew <= fx + 1e-8, $"No decrease on {tf.Name}");
        }
    }
}

public class MoreThuenteTests
{
    [Fact] public void Sphere()
    {
        var tf = TestFunctions.Sphere;
        double[] x = new[] { 5.0, 5 }; double[] g = tf.Gradient(x);
        var r = MoreThuente.Search(tf.F, tf.Gradient, x, VecOps.Negate(g), tf.F(x), g);
        Assert.True(r.Success); Assert.True(r.FNew < 50);
    }
    [Fact] public void Rosenbrock()
    {
        var tf = TestFunctions.Rosenbrock;
        double[] x = tf.StartingPoint; double[] g = tf.Gradient(x);
        var r = MoreThuente.Search(tf.F, tf.Gradient, x, VecOps.Negate(g), tf.F(x), g);
        Assert.True(r.Success); Assert.True(r.FNew < tf.F(x));
    }
    [Fact] public void MaxFev()
    {
        Func<double[], double> f = x => -x[0];
        Func<double[], double[]> g = x => new[] { -1.0 };
        var r = MoreThuente.Search(f, g, new[] { 0.0 }, new[] { 1.0 }, 0, new[] { -1.0 }, new MoreThuenteOptions { MaxFev = 3 });
        Assert.False(r.Success);
    }
}

public class NelderMeadTests
{
    [Fact] public void Sphere() { var r = NelderMead.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }); Assert.True(r.Converged); Assert.True(r.Fun < 1e-6); }
    [Fact] public void Booth() { var r = NelderMead.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }); Assert.True(r.Converged); Assert.True(r.Fun < 1e-6); }
    [Fact] public void Rosenbrock()
    {
        var r = NelderMead.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, new OptimizeOptions { MaxIterations = 5000, FuncTol = 1e-14, StepTol = 1e-14 });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void GradientCalls_Zero() { var r = NelderMead.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }); Assert.Equal(0, r.GradientCalls); }
    [Fact] public void RespectsMaxIter()
    {
        var r = NelderMead.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, new OptimizeOptions { MaxIterations = 5 });
        Assert.True(r.Iterations <= 5); Assert.False(r.Converged);
    }
}

public class GradientDescentTests
{
    [Fact] public void Sphere_Analytic()
    {
        var tf = TestFunctions.Sphere;
        var r = GradientDescent.Minimize(tf.F, tf.StartingPoint, tf.Gradient);
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-8);
    }
    [Fact] public void Booth_Analytic()
    {
        var tf = TestFunctions.Booth;
        var r = GradientDescent.Minimize(tf.F, tf.StartingPoint, tf.Gradient);
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void Sphere_FD()
    {
        var r = GradientDescent.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void AtMinimum()
    {
        var r = GradientDescent.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient);
        Assert.True(r.Converged); Assert.Equal(0, r.Iterations);
    }
    [Fact] public void MaxIter()
    {
        var r = GradientDescent.Minimize(TestFunctions.Rosenbrock.F, TestFunctions.Rosenbrock.StartingPoint, TestFunctions.Rosenbrock.Gradient, new OptimizeOptions { MaxIterations = 2 });
        Assert.False(r.Converged); Assert.Contains("maximum iterations", r.Message.ToLower());
    }
}

public class BfgsTests
{
    [Fact] public void Sphere() { var r = Bfgs.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); Assert.True(r.Iterations < 20); }
    [Fact] public void Booth() { var r = Bfgs.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }, TestFunctions.Booth.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void Rosenbrock() { var r = Bfgs.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-10); }
    [Fact] public void Beale() { var r = Bfgs.Minimize(TestFunctions.Beale.F, new[] { 0.0, 0 }, TestFunctions.Beale.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void Himmelblau() { var r = Bfgs.Minimize(TestFunctions.Himmelblau.F, new[] { 0.0, 0 }, TestFunctions.Himmelblau.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void GoldsteinPrice()
    {
        var r = Bfgs.Minimize(TestFunctions.GoldsteinPrice.F, new[] { 0.0, -0.5 }, TestFunctions.GoldsteinPrice.Gradient);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.Fun - 3) < 1e-4);
    }
    [Fact] public void Sphere_FD() { var r = Bfgs.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }); Assert.True(r.Converged); Assert.True(r.Fun < 1e-6); }
    [Fact] public void AtMinimum() { var r = Bfgs.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.Equal(0, r.Iterations); }
    [Fact] public void MaxIter() { var r = Bfgs.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient, new OptimizeOptions { MaxIterations = 3 }); Assert.True(r.Iterations <= 3); }
}

public class LBfgsTests
{
    [Fact] public void Sphere() { var r = LBfgs.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void Rosenbrock() { var r = LBfgs.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-10); }
    [Fact] public void Beale() { var r = LBfgs.Minimize(TestFunctions.Beale.F, new[] { 0.0, 0 }, TestFunctions.Beale.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void GoldsteinPrice() { var r = LBfgs.Minimize(TestFunctions.GoldsteinPrice.F, new[] { 0.0, -0.5 }, TestFunctions.GoldsteinPrice.Gradient); Assert.True(r.Converged); Assert.True(Math.Abs(r.Fun - 3) < 1e-4); }
    [Fact] public void CustomMemory() { var r = LBfgs.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient, new LBfgsOptions { Memory = 3 }); Assert.True(r.Converged); Assert.True(r.Fun < 1e-6); }
    [Fact] public void AtMinimum() { var r = LBfgs.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.Equal(0, r.Iterations); }
    [Fact] public void MaxIter() { var r = LBfgs.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient, new OptimizeOptions { MaxIterations = 2 }); Assert.False(r.Converged); Assert.Contains("maximum iterations", r.Message.ToLower()); }
}

public class ConjugateGradientTests
{
    [Fact] public void Sphere() { var r = ConjugateGradient.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-14); }
    [Fact] public void Booth() { var r = ConjugateGradient.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }, TestFunctions.Booth.Gradient); Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1) < 0.01); }
    [Fact] public void Rosenbrock() { var r = ConjugateGradient.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void AtMinimum() { var r = ConjugateGradient.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.Equal(0, r.Iterations); }
    [Fact] public void MaxIter() { var r = ConjugateGradient.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient, new OptimizeOptions { MaxIterations = 2 }); Assert.False(r.Converged); Assert.Contains("maximum iterations", r.Message.ToLower()); }
    [Fact] public void WithoutGrad() { var r = ConjugateGradient.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }); Assert.True(r.Converged); }
}

public class NewtonTests
{
    static Func<double[], double[][]> SphereHess = _ => new[] { new[] { 2.0, 0 }, new[] { 0.0, 2 } };
    static Func<double[], double[][]> BoothHess = _ => new[] { new[] { 10.0, 8 }, new[] { 8.0, 10 } };
    static Func<double[], double[][]> RosenHess = x =>
    {
        double x1 = x[0];
        return new[] { new[] { -2 * (-1) + 1200 * x1 * x1 - 400 * x[1] + 2, -400 * x1 }, new[] { -400 * x1, 200.0 } };
    };

    [Fact] public void Sphere() { var r = Newton.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient, SphereHess); Assert.True(r.Converged); Assert.True(r.Fun < 1e-14); Assert.True(r.Iterations <= 2); }
    [Fact] public void Booth() { var r = Newton.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }, TestFunctions.Booth.Gradient, BoothHess); Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1) < 0.01); }
    [Fact] public void Rosenbrock_FDHess() { var r = Newton.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-10); }
    [Fact] public void AtMinimum() { var r = Newton.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient, SphereHess); Assert.True(r.Converged); Assert.Equal(0, r.Iterations); }
    [Fact] public void RegularizationFailed()
    {
        // Saddle function: f = x^2 - y^2 (indefinite Hessian)
        Func<double[], double> f = x => x[0] * x[0] - x[1] * x[1];
        Func<double[], double[]> g = x => new[] { 2 * x[0], -2 * x[1] };
        var r = Newton.Minimize(f, new[] { 1.0, 1 }, g, maxRegularize: 0);
        // With maxRegularize=0, Hessian [[2,0],[0,-2]] is indefinite, should fail
        // Actually Cholesky will fail so regularization fails
        Assert.False(r.Converged);
        Assert.Contains("regularization failed", r.Message.ToLower());
    }
}

public class NewtonTrustRegionTests
{
    [Fact] public void Sphere() { var r = NewtonTrustRegion.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-14); }
    [Fact] public void Booth() { var r = NewtonTrustRegion.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }, TestFunctions.Booth.Gradient); Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1) < 0.01); }
    [Fact] public void Rosenbrock() { var r = NewtonTrustRegion.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-8); }
    [Fact] public void Himmelblau() { var r = NewtonTrustRegion.Minimize(TestFunctions.Himmelblau.F, new[] { 0.0, 0 }, TestFunctions.Himmelblau.Gradient); Assert.True(r.Converged); Assert.True(r.Fun < 1e-10); }
    [Fact] public void GoldsteinPrice() { var r = NewtonTrustRegion.Minimize(TestFunctions.GoldsteinPrice.F, new[] { 0.0, -0.5 }, TestFunctions.GoldsteinPrice.Gradient); Assert.True(r.Converged); Assert.True(Math.Abs(r.Fun - 3) < 1e-4); }
    [Fact] public void AtMinimum() { var r = NewtonTrustRegion.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 }, TestFunctions.Sphere.Gradient); Assert.True(r.Converged); Assert.Equal(0, r.Iterations); }
}

public class SimulatedAnnealingTests
{
    [Fact] public void Sphere_Seeded()
    {
        var r = SimulatedAnnealing.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, new OptimizeOptions { MaxIterations = 10000 }, seed: 42);
        Assert.True(r.Converged); Assert.True(r.Fun < 1); Assert.Equal(10001, r.FunctionCalls);
    }
    [Fact] public void Deterministic()
    {
        var r1 = SimulatedAnnealing.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, new OptimizeOptions { MaxIterations = 100 }, seed: 99);
        var r2 = SimulatedAnnealing.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, new OptimizeOptions { MaxIterations = 100 }, seed: 99);
        Assert.Equal(r1.Fun, r2.Fun); Assert.Equal(r1.X, r2.X);
    }
    [Fact] public void KeepBest()
    {
        var r = SimulatedAnnealing.Minimize(TestFunctions.Sphere.F, new[] { 0.0, 0 },
            new OptimizeOptions { MaxIterations = 100 }, temperature: _ => 1000, seed: 42);
        Assert.True(Math.Abs(r.Fun) < 1e-10);
    }
}

public class KrylovTrustRegionTests
{
    [Fact] public void Sphere()
    {
        var r = KrylovTrustRegion.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient);
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void Rosenbrock()
    {
        var r = KrylovTrustRegion.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 }, TestFunctions.Rosenbrock.Gradient);
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void Booth()
    {
        var r = KrylovTrustRegion.Minimize(TestFunctions.Booth.F, new[] { 0.0, 0 }, TestFunctions.Booth.Gradient);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1) < 0.1);
    }
    [Fact] public void NegativeCurvature()
    {
        Func<double[], double> f = x => -x[0] * x[0] - x[1] * x[1];
        Func<double[], double[]> g = x => new[] { -2 * x[0], -2 * x[1] };
        var r = KrylovTrustRegion.Minimize(f, new[] { 0.1, 0.1 }, g, new OptimizeOptions { MaxIterations = 50 });
        Assert.True(r.Fun < f(new[] { 0.1, 0.1 }));
    }
}

public class FminboxTests
{
    [Fact] public void InteriorMinimum()
    {
        var r = Fminbox.Minimize(TestFunctions.Sphere.F, new[] { 1.0, 1 }, TestFunctions.Sphere.Gradient,
            new[] { -5.0, -5 }, new[] { 5.0, 5 });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-4);
    }
    [Fact] public void BoundaryMinimum()
    {
        Func<double[], double> f = x => x[0] * x[0];
        Func<double[], double[]> g = x => new[] { 2 * x[0] };
        var r = Fminbox.Minimize(f, new[] { 5.0 }, g, new[] { 2.0 }, new[] { 10.0 },
            outerIterations: 40);
        Assert.True(r.X[0] >= 2.0 && r.X[0] < 4.0);
        Assert.True(r.Fun < 16.0);
    }
    [Fact] public void InvalidBounds()
    {
        Func<double[], double> f1d = x => x[0] * x[0];
        Func<double[], double[]> g1d = x => new[] { 2 * x[0] };
        var r = Fminbox.Minimize(f1d, new[] { 1.0 }, g1d, new[] { 5.0 }, new[] { 2.0 });
        Assert.False(r.Converged); Assert.Contains("Invalid bounds", r.Message);
    }
    [Fact] public void BarrierValue()
    {
        double bv = Fminbox.BarrierValue(new[] { 2.0 }, new[] { 0.0 }, new[] { 4.0 });
        Assert.True(Math.Abs(bv - (-2 * Math.Log(2))) < 1e-10);
    }
    [Fact] public void BarrierValue_OutsideBox()
    {
        Assert.True(double.IsPositiveInfinity(Fminbox.BarrierValue(new[] { 0.0 }, new[] { 0.0 }, new[] { 4.0 })));
    }
    [Fact] public void ProjectedGradNorm_AtBound()
    {
        double pgn = Fminbox.ProjectedGradientNorm(new[] { 0.0 }, new[] { 1.0 }, new[] { 0.0 }, new[] { 10.0 });
        Assert.Equal(0, pgn);
    }
    [Fact] public void ProjectedGradNorm_Interior()
    {
        double pgn = Fminbox.ProjectedGradientNorm(new[] { 2.0, 3 }, new[] { 0.5, -0.3 }, new[] { 0.0, 0 }, new[] { 10.0, 10 });
        Assert.True(Math.Abs(pgn - 0.5) < 1e-10);
    }
}

public class IpNewtonTests
{
    [Fact] public void UnconstrainedSphere()
    {
        var r = IpNewton.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient);
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-4);
    }
    [Fact] public void BoxConstrained()
    {
        var r = IpNewton.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 }, TestFunctions.Sphere.Gradient,
            lower: new[] { 1.0, 1 }, upper: new[] { 10.0, 10 });
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1) < 0.2); Assert.True(Math.Abs(r.Fun - 2) < 0.5);
    }
    [Fact] public void EqualityConstraint()
    {
        Func<double[], double> f = x => x[0] * x[0] + x[1] * x[1];
        Func<double[], double[]> g = x => new[] { 2 * x[0], 2 * x[1] };
        var con = new ConstraintDef
        {
            C = x => new[] { x[0] + x[1] },
            Jacobian = x => new[] { new[] { 1.0, 1.0 } },
            Lower = new[] { 1.0 }, Upper = new[] { 1.0 }
        };
        var r = IpNewton.Minimize(f, new[] { 2.0, 2 }, g, constraints: con);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 0.5) < 0.2);
    }
    [Fact] public void InequalityConstraint()
    {
        Func<double[], double> f = x => x[0] * x[0] + x[1] * x[1];
        Func<double[], double[]> g = x => new[] { 2 * x[0], 2 * x[1] };
        var con = new ConstraintDef
        {
            C = x => new[] { x[0] + x[1] },
            Jacobian = x => new[] { new[] { 1.0, 1.0 } },
            Lower = new[] { 3.0 }, Upper = new[] { double.PositiveInfinity }
        };
        var r = IpNewton.Minimize(f, new[] { 3.0, 3 }, g, constraints: con);
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 1.5) < 0.3);
    }
    [Fact] public void ActiveBound1D()
    {
        Func<double[], double> f = x => (x[0] - 3) * (x[0] - 3);
        Func<double[], double[]> g = x => new[] { 2 * (x[0] - 3) };
        var r = IpNewton.Minimize(f, new[] { 5.0 }, g, lower: new[] { 4.0 }, upper: new[] { 10.0 });
        Assert.True(r.Converged); Assert.True(Math.Abs(r.X[0] - 4) < 0.2);
    }
}

public class MinimizeTests
{
    [Fact] public void DefaultMethod_NoGrad()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 });
        Assert.True(r.Converged); Assert.Equal(0, r.GradientCalls);
    }
    [Fact] public void DefaultMethod_WithGrad()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 },
            new MinimizeOptions { Grad = TestFunctions.Sphere.Gradient });
        Assert.True(r.Converged); Assert.True(r.GradientCalls > 0);
    }
    [Fact] public void ExplicitNelderMead()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 },
            new MinimizeOptions { Method = "nelder-mead" });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void ExplicitBfgs()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 },
            new MinimizeOptions { Method = "bfgs", Grad = TestFunctions.Rosenbrock.Gradient });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-10);
    }
    [Fact] public void ExplicitLBfgs()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 },
            new MinimizeOptions { Method = "l-bfgs", Grad = TestFunctions.Rosenbrock.Gradient });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-10);
    }
    [Fact] public void ExplicitGD()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Sphere.F, new[] { 5.0, 5 },
            new MinimizeOptions { Method = "gradient-descent", Grad = TestFunctions.Sphere.Gradient });
        Assert.True(r.Converged); Assert.True(r.Fun < 1e-6);
    }
    [Fact] public void OptionsForwarding()
    {
        var r = MinimizeDispatcher.Minimize(TestFunctions.Rosenbrock.F, new[] { -1.2, 1.0 },
            new MinimizeOptions { Method = "bfgs", Grad = TestFunctions.Rosenbrock.Gradient, MaxIterations = 3 });
        Assert.True(r.Iterations <= 3);
    }
    [Fact] public void AllFunctions_Bfgs()
    {
        var fns = new[] { TestFunctions.Sphere, TestFunctions.Booth, TestFunctions.Rosenbrock,
            TestFunctions.Beale, TestFunctions.Himmelblau };
        foreach (var tf in fns)
        {
            var r = MinimizeDispatcher.Minimize(tf.F, tf.StartingPoint,
                new MinimizeOptions { Method = "bfgs", Grad = tf.Gradient });
            Assert.True(r.Converged, $"Failed on {tf.Name}"); Assert.True(r.Fun < 1e-6, $"Fun too high on {tf.Name}");
        }
    }
    [Fact] public void GoldsteinPrice_Bfgs()
    {
        var tf = TestFunctions.GoldsteinPrice;
        var r = MinimizeDispatcher.Minimize(tf.F, new[] { -0.1, -0.9 },
            new MinimizeOptions { Method = "bfgs", Grad = tf.Gradient });
        Assert.True(r.Converged); Assert.True(Math.Abs(r.Fun - 3) < 1e-4);
    }
}
