// Builds the installable PWA into pwa/ : index.html, manifest, service worker, icons, README
const fs = require('fs'); const path = require('path');
const read = f => fs.readFileSync('src/' + f, 'utf8');
const VERSION = 'v' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now().toString(36).slice(-4);
const js = ['exercises.js', 'rig.js', 'state.js', 'coach.js', 'ui.js', 'ui2.js'].map(read).join('\n') + `
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
window.addEventListener('DOMContentLoaded', () => App.boot());
if (document.readyState !== 'loading') App.boot();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready', { action: { label: 'Reload', fn: () => location.reload() }, ms: 15000 }); }); });
    }).catch(() => {});
  });
}
`;
fs.mkdirSync('pwa', { recursive: true });
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Forge Trainer</title>
<meta name="description" content="Hypertrophy training app: workout logger, animated exercise demonstrations, editable programme, progress analytics.">
<meta name="theme-color" content="#0b0c0e">
<meta name="color-scheme" content="dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Forge">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap">
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
img { max-width: 100%; } [hidden] { display: none !important; }
${read('style.css')}
</style>
</head>
<body>
<div id="app"></div>
<script>window.FORGE_STANDALONE = true; window.FORGE_VERSION = '${VERSION}';</script>
<script>
${js.replace(/<\/script>/g, '<\\/script>')}
</script>
</body>
</html>
`;
fs.writeFileSync('pwa/index.html', html);
fs.writeFileSync('pwa/manifest.webmanifest', JSON.stringify({
  name: 'Forge Trainer', short_name: 'Forge', description: 'Hypertrophy training app with a live workout logger, animated exercise demonstrations and a fully editable programme.',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#0b0c0e', theme_color: '#0b0c0e', lang: 'en', categories: ['health', 'fitness', 'sports'],
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));
fs.writeFileSync('pwa/sw.js', `// Forge Trainer service worker: app shell cached for offline use, fonts cached on first use.
const CACHE = 'forge-${VERSION}';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // network first for the shell so updates land, cache as fallback for offline
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  } else if (/fonts\\.(googleapis|gstatic)\\.com/.test(url.host)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => new Response('', { status: 503 }))));
  }
});
`);
console.log('built pwa/ ' + VERSION + ' (' + (html.length / 1024).toFixed(0) + ' KB)');
