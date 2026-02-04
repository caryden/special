package optimization

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.assertFalse

class ResultTypesTest {
    @Test
    fun testDefaultOptions() {
        val opts = defaultOptions()
        assertEquals(1e-8, opts.gradTol)
        assertEquals(1e-8, opts.stepTol)
        assertEquals(1e-12, opts.funcTol)
        assertEquals(1000, opts.maxIterations)
    }

    @Test
    fun testDefaultOptionsWithOverrides() {
        val opts = defaultOptions(gradTol = 1e-4)
        assertEquals(1e-4, opts.gradTol)
        assertEquals(1e-8, opts.stepTol)
        assertEquals(1e-12, opts.funcTol)
        assertEquals(1000, opts.maxIterations)
    }

    @Test
    fun testCheckConvergenceGradient() {
        val opts = defaultOptions()
        val reason = checkConvergence(1e-9, 0.1, 0.1, 5, opts)
        assertTrue(reason is ConvergenceReason.Gradient)
    }

    @Test
    fun testCheckConvergenceStep() {
        val opts = defaultOptions()
        val reason = checkConvergence(0.1, 1e-9, 0.1, 5, opts)
        assertTrue(reason is ConvergenceReason.Step)
    }

    @Test
    fun testCheckConvergenceFunction() {
        val opts = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 1e-13, 5, opts)
        assertTrue(reason is ConvergenceReason.Function)
    }

    @Test
    fun testCheckConvergenceMaxIterations() {
        val opts = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 0.1, 1000, opts)
        assertTrue(reason is ConvergenceReason.MaxIterations)
    }

    @Test
    fun testCheckConvergenceNoCriterionMet() {
        val opts = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 0.1, 5, opts)
        assertNull(reason)
    }

    @Test
    fun testIsConverged() {
        assertTrue(isConverged(ConvergenceReason.Gradient))
        assertTrue(isConverged(ConvergenceReason.Step))
        assertTrue(isConverged(ConvergenceReason.Function))
        assertFalse(isConverged(ConvergenceReason.MaxIterations))
        assertFalse(isConverged(ConvergenceReason.LineSearchFailed))
    }

    @Test
    fun testConvergencePriority() {
        // When multiple criteria are met, gradient takes priority
        val opts = defaultOptions()
        val reason = checkConvergence(1e-9, 1e-9, 1e-13, 1000, opts)
        assertTrue(reason is ConvergenceReason.Gradient)
    }

    @Test
    fun testConvergenceMessages() {
        assertEquals("Converged: gradient norm below tolerance", convergenceMessage(ConvergenceReason.Gradient))
        assertEquals("Converged: step size below tolerance", convergenceMessage(ConvergenceReason.Step))
        assertEquals("Converged: function change below tolerance", convergenceMessage(ConvergenceReason.Function))
        assertEquals("Stopped: maximum iterations reached", convergenceMessage(ConvergenceReason.MaxIterations))
        assertEquals("Stopped: line search failed", convergenceMessage(ConvergenceReason.LineSearchFailed))
    }
}
