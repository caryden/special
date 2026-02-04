using Xunit;
using Optimization;

namespace Optimization.Tests
{
    public class VecOpsTests
    {
        [Fact]
        public void Dot_BasicVectors()
        {
            Assert.Equal(32.0, VecOps.Dot(new[] { 1.0, 2.0, 3.0 }, new[] { 4.0, 5.0, 6.0 }));
        }

        [Fact]
        public void Dot_WithZeros()
        {
            Assert.Equal(0.0, VecOps.Dot(new[] { 0.0, 0.0 }, new[] { 1.0, 1.0 }));
        }

        [Fact]
        public void Norm_3_4()
        {
            Assert.Equal(5.0, VecOps.Norm(new[] { 3.0, 4.0 }));
        }

        [Fact]
        public void Norm_Zeros()
        {
            Assert.Equal(0.0, VecOps.Norm(new[] { 0.0, 0.0, 0.0 }));
        }

        [Fact]
        public void NormInf_MixedSigns()
        {
            Assert.Equal(3.0, VecOps.NormInf(new[] { 1.0, -3.0, 2.0 }));
        }

        [Fact]
        public void NormInf_Zeros()
        {
            Assert.Equal(0.0, VecOps.NormInf(new[] { 0.0, 0.0 }));
        }

        [Fact]
        public void Scale_Basic()
        {
            Assert.Equal(new[] { 3.0, 6.0 }, VecOps.Scale(new[] { 1.0, 2.0 }, 3.0));
        }

        [Fact]
        public void Scale_ByZero()
        {
            Assert.Equal(new[] { 0.0, 0.0 }, VecOps.Scale(new[] { 1.0, 2.0 }, 0.0));
        }

        [Fact]
        public void Add_Basic()
        {
            Assert.Equal(new[] { 4.0, 6.0 }, VecOps.Add(new[] { 1.0, 2.0 }, new[] { 3.0, 4.0 }));
        }

        [Fact]
        public void Sub_Basic()
        {
            Assert.Equal(new[] { 2.0, 2.0 }, VecOps.Sub(new[] { 3.0, 4.0 }, new[] { 1.0, 2.0 }));
        }

        [Fact]
        public void Negate_Basic()
        {
            Assert.Equal(new[] { -1.0, 2.0 }, VecOps.Negate(new[] { 1.0, -2.0 }));
        }

        [Fact]
        public void Clone_ReturnsNewArray()
        {
            var original = new[] { 1.0, 2.0 };
            var cloned = VecOps.Clone(original);
            Assert.Equal(new[] { 1.0, 2.0 }, cloned);
            cloned[0] = 99.0;
            Assert.Equal(1.0, original[0]); // original not affected
        }

        [Fact]
        public void Zeros_Basic()
        {
            Assert.Equal(new[] { 0.0, 0.0, 0.0 }, VecOps.Zeros(3));
        }

        [Fact]
        public void AddScaled_Basic()
        {
            Assert.Equal(new[] { 7.0, 10.0 }, VecOps.AddScaled(new[] { 1.0, 2.0 }, new[] { 3.0, 4.0 }, 2.0));
        }

        [Fact]
        public void Add_DoesNotMutateInputs()
        {
            var a = new[] { 1.0, 2.0 };
            var b = new[] { 3.0, 4.0 };
            VecOps.Add(a, b);
            Assert.Equal(new[] { 1.0, 2.0 }, a);
            Assert.Equal(new[] { 3.0, 4.0 }, b);
        }

        [Fact]
        public void Scale_DoesNotMutateInput()
        {
            var v = new[] { 1.0, 2.0 };
            VecOps.Scale(v, 5.0);
            Assert.Equal(new[] { 1.0, 2.0 }, v);
        }
    }
}
