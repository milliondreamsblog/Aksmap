"use server";

import { db, leads, messages } from "@/lib/db";
import { resend, SENDER_EMAIL, SENDER_NAME } from "@/lib/resend";
import { config } from "@job-hunter/icp";
import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface SendEmailInput {
  leadId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { leadId, recipientEmail, recipientName, subject, body } = input;

  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY not configured. Add it to .env.local.",
    };
  }

  if (!recipientEmail) {
    return { success: false, error: "No recipient email address." };
  }

  // 1. Daily limit check
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.channel, "email"),
        eq(messages.status, "sent"),
        gte(messages.sentAt, todayStart),
      ),
    );

  const dailyLimit = config.outreach.emailsPerDay;
  if ((countRow?.count ?? 0) >= dailyLimit) {
    return {
      success: false,
      error: `Daily email limit reached (${dailyLimit}). Try again tomorrow.`,
    };
  }

  // 2. Insert message row (status: "sending")
  const [msg] = await db
    .insert(messages)
    .values({
      leadId,
      channel: "email",
      status: "sending",
      subject,
      body,
      draftedByLlm: false,
      editedByUser: true,
      sequenceStep: 1,
    })
    .returning({ id: messages.id });

  if (!msg) {
    return { success: false, error: "Failed to create message record." };
  }

  // 3. Send via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [recipientEmail],
      replyTo: config.candidate.email,
      // BCC self so a copy lands in the candidate's own inbox (roborumble.in
      // has no mailbox; this is the only Gmail-side archive of outbound mail).
      bcc: [config.candidate.email],
      subject,
      text: body,
    });

    if (error || !data) {
      await db
        .update(messages)
        .set({ status: "failed" })
        .where(eq(messages.id, msg.id));

      return {
        success: false,
        error: error?.message ?? "Unknown Resend error",
      };
    }

    // 4. Mark message as sent
    await db
      .update(messages)
      .set({
        status: "sent",
        providerMessageId: data.id,
        sentAt: new Date(),
      })
      .where(eq(messages.id, msg.id));

    // 5. Update lead status to "sent"
    await db
      .update(leads)
      .set({ status: "sent", decidedAt: new Date() })
      .where(eq(leads.id, leadId));

    // 6. Revalidate
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");

    return { success: true, messageId: data.id };
  } catch (err) {
    await db
      .update(messages)
      .set({ status: "failed" })
      .where(eq(messages.id, msg.id));

    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
