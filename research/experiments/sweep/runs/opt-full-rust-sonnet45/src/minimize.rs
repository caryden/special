/// Minimize: top-level dispatcher for optimization methods.

use crate::bfgs;
use crate::gradient_descent;
use crate::l_bfgs;
use crate::nelder_mead;
use crate::result_types::{OptimizeOptions, OptimizeResult};

#[derive(Debug, Clone, Copy)]
pub enum Method {
    NelderMead,
    GradientDescent,
    Bfgs,
    LBfgs,
}

pub fn minimize(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    method: Option<Method>,
    options: Option<&OptimizeOptions>,
) -> OptimizeResult {
    let method = method.unwrap_or(if grad.is_some() {
        Method::Bfgs
    } else {
        Method::NelderMead
    });

    match method {
        Method::NelderMead => nelder_mead::nelder_mead(f, x0, options),
        Method::GradientDescent => gradient_descent::gradient_descent(f, x0, grad, options),
        Method::Bfgs => bfgs::bfgs(f, x0, grad, options),
        Method::LBfgs => l_bfgs::lbfgs(f, x0, grad, options),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    #[test]
    fn test_default_no_gradient() {
        let tf = sphere();
        let r = minimize(&tf.f, &tf.starting_point, None, None, None);
        // Should use nelder-mead
        assert!(r.converged);
        assert_eq!(r.gradient_calls, 0);
    }

    #[test]
    fn test_default_with_gradient() {
        let tf = sphere();
        let r = minimize(&tf.f, &tf.starting_point, Some(&tf.gradient), None, None);
        // Should use bfgs
        assert!(r.converged);
        assert!(r.gradient_calls > 0);
    }

    #[test]
    fn test_explicit_nelder_mead() {
        let tf = sphere();
        let r = minimize(&tf.f, &tf.starting_point, None, Some(Method::NelderMead), None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_explicit_gd() {
        let tf = sphere();
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::GradientDescent),
            None,
        );
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_explicit_bfgs_rosenbrock() {
        let tf = rosenbrock();
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::Bfgs),
            None,
        );
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_explicit_lbfgs_rosenbrock() {
        let tf = rosenbrock();
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::LBfgs),
            None,
        );
        assert!(r.converged);
        assert!(r.fun < 1e-10);
    }

    #[test]
    fn test_bfgs_no_grad_fd() {
        let tf = sphere();
        let r = minimize(&tf.f, &tf.starting_point, None, Some(Method::Bfgs), None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_all_functions_bfgs() {
        for (tf, tol) in &[
            (sphere(), 1e-6),
            (booth(), 1e-6),
            (rosenbrock(), 1e-6),
            (beale(), 1e-8),
            (himmelblau(), 1e-8),
        ] {
            let r = minimize(
                &tf.f,
                &tf.starting_point,
                Some(&tf.gradient),
                Some(Method::Bfgs),
                None,
            );
            assert!(r.converged, "Failed for {}", tf.name);
            assert!(r.fun < *tol + tf.minimum_value, "Fun too high for {}: {}", tf.name, r.fun);
        }
    }

    #[test]
    fn test_goldstein_price_bfgs() {
        let tf = goldstein_price();
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::Bfgs),
            None,
        );
        assert!(r.converged);
        assert!((r.fun - 3.0).abs() < 1e-4);
    }

    #[test]
    fn test_options_forwarding() {
        let tf = rosenbrock();
        let opts = OptimizeOptions {
            max_iterations: 3,
            ..Default::default()
        };
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::Bfgs),
            Some(&opts),
        );
        assert!(r.iterations <= 3);
    }

    #[test]
    fn test_custom_grad_tol() {
        let tf = sphere();
        let opts = OptimizeOptions {
            grad_tol: 1e-4,
            ..Default::default()
        };
        let r = minimize(
            &tf.f,
            &tf.starting_point,
            Some(&tf.gradient),
            Some(Method::Bfgs),
            Some(&opts),
        );
        assert!(r.converged);
    }
}
