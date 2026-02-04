package optimization

import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Pure vector arithmetic for n-dimensional optimization.
 * All operations return new arrays and never mutate inputs.
 */
object VecOps {
    /**
     * Dot product of two vectors.
     */
    fun dot(a: DoubleArray, b: DoubleArray): Double {
        require(a.size == b.size) { "Vectors must have same length" }
        var sum = 0.0
        for (i in a.indices) {
            sum += a[i] * b[i]
        }
        return sum
    }

    /**
     * Euclidean (L2) norm.
     */
    fun norm(v: DoubleArray): Double {
        return sqrt(dot(v, v))
    }

    /**
     * Infinity norm (max absolute value).
     */
    fun normInf(v: DoubleArray): Double {
        var max = 0.0
        for (x in v) {
            val absX = abs(x)
            if (absX > max) {
                max = absX
            }
        }
        return max
    }

    /**
     * Scalar multiplication.
     */
    fun scale(v: DoubleArray, s: Double): DoubleArray {
        val result = DoubleArray(v.size)
        for (i in v.indices) {
            result[i] = v[i] * s
        }
        return result
    }

    /**
     * Element-wise addition.
     */
    fun add(a: DoubleArray, b: DoubleArray): DoubleArray {
        require(a.size == b.size) { "Vectors must have same length" }
        val result = DoubleArray(a.size)
        for (i in a.indices) {
            result[i] = a[i] + b[i]
        }
        return result
    }

    /**
     * Element-wise subtraction.
     */
    fun sub(a: DoubleArray, b: DoubleArray): DoubleArray {
        require(a.size == b.size) { "Vectors must have same length" }
        val result = DoubleArray(a.size)
        for (i in a.indices) {
            result[i] = a[i] - b[i]
        }
        return result
    }

    /**
     * Element-wise negation (scale(v, -1)).
     */
    fun negate(v: DoubleArray): DoubleArray {
        return scale(v, -1.0)
    }

    /**
     * Deep copy.
     */
    fun clone(v: DoubleArray): DoubleArray {
        return v.copyOf()
    }

    /**
     * Vector of n zeros.
     */
    fun zeros(n: Int): DoubleArray {
        return DoubleArray(n)
    }

    /**
     * Fused operation: a + s*b (avoids intermediate allocation).
     */
    fun addScaled(a: DoubleArray, b: DoubleArray, s: Double): DoubleArray {
        require(a.size == b.size) { "Vectors must have same length" }
        val result = DoubleArray(a.size)
        for (i in a.indices) {
            result[i] = a[i] + s * b[i]
        }
        return result
    }
}
