import type { MonitorConfig, QueryDefinition } from "./types.js";

export const DEFAULT_CONFIG: MonitorConfig = {
  domain: "google-dork-studio.netlify.app",
  keywords: ["confidential", "internal use only", "restricted", "password", "secret", "api_key"],
  fileTypes: ["env", "sql", "bak", "old", "zip", "tar", "gz", "log", "yml", "yaml", "json"],
  adminPaths: ["admin", "administrator", "login", "dashboard", "wp-admin"],
  scheduleLabel: "Daily at 06:00 UTC"
};

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const TOKEN_PATTERN = /^[a-z0-9*._-]{1,40}$/i;

function cleanList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) throw new Error("Rule lists must be arrays.");
  const items = value.map(item => String(item).trim()).filter(Boolean);
  if (items.length > maxItems) throw new Error(`A maximum of ${maxItems} rules is allowed.`);
  if (items.some(item => !TOKEN_PATTERN.test(item) && !/^[a-z0-9 _.-]{1,60}$/i.test(item))) {
    throw new Error("Rules contain unsupported characters.");
  }
  return [...new Set(items)];
}

export function validateConfig(input: unknown): MonitorConfig {
  if (!input || typeof input !== "object") throw new Error("Configuration must be an object.");
  const candidate = input as Partial<MonitorConfig>;
  const domain = String(candidate.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!DOMAIN_PATTERN.test(domain)) throw new Error("Enter a valid hostname without a path or protocol.");
  const keywords = cleanList(candidate.keywords, 30);
  const fileTypes = cleanList(candidate.fileTypes, 24).map(value => value.replace(/^\*?\./, ""));
  const adminPaths = cleanList(candidate.adminPaths, 20).map(value => value.replace(/^\//, ""));
  if (!keywords.length && !fileTypes.length && !adminPaths.length) throw new Error("At least one monitoring rule is required.");
  return { domain, keywords, fileTypes, adminPaths, scheduleLabel: "Daily at 06:00 UTC" };
}

function quotedOrGroup(values: string[], prefix = ""): string {
  return values.map(value => `${prefix}${value.includes(" ") ? `"${value}"` : value}`).join(" OR ");
}

export function buildQueries(config: MonitorConfig): QueryDefinition[] {
  const definitions: QueryDefinition[] = [];
  if (config.fileTypes.length) {
    const critical = config.fileTypes.filter(type => ["env", "sql"].includes(type.toLowerCase()));
    const backups = config.fileTypes.filter(type => !critical.includes(type));
    if (critical.length) definitions.push({ query: `site:${config.domain} (${quotedOrGroup(critical, "ext:")})`, kind: "sensitive-file", severity: "critical" });
    if (backups.length) definitions.push({ query: `site:${config.domain} (${quotedOrGroup(backups, "ext:")})`, kind: "backup", severity: "high" });
  }
  if (config.adminPaths.length) definitions.push({ query: `site:${config.domain} (${quotedOrGroup(config.adminPaths, "inurl:")})`, kind: "admin-portal", severity: "medium" });
  if (config.keywords.length) definitions.push({ query: `site:${config.domain} (${quotedOrGroup(config.keywords)}) -documentation -example -sample -tutorial`, kind: "keyword", severity: "high" });
  return definitions;
}

export function providerStatus() {
  const provider = Netlify.env.get("SEARCH_PROVIDER") || "serper";
  const ready = provider === "google-cse"
    ? Boolean(Netlify.env.get("GOOGLE_API_KEY") && Netlify.env.get("GOOGLE_CX"))
    : Boolean(Netlify.env.get("SERPER_API_KEY"));
  return {
    provider,
    ready,
    slack: Boolean(Netlify.env.get("SLACK_WEBHOOK_URL")),
    email: Boolean(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("ALERT_EMAIL_TO") && Netlify.env.get("ALERT_EMAIL_FROM"))
  };
}
