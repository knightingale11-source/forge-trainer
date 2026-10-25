/* ===== Programme builder, calendar, library, progress, settings, coach ===== */
const Programme = (() => {
  let calMonth = null; let selDate = null;
  function mark(label) { Store.pushUndo(label); }
  function commitEdit() { Sched.invalidate(); Store.touch({ silent: true }); Coach.refreshPlanned(); Store.touch(); }
  function render(root) {
    const p = Store.program; const s = Store.settings; const progs = Object.values(Store.config.programs);
    root.append(h('div', { class: 'hero' }, h('span', { class: 'eyebrow' }, 'Programme'), h('div', { class: 'row' }, h('h1', { class: 'grow', style: 'cursor:pointer', onclick: () => renameProgram(p) }, p.name), h('button', { class: 'iconbtn', 'aria-label': 'Rename programme', onclick: () => renameProgram(p) }, icon('edit'))),
      h('div', { class: 'row wrap', style: 'gap:6px' },
        progs.length > 1 ? h('select', { 'aria-label': 'Active programme', style: 'width:auto;min-height:36px;padding:6px 10px', onchange: e => { s.activeProgramId = e.target.value; commitEdit(); } }, ...progs.map(x => h('option', { value: x.id, selected: x.id === p.id }, x.name))) : null,
        h('button', { class: 'btn xs', onclick: newProgram }, icon('plus'), 'New'), h('button', { class: 'btn xs', onclick: () => { mark('Duplicate programme'); const c = clone(p); c.id = uid(); c.name = p.name + ' copy'; c.createdAt = Date.now(); Store.config.programs[c.id] = c; s.activeProgramId = c.id; commitEdit(); toast('Duplicated and switched'); } }, icon('copy'), 'Duplicate'),
        progs.length > 1 ? h('button', { class: 'btn xs danger', onclick: async () => { if (await confirmSheet({ title: 'Delete ' + p.name + '?', text: 'Logged workouts are kept. The programme cannot be recovered except with Undo.', ok: 'Delete', danger: true })) { mark('Delete programme'); delete Store.config.programs[p.id]; s.activeProgramId = Object.keys(Store.config.programs)[0]; commitEdit(); } } }, 'Delete') : null)));
    // schedule
    const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; const dowIdx = [1, 2, 3, 4, 5, 6, 0];
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Schedule'),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, 'Start date'), h('input', { type: 'date', value: s.startDate, onchange: e => { if (e.target.value) { mark('Change start date'); s.startDate = e.target.value; commitEdit(); } } })),
        h('label', { class: 'field grow' }, h('span', {}, 'Mode'), h('select', { onchange: e => { mark('Change schedule mode'); p.scheduleMode = e.target.value; if (p.scheduleMode === 'weekday' && !p.weekdayMap) { p.weekdayMap = {}; p.cycle.filter(x => x !== 'rest').forEach((id, i) => { if (i < 7) p.weekdayMap[[1, 2, 4, 5, 3, 6, 0][i]] = id; }); } commitEdit(); } }, h('option', { value: 'rotate', selected: p.scheduleMode !== 'weekday' }, 'Rotate continuously'), h('option', { value: 'weekday', selected: p.scheduleMode === 'weekday' }, 'Fixed weekdays')))),
      p.scheduleMode !== 'weekday' ? h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Rest days every week'), h('div', { class: 'row wrap', style: 'gap:6px' }, ...dow.map((d, i) => h('button', { class: 'chip' + ((s.restWeekdays || []).includes(dowIdx[i]) ? ' on' : ''), 'aria-pressed': (s.restWeekdays || []).includes(dowIdx[i]) ? 'true' : 'false', onclick: () => { mark('Rest weekdays'); const r = new Set(s.restWeekdays || []); r.has(dowIdx[i]) ? r.delete(dowIdx[i]) : r.add(dowIdx[i]); s.restWeekdays = [...r].sort(); commitEdit(); } }, d)))) : null,
      h('div', { class: 'switch' }, h('div', { class: 'stack', style: 'gap:0' }, h('span', {}, 'Weekly equipment rotation'), h('span', { class: 'small dim' }, s.rotation.enabled ? s.rotation.cycle.map(cap).join(' → ') + ' → repeat' : 'Exercises stay as listed')), h('button', { class: 'toggle' + (s.rotation.enabled ? ' on' : ''), role: 'switch', 'aria-checked': s.rotation.enabled ? 'true' : 'false', 'aria-label': 'Weekly equipment rotation', onclick: () => { mark('Equipment rotation'); s.rotation.enabled = !s.rotation.enabled; commitEdit(); } })),
      s.rotation.enabled ? h('div', { class: 'row' }, ...[0, 1].map(i => h('select', { 'aria-label': 'Week ' + (i + 1) + ' emphasis', onchange: e => { mark('Rotation cycle'); s.rotation.cycle[i] = e.target.value; commitEdit(); } }, ...['barbell', 'dumbbell', 'machine', 'cable'].map(q => h('option', { value: q, selected: s.rotation.cycle[i] === q }, 'Week ' + (i + 1) + ': ' + cap(q))))), h('button', { class: 'btn sm', onclick: () => { mark('Week override'); const wk = Sched.weekIndex(Dates.today()); const cur = Sched.emphasisFor(Dates.today()); s.rotation.weekOverrides = s.rotation.weekOverrides || {}; s.rotation.weekOverrides[wk] = cur === 'barbell' ? 'dumbbell' : 'barbell'; commitEdit(); } }, 'Swap this week')) : null,
      h('div', { class: 'row wrap' }, h('button', { class: 'btn sm', onclick: () => { mark(s.paused ? 'Resume programme' : 'Pause programme'); s.paused = !s.paused; s.pausedFrom = s.paused ? Dates.today() : null; commitEdit(); } }, s.paused ? 'Resume programme' : 'Pause programme'),
        h('button', { class: 'btn sm' + ((s.deloadWeeks || []).includes(Sched.weekIndex(Dates.today())) ? ' primary' : ''), onclick: () => { mark('Deload week'); const wk = Sched.weekIndex(Dates.today()); const set = new Set(s.deloadWeeks || []); set.has(wk) ? set.delete(wk) : set.add(wk); s.deloadWeeks = [...set]; commitEdit(); } }, (s.deloadWeeks || []).includes(Sched.weekIndex(Dates.today())) ? 'Deload week: on' : 'Make this week a deload'))));
    // cycle or weekday map
    if (p.scheduleMode === 'weekday') {
      root.append(h('div', { class: 'card' }, h('h3', {}, 'Weekly plan'), ...dow.map((d, i) => { const k = dowIdx[i]; return h('div', { class: 'row' }, h('span', { style: 'width:40px', class: 'muted' }, d), h('select', { 'aria-label': d, onchange: e => { mark('Weekday plan'); p.weekdayMap = p.weekdayMap || {}; if (e.target.value) p.weekdayMap[k] = e.target.value; else delete p.weekdayMap[k]; commitEdit(); } }, h('option', { value: '' }, 'Rest'), ...Object.values(p.sessions).map(ss => h('option', { value: ss.id, selected: (p.weekdayMap || {})[k] === ss.id }, ss.name)))); })));
    } else {
      const cyc = h('div', { class: 'list' });
      p.cycle.forEach((id, i) => {
        const ss = p.sessions[id];
        cyc.append(h('div', { class: 'item' }, h('div', { class: 'grow', style: 'cursor:pointer', onclick: () => ss && SessionEditor.open(ss) }, h('div', { class: 'eyebrow' }, 'Day ' + (i + 1)), h('div', { class: 't' }, ss ? ss.name : 'Rest'), ss ? h('div', { class: 's' }, ss.slots.length + ' exercises · ' + ss.slots.reduce((a, x) => a + (x.sets || 0), 0) + ' sets') : null),
          h('div', { class: 'row', style: 'gap:2px' }, h('button', { class: 'iconbtn', 'aria-label': 'Move up', disabled: i === 0, onclick: () => { mark('Reorder days'); [p.cycle[i - 1], p.cycle[i]] = [p.cycle[i], p.cycle[i - 1]]; commitEdit(); } }, icon('up')), h('button', { class: 'iconbtn', 'aria-label': 'Move down', disabled: i === p.cycle.length - 1, onclick: () => { mark('Reorder days'); [p.cycle[i + 1], p.cycle[i]] = [p.cycle[i], p.cycle[i + 1]]; commitEdit(); } }, icon('down')),
            ss ? h('button', { class: 'iconbtn', 'aria-label': 'Duplicate day', onclick: () => { mark('Duplicate day'); const c = clone(ss); c.id = uid(); c.name = ss.name + ' B'; c.slots.forEach(x => x.id = uid()); p.sessions[c.id] = c; p.cycle.splice(i + 1, 0, c.id); commitEdit(); } }, icon('copy')) : null,
            h('button', { class: 'iconbtn', 'aria-label': 'Remove day', onclick: () => { mark('Remove day'); p.cycle.splice(i, 1); commitEdit(); } }, icon('trash')))));
      });
      root.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', {}, 'Training cycle'), h('span', { class: 'small dim' }, p.cycle.length + ' days, repeats')), cyc,
        h('div', { class: 'row wrap' }, h('button', { class: 'btn sm', onclick: () => newDay(p) }, icon('plus'), 'Training day'), h('button', { class: 'btn sm', onclick: () => { mark('Add rest day'); p.cycle.push('rest'); commitEdit(); } }, icon('plus'), 'Rest day'),
          Object.values(p.sessions).some(ss => !p.cycle.includes(ss.id)) ? h('select', { 'aria-label': 'Add an existing session', style: 'width:auto;min-height:36px;padding:6px 10px', onchange: e => { if (e.target.value) { mark('Add day'); p.cycle.push(e.target.value); commitEdit(); } } }, h('option', { value: '' }, 'Add saved session…'), ...Object.values(p.sessions).filter(ss => !p.cycle.includes(ss.id)).map(ss => h('option', { value: ss.id }, ss.name))) : null)));
    }
    // sessions not in cycle (templates)
    const spare = Object.values(p.sessions).filter(ss => !p.cycle.includes(ss.id) && !(p.scheduleMode === 'weekday' && Object.values(p.weekdayMap || {}).includes(ss.id)));
    if (spare.length) root.append(h('div', { class: 'card' }, h('h3', {}, 'Saved sessions'), h('div', { class: 'list' }, ...spare.map(ss => h('div', { class: 'item' }, h('div', { class: 'grow', style: 'cursor:pointer', onclick: () => SessionEditor.open(ss) }, h('div', { class: 't' }, ss.name), h('div', { class: 's' }, ss.slots.length + ' exercises')), h('button', { class: 'iconbtn', 'aria-label': 'Delete session', onclick: () => { mark('Delete session'); delete p.sessions[ss.id]; commitEdit(); } }, icon('trash')))))));
    // defaults
    const c = p.cardio || (p.cardio = { enabled: true, activity: 'incline_walk', minutes: 20, position: 'after' }); const k = p.core || (p.core = { enabled: true, count: 2, sets: 3, position: 'after' });
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Cardio & core defaults'), h('span', { class: 'small dim' }, 'Applied to every session unless a session sets its own.'),
      h('div', { class: 'switch' }, h('span', {}, 'Cardio each session'), h('button', { class: 'toggle' + (c.enabled !== false ? ' on' : ''), role: 'switch', 'aria-checked': c.enabled !== false ? 'true' : 'false', 'aria-label': 'Cardio each session', onclick: () => { mark('Cardio'); c.enabled = c.enabled === false; commitEdit(); } })),
      c.enabled !== false ? h('div', { class: 'row' }, h('select', { 'aria-label': 'Cardio activity', onchange: e => { mark('Cardio'); c.activity = e.target.value; commitEdit(); } }, ...EX.CARDIO.map(a => h('option', { value: a.id, selected: a.id === c.activity }, a.label))), h('input', { type: 'number', 'aria-label': 'Cardio minutes', value: c.minutes, min: 5, step: 5, style: 'width:90px', onchange: e => { mark('Cardio'); c.minutes = +e.target.value; commitEdit(); } }), h('select', { 'aria-label': 'Cardio position', onchange: e => { mark('Cardio'); c.position = e.target.value; commitEdit(); } }, h('option', { value: 'after', selected: c.position !== 'before' }, 'After lifting'), h('option', { value: 'before', selected: c.position === 'before' }, 'Before lifting'))) : null,
      h('div', { class: 'switch' }, h('div', { class: 'stack', style: 'gap:0' }, h('span', {}, 'Core work each session'), h('span', { class: 'small dim' }, 'Skipped automatically on days that already train core')), h('button', { class: 'toggle' + (k.enabled !== false ? ' on' : ''), role: 'switch', 'aria-checked': k.enabled !== false ? 'true' : 'false', 'aria-label': 'Core work each session', onclick: () => { mark('Core'); k.enabled = k.enabled === false; commitEdit(); } })),
      k.enabled !== false ? h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, 'Exercises'), h('input', { type: 'number', value: k.count, min: 1, max: 5, onchange: e => { mark('Core'); k.count = +e.target.value; k.exercises = null; commitEdit(); } })), h('label', { class: 'field grow' }, h('span', {}, 'Sets each'), h('input', { type: 'number', value: k.sets, min: 1, max: 6, onchange: e => { mark('Core'); k.sets = +e.target.value; commitEdit(); } })), h('label', { class: 'field grow' }, h('span', {}, 'When'), h('select', { onchange: e => { mark('Core'); k.position = e.target.value; commitEdit(); } }, h('option', { value: 'after', selected: k.position !== 'before' }, 'After'), h('option', { value: 'before', selected: k.position === 'before' }, 'Before')))) : null));
    root.append(calendarCard());
  }
  function renameProgram(p) { Sheet.open((el, api) => { const inp = h('input', { type: 'text', value: p.name }); el.append(Sheet.head('Programme name', api), inp, h('button', { class: 'btn primary', onclick: () => { mark('Rename programme'); p.name = inp.value.trim() || p.name; commitEdit(); api.close(); } }, 'Save')); }); }
  function newProgram() {
    Sheet.open((el, api) => {
      const inp = h('input', { type: 'text', placeholder: 'Programme name', value: 'New programme' }); let days = 4;
      el.append(Sheet.head('New programme', api), inp, h('label', { class: 'field' }, h('span', {}, 'Days in the split'), h('select', { onchange: e => days = +e.target.value }, ...[2, 3, 4, 5, 6].map(n => h('option', { value: n, selected: n === 4 }, n + '-day split')))),
        h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => { mark('New programme'); const np = { id: uid(), name: inp.value.trim() || 'New programme', createdAt: Date.now(), cycle: [], sessions: {}, cardio: clone(Store.program.cardio), core: clone(Store.program.core) }; Store.config.programs[np.id] = np; Store.settings.activeProgramId = np.id; commitEdit(); api.close(); toast('Empty programme created. Add training days below.'); } }, 'Start empty'),
          h('button', { class: 'btn grow primary', onclick: () => { mark('New programme'); const np = Gen.defaultProgram(); np.id = uid(); np.name = inp.value.trim() || 'New programme'; Store.config.programs[np.id] = np; Store.settings.activeProgramId = np.id; Coach.commit([{ op: 'splitDays', n: days }], 'program', { today: Dates.today() }, 'Build ' + days + '-day split'); api.close(); } }, 'Generate ' + days + '-day')));
    });
  }
  function newDay(p) {
    Sheet.open((el, api) => {
      const sel = new Set(); const draw = () => { body.replaceChildren(...['chest', 'back', 'shoulders', 'triceps', 'biceps', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'core', 'arms'].map(g => h('button', { class: 'chip' + (sel.has(g) ? ' on' : ''), 'aria-pressed': sel.has(g) ? 'true' : 'false', onclick: () => { sel.has(g) ? sel.delete(g) : sel.add(g); draw(); } }, Lib.groupLabel(g)))); };
      const body = h('div', { class: 'row wrap', style: 'gap:6px' }); draw();
      el.append(Sheet.head('New training day', api), h('p', { class: 'muted small', style: 'margin:0' }, 'Pick the muscle groups. Exercises are generated (about eight in total) and you can edit them afterwards.'), body,
        h('button', { class: 'btn primary', onclick: () => { if (!sel.size) return toast('Pick at least one muscle group'); mark('Add training day'); const ss = Gen.buildSession([...sel]); p.sessions[ss.id] = ss; p.cycle.push(ss.id); commitEdit(); api.close(); SessionEditor.open(ss); } }, 'Create day'));
    });
  }
  // ---- calendar ----
  function calendarCard() {
    const today = Dates.today(); if (!calMonth) calMonth = today.slice(0, 7);
    const [y, m] = calMonth.split('-').map(Number); const first = new Date(y, m - 1, 1); const days = new Date(y, m, 0).getDate(); const offset = (first.getDay() + 6) % 7;
    const grid = h('div', { class: 'cal' }, ...['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => h('div', { class: 'dow' }, d)));
    for (let i = 0; i < offset; i++) grid.append(h('div'));
    const colors = {}; Object.values(Store.program.sessions).forEach((ss, i) => colors[ss.id] = ['#2f8cff', '#b4ff3a', '#ff8a4c', '#c77dff', '#4cd9c0', '#ffd34c'][i % 6]);
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; const r = Sched.resolve(iso); const w = Store.workouts[iso]; const done = w && w.status === 'done';
      const short = r.kind === 'session' ? r.name.split(' & ').map(x => x.slice(0, 3)).join('/') : r.kind === 'rest' ? 'rest' : r.kind === 'paused' ? 'paused' : '';
      grid.append(h('button', { class: (iso === today ? 'c-today ' : '') + (done ? 'c-done ' : '') + (r.kind !== 'session' ? 'c-rest ' : '') + (r.kind === 'before' ? 'c-off ' : '') + (selDate === iso ? 'c-sel' : ''), 'aria-label': Dates.fmt(iso) + ', ' + (r.kind === 'session' ? r.name : r.kind), onclick: () => { selDate = iso; daySheet(iso); } },
        h('span', { class: 'd' }, d), r.kind === 'session' ? h('span', { style: `width:16px;height:3px;border-radius:2px;background:${colors[r.sessionId] || '#888'}` }) : null, h('span', { class: 'k' }, done ? '✓' : short)));
    }
    const nav = (dir) => { const dt = new Date(y, m - 1 + dir, 1); calMonth = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); App.render(); };
    return h('div', { class: 'card' }, h('div', { class: 'row between' }, h('button', { class: 'iconbtn', 'aria-label': 'Previous month', onclick: () => nav(-1) }, h('span', { html: ICON.chev, style: 'display:inline-flex;width:20px;height:20px;transform:scaleX(-1)' })), h('h3', {}, Dates.MON[m - 1] + ' ' + y), h('button', { class: 'iconbtn', 'aria-label': 'Next month', onclick: () => nav(1) }, icon('chev'))), grid,
      h('div', { class: 'row wrap', style: 'gap:10px' }, ...Object.values(Store.program.sessions).filter(ss => Store.program.cycle.includes(ss.id) || Object.values(Store.program.weekdayMap || {}).includes(ss.id)).map(ss => h('span', { class: 'small dim' }, h('i', { style: `display:inline-block;width:10px;height:3px;border-radius:2px;background:${colors[ss.id]};vertical-align:middle;margin-right:5px` }), ss.name))));
  }
  function daySheet(date) {
    const r = Sched.resolve(date); const w = Store.workouts[date]; const today = Dates.today(); const ov = Store.config.overrides[date];
    Sheet.open((el, api) => {
      el.append(Sheet.head(Dates.fmt(date), api),
        h('div', { class: 'row wrap', style: 'gap:6px' }, h('span', { class: 'chip ' + (r.kind === 'session' ? 'on' : '') }, r.kind === 'session' ? r.name : r.kind === 'rest' ? 'Rest day' : r.kind === 'paused' ? 'Paused' : r.kind === 'before' ? 'Before programme start' : 'Nothing planned'), r.emphasis && r.kind === 'session' ? h('span', { class: 'chip' }, cap(r.emphasis) + ' week') : null, ov ? h('span', { class: 'chip warn' }, 'Changed') : null, w && w.status === 'done' ? h('span', { class: 'chip lime' }, 'Completed') : null),
        r.kind === 'session' && !(w && w.status === 'done') ? h('ul', { class: 'clean muted' }, ...r.slots.map(sl => { const ex = Lib.get(sl.exResolved); return h('li', {}, (ex ? ex.name : sl.exResolved) + ' ' + sl.sets + '×' + sl.repMin + '–' + sl.repMax); })) : null,
        w && (w.status === 'done' || w.entries.some(e => e.sets.some(s => s.done))) ? h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('tbody', {}, ...[...w.entries, ...(w.core || [])].filter(e => e.sets.some(s => s.done)).map(e => { const ex = Lib.get(e.ex); return h('tr', {}, h('td', {}, ex ? ex.name : e.ex), h('td', {}, e.sets.filter(s => s.done).map(s => ex && ex.timed ? s.secs + 's' : (s.w ?? '—') + '×' + (s.r ?? '—')).join(', '))); }), w.cardio && w.cardio.done ? h('tr', {}, h('td', {}, 'Cardio'), h('td', {}, (EX.CARDIO.find(a => a.id === w.cardio.activity) || {}).label + ' ' + w.cardio.minutes + ' min')) : null))) : null,
        date >= today ? h('div', { class: 'row wrap' },
          h('button', { class: 'btn sm', onclick: () => { api.close(); pickSessionFor(date); } }, 'Change session'),
          r.kind !== 'rest' ? h('button', { class: 'btn sm', onclick: () => { Coach.commit([{ op: 'dayRest', date }], 'date', { today, date }, 'Rest on ' + Dates.fmt(date, 'short')); api.close(); } }, 'Make rest day') : null,
          r.kind === 'session' ? h('button', { class: 'btn sm', onclick: () => moveSheet(date, api) }, 'Move to another date') : null,
          ov ? h('button', { class: 'btn sm ghost', onclick: () => { mark('Clear change on ' + Dates.fmt(date, 'short')); delete Store.config.overrides[date]; commitEdit(); api.close(); } }, 'Undo change for this day') : null,
          date === today ? h('button', { class: 'btn sm primary', onclick: () => { api.close(); App.setTab('today'); } }, 'Open today') : null) : null);
    });
  }
  function moveSheet(from, parent) {
    Sheet.open((el, api) => { const inp = h('input', { type: 'date', value: Dates.addDays(from, 1), min: Dates.today() }); el.append(Sheet.head('Move workout', api), h('p', { class: 'muted small', style: 'margin:0' }, 'The original date becomes a rest day; the rotation continues after it.'), inp, h('button', { class: 'btn primary', onclick: () => { if (!inp.value) return; Coach.commit([{ op: 'moveWorkout', from, to: inp.value }], 'date', { today: Dates.today(), date: inp.value }, 'Move workout'); api.close(); parent && parent.close(); toast('Moved to ' + Dates.fmt(inp.value, 'short')); } }, 'Move')); });
  }
  function pickSessionFor(date) {
    const p = Store.program;
    Sheet.open((el, api) => {
      el.append(Sheet.head('Train on ' + Dates.fmt(date, 'short'), api), h('div', { class: 'list' }, ...Object.values(p.sessions).map(ss => h('button', { class: 'item', onclick: () => { Coach.commit([{ op: 'dayOverride', date, sessionId: ss.id }], 'date', { today: Dates.today(), date }, ss.name + ' on ' + Dates.fmt(date, 'short')); api.close(); if (date === Dates.today()) App.setTab('today'); } }, h('div', { class: 'grow' }, h('div', { class: 't' }, ss.name), h('div', { class: 's' }, ss.slots.length + ' exercises')), icon('chev')))),
        h('button', { class: 'btn ghost', onclick: () => { api.close(); Sheet.open((el2, api2) => { const sel = new Set(); const body = h('div', { class: 'row wrap', style: 'gap:6px' }); const draw = () => body.replaceChildren(...['chest', 'back', 'shoulders', 'triceps', 'biceps', 'legs', 'glutes', 'calves', 'traps', 'core', 'arms'].map(g => h('button', { class: 'chip' + (sel.has(g) ? ' on' : ''), onclick: () => { sel.has(g) ? sel.delete(g) : sel.add(g); draw(); } }, Lib.groupLabel(g)))); draw(); el2.append(Sheet.head('One-off session', api2), body, h('button', { class: 'btn primary', onclick: () => { if (!sel.size) return; Coach.commit([{ op: 'dayOverride', date, groups: [...sel] }], 'date', { today: Dates.today(), date }, 'One-off session'); api2.close(); if (date === Dates.today()) App.setTab('today'); } }, 'Create')); }); } }, 'Build a one-off session instead'));
    });
  }
  function addToSessionPicker(ex) {
    const p = Store.program;
    Sheet.open((el, api) => { el.append(Sheet.head('Add ' + ex.name + ' to…', api), h('div', { class: 'list' }, ...Object.values(p.sessions).map(ss => h('button', { class: 'item', onclick: () => { mark('Add ' + ex.name); ss.slots.push(Gen.slot(ex)); if (!ss.groups.some(g => Lib.groupsOf(g).includes(ex.group))) { ss.groups.push(ex.group); ss.name = Gen.sessionName(ss.groups); } commitEdit(); api.close(); toast('Added to ' + ss.name); } }, h('div', { class: 'grow' }, h('div', { class: 't' }, ss.name), h('div', { class: 's' }, ss.slots.length + ' exercises')), icon('chev'))))); });
  }
  return { render, pickSessionFor, addToSessionPicker, commitEdit, mark };
})();

/* ---- Session editor ---- */
const SessionEditor = (() => {
  function open(ss) {
    let marked = false; const mark = () => { if (!marked) { Store.pushUndo('Edit ' + ss.name); marked = true; } };
    const save = () => Programme.commitEdit();
    Sheet.open((el, api) => {
      const slotRow = (sl, i) => {
        const ex = Lib.get(sl.ex) || { name: sl.ex, group: '' };
        return h('div', { class: 'item' }, thumb(ex), h('div', { class: 'grow', style: 'cursor:pointer', onclick: () => slotEditor(sl) }, h('div', { class: 't' }, ex.name), h('div', { class: 's num' }, `${Lib.groupLabel(ex.group)} · ${sl.sets}×${sl.repMin}–${sl.repMax} · rest ${fmtSecs(sl.rest)}${sl.variants ? ' · rotates' : ''}`)),
          h('div', { class: 'stack', style: 'gap:0' }, h('button', { class: 'iconbtn', 'aria-label': 'Move up', disabled: i === 0, onclick: () => { mark(); [ss.slots[i - 1], ss.slots[i]] = [ss.slots[i], ss.slots[i - 1]]; save(); api.rerender(); } }, icon('up')), h('button', { class: 'iconbtn', 'aria-label': 'Move down', disabled: i === ss.slots.length - 1, onclick: () => { mark(); [ss.slots[i + 1], ss.slots[i]] = [ss.slots[i], ss.slots[i + 1]]; save(); api.rerender(); } }, icon('down'))),
          h('div', { class: 'stack', style: 'gap:0' }, h('button', { class: 'iconbtn', 'aria-label': 'Replace exercise', onclick: () => ExercisePicker.open({ title: 'Replace ' + ex.name, group: ex.group, exclude: ss.slots.map(x => x.ex), current: sl.ex, onPick: nx => { mark(); sl.ex = nx.id; sl.variants = Gen.variants(nx); save(); api.rerender(); } }) }, icon('swap')), h('button', { class: 'iconbtn', 'aria-label': 'More', onclick: () => slotMenu(sl, i) }, h('span', { style: 'font-weight:700;letter-spacing:1px' }, '···'))));
      };
      const slotMenu = (sl, i) => Sheet.open((el2, api2) => { const ex = Lib.get(sl.ex); el2.append(Sheet.head(ex ? ex.name : sl.ex, api2), h('div', { class: 'stack' },
        h('button', { class: 'btn', onclick: () => { api2.close(); DemoSheet.open(ex, { onAction: () => null }); } }, 'Show demonstration'),
        h('button', { class: 'btn', onclick: () => { api2.close(); slotEditor(sl); } }, 'Edit sets, reps, rest'),
        h('button', { class: 'btn', onclick: () => { mark(); const c = clone(sl); c.id = uid(); ss.slots.splice(i + 1, 0, c); save(); api2.close(); api.rerender(); } }, 'Duplicate'),
        h('button', { class: 'btn danger', onclick: () => { mark(); ss.slots.splice(i, 1); save(); api2.close(); api.rerender(); } }, 'Remove from session'))); });
      const slotEditor = sl => Sheet.open((el2, api2) => {
        const ex = Lib.get(sl.ex); const f = (label, key, step = 1, min = 0) => h('label', { class: 'field grow' }, h('span', {}, label), h('input', { type: 'number', value: sl[key], step, min, onchange: e => { mark(); sl[key] = +e.target.value; } }));
        el2.append(Sheet.head('Edit ' + (ex ? ex.name : ''), api2), h('div', { class: 'row' }, f('Sets', 'sets', 1, 1), f('Reps min', 'repMin'), f('Reps max', 'repMax')), h('div', { class: 'row' }, f('Rest (s)', 'rest', 15, 15), f('Target RIR', 'rir'), f('Warm-up sets', 'warmup')),
          h('label', { class: 'field' }, h('span', {}, 'Tempo (ecc-pause-con-pause)'), h('input', { type: 'text', value: sl.tempo || '', placeholder: '2-1-1-0', onchange: e => { mark(); sl.tempo = e.target.value; } })),
          h('label', { class: 'field' }, h('span', {}, 'Execution note'), h('input', { type: 'text', value: sl.note || '', onchange: e => { mark(); sl.note = e.target.value; } })),
          sl.variants ? h('div', { class: 'switch' }, h('span', {}, 'Rotate barbell/dumbbell version weekly'), h('button', { class: 'toggle on', role: 'switch', 'aria-checked': 'true', onclick: () => { mark(); sl.variants = null; save(); api2.close(); api.rerender(); } })) : (ex && Gen.variants(ex) ? h('button', { class: 'btn sm ghost', onclick: () => { mark(); sl.variants = Gen.variants(ex); save(); api2.close(); api.rerender(); } }, 'Rotate barbell/dumbbell version weekly') : null),
          h('button', { class: 'btn primary', onclick: () => { if (sl.repMin > sl.repMax) [sl.repMin, sl.repMax] = [sl.repMax, sl.repMin]; save(); api2.close(); api.rerender(); } }, 'Save'));
      });
      const nameInp = h('input', { type: 'text', value: ss.name, 'aria-label': 'Session name', onchange: e => { mark(); ss.name = e.target.value.trim() || ss.name; save(); } });
      el.append(Sheet.head('Edit session', api), nameInp,
        h('div', { class: 'row wrap', style: 'gap:6px' }, ...ss.groups.map(g => h('span', { class: 'chip on' }, Lib.groupLabel(g), h('button', { class: 'iconbtn', style: 'padding:0;margin-left:2px', 'aria-label': 'Remove ' + Lib.groupLabel(g), onclick: async () => { if (!await confirmSheet({ title: 'Remove ' + Lib.groupLabel(g) + '?', text: 'Its exercises are removed from this session.', ok: 'Remove', danger: true })) return; mark(); ss.groups = ss.groups.filter(x => x !== g); ss.slots = ss.slots.filter(sl => !Lib.groupsOf(g).includes((Lib.get(sl.ex) || {}).group)); ss.name = Gen.sessionName(ss.groups) || ss.name; save(); api.rerender(); } }, h('span', { html: ICON.close, style: 'display:inline-flex;width:14px;height:14px' })))),
          h('select', { 'aria-label': 'Add muscle group', style: 'width:auto;min-height:32px;padding:4px 8px', onchange: e => { const g = e.target.value; if (!g) return; mark(); const added = Gen.pick(g, 3, { exclude: ss.slots.map(x => x.ex) }); for (const x of added) ss.slots.push(Gen.slot(x)); ss.groups.push(g); ss.name = Gen.sessionName(ss.groups); save(); api.rerender(); } }, h('option', { value: '' }, '+ Add muscle group'), ...['chest', 'back', 'shoulders', 'triceps', 'biceps', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'core'].filter(g => !ss.groups.includes(g)).map(g => h('option', { value: g }, Lib.groupLabel(g))))),
        h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, ss.slots.length + ' exercises · ' + ss.slots.reduce((a, x) => a + x.sets, 0) + ' working sets'), h('div', { class: 'row', style: 'gap:6px' }, h('button', { class: 'btn xs', onclick: () => { mark(); ss.slots.sort((a, b) => ((Lib.get(a.ex) || {}).type === 'compound' ? 0 : 1) - ((Lib.get(b.ex) || {}).type === 'compound' ? 0 : 1)); save(); api.rerender(); } }, 'Compounds first'), h('button', { class: 'btn xs', onclick: () => { mark(); const lists = ss.groups.map(g => ss.slots.filter(sl => Lib.groupsOf(g).includes((Lib.get(sl.ex) || {}).group))); const out = []; const max = Math.max(0, ...lists.map(l => l.length)); for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]); ss.slots = out.concat(ss.slots.filter(x => !out.includes(x))); save(); api.rerender(); } }, 'Alternate groups'))),
        h('div', { class: 'list' }, ...ss.slots.map(slotRow)),
        h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => ExercisePicker.open({ title: 'Add exercise', group: ss.groups[0], exclude: ss.slots.map(x => x.ex), onPick: nx => { mark(); ss.slots.push(Gen.slot(nx)); if (!ss.groups.some(g => Lib.groupsOf(g).includes(nx.group))) { ss.groups.push(nx.group); ss.name = Gen.sessionName(ss.groups); } save(); api.rerender(); } }) }, icon('plus'), 'Add exercise'),
          h('button', { class: 'btn ghost', onclick: async () => { if (await confirmSheet({ title: 'Regenerate exercises?', text: 'Rebuilds this session from its muscle groups with default exercises.', ok: 'Regenerate' })) { mark(); const ns = Gen.buildSession(ss.groups); ss.slots = ns.slots; save(); api.rerender(); } } }, 'Regenerate'),
          h('button', { class: 'btn ghost', onclick: () => { const c = ss.cardio || clone(Store.program.cardio); Sheet.open((el2, api2) => { el2.append(Sheet.head('Cardio for this session', api2), h('div', { class: 'switch' }, h('span', {}, 'Cardio on this day'), h('button', { class: 'toggle' + (c.enabled !== false ? ' on' : ''), role: 'switch', onclick: () => { c.enabled = c.enabled === false; api2.rerender(); } })), h('div', { class: 'row' }, h('select', { onchange: e => c.activity = e.target.value }, ...EX.CARDIO.map(a => h('option', { value: a.id, selected: a.id === c.activity }, a.label))), h('input', { type: 'number', value: c.minutes, min: 5, step: 5, style: 'width:90px', onchange: e => c.minutes = +e.target.value })), h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => { mark(); ss.cardio = null; save(); api2.close(); } }, 'Use programme default'), h('button', { class: 'btn grow primary', onclick: () => { mark(); ss.cardio = c; save(); api2.close(); } }, 'Save'))); }); } }, 'Cardio…')));
    }, { full: true });
  }
  return { open };
})();

/* ---- Library ---- */
const Library = (() => {
  let q = '', g = '', equip = '';
  function render(root) {
    root.append(h('div', { class: 'hero' }, h('span', { class: 'eyebrow' }, 'Exercise library'), h('h1', {}, Lib.all().length + ' movements'), h('span', { class: 'small dim' }, 'Every exercise has an animated demonstration showing the start and finish positions and the path of the load.')));
    root.append(h('div', { class: 'row' }, h('input', { type: 'search', placeholder: 'Search exercises', value: q, oninput: e => { q = e.target.value; App.render(); } }), h('select', { 'aria-label': 'Equipment', style: 'width:130px', onchange: e => { equip = e.target.value; App.render(); } }, h('option', { value: '' }, 'Any gear'), ...Object.entries(EX.EQUIP).map(([k, v]) => h('option', { value: k, selected: equip === k }, v)))));
    root.append(h('div', { class: 'pill-row' }, h('button', { class: 'chip' + (!g ? ' on' : ''), onclick: () => { g = ''; App.render(); } }, 'All'), ...Object.keys(EX.GROUPS).map(x => h('button', { class: 'chip' + (g === x ? ' on' : ''), onclick: () => { g = x; App.render(); } }, EX.GROUPS[x].label))));
    const items = Lib.all().filter(e => (!g || e.group === g) && (!equip || e.equip === equip) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.group.localeCompare(b.group) || a.prio - b.prio);
    root.append(h('div', { class: 'list' }, ...items.map(e => h('button', { class: 'item', onclick: () => DemoSheet.open(e) }, thumb(e), h('div', { class: 'grow' }, h('div', { class: 't' }, e.name), h('div', { class: 's' }, [Lib.groupLabel(e.group), EX.EQUIP[e.equip], e.type, e.custom ? 'custom' : null].filter(Boolean).join(' · '))), icon('chev')))));
    root.append(h('button', { class: 'btn', onclick: () => customSheet() }, icon('plus'), 'Create your own exercise'));
  }
  function customSheet(existing) {
    const ex = existing || { id: 'c_' + uid(), name: '', group: 'chest', equip: 'dumbbell', type: 'compound', diff: 2, prio: 9, reps: [8, 12], rest: 90, cues: [], mistakes: [], custom: true, demoFrom: null, secondary: [] };
    Sheet.open((el, api) => {
      const nameI = h('input', { type: 'text', value: ex.name, placeholder: 'Exercise name' });
      const groupS = h('select', { onchange: e => { ex.group = e.target.value; ex.demoFrom = null; api.rerender(); } }, ...Object.keys(EX.GROUPS).map(x => h('option', { value: x, selected: ex.group === x }, EX.GROUPS[x].label)));
      const equipS = h('select', {}, ...Object.entries(EX.EQUIP).map(([k, v]) => h('option', { value: k, selected: ex.equip === k }, v)));
      const typeS = h('select', {}, h('option', { value: 'compound', selected: ex.type === 'compound' }, 'Compound'), h('option', { value: 'isolation', selected: ex.type === 'isolation' }, 'Isolation'));
      const demoS = h('select', {}, h('option', { value: '' }, 'No demonstration'), ...EX.list.filter(e => e.group === ex.group).map(e => h('option', { value: e.id, selected: ex.demoFrom === e.id }, e.name)));
      const minI = h('input', { type: 'number', value: ex.reps[0], min: 1 }), maxI = h('input', { type: 'number', value: ex.reps[1], min: 1 }), restI = h('input', { type: 'number', value: ex.rest, min: 15, step: 15 });
      const cuesT = h('textarea', { value: (ex.cues || []).join('\n'), placeholder: 'One technique cue per line' });
      el.append(Sheet.head(existing ? 'Edit exercise' : 'New exercise', api), nameI, h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, 'Muscle'), groupS), h('label', { class: 'field grow' }, h('span', {}, 'Equipment'), equipS), h('label', { class: 'field grow' }, h('span', {}, 'Type'), typeS)),
        h('label', { class: 'field' }, h('span', {}, 'Animated demo: looks like…'), demoS),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, 'Reps min'), minI), h('label', { class: 'field grow' }, h('span', {}, 'Reps max'), maxI), h('label', { class: 'field grow' }, h('span', {}, 'Rest (s)'), restI)),
        h('label', { class: 'field' }, h('span', {}, 'Technique cues'), cuesT),
        h('div', { class: 'row' }, existing ? h('button', { class: 'btn danger', onclick: async () => { if (await confirmSheet({ title: 'Delete this exercise?', ok: 'Delete', danger: true })) { delete Store.config.customExercises[ex.id]; Store.touch(); api.close(); } } }, 'Delete') : null,
          h('button', { class: 'btn primary grow', onclick: () => { if (!nameI.value.trim()) return toast('Give it a name'); Object.assign(ex, { name: nameI.value.trim(), group: groupS.value, equip: equipS.value, type: typeS.value, demoFrom: demoS.value || null, reps: [+minI.value || 8, +maxI.value || 12], rest: +restI.value || 90, cues: cuesT.value.split('\n').map(x => x.trim()).filter(Boolean) }); Store.config.customExercises[ex.id] = ex; Store.touch(); api.close(); toast('Saved ' + ex.name); } }, 'Save exercise')));
    });
  }
  return { render, customSheet };
})();

/* ---- Progress ---- */
const Progress = (() => {
  let exSel = null, range = 12, weekSel = 0;
  const NS = 'http://www.w3.org/2000/svg';
  function svg(w, hh) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${hh}`); s.setAttribute('class', 'chart'); return s; }
  function el(p, tag, attrs, txt) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; }
  function lineChart(series, labels) {
    const W = 600, H = 240, L = 54, R = 16, T = 16, B = 34; const s = svg(W, H);
    const all = series.flatMap(x => x.pts.map(p => p[1])); if (!all.length) return s;
    const y0 = Math.floor(Math.min(...all) * .9 / 5) * 5, y1 = Math.ceil(Math.max(...all) * 1.05 / 5) * 5 || 5; const n = Math.max(1, series[0].pts.length - 1);
    const X = i => L + i / n * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
    for (let k = 0; k <= 4; k++) { const v = y0 + (y1 - y0) * k / 4; el(s, 'line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'grid' }); el(s, 'text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, Math.round(v)); }
    series.forEach((sr, si) => { const d = sr.pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' '); if (si === 0 && sr.pts.length > 1) el(s, 'path', { d: d + ` L${X(sr.pts.length - 1).toFixed(1)} ${Y(y0)} L${X(0)} ${Y(y0)} Z`, class: 'area' }); el(s, 'path', { d, class: sr.cls }); sr.pts.forEach((p, i) => el(s, 'circle', { cx: X(i), cy: Y(p[1]), r: 3.2, class: si === 0 ? 'dot' : 'dot2' })); });
    const step = Math.ceil(labels.length / 6); labels.forEach((lb, i) => { if (i % step === 0 || i === labels.length - 1) el(s, 'text', { x: X(i), y: H - 8, 'text-anchor': 'middle' }, lb); });
    return s;
  }
  function barChart(items, max, fmt) {
    const W = 600, rowH = 30, H = items.length * rowH + 8, L = 118; const s = svg(W, H); const mx = Math.max(1, max, ...items.map(i => Math.max(i.v, i.v2 || 0)));
    items.forEach((it, i) => { const y = 4 + i * rowH; el(s, 'text', { x: L - 8, y: y + 20, 'text-anchor': 'end' }, it.label); if (it.v2 != null) el(s, 'rect', { x: L, y: y + 5, width: (it.v2 / mx) * (W - L - 70), height: 18, rx: 3, class: 'bar2' }); el(s, 'rect', { x: L, y: y + 5, width: (it.v / mx) * (W - L - 70), height: 18, rx: 3, class: 'bar' }); el(s, 'text', { x: L + (Math.max(it.v, it.v2 || 0) / mx) * (W - L - 70) + 6, y: y + 20 }, fmt ? fmt(it) : it.v); });
    if (max) { const x = L + (max / mx) * (W - L - 70); el(s, 'line', { x1: x, x2: x, y1: 0, y2: H, class: 'axis', 'stroke-dasharray': '3 3' }); }
    return s;
  }
  function colChart(items, fmt) {
    const W = 600, H = 180, L = 20, B = 30; const s = svg(W, H); const mx = Math.max(1, ...items.map(i => i.v)); const bw = (W - L - 10) / items.length;
    items.forEach((it, i) => { const hgt = (it.v / mx) * (H - B - 20); el(s, 'rect', { x: L + i * bw + 6, y: H - B - hgt, width: bw - 12, height: hgt, rx: 4, class: 'bar' }); el(s, 'text', { x: L + i * bw + bw / 2, y: H - B - hgt - 6, 'text-anchor': 'middle' }, fmt ? fmt(it.v) : it.v); el(s, 'text', { x: L + i * bw + bw / 2, y: H - 10, 'text-anchor': 'middle' }, it.label); });
    return s;
  }
  function render(root) {
    const weeks = Stats.weeklySets(8); const thisW = weeks[weeks.length - 1]; const avg = weeks.slice(-4).reduce((a, w) => a + w.sessions, 0) / 4;
    root.append(h('div', { class: 'hero' }, h('span', { class: 'eyebrow' }, 'Progress'), h('h1', {}, 'Training log')));
    root.append(h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('span', { class: 'v' }, thisW.sessions), h('span', { class: 'k' }, 'sessions, 7 days')), h('div', { class: 'tile' }, h('span', { class: 'v' }, avg.toFixed(1)), h('span', { class: 'k' }, 'avg / week, 4 wk')), h('div', { class: 'tile' }, h('span', { class: 'v' }, Math.round(thisW.volume / 1000) + 't'), h('span', { class: 'k' }, 'volume, 7 days')), h('div', { class: 'tile' }, h('span', { class: 'v' }, thisW.cardioMin), h('span', { class: 'k' }, 'cardio min, 7 days'))));
    // strength progression
    const withHist = Lib.all().filter(e => !e.timed && Stats.history(e.id).some(x => x.best > 0)).sort((a, b) => { const ha = Stats.history(a.id), hb = Stats.history(b.id); return hb[hb.length - 1].date.localeCompare(ha[ha.length - 1].date); });
    if (!exSel || !withHist.find(e => e.id === exSel)) exSel = withHist[0] ? withHist[0].id : null;
    const card = h('div', { class: 'card' }, h('div', { class: 'section-title' }, h('h3', {}, 'Strength'), h('span', { class: 'small dim' }, 'estimated 1RM and top set')));
    if (!exSel) card.append(h('div', { class: 'empty' }, 'Charts appear after your first logged session.'));
    else {
      const cutoff = range ? Dates.addDays(Dates.today(), -7 * range) : '0000'; const hist = Stats.history(exSel).filter(x => x.date >= cutoff);
      card.append(h('div', { class: 'row' }, h('select', { 'aria-label': 'Exercise', onchange: e => { exSel = e.target.value; App.render(); } }, ...withHist.map(e => h('option', { value: e.id, selected: e.id === exSel }, e.name))), h('div', { class: 'row', style: 'gap:4px' }, ...[[4, '4w'], [12, '12w'], [0, 'All']].map(([r, l]) => h('button', { class: 'chip' + (range === r ? ' on' : ''), onclick: () => { range = r; App.render(); } }, l)))),
        hist.length ? lineChart([{ pts: hist.map(x => [x.date, Math.round(x.best)]), cls: 'l1' }, { pts: hist.map(x => [x.date, x.top]), cls: 'l2' }], hist.map(x => Dates.fmt(x.date, 'day'))) : h('div', { class: 'empty' }, 'No sessions in this range.'),
        h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--accent)' }), 'Estimated 1RM (kg)'), h('span', {}, h('i', { style: 'background:var(--accent-2)' }), 'Top set weight (kg)')));
      const prs = Stats.prs(exSel); card.append(h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('span', { class: 'v' }, prs.top), h('span', { class: 'k' }, 'best kg')), h('div', { class: 'tile' }, h('span', { class: 'v' }, Math.round(prs.best)), h('span', { class: 'k' }, 'best e1RM')), h('div', { class: 'tile' }, h('span', { class: 'v' }, Math.round(prs.volume)), h('span', { class: 'k' }, 'best session volume'))));
    }
    root.append(card);
    // volume by muscle
    const wk = weeks[weeks.length - 1 - weekSel]; const planned = Stats.plannedWeek(wk.end); const groups = Object.keys(EX.GROUPS); const lim = Store.settings.volumeWarn || 20;
    const items = groups.map(g => ({ label: EX.GROUPS[g].label, v: Math.round(wk.byGroup[g] || 0), v2: planned[g] || 0 })).filter(i => i.v || i.v2);
    root.append(h('div', { class: 'card' }, h('div', { class: 'section-title' }, h('h3', {}, 'Weekly sets per muscle'), h('div', { class: 'row', style: 'gap:4px' }, h('button', { class: 'chip' + (weekSel === 0 ? ' on' : ''), onclick: () => { weekSel = 0; App.render(); } }, 'This week'), h('button', { class: 'chip' + (weekSel === 1 ? ' on' : ''), onclick: () => { weekSel = 1; App.render(); } }, 'Last week'))),
      items.length ? barChart(items, lim, it => `${it.v}${it.v2 ? ' / ' + it.v2 : ''}`) : h('div', { class: 'empty' }, 'Nothing planned or logged this week.'),
      h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--accent)' }), 'Completed sets'), h('span', {}, h('i', { style: 'background:#3a3f48' }), 'Planned sets'), h('span', {}, 'Dashed line: your ' + lim + '-set weekly warning')),
      (() => { const hot = items.filter(i => i.v2 > lim || i.v > lim); return hot.length ? h('div', { class: 'row wrap', style: 'gap:6px' }, ...hot.map(i => h('span', { class: 'chip warn' }, i.label + ' over ' + lim))) : h('span', { class: 'small dim' }, 'Volume per muscle is within your weekly threshold.'); })()));
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Consistency'), colChart(weeks.map(w => ({ label: Dates.fmt(w.start, 'day'), v: w.sessions }))), h('span', { class: 'small dim' }, 'Sessions completed per week, last 8 weeks')));
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Cardio'), colChart(weeks.map(w => ({ label: Dates.fmt(w.start, 'day'), v: w.cardioMin })), v => v ? v + 'm' : ''), h('span', { class: 'small dim' }, 'Minutes per week')));
    const prRows = Lib.all().map(e => ({ e, p: Stats.prs(e.id) })).filter(x => x.p.top).sort((a, b) => b.p.best - a.p.best);
    if (prRows.length) root.append(h('div', { class: 'card' }, h('h3', {}, 'Personal records'), h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Exercise'), h('th', {}, 'Top set'), h('th', {}, 'e1RM'))), h('tbody', {}, ...prRows.map(x => h('tr', {}, h('td', {}, x.e.name), h('td', {}, x.p.top + ' kg'), h('td', {}, Math.round(x.p.best) + ' kg'))))))));
  }
  return { render };
})();

/* ---- Settings ---- */
const Settings = (() => {
  async function saveFile(name, data) {
    if (window.FORGE_STANDALONE) { try { const blob = new Blob([data], { type: name.endsWith('.csv') ? 'text/csv' : 'application/json' }); const u = URL.createObjectURL(blob); const a = h('a', { href: u, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Saved ' + name); return; } catch (e) { } }
    let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) { try { await dl.save({ filename: name, data }); toast('Saved ' + name); return; } catch (e) { if (e && e.code === 'declined') return; } }
    Sheet.open((el, api) => { const ta = h('textarea', { value: data, readonly: true, style: 'min-height:200px;font-size:12px' }); el.append(Sheet.head(name, api), h('p', { class: 'muted small', style: 'margin:0' }, 'Downloads are not available in this view. Copy the text and keep it somewhere safe.'), ta, h('button', { class: 'btn primary', onclick: async () => { try { await navigator.clipboard.writeText(data); toast('Copied'); } catch (e) { ta.select(); toast('Select all and copy'); } } }, 'Copy to clipboard')); }, { full: true });
  }
  function render(root) {
    const s = Store.settings;
    const sw = (label, key, desc) => h('div', { class: 'switch' }, h('div', { class: 'stack', style: 'gap:0' }, h('span', {}, label), desc ? h('span', { class: 'small dim' }, desc) : null), h('button', { class: 'toggle' + (s[key] ? ' on' : ''), role: 'switch', 'aria-checked': s[key] ? 'true' : 'false', 'aria-label': label, onclick: () => { s[key] = !s[key]; Store.touch(); } }));
    root.append(h('div', { class: 'hero' }, h('span', { class: 'eyebrow' }, 'Settings'), h('h1', {}, 'Training setup')));
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Logging'),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, 'Weight step'), h('select', { onchange: e => { s.weightStep = +e.target.value; Store.touch(); } }, ...[1, 1.25, 2.5, 5].map(v => h('option', { value: v, selected: s.weightStep === v }, v + ' kg')))), h('label', { class: 'field grow' }, h('span', {}, 'Volume warning (sets/muscle/week)'), h('input', { type: 'number', value: s.volumeWarn || 20, min: 8, max: 40, onchange: e => { s.volumeWarn = +e.target.value; Store.touch(); } }))),
      sw('Start rest timer when a set is ticked', 'autoRest'), sw('Keep the screen awake during a workout', 'keepAwake'), sw('Let Ask My Coach use Claude for commands it cannot read itself', 'coachAI', 'Uses your own Claude account; you are asked once before the first call.')));
    const avail = new Set(s.equipAvail || Object.keys(EX.EQUIP));
    root.append(h('div', { class: 'card' }, h('h3', {}, 'My gym equipment'), h('span', { class: 'small dim' }, 'Used as a filter in the exercise picker.'), h('div', { class: 'row wrap', style: 'gap:6px' }, ...Object.entries(EX.EQUIP).map(([k, v]) => h('button', { class: 'chip' + (avail.has(k) ? ' on' : ''), 'aria-pressed': avail.has(k) ? 'true' : 'false', onclick: () => { avail.has(k) ? avail.delete(k) : avail.add(k); s.equipAvail = [...avail]; Store.touch(); } }, v)))));
    const u = Store.config.undo.slice().reverse();
    root.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', {}, 'Programme changes'), Store.config.undo.length ? h('button', { class: 'btn sm', onclick: App.doUndo }, icon('undo'), 'Undo last') : null),
      u.length ? h('ul', { class: 'clean muted small' }, ...u.slice(0, 8).map(x => h('li', {}, x.label + ' · ' + new Date(x.at).toLocaleString()))) : h('span', { class: 'small dim' }, 'No changes yet. Each programme edit can be undone from here or the top bar.')));
    const stateLabel = { local: window.FORGE_STANDALONE ? 'Saved on this device. Use Backup (JSON) to move your log to another phone.' : 'Saved in this browser only. Open the page signed in to sync across devices.', syncing: 'Syncing with your account…', synced: 'Synced with your account. Open the same link on any device.', error: 'Sync failed; your data is safe in this browser and will retry.', readonly: 'This view cannot write to the shared store (viewer access). Data stays in this browser.' }[Store.dbState];
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Data'), h('div', { class: 'row' }, h('span', { class: 'sync ' + Store.dbState }, h('i')), h('span', { class: 'small muted' }, stateLabel)),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn sm', onclick: () => saveFile('forge-backup-' + Dates.today() + '.json', Store.exportJSON()) }, 'Backup (JSON)'), h('button', { class: 'btn sm', onclick: () => saveFile('forge-history-' + Dates.today() + '.csv', Store.exportCSV()) }, 'Export history (CSV)'), h('button', { class: 'btn sm', onclick: restoreSheet }, 'Restore'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmSheet({ title: 'Reset everything?', text: 'Deletes the programme, settings and all logged workouts on this account. Back up first.', ok: 'Reset all data', danger: true }) && await confirmSheet({ title: 'Really reset?', text: 'This cannot be undone.', ok: 'Yes, reset', danger: true })) { Store.resetAll(); Sched.invalidate(); toast('Reset to the default programme'); } } }, 'Reset'))));
    if (window.FORGE_STANDALONE) {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
      root.append(h('div', { class: 'card' }, h('h3', {}, 'Install'),
        standalone ? h('span', { class: 'small muted' }, 'Installed on this device. Updates arrive automatically when the page reloads with a connection.')
          : window.__installPrompt ? h('button', { class: 'btn primary', onclick: async () => { const e = window.__installPrompt; window.__installPrompt = null; e.prompt(); await e.userChoice; App.render(); } }, 'Install on this phone')
          : h('span', { class: 'small muted' }, ios ? 'In Safari: tap Share, then "Add to Home Screen". It then opens full-screen and works offline.' : 'In your browser menu choose "Add to Home screen" or "Install app". It then opens full-screen and works offline.')));
    }
    root.append(h('div', { class: 'card' }, h('h3', {}, 'About'), h('p', { class: 'small muted', style: 'margin:0' }, 'Forge is a single-page training app. Demonstrations are schematic animations drawn by the app from each exercise\'s movement data, not video of real people. Estimated 1RM uses the Epley formula: weight × (1 + reps ÷ 30).')));
  }
  function restoreSheet() {
    Sheet.open((el, api) => {
      const ta = h('textarea', { placeholder: 'Paste a backup JSON here, or choose a file below', style: 'min-height:120px;font-size:12px' }); let mode = 'merge';
      const file = h('input', { type: 'file', accept: '.json,application/json', onchange: e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { ta.value = r.result; }; r.readAsText(f); } });
      el.append(Sheet.head('Restore backup', api), file, ta, h('div', { class: 'row' }, h('button', { class: 'chip' + (mode === 'merge' ? ' on' : ''), onclick: e => { mode = 'merge'; api.rerender(); } }, 'Merge'), h('button', { class: 'chip' + (mode === 'replace' ? ' on' : ''), onclick: () => { mode = 'replace'; api.rerender(); } }, 'Replace everything')),
        h('button', { class: 'btn primary', onclick: async () => { try { if (mode === 'replace' && !await confirmSheet({ title: 'Replace all current data?', ok: 'Replace', danger: true })) return; Store.importJSON(ta.value, mode); Sched.invalidate(); api.close(); toast('Restored'); } catch (e) { toast('Could not read that backup: ' + e.message); } } }, 'Restore'));
    });
  }
  return { render };
})();

/* ---- Ask My Coach UI ---- */
const CoachUI = (() => {
  let sample = null, probing = false;
  const EXAMPLES = ['Change Monday to chest and biceps', 'Give me five chest exercises instead of four', 'Replace barbell bench press with dumbbell bench press', 'Change all triceps exercises to 12 reps', 'Make tomorrow a leg day', 'Add calves to my leg workout', 'Change the programme to a five-day split', 'Make all exercises four sets of eight reps', 'Put my compound exercises before my isolation exercises', 'Switch this week to dumbbells', 'Add 20 minutes of StairMaster to every workout', 'Change my abs routine to three exercises', 'Make Fridays recovery days', 'Give me more upper-chest exercises', 'Rebuild the programme with an emphasis on shoulder growth', 'Increase bench press to 85 kg'];
  async function init() { if (probing) return; probing = true; try { if (window.claude && window.claude.use) sample = await window.claude.use('sample'); } catch (e) { sample = null; } }
  function open(ctx = {}) {
    const today = Dates.today(); let text = '', state = { phase: 'idle' }; let ctl = null;
    Sheet.open((el, api) => {
      const ta = h('textarea', { value: text, placeholder: 'Tell me what to change, in plain English…', oninput: e => text = e.target.value, style: 'min-height:70px' });
      const status = h('div', { class: 'small dim' });
      const out = h('div', { class: 'stack' });
      const shown = EXAMPLES.slice().sort(() => Math.random() - .5).slice(0, 6);
      el.append(Sheet.head('Ask my coach', api, Store.config.undo.length ? h('button', { class: 'btn xs', onclick: () => { App.doUndo(); api.rerender(); } }, icon('undo'), 'Undo') : null),
        h('p', { class: 'muted small', style: 'margin:0' }, 'Describe a change to your programme or today\'s workout. You see a preview before anything is applied, and every change can be undone.'),
        ta, h('div', { class: 'coach-ex' }, ...shown.map(x => h('button', { class: 'chip', onclick: () => { text = x; ta.value = x; } }, x))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary grow', onclick: () => run() }, icon('coach'), 'Preview change'), state.phase === 'thinking' ? h('button', { class: 'btn', onclick: () => ctl && ctl.abort() }, 'Stop') : null),
        status, out);
      status.textContent = sample && Store.settings.coachAI ? 'Common instructions are read instantly; anything else is interpreted by Claude on your account.' : window.FORGE_STANDALONE ? 'Built-in interpreter: use phrasings like the examples (exercise names and muscle groups as they appear in the library).' : 'Built-in interpreter. Claude is not available in this view, so stick to the example phrasings or ask Claude in the chat where this app lives.';
      async function run() {
        if (!text.trim()) return; const c = { today, exerciseId: ctx.exerciseId, inUse: (Store.workouts[today] || { entries: [] }).entries.map(e => e.ex) };
        out.replaceChildren(); let res = Coach.parse(text, c); let note = null; let claudeUsed = false; let question = null;
        if (res.unknown.length && sample && Store.settings.coachAI) {
          state.phase = 'thinking'; out.replaceChildren(h('div', { class: 'preview' }, h('span', { class: 'muted' }, 'Thinking… (asking Claude to read: "' + res.unknown.join('; ') + '")'))); ctl = new AbortController();
          try {
            const r = await sample.json(Coach.claudePrompt(text, c), { modelTier: 'default', signal: ctl.signal, cache: false });
            claudeUsed = true;
            if (r && r.question) question = r.question;
            else if (r && Array.isArray(r.ops)) { const ops = Coach.validate(r.ops); if (ops.length) { res = { ops, unknown: [], scope: r.scope === 'today' ? 'today' : r.scope === 'date' ? 'date' : 'program', date: r.date || null, effectiveFrom: null }; note = r.note; } }
          } catch (e) { const code = e && e.code; question = code === 'cancelled' ? null : code === 'not_granted' || code === 'sampling_disabled' ? 'Claude is not allowed for this page, so only the built-in phrasings work.' : code === 'rate_limited' ? 'Claude is busy or your usage limit is reached. Try again in a moment.' : code === 'invalid_json' ? 'Claude\'s answer could not be read. Try rewording.' : 'Claude could not be reached: ' + (e && e.message ? e.message : code || 'unknown error') + '.'; }
          state.phase = 'idle';
        }
        if (!res.ops.length) { out.replaceChildren(h('div', { class: 'preview' }, h('b', {}, question ? 'A question first' : 'I could not read that'), h('p', { class: 'muted small', style: 'margin:6px 0 0' }, question || ('Not understood: "' + res.unknown.join('; ') + '". Try one of the example phrasings, or name the exercise or muscle group exactly.')))); return; }
        let scope = res.scope === 'from' ? 'program' : res.scope;
        if (!scope) scope = Coach.touchesToday(res.ops, c) ? null : 'program';
        const show = (sc) => {
          const changes = Coach.preview(res.ops, sc, { ...c, date: res.date });
          const warn = changes.filter(x => x.startsWith('⚠')), good = changes.filter(x => !x.startsWith('⚠'));
          out.replaceChildren(h('div', { class: 'preview' }, h('div', { class: 'row between' }, h('b', {}, 'Preview'), h('span', { class: 'chip ' + (sc === 'today' ? 'warn' : sc === 'date' ? '' : 'on') }, sc === 'today' ? 'Today only' : sc === 'date' ? Dates.fmt(res.date || today, 'short') : 'Permanent programme')),
            note ? h('p', { class: 'small muted', style: 'margin:4px 0 0' }, note) : null, res.effectiveFrom ? h('p', { class: 'small muted', style: 'margin:4px 0 0' }, 'Applies from ' + Dates.fmt(res.effectiveFrom) + '; days before keep the current plan.') : null,
            h('ul', { class: 'clean', style: 'margin-top:6px' }, ...good.map(x => h('li', {}, x)), ...warn.map(x => h('li', { style: 'color:var(--warn)' }, x))),
            res.unknown.length ? h('p', { class: 'small dim', style: 'margin:6px 0 0' }, 'Skipped (not understood): ' + res.unknown.join('; ')) : null,
            claudeUsed ? h('p', { class: 'small dim', style: 'margin:6px 0 0' }, 'Interpreted by Claude.') : null,
            h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn grow', onclick: () => out.replaceChildren() }, 'Cancel'), good.length ? h('button', { class: 'btn primary grow', onclick: () => { const ch = Coach.commit(res.ops, sc, { ...c, date: res.date, effectiveFrom: res.effectiveFrom }, text.slice(0, 60)); out.replaceChildren(h('div', { class: 'preview' }, h('div', { class: 'row between' }, h('b', {}, 'Applied'), h('span', { class: 'chip lime' }, 'Done')), h('ul', { class: 'clean', style: 'margin-top:6px' }, ...ch.map(x => h('li', {}, x))), h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn grow', onclick: () => { App.doUndo(); out.replaceChildren(h('div', { class: 'preview' }, 'Undone.')); } }, icon('undo'), 'Undo'), h('button', { class: 'btn primary grow', onclick: () => { api.close(); App.render(); } }, 'Close')))); text = ''; ta.value = ''; } }, 'Apply') : null)));
        };
        if (scope) show(scope);
        else out.replaceChildren(h('div', { class: 'preview' }, h('b', {}, 'Where should this apply?'), h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, 'This change affects today\'s session. Apply it to today only, or to the programme permanently?'), h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => show('today') }, 'Just today'), h('button', { class: 'btn grow primary', onclick: () => show('program') }, 'Permanently'))));
      }
    });
  }
  return { init, open };
})();
