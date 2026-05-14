export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function scoreColor(score: number): string {
  if (score >= 0.8) return "var(--green)";
  if (score >= 0.5) return "var(--yellow)";
  return "var(--red)";
}

export function scoreBg(score: number): string {
  if (score >= 0.8) return "var(--green-bg)";
  if (score >= 0.5) return "var(--yellow-bg)";
  return "var(--red-bg)";
}

export function passRateColor(rate: number): string {
  if (rate >= 80) return "var(--green)";
  if (rate >= 50) return "var(--yellow)";
  return "var(--red)";
}
