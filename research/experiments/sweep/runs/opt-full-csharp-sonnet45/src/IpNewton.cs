namespace Optimization;

public class ConstraintDef
{
    public Func<double[], double[]> C { get; set; } = _ => Array.Empty<double>();
    public Func<double[], double[][]> Jacobian { get; set; } = _ => Array.Empty<double[]>();
    public double[] Lower { get; set; } = Array.Empty<double>();
    public double[] Upper { get; set; } = Array.Empty<double>();
}

public static class IpNewton
{
    private record IneqEntry(int Idx, double Bound, double Sigma);
    private record EqEntry(int Idx, double Target);
    private record Classified(List<IneqEntry> BoxIneq, List<EqEntry> BoxEq, List<IneqEntry> ConIneq, List<EqEntry> ConEq);

    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null,
        Func<double[], double[][]>? hess = null,
        double[]? lower = null, double[]? upper = null,
        ConstraintDef? constraints = null,
        double? mu0 = null, double? kktTol = null,
        OptimizeOptions? options = null)
    {
        int n = x0.Length;
        var opts = ResultTypes.MergeOptions(options);
        double kktTolVal = kktTol ?? opts.GradTol;
        lower ??= Enumerable.Repeat(double.NegativeInfinity, n).ToArray();
        upper ??= Enumerable.Repeat(double.PositiveInfinity, n).ToArray();

        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));
        var hessFn = hess ?? (x => FiniteHessian.FiniteDiffHessian(f, x));

        var cc = Classify(n, lower, upper, constraints);
        int nIneq = cc.BoxIneq.Count + cc.ConIneq.Count;
        int nEq = cc.BoxEq.Count + cc.ConEq.Count;
        bool hasConstraints = nIneq + nEq > 0;

        double[] x = (double[])x0.Clone();
        for (int i = 0; i < n; i++)
        {
            double lo = lower[i], hi = upper[i];
            if (lo == hi) { x[i] = lo; }
            else if (double.IsFinite(lo) && double.IsFinite(hi))
            {
                double margin = 0.01 * (hi - lo);
                x[i] = Math.Max(lo + margin, Math.Min(hi - margin, x[i]));
            }
            else if (double.IsFinite(lo))
                x[i] = Math.Max(lo + 0.01 * Math.Max(1, Math.Abs(lo)), x[i]);
            else if (double.IsFinite(hi))
                x[i] = Math.Min(hi - 0.01 * Math.Max(1, Math.Abs(hi)), x[i]);
        }

        double fx = f(x);
        double[] gx = gradFn(x);
        double[] cx = constraints?.C(x) ?? Array.Empty<double>();
        double[][]? Jc = constraints?.Jacobian(x);
        int functionCalls = 1, gradientCalls = 1;

        if (!hasConstraints && VecOps.NormInf(gx) < opts.GradTol)
        {
            return new OptimizeResult
            {
                X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                Iterations = 0, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                Converged = true, Message = "Converged: gradient norm below tolerance"
            };
        }

        var (slackBox, slackCon) = ComputeSlacks(x, cx, cc);
        double mu;
        if (mu0.HasValue) { mu = mu0.Value; }
        else if (nIneq > 0)
        {
            double objL1 = gx.Sum(g => Math.Abs(g));
            double barL1 = slackBox.Sum(s => 1.0 / Math.Max(s, 1e-14)) + slackCon.Sum(s => 1.0 / Math.Max(s, 1e-14));
            mu = barL1 > 0 ? 0.001 * objL1 / barL1 : 1e-4;
            mu = Math.Max(mu, 1e-10);
            mu = Math.Min(mu, 1);
        }
        else { mu = 0; }

        double[] lambdaBox = slackBox.Select(s => mu / Math.Max(s, 1e-14)).ToArray();
        double[] lambdaCon = slackCon.Select(s => mu / Math.Max(s, 1e-14)).ToArray();
        double[] lambdaBoxEq = new double[cc.BoxEq.Count];
        double[] lambdaConEq = new double[cc.ConEq.Count];

        double penalty = 10 * Math.Max(VecOps.NormInf(gx), 1);
        double[] bestX = (double[])x.Clone();
        double bestFx = fx;

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            double[][] H = hessFn(x);
            var step = SolveKKT(H, gx, x, cx, cc, slackBox, slackCon, lambdaBox, lambdaCon, lambdaBoxEq, lambdaConEq, Jc, mu, n);

            var allSlack = slackBox.Concat(slackCon).ToArray();
            var allDSlack = step.DSlackBox.Concat(step.DSlackCon).ToArray();
            var allLambda = lambdaBox.Concat(lambdaCon).ToArray();
            var allDLambda = step.DLambdaBox.Concat(step.DLambdaCon).ToArray();

            double alphaPMax = nIneq > 0 ? MaxFractionToBoundary(allSlack, allDSlack) : 1.0;
            double alphaDMax = nIneq > 0 ? MaxFractionToBoundary(allLambda, allDLambda) : 1.0;

            double[] eqRes0 = EqualityResidual(x, cx, cc);
            double merit0 = MeritFunction(fx, slackBox, slackCon, eqRes0, mu, penalty);

            double alphaP = alphaPMax;
            double[] xNew = x;
            double fNew = fx;
            double[] cxNew = cx;

            for (int bt = 0; bt < 40; bt++)
            {
                xNew = VecOps.AddScaled(x, step.Dx, alphaP);
                for (int i = 0; i < n; i++)
                {
                    if (lower[i] == upper[i]) xNew[i] = lower[i];
                    else
                    {
                        if (double.IsFinite(lower[i])) xNew[i] = Math.Max(lower[i] + 1e-14, xNew[i]);
                        if (double.IsFinite(upper[i])) xNew[i] = Math.Min(upper[i] - 1e-14, xNew[i]);
                    }
                }
                fNew = f(xNew);
                cxNew = constraints?.C(xNew) ?? Array.Empty<double>();
                functionCalls++;

                var (sbNew, scNew) = ComputeSlacks(xNew, cxNew, cc);
                double[] eqResNew = EqualityResidual(xNew, cxNew, cc);
                double meritNew = MeritFunction(fNew, sbNew, scNew, eqResNew, mu, penalty);

                if (double.IsFinite(meritNew) && meritNew < merit0 + 1e-8) break;
                alphaP *= 0.5;
            }

            double[] xPrev = x;
            double fPrev = fx;
            x = xNew; fx = fNew; cx = cxNew;

            if (double.IsFinite(fx) && fx < bestFx) { bestX = (double[])x.Clone(); bestFx = fx; }

            if (!double.IsFinite(fx) || x.Any(v => !double.IsFinite(v)))
            {
                return new OptimizeResult
                {
                    X = (double[])bestX.Clone(), Fun = bestFx, Gradient = (double[])gx.Clone(),
                    Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                    Converged = false, Message = "Stopped: numerical instability (NaN detected)"
                };
            }

            var newSlacks = ComputeSlacks(x, cx, cc);
            slackBox = newSlacks.Item1; slackCon = newSlacks.Item2;

            lambdaBox = lambdaBox.Select((l, i) => Math.Min(Math.Max(l + alphaDMax * step.DLambdaBox[i], 1e-20), 1e12)).ToArray();
            lambdaCon = lambdaCon.Select((l, i) => Math.Min(Math.Max(l + alphaDMax * step.DLambdaCon[i], 1e-20), 1e12)).ToArray();

            if (nEq > 0)
            {
                var allLambdaEq = lambdaBoxEq.Concat(lambdaConEq).ToArray();
                for (int i = 0; i < allLambdaEq.Length && i < step.DLambdaEq.Length; i++)
                    allLambdaEq[i] += alphaDMax * step.DLambdaEq[i];
                lambdaBoxEq = allLambdaEq.Take(cc.BoxEq.Count).ToArray();
                lambdaConEq = allLambdaEq.Skip(cc.BoxEq.Count).ToArray();
            }

            gx = gradFn(x);
            gradientCalls++;
            Jc = constraints?.Jacobian(x);

            if (nIneq > 0)
            {
                double muNext = ComputeMuNext(
                    slackBox.Concat(slackCon).ToArray(),
                    lambdaBox.Concat(lambdaCon).ToArray(),
                    step.DSlackBox.Concat(step.DSlackCon).ToArray(),
                    step.DLambdaBox.Concat(step.DLambdaCon).ToArray());
                mu = Math.Max(Math.Min(muNext, mu), 1e-20);
            }

            double stepNorm = VecOps.NormInf(VecOps.Sub(x, xPrev));
            double funcChange = Math.Abs(fx - fPrev);

            if (hasConstraints)
            {
                double[] eqRes = EqualityResidual(x, cx, cc);
                double eqViol = eqRes.Length > 0 ? eqRes.Max(r => Math.Abs(r)) : 0;
                double kktRes = Math.Max(ComputeKKTGrad(gx, x, cx, cc, lambdaBox, lambdaCon, lambdaBoxEq, lambdaConEq, Jc, n), eqViol);
                if (kktRes < kktTolVal && mu < 1e-4)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                        Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                        Converged = true, Message = $"Converged: KKT residual {kktRes:E2} below tolerance"
                    };
                }
            }
            else
            {
                if (VecOps.NormInf(gx) < opts.GradTol)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                        Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                        Converged = true, Message = "Converged: gradient norm below tolerance"
                    };
                }
            }

            if (stepNorm < opts.StepTol)
                return new OptimizeResult { X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(), Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls, Converged = true, Message = "Converged: step size below tolerance" };
            if (funcChange < opts.FuncTol && iter > 1)
                return new OptimizeResult { X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(), Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls, Converged = true, Message = "Converged: function change below tolerance" };
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = opts.MaxIterations, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
        };
    }

    private static Classified Classify(int n, double[] boxLower, double[] boxUpper, ConstraintDef? conDef)
    {
        var boxIneq = new List<IneqEntry>(); var boxEq = new List<EqEntry>();
        for (int i = 0; i < n; i++)
        {
            if (boxLower[i] == boxUpper[i]) boxEq.Add(new EqEntry(i, boxLower[i]));
            else
            {
                if (double.IsFinite(boxLower[i])) boxIneq.Add(new IneqEntry(i, boxLower[i], 1));
                if (double.IsFinite(boxUpper[i])) boxIneq.Add(new IneqEntry(i, boxUpper[i], -1));
            }
        }
        var conIneq = new List<IneqEntry>(); var conEq = new List<EqEntry>();
        if (conDef != null)
        {
            int m = conDef.Lower.Length;
            for (int i = 0; i < m; i++)
            {
                if (conDef.Lower[i] == conDef.Upper[i]) conEq.Add(new EqEntry(i, conDef.Lower[i]));
                else
                {
                    if (double.IsFinite(conDef.Lower[i])) conIneq.Add(new IneqEntry(i, conDef.Lower[i], 1));
                    if (double.IsFinite(conDef.Upper[i])) conIneq.Add(new IneqEntry(i, conDef.Upper[i], -1));
                }
            }
        }
        return new Classified(boxIneq, boxEq, conIneq, conEq);
    }

    private static (double[], double[]) ComputeSlacks(double[] x, double[] cx, Classified cc)
    {
        var sb = cc.BoxIneq.Select(e => Math.Max(e.Sigma * (x[e.Idx] - e.Bound), 1e-10)).ToArray();
        var sc = cc.ConIneq.Select(e => Math.Max(e.Sigma * (cx[e.Idx] - e.Bound), 1e-10)).ToArray();
        return (sb, sc);
    }

    private static double[] EqualityResidual(double[] x, double[] cx, Classified cc)
    {
        var res = new List<double>();
        foreach (var e in cc.BoxEq) res.Add(x[e.Idx] - e.Target);
        foreach (var e in cc.ConEq) res.Add(cx[e.Idx] - e.Target);
        return res.ToArray();
    }

    private static double[][] BuildIneqJacobian(int n, Classified cc, double[][]? Jc)
    {
        var rows = new List<double[]>();
        foreach (var e in cc.BoxIneq) { var row = new double[n]; row[e.Idx] = e.Sigma; rows.Add(row); }
        foreach (var e in cc.ConIneq) { if (Jc != null) rows.Add(Jc[e.Idx].Select(v => v * e.Sigma).ToArray()); }
        return rows.ToArray();
    }

    private static double[][] BuildEqJacobian(int n, Classified cc, double[][]? Jc)
    {
        var rows = new List<double[]>();
        foreach (var e in cc.BoxEq) { var row = new double[n]; row[e.Idx] = 1; rows.Add(row); }
        foreach (var e in cc.ConEq) { if (Jc != null) rows.Add((double[])Jc[e.Idx].Clone()); }
        return rows.ToArray();
    }

    private record KKTStep(double[] Dx, double[] DLambdaEq, double[] DSlackBox, double[] DSlackCon, double[] DLambdaBox, double[] DLambdaCon);

    private static KKTStep SolveKKT(double[][] H, double[] gx, double[] x, double[] cx, Classified cc,
        double[] slackBox, double[] slackCon, double[] lambdaBox, double[] lambdaCon,
        double[] lambdaBoxEq, double[] lambdaConEq, double[][]? Jc, double mu, int n)
    {
        int nIneq = cc.BoxIneq.Count + cc.ConIneq.Count;
        int nEq = cc.BoxEq.Count + cc.ConEq.Count;
        var JI = BuildIneqJacobian(n, cc, Jc);
        var allSlack = slackBox.Concat(slackCon).ToArray();
        var allLambda = lambdaBox.Concat(lambdaCon).ToArray();
        var sigmaVec = allSlack.Select((s, i) => allLambda[i] / Math.Max(s, 1e-20)).ToArray();

        double[][] Htilde;
        if (nIneq > 0) { Htilde = MatAdd(H, MatTDiagMat(JI, sigmaVec, n)); }
        else { Htilde = H.Select(r => (double[])r.Clone()).ToArray(); }

        var correction = allSlack.Select(s => -mu / Math.Max(s, 1e-20)).ToArray();
        double[] gtilde = (double[])gx.Clone();
        if (nIneq > 0)
        {
            double[] JItCorr = MatTvec(JI, correction, n);
            for (int i = 0; i < n; i++) gtilde[i] += JItCorr[i];
        }

        double[] dx; double[] dLambdaEq;
        if (nEq > 0)
        {
            var JE = BuildEqJacobian(n, cc, Jc);
            var gEq = EqualityResidual(x, cx, cc);
            var allLambdaEq = lambdaBoxEq.Concat(lambdaConEq).ToArray();
            double[] JEtLambda = MatTvec(JE, allLambdaEq, n);
            for (int i = 0; i < n; i++) gtilde[i] -= JEtLambda[i];

            var v = RobustSolve(Htilde, gtilde.Select(g => -g).ToArray(), n);
            var Y = new List<double[]>();
            for (int j = 0; j < nEq; j++) Y.Add(RobustSolve(Htilde, JE[j], n));

            double[][] M = new double[nEq][];
            for (int i = 0; i < nEq; i++)
            {
                M[i] = new double[nEq];
                for (int j = 0; j < nEq; j++) M[i][j] = VecOps.Dot(JE[i], Y[j]);
            }

            double[] rhs = new double[nEq];
            for (int i = 0; i < nEq; i++) rhs[i] = -(gEq[i] + VecOps.Dot(JE[i], v));

            dLambdaEq = RobustSolve(M, rhs, nEq);
            dx = (double[])v.Clone();
            for (int j = 0; j < nEq; j++)
                for (int i = 0; i < n; i++) dx[i] += Y[j][i] * dLambdaEq[j];
        }
        else
        {
            dx = RobustSolve(Htilde, gtilde.Select(g => -g).ToArray(), n);
            dLambdaEq = Array.Empty<double>();
        }

        var dSlackBox = cc.BoxIneq.Select(e => e.Sigma * dx[e.Idx]).ToArray();
        var dSlackCon = cc.ConIneq.Select((e, i) => VecOps.Dot(JI[cc.BoxIneq.Count + i], dx)).ToArray();
        var dLambdaBox = slackBox.Select((s, i) => (mu / Math.Max(s, 1e-20) - lambdaBox[i]) - (lambdaBox[i] / Math.Max(s, 1e-20)) * dSlackBox[i]).ToArray();
        var dLambdaCon = slackCon.Select((s, i) => (mu / Math.Max(s, 1e-20) - lambdaCon[i]) - (lambdaCon[i] / Math.Max(s, 1e-20)) * dSlackCon[i]).ToArray();

        return new KKTStep(dx, dLambdaEq, dSlackBox, dSlackCon, dLambdaBox, dLambdaCon);
    }

    private static double MaxFractionToBoundary(double[] vals, double[] dvals, double tau = 0.995)
    {
        double alpha = 1.0;
        for (int i = 0; i < vals.Length; i++)
        {
            if (dvals[i] < -1e-20)
            {
                double a = -tau * vals[i] / dvals[i];
                if (a < alpha) alpha = a;
            }
        }
        return Math.Max(alpha, 0);
    }

    private static double ComputeMuNext(double[] allSlack, double[] allLambda, double[] dSlack, double[] dLambda)
    {
        int nIneq = allSlack.Length;
        if (nIneq == 0) return 0;
        double muCurrent = 0;
        for (int i = 0; i < nIneq; i++) muCurrent += allSlack[i] * allLambda[i];
        muCurrent /= nIneq;

        double alphaS = MaxFractionToBoundary(allSlack, dSlack);
        double alphaL = MaxFractionToBoundary(allLambda, dLambda);
        double muAff = 0;
        for (int i = 0; i < nIneq; i++)
            muAff += (allSlack[i] + alphaS * dSlack[i]) * (allLambda[i] + alphaL * dLambda[i]);
        muAff /= nIneq;

        double ratio = muAff / Math.Max(muCurrent, 1e-25);
        double sigma = ratio * ratio * ratio;
        return Math.Max(sigma * muCurrent, muCurrent / 10);
    }

    private static double MeritFunction(double fx, double[] slackBox, double[] slackCon, double[] eqResidual, double mu, double penalty)
    {
        double val = fx;
        foreach (var s in slackBox) { if (s > 0) val -= mu * Math.Log(s); else return double.PositiveInfinity; }
        foreach (var s in slackCon) { if (s > 0) val -= mu * Math.Log(s); else return double.PositiveInfinity; }
        foreach (var r in eqResidual) val += penalty * Math.Abs(r);
        return val;
    }

    private static double ComputeKKTGrad(double[] gx, double[] x, double[] cx, Classified cc,
        double[] lambdaBox, double[] lambdaCon, double[] lambdaBoxEq, double[] lambdaConEq, double[][]? Jc, int n)
    {
        var JI = BuildIneqJacobian(n, cc, Jc);
        var JE = BuildEqJacobian(n, cc, Jc);
        double[] gradLag = (double[])gx.Clone();
        var allLambdaIneq = lambdaBox.Concat(lambdaCon).ToArray();
        for (int i = 0; i < JI.Length; i++)
            for (int j = 0; j < n; j++) gradLag[j] -= JI[i][j] * allLambdaIneq[i];
        var allLambdaEq = lambdaBoxEq.Concat(lambdaConEq).ToArray();
        for (int i = 0; i < JE.Length; i++)
            for (int j = 0; j < n; j++) gradLag[j] += JE[i][j] * allLambdaEq[i];
        return VecOps.NormInf(gradLag);
    }

    private static double[] MatTvec(double[][] A, double[] v, int n)
    {
        double[] result = new double[n];
        for (int i = 0; i < A.Length; i++)
            for (int j = 0; j < n; j++) result[j] += A[i][j] * v[i];
        return result;
    }

    private static double[][] MatTDiagMat(double[][] A, double[] d, int n)
    {
        double[][] result = new double[n][];
        for (int i = 0; i < n; i++) result[i] = new double[n];
        for (int i = 0; i < A.Length; i++)
            for (int p = 0; p < n; p++)
                for (int q = p; q < n; q++)
                    result[p][q] += A[i][p] * d[i] * A[i][q];
        for (int p = 0; p < n; p++)
            for (int q = 0; q < p; q++) result[p][q] = result[q][p];
        return result;
    }

    private static double[][] MatAdd(double[][] A, double[][] B)
    {
        return A.Select((row, i) => row.Select((v, j) => v + B[i][j]).ToArray()).ToArray();
    }

    private static double[] RobustSolve(double[][] A, double[] b, int n)
    {
        if (n == 0) return Array.Empty<double>();
        var sol = Newton.CholeskySolve(A, b);
        if (sol != null) return sol;
        double tau = 1e-8;
        for (int attempt = 0; attempt < 25; attempt++)
        {
            var Areg = A.Select((row, i) => { var r = (double[])row.Clone(); r[i] += tau; return r; }).ToArray();
            var regSol = Newton.CholeskySolve(Areg, b);
            if (regSol != null) return regSol;
            tau *= 10;
        }
        double bNorm = VecOps.NormInf(b);
        return bNorm > 0 ? b.Select(bi => bi / bNorm).ToArray() : new double[n];
    }
}
