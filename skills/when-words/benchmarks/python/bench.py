"""
when-words benchmark — Python

Measures wall-clock time for each root node.
Outputs NDJSON, one line per node.
"""

import json
import sys
import time

sys.path.insert(0, "../../../../research/experiments/whenwords-spec-python")
from whenwords import time_ago, duration, parse_duration, human_date, date_range


def benchmark_node(name, iterations, warmup, fn, check):
    correct = check()
    if not correct:
        print(f"FAIL: {name} correctness check failed", file=sys.stderr)
        sys.exit(1)

    for _ in range(warmup):
        fn()

    times = []
    for _ in range(iterations):
        t0 = time.perf_counter_ns()
        fn()
        elapsed_ms = (time.perf_counter_ns() - t0) / 1_000_000
        times.append(elapsed_ms)

    times.sort()
    n = len(times)

    result = {
        "node": name,
        "language": "python",
        "iterations": iterations,
        "warmup": warmup,
        "wall_clock_ms": {
            "min": times[0],
            "median": times[n // 2],
            "p95": times[int(n * 0.95)],
            "max": times[-1],
        },
        "correctness": correct,
    }
    print(json.dumps(result))


# ---------------------------------------------------------------------------
# Workloads
# ---------------------------------------------------------------------------

benchmark_node(
    "time-ago",
    100000,
    10000,
    lambda: time_ago(1704067200, 1704153600),
    lambda: time_ago(1704067200, 1704153600) == "1 day ago",
)

benchmark_node(
    "duration",
    100000,
    10000,
    lambda: duration(90061),
    lambda: duration(90061) == "1 day, 1 hour",
)

benchmark_node(
    "parse-duration",
    100000,
    10000,
    lambda: parse_duration("1 day, 2 hours and 30 minutes"),
    lambda: parse_duration("1 day, 2 hours and 30 minutes") == 95400,
)

benchmark_node(
    "human-date",
    100000,
    10000,
    lambda: human_date(1704067200, 1704153600),
    lambda: human_date(1704067200, 1704153600) == "Yesterday",
)

benchmark_node(
    "date-range",
    100000,
    10000,
    lambda: date_range(1705276800, 1705881600),
    lambda: "January" in date_range(1705276800, 1705881600),
)
