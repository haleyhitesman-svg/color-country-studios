// ── SUPABASE ──────────────────────────────────────────────
const SUPABASE_URL = 'https://lwfgwemmyedehztlnypj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Zmd3ZW1teWVkZWh6dGxueXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjU2NTIsImV4cCI6MjA4ODc0MTY1Mn0.I1MuvFcwrGUBaWpkfsBtS1pBqsFOq0vDlK0tzyipfTU';

// Admin credentials — no Supabase needed for admin login
const ADMIN_EMAIL = 'haleyhitesman@gmail.com';
const ADMIN_PASS  = 'Cloggers2026!';

async function sbAuth(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:'POST',
    headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  return r.json();
}

async function sbGet(table, query='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${window._sbToken||SUPABASE_ANON_KEY}`}
  });
  return r.json();
}

async function sbPost(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:'POST',
    headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${window._sbToken||SUPABASE_ANON_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify(data)
  });
  return r.ok;
}

// ── VIEW MANAGER ──────────────────────────────────────────
function showView(name) {
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('portalView').style.display = 'none';
  document.getElementById('adminView').style.display = 'none';

  if (name === 'home') {
    document.getElementById('homeView').style.display = 'block';
  } else if (name === 'login') {
    document.getElementById('loginView').style.display = 'flex';
  } else if (name === 'portal') {
    document.getElementById('portalView').style.display = 'flex';
  } else if (name === 'admin') {
    document.getElementById('adminView').style.display = 'flex';
  }
  window.scrollTo(0,0);
}

function scrollTo(id) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ── LOGIN ─────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPassword').value.trim();
  const btn   = document.getElementById('loginBtn');
  const err   = document.getElementById('loginError');

  if (!email || !pass) {
    err.textContent = 'Please enter your email and password.';
    err.classList.add('show'); return;
  }

  btn.textContent = 'Signing in...';
  btn.disabled = true;
  err.classList.remove('show');

  // Admin check — instant, no server needed
  if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
    btn.textContent = 'Sign In'; btn.disabled = false;
    showView('admin'); return;
  }

  // Parent login via Supabase
  try {
    const result = await sbAuth(email, pass);
    if (result.access_token) {
      window._sbToken = result.access_token;
      const name = result.user?.user_metadata?.full_name || email.split('@')[0];
      const first = name.split(' ')[0];
      document.getElementById('parentName').textContent = name;
      document.getElementById('parentFirstName').textContent = first;
      document.getElementById('parentAvatar').textContent = first[0].toUpperCase();
      showView('portal');
      loadPortalData();
    } else {
      err.textContent = result.error_description || 'Invalid email or password.';
      err.classList.add('show');
    }
  } catch(e) {
    err.textContent = 'Connection error. Please try again.';
    err.classList.add('show');
  }
  btn.textContent = 'Sign In'; btn.disabled = false;
}

function logout() {
  window._sbToken = null;
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  showView('home');
}

// ── PORTAL NAVIGATION ─────────────────────────────────────
function showPortalPage(id, el) {
  document.querySelectorAll('#portalView .page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#portalView .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if (el) el.classList.add('active');
}

function showAdminPage(id, el) {
  document.querySelectorAll('#adminView .page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#adminView .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if (el) el.classList.add('active');
}

// ── PORTAL DATA ───────────────────────────────────────────
async function loadPortalData() {
  try {
    const invoices = await sbGet('invoices','select=*&order=due_date.desc');
    if (!Array.isArray(invoices)) return;
    const unpaid = invoices.filter(i => i.status !== 'paid');
    const overdue = invoices.filter(i => i.status === 'overdue');
    const total = unpaid.reduce((s,i) => s + parseFloat(i.balance_due||0), 0);
    document.getElementById('dashBalance').textContent = '$'+total.toFixed(2);
    document.getElementById('dashOpenInvoices').textContent = unpaid.length;
    document.getElementById('dashOverdue').textContent = overdue.length + ' overdue';
    document.getElementById('invoiceBadge').textContent = unpaid.length || '';
    document.getElementById('balTotal').textContent = '$'+total.toFixed(2);
    document.getElementById('balOverdue').textContent = '$'+overdue.reduce((s,i)=>s+parseFloat(i.balance_due||0),0).toFixed(2);
    renderInvoiceTable('dashInvoiceTable', invoices.slice(0,5));
    renderInvoiceTable('allInvoiceTable', invoices);
    renderOpenBalance(unpaid);
  } catch(e) { console.log('Portal data error:',e); }

  try {
    const anns = await sbGet('announcements','select=*&order=pinned.desc,created_at.desc');
    renderAnnouncements(anns);
  } catch(e) {}
}

function renderInvoiceTable(tableId, invoices) {
  const tb = document.getElementById(tableId);
  if (!invoices || invoices.length === 0) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--gray);">No invoices found.</td></tr>'; return;
  }
  tb.innerHTML = invoices.map(inv => `
    <tr>
      <td><strong>#${inv.invoice_number||inv.id.slice(0,6)}</strong></td>
      <td>${inv.description||'Tuition'}</td>
      <td>${inv.issue_date||'—'}</td>
      <td>${inv.due_date||'—'}</td>
      <td><strong>$${parseFloat(inv.amount||0).toFixed(2)}</strong></td>
      <td><span class="badge ${inv.status==='paid'?'badge-green':inv.status==='overdue'?'badge-red':'badge-amber'}">${inv.status||'unpaid'}</span></td>
      <td>${inv.status!=='paid'?`<button class="btn btn-red btn-sm" onclick="openPayModal('${inv.invoice_number}','${inv.description||'Invoice'}','${inv.balance_due}')">Pay Now</button>`:`<button class="btn btn-outline btn-sm">View</button>`}</td>
    </tr>
  `).join('');
}

function renderOpenBalance(invoices) {
  const tb = document.getElementById('openBalanceTable');
  if (!invoices || invoices.length === 0) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--green);font-weight:600;">✅ All paid up!</td></tr>'; return;
  }
  tb.innerHTML = invoices.map(inv => `
    <tr>
      <td><strong>#${inv.invoice_number||'—'}</strong></td>
      <td>${inv.description||'Tuition'}</td>
      <td>${inv.due_date||'—'}</td>
      <td>$${parseFloat(inv.balance_due||0).toFixed(2)}</td>
      <td><span class="badge ${inv.status==='overdue'?'badge-red':'badge-amber'}">${inv.status}</span></td>
      <td><button class="btn btn-red btn-sm" onclick="openPayModal('${inv.invoice_number}','${inv.description||'Invoice'}','${inv.balance_due}')">Pay $${parseFloat(inv.balance_due||0).toFixed(2)}</button></td>
    </tr>
  `).join('');
}

function renderAnnouncements(anns) {
  const el = document.getElementById('announcementsList');
  if (!anns || anns.length === 0) {
    el.innerHTML = '<p style="color:var(--gray);font-size:14px;padding:20px;">No announcements yet.</p>'; return;
  }
  el.innerHTML = anns.map(a => `
    <div class="announcement-card ${a.pinned?'pinned':''}">
      <div>
        <div class="ann-title">${a.pinned?'📌 ':''}${a.title}</div>
        <div class="ann-body">${a.body}</div>
        <div class="ann-meta">Posted by ${a.author||'Studio'} · ${new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
      </div>
    </div>
  `).join('');
}

// ── PAYMENT MODAL ─────────────────────────────────────────
function openPayModal(id, desc, amount) {
  document.getElementById('payDescription').textContent = desc + ' (Invoice #'+id+')';
  document.getElementById('payAmount').textContent = '$'+parseFloat(amount).toFixed(2);
  document.getElementById('payModal').classList.add('open');
}

function simulatePayment() {
  closeModal('payModal');
  setTimeout(() => alert('✅ Payment successful! A receipt has been sent to your email.\n\nIn production this processes via Stripe and auto-updates QuickBooks.'), 100);
}

// ── MODALS ────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target===o) o.classList.remove('open'); });
});

// ── SCHEDULE TABS ─────────────────────────────────────────
function showDay(day, btn) {
  document.querySelectorAll('.schedule-day').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(day).classList.add('active');
  btn.classList.add('active');
}

// ── NAV SCROLL ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ── SYNC ANIMATION ────────────────────────────────────────
async function connectQuickBooks() {
  const btn = document.getElementById('qbConnectBtn');
  if (btn) { btn.textContent = 'Connecting...'; btn.disabled = true; }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/quickbooks-sync?action=auth_url`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const d = await r.json();
    if (d.url) {
      window.open(d.url, '_blank');
    } else {
      alert('Could not get QuickBooks authorization URL. Make sure the Edge Function is deployed.');
    }
  } catch(e) {
    alert('Connection error: ' + e.message);
  }
  if (btn) { btn.textContent = 'Connect QuickBooks →'; btn.disabled = false; }
}

async function simulateSync() {
  const dots = document.querySelectorAll('.sync-dot');
  dots.forEach(d => d.style.background = 'var(--amber)');
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/quickbooks-sync`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' })
    });
    const d = await r.json();
    if (d.success) {
      dots.forEach(dot => dot.style.background = 'var(--green)');
      document.querySelectorAll('.sync-time').forEach(t => t.textContent = 'Just synced');
      if (d.invoices_synced !== undefined) {
        alert(`✅ Synced ${d.invoices_synced} invoices from QuickBooks!`);
      }
    } else {
      dots.forEach(dot => dot.style.background = 'var(--red)');
      alert('Sync error: ' + (d.error || 'Unknown error'));
    }
  } catch(e) {
    dots.forEach(dot => dot.style.background = 'var(--red)');
    alert('Sync failed: ' + e.message);
  }
}

// ── ANNOUNCEMENTS (ADMIN) ─────────────────────────────────
async function postAnnouncement() {
  const title = document.getElementById('newAnnTitle').value.trim();
  const body  = document.getElementById('newAnnBody').value.trim();
  const pinned = document.getElementById('newAnnPin').value === 'true';
  if (!title || !body) { alert('Please enter a title and message.'); return; }
  const ok = await sbPost('announcements', {title, body, pinned, active:true});
  closeModal('announcementModal');
  alert(ok ? '✅ Announcement posted! Parents will see it when they log in.' : '❌ Could not post. Make sure you are connected to Supabase.');
}

// ── INVITE SYSTEM ─────────────────────────────────────────
async function sendInvite(email, name) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method:'POST',
      headers:{
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({email, name})
    });
    const d = await r.json();
    if (r.ok && d.success) return {success:true};
    return {success:false, error:d.error||'Unknown error'};
  } catch(e) { return {success:false, error:e.message}; }
}

function showStatus(el, type, msg) {
  el.style.display='block';
  el.style.color = type==='success'?'#15803D':type==='error'?'#DC2626':'#D97706';
  el.textContent = msg;
}

async function sendSingleInvite() {
  const name = document.getElementById('inviteName').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();
  const status = document.getElementById('inviteSingleStatus');
  if (!name||!email) { showStatus(status,'error','Please enter both name and email.'); return; }
  showStatus(status,'loading',`Sending invite to ${email}...`);
  const r = await sendInvite(email,name);
  if (r.success) {
    showStatus(status,'success',`✅ Invite sent to ${name}! They'll receive an email to create their password.`);
    document.getElementById('inviteName').value='';
    document.getElementById('inviteEmail').value='';
    loadInviteHistory();
  } else {
    showStatus(status,'error',`❌ ${r.error}`);
  }
}

async function sendBulkInvites() {
  const raw = document.getElementById('bulkInviteText').value.trim();
  const status = document.getElementById('bulkInviteStatus');
  if (!raw) { showStatus(status,'error','Please enter at least one entry.'); return; }
  const lines = raw.split('\n').filter(l=>l.trim()&&l.includes(',')&&l.includes('@'));
  const families = lines.map(l=>{const p=l.split(',').map(x=>x.trim());return{name:p[0],email:p[1]};});
  if (!families.length) { showStatus(status,'error','No valid entries. Format: Full Name, email@address.com'); return; }
  showStatus(status,'loading',`Sending ${families.length} invites...`);
  let sent=0,failed=0;
  for (const f of families) {
    const r = await sendInvite(f.email,f.name);
    r.success ? sent++ : failed++;
    await new Promise(r=>setTimeout(r,300));
  }
  status.style.display='none';
  document.getElementById('inviteSuccessMessage').innerHTML = `<strong>${sent} invite${sent!==1?'s':''} sent!</strong>${failed?`<br><span style="color:var(--amber)">${failed} failed (may already have accounts).</span>`:''}`;
  document.getElementById('inviteSuccessModal').classList.add('open');
  document.getElementById('bulkInviteText').value='';
  loadInviteHistory();
}

async function loadInviteHistory() {
  const tb = document.getElementById('inviteHistoryBody');
  if (!tb) return;
  try {
    const data = await sbGet('invite_log','select=*&order=sent_at.desc');
    if (!Array.isArray(data)||data.length===0) {
      tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray);">No invites sent yet.</td></tr>';
      return;
    }
    const pending = data.filter(i=>i.status==='pending').length;
    const accepted = data.filter(i=>i.status==='accepted').length;
    document.getElementById('inviteStatPending').textContent = pending;
    document.getElementById('inviteStatActive').textContent = accepted;
    document.getElementById('inviteStatNone').textContent = Math.max(0,150-data.length);
    tb.innerHTML = data.map(inv=>`
      <tr>
        <td><strong>${inv.name||'—'}</strong></td>
        <td>${inv.email}</td>
        <td style="font-size:12px;color:var(--gray);">${inv.sent_at?new Date(inv.sent_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</td>
        <td><span class="badge ${inv.status==='accepted'?'badge-green':inv.status==='pending'?'badge-amber':'badge-gray'}">${inv.status}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="resendInvite('${inv.email}','${inv.name||''}')">Resend</button></td>
      </tr>
    `).join('');
  } catch(e) {
    tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray);">Run the database setup SQL first.</td></tr>';
  }
}

async function resendInvite(email,name) {
  const r = await sendInvite(email,name);
  alert(r.success ? `✅ Invite resent to ${name}!` : `❌ Could not resend: ${r.error}`);
  if (r.success) loadInviteHistory();
}

// ── BULK TEXTAREA COUNTER ─────────────────────────────────
document.getElementById('bulkInviteText').addEventListener('input', function() {
  const lines = this.value.split('\n').filter(l=>l.trim()&&l.includes(',')&&l.includes('@'));
  document.getElementById('bulkInviteCount').textContent = lines.length>0 ? `${lines.length} valid entr${lines.length===1?'y':'ies'} detected` : 'Enter names above to preview';
});

// ── ENTER KEY ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key==='Enter' && document.getElementById('loginView').style.display==='flex') handleLogin();
});
