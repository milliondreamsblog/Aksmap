import type { RoleMatch } from "@job-hunter/icp";

export interface WebsiteEnrichment {
  techStack: string[];
  isAiCompany: boolean;
  hiringSignal: boolean;
  careersUrl?: string;
  about?: string;
  candidatePeople: CandidatePerson[];
}

export interface CandidatePerson {
  name: string;
  role?: string;
  source: "html" | "structured-data";
}

export interface ContactCandidate {
  name: string;
  role?: string;
  email: string;
  emailVerified: boolean;
  pattern: string;
}

export interface ScoreInputs {
  fundingStage?: string | null;
  lastFundingDate?: Date | null;
  headcount?: number | null;
  isAiCompany: boolean;
  geo?: string | null;
  techStack: string[];
  roleType?: RoleMatch | null;
  isRemote?: boolean | null;
  isJuniorFriendly?: boolean | null;
  hiringSignal: boolean;
}

export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}
