/* ─────────────────────────────────────────────────────────────
   Patidar Homoeopathic Clinic & Pharmacy  –  app.js  v4
   ───────────────────────────────────────────────────────────── */
'use strict';

/* ════════════════════════════════════════════════════════════
   1.  AUTH
   ════════════════════════════════════════════════════════════ */

const CREDS = { email: 'dr.ncpatidar@gmail.com', password: 'PATIDARHOMEO' };

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pwd   = document.getElementById('login-password').value;
  if (email === CREDS.email.toLowerCase() && pwd === CREDS.password) {
    sessionStorage.setItem('phc_auth', '1');
    document.getElementById('login-error').hidden = true;
    showApp();
  } else {
    document.getElementById('login-error').hidden = false;
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  }
}

function handleLogout() {
  sessionStorage.removeItem('phc_auth');
  document.getElementById('app').hidden = true;
  document.getElementById('login-page').hidden = false;
  document.body.classList.add('logged-out');
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').hidden   = true;
}

function togglePwd() {
  const i = document.getElementById('login-password');
  i.type = i.type === 'password' ? 'text' : 'password';
}

function showApp() {
  document.getElementById('login-page').hidden = false; // keep in DOM but hide via CSS
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').hidden = false;
  document.body.classList.remove('logged-out');
  // Hydrate tables from localStorage
  Object.keys(STORE_KEYS).forEach(t => { if (loadStore(t).length) renderTable(t); });
  updateDashboardStats();
  refreshDropdowns();
  showPage('dashboard');
}

/* ════════════════════════════════════════════════════════════
   2.  NAVIGATION  (4-item nav only)
   ════════════════════════════════════════════════════════════ */

const VALID_PAGES = [
  'dashboard','add-patient','all-patients','create-prescription',
  'all-prescriptions','yearly-prescriptions','add-medicine','all-medicines'
];

function showPage(pageId) {
  if (!VALID_PAGES.includes(pageId)) pageId = 'dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  // Nav highlight — map sub-pages to their nav btn
  const navMap = {
    'dashboard': 'dashboard',
    'add-patient': 'all-patients', 'all-patients': 'all-patients',
    'create-prescription': 'all-prescriptions', 'all-prescriptions': 'all-prescriptions',
    'yearly-prescriptions': 'all-prescriptions',
    'add-medicine': 'all-medicines', 'all-medicines': 'all-medicines',
  };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === (navMap[pageId] || pageId));
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.pushState({ page: pageId }, '', '#' + pageId);

  if (pageId === 'yearly-prescriptions') renderYearlyStats();
  if (pageId === 'create-prescription')  refreshDropdowns();
}

document.addEventListener('click', function (e) {
  const t = e.target.closest('[data-page]');
  if (!t) return;
  if (t.tagName === 'A' || t.tagName === 'BUTTON') {
    e.preventDefault();
    showPage(t.dataset.page);
  }
});

window.addEventListener('popstate', e => { if (e.state?.page) showPage(e.state.page); });

/* ════════════════════════════════════════════════════════════
   3.  DATA STORE
   ════════════════════════════════════════════════════════════ */

const STORE_KEYS = {
  'all-patients':         'phc_all_patients',
  'all-prescriptions':    'phc_all_prescriptions',
  'yearly-prescriptions': 'phc_yearly_prescriptions',
  'all-medicines':        'phc_all_medicines',
};

function loadStore(t)       { try { return JSON.parse(localStorage.getItem(STORE_KEYS[t]) || '[]'); } catch { return []; } }
function saveStore(t, data) { localStorage.setItem(STORE_KEYS[t], JSON.stringify(data)); }

/* ════════════════════════════════════════════════════════════
   4.  COLUMN DEFINITIONS
   ════════════════════════════════════════════════════════════ */

const COLUMNS = {
  'all-patients': [
    { key: 'name',       label: 'Patient Name' },
    { key: 'age',        label: 'Age' },
    { key: 'gender',     label: 'Gender' },
    { key: 'phone',      label: 'Phone' },
    { key: 'address',    label: 'Address' },
    { key: 'conditions', label: 'Past Medical Conditions' },
  ],
  'all-prescriptions': [
    { key: 'patient',    label: 'Patient Name' },
    { key: 'age',        label: 'Age' },
    { key: 'gender',     label: 'Gender' },
    { key: 'conditions', label: 'Past Medical Conditions' },
    { key: 'symptoms',   label: 'Current Symptoms' },
    { key: 'bp',         label: 'Blood Pressure' },
    { key: 'sugar',      label: 'Sugar' },
    { key: 'weight',     label: 'Weight (Kg)' },
    { key: 'medicines',  label: 'Medicine Log' },
    { key: 'duration',   label: 'Course Duration (Days)' },
    { key: 'fees',       label: 'Fees', prefix: '₹' },
  ],
  'yearly-prescriptions': [
    { key: 'patient',  label: 'Patient Name' },
    { key: 'date',     label: 'Date' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'medicines',label: 'Medicines' },
    { key: 'fees',     label: 'Fees', prefix: '₹' },
    { key: 'nextAppt', label: 'Next Appt.' },
  ],
  'all-medicines': [
    { key: 'name',         label: 'Medicine Name' },
    { key: 'instructions', label: 'Special Instructions' },
  ],
};

/* ════════════════════════════════════════════════════════════
   5.  TABLE RENDERERS
   ════════════════════════════════════════════════════════════ */

function renderTable(target) {
  const tbody = document.getElementById(target + '-tbody');
  if (!tbody) return;
  const rows = loadStore(target);
  const cols = COLUMNS[target] || [];
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols.length + 2}">No data — add manually or import from Excel</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((row, i) => {
    const cells = cols.map(c => {
      let v = row[c.key] ?? '—';
      if (c.prefix && v !== '—') v = c.prefix + ' ' + Number(v).toLocaleString('en-IN');
      // Truncate long text in cells
      const display = String(v).length > 60 ? String(v).slice(0, 60) + '…' : String(v);
      return `<td title="${String(v).replace(/"/g, '&quot;')}">${display}</td>`;
    }).join('');
    return `<tr><td>${i + 1}</td>${cells}<td>
      <button class="icon-btn" title="Delete" onclick="deleteRow('${target}',${i})">🗑️</button>
    </td></tr>`;
  }).join('');
}

function deleteRow(target, index) {
  if (!confirm('Delete this record?')) return;
  const rows = loadStore(target);
  rows.splice(index, 1);
  saveStore(target, rows);
  renderTable(target);
  if (['all-prescriptions','yearly-prescriptions'].includes(target)) renderYearlyStats();
  if (target === 'all-patients') refreshDropdowns();
  updateDashboardStats();
}

function filterTable(tbodyId, q) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  q = q.trim().toLowerCase();
  Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    if (tr.classList.contains('empty-row')) return;
    tr.style.display = (!q || tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

/* ════════════════════════════════════════════════════════════
   6.  AGE HELPER
   ════════════════════════════════════════════════════════════ */

function calcAgeFromDOB(dobStr) {
  if (!dobStr) return '';
  const dob   = new Date(dobStr);
  const today = new Date();
  let age     = today.getFullYear() - dob.getFullYear();
  const m     = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

function calcPatientAge() {
  const dob = document.getElementById('patientDOB')?.value;
  const el  = document.getElementById('patientAgeDisplay');
  if (el) el.value = dob ? calcAgeFromDOB(dob) + ' years' : '';
}

function resetPatientForm() {
  document.getElementById('add-patient-form').reset();
  const el = document.getElementById('patientAgeDisplay');
  if (el) el.value = '';
}

/* ════════════════════════════════════════════════════════════
   7.  FORM SAVES
   ════════════════════════════════════════════════════════════ */

function savePatient(e) {
  e.preventDefault();
  const dob    = document.getElementById('patientDOB').value;
  const gender = document.querySelector('input[name="gender"]:checked');
  const record = {
    name:       document.getElementById('patientName').value.trim(),
    dob:        dob,
    age:        calcAgeFromDOB(dob),
    gender:     gender ? gender.value : '—',
    phone:      document.getElementById('patientPhone').value.trim(),
    address:    document.getElementById('patientAddress').value.trim(),
    conditions: document.getElementById('pastConditions').value.trim(),
  };
  const rows = loadStore('all-patients');
  rows.unshift(record);
  saveStore('all-patients', rows);
  renderTable('all-patients');
  refreshDropdowns();
  updateDashboardStats();
  resetPatientForm();
  showToast('Patient saved successfully!');
  showPage('all-patients');
}

function savePrescription(e) {
  e.preventDefault();
  // Collect medicine log rows
  const medRows = [];
  document.querySelectorAll('#rxMedTbody tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input[type="text"]');
    const name   = inputs[0]?.value.trim();
    if (name) {
      const parts = [name, inputs[1]?.value, inputs[2]?.value, inputs[3]?.value].filter(Boolean);
      medRows.push(parts.join(' | '));
    }
  });

  const record = {
    patient:    document.getElementById('rxPatient').value,
    age:        document.getElementById('rxAge').value,
    gender:     document.getElementById('rxGenderDisplay').value,
    phone:      document.getElementById('rxPhone').value,
    address:    document.getElementById('rxAddress').value,
    conditions: document.getElementById('rxPastConditions').value,
    date:       document.getElementById('rxDate').value,
    symptoms:   document.getElementById('rxSymptoms').value.trim(),
    bp:         document.getElementById('rxBP').value.trim(),
    sugar:      document.getElementById('rxSugar').value.trim(),
    weight:     document.getElementById('rxWeight').value,
    medicines:  medRows.join('; '),
    duration:   document.getElementById('rxDuration').value,
    nextAppt:   document.getElementById('rxNextAppt').value,
    fees:       document.getElementById('rxFees').value,
  };

  const rows = loadStore('all-prescriptions');
  rows.unshift(record);
  saveStore('all-prescriptions', rows);
  renderTable('all-prescriptions');
  renderYearlyStats();
  updateDashboardStats();
  resetRxForm();
  showToast('Prescription saved successfully!');
  showPage('all-prescriptions');
}

function saveMedicine(e) {
  e.preventDefault();
  const record = {
    name:         document.getElementById('medName').value.trim(),
    instructions: document.getElementById('medInstructions').value.trim(),
  };
  const rows = loadStore('all-medicines');
  rows.unshift(record);
  saveStore('all-medicines', rows);
  renderTable('all-medicines');
  refreshDropdowns();
  document.getElementById('add-medicine-form').reset();
  showToast('Medicine saved successfully!');
  showPage('all-medicines');
}

/* ════════════════════════════════════════════════════════════
   8.  PATIENT DROPDOWN & AUTO-FILL
   ════════════════════════════════════════════════════════════ */

function refreshDropdowns() {
  // Patient select in prescription form
  const sel = document.getElementById('rxPatient');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Select Patient —</option>' +
      loadStore('all-patients').map(p =>
        `<option value="${p.name}"${p.name === cur ? ' selected' : ''}>${p.name}</option>`
      ).join('');
  }
  // Medicine datalist in prescription form
  const dl = document.getElementById('med-datalist');
  if (dl) {
    dl.innerHTML = loadStore('all-medicines').map(m =>
      `<option value="${m.name}"></option>`
    ).join('');
  }
}

function fillPatientData() {
  const name    = document.getElementById('rxPatient').value;
  const patient = loadStore('all-patients').find(p => p.name === name);

  // Clear fields first
  ['rxAge','rxGenderDisplay','rxPhone','rxAddress','rxPastConditions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rx-history-tbody').innerHTML =
    '<tr class="empty-row"><td colspan="8">Select a patient to view treatment history</td></tr>';

  if (!patient) return;

  // Auto-fill — recalculate age from DOB each time (stays current)
  document.getElementById('rxAge').value           = calcAgeFromDOB(patient.dob) || patient.age || '';
  document.getElementById('rxGenderDisplay').value = patient.gender || '';
  document.getElementById('rxPhone').value         = patient.phone  || '';
  document.getElementById('rxAddress').value       = patient.address || '';
  document.getElementById('rxPastConditions').value = patient.conditions || '';

  // Load treatment history for this patient from prescriptions
  const history = loadStore('all-prescriptions').filter(r => r.patient === name);
  const tbody   = document.getElementById('rx-history-tbody');
  if (!history.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No previous prescriptions</td></tr>';
    return;
  }
  tbody.innerHTML = history.map(r => `
    <tr>
      <td>${r.date || '—'}</td>
      <td>${(r.symptoms || '—').slice(0,40)}</td>
      <td>${r.bp || '—'}</td>
      <td>${r.sugar || '—'}</td>
      <td>${r.weight || '—'}</td>
      <td>${(r.medicines || '—').slice(0,50)}</td>
      <td>${r.duration || '—'}</td>
      <td>${r.fees ? '₹ ' + Number(r.fees).toLocaleString('en-IN') : '—'}</td>
    </tr>`).join('');
}

function resetRxForm() {
  document.getElementById('create-rx-form').reset();
  // Reset readonly auto-fill fields
  ['rxAge','rxGenderDisplay','rxPhone','rxAddress','rxPastConditions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset medicine table to one blank row
  const tb = document.getElementById('rxMedTbody');
  if (tb) tb.innerHTML = `<tr>
    <td><input type="text" placeholder="Medicine name" list="med-datalist"/></td>
    <td><input type="text" placeholder="e.g. 1 bottle"/></td>
    <td><input type="text" placeholder="e.g. 5 drops"/></td>
    <td><input type="text" placeholder="e.g. Twice daily"/></td>
    <td><button type="button" class="icon-btn remove-row">✕</button></td>
  </tr>`;
  document.getElementById('rx-history-tbody').innerHTML =
    '<tr class="empty-row"><td colspan="8">Select a patient to view treatment history</td></tr>';
  // Set today's date
  const rxDate = document.getElementById('rxDate');
  if (rxDate) rxDate.valueAsDate = new Date();
}

/* ════════════════════════════════════════════════════════════
   9.  MEDICINE ROW HELPERS
   ════════════════════════════════════════════════════════════ */

function addMedRow() {
  const tbody = document.getElementById('rxMedTbody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" placeholder="Medicine name" list="med-datalist"/></td>
    <td><input type="text" placeholder="e.g. 1 bottle"/></td>
    <td><input type="text" placeholder="e.g. 5 drops"/></td>
    <td><input type="text" placeholder="e.g. Twice daily"/></td>
    <td><button type="button" class="icon-btn remove-row">✕</button></td>`;
  tbody.appendChild(row);
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('remove-row')) e.target.closest('tr')?.remove();
});

/* ════════════════════════════════════════════════════════════
   10. DASHBOARD STATS & SEARCH
   ════════════════════════════════════════════════════════════ */

function updateDashboardStats() {
  const allRx   = loadStore('all-prescriptions');
  const today   = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);
  const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayRx = allRx.filter(r => r.date === todayStr);
  const weekRx  = allRx.filter(r => r.date && new Date(r.date) >= weekAgo);
  const monthRx = allRx.filter(r => r.date && new Date(r.date) >= monthStart);

  const sum = arr => arr.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
  const fmt = n => '₹ ' + (n ? n.toLocaleString('en-IN') : '0');
  const pCount = arr => new Set(arr.map(r => r.patient)).size;

  const el = id => document.getElementById(id);
  if (el('dash-today-patients'))  el('dash-today-patients').textContent  = todayRx.length;
  if (el('dash-today-fees'))      el('dash-today-fees').textContent      = fmt(sum(todayRx));
  if (el('dash-week-patients'))   el('dash-week-patients').textContent   = pCount(weekRx);
  if (el('dash-week-fees'))       el('dash-week-fees').textContent       = fmt(sum(weekRx));
  if (el('dash-month-patients'))  el('dash-month-patients').textContent  = pCount(monthRx);
  if (el('dash-month-fees'))      el('dash-month-fees').textContent      = fmt(sum(monthRx));
}

function dashSearch(type, q) {
  q = (q || '').trim().toLowerCase();
  const panel    = document.getElementById('dash-search-results');
  const labelEl  = document.getElementById('dash-search-results-label');
  const thead    = document.getElementById('dash-results-head');
  const tbody    = document.getElementById('dash-results-body');

  if (!q) { panel.hidden = true; return; }

  if (type === 'patient') {
    const rows = loadStore('all-patients').filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
    labelEl.innerHTML = `Patient search: <strong>"${q}"</strong> — ${rows.length} result(s)`;
    thead.innerHTML = '<tr><th>#</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Past Conditions</th></tr>';
    tbody.innerHTML = rows.length
      ? rows.map((r,i) => `<tr>
          <td>${i+1}</td><td>${r.name||'—'}</td><td>${r.age||'—'}</td>
          <td>${r.gender||'—'}</td><td>${r.phone||'—'}</td>
          <td>${(r.address||'—').slice(0,40)}</td><td>${(r.conditions||'—').slice(0,50)}</td>
        </tr>`).join('')
      : '<tr class="empty-row"><td colspan="7">No patients found</td></tr>';
  } else {
    const rows = loadStore('all-prescriptions').filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
    labelEl.innerHTML = `Prescription search: <strong>"${q}"</strong> — ${rows.length} result(s)`;
    thead.innerHTML = '<tr><th>#</th><th>Patient</th><th>Date</th><th>Symptoms</th><th>Medicines</th><th>Fees</th></tr>';
    tbody.innerHTML = rows.length
      ? rows.map((r,i) => `<tr>
          <td>${i+1}</td><td>${r.patient||'—'}</td><td>${r.date||'—'}</td>
          <td>${(r.symptoms||'—').slice(0,40)}</td>
          <td>${(r.medicines||'—').slice(0,50)}</td>
          <td>${r.fees ? '₹ '+Number(r.fees).toLocaleString('en-IN') : '—'}</td>
        </tr>`).join('')
      : '<tr class="empty-row"><td colspan="6">No prescriptions found</td></tr>';
  }
  panel.hidden = false;
}

function closeDashSearch() {
  document.getElementById('dash-search-results').hidden = true;
  document.getElementById('dash-patient-search').value  = '';
  document.getElementById('dash-rx-search').value       = '';
}

/* ════════════════════════════════════════════════════════════
   11. YEARLY STATS
   ════════════════════════════════════════════════════════════ */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderYearlyStats() {
  const sel  = document.getElementById('yearly-year-select');
  const year = sel ? parseInt(sel.value) : new Date().getFullYear();
  const allRx = [...loadStore('all-prescriptions'), ...loadStore('yearly-prescriptions')];
  const yearRx = allRx.filter(r => { const d = new Date(r.date); return !isNaN(d) && d.getFullYear() === year; });

  const monthly = MONTHS.map((m, idx) => {
    const mRx = yearRx.filter(r => new Date(r.date).getMonth() === idx);
    return { month: m, patients: new Set(mRx.map(r => r.patient)).size, prescriptions: mRx.length,
             revenue: mRx.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0) };
  });

  const tbody = document.getElementById('yearly-prescriptions-tbody');
  if (tbody) {
    tbody.innerHTML = !yearRx.length
      ? `<tr class="empty-row"><td colspan="4">No data for ${year}</td></tr>`
      : monthly.map(m => `<tr>
          <td>${m.month}</td><td>${m.patients||'—'}</td><td>${m.prescriptions||'—'}</td>
          <td>${m.revenue ? '₹ '+m.revenue.toLocaleString('en-IN') : '—'}</td>
        </tr>`).join('');
  }

  const totalRev = yearRx.reduce((s,r) => s+(parseFloat(r.fees)||0), 0);
  const el = id => document.getElementById(id);
  if (el('yearly-total-rx'))       el('yearly-total-rx').textContent       = yearRx.length || '—';
  if (el('yearly-total-patients')) el('yearly-total-patients').textContent = new Set(yearRx.map(r=>r.patient)).size || '—';
  if (el('yearly-total-revenue'))  el('yearly-total-revenue').textContent  = totalRev ? '₹ '+totalRev.toLocaleString('en-IN') : '—';
}

/* ════════════════════════════════════════════════════════════
   12. EXCEL IMPORT
   ════════════════════════════════════════════════════════════ */

let importTarget = null, importWorkbook = null, importRows = [], importHeaders = [];

const TARGET_LABELS = {
  'all-patients':         'All Patients',
  'all-prescriptions':    'All Prescriptions',
  'yearly-prescriptions': 'Yearly Prescriptions',
  'all-medicines':        'All Medicines',
};

const FIELD_HINTS = {
  name:        ['name','patient','पेशेंट','नाम'],
  dob:         ['dob','birth','born','date of birth'],
  age:         ['age','उम्र','आयु'],
  gender:      ['gender','sex','लिंग'],
  phone:       ['phone','mobile','contact','mob','फोन'],
  address:     ['address','city','location'],
  conditions:  ['condition','history','past','medical'],
  fees:        ['fee','amount','charge','शुल्क'],
  patient:     ['patient','name'],
  date:        ['date','prescription','consult'],
  symptoms:    ['symptom','complaint','लक्षण'],
  medicines:   ['medicine','drug','rx','दवा'],
  bp:          ['bp','blood pressure','pressure'],
  sugar:       ['sugar','glucose','diabetes'],
  weight:      ['weight','wt','kg'],
  duration:    ['duration','days','course'],
  nextAppt:    ['next','appointment','follow'],
  instructions:['instruction','note','direction','निर्देश'],
};

function guessMapping(field, headers) {
  const hints = FIELD_HINTS[field] || [];
  return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint.toLowerCase()))) || '';
}

function openImport(target) {
  importTarget = target; importWorkbook = null; importRows = []; importHeaders = [];
  document.getElementById('import-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  showImportStep(1);
  document.getElementById('import-target-label').textContent = 'Importing into: ' + (TARGET_LABELS[target] || target);
  const fi = document.getElementById('excel-file-input'); if (fi) fi.value = '';
  document.getElementById('file-info').hidden = true;
  document.getElementById('drop-zone').hidden = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
}

function closeImport() {
  document.getElementById('import-modal').hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('click', e => { if (e.target.id === 'import-modal') closeImport(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('import-modal').hidden) closeImport(); });

function showImportStep(s) {
  [1,2,3].forEach(n => document.getElementById('import-step-'+n).hidden = s !== n);
  const back = document.getElementById('import-back-btn');
  const next = document.getElementById('import-next-btn');
  back.hidden = s === 1 || s === 3; next.hidden = s === 3;
  if (s === 1) { next.textContent = 'Next →'; next.disabled = !importWorkbook; }
  if (s === 2) { next.textContent = 'Import ✓'; next.disabled = false; }
}

function importNext() {
  if (!document.getElementById('import-step-1').hidden) { buildColumnMapper(); showImportStep(2); }
  else if (!document.getElementById('import-step-2').hidden) { doImport(); }
}
function importBack() { showImportStep(1); }

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('drop-zone').classList.remove('drop-zone--active');
  if (event.dataTransfer.files[0]) processFile(event.dataTransfer.files[0]);
}
function handleFileSelect(input) { if (input.files[0]) processFile(input.files[0]); }
function clearFile() {
  importWorkbook = null; importRows = []; importHeaders = [];
  document.getElementById('file-info').hidden = true;
  document.getElementById('drop-zone').hidden = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
  const fi = document.getElementById('excel-file-input'); if (fi) fi.value = '';
}

function processFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) { showImportError('Only .xlsx and .xls files supported.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      importWorkbook = XLSX.read(e.target.result, { type:'binary', cellDates:true });
      populateSheetSelector(); onSheetChange();
      document.getElementById('drop-zone').hidden = true;
      document.getElementById('file-info').hidden = false;
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-size').textContent = formatBytes(file.size);
      document.getElementById('import-next-btn').disabled = false;
    } catch(err) { showImportError('Could not read file: ' + err.message); }
  };
  reader.readAsBinaryString(file);
}

function formatBytes(b) { return b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }
function showImportError(msg) {
  document.getElementById('drop-zone').innerHTML =
    `<div class="drop-zone__icon">⚠️</div><p class="drop-zone__text" style="color:var(--danger)">${msg}</p>
     <button class="btn btn-ghost" style="margin-top:.75rem" onclick="clearFile()">Try Again</button>`;
}
function populateSheetSelector() {
  const sel = document.getElementById('sheet-selector');
  const wrap = document.getElementById('sheet-selector-wrap');
  sel.innerHTML = importWorkbook.SheetNames.map(n => `<option value="${n}">${n}</option>`).join('');
  wrap.hidden = importWorkbook.SheetNames.length <= 1;
}
function onSheetChange() {
  if (!importWorkbook) return;
  const name = document.getElementById('sheet-selector').value || importWorkbook.SheetNames[0];
  const raw  = XLSX.utils.sheet_to_json(importWorkbook.Sheets[name], { header:1, defval:'' });
  if (!raw.length) { importRows = []; importHeaders = []; return; }
  importHeaders = raw[0].map(h => String(h).trim());
  importRows    = raw.slice(1).filter(r => r.some(c => c !== ''));
}
function buildColumnMapper() {
  const cols = COLUMNS[importTarget] || [];
  document.getElementById('column-mapper').innerHTML = cols.map(col => {
    const guess = guessMapping(col.key, importHeaders);
    const opts  = ['— Skip —', ...importHeaders]
      .map(h => `<option value="${h}"${h===guess?' selected':''}>${h||'— Skip —'}</option>`).join('');
    return `<div class="mapper-row">
      <span class="mapper-field">${col.label}</span>
      <span class="mapper-arrow">→</span>
      <select class="mapper-select" data-field="${col.key}" onchange="renderPreview()">${opts}</select>
      ${guess ? '<span class="mapper-matched">auto</span>' : '<span class="mapper-unmatched">—</span>'}
    </div>`;
  }).join('');
  renderPreview();
}
function getMappings() {
  const map = {};
  document.querySelectorAll('.mapper-select').forEach(s => { if (s.value && s.value !== '— Skip —') map[s.dataset.field] = s.value; });
  return map;
}
function renderPreview() {
  const mapping = getMappings(); const cols = COLUMNS[importTarget]||[];
  const skip = document.getElementById('skip-header-chk')?.checked;
  const rows = skip ? importRows : [importHeaders, ...importRows];
  const mapped = cols.filter(c => mapping[c.key]);
  document.getElementById('preview-thead').innerHTML = mapped.map(c => `<th>${c.label}</th>`).join('');
  document.getElementById('preview-count').textContent = `(${rows.length} rows)`;
  const tbody = document.getElementById('preview-tbody');
  tbody.innerHTML = rows.slice(0,5).map(row =>
    `<tr>${mapped.map(c => { const idx = importHeaders.indexOf(mapping[c.key]); return `<td>${String(idx>=0?(row[idx]??''):'').slice(0,60)}</td>`; }).join('')}</tr>`
  ).join('') || `<tr class="empty-row"><td colspan="${mapped.length||1}">No data</td></tr>`;
}
function doImport() {
  const mapping = getMappings(); const cols = COLUMNS[importTarget]||[];
  const dupAction = document.getElementById('duplicate-action').value;
  const skip = document.getElementById('skip-header-chk')?.checked;
  const source = skip ? importRows : [importHeaders, ...importRows];
  const newRecords = source.map(row => {
    const obj = {};
    cols.forEach(c => {
      if (!mapping[c.key]) return;
      const idx = importHeaders.indexOf(mapping[c.key]);
      let v = idx>=0 ? row[idx] : '';
      if (v instanceof Date) v = v.toLocaleDateString('en-IN');
      obj[c.key] = String(v??'').slice(0,200);
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));

  const existing = loadStore(importTarget); const nameKey = cols[0]?.key; const dateKey = cols[1]?.key;
  let added=0, skipped=0, overwritten=0, finalData;
  if (dupAction === 'append') { finalData = [...existing,...newRecords]; added = newRecords.length; }
  else {
    finalData = [...existing];
    newRecords.forEach(nr => {
      const idx = finalData.findIndex(er => nameKey&&er[nameKey]&&nr[nameKey]&&er[nameKey].toLowerCase()===nr[nameKey].toLowerCase()&&(!dateKey||er[dateKey]===nr[dateKey]));
      if (idx>=0) { if (dupAction==='overwrite') { finalData[idx]=nr; overwritten++; } else skipped++; }
      else { finalData.push(nr); added++; }
    });
  }
  saveStore(importTarget, finalData);
  renderTable(importTarget);
  if (['all-prescriptions','yearly-prescriptions'].includes(importTarget)) renderYearlyStats();
  if (importTarget === 'all-patients') refreshDropdowns();
  updateDashboardStats();
  document.getElementById('import-result').innerHTML = `
    <div class="import-success-icon">✅</div>
    <h3>Imported into <em>${TARGET_LABELS[importTarget]}</em></h3>
    <div class="import-stats">
      <div class="import-stat"><span class="import-stat-val">${added}</span><span>Added</span></div>
      <div class="import-stat"><span class="import-stat-val">${skipped}</span><span>Skipped</span></div>
      <div class="import-stat"><span class="import-stat-val">${overwritten}</span><span>Overwritten</span></div>
      <div class="import-stat"><span class="import-stat-val">${finalData.length}</span><span>Total</span></div>
    </div>
    <button class="btn btn-primary" style="margin-top:1.25rem" onclick="closeImport()">Done</button>`;
  showImportStep(3);
}
function downloadTemplate() {
  if (!importTarget) return;
  const cols = COLUMNS[importTarget]||[];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cols.map(c=>c.label)]), TARGET_LABELS[importTarget]||'Sheet1');
  XLSX.writeFile(wb, `template_${importTarget}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   13. TOAST
   ════════════════════════════════════════════════════════════ */

function showToast(msg, type='success') {
  let t = document.getElementById('app-toast');
  if (!t) { t = document.createElement('div'); t.id = 'app-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `app-toast app-toast--${type} app-toast--show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('app-toast--show'), 3000);
}

/* ════════════════════════════════════════════════════════════
   14. INIT
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('phc_auth') === '1') {
    showApp();
  }
  const rxDate = document.getElementById('rxDate');
  if (rxDate) rxDate.valueAsDate = new Date();
});
