import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { contacts } from "./contacts.js";
import { leadStatusEnum } from "./enums.js";

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    contactId: uuid("contact_id").references(() => contacts.id),

    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    sourcePayload: jsonb("source_payload"),

    roleTitle: text("role_title"),
    roleType: text("role_type"),
    roleUrl: text("role_url"),
    isRemote: boolean("is_remote"),
    isJuniorFriendly: boolean("is_junior_friendly"),

    score: real("score"),
    scoreBreakdown: jsonb("score_breakdown").$type<Record<string, number>>(),

    status: leadStatusEnum("status").notNull().default("raw"),

    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    queuedAt: timestamp("queued_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),

    notes: text("notes"),
  },
  (t) => ({
    statusIdx: index("leads_status_idx").on(t.status),
    scoreIdx: index("leads_score_idx").on(t.score),
    companyIdx: index("leads_company_idx").on(t.companyId),
    dedupIdx: uniqueIndex("leads_dedup_idx").on(t.companyId, t.roleUrl),
  }),
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
