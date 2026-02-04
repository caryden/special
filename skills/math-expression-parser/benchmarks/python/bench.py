"""
Math Expression Parser benchmark — Python

Measures wall-clock time for the evaluate node.
Outputs NDJSON, one line per node.
"""

import json
import sys
import time

sys.path.insert(0, "../../../../research/experiments/mathexpr-skill-python")
from mathexpr import calc


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

EXPR = "((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3"
EXPECTED = 92.592

benchmark_node(
    "evaluate",
    10000,
    1000,
    lambda: calc(EXPR),
    lambda: abs(calc(EXPR) - EXPECTED) < 1e-6,
)
