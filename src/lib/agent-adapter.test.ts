import { describe, it, expect } from "vitest";
import { extractByPath, estimateCost } from "./agent-adapter";

describe("extractByPath", () => {
  it("extracts nested value by dot path", () => {
    const obj = { choices: [{ message: { content: "hello" } }] };
    expect(extractByPath(obj, "choices.0.message.content")).toBe("hello");
  });

  it("returns null for missing path", () => {
    const obj = { a: { b: 1 } };
    expect(extractByPath(obj, "a.b.c")).toBe(null);
  });

  it("returns null for nullish intermediate", () => {
    expect(extractByPath(null, "a.b")).toBe(null);
    expect(extractByPath({}, "a.b")).toBe(null);
  });

  it("handles array indices in path", () => {
    const obj = { items: [{ name: "first" }, { name: "second" }] };
    expect(extractByPath(obj, "items.1.name")).toBe("second");
  });

  it("stringifies non-string values", () => {
    expect(extractByPath({ val: 42 }, "val")).toBe("42");
    expect(extractByPath({ val: true }, "val")).toBe("true");
  });

  it("returns null for null leaf value", () => {
    expect(extractByPath({ val: null }, "val")).toBe(null);
  });
});

describe("estimateCost", () => {
  it("returns fallback when no token data", () => {
    expect(estimateCost("openai_chat", 0, 0)).toBe(0.002);
  });

  it("computes cost for openai_chat", () => {
    const cost = estimateCost("openai_chat", 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeCloseTo(0.0075, 2);
  });

  it("computes cost for anthropic_messages", () => {
    const cost = estimateCost("anthropic_messages", 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeCloseTo(0.0105, 2);
  });

  it("uses custom_http rates for unknown type", () => {
    const cost = estimateCost("custom_http", 1000, 500);
    expect(cost).toBeCloseTo(0.0075, 2);
  });
});
