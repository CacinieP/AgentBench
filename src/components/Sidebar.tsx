"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TestTube2,
  GitCompareArrows,
  FlaskConical,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suites", label: "Test Suites", icon: TestTube2 },
  { href: "/compare", label: "Compare Runs", icon: GitCompareArrows },
];

export default function Sidebar() {
  const pathname = usePathname();

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

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-[var(--accent-bg)] text-[var(--accent-light)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
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
            AI coding as both means &amp; product — built entirely with Claude Code
          </p>
        </div>
      </div>
    </aside>
  );
}
