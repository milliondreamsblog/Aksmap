"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LeadWithRelations } from "@/lib/queries";
import {
  formatScore,
  scoreColor,
  statusColor,
  formatDate,
} from "@/lib/format";

interface Props {
  leads: LeadWithRelations[];
  counts: { status: string; count: number }[];
  currentStatus: string | undefined;
}

const STATUS_ORDER = [
  "queued",
  "enriched",
  "raw",
  "sent",
  "replied",
  "archived",
  "rejected",
];

export function LeadTable({ leads, counts, currentStatus }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const goToStatus = (status: string) => {
    const next = new URLSearchParams(params.toString());
    if (status === "all") next.delete("status");
    else next.set("status", status);
    router.push(`/leads?${next.toString()}`);
  };

  const countFor = (s: string) =>
    counts.find((c) => c.status === s)?.count ?? 0;

  const totalCount = counts.reduce((a, c) => a + c.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Pill
          label="All"
          count={totalCount}
          active={!currentStatus || currentStatus === "all"}
          onClick={() => goToStatus("all")}
        />
        {STATUS_ORDER.map((s) => (
          <Pill
            key={s}
            label={s}
            count={countFor(s)}
            active={currentStatus === s}
            onClick={() => goToStatus(s)}
          />
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-12 text-muted">
          No leads in this view.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3 w-16">Score</th>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">Geo</th>
                <th className="text-left p-3">Funding</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3 w-24">Status</th>
                <th className="text-left p-3 w-24">Scraped</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-border hover:bg-surface transition-colors cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td
                    className={`p-3 font-mono font-semibold ${scoreColor(lead.score)}`}
                  >
                    {formatScore(lead.score)}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{lead.company.name}</div>
                    <div className="text-muted text-xs">
                      {lead.company.domain ?? "—"}
                    </div>
                  </td>
                  <td className="p-3 text-muted text-xs">
                    {lead.company.geo ?? "—"}
                  </td>
                  <td className="p-3 text-muted text-xs">
                    {lead.company.lastFundingAmount ?? "—"}
                  </td>
                  <td className="p-3 text-xs">
                    {lead.contact ? (
                      <>
                        <div>{lead.contact.name}</div>
                        <div className="text-muted">
                          {lead.contact.role ?? ""}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted">none</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs border ${statusColor(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted text-xs">
                    {formatDate(lead.scrapedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-accent/20 border-accent/50 text-accent"
          : "bg-surface border-border text-muted hover:text-text"
      }`}
    >
      {label} <span className="opacity-60">·</span> {count}
    </button>
  );
}
