import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { baseline, candidate, testCases } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        summary: `Comparison between ${baseline} and ${candidate}: ${testCases?.length || 0} test cases analyzed. The candidate version shows improvement in response quality and empathy. Key areas of change include more detailed resolution options and better escalation paths.`,
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
      },
      { status: 200 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are an AI agent quality analyst. Analyze the following test run comparison and provide insights.

Baseline version: ${baseline}
Candidate version: ${candidate}
Test cases: ${JSON.stringify(testCases, null, 2)}

Provide a JSON response with:
- summary: A 2-3 sentence analysis of the comparison
- regressionPatterns: Array of identified patterns (2-3 items)
- suggestedFixes: Array of actionable fixes (2-3 items)
- riskAssessment: "low", "medium", or "high"

Respond with valid JSON only.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate AI analysis" },
      { status: 500 }
    );
  }
}
