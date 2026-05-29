import { scrapeHackerNews, type ScrapeResult } from "@job-hunter/scrapers";
import { inngest } from "./client.js";
import { ingestScrapeResult } from "../lib/ingest.js";
import { logger } from "../lib/logger.js";

export const scrapeHackernewsJob = inngest.createFunction(
  {
    id: "scrape-hackernews",
    name: "Scrape HN Who is Hiring",
    concurrency: { limit: 1 },
    retries: 2,
  },
  { cron: "0 6 1 * *" },
  async ({ step }) => {
    const result = await step.run("fetch-hn-who-is-hiring", async () => {
      logger.info("Starting HackerNews Who is Hiring scrape");
      return scrapeHackerNews({ maxComments: 300, filterByGeo: false });
    });

    if (result.leads.length === 0) {
      logger.warn("HN Who is Hiring returned zero leads", {
        errors: result.errors,
      });
      return { source: "hackernews", candidates: 0, leadsCreated: 0 };
    }

    const stats = await step.run("ingest-hn", async () =>
      ingestScrapeResult(result as unknown as ScrapeResult),
    );

    await step.sendEvent("emit-completed", {
      name: "scraper/source.completed",
      data: {
        source: "hackernews:who-is-hiring",
        candidates: result.leads.length,
        companiesUpserted: stats.companiesUpserted,
        leadsCreated: stats.leadsCreated,
        errors: stats.errors,
      },
    });

    logger.info("HN Who is Hiring scrape completed", {
      candidates: result.leads.length,
      leadsCreated: stats.leadsCreated,
      leadsSkipped: stats.leadsSkipped,
    });

    return {
      source: "hackernews:who-is-hiring",
      candidates: result.leads.length,
      leadsCreated: stats.leadsCreated,
      leadsSkipped: stats.leadsSkipped,
    };
  },
);
