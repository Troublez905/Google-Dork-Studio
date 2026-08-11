export function isAuthorized(request: Request): boolean {
  const expected = Netlify.env.get("DASHBOARD_TOKEN");
  if (!expected || expected.length < 24) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  return mismatch === 0;
}

export function unauthorized(): Response {
  return Response.json({ error: "Owner token required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
