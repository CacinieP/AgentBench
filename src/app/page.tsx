"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Activity,
  ArrowRight,
  Shield,
  Target,
  BarChart3,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import ScoreRing from "@/components/ScoreRing";
import { useData } from "@/lib/data-context";
import { formatRelativeTime, scoreColor } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const { suites, runs } = useData();

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [runs]
  );

  const metrics = useMemo(() => {
    if (sortedRuns.length === 0) {
      return {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        avgScore: 0,
        totalCost: 0,
      };
    }
    return {
      totalTests: sortedRuns.reduce((s, r) => s + r.summary.total, 0),
      totalPassed: sortedRuns.reduce((s, r) => s + r.summary.passed, 0),
      totalFailed: sortedRuns.reduce((s, r) => s + r.summary.failed, 0),
      avgScore:
        sortedRuns.reduce((s, r) => s + r.summary.avgScore, 0) /
        sortedRuns.length,
      totalCost: sortedRuns.reduce(
        (s, r) => s + r.summary.totalTokenCost,
        0
      ),
    };
  }, [sortedRuns]);

  const chartData = useMemo(
    () =>
      sortedRuns
        .slice(0, 6)
        .reverse()
        .map((r) => ({
          label: r.agentVersion,
          score: r.summary.avgScore,
        })),
    [sortedRuns]
  );

  const getLatestRunForSuite = (suiteId: string) =>
    sortedRuns.find((r) => r.suiteId === suiteId);

  if (suites.length === 0 && runs.length === 0) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            AI Agent regression testing &amp; quality monitoring
          </p>
        </div>
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] mb-4">
            No data yet. Create a test suite to get started.
          </p>
          <Link
            href="/suites"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowRight size={14} />
            Go to Test Suites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          AI Agent regression testing &amp; quality monitoring
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Tests"
          value={metrics.totalTests}
          subtitle={`${metrics.totalPassed} passed, ${metrics.totalFailed} failed`}
          icon={<Target size={16} />}
          accent="var(--accent)"
        />
        <MetricCard
          title="Pass Rate"
          value={
            metrics.totalTests > 0
              ? `${((metrics.totalPassed / metrics.totalTests) * 100).toFixed(0)}%`
              : "—"
          }
          icon={<CheckCircle2 size={16} />}
          accent="var(--green)"
        />
        <MetricCard
          title="Avg Score"
          value={
            sortedRuns.length > 0 ? metrics.avgScore.toFixed(2) : "—"
          }
          icon={<Activity size={16} />}
          accent="var(--blue)"
        />
        <MetricCard
          title="Total Cost"
          value={`$${metrics.totalCost.toFixed(4)}`}
          subtitle="across all runs"
          icon={<DollarSign size={16} />}
          accent="var(--yellow)"
        />
      </div>

      {/* Test Suites with score rings */}
      {suites.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Test Suites</h2>
            <Link
              href="/suites"
              className="text-xs text-[var(--accent-light)] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {suites.map((suite) => {
              const run = getLatestRunForSuite(suite.id);
              return (
                <Link
                  key={suite.id}
                  href={run ? `/run/${run.id}` : "/suites"}
                  className="glass-card p-5 hover:border-[var(--border-light)] cursor-pointer block group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-sm font-semibold mb-1 group-hover:text-[var(--accent-light)] transition-colors">
                        {suite.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {suite.cases.length} test cases
                      </p>
                    </div>
                    {run ? (
                      <ScoreRing
                        score={run.summary.avgScore}
                        size={44}
                        strokeWidth={3.5}
                        showValue={true}
                      />
                    ) : (
                      <StatusBadge status="warning" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
                    {suite.description}
                  </p>
                  {run && (
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Shield size={10} />
                        {run.summary.avgScore.toFixed(2)} avg
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {(run.summary.totalLatencyMs / 1000).toFixed(1)}s
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} />$
                        {run.summary.totalTokenCost.toFixed(4)}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Score History mini-chart */}
      {chartData.length >= 2 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Score Trend</h2>
          <div className="glass-card p-5">
            <div className="flex items-end gap-3 h-32">
              {chartData.map((point, i, arr) => (
                <div
                  key={point.label + i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: scoreColor(point.score) }}
                  >
                    {point.score.toFixed(2)}
                  </span>
                  <div className="w-full relative" style={{ height: 100 }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-md transition-all duration-700"
                      style={{
                        height: `${point.score * 100}%`,
                        backgroundColor:
                          i === arr.length - 1
                            ? "var(--accent)"
                            : scoreColor(point.score),
                        opacity: i === arr.length - 1 ? 1 : 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {sortedRuns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Runs</h2>
            {sortedRuns.length >= 2 && (
              <Link
                href="/compare"
                className="text-xs text-[var(--accent-light)] hover:underline flex items-center gap-1"
              >
                Compare runs <BarChart3 size={12} />
              </Link>
            )}
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Suite
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Version
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Result
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Score
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Latency
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Cost
                  </th>
                  <th className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wider px-5 py-3">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                    onClick={() => router.push(`/run/${run.id}`)}
                  >
                    <td className="px-5 py-3">
                      <span className="text-sm">{run.suiteName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-[var(--accent-light)] bg-[var(--accent-bg)] px-2 py-0.5 rounded">
                        {run.agentVersion}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          run.summary.failed === 0 ? "pass" : "warning"
                        }
                        label={`${run.summary.passed}/${run.summary.total}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${run.summary.avgScore * 100}%`,
                              backgroundColor: scoreColor(run.summary.avgScore),
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] font-mono">
                          {run.summary.avgScore.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">
                      {(run.summary.totalLatencyMs / 1000).toFixed(1)}s
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">
                      ${run.summary.totalTokenCost.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--text-muted)]">
                      {formatRelativeTime(run.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
