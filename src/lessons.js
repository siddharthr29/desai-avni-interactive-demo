'use strict';
/* Lessons. Each sentence is written once in English; Hindi and Gujarati come from data/i18n.json. App labels stay in English, as in the real app. */
const P = n => () => DB.people[n].uuid;
const B = n => () => DB.batches[n].uuid;
const CARD = n => (BUNDLE.reportCard.find(c => c.name === n && !c.voided) || {}).uuid;
const subjOf = (type, name) => () => (DB.subjects.find(s => s.type === type && fullName(s).startsWith(name)) || {}).uuid;
const openEncId = (who, type) => () => (DB.encounters.find(e => e.subjectUuid === DB.people[who].uuid && e.type === type && isOpen(e)) || {}).uuid;
const month = () => D.M[D.p(T).getMonth()] + ' ' + D.p(T).getFullYear();
const tap = (s, a, v, t, why, tag) => ({k: 'tap', s, a, v, t, why, tag});
const info = (s, sel, t, why, tag) => ({k: 'info', s, sel, t, why, tag});
const typ = (s, sel, value, test, t, why) => ({k: 'type', s, sel, val: value, test, t, why});
const form = (s, demo, notes, core, sum, x) => Object.assign({k: 'form', s, demo: demo || {}, notes: notes || {}, core, sum}, x || {});
const at = (stack) => () => { S.stack = stack(); };
const onSubject = id => at(() => [{n: 'home'}, {n: 'subject', id: val(id)}]);
const lastOf = (who, type) => DB.encounters.filter(e => e.subjectUuid === DB.people[who].uuid && e.type === type);

const GROUPS = [['start', 'Start here'], ['health', 'Health camp day'], ['batch', 'Batches and classes'], ['events', 'Events and planning'], ['stops', 'Mistakes the app stops'], ['lead', 'Coordinators and management']];

const LESSONS = [
  /* ---------------- start ---------------- */
  {id: 'login', g: 'start', e: '🔑', t: 'Log in and Sync', d: 'Log in once, then Sync every morning and evening.',
    setup: at(() => [{n: 'login'}]),
    flow: [['Log in with your user ID'], ['The app downloads your villages and forms', 1], ['Home opens'], ['Sync after your work']],
    steps: [
      typ(0, '[data-in="login"][data-k="u"]', 'kajal@desai_demo', () => S.login.u.length >= 3, 'Type your **User ID**. Example: **kajal@desai_demo**', 'Your admin gives you the user ID. It ends with the name of your organisation.'),
      typ(0, '[data-in="login"][data-k="p"]', 'demo1234', () => S.login.p.length >= 3, 'Type your **Password**.'),
      tap(0, 'login:go', undefined, 'Tap **LOGIN**.'),
      tap(1, 'sync:ok', undefined, 'The app is bringing your data. When you see **Sync Complete**, tap **OK**.', 'The first sync needs internet and can take a few minutes on a slow network.'),
      info(2, '[data-sec="h0"]', 'This is your **Home**. Each coloured box is a **card**. The big number tells how many records wait there.'),
      tap(3, 'hdr:sync', undefined, 'Tap **Sync** (the two round arrows, top right).', 'Sync sends your saved work to the server and brings new work. Do it every morning and every evening.'),
      tap(3, 'sync:ok', undefined, 'Wait for **Sync Complete**, then tap **OK**.')
    ],
    take: ['The app works without internet. Only Sync needs internet.', 'Sync in the morning and again after your work.']},

  {id: 'home', g: 'start', e: '🏠', t: 'Read your Home', d: 'What each card means, and the village filter.',
    flow: [['Look at the four sections'], ['Open a card'], ['See who is in it'], ['Filter by village']],
    steps: [
      info(0, '[data-sec="h0"]', '**Attendance Mark** lists the batches whose class today is not marked yet, and batches with a class in the last 3 days that was never marked.', 'These cards look at Sewing, Computer, Beautician and Summer Camp batches, the courses that take attendance.', 'Attendance cards'),
      info(0, '[data-sec="h1"]', '**Do first (overdue)** is late work: follow-ups and tests past their last date, and people who did not follow a referral.', null, 'Home ordered by urgency'),
      info(0, '[data-sec="h2"]', '**Due now** is work for today: follow-ups, Baselines and Endlines that are due.'),
      info(0, '[data-sec="h3"]', '**My entries** counts your registrations and visits this week, and all beneficiaries.'),
      tap(1, 'card', CARD('Health follow-ups overdue'), 'Tap the **Health follow-ups overdue** card.'),
      info(2, '.row', 'These people have a health follow-up that is late. Tap a name to open the person and fill the follow-up.'),
      tap(2, 'hdr:home', undefined, 'Tap **Home** (top right) to go back.', 'The Home icon works from every screen.'),
      tap(3, 'd:filter', undefined, 'Tap **FILTER** to see one village only.'),
      tap(3, 'fl:pick', () => DESAI.locations.find(l => l.name === 'Gujarat').uuid, 'Tick **Gujarat**. The next level opens below.', 'You can stop at any level: a district or block includes every village under it.'),
      tap(3, 'fl:pick', () => DESAI.locations.find(l => l.name === 'South Gujarat').uuid, 'Tick **South Gujarat**.'),
      tap(3, 'fl:pick', () => DESAI.locations.find(l => l.name === 'Navsari').uuid, 'Tick **Navsari**.'),
      tap(3, 'fl:pick', () => DESAI.locations.find(l => l.name === 'Chikhali').uuid, 'Tick **Chikhali**.'),
      tap(3, 'fl:pick', () => villageBy('Agasi').uuid, 'Tick the village **Agasi**.'),
      tap(3, 'fl:apply', undefined, 'Tap **Apply**.'),
      info(3, '.afl', 'The grey box shows the filter: **Village - Agasi**. Every card now counts Agasi only. The small icon on the right removes the filter.', null, 'Village filter on every Home')
    ],
    take: ['Start each day with **Attendance Mark** and **Do first**.', 'A card with 0 means nothing is waiting there.']},

  {id: 'search', g: 'start', e: '🔍', t: 'Find a person', d: 'Search by name and open the person\'s page.',
    flow: [['Tap Search'], ['Choose the type and type a name'], ['Open the person'], ['Read the person\'s page']],
    steps: [
      tap(0, 'hdr:search', undefined, 'Tap the **Search** icon (magnifying glass) at the top.'),
      tap(1, 's:type', 'Beneficiary', 'Under **Choose type**, tap **Beneficiary**.', 'Choose a batch type (for example Sewing (SST)) or Event Matrix to find those instead.'),
      typ(1, '[data-in="stext"]', 'Asha', () => S.search.text.trim().length >= 3, 'Type the name. Example: **Asha**', 'A part of the name, the phone number or the village also works.'),
      tap(1, 's:submit', undefined, 'Tap **Submit**.'),
      tap(2, 'open', P('asha'), 'Tap **Asha Patel** in the results.'),
      info(3, '.ph', 'This is the person\'s page: name, age and village at the top. The grey chip below is the batch she is in.'),
      info(3, '[data-reg]', '**Registration Details**: tap the small arrow to see her registration answers.'),
      info(3, '[data-enc]', 'Lower down are her **Visits Planned** and **Completed Encounters**. **New Form** at the top starts a visit.'),
      tap(3, 'hdr:home', undefined, 'Tap **Home** to finish.')
    ],
    take: ['Always search before registering, so nobody is entered twice.']},

  /* ---------------- health ---------------- */
  {id: 'register', g: 'health', e: '👤', t: 'Register a person', d: 'Consent first, then contact and education.',
    flow: [['Register tab, Beneficiary'], ['Name, age, gender, village'], ['Consent'], ['Phone number'], ['Education'], ['Check and SAVE']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register** at the bottom.'),
      tap(0, 'rtype', 'Beneficiary', 'Tap **Beneficiary**.'),
      form(1, {'Consent Given': 'Yes', Contact: '9876501234', 'Education Level': 'Secondary', 'Std Class': 'Std 10'},
        {'core:first': 'Write the name as on the person\'s ID card.', 'Consent Given': 'If the person says No, the app hides every other question and offers no visits for this person.', Contact: 'A 10-digit mobile number starting with 6, 7, 8 or 9.', 'Education Level': 'Std (Class) appears only when the education is Primary to Higher Secondary.'},
        {first: 'Lata', last: 'Rathod', age: 34, gender: 'Female', village: 'Agasi'}, null,
        {stages: [1, 2, 3, 4], tags: {'Consent Given': 'Consent comes first', Contact: 'Phone number and duplicate check', 'Education Level': 'Class follows education'}})
    ],
    take: ['No consent, no forms: the person stays registered but cannot be served.', 'The consent photo is optional.', 'If someone with the same name and a similar age is already registered in the village, the app asks if this is a different person.'],
    check: () => DB.subjects.some(s => s.firstName === 'Lata' && s.obs.Contact === '9876501234') || 'Lata not saved'},

  {id: 'camp', g: 'health', e: '🏥', t: 'Health camp visit', d: 'Record that a person came to the camp.',
    setup: onSubject(P('amit')),
    flow: [['Open the person'], ['New Form, Health Camp'], ['Camp details'], ['SAVE']],
    steps: [
      info(0, '.ph', 'This is **Amit Patel** from Agasi. He came to today\'s camp.'),
      tap(1, 'newform', undefined, 'Tap **New Form**.'),
      tap(1, 'type', 'Health Camp', 'Tap **Health Camp**.', 'Only forms that fit the person appear here. A person without consent gets none.', 'Consent comes first'),
      form(2, {'Camp Type': 'General Health', 'Partner Name': 'Desai Foundation Trust', 'Camp Location': 'Agasi Primary School', 'Motivation for visit': 'Symptoms', 'Check-up before': 'No', 'Family members': 4},
        {'Camp Type': 'Gynec is hidden for men; Bal Health Mela is hidden for adults.', 'Token Number': 'Fills itself: the next number after today\'s highest token on this phone. You can type a different one.', 'Motivation for visit': 'Why the person came: to stay healthy, because of symptoms, or for an old diagnosis.'}, null, null,
        {tags: {'Camp Type': 'Camp types that fit the person', 'Token Number': 'Token numbers fill themselves'}})
    ],
    take: ['The camp list shows only the camps that fit the person.', 'The same camp twice on one day is refused.'],
    check: () => lastOf('amit', 'Health Camp').length === 1 || 'camp not saved'},

  {id: 'screening', g: 'health', e: '🩺', t: 'Screening and follow-up', d: 'What was checked and found; the app plans the follow-up.',
    setup: onSubject(P('asha')),
    flow: [['New Form, Screening'], ['Choose what was screened'], ['Findings and referral'], ['Follow-up needed?'], ['The app plans the Health follow-up', 1]],
    steps: [
      tap(0, 'newform', undefined, 'Tap **New Form**.'),
      tap(0, 'type', 'Screening', 'Tap **Screening**.'),
      form(1, {'Screening For': 'Gynec', 'Screenings Completed - Gynec': ['BP screening', 'Anemia screening'], 'Diagnosis - Gynec': ['Anemia'], 'Referral made': 'Yes', 'Follow-up needed': 'Yes'},
        {'Screening For': 'Only the page for the chosen screening opens next.', 'Follow-up needed': 'Yes plans a Health Follow-up 30 days later, due for 15 days.'}, null, null, {tags: {'Follow-up needed': 'Follow-up planned by the app'}}),
      info(4, '[data-enc]', 'The app planned a **Health Follow-up**. It will appear on Home under **Due now** when its day comes.', 'You did not create this visit. The app made it from your answer.', 'Follow-up planned by the app')
    ],
    take: ['Answer **Follow-up needed** carefully: Yes plans a visit for you.'],
    check: () => lastOf('asha', 'Health Follow-up').some(isOpen) || 'no follow-up planned'},

  {id: 'followup', g: 'health', e: '📞', t: 'Health follow-up', d: 'Fill a follow-up that is due.',
    flow: [['Home, Health follow-ups due'], ['Open the person'], ['Do the planned visit'], ['SAVE: the follow-up is done', 1]],
    steps: [
      tap(0, 'card', CARD('Health follow-ups due'), 'Tap the **Health follow-ups due** card.'),
      tap(1, 'open', P('hansa'), 'Tap **Hansa Dhodia**.'),
      tap(2, 'visit:do', openEncId('hansa', 'Health Follow-up'), 'Next to **Health Follow-up**, tap **Do**.'),
      form(2, {'Given screening or check-up': 'Yes', 'Outcome of screening': 'Treatment Recommendation', 'Followed treatment plan': 'Followed exactly as given', 'Given recommended practices': 'No'},
        {'Outcome of screening': 'The next question changes with this answer: treatment, referral or normal.'}),
      info(3, '.ph', 'Saved. There is one **Health Follow-up** after a screening, a month later, so nothing more is planned. A new screening plans a new one.', null, 'One follow-up each')
    ],
    take: ['One health follow-up, a month after the screening.', 'If the person was not available, cancel it: the app plans it once more.'],
    check: () => (lastOf('hansa', 'Health Follow-up').some(e => e.encounterDateTime) && !lastOf('hansa', 'Health Follow-up').some(isOpen)) || 'follow-up not saved, or a second one was planned'},

  {id: 'cancel', g: 'health', e: '✖️', t: 'Cancel a visit', d: 'When a person cannot be met: the reason stops the series.',
    setup: onSubject(P('geeta')),
    flow: [['Open the person'], ['Cancel the planned visit'], ['Choose the reason'], ['SAVE']],
    steps: [
      info(0, '[data-enc]', '**Geeta Tandel** has moved to another town. Her follow-up is **Overdue**.'),
      tap(1, 'visit:cancel', openEncId('geeta', 'Health Follow-up'), 'Tap **Cancel** next to the visit.'),
      form(2, {'Reason for cancellation': 'Person moved away'}, {'Reason for cancellation': 'Moved away, died or refused: no new visit. Person not available: the follow-up is planned once more.'}, null, null, {tags: {'Reason for cancellation': 'Follow-up chains'}})
    ],
    take: ['Never leave a visit overdue for a person you cannot meet. Cancel it with a reason.'],
    check: () => lastOf('geeta', 'Health Follow-up').some(e => e.cancelDateTime) || 'not cancelled'},

  /* ---------------- batches ---------------- */
  {id: 'batch', g: 'batch', e: '👥', t: 'Create a batch', d: 'The app names the batch and works out the last class day.',
    flow: [['Register tab, the course'], ['Type the place; the app adds course and month', 1], ['Start date and last class day', 1], ['SAVE']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register**.'),
      tap(0, 'rtype', 'Sewing (SST)', 'Tap **Sewing (SST)**.', 'Each course is its own type, so attendance and reports stay per course.'),
      form(1, {}, {'core:name': 'The app already wrote the course and month. Only add the village or a short label after it.', 'Batch Start Date': 'Today by default. Change it if the batch started earlier.', 'Batch Last Class Day': 'Worked out from the course length, counting Monday to Saturday.'},
        {name: () => `Sewing (SST) - ${month()} - Kevdi`, village: 'Kevdi'}, 'Check the name and dates, then tap **SAVE**.', {stages: [1, 2], tags: {'Batch Last Class Day': 'Batch dates', 'Batch month': 'Batch names fill themselves'}}),
      info(3, '.ph', 'The batch is saved: the name has the course, the month and **Kevdi**. Next, add the students.')
    ],
    take: ['Course and month are added to the name by the app.', 'After the last class day (plus 3 days), the batch refuses new students.'],
    check: () => DB.subjects.some(s => s.type === 'Sewing (SST)' && s.firstName.endsWith('Kevdi')) || 'batch not saved'},

  {id: 'student', g: 'batch', e: '➕', t: 'Add a student to a batch', d: 'Pick a registered person; the app checks the rules.',
    setup: onSubject(B('sewing')),
    flow: [['Open the batch'], ['Add Member'], ['Search the person'], ['Save: the app checks consent, age and dates', 1]],
    steps: [
      info(0, '[data-mem]', 'This is the Sewing batch in Agasi with its students.'),
      tap(1, 'am:open', undefined, 'Tap **Add Member**.'),
      tap(1, 'am:role', 'Member', 'For **Role**, tap **Member**. The start date is today; change it if she joined earlier.'),
      tap(2, 'am:search', undefined, 'Tap **Search existing Beneficiary**.', 'Register the person first if she is new.'),
      tap(2, 'am:pick', P('priya'), 'Tap **Priya Thakre**.'),
      tap(3, 'am:save', undefined, 'Tap **SAVE**.', 'The app refuses people without consent, people under 15 for livelihood courses, and batches that ended.', 'Batch joining rules'),
      info(3, '[data-mem]', 'Priya is now in the batch. She will be on the attendance roster from today.')
    ],
    take: ['A student can be in more than one batch.', 'Students joining late are allowed only up to 3 days after the last class day.'],
    check: () => DB.groupSubjects.some(m => m.groupUuid === DB.batches.sewing.uuid && m.memberUuid === DB.people.priya.uuid) || 'not added'},

  {id: 'attendance', g: 'batch', e: '✅', t: 'Mark attendance', d: 'Today\'s class: present, absent and the reason.',
    flow: [['Home, Classes to mark today'], ['Open the batch'], ['Attendance: pick the day'], ['Tap absent students, choose the reason'], ['Save attendance']],
    steps: [
      tap(0, 'card', CARD('Classes to mark today'), 'Tap the **Classes to mark today** card.', 'Only Sewing, Computer, Beautician and Summer Camp take attendance.', 'Attendance cards'),
      tap(1, 'open', B('sewing'), 'Tap the **Sewing (SST)** batch.'),
      tap(2, 'att:open', undefined, 'Tap the **Attendance** card.', null, 'Avni Attendance'),
      info(2, '.dstrip', 'The strip shows the last 14 days. Today is selected. A dot under a day means that class is marked.'),
      tap(3, 'att:mark', undefined, 'Tap **Mark attendance**.'),
      info(3, '.rhelp', 'Everyone starts as **Present**. Tap a student\'s row to make them **Absent**.'),
      tap(3, 'ro:toggle', P('daksha'), 'Daksha did not come. Tap her row, **Daksha Desai**.'),
      tap(3, 'ro:reason', () => DB.people.daksha.uuid + '|Sick', 'Under **Reason for absence**, tap **Sick**.'),
      tap(4, 'ro:save', undefined, 'Scroll down and tap **Save attendance**.'),
      info(4, '.atype', 'Back on the sheet: **✓ 5 of 6 present**. Today now has a dot in the strip, and the card on Home goes down by one.')
    ],
    take: ['Mark attendance on the day of the class.', 'Choose a reason for each absent student: it shows in the reports.'],
    check: () => { const s = sessionOn(DB.batches.sewing.uuid, T); return (s && recordsOf(s.uuid).some(r => r.subjectUUID === DB.people.daksha.uuid && r.status === 'Absent' && r.reason === 'Sick')) || 'not saved'; }},

  {id: 'didnt', g: 'batch', e: '🚫', t: 'Class did not happen', d: 'Holiday or trainer away: record it so it is not counted as missed.',
    setup: onSubject(B('sewing')),
    flow: [['Open the batch, Attendance'], ['Pick the day'], ['Didn\'t happen, with the reason'], ['SAVE']],
    steps: [
      tap(0, 'att:open', undefined, 'Tap the **Attendance** card.'),
      tap(1, 'att:day', () => prevClassDay(T), 'The last class day has no dot. Tap it in the date strip.'),
      tap(2, 'att:didnt', undefined, 'The trainer was away. Tap **Didn\'t happen**.'),
      tap(2, 'dh:pick', undefined, 'Tap **Select reason**.'),
      tap(2, 'dh:set', 'Trainer not available', 'Tap **Trainer not available**.'),
      tap(3, 'dh:save', undefined, 'Tap **SAVE**.'),
      info(3, '.atype', 'The day now reads **⊘ Didn\'t happen · Trainer not available**, with a grey dot in the strip. It is no longer counted as a class not marked.', null, 'Attendance cards')
    ],
    take: ['A class that did not happen is still recorded, with the reason.']},

  {id: 'baseline', g: 'batch', e: '📝', t: 'Baseline (pre-test)', d: 'The starting score of a student.',
    flow: [['Home, Baselines due'], ['Open the student'], ['Do the Baseline'], ['SAVE']],
    steps: [
      tap(0, 'card', CARD('Baselines due'), 'Tap the **Baselines due** card.'),
      tap(1, 'open', P('bhavna'), 'Tap **Bhavna Naik**.'),
      tap(2, 'visit:do', openEncId('bhavna', 'Baseline / Pre-test'), 'Next to **Baseline / Pre-test**, tap **Do**.'),
      form(2, {'Pre-test Score': 35, 'Knowledge Level': 'Low', 'Skill Confidence': 'Rather low'}, {'Pre-test Score': 'Out of 100. The Endline compares with this score.'})
    ],
    take: ['Do the Baseline in the first days of the course.'],
    check: () => lastOf('bhavna', 'Baseline / Pre-test').some(e => e.encounterDateTime) || 'not saved'},

  {id: 'endline', g: 'batch', e: '🎓', t: 'Endline and the follow-up', d: 'Final score, outcome; the app plans a follow-up 3 months later.',
    flow: [['Home, Endlines due'], ['Do the Endline'], ['The app carries the pre-test and works out the change', 1], ['Outcome Completed: a follow-up 3 months later', 1]],
    steps: [
      tap(0, 'card', CARD('Endlines due'), 'Tap the **Endlines due** card.'),
      tap(1, 'open', P('rakesh'), 'Tap **Rakesh Gamit**.'),
      tap(1, 'visit:do', openEncId('rakesh', 'Endline / Post-test'), 'Next to **Endline / Post-test**, tap **Do**.'),
      form(2, {'Post-test Score': 72, 'Knowledge Level': 'High', 'Skill Confidence': 'Rather high', 'Programme outcome': 'Completed'},
        {'Post-test Score': 'The app fills the pre-test score from the Baseline and shows the change.', 'Programme outcome': 'Completed plans one Livelihood Follow-up, 3 months later.'}, null, null, {tags: {'Post-test Score': 'Score change worked out'}}),
      info(3, '[data-enc]', 'The **Livelihood Follow-up** is planned 3 months from today.', null, 'One follow-up each')
    ],
    take: ['Choose the outcome carefully: only Completed plans the follow-up.'],
    check: () => lastOf('rakesh', 'Livelihood Follow-up').some(isOpen) || 'no follow-up planned'},

  {id: 'lfu', g: 'batch', e: '💼', t: 'Livelihood follow-up', d: 'After the course: is the skill earning?',
    setup: onSubject(P('geeta')),
    flow: [['Open the person'], ['Do the follow-up'], ['Work and income'], ['SAVE: done, nothing more planned', 1]],
    steps: [
      tap(0, 'visit:do', openEncId('geeta', 'Livelihood Follow-up'), 'Next to **Livelihood Follow-up**, tap **Do**.'),
      form(1, {'Received support post-training': 'No', 'Skill use frequency': 'Often', 'Last monthly income': 6000, 'Are you employed': 'Yes - work related to training', 'Kind of employment': 'Running an enterprise', 'Enterprise employees': 'No employees'},
        {'Are you employed': 'The questions about the enterprise appear only for work related to the training.'})
    ],
    take: ['Ask about the last month only.']},

  /* ---------------- events ---------------- */
  {id: 'event', g: 'events', e: '📊', t: 'Record an Event Matrix', d: 'People reached, money, volunteers; the app does the totals.',
    flow: [['Register tab, Event Matrix'], ['The name fills itself', 1], ['Event details'], ['Impact: totals and indirect people', 1], ['Money: rupees to dollars', 1], ['Draft or Submitted'], ['SAVE']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register**.'),
      tap(0, 'rtype', 'Event Matrix', 'Tap **Event Matrix**.'),
      form(1, {'Program Category': 'Health', 'Program Name': 'Vision Care and Awareness Camp', 'Expected Beneficiaries': 120, 'Event Start Date': () => D.add(T, -1), 'Partner Name': 'Desai Foundation Trust', 'CSR Partner Name': 'Nykaa',
        Women: 60, 'Children Male': 12, 'Children Female': 15, 'Other Impacted': 5, 'USD Exchange Rate': 84, 'Investment Cost Partner DF Funded INR': 42000, 'Event Status': 'Draft'},
        {'core:name': 'Leave the name: the app names the event from the programme and the date.', 'Program Name': 'Only the programmes of the chosen pillar are shown.', Women: 'Children is the total of boys and girls. All Impacted adds women, children and other.',
          'Indirect Beneficiary': 'Worked out from the programme: Vision Care counts 4 family members for each person reached.', 'Investment Cost Partner DF Funded INR': 'Dollar amounts are worked out from the rupee rate. Expense month fills itself from the event date.', 'Event Status': 'Keep Draft until the numbers are final. Submitted locks the event.'},
        {village: 'Agasi'}, 'Check the totals, then tap **SAVE**.', {stages: [1, 2, 3, 4, 4, 4, 5], tags: {'core:name': 'Event names fill themselves', Women: 'Totals worked out', 'Investment Cost Partner DF Funded INR': 'Rupees to dollars', 'Event Status': 'Draft and Submitted'}}),
      info(6, '.ph', 'Saved as **Vision Care and Awareness Camp** with the date. All Impacted is 92 and indirect people 368.')
    ],
    take: ['You type the people and the rupees; the app adds up and converts.', 'Submit only when the numbers are final.'],
    check: () => DB.subjects.some(s => s.type === 'Event Matrix' && s.firstName.startsWith('Vision Care and Awareness Camp') && s.obs['All Impacted'] === 92 && s.obs['Indirect Beneficiary'] === 368) || 'event totals wrong'},

  {id: 'eventlock', g: 'events', e: '🔒', t: 'A submitted event is locked', d: 'Why you cannot edit it, and who can.',
    setup: onSubject(subjOf('Event Matrix', 'Gynec Checkup')),
    flow: [['Open the submitted event'], ['Try Edit'], ['The app refuses']],
    steps: [
      info(0, '.ph', 'This event was **Submitted** last week.'),
      tap(1, 'reg:edit', '-1', 'Tap **Edit** under the registration details.'),
      info(2, null, 'The app refuses with a message at the bottom: **This event is submitted and locked. Ask your admin to change it.** The donor numbers cannot change by mistake.', null, 'Submitted lock')
    ],
    take: ['Submit only when the numbers are final.']},

  {id: 'plan', g: 'events', e: '🗓️', t: 'Annual Program Plan', d: 'Management plans the programmes of the year.', role: 'mgmt',
    flow: [['Register tab, Annual Program Plan'], ['Type the zone; the app adds the year', 1], ['One row per programme'], ['SAVE']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register**.', 'Only Management and Coordinators can plan. Field staff can only see the plan.'),
      tap(0, 'rtype', 'Annual Program Plan', 'Tap **Annual Program Plan**.'),
      form(1, {'Program Category': 'Livelihood', 'Program Name': 'Computer Skill Training', 'Expected Beneficiaries': 200, 'Partner Name': ['Desai Foundation Trust'], 'Planned Investment Cost INR': 800000},
        {'core:name': 'Type only the zone. At SAVE the app puts "Annual Plan FY" and the year in front.', 'Program Name': 'A programme can be in only one row.'}, {name: 'North Gujarat', village: 'Agasi'}, 'The name now starts with the financial year. Tap **SAVE**.', {stages: [1, 2], tags: {'core:name': 'Plan named by financial year'}})
    ],
    take: ['Add one row per programme. Use the + button for more rows.'],
    check: () => DB.subjects.some(s => s.type === 'Annual Program Plan' && /^Annual Plan FY \d{4}-\d\d - North Gujarat$/.test(s.firstName)) || 'plan name wrong'},

  /* ---------------- the app stops you ---------------- */
  {id: 'wrongphone', g: 'stops', e: '☎️', t: 'Wrong phone number', d: 'The app refuses a number that is not a mobile number.',
    flow: [['Register a person'], ['Type a short number'], ['The app stops you', 1], ['Correct it']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register**.'), tap(0, 'rtype', 'Beneficiary', 'Tap **Beneficiary**.'),
      form(1, {'Consent Given': 'Yes', Contact: '12345', 'Education Level': 'Graduate'}, {}, {first: 'Nita', last: 'Shah', age: 29, gender: 'Female', village: 'Kharoli'}, null,
        {stages: [0, 1, 1, 1], expect: {Contact: 'The app stops you: **12345** is not a 10-digit mobile number. The message stays until you correct it.'}, fix: {Contact: '9876512345'}, tags: {Contact: 'Phone number and duplicate check'}})
    ],
    take: ['A mobile number has 10 digits and starts with 6, 7, 8 or 9.']},

  {id: 'duplicate', g: 'stops', e: '👯', t: 'Same person twice', d: 'Same name, village and age: the app asks before saving.',
    flow: [['Register a person who already exists'], ['Same name, village, similar age'], ['The app asks: a different person?', 1], ['No: go back and search instead']],
    steps: [
      tap(0, 'tab', 'register', 'Tap **Register**.'), tap(0, 'rtype', 'Beneficiary', 'Tap **Beneficiary**.'),
      form(1, {'Consent Given': 'Yes', 'Different person with same name': 'No', Contact: '9876598765'}, {'Different person with same name': 'This question appears only because **Asha Patel**, aged 32, is already registered in Agasi. The phone number does not matter.'}, {first: 'Asha', last: 'Patel', age: 33, gender: 'Female', village: 'Agasi'}, null,
        {stages: [0, 1, 2, 2], expect: {'Different person with same name': 'You answered **No**: it is the same person, so the app stops you from saving a second record.'}, endOnStop: 1, tags: {'Different person with same name': 'Same name check'}}),
      tap(3, 'hdr:home', undefined, 'Tap **Home** to leave this form.'),
      tap(3, 'dlg', '0', 'Tap **YES**. Then search for Asha instead of registering her again.')
    ],
    take: ['Search before you register.', 'Answer **Yes** only when it really is another person with the same name.', 'Coordinators see the rest on the **Possible duplicates** card.']},

  {id: 'sameday', g: 'stops', e: '📆', t: 'Same camp twice in a day', d: 'The app refuses a double entry.',
    setup: onSubject(P('asha')),
    flow: [['Asha already came to today\'s Gynec camp'], ['Start a second Health Camp'], ['The app stops you', 1]],
    steps: [
      info(0, '[data-enc]', '**Asha Patel** already has a Health Camp today.'),
      tap(1, 'newform', undefined, 'Tap **New Form**.'), tap(1, 'type', 'Health Camp', 'Tap **Health Camp**.'),
      form(2, {'Camp Type': 'Gynec'}, {}, null, null, {expect: {'Camp Type': 'The app stops you: this person already has a Gynec camp entry today. Open that entry and use Edit.'}, endOnStop: 1, tags: {'Camp Type': 'Same-day double entry blocked'}}),
      tap(2, 'hdr:home', undefined, 'Tap **Home** to leave the form.'),
      tap(2, 'dlg', '0', 'Tap **YES**.')
    ],
    take: ['To change today\'s entry, open it and tap **Edit**.']},

  {id: 'ended', g: 'stops', e: '⛔', t: 'Joining a batch that ended', d: 'A finished batch refuses new students.',
    setup: onSubject(B('summer')),
    flow: [['Open a batch that has ended'], ['Add a student'], ['The app refuses', 1]],
    steps: [
      info(0, '.vc', 'This Summer Camp ended more than 3 days ago.'),
      tap(1, 'am:open', undefined, 'Tap **Add Member**.'), tap(1, 'am:role', 'Member', 'For **Role**, tap **Member**.'), tap(1, 'am:search', undefined, 'Tap **Search existing Beneficiary**.'),
      tap(1, 'am:pick', P('nisha'), 'Tap **Nisha Solanki**.'),
      info(2, '.err', 'The app refuses at once, in red under **Group Member**: the batch ended. Start a new batch for new students.', null, 'Batch joining rules')
    ],
    take: ['Late joining is allowed only up to 3 days after the last class day.']},

  /* ---------------- coordinators and management ---------------- */
  {id: 'coord', g: 'lead', e: '🧭', t: 'Coordinator Home', d: 'Your team\'s late work, drafts and two dashboards.', role: 'coord',
    flow: [['Your Home'], ['Events left in Draft'], ['Supervisor Reports tab']],
    steps: [
      info(0, '[data-sec="h1"]', 'As a coordinator, **Do first** also shows **Events in Draft (over 7 days)**: events your team has not submitted.', null, 'Drafts card'),
      tap(1, 'card', CARD('Events in Draft (over 7 days)'), 'Tap **Events in Draft (over 7 days)**.'),
      info(1, '.row', 'Open the event, check the numbers with the field executive, then set it to Submitted.'),
      tap(2, 'hdr:home', undefined, 'Tap **Home**.'),
      tap(2, 'tab', 'dash2', 'Tap **Supervisor Reports** at the bottom.'),
      info(2, '[data-sec="s0"]', 'This week and the last 30 days, and what needs attention.')
    ],
    take: ['Check the Draft card every week.']},

  {id: 'mgmt', g: 'lead', e: '📈', t: 'Management dashboard', d: 'The programme at a glance, and the other dashboards.', role: 'mgmt',
    flow: [['Needs attention'], ['Totals'], ['More > Dashboards']],
    steps: [
      info(0, '[data-sec="h0"]', '**Needs attention** brings together drafts, referrals not followed, overdue follow-ups and unmarked classes.'),
      info(1, '[data-sec="h1"]', '**Totals** counts beneficiaries and this week\'s work.'),
      tap(2, 'tab', 'more', 'Tap **More**.'), tap(2, 'more', 'Dashboards', 'Tap **Dashboards**.'),
      info(2, '.rlist', 'You can also open the coordinator and field dashboards from here. Detailed reports are in **Desai reports (Metabase)**.')
    ],
    take: ['The phone shows today\'s work. Metabase shows the year.']}
];

/* Free explore: what each screen is for */
const HERE = {
  home: ['Home', ['Cards with a number. Tap a card to see who is in it.', '**FILTER** shows one village.', 'Search (top) finds a record; Sync sends your work.']],
  dash2: ['Second dashboard', ['A second set of cards for your role.']],
  cards: ['A card\'s list', ['Everyone the card counts. Tap a row to open it.']],
  search: ['Search', ['Choose the type, type a part of the name, tap Submit.']],
  results: ['Search results', ['Tap a row to open it.']],
  register: ['Register', ['Every record starts here: a person, a batch, an event or a plan.', 'You see only what your role may register.']],
  subject: ['A record\'s page', ['**Profile**: registration details, and for a batch its students and Attendance.', '**General**: visits planned and done. **New Form** starts a visit.']],
  form: ['A form', ['Questions with * must be answered.', 'Some questions appear only after an answer.', 'NEXT checks the page; PREVIOUS goes back.']],
  summary: ['Summary', ['Check every answer. Nothing is saved until you tap SAVE.']],
  attendance: ['Attendance', ['P present, A absent. Every absent student needs a reason.', 'Pick another day from the dates at the top.']],
  addMember: ['Add Member', ['Search an existing person or register a new one.']],
  more: ['More', ['Dashboards, Metabase reports, sync status, logout.']],
  login: ['Login', ['Type your user ID and password.']],
  filter: ['Filter', ['Pick a village, then Apply.']],
  dashlist: ['Dashboards', ['Every dashboard your role may open.']],
  dashboard: ['Dashboard', ['Cards of another dashboard.']]
};
