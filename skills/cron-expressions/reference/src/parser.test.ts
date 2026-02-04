import { describe, expect, test } from "bun:test";
import { parseCron } from "./parser";

describe("parser", () => {
  describe("basic expressions", () => {
    test("parses all-wildcards '* * * * *'", () => {
      const expr = parseCron("* * * * *");
      expect(expr.minute).toEqual([{ kind: "range", start: 0, end: 59 }]);
      expect(expr.hour).toEqual([{ kind: "range", start: 0, end: 23 }]);
      expect(expr.dayOfMonth).toEqual([{ kind: "range", start: 1, end: 31 }]);
      expect(expr.month).toEqual([{ kind: "range", start: 1, end: 12 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 0, end: 6 }]);
    });

    test("parses single values '0 12 15 6 3'", () => {
      const expr = parseCron("0 12 15 6 3");
      expect(expr.minute).toEqual([{ kind: "value", value: 0 }]);
      expect(expr.hour).toEqual([{ kind: "value", value: 12 }]);
      expect(expr.dayOfMonth).toEqual([{ kind: "value", value: 15 }]);
      expect(expr.month).toEqual([{ kind: "value", value: 6 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 3 }]);
    });

    test("parses '0 0 1 1 *' (midnight Jan 1)", () => {
      const expr = parseCron("0 0 1 1 *");
      expect(expr.minute).toEqual([{ kind: "value", value: 0 }]);
      expect(expr.hour).toEqual([{ kind: "value", value: 0 }]);
      expect(expr.dayOfMonth).toEqual([{ kind: "value", value: 1 }]);
      expect(expr.month).toEqual([{ kind: "value", value: 1 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 0, end: 6 }]);
    });
  });

  describe("ranges", () => {
    test("parses minute range '10-20 * * * *'", () => {
      const expr = parseCron("10-20 * * * *");
      expect(expr.minute).toEqual([{ kind: "range", start: 10, end: 20 }]);
    });

    test("parses day-of-week range '* * * * 1-5' (Mon-Fri)", () => {
      const expr = parseCron("* * * * 1-5");
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 1, end: 5 }]);
    });

    test("parses month range '* * * 3-9 *'", () => {
      const expr = parseCron("* * * 3-9 *");
      expect(expr.month).toEqual([{ kind: "range", start: 3, end: 9 }]);
    });
  });

  describe("steps", () => {
    test("parses '*/15 * * * *' (every 15 minutes)", () => {
      const expr = parseCron("*/15 * * * *");
      expect(expr.minute).toEqual([{
        kind: "step",
        range: { kind: "range", start: 0, end: 59 },
        step: 15,
      }]);
    });

    test("parses '10-20/3 * * * *' (stepped range)", () => {
      const expr = parseCron("10-20/3 * * * *");
      expect(expr.minute).toEqual([{
        kind: "step",
        range: { kind: "range", start: 10, end: 20 },
        step: 3,
      }]);
    });

    test("parses '5/10 * * * *' (start at 5, step by 10)", () => {
      const expr = parseCron("5/10 * * * *");
      expect(expr.minute).toEqual([{
        kind: "step",
        range: { kind: "range", start: 5, end: 59 },
        step: 10,
      }]);
    });

    test("parses '* */2 * * *' (every 2 hours)", () => {
      const expr = parseCron("* */2 * * *");
      expect(expr.hour).toEqual([{
        kind: "step",
        range: { kind: "range", start: 0, end: 23 },
        step: 2,
      }]);
    });
  });

  describe("lists", () => {
    test("parses '0,15,30,45 * * * *' (minute list)", () => {
      const expr = parseCron("0,15,30,45 * * * *");
      expect(expr.minute).toEqual([
        { kind: "value", value: 0 },
        { kind: "value", value: 15 },
        { kind: "value", value: 30 },
        { kind: "value", value: 45 },
      ]);
    });

    test("parses '* * * 1,4,7,10 *' (month list)", () => {
      const expr = parseCron("* * * 1,4,7,10 *");
      expect(expr.month).toEqual([
        { kind: "value", value: 1 },
        { kind: "value", value: 4 },
        { kind: "value", value: 7 },
        { kind: "value", value: 10 },
      ]);
    });

    test("parses mixed list with range '1-5,10,20-25 * * * *'", () => {
      const expr = parseCron("1-5,10,20-25 * * * *");
      expect(expr.minute).toEqual([
        { kind: "range", start: 1, end: 5 },
        { kind: "value", value: 10 },
        { kind: "range", start: 20, end: 25 },
      ]);
    });
  });

  describe("month name aliases", () => {
    test("parses '* * * JAN *' as month 1", () => {
      const expr = parseCron("* * * JAN *");
      expect(expr.month).toEqual([{ kind: "value", value: 1 }]);
    });

    test("parses case-insensitive '* * * jan *'", () => {
      const expr = parseCron("* * * jan *");
      expect(expr.month).toEqual([{ kind: "value", value: 1 }]);
    });

    test("parses month name range '* * * MAR-SEP *'", () => {
      const expr = parseCron("* * * MAR-SEP *");
      expect(expr.month).toEqual([{ kind: "range", start: 3, end: 9 }]);
    });

    test("parses '* * * DEC *' as month 12", () => {
      const expr = parseCron("* * * DEC *");
      expect(expr.month).toEqual([{ kind: "value", value: 12 }]);
    });
  });

  describe("day-of-week name aliases", () => {
    test("parses '* * * * MON' as 1", () => {
      const expr = parseCron("* * * * MON");
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 1 }]);
    });

    test("parses '* * * * SUN' as 0", () => {
      const expr = parseCron("* * * * SUN");
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 0 }]);
    });

    test("parses '* * * * MON-FRI' as 1-5", () => {
      const expr = parseCron("* * * * MON-FRI");
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 1, end: 5 }]);
    });

    test("parses case-insensitive '* * * * mon-fri'", () => {
      const expr = parseCron("* * * * mon-fri");
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 1, end: 5 }]);
    });
  });

  describe("Sunday = 7 normalization", () => {
    test("parses '* * * * 7' as Sunday (0)", () => {
      const expr = parseCron("* * * * 7");
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 0 }]);
    });

    test("parses '* * * * 0' as Sunday (0)", () => {
      const expr = parseCron("* * * * 0");
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 0 }]);
    });

    test("normalizes 7 in range end '* * * * 1-7'", () => {
      const expr = parseCron("* * * * 1-7");
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 1, end: 0 }]);
    });
  });

  describe("L modifier (last)", () => {
    test("parses 'L' in day-of-month", () => {
      const expr = parseCron("0 0 L * *");
      expect(expr.dayOfMonth).toEqual([{ kind: "last" }]);
    });

    test("parses '5L' in day-of-week (last Friday)", () => {
      const expr = parseCron("0 0 * * 5L");
      expect(expr.dayOfWeek).toEqual([{ kind: "last-weekday", weekday: 5 }]);
    });

    test("parses '0L' in day-of-week (last Sunday)", () => {
      const expr = parseCron("0 0 * * 0L");
      expect(expr.dayOfWeek).toEqual([{ kind: "last-weekday", weekday: 0 }]);
    });

    test("parses '7L' normalized to Sunday (0)", () => {
      const expr = parseCron("0 0 * * 7L");
      expect(expr.dayOfWeek).toEqual([{ kind: "last-weekday", weekday: 0 }]);
    });
  });

  describe("# modifier (nth weekday)", () => {
    test("parses '5#3' (third Friday)", () => {
      const expr = parseCron("0 0 * * 5#3");
      expect(expr.dayOfWeek).toEqual([{ kind: "nth-weekday", weekday: 5, nth: 3 }]);
    });

    test("parses '1#1' (first Monday)", () => {
      const expr = parseCron("0 0 * * 1#1");
      expect(expr.dayOfWeek).toEqual([{ kind: "nth-weekday", weekday: 1, nth: 1 }]);
    });

    test("parses '0#5' (fifth Sunday)", () => {
      const expr = parseCron("0 0 * * 0#5");
      expect(expr.dayOfWeek).toEqual([{ kind: "nth-weekday", weekday: 0, nth: 5 }]);
    });

    test("parses MON#2 (second Monday)", () => {
      const expr = parseCron("0 0 * * MON#2");
      expect(expr.dayOfWeek).toEqual([{ kind: "nth-weekday", weekday: 1, nth: 2 }]);
    });
  });

  describe("W modifier (nearest weekday)", () => {
    test("parses '15W' (nearest weekday to 15th)", () => {
      const expr = parseCron("0 0 15W * *");
      expect(expr.dayOfMonth).toEqual([{ kind: "nearest-weekday", day: 15 }]);
    });

    test("parses '1W' (nearest weekday to 1st)", () => {
      const expr = parseCron("0 0 1W * *");
      expect(expr.dayOfMonth).toEqual([{ kind: "nearest-weekday", day: 1 }]);
    });
  });

  describe("error cases", () => {
    test("throws on empty string", () => {
      expect(() => parseCron("")).toThrow("Empty cron expression");
    });

    test("throws on wrong number of fields", () => {
      expect(() => parseCron("* * *")).toThrow("expected 5 fields but got 3");
    });

    test("throws on out-of-range minute", () => {
      expect(() => parseCron("60 * * * *")).toThrow("out of range");
    });

    test("throws on out-of-range hour", () => {
      expect(() => parseCron("0 24 * * *")).toThrow("out of range");
    });

    test("throws on out-of-range day-of-month", () => {
      expect(() => parseCron("0 0 32 * *")).toThrow("out of range");
    });

    test("throws on day-of-month 0", () => {
      expect(() => parseCron("0 0 0 * *")).toThrow("out of range");
    });

    test("throws on out-of-range month", () => {
      expect(() => parseCron("0 0 * 13 *")).toThrow("out of range");
    });

    test("throws on month 0", () => {
      expect(() => parseCron("0 0 * 0 *")).toThrow("out of range");
    });

    test("throws on out-of-range day-of-week (8)", () => {
      expect(() => parseCron("0 0 * * 8")).toThrow("out of range");
    });

    test("throws on invalid step value", () => {
      expect(() => parseCron("*/0 * * * *")).toThrow("Invalid step value");
    });

    test("throws on negative step value", () => {
      expect(() => parseCron("*/-1 * * * *")).toThrow("Invalid step value");
    });

    test("throws on invalid value string", () => {
      expect(() => parseCron("abc * * * *")).toThrow("Invalid value");
    });

    test("throws on invalid nth value (#0)", () => {
      expect(() => parseCron("0 0 * * 5#0")).toThrow("Invalid nth value");
    });

    test("throws on invalid nth value (#6)", () => {
      expect(() => parseCron("0 0 * * 5#6")).toThrow("Invalid nth value");
    });

    test("throws on negative minute", () => {
      expect(() => parseCron("-1 * * * *")).toThrow("Invalid value");
    });
  });

  describe("complex expressions", () => {
    test("parses '0 0 1,15 * *' (1st and 15th at midnight)", () => {
      const expr = parseCron("0 0 1,15 * *");
      expect(expr.minute).toEqual([{ kind: "value", value: 0 }]);
      expect(expr.hour).toEqual([{ kind: "value", value: 0 }]);
      expect(expr.dayOfMonth).toEqual([
        { kind: "value", value: 1 },
        { kind: "value", value: 15 },
      ]);
    });

    test("parses '*/5 9-17 * * MON-FRI' (every 5 min during business hours)", () => {
      const expr = parseCron("*/5 9-17 * * MON-FRI");
      expect(expr.minute).toEqual([{
        kind: "step",
        range: { kind: "range", start: 0, end: 59 },
        step: 5,
      }]);
      expect(expr.hour).toEqual([{ kind: "range", start: 9, end: 17 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "range", start: 1, end: 5 }]);
    });

    test("parses '30 4 1-7 * 1' (first Monday at 4:30)", () => {
      const expr = parseCron("30 4 1-7 * 1");
      expect(expr.minute).toEqual([{ kind: "value", value: 30 }]);
      expect(expr.hour).toEqual([{ kind: "value", value: 4 }]);
      expect(expr.dayOfMonth).toEqual([{ kind: "range", start: 1, end: 7 }]);
      expect(expr.dayOfWeek).toEqual([{ kind: "value", value: 1 }]);
    });
  });
});
