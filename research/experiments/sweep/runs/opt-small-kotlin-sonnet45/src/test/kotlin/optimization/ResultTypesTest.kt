package optimization

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFalse
import kotlin.test.assertNull

class ResultTypesTest {
    @Test
    fun testDefaultOptions() {
        val defaults = defaultOptions()
        assertEquals(1e-8, defaults.gradTol)
        assertEquals(1e-8, defaults.stepTol)
        assertEquals(1e-12, defaults.funcTol)
        assertEquals(1000, defaults.maxIterations)
    }

    @Test
    fun testDefaultOptionsWithOverrides() {
        val opts = defaultOptions { copy(gradTol = 1e-4) }
        assertEquals(1e-4, opts.gradTol)
        assertEquals(1e-8, opts.stepTol)
        assertEquals(1e-12, opts.funcTol)
        assertEquals(1000, opts.maxIterations)
    }

    @Test
    fun testCheckConvergenceGradient() {
        val defaults = defaultOptions()
        val reason = checkConvergence(1e-9, 0.1, 0.1, 5, defaults)
        assertTrue(reason is ConvergenceReason.Gradient)
    }

    @Test
    fun testCheckConvergenceStep() {
        val defaults = defaultOptions()
        val reason = checkConvergence(0.1, 1e-9, 0.1, 5, defaults)
        assertTrue(reason is ConvergenceReason.Step)
    }

    @Test
    fun testCheckConvergenceFunction() {
        val defaults = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 1e-13, 5, defaults)
        assertTrue(reason is ConvergenceReason.Function)
    }

    @Test
    fun testCheckConvergenceMaxIterations() {
        val defaults = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 0.1, 1000, defaults)
        assertTrue(reason is ConvergenceReason.MaxIterations)
    }

    @Test
    fun testCheckConvergenceNone() {
        val defaults = defaultOptions()
        val reason = checkConvergence(0.1, 0.1, 0.1, 5, defaults)
        assertNull(reason)
    }

    @Test
    fun testIsConvergedGradient() {
        assertTrue(isConverged(ConvergenceReason.Gradient))
    }

    @Test
    fun testIsConvergedStep() {
        assertTrue(isConverged(ConvergenceReason.Step))
    }

    @Test
    fun testIsConvergedFunction() {
        assertTrue(isConverged(ConvergenceReason.Function))
    }

    @Test
    fun testIsConvergedMaxIterations() {
        assertFalse(isConverged(ConvergenceReason.MaxIterations))
    }

    @Test
    fun testIsConvergedLineSearchFailed() {
        assertFalse(isConverged(ConvergenceReason.LineSearchFailed))
    }

    @Test
    fun testConvergenceMessages() {
        assertEquals("Gradient norm below tolerance", convergenceMessage(ConvergenceReason.Gradient))
        assertEquals("Step size below tolerance", convergenceMessage(ConvergenceReason.Step))
        assertEquals("Function change below tolerance", convergenceMessage(ConvergenceReason.Function))
        assertEquals("Maximum iterations reached", convergenceMessage(ConvergenceReason.MaxIterations))
        assertEquals("Line search failed", convergenceMessage(ConvergenceReason.LineSearchFailed))
    }

    @Test
    fun testConvergencePriority() {
        // When multiple criteria are met, should return first match: gradient → step → function
        val defaults = defaultOptions()

        // All three main criteria met: should return gradient
        val reason1 = checkConvergence(1e-9, 1e-9, 1e-13, 5, defaults)
        assertTrue(reason1 is ConvergenceReason.Gradient)

        // Step and function met: should return step
        val reason2 = checkConvergence(0.1, 1e-9, 1e-13, 5, defaults)
        assertTrue(reason2 is ConvergenceReason.Step)
    }
}
