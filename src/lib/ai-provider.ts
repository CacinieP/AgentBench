export type ProviderType = "anthropic" | "openai" | "zhipu" | "moonshot" | "baichuan" | "minimax" | "google" | "custom";

export interface AIProviderConfig {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export const PROVIDER_DEFAULTS: Record<ProviderType, { model: string; baseUrl: string }> = {
  anthropic: { model: "claude-sonnet-4-6", baseUrl: "https://api.anthropic.com" },
  openai: { model: "gpt-4o", baseUrl: "https://api.openai.com/v1/chat/completions" },
  zhipu: { model: "glm-5.1", baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions" },
  moonshot: { model: "kimi-k2.5", baseUrl: "https://api.moonshot.cn/v1/chat/completions" },
  baichuan: { model: "Baichuan4-Turbo", baseUrl: "https://api.baichuan-ai.com/v1/chat/completions" },
  minimax: { model: "MiniMax-M2.7", baseUrl: "https://api.minimaxi.com/anthropic/messages" },
  google: { model: "gemini-2.5-pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" },
  custom: { model: "", baseUrl: "" },
};

export async function callAI(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens = 1024
): Promise<string> {
  switch (config.provider) {
    case "anthropic":
      return callAnthropic(config, systemPrompt, messages, maxTokens);
    case "minimax":
      return callMiniMax(config, systemPrompt, messages, maxTokens);
    case "openai":
    case "zhipu":
    case "moonshot":
    case "baichuan":
    case "google":
    case "custom":
      return callOpenAICompatible(config, systemPrompt, messages, maxTokens);
  }
}

async function callAnthropic(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number
): Promise<string> {
  const url = `${config.baseUrl}/v1/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Anthropic API");
  return text;
}

async function callMiniMax(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number
): Promise<string> {
  const url = config.baseUrl;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MiniMax API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from MiniMax API");
  return text;
}

async function callOpenAICompatible(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens: number
): Promise<string> {
  const url = config.baseUrl;
  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as string, content: m.content })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: allMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI-compatible API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from API");
  return text;
}
