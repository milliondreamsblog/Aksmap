"use client";

import { useTransition, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { quickAddLead } from "@/app/quick-add/actions";
import { Card } from "@/components/ui/card";

type Platform = "twitter" | "linkedin" | null;

function detectPlatform(url: string): Platform {
  if (/^https?:\/\/(?:x\.com|twitter\.com)\//i.test(url)) return "twitter";
  if (/^https?:\/\/(?:www\.)?linkedin\.com\//i.test(url)) return "linkedin";
  return null;
}

export function QuickAddForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [step, setStep] = useState<string | null>(null);

  const onUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlatform(detectPlatform(e.target.value));
      setError(null);
    },
    [],
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    setStep("Fetching post...");

    startTransition(async () => {
      try {
        setStep("Creating lead & enriching...");
        const result = await quickAddLead(formData);
        if (!result.success) {
          setError(result.error ?? "Something went wrong.");
          setStep(null);
          return;
        }
        setStep("Done! Redirecting...");
        router.push(`/leads/${result.leadId}`);
      } catch {
        setError("An unexpected error occurred.");
        setStep(null);
      }
    });
  }

  return (
    <Card title="Paste a hiring post">
      <form action={handleSubmit} className="space-y-4">
        {/* URL */}
        <div className="space-y-1">
          <label htmlFor="url" className="text-sm font-medium text-text">
            Post URL
            {platform && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">
                {platform === "twitter" ? "Twitter / X" : "LinkedIn"}
              </span>
            )}
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://x.com/founder/status/123456..."
            onChange={onUrlChange}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Post text */}
        <div className="space-y-1">
          <label htmlFor="postText" className="text-sm font-medium text-text">
            Post text
            {platform === "twitter" && (
              <span className="ml-2 text-xs text-muted">
                (auto-fetched for tweets)
              </span>
            )}
          </label>
          <textarea
            id="postText"
            name="postText"
            rows={5}
            placeholder="Paste the post text here..."
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          />
          {platform === "linkedin" && (
            <p className="text-xs text-warning">
              LinkedIn posts can&apos;t be fetched automatically — please paste
              the text above.
            </p>
          )}
        </div>

        {/* Overrides row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="companyName"
              className="text-sm font-medium text-text"
            >
              Company name
              <span className="ml-1 text-xs text-muted">(override)</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Auto-detected from text"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="roleTitle"
              className="text-sm font-medium text-text"
            >
              Role title
              <span className="ml-1 text-xs text-muted">(optional)</span>
            </label>
            <input
              id="roleTitle"
              name="roleTitle"
              type="text"
              placeholder="e.g. AI Engineer"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent text-white py-2.5 rounded text-sm font-medium hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? (step ?? "Processing...") : "Create Lead"}
        </button>

        {pending && (
          <p className="text-xs text-muted text-center">
            Enriching the company website and scoring — this may take a few
            seconds.
          </p>
        )}
      </form>
    </Card>
  );
}
