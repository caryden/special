import { describe, test, expect } from "bun:test";
import { tokenize } from "./tokenizer";

describe("tokenizer", () => {
  test("empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  test("whitespace only", () => {
    expect(tokenize("   \t\n\r  ")).toEqual([]);
  });

  test("single integer", () => {
    expect(tokenize("42")).toEqual([{ kind: "number", value: "42" }]);
  });

  test("decimal number", () => {
    expect(tokenize("3.14")).toEqual([{ kind: "number", value: "3.14" }]);
  });

  test("number starting with dot", () => {
    expect(tokenize(".5")).toEqual([{ kind: "number", value: ".5" }]);
  });

  test("all operators", () => {
    const tokens = tokenize("+ - * / % **");
    expect(tokens).toEqual([
      { kind: "plus", value: "+" },
      { kind: "minus", value: "-" },
      { kind: "star", value: "*" },
      { kind: "slash", value: "/" },
      { kind: "percent", value: "%" },
      { kind: "power", value: "**" },
    ]);
  });

  test("parentheses", () => {
    const tokens = tokenize("(1)");
    expect(tokens).toEqual([
      { kind: "lparen", value: "(" },
      { kind: "number", value: "1" },
      { kind: "rparen", value: ")" },
    ]);
  });

  test("complex expression", () => {
    const tokens = tokenize("2 + 3 * (4 - 1)");
    expect(tokens).toEqual([
      { kind: "number", value: "2" },
      { kind: "plus", value: "+" },
      { kind: "number", value: "3" },
      { kind: "star", value: "*" },
      { kind: "lparen", value: "(" },
      { kind: "number", value: "4" },
      { kind: "minus", value: "-" },
      { kind: "number", value: "1" },
      { kind: "rparen", value: ")" },
    ]);
  });

  test("power operator distinguished from multiply", () => {
    const tokens = tokenize("2**3*4");
    expect(tokens).toEqual([
      { kind: "number", value: "2" },
      { kind: "power", value: "**" },
      { kind: "number", value: "3" },
      { kind: "star", value: "*" },
      { kind: "number", value: "4" },
    ]);
  });

  test("no whitespace", () => {
    const tokens = tokenize("1+2");
    expect(tokens).toEqual([
      { kind: "number", value: "1" },
      { kind: "plus", value: "+" },
      { kind: "number", value: "2" },
    ]);
  });

  test("multiple decimals in one number throws", () => {
    expect(() => tokenize("1.2.3")).toThrow("Unexpected character '.'");
  });

  test("unrecognized character throws", () => {
    expect(() => tokenize("2 @ 3")).toThrow("Unexpected character '@'");
  });

  test("unrecognized character reports position", () => {
    expect(() => tokenize("2 @ 3")).toThrow("position 2");
  });
});
