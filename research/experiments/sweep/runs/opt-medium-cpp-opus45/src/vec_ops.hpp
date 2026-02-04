#pragma once

#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

namespace opt {

/// Dot product of two vectors.
inline double dot(const std::vector<double>& a, const std::vector<double>& b) {
    double sum = 0.0;
    for (size_t i = 0; i < a.size(); ++i) {
        sum += a[i] * b[i];
    }
    return sum;
}

/// Euclidean (L2) norm.
inline double norm(const std::vector<double>& v) {
    return std::sqrt(dot(v, v));
}

/// Infinity norm (max absolute value).
inline double normInf(const std::vector<double>& v) {
    double mx = 0.0;
    for (auto val : v) {
        mx = std::max(mx, std::abs(val));
    }
    return mx;
}

/// Scalar multiplication: returns s * v.
inline std::vector<double> scale(const std::vector<double>& v, double s) {
    std::vector<double> result(v.size());
    for (size_t i = 0; i < v.size(); ++i) {
        result[i] = v[i] * s;
    }
    return result;
}

/// Element-wise addition.
inline std::vector<double> add(const std::vector<double>& a, const std::vector<double>& b) {
    std::vector<double> result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] + b[i];
    }
    return result;
}

/// Element-wise subtraction.
inline std::vector<double> sub(const std::vector<double>& a, const std::vector<double>& b) {
    std::vector<double> result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] - b[i];
    }
    return result;
}

/// Element-wise negation.
inline std::vector<double> negate(const std::vector<double>& v) {
    return scale(v, -1.0);
}

/// Deep copy.
inline std::vector<double> clone(const std::vector<double>& v) {
    return std::vector<double>(v);
}

/// Vector of n zeros.
inline std::vector<double> zeros(size_t n) {
    return std::vector<double>(n, 0.0);
}

/// Fused a + s*b (avoids intermediate allocation).
inline std::vector<double> addScaled(const std::vector<double>& a, const std::vector<double>& b, double s) {
    std::vector<double> result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] + s * b[i];
    }
    return result;
}

} // namespace opt
