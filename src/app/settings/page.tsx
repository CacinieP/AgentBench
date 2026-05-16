"use client";

import { useState, useRef } from "react";
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
  Download,
  Upload,
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
  const { suites, runs, clearAllData, resetToSeed, importData } = useData();
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = { suites, runs, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentbench-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const isJsonl = file.name.endsWith(".jsonl");

        if (isJsonl) {
          const lines = text.trim().split("\n").filter(Boolean);
          const cases = lines.map((line, i) => {
            const obj = JSON.parse(line);
            return {
              id: `tc-${Date.now()}-${i}`,
              name: obj.name || `Case ${i + 1}`,
              input: obj.input || "",
              expectedOutput: obj.expectedOutput || obj.expected_output || obj.expected || "",
              category: obj.category || "imported",
            };
          });
          const suite = {
            id: `suite-${Date.now()}`,
            name: file.name.replace(/\.jsonl$/i, ""),
            description: `Imported from ${file.name}`,
            agentType: "custom",
            cases,
          };
          importData({ suites: [suite] });
        } else {
          const data = JSON.parse(text);
          importData({
            suites: data.suites || [],
            runs: data.runs || [],
          });
        }
      } catch {
        alert("无法解析文件。请提供有效的 JSON 或 JSONL。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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
        <h1 className="text-2xl font-bold mb-1">设置</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          配置 AI 提供商以启用分析功能
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
              {isConfigured ? "AI 提供商已配置" : "未设置 API Key"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {isConfigured
                ? `${currentProvider?.label} · ${settings.model}`
                : "使用演示分析作为后备"}
            </p>
          </div>
        </div>
        {isConfigured && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] font-medium">
            真实
          </span>
        )}
      </div>

      {/* Provider selector */}
      <div className="glass-card p-5 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 block">
          AI 提供商
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
                  : "输入 API Key"
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
          Key 存储在 localStorage 中。当你触发测试或 AI 分析时，Key 会发送到本应用的服务器路由，由其转发到配置的提供商。如需完全本地控制，可自行部署该应用。
        </p>
      </div>

      {/* Model */}
      <div className="glass-card p-5 mb-4">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Cpu size={10} />
          模型
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
            <p className="text-[10px] text-[var(--text-muted)]">快速预设：</p>
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
              测试连接
            </label>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              发送小请求以验证配置是否正确
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
                测试中...
              </>
            ) : testStatus === "success" ? (
              <>
                <CheckCircle2 size={12} />
                已连接！
              </>
            ) : testStatus === "error" ? (
              <>
                <XCircle size={12} />
                失败
              </>
            ) : (
              "测试"
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
            成功连接到 {currentProvider?.label} ({settings.model})
          </p>
        )}
      </div>

      {/* Agent Endpoint Configuration */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-[var(--accent-light)]" />
          <span className="text-sm font-semibold">Agent 端点</span>
          {settings.agentEndpoint?.url ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)]">
              已配置
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--yellow-bg)] text-[var(--yellow)]">
              模拟模式
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          配置要测试的 AI Agent 端点。未设置时将使用模拟结果运行。
        </p>

        {/* Endpoint type selector */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([
            { value: "openai_chat", label: "OpenAI Chat", desc: "/v1/chat/completions" },
            { value: "anthropic_messages", label: "Anthropic", desc: "/v1/messages" },
            { value: "custom_http", label: "自定义 HTTP", desc: "任意 POST 端点" },
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
                  ...settings.agentEndpoint,
                  type: settings.agentEndpoint?.type || "openai_chat",
                  url: e.target.value,
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
            Agent API Key（可选）
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
                },
              })
            }
            placeholder="如果端点不需要认证，请留空"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
            存储在 localStorage 中。仅在你运行测试时发送到本应用的服务端路由，然后转发到你的 Agent 端点。
          </p>
        </div>

        {/* Model */}
        <div className="mb-3">
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
            模型（可选）
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
          <span className="text-sm font-semibold">默认评测器</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          评估 Agent 响应与预期输出匹配度的方式。可针对单个测试用例覆盖设置。
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {([
            { value: "contains", label: "包含", desc: "关键短语" },
            { value: "exact_match", label: "精确", desc: "完全匹配" },
            { value: "regex", label: "正则", desc: "模式" },
            { value: "json_schema", label: "JSON Schema", desc: "结构" },
            { value: "llm_judge", label: "LLM 评判", desc: "AI 评分" },
            { value: "code_test", label: "代码测试", desc: "代码质量" },
          ] as const).map((e) => (
            <button
              key={e.value}
              onClick={() =>
                updateSettings({
                  defaultEvaluator: {
                    type: e.value,
                    threshold: settings.defaultEvaluator?.threshold ?? 0.6,
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
            <span>宽松 (0.1)</span>
            <span>严格 (1.0)</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card p-5 mb-4">
        <label className="text-sm font-medium mb-1 block">数据管理</label>
        <p className="text-[10px] text-[var(--text-muted)] mb-3">
          {suites.length} 个套件，{runs.length} 次运行本地存储
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:opacity-80 transition-colors border border-[var(--border)]"
          >
            <Download size={12} />
            导出 JSON
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:opacity-80 transition-colors border border-[var(--border)]"
          >
            <Upload size={12} />
            导入 JSON / JSONL
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.jsonl"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={resetToSeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent-light)] hover:opacity-80 transition-colors"
          >
            <RotateCcw size={12} />
            重置为示例数据
          </button>
          <button
            onClick={() => {
              if (window.confirm("删除所有套件和运行记录？此操作不可撤销。")) {
                clearAllData();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--red-bg)] text-[var(--red)] hover:opacity-80 transition-colors"
          >
            <Trash2 size={12} />
            清除所有数据
          </button>
        </div>
      </div>
    </div>
  );
}
