/**
 * Evaluates an AST node to produce a numeric result.
 *
 * Supports: +, -, *, /, %, ** (power), unary negation.
 * Throws on division by zero and modulo by zero.
 *
 * @node evaluator
 * @depends-on ast-types
 * @contract evaluator.test.ts
 * @hint evaluator: Simple recursive tree walk. Match on node type,
 *       recurse into children, apply the operator.
 */

import { type AstNode } from "./ast-types";

export function evaluate(node: AstNode): number {
  if (node.type === "number") {
    return node.value;
  }

  if (node.type === "unary") {
    return -evaluate(node.operand);
  }

  const left = evaluate(node.left);
  const right = evaluate(node.right);

  if (node.op === "+") return left + right;
  if (node.op === "-") return left - right;
  if (node.op === "*") return left * right;
  if (node.op === "**") return left ** right;

  if (node.op === "/") {
    if (right === 0) throw new Error("Division by zero");
    return left / right;
  }

  // node.op === "%"
  if (right === 0) throw new Error("Modulo by zero");
  return left % right;
}
