/**
 * Optimization skill benchmark — TypeScript (Bun)
 *
 * Measures wall-clock time for each root node workload.
 * Outputs NDJSON, one line per node.
 */

import { minimize } from "../../reference/src/minimize";
import { nelderMead } from "../../reference/src/nelder-mead";
import { brent1d } from "../../reference/src/brent-1d";
import { simulatedAnnealing } from "../../reference/src/simulated-annealing";

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
  // Correctness check
  const correct = check();
  if (!correct) {
    console.error(`FAIL: ${name} correctness check failed`);
    process.exit(1);
  }

  // Warmup
  for (let i = 0; i < warmup; i++) fn();

  // Measured runs — record per-iteration time
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

// minimize: Rosenbrock via BFGS with analytic gradient
const rosenbrock = (x: number[]) =>
  100 * (x[1] - x[0] ** 2) ** 2 + (1 - x[0]) ** 2;
const rosenGrad = (x: number[]) => [
  -400 * x[0] * (x[1] - x[0] ** 2) - 2 * (1 - x[0]),
  200 * (x[1] - x[0] ** 2),
];

// nelder-mead: Rosenbrock from [-1.2, 1.0] (matches Python/Go/Rust workload)
benchmarkNode(
  "nelder-mead",
  1000,
  100,
  () => nelderMead(rosenbrock, [-1.2, 1.0]),
  () => {
    const r = nelderMead(rosenbrock, [-1.2, 1.0]);
    return Math.abs(r.x[0] - 1) < 0.01 && Math.abs(r.x[1] - 1) < 0.01;
  },
);

// minimize: Rosenbrock via BFGS with analytic gradient
benchmarkNode(
  "minimize",
  1000,
  100,
  () => minimize(rosenbrock, [-1.2, 1.0], { method: "bfgs", grad: rosenGrad }),
  () => {
    const r = minimize(rosenbrock, [-1.2, 1.0], {
      method: "bfgs",
      grad: rosenGrad,
    });
    return Math.abs(r.x[0] - 1) < 1e-4 && Math.abs(r.x[1] - 1) < 1e-4;
  },
);

// brent-1d: minimize (x - 0.3)^2 on [0, 1]
benchmarkNode(
  "brent-1d",
  10000,
  1000,
  () => brent1d((x: number) => (x - 0.3) ** 2, 0, 1),
  () => {
    const r = brent1d((x: number) => (x - 0.3) ** 2, 0, 1);
    return Math.abs(r.x - 0.3) < 1e-8;
  },
);

// simulated-annealing: sphere from [5, 5], seed=42, maxIter=1000
const sphere = (x: number[]) => x[0] ** 2 + x[1] ** 2;

benchmarkNode(
  "simulated-annealing",
  100,
  10,
  () => simulatedAnnealing(sphere, [5, 5], { seed: 42, maxIterations: 1000 }),
  () => {
    const r = simulatedAnnealing(sphere, [5, 5], {
      seed: 42,
      maxIterations: 1000,
    });
    return r.fun < 1.0;
  },
);
