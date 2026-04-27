/* ============================================================
   TheDay — Локальная система аккаунтов
   Работает БЕЗ сервера. Данные хранятся в браузере.
   При наличии сервера — переключается на API автоматически.
   ============================================================ */

const Auth = {
  // Проверяем есть ли сервер (с кэшем на 30 сек)
  _serverCache: null,
  _serverCacheTime: 0,
  async hasServer() {
    const now = Date.now();
    if (this._serverCache !== null && now - this._serverCacheTime < 30000) {
      return this._serverCache;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const r = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      this._serverCache = r.ok;
    } catch {
      this._serverCache = false;
    }
    this._serverCacheTime = now;
    return this._serverCache;
  },

  // Получить всех пользователей
  getUsers() {
    try { return JSON.parse(localStorage.getItem('td_users') || '[]'); }
    catch { return []; }
  },
  saveUsers(users) { localStorage.setItem('td_users', JSON.stringify(users)); },

  // Найти пользователя
  findByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null; },
  findByUsername(u) { return this.getUsers().find(x => x.username.toLowerCase() === u.toLowerCase()) || null; },

  // Хэш пароля (простой, для локального хранения)
  async hash(pass) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass + 'theday_salt_2026'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  },

  // Генерация OTP
  genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); },

  // Сохранить OTP
  saveOTP(email, code, type) {
    const otps = JSON.parse(localStorage.getItem('td_otps') || '{}');
    otps[`${email}_${type}`] = { code, expires: Date.now() + 10 * 60000, attempts: 0 };
    localStorage.setItem('td_otps', JSON.stringify(otps));
    return code;
  },

  // Проверить OTP
  verifyOTP(email, code, type) {
    const otps = JSON.parse(localStorage.getItem('td_otps') || '{}');
    const key = `${email}_${type}`;
    const otp = otps[key];
    if (!otp) return { ok: false, reason: 'Код не найден' };
    if (Date.now() > otp.expires) { delete otps[key]; localStorage.setItem('td_otps', JSON.stringify(otps)); return { ok: false, reason: 'Код истёк' }; }
    otp.attempts++;
    if (otp.attempts > 5) { delete otps[key]; localStorage.setItem('td_otps', JSON.stringify(otps)); return { ok: false, reason: 'Слишком много попыток' }; }
    if (otp.code !== String(code)) { localStorage.setItem('td_otps', JSON.stringify(otps)); return { ok: false, reason: 'Неверный код' }; }
    delete otps[key];
    localStorage.setItem('td_otps', JSON.stringify(otps));
    return { ok: true };
  },

  // Создать токен
  genToken(userId) { return btoa(JSON.stringify({ id: userId, t: Date.now(), r: Math.random() })); },

  // Сохранить сессию — принимает только user (без токена)
  saveSession(user) {
    const token = this.genToken(user.id);
    localStorage.setItem('td_token', token);
    const { passwordHash, ...safe } = user;
    localStorage.setItem('td_user', JSON.stringify(safe));
    return { token, user: safe };
  },

  // Текущий пользователь
  currentUser() {
    try { return JSON.parse(localStorage.getItem('td_user') || 'null'); }
    catch { return null; }
  },
  isLoggedIn() { return !!localStorage.getItem('td_token'); },
  logout() {
    localStorage.removeItem('td_token');
    localStorage.removeItem('td_user');
    localStorage.removeItem('td_pending');
    window.location.href = 'login.html';
  },

  // ── РЕГИСТРАЦИЯ ──────────────────────────────────────────
  async registerSend({ username, email, password }) {
    if (!username || !email || !password) throw new Error('Заполните все поля');
    if (username.length < 3) throw new Error('Логин минимум 3 символа');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Логин: только латиница, цифры и _');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Некорректный email');
    if (password.length < 6) throw new Error('Пароль минимум 6 символов');
    if (this.findByEmail(email)) throw new Error('Email уже зарегистрирован');
    if (this.findByUsername(username)) throw new Error('Логин уже занят');

    const hash = await this.hash(password);
    // Сохраняем pending
    localStorage.setItem('td_pending', JSON.stringify({ username, email, passwordHash: hash, expires: Date.now() + 15 * 60000 }));

    const code = this.saveOTP(email, this.genOTP(), 'register');
    // Показываем код на экране (без сервера)
    this._showDevCode(code, email);
    return { ok: true, message: `Код: ${code}` };
  },

  async registerVerify({ email, code }) {
    const result = this.verifyOTP(email, code, 'register');
    if (!result.ok) throw new Error(result.reason);

    const pending = JSON.parse(localStorage.getItem('td_pending') || 'null');
    if (!pending || Date.now() > pending.expires) throw new Error('Данные истекли. Начните заново.');

    const users = this.getUsers();
    const user = {
      id: 'TD-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      username: pending.username,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: 'Пользователь',
      createdAt: new Date().toISOString(),
      sub: null, subExpires: null, hwid: null, avatar: null,
    };
    users.push(user);
    this.saveUsers(users);
    localStorage.removeItem('td_pending');
    return this.saveSession(user);
  },

  // ── ВХОД ────────────────────────────────────────────────
  async loginSend({ email, password }) {
    if (!email || !password) throw new Error('Заполните все поля');
    const user = this.findByEmail(email);
    if (!user) throw new Error('Неверный email или пароль');
    const hash = await this.hash(password);
    if (hash !== user.passwordHash) throw new Error('Неверный email или пароль');

    const code = this.saveOTP(email, this.genOTP(), 'login');
    this._showDevCode(code, email);
    return { ok: true, message: `Код отправлен` };
  },

  async loginVerify({ email, code }) {
    const result = this.verifyOTP(email, code, 'login');
    if (!result.ok) throw new Error(result.reason);
    const user = this.findByEmail(email);
    if (!user) throw new Error('Пользователь не найден');
    return this.saveSession(user);
  },

  // ── СБРОС ПАРОЛЯ ────────────────────────────────────────
  async resetSend({ email }) {
    const user = this.findByEmail(email);
    if (!user) return { ok: true }; // не раскрываем
    const code = this.saveOTP(email, this.genOTP(), 'reset');
    this._showDevCode(code, email);
    return { ok: true };
  },

  async resetVerify({ email, code, newPassword }) {
    const result = this.verifyOTP(email, code, 'reset');
    if (!result.ok) throw new Error(result.reason);
    if (!newPassword || newPassword.length < 6) throw new Error('Пароль минимум 6 символов');
    const users = this.getUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) throw new Error('Пользователь не найден');
    users[idx].passwordHash = await this.hash(newPassword);
    this.saveUsers(users);
    return { ok: true };
  },

  // ── ОБНОВИТЬ ПРОФИЛЬ ────────────────────────────────────
  updateProfile(updates) {
    const user = this.currentUser();
    if (!user) throw new Error('Не авторизован');
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) throw new Error('Пользователь не найден');
    Object.assign(users[idx], updates);
    this.saveUsers(users);
    const { passwordHash, ...safe } = users[idx];
    localStorage.setItem('td_user', JSON.stringify(safe));
    return safe;
  },

  // ── АКТИВИРОВАТЬ КЛЮЧ ────────────────────────────────────
  activateKey(key) {
    if (!key || typeof key !== 'string') throw new Error('Неверный ключ');
    const keys = {
      'THEDAY-7DAY-DEMO':     { sub: '7 дней',   days: 7 },
      'THEDAY-30DAY-DEMO':    { sub: '30 дней',  days: 30 },
      'THEDAY-90DAY-DEMO':    { sub: '90 дней',  days: 90 },
      'THEDAY-FOREVER-DEMO':  { sub: 'Навсегда', days: 36500 },
    };
    const found = keys[key.trim().toUpperCase()];
    if (!found) throw new Error('Неверный ключ активации');
    // Используем ISO формат для корректного сравнения дат
    const expires = found.days >= 36000
      ? null  // Навсегда — нет даты истечения
      : new Date(Date.now() + found.days * 86400000).toISOString();
    return this.updateProfile({ sub: found.sub, subExpires: expires });
  },

  // ── Показать код на экране (без сервера) ─────────────────
  _showDevCode(code, email) {
    document.getElementById('devCodeToast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'devCodeToast';
    toast.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      z-index:99999;
      background:rgba(10,10,18,0.97);
      border:1px solid rgba(135,206,235,0.3);
      border-radius:14px;padding:20px 28px;
      text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(135,206,235,0.1);
      backdrop-filter:blur(20px);
      font-family:'Inter',sans-serif;
      animation:slideDown .4s cubic-bezier(.16,1,.3,1);
      min-width:280px;
    `;

    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;color:#4fc3f7;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px';
    label.textContent = '📧 Код подтверждения';

    const emailEl = document.createElement('div');
    emailEl.style.cssText = 'font-size:11px;color:#4a5568;margin-bottom:12px';
    emailEl.textContent = email;

    const codeEl = document.createElement('div');
    codeEl.style.cssText = 'font-size:42px;font-weight:900;letter-spacing:10px;color:#87CEEB;font-family:monospace;margin-bottom:8px';
    codeEl.textContent = code;

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#4a5568';
    hint.textContent = 'Действителен 10 минут';

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position:absolute;top:10px;right:12px;background:none;border:none;color:#4a5568;cursor:pointer;font-size:16px';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => toast.remove();

    toast.append(label, emailEl, codeEl, hint, closeBtn);
    document.body.appendChild(toast);

    if (!document.getElementById('devCodeStyle')) {
      const s = document.createElement('style');
      s.id = 'devCodeStyle';
      s.textContent = '@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(s);
    }

    setTimeout(() => toast.remove(), 5 * 60000);
  },
};

// Совместимость с API объектом из api.js
window.Auth = Auth;

// Переопределяем API если сервер недоступен
(async () => {
  const serverOk = await Auth.hasServer();
  if (!serverOk && window.API) {
    // Подменяем методы API на локальные
    window.API.auth = {
      registerSend: (d) => Auth.registerSend(d),
      registerVerify: (d) => Auth.registerVerify(d),
      loginSend: (d) => Auth.loginSend(d),
      loginVerify: (d) => Auth.loginVerify(d),
      resetSend: (d) => Auth.resetSend(d),
      resetVerify: (d) => Auth.resetVerify(d),
    };
    window.API.isLoggedIn = () => Auth.isLoggedIn();
    window.API.currentUser = () => Auth.currentUser();
    window.API.logout = () => Auth.logout();
    window.API.saveSession = (token, user) => {
      localStorage.setItem('td_token', token);
      localStorage.setItem('td_user', JSON.stringify(user));
    };
    console.log('✦ TheDay: локальный режим (без сервера)');
  } else if (serverOk) {
    console.log('✦ TheDay: серверный режим');
  }
})();
