"""
Primal-dual interior-point Newton for general nonlinear constraints.
"""

import math
from typing import Callable, List, Optional, Tuple

from .vec_ops import dot, norm, norm_inf, sub, zeros, add_scaled
from .result_types import OptimizeResult, default_options
from .finite_diff import forward_diff_gradient
from .finite_hessian import finite_diff_hessian


def _cholesky_solve(A: List[List[float]], b: List[float]) -> Optional[List[float]]:
    n = len(b)
    if n == 0:
        return []
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                diag = A[i][i] - s
                if diag <= 0:
                    return None
                L[i][j] = math.sqrt(diag)
            else:
                L[i][j] = (A[i][j] - s) / L[j][j]
    y = [0.0] * n
    for i in range(n):
        s = sum(L[i][j] * y[j] for j in range(i))
        y[i] = (b[i] - s) / L[i][i]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = sum(L[j][i] * x[j] for j in range(i + 1, n))
        x[i] = (y[i] - s) / L[i][i]
    return x


def _robust_solve(A: List[List[float]], b: List[float]) -> List[float]:
    n = len(b)
    if n == 0:
        return []
    sol = _cholesky_solve(A, b)
    if sol is not None:
        return sol
    tau = 1e-8
    for _ in range(25):
        A_reg = [row[:] for row in A]
        for i in range(n):
            A_reg[i][i] += tau
        sol = _cholesky_solve(A_reg, b)
        if sol is not None:
            return sol
        tau *= 10
    b_norm = norm_inf(b)
    return [bi / b_norm for bi in b] if b_norm > 0 else zeros(n)


def ip_newton(
    f: Callable[[List[float]], float],
    x0: List[float],
    grad: Optional[Callable[[List[float]], List[float]]] = None,
    hess: Optional[Callable[[List[float]], List[List[float]]]] = None,
    lower: Optional[List[float]] = None,
    upper: Optional[List[float]] = None,
    constraints=None,
    mu0: Optional[float] = None,
    kkt_tol: Optional[float] = None,
    grad_tol: float = 1e-8,
    step_tol: float = 1e-8,
    func_tol: float = 1e-12,
    max_iterations: int = 1000,
    **kwargs,
) -> OptimizeResult:
    """Interior-point Newton for constrained optimization."""
    n = len(x0)
    opts = default_options(grad_tol=grad_tol, step_tol=step_tol, func_tol=func_tol,
                           max_iterations=max_iterations)
    kkt_tol_val = kkt_tol if kkt_tol is not None else opts.grad_tol

    box_lower = lower if lower is not None else [float('-inf')] * n
    box_upper = upper if upper is not None else [float('inf')] * n

    grad_fn = grad if grad is not None else (lambda x: forward_diff_gradient(f, x))
    hess_fn = hess if hess is not None else (lambda x: finite_diff_hessian(f, x))
    con_fn = constraints['c'] if constraints else None
    jac_fn = constraints['jacobian'] if constraints else None
    con_lower = constraints['lower'] if constraints else []
    con_upper = constraints['upper'] if constraints else []

    # Classify constraints
    box_ineq = []  # (idx, bound, sigma)
    box_eq = []    # (idx, target)
    for i in range(n):
        if box_lower[i] == box_upper[i]:
            box_eq.append((i, box_lower[i]))
        else:
            if math.isfinite(box_lower[i]):
                box_ineq.append((i, box_lower[i], 1.0))
            if math.isfinite(box_upper[i]):
                box_ineq.append((i, box_upper[i], -1.0))

    con_ineq = []
    con_eq = []
    if constraints:
        m = len(con_lower)
        for i in range(m):
            if con_lower[i] == con_upper[i]:
                con_eq.append((i, con_lower[i]))
            else:
                if math.isfinite(con_lower[i]):
                    con_ineq.append((i, con_lower[i], 1.0))
                if math.isfinite(con_upper[i]):
                    con_ineq.append((i, con_upper[i], -1.0))

    n_ineq = len(box_ineq) + len(con_ineq)
    n_eq = len(box_eq) + len(con_eq)
    has_constraints = n_ineq + n_eq > 0

    # Initialize x inside box
    x = x0[:]
    for i in range(n):
        lo, hi = box_lower[i], box_upper[i]
        if lo == hi:
            x[i] = lo
        elif math.isfinite(lo) and math.isfinite(hi):
            margin = 0.01 * (hi - lo)
            x[i] = max(lo + margin, min(hi - margin, x[i]))
        elif math.isfinite(lo):
            x[i] = max(lo + 0.01 * max(1, abs(lo)), x[i])
        elif math.isfinite(hi):
            x[i] = min(hi - 0.01 * max(1, abs(hi)), x[i])

    fx = f(x)
    gx = grad_fn(x)
    cx = con_fn(x) if con_fn else []
    Jc = jac_fn(x) if jac_fn else None
    function_calls = 1
    gradient_calls = 1

    if not has_constraints and norm_inf(gx) < opts.grad_tol:
        return OptimizeResult(
            x=x[:], fun=fx, gradient=gx[:],
            iterations=0, function_calls=function_calls,
            gradient_calls=gradient_calls, converged=True,
            message="Converged: gradient norm below tolerance",
        )

    # Compute slacks
    def compute_slacks(xv, cxv):
        sb = [max(sigma * (xv[idx] - bound), 1e-10) for idx, bound, sigma in box_ineq]
        sc = [max(sigma * (cxv[idx] - bound), 1e-10) for idx, bound, sigma in con_ineq]
        return sb, sc

    slack_box, slack_con = compute_slacks(x, cx)

    # Initialize mu
    if mu0 is not None:
        mu = mu0
    elif n_ineq > 0:
        obj_l1 = sum(abs(gi) for gi in gx)
        bar_l1 = sum(1.0 / max(s, 1e-14) for s in slack_box) + sum(1.0 / max(s, 1e-14) for s in slack_con)
        mu = 0.001 * obj_l1 / bar_l1 if bar_l1 > 0 else 1e-4
        mu = max(mu, 1e-10)
        mu = min(mu, 1.0)
    else:
        mu = 0.0

    # Initialize duals
    lambda_box = [mu / max(s, 1e-14) for s in slack_box]
    lambda_con = [mu / max(s, 1e-14) for s in slack_con]
    lambda_box_eq = [0.0] * len(box_eq)
    lambda_con_eq = [0.0] * len(con_eq)

    penalty = 10.0 * max(norm_inf(gx), 1.0)
    best_x = x[:]
    best_fx = fx

    def build_ineq_jac(Jc_val):
        rows = []
        for idx, bound, sigma in box_ineq:
            row = zeros(n)
            row[idx] = sigma
            rows.append(row)
        for ci_idx, bound, sigma in con_ineq:
            if Jc_val:
                rows.append([v * sigma for v in Jc_val[ci_idx]])
        return rows

    def build_eq_jac(Jc_val):
        rows = []
        for idx, target in box_eq:
            row = zeros(n)
            row[idx] = 1.0
            rows.append(row)
        for ci_idx, target in con_eq:
            if Jc_val:
                rows.append(Jc_val[ci_idx][:])
        return rows

    def eq_residual(xv, cxv):
        res = []
        for idx, target in box_eq:
            res.append(xv[idx] - target)
        for ci_idx, target in con_eq:
            res.append(cxv[ci_idx] - target)
        return res

    def mat_t_vec(A, v):
        if not A:
            return zeros(n)
        ncols = len(A[0]) if A else 0
        result = zeros(ncols)
        for i in range(len(A)):
            for j in range(ncols):
                result[j] += A[i][j] * v[i]
        return result

    def mat_t_diag_mat(A, d_vec):
        if not A:
            return [[0.0] * n for _ in range(n)]
        ncols = len(A[0])
        result = [[0.0] * ncols for _ in range(ncols)]
        for i in range(len(A)):
            for p in range(ncols):
                for q in range(p, ncols):
                    result[p][q] += A[i][p] * d_vec[i] * A[i][q]
        for p in range(ncols):
            for q in range(p):
                result[p][q] = result[q][p]
        return result

    def merit_fn(fxv, sb, sc, eq_res, mu_val):
        val = fxv
        for s in sb:
            if s > 0:
                val -= mu_val * math.log(s)
            else:
                return float('inf')
        for s in sc:
            if s > 0:
                val -= mu_val * math.log(s)
            else:
                return float('inf')
        for r in eq_res:
            val += penalty * abs(r)
        return val

    def max_frac_boundary(vals, dvals, tau=0.995):
        alpha = 1.0
        for i in range(len(vals)):
            if dvals[i] < -1e-20:
                a = -tau * vals[i] / dvals[i]
                if a < alpha:
                    alpha = a
        return max(alpha, 0.0)

    for iteration in range(1, opts.max_iterations + 1):
        H = hess_fn(x)
        JI = build_ineq_jac(Jc)
        all_slack = slack_box + slack_con
        all_lambda = lambda_box + lambda_con

        sigma_vec = [all_lambda[i] / max(all_slack[i], 1e-20) for i in range(n_ineq)]

        # Htilde = H + JI^T * Sigma * JI
        if n_ineq > 0:
            Ht_addition = mat_t_diag_mat(JI, sigma_vec)
            Htilde = [[H[i][j] + Ht_addition[i][j] for j in range(n)] for i in range(n)]
        else:
            Htilde = [row[:] for row in H]

        correction = [-mu / max(s, 1e-20) for s in all_slack]

        gtilde = gx[:]
        if n_ineq > 0:
            jit_corr = mat_t_vec(JI, correction)
            for i in range(n):
                gtilde[i] += jit_corr[i]

        if n_eq > 0:
            JE = build_eq_jac(Jc)
            g_eq = eq_residual(x, cx)
            all_lambda_eq = lambda_box_eq + lambda_con_eq
            jet_lambda = mat_t_vec(JE, all_lambda_eq)
            for i in range(n):
                gtilde[i] -= jet_lambda[i]

            neg_gt = [-g for g in gtilde]
            v = _robust_solve(Htilde, neg_gt)

            Y = []
            for j in range(n_eq):
                col = JE[j][:]
                Y.append(_robust_solve(Htilde, col))

            M = [[dot(JE[i], Y[j]) for j in range(n_eq)] for i in range(n_eq)]
            JEv = [dot(JE[i], v) for i in range(n_eq)]
            rhs = [-(g_eq[i] + JEv[i]) for i in range(n_eq)]
            d_lambda_eq = _robust_solve(M, rhs)

            dx = v[:]
            for j in range(n_eq):
                for i in range(n):
                    dx[i] += Y[j][i] * d_lambda_eq[j]
        else:
            neg_gt = [-g for g in gtilde]
            dx = _robust_solve(Htilde, neg_gt)
            d_lambda_eq = []

        # Recover slack steps
        d_slack_box = [sigma * dx[idx] for idx, bound, sigma in box_ineq]
        d_slack_con = []
        for ci, (ci_idx, bound, sigma) in enumerate(con_ineq):
            row_idx = len(box_ineq) + ci
            d_slack_con.append(dot(JI[row_idx], dx))

        # Recover dual steps
        d_lambda_box = [
            (mu / max(slack_box[i], 1e-20) - lambda_box[i]) -
            (lambda_box[i] / max(slack_box[i], 1e-20)) * d_slack_box[i]
            for i in range(len(box_ineq))
        ]
        d_lambda_con = [
            (mu / max(slack_con[i], 1e-20) - lambda_con[i]) -
            (lambda_con[i] / max(slack_con[i], 1e-20)) * d_slack_con[i]
            for i in range(len(con_ineq))
        ]

        all_d_slack = d_slack_box + d_slack_con
        all_d_lambda = d_lambda_box + d_lambda_con

        alpha_p_max = max_frac_boundary(all_slack, all_d_slack) if n_ineq > 0 else 1.0
        alpha_d_max = max_frac_boundary(all_lambda, all_d_lambda) if n_ineq > 0 else 1.0

        eq_res0 = eq_residual(x, cx)
        merit0 = merit_fn(fx, slack_box, slack_con, eq_res0, mu)

        # Backtracking on merit
        alpha_p = alpha_p_max
        x_new = x
        f_new = fx
        cx_new = cx
        for _ in range(40):
            x_new = add_scaled(x, dx, alpha_p)
            for i in range(n):
                lo, hi = box_lower[i], box_upper[i]
                if lo == hi:
                    x_new[i] = lo
                else:
                    if math.isfinite(lo):
                        x_new[i] = max(lo + 1e-14, x_new[i])
                    if math.isfinite(hi):
                        x_new[i] = min(hi - 1e-14, x_new[i])

            f_new = f(x_new)
            cx_new = con_fn(x_new) if con_fn else []
            function_calls += 1

            sb_new, sc_new = compute_slacks(x_new, cx_new)
            eq_res_new = eq_residual(x_new, cx_new)
            merit_new = merit_fn(f_new, sb_new, sc_new, eq_res_new, mu)

            if math.isfinite(merit_new) and merit_new < merit0 + 1e-8:
                break
            alpha_p *= 0.5

        x_prev = x
        f_prev = fx
        x = x_new
        fx = f_new
        cx = cx_new

        if math.isfinite(fx) and fx < best_fx:
            best_x = x[:]
            best_fx = fx

        if not math.isfinite(fx) or any(not math.isfinite(v) for v in x):
            return OptimizeResult(
                x=best_x[:], fun=best_fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=False,
                message="Stopped: numerical instability (NaN detected)",
            )

        slack_box, slack_con = compute_slacks(x, cx)

        lambda_box = [max(min(lambda_box[i] + alpha_d_max * d_lambda_box[i], 1e12), 1e-20)
                      for i in range(len(box_ineq))]
        lambda_con = [max(min(lambda_con[i] + alpha_d_max * d_lambda_con[i], 1e12), 1e-20)
                      for i in range(len(con_ineq))]

        if n_eq > 0:
            all_leq_old = lambda_box_eq + lambda_con_eq
            all_leq_new = [all_leq_old[i] + alpha_d_max * d_lambda_eq[i]
                           if i < len(d_lambda_eq) else all_leq_old[i]
                           for i in range(n_eq)]
            lambda_box_eq = all_leq_new[:len(box_eq)]
            lambda_con_eq = all_leq_new[len(box_eq):]

        gx = grad_fn(x)
        gradient_calls += 1
        Jc = jac_fn(x) if jac_fn else None

        # Update mu via Mehrotra
        if n_ineq > 0:
            all_s = slack_box + slack_con
            all_l = lambda_box + lambda_con
            mu_current = sum(all_s[i] * all_l[i] for i in range(n_ineq)) / n_ineq
            alpha_s = max_frac_boundary(all_s, all_d_slack)
            alpha_l = max_frac_boundary(all_l, all_d_lambda)
            mu_aff = sum((all_s[i] + alpha_s * all_d_slack[i]) * (all_l[i] + alpha_l * all_d_lambda[i])
                         for i in range(n_ineq)) / n_ineq
            ratio = mu_aff / max(mu_current, 1e-25)
            sigma_val = ratio ** 3
            mu_next = max(sigma_val * mu_current, mu_current / 10.0)
            mu = max(min(mu_next, mu), 1e-20)

        # Convergence check
        step_norm_val = norm_inf(sub(x, x_prev))
        func_change_val = abs(fx - f_prev)

        if has_constraints:
            eq_res = eq_residual(x, cx)
            eq_violation = max((abs(r) for r in eq_res), default=0.0)

            grad_lag = gx[:]
            JI_cur = build_ineq_jac(Jc)
            JE_cur = build_eq_jac(Jc)
            all_l_cur = lambda_box + lambda_con
            for i in range(len(JI_cur)):
                for j in range(n):
                    grad_lag[j] -= JI_cur[i][j] * all_l_cur[i]
            all_leq_cur = lambda_box_eq + lambda_con_eq
            for i in range(len(JE_cur)):
                for j in range(n):
                    grad_lag[j] += JE_cur[i][j] * all_leq_cur[i]

            kkt_grad = norm_inf(grad_lag)
            kkt_res = max(kkt_grad, eq_violation)

            if kkt_res < kkt_tol_val and mu < 1e-4:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls, converged=True,
                    message=f"Converged: KKT residual {kkt_res:.2e} below tolerance",
                )
        else:
            if norm_inf(gx) < opts.grad_tol:
                return OptimizeResult(
                    x=x[:], fun=fx, gradient=gx[:],
                    iterations=iteration, function_calls=function_calls,
                    gradient_calls=gradient_calls, converged=True,
                    message="Converged: gradient norm below tolerance",
                )

        if step_norm_val < opts.step_tol:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=True,
                message="Converged: step size below tolerance",
            )

        if func_change_val < opts.func_tol and iteration > 1:
            return OptimizeResult(
                x=x[:], fun=fx, gradient=gx[:],
                iterations=iteration, function_calls=function_calls,
                gradient_calls=gradient_calls, converged=True,
                message="Converged: function change below tolerance",
            )

    return OptimizeResult(
        x=x[:], fun=fx, gradient=gx[:],
        iterations=opts.max_iterations, function_calls=function_calls,
        gradient_calls=gradient_calls, converged=False,
        message=f"Stopped: reached maximum iterations ({opts.max_iterations})",
    )
