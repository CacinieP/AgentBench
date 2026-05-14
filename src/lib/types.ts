export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  category: string;
}

export interface TestResult {
  testCaseId: string;
  actualOutput: string;
  passed: boolean;
  score: number; // 0-1
  latencyMs: number;
  tokenCost: number;
  error?: string;
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
