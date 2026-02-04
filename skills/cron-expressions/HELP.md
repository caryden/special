# cron-expressions — Help Guide

This guide helps you choose the right nodes and target language for your use case.

## Quick Start

If you already know what you need:
- **Parse only**: `parser --lang <language>`
- **Match datetimes**: `matcher --lang <language>`
- **Find next occurrence**: `next-occurrence --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

### 1. What is your use case?

| Use Case | Recommended Nodes | Why |
|----------|------------------|-----|
| Parse cron strings to validate syntax | `parser` | Parses and validates — throws on invalid expressions |
| Check if a datetime matches a schedule | `matcher` (+ `parser` if starting from string) | Tests datetime against a parsed CronExpression |
| Find when a cron job will run next | `next-occurrence` (+ `parser`) | Finds next matching datetime after a reference time |
| List upcoming N occurrences | `iterator` (+ `parser`) | `nextN` returns an array of future matches |
| Build a full scheduler | `cron-schedule` (= `all`) | Complete API with parse, match, next, prev, iterate |
| Validate cron expressions in a UI | `parser` | Throws descriptive errors on invalid syntax |

### 2. Do you need the full API or a subset?

Most users want `cron-schedule` (the root node), which bundles everything.
Use subsets when:
- You only need to validate cron syntax (just `parser`)
- You already have a parsed CronExpression and only need matching (`matcher`)
- You're embedding in a constrained environment and want minimal code

### 3. What language / platform?

| Language | Notes |
|----------|-------|
| Python | Use `datetime` stdlib for UTC date math. Translation hints available. |
| Rust | Use `chrono` crate or manual UTC date math. Translation hints available. |
| Go | Use `time` package. Translation hints available. |
| TypeScript | Direct copy of reference — no translation needed. |
| Other | The spec.md files are language-agnostic. Any language with UTC date support can implement them. |

## Node Recipes

Pre-computed dependency sets for common subsets.

### Validate cron syntax

```
parser --lang <language>
```

4 nodes (parser + 3 dependencies). Parse a cron string and throw on errors.

### Match a datetime against a schedule

```
matcher --lang <language>
```

2 nodes (matcher + cron-types + field-range). Test if a UTC Date matches a
pre-parsed CronExpression.

### Find next/previous occurrence

```
next-occurrence --lang <language>
```

5 nodes. Find when a cron expression will fire next (or last fired).

### Full scheduler

```
all --lang <language>
```

All 8 nodes. Complete cron scheduling with parse, match, next, prev, and iterate.

## Key Semantics to Know

### Vixie union rule

When both day-of-month AND day-of-week are set (not `*`), cron matches
if **either** condition is true (OR/union). This surprises most people
who expect AND/intersection.

`0 0 15 * 5` fires on the 15th **and** on every Friday, not just Friday the 15th.

### Sunday = 0 and 7

Both `0` and `7` represent Sunday. The parser normalizes `7` to `0`.

### L, W, # modifiers

- `L` in day-of-month: last day of month
- `5L` in day-of-week: last Friday of month
- `5#3` in day-of-week: third Friday of month
- `15W` in day-of-month: nearest weekday to 15th (never crosses month boundary)

## Frequently Asked Questions

**Q: Does this handle timezones?**
A: No. All functions work with UTC. Timezone conversion is a separate concern —
apply it before/after calling these functions.

**Q: Does this support 6-field cron (with seconds)?**
A: No. This implements standard 5-field cron (minute, hour, day-of-month, month,
day-of-week). Six-field support could be added as an extension.

**Q: Can I add nodes later?**
A: Yes. Each node has explicit dependencies. Generate additional nodes at any
time — just include their dependencies.

**Q: What if my language isn't listed?**
A: The spec.md files are language-agnostic behavioral specifications with test
vectors. Any language can implement them. The to-<lang>.md hints just accelerate
translation for the listed languages.

**Q: What happens if a cron expression can never match (e.g., Feb 31)?**
A: `nextOccurrence` and `prevOccurrence` return `null` after scanning ~1 year
without finding a match. `cronIterator` stops yielding.
