const GENERIC_LOCAL_PARTS = [
  "founder",
  "hello",
  "team",
  "contact",
  "careers",
] as const;

// Fallback when no named person is found on the site. These role-based inboxes
// commonly exist at early-stage startups and reach a human; ordered by how
// likely they are to land in front of a decision-maker.
export function genericInboxCandidates(domain: string): string[] {
  return GENERIC_LOCAL_PARTS.map((local) => `${local}@${domain}`);
}

export function generateEmailCandidates(
  fullName: string,
  domain: string,
): string[] {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length < 1) return [];
  if (parts[0] === undefined) return [];

  const first = parts[0].replace(/[^a-z]/g, "");
  const last = parts[parts.length - 1]?.replace(/[^a-z]/g, "") ?? "";

  if (!first) return [];

  const candidates = new Set<string>();
  candidates.add(`${first}@${domain}`);
  if (last && last !== first) {
    candidates.add(`${first}.${last}@${domain}`);
    candidates.add(`${first}${last}@${domain}`);
    candidates.add(`${first[0]}${last}@${domain}`);
    candidates.add(`${first[0]}.${last}@${domain}`);
    candidates.add(`${first}_${last}@${domain}`);
  }

  return Array.from(candidates);
}
