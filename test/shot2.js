const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; await p.clock.install({ time: new Date('2026-10-27T10:00:00') });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + require('path').resolve('test/local.html')); await p.waitForTimeout(900);
  await p.screenshot({ path: process.argv[2] || '/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/today.png', fullPage: true });
  // exercise a flow: complete a set, open demo, open coach
  await p.click('text=Complete set 1'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/after_set.png' });
  await p.click('.ex .btn:has-text("Demo")'); await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/demo.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.click('.fab'); await p.waitForTimeout(300);
  await p.fill('.sheet textarea', 'Give me five chest exercises instead of four'); await p.click('text=Preview change'); await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/coach.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  for (const t of ['Programme', 'Library', 'Progress', 'Settings']) { await p.click(`.nav button:has-text("${t}")`); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/tab_${t}.png`, fullPage: t !== 'Library' }); }
  const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log('scroll width', w); console.log(errs.length ? errs.join('\n') : 'no console errors');
  await b.close();
})();
