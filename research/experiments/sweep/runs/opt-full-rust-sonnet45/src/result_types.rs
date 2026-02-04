/// Shared types and convergence logic used by all optimization algorithms.

#[derive(Debug, Clone)]
pub struct OptimizeOptions {
    pub grad_tol: f64,
    pub step_tol: f64,
    pub func_tol: f64,
    pub max_iterations: usize,
}

impl Default for OptimizeOptions {
    fn default() -> Self {
        OptimizeOptions {
            grad_tol: 1e-8,
            step_tol: 1e-8,
            func_tol: 1e-12,
            max_iterations: 1000,
        }
    }
}

impl OptimizeOptions {
    pub fn with_overrides(
        grad_tol: Option<f64>,
        step_tol: Option<f64>,
        func_tol: Option<f64>,
        max_iterations: Option<usize>,
    ) -> Self {
        let d = Self::default();
        OptimizeOptions {
            grad_tol: grad_tol.unwrap_or(d.grad_tol),
            step_tol: step_tol.unwrap_or(d.step_tol),
            func_tol: func_tol.unwrap_or(d.func_tol),
            max_iterations: max_iterations.unwrap_or(d.max_iterations),
        }
    }
}

#[derive(Debug, Clone)]
pub struct OptimizeResult {
    pub x: Vec<f64>,
    pub fun: f64,
    pub gradient: Option<Vec<f64>>,
    pub iterations: usize,
    pub function_calls: usize,
    pub gradient_calls: usize,
    pub converged: bool,
    pub message: String,
}

#[derive(Debug, Clone)]
pub enum ConvergenceReason {
    Gradient { grad_norm: f64 },
    Step { step_norm: f64 },
    Function { func_change: f64 },
    MaxIterations { iterations: usize },
    LineSearchFailed { message: String },
}

impl ConvergenceReason {
    pub fn is_converged(&self) -> bool {
        match self {
            ConvergenceReason::Gradient { .. } => true,
            ConvergenceReason::Step { .. } => true,
            ConvergenceReason::Function { .. } => true,
            ConvergenceReason::MaxIterations { .. } => false,
            ConvergenceReason::LineSearchFailed { .. } => false,
        }
    }

    pub fn message(&self) -> String {
        match self {
            ConvergenceReason::Gradient { grad_norm } => {
                format!("Converged: gradient norm {:.2e} below tolerance", grad_norm)
            }
            ConvergenceReason::Step { step_norm } => {
                format!("Converged: step size {:.2e} below tolerance", step_norm)
            }
            ConvergenceReason::Function { func_change } => {
                format!(
                    "Converged: function change {:.2e} below tolerance",
                    func_change
                )
            }
            ConvergenceReason::MaxIterations { iterations } => {
                format!("Stopped: reached maximum iterations ({})", iterations)
            }
            ConvergenceReason::LineSearchFailed { message } => {
                format!("Stopped: line search failed ({})", message)
            }
        }
    }
}

impl std::fmt::Display for ConvergenceReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

pub fn default_options(overrides: Option<&OptimizeOptions>) -> OptimizeOptions {
    match overrides {
        Some(o) => o.clone(),
        None => OptimizeOptions::default(),
    }
}

pub fn check_convergence(
    grad_norm: f64,
    step_norm: f64,
    func_change: f64,
    iteration: usize,
    opts: &OptimizeOptions,
) -> Option<ConvergenceReason> {
    if grad_norm < opts.grad_tol {
        return Some(ConvergenceReason::Gradient { grad_norm });
    }
    if step_norm < opts.step_tol {
        return Some(ConvergenceReason::Step { step_norm });
    }
    if func_change < opts.func_tol {
        return Some(ConvergenceReason::Function { func_change });
    }
    if iteration >= opts.max_iterations {
        return Some(ConvergenceReason::MaxIterations {
            iterations: iteration,
        });
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_options() {
        let opts = OptimizeOptions::default();
        assert_eq!(opts.grad_tol, 1e-8);
        assert_eq!(opts.step_tol, 1e-8);
        assert_eq!(opts.func_tol, 1e-12);
        assert_eq!(opts.max_iterations, 1000);
    }

    #[test]
    fn test_with_overrides() {
        let opts = OptimizeOptions::with_overrides(Some(1e-4), None, None, None);
        assert_eq!(opts.grad_tol, 1e-4);
        assert_eq!(opts.step_tol, 1e-8);
    }

    #[test]
    fn test_check_convergence_gradient() {
        let opts = OptimizeOptions::default();
        let r = check_convergence(1e-9, 0.1, 0.1, 5, &opts);
        assert!(r.is_some());
        assert!(r.unwrap().is_converged());
    }

    #[test]
    fn test_check_convergence_step() {
        let opts = OptimizeOptions::default();
        let r = check_convergence(0.1, 1e-9, 0.1, 5, &opts);
        assert!(r.is_some());
        match r.unwrap() {
            ConvergenceReason::Step { .. } => {}
            _ => panic!("Expected Step"),
        }
    }

    #[test]
    fn test_check_convergence_function() {
        let opts = OptimizeOptions::default();
        let r = check_convergence(0.1, 0.1, 1e-13, 5, &opts);
        assert!(r.is_some());
        match r.unwrap() {
            ConvergenceReason::Function { .. } => {}
            _ => panic!("Expected Function"),
        }
    }

    #[test]
    fn test_check_convergence_max_iter() {
        let opts = OptimizeOptions::default();
        let r = check_convergence(0.1, 0.1, 0.1, 1000, &opts);
        assert!(r.is_some());
        assert!(!r.unwrap().is_converged());
    }

    #[test]
    fn test_check_convergence_none() {
        let opts = OptimizeOptions::default();
        let r = check_convergence(0.1, 0.1, 0.1, 5, &opts);
        assert!(r.is_none());
    }

    #[test]
    fn test_is_converged() {
        assert!(ConvergenceReason::Gradient { grad_norm: 1e-9 }.is_converged());
        assert!(!ConvergenceReason::MaxIterations { iterations: 1000 }.is_converged());
        assert!(!ConvergenceReason::LineSearchFailed {
            message: "failed".to_string()
        }
        .is_converged());
    }

    #[test]
    fn test_priority() {
        // When gradient and step both below tol, gradient wins (first in order)
        let opts = OptimizeOptions::default();
        let r = check_convergence(1e-9, 1e-9, 1e-13, 5, &opts);
        match r.unwrap() {
            ConvergenceReason::Gradient { .. } => {}
            _ => panic!("Expected Gradient (priority)"),
        }
    }
}
