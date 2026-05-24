"use client";

import { useState, useEffect } from "react";
import { config } from "@job-hunter/icp";
import type { LeadDetail } from "@/types/leads";
import { Card } from "../ui/card";
import {
  DEFAULT_TEMPLATES,
  applyTemplate,
  buildContext,
  type MessageTemplate,
} from "@/lib/templates";
import { Copy, Check } from "lucide-react";

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
      </div>
    </Card>
  );
}
