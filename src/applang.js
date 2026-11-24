'use strict';
/* The phone's own language. The real Avni app shows its screens and the organisation's form words in the language the user picks;
   here the guide's language button does the same for the practice phone.
   Words come from data/app-i18n.json: Avni's own Hindi and Gujarati app translations (avni-client translations/hi_IN, gu_IN),
   then the Desai form and card words. One pass over the phone's text after each draw, so screens need no changes;
   lessons find things by data attributes, never by visible words, so they keep working in every language. */
const AppLang = (() => {
  const DICT = DESAI.appI18n || {};
  const skip = el => el.closest('input, textarea, .rn, .av, [data-raw]');           // typed text and people's names stay as entered
  // Word, then the "Label: value" and "Label (unit)" shapes the screens use
  const SEP = /(\s*:\s*|,\s*|\s+-\s+|\s+·\s+|\s*\(\s*|\s*\)\s*)/;
  // one piece: the word itself, "23 Years", "<Form> Registration"
  function piece(d, k) {
    if (d[k]) return d[k];
    let m = k.match(/^([\d.,]+)\s+(.+)$/); if (m && d[m[2]]) return m[1] + ' ' + d[m[2]];
    m = k.match(/^(.+?)\s+(\*|Registration)$/); if (m && d[m[1]]) return d[m[1]] + ' ' + (d[m[2]] || m[2]);
    return null;
  }
  // a whole text, then the shapes the screens build: "Label: value", "Camp, 23-11-2026", "Name - Visit", "Course (date)", "Attendance · Batch"
  function t(s, lang = G.lang) {
    const d = DICT[lang]; if (!d || !s) return s;
    const k = s.trim(); if (!k) return s;
    const whole = piece(d, k); if (whole) return s.replace(k, whole);
    const parts = k.split(SEP); if (parts.length < 2) return s;
    let hit = false;
    const out = parts.map((x, i) => { if (i % 2) return x; const v = x && piece(d, x.trim()); if (v) { hit = true; return x.replace(x.trim(), v); } return x; }).join('');
    return hit ? s.replace(k, out) : s;
  }
  function apply(root) {
    if (G.lang === 'en' || !DICT[G.lang]) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => { if (!skip(n.parentElement)) { const v = t(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } });
    root.querySelectorAll('[placeholder]').forEach(el => { el.placeholder = t(el.placeholder); });
  }
  // the words the phone shows, for tools/app_strings.js (English only)
  function collect(root, into) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode, k = n.nodeValue.trim(); if (k && !skip(n.parentElement)) into.add(k); }
  }
  return {t, apply, collect};
})();
