namespace Optimization;

public static class NelderMead
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0, OptimizeOptions? options = null,
        double alpha = 1.0, double gamma = 2.0, double rho = 0.5, double sigma = 0.5,
        double initialSimplexScale = 0.05)
    {
        var opts = ResultTypes.MergeOptions(options);
        int n = x0.Length;
        int nv = n + 1;
        int functionCalls = 0;

        // Create initial simplex
        double[][] simplex = new double[nv][];
        double[] fvals = new double[nv];

        simplex[0] = (double[])x0.Clone();
        fvals[0] = f(simplex[0]);
        functionCalls++;

        for (int i = 0; i < n; i++)
        {
            double[] v = (double[])x0.Clone();
            double h = initialSimplexScale * Math.Max(Math.Abs(x0[i]), 1.0);
            v[i] += h;
            simplex[i + 1] = v;
            fvals[i + 1] = f(v);
            functionCalls++;
        }

        int[] indices = new int[nv];
        for (int i = 0; i < nv; i++) indices[i] = i;

        for (int iteration = 1; iteration <= opts.MaxIterations; iteration++)
        {
            // Sort
            Array.Sort(indices, (a, b) => fvals[a].CompareTo(fvals[b]));

            // Convergence: function value spread
            double mean = 0;
            for (int i = 0; i < nv; i++) mean += fvals[indices[i]];
            mean /= nv;
            double std = 0;
            for (int i = 0; i < nv; i++)
            {
                double diff = fvals[indices[i]] - mean;
                std += diff * diff;
            }
            std = Math.Sqrt(std / nv);
            if (std < opts.FuncTol)
            {
                int bi = indices[0];
                return new OptimizeResult
                {
                    X = (double[])simplex[bi].Clone(), Fun = fvals[bi],
                    Gradient = null, Iterations = iteration - 1,
                    FunctionCalls = functionCalls, GradientCalls = 0,
                    Converged = true, Message = "Convergence: function spread below tolerance"
                };
            }

            // Simplex diameter check
            double diam = 0;
            for (int i = 1; i < nv; i++)
            {
                double d = VecOps.NormInf(VecOps.Sub(simplex[indices[i]], simplex[indices[0]]));
                if (d > diam) diam = d;
            }
            if (diam < opts.StepTol)
            {
                int bi = indices[0];
                return new OptimizeResult
                {
                    X = (double[])simplex[bi].Clone(), Fun = fvals[bi],
                    Gradient = null, Iterations = iteration - 1,
                    FunctionCalls = functionCalls, GradientCalls = 0,
                    Converged = true, Message = "Convergence: simplex diameter below tolerance"
                };
            }

            int best = indices[0];
            int worst = indices[nv - 1];
            int secondWorst = indices[nv - 2];

            // Centroid of all except worst
            double[] centroid = new double[n];
            for (int i = 0; i < nv - 1; i++)
                for (int j = 0; j < n; j++)
                    centroid[j] += simplex[indices[i]][j];
            for (int j = 0; j < n; j++) centroid[j] /= (nv - 1);

            // Reflect
            double[] xr = new double[n];
            for (int j = 0; j < n; j++)
                xr[j] = centroid[j] + alpha * (centroid[j] - simplex[worst][j]);
            double fr = f(xr);
            functionCalls++;

            if (fr < fvals[secondWorst] && fr >= fvals[best])
            {
                simplex[worst] = xr;
                fvals[worst] = fr;
                continue;
            }

            if (fr < fvals[best])
            {
                // Expand
                double[] xe = new double[n];
                for (int j = 0; j < n; j++)
                    xe[j] = centroid[j] + gamma * (xr[j] - centroid[j]);
                double fe = f(xe);
                functionCalls++;

                if (fe < fr)
                {
                    simplex[worst] = xe;
                    fvals[worst] = fe;
                }
                else
                {
                    simplex[worst] = xr;
                    fvals[worst] = fr;
                }
                continue;
            }

            // Contraction
            if (fr < fvals[worst])
            {
                // Outside contraction
                double[] xc = new double[n];
                for (int j = 0; j < n; j++)
                    xc[j] = centroid[j] + rho * (xr[j] - centroid[j]);
                double fc = f(xc);
                functionCalls++;

                if (fc <= fr)
                {
                    simplex[worst] = xc;
                    fvals[worst] = fc;
                    continue;
                }
            }
            else
            {
                // Inside contraction
                double[] xc = new double[n];
                for (int j = 0; j < n; j++)
                    xc[j] = centroid[j] + rho * (simplex[worst][j] - centroid[j]);
                double fc = f(xc);
                functionCalls++;

                if (fc < fvals[worst])
                {
                    simplex[worst] = xc;
                    fvals[worst] = fc;
                    continue;
                }
            }

            // Shrink
            for (int i = 1; i < nv; i++)
            {
                int idx = indices[i];
                for (int j = 0; j < n; j++)
                    simplex[idx][j] = simplex[best][j] + sigma * (simplex[idx][j] - simplex[best][j]);
                fvals[idx] = f(simplex[idx]);
                functionCalls++;
            }
        }

        Array.Sort(indices, (a, b) => fvals[a].CompareTo(fvals[b]));
        int bestIdx = indices[0];
        return new OptimizeResult
        {
            X = (double[])simplex[bestIdx].Clone(), Fun = fvals[bestIdx],
            Gradient = null, Iterations = opts.MaxIterations,
            FunctionCalls = functionCalls, GradientCalls = 0,
            Converged = false, Message = "Stopped: reached maximum iterations"
        };
    }
}
