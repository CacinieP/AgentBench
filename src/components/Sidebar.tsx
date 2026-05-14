"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  LayoutDashboard,
  TestTube2,
  GitCompareArrows,
  FlaskConical,
  Zap,
  Activity,
  Settings2,
} from "lucide-react";
import clsx from "clsx";
import { useData } from "@/lib/data-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suites", label: "Test Suites", icon: TestTube2 },
  { href: "/compare", label: "Compare Runs", icon: GitCompareArrows },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { runs } = useData();

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [runs]
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href) || pathname.startsWith("/run");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] z-50">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <FlaskConical size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            AgentBench
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
            EvalOps
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              isActive(href)
                ? "bg-[var(--accent-bg)] text-[var(--accent-light)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-3 mt-5 mb-2">
          Recent Runs
        </p>
        {sortedRuns.length === 0 ? (
          <p className="text-[10px] text-[var(--text-muted)] px-3 py-2">
            No runs yet
          </p>
        ) : (
          sortedRuns.map((run) => (
            <Link
              key={run.id}
              href={`/run/${run.id}`}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                pathname === `/run/${run.id}`
                  ? "bg-[var(--accent-bg)] text-[var(--accent-light)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
              )}
            >
              <Activity size={12} className="shrink-0" />
              <span className="truncate flex-1">{run.suiteName}</span>
              <span
                className="font-mono text-[10px] shrink-0"
                style={{
                  color:
                    run.summary.avgScore > 0.7
                      ? "var(--green)"
                      : run.summary.avgScore > 0.4
                        ? "var(--yellow)"
                        : "var(--red)",
                }}
              >
                {run.summary.avgScore.toFixed(2)}
              </span>
            </Link>
          ))
        )}
      </nav>

      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Hackathon Demo
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            AI coding as both means &amp; product — built entirely with Claude
            Code
          </p>
        </div>
      </div>
    </aside>
  );
}
