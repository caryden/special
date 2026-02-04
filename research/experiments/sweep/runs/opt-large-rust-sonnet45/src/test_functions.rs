// test-functions — Standard optimization test functions

pub fn sphere(x: &[f64]) -> f64 {
    x.iter().map(|xi| xi * xi).sum()
}

pub fn sphere_grad(x: &[f64]) -> Vec<f64> {
    x.iter().map(|xi| 2.0 * xi).collect()
}

pub fn booth(x: &[f64]) -> f64 {
    let x0 = x[0];
    let x1 = x[1];
    (x0 + 2.0 * x1 - 7.0).powi(2) + (2.0 * x0 + x1 - 5.0).powi(2)
}

pub fn booth_grad(x: &[f64]) -> Vec<f64> {
    let x0 = x[0];
    let x1 = x[1];
    vec![
        2.0 * (x0 + 2.0 * x1 - 7.0) + 4.0 * (2.0 * x0 + x1 - 5.0),
        4.0 * (x0 + 2.0 * x1 - 7.0) + 2.0 * (2.0 * x0 + x1 - 5.0),
    ]
}

pub fn rosenbrock(x: &[f64]) -> f64 {
    let x0 = x[0];
    let x1 = x[1];
    (1.0 - x0).powi(2) + 100.0 * (x1 - x0 * x0).powi(2)
}

pub fn rosenbrock_grad(x: &[f64]) -> Vec<f64> {
    let x0 = x[0];
    let x1 = x[1];
    vec![
        -2.0 * (1.0 - x0) - 400.0 * x0 * (x1 - x0 * x0),
        200.0 * (x1 - x0 * x0),
    ]
}

pub fn beale(x: &[f64]) -> f64 {
    let x0 = x[0];
    let x1 = x[1];
    (1.5 - x0 + x0 * x1).powi(2)
        + (2.25 - x0 + x0 * x1 * x1).powi(2)
        + (2.625 - x0 + x0 * x1.powi(3)).powi(2)
}

pub fn beale_grad(x: &[f64]) -> Vec<f64> {
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

pub fn himmelblau(x: &[f64]) -> f64 {
    let x0 = x[0];
    let x1 = x[1];
    (x0 * x0 + x1 - 11.0).powi(2) + (x0 + x1 * x1 - 7.0).powi(2)
}

pub fn himmelblau_grad(x: &[f64]) -> Vec<f64> {
    let x0 = x[0];
    let x1 = x[1];
    vec![
        2.0 * (x0 * x0 + x1 - 11.0) * (2.0 * x0) + 2.0 * (x0 + x1 * x1 - 7.0),
        2.0 * (x0 * x0 + x1 - 11.0) + 2.0 * (x0 + x1 * x1 - 7.0) * (2.0 * x1),
    ]
}

pub fn goldstein_price(x: &[f64]) -> f64 {
    let x0 = x[0];
    let x1 = x[1];
    let a = 1.0
        + (x0 + x1 + 1.0).powi(2)
            * (19.0 - 14.0 * x0 + 3.0 * x0 * x0 - 14.0 * x1 + 6.0 * x0 * x1 + 3.0 * x1 * x1);
    let b = 30.0
        + (2.0 * x0 - 3.0 * x1).powi(2)
            * (18.0 - 32.0 * x0 + 12.0 * x0 * x0 + 48.0 * x1 - 36.0 * x0 * x1 + 27.0 * x1 * x1);
    a * b
}

pub fn goldstein_price_grad(x: &[f64]) -> Vec<f64> {
    let x0 = x[0];
    let x1 = x[1];

    let u = x0 + x1 + 1.0;
    let v = 2.0 * x0 - 3.0 * x1;

    let p1 = 19.0 - 14.0 * x0 + 3.0 * x0 * x0 - 14.0 * x1 + 6.0 * x0 * x1 + 3.0 * x1 * x1;
    let p2 = 18.0 - 32.0 * x0 + 12.0 * x0 * x0 + 48.0 * x1 - 36.0 * x0 * x1 + 27.0 * x1 * x1;

    let a = 1.0 + u * u * p1;
    let b = 30.0 + v * v * p2;

    let dp1_dx0 = -14.0 + 6.0 * x0 + 6.0 * x1;
    let dp1_dx1 = -14.0 + 6.0 * x0 + 6.0 * x1;
    let dp2_dx0 = -32.0 + 24.0 * x0 - 36.0 * x1;
    let dp2_dx1 = 48.0 - 36.0 * x0 + 54.0 * x1;

    let da_dx0 = 2.0 * u * p1 + u * u * dp1_dx0;
    let da_dx1 = 2.0 * u * p1 + u * u * dp1_dx1;
    let db_dx0 = 2.0 * v * 2.0 * p2 + v * v * dp2_dx0;
    let db_dx1 = 2.0 * v * (-3.0) * p2 + v * v * dp2_dx1;

    vec![da_dx0 * b + a * db_dx0, da_dx1 * b + a * db_dx1]
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-10;

    #[test]
    fn test_sphere_minimum() {
        assert_eq!(sphere(&[0.0, 0.0]), 0.0);
        let grad = sphere_grad(&[0.0, 0.0]);
        assert_eq!(grad, vec![0.0, 0.0]);
    }

    #[test]
    fn test_booth_minimum() {
        let x = vec![1.0, 3.0];
        assert!(booth(&x) < 1e-10);
        let grad = booth_grad(&x);
        assert!(grad.iter().all(|g| g.abs() < TOL));
    }

    #[test]
    fn test_rosenbrock_minimum() {
        let x = vec![1.0, 1.0];
        assert!(rosenbrock(&x) < 1e-10);
        let grad = rosenbrock_grad(&x);
        assert!(grad.iter().all(|g| g.abs() < TOL));
    }

    #[test]
    fn test_beale_minimum() {
        let x = vec![3.0, 0.5];
        assert!(beale(&x) < 1e-10);
    }

    #[test]
    fn test_himmelblau_minimum() {
        let x = vec![3.0, 2.0];
        assert!(himmelblau(&x) < 1e-10);
    }

    #[test]
    fn test_goldstein_price_minimum() {
        let x = vec![0.0, -1.0];
        assert!((goldstein_price(&x) - 3.0).abs() < 1e-10);
    }
}
