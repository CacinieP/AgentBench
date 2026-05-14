import { NextRequest, NextResponse } from "next/server";
import { callAI, AIProviderConfig } from "@/lib/ai-provider";

const SYSTEM_PROMPT = `You are an AI agent quality analyst. Analyze the provided test run data and respond with valid JSON only.
Your response must be a JSON object with exactly these fields:
- summary: A 2-3 sentence analysis string
- regressionPatterns: Array of 2-3 identified pattern strings
- suggestedFixes: Array of 2-3 actionable fix strings
- riskAssessment: One of "low", "medium", or "high"`;

function buildUserPrompt(baseline: string, candidate: string, testCases: unknown[]): string {
  return `Analyze this test run comparison.

Baseline version: ${baseline}
Candidate version: ${candidate}
Test cases: ${JSON.stringify(testCases, null, 2)}

Respond with valid JSON only.`;
}

const DEMO_RESPONSE = {
  summary:
    "Comparison between baseline and candidate: the candidate version shows improvement in response quality and empathy. Key areas of change include more detailed resolution options and better escalation paths.",
  regressionPatterns: [
    "Baseline responses were uniformly brief, suggesting insufficient system prompt guidance",
    "Missing process explanations correlate with lower scores across all baseline runs",
  ],
  suggestedFixes: [
    "Enhance system prompt with empathy guidelines and required response elements",
    "Add completeness checklist to ensure all resolution components are present",
    "Consider model upgrade as primary quality driver and validate with A/B testing",
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
    const message = e instanceof Error ? e.message : "Failed to generate AI analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
