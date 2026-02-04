//! Optimization skill benchmark — Rust
//!
//! Measures wall-clock time for available translated nodes (nelder-mead only).
//! Outputs NDJSON, one line per node.

use nelder_mead::nelder_mead::nelder_mead;
use std::time::Instant;

fn benchmark_node(
    name: &str,
    iterations: usize,
    warmup: usize,
    f: impl Fn(),
    check: impl Fn() -> bool,
) {
    let correct = check();
    if !correct {
        eprintln!("FAIL: {} correctness check failed", name);
        std::process::exit(1);
    }

    for _ in 0..warmup {
        f();
    }

    let mut times: Vec<f64> = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let t0 = Instant::now();
        f();
        let elapsed_ms = t0.elapsed().as_nanos() as f64 / 1_000_000.0;
        times.push(elapsed_ms);
    }

    times.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let n = times.len();
    println!(
        r#"{{"node":"{}","language":"rust","iterations":{},"warmup":{},"wall_clock_ms":{{"min":{},"median":{},"p95":{},"max":{}}},"correctness":{}}}"#,
        name,
        iterations,
        warmup,
        times[0],
        times[n / 2],
        times[(n as f64 * 0.95) as usize],
        times[n - 1],
        correct,
    );
}

fn rosenbrock(x: &[f64]) -> f64 {
    100.0 * (x[1] - x[0] * x[0]).powi(2) + (1.0 - x[0]).powi(2)
}

fn main() {
    benchmark_node(
        "nelder-mead",
        1000,
        100,
        || {
            nelder_mead(rosenbrock, &[-1.2, 1.0], None);
        },
        || {
            let r = nelder_mead(rosenbrock, &[-1.2, 1.0], None);
            (r.x[0] - 1.0).abs() < 0.01 && (r.x[1] - 1.0).abs() < 0.01
        },
    );
}
