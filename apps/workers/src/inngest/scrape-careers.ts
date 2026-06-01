import { db, companies } from "@job-hunter/db";
import { isNotNull } from "drizzle-orm";
import { scrapeCareersPage, type ScrapeResult } from "@job-hunter/scrapers";
import { inngest } from "./client.js";
import { ingestScrapeResult } from "../lib/ingest.js";
import { logger } from "../lib/logger.js";

// Cap companies processed per run so one cron tick can't hammer hundreds of
// sites in a single pass. Stalest-refreshed companies go first.
const MAX_COMPANIES_PER_RUN = 100;

interface CompanyStats {
  companyId: string;
  careersUrl: string;
  source: string;
  candidates: number;
  companiesUpserted: number;
  leadsCreated: number;
  leadsSkipped: number;
  errors: number;
  failed: boolean;
}

export const scrapeCareersJob = inngest.createFunction(
  {
    id: "scrape-careers",
    name: "Scrape company careers pages",
    concurrency: { limit: 1 },
    retries: 1,
  },
  { cron: "0 4 * * *" },
  async ({ step }) => {
    const targets = await step.run("load-companies", async () => {
      const rows = await db.query.companies.findMany({
        where: isNotNull(companies.careersUrl),
        columns: { id: true, name: true, domain: true, careersUrl: true },
        orderBy: (c, { asc }) => asc(c.updatedAt),
        limit: MAX_COMPANIES_PER_RUN,
      });
      // Log inside the step so it runs once. Inngest replays the handler on
      // every step boundary, so any logging outside a step repeats per step.
      logger.info("scrape-careers: loaded companies with careers URLs", {
        count: rows.length,
      });
      if (rows.length === MAX_COMPANIES_PER_RUN) {
        logger.warn("scrape-careers: hit per-run company cap", {
          cap: MAX_COMPANIES_PER_RUN,
        });
      }
      return rows;
    });

    if (targets.length === 0) {
      return { companies: 0, candidates: 0, leadsCreated: 0, failed: 0 };
    }

    const allStats: CompanyStats[] = [];

    for (const company of targets) {
      const careersUrl = company.careersUrl;
      if (!careersUrl) continue;

      const stats = await step.run(
        `scrape-careers-${company.id}`,
        async (): Promise<CompanyStats> => {
          try {
            const result = await scrapeCareersPage({
              careersUrl,
              companyName: company.name,
              companyDomain: company.domain,
            });
            const ingested = await ingestScrapeResult(
              result as unknown as ScrapeResult,
            );
            return {
              companyId: company.id,
              careersUrl,
              source: result.source,
              candidates: result.leads.length,
              ...ingested,
              failed: false,
            };
          } catch (err) {
            logger.error("Careers page scrape failed", {
              companyId: company.id,
              careersUrl,
              error: err instanceof Error ? err.message : String(err),
            });
            return {
              companyId: company.id,
              careersUrl,
              source: `careers:${careersUrl}`,
              candidates: 0,
              companiesUpserted: 0,
              leadsCreated: 0,
              leadsSkipped: 0,
              errors: 1,
              failed: true,
            };
          }
        },
      );

      allStats.push(stats);
    }

    const totals = allStats.reduce(
      (acc, s) => ({
        candidates: acc.candidates + s.candidates,
        companiesUpserted: acc.companiesUpserted + s.companiesUpserted,
        leadsCreated: acc.leadsCreated + s.leadsCreated,
        leadsSkipped: acc.leadsSkipped + s.leadsSkipped,
        failed: acc.failed + (s.failed ? 1 : 0),
      }),
      {
        candidates: 0,
        companiesUpserted: 0,
        leadsCreated: 0,
        leadsSkipped: 0,
        failed: 0,
      },
    );

    await step.sendEvent("emit-completed", {
      name: "scraper/source.completed",
      data: {
        source: "careers",
        candidates: totals.candidates,
        companiesUpserted: totals.companiesUpserted,
        leadsCreated: totals.leadsCreated,
        errors: totals.failed,
      },
    });

    logger.info("scrape-careers completed", {
      companies: allStats.length,
      ...totals,
    });

    return { companies: allStats.length, ...totals };
  },
);
