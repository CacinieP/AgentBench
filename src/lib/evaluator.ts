import { EvaluatorConfig, EvaluatorType, TestResult } from "./types";

export interface EvalOutput {
  score: number;
  passed: boolean;
  rationale: string;
  evaluatorType: EvaluatorType;
}

const DEFAULT_THRESHOLD = 0.6;

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
      return regexMatch(actual, config.pattern || expected, threshold);
    case "json_schema":
      return jsonSchemaMatch(actual, threshold);
    case "llm_judge":
      // LLM judge requires async call, return a placeholder that will be resolved later
      return {
        score: containsScore(actual, expected),
        passed: containsScore(actual, expected) >= threshold,
        rationale: "LLM judge evaluation (sync fallback: contains check)",
        evaluatorType: "llm_judge",
      };
    default:
      return exactMatch(actual, expected, threshold, false);
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

  // Split expected into key phrases (by newlines or semicolons)
  const phrases = e.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
  if (phrases.length === 0) phrases.push(e);

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

function regexMatch(actual: string, pattern: string, threshold: number): EvalOutput {
  try {
    const regex = new RegExp(pattern, "s");
    const match = regex.test(actual);
    const score = match ? 1.0 : 0.0;
    return {
      score,
      passed: score >= threshold,
      rationale: match ? "Regex matched" : `Regex "${pattern}" did not match`,
      evaluatorType: "regex",
    };
  } catch {
    return {
      score: 0,
      passed: false,
      rationale: `Invalid regex pattern: ${pattern}`,
      evaluatorType: "regex",
    };
  }
}

function jsonSchemaMatch(actual: string, threshold: number): EvalOutput {
  try {
    const parsed = JSON.parse(actual);
    // Basic validation: must be valid JSON and be an object or array
    if (typeof parsed !== "object" || parsed === null) {
      return {
        score: 0.3,
        passed: 0.3 >= threshold,
        rationale: "Valid JSON but not an object or array",
        evaluatorType: "json_schema",
      };
    }
    // Check if it has keys/structure
    const keys = Object.keys(parsed);
    const score = keys.length > 0 ? 1.0 : 0.5;
    return {
      score,
      passed: score >= threshold,
      rationale: `Valid JSON with ${keys.length} top-level keys`,
      evaluatorType: "json_schema",
    };
  } catch (e) {
    return {
      score: 0,
      passed: false,
      rationale: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`,
      evaluatorType: "json_schema",
    };
  }
}

function containsScore(actual: string, expected: string): number {
  const a = actual.toLowerCase();
  const phrases = expected.toLowerCase().split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
  if (phrases.length === 0) return 0;
  let matched = 0;
  for (const p of phrases) {
    if (a.includes(p)) matched++;
  }
  return matched / phrases.length;
}

function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Jaccard similarity on words
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
