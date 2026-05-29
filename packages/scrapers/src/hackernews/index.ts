import type { ScrapeResult, ScrapeError, ScrapedLead, ScrapedCompany, ScrapedRole } from "../types.js";
import { canonicalDomain, geoFromLocation, inferDomainFromName } from "../utils/domain.js";
import { classifyRole, isJuniorFriendly } from "../utils/role.js";
import { matchesActiveGeo } from "../utils/geo.js";
import { searchWhoIsHiring, fetchTopLevelComments, type HnItem } from "./api.js";

const HN_ITEM_URL = "https://news.ycombinator.com/item?id=";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p>/gi, "\n\n")
    .replace(/<a\s+href="([^"]*)"[^>]*>[^<]*<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

function extractUrls(html: string): string[] {
  const urls: string[] = [];
  const hrefRe = /<a\s+href="(https?:\/\/[^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

const COMPANY_LINE_RE =
  /^([^|]+)\|/;

const LOCATION_RE =
  /(?:location|based in|office(?:s)? in)[:\s]+([^|.\n]+)/i;

const REMOTE_RE = /\bremote\b/i;

const HEADCOUNT_RE = /(\d+)\s*(?:employee|engineer|people|person|team size)/i;

interface ParsedComment {
  companyName: string | null;
  roleTitle: string | null;
  location: string | null;
  isRemote: boolean;
  headcount: number | null;
  domain: string | null;
  urls: string[];
  text: string;
}

function parseComment(item: HnItem): ParsedComment | null {
  if (!item.text) return null;
  const text = stripHtml(item.text);
  const urls = extractUrls(item.text);

  const lines = text.split("\n").filter((l) => l.trim());
  const firstLine = lines[0] ?? "";

  // HN "Who is hiring" format: "Company Name | Location | Remote | ..."
  let companyName: string | null = null;
  const companyMatch = COMPANY_LINE_RE.exec(firstLine);
  if (companyMatch?.[1]) {
    companyName = companyMatch[1].trim();
    // Clean up common suffixes like "(https://example.com)"
    companyName = companyName.replace(/\s*\(https?:\/\/[^)]+\)\s*$/, "").trim();
  }

  if (!companyName || companyName.length > 60) return null;

  // Extract domain from URLs in the comment
  let domain: string | null = null;
  for (const url of urls) {
    const candidate = canonicalDomain(url);
    if (
      candidate &&
      !candidate.includes("ycombinator.com") &&
      !candidate.includes("lever.co") &&
      !candidate.includes("greenhouse.io") &&
      !candidate.includes("ashbyhq.com") &&
      !candidate.includes("workable.com") &&
      !candidate.includes("linkedin.com") &&
      !candidate.includes("twitter.com") &&
      !candidate.includes("x.com")
    ) {
      domain = candidate;
      break;
    }
  }

  // Location from first line pipes or body text
  let location: string | null = null;
  const pipes = firstLine.split("|").map((s) => s.trim());
  if (pipes.length >= 2) {
    const locCandidate = pipes[1];
    if (locCandidate && locCandidate.length < 60 && !/http/i.test(locCandidate)) {
      location = locCandidate;
    }
  }
  if (!location) {
    const locMatch = LOCATION_RE.exec(text);
    if (locMatch?.[1]) location = locMatch[1].trim();
  }

  const isRemote = REMOTE_RE.test(firstLine) || REMOTE_RE.test(text);

  const headcountMatch = HEADCOUNT_RE.exec(text);
  const headcount = headcountMatch?.[1] ? parseInt(headcountMatch[1], 10) : null;

  // Role from second line or body text
  let roleTitle: string | null = null;
  const roleLine = pipes.length >= 3 ? pipes.slice(2).join(" | ") : "";
  const roleFromPipes = extractRoleFromText(roleLine);
  const roleFromBody = extractRoleFromText(text);
  roleTitle = roleFromPipes ?? roleFromBody;

  return {
    companyName,
    roleTitle,
    location,
    isRemote,
    headcount,
    domain,
    urls,
    text,
  };
}

const ROLE_TITLE_RE =
  /(?:hiring|looking for|seeking|need)\s+(?:a(?:n)?\s+)?([^.!,\n]{5,60})/i;

function extractRoleFromText(text: string): string | null {
  const m = ROLE_TITLE_RE.exec(text);
  if (m?.[1]) {
    return m[1].trim().replace(/[.,!?]+$/, "");
  }
  return null;
}

function findCareersUrl(urls: string[]): string | undefined {
  const atsPatterns = [
    "lever.co",
    "greenhouse.io",
    "ashbyhq.com",
    "workable.com",
    "jobs.lever",
    "boards.greenhouse",
    "apply.workable",
    "careers",
    "jobs",
  ];
  for (const url of urls) {
    const lower = url.toLowerCase();
    if (atsPatterns.some((p) => lower.includes(p))) {
      return url;
    }
  }
  return undefined;
}

async function commentToLead(
  item: HnItem,
  storyId: number,
): Promise<ScrapedLead | null> {
  const parsed = parseComment(item);
  if (!parsed || !parsed.companyName) return null;

  // Try to get domain if not found in URLs
  let domain = parsed.domain;
  if (!domain) {
    domain = await inferDomainFromName(parsed.companyName, "global");
  }

  const geo = geoFromLocation(parsed.location);
  const isAi =
    /\b(ai|ml|llm|gen[\- ]?ai|machine learning|deep learning|nlp|computer vision|gpt|transformer|diffusion)\b/i.test(
      parsed.text,
    );

  const company: ScrapedCompany = {
    domain,
    name: parsed.companyName,
    description: parsed.text.slice(0, 300),
    geo,
    hqLocation: parsed.location ?? undefined,
    headcount: parsed.headcount ?? undefined,
    isAiCompany: isAi,
    careersUrl: findCareersUrl(parsed.urls),
  };

  let role: ScrapedRole | undefined;
  if (parsed.roleTitle) {
    const roleType = classifyRole(parsed.roleTitle, parsed.text);
    role = {
      title: parsed.roleTitle,
      type: roleType,
      url: `${HN_ITEM_URL}${item.id}`,
      isRemote: parsed.isRemote,
      isJuniorFriendly: isJuniorFriendly(
        parsed.roleTitle,
        parsed.text,
      ),
    };
  }

  return {
    company,
    role,
    sourceUrl: `${HN_ITEM_URL}${item.id}`,
    rawPayload: {
      hnId: item.id,
      storyId,
      by: item.by,
      time: item.time,
      text: parsed.text.slice(0, 2000),
    },
  };
}

export async function scrapeHackerNews(
  opts: { maxComments?: number; filterByGeo?: boolean } = {},
): Promise<ScrapeResult> {
  const { maxComments = 300, filterByGeo = false } = opts;
  const errors: ScrapeError[] = [];

  const storyId = await searchWhoIsHiring();
  if (!storyId) {
    return {
      source: "hackernews:who-is-hiring",
      scrapedAt: new Date(),
      leads: [],
      errors: [{ reason: "Could not find Who is hiring thread" }],
    };
  }

  const comments = await fetchTopLevelComments(storyId, maxComments);
  const leads: ScrapedLead[] = [];

  for (const comment of comments) {
    try {
      const lead = await commentToLead(comment, storyId);
      if (!lead) continue;

      if (filterByGeo && lead.company.hqLocation) {
        const matched = matchesActiveGeo(lead.company.hqLocation);
        if (!matched && !lead.role?.isRemote) continue;
      }

      leads.push(lead);
    } catch (err) {
      errors.push({
        url: `${HN_ITEM_URL}${comment.id}`,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    source: "hackernews:who-is-hiring",
    scrapedAt: new Date(),
    leads,
    errors,
  };
}
