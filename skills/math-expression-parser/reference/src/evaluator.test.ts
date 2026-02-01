import { describe, test, expect } from "bun:test";
import { evaluate } from "./evaluator";
import { numberLiteral, unaryExpr, binaryExpr } from "./ast-types";

describe("evaluator", () => {
  test("number literal", () => {
    expect(evaluate(numberLiteral(42))).toBe(42);
  });

  test("unary negation", () => {
    expect(evaluate(unaryExpr("-", numberLiteral(5)))).toBe(-5);
  });

  test("addition", () => {
    expect(
      evaluate(binaryExpr("+", numberLiteral(2), numberLiteral(3))),
    ).toBe(5);
  });

  test("subtraction", () => {
    expect(
      evaluate(binaryExpr("-", numberLiteral(10), numberLiteral(4))),
    ).toBe(6);
  });

  test("multiplication", () => {
    expect(
      evaluate(binaryExpr("*", numberLiteral(3), numberLiteral(7))),
    ).toBe(21);
  });

  test("division", () => {
    expect(
      evaluate(binaryExpr("/", numberLiteral(10), numberLiteral(4))),
    ).toBe(2.5);
  });

  test("modulo", () => {
    expect(
      evaluate(binaryExpr("%", numberLiteral(10), numberLiteral(3))),
    ).toBe(1);
  });

  test("power", () => {
    expect(
      evaluate(binaryExpr("**", numberLiteral(2), numberLiteral(10))),
    ).toBe(1024);
  });

  test("division by zero throws", () => {
    expect(() =>
      evaluate(binaryExpr("/", numberLiteral(1), numberLiteral(0))),
    ).toThrow("Division by zero");
  });

  test("modulo by zero throws", () => {
    expect(() =>
      evaluate(binaryExpr("%", numberLiteral(1), numberLiteral(0))),
    ).toThrow("Modulo by zero");
  });

  test("nested expression: (2 + 3) * -4", () => {
    const expr = binaryExpr(
      "*",
      binaryExpr("+", numberLiteral(2), numberLiteral(3)),
      unaryExpr("-", numberLiteral(4)),
    );
    expect(evaluate(expr)).toBe(-20);
  });
});
