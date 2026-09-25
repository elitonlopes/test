/* The Constellation map: an archipelago where each island is a part of a life.
 * Land area = share of the owner's estimated time in the current perspective.
 * Rendering is plain SVG so every island and landmark is a real, focusable element. */
(function () {
  const EA = window.EA, geo = EA.geo;
  const NS = 'http://www.w3.org/2000/svg';
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
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',') + ')'; }

  const C = { lime: '#D5FF78', limeDeep: '#9FC94A', purple: '#B9A0EF', purpleDeep: '#8466D1', charcoal: '#242522', ivory: '#F7F5EF' };

  /* Kind glyphs, drawn in screen pixels around (0,0). */
  EA.glyphSVG = function (shape, parent, cls) {
    const g = el('g', { class: 'glyph ' + (cls || '') }, parent);
    switch (shape) {
      case 'square': el('rect', { x: -5, y: -5, width: 10, height: 10, rx: 1 }, g); break;
      case 'diamond': el('path', { d: 'M0-7L7 0 0 7-7 0z' }, g); break;
      case 'triangle': el('path', { d: 'M0-7L6.6 5H-6.6z' }, g); break;
      case 'dot': el('circle', { r: 6 }, g); el('circle', { r: 2.2, class: 'glyph-cut' }, g); break;
      case 'ring': el('circle', { r: 5, class: 'glyph-ring' }, g); break;
      case 'hex': el('path', { d: 'M0-7L6 -3.5 6 3.5 0 7-6 3.5-6-3.5z' }, g); break;
      case 'plus': el('path', { d: 'M-2-7h4v5h5v4h-5v5h-4v-5h-5v-4h5z' }, g); break;
      case 'star': el('path', { d: 'M0-8L2.2-2.2 8 0 2.2 2.2 0 8-2.2 2.2-8 0-2.2-2.2z' }, g); break;
      case 'flag': el('path', { d: 'M-4.5 7V-7L6.5-3.2-2.5 0.4V7z' }, g); break;
      default: el('circle', { r: 5 }, g);
    }
    return g;
  };
  EA.glyphHTML = function (kind, size) {
    const s = size || 16; const shape = (EA.KINDS[kind] || {}).shape;
    const svg = el('svg', { viewBox: '-9 -9 18 18', width: s, height: s, 'aria-hidden': 'true', class: 'glyph-icon', focusable: 'false' });
    EA.glyphSVG(shape, svg);
    return svg.outerHTML;
  };

  class Atlas {
    constructor(container, hooks) {
      this.c = container; this.hooks = hooks || {};
      this.b = 0; this.persp = 'soFar';
      this.focus = null; this.sel = null; this.hover = null;
      this.cam = { x: 500, y: 500, k: 1 };
      this.insets = { l: 0, r: 0, t: 0, b: 0 };
      this.motion = true; this.rise = 0; this.userMoved = false;
      this.showAllRoutes = false;
      this.svg = el('svg', { class: 'atlas-svg', role: 'group' }, container);
      const defs = el('defs', null, this.svg);
      const pat = el('pattern', { id: 'hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, defs);
      el('rect', { width: 7, height: 7, fill: '#2d2e2a' }, pat);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: 'rgba(247,245,239,.28)', 'stroke-width': 1.4 }, pat);
      const grad = el('radialGradient', { id: 'seaGlow', cx: '50%', cy: '45%', r: '70%' }, defs);
      el('stop', { offset: '0', 'stop-color': '#30312d' }, grad);
      el('stop', { offset: '1', 'stop-color': '#1d1e1b' }, grad);
      this.bg = el('rect', { class: 'sea', x: 0, y: 0, width: '100%', height: '100%', fill: 'url(#seaGlow)' }, this.svg);
      this.world = el('g', { class: 'world' }, this.svg);
      this.gGrid = el('g', { class: 'graticule', 'aria-hidden': 'true' }, this.world);
      this.gIso = el('g', { class: 'isobaths', 'aria-hidden': 'true' }, this.world);
      this.gIsl = el('g', { class: 'islands' }, this.world);
      this.gArcs = el('g', { class: 'arcs', 'aria-hidden': 'true' }, this.world);
      this.gHor = el('g', { class: 'horizon' }, this.world);
      this.gMarks = el('g', { class: 'marks' }, this.world);
      this.gLabels = el('g', { class: 'labels', 'aria-hidden': 'true' }, this.world);
      this.gRoutes = el('g', { class: 'routes', 'aria-hidden': 'true' }, this.world);
      this.gChips = el('g', { class: 'route-chips', 'aria-hidden': 'true' }, this.world);
      this._bindPointer();
      this._raf = null; this.anims = {};
      new ResizeObserver(() => this.relayout()).observe(container);
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
      const w = this.c.clientWidth || this.vw || 1200, h = this.c.clientHeight || this.vh || 800;
      // The composition's proportions follow the overview's free area only, so opening
      // a detail card moves the camera but never rearranges the islands.
      const li = this.layoutInsets || this.insets;
      const fw = Math.max(200, w - li.l - li.r), fh = Math.max(200, h - li.t - li.b);
      const aspect = clamp(fw / fh, 0.55, 2.1);
      if (!force && this.aspect && Math.abs(aspect - this.aspect) / this.aspect < 0.12 && this.vw) {
        const resized = w !== this.vw || h !== this.vh;
        this.vw = w; this.vh = h;
        if (resized || !this.userMoved) this.flyTo(this.targetCamera(this.persp === 'now' ? 1 : 0), resized ? 0 : 350);
        return;
      }
      this.aspect = aspect; this.vw = w; this.vh = h;
      this.W = Math.sqrt(1e6 * aspect); this.H = 1e6 / this.W;
      this.L = geo.layout(this.pub.territories, this.W, this.H);
      if (this.built) { this.build(); this.update(); }
      this.snapCamera();
    }

    /* Interpolated geometry for a territory at the current blend. */
    node(tid, bOverride) {
      const b = bOverride == null ? this.b : bOverride;
      const a = this.L.soFar.nodes.get(tid), z = this.L.now.nodes.get(tid);
      const eb = easeInOut(b);
      let r = lerp(a.r, z.r, eb);
      const order = this.order ? this.order.indexOf(tid) : 0;
      const rise = this.motion ? easeOut(clamp((this.rise - order * 0.06) / 0.55, 0, 1)) : 1;
      return { x: lerp(a.x, z.x, eb), y: lerp(a.y, z.y, eb), r: r * (0.15 + 0.85 * rise), rOther: lerp(z.r, a.r, eb), riseT: rise,
        mode: b < 0.5 ? a.mode : z.mode, from: a, to: z };
    }
    markPos(eid, bOverride) {
      const e = this.pub.byId.get(eid); const n = this.node(e.t, bOverride); const u = this.units.get(eid);
      return { x: n.x + u.ux * n.r, y: n.y + u.uy * n.r };
    }

    /* ---------------- DOM construction ---------------- */
    build() {
      this.built = true;
      [this.gGrid, this.gIso, this.gIsl, this.gHor, this.gMarks, this.gLabels].forEach((g) => (g.textContent = ''));
      const pub = this.pub;
      // graticule: faint survey lines, a quiet atlas cue
      const step = this.W / 10;
      for (let x = -this.W; x <= this.W * 2; x += step) el('line', { x1: x, y1: -this.H, x2: x, y2: this.H * 2 }, this.gGrid);
      for (let y = -this.H; y <= this.H * 2; y += step) el('line', { x1: -this.W, y1: y, x2: this.W * 2, y2: y }, this.gGrid);

      const soFar = this.L.soFar.nodes;
      this.order = pub.territories.map((t) => t.id).sort((a, b) => soFar.get(b).r - soFar.get(a).r);
      // DOM (and therefore Tab) order follows reading order: top-to-bottom, left-to-right.
      const reading = pub.territories.slice().sort((a, b) => {
        const A = soFar.get(a.id), B = soFar.get(b.id);
        return Math.abs(A.y - B.y) > 80 ? A.y - B.y : A.x - B.x;
      });
      this.isl = new Map();
      reading.forEach((t) => {
        const shape = this.shapes.get(t.id);
        const iso = [el('path', { class: 'iso iso1' }, this.gIso), el('path', { class: 'iso iso2' }, this.gIso)];
        const g = el('g', { class: 'island', 'data-id': t.id, tabindex: 0, role: 'button' }, this.gIsl);
        const tide = el('path', { class: 'tideline' }, g);
        const shallow = el('path', { class: 'shallows' }, g);
        const land = el('path', { class: 'land' }, g);
        const contours = [0.72, 0.48, 0.26].map((s, i) => el('path', { class: 'contour c' + i }, g));
        const ring = el('path', { class: 'focus-ring' }, g);
        const lab = el('g', { class: 'island-label' }, this.gLabels);
        const name = el('text', { class: 'isl-name' }, lab); name.textContent = t.name;
        const meta = el('text', { class: 'isl-meta', dy: 18 }, lab);
        g.addEventListener('click', (ev) => { if (this._dragged) return; ev.stopPropagation(); this.hooks.onIsland && this.hooks.onIsland(t.id); });
        g.addEventListener('keydown', (ev) => this._islandKey(ev, t.id));
        g.addEventListener('pointerenter', () => { this.hover = t.id; this.update(); });
        g.addEventListener('pointerleave', () => { if (this.hover === t.id) { this.hover = null; this.update(); } });
        g.addEventListener('focus', () => { this.hover = t.id; this.update(); });
        g.addEventListener('blur', () => { if (this.hover === t.id) { this.hover = null; this.update(); } });
        this.isl.set(t.id, { t, shape, g, iso, tide, shallow, land, contours, ring, lab, name, meta });
      });

      // landmarks (same elements serve as tiny dots in overview and labelled places when zoomed)
      this.marks = new Map();
      pub.experiences.forEach((e) => {
        const k = EA.KINDS[e.kind] || {};
        const g = el('g', { class: 'landmark' + (EA.isCurrent(e) ? ' current' : ' past'), 'data-id': e.id, 'data-t': e.t, tabindex: -1, role: 'button' }, this.gMarks);
        el('circle', { class: 'halo', r: 13 }, g);
        EA.glyphSVG(k.shape, g);
        const pill = el('rect', { class: 'mark-pill', rx: 5, height: 22, y: -11 }, g);
        const label = el('text', { class: 'mark-label', x: 14, y: 4.5 }, g);
        // phones get shorter map labels; the full title is in the list, the card and the aria-label
        label.textContent = this.vw < 700 && e.title.length > 24 ? e.title.slice(0, 22).trim() + '…' : e.title;
        const isNew = this.hooks.isNew && this.hooks.isNew(e);
        if (isNew) { const nb = el('g', { class: 'new-badge' }, g); el('circle', { r: 3.5, cx: 8, cy: -8 }, nb); }
        g.setAttribute('aria-label', e.title + '. ' + (k.label || '') + ', ' + EA.dates(e) + (isNew ? '. New.' : ''));
        g.addEventListener('click', (ev) => { if (this._dragged) return; ev.stopPropagation(); this.hooks.onMark && this.hooks.onMark(e.id); });
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.hooks.onMark && this.hooks.onMark(e.id); } });
        this.marks.set(e.id, { e, g, label, pill, w: 0 });
      });

      // horizon buoys: what the owner is working toward, just beyond the shore
      this.buoys = [];
      pub.horizon.forEach((h, i) => {
        const g = el('g', { class: 'buoy' }, this.gHor);
        el('circle', { r: 7, class: 'buoy-ring' }, g);
        el('path', { d: 'M-3 0h6M1-3l3 3-3 3', class: 'buoy-arrow' }, g);
        const tx = el('text', { class: 'buoy-label', x: 12, y: 4 }, g); tx.textContent = 'Next: ' + h.title;
        this.buoys.push({ h, g, tx, idx: pub.horizon.filter((x) => x.t === h.t).indexOf(h) });
      });
      this._syncAria();
      this._measure();
      if (document.fonts && !this._fontsHooked) { this._fontsHooked = true; document.fonts.ready.then(() => { this._measure(); this.update(); }); }
    }
    /* Label pills are sized to their text once; labels are hidden with visibility so they stay measurable. */
    _measure() {
      this.marks.forEach((M) => { try { M.w = M.label.getComputedTextLength(); } catch (e) { M.w = M.e.title.length * 7; } M.pill.setAttribute('width', (M.w + 14).toFixed(1)); });
    }

    _syncAria() {
      const pub = this.pub;
      this.isl.forEach((I, tid) => {
        const est = EA.estimate(I.t, this.persp);
        const count = pub.expsOf(tid).length;
        const perspTxt = this.persp === 'soFar' ? 'Life so far' : 'Life now';
        I.g.setAttribute('aria-label', I.t.name + '. ' + perspTxt + ': ' + est.label + '. ' + count + ' experience' + (count === 1 ? '' : 's') + '. Press Enter to explore.');
        if (this.focus === tid) I.g.setAttribute('aria-current', 'true'); else I.g.removeAttribute('aria-current');
      });
      this.marks.forEach((M) => {
        const active = M.e.t === this.focus || this._linked && this._linked.has(M.e.id);
        M.g.setAttribute('tabindex', active ? 0 : -1);
        M.g.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
    }

    /* ---------------- per-frame update ---------------- */
    update() {
      if (!this.built) return;
      const k = this.cam.k;
      this.world.setAttribute('transform', 'translate(' + (this.vw / 2 - this.cam.x * k).toFixed(2) + ' ' + (this.vh / 2 - this.cam.y * k).toFixed(2) + ') scale(' + k.toFixed(4) + ')');
      const eb = easeInOut(this.b);
      const land = mix(C.purple, C.lime, eb), deep = mix(C.purpleDeep, C.limeDeep, eb);
      this.svg.style.setProperty('--land', land);
      this.svg.style.setProperty('--deep', deep);
      const changes = this._changes || {};
      const inv = 1 / k;

      this.isl.forEach((I, tid) => {
        const n = this.node(tid);
        const s = I.shape;
        const mode = n.mode;
        const phase = 0;
        I.land.setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, 1, phase));
        I.shallow.setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, 1.1, phase));
        I.ring.setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, 1.18, phase));
        I.iso[0].setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, 1.3, 0.4));
        I.iso[1].setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, 1.55, 0.9));
        const showContours = n.r * k > 34 && mode !== 'unknown' && mode !== 'resting';
        I.contours.forEach((p, i) => {
          if (showContours) p.setAttribute('d', geo.blobPath(n.x, n.y, n.r, s, [0.72, 0.48, 0.26][i], 0.5 + i * 0.7));
          p.style.display = showContours ? '' : 'none';
        });
        const showTide = mode !== 'unknown' && Math.abs(n.rOther - n.r) / n.r > 0.08 && n.riseT > 0.99;
        I.tide.style.display = showTide ? '' : 'none';
        if (showTide) I.tide.setAttribute('d', geo.blobPath(n.x, n.y, n.rOther, s, 1, 0));
        I.g.setAttribute('class', 'island mode-' + mode + (this.focus === tid ? ' is-focus' : '') + (this.focus && this.focus !== tid ? ' is-dim' : '') + (this.hover === tid ? ' is-hover' : ''));

        // label
        const est = EA.estimate(I.t, this.b < 0.5 ? 'soFar' : 'now');
        const rpx = n.r * k;
        let mtxt;
        if (mode === 'unknown') mtxt = 'no estimate shared';
        else if (mode === 'resting') mtxt = 'resting for now';
        else mtxt = est.short + (mode === 'floored' ? ' ◦' : '');
        if (this.b >= 0.5 && changes.up && changes.up.includes(I.t.name)) mtxt += '  ↑ more now';
        if (this.b >= 0.5 && changes.down && changes.down.includes(I.t.name)) mtxt += '  ↓ less now';
        I.meta.textContent = mtxt;
        const inside = !this.focus && rpx > 64 && mode !== 'unknown';
        let lx = n.x, ly;
        if (this.focus === tid) ly = n.y - n.r * s.squash * 1.12 - 34 * inv;
        else if (inside) ly = n.y - 4 * inv;
        else ly = n.y + n.r * s.squash * 1.08 + 18 * inv;
        const fs = inside ? clamp(rpx * 0.16, 17, 30) : (this.focus === tid ? 26 : 16);
        I.lab.setAttribute('transform', 'translate(' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ') scale(' + inv.toFixed(4) + ')');
        I.lab.setAttribute('class', 'island-label ' + (inside ? 'on-land' : 'on-sea') + (this.focus && this.focus !== tid ? ' is-dim' : '') + (this.focus === tid ? ' is-focus' : ''));
        I.name.style.fontSize = fs + 'px';
        I.meta.setAttribute('dy', Math.round(fs * 0.62 + 10));
        I.lab.style.opacity = n.riseT;
      });

      // landmarks
      this.marks.forEach((M, eid) => {
        const p = this.markPos(eid);
        const n = this.node(M.e.t);
        const inFocus = this.focus === M.e.t;
        const linked = this._linked && this._linked.has(eid);
        const sel = this.sel === eid;
        const sc = (inFocus || linked) ? 1 : clamp(n.r * k / 140, 0.28, 0.55);
        M.g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + (inv * sc).toFixed(4) + ')');
        const nowMode = this.b >= 0.5;
        let cls = 'landmark mode-' + n.mode + (EA.isCurrent(M.e) ? ' current' : ' past');
        if (inFocus) cls += ' in-focus';
        if (linked) cls += ' linked';
        if (sel) cls += ' selected';
        if (this.focus && !inFocus && !linked) cls += ' is-dim';
        // when the view pulls back to show connections, keep only the labels that matter
        if (inFocus && !sel && !linked && this.sel && n.r * k < 150) cls += ' no-label';
        if (nowMode && !EA.isCurrent(M.e)) cls += ' faded';
        // flip labels on the left half of an island so they read away from the centre
        const u = this.units.get(eid);
        const left = u.ux < -0.12;
        M.label.setAttribute('x', left ? -16 : 16);
        M.label.setAttribute('text-anchor', left ? 'end' : 'start');
        M.pill.setAttribute('x', left ? (-16 - M.w - 7).toFixed(1) : 9);
        M.g.setAttribute('class', cls);
        M.g.style.opacity = n.riseT;
      });

      // horizon buoys, pointing outward from the composition's centre
      const cx = this.W / 2, cy = this.H / 2;
      this.buoys.forEach((B) => {
        const n = this.node(B.h.t); const s = this.shapes.get(B.h.t);
        let dx = n.x - cx, dy = n.y - cy; const d = Math.hypot(dx, dy);
        let th = d < 30 ? -0.35 : Math.atan2(dy, dx);
        th += (B.idx - 0.0) * 0.45;
        const f = geo.radiusAt(s, th, 0);
        const x = n.x + Math.cos(th) * (n.r * f + 26 * inv + 8), y = n.y + Math.sin(th) * (n.r * f * s.squash + 26 * inv + 8);
        const left = Math.cos(th) < -0.2;
        B.tx.setAttribute('x', left ? -12 : 12);
        B.tx.setAttribute('text-anchor', left ? 'end' : 'start');
        B.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + inv.toFixed(4) + ')');
        const show = this.focus === B.h.t || (!this.focus && this.hover === B.h.t);
        B.g.setAttribute('class', 'buoy' + (show ? ' show-label' : '') + (this.focus && this.focus !== B.h.t ? ' is-dim' : ''));
        B.g.style.opacity = n.riseT;
      });

      this._updateRoutes();
      this._updateArcs();
      this.hooks.onFrame && this.hooks.onFrame();
    }

    /* ---------------- routes for a selected experience ---------------- */
    _routeGeom(fromId, toId) {
      const a = this.markPos(fromId), z = this.markPos(toId);
      const mx = (a.x + z.x) / 2, my = (a.y + z.y) / 2;
      const dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy) || 1;
      const bend = Math.min(0.28 * d, 160);
      const qx = mx - (dy / d) * bend, qy = my + (dx / d) * bend;
      return { a, z, qx, qy, d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + z.x.toFixed(1) + ' ' + z.y.toFixed(1) };
    }
    setSelection(eid) {
      this.sel = eid;
      this._linked = new Set();
      this.gRoutes.textContent = ''; this.gChips.textContent = '';
      this.routes = [];
      if (eid) {
        this.pub.linksOf(eid).forEach((c) => {
          const out = c.from === eid; const other = out ? c.to : c.from;
          this._linked.add(other);
          const p = el('path', { class: 'route' + (out ? ' out' : ' in'), 'data-other': other }, this.gRoutes);
          const arrow = el('path', { class: 'route-arrow', d: 'M-6-5L3 0-6 5z' }, this.gRoutes);
          const chip = el('g', { class: 'route-chip', 'data-other': other }, this.gChips);
          const rect = el('rect', { rx: 10, height: 20, y: -10 }, chip);
          const tx = el('text', { x: 0, y: 4, 'text-anchor': 'middle' }, chip);
          tx.textContent = EA.relPhrase(c, out);
          this.routes.push({ c, out, other, p, arrow, chip, rect, tx, w: null });
        });
      }
      this._syncAria();
      this.update();
      // measure chips once text is in the DOM
      this.routes.forEach((R) => { try { R.w = R.tx.getComputedTextLength() + 20; } catch (e) { R.w = 90; } R.rect.setAttribute('width', R.w); R.rect.setAttribute('x', -R.w / 2); });
    }
    highlightRoute(otherId) {
      (this.routes || []).forEach((R) => {
        R.p.classList.toggle('hot', R.other === otherId);
        R.chip.classList.toggle('hot', R.other === otherId);
        const M = this.marks.get(R.other); if (M) M.g.classList.toggle('hot', R.other === otherId);
      });
    }
    _updateRoutes() {
      if (!this.routes || !this.sel) return;
      const inv = 1 / this.cam.k;
      this.routes.forEach((R) => {
        const from = R.out ? this.sel : R.other, to = R.out ? R.other : this.sel;
        const G = this._routeGeom(from, to);
        R.p.setAttribute('d', G.d);
        R.geom = G;
        // chip at the curve midpoint, arrowhead near the destination
        const t = 0.5, it = 1 - t;
        const mx = it * it * G.a.x + 2 * it * t * G.qx + t * t * G.z.x, my = it * it * G.a.y + 2 * it * t * G.qy + t * t * G.z.y;
        R.chip.setAttribute('transform', 'translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ') scale(' + inv.toFixed(4) + ')');
        const ta = 0.86, ia = 1 - ta;
        const ax = ia * ia * G.a.x + 2 * ia * ta * G.qx + ta * ta * G.z.x, ay = ia * ia * G.a.y + 2 * ia * ta * G.qy + ta * ta * G.z.y;
        const tx = 2 * ia * (G.qx - G.a.x) + 2 * ta * (G.z.x - G.qx), ty = 2 * ia * (G.qy - G.a.y) + 2 * ta * (G.z.y - G.qy);
        R.arrow.setAttribute('transform', 'translate(' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ') rotate(' + (Math.atan2(ty, tx) * 180 / Math.PI).toFixed(1) + ') scale(' + inv.toFixed(4) + ')');
      });
    }

    /* Overview arcs: how parts of life connect, one line per pair of islands. */
    setShowAllRoutes(on) { this.showAllRoutes = on; this.update(); }
    _updateArcs() {
      this.gArcs.textContent = '';
      const show = !this.sel && (this.showAllRoutes || (this.hover && !this.focus) || this.focus);
      if (!show) return;
      const pairs = new Map();
      this.pub.connections.forEach((c) => {
        const a = this.pub.byId.get(c.from).t, b = this.pub.byId.get(c.to).t;
        if (a === b) return;
        const only = this.showAllRoutes ? null : (this.focus || this.hover);
        if (only && a !== only && b !== only) return;
        const key = [a, b].sort().join('|');
        pairs.set(key, (pairs.get(key) || 0) + 1);
      });
      const inv = 1 / this.cam.k;
      pairs.forEach((count, key) => {
        const [a, b] = key.split('|'); const A = this.node(a), B = this.node(b);
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
        const x1 = A.x + dx / d * A.r * 0.9, y1 = A.y + dy / d * A.r * 0.9, x2 = B.x - dx / d * B.r * 0.9, y2 = B.y - dy / d * B.r * 0.9;
        const qx = (x1 + x2) / 2 - dy / d * d * 0.12, qy = (y1 + y2) / 2 + dx / d * d * 0.12;
        el('path', { class: 'arc', d: 'M' + x1 + ' ' + y1 + 'Q' + qx + ' ' + qy + ' ' + x2 + ' ' + y2, 'stroke-width': 1 + count * 0.6 }, this.gArcs);
        if (count > 1) {
          const g = el('g', { class: 'arc-count', transform: 'translate(' + (0.25 * x1 + 0.5 * qx + 0.25 * x2) + ' ' + (0.25 * y1 + 0.5 * qy + 0.25 * y2) + ') scale(' + inv + ')' }, this.gArcs);
          el('circle', { r: 9 }, g); const t = el('text', { y: 4, 'text-anchor': 'middle' }, g); t.textContent = count;
        }
      });
    }

    /* ---------------- camera ---------------- */
    setInsets(ins) { this.insets = ins; this.relayout(); }
    fitBox(x0, y0, x1, y1, pad) {
      const ins = this.insets; pad = pad == null ? 40 : pad;
      const aw = Math.max(80, this.vw - ins.l - ins.r - pad * 2), ah = Math.max(80, this.vh - ins.t - ins.b - pad * 2);
      const k = Math.min(aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0));
      // centre of the free area, expressed as a world point at the camera centre
      const fx = ins.l + pad + aw / 2, fy = ins.t + pad + ah / 2;
      const cx = (x0 + x1) / 2 - (fx - this.vw / 2) / k, cy = (y0 + y1) / 2 - (fy - this.vh / 2) / k;
      return { x: cx, y: cy, k };
    }
    targetCamera(b) {
      const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      const add = (x, y, rx, ry) => { bb.x0 = Math.min(bb.x0, x - rx); bb.y0 = Math.min(bb.y0, y - ry); bb.x1 = Math.max(bb.x1, x + rx); bb.y1 = Math.max(bb.y1, y + ry); };
      const nd = (tid) => { const a = this.L.soFar.nodes.get(tid), z = this.L.now.nodes.get(tid); const e = easeInOut(b); return { x: lerp(a.x, z.x, e), y: lerp(a.y, z.y, e), r: lerp(a.r, z.r, e) }; };
      if (!this.focus) {
        this.pub.territories.forEach((t) => { const n = nd(t.id); add(n.x, n.y, n.r * 1.2, n.r * 1.2 + 26); });
        return this.fitBox(bb.x0, bb.y0, bb.x1, bb.y1, this.vw < 700 ? 16 : 48);
      }
      const n = nd(this.focus);
      // leave room beside the island for landmark labels on narrow screens
      add(n.x, n.y, n.r * (this.vw < 700 ? 2.3 : 1.45), n.r * 1.5);
      if (this.sel) {
        this.pub.linksOf(this.sel).forEach((c) => { const o = c.from === this.sel ? c.to : c.from; const p = this.markPos(o, b); add(p.x, p.y, 30, 30); });
      }
      const cam = this.fitBox(bb.x0, bb.y0, bb.x1, bb.y1, 56);
      // never zoom so far that labels feel cramped or so close that it feels like a void
      const ov = this.fitBox(0, 0, this.W, this.H, 0);
      cam.k = Math.min(cam.k, ov.k * 7);
      return cam;
    }
    snapCamera() { this.cam = this.targetCamera(this.persp === 'now' ? 1 : 0); this.userMoved = false; this.update(); }
    flyTo(cam, dur) {
      if (!this.motion || !dur) { this.cam = cam; this.update(); return; }
      this.anims.cam = { from: Object.assign({}, this.cam), to: cam, t0: performance.now(), dur };
      this._tick();
    }
    recenter() { this.userMoved = false; this.flyTo(this.targetCamera(this.persp === 'now' ? 1 : 0), 700); }
    zoomBy(f) {
      const k = clamp(this.cam.k * f, this._kMin(), this._kMax());
      this.flyTo({ x: this.cam.x, y: this.cam.y, k }, 260); this.userMoved = true;
    }
    _kMin() { return this.fitBox(0, 0, this.W, this.H, 0).k * 0.45; }
    _kMax() { return this.fitBox(0, 0, this.W, this.H, 0).k * 9; }

    /* ---------------- state changes ---------------- */
    setMotion(ok) { this.motion = ok; if (!ok) { this.rise = 1; this.update(); } }
    intro() {
      if (!this.motion) { this.rise = 1; this.update(); return; }
      this.rise = 0; this.anims.rise = { t0: performance.now(), dur: 1500 }; this._tick();
    }
    setPerspective(p) {
      if (p === this.persp) return;
      this.persp = p;
      this._changes = EA.perspectiveChanges(this.pub);
      const to = p === 'now' ? 1 : 0;
      const dur = this.motion ? 1300 : 0;
      this._syncAria();
      if (!dur) { this.b = to; this.cam = this.targetCamera(to); this.update(); return; }
      this.anims.b = { from: this.b, to, t0: performance.now(), dur };
      if (!this.userMoved) this.anims.cam = { from: Object.assign({}, this.cam), to: this.targetCamera(to), t0: performance.now(), dur };
      this._tick();
    }
    setFocus(tid, eid) {
      this.focus = tid; this.userMoved = false;
      this.setSelection(eid || null);
      this.flyTo(this.targetCamera(this.persp === 'now' ? 1 : 0), 900);
    }
    /* Follow a connection: a light travels the route while the view moves to its destination. */
    travel(fromEid, toEid, done) {
      const R = (this.routes || []).find((r) => r.other === toEid);
      if (!this.motion || !R || !R.geom) { done(); return; }
      const dot = el('circle', { class: 'traveler', r: 6 }, this.gRoutes);
      R.p.classList.add('hot');
      const toT = this.pub.byId.get(toEid).t;
      const t0 = performance.now(), dur = 900;
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1), e = easeInOut(t), it = 1 - e, G = R.geom;
        const x = it * it * G.a.x + 2 * it * e * G.qx + e * e * G.z.x, y = it * it * G.a.y + 2 * it * e * G.qy + e * e * G.z.y;
        if (!R.out) { /* incoming route: travel from this end back to the other */ }
        const P = R.out ? { x, y } : { x: it * it * G.z.x + 2 * it * e * G.qx + e * e * G.a.x, y: it * it * G.z.y + 2 * it * e * G.qy + e * e * G.a.y };
        dot.setAttribute('cx', P.x); dot.setAttribute('cy', P.y); dot.setAttribute('r', 6 / this.cam.k);
        if (t < 1) requestAnimationFrame(step); else { dot.remove(); done(); }
      };
      requestAnimationFrame(step);
      // begin moving the camera toward the destination island now
      const keep = this.focus; this.focus = toT;
      const cam = this.targetCamera(this.persp === 'now' ? 1 : 0); this.focus = keep;
      this.anims.cam = { from: Object.assign({}, this.cam), to: { x: lerp(this.cam.x, cam.x, 0.6), y: lerp(this.cam.y, cam.y, 0.6), k: Math.min(this.cam.k, cam.k) }, t0: performance.now(), dur };
      this._tick();
    }

    _tick() {
      if (this._raf) return;
      const loop = (now) => {
        this._raf = null; let live = false;
        const A = this.anims;
        if (A.rise) { const t = clamp((now - A.rise.t0) / A.rise.dur, 0, 1); this.rise = t * 1.6; if (t >= 1) { this.rise = 1.6; delete A.rise; } else live = true; }
        if (A.b) { const t = clamp((now - A.b.t0) / A.b.dur, 0, 1); this.b = lerp(A.b.from, A.b.to, t); if (t >= 1) delete A.b; else live = true; }
        if (A.cam) {
          const t = clamp((now - A.cam.t0) / A.cam.dur, 0, 1), e = easeInOut(t), f = A.cam.from, z = A.cam.to;
          // zoom interpolated in log space so scale changes feel even
          this.cam = { x: lerp(f.x, z.x, e), y: lerp(f.y, z.y, e), k: Math.exp(lerp(Math.log(f.k), Math.log(z.k), e)) };
          if (t >= 1) delete A.cam; else live = true;
        }
        this.update();
        if (live) this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* ---------------- input ---------------- */
    _islandKey(ev, tid) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.hooks.onIsland && this.hooks.onIsland(tid); return; }
      const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
      const d = dirs[ev.key]; if (!d) return;
      ev.preventDefault();
      const a = this.node(tid); let best = null, bestScore = Infinity;
      this.isl.forEach((I, id) => {
        if (id === tid) return; const n = this.node(id);
        const dx = n.x - a.x, dy = n.y - a.y; const along = dx * d[0] + dy * d[1];
        if (along <= 0) return; const across = Math.abs(dx * d[1] - dy * d[0]);
        const score = along + across * 2; if (score < bestScore) { bestScore = score; best = id; }
      });
      if (best) this.isl.get(best).g.focus();
    }
    _bindPointer() {
      const pts = new Map(); let start = null, pinch = null;
      this.svg.addEventListener('pointerdown', (ev) => {
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        this._dragged = false;
        start = { x: ev.clientX, y: ev.clientY, cam: Object.assign({}, this.cam) };
        if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), k: this.cam.k }; }
      });
      window.addEventListener('pointermove', (ev) => {
        if (!pts.has(ev.pointerId) || !start) return;
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pinch && pts.size === 2) {
          const [p, q] = [...pts.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y);
          this.cam.k = clamp(pinch.k * d / pinch.d, this._kMin(), this._kMax()); this._dragged = true; this.userMoved = true; this.update(); return;
        }
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!this._dragged && Math.hypot(dx, dy) < 6) return;
        this._dragged = true; this.userMoved = true; delete this.anims.cam;
        this.cam.x = start.cam.x - dx / this.cam.k; this.cam.y = start.cam.y - dy / this.cam.k;
        this.svg.classList.add('dragging'); this.update();
      });
      const end = (ev) => {
        pts.delete(ev.pointerId); if (pts.size < 2) pinch = null;
        if (!pts.size) { start = null; this.svg.classList.remove('dragging'); setTimeout(() => (this._dragged = false), 0); }
      };
      window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
      this.svg.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const rect = this.svg.getBoundingClientRect();
        const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        const wx = this.cam.x + (mx - this.vw / 2) / this.cam.k, wy = this.cam.y + (my - this.vh / 2) / this.cam.k;
        const k = clamp(this.cam.k * Math.exp(-ev.deltaY * 0.0015), this._kMin(), this._kMax());
        this.cam = { x: wx - (mx - this.vw / 2) / k, y: wy - (my - this.vh / 2) / k, k };
        this.userMoved = true; delete this.anims.cam; this.update();
      }, { passive: false });
      this.svg.addEventListener('click', () => { if (this._dragged) return; this.hooks.onSea && this.hooks.onSea(); });
    }

    /* Screen size of the scale key (a square of land equal to the reference unit). */
    scaleKey() {
      const b = this.b >= 0.5 ? 'now' : 'soFar';
      const unit = this.L[b].unitArea;
      const refs = b === 'now' ? [[4, '4 hours a week'], [2, '2 hours a week'], [1, '1 hour a week'], [0.5, '30 minutes a week'], [0.25, '15 minutes a week']]
        : [[5000, '5,000 hours'], [2000, '2,000 hours'], [1000, '1,000 hours'], [500, '500 hours'], [200, '200 hours'], [100, '100 hours']];
      let pick = refs[refs.length - 1];
      for (const r of refs) { if (Math.sqrt(unit * r[0]) * this.cam.k <= 30) { pick = r; break; } }
      return { px: Math.sqrt(unit * pick[0]) * this.cam.k, label: pick[1] };
    }
  }

  EA.Atlas = Atlas;

  /* Static miniature used in the owner studio preview. */
  EA.miniMap = function (svg, pub, perspective) {
    svg.textContent = '';
    const W = 1000 * 1.5, H = 1000;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const L = geo.layout(pub.territories, W, H)[perspective];
    el('rect', { width: W, height: H, fill: C.charcoal }, svg);
    const defs = el('defs', null, svg);
    const pat = el('pattern', { id: 'hatchMini', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, defs);
    el('rect', { width: 14, height: 14, fill: '#2d2e2a' }, pat);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 14, stroke: 'rgba(247,245,239,.3)', 'stroke-width': 3 }, pat);
    const land = perspective === 'now' ? C.lime : C.purple;
    pub.territories.forEach((t) => {
      const n = L.nodes.get(t.id); const s = geo.shape(t.id);
      const unknown = n.mode === 'unknown', resting = n.mode === 'resting';
      el('path', { d: geo.blobPath(n.x, n.y, n.r, s, 1), fill: unknown ? 'url(#hatchMini)' : resting ? 'none' : land,
        stroke: unknown || resting ? C.ivory : 'none', 'stroke-width': 3, 'stroke-dasharray': unknown ? '10 8' : resting ? '3 7' : null }, svg);
      const tx = el('text', { x: n.x, y: n.y + n.r * s.squash + 40, 'text-anchor': 'middle', fill: C.ivory, 'font-size': 34, 'font-family': 'Hanken Grotesk, sans-serif' }, svg);
      tx.textContent = t.name;
    });
  };
})();
