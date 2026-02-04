// finite-diff: Numerical gradient approximation

use crate::vec_ops::clone_vec;

pub fn forward_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let mut grad = Vec::with_capacity(n);
    let f0 = f(x);

    for i in 0..n {
        let h = f64::EPSILON.sqrt() * x[i].abs().max(1.0);
        let mut x_plus = clone_vec(x);
        x_plus[i] += h;
        let f_plus = f(&x_plus);
        grad.push((f_plus - f0) / h);
    }

    grad
}

pub fn central_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let mut grad = Vec::with_capacity(n);

    for i in 0..n {
        let h = f64::EPSILON.cbrt() * x[i].abs().max(1.0);
        let mut x_plus = clone_vec(x);
        let mut x_minus = clone_vec(x);
        x_plus[i] += h;
        x_minus[i] -= h;
        let f_plus = f(&x_plus);
        let f_minus = f(&x_minus);
        grad.push((f_plus - f_minus) / (2.0 * h));
    }

    grad
}

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
        x.iter().map(|v| v * v).sum()
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let a = 1.0 - x[0];
        let b = x[1] - x[0] * x[0];
        a * a + 100.0 * b * b
    }

    fn beale(x: &[f64]) -> f64 {
        let t1 = 1.5 - x[0] + x[0] * x[1];
        let t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
        let t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
        t1 * t1 + t2 * t2 + t3 * t3
    }

    fn vec_approx_eq(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.iter().zip(b.iter()).all(|(x, y)| (x - y).abs() < tol)
    }

    #[test]
    fn test_forward_diff_sphere() {
        let x = vec![3.0, 4.0];
        let grad = forward_diff_gradient(&sphere, &x);
        let expected = vec![6.0, 8.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-7));
    }

    #[test]
    fn test_forward_diff_sphere_origin() {
        let x = vec![0.0, 0.0];
        let grad = forward_diff_gradient(&sphere, &x);
        let expected = vec![0.0, 0.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-7));
    }

    #[test]
    fn test_forward_diff_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let grad = forward_diff_gradient(&rosenbrock, &x);
        let expected = vec![-215.6, -88.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-4));
    }

    #[test]
    fn test_forward_diff_beale() {
        let x = vec![1.0, 1.0];
        let grad = forward_diff_gradient(&beale, &x);
        let expected = vec![0.0, 27.75];
        assert!(vec_approx_eq(&grad, &expected, 1e-3));
    }

    #[test]
    fn test_central_diff_sphere() {
        let x = vec![3.0, 4.0];
        let grad = central_diff_gradient(&sphere, &x);
        let expected = vec![6.0, 8.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-8));
    }

    #[test]
    fn test_central_diff_sphere_origin() {
        let x = vec![0.0, 0.0];
        let grad = central_diff_gradient(&sphere, &x);
        let expected = vec![0.0, 0.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-10));
    }

    #[test]
    fn test_central_diff_rosenbrock() {
        let x = vec![-1.2, 1.0];
        let grad = central_diff_gradient(&rosenbrock, &x);
        let expected = vec![-215.6, -88.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-7));
    }

    #[test]
    fn test_central_diff_beale() {
        let x = vec![1.0, 1.0];
        let grad = central_diff_gradient(&beale, &x);
        let expected = vec![0.0, 27.75];
        assert!(vec_approx_eq(&grad, &expected, 1e-6));
    }

    #[test]
    fn test_make_gradient_default() {
        static SPHERE: fn(&[f64]) -> f64 = sphere;
        let grad_fn = make_gradient(&SPHERE, None);
        let x = vec![3.0, 4.0];
        let grad = grad_fn(&x);
        let expected = vec![6.0, 8.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-7));
    }

    #[test]
    fn test_make_gradient_central() {
        static SPHERE: fn(&[f64]) -> f64 = sphere;
        let grad_fn = make_gradient(&SPHERE, Some("central"));
        let x = vec![3.0, 4.0];
        let grad = grad_fn(&x);
        let expected = vec![6.0, 8.0];
        assert!(vec_approx_eq(&grad, &expected, 1e-8));
    }
}
