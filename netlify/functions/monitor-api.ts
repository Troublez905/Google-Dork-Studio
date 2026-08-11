import type { Config } from "@netlify/functions";
import { isAuthorized, unauthorized } from "./_shared/auth.js";
import { buildQueries, providerStatus, validateConfig } from "./_shared/config.js";
import { runMonitor } from "./_shared/monitor.js";
import { getState, saveState } from "./_shared/store.js";

const headers = { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

export default async (request: Request) => {
  if (!isAuthorized(request)) return unauthorized();
  try {
    if (request.method === "GET") {
      const state = await getState();
      return json({ ...state, queries: buildQueries(state.config).map(item => item.query), services: providerStatus() });
    }
    if (request.method === "PUT") {
      let nextConfig;
      try {
        nextConfig = validateConfig(await request.json());
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Invalid monitoring configuration." }, 400);
      }
      const state = await getState();
      const domainChanged = state.config.domain !== nextConfig.domain;
      state.config = nextConfig;
      if (domainChanged) { state.exposures = []; state.scans = []; delete state.lastRun; }
      await saveState(state);
      return json({ ...state, queries: buildQueries(state.config).map(item => item.query), services: providerStatus() });
    }
    if (request.method === "POST") {
      const body = await request.json() as { action?: string; id?: string };
      if (body.action === "scan") {
        const state = await runMonitor();
        return json({ ...state, queries: buildQueries(state.config).map(item => item.query), services: providerStatus() });
      }
      if (body.action === "resolve" && body.id) {
        const state = await getState();
        const exposure = state.exposures.find(item => item.id === body.id);
        if (!exposure) return json({ error: "Exposure not found." }, 404);
        exposure.status = "resolved";
        exposure.resolvedAt = new Date().toISOString();
        await saveState(state);
        return json({ ...state, queries: buildQueries(state.config).map(item => item.query), services: providerStatus() });
      }
      return json({ error: "Unsupported action." }, 400);
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Monitor request failed." }, 500);
  }
};

export const config: Config = {
  path: "/api/monitor",
  method: ["GET", "PUT", "POST"],
  rateLimit: { action: "rate_limit", aggregateBy: ["domain", "ip"], windowSize: 60, windowLimit: 60 }
};
