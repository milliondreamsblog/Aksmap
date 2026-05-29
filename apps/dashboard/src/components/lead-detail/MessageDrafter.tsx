"use client";

import { useState, useEffect, useTransition } from "react";
import { config } from "@job-hunter/icp";
import type { LeadDetail } from "@/types/leads";
import { Card } from "../ui/card";
import {
  DEFAULT_TEMPLATES,
  applyTemplate,
  buildContext,
  type MessageTemplate,
} from "@/lib/templates";
import { sendEmail } from "@/app/leads/[id]/send-email";
import { Copy, Check, Send, Loader2, AlertCircle } from "lucide-react";

interface Props {
  lead: LeadDetail;
}

const STORAGE_KEY = "job-hunter:templates";

export function MessageDrafter({ lead }: Props) {
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedId, setSelectedId] = useState<string>(
    DEFAULT_TEMPLATES[0]?.id ?? "",
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sending, startSendTransition] = useTransition();
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const primaryContact =
    lead.contact ?? (lead.company as { contacts?: Array<{ name: string; email: string | null }> }).contacts?.[0] ?? null;
  const recipientEmail = primaryContact?.email ?? null;
  const recipientName = primaryContact?.name ?? null;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored) as MessageTemplate[]);
      } catch {
        // ignore parse failure
      }
    }
  }, []);

  useEffect(() => {
    const template = templates.find((t) => t.id === selectedId);
    if (!template) return;
    const ctx = buildContext(lead, config.candidate.fullName);
    setSubject(applyTemplate(template.subject, ctx));
    setBody(applyTemplate(template.body, ctx));
  }, [selectedId, templates, lead]);

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <Card title="Message draft">
      <div className="space-y-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-muted">Subject</label>
            <button
              onClick={() => copy(subject, "subject")}
              className="text-xs text-muted hover:text-text flex items-center gap-1"
            >
              {copiedField === "subject" ? (
                <Check size={12} />
              ) : (
                <Copy size={12} />
              )}
              {copiedField === "subject" ? "Copied" : "Copy"}
            </button>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-muted">Body</label>
            <button
              onClick={() => copy(body, "body")}
              className="text-xs text-muted hover:text-text flex items-center gap-1"
            >
              {copiedField === "body" ? (
                <Check size={12} />
              ) : (
                <Copy size={12} />
              )}
              {copiedField === "body" ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          onClick={() => copy(`Subject: ${subject}\n\n${body}`, "all")}
          className="w-full bg-accent text-white py-2 rounded text-sm font-medium hover:bg-accent/80 flex items-center justify-center gap-2"
        >
          {copiedField === "all" ? <Check size={14} /> : <Copy size={14} />}
          {copiedField === "all" ? "Copied!" : "Copy subject + body"}
        </button>

        <button
          onClick={() => {
            setSendResult(null);
            startSendTransition(async () => {
              const result = await sendEmail({
                leadId: lead.id,
                recipientEmail: recipientEmail ?? "",
                recipientName: recipientName ?? "there",
                subject,
                body,
              });
              setSendResult({
                success: result.success,
                message: result.success
                  ? "Email sent successfully!"
                  : (result.error ?? "Failed to send"),
              });
            });
          }}
          disabled={sending || !recipientEmail}
          className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {sending
            ? "Sending..."
            : recipientEmail
              ? `Send to ${recipientEmail}`
              : "No recipient email"}
        </button>

        {sendResult && (
          <div
            className={`text-xs px-3 py-2 rounded flex items-center gap-2 ${
              sendResult.success
                ? "bg-green-900/20 text-green-400"
                : "bg-red-900/20 text-red-400"
            }`}
          >
            {sendResult.success ? (
              <Check size={12} />
            ) : (
              <AlertCircle size={12} />
            )}
            {sendResult.message}
          </div>
        )}
      </div>
    </Card>
  );
}
