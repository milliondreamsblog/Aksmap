import type { Geo, RoleMatch } from "@job-hunter/icp";

export interface ScrapeResult<T = ScrapedLead> {
  source: string;
  scrapedAt: Date;
  leads: T[];
  errors: ScrapeError[];
}

export interface ScrapeError {
  url?: string;
  reason: string;
  rawSnippet?: string;
}

export interface ScrapedLead {
  company: ScrapedCompany;
  role?: ScrapedRole;
  sourceUrl: string;
  rawPayload: unknown;
}

export interface ScrapedCompany {
  domain: string | null;
  name: string;
  description?: string;
  geo?: Geo;
  hqLocation?: string;
  headcount?: number;
  industry?: string;
  isAiCompany?: boolean;
  fundingStage?: string;
  lastFundingDate?: Date;
  lastFundingAmount?: string;
  careersUrl?: string;
  websiteUrl?: string;
}

export interface ScrapedRole {
  title: string;
  type: RoleMatch | null;
  url: string;
  isRemote?: boolean;
  isJuniorFriendly?: boolean;
  minExperienceYears?: number;
  locations?: string[];
  postedAt?: Date;
}
