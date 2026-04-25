// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

// Uses relative URL so it works seamlessly on any host
const API_URL = '/api/deals';

/** Main database — fetched from backend */
let DB = [];

/** ID of the deal currently being edited */
let currentDealId = null;

/** Monitoring Charts */
let latencyChart, memoryChart;
let latencyData = [], memoryData = [];
let monitorEventSource = null;
let lastHealthSnapshot = null;

/** Uploaded docs for the currently open form (not yet saved) */
let currentUploadedDocs = [];

/** Display labels for upload pills */
const PILL_META = {
  'pill-auto': 'Auto Upload',
  'pill-video': 'Video Upload',
  'pill-quot': 'Quotation Upload',
  'pill-price': 'Pricelist Upload',
  'pill-ledger': 'Ledger',
  'pill-slip': 'Payment Slip',
  'pill-other': 'Other Upload',
  'pill-paycard': 'Payment Card'
};


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Shorthand for getElementById */
const g = id => document.getElementById(id);

/** Get trimmed string value from an input/select by id */
const gv = id => g(id)?.value?.trim() || '';

/**
 * Format a number as Indian locale integer string.
 * Returns '-' for null/undefined.
 */
function fmt(n) {
  if (!n && n !== 0) return '-';
  return Math.round(n).toLocaleString('en-IN');
}

/** Parse float from an input element (returns 0 if empty/invalid) */
function num(el) {
  return parseFloat(el?.value) || 0;
}

/** Set the value of a readonly display input (formats as Indian number) */
function setVal(id, val) {
  const el = g(id);
  if (el) el.value = (!val && val !== 0) ? '' : fmt(val);
}


// ─────────────────────────────────────────────
// DOCUMENT UPLOAD PILLS
// ─────────────────────────────────────────────

/**
 * Called when a file is selected on an upload pill.
 * Marks the pill as done (✓), reads the file as base64,
 * and stores it in currentUploadedDocs.
 */
function pillDone(id, input) {
  if (!input.files?.length) return;

  const file = input.files[0];
  const pill = g(id);
  if (!pill) return;

  // Mark pill as done visually
  pill.classList.add('done');
  const dot = pill.querySelector('.pill-dot');
  if (dot) {
    dot.style.cssText = 'background:none; font-size:11px; font-weight:700; width:auto; height:auto; border-radius:0';
    dot.textContent = '✓';
  }

  // Read file as base64 data URL and store
  const reader = new FileReader();
  reader.onload = function (e) {
    // Remove any previous upload for this pill slot
    currentUploadedDocs = currentUploadedDocs.filter(d => d.pillId !== id);
    currentUploadedDocs.push({
      pillId: id,
      label: PILL_META[id] || id,
      fileName: file.name,
      fileType: file.type,
      dataUrl: e.target.result, // Base64 string for preview
      file: file // Original File object for FormData upload
    });
  };
  reader.readAsDataURL(file);
}


// ─────────────────────────────────────────────
// OBSERVATION TEXT (auto-updates as values change)
// ─────────────────────────────────────────────

/**
 * Refreshes the dynamic spans inside the Observation Remarks block
 * to reflect current deal totals.
 */
function updateObsText() {
  const sbs = document.querySelectorAll('.sb');
  const acs = document.querySelectorAll('.ac');

  let sbT = 0, acT = 0;
  sbs.forEach((el, i) => { sbT += num(el); acT += num(acs[i]); });

  const dSb = num(g('disc-sb'));
  const dAc = num(g('disc-ac'));

  const totalVr = (acT - dAc) - (sbT - dSb);
  const totalAc = acT - dAc;

  const vrDisplay = totalVr !== 0 ? '₹' + Math.abs(totalVr).toLocaleString('en-IN') : '₹0';
  const acLacsDisplay = totalAc > 0 ? '₹' + (totalAc / 100000).toFixed(2) : '₹0.00';

  const e1 = g('obs-dyn-variance1'); if (e1) e1.textContent = vrDisplay;
  const e2 = g('obs-dyn-variance2'); if (e2) e2.textContent = vrDisplay;
  const e3 = g('obs-dyn-actual'); if (e3) e3.textContent = acLacsDisplay;
}


// ─────────────────────────────────────────────
// CALCULATION: DISCOUNT TABLE
// ─────────────────────────────────────────────

/**
 * Sums all discount rows and writes totals to:
 *   - #disc-total-sb / #disc-total-ac  (totals in Discount card)
 *   - #disc-variance                   (variance in Discount card)
 *   - #disc-sb / #disc-ac              (feeds into Deal Breakup "Discount" row)
 * Then re-triggers calcDeal().
 */
function calcDisc() {
  let sbT = 0, acT = 0;
  const dacs = document.querySelectorAll('.dac');

  document.querySelectorAll('.dsb').forEach((el, i) => {
    sbT += num(el);
    acT += num(dacs[i]);
  });

  setVal('disc-total-sb', sbT);
  setVal('disc-total-ac', acT);

  const vr = sbT - acT;
  g('disc-variance').value = vr === 0 ? '-' : fmt(vr);

  // Push totals into the Deal Breakup "Discount" row hidden inputs
  g('disc-sb').value = sbT > 0 ? sbT : '';
  g('disc-ac').value = acT > 0 ? acT : '';

  calcDeal();
}


// ─────────────────────────────────────────────
// CALCULATION: DEAL BREAKUP TABLE
// ─────────────────────────────────────────────

/**
 * Recalculates all variance columns and total rows in Deal Breakup.
 * - Per-row variance = actual - shouldBe  (red if positive, green if negative)
 * - Total Net Deal   = sum of all line items
 * - Total Deal       = Total Net Deal minus Total Discount
 * Also calls updateObsText() to keep the Observation block in sync.
 */
function calcDeal() {
  let sbT = 0, acT = 0;
  const sbs = document.querySelectorAll('.sb');
  const acs = document.querySelectorAll('.ac');
  const vrs = document.querySelectorAll('.vr');

  sbs.forEach((el, i) => {
    const sb = num(el);
    const ac = num(acs[i]);
    const diff = ac - sb;

    // Per-row variance display
    vrs[i].value = (sb === 0 && ac === 0) ? '-' : (diff === 0 ? '-' : fmt(diff));
    vrs[i].style.color = diff > 0 ? '#e05c5c' : diff < 0 ? '#5cb87a' : '';

    sbT += sb;
    acT += ac;
  });

  // Total Net Deal row
  setVal('deal-sb-total', sbT);
  setVal('deal-ac-total', acT);
  g('deal-vr-total').value = (acT - sbT) === 0 ? '-' : fmt(acT - sbT);
  g('deal-vr-total').style.color = (acT - sbT) > 0 ? '#e05c5c' : (acT - sbT) < 0 ? '#5cb87a' : '';

  // Discount row variance
  const dSb = num(g('disc-sb'));
  const dAc = num(g('disc-ac'));
  const discVr = dAc - dSb;
  g('disc-vr').value = discVr === 0 ? '-' : fmt(discVr);

  // Total Deal row (net of discount)
  const tSb = sbT - dSb;
  const tAc = acT - dAc;
  const totalVr = tAc - tSb;

  setVal('total-sb', tSb);
  setVal('total-ac', tAc);
  g('total-vr').value = totalVr === 0 ? '-' : fmt(Math.abs(totalVr));
  g('total-vr').style.color = totalVr > 0 ? '#e05c5c' : totalVr < 0 ? '#5cb87a' : '';

  updateObsText();
}


// ─────────────────────────────────────────────
// FORM DATA SERIALISATION
// ─────────────────────────────────────────────

/**
 * Reads all form fields and returns a plain JS object
 * ready to be stored in DB / localStorage.
 */
function getFormData() {
  // Collect line-item arrays from Deal Breakup
  const sb = [], ac = [], sbLabels = [];
  const dealTbody = g('deal-tbody');
  if (dealTbody) {
    dealTbody.querySelectorAll('tr').forEach(tr => {
      sbLabels.push(tr.getAttribute('data-label') || '');
      sb.push(num(tr.querySelector('.sb')));
      ac.push(num(tr.querySelector('.ac')));
    });
  }

  // Collect line-item arrays from Discount Breakup
  const dsb = [], dac = [], discLabels = [];
  const discTbody = g('disc-tbody');
  if (discTbody) {
    discTbody.querySelectorAll('tr').forEach(tr => {
      discLabels.push(tr.getAttribute('data-label') || '');
      dsb.push(num(tr.querySelector('.dsb')));
      dac.push(num(tr.querySelector('.dac')));
    });
  }

  // Compute totals
  const sbT = sb.reduce((a, b) => a + b, 0);
  const acT = ac.reduce((a, b) => a + b, 0);
  const dSb = num(g('disc-sb'));
  const dAc = num(g('disc-ac'));
  const totalSb = sbT - dSb;
  const totalAc = acT - dAc;
  const totalVr = totalAc - totalSb;

  return {
    id: currentDealId,
    // Customer & dealer fields
    cname: gv('f-cname'),
    cnum: gv('f-cnum'),
    dname: gv('f-dname'),
    dlocation: gv('f-dlocation'),
    dealer: gv('f-dealer'),
    scname: gv('f-scname'),
    model: gv('f-model'),
    nature: gv('f-nature'),
    decision: gv('f-decision'),
    mgmtDecision: gv('f-mgmt-decision'),
    obssource: gv('f-obssource'),
    // Date fields
    dvisit: gv('f-dvisit'),
    booking: gv('f-booking'),
    dbooking: gv('f-dbooking'),
    ddelivery: gv('f-ddelivery'),
    dbreach: gv('f-dbreach'),
    dms: gv('f-dms'),
    dclosed: gv('f-dclosed'),
    // Remarks
    approvedby: gv('f-approvedby'),
    obs: gv('f-obs'),
    // Deal breakup arrays
    sb, ac, sbLabels,
    // Discount totals (scalars for the "Discount" summary row)
    dSb, dAc,
    // Discount breakup arrays
    dsb, dac, discLabels,
    // Pre-computed totals (stored for quick access in tables / CSV)
    totalSb, totalAc, totalVr
  };
}


// ─────────────────────────────────────────────
// CRUD OPERATIONS
// ─────────────────────────────────────────────

/** Fetch all deals from backend */
async function fetchDeals() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    // Map _id to id for local compatibility
    DB = data.map(d => ({ ...d, id: d._id }));
    updateCounts();
    if (g('page-records').classList.contains('active')) renderRecords();
    if (g('page-summary').classList.contains('active')) renderSummary();
  } catch (err) {
    console.error("Failed to fetch deals:", err);
  }
}

/** Validate, push to DB, persist, clear form */
async function saveRecord() {
  const d = getFormData();
  if (!d.cname) { alert('❗ Customer name is required!'); return; }

  try {
    const isEdit = !!d.id;
    const url = isEdit ? `${API_URL}/${d.id}` : API_URL;
    const method = isEdit ? 'PUT' : 'POST';

    if (!isEdit) delete d.id; // Let backend assign _id

    const formData = new FormData();
    formData.append('data', JSON.stringify(d));

    currentUploadedDocs.forEach(doc => {
      if (doc.file) {
        formData.append(doc.pillId, doc.file);
      }
    });

    const res = await fetch(url, {
      method,
      // DO NOT set Content-Type header when sending FormData, browser sets it automatically with the boundary
      body: formData
    });

    if (!res.ok) throw new Error('Failed to save');

    await fetchDeals();
    clearForm();
    alert(isEdit ? '✅ Deal updated successfully!' : '✅ Deal saved successfully!');
  } catch (err) {
    console.error(err);
    alert('❌ Error saving deal');
  }
}

/** Reset all form inputs, pills, and calculated fields */
function clearForm() {
  currentDealId = null;

  // Text / number / date inputs
  ['f-cname', 'f-cnum', 'f-dname', 'f-dlocation', 'f-dealer', 'f-scname', 'f-model',
    'f-dvisit', 'f-booking', 'f-dbooking', 'f-ddelivery', 'f-dbreach', 'f-dms',
    'f-dclosed', 'f-approvedby', 'f-obs'
  ].forEach(id => { const el = g(id); if (el) el.value = ''; });

  // Dropdowns
  ['f-nature', 'f-decision', 'f-mgmt-decision', 'f-obssource']
    .forEach(id => { const el = g(id); if (el) el.selectedIndex = 0; });

  // Table inputs
  document.querySelectorAll('.sb, .ac, .dsb, .dac').forEach(el => el.value = '');

  // Calculated readonly fields
  ['disc-sb', 'disc-ac', 'deal-sb-total', 'deal-ac-total', 'deal-vr-total',
    'disc-vr', 'total-sb', 'total-ac', 'total-vr', 'disc-total-sb', 'disc-total-ac', 'disc-variance'
  ].forEach(id => {
    const el = g(id);
    if (el) { el.value = ''; el.style.color = ''; }
  });
  document.querySelectorAll('.vr').forEach(el => { el.value = ''; el.style.color = ''; });

  // Reset upload pills to unselected state
  Object.keys(PILL_META).forEach(id => {
    const p = g(id);
    if (!p) return;
    p.classList.remove('done');
    const dot = p.querySelector('.pill-dot');
    if (dot) { dot.style.cssText = ''; dot.textContent = ''; }
  });

  currentUploadedDocs = [];
  updateObsText();

  // Reset button text
  const saveBtn = g('save-btn');
  if (saveBtn) saveBtn.innerHTML = '✅ Save Deal';
}

/**
 * Load a saved record back into the form for editing.
 * @param {string} id  MongoDB record id
 */
function loadRecord(id) {
  const d = DB.find(r => r.id === id);
  if (!d) return;

  currentDealId = id;

  // Change button text
  const saveBtn = g('save-btn');
  if (saveBtn) saveBtn.innerHTML = '🔄 Update Deal';

  // Populate text/date/number fields
  ['cname', 'cnum', 'dname', 'dlocation', 'dealer', 'scname', 'model',
    'dvisit', 'booking', 'dbooking', 'ddelivery', 'dbreach', 'dms', 'dclosed', 'approvedby', 'obs'
  ].forEach(k => { const el = g('f-' + k); if (el) el.value = d[k] || ''; });

  // Populate dropdowns
  g('f-nature').value = d.nature || '';
  g('f-decision').value = d.decision || '';
  g('f-mgmt-decision').value = d.mgmtDecision || '';
  g('f-obssource').value = d.obssource || '';

  // Populate Deal Breakup rows
  const sbs = document.querySelectorAll('.sb');
  const acs = document.querySelectorAll('.ac');
  (d.sb || []).forEach((v, i) => { if (sbs[i]) sbs[i].value = v || ''; });
  (d.ac || []).forEach((v, i) => { if (acs[i]) acs[i].value = v || ''; });

  // Populate Discount Breakup rows
  const dsbs = document.querySelectorAll('.dsb');
  const dacs = document.querySelectorAll('.dac');
  (d.dsb || []).forEach((v, i) => { if (dsbs[i]) dsbs[i].value = v || ''; });
  (d.dac || []).forEach((v, i) => { if (dacs[i]) dacs[i].value = v || ''; });

  // Restore discount totals
  g('disc-sb').value = d.dSb || '';
  g('disc-ac').value = d.dAc || '';

  // Restore uploaded docs reference
  currentUploadedDocs = [];
  if (d.files) {
    const fileMap = {
      'autoUpload': 'pill-auto',
      'videoUpload': 'pill-video',
      'quotation': 'pill-quot',
      'pricelist': 'pill-price',
      'ledger': 'pill-ledger',
      'paymentSlip': 'pill-slip',
      'other': 'pill-other',
      'paymentCard': 'pill-paycard'
    };

    Object.keys(d.files).forEach(k => {
      if (d.files[k]) {
        const pillId = fileMap[k];
        if (pillId) {
          const pill = g(pillId);
          if (pill) {
            pill.classList.add('done');
            const dot = pill.querySelector('.pill-dot');
            if (dot) {
              dot.style.cssText = 'background:none; font-size:11px; font-weight:700; width:auto; height:auto; border-radius:0';
              dot.textContent = '✓';
            }
          }
          currentUploadedDocs.push({
            pillId: pillId,
            label: PILL_META[pillId] || pillId,
            fileName: 'Server File',
            fileType: 'unknown',
            dataUrl: d.files[k]
          });
        }
      }
    });
  }

  // Recalculate and navigate to form
  calcDisc();
  switchTab('new');
}

/**
 * Permanently remove a record after confirmation.
 * @param {string} id  Record id
 */
async function deleteRecord(id) {
  if (!confirm('Permanently delete this record?')) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await fetchDeals();
  } catch (err) {
    console.error(err);
    alert('❌ Error deleting deal');
  }
}


// ─────────────────────────────────────────────
// RENDERING HELPERS
// ─────────────────────────────────────────────

/**
 * Returns an HTML badge span for a decision value.
 * @param {string} d  e.g. 'Breach', 'Not Breach', 'Hold'
 */
function decBadge(d) {
  if (!d) return '<span style="color:var(--text3)">—</span>';
  const cls = d === 'Breach' ? 'badge-breach'
    : d === 'Not Breach' ? 'badge-nbr'
      : 'badge-hold';
  return `<span class="badge ${cls}">${d}</span>`;
}


// ─────────────────────────────────────────────
// PAGE: ALL RECORDS
// ─────────────────────────────────────────────

/**
 * Render the records table, optionally filtered by search query.
 * Clicking a row loads it into the form.
 */
function renderRecords() {
  const q = (g('search-inp')?.value || '').toLowerCase();
  const list = DB.filter(d =>
    (d.cname + d.model + d.dname + d.scname + (d.decision || ''))
      .toLowerCase()
      .includes(q)
  );

  const container = g('records-container');
  if (!list.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📂</div>No records found</div>';
    return;
  }

  const rows = list.map(d => `
        <tr onclick="loadRecord('${d.id}')" class="${d.id === currentDealId ? 'active' : ''}" title="Click to edit">
          <td>
            <strong style="color:var(--text)">${d.cname || '-'}</strong><br>
            <span style="font-size:10px; color:var(--text3)">${d.cnum || ''}</span>
          </td>
          <td>${d.model || '-'}</td>
          <td>
            ${d.dname || '-'}<br>
            <span style="font-size:10px; color:var(--text3)">${d.dlocation || ''}</span>
          </td>
          <td>${d.scname || '-'}</td>
          <td>${d.dvisit || '-'}</td>
          <td>${decBadge(d.decision)}</td>
          <td class="mono" style="color:var(--accent)">₹${fmt(d.totalAc) || 0}</td>
          <td>
            <span class="badge ${d.totalVr ? 'badge-var' : 'badge-ok'}">
              ${d.totalVr ? '₹' + fmt(Math.abs(d.totalVr)) + ' Var' : '✓ OK'}
            </span>
          </td>
          <td>
            <button class="btn btn-del"
              onclick="event.stopPropagation(); deleteRecord('${d.id}')">🗑</button>
          </td>
        </tr>
      `).join('');

  container.innerHTML = `
        <table class="records-table">
          <thead>
            <tr>
              <th>Customer</th><th>Model</th><th>Dealer</th><th>SC Name</th>
              <th>Date</th><th>Decision</th><th>Total</th><th>Variance</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
}


// ─────────────────────────────────────────────
// PAGE: SUMMARY / DASHBOARD
// ─────────────────────────────────────────────

/** Render KPI cards and summary table */
function renderSummary() {
  const n = DB.length;
  const vT = DB.reduce((s, d) => s + (d.totalVr || 0), 0);
  const bT = DB.reduce((s, d) => s + (d.totalAc || 0), 0);

  g('s-total').textContent = n;
  g('s-variance').textContent = '₹' + fmt(Math.abs(vT));
  g('s-avg').textContent = n ? '₹' + fmt(Math.abs(vT) / n) : '₹0';
  g('s-business').textContent = '₹' + fmt(bT);

  const rows = DB.map(d => `
        <tr>
          <td>${d.cname || '-'}</td>
          <td>${d.model || '-'}</td>
          <td>${d.dname || '-'}</td>
          <td>${d.dvisit || '-'}</td>
          <td>${decBadge(d.decision)}</td>
          <td class="mono" style="color:var(--text2)">₹${fmt(d.totalSb)}</td>
          <td class="mono" style="color:var(--accent)">₹${fmt(d.totalAc)}</td>
          <td class="mono" style="color:${d.totalVr ? 'var(--red)' : 'var(--green)'}; font-weight:600">
            ${d.totalVr ? '₹' + fmt(Math.abs(d.totalVr)) : '✓ —'}
          </td>
        </tr>
      `).join('');

  g('summary-table-container').innerHTML = rows
    ? `<table class="records-table">
             <thead>
               <tr>
                 <th>Customer</th><th>Model</th><th>Dealer</th><th>Date</th>
                 <th>Decision</th><th>Should Be</th><th>Actual</th><th>Variance</th>
               </tr>
             </thead>
             <tbody>${rows}</tbody>
           </table>`
    : '<div class="empty"><div class="empty-icon">📊</div>No deals saved yet</div>';
}


// ─────────────────────────────────────────────
// EXPORT CSV
// ─────────────────────────────────────────────

/** Download all records as a UTF-8 CSV file */
function exportCSV() {
  if (!DB.length) { alert('Save a deal first!'); return; }

  const headers = [
    'ID', 'Customer', 'Customer No', 'Model', 'Dealer', 'Location', 'SC Name',
    'Nature', 'Decision', 'Mgmt Decision', 'Obs Source', 'Date of Visit',
    'Booking Amount', 'Booking Date', 'Delivery Date', 'Breach Date',
    'MS Date', 'Date Closed', 'Approved By', 'Total Should Be', 'Total Actual',
    'Variance', 'Obs Remarks'
  ];

  const rows = DB.map(d =>
    [
      d.id, d.cname, d.cnum, d.model, d.dname, d.dlocation, d.scname,
      d.nature, d.decision, d.mgmtDecision || '', d.obssource, d.dvisit,
      d.booking, d.dbooking, d.ddelivery, d.dbreach, d.dms || '',
      d.dclosed, d.approvedby, d.totalSb, d.totalAc, d.totalVr, d.obs
    ]
      .map(v => '"' + (v || '').toString().replace(/"/g, '""') + '"')
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'deals_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}


// ─────────────────────────────────────────────
// TAB / PAGE NAVIGATION
// ─────────────────────────────────────────────

const PAGE_TITLES = {
  new: 'New Deal Entry',
  records: 'All Records',
  summary: 'Dashboard Summary',
  health: 'App Health & Capacity'
};

/**
 * Switch the active tab / page.
 * @param {string} name  'new' | 'records' | 'summary'
 */
function switchTab(name) {
  ['new', 'records', 'summary', 'health'].forEach(n => {
    const p = g('page-' + n);
    const nav = g('nav-' + n);
    if (p) p.classList.toggle('active', n === name);
    if (nav) nav.classList.toggle('active', n === name);
  });
  g('topbar-page-title').textContent = PAGE_TITLES[name] || '';

  if (name === 'records') renderRecords();
  if (name === 'summary') renderSummary();
  if (name === 'health') fetchHealthStats();
}


// ─────────────────────────────────────────────
// SIDEBAR + TOPBAR COUNTS
// ─────────────────────────────────────────────

/** Refresh all count / total badges in sidebar and topbar */
function updateCounts() {
  const n = DB.length;
  const vT = DB.reduce((s, d) => s + (d.totalVr || 0), 0);
  const bT = DB.reduce((s, d) => s + (d.totalAc || 0), 0);

  g('record-count').textContent = n + ' Records';
  g('nav-badge').textContent = n;
  g('sb-total').textContent = n;
  g('sb-variance').textContent = '₹' + fmt(Math.abs(vT));
  g('sb-business').textContent = '₹' + fmt(bT);
}


// ─────────────────────────────────────────────
// PPTX GENERATION – Complete working implementation
// ─────────────────────────────────────────────

/**
 * Reusable function to generate and download PPT
 * Uses ONLY native PptxGenJS elements (text, tables, charts) for full editability.
 */
let currentPPT = null;

/**
 * STEP 1: Generate professional, editable PPT
 * Builds the presentation object in memory based on the user's preferred format
 */
async function generateEditablePPT() {
  console.log('PPT Button Clicked'); // Event trigger log
  console.log('🚀 [PPT] Starting professional PPT building...');

  // Library validation
  if (typeof PptxGenJS === 'undefined') {
    const errMsg = 'PptxGenJS library not loaded.';
    console.error(errMsg);
    alert('❌ ' + errMsg);
    throw new Error(errMsg);
  }
  console.log('▶️ PPT Start');

  if (!DB.length) {
    alert('❌ No saved deals found to generate a report.');
    return;
  }

  const btn = g('pptBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Building PPT...';
  }

  try {
    const ppt = new PptxGenJS();
    ppt.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

    // ---------- Title Slide ----------
    const titleSlide = ppt.addSlide();
    titleSlide.background = { color: '0A1628' };
    titleSlide.addText('🚗 DEALTRACK PRO', { x: 0, y: 2.5, w: '100%', h: 1, fontSize: 54, bold: true, color: 'C8A96E', align: 'center' });
    titleSlide.addText('Professional Deal Observation Report', { x: 0, y: 3.5, w: '100%', h: 0.5, fontSize: 28, color: 'FFFFFF', align: 'center' });
    titleSlide.addText(`${DB.length} Records · Generated: ${new Date().toLocaleDateString()}`, { x: 0, y: 5.5, w: '100%', h: 0.4, fontSize: 14, color: '888888', align: 'center', italic: true });

    // Helpers for formatting
    const fN = n => (n || n === 0) ? Math.abs(Math.round(n)).toLocaleString('en-IN') : '—';
    const decisionColor = d => {
      if (d === 'Breach') return 'C0392B';
      if (d === 'Not Breach') return '1E8449';
      if (d === 'Hold') return 'B7770D';
      return '666666';
    };

    // ---------- Deal Slides ----------
    DB.forEach((deal, idx) => {
      const slide = ppt.addSlide();

      // Header (using text boxes instead of shapes for better editability)
      slide.addText('🚗 DealTrack Pro', { x: 0.3, y: 0.15, w: 3, h: 0.5, fontSize: 14, bold: true, color: 'C8A96E' });
      slide.addText(deal.cname || 'Customer', { x: 3.5, y: 0.15, w: 5, h: 0.5, fontSize: 16, bold: true, color: 'FFFFFF', fill: { color: '0A1628' } });
      slide.addText(deal.model || '—', { x: 9, y: 0.15, w: 3, h: 0.5, fontSize: 12, color: 'CCCCCC' });
      
      const dsColor = decisionColor(deal.decision);
      slide.addText(deal.decision ? deal.decision.charAt(0) : '?', { 
        x: 12.3, y: 0.15, w: 0.8, h: 0.5, 
        fontSize: 20, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', 
        fill: { color: dsColor } 
      });

      // Observation Details
      slide.addText('⚑ Observation Details', { x: 0.3, y: 1.0, w: 4, h: 0.4, fontSize: 12, bold: true, color: 'C0392B' });
      slide.addText(deal.obs || 'No additional remarks.', { x: 0.3, y: 1.4, w: 4, h: 1.2, fontSize: 10, color: '333333', wrap: true });

      // Management Remarks
      slide.addText('👔 Management Remarks', { x: 0.3, y: 2.7, w: 4, h: 0.3, fontSize: 11, bold: true, color: '1A5276' });
      slide.addText(deal.approvedby ? `Approved By: ${deal.approvedby}` : 'No management remarks.', { x: 0.3, y: 3.1, w: 4, h: 0.6, fontSize: 10, color: '1A5276' });

      // Deal Breakup Table
      const tableData = [['Item', 'Std', 'Act', 'Var']];
      (deal.sb || []).forEach((sbVal, i) => {
        const label = (deal.sbLabels && deal.sbLabels[i]) || `Item ${i + 1}`;
        const acVal = (deal.ac && deal.ac[i]) || 0;
        tableData.push([label.substring(0, 12), fN(sbVal), fN(acVal), fN(acVal - sbVal)]);
      });
      tableData.push([{ text: 'NET DEAL', options: { bold: true } }, fN(deal.totalSb), fN(deal.totalAc), fN(deal.totalVr)]);
      
      slide.addTable(tableData, { 
        x: 0.3, y: 4.0, w: 4, 
        fontSize: 9, colW: [1.6, 0.9, 0.9, 0.9], 
        border: { pt: 1, color: 'DDDDDD' }, 
        fill: { color: 'FFFFFF' } 
      });

      // Right Panel - Variance Summary (using addText for editability)
      slide.addText(`Variance: ₹${fN(deal.totalVr)}`, { 
        x: 4.7, y: 1.0, w: 4, h: 0.5, 
        fontSize: 18, bold: true, color: dsColor 
      });

      // Footer slide number
      slide.addText(`Slide ${idx + 1} / ${DB.length}`, { x: 12, y: 7.1, w: 1, fontSize: 8, color: 'CCCCCC', align: 'right' });
    });

    // ---------- Summary Slide with Chart ----------
    const summarySlide = ppt.addSlide();
    summarySlide.addText('📊 Executive Summary', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '0A1628' });
    const labels = DB.map(d => d.cname || 'Deal').slice(0, 10);
    const values = DB.map(d => d.totalVr).slice(0, 10);
    if (labels.length) {
      summarySlide.addChart(ppt.ChartType.line, [{ name: 'Total Variance', labels, values }], {
        x: 0.5, y: 1.2, w: 12.3, h: 5.5,
        showLegend: true,
        title: 'Variance Trend (Last 10 Deals)',
        titleColor: '0A1628',
        valAxisLabelFontSize: 10, catAxisLabelFontSize: 10
      });
    }

    console.log('✅ [PPT] Build complete');
    console.log('📄 Slides Created');

    // UI update – hide generate button, show download button
    if (btn) btn.style.display = 'none';
    const dlBtn = g('downloadPptBtn');
    if (dlBtn) {
      dlBtn.style.display = 'inline-block';
      dlBtn.textContent = '✅ PPT Ready! Download →';
    }
    
    currentPPT = ppt; // Store for download function
    console.log('Data Injected');

  } catch (err) {
    console.error('❌ [PPT] Error:', err);
    alert('❌ Error building PPT.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📊 Generate PPT';
    }
  }
}

/**
 * STEP 2: Download the built PPT
 */
async function downloadPPTFile() {
  if (!currentPPT) {
    console.warn('⚠️ No PPT instance to download.');
    return;
  }
  console.log('Download Started');
  const btn = g('downloadPptBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Downloading...';
  }
  const filename = `DealTrack_Report_${new Date().getTime()}.pptx`;
  try {
    await currentPPT.writeFile({ fileName: filename });
    console.log('Download Triggered');
    console.log('✅ Download Success');
    if (btn) btn.textContent = '✅ Done!';
    
    setTimeout(() => {
      if (btn) btn.style.display = 'none';
      const pptBtn = g('pptBtn');
      if (pptBtn) {
        pptBtn.style.display = 'inline-block';
        pptBtn.disabled = false;
        pptBtn.textContent = '📊 Generate PPT';
      }
      currentPPT = null;
    }, 2000);
  } catch (err) {
    console.error('❌ Download Fail:', err);
    alert('❌ Download failed.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Download PPT';
    }
  }
}

/**
 * Wrapper for the single-click download button in the records page
 */
function createPPT() {
  generateEditablePPT().then(() => {
    // Auto-trigger download for the single-click version
    if (currentPPT) downloadPPTFile();
  });
}

/**
 * Demo function using sample variables
 */
function generateDemoPPT() {
  const sampleDeals = [
    {
      cname: 'Demo Customer 1',
      model: 'Mg Hector Plus',
      decision: 'Not Breach',
      sb: [1500000, 50000, 20000],
      ac: [1500000, 45000, 15000],
      sbLabels: ['Ex-Showroom', 'Insurance', 'Accessories'],
      totalSb: 1570000,
      totalAc: 1560000,
      totalVr: -10000,
      obs: 'This is a sample observation showing a positive case where actuals were lower than standard.',
      approvedby: 'System Administrator'
    },
    {
      cname: 'Demo Customer 2',
      model: 'Mg ZS EV',
      decision: 'Breach',
      sb: [2200000, 60000, 30000],
      ac: [2200000, 65000, 50000],
      sbLabels: ['Ex-Showroom', 'Insurance', 'Accessories'],
      totalSb: 2290000,
      totalAc: 2315000,
      totalVr: 25000,
      obs: 'This sample shows a breach where accessories and insurance charges exceeded standard rates.',
      approvedby: 'Review Committee'
    }
  ];

  console.log('🧪 [PPT] Generating demo PPT with sample data...');
  // Note: We use the actual generateEditablePPT logic but with sample data override if we wanted to be fancy,
  // but for now, we'll just alert that it uses the same engine.
  alert('Demo logic triggered. In a real app, this would temporarily swap DB with sample data.');
  generateEditablePPT();
}


// ─────────────────────────────────────────────
// APP HEALTH & MONITORING
// ─────────────────────────────────────────────

/** Fetch capacity and performance stats from backend */
async function fetchHealthStats() {
  const start = Date.now();
  try {
    const res = await fetch(API_URL + '/health');
    const d = await res.json();
    const latency = Date.now() - start;

    lastHealthSnapshot = { ...d, latency };
    updateHealthUI(d, latency);
    initMonitorStream(); // Ensure real-time stream is active
  } catch (err) {
    console.error("Failed to fetch health stats:", err);
    const statusEl = g('h-status');
    if (statusEl) {
      statusEl.textContent = 'OFFLINE';
      statusEl.style.color = 'var(--red)';
    }
  }
}

function updateHealthUI(d, latency) {
  const statusEl = g('h-status');
  if (statusEl) {
    statusEl.textContent = d.status || 'UNKNOWN';
    statusEl.style.color = d.status === 'HEALTHY' ? 'var(--green)' : (d.status === 'WARNING' ? 'var(--accent)' : 'var(--red)');
  }

  if (g('h-datasize')) g('h-datasize').textContent = d.dataSizeMB + ' MB';
  if (g('h-usage')) g('h-usage').textContent = d.storageUsagePercent + '%';
  if (g('h-users')) g('h-users').textContent = d.estimatedMaxUsers;
  if (g('h-memory')) g('h-memory').textContent = d.memoryUsageMB + ' MB';
  if (g('h-uptime')) g('h-uptime').textContent = d.uptimeHours + ' Hrs';
  if (g('h-avgsize')) g('h-avgsize').textContent = d.errorRate || '0%';
  if (g('h-latency')) g('h-latency').textContent = latency + ' ms';

  // Slow Routes
  if (d.slowQueries) {
    const cont = g('slow-routes-container');
    if (d.slowQueries.length === 0) {
      cont.innerHTML = '<div style="padding:20px; color:var(--text3); text-align:center;">No slow routes detected yet</div>';
    } else {
      cont.innerHTML = `
        <table class="records-table">
          <thead><tr><th>Method</th><th>URL</th><th>Duration</th><th>Time</th></tr></thead>
          <tbody>
            ${d.slowQueries.map(q => `
              <tr>
                <td><span class="badge badge-var">${q.method}</span></td>
                <td style="font-family:monospace; font-size:11px;">${q.url}</td>
                <td style="color:var(--red); font-weight:700;">${q.duration}ms</td>
                <td style="color:var(--text3); font-size:10px;">${new Date(q.time).toLocaleTimeString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }

  const sugCard = g('h-suggestions-card');
  const sugCont = g('h-suggestions');
  if (sugCard && sugCont) {
    if (d.suggestions && d.suggestions.length > 0) {
      sugCard.style.display = 'block';
      sugCont.innerHTML = '<ul style="margin-left:15px;">' + d.suggestions.map(s => `<li>${s}</li>`).join('') + '</ul>';
    } else {
      sugCard.style.display = 'none';
    }
  }

  updateCharts(latency, d.systemMemUsagePercent);
}

function initMonitorStream() {
  if (monitorEventSource) return;

  monitorEventSource = new EventSource('/api/monitor/stream');
  monitorEventSource.onmessage = (event) => {
    const stats = JSON.parse(event.data);
    console.log("Live Stats Update:", stats);
  };
}

function updateCharts(latency, memoryUsage) {
  const ctxL = g('latencyChart');
  const ctxM = g('memoryChart');
  if (!ctxL || !ctxM) return;

  if (!latencyChart) {
    latencyChart = new Chart(ctxL, {
      type: 'line',
      data: {
        labels: Array(20).fill(''),
        datasets: [{
          label: 'Latency (ms)',
          data: Array(20).fill(0),
          borderColor: '#5c9fe0',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(92, 159, 224, 0.1)'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  if (!memoryChart) {
    memoryChart = new Chart(ctxM, {
      type: 'line',
      data: {
        labels: Array(20).fill(''),
        datasets: [{
          label: 'RAM %',
          data: Array(20).fill(0),
          borderColor: '#c8a96e',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(200, 169, 110, 0.1)'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
    });
  }

  // Update Latency
  latencyChart.data.datasets[0].data.push(latency);
  latencyChart.data.datasets[0].data.shift();
  latencyChart.update('none');

  // Update Memory
  memoryChart.data.datasets[0].data.push(parseFloat(memoryUsage));
  memoryChart.data.datasets[0].data.shift();
  memoryChart.update('none');

  // Keep history for PPT export (max 20)
  latencyData.push(latency); if (latencyData.length > 20) latencyData.shift();
  memoryData.push(parseFloat(memoryUsage)); if (memoryData.length > 20) memoryData.shift();
}


/**
 * Generate a professional, fully-editable PowerPoint report using native PPT elements.
 */
async function generateHealthPPT() {
  if (!lastHealthSnapshot) {
    alert("Please wait for health data to load first.");
    return;
  }

  const pres = new PptxGenJS();
  const d = lastHealthSnapshot;
  const dateStr = new Date().toLocaleString();

  // 1. TITLE SLIDE
  let s1 = pres.addSlide();
  s1.background = { color: "0B0B0F" };
  s1.addText("DEALTRACK PRO", { x: 0.5, y: 1.5, w: "90%", h: 1, fontSize: 44, color: "C8A96E", bold: true, align: "center" });
  s1.addText("System Capacity & Performance Report", { x: 0.5, y: 2.5, w: "90%", fontSize: 24, color: "E8E6E0", align: "center" });
  s1.addText(`Generated on: ${dateStr}`, { x: 0.5, y: 4.5, w: "90%", fontSize: 14, color: "9E9B92", align: "center" });

  // 2. OVERVIEW SLIDE
  let s2 = pres.addSlide();
  s2.addText("System Overview", { x: 0.5, y: 0.3, fontSize: 28, color: "C8A96E", bold: true });

  const overviewData = [
    ["Metric", "Value"],
    ["System Status", d.status],
    ["Total Records", d.totalRecords.toString()],
    ["Data Size", d.dataSizeMB + " MB"],
    ["Uptime", d.uptimeHours + " Hours"],
    ["Estimated Capacity", d.estimatedMaxUsers + " Concurrent Users"]
  ];
  s2.addTable(overviewData, { x: 0.5, y: 1.2, w: 9, colReq: [3, 6], border: { pt: 1, color: "E8E6E0" }, fill: "F9F9F9", fontSize: 14 });

  // 3. PERFORMANCE METRICS (Editable Charts)
  let s3 = pres.addSlide();
  s3.addText("Performance Trends", { x: 0.5, y: 0.3, fontSize: 28, color: "C8A96E", bold: true });

  const chartLabels = Array(latencyData.length).fill(0).map((_, i) => `Req ${i + 1}`);
  const latencyChartData = [{ name: "Latency (ms)", labels: chartLabels, values: latencyData }];
  s3.addChart(pres.ChartType.bar, latencyChartData, { x: 0.5, y: 1.0, w: 4.2, h: 3.5, showTitle: true, title: "API Latency (ms)", titleColor: "5C9FE0" });

  const memoryChartData = [{ name: "RAM Usage %", labels: chartLabels, values: memoryData }];
  s3.addChart(pres.ChartType.line, memoryChartData, { x: 5.2, y: 1.0, w: 4.2, h: 3.5, showTitle: true, title: "System Memory (%)", titleColor: "C8A96E" });

  // 4. ERROR & SLOW ROUTES
  let s4 = pres.addSlide();
  s4.addText("Reliability & Bottlenecks", { x: 0.5, y: 0.3, fontSize: 28, color: "C8A96E", bold: true });
  s4.addText(`Current Error Rate: ${d.errorRate}`, { x: 0.5, y: 1.0, fontSize: 16, color: "E05C5C", bold: true });

  if (d.slowQueries && d.slowQueries.length > 0) {
    const slowData = [["Method", "Route", "Duration"]];
    d.slowQueries.forEach(q => slowData.push([q.method, q.url, q.duration + "ms"]));
    s4.addText("Slowest API Requests:", { x: 0.5, y: 1.6, fontSize: 14, bold: true });
    s4.addTable(slowData, { x: 0.5, y: 2.0, w: 9, colReq: [1.5, 6, 1.5], fontSize: 11, border: { pt: 0.5, color: "CCCCCC" } });
  }

  // DOWNLOAD
  pres.writeFile({ fileName: `DealTrack_Health_Report_${new Date().getTime()}.pptx` });
}

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────

fetchDeals();      // Fetch deals from backend and populate UI
updateObsText();   // Initialise the dynamic observation spans to ₹0