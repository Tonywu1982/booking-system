import { accountsDB } from './data.js';
import { icon } from './icons.js';

export function renderLogin(onLogin) {
  document.body.innerHTML = `
<div class="login-page">
  <div class="login-card">
    <div class="login-logo">${icon('school','icon')}</div>
    <div class="login-title">學力診斷預約系統</div>
    <div class="login-sub">教師 / 管理員 登入</div>
    <div id="login-error" class="alert alert-error hidden">帳號或密碼錯誤，請重試</div>
    <div class="form-group">
      <label class="form-label">帳號</label>
      <input id="login-user" class="form-control" type="text" placeholder="請輸入帳號" autocomplete="username">
    </div>
    <div class="form-group">
      <label class="form-label">密碼</label>
      <input id="login-pass" class="form-control" type="password" placeholder="請輸入密碼" autocomplete="current-password">
    </div>
    <button class="btn btn-primary btn-block" id="btn-login" style="margin-top:8px">登入</button>
    <p class="mt-12 text-muted text-zh" style="font-size:.78rem;text-align:center;line-height:1.8">
      預設帳號：admin / admin123<br>
      教師帳號：teacher1 / teacher123
    </p>
  </div>
</div>`;

  const doLogin = () => {
    const u = document.querySelector('#login-user').value.trim();
    const p = document.querySelector('#login-pass').value;
    const user = accountsDB.login(u, p);
    if (user) {
      onLogin(user);
    } else {
      document.querySelector('#login-error').classList.remove('hidden');
      document.querySelector('#login-pass').value = '';
      document.querySelector('#login-pass').focus();
    }
  };

  document.querySelector('#btn-login').addEventListener('click', doLogin);
  document.querySelector('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.querySelector('#login-user').addEventListener('keydown', e => { if (e.key === 'Enter') document.querySelector('#login-pass').focus(); });
}
