// Side-effect import: loads monorepo-root .env.local BEFORE @job-hunter/db
// imports run their Zod validation. Mirrors the pattern from apps/workers/src/env.ts.
//
// Why: Next.js executes server-side modules with cwd=apps/dashboard during build
// and dev. @job-hunter/db's env.ts only checks process.cwd() for .env.local, which
// doesn't exist at that path. This file fills the gap.
//
// IMPORTANT: This must be the very first import in lib/db.ts so its top-level
// dotenv() calls run before any db module is evaluated.

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), ".env.local") });
loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv({ path: resolve(process.cwd(), "../../.env.local") });
loadDotenv({ path: resolve(process.cwd(), "../../.env") });
