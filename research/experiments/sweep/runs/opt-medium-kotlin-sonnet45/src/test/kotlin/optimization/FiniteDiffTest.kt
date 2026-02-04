package optimization

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.math.abs

class FiniteDiffTest {
    // Test functions with analytic gradients
    private fun sphere(x: DoubleArray): Double = x.sumOf { it * it }
    private fun sphereGrad(x: DoubleArray): DoubleArray = DoubleArray(x.size) { 2.0 * x[it] }

    private fun rosenbrock(x: DoubleArray): Double {
        val a = 1.0 - x[0]
        val b = x[1] - x[0] * x[0]
        return a * a + 100.0 * b * b
    }

    private fun rosenbrockGrad(x: DoubleArray): DoubleArray {
        val g = DoubleArray(2)
        g[0] = -2.0 * (1.0 - x[0]) - 400.0 * x[0] * (x[1] - x[0] * x[0])
        g[1] = 200.0 * (x[1] - x[0] * x[0])
        return g
    }

    private fun beale(x: DoubleArray): Double {
        val t1 = 1.5 - x[0] + x[0] * x[1]
        val t2 = 2.25 - x[0] + x[0] * x[1] * x[1]
        val t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1]
        return t1 * t1 + t2 * t2 + t3 * t3
    }

    private fun bealeGrad(x: DoubleArray): DoubleArray {
        val t1 = 1.5 - x[0] + x[0] * x[1]
        val t2 = 2.25 - x[0] + x[0] * x[1] * x[1]
        val t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1]
        val g = DoubleArray(2)
        g[0] = 2.0 * t1 * (-1.0 + x[1]) + 2.0 * t2 * (-1.0 + x[1] * x[1]) + 2.0 * t3 * (-1.0 + x[1] * x[1] * x[1])
        g[1] = 2.0 * t1 * x[0] + 2.0 * t2 * (2.0 * x[0] * x[1]) + 2.0 * t3 * (3.0 * x[0] * x[1] * x[1])
        return g
    }

    private fun assertArrayEquals(expected: DoubleArray, actual: DoubleArray, tol: Double) {
        assertEquals(expected.size, actual.size)
        for (i in expected.indices) {
            assertEquals(expected[i], actual[i], tol, "Mismatch at index $i")
        }
    }

    @Test
    fun testForwardDiffSphere3_4() {
        val x = doubleArrayOf(3.0, 4.0)
        val expected = sphereGrad(x)
        val actual = forwardDiffGradient(::sphere, x)
        assertArrayEquals(expected, actual, 1e-6)
    }

    @Test
    fun testForwardDiffSphere0_0() {
        val x = doubleArrayOf(0.0, 0.0)
        val expected = sphereGrad(x)
        val actual = forwardDiffGradient(::sphere, x)
        assertArrayEquals(expected, actual, 1e-7)
    }

    @Test
    fun testForwardDiffRosenbrock() {
        val x = doubleArrayOf(-1.2, 1.0)
        val expected = rosenbrockGrad(x)
        val actual = forwardDiffGradient(::rosenbrock, x)
        assertArrayEquals(expected, actual, 1e-4)
    }

    @Test
    fun testForwardDiffBeale() {
        val x = doubleArrayOf(1.0, 1.0)
        val expected = bealeGrad(x)
        val actual = forwardDiffGradient(::beale, x)
        assertArrayEquals(expected, actual, 1e-5)
    }

    @Test
    fun testCentralDiffSphere3_4() {
        val x = doubleArrayOf(3.0, 4.0)
        val expected = sphereGrad(x)
        val actual = centralDiffGradient(::sphere, x)
        assertArrayEquals(expected, actual, 1e-10)
    }

    @Test
    fun testCentralDiffSphere0_0() {
        val x = doubleArrayOf(0.0, 0.0)
        val expected = sphereGrad(x)
        val actual = centralDiffGradient(::sphere, x)
        assertArrayEquals(expected, actual, 1e-10)
    }

    @Test
    fun testCentralDiffRosenbrock() {
        val x = doubleArrayOf(-1.2, 1.0)
        val expected = rosenbrockGrad(x)
        val actual = centralDiffGradient(::rosenbrock, x)
        assertArrayEquals(expected, actual, 1e-7)
    }

    @Test
    fun testCentralDiffBeale() {
        val x = doubleArrayOf(1.0, 1.0)
        val expected = bealeGrad(x)
        val actual = centralDiffGradient(::beale, x)
        assertArrayEquals(expected, actual, 1e-8)
    }

    @Test
    fun testMakeGradientForward() {
        val gradFn = makeGradient(::sphere)
        val x = doubleArrayOf(3.0, 4.0)
        val expected = forwardDiffGradient(::sphere, x)
        val actual = gradFn(x)
        assertArrayEquals(expected, actual, 1e-15)
    }

    @Test
    fun testMakeGradientCentral() {
        val gradFn = makeGradient(::sphere, "central")
        val x = doubleArrayOf(3.0, 4.0)
        val expected = centralDiffGradient(::sphere, x)
        val actual = gradFn(x)
        assertArrayEquals(expected, actual, 1e-15)
    }
}
