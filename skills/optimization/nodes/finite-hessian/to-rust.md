# finite-hessian → Rust

- Hessian as `Vec<Vec<f64>>` (n×n). Initialize with `vec![vec![0.0; n]; n]`.
- Step size constant: `const FOURTH_ROOT_EPS: f64 = 1.220703125e-4;` (precomputed `f64::EPSILON.powf(0.25)`).
- Per-dimension step: `h[i] = FOURTH_ROOT_EPS * x[i].abs().max(1.0)`.
- Perturb by cloning `x` into a mutable `Vec<f64>`, modifying the index, then restoring.
- Off-diagonal: loop `j in (i+1)..n`, mirror with `H[j][i] = H[i][j]`.
- `hessian_vector_product` takes `grad: &dyn Fn(&[f64]) -> Vec<f64>`, `x: &[f64]`, `v: &[f64]`, `gx: &[f64]`.
- Compute `v_norm` via manual loop or `v.iter().map(|vi| vi*vi).sum::<f64>().sqrt()`.
