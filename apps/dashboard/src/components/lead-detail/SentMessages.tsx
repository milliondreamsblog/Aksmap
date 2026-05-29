import { Card } from "../ui/card";
import { Mail, Check, X, Clock } from "lucide-react";

interface MessageRow {
  id: string;
  subject: string | null;
  body: string;
  status: string;
  channel: string;
  sentAt: Date | null;
  createdAt: Date;
}

interface Props {
  messages: MessageRow[];
}

export function SentMessages({ messages }: Props) {
  const emailMessages = messages.filter((m) => m.channel === "email");
  if (emailMessages.length === 0) return null;

  return (
    <Card title="Sent messages">
      <div className="space-y-3">
        {emailMessages.map((msg) => (
          <div
            key={msg.id}
            className="border border-border rounded p-3 text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-muted" />
                <span className="font-medium text-xs text-text">
                  {msg.subject ?? "(no subject)"}
                </span>
              </div>
              <StatusBadge status={msg.status} />
            </div>
            <p className="text-xs text-muted line-clamp-2">{msg.body}</p>
            {msg.sentAt && (
              <p className="text-[10px] text-muted mt-1">
                Sent {new Date(msg.sentAt).toLocaleDateString()} at{" "}
                {new Date(msg.sentAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: React.ReactNode; color: string }
  > = {
    sent: { icon: <Check size={10} />, color: "text-green-400" },
    failed: { icon: <X size={10} />, color: "text-red-400" },
    sending: { icon: <Clock size={10} />, color: "text-yellow-400" },
    draft: { icon: <Clock size={10} />, color: "text-muted" },
    bounced: { icon: <X size={10} />, color: "text-orange-400" },
  };
  const s = config[status] ?? config["draft"]!;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${s.color}`}>
      {s.icon} {status}
    </span>
  );
}
