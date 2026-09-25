/* Visitor experience: routing, panels, details, readable text view and the
 * classic profile page. Owner editing lives separately in studio.js. */
(function () {
  const EA = window.EA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = EA.esc;

  const state = { view: 'atlas', persp: 'soFar', focus: null, sel: null, motion: true, sheet: false, lastFocusEl: null };
  let pub, atlas;

  /* ---------- return visits: gentle "what's new", never streaks ---------- */
  const prevVisit = EA.store.get('lastVisit');
  const today = new Date().toISOString().slice(0, 10);
  EA.store.set('lastVisit', today);
  function isNew(e) {
    if (!e.publishedAt) return false;
    if (prevVisit && prevVisit < today) return e.publishedAt > prevVisit;
    return (Date.now() - new Date(e.publishedAt + 'T12:00:00').getTime()) / 864e5 <= 45;
  }

  /* ---------- motion preference ---------- */
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storedMotion = EA.store.get('motion');
  state.motion = storedMotion === null ? !mq.matches : storedMotion;
  function applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', !state.motion);
    const b = $('#motionBtn');
    if (b) { b.setAttribute('aria-pressed', String(!state.motion)); $('.tool-label', b).textContent = state.motion ? 'Motion on' : 'Motion reduced'; }
    atlas && atlas.setMotion(state.motion);
  }

  /* ---------- helpers ---------- */
  const tName = (id) => (pub.tById.get(id) || {}).name || '';
  const first = () => pub.person.name.split(' ')[0];
  function kindLabel(e) { return (EA.KINDS[e.kind] || {}).label || ''; }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200);
  }
  function announce(msg) { const l = $('#live'); l.textContent = ''; setTimeout(() => (l.textContent = msg), 30); }
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  /* ---------- map chrome ---------- */
  function perspectiveCaption() {
    const ch = EA.perspectiveChanges(pub);
    if (state.persp === 'soFar') {
      return 'Land shows roughly how many hours ' + first() + ' has given each part of life so far.';
    }
    const bits = [];
    if (ch.up.length) bits.push('more of the week now: ' + ch.up.join(', '));
    if (ch.down.length) bits.push('less: ' + ch.down.join(', '));
    if (ch.resting.length) bits.push(ch.resting.join(', ') + ' resting');
    return 'Land shows a typical week now. Compared with life so far, ' + (bits.join('; ') || 'the balance is similar') + '.';
  }
  function updateDock() {
    $$('.persp-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persp === state.persp)));
    $('#caption').textContent = perspectiveCaption();
    document.documentElement.dataset.persp = state.persp;
  }
  function updateScaleKey() {
    if (!atlas || !atlas.L) return;
    const s = atlas.scaleKey();
    const px = Math.max(3, Math.min(60, s.px));
    const sq = $('#scaleSq'); if (!sq) return;
    sq.style.width = sq.style.height = px.toFixed(1) + 'px';
    $('#scaleLbl').textContent = s.px > 60 ? 'this square < ' + s.label : '≈ ' + s.label;
  }

  /* ---------- panel: portrait or territory ---------- */
  function renderPortrait() {
    const P = pub.person;
    const persp = state.persp;
    const ch = EA.perspectiveChanges(pub);
    const items = atlasReadingOrder().map((t) => {
      const est = EA.estimate(t, persp);
      const exps = pub.expsOf(t.id);
      const fresh = exps.some(isNew);
      let tag = !est.known ? '<span class="tag tag-quiet">not estimated</span>' : est.resting ? '<span class="tag tag-quiet">resting</span>' : '';
      if (persp === 'now' && ch.up.includes(t.name)) tag += '<span class="tag">↑ more now</span>';
      if (persp === 'now' && ch.down.includes(t.name)) tag += '<span class="tag">↓ less now</span>';
      return '<li><button class="terr-btn" data-terr="' + t.id + '"><span class="terr-name">' + esc(t.name) + '</span>' +
        '<span class="terr-est">' + esc(est.known ? est.short : '—') + '</span>' + tag + (fresh ? '<span class="tag tag-new">new</span>' : '') + '</button></li>';
    }).join('');
    const hz = pub.horizon.map((h) => '<li><button class="link-btn" data-terr="' + h.t + '">' + esc(h.title) + '</button> <span class="muted">· ' + esc(tName(h.t)) + ', ' + esc(h.when) + '</span></li>').join('');
    const newOnes = pub.experiences.filter(isNew);
    const newHead = prevVisit && prevVisit < today ? 'New since your last visit (' + EA.fmtDate(prevVisit) + ')' : 'Added recently';
    const newList = newOnes.length ? '<h3 class="eyebrow">' + newHead + '</h3><ul class="plain">' + newOnes.map((e) => '<li><button class="link-btn" data-exp="' + e.id + '">' + esc(e.title) + '</button> <span class="muted">· ' + esc(tName(e.t)) + '</span></li>').join('') + '</ul>' : '';
    return '' +
      '<div class="panel-head">' +
      '<p class="eyebrow">Constellation</p>' +
      '<h1 class="person-name">' + esc(P.name) + '</h1>' +
      '<p class="person-sub">' + esc(P.title) + ' · ' + esc(P.place) + (P.pronouns ? ' · ' + esc(P.pronouns) : '') + '</p>' +
      '<button class="sheet-toggle" id="sheetToggle" aria-expanded="false" aria-controls="panelBody"><span>About ' + esc(first()) + '</span></button>' +
      '</div>' +
      '<div class="panel-body" id="panelBody">' +
      '<section><h2 class="eyebrow">Beyond the title</h2><p class="lede">' + esc(P.beyond) + '</p></section>' +
      '<section><h2 class="eyebrow">' + (persp === 'soFar' ? 'Parts of life · time so far' : 'Parts of life · a typical week') + '</h2><ul class="terr-list">' + items + '</ul></section>' +
      '<section><h2 class="eyebrow">What matters now</h2><p>' + esc(P.now) + '</p></section>' +
      '<section><h2 class="eyebrow">Working toward</h2><ul class="plain horizon-list">' + hz + '</ul></section>' +
      '<section class="season"><h2 class="eyebrow">' + esc(P.season.label) + ', in ' + esc(first()) + '’s words</h2><blockquote>' + esc(P.season.text) + '</blockquote>' + newList + '</section>' +
      '</div>';
  }
  function atlasReadingOrder() {
    if (!atlas || !atlas.isl) return pub.territories;
    return Array.from(atlas.isl.values()).map((I) => I.t);
  }
  function expRow(e) {
    return '<li><button class="exp-btn' + (state.sel === e.id ? ' is-sel' : '') + '" data-exp="' + e.id + '" aria-current="' + (state.sel === e.id) + '">' +
      EA.glyphHTML(e.kind, 16) + '<span class="exp-title">' + esc(e.title) + '</span>' +
      '<span class="exp-meta">' + esc(kindLabel(e)) + ' · ' + esc(EA.dates(e)) + (isNew(e) ? ' · <b class="new-text">new</b>' : '') + '</span></button></li>';
  }
  function renderTerritory(tid) {
    const t = pub.tById.get(tid);
    const exps = pub.expsOf(tid);
    const now = exps.filter(EA.isCurrent), earlier = exps.filter((e) => !EA.isCurrent(e));
    const s = EA.estimate(t, 'soFar'), n = EA.estimate(t, 'now');
    const hz = pub.horizon.filter((h) => h.t === tid);
    const links = pub.connections.filter((c) => { const a = pub.byId.get(c.from).t, b = pub.byId.get(c.to).t; return (a === tid) !== (b === tid); });
    const linkRows = links.map((c) => {
      const out = pub.byId.get(c.from).t === tid;
      const mine = pub.byId.get(out ? c.from : c.to), other = pub.byId.get(out ? c.to : c.from);
      return '<li><button class="conn-mini" data-exp="' + mine.id + '"><span>' + esc(mine.title) + '</span><span class="rel">' + esc(EA.relPhrase(c, out).toLowerCase()) + '</span><span>' + esc(other.title) + ' <span class="muted">(' + esc(tName(other.t)) + ')</span></span></button></li>';
    }).join('');
    return '' +
      '<div class="panel-head">' +
      '<nav class="crumbs" aria-label="You are here"><button class="crumb-back" id="backBtn">← ' + esc(first()) + '’s whole map</button></nav>' +
      '<h1 class="terr-title" tabindex="-1" id="terrTitle">' + esc(t.name) + '</h1>' +
      '<dl class="estimates"><div' + (state.persp === 'soFar' ? ' class="on"' : '') + '><dt>Life so far</dt><dd>' + esc(s.label) + '</dd></div>' +
      '<div' + (state.persp === 'now' ? ' class="on"' : '') + '><dt>Life now</dt><dd>' + esc(n.label) + '</dd></div></dl>' +
      (t.estimateNote ? '<p class="muted small">' + esc(t.estimateNote) + ' Shown at a neutral size.</p>' : '') +
      '<button class="sheet-toggle" id="sheetToggle" aria-expanded="false" aria-controls="panelBody"><span>' + exps.length + ' experiences</span></button>' +
      '</div>' +
      '<div class="panel-body" id="panelBody">' +
      '<p class="lede">' + esc(t.blurb) + '</p>' +
      (now.length ? '<h2 class="eyebrow">Now</h2><ul class="exp-list">' + now.map(expRow).join('') + '</ul>' : '') +
      (earlier.length ? '<h2 class="eyebrow">Earlier</h2><ul class="exp-list">' + earlier.map(expRow).join('') + '</ul>' : '') +
      (hz.length ? '<h2 class="eyebrow">Next</h2><ul class="plain horizon-list">' + hz.map((h) => '<li>' + esc(h.title) + ' <span class="muted">· ' + esc(h.when) + '</span></li>').join('') + '</ul>' : '') +
      (linkRows ? '<h2 class="eyebrow">Links to other parts of life</h2><ul class="plain conn-mini-list">' + linkRows + '</ul>' : '') +
      '</div>';
  }
  function renderPanel() {
    const panel = $('#panel');
    panel.innerHTML = state.focus ? renderTerritory(state.focus) : renderPortrait();
    panel.classList.toggle('is-territory', !!state.focus);
    setSheet(state.sheet);
  }
  function setSheet(open) {
    state.sheet = open;
    const panel = $('#panel'); panel.classList.toggle('sheet-open', open);
    const b = $('#sheetToggle'); if (b) b.setAttribute('aria-expanded', String(open));
  }

  /* ---------- detail card ---------- */
  function artSVG(e, m) {
    const r = EA.rng('art:' + e.id);
    const w = 320, h = 180; let s = '';
    const base = state.persp === 'now' ? '#D5FF78' : '#B9A0EF';
    if (m.glyph) {
      s += '<text x="24" y="150" font-family="Newsreader, Georgia, serif" font-size="150" font-weight="500" fill="#242522">' + esc(m.glyph) + '</text>';
    } else {
      for (let i = 0; i < 9; i++) {
        const y = 20 + i * 18 + r() * 8; let d = 'M0 ' + y.toFixed(1);
        for (let x = 0; x <= w; x += 40) d += ' Q' + (x + 20) + ' ' + (y + (r() - 0.5) * 30).toFixed(1) + ' ' + (x + 40) + ' ' + y.toFixed(1);
        s += '<path d="' + d + '" fill="none" stroke="#242522" stroke-opacity="' + (0.25 + r() * 0.5).toFixed(2) + '" stroke-width="1.4"/>';
      }
      s += '<circle cx="' + (60 + r() * 200).toFixed(0) + '" cy="' + (40 + r() * 100).toFixed(0) + '" r="' + (18 + r() * 26).toFixed(0) + '" fill="#242522"/>';
    }
    return '<figure class="media-art"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Illustration: ' + esc(m.caption || e.title) + '"><rect width="' + w + '" height="' + h + '" fill="' + base + '"/>' + s + '</svg>' +
      '<figcaption>' + esc(m.caption || '') + ' <span class="muted">· illustration generated for this sample</span></figcaption></figure>';
  }
  function renderMedia(e) {
    if (!e.media || !e.media.length) return '';
    return '<div class="media">' + e.media.map((m) => {
      if (m.type === 'art') return artSVG(e, m);
      if (m.type === 'audio') return '<div class="media-audio"><button class="play" data-sample="audio" aria-label="Play ' + esc(m.label) + '"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg></button><span>' + esc(m.label) + '</span><span class="wave" aria-hidden="true"></span></div>';
      if (m.type === 'link') return '<p><button class="ext-link" data-sample="link">' + esc(m.label) + ' ↗</button></p>';
      return '';
    }).join('') + '</div>';
  }
  function renderDetail(eid) {
    const d = $('#detail');
    $('#view-atlas').classList.toggle('has-detail', !!eid);
    if (!eid) { d.hidden = true; d.innerHTML = ''; return; }
    const e = pub.byId.get(eid);
    const links = pub.linksOf(eid);
    const rows = links.map((c) => {
      const out = c.from === eid; const o = pub.byId.get(out ? c.to : c.from);
      return '<li class="conn" data-other="' + o.id + '">' +
        '<p class="conn-rel">' + esc(EA.relPhrase(c, out)) + '</p>' +
        '<button class="conn-go" data-follow="' + o.id + '">' + EA.glyphHTML(o.kind, 14) + '<span class="conn-title">' + esc(o.title) + '</span><span class="conn-where">' + esc(tName(o.t)) + ' · ' + esc(EA.dates(o)) + '</span><span class="go" aria-hidden="true">→</span></button>' +
        (c.note ? '<p class="conn-note">“' + esc(c.note) + '”</p>' : '') +
        '<p class="conn-src">Confirmed by ' + esc(first()) + '</p></li>';
    }).join('');
    d.innerHTML = '' +
      '<div class="detail-bar"><button class="detail-back" id="detailBack">← ' + esc(tName(e.t)) + '</button><button class="detail-close" id="detailClose" aria-label="Close details">×</button></div>' +
      '<div class="detail-scroll">' +
      '<p class="kind">' + EA.glyphHTML(e.kind, 14) + ' ' + esc(kindLabel(e)) + ' · ' + esc(tName(e.t)) + '</p>' +
      '<h2 id="detailTitle" tabindex="-1">' + esc(e.title) + '</h2>' +
      '<p class="when">' + esc(EA.dates(e)) + (EA.isCurrent(e) ? ' <span class="pill">ongoing</span>' : '') + (isNew(e) ? ' <span class="pill pill-new">new</span>' : '') + '</p>' +
      '<p class="desc">' + esc(e.desc) + '</p>' +
      renderMedia(e) +
      (e.skills && e.skills.length ? '<h3 class="eyebrow">Skills developed</h3><ul class="chips">' + e.skills.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '') +
      '<h3 class="eyebrow">Connected parts of ' + esc(first()) + '’s life</h3>' +
      (rows ? '<ul class="conn-list">' + rows + '</ul>' : '<p class="muted">No connections shared for this yet.</p>') +
      '</div>';
    d.hidden = false;
    d.setAttribute('aria-labelledby', 'detailTitle');
  }

  /* ---------- navigation actions ---------- */
  /* The camera frames the part of the map that no panel covers. */
  function dockBottom() {
    const v = $('#view-atlas').getBoundingClientRect(), d = $('.dock').getBoundingClientRect();
    return Math.max(60, d.bottom - v.top + 6);
  }
  function insets() {
    if (!isMobile()) {
      const panelHidden = state.sel && window.innerWidth <= 1180;
      return { l: panelHidden ? 0 : 392, r: state.sel ? 452 : 24, t: 8, b: 120 };
    }
    const sheet = state.sel ? $('#detail').getBoundingClientRect().height : $('#panel').getBoundingClientRect().height;
    return { l: 0, r: 48, t: dockBottom(), b: sheet + 8 };
  }
  function layoutInsets() { return isMobile() ? { l: 0, r: 48, t: dockBottom(), b: 190 } : { l: 392, r: 24, t: 8, b: 120 }; }
  function syncInsets() { if (!atlas) return; atlas.layoutInsets = layoutInsets(); atlas.setInsets(insets()); }

  function focusTerritory(tid, opts) {
    opts = opts || {};
    state.focus = tid; state.sel = opts.sel || null; state.sheet = false;
    renderPanel(); renderDetail(state.sel);
    atlas.insets = insets(); // set before the camera computes its target
    atlas.setFocus(tid, state.sel);
    const t = pub.tById.get(tid);
    announce(t.name + '. ' + pub.expsOf(tid).length + ' experiences. Press Escape to return to the whole map.');
    if (!opts.keepFocus) { const h = $('#terrTitle'); h && h.focus({ preventScroll: true }); }
  }
  function selectExperience(eid, opts) {
    opts = opts || {};
    const e = pub.byId.get(eid);
    state.lastFocusEl = opts.returnTo || document.activeElement;
    if (state.focus !== e.t) { state.focus = e.t; }
    state.sel = eid; state.sheet = false;
    renderPanel(); renderDetail(eid);
    atlas.insets = insets();
    atlas.setFocus(e.t, eid);
    const h = $('#detailTitle'); h && h.focus({ preventScroll: true });
    announce(e.title + ', ' + EA.dates(e) + '. ' + pub.linksOf(eid).length + ' connections.');
  }
  function closeDetail() {
    const back = state.sel;
    state.sel = null; renderDetail(null); renderPanel();
    atlas.insets = insets(); atlas.setFocus(state.focus, null);
    const btn = back && $('.exp-btn[data-exp="' + back + '"]');
    (btn || $('#terrTitle')).focus({ preventScroll: true });
  }
  function toOverview() {
    const was = state.focus;
    state.focus = null; state.sel = null;
    renderPanel(); renderDetail(null);
    atlas.insets = insets(); atlas.setFocus(null, null);
    announce('Whole map. ' + pub.territories.length + ' parts of life.');
    const isl = was && atlas.isl.get(was); isl ? isl.g.focus({ preventScroll: true }) : null;
  }
  function follow(toId) {
    const from = state.sel;
    atlas.travel(from, toId, () => selectExperience(toId));
  }
  function setPerspective(p) {
    state.persp = p; updateDock(); atlas.setPerspective(p);
    renderPanel();
    announce((p === 'now' ? 'Life now. ' : 'Life so far. ') + perspectiveCaption());
  }

  /* ---------- readable alternative ---------- */
  function renderText() {
    const P = pub.person;
    const sec = pub.territories.map((t) => {
      const s = EA.estimate(t, 'soFar'), n = EA.estimate(t, 'now');
      const exps = pub.expsOf(t.id);
      const li = exps.map((e) => {
        const links = pub.linksOf(e.id).map((c) => { const out = c.from === e.id; const o = pub.byId.get(out ? c.to : c.from); return '<li>' + esc(EA.relPhrase(c, out)) + ': <a href="#x-' + o.id + '">' + esc(o.title) + '</a> (' + esc(tName(o.t)) + ')' + (c.note ? '. “' + esc(c.note) + '”' : '') + '</li>'; }).join('');
        return '<li id="x-' + e.id + '"><h4>' + esc(e.title) + '</h4><p class="muted">' + esc(kindLabel(e)) + ' · ' + esc(EA.dates(e)) + (EA.isCurrent(e) ? ' · ongoing' : '') + '</p><p>' + esc(e.desc) + '</p>' +
          (e.skills ? '<p class="muted">Skills: ' + e.skills.map(esc).join(', ') + '</p>' : '') +
          (links ? '<p class="small-head">Connections</p><ul>' + links + '</ul>' : '') + '</li>';
      }).join('');
      const hz = pub.horizon.filter((h) => h.t === t.id).map((h) => esc(h.title) + ' (' + esc(h.when) + ')').join('; ');
      return '<section class="doc-sec" id="t-' + t.id + '"><h3>' + esc(t.name) + '</h3>' +
        '<p class="est-line"><span>Life so far: ' + esc(s.label) + '</span><span>Life now: ' + esc(n.label) + '</span></p>' +
        (t.estimateNote ? '<p class="muted">' + esc(t.estimateNote) + '</p>' : '') +
        '<p>' + esc(t.blurb) + '</p>' + (hz ? '<p><strong>Next:</strong> ' + hz + '</p>' : '') + '<ul class="doc-exps">' + li + '</ul></section>';
    }).join('');
    const ch = EA.perspectiveChanges(pub);
    $('#view-text').innerHTML = '<article class="doc">' +
      '<p class="eyebrow">Readable version · same content as the map</p>' +
      '<h1>' + esc(P.name) + '</h1><p class="person-sub">' + esc(P.title) + ' · ' + esc(P.place) + '</p>' +
      '<p class="lede">' + esc(P.beyond) + '</p>' +
      '<h2>How time is spread</h2><p>These are ' + esc(first()) + '’s own rough estimates, given as ranges. They show time spent, not skill, success or importance.</p>' +
      '<div class="table-wrap"><table><caption class="sr-only">Estimated time by part of life</caption><thead><tr><th scope="col">Part of life</th><th scope="col">Life so far</th><th scope="col">Life now (typical week)</th></tr></thead><tbody>' +
      pub.territories.map((t) => '<tr><th scope="row"><a href="#t-' + t.id + '">' + esc(t.name) + '</a></th><td>' + esc(EA.estimate(t, 'soFar').label) + '</td><td>' + esc(EA.estimate(t, 'now').label) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<p>Compared with life so far, a typical week now has ' + (ch.up.length ? 'more ' + ch.up.join(' and ') : 'a similar balance') + (ch.down.length ? ', less ' + ch.down.join(' and ') : '') + (ch.resting.length ? '. ' + ch.resting.join(', ') + ' is resting' : '') + '.</p>' +
      '<h2>What matters now</h2><p>' + esc(P.now) + '</p>' +
      '<h2>Working toward</h2><ul>' + pub.horizon.map((h) => '<li>' + esc(h.title) + ' · ' + esc(tName(h.t)) + ', ' + esc(h.when) + '</li>').join('') + '</ul>' +
      '<h2>' + esc(P.season.label) + '</h2><blockquote>' + esc(P.season.text) + '</blockquote>' +
      '<h2>How the parts connect</h2><ul>' + pub.connections.map((c) => '<li><a href="#x-' + c.from + '">' + esc(pub.byId.get(c.from).title) + '</a> <em>' + esc(EA.relPhrase(c, true).toLowerCase()) + '</em> <a href="#x-' + c.to + '">' + esc(pub.byId.get(c.to).title) + '</a>' + (c.note ? ': “' + esc(c.note) + '”' : '') + '</li>').join('') + '</ul>' +
      '<p class="muted">Every connection here was written or confirmed by ' + esc(first()) + '.</p>' +
      '<h2>Parts of life</h2>' + sec + '</article>';
  }

  /* ---------- the existing personal page, preserved ---------- */
  function renderProfile() {
    const P = pub.person;
    const roles = pub.experiences.filter((e) => e.kind === 'role').sort((a, b) => b.start.localeCompare(a.start));
    const study = pub.experiences.filter((e) => e.kind === 'study').sort((a, b) => b.start.localeCompare(a.start));
    const made = pub.experiences.filter((e) => e.kind === 'creation' || e.kind === 'project').sort((a, b) => b.start.localeCompare(a.start));
    const row = (e) => '<li><div class="p-row"><strong>' + esc(e.title) + '</strong><span class="muted">' + esc(EA.dates(e)) + '</span></div><p>' + esc(e.desc) + '</p></li>';
    $('#view-profile').innerHTML = '<article class="doc profile">' +
      '<p class="eyebrow">Profile page · the classic view</p>' +
      '<div class="p-head"><div class="avatar" aria-hidden="true">' + esc(P.name.split(' ').map((w) => w[0]).join('')) + '</div><div><h1>' + esc(P.name) + '</h1><p class="person-sub">' + esc(P.title) + ' · ' + esc(P.place) + '</p></div></div>' +
      '<p class="lede">' + esc(P.beyond) + '</p>' +
      '<p><a class="btn-inline" href="#atlas">Explore ' + esc(first()) + '’s Constellation →</a></p>' +
      '<h2>Experience</h2><ul class="p-list">' + roles.map(row).join('') + '</ul>' +
      '<h2>Projects & creations</h2><ul class="p-list">' + made.map(row).join('') + '</ul>' +
      '<h2>Education</h2><ul class="p-list">' + study.map(row).join('') + '</ul></article>';
  }

  /* ---------- routing ---------- */
  function route() {
    const h = (location.hash || '#atlas').slice(1);
    const view = ['atlas', 'text', 'profile', 'studio'].includes(h) ? h : (h.startsWith('x-') || h.startsWith('t-') ? 'text' : 'atlas');
    state.view = view;
    $$('.view').forEach((v) => (v.hidden = v.id !== 'view-' + view));
    $$('.views a, .owner-link').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + view ? 'page' : 'false'));
    document.documentElement.dataset.view = view;
    if (view === 'text') { renderText(); if (h.startsWith('x-') || h.startsWith('t-')) { const t = document.getElementById(h); t && t.scrollIntoView(); } }
    if (view === 'profile') renderProfile();
    if (view === 'studio') EA.Studio.open(() => reload());
    if (view === 'atlas') { reload(); }
  }
  function reload() {
    const data = EA.store.published();
    const fresh = EA.publicView(data);
    const changed = !pub || JSON.stringify(EA.store.published()) !== reload._last;
    reload._last = JSON.stringify(data);
    pub = fresh;
    if (changed && atlas) {
      if (state.focus && !pub.tById.has(state.focus)) state.focus = null;
      if (state.sel && !pub.byId.has(state.sel)) state.sel = null;
      atlas.setData(pub); renderPanel(); renderDetail(state.sel); updateDock();
    }
    requestAnimationFrame(syncInsets);
  }

  /* ---------- boot ---------- */
  function boot() {
    pub = EA.publicView(EA.store.published());
    reload._last = JSON.stringify(EA.store.published());
    $('#sampleName').textContent = pub.person.name;
    document.title = pub.person.name.split(' ')[0] + '’s Constellation · EverAtlas';

    atlas = new EA.Atlas($('#map'), {
      onIsland: (tid) => (state.focus === tid ? null : focusTerritory(tid)),
      onMark: (eid) => selectExperience(eid),
      onSea: () => { if (state.sel) closeDetail(); else if (state.focus) toOverview(); },
      onFrame: updateScaleKey,
      isNew
    });
    atlas.svg.setAttribute('aria-label', 'Map of ' + pub.person.name + '’s life. Each island is a part of life. Tab moves between islands; arrow keys move to a neighbouring island; Enter explores.');
    atlas.svg.setAttribute('aria-describedby', 'caption');
    atlas.setMotion(state.motion);
    atlas.layoutInsets = layoutInsets();
    atlas.insets = insets();
    atlas.setData(pub);
    renderPanel(); updateDock(); applyMotion();
    atlas.intro();

    // delegated clicks for panel and detail
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-terr],[data-exp],[data-follow],[data-sample],#backBtn,#detailBack,#detailClose,#sheetToggle,.persp-btn,#keyBtn,#keyClose,#motionBtn,#routesBtn,#zoomIn,#zoomOut,#recenter');
      if (!t) return;
      if (t.matches('.persp-btn')) return setPerspective(t.dataset.persp);
      if (t.id === 'backBtn') return toOverview();
      if (t.id === 'detailBack' || t.id === 'detailClose') return closeDetail();
      if (t.id === 'sheetToggle') { setSheet(!state.sheet); syncInsets(); return; }
      if (t.id === 'keyBtn') { const k = $('#legend'); k.hidden = !k.hidden; t.setAttribute('aria-expanded', String(!k.hidden)); if (!k.hidden) $('#legendTitle').focus(); return; }
      if (t.id === 'keyClose') { $('#legend').hidden = true; $('#keyBtn').setAttribute('aria-expanded', 'false'); $('#keyBtn').focus(); return; }
      if (t.id === 'motionBtn') { state.motion = !state.motion; EA.store.set('motion', state.motion); applyMotion(); return; }
      if (t.id === 'routesBtn') { const on = t.getAttribute('aria-pressed') !== 'true'; t.setAttribute('aria-pressed', String(on)); atlas.setShowAllRoutes(on); return; }
      if (t.id === 'zoomIn') return atlas.zoomBy(1.4);
      if (t.id === 'zoomOut') return atlas.zoomBy(1 / 1.4);
      if (t.id === 'recenter') return atlas.recenter();
      if (t.dataset.sample) return toast(t.dataset.sample === 'audio' ? 'Sample audio isn’t included in this prototype.' : 'This is a sample link with no real destination.');
      if (t.dataset.follow) return follow(t.dataset.follow);
      if (t.dataset.exp) { if (state.view !== 'atlas') location.hash = '#atlas'; return selectExperience(t.dataset.exp, { returnTo: t }); }
      if (t.dataset.terr) { if (state.view !== 'atlas') location.hash = '#atlas'; return focusTerritory(t.dataset.terr); }
    });
    // previewing a connection highlights its route on the map
    $('#detail').addEventListener('pointerover', (ev) => { const li = ev.target.closest('.conn'); atlas.highlightRoute(li ? li.dataset.other : null); });
    $('#detail').addEventListener('focusin', (ev) => { const li = ev.target.closest('.conn'); atlas.highlightRoute(li ? li.dataset.other : null); });
    $('#panel').addEventListener('pointerover', (ev) => { const b = ev.target.closest('[data-terr]'); atlas.hover = b ? b.dataset.terr : null; atlas.update(); });
    $('#panel').addEventListener('pointerleave', () => { atlas.hover = null; atlas.update(); });

    document.addEventListener('keydown', (ev) => {
      if (state.view !== 'atlas') return;
      if (ev.key === 'Escape') {
        if (!$('#legend').hidden) { $('#legend').hidden = true; $('#keyBtn').focus(); return; }
        if (state.sel) closeDetail(); else if (state.focus) toOverview();
      }
      if (ev.target.closest('input,textarea,select')) return;
      if (ev.key === 't' || ev.key === 'T') setPerspective(state.persp === 'soFar' ? 'now' : 'soFar');
    });
    mq.addEventListener && mq.addEventListener('change', () => { if (EA.store.get('motion') === null) { state.motion = !mq.matches; applyMotion(); } });
    window.addEventListener('resize', () => requestAnimationFrame(syncInsets));
    window.addEventListener('hashchange', route);
    route();
  }
  EA.App = { boot, toast };
  document.addEventListener('DOMContentLoaded', boot);
})();
