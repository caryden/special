/// Numerical gradient approximation via finite differences.

use crate::vec_ops;

/// Forward difference gradient: (f(x+h*ei) - f(x)) / h per component.
/// Step size: h = sqrt(eps) * max(|xi|, 1)
pub fn forward_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let fx = f(x);
    let sqrt_eps = f64::EPSILON.sqrt();
    let mut grad = vec![0.0; n];
    let mut xp = x.to_vec();

    for i in 0..n {
        let h = sqrt_eps * x[i].abs().max(1.0);
        let orig = xp[i];
        xp[i] = orig + h;
        grad[i] = (f(&xp) - fx) / h;
        xp[i] = orig;
    }
    grad
}

/// Central difference gradient: (f(x+h*ei) - f(x-h*ei)) / (2h) per component.
/// Step size: h = eps^(1/3) * max(|xi|, 1)
pub fn central_diff_gradient(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<f64> {
    let n = x.len();
    let cbrt_eps = f64::EPSILON.cbrt();
    let mut grad = vec![0.0; n];
    let mut xp = x.to_vec();

    for i in 0..n {
        let h = cbrt_eps * x[i].abs().max(1.0);
        let orig = xp[i];
        xp[i] = orig + h;
        let fp = f(&xp);
        xp[i] = orig - h;
        let fm = f(&xp);
        grad[i] = (fp - fm) / (2.0 * h);
        xp[i] = orig;
    }
    grad
}

/// Factory: returns a gradient function using the specified method.
/// method = "forward" (default) or "central"
pub fn make_gradient(
    f: impl Fn(&[f64]) -> f64 + 'static,
    method: &str,
) -> Box<dyn Fn(&[f64]) -> Vec<f64>> {
    match method {
        "central" => Box::new(move |x: &[f64]| central_diff_gradient(&f, x)),
        _ => Box::new(move |x: &[f64]| forward_diff_gradient(&f, x)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    fn approx_vec(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.iter().zip(b.iter()).all(|(ai, bi)| (ai - bi).abs() < tol)
    }

    #[test]
    fn test_forward_sphere() {
        let tf = sphere();
        let g = forward_diff_gradient(&tf.f, &[3.0, 4.0]);
        assert!(approx_vec(&g, &[6.0, 8.0], 1e-7));
    }

    #[test]
    fn test_forward_sphere_zero() {
        let tf = sphere();
        let g = forward_diff_gradient(&tf.f, &[0.0, 0.0]);
        assert!(approx_vec(&g, &[0.0, 0.0], 1e-7));
    }

    #[test]
    fn test_central_sphere() {
        let tf = sphere();
        let g = central_diff_gradient(&tf.f, &[3.0, 4.0]);
        assert!(approx_vec(&g, &[6.0, 8.0], 1e-9));
    }

    #[test]
    fn test_forward_rosenbrock() {
        let tf = rosenbrock();
        let g = forward_diff_gradient(&tf.f, &[-1.2, 1.0]);
        assert!(approx_vec(&g, &[-215.6, -88.0], 1e-4));
    }

    #[test]
    fn test_central_rosenbrock() {
        let tf = rosenbrock();
        let g = central_diff_gradient(&tf.f, &[-1.2, 1.0]);
        assert!(approx_vec(&g, &[-215.6, -88.0], 1e-7));
    }

    #[test]
    fn test_forward_beale() {
        // Compare forward diff against analytic gradient
        let tf = beale();
        let point = [1.0, 0.25];
        let analytic = (tf.gradient)(&point);
        let numeric = forward_diff_gradient(&tf.f, &point);
        assert!(approx_vec(&numeric, &analytic, 1e-4));
    }

    #[test]
    fn test_central_beale() {
        // Compare central diff against analytic gradient at minimum
        let tf = beale();
        let g = central_diff_gradient(&tf.f, &[3.0, 0.5]);
        assert!(g[0].abs() < 1e-8);
        assert!(g[1].abs() < 1e-8);
    }

    #[test]
    fn test_make_gradient_forward() {
        let tf = sphere();
        let gf = make_gradient(tf.f, "forward");
        let g = gf(&[3.0, 4.0]);
        assert!(approx_vec(&g, &[6.0, 8.0], 1e-7));
    }

    #[test]
    fn test_make_gradient_central() {
        let tf = sphere();
        let gf = make_gradient(tf.f, "central");
        let g = gf(&[3.0, 4.0]);
        assert!(approx_vec(&g, &[6.0, 8.0], 1e-9));
    }
}
