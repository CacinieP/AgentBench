"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  XCircle,
  Clock,
  DollarSign,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState, useCallback } from "react";
import StatusBadge from "@/components/StatusBadge";
import ScoreRing from "@/components/ScoreRing";
import { useData } from "@/lib/data-context";
import { demoAIAnalysis } from "@/lib/demo-data";
import { scoreColor, formatRelativeTime } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { AIAnalysis } from "@/lib/types";

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConfigured, toProviderConfig } = useSettings();
  const { suites, runs } = useData();
  const runId = params.id as string;
  const run = runs.find((r) => r.id === runId);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const fetchAnalysis = useCallback(async () => {
    if (!run) return;

    if (!isConfigured) {
      setAiAnalysis(demoAIAnalysis);
      setShowAI(true);
      return;
    }

    const config = toProviderConfig();
    if (!config) return;

    setAiLoading(true);
    setAiError("");
    setShowAI(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerConfig: config,
          baseline: "previous",
          candidate: run.agentVersion,
          testCases: run.results.map((r) => ({
            id: r.testCaseId,
            score: r.score,
            passed: r.passed,
            error: r.error,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAiAnalysis(data);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Analysis failed");
      setAiAnalysis(demoAIAnalysis);
    } finally {
      setAiLoading(false);
    }
  }, [isConfigured, toProviderConfig, run]);

  if (!run) {
    return (
      <div className="p-8 max-w-[1000px] mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[var(--text-muted)] mb-4">Run not found</p>
          <Link
            href="/"
            className="text-[var(--accent-light)] text-sm hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const suite = suites.find((s) => s.id === run.suiteId);
  const passRate = (run.summary.passed / run.summary.total) * 100;
  const analysis = aiAnalysis || demoAIAnalysis;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/")}
          className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <ArrowLeft size={14} className="text-[var(--text-muted)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{run.suiteName}</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent-light)]">
              {run.agentVersion}
            </span>
            {!run.agentVersion.startsWith("sim-") ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)]">
                LIVE
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--yellow-bg)] text-[var(--yellow)]">
                SIMULATED
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {formatRelativeTime(run.timestamp)} &middot; {run.modelVersion}
          </p>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={aiLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: showAI ? "var(--accent)" : "var(--accent-bg)",
            color: showAI ? "white" : "var(--accent-light)",
          }}
        >
          {aiLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {aiLoading ? "Analyzing..." : "AI Analysis"}
        </button>
      </div>

      {/* Score ring + summary cards */}
      <div className="flex gap-4 mb-6">
        <div className="glass-card p-5 flex items-center gap-5">
          <ScoreRing
            score={run.summary.avgScore}
            size={80}
            strokeWidth={6}
          />
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">
              Overall Score
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: scoreColor(run.summary.avgScore) }}
            >
              {run.summary.avgScore.toFixed(2)}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {run.summary.passed} of {run.summary.total} passed
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 flex-1">
          {[
            {
              label: "Pass Rate",
              value: `${passRate.toFixed(0)}%`,
              color:
                passRate >= 80
                  ? "var(--green)"
                  : passRate >= 50
                    ? "var(--yellow)"
                    : "var(--red)",
              icon: <Shield size={14} />,
            },
            {
              label: "Failed",
              value: `${run.summary.failed}`,
              color:
                run.summary.failed === 0 ? "var(--green)" : "var(--red)",
              icon: <XCircle size={14} />,
            },
            {
              label: "Latency",
              value: `${(run.summary.totalLatencyMs / 1000).toFixed(1)}s`,
              color: "var(--text-secondary)",
              icon: <Clock size={14} />,
            },
            {
              label: "Cost",
              value: `$${run.summary.totalTokenCost.toFixed(4)}`,
              color: "var(--text-secondary)",
              icon: <DollarSign size={14} />,
            },
          ].map((m) => (
            <div key={m.label} className="glass-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span style={{ color: m.color }}>{m.icon}</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  {m.label}
                </span>
              </div>
              <span className="text-base font-bold" style={{ color: m.color }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis */}
      {showAI && (
        <div className="glass-card p-5 mb-6 fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[var(--accent-light)]" />
            <span className="text-sm font-semibold">AI Analysis</span>
            {isConfigured ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)]">
                LIVE
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--yellow-bg)] text-[var(--yellow)]">
                DEMO
              </span>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" />
              Analyzing with AI...
            </div>
          ) : (
            <>
              {aiError && (
                <p className="text-xs text-[var(--red)] bg-[var(--red-bg)] p-2 rounded-lg mb-4">
                  {aiError} — showing demo analysis
                </p>
              )}
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {analysis.summary}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Patterns
                  </h4>
                  <ul className="space-y-1.5">
                    {analysis.regressionPatterns.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"
                      >
                        <AlertTriangle
                          size={10}
                          className="mt-0.5 shrink-0"
                          style={{ color: "var(--yellow)" }}
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Fixes
                  </h4>
                  <ul className="space-y-1.5">
                    {analysis.suggestedFixes.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"
                      >
                        <span
                          className="mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] shrink-0"
                          style={{
                            backgroundColor: "var(--green-bg)",
                            color: "var(--green)",
                          }}
                        >
                          {i + 1}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Test results */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">Test Results</h3>
        {run.results.map((result) => {
          const tc = suite?.cases.find((c) => c.id === result.testCaseId);
          const isExpanded = expandedCase === result.testCaseId;

          return (
            <div
              key={result.testCaseId}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedCase(isExpanded ? null : result.testCaseId)
                }
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown
                      size={14}
                      className="text-[var(--text-muted)]"
                    />
                  ) : (
                    <ChevronRight
                      size={14}
                      className="text-[var(--text-muted)]"
                    />
                  )}
                  <StatusBadge
                    status={result.passed ? "pass" : "fail"}
                    size="sm"
                  />
                  <span className="text-sm font-medium">
                    {tc?.name || result.testCaseId}
                  </span>
                  {tc && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      {tc.category}
                    </span>
                  )}
                  {result.evaluatorType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent-light)]">
                      {result.evaluatorType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="progress-bar w-12">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${result.score * 100}%`,
                        backgroundColor: scoreColor(result.score),
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-7 text-right"
                    style={{ color: scoreColor(result.score) }}
                  >
                    {result.score.toFixed(2)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] w-12 text-right">
                    {result.latencyMs}ms
                  </span>
                  <span className="text-xs text-[var(--text-muted)] w-14 text-right">
                    ${result.tokenCost.toFixed(4)}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border)] px-4 py-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Input
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {tc?.input || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Expected
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {tc?.expectedOutput || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Actual Output
                    </p>
                    <p
                      className="text-xs p-3 rounded-lg leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto"
                      style={{
                        backgroundColor: result.passed
                          ? "var(--green-bg)"
                          : "var(--red-bg)",
                        color: result.passed
                          ? "var(--green)"
                          : "var(--red)",
                      }}
                    >
                      {result.actualOutput || "(No output — agent call failed)"}
                    </p>
                  </div>
                  {result.error && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Failure Analysis
                      </p>
                      <p className="text-xs text-[var(--red)] bg-[var(--red-bg)] p-3 rounded-lg leading-relaxed">
                        {result.error}
                      </p>
                    </div>
                  )}
                  {result.judgeRationale && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        Evaluator Rationale
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-3 rounded-lg leading-relaxed">
                        {result.judgeRationale}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-6 pt-2 flex-wrap">
                    <div className="text-xs">
                      <span className="text-[var(--text-muted)]">Score:</span>{" "}
                      <span
                        className="font-mono"
                        style={{ color: scoreColor(result.score) }}
                      >
                        {result.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-[var(--text-muted)]">Latency:</span>{" "}
                      <span className="font-mono text-[var(--text-secondary)]">
                        {result.latencyMs}ms
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-[var(--text-muted)]">Cost:</span>{" "}
                      <span className="font-mono text-[var(--text-secondary)]">
                        ${result.tokenCost.toFixed(4)}
                      </span>
                    </div>
                    {result.evaluatorType && (
                      <div className="text-xs">
                        <span className="text-[var(--text-muted)]">Evaluator:</span>{" "}
                        <span className="font-mono text-[var(--accent-light)]">
                          {result.evaluatorType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
