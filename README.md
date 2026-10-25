# Forge Trainer

Installable hypertrophy training app: live workout logger with rest timer, animated demonstrations for 83 exercises, a fully editable training programme with weekly barbell/dumbbell rotation, plain-English programme changes with preview and undo, and progress analytics.

- `docs/` — the deployable app (served by GitHub Pages). Open `docs/index.html` on any static host.
- `src/` — source modules: `exercises.js` (library + movement keyframes), `rig.js` (SVG figure animator), `state.js` (schedule, store, stats), `coach.js` (command interpreter), `ui.js` / `ui2.js` (screens), `style.css`.
- `build.js` builds the Claude-artifact version into `dist/`; `build-pwa.js` builds the installable version into `pwa/` (copy to `docs/` to publish).
- `test/` — Playwright checks: pose contact sheet, phone flow screenshots, end-to-end scenario.

Data stays on the device; Settings → Backup exports it as JSON.
