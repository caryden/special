# when-words — Benchmark Workloads

Language-agnostic workload definitions for relative performance measurement.
These are **not** behavioral specs — they define what to time.

## Workloads

| Node | Workload | Iterations | Warmup | Correctness Check |
|------|----------|-----------|--------|-------------------|
| `time-ago` | `timeAgo(1704067200, 1704153600)` | 100,000 | 10,000 | result = "1 day ago" |
| `duration` | `duration(90061)` | 100,000 | 10,000 | result = "1 day, 1 hour" |
| `parse-duration` | `parseDuration("1 day, 2 hours and 30 minutes")` | 100,000 | 10,000 | result = 95400 |
| `human-date` | `humanDate(1704067200, 1704153600)` | 100,000 | 10,000 | result = "Yesterday" |
| `date-range` | `dateRange(1705276800, 1705881600)` | 100,000 | 10,000 | result contains "January" |

### time-ago

```
timestamp = 1704067200    # 2024-01-01 00:00:00 UTC
reference = 1704153600    # 2024-01-02 00:00:00 UTC (1 day later)
expected  = "1 day ago"
```

### duration

```
seconds  = 90061          # 1 day + 1 hour + 1 minute + 1 second
expected = "1 day, 1 hour"  # default max_units=2
```

### parse-duration

```
input    = "1 day, 2 hours and 30 minutes"
expected = 95400          # 86400 + 7200 + 1800
```

### human-date

```
timestamp = 1704067200    # 2024-01-01 00:00:00 UTC
reference = 1704153600    # 2024-01-02 00:00:00 UTC
expected  = "Yesterday"
```

### date-range

```
start    = 1705276800     # 2024-01-15 00:00:00 UTC
end      = 1705881600     # 2024-01-22 00:00:00 UTC
expected = contains "January"  # same-month collapse
```

## Output Format

```json
{"node":"time-ago","language":"<lang>","iterations":100000,"warmup":10000,"wall_clock_ms":{"min":0.0,"median":0.0,"p95":0.0,"max":0.0},"correctness":true}
```
