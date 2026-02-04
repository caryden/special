package optimization

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertContentEquals
import kotlin.test.assertNotSame

class VecOpsTest {
    @Test
    fun testDot() {
        assertEquals(32.0, dot(doubleArrayOf(1.0, 2.0, 3.0), doubleArrayOf(4.0, 5.0, 6.0)))
        assertEquals(0.0, dot(doubleArrayOf(0.0, 0.0), doubleArrayOf(1.0, 1.0)))
    }

    @Test
    fun testNorm() {
        assertEquals(5.0, norm(doubleArrayOf(3.0, 4.0)))
        assertEquals(0.0, norm(doubleArrayOf(0.0, 0.0, 0.0)))
    }

    @Test
    fun testNormInf() {
        assertEquals(3.0, normInf(doubleArrayOf(1.0, -3.0, 2.0)))
        assertEquals(0.0, normInf(doubleArrayOf(0.0, 0.0)))
    }

    @Test
    fun testScale() {
        assertContentEquals(doubleArrayOf(3.0, 6.0), scale(doubleArrayOf(1.0, 2.0), 3.0))
        assertContentEquals(doubleArrayOf(0.0, 0.0), scale(doubleArrayOf(1.0, 2.0), 0.0))
    }

    @Test
    fun testAdd() {
        assertContentEquals(doubleArrayOf(4.0, 6.0), add(doubleArrayOf(1.0, 2.0), doubleArrayOf(3.0, 4.0)))
    }

    @Test
    fun testSub() {
        assertContentEquals(doubleArrayOf(2.0, 2.0), sub(doubleArrayOf(3.0, 4.0), doubleArrayOf(1.0, 2.0)))
    }

    @Test
    fun testNegate() {
        assertContentEquals(doubleArrayOf(-1.0, 2.0), negate(doubleArrayOf(1.0, -2.0)))
    }

    @Test
    fun testClone() {
        val original = doubleArrayOf(1.0, 2.0)
        val copy = clone(original)
        assertContentEquals(doubleArrayOf(1.0, 2.0), copy)
        assertNotSame(original, copy)
    }

    @Test
    fun testZeros() {
        assertContentEquals(doubleArrayOf(0.0, 0.0, 0.0), zeros(3))
    }

    @Test
    fun testAddScaled() {
        assertContentEquals(doubleArrayOf(7.0, 10.0), addScaled(doubleArrayOf(1.0, 2.0), doubleArrayOf(3.0, 4.0), 2.0))
    }

    @Test
    fun testPurity() {
        // add must not modify inputs
        val a = doubleArrayOf(1.0, 2.0)
        val b = doubleArrayOf(3.0, 4.0)
        add(a, b)
        assertContentEquals(doubleArrayOf(1.0, 2.0), a)
        assertContentEquals(doubleArrayOf(3.0, 4.0), b)

        // scale must not modify input
        val v = doubleArrayOf(1.0, 2.0)
        scale(v, 3.0)
        assertContentEquals(doubleArrayOf(1.0, 2.0), v)

        // clone must be distinct
        val original = doubleArrayOf(1.0, 2.0)
        val copy = clone(original)
        copy[0] = 99.0
        assertEquals(1.0, original[0])
    }
}
