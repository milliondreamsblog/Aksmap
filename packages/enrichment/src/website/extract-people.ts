import * as cheerio from "cheerio";
import type { CandidatePerson } from "../types.js";

const ROLE_KEYWORDS = [
  "CEO",
  "Founder",
  "Co-Founder",
  "Cofounder",
  "Co Founder",
  "CTO",
  "COO",
  "CPO",
  "Chief Executive",
  "Chief Technology",
  "Chief Product",
  "President",
];
const ROLE_REGEX = new RegExp(
  `\\b(${ROLE_KEYWORDS.join("|").replace(/\s/g, "[\\s\\-]?")})\\b`,
  "i",
);

const NAME_REGEX = /\b([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2})\b/;

// Capitalised phrases that match NAME_REGEX but aren't people — navigation
// labels, job titles, and organisation names. If any word here appears, the
// phrase is rejected. Precision over recall: a false person yields a bogus
// email (chief@, immersion@), so we'd rather fall back to a generic inbox.
const NON_NAME_WORDS = new Set([
  // nav / boilerplate
  "our", "about", "contact", "privacy", "terms", "cookie", "read", "learn",
  "get", "sign", "log", "the", "home", "view", "all", "welcome", "story",
  "mission", "vision", "values", "news", "blog", "careers", "pricing",
  "login", "demo", "more", "message", "menu", "search", "follow",
  // titles
  "chief", "executive", "officer", "president", "vice", "founder",
  "cofounder", "co", "director", "manager", "head", "lead", "board",
  "member", "partner", "advisor", "ceo", "cto", "coo", "cfo", "cmo", "cpo",
  "vp", "technology", "technical", "product", "operating", "operations",
  "clinical", "financial", "marketing", "revenue", "engineering", "design",
  // org tokens / suffixes
  "corp", "inc", "llc", "ltd", "labs", "lab", "ai", "ml", "technologies",
  "systems", "solutions", "software", "machines", "ventures", "capital",
  "partners", "group", "foundation", "company", "industries", "industrial",
  "robotics", "medical", "space", "health", "studio", "studios", "works",
  "global", "international", "wizard", "models", "language", "large", "safety",
]);

function looksLikeName(name: string): boolean {
  const words = name.toLowerCase().split(/\s+/);
  return !words.some((w) => NON_NAME_WORDS.has(w));
}

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
    if (!looksLikeName(name)) continue;
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

  // Personal LinkedIn profiles (linkedin.com/in/...) are a strong people
  // signal even when no role keyword is nearby. Company pages (/company/)
  // are excluded by matching /in/ only.
  $("a[href*='linkedin.com/in/']").each((_, el) => {
    if (candidates.length >= 8) return;
    const text = $(el).text().trim();
    const nameMatch = text.match(NAME_REGEX);
    if (!nameMatch?.[1]) return;
    const name = nameMatch[1];
    if (!looksLikeName(name)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ name, source: "html" });
  });

  return candidates;
}

const PEOPLE_PATH_REGEX =
  /(team|about|people|leadership|founders?|our-story|who-we-are|company)/i;

// Find same-host links that likely lead to a team / about / leadership page,
// where named people are usually listed (the homepage rarely lists them).
export function findPeoplePageLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const found = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const text = $(el).text();
    if (!PEOPLE_PATH_REGEX.test(href) && !PEOPLE_PATH_REGEX.test(text)) return;
    try {
      const u = new URL(href, base);
      if (u.hostname !== base.hostname) return;
      u.hash = "";
      found.add(u.toString());
    } catch {
      // unparseable href — skip
    }
  });

  return Array.from(found).slice(0, 3);
}
