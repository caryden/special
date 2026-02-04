namespace Optimization;

public class MinimizeOptions : OptimizeOptions
{
    public string? Method { get; set; }
    public Func<double[], double[]>? Grad { get; set; }
}

public static class MinimizeDispatcher
{
    public static OptimizeResult Minimize(
        Func<double[], double> f, double[] x0, MinimizeOptions? options = null)
    {
        string method;
        if (options?.Method != null)
        {
            method = options.Method;
        }
        else if (options?.Grad != null)
        {
            method = "bfgs";
        }
        else
        {
            method = "nelder-mead";
        }

        var opts = new OptimizeOptions
        {
            GradTol = options?.GradTol ?? 1e-8,
            StepTol = options?.StepTol ?? 1e-8,
            FuncTol = options?.FuncTol ?? 1e-12,
            MaxIterations = options?.MaxIterations ?? 1000
        };

        return method switch
        {
            "nelder-mead" => NelderMead.Minimize(f, x0, opts),
            "gradient-descent" => GradientDescent.Minimize(f, x0, options?.Grad, opts),
            "bfgs" => Bfgs.Minimize(f, x0, options?.Grad, opts),
            "l-bfgs" => LBfgs.Minimize(f, x0, options?.Grad, opts),
            _ => throw new ArgumentException($"Unknown method: {method}")
        };
    }
}
