/// nelder-mead: Derivative-free simplex optimizer

use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops;

#[derive(Debug, Clone)]
pub struct NelderMeadOptions {
    pub alpha: f64,           // Reflection coefficient
    pub gamma: f64,           // Expansion coefficient
    pub rho: f64,             // Contraction coefficient
    pub sigma: f64,           // Shrink coefficient
    pub initial_simplex_scale: f64,
    pub optimize_options: OptimizeOptions,
}

impl Default for NelderMeadOptions {
    fn default() -> Self {
        Self {
            alpha: 1.0,
            gamma: 2.0,
            rho: 0.5,
            sigma: 0.5,
            initial_simplex_scale: 0.05,
            optimize_options: OptimizeOptions::default(),
        }
    }
}

impl NelderMeadOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_optimize_options(mut self, opts: OptimizeOptions) -> Self {
        self.optimize_options = opts;
        self
    }
}

fn create_initial_simplex(x0: &[f64], scale: f64) -> Vec<Vec<f64>> {
    let n = x0.len();
    let mut simplex = Vec::with_capacity(n + 1);

    // First vertex is x0
    simplex.push(x0.to_vec());

    // Create n additional vertices: x0 + h*ei
    for i in 0..n {
        let h = scale * x0[i].abs().max(1.0);
        let mut vertex = x0.to_vec();
        vertex[i] += h;
        simplex.push(vertex);
    }

    simplex
}

fn compute_centroid(simplex: &[Vec<f64>], exclude_idx: usize) -> Vec<f64> {
    let n = simplex[0].len();
    let count = simplex.len() - 1;
    let mut centroid = vec![0.0; n];

    for (i, vertex) in simplex.iter().enumerate() {
        if i != exclude_idx {
            for j in 0..n {
                centroid[j] += vertex[j];
            }
        }
    }

    for j in 0..n {
        centroid[j] /= count as f64;
    }

    centroid
}

fn simplex_std_dev(f_values: &[f64]) -> f64 {
    let mean: f64 = f_values.iter().sum::<f64>() / f_values.len() as f64;
    let variance: f64 = f_values.iter().map(|f| (f - mean).powi(2)).sum::<f64>() / f_values.len() as f64;
    variance.sqrt()
}

fn simplex_diameter(simplex: &[Vec<f64>]) -> f64 {
    let mut max_dist: f64 = 0.0;
    for i in 0..simplex.len() {
        for j in (i + 1)..simplex.len() {
            let diff = vec_ops::sub(&simplex[i], &simplex[j]);
            let dist = vec_ops::norm(&diff);
            max_dist = max_dist.max(dist);
        }
    }
    max_dist
}

pub fn nelder_mead<F>(f: F, x0: &[f64], options: Option<NelderMeadOptions>) -> OptimizeResult
where
    F: Fn(&[f64]) -> f64,
{
    let opts = options.unwrap_or_default();
    let alpha = opts.alpha;
    let gamma = opts.gamma;
    let rho = opts.rho;
    let sigma = opts.sigma;
    let tols = &opts.optimize_options;

    // Create initial simplex
    let mut simplex = create_initial_simplex(x0, opts.initial_simplex_scale);
    let n = x0.len();

    // Evaluate function at all vertices
    let mut f_values: Vec<f64> = simplex.iter().map(|v| f(v)).collect();
    let mut function_calls = n + 1;

    let mut iterations = 0;
    let mut converged = false;
    let mut message = String::new();

    loop {
        // Sort vertices by function value
        let mut indices: Vec<usize> = (0..simplex.len()).collect();
        indices.sort_by(|&i, &j| f_values[i].partial_cmp(&f_values[j]).unwrap());

        let best_idx = indices[0];
        let second_worst_idx = indices[n - 1];
        let worst_idx = indices[n];

        let f_best = f_values[best_idx];
        let f_second_worst = f_values[second_worst_idx];
        let f_worst = f_values[worst_idx];

        // Check convergence
        let f_std = simplex_std_dev(&f_values);
        let diameter = simplex_diameter(&simplex);

        if f_std < tols.func_tol {
            converged = true;
            message = format!("Converged: function value spread {} below tolerance", f_std);
            break;
        }

        if diameter < tols.step_tol {
            converged = true;
            message = format!("Converged: simplex diameter {} below tolerance", diameter);
            break;
        }

        if iterations >= tols.max_iterations {
            converged = false;
            message = format!("Maximum iterations {} reached", tols.max_iterations);
            break;
        }

        iterations += 1;

        // Compute centroid (excluding worst vertex)
        let centroid = compute_centroid(&simplex, worst_idx);

        // Reflection
        let worst = &simplex[worst_idx];
        let reflected = vec_ops::add_scaled(&centroid, &vec_ops::sub(&centroid, worst), alpha);
        let f_reflected = f(&reflected);
        function_calls += 1;

        if f_reflected >= f_best && f_reflected < f_second_worst {
            // Accept reflection
            simplex[worst_idx] = reflected;
            f_values[worst_idx] = f_reflected;
            continue;
        }

        if f_reflected < f_best {
            // Try expansion
            let expanded = vec_ops::add_scaled(&centroid, &vec_ops::sub(&reflected, &centroid), gamma);
            let f_expanded = f(&expanded);
            function_calls += 1;

            if f_expanded < f_reflected {
                simplex[worst_idx] = expanded;
                f_values[worst_idx] = f_expanded;
            } else {
                simplex[worst_idx] = reflected;
                f_values[worst_idx] = f_reflected;
            }
            continue;
        }

        // Contraction
        let contracted = if f_reflected < f_worst {
            // Outside contraction
            vec_ops::add_scaled(&centroid, &vec_ops::sub(&reflected, &centroid), rho)
        } else {
            // Inside contraction
            vec_ops::add_scaled(&centroid, &vec_ops::sub(worst, &centroid), rho)
        };
        let f_contracted = f(&contracted);
        function_calls += 1;

        if f_contracted < f_worst.min(f_reflected) {
            simplex[worst_idx] = contracted;
            f_values[worst_idx] = f_contracted;
            continue;
        }

        // Shrink
        let best_vertex = simplex[best_idx].clone();
        for i in 0..simplex.len() {
            if i != best_idx {
                simplex[i] = vec_ops::add_scaled(&best_vertex, &vec_ops::sub(&simplex[i], &best_vertex), sigma);
                f_values[i] = f(&simplex[i]);
                function_calls += 1;
            }
        }
    }

    // Find best solution
    let mut best_idx = 0;
    let mut best_f = f_values[0];
    for i in 1..f_values.len() {
        if f_values[i] < best_f {
            best_f = f_values[i];
            best_idx = i;
        }
    }

    OptimizeResult {
        x: simplex[best_idx].clone(),
        fun: best_f,
        gradient: None,
        iterations,
        function_calls,
        gradient_calls: 0,
        converged,
        message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    fn vec_approx_eq(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.len() == b.len() && a.iter().zip(b.iter()).all(|(x, y)| approx_eq(*x, *y, tol))
    }

    // Test functions
    fn sphere(x: &[f64]) -> f64 {
        x.iter().map(|xi| xi * xi).sum()
    }

    fn booth(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (x0 + 2.0 * x1 - 7.0).powi(2) + (2.0 * x0 + x1 - 5.0).powi(2)
    }

    fn beale(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (1.5 - x0 + x0 * x1).powi(2)
            + (2.25 - x0 + x0 * x1 * x1).powi(2)
            + (2.625 - x0 + x0 * x1 * x1 * x1).powi(2)
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        100.0 * (x1 - x0 * x0).powi(2) + (1.0 - x0).powi(2)
    }

    fn himmelblau(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (x0 * x0 + x1 - 11.0).powi(2) + (x0 + x1 * x1 - 7.0).powi(2)
    }

    fn goldstein_price(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        let term1 = 1.0
            + (x0 + x1 + 1.0).powi(2)
                * (19.0 - 14.0 * x0 + 3.0 * x0 * x0 - 14.0 * x1 + 6.0 * x0 * x1 + 3.0 * x1 * x1);
        let term2 = 30.0
            + (2.0 * x0 - 3.0 * x1).powi(2)
                * (18.0 - 32.0 * x0 + 12.0 * x0 * x0 + 48.0 * x1 - 36.0 * x0 * x1 + 27.0 * x1 * x1);
        term1 * term2
    }

    #[test]
    fn test_sphere() {
        let result = nelder_mead(sphere, &[5.0, 5.0], None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
        assert!(vec_approx_eq(&result.x, &[0.0, 0.0], 1e-3));
    }

    #[test]
    fn test_booth() {
        let result = nelder_mead(booth, &[0.0, 0.0], None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
        assert!(vec_approx_eq(&result.x, &[1.0, 3.0], 1e-3));
    }

    #[test]
    fn test_beale() {
        let opts = NelderMeadOptions::default()
            .with_optimize_options(OptimizeOptions::default().with_max_iterations(5000));
        let result = nelder_mead(beale, &[0.0, 0.0], Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-6);
    }

    #[test]
    fn test_rosenbrock() {
        let opts = NelderMeadOptions::default().with_optimize_options(
            OptimizeOptions::default()
                .with_max_iterations(5000)
                .with_func_tol(1e-12)
                .with_step_tol(1e-10),
        );
        let result = nelder_mead(rosenbrock, &[-1.2, 1.0], Some(opts));
        assert!(result.converged);
        assert!(result.fun < 1e-6);
        assert!(vec_approx_eq(&result.x, &[1.0, 1.0], 1e-2));
    }

    #[test]
    fn test_himmelblau() {
        let result = nelder_mead(himmelblau, &[0.0, 0.0], None);
        assert!(result.converged);
        assert!(result.fun < 1e-6);
        // Should converge to one of four minima
        let minima = vec![
            vec![3.0, 2.0],
            vec![-2.805118, 3.131312],
            vec![-3.779310, -3.283186],
            vec![3.584428, -1.848126],
        ];
        let converged_to_known = minima
            .iter()
            .any(|minimum| vec_approx_eq(&result.x, minimum, 0.1));
        assert!(converged_to_known);
    }

    #[test]
    fn test_goldstein_price() {
        let result = nelder_mead(goldstein_price, &[-0.1, -0.9], None);
        assert!(result.converged);
        assert!(approx_eq(result.fun, 3.0, 0.1));
        assert!(vec_approx_eq(&result.x, &[0.0, -1.0], 0.1));
    }

    #[test]
    fn test_respects_max_iterations() {
        let opts = NelderMeadOptions::default()
            .with_optimize_options(OptimizeOptions::default().with_max_iterations(5));
        let result = nelder_mead(rosenbrock, &[-1.2, 1.0], Some(opts));
        assert!(result.iterations <= 5);
        assert!(!result.converged);
    }

    #[test]
    fn test_gradient_calls_always_zero() {
        let result = nelder_mead(sphere, &[5.0, 5.0], None);
        assert_eq!(result.gradient_calls, 0);
    }

    #[test]
    fn test_gradient_is_none() {
        let result = nelder_mead(sphere, &[5.0, 5.0], None);
        assert!(result.gradient.is_none());
    }
}
