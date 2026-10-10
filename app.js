/* ─────────────────────────────────────────────────────────────
   Patidar Homoeopathic Clinic & Pharmacy – App Logic  v3
   ───────────────────────────────────────────────────────────── */
'use strict';

/* ════════════════════════════════════════════════════════════
   1.  AUTH  –  Login / Logout
   ════════════════════════════════════════════════════════════ */

const CREDS = {
  email:    'dr.ncpatidar@gmail.com',
  password: 'PATIDARHOMEO',
};

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pwd   = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');

  if (email === CREDS.email.toLowerCase() && pwd === CREDS.password) {
    err.hidden = true;
    sessionStorage.setItem('phc_auth', '1');
    showApp();
  } else {
    err.hidden = false;
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  }
}

function handleLogout() {
  sessionStorage.removeItem('phc_auth');
  document.getElementById('app').hidden = true;
  document.getElementById('login-page').hidden = false;
  document.body.classList.add('logged-out');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').hidden = true;
}

function showApp() {
  document.getElementById('login-page').hidden = true;
  document.getElementById('app').hidden = false;
  document.body.classList.remove('logged-out');
  // Render tables from stored data
  Object.keys(STORE_KEYS).forEach(t => { if (loadStore(t).length) renderTable(t); });
  updateDashboardStats();
  refreshPatientDatalist();
  const hash = window.location.hash.replace('#', '');
  const validPages = Object.keys(PAGE_TO_NAV);
  showPage(validPages.includes(hash) ? hash : 'dashboard');
}

function togglePwd() {
  const inp = document.getElementById('login-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ════════════════════════════════════════════════════════════
   2.  PAGE NAVIGATION
   ════════════════════════════════════════════════════════════ */

const PAGE_TO_NAV = {
  'add-patient':          'patients',
  'all-patients':         'all-patients',
  'revisit-patients':     'patients',
  'one-time-patients':    'patients',
  'create-prescription':  'prescriptions',
  'all-prescriptions':    'all-prescriptions',
  'yearly-prescriptions': 'prescriptions',
  'appointments':         'prescriptions',
  'add-medicine':         'medicines',
  'all-medicines':        'medicines',
  'dashboard':            'dashboard',
};

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  } else {
    document.getElementById('dashboard').classList.add('active');
    pageId = 'dashboard';
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    const bp = btn.dataset.page;
    if (bp === pageId || bp === PAGE_TO_NAV[pageId]) btn.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.pushState({ page: pageId }, '', '#' + pageId);

  if (pageId === 'yearly-prescriptions') renderYearlyStats();
  if (pageId === 'create-prescription')  refreshPatientDatalist();
}

document.addEventListener('click', function (e) {
  const trigger = e.target.closest('[data-page]');
  if (!trigger) return;
  const isNavBtn   = trigger.classList.contains('nav-btn');
  const isDropdown = trigger.tagName === 'A';
  const isBtn      = trigger.tagName === 'BUTTON' && !isNavBtn;

  if (isDropdown || isBtn) {
    e.preventDefault();
    showPage(trigger.dataset.page);
  } else if (isNavBtn) {
    e.preventDefault();
    const directPages = ['dashboard', 'all-patients', 'all-prescriptions'];
    if (directPages.includes(trigger.dataset.page)) showPage(trigger.dataset.page);
  }
});

window.addEventListener('popstate', e => e.state?.page && showPage(e.state.page));

/* ════════════════════════════════════════════════════════════
   3.  DATA STORE
   ════════════════════════════════════════════════════════════ */

const STORE_KEYS = {
  'all-patients':          'phc_all_patients',
  'revisit-patients':      'phc_revisit_patients',
  'one-time-patients':     'phc_one_time_patients',
  'all-prescriptions':     'phc_all_prescriptions',
  'yearly-prescriptions':  'phc_yearly_prescriptions',
  'appointments':          'phc_appointments',
  'all-medicines':         'phc_all_medicines',
};

function loadStore(target) {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS[target]) || '[]'); }
  catch { return []; }
}

function saveStore(target, data) {
  localStorage.setItem(STORE_KEYS[target], JSON.stringify(data));
}

/* ════════════════════════════════════════════════════════════
   4.  COLUMN DEFINITIONS
   ════════════════════════════════════════════════════════════ */

const COLUMNS = {
  'all-patients': [
    { key: 'name',       label: 'Name' },
    { key: 'age',        label: 'Age' },
    { key: 'gender',     label: 'Gender' },
    { key: 'phone',      label: 'Phone' },
    { key: 'address',    label: 'Address' },
    { key: 'conditions', label: 'Past Conditions' },
  ],
  'revisit-patients': [
    { key: 'name',      label: 'Name' },
    { key: 'age',       label: 'Age' },
    { key: 'phone',     label: 'Phone' },
    { key: 'visits',    label: 'Total Visits' },
    { key: 'lastVisit', label: 'Last Visit' },
  ],
  'one-time-patients': [
    { key: 'name',      label: 'Name' },
    { key: 'age',       label: 'Age' },
    { key: 'phone',     label: 'Phone' },
    { key: 'visitDate', label: 'Visit Date' },
    { key: 'fees',      label: 'Fees', prefix: '₹' },
  ],
  'all-prescriptions': [
    { key: 'patient',  label: 'Patient' },
    { key: 'date',     label: 'Date' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'medicines',label: 'Medicines' },
    { key: 'fees',     label: 'Fees', prefix: '₹' },
    { key: 'nextAppt', label: 'Next Appt.' },
  ],
  'yearly-prescriptions': [
    { key: 'patient',  label: 'Patient' },
    { key: 'date',     label: 'Date' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'medicines',label: 'Medicines' },
    { key: 'fees',     label: 'Fees', prefix: '₹' },
    { key: 'nextAppt', label: 'Next Appt.' },
  ],
  'appointments': [
    { key: 'patient',   label: 'Patient' },
    { key: 'age',       label: 'Age' },
    { key: 'phone',     label: 'Phone' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate',   label: 'End Date' },
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
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols.length + 2}">No data — import from Excel or add manually</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const cells = cols.map(c => {
      let val = row[c.key] ?? '—';
      if (c.prefix && val !== '—') val = c.prefix + ' ' + Number(val).toLocaleString('en-IN');
      return `<td>${val}</td>`;
    }).join('');
    return `<tr>
      <td>${i + 1}</td>${cells}
      <td>
        <button class="icon-btn" title="Delete" onclick="deleteRow('${target}',${i})">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function deleteRow(target, index) {
  if (!confirm('Delete this record?')) return;
  const rows = loadStore(target);
  rows.splice(index, 1);
  saveStore(target, rows);
  renderTable(target);
  if (target === 'all-prescriptions' || target === 'yearly-prescriptions') renderYearlyStats();
  if (target === 'all-patients') refreshPatientDatalist();
  updateDashboardStats();
}

function filterTable(tbodyId, query) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const q = query.trim().toLowerCase();
  Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    if (tr.classList.contains('empty-row')) return;
    tr.style.display = (!q || tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

/* ════════════════════════════════════════════════════════════
   6.  FORM SAVES
   ════════════════════════════════════════════════════════════ */

function savePatient(e) {
  e.preventDefault();
  const gender = document.querySelector('input[name="gender"]:checked');
  const record = {
    name:       document.getElementById('patientName').value.trim(),
    age:        document.getElementById('patientAge').value,
    gender:     gender ? gender.value : '—',
    phone:      document.getElementById('patientPhone').value.trim(),
    address:    document.getElementById('patientAddress').value.trim(),
    conditions: document.getElementById('pastConditions').value.trim(),
  };
  const rows = loadStore('all-patients');
  rows.unshift(record);
  saveStore('all-patients', rows);
  renderTable('all-patients');
  refreshPatientDatalist();
  updateDashboardStats();
  document.getElementById('add-patient-form').reset();
  showToast('Patient saved successfully!');
  showPage('all-patients');
}

function savePrescription(e) {
  e.preventDefault();

  // Collect medicine rows
  const medRows = [];
  document.querySelectorAll('#rxMedTable tbody tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input[type="text"]');
    if (inputs[0]?.value.trim()) {
      medRows.push([inputs[0].value, inputs[1]?.value, inputs[2]?.value, inputs[3]?.value]
        .filter(Boolean).join(' | '));
    }
  });

  const rxGender = document.querySelector('input[name="rxGender"]:checked');
  const record = {
    patient:    document.getElementById('rxPatient').value.trim(),
    age:        document.getElementById('rxAge').value,
    gender:     rxGender ? rxGender.value : '—',
    phone:      document.getElementById('rxPhone').value.trim(),
    address:    document.getElementById('rxAddress').value.trim(),
    conditions: document.getElementById('rxPastConditions').value.trim(),
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
  document.getElementById('create-rx-form').reset();
  // Reset medicine table to one blank row
  const tb = document.querySelector('#rxMedTable tbody');
  if (tb) tb.innerHTML = `<tr>
    <td><input type="text" placeholder="Medicine name"/></td>
    <td><input type="text" placeholder="e.g. 1 bottle"/></td>
    <td><input type="text" placeholder="e.g. 5 drops"/></td>
    <td><input type="text" placeholder="e.g. Twice daily"/></td>
    <td><button type="button" class="icon-btn remove-row">✕</button></td>
  </tr>`;
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
  document.getElementById('add-medicine-form').reset();
  showToast('Medicine saved successfully!');
  showPage('all-medicines');
}

/* ════════════════════════════════════════════════════════════
   7.  PATIENT DATALIST for prescription autocomplete
   ════════════════════════════════════════════════════════════ */

function refreshPatientDatalist() {
  const dl = document.getElementById('patient-datalist');
  if (!dl) return;
  const patients = loadStore('all-patients');
  dl.innerHTML = patients.map(p => `<option value="${p.name}"></option>`).join('');
}

// Auto-fill rx fields when patient name is chosen
document.addEventListener('input', function (e) {
  if (e.target.id !== 'rxPatient') return;
  const name = e.target.value.trim().toLowerCase();
  const match = loadStore('all-patients').find(p => p.name.toLowerCase() === name);
  if (match) {
    document.getElementById('rxAge').value         = match.age || '';
    document.getElementById('rxPhone').value       = match.phone || '';
    document.getElementById('rxAddress').value     = match.address || '';
    document.getElementById('rxPastConditions').value = match.conditions || '';
    const genderEl = document.querySelector(`input[name="rxGender"][value="${match.gender}"]`);
    if (genderEl) genderEl.checked = true;
  }
});

/* ════════════════════════════════════════════════════════════
   8.  DASHBOARD STATS
   ════════════════════════════════════════════════════════════ */

function updateDashboardStats() {
  const allRx   = loadStore('all-prescriptions');
  const today   = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);

  const todayRx  = allRx.filter(r => r.date === todayStr);
  const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(1);

  const weekRx  = allRx.filter(r => r.date && new Date(r.date) >= weekAgo);
  const monthRx = allRx.filter(r => r.date && new Date(r.date) >= monthAgo);

  const sum = arr => arr.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
  const fmt = n => n ? '₹ ' + n.toLocaleString('en-IN') : '₹ 0';

  const el = id => document.getElementById(id);
  if (el('dash-today-patients')) el('dash-today-patients').textContent = todayRx.length;
  if (el('dash-today-fees'))     el('dash-today-fees').textContent     = fmt(sum(todayRx));
  if (el('dash-week-patients'))  el('dash-week-patients').textContent  = weekRx.length || '—';
  if (el('dash-week-fees'))      el('dash-week-fees').textContent      = weekRx.length ? fmt(sum(weekRx)) : '—';
  if (el('dash-month-patients')) el('dash-month-patients').textContent = monthRx.length || '—';
  if (el('dash-month-fees'))     el('dash-month-fees').textContent     = monthRx.length ? fmt(sum(monthRx)) : '—';
}

/* ════════════════════════════════════════════════════════════
   9.  YEARLY STATS
   ════════════════════════════════════════════════════════════ */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderYearlyStats() {
  const yearSel = document.getElementById('yearly-year-select');
  const year    = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
  const allRx   = [...loadStore('all-prescriptions'), ...loadStore('yearly-prescriptions')];
  const yearRx  = allRx.filter(r => { const d = new Date(r.date); return !isNaN(d) && d.getFullYear() === year; });

  const monthly = Array.from({ length: 12 }, (_, m) => {
    const mRx     = yearRx.filter(r => new Date(r.date).getMonth() === m);
    const patients = new Set(mRx.map(r => r.patient)).size;
    const revenue  = mRx.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
    return { month: MONTHS[m], patients, prescriptions: mRx.length, revenue };
  });

  const tbody = document.getElementById('yearly-prescriptions-tbody');
  if (tbody) {
    tbody.innerHTML = !yearRx.length
      ? `<tr class="empty-row"><td colspan="4">No data for ${year}</td></tr>`
      : monthly.map(m => `<tr>
          <td>${m.month}</td>
          <td>${m.patients || '—'}</td>
          <td>${m.prescriptions || '—'}</td>
          <td>${m.revenue ? '₹ ' + m.revenue.toLocaleString('en-IN') : '—'}</td>
        </tr>`).join('');
  }

  const totalRev      = yearRx.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
  const totalPatients = new Set(yearRx.map(r => r.patient)).size;
  const el = id => document.getElementById(id);
  if (el('yearly-total-rx'))       el('yearly-total-rx').textContent       = yearRx.length || '—';
  if (el('yearly-total-patients')) el('yearly-total-patients').textContent = totalPatients || '—';
  if (el('yearly-total-revenue'))  el('yearly-total-revenue').textContent  =
    totalRev ? '₹ ' + totalRev.toLocaleString('en-IN') : '—';
}

/* ════════════════════════════════════════════════════════════
   10. EXCEL IMPORT
   ════════════════════════════════════════════════════════════ */

let importTarget = null, importWorkbook = null, importRows = [], importHeaders = [];

const TARGET_LABELS = {
  'all-patients':         'All Patients',
  'revisit-patients':     'Revisit Patients',
  'one-time-patients':    'One Time Patients',
  'all-prescriptions':    'All Prescriptions',
  'yearly-prescriptions': 'Yearly Prescriptions',
  'appointments':         'Appointments',
  'all-medicines':        'All Medicines',
};

const FIELD_HINTS = {
  name:         ['name','patient','पेशेंट','नाम'],
  age:          ['age','उम्र','आयु'],
  gender:       ['gender','sex','लिंग'],
  phone:        ['phone','mobile','contact','mob','फोन'],
  address:      ['address','city','location'],
  conditions:   ['condition','history','past','medical'],
  fees:         ['fee','amount','charge','शुल्क'],
  visits:       ['visit','count','times'],
  lastVisit:    ['last visit','last date','recent'],
  visitDate:    ['visit date','date','तारीख'],
  patient:      ['patient','name'],
  date:         ['date','prescription date','consult'],
  symptoms:     ['symptom','complaint','problem','लक्षण'],
  medicines:    ['medicine','drug','rx','दवा'],
  nextAppt:     ['next','appointment','follow'],
  startDate:    ['start','from'],
  endDate:      ['end','to','till'],
  instructions: ['instruction','note','direction','निर्देश'],
};

function guessMapping(appField, headers) {
  const hints = FIELD_HINTS[appField] || [];
  return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint.toLowerCase()))) || '';
}

function openImport(target) {
  importTarget = target; importWorkbook = null; importRows = []; importHeaders = [];
  document.getElementById('import-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  showImportStep(1);
  document.getElementById('import-target-label').textContent = 'Importing into: ' + (TARGET_LABELS[target] || target);
  const fi = document.getElementById('excel-file-input'); if (fi) fi.value = '';
  document.getElementById('file-info').hidden           = true;
  document.getElementById('drop-zone').hidden           = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
}

function closeImport() {
  document.getElementById('import-modal').hidden = true;
  document.body.style.overflow = '';
  importTarget = importWorkbook = null; importRows = importHeaders = [];
}

document.addEventListener('click', e => { if (e.target.id === 'import-modal') closeImport(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('import-modal').hidden) closeImport(); });

function showImportStep(step) {
  document.getElementById('import-step-1').hidden = step !== 1;
  document.getElementById('import-step-2').hidden = step !== 2;
  document.getElementById('import-step-3').hidden = step !== 3;
  const back = document.getElementById('import-back-btn');
  const next = document.getElementById('import-next-btn');
  back.hidden = step === 1 || step === 3;
  next.hidden = step === 3;
  if (step === 1) { next.textContent = 'Next →'; next.disabled = !importWorkbook; }
  else if (step === 2) { next.textContent = 'Import ✓'; next.disabled = false; }
}

function importNext() {
  if (!document.getElementById('import-step-1').hidden) { buildColumnMapper(); showImportStep(2); }
  else if (!document.getElementById('import-step-2').hidden) { doImport(); }
}
function importBack() { showImportStep(1); }

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('drop-zone').classList.remove('drop-zone--active');
  const file = event.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(input) { if (input.files[0]) processFile(input.files[0]); }

function clearFile() {
  importWorkbook = null; importRows = []; importHeaders = [];
  document.getElementById('file-info').hidden           = true;
  document.getElementById('drop-zone').hidden           = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
  const fi = document.getElementById('excel-file-input'); if (fi) fi.value = '';
}

function processFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    showImportError('Only .xlsx and .xls files are supported.'); return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      importWorkbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
      populateSheetSelector(); onSheetChange();
      document.getElementById('drop-zone').hidden = true;
      document.getElementById('file-info').hidden = false;
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-size').textContent = formatBytes(file.size);
      document.getElementById('import-next-btn').disabled = false;
    } catch (err) { showImportError('Could not read the file: ' + err.message); }
  };
  reader.readAsBinaryString(file);
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function showImportError(msg) {
  const dz = document.getElementById('drop-zone');
  dz.innerHTML = `<div class="drop-zone__icon">⚠️</div>
    <p class="drop-zone__text" style="color:var(--danger)">${msg}</p>
    <button class="btn btn-ghost" style="margin-top:.75rem" onclick="clearFile()">Try Again</button>`;
}

function populateSheetSelector() {
  if (!importWorkbook) return;
  const sel  = document.getElementById('sheet-selector');
  const wrap = document.getElementById('sheet-selector-wrap');
  sel.innerHTML = importWorkbook.SheetNames.map(n => `<option value="${n}">${n}</option>`).join('');
  wrap.hidden = importWorkbook.SheetNames.length <= 1;
}

function onSheetChange() {
  if (!importWorkbook) return;
  const name = document.getElementById('sheet-selector').value || importWorkbook.SheetNames[0];
  const raw  = XLSX.utils.sheet_to_json(importWorkbook.Sheets[name], { header: 1, defval: '' });
  if (!raw.length) { importRows = []; importHeaders = []; return; }
  importHeaders = raw[0].map(h => String(h).trim());
  importRows    = raw.slice(1).filter(r => r.some(c => c !== ''));
}

function buildColumnMapper() {
  const cols   = COLUMNS[importTarget] || [];
  const mapper = document.getElementById('column-mapper');
  mapper.innerHTML = cols.map(col => {
    const guess   = guessMapping(col.key, importHeaders);
    const options = ['— Skip —', ...importHeaders]
      .map(h => `<option value="${h}"${h===guess?' selected':''}>${h||'— Skip —'}</option>`).join('');
    return `<div class="mapper-row">
      <span class="mapper-field">${col.label}</span>
      <span class="mapper-arrow">→</span>
      <select class="mapper-select" data-field="${col.key}" onchange="renderPreview()">${options}</select>
      ${guess ? '<span class="mapper-matched">auto-matched</span>' : '<span class="mapper-unmatched">unmatched</span>'}
    </div>`;
  }).join('');
  renderPreview();
}

function getMappings() {
  const map = {};
  document.querySelectorAll('.mapper-select').forEach(sel => {
    if (sel.value && sel.value !== '— Skip —') map[sel.dataset.field] = sel.value;
  });
  return map;
}

function renderPreview() {
  const mapping    = getMappings();
  const cols       = COLUMNS[importTarget] || [];
  const skipHeader = document.getElementById('skip-header-chk')?.checked;
  const rows       = skipHeader ? importRows : [importHeaders, ...importRows];
  const mapped     = cols.filter(c => mapping[c.key]);

  document.getElementById('preview-thead').innerHTML = mapped.map(c => `<th>${c.label}</th>`).join('');
  document.getElementById('preview-count').textContent = `(${rows.length} rows)`;

  const tbody = document.getElementById('preview-tbody');
  const preview = rows.slice(0, 5);
  tbody.innerHTML = preview.length ? preview.map(row => {
    const cells = mapped.map(c => {
      const idx = importHeaders.indexOf(mapping[c.key]);
      return `<td>${String(idx >= 0 ? (row[idx] ?? '') : '').slice(0,80)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('') : `<tr class="empty-row"><td colspan="${mapped.length||1}">No data rows found</td></tr>`;
}

function doImport() {
  const mapping    = getMappings();
  const cols       = COLUMNS[importTarget] || [];
  const dupAction  = document.getElementById('duplicate-action').value;
  const skipHeader = document.getElementById('skip-header-chk')?.checked;
  const source     = skipHeader ? importRows : [importHeaders, ...importRows];

  const newRecords = source.map(row => {
    const obj = {};
    cols.forEach(c => {
      if (!mapping[c.key]) return;
      const idx = importHeaders.indexOf(mapping[c.key]);
      let v = idx >= 0 ? row[idx] : '';
      if (v instanceof Date) v = v.toLocaleDateString('en-IN');
      obj[c.key] = String(v ?? '').slice(0, 200);
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));

  const existing = loadStore(importTarget);
  const nameKey  = cols[0]?.key;
  const dateKey  = cols[1]?.key;
  let added = 0, skipped = 0, overwritten = 0, finalData;

  if (dupAction === 'append') {
    finalData = [...existing, ...newRecords]; added = newRecords.length;
  } else {
    finalData = [...existing];
    newRecords.forEach(nr => {
      const dupIdx = finalData.findIndex(er =>
        nameKey && er[nameKey] && nr[nameKey] &&
        er[nameKey].toLowerCase() === nr[nameKey].toLowerCase() &&
        (!dateKey || er[dateKey] === nr[dateKey])
      );
      if (dupIdx >= 0) {
        if (dupAction === 'overwrite') { finalData[dupIdx] = nr; overwritten++; }
        else skipped++;
      } else { finalData.push(nr); added++; }
    });
  }

  saveStore(importTarget, finalData);
  renderTable(importTarget);
  if (['all-prescriptions','yearly-prescriptions'].includes(importTarget)) renderYearlyStats();
  if (importTarget === 'all-patients') refreshPatientDatalist();
  updateDashboardStats();

  document.getElementById('import-result').innerHTML = `
    <div class="import-success-icon">✅</div>
    <h3>Successfully imported into <em>${TARGET_LABELS[importTarget]}</em></h3>
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
  const cols = COLUMNS[importTarget] || [];
  const ws   = XLSX.utils.aoa_to_sheet([cols.map(c => c.label)]);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TARGET_LABELS[importTarget] || 'Sheet1');
  XLSX.writeFile(wb, `template_${importTarget}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   11. FORM HELPERS
   ════════════════════════════════════════════════════════════ */

function addMedRow() {
  const tbody = document.querySelector('#rxMedTable tbody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" placeholder="Medicine name"/></td>
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
   12. TOAST NOTIFICATION
   ════════════════════════════════════════════════════════════ */

function showToast(msg, type = 'success') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'app-toast app-toast--' + type + ' app-toast--show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('app-toast--show'), 3000);
}

/* ════════════════════════════════════════════════════════════
   13. CALENDAR
   ════════════════════════════════════════════════════════════ */

document.querySelectorAll('.cal-cell:not(.cal-other-month)').forEach(cell => {
  cell.addEventListener('click', function () {
    document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-selected'));
    this.classList.add('cal-selected');
  });
});

/* ════════════════════════════════════════════════════════════
   14. INIT
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-login if session still active
  if (sessionStorage.getItem('phc_auth') === '1') {
    showApp();
  }
  // Set today's date as default in rx form
  const rxDate = document.getElementById('rxDate');
  if (rxDate) rxDate.valueAsDate = new Date();
});
