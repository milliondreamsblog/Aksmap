import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

loadDotenv({ path: resolve(process.cwd(), "../../.env.local") });
loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set for drizzle-kit");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
