const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); await p.clock.install({ time: new Date('2026-10-27T10:00:00') });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + require('path').resolve('test/local.html')); await p.waitForTimeout(600);
  await p.click('.ex .btn:has-text("Demo")'); await p.waitForTimeout(500);
  const info = await p.evaluate(() => { const d = document.querySelector('.sheet .demo'); const s = d.querySelector('svg'); return { children: [...d.children].map(c => c.tagName + '.' + c.className.baseVal ?? c.className), svg: s ? { w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height, vb: s.getAttribute('viewBox'), n: s.childElementCount, cls: s.getAttribute('class') } : null, demoH: d.getBoundingClientRect().height }; });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
