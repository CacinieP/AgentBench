import { describe, it, expect } from "vitest";
import {
  evaluate,
  evaluateWithLLM,
  isAsyncEvaluator,
  buildTestResult,
} from "./evaluator";
import { EvaluatorConfig } from "./types";

describe("isAsyncEvaluator", () => {
  it("returns true for llm_judge", () => {
    expect(isAsyncEvaluator("llm_judge")).toBe(true);
  });

  it("returns false for other types", () => {
    expect(isAsyncEvaluator("exact_match")).toBe(false);
    expect(isAsyncEvaluator("contains")).toBe(false);
    expect(isAsyncEvaluator("regex")).toBe(false);
    expect(isAsyncEvaluator("json_schema")).toBe(false);
  });
});

describe("exact_match", () => {
  const config: EvaluatorConfig = { type: "exact_match" };

  it("scores 1.0 for identical strings", () => {
    const result = evaluate("hello world", "hello world", config);
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it("trims whitespace before comparing", () => {
    const result = evaluate("  hello world  ", "hello world", config);
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it("scores partial match with Jaccard similarity", () => {
    const result = evaluate("hello world", "hello there", config);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it("scores 0 for completely different strings", () => {
    const result = evaluate("aaa", "zzz", config);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("respects caseInsensitive flag", () => {
    const ciConfig: EvaluatorConfig = { type: "exact_match", caseInsensitive: true };
    const result = evaluate("Hello World", "hello world", ciConfig);
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it("respects custom threshold", () => {
    const strictConfig: EvaluatorConfig = { type: "exact_match", threshold: 1.0 };
    const result = evaluate("hello world", "hello there", strictConfig);
    expect(result.passed).toBe(false);
  });
});

describe("contains", () => {
  const config: EvaluatorConfig = { type: "contains" };

  it("finds all phrases when expected has newlines", () => {
    const result = evaluate(
      "The response includes apples, bananas, and cherries",
      "apples\nbananas\ncherries",
      config
    );
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
    expect(result.rationale).toContain("3/3");
  });

  it("finds all phrases when expected has semicolons", () => {
    const result = evaluate(
      "status: ok; code: 200",
      "status: ok;code: 200",
      config
    );
    expect(result.score).toBe(1.0);
  });

  it("scores partial when some phrases missing", () => {
    const result = evaluate(
      "apples and bananas",
      "apples\nbananas\ncherries",
      config
    );
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.passed).toBe(true); // 0.667 > default 0.6 threshold
  });

  it("returns 0 when no phrases match", () => {
    const result = evaluate("nothing relevant", "apples\nbananas", config);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("respects caseInsensitive flag", () => {
    const ciConfig: EvaluatorConfig = { type: "contains", caseInsensitive: true };
    const result = evaluate("APPLES", "apples", ciConfig);
    expect(result.score).toBe(1.0);
  });

  it("handles empty expected output", () => {
    const result = evaluate("something", "", config);
    expect(result.rationale).toContain("No expected output");
  });
});

describe("regex", () => {
  const config: EvaluatorConfig = { type: "regex", pattern: "\\d{4}-\\d{2}-\\d{2}" };

  it("matches a date pattern", () => {
    const result = evaluate(
      "Today is 2024-01-15",
      "",
      config
    );
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it("fails when pattern does not match", () => {
    const result = evaluate("no dates here", "", config);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("uses expected as literal when no pattern provided", () => {
    const noPatternConfig: EvaluatorConfig = { type: "regex" };
    const result = evaluate("price is $50", "price is $50", noPatternConfig);
    expect(result.score).toBe(1.0);
  });

  it("handles invalid regex gracefully", () => {
    const badConfig: EvaluatorConfig = { type: "regex", pattern: "[invalid" };
    const result = evaluate("anything", "", badConfig);
    expect(result.score).toBe(0);
    expect(result.rationale).toContain("Invalid regex");
  });
});

describe("json_schema", () => {
  it("validates required fields", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: { required: ["name", "age"] },
    };
    const result = evaluate(
      '{"name": "Alice", "age": 30}',
      "",
      config
    );
    expect(result.score).toBe(1.0);
    expect(result.passed).toBe(true);
  });

  it("detects missing required fields", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: { required: ["name", "age", "email"] },
    };
    const result = evaluate(
      '{"name": "Alice", "age": 30}',
      "",
      config
    );
    expect(result.score).toBeLessThan(1);
    expect(result.rationale).toContain("email");
  });

  it("validates top-level type", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: { type: "object" },
    };
    const result = evaluate('{"key": "value"}', "", config);
    expect(result.score).toBe(1.0);
  });

  it("rejects wrong top-level type", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: { type: "object" },
    };
    const result = evaluate('[1, 2, 3]', "", config);
    expect(result.score).toBeLessThan(1);
  });

  it("validates property types", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: {
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      },
    };
    const result = evaluate(
      '{"name": "Alice", "age": 30}',
      "",
      config
    );
    expect(result.score).toBe(1.0);
  });

  it("detects wrong property types", () => {
    const config: EvaluatorConfig = {
      type: "json_schema",
      schema: {
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      },
    };
    const result = evaluate(
      '{"name": "Alice", "age": "thirty"}',
      "",
      config
    );
    expect(result.score).toBeLessThan(1);
  });

  it("rejects invalid JSON", () => {
    const config: EvaluatorConfig = { type: "json_schema" };
    const result = evaluate("not json at all", "", config);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.rationale).toContain("Invalid JSON");
  });

  it("accepts valid JSON with no schema", () => {
    const config: EvaluatorConfig = { type: "json_schema" };
    const result = evaluate('{"anything": "goes"}', "", config);
    expect(result.score).toBe(1.0);
  });

  it("accepts valid JSON array with no schema", () => {
    const config: EvaluatorConfig = { type: "json_schema" };
    const result = evaluate("[1, 2, 3]", "", config);
    expect(result.score).toBe(1.0);
  });
});

describe("llm_judge", () => {
  it("returns judge result on success", async () => {
    const config: EvaluatorConfig = { type: "llm_judge" };
    const mockProvider = async () =>
      '{"score": 0.9, "rationale": "Very close match"}';

    const result = await evaluateWithLLM("hello", "hi", config, mockProvider);
    expect(result.score).toBe(0.9);
    expect(result.passed).toBe(true);
    expect(result.evaluatorType).toBe("llm_judge");
  });

  it("clamps score to 0-1 range", async () => {
    const config: EvaluatorConfig = { type: "llm_judge" };
    const mockProvider = async () => '{"score": 1.5, "rationale": "test"}';

    const result = await evaluateWithLLM("a", "b", config, mockProvider);
    expect(result.score).toBe(1);
  });

  it("falls back to contains on provider error", async () => {
    const config: EvaluatorConfig = { type: "llm_judge" };
    const mockProvider = async () => {
      throw new Error("API timeout");
    };

    const result = await evaluateWithLLM(
      "has apples",
      "apples",
      config,
      mockProvider
    );
    expect(result.evaluatorType).toBe("llm_judge");
    expect(result.rationale).toContain("LLM judge failed");
    expect(result.rationale).toContain("contains");
  });

  it("falls back to contains on unparseable response", async () => {
    const config: EvaluatorConfig = { type: "llm_judge" };
    const mockProvider = async () => "not json at all";

    const result = await evaluateWithLLM("a", "a", config, mockProvider);
    expect(result.evaluatorType).toBe("llm_judge");
    expect(result.score).toBe(0.5); // parse fallback
  });

  it("extracts JSON from markdown-wrapped response", async () => {
    const config: EvaluatorConfig = { type: "llm_judge" };
    const mockProvider = async () =>
      'Here is my evaluation:\n```json\n{"score": 0.7, "rationale": "Good"}\n```';

    const result = await evaluateWithLLM("a", "a", config, mockProvider);
    expect(result.score).toBe(0.7);
  });
});

describe("buildTestResult", () => {
  it("constructs a TestResult with rounded score", () => {
    const result = buildTestResult(
      "tc-1",
      "actual output",
      { score: 0.8567, passed: true, rationale: "ok", evaluatorType: "contains" },
      150,
      0.003
    );
    expect(result.testCaseId).toBe("tc-1");
    expect(result.score).toBe(0.857);
    expect(result.passed).toBe(true);
    expect(result.latencyMs).toBe(150);
    expect(result.tokenCost).toBe(0.003);
    expect(result.error).toBeUndefined();
  });

  it("includes error message for failed result", () => {
    const result = buildTestResult(
      "tc-2",
      "output",
      { score: 0.3, passed: false, rationale: "bad", evaluatorType: "exact_match" },
      100,
      0
    );
    expect(result.error).toContain("0.30");
    expect(result.judgeRationale).toBe("bad");
  });

  it("uses provided error over threshold error", () => {
    const result = buildTestResult(
      "tc-3",
      "output",
      { score: 0.5, passed: false, rationale: "ok", evaluatorType: "contains" },
      50,
      0,
      "Network timeout"
    );
    expect(result.error).toBe("Network timeout");
  });
});
