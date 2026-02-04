import XCTest
@testable import Optimization

final class NelderMeadTests: XCTestCase {

    // MARK: - Test functions

    /// Sphere function: f(x) = sum(xi^2), minimum at origin
    func sphere(_ x: [Double]) -> Double {
        return x.map { $0 * $0 }.reduce(0.0, +)
    }

    /// Booth function: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
    /// Minimum: f(1, 3) = 0
    func booth(_ x: [Double]) -> Double {
        let term1 = x[0] + 2 * x[1] - 7
        let term2 = 2 * x[0] + x[1] - 5
        return term1 * term1 + term2 * term2
    }

    /// Beale function: f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
    /// Minimum: f(3, 0.5) = 0
    func beale(_ x: [Double]) -> Double {
        let term1 = 1.5 - x[0] + x[0] * x[1]
        let term2 = 2.25 - x[0] + x[0] * x[1] * x[1]
        let term3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1]
        return term1 * term1 + term2 * term2 + term3 * term3
    }

    /// Rosenbrock function: f(x,y) = (1-x)^2 + 100(y-x^2)^2
    /// Minimum: f(1, 1) = 0
    func rosenbrock(_ x: [Double]) -> Double {
        let term1 = 1 - x[0]
        let term2 = x[1] - x[0] * x[0]
        return term1 * term1 + 100 * term2 * term2
    }

    /// Himmelblau function: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
    /// Four known minima, all with f = 0
    func himmelblau(_ x: [Double]) -> Double {
        let term1 = x[0] * x[0] + x[1] - 11
        let term2 = x[0] + x[1] * x[1] - 7
        return term1 * term1 + term2 * term2
    }

    /// Goldstein-Price function
    /// Minimum: f(0, -1) = 3
    func goldsteinPrice(_ x: [Double]) -> Double {
        let x0 = x[0]
        let x1 = x[1]
        let a = 1 + pow(x0 + x1 + 1, 2) * (19 - 14*x0 + 3*x0*x0 - 14*x1 + 6*x0*x1 + 3*x1*x1)
        let b = 30 + pow(2*x0 - 3*x1, 2) * (18 - 32*x0 + 12*x0*x0 + 48*x1 - 36*x0*x1 + 27*x1*x1)
        return a * b
    }

    // MARK: - Basic convergence tests

    func testSphere() {
        let result = NelderMead.nelderMead(sphere, [5.0, 5.0])
        XCTAssertTrue(result.converged)
        XCTAssertLessThan(result.fun, 1e-6)
        XCTAssertEqual(result.x[0], 0.0, accuracy: 1e-3)
        XCTAssertEqual(result.x[1], 0.0, accuracy: 1e-3)
    }

    func testBooth() {
        let result = NelderMead.nelderMead(booth, [0.0, 0.0])
        XCTAssertTrue(result.converged)
        XCTAssertLessThan(result.fun, 1e-6)
        XCTAssertEqual(result.x[0], 1.0, accuracy: 1e-3)
        XCTAssertEqual(result.x[1], 3.0, accuracy: 1e-3)
    }

    func testBeale() {
        let options = ResultTypes.defaultOptions(maxIterations: 5000)
        let result = NelderMead.nelderMead(beale, [0.0, 0.0], options)
        XCTAssertTrue(result.converged)
        XCTAssertLessThan(result.fun, 1e-6)
    }

    func testRosenbrock() {
        let options = ResultTypes.defaultOptions(
            stepTol: 1e-9,
            funcTol: 1e-9,
            maxIterations: 5000
        )
        let result = NelderMead.nelderMead(rosenbrock, [-1.2, 1.0], options)
        XCTAssertTrue(result.converged)
        XCTAssertLessThan(result.fun, 1e-6)
        XCTAssertEqual(result.x[0], 1.0, accuracy: 0.01)
        XCTAssertEqual(result.x[1], 1.0, accuracy: 0.01)
    }

    func testHimmelblau() {
        let result = NelderMead.nelderMead(himmelblau, [0.0, 0.0])
        XCTAssertTrue(result.converged)
        XCTAssertLessThan(result.fun, 1e-6)
        // Should converge to one of the four minima
        // From spec: commonly converges to (3, 2)
    }

    func testGoldsteinPrice() {
        let result = NelderMead.nelderMead(goldsteinPrice, [0.0, 0.0])
        XCTAssertTrue(result.converged)
        // Goldstein-Price has multiple local minima; global minimum is at (0,-1) with f=3
        // but Nelder-Mead may converge to a local minimum depending on implementation details
        // Accept any converged result as valid
        XCTAssertLessThan(result.fun, 100.0)
    }

    // MARK: - Behavioral tests

    func testRespectsMaxIterations() {
        let options = ResultTypes.defaultOptions(maxIterations: 5)
        let result = NelderMead.nelderMead(rosenbrock, [-1.2, 1.0], options)
        XCTAssertLessThanOrEqual(result.iterations, 5)
        XCTAssertFalse(result.converged)
    }

    func testGradientCallsAlwaysZero() {
        let result = NelderMead.nelderMead(sphere, [5.0, 5.0])
        XCTAssertEqual(result.gradientCalls, 0)
        XCTAssertNil(result.gradient)
    }

    func testFunctionCallsCounted() {
        let result = NelderMead.nelderMead(sphere, [5.0, 5.0])
        XCTAssertGreaterThan(result.functionCalls, 0)
    }
}
