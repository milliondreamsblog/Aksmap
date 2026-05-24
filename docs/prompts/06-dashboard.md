# Prompt 6 — Dashboard (Next.js 15)

**Status:** built. `next build` produces all 6 routes; typecheck passes 10/10 tasks. Not yet manually verified in browser (user runs `pnpm --filter @job-hunter/dashboard dev`).

## What it produced

`apps/dashboard` — a Next.js 15 App Router review UI for the leads pipeline. Server-rendered as much as possible (RSCs for data fetching), client components only where needed (filter pills, template editor, copy-to-clipboard, status mutations).

Three pages + a detail route:

- **`/leads`** — filter pills + sortable lead table. Default sort: highest score first.
- **`/leads/[id]`** — company card, contact card, score breakdown, message drafter (3 default templates with `{placeholder}` substitution), action bar (open careers, LinkedIn search, mark sent/reject/archive).
- **`/stats`** — total counts + status funnel.
- **`/templates`** — edit templates, saved to `localStorage` (no DB table).

## Pages and components

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← root layout with Sidebar
│   │   ├── page.tsx                ← redirects to /leads
│   │   ├── leads/
│   │   │   ├── page.tsx            ← list (RSC, force-dynamic)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        ← detail (RSC, force-dynamic)
│   │   │       └── actions.ts      ← server action: updateLeadStatus
│   │   ├── stats/page.tsx          ← stats (RSC, force-dynamic)
│   │   ├── templates/page.tsx      ← editor (client, localStorage)
│   │   └── globals.css             ← Tailwind directives + scrollbar
│   ├── components/
│   │   ├── shared/Sidebar.tsx
│   │   ├── ui/card.tsx
│   │   ├── lead-list/LeadTable.tsx
│   │   └── lead-detail/
│   │       ├── CompanyCard.tsx
│   │       ├── ContactCard.tsx
│   │       ├── ScoreCard.tsx
│   │       ├── MessageDrafter.tsx  ← client; template substitution + copy
│   │       └── ActionBar.tsx       ← client; uses server action
│   ├── lib/
│   │   ├── db.ts                   ← re-exports @job-hunter/db (env-loader hook)
│   │   ├── env-loader.ts           ← NEW (not in spec) — see deviation #5
│   │   ├── queries.ts              ← typed Drizzle queries
│   │   ├── templates.ts            ← DEFAULT_TEMPLATES + applyTemplate
│   │   └── format.ts               ← score/status colors, relative dates
│   └── types/leads.ts              ← LeadDetail (was Awaited, renamed)
```

## Deviations from spec (7)

1. **`types/leads.ts` — renamed `Awaited` → `LeadDetail`.** Spec had:
   ```ts
   export type Awaited = Awaited<ReturnType<typeof getLeadById>>;
   ```
   This **shadows the built-in `Awaited<T>` utility**, so the right-hand side circularly references the new alias. TS rejects. Renamed to `LeadDetail = NonNullable<Awaited<ReturnType<...>>>` and updated the three card components (`CompanyCard`, `ContactCard`, `ScoreCard`) plus `MessageDrafter` to import the new name.

2. **Stripped `<a>` tags fixed in `ContactCard.tsx` and `ActionBar.tsx`.** Same markdown-strips-angle-brackets issue from prior prompts — the opening `<a` got eaten, leaving fragments like `\n        href={...}`. Restored to valid JSX.

3. **`buildContext` parameter type loosened.** Spec typed it as `LeadWithRelations` (from `getLeads`, where `company` doesn't include nested `contacts`), then called it from `MessageDrafter` with `lead as unknown as LeadWithRelations` cast. Internal code accesses `company.contacts?.[0]` which TS rejects on the spec's typed shape. Defined a permissive `LeadForContext` interface in `templates.ts` that both query result shapes structurally satisfy; dropped the `as unknown as` cast at the call site.

4. **`as Record<string, string>` cast → cast through `unknown`** in `templates.ts:applyTemplate`. Spec's direct cast triggered `TS2352`. Standard pattern is `as unknown as Record<string, string>`.

5. **Added `src/lib/env-loader.ts`** (NOT in spec). The spec's note — "the dashboard reads DATABASE_URL from the monorepo root's .env.local automatically because @job-hunter/db loads it" — is **incorrect**. `@job-hunter/db`'s `env.ts` only checks `process.cwd()/.env.local` and `process.cwd()/.env`. When Next.js runs `Collecting page data` during build, cwd is `apps/dashboard/`, and `.env.local` doesn't exist there. Build failed with `Invalid DB environment variables: { DATABASE_URL: [ 'Required' ] }`. The env-loader mirrors the workers app's pattern: a side-effect import that loads dotenv from `cwd`, `cwd/.env`, `cwd/../../.env.local`, and `cwd/../../.env`. Imported as the very first statement in `lib/db.ts` so dotenv runs before `@job-hunter/db`'s Zod validation. Required adding `dotenv` to dashboard deps.

6. **Updated `queries.ts` and `actions.ts` to import from `@/lib/db` (not `@job-hunter/db` directly).** Required for deviation #5 to work — if anything imports `@job-hunter/db` directly, db's env.ts evaluates before our env-loader hook fires.

7. **Dropped `.js` extensions on dashboard-internal imports** (`./env-loader.js` → `./env-loader`, `./db.js` → `./db`). Next.js webpack doesn't follow the ESM `.js` → `.ts` mapping for intra-app imports — that rule is workspace-package-only (icp/db/scrapers/enrichment/workers). For Next.js app code, the convention is no extension. Inter-package imports across workspaces still use the package name (`@job-hunter/icp`), unchanged.

## SLOC per major file

| File | Lines |
|---|---|
| `src/components/lead-list/LeadTable.tsx` | ~155 |
| `src/components/lead-detail/MessageDrafter.tsx` | ~135 |
| `src/lib/templates.ts` | ~135 |
| `src/app/templates/page.tsx` | ~130 |
| `src/components/lead-detail/ActionBar.tsx` | ~110 |
| `src/lib/queries.ts` | ~80 |
| `src/components/lead-detail/CompanyCard.tsx` | ~70 |
| `src/components/lead-detail/ContactCard.tsx` | ~60 |
| `src/app/leads/[id]/page.tsx` | ~55 |
| `src/app/stats/page.tsx` | ~55 |
| `src/lib/format.ts` | ~40 |
| `src/components/shared/Sidebar.tsx` | ~35 |
| `src/components/lead-detail/ScoreCard.tsx` | ~30 |
| `src/app/leads/[id]/actions.ts` | ~30 |
| `src/app/leads/page.tsx` | ~30 |
| `src/app/layout.tsx` | ~25 |
| `src/components/ui/card.tsx` | ~20 |
| `src/lib/env-loader.ts` | ~15 |
| `src/lib/db.ts` | ~7 |
| `src/app/page.tsx` | ~5 |
| `src/types/leads.ts` | ~3 |
| **Total source code** | **~1,225 lines** |

Plus config (package.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts, globals.css, next-env.d.ts) ≈ 130 lines.

## What was compromised

- **No shadcn install** — spec listed `components/ui/` as a shadcn directory and `components.json` in the file list, but only defined a hand-rolled `Card` primitive. I didn't run `npx shadcn add ...` (no internet flow required, and the spec didn't actually need any installed shadcn components). All other "UI primitives" are inlined as classed `<button>` and `<select>` elements with raw Tailwind classes. If you want polished shadcn components (Button, Select, Dialog, etc.) later, run `npx shadcn@latest init` once and add components incrementally.
- **No `components/lead-list/StatusPills.tsx` or `LeadRow.tsx`** — spec listed them in the directory tree but didn't define them. Consolidated into `LeadTable.tsx` (the `Pill` and inline row markup), which is what the spec's actual `LeadTable.tsx` code did anyway.
- **No `EmptyState.tsx` component** — listed but not defined. Inlined as a `<div>` in `LeadTable.tsx`.
- **No `lead/created` event emission from the action bar** — only DB status transition. Should be enough for the v1 UI (the user does the actual outreach, the system just tracks state).

## Build output (Next.js production build)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      127 B         103 kB
├ ○ /_not-found                            993 B         104 kB
├ ƒ /leads                               1.58 kB         104 kB
├ ƒ /leads/[id]                           4.7 kB         111 kB
├ ƒ /stats                                 127 B         103 kB
└ ○ /templates                           3.12 kB         106 kB
+ First Load JS shared by all             103 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Three dynamic routes (`/leads`, `/leads/[id]`, `/stats`) because of `dynamic = "force-dynamic"` — they hit the DB on every request. `/templates` is static (localStorage-only). `/_not-found` is Next.js's built-in 404.

## Verification commands

```bash
pnpm build       # 6/6 tasks successful, 1m21s
pnpm typecheck   # 10/10 tasks successful
```

Manual verification needs user action (I'm avoiding running `next dev` from my side after the port-leak incidents):

```bash
pnpm --filter @job-hunter/dashboard dev
# → "▲ Next.js 15.x.x" followed by "✓ Ready in ~3s"
# → open http://localhost:3000
```

## What to remember from this prompt

- **Workspace packages use `.js` extensions in intra-package imports** (icp, db, scrapers, enrichment, workers). **Next.js apps don't** — webpack's resolver handles `.ts`/`.tsx` directly without that hint. Don't add `.js` to dashboard-internal imports.
- **Dashboard env loading is non-trivial.** `@job-hunter/db`'s env.ts only looks at `process.cwd()`. Any future Next.js app in this monorepo needs the same `env-loader.ts` pattern (or we should fix db's env.ts to look at monorepo root too — see "future maintenance" below).
- **All db imports must route through `@/lib/db`** in the dashboard. Importing `@job-hunter/db` directly bypasses the env-loader. If you add new server-side code that needs the db, use `@/lib/db`.
- **`buildContext` accepts both query result shapes** (`LeadWithRelations` from `getLeads` and `LeadDetail` from `getLeadById`) via the permissive `LeadForContext` interface. If you change either query's shape, update `LeadForContext` to match.
- **Server actions live in `app/<route>/actions.ts`** with `"use server"` at top. Only one action exists so far (`updateLeadStatus`). Future actions (e.g., bulk archive, send email) should also use `revalidatePath` to refresh the UI.

## Future maintenance candidates

- **Move env loading into `@job-hunter/db`** so the package looks at `../../.env.local` itself. That would eliminate the need for every consuming app to write its own env-loader. Low priority — current pattern works.
- **Add `turbo.json` outputs for dashboard build** — currently turbo logs `WARNING no output files found for task @job-hunter/dashboard#build`. Adding `".next/**"` to the build task outputs would let turbo cache the build. Not critical for local dev.
- **Sharp/unrs-resolver postinstalls ignored** — pnpm 10 blocked their build scripts. Next.js works fine without them (sharp is optional for image optimization, which we don't use). If image perf matters later, add to `pnpm.onlyBuiltDependencies`.
