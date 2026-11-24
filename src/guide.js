'use strict';
/* ================= guide state ================= */
const G = {lang: 'en', mode: 'guided', page: 'lessons', lesson: null, i: 0, fin: false, lastType: 0, key: '', done: {}, tg: null, enhArea: '', enhQ: '', ovClosed: {}};
try { const sv = JSON.parse(localStorage.getItem('desai-guide') || '{}'); if (sv.lang) G.lang = sv.lang; if (sv.done) G.done = sv.done; G.ovMini = !!sv.ovMini; } catch (e) {}
const persist = () => { try { localStorage.setItem('desai-guide', JSON.stringify({lang: G.lang, done: G.done, ovMini: G.ovMini})); } catch (e) {} };
/* Every guide sentence is written in English; Hindi and Gujarati come from I18N (data/i18n.json). {0}, {1} fill in names and values. */
const L = (en, ...a) => { let s = G.lang === 'en' ? en : ((I18N[en] || {})[G.lang] || en); a.forEach((x, i) => { s = s.split('{' + i + '}').join(x); }); return s; };
const tx = s => s ? L(s) : '';
const unesc = s => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"}[e]));
// a bold app word in a step shows as the phone shows it, in the phone's language
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, (_, x) => '<b>' + esc(AppLang.t(unesc(x))) + '</b>');
const val = v => typeof v === 'function' ? v() : v;
const recentlyTyped = () => Date.now() - G.lastType < 1100;
const OVSEC = [['avni', '📖', 'Avni in one minute'], ['j1', '🏥', 'Journey 1: a person at a health camp'], ['j2', '👥', 'Journey 2: a training batch'], ['j3', '📊', 'Journey 3: an event and the annual plan'], ['col', '🎨', 'Colours you will see']];
const OVSHORT = {avni: 'Basics', j1: 'Health', j2: 'Batches', j3: 'Events', col: 'Colours'};
const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['gu', 'ગુજરાતી']];

/* ================= what should the learner touch next? ================= */
function setInput(el, v) { el.focus({preventScroll: true}); el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); G.lastType = 0; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); Guide.sync(); }
const clickSel = sel => () => { const el = $('#phone ' + sel); if (el) doAction(el); };
function fieldTarget(st, el, gi, errs) {
  const d = cdef(el), key = cname(el), demo = (gi || 0) === 0 ? val(st.demo[key]) : val(st.demo[key + '#' + gi]);
  const node = $$('#phone .fe[data-f]').find(e => e.dataset.f === el.uuid && (e.dataset.g || '') === (gi === undefined ? '' : String(gi)));
  const opts = d.dataType === 'Coded' ? answersOf(el).filter(o => allowed(stOf(F, el, gi), o)) : [];
  const dv = demo !== undefined ? demo : d.dataType === 'Coded' ? (el.type === 'MultiSelect' ? [opts[0]] : opts[0]) : d.dataType === 'Numeric' ? (d.lowAbsolute > 0 ? d.lowAbsolute : 1)
    : d.dataType === 'Date' ? T : 'Practice';
  const shown = d.dataType === 'Date' ? D.dmy(dv) : Array.isArray(dv) ? dv.join(', ') : String(dv);
  const lab = el.name;
  let txt;
  if (errs.length) txt = L('Fix **{0}**: {1}', lab, errs[0]);
  else if (d.dataType === 'Coded') txt = L('For **{0}**, tap **{1}**.', lab, shown);
  else if (d.dataType === 'Date') txt = L('For **{0}**, tap **Choose a date** and pick **{1}**.', lab, shown);
  else txt = L('Type **{0}**. Example: **{1}**', lab, shown);
  return {el: node, txt, why: tx(st.notes[key]), tag: st.tags && st.tags[key], auto: () => { const h = holderOf(el, gi);
    if (d.dataType === 'Coded' && el.type === 'MultiSelect') fset(el, gi, Array.isArray(dv) ? dv : [dv]); else fset(el, gi, d.dataType === 'Numeric' ? String(dv) : dv); G.lastType = 0; renderPhone(); }};
}
function coreTarget(st, k) {
  const c = _.mapValues(st.core || {}, val), el = $$('#phone .fe[data-f]').find(e => e.dataset.f === 'core:' + k), why = tx(st.notes['core:' + k]);
  const set = fn => () => { fn(); G.lastType = 0; renderPhone(); };
  if (k === 'first') return {el, why, txt: L('Type the **First Name**. Example: **{0}**', c.first), auto: set(() => F.subject.firstName = c.first)};
  if (k === 'last') return {el, why, txt: L('Type the **Last Name**. Example: **{0}**', c.last), auto: set(() => F.subject.lastName = c.last)};
  if (k === 'dob') return {el, why, txt: L('Pick the **Date of Birth**, or type the **Age**. Example: **{0}** Years', c.age), auto: set(() => { F.core.age = c.age; F.core.ageUnit = 'Years'; setDobFromAge(); })};
  if (k === 'gender') return {el, why, txt: L('For **Gender**, tap **{0}**.', c.gender), auto: set(() => F.subject.gender = c.gender)};
  if (k === 'name') return {el, why, txt: c.name ? L('Type the name. Example: **{0}**', c.name) : L('The app has filled the name for you. Leave it as it is.'), auto: set(() => { if (c.name) F.subject.firstName = c.name; })};
  return {el, why, txt: L('For **Address**, tap the village **{0}**.', c.village), auto: set(() => { F.subject.village = villageBy(c.village).uuid; })};
}
function formTarget(st) {
  const m = S.modal;
  if (m && m.t === 'dp') return {el: $('#phone .dp'), txt: L('Tap the date, then tap **OK**.'), auto: clickSel('[data-a="dp:ok"]')};
  if (m && m.t === 'dlg') return {el: $('#phone .dlg'), txt: L('Tap **NO** to stay in the form.'), auto: clickSel('[data-a="dlg"][data-v="1"]')};
  if (topScr().n === 'summary') return {el: $('#phone [data-a="f:save"]'), txt: tx(st.sum) || L('This is the summary. Check your answers, then tap **SAVE**.'), auto: clickSel('[data-a="f:save"]'),
    why: L('Nothing is saved until you tap SAVE.')};
  if (topScr().n !== 'form' || !F) return null;
  const ae = document.activeElement, typing = ae && ae.dataset && ae.dataset.in && recentlyTyped() ? ae : null, g = F.pages[F.page];
  if (g.core) {
    const keys = isPerson(F.subject) ? ['first', 'last', 'dob', 'gender', 'village'] : ['name', 'village'], s = F.subject, want = val((st.core || {}).name);
    for (const k of keys) {
      const empty = k === 'first' ? !s.firstName : k === 'last' ? !s.lastName : k === 'dob' ? !s.dob : k === 'gender' ? !s.gender : k === 'village' ? !s.village : (want ? s.firstName !== want : !s.firstName);
      const here = typing && typing.dataset.in === 'core' && ((typing.dataset.k === 'firstName' && (k === 'first' || k === 'name')) || (typing.dataset.k === 'lastName' && k === 'last') || (typing.dataset.k === 'age' && k === 'dob'));
      if (empty || here) return coreTarget(st, k);
    }
  } else for (const it of itemsOf(F.page)) {
    const el = it.el, gi = it.gi; if (kvOf(el, 'editable') === false) continue;
    const v = (holderOf(el, gi) || {})[cname(el)], errs = errsOf(el, gi).filter(e => e !== MSG.empty), key = cname(el) + (gi ? '#' + gi : '');
    const want = val(st.demo[key]) !== undefined ? !_.isEqual(v, val(st.demo[key])) && !(cdef(el).dataType === 'Numeric' && String(v) === String(val(st.demo[key]))) : el.mandatory && isEmpty(v);
    const here = typing && typing.dataset.in === 'f' && typing.dataset.k === el.uuid && (typing.dataset.g || '') === (gi === undefined ? '' : String(gi));
    if ((isEmpty(v) && want) || (want && val(st.demo[key]) !== undefined) || errs.length || here) {
      if (errs.length && st.expect && st.expect[key]) return {el: $$('#phone .fe[data-f]').find(e => e.dataset.f === el.uuid), txt: tx(st.expect[key]), why: L('The app shows the message in red: {0}', errs[0]), info: 1, tag: st.tags && st.tags[key]};
      return fieldTarget(st, el, gi, errs);
    }
  }
  if (F.formErrs.length) return {el: $('#phone .fmsg'), txt: L('Fix this first: {0}', F.formErrs[0]), info: 1};
  const last = stepPage(1) >= F.pages.length;
  return {el: $('#phone [data-a="f:next"]'), txt: last ? L('This page is complete. Tap **NEXT** to see the summary.') : L('This page is complete. Tap **NEXT**.'), auto: clickSel('[data-a="f:next"]')};
}

const Guide = {
  step() { return G.lesson && !G.fin ? G.lesson.steps[G.i] : null; },
  running() { return G.mode === 'guided' && !!G.lesson && !G.fin; },
  target() {
    const st = this.step(); if (!st) return null;
    if (st.k === 'tap') { const v = val(st.v), el = $$(`#phone [data-a="${st.a}"]`).find(e => v === undefined || e.dataset.v === String(v));
      return {el, txt: tx(st.t), why: tx(st.why), tag: st.tag, wait: !el, auto: () => { if (el) doAction(el); }}; }
    if (st.k === 'info') return {el: st.sel ? $('#phone ' + val(st.sel)) : null, txt: tx(st.t), why: tx(st.why), tag: st.tag, info: 1};
    if (st.k === 'type') { const el = $('#phone ' + st.sel); return {el, txt: tx(st.t), why: tx(st.why), tag: st.tag, wait: !el, auto: () => { if (el) setInput(el, val(st.val)); }}; }
    const tg = formTarget(st); if (tg && !tg.tag && st.tag) tg.tag = st.tag; return tg;
  },
  allow(el) {
    if (!this.running()) return true;
    const tg = G.tg; if (!tg || tg.info || !tg.el) return false;
    return tg.el === el || tg.el.contains(el);
  },
  nudge() {
    const tg = G.tg, h = $('#hint'); if (!h) return;
    h.textContent = tg && tg.info ? L('Read the note, then press Next') : L('Tap the highlighted part');
    h.classList.add('on'); clearTimeout(this._h); this._h = setTimeout(() => h.classList.remove('on'), 1500);
    if (tg && tg.el) { tg.el.classList.remove('g-shake'); void tg.el.offsetWidth; tg.el.classList.add('g-shake'); }
    const sc = $('.stepcard'); if (sc) { sc.classList.remove('g-shake'); void sc.offsetWidth; sc.classList.add('g-shake'); }
  },
  typed(force) { G.lastType = force ? 0 : Date.now(); clearTimeout(this._t); this._t = setTimeout(() => this.sync(), force ? 0 : 1150); },
  advance() { G.i++; Track.ev('step', {lesson: G.lesson.id, step: G.i});
    if (G.i >= G.lesson.steps.length) { G.fin = true; G.done[G.lesson.id] = 1; persist(); Track.ev('lesson_complete', {lesson: G.lesson.id, step: G.i, detail: Math.round((Date.now() - G.t0) / 1000)}); } },
  after(a, v) {
    const st = this.step(); if (!st || G.mode !== 'guided') return;
    if (st.k === 'tap' && st.a === a && (st._v === undefined || String(st._v) === String(v))) this.advance();
    else if (st.k === 'form' && a === 'f:save' && !F) this.advance();
    this.sync();
  },
  next() { const st = this.step(); if (st && (st.k === 'info' || (G.tg && G.tg.info))) { if (st.k === 'info') this.advance(); else if (st.k === 'form' && G.tg.info && st.expect) { if (st.endOnStop) this.advance(); else this.fixExpected(st); } this.sync(); } },
  fixExpected(st) {                                     // after a "the app stops you" note, put the right value in so the lesson can go on
    Object.entries(st.fix || {}).forEach(([k, v]) => { const it = itemsOf(F.page).find(x => cname(x.el) === k); if (it) fset(it.el, it.gi, val(v)); });
    st.demo = Object.assign({}, st.demo, st.fix || {}); st.expect = null; renderPhone();
  },
  // Back = replay the lesson with "Do it for me" up to the last step the user actually saw (steps the app passes by itself are skipped)
  canBack() { return !!G.lesson && (G.fin || (G.hist || []).length > 1); },
  back() {
    if (!this.canBack()) return; const id = G.lesson.id, h = (G.hist || []).slice(); if (!G.fin) h.pop(); const want = h[h.length - 1] || 0;
    Track.ev('step', {lesson: id, step: want + 1, detail: 'back'});
    Track.mute = true; this.start(id); let n = 0;
    while (G.i < want && !G.fin && n++ < 500) { const b = this.sigAll(); this.auto(); if (b === this.sigAll()) break; }
    Track.mute = false; G.hist = h.length ? h : [G.i]; G.key = ''; renderPhone(); },
  sigAll() { return G.i + '|' + (G.tg && G.tg.txt) + '|' + sig() + '|' + JSON.stringify(S.modal && S.modal.t) + '|' + JSON.stringify(F && F.obs); },
  auto() { const tg = G.tg; if (!tg) return; if (G.lesson && !tg.info && !tg.wait) Track.ev('do_it_for_me', {lesson: G.lesson.id, step: G.i + 1}); if (tg.info) return this.next(); if (tg.auto) tg.auto(); },
  sync() {
    $$('#phone .g-target').forEach(e => e.classList.remove('g-target'));
    if (this.running()) { let st = this.step(), guard = 0; while (st && st.k === 'type' && st.test() && !recentlyTyped() && guard++ < 5) { this.advance(); st = this.step(); } }
    if (this.running()) {
      const st = this.step(), tg = G.tg = this.target();
      if (st.k === 'tap') st._v = val(st.v);
      if (tg && tg.el) { tg.el.classList.add('g-target'); this.reveal(tg.el); }
    } else G.tg = null;
    if (this.running() && G.hist && G.hist[G.hist.length - 1] !== G.i) G.hist.push(G.i);
    this.spot();
    this.render();
  },
  spot() {                                             // a soft dim over the phone with a hole around the part to touch
    const ph = $('#phone'); if (!ph) return; let sp = $('#spot');
    if (!sp) { sp = document.createElement('div'); sp.id = 'spot'; ph.appendChild(sp); const sc = $('#scr'); if (sc) sc.addEventListener('scroll', () => this.spot(), {passive: true}); }
    const el = this.running() && G.tg && G.tg.el && ph.contains(G.tg.el) ? G.tg.el : null;
    if (!el) { sp.style.opacity = 0; return; }
    const pr = ph.getBoundingClientRect(), r = el.getBoundingClientRect(), k = pr.width / ph.offsetWidth || 1, pad = 6;
    Object.assign(sp.style, {left: ((r.left - pr.left) / k - pad) + 'px', top: ((r.top - pr.top) / k - pad) + 'px', width: (r.width / k + 2 * pad) + 'px', height: (r.height / k + 2 * pad) + 'px', opacity: 1});
  },
  reveal(el) {
    const sc = $('#scr'); if (!sc || !sc.contains(el)) return;
    const k = sc.getBoundingClientRect().width / sc.offsetWidth || 1, r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    const topY = (r.top - b.top) / k, botY = (r.bottom - b.top) / k, H = sc.clientHeight;
    if (topY < 12 || botY > H - 12) sc.scrollTop += topY - Math.min(H * 0.3, Math.max(12, (H - (botY - topY)) / 2));
  },
  reset(role) { seed(); setRole(role || ROLE); S.exp = {}; S.search = {type: 'Beneficiary', text: '', voided: false}; S.filter = {picked: [], tmp: []}; S.login = {u: '', p: ''}; S.toast = null; goHome(); },
  start(id) {
    const ls = LESSONS.find(l => l.id === id);
    ls.steps.forEach(st => { delete st._seen; if (st._demo0) { st.demo = st._demo0; st.expect = st._expect0; } else if (st.k === 'form') { st._demo0 = st.demo; st._expect0 = st.expect; } });
    this.reset(ls.role || 'fe');
    if (ls.setup) ls.setup();
    if (G.lesson && !G.fin && G.lesson.id !== ls.id) Track.ev('lesson_exit', {lesson: G.lesson.id, step: G.i + 1});
    G.lesson = ls; G.i = 0; G.hist = []; G.fin = false; G.mode = 'guided'; G.page = 'lessons'; G.key = ''; G.lastType = 0; G.t0 = Date.now();
    Track.ev('lesson_start', {lesson: id});
    $('#guide').classList.remove('open');
    renderPhone(false);
    const gb = $('#gbody'); if (gb) gb.scrollTop = 0;
  },
  exit() { if (G.lesson && !G.fin) Track.ev('lesson_exit', {lesson: G.lesson.id, step: G.i + 1}); G.lesson = null; G.fin = false; G.tg = null; G.key = ''; goHome(); renderPhone(false); },
  setMode(m) { Track.ev('page', {detail: m}); G.mode = m; if (m === 'free') { G.lesson = null; G.fin = false; } G.key = ''; renderPhone(); },
  setLang(l) { G.lang = l; Track.ev('lang_change', {detail: l}); persist(); G.key = ''; document.documentElement.lang = l; renderPhone(); },

  /* ---------- left panel ---------- */
  render() {
    const st = this.step(), tg = G.tg;
    const key = [matchMedia('(min-width:1180px)').matches, G.ovMini, G.lang, G.mode, G.page, G.enhArea, ROLE, G.lesson && G.lesson.id, G.i, G.fin, tg && tg.txt, tg && tg.wait, topScr().n, F ? F.page : ''].join('|');
    if (key === G.key) return; G.key = key;
    $('#lang').innerHTML = LANGS.map(([k, n]) => `<button class="${G.lang === k ? 'on' : ''}" data-g="lang" data-v="${k}">${n}</button>`).join('');
    $('#gsub').textContent = L('Practice app for Desai Foundation Trust staff');
    $('#gmode').innerHTML = `<button class="${G.mode === 'guided' && G.page === 'lessons' ? 'on' : ''}" data-g="mode" data-v="guided"><span class="emo">🧭</span><span><b>${L('Guided lessons')}</b><small>${L('One step at a time')}</small></span></button>
      <button class="${G.mode === 'free' && G.page === 'lessons' ? 'on' : ''}" data-g="mode" data-v="free"><span class="emo">🖐️</span><span><b>${L('Free explore')}</b><small>${L('Tap anything you like')}</small></span></button>
      <button class="${G.page === 'enh' ? 'on' : ''}" data-g="enh"><span class="emo">✨</span><span><b>${L('What we added')}</b><small>${L('Beyond the scoping')}</small></span></button>`;
    const body = $('#gbody');
    const home = G.page !== 'enh' && !G.lesson, wide = matchMedia('(min-width:1180px)').matches;
    body.innerHTML = G.page === 'enh' ? this.enhHTML() : G.lesson ? this.lessonHTML(st, tg) : this.homeHTML() + (wide ? '' : this.overviewHTML());
    document.body.classList.toggle('ovw', home && wide);
    $('#overview').classList.toggle('mini', home && wide && !!G.ovMini);
    $('#overview').innerHTML = !(home && wide) ? '' : G.ovMini ? this.railHTML() : `<div class="ovbar"><button class="ovt" data-g="ovt" title="${esc(L('Hide'))}">☰</button><b>${L('Overview')}</b></div>` + this.overviewHTML();
    $('#gact').innerHTML = G.page === 'enh' ? '' : this.actHTML(tg); $('#guide').classList.toggle('hasact', !!G.lesson && G.page !== 'enh');
    this.mbar(st, tg);
    document.documentElement.style.setProperty('--mbar', ($('#mbar').offsetHeight || 0) + 'px');
    if (typeof fit === 'function') fit();
  },
  // One button, always in the same place at the bottom of the guide: Next / Do it for me / Next lesson
  actHTML(tg) {
    if (!G.lesson) return '';
    const ls = G.lesson, n = ls.steps.length;
    if (G.fin) { const nx = LESSONS[LESSONS.indexOf(ls) + 1];
      return `<button class="actb" data-g="back">◂ ${L('Back')}</button><button class="act" data-g="${nx ? 'start' : 'exit'}" ${nx ? `data-v="${nx.id}"` : ''}>${nx ? L('Next lesson') : L('All lessons')} ▸</button><span class="actk">${L('Lesson complete')} 🎉</span>`; }
    const btn = !tg ? `<button class="act" disabled>${L('Please wait…')}</button>` : tg.info ? `<button class="act" data-g="next">${L('Next')} ▸</button>`
      : tg.wait ? `<button class="act" disabled>${L('Please wait…')}</button>` : `<button class="act alt" data-g="auto">${L('Do it for me')} ▸</button>`;
    return `<button class="actb" data-g="back" ${this.canBack() ? '' : 'disabled'}>◂ ${L('Back')}</button>` + btn + `<span class="actk">${L('Step')} ${G.i + 1} / ${n}<small>${tg && tg.info ? L('Read, then press Next') : L('Tap the glowing part, or press Do it for me')}</small></span>`;
  },
  stepBtns(tg) {
    if (!tg) return '';
    if (tg.info) return `<button class="btn pri" data-g="next">${L('Next')} ▸</button>`;
    if (tg.wait) return `<button class="btn" disabled>${L('Please wait…')}</button>`;
    return `<button class="btn" data-g="auto">${L('Do it for me')} ▸</button>`;
  },
  tagHTML(tg) { return tg && tg.tag ? `<div class="etag">✨ ${L('Added by Samanvay')}: ${esc(L(tg.tag))}</div>` : ''; },
  lessonHTML(st, tg) {
    const ls = G.lesson, n = ls.steps.length;
    // a long form moves through the flow page by page (stages[i] = flow stage of form page i); the summary is the last stage
    const stage = G.fin ? ls.flow.length : !st ? 0 : st.k === 'form' && topScr().n === 'summary' ? ls.flow.length - 1 : st.k === 'form' && st.stages && F ? st.stages[Math.min(F.page, st.stages.length - 1)] : st.s;
    let h = `<div class="crumb"><button data-g="exit">← ${L('All lessons')}</button><button data-g="restart">↺ ${L('Start again')}</button><span class="rolechip">${esc(tx(ROLES[ROLE].role[0]))}</span></div><h1>${ls.e} ${esc(tx(ls.t))}</h1>
      <div class="progress"><i style="width:${Math.round((G.fin ? n : G.i) / n * 100)}%"></i></div>`;
    if (G.fin) {
      const idx = LESSONS.indexOf(ls), nx = LESSONS[idx + 1];
      h += `<div class="stepcard fin"><div class="sn"><span>${L('Lesson complete')} 🎉</span></div><div class="st">${L('Well done. Remember these points:')}</div><ul class="takeaways">${ls.take.map(t => `<li>${md(tx(t))}</li>`).join('')}</ul>
        <div class="sbtns">${nx ? `<button class="btn pri" data-g="start" data-v="${nx.id}">${L('Next lesson')}: ${esc(tx(nx.t))} ▸</button>` : ''}<button class="btn" data-g="restart">${L('Practise again')}</button><button class="btn" data-g="exit">${L('All lessons')}</button></div></div>`;
    } else {
      h += `<div class="stepcard ${tg && tg.wait ? 'warn' : ''} ${tg && tg.info && st.k === 'form' ? 'stop' : ''}"><div class="sn"><span>${L('Step')} ${G.i + 1} / ${n}</span><span>${tg && tg.info ? '👀 ' + L('Read') : '👆 ' + L('Your turn')}</span></div>
        <div class="st">${md(tg ? tg.txt : L('Follow the highlighted part on the phone.'))}</div>${tg && tg.why ? `<div class="sw">${md(tg.why)}</div>` : ''}${this.tagHTML(tg)}</div>`;
    }
    h += `<h2>${L('How this task flows')}</h2>` + ls.flow.map((f, i) => `${i ? '<div class="sline"></div>' : ''}<div class="stage ${f[1] ? 'auto' : ''} ${i < stage ? 'done' : i === stage ? 'cur' : ''}"><span class="sd">${i < stage ? '✓' : f[1] ? '⚙' : i + 1}</span><span>${esc(L(f[0]))}${f[1] ? `<small>${L('The app does this by itself')}</small>` : ''}</span></div>`).join('');
    if (ls.why) h += `<h2>${L('Why it matters')}</h2><p>${md(tx(ls.why))}</p>`;
    h += `<p class="muted" style="margin-top:16px">${L('Practice data only. Nothing here reaches the real app.')}</p>`;
    return h;
  },
  homeHTML() {
    const doneN = LESSONS.filter(l => G.done[l.id]).length;
    const node = (cls, i, en, sen) => `<div class="fnode ${cls}"><span class="fi">${i}</span><span><b>${L(en)}<span class="ftag ${cls === 'auto' || cls === 'dec' ? 'app' : 'you'}">${cls === 'auto' || cls === 'dec' ? L('App') : L('You')}</span></b><span>${L(sen)}</span></span></div>`, ar = '<div class="farrow"></div>';
    let h = '';
    if (G.mode === 'free') { const hr = HERE[topScr().n] || HERE.home;
      h += `<div class="herecard"><div class="hk">${L('You are here')}</div><h3>${esc(tx(hr[0]))}</h3><ul>${hr[1].map(p => `<li>${md(tx(p))}</li>`).join('')}</ul><div class="rolepick">${L('Practise as')}: ${Object.keys(ROLES).map(r => `<button class="${ROLE === r ? 'on' : ''}" data-g="role" data-v="${r}">${esc(tx(ROLES[r].role[0]))}</button>`).join('')}</div><div class="sbtns"><button class="btn" data-g="reset">↺ ${L('Reset practice data')}</button></div></div>`; }
    h += `<h1>${L('Learn the Desai Foundation app by using it')}</h1><p class="lead">${L('The phone on the right works like the real Avni app of Desai Foundation Trust: the same screens, forms, checks and cards. Pick a lesson and follow the glowing box.')}</p>
      <div class="how"><div><b>1</b>${md(L('Read the step. Press **Next** when it is only to read.'))}</div><div><b>2</b>${md(L('Tap the glowing part on the phone, or press **Do it for me**.'))}</div><div><b>3</b>${md(L('Press **Back** to see the previous step again.'))}</div></div>
      <div class="progress"><i style="width:${Math.round(doneN / LESSONS.length * 100)}%"></i></div><div class="muted">${doneN} / ${LESSONS.length} ${L('lessons completed')}</div>`;
    GROUPS.forEach(([g, en]) => { const ls = LESSONS.filter(l => l.g === g); if (!ls.length) return;
      h += `<h2>${L(en)}</h2><div class="lgroup">` + ls.map(l => `<button class="lcard ${G.done[l.id] ? 'done' : ''}" data-g="start" data-v="${l.id}"><span class="le">${l.e}</span><span class="lt"><b>${esc(tx(l.t))}</b><span>${esc(tx(l.d))}</span></span><span class="lgo">${G.done[l.id] ? '✓ ' + L('Done') : L('Start') + ' ▸'}</span></button>`).join('') + `</div>`; });
    h += `<div class="note">${L('All names here are made up for practice. Nothing you do on this page reaches the real app or the server.')}</div>
      <p class="muted"><button class="linkbtn" data-g="reset">↺ ${L('Reset practice data')}</button>${Track.on ? ` · ${L('This page counts lesson use anonymously to improve the guide. No names are collected.')}` : ''}</p>`;
    return h;
  },
  // the folded sidebar (YouTube's mini guide): one icon per section; a tap opens the panel at that section
  railHTML() { return `<button class="ovt" data-g="ovt" title="${esc(L('Overview'))}">☰</button>` + OVSEC.map(([k, e, t]) => `<button class="rail" data-g="ovgo" data-v="${k}" title="${esc(L(t))}"><span>${e}</span><small>${esc(L(OVSHORT[k]))}</small></button>`).join(''); },
  osec(k, t) { return `<details class="osec" data-k="${k}" ${G.ovClosed[k] ? '' : 'open'}><summary>${L(t)}</summary>`; },   // collapsible overview section; closed ones stay closed across redraws
  overviewHTML() {
    const node = (cls, i, en, sen) => `<div class="fnode ${cls}"><span class="fi">${i}</span><span><b>${L(en)}<span class="ftag ${cls === 'auto' || cls === 'dec' ? 'app' : 'you'}">${cls === 'auto' || cls === 'dec' ? L('App') : L('You')}</span></b><span>${L(sen)}</span></span></div>`, ar = '<div class="farrow"></div>';
    let h = this.osec('avni', 'Avni in one minute') + `<div class="gloss">${[['👤', 'Record', 'A person, a batch, an event or a plan. You register it once.'], ['📝', 'Form', 'Questions you fill for a record. Some questions appear only after an answer.'],
      ['📅', 'Visit', 'A form filled on a date: a camp, a screening, a follow-up. Some visits are planned by the app.'], ['🟦', 'Card', 'A coloured box on Home. The number tells how many records wait there.'], ['🔄', 'Sync', 'Sends your saved work to the server and brings new work. Needs internet.']]
      .map(([e, a, b]) => `<div><span>${e}</span><b>${L(a)}</b><small>${L(b)}</small></div>`).join('')}</div>`;
    h += '</details>' + this.osec('j1', 'Journey 1: a person at a health camp') + `<div class="flow">` +
      node('', '👤', 'Register the person', 'Consent first. Name, age, village, phone number.') + ar +
      node('dec', '❓', 'Consent given?', 'No consent: the app offers no forms for this person.') + ar +
      node('', '🏥', 'Health Camp visit', 'Camp type, partner, why the person came.') + ar +
      node('', '🩺', 'Screening', 'What was checked, what was found, referral, follow-up needed.') + ar +
      node('auto', '⚙️', 'Health follow-up is planned', 'One follow-up, due 30 days later.') + ar +
      node('', '📞', 'Fill the Health Follow-up', 'Did the person follow the treatment or the referral?') + ar +
      node('end', '📋', 'Referral not followed shows on a card', 'Your coordinator sees who needs a push.') + `</div>`;
    h += '</details>' + this.osec('j2', 'Journey 2: a training batch') + `<div class="flow">` +
      node('', '👥', 'Create the batch', 'The app adds the course and month to the name, and works out the last class day.') + ar +
      node('', '➕', 'Add students', 'The app checks consent, age and that the batch has not ended.') + ar +
      node('', '🧾', 'Livelihood Event and Baseline', 'Intake answers and the pre-test score.') + ar +
      node('', '✅', 'Mark attendance every class day', 'Sewing, Computer, Beautician and Summer Camp only. Monday to Saturday.') + ar +
      node('', '🎓', 'Endline', 'Post-test score and the outcome.') + ar +
      node('auto', '⚙️', 'A Livelihood follow-up is planned', 'One follow-up, 3 months after a completed course.') + `</div>`;
    h += '</details>' + this.osec('j3', 'Journey 3: an event and the annual plan') + `<div class="flow">` +
      node('', '📊', 'Record the Event Matrix', 'Programme, date, people reached, money, volunteers, in-kind.') + ar +
      node('auto', '⚙️', 'The app works out the totals', 'Name, children total, All Impacted, indirect people, rupees to dollars.') + ar +
      node('dec', '🔒', 'Draft or Submitted?', 'Submitted locks the event. Drafts older than 7 days show on a card.') + ar +
      node('end', '🗓️', 'Annual Program Plan', 'Management plans each year; reports compare plan and actual.') + `</div>`;
    h += `<div class="legend"><span><i style="background:#fff;border-color:var(--line)"></i>${L('You do this')}</span><span><i style="background:var(--auto-soft);border-color:#b9b9ee;border-style:dashed"></i>${L('The app does this by itself')}</span><span><i style="background:var(--accent-soft);border-color:#f3cf85"></i>${L('A check')}</span></div>`;
    h += '</details>' + this.osec('col', 'Colours you will see') + `<div class="pillrow"><span class="pill"><i style="background:#009688">Due</i>${L('Do it today')}</span><span class="pill"><i style="background:#d0011b">Overdue</i>${L('It is late')}</span><span class="pill"><i style="background:#B8860B">Scheduled For</i>${L('Comes later')}</span></div>
      <div class="pillrow"><span class="pill"><span class="sw2" style="background:#EBF8E7"></span>${L('Green card: work for today')}</span><span class="pill"><span class="sw2" style="background:#F8EFE7"></span>${L('Brown card: late work')}</span><span class="pill"><span class="sw2" style="background:#E7F3F8"></span>${L('Blue card: totals')}</span></div>`;
    h += '</details>';
    return h;
  },
  enhRows() {                                          // area chip + search words (every word must match somewhere in the row)
    const words = G.enhQ.toLowerCase().split(/\s+/).filter(Boolean);
    return DESAI.enh.filter(r => (!G.enhArea || r.area === G.enhArea) && words.every(w =>
      [r.enhancement, r.area, L(r.area), r.what_dft_asked, r.what_we_built, r.benefit, r.where_in_app, r.status, L(r.status)].join(' ').toLowerCase().includes(w)));
  },
  enhListHTML() {
    const shown = this.enhRows();
    return `<div class="muted" style="margin:0 0 8px">${L('{0} of {1} shown', shown.length, DESAI.enh.length)}</div>` + (shown.map(r => `<div class="ecard"><div class="eh"><b>${esc(r.enhancement)}</b><span class="est ${/^Live/.test(r.status) ? 'ok' : r.status === 'Planned' ? 'pl' : 'nl'}">${esc(L(r.status))}</span></div>
      <div class="ea">${esc(L(r.area))} · ${esc(r.where_in_app)}</div><p><b>${L('Asked')}:</b> ${esc(r.what_dft_asked)}</p><p><b>${L('Built')}:</b> ${esc(r.what_we_built)}</p><p class="eb">${esc(r.benefit)}</p></div>`).join('')
      || `<div class="note">${L('No enhancement matches your search.')}</div>`);
  },
  enhHTML() {
    const rows = DESAI.enh, areas = _.uniq(rows.map(r => r.area)), pick = G.enhArea, live = rows.filter(r => /^Live/.test(r.status)).length;
    return `<h1>${L('What we added beyond the scoping')}</h1><p class="lead">${L('Desai Foundation Trust gave us a Scoping Document, a Modelling sheet and a Forms sheet. Below is everything Samanvay built on top of them, so the app is safer and easier for staff.')}</p>
      <div class="how"><div><b>${rows.length}</b>${L('enhancements in all')}</div><div><b>${live}</b>${L('live on the UAT app')}</div><div><b>${areas.length}</b>${L('areas of the app')}</div></div>
      <div class="esearch"><span>🔍</span><input id="enhq" type="search" data-g-in="enh" placeholder="${esc(L('Search what we added'))}" value="${esc(G.enhQ)}" autocomplete="off"></div>
      <div class="chiprow"><button class="${pick ? '' : 'on'}" data-g="area" data-v="">${L('All')}</button>${areas.map(a => `<button class="${pick === a ? 'on' : ''}" data-g="area" data-v="${esc(a)}">${esc(L(a))}</button>`).join('')}</div>
      <div id="enhlist">${this.enhListHTML()}</div><p class="muted">${L('Rows are in English, as they will be shared with DFT. The same list is in the Excel file Desai-Avni-Enhancements.xlsx.')}</p>`;
  },
  mbar(st, tg) {
    const mb = $('#mbar');
    if (G.lesson && !G.fin) mb.innerHTML = `<div class="mk"><span>${esc(tx(G.lesson.t))} · ${G.i + 1}/${G.lesson.steps.length}</span><span>${tg && tg.info ? '👀' : '👆'}</span></div><div class="mt">${md(tg ? tg.txt : '')}</div><div class="mb"><button class="btn" data-g="back" ${this.canBack() ? '' : 'disabled'}>◂ ${L('Back')}</button>${this.stepBtns(tg)}<button class="btn" data-g="open">☰ ${L('Guide')}</button></div>`;
    else if (G.lesson) mb.innerHTML = `<div class="mk"><span>${L('Lesson complete')} 🎉</span></div><div class="mt">${esc(tx(G.lesson.t))}</div><div class="mb"><button class="btn pri" data-g="open">${L('See what you learnt')} ▸</button></div>`;
    else mb.innerHTML = `<div class="mk"><span>Desai Foundation · ${L('practice app')}</span></div><div class="mt">${G.mode === 'free' ? L('Free explore: tap anything on the phone.') : L('Choose a lesson to begin.')}</div><div class="mb"><button class="btn pri" data-g="open">☰ ${L('Lessons')}</button></div>`;
  },
  bind() {
    const h = e => {
      const el = e.target.closest('[data-g]'); if (!el) return;
      const a = el.dataset.g, v = el.dataset.v;
      if (a === 'lang') this.setLang(v);
      else if (a === 'mode') { G.page = 'lessons'; this.setMode(v); }
      else if (a === 'enh') { Track.ev('page', {detail: 'what-we-added'}); G.page = 'enh'; G.key = ''; this.render(); }
      else if (a === 'area') { G.enhArea = v; G.key = ''; this.render(); }
      else if (a === 'start') this.start(v);
      else if (a === 'restart') this.start(G.lesson.id);
      else if (a === 'exit') this.exit();
      else if (a === 'auto') this.auto();
      else if (a === 'back') this.back();
      else if (a === 'next') this.next();
      else if (a === 'role') { Track.ev('role_change', {detail: v}); this.reset(v); G.key = ''; renderPhone(false); }
      else if (a === 'ovt') { G.ovMini = !G.ovMini; Track.ev('overview', {detail: G.ovMini ? 'fold' : 'open'}); persist(); G.key = ''; this.render(); }
      else if (a === 'ovgo') { G.ovMini = false; G.ovClosed[v] = false; persist(); G.key = ''; this.render(); const d = $(`#overview .osec[data-k="${v}"]`); if (d) d.scrollIntoView({block: 'start', behavior: 'smooth'}); }
      else if (a === 'open') $('#guide').classList.add('open');
      else if (a === 'close') $('#guide').classList.remove('open');
      else if (a === 'reset') { this.reset(); G.key = ''; renderPhone(false); }
    };
    addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
      const b = e.key === 'ArrowLeft' ? $('#gact .actb:not([disabled])') : (e.key === 'Enter' || e.key === 'ArrowRight') ? $('#gact .act:not([disabled])') : null;
      if (b) { e.preventDefault(); b.click(); } });
    $('#guide').addEventListener('click', h); $('#mbar').addEventListener('click', h); $('#overview').addEventListener('click', h);
    const tog = e => { const d = e.target; if (d.classList && d.classList.contains('osec')) G.ovClosed[d.dataset.k] = !d.open; };
    $('#overview').addEventListener('toggle', tog, true); $('#guide').addEventListener('toggle', tog, true);
    $('#guide').addEventListener('input', e => { if (e.target.dataset.gIn !== 'enh') return; const v = e.target.value;
      clearTimeout(this._q); this._q = setTimeout(() => { G.enhQ = v; const l = $('#enhlist'); if (l) l.innerHTML = this.enhListHTML(); }, 250);
      clearTimeout(this._qt); this._qt = setTimeout(() => { if (v.trim().length >= 3) Track.ev('enh_search', {detail: v.trim().toLowerCase(), step: this.enhRows().length}); }, 1500); });
  },

  /* ---------- self-test: plays every lesson with "Do it for me" ---------- */
  selftest() {
    const out = [];
    for (const ls of LESSONS) {
      let n = 0, err = null;
      try { this.start(ls.id); while (!G.fin && n++ < 500) { const before = this.sigAll();
        this.auto(); const after = this.sigAll();
        if (before === after && !G.fin) { err = 'stuck at step ' + (G.i + 1) + ': ' + (G.tg ? G.tg.txt : 'no target'); break; } }
        if (!err && ls.check) { const c = ls.check(); if (c !== true) err = 'check failed: ' + c; } }
      catch (e) { err = 'exception at step ' + (G.i + 1) + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]; }
      out.push({id: ls.id, ok: G.fin && !err, actions: n, err});
    }
    return out;
  }
};
