// ─── MDM Review Portal v2 · Live Sync via Firebase ───────────────────────────
// Uses Firebase Realtime Database (free tier, no auth required for this use)
// Email notifications via EmailJS (free tier, no backend needed)
//
// ── SETUP REQUIRED (one-time, ~5 minutes) ────────────────────────────────────
// See SETUP-INSTRUCTIONS.txt for step-by-step guide
// ─────────────────────────────────────────────────────────────────────────────

// ╔══════════════════════════════════════════════════════════╗
// ║  PASTE YOUR CREDENTIALS HERE AFTER SETUP                ║
// ╚══════════════════════════════════════════════════════════╝
const CONFIG = {
  // Firebase Realtime Database URL (from Firebase Console → Realtime Database)
  // Example: https://my-project-default-rtdb.firebaseio.com
  firebaseUrl: 'https://mdm-blog-review-default-rtdb.firebaseio.com/',

  // EmailJS credentials (from emailjs.com dashboard)
  emailjsServiceId:  'service_xgecl1w',
  emailjsTemplateId: 'template_meqaj8u',
  emailjsPublicKey:  'zwPzyjBtAuC3GxZtQ',

  // Notification email address
  notifyEmail: 'info@thecreatorie.com',
  notifyName:  'MDM Blog Review',

  // Database path (don't change unless running multiple portals)
  dbPath: 'mdm-blog-review-2026',
};
// ─────────────────────────────────────────────────────────────────────────────

const IS_CONFIGURED = CONFIG.firebaseUrl !== 'YOUR_FIREBASE_DATABASE_URL';

// ─── Post data ────────────────────────────────────────────────────────────────

const POSTS = [
  { id:  1, file: 'post-01.html', date: 'March 3, 2026',      day: 'Tuesday',  title: 'From Sketch to Sawdust',                                       category: 'Process'          },
  { id:  2, file: 'post-02.html', date: 'March 12, 2026',     day: 'Thursday', title: 'Why the First Measurement Matters Most',                        category: 'Process'          },
  { id:  3, file: 'post-03.html', date: 'March 24, 2026',     day: 'Tuesday',  title: '10 Questions to Ask Before Hiring a Custom Furniture Maker',    category: 'Consumer Guide'   },
  { id:  4, file: 'post-04.html', date: 'April 2, 2026',      day: 'Thursday', title: 'Custom vs. Semi-Custom vs. Off-the-Shelf',                      category: 'Consumer Guide'   },
  { id:  5, file: 'post-05.html', date: 'April 14, 2026',     day: 'Tuesday',  title: 'What Your Lead Time Actually Means',                            category: 'Consumer Guide'   },
  { id:  6, file: 'post-06.html', date: 'April 28, 2026',     day: 'Tuesday',  title: 'How to Prepare for Your First Consultation',                    category: 'Consumer Guide'   },
  { id:  7, file: 'post-07.html', date: 'May 7, 2026',        day: 'Thursday', title: 'The Real Cost of Custom Furniture',                             category: 'Consumer Guide'   },
  { id:  8, file: 'post-08.html', date: 'May 19, 2026',       day: 'Tuesday',  title: 'Our Most Common Client Regrets',                                category: 'Trust Building'   },
  { id:  9, file: 'post-09.html', date: 'May 28, 2026',       day: 'Thursday', title: 'When a Project Goes Sideways',                                  category: 'Trust Building'   },
  { id: 10, file: 'post-10.html', date: 'June 9, 2026',       day: 'Tuesday',  title: 'The Case for Restraint',                                        category: 'Design Strategy'  },
  { id: 11, file: 'post-11.html', date: 'June 18, 2026',      day: 'Thursday', title: 'Built-Ins vs. Freestanding',                                    category: 'Design Strategy'  },
  { id: 12, file: 'post-12.html', date: 'June 30, 2026',      day: 'Tuesday',  title: 'Small Space, Big Impact',                                       category: 'Design Strategy'  },
  { id: 13, file: 'post-13.html', date: 'July 9, 2026',       day: 'Thursday', title: 'Mixing Wood Tones Without Making It a Mistake',                 category: 'Craft Education'  },
  { id: 14, file: 'post-14.html', date: 'July 23, 2026',      day: 'Thursday', title: 'Designing for the Long Game',                                   category: 'Craft Education'  },
  { id: 15, file: 'post-15.html', date: 'August 4, 2026',     day: 'Tuesday',  title: 'Joinery 101',                                                   category: 'Craft Education'  },
  { id: 16, file: 'post-16.html', date: 'August 13, 2026',    day: 'Thursday', title: 'The Finish Line',                                               category: 'Craft Education'  },
  { id: 17, file: 'post-17.html', date: 'August 25, 2026',    day: 'Tuesday',  title: 'Hardware Deep Dive',                                            category: 'Craft Education'  },
  { id: 18, file: 'post-18.html', date: 'September 3, 2026',  day: 'Thursday', title: 'How to Care for Your Custom Wood Furniture',                    category: 'Care Guide'       },
  { id: 19, file: 'post-19.html', date: 'September 15, 2026', day: 'Tuesday',  title: 'The Gift of Custom',                                            category: 'Gift Season'      },
  { id: 20, file: 'post-20.html', date: 'September 24, 2026', day: 'Thursday', title: 'How to Work with MDM as an Interior Designer',                  category: 'Trade'            },
  { id: 21, file: 'post-21.html', date: 'October 6, 2026',    day: 'Tuesday',  title: 'What Architects & Builders Should Know About Millwork',         category: 'Trade'            },
  { id: 22, file: 'post-22.html', date: 'October 20, 2026',   day: 'Tuesday',  title: 'What Happens to a Custom Piece When You Move?',                 category: 'Thought Leadership'},
  { id: 23, file: 'post-23.html', date: 'October 29, 2026',   day: 'Thursday', title: 'The Environmental Case for Custom',                             category: 'Thought Leadership'},
  { id: 24, file: 'post-24.html', date: 'November 10, 2026',  day: 'Tuesday',  title: 'American-Made Custom Furniture: Why It Matters',                category: 'Thought Leadership'},
  { id: 25, file: 'post-25.html', date: 'November 19, 2026',  day: 'Thursday', title: 'How Social Media Has Changed What Clients Ask For',             category: 'Thought Leadership'},
];

// ─── Local state cache ────────────────────────────────────────────────────────
let _localCache = {};
let _listeners  = [];
let _dbRef      = null;

// ─── Firebase connection ──────────────────────────────────────────────────────

function initFirebase() {
  if (!IS_CONFIGURED) {
    console.log('[MDM] Firebase not configured — running in local-only mode.');
    loadFromLocalStorage();
    return;
  }
  // Firebase compat SDK loaded via CDN in HTML
  try {
    const app = firebase.initializeApp({
      databaseURL: CONFIG.firebaseUrl
    });
    _dbRef = firebase.database().ref(CONFIG.dbPath);

    // Live listener — fires on any change from any device
    _dbRef.on('value', snapshot => {
      const data = snapshot.val() || {};
      _localCache = data;
      notifyListeners();
      renderAllPages();
    });
    console.log('[MDM] Firebase connected — live sync active.');
  } catch (e) {
    console.warn('[MDM] Firebase init failed, falling back to localStorage.', e);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  try {
    _localCache = JSON.parse(localStorage.getItem('mdm_review_2026') || '{}');
  } catch { _localCache = {}; }
  notifyListeners();
  renderAllPages();
}

function saveToLocalStorage() {
  localStorage.setItem('mdm_review_2026', JSON.stringify(_localCache));
}

// ─── Data access ──────────────────────────────────────────────────────────────

function getPostData(id) {
  return _localCache[id] || { status: 'pending', comment: '' };
}

async function setPostData(id, status, comment) {
  const prev = getPostData(id);
  const now = new Date().toISOString();
  const record = { status, comment: comment || '', updatedAt: now };
  _localCache[id] = record;

  if (IS_CONFIGURED && _dbRef) {
    try {
      await _dbRef.child(String(id)).set(record);
    } catch (e) {
      console.warn('[MDM] Firebase write failed, saved locally.', e);
      saveToLocalStorage();
    }
  } else {
    saveToLocalStorage();
  }

  // Send email notification if status changed (not just comment updated)
  if (status !== 'pending' && status !== prev.status) {
    sendEmailNotification(id, status, comment);
  }
}

// ─── Counts ───────────────────────────────────────────────────────────────────

function getCounts() {
  const c = { approved: 0, needs: 0, rejected: 0, pending: 0 };
  POSTS.forEach(p => {
    const s = (_localCache[p.id] || {}).status || 'pending';
    c[s] = (c[s] || 0) + 1;
  });
  return c;
}

// ─── Listeners (for reactive updates) ────────────────────────────────────────

function addListener(fn) { _listeners.push(fn); }
function notifyListeners() { _listeners.forEach(fn => fn(_localCache)); }

// ─── Email via EmailJS (free, no backend) ─────────────────────────────────────

async function sendEmailNotification(postId, status, comment) {
  if (!IS_CONFIGURED) return;
  if (CONFIG.emailjsPublicKey === 'YOUR_EMAILJS_PUBLIC_KEY') return;

  const post = POSTS.find(p => p.id === postId);
  if (!post) return;

  const statusLabel = { approved: '✓ Approved', needs: '⚠ Needs Changes', rejected: '✕ Rejected' }[status] || status;
  const portalUrl   = window.location.origin + window.location.pathname.replace(/\/posts\/.*/, '/index.html');

  try {
    await emailjs.send(
      CONFIG.emailjsServiceId,
      CONFIG.emailjsTemplateId,
      {
        to_email:   CONFIG.notifyEmail,
        to_name:    CONFIG.notifyName,
        post_num:   String(postId).padStart(2, '0'),
        post_title: post.title,
        post_date:  post.date,
        status:     statusLabel,
        comment:    comment || '(no note left)',
        portal_url: portalUrl,
        timestamp:  new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      },
      CONFIG.emailjsPublicKey
    );
    console.log('[MDM] Email notification sent.');
  } catch (e) {
    console.warn('[MDM] Email notification failed:', e);
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function updateNavPills() {
  const c = getCounts();
  const el = id => document.getElementById(id);
  if (el('pill-approved')) el('pill-approved').textContent = c.approved + ' Approved';
  if (el('pill-needs'))    el('pill-needs').textContent    = c.needs    + ' Changes';
  if (el('pill-rejected')) el('pill-rejected').textContent = c.rejected + ' Rejected';
}

function renderAllPages() {
  updateNavPills();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof refreshPostStatus === 'function') refreshPostStatus();
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(type) {
  let t = document.getElementById('mdm-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'mdm-toast';
    t.style.cssText = `
      position:fixed;bottom:90px;right:20px;z-index:9999;
      font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;
      letter-spacing:.4em;text-transform:uppercase;padding:11px 18px;
      border:1px solid;opacity:0;transition:opacity .3s;pointer-events:none;
      border-radius:2px;box-shadow:0 4px 24px rgba(0,0,0,.4);
    `;
    document.body.appendChild(t);
  }
  const s = {
    approved:{ bg:'#152218',bd:'#2A6040',txt:'#52C878',msg:'Approved ✓' },
    needs:   { bg:'#221A08',bd:'#6A5010',txt:'#E8B840',msg:'Flagged for Changes ⚠' },
    rejected:{ bg:'#200C0C',bd:'#6A1818',txt:'#E05050',msg:'Rejected ✕' },
    pending: { bg:'#1E1D21',bd:'#2A2830',txt:'#5A5660',msg:'Status Cleared' },
    comment: { bg:'#17161A',bd:'#C4A96A',txt:'#C4A96A',msg:'Note Saved' },
    synced:  { bg:'#0A1520',bd:'#1A4060',txt:'#40A0D8',msg:'Synced Live ↑' },
  }[type] || { bg:'#1A1917',bd:'#3A3838',txt:'#888',msg:'' };
  Object.assign(t.style, { background:s.bg, borderColor:s.bd, color:s.txt });
  t.textContent = s.msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 2400);
}

// ─── Post page actions ────────────────────────────────────────────────────────

async function fabAction(postId, action) {
  const prev = getPostData(postId).status;
  const newStatus = (prev === action) ? 'pending' : action;
  const comment = document.getElementById('fab-textarea')?.value || '';

  await setPostData(postId, newStatus, comment);

  document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
  if (newStatus !== 'pending') {
    const btn = document.querySelector(`.fab-btn[data-action="${action}"]`);
    if (btn) btn.classList.add('active');
  }
  updateStatusBadge(postId, newStatus);
  showToast(newStatus);
  if (IS_CONFIGURED) setTimeout(() => showToast('synced'), 600);
}

async function saveComment(postId) {
  const ta = document.getElementById('fab-textarea');
  const comment = ta ? ta.value : '';
  const d = getPostData(postId);
  await setPostData(postId, d.status || 'pending', comment);
  showToast('comment');
}

function toggleCommentBox() {
  document.getElementById('fab-comment-box')?.classList.toggle('open');
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
  if (d.status !== 'pending') {
    document.querySelector(`.fab-btn[data-action="${d.status}"]`)?.classList.add('active');
  }
  const ta = document.getElementById('fab-textarea');
  if (ta && d.comment) ta.value = d.comment;
  updateNavPills();
  // Re-render when live data arrives
  addListener(() => {
    const fresh = getPostData(postId);
    updateStatusBadge(postId, fresh.status);
    document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
    if (fresh.status !== 'pending') {
      document.querySelector(`.fab-btn[data-action="${fresh.status}"]`)?.classList.add('active');
    }
    updateNavPills();
  });
}

function refreshPostStatus() {
  // Called by addListener when data updates on post pages
}

// ─── Dashboard render ─────────────────────────────────────────────────────────

function renderDashboard() {
  POSTS.forEach(post => {
    const row = document.getElementById('row-' + post.id);
    if (!row) return;
    const d = _localCache[post.id] || { status: 'pending', comment: '' };
    row.setAttribute('data-status', d.status);
    const badge = row.querySelector('.dash-status');
    if (badge) {
      badge.className = 'dash-status status-badge ' + d.status;
      const labels = { pending:'Pending', approved:'Approved', needs:'Changes', rejected:'Rejected' };
      badge.querySelector('.badge-text').textContent = labels[d.status] || 'Pending';
    }
    const ci = row.querySelector('.dash-comment');
    if (ci) { ci.textContent = d.comment ? '💬' : ''; ci.title = d.comment || ''; }
  });

  const c = getCounts();
  const reviewed = c.approved + c.needs + c.rejected;
  const pct = Math.round((reviewed / 25) * 100);
  const bar = document.getElementById('progress-bar-fill');
  const pctEl = document.getElementById('progress-pct');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  ['approved','needs','rejected','pending'].forEach(s => {
    const el = document.getElementById('count-' + s);
    if (el) el.textContent = c[s];
  });
  updateNavPills();
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportSummary() {
  const lines = ['MDM Design Studio — Blog Review Summary', '='.repeat(50), '',
    `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`, ''];
  const groups = { approved:[], needs:[], rejected:[], pending:[] };
  POSTS.forEach(p => {
    const d = _localCache[p.id] || { status:'pending', comment:'' };
    groups[d.status || 'pending'].push({ num:p.id, title:p.title, date:p.date, comment:d.comment||'' });
  });
  [['approved','APPROVED'],['needs','NEEDS CHANGES'],['rejected','REJECTED'],['pending','PENDING REVIEW']].forEach(([key,label]) => {
    if (!groups[key].length) return;
    lines.push(`${label} (${groups[key].length})`);
    lines.push('-'.repeat(40));
    groups[key].forEach(p => {
      lines.push(`[${String(p.num).padStart(2,'0')}] ${p.title}`);
      lines.push(`     Publish: ${p.date}`);
      if (p.comment) lines.push(`     Note: ${p.comment}`);
    });
    lines.push('');
  });
  const blob = new Blob([lines.join('\n')], { type:'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'MDM_Blog_Review_Summary.txt';
  a.click();
}
