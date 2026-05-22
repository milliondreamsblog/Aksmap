import * as cheerio from "cheerio";

const CAREERS_LINK_PATTERNS = [
  /\b(careers?|jobs?|hiring|join[- ]us|work[- ]with[- ]us|open[- ]roles?)\b/i,
];

const HIRING_TEXT_PATTERNS = [
  /\bwe(['']| are| re)\s+hiring\b/i,
  /\bjoin\s+(our|the)\s+team\b/i,
  /\bopen\s+(roles?|positions?)\b/i,
  /\bnow\s+hiring\b/i,
];

export interface HiringSignalResult {
  hiringSignal: boolean;
  careersUrl?: string;
}

export function detectHiringSignal(
  html: string,
  baseUrl: string,
): HiringSignalResult {
  const $ = cheerio.load(html);
  let careersUrl: string | undefined;

  $("a[href]").each((_, el) => {
    if (careersUrl) return;
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (!href) return;
    if (CAREERS_LINK_PATTERNS.some((re) => re.test(text) || re.test(href))) {
      try {
        careersUrl = new URL(href, baseUrl).toString();
      } catch {
        // ignore bad URL
      }
    }
  });

  const bodyText = $("body").text();
  const explicitHiring = HIRING_TEXT_PATTERNS.some((re) => re.test(bodyText));

  return {
    hiringSignal: explicitHiring || careersUrl !== undefined,
    careersUrl,
  };
}
