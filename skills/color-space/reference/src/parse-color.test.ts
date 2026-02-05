import { describe, expect, test } from "bun:test";
import { parseColor } from "./parse-color.ts";

// @provenance CSS Color Level 4 (color syntax)

describe("parse-color", () => {
  describe("hex", () => {
    test("#RGB", () => {
      const c = parseColor("#f00");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(0, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("#RRGGBB", () => {
      const c = parseColor("#ff8000");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(128 / 255, 4);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("#RGBA (alpha ignored, parses RGB)", () => {
      const c = parseColor("#f00f");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(0, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("#RRGGBBAA (alpha ignored, parses RGB)", () => {
      const c = parseColor("#ff0000ff");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
    });

    test("case insensitive", () => {
      const c = parseColor("#FF0000");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
    });

    test("invalid hex throws", () => {
      expect(() => parseColor("#xyz")).toThrow();
    });

    test("wrong length hex throws", () => {
      expect(() => parseColor("#12345")).toThrow();
    });
  });

  describe("named colors", () => {
    test("red", () => {
      const c = parseColor("red");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(0, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("black", () => {
      const c = parseColor("black");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBe(0);
      expect((c as any).g).toBe(0);
      expect((c as any).b).toBe(0);
    });

    test("white", () => {
      const c = parseColor("white");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBe(1);
      expect((c as any).g).toBe(1);
      expect((c as any).b).toBe(1);
    });

    test("case insensitive", () => {
      const c = parseColor("  RED  ");
      expect(c.space).toBe("srgb");
    });

    test("grey = gray", () => {
      const grey = parseColor("grey");
      const gray = parseColor("gray");
      expect(grey.space).toBe("srgb");
      expect(gray.space).toBe("srgb");
      expect((grey as any).r).toBe((gray as any).r);
      expect((grey as any).g).toBe((gray as any).g);
      expect((grey as any).b).toBe((gray as any).b);
    });

    test("unknown name throws", () => {
      expect(() => parseColor("notacolor")).toThrow();
    });
  });

  describe("rgb()", () => {
    test("rgb(255, 0, 0)", () => {
      const c = parseColor("rgb(255, 0, 0)");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(0, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("rgb(100%, 50%, 0%)", () => {
      const c = parseColor("rgb(100%, 50%, 0%)");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(0.5, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("space-separated syntax", () => {
      const c = parseColor("rgb(255 128 0)");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
      expect((c as any).g).toBeCloseTo(128 / 255, 4);
    });

    test("rgba() with alpha", () => {
      const c = parseColor("rgba(255, 0, 0, 0.5)");
      expect(c.space).toBe("srgb");
      expect((c as any).r).toBeCloseTo(1, 10);
    });

    test("invalid rgb throws", () => {
      expect(() => parseColor("rgb()")).toThrow();
    });
  });

  describe("hsl()", () => {
    test("hsl(0, 100%, 50%)", () => {
      const c = parseColor("hsl(0, 100%, 50%)");
      expect(c.space).toBe("hsl");
      expect((c as any).h).toBeCloseTo(0, 10);
      expect((c as any).s).toBeCloseTo(1, 10);
      expect((c as any).l).toBeCloseTo(0.5, 10);
    });

    test("hsl(120deg, 50%, 75%)", () => {
      const c = parseColor("hsl(120deg, 50%, 75%)");
      expect(c.space).toBe("hsl");
      expect((c as any).h).toBeCloseTo(120, 10);
    });

    test("hsla()", () => {
      const c = parseColor("hsla(240, 100%, 50%, 0.5)");
      expect(c.space).toBe("hsl");
      expect((c as any).h).toBeCloseTo(240, 10);
    });

    test("hsl with rad unit", () => {
      const c = parseColor("hsl(3.14159rad, 100%, 50%)");
      expect(c.space).toBe("hsl");
      expect((c as any).h).toBeCloseTo(180, 0);
    });

    test("hsl with turn unit", () => {
      const c = parseColor("hsl(0.5turn, 100%, 50%)");
      expect(c.space).toBe("hsl");
      expect((c as any).h).toBeCloseTo(180, 10);
    });

    test("invalid hsl throws", () => {
      expect(() => parseColor("hsl()")).toThrow();
    });
  });

  describe("hwb()", () => {
    test("hwb(0 0% 0%)", () => {
      const c = parseColor("hwb(0 0% 0%)");
      expect(c.space).toBe("hwb");
      expect((c as any).h).toBeCloseTo(0, 10);
      expect((c as any).w).toBeCloseTo(0, 10);
      expect((c as any).b).toBeCloseTo(0, 10);
    });

    test("invalid hwb throws", () => {
      expect(() => parseColor("hwb()")).toThrow();
    });
  });

  describe("oklab()", () => {
    test("oklab(0.5 0.1 -0.1)", () => {
      const c = parseColor("oklab(0.5 0.1 -0.1)");
      expect(c.space).toBe("oklab");
      expect((c as any).l).toBeCloseTo(0.5, 10);
      expect((c as any).a).toBeCloseTo(0.1, 10);
      expect((c as any).b).toBeCloseTo(-0.1, 10);
    });

    test("invalid oklab throws", () => {
      expect(() => parseColor("oklab()")).toThrow();
    });
  });

  describe("oklch()", () => {
    test("oklch(0.7 0.15 180)", () => {
      const c = parseColor("oklch(0.7 0.15 180)");
      expect(c.space).toBe("oklch");
      expect((c as any).l).toBeCloseTo(0.7, 10);
      expect((c as any).c).toBeCloseTo(0.15, 10);
      expect((c as any).h).toBeCloseTo(180, 10);
    });

    test("oklch with deg unit", () => {
      const c = parseColor("oklch(0.7 0.15 180deg)");
      expect(c.space).toBe("oklch");
      expect((c as any).h).toBeCloseTo(180, 10);
    });

    test("invalid oklch throws", () => {
      expect(() => parseColor("oklch()")).toThrow();
    });
  });

  describe("edge cases", () => {
    test("whitespace trimmed", () => {
      const c = parseColor("  #ff0000  ");
      expect(c.space).toBe("srgb");
    });

    test("empty string throws", () => {
      expect(() => parseColor("")).toThrow();
    });
  });
});
