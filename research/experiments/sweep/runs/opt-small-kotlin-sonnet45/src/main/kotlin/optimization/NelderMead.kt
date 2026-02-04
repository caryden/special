package optimization

import kotlin.math.max
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Nelder-Mead simplex optimizer (derivative-free).
 */

private const val ALPHA = 1.0  // Reflection coefficient
private const val GAMMA = 2.0  // Expansion coefficient
private const val RHO = 0.5    // Contraction coefficient
private const val SIGMA = 0.5  // Shrink coefficient
private const val INITIAL_SIMPLEX_SCALE = 0.05

private data class SimplexVertex(
    val x: DoubleArray,
    val fx: Double
) {
    fun copy(): SimplexVertex = SimplexVertex(x.copyOf(), fx)
}

/**
 * Minimize a function using the Nelder-Mead algorithm.
 */
fun nelderMead(
    f: (DoubleArray) -> Double,
    x0: DoubleArray,
    options: OptimizeOptions = defaultOptions()
): OptimizeResult {
    val n = x0.size
    var functionCalls = 0

    // Create initial simplex
    val simplex = mutableListOf<SimplexVertex>()
    simplex.add(SimplexVertex(x0.copyOf(), f(x0)))
    functionCalls++

    for (i in 0 until n) {
        val h = INITIAL_SIMPLEX_SCALE * max(abs(x0[i]), 1.0)
        val vertex = x0.copyOf()
        vertex[i] += h
        simplex.add(SimplexVertex(vertex, f(vertex)))
        functionCalls++
    }

    var iteration = 0

    while (iteration < options.maxIterations) {
        // Sort vertices by function value (ascending)
        simplex.sortBy { it.fx }

        val fBest = simplex[0].fx
        val fWorst = simplex[n].fx
        val fSecondWorst = simplex[n - 1].fx

        // Check convergence: function value spread
        val fValues = simplex.map { it.fx }.toDoubleArray()
        val fStd = standardDeviation(fValues)

        if (fStd < options.funcTol) {
            return OptimizeResult(
                x = simplex[0].x.copyOf(),
                `fun` = fBest,
                gradient = null,
                iterations = iteration,
                functionCalls = functionCalls,
                gradientCalls = 0,
                converged = true,
                message = "Converged: simplex function spread %.2e below tolerance".format(fStd)
            )
        }

        // Check convergence: simplex diameter (max distance from best vertex)
        var diameter = 0.0
        for (i in 1..n) {
            val d = VecOps.normInf(VecOps.sub(simplex[i].x, simplex[0].x))
            if (d > diameter) diameter = d
        }

        if (diameter < options.stepTol) {
            return OptimizeResult(
                x = simplex[0].x.copyOf(),
                `fun` = fBest,
                gradient = null,
                iterations = iteration,
                functionCalls = functionCalls,
                gradientCalls = 0,
                converged = true,
                message = "Converged: simplex diameter %.2e below tolerance".format(diameter)
            )
        }

        iteration++

        val best = simplex[0]
        val worst = simplex[n]

        // Compute centroid of all vertices except worst
        val centroid = simplex[0].x.copyOf()
        for (i in 1 until n) {
            for (j in 0 until n) {
                centroid[j] += simplex[i].x[j]
            }
        }
        for (j in 0 until n) {
            centroid[j] /= n.toDouble()
        }

        // Reflection: x_r = centroid + alpha * (centroid - worst)
        val reflected = VecOps.addScaled(centroid, VecOps.sub(centroid, worst.x), ALPHA)
        val fReflected = f(reflected)
        functionCalls++

        if (fReflected < fSecondWorst && fReflected >= fBest) {
            // Accept reflection
            simplex[n] = SimplexVertex(reflected, fReflected)
            continue
        }

        if (fReflected < fBest) {
            // Try expansion: x_e = centroid + gamma * (reflected - centroid)
            val expanded = VecOps.addScaled(centroid, VecOps.sub(reflected, centroid), GAMMA)
            val fExpanded = f(expanded)
            functionCalls++

            if (fExpanded < fReflected) {
                simplex[n] = SimplexVertex(expanded, fExpanded)
            } else {
                simplex[n] = SimplexVertex(reflected, fReflected)
            }
            continue
        }

        // Contraction
        if (fReflected < fWorst) {
            // Outside contraction: x_c = centroid + rho * (reflected - centroid)
            val contracted = VecOps.addScaled(centroid, VecOps.sub(reflected, centroid), RHO)
            val fContracted = f(contracted)
            functionCalls++

            if (fContracted <= fReflected) {
                simplex[n] = SimplexVertex(contracted, fContracted)
                continue
            }
        } else {
            // Inside contraction: x_c = centroid + rho * (worst - centroid)
            val contracted = VecOps.addScaled(centroid, VecOps.sub(worst.x, centroid), RHO)
            val fContracted = f(contracted)
            functionCalls++

            if (fContracted < fWorst) {
                simplex[n] = SimplexVertex(contracted, fContracted)
                continue
            }
        }

        // Shrink: move all vertices towards the best
        for (i in 1..n) {
            val newX = VecOps.add(best.x, VecOps.scale(VecOps.sub(simplex[i].x, best.x), SIGMA))
            simplex[i] = SimplexVertex(newX, f(newX))
            functionCalls++
        }
    }

    // Max iterations reached
    return OptimizeResult(
        x = simplex[0].x.copyOf(),
        `fun` = simplex[0].fx,
        gradient = null,
        iterations = iteration,
        functionCalls = functionCalls,
        gradientCalls = 0,
        converged = false,
        message = "Stopped: reached maximum iterations (${options.maxIterations})"
    )
}

private fun standardDeviation(values: DoubleArray): Double {
    if (values.isEmpty()) return 0.0
    val mean = values.average()
    val variance = values.map { (it - mean) * (it - mean) }.average()
    return sqrt(variance)
}
