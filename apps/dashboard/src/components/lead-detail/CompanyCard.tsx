import type { LeadDetail } from "@/types/leads";
import { Card } from "../ui/card";

export function CompanyCard({ lead }: { lead: LeadDetail }) {
  const c = lead.company;
  return (
    <Card title="Company">
      <Row
        label="Domain"
        value={c.domain ?? "—"}
        link={c.domain ? `https://${c.domain}` : undefined}
      />
      <Row label="Geo" value={c.geo ?? "—"} />
      <Row label="HQ" value={c.hqLocation ?? "—"} />
      <Row label="Headcount" value={c.headcount?.toString() ?? "—"} />
      <Row label="Funding" value={c.lastFundingAmount ?? "—"} />
      <Row
        label="Stage"
        value={c.fundingStage?.replace(/_/g, " ") ?? "—"}
      />
      <Row label="Industry" value={c.industry ?? "—"} />
      <Row label="AI focus" value={c.isAiCompany ? "Yes" : "No"} />
      <Row
        label="Tech stack"
        value={(c.techStack ?? []).join(", ") || "—"}
      />
      {c.careersUrl && (
        <Row label="Careers" value={c.careersUrl} link={c.careersUrl} />
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-border last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-text max-w-[60%] truncate">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
