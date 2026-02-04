package optimization

import kotlin.math.abs

/**
 * BFGS quasi-Newton optimizer
 * @provenance Nocedal & Wright, Numerical Optimization, Chapter 6 (Eq. 6.17)
 */

/** Create n×n identity matrix as array of rows */
fun identityMatrix(n: Int): Array<DoubleArray> {
    return Array(n) { i ->
        DoubleArray(n) { j ->
            if (i == j) 1.0 else 0.0
        }
    }
}

/** Matrix-vector multiplication (M is array of rows) */
fun matVecMul(M: Array<DoubleArray>, v: DoubleArray): DoubleArray {
    val n = M.size
    val result = DoubleArray(n)
    for (i in 0 until n) {
        result[i] = dot(M[i], v)
    }
    return result
}

/** Apply BFGS inverse Hessian update formula */
fun bfgsUpdate(H: Array<DoubleArray>, s: DoubleArray, y: DoubleArray, rho: Double): Array<DoubleArray> {
    val n = H.size
    val I = identityMatrix(n)

    // Compute (I - rho*s*y^T)
    val sy = Array(n) { i ->
        DoubleArray(n) { j ->
            I[i][j] - rho * s[i] * y[j]
        }
    }

    // Compute (I - rho*y*s^T)
    val ys = Array(n) { i ->
        DoubleArray(n) { j ->
            I[i][j] - rho * y[i] * s[j]
        }
    }

    // Compute rho*s*s^T
    val ss = Array(n) { i ->
        DoubleArray(n) { j ->
            rho * s[i] * s[j]
        }
    }

    // H_new = (I - rho*s*y^T) * H * (I - rho*y*s^T) + rho*s*s^T
    // First: temp = H * (I - rho*y*s^T)
    val temp = Array(n) { i ->
        DoubleArray(n) { j ->
            (0 until n).sumOf { k -> H[i][k] * ys[k][j] }
        }
    }

    // Second: result = (I - rho*s*y^T) * temp + rho*s*s^T
    val result = Array(n) { i ->
        DoubleArray(n) { j ->
            (0 until n).sumOf { k -> sy[i][k] * temp[k][j] } + ss[i][j]
        }
    }

    return result
}

/**
 * Minimize using BFGS quasi-Newton method
 */
fun bfgs(
    f: (DoubleArray) -> Double,
    x0: DoubleArray,
    grad: ((DoubleArray) -> DoubleArray)? = null,
    options: OptimizeOptions = defaultOptions()
): OptimizeResult {
    val n = x0.size
    var x = x0.copyOf()
    var H = identityMatrix(n)

    // Use provided gradient or finite differences
    val gradFn = grad ?: { x: DoubleArray -> forwardDiffGradient(f, x) }

    var fx = f(x)
    var gx = gradFn(x)
    var fCalls = 1
    var gCalls = 1

    // Check if already at minimum
    var gradNorm = norm(gx)
    if (gradNorm < options.gradTol) {
        return OptimizeResult(
            x = x,
            `fun` = fx,
            gradient = gx,
            iterations = 0,
            functionCalls = fCalls,
            gradientCalls = gCalls,
            converged = true,
            message = convergenceMessage(ConvergenceReason.Gradient)
        )
    }

    var iteration = 0
    var converged = false
    var reason: ConvergenceReason? = null

    while (iteration < options.maxIterations) {
        // Compute search direction: d = -H * g
        val d = negate(matVecMul(H, gx))

        // Strong Wolfe line search
        val lsResult = wolfeLineSearch(f, gradFn, x, d, fx, gx)
        fCalls += lsResult.functionCalls
        gCalls += lsResult.gradientCalls

        if (!lsResult.success) {
            reason = ConvergenceReason.LineSearchFailed
            break
        }

        val alpha = lsResult.alpha
        val xNew = addScaled(x, d, alpha)
        val fNew = lsResult.fNew
        val gNew = lsResult.gNew ?: gradFn(xNew).also { gCalls++ }

        // Compute step and gradient change
        val s = sub(xNew, x)
        val y = sub(gNew, gx)

        val stepNorm = norm(s)
        val funcChange = abs(fNew - fx)
        gradNorm = norm(gNew)

        // Check convergence
        iteration++
        val checkResult = checkConvergence(gradNorm, stepNorm, funcChange, iteration, options)
        if (checkResult != null) {
            reason = checkResult
            converged = isConverged(checkResult)
            x = xNew
            fx = fNew
            gx = gNew
            break
        }

        // BFGS update with curvature guard
        val yTs = dot(y, s)
        if (yTs > 1e-10) {
            val rho = 1.0 / yTs
            H = bfgsUpdate(H, s, y, rho)
        }

        x = xNew
        fx = fNew
        gx = gNew
    }

    if (reason == null) {
        reason = ConvergenceReason.MaxIterations
        converged = false
    }

    return OptimizeResult(
        x = x,
        `fun` = fx,
        gradient = gx,
        iterations = iteration,
        functionCalls = fCalls,
        gradientCalls = gCalls,
        converged = converged,
        message = convergenceMessage(reason)
    )
}
