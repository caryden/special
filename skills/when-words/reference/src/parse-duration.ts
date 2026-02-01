/**
 * Parses a human-written duration string into seconds.
 *
 * Accepts many formats:
 *   Compact:    "2h30m", "2h 30m", "45s", "1d 2h 30m"
 *   Verbose:    "2 hours 30 minutes", "2 hours and 30 minutes"
 *   Decimal:    "2.5 hours", "1.5h"
 *   Colon:      "2:30" (h:mm), "1:30:00" (h:mm:ss), "0:05:30"
 *   Mixed:      "1 day, 2 hours, and 30 minutes"
 *
 * Case insensitive. Tolerates extra whitespace.
 *
 * Throws on: empty string, unrecognized input, negative values, bare numbers
 * without units.
 *
 * @node parse-duration
 * @contract parse-duration.test.ts
 * @hint pattern: Pure function, no platform concerns
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error("Empty duration string");
  }

  // Check for negative values
  if (trimmed.startsWith("-")) {
    throw new Error("Negative durations are not supported");
  }

  // Try colon notation first: h:mm or h:mm:ss
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    const seconds = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  const unitMap: Record<string, number> = {
    y: 365 * 86400,
    yr: 365 * 86400,
    yrs: 365 * 86400,
    year: 365 * 86400,
    years: 365 * 86400,
    mo: 30 * 86400,
    month: 30 * 86400,
    months: 30 * 86400,
    w: 604800,
    wk: 604800,
    wks: 604800,
    week: 604800,
    weeks: 604800,
    d: 86400,
    day: 86400,
    days: 86400,
    h: 3600,
    hr: 3600,
    hrs: 3600,
    hour: 3600,
    hours: 3600,
    m: 60,
    min: 60,
    mins: 60,
    minute: 60,
    minutes: 60,
    s: 1,
    sec: 1,
    secs: 1,
    second: 1,
    seconds: 1,
  };

  // Strip filler words
  const cleaned = trimmed
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Match number+unit pairs: "2h", "2.5 hours", "30 minutes", etc.
  const pattern = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2];

    if (!(unit in unitMap)) {
      throw new Error(`Unrecognized unit: ${unit}`);
    }

    total += value * unitMap[unit];
    matched = true;
  }

  if (!matched) {
    throw new Error(`Could not parse duration: ${input}`);
  }

  return Math.round(total);
}
