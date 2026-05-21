# Prompt 1 — Monorepo skeleton + ICP package

**Status:** done · **Commit:** see git log for `feat: monorepo skeleton + icp package`

## What it produced

A working pnpm + Turborepo workspace with one shared package — `@job-hunter/icp` — that holds the candidate strategy as typed config. After this prompt, `pnpm build` succeeds and you can `import { config } from "@job-hunter/icp"` from anywhere in the monorepo.

## Files created

```
package.json                ← root, declares workspace + scripts
pnpm-workspace.yaml         ← tells pnpm which folders are packages
turbo.json                  ← build/dev/lint/typecheck tasks
tsconfig.base.json          ← strict TS config every package extends
.env.example                ← env var placeholders (filled in later prompts)
.gitignore
.nvmrc
README.md
packages/icp/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            ← re-exports
    ├── types.ts            ← Geo, RoleMatch, IcpConfig, etc.
    └── config.ts           ← the actual values + helper functions
```

## Why a monorepo

Every downstream package (scrapers, scorer, LLM, email, dashboard) needs to read the ICP. If ICP lived in just one app, the others would need it copy-pasted or imported via a published npm package — both bad. A monorepo with workspace packages means one source of truth, instant TS inference across boundaries, and shared tooling.

## Why pnpm + Turborepo (vs npm + Nx, etc.)

- **pnpm** has the best workspace ergonomics in 2026 — fast installs, content-addressable store (saves disk), strict by default (no phantom deps).
- **Turborepo** caches per-package builds and runs them in parallel. For a 6-package monorepo it pays off immediately.
- **Why not Nx?** Heavier, more opinionated, generates more boilerplate. Overkill here.
- **Why not Bun workspaces?** Still less mature than pnpm. Maybe in a year.

## Why ESM + strict TypeScript + `.js` extensions

- **ESM** is the modern Node module system; required for top-level `await`, matches Next.js's frontend module system, supported by every modern tool.
- **TS strict mode** (with `noUncheckedIndexedAccess` and friends) catches bugs at compile time. The friction is low because the codebase is small.
- **`.js` extensions in TS source** is the part that surprises people: Node's ESM resolver doesn't auto-resolve extensions. Even if the source file is `foo.ts`, you must write `import { x } from "./foo.js"` — the TS compiler emits the import as-is, and at runtime that `.js` path matches the compiled output. Skipping this breaks at runtime, not at build time. Burned by this once already; that's why it's a hard rule.

## The ICP package

The whole point. Strategy lives in code, not in your head or a Notion doc.

### What's in it

- **`CandidateProfile`** — name, email, grad year, skills, portfolio URLs, flagship projects with narrative tagging (`ai-heavy` / `b2b-saas` / `consumer`)
- **`activeGeos`** — which geographies the system is currently targeting (`india`, `singapore_sea` active by default; USA/EU/Japan-Korea dormant)
- **`geoConfig`** — per-geo metadata: timezone, language, funding-news RSS feeds, whether visa signals matter
- **`scoringWeights`** — eight factors summing to 1.0 (recently funded, stack match, hiring signal, small team, junior-friendly, geo match, AI company, remote-friendly)
- **`hardFilters`** — kill-switches (max headcount 500, exclude gambling/adult, etc.)
- **`roleWeights`** — multipliers for role types (AI/ML = 1.0, founding = 0.95, frontend = 0.4)
- **`outreach`** — daily caps (25 emails, 15 LinkedIn DMs, 5 Twitter DMs, min score 60 to queue)

### Helper functions

- `activeGeosList()` — returns the geos where `activeGeos[geo] === true`
- `activeFundingSources()` — flattens all RSS URLs across active geos (what scrapers iterate over)
- `isActiveGeo(geo)` — boolean check
- `getProjectsByNarrative("ai-heavy")` — filters flagship projects by their narrative tag, used by the LLM later to pick which 2–3 projects to highlight in a given outreach message

### How it'll be used downstream

| Consumer | Reads from ICP |
|---|---|
| Scrapers | `activeGeosList()`, `geoConfig[geo].fundingSources` |
| Scorer | `scoringWeights`, `hardFilters`, `roleWeights` |
| LLM (drafter) | `candidate.*`, `getProjectsByNarrative(...)`, `primaryIdentity` |
| Email/outreach | `outreach.emailsPerDay`, `outreach.minScoreToQueue` |
| Dashboard | everything, for the "current strategy" view |

### Narrative tagging — the unusual part

Each flagship project has a `narrative` tag. When the LLM drafts a message, it picks 2–3 projects matching the target company's likely interest:

- AI lab or AI-heavy SaaS → lead with **Talk2PDF** + **IEEE Publication**
- B2B SaaS / enterprise → lead with **BuildEnfra ERP**
- Consumer / D2C → lead with **Bawarchie**

This is positioning, automated. Without it, every cold email would either name-drop everything (cluttered) or rely on the LLM guessing which project to highlight (noisy).

## Deviations from spec

These were called out at the time and approved by the mentor:

1. **`packageManager: pnpm@10.26.1`** instead of the spec's `pnpm@9.12.0` — matched the installed version to avoid corepack downloads.
2. **Added `@job-hunter/icp: workspace:*` to root devDependencies.** Without this, the verification command `node -e "import('@job-hunter/icp')..."` from the repo root fails with `ERR_MODULE_NOT_FOUND` — pnpm doesn't symlink a workspace package into root `node_modules` unless something in root depends on it. Pattern continued in every subsequent prompt.
3. **Clean script** used `rm -rf` (UNIX-only). Replaced with `rimraf` in Prompt 2 for cross-platform compatibility.

## Verification

```bash
pnpm install
pnpm build       # both packages compile
pnpm typecheck   # no type errors
node -e "import('@job-hunter/icp').then(m => console.log(m.config.primaryIdentity, m.activeGeosList()))"
# Expected: ai-engineer [ 'india', 'singapore_sea' ]
```

## What to remember from this prompt

- The ICP is load-bearing. Every future package reads it. A casual edit (e.g. flipping `usa_remote: true`) instantly retargets the entire system on next scrape — that's the design intent.
- The `.js` extension rule is non-negotiable. Future prompts assume it.
- Workspace packages must be in root devDeps for root-level commands to resolve them.
