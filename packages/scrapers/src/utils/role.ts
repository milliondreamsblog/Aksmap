import type { RoleMatch } from "@job-hunter/icp";

export function classifyRole(title: string, extraText = ""): RoleMatch | null {
  const haystack = `${title} ${extraText}`.toLowerCase();

  if (
    /\b(ml|ai|machine learning|deep learning|llm|nlp|computer vision|gen[\- ]?ai)\b/.test(
      haystack,
    )
  ) {
    return "ai-ml";
  }
  if (
    /\b(founding|first engineer|founding engineer|founding member)\b/.test(
      haystack,
    )
  ) {
    return "founding";
  }
  if (
    /\b(backend|back-end|back end|server|api engineer|infrastructure engineer)\b/.test(
      haystack,
    )
  ) {
    return "backend";
  }
  if (/\b(full[- ]?stack)\b/.test(haystack)) {
    return "fullstack";
  }
  if (/\b(platform|devops|sre|site reliability|infra)\b/.test(haystack)) {
    return "platform";
  }
  if (
    /\b(frontend|front-end|front end|ui engineer|react engineer)\b/.test(
      haystack,
    )
  ) {
    return "frontend";
  }
  return null;
}

export function isJuniorFriendly(
  title: string,
  description = "",
  minYears?: number,
): boolean {
  if (minYears !== undefined && minYears <= 3) return true;
  if (minYears !== undefined && minYears > 3) return false;

  const haystack = `${title} ${description}`.toLowerCase();
  if (
    /\b(new grad|junior|founding|early career|entry[- ]?level|0-?2 years|0-?3 years)\b/.test(
      haystack,
    )
  ) {
    return true;
  }
  if (
    /\b(senior|staff|principal|lead engineer|director|head of)\b/.test(haystack)
  ) {
    return false;
  }
  return true;
}
