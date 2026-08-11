Netlify UI checklist — Runtime environment & deploy

1) Connect repository
- Netlify → Sites → New site → Import from Git → Choose GitHub repo.
- Deploy settings: publish directory = `.` (root), build command = none (netlify.toml is authoritative)

2) Site ID
- After site is created, note Site settings → Site information → Site ID (you will use this with CLI)

3) Environment variables (Runtime; set here, not in netlify.toml)
- Site settings → Build & deploy → Environment → Edit variables → Add variables:
  - SEARCH_PROVIDER = serper  (or google-cse)
  - SERPER_API_KEY = <your key>  (mark secret in UI)
  - GOOGLE_API_KEY = <your key> (if using google-cse)
  - GOOGLE_CX = <your CSE id>    (if using google-cse)
  - DASHBOARD_TOKEN = <long random secret, >=24 chars>
  - OPTIONAL ALERTS:
    - SLACK_WEBHOOK_URL
    - RESEND_API_KEY
    - ALERT_EMAIL_TO
    - ALERT_EMAIL_FROM
  - RESOURCES_URL = https://your-hosted/resources.json  (optional)

4) Deploy context variables
- Use "Context" to scope values to production or preview if needed.

5) Functions configuration
- netlify.toml declares functions directory; no extra action needed. Ensure `netlify/functions` exists in repo.

6) Publishing & webhooks
- If using GitHub Actions deploy, store NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID in GitHub Secrets.
- If using Netlify UI deploy, connect branch and trigger deploys on push.

7) Verify runtime behavior
- Open Site → Functions tab → confirm functions deployed
- Use the dashboard endpoint (GET /api/monitor) with an Authorization header (Bearer <DASHBOARD_TOKEN>) to test owner-only API

Security reminder
- Do NOT place API keys or secrets in netlify.toml or in committed files. Use Netlify UI or CLI `netlify env:set` with `--secret`.
