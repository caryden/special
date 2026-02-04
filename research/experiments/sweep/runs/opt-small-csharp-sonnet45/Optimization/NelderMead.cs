namespace Optimization;

/// <summary>
/// Nelder-Mead (downhill simplex) optimization.
/// Derivative-free method that maintains a simplex of n+1 vertices in n dimensions.
/// </summary>
public static class NelderMead
{
    /// <summary>
    /// Options specific to Nelder-Mead algorithm.
    /// </summary>
    public class NelderMeadOptions : OptimizeOptions
    {
        public double Alpha { get; set; } = 1.0;
        public double Gamma { get; set; } = 2.0;
        public double Rho { get; set; } = 0.5;
        public double Sigma { get; set; } = 0.5;
        public double InitialSimplexScale { get; set; } = 0.05;
    }

    /// <summary>
    /// Create initial simplex: n+1 vertices. Vertex 0 = x0, vertex i = x0 + h*e_i.
    /// </summary>
    private static double[][] CreateInitialSimplex(double[] x0, double scale)
    {
        int n = x0.Length;
        var simplex = new double[n + 1][];
        simplex[0] = VecOps.Clone(x0);

        for (int i = 0; i < n; i++)
        {
            var vertex = VecOps.Clone(x0);
            double h = scale * Math.Max(Math.Abs(x0[i]), 1.0);
            vertex[i] += h;
            simplex[i + 1] = vertex;
        }

        return simplex;
    }

    /// <summary>
    /// Minimize a function using the Nelder-Mead simplex method.
    /// </summary>
    public static OptimizeResult Minimize(
        Func<double[], double> f,
        double[] x0,
        NelderMeadOptions? options = null)
    {
        var opts = options ?? new NelderMeadOptions();
        int n = x0.Length;

        // Initialize simplex
        var simplex = CreateInitialSimplex(x0, opts.InitialSimplexScale);
        var fValues = new double[n + 1];
        for (int i = 0; i < simplex.Length; i++)
        {
            fValues[i] = f(simplex[i]);
        }
        int functionCalls = n + 1;

        int iteration = 0;

        while (iteration < opts.MaxIterations)
        {
            // Sort vertices by function value (ascending)
            var indices = Enumerable.Range(0, n + 1).ToArray();
            Array.Sort(indices, (a, b) => fValues[a].CompareTo(fValues[b]));

            var newSimplex = new double[n + 1][];
            var newFValues = new double[n + 1];
            for (int i = 0; i < n + 1; i++)
            {
                newSimplex[i] = simplex[indices[i]];
                newFValues[i] = fValues[indices[i]];
            }
            simplex = newSimplex;
            fValues = newFValues;

            double fBest = fValues[0];
            double fWorst = fValues[n];
            double fSecondWorst = fValues[n - 1];

            // Check convergence: function value spread
            double fMean = fValues.Average();
            double fStd = Math.Sqrt(fValues.Sum(fv => Math.Pow(fv - fMean, 2)) / (n + 1));

            if (fStd < opts.FuncTol)
            {
                return new OptimizeResult
                {
                    X = VecOps.Clone(simplex[0]),
                    Fun = fBest,
                    Gradient = null,
                    Iterations = iteration,
                    FunctionCalls = functionCalls,
                    GradientCalls = 0,
                    Converged = true,
                    Message = $"Converged: simplex function spread {fStd:E2} below tolerance"
                };
            }

            // Check convergence: simplex diameter
            double diameter = 0;
            for (int i = 1; i <= n; i++)
            {
                double d = VecOps.NormInf(VecOps.Sub(simplex[i], simplex[0]));
                if (d > diameter) diameter = d;
            }

            if (diameter < opts.StepTol)
            {
                return new OptimizeResult
                {
                    X = VecOps.Clone(simplex[0]),
                    Fun = fBest,
                    Gradient = null,
                    Iterations = iteration,
                    FunctionCalls = functionCalls,
                    GradientCalls = 0,
                    Converged = true,
                    Message = $"Converged: simplex diameter {diameter:E2} below tolerance"
                };
            }

            iteration++;

            // Compute centroid of all vertices except the worst
            var centroid = VecOps.Clone(simplex[0]);
            for (int i = 1; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    centroid[j] += simplex[i][j];
                }
            }
            for (int j = 0; j < n; j++)
            {
                centroid[j] /= n;
            }

            // Reflection: x_r = centroid + alpha * (centroid - worst)
            var reflected = VecOps.AddScaled(centroid, VecOps.Sub(centroid, simplex[n]), opts.Alpha);
            double fReflected = f(reflected);
            functionCalls++;

            if (fReflected < fSecondWorst && fReflected >= fBest)
            {
                // Accept reflection
                simplex[n] = reflected;
                fValues[n] = fReflected;
                continue;
            }

            if (fReflected < fBest)
            {
                // Try expansion: x_e = centroid + gamma * (reflected - centroid)
                var expanded = VecOps.AddScaled(centroid, VecOps.Sub(reflected, centroid), opts.Gamma);
                double fExpanded = f(expanded);
                functionCalls++;

                if (fExpanded < fReflected)
                {
                    simplex[n] = expanded;
                    fValues[n] = fExpanded;
                }
                else
                {
                    simplex[n] = reflected;
                    fValues[n] = fReflected;
                }
                continue;
            }

            // Contraction
            if (fReflected < fWorst)
            {
                // Outside contraction: x_c = centroid + rho * (reflected - centroid)
                var contracted = VecOps.AddScaled(centroid, VecOps.Sub(reflected, centroid), opts.Rho);
                double fContracted = f(contracted);
                functionCalls++;

                if (fContracted <= fReflected)
                {
                    simplex[n] = contracted;
                    fValues[n] = fContracted;
                    continue;
                }
            }
            else
            {
                // Inside contraction: x_c = centroid + rho * (worst - centroid)
                var contracted = VecOps.AddScaled(centroid, VecOps.Sub(simplex[n], centroid), opts.Rho);
                double fContracted = f(contracted);
                functionCalls++;

                if (fContracted < fWorst)
                {
                    simplex[n] = contracted;
                    fValues[n] = fContracted;
                    continue;
                }
            }

            // Shrink: move all vertices towards the best
            for (int i = 1; i <= n; i++)
            {
                simplex[i] = VecOps.Add(simplex[0], VecOps.Scale(VecOps.Sub(simplex[i], simplex[0]), opts.Sigma));
                fValues[i] = f(simplex[i]);
                functionCalls++;
            }
        }

        // Max iterations reached
        return new OptimizeResult
        {
            X = VecOps.Clone(simplex[0]),
            Fun = fValues[0],
            Gradient = null,
            Iterations = iteration,
            FunctionCalls = functionCalls,
            GradientCalls = 0,
            Converged = false,
            Message = $"Stopped: reached maximum iterations ({opts.MaxIterations})"
        };
    }
}
