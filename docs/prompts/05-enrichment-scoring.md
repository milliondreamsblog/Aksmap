# Prompt 5 — Enrichment + scoring pipeline

**Status:** built, typechecks clean across 9 tasks. Pipeline ready to verify end-to-end (needs the user to restart workers + invoke a scrape from the Inngest dashboard).

## What it produced

The system now has a real **event-driven pipeline**, not just two cron jobs writing to DB. Every lead that gets created automatically:

1. Triggers `enrich-lead` (fetches company website, extracts tech stack, hiring signals, candidate people, generates email candidates with MX validation)
2. Triggers `score-lead` (computes a 0-100 ICP-weighted score, transitions status to `queued` if ≥ threshold, else `archived`)

After this prompt: `status` distribution across `leads` should be a mix of `queued` and `archived` instead of stuck at `raw`. Companies have `tech_stack` populated. Contacts table has rows with MX-validated emails.

## New package: `@job-hunter/enrichment`

```
packages/enrichment/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                ← public exports
    ├── types.ts                ← WebsiteEnrichment, CandidatePerson, ScoreInputs, ScoreResult
    ├── website/
    │   ├── index.ts            ← enrichFromWebsite() — orchestrates
    │   ├── fetch.ts            ← polite homepage fetcher (10s timeout, 2 retries)
    │   ├── tech-stack.ts       ← 19 detectors (react/next/vue/tailwind/etc.) + 12 AI indicators
    │   ├── hiring-signals.ts   ← /careers link detection + "we're hiring" text matching
    │   └── extract-people.ts   ← schema.org Person + paragraph heuristics
    ├── email/
    │   ├── patterns.ts         ← 6 candidate generators per person
    │   └── mx-validate.ts      ← DNS MX record check, cached per domain
    └── scoring/
        ├── factors.ts          ← 8 per-factor scoring functions (each returns 0-1)
        └── index.ts            ← scoreLead() — weighted sum × role multiplier × 100
```

Stays pure-function — no DB writes, no Inngest, just inputs → outputs. Same architectural rule as [`@job-hunter/scrapers`](../decisions/003-scrapers-as-pure-functions.md).

## New Inngest functions

### `enrich-lead` (event-triggered)

Listens to `lead/created`. 5 sequential steps:

1. `load-lead` — fetch lead + company from DB
2. `fetch-website` — `enrichFromWebsite(domain)` (the expensive step — single network call + parsing)
3. `update-company` — persist `techStack`, `isAiCompany`, `careersUrl`, `description`, `websiteScrapedAt`
4. `derive-contacts` — for up to 3 candidate people, generate email candidates, MX-validate the first, insert as contact (`onConflictDoNothing`)
5. `mark-enriched` — transition lead to `enriched` status, emit `lead/enriched` event

Concurrency limit: 5 (parallel website fetches). Retries: 2.

### `score-lead` (event-triggered)

Listens to `lead/enriched`. 3 steps:

1. `load-inputs` — fetch enriched lead + company
2. `compute-score` — run `scoreLead()` with ICP weights, get `{ score, breakdown }`
3. `persist-score` — write `score` + `scoreBreakdown` to lead, transition to `queued` (if score ≥ `icp.outreach.minScoreToQueue`, default 60) or `archived`

Concurrency limit: 10. Retries: 1.

## Workers changes

`apps/workers/src/lib/ingest.ts`:
- `insertLead()` changed signature from `Promise<void>` to `Promise<string | null>` — uses `.returning({ id: leads.id })` so dedup-skipped inserts return null.
- After non-null lead id, `inngest.send({ name: "lead/created", data: { leadId, source } })` fires the cascade.

`apps/workers/src/inngest/client.ts`:
- Added `lead/enriched` event type to `Events`.
- **Added conditional `baseUrl: "http://localhost:8288"` when `NODE_ENV === "development"`.** See deviation #1 below.

`apps/workers/src/inngest/functions.ts`:
- Registered `enrichLeadJob` and `scoreLeadJob`. Now exports 5 functions total.

## How the data model evolves through the pipeline

```
raw      ← scraper inserted, no enrichment yet
  ▼
enriching (conceptual — not actually a state we set; enrichment is fast enough)
  ▼
enriched ← website fetched, companies.tech_stack populated, contacts derived
  ▼
scored   (conceptual — score is computed but we go straight to queued/archived)
  ▼
queued    ← score ≥ minScoreToQueue (60) — ready for LLM drafting in Prompt 6
  OR
archived  ← score < threshold — won't be drafted
```

The schema's full lifecycle enum supports `enriching`/`scored`/`sent`/`replied` too, but in this prompt's pipeline we collapse some intermediate states for simplicity. Future prompts may use them.

## Deviations from spec

1. **Conditional `baseUrl: "http://localhost:8288"` in the Inngest client when `NODE_ENV === "development"`.** Spec didn't include this. **It's required for the cascade to work in local dev.** Reason: `inngest.send()` called from `ingest.ts` is *outside* an Inngest function context, so the SDK's serve-adapter dev-mode detection doesn't apply. Without an explicit override, the SDK posts to `api.inngest.com` (production), which would 401 on our local placeholder event key — and the event would never reach the local CLI dev server, so the `lead/created → enrich-lead` cascade silently dies. For production deploy, the conditional drops out (NODE_ENV will be "production") and the SDK uses its default cloud URL. Documented in `client.ts`.

2. **`stats.leadsSkipped++` on dedup-skip in `ingest.ts`.** Spec says `insertLead` returns null on dedup-skip. I increment `leadsSkipped` in that branch so the diagnostic query (`SELECT payload->>'leadsSkipped' ...`) reflects reality. Previously, dedup-skips silently incremented `leadsCreated` (which was always equal to candidates - null-domain-skips). Now dedup-skips are visible. Tiny semantic shift but more accurate stats.

3. **Typed `JsonLdPerson` interface** in `extract-people.ts`. Spec accesses `e["@type"]`, `e.name`, `e.jobTitle` on a JSON.parse result (`any`). Under strict mode the spec compiles, but I made it explicit with `const p = entry as JsonLdPerson` for self-documentation. Behavior identical.

## SLOC added (rough)

| File | Lines |
|---|---|
| packages/enrichment/src/types.ts | ~45 |
| packages/enrichment/src/website/fetch.ts | ~60 |
| packages/enrichment/src/website/tech-stack.ts | ~140 |
| packages/enrichment/src/website/hiring-signals.ts | ~50 |
| packages/enrichment/src/website/extract-people.ts | ~80 |
| packages/enrichment/src/website/index.ts | ~30 |
| packages/enrichment/src/email/patterns.ts | ~25 |
| packages/enrichment/src/email/mx-validate.ts | ~25 |
| packages/enrichment/src/scoring/factors.ts | ~60 |
| packages/enrichment/src/scoring/index.ts | ~80 |
| packages/enrichment/src/index.ts | ~5 |
| apps/workers/src/inngest/enrich-lead.ts | ~110 |
| apps/workers/src/inngest/score-lead.ts | ~80 |
| apps/workers/src/inngest/client.ts (delta) | ~5 added |
| apps/workers/src/lib/ingest.ts (delta) | ~10 changed |
| **Total** | **~810 new lines** |

Higher than the spec's "~600 lines" estimate. Difference is mostly the tech-stack detector list (19 detectors + 12 AI patterns is verbose).

## What felt iffy during implementation

Per the mentor's framing memo about Prompts 5-8: don't tune heuristics before data exists. Honoring that, but flagging the things my gut says will probably be wrong on real data — useful as a list of suspects to investigate once data arrives:

1. **The careers-link detection treats YC-set `careersUrl` (workatastartup.com/companies/X) as a positive hiring signal.** Every YC lead will score `hiringSignal: 1.0` even if the company isn't actively hiring engineers — they're just listed on workatastartup. False positives skew YC leads upward. The fix later is probably to distinguish "set during scrape" (weak signal) from "discovered during website enrichment" (strong signal).

2. **`stackMatchScore` substring fallback is permissive.** `candidate.has(t) || [...candidate].some((s) => t.includes(s) || s.includes(t))` means "react" matches "react-native", "preact", and "react-server". OK in some cases, wrong in others. Will produce false positives but rarely false negatives.

3. **`AI_INDICATORS` over-fires.** A company that mentions "we use OpenAI for our support chatbot" will register as `isAiCompany: true`. That's fine for filtering at the top of the funnel; not fine for personalization later (Prompt 6 messages would lean into "you're an AI company" which would feel cold).

4. **`extractPeople` paragraph regex catches names that aren't founders.** "Article by Sarah Johnson, our editor" → Sarah Johnson is now a contact candidate. Best mitigated by Prompt 6's LLM rewrite of contact-list which can sanity-check via context.

5. **MX validation is too lenient.** Any domain with MX records "validates" — including domains where my pattern-generated email doesn't actually exist. We're calling it `emailVerified: true` which is misleading. Better label would be `domainHasMx: true`. Want to rename in a future cleanup pass.

6. **Hardcoded threshold `score < 60 → archived`** means leads in the 50s get tossed before we even try them. After Prompt 8 data, this threshold likely wants to drop to ~45 (or be replaced with "queue the top N regardless of score").

Per the memo: noting these, not fixing them. They're "what the data will tell us" candidates, not bugs.

## Verification

```bash
pnpm build       # 5/5 tasks successful
pnpm typecheck   # 9/9 tasks successful
```

Runtime verification needs the three-terminal flow restarted (workers must reload to register the 2 new functions). Then a single `scrape-rss` invoke from the Inngest dashboard cascades all the way through enrichment + scoring for every lead created.

Expected DB state after one full run:

```sql
SELECT status, COUNT(*) FROM leads GROUP BY status;
-- expected: mix of `queued` and `archived`, possibly small number of `enriched`
-- (if scoring is slow); none should be stuck at `raw`

SELECT COUNT(*) FROM contacts;
-- expected: ~3-8 (best-effort; many companies have generic /about pages without findable people)

SELECT name, role, email, email_verified FROM contacts LIMIT 5;
-- expected: a mix of email_verified=true (domain has MX) and false (domain doesn't, often parked)
```

## What to remember from this prompt

- **The pipeline is now event-driven.** Each stage is its own Inngest function. Changing one (e.g., adding LLM enrichment in Prompt 6) doesn't ripple through the scrapers.
- **`inngest.send()` from outside an Inngest function needs `baseUrl` set in dev mode.** Documented in client.ts. Don't remove the conditional.
- **Heuristics are best-effort and visibly wrong in known ways.** See "What felt iffy" above. Don't patch these without data.
- **`@job-hunter/enrichment` is pure functions.** Same rule as scrapers. If you find yourself wanting to `db.insert(...)` inside an enrichment file, the logic belongs in `apps/workers/src/inngest/enrich-lead.ts`.
