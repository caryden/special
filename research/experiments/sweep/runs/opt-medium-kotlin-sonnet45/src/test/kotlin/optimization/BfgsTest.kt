package optimization

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.math.abs

class BfgsTest {
    // Test functions
    private fun sphere(x: DoubleArray): Double = x.sumOf { it * it }
    private fun sphereGrad(x: DoubleArray): DoubleArray = DoubleArray(x.size) { 2.0 * x[it] }

    private fun booth(x: DoubleArray): Double {
        val t1 = x[0] + 2.0 * x[1] - 7.0
        val t2 = 2.0 * x[0] + x[1] - 5.0
        return t1 * t1 + t2 * t2
    }

    private fun boothGrad(x: DoubleArray): DoubleArray {
        val g = DoubleArray(2)
        val t1 = x[0] + 2.0 * x[1] - 7.0
        val t2 = 2.0 * x[0] + x[1] - 5.0
        g[0] = 2.0 * t1 + 4.0 * t2
        g[1] = 4.0 * t1 + 2.0 * t2
        return g
    }

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

    private fun himmelblau(x: DoubleArray): Double {
        val t1 = x[0] * x[0] + x[1] - 11.0
        val t2 = x[0] + x[1] * x[1] - 7.0
        return t1 * t1 + t2 * t2
    }

    private fun himmelblauGrad(x: DoubleArray): DoubleArray {
        val g = DoubleArray(2)
        val t1 = x[0] * x[0] + x[1] - 11.0
        val t2 = x[0] + x[1] * x[1] - 7.0
        g[0] = 2.0 * t1 * 2.0 * x[0] + 2.0 * t2
        g[1] = 2.0 * t1 + 2.0 * t2 * 2.0 * x[1]
        return g
    }

    private fun goldsteinPrice(x: DoubleArray): Double {
        val a = x[0] + x[1] + 1.0
        val b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1]
        val c = 2.0 * x[0] - 3.0 * x[1]
        val d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1]
        return (1.0 + a * a * b) * (30.0 + c * c * d)
    }

    private fun goldsteinPriceGrad(x: DoubleArray): DoubleArray {
        val a = x[0] + x[1] + 1.0
        val b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1]
        val c = 2.0 * x[0] - 3.0 * x[1]
        val d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1]

        val dbdx0 = -14.0 + 6.0 * x[0] + 6.0 * x[1]
        val dbdx1 = -14.0 + 6.0 * x[0] + 6.0 * x[1]
        val dddx0 = -32.0 + 24.0 * x[0] - 36.0 * x[1]
        val dddx1 = 48.0 - 36.0 * x[0] + 54.0 * x[1]

        val term1 = 1.0 + a * a * b
        val term2 = 30.0 + c * c * d

        val dterm1dx0 = 2.0 * a * b + a * a * dbdx0
        val dterm1dx1 = 2.0 * a * b + a * a * dbdx1
        val dterm2dx0 = 2.0 * c * 2.0 * d + c * c * dddx0
        val dterm2dx1 = 2.0 * c * (-3.0) * d + c * c * dddx1

        val g = DoubleArray(2)
        g[0] = dterm1dx0 * term2 + term1 * dterm2dx0
        g[1] = dterm1dx1 * term2 + term1 * dterm2dx1
        return g
    }

    private fun assertApprox(expected: Double, actual: Double, tol: Double, message: String = "") {
        assertTrue(abs(expected - actual) <= tol, "$message: expected $expected, got $actual")
    }

    private fun assertVectorApprox(expected: DoubleArray, actual: DoubleArray, tol: Double) {
        assertEquals(expected.size, actual.size)
        for (i in expected.indices) {
            assertApprox(expected[i], actual[i], tol, "Component $i")
        }
    }

    @Test
    fun testSphereWithAnalytic() {
        val result = bfgs(::sphere, doubleArrayOf(5.0, 5.0), ::sphereGrad)
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-8)
        assertVectorApprox(doubleArrayOf(0.0, 0.0), result.x, 1e-4)
        assertTrue(result.iterations < 20)
    }

    @Test
    fun testBoothWithAnalytic() {
        val result = bfgs(::booth, doubleArrayOf(0.0, 0.0), ::boothGrad)
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-8)
        assertVectorApprox(doubleArrayOf(1.0, 3.0), result.x, 1e-4)
    }

    @Test
    fun testSphereWithFiniteDiff() {
        val result = bfgs(::sphere, doubleArrayOf(5.0, 5.0))
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-6)
    }

    @Test
    fun testRosenbrockWithAnalytic() {
        val result = bfgs(::rosenbrock, doubleArrayOf(-1.2, 1.0), ::rosenbrockGrad)
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-10, "Rosenbrock function value")
        assertVectorApprox(doubleArrayOf(1.0, 1.0), result.x, 1e-4)
    }

    @Test
    fun testBealeWithAnalytic() {
        val result = bfgs(::beale, doubleArrayOf(0.0, 0.0), ::bealeGrad)
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-8, "Beale function value")
        assertVectorApprox(doubleArrayOf(3.0, 0.5), result.x, 1e-3)
    }

    @Test
    fun testHimmelblauWithAnalytic() {
        val result = bfgs(::himmelblau, doubleArrayOf(0.0, 0.0), ::himmelblauGrad)
        assertTrue(result.converged)
        assertApprox(0.0, result.`fun`, 1e-8, "Himmelblau function value")
        // Himmelblau has 4 minima; from (0,0) we should reach (3,2)
        assertTrue(abs(result.x[0] - 3.0) < 0.1 || abs(result.x[0] - (-2.805)) < 0.1 ||
                   abs(result.x[0] - (-3.779)) < 0.1 || abs(result.x[0] - 3.584) < 0.1)
    }

    @Test
    fun testGoldsteinPriceWithAnalytic() {
        // Use starting point [-0.1, -0.9] instead of [0, 0]
        val result = bfgs(::goldsteinPrice, doubleArrayOf(-0.1, -0.9), ::goldsteinPriceGrad)
        assertTrue(result.converged)
        assertApprox(3.0, result.`fun`, 1e-4, "Goldstein-Price function value")
        assertVectorApprox(doubleArrayOf(0.0, -1.0), result.x, 1e-2)
    }

    @Test
    fun testRosenbrockWithFiniteDiff() {
        val result = bfgs(::rosenbrock, doubleArrayOf(-1.2, 1.0))
        assertApprox(0.0, result.`fun`, 1e-6, "Rosenbrock with FD")
        assertVectorApprox(doubleArrayOf(1.0, 1.0), result.x, 1e-2)
    }

    @Test
    fun testReturnsGradient() {
        val result = bfgs(::sphere, doubleArrayOf(5.0, 5.0), ::sphereGrad)
        assertNotNull(result.gradient)
        assertTrue(norm(result.gradient!!) < 1e-6)
    }

    @Test
    fun testMaxIterations() {
        val opts = defaultOptions(maxIterations = 3)
        val result = bfgs(::rosenbrock, doubleArrayOf(-1.2, 1.0), ::rosenbrockGrad, opts)
        assertTrue(result.iterations <= 3)
    }

    @Test
    fun testAlreadyAtMinimum() {
        val result = bfgs(::sphere, doubleArrayOf(0.0, 0.0), ::sphereGrad)
        assertTrue(result.converged)
        assertEquals(0, result.iterations)
    }

    @Test
    fun testMaxIterationsWithImpossibleTolerance() {
        val opts = defaultOptions(maxIterations = 2, gradTol = 1e-30)
        val result = bfgs(::rosenbrock, doubleArrayOf(-1.2, 1.0), ::rosenbrockGrad, opts)
        assertTrue(!result.converged)
        assertTrue(result.iterations <= 2)
    }
}
