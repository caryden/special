// result-types: Shared types and convergence logic

use std::fmt;

#[derive(Debug, Clone)]
pub struct OptimizeOptions {
    pub grad_tol: f64,
    pub step_tol: f64,
    pub func_tol: f64,
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

impl OptimizeOptions {
    pub fn with_overrides(
        grad_tol: Option<f64>,
        step_tol: Option<f64>,
        func_tol: Option<f64>,
        max_iterations: Option<usize>,
    ) -> Self {
        let defaults = Self::default();
        Self {
            grad_tol: grad_tol.unwrap_or(defaults.grad_tol),
            step_tol: step_tol.unwrap_or(defaults.step_tol),
            func_tol: func_tol.unwrap_or(defaults.func_tol),
            max_iterations: max_iterations.unwrap_or(defaults.max_iterations),
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
        matches!(
            self,
            ConvergenceReason::Gradient { .. }
                | ConvergenceReason::Step { .. }
                | ConvergenceReason::Function { .. }
        )
    }

    pub fn message(&self) -> String {
        match self {
            ConvergenceReason::Gradient { grad_norm } => {
                format!("Converged: gradient norm {} below tolerance", grad_norm)
            }
            ConvergenceReason::Step { step_norm } => {
                format!("Converged: step size {} below tolerance", step_norm)
            }
            ConvergenceReason::Function { func_change } => {
                format!("Converged: function change {} below tolerance", func_change)
            }
            ConvergenceReason::MaxIterations { iterations } => {
                format!("Maximum iterations {} reached", iterations)
            }
            ConvergenceReason::LineSearchFailed { message } => {
                format!("Line search failed: {}", message)
            }
        }
    }
}

impl fmt::Display for ConvergenceReason {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message())
    }
}

pub fn default_options() -> OptimizeOptions {
    OptimizeOptions::default()
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
        return Some(ConvergenceReason::MaxIterations { iterations: iteration });
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_options() {
        let opts = default_options();
        assert_eq!(opts.grad_tol, 1e-8);
        assert_eq!(opts.step_tol, 1e-8);
        assert_eq!(opts.func_tol, 1e-12);
        assert_eq!(opts.max_iterations, 1000);
    }

    #[test]
    fn test_options_with_overrides() {
        let opts = OptimizeOptions::with_overrides(Some(1e-4), None, None, None);
        assert_eq!(opts.grad_tol, 1e-4);
        assert_eq!(opts.step_tol, 1e-8);
        assert_eq!(opts.func_tol, 1e-12);
        assert_eq!(opts.max_iterations, 1000);
    }

    #[test]
    fn test_check_convergence_gradient() {
        let opts = default_options();
        let reason = check_convergence(1e-9, 0.1, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
    }

    #[test]
    fn test_check_convergence_step() {
        let opts = default_options();
        let reason = check_convergence(0.1, 1e-9, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Step { .. })));
    }

    #[test]
    fn test_check_convergence_function() {
        let opts = default_options();
        let reason = check_convergence(0.1, 0.1, 1e-13, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Function { .. })));
    }

    #[test]
    fn test_check_convergence_max_iterations() {
        let opts = default_options();
        let reason = check_convergence(0.1, 0.1, 0.1, 1000, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::MaxIterations { .. })));
    }

    #[test]
    fn test_check_convergence_none() {
        let opts = default_options();
        let reason = check_convergence(0.1, 0.1, 0.1, 5, &opts);
        assert!(reason.is_none());
    }

    #[test]
    fn test_is_converged_gradient() {
        let reason = ConvergenceReason::Gradient { grad_norm: 1e-9 };
        assert!(reason.is_converged());
    }

    #[test]
    fn test_is_converged_max_iterations() {
        let reason = ConvergenceReason::MaxIterations { iterations: 1000 };
        assert!(!reason.is_converged());
    }

    #[test]
    fn test_is_converged_line_search_failed() {
        let reason = ConvergenceReason::LineSearchFailed {
            message: "failed".to_string(),
        };
        assert!(!reason.is_converged());
    }

    #[test]
    fn test_convergence_priority() {
        let opts = default_options();
        // Both gradient and step below tolerance - should return gradient first
        let reason = check_convergence(1e-9, 1e-9, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
    }
}
