#include "nelder_mead.h"
#include <algorithm>
#include <cmath>
#include <numeric>

namespace optimization {

namespace {
    // Nelder-Mead parameters (universal across scipy, MATLAB, Optim.jl)
    const double ALPHA = 1.0;   // Reflection
    const double GAMMA = 2.0;   // Expansion
    const double RHO = 0.5;     // Contraction
    const double SIGMA = 0.5;   // Shrink
    const double INITIAL_SIMPLEX_SCALE = 0.05;

    struct Vertex {
        Vector point;
        double value;

        bool operator<(const Vertex& other) const {
            return value < other.value;
        }
    };

    // Create initial simplex: vertex 0 = x0, vertex i = x0 + h*e_i
    std::vector<Vertex> createInitialSimplex(const ObjectiveFunction& f, const Vector& x0) {
        size_t n = x0.size();
        std::vector<Vertex> simplex(n + 1);

        // First vertex is the starting point
        simplex[0].point = x0;
        simplex[0].value = f(x0);

        // Subsequent vertices offset along each dimension
        for (size_t i = 0; i < n; ++i) {
            Vector point = clone(x0);
            double h = INITIAL_SIMPLEX_SCALE * std::max(std::abs(x0[i]), 1.0);
            point[i] += h;
            simplex[i + 1].point = point;
            simplex[i + 1].value = f(point);
        }

        return simplex;
    }

    // Compute centroid of all vertices except the worst
    Vector computeCentroid(const std::vector<Vertex>& simplex) {
        size_t n = simplex[0].point.size();
        Vector centroid = zeros(n);

        // Sum all vertices except the last (worst)
        for (size_t i = 0; i < simplex.size() - 1; ++i) {
            centroid = add(centroid, simplex[i].point);
        }

        // Divide by count
        return scale(centroid, 1.0 / (simplex.size() - 1));
    }

    // Compute simplex diameter (maximum distance between any two vertices)
    double simplexDiameter(const std::vector<Vertex>& simplex) {
        double maxDist = 0.0;
        for (size_t i = 0; i < simplex.size(); ++i) {
            for (size_t j = i + 1; j < simplex.size(); ++j) {
                double dist = norm(sub(simplex[i].point, simplex[j].point));
                maxDist = std::max(maxDist, dist);
            }
        }
        return maxDist;
    }

    // Compute standard deviation of function values
    double functionSpread(const std::vector<Vertex>& simplex) {
        double mean = 0.0;
        for (const auto& v : simplex) {
            mean += v.value;
        }
        mean /= simplex.size();

        double variance = 0.0;
        for (const auto& v : simplex) {
            double diff = v.value - mean;
            variance += diff * diff;
        }
        variance /= simplex.size();

        return std::sqrt(variance);
    }
}

OptimizeResult nelderMead(
    const ObjectiveFunction& f,
    const Vector& x0,
    const OptimizeOptions& options
) {
    // Initialize simplex
    std::vector<Vertex> simplex = createInitialSimplex(f, x0);
    int functionCalls = static_cast<int>(simplex.size());
    int iterations = 0;

    while (iterations < options.maxIterations) {
        // Sort simplex by function value (ascending)
        std::sort(simplex.begin(), simplex.end());

        const Vertex& best = simplex[0];
        const Vertex& secondWorst = simplex[simplex.size() - 2];
        const Vertex& worst = simplex[simplex.size() - 1];

        // Check convergence: function spread or simplex diameter
        double spread = functionSpread(simplex);
        double diameter = simplexDiameter(simplex);

        if (spread < options.funcTol || diameter < options.stepTol) {
            return OptimizeResult{
                best.point,
                best.value,
                std::nullopt,  // gradient
                iterations,
                functionCalls,
                0,  // gradientCalls
                true,
                "Converged: simplex tolerance met"
            };
        }

        // Compute centroid of all but worst
        Vector centroid = computeCentroid(simplex);

        // Reflection: xr = centroid + alpha * (centroid - worst)
        Vector reflected = addScaled(centroid, sub(centroid, worst.point), ALPHA);
        double fReflected = f(reflected);
        functionCalls++;

        // Accept reflection if between best and second-worst
        if (fReflected >= best.value && fReflected < secondWorst.value) {
            simplex.back().point = reflected;
            simplex.back().value = fReflected;
            iterations++;
            continue;
        }

        // If reflection is best, try expansion
        if (fReflected < best.value) {
            Vector expanded = addScaled(centroid, sub(reflected, centroid), GAMMA);
            double fExpanded = f(expanded);
            functionCalls++;

            if (fExpanded < fReflected) {
                simplex.back().point = expanded;
                simplex.back().value = fExpanded;
            } else {
                simplex.back().point = reflected;
                simplex.back().value = fReflected;
            }
            iterations++;
            continue;
        }

        // Reflection is worst or second-worst, try contraction
        Vector contracted;
        double fContracted;

        if (fReflected < worst.value) {
            // Outside contraction: between centroid and reflected
            contracted = addScaled(centroid, sub(reflected, centroid), RHO);
            fContracted = f(contracted);
            functionCalls++;

            if (fContracted <= fReflected) {
                simplex.back().point = contracted;
                simplex.back().value = fContracted;
                iterations++;
                continue;
            }
        } else {
            // Inside contraction: between centroid and worst
            contracted = addScaled(centroid, sub(worst.point, centroid), RHO);
            fContracted = f(contracted);
            functionCalls++;

            if (fContracted < worst.value) {
                simplex.back().point = contracted;
                simplex.back().value = fContracted;
                iterations++;
                continue;
            }
        }

        // Contraction failed, shrink all vertices toward best
        for (size_t i = 1; i < simplex.size(); ++i) {
            simplex[i].point = addScaled(best.point, sub(simplex[i].point, best.point), SIGMA);
            simplex[i].value = f(simplex[i].point);
            functionCalls++;
        }

        iterations++;
    }

    // Max iterations reached
    std::sort(simplex.begin(), simplex.end());
    return OptimizeResult{
        simplex[0].point,
        simplex[0].value,
        std::nullopt,  // gradient
        iterations,
        functionCalls,
        0,  // gradientCalls
        false,
        "Maximum iterations reached"
    };
}

} // namespace optimization
