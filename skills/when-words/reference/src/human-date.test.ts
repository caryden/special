import { describe, test, expect } from "bun:test";
import { humanDate } from "./human-date";

// Reference: 2024-01-15 00:00:00 UTC (Monday) = 1705276800
const REF = 1705276800;

describe("human-date", () => {
  describe("today, yesterday, tomorrow", () => {
    test.each([
      { name: "today - same timestamp", ts: 1705276800, expected: "Today" },
      { name: "today - same day different time", ts: 1705320000, expected: "Today" },
      { name: "yesterday", ts: 1705190400, expected: "Yesterday" },
      { name: "tomorrow", ts: 1705363200, expected: "Tomorrow" },
    ])("$name", ({ ts, expected }) => {
      expect(humanDate(ts, REF)).toBe(expected);
    });
  });

  describe("last <day> (2-6 days past)", () => {
    test.each([
      { name: "last Sunday (1 day ago) → Yesterday", ts: 1705190400, expected: "Yesterday" },
      { name: "last Saturday (2 days ago)", ts: 1705104000, expected: "Last Saturday" },
      { name: "last Friday (3 days ago)", ts: 1705017600, expected: "Last Friday" },
      { name: "last Thursday (4 days ago)", ts: 1704931200, expected: "Last Thursday" },
      { name: "last Wednesday (5 days ago)", ts: 1704844800, expected: "Last Wednesday" },
      { name: "last Tuesday (6 days ago)", ts: 1704758400, expected: "Last Tuesday" },
    ])("$name", ({ ts, expected }) => {
      expect(humanDate(ts, REF)).toBe(expected);
    });
  });

  describe("7+ days past → date format", () => {
    test("last Monday (7 days ago) → January 8", () => {
      expect(humanDate(1704672000, REF)).toBe("January 8");
    });
  });

  describe("this <day> (2-6 days future)", () => {
    test.each([
      { name: "tomorrow (1 day future) → Tomorrow", ts: 1705363200, expected: "Tomorrow" },
      { name: "this Wednesday (2 days future)", ts: 1705449600, expected: "This Wednesday" },
      { name: "this Thursday (3 days future)", ts: 1705536000, expected: "This Thursday" },
      { name: "this Sunday (6 days future)", ts: 1705795200, expected: "This Sunday" },
    ])("$name", ({ ts, expected }) => {
      expect(humanDate(ts, REF)).toBe(expected);
    });
  });

  describe("7+ days future → date format", () => {
    test("next Monday (7 days future) → January 22", () => {
      expect(humanDate(1705881600, REF)).toBe("January 22");
    });
  });

  describe("same year, different month", () => {
    test.each([
      { name: "March 1", ts: 1709251200, expected: "March 1" },
      { name: "December 31", ts: 1735603200, expected: "December 31" },
    ])("$name", ({ ts, expected }) => {
      expect(humanDate(ts, REF)).toBe(expected);
    });
  });

  describe("different year", () => {
    test.each([
      { name: "previous year → January 1, 2023", ts: 1672531200, expected: "January 1, 2023" },
      { name: "next year → January 6, 2025", ts: 1736121600, expected: "January 6, 2025" },
    ])("$name", ({ ts, expected }) => {
      expect(humanDate(ts, REF)).toBe(expected);
    });
  });
});
