# Forge Trainer — installable web app (PWA)

Everything is in this folder. Host it on any static web host over HTTPS and it installs to a phone's home screen, opens full-screen and works offline.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (exercise library, animated demonstrations, logger, programme editor, coach, analytics) |
| `manifest.webmanifest` | App name, icon and full-screen settings used when installing |
| `sw.js` | Service worker: caches the app for offline use and picks up updates on reload |
| `icons/` | Home-screen icons (192, 512, maskable, Apple touch) |

## Deploy (pick one, all free)

**Cloudflare Pages** — https://pages.cloudflare.com → Create a project → Upload assets → upload this folder → Deploy. You get `https://<name>.pages.dev`; add your own domain under Custom domains if you want.

**Netlify** — https://app.netlify.com/drop → drag the folder onto the page. You get `https://<name>.netlify.app`.

**GitHub Pages** — put these files in a repository, Settings → Pages → Deploy from branch (`main`, root). You get `https://<user>.github.io/<repo>/`.

Any host works as long as it serves over HTTPS (the service worker and "Add to Home Screen" require it).

## Install on a phone

- iPhone (Safari): open the URL → Share → **Add to Home Screen**.
- Android (Chrome): open the URL → menu → **Add to Home screen** / **Install app**, or use the Install button in the app's Settings tab.

## Data

Training data is stored on the device (browser storage). It is not sent anywhere.
Settings → Backup (JSON) downloads a full copy; Restore loads it on another phone. Export history (CSV) gives a spreadsheet of every set.

## Updating the app

Replace `index.html` (and `sw.js`, which carries the version) on the host. Installed copies fetch the new version on their next reload with a connection and show a "Reload" prompt.

## What is different from the Claude artifact version

- No account sync (data stays per device; move it with Backup/Restore).
- Ask My Coach uses the built-in interpreter only. The Claude fallback can be added later with a small serverless function and an Anthropic API key.
