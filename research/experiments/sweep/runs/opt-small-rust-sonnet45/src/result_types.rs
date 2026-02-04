/// result-types: Shared types and convergence logic for optimization algorithms

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
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_grad_tol(mut self, grad_tol: f64) -> Self {
        self.grad_tol = grad_tol;
        self
    }

    pub fn with_step_tol(mut self, step_tol: f64) -> Self {
        self.step_tol = step_tol;
        self
    }

    pub fn with_func_tol(mut self, func_tol: f64) -> Self {
        self.func_tol = func_tol;
        self
    }

    pub fn with_max_iterations(mut self, max_iterations: usize) -> Self {
        self.max_iterations = max_iterations;
        self
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
                format!("Converged: gradient norm {} below tolerance", grad_norm)
            }
            ConvergenceReason::Step { step_norm } => {
                format!("Converged: step norm {} below tolerance", step_norm)
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
        return Some(ConvergenceReason::MaxIterations { iterations: iteration });
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
    fn test_default_options_with_override() {
        let opts = OptimizeOptions::default().with_grad_tol(1e-4);
        assert_eq!(opts.grad_tol, 1e-4);
        assert_eq!(opts.step_tol, 1e-8);
        assert_eq!(opts.func_tol, 1e-12);
        assert_eq!(opts.max_iterations, 1000);
    }

    #[test]
    fn test_check_convergence_gradient() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(1e-9, 0.1, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
    }

    #[test]
    fn test_check_convergence_step() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 1e-9, 0.1, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Step { .. })));
    }

    #[test]
    fn test_check_convergence_function() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 0.1, 1e-13, 5, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Function { .. })));
    }

    #[test]
    fn test_check_convergence_max_iterations() {
        let opts = OptimizeOptions::default();
        let reason = check_convergence(0.1, 0.1, 0.1, 1000, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::MaxIterations { .. })));
    }

    #[test]
    fn test_check_convergence_none() {
        let opts = OptimizeOptions::default();
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
            message: "test".to_string(),
        };
        assert!(!reason.is_converged());
    }

    #[test]
    fn test_convergence_priority() {
        let opts = OptimizeOptions::default();
        // All criteria met - should return gradient (highest priority)
        let reason = check_convergence(1e-9, 1e-9, 1e-13, 1000, &opts);
        assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
    }
}
