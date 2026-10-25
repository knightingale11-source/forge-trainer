const fs = require('fs');
const read = f => fs.readFileSync('src/' + f, 'utf8');
const js = ['exercises.js', 'rig.js', 'state.js', 'coach.js', 'ui.js', 'ui2.js'].map(read).join('\n') + '\nwindow.addEventListener("DOMContentLoaded", () => App.boot());\nif (document.readyState !== "loading") App.boot();\n';
const body = `<title>Forge Trainer</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap">
<style>
${read('style.css')}
</style>
<div id="app"></div>
<script>
${js.replace(/<\/script>/g, '<\\/script>')}
</script>
`;
fs.writeFileSync('dist/forge.html', body);
// local test wrapper mirroring the publish skeleton
fs.writeFileSync('test/local.html', `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`);
console.log('built', (body.length / 1024).toFixed(0) + ' KB');
