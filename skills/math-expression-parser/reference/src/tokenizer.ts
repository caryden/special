/**
 * Converts a math expression string into a sequence of tokens.
 *
 * Supports: integers, decimals, operators (+, -, *, /, %, **), parentheses.
 * Whitespace is skipped. Throws on unrecognized characters.
 *
 * @node tokenizer
 * @depends-on token-types
 * @contract tokenizer.test.ts
 * @hint lexer: Walk the input character-by-character. No regex needed.
 */

import { type Token, token } from "./token-types";

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push(token("lparen", "("));
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push(token("rparen", ")"));
      i++;
      continue;
    }

    if (ch === "+") {
      tokens.push(token("plus", "+"));
      i++;
      continue;
    }

    if (ch === "-") {
      tokens.push(token("minus", "-"));
      i++;
      continue;
    }

    if (ch === "*") {
      if (i + 1 < input.length && input[i + 1] === "*") {
        tokens.push(token("power", "**"));
        i += 2;
      } else {
        tokens.push(token("star", "*"));
        i++;
      }
      continue;
    }

    if (ch === "/") {
      tokens.push(token("slash", "/"));
      i++;
      continue;
    }

    if (ch === "%") {
      tokens.push(token("percent", "%"));
      i++;
      continue;
    }

    if (isDigit(ch) || ch === ".") {
      let num = "";
      let hasDot = false;
      while (i < input.length && (isDigit(input[i]) || input[i] === ".")) {
        if (input[i] === ".") {
          if (hasDot) {
            throw new Error(`Unexpected character '.' at position ${i}`);
          }
          hasDot = true;
        }
        num += input[i];
        i++;
      }
      tokens.push(token("number", num));
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}
