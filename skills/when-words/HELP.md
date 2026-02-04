# when-words — Help Guide

This guide helps you choose the right nodes and target language for your use case.

## Quick Start

If you already know what you need:
- **Relative timestamps**: `time-ago --lang <language>`
- **Duration formatting**: `duration --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

### 1. What is your use case?

| Use Case | Recommended Nodes | Why |
|----------|------------------|-----|
| "3 hours ago" / "in 2 days" labels | `time-ago` | Relative time strings for feeds, notifications, activity logs. |
| "2 hours, 30 minutes" display | `duration` | Format a number of seconds into a human-readable duration string. |
| Parse "2h30m" from user input | `parse-duration` | Convert human duration strings back to seconds. |
| "Yesterday" / "March 5" labels | `human-date` | Contextual date labels that adapt based on proximity to a reference date. |
| "January 15--22, 2024" ranges | `date-range` | Smart date range formatting that collapses shared components. |
| Bidirectional duration handling | `duration parse-duration` | Format seconds to string and parse string back to seconds. |
| Calendar/scheduling UI | `human-date date-range` | Contextual dates plus smart range formatting. |
| Everything | `all` | All 5 nodes. |

### 2. Do you need multiple nodes?

All 5 nodes are **completely independent** — no node depends on any other.
Pick exactly the ones you need. There's no penalty for requesting a subset
and no hidden dependencies to worry about.

### 3. What language / platform?

| Language | Notes |
|----------|-------|
| Python | Use `datetime` stdlib for calendar math. `int` timestamps (epoch seconds). Translation hints available. |
| Rust | Manual civil date calculations from epoch (no `chrono` crate). Translation hints available. |
| Go | Use `time` package. Translation hints available. |
| TypeScript | Direct copy of reference — no translation needed. |
| Other | The spec.md files are language-agnostic. Any language with epoch-second timestamps and basic date math can implement them. |

<details>
<summary><strong>Relative Performance</strong></summary>

Approximate relative wall-clock time (1.0x = median language). Lower is faster.

| Language   | time-ago | duration | parse-duration | human-date | date-range |
|------------|----------|----------|----------------|------------|------------|
| Rust       | 1.0x     | 0.5x     | 0.3x           | 0.3x       | 0.6x       |
| TypeScript | 1.0x     | 0.5x     | 0.5x           | 1.0x       | 0.4x       |
| Go         | 1.0x     | 1.0x     | 1.0x           | 0.7x       | 1.0x       |
| Python     | 4.5x     | 5.3x     | 3.5x           | 7.0x       | 6.2x       |

*Measured 2026-02-03. Workloads defined in benchmark.md.*

</details>

## Node Recipes

All nodes are standalone, so recipes are straightforward.

### Relative timestamps for a feed

```
time-ago --lang <language>
```

1 node. Takes a timestamp and reference time, returns "3 hours ago" or "in 2 days".

### Duration display and input

```
duration parse-duration --lang <language>
```

2 nodes. Format seconds as "2 hours, 30 minutes" and parse "2h30m" back to 9000.

### Contextual date labels

```
human-date date-range --lang <language>
```

2 nodes. "Yesterday", "March 5" for single dates; "January 15--22, 2024" for ranges.

### Full library

```
all --lang <language>
```

All 5 nodes. Complete date/time formatting toolkit.

## Frequently Asked Questions

**Q: Do these functions access the system clock?**
A: No. Every function takes explicit timestamps as arguments. They are pure
functions with no side effects or implicit state.

**Q: What timezone do they use?**
A: UTC throughout. No timezone handling is included — all calendar math uses UTC.

**Q: Can I add nodes later?**
A: Yes. Since all nodes are independent, you can generate any node at any time
without worrying about dependencies.

**Q: What if my language isn't listed?**
A: The spec.md files are language-agnostic behavioral specifications with test
vectors. Any language can implement them. The to-<lang>.md hints just accelerate
translation for the listed languages.
