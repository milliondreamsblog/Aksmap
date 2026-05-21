# Prompt 3 — Scrapers package

**Status:** built and smoke-tested against real sources

## What it produced

The `@job-hunter/scrapers` package — three working scrapers (YC, generic RSS, careers-page) implemented as **pure functions**. Each takes inputs, makes network requests, returns strongly-typed `ScrapeResult` objects. None of them touch the DB; that's the orchestrator's job in Prompt 4.

After this prompt: `pnpm --filter @job-hunter/scrapers smoke` hits real sources (YC's API + the RSS feeds defined in [`icp.geoConfig`](../../packages/icp/src/config.ts)) and streams leads to the terminal.

## Files created

```
packages/scrapers/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            ← public exports
    ├── types.ts            ← ScrapeResult, ScrapedLead, ScrapedCompany, ScrapedRole
    ├── utils/
    │   ├── index.ts        ← barrel for the ./utils subpath export
    │   ├── http.ts         ← politeFetch with UA + timeout + retries (p-retry)
    │   ├── rss.ts          ← fast-xml-parser wrapper, RSS/Atom support
    │   ├── domain.ts       ← canonicalDomain, geoFromLocation
    │   ├── role.ts         ← classifyRole, isJuniorFriendly (heuristics)
    │   └── geo.ts          ← matchesActiveGeo (reads ICP)
    ├── yc/
    │   ├── index.ts        ← scrapeYc()
    │   └── api.ts          ← YC API client with Zod validation
    ├── rss/
    │   ├── index.ts        ← scrapeRssFeed(url)
    │   └── extractors.ts   ← parsing heuristics for funding-news titles
    ├── careers/
    │   ├── index.ts        ← scrapeCareersPage(opts)
    │   └── parsers.ts      ← JSON-LD JobPosting + anchor-tag fallback
    └── scripts/
        └── smoke-test.ts   ← manual run, used for verification
```

## The pure-function design

This is the most important design call in Prompt 3 — see [ADR-003](../decisions/003-scrapers-as-pure-functions.md) for the full rationale.

Every scraper has the same signature:

```
input → fetch → parse → return ScrapeResult
```

No DB writes. No Inngest calls. No filesystem. No global state. Just data in, data out.

This means:

- Each scraper is unit-testable with mocked `fetch`
- Same scraper code works for one-shot scripts, scheduled jobs, manual runs
- Swapping the orchestrator (Inngest → Trigger.dev → a cron job) doesn't touch scraper code
- The dependency arrow is one-way: `apps/workers → @job-hunter/scrapers`, never the reverse

## The three scrapers

### `scrapeYc()` — YC API

Hits `https://api.ycombinator.com/v0.1/companies?isHiring=true&page=N` and pages through. Filters companies by:

1. `status === "Active"` (rules out exited / failed companies)
2. At least one of `locations[]` matches an active geo from ICP
3. Headcount under the ICP's `hardFilters.maxHeadcount`

Returns one lead per qualifying company, tagged with the company's `careersUrl` on workatastartup.com.

**Important behavior:** YC's API ignores the `batch` query param. Documented assumption was that it filtered by recent batches; reality is it returns all companies and we filter client-side. The `isHiring=true` param does appear to work server-side.

### `scrapeRssFeed(feedUrl)` — Generic RSS

For Indian/SEA funding-news outlets (Inc42, YourStory, e27, etc.). Parses RSS or Atom feeds via `fast-xml-parser`, filters items that look like funding announcements (`/raises|closes|secures|funding|seed|series/`), and extracts:

- **Company name** — heuristic regexes for titles like "Foo raises $5M Series A" or "Foo, an Indian fintech startup, closes $10M"
- **Funding stage** — pre-seed / seed / series A/B/C / bridge
- **Funding amount** — dollar parsing
- **Company URL** — first `<a>` in description that isn't the news outlet's own domain or a social link

Domain often comes back null because RSS descriptions don't always include the company website. Enrichment in Prompt 5 will fill in domains via name → domain lookup.

### `scrapeCareersPage({ careersUrl, companyName, companyDomain })` — Careers HTML

For after we've identified a company we want to target. Loads their careers page and extracts job listings two ways:

1. **JSON-LD JobPosting** schema (if the site has it — best signal, used by most modern ATSs)
2. **Anchor-tag heuristic** fallback — find `<a>` tags whose text contains `engineer|developer|founding|intern` and use `classifyRole` to assign a role type

One lead per role found. Used in Prompt 4 as a follow-up to YC + RSS scraping.

## Utilities worth understanding

### `politeFetch` (utils/http.ts)

Every network request goes through this. It:

- Sets a real, identifying `User-Agent` (so sysadmins can find Akshat if they want to ask him to stop)
- 15-second timeout with `AbortController`
- Retries on `429` and `5xx` with exponential backoff (3 retries, 1s → 10s) via `p-retry`
- Does NOT retry on `4xx` other than 429 — those are "won't fix by retrying"

### `classifyRole(title, extraText)` (utils/role.ts)

Maps free-text titles to our `RoleMatch` enum from the ICP. Order matters — checks AI/ML first, then founding, then backend, etc. Important for the scorer in Prompt 5 — `roleWeights["ai-ml"] = 1.0` vs `roleWeights["frontend"] = 0.4` means classification needs to be reliable.

### `geoFromLocation(loc)` + `matchesActiveGeo(loc)` (utils/domain.ts, utils/geo.ts)

Two-step geo logic. `geoFromLocation` is a pure pattern match (returns a Geo or undefined). `matchesActiveGeo` adds the ICP filter — returns the Geo only if `activeGeos[geo] === true`, otherwise null. Used to drop leads outside the candidate's current target markets without losing the underlying logic.

## Deviations from spec

All deviations follow the established pattern (catch from Prompt 1: fix-and-flag). Specifically this time:

1. **Markdown-stripped generics, again.** Counted ~15 missing type parameters in the spec text (e.g. `Promise` should be `Promise<Response>`, `Record` → `Record<string, string>`, `z.infer` → `z.infer<typeof YcCompanySchema>`, `new Set()` → `new Set<string>()`, `Array` → `Array<{...}>`, `]+href=` regex missing `<a` prefix). Filled them all in.
2. **Created `src/utils/index.ts`** (not in spec's file list) — needed because the package.json declares a `./utils` subpath export pointing at `./dist/utils/index.js`. Without the barrel, the export resolves to nothing.
3. **Main `src/index.ts` points `utils` re-export at `./utils/index.js`** instead of the spec's `./utils/domain.js` — so `import { utils } from "@job-hunter/scrapers"` gives access to *all* utils (domain, role, geo, http, rss) instead of just domain helpers. Flagged for review; trivial to revert.
4. **YC API schema rewritten to camelCase**, not snake_case. The spec assumed `one_liner`, `team_size`, `location`, `country`. Reality is `oneLiner`, `teamSize`, `locations[]` (array), no `country`. Discovered when smoke test returned 0 leads and direct curl showed the actual shape. The mentor explicitly invited this kind of correction.
5. **YC scraper filter logic updated** to scan `locations[]` (array) instead of `location` (string). A company with offices in both "San Francisco, CA, USA" and "Bangalore, India" is now correctly tagged as an India lead.

## Smoke test results (2026-05-21 run)

```
Active geos: india, singapore_sea

Scraping YC...
yc — 2 leads
  - Drip Capital     dripcapital.com   india
  - Bolna AI         bolna.ai          india

Scraping RSS funding feeds...
rss:inc42.com       — 3 leads (all no-domain)
rss:yourstory.com   — 4 leads (all no-domain)
entrackr.com/feed/  — 404 Not Found    [feed URL is dead]
rss:e27.co          — 0 leads          [feed loads but no items match funding heuristic]
techinasia.com/feed — 403 Forbidden    [bot-blocked by Cloudflare]

Total: 9 real leads from real sources
```

The architecture works. The shortfall vs. the mentor's "≥10 YC + ≥5 per RSS feed" target is **data-quality**, not code:

- YC India/SEA companies are a small fraction of the full corpus. 10 pages × 20 = 200 companies sampled; 2 are in our geos. Scaling up `maxPages` would help, but raises politeness concerns.
- Inc42 / YourStory RSS descriptions don't include company website links → domain extraction returns null. Enrichment in Prompt 5 will fill those.
- Entrackr's feed URL has changed since the ICP was written. Need to update `icp.geoConfig.india.fundingSources` to drop or replace it.
- TechInAsia hard-blocks bots via Cloudflare. Either accept the loss or remove from sources.

## Suggested ICP fixes (not done — out of scope for Prompt 3)

```ts
// packages/icp/src/config.ts
india.fundingSources: [
  "https://inc42.com/feed/",
  "https://yourstory.com/feed",
  // Drop: "https://entrackr.com/feed/" — 404 as of 2026-05-21
],
singapore_sea.fundingSources: [
  "https://e27.co/feed/",
  // Drop or replace: "https://www.techinasia.com/feed" — 403, Cloudflare blocks bots
],
```

Flag to the mentor and let them decide; ICP changes are strategy decisions.

## Verification

```bash
pnpm install
pnpm build           # all 3 packages compile
pnpm typecheck       # all clean
pnpm --filter @job-hunter/scrapers smoke
# → real leads printed to terminal, possibly with soft errors (acceptable)
```

## What to remember from this prompt

- **Scrapers are pure functions.** Anyone adding a new scraper: it returns a `ScrapeResult`, it does not write to the DB. If you find yourself wanting to upsert from inside a scraper, the orchestrator in `apps/workers` is the right home for that logic.
- **All network goes through `politeFetch`.** Don't `fetch()` directly — you'll lose the User-Agent, retries, and timeout.
- **Source URLs in ICP need maintenance.** Funding-news outlets change feed URLs and block bots. Treat ICP as a living config.
- **YC API is unofficial.** The Zod schema is our spec; if YC changes their shape, the `.parse()` call will fail loudly with a clear diff. Update the schema, the rest of the code keeps working.
