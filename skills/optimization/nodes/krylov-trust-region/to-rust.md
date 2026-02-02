# krylov-trust-region → Rust

- `KrylovTrustRegionOptions` → struct embedding `OptimizeOptions` with `initial_radius: f64`, `max_radius: f64`, `eta: f64`, etc. Defaults via `Default` trait or builder.
- `steihaug_cg` returns a struct `SteihaugResult { s: Vec<f64>, m_decrease: f64, cg_iters: usize, on_boundary: bool, grad_calls: usize }`.
- Hessian-vector product: `hessian_vector_product(grad, &x, &v, &gx) -> Vec<f64>`. The `grad` parameter is `&dyn Fn(&[f64]) -> Vec<f64>` or `&mut dyn FnMut`.
- `boundary_tau` → pure function returning `f64`. Use `disc.max(0.0).sqrt()` for the discriminant.
- Inner CG loop uses mutable `z`, `r`, `d` vectors (all `Vec<f64>`). Update in-place with index loops.
- `norm2` → `v.iter().map(|x| x * x).sum::<f64>()`.
- Trust region acceptance: `if rho > eta { ... }` accepts the step; update x, fx, gx and check convergence.
- Rejected step: check `if radius < 1e-15` for termination.
- Return `OptimizeResult { gradient: Some(gx), ... }`.
