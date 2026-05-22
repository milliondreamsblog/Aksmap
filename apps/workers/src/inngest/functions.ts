import { scrapeYcJob } from "./scrape-yc.js";
import { scrapeRssJob } from "./scrape-rss.js";
import { scrapeCareersJob } from "./scrape-careers.js";

export const functions = [scrapeYcJob, scrapeRssJob, scrapeCareersJob];
