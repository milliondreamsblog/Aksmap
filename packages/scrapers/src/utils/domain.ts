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
