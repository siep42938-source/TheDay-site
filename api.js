/* ============================================================
   TheDay Client — API клиент
   Все запросы к серверу через этот модуль
   ============================================================ */

const API = {
  base: 'https://the-day-site-ovk7.vercel.app/api',

  token() { return localStorage.getItem('td_token'); },

  async req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token()) headers['Authorization'] = 'Bearer ' + this.token();
    let res;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      res = await fetch(this.base + path, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch(e) {
      if (e.name === 'AbortError') throw new Error('Сервер не отвечает. Попробуйте позже.');
      throw new Error('Сервер недоступен');
    }
    let data;
    try {
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) throw new Error('bad content-type');
      data = await res.json();
    } catch { throw new Error('Ошибка сервера'); }
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  },

  get: (path) => API.req('GET', path),
  post: (path, body) => API.req('POST', path, body),
  patch: (path, body) => API.req('PATCH', path, body),

  // ── Auth ──
  auth: {
    registerSend: (d) => API.post('/auth/register/send', d),
    registerVerify: (d) => API.post('/auth/register/verify', d),
    loginSend: (d) => API.post('/auth/login/send', d),
    loginVerify: (d) => API.post('/auth/login/verify', d),
    resetSend: (d) => API.post('/auth/reset/send', d),
    resetVerify: (d) => API.post('/auth/reset/verify', d),
  },

  // ── User ──
  user: {
    me: () => API.get('/user/me'),
    update: (d) => API.patch('/user/me', d),
    changePassword: (d) => API.post('/user/change-password', d),
    activateKey: (d) => API.post('/user/activate-key', d),
    resetHwid: () => API.post('/user/reset-hwid', {}),
    bindHwid: (hwid) => API.post('/user/bind-hwid', { hwid }),
  },

  // Генерация браузерного fingerprint (HWID для веб)
  async getHwid() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        renderer,
        navigator.hardwareConcurrency || '',
      ].join('|');
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 32);
    } catch { return null; }
  },

  saveSession(token, user) {
    localStorage.setItem('td_token', token);
    localStorage.setItem('td_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('td_token');
    localStorage.removeItem('td_user');
    localStorage.removeItem('td_pending');
    window.location.href = 'login.html';
  },

  isLoggedIn() { return !!this.token(); },

  currentUser() {
    try { return JSON.parse(localStorage.getItem('td_user') || 'null'); }
    catch { return null; }
  },

  async syncUser() {
    if (!this.token()) return null;
    try {
      const data = await this.user.me();
      if (data.user) {
        localStorage.setItem('td_user', JSON.stringify(data.user));
        // Привязываем HWID при синхронизации
        const hwid = await this.getHwid();
        if (hwid && !data.user.hwid) {
          try { await this.user.bindHwid(hwid); } catch {}
        }
        return data.user;
      }
    } catch {}
    return this.currentUser();
  },
};

window.API = API;
