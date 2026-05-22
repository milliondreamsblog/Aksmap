import { config } from "@job-hunter/icp";
import type { ScoreInputs, ScoreResult } from "../types.js";
import {
  recentlyFundedScore,
  stackMatchScore,
  hiringSignalScore,
  smallTeamScore,
  juniorFriendlyScore,
  geoMatchScore,
  aiCompanyScore,
  remoteFriendlyScore,
} from "./factors.js";

export function scoreLead(input: ScoreInputs): ScoreResult {
  const w = config.scoringWeights;
  const candidateSkills = config.candidate.primarySkills;

  const factors: Record<string, { value: number; weight: number }> = {
    recentlyFunded: {
      value: recentlyFundedScore(input),
      weight: w.recentlyFunded,
    },
    stackMatch: {
      value: stackMatchScore(input, candidateSkills),
      weight: w.stackMatch,
    },
    hiringSignal: {
      value: hiringSignalScore(input),
      weight: w.hiringSignal,
    },
    smallTeam: {
      value: smallTeamScore(input),
      weight: w.smallTeam,
    },
    juniorFriendly: {
      value: juniorFriendlyScore(input),
      weight: w.juniorFriendly,
    },
    geoMatch: {
      value: geoMatchScore(input),
      weight: w.geoMatch,
    },
    aiCompany: {
      value: aiCompanyScore(input),
      weight: w.aiCompany,
    },
    remoteFriendly: {
      value: remoteFriendlyScore(input),
      weight: w.remoteFriendly,
    },
  };

  const totalWeight = Object.values(factors).reduce(
    (a, f) => a + f.weight,
    0,
  );
  const weightedSum = Object.values(factors).reduce(
    (a, f) => a + f.value * f.weight,
    0,
  );

  // Role-less leads (typical for RSS funding announcements) shouldn't be
  // penalized — null role is "unknown", not "bad fit". Only apply the
  // multiplier when we have an explicit role to evaluate against.
  const roleMultiplier = input.roleType
    ? config.roleWeights[input.roleType]
    : 1.0;

  const normalized = (weightedSum / totalWeight) * roleMultiplier;
  const score = Math.round(normalized * 100);

  const breakdown: Record<string, number> = {};
  for (const [name, { value, weight }] of Object.entries(factors)) {
    breakdown[name] = Math.round(value * weight * 100) / 100;
  }
  breakdown["roleMultiplier"] = roleMultiplier;

  return { score, breakdown };
}
