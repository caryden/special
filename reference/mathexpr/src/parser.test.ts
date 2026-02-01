import { describe, test, expect } from "bun:test";
import { parse } from "./parser";
import { tokenize } from "./tokenizer";

// Helper: tokenize then parse
function p(input: string) {
  return parse(tokenize(input));
}

describe("parser", () => {
  describe("atoms", () => {
    test("single number", () => {
      expect(p("42")).toEqual({ type: "number", value: 42 });
    });

    test("decimal number", () => {
      expect(p("3.14")).toEqual({ type: "number", value: 3.14 });
    });

    test("parenthesized number", () => {
      expect(p("(42)")).toEqual({ type: "number", value: 42 });
    });

    test("nested parentheses", () => {
      expect(p("((7))")).toEqual({ type: "number", value: 7 });
    });
  });

  describe("binary operations", () => {
    test("addition", () => {
      expect(p("2 + 3")).toEqual({
        type: "binary",
        op: "+",
        left: { type: "number", value: 2 },
        right: { type: "number", value: 3 },
      });
    });

    test("subtraction", () => {
      expect(p("5 - 1")).toEqual({
        type: "binary",
        op: "-",
        left: { type: "number", value: 5 },
        right: { type: "number", value: 1 },
      });
    });

    test("multiplication", () => {
      expect(p("4 * 6")).toEqual({
        type: "binary",
        op: "*",
        left: { type: "number", value: 4 },
        right: { type: "number", value: 6 },
      });
    });

    test("division", () => {
      expect(p("10 / 2")).toEqual({
        type: "binary",
        op: "/",
        left: { type: "number", value: 10 },
        right: { type: "number", value: 2 },
      });
    });

    test("modulo", () => {
      expect(p("10 % 3")).toEqual({
        type: "binary",
        op: "%",
        left: { type: "number", value: 10 },
        right: { type: "number", value: 3 },
      });
    });

    test("power", () => {
      expect(p("2 ** 3")).toEqual({
        type: "binary",
        op: "**",
        left: { type: "number", value: 2 },
        right: { type: "number", value: 3 },
      });
    });
  });

  describe("precedence", () => {
    test("multiply before add: 2 + 3 * 4 → 2 + (3 * 4)", () => {
      const ast = p("2 + 3 * 4");
      expect(ast).toEqual({
        type: "binary",
        op: "+",
        left: { type: "number", value: 2 },
        right: {
          type: "binary",
          op: "*",
          left: { type: "number", value: 3 },
          right: { type: "number", value: 4 },
        },
      });
    });

    test("power before multiply: 2 * 3 ** 2 → 2 * (3 ** 2)", () => {
      const ast = p("2 * 3 ** 2");
      expect(ast).toEqual({
        type: "binary",
        op: "*",
        left: { type: "number", value: 2 },
        right: {
          type: "binary",
          op: "**",
          left: { type: "number", value: 3 },
          right: { type: "number", value: 2 },
        },
      });
    });

    test("parens override precedence: (2 + 3) * 4", () => {
      const ast = p("(2 + 3) * 4");
      expect(ast).toEqual({
        type: "binary",
        op: "*",
        left: {
          type: "binary",
          op: "+",
          left: { type: "number", value: 2 },
          right: { type: "number", value: 3 },
        },
        right: { type: "number", value: 4 },
      });
    });
  });

  describe("associativity", () => {
    test("left-associative add: 1 - 2 - 3 → (1 - 2) - 3", () => {
      const ast = p("1 - 2 - 3");
      expect(ast).toEqual({
        type: "binary",
        op: "-",
        left: {
          type: "binary",
          op: "-",
          left: { type: "number", value: 1 },
          right: { type: "number", value: 2 },
        },
        right: { type: "number", value: 3 },
      });
    });

    test("left-associative multiply: 12 / 3 / 2 → (12 / 3) / 2", () => {
      const ast = p("12 / 3 / 2");
      expect(ast).toEqual({
        type: "binary",
        op: "/",
        left: {
          type: "binary",
          op: "/",
          left: { type: "number", value: 12 },
          right: { type: "number", value: 3 },
        },
        right: { type: "number", value: 2 },
      });
    });

    test("right-associative power: 2 ** 3 ** 2 → 2 ** (3 ** 2)", () => {
      const ast = p("2 ** 3 ** 2");
      expect(ast).toEqual({
        type: "binary",
        op: "**",
        left: { type: "number", value: 2 },
        right: {
          type: "binary",
          op: "**",
          left: { type: "number", value: 3 },
          right: { type: "number", value: 2 },
        },
      });
    });
  });

  describe("unary", () => {
    test("unary minus", () => {
      expect(p("-5")).toEqual({
        type: "unary",
        op: "-",
        operand: { type: "number", value: 5 },
      });
    });

    test("double unary minus", () => {
      expect(p("--5")).toEqual({
        type: "unary",
        op: "-",
        operand: {
          type: "unary",
          op: "-",
          operand: { type: "number", value: 5 },
        },
      });
    });

    test("unary in expression: 2 * -3", () => {
      expect(p("2 * -3")).toEqual({
        type: "binary",
        op: "*",
        left: { type: "number", value: 2 },
        right: {
          type: "unary",
          op: "-",
          operand: { type: "number", value: 3 },
        },
      });
    });
  });

  describe("errors", () => {
    test("empty token list", () => {
      expect(() => parse([])).toThrow("Unexpected end of input");
    });

    test("unmatched left paren", () => {
      expect(() => p("(2 + 3")).toThrow("Expected rparen");
    });

    test("unmatched right paren", () => {
      expect(() => p("2 + 3)")).toThrow("Unexpected token after expression");
    });

    test("unexpected operator at start", () => {
      expect(() => p("* 5")).toThrow("Unexpected token: star");
    });

    test("trailing operator", () => {
      expect(() => p("2 +")).toThrow("Unexpected end of input");
    });
  });
});
