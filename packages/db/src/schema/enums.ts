import { pgEnum } from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
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
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "email",
  "linkedin",
  "twitter",
  "careers_form",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "draft",
  "approved",
  "sending",
  "sent",
  "bounced",
  "failed",
]);

export const replySentimentEnum = pgEnum("reply_sentiment", [
  "positive",
  "neutral",
  "negative",
  "auto_reject",
  "auto_other",
]);
