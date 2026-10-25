/* ===== Movement rig: draws and animates a stick figure from pose keyframes ===== */
const Rig = (() => {
  const D = { head: 11, neck: 8, torso: 48, uarm: 30, farm: 28, thigh: 42, shin: 40, foot: 15, shw: 17, hipw: 8 };
  const W = { torso: 15, neck: 7, uarm: 10, farm: 9, thigh: 13, shin: 11, foot: 6 };
  const NS = 'http://www.w3.org/2000/svg';
  const rad = d => d * Math.PI / 180;
  const dir = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
  const dirM = (deg, len) => [-Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len]; // mirrored (left side in front rig)
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function ik(A, T, L1, L2, bend) {
    let dx = T[0] - A[0], dy = T[1] - A[1], d = Math.hypot(dx, dy);
    if (d < 1e-6) { dx = 0; dy = 1; d = 1e-6; }
    const ux = dx / d, uy = dy / d;
    const dc = Math.min(L1 + L2 - .01, Math.max(Math.abs(L1 - L2) + .01, d));
    const a = (L1 * L1 - L2 * L2 + dc * dc) / (2 * dc);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const E = [A[0] + ux * a + uy * bend * h, A[1] + uy * a - ux * bend * h];
    return [E, [A[0] + ux * dc, A[1] + uy * dc]];
  }
  // limb spec -> {ang:[a1,a2]} | {to,bend}, plus len multipliers
  function normLimb(spec, dflt) {
    if (!spec) spec = dflt;
    const len = spec.len == null ? 1 : spec.len;
    if (spec.to) return { kind: 'ik', to: spec.to, bend: spec.bend == null ? 1 : spec.bend, len };
    const a1 = spec.uarm != null ? spec.uarm : spec.thigh, a2 = spec.farm != null ? spec.farm : spec.shin;
    return { kind: 'ang', a1: a1 || 0, a2: a2 || 0, len };
  }
  function fk(root, limb, L1, L2, mirror) {
    const dd = mirror ? dirM : dir;
    const E = add(root, dd(limb.a1, L1 * limb.len));
    return [E, add(E, dd(limb.a2, L2 * limb.len))];
  }
  // resolve one limb between two normalized specs at t, from a root point
  function solveLimb(root, a, b, t, L1, L2, mirror) {
    if (a.kind === 'ang' && b.kind === 'ang') {
      return fk(root, { a1: lerp(a.a1, b.a1, t), a2: lerp(a.a2, b.a2, t), len: lerp(a.len, b.len, t) }, L1, L2, mirror);
    }
    const toA = a.kind === 'ik' ? a.to : fk(root, a, L1, L2, mirror)[1];
    const toB = b.kind === 'ik' ? b.to : fk(root, b, L1, L2, mirror)[1];
    const bend = (a.kind === 'ik' ? a.bend : b.bend) || 1;
    const len = lerp(a.len, b.len, t);
    return ik(root, lerpP(toA, toB, t), L1 * len, L2 * len, bend);
  }
  function normPose(p, rig) {
    const n = { hip: p.hip, torso: p.torso, neck: p.neck == null ? p.torso : p.neck, foot: p.foot == null ? 90 : p.foot, shrug: p.shrug || 0 };
    n.arm = normLimb(p.arm, { uarm: 4, farm: 4 });
    n.arm2 = normLimb(p.arm2, p.arm || { uarm: 4, farm: 4 });
    if (rig === 'front') {
      n.thigh = p.thigh == null ? 9 : p.thigh; n.shin = p.shin || 0;
    } else {
      n.leg = normLimb(p.leg, { to: [p.hip[0], 210], bend: 1 });
      n.leg2 = normLimb(p.leg2, p.leg || { to: [p.hip[0], 210], bend: 1 });
    }
    return n;
  }
  // Compute joint positions at interpolation t between normalized poses a and b
  function solve(a, b, t, rig, seated) {
    const hip = lerpP(a.hip, b.hip, t);
    const torso = lerp(a.torso, b.torso, t), neck = lerp(a.neck, b.neck, t), foot = lerp(a.foot, b.foot, t);
    const J = { hip, rig };
    if (rig === 'front') {
      const shrug = lerp(a.shrug, b.shrug, t);
      const sy = hip[1] - D.torso - shrug * 9;
      J.shL = [hip[0] - D.shw, sy]; J.shR = [hip[0] + D.shw, sy]; J.neckTop = [hip[0], sy - D.neck + shrug * 2]; J.head = [hip[0], sy - D.neck - D.head + shrug * 3];
      J.chest = [hip[0], sy];
      const [eR, wR] = solveLimb(J.shR, a.arm, b.arm, t, D.uarm, D.farm, false);
      const [eL, wL] = solveLimb(J.shL, a.arm2, b.arm2, t, D.uarm, D.farm, true);
      J.elbow = eR; J.wrist = wR; J.elbow2 = eL; J.wrist2 = wL;
      const th = lerp(a.thigh, b.thigh, t), sh = lerp(a.shin, b.shin, t);
      const tl = seated ? .45 : 1;
      J.hipR = [hip[0] + D.hipw, hip[1]]; J.hipL = [hip[0] - D.hipw, hip[1]];
      J.knee = add(J.hipR, dir(th, D.thigh * tl)); J.ankle = add(J.knee, dir(sh, D.shin));
      J.knee2 = add(J.hipL, dirM(th, D.thigh * tl)); J.ankle2 = add(J.knee2, dirM(sh, D.shin));
      J.toe = add(J.ankle, [8, 0]); J.toe2 = add(J.ankle2, [-8, 0]);
    } else {
      J.shoulder = add(hip, dir(torso, D.torso));
      J.neckTop = add(J.shoulder, dir(neck, D.neck)); J.head = add(J.shoulder, dir(neck, D.neck + D.head));
      [J.elbow, J.wrist] = solveLimb(J.shoulder, a.arm, b.arm, t, D.uarm, D.farm, false);
      [J.elbow2, J.wrist2] = solveLimb(J.shoulder, a.arm2, b.arm2, t, D.uarm, D.farm, false);
      [J.knee, J.ankle] = solveLimb(hip, a.leg, b.leg, t, D.thigh, D.shin, false);
      [J.knee2, J.ankle2] = solveLimb(hip, a.leg2, b.leg2, t, D.thigh, D.shin, false);
      J.toe = add(J.ankle, dir(foot, D.foot)); J.toe2 = add(J.ankle2, dir(foot, D.foot));
    }
    return J;
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function seg(parent, w, cls) { return el('line', { 'stroke-width': w, 'stroke-linecap': 'round', class: cls }, parent); }
  function setLine(l, a, b) { l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1)); l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1)); }
  function setC(c, p, r) { c.setAttribute('cx', p[0].toFixed(1)); c.setAttribute('cy', p[1].toFixed(1)); if (r) c.setAttribute('r', r); }

  function drawScene(g, scene, noFloor) {
    if (!noFloor) el('line', { x1: 8, y1: 210, x2: 292, y2: 210, class: 'rg-floor', 'stroke-width': 2 }, g);
    for (const s of scene || []) {
      if (s.t === 'bench') { el('rect', { x: s.x, y: s.y, width: s.w, height: 12, rx: 3, class: 'rg-scene' }, g); el('line', { x1: s.x + 14, y1: s.y + 12, x2: s.x + 14, y2: 210, 'stroke-width': 5, class: 'rg-scene-l' }, g); el('line', { x1: s.x + s.w - 14, y1: s.y + 12, x2: s.x + s.w - 14, y2: 210, 'stroke-width': 5, class: 'rg-scene-l' }, g); }
      else if (s.t === 'seat') { el('rect', { x: s.x, y: s.y, width: s.w, height: 10, rx: 3, class: 'rg-scene' }, g); el('line', { x1: s.x + s.w / 2, y1: s.y + 10, x2: s.x + s.w / 2, y2: 210, 'stroke-width': 6, class: 'rg-scene-l' }, g); }
      else if (s.t === 'pad') el('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, 'stroke-width': 12, 'stroke-linecap': 'round', class: 'rg-scene-l' }, g);
      else if (s.t === 'post') el('line', { x1: s.x, y1: s.y1 == null ? 18 : s.y1, x2: s.x, y2: 210, 'stroke-width': 6, class: 'rg-scene-l' }, g);
      else if (s.t === 'pulley') { el('circle', { cx: s.x, cy: s.y, r: 6, class: 'rg-metal' }, g); el('circle', { cx: s.x, cy: s.y, r: 2, class: 'rg-scene-l' }, g); }
      else if (s.t === 'bar') el('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, 'stroke-width': 5, 'stroke-linecap': 'round', class: 'rg-metal-l' }, g);
      else if (s.t === 'box') el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, rx: 2, class: 'rg-scene' }, g);
      else if (s.t === 'rail') el('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, 'stroke-width': 3, class: 'rg-scene-l' }, g);
      else if (s.t === 'pivot') el('circle', { cx: s.x, cy: s.y, r: 4, class: 'rg-metal' }, g);
    }
  }
  const PART = { chest: 'torso', back: 'torso', core: 'torso', shoulders: 'shoulder', triceps: 'uarm', biceps: 'uarm', quads: 'thigh', hamstrings: 'thigh', glutes: 'hip', calves: 'shin', traps: 'neck' };

  function mount(container, ex, opts = {}) {
    const demo = ex.demo; if (!demo) return null;
    const rig = demo.rig || 'side';
    const A = normPose(demo.frames[0], rig), B = normPose(demo.frames[1] || demo.frames[0], rig);
    const tempo = demo.tempo || [1.5, .4, 1.5, .4];
    const thumb = opts.size === 'thumb';
    const svg = el('svg', { viewBox: '0 0 300 240', class: 'rg' + (thumb ? ' rg-thumb' : ''), 'aria-label': ex.name + ' demonstration' });
    const gScene = el('g', {}, svg), gPath = el('g', {}, svg), gFar = el('g', { class: 'rg-far' }, svg), gBody = el('g', {}, svg), gEq = el('g', {}, svg);
    drawScene(gScene, demo.scene, demo.noFloor);
    const part = PART[ex.group] || '';
    const hl = p => (p === part ? ' rg-hl' : '');
    // far limbs
    const f = { uarm: seg(gFar, W.uarm, 'rg-limb' + hl('uarm')), farm: seg(gFar, W.farm, 'rg-limb'), thigh: seg(gFar, W.thigh, 'rg-limb' + hl('thigh')), shin: seg(gFar, W.shin, 'rg-limb' + hl('shin')), foot: seg(gFar, W.foot, 'rg-limb') };
    // body
    const b = {};
    b.thigh = seg(gBody, W.thigh, 'rg-limb' + hl('thigh')); b.shin = seg(gBody, W.shin, 'rg-limb' + hl('shin')); b.foot = seg(gBody, W.foot, 'rg-limb');
    b.torso = seg(gBody, W.torso, 'rg-limb' + hl('torso'));
    if (rig === 'front') { b.shbar = seg(gBody, 12, 'rg-limb' + hl('neck')); b.hipbar = seg(gBody, 10, 'rg-limb' + hl('hip')); }
    b.neck = seg(gBody, W.neck, 'rg-limb' + hl('neck'));
    b.uarm = seg(gBody, W.uarm, 'rg-limb' + hl('uarm')); b.farm = seg(gBody, W.farm, 'rg-limb');
    b.head = el('circle', { r: D.head, class: 'rg-head' }, gBody);
    b.shJ = el('circle', { r: part === 'shoulder' ? 8 : 5, class: 'rg-joint' + hl('shoulder') }, gBody);
    b.shJ2 = rig === 'front' ? el('circle', { r: part === 'shoulder' ? 8 : 5, class: 'rg-joint' + hl('shoulder') }, gBody) : null;
    b.hipJ = el('circle', { r: part === 'hip' ? 7 : 4, class: 'rg-joint' + hl('hip') }, gBody);
    // equipment
    const eqKind = demo.equip || (ex.equip === 'barbell' ? 'barbell' : ex.equip === 'dumbbell' ? 'dumbbell' : 'none');
    const eq = {};
    const mk = () => {
      if (eqKind.startsWith('barbell')) {
        if (rig === 'front') { eq.bar = seg(gEq, 4, 'rg-metal-l'); eq.pl = el('ellipse', { rx: 5, ry: 13, class: 'rg-plate' }, gEq); eq.pr = el('ellipse', { rx: 5, ry: 13, class: 'rg-plate' }, gEq); }
        else { eq.pl = el('ellipse', { rx: 4.5, ry: 13, class: 'rg-plate' }, gEq); eq.knob = el('circle', { r: 2.5, class: 'rg-metal' }, gEq); }
      } else if (eqKind.startsWith('dumbbell')) {
        const one = () => ({ bar: seg(gEq, 3, 'rg-metal-l'), a: el('rect', { width: 5, height: 13, rx: 1.5, class: 'rg-plate' }, gEq), b: el('rect', { width: 5, height: 13, rx: 1.5, class: 'rg-plate' }, gEq) });
        eq.d1 = one(); if (rig === 'front') eq.d2 = one();
      } else if (eqKind === 'cable') { eq.line = seg(gEq, 2, 'rg-cable'); eq.h = el('circle', { r: 3.5, class: 'rg-metal' }, gEq); }
      else if (eqKind === 'lever') { eq.line = seg(gEq, 4, 'rg-metal-l'); eq.pl = el('ellipse', { rx: 4.5, ry: 12, class: 'rg-plate' }, gEq); }
      else if (eqKind === 'handle') { eq.h = el('circle', { r: 4, class: 'rg-metal' }, gEq); }
      else if (eqKind === 'platform') { eq.line = seg(gEq, 6, 'rg-metal-l'); }
      else if (eqKind === 'roller') { eq.h = el('circle', { r: 6.5, class: 'rg-roller' }, gEq); }
      else if (eqKind === 'kneepad') { eq.r = el('rect', { width: 26, height: 8, rx: 3, class: 'rg-roller' }, gEq); }
      else if (eqKind === 'wheel') { eq.h = el('circle', { r: 8, class: 'rg-metal' }, gEq); eq.h2 = el('circle', { r: 2, class: 'rg-scene-l' }, gEq); }
    }; mk();
    const dumbbellAt = (d, p, vertical) => {
      if (vertical) { setLine(d.bar, [p[0], p[1] - 9], [p[0], p[1] + 9]); d.a.setAttribute('x', p[0] - 6.5); d.a.setAttribute('y', p[1] - 11); d.a.setAttribute('width', 13); d.a.setAttribute('height', 5); d.b.setAttribute('x', p[0] - 6.5); d.b.setAttribute('y', p[1] + 6); d.b.setAttribute('width', 13); d.b.setAttribute('height', 5); }
      else { setLine(d.bar, [p[0] - 9, p[1]], [p[0] + 9, p[1]]); d.a.setAttribute('x', p[0] - 11); d.a.setAttribute('y', p[1] - 6.5); d.b.setAttribute('x', p[0] + 6); d.b.setAttribute('y', p[1] - 6.5); }
    };
    const tracePt = J => { const k = demo.trace || 'wrist'; return k === 'none' ? null : J[k]; };
    function paint(J) {
      if (rig === 'front') {
        setLine(f.thigh, J.hipL, J.knee2); setLine(f.shin, J.knee2, J.ankle2); setLine(f.foot, J.ankle2, J.toe2);
        setLine(f.uarm, J.shL, J.elbow2); setLine(f.farm, J.elbow2, J.wrist2);
        setLine(b.thigh, J.hipR, J.knee); setLine(b.shin, J.knee, J.ankle); setLine(b.foot, J.ankle, J.toe);
        setLine(b.torso, J.hip, J.chest); setLine(b.shbar, J.shL, J.shR); setLine(b.hipbar, J.hipL, J.hipR);
        setLine(b.neck, J.chest, J.neckTop); setLine(b.uarm, J.shR, J.elbow); setLine(b.farm, J.elbow, J.wrist);
        setC(b.head, J.head); setC(b.shJ, J.shR); setC(b.shJ2, J.shL); setC(b.hipJ, J.hip);
      } else {
        setLine(f.thigh, J.hip, J.knee2); setLine(f.shin, J.knee2, J.ankle2); setLine(f.foot, J.ankle2, J.toe2);
        setLine(f.uarm, J.shoulder, J.elbow2); setLine(f.farm, J.elbow2, J.wrist2);
        setLine(b.thigh, J.hip, J.knee); setLine(b.shin, J.knee, J.ankle); setLine(b.foot, J.ankle, J.toe);
        setLine(b.torso, J.hip, J.shoulder); setLine(b.neck, J.shoulder, J.neckTop);
        setLine(b.uarm, J.shoulder, J.elbow); setLine(b.farm, J.elbow, J.wrist);
        setC(b.head, J.head); setC(b.shJ, J.shoulder); setC(b.hipJ, J.hip);
      }
      // equipment
      const w = J.wrist;
      if (eqKind.startsWith('barbell')) {
        if (rig === 'front') { const l = J.wrist2, r = J.wrist; setLine(eq.bar, [l[0] - 14, l[1]], [r[0] + 14, r[1]]); setC(eq.pl, [l[0] - 16, l[1]]); setC(eq.pr, [r[0] + 16, r[1]]); }
        else { setC(eq.pl, w); setC(eq.knob, w); }
      } else if (eqKind.startsWith('dumbbell')) {
        dumbbellAt(eq.d1, w, eqKind === 'dumbbell-v'); if (eq.d2) dumbbellAt(eq.d2, J.wrist2, false);
      } else if (eqKind === 'cable') {
        const at = demo.cableAt ? J[demo.cableAt] : w; setLine(eq.line, at, demo.anchor); setC(eq.h, at);
      } else if (eqKind === 'lever') { setLine(eq.line, demo.pivot, w); setC(eq.pl, w); }
      else if (eqKind === 'handle') setC(eq.h, w);
      else if (eqKind === 'platform') { const dx = J.ankle[0] - J.knee[0], dy = J.ankle[1] - J.knee[1], L = Math.hypot(dx, dy) || 1, px = -dy / L * 20, py = dx / L * 20; setLine(eq.line, [J.ankle[0] + px, J.ankle[1] + py], [J.ankle[0] - px, J.ankle[1] - py]); }
      else if (eqKind === 'roller') setC(eq.h, lerpP(J.knee, J.ankle, .8));
      else if (eqKind === 'kneepad') { eq.r.setAttribute('x', J.knee[0] - 20); eq.r.setAttribute('y', J.knee[1] - 14); }
      else if (eqKind === 'wheel') { setC(eq.h, w); setC(eq.h2, w); }
    }
    // movement path
    const seated = !!demo.seated;
    const pts = []; for (let i = 0; i <= 14; i++) { const p = tracePt(solve(A, B, i / 14, rig, seated)); if (p) pts.push(p); }
    if (pts.length && !thumb && opts.showPath !== false) {
      el('polyline', { points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), class: 'rg-path', 'stroke-dasharray': '3 4', 'stroke-width': 1.6, fill: 'none' }, gPath);
      el('circle', { cx: pts[0][0], cy: pts[0][1], r: 3.2, class: 'rg-path-a' }, gPath);
      el('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 3.2, class: 'rg-path-b' }, gPath);
    }
    // viewBox: fit the figure (thumb) or figure + scene (full)
    {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const inc = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      for (const t of [0, .5, 1]) { const J = solve(A, B, t, rig, seated); for (const k in J) { const v = J[k]; if (Array.isArray(v)) inc(v[0], v[1]); } }
      if (thumb) {
        const pad = 22, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = Math.max(x1 - x0, y1 - y0) + pad * 2;
        svg.setAttribute('viewBox', `${(cx - s / 2).toFixed(0)} ${(cy - s / 2).toFixed(0)} ${s.toFixed(0)} ${s.toFixed(0)}`);
      } else {
        for (const sc of demo.scene || []) { if (sc.t === 'bench' || sc.t === 'seat') { inc(sc.x, sc.y); inc(sc.x + sc.w, sc.y + 12); } else if (sc.t === 'box') { inc(sc.x, sc.y); inc(sc.x + sc.w, sc.y + sc.h); } else if (sc.x1 != null) { inc(sc.x1, sc.y1); inc(sc.x2, sc.y2); } else if (sc.t === 'pulley' || sc.t === 'pivot') inc(sc.x, sc.y); else if (sc.t === 'post') inc(sc.x, sc.y1 == null ? 18 : sc.y1); }
        if (demo.anchor) inc(demo.anchor[0], demo.anchor[1]); if (demo.pivot) inc(demo.pivot[0], demo.pivot[1]);
        if (!demo.noFloor) inc(150, 210);
        const pad = 26; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
        let w = x1 - x0, hh = y1 - y0; if (w / hh < 1.15) { const nw = hh * 1.15; x0 -= (nw - w) / 2; w = nw; } if (w / hh > 1.6) { const nh = w / 1.6; y0 -= (nh - hh) / 2; hh = nh; }
        svg.setAttribute('viewBox', `${x0.toFixed(0)} ${y0.toFixed(0)} ${w.toFixed(0)} ${hh.toFixed(0)}`);
      }
    }
    const total = tempo[0] + tempo[1] + tempo[2] + tempo[3];
    const st = { playing: opts.autoplay !== false, t0: performance.now(), acc: 0, speed: 1, phase: -1, visible: true, destroyed: false };
    function progress(el) {
      let e = el % total, s, ph;
      if (e < tempo[0]) { s = ease(e / tempo[0]); ph = 0; }
      else if (e < tempo[0] + tempo[1]) { s = 1; ph = 0; }
      else if (e < tempo[0] + tempo[1] + tempo[2]) { s = 1 - ease((e - tempo[0] - tempo[1]) / tempo[2]); ph = 1; }
      else { s = 0; ph = 1; }
      return [s, ph];
    }
    function frame(now) {
      if (!st.playing && st.hold != null) { st.t0 = now; return; }
      if (st.playing) st.acc += (now - st.t0) / 1000 * st.speed;
      st.t0 = now;
      const [s, ph] = progress(st.acc);
      paint(solve(A, B, s, rig, seated));
      if (ph !== st.phase) { st.phase = ph; if (opts.onPhase) opts.onPhase(demo.phases ? demo.phases[ph] : '', ph); }
    }
    paint(solve(A, B, 0, rig, seated));
    container.appendChild(svg);
    const api = {
      svg,
      get playing() { return st.playing; },
      play() { st.playing = true; st.hold = null; st.t0 = performance.now(); },
      pause() { st.playing = false; },
      toggle() { st.playing ? api.pause() : api.play(); return st.playing; },
      restart() { st.acc = 0; st.phase = -1; api.play(); },
      setSpeed(x) { st.speed = x; },
      scrub(s) { st.playing = false; st.hold = s; paint(solve(A, B, s, rig, seated)); },
      destroy() { st.destroyed = true; animators.delete(api); if (io) io.disconnect(); svg.remove(); },
      tick(now) { if (st.visible && !st.destroyed) frame(now); else st.t0 = now; },
    };
    let io = null;
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; }); io.observe(svg); }
    animators.add(api); ensureLoop();
    return api;
  }
  const animators = new Set(); let looping = false;
  function ensureLoop() {
    if (looping) return; looping = true;
    const step = now => { if (!animators.size) { looping = false; return; } for (const a of animators) a.tick(now); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  return { mount, solve, normPose };
})();
