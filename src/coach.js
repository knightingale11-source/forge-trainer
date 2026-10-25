/* ===== Ask My Coach: plain-English programme changes =====
   Commands become a list of operations (ops). A rule-based parser handles the
   common forms instantly; anything it cannot read goes to Claude (the viewer's
   own account, via the artifact's `sample` capability) with the same op schema.
   Ops are previewed on a copy of the programme, then committed with undo. */
const Coach = (() => {
  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60 };
  const num = s => s == null ? null : (NUM[s] != null ? NUM[s] : (isNaN(parseFloat(s)) ? null : parseFloat(s)));
  const DOWS = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
  const EQ = { dumbbell: 'dumbbell', dumbbells: 'dumbbell', barbell: 'barbell', barbells: 'barbell', machines: 'machine', machine: 'machine', cables: 'cable', cable: 'cable' };
  const prog = cfg => cfg.programs[cfg.settings.activeProgramId] || Object.values(cfg.programs)[0];
  const exGroup = id => { const e = Lib.get(id); return e ? e.group : null; };
  const inGroup = (slotEx, group) => Lib.groupsOf(group).includes(exGroup(slotEx));
  const slotEx = sl => sl.exResolved || sl.ex;
  const name = id => { const e = Lib.get(id); return e ? e.name : id; };

  // ---------- date words ----------
  function parseDate(s, today) {
    s = s.trim().toLowerCase().replace(/^(on|for|from|starting|this coming) /, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s === 'today') return today; if (s === 'tomorrow') return Dates.addDays(today, 1);
    let m = s.match(/^(next )?(\w+)$/); if (m && DOWS[m[2]] != null) return Dates.nextWeekday(m[1] ? Dates.addDays(today, 1) : today, DOWS[m[2]], !m[1]);
    m = s.match(/^(?:the )?(\d{1,2})(?:st|nd|rd|th)?(?: (?:of )?([a-z]+))?$/);
    if (m) { const d = +m[1]; const mi = m[2] ? Dates.MON.findIndex(x => m[2].startsWith(x.toLowerCase())) : -1; const t = Dates.parse(today); let y = t.getFullYear(), mo = mi >= 0 ? mi : t.getMonth(); if (mi < 0 && d < t.getDate()) mo++; if (mo > 11) { mo = 0; y++; } let iso = Dates.toISO(new Date(y, mo, d)); if (iso < today) iso = Dates.toISO(new Date(y + 1, mo, d)); return iso; }
    m = s.match(/^([a-z]+) (\d{1,2})$/); if (m) return parseDate(m[2] + ' ' + m[1], today);
    return null;
  }
  const dateWord = '(today|tomorrow|(?:next )?(?:mon|tues?|wed|thur?s?|fri|sat|sun)(?:day|nesday|sday|urday|rsday)?|the \\d{1,2}(?:st|nd|rd|th)?(?: (?:of )?[a-z]+)?|\\d{4}-\\d{2}-\\d{2})';

  // ---------- groups / lists ----------
  function parseGroups(s) {
    const parts = s.toLowerCase().replace(/\b(day|workout|session|training)\b/g, '').split(/,|\band\b|&|\+|\//).map(x => x.trim()).filter(Boolean);
    const out = []; for (const p of parts) { const g = Lib.findGroup(p.replace(/^(a|an|the) /, '')); if (g) out.push(g); else return null; }
    return out.length ? out : null;
  }
  function filterFrom(s) {
    s = s.trim().toLowerCase().replace(/^(all |every |my |the )+/, '').replace(/\s+(exercises?|movements?|lifts?|work)$/, '').trim();
    if (!s || /^(everything|exercises?|movements?|lifts?)$/.test(s)) return { all: true };
    if (s === 'compound' || s === 'compounds') return { type: 'compound' }; if (s === 'isolation' || s === 'isolations') return { type: 'isolation' };
    const g = Lib.findGroup(s); if (g) return { group: g };
    const e = Lib.find(s); if (e) return { ex: e.id };
    return null;
  }
  const descFilter = f => f.all ? 'every exercise' : f.type ? `${f.type} exercises` : f.group ? `${Lib.groupLabel(f.group)} exercises` : name(f.ex);
  const matchFilter = (f, exId) => f.all || (f.type && (Lib.get(exId) || {}).type === f.type) || (f.group && inGroup(exId, f.group)) || (f.ex && f.ex === exId);

  // ---------- the rule-based parser ----------
  function splitClauses(text) {
    return text.replace(/\s+/g, ' ').split(/(?<=[^0-9])\.\s+|;\s*|\s+then\s+|,\s*(?=(?:and\s+)?(?:change|make|set|switch|give|replace|add|remove|put|increase|decrease|drop|move|swap|rebuild|start|pause|resume|turn|stop|use|do)\b)|\s+and\s+(?=(?:change|make|set|switch|give|replace|add|remove|put|increase|decrease|drop|move|swap|rebuild|start|pause|resume|turn|stop|use|do)\b)/i)
      .map(c => c.trim().replace(/^(and|also|please|can you|could you|i want to|i want|i'd like to|i would like to|let's)\s+/i, '').replace(/[.!]+$/, '').trim()).filter(Boolean);
  }
  function parseClause(c, ctx) {
    const today = ctx.today; let m; const lc = c.toLowerCase();
    let scope = null; let dateScope = null;
    // scope prefixes
    m = lc.match(/^(?:from|starting|as of) (next \w+|\w+day|tomorrow|today|now on|\d{4}-\d{2}-\d{2})[,:]?\s+(.*)$/);
    let body = lc;
    if (m) { if (m[1] === 'now on') scope = 'program'; else { dateScope = parseDate(m[1], today); scope = 'from'; } body = m[2]; }
    if (/\b(permanently|for good|from now on|in (?:the|my) programme|in (?:the|my) program)\b/.test(body)) { scope = 'program'; body = body.replace(/\b(permanently|for good|from now on|in (?:the|my) programme|in (?:the|my) program)\b/g, '').trim(); }
    if (/\b(just|only) (?:for )?today\b|\btoday'?s workout\b|\bfor today\b|\bthis (?:workout|session)\b/.test(body)) { scope = 'today'; body = body.replace(/\b(just|only) (?:for )?today\b|\btoday'?s workout\b|\bfor today\b|\bthis (?:workout|session)\b/g, '').trim(); }
    const ops = []; const push = (op, s) => { ops.push(op); return { ops, scope: s || scope, date: dateScope }; };

    // rest / recovery days
    if ((m = body.match(/^(?:make|set) (\w+)s (?:a |my |into )?(?:recovery|rest|off) days?$/)) && DOWS[m[1]] != null) return push({ op: 'restWeekday', weekday: DOWS[m[1]], on: true }, 'program');
    if ((m = body.match(/^(?:make|set|change) (.+?) (?:a |an |into (?:a )?|to (?:a )?)?(?:recovery|rest|off) day$/)) && parseDate(m[1], today)) return push({ op: 'dayRest', date: parseDate(m[1], today) }, 'date');
    if ((m = body.match(/^(?:no more|remove|cancel) (?:recovery|rest|off) days? on (\w+)s?$/)) && DOWS[m[1]] != null) return push({ op: 'restWeekday', weekday: DOWS[m[1]], on: false }, 'program');
    if ((m = body.match(/^(?:make|set) (?:this|next) week (?:a )?deload(?: week)?$/))) return push({ op: 'deload', week: body.includes('next') ? 'next' : 'this' }, 'program');
    if (/^(?:pause|stop) (?:the |my )?(?:programme|program|training)/.test(body)) return push({ op: 'pause', on: true }, 'program');
    if (/^(?:resume|restart|unpause|continue) (?:the |my )?(?:programme|program|training)/.test(body)) return push({ op: 'pause', on: false }, 'program');
    if ((m = body.match(/^(?:start|begin) (?:the |my )?(?:programme|program) (?:on |from )?(.+)$/)) && parseDate(m[1], today)) return push({ op: 'startDate', date: parseDate(m[1], today) }, 'program');
    if ((m = body.match(/^(?:turn|switch) (on|off) (?:the )?(?:barbell|dumbbell|equipment|weekly)?\s?rotation$/)) || (m = body.match(/^(stop|disable|enable) (?:alternating|rotating)/))) return push({ op: 'rotation', enabled: /\bon\b|enable/.test(m[0]) }, 'program');
    // week equipment
    if ((m = body.match(/^(?:switch|change|make|set|use) (this|next) week (?:to |with )?(dumbbells?|barbells?|machines?|cables?)(?: only)?$/))) return push({ op: 'weekEquipment', week: m[1], equipment: EQ[m[2]] }, 'program');
    if ((m = body.match(/^(?:use|switch to) (dumbbells?|barbells?) (this|next) week$/))) return push({ op: 'weekEquipment', week: m[2], equipment: EQ[m[1]] }, 'program');
    // split
    if ((m = body.match(/(?:to|into) (?:a |an )?(\w+)[- ]day split/)) && num(m[1])) return push({ op: 'splitDays', n: num(m[1]) }, 'program');
    if ((m = body.match(/^(?:put|move|order|sort) (?:my |the )?compound[s]?(?: exercises| movements| lifts)? (?:before|ahead of|first|in front of)/))) return push({ op: 'compoundFirst' }, scope);
    // emphasis / rebuild
    if ((m = body.match(/(?:emphasi[sz]s?|focus|priorit\w*) on (\w+)/)) && Lib.findGroup(m[1])) return push({ op: 'emphasis', group: Lib.findGroup(m[1]) }, 'program');
    if ((m = body.match(/^(?:emphasi[sz]e|prioriti[sz]e|focus on) (\w+)/)) && Lib.findGroup(m[1])) return push({ op: 'emphasis', group: Lib.findGroup(m[1]) }, 'program');
    // cardio
    if ((m = body.match(/^(?:add|do|include) (\w+) ?(?:min|mins|minutes) (?:of )?(.+?) (?:to|on|in|after|before) (?:every|each|all|my) (?:workout|session|day)s?$/)) && num(m[1])) { const act = findCardio(m[2]); return push({ op: 'cardio', minutes: num(m[1]), activity: act, enabled: true, position: /before/.test(body) ? 'before' : undefined }, 'program'); }
    if ((m = body.match(/^(?:make|set|change) (?:the |my )?cardio (?:to )?(\w+) ?(?:min|mins|minutes)(?: (?:every|each|per|in every|for every) (?:workout|session|day))?$/)) && num(m[1])) return push({ op: 'cardio', minutes: num(m[1]) }, scope);
    if ((m = body.match(/^(?:make|set|change|switch) (?:the |my )?cardio to (.+)$/))) { const act = findCardio(m[1]); if (act) return push({ op: 'cardio', activity: act, enabled: true }, scope); }
    if (/^(?:remove|drop|skip|no) cardio/.test(body)) return push({ op: 'cardio', enabled: false }, scope);
    if (/^(?:do |put |move |add )?cardio (?:before|first)/.test(body)) return push({ op: 'cardio', position: 'before', enabled: true }, scope);
    if (/^(?:do |put |move |add )?cardio (?:after|last)/.test(body)) return push({ op: 'cardio', position: 'after', enabled: true }, scope);
    if (/^(?:add|include|do) cardio/.test(body)) return push({ op: 'cardio', enabled: true }, scope);
    // core / abs
    if ((m = body.match(/^(?:change|make|set) (?:my |the )?(?:abs|ab|core|abdominal)(?: routine| work| training| exercises)? (?:to )?(\w+) exercises?$/)) && num(m[1]) != null) return push({ op: 'coreCount', count: num(m[1]) }, scope);
    if (/^(?:remove|drop|skip|no) (?:abs|ab work|core work|core)/.test(body)) return push({ op: 'coreEnabled', enabled: false }, scope);
    if (/^(?:add|include|do) (?:abs|ab work|core work|core)(?: to every (?:workout|session))?$/.test(body)) return push({ op: 'coreEnabled', enabled: true }, scope);
    // day assignments: "change monday to chest and biceps", "make tomorrow a leg day"
    if ((m = body.match(new RegExp('^(?:change|make|set|switch|turn) ' + dateWord + ' (?:to|into|a|an)?\\s*(?:a |an )?(.+?)(?: day| workout| session)?$'))) && parseDate(m[1], today)) {
      const d = parseDate(m[1], today); const g = parseGroups(m[2]); if (g) return push({ op: 'dayOverride', date: d, groups: g }, 'date');
      if (/rest|recovery|off/.test(m[2])) return push({ op: 'dayRest', date: d }, 'date');
    }
    if ((m = body.match(/^(?:move|shift) (?:my |the )?(.+?) (?:workout|session|day) (?:to|onto) (.+)$/)) && parseDate(m[2], today)) { const src = parseDate(m[1], today); if (src) return push({ op: 'moveWorkout', from: src, to: parseDate(m[2], today) }, 'date'); const g = parseGroups(m[1]); if (g) return push({ op: 'dayOverride', date: parseDate(m[2], today), groups: g }, 'date'); }
    // counts: "give me five chest exercises instead of four", "five chest exercises", "change to 3 triceps exercises"
    if ((m = body.match(/(?:^|\b)(?:give me|make it|change (?:it |that )?to|set|do|i want|use|have) (\w+) (.+?) exercises?(?: instead of \w+)?$/)) || (m = body.match(/^(\w+) (.+?) exercises?(?: instead of \w+)?$/))) {
      const n = num(m[1]); const g = Lib.findGroup(m[2].replace(/^(more |fewer )/, ''));
      if (n != null && g) return push({ op: 'setCount', group: g, count: n }, scope);
    }
    if ((m = body.match(/^(?:increase|decrease|change|set|make|reduce|raise|lower) (.+?) to (\w+) exercises?$/)) && num(m[2]) != null && Lib.findGroup(m[1])) return push({ op: 'setCount', group: Lib.findGroup(m[1]), count: num(m[2]) }, scope);
    if ((m = body.match(/^(?:add|give me) (?:(\w+) )?(?:more |extra |additional )?(.+?) exercises?$/)) || (m = body.match(/^(?:give me )?more (.+?)(?: exercises| work)?$/))) {
      const n = m.length > 2 ? num(m[1]) : null; let t = (m.length > 2 ? m[2] : m[1]).replace(/^more /, '');
      const tag = /upper[- ]chest/.test(t) ? 'upper-chest' : null; if (tag) t = 'chest';
      const g = Lib.findGroup(t); if (g) return push({ op: 'addExercises', group: g, count: n || (tag ? 2 : 1), tag }, scope);
    }
    if ((m = body.match(/^(?:remove|drop|take out|cut) (\w+) (.+?) exercises?$/)) && num(m[1]) && Lib.findGroup(m[2])) return push({ op: 'addExercises', group: Lib.findGroup(m[2]), count: -num(m[1]) }, scope);
    // add group to a day
    if ((m = body.match(/^(?:add|include) (\w+) (?:to|on|into) (?:my |the )?(.+?) (?:day|workout|session)s?$/))) {
      const g = Lib.findGroup(m[1]); const host = parseGroups(m[2]) || (parseDate(m[2], today) ? null : null);
      if (g && host) return push({ op: 'addGroup', group: g, hostGroup: host[0], count: 2 }, scope);
      if (g && parseDate(m[2], today)) return push({ op: 'addGroup', group: g, date: parseDate(m[2], today), count: 2 }, 'date');
    }
    if ((m = body.match(/^(?:remove|drop|take) (\w+) (?:from|off|out of) (?:my |the )?(.+?)(?: (?:day|workout|session))?$/)) && Lib.findGroup(m[1]) && (parseGroups(m[2]) || /programme|program/.test(m[2]))) return push({ op: 'removeGroup', group: Lib.findGroup(m[1]), hostGroup: parseGroups(m[2]) ? parseGroups(m[2])[0] : null }, scope);
    // sets & reps
    if ((m = body.match(/^(?:make|set|change|do|put) (.+?) (?:to |at |on )?(\w+) sets? (?:of|x|by) (\w+)(?: reps)?$/)) && num(m[2]) && num(m[3])) { const f = filterFrom(m[1]); if (f) return push({ op: 'setSetsReps', filter: f, sets: num(m[2]), repMin: num(m[3]), repMax: num(m[3]) }, scope); }
    if ((m = body.match(/^(\w+) sets? (?:of|x|by) (\w+)(?: reps)? (?:on|for) (.+)$/)) && num(m[1]) && num(m[2])) { const f = filterFrom(m[3]); if (f) return push({ op: 'setSetsReps', filter: f, sets: num(m[1]), repMin: num(m[2]), repMax: num(m[2]) }, scope); }
    if ((m = body.match(/^(?:make|set|change|increase|decrease|raise|drop|lower|reduce|put|do) (.+?) (?:to |at |for |with )?(\w+)(?:\s?-\s?|\s?to\s?)?(\w+)? reps?(?: each| per set)?$/))) { const f = filterFrom(m[1]); const a = num(m[2]), b = m[3] ? num(m[3]) : null; if (f && a != null) return push({ op: 'setReps', filter: f, repMin: b != null ? Math.min(a, b) : a, repMax: b != null ? Math.max(a, b) : a }, scope); }
    if ((m = body.match(/^(?:make|set|change|increase|decrease|do) (.+?) (?:to|at|for) (\w+) sets?$/))) { const f = filterFrom(m[1]); const n = num(m[2]); if (f && n != null) return push({ op: 'setSets', filter: f, sets: n }, scope); }
    if ((m = body.match(/^(?:make|set|change) (?:the )?rest(?: periods?| times?| between sets)? (?:to |at )?(\w+) ?(s|sec|secs|seconds|m|min|mins|minutes)?$/)) && num(m[1]) != null) return push({ op: 'setRest', filter: { all: true }, rest: num(m[1]) * (/^m/.test(m[2] || '') ? 60 : 1) }, scope);
    if ((m = body.match(/^(?:make|set|change) (.+?) rest (?:periods? |times? )?(?:to |at )?(\w+) ?(s|sec|secs|seconds|m|min|mins|minutes)?$/)) && num(m[2]) != null) { const f = filterFrom(m[1]); if (f) return push({ op: 'setRest', filter: f, rest: num(m[2]) * (/^m/.test(m[3] || '') ? 60 : 1) }, scope); }
    // weight for today
    if ((m = body.match(/^(?:increase|raise|set|put|change|decrease|drop|lower|make) (.+?) (?:to|at) (\d+(?:\.\d+)?) ?(?:kg|kgs|kilos)$/))) { const e = Lib.find(m[1]); if (e) return push({ op: 'setLoad', ex: e.id, weight: +m[2] }, 'today'); }
    if ((m = body.match(/^(?:increase|raise|add|bump) (.+?) by (\d+(?:\.\d+)?) ?(?:kg|kgs|kilos)$/))) { const e = Lib.find(m[1]); if (e) return push({ op: 'setLoad', ex: e.id, delta: +m[2] }, 'today'); }
    // replace / swap
    if ((m = body.match(/^(?:replace|swap|substitute|change|switch) (.+?) (?:with|for|to) (.+)$/))) {
      let from = /^(this|that|the current|current|it)( exercise| one| movement)?$/.test(m[1]) ? (ctx.exerciseId ? Lib.get(ctx.exerciseId) : null) : Lib.find(m[1]);
      if (from) {
        if (/same muscle|similar|something else|an alternative|another exercise|equivalent/.test(m[2])) return push({ op: 'replace', from: from.id, to: alternative(from, ctx).id }, scope);
        const to = Lib.find(m[2]); if (to) return push({ op: 'replace', from: from.id, to: to.id }, scope);
        const eq = EQ[m[2].replace(/ version| variation/, '').trim()]; if (eq) { const alt = Lib.all().find(e => e.family && e.family === from.family && e.equip === eq) || alternative(from, { ...ctx, equip: eq }); if (alt) return push({ op: 'replace', from: from.id, to: alt.id }, scope); }
      }
    }
    // remove exercise
    if ((m = body.match(/^(?:remove|drop|delete|take out|get rid of|cut) (.+?)(?: from (?:my |the )?(?:programme|program|workout|routine|plan|session|.+?(?:day)))?$/))) { const e = Lib.find(m[1].replace(/^(the |all |every )/, '')); if (e) return push({ op: 'removeExercise', ex: e.id }, scope); const g = Lib.findGroup(m[1].replace(/^(the |all |every )/, '')); if (g) return push({ op: 'removeGroup', group: g }, scope); }
    // add exercise
    if ((m = body.match(/^(?:add|include|put) (.+?)(?: (?:to|on|into) (?:my |the )?(.+?)(?: day| workout| session)?)?$/))) {
      const e = Lib.find(m[1].replace(/^(a |an |some )/, ''));
      if (e) { const tgt = m[2]; if (tgt && parseDate(tgt, today)) return push({ op: 'addExercise', ex: e.id, date: parseDate(tgt, today) }, 'date'); const hg = tgt ? parseGroups(tgt) : null; return push({ op: 'addExercise', ex: e.id, hostGroup: hg ? hg[0] : null }, scope); }
    }
    return null;
  }
  function findCardio(t) { t = t.toLowerCase(); const c = EX.CARDIO.find(c => t.includes(c.label.toLowerCase()) || t.includes(c.id.replace('_', ' ')) || (c.id === 'stairmaster' && /stair/.test(t)) || (c.id === 'treadmill_run' && /treadmill|running/.test(t)) || (c.id === 'cycling' && /bike|cycl/.test(t)) || (c.id === 'rowing' && /row/.test(t)) || (c.id === 'incline_walk' && /walk/.test(t)) || (c.id === 'elliptical' && /ellip/.test(t))); return c ? c.id : null; }
  function alternative(ex, ctx = {}) {
    const inUse = ctx.inUse || []; const cands = Lib.byGroup(ex.group).filter(e => e.id !== ex.id && !inUse.includes(e.id) && (!ctx.equip || e.equip === ctx.equip))
      .sort((a, b) => (a.type === ex.type ? 0 : 1) - (b.type === ex.type ? 0 : 1) || ((a.tags || []).some(t => (ex.tags || []).includes(t)) ? 0 : 1) - ((b.tags || []).some(t => (ex.tags || []).includes(t)) ? 0 : 1) || a.prio - b.prio);
    return cands[0] || ex;
  }
  function parse(text, ctx) {
    let scope = null, date = null, effectiveFrom = null;
    let t = text.trim();
    const gm = t.match(/^(?:from|starting|as of|beginning) (next \w+|\w+day|tomorrow|today|now on|\d{4}-\d{2}-\d{2}|the \d{1,2}(?:st|nd|rd|th)?(?: (?:of )?[a-z]+)?)[,:]?\s+(.*)$/i);
    if (gm) { if (gm[1].toLowerCase() === 'now on') scope = 'program'; else { const d = parseDate(gm[1], ctx.today); if (d) { effectiveFrom = d; scope = 'program'; } } t = gm[2]; }
    const clauses = splitClauses(t); const ops = []; const unknown = [];
    for (const c of clauses) { const r = parseClause(c, ctx); if (r) { ops.push(...r.ops); if (r.scope && (!scope || r.scope === 'program')) scope = r.scope; if (r.date) date = r.date; } else unknown.push(c); }
    if (effectiveFrom && effectiveFrom > ctx.today) { if (ops.some(o => ['dayOverride', 'dayRest', 'moveWorkout', 'setLoad'].includes(o.op))) effectiveFrom = null; }
    return { ops, unknown, scope, date, effectiveFrom };
  }

  // ---------- applying ops to a config (real or cloned) ----------
  function interleave(sess) {
    const lists = sess.groups.map(g => sess.slots.filter(sl => inGroup(slotEx(sl), g)));
    const rest = sess.slots.filter(sl => !sess.groups.some(g => inGroup(slotEx(sl), g)));
    const out = []; const max = Math.max(0, ...lists.map(l => l.length));
    for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]);
    sess.slots = out.concat(rest);
  }
  function addToSession(sess, group, count, opts = {}) {
    const used = sess.slots.map(slotEx); const picks = Gen.pick(group, count, { exclude: used, prefer: opts.prefer, tag: opts.tag });
    for (const e of picks) sess.slots.push(Gen.slot(e)); if (!sess.groups.some(g => Lib.groupsOf(g).includes(group) || g === group)) sess.groups.push(group);
    interleave(sess); return picks;
  }
  function removeFromSession(sess, group, count) {
    const mine = sess.slots.filter(sl => inGroup(slotEx(sl), group)); const drop = mine.slice(Math.max(0, mine.length - count)); sess.slots = sess.slots.filter(sl => !drop.includes(sl)); return drop;
  }
  function hostSessions(cfg, group, date) {
    const p = prog(cfg); return Object.values(p.sessions).filter(s => s.groups.some(g => Lib.groupsOf(g).includes(group) || g === group));
  }
  function sessionsFor(cfg, scope, ctx) {
    const p = prog(cfg);
    if (scope === 'today' || scope === 'date') {
      const d = scope === 'today' ? ctx.today : ctx.date; let ov = cfg.overrides[d];
      if (!ov || !ov.slots) { const r = Sched.resolve(d); if (r.kind !== 'session') return []; ov = { sessionId: r.sessionId, name: r.name, groups: clone(r.groups), slots: r.slots.map(sl => ({ ...clone(sl), ex: sl.exResolved, exResolved: undefined, variants: null })), cardio: r.cardio ? clone(r.cardio) : null, core: r.core ? clone(r.core) : null }; cfg.overrides[d] = ov; }
      return [ov];
    }
    return Object.values(p.sessions);
  }
  function run(ops, scope, ctx, cfg) {
    const changes = []; const p = prog(cfg); const s = cfg.settings; const today = ctx.today;
    const sessions = () => sessionsFor(cfg, scope, ctx);
    const withGroup = g => scope === 'program' ? hostSessions(cfg, g) : sessions().filter(ss => ss.groups.some(x => Lib.groupsOf(x).includes(g) || x === g));
    const setsText = sl => `${sl.sets}×${sl.repMin}-${sl.repMax}`;
    for (const op of ops) {
      try {
        switch (op.op) {
          case 'dayRest': { cfg.overrides[op.date] = { rest: true }; changes.push(`${Dates.fmt(op.date, 'short')} becomes a rest day`); break; }
          case 'restWeekday': { const r = new Set(s.restWeekdays || []); op.on ? r.add(op.weekday) : r.delete(op.weekday); s.restWeekdays = [...r].sort(); changes.push(`${Dates.DOW[op.weekday]}s are ${op.on ? 'now rest days' : 'training days again'}`); break; }
          case 'dayOverride': {
            if (op.sessionId) { cfg.overrides[op.date] = { sessionId: op.sessionId }; changes.push(`${Dates.fmt(op.date, 'short')} → ${p.sessions[op.sessionId].name}`); break; }
            const match = Object.values(p.sessions).find(ss => ss.groups.length === op.groups.length && op.groups.every(g => ss.groups.includes(g)));
            if (match) { cfg.overrides[op.date] = { sessionId: match.id }; changes.push(`${Dates.fmt(op.date, 'short')} → ${match.name}`); }
            else { const ns = Gen.buildSession(op.groups, { prefer: Sched.emphasisFor(op.date) }); cfg.overrides[op.date] = { name: ns.name, groups: ns.groups, slots: ns.slots }; changes.push(`${Dates.fmt(op.date, 'short')} → new ${ns.name} session (${ns.slots.length} exercises)`); }
            break;
          }
          case 'moveWorkout': { const r = Sched.resolve(op.from); if (r.kind !== 'session') throw new Error(`${Dates.fmt(op.from, 'short')} has no workout to move`); cfg.overrides[op.to] = r.sessionId ? { sessionId: r.sessionId } : { name: r.name, groups: r.groups, slots: clone(r.slots) }; cfg.overrides[op.from] = { rest: true }; changes.push(`${r.name} moves from ${Dates.fmt(op.from, 'short')} to ${Dates.fmt(op.to, 'short')}`); break; }
          case 'setCount': {
            const targets = withGroup(op.group); if (!targets.length) throw new Error(`No session trains ${Lib.groupLabel(op.group)}`);
            for (const ss of targets) { const cur = ss.slots.filter(sl => inGroup(slotEx(sl), op.group)).length; if (op.count > cur) { const add = addToSession(ss, op.group, op.count - cur); changes.push(`${ss.name}: ${Lib.groupLabel(op.group)} ${cur} → ${op.count} exercises (adds ${add.map(e => e.name).join(', ') || 'nothing — library exhausted'})`); } else if (op.count < cur) { const d = removeFromSession(ss, op.group, cur - op.count); changes.push(`${ss.name}: ${Lib.groupLabel(op.group)} ${cur} → ${op.count} exercises (drops ${d.map(x => name(slotEx(x))).join(', ')})`); } else changes.push(`${ss.name}: already ${cur} ${Lib.groupLabel(op.group)} exercises`); }
            break;
          }
          case 'addExercises': {
            const targets = withGroup(op.group).length ? withGroup(op.group) : sessions().slice(0, 1); if (!targets.length) throw new Error('No session to add to');
            for (const ss of targets) { if (op.count > 0) { const add = addToSession(ss, op.group, op.count, { tag: op.tag }); changes.push(`${ss.name}: +${add.map(e => e.name).join(', ') || 'no more exercises available'}`); } else { const d = removeFromSession(ss, op.group, -op.count); changes.push(`${ss.name}: drops ${d.map(x => name(slotEx(x))).join(', ')}`); } }
            break;
          }
          case 'addGroup': {
            let targets = op.date ? sessionsFor(cfg, 'date', { ...ctx, date: op.date }) : op.hostGroup ? withGroup(op.hostGroup) : sessions().slice(0, 1); if (!targets.length) throw new Error('No session found to add to');
            for (const ss of targets) { const add = addToSession(ss, op.group, op.count || 2); ss.name = Gen.sessionName(ss.groups); changes.push(`${ss.name}: adds ${Lib.groupLabel(op.group)} (${add.map(e => e.name).join(', ')})`); }
            break;
          }
          case 'removeGroup': {
            const targets = op.hostGroup ? withGroup(op.hostGroup) : withGroup(op.group);
            for (const ss of targets) { const before = ss.slots.length; ss.slots = ss.slots.filter(sl => !inGroup(slotEx(sl), op.group)); ss.groups = ss.groups.filter(g => g !== op.group && !(Lib.groupsOf(g).length === 1 && Lib.groupsOf(g)[0] === op.group)); if (op.group === 'legs') ss.groups = ss.groups.filter(g => g !== 'legs'); ss.name = Gen.sessionName(ss.groups) || ss.name; if (before !== ss.slots.length) changes.push(`${ss.name}: removes ${Lib.groupLabel(op.group)} (${before - ss.slots.length} exercises)`); }
            if (!changes.length) throw new Error(`${Lib.groupLabel(op.group)} is not in the programme`);
            break;
          }
          case 'replace': {
            let n = 0; const to = Lib.get(op.to); if (!to) throw new Error('Unknown replacement exercise');
            for (const ss of sessions()) for (const sl of ss.slots) if (slotEx(sl) === op.from || sl.ex === op.from || (sl.variants && Object.values(sl.variants).includes(op.from))) { sl.ex = op.to; sl.variants = Gen.variants(to); delete sl.exResolved; n++; }
            if (!n) throw new Error(`${name(op.from)} is not in the ${scope === 'program' ? 'programme' : 'workout'}`);
            changes.push(`${name(op.from)} → ${to.name} (${n} slot${n > 1 ? 's' : ''}; sets, reps and rest kept)`); break;
          }
          case 'removeExercise': { let n = 0; for (const ss of sessions()) { const b = ss.slots.length; ss.slots = ss.slots.filter(sl => slotEx(sl) !== op.ex && sl.ex !== op.ex && !(sl.variants && Object.values(sl.variants).includes(op.ex))); n += b - ss.slots.length; } if (!n) throw new Error(`${name(op.ex)} is not in the programme`); changes.push(`Removes ${name(op.ex)} (${n} slot${n > 1 ? 's' : ''})`); break; }
          case 'addExercise': {
            const e = Lib.get(op.ex); let targets = op.date ? sessionsFor(cfg, 'date', { ...ctx, date: op.date }) : op.hostGroup ? withGroup(op.hostGroup) : (scope === 'program' ? hostSessions(cfg, e.group) : sessions());
            if (!targets.length) targets = sessions().slice(0, 1); if (!targets.length) throw new Error('No session to add to');
            for (const ss of targets.slice(0, 1)) { ss.slots.push(Gen.slot(e)); if (!ss.groups.some(g => Lib.groupsOf(g).includes(e.group))) { ss.groups.push(e.group); ss.name = Gen.sessionName(ss.groups); } interleave(ss); changes.push(`${ss.name}: adds ${e.name}`); }
            break;
          }
          case 'setReps': case 'setSets': case 'setRest': case 'setSetsReps': {
            let n = 0; for (const ss of sessions()) for (const sl of ss.slots) if (matchFilter(op.filter, slotEx(sl))) { if (op.repMin != null) { sl.repMin = op.repMin; sl.repMax = op.repMax; } if (op.sets != null) sl.sets = op.sets; if (op.rest != null) sl.rest = op.rest; n++; }
            if (!n) throw new Error(`Nothing matched ${descFilter(op.filter)}`);
            const what = [op.sets != null ? `${op.sets} sets` : null, op.repMin != null ? (op.repMin === op.repMax ? `${op.repMin} reps` : `${op.repMin}-${op.repMax} reps`) : null, op.rest != null ? `${op.rest}s rest` : null].filter(Boolean).join(' of ');
            changes.push(`${cap(descFilter(op.filter))} → ${what} (${n} slot${n > 1 ? 's' : ''})`); break;
          }
          case 'setLoad': { const w = Store.workouts[today] || (cfg === Store.config ? Log.ensure(today) : Log.build(today)); if (!w) throw new Error("There is no workout today"); const en = (w.entries || []).find(e => e.ex === op.ex); if (!en) throw new Error(`${name(op.ex)} is not in today's workout`); const to = op.weight != null ? op.weight : ((en.sets.find(x => x.w) || {}).w || 0) + op.delta; en.sets.forEach(st => { if (!st.done) st.w = to; }); changes.push(`${name(op.ex)} today → ${to} kg on remaining sets`); ctx.touchedWorkout = true; break; }
          case 'splitDays': {
            const T = { 2: [['chest', 'back', 'shoulders', 'arms'], ['legs', 'core']], 3: [['chest', 'shoulders', 'triceps'], ['back', 'biceps', 'traps'], ['legs', 'core']], 4: [['chest', 'triceps'], ['back', 'core'], ['legs', 'biceps'], ['shoulders', 'traps']], 5: [['chest', 'triceps'], ['back', 'biceps'], ['legs'], ['shoulders', 'traps'], ['arms', 'core']], 6: [['chest', 'shoulders', 'triceps'], ['back', 'biceps'], ['legs', 'core'], ['chest', 'shoulders', 'triceps'], ['back', 'biceps', 'traps'], ['legs', 'core']] };
            const tpl = T[op.n]; if (!tpl) throw new Error('Splits from 2 to 6 days are supported');
            const cycle = []; const used = new Set();
            for (const groups of tpl) { let ss = Object.values(p.sessions).find(x => !used.has(x.id) && x.groups.length === groups.length && groups.every(g => x.groups.includes(g))); if (!ss) { ss = Gen.buildSession(groups, { exercisesPerGroup: groups.length >= 3 ? 3 : 4 }); p.sessions[ss.id] = ss; } used.add(ss.id); cycle.push(ss.id); }
            p.cycle = cycle; changes.push(`Programme becomes a ${op.n}-day split: ${cycle.map(id => p.sessions[id].name).join(' · ')}`); break;
          }
          case 'compoundFirst': { for (const ss of sessions()) ss.slots.sort((a, b) => ((Lib.get(slotEx(a)) || {}).type === 'compound' ? 0 : 1) - ((Lib.get(slotEx(b)) || {}).type === 'compound' ? 0 : 1)); changes.push('Compound exercises now come before isolation work in every session'); break; }
          case 'weekEquipment': { const wk = Sched.weekIndex(today) + (op.week === 'next' ? 1 : 0); s.rotation.weekOverrides = s.rotation.weekOverrides || {}; s.rotation.weekOverrides[wk] = op.equipment; changes.push(`${op.week === 'next' ? 'Next' : 'This'} week uses ${op.equipment} variations`); break; }
          case 'rotation': { s.rotation.enabled = op.enabled; if (op.cycle) s.rotation.cycle = op.cycle; changes.push(`Weekly equipment rotation ${op.enabled ? 'on' : 'off'}`); break; }
          case 'cardio': {
            const targets = scope === 'program' ? [p] : sessions(); for (const t of targets) { const c = t.cardio ? t.cardio : (t.cardio = clone(p.cardio || { enabled: true, activity: 'incline_walk', minutes: 20, position: 'after' })); if (op.enabled != null) c.enabled = op.enabled; if (op.minutes != null) c.minutes = op.minutes; if (op.activity) c.activity = op.activity; if (op.position) c.position = op.position; }
            if (scope === 'program') for (const ss of Object.values(p.sessions)) ss.cardio = null;
            const c = targets[0].cardio; changes.push(c.enabled === false ? `Cardio removed${scope === 'program' ? ' from every session' : ''}` : `Cardio: ${c.minutes} min ${(EX.CARDIO.find(x => x.id === c.activity) || {}).label || c.activity} ${c.position === 'before' ? 'before' : 'after'} lifting${scope === 'program' ? ', every session' : ''}`); break;
          }
          case 'coreCount': case 'coreEnabled': { const targets = scope === 'program' ? [p] : sessions(); for (const t of targets) { const k = t.core ? t.core : (t.core = clone(p.core || { enabled: true, count: 2, sets: 3 })); if (op.count != null) { k.count = op.count; k.enabled = op.count > 0; k.exercises = null; } if (op.enabled != null) k.enabled = op.enabled; } changes.push(op.count != null ? `Core work: ${op.count} exercise${op.count === 1 ? '' : 's'} per session` : `Core work ${op.enabled ? 'on' : 'off'}`); break; }
          case 'emphasis': {
            const hosts = hostSessions(cfg, op.group); const first = hosts[0] || Object.values(p.sessions)[0]; const a = addToSession(first, op.group, 2); first.name = Gen.sessionName(first.groups);
            const other = Object.values(p.sessions).find(ss => !hosts.includes(ss)); let b = []; if (other) { b = addToSession(other, op.group, 2); other.name = Gen.sessionName(other.groups); }
            changes.push(`${Lib.groupLabel(op.group)} emphasis: ${first.name} +${a.length} exercises${other ? `, ${other.name} +${b.length} exercises` : ''} (${Lib.groupLabel(op.group)} now trained ${other ? 'twice' : 'once'} per cycle)`); break;
          }
          case 'startDate': { s.startDate = op.date; changes.push(`Programme starts ${Dates.fmt(op.date)}`); break; }
          case 'pause': { s.paused = op.on; s.pausedFrom = op.on ? today : null; changes.push(op.on ? 'Programme paused from today' : 'Programme resumed'); break; }
          case 'deload': { const wk = Sched.weekIndex(today) + (op.week === 'next' ? 1 : 0); s.deloadWeeks = [...new Set([...(s.deloadWeeks || []), wk])]; changes.push(`${op.week === 'next' ? 'Next' : 'This'} week is a deload (sets shown at reduced effort)`); break; }
          default: throw new Error('Unknown operation ' + op.op);
        }
      } catch (e) { changes.push('⚠ ' + e.message); }
    }
    for (const ss of Object.values(p.sessions)) if (!ss.name) ss.name = Gen.sessionName(ss.groups);
    return changes;
  }
  function preview(ops, scope, ctx) { return run(ops, scope, ctx, clone(Store.config)); }
  function commit(ops, scope, ctx, label) {
    Store.pushUndo(label);
    if (ctx.effectiveFrom && ctx.effectiveFrom > ctx.today) {
      // keep the current plan in place until the effective date
      for (let d = ctx.today; d < ctx.effectiveFrom; d = Dates.addDays(d, 1)) { if (Store.config.overrides[d]) continue; const r = Sched.resolve(d); if (r.kind === 'session') Store.config.overrides[d] = r.sessionId ? { sessionId: r.sessionId } : { name: r.name, groups: r.groups, slots: clone(r.slots) }; else if (r.kind === 'rest') Store.config.overrides[d] = { rest: true }; }
    }
    const changes = run(ops, scope, ctx, Store.config); Sched.invalidate(); Store.touch({ silent: true });
    if (ctx.touchedWorkout) Store.touchWorkout(ctx.today, { silent: true });
    refreshPlanned(); Store.touch(); return changes;
  }
  function refreshPlanned() { const today = Dates.today(); for (const d of Object.keys(Store.workouts)) { const w = Store.workouts[d]; if (d >= today && w.status !== 'done') Log.refresh(d); } Log.refresh(today); }
  function touchesToday(ops, ctx) {
    const r = Sched.resolve(ctx.today); if (r.kind !== 'session') return false;
    const todayEx = r.slots.map(sl => sl.exResolved); const todayGroups = new Set(r.groups.flatMap(Lib.groupsOf));
    return ops.some(op => ['setCount', 'addExercises', 'replace', 'removeExercise', 'addExercise', 'setReps', 'setSets', 'setRest', 'setSetsReps', 'compoundFirst', 'cardio', 'coreCount', 'coreEnabled', 'addGroup', 'removeGroup'].includes(op.op)
      && (op.op === 'compoundFirst' || op.op === 'cardio' || op.op === 'coreCount' || op.op === 'coreEnabled' || (op.group && todayGroups.has(op.group)) || (op.hostGroup && todayGroups.has(op.hostGroup)) || (op.from && todayEx.includes(op.from)) || (op.ex && (todayEx.includes(op.ex) || todayGroups.has(exGroup(op.ex)))) || (op.filter && (op.filter.all || op.filter.type || (op.filter.group && todayGroups.has(op.filter.group)) || (op.filter.ex && todayEx.includes(op.filter.ex))))));
  }

  // ---------- Claude fallback ----------
  const SCHEMA = `Operations (JSON objects, "op" field):
{"op":"setCount","group":G,"count":N} number of exercises for a muscle group in the session(s) that train it
{"op":"addExercises","group":G,"count":N,"tag":"upper-chest"|null} add N more (negative removes)
{"op":"replace","from":EXID,"to":EXID}
{"op":"removeExercise","ex":EXID}
{"op":"addExercise","ex":EXID,"hostGroup":G|null,"date":DATE|null}
{"op":"setReps","filter":F,"repMin":N,"repMax":N} {"op":"setSets","filter":F,"sets":N} {"op":"setRest","filter":F,"rest":SECONDS} {"op":"setSetsReps","filter":F,"sets":N,"repMin":N,"repMax":N}
   F = {"all":true} | {"group":G} | {"ex":EXID} | {"type":"compound"|"isolation"}
{"op":"setLoad","ex":EXID,"weight":KG} today's working weight
{"op":"dayOverride","date":DATE,"groups":[G,...]} make a date train these groups  {"op":"dayRest","date":DATE}
{"op":"moveWorkout","from":DATE,"to":DATE}
{"op":"restWeekday","weekday":0-6 (0=Sunday),"on":true|false}
{"op":"addGroup","group":G,"hostGroup":G,"count":N} add a muscle group to the session that trains hostGroup
{"op":"removeGroup","group":G,"hostGroup":G|null}
{"op":"splitDays","n":2-6}  {"op":"compoundFirst"}  {"op":"emphasis","group":G}
{"op":"weekEquipment","week":"this"|"next","equipment":"barbell"|"dumbbell"|"machine"|"cable"}  {"op":"rotation","enabled":true|false}
{"op":"cardio","minutes":N|null,"activity":CARDIO|null,"enabled":true|false|null,"position":"before"|"after"|null}
{"op":"coreCount","count":N}  {"op":"coreEnabled","enabled":true|false}
{"op":"startDate","date":DATE}  {"op":"pause","on":true|false}  {"op":"deload","week":"this"|"next"}`;
  function claudePrompt(text, ctx) {
    const p = Store.program; const r = Sched.resolve(ctx.today);
    const sessions = p.cycle.map((id, i) => { const ss = p.sessions[id]; return ss ? `Day ${i + 1} "${ss.name}" [${ss.groups.join(', ')}]: ${ss.slots.map(sl => `${slotEx(sl)} ${sl.sets}x${sl.repMin}-${sl.repMax}`).join('; ')}` : `Day ${i + 1}: rest`; }).join('\n');
    const lib = Lib.all().map(e => `${e.id}=${e.name} (${e.group},${e.equip},${e.type}${e.tags ? ',' + e.tags.join('/') : ''})`).join('\n');
    return `You translate a gym-goer's instruction into structured edits for their training programme. Reply with ONLY one JSON object: {"ops":[...],"scope":"program"|"today"|"date","date":"YYYY-MM-DD"|null,"note":"one short sentence"} or {"question":"..."} if the instruction is ambiguous. Use "today" scope when the change is for today's workout only, "date" when it names one other day, otherwise "program".

${SCHEMA}

G (muscle groups): chest, back, shoulders, triceps, biceps, quads, hamstrings, glutes, calves, traps, core, plus composites legs, arms.
CARDIO ids: ${EX.CARDIO.map(c => c.id).join(', ')}.
Today is ${ctx.today} (${Dates.fmt(ctx.today)}). Today's session: ${r.kind === 'session' ? r.name + ' — ' + r.slots.map(sl => slotEx(sl)).join(', ') : r.kind}.
Programme "${p.name}", start ${Store.settings.startDate}, cycle repeats continuously:
${sessions}
Cardio default: ${JSON.stringify(p.cardio)}. Core default: ${JSON.stringify(p.core)}.
Exercise library (id=name):
${lib}
${ctx.exerciseId ? `The user is currently looking at ${ctx.exerciseId}.\n` : ''}
Instruction: "${text.replace(/"/g, "'")}"`;
  }
  const VALID_OPS = new Set(['setCount', 'addExercises', 'replace', 'removeExercise', 'addExercise', 'setReps', 'setSets', 'setRest', 'setSetsReps', 'setLoad', 'dayOverride', 'dayRest', 'moveWorkout', 'restWeekday', 'addGroup', 'removeGroup', 'splitDays', 'compoundFirst', 'emphasis', 'weekEquipment', 'rotation', 'cardio', 'coreCount', 'coreEnabled', 'startDate', 'pause', 'deload']);
  function validate(ops) {
    const out = [];
    for (const op of ops || []) {
      if (!op || !VALID_OPS.has(op.op)) continue;
      if (op.group && !Lib.isGroup(op.group)) { const g = Lib.findGroup(op.group); if (!g) continue; op.group = g; }
      if (op.hostGroup && !Lib.isGroup(op.hostGroup)) { op.hostGroup = Lib.findGroup(op.hostGroup); }
      if (op.groups) { op.groups = op.groups.map(g => Lib.isGroup(g) ? g : Lib.findGroup(g)).filter(Boolean); if (!op.groups.length) continue; }
      for (const k of ['from', 'to', 'ex']) if (op[k] && !Lib.get(op[k])) { const e = Lib.find(op[k]); if (!e) { op.invalid = true; } else op[k] = e.id; }
      if (op.invalid) continue;
      if (op.filter && op.filter.ex && !Lib.get(op.filter.ex)) { const e = Lib.find(op.filter.ex); if (!e) continue; op.filter.ex = e.id; }
      if (op.filter && op.filter.group && !Lib.isGroup(op.filter.group)) { op.filter.group = Lib.findGroup(op.filter.group); if (!op.filter.group) continue; }
      for (const k of ['date', 'from', 'to']) if (op.op !== 'replace' && op[k] && !/^\d{4}-\d{2}-\d{2}$/.test(op[k])) op[k] = parseDate(op[k], Dates.today()) || op[k];
      out.push(op);
    }
    return out;
  }
  return { parse, preview, commit, touchesToday, claudePrompt, validate, alternative, parseDate, refreshPlanned };
})();
