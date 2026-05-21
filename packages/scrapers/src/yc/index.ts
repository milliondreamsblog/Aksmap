import { config } from "@job-hunter/icp";
import type { ScrapeResult, ScrapedLead, ScrapedCompany } from "../types.js";
import { canonicalDomain, geoFromLocation } from "../utils/domain.js";
import { matchesActiveGeo } from "../utils/geo.js";
import { fetchYcCompanies, type YcCompany } from "./api.js";

function pickActiveGeoLocation(locations: string[]): string | undefined {
  for (const loc of locations) {
    if (matchesActiveGeo(loc) !== null) return loc;
  }
  return locations[0];
}

function ycCompanyToScraped(c: YcCompany): ScrapedCompany {
  const isAi =
    c.industries.some((i) => /\bai\b|machine learning|ml/i.test(i)) ||
    c.tags.some((t) => /\bai\b|ml|llm|gen[\- ]?ai/i.test(t));

  const primaryLocation = pickActiveGeoLocation(c.locations);

  return {
    domain: canonicalDomain(c.website),
    name: c.name,
    description: c.oneLiner ?? undefined,
    geo: geoFromLocation(primaryLocation),
    hqLocation: primaryLocation,
    headcount: c.teamSize ?? undefined,
    industry: c.industries[0],
    isAiCompany: isAi,
    careersUrl: `https://www.workatastartup.com/companies/${c.slug}`,
    websiteUrl: c.website ?? undefined,
  };
}

export async function scrapeYc(): Promise<ScrapeResult> {
  const companies = await fetchYcCompanies({
    isHiring: true,
    maxPages: 20,
  });

  const leads: ScrapedLead[] = [];
  for (const c of companies) {
    if (c.status !== "Active") continue;

    const hasActiveGeo = c.locations.some(
      (loc) => matchesActiveGeo(loc) !== null,
    );
    if (!hasActiveGeo) continue;

    if (
      config.hardFilters.maxHeadcount !== null &&
      c.teamSize !== null &&
      c.teamSize !== undefined &&
      c.teamSize > config.hardFilters.maxHeadcount
    )
      continue;

    leads.push({
      company: ycCompanyToScraped(c),
      sourceUrl: `https://www.workatastartup.com/companies/${c.slug}`,
      rawPayload: c,
    });
  }

  return {
    source: "yc",
    scrapedAt: new Date(),
    leads,
    errors: [],
  };
}
