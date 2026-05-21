# job-hunter docs

Documentation for the job-hunter monorepo, written alongside the build.

## Start here

- [Architecture](ARCHITECTURE.md) — what this system is, the 8-prompt roadmap, data flow, package responsibilities, tech stack

## Per-prompt build log

Each prompt produces a working slice of the system. These docs record what each prompt built, why the design choices were made, and what deviations from spec happened.

- [Prompt 1 — Monorepo skeleton + ICP package](prompts/01-monorepo-and-icp.md)
- [Prompt 2 — Database schema (Drizzle + Supabase)](prompts/02-database-schema.md)
- [Prompt 3 — Scrapers package (YC + RSS + careers)](prompts/03-scrapers.md)
- Prompt 4 — Workers app (Inngest orchestration) — *coming next*
- Prompts 5–8 — *not yet specified*

## Architecture decision records (ADRs)

Short, focused write-ups of the non-obvious design choices. One file per decision.

- [001 — Why postgres.js, not node-postgres (`pg`)](decisions/001-postgres-js-over-pg.md)
- [002 — ICP as strategy-as-code](decisions/002-icp-as-strategy-as-code.md)
- [003 — Scrapers as pure functions](decisions/003-scrapers-as-pure-functions.md)

## How to use these docs

- **Stuck on what a package does or why?** Start at [ARCHITECTURE.md](ARCHITECTURE.md).
- **Want to understand a specific build step?** Open the matching prompt doc.
- **Questioning a design choice?** Check the ADR — if there isn't one, the choice was probably routine.
- **Reviewing the project end-to-end?** Read in order: architecture → prompts 1..N → ADRs.
