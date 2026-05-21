import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { leads } from "./leads.js";
import { messageChannelEnum, messageStatusEnum } from "./enums.js";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: messageChannelEnum("channel").notNull(),
    status: messageStatusEnum("status").notNull().default("draft"),

    sequenceStep: integer("sequence_step").notNull().default(1),
    subject: text("subject"),
    body: text("body").notNull(),
    draftedByLlm: boolean("drafted_by_llm").default(true),
    editedByUser: boolean("edited_by_user").default(false),

    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    leadIdx: index("messages_lead_idx").on(t.leadId),
    statusIdx: index("messages_status_idx").on(t.status),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
