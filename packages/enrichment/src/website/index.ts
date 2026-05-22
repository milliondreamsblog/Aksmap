import type { WebsiteEnrichment } from "../types.js";
import { fetchPage } from "./fetch.js";
import { detectTechStack } from "./tech-stack.js";
import { detectHiringSignal } from "./hiring-signals.js";
import { extractPeople } from "./extract-people.js";

export async function enrichFromWebsite(
  domain: string,
): Promise<WebsiteEnrichment | null> {
  const homepageUrl = `https://${domain}`;
  const homepage = await fetchPage(homepageUrl);
  if (!homepage) return null;

  const tech = detectTechStack(homepage.html, homepage.headers);
  const hiring = detectHiringSignal(homepage.html, homepage.finalUrl);
  const people = extractPeople(homepage.html);
  const about = extractAboutSnippet(homepage.html);

  return {
    techStack: tech.techStack,
    isAiCompany: tech.isAiCompany,
    hiringSignal: hiring.hiringSignal,
    careersUrl: hiring.careersUrl,
    about,
    candidatePeople: people,
  };
}

function extractAboutSnippet(html: string): string | undefined {
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,300})["']/i,
  );
  return metaDesc?.[1];
}
