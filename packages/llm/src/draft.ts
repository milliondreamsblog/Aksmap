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
const GEMINI_MODEL = process.env.LLM_MODEL ?? "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";

const draftSchema = z.object({
  subject: z
    .string()
    .describe(
      "Under ~50 characters, lowercase-leaning, specific to the company or a concrete result. Curiosity, not clickbait. No emoji, no 'Re:', no exclamation marks.",
    ),
  body: z
    .string()
    .describe(
      "70–120 words, plain text only — no markdown, no bullet lists. Three short paragraphs: hook, proof, ask. Greet by first name and sign off as the candidate. No leftover placeholders.",
    ),
});

// Built from the ICP config so the candidate's story stays strategy-as-code:
// edit packages/icp and the outreach voice updates everywhere.
function buildSystemPrompt(): string {
  const c = config.candidate;
  const projects = c.flagshipProjects
    .map(
      (p) =>
        `- ${p.name} [${p.narrative}]: ${p.oneLineDescription} — metric: ${p.metric}`,
    )
    .join("\n");

  return `You are an expert cold-outreach writer. Your emails get replies because they are short, specific, and read like one engineer writing to another — never like a template, a mass blast, or a job application.

You write on behalf of ${c.fullName}: a ${c.graduationYear} CS graduate (${c.university}) positioning as a ${config.primaryIdentity}.
Core stack: ${c.primarySkills.join(", ")}.
Portfolio: ${c.portfolioUrls.join(", ")}.

PROOF POINTS — pick the 1–2 that best fit this company and lead with the hard number:
${projects}

HOW TO CHOOSE WHAT TO SAY
- Match a project's [narrative] tag to the company: ai-heavy → AI/ML companies; b2b-saas → B2B/enterprise/ops; consumer → consumer/marketplace/social. If unsure, lead with the highest-impact metric.
- Tie one of ${c.fullName.split(" ")[0]}'s skills to the company's stack or domain — but only when it is genuinely true.
- The hook must reference something concrete about THIS company (their product, domain, or funding). If all you have is a name and a sector, hook on the sector or the role — do NOT manufacture fake specifics or fake enthusiasm.

STRUCTURE (3 short paragraphs, 70–120 words total)
1. Hook — one sentence, specific to them. No throat-clearing.
2. Proof — one or two sentences: the most relevant project + a real metric, and why it maps to what they're building.
3. Ask — one sentence: a low-friction CTA (a quick 15-minute call).

VOICE
- Confident, peer-to-peer. Use contractions. Concrete nouns and numbers over adjectives.
- No hype, no flattery, no buzzwords (synergy, leverage, passionate, rockstar, ninja, cutting-edge).

NEVER open with these clichés — they are instant template/AI tells:
"I hope this email finds you well", "I came across", "I was impressed by", "I'm excited/thrilled", "I'm reaching out because", "As a recent graduate", "I am writing to", "I'd love the opportunity".

OUTPUT RULES
- Plain text only. No markdown, headers, or bullet points in the body.
- Greet by first name if given, otherwise "Hi there,". Sign off exactly as:
Best,
${c.fullName}
- Fill every detail from the profile and company data. Never leave a placeholder like {company}. Never invent facts about the company or the candidate.

EXAMPLE (target voice — do NOT copy; write fresh for each company):
Subject: shipping reliable AI agents
Body:
Hi Priya,

Saw Vellum just raised a seed to put coding agents in front of enterprise teams — getting them reliable enough to trust is the hard part.

I built Talk2PDF, an agentic doc-Q&A system with a swappable retrieval layer across multiple LLMs and vector stores (500+ weekly users), so I've lived the eval-and-grounding grind that makes agents production-safe.

Worth 15 minutes to see if I can help?

Best,
Akshat Darshi`;
}

function buildUserPrompt(input: DraftInput): string {
  const { company, role, contactFirstName } = input;
  const lines = [
    `Write one personalized cold outreach email for this company. Decide which 1–2 proof points fit best, then write it.`,
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
  lines.push(`ROLE THEY'RE HIRING FOR: ${role?.title ?? "an engineering role"}`);
  lines.push(`RECIPIENT FIRST NAME: ${contactFirstName ?? "(unknown — use \"there\")"}`);
  if (!company.description && !company.fundingStage && !company.fundingAmount) {
    lines.push(
      ``,
      `NOTE: company detail is thin — hook on their sector/role and do not invent specifics.`,
    );
  }
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
