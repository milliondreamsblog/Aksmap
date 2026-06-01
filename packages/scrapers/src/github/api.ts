import { fetchText, fetchJson } from "../utils/http.js";

export interface TrendingRepo {
  owner: string;
  repo: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  starsToday: number;
  url: string;
}

export interface GithubOrg {
  login: string;
  name: string | null;
  description: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  followers: number;
  accountType: "Organization" | "User";
  company: string | null;
}

const TRENDING_URL = "https://github.com/trending";

export async function fetchTrending(
  opts: { language?: string; since?: "daily" | "weekly" | "monthly" } = {},
): Promise<TrendingRepo[]> {
  const params = new URLSearchParams();
  if (opts.language) params.set("language", opts.language);
  if (opts.since) params.set("since", opts.since);

  const url = params.toString()
    ? `${TRENDING_URL}?${params.toString()}`
    : TRENDING_URL;

  const html = await fetchText(url);
  return parseTrendingHtml(html);
}

function parseTrendingHtml(html: string): TrendingRepo[] {
  const repos: TrendingRepo[] = [];
  const articleRe = /<article class="Box-row">([\s\S]*?)<\/article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRe.exec(html)) !== null) {
    const block = match[1] ?? "";

    const repoLinkRe = /<h2[^>]*>[\s\S]*?<a\s+href="\/([^"]+)"/;
    const repoMatch = repoLinkRe.exec(block);
    if (!repoMatch?.[1]) continue;

    const [owner, repo] = repoMatch[1].split("/");
    if (!owner || !repo) continue;

    const descRe = /<p class="col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/;
    const descMatch = descRe.exec(block);
    const description = descMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "";

    const langRe = /itemprop="programmingLanguage"[^>]*>([^<]+)/;
    const langMatch = langRe.exec(block);
    const language = langMatch?.[1]?.trim() ?? null;

    const starsRe = /href="\/[^"]+\/stargazers"[^>]*>\s*([\d,]+)/;
    const starsMatch = starsRe.exec(block);
    const stars = starsMatch?.[1]
      ? parseInt(starsMatch[1].replace(/,/g, ""), 10)
      : 0;

    const forksRe = /href="\/[^"]+\/forks"[^>]*>\s*([\d,]+)/;
    const forksMatch = forksRe.exec(block);
    const forks = forksMatch?.[1]
      ? parseInt(forksMatch[1].replace(/,/g, ""), 10)
      : 0;

    const todayRe = /([\d,]+)\s+stars\s+today/;
    const todayMatch = todayRe.exec(block);
    const starsToday = todayMatch?.[1]
      ? parseInt(todayMatch[1].replace(/,/g, ""), 10)
      : 0;

    repos.push({
      owner,
      repo,
      description,
      language,
      stars,
      forks,
      starsToday,
      url: `https://github.com/${owner}/${repo}`,
    });
  }

  return repos;
}

export async function fetchOrgInfo(login: string): Promise<GithubOrg | null> {
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `https://api.github.com/orgs/${login}`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    return {
      login: String(data["login"] ?? login),
      name: data["name"] ? String(data["name"]) : null,
      description: data["description"] ? String(data["description"]) : null,
      blog: data["blog"] ? String(data["blog"]) : null,
      location: data["location"] ? String(data["location"]) : null,
      email: data["email"] ? String(data["email"]) : null,
      twitterUsername: data["twitter_username"]
        ? String(data["twitter_username"])
        : null,
      publicRepos: Number(data["public_repos"] ?? 0),
      followers: Number(data["followers"] ?? 0),
      accountType: "Organization",
      company: null,
    };
  } catch {
    return null;
  }
}

export async function fetchUserInfo(
  login: string,
): Promise<GithubOrg | null> {
  try {
    const data = await fetchJson<Record<string, unknown>>(
      `https://api.github.com/users/${login}`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );
    return {
      login: String(data["login"] ?? login),
      name: data["name"] ? String(data["name"]) : null,
      description: data["bio"] ? String(data["bio"]) : null,
      blog: data["blog"] ? String(data["blog"]) : null,
      location: data["location"] ? String(data["location"]) : null,
      email: data["email"] ? String(data["email"]) : null,
      twitterUsername: data["twitter_username"]
        ? String(data["twitter_username"])
        : null,
      publicRepos: Number(data["public_repos"] ?? 0),
      followers: Number(data["followers"] ?? 0),
      accountType: String(data["type"] ?? "User") === "Organization"
        ? "Organization"
        : "User",
      company: data["company"] ? String(data["company"]) : null,
    };
  } catch {
    return null;
  }
}
