import { promises as dns } from "node:dns";

const mxCache = new Map<string, boolean>();

export async function hasValidMx(email: string): Promise<boolean> {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();

  const cached = mxCache.get(domain);
  if (cached !== undefined) return cached;

  try {
    const records = await dns.resolveMx(domain);
    const valid = records.length > 0;
    mxCache.set(domain, valid);
    return valid;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}
