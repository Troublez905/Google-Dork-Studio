import type { Exposure } from "./types.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

function alertLines(exposures: Exposure[]): string[] {
  return exposures.slice(0, 10).map(exposure => `[${exposure.severity.toUpperCase()}] ${exposure.title} — ${exposure.url}`);
}

function dashboardUrl(): string {
  return Netlify.env.get("DASHBOARD_URL") || "https://google-dork-studio.netlify.app/dashboard.html";
}

async function sendSlack(domain: string, exposures: Exposure[]): Promise<void> {
  const webhook = Netlify.env.get("SLACK_WEBHOOK_URL");
  if (!webhook) return;
  const extra = exposures.length > 10 ? `\n…and ${exposures.length - 10} more.` : "";
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `Dorks VA Monitor found ${exposures.length} new indexed exposure${exposures.length === 1 ? "" : "s"} for ${domain}.\n${alertLines(exposures).join("\n")}${extra}\nReview: ${dashboardUrl()}` }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Slack returned HTTP ${response.status}.`);
}

async function sendEmail(domain: string, exposures: Exposure[], scanId: string): Promise<void> {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  const to = Netlify.env.get("ALERT_EMAIL_TO");
  const from = Netlify.env.get("ALERT_EMAIL_FROM");
  if (!apiKey || !to || !from) return;
  const rows = exposures.slice(0, 20).map(exposure => `<tr><td>${escapeHtml(exposure.severity.toUpperCase())}</td><td>${escapeHtml(exposure.title)}</td><td><a href="${escapeHtml(exposure.url)}">${escapeHtml(exposure.url)}</a></td></tr>`).join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "Dorks-VA-Monitor/1.0", "Idempotency-Key": `dorks-va-${scanId}` },
    body: JSON.stringify({ from, to: [to], subject: `[Dorks VA] ${exposures.length} new indexed exposure${exposures.length === 1 ? "" : "s"} on ${domain}`, html: `<h1>New indexed exposures detected</h1><p>The monitor found ${exposures.length} new match${exposures.length === 1 ? "" : "es"} for <strong>${escapeHtml(domain)}</strong>. Review the metadata and secure the source before requesting de-indexing.</p><table cellpadding="8" cellspacing="0" border="1"><thead><tr><th>Severity</th><th>Title</th><th>URL</th></tr></thead><tbody>${rows}</tbody></table><p><a href="${escapeHtml(dashboardUrl())}">Open owner dashboard</a></p>` }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend returned HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
}

export async function sendAlerts(domain: string, exposures: Exposure[], scanId: string): Promise<string[]> {
  if (!exposures.length) return [];
  const results = await Promise.allSettled([sendSlack(domain, exposures), sendEmail(domain, exposures, scanId)]);
  return results.flatMap(result => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []);
}
