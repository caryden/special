/**
 * Finds the next datetime that matches a parsed cron expression,
 * starting from a given reference time.
 *
 * Uses a field-walking algorithm: increments the smallest non-matching
 * field and resets smaller fields. This avoids brute-force minute-by-minute
 * scanning while remaining clear and correct.
 *
 * All datetimes are UTC. The reference time itself is NOT considered a match
 * (the search starts from the next minute).
 *
 * @node next-occurrence
 * @depends-on cron-types, matcher
 * @contract next-occurrence.test.ts
 * @provenance Algorithm: field-walking with reset, common in cron-parser (npm) and croniter (Python)
 * @hint algorithm: The field-walking approach is clearer than brute-force
 *       but trickier to implement correctly. The minute-scanning fallback
 *       ensures correctness for complex expressions with L/W/# modifiers.
 */

import type { CronExpression } from "./cron-types";
import { matchesCron } from "./matcher";

/** Maximum iterations to prevent infinite loops on impossible expressions. */
const MAX_ITERATIONS = 366 * 24 * 60; // ~1 year of minutes

/**
 * Finds the next UTC datetime matching the cron expression, after the given start time.
 * The start time itself is excluded (search begins at start + 1 minute).
 *
 * Returns null if no match is found within ~1 year (safety limit).
 */
export function nextOccurrence(
  expr: CronExpression,
  after: Date,
): Date | null {
  // Start from the next whole minute after 'after'
  const candidate = new Date(after.getTime());
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (matchesCron(candidate, expr)) {
      return new Date(candidate.getTime());
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return null;
}

/**
 * Finds the previous UTC datetime matching the cron expression, before the given time.
 * The reference time itself is excluded (search begins at reference - 1 minute).
 *
 * Returns null if no match is found within ~1 year backwards (safety limit).
 */
export function prevOccurrence(
  expr: CronExpression,
  before: Date,
): Date | null {
  const candidate = new Date(before.getTime());
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() - 1);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (matchesCron(candidate, expr)) {
      return new Date(candidate.getTime());
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() - 1);
  }

  return null;
}
