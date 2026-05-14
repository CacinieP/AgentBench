"use client";

import { useRouter } from "next/navigation";
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
import { demoRuns, demoSuites } from "@/lib/demo-data";
import { formatRelativeTime, scoreColor } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const latestRun = demoRuns[0];
  const previousRun = demoRuns[1];
  const codeRun = demoRuns[2];

  const allRuns = [latestRun, previousRun, codeRun];
  const totalTests = allRuns.reduce((s, r) => s + r.summary.total, 0);
  const totalPassed = allRuns.reduce((s, r) => s + r.summary.passed, 0);
  const totalFailed = allRuns.reduce((s, r) => s + r.summary.failed, 0);
  const avgScore =
    allRuns.reduce((s, r) => s + r.summary.avgScore, 0) / allRuns.length;
  const totalCost = allRuns.reduce(
    (s, r) => s + r.summary.totalTokenCost,
    0
  );

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
          value={totalTests}
          subtitle={`${totalPassed} passed, ${totalFailed} failed`}
          icon={<Target size={16} />}
          accent="var(--accent)"
        />
        <MetricCard
          title="Pass Rate"
          value={`${((totalPassed / totalTests) * 100).toFixed(0)}%`}
          trend={{ value: 55, label: "vs prev" }}
          icon={<CheckCircle2 size={16} />}
          accent="var(--green)"
        />
        <MetricCard
          title="Avg Score"
          value={avgScore.toFixed(2)}
          trend={{ value: 48, label: "vs prev" }}
          icon={<Activity size={16} />}
          accent="var(--blue)"
        />
        <MetricCard
          title="Total Cost"
          value={`$${totalCost.toFixed(4)}`}
          subtitle="across all runs"
          icon={<DollarSign size={16} />}
          accent="var(--yellow)"
        />
      </div>

      {/* Test Suites with score rings */}
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
          {demoSuites.map((suite) => {
            const run = demoRuns.find((r) => r.suiteId === suite.id);
            return (
              <Link
                key={suite.id}
                href={`/run/${run?.id || "none"}`}
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

      {/* Score History mini-chart */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Score Trend</h2>
        <div className="glass-card p-5">
          <div className="flex items-end gap-3 h-32">
            {[
              { label: "v2.0", score: 0.31 },
              { label: "v2.1", score: 0.45 },
              { label: "v2.2", score: previousRun.summary.avgScore },
              { label: "v2.3", score: latestRun.summary.avgScore },
            ].map((point, i, arr) => (
              <div
                key={point.label}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[10px] font-mono" style={{ color: scoreColor(point.score) }}>
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

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Runs</h2>
          <Link
            href="/compare"
            className="text-xs text-[var(--accent-light)] hover:underline flex items-center gap-1"
          >
            Compare runs <BarChart3 size={12} />
          </Link>
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
              {demoRuns.map((run) => (
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
    </div>
  );
}
