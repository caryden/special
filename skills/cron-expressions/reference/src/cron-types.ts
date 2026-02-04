/**
 * Type definitions for cron expression parsing, matching, and scheduling.
 *
 * Defines the data structures used throughout the cron-expressions skill:
 * CronField represents a single parsed field (minute, hour, etc.),
 * CronExpression is the complete parsed representation.
 *
 * @node cron-types
 * @contract cron-types.test.ts
 * @hint types: These are plain data types with no behavior. Translate as
 *       enums/structs/dataclasses/records in the target language.
 */

/**
 * A single value, range, or stepped range within a cron field.
 *
 * - `{ kind: "value", value: number }` — a single value like `5`
 * - `{ kind: "range", start: number, end: number }` — a range like `1-5`
 * - `{ kind: "step", range: CronFieldEntry, step: number }` — a stepped range like `1-5/2` or `* /5`
 * - `{ kind: "last" }` — `L` (last day of month)
 * - `{ kind: "last-weekday", weekday: number }` — `5L` (last Friday of month)
 * - `{ kind: "nth-weekday", weekday: number, nth: number }` — `5#3` (third Friday)
 * - `{ kind: "nearest-weekday", day: number }` — `15W` (nearest weekday to 15th)
 */
export type CronFieldEntry =
  | { kind: "value"; value: number }
  | { kind: "range"; start: number; end: number }
  | { kind: "step"; range: CronFieldEntry; step: number }
  | { kind: "last" }
  | { kind: "last-weekday"; weekday: number }
  | { kind: "nth-weekday"; weekday: number; nth: number }
  | { kind: "nearest-weekday"; day: number };

/** A parsed cron field — an array of entries (comma-separated in the expression). */
export type CronField = CronFieldEntry[];

/**
 * A fully parsed cron expression (standard 5-field format).
 *
 * Fields:
 * - minute: 0-59
 * - hour: 0-23
 * - dayOfMonth: 1-31
 * - month: 1-12
 * - dayOfWeek: 0-6 (Sunday=0, Saturday=6; input value 7 is normalized to 0)
 */
export interface CronExpression {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

/** Factory for a single-value field entry. */
export function valueEntry(value: number): CronFieldEntry {
  return { kind: "value", value };
}

/** Factory for a range field entry. */
export function rangeEntry(start: number, end: number): CronFieldEntry {
  return { kind: "range", start, end };
}

/** Factory for a step field entry. */
export function stepEntry(range: CronFieldEntry, step: number): CronFieldEntry {
  return { kind: "step", range, step };
}

/** Factory for a last-day entry (L). */
export function lastEntry(): CronFieldEntry {
  return { kind: "last" };
}

/** Factory for a last-weekday entry (e.g., 5L = last Friday). */
export function lastWeekdayEntry(weekday: number): CronFieldEntry {
  return { kind: "last-weekday", weekday };
}

/** Factory for an nth-weekday entry (e.g., 5#3 = third Friday). */
export function nthWeekdayEntry(weekday: number, nth: number): CronFieldEntry {
  return { kind: "nth-weekday", weekday, nth };
}

/** Factory for a nearest-weekday entry (e.g., 15W = nearest weekday to 15th). */
export function nearestWeekdayEntry(day: number): CronFieldEntry {
  return { kind: "nearest-weekday", day };
}

/** Factory for a CronExpression. */
export function cronExpression(
  minute: CronField,
  hour: CronField,
  dayOfMonth: CronField,
  month: CronField,
  dayOfWeek: CronField,
): CronExpression {
  return { minute, hour, dayOfMonth, month, dayOfWeek };
}
