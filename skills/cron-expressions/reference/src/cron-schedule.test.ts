import { describe, expect, test } from "bun:test";
import { cronSchedule } from "./cron-schedule";

function utc(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

describe("cronSchedule", () => {
  describe("construction", () => {
    test("parses a valid cron expression", () => {
      const schedule = cronSchedule("*/15 * * * *");
      expect(schedule.expression).toBeDefined();
      expect(schedule.expression.minute).toHaveLength(1);
    });

    test("throws on invalid expression", () => {
      expect(() => cronSchedule("invalid")).toThrow();
    });

    test("throws on empty string", () => {
      expect(() => cronSchedule("")).toThrow("Empty cron expression");
    });
  });

  describe("matches", () => {
    test("returns true when date matches", () => {
      const schedule = cronSchedule("0 12 * * *");
      expect(schedule.matches(utc(2024, 6, 15, 12, 0))).toBe(true);
    });

    test("returns false when date does not match", () => {
      const schedule = cronSchedule("0 12 * * *");
      expect(schedule.matches(utc(2024, 6, 15, 13, 0))).toBe(false);
    });

    test("applies Vixie union rule", () => {
      const schedule = cronSchedule("0 0 15 * 5");
      // Friday (not 15th): matches via DoW
      expect(schedule.matches(utc(2024, 3, 22, 0, 0))).toBe(true);
      // 15th (not Friday): matches via DoM
      expect(schedule.matches(utc(2024, 4, 15, 0, 0))).toBe(true);
    });
  });

  describe("next", () => {
    test("finds next occurrence", () => {
      const schedule = cronSchedule("0 0 * * *");
      const result = schedule.next(utc(2024, 1, 1, 12, 0));
      expect(result).toEqual(utc(2024, 1, 2, 0, 0));
    });

    test("excludes current time", () => {
      const schedule = cronSchedule("0 0 * * *");
      const result = schedule.next(utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 2, 0, 0));
    });
  });

  describe("prev", () => {
    test("finds previous occurrence", () => {
      const schedule = cronSchedule("0 0 * * *");
      const result = schedule.prev(utc(2024, 1, 2, 12, 0));
      expect(result).toEqual(utc(2024, 1, 2, 0, 0));
    });

    test("excludes current time", () => {
      const schedule = cronSchedule("0 0 * * *");
      const result = schedule.prev(utc(2024, 1, 2, 0, 0));
      expect(result).toEqual(utc(2024, 1, 1, 0, 0));
    });
  });

  describe("nextN", () => {
    test("returns next N occurrences", () => {
      const schedule = cronSchedule("0 0 * * *");
      const results = schedule.nextN(utc(2024, 1, 1, 0, 0), 3);
      expect(results).toEqual([
        utc(2024, 1, 2, 0, 0),
        utc(2024, 1, 3, 0, 0),
        utc(2024, 1, 4, 0, 0),
      ]);
    });
  });

  describe("iterate", () => {
    test("yields successive occurrences", () => {
      const schedule = cronSchedule("0 * * * *");
      const iter = schedule.iterate(utc(2024, 1, 1, 0, 0));

      expect(iter.next().value).toEqual(utc(2024, 1, 1, 1, 0));
      expect(iter.next().value).toEqual(utc(2024, 1, 1, 2, 0));
      expect(iter.next().value).toEqual(utc(2024, 1, 1, 3, 0));
    });
  });

  describe("end-to-end scenarios", () => {
    test("every weekday at 9am", () => {
      const schedule = cronSchedule("0 9 * * 1-5");
      const results = schedule.nextN(utc(2024, 1, 1, 0, 0), 5);
      // Jan 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri
      expect(results).toEqual([
        utc(2024, 1, 1, 9, 0),
        utc(2024, 1, 2, 9, 0),
        utc(2024, 1, 3, 9, 0),
        utc(2024, 1, 4, 9, 0),
        utc(2024, 1, 5, 9, 0),
      ]);
    });

    test("first and fifteenth of every month at noon", () => {
      const schedule = cronSchedule("0 12 1,15 * *");
      const results = schedule.nextN(utc(2024, 1, 1, 0, 0), 4);
      expect(results).toEqual([
        utc(2024, 1, 1, 12, 0),
        utc(2024, 1, 15, 12, 0),
        utc(2024, 2, 1, 12, 0),
        utc(2024, 2, 15, 12, 0),
      ]);
    });

    test("last day of every month at midnight", () => {
      const schedule = cronSchedule("0 0 L * *");
      const results = schedule.nextN(utc(2024, 1, 1, 0, 0), 4);
      expect(results).toEqual([
        utc(2024, 1, 31, 0, 0),
        utc(2024, 2, 29, 0, 0),
        utc(2024, 3, 31, 0, 0),
        utc(2024, 4, 30, 0, 0),
      ]);
    });

    test("third Friday of every month", () => {
      const schedule = cronSchedule("0 0 * * 5#3");
      const results = schedule.nextN(utc(2024, 1, 1, 0, 0), 3);
      // Jan: Fri 5,12,19,26 → 3rd = 19
      // Feb: Fri 2,9,16,23 → 3rd = 16
      // Mar: Fri 1,8,15,22,29 → 3rd = 15
      expect(results).toEqual([
        utc(2024, 1, 19, 0, 0),
        utc(2024, 2, 16, 0, 0),
        utc(2024, 3, 15, 0, 0),
      ]);
    });
  });
});
