import pRetry from "p-retry";

const USER_AGENT =
  "JobHunterBot/0.1 (enrichment; +https://github.com/akshat-darshi/job-hunter)";
const TIMEOUT_MS = 10_000;

export interface FetchedPage {
  url: string;
  status: number;
  html: string;
  finalUrl: string;
  headers: Record<string, string>;
}

export async function fetchPage(url: string): Promise<FetchedPage | null> {
  return pRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: controller.signal,
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Retryable HTTP ${res.status}`);
        }

        if (!res.ok) return null;

        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headers[k] = v;
        });

        return {
          url,
          status: res.status,
          html: await res.text(),
          finalUrl: res.url,
          headers,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return null;
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    },
    { retries: 2, minTimeout: 1000, factor: 2 },
  ).catch(() => null);
}
