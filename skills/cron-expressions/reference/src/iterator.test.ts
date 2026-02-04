import { describe, expect, test } from "bun:test";
import { cronIterator, nextN } from "./iterator";
import { parseCron } from "./parser";

function utc(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

describe("cronIterator", () => {
  test("yields successive minutes for '* * * * *'", () => {
    const expr = parseCron("* * * * *");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 1));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 2));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 3));
  });

  test("yields hourly for '0 * * * *'", () => {
    const expr = parseCron("0 * * * *");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    expect(iter.next().value).toEqual(utc(2024, 1, 1, 1, 0));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 2, 0));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 3, 0));
  });

  test("yields every 15 minutes for '*/15 * * * *'", () => {
    const expr = parseCron("*/15 * * * *");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 15));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 30));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 0, 45));
    expect(iter.next().value).toEqual(utc(2024, 1, 1, 1, 0));
  });

  test("yields daily midnights for '0 0 * * *'", () => {
    const expr = parseCron("0 0 * * *");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    expect(iter.next().value).toEqual(utc(2024, 1, 2, 0, 0));
    expect(iter.next().value).toEqual(utc(2024, 1, 3, 0, 0));
    expect(iter.next().value).toEqual(utc(2024, 1, 4, 0, 0));
  });

  test("yields only Fridays for '0 0 * * 5'", () => {
    const expr = parseCron("0 0 * * 5");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    // 2024: first Friday is Jan 5
    const first = iter.next().value!;
    expect(first).toEqual(utc(2024, 1, 5, 0, 0));
    expect(first.getUTCDay()).toBe(5);

    const second = iter.next().value!;
    expect(second).toEqual(utc(2024, 1, 12, 0, 0));
    expect(second.getUTCDay()).toBe(5);
  });

  test("stops yielding when nextOccurrence returns null", () => {
    // Feb 31 never exists
    const expr = parseCron("0 0 31 2 *");
    const iter = cronIterator(expr, utc(2024, 1, 1, 0, 0));

    const result = iter.next();
    expect(result.done).toBe(true);
  });
});

describe("nextN", () => {
  test("returns next 5 occurrences of '0 0 * * *'", () => {
    const expr = parseCron("0 0 * * *");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 5);

    expect(results).toEqual([
      utc(2024, 1, 2, 0, 0),
      utc(2024, 1, 3, 0, 0),
      utc(2024, 1, 4, 0, 0),
      utc(2024, 1, 5, 0, 0),
      utc(2024, 1, 6, 0, 0),
    ]);
  });

  test("returns next 3 occurrences of '*/15 * * * *'", () => {
    const expr = parseCron("*/15 * * * *");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 3);

    expect(results).toEqual([
      utc(2024, 1, 1, 0, 15),
      utc(2024, 1, 1, 0, 30),
      utc(2024, 1, 1, 0, 45),
    ]);
  });

  test("returns 0 occurrences when count is 0", () => {
    const expr = parseCron("* * * * *");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 0);
    expect(results).toEqual([]);
  });

  test("returns fewer than count if generator exhausts", () => {
    const expr = parseCron("0 0 31 2 *");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 5);
    expect(results).toEqual([]);
  });

  test("returns next 4 Mondays", () => {
    const expr = parseCron("0 0 * * 1");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 4);

    expect(results).toEqual([
      utc(2024, 1, 8, 0, 0),
      utc(2024, 1, 15, 0, 0),
      utc(2024, 1, 22, 0, 0),
      utc(2024, 1, 29, 0, 0),
    ]);
  });

  test("returns last days of consecutive months", () => {
    const expr = parseCron("0 0 L * *");
    const results = nextN(expr, utc(2024, 1, 1, 0, 0), 3);

    expect(results).toEqual([
      utc(2024, 1, 31, 0, 0),
      utc(2024, 2, 29, 0, 0),  // leap year
      utc(2024, 3, 31, 0, 0),
    ]);
  });
});
