package optimization

/**
 * Shared types and convergence logic for optimization algorithms
 */

data class OptimizeOptions(
    val gradTol: Double = 1e-8,
    val stepTol: Double = 1e-8,
    val funcTol: Double = 1e-12,
    val maxIterations: Int = 1000
)

data class OptimizeResult(
    val x: DoubleArray,
    val `fun`: Double,
    val gradient: DoubleArray?,
    val iterations: Int,
    val functionCalls: Int,
    val gradientCalls: Int,
    val converged: Boolean,
    val message: String
)

sealed class ConvergenceReason {
    object Gradient : ConvergenceReason()
    object Step : ConvergenceReason()
    object Function : ConvergenceReason()
    object MaxIterations : ConvergenceReason()
    object LineSearchFailed : ConvergenceReason()
}

/** Create default options with optional overrides */
fun defaultOptions(
    gradTol: Double? = null,
    stepTol: Double? = null,
    funcTol: Double? = null,
    maxIterations: Int? = null
): OptimizeOptions {
    return OptimizeOptions(
        gradTol = gradTol ?: 1e-8,
        stepTol = stepTol ?: 1e-8,
        funcTol = funcTol ?: 1e-12,
        maxIterations = maxIterations ?: 1000
    )
}

/** Check convergence criteria in order: gradient -> step -> function -> maxIterations */
fun checkConvergence(
    gradNorm: Double,
    stepNorm: Double,
    funcChange: Double,
    iteration: Int,
    opts: OptimizeOptions
): ConvergenceReason? {
    if (gradNorm < opts.gradTol) return ConvergenceReason.Gradient
    if (stepNorm < opts.stepTol) return ConvergenceReason.Step
    if (funcChange < opts.funcTol) return ConvergenceReason.Function
    if (iteration >= opts.maxIterations) return ConvergenceReason.MaxIterations
    return null
}

/** True for gradient/step/function; false for maxIterations/lineSearchFailed */
fun isConverged(reason: ConvergenceReason): Boolean {
    return when (reason) {
        is ConvergenceReason.Gradient -> true
        is ConvergenceReason.Step -> true
        is ConvergenceReason.Function -> true
        is ConvergenceReason.MaxIterations -> false
        is ConvergenceReason.LineSearchFailed -> false
    }
}

/** Human-readable convergence message */
fun convergenceMessage(reason: ConvergenceReason): String {
    return when (reason) {
        is ConvergenceReason.Gradient -> "Converged: gradient norm below tolerance"
        is ConvergenceReason.Step -> "Converged: step size below tolerance"
        is ConvergenceReason.Function -> "Converged: function change below tolerance"
        is ConvergenceReason.MaxIterations -> "Stopped: maximum iterations reached"
        is ConvergenceReason.LineSearchFailed -> "Stopped: line search failed"
    }
}
