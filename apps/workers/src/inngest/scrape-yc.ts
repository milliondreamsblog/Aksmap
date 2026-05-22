import { scrapeYc, type ScrapeResult } from "@job-hunter/scrapers";
import { inngest } from "./client.js";
import { ingestScrapeResult } from "../lib/ingest.js";
import { logger } from "../lib/logger.js";

export const scrapeYcJob = inngest.createFunction(
  {
    id: "scrape-yc",
    name: "Scrape YC workatastartup",
    concurrency: { limit: 1 },
    retries: 3,
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const result = await step.run("fetch-yc", async () => {
      logger.info("Starting YC scrape");
      return scrapeYc();
    });

    if (result.leads.length === 0) {
      logger.warn("YC returned zero leads — possible API change");
      return { source: "yc", candidates: 0, leadsCreated: 0 };
    }

    const stats = await step.run("ingest-yc", async () =>
      // step.run serializes through JSON; rehydrate via cast.
      // ingestScrapeResult is forgiving on scrapedAt (re-wraps in new Date()).
      ingestScrapeResult(result as unknown as ScrapeResult),
    );

    await step.sendEvent("emit-completed", {
      name: "scraper/source.completed",
      data: {
        source: "yc",
        candidates: result.leads.length,
        companiesUpserted: stats.companiesUpserted,
        leadsCreated: stats.leadsCreated,
        errors: stats.errors,
      },
    });

    return {
      source: "yc",
      candidates: result.leads.length,
      leadsCreated: stats.leadsCreated,
      leadsSkipped: stats.leadsSkipped,
    };
  },
);
