/**
 * Token type definitions for the math expression lexer.
 *
 * @node token-types
 * @contract token-types.test.ts
 * @hint types: These are plain data types with no behavior. Translate as
 *       enums/structs/dataclasses in the target language.
 */

export type TokenKind =
  | "number"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "percent"
  | "power"
  | "lparen"
  | "rparen";

export interface Token {
  kind: TokenKind;
  value: string;
}

export function token(kind: TokenKind, value: string): Token {
  return { kind, value };
}
