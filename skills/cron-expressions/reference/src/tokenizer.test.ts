import { describe, expect, test } from "bun:test";
import { tokenize } from "./tokenizer";

describe("tokenizer", () => {
  test("splits standard 5-field expression", () => {
    expect(tokenize("0 12 * * 1-5")).toEqual(["0", "12", "*", "*", "1-5"]);
  });

  test("handles extra whitespace between fields", () => {
    expect(tokenize("0   12   *   *   1-5")).toEqual(["0", "12", "*", "*", "1-5"]);
  });

  test("trims leading and trailing whitespace", () => {
    expect(tokenize("  0 12 * * 1-5  ")).toEqual(["0", "12", "*", "*", "1-5"]);
  });

  test("handles tab separators", () => {
    expect(tokenize("0\t12\t*\t*\t1-5")).toEqual(["0", "12", "*", "*", "1-5"]);
  });

  test("handles complex fields", () => {
    expect(tokenize("*/15 0,12 1-15 1,6 MON-FRI")).toEqual([
      "*/15", "0,12", "1-15", "1,6", "MON-FRI",
    ]);
  });

  test("handles L and # modifiers", () => {
    expect(tokenize("0 0 L * 5#3")).toEqual(["0", "0", "L", "*", "5#3"]);
  });

  test("handles W modifier", () => {
    expect(tokenize("0 0 15W * *")).toEqual(["0", "0", "15W", "*", "*"]);
  });

  test("throws on empty string", () => {
    expect(() => tokenize("")).toThrow("Empty cron expression");
  });

  test("throws on whitespace-only string", () => {
    expect(() => tokenize("   \t  ")).toThrow("Empty cron expression");
  });

  test("throws on 4 fields", () => {
    expect(() => tokenize("0 12 * *")).toThrow(
      "Invalid cron expression: expected 5 fields but got 4",
    );
  });

  test("throws on 6 fields", () => {
    expect(() => tokenize("0 0 12 * * 1-5")).toThrow(
      "Invalid cron expression: expected 5 fields but got 6",
    );
  });

  test("throws on 1 field", () => {
    expect(() => tokenize("*")).toThrow(
      "Invalid cron expression: expected 5 fields but got 1",
    );
  });
});
