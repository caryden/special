/**
 * Provides iteration over cron expression matches.
 *
 * Yields successive UTC datetimes matching a cron expression, starting
 * from a given reference time. Uses a generator for lazy evaluation —
 * consumers pull only the occurrences they need.
 *
 * @node iterator
 * @depends-on cron-types, next-occurrence
 * @contract iterator.test.ts
 * @hint generators: Use the target language's generator/iterator protocol.
 *       Python: yield. Rust: impl Iterator. Go: channel or callback.
 */

import type { CronExpression } from "./cron-types";
import { nextOccurrence } from "./next-occurrence";

/**
 * Yields successive UTC datetimes matching the cron expression,
 * starting after the given reference time.
 *
 * The generator is lazy — it only computes the next occurrence when
 * the consumer requests it. It yields indefinitely (no built-in limit).
 */
export function* cronIterator(
  expr: CronExpression,
  after: Date,
): Generator<Date, void, undefined> {
  let current = after;

  while (true) {
    const next = nextOccurrence(expr, current);
    if (next === null) {
      return;
    }
    yield next;
    current = next;
  }
}

/**
 * Returns an array of the next `count` occurrences matching the cron
 * expression, starting after the given reference time.
 *
 * Convenience wrapper over cronIterator for when you need a fixed number
 * of future matches.
 */
export function nextN(
  expr: CronExpression,
  after: Date,
  count: number,
): Date[] {
  const results: Date[] = [];
  const iter = cronIterator(expr, after);

  for (let i = 0; i < count; i++) {
    const { value, done } = iter.next();
    if (done) break;
    results.push(value);
  }

  return results;
}
