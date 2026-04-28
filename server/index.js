require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');
const { sendOTP } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'theday_secret_change_me';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_theday_2026';
const LAUNCHER_SECRET = process.env.LAUNCHER_SECRET || 'launcher_theday_2026';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-admin-secret','x-launcher-secret'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..')));

const lim = (max, win=15) => rateLimit({ windowMs:win*60*1000, max, message:{error:'Слишком много запросов'} });

function auth(req,res,next){
  const h=req.headers.authorization;
  if(!h?.startsWith('Bearer ')) return res.status(401).json({error:'Не авторизован'});
  try {
    req.user=jwt.verify(h.slice(7),JWT_SECRET);
    // Проверяем что пользователь реально существует
    const u=db.findUserById(req.user.id)||db.findUserByEmail(req.user.email);
    if(!u) return res.status(401).json({error:'Сессия устарела. Войдите заново.'});
    req.user.id=u.id; // используем актуальный ID из БД
    next();
  }
  catch { res.status(401).json({error:'Токен недействителен. Войдите заново.'}); }
}
function admin(req,res,next){
  const s=req.headers['x-admin-secret']||req.body?.adminSecret;
  if(s!==ADMIN_SECRET) return res.status(403).json({error:'Неверный секретный код'});
  next();
}
function launcher(req,res,next){
  if(req.headers['x-launcher-secret']!==LAUNCHER_SECRET) return res.status(403).json({error:'Неверный ключ'});
  next();
}
function safe(u){ if(!u)return null; const {passwordHash,...s}=u; return s; }

// ══ AUTH ══════════════════════════════════════════════════

// Регистрация — отправить код на почту
app.post('/api/auth/register/send', lim(10), async (req,res)=>{
  const {username,email,password}=req.body;
  if(!username||!email||!password) return res.status(400).json({error:'Заполните все поля'});
  if(username.length<3||username.length>20) return res.status(400).json({error:'Логин: 3–20 символов'});
  if(!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({error:'Логин: только латиница, цифры и _'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Некорректный email'});
  if(password.length<6) return res.status(400).json({error:'Пароль минимум 6 символов'});
  if(db.findUserByEmail(email)) return res.status(409).json({error:'Email уже зарегистрирован'});
  if(db.findUserByUsername(username)) return res.status(409).json({error:'Логин уже занят'});

  const passwordHash=await bcrypt.hash(password,12);
  db.savePending(email,{username,passwordHash});
  const code=db.createOTP(email,'register');

  try {
    await sendOTP(email,code,'register');
    res.json({ok:true,message:`Код отправлен на ${email}`,_devCode:code});
  } catch(e) {
    console.error('SMTP:',e.message);
    // В режиме разработки показываем код даже при ошибке SMTP
    if(process.env.NODE_ENV==='development'){
      return res.json({ok:true,message:`Код: ${code} (SMTP недоступен)`,_devCode:code});
    }
    res.status(500).json({error:'Ошибка отправки письма. Проверьте настройки SMTP.'});
  }
});

// Регистрация — подтвердить код
app.post('/api/auth/register/verify', lim(20), async (req,res)=>{
  const {email,code}=req.body;
  if(!email||!code) return res.status(400).json({error:'Укажите email и код'});
  const r=db.verifyOTP(email,code,'register');
  if(!r.ok) return res.status(400).json({error:r.reason});
  const p=db.getPending(email);
  if(!p) return res.status(400).json({error:'Данные истекли. Начните заново.'});
  const user=db.createUser({username:p.username,email,passwordHash:p.passwordHash});
  db.deletePending(email);
  const token=jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:'7d'});
  res.json({ok:true,token,user:safe(user)});
});

// Вход — отправить код
app.post('/api/auth/login/send', lim(10), async (req,res)=>{
  const {email,password}=req.body;
  if(!email||!password) return res.status(400).json({error:'Заполните все поля'});
  // Поддержка входа по email ИЛИ никнейму
  let user=db.findUserByEmail(email)||db.findUserByUsername(email);
  if(!user) return res.status(401).json({error:'Неверный email/никнейм или пароль'});
  if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'+(user.banReason?': '+user.banReason:'')});
  const ok=await bcrypt.compare(password,user.passwordHash);
  if(!ok) return res.status(401).json({error:'Неверный email/никнейм или пароль'});
  const code=db.createOTP(user.email,'login');
  try {
    await sendOTP(user.email,code,'login');
    res.json({ok:true,message:`Код отправлен на ${user.email}`,email:user.email,_devCode:code});
  } catch(e) {
    console.error('SMTP:',e.message);
    if(process.env.NODE_ENV==='development'){
      return res.json({ok:true,message:`Код: ${code} (SMTP недоступен)`,_devCode:code});
    }
    res.status(500).json({error:'Ошибка отправки письма. Проверьте настройки SMTP.'});
  }
});

// Вход — подтвердить код
app.post('/api/auth/login/verify', lim(20), async (req,res)=>{
  const {email,code}=req.body;
  if(!email||!code) return res.status(400).json({error:'Укажите email и код'});
  const r=db.verifyOTP(email,code,'login');
  if(!r.ok) return res.status(400).json({error:r.reason});
  const user=db.findUserByEmail(email);
  if(!user) return res.status(404).json({error:'Не найден'});
  if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'});
  const token=jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:'7d'});
  res.json({ok:true,token,user:safe(user)});
});

// Сброс пароля
app.post('/api/auth/reset/send', lim(5), async (req,res)=>{
  const {email}=req.body;
  const user=db.findUserByEmail(email);
  if(user){ const code=db.createOTP(email,'reset'); try{await sendOTP(email,code,'reset');}catch(e){console.error(e.message);} }
  res.json({ok:true,message:'Если аккаунт существует — код отправлен'});
});
app.post('/api/auth/reset/verify', lim(10), async (req,res)=>{
  const {email,code,newPassword}=req.body;
  if(!email||!code||!newPassword) return res.status(400).json({error:'Заполните все поля'});
  if(newPassword.length<6) return res.status(400).json({error:'Минимум 6 символов'});
  const r=db.verifyOTP(email,code,'reset');
  if(!r.ok) return res.status(400).json({error:r.reason});
  const user=db.findUserByEmail(email);
  if(!user) return res.status(404).json({error:'Не найден'});
  db.updateUser(user.id,{passwordHash:await bcrypt.hash(newPassword,12)});
  res.json({ok:true,message:'Пароль изменён'});
});

// ══ USER ══════════════════════════════════════════════════

app.get('/api/user/me', auth, (req,res)=>{
  const u=db.findUserById(req.user.id);
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({user:safe(u)});
});

// Привязать HWID (вызывается при первом входе с устройства)
app.post('/api/user/bind-hwid', auth, lim(10), (req,res)=>{
  const {hwid}=req.body;
  if(!hwid) return res.status(400).json({error:'HWID не указан'});
  const u=db.findUserById(req.user.id);
  if(!u) return res.status(404).json({error:'Не найден'});

  // HWID проверяется только для платных пользователей
  const hasSub = u.sub && (u.sub === 'Навсегда' || (u.subExpires && new Date(u.subExpires) > new Date()));

  if (!hasSub) {
    // Без подписки — HWID не привязываем, пускаем с любого устройства
    return res.json({ok:true, user:safe(u)});
  }

  // С подпиской — привязываем HWID
  if(u.hwid && u.hwid !== hwid) {
    return res.status(403).json({error:'Этот аккаунт привязан к другому устройству. Сбросьте HWID в личном кабинете.'});
  }
  if(!u.hwid) {
    db.updateUser(req.user.id, {hwid});
  }
  res.json({ok:true, user:safe(db.findUserById(req.user.id))});
});
app.patch('/api/user/me', auth, async (req,res)=>{
  const {avatar,username}=req.body; const upd={};
  if(avatar!==undefined){ if(avatar&&avatar.length>400*1024) return res.status(400).json({error:'Аватар слишком большой'}); upd.avatar=avatar; }
  if(username!==undefined){
    if(username.length<3||username.length>20) return res.status(400).json({error:'Логин: 3–20 символов'});
    const ex=db.findUserByUsername(username);
    if(ex&&ex.id!==req.user.id) return res.status(409).json({error:'Логин занят'});
    upd.username=username;
  }
  res.json({ok:true,user:safe(db.updateUser(req.user.id,upd))});
});
app.post('/api/user/change-password', auth, async (req,res)=>{
  const {currentPassword,newPassword}=req.body;
  if(!currentPassword||!newPassword) return res.status(400).json({error:'Заполните все поля'});
  if(newPassword.length<6) return res.status(400).json({error:'Минимум 6 символов'});
  const u=db.findUserById(req.user.id);
  if(!await bcrypt.compare(currentPassword,u.passwordHash)) return res.status(401).json({error:'Неверный текущий пароль'});
  db.updateUser(req.user.id,{passwordHash:await bcrypt.hash(newPassword,12)});
  res.json({ok:true});
});
app.post('/api/user/activate-key', auth, lim(20), (req,res)=>{
  const {key}=req.body;
  if(!key) return res.status(400).json({error:'Укажите ключ'});

  const existing=db.findUserById(req.user.id);
  if(!existing) return res.status(404).json({error:'Пользователь не найден. Войдите заново.'});

  // Сначала проверяем реальные ключи из БД
  const result = db.useKey(key, req.user.id);
  if(result.ok) {
    const expires = result.days ? new Date(Date.now()+result.days*86400000).toISOString() : null;
    const subName = result.type === '7DAYS' ? '7 дней' :
                    result.type === '30DAYS' ? '30 дней' :
                    result.type === '90DAYS' ? '90 дней' : 'Навсегда';
    const u=db.updateUser(req.user.id,{sub:subName,subExpires:expires});
    if(!u) return res.status(500).json({error:'Ошибка обновления. Попробуйте снова.'});
    return res.json({ok:true,message:`Подписка "${subName}" активирована!`,user:safe(u)});
  }

  // Если не нашли в БД — возвращаем ошибку
  return res.status(400).json({error: result.reason || 'Неверный ключ активации'});
});
app.post('/api/user/reset-hwid', auth, lim(5), (req,res)=>{
  const u=db.findUserById(req.user.id);
  if(!u) return res.status(404).json({error:'Не найден'});

  // Первый сброс — бесплатно
  if(!u.lastHwidReset) {
    return res.json({ok:true, free:true, user:safe(db.updateUser(req.user.id,{hwid:null,lastHwidReset:new Date().toISOString()}))});
  }

  // Последующие — раз в 30 дней или за покупку
  if(Date.now()-new Date(u.lastHwidReset).getTime()<30*86400000){
    const d=Math.ceil((30*86400000-(Date.now()-new Date(u.lastHwidReset).getTime()))/86400000);
    return res.status(429).json({
      error:`Бесплатный сброс уже использован. Следующий через ${d} дн. или купите сброс в магазине.`,
      canBuy: true
    });
  }

  res.json({ok:true, user:safe(db.updateUser(req.user.id,{hwid:null,lastHwidReset:new Date().toISOString()}))});
});

// ══ БАЛАНС ════════════════════════════════════════════════

app.get('/api/user/balance', auth, (req,res)=>{
  const bal = db.getBalance(req.user.id);
  if(!bal) return res.status(404).json({error:'Не найден'});
  res.json(bal);
});

// Покупка за баланс (подписка или HWID сброс)
app.post('/api/user/buy-with-balance', auth, lim(10), (req,res)=>{
  const {productId} = req.body;
  const SHOP_ITEMS = {
    sub_7:   { price:199,  type:'7DAYS',   days:7,     name:'7 дней',   sub:'7 дней'   },
    sub_30:  { price:499,  type:'30DAYS',  days:30,    name:'30 дней',  sub:'30 дней'  },
    sub_90:  { price:500,  type:'90DAYS',  days:90,    name:'90 дней',  sub:'90 дней'  },
    sub_inf: { price:900,  type:'FOREVER', days:36500, name:'Навсегда', sub:'Навсегда' },
    hwid:    { price:199,  type:'HWID',    days:0,     name:'Сброс HWID', sub:null     },
  };
  const item = SHOP_ITEMS[productId];
  if(!item) return res.status(400).json({error:'Товар не найден'});

  const u = db.findUserById(req.user.id);
  if(!u) return res.status(404).json({error:'Пользователь не найден'});
  if((u.balance||0) < item.price) return res.status(400).json({error:`Недостаточно монет. Нужно ${item.price}, у вас ${u.balance||0}`});

  // Списываем баланс
  const spend = db.spendBalance(req.user.id, item.price, `Покупка: ${item.name}`);
  if(!spend.ok) return res.status(400).json({error: spend.reason});

  // Применяем товар
  if(item.type === 'HWID') {
    db.updateUser(req.user.id, {hwid:null, lastHwidReset:new Date().toISOString()});
  } else {
    // Продлеваем подписку (если уже есть — добавляем дни)
    const existing = db.findUserById(req.user.id);
    const baseDate = existing.subExpires && new Date(existing.subExpires) > new Date()
      ? new Date(existing.subExpires)
      : new Date();
    const expires = item.days >= 36500 ? null : new Date(baseDate.getTime() + item.days*86400000).toISOString();
    db.updateUser(req.user.id, {sub: item.sub, subExpires: expires});
  }

  const updated = db.findUserById(req.user.id);
  res.json({ok:true, message:`✓ Куплено: ${item.name}`, user:safe(updated), balance: updated.balance||0});
});

// Создать токен для привязки TG (сайт → бот)
app.post('/api/user/tg-link-token', auth, lim(10), (req,res)=>{
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand=(n)=>Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const token=rand(6);
  db.saveTgLinkToken(token, req.user.id);
  res.json({ok:true, token});
});

// Отвязать TG
app.post('/api/user/tg-unlink', auth, lim(5), (req,res)=>{
  const u=db.unlinkTelegram(req.user.id);
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({ok:true, user:safe(u)});
});

// ══ FANPAY WEBHOOK ════════════════════════════════════════
// Вызывается ботом после подтверждения оплаты
const BOT_SECRET = process.env.BOT_SECRET || 'bot_theday_2026';

app.post('/api/bot/topup', (req,res)=>{
  const {secret, userId, telegramId, amount, desc, source} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});
  if(!amount || amount < 1) return res.status(400).json({error:'Неверная сумма'});

  let user = null;
  if(userId) user = db.findUserById(userId);
  if(!user && telegramId) user = db.findUserByTelegramId(telegramId);
  if(!user) return res.status(404).json({error:'Пользователь не найден'});

  const u = db.addBalance(user.id, amount, desc||'Пополнение через бот', source||'bot');
  res.json({ok:true, balance: u.balance||0, user:safe(u)});
});

// Привязать TG через токен (вызывается ботом)
app.post('/api/bot/link-tg', (req,res)=>{
  const {secret, token, telegramId, telegramUsername} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});
  if(!token||!telegramId) return res.status(400).json({error:'Укажите token и telegramId'});

  const userId = db.consumeTgLinkToken(token);
  if(!userId) return res.status(400).json({error:'Токен не найден или истёк (10 минут)'});

  const result = db.linkTelegram(userId, telegramId, telegramUsername);
  if(result?.error) return res.status(409).json({error:result.error});
  res.json({ok:true, user:safe(result)});
});

// Получить баланс по TG ID (для бота)
app.post('/api/bot/balance', (req,res)=>{
  const {secret, telegramId} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});
  const user = db.findUserByTelegramId(telegramId);
  if(!user) return res.status(404).json({error:'Аккаунт не привязан. Используйте /link на сайте.'});
  const bal = db.getBalance(user.id);
  res.json({ok:true, balance:bal.balance, username:user.username});
});

// Создать ключ через бот (после подтверждения оплаты)
app.post('/api/bot/create-key', (req,res)=>{
  const {secret, type, days} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});
  if(!type) return res.status(400).json({error:'Укажите тип'});
  const key = db.createKey(type, days||7);
  res.json({ok:true, key});
});

// Покупка за монеты через бот (по telegramId)
app.post('/api/bot/buy-with-balance', (req,res)=>{
  const {secret, telegramId, productId} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});

  const SHOP_ITEMS = {
    sub_7:   { price:199,  type:'7DAYS',   days:7,     name:'7 дней',   sub:'7 дней'   },
    sub_30:  { price:499,  type:'30DAYS',  days:30,    name:'30 дней',  sub:'30 дней'  },
    sub_90:  { price:500,  type:'90DAYS',  days:90,    name:'90 дней',  sub:'90 дней'  },
    sub_inf: { price:900,  type:'FOREVER', days:36500, name:'Навсегда', sub:'Навсегда' },
    hwid:    { price:199,  type:'HWID',    days:0,     name:'Сброс HWID', sub:null     },
  };

  const item = SHOP_ITEMS[productId];
  if(!item) return res.status(400).json({error:'Товар не найден'});

  const user = db.findUserByTelegramId(telegramId);
  if(!user) return res.status(404).json({error:'Аккаунт не привязан. Используйте /link на сайте.'});
  if((user.balance||0) < item.price) return res.status(400).json({error:`Недостаточно монет. Нужно ${item.price}, у вас ${user.balance||0}`});

  const spend = db.spendBalance(user.id, item.price, `Покупка: ${item.name}`);
  if(!spend.ok) return res.status(400).json({error: spend.reason});

  let key = null;
  if(item.type === 'HWID') {
    db.updateUser(user.id, {hwid:null, lastHwidReset:new Date().toISOString()});
  } else {
    key = db.createKey(item.type, item.days);
    const existing = db.findUserById(user.id);
    const baseDate = existing.subExpires && new Date(existing.subExpires) > new Date()
      ? new Date(existing.subExpires) : new Date();
    const expires = item.days >= 36500 ? null : new Date(baseDate.getTime() + item.days*86400000).toISOString();
    db.updateUser(user.id, {sub: item.sub, subExpires: expires});
  }

  const updated = db.findUserById(user.id);
  res.json({ok:true, message:`Куплено: ${item.name}`, key, balance: updated.balance||0});
});

// Telegram Stars — автоматическое зачисление после оплаты звёздами
// Вызывается ботом при получении successful_payment
app.post('/api/bot/stars-payment', (req,res)=>{
  const {secret, telegramId, stars, productId, payload} = req.body;
  if(secret !== BOT_SECRET) return res.status(403).json({error:'Неверный секрет'});

  const STARS_ITEMS = {
    topup_50:   { coins:50,   stars:50   },
    topup_100:  { coins:100,  stars:100  },
    topup_250:  { coins:250,  stars:250  },
    topup_500:  { coins:500,  stars:500  },
    topup_1000: { coins:1000, stars:1000 },
    sub_7:      { coins:0,    stars:199, type:'7DAYS',   days:7,     name:'7 дней'   },
    sub_30:     { coins:0,    stars:499, type:'30DAYS',  days:30,    name:'30 дней'  },
    sub_90:     { coins:0,    stars:500, type:'90DAYS',  days:90,    name:'90 дней'  },
    sub_inf:    { coins:0,    stars:900, type:'FOREVER', days:36500, name:'Навсегда' },
  };

  const item = STARS_ITEMS[productId];
  if(!item) return res.status(400).json({error:'Товар не найден'});

  const user = db.findUserByTelegramId(telegramId);

  if(productId.startsWith('topup_')) {
    // Пополнение баланса
    if(user) {
      db.addBalance(user.id, item.coins, `Пополнение через Telegram Stars (${stars}⭐)`, 'stars');
      return res.json({ok:true, type:'topup', coins:item.coins, balance:user.balance||0});
    }
    // Если аккаунт не привязан — сохраняем pending пополнение
    return res.json({ok:true, type:'topup_pending', coins:item.coins, message:'Привяжите аккаунт для зачисления'});
  } else {
    // Покупка подписки через Stars
    if(!user) return res.status(404).json({error:'Аккаунт не привязан. Используйте /link'});
    const key = db.createKey(item.type, item.days);
    return res.json({ok:true, type:'subscription', key, name:item.name});
  }
});

// ══ ADMIN PANEL ═══════════════════════════════════════════

app.post('/api/admin/auth', lim(10,1), admin, (_,res)=>res.json({ok:true}));
app.get('/api/admin/stats', admin, (_,res)=>{
  const u=db.getAllUsers();
  res.json({total:u.length,active:u.filter(x=>x.sub&&!x.banned).length,banned:u.filter(x=>x.banned).length,noSub:u.filter(x=>!x.sub).length});
});

// Создать ключ активации
app.post('/api/admin/create-key', admin, (req,res)=>{
  const {type, days} = req.body;
  if(!type) return res.status(400).json({error:'Укажите тип ключа'});
  const key = db.createKey(type, days || 30);
  res.json({ok:true, key});
});

// Список всех ключей
app.get('/api/admin/keys', admin, (_,res)=>{
  res.json({keys: db.getAllKeys()});
});
app.get('/api/admin/users', admin, (_,res)=>res.json({users:db.getAllUsers().map(safe)}));
app.get('/api/admin/user/:q', admin, (req,res)=>{
  const u=db.findUserById(req.params.q)||db.findUserByEmail(req.params.q)||db.findUserByUsername(req.params.q);
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({user:safe(u)});
});
app.post('/api/admin/user/:id/ban', admin, (req,res)=>{
  const u=db.updateUser(req.params.id,{banned:!!req.body.banned,banReason:req.body.reason||''});
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({ok:true,user:safe(u)});
});
app.post('/api/admin/user/:id/subscription', admin, (req,res)=>{
  const {sub,days}=req.body;
  // Разрешаем sub:null для удаления подписки
  if(sub===undefined) return res.status(400).json({error:'Укажите подписку'});
  const expires=sub&&days?new Date(Date.now()+days*86400000).toISOString():null;
  const u=db.updateUser(req.params.id,{sub:sub||null,subExpires:expires});
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({ok:true,user:safe(u)});
});
app.post('/api/admin/user/:id/reset-hwid', admin, (req,res)=>{
  const u=db.updateUser(req.params.id,{hwid:null,lastHwidReset:null});
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({ok:true,user:safe(u)});
});
app.post('/api/admin/user/:id/role', admin, (req,res)=>{
  const u=db.updateUser(req.params.id,{role:req.body.role});
  if(!u) return res.status(404).json({error:'Не найден'});
  res.json({ok:true,user:safe(u)});
});
app.delete('/api/admin/user/:id', admin, (req,res)=>{
  if(!db.deleteUser(req.params.id)) return res.status(404).json({error:'Не найден'});
  res.json({ok:true});
});

// ══ LAUNCHER API ══════════════════════════════════════════

// Вход через лаунчер (email+пароль → токен, без OTP)
app.post('/api/launcher/login', launcher, lim(10,5), async (req,res)=>{
  const {email,password,hwid}=req.body;
  if(!email||!password) return res.status(400).json({error:'Укажите email и пароль'});
  const user=db.findUserByEmail(email);
  if(!user) return res.status(401).json({error:'Неверный email или пароль'});
  if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'+(user.banReason?': '+user.banReason:'')});
  if(!await bcrypt.compare(password,user.passwordHash)) return res.status(401).json({error:'Неверный email или пароль'});

  // Проверка подписки
  const hasSub=user.sub&&(user.sub==='Навсегда'||(user.subExpires&&new Date(user.subExpires)>new Date()));
  if(!hasSub) return res.status(403).json({error:'Нет активной подписки. Купите на thedayclient.su'});

  // HWID привязка только для платных
  if(hwid){
    if(!user.hwid){ db.updateUser(user.id,{hwid}); }
    else if(user.hwid!==hwid){ return res.status(403).json({error:'HWID не совпадает. Сбросьте HWID в личном кабинете.'}); }
  }

  const token=jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:'7d'});
  res.json({ok:true,token,user:{id:user.id,username:user.username,role:user.role,sub:user.sub,subExpires:user.subExpires,hwid:user.hwid||hwid}});
});

// Проверить токен (лаунчер при запуске)
app.post('/api/launcher/verify', launcher, lim(30,5), (req,res)=>{
  const {token,hwid}=req.body;
  if(!token) return res.status(400).json({error:'Токен не указан'});
  try {
    const p=jwt.verify(token,JWT_SECRET);
    const user=db.findUserById(p.id);
    if(!user) return res.status(404).json({error:'Пользователь не найден'});
    if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'});
    const hasSub=user.sub&&(user.sub==='Навсегда'||(user.subExpires&&new Date(user.subExpires)>new Date()));
    if(!hasSub) return res.status(403).json({error:'Подписка истекла'});
    if(hwid&&user.hwid&&user.hwid!==hwid) return res.status(403).json({error:'HWID не совпадает'});
    if(hwid&&!user.hwid) db.updateUser(user.id,{hwid});
    res.json({ok:true,user:{id:user.id,username:user.username,role:user.role,sub:user.sub,subExpires:user.subExpires}});
  } catch { res.status(401).json({error:'Токен недействителен или истёк'}); }
});

// Получить профиль + аватар (лаунчер)
app.post('/api/launcher/profile', launcher, lim(60,5), (req,res)=>{
  const {token}=req.body;
  if(!token) return res.status(400).json({error:'Токен не указан'});
  try {
    const p=jwt.verify(token,JWT_SECRET);
    const user=db.findUserById(p.id);
    if(!user) return res.status(404).json({error:'Пользователь не найден'});
    if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'});
    res.json({ok:true,user:{id:user.id,username:user.username,role:user.role,sub:user.sub,subExpires:user.subExpires,hwid:user.hwid,avatar:user.avatar||null}});
  } catch { res.status(401).json({error:'Токен недействителен или истёк'}); }
});

app.get('/api/health',(_,res)=>res.json({ok:true,time:new Date().toISOString()}));
app.get('*',(req,res)=>{
  if(req.path.startsWith('/api')) return res.status(404).json({error:'Not found'});
  res.sendFile(path.join(__dirname,'..','index.html'));
});

app.listen(PORT,()=>{
  console.log(`\n✦ TheDay Server → http://localhost:${PORT}`);
  console.log(`  SMTP host    : ${process.env.SMTP_HOST||'⚠ не настроен — заполни server/.env'}\n`);
});
