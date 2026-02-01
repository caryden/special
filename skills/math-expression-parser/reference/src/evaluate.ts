/**
 * End-to-end expression evaluation: string in, number out.
 *
 * Composes tokenizer → parser → evaluator into a single function.
 * This is the root node of the library — the public API.
 *
 * @node evaluate
 * @depends-on tokenizer, parser, evaluator
 * @contract evaluate.test.ts
 * @hint composition: This is a thin wrapper. The real logic lives in
 *       the three dependencies. Translate those first.
 */

import { tokenize } from "./tokenizer";
import { parse } from "./parser";
import { evaluate as evalAst } from "./evaluator";

export function calc(expression: string): number {
  if (expression.trim() === "") {
    throw new Error("Empty expression");
  }
  const tokens = tokenize(expression);
  const ast = parse(tokens);
  return evalAst(ast);
}
