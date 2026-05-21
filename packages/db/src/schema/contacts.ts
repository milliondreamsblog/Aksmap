import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export type RecentPost = {
  source: "twitter" | "linkedin" | "blog";
  url: string;
  text: string;
  publishedAt: string;
};

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    emailVerified: boolean("email_verified").default(false),
    linkedinUrl: text("linkedin_url"),
    twitterHandle: text("twitter_handle"),
    recentPosts: jsonb("recent_posts").$type<RecentPost[]>(),
    isPrimary: boolean("is_primary").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    companyIdx: index("contacts_company_idx").on(t.companyId),
    emailIdx: index("contacts_email_idx").on(t.email),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
