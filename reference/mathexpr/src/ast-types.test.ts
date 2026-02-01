import { describe, test, expect } from "bun:test";
import { numberLiteral, unaryExpr, binaryExpr } from "./ast-types";

describe("ast-types", () => {
  test("numberLiteral creates a number node", () => {
    const n = numberLiteral(42);
    expect(n).toEqual({ type: "number", value: 42 });
  });

  test("unaryExpr creates a unary node", () => {
    const operand = numberLiteral(5);
    const u = unaryExpr("-", operand);
    expect(u).toEqual({
      type: "unary",
      op: "-",
      operand: { type: "number", value: 5 },
    });
  });

  test("binaryExpr creates a binary node", () => {
    const left = numberLiteral(2);
    const right = numberLiteral(3);
    const b = binaryExpr("+", left, right);
    expect(b).toEqual({
      type: "binary",
      op: "+",
      left: { type: "number", value: 2 },
      right: { type: "number", value: 3 },
    });
  });

  test("nested expressions", () => {
    // (2 + 3) * -4
    const inner = binaryExpr("+", numberLiteral(2), numberLiteral(3));
    const neg = unaryExpr("-", numberLiteral(4));
    const expr = binaryExpr("*", inner, neg);
    expect(expr.type).toBe("binary");
    expect(expr.op).toBe("*");
    expect(expr.left).toEqual({
      type: "binary",
      op: "+",
      left: { type: "number", value: 2 },
      right: { type: "number", value: 3 },
    });
    expect(expr.right).toEqual({
      type: "unary",
      op: "-",
      operand: { type: "number", value: 4 },
    });
  });
});
