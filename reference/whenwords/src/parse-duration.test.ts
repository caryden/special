import { describe, test, expect } from "bun:test";
import { parseDuration } from "./parse-duration";

describe("parse-duration", () => {
  describe("compact format", () => {
    test.each([
      { input: "2h30m", expected: 9000 },
      { input: "2h 30m", expected: 9000 },
      { input: "2h, 30m", expected: 9000 },
      { input: "1.5h", expected: 5400 },
      { input: "90m", expected: 5400 },
      { input: "90min", expected: 5400 },
      { input: "45s", expected: 45 },
      { input: "45sec", expected: 45 },
      { input: "2d", expected: 172800 },
      { input: "1w", expected: 604800 },
      { input: "1d 2h 30m", expected: 95400 },
      { input: "2hr", expected: 7200 },
      { input: "2hrs", expected: 7200 },
      { input: "30mins", expected: 1800 },
    ])("$input → $expected", ({ input, expected }) => {
      expect(parseDuration(input)).toBe(expected);
    });
  });

  describe("verbose format", () => {
    test.each([
      { input: "2 hours 30 minutes", expected: 9000 },
      { input: "2 hours and 30 minutes", expected: 9000 },
      { input: "2 hours, and 30 minutes", expected: 9000 },
      { input: "2.5 hours", expected: 9000 },
      { input: "90 minutes", expected: 5400 },
      { input: "2 days", expected: 172800 },
      { input: "1 week", expected: 604800 },
      { input: "1 day, 2 hours, and 30 minutes", expected: 95400 },
      { input: "45 seconds", expected: 45 },
    ])("$input → $expected", ({ input, expected }) => {
      expect(parseDuration(input)).toBe(expected);
    });
  });

  describe("colon notation", () => {
    test.each([
      { input: "2:30", expected: 9000 },
      { input: "1:30:00", expected: 5400 },
      { input: "0:05:30", expected: 330 },
    ])("$input → $expected", ({ input, expected }) => {
      expect(parseDuration(input)).toBe(expected);
    });
  });

  describe("case insensitive and whitespace tolerant", () => {
    test("2H 30M → 9000", () => {
      expect(parseDuration("2H 30M")).toBe(9000);
    });

    test("extra whitespace", () => {
      expect(parseDuration("  2 hours   30 minutes  ")).toBe(9000);
    });
  });

  describe("error cases", () => {
    test("empty string", () => {
      expect(() => parseDuration("")).toThrow();
    });

    test("no units", () => {
      expect(() => parseDuration("hello world")).toThrow();
    });

    test("negative", () => {
      expect(() => parseDuration("-5 hours")).toThrow();
    });

    test("just a number", () => {
      expect(() => parseDuration("42")).toThrow();
    });

    test("unrecognized unit", () => {
      expect(() => parseDuration("5 foos")).toThrow();
    });
  });
});
