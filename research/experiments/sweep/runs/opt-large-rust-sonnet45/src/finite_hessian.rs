// finite-hessian — Numerical Hessian matrix and Hessian-vector products

use crate::vec_ops::{add_scaled, norm};

const FOURTH_ROOT_EPS: f64 = 1.220703125e-4; // f64::EPSILON.powf(0.25)

/// Compute full Hessian matrix via central differences
pub fn finite_diff_hessian(f: &dyn Fn(&[f64]) -> f64, x: &[f64]) -> Vec<Vec<f64>> {
    let n = x.len();
    let mut hessian = vec![vec![0.0; n]; n];
    let fx = f(x);

    // Compute step sizes for each dimension
    let h: Vec<f64> = x.iter().map(|xi| FOURTH_ROOT_EPS * xi.abs().max(1.0)).collect();

    // Diagonal elements
    for i in 0..n {
        let mut x_plus = x.to_vec();
        x_plus[i] += h[i];
        let f_plus = f(&x_plus);

        let mut x_minus = x.to_vec();
        x_minus[i] -= h[i];
        let f_minus = f(&x_minus);

        hessian[i][i] = (f_plus - 2.0 * fx + f_minus) / (h[i] * h[i]);
    }

    // Off-diagonal elements (upper triangle only, then mirror)
    for i in 0..n {
        for j in (i + 1)..n {
            let mut x_pp = x.to_vec();
            x_pp[i] += h[i];
            x_pp[j] += h[j];
            let f_pp = f(&x_pp);

            let mut x_pm = x.to_vec();
            x_pm[i] += h[i];
            x_pm[j] -= h[j];
            let f_pm = f(&x_pm);

            let mut x_mp = x.to_vec();
            x_mp[i] -= h[i];
            x_mp[j] += h[j];
            let f_mp = f(&x_mp);

            let mut x_mm = x.to_vec();
            x_mm[i] -= h[i];
            x_mm[j] -= h[j];
            let f_mm = f(&x_mm);

            let h_ij = (f_pp - f_pm - f_mp + f_mm) / (4.0 * h[i] * h[j]);
            hessian[i][j] = h_ij;
            hessian[j][i] = h_ij; // Symmetry
        }
    }

    hessian
}

/// Compute Hessian-vector product via finite differences of gradient
pub fn hessian_vector_product(
    grad: &dyn Fn(&[f64]) -> Vec<f64>,
    x: &[f64],
    v: &[f64],
    gx: &[f64],
) -> Vec<f64> {
    let v_norm = norm(v);
    let h = FOURTH_ROOT_EPS * v_norm.max(1.0);

    let x_perturbed = add_scaled(x, v, h);
    let g_perturbed = grad(&x_perturbed);

    // (grad(x + h*v) - grad(x)) / h
    g_perturbed
        .iter()
        .zip(gx.iter())
        .map(|(gp, g)| (gp - g) / h)
        .collect()
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

    fn booth(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (x0 + 2.0 * x1 - 7.0).powi(2) + (2.0 * x0 + x1 - 5.0).powi(2)
    }

    fn booth_grad(x: &[f64]) -> Vec<f64> {
        let x0 = x[0];
        let x1 = x[1];
        vec![
            2.0 * (x0 + 2.0 * x1 - 7.0) + 4.0 * (2.0 * x0 + x1 - 5.0),
            4.0 * (x0 + 2.0 * x1 - 7.0) + 2.0 * (2.0 * x0 + x1 - 5.0),
        ]
    }

    fn rosenbrock(x: &[f64]) -> f64 {
        let x0 = x[0];
        let x1 = x[1];
        (1.0 - x0).powi(2) + 100.0 * (x1 - x0 * x0).powi(2)
    }

    fn rosenbrock_grad(x: &[f64]) -> Vec<f64> {
        let x0 = x[0];
        let x1 = x[1];
        vec![
            -2.0 * (1.0 - x0) - 400.0 * x0 * (x1 - x0 * x0),
            200.0 * (x1 - x0 * x0),
        ]
    }

    fn approx_eq_matrix(a: &[Vec<f64>], b: &[Vec<f64>], tol: f64) -> bool {
        a.iter().zip(b.iter()).all(|(row_a, row_b)| {
            row_a
                .iter()
                .zip(row_b.iter())
                .all(|(ai, bi)| (ai - bi).abs() < tol)
        })
    }

    fn approx_eq(a: &[f64], b: &[f64], tol: f64) -> bool {
        a.iter()
            .zip(b.iter())
            .all(|(ai, bi)| (ai - bi).abs() < tol)
    }

    #[test]
    fn test_hessian_sphere_origin() {
        let x = vec![0.0, 0.0];
        let h = finite_diff_hessian(&sphere, &x);
        let expected = vec![vec![2.0, 0.0], vec![0.0, 2.0]];
        assert!(approx_eq_matrix(&h, &expected, 1e-5));
    }

    #[test]
    fn test_hessian_sphere_nonzero() {
        let x = vec![5.0, 3.0];
        let h = finite_diff_hessian(&sphere, &x);
        let expected = vec![vec![2.0, 0.0], vec![0.0, 2.0]];
        assert!(approx_eq_matrix(&h, &expected, 1e-5));
    }

    #[test]
    fn test_hessian_booth() {
        let x = vec![0.0, 0.0];
        let h = finite_diff_hessian(&booth, &x);
        // Booth has constant Hessian [[10, 8], [8, 10]]
        let expected = vec![vec![10.0, 8.0], vec![8.0, 10.0]];
        assert!(approx_eq_matrix(&h, &expected, 1e-4));

        let x2 = vec![1.0, 3.0];
        let h2 = finite_diff_hessian(&booth, &x2);
        assert!(approx_eq_matrix(&h2, &expected, 1e-4));
    }

    #[test]
    fn test_hessian_rosenbrock_minimum() {
        let x = vec![1.0, 1.0];
        let h = finite_diff_hessian(&rosenbrock, &x);
        let expected = vec![vec![802.0, -400.0], vec![-400.0, 200.0]];
        assert!(approx_eq_matrix(&h, &expected, 1.0));
    }

    #[test]
    fn test_hessian_rosenbrock_starting() {
        let x = vec![-1.2, 1.0];
        let h = finite_diff_hessian(&rosenbrock, &x);
        let expected = vec![vec![1330.0, 480.0], vec![480.0, 200.0]];
        assert!(approx_eq_matrix(&h, &expected, 5.0));
    }

    #[test]
    fn test_hessian_vector_product_sphere() {
        let x = vec![3.0, 4.0];
        let gx = sphere_grad(&x);
        let v = vec![1.0, 1.0];
        let hv = hessian_vector_product(&sphere_grad, &x, &v, &gx);
        // H*v = 2*I*v = 2*v
        let expected = vec![2.0, 2.0];
        assert!(approx_eq(&hv, &expected, 1e-5));
    }

    #[test]
    fn test_hessian_vector_product_booth() {
        let x = vec![0.0, 0.0];
        let gx = booth_grad(&x);

        let v = vec![1.0, 0.0];
        let hv = hessian_vector_product(&booth_grad, &x, &v, &gx);
        // H*[1,0] = [10,8]
        let expected = vec![10.0, 8.0];
        assert!(approx_eq(&hv, &expected, 1e-4));

        let v2 = vec![1.0, 1.0];
        let hv2 = hessian_vector_product(&booth_grad, &x, &v2, &gx);
        // H*[1,1] = [18,18]
        let expected2 = vec![18.0, 18.0];
        assert!(approx_eq(&hv2, &expected2, 1e-4));
    }

    #[test]
    fn test_hessian_vector_product_rosenbrock() {
        let x = vec![1.0, 1.0];
        let gx = rosenbrock_grad(&x);
        let v = vec![1.0, 1.0];
        let hv = hessian_vector_product(&rosenbrock_grad, &x, &v, &gx);
        // H*[1,1] = [402,-200]
        let expected = vec![402.0, -200.0];
        assert!(approx_eq(&hv, &expected, 5.0));
    }
}
