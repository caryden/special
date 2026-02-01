/**
 * Parses a sequence of tokens into an AST using recursive descent.
 *
 * Operator precedence (lowest to highest):
 *   1. Addition, subtraction (+, -)
 *   2. Multiplication, division, modulo (*, /, %)
 *   3. Exponentiation (**)  — right-associative
 *   4. Unary minus (-)
 *   5. Atoms: numbers, parenthesized expressions
 *
 * @node parser
 * @depends-on token-types, ast-types
 * @contract parser.test.ts
 * @hint parser: Classic recursive descent. Each precedence level is a
 *       function that calls the next-higher level. Right-associativity
 *       for ** is handled by recursing into the same level instead of
 *       the next.
 */

import { type Token, type TokenKind } from "./token-types";
import {
  type AstNode,
  numberLiteral,
  unaryExpr,
  binaryExpr,
} from "./ast-types";

export function parse(tokens: Token[]): AstNode {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function advance(): Token {
    const t = tokens[pos];
    pos++;
    return t;
  }

  function expect(kind: TokenKind): Token {
    const t = peek();
    if (!t || t.kind !== kind) {
      throw new Error(
        `Expected ${kind} but got ${t ? t.kind : "end of input"}`,
      );
    }
    return advance();
  }

  // Level 1: addition and subtraction (lowest precedence)
  function parseAddSub(): AstNode {
    let left = parseMulDiv();
    while (peek()?.kind === "plus" || peek()?.kind === "minus") {
      const opToken = advance();
      const op = opToken.kind === "plus" ? "+" : "-";
      const right = parseMulDiv();
      left = binaryExpr(op, left, right);
    }
    return left;
  }

  // Level 2: multiplication, division, modulo
  function parseMulDiv(): AstNode {
    let left = parsePower();
    while (
      peek()?.kind === "star" ||
      peek()?.kind === "slash" ||
      peek()?.kind === "percent"
    ) {
      const opToken = advance();
      const op =
        opToken.kind === "star" ? "*" : opToken.kind === "slash" ? "/" : "%";
      const right = parsePower();
      left = binaryExpr(op, left, right);
    }
    return left;
  }

  // Level 3: exponentiation (right-associative)
  function parsePower(): AstNode {
    const base = parseUnary();
    if (peek()?.kind === "power") {
      advance();
      const exponent = parsePower(); // right-recursive for right-associativity
      return binaryExpr("**", base, exponent);
    }
    return base;
  }

  // Level 4: unary minus
  function parseUnary(): AstNode {
    if (peek()?.kind === "minus") {
      advance();
      const operand = parseUnary(); // allow chained unary: --x
      return unaryExpr("-", operand);
    }
    return parseAtom();
  }

  // Level 5: atoms — numbers and parenthesized expressions
  function parseAtom(): AstNode {
    const t = peek();

    if (!t) {
      throw new Error("Unexpected end of input");
    }

    if (t.kind === "number") {
      advance();
      return numberLiteral(parseFloat(t.value));
    }

    if (t.kind === "lparen") {
      advance();
      const expr = parseAddSub();
      expect("rparen");
      return expr;
    }

    throw new Error(`Unexpected token: ${t.kind} '${t.value}'`);
  }

  const ast = parseAddSub();

  if (pos < tokens.length) {
    const remaining = tokens[pos];
    throw new Error(
      `Unexpected token after expression: ${remaining.kind} '${remaining.value}'`,
    );
  }

  return ast;
}
