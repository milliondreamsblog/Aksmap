# Prompt 4 — Workers app + Inngest scraper functions

**Status:** built and typechecked. **Not yet runnable** — needs `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in `.env.local` (user signs up at inngest.com).

## What it produced

`apps/workers` — a Node.js + Express server that hosts [Inngest](https://www.inngest.com) functions. Inngest is the durable workflow engine: it handles cron scheduling, retries, step-level checkpointing, and gives a local dev UI to invoke functions manually.

Three Inngest functions are registered:

| Function | Schedule | What it does |
|---|---|---|
| `scrape-yc` | every 6h | Call `scrapeYc()`, ingest into DB, fire `scraper/source.completed` event |
| `scrape-rss` | every 2h | For each active feed URL from ICP, call `scrapeRssFeed()` + ingest |
| `scrape-careers` | daily at 04:00 UTC | Stub for now — full impl in Prompt 5 |

After this prompt: scrapers run automatically on schedule, leads flow into Supabase, every run is logged to the `events` table.

## Files created

```
apps/workers/
├── package.json
├── tsconfig.json
├── Dockerfile               ← for Railway / Fly.io deploy (Prompt 8 territory)
├── .dockerignore
└── src/
    ├── server.ts            ← Express app, mounts Inngest at /api/inngest
    ├── env.ts               ← Zod-validated env (PORT, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY)
    ├── inngest/
    │   ├── client.ts        ← Inngest client + typed event schemas
    │   ├── functions.ts     ← barrel exporting all 3 functions
    │   ├── scrape-yc.ts     ← cron */6h, fetch → ingest → emit event
    │   ├── scrape-rss.ts    ← cron */2h, iterates ICP active sources
    │   └── scrape-careers.ts← stub (placeholder for Prompt 5)
    └── lib/
        ├── ingest.ts        ← ScrapeResult → DB writes (upsert companies, insert leads, log event)
        └── logger.ts        ← JSON-lines logger (pretty in dev, structured in prod)
```

## Where DB writes live now

This is where the architecture from [ADR-003](../decisions/003-scrapers-as-pure-functions.md) pays off. Scrapers return data. **The workers app owns persistence.** Specifically, `lib/ingest.ts` is the single place where `ScrapeResult` → DB happens:

1. **`upsertCompany`** — insert or update on conflict by domain. Refreshes mutable fields (description, headcount, funding info) but keeps `name` stable to avoid stomping enriched data with a less-good source.
2. **`insertLead`** — `onConflictDoNothing()` against the `(companyId, roleUrl)` unique index. Re-running with overlapping data is safe — duplicates silently no-op.
3. **`events`** — appends a `scraper_run.${source}.completed` row with stats. Audit trail.

Leads with `domain: null` (common in RSS feeds where the description doesn't embed the company website) are **skipped, not inserted**. Enrichment in Prompt 5 will fill in domains via name → domain lookup.

## Function structure: why `step.run` blocks matter

Each function is decomposed into `step.run("name", async () => ...)` blocks. Inngest checkpoints between steps. If the worker crashes during `ingest-yc`, Inngest doesn't re-scrape YC on retry — it replays from the cached `fetch-yc` output. This is the **durable execution** benefit.

The catch (and the deviation): `step.run` serializes its return value through JSON. `Date` objects come back as ISO strings. Discovered this when the workers package failed to typecheck — `result.scrapedAt` was `string`, not `Date`, when passed across the step boundary. Fixed via a cast + a `new Date(result.scrapedAt)` rewrap inside the consumer. See deviation #2 below.

## Concurrency, retries, and politeness

| Setting | scrape-yc | scrape-rss | scrape-careers |
|---|---|---|---|
| `concurrency.limit` | 1 | 1 | 1 |
| `retries` | 3 | 2 | 1 |

Concurrency of 1 means Inngest won't start a second run of the same function until the previous one finishes. Important for scrapers — we don't want two YC scrapes hammering the API in parallel.

Retries handle transient failures (network blips, 503s). The `politeFetch` helper inside `@job-hunter/scrapers` already retries individual HTTP requests; the function-level retry is for the whole pipeline (e.g. if the DB connection drops mid-ingest).

## Deviations from spec

1. **EventSchemas wiring.** Spec declared a `type Events = { ... }` but didn't pass it to the Inngest constructor — meaning `step.sendEvent` would lose its type safety. Added `schemas: new EventSchemas().fromRecord<Events>()` so the typed events actually flow through. Tiny change, large dev-experience upside.
2. **Type cast at the step.run boundary in `scrape-yc.ts`.** Inngest's `step.run` return type is `JsonifyObject<T>` (dates → strings). The second `step.run("ingest-yc", ...)` block receives that serialized shape, but `ingestScrapeResult` expects `ScrapeResult` with real `Date`. Two options: refactor `ScrapeResult` to use ISO strings everywhere (blast radius: all scrapers + smoke test), or cast at the boundary + make `ingestScrapeResult` forgiving on `scrapedAt`. Picked the second. The cast is annotated with a comment explaining why. `ingest.ts` now does `new Date(result.scrapedAt).toISOString()` which is a no-op for `Date` inputs and a parse for `string` inputs — works either way.
3. **`inngest:dev` script URL `3001`, not `8288`.** Spec had `inngest-cli dev -u http://localhost:8288/api/inngest`. That URL points the Inngest CLI at itself; the correct target is the workers app on `:3001`. The mentor's verification steps actually had this right (`-u http://localhost:3001/api/inngest`); only the inline npm script was wrong. Fixed.
4. **Missing generics in logger.ts.** Spec had `meta?: Record` (5 occurrences) — strict TS rejects unparametrized `Record`. Filled in `Record<string, unknown>`.
5. **Missing return-type generics in `lib/ingest.ts`.** `Promise` → `Promise<IngestStats>` for `ingestScrapeResult`, `Promise<string>` for `upsertCompany`, `Promise<void>` for `insertLead`.
6. **Explicit type for `allStats` in `scrape-rss.ts`.** Spec had `const allStats = []` which infers as `never[]` and breaks `.push()`. Defined `interface SourceStats` and typed the array `: SourceStats[]`.

## Verification

This prompt is unusual — it can't be smoke-tested without Inngest credentials. Build/typecheck pass; runtime needs:

```bash
# Add to .env.local at repo root:
#   INNGEST_EVENT_KEY=<from inngest.com Manage → Event Keys>
#   INNGEST_SIGNING_KEY=<from inngest.com Manage → Signing Key>

# Terminal 1 — workers server
pnpm --filter @job-hunter/workers dev
# expected: "Workers server listening on :3001 { functions: [ 'scrape-yc', 'scrape-rss', 'scrape-careers' ] }"

# Terminal 2 — Inngest dev server (points at workers)
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest
# expected: "Functions registered: 3"
# open http://localhost:8288 in browser

# Terminal 3 — verify DB after invoking scrape-yc from the dashboard
pnpm --filter @job-hunter/db db:studio
# expect leads table to gain rows with status='raw'
```

## Common failure modes

| Symptom | Cause |
|---|---|
| Server crashes at startup with `INNGEST_EVENT_KEY required` | `.env.local` missing the Inngest keys |
| `Functions registered: 0` in Inngest CLI | Workers server isn't running on `:3001` yet, or wrong URL |
| Signature verification failures | `INNGEST_SIGNING_KEY` doesn't match the Inngest app — re-copy from dashboard |
| `leads` table empty after a successful run | All scraped leads had `domain: null` (expected for some RSS feeds — enrichment in Prompt 5 fixes this) |
| `prepared statement "..." already exists` during ingest | The DB client's `prepare: false` got removed somewhere. Put it back. |

## What to remember from this prompt

- **Workers app owns DB writes.** Scrapers never write directly. If you find yourself adding a `db.insert(...)` inside a scraper file, the logic belongs in `apps/workers/src/lib/ingest.ts`.
- **`step.run` is your replay boundary.** Anything inside a step.run is cached for the duration of that run. If a step fails, Inngest retries it without re-executing prior steps. Take advantage of this by making steps idempotent and chunked.
- **Dates round-trip as strings across step.run boundaries.** Pattern is documented in deviation #2 above. If you write a new function that crosses a step boundary with date-bearing data, plan for the rehydration.
- **The Dockerfile is built from the monorepo root**, not from `apps/workers/`. `docker build -f apps/workers/Dockerfile .` from repo root.
