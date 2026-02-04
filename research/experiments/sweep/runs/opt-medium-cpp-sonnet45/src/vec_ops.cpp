#include "vec_ops.h"
#include <cmath>
#include <algorithm>

namespace optimization {

double dot(const Vector& a, const Vector& b) {
    double result = 0.0;
    for (size_t i = 0; i < a.size(); ++i) {
        result += a[i] * b[i];
    }
    return result;
}

double norm(const Vector& v) {
    return std::sqrt(dot(v, v));
}

double normInf(const Vector& v) {
    double maxVal = 0.0;
    for (double val : v) {
        maxVal = std::max(maxVal, std::abs(val));
    }
    return maxVal;
}

Vector scale(const Vector& v, double s) {
    Vector result(v.size());
    for (size_t i = 0; i < v.size(); ++i) {
        result[i] = v[i] * s;
    }
    return result;
}

Vector add(const Vector& a, const Vector& b) {
    Vector result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] + b[i];
    }
    return result;
}

Vector sub(const Vector& a, const Vector& b) {
    Vector result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] - b[i];
    }
    return result;
}

Vector negate(const Vector& v) {
    return scale(v, -1.0);
}

Vector clone(const Vector& v) {
    return Vector(v);
}

Vector zeros(size_t n) {
    return Vector(n, 0.0);
}

Vector addScaled(const Vector& a, const Vector& b, double s) {
    Vector result(a.size());
    for (size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] + s * b[i];
    }
    return result;
}

} // namespace optimization
