import Foundation

/// Optimization options with convergence tolerances
public struct OptimizeOptions {
    public let gradTol: Double
    public let stepTol: Double
    public let funcTol: Double
    public let maxIterations: Int

    public init(
        gradTol: Double = 1e-8,
        stepTol: Double = 1e-8,
        funcTol: Double = 1e-12,
        maxIterations: Int = 1000
    ) {
        self.gradTol = gradTol
        self.stepTol = stepTol
        self.funcTol = funcTol
        self.maxIterations = maxIterations
    }
}

/// Convergence reason (tagged union)
public enum ConvergenceReason: Equatable {
    case gradient
    case step
    case function
    case maxIterations
    case lineSearchFailed
}

/// Optimization result
public struct OptimizeResult {
    public let x: [Double]
    public let fun: Double
    public let gradient: [Double]?
    public let iterations: Int
    public let functionCalls: Int
    public let gradientCalls: Int
    public let converged: Bool
    public let message: String

    public init(
        x: [Double],
        fun: Double,
        gradient: [Double]?,
        iterations: Int,
        functionCalls: Int,
        gradientCalls: Int,
        converged: Bool,
        message: String
    ) {
        self.x = x
        self.fun = fun
        self.gradient = gradient
        self.iterations = iterations
        self.functionCalls = functionCalls
        self.gradientCalls = gradientCalls
        self.converged = converged
        self.message = message
    }
}

/// Result type functions
public enum ResultTypes {

    /// Create default options with optional overrides
    public static func defaultOptions(
        gradTol: Double? = nil,
        stepTol: Double? = nil,
        funcTol: Double? = nil,
        maxIterations: Int? = nil
    ) -> OptimizeOptions {
        return OptimizeOptions(
            gradTol: gradTol ?? 1e-8,
            stepTol: stepTol ?? 1e-8,
            funcTol: funcTol ?? 1e-12,
            maxIterations: maxIterations ?? 1000
        )
    }

    /// Check convergence criteria in order: gradient → step → function → maxIterations
    public static func checkConvergence(
        gradNorm: Double,
        stepNorm: Double,
        funcChange: Double,
        iteration: Int,
        options: OptimizeOptions
    ) -> ConvergenceReason? {
        if gradNorm < options.gradTol {
            return .gradient
        }
        if stepNorm < options.stepTol {
            return .step
        }
        if funcChange < options.funcTol {
            return .function
        }
        if iteration >= options.maxIterations {
            return .maxIterations
        }
        return nil
    }

    /// Check if a convergence reason represents true convergence
    public static func isConverged(_ reason: ConvergenceReason) -> Bool {
        switch reason {
        case .gradient, .step, .function:
            return true
        case .maxIterations, .lineSearchFailed:
            return false
        }
    }

    /// Human-readable convergence message
    public static func convergenceMessage(_ reason: ConvergenceReason) -> String {
        switch reason {
        case .gradient:
            return "Converged: gradient norm below tolerance"
        case .step:
            return "Converged: step size below tolerance"
        case .function:
            return "Converged: function change below tolerance"
        case .maxIterations:
            return "Stopped: maximum iterations reached"
        case .lineSearchFailed:
            return "Stopped: line search failed"
        }
    }
}
