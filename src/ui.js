'use strict';
/* ================= state ================= */
const S = {stack: [{n: 'home'}], modal: null, toast: null, exp: {}, search: {type: 'Beneficiary', text: '', voided: false}, filter: {picked: [], tmp: []}, login: {u: '', p: ''}, att: null};
let F = null;                                   // the form being filled (null when no form is open)
const topScr = () => S.stack[S.stack.length - 1];
const go = (n, p = {}) => S.stack.push({n, ...p});
const goBack = () => { if (S.stack.length > 1) S.stack.pop(); };
const goHome = () => { S.stack = [{n: 'home'}]; F = null; S.modal = null; S.att = null; };
const toast = m => { S.toast = {m, id: Date.now()}; };
const later = (fn, ms) => SELFTEST ? fn() : setTimeout(fn, ms);
const live = notVoided;

/* ================= dashboards ================= */
const cardRes = {};
const under = uuid => [uuid, ...DESAI.locations.filter(l => l.parent === uuid).flatMap(l => under(l.uuid))];
const filterPlaces = () => S.filter.picked.length ? _.uniq(S.filter.picked.flatMap(under)) : null;
function cardOf(card) { const r = cardResult(card, filterPlaces()); cardRes[card.uuid] = r; return r; }
function dashHTML(d, tag) {
  const deepest = S.filter.picked.filter(u => !S.filter.picked.some(o => LOCS[o].parent === u));
  const applied = deepest.length ? `<div class="afl"><span class="aclr" data-a="d:clear">${ic('filterx', 20, '#009688')}</span>${deepest.map(u => `<div><b>${esc(LOCS[u].type)} - </b>${esc(LOCS[u].name)}</div>`).join('')}</div>` : '';
  return `<div class="dtop"><span class="fbtn" data-a="d:filter">FILTER</span></div>${applied}` + sectionsOf(d).map((sec, si) => `<div class="sec" data-sec="${tag}${si}"><h4>${esc(sec.name)}</h4><div class="cards">${sec.cards.map(c => {
    const n = cardOf(c).count;
    return `<div class="dc" style="background:${c.color || '#E7F3F8'}" data-a="card" data-v="${c.uuid}"><div class="n">${n}</div><div class="l">${esc(c.name)}</div>${n ? `<div class="cv">${ic('chev', 18, '#333')}</div>` : ''}</div>`; }).join('')}</div></div>`).join('') + '<div style="height:26px"></div>';
}

/* ================= shared pieces ================= */
function rowHTML(s, extra = '', act = 'open') {
  const sub = isPerson(s) ? `<div class="rs"><span>${s.gender}</span><span>${ageText(s)}</span></div>` : '';
  return `<div class="row" data-a="${act}" data-v="${s.uuid}"><div class="av">${esc(initials(s))}</div><div class="rt"><div class="rn">${esc(fullName(s))}${s.voided ? '<span style="color:#f00"> (VOIDED)</span>' : ''}</div>${sub}<div class="ra">${esc(villageName(s))}</div>${extra}</div></div>`;
}
const STAT = {due: ['Due', '#009688'], overdue: ['Overdue', '#d0011b'], future: ['Scheduled For', '#B8860B']};
function plannedHTML(list) {
  const open = list.filter(isOpen).sort((a, b) => a.earliestVisitDateTime < b.earliestVisitDateTime ? -1 : 1);
  return `<div class="cap">Visits Planned</div>` + (open.length ? open.map(e => { const st = STAT[vstat(e)];
    return `<div class="vc" data-enc="${e.uuid}"><div class="vt">${esc(e.name)}</div><div class="vd">Scheduled For: ${D.long(e.earliestVisitDateTime)}</div><span class="vb" style="background:${st[1]}">${st[0]}</span><div class="va"><span class="red" data-a="visit:cancel" data-v="${e.uuid}">Cancel</span><span class="tl" data-a="visit:do" data-v="${e.uuid}">Do</span></div></div>`; }).join('')
    : `<div class="vc"><div class="vd" style="color:#222;font-size:16.5px">No planned visits</div></div>`);
}
function completedHTML(list, cap) {
  const done = list.filter(e => e.encounterDateTime || e.cancelDateTime).sort((a, b) => (a.encounterDateTime || a.cancelDateTime) < (b.encounterDateTime || b.cancelDateTime) ? 1 : -1);
  return `<div class="cap">${cap}</div>` + (done.length ? done.map(e => { const ex = S.exp[e.uuid];
    return `<div class="vc" data-enc="${e.uuid}"><div class="vt">${esc(e.type)}</div><span class="exp" data-a="exp" data-v="${e.uuid}">${ic(ex ? 'up' : 'down', 26, '#666')}</span>` +
      (e.cancelDateTime ? `<div class="vd">Cancelled on: ${D.long(e.cancelDateTime)}</div><div class="vd">Scheduled For: ${D.long(e.earliestVisitDateTime)}</div>` + (ex ? obsTable(formFor('IndividualEncounterCancellation', subj(e.subjectUuid).type, e.type), e.cancelObs) : '')
        : `<div class="vd">Visit Date: ${D.long(e.encounterDateTime)} by ${esc(e.by || USER.name)} </div><div class="vd">${e.earliestVisitDateTime ? 'Scheduled For: ' + D.long(e.earliestVisitDateTime) : 'Unplanned Visit'}</div>` + (ex ? obsTable(formFor('Encounter', subj(e.subjectUuid).type, e.type), e.obs) : '') +
          `<div class="va"><span class="tl" data-a="visit:edit" data-v="${e.uuid}">Edit</span></div>`) + `</div>`; }).join('')
    : `<div class="vc"><div class="vd" style="color:#222;font-size:16.5px">No previous visits</div></div>`);
}
function fmtv(el, v) {
  if (isEmpty(v)) return '';
  const d = cdef(el);
  if (d.dataType === 'Date' || d.dataType === 'DateTime') return D.obs(v);
  if (Array.isArray(v)) return v.map(esc).join(', ');
  return esc(v) + (d.unit ? ' ' + esc(d.unit) : '');
}
function obsTable(form, obs, editAct) {
  if (!form) return '';
  let h = '';
  pagesOf(form).forEach((g, pi) => {
    let rows = '';
    topElements(g).forEach(el => {
      const v = obs[cname(el)];
      if (cdef(el).dataType === 'QuestionGroup') { const rs = (Array.isArray(v) ? v : v ? [v] : []).filter(r => Object.keys(r).length); if (!rs.length) return;
        rs.forEach(r => { rows += `<tr><td colspan="2" style="color:#555">${esc(el.name)}</td></tr>` + childElements(g, el).filter(k => !isEmpty(r[cname(k)])).map(k => `<tr><td class="sub">${esc(k.name)}</td><td>${fmtv(k, r[cname(k)])}</td></tr>`).join(''); });
      } else if (!isEmpty(v)) rows += `<tr><td>${esc(el.name)}</td><td>${fmtv(el, v)}</td></tr>`;
    });
    if (rows) h += `<tr><th colspan="2">${esc(g.display || g.name)}${editAct ? `<span data-a="${editAct}" data-v="${pi}">Edit</span>` : ''}</th></tr>` + rows;
  });
  return `<table class="obs">${h}</table>`;
}

/* ================= screens ================= */
const SCREENS = {
  login: () => ({noHdr: 1, body: `<div class="login"><div class="lg">avni</div><div style="color:#666;font-size:14px">Desai Foundation Trust</div>
    <div class="fe"><div class="fl">User ID</div><input class="ti" data-in="login" data-k="u" value="${esc(S.login.u)}" autocomplete="off"></div>
    <div class="fe"><div class="fl">Password</div><input class="ti" type="password" data-in="login" data-k="p" value="${esc(S.login.p)}" autocomplete="off"></div>
    <div class="lb" data-a="login:go">LOGIN</div><div class="fp">Forgot Password</div></div>`}),
  home: () => { const d = dashboardsFor().primary; return {title: 'Home', right: ['search', 'sync'], tabs: 'home', body: d ? dashHTML(d, 'h') : '<div class="empty">No dashboard</div>'}; },
  dash2: () => { const d = dashboardsFor().secondary; return {title: 'Home', right: ['search', 'sync'], tabs: 'dash2', body: dashHTML(d, 's')}; },
  dashlist: p => { const all = dashboardsFor().all, cur = all.find(d => d.name === p.name) || all[0]; return {title: 'Dashboards', back: 1, body: `<div class="dline"></div><div class="dtabs">${all.map(d => `<span class="${d === cur ? 'on' : ''}" data-a="dash:tab" data-v="${esc(d.name)}">${esc(d.name)}</span>`).join('')}</div>` + dashHTML(cur, 'x')}; },
  filter: () => filterScreen(),
  cards: p => { const c = CARDU[p.id], r = cardRes[p.id] || cardOf(c), list = r.ids.map(subj).filter(Boolean);
    return {title: c.name.length > 30 ? c.name.slice(0, 30) + '...' : c.name, back: 1, right: ['home'], cls: 'gray', body: `<div class="cnt"><span>${list.length} matching results</span><span>Displayed: ${list.length}</span></div>` + (list.map(s => rowHTML(s)).join('') || '<div class="zero">No result found</div>')}; },
  search: () => ({title: 'Search', tabs: 'none', body: `<div class="pad"><div class="fe"><div class="fl">Choose type</div><div class="rg">${BUNDLE.subjectTypes.filter(live).map(t => t.name).sort().map(t => `<div class="ro" data-a="s:type" data-v="${esc(t)}">${ic(S.search.type === t ? 'r1' : 'r0', 22, '#009688')}<span>${esc(t)}</span></div>`).join('')}</div></div>
    <div class="fe"><div class="fl">All registration and enrolment text fields</div><input class="ti" data-in="stext" value="${esc(S.search.text)}" autocomplete="off"></div>
    <div class="fe"><div class="fl">Include voided</div><div class="ck" data-a="s:void">${ic(S.search.voided ? 'c1' : 'c0', 26, S.search.voided ? '#009688' : '#999')}<span style="margin-left:14px">Yes</span></div></div></div><div class="sbm" data-a="s:submit">Submit</div>`}),
  results: p => { const q = S.search.text.trim().toLowerCase(), type = p.type || S.search.type;
    const list = DB.subjects.filter(s => s.type === type && (S.search.voided || live(s)) && (!q || (fullName(s) + ' ' + Object.values(s.obs).join(' ')).toLowerCase().includes(q)) && (!p.exclude || !p.exclude.includes(s.uuid)))
      .sort((a, b) => fullName(a) < fullName(b) ? -1 : 1);
    return {title: p.pick ? `${fullName(subj(p.pick))} - Add Member - Search` : 'Search Results', back: 1, right: ['home'], cls: 'gray', body: `<div class="cnt"><span>${list.length} matching results</span></div>` + (list.map(s => rowHTML(s, '', p.pick ? 'am:pick' : 'open')).join('') || `<div class="empty">No results</div>`)}; },
  register: () => ({title: 'Register', tabs: 'register', cls: 'gray', body: `<div class="rlist">${BUNDLE.subjectTypes.filter(t => live(t) && can('RegisterSubject', t.name)).sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1).map(t => `<div class="rtype" data-a="rtype" data-v="${esc(t.name)}"><span class="rti"><img src="${DESAI.icons[t.type.toLowerCase()] || DESAI.icons.individual}" alt=""></span><span class="rtn">${esc(t.name)}</span><span class="rtc">${ic('chev', 40, '#009688')}</span></div>`).join('')}</div>`}),
  more: () => ({noHdr: 1, tabs: 'more', cls: 'gray', body: `<div class="mu">${ic('user', 44, '#fff')}<div><b>${USER.login} - ${esc(USER.name)} (desai_demo)</b><span>Edit Settings</span></div></div>` +
    [[['dash', 'Dashboards'], ['video', 'Video List'], ['prog', 'Desai reports (Metabase)']], [['sync', 'Entity Sync Status'], ['hist', 'Setup fast sync'], ['place', 'Clinic sharing']], [['key', 'Change Password'], ['logout', 'Logout']], [['hist', 'Upload app info']]]
      .map(g => `<div class="mg">${g.map(([i, n]) => `<div class="mi" data-a="more" data-v="${n}">${ic(i, 26, '#444')}<span>${n}</span>${n === 'Logout' ? '' : ic('chev', 34, '#35a99b')}</div>`).join('')}</div>`).join('') +
    `<div class="minfo"><small>Server:</small> https://server.avniproject.org<br><small>Backend:</small> sqlite<br><small>Database Schema :</small> 8</div>`}),
  subject: p => subjectScreen(p),
  addMember: p => addMemberScreen(p),
  attendance: () => attendanceScreen(),
  roster: () => rosterScreen(),
  didnt: () => didntScreen(),
  form: () => formScreen(),
  summary: () => summaryScreen()
};

function regCard(s, canEdit) {
  const ex = S.exp['reg' + s.uuid], form = formFor('IndividualProfile', s.type);
  return `<div class="cap">Registration Details</div><div class="vc" data-reg="1"><div class="vt" style="padding-right:26px">Registered on ${D.long(s.registrationDate)} by ${esc(s.by || USER.name)}</div><span class="exp" data-a="exp" data-v="reg${s.uuid}">${ic(ex ? 'up' : 'down', 22, '#666')}</span>` +
    (ex ? (isPerson(s) ? '' : `<table class="obs"><tr><td>Name</td><td>${esc(fullName(s))}</td></tr></table>`) + obsTable(form, s.obs, canEdit ? 'reg:edit' : null) : '') +
    `<div class="va">${can('VoidSubject', s.type) ? '<span class="red" data-a="reg:void">Void</span>' : ''}${canEdit ? '<span class="tl" data-a="reg:edit" data-v="-1">Edit</span>' : ''}<span class="tl" data-a="noop" data-v="Share">Share</span></div></div>`;
}
function subjectScreen(p) {
  const s = subj(p.id), person = isPerson(s), group = STN[s.type].group, canEdit = can('EditSubject', s.type);
  const line = person ? `${s.gender}, ${ageText(s)}, ${villageName(s)}` : villageName(s);
  let b = `<div class="ph"><div class="av">${esc(initials(s))}</div><div class="pn"><b>${esc(fullName(s))}${s.voided ? ' (voided)' : ''}</b><span>${esc(line)}</span></div><div class="loc" data-a="noop" data-v="Location">${ic('place', 38, '#009688')}<div>Location</div></div></div>`;
  if (person) groupsOf(s).forEach(g => { b += `<div class="gchip"><span data-a="open" data-v="${g.uuid}">${esc(fullName(g))}</span></div>`; });
  const hasGeneral = BUNDLE.formMappings.some(m => !m.voided && m.formType === 'Encounter' && m.subjectTypeUUID === STN[s.type].uuid);
  b += `<div class="pbody">`;
  if (hasGeneral) b += `<div class="nfb"><span class="tbtn" data-a="newform">New Form</span></div>`;
  const sum = summaryFor(s);
  if (sum.length) b += `<div class="cap">Summary</div><div class="sumb"><table class="obs flat">${sum.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.value)}</td></tr>`).join('')}</table></div>`;
  b += regCard(s, canEdit);
  if (group && attendanceTypeFor(s) && canEdit) b += `<div class="vc attcard" data-a="att:open"><div><b>Attendance</b><span>1 attendance types</span></div><span class="tl">Attendance →</span></div>`;
  if (group) { const ms = membersOf(s), ex = S.exp['mem' + s.uuid] !== false;
    b += `<div class="vc" data-mem="1"><div class="mhead" data-a="exp" data-v="mem${s.uuid}"><span>Members (${ms.length})</span>${can('AddMember', s.type) ? `<span class="tl" data-a="am:open">Add Member</span>` : ''}<span class="exp">${ic(ex ? 'up' : 'down', 22, '#666')}</span></div>` +
      (ex && ms.length ? `<div class="mcard"><div class="mh2"><span>Name</span><span>Actions</span></div>` + ms.map(m => { const c = subj(m.memberUuid), due = encOf(c).filter(e => isOpen(e) && e.earliestVisitDateTime <= T).length;
        return `<div class="mrow"><div class="av">${esc(initials(c))}</div><div class="mn"><a data-a="open" data-v="${c.uuid}">${esc(fullName(c))}</a><sup>${due}</sup><small>Member</small></div><span data-a="mem:menu" data-v="${m.uuid}">${ic('dots', 25, '#148be4')}</span></div>`; }).join('') + `</div>` : '') + `</div>`; }
  b += `</div>`;
  if (hasGeneral) b += plannedHTML(encOf(s)) + completedHTML(encOf(s), 'Completed Encounters');
  return {title: 'Dashboard', back: 1, right: ['home'], body: b + '<div style="height:60px"></div>'};
}
function addMemberScreen(p) {
  const g = subj(p.id), c = p.member && subj(p.member), ready = p.role && (p.start || T);
  let b = `<div class="fe"><div class="fl">Role <i>*</i></div><div class="rg"><div class="ro" data-a="am:role" data-v="Member">${ic(p.role ? 'r1' : 'r0', 22, '#009688')}<span>Member</span></div></div></div>
    <div class="fe"><div class="fl" style="font-size:15px">Membership start date <i>*</i></div><span class="dv" data-a="am:date">${D.dmy(p.start || T)} ${ic('bksp', 20, '#009688')}</span></div>`;
  if (ready) b += `<div class="fe" style="padding-top:20px"><div class="fl">Group Member <i>*</i></div>` +
    (c ? `<div class="amsel"><span>${esc(fullName(c))}</span><span data-a="am:search">${ic('search', 36, '#009688')}</span></div>` : `<div class="cbtn" data-a="am:search">Search existing Beneficiary</div>`) +
    (p.err ? `<div class="err">${esc(p.err)}</div>` : '') + (c ? '' : `<div style="text-align:center;margin:20px 0 0">OR</div><div class="cbtn" data-a="rtype" data-v="Beneficiary">Register new Beneficiary</div>`) + `</div>`;
  if (c) b += `<div class="fbt"><div class="fb pv" data-a="hdr:back">${ic('prev', 17)} PREVIOUS</div><div class="fb nx" data-a="am:save">SAVE ${ic('next', 17)}</div></div>`;
  return {title: p.role ? 'Add Member' : 'Add new member', back: 1, right: ['home'], body: `<div class="pad" style="padding:28px 28px 60px">${b}</div>`};
}
const filterLevels = () => { const out = [], top = DESAI.locations.filter(l => !l.parent); let parents = top.map(l => l.uuid), level = top;
  while (level.length) { out.push(level); const picked = level.filter(l => S.filter.tmp.includes(l.uuid)); if (!picked.length) break; level = DESAI.locations.filter(l => picked.some(p => p.uuid === l.parent)); }
  return out; };
function filterScreen() {
  const lv = filterLevels();
  return {title: 'FILTER', back: 1, right: ['home'], foot: `<div class="apply" data-a="fl:apply">Apply</div>`, body: `<div class="fbox"><div class="flab"><span>Village</span></div><div class="fhint"> (Selection includes lower levels implicitly)</div><div class="addr">` +
    lv.map((level, i) => `${i ? '<div class="adiv"></div>' : ''}<div class="rgh"><span>${esc(level[0].type)}</span>${i < 4 ? `<span class="any ${level.some(l => S.filter.tmp.includes(l.uuid)) ? '' : 'on'}">Any</span>` : ''}</div><div class="rg" style="border:0">${level.map(l => `<div class="ro" data-a="fl:pick" data-v="${l.uuid}">${ic(S.filter.tmp.includes(l.uuid) ? 'c1' : 'c0', 22, '#009688')}<span>${esc(l.name)}</span></div>`).join('')}</div>`).join('') + `</div></div>`};
}

/* ---------- Avni Attendance (18.2): sheet with a date strip, then the roster or "Didn't happen" ---------- */
const longDay = iso => { const d = D.p(iso); return `${D.W[d.getDay()]} ${d.getDate()} ${D.M[d.getMonth()]} ${d.getFullYear()}`; };
function attendanceScreen() {
  const a = S.att, g = subj(a.g), days = [];
  for (let i = 13; i >= 0; i--) days.push(D.add(T, -i));
  const s = sessionOn(g.uuid, a.date), off = !isWorkingDay(a.date), ack = a.ack || !!s;
  let b = `<div class="pkr"><small>Jump to date</small><span data-a="att:date">${D.dmy(a.date)}</span></div><div class="dstrip" id="dstrip">${days.map(d => { const ss = sessionOn(g.uuid, d);
    return `<div class="dd ${d === a.date ? 'on' : ''} ${!isWorkingDay(d) ? 'off' : ''}" data-a="att:day" data-v="${d}"><small>${D.W[D.dow(d)].toUpperCase()}</small><b>${D.p(d).getDate()}</b><i>${ss ? `<u class="${ss.status === 'Held' ? 'held' : 'dh'}"></u>` : ''}</i></div>`; }).join('')}</div>`;
  if (a.date !== T) b += `<div class="retro">Marking retroactively for ${longDay(a.date)}</div>`;
  b += `<div class="dban ${off ? 'off' : ''}"><div><b>${longDay(a.date)}</b><span>${off ? 'Weekly off' : 'Working day'}</span></div>${off && !ack ? '<span class="tl" data-a="att:anyway">Mark anyway →</span>' : ''}</div>`;
  if (!off || ack) {
    const at = attendanceTypeFor(g), recs = s ? recordsOf(s.uuid) : [];
    const status = !s ? '<span class="nm">Not marked yet</span>' : s.status === 'Held' ? `<span class="hp">✓ ${recs.filter(r => r.status === 'Present').length} of ${recs.length} present</span>` : `<span class="dhs">⊘ Didn't happen · ${esc(s.reason || '')}</span>`;
    b += `<div class="atype"><div class="atl"><b>${esc(at.name)}</b>${status}</div><div class="atr">` + (!s ? `<span class="tl" data-a="att:mark">Mark attendance</span><span class="gr" data-a="att:didnt">Didn't happen</span>`
      : `${s.status === 'Held' ? `<span class="chev" data-a="att:exp">${ic(a.exp ? 'up' : 'down', 18, '#009688')}</span>` : ''}<div class="cab"><span class="red" data-a="att:void">Void</span><span class="tl" data-a="att:edit">Edit</span><span class="tl" data-a="noop" data-v="Share">Share</span></div>`) + `</div></div>`;
    if (s && s.status === 'Held' && a.exp) b += `<div class="aexp">${recs.map(r => ({r, p: subj(r.subjectUUID)})).sort((x, y) => fullName(x.p) < fullName(y.p) ? -1 : 1).map(({r, p}) => `<div><span>${esc(fullName(p))}</span>${r.status === 'Present' ? '<span class="tl">Present</span>' : `<span class="gr">Absent · ${esc(r.reason || '')}</span>`}</div>`).join('') || '<i>No attendance records.</i>'}</div>`;
  }
  return {title: 'Attendance · ' + fullName(g), back: 1, right: ['home'], body: b};
}
function openRoster() {
  const a = S.att, s = sessionOn(a.g, a.date), people = activeMembers(a.g, a.date).sort((x, y) => fullName(x) < fullName(y) ? -1 : 1), marks = {};
  people.forEach(p => { marks[p.uuid] = {status: 'Present', reasons: []}; });
  if (s && s.status === 'Held') recordsOf(s.uuid).forEach(r => { if (marks[r.subjectUUID]) marks[r.subjectUUID] = {status: r.status, reasons: r.reason ? r.reason.split(', ') : []}; });
  a.roster = {people: people.map(p => p.uuid), marks, notes: ''}; go('roster');
}
function rosterScreen() {
  const a = S.att, R = a.roster, at = attendanceTypeFor(subj(a.g)), reasons = answersOfName(at.config.absenceReasonConceptName), allP = R.people.every(id => R.marks[id].status === 'Present');
  let b = `<div class="rhelp"><span>Tap to toggle Present → Absent</span><span class="tl" data-a="ro:all">${allP ? 'Mark all absent' : 'Mark all present'}</span></div>`;
  b += R.people.map((id, i) => { const p = subj(id), m = R.marks[id];
    return `<div class="rrow"><div class="rtop" data-a="ro:toggle" data-v="${id}"><div><b>${esc(fullName(p))}</b><small>#${i + 1}</small></div><span class="chip ${m.status === 'Present' ? 'pr' : 'ab'}">${m.status}</span></div>` +
      (m.status === 'Absent' ? `<div class="rabs"><small>Reason for absence</small><div class="rchips">${reasons.map(r => `<span class="${m.reasons.includes(r) ? 'on' : ''}" data-a="ro:reason" data-v="${id}|${esc(r)}">${esc(r)}</span>`).join('')}</div>${m.reasons.includes('Other') ? '<input class="roth" placeholder="Specify other reason">' : ''}</div>` : '') + `</div>`; }).join('');
  b += `<div class="rfoot"><div class="fu">0 follow-up(s) will be created</div><small>Session notes (optional)</small><textarea rows="3"></textarea><div class="savea" data-a="ro:save">Save attendance</div></div>`;
  return {title: at.name, back: 1, right: ['home'], body: b};
}
function didntScreen() {
  const a = S.att, at = attendanceTypeFor(subj(a.g));
  return {title: `${at.name} — Didn't happen`, back: 1, right: ['home'], body: `<div class="dhv"><p>Class genuinely did not happen, or attendance was not recorded — pick a reason.</p><small>Reason (required)</small>
    <div class="dsel" data-a="dh:pick"><span>${a.dh ? esc(a.dh) : 'Select reason'}</span><span>▾</span></div><small>Notes (optional)</small><textarea rows="4"></textarea>
    <div class="dact"><span data-a="hdr:back">Cancel</span><span class="dsave ${a.dh ? '' : 'dis'}" data-a="dh:save">SAVE</span></div></div>`};
}

/* ================= form engine (Desai's real forms and rules) ================= */
const DATE_LABEL = {reg: 'Date of Registration', enc: 'Visit date', cancel: 'Cancel Date'};
function startForm(o) {
  const form = o.form, kind = o.kind;
  const f = {kind, form, sType: o.sType, subject: clone(o.subject || {uuid: uid('N'), type: o.sType, firstName: '', lastName: '', registrationDate: T, obs: {}}),
    enc: o.enc ? clone(o.enc) : null, obs: clone(o.obs || {}), date: o.date || T, page: o.startPage || 0, tried: -1, edit: !!o.edit, formErrs: [], core: {ageUnit: 'Years'}, addTo: o.addTo};
  if (kind === 'reg') { f.pages = [{core: 1}, ...pagesOf(form)]; f.subject.registrationDate = f.date; if (f.subject.dob) f.core.age = ageYears(f.subject.dob); }
  else f.pages = pagesOf(form);
  F = f; evaluate(F); go('form');
}
const holderOf = (el, gi) => gi === undefined ? F.obs : (F.obs[el._grp] || [])[gi];
function fset(el, gi, v) { const h = gi === undefined ? F.obs : (F.obs[el._grp] = F.obs[el._grp] || [{}])[gi]; if (isEmpty(v)) delete h[cname(el)]; else h[cname(el)] = v; }
function itemsOf(pi) {                     // the visible questions on a page: [{el, gi}]
  const g = F.pages[pi]; if (g.core) return [];
  const out = [];
  topElements(g).forEach(el => {
    if (!stOf(F, el).visibility) return;
    if (cdef(el).dataType === 'QuestionGroup') (F.obs[cname(el)] || [{}]).forEach((_, gi) => childElements(g, el).forEach(ch => { ch._grp = cname(el); if (stOf(F, ch, gi).visibility) out.push({el: ch, gi}); }));
    else out.push({el});
  });
  return out;
}
const pageHas = pi => F.pages[pi].core || pageVisible(F, F.pages[pi]);
const stepPage = dir => { let i = F.page + dir; while (i >= 0 && i < F.pages.length && !pageHas(i)) i += dir; return i; };
const errsOf = (el, gi) => { const h = holderOf(el, gi) || {}; return fieldErrors(F, el, h, stOf(F, el, gi), F.tried === F.page); };

function fieldHTML(el, gi) {
  const st = stOf(F, el, gi); if (!st.visibility) return '';
  const d = cdef(el), h = holderOf(el, gi) || {}, v = h[cname(el)], errs = errsOf(el, gi), ro = kvOf(el, 'editable') === false;
  const A = `data-k="${esc(el.uuid)}" data-g="${gi ?? ''}"`;
  if (d.dataType === 'QuestionGroup') {
    const g = F.pages[F.page], rows = F.obs[cname(el)] = Array.isArray(F.obs[cname(el)]) && F.obs[cname(el)].length ? F.obs[cname(el)] : [{}], rep = kvOf(el, 'repeatable');
    const kids = childElements(g, el); kids.forEach(k => { k._grp = cname(el); });
    const full = rows.every(r => Object.keys(r).length);
    return `<div class="fe" data-f="${esc(el.uuid)}"><div class="fl">${esc(el.name)}</div>${rows.map((_, i) => `${rep ? `<div class="qrm"><span data-a="f:qrem" data-k="${esc(el.uuid)}" data-g="${i}" class="${rows.length <= 1 ? 'dis' : ''}">${ic('minus', 24, rows.length <= 1 ? '#bbb' : '#9e9e9e')}</span></div>` : ''}<div class="qg">${kids.map(k => fieldHTML(k, i)).join('')}</div>`).join('')}` +
      (rep ? `<div class="qadd"><span data-a="f:qadd" data-k="${esc(el.uuid)}" class="${full ? '' : 'dis'}">${ic('plus', 26, full ? '#009688' : '#bbb')}</span></div>` : '') + `</div>`;
  }
  const lab = `<div class="fl">${esc(el.name)}${el.mandatory ? ' <i>*</i>' : ''}${d.unit ? `  (${esc(d.unit)})` : ''} </div>`;
  let b = '';
  if (ro) b = `<div class="rov">${isEmpty(v) ? 'Not Known Yet' : fmtv(el, v)}</div>`;
  else if (d.dataType === 'Coded') { const multi = el.type === 'MultiSelect', sel = multi ? (v || []) : [v];
    const opts = answersOf(el).filter(o => allowed(st, o));
    b = `<div class="rg ${errs.length ? 'bad' : ''}">${opts.map(o => `<div class="ro" data-a="f:opt" ${A} data-v="${esc(o)}">${ic(multi ? (sel.includes(o) ? 'c1' : 'c0') : (sel.includes(o) ? 'r1' : 'r0'), 22, '#009688')}<span>${esc(TR(o))}</span></div>`).join('')}</div>`; }
  else if (d.dataType === 'Date' || d.dataType === 'DateTime') b = v ? `<span class="dv" data-a="f:date" ${A}>${D.dmy(v)} <span data-a="f:datecl" ${A}>${ic('bksp', 21, '#009688')}</span></span>` : `<span class="dv" data-a="f:date" ${A}>Choose a date</span>`;
  else if (d.dataType === 'Image' || d.dataType === 'ImageV2') b = `<div class="imgrow">${v ? `<div class="thumb">📷 photo</div>` : ''}<span data-a="f:img" ${A}>${ic('folder', 36, '#35a99b')}</span><span data-a="f:img" ${A}>${ic('cam', 36, '#35a99b')}</span></div>`;
  else b = `<input class="ti" data-in="f" ${A} value="${esc(v ?? '')}" ${d.dataType === 'Numeric' ? 'inputmode="decimal"' : ''} autocomplete="off">`;
  return `<div class="fe" data-f="${esc(el.uuid)}" data-g="${gi ?? ''}">${lab}${b}${errs.map(e => `<div class="err">${esc(e)}</div>`).join('')}</div>`;
}
const coreErr = k => {
  if (F.tried !== F.page) return [];
  const s = F.subject, empty = k === 'name' ? !s.firstName.trim() : k === 'first' ? !s.firstName.trim() : k === 'last' ? !s.lastName.trim() : k === 'dob' ? !s.dob : k === 'gender' ? !s.gender : !s.village;
  return empty ? ['There is no value specified'] : [];
};
function coreHTML() {
  const s = F.subject, st = STN[s.type], e = k => coreErr(k).map(x => `<div class="err">${x}</div>`).join('');
  const inp = (k, l, prop) => `<div class="fe" data-f="core:${k}"><div class="fl">${l} <i>*</i> </div><input class="ti" data-in="core" data-k="${prop}" value="${esc(s[prop] || '')}" autocomplete="off">${e(k)}</div>`;
  let b = `<div class="fe" style="margin-top:18px"><div class="fl">Date of Registration</div><span class="dv" data-a="f:vdate">${D.dmy(F.date)} ${ic('bksp', 21, '#009688')}</span></div>`;
  if (st.type === 'Person') b += inp('first', 'First Name', 'firstName') + inp('last', 'Last Name', 'lastName') +
    `<div class="fe" data-f="core:dob"><div class="fl">Date of Birth <i>*</i> </div><span class="dv" data-a="f:dob">${s.dob ? D.dmy(s.dob) : 'Choose a date'}</span><div class="fl" style="margin-top:8px">Age</div><div class="agerow"><input class="ti" data-in="core" data-k="age" inputmode="numeric" value="${esc(F.core.age ?? '')}">` +
    ['Years', 'Months'].map(u => `<span class="ro" data-a="f:ageu" data-v="${u}">${ic(F.core.ageUnit === u ? 'r1' : 'r0', 22, '#009688')}<span>${u}</span></span>`).join('') + `</div>${e('dob')}</div>` +
    `<div class="fe" data-f="core:gender"><div class="fl">Gender <i>*</i> </div><div class="rg ${e('gender') ? 'bad' : ''}">${['Female', 'Male', 'Other'].map(g => `<div class="ro" data-a="f:gender" data-v="${g}">${ic(s.gender === g ? 'r1' : 'r0', 22, '#009688')}<span>${g}</span></div>`).join('')}</div>${e('gender')}</div>`;
  else b += `<div class="fe" data-f="core:name"><div class="fl">${esc(s.type)} Name <i>*</i> </div>${st.nameHelpText ? `<div class="fh">${esc(st.nameHelpText)}</div><div class="rm">Read more...</div>` : ''}<input class="ti" data-in="core" data-k="firstName" value="${esc(s.firstName || '')}" autocomplete="off">${e('name')}</div>`;
  b += `<div class="fe" data-f="core:village"><div class="fl">Address <i>*</i> </div><div class="rgh" style="padding:6px 0 4px 2px">Village</div><div class="rg ${e('village') ? 'bad' : ''}">${VILLAGES.map(v => `<div class="ro" data-a="f:village" data-v="${v.uuid}">${ic(s.village === v.uuid ? 'r1' : 'r0', 22, '#009688')}<span>${esc(v.name)}</span></div>`).join('')}</div>${e('village')}</div>`;
  return b;
}
function formTitle() {
  const s = F.subject;
  return F.kind === 'reg' ? `${F.sType} Registration` : F.kind === 'cancel' ? `${F.enc.type} Cancellation` : `${fullName(subj(F.enc.subjectUuid))} - ${F.enc.type}`;
}
function formScreen() {
  evaluate(F);
  const g = F.pages[F.page], first = stepPage(-1) < 0;
  let b = '';
  if (g.core) b += coreHTML();
  else {
    if (first && F.kind !== 'reg') b += `<div class="fe" style="margin-top:18px"><div class="fl">${DATE_LABEL[F.kind]}</div><span class="dv" data-a="f:vdate">${D.dmy(F.date)} ${ic('bksp', 21, '#009688')}</span></div>`;
    b += `<div class="fgt">${esc(g.display || g.name)}</div>` + topElements(g).map(el => fieldHTML(el)).join('');
  }
  if (F.formErrs.length) b += F.formErrs.map(e => `<div class="fmsg">${esc(e)}</div>`).join('');
  b += `<div class="fbt">${first ? '' : `<div class="fb pv" data-a="f:prev">${ic('prev', 17)} PREVIOUS</div>`}<div class="fb nx" data-a="f:next">NEXT ${ic('next', 17)}</div></div>`;
  return {title: formTitle(), back: 1, right: ['home'], body: `<div class="fm">${b}</div>`};
}
function summaryScreen() {
  const s = F.kind === 'reg' ? F.subject : subj(F.enc.subjectUuid), person = isPerson(s);
  const line = person ? `${s.gender}, ${ageText(s)}, ${villageName(s)}` : villageName(s);
  const title = F.kind === 'reg' ? `${F.sType} Registration - Summary & Recommendations` : `${F.enc.type} - Summary & Recommendations`;
  return {title, back: 1, right: ['home'], body: `<div class="sm"><div class="sh"><b>${esc(fullName(s))}</b><span>${esc(line)}</span></div>` +
    `<div class="stb"><span>Scroll to Bottom to Save</span></div><h5 style="margin-top:22px">Observations</h5>${obsTable(F.form, F.obs)}<div class="fbt"><div class="fb pv" data-a="f:prev">${ic('prev', 17)} PREVIOUS</div><div class="fb nx" data-a="f:save">SAVE ${ic('next', 17)}</div></div></div>`};
}
function cleanObs(obs) { const o = {}; Object.entries(obs).forEach(([k, v]) => { if (Array.isArray(v) && v.length && typeof v[0] === 'object') { const r = v.filter(x => Object.keys(x).length); if (r.length) o[k] = r; } else if (!isEmpty(v)) o[k] = v; }); return o; }
function commit() {
  const obs = cleanObs(F.obs); let s, msg;
  if (F.kind === 'reg') {
    const raw = Object.assign({}, F.subject, {obs, registrationDate: F.date});
    if (F.edit) { s = subj(raw.uuid); Object.assign(s, raw); }
    else { s = Object.assign(raw, {by: USER.name}); DB.subjects.push(s); if (F.addTo) DB.groupSubjects.push({uuid: uid('M'), groupUuid: F.addTo, memberUuid: s.uuid, start: T, end: null}); }
    msg = 'Registration Saved';
  } else {
    let e = DB.encounters.find(x => x.uuid === F.enc.uuid);
    if (!e) { e = Object.assign({}, F.enc); DB.encounters.push(e); }
    if (F.kind === 'cancel') { e.cancelDateTime = F.date; e.cancelObs = obs; msg = 'Visit cancelled'; }
    else { e.encounterDateTime = F.date; e.obs = obs; e.by = e.by || USER.name; msg = `${e.type} Encounter Saved`; }
    s = subj(e.subjectUuid);
  }
  touch();
  const visits = scheduleFor(Object.assign({}, F, {obs, enc: F.enc && Object.assign({}, F.enc, F.kind === 'cancel' ? {cancelDateTime: F.date} : {encounterDateTime: F.date}), subject: s}));
  applySchedule(s.uuid, visits); touch();
  S.last = {form: F.form.name, kind: F.kind, subject: s.uuid, planned: visits.map(v => v.name || v.encounterType)};
  F = null;
  let i = S.stack.map(x => x.n === 'subject' && x.id === s.uuid).lastIndexOf(true);
  if (i < 0) { S.stack = S.stack.filter(x => !['form', 'summary', 'addMember', 'results'].includes(x.n)); go('subject', {id: s.uuid}); } else S.stack.length = i + 1;
  toast(msg);
}

/* ================= modals ================= */
function modalHTML() {
  const m = S.modal; if (!m) return '';
  if (m.t === 'dlg') return `<div class="ov"><div class="dlg"><h6>${esc(m.title)}</h6><p>${esc(m.msg)}</p><div class="da">${m.btns.map((b, i) => `<span data-a="dlg" data-v="${i}">${b}</span>`).join('')}</div></div></div>`;
  if (m.t === 'types') return `<div class="ov"><div class="types"><span class="x" data-a="modal:x">${ic('close', 28, '#333')}</span><h6>${m.title}</h6>${m.items.map(x => `<div class="tb" data-a="${m.act}" data-v="${esc(x)}">${esc(x)}</div>`).join('') || '<div style="padding:0 8px 14px;color:#777">Nothing available</div>'}</div></div>`;
  if (m.t === 'pick') return `<div class="ov"><div class="dlg"><h6>${esc(m.title)}</h6>${m.items.map(x => `<div class="ro" data-a="${m.act}" data-v="${esc(x)}">${ic(m.sel === x ? 'r1' : 'r0', 22, '#009688')}<span>${esc(x)}</span></div>`).join('')}<div class="da"><span data-a="modal:x">CANCEL</span></div></div></div>`;
  if (m.t === 'sync') return `<div class="ov"><div class="syncd">${m.done ? `Sync Complete ${ic('okc', 22, '#fff').replace('<svg', '<svg style="vertical-align:-4px"')}<div class="ok" data-a="sync:ok">OK</div>` : `Syncing Data<div style="font-size:13px;color:#bbb;margin-top:8px">${m.step}</div><div class="bar"><i style="width:${m.pc}%"></i></div>`}</div></div>`;
  if (m.t === 'menu') return `<div class="ov" style="background:transparent" data-a="modal:x"><div class="menu" style="right:26px;top:${m.y}px"><div style="color:#148be4" data-a="noop" data-v="Edit member">Edit</div><div style="color:#d0011b" data-a="mem:remove" data-v="${m.id}">Remove</div></div></div>`;
  if (m.t === 'dp') { const d = D.p(m.month), y = d.getFullYear(), mo = d.getMonth(), n = new Date(y, mo + 1, 0).getDate(), lead = new Date(y, mo, 1).getDay(), sd = D.p(m.value);
    return `<div class="ov"><div class="dp"><div class="dph"><small>${sd.getFullYear()}</small><b>${D.W[sd.getDay()]}, ${D.M[sd.getMonth()]} ${sd.getDate()}</b></div><div class="dpm"><span data-a="dp:mon" data-v="-1">‹</span><b>${D.M[mo]} ${y}</b><span data-a="dp:mon" data-v="1">›</span></div>
      <div class="dpg">${'SMTWTFS'.split('').map(c => `<i>${c}</i>`).join('')}${'<b></b>'.repeat(lead)}${[...Array(n)].map((_, i) => { const iso = D.iso(new Date(y, mo, i + 1, 12)); return `<span class="${iso === m.value ? 'sel' : ''} ${iso === T ? 'tod' : ''}" data-a="dp:day" data-v="${iso}">${i + 1}</span>`; }).join('')}</div>
      <div class="da"><span data-a="modal:x">CANCEL</span><span data-a="dp:ok">OK</span></div></div></div>`; }
  return '';
}
const openDP = (value, done) => { S.modal = {t: 'dp', value: value || T, month: D.som(value || T), done}; };
const confirmDlg = (title, msg, yes) => { S.modal = {t: 'dlg', title, msg, btns: ['YES', 'NO'], on: i => { if (i === 0) yes(); }}; };
const alertDlg = (title, msg) => { S.modal = {t: 'dlg', title, msg, btns: ['OK'], on: () => {}}; };
function runSync() {
  const steps = ['Uploading saved data', 'Downloading forms', 'Downloading new data from server'];
  S.modal = {t: 'sync', step: steps[0], pc: 8};
  [1, 2, 3].forEach(i => later(() => { if (!S.modal || S.modal.t !== 'sync') return; if (i < 3) { S.modal.step = steps[i]; S.modal.pc = i * 40; } else S.modal.done = true; renderPhone(true); }, i * 650));
}

/* ================= actions ================= */
const curSubject = () => subj((S.stack.slice().reverse().find(x => x.n === 'subject') || {}).id);
const elBy = uuid => { for (const g of F.pages) if (!g.core) { const e = g.formElements.find(x => x.uuid === uuid); if (e) return e; } return null; };
const FKEY = el => { const e = elBy(el.dataset.k); return {el: e, gi: el.dataset.g === '' || el.dataset.g === undefined ? undefined : +el.dataset.g}; };
const leaveForm = toHome => { const dirty = F && (Object.keys(F.obs).length || (F.kind === 'reg' && F.subject.firstName)); const doIt = () => { if (toHome) goHome(); else { F = null; S.stack = S.stack.filter(x => x.n !== 'form' && x.n !== 'summary'); } };
  if (!dirty) return doIt();
  confirmDlg(toHome ? 'Go to home screen' : 'Go back', toHome ? 'Are you sure you want to go back to home screen? You will lose all the form changes.' : 'Are you sure you want to go back? You will lose all the form changes.', doIt); };
function saveSession(status, reason, R) {
  const a = S.att; let s = sessionOn(a.g, a.date);
  if (!s) { s = {uuid: uid('S'), groupSubjectUUID: a.g, scheduledDate: a.date}; DB.sessions.push(s); }
  s.status = status; s.reason = reason;
  DB.records = DB.records.filter(r => r.sessionUUID !== s.uuid);
  if (R) R.people.forEach(id => { const m = R.marks[id]; DB.records.push({uuid: uid('A'), sessionUUID: s.uuid, subjectUUID: id, status: m.status, reason: m.status === 'Absent' ? m.reasons.join(', ') || null : null}); });
  touch(); S.last = {att: a.g, date: a.date, status};
}
const ACT = {
  noop: v => toast(`${v} is not part of this practice app`),
  'login:go': () => { if (!S.login.u || !S.login.p) return toast('Enter User ID and Password'); goHome(); runSync(); },
  tab: v => { F = null; S.att = null; S.stack = [{n: v}]; },
  'hdr:back': () => { const t = topScr().n; if (t === 'form') { const p = stepPage(-1); if (p >= 0) { F.page = p; F.tried = -1; } else leaveForm(false); } else { if (t === 'attendance') S.att = null; goBack(); } },
  'hdr:home': () => { if (['form', 'summary'].includes(topScr().n)) leaveForm(true); else goHome(); },
  'hdr:search': () => go('search'),
  'hdr:sync': () => runSync(),
  'sync:ok': () => { S.modal = null; },
  card: v => { const r = cardOf(CARDU[v]); if (r.ids.length === 1 && hasRule(CARDU[v].query)) go('subject', {id: r.ids[0]}); else go('cards', {id: v}); },
  open: v => go('subject', {id: v}),
  stab: v => { topScr().tab = v; },
  exp: v => { S.exp[v] = !(S.exp[v] ?? (v.startsWith('mem'))); },
  'd:filter': () => { S.filter.tmp = [...S.filter.picked]; go('filter'); },
  'd:clear': () => { S.filter.picked = []; },
  'fl:pick': v => { const t = S.filter.tmp, i = t.indexOf(v); if (i < 0) t.push(v); else { const drop = under(v); S.filter.tmp = t.filter(x => !drop.includes(x)); } },
  'fl:apply': () => { S.filter.picked = S.filter.tmp; goBack(); },
  'dash:tab': v => { topScr().name = v; },
  newform: () => { S.modal = {t: 'types', title: 'Types', items: eligibleVisits(curSubject()), act: 'type'}; },
  type: v => { S.modal = null; const s = curSubject(), open = encOf(s).find(e => e.type === v && isOpen(e));
    startForm({form: formFor('Encounter', s.type, v), kind: 'enc', enc: open || {uuid: uid('E'), subjectUuid: s.uuid, type: v, name: v, obs: {}}}); },
  'visit:do': v => { const e = DB.encounters.find(x => x.uuid === v); startForm({form: formFor('Encounter', subj(e.subjectUuid).type, e.type), kind: 'enc', enc: e}); },
  'visit:edit': v => { const e = DB.encounters.find(x => x.uuid === v); startForm({form: formFor('Encounter', subj(e.subjectUuid).type, e.type), kind: 'enc', enc: e, obs: e.obs, date: e.encounterDateTime, edit: 1}); },
  'visit:cancel': v => { const e = DB.encounters.find(x => x.uuid === v); startForm({form: formFor('IndividualEncounterCancellation', subj(e.subjectUuid).type, e.type), kind: 'cancel', enc: e}); },
  'reg:edit': v => { const s = curSubject(), form = formFor('IndividualProfile', s.type), lock = editAllowed(form, s);
    if (!lock.ok) return toast(lock.msg || 'This record cannot be edited');
    startForm({form, kind: 'reg', sType: s.type, subject: s, obs: s.obs, date: s.registrationDate, edit: 1, startPage: +v + 1}); },
  'reg:void': () => { const s = curSubject(); confirmDlg('Void this individual?', 'This individual will be voided', () => { s.voided = true; touch(); goBack(); toast('Voided'); }); },
  rtype: v => { const add = topScr().n === 'addMember' ? topScr().id : null; startForm({form: formFor('IndividualProfile', v), kind: 'reg', sType: v, addTo: add}); },
  'am:open': () => go('addMember', {id: topScr().id}),
  'am:role': () => { const t = topScr(); t.role = t.role ? null : 'Member'; },
  'am:date': () => { const t = topScr(); openDP(t.start || T, d => { t.start = d; t.err = null; }); },
  'am:search': () => { S.search = {type: 'Beneficiary', text: '', voided: false}; go('results', {pick: topScr().id, type: 'Beneficiary'}); },
  'am:pick': v => { goBack(); const t = topScr(), g = subj(t.id), p = subj(v); t.member = v;
    t.err = membersOf(g).some(m => m.memberUuid === v) ? 'Member is already present in the group' : memberCheck(g, p); },
  'am:save': () => { const t = topScr(), g = subj(t.id), p = subj(t.member);
    if (t.err) return alertDlg('Validation Error', t.err);
    DB.groupSubjects.push({uuid: uid('M'), groupUuid: g.uuid, memberUuid: p.uuid, start: t.start || T, end: null}); touch(); S.last = {member: p.uuid, group: g.uuid}; goBack(); toast('New member added'); },
  'mem:menu': (v, el) => { const r = el.getBoundingClientRect(), pr = $('#phone').getBoundingClientRect(), k = pr.width / 384; S.modal = {t: 'menu', id: v, y: Math.round((r.top - pr.top) / k)}; },
  'mem:remove': v => { S.modal = null; confirmDlg('Remove member', 'Remove member from this group', () => { const m = DB.groupSubjects.find(x => x.uuid === v); m.voided = true; touch(); toast('Member removed'); }); },
  'att:open': () => { S.att = {g: curSubject().uuid, date: T}; go('attendance'); },
  'att:day': v => { S.att.date = v; S.att.ack = false; S.att.exp = false; },
  'att:date': () => openDP(S.att.date, d => { if (d <= T) { S.att.date = d; S.att.ack = false; } }),
  'att:anyway': () => { S.modal = {t: 'dlg', title: 'Non-working day', msg: `${longDay(S.att.date)} is normally a non-working day. Continue?`, btns: ['Cancel', 'Continue'], on: i => { if (i === 1) S.att.ack = true; }}; },
  'att:mark': () => openRoster(), 'att:edit': () => { const s = sessionOn(S.att.g, S.att.date); if (s.status === 'Held') openRoster(); else { S.att.dh = s.reason; go('didnt'); } },
  'att:didnt': () => { S.att.dh = null; go('didnt'); }, 'att:exp': () => { S.att.exp = !S.att.exp; },
  'att:void': () => { const at = attendanceTypeFor(subj(S.att.g)); S.modal = {t: 'dlg', title: 'Void this session?', msg: `Voiding ${at.name} will remove all attendance records and any unfilled follow-up visits for this session. This cannot be undone.`, btns: ['Cancel', 'VOID'], on: i => { if (i !== 1) return;
    const s = sessionOn(S.att.g, S.att.date); s.voided = true; DB.records.filter(r => r.sessionUUID === s.uuid).forEach(r => { r.voided = true; }); touch(); }}; },
  'ro:toggle': v => { const m = S.att.roster.marks[v]; if (m.status === 'Present') m.status = 'Absent'; else { m.status = 'Present'; m.reasons = []; } },
  'ro:all': () => { const R = S.att.roster, allP = R.people.every(id => R.marks[id].status === 'Present'); R.people.forEach(id => { const m = R.marks[id]; m.status = allP ? 'Absent' : 'Present'; if (!allP) m.reasons = []; }); },
  'ro:reason': v => { const [id, r] = v.split('|'), m = S.att.roster.marks[id], i = m.reasons.indexOf(r); if (i < 0) m.reasons.push(r); else m.reasons.splice(i, 1); },
  'ro:save': () => { const R = S.att.roster; if (!R.people.length) return alertDlg('Validation Error', 'There are no active members in this group to mark attendance for.');
    saveSession('Held', null, R); S.att.roster = null; goBack(); },
  'dh:pick': () => { S.modal = {t: 'types', title: 'Reason (required)', items: answersOfName(attendanceTypeFor(subj(S.att.g)).config.sessionOutcomeReasonConceptName), act: 'dh:set'}; },
  'dh:set': v => { S.att.dh = v; S.modal = null; },
  'dh:save': () => { if (!S.att.dh) return; saveSession('DidntHappen', S.att.dh); goBack(); },
  'modal:x': () => { S.modal = null; },
  dlg: v => { const m = S.modal; S.modal = null; m.on(+v); },
  more: v => { if (v === 'Logout') confirmDlg('Logout', 'Are you sure you want to logout?', () => { S.stack = [{n: 'login'}]; S.login = {u: '', p: ''}; }); else if (v === 'Dashboards') go('dashlist'); else toast(`${v} is not part of this practice app`); },
  's:type': v => { S.search.type = v; }, 's:void': () => { S.search.voided = !S.search.voided; }, 's:submit': () => go('results'),
  'dp:day': v => { S.modal.value = v; }, 'dp:mon': v => { S.modal.month = D.som(D.addM(S.modal.month, +v)); }, 'dp:ok': () => { const m = S.modal; S.modal = null; m.done(m.value); },
  /* form */
  'f:vdate': () => openDP(F.date, v => { F.date = v; if (F.kind === 'reg') F.subject.registrationDate = v; }),
  'f:dob': () => openDP(F.subject.dob || D.addM(T, -12 * 25), v => { F.subject.dob = v; const m = D.months(v, T); F.core.ageUnit = m >= 12 ? 'Years' : 'Months'; F.core.age = m >= 12 ? Math.floor(m / 12) : Math.max(m, 0); }),
  'f:ageu': v => { F.core.ageUnit = v; setDobFromAge(); },
  'f:gender': v => { F.subject.gender = v; }, 'f:village': v => { F.subject.village = v; },
  'f:opt': (v, el) => { const {el: e, gi} = FKEY(el), h = holderOf(e, gi) || {}, cur = h[cname(e)];
    if (e.type === 'MultiSelect') { const a = [...(cur || [])], i = a.indexOf(v); if (i < 0) a.push(v); else a.splice(i, 1); fset(e, gi, a); }
    else fset(e, gi, cur === v ? undefined : v); },
  'f:date': (v, el) => { const {el: e, gi} = FKEY(el); openDP((holderOf(e, gi) || {})[cname(e)], d => fset(e, gi, d)); },
  'f:datecl': (v, el) => { const {el: e, gi} = FKEY(el); fset(e, gi, undefined); },
  'f:img': (v, el) => { const {el: e, gi} = FKEY(el); fset(e, gi, 'practice-photo.jpg'); toast('Photo added'); },
  'f:qadd': (v, el) => { const e = elBy(el.dataset.k), rows = F.obs[cname(e)]; if (rows.every(r => Object.keys(r).length)) rows.push({}); },
  'f:qrem': (v, el) => { const e = elBy(el.dataset.k), rows = F.obs[cname(e)]; if (rows.length > 1) rows.splice(+el.dataset.g, 1); },
  'f:prev': () => { if (topScr().n === 'summary') { goBack(); return; } F.page = stepPage(-1); F.tried = -1; F.formErrs = []; },
  'f:next': () => {
    F.tried = F.page; F.formErrs = []; evaluate(F);
    const g = F.pages[F.page];
    const bad = g.core ? (isPerson(F.subject) ? ['first', 'last', 'dob', 'gender', 'village'] : ['name', 'village']).some(k => coreErr(k).length) : itemsOf(F.page).some(it => errsOf(it.el, it.gi).length);
    if (bad) return;
    const n = stepPage(1);
    if (n < F.pages.length) { F.page = n; F.tried = -1; return 'nav'; }
    if (F.kind === 'reg') { const nm = decisionFor(F); if (nm) F.subject.firstName = nm; }
    F.tried = -1; go('summary');
  },
  'f:save': () => commit()
};
const answersOfName = n => (CON[n].answers || []).filter(a => !a.voided).sort((a, b) => (a.order || 0) - (b.order || 0)).map(a => a.name);
function setDobFromAge() { const n = parseInt(F.core.age, 10); if (!Number.isNaN(n) && n >= 0) F.subject.dob = F.core.ageUnit === 'Years' ? D.addM(T, -12 * n) : D.addM(T, -n); }

/* ================= render + events ================= */
let lastSig = '';
const sig = () => S.stack.length + '|' + topScr().n + '|' + (topScr().id || '') + '|' + (F ? F.page : '') + '|' + (S.att ? S.att.date : '');
function bottomTabs() { const d = dashboardsFor(); return [['home', 'home', 'Home'], ...(d.secondary ? [['dash2', 'dash', d.secondary.name]] : []), ['register', 'addbox', 'Register'], ['more', 'menu', 'More']]; }
function renderPhone(keep) {
  const t = topScr(), v = SCREENS[t.n](t), ph = $('#phone'), sc = $('#scr'), st = sc ? sc.scrollTop : 0, s2 = sig();
  const ae = document.activeElement, foc = ae && ae.dataset && ae.dataset.in ? {i: ae.dataset.in, k: ae.dataset.k || '', g: ae.dataset.g || '', a: ae.selectionStart, b: ae.selectionEnd} : null;
  const now = new Date();
  ph.innerHTML = `<div class="sb"><span>${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}</span><span class="sbi">▾ ◢ <span class="bat">80</span></span></div>` +
    (v.noHdr ? '' : `<div class="hd">${v.back ? `<div class="hb" data-a="hdr:back">${ic('back', 34, '#fff')}</div>` : ''}<div class="ttl">${esc(v.title)}</div>${(v.right || []).map(r => `<div class="hb hi" data-a="hdr:${r}">${ic(r, 31, '#fff')}</div>`).join('')}</div>`) +
    `<div class="scr ${v.cls || ''}" id="scr">${v.body}</div>` + (v.foot || '') +
    (v.tabs ? `<div class="tabs">${bottomTabs().map(([k, i, n]) => `<div class="tab ${v.tabs === k ? 'on' : ''}" data-a="tab" data-v="${k}">${ic(i, 31)}<span>${esc(n)}</span></div>`).join('')}</div>` : '') +
    `<div class="nav"><i class="n1"></i><i class="n2"></i><i class="n3"></i></div>` + modalHTML() + (S.toast ? `<div class="toast" data-t="${S.toast.id}">${esc(S.toast.m)}</div>` : '') + `<div id="hint"></div>`;
  if (window.__appWords) AppLang.collect(ph, window.__appWords);
  AppLang.apply(ph);                                  // the phone speaks the language picked in the guide
  if (keep !== false && s2 === lastSig) $('#scr').scrollTop = st;
  const strip = $('#dstrip'); if (strip) { const on = strip.querySelector('.dd.on'); strip.scrollLeft = on ? on.offsetLeft - strip.clientWidth + on.offsetWidth + 12 : strip.scrollWidth; }   // the phone opens the strip at today
  lastSig = s2;
  if (foc) { const el = $$('#phone [data-in]').find(e => e.dataset.in === foc.i && (e.dataset.k || '') === foc.k && (e.dataset.g || '') === foc.g); if (el) { el.focus({preventScroll: true}); try { el.setSelectionRange(foc.a, foc.b); } catch (e) {} } }
  if (S.toast) { const id = S.toast.id; later(() => { if (S.toast && S.toast.id === id) { S.toast = null; const el = $('.toast'); if (el) el.remove(); } }, 2600); }
  if (typeof Track !== 'undefined') Track.screen(t.n);
  if (typeof Guide !== 'undefined') Guide.sync();
}
function doAction(el) {
  const a = el.dataset.a; if (!ACT[a]) return;
  ACT[a](el.dataset.v, el);
  renderPhone();
  if (typeof Guide !== 'undefined') Guide.after(a, el.dataset.v);
}
function bindPhone() {
  const ph = $('#phone');
  ph.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el || !ph.contains(el)) return;
    if (!Guide.allow(el)) { Guide.nudge(); return; }
    doAction(el);
  });
  ph.addEventListener('focusin', e => { if (e.target.dataset && e.target.dataset.in && !Guide.allow(e.target)) { e.target.blur(); Guide.nudge(); } });
  ph.addEventListener('input', e => {
    const el = e.target, k = el.dataset.in; if (!k) return;
    if (k === 'f') { const {el: fe, gi} = FKEY(el); fset(fe, gi, el.value); }
    else if (k === 'core') { if (el.dataset.k === 'age') { F.core.age = el.value; setDobFromAge(); } else F.subject[el.dataset.k] = el.value; }
    else if (k === 'stext') S.search.text = el.value;
    else if (k === 'login') S.login[el.dataset.k] = el.value;
    Guide.typed();
    if (k !== 'stext' && k !== 'login') renderPhone(); else Guide.sync();
  });
  ph.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.in) { e.target.blur(); Guide.typed(true); } });
}
