import * as cheerio from "cheerio";
import { classifyRole, isJuniorFriendly } from "../utils/role.js";
import type { ScrapedRole } from "../types.js";

interface JsonLdJobPosting {
  "@type"?: string;
  title?: string;
  url?: string;
  description?: string;
  datePosted?: string;
}

export function extractJobsFromHtml(
  html: string,
  baseUrl: string,
): ScrapedRole[] {
  const $ = cheerio.load(html);
  const roles: ScrapedRole[] = [];
  const seenUrls = new Set<string>();

  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const json = JSON.parse($(el).text()) as unknown;
      const postings: unknown[] = Array.isArray(json) ? json : [json];
      for (const p of postings) {
        const posting = p as JsonLdJobPosting;
        if (
          posting["@type"] === "JobPosting" &&
          posting.title &&
          posting.url
        ) {
          const url = absoluteUrl(posting.url, baseUrl);
          if (seenUrls.has(url)) continue;
          seenUrls.add(url);
          roles.push({
            title: posting.title,
            type: classifyRole(posting.title, posting.description ?? ""),
            url,
            isJuniorFriendly: isJuniorFriendly(
              posting.title,
              posting.description ?? "",
            ),
            postedAt: posting.datePosted
              ? new Date(posting.datePosted)
              : undefined,
          });
        }
      }
    } catch {
      // Bad JSON-LD, skip
    }
  });

  if (roles.length > 0) return roles;

  $("a[href]").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if (!href || !text) return;
    if (!/\b(engineer|developer|founding|intern)\b/i.test(text)) return;

    const url = absoluteUrl(href, baseUrl);
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const roleType = classifyRole(text);
    if (!roleType) return;

    roles.push({
      title: text,
      type: roleType,
      url,
      isJuniorFriendly: isJuniorFriendly(text),
    });
  });

  return roles;
}

function absoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}
