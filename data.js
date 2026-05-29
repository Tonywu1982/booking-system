// ── 學年清單（依 sequence_number 排序）──────────────────────────────────────
export const GRADES = [
  { id: 0,  label: '學前零' },
  { id: 1,  label: '學前一' },
  { id: 2,  label: '學前二' },
  { id: 3,  label: '學前三' },
  { id: 4,  label: '幼小' },
  { id: 5,  label: '幼中' },
  { id: 6,  label: '幼大' },
  { id: 7,  label: '1年級' },
  { id: 8,  label: '2年級' },
  { id: 9,  label: '3年級' },
  { id: 10, label: '4年級' },
  { id: 11, label: '5年級' },
  { id: 12, label: '6年級' },
  { id: 13, label: '7年級' },
  { id: 14, label: '8年級' },
  { id: 15, label: '9年級' },
  { id: 16, label: '10年級' },
  { id: 17, label: '11年級' },
  { id: 18, label: '12年級' },
  { id: 19, label: '大一' },
  { id: 20, label: '大二' },
  { id: 21, label: '大三' },
  { id: 22, label: '大四' },
  { id: 23, label: '社會人士' },
];

// ── 科目（三種）────────────────────────────────────────────────────────────
export const SUBJECTS = ['國語文', '數學', '英文'];

// ── 預設教室清單（管理員可新增）──────────────────────────────────────────────
const DEFAULT_CLASSROOMS = [
  { id: 'cls-001', name: '台北大安教室', address: '台北市大安區' },
  { id: 'cls-002', name: '台北信義教室', address: '台北市信義區' },
  { id: 'cls-003', name: '新北板橋教室', address: '新北市板橋區' },
];

// ── 預設帳號 ───────────────────────────────────────────────────────────────
const DEFAULT_ACCOUNTS = [
  { id: 'u-admin', name: '系統管理員', role: 'admin',   classroomId: null,      username: 'admin',   password: 'admin123',   active: true },
  { id: 'u-t001',  name: '陳美玲',     role: 'teacher', classroomId: 'cls-001', username: 'teacher1', password: 'teacher123', active: true },
  { id: 'u-t002',  name: '張建國',     role: 'teacher', classroomId: 'cls-002', username: 'teacher2', password: 'teacher123', active: true },
  { id: 'u-t003',  name: '王怡君',     role: 'teacher', classroomId: 'cls-003', username: 'teacher3', password: 'teacher123', active: true },
];

// ── localStorage helpers ───────────────────────────────────────────────────
function ls(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── 初始化種子資料 ─────────────────────────────────────────────────────────
export function initData() {
  if (!localStorage.getItem('ld_inited')) {
    save('ld_accounts',   DEFAULT_ACCOUNTS);
    save('ld_classrooms', DEFAULT_CLASSROOMS);
    save('ld_slots',      []);
    save('ld_bookings',   []);
    save('ld_records',    []);
    localStorage.setItem('ld_inited', '1');
  }
}

// ── 帳號 ───────────────────────────────────────────────────────────────────
export const accountsDB = {
  all:    ()        => ls('ld_accounts', []),
  get:    id        => accountsDB.all().find(a => a.id === id) || null,
  save:   list      => save('ld_accounts', list),
  login:  (u, p)    => accountsDB.all().find(a => a.username === u && a.password === p && a.active) || null,
  add:    account   => { const list = accountsDB.all(); list.push(account); accountsDB.save(list); },
  update: (id, patch) => {
    const list = accountsDB.all().map(a => a.id === id ? { ...a, ...patch } : a);
    accountsDB.save(list);
  },
};

// ── 教室 ───────────────────────────────────────────────────────────────────
export const classroomsDB = {
  all:  ()      => ls('ld_classrooms', []),
  get:  id      => classroomsDB.all().find(c => c.id === id) || null,
  save: list    => save('ld_classrooms', list),
  add:  classroom => { const list = classroomsDB.all(); list.push(classroom); classroomsDB.save(list); },
  update: (id, patch) => {
    const list = classroomsDB.all().map(c => c.id === id ? { ...c, ...patch } : c);
    classroomsDB.save(list);
  },
};

// ── 時段 ───────────────────────────────────────────────────────────────────
export const slotsDB = {
  all:          ()           => ls('ld_slots', []),
  byClassroom:  cid          => slotsDB.all().filter(s => s.classroomId === cid),
  get:          id           => slotsDB.all().find(s => s.id === id) || null,
  save:         list         => save('ld_slots', list),
  add:          slot         => { const list = slotsDB.all(); list.push(slot); slotsDB.save(list); },
  delete:       id           => { slotsDB.save(slotsDB.all().filter(s => s.id !== id)); },
  update:       (id, patch)  => {
    slotsDB.save(slotsDB.all().map(s => s.id === id ? { ...s, ...patch } : s));
  },
};

// ── 預約 ───────────────────────────────────────────────────────────────────
export const bookingsDB = {
  all:         ()  => ls('ld_bookings', []),
  bySlot:      sid => bookingsDB.all().filter(b => b.slotId === sid),
  byClassroom: cid => {
    const slotIds = slotsDB.byClassroom(cid).map(s => s.id);
    return bookingsDB.all().filter(b => slotIds.includes(b.slotId));
  },
  get:    id       => bookingsDB.all().find(b => b.id === id) || null,
  save:   list     => save('ld_bookings', list),
  add:    booking  => {
    const list = bookingsDB.all();
    list.push(booking);
    bookingsDB.save(list);
  },
  cancel: id       => { bookingsDB.save(bookingsDB.all().filter(b => b.id !== id)); },
  update: (id, patch) => {
    bookingsDB.save(bookingsDB.all().map(b => b.id === id ? { ...b, ...patch } : b));
  },
};

// ── 診斷紀錄 ───────────────────────────────────────────────────────────────
export const recordsDB = {
  all:          ()  => ls('ld_records', []),
  byBooking:    bid => recordsDB.all().find(r => r.bookingId === bid) || null,
  byClassroom:  cid => {
    const bids = bookingsDB.byClassroom(cid).map(b => b.id);
    return recordsDB.all().filter(r => bids.includes(r.bookingId));
  },
  save:   list      => save('ld_records', list),
  upsert: record    => {
    const list = recordsDB.all().filter(r => r.bookingId !== record.bookingId);
    list.push(record);
    recordsDB.save(list);
  },
};

// ── uid 工廠 ───────────────────────────────────────────────────────────────
export function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── 格式化日期 ────────────────────────────────────────────────────────────
export function fmtDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const days = ['日','一','二','三','四','五','六'];
  return `${d.getMonth()+1}/${d.getDate()}（週${days[d.getDay()]}）`;
}

export function fmtDateTime(isoDate, time) {
  return `${fmtDate(isoDate)} ${time}`;
}

// ── 統計輔助 ───────────────────────────────────────────────────────────────
export function statsForClassroom(cid) {
  const slots    = slotsDB.byClassroom(cid);
  const bookings = bookingsDB.byClassroom(cid);
  const records  = recordsDB.byClassroom(cid);
  const total    = bookings.length;
  const done     = bookings.filter(b => b.status === 'done').length;
  const pending  = bookings.filter(b => b.status === 'pending').length;
  const scores   = records.filter(r => r.score != null).map(r => Number(r.score));
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // 科目分佈
  const subjectMap = {};
  SUBJECTS.forEach(s => { subjectMap[s] = 0; });
  bookings.forEach(b => {
    const slot = slotsDB.get(b.slotId);
    if (slot) subjectMap[slot.subject] = (subjectMap[slot.subject] || 0) + 1;
  });

  return { total, done, pending, avgScore, subjectMap, slotCount: slots.length };
}
