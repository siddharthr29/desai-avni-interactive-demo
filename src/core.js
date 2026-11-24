'use strict';
/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const isEmpty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const QS = new URLSearchParams(location.search);
const SELFTEST = QS.has('selftest') || QS.has('qa');

/* ---------- icons (Material paths, 24x24) ---------- */
const IC = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  chev: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  dash: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  addbox: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  r0: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  r1: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  c0: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
  c1: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
  bksp: 'M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z',
  down: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
  up: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  dots: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
  user: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z',
  cam: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  folder: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
  video: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  okc: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  logout: 'M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
  hist: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  list: 'M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z',
  face: 'M9 11.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm6 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37a9.974 9.974 0 0 0 10.41 3.97c.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z',
  arrd: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  key: 'M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  prog: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM7 7h2v6H7zm4 0h2v9h-2zm4 0h2v4h-2z',
  sort: 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z',
  filterx: 'M14.76 20.83L17.6 18l-2.84-2.83 1.41-1.41L19 16.57l2.83-2.81 1.41 1.41L20.43 18l2.81 2.83-1.41 1.41L19 19.4l-2.83 2.84-1.41-1.41M12 12v7.88c.04.3-.06.62-.29.83a.996.996 0 0 1-1.41 0L8.29 18.7a.989.989 0 0 1-.29-.83V12h-.03L2.21 4.62a1 1 0 0 1 .17-1.4c.19-.14.4-.22.62-.22h14c.22 0 .43.08.62.22a1 1 0 0 1 .17 1.4L12.03 12H12z',
  minus: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z',
  plus: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z'
};
const ic = (n, s = 24, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="${IC[n]}"/></svg>`;

/* ---------- dates (ISO strings, local) ---------- */
const D = {
  p: iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); },
  iso: dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
  add: (iso, n) => { const d = D.p(iso); d.setDate(d.getDate() + n); return D.iso(d); },
  addM: (iso, n) => { const d = D.p(iso); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return D.iso(d); },
  som: iso => iso.slice(0, 8) + '01',
  eom: iso => { const d = D.p(iso); return D.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)); },
  dow: iso => D.p(iso).getDay(),
  M: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  W: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dmy: iso => iso ? iso.split('-').reverse().join('-') : '',
  long: iso => { const d = D.p(iso); return `${String(d.getDate()).padStart(2, '0')} ${D.M[d.getMonth()]} ${d.getFullYear()}`; },
  obs: iso => { const d = D.p(iso); return `${D.M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; },
  wk: iso => { const d = D.p(iso); return `${D.W[d.getDay()]} ${d.getDate()} ${D.M[d.getMonth()]}`; },
  months: (a, b) => { const x = D.p(a), y = D.p(b); let m = (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth(); if (y.getDate() < x.getDate()) m--; return m; }
};
// Practice "today". Classes run Monday to Saturday, so on a Sunday the whole page (and the rules' clock) moves to Monday.
const TODAY_REAL = D.iso(new Date());
let T = /^\d{4}-\d\d-\d\d$/.test(QS.get('date') || '') ? QS.get('date') : TODAY_REAL;
if (D.dow(T) === 0) T = D.add(T, 1);
if (T !== TODAY_REAL) (() => {                          // the rules read the date through moment(); move the clock for them too
  const Real = Date, offset = D.p(T).getTime() - D.p(TODAY_REAL).getTime();
  class FixedNow extends Real { constructor(...a) { if (a.length) super(...a); else super(Real.now() + offset); } static now() { return Real.now() + offset; } }
  window.Date = FixedNow;
})();
const isClassDay = iso => D.dow(iso) !== 0;
const prevClassDay = iso => { let n = D.add(iso, -1); while (!isClassDay(n)) n = D.add(n, -1); return n; };
const classDaysBack = (n, from = T) => { let d = from; for (let i = 0; i < n; i++) d = prevClassDay(d); return d; };
const addClassDays = (iso, n) => { let d = iso, k = 1; while (k < n) { d = D.add(d, 1); if (isClassDay(d)) k++; } return d; };   // last class day of an n-day batch

/* ---------- practice users: one per Desai role (made-up names) ---------- */
const ROLES = {
  fe: {name: 'Kajal Patel', login: 'kajal@desai_demo', groups: ['Field Executive'], role: ['Field Executive', 'फ़ील्ड एग्ज़िक्यूटिव', 'ફીલ્ડ એક્ઝિક્યુટિવ']},
  coord: {name: 'Nirav Shah', login: 'nirav@desai_demo', groups: ['Mid-Managerial'], role: ['Coordinator', 'कोऑर्डिनेटर', 'કોઓર્ડિનેટર']},
  mgmt: {name: 'Rupal Mehta', login: 'rupal@desai_demo', groups: ['Management'], role: ['Management', 'मैनेजमेंट', 'મેનેજમેન્ટ']},
  admin: {name: 'Dipak Joshi', login: 'dipak@desai_demo', groups: ['Admin and Operations'], role: ['Admin and Operations', 'एडमिन और ऑपरेशंस', 'એડમિન અને ઓપરેશન્સ']}
};
let ROLE = 'fe', USER = ROLES.fe;
const setRole = r => { ROLE = r; USER = ROLES[r]; };

/* ---------- database (Avni's shape: subjects, encounters, group members, attendance sessions and marks) ---------- */
let DB, UID = 0;
const uid = p => p + '-' + (++UID);
const subj = id => DB.subjects.find(s => s.uuid === id);
const isPerson = s => s && s.type === 'Beneficiary';
const fullName = s => !s ? '' : isPerson(s) ? `${s.firstName} ${s.lastName}`.trim() : s.firstName;
const initials = s => fullName(s).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();   // as the phone: "Computer (CST) ..." -> "C("
const ageYears = (dob, asOf = T) => Math.floor(D.months(dob, asOf) / 12);
const ageText = s => { const m = D.months(s.dob, T); return m >= 12 ? `${Math.floor(m / 12)} ${m >= 24 ? 'Years' : 'Year'}` : `${m} ${m === 1 ? 'Month' : 'Months'}`; };
const villageName = s => s && s.village ? (LOCS[s.village] || {}).name : '';
const encOf = s => DB.encounters.filter(e => e.subjectUuid === s.uuid && !e.voided);
const membersOf = g => DB.groupSubjects.filter(m => m.groupUuid === g.uuid && !m.voided);
const groupsOf = p => DB.groupSubjects.filter(m => m.memberUuid === p.uuid && !m.voided).map(m => subj(m.groupUuid)).filter(Boolean);
const vstat = (e, asOn = T) => e.encounterDateTime ? 'done' : e.cancelDateTime ? 'cancelled' : asOn > e.maxVisitDateTime ? 'overdue' : asOn >= e.earliestVisitDateTime ? 'due' : 'future';

function seed() {
  UID = 0;
  const V = n => villageBy(n).uuid;
  const S = [], E = [], M = [], SS = [], R = [];
  DB = {subjects: S, encounters: E, groupSubjects: M, sessions: SS, records: R};
  const ph = i => String(9824000000 + i * 1373);
  const person = (first, last, gender, age, village, edu, extra = {}, regAgo = 60) => {
    const p = {uuid: uid('P'), type: 'Beneficiary', firstName: first, lastName: last, gender, dob: D.add(D.addM(T, -12 * age), -40), registrationDate: D.add(T, -regAgo),
      village: V(village), by: 'Kajal Patel', obs: Object.assign({'Consent Given': 'Yes', Contact: ph(S.length + 1), 'Education Level': edu}, extra)};
    if (!['Illiterate', 'Graduate', 'Post-graduate'].includes(edu) && !p.obs['Std Class']) p.obs['Std Class'] = edu === 'Primary' ? 'Std 5' : edu === 'Secondary' ? 'Std 10' : 'Std 12';
    S.push(p); return p;
  };
  const visit = (p, type, o) => { const e = Object.assign({uuid: uid('E'), subjectUuid: p.uuid, type, name: type, encounterDateTime: null, earliestVisitDateTime: null, maxVisitDateTime: null, cancelDateTime: null, obs: {}, cancelObs: {}, by: 'Kajal Patel'}, o); E.push(e); return e; };
  const done = (p, type, daysAgo, obs) => visit(p, type, {encounterDateTime: D.add(T, -daysAgo), obs});
  const plan = (p, type, earliestAgo, maxIn) => visit(p, type, {earliestVisitDateTime: D.add(T, -earliestAgo), maxVisitDateTime: D.add(T, maxIn)});
  const camp = {'Camp Type': 'Gynec', 'Partner Name': 'Desai Foundation Trust', 'Camp Location': 'Agasi Primary School', 'Token Number': 12, 'Motivation for visit': 'Preventative', 'Check-up before': 'No', 'Family members': 5};
  const screen = {'Screening For': 'Gynec', 'Screenings Completed - Gynec': ['BP screening', 'Anemia screening'], 'Diagnosis - Gynec': ['Anemia'], 'Referral made': 'Yes', 'Follow-up needed': 'Yes'};

  // Health: camp day in Agasi
  const asha = person('Asha', 'Patel', 'Female', 32, 'Agasi', 'Secondary');
  const bhavna = person('Bhavna', 'Naik', 'Female', 28, 'Agasi', 'Higher Secondary');
  const daksha = person('Daksha', 'Desai', 'Female', 41, 'Agasi', 'Primary');
  const meena = person('Meena', 'Parmar', 'Female', 52, 'Agasi', 'Illiterate');
  const amit = person('Amit', 'Patel', 'Male', 35, 'Agasi', 'Secondary');
  const geeta = person('Geeta', 'Tandel', 'Female', 36, 'Kharoli', 'Illiterate');
  const hansa = person('Hansa', 'Dhodia', 'Female', 45, 'Kharoli', 'Primary');
  const hetal = person('Hetal', 'Halpati', 'Female', 22, 'Kharoli', 'Graduate');
  const rakesh = person('Rakesh', 'Gamit', 'Male', 29, 'Kharoli', 'Higher Secondary');
  const jyoti = person('Jyoti', 'Rathod', 'Female', 19, 'Chitali', 'Higher Secondary');
  const kajalG = person('Sunita', 'Gavit', 'Female', 24, 'Borkhal', 'Secondary');
  const komal = person('Komal', 'Bhoye', 'Female', 30, 'Rupvel', 'Secondary');
  const payal = person('Payal', 'Makwana', 'Female', 26, 'Rupvel', 'Graduate');
  const pooja = person('Pooja', 'Chaudhari', 'Female', 23, 'Rupvel', 'Higher Secondary');
  const manisha = person('Manisha', 'Vasava', 'Female', 27, 'Piraman', 'Graduate');
  const priya = person('Priya', 'Thakre', 'Female', 21, 'Piraman', 'Higher Secondary');
  const reena = person('Reena', 'Vasava', 'Female', 33, 'Piraman', 'Secondary');
  person('Reena', 'Vasava', 'Female', 34, 'Piraman', 'Secondary', {}, 6);   // a second record of Reena, for the Possible duplicates card
  const riya = person('Riya', 'Patel', 'Female', 12, 'Alipor', 'Primary', {'Std Class': 'Std 7', 'Where reached': 'School', 'School Name': 'Alipor Primary School'}, 20);
  const diya = person('Diya', 'Naik', 'Female', 10, 'Alipor', 'Primary', {'Std Class': 'Std 5', 'Where reached': 'School', 'School Name': 'Alipor Primary School'}, 20);
  const sanjay = person('Sanjay', 'Pawar', 'Male', 14, 'Alipor', 'Secondary', {'Std Class': 'Std 9', 'Where reached': 'Village'}, 20);
  const nisha = person('Nisha', 'Solanki', 'Female', 15, 'Alipor', 'Secondary', {'Std Class': 'Std 10', 'Where reached': 'School', 'School Name': 'Alipor High School'}, 20);
  const sangita = person('Sangita', 'Parmar', 'Female', 38, 'Kharoli', 'Primary', {'Consent Given': 'No'}, 12);
  delete sangita.obs.Contact; delete sangita.obs['Education Level']; delete sangita.obs['Std Class'];
  [asha, bhavna, daksha, meena, amit].forEach(p => p.registrationDate = D.add(T, -2));   // registered this week at the camp
  bhavna.registrationDate = T;

  [asha, bhavna, daksha, geeta, hansa, meena].forEach((p, i) => done(p, 'Health Camp', i < 2 ? 0 : i < 4 ? 2 : 40, Object.assign({}, camp, i > 3 ? {'Camp Location': 'Kharoli Panchayat Hall'} : {})));
  [geeta, hansa].forEach(p => done(p, 'Screening', 40, screen));
  plan(geeta, 'Health Follow-up', 10, -2);                  // overdue
  plan(hansa, 'Health Follow-up', 2, 12);                   // due
  plan(meena, 'Health Follow-up', 1, 14);                   // due
  done(meena, 'Screening', 31, Object.assign({}, screen, {'Screening For': 'General Health', 'Screenings Completed - General Health': ['BP screening'], 'Diagnosis - General Health': ['High BP'], 'Screenings Completed - Gynec': undefined, 'Diagnosis - Gynec': undefined}));
  done(daksha, 'Health Follow-up', 6, {'Given screening or check-up': 'Yes', 'Outcome of screening': 'Referral', 'Followed through on referral': 'No', 'Why referral not followed': 'Too far', 'Given recommended practices': 'No'});
  E.filter(e => e.obs['Screenings Completed - Gynec'] === undefined).forEach(e => { Object.keys(e.obs).forEach(k => e.obs[k] === undefined && delete e.obs[k]); });

  // Livelihood: Sewing batch in Agasi (running, last two class days not marked), Computer batch in Kharoli, Beautician in Rupvel
  const batch = (type, village, startAgo, days, label) => {
    const start = classDaysBack(startAgo), last = addClassDays(start, days), month = D.M[D.p(start).getMonth()] + ' ' + D.p(start).getFullYear();
    const g = {uuid: uid('G'), type, firstName: `${type} - ${month} - ${label || village}`, registrationDate: start, village: V(village), by: 'Kajal Patel',
      obs: {'Batch Start Date': start, 'Batch Last Class Day': last, 'Batch month': month}};
    S.push(g); return g;
  };
  const join = (g, people, start) => people.forEach(p => M.push({uuid: uid('M'), groupUuid: g.uuid, memberUuid: p.uuid, start: start || g.registrationDate, end: null}));
  const classes = (g, upTo, absent = {}) => { let d = g.registrationDate; const members = M.filter(m => m.groupUuid === g.uuid);
    while (d <= upTo) { if (isClassDay(d)) { const s = {uuid: uid('S'), groupSubjectUUID: g.uuid, scheduledDate: d, status: 'Held', reason: null}; SS.push(s);
      members.filter(m => m.start <= d).forEach((m, i) => { const away = (absent[m.memberUuid] || 0) > 0 && (D.p(d).getDate() + i) % 3 === 0;
        R.push({uuid: uid('A'), sessionUUID: s.uuid, subjectUUID: m.memberUuid, status: away ? 'Absent' : 'Present', reason: away ? 'Family' : null}); }); }
      d = D.add(d, 1); } };
  const sewing = batch('Sewing (SST)', 'Agasi', 18, 90);
  join(sewing, [asha, bhavna, daksha, meena, jyoti, hetal]);
  classes(sewing, classDaysBack(3), {[daksha.uuid]: 1});
  const computer = batch('Computer (CST)', 'Kharoli', 30, 90);
  join(computer, [hetal, rakesh, geeta, payal]);
  classes(computer, prevClassDay(T));
  const beauty = batch('Beautician Skill Training', 'Rupvel', 2, 90);
  join(beauty, [komal, payal, pooja]);
  classes(beauty, prevClassDay(T));
  const summer = batch('Summer Camp', 'Alipor', 12, 5);
  join(summer, [riya, diya, sanjay]);
  classes(summer, summer.obs['Batch Last Class Day']);
  const chocolate = batch('Chocolate (CMT)', 'Piraman', 1, 3);
  join(chocolate, [manisha, priya, reena]);

  // Livelihood journey of the sewing students: intake, baseline, and an older computer cohort that finished
  const intake = course => ({'Training Course': course, 'Partner Name': 'Desai Foundation Trust', 'Training Location': 'Agasi Community Hall', 'Work Status': 'Homemaker', 'Has Bank Account': 'Yes',
    'Average Monthly Income': 'No income', 'Monthly Household Income': '₹12001 - ₹24000', 'Fill Scoring Matrix': 'No', 'Asani Confirmation': 'Confirm', 'Selected For Training': 'Yes', 'Owns Sewing Machine': 'No'});
  [asha, bhavna, daksha, meena, jyoti].forEach(p => done(p, 'Livelihood Event', 25, intake('Sewing (SST)')));
  [asha, daksha, meena].forEach(p => done(p, 'Baseline / Pre-test', 17, {'Pre-test Score': 40, 'Knowledge Level': 'Low', 'Skill Confidence': 'Rather low'}));
  plan(bhavna, 'Baseline / Pre-test', 3, 4);                // due
  plan(jyoti, 'Baseline / Pre-test', 20, -6);               // overdue
  [hetal, rakesh].forEach(p => { done(p, 'Livelihood Event', 34, Object.assign(intake('Computer (CST)'), {'Owns Sewing Machine': undefined, 'Computer Experience': 'Never used', 'Training Location': 'Kharoli Panchayat Hall'}));
    done(p, 'Baseline / Pre-test', 28, {'Pre-test Score': 35, 'Knowledge Level': 'Low', 'Skill Confidence': 'Moderate'}); });
  E.forEach(e => Object.keys(e.obs).forEach(k => e.obs[k] === undefined && delete e.obs[k]));
  plan(rakesh, 'Endline / Post-test', 2, 10);              // due
  done(geeta, 'Endline / Post-test', 45, {'Post-test Score': 70, 'Pre-test Score Carried': 30, 'Score change': 40, 'Knowledge Level': 'High', 'Skill Confidence': 'Rather high', 'Programme outcome': 'Completed'});
  const lf = plan(geeta, 'Livelihood Follow-up', 15, 14);   // due
  const lf2 = plan(hansa, 'Livelihood Follow-up', 40, -10); // overdue

  // Events and the annual plan
  const event = (prog, cat, ago, status, w, cm, cf, inr) => {
    const date = D.add(T, -ago), all = w + cm + cf;
    S.push({uuid: uid('X'), type: 'Event Matrix', firstName: `${prog} - ${D.long(date)}`, registrationDate: date, village: V('Agasi'), by: 'Kajal Patel',
      obs: {'Program Category': cat, 'Program Name': prog, 'Expected Beneficiaries': all + 10, 'Event Start Date': date, 'Partner Name': 'Desai Foundation Trust', Women: w, 'Children Male': cm, 'Children Female': cf, Children: cm + cf,
        'All Impacted': all, 'Indirect Beneficiary': all * 4, 'USD Exchange Rate': 84, 'Investment Cost Partner DF Funded INR': inr, 'Investment Cost Partner DF Funded USD': Math.round(inr / 84 * 100) / 100,
        'Total Investment INR': inr, 'Total Investment USD': Math.round(inr / 84 * 100) / 100, 'Expense Month Year': moment(date).format('MMM YYYY'), 'Event Status': status}});
  };
  event('Gynec Checkup & Awareness Camp', 'Health', 9, 'Submitted', 64, 0, 0, 42000);
  event('Health & Hygiene Awareness', 'Health', 12, 'Draft', 30, 22, 18, 12000);
  event('Sewing Skill Training', 'Livelihood', 3, 'Draft', 25, 0, 0, 65000);
  const fy = D.p(T).getMonth() >= 3 ? D.p(T).getFullYear() : D.p(T).getFullYear() - 1;
  S.push({uuid: uid('X'), type: 'Annual Program Plan', firstName: `Annual Plan FY ${fy}-${String(fy + 1).slice(2)} - South Gujarat`, registrationDate: `${fy}-04-02`, village: V('Agasi'), by: 'Rupal Mehta',
    obs: {'Details of the Program': [{'Program Category': 'Health', 'Program Name': 'Gynec Checkup & Awareness Camp', 'Expected Beneficiaries': 1200, 'Partner Name': ['Desai Foundation Trust'], 'Planned Investment Cost INR': 480000},
      {'Program Category': 'Livelihood', 'Program Name': 'Sewing Skill Training', 'Expected Beneficiaries': 150, 'Partner Name': ['Desai Foundation Trust'], 'Planned Investment Cost INR': 900000}]}});
  DB.people = {asha, bhavna, daksha, meena, amit, geeta, hansa, hetal, rakesh, jyoti, payal, komal, pooja, riya, diya, sanjay, nisha, sangita, manisha, priya, reena};
  DB.batches = {sewing, computer, beauty, summer, chocolate};
  touch();
}

