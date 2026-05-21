import pRetry from "p-retry";

const USER_AGENT =
  "JobHunterBot/0.1 (personal-job-search; +https://github.com/akshat-darshi/job-hunter)";

const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  acceptJson?: boolean;
}

export async function politeFetch(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  return pRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        opts.timeout ?? DEFAULT_TIMEOUT_MS,
      );

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: opts.acceptJson
              ? "application/json"
              : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            ...opts.headers,
          },
          signal: controller.signal,
          redirect: "follow",
        });

        if (res.status === 429 || res.status >= 500) {
          throw new Error(`Retryable HTTP ${res.status} from ${url}`);
        }

        return res;
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      factor: 2,
      maxTimeout: 10_000,
    },
  );
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOptions = {},
): Promise<T> {
  const res = await politeFetch(url, { ...opts, acceptJson: true });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchText(
  url: string,
  opts: FetchOptions = {},
): Promise<string> {
  const res = await politeFetch(url, opts);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.text();
}

export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));
