import { describe, expect, test } from "bun:test";
import {
  FIELD_RANGES,
  MONTH_ALIASES,
  DOW_ALIASES,
  lastDayOfMonth,
  dayOfWeekForDate,
} from "./field-range";

describe("field-range", () => {
  describe("FIELD_RANGES", () => {
    test("minute range is 0-59", () => {
      expect(FIELD_RANGES.minute).toEqual({ min: 0, max: 59 });
    });

    test("hour range is 0-23", () => {
      expect(FIELD_RANGES.hour).toEqual({ min: 0, max: 23 });
    });

    test("dayOfMonth range is 1-31", () => {
      expect(FIELD_RANGES.dayOfMonth).toEqual({ min: 1, max: 31 });
    });

    test("month range is 1-12", () => {
      expect(FIELD_RANGES.month).toEqual({ min: 1, max: 12 });
    });

    test("dayOfWeek range is 0-6", () => {
      expect(FIELD_RANGES.dayOfWeek).toEqual({ min: 0, max: 6 });
    });
  });

  describe("MONTH_ALIASES", () => {
    test("maps all 12 months", () => {
      expect(Object.keys(MONTH_ALIASES)).toHaveLength(12);
      expect(MONTH_ALIASES.jan).toBe(1);
      expect(MONTH_ALIASES.feb).toBe(2);
      expect(MONTH_ALIASES.mar).toBe(3);
      expect(MONTH_ALIASES.apr).toBe(4);
      expect(MONTH_ALIASES.may).toBe(5);
      expect(MONTH_ALIASES.jun).toBe(6);
      expect(MONTH_ALIASES.jul).toBe(7);
      expect(MONTH_ALIASES.aug).toBe(8);
      expect(MONTH_ALIASES.sep).toBe(9);
      expect(MONTH_ALIASES.oct).toBe(10);
      expect(MONTH_ALIASES.nov).toBe(11);
      expect(MONTH_ALIASES.dec).toBe(12);
    });
  });

  describe("DOW_ALIASES", () => {
    test("maps all 7 days", () => {
      expect(Object.keys(DOW_ALIASES)).toHaveLength(7);
      expect(DOW_ALIASES.sun).toBe(0);
      expect(DOW_ALIASES.mon).toBe(1);
      expect(DOW_ALIASES.tue).toBe(2);
      expect(DOW_ALIASES.wed).toBe(3);
      expect(DOW_ALIASES.thu).toBe(4);
      expect(DOW_ALIASES.fri).toBe(5);
      expect(DOW_ALIASES.sat).toBe(6);
    });
  });

  describe("lastDayOfMonth", () => {
    test("January has 31 days", () => {
      expect(lastDayOfMonth(2024, 1)).toBe(31);
    });

    test("February has 28 days in a non-leap year", () => {
      expect(lastDayOfMonth(2023, 2)).toBe(28);
    });

    test("February has 29 days in a leap year", () => {
      expect(lastDayOfMonth(2024, 2)).toBe(29);
    });

    test("February has 28 days in a century non-leap year", () => {
      expect(lastDayOfMonth(1900, 2)).toBe(28);
    });

    test("February has 29 days in a 400-year leap year", () => {
      expect(lastDayOfMonth(2000, 2)).toBe(29);
    });

    test("April has 30 days", () => {
      expect(lastDayOfMonth(2024, 4)).toBe(30);
    });

    test("June has 30 days", () => {
      expect(lastDayOfMonth(2024, 6)).toBe(30);
    });

    test("September has 30 days", () => {
      expect(lastDayOfMonth(2024, 9)).toBe(30);
    });

    test("November has 30 days", () => {
      expect(lastDayOfMonth(2024, 11)).toBe(30);
    });

    test("December has 31 days", () => {
      expect(lastDayOfMonth(2024, 12)).toBe(31);
    });
  });

  describe("dayOfWeekForDate", () => {
    test("2024-01-01 is Monday (1)", () => {
      expect(dayOfWeekForDate(2024, 1, 1)).toBe(1);
    });

    test("2024-01-07 is Sunday (0)", () => {
      expect(dayOfWeekForDate(2024, 1, 7)).toBe(0);
    });

    test("2024-01-06 is Saturday (6)", () => {
      expect(dayOfWeekForDate(2024, 1, 6)).toBe(6);
    });

    test("2024-02-29 is Thursday (4) — leap year", () => {
      expect(dayOfWeekForDate(2024, 2, 29)).toBe(4);
    });

    test("2024-12-25 is Wednesday (3)", () => {
      expect(dayOfWeekForDate(2024, 12, 25)).toBe(3);
    });
  });
});
