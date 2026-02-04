/// Full Hessian via central differences and Hessian-vector product.

use crate::vec_ops;

const FOURTH_ROOT_EPS: f64 = 1.220703125e-4;

/// Compute the full n×n Hessian matrix via central finite differences.
pub fn finite_diff_hessian(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<Vec<f64>> {
    let n = x.len();
    let mut h_mat = vec![vec![0.0; n]; n];
    let fx = f(x);
    let mut xp = x.to_vec();

    // Per-dimension step sizes
    let h: Vec<f64> = (0..n)
        .map(|i| FOURTH_ROOT_EPS * x[i].abs().max(1.0))
        .collect();

    // Diagonal entries: (f(x+h*ei) - 2*f(x) + f(x-h*ei)) / h^2
    for i in 0..n {
        let orig = xp[i];
        xp[i] = orig + h[i];
        let fp = f(&xp);
        xp[i] = orig - h[i];
        let fm = f(&xp);
        xp[i] = orig;
        h_mat[i][i] = (fp - 2.0 * fx + fm) / (h[i] * h[i]);
    }

    // Off-diagonal entries (upper triangle, then mirror)
    for i in 0..n {
        for j in (i + 1)..n {
            let orig_i = xp[i];
            let orig_j = xp[j];

            xp[i] = orig_i + h[i];
            xp[j] = orig_j + h[j];
            let fpp = f(&xp);

            xp[j] = orig_j - h[j];
            let fpm = f(&xp);

            xp[i] = orig_i - h[i];
            let fmm = f(&xp);

            xp[j] = orig_j + h[j];
            let fmp = f(&xp);

            xp[i] = orig_i;
            xp[j] = orig_j;

            h_mat[i][j] = (fpp - fpm - fmp + fmm) / (4.0 * h[i] * h[j]);
            h_mat[j][i] = h_mat[i][j];
        }
    }

    h_mat
}

/// Approximate Hessian-vector product: Hv ≈ (grad(x + h*v) - grad(x)) / h.
pub fn hessian_vector_product(
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    v: &[f64],
    gx: &[f64],
) -> Vec<f64> {
    let v_norm: f64 = v.iter().map(|vi| vi * vi).sum::<f64>().sqrt();
    let h = FOURTH_ROOT_EPS * v_norm.max(1.0);

    let xph: Vec<f64> = x.iter().zip(v.iter()).map(|(xi, vi)| xi + h * vi).collect();
    let gph = grad(&xph);

    gph.iter()
        .zip(gx.iter())
        .map(|(gp, g0)| (gp - g0) / h)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_functions::*;

    fn approx_mat(a: &[Vec<f64>], expected: &[Vec<f64>], tol: f64) -> bool {
        a.iter().zip(expected.iter()).all(|(row_a, row_e)| {
            row_a
                .iter()
                .zip(row_e.iter())
                .all(|(ai, ei)| (ai - ei).abs() < tol)
        })
    }

    fn approx_vec(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.iter().zip(b.iter()).all(|(ai, bi)| (ai - bi).abs() < tol)
    }

    #[test]
    fn test_sphere_hessian_origin() {
        let tf = sphere();
        let h = finite_diff_hessian(&tf.f, &[0.0, 0.0]);
        assert!(approx_mat(&h, &[vec![2.0, 0.0], vec![0.0, 2.0]], 1e-4));
    }

    #[test]
    fn test_sphere_hessian_nonzero() {
        let tf = sphere();
        let h = finite_diff_hessian(&tf.f, &[5.0, 3.0]);
        assert!(approx_mat(&h, &[vec![2.0, 0.0], vec![0.0, 2.0]], 1e-4));
    }

    #[test]
    fn test_booth_hessian() {
        let tf = booth();
        let h = finite_diff_hessian(&tf.f, &[0.0, 0.0]);
        assert!(approx_mat(&h, &[vec![10.0, 8.0], vec![8.0, 10.0]], 1e-3));
    }

    #[test]
    fn test_rosenbrock_hessian_minimum() {
        let tf = rosenbrock();
        let h = finite_diff_hessian(&tf.f, &[1.0, 1.0]);
        assert!(approx_mat(
            &h,
            &[vec![802.0, -400.0], vec![-400.0, 200.0]],
            1.0
        ));
    }

    #[test]
    fn test_hvp_sphere() {
        let tf = sphere();
        let x = vec![0.0, 0.0];
        let gx = (tf.gradient)(&x);
        let v = vec![1.0, 2.0];
        let hv = hessian_vector_product(&tf.gradient, &x, &v, &gx);
        assert!(approx_vec(&hv, &[2.0, 4.0], 1e-4));
    }

    #[test]
    fn test_hvp_booth() {
        let tf = booth();
        let x = vec![0.0, 0.0];
        let gx = (tf.gradient)(&x);

        let hv1 = hessian_vector_product(&tf.gradient, &x, &[1.0, 0.0], &gx);
        assert!(approx_vec(&hv1, &[10.0, 8.0], 1e-3));

        let hv2 = hessian_vector_product(&tf.gradient, &x, &[1.0, 1.0], &gx);
        assert!(approx_vec(&hv2, &[18.0, 18.0], 1e-3));
    }
}
