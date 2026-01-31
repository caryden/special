/**
 * Converts a Unix timestamp to a relative time string like "3 hours ago" or "in 2 days".
 * The reference timestamp is always passed explicitly — no system clock access.
 *
 * Thresholds (using half-up rounding):
 *   0–44 seconds:   "just now"
 *   45–89 seconds:  "1 minute ago"
 *   90s–44min:      "N minutes ago"
 *   45–89 minutes:  "1 hour ago"
 *   90min–21hr:     "N hours ago"
 *   22–35 hours:    "1 day ago"
 *   36hr–25days:    "N days ago"
 *   26–45 days:     "1 month ago"
 *   46–319 days:    "N months ago"
 *   320–547 days:   "1 year ago"
 *   548+ days:      "N years ago"
 *
 * Future timestamps use "in N units" phrasing (same thresholds).
 *
 * @node time-ago
 * @contract time-ago.test.ts
 * @hint pattern: All functions are pure — reference timestamp is always explicit, never use system clock
 */
export function timeAgo(timestamp: number, reference: number): string {
  const seconds = Math.abs(reference - timestamp);
  const isFuture = timestamp > reference;

  const thresholds: [number, string, string, number][] = [
    //  [maxSeconds, singularLabel, pluralLabel, divisor]
    [44, "just now", "just now", 1],
    [89, "1 minute", "1 minute", 1],
    [44 * 60, "minute", "minutes", 60],
    [89 * 60, "1 hour", "1 hour", 1],
    [21 * 3600, "hour", "hours", 3600],
    [35 * 3600, "1 day", "1 day", 1],
    [25 * 86400, "day", "days", 86400],
    [45 * 86400, "1 month", "1 month", 1],
    [319 * 86400, "month", "months", 30 * 86400],
    [547 * 86400, "1 year", "1 year", 1],
    [Infinity, "year", "years", 365 * 86400],
  ];

  for (const [max, singular, plural, divisor] of thresholds) {
    if (seconds <= max) {
      // "just now" has no direction
      if (singular === "just now") {
        return "just now";
      }

      // Fixed labels like "1 minute", "1 hour", "1 day", "1 month", "1 year"
      if (divisor === 1) {
        return isFuture ? `in ${singular}` : `${singular} ago`;
      }

      // Computed labels like "N minutes", "N hours", etc.
      const n = Math.round(seconds / divisor);
      const label = n === 1 ? singular : plural;
      const text = `${n} ${label}`;
      return isFuture ? `in ${text}` : `${text} ago`;
    }
  }
}
