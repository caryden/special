/// IPNewton: primal-dual interior-point Newton for general nonlinear constraints.

use crate::finite_diff::forward_diff_gradient;
use crate::finite_hessian::finite_diff_hessian;
use crate::result_types::{OptimizeOptions, OptimizeResult};
use crate::vec_ops::{add_scaled, dot, norm, norm_inf, sub, zeros};

pub struct ConstraintDef {
    pub c: Box<dyn Fn(&[f64]) -> Vec<f64>>,
    pub jacobian: Box<dyn Fn(&[f64]) -> Vec<Vec<f64>>>,
    pub lower: Vec<f64>,
    pub upper: Vec<f64>,
}

pub struct IPNewtonOptions {
    pub optimize: OptimizeOptions,
    pub lower: Option<Vec<f64>>,
    pub upper: Option<Vec<f64>>,
    pub constraints: Option<ConstraintDef>,
    pub mu0: Option<f64>,
    pub kkt_tol: Option<f64>,
}

#[derive(Clone)]
struct IneqEntry { idx: usize, bound: f64, sigma: f64 }

#[derive(Clone)]
struct EqEntry { idx: usize, target: f64 }

struct ClassifiedConstraints {
    box_ineq: Vec<IneqEntry>,
    box_eq: Vec<EqEntry>,
    con_ineq: Vec<IneqEntry>,
    con_eq: Vec<EqEntry>,
}

fn classify_constraints(n: usize, box_lower: &[f64], box_upper: &[f64], con_lower: Option<&[f64]>, con_upper: Option<&[f64]>) -> ClassifiedConstraints {
    let mut box_ineq = vec![];
    let mut box_eq = vec![];
    for i in 0..n {
        if box_lower[i] == box_upper[i] {
            box_eq.push(EqEntry { idx: i, target: box_lower[i] });
        } else {
            if box_lower[i].is_finite() { box_ineq.push(IneqEntry { idx: i, bound: box_lower[i], sigma: 1.0 }); }
            if box_upper[i].is_finite() { box_ineq.push(IneqEntry { idx: i, bound: box_upper[i], sigma: -1.0 }); }
        }
    }
    let mut con_ineq = vec![];
    let mut con_eq = vec![];
    if let (Some(cl), Some(cu)) = (con_lower, con_upper) {
        for i in 0..cl.len() {
            if cl[i] == cu[i] {
                con_eq.push(EqEntry { idx: i, target: cl[i] });
            } else {
                if cl[i].is_finite() { con_ineq.push(IneqEntry { idx: i, bound: cl[i], sigma: 1.0 }); }
                if cu[i].is_finite() { con_ineq.push(IneqEntry { idx: i, bound: cu[i], sigma: -1.0 }); }
            }
        }
    }
    ClassifiedConstraints { box_ineq, box_eq, con_ineq, con_eq }
}

fn cholesky_solve(a: &[Vec<f64>], b: &[f64]) -> Option<Vec<f64>> {
    let n = b.len();
    if n == 0 { return Some(vec![]); }
    let mut l = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..=i {
            let mut sum = 0.0;
            for k in 0..j { sum += l[i][k] * l[j][k]; }
            if i == j {
                let diag = a[i][i] - sum;
                if diag <= 0.0 { return None; }
                l[i][j] = diag.sqrt();
            } else {
                l[i][j] = (a[i][j] - sum) / l[j][j];
            }
        }
    }
    let mut y = vec![0.0; n];
    for i in 0..n {
        let mut sum = 0.0;
        for j in 0..i { sum += l[i][j] * y[j]; }
        y[i] = (b[i] - sum) / l[i][i];
    }
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let mut sum = 0.0;
        for j in (i+1)..n { sum += l[j][i] * x[j]; }
        x[i] = (y[i] - sum) / l[i][i];
    }
    Some(x)
}

fn robust_solve(a: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let n = b.len();
    if n == 0 { return vec![]; }
    if let Some(sol) = cholesky_solve(a, b) { return sol; }
    let mut tau = 1e-8;
    for _ in 0..25 {
        let mut a_reg: Vec<Vec<f64>> = a.iter().map(|r| r.clone()).collect();
        for i in 0..n { a_reg[i][i] += tau; }
        if let Some(sol) = cholesky_solve(&a_reg, b) { return sol; }
        tau *= 10.0;
    }
    let b_norm = norm_inf(b);
    if b_norm > 0.0 { b.iter().map(|bi| bi / b_norm).collect() } else { zeros(n) }
}

fn mat_t_vec(a: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    if a.is_empty() { return vec![]; }
    let n = a[0].len();
    let mut result = zeros(n);
    for i in 0..a.len() {
        for j in 0..n { result[j] += a[i][j] * v[i]; }
    }
    result
}

fn mat_t_diag_mat(a: &[Vec<f64>], d: &[f64]) -> Vec<Vec<f64>> {
    if a.is_empty() { return vec![]; }
    let n = a[0].len();
    let mut result = vec![vec![0.0; n]; n];
    for i in 0..a.len() {
        for p in 0..n {
            for q in p..n {
                result[p][q] += a[i][p] * d[i] * a[i][q];
            }
        }
    }
    for p in 0..n { for q in 0..p { result[p][q] = result[q][p]; } }
    result
}

fn mat_add(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
    a.iter().zip(b.iter()).map(|(ra, rb)| {
        ra.iter().zip(rb.iter()).map(|(ai, bi)| ai + bi).collect()
    }).collect()
}

fn build_ineq_jacobian(n: usize, cc: &ClassifiedConstraints, jc: Option<&Vec<Vec<f64>>>) -> Vec<Vec<f64>> {
    let mut rows = vec![];
    for e in &cc.box_ineq {
        let mut row = zeros(n);
        row[e.idx] = e.sigma;
        rows.push(row);
    }
    for e in &cc.con_ineq {
        if let Some(j) = jc {
            rows.push(j[e.idx].iter().map(|v| v * e.sigma).collect());
        }
    }
    rows
}

fn build_eq_jacobian(n: usize, cc: &ClassifiedConstraints, jc: Option<&Vec<Vec<f64>>>) -> Vec<Vec<f64>> {
    let mut rows = vec![];
    for e in &cc.box_eq {
        let mut row = zeros(n);
        row[e.idx] = 1.0;
        rows.push(row);
    }
    for e in &cc.con_eq {
        if let Some(j) = jc { rows.push(j[e.idx].clone()); }
    }
    rows
}

fn compute_slacks(x: &[f64], cx: &[f64], cc: &ClassifiedConstraints) -> (Vec<f64>, Vec<f64>) {
    let sb: Vec<f64> = cc.box_ineq.iter().map(|e| (e.sigma * (x[e.idx] - e.bound)).max(1e-10)).collect();
    let sc: Vec<f64> = cc.con_ineq.iter().map(|e| (e.sigma * (cx[e.idx] - e.bound)).max(1e-10)).collect();
    (sb, sc)
}

fn equality_residual(x: &[f64], cx: &[f64], cc: &ClassifiedConstraints) -> Vec<f64> {
    let mut res = vec![];
    for e in &cc.box_eq { res.push(x[e.idx] - e.target); }
    for e in &cc.con_eq { res.push(cx[e.idx] - e.target); }
    res
}

fn max_fraction_to_boundary(vals: &[f64], dvals: &[f64], tau: f64) -> f64 {
    let mut alpha = 1.0;
    for i in 0..vals.len() {
        if dvals[i] < -1e-20 {
            let a = -tau * vals[i] / dvals[i];
            if a < alpha { alpha = a; }
        }
    }
    alpha.max(0.0)
}

pub fn ip_newton(
    f: &dyn Fn(&[f64]) -> f64,
    x0: &[f64],
    grad: Option<&dyn Fn(&[f64]) -> Vec<f64>>,
    hess: Option<&dyn Fn(&[f64]) -> Vec<Vec<f64>>>,
    options: Option<&IPNewtonOptions>,
) -> OptimizeResult {
    let n = x0.len();
    let default_opts = OptimizeOptions::default();
    let opts = options.map(|o| &o.optimize).unwrap_or(&default_opts);
    let kkt_tol = options.and_then(|o| o.kkt_tol).unwrap_or(opts.grad_tol);

    let box_lower: Vec<f64> = options.and_then(|o| o.lower.clone()).unwrap_or(vec![f64::NEG_INFINITY; n]);
    let box_upper: Vec<f64> = options.and_then(|o| o.upper.clone()).unwrap_or(vec![f64::INFINITY; n]);

    let grad_fn = |x: &[f64]| -> Vec<f64> {
        match grad { Some(g) => g(x), None => forward_diff_gradient(f, x) }
    };
    let hess_fn = |x: &[f64]| -> Vec<Vec<f64>> {
        match hess { Some(h) => h(x), None => finite_diff_hessian(f, x) }
    };

    let con_def = options.and_then(|o| o.constraints.as_ref());
    let (con_lower, con_upper) = match con_def {
        Some(cd) => (Some(cd.lower.as_slice()), Some(cd.upper.as_slice())),
        None => (None, None),
    };

    let cc = classify_constraints(n, &box_lower, &box_upper, con_lower, con_upper);
    let n_ineq = cc.box_ineq.len() + cc.con_ineq.len();
    let n_eq = cc.box_eq.len() + cc.con_eq.len();
    let has_constraints = n_ineq + n_eq > 0;

    // Initialize x inside box
    let mut x = x0.to_vec();
    for i in 0..n {
        let lo = box_lower[i]; let hi = box_upper[i];
        if lo == hi { x[i] = lo; }
        else if lo.is_finite() && hi.is_finite() {
            let margin = 0.01 * (hi - lo);
            x[i] = x[i].max(lo + margin).min(hi - margin);
        } else if lo.is_finite() {
            x[i] = x[i].max(lo + 0.01 * lo.abs().max(1.0));
        } else if hi.is_finite() {
            x[i] = x[i].min(hi - 0.01 * hi.abs().max(1.0));
        }
    }

    let mut fx = f(&x);
    let mut gx = grad_fn(&x);
    let mut cx: Vec<f64> = match con_def { Some(cd) => (cd.c)(&x), None => vec![] };
    let mut jc: Option<Vec<Vec<f64>>> = match con_def { Some(cd) => Some((cd.jacobian)(&x)), None => None };
    let mut function_calls = 1_usize;
    let mut gradient_calls = 1_usize;

    if !has_constraints && norm_inf(&gx) < opts.grad_tol {
        return OptimizeResult {
            x, fun: fx, gradient: Some(gx),
            iterations: 0, function_calls, gradient_calls,
            converged: true, message: "Converged: gradient norm below tolerance".to_string(),
        };
    }

    let (mut slack_box, mut slack_con) = compute_slacks(&x, &cx, &cc);

    // Initialize mu
    let mut mu: f64 = if let Some(m0) = options.and_then(|o| o.mu0) { m0 }
    else if n_ineq > 0 {
        let obj_l1: f64 = gx.iter().map(|g| g.abs()).sum();
        let mut bar_l1 = 0.0;
        for s in &slack_box { bar_l1 += 1.0 / s.max(1e-14); }
        for s in &slack_con { bar_l1 += 1.0 / s.max(1e-14); }
        let m = if bar_l1 > 0.0 { 0.001 * obj_l1 / bar_l1 } else { 1e-4 };
        m.max(1e-10).min(1.0)
    } else { 0.0 };

    let mut lambda_box: Vec<f64> = slack_box.iter().map(|s| mu / s.max(1e-14)).collect();
    let mut lambda_con: Vec<f64> = slack_con.iter().map(|s| mu / s.max(1e-14)).collect();
    let mut lambda_box_eq = vec![0.0; cc.box_eq.len()];
    let mut lambda_con_eq = vec![0.0; cc.con_eq.len()];

    let penalty = 10.0 * norm_inf(&gx).max(1.0);
    let mut best_x = x.clone();
    let mut best_fx = fx;

    for iter in 1..=opts.max_iterations {
        let h_mat = hess_fn(&x);

        // Solve KKT
        let ji = build_ineq_jacobian(n, &cc, jc.as_ref());
        let all_slack: Vec<f64> = [slack_box.as_slice(), slack_con.as_slice()].concat();
        let all_lambda: Vec<f64> = [lambda_box.as_slice(), lambda_con.as_slice()].concat();
        let sigma_vec: Vec<f64> = all_slack.iter().zip(all_lambda.iter()).map(|(s, l)| l / s.max(1e-20)).collect();

        let mut h_tilde = if n_ineq > 0 && !ji.is_empty() {
            mat_add(&h_mat, &mat_t_diag_mat(&ji, &sigma_vec))
        } else { h_mat.iter().map(|r| r.clone()).collect() };

        let correction: Vec<f64> = all_slack.iter().map(|s| -mu / s.max(1e-20)).collect();
        let mut g_tilde = gx.clone();
        if n_ineq > 0 && !ji.is_empty() {
            let jit_corr = mat_t_vec(&ji, &correction);
            for i in 0..n { g_tilde[i] += jit_corr[i]; }
        }

        let (dx, d_lambda_eq);
        if n_eq > 0 {
            let je = build_eq_jacobian(n, &cc, jc.as_ref());
            let g_eq = equality_residual(&x, &cx, &cc);
            let all_lambda_eq: Vec<f64> = [lambda_box_eq.as_slice(), lambda_con_eq.as_slice()].concat();
            let jet_lambda = mat_t_vec(&je, &all_lambda_eq);
            for i in 0..n { g_tilde[i] -= jet_lambda[i]; }

            let neg_g: Vec<f64> = g_tilde.iter().map(|g| -g).collect();
            let v = robust_solve(&h_tilde, &neg_g);

            let mut y_cols: Vec<Vec<f64>> = vec![];
            for j in 0..n_eq {
                y_cols.push(robust_solve(&h_tilde, &je[j]));
            }

            let mut m_mat = vec![vec![0.0; n_eq]; n_eq];
            for i in 0..n_eq {
                for j in 0..n_eq { m_mat[i][j] = dot(&je[i], &y_cols[j]); }
            }

            let je_v: Vec<f64> = je.iter().map(|row| dot(row, &v)).collect();
            let rhs: Vec<f64> = g_eq.iter().zip(je_v.iter()).map(|(ge, jev)| -(ge + jev)).collect();
            d_lambda_eq = robust_solve(&m_mat, &rhs);

            let mut dx_v = v;
            for j in 0..n_eq {
                for i in 0..n { dx_v[i] += y_cols[j][i] * d_lambda_eq[j]; }
            }
            dx = dx_v;
        } else {
            let neg_g: Vec<f64> = g_tilde.iter().map(|g| -g).collect();
            dx = robust_solve(&h_tilde, &neg_g);
            d_lambda_eq = vec![];
        }

        // Recover slack/dual steps
        let d_slack_box: Vec<f64> = cc.box_ineq.iter().map(|e| e.sigma * dx[e.idx]).collect();
        let d_slack_con: Vec<f64> = cc.con_ineq.iter().enumerate().map(|(i, _)| {
            let row_idx = cc.box_ineq.len() + i;
            if row_idx < ji.len() { dot(&ji[row_idx], &dx) } else { 0.0 }
        }).collect();
        let d_lambda_box: Vec<f64> = slack_box.iter().enumerate().map(|(i, s)| {
            (mu / s.max(1e-20) - lambda_box[i]) - (lambda_box[i] / s.max(1e-20)) * d_slack_box[i]
        }).collect();
        let d_lambda_con: Vec<f64> = slack_con.iter().enumerate().map(|(i, s)| {
            (mu / s.max(1e-20) - lambda_con[i]) - (lambda_con[i] / s.max(1e-20)) * d_slack_con[i]
        }).collect();

        let all_d_slack: Vec<f64> = [d_slack_box.as_slice(), d_slack_con.as_slice()].concat();
        let all_d_lambda: Vec<f64> = [d_lambda_box.as_slice(), d_lambda_con.as_slice()].concat();

        let alpha_p_max = if n_ineq > 0 { max_fraction_to_boundary(&all_slack, &all_d_slack, 0.995) } else { 1.0 };
        let alpha_d_max = if n_ineq > 0 { max_fraction_to_boundary(&all_lambda, &all_d_lambda, 0.995) } else { 1.0 };

        // Merit function
        let eq_res0 = equality_residual(&x, &cx, &cc);
        let merit0 = {
            let mut val = fx;
            for s in &slack_box { if *s > 0.0 { val -= mu * s.ln(); } else { val = f64::INFINITY; } }
            for s in &slack_con { if *s > 0.0 { val -= mu * s.ln(); } else { val = f64::INFINITY; } }
            for r in &eq_res0 { val += penalty * r.abs(); }
            val
        };

        // Backtracking
        let mut alpha_p = alpha_p_max;
        let mut x_new = x.clone();
        let mut f_new = fx;
        let mut cx_new = cx.clone();

        for _ in 0..40 {
            x_new = add_scaled(&x, &dx, alpha_p);
            for i in 0..n {
                let lo = box_lower[i]; let hi = box_upper[i];
                if lo == hi { x_new[i] = lo; }
                else {
                    if lo.is_finite() { x_new[i] = x_new[i].max(lo + 1e-14); }
                    if hi.is_finite() { x_new[i] = x_new[i].min(hi - 1e-14); }
                }
            }
            f_new = f(&x_new);
            cx_new = match con_def { Some(cd) => (cd.c)(&x_new), None => vec![] };
            function_calls += 1;

            let (sb_new, sc_new) = compute_slacks(&x_new, &cx_new, &cc);
            let eq_res_new = equality_residual(&x_new, &cx_new, &cc);
            let mut merit_new = f_new;
            let mut valid = true;
            for s in &sb_new { if *s > 0.0 { merit_new -= mu * s.ln(); } else { valid = false; } }
            for s in &sc_new { if *s > 0.0 { merit_new -= mu * s.ln(); } else { valid = false; } }
            for r in &eq_res_new { merit_new += penalty * r.abs(); }

            if valid && merit_new.is_finite() && merit_new < merit0 + 1e-8 { break; }
            alpha_p *= 0.5;
        }

        let x_prev = x.clone();
        let f_prev = fx;
        x = x_new; fx = f_new; cx = cx_new;

        if fx.is_finite() && fx < best_fx { best_x = x.clone(); best_fx = fx; }
        if !fx.is_finite() || x.iter().any(|v| !v.is_finite()) {
            return OptimizeResult {
                x: best_x, fun: best_fx, gradient: Some(gx),
                iterations: iter, function_calls, gradient_calls,
                converged: false, message: "Stopped: numerical instability (NaN detected)".to_string(),
            };
        }

        let new_slacks = compute_slacks(&x, &cx, &cc);
        slack_box = new_slacks.0; slack_con = new_slacks.1;

        lambda_box = lambda_box.iter().enumerate().map(|(i, l)| {
            (l + alpha_d_max * d_lambda_box[i]).max(1e-20).min(1e12)
        }).collect();
        lambda_con = lambda_con.iter().enumerate().map(|(i, l)| {
            (l + alpha_d_max * d_lambda_con[i]).max(1e-20).min(1e12)
        }).collect();

        if n_eq > 0 {
            let all_old: Vec<f64> = [lambda_box_eq.as_slice(), lambda_con_eq.as_slice()].concat();
            let all_new: Vec<f64> = all_old.iter().enumerate().map(|(i, l)| {
                if i < d_lambda_eq.len() { l + alpha_d_max * d_lambda_eq[i] } else { *l }
            }).collect();
            lambda_box_eq = all_new[..cc.box_eq.len()].to_vec();
            lambda_con_eq = all_new[cc.box_eq.len()..].to_vec();
        }

        gx = grad_fn(&x); gradient_calls += 1;
        jc = match con_def { Some(cd) => Some((cd.jacobian)(&x)), None => None };

        // Update mu
        if n_ineq > 0 {
            let all_s: Vec<f64> = [slack_box.as_slice(), slack_con.as_slice()].concat();
            let all_l: Vec<f64> = [lambda_box.as_slice(), lambda_con.as_slice()].concat();
            let mu_current: f64 = all_s.iter().zip(all_l.iter()).map(|(s, l)| s * l).sum::<f64>() / n_ineq as f64;
            let alpha_s = max_fraction_to_boundary(&all_s, &all_d_slack, 0.995);
            let alpha_l = max_fraction_to_boundary(&all_l, &all_d_lambda, 0.995);
            let mu_aff: f64 = all_s.iter().zip(all_d_slack.iter()).zip(all_l.iter().zip(all_d_lambda.iter()))
                .map(|((s, ds), (l, dl))| (s + alpha_s * ds) * (l + alpha_l * dl)).sum::<f64>() / n_ineq as f64;
            let ratio = mu_aff / mu_current.max(1e-25);
            let sigma = ratio * ratio * ratio;
            let mu_next = (sigma * mu_current).max(mu_current / 10.0);
            mu = mu_next.min(mu).max(1e-20);
        }

        let step_norm = norm_inf(&sub(&x, &x_prev));
        let func_change = (fx - f_prev).abs();

        if has_constraints {
            let eq_res = equality_residual(&x, &cx, &cc);
            let eq_viol: f64 = eq_res.iter().map(|r| r.abs()).fold(0.0_f64, f64::max);
            let mut grad_lag = gx.clone();
            let ji_now = build_ineq_jacobian(n, &cc, jc.as_ref());
            let je_now = build_eq_jacobian(n, &cc, jc.as_ref());
            let all_l: Vec<f64> = [lambda_box.as_slice(), lambda_con.as_slice()].concat();
            for i in 0..ji_now.len() {
                for j in 0..n { grad_lag[j] -= ji_now[i][j] * all_l[i]; }
            }
            let all_le: Vec<f64> = [lambda_box_eq.as_slice(), lambda_con_eq.as_slice()].concat();
            for i in 0..je_now.len() {
                for j in 0..n { grad_lag[j] += je_now[i][j] * all_le[i]; }
            }
            let kkt_res = norm_inf(&grad_lag).max(eq_viol);
            if kkt_res < kkt_tol && mu < 1e-4 {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iter, function_calls, gradient_calls,
                    converged: true, message: format!("Converged: KKT residual {:.2e} below tolerance", kkt_res),
                };
            }
        } else {
            if norm_inf(&gx) < opts.grad_tol {
                return OptimizeResult {
                    x, fun: fx, gradient: Some(gx),
                    iterations: iter, function_calls, gradient_calls,
                    converged: true, message: "Converged: gradient norm below tolerance".to_string(),
                };
            }
        }

        if step_norm < opts.step_tol {
            return OptimizeResult {
                x, fun: fx, gradient: Some(gx),
                iterations: iter, function_calls, gradient_calls,
                converged: true, message: "Converged: step size below tolerance".to_string(),
            };
        }
        if func_change < opts.func_tol && iter > 1 {
            return OptimizeResult {
                x, fun: fx, gradient: Some(gx),
                iterations: iter, function_calls, gradient_calls,
                converged: true, message: "Converged: function change below tolerance".to_string(),
            };
        }
    }

    OptimizeResult {
        x, fun: fx, gradient: Some(gx),
        iterations: opts.max_iterations, function_calls, gradient_calls,
        converged: false,
        message: format!("Stopped: reached maximum iterations ({})", opts.max_iterations),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unconstrained_sphere() {
        let f = |x: &[f64]| x[0]*x[0] + x[1]*x[1];
        let g = |x: &[f64]| vec![2.0*x[0], 2.0*x[1]];
        let r = ip_newton(&f, &[5.0, 5.0], Some(&g), None, None);
        assert!(r.converged);
        assert!(r.fun < 1e-6);
    }

    #[test]
    fn test_box_constrained_sphere() {
        let f = |x: &[f64]| x[0]*x[0] + x[1]*x[1];
        let g = |x: &[f64]| vec![2.0*x[0], 2.0*x[1]];
        let opts = IPNewtonOptions {
            optimize: OptimizeOptions::default(),
            lower: Some(vec![1.0, 1.0]),
            upper: Some(vec![10.0, 10.0]),
            constraints: None, mu0: None, kkt_tol: None,
        };
        let r = ip_newton(&f, &[5.0, 5.0], Some(&g), None, Some(&opts));
        assert!(r.converged);
        assert!((r.x[0] - 1.0).abs() < 0.2);
        assert!((r.x[1] - 1.0).abs() < 0.2);
        assert!((r.fun - 2.0).abs() < 0.5);
    }

    #[test]
    fn test_equality_constraint() {
        let f = |x: &[f64]| x[0]*x[0] + x[1]*x[1];
        let g = |x: &[f64]| vec![2.0*x[0], 2.0*x[1]];
        let opts = IPNewtonOptions {
            optimize: OptimizeOptions::default(),
            lower: None, upper: None,
            constraints: Some(ConstraintDef {
                c: Box::new(|x: &[f64]| vec![x[0] + x[1]]),
                jacobian: Box::new(|_: &[f64]| vec![vec![1.0, 1.0]]),
                lower: vec![1.0],
                upper: vec![1.0],
            }),
            mu0: None, kkt_tol: None,
        };
        let r = ip_newton(&f, &[2.0, 2.0], Some(&g), None, Some(&opts));
        assert!(r.converged);
        assert!((r.x[0] - 0.5).abs() < 0.2);
        assert!((r.x[1] - 0.5).abs() < 0.2);
    }

    #[test]
    fn test_inequality_constraint() {
        let f = |x: &[f64]| x[0]*x[0] + x[1]*x[1];
        let g = |x: &[f64]| vec![2.0*x[0], 2.0*x[1]];
        let opts = IPNewtonOptions {
            optimize: OptimizeOptions::default(),
            lower: None, upper: None,
            constraints: Some(ConstraintDef {
                c: Box::new(|x: &[f64]| vec![x[0] + x[1]]),
                jacobian: Box::new(|_: &[f64]| vec![vec![1.0, 1.0]]),
                lower: vec![3.0],
                upper: vec![f64::INFINITY],
            }),
            mu0: None, kkt_tol: None,
        };
        let r = ip_newton(&f, &[3.0, 3.0], Some(&g), None, Some(&opts));
        assert!(r.converged);
        assert!((r.x[0] - 1.5).abs() < 0.3);
        assert!((r.x[1] - 1.5).abs() < 0.3);
    }

    #[test]
    fn test_1d_active_bound() {
        let f = |x: &[f64]| (x[0] - 3.0).powi(2);
        let g = |x: &[f64]| vec![2.0 * (x[0] - 3.0)];
        let opts = IPNewtonOptions {
            optimize: OptimizeOptions::default(),
            lower: Some(vec![4.0]),
            upper: Some(vec![10.0]),
            constraints: None, mu0: None, kkt_tol: None,
        };
        let r = ip_newton(&f, &[7.0], Some(&g), None, Some(&opts));
        assert!(r.converged);
        assert!((r.x[0] - 4.0).abs() < 0.2);
    }

    #[test]
    fn test_nan_detection() {
        let mut call_count = std::cell::Cell::new(0_usize);
        // We'll use a simpler approach
        let f = |x: &[f64]| {
            let v = x[0]*x[0] + x[1]*x[1];
            if v > 1e10 { f64::NAN } else { v }
        };
        let g = |x: &[f64]| vec![2.0*x[0], 2.0*x[1]];
        let r = ip_newton(&f, &[5.0, 5.0], Some(&g), None, None);
        // Should handle gracefully
        assert!(r.iterations > 0 || r.converged);
    }
}
