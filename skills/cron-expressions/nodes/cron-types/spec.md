# cron-types — Spec

Depends on: none (leaf node)

## Purpose

Define the data structures used throughout cron-expressions: field entries (value, range,
step, last, last-weekday, nth-weekday, nearest-weekday), fields (arrays of entries),
and the complete CronExpression.

## Types

**CronFieldEntry** — a discriminated union with 7 variants:

| Variant | Fields | Example |
|---------|--------|---------|
| `value` | `value: number` | `5` |
| `range` | `start: number, end: number` | `1-5` |
| `step` | `range: CronFieldEntry, step: number` | `*/15` or `1-5/2` |
| `last` | (none) | `L` |
| `last-weekday` | `weekday: number` | `5L` (last Friday) |
| `nth-weekday` | `weekday: number, nth: number` | `5#3` (third Friday) |
| `nearest-weekday` | `day: number` | `15W` |

**CronField** — array of CronFieldEntry (represents comma-separated entries in one field).

**CronExpression** — 5 fields: `minute`, `hour`, `dayOfMonth`, `month`, `dayOfWeek`.

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `valueEntry` | `(value: number) → CronFieldEntry` | Factory for value entry |
| `rangeEntry` | `(start: number, end: number) → CronFieldEntry` | Factory for range entry |
| `stepEntry` | `(range: CronFieldEntry, step: number) → CronFieldEntry` | Factory for step entry |
| `lastEntry` | `() → CronFieldEntry` | Factory for last-day entry |
| `lastWeekdayEntry` | `(weekday: number) → CronFieldEntry` | Factory for last-weekday entry |
| `nthWeekdayEntry` | `(weekday: number, nth: number) → CronFieldEntry` | Factory for nth-weekday entry |
| `nearestWeekdayEntry` | `(day: number) → CronFieldEntry` | Factory for nearest-weekday entry |
| `cronExpression` | `(minute, hour, dayOfMonth, month, dayOfWeek) → CronExpression` | Factory for full expression |

## Test Vectors

| Call | Expected |
|------|----------|
| `valueEntry(5)` | `{ kind: "value", value: 5 }` |
| `rangeEntry(1, 5)` | `{ kind: "range", start: 1, end: 5 }` |
| `stepEntry(rangeEntry(0, 59), 15)` | `{ kind: "step", range: { kind: "range", start: 0, end: 59 }, step: 15 }` |
| `lastEntry()` | `{ kind: "last" }` |
| `lastWeekdayEntry(5)` | `{ kind: "last-weekday", weekday: 5 }` |
| `nthWeekdayEntry(5, 3)` | `{ kind: "nth-weekday", weekday: 5, nth: 3 }` |
| `nearestWeekdayEntry(15)` | `{ kind: "nearest-weekday", day: 15 }` |
