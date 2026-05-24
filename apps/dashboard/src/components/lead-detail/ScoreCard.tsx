import type { LeadDetail } from "@/types/leads";
import { Card } from "../ui/card";
import { scoreColor, formatScore } from "@/lib/format";

export function ScoreCard({ lead }: { lead: LeadDetail }) {
  const breakdown = (lead.scoreBreakdown ?? {}) as Record<string, number>;

  return (
    <Card title="Score">
      <div
        className={`text-4xl font-mono font-bold mb-3 ${scoreColor(lead.score)}`}
      >
        {formatScore(lead.score)}
      </div>
      <div className="space-y-1">
        {Object.entries(breakdown).map(([factor, value]) => (
          <div key={factor} className="flex justify-between text-xs">
            <span className="text-muted">{factor}</span>
            <span className="font-mono">{value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
