const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? (r.active ? 'active' : r.installing ? 'installing' : 'waiting') : 'none'; });
  console.log('service worker:', sw);
  await p.reload(); await p.waitForTimeout(800);
  const ctrl = await p.evaluate(() => !!navigator.serviceWorker.controller); console.log('controlled by SW after reload:', ctrl);
  // log a set so there is data, then go offline and reload
  await p.evaluate(() => { const w = Store.workouts[Dates.today()]; if (w) { w.entries[0].sets[0].w = 70; w.entries[0].sets[0].done = true; Store.touchWorkout(Dates.today()); } });
  await ctx.setOffline(true); await p.reload({ waitUntil: 'domcontentloaded' }).catch(e => console.log('offline reload error:', e.message)); await p.waitForTimeout(800);
  const title = await p.title(); const w = await p.evaluate(() => { const w = Store.workouts[Dates.today()]; return w ? w.entries[0].sets[0].w : null; });
  console.log('offline: title =', title, '| stored weight survived =', w);
  const manifest = await p.evaluate(() => fetch('./manifest.webmanifest').then(r => r.json()).catch(e => 'manifest fetch failed offline: ' + e.message)); console.log('manifest offline:', typeof manifest === 'object' ? manifest.short_name + ' ok' : manifest);
  await p.screenshot({ path: '/tmp/claude-0/-home-claude/78e4ee67-e254-574d-bcb7-78a88caca98b/scratchpad/pwa_offline.png' });
  await ctx.setOffline(false);
  await p.click('.nav button:has-text("Settings")'); await p.waitForTimeout(400); console.log('install card:', await p.textContent('.card:has(h3:text("Install"))'));
  console.log(errs.length ? 'PAGE ERRORS: ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
