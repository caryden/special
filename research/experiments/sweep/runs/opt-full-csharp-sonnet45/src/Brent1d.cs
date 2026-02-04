namespace Optimization;

public class Brent1dOptions
{
    public double Tol { get; set; } = Math.Sqrt(2.220446049250313e-16);
    public int MaxIter { get; set; } = 500;
}

public class Brent1dResult
{
    public double X { get; set; }
    public double Fun { get; set; }
    public int Iterations { get; set; }
    public int FunctionCalls { get; set; }
    public bool Converged { get; set; }
    public string Message { get; set; } = "";
}

public static class Brent1d
{
    private const double GoldenRatio = 0.3819660112501051;

    public static Brent1dResult Minimize(Func<double, double> f, double a, double b, Brent1dOptions? options = null)
    {
        double tol = options?.Tol ?? Math.Sqrt(2.220446049250313e-16);
        int maxIter = options?.MaxIter ?? 500;

        if (a > b) (a, b) = (b, a);

        double x = a + GoldenRatio * (b - a);
        double w = x, v = x;
        double fx = f(x);
        double fw = fx, fv = fx;
        int functionCalls = 1;

        double d = 0, e = 0;

        for (int iter = 1; iter <= maxIter; iter++)
        {
            double midpoint = 0.5 * (a + b);
            double tol1 = tol * Math.Abs(x) + 1e-10;
            double tol2 = 2 * tol1;

            if (Math.Abs(x - midpoint) <= tol2 - 0.5 * (b - a))
            {
                return new Brent1dResult
                {
                    X = x, Fun = fx, Iterations = iter - 1,
                    FunctionCalls = functionCalls, Converged = true,
                    Message = "Convergence achieved"
                };
            }

            bool useParabolic = false;
            double u = 0;

            if (Math.Abs(e) > tol1)
            {
                // Try parabolic interpolation
                double r = (x - w) * (fx - fv);
                double q = (x - v) * (fx - fw);
                double p = (x - v) * q - (x - w) * r;
                q = 2 * (q - r);
                if (q > 0) p = -p; else q = -q;
                double etemp = e;
                e = d;

                if (Math.Abs(p) < Math.Abs(0.5 * q * etemp) && p > q * (a - x) && p < q * (b - x))
                {
                    d = p / q;
                    u = x + d;
                    if (u - a < tol2 || b - u < tol2)
                        d = x < midpoint ? tol1 : -tol1;
                    useParabolic = true;
                }
            }

            if (!useParabolic)
            {
                e = (x < midpoint ? b : a) - x;
                d = GoldenRatio * e;
            }

            u = Math.Abs(d) >= tol1 ? x + d : x + (d > 0 ? tol1 : -tol1);
            double fu = f(u);
            functionCalls++;

            if (fu <= fx)
            {
                if (u < x) b = x; else a = x;
                v = w; fv = fw;
                w = x; fw = fx;
                x = u; fx = fu;
            }
            else
            {
                if (u < x) a = u; else b = u;
                if (fu <= fw || w == x)
                {
                    v = w; fv = fw;
                    w = u; fw = fu;
                }
                else if (fu <= fv || v == x || v == w)
                {
                    v = u; fv = fu;
                }
            }
        }

        return new Brent1dResult
        {
            X = x, Fun = fx, Iterations = maxIter,
            FunctionCalls = functionCalls, Converged = false,
            Message = "Maximum iterations exceeded"
        };
    }
}
