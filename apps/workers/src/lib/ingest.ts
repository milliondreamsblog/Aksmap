import { db, companies, leads, events } from "@job-hunter/db";
import type { ScrapeResult, ScrapedLead } from "@job-hunter/scrapers";
import { logger } from "./logger.js";

export interface IngestStats {
  companiesUpserted: number;
  leadsCreated: number;
  leadsSkipped: number;
  errors: number;
}

export async function ingestScrapeResult(
  result: ScrapeResult,
): Promise<IngestStats> {
  const stats: IngestStats = {
    companiesUpserted: 0,
    leadsCreated: 0,
    leadsSkipped: 0,
    errors: result.errors.length,
  };

  for (const scraped of result.leads) {
    if (!scraped.company.domain) {
      stats.leadsSkipped++;
      continue;
    }

    try {
      const companyId = await upsertCompany(scraped);
      await insertLead(scraped, companyId, result.source);
      stats.companiesUpserted++;
      stats.leadsCreated++;
    } catch (err) {
      logger.error("Lead ingest failed", {
        source: result.source,
        company: scraped.company.name,
        domain: scraped.company.domain,
        error: err instanceof Error ? err.message : String(err),
      });
      stats.errors++;
    }
  }

  await db.insert(events).values({
    entityType: "scraper_run",
    eventType: `${result.source}.completed`,
    payload: {
      source: result.source,
      scrapedAt: new Date(result.scrapedAt).toISOString(),
      candidates: result.leads.length,
      ...stats,
    },
  });

  return stats;
}

async function upsertCompany(scraped: ScrapedLead): Promise<string> {
  const c = scraped.company;
  if (!c.domain) throw new Error("upsertCompany requires a domain");

  const [row] = await db
    .insert(companies)
    .values({
      domain: c.domain,
      name: c.name,
      description: c.description,
      geo: c.geo,
      hqLocation: c.hqLocation,
      headcount: c.headcount,
      fundingStage: c.fundingStage,
      lastFundingDate: c.lastFundingDate,
      lastFundingAmount: c.lastFundingAmount,
      industry: c.industry,
      isAiCompany: c.isAiCompany ?? false,
      careersUrl: c.careersUrl,
    })
    .onConflictDoUpdate({
      target: companies.domain,
      set: {
        description: c.description,
        headcount: c.headcount,
        fundingStage: c.fundingStage,
        lastFundingDate: c.lastFundingDate,
        lastFundingAmount: c.lastFundingAmount,
        updatedAt: new Date(),
      },
    })
    .returning({ id: companies.id });

  if (!row) throw new Error("upsertCompany returned no row");
  return row.id;
}

async function insertLead(
  scraped: ScrapedLead,
  companyId: string,
  source: string,
): Promise<void> {
  await db
    .insert(leads)
    .values({
      companyId,
      source,
      sourceUrl: scraped.sourceUrl,
      sourcePayload: scraped.rawPayload as object,
      roleTitle: scraped.role?.title,
      roleType: scraped.role?.type ?? undefined,
      roleUrl: scraped.role?.url,
      isRemote: scraped.role?.isRemote,
      isJuniorFriendly: scraped.role?.isJuniorFriendly,
      status: "raw",
    })
    .onConflictDoNothing();
}
