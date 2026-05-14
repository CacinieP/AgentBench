import { EvaluatorConfig, EvaluatorType, TestResult } from "./types";

export interface EvalOutput {
  score: number;
  passed: boolean;
  rationale: string;
  evaluatorType: EvaluatorType;
}

const DEFAULT_THRESHOLD = 0.6;

export function isAsyncEvaluator(type: EvaluatorType): boolean {
  return type === "llm_judge";
}

export function evaluate(
  actual: string,
  expected: string,
  config: EvaluatorConfig
): EvalOutput {
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;

  switch (config.type) {
    case "exact_match":
      return exactMatch(actual, expected, threshold, config.caseInsensitive ?? false);
    case "contains":
      return containsMatch(actual, expected, threshold, config.caseInsensitive ?? false);
    case "regex":
      return regexMatch(actual, expected, config.pattern || "", threshold);
    case "json_schema":
      return jsonSchemaMatch(actual, config.schema, threshold);
    case "llm_judge":
      // Should not be called for llm_judge — use evaluateWithLLM instead
      return containsMatch(actual, expected, threshold, false);
    default:
      return exactMatch(actual, expected, threshold, false);
  }
}

export async function evaluateWithLLM(
  actual: string,
  expected: string,
  config: EvaluatorConfig,
  judgeProvider: (prompt: string) => Promise<string>
): Promise<EvalOutput> {
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const judgePrompt = config.judgePrompt || buildDefaultJudgePrompt(actual, expected);

  try {
    const response = await judgeProvider(judgePrompt);
    const parsed = parseJudgeResponse(response);

    return {
      score: parsed.score,
      passed: parsed.score >= threshold,
      rationale: parsed.rationale,
      evaluatorType: "llm_judge",
    };
  } catch (e) {
    const fallback = containsMatch(actual, expected, threshold, false);
    const errMsg = e instanceof Error ? e.message : "unknown error";
    return {
      ...fallback,
      rationale: `LLM judge failed (${errMsg}), fell back to contains: ${fallback.rationale}`,
      evaluatorType: "llm_judge",
    };
  }
}

function buildDefaultJudgePrompt(actual: string, expected: string): string {
  return `You are an expert test evaluator. Compare the ACTUAL output against the EXPECTED output and score how well they match.

EXPECTED:
${expected}

ACTUAL:
${actual}

Respond with ONLY a JSON object in this exact format:
{"score": <number 0-1>, "rationale": "<one sentence explanation>"}

Scoring guide:
- 1.0: Perfect match or semantically equivalent
- 0.8-0.9: Covers all key points with minor differences
- 0.6-0.7: Covers most key points but missing some details
- 0.3-0.5: Partial coverage, significant gaps
- 0.0-0.2: Mostly incorrect or irrelevant`;
}

function parseJudgeResponse(text: string): { score: number; rationale: string } {
  // Find JSON between first { and last } to handle braces in rationale text
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) {
    return { score: 0.5, rationale: "Could not parse LLM judge response" };
  }
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace === -1 || lastBrace <= firstBrace) {
    return { score: 0.5, rationale: "Could not parse LLM judge response" };
  }
  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    const score = typeof parsed.score === "number"
      ? Math.max(0, Math.min(1, parsed.score))
      : 0.5;
    const rationale = typeof parsed.rationale === "string"
      ? parsed.rationale
      : "LLM judge evaluation";
    return { score, rationale };
  } catch {
    return { score: 0.5, rationale: "Could not parse LLM judge response" };
  }
}

function exactMatch(
  actual: string,
  expected: string,
  threshold: number,
  caseInsensitive: boolean
): EvalOutput {
  const a = caseInsensitive ? actual.toLowerCase().trim() : actual.trim();
  const e = caseInsensitive ? expected.toLowerCase().trim() : expected.trim();
  const score = a === e ? 1.0 : similarityScore(a, e);
  return {
    score,
    passed: score >= threshold,
    rationale: score >= 1 ? "Exact match" : `Partial match (${(score * 100).toFixed(0)}% similar)`,
    evaluatorType: "exact_match",
  };
}

function containsMatch(
  actual: string,
  expected: string,
  threshold: number,
  caseInsensitive: boolean
): EvalOutput {
  const a = caseInsensitive ? actual.toLowerCase() : actual;
  const e = caseInsensitive ? expected.toLowerCase() : expected;

  if (!e.trim()) {
    return {
      score: actual.trim() ? 0 : 1,
      passed: !actual.trim() ? threshold <= 1 : false,
      rationale: "No expected output defined",
      evaluatorType: "contains",
    };
  }

  const phrases = e.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);

  let matched = 0;
  for (const phrase of phrases) {
    if (a.includes(phrase)) matched++;
  }

  const score = phrases.length > 0 ? matched / phrases.length : 0;
  return {
    score,
    passed: score >= threshold,
    rationale: `${matched}/${phrases.length} key phrases found`,
    evaluatorType: "contains",
  };
}

function regexMatch(actual: string, expected: string, pattern: string, threshold: number): EvalOutput {
  // If pattern is empty, use expected as literal pattern
  const resolvedPattern = pattern || expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const regex = new RegExp(resolvedPattern, "s");
    const match = regex.test(actual);
    const score = match ? 1.0 : 0.0;
    return {
      score,
      passed: score >= threshold,
      rationale: match ? "Regex matched" : `Regex did not match`,
      evaluatorType: "regex",
    };
  } catch {
    return {
      score: 0,
      passed: false,
      rationale: `Invalid regex pattern`,
      evaluatorType: "regex",
    };
  }
}

function jsonSchemaMatch(
  actual: string,
  schema: Record<string, unknown> | undefined,
  threshold: number
): EvalOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(actual);
  } catch (e) {
    return {
      score: 0,
      passed: false,
      rationale: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`,
      evaluatorType: "json_schema",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      score: 0.3,
      passed: 0.3 >= threshold,
      rationale: "Valid JSON but not an object or array",
      evaluatorType: "json_schema",
    };
  }

  // If no schema provided, just check it's valid structured JSON
  if (!schema || Object.keys(schema).length === 0) {
    const isArray = Array.isArray(parsed);
    const keys = isArray ? String((parsed as unknown[]).length) + " items" : Object.keys(parsed as Record<string, unknown>).length + " keys";
    const score = 1.0;
    return {
      score,
      passed: score >= threshold,
      rationale: `Valid ${isArray ? "array" : "object"} with ${keys}`,
      evaluatorType: "json_schema",
    };
  }

  // Validate against provided schema
  return validateAgainstSchema(parsed, schema, threshold);
}

function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
  threshold: number
): EvalOutput {
  let total = 0;
  let matched = 0;
  const issues: string[] = [];

  // Check required fields if specified
  const required = schema.required;
  if (Array.isArray(required)) {
    for (const field of required) {
      total++;
      if (typeof data === "object" && data !== null && field in (data as Record<string, unknown>)) {
        matched++;
      } else {
        issues.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check type if specified
  const schemaType = schema.type;
  if (typeof schemaType === "string") {
    total++;
    const actualType = Array.isArray(data) ? "array" : typeof data;
    if (actualType === schemaType || (schemaType === "object" && typeof data === "object" && !Array.isArray(data))) {
      matched++;
    } else {
      issues.push(`Expected type "${schemaType}", got "${actualType}"`);
    }
  }

  // Check properties if specified
  const properties = schema.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties) && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, propSchema] of Object.entries(properties)) {
      if (typeof propSchema !== "object" || propSchema === null) continue;
      const val = (data as Record<string, unknown>)[key];
      const propSchemaRecord = propSchema as Record<string, unknown>;

      total++;
      if (val === undefined) {
        issues.push(`Missing property: ${key}`);
        continue;
      }

      // Check property type
      if (typeof propSchemaRecord.type === "string") {
        const expectedType = propSchemaRecord.type;
        const actualType = Array.isArray(val) ? "array" : typeof val;
        if (actualType === expectedType) {
          matched++;
        } else {
          issues.push(`Property "${key}" expected "${expectedType}", got "${actualType}"`);
        }
      } else {
        matched++;
      }
    }
  }

  // If no checks were possible, give benefit of the doubt
  if (total === 0) {
    return {
      score: 1.0,
      passed: true,
      rationale: "Valid JSON (no schema constraints to validate)",
      evaluatorType: "json_schema",
    };
  }

  const score = matched / total;
  const rationale = issues.length > 0
    ? `${matched}/${total} checks passed. Issues: ${issues.join("; ")}`
    : `${matched}/${total} schema checks passed`;

  return {
    score,
    passed: score >= threshold,
    rationale,
    evaluatorType: "json_schema",
  };
}

function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export function buildTestResult(
  testCaseId: string,
  actualOutput: string,
  evalOutput: EvalOutput,
  latencyMs: number,
  tokenCost: number,
  error?: string
): TestResult {
  return {
    testCaseId,
    actualOutput,
    passed: evalOutput.passed,
    score: Math.round(evalOutput.score * 1000) / 1000,
    latencyMs,
    tokenCost,
    error: error || (evalOutput.passed ? undefined : `Score ${evalOutput.score.toFixed(2)} below threshold`),
    judgeRationale: evalOutput.rationale,
    evaluatorType: evalOutput.evaluatorType,
  };
}
