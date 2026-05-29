import { SUBJECTS, GRADES, slotsDB, bookingsDB, recordsDB, classroomsDB, uid, fmtDate, fmtDateTime } from './data.js';
import { icon } from './icons.js';

// ── 教師：時段管理 ─────────────────────────────────────────────────────────
export function renderTeacherSlots(container, user) {
  container.innerHTML = buildSlotPage(user);
  bindSlotEvents(container, user);
}

function buildSlotPage(user) {
  const today = new Date().toISOString().slice(0, 10);
  const subjectOptions = SUBJECTS.map(s => `<option>${s}</option>`).join('');
  return `
<div class="page-header">
  <div class="page-title">開放時段管理</div>
  <div class="page-subtitle">管理可供家長預約的診斷時段</div>
</div>

<div class="card">
  <div class="card-title">新增開放時段</div>
  <div class="form-row-3">
    <div class="form-group">
      <label class="form-label">日期 <span class="req">*</span></label>
      <input id="new-date" class="form-control" type="date" min="${today}" value="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">開始時間 <span class="req">*</span></label>
      <select id="new-time" class="form-control">
        ${['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
           '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','19:00','19:30','20:00']
          .map(t => `<option>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">科目 <span class="req">*</span></label>
      <select id="new-subject" class="form-control">${subjectOptions}</select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">容納人數</label>
      <select id="new-capacity" class="form-control">
        ${[1,2,3,4,5,6,8,10].map(n => `<option value="${n}">${n} 人</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="display:flex;align-items:flex-end">
      <button class="btn btn-primary btn-block" id="btn-add-slot">
        ${icon('plus','icon')} 新增時段
      </button>
    </div>
  </div>
  <div id="slot-add-error" class="form-error hidden"></div>
</div>

<div class="card">
  <div class="flex justify-between items-center" style="margin-bottom:14px">
    <div class="card-title" style="margin-bottom:0;border-bottom:none;padding-bottom:0">時段列表</div>
    <div class="flex gap-8">
      <select id="filter-date" class="form-control" style="width:auto;font-size:.8rem">
        <option value="">全部日期</option>
      </select>
      <select id="filter-subject" class="form-control" style="width:auto;font-size:.8rem">
        <option value="">全部科目</option>
        ${SUBJECTS.map(s => `<option>${s}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>日期</th><th>時間</th><th>科目</th><th>容量</th><th>已預約</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody id="slots-tbody"></tbody>
    </table>
  </div>
</div>`;
}

function bindSlotEvents(container, user) {
  renderSlotsTable(container, user);
  populateDateFilter(container, user);

  container.querySelector('#btn-add-slot').addEventListener('click', () => {
    const date     = container.querySelector('#new-date').value;
    const time     = container.querySelector('#new-time').value;
    const subject  = container.querySelector('#new-subject').value;
    const capacity = Number(container.querySelector('#new-capacity').value);
    const errEl    = container.querySelector('#slot-add-error');

    if (!date) { errEl.textContent = '請選擇日期'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');

    // Duplicate check
    const existing = slotsDB.byClassroom(user.classroomId).find(s => s.date === date && s.time === time && s.subject === subject);
    if (existing) { errEl.textContent = '此日期時間與科目已存在相同時段'; errEl.classList.remove('hidden'); return; }

    slotsDB.add({ id: uid('sl'), classroomId: user.classroomId, date, time, subject, capacity, createdAt: new Date().toISOString() });
    renderSlotsTable(container, user);
    populateDateFilter(container, user);
    showToast('時段已新增', 'success');
  });

  container.querySelector('#filter-date').addEventListener('change', () => renderSlotsTable(container, user));
  container.querySelector('#filter-subject').addEventListener('change', () => renderSlotsTable(container, user));
}

function renderSlotsTable(container, user) {
  const tbody      = container.querySelector('#slots-tbody');
  const filterDate = container.querySelector('#filter-date')?.value || '';
  const filterSub  = container.querySelector('#filter-subject')?.value || '';

  let slots = slotsDB.byClassroom(user.classroomId)
    .filter(s => (!filterDate || s.date === filterDate) && (!filterSub || s.subject === filterSub))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (!slots.length) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">尚無時段，請新增</td></tr>`; return; }

  tbody.innerHTML = slots.map(s => {
    const booked = bookingsDB.bySlot(s.id).length;
    const remain = s.capacity - booked;
    const full   = remain <= 0;
    return `<tr>
      <td>${fmtDate(s.date)}</td>
      <td><span style="font-family:var(--font-body);font-weight:600">${s.time}</span></td>
      <td><span class="badge badge-blue">${s.subject}</span></td>
      <td>${s.capacity}</td>
      <td>${booked}</td>
      <td><span class="badge ${full ? 'badge-red' : 'badge-green'}">${full ? '已額滿' : `剩 ${remain}`}</span></td>
      <td>
        <button class="btn btn-sm btn-danger" data-del="${s.id}" ${booked > 0 ? 'disabled title="已有預約，無法刪除"' : ''}>
          ${icon('trash','icon')} 刪除
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('確定要刪除此時段？')) return;
      slotsDB.delete(btn.dataset.del);
      renderSlotsTable(container, user);
      populateDateFilter(container, user);
      showToast('時段已刪除');
    });
  });
}

function populateDateFilter(container, user) {
  const sel   = container.querySelector('#filter-date');
  if (!sel) return;
  const cur   = sel.value;
  const dates = [...new Set(slotsDB.byClassroom(user.classroomId).map(s => s.date))].sort();
  sel.innerHTML = `<option value="">全部日期</option>` + dates.map(d => `<option value="${d}" ${d === cur ? 'selected' : ''}>${fmtDate(d)}</option>`).join('');
}

// ── 教師：預約名單 ─────────────────────────────────────────────────────────
export function renderTeacherBookings(container, user) {
  container.innerHTML = buildBookingsPage(user);
  bindBookingsEvents(container, user);
}

function buildBookingsPage(user) {
  return `
<div class="page-header">
  <div class="page-title">預約名單</div>
  <div class="page-subtitle">查看各時段預約學生，填寫診斷紀錄</div>
</div>

<div class="card">
  <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
    <select id="bk-filter-date" class="form-control" style="width:auto;font-size:.8rem"><option value="">全部日期</option></select>
    <select id="bk-filter-sub" class="form-control" style="width:auto;font-size:.8rem">
      <option value="">全部科目</option>${SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
    </select>
    <select id="bk-filter-status" class="form-control" style="width:auto;font-size:.8rem">
      <option value="">全部狀態</option>
      <option value="pending">待診斷</option>
      <option value="done">已完成</option>
    </select>
  </div>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>學生</th><th>學年</th><th>科目</th><th>日期</th><th>時間</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody id="bk-tbody"></tbody>
    </table>
  </div>
</div>

<!-- 診斷紀錄 Modal -->
<div id="record-modal" class="modal-backdrop hidden">
  <div class="modal modal-lg">
    <div class="modal-header">
      <div class="modal-title" id="record-modal-title">填寫診斷紀錄</div>
      <button class="modal-close" id="record-modal-close">${icon('x','icon')}</button>
    </div>
    <div id="record-modal-body"></div>
  </div>
</div>`;
}

function bindBookingsEvents(container, user) {
  populateBkDateFilter(container, user);
  renderBookingsTable(container, user);

  ['#bk-filter-date','#bk-filter-sub','#bk-filter-status'].forEach(sel => {
    container.querySelector(sel)?.addEventListener('change', () => renderBookingsTable(container, user));
  });

  container.querySelector('#record-modal-close').addEventListener('click', () => {
    container.querySelector('#record-modal').classList.add('hidden');
  });
}

function renderBookingsTable(container, user) {
  const tbody  = container.querySelector('#bk-tbody');
  const fDate  = container.querySelector('#bk-filter-date')?.value || '';
  const fSub   = container.querySelector('#bk-filter-sub')?.value || '';
  const fStatus= container.querySelector('#bk-filter-status')?.value || '';

  const slotIds = slotsDB.byClassroom(user.classroomId).map(s => s.id);
  let bookings  = bookingsDB.all()
    .filter(b => slotIds.includes(b.slotId))
    .filter(b => !fStatus || b.status === fStatus);

  if (fDate || fSub) {
    bookings = bookings.filter(b => {
      const slot = slotsDB.get(b.slotId);
      return (!fDate || slot?.date === fDate) && (!fSub || slot?.subject === fSub);
    });
  }

  bookings.sort((a, b) => {
    const sa = slotsDB.get(a.slotId), sb = slotsDB.get(b.slotId);
    return (sa?.date || '').localeCompare(sb?.date || '') || (sa?.time || '').localeCompare(sb?.time || '');
  });

  if (!bookings.length) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">查無符合的預約</td></tr>`; return; }

  const statusMap = { pending: ['待診斷','badge-amber'], done: ['已完成','badge-green'], cancelled: ['已取消','badge-gray'] };
  const colors = ['av-green','av-amber','av-blue'];

  tbody.innerHTML = bookings.map((b, i) => {
    const slot  = slotsDB.get(b.slotId);
    const grade = GRADES.find(g => g.id === b.gradeId);
    const [statusLabel, statusCls] = statusMap[b.status] || ['未知','badge-gray'];
    const rec   = recordsDB.byBooking(b.id);
    return `<tr>
      <td>
        <div class="flex items-center gap-8">
          <div class="avatar ${colors[i%3]}">${b.studentName.slice(-1)}</div>
          <div>
            <div class="fw-600 text-zh">${b.studentName}</div>
            <div class="text-xs text-muted">${b.phone}</div>
          </div>
        </div>
      </td>
      <td>${grade?.label || '-'}</td>
      <td><span class="badge badge-blue">${b.subject}</span></td>
      <td>${slot ? fmtDate(slot.date) : '-'}</td>
      <td style="font-family:var(--font-body);font-weight:600">${slot?.time || '-'}</td>
      <td><span class="badge ${statusCls}">${statusLabel}${rec ? ' ✓' : ''}</span></td>
      <td class="flex gap-8">
        <button class="btn btn-sm btn-primary" data-open-record="${b.id}">
          ${icon('edit','icon')} ${b.status === 'done' ? '查看' : '填寫'}紀錄
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-open-record]').forEach(btn => {
    btn.addEventListener('click', () => openRecordModal(container, user, btn.dataset.openRecord));
  });
}

function openRecordModal(container, user, bookingId) {
  const b     = bookingsDB.get(bookingId);
  const slot  = slotsDB.get(b?.slotId);
  const grade = GRADES.find(g => g.id === b?.gradeId);
  const rec   = recordsDB.byBooking(bookingId) || {};
  const modal = container.querySelector('#record-modal');
  const plans = ['一般強化方案（週2次）','密集衝刺方案（週4次）','輕鬆保溫方案（週1次）','暫不建議報名'];

  container.querySelector('#record-modal-title').textContent =
    `${b.studentName} — ${b.subject} 診斷紀錄`;

  container.querySelector('#record-modal-body').innerHTML = `
    <div class="flex items-center gap-12 mb-16 p-12" style="background:var(--gray-50);border-radius:var(--radius-md)">
      <div class="score-ring">${rec.score ?? '--'}</div>
      <div class="text-zh" style="font-size:.875rem;line-height:1.9">
        <div><strong>學生：</strong>${b.studentName} ／ ${grade?.label || ''}</div>
        <div><strong>科目：</strong>${b.subject}</div>
        <div><strong>時間：</strong>${slot ? fmtDate(slot.date)+' '+slot.time : '-'}</div>
        ${b.note ? `<div><strong>家長備註：</strong>${b.note}</div>` : ''}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">整體評分（0–100）</label>
        <div class="score-input-wrap">
          <div class="score-preview" id="score-preview-val">${rec.score ?? '--'}</div>
          <input id="rec-score" type="number" min="0" max="100" class="form-control score-field" value="${rec.score ?? ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">建議課程方案</label>
        <select id="rec-plan" class="form-control">
          ${plans.map(p => `<option ${rec.plan === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">強項能力</label>
      <input id="rec-strength" type="text" class="form-control" placeholder="如：計算能力佳、閱讀理解強" value="${rec.strength || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">待加強項目</label>
      <input id="rec-weakness" type="text" class="form-control" placeholder="如：應用題理解、文字題判斷" value="${rec.weakness || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">教師建議</label>
      <textarea id="rec-note" class="form-control">${rec.note || ''}</textarea>
    </div>
    <div id="rec-save-error" class="form-error hidden"></div>
    <div class="modal-footer">
      <button class="btn" id="rec-cancel">取消</button>
      <button class="btn btn-primary" id="rec-save">儲存紀錄 & 標記完成</button>
    </div>`;

  // Live score preview
  container.querySelector('#rec-score').addEventListener('input', e => {
    container.querySelector('#score-preview-val').textContent = e.target.value || '--';
  });
  container.querySelector('#rec-cancel').addEventListener('click', () => modal.classList.add('hidden'));
  container.querySelector('#rec-save').addEventListener('click', () => {
    const score = container.querySelector('#rec-score').value;
    recordsDB.upsert({
      bookingId,
      score:    score !== '' ? Number(score) : null,
      strength: container.querySelector('#rec-strength').value.trim(),
      weakness: container.querySelector('#rec-weakness').value.trim(),
      plan:     container.querySelector('#rec-plan').value,
      note:     container.querySelector('#rec-note').value.trim(),
      savedAt:  new Date().toISOString(),
      teacherId: user.id,
    });
    bookingsDB.update(bookingId, { status: 'done' });
    modal.classList.add('hidden');
    renderBookingsTable(container, user);
    showToast('紀錄已儲存', 'success');
  });

  modal.classList.remove('hidden');
}

function populateBkDateFilter(container, user) {
  const sel   = container.querySelector('#bk-filter-date');
  if (!sel) return;
  const dates = [...new Set(slotsDB.byClassroom(user.classroomId).map(s => s.date))].sort();
  sel.innerHTML = `<option value="">全部日期</option>` + dates.map(d => `<option value="${d}">${fmtDate(d)}</option>`).join('');
}

// ── Toast helper ───────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let tc = document.querySelector('.toast-container');
  if (!tc) { tc = document.createElement('div'); tc.className = 'toast-container'; document.body.appendChild(tc); }
  const t = document.createElement('div');
  t.className = `toast${type ? ' toast-'+type : ''}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
