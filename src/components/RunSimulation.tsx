"use client";

import { useState, useRef, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  DollarSign,
} from "lucide-react";
import { TestCase, TestResult } from "@/lib/types";

interface RunSimulationProps {
  cases: TestCase[];
  onComplete: (results: TestResult[]) => void;
  onCancel: () => void;
}

function simulateResult(tc: TestCase, index: number): TestResult {
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
}

export default function RunSimulation({
  cases,
  onComplete,
  onCancel,
}: RunSimulationProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [runningIdx, setRunningIdx] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef = useRef(0);
  const accRef = useRef<TestResult[]>([]);

  const startRun = useCallback(() => {
    idxRef.current = 0;
    accRef.current = [];
    setResults([]);
    setRunningIdx(0);
    setPhase("running");

    intervalRef.current = setInterval(() => {
      const i = idxRef.current;
      if (i >= cases.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const final = accRef.current;
        setResults(final);
        setPhase("done");
        onComplete(final);
        return;
      }

      const result = simulateResult(cases[i], i);
      accRef.current = [...accRef.current, result];
      idxRef.current = i + 1;
      setResults([...accRef.current]);
      setRunningIdx(i + 1);
    }, 500 + Math.random() * 400);
  }, [cases, onComplete]);

  const handleCancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onCancel();
  }, [onCancel]);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  if (phase === "idle") {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Ready to Run</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {cases.length} test cases will be executed sequentially
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
            <h3 className="text-sm font-semibold">Run Complete</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {passed} passed, {failed} failed &middot;{" "}
              {results.reduce((s, r) => s + r.latencyMs, 0)}ms total
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-[var(--accent-light)] animate-spin" />
          <span className="text-sm font-semibold">
            Running test {Math.min(runningIdx + 1, cases.length)} of {cases.length}
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
