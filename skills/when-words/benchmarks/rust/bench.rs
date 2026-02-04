//! when-words benchmark — Rust
//!
//! Measures wall-clock time for each root node.
//! Outputs NDJSON, one line per node.

use whenwords_spec_rust::{date_range, duration, human_date, parse_duration, time_ago};
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
    benchmark_node(
        "time-ago",
        100000,
        10000,
        || { time_ago(1704067200, 1704153600); },
        || time_ago(1704067200, 1704153600) == "1 day ago",
    );

    benchmark_node(
        "duration",
        100000,
        10000,
        || { duration(90061, None).unwrap(); },
        || duration(90061, None).unwrap() == "1 day, 1 hour",
    );

    benchmark_node(
        "parse-duration",
        100000,
        10000,
        || { parse_duration("1 day, 2 hours and 30 minutes").unwrap(); },
        || parse_duration("1 day, 2 hours and 30 minutes").unwrap() == 95400,
    );

    benchmark_node(
        "human-date",
        100000,
        10000,
        || { human_date(1704067200, 1704153600); },
        || human_date(1704067200, 1704153600) == "Yesterday",
    );

    benchmark_node(
        "date-range",
        100000,
        10000,
        || { date_range(1705276800, 1705881600); },
        || date_range(1705276800, 1705881600).contains("January"),
    );
}
