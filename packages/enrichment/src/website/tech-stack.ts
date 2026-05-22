import * as cheerio from "cheerio";

interface Detector {
  name: string;
  matches: (
    html: string,
    headers: Record<string, string>,
    $: cheerio.CheerioAPI,
  ) => boolean;
}

const DETECTORS: Detector[] = [
  {
    name: "react",
    matches: (h) =>
      /__next_f|react-dom|data-reactroot|data-reactid/i.test(h),
  },
  {
    name: "nextjs",
    matches: (h, hdrs) =>
      /\/_next\/static/.test(h) ||
      /next-router/i.test(h) ||
      /^next/i.test(hdrs["x-powered-by"] ?? ""),
  },
  {
    name: "vue",
    matches: (h) => /data-v-[a-f0-9]{8}|__vue|vuejs/i.test(h),
  },
  {
    name: "nuxt",
    matches: (h) => /\/_nuxt\//.test(h),
  },
  {
    name: "svelte",
    matches: (h) => /svelte-[a-z0-9]{6}/i.test(h),
  },
  {
    name: "angular",
    matches: (h) => /ng-version|_nghost-|_ngcontent-/i.test(h),
  },
  {
    name: "django",
    matches: (h, hdrs) =>
      /csrfmiddlewaretoken/i.test(h) || /django/i.test(hdrs["server"] ?? ""),
  },
  {
    name: "rails",
    matches: (h, hdrs) =>
      /csrf-token.*\srails/i.test(h) ||
      /rails/i.test(hdrs["x-powered-by"] ?? ""),
  },
  {
    name: "wordpress",
    matches: (h, hdrs) =>
      /wp-content\/|wp-includes\//.test(h) ||
      /wordpress/i.test(hdrs["x-powered-by"] ?? ""),
  },
  {
    name: "shopify",
    matches: (h) => /cdn\.shopify\.com|shopify\.theme/.test(h),
  },
  {
    name: "webflow",
    matches: (h) => /webflow\.com|w-mod-js/.test(h),
  },
  {
    name: "framer",
    matches: (h) => /framerusercontent\.com/.test(h),
  },
  {
    name: "tailwind",
    matches: (h, _hdrs, $) =>
      $('link[href*="tailwind"]').length > 0 ||
      /class="[^"]*\b(flex|grid|p-\d|m-\d|text-\w+)\b/.test(h),
  },
  {
    name: "cloudflare",
    matches: (_h, hdrs) =>
      /cloudflare/i.test(hdrs["server"] ?? "") ||
      /cloudflare/i.test(hdrs["cf-ray"] ?? ""),
  },
  {
    name: "vercel",
    matches: (_h, hdrs) =>
      /vercel/i.test(hdrs["server"] ?? "") ||
      /vercel/i.test(hdrs["x-vercel-id"] ?? ""),
  },
  {
    name: "netlify",
    matches: (_h, hdrs) =>
      /netlify/i.test(hdrs["server"] ?? "") ||
      hdrs["x-nf-request-id"] !== undefined,
  },
  {
    name: "supabase",
    matches: (h) => /supabase\.co/.test(h),
  },
  {
    name: "firebase",
    matches: (h) => /firebaseio\.com|firebaseapp\.com/.test(h),
  },
  {
    name: "stripe",
    matches: (h) => /js\.stripe\.com/.test(h),
  },
];

const AI_INDICATORS = [
  /\bllm\b/i,
  /generative ai/i,
  /large language model/i,
  /\b(openai|anthropic|gemini)\b/i,
  /\brag\b/i,
  /retrieval-augmented/i,
  /vector (db|database)/i,
  /\b(pinecone|weaviate|qdrant|chroma)\b/i,
  /\b(langchain|llamaindex)\b/i,
  /\bai[- ]powered/i,
  /agentic/i,
  /fine[- ]tun(ed|ing)/i,
];

export interface TechStackResult {
  techStack: string[];
  isAiCompany: boolean;
}

export function detectTechStack(
  html: string,
  headers: Record<string, string>,
): TechStackResult {
  const $ = cheerio.load(html);
  const detected = DETECTORS.filter((d) => {
    try {
      return d.matches(html, headers, $);
    } catch {
      return false;
    }
  }).map((d) => d.name);

  const visibleText = $("body").text();
  const isAiCompany = AI_INDICATORS.some((re) => re.test(visibleText));

  return { techStack: detected, isAiCompany };
}
