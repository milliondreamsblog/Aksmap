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
