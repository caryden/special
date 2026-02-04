namespace Optimization;

public class MoreThuenteOptions
{
    public double FTol { get; set; } = 1e-4;
    public double GTol { get; set; } = 0.9;
    public double XTol { get; set; } = 1e-8;
    public double AlphaMin { get; set; } = 1e-16;
    public double AlphaMax { get; set; } = 65536.0;
    public int MaxFev { get; set; } = 100;
}

public class CstepResult
{
    public double StxVal { get; set; }
    public double StxF { get; set; }
    public double StxDg { get; set; }
    public double StyVal { get; set; }
    public double StyF { get; set; }
    public double StyDg { get; set; }
    public double Alpha { get; set; }
    public bool Bracketed { get; set; }
    public int Info { get; set; }
}

public static class MoreThuente
{
    public static LineSearchResult Search(
        Func<double[], double> f, Func<double[], double[]> grad,
        double[] x, double[] d, double fx, double[] gx,
        MoreThuenteOptions? options = null)
    {
        double fTol = options?.FTol ?? 1e-4;
        double gtol = options?.GTol ?? 0.9;
        double xTol = options?.XTol ?? 1e-8;
        double alphaMin = options?.AlphaMin ?? 1e-16;
        double alphaMax = options?.AlphaMax ?? 65536.0;
        int maxFev = options?.MaxFev ?? 100;

        double dphi0 = VecOps.Dot(gx, d);
        int functionCalls = 0;
        int gradientCalls = 0;

        (double phi, double dphi, double[] g) EvalPhiDphi(double a)
        {
            double[] xNew = VecOps.AddScaled(x, d, a);
            double phi = f(xNew);
            double[] g = grad(xNew);
            functionCalls++;
            gradientCalls++;
            return (phi, VecOps.Dot(g, d), g);
        }

        bool bracketed = false;
        bool stage1 = true;
        double dgtest = fTol * dphi0;

        double stx = 0, fstx = fx, dgx = dphi0;
        double sty = 0, fsty = fx, dgy = dphi0;
        double width = alphaMax - alphaMin;
        double width1 = 2 * width;

        double alpha = Math.Max(alphaMin, Math.Min(1.0, alphaMax));
        var (fAlpha, dgAlpha, gAlpha) = EvalPhiDphi(alpha);

        int iterFinite = 0;
        while ((!double.IsFinite(fAlpha) || !double.IsFinite(dgAlpha)) && iterFinite < 50)
        {
            iterFinite++;
            alpha /= 2;
            (fAlpha, dgAlpha, gAlpha) = EvalPhiDphi(alpha);
            stx = (7.0 / 8.0) * alpha;
        }

        int infoCstep = 1;
        int info = 0;

        for (int iter = 0; ; iter++)
        {
            double stmin, stmax;
            if (bracketed)
            {
                stmin = Math.Min(stx, sty);
                stmax = Math.Max(stx, sty);
            }
            else
            {
                stmin = stx;
                stmax = alpha + 4 * (alpha - stx);
            }

            stmin = Math.Max(alphaMin, stmin);
            stmax = Math.Min(alphaMax, stmax);
            alpha = Math.Max(alpha, alphaMin);
            alpha = Math.Min(alpha, alphaMax);

            if ((bracketed && (alpha <= stmin || alpha >= stmax)) ||
                functionCalls >= maxFev - 1 || infoCstep == 0 ||
                (bracketed && stmax - stmin <= xTol * stmax))
            {
                alpha = stx;
            }

            (fAlpha, dgAlpha, gAlpha) = EvalPhiDphi(alpha);
            double ftest1 = fx + alpha * dgtest;

            if ((bracketed && (alpha <= stmin || alpha >= stmax)) || infoCstep == 0)
                info = 6;
            if (alpha == alphaMax && fAlpha <= ftest1 && dgAlpha <= dgtest)
                info = 5;
            if (alpha == alphaMin && (fAlpha > ftest1 || dgAlpha >= dgtest))
                info = 4;
            if (functionCalls >= maxFev)
                info = 3;
            if (bracketed && stmax - stmin <= xTol * stmax)
                info = 2;
            if (fAlpha <= ftest1 && Math.Abs(dgAlpha) <= -gtol * dphi0)
                info = 1;

            if (info != 0) break;

            if (stage1 && fAlpha <= ftest1 && dgAlpha >= Math.Min(fTol, gtol) * dphi0)
                stage1 = false;

            CstepResult result;
            if (stage1 && fAlpha <= fstx && fAlpha > ftest1)
            {
                double fm = fAlpha - alpha * dgtest;
                double fxm = fstx - stx * dgtest;
                double fym = fsty - sty * dgtest;
                double dgm = dgAlpha - dgtest;
                double dgxm = dgx - dgtest;
                double dgym = dgy - dgtest;

                result = Cstep(stx, fxm, dgxm, sty, fym, dgym, alpha, fm, dgm, bracketed, stmin, stmax);

                fstx = result.StxF + result.StxVal * dgtest;
                fsty = result.StyF + result.StyVal * dgtest;
                dgx = result.StxDg + dgtest;
                dgy = result.StyDg + dgtest;
                stx = result.StxVal;
                sty = result.StyVal;
            }
            else
            {
                result = Cstep(stx, fstx, dgx, sty, fsty, dgy, alpha, fAlpha, dgAlpha, bracketed, stmin, stmax);
                stx = result.StxVal;
                fstx = result.StxF;
                dgx = result.StxDg;
                sty = result.StyVal;
                fsty = result.StyF;
                dgy = result.StyDg;
            }

            alpha = result.Alpha;
            bracketed = result.Bracketed;
            infoCstep = result.Info;

            if (bracketed)
            {
                if (Math.Abs(sty - stx) >= (2.0 / 3.0) * width1)
                    alpha = stx + (sty - stx) / 2;
                width1 = width;
                width = Math.Abs(sty - stx);
            }
        }

        return new LineSearchResult
        {
            Alpha = alpha, FNew = fAlpha, GNew = gAlpha,
            FunctionCalls = functionCalls, GradientCalls = gradientCalls,
            Success = info == 1
        };
    }

    public static CstepResult Cstep(
        double stx, double fstx, double dgx,
        double sty, double fsty, double dgy,
        double alpha, double f, double dg,
        bool bracketed, double stmin, double stmax)
    {
        int info = 0;
        bool bound;
        double sgnd = dg * (dgx / Math.Abs(dgx));
        double alphaf;

        if (f > fstx)
        {
            info = 1; bound = true;
            double theta2 = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
            double s = Math.Max(Math.Abs(theta2), Math.Max(Math.Abs(dgx), Math.Abs(dg)));
            double gammaSign = alpha < stx ? -1 : 1;
            double gamma2 = gammaSign * s * Math.Sqrt(Math.Pow(theta2 / s, 2) - (dgx / s) * (dg / s));
            double p = gamma2 - dgx + theta2;
            double q = gamma2 - dgx + gamma2 + dg;
            double r = p / q;
            double alphac = stx + r * (alpha - stx);
            double alphaq = stx + (dgx / ((fstx - f) / (alpha - stx) + dgx)) / 2 * (alpha - stx);
            alphaf = Math.Abs(alphac - stx) < Math.Abs(alphaq - stx) ? alphac : (alphac + alphaq) / 2;
            bracketed = true;
        }
        else if (sgnd < 0)
        {
            info = 2; bound = false;
            double theta2 = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
            double s = Math.Max(Math.Abs(theta2), Math.Max(Math.Abs(dgx), Math.Abs(dg)));
            double gammaSign = alpha > stx ? -1 : 1;
            double gamma2 = gammaSign * s * Math.Sqrt(Math.Pow(theta2 / s, 2) - (dgx / s) * (dg / s));
            double p = gamma2 - dg + theta2;
            double q = gamma2 - dg + gamma2 + dgx;
            double r = p / q;
            double alphac = alpha + r * (stx - alpha);
            double alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);
            alphaf = Math.Abs(alphac - alpha) > Math.Abs(alphaq - alpha) ? alphac : alphaq;
            bracketed = true;
        }
        else if (Math.Abs(dg) < Math.Abs(dgx))
        {
            info = 3; bound = true;
            double theta2 = 3 * (fstx - f) / (alpha - stx) + dgx + dg;
            double s = Math.Max(Math.Abs(theta2), Math.Max(Math.Abs(dgx), Math.Abs(dg)));
            double gammaArg = Math.Max(0, Math.Pow(theta2 / s, 2) - (dgx / s) * (dg / s));
            double gammaSign = alpha > stx ? -1 : 1;
            double gamma2 = gammaSign * s * Math.Sqrt(gammaArg);
            double p = gamma2 - dg + theta2;
            double q = gamma2 + dgx - dg + gamma2;
            double r = p / q;

            double alphac;
            if (r < 0 && gamma2 != 0)
                alphac = alpha + r * (stx - alpha);
            else if (alpha > stx)
                alphac = stmax;
            else
                alphac = stmin;

            double alphaq = alpha + (dg / (dg - dgx)) * (stx - alpha);
            if (bracketed)
                alphaf = Math.Abs(alpha - alphac) < Math.Abs(alpha - alphaq) ? alphac : alphaq;
            else
                alphaf = Math.Abs(alpha - alphac) > Math.Abs(alpha - alphaq) ? alphac : alphaq;
        }
        else
        {
            info = 4; bound = false;
            if (bracketed)
            {
                double theta2 = 3 * (f - fsty) / (sty - alpha) + dgy + dg;
                double s = Math.Max(Math.Abs(theta2), Math.Max(Math.Abs(dgy), Math.Abs(dg)));
                double gammaSign = alpha > sty ? -1 : 1;
                double gamma2 = gammaSign * s * Math.Sqrt(Math.Pow(theta2 / s, 2) - (dgy / s) * (dg / s));
                double p = gamma2 - dg + theta2;
                double q = gamma2 - dg + gamma2 + dgy;
                double r = p / q;
                alphaf = alpha + r * (sty - alpha);
            }
            else if (alpha > stx)
                alphaf = stmax;
            else
                alphaf = stmin;
        }

        double newStx = stx, newFstx = fstx, newDgx = dgx;
        double newSty = sty, newFsty = fsty, newDgy = dgy;

        if (f > fstx)
        {
            newSty = alpha; newFsty = f; newDgy = dg;
        }
        else
        {
            if (sgnd < 0) { newSty = stx; newFsty = fstx; newDgy = dgx; }
            newStx = alpha; newFstx = f; newDgx = dg;
        }

        alphaf = Math.Min(stmax, alphaf);
        alphaf = Math.Max(stmin, alphaf);

        if (bracketed && bound)
        {
            if (newSty > newStx)
                alphaf = Math.Min(newStx + (2.0 / 3.0) * (newSty - newStx), alphaf);
            else
                alphaf = Math.Max(newStx + (2.0 / 3.0) * (newSty - newStx), alphaf);
        }

        return new CstepResult
        {
            StxVal = newStx, StxF = newFstx, StxDg = newDgx,
            StyVal = newSty, StyF = newFsty, StyDg = newDgy,
            Alpha = alphaf, Bracketed = bracketed, Info = info
        };
    }
}
