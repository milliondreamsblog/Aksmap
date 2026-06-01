import { db, leads, messages, companies } from "./db";
import { eq, desc, sql, inArray } from "drizzle-orm";

export type LeadWithRelations = Awaited<ReturnType<typeof getLeads>>[number];

type LeadStatus =
  | "raw"
  | "enriching"
  | "enriched"
  | "scored"
  | "queued"
  | "approved"
  | "sent"
  | "replied"
  | "rejected"
  | "archived";

export async function getLeads(
  opts: {
    status?: string;
    limit?: number;
  } = {},
) {
  return db.query.leads.findMany({
    where: opts.status
      ? eq(leads.status, opts.status as LeadStatus)
      : undefined,
    orderBy: [desc(leads.score), desc(leads.scrapedAt)],
    limit: opts.limit ?? 100,
    with: {
      company: true,
      contact: true,
    },
  });
}

export async function getLeadById(id: string) {
  return db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      company: {
        with: { contacts: true },
      },
      contact: true,
      messages: { orderBy: (m, { desc }) => desc(m.createdAt) },
    },
  });
}

export async function getStatusCounts() {
  const rows = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
    })
    .from(leads)
    .groupBy(leads.status);

  return rows;
}

export type SentOutreachRow = Awaited<
  ReturnType<typeof getSentOutreach>
>[number];

// Every email that has left the drafting stage — the consolidated outreach log.
export async function getSentOutreach() {
  const recipient = (col: "email" | "name") =>
    sql<string | null>`(
      select c.${sql.raw(col)} from contacts c
      where c.company_id = ${companies.id} and c.email is not null
      order by c.is_primary desc nulls last
      limit 1
    )`;

  return db
    .select({
      messageId: messages.id,
      leadId: messages.leadId,
      subject: messages.subject,
      body: messages.body,
      status: messages.status,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      providerMessageId: messages.providerMessageId,
      company: companies.name,
      domain: companies.domain,
      leadStatus: leads.status,
      recipientEmail: recipient("email"),
      recipientName: recipient("name"),
    })
    .from(messages)
    .innerJoin(leads, eq(messages.leadId, leads.id))
    .innerJoin(companies, eq(leads.companyId, companies.id))
    .where(
      inArray(messages.status, ["sent", "sending", "failed", "bounced"]),
    )
    .orderBy(desc(messages.sentAt), desc(messages.createdAt));
}

export async function getStats() {
  const [statuses, totals] = await Promise.all([
    getStatusCounts(),
    db
      .select({
        leads: sql<number>`count(*)::int`,
        companies: sql<number>`count(distinct ${leads.companyId})::int`,
        scored: sql<number>`count(${leads.score})::int`,
      })
      .from(leads),
  ]);

  return { byStatus: statuses, totals: totals[0] };
}
