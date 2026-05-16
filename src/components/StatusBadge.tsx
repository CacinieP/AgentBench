"use client";

import clsx from "clsx";

interface StatusBadgeProps {
  status: "pass" | "fail" | "warning" | "running";
  label?: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  const config = {
    pass: {
      bg: "var(--green-bg)",
      color: "var(--green)",
      text: label || "通过",
    },
    fail: {
      bg: "var(--red-bg)",
      color: "var(--red)",
      text: label || "失败",
    },
    warning: {
      bg: "var(--yellow-bg)",
      color: "var(--yellow)",
      text: label || "警告",
    },
    running: {
      bg: "var(--blue-bg)",
      color: "var(--blue)",
      text: label || "运行中",
    },
  };

  const { bg, color, text } = config[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
      style={{ backgroundColor: bg, color }}
    >
      <span
        className={clsx("rounded-full", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")}
        style={{ backgroundColor: color }}
      />
      {text}
    </span>
  );
}
