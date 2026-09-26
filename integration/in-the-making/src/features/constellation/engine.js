// @ts-nocheck
/* EverAtlas Constellation engine.
 * An atlas of a person: each island is a part of life, and its land area shows the
 * owner's own rough time estimate (never skill or worth). Framework-free so it can be
 * mounted from React the same way as features/life/runtime.js.
 * Everything visitors see passes through EA.publicView(). */
const EA = {};

/* Owner estimates are ranges, never exact numbers. `mid` is a geometric-ish
 * midpoint used only to size land; visitors always see the range label. */
EA.BUCKETS = {
  soFar: [
    { id: "lt100", label: "under 100 hours", short: "< 100 h", mid: 50 },
    { id: "100-500", label: "100–500 hours", short: "100–500 h", mid: 250 },
    { id: "500-2k", label: "500–2,000 hours", short: "500–2k h", mid: 1000 },
    { id: "2k-5k", label: "2,000–5,000 hours", short: "2k–5k h", mid: 3200 },
    { id: "5k-10k", label: "5,000–10,000 hours", short: "5k–10k h", mid: 7000 },
    { id: "10k-20k", label: "10,000–20,000 hours", short: "10k–20k h", mid: 14000 },
    { id: "20k+", label: "more than 20,000 hours", short: "20k+ h", mid: 26000 },
  ],
  now: [
    { id: "none", label: "not at the moment", short: "resting", mid: 0 },
    { id: "lt1", label: "under 1 hour a week", short: "< 1 h/wk", mid: 0.5 },
    { id: "1-3", label: "1–3 hours a week", short: "1–3 h/wk", mid: 2 },
    { id: "3-6", label: "3–6 hours a week", short: "3–6 h/wk", mid: 4.5 },
    { id: "6-12", label: "6–12 hours a week", short: "6–12 h/wk", mid: 9 },
    { id: "12-25", label: "12–25 hours a week", short: "12–25 h/wk", mid: 18 },
    { id: "25-40", label: "25–40 hours a week", short: "25–40 h/wk", mid: 32 },
    { id: "40+", label: "more than 40 hours a week", short: "40+ h/wk", mid: 45 },
  ],
};

/* Glyph shape is the primary encoding for kind, so meaning never relies on colour. */
EA.KINDS = {
  role: { label: "Role", shape: "square" },
  project: { label: "Project", shape: "diamond" },
  skill: { label: "Skill", shape: "triangle" },
  creation: { label: "Creation", shape: "dot" },
  study: { label: "Learning", shape: "ring" },
  community: { label: "Community", shape: "hex" },
  practice: { label: "Practice", shape: "plus" },
  milestone: { label: "Milestone", shape: "star" },
  achievement: { label: "Recognition", shape: "flag" },
  memory: { label: "Memory", shape: "moon" },
};

/* Plain-language relationship vocabulary, read from either end. */
EA.RELATIONS = {
  inspired: { out: "Inspired", back: "Inspired by" },
  developed: { out: "Developed this skill", back: "Developed through" },
  led_to: { out: "Led to", back: "Came from" },
  changed_direction: { out: "Changed direction toward", back: "A turn that began with" },
  fed_into: { out: "Fed into", back: "Draws on" },
  shaped: { out: "Shaped", back: "Shaped by" },
  includes: { out: "Included the project", back: "Part of" },
};

/* Data model, privacy filter, estimate handling and composition geometry.
 * Everything visitors see passes through EA.publicView(), which is the only
 * place that decides what is published. */
(function () {
  const KEY = "ea.constellation.v1.";
  /* Per-visitor conveniences only (motion preference, places already seen). */
  EA.store = {
    get(name) {
      try {
        const raw = localStorage.getItem(KEY + name);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    set(name, v) {
      try {
        localStorage.setItem(KEY + name, JSON.stringify(v));
      } catch (e) {
        /* storage blocked */
      }
    },
  };

  /* ---------- estimates ---------- */
  EA.bucket = function (perspective, id) {
    if (!id) return null;
    return EA.BUCKETS[perspective].find((b) => b.id === id) || null;
  };
  /* Returns { known, mid, label, short, resting } for a territory in a perspective. */
  EA.estimate = function (t, perspective) {
    const b = EA.bucket(perspective, t[perspective]);
    if (!b)
      return {
        known: false,
        mid: null,
        label: "No estimate shared",
        short: "no estimate",
        resting: false,
      };
    return { known: true, mid: b.mid, label: b.label, short: b.short, resting: b.mid === 0 };
  };

  /* ---------- the public view: the only data visitors receive ---------- */
  EA.publicView = function (data) {
    const territories = data.territories.filter((t) => t.include);
    const tIds = new Set(territories.map((t) => t.id));
    const experiences = data.experiences.filter((e) => e.include && !e.private && tIds.has(e.t));
    const eIds = new Set(experiences.map((e) => e.id));
    // A connection is shown only if the owner confirmed it and BOTH ends are published.
    const connections = data.connections.filter(
      (c) => c.status === "confirmed" && eIds.has(c.from) && eIds.has(c.to),
    );
    const horizon = (data.horizon || []).filter((h) => tIds.has(h.t));
    const byId = new Map(experiences.map((e) => [e.id, e]));
    const tById = new Map(territories.map((t) => [t.id, t]));
    return {
      person: data.person,
      fictional: !!data.fictional,
      territories,
      experiences,
      connections,
      horizon,
      updates: data.updates || [],
      byId,
      tById,
      expsOf: (tid) => experiences.filter((e) => e.t === tid).sort(EA.byStart),
      linksOf: (eid) => connections.filter((c) => c.from === eid || c.to === eid),
    };
  };

  /* ---------- small helpers ---------- */
  EA.byStart = (a, b) =>
    (a.start || "").localeCompare(b.start || "") || a.title.localeCompare(b.title);
  EA.isCurrent = (e) => e.end === null || e.end === undefined;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const fmt = (d) => {
    const m = /^(\d{4})-(\d{2})$/.exec(d || "");
    return m ? MONTHS[+m[2] - 1] + " " + m[1] : d || "";
  };
  EA.dates = function (e) {
    if (!e.start) return "";
    if (EA.isCurrent(e)) return "Since " + fmt(e.start);
    if (!e.end || e.end === e.start) return fmt(e.start);
    return fmt(e.start) + "–" + fmt(e.end);
  };
  EA.relPhrase = function (c, fromSide) {
    const r = EA.RELATIONS[c.rel] || { out: "Connected to", back: "Connected to" };
    return fromSide ? r.out : r.back;
  };
  EA.esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  EA.fmtDate = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  /* Deterministic PRNG so every person gets a stable, recognisable composition. */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = hash(seed);
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  EA.rng = rng;

  /* ---------- geometry ---------- */
  const TAU = Math.PI * 2;
  const geo = {};
  EA.geo = geo;

  /* An island's coastline character: a few low harmonics, fixed per territory,
   * so the shape stays recognisable whatever its size. */
  geo.shape = function (id) {
    const r = rng("coast:" + id);
    const h = [];
    for (let k = 2; k <= 7; k++)
      h.push({ k, a: (0.018 + r() * 0.055) * (k < 4 ? 1.25 : 0.8), p: r() * TAU });
    return {
      h,
      squash: 0.86 + r() * 0.16,
      peak: [(r() - 0.5) * 0.5, (r() - 0.5) * 0.5],
      spin: r() * TAU,
    };
  };
  geo.radiusAt = function (shape, th, phase) {
    let f = 1;
    for (const q of shape.h) f += q.a * Math.sin(q.k * th + q.p + (phase || 0) * q.k * 0.35);
    return f;
  };
  geo.blob = function (cx, cy, r, shape, scale, phase, n) {
    n = n || 60;
    scale = scale == null ? 1 : scale;
    const px = cx + shape.peak[0] * r * (1 - scale),
      py = cy + shape.peak[1] * r * (1 - scale);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const f = geo.radiusAt(shape, th, phase);
      pts.push([
        px + Math.cos(th) * r * scale * f,
        py + Math.sin(th) * r * scale * f * shape.squash,
      ]);
    }
    return pts;
  };
  geo.path = function (pts) {
    const n = pts.length;
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n],
        p1 = pts[i],
        p2 = pts[(i + 1) % n],
        p3 = pts[(i + 2) % n];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6,
        c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6,
        c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d +=
        "C" +
        c1x.toFixed(1) +
        " " +
        c1y.toFixed(1) +
        " " +
        c2x.toFixed(1) +
        " " +
        c2y.toFixed(1) +
        " " +
        p2[0].toFixed(1) +
        " " +
        p2[1].toFixed(1);
    }
    return d + "Z";
  };
  geo.blobPath = (cx, cy, r, shape, scale, phase) =>
    geo.path(geo.blob(cx, cy, r, shape, scale, phase));

  /* Landmark placement inside an island: a sunflower spiral ordered by date,
   * so earlier experiences sit inland and recent ones near the shore. */
  geo.landmarkUnits = function (tid, exps, shape) {
    const n = exps.length;
    const out = new Map();
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
      let r,
        mode = "scaled",
        share = null;
      if (!e.known) {
        r = neutralR;
        mode = "unknown";
      } else if (e.resting) {
        r = minR;
        mode = "resting";
        share = 0;
      } else {
        share = e.mid / total;
        r = Math.sqrt((share * budget) / Math.PI);
        if (r < minR) {
          r = minR;
          mode = "floored";
        }
      }
      out.set(t.id, { r, mode, share, est: e });
    });
    return { map: out, unitArea: budget / total };
  };

  /* Stable anchors: ordered by lifetime estimate, placed on a golden-angle spiral.
   * Both perspectives relax from the same anchors, so islands keep their bearings. */
  geo.layout = function (territories, W, H) {
    const cx = W / 2,
      cy = H / 2;
    const order = territories.slice().sort((a, b) => {
      const ea = EA.estimate(a, "soFar"),
        eb = EA.estimate(b, "soFar");
      return (eb.known ? eb.mid : 1500) - (ea.known ? ea.mid : 1500);
    });
    const n = order.length;
    const anchors = new Map();
    order.forEach((t, i) => {
      if (i === 0) {
        anchors.set(t.id, [cx - W * 0.04, cy]);
        return;
      }
      const th = i * 2.39996 + 0.9;
      const d = 0.34 + 0.66 * Math.sqrt(i / n);
      anchors.set(t.id, [cx + Math.cos(th) * d * W * 0.36, cy + Math.sin(th) * d * H * 0.36]);
    });
    const result = {};
    for (const persp of ["soFar", "now"]) {
      const R = geo.radii(territories, persp, W, H);
      const nodes = order.map((t) => ({
        id: t.id,
        x: anchors.get(t.id)[0],
        y: anchors.get(t.id)[1],
        r: R.map.get(t.id).r,
        ax: anchors.get(t.id)[0],
        ay: anchors.get(t.id)[1],
      }));
      const gap = Math.sqrt(W * H) * 0.05;
      for (let it = 0; it < 500; it++) {
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++) {
            const a = nodes[i],
              b = nodes[j];
            let dx = b.x - a.x,
              dy = b.y - a.y;
            let d = Math.hypot(dx, dy) || 0.01;
            const min = a.r + b.r + gap;
            if (d < min) {
              const push = (min - d) / 2;
              dx /= d;
              dy /= d;
              const wa = b.r / (a.r + b.r),
                wb = a.r / (a.r + b.r);
              a.x -= dx * push * wa * 1.6;
              a.y -= dy * push * wa * 1.6;
              b.x += dx * push * wb * 1.6;
              b.y += dy * push * wb * 1.6;
            }
          }
        for (const p of nodes) {
          p.x += (p.ax - p.x) * 0.012;
          p.y += (p.ay - p.y) * 0.012;
          p.x += (cx - p.x) * 0.004;
          p.y += (cy - p.y) * 0.004;
        }
      }
      const m = new Map();
      nodes.forEach((p) => {
        const info = R.map.get(p.id);
        m.set(p.id, Object.assign({ x: p.x, y: p.y }, info));
      });
      result[persp] = { nodes: m, unitArea: R.unitArea };
    }
    return result;
  };

  /* ---------- change summary between perspectives (plain language) ---------- */
  EA.perspectiveChanges = function (pub) {
    const R0 = geo.radii(pub.territories, "soFar", 1000, 1000).map;
    const R1 = geo.radii(pub.territories, "now", 1000, 1000).map;
    const up = [],
      down = [],
      resting = [],
      unknown = [];
    pub.territories.forEach((t) => {
      const a = R0.get(t.id),
        b = R1.get(t.id);
      if (b.mode === "unknown") {
        unknown.push(t.name);
        return;
      }
      if (b.mode === "resting") {
        resting.push(t.name);
        return;
      }
      if (a.share == null || b.share == null) return;
      const ratio = b.share / Math.max(a.share, 0.0005);
      if (ratio >= 1.6) up.push(t.name);
      else if (ratio <= 0.6) down.push(t.name);
    });
    return { up, down, resting, unknown };
  };
})();

/* The Constellation map: an archipelago where each island is a part of a life.
 * Land area = share of the owner's estimated time in the current perspective.
 * Rendering is plain SVG so every island and landmark is a real, focusable element. */
(function () {
  const geo = EA.geo;
  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function hex(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    const A = hex(a),
      B = hex(b);
    return "rgb(" + A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",") + ")";
  }

  const C = {
    lime: "#D5FF78",
    limeDeep: "#9FC94A",
    purple: "#B9A0EF",
    purpleDeep: "#8466D1",
    charcoal: "#242522",
    ivory: "#F7F5EF",
  };

  /* Kind glyphs, drawn in screen pixels around (0,0). */
  EA.glyphSVG = function (shape, parent, cls) {
    const g = el("g", { class: "glyph " + (cls || "") }, parent);
    switch (shape) {
      case "square":
        el("rect", { x: -5, y: -5, width: 10, height: 10, rx: 1 }, g);
        break;
      case "diamond":
        el("path", { d: "M0-7L7 0 0 7-7 0z" }, g);
        break;
      case "triangle":
        el("path", { d: "M0-7L6.6 5H-6.6z" }, g);
        break;
      case "dot":
        el("circle", { r: 6 }, g);
        el("circle", { r: 2.2, class: "glyph-cut" }, g);
        break;
      case "ring":
        el("circle", { r: 5, class: "glyph-ring" }, g);
        break;
      case "hex":
        el("path", { d: "M0-7L6 -3.5 6 3.5 0 7-6 3.5-6-3.5z" }, g);
        break;
      case "plus":
        el("path", { d: "M-2-7h4v5h5v4h-5v5h-4v-5h-5v-4h5z" }, g);
        break;
      case "star":
        el("path", { d: "M0-8L2.2-2.2 8 0 2.2 2.2 0 8-2.2 2.2-8 0-2.2-2.2z" }, g);
        break;
      case "flag":
        el("path", { d: "M-4.5 7V-7L6.5-3.2-2.5 0.4V7z" }, g);
        break;
      case "moon":
        el("path", { d: "M2-7A7 7 0 1 0 2 7 5.4 5.4 0 1 1 2-7z" }, g);
        break;
      default:
        el("circle", { r: 5 }, g);
    }
    return g;
  };
  EA.glyphHTML = function (kind, size) {
    const s = size || 16;
    const shape = (EA.KINDS[kind] || {}).shape;
    const svg = el("svg", {
      viewBox: "-9 -9 18 18",
      width: s,
      height: s,
      "aria-hidden": "true",
      class: "glyph-icon",
      focusable: "false",
    });
    EA.glyphSVG(shape, svg);
    return svg.outerHTML;
  };

  class Atlas {
    constructor(container, hooks) {
      this.c = container;
      this.hooks = hooks || {};
      this.b = 0;
      this.persp = "soFar";
      this.focus = null;
      this.sel = null;
      this.hover = null;
      this.cam = { x: 500, y: 500, k: 1 };
      this.insets = { l: 0, r: 0, t: 0, b: 0 };
      this.motion = true;
      this.rise = 0;
      this.userMoved = false;
      this.showAllRoutes = false;
      this.svg = el("svg", { class: "atlas-svg", role: "group" }, container);
      const defs = el("defs", null, this.svg);
      const pat = el(
        "pattern",
        {
          id: "hatch",
          width: 7,
          height: 7,
          patternUnits: "userSpaceOnUse",
          patternTransform: "rotate(35)",
        },
        defs,
      );
      el("rect", { width: 7, height: 7, fill: "#2d2e2a" }, pat);
      el(
        "line",
        { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "rgba(247,245,239,.28)", "stroke-width": 1.4 },
        pat,
      );
      const grad = el("radialGradient", { id: "seaGlow", cx: "50%", cy: "45%", r: "70%" }, defs);
      el("stop", { offset: "0", "stop-color": "#30312d" }, grad);
      el("stop", { offset: "1", "stop-color": "#1d1e1b" }, grad);
      this.bg = el(
        "rect",
        { class: "sea", x: 0, y: 0, width: "100%", height: "100%", fill: "url(#seaGlow)" },
        this.svg,
      );
      this.world = el("g", { class: "world" }, this.svg);
      this.gGrid = el("g", { class: "graticule", "aria-hidden": "true" }, this.world);
      this.gIso = el("g", { class: "isobaths", "aria-hidden": "true" }, this.world);
      this.gIsl = el("g", { class: "islands" }, this.world);
      this.gArcs = el("g", { class: "arcs", "aria-hidden": "true" }, this.world);
      this.gHor = el("g", { class: "horizon" }, this.world);
      this.gMarks = el("g", { class: "marks" }, this.world);
      this.gLabels = el("g", { class: "labels", "aria-hidden": "true" }, this.world);
      this.gRoutes = el("g", { class: "routes", "aria-hidden": "true" }, this.world);
      this.gChips = el("g", { class: "route-chips", "aria-hidden": "true" }, this.world);
      this._bindPointer();
      this._raf = null;
      this.anims = {};
      this._ro = new ResizeObserver(() => this.relayout());
      this._ro.observe(container);
    }

    /* ---------------- data & layout ---------------- */
    setData(pub) {
      this.pub = pub;
      this.shapes = new Map(pub.territories.map((t) => [t.id, geo.shape(t.id)]));
      this.units = new Map();
      pub.territories.forEach((t) => {
        const u = geo.landmarkUnits(t.id, pub.expsOf(t.id), this.shapes.get(t.id));
        u.forEach((v, k) => this.units.set(k, v));
      });
      this.relayout(true);
      this.build();
      this.update();
    }
    relayout(force) {
      if (!this.pub) return;
      // while the map view is hidden, keep laying out at the last known size
      const w = this.c.clientWidth || this.vw || 1200,
        h = this.c.clientHeight || this.vh || 800;
      // The composition's proportions follow the overview's free area only, so opening
      // a detail card moves the camera but never rearranges the islands.
      const li = this.layoutInsets || this.insets;
      const fw = Math.max(200, w - li.l - li.r),
        fh = Math.max(200, h - li.t - li.b);
      const aspect = clamp(fw / fh, 0.55, 2.1);
      if (!force && this.aspect && Math.abs(aspect - this.aspect) / this.aspect < 0.12 && this.vw) {
        const resized = w !== this.vw || h !== this.vh;
        this.vw = w;
        this.vh = h;
        if (resized || !this.userMoved)
          this.flyTo(this.targetCamera(this.persp === "now" ? 1 : 0), resized ? 0 : 350);
        return;
      }
      this.aspect = aspect;
      this.vw = w;
      this.vh = h;
      this.W = Math.sqrt(1e6 * aspect);
      this.H = 1e6 / this.W;
      this.L = geo.layout(this.pub.territories, this.W, this.H);
      if (this.built) {
        this.build();
        this.update();
      }
      this.snapCamera();
    }

    /* Interpolated geometry for a territory at the current blend. */
    node(tid, bOverride) {
      const b = bOverride == null ? this.b : bOverride;
      const a = this.L.soFar.nodes.get(tid),
        z = this.L.now.nodes.get(tid);
      const eb = easeInOut(b);
      let r = lerp(a.r, z.r, eb);
      const order = this.order ? this.order.indexOf(tid) : 0;
      const rise = this.motion ? easeOut(clamp((this.rise - order * 0.06) / 0.55, 0, 1)) : 1;
      return {
        x: lerp(a.x, z.x, eb),
        y: lerp(a.y, z.y, eb),
        r: r * (0.15 + 0.85 * rise),
        rOther: lerp(z.r, a.r, eb),
        riseT: rise,
        mode: b < 0.5 ? a.mode : z.mode,
        from: a,
        to: z,
      };
    }
    markPos(eid, bOverride) {
      const e = this.pub.byId.get(eid);
      const n = this.node(e.t, bOverride);
      const u = this.units.get(eid);
      return { x: n.x + u.ux * n.r, y: n.y + u.uy * n.r };
    }

    /* ---------------- DOM construction ---------------- */
    build() {
      this.built = true;
      [this.gGrid, this.gIso, this.gIsl, this.gHor, this.gMarks, this.gLabels].forEach(
        (g) => (g.textContent = ""),
      );
      const pub = this.pub;
      // graticule: faint survey lines, a quiet atlas cue
      const step = this.W / 10;
      for (let x = -this.W; x <= this.W * 2; x += step)
        el("line", { x1: x, y1: -this.H, x2: x, y2: this.H * 2 }, this.gGrid);
      for (let y = -this.H; y <= this.H * 2; y += step)
        el("line", { x1: -this.W, y1: y, x2: this.W * 2, y2: y }, this.gGrid);

      const soFar = this.L.soFar.nodes;
      this.order = pub.territories.map((t) => t.id).sort((a, b) => soFar.get(b).r - soFar.get(a).r);
      // DOM (and therefore Tab) order follows reading order: top-to-bottom, left-to-right.
      const reading = pub.territories.slice().sort((a, b) => {
        const A = soFar.get(a.id),
          B = soFar.get(b.id);
        return Math.abs(A.y - B.y) > 80 ? A.y - B.y : A.x - B.x;
      });
      this.isl = new Map();
      reading.forEach((t) => {
        const shape = this.shapes.get(t.id);
        const iso = [
          el("path", { class: "iso iso1" }, this.gIso),
          el("path", { class: "iso iso2" }, this.gIso),
        ];
        const g = el(
          "g",
          { class: "island", "data-id": t.id, tabindex: 0, role: "button" },
          this.gIsl,
        );
        const tide = el("path", { class: "tideline" }, g);
        const shallow = el("path", { class: "shallows" }, g);
        const land = el("path", { class: "land" }, g);
        const contours = [0.72, 0.48, 0.26].map((s, i) =>
          el("path", { class: "contour c" + i }, g),
        );
        const ring = el("path", { class: "focus-ring" }, g);
        const lab = el("g", { class: "island-label" }, this.gLabels);
        const name = el("text", { class: "isl-name" }, lab);
        name.textContent = t.name;
        const meta = el("text", { class: "isl-meta", dy: 18 }, lab);
        g.addEventListener("click", (ev) => {
          if (this._dragged) return;
          ev.stopPropagation();
          this.hooks.onIsland && this.hooks.onIsland(t.id);
        });
        g.addEventListener("keydown", (ev) => this._islandKey(ev, t.id));
        g.addEventListener("pointerenter", () => {
          this.hover = t.id;
          this.update();
        });
        g.addEventListener("pointerleave", () => {
          if (this.hover === t.id) {
            this.hover = null;
            this.update();
          }
        });
        g.addEventListener("focus", () => {
          this.hover = t.id;
          this.update();
        });
        g.addEventListener("blur", () => {
          if (this.hover === t.id) {
            this.hover = null;
            this.update();
          }
        });
        this.isl.set(t.id, {
          t,
          shape,
          g,
          iso,
          tide,
          shallow,
          land,
          contours,
          ring,
          lab,
          name,
          meta,
        });
      });

      // landmarks (same elements serve as tiny dots in overview and labelled places when zoomed)
      this.marks = new Map();
      pub.experiences.forEach((e) => {
        const k = EA.KINDS[e.kind] || {};
        const g = el(
          "g",
          {
            class: "landmark" + (EA.isCurrent(e) ? " current" : " past"),
            "data-id": e.id,
            "data-t": e.t,
            tabindex: -1,
            role: "button",
          },
          this.gMarks,
        );
        el("circle", { class: "halo", r: 13 }, g);
        EA.glyphSVG(k.shape, g);
        const pill = el("rect", { class: "mark-pill", rx: 5, height: 22, y: -11 }, g);
        const label = el("text", { class: "mark-label", x: 14, y: 4.5 }, g);
        // phones get shorter map labels; the full title is in the list, the card and the aria-label
        label.textContent =
          this.vw < 700 && e.title.length > 24 ? e.title.slice(0, 22).trim() + "…" : e.title;
        const isNew = this.hooks.isNew && this.hooks.isNew(e);
        if (isNew) {
          const nb = el("g", { class: "new-badge" }, g);
          el("circle", { r: 3.5, cx: 8, cy: -8 }, nb);
        }
        g.setAttribute(
          "aria-label",
          e.title + ". " + (k.label || "") + ", " + EA.dates(e) + (isNew ? ". New." : ""),
        );
        g.addEventListener("click", (ev) => {
          if (this._dragged) return;
          ev.stopPropagation();
          this.hooks.onMark && this.hooks.onMark(e.id);
        });
        g.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.hooks.onMark && this.hooks.onMark(e.id);
          }
        });
        this.marks.set(e.id, { e, g, label, pill, w: 0 });
      });

      // horizon buoys: what the owner is working toward, just beyond the shore
      this.buoys = [];
      pub.horizon.forEach((h, i) => {
        const g = el("g", { class: "buoy" }, this.gHor);
        el("circle", { r: 7, class: "buoy-ring" }, g);
        el("path", { d: "M-3 0h6M1-3l3 3-3 3", class: "buoy-arrow" }, g);
        const tx = el("text", { class: "buoy-label", x: 12, y: 4 }, g);
        tx.textContent = "Next: " + h.title;
        this.buoys.push({ h, g, tx, idx: pub.horizon.filter((x) => x.t === h.t).indexOf(h) });
      });
      this._syncAria();
      this._measure();
      if (document.fonts && !this._fontsHooked) {
        this._fontsHooked = true;
        document.fonts.ready.then(() => {
          this._measure();
          this.update();
        });
      }
    }
    /* Label pills are sized to their text once; labels are hidden with visibility so they stay measurable. */
    _measure() {
      this.marks.forEach((M) => {
        try {
          M.w = M.label.getComputedTextLength();
        } catch (e) {
          M.w = M.e.title.length * 7;
        }
        M.pill.setAttribute("width", (M.w + 14).toFixed(1));
      });
    }

    _syncAria() {
      const pub = this.pub;
      this.isl.forEach((I, tid) => {
        const est = EA.estimate(I.t, this.persp);
        const count = pub.expsOf(tid).length;
        const perspTxt = this.persp === "soFar" ? "Life so far" : "Life now";
        I.g.setAttribute(
          "aria-label",
          I.t.name +
            ". " +
            perspTxt +
            ": " +
            est.label +
            ". " +
            count +
            " experience" +
            (count === 1 ? "" : "s") +
            ". Press Enter to explore.",
        );
        if (this.focus === tid) I.g.setAttribute("aria-current", "true");
        else I.g.removeAttribute("aria-current");
      });
      this.marks.forEach((M) => {
        const active = M.e.t === this.focus || (this._linked && this._linked.has(M.e.id));
        M.g.setAttribute("tabindex", active ? 0 : -1);
        M.g.setAttribute("aria-hidden", active ? "false" : "true");
      });
    }

    /* ---------------- per-frame update ---------------- */
    update() {
      if (!this.built) return;
      const k = this.cam.k;
      this.world.setAttribute(
        "transform",
        "translate(" +
          (this.vw / 2 - this.cam.x * k).toFixed(2) +
          " " +
          (this.vh / 2 - this.cam.y * k).toFixed(2) +
          ") scale(" +
          k.toFixed(4) +
          ")",
      );
      const eb = easeInOut(this.b);
      const land = mix(C.purple, C.lime, eb),
        deep = mix(C.purpleDeep, C.limeDeep, eb);
      this.svg.style.setProperty("--land", land);
      this.svg.style.setProperty("--deep", deep);
      const changes = this._changes || {};
      const inv = 1 / k;

      this.isl.forEach((I, tid) => {
        const n = this.node(tid);
        const s = I.shape;
        const mode = n.mode;
        const phase = 0;
        I.land.setAttribute("d", geo.blobPath(n.x, n.y, n.r, s, 1, phase));
        I.shallow.setAttribute("d", geo.blobPath(n.x, n.y, n.r, s, 1.1, phase));
        I.ring.setAttribute("d", geo.blobPath(n.x, n.y, n.r, s, 1.18, phase));
        I.iso[0].setAttribute("d", geo.blobPath(n.x, n.y, n.r, s, 1.3, 0.4));
        I.iso[1].setAttribute("d", geo.blobPath(n.x, n.y, n.r, s, 1.55, 0.9));
        const showContours = n.r * k > 34 && mode !== "unknown" && mode !== "resting";
        I.contours.forEach((p, i) => {
          if (showContours)
            p.setAttribute(
              "d",
              geo.blobPath(n.x, n.y, n.r, s, [0.72, 0.48, 0.26][i], 0.5 + i * 0.7),
            );
          p.style.display = showContours ? "" : "none";
        });
        const showTide =
          mode !== "unknown" && Math.abs(n.rOther - n.r) / n.r > 0.08 && n.riseT > 0.99;
        I.tide.style.display = showTide ? "" : "none";
        if (showTide) I.tide.setAttribute("d", geo.blobPath(n.x, n.y, n.rOther, s, 1, 0));
        I.g.setAttribute(
          "class",
          "island mode-" +
            mode +
            (this.focus === tid ? " is-focus" : "") +
            (this.focus && this.focus !== tid ? " is-dim" : "") +
            (this.hover === tid ? " is-hover" : ""),
        );

        // label
        const est = EA.estimate(I.t, this.b < 0.5 ? "soFar" : "now");
        const rpx = n.r * k;
        let mtxt;
        if (mode === "unknown") mtxt = "no estimate shared";
        else if (mode === "resting") mtxt = "resting for now";
        else mtxt = est.short + (mode === "floored" ? " ◦" : "");
        if (this.b >= 0.5 && changes.up && changes.up.includes(I.t.name)) mtxt += "  ↑ more now";
        if (this.b >= 0.5 && changes.down && changes.down.includes(I.t.name))
          mtxt += "  ↓ less now";
        I.meta.textContent = mtxt;
        const inside = !this.focus && rpx > 64 && mode !== "unknown";
        let lx = n.x,
          ly;
        if (this.focus === tid) ly = n.y - n.r * s.squash * 1.12 - 34 * inv;
        else if (inside) ly = n.y - 4 * inv;
        else ly = n.y + n.r * s.squash * 1.08 + 18 * inv;
        const fs = inside ? clamp(rpx * 0.16, 17, 30) : this.focus === tid ? 26 : 16;
        I.lab.setAttribute(
          "transform",
          "translate(" + lx.toFixed(1) + " " + ly.toFixed(1) + ") scale(" + inv.toFixed(4) + ")",
        );
        I.lab.setAttribute(
          "class",
          "island-label " +
            (inside ? "on-land" : "on-sea") +
            (this.focus && this.focus !== tid ? " is-dim" : "") +
            (this.focus === tid ? " is-focus" : ""),
        );
        I.name.style.fontSize = fs + "px";
        I.meta.setAttribute("dy", Math.round(fs * 0.62 + 10));
        I.lab.style.opacity = n.riseT;
      });

      // landmarks
      this.marks.forEach((M, eid) => {
        const p = this.markPos(eid);
        const n = this.node(M.e.t);
        const inFocus = this.focus === M.e.t;
        const linked = this._linked && this._linked.has(eid);
        const sel = this.sel === eid;
        const sc = inFocus || linked ? 1 : clamp((n.r * k) / 140, 0.28, 0.55);
        M.g.setAttribute(
          "transform",
          "translate(" +
            p.x.toFixed(1) +
            " " +
            p.y.toFixed(1) +
            ") scale(" +
            (inv * sc).toFixed(4) +
            ")",
        );
        const nowMode = this.b >= 0.5;
        let cls = "landmark mode-" + n.mode + (EA.isCurrent(M.e) ? " current" : " past");
        if (inFocus) cls += " in-focus";
        if (linked) cls += " linked";
        if (sel) cls += " selected";
        if (this.focus && !inFocus && !linked) cls += " is-dim";
        // when the view pulls back to show connections, keep only the labels that matter
        if (inFocus && !sel && !linked && this.sel && n.r * k < 150) cls += " no-label";
        if (nowMode && !EA.isCurrent(M.e)) cls += " faded";
        // flip labels on the left half of an island so they read away from the centre
        const u = this.units.get(eid);
        const left = u.ux < -0.12;
        M.label.setAttribute("x", left ? -16 : 16);
        M.label.setAttribute("text-anchor", left ? "end" : "start");
        M.pill.setAttribute("x", left ? (-16 - M.w - 7).toFixed(1) : 9);
        M.g.setAttribute("class", cls);
        M.g.style.opacity = n.riseT;
      });

      // horizon buoys, pointing outward from the composition's centre
      const cx = this.W / 2,
        cy = this.H / 2;
      this.buoys.forEach((B) => {
        const n = this.node(B.h.t);
        const s = this.shapes.get(B.h.t);
        let dx = n.x - cx,
          dy = n.y - cy;
        const d = Math.hypot(dx, dy);
        let th = d < 30 ? -0.35 : Math.atan2(dy, dx);
        th += (B.idx - 0.0) * 0.45;
        const f = geo.radiusAt(s, th, 0);
        const x = n.x + Math.cos(th) * (n.r * f + 26 * inv + 8),
          y = n.y + Math.sin(th) * (n.r * f * s.squash + 26 * inv + 8);
        const left = Math.cos(th) < -0.2;
        B.tx.setAttribute("x", left ? -12 : 12);
        B.tx.setAttribute("text-anchor", left ? "end" : "start");
        B.g.setAttribute(
          "transform",
          "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + inv.toFixed(4) + ")",
        );
        const show = this.focus === B.h.t || (!this.focus && this.hover === B.h.t);
        B.g.setAttribute(
          "class",
          "buoy" +
            (show ? " show-label" : "") +
            (this.focus && this.focus !== B.h.t ? " is-dim" : ""),
        );
        B.g.style.opacity = n.riseT;
      });

      this._updateRoutes();
      this._updateArcs();
      this.hooks.onFrame && this.hooks.onFrame();
    }

    /* ---------------- routes for a selected experience ---------------- */
    _routeGeom(fromId, toId) {
      const a = this.markPos(fromId),
        z = this.markPos(toId);
      const mx = (a.x + z.x) / 2,
        my = (a.y + z.y) / 2;
      const dx = z.x - a.x,
        dy = z.y - a.y,
        d = Math.hypot(dx, dy) || 1;
      const bend = Math.min(0.28 * d, 160);
      const qx = mx - (dy / d) * bend,
        qy = my + (dx / d) * bend;
      return {
        a,
        z,
        qx,
        qy,
        d:
          "M" +
          a.x.toFixed(1) +
          " " +
          a.y.toFixed(1) +
          "Q" +
          qx.toFixed(1) +
          " " +
          qy.toFixed(1) +
          " " +
          z.x.toFixed(1) +
          " " +
          z.y.toFixed(1),
      };
    }
    setSelection(eid) {
      this.sel = eid;
      this._linked = new Set();
      this.gRoutes.textContent = "";
      this.gChips.textContent = "";
      this.routes = [];
      if (eid) {
        this.pub.linksOf(eid).forEach((c) => {
          const out = c.from === eid;
          const other = out ? c.to : c.from;
          this._linked.add(other);
          const p = el(
            "path",
            { class: "route" + (out ? " out" : " in"), "data-other": other },
            this.gRoutes,
          );
          const arrow = el("path", { class: "route-arrow", d: "M-6-5L3 0-6 5z" }, this.gRoutes);
          const chip = el("g", { class: "route-chip", "data-other": other }, this.gChips);
          const rect = el("rect", { rx: 10, height: 20, y: -10 }, chip);
          const tx = el("text", { x: 0, y: 4, "text-anchor": "middle" }, chip);
          tx.textContent = EA.relPhrase(c, out);
          this.routes.push({ c, out, other, p, arrow, chip, rect, tx, w: null });
        });
      }
      this._syncAria();
      this.update();
      // measure chips once text is in the DOM
      this.routes.forEach((R) => {
        try {
          R.w = R.tx.getComputedTextLength() + 20;
        } catch (e) {
          R.w = 90;
        }
        R.rect.setAttribute("width", R.w);
        R.rect.setAttribute("x", -R.w / 2);
      });
    }
    highlightRoute(otherId) {
      (this.routes || []).forEach((R) => {
        R.p.classList.toggle("hot", R.other === otherId);
        R.chip.classList.toggle("hot", R.other === otherId);
        const M = this.marks.get(R.other);
        if (M) M.g.classList.toggle("hot", R.other === otherId);
      });
    }
    _updateRoutes() {
      if (!this.routes || !this.sel) return;
      const inv = 1 / this.cam.k;
      this.routes.forEach((R) => {
        const from = R.out ? this.sel : R.other,
          to = R.out ? R.other : this.sel;
        const G = this._routeGeom(from, to);
        R.p.setAttribute("d", G.d);
        R.geom = G;
        // chip at the curve midpoint, arrowhead near the destination
        const t = 0.5,
          it = 1 - t;
        const mx = it * it * G.a.x + 2 * it * t * G.qx + t * t * G.z.x,
          my = it * it * G.a.y + 2 * it * t * G.qy + t * t * G.z.y;
        R.chip.setAttribute(
          "transform",
          "translate(" + mx.toFixed(1) + " " + my.toFixed(1) + ") scale(" + inv.toFixed(4) + ")",
        );
        const ta = 0.86,
          ia = 1 - ta;
        const ax = ia * ia * G.a.x + 2 * ia * ta * G.qx + ta * ta * G.z.x,
          ay = ia * ia * G.a.y + 2 * ia * ta * G.qy + ta * ta * G.z.y;
        const tx = 2 * ia * (G.qx - G.a.x) + 2 * ta * (G.z.x - G.qx),
          ty = 2 * ia * (G.qy - G.a.y) + 2 * ta * (G.z.y - G.qy);
        R.arrow.setAttribute(
          "transform",
          "translate(" +
            ax.toFixed(1) +
            " " +
            ay.toFixed(1) +
            ") rotate(" +
            ((Math.atan2(ty, tx) * 180) / Math.PI).toFixed(1) +
            ") scale(" +
            inv.toFixed(4) +
            ")",
        );
      });
    }

    /* Overview arcs: how parts of life connect, one line per pair of islands. */
    setShowAllRoutes(on) {
      this.showAllRoutes = on;
      this.update();
    }
    _updateArcs() {
      this.gArcs.textContent = "";
      const show = !this.sel && (this.showAllRoutes || (this.hover && !this.focus) || this.focus);
      if (!show) return;
      const pairs = new Map();
      this.pub.connections.forEach((c) => {
        const a = this.pub.byId.get(c.from).t,
          b = this.pub.byId.get(c.to).t;
        if (a === b) return;
        const only = this.showAllRoutes ? null : this.focus || this.hover;
        if (only && a !== only && b !== only) return;
        const key = [a, b].sort().join("|");
        pairs.set(key, (pairs.get(key) || 0) + 1);
      });
      const inv = 1 / this.cam.k;
      pairs.forEach((count, key) => {
        const [a, b] = key.split("|");
        const A = this.node(a),
          B = this.node(b);
        const dx = B.x - A.x,
          dy = B.y - A.y,
          d = Math.hypot(dx, dy) || 1;
        const x1 = A.x + (dx / d) * A.r * 0.9,
          y1 = A.y + (dy / d) * A.r * 0.9,
          x2 = B.x - (dx / d) * B.r * 0.9,
          y2 = B.y - (dy / d) * B.r * 0.9;
        const qx = (x1 + x2) / 2 - (dy / d) * d * 0.12,
          qy = (y1 + y2) / 2 + (dx / d) * d * 0.12;
        el(
          "path",
          {
            class: "arc",
            d: "M" + x1 + " " + y1 + "Q" + qx + " " + qy + " " + x2 + " " + y2,
            "stroke-width": 1 + count * 0.6,
          },
          this.gArcs,
        );
        if (count > 1) {
          const g = el(
            "g",
            {
              class: "arc-count",
              transform:
                "translate(" +
                (0.25 * x1 + 0.5 * qx + 0.25 * x2) +
                " " +
                (0.25 * y1 + 0.5 * qy + 0.25 * y2) +
                ") scale(" +
                inv +
                ")",
            },
            this.gArcs,
          );
          el("circle", { r: 9 }, g);
          const t = el("text", { y: 4, "text-anchor": "middle" }, g);
          t.textContent = count;
        }
      });
    }

    /* ---------------- camera ---------------- */
    setInsets(ins) {
      this.insets = ins;
      this.relayout();
    }
    fitBox(x0, y0, x1, y1, pad) {
      const ins = this.insets;
      pad = pad == null ? 40 : pad;
      const aw = Math.max(80, this.vw - ins.l - ins.r - pad * 2),
        ah = Math.max(80, this.vh - ins.t - ins.b - pad * 2);
      const k = Math.min(aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0));
      // centre of the free area, expressed as a world point at the camera centre
      const fx = ins.l + pad + aw / 2,
        fy = ins.t + pad + ah / 2;
      const cx = (x0 + x1) / 2 - (fx - this.vw / 2) / k,
        cy = (y0 + y1) / 2 - (fy - this.vh / 2) / k;
      return { x: cx, y: cy, k };
    }
    targetCamera(b) {
      const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      const add = (x, y, rx, ry) => {
        bb.x0 = Math.min(bb.x0, x - rx);
        bb.y0 = Math.min(bb.y0, y - ry);
        bb.x1 = Math.max(bb.x1, x + rx);
        bb.y1 = Math.max(bb.y1, y + ry);
      };
      const nd = (tid) => {
        const a = this.L.soFar.nodes.get(tid),
          z = this.L.now.nodes.get(tid);
        const e = easeInOut(b);
        return { x: lerp(a.x, z.x, e), y: lerp(a.y, z.y, e), r: lerp(a.r, z.r, e) };
      };
      if (!this.focus) {
        this.pub.territories.forEach((t) => {
          const n = nd(t.id);
          add(n.x, n.y, n.r * 1.2, n.r * 1.2 + 26);
        });
        return this.fitBox(bb.x0, bb.y0, bb.x1, bb.y1, this.vw < 700 ? 16 : 48);
      }
      const n = nd(this.focus);
      // leave room beside the island for landmark labels on narrow screens
      add(n.x, n.y, n.r * (this.vw < 700 ? 2.3 : 1.45), n.r * 1.5);
      if (this.sel) {
        this.pub.linksOf(this.sel).forEach((c) => {
          const o = c.from === this.sel ? c.to : c.from;
          const p = this.markPos(o, b);
          add(p.x, p.y, 30, 30);
        });
      }
      const cam = this.fitBox(bb.x0, bb.y0, bb.x1, bb.y1, 56);
      // never zoom so far that labels feel cramped or so close that it feels like a void
      const ov = this.fitBox(0, 0, this.W, this.H, 0);
      cam.k = Math.min(cam.k, ov.k * 7);
      return cam;
    }
    snapCamera() {
      this.cam = this.targetCamera(this.persp === "now" ? 1 : 0);
      this.userMoved = false;
      this.update();
    }
    flyTo(cam, dur) {
      if (!this.motion || !dur) {
        this.cam = cam;
        this.update();
        return;
      }
      this.anims.cam = { from: Object.assign({}, this.cam), to: cam, t0: performance.now(), dur };
      this._tick();
    }
    recenter() {
      this.userMoved = false;
      this.flyTo(this.targetCamera(this.persp === "now" ? 1 : 0), 700);
    }
    zoomBy(f) {
      const k = clamp(this.cam.k * f, this._kMin(), this._kMax());
      this.flyTo({ x: this.cam.x, y: this.cam.y, k }, 260);
      this.userMoved = true;
    }
    _kMin() {
      return this.fitBox(0, 0, this.W, this.H, 0).k * 0.45;
    }
    _kMax() {
      return this.fitBox(0, 0, this.W, this.H, 0).k * 9;
    }

    /* ---------------- state changes ---------------- */
    setMotion(ok) {
      this.motion = ok;
      if (!ok) {
        this.rise = 1;
        this.update();
      }
    }
    intro() {
      if (!this.motion) {
        this.rise = 1;
        this.update();
        return;
      }
      this.rise = 0;
      this.anims.rise = { t0: performance.now(), dur: 1500 };
      this._tick();
    }
    setPerspective(p) {
      if (p === this.persp) return;
      this.persp = p;
      this._changes = EA.perspectiveChanges(this.pub);
      const to = p === "now" ? 1 : 0;
      const dur = this.motion ? 1300 : 0;
      this._syncAria();
      if (!dur) {
        this.b = to;
        this.cam = this.targetCamera(to);
        this.update();
        return;
      }
      this.anims.b = { from: this.b, to, t0: performance.now(), dur };
      if (!this.userMoved)
        this.anims.cam = {
          from: Object.assign({}, this.cam),
          to: this.targetCamera(to),
          t0: performance.now(),
          dur,
        };
      this._tick();
    }
    setFocus(tid, eid) {
      this.focus = tid;
      this.userMoved = false;
      this.setSelection(eid || null);
      this.flyTo(this.targetCamera(this.persp === "now" ? 1 : 0), 900);
    }
    /* Follow a connection: a light travels the route while the view moves to its destination. */
    travel(fromEid, toEid, done) {
      const R = (this.routes || []).find((r) => r.other === toEid);
      if (!this.motion || !R || !R.geom) {
        done();
        return;
      }
      const dot = el("circle", { class: "traveler", r: 6 }, this.gRoutes);
      R.p.classList.add("hot");
      const toT = this.pub.byId.get(toEid).t;
      const t0 = performance.now(),
        dur = 900;
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1),
          e = easeInOut(t),
          it = 1 - e,
          G = R.geom;
        const x = it * it * G.a.x + 2 * it * e * G.qx + e * e * G.z.x,
          y = it * it * G.a.y + 2 * it * e * G.qy + e * e * G.z.y;
        if (!R.out) {
          /* incoming route: travel from this end back to the other */
        }
        const P = R.out
          ? { x, y }
          : {
              x: it * it * G.z.x + 2 * it * e * G.qx + e * e * G.a.x,
              y: it * it * G.z.y + 2 * it * e * G.qy + e * e * G.a.y,
            };
        dot.setAttribute("cx", P.x);
        dot.setAttribute("cy", P.y);
        dot.setAttribute("r", 6 / this.cam.k);
        if (t < 1) requestAnimationFrame(step);
        else {
          dot.remove();
          done();
        }
      };
      requestAnimationFrame(step);
      // begin moving the camera toward the destination island now
      const keep = this.focus;
      this.focus = toT;
      const cam = this.targetCamera(this.persp === "now" ? 1 : 0);
      this.focus = keep;
      this.anims.cam = {
        from: Object.assign({}, this.cam),
        to: {
          x: lerp(this.cam.x, cam.x, 0.6),
          y: lerp(this.cam.y, cam.y, 0.6),
          k: Math.min(this.cam.k, cam.k),
        },
        t0: performance.now(),
        dur,
      };
      this._tick();
    }

    _tick() {
      if (this._raf) return;
      const loop = (now) => {
        this._raf = null;
        let live = false;
        const A = this.anims;
        if (A.rise) {
          const t = clamp((now - A.rise.t0) / A.rise.dur, 0, 1);
          this.rise = t * 1.6;
          if (t >= 1) {
            this.rise = 1.6;
            delete A.rise;
          } else live = true;
        }
        if (A.b) {
          const t = clamp((now - A.b.t0) / A.b.dur, 0, 1);
          this.b = lerp(A.b.from, A.b.to, t);
          if (t >= 1) delete A.b;
          else live = true;
        }
        if (A.cam) {
          const t = clamp((now - A.cam.t0) / A.cam.dur, 0, 1),
            e = easeInOut(t),
            f = A.cam.from,
            z = A.cam.to;
          // zoom interpolated in log space so scale changes feel even
          this.cam = {
            x: lerp(f.x, z.x, e),
            y: lerp(f.y, z.y, e),
            k: Math.exp(lerp(Math.log(f.k), Math.log(z.k), e)),
          };
          if (t >= 1) delete A.cam;
          else live = true;
        }
        this.update();
        if (live) this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* ---------------- input ---------------- */
    _islandKey(ev, tid) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.hooks.onIsland && this.hooks.onIsland(tid);
        return;
      }
      const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
      const d = dirs[ev.key];
      if (!d) return;
      ev.preventDefault();
      const a = this.node(tid);
      let best = null,
        bestScore = Infinity;
      this.isl.forEach((I, id) => {
        if (id === tid) return;
        const n = this.node(id);
        const dx = n.x - a.x,
          dy = n.y - a.y;
        const along = dx * d[0] + dy * d[1];
        if (along <= 0) return;
        const across = Math.abs(dx * d[1] - dy * d[0]);
        const score = along + across * 2;
        if (score < bestScore) {
          bestScore = score;
          best = id;
        }
      });
      if (best) this.isl.get(best).g.focus();
    }
    _bindPointer() {
      const pts = new Map();
      let start = null,
        pinch = null;
      this.svg.addEventListener("pointerdown", (ev) => {
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        this._dragged = false;
        start = { x: ev.clientX, y: ev.clientY, cam: Object.assign({}, this.cam) };
        if (pts.size === 2) {
          const [p, q] = [...pts.values()];
          pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), k: this.cam.k };
        }
      });
      const move = (ev) => {
        if (!pts.has(ev.pointerId) || !start) return;
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pinch && pts.size === 2) {
          const [p, q] = [...pts.values()];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          this.cam.k = clamp((pinch.k * d) / pinch.d, this._kMin(), this._kMax());
          this._dragged = true;
          this.userMoved = true;
          this.update();
          return;
        }
        const dx = ev.clientX - start.x,
          dy = ev.clientY - start.y;
        if (!this._dragged && Math.hypot(dx, dy) < 6) return;
        this._dragged = true;
        this.userMoved = true;
        delete this.anims.cam;
        this.cam.x = start.cam.x - dx / this.cam.k;
        this.cam.y = start.cam.y - dy / this.cam.k;
        this.svg.classList.add("dragging");
        this.update();
      };
      const end = (ev) => {
        pts.delete(ev.pointerId);
        if (pts.size < 2) pinch = null;
        if (!pts.size) {
          start = null;
          this.svg.classList.remove("dragging");
          setTimeout(() => (this._dragged = false), 0);
        }
      };
      this._win = [
        ["pointermove", move],
        ["pointerup", end],
        ["pointercancel", end],
      ];
      this._win.forEach(([t, fn]) => window.addEventListener(t, fn));
      this.svg.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
          const rect = this.svg.getBoundingClientRect();
          const mx = ev.clientX - rect.left,
            my = ev.clientY - rect.top;
          const wx = this.cam.x + (mx - this.vw / 2) / this.cam.k,
            wy = this.cam.y + (my - this.vh / 2) / this.cam.k;
          const k = clamp(this.cam.k * Math.exp(-ev.deltaY * 0.0015), this._kMin(), this._kMax());
          this.cam = { x: wx - (mx - this.vw / 2) / k, y: wy - (my - this.vh / 2) / k, k };
          this.userMoved = true;
          delete this.anims.cam;
          this.update();
        },
        { passive: false },
      );
      this.svg.addEventListener("click", () => {
        if (this._dragged) return;
        this.hooks.onSea && this.hooks.onSea();
      });
    }

    destroy() {
      this._ro && this._ro.disconnect();
      (this._win || []).forEach(([t, fn]) => window.removeEventListener(t, fn));
      if (this._raf) cancelAnimationFrame(this._raf);
      this.anims = {};
      this.svg.remove();
    }

    /* Screen size of the scale key (a square of land equal to the reference unit). */
    scaleKey() {
      const b = this.b >= 0.5 ? "now" : "soFar";
      const unit = this.L[b].unitArea;
      const refs =
        b === "now"
          ? [
              [4, "4 hours a week"],
              [2, "2 hours a week"],
              [1, "1 hour a week"],
              [0.5, "30 minutes a week"],
              [0.25, "15 minutes a week"],
            ]
          : [
              [5000, "5,000 hours"],
              [2000, "2,000 hours"],
              [1000, "1,000 hours"],
              [500, "500 hours"],
              [200, "200 hours"],
              [100, "100 hours"],
            ];
      let pick = refs[refs.length - 1];
      for (const r of refs) {
        if (Math.sqrt(unit * r[0]) * this.cam.k <= 30) {
          pick = r;
          break;
        }
      }
      return { px: Math.sqrt(unit * pick[0]) * this.cam.k, label: pick[1] };
    }
  }

  EA.Atlas = Atlas;

  /* Static miniature used in the owner studio preview. */
  EA.miniMap = function (svg, pub, perspective) {
    svg.textContent = "";
    const W = 1000 * 1.5,
      H = 1000;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    const L = geo.layout(pub.territories, W, H)[perspective];
    el("rect", { width: W, height: H, fill: C.charcoal }, svg);
    const defs = el("defs", null, svg);
    const pat = el(
      "pattern",
      {
        id: "hatchMini",
        width: 14,
        height: 14,
        patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(35)",
      },
      defs,
    );
    el("rect", { width: 14, height: 14, fill: "#2d2e2a" }, pat);
    el(
      "line",
      { x1: 0, y1: 0, x2: 0, y2: 14, stroke: "rgba(247,245,239,.3)", "stroke-width": 3 },
      pat,
    );
    const land = perspective === "now" ? C.lime : C.purple;
    pub.territories.forEach((t) => {
      const n = L.nodes.get(t.id);
      const s = geo.shape(t.id);
      const unknown = n.mode === "unknown",
        resting = n.mode === "resting";
      el(
        "path",
        {
          d: geo.blobPath(n.x, n.y, n.r, s, 1),
          fill: unknown ? "url(#hatchMini)" : resting ? "none" : land,
          stroke: unknown || resting ? C.ivory : "none",
          "stroke-width": 3,
          "stroke-dasharray": unknown ? "10 8" : resting ? "3 7" : null,
        },
        svg,
      );
      const tx = el(
        "text",
        {
          x: n.x,
          y: n.y + n.r * s.squash + 40,
          "text-anchor": "middle",
          fill: C.ivory,
          "font-size": 34,
          "font-family": "Hanken Grotesk, sans-serif",
        },
        svg,
      );
      tx.textContent = t.name;
    });
  };
})();

/* ---------------------------------------------------------------------------
 * Visitor experience, mounted into a host element. No global routing, no
 * document-level side effects that outlive unmount.
 * ------------------------------------------------------------------------- */
const TEMPLATE = `
<header class="cx-top">
  <a class="cx-back" data-slot="back"></a>
  <nav class="cx-tabs" aria-label="Ways to explore">
    <button type="button" data-tab="map" aria-pressed="true">Constellation</button>
    <button type="button" data-tab="text" aria-pressed="false">Read as text</button>
  </nav>
  <p class="cx-badge" data-slot="badge" hidden></p>
</header>
<section class="view-atlas" data-slot="atlasView" aria-label="Constellation map">
  <div class="map" data-slot="map"></div>
  <aside class="panel" data-slot="panel" aria-label="About this person"></aside>
  <aside class="detail" data-slot="detail" hidden aria-label="Experience details"></aside>
  <div class="dock">
    <div class="persp" role="group" aria-label="Perspective">
      <button type="button" class="persp-btn" data-persp="soFar" aria-pressed="true"><span class="pb-title">Life so far</span><span class="pb-sub">total hours, roughly</span></button>
      <button type="button" class="persp-btn" data-persp="now" aria-pressed="false"><span class="pb-title">Life now</span><span class="pb-sub">a typical week</span></button>
    </div>
    <p class="caption" data-slot="caption"></p>
  </div>
  <div class="map-tools" role="toolbar" aria-label="Map controls">
    <button type="button" data-act="key" class="tool" aria-expanded="false"><span class="scale-sq" data-slot="scaleSq" aria-hidden="true"></span><span class="tool-label">How to read <span class="scale-lbl" data-slot="scaleLbl"></span></span></button>
    <button type="button" data-act="routes" class="tool" aria-pressed="false"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 15Q10 2 17 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/><circle cx="3" cy="15" r="2" fill="currentColor"/><circle cx="17" cy="12" r="2" fill="currentColor"/></svg><span class="tool-label">Connections</span></button>
    <button type="button" data-act="motion" class="tool" aria-pressed="false"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M2 10c3-5 5 5 8 0s5 5 8 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span class="tool-label" data-slot="motionLabel">Motion on</span></button>
    <div class="zoom-row">
      <button type="button" data-act="zoomOut" class="tool icon" aria-label="Zoom out">−</button>
      <button type="button" data-act="zoomIn" class="tool icon" aria-label="Zoom in">+</button>
      <button type="button" data-act="recenter" class="tool icon" aria-label="Fit the view"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
    </div>
  </div>
  <div class="legend" data-slot="legend" hidden role="dialog" aria-label="How to read this map">
    <div class="legend-head"><h2 tabindex="-1" data-slot="legendTitle">How to read this map</h2><button type="button" data-act="keyClose" class="detail-close" aria-label="Close">×</button></div>
    <ul class="legend-list">
      <li><svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><path d="M6 15c0-8 10-11 18-9s12 7 10 12-10 9-18 8S6 22 6 15z" class="lg-land"/></svg><p><strong>Each island is a part of life.</strong> Its land area shows roughly how much time went into it. Time is not a measure of skill, success or importance.</p></li>
      <li><svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><path d="M6 15c0-8 10-11 18-9s12 7 10 12-10 9-18 8S6 22 6 15z" class="lg-land"/><path d="M2 15c0-11 14-14 24-11s14 9 12 15-13 11-23 9S2 24 2 15z" class="lg-tide"/></svg><p><strong>Dotted shoreline:</strong> the island’s size in the other perspective, so you can see what changed.</p></li>
      <li><svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><path d="M6 15c0-8 10-11 18-9s12 7 10 12-10 9-18 8S6 22 6 15z" class="lg-unknown"/></svg><p><strong>Hatched, dashed coast:</strong> no estimate shared. Drawn at a neutral size, not a guess.</p></li>
      <li><svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><circle cx="20" cy="15" r="8" class="lg-rest"/></svg><p><strong>Dotted outline:</strong> resting for now. Very small shares are drawn at a minimum size and marked ◦ so they stay findable.</p></li>
      <li><svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><circle cx="20" cy="15" r="6" class="lg-buoy"/><path d="M17 15h6M21 12l3 3-3 3" class="lg-buoy-a"/></svg><p><strong>Buoys offshore:</strong> what’s next, the things being worked toward.</p></li>
    </ul>
    <h3 class="eyebrow">Places on each island</h3>
    <p class="small">Earlier experiences sit inland; recent ones sit near the shore.</p>
    <ul class="kind-list" data-slot="kindList"></ul>
    <h3 class="eyebrow">Keyboard</h3>
    <p class="small">Tab moves between islands, and the arrow keys jump to a neighbouring island. Enter opens an island or a place. Escape steps back. Press T to switch perspective.</p>
  </div>
  <div class="sr-only" aria-live="polite" data-slot="live"></div>
</section>
<section class="view-doc" data-slot="textView" hidden aria-label="Readable version"></section>
<div class="toast" role="status" data-slot="toast" hidden></div>`;

/**
 * Mount the Constellation into `root`.
 * @param {HTMLElement} root
 * @param {object} data  Constellation data (see adapter.ts)
 * @param {{ profileHref?: string, storageKey?: string, sample?: boolean }} [opts]
 * @returns {() => void} cleanup
 */
export function mountConstellation(root, data, opts) {
  opts = opts || {};
  const esc = EA.esc;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const slot = (n) => root.querySelector('[data-slot="' + n + '"]');
  const cleanups = [];
  const on = (target, type, fn, o) => {
    target.addEventListener(type, fn, o);
    cleanups.push(() => target.removeEventListener(type, fn, o));
  };

  root.classList.add("constellation-app");
  root.innerHTML = TEMPLATE;

  const pub = EA.publicView(data);
  const state = { tab: "map", persp: "soFar", focus: null, sel: null, motion: true, sheet: false };
  const first = () => pub.person.name.split(" ")[0];
  const tName = (id) => (pub.tById.get(id) || {}).name || "";
  const kindLabel = (e) => (EA.KINDS[e.kind] || {}).label || "";

  /* return visits: places the visitor hasn't seen before are marked new */
  const seenKey = "seen." + (opts.storageKey || pub.person.name);
  const seenBefore = EA.store.get(seenKey);
  EA.store.set(
    seenKey,
    pub.experiences.map((e) => e.id),
  );
  const seen = seenBefore ? new Set(seenBefore) : null;
  const isNew = (e) => !!seen && !seen.has(e.id);

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storedMotion = EA.store.get("motion");
  state.motion = storedMotion === null ? !mq.matches : storedMotion;

  const back = slot("back");
  if (opts.profileHref) {
    back.href = opts.profileHref;
    back.textContent = "← " + first() + "’s page";
  } else back.remove();
  if (opts.sample) {
    const b = slot("badge");
    b.hidden = false;
    b.textContent = "Example · fictional person";
  }
  slot("kindList").innerHTML = Object.keys(EA.KINDS)
    .map((k) => "<li>" + EA.glyphHTML(k, 16) + "<span>" + EA.KINDS[k].label + "</span></li>")
    .join("");

  function toast(msg) {
    const t = slot("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 3200);
  }
  function announce(msg) {
    const l = slot("live");
    l.textContent = "";
    setTimeout(() => (l.textContent = msg), 30);
  }
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const hasEstimates = pub.territories.some(
    (t) => EA.estimate(t, "soFar").known || EA.estimate(t, "now").known,
  );

  function applyMotion() {
    root.classList.toggle("reduce-motion", !state.motion);
    const b = $('[data-act="motion"]');
    b.setAttribute("aria-pressed", String(!state.motion));
    slot("motionLabel").textContent = state.motion ? "Motion on" : "Motion reduced";
    atlas && atlas.setMotion(state.motion);
  }

  /* ---------- dock ---------- */
  function perspectiveCaption() {
    if (!hasEstimates)
      return (
        first() +
        " hasn’t shared time estimates yet, so every island is drawn at the same neutral size."
      );
    const ch = EA.perspectiveChanges(pub);
    if (state.persp === "soFar")
      return (
        "Land shows roughly how many hours " + first() + " has given each part of life so far."
      );
    const bits = [];
    if (ch.up.length) bits.push("more of the week now: " + ch.up.join(", "));
    if (ch.down.length) bits.push("less: " + ch.down.join(", "));
    if (ch.resting.length) bits.push(ch.resting.join(", ") + " resting");
    return (
      "Land shows a typical week now. Compared with life so far, " +
      (bits.join("; ") || "the balance is similar") +
      "."
    );
  }
  function updateDock() {
    $$(".persp-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.persp === state.persp)),
    );
    slot("caption").textContent = perspectiveCaption();
    root.dataset.persp = state.persp;
  }
  function updateScaleKey() {
    if (!atlas || !atlas.L) return;
    const s = atlas.scaleKey();
    const px = Math.max(3, Math.min(30, s.px));
    const sq = slot("scaleSq");
    sq.style.width = sq.style.height = px.toFixed(1) + "px";
    slot("scaleLbl").textContent = "≈ " + s.label;
  }

  /* ---------- panel ---------- */
  function readingOrder() {
    return atlas && atlas.isl ? Array.from(atlas.isl.values()).map((I) => I.t) : pub.territories;
  }
  function renderPortrait() {
    const P = pub.person,
      persp = state.persp,
      ch = EA.perspectiveChanges(pub);
    const items = readingOrder()
      .map((t) => {
        const est = EA.estimate(t, persp);
        const fresh = pub.expsOf(t.id).some(isNew);
        let tag = !est.known
          ? '<span class="tag">not estimated</span>'
          : est.resting
            ? '<span class="tag">resting</span>'
            : "";
        if (persp === "now" && ch.up.includes(t.name)) tag += '<span class="tag">↑ more now</span>';
        if (persp === "now" && ch.down.includes(t.name))
          tag += '<span class="tag">↓ less now</span>';
        return (
          '<li><button type="button" class="terr-btn" data-terr="' +
          t.id +
          '"><span class="terr-name">' +
          esc(t.name) +
          "</span>" +
          '<span class="terr-est">' +
          esc(est.known ? est.short : pub.expsOf(t.id).length + " places") +
          "</span>" +
          tag +
          (fresh ? '<span class="tag tag-new">new</span>' : "") +
          "</button></li>"
        );
      })
      .join("");
    const hz = pub.horizon
      .map(
        (h) =>
          '<li><button type="button" class="link-btn" data-terr="' +
          h.t +
          '">' +
          esc(h.title) +
          "</button>" +
          (h.when ? ' <span class="muted">· ' + esc(h.when) + "</span>" : "") +
          "</li>",
      )
      .join("");
    const newOnes = pub.experiences.filter(isNew);
    return (
      '<div class="panel-head"><p class="eyebrow">Constellation</p>' +
      '<h1 class="person-name">' +
      esc(P.name) +
      "</h1>" +
      (P.title ? '<p class="person-sub">' + esc(P.title) + "</p>" : "") +
      '<button type="button" class="sheet-toggle" data-act="sheet" aria-expanded="false"><span>About ' +
      esc(first()) +
      "</span></button></div>" +
      '<div class="panel-body">' +
      (P.beyond
        ? '<section><h2 class="eyebrow">Beyond the title</h2><p class="lede">' +
          esc(P.beyond) +
          "</p></section>"
        : "") +
      '<section><h2 class="eyebrow">' +
      (persp === "soFar" ? "Parts of life · time so far" : "Parts of life · a typical week") +
      '</h2><ul class="terr-list">' +
      items +
      "</ul></section>" +
      (P.now
        ? '<section><h2 class="eyebrow">What matters now</h2><p>' + esc(P.now) + "</p></section>"
        : "") +
      (hz
        ? '<section><h2 class="eyebrow">Working toward</h2><ul class="plain horizon-list">' +
          hz +
          "</ul></section>"
        : "") +
      (newOnes.length
        ? '<section><h2 class="eyebrow">New since your last visit</h2><ul class="plain">' +
          newOnes
            .map(
              (e) =>
                '<li><button type="button" class="link-btn" data-exp="' +
                e.id +
                '">' +
                esc(e.title) +
                '</button> <span class="muted">· ' +
                esc(tName(e.t)) +
                "</span></li>",
            )
            .join("") +
          "</ul></section>"
        : "") +
      "</div>"
    );
  }
  function expRow(e) {
    return (
      '<li><button type="button" class="exp-btn' +
      (state.sel === e.id ? " is-sel" : "") +
      '" data-exp="' +
      e.id +
      '">' +
      EA.glyphHTML(e.kind, 16) +
      '<span class="exp-title">' +
      esc(e.title) +
      "</span>" +
      '<span class="exp-meta">' +
      esc(kindLabel(e)) +
      (EA.dates(e) ? " · " + esc(EA.dates(e)) : "") +
      (isNew(e) ? ' · <b class="new-text">new</b>' : "") +
      "</span></button></li>"
    );
  }
  function renderTerritory(tid) {
    const t = pub.tById.get(tid),
      exps = pub.expsOf(tid);
    const now = exps.filter(EA.isCurrent),
      earlier = exps.filter((e) => !EA.isCurrent(e));
    const s = EA.estimate(t, "soFar"),
      n = EA.estimate(t, "now");
    const hz = pub.horizon.filter((h) => h.t === tid);
    const links = pub.connections.filter(
      (c) => (pub.byId.get(c.from).t === tid) !== (pub.byId.get(c.to).t === tid),
    );
    const linkRows = links
      .map((c) => {
        const out = pub.byId.get(c.from).t === tid;
        const mine = pub.byId.get(out ? c.from : c.to),
          other = pub.byId.get(out ? c.to : c.from);
        return (
          '<li><button type="button" class="conn-mini" data-exp="' +
          mine.id +
          '"><span>' +
          esc(mine.title) +
          '</span><span class="rel">' +
          esc(EA.relPhrase(c, out).toLowerCase()) +
          "</span><span>" +
          esc(other.title) +
          ' <span class="muted">(' +
          esc(tName(other.t)) +
          ")</span></span></button></li>"
        );
      })
      .join("");
    return (
      '<div class="panel-head"><nav class="crumbs" aria-label="You are here"><button type="button" class="crumb-back" data-act="overview">← ' +
      esc(first()) +
      "’s whole map</button></nav>" +
      '<h1 class="terr-title" tabindex="-1" data-slot="terrTitle">' +
      esc(t.name) +
      "</h1>" +
      '<dl class="estimates"><div' +
      (state.persp === "soFar" ? ' class="on"' : "") +
      "><dt>Life so far</dt><dd>" +
      esc(s.label) +
      "</dd></div>" +
      "<div" +
      (state.persp === "now" ? ' class="on"' : "") +
      "><dt>Life now</dt><dd>" +
      esc(n.label) +
      "</dd></div></dl>" +
      '<button type="button" class="sheet-toggle" data-act="sheet" aria-expanded="false"><span>' +
      exps.length +
      " places</span></button></div>" +
      '<div class="panel-body">' +
      (t.blurb ? '<p class="lede">' + esc(t.blurb) + "</p>" : "") +
      (now.length
        ? '<h2 class="eyebrow">Now</h2><ul class="exp-list">' + now.map(expRow).join("") + "</ul>"
        : "") +
      (earlier.length
        ? '<h2 class="eyebrow">Earlier</h2><ul class="exp-list">' +
          earlier.map(expRow).join("") +
          "</ul>"
        : "") +
      (hz.length
        ? '<h2 class="eyebrow">Next</h2><ul class="plain horizon-list">' +
          hz
            .map(
              (h) =>
                "<li>" +
                esc(h.title) +
                (h.when ? ' <span class="muted">· ' + esc(h.when) + "</span>" : "") +
                "</li>",
            )
            .join("") +
          "</ul>"
        : "") +
      (linkRows
        ? '<h2 class="eyebrow">Links to other parts of life</h2><ul class="plain conn-mini-list">' +
          linkRows +
          "</ul>"
        : "") +
      "</div>"
    );
  }
  function renderPanel() {
    const panel = slot("panel");
    panel.innerHTML = state.focus ? renderTerritory(state.focus) : renderPortrait();
    panel.classList.toggle("is-territory", !!state.focus);
    setSheet(state.sheet);
  }
  function setSheet(open) {
    state.sheet = open;
    slot("panel").classList.toggle("sheet-open", open);
    const b = $('[data-act="sheet"]');
    b && b.setAttribute("aria-expanded", String(open));
  }

  /* ---------- detail ---------- */
  function renderMedia(e) {
    if (!e.media || !e.media.length) return "";
    return (
      '<div class="media">' +
      e.media
        .map((m) => {
          if (m.type === "image" && m.src)
            return (
              '<figure class="media-img"><img src="' +
              esc(m.src) +
              '" alt="' +
              esc(m.alt || "") +
              '" loading="lazy"></figure>'
            );
          if (m.type === "link" && m.url)
            return (
              '<p><a class="ext-link" href="' +
              esc(m.url) +
              '" target="_blank" rel="noopener noreferrer">' +
              esc(m.label || "Open link") +
              " ↗</a></p>"
            );
          return "";
        })
        .join("") +
      "</div>"
    );
  }
  function renderDetail(eid) {
    const d = slot("detail");
    slot("atlasView").classList.toggle("has-detail", !!eid);
    if (!eid) {
      d.hidden = true;
      d.innerHTML = "";
      return;
    }
    const e = pub.byId.get(eid);
    const rows = pub
      .linksOf(eid)
      .map((c) => {
        const out = c.from === eid,
          o = pub.byId.get(out ? c.to : c.from);
        return (
          '<li class="conn" data-other="' +
          o.id +
          '"><p class="conn-rel">' +
          esc(EA.relPhrase(c, out)) +
          "</p>" +
          '<button type="button" class="conn-go" data-follow="' +
          o.id +
          '">' +
          EA.glyphHTML(o.kind, 14) +
          '<span class="conn-title">' +
          esc(o.title) +
          '</span><span class="conn-where">' +
          esc(tName(o.t)) +
          (EA.dates(o) ? " · " + esc(EA.dates(o)) : "") +
          '</span><span class="go" aria-hidden="true">→</span></button>' +
          (c.note ? '<p class="conn-note">“' + esc(c.note) + "”</p>" : "") +
          '<p class="conn-src">' +
          (c.origin === "profile"
            ? "From " + esc(first()) + "’s profile"
            : "Confirmed by " + esc(first())) +
          "</p></li>"
        );
      })
      .join("");
    d.innerHTML =
      '<div class="detail-bar"><button type="button" class="detail-back" data-act="closeDetail">← ' +
      esc(tName(e.t)) +
      '</button><button type="button" class="detail-close" data-act="closeDetail" aria-label="Close details">×</button></div>' +
      '<div class="detail-scroll"><p class="kind">' +
      EA.glyphHTML(e.kind, 14) +
      " " +
      esc(kindLabel(e)) +
      " · " +
      esc(tName(e.t)) +
      "</p>" +
      '<h2 tabindex="-1" data-slot="detailTitle">' +
      esc(e.title) +
      "</h2>" +
      '<p class="when">' +
      esc(EA.dates(e)) +
      (EA.isCurrent(e) ? ' <span class="pill">ongoing</span>' : "") +
      (isNew(e) ? ' <span class="pill pill-new">new</span>' : "") +
      "</p>" +
      (e.desc ? '<p class="desc">' + esc(e.desc) + "</p>" : "") +
      (e.bullets && e.bullets.length
        ? '<ul class="bullets">' +
          e.bullets.map((b) => "<li>" + esc(b) + "</li>").join("") +
          "</ul>"
        : "") +
      renderMedia(e) +
      (e.skills && e.skills.length
        ? '<h3 class="eyebrow">Tags</h3><ul class="chips">' +
          e.skills.map((s) => "<li>" + esc(s) + "</li>").join("") +
          "</ul>"
        : "") +
      '<h3 class="eyebrow">Connected parts of ' +
      esc(first()) +
      "’s life</h3>" +
      (rows
        ? '<ul class="conn-list">' + rows + "</ul>"
        : '<p class="muted">No connections shared for this yet.</p>') +
      "</div>";
    d.hidden = false;
  }

  /* ---------- camera framing ---------- */
  function dockBottom() {
    const v = slot("atlasView").getBoundingClientRect(),
      d = $(".dock").getBoundingClientRect();
    return Math.max(60, d.bottom - v.top + 6);
  }
  function insets() {
    if (!isMobile()) {
      const hide = state.sel && root.clientWidth <= 1180;
      return { l: hide ? 0 : 392, r: state.sel ? 452 : 24, t: 8, b: 120 };
    }
    const sheet = state.sel
      ? slot("detail").getBoundingClientRect().height
      : slot("panel").getBoundingClientRect().height;
    return { l: 0, r: 48, t: dockBottom(), b: sheet + 8 };
  }
  function layoutInsets() {
    return isMobile() ? { l: 0, r: 48, t: dockBottom(), b: 190 } : { l: 392, r: 24, t: 8, b: 120 };
  }
  function syncInsets() {
    if (!atlas) return;
    atlas.layoutInsets = layoutInsets();
    atlas.setInsets(insets());
  }

  /* ---------- navigation ---------- */
  function focusTerritory(tid) {
    state.focus = tid;
    state.sel = null;
    state.sheet = false;
    renderPanel();
    renderDetail(null);
    atlas.insets = insets();
    atlas.setFocus(tid, null);
    announce(
      tName(tid) +
        ". " +
        pub.expsOf(tid).length +
        " places. Press Escape to return to the whole map.",
    );
    const h = slot("terrTitle");
    h && h.focus({ preventScroll: true });
  }
  function selectExperience(eid) {
    const e = pub.byId.get(eid);
    state.focus = e.t;
    state.sel = eid;
    state.sheet = false;
    renderPanel();
    renderDetail(eid);
    atlas.insets = insets();
    atlas.setFocus(e.t, eid);
    const h = slot("detailTitle");
    h && h.focus({ preventScroll: true });
    announce(e.title + ". " + pub.linksOf(eid).length + " connections.");
  }
  function closeDetail() {
    const was = state.sel;
    state.sel = null;
    renderDetail(null);
    renderPanel();
    atlas.insets = insets();
    atlas.setFocus(state.focus, null);
    const btn = was && $('.exp-btn[data-exp="' + was + '"]');
    (btn || slot("terrTitle")).focus({ preventScroll: true });
  }
  function toOverview() {
    const was = state.focus;
    state.focus = null;
    state.sel = null;
    renderPanel();
    renderDetail(null);
    atlas.insets = insets();
    atlas.setFocus(null, null);
    announce("Whole map. " + pub.territories.length + " parts of life.");
    const isl = was && atlas.isl.get(was);
    isl && isl.g.focus({ preventScroll: true });
  }
  function setPerspective(p) {
    state.persp = p;
    updateDock();
    atlas.setPerspective(p);
    renderPanel();
    announce((p === "now" ? "Life now. " : "Life so far. ") + perspectiveCaption());
  }
  function setTab(tab) {
    state.tab = tab;
    $$("[data-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    slot("atlasView").hidden = tab !== "map";
    slot("textView").hidden = tab !== "text";
    if (tab === "text") renderText();
    else requestAnimationFrame(syncInsets);
  }

  /* ---------- readable alternative ---------- */
  function renderText() {
    const P = pub.person;
    const secs = pub.territories
      .map((t) => {
        const li = pub
          .expsOf(t.id)
          .map((e) => {
            const links = pub
              .linksOf(e.id)
              .map((c) => {
                const out = c.from === e.id,
                  o = pub.byId.get(out ? c.to : c.from);
                return (
                  "<li>" +
                  esc(EA.relPhrase(c, out)) +
                  ': <a href="#cx-' +
                  o.id +
                  '" data-jump="cx-' +
                  o.id +
                  '">' +
                  esc(o.title) +
                  "</a> (" +
                  esc(tName(o.t)) +
                  ")" +
                  (c.note ? ". “" + esc(c.note) + "”" : "") +
                  "</li>"
                );
              })
              .join("");
            return (
              '<li id="cx-' +
              e.id +
              '"><h4>' +
              esc(e.title) +
              '</h4><p class="muted">' +
              esc(kindLabel(e)) +
              (EA.dates(e) ? " · " + esc(EA.dates(e)) : "") +
              "</p>" +
              (e.desc ? "<p>" + esc(e.desc) + "</p>" : "") +
              (links ? '<p class="small-head">Connections</p><ul>' + links + "</ul>" : "") +
              "</li>"
            );
          })
          .join("");
        return (
          '<section class="doc-sec"><h3>' +
          esc(t.name) +
          '</h3><p class="est-line"><span>Life so far: ' +
          esc(EA.estimate(t, "soFar").label) +
          "</span><span>Life now: " +
          esc(EA.estimate(t, "now").label) +
          "</span></p>" +
          (t.blurb ? "<p>" + esc(t.blurb) + "</p>" : "") +
          '<ul class="doc-exps">' +
          li +
          "</ul></section>"
        );
      })
      .join("");
    slot("textView").innerHTML =
      '<article class="doc"><p class="eyebrow">Readable version · same content as the map</p><h1>' +
      esc(P.name) +
      "</h1>" +
      (P.title ? '<p class="person-sub">' + esc(P.title) + "</p>" : "") +
      (P.beyond ? '<p class="lede">' + esc(P.beyond) + "</p>" : "") +
      "<h2>How time is spread</h2><p>These are " +
      esc(first()) +
      "’s own rough estimates, given as ranges. They show time spent, not skill, success or importance.</p>" +
      '<div class="table-wrap"><table><thead><tr><th scope="col">Part of life</th><th scope="col">Life so far</th><th scope="col">Life now (typical week)</th></tr></thead><tbody>' +
      pub.territories
        .map(
          (t) =>
            '<tr><th scope="row">' +
            esc(t.name) +
            "</th><td>" +
            esc(EA.estimate(t, "soFar").label) +
            "</td><td>" +
            esc(EA.estimate(t, "now").label) +
            "</td></tr>",
        )
        .join("") +
      "</tbody></table></div>" +
      (P.now ? "<h2>What matters now</h2><p>" + esc(P.now) + "</p>" : "") +
      (pub.horizon.length
        ? "<h2>Working toward</h2><ul>" +
          pub.horizon
            .map(
              (h) =>
                "<li>" +
                esc(h.title) +
                " · " +
                esc(tName(h.t)) +
                (h.when ? ", " + esc(h.when) : "") +
                "</li>",
            )
            .join("") +
          "</ul>"
        : "") +
      "<h2>Parts of life</h2>" +
      secs +
      "</article>";
  }

  /* ---------- boot ---------- */
  root.dataset.persp = "soFar";
  let atlas = null;
  renderPanel();
  atlas = new EA.Atlas(slot("map"), {
    onIsland: (tid) => (state.focus === tid ? null : focusTerritory(tid)),
    onMark: (eid) => selectExperience(eid),
    onSea: () => {
      if (state.sel) closeDetail();
      else if (state.focus) toOverview();
    },
    onFrame: updateScaleKey,
    isNew,
  });
  atlas.svg.setAttribute(
    "aria-label",
    "Map of " +
      pub.person.name +
      "’s life. Each island is a part of life. Tab moves between islands; arrow keys move to a neighbouring island; Enter explores.",
  );
  atlas.setMotion(state.motion);
  atlas.layoutInsets = layoutInsets();
  atlas.insets = insets();
  atlas.setData(pub);
  renderPanel();
  updateDock();
  applyMotion();
  atlas.intro();

  on(root, "click", (ev) => {
    const j = ev.target.closest("[data-jump]");
    if (j) {
      ev.preventDefault();
      const t = root.querySelector("#" + CSS.escape(j.dataset.jump));
      t && t.scrollIntoView({ block: "start" });
      return;
    }
    const t = ev.target.closest(
      "[data-tab],[data-terr],[data-exp],[data-follow],[data-act],.persp-btn",
    );
    if (!t) return;
    if (t.dataset.tab) return setTab(t.dataset.tab);
    if (t.matches(".persp-btn")) return setPerspective(t.dataset.persp);
    const act = t.dataset.act;
    if (act === "overview") return toOverview();
    if (act === "closeDetail") return closeDetail();
    if (act === "sheet") {
      setSheet(!state.sheet);
      syncInsets();
      return;
    }
    if (act === "key") {
      const k = slot("legend");
      k.hidden = !k.hidden;
      t.setAttribute("aria-expanded", String(!k.hidden));
      if (!k.hidden) slot("legendTitle").focus();
      return;
    }
    if (act === "keyClose") {
      slot("legend").hidden = true;
      const k = $('[data-act="key"]');
      k.setAttribute("aria-expanded", "false");
      k.focus();
      return;
    }
    if (act === "motion") {
      state.motion = !state.motion;
      EA.store.set("motion", state.motion);
      applyMotion();
      return;
    }
    if (act === "routes") {
      const onv = t.getAttribute("aria-pressed") !== "true";
      t.setAttribute("aria-pressed", String(onv));
      atlas.setShowAllRoutes(onv);
      return;
    }
    if (act === "zoomIn") return atlas.zoomBy(1.4);
    if (act === "zoomOut") return atlas.zoomBy(1 / 1.4);
    if (act === "recenter") return atlas.recenter();
    if (t.dataset.follow) {
      const to = t.dataset.follow;
      return atlas.travel(state.sel, to, () => selectExperience(to));
    }
    if (t.dataset.exp) {
      if (state.tab !== "map") setTab("map");
      return selectExperience(t.dataset.exp);
    }
    if (t.dataset.terr) {
      if (state.tab !== "map") setTab("map");
      return focusTerritory(t.dataset.terr);
    }
  });
  const detail = slot("detail");
  on(detail, "pointerover", (ev) => {
    const li = ev.target.closest(".conn");
    atlas.highlightRoute(li ? li.dataset.other : null);
  });
  on(detail, "focusin", (ev) => {
    const li = ev.target.closest(".conn");
    atlas.highlightRoute(li ? li.dataset.other : null);
  });
  on(slot("panel"), "pointerover", (ev) => {
    const b = ev.target.closest("[data-terr]");
    atlas.hover = b ? b.dataset.terr : null;
    atlas.update();
  });
  on(slot("panel"), "pointerleave", () => {
    atlas.hover = null;
    atlas.update();
  });
  on(document, "keydown", (ev) => {
    if (
      state.tab !== "map" ||
      (!root.contains(document.activeElement) && document.activeElement !== document.body)
    )
      return;
    if (ev.key === "Escape") {
      if (!slot("legend").hidden) {
        slot("legend").hidden = true;
        $('[data-act="key"]').focus();
        return;
      }
      if (state.sel) closeDetail();
      else if (state.focus) toOverview();
      return;
    }
    if (ev.target.closest && ev.target.closest("input,textarea,select")) return;
    if ((ev.key === "t" || ev.key === "T") && !ev.metaKey && !ev.ctrlKey && !ev.altKey)
      setPerspective(state.persp === "soFar" ? "now" : "soFar");
  });
  const onMq = () => {
    if (EA.store.get("motion") === null) {
      state.motion = !mq.matches;
      applyMotion();
    }
  };
  mq.addEventListener &&
    (mq.addEventListener("change", onMq),
    cleanups.push(() => mq.removeEventListener("change", onMq)));
  on(window, "resize", () => requestAnimationFrame(syncInsets));
  requestAnimationFrame(syncInsets);
  EA.App = { toast };

  return () => {
    cleanups.forEach((fn) => fn());
    atlas && atlas.destroy();
    root.innerHTML = "";
    root.classList.remove("constellation-app", "reduce-motion");
  };
}

export { EA };
