"use client";

import { ExternalLink, Search, Send, X, Archive } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus } from "@/app/leads/[id]/actions";

interface Props {
  lead: {
    id: string;
    status: string;
    company: { name: string; careersUrl: string | null };
  };
}

export function ActionBar({ lead }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const linkedinSearch = encodeURIComponent(
    `site:linkedin.com/in founder "${lead.company.name}"`,
  );

  const setStatus = (status: string) => {
    startTransition(async () => {
      await updateLeadStatus(lead.id, status);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2 bg-surface border border-border rounded-lg p-3">
      {lead.company.careersUrl && (
        <ExternalAction
          href={lead.company.careersUrl}
          icon={<ExternalLink size={14} />}
          label="Open careers page"
        />
      )}
      <ExternalAction
        href={`https://www.google.com/search?q=${linkedinSearch}`}
        icon={<Search size={14} />}
        label="LinkedIn search"
      />
      <div className="flex-1" />
      <StatusButton
        icon={<Send size={14} />}
        label="Mark sent"
        onClick={() => setStatus("sent")}
        disabled={pending || lead.status === "sent"}
      />
      <StatusButton
        icon={<X size={14} />}
        label="Reject"
        onClick={() => setStatus("rejected")}
        disabled={pending}
      />
      <StatusButton
        icon={<Archive size={14} />}
        label="Archive"
        onClick={() => setStatus("archived")}
        disabled={pending}
      />
    </div>
  );
}

function ExternalAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border rounded text-xs hover:border-accent/50 hover:text-accent"
    >
      {icon} {label}
    </a>
  );
}

function StatusButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border rounded text-xs hover:border-accent/50 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon} {label}
    </button>
  );
}
