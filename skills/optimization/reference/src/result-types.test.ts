/**
 * Tests for optimization result types, convergence checking, and message formatting.
 *
 * @contract result-types.test.ts
 * @provenance API design — default tolerances (gradTol=1e-8, stepTol=1e-8, funcTol=1e-12,
 *   maxIterations=1000) match Optim.jl v2.0.0 conventions
 * @provenance Convergence criteria follow standard numerical optimization practice
 *   (Nocedal & Wright, Numerical Optimization, 2nd ed., Ch. 3)
 */

import { describe, test, expect } from "bun:test";
import {
  defaultOptions,
  checkConvergence,
  isConverged,
  convergenceMessage,
  type OptimizeOptions,
  type ConvergenceReason,
} from "./result-types";

describe("defaultOptions", () => {
  test("returns standard defaults", () => {
    const opts = defaultOptions();
    expect(opts.gradTol).toBe(1e-8);
    expect(opts.stepTol).toBe(1e-8);
    expect(opts.funcTol).toBe(1e-12);
    expect(opts.maxIterations).toBe(1000);
  });

  test("overrides specific fields", () => {
    const opts = defaultOptions({ gradTol: 1e-6, maxIterations: 500 });
    expect(opts.gradTol).toBe(1e-6);
    expect(opts.stepTol).toBe(1e-8);
    expect(opts.funcTol).toBe(1e-12);
    expect(opts.maxIterations).toBe(500);
  });

  test("empty overrides returns defaults", () => {
    const opts = defaultOptions({});
    expect(opts.gradTol).toBe(1e-8);
  });
});

describe("checkConvergence", () => {
  const opts: OptimizeOptions = {
    gradTol: 1e-8,
    stepTol: 1e-8,
    funcTol: 1e-12,
    maxIterations: 1000,
  };

  test("gradient convergence (highest priority)", () => {
    const reason = checkConvergence(1e-9, 1e-9, 1e-13, 5, opts);
    expect(reason).not.toBeNull();
    expect(reason!.kind).toBe("gradient");
  });

  test("step convergence when gradient is still large", () => {
    const reason = checkConvergence(1e-3, 1e-9, 1e-13, 5, opts);
    expect(reason).not.toBeNull();
    expect(reason!.kind).toBe("step");
  });

  test("function convergence when gradient and step are large", () => {
    const reason = checkConvergence(1e-3, 1e-3, 1e-13, 5, opts);
    expect(reason).not.toBeNull();
    expect(reason!.kind).toBe("function");
  });

  test("max iterations when nothing else converged", () => {
    const reason = checkConvergence(1e-3, 1e-3, 1e-3, 1000, opts);
    expect(reason).not.toBeNull();
    expect(reason!.kind).toBe("maxIterations");
  });

  test("returns null when nothing is converged", () => {
    const reason = checkConvergence(1e-3, 1e-3, 1e-3, 5, opts);
    expect(reason).toBeNull();
  });

  test("exact tolerance boundary — below", () => {
    const reason = checkConvergence(9.99e-9, 1, 1, 5, opts);
    expect(reason).not.toBeNull();
    expect(reason!.kind).toBe("gradient");
  });

  test("exact tolerance boundary — at", () => {
    // 1e-8 is NOT less than 1e-8, so should not trigger gradient convergence
    const reason = checkConvergence(1e-8, 1, 1, 5, opts);
    expect(reason).toBeNull();
  });
});

describe("isConverged", () => {
  test("gradient is converged", () => {
    expect(isConverged({ kind: "gradient", gradNorm: 1e-9 })).toBe(true);
  });

  test("step is converged", () => {
    expect(isConverged({ kind: "step", stepNorm: 1e-9 })).toBe(true);
  });

  test("function is converged", () => {
    expect(isConverged({ kind: "function", funcChange: 1e-13 })).toBe(true);
  });

  test("maxIterations is not converged", () => {
    expect(isConverged({ kind: "maxIterations", iterations: 1000 })).toBe(false);
  });

  test("lineSearchFailed is not converged", () => {
    expect(isConverged({ kind: "lineSearchFailed", message: "no decrease" })).toBe(false);
  });
});

describe("convergenceMessage", () => {
  test("gradient message", () => {
    const msg = convergenceMessage({ kind: "gradient", gradNorm: 5.2e-9 });
    expect(msg).toContain("gradient norm");
    expect(msg).toContain("5.20e-9");
    expect(msg).toContain("below tolerance");
  });

  test("step message", () => {
    const msg = convergenceMessage({ kind: "step", stepNorm: 3.1e-9 });
    expect(msg).toContain("step size");
    expect(msg).toContain("below tolerance");
  });

  test("function message", () => {
    const msg = convergenceMessage({ kind: "function", funcChange: 1e-13 });
    expect(msg).toContain("function change");
    expect(msg).toContain("below tolerance");
  });

  test("maxIterations message", () => {
    const msg = convergenceMessage({ kind: "maxIterations", iterations: 1000 });
    expect(msg).toContain("maximum iterations");
    expect(msg).toContain("1000");
  });

  test("lineSearchFailed message", () => {
    const msg = convergenceMessage({ kind: "lineSearchFailed", message: "no decrease" });
    expect(msg).toContain("line search failed");
    expect(msg).toContain("no decrease");
  });
});
