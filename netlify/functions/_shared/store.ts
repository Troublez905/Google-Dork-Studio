import { getStore } from "@netlify/blobs";
import { DEFAULT_CONFIG } from "./config.js";
import type { MonitorState } from "./types.js";

const STATE_KEY = "monitor-state-v1";

function emptyState(): MonitorState {
  return { version: 1, config: DEFAULT_CONFIG, exposures: [], scans: [] };
}

export async function getState(): Promise<MonitorState> {
  const store = getStore({ name: "dorks-va-monitor", consistency: "strong" });
  return (await store.get(STATE_KEY, { type: "json" }) as MonitorState | null) ?? emptyState();
}

export async function saveState(state: MonitorState): Promise<void> {
  const store = getStore({ name: "dorks-va-monitor", consistency: "strong" });
  await store.setJSON(STATE_KEY, state);
}
