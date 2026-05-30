import { db, leads, companies, contacts } from "@job-hunter/db";
import { eq } from "drizzle-orm";
import {
  enrichFromWebsite,
  generateEmailCandidates,
  hasValidMx,
} from "@job-hunter/enrichment";
import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";

export const enrichLeadJob = inngest.createFunction(
  {
    id: "enrich-lead",
    name: "Enrich lead from company website",
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: "lead/created" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const ctx = await step.run("load-lead", async () => {
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, leadId),
        with: { company: true },
      });
      if (!lead) throw new Error(`Lead ${leadId} not found`);
      if (!lead.company.domain) {
        throw new Error(`Lead ${leadId} has no domain`);
      }
      return {
        leadId,
        companyId: lead.companyId,
        domain: lead.company.domain,
        companyName: lead.company.name,
      };
    });

    const enrichment = await step.run("fetch-website", async () => {
      const result = await enrichFromWebsite(ctx.domain);
      if (!result) {
        logger.warn("Website unreachable", { domain: ctx.domain });
      }
      return result;
    });

    if (enrichment) {
      await step.run("update-company", async () => {
        await db
          .update(companies)
          .set({
            techStack: enrichment.techStack,
            isAiCompany: enrichment.isAiCompany,
            // postgres.js rejects `undefined` (only `null` is allowed), and
            // these enrichment fields are optional — coerce to null.
            careersUrl: enrichment.careersUrl ?? null,
            description: enrichment.about ?? null,
            websiteScrapedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(companies.id, ctx.companyId));
      });
    }

    const contactCount = await step.run("derive-contacts", async () => {
      if (!enrichment || enrichment.candidatePeople.length === 0) return 0;

      let inserted = 0;
      for (const person of enrichment.candidatePeople.slice(0, 3)) {
        const candidates = generateEmailCandidates(person.name, ctx.domain);
        if (candidates.length === 0) continue;

        const firstCandidate = candidates[0];
        if (!firstCandidate) continue;
        const mxValid = await hasValidMx(firstCandidate);

        const email = firstCandidate;

        await db
          .insert(contacts)
          .values({
            companyId: ctx.companyId,
            name: person.name,
            role: person.role ?? null,
            email,
            emailVerified: mxValid,
            isPrimary: inserted === 0,
          })
          .onConflictDoNothing();
        inserted++;
      }
      return inserted;
    });

    await step.run("mark-enriched", async () => {
      await db
        .update(leads)
        .set({ status: "enriched", enrichedAt: new Date() })
        .where(eq(leads.id, leadId));
    });

    await step.sendEvent("emit-enriched", {
      name: "lead/enriched",
      data: { leadId },
    });

    return {
      leadId,
      domain: ctx.domain,
      websiteReachable: enrichment !== null,
      techStack: enrichment?.techStack ?? [],
      contactsCreated: contactCount,
    };
  },
);
