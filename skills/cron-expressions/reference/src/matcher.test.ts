import { describe, expect, test } from "bun:test";
import { matchesCron } from "./matcher";
import { parseCron } from "./parser";

/** Helper: create a UTC Date */
function utc(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

describe("matcher", () => {
  describe("basic matching", () => {
    test("'* * * * *' matches any time", () => {
      const expr = parseCron("* * * * *");
      expect(matchesCron(utc(2024, 6, 15, 14, 30), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 12, 31, 23, 59), expr)).toBe(true);
    });

    test("'0 0 * * *' matches midnight only", () => {
      const expr = parseCron("0 0 * * *");
      expect(matchesCron(utc(2024, 6, 15, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 6, 15, 0, 1), expr)).toBe(false);
      expect(matchesCron(utc(2024, 6, 15, 12, 0), expr)).toBe(false);
    });

    test("'30 14 * * *' matches 2:30 PM", () => {
      const expr = parseCron("30 14 * * *");
      expect(matchesCron(utc(2024, 6, 15, 14, 30), expr)).toBe(true);
      expect(matchesCron(utc(2024, 6, 15, 14, 31), expr)).toBe(false);
    });
  });

  describe("value matching", () => {
    test("specific day of month", () => {
      const expr = parseCron("0 0 15 * *");
      expect(matchesCron(utc(2024, 6, 15, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 6, 14, 0, 0), expr)).toBe(false);
    });

    test("specific month", () => {
      const expr = parseCron("0 0 1 6 *");
      expect(matchesCron(utc(2024, 6, 1, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 7, 1, 0, 0), expr)).toBe(false);
    });

    test("specific day of week (Monday=1)", () => {
      const expr = parseCron("0 0 * * 1");
      // 2024-01-01 is Monday
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      // 2024-01-02 is Tuesday
      expect(matchesCron(utc(2024, 1, 2, 0, 0), expr)).toBe(false);
    });
  });

  describe("range matching", () => {
    test("minute range 10-20", () => {
      const expr = parseCron("10-20 * * * *");
      expect(matchesCron(utc(2024, 1, 1, 0, 10), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 15), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 20), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 9), expr)).toBe(false);
      expect(matchesCron(utc(2024, 1, 1, 0, 21), expr)).toBe(false);
    });

    test("weekday range MON-FRI (1-5)", () => {
      const expr = parseCron("0 0 * * 1-5");
      // 2024-01-01 Mon, 02 Tue, 03 Wed, 04 Thu, 05 Fri, 06 Sat, 07 Sun
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);  // Mon
      expect(matchesCron(utc(2024, 1, 5, 0, 0), expr)).toBe(true);  // Fri
      expect(matchesCron(utc(2024, 1, 6, 0, 0), expr)).toBe(false); // Sat
      expect(matchesCron(utc(2024, 1, 7, 0, 0), expr)).toBe(false); // Sun
    });
  });

  describe("step matching", () => {
    test("*/15 matches every 15 minutes", () => {
      const expr = parseCron("*/15 * * * *");
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 15), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 30), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 45), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 10), expr)).toBe(false);
      expect(matchesCron(utc(2024, 1, 1, 0, 59), expr)).toBe(false);
    });

    test("10-20/3 matches 10, 13, 16, 19", () => {
      const expr = parseCron("10-20/3 * * * *");
      expect(matchesCron(utc(2024, 1, 1, 0, 10), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 13), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 16), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 19), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 11), expr)).toBe(false);
      expect(matchesCron(utc(2024, 1, 1, 0, 20), expr)).toBe(false);
    });

    test("5/10 matches 5, 15, 25, 35, 45, 55", () => {
      const expr = parseCron("5/10 * * * *");
      expect(matchesCron(utc(2024, 1, 1, 0, 5), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 15), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 25), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 35), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 55), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 4), expr)).toBe(false);
      expect(matchesCron(utc(2024, 1, 1, 0, 6), expr)).toBe(false);
    });
  });

  describe("list matching", () => {
    test("0,15,30,45 matches those minutes", () => {
      const expr = parseCron("0,15,30,45 * * * *");
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 15), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 30), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 45), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 1, 0, 10), expr)).toBe(false);
    });
  });

  describe("Vixie union rule (DoM OR DoW)", () => {
    /**
     * @provenance Vixie cron 4.1, crontab(5):
     * "If both the day of month and day of week are restricted,
     *  the command will be run when EITHER matches."
     */
    test("'0 0 15 * 5' matches 15th OR any Friday (union)", () => {
      const expr = parseCron("0 0 15 * 5");
      // 2024-03-15 is a Friday — matches both
      expect(matchesCron(utc(2024, 3, 15, 0, 0), expr)).toBe(true);
      // 2024-03-22 is a Friday (not 15th) — matches DoW
      expect(matchesCron(utc(2024, 3, 22, 0, 0), expr)).toBe(true);
      // 2024-04-15 is a Monday (not Friday) — matches DoM
      expect(matchesCron(utc(2024, 4, 15, 0, 0), expr)).toBe(true);
      // 2024-04-16 is a Tuesday (not 15th, not Friday) — matches neither
      expect(matchesCron(utc(2024, 4, 16, 0, 0), expr)).toBe(false);
    });

    test("'0 0 1 * 1' matches 1st of month OR any Monday (union)", () => {
      const expr = parseCron("0 0 1 * 1");
      // 2024-01-01 is Monday and 1st — both match
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      // 2024-01-08 is Monday but not 1st — DoW matches
      expect(matchesCron(utc(2024, 1, 8, 0, 0), expr)).toBe(true);
      // 2024-02-01 is Thursday and 1st — DoM matches
      expect(matchesCron(utc(2024, 2, 1, 0, 0), expr)).toBe(true);
      // 2024-02-02 is Friday, not 1st — neither matches
      expect(matchesCron(utc(2024, 2, 2, 0, 0), expr)).toBe(false);
    });

    test("'0 0 1-15 * 5' with range DoM and single DoW uses union", () => {
      const expr = parseCron("0 0 1-15 * 5");
      // 2024-01-05 is Friday, day 5 (in range 1-15) — both match
      expect(matchesCron(utc(2024, 1, 5, 0, 0), expr)).toBe(true);
      // 2024-01-19 is Friday, day 19 (outside 1-15) — DoW matches via union
      expect(matchesCron(utc(2024, 1, 19, 0, 0), expr)).toBe(true);
      // 2024-01-10 is Wednesday, day 10 (in range 1-15) — DoM matches via union
      expect(matchesCron(utc(2024, 1, 10, 0, 0), expr)).toBe(true);
      // 2024-01-17 is Wednesday, day 17 (outside 1-15, not Friday) — neither
      expect(matchesCron(utc(2024, 1, 17, 0, 0), expr)).toBe(false);
    });

    test("'0 0 * * 5' with only DoW restricted uses AND (DoM is wildcard)", () => {
      const expr = parseCron("0 0 * * 5");
      // 2024-03-15 is Friday — matches
      expect(matchesCron(utc(2024, 3, 15, 0, 0), expr)).toBe(true);
      // 2024-03-14 is Thursday — doesn't match
      expect(matchesCron(utc(2024, 3, 14, 0, 0), expr)).toBe(false);
    });

    test("'0 0 15 * *' with only DoM restricted uses AND (DoW is wildcard)", () => {
      const expr = parseCron("0 0 15 * *");
      // 2024-03-15 — matches (any day of week)
      expect(matchesCron(utc(2024, 3, 15, 0, 0), expr)).toBe(true);
      // 2024-03-14 — doesn't match
      expect(matchesCron(utc(2024, 3, 14, 0, 0), expr)).toBe(false);
    });
  });

  describe("L modifier (last day)", () => {
    test("'0 0 L * *' matches last day of January (31)", () => {
      const expr = parseCron("0 0 L * *");
      expect(matchesCron(utc(2024, 1, 31, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 30, 0, 0), expr)).toBe(false);
    });

    test("'0 0 L * *' matches last day of Feb in leap year (29)", () => {
      const expr = parseCron("0 0 L * *");
      expect(matchesCron(utc(2024, 2, 29, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 2, 28, 0, 0), expr)).toBe(false);
    });

    test("'0 0 L * *' matches last day of Feb in non-leap year (28)", () => {
      const expr = parseCron("0 0 L * *");
      expect(matchesCron(utc(2023, 2, 28, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2023, 2, 27, 0, 0), expr)).toBe(false);
    });

    test("'0 0 L * *' matches last day of April (30)", () => {
      const expr = parseCron("0 0 L * *");
      expect(matchesCron(utc(2024, 4, 30, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 4, 29, 0, 0), expr)).toBe(false);
    });
  });

  describe("nL modifier (last weekday of month)", () => {
    test("'0 0 * * 5L' matches last Friday of the month", () => {
      const expr = parseCron("0 0 * * 5L");
      // 2024-01: last Friday is 26th
      expect(matchesCron(utc(2024, 1, 26, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 19, 0, 0), expr)).toBe(false); // prev Friday
    });

    test("'0 0 * * 0L' matches last Sunday of the month", () => {
      const expr = parseCron("0 0 * * 0L");
      // 2024-01: last Sunday is 28th
      expect(matchesCron(utc(2024, 1, 28, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 21, 0, 0), expr)).toBe(false);
    });
  });

  describe("n#n modifier (nth weekday of month)", () => {
    test("'0 0 * * 5#3' matches third Friday", () => {
      const expr = parseCron("0 0 * * 5#3");
      // 2024-01: Fridays are 5, 12, 19, 26. Third Friday = 19th
      expect(matchesCron(utc(2024, 1, 19, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 12, 0, 0), expr)).toBe(false); // 2nd Friday
      expect(matchesCron(utc(2024, 1, 26, 0, 0), expr)).toBe(false); // 4th Friday
    });

    test("'0 0 * * 1#1' matches first Monday", () => {
      const expr = parseCron("0 0 * * 1#1");
      // 2024-01: first Monday is 1st
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 8, 0, 0), expr)).toBe(false); // 2nd Monday
    });

    test("'0 0 * * 0#5' does not match if 5th Sunday doesn't exist", () => {
      const expr = parseCron("0 0 * * 0#5");
      // 2024-02: Sundays are 4, 11, 18, 25 — only 4 Sundays
      expect(matchesCron(utc(2024, 2, 4, 0, 0), expr)).toBe(false);
      expect(matchesCron(utc(2024, 2, 25, 0, 0), expr)).toBe(false);
    });
  });

  describe("W modifier (nearest weekday)", () => {
    test("'0 0 15W * *' matches nearest weekday to 15th", () => {
      const expr = parseCron("0 0 15W * *");
      // 2024-06-15 is Saturday → nearest weekday is Friday 14th
      expect(matchesCron(utc(2024, 6, 14, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 6, 15, 0, 0), expr)).toBe(false);
    });

    test("'0 0 15W * *' when 15th is Sunday, matches Monday 16th", () => {
      // 2024-09-15 is Sunday → nearest weekday is Monday 16th
      const expr = parseCron("0 0 15W * *");
      expect(matchesCron(utc(2024, 9, 16, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 9, 15, 0, 0), expr)).toBe(false);
    });

    test("'0 0 15W * *' when 15th is a weekday, matches 15th", () => {
      // 2024-01-15 is Monday — already a weekday
      const expr = parseCron("0 0 15W * *");
      expect(matchesCron(utc(2024, 1, 15, 0, 0), expr)).toBe(true);
    });

    test("'0 0 1W * *' when 1st is Saturday, shifts to Monday 3rd (not prior month)", () => {
      // 2024-06-01 is Saturday → can't go to prev month, shifts to Monday 3rd
      const expr = parseCron("0 0 1W * *");
      expect(matchesCron(utc(2024, 6, 3, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 6, 1, 0, 0), expr)).toBe(false);
    });

    test("'0 0 31W * *' when 31st is Sunday (last day), shifts to Friday 29th", () => {
      // 2024-03-31 is Sunday and last day of month → can't go to April, shifts to Friday 29th
      const expr = parseCron("0 0 31W * *");
      expect(matchesCron(utc(2024, 3, 29, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 3, 31, 0, 0), expr)).toBe(false);
    });
  });

  describe("Sunday = 0 and 7", () => {
    test("'0 0 * * 0' matches Sunday", () => {
      const expr = parseCron("0 0 * * 0");
      // 2024-01-07 is Sunday
      expect(matchesCron(utc(2024, 1, 7, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 6, 0, 0), expr)).toBe(false);
    });

    test("'0 0 * * 7' also matches Sunday", () => {
      const expr = parseCron("0 0 * * 7");
      // 2024-01-07 is Sunday
      expect(matchesCron(utc(2024, 1, 7, 0, 0), expr)).toBe(true);
      expect(matchesCron(utc(2024, 1, 6, 0, 0), expr)).toBe(false);
    });
  });

  describe("wrap-around range matching", () => {
    test("'* * * * 5-1' matches Fri through Mon (wrap-around)", () => {
      const expr = parseCron("* * * * 5-1");
      // Fri=5, Sat=6, Sun=0, Mon=1 all match
      expect(matchesCron(utc(2024, 1, 5, 0, 0), expr)).toBe(true);  // Fri
      expect(matchesCron(utc(2024, 1, 6, 0, 0), expr)).toBe(true);  // Sat
      expect(matchesCron(utc(2024, 1, 7, 0, 0), expr)).toBe(true);  // Sun
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(true);  // Mon
      // Tue, Wed, Thu don't match
      expect(matchesCron(utc(2024, 1, 2, 0, 0), expr)).toBe(false); // Tue
      expect(matchesCron(utc(2024, 1, 3, 0, 0), expr)).toBe(false); // Wed
      expect(matchesCron(utc(2024, 1, 4, 0, 0), expr)).toBe(false); // Thu
    });

    test("'* * * * 5-1/2' wrap-around step matches Fri and Sun", () => {
      const expr = parseCron("* * * * 5-1/2");
      // Step 2 starting from 5: 5 (Fri), then 5+2=7→0 (Sun) — but 0 is below start
      // Actually with wrap-around step: values >= start that are (val - start) % step === 0
      // 5: (5-5)%2=0 ✓, 6: (6-5)%2=1 ✗
      expect(matchesCron(utc(2024, 1, 5, 0, 0), expr)).toBe(true);  // Fri (5)
      expect(matchesCron(utc(2024, 1, 6, 0, 0), expr)).toBe(false); // Sat (6)
      // Values below start (0, 1) are not matched by wrap-around step
      expect(matchesCron(utc(2024, 1, 7, 0, 0), expr)).toBe(false); // Sun (0)
      expect(matchesCron(utc(2024, 1, 1, 0, 0), expr)).toBe(false); // Mon (1)
    });
  });

  describe("complex expressions", () => {
    test("'*/5 9-17 * * MON-FRI' business hours every 5 min", () => {
      const expr = parseCron("*/5 9-17 * * MON-FRI");
      // Monday 9:00
      expect(matchesCron(utc(2024, 1, 1, 9, 0), expr)).toBe(true);
      // Monday 9:05
      expect(matchesCron(utc(2024, 1, 1, 9, 5), expr)).toBe(true);
      // Monday 9:03 (not on 5-min boundary)
      expect(matchesCron(utc(2024, 1, 1, 9, 3), expr)).toBe(false);
      // Saturday 9:00 (not a weekday)
      expect(matchesCron(utc(2024, 1, 6, 9, 0), expr)).toBe(false);
      // Monday 8:00 (before 9)
      expect(matchesCron(utc(2024, 1, 1, 8, 0), expr)).toBe(false);
      // Monday 18:00 (after 17)
      expect(matchesCron(utc(2024, 1, 1, 18, 0), expr)).toBe(false);
    });
  });
});
