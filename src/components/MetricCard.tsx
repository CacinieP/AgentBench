"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ReactNode;
  accent?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accent = "var(--accent)",
}: MetricCardProps) {
  const trendColor =
    trend && trend.value > 0
      ? "var(--green)"
      : trend && trend.value < 0
        ? "var(--red)"
        : "var(--text-muted)";

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="text-xs text-[var(--text-secondary)]">
              {subtitle}
            </span>
          )}
          {trend && (
            <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: trendColor }}>
              {trend.value > 0 ? (
                <TrendingUp size={12} />
              ) : trend.value < 0 ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {trend.value > 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
