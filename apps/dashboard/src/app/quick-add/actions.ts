"use server";

import { db, companies, contacts, leads } from "@/lib/db";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  enrichFromWebsite,
  generateEmailCandidates,
  hasValidMx,
  scoreLead,
} from "@job-hunter/enrichment";
import { config } from "@job-hunter/icp";
import {
  parsePostUrl,
  fetchTweetText,
  extractFromText,
  inferDomain,
} from "@/lib/extract-post";

export interface QuickAddResult {
  success: boolean;
  leadId?: string;
  error?: string;
}

export async function quickAddLead(formData: FormData): Promise<QuickAddResult> {
  const url = (formData.get("url") as string | null)?.trim() ?? "";
  let postText = (formData.get("postText") as string | null)?.trim() ?? "";
  const companyOverride =
    (formData.get("companyName") as string | null)?.trim() ?? "";
  const roleOverride =
    (formData.get("roleTitle") as string | null)?.trim() ?? "";

  // 1. Parse URL
  const source = parsePostUrl(url);
  if (!source) {
    return { success: false, error: "Not a valid Twitter/X or LinkedIn URL." };
  }

  // 2. Fetch tweet text if Twitter and no manual text
  let posterName: string | null = null;
  if (source.platform === "twitter" && !postText) {
    const tweet = await fetchTweetText(url);
    if (tweet) {
      postText = tweet.text;
      posterName = tweet.authorName;
    }
  }

  if (!postText) {
    return {
      success: false,
      error:
        "No post text available. For LinkedIn posts, paste the text manually.",
    };
  }

  // 3. Extract info from text
  const extracted = extractFromText(postText);
  const companyName = companyOverride || extracted.companyName;
  if (!companyName) {
    return {
      success: false,
      error:
        "Could not detect a company name from the post. Please provide it manually.",
    };
  }
  posterName = posterName ?? extracted.posterName;
  const roleTitle = roleOverride || extracted.roleTitle;

  // 4. Infer domain
  const domain = inferDomain(companyName);

  // 5. Upsert company
  const [companyRow] = await db
    .insert(companies)
    .values({ domain, name: companyName })
    .onConflictDoUpdate({
      target: companies.domain,
      set: { updatedAt: new Date() },
    })
    .returning({ id: companies.id });

  if (!companyRow) {
    return { success: false, error: "Failed to create company record." };
  }
  const companyId = companyRow.id;

  // 6. Enrich website (best-effort)
  try {
    const enrichment = await enrichFromWebsite(domain);
    if (enrichment) {
      await db
        .update(companies)
        .set({
          techStack: enrichment.techStack,
          isAiCompany: enrichment.isAiCompany,
          careersUrl: enrichment.careersUrl ?? null,
          description: enrichment.about ?? null,
          websiteScrapedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));
    }
  } catch {
    // enrichment failure is non-fatal
  }

  // 7. Create contact if we have a poster name
  let contactId: string | null = null;
  if (posterName) {
    const emailCandidates = generateEmailCandidates(posterName, domain);
    const firstEmail = emailCandidates[0] ?? null;
    let emailVerified = false;
    if (firstEmail) {
      try {
        emailVerified = await hasValidMx(firstEmail);
      } catch {
        // MX check failure is non-fatal
      }
    }

    const recentPost = {
      source: source.platform as "twitter" | "linkedin",
      url: source.url,
      text: postText.slice(0, 500),
      publishedAt: new Date().toISOString(),
    };

    const [contactRow] = await db
      .insert(contacts)
      .values({
        companyId,
        name: posterName,
        email: firstEmail,
        emailVerified,
        twitterHandle:
          source.platform === "twitter" ? (source.handle ?? null) : null,
        linkedinUrl: source.platform === "linkedin" ? source.url : null,
        recentPosts: [recentPost],
        isPrimary: true,
      })
      .returning({ id: contacts.id });

    contactId = contactRow?.id ?? null;

    if (!contactId) {
      const existing = await db.query.contacts.findFirst({
        where: eq(contacts.companyId, companyId),
      });
      contactId = existing?.id ?? null;
    }
  }

  // 8. Check for existing lead (dedup)
  const existingBySource = await db.query.leads.findFirst({
    where: eq(leads.sourceUrl, source.url),
    columns: { id: true },
  });
  if (existingBySource) {
    return { success: true, leadId: existingBySource.id };
  }

  const existingByCompany = await db.query.leads.findFirst({
    where: and(eq(leads.companyId, companyId), isNull(leads.roleUrl)),
    columns: { id: true },
  });
  if (existingByCompany) {
    return { success: true, leadId: existingByCompany.id };
  }

  // 9. Create lead
  const [leadRow] = await db
    .insert(leads)
    .values({
      companyId,
      contactId,
      source: source.platform,
      sourceUrl: source.url,
      sourcePayload: { postText, posterName, extractedBy: "quick-add" },
      roleTitle,
      status: "enriched",
      enrichedAt: new Date(),
    })
    .returning({ id: leads.id });

  if (!leadRow) {
    return {
      success: false,
      error: "Failed to create lead.",
    };
  }
  const leadId = leadRow.id;

  // 10. Score
  try {
    const freshCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (freshCompany) {
      const scoreResult = scoreLead({
        fundingStage: freshCompany.fundingStage,
        lastFundingDate: freshCompany.lastFundingDate
          ? new Date(freshCompany.lastFundingDate)
          : null,
        headcount: freshCompany.headcount,
        isAiCompany: freshCompany.isAiCompany ?? false,
        geo: freshCompany.geo,
        techStack: (freshCompany.techStack as string[] | null) ?? [],
        roleType: null,
        isRemote: null,
        isJuniorFriendly: null,
        hiringSignal: freshCompany.careersUrl !== null,
      });

      const newStatus =
        scoreResult.score >= config.outreach.minScoreToQueue
          ? "queued"
          : "scored";

      await db
        .update(leads)
        .set({
          score: scoreResult.score,
          scoreBreakdown: scoreResult.breakdown,
          status: newStatus,
          scoredAt: new Date(),
          queuedAt: newStatus === "queued" ? new Date() : null,
        })
        .where(eq(leads.id, leadId));
    }
  } catch {
    // scoring failure is non-fatal — lead still exists with status "enriched"
  }

  // 11. Revalidate
  revalidatePath("/leads");

  return { success: true, leadId };
}
