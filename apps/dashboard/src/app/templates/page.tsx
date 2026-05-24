"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { DEFAULT_TEMPLATES, type MessageTemplate } from "@/lib/templates";
import { Save, RotateCcw } from "lucide-react";

const STORAGE_KEY = "job-hunter:templates";

export default function TemplatesPage() {
  const [templates, setTemplates] =
    useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saved, setSaved] = useState(false);

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

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const reset = () => {
    setTemplates(DEFAULT_TEMPLATES);
    localStorage.removeItem(STORAGE_KEY);
  };

  const active = templates[activeIdx];
  if (!active) return null;

  const update = (patch: Partial<MessageTemplate>) => {
    const next = templates.map((t, i) =>
      i === activeIdx ? { ...t, ...patch } : t,
    );
    setTemplates(next);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Message templates</h1>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-muted hover:text-text"
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
          <button
            onClick={save}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-xs"
          >
            <Save size={12} /> {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </header>

      <p className="text-muted text-sm">
        Placeholders:{" "}
        <code className="text-text">{`{company_name} {founder_first_name} {company_geo} {funding_amount} {funding_stage} {your_name}`}</code>
      </p>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1">
          {templates.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveIdx(i)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                i === activeIdx
                  ? "bg-surface text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="col-span-3">
          <Card>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted">Template name</label>
                <input
                  type="text"
                  value={active.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Subject</label>
                <input
                  type="text"
                  value={active.subject}
                  onChange={(e) => update({ subject: e.target.value })}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Body</label>
                <textarea
                  value={active.body}
                  onChange={(e) => update({ body: e.target.value })}
                  rows={14}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm mt-1 font-mono"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
