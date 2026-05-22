import { db, leads } from "@job-hunter/db";
import { eq } from "drizzle-orm";
import { scoreLead } from "@job-hunter/enrichment";
import { config } from "@job-hunter/icp";
import type { RoleMatch } from "@job-hunter/icp";
import { inngest } from "./client.js";
import { logger } from "../lib/logger.js";

export const scoreLeadJob = inngest.createFunction(
  {
    id: "score-lead",
    name: "Score lead against ICP",
    concurrency: { limit: 10 },
    retries: 1,
  },
  { event: "lead/enriched" },
  async ({ event, step }) => {
    const { leadId } = event.data;

    const inputs = await step.run("load-inputs", async () => {
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, leadId),
        with: { company: true },
      });
      if (!lead) throw new Error(`Lead ${leadId} not found`);

      return {
        lead,
        company: lead.company,
      };
    });

    const result = await step.run("compute-score", async () => {
      const scoreResult = scoreLead({
        fundingStage: inputs.company.fundingStage,
        lastFundingDate: inputs.company.lastFundingDate
          ? new Date(inputs.company.lastFundingDate)
          : null,
        headcount: inputs.company.headcount,
        isAiCompany: inputs.company.isAiCompany ?? false,
        geo: inputs.company.geo,
        techStack: inputs.company.techStack ?? [],
        roleType: (inputs.lead.roleType as RoleMatch | null) ?? null,
        isRemote: inputs.lead.isRemote,
        isJuniorFriendly: inputs.lead.isJuniorFriendly,
        hiringSignal: inputs.company.careersUrl !== null,
      });

      logger.info("Scored lead", {
        leadId,
        score: scoreResult.score,
        threshold: config.outreach.minScoreToQueue,
      });

      return scoreResult;
    });

    await step.run("persist-score", async () => {
      const newStatus =
        result.score >= config.outreach.minScoreToQueue
          ? "queued"
          : "archived";

      await db
        .update(leads)
        .set({
          score: result.score,
          scoreBreakdown: result.breakdown,
          status: newStatus,
          scoredAt: new Date(),
          queuedAt: newStatus === "queued" ? new Date() : null,
        })
        .where(eq(leads.id, leadId));
    });

    return {
      leadId,
      score: result.score,
      status:
        result.score >= config.outreach.minScoreToQueue
          ? "queued"
          : "archived",
    };
  },
);
