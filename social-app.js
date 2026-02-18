// ─── MDM Social Media Review Portal · Live Sync via Firebase ─────────────────
// Uses same Firebase project as blog portal — different dbPath keeps data separate
// ─────────────────────────────────────────────────────────────────────────────

// ╔══════════════════════════════════════════════════════════╗
// ║  PASTE YOUR CREDENTIALS HERE — same as blog portal      ║
// ╚══════════════════════════════════════════════════════════╝
const CONFIG = {
  firebaseUrl:       'https://mdm-blog-review-default-rtdb.firebaseio.com/',
  emailjsServiceId:  'service_xgecl1w',
  emailjsTemplateId: 'template_meqaj8u',
  emailjsPublicKey:  'zwPzyjBtAuC3GxZtQ',
  notifyEmail:       'info@thecreatorie.com',
  notifyName:        'MDM Social Review',
  dbPath:            'mdm-social-review-2026',   // separate from blog data
};

const IS_CONFIGURED = CONFIG.firebaseUrl !== 'YOUR_FIREBASE_DATABASE_URL';

// ─── Post registry (populated by each page's inline SOCIAL_POSTS array) ──────
let SOCIAL_POSTS = [];

// ─── State ────────────────────────────────────────────────────────────────────
let _localCache = {};
let _listeners  = [];
let _dbRef      = null;

// ─── Firebase ─────────────────────────────────────────────────────────────────
function initFirebase() {
  if (!IS_CONFIGURED) { loadFromLocalStorage(); return; }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({ databaseURL: CONFIG.firebaseUrl });
    }
    _dbRef = firebase.database().ref(CONFIG.dbPath);
    _dbRef.on('value', snap => {
      _localCache = snap.val() || {};
      notifyListeners();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof refreshPostStatus === 'function') refreshPostStatus();
      updateNavPills();
    });
  } catch (e) {
    console.warn('[Social] Firebase failed, using localStorage.', e);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  try { _localCache = JSON.parse(localStorage.getItem('mdm_social_2026') || '{}'); } catch { _localCache = {}; }
  notifyListeners();
  if (typeof renderDashboard === 'function') renderDashboard();
  updateNavPills();
}

function saveToLocalStorage() {
  localStorage.setItem('mdm_social_2026', JSON.stringify(_localCache));
}

// ─── Data ─────────────────────────────────────────────────────────────────────
function getPostData(id) {
  return _localCache[id] || { status: 'pending', comment: '' };
}

async function setPostData(id, status, comment) {
  const prev   = getPostData(id);
  const record = { status, comment: comment || '', updatedAt: new Date().toISOString() };
  _localCache[id] = record;
  if (IS_CONFIGURED && _dbRef) {
    try { await _dbRef.child(String(id)).set(record); }
    catch (e) { saveToLocalStorage(); }
  } else { saveToLocalStorage(); }
  if (status !== 'pending' && status !== prev.status) sendEmailNotification(id, status, comment);
}

// ─── Counts ───────────────────────────────────────────────────────────────────
function getCounts() {
  const c = { approved:0, needs:0, rejected:0, pending:0 };
  SOCIAL_POSTS.forEach(p => {
    const s = (_localCache[p.id] || {}).status || 'pending';
    c[s] = (c[s] || 0) + 1;
  });
  return c;
}

function addListener(fn) { _listeners.push(fn); }
function notifyListeners() { _listeners.forEach(fn => fn(_localCache)); }

// ─── Email ────────────────────────────────────────────────────────────────────
async function sendEmailNotification(postId, status, comment) {
  if (!IS_CONFIGURED || CONFIG.emailjsPublicKey === 'YOUR_EMAILJS_PUBLIC_KEY') return;
  const post = SOCIAL_POSTS.find(p => p.id === postId);
  if (!post) return;
  const statusLabel = { approved:'✓ Approved', needs:'⚠ Needs Changes', rejected:'✕ Rejected' }[status] || status;
  try {
    await emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
      to_email:    CONFIG.notifyEmail,
      to_name:     CONFIG.notifyName,
      post_title:  post.caption ? post.caption.slice(0,60) + '…' : 'Social Post #' + postId,
      post_date:   post.postDate || '',
      post_status: statusLabel,
      comment:     comment || '(no note)',
      portal_url:  window.location.origin + '/social-index.html',
    });
  } catch(e) { console.warn('[Social] Email failed:', e); }
}

// ─── Nav pills ────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function updateNavPills() {
  const c = getCounts();
  if (el('pill-approved')) el('pill-approved').textContent = c.approved + ' ✓';
  if (el('pill-needs'))    el('pill-needs').textContent    = c.needs    + ' ⚠';
  if (el('pill-rejected')) el('pill-rejected').textContent = c.rejected + ' ✕';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(type) {
  let t = document.getElementById('mdm-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'mdm-toast';
    t.style.cssText = `position:fixed;bottom:90px;right:20px;z-index:9999;
      font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;
      letter-spacing:.4em;text-transform:uppercase;padding:11px 18px;
      border:1px solid;opacity:0;transition:opacity .3s;pointer-events:none;
      border-radius:2px;box-shadow:0 4px 24px rgba(0,0,0,.4);`;
    document.body.appendChild(t);
  }
  const s = {
    approved:{ bg:'#152218',bd:'#2A6040',txt:'#52C878',msg:'Approved ✓' },
    needs:   { bg:'#221A08',bd:'#6A5010',txt:'#E8B840',msg:'Flagged for Changes ⚠' },
    rejected:{ bg:'#200C0C',bd:'#6A1818',txt:'#E05050',msg:'Rejected ✕' },
    pending: { bg:'#1E1D21',bd:'#2A2830',txt:'#5A5660',msg:'Status Cleared' },
    comment: { bg:'#17161A',bd:'#C4A96A',txt:'#C4A96A',msg:'Note Saved' },
    saved:   { bg:'#17161A',bd:'#C4A96A',txt:'#C4A96A',msg:'Version Saved ✓' },
    synced:  { bg:'#0A1520',bd:'#1A4060',txt:'#40A0D8',msg:'Synced Live ↑' },
  }[type] || { bg:'#1A1917',bd:'#3A3838',txt:'#888',msg:'' };
  Object.assign(t.style, { background:s.bg, borderColor:s.bd, color:s.txt });
  t.textContent = s.msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 2400);
}

// ─── FAB actions ──────────────────────────────────────────────────────────────
async function fabAction(postId, action) {
  const prev      = getPostData(postId).status;
  const newStatus = (prev === action) ? 'pending' : action;
  const comment   = document.getElementById('fab-textarea')?.value || '';
  await setPostData(postId, newStatus, comment);
  document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
  if (newStatus !== 'pending') {
    document.querySelector(`.fab-btn[data-action="${action}"]`)?.classList.add('active');
  }
  updateStatusBadge(postId, newStatus);
  showToast(newStatus);
  if (IS_CONFIGURED) setTimeout(() => showToast('synced'), 600);

  // Auto-post discussion note for the status change
  const nameEl = document.getElementById('commenter-name');
  const name   = (nameEl && nameEl.value.trim()) || 'Reviewer';
  const labels = { approved:'✓ Approved this post', needs:'⚠ Flagged for changes', rejected:'✕ Rejected this post', pending:'↺ Reset to pending' };
  const record = { author:name, text:labels[newStatus]||newStatus, status:newStatus!=='pending'?newStatus:null, ts:new Date().toISOString() };
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath + '-comments/' + postId).push(record);
  }
}

function toggleCommentBox() {
  document.getElementById('fab-comment-box')?.classList.toggle('open');
}

async function fabSaveNote(postId) {
  const ta     = document.getElementById('fab-textarea');
  const nameEl = document.getElementById('commenter-name');
  const text   = ta ? ta.value.trim() : '';
  if (!text) { toggleCommentBox(); return; }
  const name   = (nameEl && nameEl.value.trim()) || 'MDM Team';
  const d      = getPostData(postId);
  await setPostData(postId, d.status || 'pending', text);
  const record = { author:name, text, status:d.status!=='pending'?d.status:null, ts:new Date().toISOString() };
  if (IS_CONFIGURED && _dbRef) await firebase.database().ref(CONFIG.dbPath + '-comments/' + postId).push(record);
  if (ta) ta.value = '';
  toggleCommentBox();
  showToast('comment');
}

function updateStatusBadge(postId, status) {
  const badge = document.getElementById('status-badge');
  if (!badge) return;
  badge.className = 'status-badge ' + status;
  const labels = { pending:'Pending Review', approved:'Approved', needs:'Needs Changes', rejected:'Rejected' };
  badge.querySelector('.badge-text').textContent = labels[status] || 'Pending Review';
}

function initPostPage(postId) {
  const d = getPostData(postId);
  updateStatusBadge(postId, d.status);
  if (d.status !== 'pending') document.querySelector(`.fab-btn[data-action="${d.status}"]`)?.classList.add('active');
  const ta = document.getElementById('fab-textarea');
  if (ta && d.comment) ta.value = d.comment;
  updateNavPills();
  addListener(() => {
    const fresh = getPostData(postId);
    updateStatusBadge(postId, fresh.status);
    document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
    if (fresh.status !== 'pending') document.querySelector(`.fab-btn[data-action="${fresh.status}"]`)?.classList.add('active');
    updateNavPills();
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────
function loadComments(postId) {
  if (!IS_CONFIGURED || !_dbRef) { renderComments([]); return; }
  firebase.database().ref(CONFIG.dbPath + '-comments/' + postId).on('value', snap => {
    const data = snap.val() || {};
    const list = Object.values(data).sort((a,b) => new Date(a.ts) - new Date(b.ts));
    renderComments(list);
  });
}

function renderComments(comments) {
  const el     = document.getElementById('comments-list');
  const noMsg  = document.getElementById('no-comments-msg');
  if (!el) return;
  el.querySelectorAll('.comment-item').forEach(c => c.remove());
  if (!comments.length) { if (noMsg) noMsg.style.display = ''; return; }
  if (noMsg) noMsg.style.display = 'none';
  comments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment-item' + (c.status && c.status !== 'pending' ? ' highlight' : '');
    const stag = c.status && c.status !== 'pending'
      ? `<span class="comment-status-tag ${c.status}">${{approved:'✓ Approved',needs:'⚠ Changes',rejected:'✕ Rejected'}[c.status]||c.status}</span>` : '';
    const ts = new Date(c.ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    div.innerHTML = `<div class="comment-meta"><span class="comment-author">${c.author||'Anonymous'}</span><span class="comment-time">${ts}</span>${stag}</div><div class="comment-body">${c.text}</div>`;
    el.appendChild(div);
  });
}

async function submitComment(postId) {
  const nameEl = document.getElementById('commenter-name');
  const textEl = document.getElementById('comment-text');
  const name   = (nameEl?.value||'').trim() || 'Anonymous';
  const text   = (textEl?.value||'').trim();
  if (!text) return;
  const record = { author:name, text, status:null, ts:new Date().toISOString() };
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath + '-comments/' + postId).push(record);
  } else { renderComments([record]); }
  if (textEl) textEl.value = '';
  showToast('comment');
}

// ─── Version History ──────────────────────────────────────────────────────────
let _editingMode    = false;
let _originalData   = {};
let _pendingRestore = null;

function loadVersionHistory(postId) {
  if (!IS_CONFIGURED || !_dbRef) {
    const key = 'mdm_social_versions_' + postId;
    renderVersionHistory(JSON.parse(localStorage.getItem(key)||'[]'), postId);
    return;
  }
  firebase.database().ref(CONFIG.dbPath + '-versions/' + postId).on('value', snap => {
    const data = snap.val() || {};
    const list = Object.entries(data).map(([k,v])=>({...v,_key:k})).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    renderVersionHistory(list, postId);
  });
  // Live content updates from other editors
  firebase.database().ref(CONFIG.dbPath + '-content/' + postId).on('value', snap => {
    const data = snap.val();
    if (data && !_editingMode) applyLiveContent(data);
  });
}

function applyLiveContent(data) {
  // Update editable fields from live Firebase data
  const fields = ['caption','location','tags','hashtags','postDate','postTime','mediaType'];
  fields.forEach(f => {
    const el = document.getElementById('field-' + f);
    if (el && data[f] !== undefined) el.value = data[f];
  });
  const previewCaption = document.getElementById('preview-caption');
  if (previewCaption && data.caption) previewCaption.textContent = data.caption;
}

function renderVersionHistory(versions, postId) {
  const list  = document.getElementById('vh-list');
  const empty = document.getElementById('vh-empty');
  const count = document.getElementById('vh-count');
  if (!list) return;
  list.querySelectorAll('.vh-entry').forEach(e => e.remove());
  if (!versions.length) {
    if (empty) empty.style.display = '';
    if (count) count.textContent = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (count) count.textContent = '(' + versions.length + ')';
  versions.forEach((v, i) => {
    const div  = document.createElement('div');
    div.className = 'vh-entry';
    const ts   = new Date(v.ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    const isCur = i === 0;
    div.innerHTML = `
      <div class="vh-entry-meta">
        <span class="vh-entry-time">${ts}</span>
        <span class="vh-entry-author">Saved by ${v.author||'Editor'}</span>
        <div class="vh-entry-preview">${v.preview||''}</div>
      </div>
      ${isCur
        ? '<span class="vh-current-badge">Current</span>'
        : `<button class="vh-restore-btn" onclick='openRestoreModal(${JSON.stringify(v).replace(/'/g,"&#39;")},${postId})'>Restore</button>`}
    `;
    list.appendChild(div);
  });
}

function toggleVH() {
  document.getElementById('vh-list')?.classList.toggle('open');
  document.getElementById('vh-toggle')?.classList.toggle('open');
}

function toggleEditor() {
  if (_editingMode) { cancelEdit(); return; }
  _editingMode = true;
  // Snapshot current field values
  _originalData = getCurrentFieldValues();
  document.querySelectorAll('.social-field').forEach(f => f.removeAttribute('disabled'));
  document.querySelectorAll('.media-drop-zone').forEach(z => z.classList.add('active-drop'));
  document.getElementById('edit-mode-badge')?.classList.add('editing');
  document.getElementById('edit-mode-badge').textContent = 'Editing';
  document.getElementById('edit-toggle-btn').style.display = 'none';
  document.getElementById('edit-save-btn').style.display = '';
  document.getElementById('edit-cancel-btn').style.display = '';
  document.getElementById('editor-toolbar')?.classList.add('visible');
}

function cancelEdit() {
  _editingMode = false;
  restoreFieldValues(_originalData);
  document.querySelectorAll('.social-field').forEach(f => f.setAttribute('disabled',''));
  document.querySelectorAll('.media-drop-zone').forEach(z => z.classList.remove('active-drop'));
  document.getElementById('edit-mode-badge')?.classList.remove('editing');
  document.getElementById('edit-mode-badge').textContent = 'Read Only';
  document.getElementById('edit-toggle-btn').style.display = '';
  document.getElementById('edit-save-btn').style.display = 'none';
  document.getElementById('edit-cancel-btn').style.display = 'none';
  document.getElementById('editor-toolbar')?.classList.remove('visible');
}

function getCurrentFieldValues() {
  const out = {};
  document.querySelectorAll('.social-field').forEach(f => { out[f.id.replace('field-','')] = f.value; });
  return out;
}

function restoreFieldValues(data) {
  Object.entries(data).forEach(([k,v]) => {
    const el = document.getElementById('field-' + k);
    if (el) el.value = v;
  });
  syncPreview();
}

async function saveEdit(postId) {
  const data   = getCurrentFieldValues();
  const nameEl = document.getElementById('commenter-name');
  const author = (nameEl?.value.trim()) || 'Editor';
  const preview = (data.caption||'').slice(0,120) + '…';
  const version = { ...data, author, ts:new Date().toISOString(), preview };

  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath + '-versions/' + postId).push(version);
    await firebase.database().ref(CONFIG.dbPath + '-content/'  + postId).set(version);
  } else {
    const key      = 'mdm_social_versions_' + postId;
    const existing = JSON.parse(localStorage.getItem(key)||'[]');
    existing.unshift(version);
    localStorage.setItem(key, JSON.stringify(existing));
    renderVersionHistory(existing, postId);
  }

  _originalData = data;
  cancelEdit();
  showToast('saved');

  const record = { author, text:'✎ Post details edited and saved as new version', status:null, ts:version.ts };
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath + '-comments/' + postId).push(record);
  }
}

function openRestoreModal(version, postId) {
  _pendingRestore = { version, postId };
  const pre = document.getElementById('restore-preview');
  if (!pre) return;
  pre.innerHTML = `
    <div class="restore-field-row"><span class="rfr-label">Caption</span><p class="rfr-val">${version.caption||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Location</span><p class="rfr-val">${version.location||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Tags</span><p class="rfr-val">${version.tags||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Hashtags</span><p class="rfr-val">${version.hashtags||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Post Date</span><p class="rfr-val">${version.postDate||'—'} ${version.postTime||''}</p></div>
  `;
  document.getElementById('restore-modal')?.classList.add('open');
}

function closeRestoreModal() {
  _pendingRestore = null;
  document.getElementById('restore-modal')?.classList.remove('open');
}

async function confirmRestore() {
  if (!_pendingRestore) return;
  const { version, postId } = _pendingRestore;
  restoreFieldValues(version);
  const nameEl = document.getElementById('commenter-name');
  const author = (nameEl?.value.trim()||'Editor') + ' (restored)';
  const newVer = { ...version, author, ts:new Date().toISOString() };
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath + '-versions/' + postId).push(newVer);
    await firebase.database().ref(CONFIG.dbPath + '-content/'  + postId).set(newVer);
  }
  closeRestoreModal();
  showToast('saved');
  _originalData = getCurrentFieldValues();
}

// ─── Live preview sync ────────────────────────────────────────────────────────
function syncPreview() {
  const caption = document.getElementById('field-caption')?.value || '';
  const loc     = document.getElementById('field-location')?.value || '';
  const tags    = document.getElementById('field-tags')?.value || '';
  const hashes  = document.getElementById('field-hashtags')?.value || '';
  const el1     = document.getElementById('preview-caption');
  const el2     = document.getElementById('preview-location');
  const el3     = document.getElementById('preview-tags');
  const el4     = document.getElementById('preview-hashtags');
  if (el1) el1.textContent = caption;
  if (el2) el2.textContent = loc ? '📍 ' + loc : '';
  if (el3) el3.innerHTML   = tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="tag-chip">@${t.replace(/^@/,'')}</span>`).join('');
  if (el4) el4.innerHTML   = hashes.split(/[\s,]+/).filter(Boolean).map(h=>`<span class="hash-chip">${h.startsWith('#')?h:'#'+h}</span>`).join(' ');
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  SOCIAL_POSTS.forEach(post => {
    const row = document.getElementById('row-' + post.id);
    if (!row) return;
    const d     = _localCache[post.id] || { status:'pending', comment:'' };
    row.setAttribute('data-status', d.status);
    const badge = row.querySelector('.dash-status');
    if (badge) {
      badge.className = 'dash-status status-badge ' + d.status;
      const labels = { pending:'Pending', approved:'Approved', needs:'Changes', rejected:'Rejected' };
      badge.querySelector('.badge-text').textContent = labels[d.status]||'Pending';
    }
    const ci = row.querySelector('.dash-comment');
    if (ci) { ci.textContent = d.comment ? '💬' : ''; ci.title = d.comment||''; }
  });
  updateCounts();
  updateNavPills();
}

function updateCounts() {
  const c       = getCounts();
  const total   = SOCIAL_POSTS.length;
  const reviewed = c.approved + c.needs + c.rejected;
  const pct     = total ? Math.round((reviewed/total)*100) : 0;
  const bar     = document.getElementById('progress-bar-fill');
  const pctEl   = document.getElementById('progress-pct');
  if (bar)   bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  ['approved','needs','rejected','pending'].forEach(s => {
    const el2 = document.getElementById('count-' + s);
    if (el2) el2.textContent = c[s];
  });
}

// ─── Media helpers ────────────────────────────────────────────────────────────
function handleMediaDrop(event, slotId) {
  event.preventDefault();
  if (!_editingMode) return;
  const files = Array.from(event.dataTransfer?.files || event.target?.files || []);
  if (!files.length) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const slot   = document.getElementById(slotId);
      const isVid  = file.type.startsWith('video/');
      const el     = isVid ? document.createElement('video') : document.createElement('img');
      el.src       = e.target.result;
      el.style.cssText = 'max-width:100%;max-height:240px;object-fit:cover;border-radius:2px;';
      if (isVid) { el.controls = true; el.loop = true; }
      if (slot) { slot.innerHTML = ''; slot.appendChild(el); }
    };
    reader.readAsDataURL(file);
  });
}

function handleDragOver(event) {
  event.preventDefault();
  if (_editingMode) event.currentTarget.classList.add('drag-over');
}
function handleDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportSummary() {
  const lines = ['MDM Design Studio — Social Media Review Summary','='.repeat(50),'',
    `Generated: ${new Date().toLocaleString('en-US',{dateStyle:'long',timeStyle:'short'})}`, ''];
  const groups = { approved:[], needs:[], rejected:[], pending:[] };
  SOCIAL_POSTS.forEach(p => {
    const d = _localCache[p.id] || { status:'pending', comment:'' };
    groups[d.status||'pending'].push({ ...p, comment:d.comment||'' });
  });
  [['approved','APPROVED'],['needs','NEEDS CHANGES'],['rejected','REJECTED'],['pending','PENDING REVIEW']].forEach(([key,label]) => {
    if (!groups[key].length) return;
    lines.push(`${label} (${groups[key].length})`);
    lines.push('-'.repeat(40));
    groups[key].forEach(p => {
      lines.push(`[${String(p.id).padStart(2,'0')}] ${p.platform} · ${p.postDate||'TBD'}`);
      lines.push(`     Caption: ${(p.caption||'').slice(0,80)}`);
      if (p.comment) lines.push(`     Note: ${p.comment}`);
    });
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], { type:'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'MDM_Social_Review_Summary.txt';
  a.click();
}
