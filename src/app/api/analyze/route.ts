import { NextRequest, NextResponse } from "next/server";
import { callAI, AIProviderConfig } from "@/lib/ai-provider";

const SYSTEM_PROMPT = `你是一位 AI Agent 质量分析师。分析提供的测试运行数据并仅回复有效 JSON。
你的回复必须是一个 JSON 对象，包含以下字段：
- summary: 2-3 句话的分析字符串
- regressionPatterns: 2-3 个已识别模式的字符串数组
- suggestedFixes: 2-3 个可操作修复建议的字符串数组
- riskAssessment: "low"、"medium" 或 "high" 之一`;

function buildUserPrompt(baseline: string, candidate: string, testCases: unknown[]): string {
  return `分析以下测试运行对比。

基准版本: ${baseline}
候选版本: ${candidate}
测试用例: ${JSON.stringify(testCases, null, 2)}

仅回复有效 JSON。`;
}

const DEMO_RESPONSE = {
  summary:
    "基准版本与候选版本的对比：候选版本在回复质量和同理心方面有所提升。关键改进点包括更详细的解决方案选项和更好的升级路径。",
  regressionPatterns: [
    "基准版本回复普遍过于简短，提示系统提示词引导不足",
    "缺少流程说明与所有基准版本中较低的得分相关",
  ],
  suggestedFixes: [
    "通过同理心指南和必需的回复要素增强系统提示词",
    "添加完整性检查清单，确保所有解决方案组件均已包含",
    "将模型升级作为主要质量驱动因素，并通过 A/B 测试验证",
  ],
  riskAssessment: "low",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { baseline, candidate, testCases, providerConfig } = body as {
    baseline?: string;
    candidate?: string;
    testCases?: unknown[];
    providerConfig?: AIProviderConfig;
  };

  if (!providerConfig?.apiKey) {
    return NextResponse.json(DEMO_RESPONSE, { status: 200 });
  }

  try {
    const userPrompt = buildUserPrompt(
      baseline || "v1",
      candidate || "v2",
      testCases || []
    );
    const text = await callAI(
      providerConfig,
      SYSTEM_PROMPT,
      [{ role: "user", content: userPrompt }],
      1024
    );

    const parsed = JSON.parse(text);

    // Validate and fill missing fields to prevent UI crashes
    const safeResponse = {
      summary: typeof parsed.summary === "string" ? parsed.summary : DEMO_RESPONSE.summary,
      regressionPatterns: Array.isArray(parsed.regressionPatterns) ? parsed.regressionPatterns : [],
      suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [],
      riskAssessment:
        parsed.riskAssessment === "low" || parsed.riskAssessment === "medium" || parsed.riskAssessment === "high"
          ? parsed.riskAssessment
          : "medium",
    };

    return NextResponse.json(safeResponse, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI 分析生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
