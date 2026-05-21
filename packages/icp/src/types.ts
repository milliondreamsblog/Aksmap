export type Geo =
  | "india"
  | "singapore_sea"
  | "usa_remote"
  | "europe_uk"
  | "japan_korea";

export type PrimaryIdentity =
  | "ai-engineer"
  | "backend-fullstack"
  | "founding-engineer";

export type RoleMatch =
  | "ai-ml"
  | "backend"
  | "fullstack"
  | "founding"
  | "frontend"
  | "platform";

export type NarrativeAngle =
  | "ai-heavy"
  | "b2b-saas"
  | "consumer";

export interface GeoMeta {
  displayName: string;
  timezone: string;
  language: "en" | "en-IN" | "en-SG" | "en-GB" | "ja" | "ko";
  visaSignalRequired: boolean;
  fundingSources: string[];
}

export interface ScoringWeights {
  recentlyFunded: number;
  stackMatch: number;
  hiringSignal: number;
  smallTeam: number;
  juniorFriendly: number;
  geoMatch: number;
  aiCompany: number;
  remoteFriendly: number;
}

export interface HardFilters {
  minHeadcount: number | null;
  maxHeadcount: number | null;
  excludeIndustries: string[];
  requireFundedOrRevenue: boolean;
}

export interface OutreachLimits {
  emailsPerDay: number;
  linkedinDmsPerDay: number;
  twitterDmsPerDay: number;
  minScoreToQueue: number;
  warmupDays: number;
}

export interface CandidateProfile {
  fullName: string;
  email: string;
  graduationYear: number;
  university: string;
  primarySkills: string[];
  portfolioUrls: string[];
  flagshipProjects: Array<{
    name: string;
    narrative: NarrativeAngle;
    oneLineDescription: string;
    metric: string;
  }>;
}

export interface IcpConfig {
  candidate: CandidateProfile;
  primaryIdentity: PrimaryIdentity;
  activeGeos: Record<Geo, boolean>;
  geoConfig: Record<Geo, GeoMeta>;
  scoringWeights: ScoringWeights;
  hardFilters: HardFilters;
  roleWeights: Record<RoleMatch, number>;
  outreach: OutreachLimits;
}
