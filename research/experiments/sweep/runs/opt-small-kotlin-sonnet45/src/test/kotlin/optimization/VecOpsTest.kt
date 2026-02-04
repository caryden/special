package optimization

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertContentEquals
import kotlin.test.assertNotSame

class VecOpsTest {
    private val epsilon = 1e-10

    @Test
    fun testDot() {
        assertEquals(32.0, VecOps.dot(doubleArrayOf(1.0, 2.0, 3.0), doubleArrayOf(4.0, 5.0, 6.0)), epsilon)
        assertEquals(0.0, VecOps.dot(doubleArrayOf(0.0, 0.0), doubleArrayOf(1.0, 1.0)), epsilon)
    }

    @Test
    fun testNorm() {
        assertEquals(5.0, VecOps.norm(doubleArrayOf(3.0, 4.0)), epsilon)
        assertEquals(0.0, VecOps.norm(doubleArrayOf(0.0, 0.0, 0.0)), epsilon)
    }

    @Test
    fun testNormInf() {
        assertEquals(3.0, VecOps.normInf(doubleArrayOf(1.0, -3.0, 2.0)), epsilon)
        assertEquals(0.0, VecOps.normInf(doubleArrayOf(0.0, 0.0)), epsilon)
    }

    @Test
    fun testScale() {
        assertContentEquals(doubleArrayOf(3.0, 6.0), VecOps.scale(doubleArrayOf(1.0, 2.0), 3.0))
        assertContentEquals(doubleArrayOf(0.0, 0.0), VecOps.scale(doubleArrayOf(1.0, 2.0), 0.0))
    }

    @Test
    fun testAdd() {
        assertContentEquals(doubleArrayOf(4.0, 6.0), VecOps.add(doubleArrayOf(1.0, 2.0), doubleArrayOf(3.0, 4.0)))
    }

    @Test
    fun testSub() {
        assertContentEquals(doubleArrayOf(2.0, 2.0), VecOps.sub(doubleArrayOf(3.0, 4.0), doubleArrayOf(1.0, 2.0)))
    }

    @Test
    fun testNegate() {
        assertContentEquals(doubleArrayOf(-1.0, 2.0), VecOps.negate(doubleArrayOf(1.0, -2.0)))
    }

    @Test
    fun testClone() {
        val original = doubleArrayOf(1.0, 2.0)
        val cloned = VecOps.clone(original)
        assertContentEquals(doubleArrayOf(1.0, 2.0), cloned)
        assertNotSame(original, cloned)

        // Verify modifying clone doesn't affect original
        cloned[0] = 99.0
        assertEquals(1.0, original[0], epsilon)
    }

    @Test
    fun testZeros() {
        assertContentEquals(doubleArrayOf(0.0, 0.0, 0.0), VecOps.zeros(3))
    }

    @Test
    fun testAddScaled() {
        assertContentEquals(doubleArrayOf(7.0, 10.0), VecOps.addScaled(doubleArrayOf(1.0, 2.0), doubleArrayOf(3.0, 4.0), 2.0))
    }

    @Test
    fun testPurityAdd() {
        val a = doubleArrayOf(1.0, 2.0)
        val b = doubleArrayOf(3.0, 4.0)
        VecOps.add(a, b)
        assertContentEquals(doubleArrayOf(1.0, 2.0), a)
        assertContentEquals(doubleArrayOf(3.0, 4.0), b)
    }

    @Test
    fun testPurityScale() {
        val v = doubleArrayOf(1.0, 2.0)
        VecOps.scale(v, 3.0)
        assertContentEquals(doubleArrayOf(1.0, 2.0), v)
    }
}
