import { db } from "@job-hunter/db/client";
import { messages, leads } from "@job-hunter/db/schema";
import { eq, sql } from "drizzle-orm";
import { draftOutreach } from "@job-hunter/llm";

const DAILY_CAP = 25;
const key = process.env.RESEND_API_KEY;

const sentToday = Number(
  (
    (
      await db.execute(sql`
        select count(*) n from messages
        where status = 'sent' and channel = 'email' and sent_at::date = '2026-06-01'`)
    ).rows ?? []
  )[0]?.n ?? 0,
);
const budget = Math.max(0, DAILY_CAP - sentToday);
console.log(`already sent today: ${sentToday} | budget left: ${budget}`);

const _res = await db.execute(sql`
  select l.id as lead_id, l.score, co.name, co.description,
    co.funding_stage, co.last_funding_amount, co.tech_stack, co.geo, co.is_ai_company,
    l.role_title, l.role_type,
    (select c.email from contacts c
       where c.company_id = co.id and c.email is not null
       order by (c.role is distinct from 'generic-inbox') desc, c.is_primary desc nulls last
       limit 1) as email,
    (select c.name from contacts c
       where c.company_id = co.id and c.email is not null
       order by (c.role is distinct from 'generic-inbox') desc, c.is_primary desc nulls last
       limit 1) as contact_name,
    (select (c.role is distinct from 'generic-inbox') from contacts c
       where c.company_id = co.id and c.email is not null
       order by (c.role is distinct from 'generic-inbox') desc, c.is_primary desc nulls last
       limit 1) as is_named
  from leads l
  join companies co on co.id = l.company_id
  where l.status = 'queued'
    and not exists (select 1 from messages m where m.lead_id = l.id)
    and exists (select 1 from contacts c where c.company_id = co.id and c.email is not null)
  order by l.score desc nulls last
  limit ${budget}`);
const rows = (_res.rows ?? _res).filter((r) => r.email);
console.log(`drafting + sending ${rows.length} emails...\n`);

let sent = 0;
let failed = 0;
for (const r of rows) {
  try {
    const firstName = r.is_named ? (r.contact_name?.split(/\s+/)[0] ?? null) : null;
    const draft = await draftOutreach({
      company: {
        name: r.name,
        description: r.description,
        fundingStage: r.funding_stage,
        fundingAmount: r.last_funding_amount,
        techStack: r.tech_stack,
        geo: r.geo,
        isAiCompany: r.is_ai_company,
      },
      role: { title: r.role_title, type: r.role_type },
      contactFirstName: firstName,
    });

    const [msg] = await db
      .insert(messages)
      .values({
        leadId: r.lead_id,
        channel: "email",
        status: "draft",
        subject: draft.subject,
        body: draft.body,
        draftedByLlm: true,
        editedByUser: false,
        sequenceStep: 1,
      })
      .returning({ id: messages.id });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "Idempotency-Key": `lead-outreach-${msg.id}`,
      },
      body: JSON.stringify({
        from: "Akshat Darshi <akshat@roborumble.in>",
        to: [r.email],
        reply_to: "akshatsan23@gmail.com",
        bcc: ["akshatsan23@gmail.com"],
        subject: draft.subject,
        text: draft.body,
      }),
    });
    const data = await res.json();
    if (res.status !== 200 || !data.id) throw new Error(JSON.stringify(data));

    await db
      .update(messages)
      .set({ status: "sent", sentAt: new Date(), providerMessageId: data.id })
      .where(eq(messages.id, msg.id));
    await db
      .update(leads)
      .set({ status: "sent", decidedAt: new Date() })
      .where(eq(leads.id, r.lead_id));
    sent++;
    console.log(`  ✓ ${r.name} → ${r.email}  "${draft.subject}"`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${r.name}: ${String(e.message).slice(0, 110)}`);
  }
}

console.log(`\nSENT ${sent} | FAILED ${failed}`);
process.exit(0);
