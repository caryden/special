package optimization

/**
 * Shared types and convergence logic used by all optimization algorithms.
 */

/**
 * Options for optimization algorithms.
 */
data class OptimizeOptions(
    val gradTol: Double = 1e-8,
    val stepTol: Double = 1e-8,
    val funcTol: Double = 1e-12,
    val maxIterations: Int = 1000
)

/**
 * Result of an optimization run.
 */
data class OptimizeResult(
    val x: DoubleArray,
    val `fun`: Double,
    val gradient: DoubleArray?,
    val iterations: Int,
    val functionCalls: Int,
    val gradientCalls: Int,
    val converged: Boolean,
    val message: String
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is OptimizeResult) return false

        if (!x.contentEquals(other.x)) return false
        if (`fun` != other.`fun`) return false
        if (gradient != null) {
            if (other.gradient == null) return false
            if (!gradient.contentEquals(other.gradient)) return false
        } else if (other.gradient != null) return false
        if (iterations != other.iterations) return false
        if (functionCalls != other.functionCalls) return false
        if (gradientCalls != other.gradientCalls) return false
        if (converged != other.converged) return false
        if (message != other.message) return false

        return true
    }

    override fun hashCode(): Int {
        var result = x.contentHashCode()
        result = 31 * result + `fun`.hashCode()
        result = 31 * result + (gradient?.contentHashCode() ?: 0)
        result = 31 * result + iterations
        result = 31 * result + functionCalls
        result = 31 * result + gradientCalls
        result = 31 * result + converged.hashCode()
        result = 31 * result + message.hashCode()
        return result
    }
}

/**
 * Convergence reason (tagged union).
 */
sealed class ConvergenceReason {
    object Gradient : ConvergenceReason()
    object Step : ConvergenceReason()
    object Function : ConvergenceReason()
    object MaxIterations : ConvergenceReason()
    object LineSearchFailed : ConvergenceReason()
}

/**
 * Create default options with optional overrides.
 */
fun defaultOptions(overrides: OptimizeOptions.() -> OptimizeOptions = { this }): OptimizeOptions {
    return OptimizeOptions().overrides()
}

/**
 * Check convergence criteria in order: gradient → step → function → maxIterations.
 * Returns the first matched criterion, or null if none are met.
 */
fun checkConvergence(
    gradNorm: Double,
    stepNorm: Double,
    funcChange: Double,
    iteration: Int,
    opts: OptimizeOptions
): ConvergenceReason? {
    if (gradNorm < opts.gradTol) {
        return ConvergenceReason.Gradient
    }
    if (stepNorm < opts.stepTol) {
        return ConvergenceReason.Step
    }
    if (funcChange < opts.funcTol) {
        return ConvergenceReason.Function
    }
    if (iteration >= opts.maxIterations) {
        return ConvergenceReason.MaxIterations
    }
    return null
}

/**
 * Check if a convergence reason represents successful convergence.
 * True for gradient/step/function; false for maxIterations/lineSearchFailed.
 */
fun isConverged(reason: ConvergenceReason): Boolean {
    return when (reason) {
        is ConvergenceReason.Gradient -> true
        is ConvergenceReason.Step -> true
        is ConvergenceReason.Function -> true
        is ConvergenceReason.MaxIterations -> false
        is ConvergenceReason.LineSearchFailed -> false
    }
}

/**
 * Get human-readable convergence message.
 */
fun convergenceMessage(reason: ConvergenceReason): String {
    return when (reason) {
        is ConvergenceReason.Gradient -> "Gradient norm below tolerance"
        is ConvergenceReason.Step -> "Step size below tolerance"
        is ConvergenceReason.Function -> "Function change below tolerance"
        is ConvergenceReason.MaxIterations -> "Maximum iterations reached"
        is ConvergenceReason.LineSearchFailed -> "Line search failed"
    }
}
