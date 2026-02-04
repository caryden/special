// result-types — Shared types and convergence logic

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
        let mut opts = Self::default();
        if let Some(gt) = grad_tol {
            opts.grad_tol = gt;
        }
        if let Some(st) = step_tol {
            opts.step_tol = st;
        }
        if let Some(ft) = func_tol {
            opts.func_tol = ft;
        }
        if let Some(mi) = max_iterations {
            opts.max_iterations = mi;
        }
        opts
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

#[derive(Debug, Clone, PartialEq)]
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
                format!("Converged: step norm {} below tolerance", step_norm)
            }
            ConvergenceReason::Function { func_change } => {
                format!("Converged: function change {} below tolerance", func_change)
            }
            ConvergenceReason::MaxIterations { iterations } => {
                format!("Did not converge: maximum iterations {} reached", iterations)
            }
            ConvergenceReason::LineSearchFailed { message } => {
                format!("Did not converge: {}", message)
            }
        }
    }
}

/// Check convergence criteria in priority order: gradient → step → function → maxIterations
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
    fn test_options_with_overrides() {
        let opts = OptimizeOptions::with_overrides(Some(1e-4), None, None, None);
        assert_eq!(opts.grad_tol, 1e-4);
        assert_eq!(opts.step_tol, 1e-8);
        assert_eq!(opts.func_tol, 1e-12);
        assert_eq!(opts.max_iterations, 1000);
    }

    #[test]
    fn test_convergence_gradient() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(1e-9, 0.1, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
        assert!(reason.unwrap().is_converged());
    }

    #[test]
    fn test_convergence_step() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 1e-9, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Step { .. })));
        assert!(reason.unwrap().is_converged());
    }

    #[test]
    fn test_convergence_function() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 0.1, 1e-13, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Function { .. })));
        assert!(reason.unwrap().is_converged());
    }

    #[test]
    fn test_convergence_max_iterations() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 0.1, 0.1, 1000, &opts);
        assert!(matches!(
            reason,
            Some(ConvergenceReason::MaxIterations { .. })
        ));
        assert!(!reason.unwrap().is_converged());
    }

    #[test]
    fn test_convergence_none() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 0.1, 0.1, 5, &opts);
        assert!(reason.is_none());
    }

    #[test]
    fn test_convergence_priority() {
        // When multiple criteria are met, gradient has priority
        let opts = OptimizeOptions::default();
        let reason = check_convergence(1e-9, 1e-9, 1e-13, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
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
}
