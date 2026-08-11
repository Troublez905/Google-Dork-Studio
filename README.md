# Dorks VA — Professional Website

A static, responsive product website for Vercel or Netlify.

## Included

- Custom SVG logo and favicon
- Social sharing preview
- Responsive black/yellow design
- Dark and light themes
- Loading animation and scroll reveals
- App interface mockup
- Download section
- Changelog
- Privacy Policy
- Terms of Use
- Custom 404 page
- PWA manifest and offline cache
- Vercel and Netlify security headers
- GitHub Actions workflow for Vercel

## Required edits

Search `index.html` for `data-download` and replace each placeholder `href="#"` with the real Windows release, Android APK, or source repository URL. Then remove the `data-download` attribute.

## Vercel deployment

Import the repository with Framework Preset **Other**, no build command, and `.` as the output directory if requested.

For GitHub Actions, add these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Netlify deployment

Use no build command and set the publish directory to `.`.

## Local preview

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Security monitor

The owner-only monitoring dashboard is available at `/dashboard.html`. It includes scheduled search checks, persistent exposure history, configurable keywords and file types, manual resolution tracking, and optional Slack or email alerts.

See `MONITORING.md` for required search-provider and alert environment variables.

## Packaging for desktop and mobile

This project is primarily a static site with Netlify Functions (monitor). To produce desktop and mobile apps consider these approaches:

- Windows desktop (Recommended): Wrap the webapp in Electron or Tauri. Use the static site as the renderer and bundle the Netlify Functions logic into a separate small Node process or call APIs hosted on Netlify.
  - Build steps (example):
    1. Create an Electron project that serves the `index.html` locally and packages assets.
    2. Sign the executable for distribution.

- Android (Play Store): Two options:
  - Build a web-wrapper using Capacitor with the static site, then produce an APK/AAB and publish to Play Store.
  - Reuse the existing Python/Kivy source (if present) to build an APK with Buildozer (more effort).

Security note: keep owner tokens and API keys out of client builds. Host monitoring/alerting functions on Netlify and let client apps only interact with the dashboard through server-side endpoints protected by `DASHBOARD_TOKEN`.

## Netlify hosting

- Connect repository to Netlify and set environment variables from `.env.example` in the site settings.
- Publish directory: `.` (the repository root). Netlify will serve static files and run functions from `netlify/functions`.

Netlify CLI helper
- To set environment variables from a local .env file, install Netlify CLI (npm i -g netlify-cli) and run the helper script included at `scripts/set-netlify-env.ps1`.
  Example: `./scripts/set-netlify-env.ps1 -SiteId <your-site-id> -EnvFile .env`

Important secrets
- Do NOT set secrets in `netlify.toml` or commit `.env` to the repo. Use the Netlify UI or `netlify env:set --secret` to configure runtime secrets (SERPER_API_KEY, GOOGLE_API_KEY/GOOGLE_CX, DASHBOARD_TOKEN, RESEND_API_KEY, SLACK_WEBHOOK_URL).

GitHub Actions / Netlify deploy
- If you prefer CI deploys, add these repository secrets in the GitHub repo settings: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. The included workflow `.github/workflows/deploy_netlify.yml` uses them to publish on push to main.


