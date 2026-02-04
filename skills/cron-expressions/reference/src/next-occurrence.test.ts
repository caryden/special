import { describe, expect, test } from "bun:test";
import { nextOccurrence, prevOccurrence } from "./next-occurrence";
import { parseCron } from "./parser";

function utc(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

describe("nextOccurrence", () => {
  describe("basic expressions", () => {
    test("'* * * * *' returns next minute", () => {
      const expr = parseCron("* * * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 1, 0, 1));
    });

    test("'0 * * * *' returns next hour on the hour", () => {
      const expr = parseCron("0 * * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 30));
      expect(result).toEqual(utc(2024, 1, 1, 1, 0));
    });

    test("'0 0 * * *' midnight — skips to next midnight", () => {
      const expr = parseCron("0 0 * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 2, 0, 0));
    });

    test("'30 14 * * *' from before 2:30pm", () => {
      const expr = parseCron("30 14 * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 10, 0));
      expect(result).toEqual(utc(2024, 1, 1, 14, 30));
    });

    test("'30 14 * * *' from after 2:30pm goes to next day", () => {
      const expr = parseCron("30 14 * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 15, 0));
      expect(result).toEqual(utc(2024, 1, 2, 14, 30));
    });
  });

  describe("step expressions", () => {
    test("'*/15 * * * *' from minute 3", () => {
      const expr = parseCron("*/15 * * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 3));
      expect(result).toEqual(utc(2024, 1, 1, 0, 15));
    });

    test("'*/15 * * * *' from minute 45", () => {
      const expr = parseCron("*/15 * * * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 45));
      expect(result).toEqual(utc(2024, 1, 1, 1, 0));
    });
  });

  describe("weekday expressions", () => {
    test("'0 0 * * 1' finds next Monday", () => {
      const expr = parseCron("0 0 * * 1");
      // 2024-01-01 is Monday, next Monday is 2024-01-08
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 8, 0, 0));
    });

    test("'0 0 * * 5' finds next Friday", () => {
      const expr = parseCron("0 0 * * 5");
      // 2024-01-01 is Monday, next Friday is 2024-01-05
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 5, 0, 0));
    });

    test("'0 0 * * 0' finds next Sunday", () => {
      const expr = parseCron("0 0 * * 0");
      // 2024-01-01 is Monday, next Sunday is 2024-01-07
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 7, 0, 0));
    });
  });

  describe("month expressions", () => {
    test("'0 0 1 6 *' finds June 1st", () => {
      const expr = parseCron("0 0 1 6 *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 6, 1, 0, 0));
    });

    test("'0 0 1 1 *' after Jan 1 finds next year's Jan 1", () => {
      const expr = parseCron("0 0 1 1 *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2025, 1, 1, 0, 0));
    });
  });

  describe("L modifier", () => {
    test("'0 0 L * *' finds last day of January", () => {
      const expr = parseCron("0 0 L * *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 31, 0, 0));
    });

    test("'0 0 L 2 *' in leap year finds Feb 29", () => {
      const expr = parseCron("0 0 L 2 *");
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 2, 29, 0, 0));
    });

    test("'0 0 L 2 *' in non-leap year finds Feb 28", () => {
      const expr = parseCron("0 0 L 2 *");
      const result = nextOccurrence(expr, utc(2025, 1, 1, 0, 0));
      expect(result).toEqual(utc(2025, 2, 28, 0, 0));
    });
  });

  describe("nth weekday (#)", () => {
    test("'0 0 * * 5#3' finds third Friday of January 2024", () => {
      const expr = parseCron("0 0 * * 5#3");
      // Jan 2024 Fridays: 5, 12, 19, 26. Third = 19th
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 19, 0, 0));
    });

    test("'0 0 * * 1#1' finds first Monday of February 2024", () => {
      const expr = parseCron("0 0 * * 1#1");
      // Feb 2024 starts Thursday. First Monday = Feb 5
      const result = nextOccurrence(expr, utc(2024, 1, 31, 0, 0));
      expect(result).toEqual(utc(2024, 2, 5, 0, 0));
    });
  });

  describe("W modifier", () => {
    test("'0 0 15W * *' when 15th is Saturday, matches Friday 14th", () => {
      const expr = parseCron("0 0 15W * *");
      // June 2024: 15th is Saturday, nearest weekday is Friday 14th
      const result = nextOccurrence(expr, utc(2024, 6, 1, 0, 0));
      expect(result).toEqual(utc(2024, 6, 14, 0, 0));
    });
  });

  describe("Vixie union rule", () => {
    test("'0 0 15 * 5' matches Friday OR 15th (union)", () => {
      const expr = parseCron("0 0 15 * 5");
      // From Jan 1 (Mon), first match should be Jan 5 (Friday)
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 5, 0, 0));
    });
  });

  describe("edge cases", () => {
    test("start time seconds are ignored (rounds to next minute)", () => {
      const expr = parseCron("* * * * *");
      const start = new Date(Date.UTC(2024, 0, 1, 0, 0, 30));
      const result = nextOccurrence(expr, start);
      expect(result).toEqual(utc(2024, 1, 1, 0, 1));
    });

    test("excludes the start time itself", () => {
      const expr = parseCron("0 0 * * *");
      // Start at exactly midnight — should find NEXT midnight
      const result = nextOccurrence(expr, utc(2024, 1, 1, 0, 0));
      expect(result).toEqual(utc(2024, 1, 2, 0, 0));
    });

    test("crosses year boundary", () => {
      const expr = parseCron("0 0 1 1 *");
      const result = nextOccurrence(expr, utc(2024, 12, 31, 0, 0));
      expect(result).toEqual(utc(2025, 1, 1, 0, 0));
    });
  });
});

describe("prevOccurrence", () => {
  test("'* * * * *' returns previous minute", () => {
    const expr = parseCron("* * * * *");
    const result = prevOccurrence(expr, utc(2024, 1, 1, 0, 5));
    expect(result).toEqual(utc(2024, 1, 1, 0, 4));
  });

  test("'0 0 * * *' finds previous midnight", () => {
    const expr = parseCron("0 0 * * *");
    const result = prevOccurrence(expr, utc(2024, 1, 2, 12, 0));
    expect(result).toEqual(utc(2024, 1, 2, 0, 0));
  });

  test("'0 0 * * *' at midnight finds previous day's midnight", () => {
    const expr = parseCron("0 0 * * *");
    const result = prevOccurrence(expr, utc(2024, 1, 2, 0, 0));
    expect(result).toEqual(utc(2024, 1, 1, 0, 0));
  });

  test("'0 0 * * 1' finds previous Monday", () => {
    const expr = parseCron("0 0 * * 1");
    // From Wednesday Jan 3, prev Monday is Jan 1
    const result = prevOccurrence(expr, utc(2024, 1, 3, 0, 0));
    expect(result).toEqual(utc(2024, 1, 1, 0, 0));
  });

  test("returns null if no match within search window", () => {
    // Feb 30 never exists — but we use a cron that can never match
    // Use a specific impossible combination: Feb 31st
    const expr = parseCron("0 0 31 2 *");
    const result = prevOccurrence(expr, utc(2024, 6, 1, 0, 0));
    expect(result).toBe(null);
  });
});
