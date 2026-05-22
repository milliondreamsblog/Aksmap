import { Inngest, EventSchemas } from "inngest";
import { env } from "../env.js";

export type Events = {
  "scraper/source.completed": {
    data: {
      source: string;
      candidates: number;
      companiesUpserted: number;
      leadsCreated: number;
      errors: number;
    };
  };
  "lead/created": {
    data: { leadId: string; source: string };
  };
  "lead/enriched": {
    data: { leadId: string };
  };
};

// Dev mode is the default. Only "production" disables local Inngest routing.
// This is more permissive than `NODE_ENV === "development"` to handle Windows
// shells where NODE_ENV is undefined.
const isDev = env.NODE_ENV !== "production";
const baseUrl = isDev ? "http://localhost:8288" : undefined;

// Log at module load so the boot log clearly shows which mode we resolved to.
console.log(
  JSON.stringify({
    level: "info",
    msg: "Inngest client initialized",
    isDev,
    baseUrl: baseUrl ?? "default (api.inngest.com)",
    nodeEnv: env.NODE_ENV,
  }),
);

export const inngest = new Inngest({
  id: "job-hunter",
  eventKey: env.INNGEST_EVENT_KEY,
  baseUrl,
  schemas: new EventSchemas().fromRecord<Events>(),
});
