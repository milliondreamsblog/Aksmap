export interface DraftCompany {
  name: string;
  description?: string | null;
  fundingStage?: string | null;
  fundingAmount?: string | null;
  techStack?: string[] | null;
  geo?: string | null;
  isAiCompany?: boolean | null;
}

export interface DraftRole {
  title?: string | null;
  type?: string | null;
}

export interface DraftInput {
  company: DraftCompany;
  role?: DraftRole | null;
  contactFirstName?: string | null;
}

export interface DraftOutput {
  subject: string;
  body: string;
  provider?: "google" | "openai";
}
