const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-10-27T10:00:00') });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + require('path').resolve('test/local.html')); await p.waitForTimeout(600);
  await p.click('.nav button:has-text("Programme")'); await p.waitForTimeout(400);
  const info = await p.evaluate(() => { const bs = [...document.querySelectorAll('.cal button')]; return { n: bs.length, first: bs.slice(0, 3).map(b => b.className + '|' + b.textContent + '|' + getComputedStyle(b).display + '|' + b.getBoundingClientRect().height), kinds: bs.map(b => b.className.split(' ')[0]).join(',') }; });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
