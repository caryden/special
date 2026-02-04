// finite-diff — Numerical gradient approximation

/// Forward difference gradient
pub fn forward_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let mut grad = vec![0.0; n];
    let fx = f(x);

    for i in 0..n {
        let h = f64::EPSILON.sqrt() * x[i].abs().max(1.0);
        let mut x_perturbed = x.to_vec();
        x_perturbed[i] += h;
        let f_perturbed = f(&x_perturbed);
        grad[i] = (f_perturbed - fx) / h;
    }

    grad
}

/// Central difference gradient (more accurate)
pub fn central_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let mut grad = vec![0.0; n];

    for i in 0..n {
        let h = f64::EPSILON.cbrt() * x[i].abs().max(1.0);

        let mut x_plus = x.to_vec();
        x_plus[i] += h;
        let f_plus = f(&x_plus);

        let mut x_minus = x.to_vec();
        x_minus[i] -= h;
        let f_minus = f(&x_minus);

        grad[i] = (f_plus - f_minus) / (2.0 * h);
    }

    grad
}

/// Factory: create a gradient function with the specified method
pub fn make_gradient(
    f: &'static dyn Fn(&[f64]) -> f64,
    method: Option<&str>,
) -> Box<dyn Fn(&[f64]) -> Vec<f64>> {
    match method {
        Some("central") => Box::new(move |x| central_diff_gradient(f, x)),
        _ => Box::new(move |x| forward_diff_gradient(f, x)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sphere(x: &[f64]) -> f64 {
        x.iter().map(|xi| xi * xi).sum()
    }

    fn sphere_grad(x: &[f64]) -> Vec<f64> {
        x.iter().map(|xi| 2.0 * xi).collect()
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (1.0 - x0).powi(2) + 100.0 * (x1 - x0 * x0).powi(2)
    }

    fn rosenbrock_grad_analytic(x: &[f64]) -> Vec<f64> {
        let x0 = x[0];
        let x1 = x[1];
        vec![
            -2.0 * (1.0 - x0) - 400.0 * x0 * (x1 - x0 * x0),
            200.0 * (x1 - x0 * x0),
        ]
    }

    fn beale(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (1.5 - x0 + x0 * x1).powi(2)
            + (2.25 - x0 + x0 * x1 * x1).powi(2)
            + (2.625 - x0 + x0 * x1.powi(3)).powi(2)
    }

    fn beale_grad(x: &[f64]) -> Vec<f64> {
        let x0 = x[0];
        let x1 = x[1];
        let t1 = 1.5 - x0 + x0 * x1;
        let t2 = 2.25 - x0 + x0 * x1 * x1;
        let t3 = 2.625 - x0 + x0 * x1.powi(3);
        vec![
            2.0 * t1 * (-1.0 + x1) + 2.0 * t2 * (-1.0 + x1 * x1) + 2.0 * t3 * (-1.0 + x1.powi(3)),
            2.0 * t1 * x0 + 2.0 * t2 * (2.0 * x0 * x1) + 2.0 * t3 * (3.0 * x0 * x1 * x1),
        ]
    }

    fn approx_eq(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.iter()
            .zip(b.iter())
            .all(|(ai, bi)| (ai - bi).abs() < tol)
    }

    #[test]
    fn test_forward_diff_sphere() {
        let x = vec![3.0, 4.0];
        let grad_numerical = forward_diff_gradient(&sphere, &x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-7));
    }

    #[test]
    fn test_forward_diff_sphere_origin() {
        let x = vec![0.0, 0.0];
        let grad_numerical = forward_diff_gradient(&sphere, &x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-7));
    }

    #[test]
    fn test_central_diff_sphere() {
        let x = vec![3.0, 4.0];
        let grad_numerical = central_diff_gradient(&sphere, &x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-9));
    }

    #[test]
    fn test_central_diff_sphere_origin() {
        let x = vec![0.0, 0.0];
        let grad_numerical = central_diff_gradient(&sphere, &x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-10));
    }

    #[test]
    fn test_forward_diff_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let grad_numerical = forward_diff_gradient(&rosenbrock, &x);
        let grad_analytic = rosenbrock_grad_analytic(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-4));
    }

    #[test]
    fn test_central_diff_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let grad_numerical = central_diff_gradient(&rosenbrock, &x);
        let grad_analytic = rosenbrock_grad_analytic(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-7));
    }

    #[test]
    fn test_forward_diff_beale() {
        let x = vec![1.0, 1.0];
        let grad_numerical = forward_diff_gradient(&beale, &x);
        let grad_analytic = beale_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-4));
    }

    #[test]
    fn test_central_diff_beale() {
        let x = vec![1.0, 1.0];
        let grad_numerical = central_diff_gradient(&beale, &x);
        let grad_analytic = beale_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-5));
    }

    #[test]
    fn test_make_gradient_forward() {
        static SPHERE_STATIC: fn(&[f64]) -> f64 = sphere;
        let grad_fn = make_gradient(&SPHERE_STATIC, None);
        let x = vec![3.0, 4.0];
        let grad_numerical = grad_fn(&x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-7));
    }

    #[test]
    fn test_make_gradient_central() {
        static SPHERE_STATIC: fn(&[f64]) -> f64 = sphere;
        let grad_fn = make_gradient(&SPHERE_STATIC, Some("central"));
        let x = vec![3.0, 4.0];
        let grad_numerical = grad_fn(&x);
        let grad_analytic = sphere_grad(&x);
        assert!(approx_eq(&grad_numerical, &grad_analytic, 1e-9));
    }
}
