import type { ScrapeResult, ScrapedLead, ScrapeError } from "../types.js";
import { canonicalDomain } from "../utils/domain.js";
import { fetchRssFeed, type RssItem } from "../utils/rss.js";
import {
  extractCompanyNameFromTitle,
  extractFundingStage,
  extractFundingAmount,
  extractCompanyUrl,
} from "./extractors.js";

export async function scrapeRssFeed(feedUrl: string): Promise<ScrapeResult> {
  const sourceDomain = canonicalDomain(feedUrl) ?? "unknown";
  const items = await fetchRssFeed(feedUrl);

  const leads: ScrapedLead[] = [];
  const errors: ScrapeError[] = [];

  for (const item of items) {
    try {
      const lead = rssItemToLead(item, sourceDomain);
      if (lead) leads.push(lead);
    } catch (err) {
      errors.push({
        url: item.link,
        reason: err instanceof Error ? err.message : String(err),
        rawSnippet: item.title?.slice(0, 200),
      });
    }
  }

  return {
    source: `rss:${sourceDomain}`,
    scrapedAt: new Date(),
    leads,
    errors,
  };
}

function rssItemToLead(
  item: RssItem,
  sourceDomain: string,
): ScrapedLead | null {
  const fullText = `${item.title} ${item.description ?? ""} ${item.content ?? ""}`;
  if (
    !/\b(raises|raised|closes|closed|secures|secured|funding|seed|series|bags|nets)\b/i.test(
      fullText,
    )
  ) {
    return null;
  }

  const name = extractCompanyNameFromTitle(item.title);
  if (!name) return null;

  const companyUrl = extractCompanyUrl(
    item.description ?? item.content,
    sourceDomain,
  );
  const domain = canonicalDomain(companyUrl);

  return {
    company: {
      domain,
      name,
      websiteUrl: companyUrl ?? undefined,
      fundingStage: extractFundingStage(fullText),
      lastFundingAmount: extractFundingAmount(fullText),
      lastFundingDate: item.pubDate,
    },
    sourceUrl: item.link,
    rawPayload: item,
  };
}
