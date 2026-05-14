"use client";

import { scoreColor } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export default function ScoreRing({
  score,
  size = 64,
  strokeWidth = 5,
  label,
  showValue = true,
  className = "",
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;
  const color = scoreColor(score);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="score-ring"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        {showValue && (
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{ color, transform: "none" }}
          >
            {(score * 100).toFixed(0)}
          </span>
        )}
      </div>
      {label && (
        <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      )}
    </div>
  );
}
