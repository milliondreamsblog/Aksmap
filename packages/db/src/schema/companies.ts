import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domain: text("domain").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    geo: text("geo"),
    hqLocation: text("hq_location"),
    headcount: integer("headcount"),
    fundingStage: text("funding_stage"),
    lastFundingDate: timestamp("last_funding_date", { withTimezone: true }),
    lastFundingAmount: text("last_funding_amount"),
    techStack: jsonb("tech_stack").$type<string[]>(),
    industry: text("industry"),
    isAiCompany: boolean("is_ai_company").default(false),
    careersUrl: text("careers_url"),
    websiteScrapedAt: timestamp("website_scraped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    domainUnique: uniqueIndex("companies_domain_unique").on(t.domain),
    geoIdx: index("companies_geo_idx").on(t.geo),
    fundingIdx: index("companies_funding_idx").on(t.lastFundingDate),
  }),
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
