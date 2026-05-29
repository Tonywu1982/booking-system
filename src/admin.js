import { SUBJECTS, GRADES, accountsDB, classroomsDB, slotsDB, bookingsDB, recordsDB, uid, statsForClassroom } from './data.js';
import { icon } from './icons.js';

// ── 管理員：數據總覽 ───────────────────────────────────────────────────────
export function renderAdminOverview(container) {
  const classrooms = classroomsDB.all();
  const allBookings = bookingsDB.all();
  const allRecords  = recordsDB.all();
  const scores = allRecords.filter(r => r.score != null).map(r => Number(r.score));
  const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
  const doneCount = allBookings.filter(b => b.status === 'done').length;
  const rate = allBookings.length ? Math.round(doneCount / allBookings.length * 100) : 0;

  // Subject stats
  const subStats = {};
  SUBJECTS.forEach(s => subStats[s] = 0);
  allBookings.forEach(b => {
    const slot = slotsDB.get(b.slotId);
    if (slot) subStats[slot.subject] = (subStats[slot.subject] || 0) + 1;
  });
  const total = allBookings.length || 1;

  // Per-classroom stats
  const cStats = classrooms.map(c => ({ c, s: statsForClassroom(c.id) })).sort((a,b)=>b.s.total-a.s.total);
  const maxTotal = Math.max(...cStats.map(x=>x.s.total), 1);

  container.innerHTML = `
<div class="page-header">
  <div class="page-title">數據總覽</div>
  <div class="page-subtitle">全加盟教室彙整統計</div>
</div>

<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">累計總預約</div><div class="stat-value">${allBookings.length}</div></div>
  <div class="stat-card"><div class="stat-label">診斷完成</div><div class="stat-value green">${doneCount}</div></div>
  <div class="stat-card"><div class="stat-label">完成率</div><div class="stat-value green">${rate}%</div></div>
  <div class="stat-card"><div class="stat-label">全局平均分</div><div class="stat-value amber">${avgScore ?? '—'}</div></div>
  <div class="stat-card"><div class="stat-label">加盟教室數</div><div class="stat-value">${classrooms.length}</div></div>
  <div class="stat-card"><div class="stat-label">教師帳號</div><div class="stat-value">${accountsDB.all().filter(a=>a.role==='teacher').length}</div></div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-title">各教室預約量</div>
    <div class="bar-chart">
      ${cStats.map(({c,s}) => `
        <div class="bar-col">
          <div class="bar-val">${s.total}</div>
          <div class="bar" style="height:${Math.max(s.total/maxTotal*100,4)}%"></div>
          <div class="bar-label">${c.name.replace('教室','')}</div>
        </div>
      `).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">科目診斷分佈</div>
    ${SUBJECTS.map(s => {
      const count = subStats[s] || 0;
      const pct   = Math.round(count / total * 100);
      return `
      <div class="mb-16">
        <div class="flex justify-between mb-8">
          <span class="text-zh fw-600" style="font-size:.875rem">${s}</span>
          <span class="text-muted" style="font-size:.8rem">${count} 件（${pct}%）</span>
        </div>
        <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('')}
  </div>
</div>

<div class="card">
  <div class="card-title">教室詳細數據</div>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>教室</th><th>累計預約</th><th>已完成</th><th>完成率</th><th>平均分</th><th>最熱門科目</th></tr></thead>
      <tbody>
        ${cStats.map(({c,s}) => {
          const r = s.total ? Math.round(s.done/s.total*100) : 0;
          const hotSub = Object.entries(s.subjectMap).sort((a,b)=>b[1]-a[1])[0];
          return `<tr>
            <td class="fw-600 text-zh">${c.name}</td>
            <td>${s.total}</td>
            <td>${s.done}</td>
            <td>
              <div class="flex items-center gap-8">
                <div class="progress" style="width:60px"><div class="progress-fill" style="width:${r}%"></div></div>
                <span style="font-size:.8rem">${r}%</span>
              </div>
            </td>
            <td>${s.avgScore ?? '—'}</td>
            <td>${hotSub && hotSub[1] > 0 ? `<span class="badge badge-blue">${hotSub[0]}</span>` : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

// ── 管理員：教室管理 ───────────────────────────────────────────────────────
export function renderAdminClassrooms(container) {
  container.innerHTML = buildClassroomPage();
  bindClassroomEvents(container);
}

function buildClassroomPage() {
  return `
<div class="page-header">
  <div class="page-title">教室管理</div>
  <div class="page-subtitle">管理加盟教室資料</div>
</div>
<div class="card">
  <div class="card-title">新增教室</div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">教室名稱 <span class="req">*</span></label>
      <input id="new-cls-name" class="form-control" placeholder="如：台北中山教室">
    </div>
    <div class="form-group">
      <label class="form-label">地址</label>
      <input id="new-cls-addr" class="form-control" placeholder="台北市中山區…">
    </div>
  </div>
  <div id="cls-add-error" class="form-error hidden"></div>
  <button class="btn btn-primary" id="btn-add-cls">${icon('plus','icon')} 新增教室</button>
</div>
<div class="card">
  <div class="card-title">教室列表</div>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>教室名稱</th><th>地址</th><th>教師人數</th><th>累計預約</th><th>操作</th></tr></thead>
      <tbody id="cls-tbody"></tbody>
    </table>
  </div>
</div>`;
}

function bindClassroomEvents(container) {
  renderClassroomsTable(container);
  container.querySelector('#btn-add-cls').addEventListener('click', () => {
    const name = container.querySelector('#new-cls-name').value.trim();
    const addr = container.querySelector('#new-cls-addr').value.trim();
    const err  = container.querySelector('#cls-add-error');
    if (!name) { err.textContent='請輸入教室名稱'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    classroomsDB.add({ id: uid('cls'), name, address: addr });
    container.querySelector('#new-cls-name').value = '';
    container.querySelector('#new-cls-addr').value = '';
    renderClassroomsTable(container);
    showToast('教室已新增', 'success');
  });
}

function renderClassroomsTable(container) {
  const tbody = container.querySelector('#cls-tbody');
  const list  = classroomsDB.all();
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty">尚無教室</td></tr>`; return; }

  tbody.innerHTML = list.map(c => {
    const teachers = accountsDB.all().filter(a => a.classroomId === c.id && a.role === 'teacher').length;
    const bookings = bookingsDB.byClassroom(c.id).length;
    return `<tr>
      <td class="fw-600 text-zh">${c.name}</td>
      <td class="text-muted">${c.address || '—'}</td>
      <td>${teachers}</td>
      <td>${bookings}</td>
      <td>
        <button class="btn btn-sm" data-edit-cls="${c.id}">${icon('edit','icon')} 編輯</button>
      </td>
    </tr>`;
  }).join('');
}

// ── 管理員：帳號管理 ───────────────────────────────────────────────────────
export function renderAdminAccounts(container) {
  container.innerHTML = buildAccountPage();
  bindAccountEvents(container);
}

function buildAccountPage() {
  const clsOptions = classroomsDB.all().map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  return `
<div class="page-header">
  <div class="page-title">帳號管理</div>
  <div class="page-subtitle">管理教師與管理員帳號</div>
</div>
<div class="card">
  <div class="card-title">新增帳號</div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">姓名 <span class="req">*</span></label>
      <input id="new-acc-name" class="form-control" placeholder="教師姓名">
    </div>
    <div class="form-group">
      <label class="form-label">帳號 <span class="req">*</span></label>
      <input id="new-acc-user" class="form-control" placeholder="登入帳號">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">密碼 <span class="req">*</span></label>
      <input id="new-acc-pass" class="form-control" type="password" placeholder="設定密碼">
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select id="new-acc-role" class="form-control">
        <option value="teacher">教師</option>
        <option value="admin">管理員</option>
      </select>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">所屬教室（教師必填）</label>
    <select id="new-acc-cls" class="form-control">
      <option value="">— 選擇教室 —</option>${clsOptions}
    </select>
  </div>
  <div id="acc-add-error" class="form-error hidden"></div>
  <button class="btn btn-primary" id="btn-add-acc">${icon('user-plus','icon')} 新增帳號</button>
</div>
<div class="card">
  <div class="flex justify-between items-center mb-16">
    <div class="card-title" style="margin-bottom:0;border:none;padding:0">帳號列表</div>
    <select id="acc-filter-role" class="form-control" style="width:auto;font-size:.8rem">
      <option value="">全部角色</option>
      <option value="teacher">教師</option>
      <option value="admin">管理員</option>
    </select>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>姓名</th><th>帳號</th><th>角色</th><th>所屬教室</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody id="acc-tbody"></tbody>
    </table>
  </div>
</div>`;
}

function bindAccountEvents(container) {
  renderAccountsTable(container);
  container.querySelector('#acc-filter-role').addEventListener('change', () => renderAccountsTable(container));
  container.querySelector('#new-acc-role').addEventListener('change', e => {
    container.querySelector('#new-acc-cls').closest('.form-group').style.opacity = e.target.value === 'admin' ? '.4' : '1';
  });

  container.querySelector('#btn-add-acc').addEventListener('click', () => {
    const name = container.querySelector('#new-acc-name').value.trim();
    const user = container.querySelector('#new-acc-user').value.trim();
    const pass = container.querySelector('#new-acc-pass').value;
    const role = container.querySelector('#new-acc-role').value;
    const cid  = container.querySelector('#new-acc-cls').value;
    const err  = container.querySelector('#acc-add-error');

    if (!name || !user || !pass) { err.textContent = '請填寫姓名、帳號與密碼'; err.classList.remove('hidden'); return; }
    if (role === 'teacher' && !cid) { err.textContent = '教師帳號請選擇所屬教室'; err.classList.remove('hidden'); return; }
    if (accountsDB.all().find(a => a.username === user)) { err.textContent = '此帳號名稱已存在'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');

    accountsDB.add({ id: uid('u'), name, role, classroomId: cid || null, username: user, password: pass, active: true });
    ['#new-acc-name','#new-acc-user','#new-acc-pass'].forEach(s => container.querySelector(s).value = '');
    container.querySelector('#new-acc-cls').value = '';
    renderAccountsTable(container);
    showToast('帳號已建立', 'success');
  });
}

function renderAccountsTable(container) {
  const tbody  = container.querySelector('#acc-tbody');
  const filter = container.querySelector('#acc-filter-role')?.value || '';
  let list = accountsDB.all().filter(a => !filter || a.role === filter);

  if (!list.length) { tbody.innerHTML = `<tr><td colspan="6" class="table-empty">查無帳號</td></tr>`; return; }

  tbody.innerHTML = list.map(a => {
    const cls = a.classroomId ? classroomsDB.get(a.classroomId) : null;
    return `<tr>
      <td>
        <div class="flex items-center gap-8">
          <div class="avatar av-green">${a.name.slice(-1)}</div>
          <span class="fw-600 text-zh">${a.name}</span>
        </div>
      </td>
      <td class="text-muted" style="font-family:var(--font-body)">${a.username}</td>
      <td><span class="badge ${a.role==='admin'?'badge-amber':'badge-blue'}">${a.role==='admin'?'管理員':'教師'}</span></td>
      <td class="text-zh">${cls?.name || '—'}</td>
      <td><span class="badge ${a.active?'badge-green':'badge-red'}">${a.active?'啟用':'停用'}</span></td>
      <td class="flex gap-8">
        <button class="btn btn-sm" data-toggle-acc="${a.id}" data-active="${a.active}">
          ${a.active ? '停用' : '啟用'}
        </button>
        <button class="btn btn-sm" data-reset-pw="${a.id}">${icon('edit','icon')} 改密碼</button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-toggle-acc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const active = btn.dataset.active === 'true';
      if (!confirm(`確定要${active?'停用':'啟用'}此帳號？`)) return;
      accountsDB.update(btn.dataset.toggleAcc, { active: !active });
      renderAccountsTable(container);
      showToast(`帳號已${active?'停用':'啟用'}`);
    });
  });

  tbody.querySelectorAll('[data-reset-pw]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pw = prompt('請輸入新密碼（至少6位）');
      if (!pw || pw.length < 6) { showToast('密碼至少需要6位', 'error'); return; }
      accountsDB.update(btn.dataset.resetPw, { password: pw });
      showToast('密碼已更新', 'success');
    });
  });
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let tc = document.querySelector('.toast-container');
  if (!tc) { tc = document.createElement('div'); tc.className = 'toast-container'; document.body.appendChild(tc); }
  const t = document.createElement('div');
  t.className = `toast${type ? ' toast-'+type : ''}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
