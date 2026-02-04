/// Nelder-Mead derivative-free simplex optimizer.

use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops;

pub fn nelder_mead(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    let defaults = OptimizeOptions::default();
    let opts = options.unwrap_or(&defaults);
    let n = x0.len();

    let alpha = 1.0_f64;
    let gamma = 2.0_f64;
    let rho = 0.5_f64;
    let sigma = 0.5_f64;
    let scale = 0.05_f64;

    // Create initial simplex
    let mut simplex: Vec<Vec<f64>> = Vec::with_capacity(n + 1);
    simplex.push(x0.to_vec());
    for i in 0..n {
        let mut v = x0.to_vec();
        let h = scale * x0[i].abs().max(1.0);
        v[i] += h;
        simplex.push(v);
    }

    let mut f_vals: Vec<f64> = simplex.iter().map(|v| f(v)).collect();
    let mut function_calls = n + 1;

    for iteration in 0..opts.max_iterations {
        // Sort by function value
        let mut indices: Vec<usize> = (0..=n).collect();
        indices.sort_by(|&a, &b| f_vals[a].partial_cmp(&f_vals[b]).unwrap());
        let sorted_simplex: Vec<Vec<f64>> = indices.iter().map(|&i| simplex[i].clone()).collect();
        let sorted_f: Vec<f64> = indices.iter().map(|&i| f_vals[i]).collect();
        simplex = sorted_simplex;
        f_vals = sorted_f;

        // Check convergence: std dev of function values < funcTol
        let mean_f: f64 = f_vals.iter().sum::<f64>() / (n + 1) as f64;
        let std_f = (f_vals.iter().map(|v| (v - mean_f).powi(2)).sum::<f64>() / (n + 1) as f64)
            .sqrt();
        if std_f < opts.func_tol {
            return OptimizeResult {
                x: simplex[0].clone(),
                fun: f_vals[0],
                gradient: None,
                iterations: iteration,
                function_calls,
                gradient_calls: 0,
                converged: true,
                message: "Converged: function value spread below tolerance".to_string(),
            };
        }

        // Check simplex diameter < stepTol
        let mut max_dist = 0.0_f64;
        for i in 1..=n {
            let d: f64 = simplex[i]
                .iter()
                .zip(simplex[0].iter())
                .map(|(a, b)| (a - b).powi(2))
                .sum::<f64>()
                .sqrt();
            max_dist = max_dist.max(d);
        }
        if max_dist < opts.step_tol {
            return OptimizeResult {
                x: simplex[0].clone(),
                fun: f_vals[0],
                gradient: None,
                iterations: iteration,
                function_calls,
                gradient_calls: 0,
                converged: true,
                message: "Converged: simplex diameter below tolerance".to_string(),
            };
        }

        // Centroid of all except worst
        let mut centroid = vec![0.0; n];
        for i in 0..n {
            for j in 0..n {
                centroid[j] += simplex[i][j];
            }
        }
        for j in 0..n {
            centroid[j] /= n as f64;
        }

        // Reflect
        let worst = &simplex[n];
        let reflected: Vec<f64> = centroid
            .iter()
            .zip(worst.iter())
            .map(|(c, w)| c + alpha * (c - w))
            .collect();
        let f_reflected = f(&reflected);
        function_calls += 1;

        if f_reflected < f_vals[n - 1] && f_reflected >= f_vals[0] {
            simplex[n] = reflected;
            f_vals[n] = f_reflected;
            continue;
        }

        // Expand
        if f_reflected < f_vals[0] {
            let expanded: Vec<f64> = centroid
                .iter()
                .zip(worst.iter())
                .map(|(c, w)| c + gamma * (c - w))
                .collect();
            let f_expanded = f(&expanded);
            function_calls += 1;

            if f_expanded < f_reflected {
                simplex[n] = expanded;
                f_vals[n] = f_expanded;
            } else {
                simplex[n] = reflected;
                f_vals[n] = f_reflected;
            }
            continue;
        }

        // Contract
        if f_reflected < f_vals[n] {
            // Outside contraction
            let contracted: Vec<f64> = centroid
                .iter()
                .zip(worst.iter())
                .map(|(c, w)| c + rho * (c - w))
                .collect();
            let f_contracted = f(&contracted);
            function_calls += 1;

            if f_contracted <= f_reflected {
                simplex[n] = contracted;
                f_vals[n] = f_contracted;
                continue;
            }
        } else {
            // Inside contraction
            let contracted: Vec<f64> = centroid
                .iter()
                .zip(worst.iter())
                .map(|(c, w)| c - rho * (c - w))
                .collect();
            let f_contracted = f(&contracted);
            function_calls += 1;

            if f_contracted < f_vals[n] {
                simplex[n] = contracted;
                f_vals[n] = f_contracted;
                continue;
            }
        }

        // Shrink
        let best = simplex[0].clone();
        for i in 1..=n {
            for j in 0..n {
                simplex[i][j] = best[j] + sigma * (simplex[i][j] - best[j]);
            }
            f_vals[i] = f(&simplex[i]);
            function_calls += 1;
        }
    }

    // Sort final
    let mut indices: Vec<usize> = (0..=n).collect();
    indices.sort_by(|&a, &b| f_vals[a].partial_cmp(&f_vals[b]).unwrap());

    OptimizeResult {
        x: simplex[indices[0]].clone(),
        fun: f_vals[indices[0]],
        gradient: None,
        iterations: opts.max_iterations,
        function_calls,
        gradient_calls: 0,
        converged: false,
        message: format!(
            "Stopped: reached maximum iterations ({})",
            opts.max_iterations
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_sphere() {
        let tf = sphere();
        let r = nelder_mead(&tf.f, &tf.starting_point, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
        assert!((r.x[0]).abs() < 1e-3);
        assert!((r.x[1]).abs() < 1e-3);
    }

    #[test]
    fn test_booth() {
        let tf = booth();
        let r = nelder_mead(&tf.f, &tf.starting_point, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_rosenbrock() {
        let tf = rosenbrock();
        let opts = OptimizeOptions {
            max_iterations: 5000,
            func_tol: 1e-14,
            step_tol: 1e-14,
            ..Default::default()
        };
        let r = nelder_mead(&tf.f, &tf.starting_point, Some(&opts));
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_beale() {
        let tf = beale();
        let opts = OptimizeOptions {
            max_iterations: 5000,
            ..Default::default()
        };
        let r = nelder_mead(&tf.f, &tf.starting_point, Some(&opts));
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_himmelblau() {
        let tf = himmelblau();
        let r = nelder_mead(&tf.f, &tf.starting_point, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_goldstein_price() {
        let tf = goldstein_price();
        let r = nelder_mead(&tf.f, &tf.starting_point, None);
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_max_iter() {
        let tf = rosenbrock();
        let opts = OptimizeOptions {
            max_iterations: 5,
            ..Default::default()
        };
        let r = nelder_mead(&tf.f, &tf.starting_point, Some(&opts));
        assert!(r.iterations <= 5);
        assert!(!r.converged);
    }

    #[test]
    fn test_gradient_calls_zero() {
        let tf = sphere();
        let r = nelder_mead(&tf.f, &tf.starting_point, None);
        assert_eq!(r.gradient_calls, 0);
    }
}
