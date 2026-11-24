'use strict';
window.__errs = [];
window.addEventListener('error', e => window.__errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
function fit() {
  const st = $('#stage'), bz = $('#bezel'), mobile = matchMedia('(max-width:980px)').matches;
  const bw = mobile ? 384 : 408, bh = mobile ? 832 : 856;
  const ov = $('#overview'), ow = document.body.classList.contains('ovw') && ov ? ov.offsetWidth + 28 : 0;
  const W = st.clientWidth - (mobile ? 0 : 32) - ow, H = st.clientHeight - (mobile ? ($('#mbar').offsetHeight || 0) : 48);
  const k = Math.max(0.3, Math.min(1.12, W / bw, H / bh));
  bz.style.transform = `scale(${k})`;
  const w = $('#phone-wrap'); w.style.width = bw * k + 'px'; w.style.height = bh * k + 'px';
}
window.addEventListener('DOMContentLoaded', () => {
  Guide.reset('fe'); bindPhone(); Guide.bind(); renderPhone(false); fit();
  Track.ev('session_start', {detail: innerWidth + 'x' + innerHeight});
  window.addEventListener('resize', () => { G.key = ''; Guide.render(); fit(); });
  setInterval(() => { const el = $('#phone .sb span'); if (el) { const n = new Date(); el.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); } }, 30000);
  if (QS.get('lang')) Guide.setLang(QS.get('lang'));
  if (QS.get('mode')) Guide.setMode(QS.get('mode'));
  if (QS.has('selftest')) {
    let res; try { res = Guide.selftest(); } catch (e) { res = [{id: 'selftest', ok: false, err: e.message}]; }
    const pre = document.createElement('pre'); pre.id = 'selftest';
    Guide.reset('fe');
    const cards = sectionsOf(dashboardsFor().primary).flatMap(s => s.cards).map(c => c.name + '=' + cardResult(c, null).count).join(' | ');
    pre.textContent = JSON.stringify({pass: res.every(r => r.ok) && !window.__errs.length, results: res, errors: window.__errs, today: T, cards});
    document.body.appendChild(pre);
  }
  if (QS.has('strings')) {                                   // every guide sentence, for translation (tools/strings.py)
    const out = new Set(), add = x => { if (x && typeof x === 'string') out.add(x); };
    LESSONS.forEach(l => { [l.t, l.d, l.why].forEach(add); l.flow.forEach(f => add(f[0])); l.take.forEach(add);
      l.steps.forEach(st => { [st.t, st.why, st.tag, st.sum].forEach(add); Object.values(st.notes || {}).forEach(add); Object.values(st.expect || {}).forEach(add); Object.values(st.tags || {}).forEach(add); }); });
    Object.values(HERE).forEach(h => { add(h[0]); h[1].forEach(add); }); GROUPS.forEach(g => add(g[1])); Object.values(ROLES).forEach(r => add(r.role[0]));
    DESAI.enh.forEach(r => { add(r.area); add(r.status); });
    const pre = document.createElement('pre'); pre.id = 'strings'; pre.textContent = JSON.stringify([...out]); document.body.appendChild(pre);
  }
  if (QS.get('lesson')) { Guide.start(QS.get('lesson')); const n = +QS.get('steps') || 0; for (let i = 0; i < n && !G.fin; i++) Guide.auto(); }
  if (QS.get('open')) $('#guide').classList.add('open');
  if (QS.has('mini')) { G.ovMini = true; G.key = ''; Guide.render(); }
  if (QS.has('enh')) { G.page = 'enh'; G.enhQ = QS.get('enh') || ''; G.key = ''; Guide.render(); }   // link straight to What we added, optionally searched
});
