# ADR 004 — Inngest for workflow orchestration

**Status:** accepted (Prompt 4, 2026-05-21)

## Context

We need to run scrapers on a schedule (every few hours), persist their output to Supabase, and eventually chain downstream steps (enrichment → scoring → LLM drafting → email sending). The orchestrator we choose has to:

- Run scheduled jobs (cron-style)
- Run event-driven jobs (Prompt 5+ will fire events from one step to the next)
- Survive crashes mid-pipeline without re-running already-completed work
- Retry transient failures automatically
- Let me, the developer, watch what's happening live during development
- Cost $0 at our scale (single-developer, dozens of leads/day)

## Decision

**Use [Inngest](https://www.inngest.com) for workflow orchestration.** Specifically:

- Inngest's Node SDK (`inngest@^3`) defines durable functions
- The local dev server (`npx inngest-cli dev`) gives a UI for invoking and watching runs
- Hosted at inngest.com on the free tier (50K function runs/month — orders of magnitude more than we need)
- Self-hosting is possible later if we outgrow free tier

The workers app (`apps/workers`) hosts these functions over Express; Inngest invokes them via HTTP. The hosted Inngest service handles scheduling, retries, and durable state.

## Alternatives considered

| Option | Why not |
|---|---|
| **node-cron + plain async functions** | No durability — crash during a run loses progress. No retries. No UI. |
| **BullMQ + Redis** | Requires running and managing Redis. More moving parts. UI exists (Bull Board) but less polished. |
| **Trigger.dev** | Direct competitor to Inngest, also durable workflows. Comparable features. Picked Inngest because the local dev UX is slightly better and the SDK is more mature on TypeScript ergonomics in my experience. Reasonable to reconsider. |
| **AWS Step Functions** | Vendor lock-in. JSON-based DSL is awkward to read. Overkill for our scale. |
| **GitHub Actions cron** | Free, but no durability, no event triggers, awkward to chain steps that share state. Fine for one-off batch jobs, not for an ongoing pipeline. |
| **Temporal** | Too heavy. Requires running a Temporal cluster or paying for Temporal Cloud. Built for systems much larger than this one. |

## Why Inngest specifically

1. **`step.run` checkpointing.** Each `step.run("name", async () => ...)` block is cached. If the function fails after step 3, the retry resumes from step 4 without re-executing 1-3. This is the single biggest win — scrapers don't re-hit external APIs on every retry.

2. **Built-in retries with backoff.** Set `retries: 3` on a function and Inngest handles the rest. No need to wrap things in `p-retry` at the function level (we still use it inside `politeFetch` for HTTP-level retries).

3. **Cron + event triggers in one model.** Same function signature works for either. We use cron for the scrapers in Prompt 4; Prompt 5 will add event-triggered functions (when a lead is created → enrich it).

4. **Local dev UI.** Hit `http://localhost:8288` while developing, see all functions, invoke any of them with custom input, watch runs execute step-by-step. Massively reduces the time-to-feedback during development.

5. **Typed events.** Define event schemas once (`EventSchemas().fromRecord<Events>()`), get autocomplete and type-checking for `step.sendEvent` calls everywhere.

6. **Production deployment is a config change.** Same function code runs locally and in production. Only `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` env vars change.

## Trade-offs / what we give up

- **External service dependency.** If inngest.com is down, our scrapers don't run. Mitigated by: Inngest has a high SLA, and a 6-hour scrape delay isn't critical for job hunting. If we ever care about strict scheduling, switch to self-hosted.
- **Function-state opacity.** Step state lives on Inngest's servers, not in our DB. We can see runs in the dashboard, but querying historical run data programmatically requires their API. We don't need this yet.
- **`step.run` serialization gotcha.** Step return values round-trip through JSON, so `Date` → `string`. This bit us in `scrape-yc.ts` and required a boundary cast. Documented in [Prompt 4 doc](../prompts/04-workers-inngest.md). Once you know about it, it's manageable.
- **`step.run` IDs must be unique per function.** Easy to violate when looping (each iteration's step needs a unique ID). We handle this with `slugify(feedUrl)` in `scrape-rss.ts`. Be careful when copying patterns.

## How to apply this in the codebase

- **Adding a new scheduled function:** Create a new file in `apps/workers/src/inngest/`, define with `inngest.createFunction({...}, { cron: "..." }, async ({ step }) => { ... })`, register in `functions.ts`.
- **Adding an event-driven function:** Same shape but `{ event: "event/name" }` instead of `{ cron: "..." }`. Add the event to `Events` in `client.ts` for type safety.
- **Adding a new step:** wrap external work in `step.run("descriptive-id", async () => ...)`. Keep IDs unique within a function.
- **Long-running iteration:** prefer many small `step.run` calls over one giant one. Inngest's UI shows progress per step, and retries are cheaper at finer granularity.
- **Don't:** put database writes outside of `step.run`. The top-level handler body runs on every retry, even after a previous step succeeded.

## References

- Inngest TypeScript SDK docs: https://www.inngest.com/docs
- Step functions and durability model: https://www.inngest.com/docs/learn/how-functions-are-executed
- See [Prompt 4 doc](../prompts/04-workers-inngest.md) for the workers app implementation
