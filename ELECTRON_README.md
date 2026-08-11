Electron scaffold

1) Install deps (locally):
   npm install --save-dev electron electron-builder

2) Dev run:
   npm run electron:dev

3) Package for Windows (example):
   npm run electron:package

Notes:
- Add electron-builder config to package.json or an electron-builder.yml for code signing.
- For Windows code signing, store PFX cert as a GitHub secret and configure CI to import it during build.
