export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "ai-engineer-production",
    name: "AI Engineer — Claude in production",
    subject: "Running Claude in production — {company_name} looks interesting",
    body: `Hi {founder_first_name},

Saw {company_name}'s {funding_stage} raise — congrats.

I'm currently a founding-era engineer at Tracks & Towers, where I run Claude-powered RAG and agentic workflows over construction documents in production — real ops decisions, not demos. Before that I built a vector-search recommendation engine (768-d Gemini embeddings + MongoDB Atlas Vector Search) for Bawarchie, a live multi-tenant restaurant platform. Also have an IEEE publication on transfer learning (40% CNN latency improvement).

I'm looking for an AI engineering role where I can ship real systems. Would love to hear what {company_name} is building — 15 min?

Best,
{your_name}`,
  },
  {
    id: "founding-engineer-scale",
    name: "Founding Engineer — production scale",
    subject: "Founding engineer — shipped to 17K+ users",
    body: `Hi {founder_first_name},

{company_name}'s {funding_amount} round caught my eye — the kind of stage where the first few engineers define everything.

I've been in that seat twice. Currently I'm a founding-era hire at Tracks & Towers building an integrated ERP + HRMS from scratch — 17,000+ workforce records, 1,000+ ERP users, 10+ construction sites, $2B+ in project value managed. I own the full stack: TypeScript APIs, Go microservices, Next.js dashboards, React Native field app, Claude-powered doc workflows. Before that I was first engineering hire at ClimAgro (IIT Kanpur-funded climate-tech).

I'm looking for my next founding-stage role. Open to a quick call?

Best,
{your_name}`,
  },
  {
    id: "fullstack-backend-heavy",
    name: "Full-stack — backend-heavy systems",
    subject: "Backend-heavy full-stack — {company_name}",
    body: `Hi {founder_first_name},

{company_name} looks like it needs someone who can ship production systems end-to-end — that's what I do.

Currently building a construction-ops ERP at Tracks & Towers: TypeScript + Go backend, Next.js + React Native frontend, PostgreSQL + MongoDB, distributed Puppeteer workers generating 700+ payroll PDFs/month. System serves 1,000+ users across 10+ sites managing $2B+ in projects. Also solo-built RoboRumble 3.0, a tech-event platform handling 30K+ visits and 1K+ paid registrations with real-time team rooms.

800+ GitHub contributions/year, 600+ DSA problems solved. Would love to chat about what you're building.

Best,
{your_name}`,
  },
  {
    id: "b2b-saas-operator",
    name: "B2B SaaS — operator who ships",
    subject: "Shipped SaaS to 1,000+ users — interested in {company_name}",
    body: `Hi {founder_first_name},

I build SaaS that runs real operations — not side projects.

At Tracks & Towers (ISO 9001 infra firm), I'm building an ERP + HRMS competing with established construction-tech vendors. The HRMS runs 17,000+ workforce records with automated payroll; the ERP handles approvals, DMS, and RFIs across 10+ sites. I work directly with founders on scope and on-site rollouts — I know what it takes to ship software that ops teams actually use.

{company_name}'s {funding_stage} raise tells me you're at the stage where execution speed matters most. Happy to chat — 15 min?

Best,
{your_name}`,
  },
];

interface TemplateContext {
  company_name: string;
  founder_name: string;
  founder_first_name: string;
  company_geo: string;
  funding_amount: string;
  funding_stage: string;
  role_title: string;
  your_name: string;
  your_pitch: string;
}

// Permissive shape accepted by buildContext. Both LeadWithRelations
// (from list query, no company.contacts) and LeadDetail (from detail
// query, with company.contacts) are structurally assignable.
export interface LeadForContext {
  contact: { name: string } | null;
  roleTitle: string | null;
  company: {
    name: string;
    geo: string | null;
    lastFundingAmount: string | null;
    fundingStage: string | null;
    contacts?: ReadonlyArray<{ name: string }>;
  };
}

export function buildContext(
  lead: LeadForContext,
  candidateName: string,
): TemplateContext {
  const company = lead.company;
  const fallbackContact = company.contacts?.[0] ?? null;
  const contact = lead.contact ?? fallbackContact;
  const founderName = contact?.name ?? "there";
  const founderFirst =
    founderName === "there"
      ? "there"
      : (founderName.split(/\s+/)[0] ?? "there");

  const geoLabels: Record<string, string> = {
    india: "Indian",
    singapore_sea: "SEA",
    usa_remote: "US",
    europe_uk: "European",
    japan_korea: "East Asian",
  };

  return {
    company_name: company.name,
    founder_name: founderName,
    founder_first_name: founderFirst,
    company_geo: company.geo
      ? (geoLabels[company.geo] ?? company.geo)
      : "global",
    funding_amount: company.lastFundingAmount ?? "recent",
    funding_stage: company.fundingStage?.replace(/_/g, " ") ?? "recent",
    role_title: lead.roleTitle ?? "engineering role",
    your_name: candidateName,
    your_pitch: "shipping production AI + full-stack products",
  };
}

export function applyTemplate(template: string, ctx: TemplateContext): string {
  const ctxMap = ctx as unknown as Record<string, string>;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return ctxMap[key] ?? `{${key}}`;
  });
}
