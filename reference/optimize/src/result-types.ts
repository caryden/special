/**
 * Result types and configuration for optimization algorithms.
 *
 * Defines the OptimizeResult returned by all algorithms, the OptimizeOptions
 * for configuring convergence criteria, and the convergence checking logic.
 *
 * @node result-types
 * @contract result-types.test.ts
 * @hint types: Use plain objects/structs, not classes. Keep it simple.
 * @hint defaults: Our defaults differ from scipy (1e-5) and MATLAB (1e-6).
 *       We chose 1e-8 for gradient tolerance, matching Optim.jl.
 *       Document provenance of each default.
 */

/**
 * Configuration options for optimization.
 *
 * Default gradient tolerance: 1e-8 (matches Optim.jl; scipy uses 1e-5, MATLAB uses 1e-6).
 * Default step tolerance: 1e-8 (matches MATLAB; Optim.jl disables by default).
 * Default function tolerance: 1e-12 (stricter than most; catches near-convergence stalls).
 * Default max iterations: 1000 (matches Optim.jl; MATLAB uses 400).
 */
export interface OptimizeOptions {
  /** Gradient infinity-norm tolerance. Converged when ||g||_inf < gradTol. */
  gradTol: number;
  /** Step size tolerance. Converged when ||x_new - x_old||_inf < stepTol. */
  stepTol: number;
  /** Function value change tolerance. Converged when |f_new - f_old| < funcTol. */
  funcTol: number;
  /** Maximum number of iterations. */
  maxIterations: number;
}

/** Create default options, optionally overriding specific fields. */
export function defaultOptions(overrides?: Partial<OptimizeOptions>): OptimizeOptions {
  return {
    gradTol: 1e-8,
    stepTol: 1e-8,
    funcTol: 1e-12,
    maxIterations: 1000,
    ...overrides,
  };
}

/**
 * Result of an optimization run.
 *
 * Modeled after scipy's OptimizeResult and Optim.jl's MultivariateOptimizationResults.
 * Uses plain fields rather than accessor methods for simplicity.
 */
export interface OptimizeResult {
  /** Solution vector (minimizer). */
  x: number[];
  /** Objective function value at solution. */
  fun: number;
  /** Gradient at solution (if available). */
  gradient: number[] | null;
  /** Number of iterations performed. */
  iterations: number;
  /** Number of objective function evaluations. */
  functionCalls: number;
  /** Number of gradient evaluations. */
  gradientCalls: number;
  /** Whether the optimizer converged (met a convergence criterion). */
  converged: boolean;
  /** Human-readable description of termination reason. */
  message: string;
}

/**
 * Why did the optimizer stop?
 *
 * Used internally to determine `converged` and `message` in OptimizeResult.
 */
export type ConvergenceReason =
  | { kind: "gradient"; gradNorm: number }
  | { kind: "step"; stepNorm: number }
  | { kind: "function"; funcChange: number }
  | { kind: "maxIterations"; iterations: number }
  | { kind: "lineSearchFailed"; message: string };

/**
 * Check convergence criteria. Returns the first matching reason, or null
 * if no criterion is met.
 *
 * Checks in order: gradient → step → function value → max iterations.
 * This order matches Optim.jl's convention (gradient is primary).
 */
export function checkConvergence(
  gradNorm: number,
  stepNorm: number,
  funcChange: number,
  iteration: number,
  options: OptimizeOptions,
): ConvergenceReason | null {
  if (gradNorm < options.gradTol) {
    return { kind: "gradient", gradNorm };
  }
  if (stepNorm < options.stepTol) {
    return { kind: "step", stepNorm };
  }
  if (funcChange < options.funcTol) {
    return { kind: "function", funcChange };
  }
  if (iteration >= options.maxIterations) {
    return { kind: "maxIterations", iterations: iteration };
  }
  return null;
}

/** Is this convergence reason considered "converged" (vs "stopped")? */
export function isConverged(reason: ConvergenceReason): boolean {
  return (
    reason.kind === "gradient" ||
    reason.kind === "step" ||
    reason.kind === "function"
  );
}

/** Human-readable message for a convergence reason. */
export function convergenceMessage(reason: ConvergenceReason): string {
  switch (reason.kind) {
    case "gradient":
      return `Converged: gradient norm ${reason.gradNorm.toExponential(2)} below tolerance`;
    case "step":
      return `Converged: step size ${reason.stepNorm.toExponential(2)} below tolerance`;
    case "function":
      return `Converged: function change ${reason.funcChange.toExponential(2)} below tolerance`;
    case "maxIterations":
      return `Stopped: reached maximum iterations (${reason.iterations})`;
    case "lineSearchFailed":
      return `Stopped: line search failed (${reason.message})`;
  }
}
