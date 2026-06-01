"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Clock,
  Reply,
  Mail,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import type { SentOutreachRow } from "@/lib/queries";

export function OutreachTable({ rows }: { rows: SentOutreachRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No outreach sent yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
          <th className="py-2 font-medium">Company</th>
          <th className="py-2 font-medium">To</th>
          <th className="py-2 font-medium">Subject</th>
          <th className="py-2 font-medium whitespace-nowrap">Sent</th>
          <th className="py-2 font-medium text-right">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const open = openId === r.messageId;
          const status = r.leadStatus === "replied" ? "replied" : r.status;
          return (
            <Fragment key={r.messageId}>
              <tr
                onClick={() => setOpenId(open ? null : r.messageId)}
                className="border-b border-border last:border-b-0 hover:bg-border/20 cursor-pointer"
              >
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-text">
                    {open ? (
                      <ChevronDown size={13} className="text-muted" />
                    ) : (
                      <ChevronRight size={13} className="text-muted" />
                    )}
                    {r.company}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {r.recipientName && (
                    <span className="text-text">{r.recipientName} </span>
                  )}
                  <span className="text-muted">{r.recipientEmail ?? "—"}</span>
                </td>
                <td className="py-2 pr-3 text-muted max-w-[16rem] truncate">
                  {r.subject ?? "(no subject)"}
                </td>
                <td className="py-2 pr-3 text-muted whitespace-nowrap">
                  {formatWhen(r.sentAt ?? r.createdAt)}
                </td>
                <td className="py-2 text-right">
                  <StatusBadge status={status} />
                </td>
              </tr>
              {open && (
                <tr className="border-b border-border bg-bg/40">
                  <td colSpan={5} className="p-0">
                    <div className="px-4 py-4 space-y-3">
                      <div className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-xs">
                        <span className="text-muted">To</span>
                        <span className="text-text">
                          {r.recipientName ? `${r.recipientName} · ` : ""}
                          {r.recipientEmail ?? "—"}
                        </span>
                        <span className="text-muted">Subject</span>
                        <span className="text-text">
                          {r.subject ?? "(no subject)"}
                        </span>
                        <span className="text-muted">Sent</span>
                        <span className="text-text">
                          {formatWhen(r.sentAt ?? r.createdAt)}
                        </span>
                        {r.providerMessageId && (
                          <>
                            <span className="text-muted">Resend ID</span>
                            <span className="text-muted font-mono text-[11px]">
                              {r.providerMessageId}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="border-t border-border pt-3">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-text leading-relaxed">
                          {r.body}
                        </pre>
                      </div>
                      <Link
                        href={`/leads/${r.leadId}`}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
                      >
                        Open lead <ExternalLink size={11} />
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function formatWhen(d: SentOutreachRow["sentAt"]): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}, ${date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    sent: { icon: <Check size={11} />, color: "text-green-400" },
    replied: { icon: <Reply size={11} />, color: "text-blue-400" },
    sending: { icon: <Clock size={11} />, color: "text-yellow-400" },
    failed: { icon: <X size={11} />, color: "text-red-400" },
    bounced: { icon: <X size={11} />, color: "text-orange-400" },
  };
  const s = map[status] ?? { icon: <Mail size={11} />, color: "text-muted" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${s.color}`}>
      {s.icon} {status}
    </span>
  );
}
