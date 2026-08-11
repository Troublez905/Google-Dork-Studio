Google Play Store — Quick how-to (overview)

1) Create developer account
- Sign up at https://play.google.com/console/signup (one-time fee). Keep account secure.

2) Prepare an Android app bundle (AAB)
- Use Capacitor or native Android Gradle to produce an AAB.
- Sign the AAB with your keystore (see `WINDOWS_SIGNING.md` for keystore notes).
- Test the signed AAB on internal devices and with Play internal testing track.

3) Create a Play Console app entry
- In Play Console: All apps → Create app → enter title, default language, app type (App/Game), Free/Paid.
- Complete store listing fields: short description, full description, graphics (icon, feature graphic), screenshots for phone/tablet.
- Choose content rating, target audience, privacy policy URL, and contact email.

4) Upload release to a track
- Go to Release → Production (or Internal testing) → Create new release → upload AAB.
- Provide release notes and roll out to testers or production.

5) App signing and keystore
- Google Play App Signing: recommended. Upload your app signing key once; Google will re-sign your artifacts for distribution. Keep your upload key safe.
- If using manual signing, keep the keystore and passwords in a secure secret manager (do NOT commit to git).

6) Testing and rollout
- Use internal testing first, then staged rollout (e.g., 10%) before full production release.
- Monitor crashes, ANRs, and user feedback.

7) Automation
- Use GitHub Actions to run `./gradlew bundleRelease` and upload artifacts to Play via `r0adkll/upload-google-play-action` using service account JSON (store it in GitHub secrets).

Security note:
- Never commit keystore files or service account JSON to source control. Store them as encrypted secrets in CI or the OS secret manager.
