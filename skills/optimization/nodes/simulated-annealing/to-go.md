# simulated-annealing → Go

- `SimulatedAnnealingOptions` struct; `Temperature func(int) float64`, `Neighbor func([]float64, func() float64) []float64`, `Seed *uint32` (nil = use `math/rand`).
- `LogTemperature(k int) float64` — `1.0 / math.Log(float64(k))`.
- `Mulberry32(seed uint32) func() float64` — use `uint32` arithmetic; Go wraps unsigned overflow naturally.
- Box-Muller: `math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)` — loop while `u1 == 0`.
- Metropolis: `math.Exp(-(fProposal - fCurrent) / t)` — compare with `rng()`.
- Track `xBest` and `fBest` separately; copy proposal with `copy(xBest, xProposal)`.
- Return `OptimizeResult{Gradient: nil, GradientCalls: 0, Converged: true, ...}`.
- `FunctionCalls = maxIterations + 1`.
- No gradient logic — SA is entirely derivative-free.
