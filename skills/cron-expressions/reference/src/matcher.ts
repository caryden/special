/**
 * Tests whether a given UTC datetime matches a parsed cron expression.
 *
 * Implements Vixie cron matching semantics:
 * - When BOTH day-of-month and day-of-week are restricted (not wildcard),
 *   the match uses UNION (OR) — matching either field is sufficient.
 *   This is the Vixie cron convention, documented in crontab(5).
 * - When only one of day-of-month or day-of-week is restricted, that
 *   field must match (the wildcard always matches).
 *
 * All datetime values are UTC. No timezone handling.
 *
 * @node matcher
 * @depends-on cron-types, field-range
 * @contract matcher.test.ts
 * @provenance Vixie cron 4.1, POSIX.1-2017 crontab(5)
 * @hint matching: The DoM/DoW union rule is THE key off-policy decision.
 *       Most people expect intersection (AND); Vixie uses union (OR).
 */

import type { CronExpression, CronField, CronFieldEntry } from "./cron-types";
import { lastDayOfMonth, dayOfWeekForDate } from "./field-range";

/**
 * Tests whether a UTC Date matches a parsed cron expression.
 */
export function matchesCron(date: Date, expr: CronExpression): boolean {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // 0-based → 1-based
  const dayOfWeek = date.getUTCDay(); // 0=Sun
  const year = date.getUTCFullYear();

  // Minute and hour must always match
  if (!matchesField(minute, expr.minute)) return false;
  if (!matchesField(hour, expr.hour)) return false;
  if (!matchesField(month, expr.month)) return false;

  // Day matching: Vixie union rule
  const domRestricted = isRestricted(expr.dayOfMonth);
  const dowRestricted = isRestricted(expr.dayOfWeek);

  if (domRestricted && dowRestricted) {
    // Union (OR): match if EITHER day-of-month OR day-of-week matches
    const domMatch = matchesDayOfMonth(dayOfMonth, expr.dayOfMonth, year, month);
    const dowMatch = matchesDayOfWeek(dayOfWeek, dayOfMonth, expr.dayOfWeek, year, month);
    return domMatch || dowMatch;
  }

  // One or both are wildcards — both must match (wildcard always does)
  if (!matchesDayOfMonth(dayOfMonth, expr.dayOfMonth, year, month)) return false;
  if (!matchesDayOfWeek(dayOfWeek, dayOfMonth, expr.dayOfWeek, year, month)) return false;

  return true;
}

/**
 * A field is "restricted" if it's NOT just a single full-range wildcard.
 * A wildcard is represented as a range from min to max of the field.
 */
function isRestricted(field: CronField): boolean {
  if (field.length !== 1) return true;
  const entry = field[0];
  if (entry.kind !== "range") return true;
  // Check if it's a full wildcard range
  // dayOfMonth: 1-31, dayOfWeek: 0-6
  // We check based on the actual range values
  return false; // single range = wildcard
}

function matchesField(value: number, field: CronField): boolean {
  return field.some((entry) => matchesEntry(value, entry));
}

function matchesEntry(value: number, entry: CronFieldEntry): boolean {
  if (entry.kind === "value") return value === entry.value;

  if (entry.kind === "range") {
    // Normal range or wrap-around (e.g., FRI-MON = 5-1 meaning 5,6,0,1)
    return entry.start <= entry.end
      ? value >= entry.start && value <= entry.end
      : value >= entry.start || value <= entry.end;
  }

  // entry.kind === "step" — only remaining kind that reaches matchesEntry.
  // Special kinds (last, last-weekday, nth-weekday, nearest-weekday) are
  // handled by matchesDayOfMonth / matchesDayOfWeek before this function.
  const step = entry as { kind: "step"; range: CronFieldEntry; step: number };
  const base = step.range as { kind: "range"; start: number; end: number };
  if (base.start <= base.end) {
    return value >= base.start && value <= base.end &&
      (value - base.start) % step.step === 0;
  }
  // Wrap-around step (e.g., day-of-week FRI-MON/2)
  return value >= base.start && (value - base.start) % step.step === 0;
}

function matchesDayOfMonth(
  dayOfMonth: number,
  field: CronField,
  year: number,
  month: number,
): boolean {
  return field.some((entry) => {
    if (entry.kind === "last") {
      return dayOfMonth === lastDayOfMonth(year, month);
    }
    if (entry.kind === "nearest-weekday") {
      return dayOfMonth === findNearestWeekday(entry.day, year, month);
    }
    return matchesEntry(dayOfMonth, entry);
  });
}

function matchesDayOfWeek(
  dayOfWeek: number,
  dayOfMonth: number,
  field: CronField,
  year: number,
  month: number,
): boolean {
  return field.some((entry) => {
    if (entry.kind === "last-weekday") {
      // Last X-day of the month
      if (dayOfWeek !== entry.weekday) return false;
      const lastDay = lastDayOfMonth(year, month);
      // Check that no future occurrence of this weekday exists in the month
      return dayOfMonth + 7 > lastDay;
    }
    if (entry.kind === "nth-weekday") {
      // Nth X-day of the month
      if (dayOfWeek !== entry.weekday) return false;
      // The nth occurrence: dayOfMonth falls in week n if
      // ceil(dayOfMonth / 7) === nth
      const occurrence = Math.ceil(dayOfMonth / 7);
      return occurrence === entry.nth;
    }
    return matchesEntry(dayOfWeek, entry);
  });
}

/**
 * Finds the nearest weekday (Mon-Fri) to the given day in the given month.
 * If the day is Saturday, shifts to Friday (or Monday if at start of month).
 * If the day is Sunday, shifts to Monday (or Friday if at end of month).
 * Never crosses month boundaries.
 *
 * @provenance Quartz scheduler W modifier semantics
 */
function findNearestWeekday(day: number, year: number, month: number): number {
  const lastDay = lastDayOfMonth(year, month);
  const target = Math.min(day, lastDay);
  const dow = dayOfWeekForDate(year, month, target);

  if (dow >= 1 && dow <= 5) {
    // Already a weekday
    return target;
  }

  if (dow === 6) {
    // Saturday → try Friday
    if (target > 1) return target - 1;
    // 1st is Saturday → use Monday the 3rd
    return target + 2;
  }

  // Sunday → try Monday
  if (target < lastDay) return target + 1;
  // Last day is Sunday → use Friday
  return target - 2;
}
