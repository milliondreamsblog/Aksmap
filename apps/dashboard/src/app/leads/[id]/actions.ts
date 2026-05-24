"use server";

import { db, leads } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = [
  "raw",
  "enriching",
  "enriched",
  "scored",
  "queued",
  "approved",
  "sent",
  "replied",
  "rejected",
  "archived",
] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

export async function updateLeadStatus(leadId: string, status: string) {
  if (!VALID_STATUSES.includes(status as LeadStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await db
    .update(leads)
    .set({
      status: status as LeadStatus,
      decidedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { success: true };
}
