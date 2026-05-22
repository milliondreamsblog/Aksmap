import type { ScrapeResult, ScrapedLead, ScrapeError } from "../types.js";
import {
  canonicalDomain,
  inferDomainFromName,
  type DomainGeoHint,
} from "../utils/domain.js";
import { fetchRssFeed, type RssItem } from "../utils/rss.js";
import {
  extractCompanyNameFromTitle,
  extractFundingStage,
  extractFundingAmount,
  extractCompanyUrl,
} from "./extractors.js";

function geoHintFromSourceDomain(sourceDomain: string): DomainGeoHint {
  if (/inc42|yourstory|indianstartupnews|startuptalky|entrackr/.test(sourceDomain)) {
    return "india";
  }
  if (/e27|techinasia|vulcanpost|dealstreetasia/.test(sourceDomain)) {
    return "sea";
  }
  return "global";
}

export async function scrapeRssFeed(feedUrl: string): Promise<ScrapeResult> {
  const sourceDomain = canonicalDomain(feedUrl) ?? "unknown";
  const geoHint = geoHintFromSourceDomain(sourceDomain);
  const items = await fetchRssFeed(feedUrl);

  const leads: ScrapedLead[] = [];
  const errors: ScrapeError[] = [];

  for (const item of items) {
    try {
      const lead = await rssItemToLead(item, sourceDomain, geoHint);
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

async function rssItemToLead(
  item: RssItem,
  sourceDomain: string,
  geoHint: DomainGeoHint,
): Promise<ScrapedLead | null> {
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
  let domain = canonicalDomain(companyUrl);

  if (!domain) {
    domain = await inferDomainFromName(name, geoHint);
  }

  return {
    company: {
      domain,
      name,
      websiteUrl: companyUrl ?? (domain ? `https://${domain}` : undefined),
      fundingStage: extractFundingStage(fullText),
      lastFundingAmount: extractFundingAmount(fullText),
      lastFundingDate: item.pubDate,
    },
    sourceUrl: item.link,
    rawPayload: item,
  };
}
