const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ── Хелперы ───────────────────────────────────────────────
async function getUsers() {
  const ids = await redis.smembers('users:ids') || [];
  if (!ids.length) return [];
  const users = await Promise.all(ids.map(id => redis.hgetall(`user:${id}`)));
  return users.filter(Boolean).map(u => ({
    ...u,
    balance: Number(u.balance || 0),
    balanceTotalIn: Number(u.balanceTotalIn || 0),
    balanceTotalOut: Number(u.balanceTotalOut || 0),
    balanceHistory: safeJson(u.balanceHistory, []),
    banned: u.banned === 'true',
  }));
}

function safeJson(str, fallback) {
  if (!str || str === '' || str === 'null') return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

async function saveUser(user) {
  const data = { ...user };
  if (Array.isArray(data.balanceHistory)) data.balanceHistory = JSON.stringify(data.balanceHistory);
  data.banned = String(data.banned || false);
  data.balance = String(data.balance || 0);
  data.balanceTotalIn = String(data.balanceTotalIn || 0);
  data.balanceTotalOut = String(data.balanceTotalOut || 0);
  await redis.hset(`user:${user.id}`, data);
  await redis.sadd('users:ids', user.id);
  // Индексы для быстрого поиска
  await redis.set(`idx:email:${user.email.toLowerCase()}`, user.id);
  await redis.set(`idx:username:${user.username.toLowerCase()}`, user.id);
  if (user.telegramId) await redis.set(`idx:tg:${user.telegramId}`, user.id);
  return user;
}

// ── DB API ────────────────────────────────────────────────
const db = {
  async getAllUsers() { return getUsers(); },

  async findUserByEmail(email) {
    if (!email) return null;
    const id = await redis.get(`idx:email:${email.toLowerCase()}`);
    if (!id) return null;
    return db.findUserById(id);
  },

  async findUserById(id) {
    if (!id) return null;
    const u = await redis.hgetall(`user:${id}`);
    if (!u) return null;
    return {
      ...u,
      balance: Number(u.balance || 0),
      balanceTotalIn: Number(u.balanceTotalIn || 0),
      balanceTotalOut: Number(u.balanceTotalOut || 0),
      balanceHistory: safeJson(u.balanceHistory, []),
      banned: u.banned === 'true',
    };
  },

  async findUserByUsername(username) {
    if (!username) return null;
    const id = await redis.get(`idx:username:${username.toLowerCase()}`);
    if (!id) return null;
    return db.findUserById(id);
  },

  async findUserByTelegramId(telegramId) {
    if (!telegramId) return null;
    const id = await redis.get(`idx:tg:${telegramId}`);
    if (!id) return null;
    return db.findUserById(id);
  },

  async createUser({ username, email, passwordHash }) {
    const user = {
      id: uuidv4(), username, email: email.toLowerCase(), passwordHash,
      role: 'Пользователь', createdAt: new Date().toISOString(),
      hwid: '', sub: '', subExpires: '', avatar: '',
      banned: false, banReason: '', lastHwidReset: '',
      telegramId: '', telegramUsername: '',
      balance: 0, balanceTotalIn: 0, balanceTotalOut: 0, balanceHistory: [],
    };
    await saveUser(user);
    return user;
  },

  async updateUser(id, updates) {
    const u = await db.findUserById(id);
    if (!u) return null;
    const merged = { ...u, ...updates };
    await saveUser(merged);
    return merged;
  },

  async deleteUser(id) {
    const u = await db.findUserById(id);
    if (!u) return false;
    await redis.del(`user:${id}`);
    await redis.srem('users:ids', id);
    await redis.del(`idx:email:${u.email}`);
    await redis.del(`idx:username:${u.username.toLowerCase()}`);
    if (u.telegramId) await redis.del(`idx:tg:${u.telegramId}`);
    return true;
  },

  // ── OTP ──────────────────────────────────────────────────
  async createOTP(email, type) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const mins = parseInt(process.env.OTP_EXPIRES_MIN || '10');
    const key = `otp:${email.toLowerCase()}:${type}`;
    await redis.set(key, JSON.stringify({ code, attempts: 0 }), { ex: mins * 60 });
    return code;
  },

  async verifyOTP(email, code, type) {
    const key = `otp:${email.toLowerCase()}:${type}`;
    const raw = await redis.get(key);
    if (!raw) return { ok: false, reason: 'Код не найден или уже использован' };
    const otp = safeJson(typeof raw === 'string' ? raw : JSON.stringify(raw), null);
    if (!otp) return { ok: false, reason: 'Код не найден или уже использован' };
    otp.attempts = (otp.attempts || 0) + 1;
    if (otp.attempts > 5) { await redis.del(key); return { ok: false, reason: 'Слишком много попыток' }; }
    if (otp.code !== String(code)) { await redis.set(key, JSON.stringify(otp), { ex: 600 }); return { ok: false, reason: 'Неверный код' }; }
    await redis.del(key);
    return { ok: true };
  },

  // ── Pending ───────────────────────────────────────────────
  async savePending(email, data) {
    await redis.set(`pending:${email.toLowerCase()}`, JSON.stringify(data), { ex: 900 });
  },

  async getPending(email) {
    const raw = await redis.get(`pending:${email.toLowerCase()}`);
    if (!raw) return null;
    return safeJson(typeof raw === 'string' ? raw : JSON.stringify(raw), null);
  },

  async deletePending(email) {
    await redis.del(`pending:${email.toLowerCase()}`);
  },

  // ── Ключи ─────────────────────────────────────────────────
  async createKey(type, days) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = n => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const key = `THEDAY-${type.toUpperCase()}-${rand(4)}-${rand(4)}`;
    const data = { key, type, days: String(days), used: 'false', usedBy: '', usedAt: '', createdAt: new Date().toISOString() };
    await redis.set(`key:${key}`, JSON.stringify(data), { ex: 86400 });
    await redis.sadd('keys:all', key);
    return key;
  },

  async useKey(key, userId) {
    const k = key.trim().toUpperCase();
    const raw = await redis.get(`key:${k}`);
    if (!raw) return { ok: false, reason: 'Ключ не найден' };
    const data = safeJson(typeof raw === 'string' ? raw : JSON.stringify(raw), null);
    if (!data) return { ok: false, reason: 'Ключ не найден' };
    if (data.used === 'true' || data.used === true) return { ok: false, reason: 'Ключ уже использован' };
    data.used = 'true'; data.usedBy = userId; data.usedAt = new Date().toISOString();
    await redis.set(`key:${k}`, JSON.stringify(data), { ex: 86400 });
    return { ok: true, days: Number(data.days), type: data.type };
  },

  async getAllKeys() {
    const keys = await redis.smembers('keys:all') || [];
    const all = await Promise.all(keys.map(k => redis.get(`key:${k}`)));
    return all.filter(Boolean).map(r => safeJson(typeof r === 'string' ? r : JSON.stringify(r), {}));
  },

  // ── Баланс ────────────────────────────────────────────────
  async getBalance(userId) {
    const u = await db.findUserById(userId);
    if (!u) return null;
    return { balance: u.balance || 0, totalIn: u.balanceTotalIn || 0, totalOut: u.balanceTotalOut || 0, history: u.balanceHistory || [] };
  },

  async addBalance(userId, amount, desc, source) {
    const u = await db.findUserById(userId);
    if (!u) return null;
    const entry = { id: uuidv4(), type: 'in', amount, desc: desc || 'Пополнение', source: source || 'manual', date: new Date().toISOString(), status: 'completed' };
    const history = [...(u.balanceHistory || []), entry];
    return db.updateUser(userId, { balance: (u.balance || 0) + amount, balanceTotalIn: (u.balanceTotalIn || 0) + amount, balanceHistory: history });
  },

  async spendBalance(userId, amount, desc) {
    const u = await db.findUserById(userId);
    if (!u) return { ok: false, reason: 'Не найден' };
    if ((u.balance || 0) < amount) return { ok: false, reason: 'Недостаточно средств' };
    const entry = { id: uuidv4(), type: 'out', amount, desc: desc || 'Списание', date: new Date().toISOString(), status: 'completed' };
    const history = [...(u.balanceHistory || []), entry];
    const updated = await db.updateUser(userId, { balance: (u.balance || 0) - amount, balanceTotalOut: (u.balanceTotalOut || 0) + amount, balanceHistory: history });
    return { ok: true, user: updated };
  },

  // ── Telegram ──────────────────────────────────────────────
  async linkTelegram(userId, telegramId, telegramUsername) {
    const existing = await db.findUserByTelegramId(telegramId);
    if (existing && existing.id !== userId) return { error: 'Этот Telegram уже привязан к другому аккаунту' };
    return db.updateUser(userId, { telegramId: String(telegramId), telegramUsername: telegramUsername || '' });
  },

  async unlinkTelegram(userId) {
    const u = await db.findUserById(userId);
    if (u?.telegramId) await redis.del(`idx:tg:${u.telegramId}`);
    return db.updateUser(userId, { telegramId: '', telegramUsername: '' });
  },

  async saveTgLinkToken(token, userId) {
    await redis.set(`tglink:${token}`, userId, { ex: 600 });
  },

  async consumeTgLinkToken(token) {
    const userId = await redis.get(`tglink:${token}`);
    if (!userId) return null;
    await redis.del(`tglink:${token}`);
    return userId;
  },

  cleanExpired() {},
};

module.exports = db;
