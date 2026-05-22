import { EventSchemas, Inngest } from "inngest";
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
};

export const inngest = new Inngest({
  id: "job-hunter",
  eventKey: env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});
