import XCTest
@testable import Optimization

final class VecOpsTests: XCTestCase {

    // MARK: - dot

    func testDot() {
        XCTAssertEqual(VecOps.dot([1, 2, 3], [4, 5, 6]), 32, accuracy: 1e-10)
    }

    func testDotZero() {
        XCTAssertEqual(VecOps.dot([0, 0], [1, 1]), 0, accuracy: 1e-10)
    }

    // MARK: - norm

    func testNorm() {
        XCTAssertEqual(VecOps.norm([3, 4]), 5, accuracy: 1e-10)
    }

    func testNormZero() {
        XCTAssertEqual(VecOps.norm([0, 0, 0]), 0, accuracy: 1e-10)
    }

    // MARK: - normInf

    func testNormInf() {
        XCTAssertEqual(VecOps.normInf([1, -3, 2]), 3, accuracy: 1e-10)
    }

    func testNormInfZero() {
        XCTAssertEqual(VecOps.normInf([0, 0]), 0, accuracy: 1e-10)
    }

    // MARK: - scale

    func testScale() {
        XCTAssertEqual(VecOps.scale([1, 2], 3), [3, 6])
    }

    func testScaleZero() {
        XCTAssertEqual(VecOps.scale([1, 2], 0), [0, 0])
    }

    // MARK: - add

    func testAdd() {
        XCTAssertEqual(VecOps.add([1, 2], [3, 4]), [4, 6])
    }

    func testAddDoesNotMutate() {
        let a = [1.0, 2.0]
        let b = [3.0, 4.0]
        let aCopy = a
        let bCopy = b
        _ = VecOps.add(a, b)
        XCTAssertEqual(a, aCopy)
        XCTAssertEqual(b, bCopy)
    }

    // MARK: - sub

    func testSub() {
        XCTAssertEqual(VecOps.sub([3, 4], [1, 2]), [2, 2])
    }

    // MARK: - negate

    func testNegate() {
        XCTAssertEqual(VecOps.negate([1, -2]), [-1, 2])
    }

    // MARK: - clone

    func testClone() {
        let original = [1.0, 2.0]
        let cloned = VecOps.clone(original)
        XCTAssertEqual(cloned, [1, 2])
        // Verify it's a distinct array
        var mutableClone = cloned
        mutableClone[0] = 999
        XCTAssertEqual(original[0], 1.0)
    }

    // MARK: - zeros

    func testZeros() {
        XCTAssertEqual(VecOps.zeros(3), [0, 0, 0])
    }

    // MARK: - addScaled

    func testAddScaled() {
        XCTAssertEqual(VecOps.addScaled([1, 2], [3, 4], 2), [7, 10])
    }

    // MARK: - Purity checks

    func testScaleDoesNotMutate() {
        let v = [1.0, 2.0]
        let vCopy = v
        _ = VecOps.scale(v, 3)
        XCTAssertEqual(v, vCopy)
    }
}
