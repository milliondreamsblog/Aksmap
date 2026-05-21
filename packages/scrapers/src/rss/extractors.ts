import { canonicalDomain } from "../utils/domain.js";

const FUNDING_STAGE_PATTERNS: Array<{ pattern: RegExp; stage: string }> = [
  { pattern: /\bpre-?seed\b/i, stage: "pre_seed" },
  { pattern: /\bseed\b/i, stage: "seed" },
  { pattern: /\bseries\s*a\b/i, stage: "series_a" },
  { pattern: /\bseries\s*b\b/i, stage: "series_b" },
  { pattern: /\bseries\s*c\b/i, stage: "series_c" },
  { pattern: /\bbridge\b/i, stage: "bridge" },
];

export function extractCompanyNameFromTitle(title: string): string | null {
  const m1 = title.match(
    /^([A-Z][\w\s&.,-]{1,60}?)\s+(?:raises|closes|secures|bags|nets|picks up)\s+\$/i,
  );
  if (m1?.[1]) return m1[1].trim().replace(/,\s*$/, "");

  const m2 = title.match(/^([A-Z][\w\s&.-]{1,40}),\s+(?:a|an)\s+/);
  if (m2?.[1]) return m2[1].trim();

  return null;
}

export function extractFundingStage(text: string): string | undefined {
  for (const { pattern, stage } of FUNDING_STAGE_PATTERNS) {
    if (pattern.test(text)) return stage;
  }
  return undefined;
}

export function extractFundingAmount(text: string): string | undefined {
  const m = text.match(/\$\s?([\d.]+)\s?([mMkKbB]n?|million|billion|thousand)/);
  return m ? m[0].replace(/\s+/g, "") : undefined;
}

export function extractCompanyUrl(
  description: string | undefined,
  sourceDomain: string,
): string | null {
  if (!description) return null;
  const hrefs = [
    ...description.matchAll(/<a[^>]+href=["']([^"']+)["']/gi),
  ].map((m) => m[1]);
  for (const href of hrefs) {
    if (!href) continue;
    const domain = canonicalDomain(href);
    if (!domain || domain === sourceDomain) continue;
    if (
      /^(twitter|x|linkedin|facebook|instagram|youtube|crunchbase)\.com$/.test(
        domain,
      )
    )
      continue;
    return href;
  }
  return null;
}
