"use client";

import { useState, useCallback, useMemo } from "react";
import {
  TestTube2,
  Plus,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  DollarSign,
  Shield,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import RunSimulation from "@/components/RunSimulation";
import ScoreRing from "@/components/ScoreRing";
import CreateSuiteModal from "@/components/CreateSuiteModal";
import { useData } from "@/lib/data-context";
import { TestResult, TestRun } from "@/lib/types";

export default function SuitesPage() {
  const { suites, runs, addRun } = useData();
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null);
  const [simulatingSuite, setSimulatingSuite] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [runs]
  );

  const getLatestRunForSuite = useCallback(
    (suiteId: string) =>
      sortedRuns.find((r) => r.suiteId === suiteId),
    [sortedRuns]
  );

  const handleRunTest = (suiteId: string) => {
    setSimulatingSuite(suiteId);
  };

  const handleSimComplete = useCallback(
    (suiteId: string) => (results: TestResult[]) => {
      const suite = suites.find((s) => s.id === suiteId);
      if (!suite) {
        setSimulatingSuite(null);
        return;
      }

      const total = results.length;
      const passed = results.filter((r) => r.passed).length;
      const avgScore = results.reduce((s, r) => s + r.score, 0) / total;

      const run: TestRun = {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        suiteId: suite.id,
        suiteName: suite.name,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total,
          passed,
          failed: total - passed,
          avgScore: Math.round(avgScore * 1000) / 1000,
          totalLatencyMs: results.reduce((s, r) => s + r.latencyMs, 0),
          totalTokenCost:
            Math.round(
              results.reduce((s, r) => s + r.tokenCost, 0) * 10000
            ) / 10000,
        },
        agentVersion: results[0]?.evaluatorType
          ? `run-${Date.now().toString(36)}`
          : `sim-${Date.now().toString(36)}`,
        modelVersion: results[0]?.evaluatorType
          ? "live"
          : "simulation",
      };

      addRun(run);
      setSimulatingSuite(null);
    },
    [suites, addRun]
  );

  const handleSimCancel = useCallback(() => {
    setSimulatingSuite(null);
  }, []);

  if (suites.length === 0) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Test Suites</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Define test cases and manage evaluation scenarios for your AI
              agents
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            New Suite
          </button>
        </div>
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] mb-4">
            No test suites yet. Create one to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Create First Suite
          </button>
        </div>
        <CreateSuiteModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Test Suites</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Define test cases and manage evaluation scenarios for your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          New Suite
        </button>
      </div>

      <div className="space-y-3">
        {suites.map((suite) => {
          const isExpanded = expandedSuite === suite.id;
          const run = getLatestRunForSuite(suite.id);
          const isSimulating = simulatingSuite === suite.id;

          return (
            <div key={suite.id} className="glass-card overflow-hidden">
              <button
                onClick={() =>
                  setExpandedSuite(isExpanded ? null : suite.id)
                }
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown
                      size={16}
                      className="text-[var(--text-muted)]"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="text-[var(--text-muted)]"
                    />
                  )}
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
                    <TestTube2
                      size={14}
                      className="text-[var(--accent-light)]"
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold">{suite.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {suite.cases.length} cases &middot; {suite.agentType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {run && !isSimulating && (
                    <div className="flex items-center gap-3">
                      <ScoreRing
                        score={run.summary.avgScore}
                        size={36}
                        strokeWidth={3}
                        showValue={false}
                      />
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Shield size={10} />
                          {run.summary.avgScore.toFixed(2)}
                        </span>
                        <StatusBadge
                          status={
                            run.summary.failed === 0 ? "pass" : "warning"
                          }
                          label={`${run.summary.passed}/${run.summary.total}`}
                        />
                      </div>
                    </div>
                  )}
                  {!isSimulating && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTest(suite.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-[var(--accent-bg)] text-[var(--accent-light)] hover:opacity-80"
                    >
                      <Play size={12} />
                      Run Tests
                    </button>
                  )}
                </div>
              </button>

              {isExpanded && !isSimulating && (
                <div className="border-t border-[var(--border)]">
                  <div className="px-5 py-3 bg-[var(--bg-secondary)]">
                    <p className="text-xs text-[var(--text-secondary)]">
                      {suite.description}
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {suite.cases.map((tc) => {
                      const result = run?.results.find(
                        (r) => r.testCaseId === tc.id
                      );
                      return (
                        <div
                          key={tc.id}
                          className="px-5 py-3 flex items-start gap-3"
                        >
                          <div className="mt-0.5">
                            {result ? (
                              <StatusBadge
                                status={result.passed ? "pass" : "fail"}
                                size="sm"
                              />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-[var(--border-light)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {tc.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                {tc.category}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                              {tc.expectedOutput}
                            </p>
                          </div>
                          {result && (
                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] shrink-0">
                              <div className="flex items-center gap-1.5">
                                <div className="progress-bar w-12">
                                  <div
                                    className="progress-bar-fill"
                                    style={{
                                      width: `${result.score * 100}%`,
                                      backgroundColor:
                                        result.score > 0.7
                                          ? "var(--green)"
                                          : result.score > 0.4
                                            ? "var(--yellow)"
                                            : "var(--red)",
                                    }}
                                  />
                                </div>
                                <span className="font-mono w-7 text-right">
                                  {result.score.toFixed(2)}
                                </span>
                              </div>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {result.latencyMs}ms
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign size={10} />$
                                {result.tokenCost.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isSimulating && (
                <div className="border-t border-[var(--border)] p-4">
                  <RunSimulation
                    cases={suite.cases}
                    onComplete={handleSimComplete(suite.id)}
                    onCancel={handleSimCancel}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <CreateSuiteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
