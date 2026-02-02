use nelder_mead::nelder_mead::{nelder_mead, NelderMeadOptions};
use nelder_mead::result_types::{
    check_convergence, ConvergenceReason, OptimizeOptions,
};
use nelder_mead::vec_ops;

// ============================================================================
// Test functions for optimization
// ============================================================================

/// Sphere: f(x) = sum(x_i^2). Minimum at origin.
fn sphere(x: &[f64]) -> f64 {
    x.iter().map(|xi| xi * xi).sum()
}

/// Booth: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2. Minimum at (1, 3).
fn booth(x: &[f64]) -> f64 {
    let (a, b) = (x[0], x[1]);
    (a + 2.0 * b - 7.0).powi(2) + (2.0 * a + b - 5.0).powi(2)
}

/// Beale: f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2.
/// Minimum at (3, 0.5).
fn beale(x: &[f64]) -> f64 {
    let (a, b) = (x[0], x[1]);
    (1.5 - a + a * b).powi(2)
        + (2.25 - a + a * b * b).powi(2)
        + (2.625 - a + a * b * b * b).powi(2)
}

/// Rosenbrock: f(x,y) = (1-x)^2 + 100(y - x^2)^2. Minimum at (1, 1).
fn rosenbrock(x: &[f64]) -> f64 {
    let (a, b) = (x[0], x[1]);
    (1.0 - a).powi(2) + 100.0 * (b - a * a).powi(2)
}

/// Himmelblau: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2.
/// Four minima, all with f = 0.
fn himmelblau(x: &[f64]) -> f64 {
    let (a, b) = (x[0], x[1]);
    (a * a + b - 11.0).powi(2) + (a + b * b - 7.0).powi(2)
}

// ============================================================================
// vec_ops tests — all test vectors from spec
// ============================================================================

#[test]
fn test_dot_basic() {
    assert_eq!(vec_ops::dot(&[1.0, 2.0, 3.0], &[4.0, 5.0, 6.0]), 32.0);
}

#[test]
fn test_dot_zero() {
    assert_eq!(vec_ops::dot(&[0.0, 0.0], &[1.0, 1.0]), 0.0);
}

#[test]
fn test_norm_3_4() {
    assert_eq!(vec_ops::norm(&[3.0, 4.0]), 5.0);
}

#[test]
fn test_norm_zero() {
    assert_eq!(vec_ops::norm(&[0.0, 0.0, 0.0]), 0.0);
}

#[test]
fn test_norm_inf_basic() {
    assert_eq!(vec_ops::norm_inf(&[1.0, -3.0, 2.0]), 3.0);
}

#[test]
fn test_norm_inf_zero() {
    assert_eq!(vec_ops::norm_inf(&[0.0, 0.0]), 0.0);
}

#[test]
fn test_scale_basic() {
    assert_eq!(vec_ops::scale(&[1.0, 2.0], 3.0), vec![3.0, 6.0]);
}

#[test]
fn test_scale_zero() {
    assert_eq!(vec_ops::scale(&[1.0, 2.0], 0.0), vec![0.0, 0.0]);
}

#[test]
fn test_add() {
    assert_eq!(vec_ops::add(&[1.0, 2.0], &[3.0, 4.0]), vec![4.0, 6.0]);
}

#[test]
fn test_sub() {
    assert_eq!(vec_ops::sub(&[3.0, 4.0], &[1.0, 2.0]), vec![2.0, 2.0]);
}

#[test]
fn test_negate() {
    assert_eq!(vec_ops::negate(&[1.0, -2.0]), vec![-1.0, 2.0]);
}

#[test]
fn test_clone_vec() {
    let original = vec![1.0, 2.0];
    let cloned = vec_ops::clone_vec(&original);
    assert_eq!(cloned, vec![1.0, 2.0]);
    // Verify it's a distinct allocation (modifying clone doesn't affect original)
    let mut cloned_mut = cloned;
    cloned_mut[0] = 99.0;
    assert_eq!(original[0], 1.0);
}

#[test]
fn test_zeros() {
    assert_eq!(vec_ops::zeros(3), vec![0.0, 0.0, 0.0]);
}

#[test]
fn test_add_scaled() {
    assert_eq!(
        vec_ops::add_scaled(&[1.0, 2.0], &[3.0, 4.0], 2.0),
        vec![7.0, 10.0]
    );
}

// Purity checks
#[test]
fn test_add_purity() {
    let a = vec![1.0, 2.0];
    let b = vec![3.0, 4.0];
    let _ = vec_ops::add(&a, &b);
    assert_eq!(a, vec![1.0, 2.0]);
    assert_eq!(b, vec![3.0, 4.0]);
}

#[test]
fn test_scale_purity() {
    let v = vec![1.0, 2.0];
    let _ = vec_ops::scale(&v, 5.0);
    assert_eq!(v, vec![1.0, 2.0]);
}

// ============================================================================
// result_types tests — all test vectors from spec
// ============================================================================

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
    let mut opts = OptimizeOptions::default();
    opts.grad_tol = 1e-4;
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
    assert!(matches!(
        reason,
        Some(ConvergenceReason::MaxIterations { .. })
    ));
}

#[test]
fn test_check_convergence_none() {
    let opts = OptimizeOptions::default();
    let reason = check_convergence(0.1, 0.1, 0.1, 5, &opts);
    assert!(reason.is_none());
}

#[test]
fn test_is_converged_gradient() {
    let r = ConvergenceReason::Gradient { grad_norm: 1e-9 };
    assert!(r.is_converged());
}

#[test]
fn test_is_converged_step() {
    let r = ConvergenceReason::Step { step_norm: 1e-9 };
    assert!(r.is_converged());
}

#[test]
fn test_is_converged_function() {
    let r = ConvergenceReason::Function { func_change: 1e-13 };
    assert!(r.is_converged());
}

#[test]
fn test_is_converged_max_iterations() {
    let r = ConvergenceReason::MaxIterations { iterations: 1000 };
    assert!(!r.is_converged());
}

#[test]
fn test_is_converged_line_search_failed() {
    let r = ConvergenceReason::LineSearchFailed {
        message: "test".to_string(),
    };
    assert!(!r.is_converged());
}

// Priority test: when multiple criteria met, gradient wins
#[test]
fn test_convergence_priority() {
    let opts = OptimizeOptions::default();
    // grad_norm < tol AND step_norm < tol => gradient wins
    let reason = check_convergence(1e-9, 1e-9, 1e-13, 1000, &opts);
    assert!(matches!(reason, Some(ConvergenceReason::Gradient { .. })));
}

#[test]
fn test_convergence_message_display() {
    let r = ConvergenceReason::Gradient { grad_norm: 1e-9 };
    let msg = format!("{}", r);
    assert!(msg.contains("gradient norm"));
    assert!(msg.contains("below tolerance"));

    let r = ConvergenceReason::MaxIterations { iterations: 1000 };
    let msg = format!("{}", r);
    assert!(msg.contains("maximum iterations"));
    assert!(msg.contains("1000"));
}

// ============================================================================
// nelder_mead optimization tests — test vectors from spec
// ============================================================================

#[test]
fn test_sphere() {
    let result = nelder_mead(sphere, &[5.0, 5.0], None);
    assert!(result.converged, "Sphere should converge: {}", result.message);
    assert!(result.fun < 1e-6, "Sphere fun={} should be < 1e-6", result.fun);
    assert!(
        (result.x[0]).abs() < 1e-3 && (result.x[1]).abs() < 1e-3,
        "Sphere x={:?} should be near [0,0]",
        result.x
    );
}

#[test]
fn test_booth() {
    let result = nelder_mead(booth, &[0.0, 0.0], None);
    assert!(result.converged, "Booth should converge: {}", result.message);
    assert!(result.fun < 1e-6, "Booth fun={} should be < 1e-6", result.fun);
    assert!(
        (result.x[0] - 1.0).abs() < 1e-3 && (result.x[1] - 3.0).abs() < 1e-3,
        "Booth x={:?} should be near [1,3]",
        result.x
    );
}

#[test]
fn test_beale() {
    let mut opts = NelderMeadOptions::default();
    opts.optimize.max_iterations = 5000;
    let result = nelder_mead(beale, &[0.0, 0.0], Some(opts));
    assert!(result.converged, "Beale should converge: {}", result.message);
    assert!(result.fun < 1e-6, "Beale fun={} should be < 1e-6", result.fun);
}

#[test]
fn test_rosenbrock() {
    let mut opts = NelderMeadOptions::default();
    opts.optimize.max_iterations = 5000;
    opts.optimize.func_tol = 1e-14;
    opts.optimize.step_tol = 1e-10;
    let result = nelder_mead(rosenbrock, &[-1.2, 1.0], Some(opts));
    assert!(
        result.converged,
        "Rosenbrock should converge: {}",
        result.message
    );
    assert!(
        result.fun < 1e-6,
        "Rosenbrock fun={} should be < 1e-6",
        result.fun
    );
    assert!(
        (result.x[0] - 1.0).abs() < 1e-3 && (result.x[1] - 1.0).abs() < 1e-3,
        "Rosenbrock x={:?} should be near [1,1]",
        result.x
    );
}

#[test]
fn test_himmelblau() {
    let result = nelder_mead(himmelblau, &[0.0, 0.0], None);
    assert!(
        result.converged,
        "Himmelblau should converge: {}",
        result.message
    );
    assert!(
        result.fun < 1e-6,
        "Himmelblau fun={} should be < 1e-6",
        result.fun
    );
    // Should converge to one of the four known minima:
    // (3, 2), (-2.805118, 3.131312), (-3.779310, -3.283186), (3.584428, -1.848126)
    let known_minima = [
        (3.0, 2.0),
        (-2.805118, 3.131312),
        (-3.779310, -3.283186),
        (3.584428, -1.848126),
    ];
    let close_to_known = known_minima.iter().any(|(mx, my)| {
        (result.x[0] - mx).abs() < 0.01 && (result.x[1] - my).abs() < 0.01
    });
    assert!(
        close_to_known,
        "Himmelblau x={:?} should be near one of the four known minima",
        result.x
    );
}

// ============================================================================
// Behavioral tests from spec
// ============================================================================

#[test]
fn test_respects_max_iterations() {
    let mut opts = NelderMeadOptions::default();
    opts.optimize.max_iterations = 5;
    let result = nelder_mead(rosenbrock, &[-1.2, 1.0], Some(opts));
    assert!(result.iterations <= 5, "iterations={} should be <= 5", result.iterations);
    assert!(!result.converged, "Should not converge in 5 iterations");
}

#[test]
fn test_gradient_calls_always_zero() {
    let result = nelder_mead(sphere, &[5.0, 5.0], None);
    assert_eq!(result.gradient_calls, 0);
    assert!(result.gradient.is_none());
}

#[test]
fn test_gradient_calls_zero_for_rosenbrock() {
    let result = nelder_mead(rosenbrock, &[-1.2, 1.0], None);
    assert_eq!(result.gradient_calls, 0);
    assert!(result.gradient.is_none());
}
