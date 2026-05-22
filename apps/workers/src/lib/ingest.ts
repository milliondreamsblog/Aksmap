import { db, companies, leads, events } from "@job-hunter/db";
import type { ScrapeResult, ScrapedLead } from "@job-hunter/scrapers";
import { inngest } from "../inngest/client.js";
import { logger } from "./logger.js";

export interface IngestStats {
  companiesUpserted: number;
  leadsCreated: number;
  leadsSkipped: number;
  errors: number;
}

function inferGeoFromSource(source: string): string | null {
  if (/inc42|yourstory|indianstartupnews|startuptalky|entrackr/.test(source)) {
    return "india";
  }
  if (/e27|techinasia|vulcanpost|dealstreetasia/.test(source)) {
    return "singapore_sea";
  }
  if (/techcrunch/.test(source)) {
    return null;
  }
  return null;
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
      const companyId = await upsertCompany(scraped, result.source);
      const leadId = await insertLead(scraped, companyId, result.source);
      stats.companiesUpserted++;

      if (leadId) {
        stats.leadsCreated++;
        await inngest.send({
          name: "lead/created",
          data: { leadId, source: result.source },
        });
      } else {
        // Insert was deduped by leads_dedup_idx — already processed earlier
        stats.leadsSkipped++;
      }
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

async function upsertCompany(
  scraped: ScrapedLead,
  source: string,
): Promise<string> {
  const c = scraped.company;
  if (!c.domain) throw new Error("upsertCompany requires a domain");

  const geo = c.geo ?? inferGeoFromSource(source);

  const [row] = await db
    .insert(companies)
    .values({
      domain: c.domain,
      name: c.name,
      description: c.description,
      geo,
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
): Promise<string | null> {
  const result = await db
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
    .onConflictDoNothing()
    .returning({ id: leads.id });

  return result[0]?.id ?? null;
}
