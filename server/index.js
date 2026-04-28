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
  const user=db.findUserByEmail(email);
  if(!user) return res.status(401).json({error:'Неверный email или пароль'});
  if(user.banned) return res.status(403).json({error:'Аккаунт заблокирован'+(user.banReason?': '+user.banReason:'')});
  const ok=await bcrypt.compare(password,user.passwordHash);
  if(!ok) return res.status(401).json({error:'Неверный email или пароль'});
  const code=db.createOTP(email,'login');
  try {
    await sendOTP(email,code,'login');
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
