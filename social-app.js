// ─── MDM Social Review Portal · Full Firebase Live Sync ──────────────────────
// Architecture:
//   CONFIG.dbPath                  → approval status (per post)
//   CONFIG.dbPath-live/{postId}    → live keystroke broadcast (clears on save/cancel)
//   CONFIG.dbPath-content/{postId} → last saved field values (loaded on page open)
//   CONFIG.dbPath-versions/{postId}→ named version snapshots
//   CONFIG.dbPath-comments/{postId}→ discussion notes
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  firebaseUrl:       'https://mdm-blog-review-default-rtdb.firebaseio.com/',
  emailjsServiceId:  'service_xgecl1w',
  emailjsTemplateId: 'template_meqaj8u',
  emailjsPublicKey:  'zwPzyjBtAuC3GxZtQ',
  notifyEmail:       'info@thecreatorie.com',
  notifyName:        'MDM Social Review',
  dbPath:            'mdm-social-review-2026',
};

const IS_CONFIGURED = CONFIG.firebaseUrl !== 'YOUR_FIREBASE_DATABASE_URL';

// ─── Global state ─────────────────────────────────────────────────────────────
let SOCIAL_POSTS    = [];
let _localCache     = {};
let _listeners      = [];
let _dbRef          = null;
let _editingMode    = false;
let _originalData   = {};
let _pendingRestore = null;
let _liveDebounce   = null;
let _bannerTimer    = null;
let _mySession      = Math.random().toString(36).slice(2, 9); // unique tab ID

// ─── Firebase init ────────────────────────────────────────────────────────────
function initFirebase() {
  if (!IS_CONFIGURED) { _loadLocal(); return; }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({ databaseURL: CONFIG.firebaseUrl });
    }
    _dbRef = firebase.database().ref(CONFIG.dbPath);
    // Live approval-status listener — reflects status changes from any device instantly
    _dbRef.on('value', snap => {
      _localCache = snap.val() || {};
      notifyListeners();
      if (typeof renderDashboard === 'function') renderDashboard();
      updateNavPills();
    });
    console.log('[MDM Social] Firebase live sync active.');
  } catch(e) {
    console.warn('[MDM Social] Firebase failed → localStorage fallback', e);
    _loadLocal();
  }
}

function _loadLocal() {
  try { _localCache = JSON.parse(localStorage.getItem('mdm_social_2026') || '{}'); } catch { _localCache = {}; }
  notifyListeners();
  if (typeof renderDashboard === 'function') renderDashboard();
  updateNavPills();
}
function _saveLocal() { localStorage.setItem('mdm_social_2026', JSON.stringify(_localCache)); }

// ─── Approval status ──────────────────────────────────────────────────────────
function getPostData(id) { return _localCache[id] || { status:'pending', comment:'' }; }

async function setPostData(id, status, comment) {
  const prev   = getPostData(id);
  const record = { status, comment: comment||'', updatedAt: new Date().toISOString() };
  _localCache[id] = record;
  if (IS_CONFIGURED && _dbRef) {
    try { await _dbRef.child(String(id)).set(record); } catch { _saveLocal(); }
  } else { _saveLocal(); }
  if (status !== 'pending' && status !== prev.status) _sendEmail(id, status, comment);
}

function getCounts() {
  const c = { approved:0, needs:0, rejected:0, pending:0 };
  SOCIAL_POSTS.forEach(p => { const s = (_localCache[p.id]||{}).status||'pending'; c[s]=(c[s]||0)+1; });
  return c;
}

function addListener(fn) { _listeners.push(fn); }
function notifyListeners() { _listeners.forEach(fn => fn(_localCache)); }

// ─── Email ────────────────────────────────────────────────────────────────────
async function _sendEmail(postId, status, comment) {
  if (!IS_CONFIGURED || CONFIG.emailjsPublicKey === 'YOUR_EMAILJS_PUBLIC_KEY') return;
  const post = SOCIAL_POSTS.find(p => p.id === postId);
  if (!post) return;
  try {
    await emailjs.send(CONFIG.emailjsServiceId, CONFIG.emailjsTemplateId, {
      to_email: CONFIG.notifyEmail, to_name: CONFIG.notifyName,
      post_title:  (post.caption||'Post #'+postId).slice(0,60)+'…',
      post_date:   post.postDate||'',
      post_status: {approved:'✓ Approved',needs:'⚠ Needs Changes',rejected:'✕ Rejected'}[status]||status,
      comment:     comment||'(no note)',
      portal_url:  window.location.origin+'/social-index.html',
    });
  } catch(e) { console.warn('[MDM Social] Email failed:', e); }
}

// ─── Nav pills ────────────────────────────────────────────────────────────────
function $e(id) { return document.getElementById(id); }

function updateNavPills() {
  const c = getCounts();
  if ($e('pill-approved')) $e('pill-approved').textContent = c.approved+' ✓';
  if ($e('pill-needs'))    $e('pill-needs').textContent    = c.needs+' ⚠';
  if ($e('pill-rejected')) $e('pill-rejected').textContent = c.rejected+' ✕';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(type) {
  let t = $e('mdm-toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'mdm-toast';
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
    live:    { bg:'#0A1520',bd:'#1A4060',txt:'#40A0D8',msg:'Live Update ↓' },
    synced:  { bg:'#0A1520',bd:'#1A4060',txt:'#40A0D8',msg:'Synced ↑' },
  }[type] || { bg:'#1A1917',bd:'#3A3838',txt:'#888',msg:'' };
  Object.assign(t.style, { background:s.bg, borderColor:s.bd, color:s.txt });
  t.textContent = s.msg; t.style.opacity = '1';
  clearTimeout(t._t); t._t = setTimeout(() => t.style.opacity='0', 2200);
}

// ─── FAB: approve / needs / reject ───────────────────────────────────────────
async function fabAction(postId, action) {
  const prev      = getPostData(postId).status;
  const newStatus = (prev === action) ? 'pending' : action;
  const comment   = $e('fab-textarea')?.value || '';
  await setPostData(postId, newStatus, comment);
  document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
  if (newStatus !== 'pending') document.querySelector(`.fab-btn[data-action="${action}"]`)?.classList.add('active');
  updateStatusBadge(postId, newStatus);
  showToast(newStatus);
  if (IS_CONFIGURED) setTimeout(() => showToast('synced'), 700);
  const name = $e('commenter-name')?.value.trim() || 'Reviewer';
  const labels = { approved:'✓ Approved this post', needs:'⚠ Flagged for changes', rejected:'✕ Rejected this post', pending:'↺ Reset to pending' };
  await _pushComment(postId, { author:name, text:labels[newStatus]||newStatus, status:newStatus!=='pending'?newStatus:null, ts:new Date().toISOString() });
}

function toggleCommentBox() { $e('fab-comment-box')?.classList.toggle('open'); }

async function fabSaveNote(postId) {
  const ta   = $e('fab-textarea');
  const text = ta?.value.trim();
  if (!text) { toggleCommentBox(); return; }
  const name = $e('commenter-name')?.value.trim() || 'MDM Team';
  const d    = getPostData(postId);
  await setPostData(postId, d.status||'pending', text);
  await _pushComment(postId, { author:name, text, status:d.status!=='pending'?d.status:null, ts:new Date().toISOString() });
  if (ta) ta.value = '';
  toggleCommentBox();
  showToast('comment');
}

function updateStatusBadge(postId, status) {
  const badge = $e('status-badge');
  if (!badge) return;
  badge.className = 'status-badge '+status;
  const labels = { pending:'Pending Review', approved:'Approved', needs:'Needs Changes', rejected:'Rejected' };
  badge.querySelector('.badge-text').textContent = labels[status]||'Pending Review';
}

function initPostPage(postId) {
  const d = getPostData(postId);
  updateStatusBadge(postId, d.status);
  if (d.status !== 'pending') document.querySelector(`.fab-btn[data-action="${d.status}"]`)?.classList.add('active');
  const ta = $e('fab-textarea');
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
async function _pushComment(postId, record) {
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath+'-comments/'+postId).push(record);
  }
}

function loadComments(postId) {
  if (!IS_CONFIGURED || !_dbRef) { renderComments([]); return; }
  firebase.database().ref(CONFIG.dbPath+'-comments/'+postId).on('value', snap => {
    const vals = Object.values(snap.val()||{}).sort((a,b) => new Date(a.ts)-new Date(b.ts));
    renderComments(vals);
  });
}

function renderComments(comments) {
  const listEl = $e('comments-list');
  const noMsg  = $e('no-comments-msg');
  if (!listEl) return;
  listEl.querySelectorAll('.comment-item').forEach(c => c.remove());
  if (!comments.length) { if (noMsg) noMsg.style.display=''; return; }
  if (noMsg) noMsg.style.display = 'none';
  comments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment-item'+(c.status && c.status!=='pending' ? ' highlight' : '');
    const stag = c.status && c.status!=='pending'
      ? `<span class="comment-status-tag ${c.status}">${{approved:'✓ Approved',needs:'⚠ Changes',rejected:'✕ Rejected'}[c.status]||c.status}</span>` : '';
    const ts = new Date(c.ts).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    div.innerHTML = `<div class="comment-meta"><span class="comment-author">${c.author||'Anonymous'}</span><span class="comment-time">${ts}</span>${stag}</div><div class="comment-body">${c.text}</div>`;
    listEl.appendChild(div);
  });
}

async function submitComment(postId) {
  const nameEl = $e('commenter-name') || $e('comment-name-disc');
  const textEl = $e('comment-text');
  const name   = (nameEl?.value||'').trim() || 'Anonymous';
  const text   = (textEl?.value||'').trim();
  if (!text) return;
  await _pushComment(postId, { author:name, text, status:null, ts:new Date().toISOString() });
  if (textEl) textEl.value = '';
  showToast('comment');
  await _sendEmail(postId, '💬 New Note', name + ' left a note: "' + text.slice(0,140) + '"');
}

// ─── LIVE KEYSTROKE SYNC ──────────────────────────────────────────────────────
// Called on every field input event. Debounces 400ms then pushes to Firebase.
// Other open tabs receive it via _watchLive() and see the update instantly.
function onFieldInput(postId) {
  if (!_editingMode) return;
  syncPreview(); // local update immediately
  clearTimeout(_liveDebounce);
  _liveDebounce = setTimeout(() => _broadcastLive(postId), 400);
}

async function _broadcastLive(postId) {
  if (!IS_CONFIGURED || !_dbRef) return;
  const data = _getFields();
  data._session = _mySession;
  data._editor  = $e('commenter-name')?.value.trim() || 'Editor';
  data._ts      = new Date().toISOString();
  try {
    await firebase.database().ref(CONFIG.dbPath+'-live/'+postId).set(data);
  } catch {}
}

async function _clearLive(postId) {
  if (!IS_CONFIGURED || !_dbRef) return;
  try { await firebase.database().ref(CONFIG.dbPath+'-live/'+postId).remove(); } catch {}
}

// Subscribe: watch for live edits coming from OTHER tabs/devices
function _watchLive(postId) {
  if (!IS_CONFIGURED || !_dbRef) return;
  firebase.database().ref(CONFIG.dbPath+'-live/'+postId).on('value', snap => {
    const data = snap.val();
    if (!data) { _hideBanner(); return; }
    if (data._session === _mySession) return; // ignore my own broadcast
    if (_editingMode) return;                  // don't overwrite while I'm editing
    _applyFields(data);
    _showBanner(data._editor || 'Someone');
    showToast('live');
  });
}

// "X is editing…" floating banner
function _showBanner(name) {
  let b = $e('live-edit-banner');
  if (!b) {
    b = document.createElement('div'); b.id = 'live-edit-banner';
    b.style.cssText = `position:fixed;top:98px;left:50%;transform:translateX(-50%);z-index:600;
      font-family:'Montserrat',sans-serif;font-size:10px;font-weight:600;letter-spacing:.35em;
      text-transform:uppercase;padding:7px 20px;background:#0A1520;border:1px solid #1A4060;
      color:#40A0D8;border-radius:2px;box-shadow:0 4px 20px rgba(0,0,0,.5);
      transition:opacity .4s;pointer-events:none;white-space:nowrap;`;
    document.body.appendChild(b);
  }
  b.textContent = `✎ ${name} is editing…`;
  b.style.opacity = '1';
  clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(_hideBanner, 5000);
}
function _hideBanner() { const b=$e('live-edit-banner'); if(b) b.style.opacity='0'; }

// ─── Content: load latest saved content on page open ─────────────────────────
function _loadContent(postId) {
  if (!IS_CONFIGURED || !_dbRef) return;
  // Load last saved content so page shows most recent approved edits
  firebase.database().ref(CONFIG.dbPath+'-content/'+postId).once('value', snap => {
    const data = snap.val();
    if (data && !_editingMode) _applyFields(data);
  });
  // Start watching live edits from others
  _watchLive(postId);
}

function _applyFields(data) {
  const fields = ['caption','location','tags','hashtags','postDate','postTime','mediaType','altText','timezone'];
  fields.forEach(f => {
    const el = $e('field-'+f);
    if (el && data[f] !== undefined) el.value = data[f];
  });
  syncPreview(); // cascade to phone preview
}

// ─── Version History ──────────────────────────────────────────────────────────
function loadVersionHistory(postId) {
  _loadContent(postId); // load latest + start live watcher
  if (!IS_CONFIGURED || !_dbRef) {
    const key = 'mdm_social_v_'+postId;
    _renderVH(JSON.parse(localStorage.getItem(key)||'[]'), postId);
    return;
  }
  firebase.database().ref(CONFIG.dbPath+'-versions/'+postId).on('value', snap => {
    const list = Object.entries(snap.val()||{})
      .map(([k,v]) => ({...v,_key:k}))
      .sort((a,b) => new Date(b.ts)-new Date(a.ts));
    _renderVH(list, postId);
  });
}

function _renderVH(versions, postId) {
  const list  = $e('vh-list');
  const empty = $e('vh-empty');
  const count = $e('vh-count');
  if (!list) return;
  list.querySelectorAll('.vh-entry').forEach(e => e.remove());
  if (!versions.length) { if(empty) empty.style.display=''; if(count) count.textContent=''; return; }
  if (empty) empty.style.display = 'none';
  if (count) count.textContent = '('+versions.length+')';
  versions.forEach((v,i) => {
    const div = document.createElement('div');
    div.className = 'vh-entry';
    const ts = new Date(v.ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    div.innerHTML = `
      <div class="vh-entry-meta">
        <span class="vh-entry-time">${ts}</span>
        <span class="vh-entry-author">by ${v.author||v.editor||'Editor'}</span>
        <div class="vh-entry-preview">${(v.caption||v.preview||'').slice(0,90)}</div>
      </div>
      ${i===0 ? '<span class="vh-current-badge">Current</span>'
               : `<button class="vh-restore-btn" onclick='openRestoreModal(${JSON.stringify(v).replace(/'/g,"&#39;")},${postId})'>Restore</button>`}`;
    list.appendChild(div);
  });
}

function toggleVH() {
  $e('vh-list')?.classList.toggle('open');
  $e('vh-toggle')?.classList.toggle('open');
}

// ─── Editor: open / cancel / save ────────────────────────────────────────────
function toggleEditor() {
  if (_editingMode) { cancelEdit(); return; }
  _editingMode  = true;
  _originalData = _getFields();
  document.querySelectorAll('.social-field').forEach(f => f.removeAttribute('disabled'));
  document.querySelectorAll('.media-drop-zone input[type=file]').forEach(f => f.removeAttribute('disabled'));
  document.querySelectorAll('.media-drop-zone').forEach(z => z.classList.add('active-drop'));
  const b = $e('edit-mode-badge');
  if (b) { b.classList.add('editing'); b.textContent='Editing'; }
  $e('edit-toggle-btn').style.display = 'none';
  $e('edit-save-btn').style.display   = '';
  $e('edit-cancel-btn').style.display = '';
}

function cancelEdit(postId) {
  _editingMode = false;
  _setFields(_originalData);
  document.querySelectorAll('.social-field').forEach(f => f.setAttribute('disabled',''));
  document.querySelectorAll('.media-drop-zone input[type=file]').forEach(f => f.setAttribute('disabled',''));
  document.querySelectorAll('.media-drop-zone').forEach(z => z.classList.remove('active-drop','drag-over'));
  const b = $e('edit-mode-badge');
  if (b) { b.classList.remove('editing'); b.textContent='Read Only'; }
  $e('edit-toggle-btn').style.display = '';
  $e('edit-save-btn').style.display   = 'none';
  $e('edit-cancel-btn').style.display = 'none';
  clearTimeout(_liveDebounce);
  if (postId) _clearLive(postId);
}

async function saveEdit(postId) {
  const data   = _getFields();
  const author = $e('commenter-name')?.value.trim() || 'Editor';
  const version = { ...data, author, ts:new Date().toISOString(), preview:(data.caption||'').slice(0,120)+'…' };
  if (IS_CONFIGURED && _dbRef) {
    // Write canonical content (what others load on page open)
    await firebase.database().ref(CONFIG.dbPath+'-content/'+postId).set(version);
    // Add to version history
    await firebase.database().ref(CONFIG.dbPath+'-versions/'+postId).push(version);
    // Clear the live-editing node → banner disappears for watchers
    await _clearLive(postId);
  } else {
    const key = 'mdm_social_v_'+postId;
    const ex  = JSON.parse(localStorage.getItem(key)||'[]');
    ex.unshift(version); localStorage.setItem(key, JSON.stringify(ex));
    _renderVH(ex, postId);
  }
  _originalData = data;
  cancelEdit(postId);
  showToast('saved');
  await _pushComment(postId, { author, text:'✎ Post details edited and saved as new version', status:null, ts:version.ts });
  await _sendEmail(postId, '✎ Edited', 'Caption/details updated by ' + author + '. Preview: ' + (data.caption||'').slice(0,140));
}

function _getFields() {
  const out = {};
  document.querySelectorAll('.social-field').forEach(f => { out[f.id.replace('field-','')] = f.value; });
  return out;
}

function _setFields(data) {
  Object.entries(data).forEach(([k,v]) => { const el=$e('field-'+k); if(el) el.value=v; });
  syncPreview();
}

// ─── Restore modal ────────────────────────────────────────────────────────────
function openRestoreModal(version, postId) {
  _pendingRestore = { version, postId };
  const pre = $e('restore-preview');
  if (!pre) return;
  pre.innerHTML = `
    <div class="restore-field-row"><span class="rfr-label">Caption</span><p class="rfr-val">${version.caption||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Location</span><p class="rfr-val">${version.location||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Tags</span><p class="rfr-val">${version.tags||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Hashtags</span><p class="rfr-val">${version.hashtags||'—'}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Date / Time</span><p class="rfr-val">${version.postDate||'—'} ${version.postTime||''}</p></div>
    <div class="restore-field-row"><span class="rfr-label">Saved by</span><p class="rfr-val">${version.author||version.editor||'—'} · ${new Date(version.ts).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})}</p></div>`;
  $e('restore-modal')?.classList.add('open');
}

function closeRestoreModal() { _pendingRestore=null; $e('restore-modal')?.classList.remove('open'); }

async function confirmRestore() {
  if (!_pendingRestore) return;
  const { version, postId } = _pendingRestore;
  _setFields(version);
  const author = ($e('commenter-name')?.value.trim()||'Editor')+' (restored)';
  const newVer = { ...version, author, ts:new Date().toISOString() };
  if (IS_CONFIGURED && _dbRef) {
    await firebase.database().ref(CONFIG.dbPath+'-content/'+postId).set(newVer);
    await firebase.database().ref(CONFIG.dbPath+'-versions/'+postId).push(newVer);
  }
  closeRestoreModal();
  showToast('saved');
  _originalData = _getFields();
}

// ─── Live phone preview (local, instant) ─────────────────────────────────────
function syncPreview() {
  const cap   = $e('field-caption')?.value   || '';
  const loc   = $e('field-location')?.value  || '';
  const tags  = $e('field-tags')?.value      || '';
  const hash  = $e('field-hashtags')?.value  || '';
  const mtype = $e('field-mediaType')?.value || '';
  const elCap  = $e('preview-caption');
  const elLoc  = $e('preview-location');
  const elTags = $e('preview-tags');
  const elHash = $e('preview-hashtags');
  if (elCap)  elCap.innerHTML  = cap.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
  if (elLoc)  elLoc.textContent = loc ? '📍 '+loc : '';
  if (elTags) elTags.innerHTML  = tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="ig-tag">@${t.replace(/^@/,'')}</span>`).join(' ');
  // field-hashtags repurposed as @user tags; hashtags live inside caption text
  if (elHash) elHash.innerHTML = hash.split(/[\s,]+/).filter(Boolean).map(t => `<span class="ig-tag">${t.startsWith('@') ? t : '@'+t}</span>`).join(' ');
  // Carousel / reel badge
  const pm = $e('preview-media');
  if (pm) {
    pm.querySelectorAll('.carousel-badge,.reel-badge').forEach(b=>b.remove());
    if (mtype==='carousel') { const b=document.createElement('div'); b.className='carousel-badge'; b.textContent='❑ Carousel'; pm.appendChild(b); }
    else if (mtype==='reel'||mtype==='video') { const b=document.createElement('div'); b.className='reel-badge'; b.textContent='▶ Reel'; pm.appendChild(b); }
  }
}

// ─── Media upload / drag-drop ─────────────────────────────────────────────────
function handleMediaDrop(event, slotId) {
  event.preventDefault();
  if (!_editingMode) return;
  const files = Array.from(event.dataTransfer?.files || event.target?.files || []);
  if (!files.length) return;
  const slot = $e(slotId);
  if (!slot) return;
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const isVid = file.type.startsWith('video/');
      if (idx===0) slot.querySelectorAll('.drop-icon,.drop-label,.drop-hint').forEach(el=>el.style.display='none');
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;margin-top:8px;';
      const med  = isVid ? document.createElement('video') : document.createElement('img');
      med.src = ev.target.result;
      med.style.cssText = 'width:100%;max-height:240px;object-fit:cover;display:block;';
      if (isVid) { med.controls=true; med.loop=true; med.muted=true; }
      wrap.appendChild(med); slot.appendChild(wrap);
      // Mirror first photo → phone preview
      if (!isVid && idx===0) {
        const pm = $e('preview-media');
        if (pm) {
          pm.querySelectorAll('img.preview-upload').forEach(i=>i.remove());
          const prev = document.createElement('img'); prev.className='preview-upload';
          prev.src = ev.target.result;
          prev.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';
          pm.appendChild(prev);
        }
      }
    };
    reader.readAsDataURL(file);
  });
}

function handleDragOver(e) { e.preventDefault(); if(_editingMode) e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

// ─── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  SOCIAL_POSTS.forEach(post => {
    const row = $e('row-'+post.id);
    if (!row) return;
    const d = _localCache[post.id] || { status:'pending', comment:'' };
    row.setAttribute('data-status', d.status);
    const badge = row.querySelector('.dash-status');
    if (badge) {
      badge.className = 'dash-status status-badge '+d.status;
      badge.querySelector('.badge-text').textContent = {pending:'Pending',approved:'Approved',needs:'Changes',rejected:'Rejected'}[d.status]||'Pending';
    }
    const ci = row.querySelector('.dash-comment');
    if (ci) { ci.textContent=d.comment?'💬':''; ci.title=d.comment||''; }
  });
  updateCounts();
  updateNavPills();
}

function updateCounts() {
  const c = getCounts();
  const total = SOCIAL_POSTS.length;
  const reviewed = c.approved+c.needs+c.rejected;
  const pct = total ? Math.round((reviewed/total)*100) : 0;
  const bar = $e('progress-bar-fill'); const pctEl = $e('progress-pct');
  if (bar) bar.style.width = pct+'%'; if (pctEl) pctEl.textContent = pct+'%';
  ['approved','needs','rejected','pending'].forEach(s => { const el=$e('count-'+s); if(el) el.textContent=c[s]; });
  const tot = $e('stat-total'); if(tot) tot.textContent=total;
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportSummary() {
  const lines = ['MDM Design Studio — Social Review Summary','='.repeat(50),'',
    'Generated: '+new Date().toLocaleString('en-US',{dateStyle:'long',timeStyle:'short'}),''];
  const groups = { approved:[], needs:[], rejected:[], pending:[] };
  SOCIAL_POSTS.forEach(p => {
    const d = _localCache[p.id]||{status:'pending',comment:''};
    groups[d.status||'pending'].push({...p,comment:d.comment||''});
  });
  [['approved','APPROVED'],['needs','NEEDS CHANGES'],['rejected','REJECTED'],['pending','PENDING']].forEach(([key,label]) => {
    if (!groups[key].length) return;
    lines.push(label+' ('+groups[key].length+')'); lines.push('-'.repeat(40));
    groups[key].forEach(p => {
      lines.push('['+String(p.id).padStart(2,'0')+'] IG + FB · '+(p.postDate||'TBD'));
      lines.push('     '+(p.caption||'').slice(0,80));
      if (p.comment) lines.push('     Note: '+p.comment);
    });
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')],{type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='MDM_Social_Review_Summary.txt'; a.click();
}
