/// Simulated Annealing global optimizer with Metropolis criterion.

use crate::result_types::{OptimizeOptions, OptimizeResult};

pub fn log_temperature(k: usize) -> f64 {
    1.0 / (k as f64).ln()
}

pub fn mulberry32(seed: u32) -> Box<dyn FnMut() -> f64> {
    let mut s = seed as u32;
    Box::new(move || {
        s = s.wrapping_add(0x6d2b79f5);
        let mut t = s ^ (s >> 15);
        t = t.wrapping_mul(1 | s);
        t = (t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t))) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    })
}

fn box_muller_normal(rng: &mut dyn FnMut() -> f64) -> f64 {
    let mut u1 = rng();
    while u1 == 0.0 {
        u1 = rng();
    }
    let u2 = rng();
    (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
}

fn gaussian_neighbor(x: &[f64], rng: &mut dyn FnMut() -> f64) -> Vec<f64> {
    x.iter().map(|xi| xi + box_muller_normal(rng)).collect()
}

pub fn simulated_annealing(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    options: Option<&OptimizeOptions>,
    seed: Option<u32>,
    temperature: Option<fn(usize) -> f64>,
) -> OptimizeResult {
    let defaults = OptimizeOptions::default();
    let opts = options.unwrap_or(&defaults);
    let max_iter = opts.max_iterations;
    let temp_fn = temperature.unwrap_or(log_temperature);

    let mut rng: Box<dyn FnMut() -> f64> = match seed {
        Some(s) => mulberry32(s),
        None => mulberry32(12345), // fallback deterministic
    };

    let mut x_current = x0.to_vec();
    let mut f_current = f(&x_current);
    let mut x_best = x_current.clone();
    let mut f_best = f_current;
    let mut function_calls = 1_usize;

    for k in 1..=max_iter {
        let t = temp_fn(k);
        let x_proposal = gaussian_neighbor(&x_current, &mut *rng);
        let f_proposal = f(&x_proposal);
        function_calls += 1;

        if f_proposal <= f_current {
            x_current = x_proposal;
            f_current = f_proposal;
            if f_proposal < f_best {
                x_best = x_current.clone();
                f_best = f_proposal;
            }
        } else {
            let p = (-(f_proposal - f_current) / t).exp();
            if rng() <= p {
                x_current = x_proposal;
                f_current = f_proposal;
            }
        }
    }

    OptimizeResult {
        x: x_best,
        fun: f_best,
        gradient: Some(vec![]),
        iterations: max_iter,
        function_calls,
        gradient_calls: 0,
        converged: true,
        message: format!("Completed {} iterations", max_iter),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sphere() {
        let f = |x: &[f64]| x[0] * x[0] + x[1] * x[1];
        let opts = OptimizeOptions {
            max_iterations: 10000,
            ..Default::default()
        };
        let r = simulated_annealing(&f, &[5.0, 5.0], Some(&opts), Some(42), None);
        assert!(r.fun < 1.0);
        assert_eq!(r.function_calls, 10001);
    }

    #[test]
    fn test_rastrigin() {
        let f = |x: &[f64]| {
            let n = x.len() as f64;
            10.0 * n
                + x.iter()
                    .map(|xi| xi * xi - 10.0 * (2.0 * std::f64::consts::PI * xi).cos())
                    .sum::<f64>()
        };
        let opts = OptimizeOptions {
            max_iterations: 50000,
            ..Default::default()
        };
        let r = simulated_annealing(&f, &[3.0, 3.0], Some(&opts), Some(42), None);
        assert!(r.fun < 5.0);
    }

    #[test]
    fn test_deterministic() {
        let f = |x: &[f64]| x[0] * x[0] + x[1] * x[1];
        let opts = OptimizeOptions {
            max_iterations: 100,
            ..Default::default()
        };
        let r1 = simulated_annealing(&f, &[5.0, 5.0], Some(&opts), Some(99), None);
        let r2 = simulated_annealing(&f, &[5.0, 5.0], Some(&opts), Some(99), None);
        assert_eq!(r1.x, r2.x);
        assert_eq!(r1.fun, r2.fun);
    }

    #[test]
    fn test_keep_best() {
        let f = |x: &[f64]| x[0] * x[0] + x[1] * x[1];
        let opts = OptimizeOptions {
            max_iterations: 1000,
            ..Default::default()
        };
        let temp = |_: usize| 1000.0; // Very high temp, chain wanders
        let r = simulated_annealing(&f, &[0.0, 0.0], Some(&opts), Some(42), Some(temp));
        assert!(r.fun < 0.1); // Best stays near origin
    }
}
