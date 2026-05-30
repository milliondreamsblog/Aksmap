"use server";

// Loads monorepo-root .env.local so the LLM provider keys are available before
// the llm package makes a request. (db.ts pulls this in too, but import it here
// explicitly so the action never depends on import order.)
import "@/lib/env-loader";
import { draftOutreach } from "@job-hunter/llm";
import { getLeadById } from "@/lib/queries";

interface GenerateDraftResult {
  success: boolean;
  subject?: string;
  body?: string;
  provider?: "google" | "openai";
  error?: string;
}

export async function generateDraft(
  leadId: string,
): Promise<GenerateDraftResult> {
  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.OPENAI_API_KEY
  ) {
    return {
      success: false,
      error:
        "No LLM key configured. Add GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY to .env.local.",
    };
  }

  const lead = await getLeadById(leadId);
  if (!lead) return { success: false, error: "Lead not found." };

  const contact = lead.contact ?? lead.company.contacts?.[0] ?? null;
  const firstName = contact?.name?.split(/\s+/)[0] ?? null;

  try {
    const draft = await draftOutreach({
      company: {
        name: lead.company.name,
        description: lead.company.description,
        fundingStage: lead.company.fundingStage,
        fundingAmount: lead.company.lastFundingAmount,
        techStack: lead.company.techStack,
        geo: lead.company.geo,
        isAiCompany: lead.company.isAiCompany,
      },
      role: { title: lead.roleTitle, type: lead.roleType },
      contactFirstName: firstName,
    });

    return {
      success: true,
      subject: draft.subject,
      body: draft.body,
      provider: draft.provider,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate draft.",
    };
  }
}
