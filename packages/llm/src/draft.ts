import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { config } from "@job-hunter/icp";
import type { DraftInput, DraftOutput } from "./types.js";

// Primary: Gemini 2.5 Flash (free tier). Fallback: gpt-4o-mini.
// Provider instances read their keys (GOOGLE_GENERATIVE_AI_API_KEY /
// OPENAI_API_KEY) lazily at request time, so constructing both is safe even
// when only one key is set.
const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";

const draftSchema = z.object({
  subject: z
    .string()
    .describe("Subject line under 60 chars, specific to the company. No clickbait, no emoji."),
  body: z
    .string()
    .describe(
      "Email body, 90–140 words, plain text only (no markdown). Greet the recipient by first name and sign off as the candidate.",
    ),
});

// Built from the ICP config so the candidate's story stays strategy-as-code:
// edit packages/icp and the outreach voice updates everywhere.
function buildSystemPrompt(): string {
  const c = config.candidate;
  const projects = c.flagshipProjects
    .map(
      (p) =>
        `- ${p.name} [${p.narrative}]: ${p.oneLineDescription} (metrics: ${p.metric})`,
    )
    .join("\n");

  return `You write cold outreach emails on behalf of ${c.fullName}, a ${c.graduationYear} CS graduate from ${c.university} targeting AI-engineer / founding-engineer roles.

CANDIDATE PROFILE
Primary identity: ${config.primaryIdentity}
Core skills: ${c.primarySkills.join(", ")}
Portfolio: ${c.portfolioUrls.join(", ")}

Flagship projects (choose the 1–2 MOST relevant to the target company):
${projects}

WRITING RULES
- Voice: confident, concise, peer-to-peer. Never desperate, salesy, or buzzword-heavy.
- Open with a specific, genuine hook about THIS company (their funding, product, or domain) — never generic flattery.
- Reference at most TWO flagship projects, chosen to match what the company builds. Lead with concrete metrics.
- 90–140 words total. Short paragraphs. Plain text only — no markdown, no bullet lists.
- Close with a soft, low-friction CTA (e.g. a 15-minute chat).
- Greet by first name if given, otherwise "there". Sign off as "${c.fullName}".
- Never invent facts about the company or the candidate. Use only the profile above and the company details provided.`;
}

function buildUserPrompt(input: DraftInput): string {
  const { company, role, contactFirstName } = input;
  const lines = [
    `Write a personalized outreach email to this company.`,
    ``,
    `COMPANY: ${company.name}`,
  ];
  if (company.description) lines.push(`What they do: ${company.description}`);
  if (company.fundingStage) lines.push(`Funding stage: ${company.fundingStage}`);
  if (company.fundingAmount) lines.push(`Last funding: ${company.fundingAmount}`);
  if (company.techStack?.length)
    lines.push(`Tech stack: ${company.techStack.join(", ")}`);
  if (company.isAiCompany) lines.push(`This is an AI-focused company.`);
  if (company.geo) lines.push(`Region: ${company.geo}`);
  lines.push(`ROLE: ${role?.title ?? "an engineering role"}`);
  lines.push(`RECIPIENT FIRST NAME: ${contactFirstName ?? "there"}`);
  return lines.join("\n");
}

export async function draftOutreach(input: DraftInput): Promise<DraftOutput> {
  const system = buildSystemPrompt();
  const prompt = buildUserPrompt(input);

  const run = async (
    model: Parameters<typeof generateObject>[0]["model"],
  ) => {
    const { object } = await generateObject({
      model,
      schema: draftSchema,
      system,
      prompt,
      temperature: 0.7,
    });
    return object;
  };

  // Primary: Gemini. Fall back to OpenAI on any error (rate limit, quota,
  // outage) as long as an OpenAI key is configured.
  try {
    const object = await run(google(GEMINI_MODEL));
    return { ...object, provider: "google" };
  } catch (geminiErr) {
    const reason =
      geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
    console.warn(`[llm] Gemini failed, falling back to OpenAI: ${reason}`);
    if (!process.env.OPENAI_API_KEY) throw geminiErr;
    const object = await run(openai(OPENAI_MODEL));
    return { ...object, provider: "openai" };
  }
}
