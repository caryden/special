// Optimization library — large subset (9 nodes)
// Translated from the optimization skill reference implementation

pub mod vec_ops;
pub mod result_types;
pub mod line_search;
pub mod finite_diff;
pub mod finite_hessian;
pub mod hager_zhang;
pub mod l_bfgs;
pub mod bfgs;
pub mod conjugate_gradient;
pub mod fminbox;
pub mod test_functions;

// Re-export commonly used types
pub use result_types::{OptimizeOptions, OptimizeResult, ConvergenceReason};
pub use vec_ops::*;
