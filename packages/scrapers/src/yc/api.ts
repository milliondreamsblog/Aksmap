import { z } from "zod";
import { fetchJson } from "../utils/http.js";

const YC_API_URL = "https://api.ycombinator.com/v0.1/companies";

const YcCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  website: z.string().nullable().optional(),
  batch: z.string(),
  status: z.string(),
  industries: z.array(z.string()).default([]),
  oneLiner: z.string().nullable().optional(),
  longDescription: z.string().nullable().optional(),
  teamSize: z.number().nullable().optional(),
  locations: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  url: z.string().nullable().optional(),
  smallLogoUrl: z.string().nullable().optional(),
  badges: z.array(z.string()).default([]),
});

export type YcCompany = z.infer<typeof YcCompanySchema>;

const YcResponseSchema = z.object({
  companies: z.array(YcCompanySchema),
  page: z.number().optional(),
  totalPages: z.number().optional(),
  nextPage: z.string().nullable().optional(),
});

export async function fetchYcCompanies(
  opts: {
    batches?: string[];
    isHiring?: boolean;
    maxPages?: number;
  } = {},
): Promise<YcCompany[]> {
  const params = new URLSearchParams();
  if (opts.batches?.length) params.set("batch", opts.batches.join(","));
  if (opts.isHiring) params.set("isHiring", "true");

  const maxPages = opts.maxPages ?? 10;
  const all: YcCompany[] = [];
  let page = 1;

  while (page <= maxPages) {
    params.set("page", String(page));
    const url = `${YC_API_URL}?${params.toString()}`;
    const raw = await fetchJson(url);
    const parsed = YcResponseSchema.parse(raw);
    all.push(...parsed.companies);

    if (!parsed.nextPage || parsed.companies.length === 0) break;
    page++;
  }

  return all;
}
