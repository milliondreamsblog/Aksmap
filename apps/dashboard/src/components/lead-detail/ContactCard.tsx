import type { LeadDetail } from "@/types/leads";
import { Card } from "../ui/card";
import { ExternalLink } from "lucide-react";

export function ContactCard({ lead }: { lead: LeadDetail }) {
  const primary = lead.contact ?? lead.company.contacts?.[0];

  if (!primary) {
    const search = encodeURIComponent(
      `site:linkedin.com/in founder "${lead.company.name}"`,
    );
    return (
      <Card title="Contact">
        <p className="text-muted text-sm mb-3">No contact found.</p>
        <a
          href={`https://www.google.com/search?q=${search}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline text-sm"
        >
          Find on LinkedIn <ExternalLink size={12} />
        </a>
      </Card>
    );
  }

  return (
    <Card title="Contact">
      <div className="text-sm">
        <div className="font-medium">{primary.name}</div>
        <div className="text-muted text-xs">{primary.role ?? "—"}</div>
        {primary.email && (
          <div className="mt-2 font-mono text-xs">
            {primary.email}
            {!primary.emailVerified && (
              <span className="ml-2 text-warning text-[10px]">
                (unverified)
              </span>
            )}
          </div>
        )}
        {primary.linkedinUrl && (
          <a
            href={primary.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline text-xs mt-2"
          >
            LinkedIn <ExternalLink size={10} />
          </a>
        )}
      </div>
    </Card>
  );
}
