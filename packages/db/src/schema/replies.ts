import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { messages } from "./messages.js";
import { replySentimentEnum } from "./enums.js";

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    sentiment: replySentimentEnum("sentiment"),
    llmAnalysis: jsonb("llm_analysis"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    rawPayload: jsonb("raw_payload"),
  },
  (t) => ({
    messageIdx: index("replies_message_idx").on(t.messageId),
    sentimentIdx: index("replies_sentiment_idx").on(t.sentiment),
  }),
);

export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
