import * as cheerio from "cheerio";
import type { CandidatePerson } from "../types.js";

const ROLE_KEYWORDS = [
  "CEO",
  "Founder",
  "Co-Founder",
  "CTO",
  "COO",
  "Chief Executive",
  "Chief Technology",
];
const ROLE_REGEX = new RegExp(
  `\\b(${ROLE_KEYWORDS.join("|").replace(/\s/g, "[\\s\\-]?")})\\b`,
  "i",
);

const NAME_REGEX = /\b([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2})\b/;

interface JsonLdPerson {
  "@type"?: string;
  name?: string;
  jobTitle?: string;
}

export function extractPeople(html: string): CandidatePerson[] {
  const $ = cheerio.load(html);
  const candidates: CandidatePerson[] = [];
  const seen = new Set<string>();

  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const json = JSON.parse($(el).text()) as unknown;
      const entries: unknown[] = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        const p = entry as JsonLdPerson;
        if (p["@type"] === "Person" && p.name) {
          const key = p.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({
              name: p.name,
              role: p.jobTitle,
              source: "structured-data",
            });
          }
        }
      }
    } catch {
      // bad JSON, skip
    }
  });

  const textBlocks = $("p, li, h2, h3, h4, .team, .founder, .about").toArray();
  for (const el of textBlocks) {
    const text = $(el).text().slice(0, 500);
    if (!ROLE_REGEX.test(text)) continue;

    const nameMatch = text.match(NAME_REGEX);
    if (!nameMatch?.[1]) continue;
    const name = nameMatch[1];
    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    const roleMatch = text.match(ROLE_REGEX);
    seen.add(key);
    candidates.push({
      name,
      role: roleMatch?.[1],
      source: "html",
    });

    if (candidates.length >= 5) break;
  }

  return candidates;
}
