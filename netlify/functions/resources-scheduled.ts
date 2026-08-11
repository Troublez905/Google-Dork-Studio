import type { Config } from "@netlify/functions";
import { getResources, saveResources } from "./_shared/resources.js";

export default async () => {
  // Attempt to refresh resources from configured URL; getResources will fetch/store if needed
  try {
    const items = await getResources();
    // If getResources returned defaults and a RESOURCES_URL exists, try to fetch directly
    const source = Netlify.env.get("RESOURCES_URL");
    if (source) {
      try {
        const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const parsed = await response.json();
          if (Array.isArray(parsed) && parsed.length) await saveResources(parsed);
        }
      } catch (e) {
        // ignore network errors
      }
    }
    console.log(JSON.stringify({ event: "resources.refresh", items: Array.isArray(items) ? items.length : 0 }));
  } catch (error) {
    console.error(error);
  }
};

export const config: Config = { schedule: "0 8 * * *" };
