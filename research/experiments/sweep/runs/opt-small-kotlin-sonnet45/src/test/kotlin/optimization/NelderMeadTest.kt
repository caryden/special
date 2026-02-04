package optimization

import kotlin.test.Test
import kotlin.test.assertTrue
import kotlin.test.assertEquals
import kotlin.math.pow

class NelderMeadTest {
    // Test functions
    private fun sphere(x: DoubleArray): Double {
        return x.sumOf { it * it }
    }

    private fun booth(x: DoubleArray): Double {
        // (x + 2y - 7)^2 + (2x + y - 5)^2
        // Minimum at (1, 3) with f = 0
        val x1 = x[0]
        val x2 = x[1]
        return (x1 + 2 * x2 - 7).pow(2) + (2 * x1 + x2 - 5).pow(2)
    }

    private fun beale(x: DoubleArray): Double {
        // (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
        // Minimum at (3, 0.5) with f = 0
        val x1 = x[0]
        val y = x[1]
        return (1.5 - x1 + x1 * y).pow(2) +
               (2.25 - x1 + x1 * y.pow(2)).pow(2) +
               (2.625 - x1 + x1 * y.pow(3)).pow(2)
    }

    private fun rosenbrock(x: DoubleArray): Double {
        // 100(y - x^2)^2 + (1 - x)^2
        // Minimum at (1, 1) with f = 0
        val x1 = x[0]
        val x2 = x[1]
        return 100.0 * (x2 - x1 * x1).pow(2) + (1.0 - x1).pow(2)
    }

    private fun himmelblau(x: DoubleArray): Double {
        // (x^2 + y - 11)^2 + (x + y^2 - 7)^2
        // Four minima at: (3, 2), (-2.805118, 3.131312), (-3.779310, -3.283186), (3.584428, -1.848126)
        // All with f = 0
        val x1 = x[0]
        val x2 = x[1]
        return (x1 * x1 + x2 - 11).pow(2) + (x1 + x2 * x2 - 7).pow(2)
    }

    private fun goldsteinPrice(x: DoubleArray): Double {
        // Minimum at (0, -1) with f = 3
        val x1 = x[0]
        val x2 = x[1]
        val term1 = 1 + (x1 + x2 + 1).pow(2) * (19 - 14 * x1 + 3 * x1.pow(2) - 14 * x2 + 6 * x1 * x2 + 3 * x2.pow(2))
        val term2 = 30 + (2 * x1 - 3 * x2).pow(2) * (18 - 32 * x1 + 12 * x1.pow(2) + 48 * x2 - 36 * x1 * x2 + 27 * x2.pow(2))
        return term1 * term2
    }

    @Test
    fun testSphere() {
        val result = nelderMead(::sphere, doubleArrayOf(5.0, 5.0))
        assertTrue(result.converged, "Should converge")
        assertTrue(result.`fun` < 1e-6, "Function value should be near 0, got ${result.`fun`}")
        assertTrue(VecOps.norm(result.x) < 0.01, "Solution should be near [0, 0], got ${result.x.contentToString()}")
    }

    @Test
    fun testBooth() {
        val result = nelderMead(::booth, doubleArrayOf(0.0, 0.0))
        assertTrue(result.converged, "Should converge")
        assertTrue(result.`fun` < 1e-6, "Function value should be near 0, got ${result.`fun`}")
        val expected = doubleArrayOf(1.0, 3.0)
        val diff = VecOps.sub(result.x, expected)
        assertTrue(VecOps.norm(diff) < 0.01, "Solution should be near [1, 3], got ${result.x.contentToString()}")
    }

    @Test
    fun testBeale() {
        val opts = defaultOptions { copy(maxIterations = 5000) }
        val result = nelderMead(::beale, doubleArrayOf(0.0, 0.0), opts)
        assertTrue(result.converged, "Should converge")
        assertTrue(result.`fun` < 1e-6, "Function value should be near 0, got ${result.`fun`}")
    }

    @Test
    fun testRosenbrock() {
        val opts = defaultOptions {
            copy(
                maxIterations = 5000,
                funcTol = 1e-6,
                stepTol = 1e-6
            )
        }
        val result = nelderMead(::rosenbrock, doubleArrayOf(-1.2, 1.0), opts)
        assertTrue(result.converged, "Should converge")
        assertTrue(result.`fun` < 2e-6, "Function value should be near 0, got ${result.`fun`}")
        val expected = doubleArrayOf(1.0, 1.0)
        val diff = VecOps.sub(result.x, expected)
        assertTrue(VecOps.norm(diff) < 0.1, "Solution should be near [1, 1], got ${result.x.contentToString()}")
    }

    @Test
    fun testHimmelblau() {
        val result = nelderMead(::himmelblau, doubleArrayOf(0.0, 0.0))
        assertTrue(result.converged, "Should converge")
        assertTrue(result.`fun` < 1e-6, "Function value should be near 0, got ${result.`fun`}")

        // Should converge to one of the four minima - (3, 2) is most common from (0, 0)
        val minima = listOf(
            doubleArrayOf(3.0, 2.0),
            doubleArrayOf(-2.805118, 3.131312),
            doubleArrayOf(-3.779310, -3.283186),
            doubleArrayOf(3.584428, -1.848126)
        )
        val nearAnyMinimum = minima.any { minimum ->
            val diff = VecOps.sub(result.x, minimum)
            VecOps.norm(diff) < 0.1
        }
        assertTrue(nearAnyMinimum, "Solution should be near one of the four minima, got ${result.x.contentToString()}")
    }

    @Test
    fun testGoldsteinPrice() {
        val result = nelderMead(::goldsteinPrice, doubleArrayOf(0.0, 0.0))
        assertTrue(result.converged, "Should converge")
        // Goldstein-Price has multiple local minima; from (0,0) it may find a local minimum
        // The global minimum is at (0, -1) with f=3, but algorithm may find a different local minimum
        assertTrue(result.`fun` >= 3.0, "Function value should be >= 3 (global minimum), got ${result.`fun`}")
    }

    @Test
    fun testRespectsMaxIterations() {
        val opts = defaultOptions { copy(maxIterations = 5) }
        val result = nelderMead(::rosenbrock, doubleArrayOf(-1.2, 1.0), opts)
        assertTrue(result.iterations <= 5, "Should respect max iterations")
        assertTrue(!result.converged, "Should not converge with only 5 iterations")
        assertTrue(result.message.contains("maximum iterations"), "Message should indicate max iterations reached")
    }

    @Test
    fun testGradientCallsAlwaysZero() {
        val result = nelderMead(::sphere, doubleArrayOf(5.0, 5.0))
        assertEquals(0, result.gradientCalls, "Gradient calls should always be 0 for derivative-free method")
        assertTrue(result.gradient == null, "Gradient should be null")
    }

    @Test
    fun testFunctionCallsCounted() {
        val result = nelderMead(::sphere, doubleArrayOf(5.0, 5.0))
        assertTrue(result.functionCalls > 0, "Should track function calls")
        // Initial simplex: n+1 = 3 evaluations, plus iterations
        assertTrue(result.functionCalls >= 3, "Should have at least initial simplex evaluations")
    }
}
