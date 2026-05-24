// IMPORTANT: import env-loader FIRST so monorepo-root .env.local is loaded
// before @job-hunter/db's own env.ts runs its Zod validation.
import "./env-loader";

export { db } from "@job-hunter/db";
export * from "@job-hunter/db";
