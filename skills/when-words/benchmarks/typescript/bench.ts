/**
 * when-words benchmark — TypeScript (Bun)
 *
 * Measures wall-clock time for each root node.
 * Outputs NDJSON, one line per node.
 */

import { timeAgo } from "../../reference/src/time-ago";
import { duration } from "../../reference/src/duration";
import { parseDuration } from "../../reference/src/parse-duration";
import { humanDate } from "../../reference/src/human-date";
import { dateRange } from "../../reference/src/date-range";

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

benchmarkNode(
  "time-ago",
  100000,
  10000,
  () => timeAgo(1704067200, 1704153600),
  () => timeAgo(1704067200, 1704153600) === "1 day ago",
);

benchmarkNode(
  "duration",
  100000,
  10000,
  () => duration(90061),
  () => duration(90061) === "1 day, 1 hour",
);

benchmarkNode(
  "parse-duration",
  100000,
  10000,
  () => parseDuration("1 day, 2 hours and 30 minutes"),
  () => parseDuration("1 day, 2 hours and 30 minutes") === 95400,
);

benchmarkNode(
  "human-date",
  100000,
  10000,
  () => humanDate(1704067200, 1704153600),
  () => humanDate(1704067200, 1704153600) === "Yesterday",
);

benchmarkNode(
  "date-range",
  100000,
  10000,
  () => dateRange(1705276800, 1705881600),
  () => dateRange(1705276800, 1705881600).includes("January"),
);
