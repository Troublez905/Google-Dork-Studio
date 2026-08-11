import type { Config } from "@netlify/functions";
import { getResources, saveResources } from "./_shared/resources.js";
import { isAuthorized, unauthorized } from "./_shared/auth.js";

const headers = { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

export default async (request: Request) => {
  if (request.method === "GET") {
    try {
      const items = await getResources();
      return json({ resources: items });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
  if (!isAuthorized(request)) return unauthorized();
  if (request.method === "POST") {
    try {
      const items = await request.json();
      if (!Array.isArray(items)) return json({ error: "Expected an array of resources." }, 400);
      await saveResources(items);
      return json({ saved: items.length });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }
  return json({ error: "Method not allowed." }, 405);
};

export const config: Config = { path: "/api/resources", method: ["GET", "POST"] };
