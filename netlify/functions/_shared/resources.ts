import type { MonitorState } from "./types.js";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "dorks-va-monitor";
const RESOURCES_KEY = "resources-v1";

export type ResourceItem = { title: string; url: string; description?: string };

const DEFAULT_RESOURCES: ResourceItem[] = [
  { title: "Google Dork Cheat Sheet (common operators)", url: "https://example.com/dork-cheatsheet", description: "Common Google dork operators and examples." },
  { title: "Offensive Security Dorks Guide", url: "https://example.com/offsec-dorks", description: "Guidance for defensive use and examples." }
];

export async function getResources(): Promise<ResourceItem[]> {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const fromStore = (await store.get(RESOURCES_KEY, { type: "json" }) as ResourceItem[] | null);
  if (fromStore && Array.isArray(fromStore) && fromStore.length) return fromStore;

  // Attempt to fetch from configured URL
  const source = Netlify.env.get("RESOURCES_URL");
  if (source) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const parsed = await response.json() as ResourceItem[];
        if (Array.isArray(parsed) && parsed.length) {
          await saveResources(parsed);
          return parsed;
        }
      }
    } catch (e) {
      // ignore and fallthrough to default
    }
  }
  return DEFAULT_RESOURCES;
}

export async function saveResources(items: ResourceItem[]): Promise<void> {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(RESOURCES_KEY, items);
}
