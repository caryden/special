/**
 * Tokenizes a cron expression string into individual field strings.
 *
 * Splits on whitespace into exactly 5 fields (standard cron format).
 * Does NOT parse field contents — that's the parser's job.
 *
 * @node tokenizer
 * @contract tokenizer.test.ts
 * @hint lexer: Simple whitespace split. The real complexity is in the parser.
 */

/**
 * Splits a cron expression string into 5 raw field strings.
 * Throws if the expression does not have exactly 5 fields.
 */
export function tokenize(expression: string): [string, string, string, string, string] {
  const trimmed = expression.trim();
  if (trimmed === "") {
    throw new Error("Empty cron expression");
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields but got ${fields.length}`,
    );
  }

  return fields as [string, string, string, string, string];
}
