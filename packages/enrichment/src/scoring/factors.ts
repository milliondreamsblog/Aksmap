import type { ScoreInputs } from "../types.js";

export function recentlyFundedScore(input: ScoreInputs): number {
  if (!input.lastFundingDate) return 0;
  const daysAgo =
    (Date.now() - input.lastFundingDate.getTime()) / 86_400_000;
  if (daysAgo < 30) return 1.0;
  if (daysAgo < 60) return 0.8;
  if (daysAgo < 90) return 0.6;
  if (daysAgo < 180) return 0.3;
  return 0.0;
}

export function stackMatchScore(
  input: ScoreInputs,
  candidateSkills: string[],
): number {
  if (input.techStack.length === 0) return 0.4;
  const candidate = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const company = input.techStack.map((s) => s.toLowerCase());
  const matches = company.filter(
    (t) =>
      candidate.has(t) ||
      [...candidate].some((s) => t.includes(s) || s.includes(t)),
  ).length;
  if (matches === 0) return 0.1;
  return Math.min(1, matches / 3);
}

export function hiringSignalScore(input: ScoreInputs): number {
  return input.hiringSignal ? 1 : 0.2;
}

export function smallTeamScore(input: ScoreInputs): number {
  if (input.headcount == null) return 0.5;
  if (input.headcount <= 10) return 1;
  if (input.headcount <= 30) return 0.85;
  if (input.headcount <= 100) return 0.6;
  if (input.headcount <= 300) return 0.3;
  return 0.1;
}

export function juniorFriendlyScore(input: ScoreInputs): number {
  if (input.isJuniorFriendly === true) return 1;
  if (input.isJuniorFriendly === false) return 0;
  return 0.5;
}

export function geoMatchScore(input: ScoreInputs): number {
  return input.geo ? 1 : 0.3;
}

export function aiCompanyScore(input: ScoreInputs): number {
  return input.isAiCompany ? 1 : 0.3;
}

export function remoteFriendlyScore(input: ScoreInputs): number {
  if (input.isRemote === true) return 1;
  if (input.isRemote === false) return 0.2;
  return 0.5;
}
