/**
 * Parses a cron expression string into a structured CronExpression.
 *
 * Supports standard 5-field cron format with extensions:
 * wildcards (*), values (5), ranges (1-5), steps (star/15, 1-5/2),
 * lists (1,3,5), month names (JAN-DEC), day-of-week names (SUN-SAT),
 * Sunday=7 normalized to 0, L (last day), nL (last weekday),
 * n#n (nth weekday), nW (nearest weekday).
 *
 * @node parser
 * @depends-on cron-types, field-range, tokenizer
 * @contract parser.test.ts
 * @provenance Vixie cron 4.1, POSIX.1-2017 crontab(5)
 * @hint parsing: The parser handles each field independently. Field-specific
 *       modifiers (L, #, W) are only valid in certain fields.
 */

import {
  type CronExpression,
  type CronField,
  type CronFieldEntry,
  valueEntry,
  rangeEntry,
  stepEntry,
  lastEntry,
  lastWeekdayEntry,
  nthWeekdayEntry,
  nearestWeekdayEntry,
  cronExpression,
} from "./cron-types";
import {
  type FieldRange,
  FIELD_RANGES,
  MONTH_ALIASES,
  DOW_ALIASES,
} from "./field-range";
import { tokenize } from "./tokenizer";

type FieldName = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

const FIELD_NAMES: FieldName[] = [
  "minute", "hour", "dayOfMonth", "month", "dayOfWeek",
];

/**
 * Parses a cron expression string into a structured CronExpression.
 * Throws on invalid syntax or out-of-range values.
 */
export function parseCron(expression: string): CronExpression {
  const fields = tokenize(expression);

  const parsed = FIELD_NAMES.map((name, i) =>
    parseField(fields[i], name, FIELD_RANGES[name]),
  );

  return cronExpression(parsed[0], parsed[1], parsed[2], parsed[3], parsed[4]);
}

function parseField(
  raw: string,
  fieldName: FieldName,
  range: FieldRange,
): CronField {
  const parts = raw.split(",");
  const entries: CronFieldEntry[] = [];

  for (const part of parts) {
    entries.push(parsePart(part, fieldName, range));
  }

  return entries;
}

function parsePart(
  part: string,
  fieldName: FieldName,
  range: FieldRange,
): CronFieldEntry {
  // Handle L (last day of month)
  if (part === "L" && fieldName === "dayOfMonth") {
    return lastEntry();
  }

  // Handle nL (last weekday of month, e.g. 5L = last Friday)
  if (fieldName === "dayOfWeek" && /^\d+L$/i.test(part)) {
    const weekday = normalizeDoW(parseInt(part.slice(0, -1), 10));
    validateRange(weekday, range, fieldName);
    return lastWeekdayEntry(weekday);
  }

  // Handle n#n (nth weekday of month, e.g. 5#3 = third Friday)
  if (fieldName === "dayOfWeek" && part.includes("#")) {
    const [wdStr, nthStr] = part.split("#");
    const weekday = resolveAlias(wdStr, fieldName);
    const nth = parseInt(nthStr, 10);
    if (isNaN(nth) || nth < 1 || nth > 5) {
      throw new Error(`Invalid nth value in '${part}': must be 1-5`);
    }
    const normalizedWd = normalizeDoW(weekday);
    validateRange(normalizedWd, range, fieldName);
    return nthWeekdayEntry(normalizedWd, nth);
  }

  // Handle nW (nearest weekday, e.g. 15W)
  if (fieldName === "dayOfMonth" && /^\d+W$/i.test(part)) {
    const day = parseInt(part.slice(0, -1), 10);
    validateRange(day, FIELD_RANGES.dayOfMonth, fieldName);
    return nearestWeekdayEntry(day);
  }

  // Handle step: something/n
  if (part.includes("/")) {
    const [baseStr, stepStr] = part.split("/");
    const stepVal = parseInt(stepStr, 10);
    if (isNaN(stepVal) || stepVal < 1) {
      throw new Error(`Invalid step value '${stepStr}' in field '${fieldName}'`);
    }

    let base: CronFieldEntry;
    if (baseStr === "*") {
      base = rangeEntry(range.min, range.max);
    } else if (baseStr.includes("-")) {
      base = parseRange(baseStr, fieldName, range);
    } else {
      const val = resolveAlias(baseStr, fieldName);
      const normalized = fieldName === "dayOfWeek" ? normalizeDoW(val) : val;
      validateRange(normalized, range, fieldName);
      base = rangeEntry(normalized, range.max);
    }

    return stepEntry(base, stepVal);
  }

  // Handle range: n-n
  if (part.includes("-")) {
    return parseRange(part, fieldName, range);
  }

  // Handle wildcard
  if (part === "*") {
    return rangeEntry(range.min, range.max);
  }

  // Handle single value (number or alias)
  const val = resolveAlias(part, fieldName);
  const normalized = fieldName === "dayOfWeek" ? normalizeDoW(val) : val;
  validateRange(normalized, range, fieldName);
  return valueEntry(normalized);
}

function parseRange(
  part: string,
  fieldName: FieldName,
  range: FieldRange,
): CronFieldEntry {
  const [startStr, endStr] = part.split("-");
  let start = resolveAlias(startStr, fieldName);
  let end = resolveAlias(endStr, fieldName);

  if (fieldName === "dayOfWeek") {
    start = normalizeDoW(start);
    end = normalizeDoW(end);
  }

  validateRange(start, range, fieldName);
  validateRange(end, range, fieldName);

  return rangeEntry(start, end);
}

function resolveAlias(str: string, fieldName: FieldName): number {
  const lower = str.toLowerCase();

  if (fieldName === "month" && MONTH_ALIASES[lower] !== undefined) {
    return MONTH_ALIASES[lower];
  }

  if (fieldName === "dayOfWeek" && DOW_ALIASES[lower] !== undefined) {
    return DOW_ALIASES[lower];
  }

  const val = parseInt(str, 10);
  if (isNaN(val)) {
    throw new Error(`Invalid value '${str}' in field '${fieldName}'`);
  }

  return val;
}

/**
 * Normalize day-of-week value: 7 becomes 0 (both mean Sunday).
 *
 * @provenance Vixie cron 4.1 — Sunday is both 0 and 7
 */
function normalizeDoW(value: number): number {
  return value === 7 ? 0 : value;
}

function validateRange(
  value: number,
  range: FieldRange,
  fieldName: FieldName,
): void {
  if (value < range.min || value > range.max) {
    throw new Error(
      `Value ${value} out of range for field '${fieldName}' (${range.min}-${range.max})`,
    );
  }
}
