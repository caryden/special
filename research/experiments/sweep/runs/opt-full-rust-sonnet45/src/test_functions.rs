/// Standard optimization test functions with analytic gradients.

pub struct TestFunction {
    pub name: &'static str,
    pub dimensions: usize,
    pub f: fn(&[f64]) -> f64,
    pub gradient: fn(&[f64]) -> Vec<f64>,
    pub minimum_at: Vec<f64>,
    pub minimum_value: f64,
    pub starting_point: Vec<f64>,
}

pub fn sphere() -> TestFunction {
    TestFunction {
        name: "Sphere",
        dimensions: 2,
        f: |x| x[0] * x[0] + x[1] * x[1],
        gradient: |x| vec![2.0 * x[0], 2.0 * x[1]],
        minimum_at: vec![0.0, 0.0],
        minimum_value: 0.0,
        starting_point: vec![5.0, 5.0],
    }
}

pub fn booth() -> TestFunction {
    TestFunction {
        name: "Booth",
        dimensions: 2,
        f: |x| {
            let a = x[0] + 2.0 * x[1] - 7.0;
            let b = 2.0 * x[0] + x[1] - 5.0;
            a * a + b * b
        },
        gradient: |x| {
            let a = x[0] + 2.0 * x[1] - 7.0;
            let b = 2.0 * x[0] + x[1] - 5.0;
            vec![2.0 * a + 4.0 * b, 4.0 * a + 2.0 * b]
        },
        minimum_at: vec![1.0, 3.0],
        minimum_value: 0.0,
        starting_point: vec![0.0, 0.0],
    }
}

pub fn rosenbrock() -> TestFunction {
    TestFunction {
        name: "Rosenbrock",
        dimensions: 2,
        f: |x| {
            let a = 1.0 - x[0];
            let b = x[1] - x[0] * x[0];
            a * a + 100.0 * b * b
        },
        gradient: |x| {
            let dx = -2.0 * (1.0 - x[0]) - 400.0 * x[0] * (x[1] - x[0] * x[0]);
            let dy = 200.0 * (x[1] - x[0] * x[0]);
            vec![dx, dy]
        },
        minimum_at: vec![1.0, 1.0],
        minimum_value: 0.0,
        starting_point: vec![-1.2, 1.0],
    }
}

pub fn beale() -> TestFunction {
    TestFunction {
        name: "Beale",
        dimensions: 2,
        f: |x| {
            let a = 1.5 - x[0] + x[0] * x[1];
            let b = 2.25 - x[0] + x[0] * x[1] * x[1];
            let c = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
            a * a + b * b + c * c
        },
        gradient: |x| {
            let y = x[1];
            let y2 = y * y;
            let y3 = y2 * y;
            let a = 1.5 - x[0] + x[0] * y;
            let b = 2.25 - x[0] + x[0] * y2;
            let c = 2.625 - x[0] + x[0] * y3;
            let da_dx = -1.0 + y;
            let db_dx = -1.0 + y2;
            let dc_dx = -1.0 + y3;
            let da_dy = x[0];
            let db_dy = 2.0 * x[0] * y;
            let dc_dy = 3.0 * x[0] * y2;
            vec![
                2.0 * a * da_dx + 2.0 * b * db_dx + 2.0 * c * dc_dx,
                2.0 * a * da_dy + 2.0 * b * db_dy + 2.0 * c * dc_dy,
            ]
        },
        minimum_at: vec![3.0, 0.5],
        minimum_value: 0.0,
        starting_point: vec![0.0, 0.0],
    }
}

pub fn himmelblau() -> TestFunction {
    TestFunction {
        name: "Himmelblau",
        dimensions: 2,
        f: |x| {
            let a = x[0] * x[0] + x[1] - 11.0;
            let b = x[0] + x[1] * x[1] - 7.0;
            a * a + b * b
        },
        gradient: |x| {
            let a = x[0] * x[0] + x[1] - 11.0;
            let b = x[0] + x[1] * x[1] - 7.0;
            vec![4.0 * x[0] * a + 2.0 * b, 2.0 * a + 4.0 * x[1] * b]
        },
        minimum_at: vec![3.0, 2.0],
        minimum_value: 0.0,
        starting_point: vec![0.0, 0.0],
    }
}

pub fn himmelblau_minima() -> Vec<[f64; 2]> {
    vec![
        [3.0, 2.0],
        [-2.805118, 3.131312],
        [-3.779310, -3.283186],
        [3.584428, -1.848126],
    ]
}

pub fn goldstein_price() -> TestFunction {
    TestFunction {
        name: "Goldstein-Price",
        dimensions: 2,
        f: |x| {
            let x1 = x[0];
            let x2 = x[1];
            let a = 1.0 + (x1 + x2 + 1.0).powi(2)
                * (19.0 - 14.0 * x1 + 3.0 * x1 * x1 - 14.0 * x2 + 6.0 * x1 * x2
                    + 3.0 * x2 * x2);
            let b = 30.0 + (2.0 * x1 - 3.0 * x2).powi(2)
                * (18.0 - 32.0 * x1 + 12.0 * x1 * x1 + 48.0 * x2 - 36.0 * x1 * x2
                    + 27.0 * x2 * x2);
            a * b
        },
        gradient: |x| {
            let x1 = x[0];
            let x2 = x[1];
            let s = x1 + x2 + 1.0;
            let q = 19.0 - 14.0 * x1 + 3.0 * x1 * x1 - 14.0 * x2 + 6.0 * x1 * x2
                + 3.0 * x2 * x2;
            let a = 1.0 + s * s * q;
            let t = 2.0 * x1 - 3.0 * x2;
            let r = 18.0 - 32.0 * x1 + 12.0 * x1 * x1 + 48.0 * x2 - 36.0 * x1 * x2
                + 27.0 * x2 * x2;
            let b = 30.0 + t * t * r;

            let dq_dx1 = -14.0 + 6.0 * x1 + 6.0 * x2;
            let dq_dx2 = -14.0 + 6.0 * x1 + 6.0 * x2;
            let da_dx1 = 2.0 * s * q + s * s * dq_dx1;
            let da_dx2 = 2.0 * s * q + s * s * dq_dx2;

            let dr_dx1 = -32.0 + 24.0 * x1 - 36.0 * x2;
            let dr_dx2 = 48.0 - 36.0 * x1 + 54.0 * x2;
            let db_dx1 = 2.0 * t * 2.0 * r + t * t * dr_dx1;
            let db_dx2 = 2.0 * t * (-3.0) * r + t * t * dr_dx2;

            vec![da_dx1 * b + a * db_dx1, da_dx2 * b + a * db_dx2]
        },
        minimum_at: vec![0.0, -1.0],
        minimum_value: 3.0,
        starting_point: vec![0.0, -0.5],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    #[test]
    fn test_sphere_at_minimum() {
        let tf = sphere();
        assert_eq!((tf.f)(&tf.minimum_at), 0.0);
        let g = (tf.gradient)(&tf.minimum_at);
        assert_eq!(g, vec![0.0, 0.0]);
    }

    #[test]
    fn test_booth_at_minimum() {
        let tf = booth();
        assert!(approx_eq((tf.f)(&tf.minimum_at), 0.0, 1e-10));
        let g = (tf.gradient)(&tf.minimum_at);
        let gnorm: f64 = g.iter().map(|x| x * x).sum::<f64>().sqrt();
        assert!(gnorm < 1e-10);
    }

    #[test]
    fn test_rosenbrock_at_minimum() {
        let tf = rosenbrock();
        assert_eq!((tf.f)(&tf.minimum_at), 0.0);
        let g = (tf.gradient)(&tf.minimum_at);
        assert_eq!(g, vec![0.0, 0.0]);
    }

    #[test]
    fn test_beale_at_minimum() {
        let tf = beale();
        assert!(approx_eq((tf.f)(&tf.minimum_at), 0.0, 1e-10));
    }

    #[test]
    fn test_himmelblau_at_minimum() {
        let tf = himmelblau();
        assert!(approx_eq((tf.f)(&tf.minimum_at), 0.0, 1e-10));
    }

    #[test]
    fn test_goldstein_price_at_minimum() {
        let tf = goldstein_price();
        assert!(approx_eq((tf.f)(&tf.minimum_at), 3.0, 1e-10));
    }
}
