# Dorks VA Monitor setup

The dashboard is available at `/dashboard.html`. Its API rejects requests unless `DASHBOARD_TOKEN` is configured and supplied as a bearer token.

## Search provider

New setups should use Serper because Google's Custom Search JSON API is closed to new customers and is scheduled for discontinuation on January 1, 2027.

Set these Netlify environment variables:

```text
SEARCH_PROVIDER=serper
SERPER_API_KEY=your-provider-key
```

Existing Google Custom Search customers can instead use:

```text
SEARCH_PROVIDER=google-cse
GOOGLE_API_KEY=your-existing-google-api-key
GOOGLE_CX=your-programmable-search-engine-id
```

## Alert channels

Slack uses an incoming webhook:

```text
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Email uses Resend:

```text
RESEND_API_KEY=re_...
ALERT_EMAIL_TO=owner@example.com
ALERT_EMAIL_FROM=Dorks VA Monitor <monitor@your-verified-domain.example>
```

You can enable Slack, email, or both. Alert credentials are read only by server-side functions.

## Optional settings

```text
DASHBOARD_URL=https://your-domain.example/dashboard.html
```

The scheduled function runs daily at 06:00 UTC. A manual scan is available from the owner dashboard.

## Security behavior

- Every query is prefixed with the configured `site:` hostname.
- Search results are filtered again by hostname before storage.
- The monitor stores result titles, URLs, query metadata, severity, status, and timestamps.
- It does not open or download matched URLs.
- Dashboard and API responses use no-store and no-index controls.
- Changing the monitored domain clears prior exposure history to avoid mixing scopes.
