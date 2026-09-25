/* Owner studio: choose what to include, give rough estimates, confirm connections.
 * Edits go to a draft; visitors only ever see what the owner publishes. */
(function () {
  const EA = window.EA;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = EA.esc;
  let draft, published, onPublish, previewPersp = 'soFar';

  const REL_OPTS = Object.keys(EA.RELATIONS).map((k) => '<option value="' + k + '">' + esc(EA.RELATIONS[k].out) + '</option>').join('');
  function relSelect(id, value) { return '<select id="' + id + '" data-f="rel">' + REL_OPTS.replace('value="' + value + '"', 'value="' + value + '" selected') + '</select>'; }
  function bucketSelect(id, persp, value) {
    const none = '<option value="">Not sure / rather not say</option>';
    return '<select id="' + id + '" data-persp="' + persp + '">' + none + EA.BUCKETS[persp].map((b) => '<option value="' + b.id + '"' + (b.id === value ? ' selected' : '') + '>' + esc(b.label) + '</option>').join('') + '</select>';
  }
  const expTitle = (id) => (draft.experiences.find((e) => e.id === id) || {}).title || '(removed)';
  const terrName = (id) => (draft.territories.find((t) => t.id === id) || {}).name || '';
  function expOptions(selected) {
    return draft.territories.map((t) => '<optgroup label="' + esc(t.name) + '">' + draft.experiences.filter((e) => e.t === t.id && e.include && !e.private).map((e) => '<option value="' + e.id + '"' + (e.id === selected ? ' selected' : '') + '>' + esc(e.title) + '</option>').join('') + '</optgroup>').join('');
  }

  function save() { EA.store.saveDraft(draft); refreshSide(); }

  function render() {
    const root = $('#view-studio');
    const P = draft.person;
    const suggestions = draft.connections.filter((c) => c.status === 'suggested');
    const confirmed = draft.connections.filter((c) => c.status === 'confirmed');
    const hidden = EA.hiddenConnections(draft);
    const hiddenIds = new Set(hidden.map((h) => h.c.id));

    root.innerHTML = '' +
      '<div class="studio">' +
      '<header class="studio-head">' +
      '<div><p class="eyebrow">Owner studio · only you see this page</p><h1>Your Constellation</h1>' +
      '<p class="studio-intro">EverAtlas builds the map from your profile. You decide what’s included, give rough time estimates and confirm how things connect. The layout and design are automatic.</p></div>' +
      '<div class="studio-actions"><p id="draftStatus" class="draft-status" role="status"></p>' +
      '<div class="row"><button class="btn primary" id="publishBtn">Publish changes</button><button class="btn" id="discardBtn">Discard draft</button><a class="btn ghost" href="#atlas">View as a visitor</a></div></div>' +
      '</header>' +
      '<div class="studio-grid"><div class="studio-main">' +

      '<section class="card" aria-labelledby="s-time"><h2 id="s-time">1. Parts of your life and rough time</h2>' +
      '<p class="help">Rough is fine. Pick a range and visitors see that range, never a precise figure. Choose “Not sure” and the island is drawn at a neutral size with no number. Time is shown as time only, not as skill or importance.</p>' +
      '<div class="table-wrap"><table class="terr-table"><thead><tr><th scope="col">Show</th><th scope="col">Part of life</th><th scope="col">Life so far (total)</th><th scope="col">Life now (typical week)</th></tr></thead><tbody>' +
      draft.territories.map((t, i) => '<tr data-t="' + t.id + '"><td><input type="checkbox" id="tin-' + t.id + '" data-f="include"' + (t.include ? ' checked' : '') + ' aria-label="Show ' + esc(t.name) + '"></td>' +
        '<td><input type="text" id="tname-' + t.id + '" data-f="name" value="' + esc(t.name) + '" aria-label="Name for this part of life"></td>' +
        '<td>' + bucketSelect('tsf-' + t.id, 'soFar', t.soFar).replace('<select', '<select aria-label="' + esc(t.name) + ', life so far"') + '</td>' +
        '<td>' + bucketSelect('tnw-' + t.id, 'now', t.now).replace('<select', '<select aria-label="' + esc(t.name) + ', life now"') + '</td></tr>').join('') +
      '</tbody></table></div></section>' +

      '<section class="card" aria-labelledby="s-items"><h2 id="s-items">2. From your profile</h2>' +
      '<p class="help">These come from your existing EverAtlas profile. Tick what visitors may see. Anything unticked stays out of the map, the text version and every connection.</p>' +
      draft.territories.map((t) => {
        const items = draft.experiences.filter((e) => e.t === t.id);
        if (!items.length) return '';
        return '<fieldset class="items"><legend>' + esc(t.name) + '</legend>' + items.map((e) =>
          '<label class="item' + (e.private ? ' is-private' : '') + '"><input type="checkbox" id="ein-' + e.id + '" data-e="' + e.id + '"' + (e.include && !e.private ? ' checked' : '') + (e.private ? ' disabled' : '') + '> ' +
          EA.glyphHTML(e.kind, 14) + ' <span>' + esc(e.title) + '</span> <span class="muted">' + esc(EA.dates(e)) + (e.private ? ' · private in your profile' : '') + '</span></label>').join('') + '</fieldset>';
      }).join('') + '</section>' +

      '<section class="card" aria-labelledby="s-conn"><h2 id="s-conn">3. Connections</h2>' +
      '<p class="help">Connections show how one part of your life shaped another. Visitors only see connections you’ve confirmed, and only when both ends are published.</p>' +
      (suggestions.length ? '<h3>Suggested by EverAtlas <span class="muted">(visitors never see these)</span></h3><ul class="sugg-list">' + suggestions.map((c) =>
        '<li class="sugg" data-c="' + c.id + '"><p class="sugg-line"><strong>' + esc(expTitle(c.from)) + '</strong> <span class="rel">' + esc(EA.RELATIONS[c.rel].out.toLowerCase()) + '</span> <strong>' + esc(expTitle(c.to)) + '</strong></p>' +
        '<p class="muted small">Why suggested: ' + esc(c.why || '') + ' Confirm only if this is true for you.</p>' +
        '<div class="row"><label class="sr-only" for="srel-' + c.id + '">Relationship</label>' + relSelect('srel-' + c.id, c.rel) +
        '<label class="sr-only" for="snote-' + c.id + '">In your words (optional)</label><input type="text" id="snote-' + c.id + '" placeholder="In your words (optional)">' +
        '<button class="btn small primary" data-act="confirm" data-c="' + c.id + '">Confirm</button><button class="btn small" data-act="dismiss" data-c="' + c.id + '">Not true</button></div></li>').join('') + '</ul>' : '<p class="muted">No suggestions waiting.</p>') +
      '<h3>Confirmed</h3><ul class="conf-list">' + confirmed.map((c) =>
        '<li class="conf' + (hiddenIds.has(c.id) ? ' is-hidden' : '') + '" data-c="' + c.id + '"><p><strong>' + esc(expTitle(c.from)) + '</strong> → <strong>' + esc(expTitle(c.to)) + '</strong></p>' +
        (hiddenIds.has(c.id) ? '<p class="warn">Not shown to visitors: “' + esc(hidden.find((h) => h.c.id === c.id).blocked.map((b) => b.title).join('”, “')) + '” is private or unpublished.</p>' : '') +
        '<div class="row"><label class="sr-only" for="crel-' + c.id + '">Relationship</label>' + relSelect('crel-' + c.id, c.rel) +
        '<label class="sr-only" for="cnote-' + c.id + '">Note</label><input type="text" id="cnote-' + c.id + '" value="' + esc(c.note) + '" placeholder="In your words (optional)">' +
        '<button class="btn small" data-act="remove" data-c="' + c.id + '">Remove</button></div></li>').join('') + '</ul>' +
      '<h3>Add a connection</h3><div class="add-conn"><label>From<select id="newFrom">' + expOptions() + '</select></label>' +
      '<label>Relationship<select id="newRel">' + REL_OPTS + '</select></label>' +
      '<label>To<select id="newTo">' + expOptions(draft.experiences[3] && draft.experiences[3].id) + '</select></label>' +
      '<label class="wide">In your words<input type="text" id="newNote" placeholder="e.g. The recordings became the tram’s stop sounds."></label>' +
      '<button class="btn" id="addConn">Add connection</button></div></section>' +

      '<section class="card" aria-labelledby="s-next"><h2 id="s-next">4. What you’re working toward</h2>' +
      '<p class="help">These appear as buoys just offshore from the related island.</p><ul class="hz-edit">' +
      draft.horizon.map((h, i) => '<li data-h="' + i + '"><input type="text" id="hzt-' + i + '" data-f="title" value="' + esc(h.title) + '" aria-label="Goal">' +
        '<input type="text" id="hzw-' + i + '" data-f="when" value="' + esc(h.when) + '" aria-label="When">' +
        '<select id="hzp-' + i + '" data-f="t" aria-label="Part of life">' + draft.territories.map((t) => '<option value="' + t.id + '"' + (t.id === h.t ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select>' +
        '<button class="btn small" data-act="hzdel" data-h="' + i + '" aria-label="Remove ' + esc(h.title) + '">Remove</button></li>').join('') +
      '</ul><button class="btn small" id="hzAdd">Add a goal</button></section>' +

      '<section class="card" aria-labelledby="s-words"><h2 id="s-words">5. In your words</h2>' +
      '<label class="field">Beyond your title<textarea id="pBeyond" rows="3">' + esc(P.beyond) + '</textarea></label>' +
      '<label class="field">What matters now<textarea id="pNow" rows="2">' + esc(P.now) + '</textarea></label>' +
      '<label class="field">This season’s note<textarea id="pSeason" rows="3">' + esc(P.season.text) + '</textarea></label>' +
      '</section>' +

      '<p class="muted small">Prototype note: changes are kept in this browser only. <button class="link-btn" id="resetAll">Reset to the original sample</button></p>' +
      '</div>' +

      '<aside class="studio-side" aria-label="Preview"><div class="card sticky">' +
      '<h2>Preview</h2><div class="seg" role="group" aria-label="Preview perspective"><button class="seg-btn" data-pp="soFar" aria-pressed="true">Life so far</button><button class="seg-btn" data-pp="now" aria-pressed="false">Life now</button></div>' +
      '<svg id="miniMap" class="mini-map" role="img" aria-label="Preview of the map composition"></svg>' +
      '<p class="muted small">The composition is generated for you. Islands keep their place when estimates change.</p>' +
      '<h3>Changes in this draft</h3><ul id="diffList" class="diff-list"></ul></div></aside>' +
      '</div></div>';
    refreshSide();
  }

  function refreshSide() {
    const diff = EA.diff(published, draft);
    $('#diffList').innerHTML = diff.length ? diff.map((d) => '<li>' + esc(d) + '</li>').join('') : '<li class="muted">Nothing changed since you last published.</li>';
    $('#draftStatus').textContent = diff.length ? diff.length + ' unpublished change' + (diff.length === 1 ? '' : 's') : 'Everything is published';
    $('#publishBtn').disabled = !diff.length; $('#discardBtn').disabled = !diff.length;
    document.querySelectorAll('[data-pp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pp === previewPersp)));
    EA.miniMap($('#miniMap'), EA.publicView(draft), previewPersp);
  }

  function bind() {
    const root = $('#view-studio');
    root.addEventListener('change', (ev) => {
      const t = ev.target;
      const row = t.closest('tr[data-t]');
      if (row) {
        const terr = draft.territories.find((x) => x.id === row.dataset.t);
        if (t.dataset.f === 'include') terr.include = t.checked;
        if (t.dataset.persp) terr[t.dataset.persp] = t.value || null;
        return save();
      }
      if (t.dataset.e) { const e = draft.experiences.find((x) => x.id === t.dataset.e); e.include = t.checked; return save(); }
      const conf = t.closest('li.conf');
      if (conf && t.dataset.f === 'rel') { draft.connections.find((c) => c.id === conf.dataset.c).rel = t.value; return save(); }
      const hz = t.closest('li[data-h]');
      if (hz && t.dataset.f === 't') { draft.horizon[+hz.dataset.h].t = t.value; return save(); }
    });
    root.addEventListener('input', (ev) => {
      const t = ev.target;
      const row = t.closest('tr[data-t]');
      if (row && t.dataset.f === 'name') { draft.territories.find((x) => x.id === row.dataset.t).name = t.value; return save(); }
      const conf = t.closest('li.conf');
      if (conf && t.id.startsWith('cnote-')) { draft.connections.find((c) => c.id === conf.dataset.c).note = t.value; return save(); }
      const hz = t.closest('li[data-h]');
      if (hz && t.dataset.f && t.dataset.f !== 't') { draft.horizon[+hz.dataset.h][t.dataset.f] = t.value; return save(); }
      if (t.id === 'pBeyond') { draft.person.beyond = t.value; return save(); }
      if (t.id === 'pNow') { draft.person.now = t.value; return save(); }
      if (t.id === 'pSeason') { draft.person.season.text = t.value; return save(); }
    });
    root.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      const cid = b.dataset.c;
      if (b.dataset.pp) { previewPersp = b.dataset.pp; return refreshSide(); }
      if (b.dataset.act === 'confirm') {
        const c = draft.connections.find((x) => x.id === cid);
        c.status = 'confirmed'; c.origin = 'owner-confirmed'; c.rel = $('#srel-' + cid).value; c.note = $('#snote-' + cid).value.trim();
        save(); render(); EA.App.toast('Connection confirmed. It will appear after you publish.'); return;
      }
      if (b.dataset.act === 'dismiss') { draft.connections = draft.connections.filter((x) => x.id !== cid); save(); render(); EA.App.toast('Suggestion dismissed.'); return; }
      if (b.dataset.act === 'remove') { draft.connections = draft.connections.filter((x) => x.id !== cid); save(); render(); return; }
      if (b.dataset.act === 'hzdel') { draft.horizon.splice(+b.dataset.h, 1); save(); render(); return; }
      if (b.id === 'hzAdd') { draft.horizon.push({ id: 'h' + Date.now(), t: draft.territories[0].id, title: 'New goal', when: 'Soon' }); save(); render(); $('#hzt-' + (draft.horizon.length - 1)).select(); return; }
      if (b.id === 'addConn') {
        const from = $('#newFrom').value, to = $('#newTo').value;
        if (from === to) { EA.App.toast('Choose two different experiences.'); return; }
        draft.connections.push({ id: 'n' + Date.now(), from, to, rel: $('#newRel').value, status: 'confirmed', origin: 'owner', note: $('#newNote').value.trim() });
        save(); render(); EA.App.toast('Connection added to your draft.'); return;
      }
      if (b.id === 'publishBtn') { EA.store.publish(draft); published = EA.store.published(); draft = EA.store.draft(); onPublish && onPublish(); render(); EA.App.toast('Published. Visitors now see these changes.'); return; }
      if (b.id === 'discardBtn') { EA.store.discardDraft(); draft = EA.store.draft(); render(); EA.App.toast('Draft discarded.'); return; }
      if (b.id === 'resetAll') { EA.store.resetAll(); published = EA.store.published(); draft = EA.store.draft(); onPublish && onPublish(); render(); EA.App.toast('Reset to the original sample.'); return; }
    });
  }

  let bound = false;
  EA.Studio = {
    open(cb) {
      onPublish = cb;
      published = EA.store.published(); draft = EA.store.draft();
      render();
      if (!bound) { bind(); bound = true; }
    }
  };
})();
