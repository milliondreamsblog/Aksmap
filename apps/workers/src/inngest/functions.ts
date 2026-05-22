import { scrapeYcJob } from "./scrape-yc.js";
import { scrapeRssJob } from "./scrape-rss.js";
import { scrapeCareersJob } from "./scrape-careers.js";
import { enrichLeadJob } from "./enrich-lead.js";
import { scoreLeadJob } from "./score-lead.js";

export const functions = [
  scrapeYcJob,
  scrapeRssJob,
  scrapeCareersJob,
  enrichLeadJob,
  scoreLeadJob,
];
