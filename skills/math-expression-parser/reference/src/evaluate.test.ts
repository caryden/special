import { describe, test, expect } from "bun:test";
import { calc } from "./evaluate";

describe("calc (end-to-end)", () => {
  describe("basic arithmetic", () => {
    test.each([
      { expr: "1 + 2", expected: 3 },
      { expr: "10 - 3", expected: 7 },
      { expr: "4 * 5", expected: 20 },
      { expr: "15 / 4", expected: 3.75 },
      { expr: "10 % 3", expected: 1 },
      { expr: "2 ** 8", expected: 256 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("precedence", () => {
    test.each([
      { expr: "2 + 3 * 4", expected: 14 },
      { expr: "2 * 3 + 4", expected: 10 },
      { expr: "10 - 2 * 3", expected: 4 },
      { expr: "2 + 3 ** 2", expected: 11 },
      { expr: "2 * 3 ** 2", expected: 18 },
      { expr: "2 ** 3 * 4", expected: 32 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("parentheses", () => {
    test.each([
      { expr: "(2 + 3) * 4", expected: 20 },
      { expr: "2 * (3 + 4)", expected: 14 },
      { expr: "(2 + 3) * (4 + 5)", expected: 45 },
      { expr: "((1 + 2) * (3 + 4))", expected: 21 },
      { expr: "(10)", expected: 10 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("associativity", () => {
    test.each([
      { expr: "1 - 2 - 3", expected: -4 },
      { expr: "1 - 2 + 3", expected: 2 },
      { expr: "12 / 3 / 2", expected: 2 },
      { expr: "2 ** 3 ** 2", expected: 512 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("unary minus", () => {
    test.each([
      { expr: "-5", expected: -5 },
      { expr: "--5", expected: 5 },
      { expr: "-(-5)", expected: 5 },
      { expr: "2 * -3", expected: -6 },
      { expr: "-2 ** 2", expected: 4 },
      { expr: "-(2 ** 2)", expected: -4 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("decimals", () => {
    test.each([
      { expr: "0.1 + 0.2", expected: 0.1 + 0.2 },
      { expr: "3.14 * 2", expected: 6.28 },
      { expr: ".5 + .5", expected: 1 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("complex expressions", () => {
    test.each([
      { expr: "2 + 3 * 4 - 1", expected: 13 },
      { expr: "(2 + 3) * (4 - 1) / 5", expected: 3 },
      { expr: "10 % 3 + 2 ** 3", expected: 9 },
      { expr: "2 ** (1 + 2)", expected: 8 },
      { expr: "100 / 10 / 2 + 3", expected: 8 },
    ])("$expr = $expected", ({ expr, expected }) => {
      expect(calc(expr)).toBe(expected);
    });
  });

  describe("errors", () => {
    test("empty expression", () => {
      expect(() => calc("")).toThrow("Empty expression");
    });

    test("whitespace only", () => {
      expect(() => calc("   ")).toThrow("Empty expression");
    });

    test("division by zero", () => {
      expect(() => calc("1 / 0")).toThrow("Division by zero");
    });

    test("modulo by zero", () => {
      expect(() => calc("5 % 0")).toThrow("Modulo by zero");
    });

    test("unmatched paren", () => {
      expect(() => calc("(2 + 3")).toThrow();
    });

    test("invalid character", () => {
      expect(() => calc("2 @ 3")).toThrow();
    });

    test("trailing operator", () => {
      expect(() => calc("2 +")).toThrow();
    });
  });
});
