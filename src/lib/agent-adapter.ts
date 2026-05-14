import { AgentEndpoint } from "./types";

export interface AgentCallResult {
  output: string;
  latencyMs: number;
  tokenCost: number;
  inputTokens?: number;
  outputTokens?: number;
}

export async function callAgent(
  endpoint: AgentEndpoint,
  input: string,
  timeoutMs: number
): Promise<AgentCallResult> {
  const start = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let output: string;
    let inputTokens = 0;
    let outputTokens = 0;

    switch (endpoint.type) {
      case "openai_chat":
        ({ output, inputTokens, outputTokens } = await callOpenAIChat(endpoint, input, controller.signal));
        break;
      case "anthropic_messages":
        ({ output, inputTokens, outputTokens } = await callAnthropicMessages(endpoint, input, controller.signal));
        break;
      case "custom_http":
        output = await callCustomHTTP(endpoint, input, controller.signal);
        break;
      default:
        throw new Error(`Unknown endpoint type: ${endpoint.type}`);
    }

    const latencyMs = Math.round(performance.now() - start);
    const tokenCost = estimateCost(endpoint.type, inputTokens, outputTokens);

    return { output, latencyMs, tokenCost, inputTokens, outputTokens };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAIChat(
  endpoint: AgentEndpoint,
  input: string,
  signal: AbortSignal
): Promise<{ output: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      ...endpoint.headers,
    },
    body: JSON.stringify({
      model: endpoint.model || "gpt-4o",
      messages: [{ role: "user", content: input }],
      max_tokens: 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agent API error (${res.status}): ${err}`);
  }

  const data = await res.json();

  const output = extractByPath(data, endpoint.responsePath || "choices.0.message.content");
  if (!output) throw new Error("Empty response from agent endpoint");

  return {
    output,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

async function callAnthropicMessages(
  endpoint: AgentEndpoint,
  input: string,
  signal: AbortSignal
): Promise<{ output: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(endpoint.apiKey ? { "x-api-key": endpoint.apiKey } : {}),
      "anthropic-version": "2023-06-01",
      ...endpoint.headers,
    },
    body: JSON.stringify({
      model: endpoint.model || "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: input }],
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agent API error (${res.status}): ${err}`);
  }

  const data = await res.json();

  const output = extractByPath(data, endpoint.responsePath || "content.0.text");
  if (!output) throw new Error("Empty response from agent endpoint");

  return {
    output,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

async function callCustomHTTP(
  endpoint: AgentEndpoint,
  input: string,
  signal: AbortSignal
): Promise<string> {
  const body = endpoint.responsePath
    ? { input, prompt: input }
    : {
        model: endpoint.model || "default",
        messages: [{ role: "user", content: input }],
        max_tokens: 2048,
      };

  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      ...endpoint.headers,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agent API error (${res.status}): ${err}`);
  }

  const data = await res.json();

  if (endpoint.responsePath) {
    const output = extractByPath(data, endpoint.responsePath);
    if (!output) throw new Error(`Path "${endpoint.responsePath}" not found in response`);
    return String(output);
  }

  // Try common patterns
  return (
    data.output ||
    data.response ||
    data.text ||
    data.content ||
    data.choices?.[0]?.message?.content ||
    data.content?.[0]?.text ||
    data.result ||
    JSON.stringify(data)
  );
}

function extractByPath(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current != null ? String(current) : null;
}

function estimateCost(
  type: AgentEndpoint["type"],
  inputTokens: number,
  outputTokens: number
): number {
  if (inputTokens === 0 && outputTokens === 0) return 0.002;
  const rates: Record<string, { input: number; output: number }> = {
    openai_chat: { input: 2.5e-6, output: 1e-5 },
    anthropic_messages: { input: 3e-6, output: 1.5e-5 },
    custom_http: { input: 2.5e-6, output: 1e-5 },
  };
  const rate = rates[type] || rates.custom_http;
  return Math.round((inputTokens * rate.input + outputTokens * rate.output) * 10000) / 10000;
}
