import type { Config } from "@netlify/functions";
import { getResources, isResourceItem, saveResources } from "./_shared/resources.js";

export default async () => {
  const source = Netlify.env.get("RESOURCES_URL");
  if (!source) {
    const items = await getResources();
    console.log(JSON.stringify({ event: "resources.refresh", source: "defaults", items: items.length }));
    return;
  }

  const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Resource feed returned HTTP ${response.status}.`);
  const parsed: unknown = await response.json();
  if (!Array.isArray(parsed) || !parsed.every(isResourceItem)) throw new Error("Resource feed contains invalid items.");
  await saveResources(parsed);
  console.log(JSON.stringify({ event: "resources.refresh", source: "remote", items: parsed.length }));
};

export const config: Config = { schedule: "0 8 * * *" };
