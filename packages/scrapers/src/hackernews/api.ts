import { fetchJson } from "../utils/http.js";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";

interface HnItem {
  id: number;
  type: "story" | "comment" | "job" | "poll" | "pollopt";
  by?: string;
  text?: string;
  title?: string;
  kids?: number[];
  time?: number;
  url?: string;
  deleted?: boolean;
  dead?: boolean;
}

export async function fetchItem(id: number): Promise<HnItem | null> {
  try {
    return await fetchJson<HnItem>(`${HN_BASE}/item/${id}.json`);
  } catch {
    return null;
  }
}

export async function searchWhoIsHiring(): Promise<number | null> {
  const hits = await fetchJson<{
    hits: Array<{ objectID: string; title: string; created_at_i: number }>;
  }>(
    `https://hn.algolia.com/api/v1/search?query=%22Ask%20HN%3A%20Who%20is%20hiring%22&tags=ask_hn&hitsPerPage=5`,
  );

  if (!hits.hits.length) return null;

  const sorted = hits.hits.sort((a, b) => b.created_at_i - a.created_at_i);
  const latest = sorted[0];
  return latest ? parseInt(latest.objectID, 10) : null;
}

export async function fetchTopLevelComments(
  storyId: number,
  maxComments = 300,
): Promise<HnItem[]> {
  const story = await fetchItem(storyId);
  if (!story?.kids) return [];

  const ids = story.kids.slice(0, maxComments);
  const comments: HnItem[] = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((id) => fetchItem(id)));
    for (const item of results) {
      if (item && !item.deleted && !item.dead && item.text) {
        comments.push(item);
      }
    }
  }

  return comments;
}

export type { HnItem };
