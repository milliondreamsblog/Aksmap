import type { WebsiteEnrichment } from "../types.js";
import { fetchPage } from "./fetch.js";
import { detectTechStack } from "./tech-stack.js";
import { detectHiringSignal } from "./hiring-signals.js";
import { extractPeople, findPeoplePageLinks } from "./extract-people.js";
import type { CandidatePerson } from "../types.js";

// Common team/about paths to try when the homepage doesn't link one directly.
const FALLBACK_PEOPLE_PATHS = ["/about", "/team", "/about-us"];

export async function enrichFromWebsite(
  domain: string,
): Promise<WebsiteEnrichment | null> {
  const homepageUrl = `https://${domain}`;
  const homepage = await fetchPage(homepageUrl);
  if (!homepage) return null;

  const tech = detectTechStack(homepage.html, homepage.headers);
  const hiring = detectHiringSignal(homepage.html, homepage.finalUrl);
  const about = extractAboutSnippet(homepage.html);

  const people = await collectPeople(domain, homepage.html, homepage.finalUrl);

  return {
    techStack: tech.techStack,
    isAiCompany: tech.isAiCompany,
    hiringSignal: hiring.hiringSignal,
    careersUrl: hiring.careersUrl,
    about,
    candidatePeople: people,
  };
}

// Named people are rarely on the homepage. Start there, then follow up to a
// few team/about pages (linked or guessed) and merge unique people.
async function collectPeople(
  domain: string,
  homepageHtml: string,
  homepageUrl: string,
): Promise<CandidatePerson[]> {
  const people = extractPeople(homepageHtml);
  const seen = new Set(people.map((p) => p.name.toLowerCase()));

  const linked = findPeoplePageLinks(homepageHtml, homepageUrl);
  const guesses = FALLBACK_PEOPLE_PATHS.map((p) => `https://${domain}${p}`);
  const toVisit = [...new Set([...linked, ...guesses])].slice(0, 3);

  for (const url of toVisit) {
    if (people.length >= 5) break;
    const page = await fetchPage(url);
    if (!page) continue;
    for (const person of extractPeople(page.html)) {
      const key = person.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      people.push(person);
    }
  }

  return people;
}

function extractAboutSnippet(html: string): string | undefined {
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,300})["']/i,
  );
  return metaDesc?.[1];
}
