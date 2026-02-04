package optimization

import kotlin.math.abs

/**
 * Line search methods for optimization
 */

data class LineSearchResult(
    val alpha: Double,
    val fNew: Double,
    val gNew: DoubleArray?,
    val functionCalls: Int,
    val gradientCalls: Int,
    val success: Boolean
)

data class BacktrackingOptions(
    val initialAlpha: Double = 1.0,
    val c1: Double = 1e-4,
    val rho: Double = 0.5,
    val maxIter: Int = 20
)

data class WolfeOptions(
    val c1: Double = 1e-4,
    val c2: Double = 0.9,
    val alphaMax: Double = 1e6,
    val maxIter: Int = 25
)

/**
 * Backtracking line search with Armijo condition
 * @provenance Nocedal & Wright, Numerical Optimization, Algorithm 3.1
 */
fun backtrackingLineSearch(
    f: (DoubleArray) -> Double,
    x: DoubleArray,
    d: DoubleArray,
    fx: Double,
    gx: DoubleArray,
    options: BacktrackingOptions = BacktrackingOptions()
): LineSearchResult {
    var alpha = options.initialAlpha
    val c1 = options.c1
    val rho = options.rho
    val maxIter = options.maxIter

    val directionDot = dot(gx, d)
    var fCalls = 0

    for (iter in 0 until maxIter) {
        val xNew = addScaled(x, d, alpha)
        val fNew = f(xNew)
        fCalls++

        // Armijo condition: f(x + alpha*d) <= f(x) + c1*alpha*g'*d
        if (fNew <= fx + c1 * alpha * directionDot) {
            return LineSearchResult(
                alpha = alpha,
                fNew = fNew,
                gNew = null,
                functionCalls = fCalls,
                gradientCalls = 0,
                success = true
            )
        }

        alpha *= rho
    }

    // Failed to find acceptable step
    return LineSearchResult(
        alpha = alpha,
        fNew = fx,
        gNew = null,
        functionCalls = fCalls,
        gradientCalls = 0,
        success = false
    )
}

/**
 * Strong Wolfe line search
 * @provenance Nocedal & Wright, Algorithms 3.5 + 3.6
 */
fun wolfeLineSearch(
    f: (DoubleArray) -> Double,
    grad: (DoubleArray) -> DoubleArray,
    x: DoubleArray,
    d: DoubleArray,
    fx: Double,
    gx: DoubleArray,
    options: WolfeOptions = WolfeOptions()
): LineSearchResult {
    val c1 = options.c1
    val c2 = options.c2
    val alphaMax = options.alphaMax
    val maxIter = options.maxIter

    var fCalls = 0
    var gCalls = 0

    val directionDot = dot(gx, d)

    var alpha0 = 0.0
    var alpha1 = 1.0
    var f0 = fx
    var g0 = directionDot

    for (iter in 0 until maxIter) {
        val xNew = addScaled(x, d, alpha1)
        val f1 = f(xNew)
        fCalls++

        // Check Armijo condition
        if (f1 > fx + c1 * alpha1 * directionDot || (iter > 0 && f1 >= f0)) {
            // Bracket found, zoom in
            val result = zoom(f, grad, x, d, fx, gx, alpha0, alpha1, f0, f1, c1, c2, directionDot)
            return LineSearchResult(
                alpha = result.first,
                fNew = result.second,
                gNew = result.third,
                functionCalls = fCalls + result.fourth,
                gradientCalls = gCalls + result.fifth,
                success = true
            )
        }

        val g1New = grad(xNew)
        gCalls++
        val g1 = dot(g1New, d)

        // Check curvature condition
        if (abs(g1) <= c2 * abs(directionDot)) {
            return LineSearchResult(
                alpha = alpha1,
                fNew = f1,
                gNew = g1New,
                functionCalls = fCalls,
                gradientCalls = gCalls,
                success = true
            )
        }

        if (g1 >= 0) {
            // Bracket found, zoom in
            val result = zoom(f, grad, x, d, fx, gx, alpha1, alpha0, f1, f0, c1, c2, directionDot)
            return LineSearchResult(
                alpha = result.first,
                fNew = result.second,
                gNew = result.third,
                functionCalls = fCalls + result.fourth,
                gradientCalls = gCalls + result.fifth,
                success = true
            )
        }

        alpha0 = alpha1
        f0 = f1
        g0 = g1
        alpha1 = minOf(2 * alpha1, alphaMax)
    }

    // Failed to satisfy Wolfe conditions
    return LineSearchResult(
        alpha = alpha1,
        fNew = fx,
        gNew = null,
        functionCalls = fCalls,
        gradientCalls = gCalls,
        success = false
    )
}

/**
 * Zoom phase of Wolfe line search
 * Returns (alpha, fNew, gNew, fCalls, gCalls)
 */
private fun zoom(
    f: (DoubleArray) -> Double,
    grad: (DoubleArray) -> DoubleArray,
    x: DoubleArray,
    d: DoubleArray,
    fx: Double,
    gx: DoubleArray,
    alphaLo: Double,
    alphaHi: Double,
    fLo: Double,
    fHi: Double,
    c1: Double,
    c2: Double,
    directionDot: Double
): Tuple5<Double, Double, DoubleArray, Int, Int> {
    var lo = alphaLo
    var hi = alphaHi
    var fL = fLo
    var fCalls = 0
    var gCalls = 0

    for (iter in 0 until 10) {
        // Bisection
        val alpha = (lo + hi) / 2.0
        val xNew = addScaled(x, d, alpha)
        val fNew = f(xNew)
        fCalls++

        if (fNew > fx + c1 * alpha * directionDot || fNew >= fL) {
            hi = alpha
        } else {
            val gNew = grad(xNew)
            gCalls++
            val gDot = dot(gNew, d)

            if (abs(gDot) <= c2 * abs(directionDot)) {
                return Tuple5(alpha, fNew, gNew, fCalls, gCalls)
            }

            if (gDot * (hi - lo) >= 0) {
                hi = lo
            }
            lo = alpha
            fL = fNew
        }
    }

    // Return best found
    val alpha = lo
    val xNew = addScaled(x, d, alpha)
    val fNew = f(xNew)
    fCalls++
    val gNew = grad(xNew)
    gCalls++

    return Tuple5(alpha, fNew, gNew, fCalls, gCalls)
}

// Helper class for returning 5 values
private data class Tuple5<A, B, C, D, E>(val first: A, val second: B, val third: C, val fourth: D, val fifth: E)
