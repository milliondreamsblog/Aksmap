# ADR 001 — Use postgres.js, not node-postgres (`pg`)

**Status:** accepted (Prompt 2, 2026-05-21)

## Context

Drizzle ORM can sit on top of multiple Postgres drivers. The two viable choices are:

- **node-postgres (`pg`)** — the default in most tutorials. Mature, widely used. Drizzle integration via `drizzle-orm/node-postgres`.
- **postgres.js (`postgres`)** — newer, modern API, tagged-template SQL. Drizzle integration via `drizzle-orm/postgres-js`.

We're connecting to Supabase Postgres. Supabase exposes two endpoints:

- Direct connection (port 5432) — full Postgres feature set
- Pooled connection (port 6543) — PgBouncer in **transaction mode**

For the app's runtime queries we *must* use the pooled connection — direct connections are limited (5–15 depending on plan) and burn out fast. PgBouncer in transaction mode has one important constraint: **it doesn't support server-side prepared statements**.

## Decision

Use **postgres.js** (`postgres`) as the underlying driver, via `drizzle-orm/postgres-js`.

Configure the client with `prepare: false`:

```ts
const queryClient = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 10,
});
```

## Why

1. **PgBouncer transaction-mode compatibility.** `pg` uses prepared statements by default and provides no clean opt-out at the protocol level. Connecting it to Supabase's pooler causes intermittent `prepared statement "..." already exists` errors at runtime, especially under load. postgres.js has a first-class `prepare: false` option that fully disables them.

2. **Recommended by Drizzle docs for Supabase.** The official Drizzle + Supabase guide uses postgres.js. Going against the recommendation would mean fighting both libraries.

3. **Better TypeScript ergonomics.** postgres.js has cleaner types and a tagged-template API. We mostly use Drizzle's query builder so this is marginal, but when we drop to raw SQL (rare), it'll be nicer.

4. **Smaller surface area.** postgres.js is one package; `pg` brings `pg-pool`, `pg-types`, `pg-connection-string`, etc. Less to learn, less to vendor.

## Trade-offs / what we give up

- `pg` has more StackOverflow hits and tutorial content. If you hit an obscure issue, more chance someone else has too. Not a real problem in 2026 — postgres.js is mature.
- Some Postgres-specific libraries assume `pg`. If we add one of those later, we'd either swap or wrap. Unlikely.

## How to apply this in the codebase

- `packages/db/src/client.ts` uses `drizzle-orm/postgres-js`. Don't change to `node-postgres` without revisiting this ADR.
- `prepare: false` on the postgres client is **load-bearing**. Anyone editing `client.ts`: do not remove it. If you need prepared statements (some advanced query optimizations), switch to the direct connection (5432) for that specific use case, don't toggle the flag on the pooled client.

## References

- Supabase docs on connection pooling: https://supabase.com/docs/guides/database/connecting-to-postgres
- Drizzle + Supabase guide: https://orm.drizzle.team/docs/connect-supabase
- PgBouncer transaction mode limitations: https://www.pgbouncer.org/features.html
