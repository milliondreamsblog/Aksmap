import { activeFundingSources } from "@job-hunter/icp";
import { scrapeRssFeed } from "@job-hunter/scrapers";
import { inngest } from "./client.js";
import { ingestScrapeResult } from "../lib/ingest.js";
import { logger } from "../lib/logger.js";

interface SourceStats {
  feedUrl: string;
  source: string;
  candidates: number;
  companiesUpserted: number;
  leadsCreated: number;
  leadsSkipped: number;
  errors: number;
  failed: boolean;
}

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 60);
}

export const scrapeRssJob = inngest.createFunction(
  {
    id: "scrape-rss",
    name: "Scrape RSS funding feeds",
    concurrency: { limit: 1 },
    retries: 2,
  },
  { cron: "0 */2 * * *" },
  async ({ step }) => {
    const sources = activeFundingSources();
    logger.info("Starting RSS scrape", { sourceCount: sources.length });

    const allStats: SourceStats[] = [];

    for (const feedUrl of sources) {
      const sourceStats = await step.run(
        `scrape-${slugify(feedUrl)}`,
        async (): Promise<SourceStats> => {
          try {
            const result = await scrapeRssFeed(feedUrl);
            const stats = await ingestScrapeResult(result);
            return {
              feedUrl,
              source: result.source,
              candidates: result.leads.length,
              ...stats,
              failed: false,
            };
          } catch (err) {
            logger.error("RSS feed failed", {
              feedUrl,
              error: err instanceof Error ? err.message : String(err),
            });
            return {
              feedUrl,
              source: `rss:${feedUrl}`,
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

      allStats.push(sourceStats);
    }

    const totals = allStats.reduce(
      (acc, s) => ({
        candidates: acc.candidates + s.candidates,
        leadsCreated: acc.leadsCreated + s.leadsCreated,
        failedFeeds: acc.failedFeeds + (s.failed ? 1 : 0),
      }),
      { candidates: 0, leadsCreated: 0, failedFeeds: 0 },
    );

    return { ...totals, feeds: allStats.length };
  },
);
