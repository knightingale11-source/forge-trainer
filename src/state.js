/* ===== Dates, library access, programme generator, schedule, store, stats ===== */
const Dates = (() => {
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => toISO(new Date());
  const addDays = (iso, n) => { const d = parse(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const weekday = iso => parse(iso).getDay();
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (iso, style) => { const d = parse(iso); if (style === 'short') return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()]}`; if (style === 'day') return `${d.getDate()} ${MON[d.getMonth()]}`; return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const nextWeekday = (fromISO, dow, inclusive) => { let d = fromISO; for (let i = 0; i < 8; i++) { if (weekday(d) === dow && (inclusive || i > 0)) return d; d = addDays(d, 1); } return d; };
  return { toISO, parse, today, addDays, diff, weekday, fmt, DOW, MON, nextWeekday };
})();

const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const clone = o => JSON.parse(JSON.stringify(o));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ---- Library: built-in + custom exercises ---- */
const Lib = {
  custom: {},
  get(id) { return EX.byId[id] || Lib.custom[id] || null; },
  all() { return EX.list.concat(Object.values(Lib.custom)); },
  byGroup(g) { return Lib.all().filter(e => e.group === g); },
  groupLabel(g) { return EX.GROUPS[g] ? EX.GROUPS[g].label : cap(g); },
  groupsOf(g) { return EX.COMPOSITES[g] || [g]; },
  isGroup(g) { return !!EX.GROUPS[g] || !!EX.COMPOSITES[g]; },
  // fuzzy find an exercise by free text
  find(text) {
    const q = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) return null;
    const all = Lib.all();
    const exact = all.find(e => e.name.toLowerCase() === q); if (exact) return exact;
    const words = q.split(' ').filter(w => !['the', 'a', 'an', 'my', 'with', 'exercise', 'exercises', 'flat'].includes(w) || w === 'flat');
    let best = null, bestScore = 0;
    for (const e of all) {
      const n = e.name.toLowerCase(); const nw = n.split(/\s|-/);
      let score = 0;
      for (const w0 of words) { const w = w0.replace(/s$/, ''); if (nw.includes(w0) || nw.includes(w)) score += 2; else if (n.includes(w)) score += 1; else if (w === 'db' && e.equip === 'dumbbell') score += 1.5; else if (w === 'bb' && e.equip === 'barbell') score += 1.5; }
      if (words.includes('dumbbell') && e.equip !== 'dumbbell') score -= 2;
      if (words.includes('barbell') && e.equip !== 'barbell') score -= 2;
      if (words.includes('incline') && !n.includes('incline')) score -= 2;
      if (!words.includes('incline') && n.includes('incline')) score -= 1;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return bestScore >= 2 ? best : null;
  },
  findGroup(text) {
    const t = text.toLowerCase().trim();
    const map = { chest: 'chest', pecs: 'chest', back: 'back', lats: 'back', shoulders: 'shoulders', shoulder: 'shoulders', delts: 'shoulders', triceps: 'triceps', tricep: 'triceps', tris: 'triceps', biceps: 'biceps', bicep: 'biceps', bis: 'biceps', quads: 'quads', quad: 'quads', hamstrings: 'hamstrings', hams: 'hamstrings', hamstring: 'hamstrings', glutes: 'glutes', glute: 'glutes', calves: 'calves', calf: 'calves', traps: 'traps', trap: 'traps', core: 'core', abs: 'core', abdominals: 'core', legs: 'legs', leg: 'legs', arms: 'arms', arm: 'arms' };
    return map[t] || null;
  },
};

/* ---- Programme generator ---- */
const Gen = {
  variants(ex) {
    if (!ex.family) return null;
    const v = {}, pr = {};
    for (const e of Lib.all()) if (e.family === ex.family && (e.equip === 'barbell' || e.equip === 'dumbbell') && (pr[e.equip] == null || e.prio < pr[e.equip] || e.id === ex.id)) { if (v[e.equip] === ex.id) continue; v[e.equip] = e.id; pr[e.equip] = e.id === ex.id ? -1 : e.prio; }
    return Object.keys(v).length > 1 ? v : null;
  },
  slot(ex, o = {}) {
    const comp = ex.type === 'compound';
    return { id: uid(), ex: ex.id, variants: Gen.variants(ex), sets: o.sets || 4, repMin: o.repMin || (comp ? 6 : 10), repMax: o.repMax || (comp ? 10 : 15), rest: o.rest || ex.rest || (comp ? 150 : 90), rir: o.rir == null ? 2 : o.rir, warmup: o.warmup == null ? (comp ? 1 : 0) : o.warmup, tempo: ex.tempo && ex.tempo !== '-' && ex.tempo !== 'hold' ? ex.tempo : '' };
  },
  rank(group, opts = {}) {
    const prefer = opts.prefer || 'barbell', ex = opts.exclude || [];
    const fams = new Set(ex.map(id => (Lib.get(id) || {}).family).filter(Boolean));
    return Lib.byGroup(group).filter(e => !ex.includes(e.id) && !(e.family && fams.has(e.family)) && !(opts.tag && !(e.tags || []).includes(opts.tag)))
      .sort((a, b) => a.prio - b.prio || (a.equip === prefer ? 0 : 1) - (b.equip === prefer ? 0 : 1) || (a.type === 'compound' ? 0 : 1) - (b.type === 'compound' ? 0 : 1));
  },
  pick(group, n, opts = {}) {
    const subs = Lib.groupsOf(group);
    const used = (opts.exclude || []).slice(); const out = [];
    const order = subs.length === 1 ? Array(n).fill(group) : group === 'legs' ? ['quads', 'hamstrings', 'quads', 'glutes', 'calves', 'hamstrings', 'quads', 'calves', 'glutes', 'quads'] : subs.concat(subs, subs, subs);
    for (let i = 0; i < order.length && out.length < n; i++) {
      const c = Gen.rank(order[i], { ...opts, exclude: used })[0];
      if (c) { out.push(c); used.push(c.id); }
    }
    return out;
  },
  sessionName(groups) { return groups.map(Lib.groupLabel).join(' & '); },
  buildSession(groups, o = {}) {
    const per = o.perGroup || {};
    const dflt = o.exercisesPerGroup || Math.max(2, Math.round(8 / Math.max(1, groups.length)));
    const used = (o.exclude || []).slice();
    const lists = groups.map(g => { const l = Gen.pick(g, per[g] || dflt, { prefer: o.prefer, exclude: used }); for (const e of l) used.push(e.id); return l; });
    const slots = [];
    const max = Math.max(...lists.map(l => l.length), 0);
    for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) slots.push(Gen.slot(l[i], { sets: o.sets }));
    return { id: uid(), name: o.name || Gen.sessionName(groups), groups: groups.slice(), slots, cardio: null, core: null };
  },
  defaultProgram() {
    const sessions = [
      Gen.buildSession(['chest', 'triceps']), Gen.buildSession(['back', 'core']), Gen.buildSession(['legs', 'biceps']), Gen.buildSession(['shoulders', 'traps']),
    ];
    return { id: 'p1', name: 'Hypertrophy 4-Day Split', createdAt: Date.now(), cycle: sessions.map(s => s.id), sessions: Object.fromEntries(sessions.map(s => [s.id, s])),
      cardio: { enabled: true, activity: 'incline_walk', minutes: 20, intensity: 'moderate', position: 'after' },
      core: { enabled: true, count: 2, sets: 3, position: 'after' } };
  },
  coreExercises(n, exclude = []) { return Gen.rank('core', { exclude }).slice(0, n); },
};

/* ---- Store: config + workouts, localStorage mirror + artifact db ---- */
const Store = (() => {
  const KEY = 'pt.state.v1';
  const S = { config: null, workouts: {}, db: null, dbState: 'local', listeners: new Set(), dirtyConfig: false, dirtyDates: new Set(), writing: new Set(), timer: null, lastErr: null, user: null };
  function defaultConfig() {
    return { v: 1, updatedAt: Date.now(),
      settings: { units: 'kg', weightStep: 2.5, startDate: '2026-10-26', activeProgramId: 'p1', paused: false, pausedFrom: null,
        rotation: { enabled: true, cycle: ['barbell', 'dumbbell'], weekOverrides: {} }, restWeekdays: [], deloadWeeks: [], volumeWarn: 20, defaultRest: 90, autoRest: true, coachAI: true, keepAwake: true, bodyweight: null, name: '' },
      programs: {}, overrides: {}, customExercises: {}, undo: [] };
  }
  function load() {
    let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (raw) { try { const o = JSON.parse(raw); S.config = o.config; S.workouts = o.workouts || {}; } catch (e) { } }
    if (!S.config) { S.config = defaultConfig(); S.config.programs.p1 = Gen.defaultProgram(); }
    if (!S.config.undo) S.config.undo = [];
    if (!S.config.customExercises) S.config.customExercises = {};
    Lib.custom = S.config.customExercises;
  }
  function adopt(cfg) { S.config = cfg; if (!S.config.undo) S.config.undo = []; if (!S.config.customExercises) S.config.customExercises = {}; Lib.custom = S.config.customExercises; }
  function persistLocal() { try { localStorage.setItem(KEY, JSON.stringify({ config: S.config, workouts: S.workouts })); } catch (e) { } }
  function emit() { for (const l of S.listeners) { try { l(); } catch (e) { console.error(e); } } }
  function trimUndo() { while (S.config.undo.length > 8 || (S.config.undo.length && JSON.stringify(S.config).length > 200000)) S.config.undo.shift(); }
  function touch(opts = {}) {
    S.config.updatedAt = Date.now(); trimUndo(); S.dirtyConfig = true; persistLocal(); scheduleFlush(); if (!opts.silent) emit();
  }
  function touchWorkout(date, opts = {}) {
    const w = S.workouts[date]; if (w) w.updatedAt = Date.now();
    S.dirtyDates.add(date); persistLocal(); scheduleFlush(); if (!opts.silent) emit();
  }
  function scheduleFlush() { clearTimeout(S.timer); S.timer = setTimeout(flush, 700); }
  async function flush() {
    if (!S.db) return;
    if (S.dirtyConfig && !S.writing.has('config')) {
      S.dirtyConfig = false; S.writing.add('config');
      try { await S.db.doc('app/config').set(clone(S.config)); S.dbState = 'synced'; S.lastErr = null; }
      catch (e) { S.dirtyConfig = true; S.lastErr = e; S.dbState = e && e.code === 'invalid_argument' ? 'readonly' : 'error'; }
      S.writing.delete('config');
    }
    for (const date of Array.from(S.dirtyDates)) {
      if (S.writing.has(date)) continue;
      S.dirtyDates.delete(date); S.writing.add(date);
      try {
        const w = S.workouts[date];
        if (w) await S.db.doc('workouts/' + date).set(clone(w)); else await S.db.doc('workouts/' + date).delete();
        S.dbState = 'synced'; S.lastErr = null;
      } catch (e) { S.dirtyDates.add(date); S.lastErr = e; S.dbState = e && e.code === 'invalid_argument' ? 'readonly' : 'error'; }
      S.writing.delete(date);
    }
    if (S.dirtyConfig || S.dirtyDates.size) scheduleFlush();
    emit();
  }
  async function connect() {
    if (!window.claude || !window.claude.use) { S.dbState = 'local'; emit(); return; }
    let db = null;
    try { db = await window.claude.use('db'); } catch (e) { db = null; }
    if (!db) { S.dbState = 'local'; emit(); return; }
    S.db = db; S.dbState = 'syncing'; emit();
    try {
      const snap = await db.doc('app/config').get();
      if (snap.exists) {
        const remote = snap.data();
        if ((remote.updatedAt || 0) > (S.config.updatedAt || 0)) { adopt(remote); persistLocal(); }
        else if ((remote.updatedAt || 0) < (S.config.updatedAt || 0)) S.dirtyConfig = true;
      } else S.dirtyConfig = true;
      const q = await db.collection('workouts').get();
      const seen = new Set();
      for (const d of q.docs) {
        const r = d.data(); seen.add(d.id); const l = S.workouts[d.id];
        const untouched = l && l.status === 'planned' && !(l.entries || []).some(e => e.sets.some(x => x.done));
        if (!l || untouched || (r.updatedAt || 0) > (l.updatedAt || 0)) S.workouts[d.id] = r;
        else if ((r.updatedAt || 0) < (l.updatedAt || 0)) S.dirtyDates.add(d.id);
      }
      for (const date in S.workouts) if (!seen.has(date)) S.dirtyDates.add(date);
      persistLocal();
      S.dbState = 'synced';
      // live updates from other devices
      db.doc('app/config').onSnapshot(s => {
        if (!s.exists || s.metadata.hasPendingWrites) return;
        const r = s.data(); if ((r.updatedAt || 0) > (S.config.updatedAt || 0)) { adopt(r); persistLocal(); emit(); }
      }, e => { S.lastErr = e; });
      db.collection('workouts').onSnapshot(s => {
        if (s.metadata.hasPendingWrites) return; let changed = false;
        for (const ch of s.docChanges()) {
          const r = ch.doc.data(), id = ch.doc.id, l = S.workouts[id];
          if (ch.type === 'removed') { if (l && !S.dirtyDates.has(id)) { delete S.workouts[id]; changed = true; } }
          else if (r && (!l || (r.updatedAt || 0) > (l.updatedAt || 0))) { S.workouts[id] = r; changed = true; }
        }
        if (changed) { persistLocal(); emit(); }
      }, e => { S.lastErr = e; });
    } catch (e) { S.lastErr = e; S.dbState = 'error'; }
    scheduleFlush(); emit();
  }
  // ---- undo ----
  function snapshot() { return clone({ programs: S.config.programs, overrides: S.config.overrides, settings: S.config.settings }); }
  function pushUndo(label) { S.config.undo.push({ label, at: Date.now(), snap: snapshot() }); trimUndo(); }
  function undo() {
    const u = S.config.undo.pop(); if (!u) return null;
    Object.assign(S.config, u.snap); Lib.custom = S.config.customExercises; touch(); return u.label;
  }
  // ---- import / export ----
  function exportJSON() { return JSON.stringify({ app: 'Forge Trainer', exportedAt: new Date().toISOString(), config: S.config, workouts: S.workouts }, null, 1); }
  function importJSON(text, mode) {
    const o = JSON.parse(text); if (!o || !o.config || !o.config.programs) throw new Error('Not a trainer backup file');
    if (mode === 'replace') { adopt(o.config); S.workouts = o.workouts || {}; }
    else { for (const d in (o.workouts || {})) if (!S.workouts[d] || (o.workouts[d].updatedAt || 0) > (S.workouts[d].updatedAt || 0)) S.workouts[d] = o.workouts[d];
      for (const p in o.config.programs) S.config.programs[p] = o.config.programs[p];
      Object.assign(S.config.overrides, o.config.overrides || {}); Object.assign(S.config.customExercises, o.config.customExercises || {}); }
    S.config.updatedAt = Date.now(); S.dirtyConfig = true; for (const d in S.workouts) S.dirtyDates.add(d); persistLocal(); scheduleFlush(); emit();
  }
  function exportCSV() {
    const rows = [['date', 'session', 'exercise', 'muscle', 'set', 'weight_kg', 'reps', 'rir', 'done', 'est_1rm']];
    for (const date of Object.keys(S.workouts).sort()) {
      const w = S.workouts[date];
      for (const en of [...(w.entries || []), ...(w.core || [])]) {
        const ex = Lib.get(en.ex); en.sets.forEach((s, i) => rows.push([date, w.name, ex ? ex.name : en.ex, ex ? ex.group : '', i + 1, s.w ?? '', s.r ?? '', s.rir ?? '', s.done ? 1 : 0, s.done && s.w && s.r ? Stats.e1rm(s.w, s.r).toFixed(1) : '']));
      }
      if (w.cardio && w.cardio.done) rows.push([date, w.name, 'Cardio: ' + (EX.CARDIO.find(c => c.id === w.cardio.activity) || {}).label, 'cardio', '', '', w.cardio.minutes + ' min', '', 1, '']);
    }
    return rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
  }
  function resetAll() { adopt(defaultConfig()); S.config.programs.p1 = Gen.defaultProgram(); const dates = Object.keys(S.workouts); S.workouts = {}; S.dirtyConfig = true; for (const d of dates) S.dirtyDates.add(d); persistLocal(); scheduleFlush(); emit(); }
  load();
  return {
    get config() { return S.config; }, get workouts() { return S.workouts; }, get settings() { return S.config.settings; },
    get program() { return S.config.programs[S.config.settings.activeProgramId] || Object.values(S.config.programs)[0]; },
    get dbState() { return S.dbState; }, get lastErr() { return S.lastErr; }, get hasDb() { return !!S.db; },
    touch, touchWorkout, connect, pushUndo, undo, exportJSON, importJSON, exportCSV, resetAll, snapshot,
    subscribe(fn) { S.listeners.add(fn); return () => S.listeners.delete(fn); },
    flushNow() { clearTimeout(S.timer); return flush(); },
  };
})();

/* ---- Schedule: which session falls on which date ---- */
const Sched = (() => {
  let cache = {}, cacheKey = '';
  function key() { return Store.config.updatedAt + ':' + Store.settings.activeProgramId; }
  function emphasisFor(date) {
    const s = Store.settings, wk = weekIndex(date);
    if (s.rotation.weekOverrides && s.rotation.weekOverrides[wk]) return s.rotation.weekOverrides[wk];
    if (!s.rotation.enabled || !s.rotation.cycle.length) return null;
    return s.rotation.cycle[((wk % s.rotation.cycle.length) + s.rotation.cycle.length) % s.rotation.cycle.length];
  }
  function weekIndex(date) { return Math.floor(Dates.diff(Store.settings.startDate, date) / 7); }
  function resolveSlotExercise(slot, emphasis) { return (emphasis && slot.variants && slot.variants[emphasis]) || slot.ex; }
  function resolve(date) {
    if (cacheKey !== key()) { cache = {}; cacheKey = key(); }
    if (cache[date]) return cache[date];
    const cfg = Store.config, s = cfg.settings, prog = Store.program;
    const base = { date, weekIdx: weekIndex(date), emphasis: emphasisFor(date), deload: (s.deloadWeeks || []).includes(weekIndex(date)) };
    const ov = cfg.overrides[date];
    let r;
    if (!prog) r = { ...base, kind: 'none' };
    else if (s.paused && (!s.pausedFrom || date >= s.pausedFrom)) r = { ...base, kind: 'paused' };
    else if (date < s.startDate) r = { ...base, kind: 'before' };
    else if (ov && ov.rest) r = { ...base, kind: 'rest', override: ov };
    else {
      let sessionId = null, adhoc = null;
      if (ov && ov.sessionId) { sessionId = ov.sessionId; adhoc = ov; }
      else if (ov && ov.groups) { adhoc = ov; }
      else if ((s.restWeekdays || []).includes(Dates.weekday(date))) r = { ...base, kind: 'rest', reason: 'weekday' };
      if (!r) {
        if (!sessionId && !adhoc && prog.scheduleMode === 'weekday') {
          const sid = (prog.weekdayMap || {})[Dates.weekday(date)];
          if (!sid || !prog.sessions[sid]) r = { ...base, kind: 'rest', reason: 'weekday' }; else sessionId = sid;
        }
        if (!r && !sessionId && !adhoc) {
          // count training days from start to this date, skipping rest days
          let idx = 0;
          for (let d = s.startDate; d < date; d = Dates.addDays(d, 1)) {
            const o = cfg.overrides[d];
            if (o && o.rest) continue;
            if ((s.restWeekdays || []).includes(Dates.weekday(d))) continue;
            idx++;
          }
          const entry = prog.cycle.length ? prog.cycle[idx % prog.cycle.length] : null;
          if (!entry || entry === 'rest') r = { ...base, kind: 'rest', reason: 'cycle', cycleIdx: idx };
          else sessionId = entry;
        }
        if (!r) {
          const sess = sessionId ? prog.sessions[sessionId] : null;
          const groups = adhoc && adhoc.groups ? adhoc.groups : sess ? sess.groups : [];
          const slots = adhoc && adhoc.slots ? adhoc.slots : sess ? sess.slots : [];
          r = { ...base, kind: 'session', sessionId: sess ? sess.id : null, override: adhoc, name: (adhoc && adhoc.name) || (sess ? sess.name : Gen.sessionName(groups)), groups,
            slots: slots.map(sl => ({ ...sl, exResolved: resolveSlotExercise(sl, base.emphasis) })),
            cardio: (adhoc && adhoc.cardio) || (sess && sess.cardio) || prog.cardio, core: (adhoc && adhoc.core) || (sess && sess.core) || prog.core };
        }
      }
    }
    cache[date] = r; return r;
  }
  // next n training dates from a date (inclusive)
  function upcoming(from, n) { const out = []; for (let d = from, i = 0; out.length < n && i < 60; d = Dates.addDays(d, 1), i++) { const r = resolve(d); if (r.kind === 'session') out.push(r); } return out; }
  function sessionDates(sessionId, from, n) { const out = []; for (let d = from, i = 0; out.length < n && i < 90; d = Dates.addDays(d, 1), i++) { const r = resolve(d); if (r.kind === 'session' && r.sessionId === sessionId) out.push(d); } return out; }
  return { resolve, upcoming, emphasisFor, weekIndex, resolveSlotExercise, sessionDates, invalidate() { cache = {}; } };
})();

/* ---- Workouts (logs) ---- */
const Log = (() => {
  function entryFromSlot(slot, exId, date) {
    const ex = Lib.get(exId); const last = Stats.lastPerformance(exId, date);
    const sets = []; const n = slot.sets || 3;
    for (let i = 0; i < n; i++) {
      const prev = last && last.sets[i] ? last.sets[i] : last && last.sets.length ? last.sets[last.sets.length - 1] : null;
      sets.push(ex && ex.timed ? { secs: prev ? prev.secs : slot.repMin || 30, done: false } : { w: prev ? prev.w : null, r: prev ? prev.r : slot.repMax || 10, rir: slot.rir == null ? 2 : slot.rir, done: false });
    }
    return { id: uid(), slotId: slot.id, ex: exId, sets, rest: slot.rest || 90, repMin: slot.repMin, repMax: slot.repMax, rir: slot.rir == null ? 2 : slot.rir, warmup: slot.warmup || 0, tempo: slot.tempo || '', note: '' };
  }
  function planKey(r) { return JSON.stringify([r.name, r.groups, r.deload, r.slots.map(sl => [sl.id, sl.exResolved, sl.sets, sl.repMin, sl.repMax, sl.rest, sl.rir]), r.cardio, r.core]); }
  function build(date) {
    const r = Sched.resolve(date); if (r.kind !== 'session') return null;
    const w = { date, programId: Store.program.id, sessionId: r.sessionId, name: r.name, groups: r.groups, emphasis: r.emphasis, deload: r.deload, status: 'planned', startedAt: null, finishedAt: null, createdAt: Date.now(), updatedAt: Date.now(), planKey: planKey(r),
      entries: r.slots.map(sl => entryFromSlot(r.deload ? { ...sl, sets: Math.max(2, (sl.sets || 3) - 1) } : sl, sl.exResolved, date)), cardio: null, core: [], notes: '' };
    const c = r.cardio; if (c && c.enabled !== false) w.cardio = { activity: c.activity || 'incline_walk', minutes: c.minutes || 20, intensity: c.intensity || 'moderate', position: c.position || 'after', distance: null, pace: '', hr: null, level: null, done: false };
    const k = r.core; const hasCore = r.groups.some(g => Lib.groupsOf(g).includes('core'));
    if (k && k.enabled !== false && !hasCore) {
      const picks = k.exercises && k.exercises.length ? k.exercises.map(id => Lib.get(id)).filter(Boolean) : Gen.coreExercises(k.count || 2, r.slots.map(s => s.exResolved));
      w.core = picks.map(ex => entryFromSlot({ id: 'core-' + ex.id, sets: k.sets || 3, repMin: ex.reps[0], repMax: ex.reps[1], rest: 60, rir: 1 }, ex.id, date));
      w.corePosition = k.position || 'after';
    }
    return w;
  }
  function ensure(date) {
    let w = Store.workouts[date];
    if (!w) { w = build(date); if (w) { Store.workouts[date] = w; Store.touchWorkout(date, { silent: true }); } }
    return w;
  }
  // re-sync a planned (not yet started) workout with the current schedule
  function refresh(date) {
    const w = Store.workouts[date]; if (!w) return ensure(date);
    const anyDone = (w.entries || []).some(e => e.sets.some(s => s.done)) || (w.core || []).some(e => e.sets.some(s => s.done)) || (w.cardio && w.cardio.done);
    if (w.status === 'done') return w;
    const r = Sched.resolve(date);
    if (r.kind !== 'session') { if (!anyDone) { delete Store.workouts[date]; Store.touchWorkout(date, { silent: true }); } return null; }
    if (!anyDone && w.status === 'planned') { if (w.planKey === planKey(r)) return w; const nw = build(date); nw.createdAt = w.createdAt; Store.workouts[date] = nw; Store.touchWorkout(date, { silent: true }); return nw; }
    // started: merge — keep entries that still exist, add new slots, drop untouched removed slots
    const bySlot = Object.fromEntries(w.entries.map(e => [e.slotId, e]));
    const byEx = {}; for (const e of w.entries) if (!byEx[e.ex]) byEx[e.ex] = e;
    const entries = [];
    for (const sl of r.slots) {
      let e = bySlot[sl.id];
      if (!e && byEx[sl.exResolved] && !r.slots.some(x => x.id === byEx[sl.exResolved].slotId)) { e = byEx[sl.exResolved]; e.slotId = sl.id; }
      if (e) { if (e.ex !== sl.exResolved && !e.sets.some(s => s.done)) entries.push(entryFromSlot(sl, sl.exResolved, date)); else { e.repMin = sl.repMin; e.repMax = sl.repMax; e.rest = sl.rest; while (e.sets.length < sl.sets) e.sets.push({ ...clone(e.sets[e.sets.length - 1] || { w: null, r: sl.repMax, rir: 2 }), done: false }); if (e.sets.length > sl.sets) { const keep = e.sets.filter((s, i) => s.done || i < sl.sets); e.sets = keep.slice(0, Math.max(sl.sets, keep.filter(s => s.done).length)); } entries.push(e); } }
      else entries.push(entryFromSlot(sl, sl.exResolved, date));
    }
    for (const e of w.entries) if (!r.slots.find(sl => sl.id === e.slotId) && e.sets.some(s => s.done)) entries.push(e);
    const k = planKey(r); if (w.planKey === k) return w;
    w.entries = entries; w.name = r.name; w.groups = r.groups; w.planKey = k; Store.touchWorkout(date, { silent: true });
    return w;
  }
  function stats(w) {
    const all = [...(w.entries || []), ...(w.core || [])];
    const total = all.reduce((n, e) => n + e.sets.length, 0) + (w.cardio ? 1 : 0);
    const done = all.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0) + (w.cardio && w.cardio.done ? 1 : 0);
    const volume = all.reduce((v, e) => v + e.sets.filter(s => s.done && s.w && s.r).reduce((a, s) => a + s.w * s.r, 0), 0);
    return { total, done, pct: total ? Math.round(done / total * 100) : 0, volume };
  }
  return { build, ensure, refresh, entryFromSlot, stats };
})();

/* ---- Stats, PRs, progressive overload ---- */
const Stats = {
  e1rm(w, r) { return r >= 1 ? w * (1 + r / 30) : w; },
  doneWorkouts() { return Object.values(Store.workouts).filter(w => w.status === 'done' || (w.entries || []).some(e => e.sets.some(s => s.done))).sort((a, b) => a.date < b.date ? -1 : 1); },
  history(exId) {
    const out = [];
    for (const w of Stats.doneWorkouts()) for (const e of [...(w.entries || []), ...(w.core || [])]) if (e.ex === exId) {
      const sets = e.sets.filter(s => s.done); if (!sets.length) continue;
      const best = sets.reduce((m, s) => s.w && s.r ? Math.max(m, Stats.e1rm(s.w, s.r)) : m, 0);
      const top = sets.reduce((m, s) => Math.max(m, s.w || 0), 0);
      out.push({ date: w.date, sets, best, top, volume: sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), secs: sets.reduce((a, s) => a + (s.secs || 0), 0) });
    }
    return out;
  },
  lastPerformance(exId, beforeDate) { const h = Stats.history(exId).filter(x => x.date < beforeDate); return h.length ? h[h.length - 1] : null; },
  prs(exId) { const h = Stats.history(exId); return { best: Math.max(0, ...h.map(x => x.best)), top: Math.max(0, ...h.map(x => x.top)), volume: Math.max(0, ...h.map(x => x.volume)) }; },
  // Suggest a load increase when every working set hit the top of the range at the target RIR
  suggest(entry, date) {
    const ex = Lib.get(entry.ex); if (!ex || ex.timed) return null;
    const last = Stats.lastPerformance(entry.ex, date); if (!last) return null;
    const sets = last.sets.filter(s => s.w && s.r);
    if (sets.length < Math.max(2, (entry.sets || []).length - 1)) return null;
    const hitTop = sets.every(s => s.r >= (entry.repMax || 10)); const rirOk = sets.every(s => (s.rir == null ? 2 : s.rir) >= (entry.rir == null ? 1 : Math.min(entry.rir, 1)));
    if (!hitTop) return null;
    const lower = ['quads', 'hamstrings', 'glutes'].includes(ex.group) && ex.type === 'compound';
    const inc = lower ? 5 : (ex.type === 'compound' ? 2.5 : (Store.settings.weightStep || 2.5));
    const from = Math.max(...sets.map(s => s.w));
    return { from, to: from + inc, inc, reason: rirOk ? `All sets reached ${entry.repMax} reps last time` : `All sets reached ${entry.repMax} reps last time (RIR was low, so add weight only if it felt easy)` };
  },
  weeklySets(weeks = 8) {
    const today = Dates.today(); const out = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const end = Dates.addDays(today, -7 * i), start = Dates.addDays(end, -6); const byGroup = {}; let sessions = 0, cardioMin = 0, volume = 0;
      for (const w of Stats.doneWorkouts()) if (w.date >= start && w.date <= end) {
        sessions++; if (w.cardio && w.cardio.done) cardioMin += w.cardio.minutes || 0;
        for (const e of [...(w.entries || []), ...(w.core || [])]) { const ex = Lib.get(e.ex); const n = e.sets.filter(s => s.done).length; if (ex && n) { byGroup[ex.group] = (byGroup[ex.group] || 0) + n; for (const sg of (ex.secondary || [])) if (EX.GROUPS[sg]) byGroup[sg] = (byGroup[sg] || 0) + n * 0.5; volume += e.sets.filter(s => s.done).reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0); } }
      }
      out.push({ start, end, byGroup, sessions, cardioMin, volume });
    }
    return out;
  },
  rolling7(date) {
    const start = Dates.addDays(date, -6); const byGroup = {};
    for (const w of Stats.doneWorkouts()) if (w.date >= start && w.date <= date) for (const e of [...(w.entries || []), ...(w.core || [])]) { const ex = Lib.get(e.ex); const n = e.sets.filter(s => s.done).length; if (ex && n) byGroup[ex.group] = (byGroup[ex.group] || 0) + n; }
    return byGroup;
  },
  plannedWeek(date) {
    // planned working sets per muscle over the 7 days ending on date (from schedule, not logs)
    const byGroup = {}; const start = Dates.addDays(date, -6);
    for (let d = start; d <= date; d = Dates.addDays(d, 1)) { const r = Sched.resolve(d); if (r.kind !== 'session') continue; for (const sl of r.slots) { const ex = Lib.get(sl.exResolved); if (ex) byGroup[ex.group] = (byGroup[ex.group] || 0) + (sl.sets || 0); } }
    return byGroup;
  },
  cardioHistory() { return Stats.doneWorkouts().filter(w => w.cardio && w.cardio.done).map(w => ({ date: w.date, ...w.cardio })); },
};
