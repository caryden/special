namespace Optimization;

public class VecOpsTests
{
    [Fact]
    public void Dot_BasicCase()
    {
        Assert.Equal(32.0, VecOps.Dot([1, 2, 3], [4, 5, 6]));
    }

    [Fact]
    public void Dot_ZeroVectors()
    {
        Assert.Equal(0.0, VecOps.Dot([0, 0], [1, 1]));
    }

    [Fact]
    public void Norm_ThreeFour()
    {
        Assert.Equal(5.0, VecOps.Norm([3, 4]));
    }

    [Fact]
    public void Norm_Zero()
    {
        Assert.Equal(0.0, VecOps.Norm([0, 0, 0]));
    }

    [Fact]
    public void NormInf_Mixed()
    {
        Assert.Equal(3.0, VecOps.NormInf([1, -3, 2]));
    }

    [Fact]
    public void NormInf_Zero()
    {
        Assert.Equal(0.0, VecOps.NormInf([0, 0]));
    }

    [Fact]
    public void Scale_Basic()
    {
        Assert.Equal([3.0, 6.0], VecOps.Scale([1, 2], 3));
    }

    [Fact]
    public void Scale_Zero()
    {
        Assert.Equal([0.0, 0.0], VecOps.Scale([1, 2], 0));
    }

    [Fact]
    public void Add_Basic()
    {
        Assert.Equal([4.0, 6.0], VecOps.Add([1, 2], [3, 4]));
    }

    [Fact]
    public void Sub_Basic()
    {
        Assert.Equal([2.0, 2.0], VecOps.Sub([3, 4], [1, 2]));
    }

    [Fact]
    public void Negate_Basic()
    {
        Assert.Equal([-1.0, 2.0], VecOps.Negate([1, -2]));
    }

    [Fact]
    public void Clone_CreatesNewArray()
    {
        double[] original = [1, 2];
        double[] cloned = VecOps.Clone(original);
        Assert.Equal([1.0, 2.0], cloned);

        // Verify it's a distinct array
        cloned[0] = 99;
        Assert.Equal(1.0, original[0]);
    }

    [Fact]
    public void Zeros_CreateZeroVector()
    {
        Assert.Equal([0.0, 0.0, 0.0], VecOps.Zeros(3));
    }

    [Fact]
    public void AddScaled_Basic()
    {
        Assert.Equal([7.0, 10.0], VecOps.AddScaled([1, 2], [3, 4], 2));
    }

    [Fact]
    public void Add_DoesNotMutateInputs()
    {
        double[] a = [1, 2];
        double[] b = [3, 4];
        VecOps.Add(a, b);
        Assert.Equal([1.0, 2.0], a);
        Assert.Equal([3.0, 4.0], b);
    }

    [Fact]
    public void Scale_DoesNotMutateInput()
    {
        double[] v = [1, 2];
        VecOps.Scale(v, 3);
        Assert.Equal([1.0, 2.0], v);
    }
}
