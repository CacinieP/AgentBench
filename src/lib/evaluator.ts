import { EvaluatorConfig, EvaluatorType, TestResult } from "./types";

export interface EvalOutput {
  score: number;
  passed: boolean;
  rationale: string;
  evaluatorType: EvaluatorType;
  /** True when the evaluator fell back to a simpler method (e.g. LLM judge → contains) */
  fallback?: boolean;
}

const DEFAULT_THRESHOLD = 0.6;

/** Per-type default thresholds — binary evaluators should default to 1.0 */
const TYPE_DEFAULTS: Partial<Record<EvaluatorType, number>> = {
  regex: 1.0,
  json_schema: 1.0,
};

function getThreshold(config: EvaluatorConfig): number {
  return config.threshold ?? TYPE_DEFAULTS[config.type] ?? DEFAULT_THRESHOLD;
}

export function isAsyncEvaluator(type: EvaluatorType): boolean {
  return type === "llm_judge";
}

export function evaluate(
  actual: string,
  expected: string,
  config: EvaluatorConfig
): EvalOutput {
  const threshold = getThreshold(config);

  switch (config.type) {
    case "exact_match":
      return exactMatch(actual, expected, threshold, config.caseInsensitive ?? false);
    case "contains":
      return containsMatch(actual, expected, threshold, config.caseInsensitive ?? false);
    case "regex":
      return regexMatch(actual, expected, config.pattern || "", threshold);
    case "json_schema":
      return jsonSchemaMatch(actual, config.schema, threshold);
    case "code_test":
      return codeTest(actual, expected, threshold);
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
      fallback: true,
    };
  }
}

function buildDefaultJudgePrompt(actual: string, expected: string): string {
  return `你是一位专家测试评测员。将实际输出与预期输出进行对比，并对其匹配程度进行评分。

预期输出：
${expected}

实际输出：
${actual}

仅回复符合以下格式的 JSON 对象：
{"score": <0-1 之间的数字>, "rationale": "<一句话解释>"}

评分指南：
- 1.0：完全匹配或语义等价
- 0.8-0.9：覆盖所有关键点，有细微差异
- 0.6-0.7：覆盖大部分关键点，但缺少部分细节
- 0.3-0.5：部分覆盖，存在明显遗漏
- 0.0-0.2：基本错误或无关`;
}

function parseJudgeResponse(text: string): { score: number; rationale: string } {
  // Find JSON between first { and last } to handle braces in rationale text
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) {
    return { score: 0.5, rationale: "无法解析 LLM 评判响应" };
  }
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace === -1 || lastBrace <= firstBrace) {
    return { score: 0.5, rationale: "无法解析 LLM 评判响应" };
  }
  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    const score = typeof parsed.score === "number"
      ? Math.max(0, Math.min(1, parsed.score))
      : 0.5;
    const rationale = typeof parsed.rationale === "string"
      ? parsed.rationale
      : "LLM 评判评测";
    return { score, rationale };
  } catch {
    return { score: 0.5, rationale: "无法解析 LLM 评判响应" };
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
    rationale: score >= 1 ? "精确匹配" : `部分匹配（${(score * 100).toFixed(0)}% 相似）`,
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
      score: 0,
      passed: false,
      rationale: "配置错误：预期输出为空，无法进行包含匹配评测",
      evaluatorType: "contains",
    };
  }

  const phrases = e.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);

  let matched = 0;
  const negations: string[] = [];
  for (const phrase of phrases) {
    const { negated, core } = parseNegation(phrase);
    if (negated) {
      // Negated phrase: the actual output should NOT contain the core word
      if (!wordMatch(a, core)) {
        matched++;
      } else {
        negations.push(core);
      }
    } else {
      if (wordMatch(a, phrase)) matched++;
    }
  }

  const score = phrases.length > 0 ? matched / phrases.length : 0;
  let rationale = `${matched}/${phrases.length} 个关键短语匹配`;
  if (negations.length > 0) {
    rationale += `（误匹配否定词：${negations.join("、")}）`;
  }
  return {
    score,
    passed: score >= threshold,
    rationale,
    evaluatorType: "contains",
  };
}

/** Detect negation patterns like "NOT X", "不X", "禁止X" and return {negated, core} */
function parseNegation(phrase: string): { negated: boolean; core: string } {
  const patterns = [
    /^(?:not|no|never|don'?t|mustn'?t|shouldn'?t|cannot|can'?t)\s+(.+)/i,
    /^(?:不|非|无|勿|别|禁止|严禁|避免|防止|不得|不应)\s*(.+)/,
  ];
  for (const pat of patterns) {
    const m = phrase.match(pat);
    if (m) return { negated: true, core: m[1].trim() };
  }
  return { negated: false, core: phrase };
}

/**
 * Word-aware match: short ASCII phrases (<= 3 chars) require word boundaries
 * to avoid "a" matching "catastrophe". CJK characters use direct substring.
 */
function wordMatch(text: string, phrase: string): boolean {
  // CJK phrases: use direct substring (word boundaries don't work with \b)
  if (/[一-鿿㐀-䶿]/.test(phrase)) {
    return text.includes(phrase);
  }
  if (phrase.length <= 3) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }
  return text.includes(phrase);
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
      rationale: match ? "正则匹配成功" : `正则不匹配`,
      evaluatorType: "regex",
    };
  } catch {
    return {
      score: 0,
      passed: false,
      rationale: `配置错误：无效的正则表达式 "${resolvedPattern}"，请检查评测器配置`,
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
      rationale: `无效 JSON：${e instanceof Error ? e.message : "解析错误"}`,
      evaluatorType: "json_schema",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      score: 0.3,
      passed: 0.3 >= threshold,
      rationale: "有效的 JSON 但非对象或数组",
      evaluatorType: "json_schema",
    };
  }

  // If no schema provided, warn — tests without schema constraints are misconfigured
  if (!schema || Object.keys(schema).length === 0) {
    const isArray = Array.isArray(parsed);
    const keys = isArray ? String((parsed as unknown[]).length) + " 项" : Object.keys(parsed as Record<string, unknown>).length + " 个键";
    return {
      score: 0.5,
      passed: false,
      rationale: `配置警告：未提供 JSON Schema 约束（有效的${isArray ? "数组" : "对象"}，包含 ${keys}）。请设置 schema 字段以进行有意义的验证。`,
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
        issues.push(`缺少必填字段: ${field}`);
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
      issues.push(`期望类型 "${schemaType}"，实际为 "${actualType}"`);
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
        issues.push(`缺少属性: ${key}`);
        continue;
      }

      // Check property type
      if (typeof propSchemaRecord.type === "string") {
        const expectedType = propSchemaRecord.type;
        const actualType = Array.isArray(val) ? "array" : typeof val;
        if (actualType === expectedType) {
          matched++;
        } else {
          issues.push(`属性 "${key}" 期望类型 "${expectedType}"，实际为 "${actualType}"`);
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
      rationale: "有效 JSON（无 schema 约束可验证）",
      evaluatorType: "json_schema",
    };
  }

  const score = matched / total;
  const rationale = issues.length > 0
    ? `${matched}/${total} 项检查通过。问题：${issues.join("; ")}`
    : `${matched}/${total} schema 检查通过`;

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

// ── Code Test Evaluator ──

interface CodeTestDimensions {
  codePresence: number;      // 0-1: is there code in the output?
  structuralQuality: number; // 0-1: does the code have good structure?
  requirementCoverage: number; // 0-1: does it address the expected requirements?
}

function codeTest(actual: string, expected: string, threshold: number): EvalOutput {
  const dims = evaluateCodeDimensions(actual, expected);
  // Weighted average: code presence 25%, structure 35%, requirements 40%
  const score = dims.codePresence * 0.25 + dims.structuralQuality * 0.35 + dims.requirementCoverage * 0.4;
  const roundedScore = Math.round(score * 1000) / 1000;

  const parts: string[] = [];
  if (dims.codePresence > 0.5) parts.push("代码存在");
  if (dims.structuralQuality > 0.5) parts.push("结构良好");
  if (dims.requirementCoverage > 0.5) parts.push("需求覆盖");
  const rationale = parts.length > 0
    ? `代码测试（${parts.join("、")}）—— 得分: ${(dims.codePresence * 100).toFixed(0)}%/${(dims.structuralQuality * 100).toFixed(0)}%/${(dims.requirementCoverage * 100).toFixed(0)}%`
    : `代码测试——未检测到有效代码`;

  return {
    score: roundedScore,
    passed: roundedScore >= threshold,
    rationale,
    evaluatorType: "code_test",
  };
}

function evaluateCodeDimensions(actual: string, expected: string): CodeTestDimensions {
  // 1. Code Presence — detect code blocks, common syntax markers
  const codeBlockPattern = /```[\s\S]*?```/g;
  const codeBlocks = actual.match(codeBlockPattern);
  const hasCodeBlocks = codeBlocks && codeBlocks.length > 0;
  const inlineCodeCount = (actual.match(/`[^`]+`/g) || []).length;

  // Language-agnostic code indicators
  const codeIndicators = [
    /\b(function|def|class|import|export|const|let|var|return|if|for|while)\b/g,
    /\b(interface|type|enum|async|await|yield|throw|try|catch)\b/g,
    /[{}\[\];]/g,
    /\b(print|console\.log|System\.out|fmt\.Print|println)\b/g,
    /#include|package\s+\w+|use\s+\w+::|require\s*\(/g,
  ];
  let indicatorScore = 0;
  for (const pattern of codeIndicators) {
    const matches = actual.match(pattern);
    if (matches && matches.length >= 2) indicatorScore += 1;
  }
  const codePresence = hasCodeBlocks ? 1.0
    : inlineCodeCount >= 3 ? 0.8
    : indicatorScore >= 3 ? 0.6
    : indicatorScore >= 1 ? 0.3
    : 0;

  // 2. Structural Quality — check for good coding patterns
  let structuralScore = 0;
  let structuralChecks = 0;

  // Balanced braces
  const braces = (actual.match(/[{}]/g) || []).length;
  const opens = (actual.match(/{/g) || []).length;
  const closes = (actual.match(/}/g) || []).length;
  if (braces > 0) {
    structuralChecks++;
    if (opens === closes) structuralScore++;
  }

  // Function/method declarations
  const funcMatches = actual.match(/\b(function|def|async\s+function|\w+\s*=\s*(\([^)]*\)\s*=>|async\s*\())\b/g);
  if (funcMatches && funcMatches.length >= 1) {
    structuralChecks++;
    structuralScore++;
  }

  // Code blocks with language identifiers
  if (codeBlocks) {
    structuralChecks++;
    const langTagged = codeBlocks.filter(b => /^```\w+/.test(b)).length;
    if (langTagged >= codeBlocks.length * 0.5) structuralScore++;
  }

  // Indentation/structure (detect consistent patterns)
  const indentedLines = actual.split('\n').filter(l => /^(  |\t)/.test(l));
  if (indentedLines.length >= 3) {
    structuralChecks++;
    structuralScore++;
  }

  // Comments (indicates documentation)
  const commentCount = (actual.match(/(\/\/|#|--|\/\*|\*|<!--)/g) || []).length;
  if (commentCount >= 2) {
    structuralChecks++;
    structuralScore += 0.5;
  }

  const structuralQuality = structuralChecks > 0 ? structuralScore / structuralChecks : 0;

  // 3. Requirement Coverage — match expected keywords against actual
  const expectedKeywords = extractKeywords(expected);
  let requirementCoverage = 0;
  if (expectedKeywords.length > 0) {
    const actualLower = actual.toLowerCase();
    let matched = 0;
    for (const kw of expectedKeywords) {
      if (actualLower.includes(kw.toLowerCase())) matched++;
    }
    requirementCoverage = matched / expectedKeywords.length;
  } else {
    // No expected requirements specified — score based on code presence alone
    requirementCoverage = codePresence > 0.5 ? 0.8 : 0.3;
  }

  return { codePresence, structuralQuality, requirementCoverage };
}

function extractKeywords(expected: string): string[] {
  // Extract meaningful keywords from expected output
  // Split on common delimiters, filter short/common words
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "do", "does", "did", "will", "would",
    "should", "could", "can", "may", "might", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "and", "or", "not",
    "but", "if", "then", "else", "when", "where", "which", "who",
    "this", "that", "these", "those", "it", "its", "必须", "应该",
    "需要", "可以", "能够", "包含", "输出", "返回", "实现", "使用",
  ]);

  const words = expected
    .split(/[\s,;.、，；。：:/\n\[\](){}<>"']+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(w);
    }
  }
  return unique.slice(0, 20); // Cap at 20 keywords
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
    error: error || (evalOutput.passed ? undefined : `得分 ${evalOutput.score.toFixed(2)} 低于阈值`),
    judgeRationale: evalOutput.rationale,
    evaluatorType: evalOutput.evaluatorType,
    fallback: evalOutput.fallback,
  };
}
