import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";

export const scrapeCareersJob = inngest.createFunction(
  {
    id: "scrape-careers",
    name: "Scrape company careers pages",
    concurrency: { limit: 1 },
    retries: 1,
  },
  { cron: "0 4 * * *" },
  async ({ step }) => {
    await step.run("placeholder", async () => {
      logger.info("scrape-careers: stub — full impl in Prompt 5");
    });
    return { status: "placeholder" };
  },
);
