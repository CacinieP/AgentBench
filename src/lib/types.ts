export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  category: string;
  evaluator?: EvaluatorConfig;
}

export type EvaluatorType = "exact_match" | "contains" | "regex" | "json_schema" | "llm_judge" | "code_test";

export interface EvaluatorConfig {
  type: EvaluatorType;
  threshold?: number; // 0-1, minimum score to pass
  caseInsensitive?: boolean; // for exact_match / contains
  pattern?: string; // for regex
  schema?: Record<string, unknown>; // for json_schema
  judgePrompt?: string; // for llm_judge
}

export interface TestResult {
  testCaseId: string;
  actualOutput: string;
  passed: boolean;
  score: number; // 0-1
  latencyMs: number;
  tokenCost: number;
  error?: string;
  judgeRationale?: string;
  evaluatorType?: EvaluatorType;
  /** True when the evaluator fell back to a simpler method */
  fallback?: boolean;
}

export interface TestRun {
  id: string;
  suiteId: string;
  suiteName: string;
  timestamp: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
    totalLatencyMs: number;
    totalTokenCost: number;
  };
  agentVersion: string;
  modelVersion: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  agentType: string;
  cases: TestCase[];
  lastRun?: TestRun;
}

export interface ComparisonResult {
  baseline: TestRun;
  candidate: TestRun;
  regressions: Regression[];
  improvements: Improvement[];
  summary: {
    scoreDelta: number;
    passRateDelta: number;
    latencyDelta: number;
    costDelta: number;
  };
}

export interface Regression {
  testCaseId: string;
  testName: string;
  baselineScore: number;
  candidateScore: number;
  delta: number;
}

export interface Improvement {
  testCaseId: string;
  testName: string;
  baselineScore: number;
  candidateScore: number;
  delta: number;
}

export interface AIAnalysis {
  summary: string;
  regressionPatterns: string[];
  suggestedFixes: string[];
  riskAssessment: "low" | "medium" | "high";
}

export type AgentEndpointType = "openai_chat" | "anthropic_messages" | "custom_http";

export interface AgentEndpoint {
  type: AgentEndpointType;
  url: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  /** JSON path to extract text from response, e.g. "choices.0.message.content" */
  responsePath?: string;
}

export interface AgentRunConfig {
  endpoint: AgentEndpoint;
  /** Default evaluator config if TestCase.evaluator is not set */
  defaultEvaluator: EvaluatorConfig;
  /** Max wait time per test case in ms */
  timeoutMs: number;
}
