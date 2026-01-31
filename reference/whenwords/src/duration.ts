/**
 * Formats a number of seconds as a human-readable duration string.
 *
 * Normal mode:  "2 hours, 30 minutes"
 * Compact mode: "2h 30m"
 *
 * Shows up to 2 units by default (largest two non-zero). The max_units option
 * overrides this. When max_units truncates, the value is rounded to the largest
 * displayed unit.
 *
 * Throws on negative input.
 *
 * @node duration
 * @contract duration.test.ts
 * @hint pattern: Pure function, no platform concerns
 */
export function duration(
  seconds: number,
  options?: { compact?: boolean; max_units?: number }
): string {
  if (seconds < 0) {
    throw new Error("Seconds must not be negative");
  }

  const compact = options?.compact ?? false;
  const maxUnits = options?.max_units ?? 2;

  const units: [string, string, number][] = [
    // [verbose name, compact abbreviation, seconds per unit]
    ["year", "y", 365 * 86400],
    ["month", "mo", 30 * 86400],
    ["day", "d", 86400],
    ["hour", "h", 3600],
    ["minute", "m", 60],
    ["second", "s", 1],
  ];

  if (seconds === 0) {
    return compact ? "0s" : "0 seconds";
  }

  const parts: string[] = [];
  let remaining = seconds;

  for (const [name, abbr, size] of units) {
    if (remaining >= size) {
      // If this is the last unit we'll show, round instead of floor
      const isLastUnit = parts.length + 1 >= maxUnits;
      const count = isLastUnit ? Math.round(remaining / size) : Math.floor(remaining / size);
      remaining = isLastUnit ? 0 : remaining % size;

      if (count > 0) {
        if (compact) {
          parts.push(`${count}${abbr}`);
        } else {
          const label = count === 1 ? name : `${name}s`;
          parts.push(`${count} ${label}`);
        }
      }
    }

    if (parts.length >= maxUnits) {
      break;
    }
  }

  return compact ? parts.join(" ") : parts.join(", ");
}
