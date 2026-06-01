import { db, leads, companies, contacts } from "@job-hunter/db";
import { eq } from "drizzle-orm";
import {
  enrichFromWebsite,
  generateEmailCandidates,
  genericInboxCandidates,
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
      let inserted = 0;

      for (const person of enrichment?.candidatePeople.slice(0, 3) ?? []) {
        const candidates = generateEmailCandidates(person.name, ctx.domain);
        const firstCandidate = candidates[0];
        if (!firstCandidate) continue;
        const mxValid = await hasValidMx(firstCandidate);

        await db
          .insert(contacts)
          .values({
            companyId: ctx.companyId,
            name: person.name,
            role: person.role ?? null,
            email: firstCandidate,
            emailVerified: mxValid,
            isPrimary: inserted === 0,
          })
          .onConflictDoNothing();
        inserted++;
      }

      // No named person on the site — fall back to a role-based inbox so the
      // company is still reachable. MX-check the domain (not the website) so
      // this works even when the homepage was unreachable. Skip dead domains.
      if (inserted === 0) {
        const generic = genericInboxCandidates(ctx.domain)[0];
        if (generic && (await hasValidMx(generic))) {
          await db
            .insert(contacts)
            .values({
              companyId: ctx.companyId,
              name: "Founder",
              role: "generic-inbox",
              email: generic,
              emailVerified: true,
              isPrimary: true,
            })
            .onConflictDoNothing();
          inserted++;
        }
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
