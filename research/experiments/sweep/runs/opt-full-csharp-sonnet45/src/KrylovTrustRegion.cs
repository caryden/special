namespace Optimization;

public static class KrylovTrustRegion
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0,
        Func<double[], double[]>? grad = null,
        OptimizeOptions? options = null,
        double initialRadius = 1.0, double maxRadius = 100.0,
        double eta2 = 0.1, double rhoLower = 0.25, double rhoUpper = 0.75, double cgTol = 0.01)
    {
        var opts = ResultTypes.MergeOptions(options);
        var gradFn = grad ?? (x => FiniteDiff.ForwardDiffGradient(f, x));
        int n = x0.Length;

        double[] x = (double[])x0.Clone();
        double fx = f(x);
        double[] gx = gradFn(x);
        int functionCalls = 1;
        int gradientCalls = 1;
        double radius = initialRadius;

        double gradNorm = VecOps.NormInf(gx);
        var initialCheck = ResultTypes.CheckConvergence(gradNorm, double.PositiveInfinity, double.PositiveInfinity, 0, opts);
        if (initialCheck != null && ResultTypes.IsConverged(initialCheck))
        {
            return new OptimizeResult
            {
                X = x, Fun = fx, Gradient = (double[])gx.Clone(),
                Iterations = 0, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                Converged = true, Message = ResultTypes.ConvergenceMessage(initialCheck)
            };
        }

        for (int iter = 1; iter <= opts.MaxIterations; iter++)
        {
            var cg = SteihaugCG(gradFn, x, gx, radius, cgTol, n);
            gradientCalls += cg.GradCalls;

            double[] xNew = VecOps.Add(x, cg.S);
            double fNew = f(xNew);
            functionCalls++;

            double actualReduction = fx - fNew;
            double predictedReduction = -cg.MDecrease;

            double rho;
            if (predictedReduction <= 0) rho = 0;
            else rho = actualReduction / predictedReduction;

            double sNorm = VecOps.Norm(cg.S);
            bool interior = sNorm < 0.9 * radius;

            if (rho < rhoLower)
                radius *= 0.25;
            else if (rho > rhoUpper && !interior)
                radius = Math.Min(2 * radius, maxRadius);

            if (rho > eta2)
            {
                double fPrev = fx;
                x = xNew; fx = fNew;
                gx = gradFn(x);
                gradientCalls++;

                gradNorm = VecOps.NormInf(gx);
                double funcChange = Math.Abs(fPrev - fx);
                var reason = ResultTypes.CheckConvergence(gradNorm, sNorm, funcChange, iter, opts);
                if (reason != null)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                        Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                        Converged = ResultTypes.IsConverged(reason), Message = ResultTypes.ConvergenceMessage(reason)
                    };
                }
            }
            else
            {
                if (radius < 1e-15)
                {
                    return new OptimizeResult
                    {
                        X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
                        Iterations = iter, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
                        Converged = false, Message = "Trust region radius too small"
                    };
                }
            }
        }

        return new OptimizeResult
        {
            X = (double[])x.Clone(), Fun = fx, Gradient = (double[])gx.Clone(),
            Iterations = opts.MaxIterations, FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Converged = false, Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
        };
    }

    public class CGResult
    {
        public double[] S { get; set; } = Array.Empty<double>();
        public double MDecrease { get; set; }
        public int CgIters { get; set; }
        public bool OnBoundary { get; set; }
        public int GradCalls { get; set; }
    }

    public static CGResult SteihaugCG(
        Func<double[], double[]> grad, double[] x, double[] gx,
        double radius, double cgTol, int n)
    {
        double[] z = new double[n];
        double[] r = (double[])gx.Clone();
        double[] d = VecOps.Negate(r);

        double rho0 = VecOps.Dot(r, r);
        double rhoPrev = rho0;
        int gradCalls = 0;
        bool onBoundary = false;

        for (int i = 0; i < n; i++)
        {
            double[] Hd = FiniteHessian.HessianVectorProduct(grad, x, d, gx);
            gradCalls++;
            double dHd = VecOps.Dot(d, Hd);

            if (Math.Abs(dHd) < 1e-15) break;

            double alpha = rhoPrev / dHd;

            // Check negative curvature or boundary hit
            double[] zAlpha = VecOps.AddScaled(z, d, alpha);
            double zAlphaNorm2 = VecOps.Dot(zAlpha, zAlpha);
            if (dHd < 0 || zAlphaNorm2 >= radius * radius)
            {
                double tau = BoundaryTau(z, d, radius);
                z = VecOps.AddScaled(z, d, tau);
                onBoundary = true;
                break;
            }

            z = zAlpha;
            for (int j = 0; j < n; j++) r[j] += alpha * Hd[j];
            double rhoNext = VecOps.Dot(r, r);

            if (rhoNext / rho0 < cgTol * cgTol) break;

            double beta = rhoNext / rhoPrev;
            for (int j = 0; j < n; j++) d[j] = -r[j] + beta * d[j];
            rhoPrev = rhoNext;
        }

        double[] Hz = FiniteHessian.HessianVectorProduct(grad, x, z, gx);
        gradCalls++;
        double mDecrease = VecOps.Dot(gx, z) + 0.5 * VecOps.Dot(z, Hz);

        return new CGResult { S = z, MDecrease = mDecrease, CgIters = gradCalls - 1, OnBoundary = onBoundary, GradCalls = gradCalls };
    }

    private static double BoundaryTau(double[] z, double[] d, double radius)
    {
        double a = VecOps.Dot(d, d);
        double b = 2 * VecOps.Dot(z, d);
        double c = VecOps.Dot(z, z) - radius * radius;
        double disc = b * b - 4 * a * c;
        return (-b + Math.Sqrt(Math.Max(0, disc))) / (2 * a);
    }
}
