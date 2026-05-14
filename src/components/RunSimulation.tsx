"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { TestCase, TestResult, AgentEndpoint, EvaluatorConfig } from "@/lib/types";
import { useSettings } from "@/lib/settings-context";
import { isAsyncEvaluator } from "@/lib/evaluator";

interface RunSimulationProps {
  cases: TestCase[];
  onComplete: (results: TestResult[]) => void;
  onCancel: () => void;
}

type RunMode = "simulation" | "real";

export default function RunSimulation({
  cases,
  onComplete,
  onCancel,
}: RunSimulationProps) {
  const { settings } = useSettings();
  const [results, setResults] = useState<TestResult[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [runningIdx, setRunningIdx] = useState(-1);
  const abortRef = useRef(false);
  const runningRef = useRef(false);
  const accRef = useRef<TestResult[]>([]);

  const hasAgentEndpoint = !!(settings.agentEndpoint?.url);
  const mode: RunMode = hasAgentEndpoint ? "real" : "simulation";

  const executeRealCase = useCallback(
    async (
      tc: TestCase,
      endpoint: AgentEndpoint,
      defaultEvaluator: EvaluatorConfig | undefined,
      timeoutMs: number
    ): Promise<TestResult> => {
      const evalConfig = tc.evaluator || defaultEvaluator;
      const body: Record<string, unknown> = {
        testCase: tc,
        endpoint,
        defaultEvaluator,
        timeoutMs,
      };

      if (evalConfig && isAsyncEvaluator(evalConfig.type)) {
        const providerConfig = settings.apiKey && settings.model
          ? { provider: settings.provider, apiKey: settings.apiKey, model: settings.model, baseUrl: settings.baseUrl }
          : null;
        if (providerConfig) {
          body.judgeProvider = providerConfig;
        }
      }

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return data.result;
    },
    [settings]
  );

  const simulateResult = useCallback((tc: TestCase, index: number): TestResult => {
    const seed = hashCode(tc.id + index);
    const score = 0.4 + (Math.abs(seed) % 600) / 1000;
    const passed = score >= 0.6;

    return {
      testCaseId: tc.id,
      actualOutput: passed
        ? `[Simulated] Acceptable response for: ${tc.name}`
        : `[Simulated] Response missing required elements for: ${tc.name}`,
      passed,
      score: Math.min(score, 0.99),
      latencyMs: 600 + (Math.abs(seed) % 1800),
      tokenCost: 0.001 + (Math.abs(seed) % 50) / 10000,
      error: passed ? undefined : `Score ${score.toFixed(2)} below threshold 0.60`,
    };
  }, []);

  const startRun = useCallback(async () => {
    // BUG #1 fix: re-entry guard
    if (runningRef.current) return;
    runningRef.current = true;

    abortRef.current = false;
    accRef.current = [];
    setResults([]);
    setRunningIdx(0);
    setPhase("running");

    try {
      if (mode === "real") {
        for (let i = 0; i < cases.length; i++) {
          if (abortRef.current) break;

          setRunningIdx(i);
          try {
            const result = await executeRealCase(
              cases[i],
              settings.agentEndpoint!,
              settings.defaultEvaluator,
              settings.runTimeoutMs || 30000
            );
            if (abortRef.current) break;
            accRef.current = [...accRef.current, result];
            setResults([...accRef.current]);
          } catch (e) {
            if (abortRef.current) break;
            const result: TestResult = {
              testCaseId: cases[i].id,
              actualOutput: "",
              passed: false,
              score: 0,
              latencyMs: 0,
              tokenCost: 0,
              error: e instanceof Error ? e.message : "Execution failed",
            };
            accRef.current = [...accRef.current, result];
            setResults([...accRef.current]);
          }
          setRunningIdx(i + 1);
        }
      } else {
        for (let i = 0; i < cases.length; i++) {
          if (abortRef.current) break;

          setRunningIdx(i);
          await sleep(500 + Math.random() * 400);
          if (abortRef.current) break;

          const result = simulateResult(cases[i], i);
          accRef.current = [...accRef.current, result];
          setResults([...accRef.current]);
          setRunningIdx(i + 1);
        }
      }

      // BUG #2 fix: check abort AFTER the loop completes
      if (!abortRef.current) {
        const final = accRef.current;
        setResults(final);
        setPhase("done");
        onComplete(final);
      }
    } finally {
      runningRef.current = false;
    }
  }, [cases, onComplete, mode, settings, executeRealCase, simulateResult]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    onCancel();
  }, [onCancel]);

  // BUG #3 fix: cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  if (phase === "idle") {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Ready to Run</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {cases.length} test cases will be executed {mode === "real" ? "against your agent endpoint" : "sequentially (simulation)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startRun}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start Run
            </button>
          </div>
        </div>
        {mode === "simulation" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--yellow-bg)] text-[var(--yellow)] text-xs mb-3">
            <AlertTriangle size={12} />
            <span>Simulation mode — configure an Agent Endpoint in Settings for real testing</span>
          </div>
        )}
        {mode === "real" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--green-bg)] text-[var(--green)] text-xs mb-3">
            <CheckCircle2 size={12} />
            <span>Real mode — calling {settings.agentEndpoint?.type} at {maskUrl(settings.agentEndpoint?.url || "")}</span>
          </div>
        )}
        <div className="space-y-1">
          {cases.map((tc) => (
            <div
              key={tc.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-light)]" />
              {tc.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: failed === 0 ? "var(--green-bg)" : "var(--yellow-bg)",
            }}
          >
            <CheckCircle2
              size={20}
              style={{ color: failed === 0 ? "var(--green)" : "var(--yellow)" }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              Run Complete {mode === "simulation" && "(Simulated)"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {passed} passed, {failed} failed &middot;{" "}
              {results.reduce((s, r) => s + r.latencyMs, 0)}ms total
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Running phase
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-[var(--accent-light)] animate-spin" />
          <span className="text-sm font-semibold">
            {mode === "real" ? "Testing" : "Simulating"} {Math.min(runningIdx + 1, cases.length)} of {cases.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: "var(--green)" }}>
            <CheckCircle2 size={10} className="inline mr-0.5" />
            {passed}
          </span>
          <span style={{ color: "var(--red)" }}>
            <XCircle size={10} className="inline mr-0.5" />
            {failed}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${(results.length / cases.length) * 100}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {cases.map((tc, i) => {
          const result = results[i];
          const isRunning = i === runningIdx && !result;
          const isPending = i >= runningIdx && !result;

          return (
            <div
              key={tc.id}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all"
              style={{
                backgroundColor: result
                  ? result.passed
                    ? "var(--green-bg)"
                    : "var(--red-bg)"
                  : isRunning
                    ? "var(--accent-bg)"
                    : "transparent",
                opacity: isPending ? 0.4 : 1,
              }}
            >
              {result ? (
                result.passed ? (
                  <CheckCircle2 size={12} style={{ color: "var(--green)" }} />
                ) : (
                  <XCircle size={12} style={{ color: "var(--red)" }} />
                )
              ) : isRunning ? (
                <Loader2
                  size={12}
                  className="animate-spin"
                  style={{ color: "var(--accent-light)" }}
                />
              ) : (
                <span className="w-3 h-3 rounded-full border border-[var(--border-light)]" />
              )}
              <span className={isPending ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                {tc.name}
              </span>
              {result && (
                <span className="ml-auto flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="font-mono">{result.score.toFixed(2)}</span>
                  <span className="flex items-center gap-0.5">
                    <Clock size={8} />
                    {result.latencyMs}ms
                  </span>
                  <span className="flex items-center gap-0.5">
                    <DollarSign size={8} />${result.tokenCost.toFixed(4)}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return url.slice(0, 30) + (url.length > 30 ? "..." : "");
  }
}
