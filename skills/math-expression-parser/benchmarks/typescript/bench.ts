/**
 * Math Expression Parser benchmark — TypeScript (Bun)
 *
 * Measures wall-clock time for the evaluate node.
 * Outputs NDJSON, one line per node.
 */

import { calc } from "../../reference/src/evaluate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function benchmarkNode(
  name: string,
  iterations: number,
  warmup: number,
  fn: () => void,
  check: () => boolean,
) {
  const correct = check();
  if (!correct) {
    console.error(`FAIL: ${name} correctness check failed`);
    process.exit(1);
  }

  for (let i = 0; i < warmup; i++) fn();

  const times: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times[i] = performance.now() - t0;
  }

  times.sort((a, b) => a - b);

  const result = {
    node: name,
    language: "typescript",
    iterations,
    warmup,
    wall_clock_ms: {
      min: times[0],
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      max: times[times.length - 1],
    },
    correctness: correct,
  };

  console.log(JSON.stringify(result));
}

// ---------------------------------------------------------------------------
// Workloads
// ---------------------------------------------------------------------------

const EXPR = "((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3";
const EXPECTED = 92.592;

benchmarkNode(
  "evaluate",
  10000,
  1000,
  () => calc(EXPR),
  () => Math.abs(calc(EXPR) - EXPECTED) < 1e-6,
);
