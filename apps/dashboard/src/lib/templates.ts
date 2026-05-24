export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "ai-engineer-default",
    name: "AI Engineer — default cold",
    subject: "Building AI tools — saw your {funding_stage} raise",
    body: `Hi {founder_first_name},

Saw {company_name}'s recent {funding_amount} raise — congrats. The work you're doing sounds genuinely interesting.

I'm a 2026 grad who's shipped two production AI products: Talk2PDF (500+ weekly users, agentic RAG over docs) and the AI recommendation layer on Bawarchie (live QR-ordering platform). I also have an IEEE publication on transfer learning.

I'd love to talk about what you're building. 15 minutes whenever works for you?

Best,
{your_name}`,
  },
  {
    id: "fullstack-india",
    name: "Full-stack — India / SEA",
    subject: "Building production systems — {company_name} caught my eye",
    body: `Hi {founder_first_name},

{company_name}'s recent {funding_amount} round caught my eye. The {company_geo} startup scene is the most interesting place to be in tech right now.

I'm a 2026 grad currently shipping a $1B+ portfolio's operations platform at Tracks & Towers (Next.js + Go + AWS, 120+ daily users). Before that I shipped Bawarchie, a live QR-ordering product with real customer traffic.

Would love to chat about what {company_name} is solving. 15 min when you have it?

Best,
{your_name}`,
  },
  {
    id: "founding-engineer",
    name: "Founding engineer outreach",
    subject: "Founding engineer interest — {company_name}",
    body: `Hi {founder_first_name},

Reaching out because {company_name} hits a sweet spot for me: {company_geo}-based, recently funded, technical product.

I'm a 2026 CS grad with three shipped products (Bawarchie, Talk2PDF, BuildEnfra ERP) and an IEEE publication. Comfortable across the stack — TypeScript, Python, Go, AI tooling. Looking for a founding engineer or early-team role where I can ship end-to-end.

Open to a quick call this week?

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
