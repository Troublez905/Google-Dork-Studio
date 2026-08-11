<#
Helper: Set Netlify environment variables from a local .env file using Netlify CLI.

Usage:
  1. Install Netlify CLI: npm i -g netlify-cli
  2. Export NETLIFY_AUTH_TOKEN or login with `netlify login`.
  3. Set $SiteId (or provide as parameter) and run: .\set-netlify-env.ps1 -SiteId <site-id> [-EnvFile .env]

This script sets non-secret variables normally and marks sensitive values with --secret.
Do NOT commit your .env file to the repository.
#>
param(
  [Parameter(Mandatory=$true)] [string]$SiteId,
  [string]$EnvFile = ".env"
)

if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
  Write-Error "netlify CLI not found. Install with: npm i -g netlify-cli"
  exit 2
}

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file '$EnvFile' not found. Create it from .env.example and add your values."
  exit 2
}

# Parse simple KEY=VALUE lines
$lines = Get-Content $EnvFile | Where-Object { $_ -and -not ($_ -match '^\s*#') }
foreach ($line in $lines) {
  if ($line -match '^\s*([^=\s]+)\s*=\s*(.*)\s*$') {
    $key = $matches[1]
    $value = $matches[2].Trim('"')
    Write-Output "Setting $key..."
    # Treat tokens/keys as secrets
    if ($key -in @('SERPER_API_KEY','GOOGLE_API_KEY','GOOGLE_CX','DASHBOARD_TOKEN','RESEND_API_KEY','SLACK_WEBHOOK_URL')) {
      netlify env:set $key --site $SiteId --secret "$value"
    } else {
      netlify env:set $key --site $SiteId "$value"
    }
  }
}

Write-Output "Environment import complete. Verify with: netlify env:list --site $SiteId"