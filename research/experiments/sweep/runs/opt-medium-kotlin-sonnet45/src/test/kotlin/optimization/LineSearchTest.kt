package optimization

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.math.abs

class LineSearchTest {
    // Test functions
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

    @Test
    fun testBacktrackingSphereFrom10_10() {
        val x = doubleArrayOf(10.0, 10.0)
        val fx = sphere(x)
        val gx = sphereGrad(x)
        val d = negate(gx) // descent direction

        val result = backtrackingLineSearch(::sphere, x, d, fx, gx)

        assertTrue(result.success)
        assertEquals(0.5, result.alpha, 1e-10)
        assertEquals(0.0, result.fNew, 1e-10)
    }

    @Test
    fun testBacktrackingRosenbrock() {
        val x = doubleArrayOf(-1.2, 1.0)
        val fx = rosenbrock(x)
        val gx = rosenbrockGrad(x)
        val d = negate(gx)

        val result = backtrackingLineSearch(::rosenbrock, x, d, fx, gx)

        assertTrue(result.success)
        assertTrue(result.fNew < fx)
    }

    @Test
    fun testBacktrackingAscendingDirection() {
        val x = doubleArrayOf(10.0, 10.0)
        val fx = sphere(x)
        val gx = sphereGrad(x)
        val d = gx // ascending direction (wrong way)

        val result = backtrackingLineSearch(::sphere, x, d, fx, gx)

        assertTrue(!result.success)
    }

    @Test
    fun testWolfeSphereFrom10_10() {
        val x = doubleArrayOf(10.0, 10.0)
        val fx = sphere(x)
        val gx = sphereGrad(x)
        val d = negate(gx)

        val result = wolfeLineSearch(::sphere, ::sphereGrad, x, d, fx, gx)

        assertTrue(result.success)

        // Verify Wolfe conditions
        val c1 = 1e-4
        val c2 = 0.9
        val directionDot = dot(gx, d)

        // Armijo condition
        assertTrue(result.fNew <= fx + c1 * result.alpha * directionDot)

        // Curvature condition
        assertNotNull(result.gNew)
        val gNewDot = dot(result.gNew!!, d)
        assertTrue(abs(gNewDot) <= c2 * abs(directionDot))
    }

    @Test
    fun testWolfeRosenbrock() {
        val x = doubleArrayOf(-1.2, 1.0)
        val fx = rosenbrock(x)
        val gx = rosenbrockGrad(x)
        val d = negate(gx)

        val result = wolfeLineSearch(::rosenbrock, ::rosenbrockGrad, x, d, fx, gx)

        assertTrue(result.success)
        assertTrue(result.fNew < fx)
    }

    @Test
    fun testWolfeReturnsGradient() {
        val x = doubleArrayOf(10.0, 10.0)
        val fx = sphere(x)
        val gx = sphereGrad(x)
        val d = negate(gx)

        val result = wolfeLineSearch(::sphere, ::sphereGrad, x, d, fx, gx)

        assertNotNull(result.gNew)
        assertEquals(2, result.gNew!!.size)
    }
}
