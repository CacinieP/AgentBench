"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Cpu,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  RotateCcw,
  Trash2,
  Shield,
} from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { useData } from "@/lib/data-context";
import { PROVIDER_DEFAULTS, ProviderType } from "@/lib/ai-provider";

const PROVIDERS: {
  value: ProviderType;
  label: string;
  desc: string;
  models: string[];
}[] = [
  {
    value: "anthropic",
    label: "Anthropic",
    desc: "Claude (Sonnet, Opus, Haiku)",
    models: [
      "claude-sonnet-4-6",
      "claude-opus-4-7",
      "claude-haiku-4-5-20251001",
    ],
  },
  {
    value: "openai",
    label: "OpenAI",
    desc: "GPT-4o, GPT-4.1, o-series",
    models: [
      "gpt-4o",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o4-mini",
    ],
  },
  {
    value: "custom",
    label: "Custom / Compatible",
    desc: "DeepSeek, Mistral, Groq, Together, any OpenAI-compatible API",
    models: [],
  },
];

export default function SettingsPage() {
  const { settings, updateSettings, isConfigured, toProviderConfig } =
    useSettings();
  const { suites, runs, clearAllData, resetToSeed } = useData();
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState("");

  const currentProvider = PROVIDERS.find((p) => p.value === settings.provider);

  const handleProviderChange = (provider: ProviderType) => {
    const defaults = PROVIDER_DEFAULTS[provider];
    updateSettings({
      provider,
      model: defaults.model,
      baseUrl: defaults.baseUrl,
    });
  };

  const handleTest = async () => {
    const config = toProviderConfig();
    if (!config) return;

    setTestStatus("testing");
    setTestError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerConfig: config,
          baseline: "v1",
          candidate: "v2",
          testCases: [{ id: "test", score: 0.5 }],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.summary) {
        setTestStatus("success");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      setTestStatus("error");
      setTestError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div className="p-8 max-w-[700px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure your AI provider for analysis features
        </p>
      </div>

      {/* Status indicator */}
      <div className="glass-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isConfigured
                ? "var(--green-bg)"
                : "var(--yellow-bg)",
            }}
          >
            {isConfigured ? (
              <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
            ) : (
              <SettingsIcon size={16} style={{ color: "var(--yellow)" }} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isConfigured ? "AI Provider Configured" : "No API Key Set"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {isConfigured
                ? `${currentProvider?.label} · ${settings.model}`
                : "Using demo analysis fallback"}
            </p>
          </div>
        </div>
        {isConfigured && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] font-medium">
            LIVE
          </span>
        )}
      </div>

      {/* Provider selector */}
      <div className="glass-card p-5 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 block">
          AI Provider
        </label>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleProviderChange(p.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                settings.provider === p.value
                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] hover:border-[var(--border-light)]"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  settings.provider === p.value
                    ? "text-[var(--accent-light)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {p.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="glass-card p-5 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder={
              settings.provider === "anthropic"
                ? "sk-ant-api03-..."
                : settings.provider === "openai"
                  ? "sk-..."
                  : "Enter your API key"
            }
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          Key is stored in browser localStorage only — never sent to our servers
        </p>
      </div>

      {/* Model */}
      <div className="glass-card p-5 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Cpu size={10} />
          Model
        </label>
        {currentProvider && currentProvider.models.length > 0 ? (
          <div className="space-y-1.5">
            {currentProvider.models.map((m) => (
              <button
                key={m}
                onClick={() => updateSettings({ model: m })}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                  settings.model === m
                    ? "bg-[var(--accent-bg)] text-[var(--accent-light)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value })}
            placeholder="e.g. deepseek-chat, mistral-large-latest"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        )}
      </div>

      {/* Base URL (for custom) */}
      {settings.provider === "custom" && (
        <div className="glass-card p-5 mb-4">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe size={10} />
            Base URL
          </label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => updateSettings({ baseUrl: e.target.value })}
            placeholder="https://api.example.com"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-[var(--text-muted)]">Quick presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "DeepSeek", url: "https://api.deepseek.com" },
                { label: "Mistral", url: "https://api.mistral.ai" },
                { label: "Groq", url: "https://api.groq.com/openai" },
                { label: "Together", url: "https://api.together.xyz/v1" },
                { label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
                { label: "SiliconFlow", url: "https://api.siliconflow.cn/v1" },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => updateSettings({ baseUrl: p.url })}
                  className="text-[10px] px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Connection */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400" />
              Test Connection
            </label>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Send a small test request to verify your configuration
            </p>
          </div>
          <button
            onClick={handleTest}
            disabled={!isConfigured || testStatus === "testing"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{
              backgroundColor:
                testStatus === "success"
                  ? "var(--green-bg)"
                  : testStatus === "error"
                    ? "var(--red-bg)"
                    : "var(--accent-bg)",
              color:
                testStatus === "success"
                  ? "var(--green)"
                  : testStatus === "error"
                    ? "var(--red)"
                    : "var(--accent-light)",
            }}
          >
            {testStatus === "testing" ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Testing...
              </>
            ) : testStatus === "success" ? (
              <>
                <CheckCircle2 size={12} />
                Connected!
              </>
            ) : testStatus === "error" ? (
              <>
                <XCircle size={12} />
                Failed
              </>
            ) : (
              "Test"
            )}
          </button>
        </div>
        {testError && (
          <p className="text-xs text-[var(--red)] mt-2 bg-[var(--red-bg)] p-2 rounded-lg">
            {testError}
          </p>
        )}
        {testStatus === "success" && (
          <p className="text-xs text-[var(--green)] mt-2 bg-[var(--green-bg)] p-2 rounded-lg">
            Successfully connected to {currentProvider?.label} ({settings.model})
          </p>
        )}
      </div>

      {/* Agent Endpoint Configuration */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-[var(--accent-light)]" />
          <span className="text-sm font-semibold">Agent Endpoint</span>
          {settings.agentEndpoint?.url ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)]">
              CONFIGURED
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--yellow-bg)] text-[var(--yellow)]">
              SIMULATION MODE
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure the AI agent endpoint to test against. Without this, runs use simulated results.
        </p>

        {/* Endpoint type selector */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([
            { value: "openai_chat", label: "OpenAI Chat", desc: "/v1/chat/completions" },
            { value: "anthropic_messages", label: "Anthropic", desc: "/v1/messages" },
            { value: "custom_http", label: "Custom HTTP", desc: "Any POST endpoint" },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() =>
                updateSettings({
                  agentEndpoint: {
                    ...settings.agentEndpoint,
                    type: t.value,
                    url: settings.agentEndpoint?.url || "",
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                settings.agentEndpoint?.type === t.value
                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] hover:border-[var(--border-light)]"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  settings.agentEndpoint?.type === t.value
                    ? "text-[var(--accent-light)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {t.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Endpoint URL */}
        <div className="mb-3">
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Endpoint URL
          </label>
          <input
            type="text"
            value={settings.agentEndpoint?.url || ""}
            onChange={(e) =>
              updateSettings({
                agentEndpoint: {
                  type: settings.agentEndpoint?.type || "openai_chat",
                  url: e.target.value,
                  apiKey: settings.agentEndpoint?.apiKey,
                  model: settings.agentEndpoint?.model,
                },
              })
            }
            placeholder={
              settings.agentEndpoint?.type === "anthropic_messages"
                ? "https://api.anthropic.com/v1/messages"
                : settings.agentEndpoint?.type === "openai_chat"
                  ? "https://api.openai.com/v1/chat/completions"
                  : "https://your-agent.example.com/chat"
            }
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Agent API Key */}
        <div className="mb-3">
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Agent API Key (optional)
          </label>
          <input
            type="password"
            value={settings.agentEndpoint?.apiKey || ""}
            onChange={(e) =>
              updateSettings({
                agentEndpoint: {
                  ...settings.agentEndpoint,
                  type: settings.agentEndpoint?.type || "openai_chat",
                  url: settings.agentEndpoint?.url || "",
                  apiKey: e.target.value,
                  model: settings.agentEndpoint?.model,
                },
              })
            }
            placeholder="Leave empty if endpoint doesn't require auth"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Model */}
        <div className="mb-3">
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Model (optional)
          </label>
          <input
            type="text"
            value={settings.agentEndpoint?.model || ""}
            onChange={(e) =>
              updateSettings({
                agentEndpoint: {
                  ...settings.agentEndpoint,
                  type: settings.agentEndpoint?.type || "openai_chat",
                  url: settings.agentEndpoint?.url || "",
                  apiKey: settings.agentEndpoint?.apiKey,
                  model: e.target.value,
                },
              })
            }
            placeholder="e.g. gpt-4o, claude-sonnet-4-6, my-custom-model"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Evaluator Configuration */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-[var(--accent-light)]" />
          <span className="text-sm font-semibold">Default Evaluator</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          How agent responses are scored against expected output. Can be overridden per test case.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([
            { value: "contains", label: "Contains", desc: "Checks key phrases" },
            { value: "exact_match", label: "Exact Match", desc: "Requires full match" },
            { value: "regex", label: "Regex", desc: "Pattern matching" },
          ] as const).map((e) => (
            <button
              key={e.value}
              onClick={() =>
                updateSettings({
                  defaultEvaluator: {
                    ...settings.defaultEvaluator,
                    type: e.value,
                  },
                })
              }
              className={`p-2.5 rounded-lg border text-left transition-all ${
                (settings.defaultEvaluator?.type || "contains") === e.value
                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] hover:border-[var(--border-light)]"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  (settings.defaultEvaluator?.type || "contains") === e.value
                    ? "text-[var(--accent-light)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {e.label}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{e.desc}</p>
            </button>
          ))}
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            Pass Threshold: {(settings.defaultEvaluator?.threshold ?? 0.6).toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={settings.defaultEvaluator?.threshold ?? 0.6}
            onChange={(e) =>
              updateSettings({
                defaultEvaluator: {
                  ...settings.defaultEvaluator,
                  type: settings.defaultEvaluator?.type || "contains",
                  threshold: parseFloat(e.target.value),
                },
              })
            }
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>Lenient (0.1)</span>
            <span>Strict (1.0)</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card p-5 mb-4">
        <label className="text-sm font-medium mb-1 block">Data Management</label>
        <p className="text-[10px] text-[var(--text-muted)] mb-3">
          {suites.length} suite{suites.length !== 1 ? "s" : ""}, {runs.length} run{runs.length !== 1 ? "s" : ""} stored locally
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToSeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent-light)] hover:opacity-80 transition-colors"
          >
            <RotateCcw size={12} />
            Reset to Sample Data
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete all suites and runs? This cannot be undone.")) {
                clearAllData();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--red-bg)] text-[var(--red)] hover:opacity-80 transition-colors"
          >
            <Trash2 size={12} />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
