const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-10-27T10:00:00') });
  await p.goto('file://' + require('path').resolve('test/local.html')); await p.waitForTimeout(600);
  await p.click('.nav button:has-text("Programme")'); await p.waitForTimeout(400);
  const info = await p.evaluate(() => { const c = document.querySelector('.cal'); const cs = getComputedStyle(c); const bs = [...c.querySelectorAll('button')]; return { display: cs.display, cols: cs.gridTemplateColumns, calRect: c.getBoundingClientRect().toJSON(), cells: bs.map(b => { const r = b.getBoundingClientRect(); return b.textContent.slice(0,2) + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + 'x' + Math.round(r.height); }).join(' ') }; });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
