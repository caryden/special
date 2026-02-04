/**
 * Defines valid value ranges for each cron field and provides
 * utilities for last-day-of-month calculation.
 *
 * The ranges encode the conventions from Vixie cron:
 * - minute: 0-59
 * - hour: 0-23
 * - dayOfMonth: 1-31 (actual max depends on month/year)
 * - month: 1-12
 * - dayOfWeek: 0-6 (Sun=0 through Sat=6; input 7 is normalized to 0)
 *
 * @node field-range
 * @contract field-range.test.ts
 * @provenance POSIX.1-2017 crontab(5), Vixie cron 4.1
 * @hint conventions: These ranges are pure convention. The dayOfWeek range
 *       0-6 with 7 aliasing to 0 is a Vixie extension over POSIX.
 */

export interface FieldRange {
  min: number;
  max: number;
}

/** Valid ranges for each cron field. */
export const FIELD_RANGES: Record<string, FieldRange> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 },
};

/**
 * Month name aliases (case-insensitive). Maps 3-letter abbreviation to month number.
 *
 * @provenance POSIX.1-2017 crontab(5)
 */
export const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Day-of-week name aliases (case-insensitive). Maps 3-letter abbreviation to number.
 * Sunday = 0, Saturday = 6.
 *
 * @provenance POSIX.1-2017 crontab(5)
 */
export const DOW_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * Returns the last day of the given month in the given year (UTC).
 *
 * Uses the UTC Date rollover trick: day 0 of the next month is the
 * last day of the current month.
 *
 * @provenance mathematical-definition (Gregorian calendar)
 */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Returns the day-of-week (0=Sun, 6=Sat) for a given UTC date.
 */
export function dayOfWeekForDate(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
