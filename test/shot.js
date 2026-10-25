const { chromium } = require('playwright');
(async () => {
  const [,, file, out, w, h, full] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w || 1400, height: +h || 900 }, deviceScaleFactor: 1 });
  p.on('console', m => console.log('console:', m.type(), m.text())); p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + require('path').resolve(file)); await p.waitForTimeout(600);
  await p.screenshot({ path: out, fullPage: full === 'full' }); await b.close(); console.log('ok', out);
})();
