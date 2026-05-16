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
    expect(result.rationale).toContain("配置错误");
    expect(result.passed).toBe(false);
  });

  it("does not match short phrase as substring of larger word", () => {
    // "a" should NOT match "catastrophe" — requires word boundary for <= 3 chars
    const result = evaluate(
      "catastrophe",
      "a",
      config
    );
    expect(result.score).toBe(0);
    expect(result.rationale).toContain("0/1");
  });

  it("matches short phrase at word boundary", () => {
    const result = evaluate(
      "I need a solution for this",
      "a",
      config
    );
    expect(result.score).toBe(1.0);
  });

  it("detects negation — NOT matching", () => {
    const result = evaluate(
      "The system will delete the record",
      "NOT delete",
      config
    );
    // Actual says "delete", but expected says "NOT delete" → mismatch
    expect(result.score).toBe(0);
    expect(result.rationale).toContain("误匹配否定词");
  });

  it("passes negation check when word absent", () => {
    const result = evaluate(
      "The system will archive the record",
      "NOT delete",
      config
    );
    // Actual does NOT say "delete", expected says "NOT delete" → match
    expect(result.score).toBe(1.0);
  });

  it("handles Chinese negation", () => {
    const result = evaluate(
      "系统会删除此记录",
      "禁止删除",
      config
    );
    expect(result.score).toBe(0);
    expect(result.rationale).toContain("误匹配否定词");
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
    expect(result.rationale).toContain("配置错误");
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
    expect(result.rationale).toContain("无效 JSON");
  });

  it("warns when no schema provided", () => {
    const config: EvaluatorConfig = { type: "json_schema" };
    const result = evaluate('{"anything": "goes"}', "", config);
    expect(result.rationale).toContain("配置警告");
    expect(result.score).toBe(0.5);
    expect(result.passed).toBe(false);
  });

  it("warns when no schema provided for array", () => {
    const config: EvaluatorConfig = { type: "json_schema" };
    const result = evaluate("[1, 2, 3]", "", config);
    expect(result.rationale).toContain("配置警告");
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

describe("code_test", () => {
  const config: EvaluatorConfig = { type: "code_test", threshold: 0.4 };

  it("detects code blocks with language tags", () => {
    const actual = "Here is the fix:\n```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```";
    const result = evaluate(actual, "should have a function", config);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.evaluatorType).toBe("code_test");
    expect(result.rationale).toContain("代码测试");
  });

  it("scores low for plain text with no code", () => {
    const result = evaluate("This is just a plain text response with no code at all.", "anything", config);
    expect(result.score).toBeLessThan(0.3);
    expect(result.rationale).toContain("未检测到有效代码");
  });

  it("detects Python code with def and class", () => {
    const actual = "```python\ndef hello():\n    print('hello')\n\nclass Foo:\n    pass\n```";
    const result = evaluate(actual, "Python function and class", config);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("requires keywords from expected output", () => {
    const actual = "```ts\nconst x = 1;\n```";
    const result = evaluate(actual, "authentication middleware with encryption and validation", config);
    // Low requirement coverage — none of the expected keywords appear in the code
    expect(result.score).toBeLessThan(0.7);
    expect(result.rationale).toContain("代码测试");
  });

  it("scores high for well-structured code matching requirements", () => {
    const actual = `\`\`\`typescript
import { useState } from "react";

export function useCounter(initial: number = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  return { count, increment, decrement };
}
\`\`\``;
    const result = evaluate(actual, "export function hook useState", config);
    expect(result.score).toBeGreaterThan(0.6);
    expect(result.passed).toBe(true);
  });

  it("handles empty expected output", () => {
    const actual = "```js\nconst x = 1;\n```";
    const result = evaluate(actual, "", config);
    // Has code, no requirements — gets decent score from code presence
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("detects inline code snippets", () => {
    const actual = "Use `const x = 1` and then call `console.log(x)`. Also note `let y = 2`.";
    const result = evaluate(actual, "const let console", config);
    // Inline code without blocks gets moderate score
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("respects custom threshold", () => {
    const strictConfig: EvaluatorConfig = { type: "code_test", threshold: 0.8 };
    const actual = "```js\nconst x = 1;\n```";
    const result = evaluate(actual, "complex algorithm with inheritance", strictConfig);
    expect(result.passed).toBe(false);
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
