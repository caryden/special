/**
 * Public API for cron expression parsing, matching, and scheduling.
 *
 * Provides a unified interface that combines parsing, matching,
 * next/previous occurrence finding, and iteration. This is the
 * primary entry point for consumers.
 *
 * @node cron-schedule
 * @depends-on cron-types, parser, matcher, next-occurrence, iterator
 * @contract cron-schedule.test.ts
 * @hint api: This is a facade over the internal nodes. Translate the
 *       public API surface; internal nodes are implementation details.
 */

import type { CronExpression } from "./cron-types";
import { parseCron } from "./parser";
import { matchesCron } from "./matcher";
import { nextOccurrence, prevOccurrence } from "./next-occurrence";
import { cronIterator, nextN } from "./iterator";

export interface CronSchedule {
  /** The parsed cron expression. */
  expression: CronExpression;

  /** Tests whether a UTC Date matches this schedule. */
  matches(date: Date): boolean;

  /** Finds the next matching UTC datetime after the given time. */
  next(after: Date): Date | null;

  /** Finds the previous matching UTC datetime before the given time. */
  prev(before: Date): Date | null;

  /** Returns the next `count` matching UTC datetimes after the given time. */
  nextN(after: Date, count: number): Date[];

  /** Returns a lazy iterator of matching UTC datetimes after the given time. */
  iterate(after: Date): Generator<Date, void, undefined>;
}

/**
 * Parses a cron expression and returns a CronSchedule object with
 * matching, next/prev, and iteration methods.
 *
 * Throws on invalid cron expressions.
 */
export function cronSchedule(expression: string): CronSchedule {
  const expr = parseCron(expression);

  return {
    expression: expr,
    matches: (date: Date) => matchesCron(date, expr),
    next: (after: Date) => nextOccurrence(expr, after),
    prev: (before: Date) => prevOccurrence(expr, before),
    nextN: (after: Date, count: number) => nextN(expr, after, count),
    iterate: (after: Date) => cronIterator(expr, after),
  };
}
