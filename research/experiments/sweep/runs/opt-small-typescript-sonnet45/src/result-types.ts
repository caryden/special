/**
 * Shared types and convergence logic used by all optimization algorithms.
 */

/**
 * Options for optimization algorithms
 */
export interface OptimizeOptions {
  gradTol: number;
  stepTol: number;
  funcTol: number;
  maxIterations: number;
}

/**
 * Result returned by optimization algorithms
 */
export interface OptimizeResult {
  x: number[];
  fun: number;
  gradient: number[] | null;
  iterations: number;
  functionCalls: number;
  gradientCalls: number;
  converged: boolean;
  message: string;
}

/**
 * Convergence reason (tagged union)
 */
export type ConvergenceReason =
  | { kind: "gradient" }
  | { kind: "step" }
  | { kind: "function" }
  | { kind: "maxIterations" }
  | { kind: "lineSearchFailed" };

/**
 * Create default options with optional overrides
 */
export function defaultOptions(
  overrides?: Partial<OptimizeOptions>
): OptimizeOptions {
  return {
    gradTol: 1e-8,
    stepTol: 1e-8,
    funcTol: 1e-12,
    maxIterations: 1000,
    ...overrides,
  };
}

/**
 * Check convergence criteria in order: gradient → step → function → maxIterations
 * Returns the first matched criterion or null if none match
 */
export function checkConvergence(
  gradNorm: number,
  stepNorm: number,
  funcChange: number,
  iteration: number,
  opts: OptimizeOptions
): ConvergenceReason | null {
  // Check in priority order: gradient → step → function → maxIterations
  if (gradNorm < opts.gradTol) {
    return { kind: "gradient" };
  }
  if (stepNorm < opts.stepTol) {
    return { kind: "step" };
  }
  if (funcChange < opts.funcTol) {
    return { kind: "function" };
  }
  if (iteration >= opts.maxIterations) {
    return { kind: "maxIterations" };
  }
  return null;
}

/**
 * Check if a convergence reason indicates successful convergence
 * True for gradient/step/function; false for maxIterations/lineSearchFailed
 */
export function isConverged(reason: ConvergenceReason): boolean {
  return (
    reason.kind === "gradient" ||
    reason.kind === "step" ||
    reason.kind === "function"
  );
}

/**
 * Get human-readable message for convergence reason
 */
export function convergenceMessage(reason: ConvergenceReason): string {
  switch (reason.kind) {
    case "gradient":
      return "Converged: gradient norm below tolerance";
    case "step":
      return "Converged: step size below tolerance";
    case "function":
      return "Converged: function change below tolerance";
    case "maxIterations":
      return "Maximum iterations reached";
    case "lineSearchFailed":
      return "Line search failed to find acceptable step";
  }
}
