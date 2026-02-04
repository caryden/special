import { test, expect, describe } from "bun:test";
import {
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
  type ConvergenceReason,
} from "./result-types";

describe("result-types", () => {
  describe("defaultOptions", () => {
    test("returns default values", () => {
      const opts = defaultOptions();
      expect(opts.gradTol).toBe(1e-8);
      expect(opts.stepTol).toBe(1e-8);
      expect(opts.funcTol).toBe(1e-12);
      expect(opts.maxIterations).toBe(1000);
    });

    test("applies overrides", () => {
      const opts = defaultOptions({ gradTol: 1e-4 });
      expect(opts.gradTol).toBe(1e-4);
      expect(opts.stepTol).toBe(1e-8);
      expect(opts.funcTol).toBe(1e-12);
      expect(opts.maxIterations).toBe(1000);
    });
  });

  describe("checkConvergence", () => {
    const defaults = defaultOptions();

    test("returns gradient when gradient norm below tolerance", () => {
      const reason = checkConvergence(1e-9, 0.1, 0.1, 5, defaults);
      expect(reason).toEqual({ kind: "gradient" });
    });

    test("returns step when step norm below tolerance", () => {
      const reason = checkConvergence(0.1, 1e-9, 0.1, 5, defaults);
      expect(reason).toEqual({ kind: "step" });
    });

    test("returns function when function change below tolerance", () => {
      const reason = checkConvergence(0.1, 0.1, 1e-13, 5, defaults);
      expect(reason).toEqual({ kind: "function" });
    });

    test("returns maxIterations when iteration limit reached", () => {
      const reason = checkConvergence(0.1, 0.1, 0.1, 1000, defaults);
      expect(reason).toEqual({ kind: "maxIterations" });
    });

    test("returns null when no criterion met", () => {
      const reason = checkConvergence(0.1, 0.1, 0.1, 5, defaults);
      expect(reason).toBe(null);
    });

    test("prioritizes gradient over other criteria", () => {
      // All criteria met, should return gradient first
      const reason = checkConvergence(1e-9, 1e-9, 1e-13, 1000, defaults);
      expect(reason).toEqual({ kind: "gradient" });
    });

    test("prioritizes step over function and maxIterations", () => {
      // Step, function, and maxIterations all met
      const reason = checkConvergence(0.1, 1e-9, 1e-13, 1000, defaults);
      expect(reason).toEqual({ kind: "step" });
    });

    test("prioritizes function over maxIterations", () => {
      // Function and maxIterations both met
      const reason = checkConvergence(0.1, 0.1, 1e-13, 1000, defaults);
      expect(reason).toEqual({ kind: "function" });
    });
  });

  describe("isConverged", () => {
    test("returns true for gradient", () => {
      expect(isConverged({ kind: "gradient" })).toBe(true);
    });

    test("returns true for step", () => {
      expect(isConverged({ kind: "step" })).toBe(true);
    });

    test("returns true for function", () => {
      expect(isConverged({ kind: "function" })).toBe(true);
    });

    test("returns false for maxIterations", () => {
      expect(isConverged({ kind: "maxIterations" })).toBe(false);
    });

    test("returns false for lineSearchFailed", () => {
      expect(isConverged({ kind: "lineSearchFailed" })).toBe(false);
    });
  });

  describe("convergenceMessage", () => {
    test("returns message for each kind", () => {
      expect(convergenceMessage({ kind: "gradient" })).toContain("gradient");
      expect(convergenceMessage({ kind: "step" })).toContain("step");
      expect(convergenceMessage({ kind: "function" })).toContain("function");
      expect(convergenceMessage({ kind: "maxIterations" })).toContain(
        "Maximum iterations"
      );
      expect(convergenceMessage({ kind: "lineSearchFailed" })).toContain(
        "Line search"
      );
    });
  });
});
