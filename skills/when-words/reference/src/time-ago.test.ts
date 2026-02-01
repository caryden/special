import { describe, test, expect } from "bun:test";
import { timeAgo } from "./time-ago";

// Reference timestamp: 2024-01-01 00:00:00 UTC = 1704067200
const REF = 1704067200;

describe("time-ago", () => {
  describe("past timestamps", () => {
    test.each([
      { name: "identical timestamps", ts: 1704067200, expected: "just now" },
      { name: "30 seconds ago", ts: 1704067170, expected: "just now" },
      { name: "44 seconds ago", ts: 1704067156, expected: "just now" },
      { name: "45 seconds → 1 minute ago", ts: 1704067155, expected: "1 minute ago" },
      { name: "89 seconds → 1 minute ago", ts: 1704067111, expected: "1 minute ago" },
      { name: "90 seconds → 2 minutes ago", ts: 1704067110, expected: "2 minutes ago" },
      { name: "30 minutes ago", ts: 1704065400, expected: "30 minutes ago" },
      { name: "44 minutes ago", ts: 1704064560, expected: "44 minutes ago" },
      { name: "45 minutes → 1 hour ago", ts: 1704064500, expected: "1 hour ago" },
      { name: "89 minutes → 1 hour ago", ts: 1704061860, expected: "1 hour ago" },
      { name: "90 minutes → 2 hours ago", ts: 1704061800, expected: "2 hours ago" },
      { name: "5 hours ago", ts: 1704049200, expected: "5 hours ago" },
      { name: "21 hours ago", ts: 1703991600, expected: "21 hours ago" },
      { name: "22 hours → 1 day ago", ts: 1703988000, expected: "1 day ago" },
      { name: "35 hours → 1 day ago", ts: 1703941200, expected: "1 day ago" },
      { name: "36 hours → 2 days ago", ts: 1703937600, expected: "2 days ago" },
      { name: "7 days ago", ts: 1703462400, expected: "7 days ago" },
      { name: "25 days ago", ts: 1701907200, expected: "25 days ago" },
      { name: "26 days → 1 month ago", ts: 1701820800, expected: "1 month ago" },
      { name: "45 days → 1 month ago", ts: 1700179200, expected: "1 month ago" },
      { name: "46 days → 2 months ago", ts: 1700092800, expected: "2 months ago" },
      { name: "6 months ago", ts: 1688169600, expected: "6 months ago" },
      { name: "319 days → 11 months ago", ts: 1676505600, expected: "11 months ago" },
      { name: "320 days → 1 year ago", ts: 1676419200, expected: "1 year ago" },
      { name: "547 days → 1 year ago", ts: 1656806400, expected: "1 year ago" },
      { name: "548 days → 2 years ago", ts: 1656720000, expected: "2 years ago" },
      { name: "5 years ago", ts: 1546300800, expected: "5 years ago" },
    ])("$name", ({ ts, expected }) => {
      expect(timeAgo(ts, REF)).toBe(expected);
    });
  });

  describe("future timestamps", () => {
    test.each([
      { name: "in just now (30 seconds)", ts: 1704067230, expected: "just now" },
      { name: "in 1 minute", ts: 1704067260, expected: "in 1 minute" },
      { name: "in 5 minutes", ts: 1704067500, expected: "in 5 minutes" },
      { name: "in 1 hour", ts: 1704070200, expected: "in 1 hour" },
      { name: "in 3 hours", ts: 1704078000, expected: "in 3 hours" },
      { name: "in 1 day", ts: 1704150000, expected: "in 1 day" },
      { name: "in 2 days", ts: 1704240000, expected: "in 2 days" },
      { name: "in 1 month", ts: 1706745600, expected: "in 1 month" },
      { name: "in 1 year", ts: 1735689600, expected: "in 1 year" },
    ])("$name", ({ ts, expected }) => {
      expect(timeAgo(ts, REF)).toBe(expected);
    });
  });
});
