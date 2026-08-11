import type { SearchMatch } from "./types.js";

interface SerperResponse { organic?: Array<{ title?: string; link?: string }>; }
interface GoogleResponse { items?: Array<{ title?: string; link?: string }>; error?: { message?: string }; }

function normalize(items: Array<{ title?: string; link?: string }> = []): SearchMatch[] {
  return items.flatMap(item => item.link ? [{ title: item.title?.trim() || "Untitled result", url: item.link }] : []);
}

export async function search(query: string): Promise<SearchMatch[]> {
  const provider = Netlify.env.get("SEARCH_PROVIDER") || "serper";
  if (provider === "google-cse") {
    const key = Netlify.env.get("GOOGLE_API_KEY");
    const cx = Netlify.env.get("GOOGLE_CX");
    if (!key || !cx) throw new Error("Google CSE is selected but GOOGLE_API_KEY or GOOGLE_CX is missing.");
    const params = new URLSearchParams({ key, cx, q: query, num: "10", safe: "active" });
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, { signal: AbortSignal.timeout(12000) });
    const body = await response.json() as GoogleResponse;
    if (!response.ok) throw new Error(body.error?.message || `Google CSE returned HTTP ${response.status}.`);
    return normalize(body.items);
  }
  if (provider !== "serper") throw new Error(`Unsupported SEARCH_PROVIDER: ${provider}`);
  const apiKey = Netlify.env.get("SERPER_API_KEY");
  if (!apiKey) throw new Error("SERPER_API_KEY is not configured.");
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ q: query, num: 10 }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await response.json() as SerperResponse & { message?: string };
  if (!response.ok) throw new Error(body.message || `Serper returned HTTP ${response.status}.`);
  return normalize(body.organic);
}
