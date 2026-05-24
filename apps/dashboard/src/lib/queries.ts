import { db, leads } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
