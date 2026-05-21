# Architecture

## What this is

`job-hunter` is a personal job-search automation system for Akshat Darshi (2026 CS grad, AI engineer / founding engineer target). It scrapes leads from job sources, scores them against an ICP (Ideal Candidate Profile, but inverted — companies that match *me*), drafts personalised outreach with an LLM, and ships emails after human approval. Replies feed back into the system to learn what works.

It is **strategy-as-code**: the candidate profile, scoring weights, target geographies, and outreach limits live in a typed config package that every downstream component reads from. Change one file, the whole pipeline retargets.

## Goals and non-goals

**Goals:**

- Cold outreach at a sustainable cadence (25 emails/day default, 15 LinkedIn DMs, 5 Twitter DMs)
- High personalisation — every message references the company's recent funding, hiring signals, or product
- Track every outbound message and reply in one DB so nothing slips
- Human-in-the-loop: messages are LLM-drafted, but Akshat approves before send

**Non-goals:**

- Mass spam (hard daily caps prevent this)
- Multi-tenancy (single-user system)
- Real-time chat / inbox replacement (Resend handles email; replies are read async)
- Job applications via ATS forms (out of scope — DM/email only)

## 8-prompt build sequence

| # | Status | Package(s) | What it produces |
|---|---|---|---|
| 1 | done | `@job-hunter/icp` | Monorepo skeleton + strategy config |
| 2 | done · pushed | `@job-hunter/db` | 6-table Postgres schema on Supabase (live) |
| 3 | done | `@job-hunter/scrapers` | YC + RSS + careers, pure functions, smoke-tested |
| 4 | next | `apps/workers` | Inngest service — orchestrate scrape → DB persist |
| 5 | planned | `@job-hunter/scorer` | Score leads against ICP weights |
| 6 | planned | `@job-hunter/llm` | Google + Anthropic SDKs, draft messages |
| 7 | planned | `@job-hunter/email` | Resend integration, send + bounce tracking |
| 8 | planned | `apps/*` | Dashboard / approval UI (likely Next.js) |

Each prompt is mentor-driven, self-contained, and verification-gated. See [prompts/](prompts/) for details.

## Data flow

```
                  [ ICP config ]   ← strategy lives here
                       │ reads
       ┌───────────────┼──────────────────┐
       ▼               ▼                  ▼
  ┌─────────┐    ┌─────────┐         ┌─────────┐
  │ Scraper │───▶│  Scorer │────────▶│   LLM   │
  └─────────┘    └─────────┘         └─────────┘
       │               │                  │
       │ inserts       │ updates          │ inserts (drafts)
       ▼               ▼                  ▼
   ┌─────────────────────────────────────────────┐
   │           Postgres (Supabase)               │
   │  companies · contacts · leads · messages    │
   │           · replies · events                │
   └─────────────────────────────────────────────┘
                       ▲                  │
                       │ writes (replies) │ approval
                       │                  ▼
                ┌──────────┐         ┌──────────┐
                │  Resend  │◀────────│ Approval │
                │ (in/out) │  sends  │   UI     │
                └──────────┘         └──────────┘
```

Stages, in order:

1. **Scrape** — pull raw leads from sources defined per geo in `icp.geoConfig[geo].fundingSources`. Each scraper is a pure function that returns `NewLead[]`.
2. **Persist** — upsert into `companies`, `contacts`, `leads`. Dedupe on `(companyId, roleUrl)`.
3. **Score** — compute a 0–100 score per lead using `icp.scoringWeights`. Persist `score` + `scoreBreakdown` to the lead. Filter by `hardFilters`.
4. **Draft** — for leads above `icp.outreach.minScoreToQueue`, generate a personalised message via LLM. Save as `messages` row with `status: "draft"`.
5. **Approve** — Akshat reviews drafts in the UI, edits or rejects, marks `status: "approved"`.
6. **Send** — Resend dispatches approved messages, respecting daily caps. Updates `sentAt`, captures `providerMessageId`.
7. **Reply** — Resend inbound webhook writes to `replies`. LLM classifies sentiment. Positives notify Akshat.

## Package responsibilities

| Package | Lives in | Depends on | Purpose |
|---|---|---|---|
| `@job-hunter/icp` | `packages/icp/` | — | Strategy as code. Candidate profile, geos, weights, outreach limits. Pure types + values, no I/O. |
| `@job-hunter/db` | `packages/db/` | `drizzle-orm`, `postgres` | Schema, typed client, migrations. Single source of truth for data model. |
| `@job-hunter/scrapers` | `packages/scrapers/` | `icp` only | One pure function per source — YC, RSS, careers. Returns `ScrapeResult<ScrapedLead>`. No DB writes. See [ADR-003](decisions/003-scrapers-as-pure-functions.md). |
| `@job-hunter/scorer` | *future* | `icp`, `db` | Score function. `(lead, company) → { score, breakdown }`. |
| `@job-hunter/llm` | *future* | `icp`, `db` | Draft messages and classify replies. AI SDK + Anthropic + Gemini. |
| `@job-hunter/email` | *future* | `db` | Resend send/receive. Webhook handlers. |
| `apps/dashboard` | *future* | all of above | Next.js. Approval queue, lead pipeline view, reply inbox. |

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript strict | Catches bugs at compile time; the codebase is small enough that the friction is worth it |
| Module system | ESM (`"type": "module"`) | Modern Node; required for top-level await; matches Next.js |
| Package manager | pnpm 10 | Workspaces work well, fast installs, disk-efficient |
| Build orchestrator | Turborepo | Caches builds across packages; parallel task execution |
| ORM | Drizzle | Best TS inference of any Node ORM; no codegen step; SQL-first |
| Postgres client | postgres.js | Supabase pooler-compatible (PgBouncer transaction mode) — see [ADR-001](decisions/001-postgres-js-over-pg.md) |
| Database | Supabase (Postgres) | Free tier covers dev; managed backups; can swap to bare Postgres later |
| LLM (drafting) | Anthropic Claude + Google Gemini | Claude for nuanced writing, Gemini for cheap classification |
| Email | Resend | Modern API, good deliverability, webhook for replies |
| Workflow engine | Inngest (planned) | Durable async jobs for scrape → score → draft pipelines |
| Hosting | Vercel (likely) | Next.js dashboard + edge functions |

## Conventions (non-negotiable)

These are enforced by Akshat's mentor across every prompt. Future contributors and Claude Code sessions must follow them.

- **ESM imports use explicit `.js` extensions** even though source is `.ts`. `import { x } from "./foo.js"` — Node's ESM resolver requires this. Missing extensions break runtime.
- **Inter-package imports use the package name** (`@job-hunter/icp`), never relative paths.
- **No `any`, no `@ts-ignore`** — fix types, don't suppress.
- **No code comments unless explaining genuinely non-obvious logic.** Self-documenting names > comments.
- **Scope discipline.** Each prompt has an exact file list; don't scaffold beyond it.
- **Workspace packages added to root devDeps** so root-level commands like `node -e "import('@job-hunter/x')..."` work (catch from Prompt 1 — see [its doc](prompts/01-monorepo-and-icp.md)).
- **All timestamps `withTimezone: true`** in the DB.
- **postgres.js with `prepare: false`** — mandatory for Supabase pooler.

## Repo layout

```
job-hunter/
├── docs/                  ← you are here
│   ├── ARCHITECTURE.md
│   ├── prompts/           per-prompt build log
│   └── decisions/         ADRs
├── packages/
│   ├── icp/               strategy as code (Prompt 1)
│   ├── db/                schema + client (Prompt 2)
│   └── scrapers/          YC + RSS + careers (Prompt 3)
├── apps/                  (none yet — workers comes in Prompt 4)
├── package.json           root, declares pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json     all packages extend this
└── .env.example
```
