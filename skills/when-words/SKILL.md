---
name: when-words
description: Generate native human-friendly date and time formatting — relative time, durations, date parsing, date ranges — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] — e.g. 'time-ago --lang python' or 'all --lang rust'"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# when-words

Human-friendly date and time formatting as pure functions. Converts timestamps to
relative phrases ("3 hours ago"), duration strings ("2 hours, 30 minutes"), parses
duration input ("2h30m" to seconds), generates contextual date labels ("Yesterday"),
and formats smart date ranges ("January 15 -- February 15, 2024").

## Design principles

- **Pure functions only** — every function takes explicit timestamps or values; no
  function ever accesses the system clock.
- **UTC throughout** — all calendar math uses UTC. No timezone handling.
- **No inter-node dependencies** — each node is a standalone leaf function.
- **Clarity over performance** — reference code prioritizes readability.

## Node graph

All 5 nodes are **leaf nodes** with no inter-node dependencies:

```
time-ago          (standalone)
duration          (standalone)
parse-duration    (standalone)
human-date        (standalone)
date-range        (standalone)
```

## Node table

| Node | Function | Purpose | Tests |
|------|----------|---------|-------|
| `time-ago` | `timeAgo(timestamp, reference)` | Relative time string ("3 hours ago", "in 2 days") | 35 |
| `duration` | `duration(seconds, options?)` | Format seconds as human duration ("2 hours, 30 minutes") | 22 |
| `parse-duration` | `parseDuration(input)` | Parse duration string to seconds ("2h30m" to 9000) | 24 |
| `human-date` | `humanDate(timestamp, reference)` | Contextual date label ("Yesterday", "March 5") | 18 |
| `date-range` | `dateRange(start, end)` | Smart date range ("January 15--22, 2024") | 9 |

**Total: 5 nodes, ~108 tests, 100% line and function coverage.**

## Subset extraction

Every node is independent — any single node or combination works alone without
pulling in other nodes. Common subsets:

- **time-ago only** — relative timestamps for feeds, notifications
- **duration + parse-duration** — bidirectional duration formatting
- **human-date + date-range** — calendar/scheduling UI labels
- **all** — full library

## Input format

The skill accepts `$ARGUMENTS` in this format:

```
<nodes> [--lang <language>]
```

- `<nodes>` — Space-separated node names, or `all` for the complete library.
  Valid names: `time-ago`, `duration`, `parse-duration`, `human-date`, `date-range`.
- `--lang <language>` — Target language (default: `typescript`).
  Supported: `python`, `rust`, `go`, `typescript`.

Examples:
- `time-ago --lang python`
- `duration parse-duration --lang rust`
- `all --lang go`

## Translation workflow

1. Read this file for overview and node selection
2. Read `nodes/<name>/spec.md` for behavioral spec and test vectors
3. Read `nodes/<name>/to-<lang>.md` for language-specific translation hints
4. Consult `reference/src/<name>.ts` only if the spec is ambiguous

## Error handling

- `duration` throws on negative input
- `parseDuration` throws on: empty string, unrecognized input, negative values,
  bare numbers without units, unrecognized unit names
- `timeAgo`, `humanDate`, `dateRange` are total functions (no error cases)
- `dateRange` auto-swaps if start > end

## Reference info

- **Language:** TypeScript (Bun runtime)
- **Coverage:** 100% line and function coverage
- **Test runner:** `bun test`
- **No external dependencies**
