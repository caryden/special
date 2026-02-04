import { describe, expect, test } from "bun:test";
import {
  valueEntry,
  rangeEntry,
  stepEntry,
  lastEntry,
  lastWeekdayEntry,
  nthWeekdayEntry,
  nearestWeekdayEntry,
  cronExpression,
  type CronFieldEntry,
  type CronField,
  type CronExpression,
} from "./cron-types";

describe("cron-types", () => {
  describe("valueEntry", () => {
    test("creates a value entry", () => {
      const entry = valueEntry(5);
      expect(entry).toEqual({ kind: "value", value: 5 });
    });

    test("creates a value entry for zero", () => {
      const entry = valueEntry(0);
      expect(entry).toEqual({ kind: "value", value: 0 });
    });
  });

  describe("rangeEntry", () => {
    test("creates a range entry", () => {
      const entry = rangeEntry(1, 5);
      expect(entry).toEqual({ kind: "range", start: 1, end: 5 });
    });

    test("creates a single-value range", () => {
      const entry = rangeEntry(3, 3);
      expect(entry).toEqual({ kind: "range", start: 3, end: 3 });
    });
  });

  describe("stepEntry", () => {
    test("creates a step over a range", () => {
      const entry = stepEntry(rangeEntry(1, 10), 2);
      expect(entry).toEqual({
        kind: "step",
        range: { kind: "range", start: 1, end: 10 },
        step: 2,
      });
    });

    test("creates a step over a value (wildcard represented as range)", () => {
      const entry = stepEntry(rangeEntry(0, 59), 15);
      expect(entry).toEqual({
        kind: "step",
        range: { kind: "range", start: 0, end: 59 },
        step: 15,
      });
    });
  });

  describe("lastEntry", () => {
    test("creates a last-day entry", () => {
      const entry = lastEntry();
      expect(entry).toEqual({ kind: "last" });
    });
  });

  describe("lastWeekdayEntry", () => {
    test("creates a last-weekday entry", () => {
      const entry = lastWeekdayEntry(5);
      expect(entry).toEqual({ kind: "last-weekday", weekday: 5 });
    });
  });

  describe("nthWeekdayEntry", () => {
    test("creates an nth-weekday entry", () => {
      const entry = nthWeekdayEntry(5, 3);
      expect(entry).toEqual({ kind: "nth-weekday", weekday: 5, nth: 3 });
    });
  });

  describe("nearestWeekdayEntry", () => {
    test("creates a nearest-weekday entry", () => {
      const entry = nearestWeekdayEntry(15);
      expect(entry).toEqual({ kind: "nearest-weekday", day: 15 });
    });
  });

  describe("cronExpression", () => {
    test("creates a full cron expression", () => {
      const expr = cronExpression(
        [valueEntry(0)],
        [valueEntry(12)],
        [rangeEntry(1, 15)],
        [valueEntry(1), valueEntry(6)],
        [stepEntry(rangeEntry(0, 6), 2)],
      );
      expect(expr).toEqual({
        minute: [{ kind: "value", value: 0 }],
        hour: [{ kind: "value", value: 12 }],
        dayOfMonth: [{ kind: "range", start: 1, end: 15 }],
        month: [{ kind: "value", value: 1 }, { kind: "value", value: 6 }],
        dayOfWeek: [{
          kind: "step",
          range: { kind: "range", start: 0, end: 6 },
          step: 2,
        }],
      });
    });

    test("creates a simple every-minute expression", () => {
      const wildcard: CronField = [rangeEntry(0, 59)];
      const wildcardHour: CronField = [rangeEntry(0, 23)];
      const wildcardDom: CronField = [rangeEntry(1, 31)];
      const wildcardMonth: CronField = [rangeEntry(1, 12)];
      const wildcardDow: CronField = [rangeEntry(0, 6)];

      const expr = cronExpression(wildcard, wildcardHour, wildcardDom, wildcardMonth, wildcardDow);
      expect(expr.minute).toEqual([{ kind: "range", start: 0, end: 59 }]);
      expect(expr.hour).toEqual([{ kind: "range", start: 0, end: 23 }]);
      expect(expr.dayOfMonth).toEqual([{ kind: "range", start: 1, end: 31 }]);
      expect(expr.month).toEqual([{ kind: "range", start: 1, end: 12 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 0, end: 6 }]);
    });
  });
});
