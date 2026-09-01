/* Food Poker — all app logic. No build step, no dependencies.
   State lives in localStorage under one key so export/import is a single blob. */
(function () {
'use strict';

var KEY = 'foodpoker.v1';

var EFFORT_LABEL     = ['', '15 minutes', 'Easy', 'Some work', 'A project', 'An event'];
var INDULGENCE_LABEL = ['', 'Virtuous', 'Balanced', 'Middle', 'Rich', 'Full send'];

var $  = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ================================================================
   State
   ================================================================ */

var state;

function newId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function freshState() {
  return {
    v: 1,
    meals: SEED_MEALS.map(function (m) {
      return {
        id: newId(),
        name: m.name,
        effort: m.effort,
        indulgence: m.indulgence,
        health: m.health,
        rating: m.rating,
        chips: (m.chips || []).slice(0, 3),
        notable: (m.notable || []).slice(),
        dateNight: !!m.dateNight
      };
    }),
    settings: { count: 5, adventure: 35, indulgence: 45, dateNight: false },
    hand: [],
    checked: {},
    history: []
  };
}

function load() {
  var raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (!raw) return freshState();
  try {
    var s = JSON.parse(raw);
    if (!s || !Array.isArray(s.meals)) return freshState();
    s.settings = Object.assign({ count: 5, adventure: 35, indulgence: 45, dateNight: false }, s.settings);
    s.hand    = Array.isArray(s.hand) ? s.hand : [];
    s.checked = s.checked && typeof s.checked === 'object' ? s.checked : {};
    s.history = Array.isArray(s.history) ? s.history : [];
    return s;
  } catch (e) {
    return freshState();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
}

function mealById(id) {
  for (var i = 0; i < state.meals.length; i++) if (state.meals[i].id === id) return state.meals[i];
  return null;
}

/* Hand slots can outlive the meals they point at (deleted from the deck). */
function liveHand() {
  return state.hand.filter(function (slot) { return !!mealById(slot.mealId); });
}

/* ================================================================
   The deal
   ================================================================ */

/* Two dials shape the odds:

   Vibe      slides a target effort from 1..5 and prefers cards near it.
   Dial      sets a ceiling on indulgence. Cards above the ceiling are
             effectively out of the deck; sliding right raises it, which is
             what "introduces the less healthy options". Sliding all the way
             right also softly fades the most virtuous cards so the week
             actually feels different — it never removes them.               */
function weightFor(meal, o) {
  var targetEffort = 1 + (o.adventure / 100) * 4;
  var ceiling      = 1 + (o.indulgence / 100) * 4;

  var sigma = 1.35;
  var d = meal.effort - targetEffort;
  var w = Math.exp(-(d * d) / (2 * sigma * sigma));

  var over = meal.indulgence - (ceiling + 0.6);
  if (over > 0) w *= Math.exp(-(over * over) * 2.2);

  var under = (ceiling - 1.2) - meal.indulgence;
  if (under > 0) w *= 1 / (1 + 0.35 * under);

  w *= 0.6 + (meal.rating / 5) * 0.8;

  var seen = o.history.indexOf(meal.id);
  if (seen > -1) w *= Math.min(1, 0.22 + 0.16 * seen);

  return Math.max(w, 0.0005);
}

function pickWeighted(pool, used, opts, scorer) {
  var cands = pool.filter(function (m) { return !used.has(m.id); });
  if (!cands.length) return null;

  var weights = cands.map(function (m) { return scorer(m, opts); });
  var total = weights.reduce(function (a, b) { return a + b; }, 0);
  if (!(total > 0)) return cands[Math.floor(Math.random() * cands.length)];

  var r = Math.random() * total;
  for (var i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}

/* Date night wants the big, involved, well-loved stuff regardless of the dials. */
function dateScore(meal, o) {
  var w = 1 + meal.effort * 0.9;
  w *= 0.5 + (meal.rating / 5);
  var seen = o.history.indexOf(meal.id);
  if (seen > -1) w *= Math.min(1, 0.2 + 0.16 * seen);
  return Math.max(w, 0.001);
}

function drawDateNight(used, opts) {
  var special = state.meals.filter(function (m) { return m.dateNight; });
  var pick = pickWeighted(special, used, opts, dateScore);
  if (pick) return pick;
  /* No cards flagged for date night (or all already in the hand) —
     fall back to the most involved thing left. */
  return pickWeighted(state.meals, used, opts, dateScore);
}

function deal() {
  var s = state.settings;
  var opts = { adventure: s.adventure, indulgence: s.indulgence, history: state.history };

  var kept = liveHand().filter(function (slot) { return slot.locked; });
  var used = new Set(kept.map(function (slot) { return slot.mealId; }));

  var out = kept.filter(function (slot) { return !slot.isDate; });

  var guard = 0;
  while (out.length < s.count && guard++ < 200) {
    var pick = pickWeighted(state.meals, used, opts, weightFor);
    if (!pick) break;
    used.add(pick.id);
    out.push({ mealId: pick.id, locked: false, isDate: false });
  }

  if (s.dateNight) {
    var heldDate = kept.filter(function (slot) { return slot.isDate; })[0];
    if (heldDate) {
      out.push(heldDate);
    } else {
      var dn = drawDateNight(used, opts);
      if (dn) { used.add(dn.id); out.push({ mealId: dn.id, locked: false, isDate: true }); }
    }
  }

  state.hand = out;
  remember(out);
  save();
  renderHand();
  renderList();

  var short = out.filter(function (x) { return !x.isDate; }).length < s.count;
  hint(short
    ? 'Dealt ' + out.length + ' — the deck ran out under these settings.'
    : summaryText());
}

function rerollSlot(index) {
  var s = state.settings;
  var opts = { adventure: s.adventure, indulgence: s.indulgence, history: state.history };
  var slot = state.hand[index];
  if (!slot) return;

  var used = new Set(state.hand.map(function (x) { return x.mealId; }));
  var pick = slot.isDate ? drawDateNight(used, opts)
                         : pickWeighted(state.meals, used, opts, weightFor);
  if (!pick) { toast('Nothing left to swap in'); return; }

  slot.mealId = pick.id;
  slot.locked = false;
  remember([slot]);
  save();
  renderHand();
  renderList();
}

/* Recently dealt meals get down-weighted so weeks don't rhyme. */
function remember(slots) {
  slots.forEach(function (slot) {
    var i = state.history.indexOf(slot.mealId);
    if (i > -1) state.history.splice(i, 1);
    state.history.unshift(slot.mealId);
  });
  state.history = state.history.slice(0, 12);
}

/* ================================================================
   Small helpers
   ================================================================ */

function healthColor(score) {
  return 'hsl(' + Math.round((Math.max(0, Math.min(100, score)) / 100) * 130) + ' 60% 42%)';
}

function starRow(n, cls) {
  var out = '';
  for (var i = 1; i <= 5; i++) out += '<span class="' + (i <= n ? '' : (cls || 'off')) + '">&#9733;</span>';
  return out;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function nameClass(name) {
  if (name.length > 26) return 'card-name xlong';
  if (name.length > 15) return 'card-name long';
  return 'card-name';
}

var toastTimer;
function toast(msg) {
  var el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 2000);
}

function hint(msg) { $('#dealHint').textContent = msg; }

function summaryText() {
  var s = state.settings;
  return s.count + ' meals' + (s.dateNight ? ' + date night' : '') + ' · tap a card to flip it';
}

function vibeLabel(v) {
  if (v < 16) return 'Bare minimum';
  if (v < 36) return 'Easy week';
  if (v < 65) return 'Balanced';
  if (v < 85) return "Let's cook";
  return 'Chef mode';
}

function dialLabel(v) {
  if (v < 13) return 'Squeaky clean';
  if (v < 33) return 'Healthy';
  if (v < 56) return 'Mostly good';
  if (v < 79) return 'Loosening up';
  return 'Full send';
}

/* ================================================================
   Render — the hand
   ================================================================ */

function renderHand() {
  var wrap = $('#hand');
  var hand = liveHand();
  if (hand.length !== state.hand.length) { state.hand = hand; save(); }

  $('#handEmpty').hidden = hand.length > 0;
  wrap.innerHTML = '';

  hand.forEach(function (slot, i) {
    var meal = mealById(slot.mealId);
    var slotEl = document.createElement('div');
    slotEl.className = 'slot' + (slot.locked ? ' locked' : '');
    slotEl.style.animationDelay = (i * 45) + 'ms';

    slotEl.innerHTML =
      '<div class="card" role="button" tabindex="0" aria-label="' + esc(meal.name) + ', tap to flip">' +
        '<div class="face front">' +
          '<div class="front-pad">' +
            '<div class="card-top">' +
              (slot.isDate ? '<span class="badge date">Date night</span>'
                           : '<span class="badge">' + esc(EFFORT_LABEL[meal.effort]) + '</span>') +
              '<span class="health-dot" style="background:' + healthColor(meal.health) + '" ' +
                'title="Health score">' + meal.health + '</span>' +
            '</div>' +
            '<div class="' + nameClass(meal.name) + '">' + esc(meal.name) + '</div>' +
            '<div class="card-foot">' +
              '<span class="stars">' + starRow(meal.rating) + '</span>' +
              '<span class="flip-hint">flip &#8635;</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="face back"><div class="back-inner">' +
          '<div class="back-title">' + esc(meal.name) + '</div>' +
          '<div class="metric">' +
            '<div class="metric-row"><span>Health</span><span>' + meal.health + '/100</span></div>' +
            '<div class="bar"><i style="width:' + meal.health + '%;background:' +
              healthColor(meal.health) + '"></i></div>' +
          '</div>' +
          '<div class="metric">' +
            '<div class="metric-row"><span>Indulgence</span><span>' +
              esc(INDULGENCE_LABEL[meal.indulgence]) + '</span></div>' +
            '<div class="bar"><i style="width:' + (meal.indulgence / 5) * 100 +
              '%;background:#d8543f"></i></div>' +
          '</div>' +
          (meal.chips.length
            ? '<div class="chips">' + meal.chips.map(function (c) {
                return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>'
            : '') +
          '<div class="need-title">Pick up</div>' +
          (meal.notable.length
            ? '<ul class="needs">' + meal.notable.map(function (n) {
                return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>'
            : '<p class="needs-none">Nothing special.</p>') +
        '</div></div>' +
      '</div>' +
      '<div class="slot-tools">' +
        '<button class="tool' + (slot.locked ? ' on' : '') + '" data-act="lock" ' +
          'aria-label="' + (slot.locked ? 'Unlock' : 'Lock') + ' ' + esc(meal.name) + '">' +
          (slot.locked ? 'Locked' : 'Lock') + '</button>' +
        '<button class="tool" data-act="reroll" aria-label="Swap out ' + esc(meal.name) + '">Swap</button>' +
        '<button class="tool" data-act="remove" aria-label="Remove ' + esc(meal.name) + '">Drop</button>' +
      '</div>';

    var card = $('.card', slotEl);
    card.addEventListener('click', function () { slotEl.classList.toggle('flipped'); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slotEl.classList.toggle('flipped'); }
    });

    $$('.tool', slotEl).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        var idx = state.hand.indexOf(slot);
        if (idx < 0) return;
        if (act === 'lock') {
          slot.locked = !slot.locked;
          save();
          renderHand();
        } else if (act === 'reroll') {
          rerollSlot(idx);
        } else {
          state.hand.splice(idx, 1);
          save();
          renderHand();
          renderList();
        }
      });
    });

    wrap.appendChild(slotEl);
  });
}

/* ================================================================
   Render — the deck
   ================================================================ */

function renderBank() {
  var q = $('#bankSearch').value.trim().toLowerCase();
  var list = state.meals.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  if (q) {
    list = list.filter(function (m) {
      return m.name.toLowerCase().indexOf(q) > -1 ||
             m.notable.join(' ').toLowerCase().indexOf(q) > -1 ||
             m.chips.join(' ').toLowerCase().indexOf(q) > -1;
    });
  }

  $('#bankCount').textContent = state.meals.length + ' meals in the deck' +
    (q ? ' · ' + list.length + ' matching' : '');

  var wrap = $('#bankList');
  wrap.innerHTML = '';

  if (!list.length) {
    wrap.innerHTML = '<p class="empty">No matches.</p>';
    return;
  }

  list.forEach(function (meal) {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'bank-row';
    row.innerHTML =
      '<span class="bank-dot" style="background:' + healthColor(meal.health) + '"></span>' +
      '<span class="bank-main">' +
        '<span class="bank-name">' + esc(meal.name) +
          (meal.dateNight ? ' &#10084;' : '') + '</span>' +
        '<span class="bank-meta">' + esc(EFFORT_LABEL[meal.effort]) + ' · ' +
          esc(INDULGENCE_LABEL[meal.indulgence]) + ' · ' + meal.notable.length + ' to buy</span>' +
      '</span>' +
      '<span class="bank-stars">' + starRow(meal.rating) + '</span>';
    row.addEventListener('click', function () { openEditor(meal.id); });
    wrap.appendChild(row);
  });
}

/* ================================================================
   Render — the shopping list
   ================================================================ */

function buildList() {
  var items = {};
  liveHand().forEach(function (slot) {
    var meal = mealById(slot.mealId);
    meal.notable.forEach(function (raw) {
      var label = String(raw).trim();
      if (!label) return;
      var key = label.toLowerCase();
      if (!items[key]) items[key] = { label: label, meals: [] };
      if (items[key].meals.indexOf(meal.name) < 0) items[key].meals.push(meal.name);
    });
  });
  return Object.keys(items).sort().map(function (k) {
    return { key: k, label: items[k].label, meals: items[k].meals };
  });
}

function renderList() {
  var items = buildList();
  var wrap = $('#shopList');
  wrap.innerHTML = '';

  var badge = $('#listBadge');
  var open = items.filter(function (it) { return !state.checked[it.key]; }).length;
  badge.hidden = open === 0;
  badge.textContent = open;

  $('#listActions').hidden = items.length === 0;

  if (!items.length) {
    wrap.innerHTML = '<p class="empty">Deal a week and the list fills itself.</p>';
    $('#listSub').textContent = 'Notable ingredients from this week’s hand.';
    return;
  }

  $('#listSub').textContent = open + ' of ' + items.length + ' still to grab.';

  items.forEach(function (it) {
    var label = document.createElement('label');
    label.className = 'shop-item';
    label.innerHTML =
      '<input type="checkbox"' + (state.checked[it.key] ? ' checked' : '') + '>' +
      '<span class="box">&#10003;</span>' +
      '<span class="shop-body">' +
        '<span class="shop-name">' + esc(it.label) + '</span>' +
        '<span class="shop-for">' + esc(it.meals.join(' · ')) + '</span>' +
      '</span>';
    $('input', label).addEventListener('change', function (e) {
      if (e.target.checked) state.checked[it.key] = true;
      else delete state.checked[it.key];
      save();
      renderList();
    });
    wrap.appendChild(label);
  });
}

function copyList() {
  var items = buildList().filter(function (it) { return !state.checked[it.key]; });
  if (!items.length) { toast('Nothing left to buy'); return; }
  var text = 'Shopping list\n' + items.map(function (it) { return '- ' + it.label; }).join('\n');
  copyText(text, items.length + ' items copied');
}

function copyText(text, okMsg) {
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? okMsg : 'Copy blocked by the browser');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
  } else {
    fallback();
  }
}

/* ================================================================
   Editor sheet
   ================================================================ */

var editingId = null;
var editRating = 4;

function openSheet(el) {
  $('#scrim').hidden = false;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheets() {
  $('#scrim').hidden = true;
  $('#editSheet').hidden = true;
  $('#menuSheet').hidden = true;
  document.body.style.overflow = '';
}

function paintStars() {
  $$('#f_rating button').forEach(function (b, i) {
    b.classList.toggle('on', i < editRating);
    b.setAttribute('aria-checked', String(i + 1 === editRating));
  });
}

function paintEditLabels() {
  $('#f_effortLbl').textContent = EFFORT_LABEL[+$('#f_effort').value];
  $('#f_indulgenceLbl').textContent = INDULGENCE_LABEL[+$('#f_indulgence').value];
  $('#f_healthLbl').textContent = $('#f_health').value + '/100';
}

function openEditor(id) {
  var meal = id ? mealById(id) : null;
  editingId = meal ? meal.id : null;
  editRating = meal ? meal.rating : 4;

  $('#f_name').value        = meal ? meal.name : '';
  $('#f_effort').value      = meal ? meal.effort : 2;
  $('#f_indulgence').value  = meal ? meal.indulgence : 3;
  $('#f_health').value      = meal ? meal.health : 60;
  $('#f_chips').value       = meal ? meal.chips.join(', ') : '';
  $('#f_notable').value     = meal ? meal.notable.join('\n') : '';
  $('#f_dateNight').checked = meal ? meal.dateNight : false;
  $('#deleteBtn').hidden    = !meal;

  paintStars();
  paintEditLabels();
  openSheet($('#editSheet'));
  if (!meal) setTimeout(function () { $('#f_name').focus(); }, 260);
}

function saveEditor(e) {
  e.preventDefault();
  var name = $('#f_name').value.trim();
  if (!name) return;

  var meal = {
    id: editingId || newId(),
    name: name,
    effort: +$('#f_effort').value,
    indulgence: +$('#f_indulgence').value,
    health: +$('#f_health').value,
    rating: editRating,
    chips: $('#f_chips').value.split(',')
             .map(function (s) { return s.trim(); })
             .filter(Boolean).slice(0, 3),
    notable: $('#f_notable').value.split('\n')
             .map(function (s) { return s.trim(); })
             .filter(Boolean),
    dateNight: $('#f_dateNight').checked
  };

  if (editingId) {
    for (var i = 0; i < state.meals.length; i++) {
      if (state.meals[i].id === editingId) { state.meals[i] = meal; break; }
    }
  } else {
    state.meals.push(meal);
  }

  save();
  closeSheets();
  renderBank();
  renderHand();
  renderList();
  toast(editingId ? 'Saved' : 'Added to the deck');
}

function deleteMeal() {
  if (!editingId) return;
  var meal = mealById(editingId);
  if (!confirm('Remove "' + meal.name + '" from the deck?')) return;

  state.meals = state.meals.filter(function (m) { return m.id !== editingId; });
  state.hand  = state.hand.filter(function (s) { return s.mealId !== editingId; });
  state.history = state.history.filter(function (id) { return id !== editingId; });

  save();
  closeSheets();
  renderBank();
  renderHand();
  renderList();
  toast('Removed');
}

/* ================================================================
   Backup / restore
   ================================================================ */

function exportBackup() {
  var json = JSON.stringify(state, null, 2);
  try {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'food-poker-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  } catch (e) { /* download blocked — the clipboard copy below still works */ }
  copyText(json, 'Backup copied to clipboard');
}

function importBackup(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.meals)) throw new Error('bad file');
      if (!confirm('Replace everything with this backup?')) return;
      state = data;
      state.settings = Object.assign({ count: 5, adventure: 35, indulgence: 45, dateNight: false },
                                     state.settings);
      state.hand    = Array.isArray(state.hand) ? state.hand : [];
      state.checked = state.checked || {};
      state.history = Array.isArray(state.history) ? state.history : [];
      save();
      closeSheets();
      syncControls();
      renderAll();
      toast('Backup restored');
    } catch (err) {
      toast("That file isn't a Food Poker backup");
    }
  };
  reader.readAsText(file);
}

function resetDeck() {
  if (!confirm('Reset the deck to the original meals? Your added meals and this week’s hand are lost.')) return;
  state = freshState();
  save();
  closeSheets();
  syncControls();
  renderAll();
  toast('Deck reset');
}

/* ================================================================
   Wiring
   ================================================================ */

function syncControls() {
  var s = state.settings;
  $('#countInput').textContent = s.count;
  $('#adventure').value = s.adventure;
  $('#indulgence').value = s.indulgence;
  $('#dateNight').checked = s.dateNight;
  $('#adventureVal').textContent = vibeLabel(s.adventure);
  $('#indulgenceVal').textContent = dialLabel(s.indulgence);
}

function renderAll() {
  renderHand();
  renderBank();
  renderList();
  hint(summaryText());
}

function showView(name) {
  $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-' + name); });
  $$('.tab').forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-view') === name); });
  window.scrollTo(0, 0);
}

function init() {
  state = load();
  syncControls();
  renderAll();

  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { showView(tab.getAttribute('data-view')); });
  });

  $$('.step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = state.settings.count + (+btn.getAttribute('data-step'));
      state.settings.count = Math.max(1, Math.min(10, next));
      $('#countInput').textContent = state.settings.count;
      save();
      hint(summaryText());
    });
  });

  $('#adventure').addEventListener('input', function (e) {
    state.settings.adventure = +e.target.value;
    $('#adventureVal').textContent = vibeLabel(state.settings.adventure);
    save();
  });

  $('#indulgence').addEventListener('input', function (e) {
    state.settings.indulgence = +e.target.value;
    $('#indulgenceVal').textContent = dialLabel(state.settings.indulgence);
    save();
  });

  $('#dateNight').addEventListener('change', function (e) {
    state.settings.dateNight = e.target.checked;
    save();
    hint(summaryText());
  });

  $('#dealBtn').addEventListener('click', deal);

  $('#bankSearch').addEventListener('input', renderBank);
  $('#addBtn').addEventListener('click', function () { openEditor(null); });

  var starWrap = $('#f_rating');
  for (var i = 1; i <= 5; i++) {
    (function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', n + ' star' + (n > 1 ? 's' : ''));
      b.innerHTML = '&#9733;';
      b.addEventListener('click', function () { editRating = n; paintStars(); });
      starWrap.appendChild(b);
    })(i);
  }

  $('#f_effort').addEventListener('input', paintEditLabels);
  $('#f_indulgence').addEventListener('input', paintEditLabels);
  $('#f_health').addEventListener('input', paintEditLabels);

  $('#editForm').addEventListener('submit', saveEditor);
  $('#cancelBtn').addEventListener('click', closeSheets);
  $('#deleteBtn').addEventListener('click', deleteMeal);
  $('#scrim').addEventListener('click', closeSheets);
  $('#menuCloseBtn').addEventListener('click', closeSheets);

  $('#menuBtn').addEventListener('click', function () { openSheet($('#menuSheet')); });
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
  $('#importFile').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
  $('#resetBtn').addEventListener('click', resetDeck);

  $('#copyListBtn').addEventListener('click', copyList);
  $('#uncheckBtn').addEventListener('click', function () {
    state.checked = {};
    save();
    renderList();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheets();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
