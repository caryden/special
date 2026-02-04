import Foundation

/// Pure vector arithmetic for n-dimensional optimization.
/// All operations return new arrays and never mutate inputs.
public enum VecOps {

    /// Dot product of two vectors
    public static func dot(_ a: [Double], _ b: [Double]) -> Double {
        var sum = 0.0
        for i in 0..<a.count {
            sum += a[i] * b[i]
        }
        return sum
    }

    /// Euclidean (L2) norm
    public static func norm(_ v: [Double]) -> Double {
        return sqrt(dot(v, v))
    }

    /// Infinity norm (max absolute value)
    public static func normInf(_ v: [Double]) -> Double {
        var maxAbs = 0.0
        for x in v {
            let absX = abs(x)
            if absX > maxAbs {
                maxAbs = absX
            }
        }
        return maxAbs
    }

    /// Scalar multiplication
    public static func scale(_ v: [Double], _ s: Double) -> [Double] {
        return v.map { $0 * s }
    }

    /// Element-wise addition
    public static func add(_ a: [Double], _ b: [Double]) -> [Double] {
        var result = [Double]()
        result.reserveCapacity(a.count)
        for i in 0..<a.count {
            result.append(a[i] + b[i])
        }
        return result
    }

    /// Element-wise subtraction
    public static func sub(_ a: [Double], _ b: [Double]) -> [Double] {
        var result = [Double]()
        result.reserveCapacity(a.count)
        for i in 0..<a.count {
            result.append(a[i] - b[i])
        }
        return result
    }

    /// Element-wise negation
    public static func negate(_ v: [Double]) -> [Double] {
        return scale(v, -1.0)
    }

    /// Deep copy of vector
    public static func clone(_ v: [Double]) -> [Double] {
        return Array(v)
    }

    /// Create vector of n zeros
    public static func zeros(_ n: Int) -> [Double] {
        return Array(repeating: 0.0, count: n)
    }

    /// Fused operation: a + s*b (avoids intermediate allocation)
    public static func addScaled(_ a: [Double], _ b: [Double], _ s: Double) -> [Double] {
        var result = [Double]()
        result.reserveCapacity(a.count)
        for i in 0..<a.count {
            result.append(a[i] + s * b[i])
        }
        return result
    }
}
