/// Nelder-Mead optimization library.
///
/// A minimal subset of a larger optimization library, implementing derivative-free
/// simplex optimization. Three modules: vec_ops (pure vector arithmetic),
/// result_types (shared types and convergence logic), and nelder_mead (the optimizer).

pub mod vec_ops {
    //! Pure vector arithmetic for n-dimensional optimization.
    //! All operations return new Vecs and never mutate inputs.

    /// Dot product of two vectors.
    pub fn dot(a: &[f64], b: &[f64]) -> f64 {
        a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
    }

    /// Euclidean (L2) norm.
    pub fn norm(v: &[f64]) -> f64 {
        dot(v, v).sqrt()
    }

    /// Infinity norm (max absolute value).
    pub fn norm_inf(v: &[f64]) -> f64 {
        v.iter().map(|x| x.abs()).fold(0.0_f64, f64::max)
    }

    /// Scalar multiplication.
    pub fn scale(v: &[f64], s: f64) -> Vec<f64> {
        v.iter().map(|x| x * s).collect()
    }

    /// Element-wise addition.
    pub fn add(a: &[f64], b: &[f64]) -> Vec<f64> {
        a.iter().zip(b.iter()).map(|(x, y)| x + y).collect()
    }

    /// Element-wise subtraction.
    pub fn sub(a: &[f64], b: &[f64]) -> Vec<f64> {
        a.iter().zip(b.iter()).map(|(x, y)| x - y).collect()
    }

    /// Element-wise negation.
    pub fn negate(v: &[f64]) -> Vec<f64> {
        scale(v, -1.0)
    }

    /// Deep copy (clone).
    pub fn clone_vec(v: &[f64]) -> Vec<f64> {
        v.to_vec()
    }

    /// Vector of n zeros.
    pub fn zeros(n: usize) -> Vec<f64> {
        vec![0.0; n]
    }

    /// Fused add-scaled: a + s*b (avoids intermediate allocation).
    pub fn add_scaled(a: &[f64], b: &[f64], s: f64) -> Vec<f64> {
        a.iter().zip(b.iter()).map(|(x, y)| x + s * y).collect()
    }
}

pub mod result_types {
    //! Shared types and convergence logic used by all optimization algorithms.

    use std::fmt;

    /// Configuration options for optimization.
    #[derive(Debug, Clone)]
    pub struct OptimizeOptions {
        /// Gradient infinity-norm tolerance. Default: 1e-8.
        pub grad_tol: f64,
        /// Step size tolerance. Default: 1e-8.
        pub step_tol: f64,
        /// Function value change tolerance. Default: 1e-12.
        pub func_tol: f64,
        /// Maximum number of iterations. Default: 1000.
        pub max_iterations: usize,
    }

    impl Default for OptimizeOptions {
        fn default() -> Self {
            Self {
                grad_tol: 1e-8,
                step_tol: 1e-8,
                func_tol: 1e-12,
                max_iterations: 1000,
            }
        }
    }

    /// Result of an optimization run.
    #[derive(Debug, Clone)]
    pub struct OptimizeResult {
        /// Solution vector (minimizer).
        pub x: Vec<f64>,
        /// Objective function value at solution.
        pub fun: f64,
        /// Gradient at solution (None for derivative-free methods).
        pub gradient: Option<Vec<f64>>,
        /// Number of iterations performed.
        pub iterations: usize,
        /// Number of objective function evaluations.
        pub function_calls: usize,
        /// Number of gradient evaluations.
        pub gradient_calls: usize,
        /// Whether the optimizer converged.
        pub converged: bool,
        /// Human-readable description of termination reason.
        pub message: String,
    }

    /// Why did the optimizer stop?
    #[derive(Debug, Clone)]
    pub enum ConvergenceReason {
        Gradient { grad_norm: f64 },
        Step { step_norm: f64 },
        Function { func_change: f64 },
        MaxIterations { iterations: usize },
        LineSearchFailed { message: String },
    }

    impl ConvergenceReason {
        /// Is this convergence reason considered "converged" (vs "stopped")?
        pub fn is_converged(&self) -> bool {
            matches!(
                self,
                ConvergenceReason::Gradient { .. }
                    | ConvergenceReason::Step { .. }
                    | ConvergenceReason::Function { .. }
            )
        }
    }

    impl fmt::Display for ConvergenceReason {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            match self {
                ConvergenceReason::Gradient { grad_norm } => {
                    write!(f, "Converged: gradient norm {:.2e} below tolerance", grad_norm)
                }
                ConvergenceReason::Step { step_norm } => {
                    write!(f, "Converged: step size {:.2e} below tolerance", step_norm)
                }
                ConvergenceReason::Function { func_change } => {
                    write!(
                        f,
                        "Converged: function change {:.2e} below tolerance",
                        func_change
                    )
                }
                ConvergenceReason::MaxIterations { iterations } => {
                    write!(f, "Stopped: reached maximum iterations ({})", iterations)
                }
                ConvergenceReason::LineSearchFailed { message } => {
                    write!(f, "Stopped: line search failed ({})", message)
                }
            }
        }
    }

    /// Check convergence criteria in order: gradient -> step -> function -> maxIterations.
    /// Returns the first matching reason, or None if no criterion is met.
    pub fn check_convergence(
        grad_norm: f64,
        step_norm: f64,
        func_change: f64,
        iteration: usize,
        options: &OptimizeOptions,
    ) -> Option<ConvergenceReason> {
        if grad_norm < options.grad_tol {
            return Some(ConvergenceReason::Gradient { grad_norm });
        }
        if step_norm < options.step_tol {
            return Some(ConvergenceReason::Step { step_norm });
        }
        if func_change < options.func_tol {
            return Some(ConvergenceReason::Function { func_change });
        }
        if iteration >= options.max_iterations {
            return Some(ConvergenceReason::MaxIterations { iterations: iteration });
        }
        None
    }
}

pub mod nelder_mead {
    //! Nelder-Mead (downhill simplex) derivative-free optimizer.

    use crate::result_types::{OptimizeOptions, OptimizeResult};
    use crate::vec_ops::{add, add_scaled, norm_inf, scale, sub};

    /// Options specific to the Nelder-Mead algorithm.
    #[derive(Debug, Clone)]
    pub struct NelderMeadOptions {
        /// Base optimization options.
        pub optimize: OptimizeOptions,
        /// Reflection coefficient. Default: 1.0.
        pub alpha: f64,
        /// Expansion coefficient. Default: 2.0.
        pub gamma: f64,
        /// Contraction coefficient. Default: 0.5.
        pub rho: f64,
        /// Shrink coefficient. Default: 0.5.
        pub sigma: f64,
        /// Initial simplex edge length scale. Default: 0.05.
        pub initial_simplex_scale: f64,
    }

    impl Default for NelderMeadOptions {
        fn default() -> Self {
            Self {
                optimize: OptimizeOptions::default(),
                alpha: 1.0,
                gamma: 2.0,
                rho: 0.5,
                sigma: 0.5,
                initial_simplex_scale: 0.05,
            }
        }
    }

    /// Create initial simplex: n+1 vertices. Vertex 0 = x0, vertex i = x0 + h*e_i.
    fn create_initial_simplex(x0: &[f64], simplex_scale: f64) -> Vec<Vec<f64>> {
        let n = x0.len();
        let mut simplex = Vec::with_capacity(n + 1);
        simplex.push(x0.to_vec());

        for i in 0..n {
            let mut vertex = x0.to_vec();
            let h = simplex_scale * x0[i].abs().max(1.0);
            vertex[i] += h;
            simplex.push(vertex);
        }

        simplex
    }

    /// Minimize a function using the Nelder-Mead simplex method.
    ///
    /// This is a derivative-free method. The returned result always has
    /// `gradient: None` and `gradient_calls: 0`.
    pub fn nelder_mead<F>(f: F, x0: &[f64], options: Option<NelderMeadOptions>) -> OptimizeResult
    where
        F: Fn(&[f64]) -> f64,
    {
        let opts = options.unwrap_or_default();
        let n = x0.len();

        // Initialize simplex
        let mut simplex = create_initial_simplex(x0, opts.initial_simplex_scale);
        let mut f_values: Vec<f64> = simplex.iter().map(|v| f(v)).collect();
        let mut function_calls = n + 1;

        let mut iteration = 0;

        while iteration < opts.optimize.max_iterations {
            // Sort vertices by function value (ascending)
            let mut indices: Vec<usize> = (0..=n).collect();
            indices.sort_by(|&a, &b| f_values[a].partial_cmp(&f_values[b]).unwrap());
            simplex = indices.iter().map(|&i| simplex[i].clone()).collect();
            f_values = indices.iter().map(|&i| f_values[i]).collect();

            let f_best = f_values[0];
            let f_worst = f_values[n];
            let f_second_worst = f_values[n - 1];

            // Check convergence: function value spread (std dev)
            let f_mean: f64 = f_values.iter().sum::<f64>() / (n + 1) as f64;
            let f_std = (f_values.iter().map(|&fv| (fv - f_mean).powi(2)).sum::<f64>()
                / (n + 1) as f64)
                .sqrt();

            if f_std < opts.optimize.func_tol {
                return OptimizeResult {
                    x: simplex[0].clone(),
                    fun: f_best,
                    gradient: None,
                    iterations: iteration,
                    function_calls,
                    gradient_calls: 0,
                    converged: true,
                    message: format!(
                        "Converged: simplex function spread {:.2e} below tolerance",
                        f_std
                    ),
                };
            }

            // Check convergence: simplex diameter
            let diameter = (1..=n)
                .map(|i| norm_inf(&sub(&simplex[i], &simplex[0])))
                .fold(0.0_f64, f64::max);

            if diameter < opts.optimize.step_tol {
                return OptimizeResult {
                    x: simplex[0].clone(),
                    fun: f_best,
                    gradient: None,
                    iterations: iteration,
                    function_calls,
                    gradient_calls: 0,
                    converged: true,
                    message: format!(
                        "Converged: simplex diameter {:.2e} below tolerance",
                        diameter
                    ),
                };
            }

            iteration += 1;

            // Compute centroid of all vertices except the worst
            let mut centroid = simplex[0].clone();
            for i in 1..n {
                for j in 0..n {
                    centroid[j] += simplex[i][j];
                }
            }
            for j in 0..n {
                centroid[j] /= n as f64;
            }

            // Reflection: x_r = centroid + alpha * (centroid - worst)
            let reflected = add_scaled(&centroid, &sub(&centroid, &simplex[n]), opts.alpha);
            let f_reflected = f(&reflected);
            function_calls += 1;

            if f_reflected < f_second_worst && f_reflected >= f_best {
                // Accept reflection
                simplex[n] = reflected;
                f_values[n] = f_reflected;
                continue;
            }

            if f_reflected < f_best {
                // Try expansion: x_e = centroid + gamma * (reflected - centroid)
                let expanded =
                    add_scaled(&centroid, &sub(&reflected, &centroid), opts.gamma);
                let f_expanded = f(&expanded);
                function_calls += 1;

                if f_expanded < f_reflected {
                    simplex[n] = expanded;
                    f_values[n] = f_expanded;
                } else {
                    simplex[n] = reflected;
                    f_values[n] = f_reflected;
                }
                continue;
            }

            // Contraction
            if f_reflected < f_worst {
                // Outside contraction
                let contracted =
                    add_scaled(&centroid, &sub(&reflected, &centroid), opts.rho);
                let f_contracted = f(&contracted);
                function_calls += 1;

                if f_contracted <= f_reflected {
                    simplex[n] = contracted;
                    f_values[n] = f_contracted;
                    continue;
                }
            } else {
                // Inside contraction
                let contracted =
                    add_scaled(&centroid, &sub(&simplex[n], &centroid), opts.rho);
                let f_contracted = f(&contracted);
                function_calls += 1;

                if f_contracted < f_worst {
                    simplex[n] = contracted;
                    f_values[n] = f_contracted;
                    continue;
                }
            }

            // Shrink: move all vertices towards the best
            for i in 1..=n {
                simplex[i] = add(&simplex[0], &scale(&sub(&simplex[i], &simplex[0]), opts.sigma));
                f_values[i] = f(&simplex[i]);
                function_calls += 1;
            }
        }

        // Max iterations reached — need to sort one final time to return best
        let mut indices: Vec<usize> = (0..=n).collect();
        indices.sort_by(|&a, &b| f_values[a].partial_cmp(&f_values[b]).unwrap());
        let best = indices[0];

        OptimizeResult {
            x: simplex[best].clone(),
            fun: f_values[best],
            gradient: None,
            iterations: iteration,
            function_calls,
            gradient_calls: 0,
            converged: false,
            message: format!(
                "Stopped: reached maximum iterations ({})",
                opts.optimize.max_iterations
            ),
        }
    }
}
