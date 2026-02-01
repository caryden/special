import { describe, test, expect } from "bun:test";
import { token } from "./token-types";

describe("token-types", () => {
  test("token creates a Token with kind and value", () => {
    const t = token("number", "42");
    expect(t.kind).toBe("number");
    expect(t.value).toBe("42");
  });

  test("token creates operator tokens", () => {
    expect(token("plus", "+")).toEqual({ kind: "plus", value: "+" });
    expect(token("minus", "-")).toEqual({ kind: "minus", value: "-" });
    expect(token("star", "*")).toEqual({ kind: "star", value: "*" });
    expect(token("slash", "/")).toEqual({ kind: "slash", value: "/" });
    expect(token("percent", "%")).toEqual({ kind: "percent", value: "%" });
    expect(token("power", "**")).toEqual({ kind: "power", value: "**" });
    expect(token("lparen", "(")).toEqual({ kind: "lparen", value: "(" });
    expect(token("rparen", ")")).toEqual({ kind: "rparen", value: ")" });
  });
});
