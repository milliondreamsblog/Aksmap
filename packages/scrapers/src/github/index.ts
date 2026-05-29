import type { ScrapeResult, ScrapeError, ScrapedLead, ScrapedCompany } from "../types.js";
import { canonicalDomain, geoFromLocation } from "../utils/domain.js";
import { fetchTrending, fetchOrgInfo, fetchUserInfo, type TrendingRepo, type GithubOrg } from "./api.js";
import { sleep } from "../utils/http.js";

const AI_LANGUAGES = new Set([
  "Python",
  "Jupyter Notebook",
  "Rust",
  "C++",
  "CUDA",
]);

const AI_KEYWORDS =
  /\b(ai|ml|llm|gpt|transformer|diffusion|neural|deep.?learn|machine.?learn|rag|vector|embedding|agent|langchain|openai|anthropic|hugging.?face)\b/i;

const SKIP_OWNERS = new Set([
  "github",
  "microsoft",
  "google",
  "facebook",
  "meta",
  "apple",
  "amazon",
  "aws",
  "vercel",
  "nodejs",
  "rust-lang",
  "golang",
  "python",
  "torvalds",
]);

function isAiRepo(repo: TrendingRepo): boolean {
  if (AI_LANGUAGES.has(repo.language ?? "")) {
    if (AI_KEYWORDS.test(repo.description)) return true;
    if (AI_KEYWORDS.test(repo.repo)) return true;
  }
  if (AI_KEYWORDS.test(repo.description)) return true;
  return false;
}

function isLikelyCompany(org: GithubOrg): boolean {
  if (org.blog && org.blog.length > 5) return true;
  if (org.email) return true;
  if (org.publicRepos > 3 && org.followers > 10) return true;
  return false;
}

async function repoToLead(
  repo: TrendingRepo,
): Promise<ScrapedLead | null> {
  if (SKIP_OWNERS.has(repo.owner.toLowerCase())) return null;

  // Try org first, then user
  let org = await fetchOrgInfo(repo.owner);
  if (!org) {
    org = await fetchUserInfo(repo.owner);
  }
  if (!org) return null;
  if (!isLikelyCompany(org)) return null;

  const domain = canonicalDomain(org.blog) ?? null;
  const geo = geoFromLocation(org.location);
  const isAi = isAiRepo(repo);

  const company: ScrapedCompany = {
    domain,
    name: org.name ?? org.login,
    description: org.description ?? repo.description,
    geo,
    hqLocation: org.location ?? undefined,
    isAiCompany: isAi,
    websiteUrl: org.blog ?? undefined,
  };

  return {
    company,
    sourceUrl: repo.url,
    rawPayload: {
      owner: repo.owner,
      repo: repo.repo,
      stars: repo.stars,
      starsToday: repo.starsToday,
      language: repo.language,
      orgFollowers: org.followers,
      twitterUsername: org.twitterUsername,
    },
  };
}

export async function scrapeGithubTrending(
  opts: { since?: "daily" | "weekly"; maxRepos?: number } = {},
): Promise<ScrapeResult> {
  const { since = "weekly", maxRepos = 50 } = opts;
  const errors: ScrapeError[] = [];

  let repos: TrendingRepo[] = [];
  try {
    repos = await fetchTrending({ since });
  } catch (err) {
    return {
      source: "github:trending",
      scrapedAt: new Date(),
      leads: [],
      errors: [{ reason: err instanceof Error ? err.message : String(err) }],
    };
  }

  repos = repos.slice(0, maxRepos);

  const leads: ScrapedLead[] = [];
  const seenOwners = new Set<string>();

  for (const repo of repos) {
    if (seenOwners.has(repo.owner.toLowerCase())) continue;
    seenOwners.add(repo.owner.toLowerCase());

    try {
      const lead = await repoToLead(repo);
      if (lead) leads.push(lead);
    } catch (err) {
      errors.push({
        url: repo.url,
        reason: err instanceof Error ? err.message : String(err),
      });
    }

    // Rate limit: GitHub API allows 60 req/hr unauthenticated
    await sleep(1200);
  }

  return {
    source: "github:trending",
    scrapedAt: new Date(),
    leads,
    errors,
  };
}
