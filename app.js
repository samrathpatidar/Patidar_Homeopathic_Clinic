/* ─────────────────────────────────────────────────────────────
   HomeoCare Pro – App Logic  (v2 – with Excel Import)
   ───────────────────────────────────────────────────────────── */

'use strict';

/* ════════════════════════════════════════════════════════════
   1.  PAGE NAVIGATION
   ════════════════════════════════════════════════════════════ */

const PAGE_TO_NAV = {
  'add-patient': 'patients', 'all-patients': 'patients',
  'revisit-patients': 'patients', 'one-time-patients': 'patients',
  'create-prescription': 'prescriptions', 'all-prescriptions': 'prescriptions',
  'yearly-prescriptions': 'prescriptions', 'appointments': 'prescriptions',
  'add-medicine': 'medicines', 'all-medicines': 'medicines',
  'dashboard': 'dashboard',
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
    const p = btn.dataset.page;
    const parent = PAGE_TO_NAV[pageId];
    if (p === pageId || p === parent) btn.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.pushState({ page: pageId }, '', '#' + pageId);

  // Trigger yearly stats render when landing on that page
  if (pageId === 'yearly-prescriptions') renderYearlyStats();
}

// Event delegation – nav links / buttons with data-page
document.addEventListener('click', function (e) {
  const trigger = e.target.closest('[data-page]');
  if (!trigger) return;

  const isNavBtn      = trigger.classList.contains('nav-btn');
  const isDropdown    = trigger.tagName === 'A';
  const isOtherBtn    = trigger.tagName === 'BUTTON' && !isNavBtn;

  if (isDropdown || isOtherBtn) {
    e.preventDefault();
    showPage(trigger.dataset.page);
  } else if (isNavBtn && trigger.dataset.page === 'dashboard') {
    e.preventDefault();
    showPage('dashboard');
  }
});

window.addEventListener('popstate', e => e.state?.page && showPage(e.state.page));

/* ════════════════════════════════════════════════════════════
   2.  IN-MEMORY DATA STORE  (persisted via localStorage)
   ════════════════════════════════════════════════════════════ */

const STORE_KEYS = {
  'all-patients':          'hcp_all_patients',
  'revisit-patients':      'hcp_revisit_patients',
  'one-time-patients':     'hcp_one_time_patients',
  'all-prescriptions':     'hcp_all_prescriptions',
  'yearly-prescriptions':  'hcp_yearly_prescriptions',
  'appointments':          'hcp_appointments',
  'all-medicines':         'hcp_all_medicines',
};

function loadStore(target) {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS[target]) || '[]');
  } catch { return []; }
}

function saveStore(target, data) {
  localStorage.setItem(STORE_KEYS[target], JSON.stringify(data));
}

/* ════════════════════════════════════════════════════════════
   3.  TABLE RENDERERS
   ════════════════════════════════════════════════════════════ */

// Column definitions for each page
const COLUMNS = {
  'all-patients': [
    { key: 'name',        label: 'Name' },
    { key: 'age',         label: 'Age' },
    { key: 'gender',      label: 'Gender' },
    { key: 'phone',       label: 'Phone' },
    { key: 'conditions',  label: 'Past Conditions' },
    { key: 'fees',        label: 'Overall Fees', prefix: '₹' },
  ],
  'revisit-patients': [
    { key: 'name',        label: 'Name' },
    { key: 'age',         label: 'Age' },
    { key: 'phone',       label: 'Phone' },
    { key: 'visits',      label: 'Total Visits' },
    { key: 'lastVisit',   label: 'Last Visit' },
  ],
  'one-time-patients': [
    { key: 'name',        label: 'Name' },
    { key: 'age',         label: 'Age' },
    { key: 'phone',       label: 'Phone' },
    { key: 'visitDate',   label: 'Visit Date' },
    { key: 'fees',        label: 'Fees', prefix: '₹' },
  ],
  'all-prescriptions': [
    { key: 'patient',     label: 'Patient' },
    { key: 'date',        label: 'Date' },
    { key: 'symptoms',    label: 'Symptoms' },
    { key: 'medicines',   label: 'Medicines' },
    { key: 'fees',        label: 'Fees', prefix: '₹' },
    { key: 'nextAppt',    label: 'Next Appt.' },
  ],
  'yearly-prescriptions': [
    { key: 'patient',     label: 'Patient' },
    { key: 'date',        label: 'Date' },
    { key: 'symptoms',    label: 'Symptoms' },
    { key: 'medicines',   label: 'Medicines' },
    { key: 'fees',        label: 'Fees', prefix: '₹' },
    { key: 'nextAppt',    label: 'Next Appt.' },
  ],
  'appointments': [
    { key: 'patient',     label: 'Patient' },
    { key: 'age',         label: 'Age' },
    { key: 'phone',       label: 'Phone' },
    { key: 'startDate',   label: 'Start Date' },
    { key: 'endDate',     label: 'End Date' },
  ],
  'all-medicines': [
    { key: 'name',         label: 'Medicine Name' },
    { key: 'instructions', label: 'Special Instructions' },
  ],
};

function renderTable(target) {
  const tbodyId = target + '-tbody';
  const tbody   = document.getElementById(tbodyId);
  if (!tbody) return;

  const rows = loadStore(target);
  const cols = COLUMNS[target] || [];

  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols.length + 2}">No data — import from Excel or add manually</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const cells = cols.map(c => {
      const val = row[c.key] ?? '—';
      return `<td>${c.prefix ? c.prefix + ' ' + Number(val).toLocaleString('en-IN') : val}</td>`;
    }).join('');
    return `<tr><td>${i + 1}</td>${cells}<td>
      <button class="icon-btn" title="View" onclick="viewRow('${target}', ${i})">👁</button>
      <button class="icon-btn" title="Delete" onclick="deleteRow('${target}', ${i})">🗑️</button>
    </td></tr>`;
  }).join('');
}

function deleteRow(target, index) {
  const rows = loadStore(target);
  rows.splice(index, 1);
  saveStore(target, rows);
  renderTable(target);
  if (target === 'all-prescriptions' || target === 'yearly-prescriptions') renderYearlyStats();
}

function viewRow(target, index) {
  const row  = loadStore(target)[index];
  if (!row) return;
  const cols = COLUMNS[target] || [];
  const html = cols.map(c =>
    `<div class="view-row-item"><span class="view-row-label">${c.label}</span>
     <span class="view-row-value">${row[c.key] ?? '—'}</span></div>`
  ).join('');
  alert(cols.map(c => `${c.label}: ${row[c.key] ?? '—'}`).join('\n'));
}

// Simple client-side search filter
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
   4.  YEARLY STATS RENDERER
   ════════════════════════════════════════════════════════════ */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderYearlyStats() {
  const yearSel = document.getElementById('yearly-year-select');
  const year    = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();

  // Use all-prescriptions as source (yearly-prescriptions import also merges here)
  const allRx   = [...loadStore('all-prescriptions'), ...loadStore('yearly-prescriptions')];
  const yearRx  = allRx.filter(r => {
    const d = new Date(r.date);
    return !isNaN(d) && d.getFullYear() === year;
  });

  // Monthly breakdown
  const monthly = Array.from({ length: 12 }, (_, m) => {
    const mRx = yearRx.filter(r => new Date(r.date).getMonth() === m);
    const patients = new Set(mRx.map(r => r.patient)).size;
    const revenue  = mRx.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
    return { month: MONTHS[m], patients, prescriptions: mRx.length, revenue };
  });

  const tbody = document.getElementById('yearly-prescriptions-tbody');
  if (tbody) {
    if (!yearRx.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No data for ${year} — import prescription records</td></tr>`;
    } else {
      tbody.innerHTML = monthly.map(m => `
        <tr>
          <td>${m.month}</td>
          <td>${m.patients || '—'}</td>
          <td>${m.prescriptions || '—'}</td>
          <td>${m.revenue ? '₹ ' + m.revenue.toLocaleString('en-IN') : '—'}</td>
        </tr>`).join('');
    }
  }

  // Summary stats
  const totalRev      = yearRx.reduce((s, r) => s + (parseFloat(r.fees) || 0), 0);
  const totalPatients = new Set(yearRx.map(r => r.patient)).size;

  const el = id => document.getElementById(id);
  if (el('yearly-total-rx'))       el('yearly-total-rx').textContent       = yearRx.length || '—';
  if (el('yearly-total-patients')) el('yearly-total-patients').textContent = totalPatients || '—';
  if (el('yearly-total-revenue'))  el('yearly-total-revenue').textContent  =
    totalRev ? '₹ ' + totalRev.toLocaleString('en-IN') : '—';
}

/* ════════════════════════════════════════════════════════════
   5.  EXCEL IMPORT  –  STATE & HELPERS
   ════════════════════════════════════════════════════════════ */

let importTarget   = null;   // which page we're importing into
let importWorkbook = null;   // parsed XLSX workbook
let importRows     = [];     // raw rows from selected sheet (array of objects)
let importHeaders  = [];     // column header strings from Excel

// Human-readable names for targets
const TARGET_LABELS = {
  'all-patients':         'All Patients',
  'revisit-patients':     'Revisit Patients',
  'one-time-patients':    'One Time Patients',
  'all-prescriptions':    'All Prescriptions',
  'yearly-prescriptions': 'Yearly Prescriptions',
  'appointments':         'Appointments',
  'all-medicines':        'All Medicines',
};

// Suggested auto-mapping: app field → list of Excel header substrings (case-insensitive)
const FIELD_HINTS = {
  name:         ['name', 'patient', 'पेशेंट', 'नाम'],
  age:          ['age', 'उम्र', 'age(yrs)', 'आयु'],
  gender:       ['gender', 'sex', 'लिंग'],
  phone:        ['phone', 'mobile', 'contact', 'mob', 'फोन'],
  conditions:   ['condition', 'history', 'past', 'medical'],
  fees:         ['fee', 'amount', 'charge', 'शुल्क', 'total'],
  visits:       ['visit', 'count', 'times'],
  lastVisit:    ['last visit', 'last date', 'recent'],
  visitDate:    ['visit date', 'date', 'तारीख'],
  patient:      ['patient', 'name'],
  date:         ['date', 'prescription date', 'consult'],
  symptoms:     ['symptom', 'complaint', 'problem', 'लक्षण'],
  medicines:    ['medicine', 'drug', 'rx', 'दवा'],
  nextAppt:     ['next', 'appointment', 'follow'],
  startDate:    ['start', 'from'],
  endDate:      ['end', 'to', 'till', 'until'],
  instructions: ['instruction', 'note', 'direction', 'निर्देश'],
};

function guessMapping(appField, excelHeaders) {
  const hints = FIELD_HINTS[appField] || [];
  return excelHeaders.find(h =>
    hints.some(hint => h.toLowerCase().includes(hint.toLowerCase()))
  ) || '';
}

/* ════════════════════════════════════════════════════════════
   6.  IMPORT MODAL – OPEN / CLOSE
   ════════════════════════════════════════════════════════════ */

function openImport(target) {
  importTarget   = target;
  importWorkbook = null;
  importRows     = [];
  importHeaders  = [];

  // Reset UI
  document.getElementById('import-modal').hidden = false;
  document.body.style.overflow = 'hidden';

  showImportStep(1);

  document.getElementById('import-target-label').textContent =
    'Importing into: ' + (TARGET_LABELS[target] || target);

  // Reset file input
  const fi = document.getElementById('excel-file-input');
  if (fi) fi.value = '';
  document.getElementById('file-info').hidden        = true;
  document.getElementById('drop-zone').hidden        = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
}

function closeImport() {
  document.getElementById('import-modal').hidden = true;
  document.body.style.overflow = '';
  importTarget = importWorkbook = null;
  importRows = importHeaders = [];
}

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.id === 'import-modal') closeImport();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('import-modal').hidden) closeImport();
});

function showImportStep(step) {
  document.getElementById('import-step-1').hidden = (step !== 1);
  document.getElementById('import-step-2').hidden = (step !== 2);
  document.getElementById('import-step-3').hidden = (step !== 3);

  const backBtn = document.getElementById('import-back-btn');
  const nextBtn = document.getElementById('import-next-btn');

  backBtn.hidden = (step === 1 || step === 3);
  nextBtn.hidden = (step === 3);

  if (step === 1) {
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = !importWorkbook;
  } else if (step === 2) {
    nextBtn.textContent = 'Import ✓';
    nextBtn.disabled = false;
  }
}

function importNext() {
  const step1 = !document.getElementById('import-step-1').hidden;
  const step2 = !document.getElementById('import-step-2').hidden;

  if (step1) {
    buildColumnMapper();
    showImportStep(2);
  } else if (step2) {
    doImport();
  }
}

function importBack() {
  showImportStep(1);
}

/* ════════════════════════════════════════════════════════════
   7.  FILE HANDLING
   ════════════════════════════════════════════════════════════ */

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('drop-zone').classList.remove('drop-zone--active');
  const file = event.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) processFile(file);
}

function clearFile() {
  importWorkbook = null;
  importRows     = [];
  importHeaders  = [];
  document.getElementById('file-info').hidden   = true;
  document.getElementById('drop-zone').hidden   = false;
  document.getElementById('sheet-selector-wrap').hidden = true;
  document.getElementById('import-next-btn').disabled   = true;
  const fi = document.getElementById('excel-file-input');
  if (fi) fi.value = '';
}

function processFile(file) {
  const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                   'application/vnd.ms-excel'];
  const okExt   = file.name.match(/\.(xlsx|xls)$/i);
  if (!okExt) {
    showImportError('Only .xlsx and .xls files are supported.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      importWorkbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
      populateSheetSelector();
      onSheetChange();

      document.getElementById('drop-zone').hidden = true;
      document.getElementById('file-info').hidden = false;
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-size').textContent = formatBytes(file.size);
      document.getElementById('import-next-btn').disabled = false;
    } catch (err) {
      showImportError('Could not read the file. Make sure it is a valid Excel workbook. (' + err.message + ')');
    }
  };
  reader.readAsBinaryString(file);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function showImportError(msg) {
  const dz = document.getElementById('drop-zone');
  dz.innerHTML = `
    <div class="drop-zone__icon">⚠️</div>
    <p class="drop-zone__text" style="color:var(--danger)">${msg}</p>
    <button class="btn btn-ghost" style="margin-top:.75rem" onclick="clearFile()">Try Again</button>`;
}

function populateSheetSelector() {
  if (!importWorkbook) return;
  const sel   = document.getElementById('sheet-selector');
  const wrap  = document.getElementById('sheet-selector-wrap');
  sel.innerHTML = importWorkbook.SheetNames
    .map(n => `<option value="${n}">${n}</option>`).join('');
  wrap.hidden = importWorkbook.SheetNames.length <= 1;
}

function onSheetChange() {
  if (!importWorkbook) return;
  const sheetName = document.getElementById('sheet-selector').value
    || importWorkbook.SheetNames[0];
  const ws = importWorkbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (!raw.length) { importRows = []; importHeaders = []; return; }

  importHeaders = raw[0].map(h => String(h).trim());
  importRows    = raw.slice(1).filter(r => r.some(c => c !== ''));
}

/* ════════════════════════════════════════════════════════════
   8.  COLUMN MAPPER
   ════════════════════════════════════════════════════════════ */

function buildColumnMapper() {
  const cols   = COLUMNS[importTarget] || [];
  const mapper = document.getElementById('column-mapper');

  mapper.innerHTML = cols.map(col => {
    const guess   = guessMapping(col.key, importHeaders);
    const options = ['— Skip —', ...importHeaders]
      .map(h => `<option value="${h}" ${h === guess ? 'selected' : ''}>${h || '— Skip —'}</option>`)
      .join('');
    return `
      <div class="mapper-row">
        <span class="mapper-field">${col.label}</span>
        <span class="mapper-arrow">→</span>
        <select class="mapper-select" data-field="${col.key}"
                onchange="renderPreview()">${options}</select>
        ${guess ? '<span class="mapper-matched">auto-matched</span>' : '<span class="mapper-unmatched">unmatched</span>'}
      </div>`;
  }).join('');

  renderPreview();
}

function getMappings() {
  const map = {};
  document.querySelectorAll('.mapper-select').forEach(sel => {
    const field = sel.dataset.field;
    const col   = sel.value;
    if (col && col !== '— Skip —') map[field] = col;
  });
  return map;
}

function renderPreview() {
  const mapping = getMappings();
  const cols    = COLUMNS[importTarget] || [];
  const skipHeader = document.getElementById('skip-header-chk')?.checked;
  const rows    = skipHeader ? importRows : [importHeaders, ...importRows];

  const theadRow = document.getElementById('preview-thead');
  const tbody    = document.getElementById('preview-tbody');
  const countEl  = document.getElementById('preview-count');

  const mappedFields = cols.filter(c => mapping[c.key]);

  theadRow.innerHTML = mappedFields.map(c => `<th>${c.label}</th>`).join('');
  countEl.textContent = `(${rows.length} rows)`;

  const preview = rows.slice(0, 5);
  tbody.innerHTML = preview.map(row => {
    const cells = mappedFields.map(c => {
      const colIdx = importHeaders.indexOf(mapping[c.key]);
      const val    = colIdx >= 0 ? (row[colIdx] ?? '') : '';
      return `<td>${formatCellValue(val)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  if (!preview.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${mappedFields.length || 1}">No data rows found</td></tr>`;
  }
}

function formatCellValue(val) {
  if (val instanceof Date) return val.toLocaleDateString('en-IN');
  return String(val ?? '').slice(0, 80);
}

/* ════════════════════════════════════════════════════════════
   9.  DO IMPORT
   ════════════════════════════════════════════════════════════ */

function doImport() {
  const mapping     = getMappings();
  const cols        = COLUMNS[importTarget] || [];
  const dupAction   = document.getElementById('duplicate-action').value;
  const skipHeader  = document.getElementById('skip-header-chk')?.checked;
  const sourceRows  = skipHeader ? importRows : [importHeaders, ...importRows];

  const newRecords = sourceRows.map(row => {
    const obj = {};
    cols.forEach(c => {
      if (!mapping[c.key]) return;
      const idx = importHeaders.indexOf(mapping[c.key]);
      obj[c.key] = idx >= 0 ? formatCellValue(row[idx]) : '';
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));

  // Duplicate detection based on first 2 fields
  const existing = loadStore(importTarget);
  const nameKey  = cols[0]?.key;
  const dateKey  = cols[1]?.key;

  let added = 0, skipped = 0, overwritten = 0;
  let finalData;

  if (dupAction === 'append') {
    finalData = [...existing, ...newRecords];
    added = newRecords.length;
  } else {
    finalData = [...existing];
    newRecords.forEach(nr => {
      const dupIdx = finalData.findIndex(er =>
        nameKey && er[nameKey] && nr[nameKey] &&
        er[nameKey].toLowerCase() === nr[nameKey].toLowerCase() &&
        (!dateKey || er[dateKey] === nr[dateKey])
      );
      if (dupIdx >= 0) {
        if (dupAction === 'overwrite') {
          finalData[dupIdx] = nr;
          overwritten++;
        } else {
          skipped++;
        }
      } else {
        finalData.push(nr);
        added++;
      }
    });
  }

  saveStore(importTarget, finalData);

  // Re-render the affected table
  renderTable(importTarget);

  // If prescriptions imported, also refresh yearly
  if (importTarget === 'all-prescriptions' || importTarget === 'yearly-prescriptions') {
    renderYearlyStats();
  }

  // Show result
  const resultEl = document.getElementById('import-result');
  resultEl.innerHTML = `
    <div class="import-success-icon">✅</div>
    <h3>Successfully imported into <em>${TARGET_LABELS[importTarget]}</em></h3>
    <div class="import-stats">
      <div class="import-stat"><span class="import-stat-val">${added}</span><span>Rows added</span></div>
      <div class="import-stat"><span class="import-stat-val">${skipped}</span><span>Skipped (duplicate)</span></div>
      <div class="import-stat"><span class="import-stat-val">${overwritten}</span><span>Overwritten</span></div>
      <div class="import-stat"><span class="import-stat-val">${finalData.length}</span><span>Total records</span></div>
    </div>
    <button class="btn btn-primary" style="margin-top:1.25rem" onclick="closeImport()">Done</button>`;

  showImportStep(3);
}

/* ════════════════════════════════════════════════════════════
   10.  TEMPLATE DOWNLOADER
   ════════════════════════════════════════════════════════════ */

function downloadTemplate() {
  if (!importTarget) return;
  const cols = COLUMNS[importTarget] || [];
  const header = cols.map(c => c.label);
  const ws  = XLSX.utils.aoa_to_sheet([header]);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TARGET_LABELS[importTarget] || 'Sheet1');
  XLSX.writeFile(wb, `template_${importTarget}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   11.  FORM HELPERS
   ════════════════════════════════════════════════════════════ */

// Collapsible fieldsets
document.querySelectorAll('.collapsible-legend').forEach(legend => {
  legend.addEventListener('click', () => {
    const body   = legend.closest('fieldset').querySelector('.collapsible-body');
    const toggle = legend.querySelector('.collapse-toggle');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    if (toggle) toggle.textContent = isOpen ? '▸' : '▾';
  });
});

// Prescription medicine row add/remove
function addMedRow() {
  const tbody = document.querySelector('#rxMedTable tbody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" placeholder="Medicine name" /></td>
    <td><input type="text" placeholder="e.g. 1 bottle" /></td>
    <td><input type="text" placeholder="e.g. 5 drops" /></td>
    <td><input type="text" placeholder="e.g. Twice daily" /></td>
    <td><button type="button" class="icon-btn remove-row">✕</button></td>`;
  tbody.appendChild(row);
}

function removeRow(btn) {
  btn.closest('tr')?.remove();
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('remove-row')) removeRow(e.target);
});

// Generic "Add Row" for other tables
document.querySelectorAll('.add-row-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const table = this.previousElementSibling;
    if (!table || table.tagName !== 'TABLE') return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.querySelector('.empty-row')?.remove();
    const colCount = table.querySelectorAll('thead th').length;
    const newRow   = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      if (i === colCount - 1) {
        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'icon-btn remove-row';
        rmBtn.textContent = '✕';
        td.appendChild(rmBtn);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        td.appendChild(input);
      }
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
  });
});

/* ════════════════════════════════════════════════════════════
   12.  CALENDAR
   ════════════════════════════════════════════════════════════ */

document.querySelectorAll('.cal-cell:not(.cal-other-month)').forEach(cell => {
  cell.addEventListener('click', function () {
    document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-selected'));
    this.classList.add('cal-selected');
  });
});

/* ════════════════════════════════════════════════════════════
   13.  INIT
   ════════════════════════════════════════════════════════════ */

function init() {
  // Render all tables from localStorage on load
  Object.keys(STORE_KEYS).forEach(target => {
    if (loadStore(target).length) renderTable(target);
  });

  const hash = window.location.hash.replace('#', '');
  const validPages = Object.keys(PAGE_TO_NAV);
  showPage(validPages.includes(hash) ? hash : 'dashboard');
}

document.addEventListener('DOMContentLoaded', init);
