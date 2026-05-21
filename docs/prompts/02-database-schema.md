# Prompt 2 — Database schema (Drizzle + Supabase)

**Status:** built; `db:push` to Supabase pending the user's `.env.local` setup

## What it produced

The `@job-hunter/db` package — a fully-typed Drizzle ORM client over Supabase Postgres, with 6 core tables, foreign keys, indexes, and migrations. After this prompt:

- Every future package imports the DB client with `import { db } from "@job-hunter/db"`
- Schema changes are made by editing `packages/db/src/schema/*.ts`, then running `pnpm --filter @job-hunter/db db:push`
- Drizzle Studio (`db:studio`) gives a local UI to inspect data

## Files created

```
packages/db/
├── package.json
├── tsconfig.json
├── drizzle.config.ts      ← config for the drizzle-kit CLI (migrations, studio)
└── src/
    ├── index.ts           ← re-exports client + schema
    ├── client.ts          ← postgres.js connection + drizzle wrapper
    ├── env.ts             ← Zod-validated env loader
    └── schema/
        ├── index.ts       ← re-exports everything
        ├── enums.ts       ← pgEnum types
        ├── companies.ts
        ├── contacts.ts
        ├── leads.ts
        ├── messages.ts
        ├── replies.ts
        ├── events.ts
        └── relations.ts   ← Drizzle relations() declarations
```

## The data model

```
  companies (1) ──── (many) contacts
      │                       │
      │ (1)                   │ (1)
      │                       │
      └────── (many) leads ───┘
                  │
                  │ (1)
                  ▼
            (many) messages
                  │
                  │ (1)
                  ▼
            (many) replies

  events (no FKs — append-only audit log)
```

### Table-by-table

#### `companies`
The org we want to reach. Keyed by `domain` (unique). Holds enrichment data: headcount, last funding date+amount, tech stack, whether it's an AI company, careers URL. Updated by scrapers and the enrichment pipeline.

Indexes: domain (unique), geo, last_funding_date.

#### `contacts`
A specific person at a company — founder, CTO, hiring manager. FK to `companies`. Holds name, role, email + verification status, LinkedIn URL, Twitter handle, and `recentPosts` JSONB for LLM context (so the message can reference what they posted last week).

Indexes: company_id, email.

#### `leads`
A *job opportunity* — a specific role at a specific company, with a specific contact (optional). This is the central table. FK to `companies` and (nullable) `contacts`.

Stores:
- `source` (e.g. `"yc_workatastartup"`, `"inc42_rss"`) and `sourceUrl` + `sourcePayload` (raw JSON for debugging)
- `roleTitle`, `roleType`, `roleUrl`, flags for `isRemote`, `isJuniorFriendly`
- `score` (computed in Prompt 5) + `scoreBreakdown` (per-factor JSONB so we can debug why a score is what it is)
- `status` — one of 10 lifecycle states (see below)
- Timestamps for every state transition (`scrapedAt`, `enrichedAt`, `scoredAt`, `queuedAt`, `decidedAt`)
- `notes` — free-text for Akshat

**Dedupe key:** `(companyId, roleUrl)` is a unique index. Same role from the same company won't be inserted twice, even if it appears on multiple sources.

**Indexes:** status, score, company_id, dedupe.

#### `messages`
An outbound message (or planned outbound message). FK to `leads`. Holds:
- `channel` (email / linkedin / twitter / careers_form)
- `status` (draft → approved → sending → sent → bounced/failed)
- `sequenceStep` (1 for cold, 2 for first follow-up, etc.)
- `subject` + `body` (the actual text)
- `draftedByLlm` / `editedByUser` (provenance)
- `providerMessageId` (Resend's message ID, for tracking)
- Timestamps: `sentAt`, `openedAt`, `clickedAt`, `bouncedAt`

#### `replies`
Inbound. FK to `messages`. Body text, LLM-classified `sentiment` (positive / neutral / negative / auto_reject / auto_other), and `rawPayload` for debugging the webhook.

`sentiment: "auto_reject"` is for "thanks but no thanks" autoresponders; `auto_other` is generic auto-responses (vacation, out-of-office). Distinguishing them lets the dashboard suppress noise without losing data.

#### `events`
Append-only audit log. Generic shape: `entity_type` + `entity_id` + `event_type` + JSONB payload. No FK constraints because entities might be deleted but we want the history. Used for analytics ("how many leads moved from `queued` → `sent` last week?") and debugging.

### Lead lifecycle (`leadStatusEnum`)

```
raw → enriching → enriched → scored → queued → approved → sent → replied
                                              ↘ rejected
                                              ↘ archived
```

- **raw** — just scraped, only company + role info
- **enriching** — being processed (looking up contacts, recent funding)
- **enriched** — has contacts, ready to score
- **scored** — has a `score` and `scoreBreakdown`
- **queued** — score ≥ `minScoreToQueue` (60 by default), waiting for message draft
- **approved** — message drafted, Akshat approved, ready to send
- **sent** — outreach went out
- **replied** — got a response (positive or negative)
- **rejected** — Akshat manually rejected the lead (poor fit)
- **archived** — old / stale / no longer relevant

## Why these tech choices

### Why Drizzle (vs Prisma)

- **Better TS inference** — Drizzle infers types directly from schema definitions; no codegen step, no `prisma generate` to run on every change.
- **SQL-first** — the API maps closely to SQL. Easier to reason about query performance.
- **Lighter runtime** — no separate query engine binary.
- **Trade-off:** smaller ecosystem, fewer guides. Manageable.

### Why postgres.js (vs `pg` / node-postgres)

See [ADR-001](../decisions/001-postgres-js-over-pg.md). Short version: Supabase's pooler runs PgBouncer in transaction mode, which doesn't support prepared statements. `pg` defaults to using them and breaks; `postgres` (postgres.js) supports `prepare: false` cleanly and is what Drizzle's Supabase guide recommends.

### Why Supabase (vs bare Postgres on Neon/Railway)

- Generous free tier covers all of dev
- Managed backups
- Has Auth + Storage + Realtime built in if we ever need them (currently we don't)
- Easy to migrate off later — it's just Postgres

### Why JSONB for `recentPosts`, `scoreBreakdown`, `sourcePayload`

These have variable shape and we mostly read them whole. Postgres JSONB gives us schemaless flexibility without losing query capability (we can still index into JSONB fields if needed).

`scoreBreakdown` specifically is `Record<string, number>` — keys are factor names (`stackMatch`, `aiCompany`, etc.), values are the contribution to the final score. Lets us debug "why did this lead score 47?" without recomputing.

## Connection pooling — the gotcha

Supabase exposes two connection strings:

- **Transaction mode (port 6543)** — pooled via PgBouncer. Use for app runtime. *Required* setting: `prepare: false` on the client. Limit: no LISTEN/NOTIFY, no advisory locks.
- **Session mode (port 5432)** — direct connection. Use for migrations (`drizzle-kit push/migrate`) because it supports DDL features the pooler doesn't.

We store both in env: `DATABASE_URL` (pooled) and `DIRECT_URL` (session). The app uses `DATABASE_URL`; drizzle-kit prefers `DIRECT_URL` (falls back to `DATABASE_URL`).

## Deviations from spec

1. **Generic params filled in** — three `.$type()` calls were missing their generic args in the spec (markdown ate the angle brackets). Filled in:
   - `companies.techStack` → `.$type<string[]>()`
   - `contacts.recentPosts` → `.$type<RecentPost[]>()` (invented shape `{ url, text, postedAt? }` — refine later if needed)
   - `leads.scoreBreakdown` → `.$type<Record<string, number>>()`
2. **Moved `dotenv` from devDeps → dependencies** in `packages/db/package.json`. `env.ts` imports it at runtime; leaving it in devDeps would break the package when consumed by an app in production.
3. **Updated root `clean` script** to use `rimraf` too (spec only mentioned updating `icp`'s). Same cross-platform rationale.
4. **Added `pnpm.onlyBuiltDependencies: ["esbuild"]`** to root `package.json`. pnpm 10 ignores postinstall scripts by default for security. drizzle-kit needs esbuild to transform `drizzle.config.ts`, so the postinstall must run. Without this, `db:push` would fail.

## Verification

```bash
# Build phase (no DB needed)
pnpm install
pnpm build       # @job-hunter/icp + @job-hunter/db both succeed
pnpm typecheck   # clean

# DB phase (requires .env.local with DATABASE_URL + DIRECT_URL)
pnpm --filter @job-hunter/db db:push
# → Drizzle Kit lists what it will create, confirm with `y`
# → Expected: [✓] Changes applied

# Verify in Supabase Table Editor: 6 tables visible
# Or via SQL:
#   SELECT table_name FROM information_schema.tables
#   WHERE table_schema = 'public' ORDER BY table_name;
# → companies, contacts, events, leads, messages, replies (6 rows)

pnpm --filter @job-hunter/db db:studio   # browse tables in browser
```

## Common failures

| Symptom | Cause |
|---|---|
| `DATABASE_URL is required` at install/push | `.env.local` missing or in wrong location (must be at **repo root**, not in `packages/db/`) |
| `SASL: SCRAM-SERVER-FINAL-MESSAGE` | Wrong password in URL; URL-encode special chars (`@` → `%40`, `#` → `%23`) |
| `Connection terminated unexpectedly` | Using session-mode URL (5432) where pooled (6543) is expected, or vice versa |
| `prepared statement "..." already exists` at runtime | `prepare: false` got removed from the postgres client — put it back |
| drizzle-kit can't find esbuild | `pnpm.onlyBuiltDependencies` not configured; run `pnpm install` again after adding it |
| `Cannot find module './enums.js'` during `db:push` | drizzle-kit < 0.31 uses a CJS loader that doesn't resolve `.js` to `.ts` source. Use drizzle-kit ≥ 0.31. |
| `Interactive prompts require a TTY terminal` during `db:push` | drizzle-kit 0.31+ prompts for confirmation; pass `--force` for fresh schemas (no data loss risk). The `db:push` script in this package already does. |

## Initial push (live state)

The schema was pushed to Supabase on **2026-05-21** to project `kcugfmmhwtutkwnswcqs` (region `ap-northeast-2` / Seoul). Verification immediately after push:

- 6 tables in `public`: `companies, contacts, events, leads, messages, replies`
- 4 enums: `lead_status, message_channel, message_status, reply_sentiment`
- 22 indexes (6 primary keys + 14 declared indexes + 2 FK helper indexes)

The push process required two adjustments not in the original spec:

1. **drizzle-kit upgraded `^0.28.0` → `^0.31.0`.** Versions before 0.31 have a CJS-based schema loader that can't resolve our ESM `.js` imports back to `.ts` source. Fixed in 0.31.
2. **`db:push` script now appends `--force`.** drizzle-kit 0.31 requires a TTY for the apply-changes confirmation prompt; `--force` skips it. Safe for initial schemas (no destructive changes possible). For later schema changes with column drops, re-evaluate.

## What to remember from this prompt

- Schema changes go through `db:push` (dev) or `db:generate` + `db:migrate` (prod-style migrations). Don't edit the DB by hand.
- `prepare: false` on the postgres client is **mandatory**. Anyone editing `client.ts` later: don't remove it.
- `events` is your audit log. Use it for "what happened when" questions.
- Lead lifecycle is enforced by enum at the DB level — Postgres rejects invalid states.
