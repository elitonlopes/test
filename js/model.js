/* Data model, privacy filter, estimate handling and composition geometry.
 * Everything visitors see passes through EA.publicView(), which is the only
 * place that decides what is published. */
(function () {
  const EA = window.EA;
  const KEY = 'ea.constellation.v1.';

  /* ---------- storage (per-browser; prototype stand-in for a backend) ---------- */
  function readStore(name) {
    try { const raw = localStorage.getItem(KEY + name); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function writeStore(name, value) {
    try {
      if (value === null) localStorage.removeItem(KEY + name);
      else localStorage.setItem(KEY + name, JSON.stringify(value));
    } catch (e) { /* storage blocked: the page still works for this session */ }
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  EA.store = {
    published() { return readStore('published') || clone(EA.SAMPLE); },
    draft() { return readStore('draft') || this.published(); },
    saveDraft(d) { writeStore('draft', d); },
    publish(d) { writeStore('published', d); writeStore('draft', null); },
    discardDraft() { writeStore('draft', null); },
    resetAll() { writeStore('published', null); writeStore('draft', null); },
    get(name) { return readStore(name); },
    set(name, v) { writeStore(name, v); }
  };

  /* ---------- estimates ---------- */
  EA.bucket = function (perspective, id) {
    if (!id) return null;
    return EA.BUCKETS[perspective].find((b) => b.id === id) || null;
  };
  /* Returns { known, mid, label, short, resting } for a territory in a perspective. */
  EA.estimate = function (t, perspective) {
    const b = EA.bucket(perspective, t[perspective]);
    if (!b) return { known: false, mid: null, label: 'No estimate shared', short: 'no estimate', resting: false };
    return { known: true, mid: b.mid, label: b.label, short: b.short, resting: b.mid === 0 };
  };

  /* ---------- the public view: the only data visitors receive ---------- */
  EA.publicView = function (data) {
    const territories = data.territories.filter((t) => t.include);
    const tIds = new Set(territories.map((t) => t.id));
    const experiences = data.experiences.filter((e) => e.include && !e.private && tIds.has(e.t));
    const eIds = new Set(experiences.map((e) => e.id));
    // A connection is shown only if the owner confirmed it and BOTH ends are published.
    const connections = data.connections.filter((c) => c.status === 'confirmed' && eIds.has(c.from) && eIds.has(c.to));
    const horizon = (data.horizon || []).filter((h) => tIds.has(h.t));
    const byId = new Map(experiences.map((e) => [e.id, e]));
    const tById = new Map(territories.map((t) => [t.id, t]));
    return {
      person: data.person, fictional: !!data.fictional, territories, experiences, connections, horizon,
      updates: data.updates || [], byId, tById,
      expsOf: (tid) => experiences.filter((e) => e.t === tid).sort(EA.byStart),
      linksOf: (eid) => connections.filter((c) => c.from === eid || c.to === eid)
    };
  };

  /* Owner-side accounting of what is hidden and why (never shown to visitors). */
  EA.hiddenConnections = function (data) {
    const pub = EA.publicView(data);
    const eIds = new Set(pub.experiences.map((e) => e.id));
    const all = new Map(data.experiences.map((e) => [e.id, e]));
    return data.connections.filter((c) => c.status === 'confirmed' && !(eIds.has(c.from) && eIds.has(c.to)))
      .map((c) => {
        const blocked = [c.from, c.to].filter((id) => !eIds.has(id)).map((id) => all.get(id));
        return { c, blocked };
      });
  };

  /* ---------- small helpers ---------- */
  EA.byStart = (a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title);
  EA.isCurrent = (e) => e.end === null || e.end === undefined;
  EA.dates = function (e) {
    if (!e.start) return '';
    if (EA.isCurrent(e)) return 'Since ' + e.start;
    if (e.end === e.start) return e.start;
    return e.start + '–' + e.end;
  };
  EA.relPhrase = function (c, fromSide) {
    const r = EA.RELATIONS[c.rel] || { out: 'Connected to', back: 'Connected to' };
    return fromSide ? r.out : r.back;
  };
  EA.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  EA.fmtDate = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* Deterministic PRNG so every person gets a stable, recognisable composition. */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  EA.rng = rng;

  /* ---------- geometry ---------- */
  const TAU = Math.PI * 2;
  const geo = {};
  EA.geo = geo;

  /* An island's coastline character: a few low harmonics, fixed per territory,
   * so the shape stays recognisable whatever its size. */
  geo.shape = function (id) {
    const r = rng('coast:' + id);
    const h = [];
    for (let k = 2; k <= 7; k++) h.push({ k, a: (0.018 + r() * 0.055) * (k < 4 ? 1.25 : 0.8), p: r() * TAU });
    return { h, squash: 0.86 + r() * 0.16, peak: [(r() - 0.5) * 0.5, (r() - 0.5) * 0.5], spin: r() * TAU };
  };
  geo.radiusAt = function (shape, th, phase) {
    let f = 1;
    for (const q of shape.h) f += q.a * Math.sin(q.k * th + q.p + (phase || 0) * q.k * 0.35);
    return f;
  };
  geo.blob = function (cx, cy, r, shape, scale, phase, n) {
    n = n || 60; scale = scale == null ? 1 : scale;
    const px = cx + shape.peak[0] * r * (1 - scale), py = cy + shape.peak[1] * r * (1 - scale);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const f = geo.radiusAt(shape, th, phase);
      pts.push([px + Math.cos(th) * r * scale * f, py + Math.sin(th) * r * scale * f * shape.squash]);
    }
    return pts;
  };
  geo.path = function (pts) {
    const n = pts.length; let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d + 'Z';
  };
  geo.blobPath = (cx, cy, r, shape, scale, phase) => geo.path(geo.blob(cx, cy, r, shape, scale, phase));

  /* Landmark placement inside an island: a sunflower spiral ordered by date,
   * so earlier experiences sit inland and recent ones near the shore. */
  geo.landmarkUnits = function (tid, exps, shape) {
    const n = exps.length; const out = new Map();
    exps.forEach((e, i) => {
      const s = 0.2 + 0.52 * Math.sqrt((i + 0.5) / Math.max(n, 1));
      const th = shape.spin + i * 2.39996;
      const f = geo.radiusAt(shape, th, 0);
      out.set(e.id, { ux: Math.cos(th) * s * f, uy: Math.sin(th) * s * f * shape.squash });
    });
    return out;
  };

  /* Radii for one perspective. Land area is proportional to the share of the
   * owner's estimated time. Missing estimates get one neutral size, never a guess. */
  geo.radii = function (territories, perspective, W, H) {
    const budget = W * H * 0.15;
    const minR = Math.sqrt(W * H) * 0.03;
    const neutralR = Math.sqrt(W * H) * 0.052;
    const ests = territories.map((t) => EA.estimate(t, perspective));
    const total = ests.reduce((s, e) => s + (e.known ? e.mid : 0), 0) || 1;
    const out = new Map();
    territories.forEach((t, i) => {
      const e = ests[i];
      let r, mode = 'scaled', share = null;
      if (!e.known) { r = neutralR; mode = 'unknown'; }
      else if (e.resting) { r = minR; mode = 'resting'; share = 0; }
      else {
        share = e.mid / total;
        r = Math.sqrt((share * budget) / Math.PI);
        if (r < minR) { r = minR; mode = 'floored'; }
      }
      out.set(t.id, { r, mode, share, est: e });
    });
    return { map: out, unitArea: budget / total };
  };

  /* Stable anchors: ordered by lifetime estimate, placed on a golden-angle spiral.
   * Both perspectives relax from the same anchors, so islands keep their bearings. */
  geo.layout = function (territories, W, H) {
    const cx = W / 2, cy = H / 2;
    const order = territories.slice().sort((a, b) => {
      const ea = EA.estimate(a, 'soFar'), eb = EA.estimate(b, 'soFar');
      return (eb.known ? eb.mid : 1500) - (ea.known ? ea.mid : 1500);
    });
    const n = order.length;
    const anchors = new Map();
    order.forEach((t, i) => {
      if (i === 0) { anchors.set(t.id, [cx - W * 0.04, cy]); return; }
      const th = i * 2.39996 + 0.9;
      const d = 0.34 + 0.66 * Math.sqrt(i / n);
      anchors.set(t.id, [cx + Math.cos(th) * d * W * 0.36, cy + Math.sin(th) * d * H * 0.36]);
    });
    const result = {};
    for (const persp of ['soFar', 'now']) {
      const R = geo.radii(territories, persp, W, H);
      const nodes = order.map((t) => ({ id: t.id, x: anchors.get(t.id)[0], y: anchors.get(t.id)[1], r: R.map.get(t.id).r, ax: anchors.get(t.id)[0], ay: anchors.get(t.id)[1] }));
      const gap = Math.sqrt(W * H) * 0.05;
      for (let it = 0; it < 500; it++) {
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy) || 0.01;
          const min = a.r + b.r + gap;
          if (d < min) {
            const push = (min - d) / 2; dx /= d; dy /= d;
            const wa = b.r / (a.r + b.r), wb = a.r / (a.r + b.r);
            a.x -= dx * push * wa * 1.6; a.y -= dy * push * wa * 1.6;
            b.x += dx * push * wb * 1.6; b.y += dy * push * wb * 1.6;
          }
        }
        for (const p of nodes) {
          p.x += (p.ax - p.x) * 0.012; p.y += (p.ay - p.y) * 0.012;
          p.x += (cx - p.x) * 0.004; p.y += (cy - p.y) * 0.004;
        }
      }
      const m = new Map();
      nodes.forEach((p) => { const info = R.map.get(p.id); m.set(p.id, Object.assign({ x: p.x, y: p.y }, info)); });
      result[persp] = { nodes: m, unitArea: R.unitArea };
    }
    return result;
  };

  /* ---------- change summary between perspectives (plain language) ---------- */
  EA.perspectiveChanges = function (pub) {
    const R0 = geo.radii(pub.territories, 'soFar', 1000, 1000).map;
    const R1 = geo.radii(pub.territories, 'now', 1000, 1000).map;
    const up = [], down = [], resting = [], unknown = [];
    pub.territories.forEach((t) => {
      const a = R0.get(t.id), b = R1.get(t.id);
      if (b.mode === 'unknown') { unknown.push(t.name); return; }
      if (b.mode === 'resting') { resting.push(t.name); return; }
      if (a.share == null || b.share == null) return;
      const ratio = b.share / Math.max(a.share, 0.0005);
      if (ratio >= 1.6) up.push(t.name);
      else if (ratio <= 0.6) down.push(t.name);
    });
    return { up, down, resting, unknown };
  };

  /* ---------- owner diff: what publishing will change ---------- */
  EA.diff = function (pub, draft) {
    const out = [];
    const tp = new Map(pub.territories.map((t) => [t.id, t]));
    draft.territories.forEach((t) => {
      const o = tp.get(t.id); if (!o) { out.push('Added ' + t.name); return; }
      if (o.include !== t.include) out.push((t.include ? 'Showing ' : 'Hiding ') + t.name);
      if (o.name !== t.name) out.push('Renamed ' + o.name + ' to ' + t.name);
      ['soFar', 'now'].forEach((p) => {
        if (o[p] !== t[p]) {
          const from = EA.bucket(p, o[p]), to = EA.bucket(p, t[p]);
          out.push(t.name + ', ' + (p === 'soFar' ? 'life so far' : 'life now') + ': ' + (from ? from.short : 'no estimate') + ' → ' + (to ? to.short : 'no estimate'));
        }
      });
    });
    const ep = new Map(pub.experiences.map((e) => [e.id, e]));
    draft.experiences.forEach((e) => {
      const o = ep.get(e.id);
      if (o && o.include !== e.include) out.push((e.include ? 'Publishing “' : 'Unpublishing “') + e.title + '”');
    });
    const cp = new Map(pub.connections.map((c) => [c.id, c]));
    const title = (id) => (draft.experiences.find((e) => e.id === id) || {}).title;
    draft.connections.forEach((c) => {
      const o = cp.get(c.id);
      if (!o) { out.push('New connection: ' + title(c.from) + ' → ' + title(c.to)); return; }
      if (o.status !== c.status) out.push((c.status === 'confirmed' ? 'Confirmed: ' : 'Unconfirmed: ') + title(c.from) + ' → ' + title(c.to));
      else if (o.rel !== c.rel || o.note !== c.note) out.push('Edited connection: ' + title(c.from) + ' → ' + title(c.to));
    });
    const dIds = new Set(draft.connections.map((c) => c.id));
    pub.connections.forEach((c) => { if (!dIds.has(c.id)) out.push('Removed connection: ' + title(c.from) + ' → ' + title(c.to)); });
    if (JSON.stringify(pub.horizon) !== JSON.stringify(draft.horizon)) out.push('Updated what’s next');
    if (JSON.stringify(pub.person) !== JSON.stringify(draft.person)) out.push('Updated the portrait text');
    return out;
  };
})();
