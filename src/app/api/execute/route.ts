import { NextRequest, NextResponse } from "next/server";
import { callAgent } from "@/lib/agent-adapter";
import { evaluate, evaluateWithLLM, buildTestResult } from "@/lib/evaluator";
import { callAI } from "@/lib/ai-provider";
import { TestCase, AgentEndpoint, EvaluatorConfig, EvaluatorType } from "@/lib/types";
import { AIProviderConfig } from "@/lib/ai-provider";

const DEFAULT_EVALUATOR: EvaluatorConfig = { type: "contains", threshold: 0.6 };
const DEFAULT_TIMEOUT = 30000;

export async function POST(request: NextRequest) {
  let body: {
    testCase: TestCase;
    endpoint: AgentEndpoint;
    defaultEvaluator?: EvaluatorConfig;
    timeoutMs?: number;
    judgeProvider?: AIProviderConfig;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体 JSON 不合法" }, { status: 400 });
  }

  const { testCase, endpoint, defaultEvaluator, timeoutMs, judgeProvider } = body;

  if (!testCase || !endpoint) {
    return NextResponse.json(
      { error: "缺少 testCase 或 endpoint" },
      { status: 400 }
    );
  }

  const evaluatorConfig = testCase.evaluator || defaultEvaluator || DEFAULT_EVALUATOR;
  const resolvedTimeout = timeoutMs || DEFAULT_TIMEOUT;

  try {
    // Step 1: Call the agent under test
    const agentResult = await callAgent(endpoint, testCase.input, resolvedTimeout);

    // Step 2: Evaluate the response
    let evalOutput;

    if (evaluatorConfig.type === "llm_judge" && judgeProvider) {
      // Use LLM-as-judge with the configured AI provider
      const judgeFn = (prompt: string) =>
        callAI(judgeProvider, "You are a precise test evaluator.", [
          { role: "user", content: prompt },
        ], 512);

      evalOutput = await evaluateWithLLM(
        agentResult.output,
        testCase.expectedOutput,
        evaluatorConfig,
        judgeFn
      );
    } else if (evaluatorConfig.type === "llm_judge") {
      // llm_judge requested but no AI provider configured — fallback with warning
      const fallback = evaluate(agentResult.output, testCase.expectedOutput, { ...evaluatorConfig, type: "contains" });
      evalOutput = {
        ...fallback,
        rationale: `[未配置 AI 提供商用于 LLM 评判 — 已改用包含匹配] ${fallback.rationale}`,
        evaluatorType: "llm_judge" as EvaluatorType,
      };
    } else {
      // Sync evaluators
      evalOutput = evaluate(
        agentResult.output,
        testCase.expectedOutput,
        evaluatorConfig
      );
    }

    const result = buildTestResult(
      testCase.id,
      agentResult.output,
      evalOutput,
      agentResult.latencyMs,
      agentResult.tokenCost
    );

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    const evalType: EvaluatorType = evaluatorConfig.type;

    const result = buildTestResult(
      testCase.id,
      "",
      { score: 0, passed: false, rationale: "Agent 调用失败", evaluatorType: evalType },
      0,
      0,
      msg
    );

    return NextResponse.json({ result, error: msg });
  }
}
