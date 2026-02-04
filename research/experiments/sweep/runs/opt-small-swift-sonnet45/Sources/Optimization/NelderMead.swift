import Foundation

/// Nelder-Mead simplex optimizer (derivative-free)
public enum NelderMead {

    // Algorithm parameters (standard values across scipy, MATLAB, Optim.jl)
    private static let alpha = 1.0   // Reflection coefficient
    private static let gamma = 2.0   // Expansion coefficient
    private static let rho = 0.5     // Contraction coefficient
    private static let sigma = 0.5   // Shrink coefficient
    private static let initialSimplexScale = 0.05

    /// Minimize function using Nelder-Mead simplex method
    public static func nelderMead(
        _ f: ([Double]) -> Double,
        _ x0: [Double],
        _ options: OptimizeOptions? = nil
    ) -> OptimizeResult {
        let opts = options ?? ResultTypes.defaultOptions()
        let n = x0.count
        var functionCalls = 0

        // Create initial simplex: vertex 0 = x0, vertex i = x0 + h*e_i
        var simplex = [[Double]]()
        simplex.append(x0)
        for i in 0..<n {
            let h = initialSimplexScale * max(abs(x0[i]), 1.0)
            var vertex = x0
            vertex[i] += h
            simplex.append(vertex)
        }

        // Evaluate all vertices
        var fValues = simplex.map { vertex -> Double in
            functionCalls += 1
            return f(vertex)
        }

        var iterations = 0

        while iterations < opts.maxIterations {
            iterations += 1

            // Sort simplex by function values (ascending)
            let indices = fValues.indices.sorted { fValues[$0] < fValues[$1] }
            simplex = indices.map { simplex[$0] }
            fValues = indices.map { fValues[$0] }

            let fBest = fValues[0]
            let fSecondWorst = fValues[n - 1]
            let fWorst = fValues[n]

            // Check convergence: function value spread (std dev) or simplex diameter
            let fMean = fValues.reduce(0.0, +) / Double(fValues.count)
            let fVariance = fValues.map { pow($0 - fMean, 2) }.reduce(0.0, +) / Double(fValues.count)
            let fStdDev = sqrt(fVariance)

            // Compute simplex diameter (max distance from best vertex)
            var diameter = 0.0
            for i in 1...n {
                let d = VecOps.normInf(VecOps.sub(simplex[i], simplex[0]))
                diameter = max(diameter, d)
            }

            if fStdDev < opts.funcTol {
                return OptimizeResult(
                    x: simplex[0],
                    fun: fBest,
                    gradient: nil,
                    iterations: iterations,
                    functionCalls: functionCalls,
                    gradientCalls: 0,
                    converged: true,
                    message: ResultTypes.convergenceMessage(.function)
                )
            }

            if diameter < opts.stepTol {
                return OptimizeResult(
                    x: simplex[0],
                    fun: fBest,
                    gradient: nil,
                    iterations: iterations,
                    functionCalls: functionCalls,
                    gradientCalls: 0,
                    converged: true,
                    message: ResultTypes.convergenceMessage(.function)
                )
            }

            // Compute centroid of all vertices except worst
            var centroid = VecOps.zeros(n)
            for i in 0..<n {
                centroid = VecOps.add(centroid, simplex[i])
            }
            centroid = VecOps.scale(centroid, 1.0 / Double(n))

            // Reflect worst point through centroid
            // x_r = centroid + alpha * (centroid - worst)
            let xWorst = simplex[n]
            let xReflected = VecOps.addScaled(centroid, VecOps.sub(centroid, xWorst), alpha)
            let fReflected = f(xReflected)
            functionCalls += 1

            if fReflected >= fBest && fReflected < fSecondWorst {
                // Accept reflection
                simplex[n] = xReflected
                fValues[n] = fReflected
                continue
            }

            if fReflected < fBest {
                // Try expansion
                let xExpanded = VecOps.addScaled(centroid, VecOps.sub(xReflected, centroid), gamma)
                let fExpanded = f(xExpanded)
                functionCalls += 1

                if fExpanded < fReflected {
                    simplex[n] = xExpanded
                    fValues[n] = fExpanded
                } else {
                    simplex[n] = xReflected
                    fValues[n] = fReflected
                }
                continue
            }

            // Contraction
            if fReflected < fWorst {
                // Outside contraction
                let xContracted = VecOps.addScaled(centroid, VecOps.sub(xReflected, centroid), rho)
                let fContracted = f(xContracted)
                functionCalls += 1

                if fContracted <= fReflected {
                    simplex[n] = xContracted
                    fValues[n] = fContracted
                    continue
                }
            } else {
                // Inside contraction
                let xContracted = VecOps.addScaled(centroid, VecOps.sub(xWorst, centroid), rho)
                let fContracted = f(xContracted)
                functionCalls += 1

                if fContracted < fWorst {
                    simplex[n] = xContracted
                    fValues[n] = fContracted
                    continue
                }
            }

            // Shrink all vertices toward best
            let xBest = simplex[0]
            for i in 1...n {
                simplex[i] = VecOps.addScaled(xBest, VecOps.sub(simplex[i], xBest), sigma)
                fValues[i] = f(simplex[i])
                functionCalls += 1
            }
        }

        // Max iterations reached
        let indices = fValues.indices.sorted { fValues[$0] < fValues[$1] }
        return OptimizeResult(
            x: simplex[indices[0]],
            fun: fValues[indices[0]],
            gradient: nil,
            iterations: iterations,
            functionCalls: functionCalls,
            gradientCalls: 0,
            converged: false,
            message: ResultTypes.convergenceMessage(.maxIterations)
        )
    }
}
