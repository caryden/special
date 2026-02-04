package optimization

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Numerical gradient approximation via finite differences
 * @provenance Nocedal & Wright, Numerical Optimization, §8.1
 */

private const val MACHINE_EPSILON = 2.22e-16

/**
 * Forward difference gradient approximation
 * h = sqrt(ε) * max(|xi|, 1)
 */
fun forwardDiffGradient(f: (DoubleArray) -> Double, x: DoubleArray): DoubleArray {
    val n = x.size
    val grad = DoubleArray(n)
    val fx = f(x)

    for (i in 0 until n) {
        val h = sqrt(MACHINE_EPSILON) * max(abs(x[i]), 1.0)
        val xPlusH = x.copyOf()
        xPlusH[i] += h
        grad[i] = (f(xPlusH) - fx) / h
    }

    return grad
}

/**
 * Central difference gradient approximation
 * h = ∛ε * max(|xi|, 1)
 */
fun centralDiffGradient(f: (DoubleArray) -> Double, x: DoubleArray): DoubleArray {
    val n = x.size
    val grad = DoubleArray(n)

    for (i in 0 until n) {
        val h = MACHINE_EPSILON.pow(1.0 / 3.0) * max(abs(x[i]), 1.0)
        val xPlusH = x.copyOf()
        val xMinusH = x.copyOf()
        xPlusH[i] += h
        xMinusH[i] -= h
        grad[i] = (f(xPlusH) - f(xMinusH)) / (2.0 * h)
    }

    return grad
}

/**
 * Factory: returns a gradient function using the specified method
 */
fun makeGradient(f: (DoubleArray) -> Double, method: String = "forward"): (DoubleArray) -> DoubleArray {
    return when (method) {
        "forward" -> { x -> forwardDiffGradient(f, x) }
        "central" -> { x -> centralDiffGradient(f, x) }
        else -> throw IllegalArgumentException("Unknown method: $method")
    }
}
