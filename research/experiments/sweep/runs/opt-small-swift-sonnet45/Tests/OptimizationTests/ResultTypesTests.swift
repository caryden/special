import XCTest
@testable import Optimization

final class ResultTypesTests: XCTestCase {

    // MARK: - defaultOptions

    func testDefaultOptions() {
        let opts = ResultTypes.defaultOptions()
        XCTAssertEqual(opts.gradTol, 1e-8, accuracy: 1e-20)
        XCTAssertEqual(opts.stepTol, 1e-8, accuracy: 1e-20)
        XCTAssertEqual(opts.funcTol, 1e-12, accuracy: 1e-20)
        XCTAssertEqual(opts.maxIterations, 1000)
    }

    func testDefaultOptionsWithOverrides() {
        let opts = ResultTypes.defaultOptions(gradTol: 1e-4)
        XCTAssertEqual(opts.gradTol, 1e-4, accuracy: 1e-20)
        XCTAssertEqual(opts.stepTol, 1e-8, accuracy: 1e-20)
        XCTAssertEqual(opts.funcTol, 1e-12, accuracy: 1e-20)
        XCTAssertEqual(opts.maxIterations, 1000)
    }

    // MARK: - checkConvergence

    func testCheckConvergenceGradient() {
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 1e-9,
            stepNorm: 0.1,
            funcChange: 0.1,
            iteration: 5,
            options: opts
        )
        XCTAssertEqual(reason, .gradient)
    }

    func testCheckConvergenceStep() {
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 0.1,
            stepNorm: 1e-9,
            funcChange: 0.1,
            iteration: 5,
            options: opts
        )
        XCTAssertEqual(reason, .step)
    }

    func testCheckConvergenceFunction() {
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 0.1,
            stepNorm: 0.1,
            funcChange: 1e-13,
            iteration: 5,
            options: opts
        )
        XCTAssertEqual(reason, .function)
    }

    func testCheckConvergenceMaxIterations() {
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 0.1,
            stepNorm: 0.1,
            funcChange: 0.1,
            iteration: 1000,
            options: opts
        )
        XCTAssertEqual(reason, .maxIterations)
    }

    func testCheckConvergenceNone() {
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 0.1,
            stepNorm: 0.1,
            funcChange: 0.1,
            iteration: 5,
            options: opts
        )
        XCTAssertNil(reason)
    }

    // MARK: - Priority test

    func testConvergencePriority() {
        // When multiple criteria are met, gradient takes priority
        let opts = ResultTypes.defaultOptions()
        let reason = ResultTypes.checkConvergence(
            gradNorm: 1e-9,
            stepNorm: 1e-9,
            funcChange: 1e-13,
            iteration: 1000,
            options: opts
        )
        XCTAssertEqual(reason, .gradient)
    }

    // MARK: - isConverged

    func testIsConvergedGradient() {
        XCTAssertTrue(ResultTypes.isConverged(.gradient))
    }

    func testIsConvergedStep() {
        XCTAssertTrue(ResultTypes.isConverged(.step))
    }

    func testIsConvergedFunction() {
        XCTAssertTrue(ResultTypes.isConverged(.function))
    }

    func testIsConvergedMaxIterations() {
        XCTAssertFalse(ResultTypes.isConverged(.maxIterations))
    }

    func testIsConvergedLineSearchFailed() {
        XCTAssertFalse(ResultTypes.isConverged(.lineSearchFailed))
    }

    // MARK: - convergenceMessage

    func testConvergenceMessage() {
        XCTAssertEqual(
            ResultTypes.convergenceMessage(.gradient),
            "Converged: gradient norm below tolerance"
        )
        XCTAssertEqual(
            ResultTypes.convergenceMessage(.step),
            "Converged: step size below tolerance"
        )
        XCTAssertEqual(
            ResultTypes.convergenceMessage(.function),
            "Converged: function change below tolerance"
        )
        XCTAssertEqual(
            ResultTypes.convergenceMessage(.maxIterations),
            "Stopped: maximum iterations reached"
        )
        XCTAssertEqual(
            ResultTypes.convergenceMessage(.lineSearchFailed),
            "Stopped: line search failed"
        )
    }
}
