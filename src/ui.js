/* ===== UI core: DOM helpers, sheets, toasts, rest timer, Today screen ===== */
const h = (tag, attrs, ...kids) => {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k]; if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v; else if (k === 'value') el.value = v; else if (k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = v; else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  return el;
};
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM5 16l.8 2 2 .8-2 .8L5 21.5l-.8-1.9-2-.8 2-.8zM19 14l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h2M20 12h2M6 8v8M18 8v8M9 6v12M15 6v12M9 12h6"/></svg>',
  prog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h3M14 13h3M7 17h3"/></svg>',
  lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};
const icon = (n, cls) => h('span', { class: 'ic ' + (cls || ''), html: ICON[n], style: 'display:inline-flex;width:20px;height:20px;flex:none' });
const fmtKg = v => v == null || v === '' ? '—' : (Math.round(v * 100) / 100) + ' kg';
const fmtSecs = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return m + ':' + String(r).padStart(2, '0'); };
const fmtDur = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };

/* ---- sheets, toasts, confirm ---- */
const Sheet = (() => {
  const stack = [];
  function open(build, opts = {}) {
    const sheet = h('div', { class: 'sheet' + (opts.full ? ' full' : ''), role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grab' }));
    const back = h('div', { class: 'sheet-back', onclick: e => { if (e.target === back) api.close(); } }, sheet);
    const api = { el: sheet, close() { if (!back.isConnected) return; back.remove(); stack.splice(stack.indexOf(api), 1); if (opts.onClose) opts.onClose(); if (api.cleanup) api.cleanup(); }, rerender() { sheet.replaceChildren(h('div', { class: 'grab' })); build(sheet, api); } };
    build(sheet, api); document.body.appendChild(back); stack.push(api);
    sheet.focus && sheet.setAttribute('tabindex', '-1');
    return api;
  }
  function head(title, api, extra) { return h('div', { class: 'sheet-head' }, h('h2', {}, title), extra, h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: () => api.close() }, icon('close'))); }
  function closeAll() { while (stack.length) stack[stack.length - 1].close(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
  return { open, head, closeAll, get depth() { return stack.length; } };
})();
let toastEl = null, toastTimer = null;
function toast(msg, opts = {}) {
  if (toastEl) toastEl.remove(); clearTimeout(toastTimer);
  toastEl = h('div', { class: 'toast', role: 'status' }, h('span', {}, msg), opts.action ? h('button', { class: 'btn xs', onclick: () => { opts.action.fn(); toastEl.remove(); } }, opts.action.label) : null);
  document.body.appendChild(toastEl); toastTimer = setTimeout(() => toastEl && toastEl.remove(), opts.ms || (opts.action ? 6000 : 2600));
}
function confirmSheet({ title, text, ok = 'Confirm', danger = false, cancel = 'Cancel' }) {
  return new Promise(res => {
    Sheet.open((el, api) => {
      el.append(Sheet.head(title, api), text ? h('p', { class: 'muted', style: 'margin:0' }, text) : null,
        h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => { api.close(); } }, cancel), h('button', { class: 'btn grow ' + (danger ? 'danger' : 'primary'), onclick: () => { res(true); api.done = true; api.close(); } }, ok)));
    }, { onClose() { res(false); } });
  });
}

/* ---- rest timer ---- */
const Timer = (() => {
  let total = 0, end = 0, running = false, el = null, iv = null, over = false, ctx = null;
  function beep() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = .0001; o.connect(g); g.connect(ctx.destination); const t = ctx.currentTime; g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .5); o.start(t); o.stop(t + .55); } catch (e) { } }
  function prime() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { } }
  function start(secs) { prime(); total = secs; end = Date.now() + secs * 1000; running = true; over = false; render(); clearInterval(iv); iv = setInterval(tick, 250); document.querySelector('.fab') && document.querySelector('.fab').classList.add('lifted'); }
  function stop() { running = false; clearInterval(iv); if (el) { el.remove(); el = null; } document.querySelector('.fab') && document.querySelector('.fab').classList.remove('lifted'); }
  function tick() { const left = (end - Date.now()) / 1000; if (left <= 0 && !over) { over = true; beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); setTimeout(() => { if (over) stop(); }, 20000); } render(); }
  function render() {
    if (!running) return; const left = Math.max(0, (end - Date.now()) / 1000);
    if (!el) { el = h('div', { class: 'rest', role: 'timer', 'aria-live': 'off' }, h('div', {})); document.body.appendChild(el); }
    el.classList.toggle('over', over);
    el.firstChild.replaceChildren(
      h('div', { class: 'stack', style: 'gap:2px' }, h('span', { class: 'eyebrow' }, over ? 'Rest done' : 'Rest'), h('span', { class: 't' }, over ? 'GO' : fmtSecs(left))),
      h('div', { class: 'bar grow' + (over ? ' lime' : '') }, h('i', { style: `width:${over ? 100 : Math.round(100 - left / total * 100)}%` })),
      h('button', { class: 'btn sm', onclick: () => { end -= 15000; total = Math.max(15, total - 15); render(); } }, '−15'),
      h('button', { class: 'btn sm', onclick: () => { end += 15000; total += 15; over = false; render(); } }, '+15'),
      h('button', { class: 'btn sm primary', onclick: stop }, 'Skip'));
  }
  return { start, stop, prime, get running() { return running; } };
})();

/* ---- thumbnails / demo mounting ---- */
const mounted = new Set();
function thumb(ex, cls) { const t = h('div', { class: 'thumb ' + (cls || '') }); const e = demoFor(ex); if (e) { const a = Rig.mount(t, e, { size: 'thumb', autoplay: true }); if (a) mounted.add(a); } else t.appendChild(h('span', { class: 'dim', style: 'font-size:22px' }, '?')); return t; }
function demoFor(ex) { if (!ex) return null; if (ex.demo) return ex; if (ex.demoFrom) { const src = EX.byId[ex.demoFrom]; if (src) return { ...src, name: ex.name, group: ex.group }; } return null; }
function clearMounted() { for (const a of mounted) a.destroy(); mounted.clear(); }

/* ---- App shell ---- */
const App = (() => {
  let tab = 'today'; const viewEl = h('main', { class: 'view', id: 'view' }); const navEl = h('nav', { class: 'nav', 'aria-label': 'Sections' });
  const tabs = [['today', 'Today', 'today'], ['programme', 'Programme', 'prog'], ['library', 'Library', 'lib'], ['progress', 'Progress', 'chart'], ['settings', 'Settings', 'gear']];
  const topbar = h('header', { class: 'topbar' });
  let fab;
  function setTab(t) { tab = t; try { location.hash = t; } catch (e) { } render(false); window.scrollTo(0, 0); }
  function renderNav() { navEl.replaceChildren(...tabs.map(([id, label, ic]) => h('button', { class: id === tab ? 'on' : '', 'aria-current': id === tab ? 'page' : null, onclick: () => setTab(id) }, h('span', { html: ICON[ic], style: 'display:inline-flex;width:24px;height:24px' }), label))); }
  function syncBadge() { const s = Store.dbState; const labels = { local: 'Saved on this device', syncing: 'Syncing', synced: 'Synced to your account', error: 'Sync error, saved locally', readonly: 'Read-only here, saved locally' }; return h('span', { class: 'sync ' + s, title: labels[s] }, h('i'), labels[s]); }
  function renderTop() {
    topbar.replaceChildren(...[h('span', { class: 'brand' }, 'Forge'), h('span', { class: 'spacer' }), syncBadge(),
      Store.config.undo.length ? h('button', { class: 'iconbtn', title: 'Undo: ' + Store.config.undo[Store.config.undo.length - 1].label, 'aria-label': 'Undo last programme change', onclick: doUndo }, icon('undo')) : null].filter(Boolean));
  }
  function doUndo() { const l = Store.undo(); Sched.invalidate(); Coach.refreshPlanned(); if (l) toast('Undone: ' + l); }
  function render(keepScroll = true) {
    const y = window.scrollY; clearMounted(); renderTop(); renderNav();
    const root = h('div', { class: 'stack', style: 'gap:14px' });
    try { ({ today: Today.render, programme: Programme.render, library: Library.render, progress: Progress.render, settings: Settings.render })[tab](root); }
    catch (e) { console.error(e); root.append(h('div', { class: 'card' }, h('b', {}, 'Something went wrong drawing this screen'), h('span', { class: 'small muted' }, String(e && e.message || e)), h('button', { class: 'btn sm', onclick: () => render() }, 'Try again'))); }
    viewEl.replaceChildren(root); if (keepScroll) requestAnimationFrame(() => window.scrollTo(0, y));
  }
  function boot() {
    const hash = (location.hash || '').replace('#', ''); if (tabs.some(t => t[0] === hash)) tab = hash;
    fab = h('button', { class: 'fab', 'aria-label': 'Ask my coach', onclick: () => CoachUI.open({}) }, icon('coach'), 'Coach');
    document.getElementById('app').append(topbar, viewEl, navEl, fab);
    Log.ensure(Dates.today()); render();
    Store.subscribe(() => { if (!Sheet.depth) render(); else renderTop(); });
    Store.connect(); CoachUI.init();
    setInterval(() => { const d = document.getElementById('dur'); if (d && d.dataset.start) d.textContent = fmtDur(Date.now() - +d.dataset.start); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { Log.ensure(Dates.today()); if (!Sheet.depth) render(); } });
  }
  return { boot, render, setTab, get tab() { return tab; }, doUndo };
})();

/* ---- Today ---- */
const Today = (() => {
  let wake = null;
  async function keepAwake() { try { if (Store.settings.keepAwake && navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { } }
  function render(root) {
    const date = Dates.today(); const r = Sched.resolve(date);
    const em = r.emphasis ? h('span', { class: 'chip on' }, cap(r.emphasis) + ' week') : null;
    if (r.kind !== 'session') {
      root.append(h('div', { class: 'hero' }, h('span', { class: 'eyebrow' }, Dates.fmt(date)), h('h1', {}, r.kind === 'rest' ? 'Rest day' : r.kind === 'paused' ? 'Programme paused' : r.kind === 'before' ? 'Starts ' + Dates.fmt(Store.settings.startDate, 'short') : 'No programme')));
      const next = Sched.upcoming(Dates.addDays(date, 1), 3);
      root.append(h('div', { class: 'card' },
        h('p', { class: 'muted', style: 'margin:0' }, r.kind === 'rest' ? 'Recovery is part of the plan. Next up:' : r.kind === 'paused' ? 'Resume from Programme when you are ready.' : 'Your first session is scheduled below.'),
        h('div', { class: 'list' }, ...next.map(n => h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 't' }, n.name), h('div', { class: 's' }, Dates.fmt(n.date, 'short') + ' · ' + n.slots.length + ' exercises'))))),
        r.kind === 'rest' || r.kind === 'before' ? h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => Programme.pickSessionFor(date) }, r.kind === 'before' ? 'Start today instead' : 'Train anyway'), h('button', { class: 'btn ghost', onclick: () => App.setTab('programme') }, 'Open calendar')) : null));
      return;
    }
    const w = Log.refresh(date) || Log.ensure(date); const st = Log.stats(w);
    if (w.startedAt && w.status !== 'done') keepAwake();
    root.append(h('div', { class: 'hero' },
      h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, Dates.fmt(date)), h('span', { class: 'dim small num', id: 'dur', 'data-start': w.startedAt && w.status !== 'done' ? w.startedAt : null }, w.status === 'done' ? 'Done in ' + fmtDur((w.finishedAt || 0) - (w.startedAt || w.finishedAt)) : w.startedAt ? fmtDur(Date.now() - w.startedAt) : 'Not started')),
      h('h1', {}, w.name),
      h('div', { class: 'row wrap', style: 'gap:6px' }, ...w.groups.map(g => h('span', { class: 'chip' }, Lib.groupLabel(g))), em, w.deload ? h('span', { class: 'chip warn' }, 'Deload') : null, r.override ? h('span', { class: 'chip' }, 'Changed for today') : null),
      h('div', { class: 'row' }, h('div', { class: 'bar grow' + (st.pct === 100 ? ' lime' : '') }, h('i', { style: 'width:' + st.pct + '%' })), h('span', { class: 'small num muted' }, st.done + '/' + st.total + ' · ' + st.pct + '%'))));
    if (w.deload) root.append(h('div', { class: 'card', style: 'border-color:var(--warn)' }, h('b', {}, 'Deload week'), h('span', { class: 'muted small' }, 'One set fewer per exercise. Keep the weights, stop two or three reps short of failure, and let the joints recover.')));
    const warn = volumeWarning(date); if (warn) root.append(warn);
    const cardio = w.cardio ? cardioCard(w, date) : null;
    if (cardio && w.cardio.position === 'before') root.append(cardio);
    if (w.core && w.core.length && w.corePosition === 'before') root.append(coreCard(w, date));
    w.entries.forEach((en, i) => root.append(exerciseCard(w, en, i, date, 'entries')));
    if (w.core && w.core.length && w.corePosition !== 'before') root.append(coreCard(w, date));
    if (cardio && w.cardio.position !== 'before') root.append(cardio);
    root.append(h('div', { class: 'row wrap' },
      h('button', { class: 'btn ghost', onclick: () => ExercisePicker.open({ title: 'Add an exercise to today', onPick: ex => { w.entries.push(Log.entryFromSlot(Gen.slot(ex), ex.id, date)); Store.touchWorkout(date); } }) }, icon('plus'), 'Add exercise'),
      h('button', { class: 'btn ghost', onclick: () => editNotes(w, date) }, w.notes ? 'Edit notes' : 'Add notes')));
    if (w.notes) root.append(h('div', { class: 'card' }, h('span', { class: 'eyebrow' }, 'Notes'), h('div', { style: 'white-space:pre-wrap' }, w.notes)));
    root.append(w.status === 'done'
      ? h('div', { class: 'card' }, h('div', { class: 'row between' }, h('b', {}, 'Workout saved'), h('button', { class: 'btn sm', onclick: () => { w.status = 'in_progress'; w.finishedAt = null; Store.touchWorkout(date); } }, 'Reopen')), h('button', { class: 'btn', onclick: () => summarySheet(w) }, 'View summary'))
      : h('button', { class: 'btn primary block', style: 'min-height:52px;font-size:17px', onclick: () => finish(w, date) }, st.pct === 100 ? 'Finish workout' : 'Finish workout (' + st.pct + '% done)'));
  }
  function volumeWarning(date) {
    const planned = Stats.plannedWeek(date); const lim = Store.settings.volumeWarn || 20; const hot = Object.entries(planned).filter(([g, n]) => n > lim);
    if (!hot.length) return null;
    return h('div', { class: 'card', style: 'border-color:var(--warn)' }, h('div', { class: 'row' }, h('span', { class: 'chip warn' }, 'Volume check'), h('span', { class: 'small muted' }, 'Over ' + lim + ' working sets in 7 days: ' + hot.map(([g, n]) => Lib.groupLabel(g) + ' ' + n).join(', ') + '. Fine occasionally; if recovery slips, trim a set or two.')));
  }
  function prevLine(en, date) {
    const last = Stats.lastPerformance(en.ex, date); const ex = Lib.get(en.ex); if (!last) return h('div', { class: 'ex-prev' }, 'First time logging this');
    const pr = Stats.prs(en.ex);
    const txt = ex && ex.timed ? last.sets.map(s => s.secs + 's').join(', ') : last.sets.map(s => (s.w != null ? s.w : '—') + '×' + (s.r != null ? s.r : '—')).join(', ');
    return h('div', { class: 'ex-prev' }, 'Last ', h('b', {}, Dates.fmt(last.date, 'day')), ': ', h('b', { class: 'num' }, txt), pr.best ? h('span', {}, ' · PR ', h('b', { class: 'num' }, pr.top + ' kg / e1RM ' + Math.round(pr.best))) : null);
  }
  function exerciseCard(w, en, idx, date, list) {
    const ex = Lib.get(en.ex) || { name: en.ex, group: '', timed: false }; const locked = w.status === 'done';
    const card = h('div', { class: 'card ex' });
    card.append(h('div', { class: 'ex-head' },
      h('button', { class: 'thumb', 'aria-label': 'Show ' + ex.name + ' demonstration', onclick: () => DemoSheet.open(ex, { entry: en, date }), style: 'padding:0;cursor:pointer' }, (() => { const t = thumb(ex); return t.firstChild || t; })()),
      h('div', { class: 'grow' }, h('div', { class: 'ex-title' }, ex.name), h('div', { class: 'ex-meta' }, [Lib.groupLabel(ex.group), ex.equip ? EX.EQUIP[ex.equip] : null, en.sets.length + ' × ' + (ex.timed ? en.repMin + '–' + en.repMax + 's' : en.repMin + '–' + en.repMax) + ' · rest ' + fmtSecs(en.rest), en.tempo ? 'tempo ' + en.tempo : null].filter(Boolean).join(' · ')), prevLine(en, date))));
    if (en.warmup && !locked) card.append(h('div', { class: 'warmup' }, `Warm-up: ${en.warmup} light set${en.warmup > 1 ? 's' : ''} of 8–10 at about half the working weight before set 1.`));
    const sug = !locked && !ex.timed ? Stats.suggest(en, date) : null;
    if (sug && !en.sets.some(s => s.done)) card.append(h('div', { class: 'suggest' }, h('span', { class: 'grow' }, h('b', {}, 'Progress: '), sug.reason + '. Try ', h('b', { class: 'num' }, fmtKg(sug.to)), ' (+' + sug.inc + ').'), h('button', { class: 'btn xs primary', onclick: () => { en.sets.forEach(s => { if (!s.done) s.w = sug.to; }); Store.touchWorkout(date); toast('Loaded ' + fmtKg(sug.to)); } }, 'Use it')));
    const tbl = h('table', { class: 'sets' });
    tbl.append(h('thead', {}, h('tr', {}, h('th', { class: 'n' }, 'Set'), ex.timed ? h('th', {}, 'Seconds') : h('th', {}, 'kg'), ex.timed ? null : h('th', {}, 'Reps'), ex.timed ? null : h('th', { style: 'width:72px' }, 'RIR'), h('th', { class: 'ck' }, 'Done'))));
    const tb = h('tbody');
    en.sets.forEach((s, i) => {
      const tr = h('tr', { class: s.done ? 'done' : '' });
      const inp = (k, step, ph) => h('input', { type: 'number', inputmode: 'decimal', step, min: 0, value: s[k] == null ? '' : s[k], placeholder: ph, disabled: locked, 'aria-label': `Set ${i + 1} ${k}`, oninput: e => { s[k] = e.target.value === '' ? null : +e.target.value; Store.touchWorkout(date, { silent: true }); } });
      tr.append(h('td', { class: 'n' }, i + 1));
      if (ex.timed) tr.append(h('td', {}, inp('secs', 5, 's'))); else tr.append(h('td', {}, inp('w', Store.settings.weightStep || 2.5, 'kg')), h('td', {}, inp('r', 1, 'reps')),
        h('td', {}, h('select', { disabled: locked, 'aria-label': 'Reps in reserve', onchange: e => { s.rir = +e.target.value; Store.touchWorkout(date, { silent: true }); } }, ...[0, 1, 2, 3, 4].map(v => h('option', { value: v, selected: (s.rir == null ? 2 : s.rir) === v }, v)))));
      tr.append(h('td', { class: 'ck' }, h('button', { class: 'check' + (s.done ? ' on' : ''), 'aria-label': s.done ? 'Mark set not done' : 'Mark set done', 'aria-pressed': s.done ? 'true' : 'false', disabled: locked, onclick: () => toggleSet(w, en, s, date) }, icon('check'))));
      tb.append(tr);
    });
    tbl.append(tb); card.append(h('div', { style: 'padding:0 8px' }, tbl));
    const nextIdx = en.sets.findIndex(s => !s.done);
    card.append(h('div', { class: 'ex-foot' },
      !locked && nextIdx >= 0 ? h('button', { class: 'btn primary', style: 'flex:2', onclick: () => toggleSet(w, en, en.sets[nextIdx], date) }, 'Complete set ' + (nextIdx + 1)) : null,
      !locked ? h('button', { class: 'btn sm', 'aria-label': 'Add a set', onclick: () => { const l = en.sets[en.sets.length - 1]; en.sets.push({ ...clone(l || { w: null, r: en.repMax, rir: 2 }), done: false }); Store.touchWorkout(date); } }, icon('plus'), 'Set') : null,
      h('button', { class: 'btn sm', onclick: () => DemoSheet.open(ex, { entry: en, date }) }, 'Demo'),
      !locked ? h('button', { class: 'btn sm', onclick: () => EntryEditor.open(w, en, date, list) }, 'Edit') : null,
      !locked ? h('button', { class: 'btn sm', onclick: () => replaceEntry(w, en, date, list) }, 'Replace') : null));
    return card;
  }
  function toggleSet(w, en, s, date) {
    s.done = !s.done;
    if (s.done) { if (!w.startedAt) w.startedAt = Date.now(); if (w.status === 'planned') w.status = 'in_progress'; if (Store.settings.autoRest && en.rest) Timer.start(en.rest); keepAwake(); if (s.w == null && !Lib.get(en.ex)?.timed) { const prev = en.sets.find(x => x.done && x.w != null); if (prev) s.w = prev.w; } }
    Store.touchWorkout(date);
  }
  function replaceEntry(w, en, date, list) {
    const ex = Lib.get(en.ex);
    ExercisePicker.open({ title: 'Replace ' + (ex ? ex.name : ''), group: ex ? ex.group : null, exclude: w.entries.map(e => e.ex), current: en.ex, showProgramme: !!en.slotId, onPick: (nx, opts) => {
      const kept = en.sets.filter(s => s.done); const last = Stats.lastPerformance(nx.id, date);
      const fresh = Log.entryFromSlot({ id: en.slotId, sets: en.sets.length, repMin: en.repMin, repMax: en.repMax, rest: en.rest, rir: en.rir, warmup: en.warmup }, nx.id, date);
      if (kept.length) { en.history = en.history || []; en.history.push({ ex: en.ex, sets: kept }); }
      en.ex = nx.id; en.sets = fresh.sets; en.note = ''; void last;
      if (opts.programme && en.slotId) { Store.pushUndo('Replace ' + (ex ? ex.name : '') + ' with ' + nx.name); for (const ss of Object.values(Store.program.sessions)) for (const sl of ss.slots) if (sl.id === en.slotId) { sl.ex = nx.id; sl.variants = Gen.variants(nx); } Sched.invalidate(); Store.touch({ silent: true }); }
      Store.touchWorkout(date); toast('Replaced with ' + nx.name + (opts.programme ? ' (programme updated)' : ' (today only)'));
    } });
  }
  function cardioCard(w, date) {
    const c = w.cardio; const act = EX.CARDIO.find(a => a.id === c.activity) || EX.CARDIO[1]; const locked = w.status === 'done';
    const fld = (k, label, type = 'number') => h('label', { class: 'field grow' }, h('span', {}, label), h('input', { type, inputmode: type === 'number' ? 'decimal' : 'text', value: c[k] == null ? '' : c[k], disabled: locked, oninput: e => { c[k] = type === 'number' ? (e.target.value === '' ? null : +e.target.value) : e.target.value; Store.touchWorkout(date, { silent: true }); } }));
    const labels = { distance: 'Distance (km)', pace: 'Pace (min/km)', hr: 'Avg HR', incline: 'Incline %', speed: 'Speed km/h', level: 'Level', floors: 'Floors', watts: 'Avg watts', split: 'Split /500m' };
    return h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('div', {}, h('span', { class: 'eyebrow' }, 'Cardio · ' + (c.position === 'before' ? 'before lifting' : 'after lifting')), h('h3', {}, act.label)), h('button', { class: 'check' + (c.done ? ' on' : ''), 'aria-label': 'Mark cardio done', disabled: locked, onclick: () => { c.done = !c.done; if (c.done && !w.startedAt) w.startedAt = Date.now(); Store.touchWorkout(date); } }, icon('check'))),
      h('div', { class: 'row' }, h('label', { class: 'field', style: 'width:110px' }, h('span', {}, 'Activity'), h('select', { disabled: locked, onchange: e => { c.activity = e.target.value; Store.touchWorkout(date); } }, ...EX.CARDIO.map(a => h('option', { value: a.id, selected: a.id === c.activity }, a.label)))), fld('minutes', 'Minutes')),
      h('div', { class: 'row' }, ...act.fields.map(f => fld(f, labels[f] || f, f === 'pace' || f === 'split' ? 'text' : 'number'))));
  }
  function coreCard(w, date) {
    const wrap = h('div', { class: 'stack', style: 'gap:10px' }, h('div', { class: 'section-title' }, h('h3', {}, 'Core'), h('span', { class: 'small dim' }, w.core.length + ' exercises')));
    w.core.forEach((en, i) => wrap.append(exerciseCard(w, en, i, date, 'core')));
    return wrap;
  }
  function editNotes(w, date) {
    Sheet.open((el, api) => { const ta = h('textarea', { value: w.notes || '', placeholder: 'How did it go? Energy, sleep, anything to remember next time.' }); el.append(Sheet.head('Workout notes', api), ta, h('button', { class: 'btn primary', onclick: () => { w.notes = ta.value; Store.touchWorkout(date); api.close(); } }, 'Save')); });
  }
  async function finish(w, date) {
    const st = Log.stats(w);
    if (st.pct < 100 && !await confirmSheet({ title: 'Finish with ' + st.pct + '% done?', text: 'Unfinished sets stay unticked and will not count toward volume or PRs.', ok: 'Finish anyway' })) return;
    if (!w.startedAt) w.startedAt = Date.now() - 1000; w.finishedAt = Date.now(); w.status = 'done'; Timer.stop(); Store.touchWorkout(date);
    summarySheet(w);
  }
  function summarySheet(w) {
    const prs = []; const next = [];
    for (const en of [...(w.entries || []), ...(w.core || [])]) {
      const ex = Lib.get(en.ex); if (!ex || ex.timed) continue; const done = en.sets.filter(s => s.done && s.w && s.r); if (!done.length) continue;
      const best = Math.max(...done.map(s => Stats.e1rm(s.w, s.r))); const prior = Stats.history(en.ex).filter(x => x.date < w.date); const priorBest = Math.max(0, ...prior.map(x => x.best));
      if (best > priorBest && prior.length) prs.push(`${ex.name}: e1RM ${Math.round(best)} kg (was ${Math.round(priorBest)})`);
      const hitTop = done.length >= en.sets.length - 1 && done.every(s => s.r >= en.repMax); if (hitTop) next.push(`${ex.name}: all sets at ${en.repMax}+ reps, add weight next time`);
    }
    const st = Log.stats(w);
    Sheet.open((el, api) => {
      el.append(Sheet.head('Workout summary', api),
        h('div', { class: 'tiles' }, h('div', { class: 'tile' }, h('span', { class: 'v' }, st.done), h('span', { class: 'k' }, 'sets done')), h('div', { class: 'tile' }, h('span', { class: 'v' }, Math.round(st.volume / 100) / 10 + 't'), h('span', { class: 'k' }, 'volume')), h('div', { class: 'tile' }, h('span', { class: 'v' }, fmtDur((w.finishedAt || Date.now()) - (w.startedAt || Date.now()))), h('span', { class: 'k' }, 'duration'))),
        prs.length ? h('div', { class: 'card' }, h('span', { class: 'chip lime' }, 'Personal records'), h('ul', { class: 'clean' }, ...prs.map(p => h('li', {}, p)))) : h('p', { class: 'muted small', style: 'margin:0' }, 'No new estimated-1RM records this session.'),
        next.length ? h('div', { class: 'card' }, h('span', { class: 'eyebrow' }, 'Progression next time'), h('ul', { class: 'clean' }, ...next.map(p => h('li', {}, p)))) : null,
        h('button', { class: 'btn primary', onclick: () => api.close() }, 'Done'));
    });
  }
  return { render, exerciseCard };
})();

/* ---- Entry editor (sets / reps / rest for a live entry, optionally the programme slot) ---- */
const EntryEditor = (() => {
  function open(w, en, date, list) {
    const ex = Lib.get(en.ex); let sets = en.sets.length, repMin = en.repMin || 8, repMax = en.repMax || 12, rest = en.rest || 90, rir = en.rir == null ? 2 : en.rir, warm = en.warmup || 0, toProg = false;
    Sheet.open((el, api) => {
      const nums = (label, get, set, step = 1, min = 0) => h('label', { class: 'field grow' }, h('span', {}, label), h('div', { class: 'row' }, h('button', { class: 'btn icon', 'aria-label': 'Decrease', onclick: () => { set(Math.max(min, get() - step)); api.rerender(); } }, icon('minus')), h('input', { type: 'number', value: get(), step, min, oninput: e => set(+e.target.value) }), h('button', { class: 'btn icon', 'aria-label': 'Increase', onclick: () => { set(get() + step); api.rerender(); } }, icon('plus'))));
      el.append(Sheet.head('Edit ' + ex.name, api),
        nums('Working sets', () => sets, v => sets = v, 1, 1),
        h('div', { class: 'row' }, nums(ex.timed ? 'Seconds min' : 'Reps min', () => repMin, v => repMin = v), nums(ex.timed ? 'Seconds max' : 'Reps max', () => repMax, v => repMax = v)),
        h('div', { class: 'row' }, nums('Rest (sec)', () => rest, v => rest = v, 15, 15), ex.timed ? null : nums('Target RIR', () => rir, v => rir = v, 1, 0)),
        ex.timed ? null : nums('Warm-up sets', () => warm, v => warm = v, 1, 0),
        h('label', { class: 'field' }, h('span', {}, 'Note for this exercise'), h('input', { type: 'text', value: en.note || '', oninput: e => en.note = e.target.value, placeholder: 'e.g. slow eccentric, pause at chest' })),
        en.slotId ? h('div', { class: 'switch' }, h('span', {}, 'Also change the programme (every future ' + w.name + ')'), h('button', { class: 'toggle' + (toProg ? ' on' : ''), role: 'switch', 'aria-checked': toProg ? 'true' : 'false', 'aria-label': 'Also change the programme', onclick: () => { toProg = !toProg; api.rerender(); } })) : null,
        h('button', { class: 'btn primary', onclick: () => {
          const doneSets = en.sets.filter(s => s.done); const keep = Math.max(sets, doneSets.length);
          while (en.sets.length < keep) en.sets.push({ ...clone(en.sets[en.sets.length - 1] || { w: null, r: repMax, rir }), done: false });
          if (en.sets.length > keep) en.sets = en.sets.filter((s, i) => s.done || i < keep).slice(0, keep);
          en.repMin = Math.min(repMin, repMax); en.repMax = Math.max(repMin, repMax); en.rest = rest; en.rir = rir; en.warmup = warm;
          if (toProg) { Store.pushUndo('Edit ' + ex.name); for (const ss of Object.values(Store.program.sessions)) for (const sl of ss.slots) if (sl.id === en.slotId) Object.assign(sl, { sets, repMin: en.repMin, repMax: en.repMax, rest, rir, warmup: warm }); Sched.invalidate(); Store.touch({ silent: true }); }
          Store.touchWorkout(date); api.close(); toast(toProg ? 'Saved to today and the programme' : 'Saved for today');
        } }, 'Save'));
    });
  }
  return { open };
})();

/* ---- Exercise picker (replace / add) ---- */
const ExercisePicker = (() => {
  function open({ title, group, exclude = [], current, onPick, showProgramme = false }) {
    let g = group || 'chest', equip = '', type = '', q = '', diff = '', sel = null, toProg = false, onlyMine = false;
    const mine = Store.settings.equipAvail || null;
    Sheet.open((el, api) => {
      const list = () => Lib.all().filter(e => e.id !== current && (!g || Lib.groupsOf(g).includes(e.group)) && (!equip || e.equip === equip) && (!type || e.type === type) && (!diff || String(e.diff) === diff) && (!q || e.name.toLowerCase().includes(q.toLowerCase())) && (!onlyMine || !mine || mine.includes(e.equip)))
        .sort((a, b) => (exclude.includes(a.id) ? 1 : 0) - (exclude.includes(b.id) ? 1 : 0) || a.prio - b.prio);
      const body = h('div', { class: 'stack', style: 'gap:10px' });
      const draw = () => {
        body.replaceChildren(
          h('div', { class: 'pill-row' }, ...['chest', 'back', 'shoulders', 'triceps', 'biceps', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'core'].map(x => h('button', { class: 'chip' + (g === x ? ' on' : ''), onclick: () => { g = x; sel = null; draw(); } }, Lib.groupLabel(x)))),
          h('div', { class: 'row' }, h('input', { type: 'search', placeholder: 'Search', value: q, oninput: e => { q = e.target.value; draw(); } }),
            h('select', { 'aria-label': 'Equipment', onchange: e => { equip = e.target.value; draw(); }, style: 'width:120px' }, h('option', { value: '' }, 'Any gear'), ...Object.entries(EX.EQUIP).map(([k, v]) => h('option', { value: k, selected: equip === k }, v)))),
          h('div', { class: 'row' }, h('select', { 'aria-label': 'Type', onchange: e => { type = e.target.value; draw(); } }, h('option', { value: '' }, 'Compound or isolation'), h('option', { value: 'compound', selected: type === 'compound' }, 'Compound'), h('option', { value: 'isolation', selected: type === 'isolation' }, 'Isolation')),
            h('select', { 'aria-label': 'Difficulty', onchange: e => { diff = e.target.value; draw(); } }, h('option', { value: '' }, 'Any difficulty'), h('option', { value: '1', selected: diff === '1' }, 'Beginner'), h('option', { value: '2', selected: diff === '2' }, 'Intermediate'), h('option', { value: '3', selected: diff === '3' }, 'Advanced')),
            mine ? h('button', { class: 'chip' + (onlyMine ? ' on' : ''), onclick: () => { onlyMine = !onlyMine; draw(); } }, 'My gym') : null),
          h('div', { class: 'list' }, ...list().map(e => h('button', { class: 'item' + (sel && sel.id === e.id ? ' sel' : ''), onclick: () => { sel = e; draw(); } }, thumb(e), h('div', { class: 'grow' }, h('div', { class: 't' }, e.name), h('div', { class: 's' }, [Lib.groupLabel(e.group), EX.EQUIP[e.equip], e.type, exclude.includes(e.id) ? 'already in session' : null].filter(Boolean).join(' · '))), icon('chev')))),
          sel ? h('div', { class: 'card', style: 'position:sticky;bottom:0;background:var(--bg3)' },
            h('div', { class: 'row top' }, (() => { const d = h('div', { class: 'demo grow', style: 'max-width:240px' }); const de = demoFor(sel); if (de) { const a = Rig.mount(d, de, { autoplay: true }); mounted.add(a); } return d; })(), h('div', { class: 'grow stack' }, h('b', {}, sel.name), h('span', { class: 'small muted' }, (sel.cues || [])[0] || ''), h('span', { class: 'small dim' }, 'Targets ' + Lib.groupLabel(sel.group) + (sel.secondary && sel.secondary.length ? ', also ' + sel.secondary.join(', ') : '')))),
            showProgramme ? h('div', { class: 'switch' }, h('span', {}, 'Also replace it in the programme'), h('button', { class: 'toggle' + (toProg ? ' on' : ''), role: 'switch', 'aria-checked': toProg ? 'true' : 'false', 'aria-label': 'Also replace in the programme', onclick: () => { toProg = !toProg; draw(); } })) : null,
            h('button', { class: 'btn primary block', onclick: () => { api.close(); onPick(sel, { programme: toProg }); } }, 'Use ' + sel.name)) : null);
      };
      draw(); el.append(Sheet.head(title, api), body);
    }, { full: true });
  }
  return { open };
})();

/* ---- Demo sheet ---- */
const DemoSheet = (() => {
  function open(ex, opts = {}) {
    const de = demoFor(ex);
    Sheet.open((el, api) => {
      const phase = h('div', { class: 'phase' }); const demo = h('div', { class: 'demo' }, phase); let a = null;
      if (de) { a = Rig.mount(demo, de, { autoplay: true, onPhase: p => phase.textContent = p }); mounted.add(a); }
      else demo.append(h('div', { class: 'empty' }, 'No demonstration for this custom exercise. Edit it in the Library and pick an exercise it looks like.'));
      const playBtn = h('button', { class: 'btn sm icon', 'aria-label': 'Pause', onclick: () => { if (!a) return; const p = a.toggle(); playBtn.replaceChildren(icon(p ? 'pause' : 'play')); playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play'); } }, icon('pause'));
      const expBtn = h('button', { class: 'btn sm icon', 'aria-label': 'Expand', onclick: () => { demo.classList.toggle('expanded'); expBtn.replaceChildren(icon(demo.classList.contains('expanded') ? 'close' : 'expand')); } }, icon('expand'));
      if (a) demo.append(h('div', { class: 'ctrls' }, playBtn, h('button', { class: 'btn sm icon', 'aria-label': 'Replay', onclick: () => { a.restart(); playBtn.replaceChildren(icon('pause')); } }, icon('replay')), h('button', { class: 'btn sm', onclick: e => { const s = a.speed === .5 ? 1 : .5; a.speed = s; a.setSpeed(s); e.target.textContent = s === 1 ? '½×' : '1×'; } }, '½×'), expBtn));
      const prs = Stats.prs(ex.id); const hist = Stats.history(ex.id).slice(-5).reverse();
      el.append(Sheet.head(ex.name, api),
        h('div', { class: 'row wrap', style: 'gap:6px' }, h('span', { class: 'chip on' }, Lib.groupLabel(ex.group)), ...(ex.secondary || []).map(s => h('span', { class: 'chip' }, cap(s))), ex.equip ? h('span', { class: 'chip' }, EX.EQUIP[ex.equip]) : null, h('span', { class: 'chip' }, ex.type === 'compound' ? 'Compound' : 'Isolation'), ex.diff ? h('span', { class: 'chip' }, ['', 'Beginner', 'Intermediate', 'Advanced'][ex.diff]) : null),
        demo,
        de ? h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--accent)' }), 'Primary muscle'), h('span', {}, h('i', { style: 'background:var(--accent-2)' }), 'Start of path'), h('span', {}, h('i', { style: 'background:var(--bad)' }), 'End of path'), h('span', {}, h('i', { style: 'background:var(--fig-dim)' }), 'Far-side limb')) : null,
        h('dl', { class: 'kv' }, h('dt', {}, 'Prescribed'), h('dd', { class: 'num' }, opts.entry ? `${opts.entry.sets.length} sets × ${opts.entry.repMin}–${opts.entry.repMax}${ex.timed ? ' s' : ' reps'} · rest ${fmtSecs(opts.entry.rest)}` : `${ex.reps[0]}–${ex.reps[1]}${ex.timed ? ' s' : ' reps'} · rest ${fmtSecs(ex.rest || 90)}`),
          h('dt', {}, 'Tempo'), h('dd', {}, ex.tempo && ex.tempo !== '-' ? (ex.tempo === 'hold' ? 'Static hold' : ex.tempo + ' (eccentric–pause–concentric–pause, seconds)') : 'Steady'),
          h('dt', {}, 'Breathing'), h('dd', {}, ex.breath || '—'),
          prs.top ? h('dt', {}, 'Your best') : null, prs.top ? h('dd', { class: 'num' }, `${prs.top} kg top set · e1RM ${Math.round(prs.best)} kg`) : null),
        ex.cues && ex.cues.length ? h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Technique'), h('ul', { class: 'clean' }, ...ex.cues.map(c => h('li', {}, c)))) : null,
        ex.mistakes && ex.mistakes.length ? h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Common mistakes'), h('ul', { class: 'clean' }, ...ex.mistakes.map(c => h('li', {}, c)))) : null,
        hist.length ? h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Recent history'), h('div', { class: 'tablewrap' }, h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Sets'), h('th', {}, 'Best e1RM'))), h('tbody', {}, ...hist.map(x => h('tr', {}, h('td', {}, Dates.fmt(x.date, 'short')), h('td', {}, ex.timed ? x.sets.map(s => s.secs + 's').join(', ') : x.sets.map(s => (s.w ?? '—') + '×' + (s.r ?? '—')).join(', ')), h('td', {}, x.best ? Math.round(x.best) + ' kg' : '—'))))))) : null,
        opts.onAction ? opts.onAction(api) : h('div', { class: 'row wrap' },
          h('button', { class: 'btn grow', onclick: () => { api.close(); const d = Dates.today(); const w = Log.ensure(d); if (!w) return toast('No workout today'); w.entries.push(Log.entryFromSlot(Gen.slot(ex), ex.id, d)); Store.touchWorkout(d); toast('Added to today'); App.setTab('today'); } }, 'Add to today'),
          h('button', { class: 'btn grow', onclick: () => { api.close(); Programme.addToSessionPicker(ex); } }, 'Add to programme')));
      api.cleanup = () => { if (a) a.destroy(); };
    }, { full: true });
  }
  return { open };
})();
