import { describe, test, expect } from "bun:test";
import { dateRange } from "./date-range";

describe("date-range", () => {
  test.each([
    {
      name: "same day",
      start: 1705276800,
      end: 1705276800,
      expected: "January 15, 2024",
    },
    {
      name: "same day different times",
      start: 1705276800,
      end: 1705320000,
      expected: "January 15, 2024",
    },
    {
      name: "consecutive days same month",
      start: 1705276800,
      end: 1705363200,
      expected: "January 15\u201316, 2024",
    },
    {
      name: "same month range",
      start: 1705276800,
      end: 1705881600,
      expected: "January 15\u201322, 2024",
    },
    {
      name: "same year different months",
      start: 1705276800,
      end: 1707955200,
      expected: "January 15 \u2013 February 15, 2024",
    },
    {
      name: "different years",
      start: 1703721600,
      end: 1705276800,
      expected: "December 28, 2023 \u2013 January 15, 2024",
    },
    {
      name: "full year span",
      start: 1704067200,
      end: 1735603200,
      expected: "January 1 \u2013 December 31, 2024",
    },
    {
      name: "swapped inputs - should auto-correct",
      start: 1705881600,
      end: 1705276800,
      expected: "January 15\u201322, 2024",
    },
    {
      name: "multi-year span",
      start: 1672531200,
      end: 1735689600,
      expected: "January 1, 2023 \u2013 January 1, 2025",
    },
  ])("$name", ({ start, end, expected }) => {
    expect(dateRange(start, end)).toBe(expected);
  });
});
