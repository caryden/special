"""
Optimization skill benchmark — Python

Measures wall-clock time for available translated nodes.
Only nelder-mead is available in the Python translation.
Outputs NDJSON, one line per node.
"""

import json
import sys
import time

sys.path.insert(0, "../../../../research/experiments/optimize-skill-python")
from nelder_mead import nelder_mead


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

# nelder-mead: Rosenbrock from [-1.2, 1.0]
def rosenbrock(x):
    return 100 * (x[1] - x[0] ** 2) ** 2 + (1 - x[0]) ** 2


benchmark_node(
    "nelder-mead",
    1000,
    100,
    lambda: nelder_mead(rosenbrock, [-1.2, 1.0]),
    lambda: (
        lambda r: abs(r.x[0] - 1) < 0.01 and abs(r.x[1] - 1) < 0.01
    )(nelder_mead(rosenbrock, [-1.2, 1.0])),
)
