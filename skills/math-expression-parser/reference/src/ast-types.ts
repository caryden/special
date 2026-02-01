/**
 * AST node type definitions for parsed math expressions.
 *
 * The AST is a tree of three node types:
 * - NumberLiteral: a numeric value (leaf)
 * - UnaryExpr: a unary operator applied to an operand (e.g., -x)
 * - BinaryExpr: a binary operator applied to left and right operands
 *
 * @node ast-types
 * @contract ast-types.test.ts
 * @hint types: These are plain data types with no behavior. Use tagged
 *       unions, sealed classes, or enum variants in the target language.
 */

export type BinaryOp = "+" | "-" | "*" | "/" | "%" | "**";
export type UnaryOp = "-";

export interface NumberLiteral {
  type: "number";
  value: number;
}

export interface UnaryExpr {
  type: "unary";
  op: UnaryOp;
  operand: AstNode;
}

export interface BinaryExpr {
  type: "binary";
  op: BinaryOp;
  left: AstNode;
  right: AstNode;
}

export type AstNode = NumberLiteral | UnaryExpr | BinaryExpr;

export function numberLiteral(value: number): NumberLiteral {
  return { type: "number", value };
}

export function unaryExpr(op: UnaryOp, operand: AstNode): UnaryExpr {
  return { type: "unary", op, operand };
}

export function binaryExpr(
  op: BinaryOp,
  left: AstNode,
  right: AstNode,
): BinaryExpr {
  return { type: "binary", op, left, right };
}
