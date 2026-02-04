# Math Expression Parser — Benchmark Workloads

Language-agnostic workload definitions for relative performance measurement.
These are **not** behavioral specs — they define what to time.

## Workloads

| Node | Workload | Iterations | Warmup | Correctness Check |
|------|----------|-----------|--------|-------------------|
| `evaluate` | `"((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3"` | 10,000 | 1,000 | result ≈ 92.592 within 1e-6 |

### evaluate

```
expression = "((2.5 + 3.1) * 4 - 1) ** 2 / 5 + 7 % 3"
expected   = 92.592
```

Derivation: `(2.5 + 3.1) = 5.6` → `5.6 * 4 = 22.4` → `22.4 - 1 = 21.4` →
`21.4 ** 2 = 457.96` → `457.96 / 5 = 91.592` → `7 % 3 = 1` → `91.592 + 1 = 92.592`

## Output Format

```json
{"node":"evaluate","language":"<lang>","iterations":10000,"warmup":1000,"wall_clock_ms":{"min":0.0,"median":0.0,"p95":0.0,"max":0.0},"correctness":true}
```
