#!/usr/bin/env julia
#
# Cross-validation script: Optim.jl v2.0.0
# Runs all 6 test functions × 5 methods (30 runs) and saves results as JSON.
#
# Gradients: analytic for all except Goldstein-Price which uses ForwardDiff autodiff.
#

using Optim, JSON, Printf, ForwardDiff

# === Test functions (matching our reference implementations exactly) ===

sphere(x) = x[1]^2 + x[2]^2
sphere_g!(G, x) = (G[1] = 2x[1]; G[2] = 2x[2])

booth(x) = (x[1] + 2x[2] - 7)^2 + (2x[1] + x[2] - 5)^2
booth_g!(G, x) = (G[1] = 2(x[1] + 2x[2] - 7) + 4(2x[1] + x[2] - 5);
                  G[2] = 4(x[1] + 2x[2] - 7) + 2(2x[1] + x[2] - 5))

rosenbrock(x) = 100(x[2] - x[1]^2)^2 + (1 - x[1])^2
rosenbrock_g!(G, x) = (G[1] = -400x[1]*(x[2] - x[1]^2) - 2(1 - x[1]);
                       G[2] = 200(x[2] - x[1]^2))

beale(x) = (1.5 - x[1] + x[1]*x[2])^2 + (2.25 - x[1] + x[1]*x[2]^2)^2 + (2.625 - x[1] + x[1]*x[2]^3)^2
beale_g!(G, x) = begin
    t1 = 1.5 - x[1] + x[1]*x[2]
    t2 = 2.25 - x[1] + x[1]*x[2]^2
    t3 = 2.625 - x[1] + x[1]*x[2]^3
    G[1] = 2t1*(-1 + x[2]) + 2t2*(-1 + x[2]^2) + 2t3*(-1 + x[2]^3)
    G[2] = 2t1*x[1] + 2t2*(2x[1]*x[2]) + 2t3*(3x[1]*x[2]^2)
end

himmelblau(x) = (x[1]^2 + x[2] - 11)^2 + (x[1] + x[2]^2 - 7)^2
himmelblau_g!(G, x) = (G[1] = 4x[1]*(x[1]^2 + x[2] - 11) + 2(x[1] + x[2]^2 - 7);
                       G[2] = 2(x[1]^2 + x[2] - 11) + 4x[2]*(x[1] + x[2]^2 - 7))

goldstein_price(x) = begin
    a = 1 + (x[1] + x[2] + 1)^2 * (19 - 14x[1] + 3x[1]^2 - 14x[2] + 6x[1]*x[2] + 3x[2]^2)
    b = 30 + (2x[1] - 3x[2])^2 * (18 - 32x[1] + 12x[1]^2 + 48x[2] - 36x[1]*x[2] + 27x[2]^2)
    a * b
end
# Use ForwardDiff for Goldstein-Price (complex analytical gradient)
goldstein_price_g!(G, x) = begin
    g = ForwardDiff.gradient(goldstein_price, x)
    G[1] = g[1]
    G[2] = g[2]
end

# === Hessians (for Newton and NewtonTrustRegion) ===

sphere_h!(H, x) = (H[1,1] = 2.0; H[1,2] = 0.0; H[2,1] = 0.0; H[2,2] = 2.0)

booth_h!(H, x) = (H[1,1] = 10.0; H[1,2] = 8.0; H[2,1] = 8.0; H[2,2] = 10.0)

rosenbrock_h!(H, x) = begin
    H[1,1] = 1200x[1]^2 - 400x[2] + 2
    H[1,2] = -400x[1]
    H[2,1] = -400x[1]
    H[2,2] = 200.0
end

# Use ForwardDiff Hessian for beale, himmelblau, goldstein_price
beale_h!(H, x) = begin
    Hd = ForwardDiff.hessian(beale, x)
    H .= Hd
end

himmelblau_h!(H, x) = begin
    Hd = ForwardDiff.hessian(himmelblau, x)
    H .= Hd
end

goldstein_price_h!(H, x) = begin
    Hd = ForwardDiff.hessian(goldstein_price, x)
    H .= Hd
end

# === Test configurations ===

functions = [
    ("sphere", sphere, sphere_g!, sphere_h!, [5.0, 5.0]),
    ("booth", booth, booth_g!, booth_h!, [0.0, 0.0]),
    ("rosenbrock", rosenbrock, rosenbrock_g!, rosenbrock_h!, [-1.2, 1.0]),
    ("beale", beale, beale_g!, beale_h!, [0.0, 0.0]),
    ("himmelblau", himmelblau, himmelblau_g!, himmelblau_h!, [0.0, 0.0]),
    ("goldstein_price", goldstein_price, goldstein_price_g!, goldstein_price_h!, [0.0, -0.5]),
]

methods_with_grad = [
    ("BFGS", BFGS()),
    ("LBFGS", LBFGS()),
    ("GradientDescent", GradientDescent()),
    ("ConjugateGradient", ConjugateGradient()),
]

methods_with_hessian = [
    ("Newton", Newton()),
    ("NewtonTrustRegion", NewtonTrustRegion()),
]

results = Dict()

for (name, f, g!, h!, x0) in functions
    results[name] = Dict()

    # Methods requiring gradient
    for (mname, m) in methods_with_grad
        try
            res = optimize(f, g!, x0, m, Optim.Options(iterations=1000, g_tol=1e-8))
            results[name][mname] = Dict(
                "x" => Optim.minimizer(res),
                "fun" => Optim.minimum(res),
                "iterations" => Optim.iterations(res),
                "converged" => Optim.converged(res),
                "f_calls" => Optim.f_calls(res),
                "g_calls" => Optim.g_calls(res),
            )
        catch e
            results[name][mname] = Dict("error" => string(e))
        end
    end

    # Methods requiring gradient + Hessian
    for (mname, m) in methods_with_hessian
        try
            res = optimize(f, g!, h!, x0, m, Optim.Options(iterations=1000, g_tol=1e-8))
            results[name][mname] = Dict(
                "x" => Optim.minimizer(res),
                "fun" => Optim.minimum(res),
                "iterations" => Optim.iterations(res),
                "converged" => Optim.converged(res),
                "f_calls" => Optim.f_calls(res),
                "g_calls" => Optim.g_calls(res),
            )
        catch e
            results[name][mname] = Dict("error" => string(e))
        end
    end

    # Nelder-Mead (no gradient needed)
    try
        res = optimize(f, x0, NelderMead(), Optim.Options(iterations=5000))
        results[name]["NelderMead"] = Dict(
            "x" => Optim.minimizer(res),
            "fun" => Optim.minimum(res),
            "iterations" => Optim.iterations(res),
            "converged" => Optim.converged(res),
            "f_calls" => Optim.f_calls(res),
        )
    catch e
        results[name]["NelderMead"] = Dict("error" => string(e))
    end
end

# Write results
output_path = joinpath(@__DIR__, "..", "skills", "optimization", "reference", "julia-validation.json")
open(output_path, "w") do io
    JSON.print(io, results, 2)
end

println("Results written to $output_path")
println()

# Print summary table
println("=" ^ 100)
println("SUMMARY: Optim.jl v$(pkgversion(Optim)) Cross-Validation Results")
println("=" ^ 100)

for (name, _, _, _, _) in functions
    println("\n--- $name ---")
    for method in ["BFGS", "LBFGS", "GradientDescent", "ConjugateGradient", "Newton", "NewtonTrustRegion", "NelderMead"]
        if haskey(results[name], method)
            r = results[name][method]
            if haskey(r, "error")
                println("  $method: ERROR - $(r["error"])")
            else
                conv = r["converged"] ? "✓" : "✗"
                line = @sprintf("  %-20s  conv=%s  fun=%.3e  iter=%d  x=[%.6f, %.6f]",
                    method, conv, r["fun"], r["iterations"], r["x"][1], r["x"][2])
                println(line)
            end
        end
    end
end
