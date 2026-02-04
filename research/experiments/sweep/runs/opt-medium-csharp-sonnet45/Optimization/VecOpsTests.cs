namespace Optimization.Tests;

using Xunit;

public class VecOpsTests
{
    [Fact]
    public void Dot_StandardVectors_ReturnsCorrectValue()
    {
        Assert.Equal(32.0, VecOps.Dot(new[] { 1.0, 2.0, 3.0 }, new[] { 4.0, 5.0, 6.0 }));
    }

    [Fact]
    public void Dot_ZeroVectors_ReturnsZero()
    {
        Assert.Equal(0.0, VecOps.Dot(new[] { 0.0, 0.0 }, new[] { 1.0, 1.0 }));
    }

    [Fact]
    public void Norm_ThreeFourVector_ReturnsFive()
    {
        Assert.Equal(5.0, VecOps.Norm(new[] { 3.0, 4.0 }));
    }

    [Fact]
    public void Norm_ZeroVector_ReturnsZero()
    {
        Assert.Equal(0.0, VecOps.Norm(new[] { 0.0, 0.0, 0.0 }));
    }

    [Fact]
    public void NormInf_MixedVector_ReturnsMaxAbsValue()
    {
        Assert.Equal(3.0, VecOps.NormInf(new[] { 1.0, -3.0, 2.0 }));
    }

    [Fact]
    public void NormInf_ZeroVector_ReturnsZero()
    {
        Assert.Equal(0.0, VecOps.NormInf(new[] { 0.0, 0.0 }));
    }

    [Fact]
    public void Scale_ByThree_ReturnsScaledVector()
    {
        double[] result = VecOps.Scale(new[] { 1.0, 2.0 }, 3.0);
        Assert.Equal(new[] { 3.0, 6.0 }, result);
    }

    [Fact]
    public void Scale_ByZero_ReturnsZeroVector()
    {
        double[] result = VecOps.Scale(new[] { 1.0, 2.0 }, 0.0);
        Assert.Equal(new[] { 0.0, 0.0 }, result);
    }

    [Fact]
    public void Add_TwoVectors_ReturnsSum()
    {
        double[] result = VecOps.Add(new[] { 1.0, 2.0 }, new[] { 3.0, 4.0 });
        Assert.Equal(new[] { 4.0, 6.0 }, result);
    }

    [Fact]
    public void Sub_TwoVectors_ReturnsDifference()
    {
        double[] result = VecOps.Sub(new[] { 3.0, 4.0 }, new[] { 1.0, 2.0 });
        Assert.Equal(new[] { 2.0, 2.0 }, result);
    }

    [Fact]
    public void Negate_Vector_ReturnsNegated()
    {
        double[] result = VecOps.Negate(new[] { 1.0, -2.0 });
        Assert.Equal(new[] { -1.0, 2.0 }, result);
    }

    [Fact]
    public void Clone_Vector_ReturnsDeepCopy()
    {
        double[] original = new[] { 1.0, 2.0 };
        double[] clone = VecOps.Clone(original);
        Assert.Equal(original, clone);
        Assert.NotSame(original, clone);
    }

    [Fact]
    public void Zeros_CreateThreeElementVector_ReturnsZeroVector()
    {
        double[] result = VecOps.Zeros(3);
        Assert.Equal(new[] { 0.0, 0.0, 0.0 }, result);
    }

    [Fact]
    public void AddScaled_FusedOperation_ReturnsCorrectResult()
    {
        double[] result = VecOps.AddScaled(new[] { 1.0, 2.0 }, new[] { 3.0, 4.0 }, 2.0);
        Assert.Equal(new[] { 7.0, 10.0 }, result);
    }

    [Fact]
    public void Add_DoesNotMutateInputs()
    {
        double[] a = new[] { 1.0, 2.0 };
        double[] b = new[] { 3.0, 4.0 };
        double[] aCopy = (double[])a.Clone();
        double[] bCopy = (double[])b.Clone();

        VecOps.Add(a, b);

        Assert.Equal(aCopy, a);
        Assert.Equal(bCopy, b);
    }

    [Fact]
    public void Scale_DoesNotMutateInput()
    {
        double[] v = new[] { 1.0, 2.0 };
        double[] vCopy = (double[])v.Clone();

        VecOps.Scale(v, 3.0);

        Assert.Equal(vCopy, v);
    }

    [Fact]
    public void Clone_ModifyingClone_DoesNotAffectOriginal()
    {
        double[] original = new[] { 1.0, 2.0 };
        double[] clone = VecOps.Clone(original);
        clone[0] = 999.0;

        Assert.Equal(1.0, original[0]);
    }
}
