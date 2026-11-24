'use strict';
/* Engine: Desai's live bundle (v16) run on Avni's own model classes (openchs-models, bundled as AvniRT), the way the phone runs it.
   Every rule, message, calculation and card count on the practice phone comes from here. */
const {models, moment, lodash: _} = window.AvniRT;
const {Individual, Encounter, EncounterType, Observation, Concept, ConceptAnswer, PrimitiveValue, SingleCodedValue, MultipleCodedValues,
  SubjectType, Gender, AddressLevel, FormElementStatus, QuestionGroup, RepeatableQuestionGroup} = models;
const BUNDLE = DESAI.bundle;
class VisitScheduleBuilder { constructor(context) { this.context = context; this.visits = []; } add(v) { this.visits.push(v); return this; } getAll() { return this.visits; } }
const imports = {rulesConfig: {FormElementStatus, VisitScheduleBuilder}, moment, lodash: _};

const CON = _.keyBy(BUNDLE.concepts, 'name');
const ANS = {}; BUNDLE.concepts.forEach(c => (c.answers || []).forEach(a => { ANS[a.uuid] = a.name; }));
const STN = _.keyBy(BUNDLE.subjectTypes, 'name'), STU = _.keyBy(BUNDLE.subjectTypes, 'uuid');
const ETN = _.keyBy(BUNDLE.encounterTypes, 'name'), ETU = _.keyBy(BUNDLE.encounterTypes, 'uuid');
const FORMN = _.keyBy(BUNDLE.forms, 'name'), FORMU = _.keyBy(BUNDLE.forms, 'uuid');
const LOCS = _.keyBy(DESAI.locations, 'uuid');
const VILLAGES = DESAI.locations.filter(l => l.type === 'Village').sort((a, b) => a.name < b.name ? -1 : 1);
const villageBy = n => VILLAGES.find(v => v.name === n);
const pathOf = uuid => { const out = []; let x = LOCS[uuid]; while (x) { out.unshift(x.name); x = LOCS[x.parent]; } return out; };
const byOrder = (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0);
const notVoided = x => x && !x.voided;
const TR = k => (BUNDLE.translations || {})[k] || k;          // the org's English labels (en.json in the bundle)

/* ---------- models ---------- */
const conceptCache = {};
function mconcept(def) {
  if (conceptCache[def.uuid]) return conceptCache[def.uuid];
  const c = Concept.create(def.name, def.dataType, [], def.uuid);
  if (def.answers) c.answers = def.answers.filter(a => !a.voided).map((a, i) => { const ca = new ConceptAnswer(); ca.uuid = a.uuid; ca.answerOrder = i; ca.unique = !!a.unique; ca.concept = Concept.create(a.name, 'NA', [], a.uuid); return ca; });
  ['lowAbsolute', 'highAbsolute', 'lowNormal', 'highNormal', 'unit'].forEach(k => { if (def[k] !== undefined && def[k] !== null) c[k] = def[k]; });
  return (conceptCache[def.uuid] = c);
}
const answerUuid = (def, name) => { const a = (def.answers || []).find(x => x.name === name); return a ? a.uuid : name; };
function obsOf(name, v) {
  const d = CON[name]; if (!d || isEmpty(v)) return null;
  let w;
  if (d.dataType === 'Coded') w = Array.isArray(v) ? new MultipleCodedValues(v.map(n => answerUuid(d, n))) : new SingleCodedValue(answerUuid(d, v));
  else if (d.dataType === 'QuestionGroup') { const rows = (Array.isArray(v) ? v : [v]).map(r => new QuestionGroup(Object.entries(r).map(([k, x]) => obsOf(k, x)).filter(Boolean))); w = Array.isArray(v) ? new RepeatableQuestionGroup(rows) : rows[0]; }
  else if (d.dataType === 'Date' || d.dataType === 'DateTime') w = new PrimitiveValue(moment(v).toDate(), d.dataType);
  else if (d.dataType === 'Numeric') w = new PrimitiveValue(Number(v), 'Numeric');
  else w = new PrimitiveValue(v, d.dataType);
  return Observation.create(mconcept(d), w);
}
const obsList = obs => Object.entries(obs || {}).map(([k, v]) => obsOf(k, v)).filter(Boolean);
const stCache = {}, etCache = {}, alCache = {};
function mst(name) { if (stCache[name]) return stCache[name]; const d = STN[name]; const s = new SubjectType(); s.uuid = d.uuid; s.name = d.name; s.type = d.type; s.group = !!d.group; s.household = false; return (stCache[name] = s); }
function met(name) { if (etCache[name]) return etCache[name]; const d = ETN[name] || {name, uuid: name}; const t = new EncounterType(); t.uuid = d.uuid; t.name = d.name; return (etCache[name] = t); }
function mal(uuid) { if (!uuid) return undefined; if (alCache[uuid]) return alCache[uuid]; const l = LOCS[uuid]; const a = new AddressLevel(); a.uuid = uuid; a.name = l ? l.name : uuid; a.type = l ? l.type : 'Village'; a.level = l ? l.level : 1; return (alCache[uuid] = a); }
function mkIndividual(s) {
  const i = Individual.createEmptyInstance();
  i.uuid = s.uuid; i.subjectType = mst(s.type); i.firstName = s.firstName || ''; i.lastName = s.lastName || '';
  if (s.dob) i.dateOfBirth = moment(s.dob).toDate();
  if (s.gender) { const g = new Gender(); g.name = s.gender; g.uuid = 'gender-' + s.gender; i.gender = g; }
  i.registrationDate = moment(s.registrationDate || T).toDate();
  if (s.village) i.lowestAddressLevel = mal(s.village);
  i.observations = obsList(s.obs); i.voided = !!s.voided;
  return i;
}
function mkEncounter(e, ind) {
  const m = Encounter.createEmptyInstance();
  m.uuid = e.uuid; m.encounterType = met(e.type); m.name = e.name || e.type;
  m.encounterDateTime = e.encounterDateTime ? moment(e.encounterDateTime).hour(10).toDate() : null;
  m.earliestVisitDateTime = e.earliestVisitDateTime ? moment(e.earliestVisitDateTime).toDate() : null;
  m.maxVisitDateTime = e.maxVisitDateTime ? moment(e.maxVisitDateTime).toDate() : null;
  m.cancelDateTime = e.cancelDateTime ? moment(e.cancelDateTime).toDate() : null;
  m.observations = obsList(e.obs); m.cancelObservations = obsList(e.cancelObs); m.voided = !!e.voided; m.individual = ind;
  return m;
}
// The phone's database as Avni model objects, rebuilt after every change.
let W = null, WV = -1, VER = 0;
const touch = () => { VER++; };
function world() {
  if (W && WV === VER) return W;
  const ind = {}, enc = {}, byS = {};
  DB.subjects.forEach(s => { ind[s.uuid] = mkIndividual(s); });
  DB.encounters.forEach(e => { const i = ind[e.subjectUuid]; if (!i) return; const m = mkEncounter(e, i); enc[e.uuid] = m; (byS[e.subjectUuid] = byS[e.subjectUuid] || []).push(m); });
  Object.values(ind).forEach(i => { i.encounters = byS[i.uuid] || []; });
  const gsOf = {}; DB.groupSubjects.forEach(g => { if (!ind[g.groupUuid] || !ind[g.memberUuid]) return;
    (gsOf[g.groupUuid] = gsOf[g.groupUuid] || []).push({uuid: g.uuid, voided: !!g.voided, membershipStartDate: g.start ? moment(g.start).toDate() : null, membershipEndDate: g.end ? moment(g.end).toDate() : null,
      memberSubject: ind[g.memberUuid], groupSubject: ind[g.groupUuid], groupRole: {role: 'Member'}}); });
  Object.values(ind).forEach(i => Object.defineProperty(i, 'groupSubjects', {value: gsOf[i.uuid] || [], configurable: true}));
  const rows = {Individual: Object.values(ind), Encounter: Object.values(enc),
    Session: DB.sessions.filter(notVoided).map(s => Object.assign({voided: false}, s)), AttendanceRecord: DB.records.filter(notVoided).map(r => Object.assign({voided: false}, r)), SyncTelemetry: []};
  W = {ind, enc, rows, db: realmLike(rows)}; WV = VER; return W;
}
// A small emulator of the phone database's query language (from the Desai rule test kit).
function realmLike(rows) {
  const test = (item, clause, args) => {
    const c = clause.trim();
    if (c.startsWith('(') && c.endsWith(')')) return c.slice(1, -1).split(/\s+OR\s+/i).some(part => test(item, part, args));
    const m = c.match(/^\+?([\w.]+)\s*(==|=|!=|>=|<=|<|>)\s*(.+)$/); if (!m) return true;
    const actual = m[1].split('.').reduce((o, k) => (o === null || o === undefined) ? o : o[k], item);
    const raw = m[3].trim(); const want = /^\$\d+$/.test(raw) ? args[Number(raw.slice(1))] : raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw.replace(/^'(.*)'$/, '$1');
    const v = x => x instanceof Date ? x.getTime() : x; const a = v(actual), w = v(want);
    if (m[2] === '=' || m[2] === '==') return w === null ? (a === null || a === undefined) : a === w;
    if (m[2] === '!=') return w === null ? !(a === null || a === undefined) : a !== w;
    if (a === null || a === undefined) return false;
    return m[2] === '>=' ? a >= w : m[2] === '<=' ? a <= w : m[2] === '<' ? a < w : a > w;
  };
  return {isSqlite: false, objects: schema => ({filtered: (query, ...args) => (rows[schema] || []).filter(item => query.split(/\s+AND\s+(?![^(]*\))/i).every(clause => test(item, clause, args)))})};
}
// shortcut: getSubjects ignores the Realm filter text and returns the whole type; the rules that use it filter again in JS
const services = () => ({individualService: {getSubjectsInLocation: (al, typeName) => Object.values(world().ind).filter(i => !i.voided && i.lowestAddressLevel && al && i.lowestAddressLevel.uuid === al.uuid && i.subjectType.name === typeName),
  getSubjects: typeName => Object.values(world().ind).filter(i => !i.voided && i.subjectType.name === typeName)}});

/* ---------- rules ---------- */
const fnCache = new Map();
function runRule(code, params, where) {
  if (!code || !String(code).trim()) return undefined;
  try { if (!fnCache.has(code)) fnCache.set(code, (0, eval)(code)); return fnCache.get(code)({params, imports}); }
  catch (e) { console.warn('Rule error in', where, e); window.__errs && window.__errs.push('rule ' + where + ': ' + e.message); return undefined; }
}
const hasRule = code => !!(code && String(code).trim());

/* ---------- forms ---------- */
const formFor = (formType, stName, etName) => {
  const st = STN[stName], et = etName && ETN[etName];
  const m = BUNDLE.formMappings.find(x => !x.voided && x.formType === formType && (!st || x.subjectTypeUUID === st.uuid) && (!et || x.encounterTypeUUID === et.uuid));
  return m && (FORMU[m.formUUID] || FORMN[m.formName]);
};
const pagesOf = form => form.formElementGroups.filter(notVoided).sort(byOrder);
const topElements = g => g.formElements.filter(e => notVoided(e) && !e.parentFormElementUuid).sort(byOrder);
const childElements = (g, parent) => g.formElements.filter(e => notVoided(e) && e.parentFormElementUuid === parent.uuid).sort(byOrder);
const kvOf = (el, key) => { const x = (el.keyValues || []).find(k => k.key === key); return x ? x.value : undefined; };
const cname = el => el.concept.name;
const cdef = el => CON[el.concept.name] || el.concept;
const answersOf = el => (cdef(el).answers || []).filter(a => !a.voided).sort((a, b) => (a.order || 0) - (b.order || 0)).map(a => a.name);
const toName = x => { if (x === null || x === undefined) return x; if (typeof x === 'object') return x.concept ? x.concept.name : x.name; return ANS[x] || x; };
function normStatus(st) {
  if (!st) return {visibility: true, answersToSkip: [], answersToShow: [], validationErrors: []};
  return {visibility: st.visibility !== false, value: st.value, answersToSkip: (st.answersToSkip ? Array.from(st.answersToSkip) : []).map(toName),
    answersToShow: (st.answersToShow ? Array.from(st.answersToShow) : []).map(toName), validationErrors: (st.validationErrors ? Array.from(st.validationErrors) : []).map(x => typeof x === 'string' ? x : (x && (x.messageKey || x.message)) || String(x))};
}
function fromRuleValue(el, v) {
  const dt = cdef(el).dataType;
  if (dt === 'Coded') return Array.isArray(v) ? v.map(toName) : toName(v);
  if (dt === 'Date' || dt === 'DateTime') return moment(v).format('YYYY-MM-DD');
  if (dt === 'Numeric') return Number(v);
  return v;
}
/* A form being filled (F in ui.js): {kind, form, subject (raw), enc (raw), obs}. The entity is rebuilt from it for every rule run. */
function buildEntity(f) {
  const wd = world();
  if (f.kind === 'reg') {
    const i = mkIndividual(Object.assign({}, f.subject, {obs: f.obs}));
    const saved = wd.ind[f.subject.uuid];
    i.encounters = saved ? saved.getEncounters(true) : [];
    Object.defineProperty(i, 'groupSubjects', {value: saved ? saved.groupSubjects : [], configurable: true});
    return i;
  }
  // the visit carries the date being filled, as on the phone, so same-day and date rules see it
  const e = Object.assign({}, f.enc, f.kind === 'cancel' ? {cancelObs: f.obs, cancelDateTime: f.date} : {obs: f.obs, encounterDateTime: f.date});
  return mkEncounter(e, wd.ind[f.enc.subjectUuid]);
}
function feStub(el, idx) { const d = cdef(el); return {uuid: el.uuid, name: el.name, questionGroupIndex: idx, concept: mconcept(d), getAnswerWithConceptUuid: id => id, getAnswerWithConceptName: n => answerUuid(d, n)}; }
function elStatus(f, el, entity, idx) {
  if (!hasRule(el.rule)) return normStatus(null);
  const params = {entity, formElement: feStub(el, idx), services: services(), user: {}};
  if (idx !== undefined) params.questionGroupIndex = idx;
  return normStatus(runRule(el.rule, params, f.form.name + ' > ' + el.name));
}
const allowed = (st, name) => st.answersToShow && st.answersToShow.length ? st.answersToShow.includes(name) : !(st.answersToSkip || []).includes(name);
// Run every rule of the form; apply values and drop what the rules hide, as the phone's ObservationsHolder does. A few passes settle chains.
function evaluate(f) {
  for (let pass = 0; pass < 4; pass++) {
    const entity = buildEntity(f); let changed = false; const status = {};
    const apply = (el, st, holder) => {
      const cn = cname(el);
      if (!st.visibility) { if (holder[cn] !== undefined) { delete holder[cn]; changed = true; } return; }
      if (st.value !== undefined && st.value !== null) { const v = fromRuleValue(el, st.value); if (!_.isEqual(holder[cn], v)) { holder[cn] = v; changed = true; } }
      if (cdef(el).dataType === 'Coded' && holder[cn] !== undefined && (st.answersToShow.length || st.answersToSkip.length)) {
        const cur = holder[cn], keep = Array.isArray(cur) ? cur.filter(n => allowed(st, n)) : (allowed(st, cur) ? cur : undefined);
        if (!_.isEqual(keep, cur)) { if (isEmpty(keep)) delete holder[cn]; else holder[cn] = keep; changed = true; }
      }
    };
    pagesOf(f.form).forEach(g => topElements(g).forEach(el => {
      const st = elStatus(f, el, entity); status[el.uuid] = st;
      if (cdef(el).dataType === 'QuestionGroup') {
        const cn = cname(el);
        if (!st.visibility) { if (f.obs[cn] !== undefined) { delete f.obs[cn]; changed = true; } return; }
        const rows = f.obs[cn] = Array.isArray(f.obs[cn]) && f.obs[cn].length ? f.obs[cn] : [{}];
        rows.forEach((row, idx) => childElements(g, el).forEach(ch => { const cs = elStatus(f, ch, entity, idx); status[ch.uuid + '#' + idx] = cs; apply(ch, cs, row); }));
      } else apply(el, st, f.obs);
    }));
    // a rule may name the record (batches, events): the phone shows it in the name box
    if (f.kind === 'reg' && entity.firstName !== (f.subject.firstName || '')) { f.subject.firstName = entity.firstName; changed = true; }
    f.status = status;
    if (!changed) break;
  }
  return f;
}
const stOf = (f, el, gi) => (f.status || {})[el.uuid + (gi === undefined ? '' : '#' + gi)] || {visibility: true, answersToShow: [], answersToSkip: [], validationErrors: []};
const pageVisible = (f, g) => topElements(g).some(el => stOf(f, el).visibility);
// Avni's own checks for one field (en.json messages), then the rule's own messages.
const MSG = {empty: 'There is no value specified', nan: 'Is not a valid number', hi: 'Should be {{limit}}, or less than {{limit}}', lo: 'Should be {{limit}}, or more than {{limit}}',
  uniq: "'{{answer}}' cannot be selected with other answers"};
function fieldErrors(f, el, holder, st, tried) {
  const out = [], v = holder[cname(el)], d = cdef(el);
  if (tried && el.mandatory && isEmpty(v) && d.dataType !== 'QuestionGroup') out.push(MSG.empty);
  if (!isEmpty(v) && d.dataType === 'Numeric') {
    if (isNaN(Number(v))) out.push(MSG.nan);
    else if (d.highAbsolute !== undefined && d.highAbsolute !== null && Number(v) > d.highAbsolute) out.push(MSG.hi.replace(/\{\{limit\}\}/g, d.highAbsolute));
    else if (d.lowAbsolute !== undefined && d.lowAbsolute !== null && Number(v) < d.lowAbsolute) out.push(MSG.lo.replace(/\{\{limit\}\}/g, d.lowAbsolute));
  }
  if (Array.isArray(v) && v.length > 1) { const u = (d.answers || []).find(a => a.unique && v.includes(a.name)); if (u) out.push(MSG.uniq.replace('{{answer}}', u.name)); }
  (st && st.validationErrors || []).forEach(t => out.push(t));
  return out;
}
function scheduleFor(f) {
  const code = f.form.visitScheduleRule; if (!hasRule(code)) return [];
  const r = runRule(code, {entity: buildEntity(f), visitSchedule: [], services: services()}, f.form.name + ' > visit schedule');
  return Array.isArray(r) ? r : [];
}
function decisionFor(f) {
  const code = f.form.decisionRule; if (!hasRule(code)) return null;
  const entity = buildEntity(f);
  runRule(code, {entity, decisions: {registrationDecisions: [], encounterDecisions: [], enrolmentDecisions: []}, services: services()}, f.form.name + ' > decision');
  return entity.firstName;
}
function editAllowed(form, entityRaw) {
  if (!hasRule(form.editFormRule)) return {ok: true};
  const r = runRule(form.editFormRule, {entity: mkIndividual(entityRaw), myUserGroups: USER.groups.map(n => ({groupName: n}))}, form.name + ' > edit rule');
  const ok = !r || !r.editable || r.editable.value !== false;
  return {ok, msg: r && r.editable && r.editable.messageKey};
}

/* ---------- privileges ---------- */
const GROUPN = _.keyBy(BUNDLE.groups, 'name');
function can(type, stName, etName) {
  const st = stName && STN[stName], et = etName && ETN[etName], ids = USER.groups.map(n => GROUPN[n] && GROUPN[n].uuid).filter(Boolean);
  return BUNDLE.groupPrivilege.some(p => p.allow && ids.includes(p.groupUUID) && p.privilegeType === type && (!st || !p.subjectTypeUUID || p.subjectTypeUUID === st.uuid) && (!et || !p.encounterTypeUUID || p.encounterTypeUUID === et.uuid));
}

/* ---------- visits ---------- */
function eligibleVisits(s) {
  const st = STN[s.type], out = [];
  BUNDLE.formMappings.filter(m => !m.voided && m.formType === 'Encounter' && m.subjectTypeUUID === st.uuid).forEach(m => {
    const et = ETU[m.encounterTypeUUID]; if (!et || et.active === false || out.includes(et.name)) return;
    if (!can('PerformVisit', s.type, et.name)) return;
    if (hasRule(et.entityEligibilityCheckRule) && runRule(et.entityEligibilityCheckRule, {entity: world().ind[s.uuid], services: services()}, 'Eligibility > ' + et.name) === false) return;
    out.push(et.name);
  });
  return out;
}
function applySchedule(subjectUuid, visits) {
  (visits || []).forEach(v => {
    const type = v.encounterType, name = v.name || type;
    const early = moment(v.earliestDate).format('YYYY-MM-DD'), max = moment(v.maxDate || v.earliestDate).format('YYYY-MM-DD');
    const ex = DB.encounters.find(e => e.subjectUuid === subjectUuid && e.type === type && (e.name || e.type) === name && !e.encounterDateTime && !e.cancelDateTime && !e.voided);
    if (ex) { ex.earliestVisitDateTime = early; ex.maxVisitDateTime = max; }
    else DB.encounters.push({uuid: uid('E'), subjectUuid, type, name, encounterDateTime: null, earliestVisitDateTime: early, maxVisitDateTime: max, cancelDateTime: null, obs: {}, cancelObs: {}});
  });
}
function summaryFor(s) {
  const code = STN[s.type].subjectSummaryRule; if (!hasRule(code)) return [];
  const r = runRule(code, {individual: world().ind[s.uuid], db: world().db, services: services()}, 'Summary > ' + s.type);
  return (Array.isArray(r) ? r : []).map(x => ({name: x.name, value: toName(x.value)}));
}
// Returns the rule's refusal message, or null when the person may join (a rule must answer {eligible: {value, message}}).
function memberCheck(group, person) {
  const code = STN[group.type].memberAdditionEligibilityCheckRule; if (!hasRule(code)) return null;
  const w = world(), r = runRule(code, {member: w.ind[person.uuid], group: w.ind[group.uuid], services: services()}, 'Add member > ' + group.type);
  return r && r.eligible && r.eligible.value === false ? (r.eligible.message || r.eligible.messageKey || '') : null;
}

/* ---------- attendance ---------- */
const attendanceTypeFor = s => { const st = s && STN[s.type]; return st && st.attendanceEnabled ? BUNDLE.attendanceTypes.find(a => !a.voided && a.subjectTypeUUID === st.uuid) : null; };
const CAL = BUNDLE.calendars.find(c => c.isDefault) || {workingPattern: {}};
const isWorkingDay = d => (CAL.workingPattern[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][D.dow(d)]] || 'all') !== 'none';
const sessionOn = (groupUuid, date) => DB.sessions.find(s => s.groupSubjectUUID === groupUuid && s.scheduledDate === date && !s.voided);
const recordsOf = sessionUuid => DB.records.filter(r => r.sessionUUID === sessionUuid && !r.voided);
const activeMembers = (groupUuid, date) => DB.groupSubjects.filter(g => g.groupUuid === groupUuid && !g.voided && (!g.start || g.start <= date) && (!g.end || g.end > date)).map(g => subj(g.memberUuid)).filter(notVoided);

/* ---------- dashboards and cards ---------- */
const STD = {'9f88bee5-2ab9-4ac4-ae19-d07e9715bdb5': 'Overdue', '27020b32-c21b-43a4-81bd-7b88ad3a6ef0': 'Due', '88a7514c-48c0-4d5d-a421-d074e43bb36c': 'Recent registrations',
  '77b5b3fa-de35-4f24-996b-2842492ea6e0': 'Recent visits', '1fbcadf3-bf1a-439e-9e13-24adddfbf6c0': 'Total'};
const CARDU = _.keyBy(BUNDLE.reportCard, 'uuid');
function cardResult(card, places) {
  if (hasRule(card.query)) {
    const filter = places ? [{type: 'Address', filterValue: places.map(u => ({uuid: u, name: LOCS[u].name}))}] : [];
    const r = runRule(card.query, {db: world().db, ruleInput: filter, services: services()}, 'Card > ' + card.name);
    const list = Array.isArray(r) ? r : r && r.lineListFunction ? r.lineListFunction() : [];
    const ids = _.uniq(list.map(x => typeof x === 'string' ? x : x.uuid));
    return {count: r && r.primaryValue !== undefined ? +r.primaryValue : ids.length, ids, visits: {}};
  }
  const kind = STD[card.standardReportCardType], types = (card.standardReportCardInputSubjectTypes || []).map(u => STU[u] && STU[u].name);
  const ets = (card.standardReportCardInputEncounterTypes || []).map(u => ETU[u] && ETU[u].name);
  const dur = card.standardReportCardInputRecentDuration ? JSON.parse(card.standardReportCardInputRecentDuration) : {value: 7, unit: 'days'};
  const since = moment(T).startOf('day').subtract(Number(dur.value) - 1, dur.unit).format('YYYY-MM-DD');
  const ok = s => notVoided(s) && (!types.length || types.includes(s.type)) && (!places || places.includes(s.village));
  let ids = [], visits = {};
  if (kind === 'Total') ids = DB.subjects.filter(ok).map(s => s.uuid);
  else if (kind === 'Recent registrations') ids = DB.subjects.filter(s => ok(s) && s.registrationDate >= since).map(s => s.uuid);
  else {
    const es = DB.encounters.filter(e => !e.voided && (!ets.length || ets.includes(e.type)) && ok(subj(e.subjectUuid)));
    const pick = kind === 'Recent visits' ? es.filter(e => e.encounterDateTime && e.encounterDateTime >= since)
      : kind === 'Overdue' ? es.filter(e => isOpen(e) && e.maxVisitDateTime < T) : es.filter(e => isOpen(e) && e.earliestVisitDateTime <= T && e.maxVisitDateTime >= T);
    pick.forEach(e => { ids.push(e.subjectUuid); if (!visits[e.subjectUuid]) visits[e.subjectUuid] = e; });
  }
  return {count: _.uniq(ids).length, ids: _.uniq(ids), visits};
}
const isOpen = e => !e.encounterDateTime && !e.cancelDateTime && !e.voided;
function dashboardsFor() {
  const rows = BUNDLE.groupDashboards.filter(g => !g.voided && USER.groups.includes(g.groupName));
  const dash = n => BUNDLE.reportDashboard.find(d => d.name === n && !d.voided);
  const primary = rows.find(r => r.primaryDashboard), secondary = rows.find(r => r.secondaryDashboard);
  return {primary: primary && dash(primary.dashboardName), secondary: secondary && dash(secondary.dashboardName), all: _.uniq(rows.map(r => r.dashboardName)).map(dash).filter(Boolean)};
}
const sectionsOf = d => d.sections.filter(notVoided).sort(byOrder).map(s => ({name: s.name, cards: s.dashboardSectionCardMappings.filter(notVoided).sort(byOrder).map(m => CARDU[m.reportCardUUID]).filter(Boolean)}));
