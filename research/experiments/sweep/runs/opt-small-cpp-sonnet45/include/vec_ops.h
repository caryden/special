#pragma once

#include <vector>

namespace optimization {

using Vector = std::vector<double>;

// Dot product
double dot(const Vector& a, const Vector& b);

// Euclidean (L2) norm
double norm(const Vector& v);

// Infinity norm (max absolute value)
double normInf(const Vector& v);

// Scalar multiplication
Vector scale(const Vector& v, double s);

// Element-wise addition
Vector add(const Vector& a, const Vector& b);

// Element-wise subtraction
Vector sub(const Vector& a, const Vector& b);

// Element-wise negation
Vector negate(const Vector& v);

// Deep copy
Vector clone(const Vector& v);

// Vector of n zeros
Vector zeros(size_t n);

// Fused operation: a + s*b
Vector addScaled(const Vector& a, const Vector& b, double s);

} // namespace optimization
