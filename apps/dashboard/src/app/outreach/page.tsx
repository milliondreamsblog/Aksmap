import Link from "next/link";
import { Check, X, Clock, Reply, Mail } from "lucide-react";
import { getSentOutreach, type SentOutreachRow } from "@/lib/queries";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const rows = await getSentOutreach();
  // Replies are tracked on the lead, not the message.
  const effectiveStatus = (r: SentOutreachRow) =>
    r.leadStatus === "replied" ? "replied" : r.status;
  const sent = rows.filter((r) => r.status === "sent").length;
  const replied = rows.filter((r) => r.leadStatus === "replied").length;
  const failed = rows.filter(
    (r) => r.status === "failed" || r.status === "bounced",
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <p className="text-muted text-sm">All sent emails · {rows.length} total</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Sent">
          <div className="text-3xl font-mono">{sent}</div>
        </Card>
        <Card title="Replied">
          <div className="text-3xl font-mono text-green-400">{replied}</div>
        </Card>
        <Card title="Failed / bounced">
          <div className="text-3xl font-mono text-red-400">{failed}</div>
        </Card>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No outreach sent yet.</p>
        ) : (
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
              {rows.map((r) => (
                <tr
                  key={r.messageId}
                  className="border-b border-border last:border-b-0 hover:bg-border/20"
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/leads/${r.leadId}`}
                      className="text-text hover:underline"
                    >
                      {r.company}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    {r.recipientName && (
                      <span className="text-text">{r.recipientName}</span>
                    )}{" "}
                    <span className="text-muted">{r.recipientEmail ?? "—"}</span>
                  </td>
                  <td className="py-2 pr-3 text-muted max-w-[16rem] truncate">
                    {r.subject ?? "(no subject)"}
                  </td>
                  <td className="py-2 pr-3 text-muted whitespace-nowrap">
                    {formatWhen(r.sentAt ?? r.createdAt)}
                  </td>
                  <td className="py-2 text-right">
                    <StatusBadge status={effectiveStatus(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
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
