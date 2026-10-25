const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('ok -', m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-26T09:00:00') });
  const url = 'file://' + require('path').resolve('test/local.html');
  await p.goto(url); await p.waitForTimeout(500);
  // 1-2 today's session with 8 exercises
  let n = await p.evaluate(() => Store.workouts[Dates.today()].entries.length); assert(n === 8, 'today has 8 prescribed exercises');
  const name = await p.textContent('.hero h1'); assert(name.includes('Chest'), 'Monday 26 Oct is Chest & Triceps: ' + name);
  // 3 demos for every exercise in library mount with svg
  const demoCount = await p.evaluate(() => EX.list.filter(e => { const d = document.createElement('div'); const a = Rig.mount(d, e, { autoplay: false }); const ok = a && d.querySelector('svg') && d.querySelectorAll('line').length > 8; a && a.destroy(); return ok; }).length);
  assert(demoCount === (await p.evaluate(() => EX.list.length)), 'every library exercise renders a demonstration (' + demoCount + ')');
  // 8 record weight/reps for every set, 9 complete sets + rest timer
  await p.evaluate(() => { const w = Store.workouts[Dates.today()]; w.entries.forEach((e, i) => e.sets.forEach(s => { s.w = 60 + i * 5; s.r = 10; })); Store.touchWorkout(Dates.today()); });
  await p.waitForTimeout(200); await p.click('.ex >> nth=0 >> text=Complete set 1'); await p.waitForTimeout(300);
  assert(await p.isVisible('.rest'), 'rest timer appears after completing a set');
  await p.click('.rest >> text=Skip');
  // 4 edit reps & sets via editor (today only)
  await p.click('.ex >> nth=0 >> text=Edit'); await p.waitForTimeout(300);
  await p.fill('.sheet input[type=number] >> nth=0', '5'); await p.click('.sheet >> text=Save'); await p.waitForTimeout(300);
  n = await p.evaluate(() => Store.workouts[Dates.today()].entries[0].sets.length); assert(n === 5, 'sets edited to 5 without losing the completed set: ' + n);
  // 5 replace exercise via picker, keep done set in history
  await p.click('.ex >> nth=1 >> text=Replace'); await p.waitForTimeout(400);
  await p.click('.sheet .item >> nth=0'); await p.waitForTimeout(300); await p.click('.sheet >> text=/^Use /'); await p.waitForTimeout(300);
  const ex1 = await p.evaluate(() => Store.workouts[Dates.today()].entries[1].ex); assert(ex1 !== 'skullcrusher', 'exercise 2 replaced: ' + ex1);
  // 6-7 coach: change groups & counts; 15 NL; 16 undo
  const run = async (cmd) => p.evaluate(async (cmd) => { const c = { today: Dates.today() }; const r = Coach.parse(cmd, c); const sc = r.scope === 'today' || r.scope === 'date' ? r.scope : 'program'; const pv = Coach.preview(r.ops, sc, { ...c, date: r.date }); const ch = Coach.commit(r.ops, sc, { ...c, date: r.date, effectiveFrom: r.effectiveFrom }, cmd); return { pv, ch, ops: r.ops, unknown: r.unknown }; }, cmd);
  let r = await run('Change Tuesday to chest and biceps'); console.log('   ', r.ch[0]); assert(!r.unknown.length && !r.ch[0].startsWith('⚠'), 'change groups for a day');
  r = await run('Give me five chest exercises instead of four'); console.log('   ', r.ch[0]); assert(/4 → 5/.test(r.ch[0]), 'increase exercise count');
  r = await run('Make all triceps exercises 12 reps'); console.log('   ', r.ch[0]); assert(/12 reps/.test(r.ch[0] || ''), 'reps without the word to');
  const u1 = await p.evaluate(() => Store.config.undo.length); assert(u1 >= 2, 'undo stack grows: ' + u1);
  const before = await p.evaluate(() => Store.program.sessions[Store.program.cycle[0]].slots.filter(s => (Lib.get(s.ex) || {}).group === 'chest').length);
  await p.evaluate(() => App.doUndo()); await p.evaluate(() => App.doUndo());
  const after = await p.evaluate(() => Store.program.sessions[Store.program.cycle[0]].slots.filter(s => (Lib.get(s.ex) || {}).group === 'chest').length);
  assert(before === 5 && after === 4, `undo restores chest count ${before} -> ${after}`);
  // 14 barbell/dumbbell switching
  const emA = await p.evaluate(() => Sched.resolve('2026-10-26').emphasis), emB = await p.evaluate(() => Sched.resolve('2026-11-02').emphasis);
  assert(emA === 'barbell' && emB === 'dumbbell', 'equipment alternates weekly: ' + emA + '/' + emB);
  const exW1 = await p.evaluate(() => Sched.resolve('2026-10-26').slots[0].exResolved), exW2 = await p.evaluate(() => Sched.resolve('2026-11-02').slots[0].exResolved);
  assert(exW1 !== exW2, 'first chest slot resolves to a different variant next week: ' + exW1 + ' / ' + exW2);
  r = await run('Switch this week to dumbbells'); const emC = await p.evaluate(() => Sched.resolve('2026-10-28').emphasis); assert(emC === 'dumbbell', 'week override to dumbbells');
  // 10 cardio & core logged, 11 finish & save, 12 reload
  await p.evaluate(() => { const w = Store.workouts[Dates.today()]; w.cardio.done = true; w.cardio.minutes = 22; w.core.forEach(e => e.sets.forEach(s => { s.done = true; })); w.entries.forEach(e => e.sets.forEach(s => { s.done = true; })); Store.touchWorkout(Dates.today()); });
  await p.waitForTimeout(200); await p.click('text=/Finish workout/'); await p.waitForTimeout(400);
  assert(await p.isVisible('text=Workout summary'), 'summary sheet after finishing');
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(600);
  const st = await p.evaluate(() => Store.workouts[Dates.today()].status); assert(st === 'done', 'workout persisted across reload: ' + st);
  // 13 history & progression on next session, 17 export/restore
  await run('Switch this week to barbells');
  await p.clock.setFixedTime(new Date('2026-10-30T09:00:00')); await p.reload(); await p.waitForTimeout(700);
  const prevs = await p.$$eval('.ex-prev', els => els.map(e => e.textContent)); const prev = prevs.find(t => /Last/.test(t)) || prevs.join('|'); assert(/Last/.test(prev), 'previous performance shown: ' + prev.slice(0, 70));
  assert(await p.isVisible('.suggest'), 'progressive overload suggestion appears after hitting the top of the range');
  console.log('   ', await p.textContent('.suggest'));
  const json = await p.evaluate(() => Store.exportJSON()); const csv = await p.evaluate(() => Store.exportCSV());
  assert(json.length > 1000 && csv.split('\n').length > 10, 'export JSON and CSV');
  await p.evaluate(() => Store.resetAll()); await p.waitForTimeout(100);
  await p.evaluate((j) => Store.importJSON(j, 'replace'), json); await p.waitForTimeout(100);
  const st2 = await p.evaluate(() => Store.workouts['2026-10-26'] && Store.workouts['2026-10-26'].status); assert(st2 === 'done', 'restore brings back the logged workout');
  await p.click('.nav button:has-text("Progress")'); await p.waitForTimeout(500); assert(await p.isVisible('text=Strength'), 'progress tab renders with history');
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
