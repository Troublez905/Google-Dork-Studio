import { buildQueries } from "./config.js";
import { sendAlerts } from "./alerts.js";
import { search } from "./search.js";
import { getState, saveState } from "./store.js";
import type { Exposure, MonitorState, QueryDefinition, ScanPoint, SearchMatch, Severity } from "./types.js";

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

async function exposureId(url: string): Promise<string> {
  const bytes = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 12).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function scopedMatch(match: SearchMatch, domain: string): SearchMatch | null {
  try {
    const url = new URL(match.url);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== domain && !hostname.endsWith(`.${domain}`)) return null;
    url.hash = "";
    return { title: match.title.slice(0, 240), url: url.toString() };
  } catch {
    return null;
  }
}

async function collectMatches(definitions: QueryDefinition[], domain: string) {
  const batches = await Promise.all(definitions.map(async definition => ({ definition, matches: await search(definition.query) })));
  const matches = new Map<string, { match: SearchMatch; definition: QueryDefinition }>();
  for (const batch of batches) {
    for (const raw of batch.matches) {
      const match = scopedMatch(raw, domain);
      if (!match) continue;
      const current = matches.get(match.url);
      if (!current || SEVERITY_WEIGHT[batch.definition.severity] > SEVERITY_WEIGHT[current.definition.severity]) matches.set(match.url, { match, definition: batch.definition });
    }
  }
  return [...matches.values()];
}

function counts(state: MonitorState) {
  return {
    open: state.exposures.filter(exposure => exposure.status === "open").length,
    resolved: state.exposures.filter(exposure => exposure.status === "resolved").length
  };
}

export async function runMonitor(): Promise<MonitorState> {
  const state = await getState();
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const definitions = buildQueries(state.config);
  if (!definitions.length) throw new Error("No monitoring queries are configured.");
  try {
    const results = await collectMatches(definitions, state.config.domain);
    const existingById = new Map(state.exposures.map(exposure => [exposure.id, exposure]));
    const newlyDetected: Exposure[] = [];
    for (const { match, definition } of results) {
      const id = await exposureId(match.url);
      const existing = existingById.get(id);
      if (existing) {
        existing.lastSeen = timestamp;
        existing.title = match.title;
        existing.query = definition.query;
        if (existing.status === "resolved") {
          existing.status = "open";
          delete existing.resolvedAt;
          newlyDetected.push(existing);
        }
      } else {
        const exposure: Exposure = { id, url: match.url, title: match.title, query: definition.query, kind: definition.kind, severity: definition.severity, status: "open", firstSeen: timestamp, lastSeen: timestamp };
        state.exposures.push(exposure);
        existingById.set(id, exposure);
        newlyDetected.push(exposure);
      }
    }
    state.exposures = state.exposures.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen)).slice(0, 1000);
    const currentCounts = counts(state);
    const scan: ScanPoint = { at: timestamp, open: currentCounts.open, discovered: newlyDetected.length, resolved: currentCounts.resolved, queries: definitions.length, durationMs: Date.now() - startedAt };
    state.scans = [...state.scans, scan].slice(-180);
    state.lastRun = scan;
    await saveState(state);
    const warnings = await sendAlerts(state.config.domain, newlyDetected, timestamp.replace(/[^0-9]/g, "").slice(0, 14));
    if (warnings.length) {
      scan.alertWarnings = warnings;
      state.lastRun = scan;
      state.scans[state.scans.length - 1] = scan;
      await saveState(state);
    }
    return state;
  } catch (error) {
    const currentCounts = counts(state);
    const scan: ScanPoint = { at: timestamp, open: currentCounts.open, discovered: 0, resolved: currentCounts.resolved, queries: definitions.length, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
    state.scans = [...state.scans, scan].slice(-180);
    state.lastRun = scan;
    await saveState(state);
    throw error;
  }
}
