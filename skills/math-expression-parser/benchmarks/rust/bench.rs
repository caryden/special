//! Math Expression Parser benchmark — Rust
//!
//! Measures wall-clock time for the evaluate node.
//! Outputs NDJSON, one line per node.

use mathexpr::calc;
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

fn main() {
    let expr = "((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3";
    let expected = 92.592;

    benchmark_node(
        "evaluate",
        10000,
        1000,
        || {
            let _ = calc(expr);
        },
        || {
            match calc(expr) {
                Ok(v) => (v - expected).abs() < 1e-6,
                Err(_) => false,
            }
        },
    );
}
