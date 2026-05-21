import { XMLParser } from "fast-xml-parser";
import { fetchText } from "./http.js";

export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  content?: string;
  categories?: string[];
}

interface RawRssItem {
  title?: string | { "#text": string };
  link?: string | { "#text": string };
  description?: string;
  pubDate?: string;
  "content:encoded"?: string;
  category?: string | string[];
}

interface RawRss {
  rss?: { channel?: { item?: RawRssItem | RawRssItem[] } };
  feed?: { entry?: RawRssItem | RawRssItem[] };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
});

function extractText(
  value: string | { "#text": string } | undefined,
): string {
  if (!value) return "";
  return typeof value === "string" ? value : (value["#text"] ?? "");
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export async function fetchRssFeed(url: string): Promise<RssItem[]> {
  const xml = await fetchText(url);
  const parsed = parser.parse(xml) as RawRss;

  const rawItems: RawRssItem[] =
    toArray(parsed.rss?.channel?.item).length > 0
      ? toArray(parsed.rss?.channel?.item)
      : toArray(parsed.feed?.entry);

  return rawItems.map((item) => ({
    title: extractText(item.title),
    link: extractText(item.link),
    description: item.description,
    content: item["content:encoded"],
    pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
    categories: item.category
      ? Array.isArray(item.category)
        ? item.category
        : [item.category]
      : undefined,
  }));
}
