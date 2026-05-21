import type { ScrapeResult, ScrapedLead, ScrapeError } from "../types.js";
import { canonicalDomain } from "../utils/domain.js";
import { fetchText } from "../utils/http.js";
import { extractJobsFromHtml } from "./parsers.js";

export async function scrapeCareersPage(opts: {
  careersUrl: string;
  companyName: string;
  companyDomain: string | null;
}): Promise<ScrapeResult> {
  const errors: ScrapeError[] = [];
  let html: string;

  try {
    html = await fetchText(opts.careersUrl);
  } catch (err) {
    return {
      source: `careers:${canonicalDomain(opts.careersUrl) ?? "unknown"}`,
      scrapedAt: new Date(),
      leads: [],
      errors: [
        {
          url: opts.careersUrl,
          reason: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }

  const roles = extractJobsFromHtml(html, opts.careersUrl);

  const leads: ScrapedLead[] = roles.map((role) => ({
    company: {
      domain: opts.companyDomain,
      name: opts.companyName,
      careersUrl: opts.careersUrl,
    },
    role,
    sourceUrl: role.url,
    rawPayload: { role, scrapedFromCareersUrl: opts.careersUrl },
  }));

  return {
    source: `careers:${canonicalDomain(opts.careersUrl) ?? "unknown"}`,
    scrapedAt: new Date(),
    leads,
    errors,
  };
}
