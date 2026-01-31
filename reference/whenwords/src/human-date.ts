/**
 * Returns a contextual date string based on how far the timestamp is from
 * the reference:
 *
 *   Same day:           "Today"
 *   ±1 day:             "Yesterday" / "Tomorrow"
 *   2–6 days past:      "Last Wednesday"
 *   2–6 days future:    "This Wednesday"
 *   Same year, >6 days: "March 5"
 *   Different year:     "March 5, 2023"
 *
 * All comparisons use UTC dates. Reference timestamp is always explicit.
 *
 * @node human-date
 * @contract human-date.test.ts
 * @hint pattern: Pure function, no system clock. All date math is UTC.
 */
export function humanDate(timestamp: number, reference: number): string {
  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const tsDate = new Date(timestamp * 1000);
  const refDate = new Date(reference * 1000);

  // Get UTC date components
  const tsYear = tsDate.getUTCFullYear();
  const tsMonth = tsDate.getUTCMonth();
  const tsDay = tsDate.getUTCDate();
  const tsDow = tsDate.getUTCDay();

  const refYear = refDate.getUTCFullYear();
  const refMonth = refDate.getUTCMonth();
  const refDay = refDate.getUTCDate();

  // Calculate day difference using UTC midnight dates
  const tsMidnight = Date.UTC(tsYear, tsMonth, tsDay);
  const refMidnight = Date.UTC(refYear, refMonth, refDay);
  const dayDiff = Math.round((tsMidnight - refMidnight) / 86400000);

  // Today
  if (dayDiff === 0) {
    return "Today";
  }

  // Yesterday
  if (dayDiff === -1) {
    return "Yesterday";
  }

  // Tomorrow
  if (dayDiff === 1) {
    return "Tomorrow";
  }

  // 2–6 days in the past: "Last <DayName>"
  if (dayDiff >= -6 && dayDiff < -1) {
    return `Last ${DAY_NAMES[tsDow]}`;
  }

  // 2–6 days in the future: "This <DayName>"
  if (dayDiff > 1 && dayDiff <= 6) {
    return `This ${DAY_NAMES[tsDow]}`;
  }

  // Same year: "Month Day"
  if (tsYear === refYear) {
    return `${MONTH_NAMES[tsMonth]} ${tsDay}`;
  }

  // Different year: "Month Day, Year"
  return `${MONTH_NAMES[tsMonth]} ${tsDay}, ${tsYear}`;
}
