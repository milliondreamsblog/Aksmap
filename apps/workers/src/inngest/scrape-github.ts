import { scrapeGithubTrending, type ScrapeResult } from "@job-hunter/scrapers";
import { inngest } from "./client.js";
import { ingestScrapeResult } from "../lib/ingest.js";
import { logger } from "../lib/logger.js";

export const scrapeGithubJob = inngest.createFunction(
  {
    id: "scrape-github-trending",
    name: "Scrape GitHub Trending",
    concurrency: { limit: 1 },
    retries: 2,
  },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    const result = await step.run("fetch-github-trending", async () => {
      logger.info("Starting GitHub Trending scrape");
      return scrapeGithubTrending({ since: "weekly", maxRepos: 50 });
    });

    if (result.leads.length === 0) {
      logger.warn("GitHub Trending returned zero leads", {
        errors: result.errors,
      });
      return { source: "github:trending", candidates: 0, leadsCreated: 0 };
    }

    const stats = await step.run("ingest-github", async () =>
      ingestScrapeResult(result as unknown as ScrapeResult),
    );

    await step.sendEvent("emit-completed", {
      name: "scraper/source.completed",
      data: {
        source: "github:trending",
        candidates: result.leads.length,
        companiesUpserted: stats.companiesUpserted,
        leadsCreated: stats.leadsCreated,
        errors: stats.errors,
      },
    });

    logger.info("GitHub Trending scrape completed", {
      candidates: result.leads.length,
      leadsCreated: stats.leadsCreated,
      leadsSkipped: stats.leadsSkipped,
    });

    return {
      source: "github:trending",
      candidates: result.leads.length,
      leadsCreated: stats.leadsCreated,
      leadsSkipped: stats.leadsSkipped,
    };
  },
);
