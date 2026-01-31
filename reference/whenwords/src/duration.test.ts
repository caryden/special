import { describe, test, expect } from "bun:test";
import { duration } from "./duration";

describe("duration", () => {
  describe("normal mode", () => {
    test.each([
      { seconds: 0, expected: "0 seconds" },
      { seconds: 1, expected: "1 second" },
      { seconds: 45, expected: "45 seconds" },
      { seconds: 60, expected: "1 minute" },
      { seconds: 90, expected: "1 minute, 30 seconds" },
      { seconds: 120, expected: "2 minutes" },
      { seconds: 3600, expected: "1 hour" },
      { seconds: 3661, expected: "1 hour, 1 minute" },
      { seconds: 5400, expected: "1 hour, 30 minutes" },
      { seconds: 9000, expected: "2 hours, 30 minutes" },
      { seconds: 86400, expected: "1 day" },
      { seconds: 93600, expected: "1 day, 2 hours" },
      { seconds: 604800, expected: "7 days" },
      { seconds: 2592000, expected: "1 month" },
      { seconds: 31536000, expected: "1 year" },
      { seconds: 36720000, expected: "1 year, 2 months" },
    ])("$seconds seconds → $expected", ({ seconds, expected }) => {
      expect(duration(seconds)).toBe(expected);
    });
  });

  describe("compact mode", () => {
    test.each([
      { seconds: 0, expected: "0s" },
      { seconds: 45, expected: "45s" },
      { seconds: 3661, expected: "1h 1m" },
      { seconds: 9000, expected: "2h 30m" },
      { seconds: 93600, expected: "1d 2h" },
    ])("$seconds seconds → $expected", ({ seconds, expected }) => {
      expect(duration(seconds, { compact: true })).toBe(expected);
    });
  });

  describe("max_units option", () => {
    test.each([
      { seconds: 3661, max_units: 1, expected: "1 hour" },
      { seconds: 93600, max_units: 1, expected: "1 day" },
      { seconds: 93661, max_units: 3, expected: "1 day, 2 hours, 1 minute" },
    ])("$seconds seconds (max_units: $max_units) → $expected", ({ seconds, max_units, expected }) => {
      expect(duration(seconds, { max_units })).toBe(expected);
    });
  });

  describe("compact + max_units", () => {
    test("9000 seconds compact max_units 1 → 3h", () => {
      expect(duration(9000, { compact: true, max_units: 1 })).toBe("3h");
    });
  });

  describe("error cases", () => {
    test("throws on negative seconds", () => {
      expect(() => duration(-100)).toThrow();
    });
  });
});
