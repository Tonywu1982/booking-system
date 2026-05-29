import { GRADES, SUBJECTS, classroomsDB, slotsDB, bookingsDB, uid, fmtDate } from './data.js';
import { icon } from './icons.js';

export function renderParentPage(container) {
  container.innerHTML = buildParentPage();
  bindParentEvents(container);
}

function buildParentPage() {
  const classrooms = classroomsDB.all();
  const gradeOptions = GRADES.map(g => `<option value="${g.id}">${g.label}</option>`).join('');
  const subjectOptions = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('');
  const classroomOptions = classrooms.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return `
<div class="parent-layout">
  <div class="parent-topbar">
    ${icon('school', 'icon')} <span class="parent-topbar-title">學力診斷預約</span>
  </div>
  <div class="parent-content">
    <div id="parent-success-banner" class="alert alert-success hidden">
      ${icon('success', 'icon')} 預約成功！請準時到診，如需取消請提前聯絡教室。
    </div>

    <!-- Step indicator -->
    <div class="step-indicator" id="step-indicator">
      <div class="step-dot active" id="step-1">1</div>
      <div class="step-line" id="line-1"></div>
      <div class="step-dot" id="step-2">2</div>
      <div class="step-line" id="line-2"></div>
      <div class="step-dot" id="step-3">${icon('check','icon')}</div>
    </div>

    <!-- Step 1: 基本資料 -->
    <div id="parent-step-1">
      <div class="card">
        <div class="card-title">填寫學生資料</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">學生姓名 <span class="req">*</span></label>
            <input id="p-name" class="form-control" type="text" placeholder="請輸入學生姓名">
          </div>
          <div class="form-group">
            <label class="form-label">聯絡電話 <span class="req">*</span></label>
            <input id="p-phone" class="form-control" type="tel" placeholder="09xx-xxxxxx">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">學年 <span class="req">*</span></label>
            <select id="p-grade" class="form-control">${gradeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">診斷科目 <span class="req">*</span></label>
            <select id="p-subject" class="form-control">${subjectOptions}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">選擇教室 <span class="req">*</span></label>
          <select id="p-classroom" class="form-control">${classroomOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">家長備註（選填）</label>
          <textarea id="p-note" class="form-control" placeholder="如：學生近期學習狀況、特別想了解的方向..."></textarea>
        </div>
        <div id="p-step1-error" class="form-error hidden"></div>
        <div class="text-right mt-12">
          <button class="btn btn-primary" id="btn-to-step2">
            下一步：選擇時段 ${icon('','icon')}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: 選擇時段 -->
    <div id="parent-step-2" class="hidden">
      <div class="card">
        <div class="card-title">選擇診斷時段</div>
        <div id="slot-picker-area">
          <div class="alert alert-info">${icon('info','icon')} 正在載入可用時段...</div>
        </div>
        <div id="p-step2-error" class="form-error hidden"></div>
        <div class="flex justify-between mt-16">
          <button class="btn" id="btn-back-step1">← 返回修改</button>
          <button class="btn btn-primary" id="btn-to-step3">確認預約</button>
        </div>
      </div>
    </div>

    <!-- Step 3: 完成 -->
    <div id="parent-step-3" class="hidden">
      <div class="card" style="text-align:center;padding:40px 24px">
        <div class="score-ring" style="border-color:var(--green-400);color:var(--green-700);width:80px;height:80px;font-size:2rem">
          ${icon('check','icon')}
        </div>
        <h2 class="text-zh" style="margin-bottom:8px;margin-top:4px">預約成功！</h2>
        <p class="text-muted text-zh" id="confirm-summary"></p>
        <div id="confirm-detail" class="mt-16" style="background:var(--gray-50);border-radius:var(--radius-md);padding:16px;text-align:left;font-family:var(--font-zh);font-size:.875rem;line-height:2"></div>
        <button class="btn btn-primary mt-16" id="btn-new-booking">再預約一次</button>
      </div>
    </div>

    <!-- 我的預約紀錄（手機號查詢）-->
    <div class="card mt-16">
      <div class="card-title">查詢我的預約紀錄</div>
      <div class="flex gap-8">
        <input id="query-phone" class="form-control" type="tel" placeholder="輸入聯絡電話查詢">
        <button class="btn btn-primary" id="btn-query" style="white-space:nowrap">${icon('eye','icon')} 查詢</button>
      </div>
      <div id="query-result" class="mt-12"></div>
    </div>
  </div>
</div>`;
}

let selectedSlotId = null;
let step1Data = {};

function bindParentEvents(container) {
  selectedSlotId = null;
  step1Data = {};

  // Step 1 → Step 2
  container.querySelector('#btn-to-step2').addEventListener('click', () => {
    const name    = container.querySelector('#p-name').value.trim();
    const phone   = container.querySelector('#p-phone').value.trim();
    const gradeId = container.querySelector('#p-grade').value;
    const subject = container.querySelector('#p-subject').value;
    const cid     = container.querySelector('#p-classroom').value;
    const note    = container.querySelector('#p-note').value.trim();
    const errEl   = container.querySelector('#p-step1-error');

    if (!name || !phone) {
      errEl.textContent = '請填寫學生姓名與聯絡電話';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    step1Data = { name, phone, gradeId: Number(gradeId), subject, classroomId: cid, note };

    renderSlotPicker(container, cid, subject);
    goToStep(container, 2);
  });

  // Step 2 → Step 1
  container.querySelector('#btn-back-step1').addEventListener('click', () => goToStep(container, 1));

  // Step 2 → Confirm
  container.querySelector('#btn-to-step3').addEventListener('click', () => {
    if (!selectedSlotId) {
      const errEl = container.querySelector('#p-step2-error');
      errEl.textContent = '請選擇一個可用時段';
      errEl.classList.remove('hidden');
      return;
    }
    confirmBooking(container);
  });

  // New booking
  container.querySelector('#btn-new-booking').addEventListener('click', () => {
    selectedSlotId = null;
    step1Data = {};
    container.querySelector('#p-name').value = '';
    container.querySelector('#p-phone').value = '';
    container.querySelector('#p-note').value = '';
    goToStep(container, 1);
  });

  // Query bookings
  container.querySelector('#btn-query').addEventListener('click', () => {
    const phone = container.querySelector('#query-phone').value.trim();
    renderQueryResult(container, phone);
  });
  container.querySelector('#query-phone').addEventListener('keydown', e => {
    if (e.key === 'Enter') container.querySelector('#btn-query').click();
  });
}

function goToStep(container, step) {
  [1, 2, 3].forEach(n => {
    container.querySelector(`#parent-step-${n}`).classList.toggle('hidden', n !== step);
    const dot = container.querySelector(`#step-${n}`);
    dot.classList.remove('active', 'done');
    if (n < step) dot.classList.add('done');
    else if (n === step) dot.classList.add('active');
    if (n < 3) {
      const line = container.querySelector(`#line-${n}`);
      line.classList.toggle('done', n < step);
    }
  });
}

function renderSlotPicker(container, classroomId, subject) {
  selectedSlotId = null;
  const area = container.querySelector('#slot-picker-area');
  const slots = slotsDB.byClassroom(classroomId)
    .filter(s => s.subject === subject)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Group by date
  const byDate = {};
  slots.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });

  if (Object.keys(byDate).length === 0) {
    area.innerHTML = `<div class="alert alert-amber">${icon('info','icon')} 目前此教室沒有「${subject}」的開放時段，請聯絡教室或稍後再查詢。</div>`;
    return;
  }

  let html = '';
  Object.keys(byDate).sort().forEach(date => {
    html += `<p class="fw-600 text-zh mb-8 mt-12" style="font-size:.875rem;color:var(--gray-700)">${icon('calendar','icon')} ${fmtDate(date)}</p>`;
    html += `<div class="slot-grid">`;
    byDate[date].forEach(slot => {
      const booked = bookingsDB.bySlot(slot.id).length;
      const remain = slot.capacity - booked;
      const full   = remain <= 0;
      html += `
        <div class="slot-card ${full ? 'full' : ''}" data-slot-id="${slot.id}">
          <div class="slot-time">${slot.time}</div>
          <div class="slot-meta">${full ? '<span class="slot-full-label">已額滿</span>' : `剩 ${remain} 位`}</div>
        </div>`;
    });
    html += `</div>`;
  });
  area.innerHTML = html;

  area.querySelectorAll('.slot-card:not(.full)').forEach(el => {
    el.addEventListener('click', () => {
      area.querySelectorAll('.slot-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selectedSlotId = el.dataset.slotId;
      container.querySelector('#p-step2-error').classList.add('hidden');
    });
  });
}

function confirmBooking(container) {
  const slot     = slotsDB.get(selectedSlotId);
  const classroom = classroomsDB.get(step1Data.classroomId);
  const grade    = GRADES.find(g => g.id === step1Data.gradeId);
  const booking  = {
    id: uid('bk'),
    slotId: selectedSlotId,
    studentName: step1Data.name,
    phone: step1Data.phone,
    gradeId: step1Data.gradeId,
    subject: step1Data.subject,
    classroomId: step1Data.classroomId,
    note: step1Data.note,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  bookingsDB.add(booking);

  container.querySelector('#confirm-summary').textContent =
    `${step1Data.name} 同學的 ${step1Data.subject} 學力診斷`;
  container.querySelector('#confirm-detail').innerHTML = `
    <div>📚 科目：${step1Data.subject}</div>
    <div>🎓 學年：${grade?.label || ''}</div>
    <div>🏫 教室：${classroom?.name || ''}</div>
    <div>📅 日期：${fmtDate(slot.date)}</div>
    <div>⏰ 時間：${slot.time}</div>
    <div>📞 聯絡電話：${step1Data.phone}</div>
    ${step1Data.note ? `<div>📝 備註：${step1Data.note}</div>` : ''}
  `;
  goToStep(container, 3);
}

function renderQueryResult(container, phone) {
  const result = container.querySelector('#query-result');
  if (!phone) { result.innerHTML = `<div class="form-error">請輸入電話號碼</div>`; return; }

  const bookings = bookingsDB.all()
    .filter(b => b.phone === phone)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (bookings.length === 0) {
    result.innerHTML = `<div class="alert alert-amber">${icon('info','icon')} 查無此電話的預約紀錄</div>`;
    return;
  }

  const statusMap = { pending: ['待診斷','badge-amber'], done: ['已完成','badge-green'], cancelled: ['已取消','badge-gray'] };

  let rows = bookings.map(b => {
    const slot = slotsDB.get(b.slotId);
    const cls  = classroomsDB.get(b.classroomId);
    const [label, cls2] = statusMap[b.status] || ['未知','badge-gray'];
    return `<tr>
      <td>${b.studentName}</td>
      <td>${slot ? fmtDate(slot.date) : '-'}</td>
      <td>${slot?.time || '-'}</td>
      <td>${b.subject}</td>
      <td>${cls?.name || '-'}</td>
      <td><span class="badge ${cls2}">${label}</span></td>
    </tr>`;
  }).join('');

  result.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>學生</th><th>日期</th><th>時間</th><th>科目</th><th>教室</th><th>狀態</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
