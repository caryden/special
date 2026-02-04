/// Brent's method for 1D minimization on a bounded interval.

pub struct Brent1dOptions {
    pub tol: f64,
    pub max_iter: usize,
}

impl Default for Brent1dOptions {
    fn default() -> Self {
        Brent1dOptions {
            tol: f64::EPSILON.sqrt(),
            max_iter: 500,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Brent1dResult {
    pub x: f64,
    pub fun: f64,
    pub iterations: usize,
    pub function_calls: usize,
    pub converged: bool,
    pub message: String,
}

const GOLDEN: f64 = 0.3819660112501051; // (3 - sqrt(5)) / 2

pub fn brent_1d(
    f: &dyn Fn(f64) -> f64,
    a_in: f64,
    b_in: f64,
    options: Option<&Brent1dOptions>,
) -> Brent1dResult {
    let defaults = Brent1dOptions::default();
    let opts = options.unwrap_or(&defaults);

    let mut a = a_in.min(b_in);
    let mut b = a_in.max(b_in);

    let mut function_calls = 0_usize;
    let eval = |x: f64, fc: &mut usize| -> f64 {
        *fc += 1;
        f(x)
    };

    // Initialize
    let mut x = a + GOLDEN * (b - a);
    let mut fx = eval(x, &mut function_calls);
    let mut w = x;
    let mut fw = fx;
    let mut v = x;
    let mut fv = fx;

    let mut d = 0.0_f64;
    let mut e = 0.0_f64;

    for iter in 0..opts.max_iter {
        let midpoint = 0.5 * (a + b);
        let tol1 = opts.tol * x.abs() + 1e-10;
        let tol2 = 2.0 * tol1;

        // Check convergence
        if (x - midpoint).abs() <= tol2 - 0.5 * (b - a) {
            return Brent1dResult {
                x,
                fun: fx,
                iterations: iter,
                function_calls,
                converged: true,
                message: "Converged".to_string(),
            };
        }

        // Try parabolic interpolation
        let mut use_golden = true;
        if e.abs() > tol1 {
            // Parabolic interpolation through v, w, x
            let r = (x - w) * (fx - fv);
            let q = (x - v) * (fx - fw);
            let p = (x - v) * q - (x - w) * r;
            let q = 2.0 * (q - r);
            let (p, q) = if q > 0.0 { (-p, q) } else { (p, -q) };

            if p.abs() < (0.5 * q * e).abs() && p > q * (a - x) && p < q * (b - x) {
                d = p / q;
                let u = x + d;
                if (u - a) < tol2 || (b - u) < tol2 {
                    d = if x < midpoint { tol1 } else { -tol1 };
                }
                use_golden = false;
            }
        }

        if use_golden {
            e = if x < midpoint { b - x } else { a - x };
            d = GOLDEN * e;
        } else {
            e = d;
        }

        // Evaluate new point
        let u = if d.abs() >= tol1 {
            x + d
        } else {
            x + if d > 0.0 { tol1 } else { -tol1 }
        };
        let fu = eval(u, &mut function_calls);

        if fu <= fx {
            if u < x {
                b = x;
            } else {
                a = x;
            }
            v = w;
            fv = fw;
            w = x;
            fw = fx;
            x = u;
            fx = fu;
        } else {
            if u < x {
                a = u;
            } else {
                b = u;
            }
            if fu <= fw || w == x {
                v = w;
                fv = fw;
                w = u;
                fw = fu;
            } else if fu <= fv || v == x || v == w {
                v = u;
                fv = fu;
            }
        }
    }

    Brent1dResult {
        x,
        fun: fx,
        iterations: opts.max_iter,
        function_calls,
        converged: false,
        message: "Maximum iterations exceeded".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quadratic() {
        let r = brent_1d(&|x| x * x, -2.0, 2.0, None);
        assert!(r.converged);
        assert!(r.x.abs() < 1e-8);
        assert!(r.fun < 1e-15);
    }

    #[test]
    fn test_shifted_quadratic() {
        let r = brent_1d(&|x| (x - 3.0) * (x - 3.0), 0.0, 10.0, None);
        assert!(r.converged);
        assert!((r.x - 3.0).abs() < 1e-7);
        assert!(r.fun < 1e-13);
    }

    #[test]
    fn test_sin() {
        let r = brent_1d(&|x| -x.sin(), 0.0, std::f64::consts::PI, None);
        assert!(r.converged);
        assert!((r.x - std::f64::consts::FRAC_PI_2).abs() < 1e-7);
        assert!((r.fun - (-1.0)).abs() < 1e-10);
    }

    #[test]
    fn test_xlogx() {
        let r = brent_1d(&|x| x * x.ln(), 0.1, 3.0, None);
        assert!(r.converged);
        assert!((r.x - 1.0 / std::f64::consts::E).abs() < 1e-6);
    }

    #[test]
    fn test_abs() {
        let r = brent_1d(&|x| x.abs(), -3.0, 2.0, None);
        assert!(r.converged);
        assert!(r.x.abs() < 1e-7);
    }

    #[test]
    fn test_reversed_bracket() {
        let r = brent_1d(&|x| x * x, 2.0, -2.0, None);
        assert!(r.converged);
        assert!(r.x.abs() < 1e-8);
    }

    #[test]
    fn test_max_iter() {
        let opts = Brent1dOptions {
            max_iter: 3,
            tol: 1e-15,
        };
        let r = brent_1d(&|x| x * x, -100.0, 100.0, Some(&opts));
        assert!(!r.converged);
        assert_eq!(r.message, "Maximum iterations exceeded");
    }
}
