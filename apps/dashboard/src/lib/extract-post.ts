export interface PostSource {
  platform: "twitter" | "linkedin";
  url: string;
  postId?: string;
  handle?: string;
}

export interface ExtractedPost {
  source: PostSource;
  posterName: string | null;
  companyName: string | null;
  roleTitle: string | null;
  postText: string;
  inferredDomain: string | null;
}

const TWITTER_RE =
  /^https?:\/\/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/i;

const LINKEDIN_RE =
  /^https?:\/\/(?:www\.)?linkedin\.com\/(posts|feed|pulse)\//i;

export function parsePostUrl(raw: string): PostSource | null {
  const url = raw.trim();
  const tw = TWITTER_RE.exec(url);
  if (tw) {
    return {
      platform: "twitter",
      url,
      handle: tw[1],
      postId: tw[2],
    };
  }
  const li = LINKEDIN_RE.exec(url);
  if (li) {
    return { platform: "linkedin", url };
  }
  return null;
}

export async function fetchTweetText(
  tweetUrl: string,
): Promise<{ text: string; authorName: string } | null> {
  const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      html?: string;
      author_name?: string;
    };
    if (!data.html) return null;
    const text = data.html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    return { text, authorName: data.author_name ?? "" };
  } catch {
    return null;
  }
}

const COMPANY_PATTERNS = [
  /(?:at|@)\s+([A-Z][\w &.-]{1,40})/i,
  /([A-Z][\w &.-]{1,40})\s+is\s+hiring/i,
  /join\s+([A-Z][\w &.-]{1,40})/i,
  /(?:we(?:'re| are)\s+)?hiring\s+at\s+([A-Z][\w &.-]{1,40})/i,
  /([A-Z][\w &.-]{1,40})\s+(?:is\s+)?looking\s+for/i,
];

const ROLE_PATTERNS = [
  /hiring\s+(?:a(?:n)?\s+)?(.+?)(?:\.|,|!|\n|$)/i,
  /looking\s+for\s+(?:a(?:n)?\s+)?(.+?)(?:\.|,|!|\n|$)/i,
  /role:\s*(.+?)(?:\.|,|!|\n|$)/i,
  /position:\s*(.+?)(?:\.|,|!|\n|$)/i,
  /((?:senior|staff|lead|junior|principal|founding)\s+(?:software|ai|ml|backend|frontend|full[- ]?stack|platform|data|devops|cloud|mobile)\s+(?:engineer|developer|scientist))/i,
  /((?:software|ai|ml|backend|frontend|full[- ]?stack|platform|data|devops|founding)\s+(?:engineer|developer|scientist))/i,
];

const STOP_WORDS = new Set([
  "inc",
  "ltd",
  "llc",
  "corp",
  "co",
  "labs",
  "io",
  "ai",
  "hq",
  "the",
]);

export function extractFromText(text: string): {
  companyName: string | null;
  roleTitle: string | null;
  posterName: string | null;
} {
  let companyName: string | null = null;
  for (const pat of COMPANY_PATTERNS) {
    const m = pat.exec(text);
    if (m?.[1]) {
      companyName = m[1].trim().replace(/[.,!?]+$/, "");
      break;
    }
  }

  let roleTitle: string | null = null;
  for (const pat of ROLE_PATTERNS) {
    const m = pat.exec(text);
    if (m?.[1]) {
      roleTitle = m[1].trim().replace(/[.,!?]+$/, "").slice(0, 80);
      break;
    }
  }

  return { companyName, roleTitle, posterName: null };
}

export function inferDomain(companyName: string): string {
  const slug = companyName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => !STOP_WORDS.has(w))
    .join("")
    .replace(/[^a-z0-9]/g, "");
  return `${slug}.com`;
}
