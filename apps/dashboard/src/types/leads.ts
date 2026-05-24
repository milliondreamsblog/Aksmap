import type { getLeadById } from "@/lib/queries";

export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadById>>>;
