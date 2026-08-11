import type { Config } from "@netlify/functions";
import { runMonitor } from "./_shared/monitor.js";

export default async () => {
  const state = await runMonitor();
  console.log(JSON.stringify({ event: "monitor.complete", domain: state.config.domain, discovered: state.lastRun?.discovered ?? 0, open: state.lastRun?.open ?? 0 }));
};

export const config: Config = { schedule: "0 6 * * *" };
