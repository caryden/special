package optimization

import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Pure vector arithmetic for n-dimensional optimization.
 * All operations return new arrays and never mutate inputs.
 */

/** Dot product */
fun dot(a: DoubleArray, b: DoubleArray): Double {
    require(a.size == b.size) { "Vectors must have same length" }
    return a.indices.sumOf { a[it] * b[it] }
}

/** Euclidean (L2) norm */
fun norm(v: DoubleArray): Double {
    return sqrt(v.sumOf { it * it })
}

/** Infinity norm (max absolute value) */
fun normInf(v: DoubleArray): Double {
    return v.maxOfOrNull { abs(it) } ?: 0.0
}

/** Scalar multiplication */
fun scale(v: DoubleArray, s: Double): DoubleArray {
    return DoubleArray(v.size) { v[it] * s }
}

/** Element-wise addition */
fun add(a: DoubleArray, b: DoubleArray): DoubleArray {
    require(a.size == b.size) { "Vectors must have same length" }
    return DoubleArray(a.size) { a[it] + b[it] }
}

/** Element-wise subtraction */
fun sub(a: DoubleArray, b: DoubleArray): DoubleArray {
    require(a.size == b.size) { "Vectors must have same length" }
    return DoubleArray(a.size) { a[it] - b[it] }
}

/** Element-wise negation */
fun negate(v: DoubleArray): DoubleArray {
    return scale(v, -1.0)
}

/** Deep copy */
fun clone(v: DoubleArray): DoubleArray {
    return v.copyOf()
}

/** Vector of n zeros */
fun zeros(n: Int): DoubleArray {
    return DoubleArray(n)
}

/** a + s*b (fused operation) */
fun addScaled(a: DoubleArray, b: DoubleArray, s: Double): DoubleArray {
    require(a.size == b.size) { "Vectors must have same length" }
    return DoubleArray(a.size) { a[it] + s * b[it] }
}
