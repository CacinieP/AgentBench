import { NextRequest, NextResponse } from "next/server";
import { callAgent } from "@/lib/agent-adapter";
import { evaluate, buildTestResult } from "@/lib/evaluator";
import { TestCase, AgentEndpoint, EvaluatorConfig, EvaluatorType } from "@/lib/types";

const DEFAULT_EVALUATOR: EvaluatorConfig = { type: "contains", threshold: 0.6 };
const DEFAULT_TIMEOUT = 30000;

export async function POST(request: NextRequest) {
  let body: {
    testCase: TestCase;
    endpoint: AgentEndpoint;
    defaultEvaluator?: EvaluatorConfig;
    timeoutMs?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { testCase, endpoint, defaultEvaluator, timeoutMs } = body;

  if (!testCase || !endpoint) {
    return NextResponse.json(
      { error: "Missing testCase or endpoint" },
      { status: 400 }
    );
  }

  const evaluatorConfig = testCase.evaluator || defaultEvaluator || DEFAULT_EVALUATOR;
  const resolvedTimeout = timeoutMs || DEFAULT_TIMEOUT;

  try {
    const agentResult = await callAgent(endpoint, testCase.input, resolvedTimeout);

    const evalOutput = evaluate(
      agentResult.output,
      testCase.expectedOutput,
      evaluatorConfig
    );

    const result = buildTestResult(
      testCase.id,
      agentResult.output,
      evalOutput,
      agentResult.latencyMs,
      agentResult.tokenCost
    );

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const evalType: EvaluatorType = evaluatorConfig.type;

    const result = buildTestResult(
      testCase.id,
      "",
      { score: 0, passed: false, rationale: "Agent call failed", evaluatorType: evalType },
      0,
      0,
      msg
    );

    return NextResponse.json({ result, error: msg });
  }
}
