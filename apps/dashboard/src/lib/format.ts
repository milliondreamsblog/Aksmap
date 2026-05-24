export function formatScore(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(0);
}

export function scoreColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 70) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-muted";
}

export function statusColor(status: string): string {
  switch (status) {
    case "queued":
      return "bg-accent/20 text-accent border-accent/40";
    case "enriched":
      return "bg-warning/20 text-warning border-warning/40";
    case "sent":
      return "bg-success/20 text-success border-success/40";
    case "replied":
      return "bg-success/30 text-success border-success/50";
    case "rejected":
    case "archived":
      return "bg-muted/10 text-muted border-muted/30";
    case "raw":
    default:
      return "bg-border/40 text-text border-border";
  }
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}
