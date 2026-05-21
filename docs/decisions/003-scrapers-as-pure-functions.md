# ADR 003 — Scrapers are pure functions

**Status:** accepted (Prompt 3, 2026-05-21)

## Context

When you build a lead-scraping system, the obvious first instinct is to write code that goes "fetch from source → write to database → emit event for next stage." Every scraper does the whole pipeline end-to-end.

That instinct produces code that's:

- Hard to test (you need a real DB or extensive mocking)
- Hard to re-run (re-running a scraper rewrites whatever was there)
- Coupled to a specific orchestrator (DB writes, Inngest event names, transaction logic all bleed into the scraper)
- Hard to use ad-hoc (want to scrape YC once to see what it returns? You're calling the full pipeline)

We could instead split scraping from persistence — make scrapers pure, push side effects to a single orchestrator layer.

## Decision

**Scrapers are pure functions** in this codebase. Each scraper:

- Takes inputs (URLs, config)
- Performs network I/O via `politeFetch` (the only "impurity" allowed)
- Returns a strongly-typed `ScrapeResult<ScrapedLead>` synchronously (well, via Promise)
- **Does NOT write to the database**
- **Does NOT emit events or call Inngest**
- **Does NOT mutate shared state**
- **Does NOT have a side effect besides making HTTP requests and logging**

All DB writes, deduping, event emission, retries-with-state, and orchestration live in `apps/workers` (Prompt 4). The dependency arrow is one-way: `apps/workers → @job-hunter/scrapers`. The scrapers package has no idea the database, Inngest, or any orchestrator exists.

## Why

1. **Unit-testability.** A pure function with mocked `fetch` tests in milliseconds, no DB or queue needed. We can write tests like "given this YC API response, the scraper produces these 3 leads" with zero infrastructure.

2. **Composability.** The same `scrapeYc()` function works in:
   - The scheduled Inngest job (Prompt 4)
   - A one-off CLI script (the smoke test we already have)
   - A manual REPL session ("let me check what YC returned today")
   - A future replay tool that re-scrapes from cached HTTP responses
   - A different orchestrator entirely if we ever leave Inngest

3. **Re-runnability.** Want to re-scrape YC right now? Just call the function — nothing happens to the DB until the orchestrator decides what to do with the results. No risk of "I just blew away today's data by accident."

4. **Debuggability.** When something goes wrong, the question "what did the scraper return?" has a literal answer — the `ScrapeResult` it returned. With end-to-end scrapers, you'd debug across the scraper, the DB, *and* the event queue to reconstruct what happened.

5. **Soft errors don't crash the pipeline.** `ScrapeResult.errors[]` lets a scraper say "I succeeded overall but couldn't parse these 3 items." The orchestrator decides how to handle them (log? skip? alert?). An end-to-end scraper would either silently swallow the error or abort the whole run.

6. **Clean dependency graph.** `@job-hunter/scrapers` depends only on `@job-hunter/icp` for config and a few small npm packages. It doesn't depend on `@job-hunter/db` or any orchestrator. Easy to reason about, easy to publish independently if we ever wanted to.

## Trade-offs

- **More code overall.** The orchestrator in `apps/workers` has to do the work of consuming `ScrapeResult` and writing to the DB — work that an end-to-end scraper would have done inline. Worth it.
- **Two-step debugging when something fails post-scrape.** "Why didn't this lead end up in the DB?" requires checking both the scrape output and the orchestrator behavior. Mitigated by the `events` table in the DB schema, which logs each orchestrator decision.
- **Tempting to violate.** When you're inside a scraper and you have a `Lead` in hand, it's *right there*, why not just write it? Resist. The moment one scraper does, the abstraction is broken and the others will follow.

## How to apply this in the codebase

- **Adding a new scraper:** Make it `async function scrapeFoo(...): Promise<ScrapeResult>`. Read config from `@job-hunter/icp`. Call `politeFetch` (don't bring in your own HTTP client). Return data. Done.
- **Reviewing a scraper PR:** If you see an `import { db } from "@job-hunter/db"` in a scraper file, that's a red flag — it shouldn't be there.
- **If you find yourself wanting to write to the DB from a scraper:** the logic belongs in `apps/workers`, not in the scraper. Add it there.
- **Soft errors:** push them into `result.errors[]`, don't throw. Throw only on conditions where the entire scrape run is meaningless (network completely dead, schema entirely different).

## References

- See [Prompt 3 doc](../prompts/03-scrapers.md) for the package implementation
- The split mirrors the standard "I/O at the edges, pure functions in the middle" pattern from functional programming — see Gary Bernhardt's "Boundaries" talk for the canonical articulation
- The `ScrapeResult` shape is inspired by the `Result<T, E>` pattern, but with explicit soft-error collection instead of binary success/failure
