---
name: cron-expressions
description: Generate native cron expression parsing, matching, and scheduling — recurring time patterns, crontab semantics, next-occurrence calculation — from a verified TypeScript reference
argument-hint: "<nodes> [--lang <language>] or 'help' — specify nodes to generate, target language, or get guidance"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
---

# cron-expressions

Parse, validate, match, and iterate over standard cron expressions as pure functions.
Supports 5-field cron format with Vixie extensions (L, W, #) and correct semantics
for every edge case that libraries disagree on.

## Design principles

- **Pure functions only** — every function takes explicit inputs; no global state.
- **UTC throughout** — all datetime math uses UTC. No timezone handling.
- **Vixie cron semantics** — follows Vixie cron 4.1 conventions, documented with
  provenance for every design decision.
- **Clarity over performance** — reference code prioritizes readability.
  Minute-scanning is used for next-occurrence rather than optimized field-walking.

## Input

`$ARGUMENTS` accepts:
- **`help`**: Interactive guide to choosing the right nodes and language for your use case
- **Nodes**: space-separated node names to generate (or `all` for the full library)
- **--lang \<language\>**: target language (default: `typescript`). Supported: `python`, `rust`, `go`, `typescript`

Examples:
- `help` — walk through choosing which nodes you need
- `matcher` — generate matcher + dependencies in TypeScript
- `next-occurrence --lang python` — generate next-occurrence + dependencies in Python
- `all --lang rust` — generate the full library in Rust

## Handling `help`

When `$ARGUMENTS` is `help`, read `HELP.md` and use it to guide the user through
node and language selection. The help guide contains a decision tree and common
use-case recipes. Walk through it interactively, asking the user about their
requirements, then recommend specific nodes and a target language.

## Node Graph

```
cron-types ────────────────┬──► tokenizer ──► parser ──┐
  (leaf)                   │       (leaf)    (internal) │
                           │                           │
field-range ───────────────┤──────────────► matcher ────┤
  (leaf)                   │               (internal)   │
                           │                   │        │
                           │          next-occurrence ──┤
                           │             (internal)     │
                           │                   │        │
                           │              iterator ─────┤
                           │             (internal)     │
                           │                            │
                           └───────────► cron-schedule ─┘
                                           (root)
```

### Nodes

| Node | Type | Depends On | Description |
|------|------|-----------|-------------|
| `cron-types` | leaf | — | CronFieldEntry, CronField, CronExpression type definitions and factories |
| `field-range` | leaf | — | Valid ranges per field, month/day-of-week aliases, last-day-of-month calculation |
| `tokenizer` | leaf | — | Splits cron string into 5 field strings |
| `parser` | internal | cron-types, field-range, tokenizer | Parses field strings into CronExpression AST |
| `matcher` | internal | cron-types, field-range | Tests whether a UTC datetime matches a CronExpression |
| `next-occurrence` | internal | cron-types, matcher | Finds next/previous datetime matching a CronExpression |
| `iterator` | internal | cron-types, next-occurrence | Lazy iteration over matching datetimes; nextN convenience |
| `cron-schedule` | root | cron-types, parser, matcher, next-occurrence, iterator | Public API: parse, match, next, prev, nextN, iterate |

### Subset Extraction

- **Parse only**: `cron-types` + `field-range` + `tokenizer` + `parser`
- **Match a datetime**: `cron-types` + `field-range` + `matcher` (+ parser if starting from string)
- **Find next occurrence**: add `next-occurrence` to the match subset
- **Iterate over occurrences**: add `iterator` to the next-occurrence subset
- **Full library**: all 8 nodes via `cron-schedule`

## Key Design Decisions

### Day-of-month / day-of-week interaction (THE critical decision)

@provenance Vixie cron 4.1, crontab(5) man page

When **both** day-of-month and day-of-week are restricted (not wildcard), the match
uses **union (OR)** — matching either field is sufficient. This is the Vixie cron
convention, which differs from what most people expect (intersection/AND).

| Expression | Matches | Rule |
|------------|---------|------|
| `0 0 15 * 5` | 15th of any month **OR** any Friday | Union (both restricted) |
| `0 0 15 * *` | 15th of any month | Only DoM restricted |
| `0 0 * * 5` | Every Friday | Only DoW restricted |

### Sunday representation

@provenance POSIX.1-2017 crontab(5), Vixie cron 4.1

| Input | Normalized | Notes |
|-------|-----------|-------|
| `0` | `0` (Sunday) | POSIX standard |
| `7` | `0` (Sunday) | Vixie extension — both 0 and 7 mean Sunday |
| `SUN` | `0` (Sunday) | Case-insensitive alias |

### Field modifiers

| Modifier | Valid In | Meaning | Source |
|----------|---------|---------|--------|
| `L` | dayOfMonth | Last day of month | Quartz, spring-cron |
| `nL` | dayOfWeek | Last nth-day of month (e.g., `5L` = last Friday) | Quartz |
| `n#n` | dayOfWeek | Nth weekday of month (e.g., `5#3` = third Friday) | Quartz |
| `nW` | dayOfMonth | Nearest weekday to nth day (never crosses month boundary) | Quartz |

### Nearest weekday (W) boundary rules

@provenance Quartz scheduler W modifier semantics

| Scenario | Resolution |
|----------|-----------|
| Target is a weekday | Use target as-is |
| Target is Saturday, not 1st | Use Friday (target - 1) |
| 1st is Saturday | Use Monday the 3rd (can't go to previous month) |
| Target is Sunday, not last day | Use Monday (target + 1) |
| Last day is Sunday | Use Friday (target - 2, can't go to next month) |

## Process

1. If `$ARGUMENTS` is `help`, read `HELP.md` and guide the user interactively
2. Read this file for the node graph and design decisions
3. For each requested node (in dependency order), read `nodes/<name>/spec.md`
4. Read `nodes/<name>/to-<lang>.md` for target-language translation hints
5. Generate implementation + tests
6. If the spec is ambiguous, consult `reference/src/<name>.ts` (track what you consulted and why)
7. Run tests — all must pass before proceeding to the next node

## Error Handling

- `tokenize` throws on empty/whitespace input or wrong field count (not 5)
- `parseCron` throws on: out-of-range values, invalid step values (0 or negative),
  unrecognized tokens, invalid nth values (#0 or #6+)
- `matchesCron` is a total function (no error cases)
- `nextOccurrence` / `prevOccurrence` return `null` if no match within ~1 year
- `cronSchedule` throws on invalid expressions (delegates to parseCron)

## Reference

The TypeScript reference implementation is in `reference/src/`. It is the
authoritative source — consult it when specs are ambiguous, but prefer the
spec and translation hints as primary sources.

All reference code has 100% line and function coverage via `bun test --coverage`.
