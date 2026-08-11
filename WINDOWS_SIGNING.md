Windows code signing & publishing — Quick guide

1) Obtain a code signing certificate
- Purchase a code-signing certificate from a CA (DigiCert, Sectigo, GlobalSign) or use an EV code-signing certificate for stronger trust.
- For Microsoft Store, use Partner Center to submit packages; for direct exe/msi distribution, sign with a code-signing cert.

2) Sign with SignTool (Windows SDK)
- Install Windows 10+ SDK to get SignTool.
- Sign an executable: 
  signtool sign /a /fd SHA256 /td SHA256 /tr http://timestamp.digicert.com /v path\to\your.exe
- Include the timestamp server so signatures remain valid after cert expiration.

3) Sign installer packages
- For installers (NSIS, Inno Setup, MSI), sign the final installer artifact.

4) CI signing
- Store certificate (PFX) and passphrase as CI secrets (GitHub Secrets, encrypted store).
- Use secure actions to import the certificate during the job, sign artifacts, and remove the certificate after use.
- Example: actions/setup-msbuild + PowerShell to import PFX into a temporary store then run signtool.

5) Microsoft Store publishing
- Use Microsoft Partner Center: register as an app publisher, create an app submission, upload package (MSIX recommended), and follow certification steps.
- For automatic build & upload, use the Partner Center API and appropriate service principal/credentials stored as CI secrets.

Security note
- Protect PFX files and keystore passwords. Use CI secrets and ephemeral import; do not persist raw cert files in the repo.

Troubleshooting
- If Windows reports "Unknown Publisher", ensure your cert is valid and trusted and you used an EV cert for highest trust.
