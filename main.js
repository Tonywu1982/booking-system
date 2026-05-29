import { initData, accountsDB } from './data.js';
import { icon } from './icons.js';
import { renderLogin } from './login.js';
import { renderParentPage } from './parent.js';
import { renderTeacherSlots, renderTeacherBookings } from './teacher.js';
import { renderAdminOverview, renderAdminClassrooms, renderAdminAccounts } from './admin.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────
initData();

let currentUser = null;

// Check session
const savedUserId = sessionStorage.getItem('ld_user');
if (savedUserId) {
  currentUser = accountsDB.get(savedUserId);
}

if (currentUser) {
  mountApp();
} else {
  // Check URL param for parent view
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'book') {
    mountParentView();
  } else {
    showEntryScreen();
  }
}

// ── Entry screen (choose parent or staff) ──────────────────────────────────
function showEntryScreen() {
  document.body.innerHTML = `
<div class="login-page" style="flex-direction:column;gap:20px">
  <div style="text-align:center;color:#fff;margin-bottom:8px">
    <div style="font-size:2rem;margin-bottom:8px">${icon('school','')}</div>
    <div style="font-size:1.4rem;font-weight:700;font-family:var(--font-zh)">學力診斷預約系統</div>
    <div style="font-size:.875rem;opacity:.75;margin-top:4px;font-family:var(--font-zh)">請選擇您的身分</div>
  </div>
  <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">
    <button id="btn-parent" style="background:#fff;border:none;border-radius:16px;padding:28px 32px;cursor:pointer;min-width:160px;transition:.15s;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:2rem;margin-bottom:8px">${icon('users','')}</div>
      <div style="font-size:1rem;font-weight:700;color:#1d9e75;font-family:var(--font-zh)">家長預約</div>
      <div style="font-size:.8rem;color:#888780;margin-top:4px;font-family:var(--font-zh)">預約學力診斷時段</div>
    </button>
    <button id="btn-staff" style="background:#fff;border:none;border-radius:16px;padding:28px 32px;cursor:pointer;min-width:160px;transition:.15s;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:2rem;margin-bottom:8px">${icon('shield','')}</div>
      <div style="font-size:1rem;font-weight:700;color:#085041;font-family:var(--font-zh)">教師 / 管理員</div>
      <div style="font-size:.8rem;color:#888780;margin-top:4px;font-family:var(--font-zh)">後台登入</div>
    </button>
  </div>
</div>`;

  document.querySelector('#btn-parent').addEventListener('click', mountParentView);
  document.querySelector('#btn-staff').addEventListener('click', () => {
    renderLogin(user => {
      currentUser = user;
      sessionStorage.setItem('ld_user', user.id);
      mountApp();
    });
  });
}

// ── Parent view (no login needed) ─────────────────────────────────────────
function mountParentView() {
  const container = document.getElementById('app') || document.body;
  container.innerHTML = '';
  renderParentPage(container);
  // Add a back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-sm';
  backBtn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:50;box-shadow:0 2px 8px rgba(0,0,0,.15)';
  backBtn.innerHTML = `← 返回`;
  backBtn.addEventListener('click', showEntryScreen);
  document.body.appendChild(backBtn);
}

// ── Staff app shell ────────────────────────────────────────────────────────
function mountApp() {
  const isAdmin   = currentUser.role === 'admin';
  const isTeacher = currentUser.role === 'teacher';

  const nav = isAdmin
    ? [
        { id: 'admin-overview',   label: '數據總覽',   ic: 'chart-bar' },
        { id: 'admin-classrooms', label: '教室管理',   ic: 'office' },
        { id: 'admin-accounts',   label: '帳號管理',   ic: 'shield' },
      ]
    : [
        { id: 'teacher-slots',    label: '時段管理',   ic: 'calendar' },
        { id: 'teacher-bookings', label: '預約名單',   ic: 'users' },
      ];

  const sidebarItems = nav.map(n =>
    `<div class="sidebar-item ${n === nav[0] ? 'active' : ''}" data-page="${n.id}">
      ${icon(n.ic, 'icon')} ${n.label}
    </div>`
  ).join('');

  document.body.innerHTML = `
<div class="app-shell">
  <div class="topbar">
    ${icon('school', 'icon')}
    <span class="topbar-logo">學力診斷預約系統</span>
    <div class="topbar-spacer"></div>
    <div class="topbar-user">
      <div class="avatar">${currentUser.name.slice(-1)}</div>
      <span>${currentUser.name}${isAdmin ? '（管理員）' : ' 老師'}</span>
      <button class="btn-logout" id="btn-logout">${icon('logout','icon')} 登出</button>
    </div>
  </div>
  <div class="layout">
    <div class="sidebar">${sidebarItems}</div>
    <div class="main-content" id="main-content"></div>
  </div>
</div>
<div class="toast-container"></div>`;

  const mainContent = document.getElementById('main-content');

  // Sidebar nav
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderPage(item.dataset.page, mainContent);
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('ld_user');
    currentUser = null;
    showEntryScreen();
  });

  // Render first page
  renderPage(nav[0].id, mainContent);
}

function renderPage(pageId, container) {
  container.innerHTML = '';
  switch (pageId) {
    case 'admin-overview':   renderAdminOverview(container); break;
    case 'admin-classrooms': renderAdminClassrooms(container); break;
    case 'admin-accounts':   renderAdminAccounts(container); break;
    case 'teacher-slots':    renderTeacherSlots(container, currentUser); break;
    case 'teacher-bookings': renderTeacherBookings(container, currentUser); break;
  }
}
