import type { Geo } from "@job-hunter/icp";

export function canonicalDomain(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  try {
    const withScheme = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(withScheme);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function geoFromLocation(
  location: string | null | undefined,
): Geo | undefined {
  if (!location) return undefined;
  const loc = location.toLowerCase();

  if (
    /\b(india|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|gurugram|gurgaon|noida)\b/.test(
      loc,
    )
  ) {
    return "india";
  }
  if (
    /\b(singapore|jakarta|indonesia|vietnam|hanoi|saigon|ho chi minh|thailand|bangkok|philippines|manila|malaysia|kuala lumpur)\b/.test(
      loc,
    )
  ) {
    return "singapore_sea";
  }
  if (
    /\b(usa|united states|san francisco|new york|nyc|seattle|boston|austin|los angeles|sf bay|silicon valley)\b/.test(
      loc,
    )
  ) {
    return "usa_remote";
  }
  if (
    /\b(london|uk|united kingdom|berlin|amsterdam|paris|dublin|stockholm|munich|zurich)\b/.test(
      loc,
    )
  ) {
    return "europe_uk";
  }
  if (/\b(tokyo|japan|seoul|korea|osaka|kyoto)\b/.test(loc)) {
    return "japan_korea";
  }
  return undefined;
}

export type DomainGeoHint = "india" | "sea" | "global";

const TLD_CANDIDATES: Record<DomainGeoHint, string[]> = {
  india: [".in", ".co", ".com", ".io", ".ai", ".tech"],
  sea: [".sg", ".com", ".co", ".io", ".ai", ".id", ".vn"],
  global: [".com", ".io", ".ai", ".co", ".dev", ".app"],
};

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(inc|llc|ltd|pvt|private|limited|technologies|technology|labs|the)\b\.?/g,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const PROBE_TIMEOUT_MS = 3000;
const PROBE_CONCURRENCY = 3;

export async function inferDomainFromName(
  name: string,
  geoHint: DomainGeoHint = "global",
): Promise<string | null> {
  const slug = nameToSlug(name);
  if (!slug || slug.length < 2 || slug.length > 30) return null;

  const tlds = TLD_CANDIDATES[geoHint];
  const candidates = tlds.map((tld) => `${slug}${tld}`);

  return probeFirst(candidates);
}

async function probeFirst(domains: string[]): Promise<string | null> {
  for (let i = 0; i < domains.length; i += PROBE_CONCURRENCY) {
    const batch = domains.slice(i, i + PROBE_CONCURRENCY);
    const results = await Promise.all(batch.map(probeDomain));
    const hit = results.find((d) => d !== null);
    if (hit) return hit;
  }
  return null;
}

async function probeDomain(domain: string): Promise<string | null> {
  const url = `https://${domain}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "JobHunterBot/0.1 (domain-probe)",
      },
    });
    return res.status < 400 ? domain : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
