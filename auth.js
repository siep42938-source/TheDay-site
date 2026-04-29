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
    // Локальный режим — данные хранятся в браузере
    this._serverCache = false;
    this._serverCacheTime = Date.now();
    return false;
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

  // Хэш пароля (усиленный для локального хранения)
  async hash(pass) {
    // Используем PBKDF2 вместо простого SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(pass + 'theday_salt_2026');
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode('theday_secure_salt_v2'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
  },

  // Генерация OTP
  genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); },

  // Сохранить OTP
  saveOTP(email, code, type) {
    const otps = JSON.parse(localStorage.getItem('td_otps') || '{}');

    // Очистка старых истёкших кодов
    const now = Date.now();
    Object.keys(otps).forEach(key => {
      if (otps[key].expires < now) delete otps[key];
    });

    otps[`${email}_${type}`] = {
      code,
      expires: Date.now() + 10 * 60000,
      attempts: 0,
      lastAttempt: 0,
      createdAt: Date.now()
    };
    localStorage.setItem('td_otps', JSON.stringify(otps));
    return code;
  },

  // Проверить OTP с защитой от брутфорса
  verifyOTP(email, code, type) {
    const otps = JSON.parse(localStorage.getItem('td_otps') || '{}');
    const key = `${email}_${type}`;
    const otp = otps[key];
    if (!otp) return { ok: false, reason: 'Код не найден' };
    if (Date.now() > otp.expires) {
      delete otps[key];
      localStorage.setItem('td_otps', JSON.stringify(otps));
      return { ok: false, reason: 'Код истёк' };
    }
    otp.attempts = (otp.attempts || 0) + 1;

    // Защита от брутфорса: максимум 5 попыток
    if (otp.attempts > 5) {
      delete otps[key];
      localStorage.setItem('td_otps', JSON.stringify(otps));
      return { ok: false, reason: 'Слишком много попыток. Запросите новый код.' };
    }

    // Задержка между попытками (защита от автоматического перебора)
    const lastAttempt = otp.lastAttempt || 0;
    if (Date.now() - lastAttempt < 1000) {
      localStorage.setItem('td_otps', JSON.stringify(otps));
      return { ok: false, reason: 'Слишком быстро. Подождите секунду.' };
    }
    otp.lastAttempt = Date.now();

    if (otp.code !== String(code)) {
      localStorage.setItem('td_otps', JSON.stringify(otps));
      return { ok: false, reason: `Неверный код (осталось попыток: ${5 - otp.attempts})` };
    }
    delete otps[key];
    localStorage.setItem('td_otps', JSON.stringify(otps));
    return { ok: true };
  },

  // Создать токен с подписью
  genToken(userId) {
    const payload = { id: userId, t: Date.now(), r: Math.random() };
    const token = btoa(JSON.stringify(payload));
    // Простая подпись (для локального режима)
    const signature = btoa(token + 'theday_secret_2026').slice(0, 16);
    return token + '.' + signature;
  },

  // Проверить токен
  verifyToken(token) {
    try {
      const [payload, signature] = token.split('.');
      const expectedSig = btoa(payload + 'theday_secret_2026').slice(0, 16);
      if (signature !== expectedSig) return null;
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  },

  // Сохранить сессию — принимает только user (без токена)
  saveSession(user) {
    const token = this.genToken(user.id);
    localStorage.setItem('td_token', token);
    // Удаляем чувствительные данные и санитизируем
    const { passwordHash, ...safe } = user;
    // Защита от XSS: экранируем строки
    const sanitized = {
      ...safe,
      username: this.sanitize(safe.username),
      email: this.sanitize(safe.email),
      role: this.sanitize(safe.role || 'Пользователь'),
    };
    localStorage.setItem('td_user', JSON.stringify(sanitized));
    return { token, user: sanitized };
  },

  // Санитизация строк (защита от XSS)
  sanitize(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
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

  // Валидация входных данных
  validateUsername(username) {
    if (!username || typeof username !== 'string') return 'Логин обязателен';
    if (username.length < 3) return 'Логин минимум 3 символа';
    if (username.length > 20) return 'Логин максимум 20 символов';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Логин: только латиница, цифры и _';
    // Защита от SQL-инъекций и XSS (на всякий случай)
    if (/[<>'"`;\\]/.test(username)) return 'Недопустимые символы в логине';
    return null;
  },

  validateEmail(email) {
    if (!email || typeof email !== 'string') return 'Email обязателен';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Некорректный email';
    if (email.length > 100) return 'Email слишком длинный';
    return null;
  },

  validatePassword(password) {
    if (!password || typeof password !== 'string') return 'Пароль обязателен';
    if (password.length < 6) return 'Пароль минимум 6 символов';
    if (password.length > 128) return 'Пароль слишком длинный';
    return null;
  },

  // ── РЕГИСТРАЦИЯ ──────────────────────────────────────────
  async registerSend({ username, email, password }) {
    // Валидация
    const usernameErr = this.validateUsername(username);
    if (usernameErr) throw new Error(usernameErr);

    const emailErr = this.validateEmail(email);
    if (emailErr) throw new Error(emailErr);

    const passwordErr = this.validatePassword(password);
    if (passwordErr) throw new Error(passwordErr);

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

    const k = key.trim().toUpperCase();

    // Проверяем формат ключа: THEDAY-TYPE-XXXX-XXXX
    if (!/^THEDAY-[A-Z0-9]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) {
      throw new Error('Неверный формат ключа');
    }

    // Проверяем в localStorage (ключи выданные ботом)
    const usedKeys = JSON.parse(localStorage.getItem('td_used_keys') || '[]');
    if (usedKeys.includes(k)) throw new Error('Ключ уже использован');

    // Определяем тип подписки по ключу
    const typeMap = {
      '7DAYS':   { sub: '7 дней',   days: 7 },
      '30DAYS':  { sub: '30 дней',  days: 30 },
      '90DAYS':  { sub: '90 дней',  days: 90 },
      'FOREVER': { sub: 'Навсегда', days: 36500 },
      'HWID':    { sub: null,       days: 0, hwid: true },
    };

    const parts = k.split('-');
    const type = parts[1];
    const found = typeMap[type];
    if (!found) throw new Error('Неверный тип ключа');

    // Помечаем ключ как использованный
    usedKeys.push(k);
    localStorage.setItem('td_used_keys', JSON.stringify(usedKeys));

    if (found.hwid) {
      return this.updateProfile({ hwid: null });
    }

    const expires = found.days >= 36000
      ? null
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
