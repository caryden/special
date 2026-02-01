# minimize → Go

- `Method` → `type Method string` with constants: `MethodNelderMead`, `MethodGradientDescent`, `MethodBFGS`, `MethodLBFGS`.
- `MinimizeOptions` → struct with `Method Method`, `Grad func([]float64) []float64`, plus `OptimizeOptions` fields.
- Default method: check if `opts.Method == ""`, then pick based on whether `opts.Grad != nil`.
- Switch on method string. Return error or panic for unknown method (Go convention: return `OptimizeResult` with error message).
