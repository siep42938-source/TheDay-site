const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DB_FILE = path.join(__dirname, 'db.json');

function load() {
  try { if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
  catch(e) { console.error('DB load error:', e.message); }
  return { users:[], otps:[], pending:[] };
}

let _saveTimer = null;
function save(db) {
  // Debounce writes — не более 1 записи в 200мс
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, DB_FILE);
    } catch(e) { console.error('DB save error:', e.message); }
  }, 200);
}

let _db = load();

const db = {
  getAllUsers: () => [..._db.users],
  findUserByEmail: (email) => _db.users.find(u=>u.email.toLowerCase()===email.toLowerCase())||null,
  findUserById: (id) => _db.users.find(u=>u.id===id)||null,
  findUserByUsername: (username) => _db.users.find(u=>u.username.toLowerCase()===username.toLowerCase())||null,

  createUser({ username, email, passwordHash }) {
    const user = {
      id: uuidv4(), username, email: email.toLowerCase(), passwordHash,
      role:'Пользователь', createdAt: new Date().toISOString(),
      hwid:null, sub:null, subExpires:null, avatar:null,
      banned:false, banReason:'', lastHwidReset:null,
    };
    _db.users.push(user); save(_db); return user;
  },

  updateUser(id, updates) {
    const i = _db.users.findIndex(u=>u.id===id);
    if(i===-1) return null;
    _db.users[i] = {..._db.users[i], ...updates};
    save(_db); return _db.users[i];
  },

  deleteUser(id) {
    const i = _db.users.findIndex(u=>u.id===id);
    if(i===-1) return false;
    _db.users.splice(i,1); save(_db); return true;
  },

  createOTP(email, type) {
    _db.otps = _db.otps.filter(o=>!(o.email===email.toLowerCase()&&o.type===type));
    const code = String(Math.floor(100000+Math.random()*900000));
    const mins = parseInt(process.env.OTP_EXPIRES_MIN||'10');
    _db.otps.push({ email:email.toLowerCase(), code, type, expiresAt:new Date(Date.now()+mins*60000).toISOString(), attempts:0 });
    save(_db); return code;
  },

  verifyOTP(email, code, type) {
    const otp = _db.otps.find(o=>o.email===email.toLowerCase()&&o.type===type);
    if(!otp) return {ok:false, reason:'Код не найден или уже использован'};
    if(new Date(otp.expiresAt)<new Date()) {
      _db.otps=_db.otps.filter(o=>o!==otp); save(_db);
      return {ok:false, reason:'Код истёк. Запросите новый.'};
    }
    otp.attempts++;
    if(otp.attempts>5) { _db.otps=_db.otps.filter(o=>o!==otp); save(_db); return {ok:false,reason:'Слишком много попыток'}; }
    if(otp.code!==String(code)) { save(_db); return {ok:false,reason:'Неверный код'}; }
    _db.otps=_db.otps.filter(o=>o!==otp); save(_db); return {ok:true};
  },

  savePending(email, data) {
    _db.pending=_db.pending.filter(p=>p.email!==email.toLowerCase());
    _db.pending.push({email:email.toLowerCase(),...data, expiresAt:new Date(Date.now()+15*60000).toISOString()});
    save(_db);
  },
  getPending(email) {
    const p=_db.pending.find(p=>p.email===email.toLowerCase());
    if(!p||new Date(p.expiresAt)<new Date()) return null;
    return p;
  },
  deletePending(email) { _db.pending=_db.pending.filter(p=>p.email!==email.toLowerCase()); save(_db); },

  cleanExpired() {
    const now=new Date();
    _db.otps=_db.otps.filter(o=>new Date(o.expiresAt)>now);
    _db.pending=_db.pending.filter(p=>new Date(p.expiresAt)>now);
    if(_db.keys) _db.keys=_db.keys.filter(k=>new Date(k.expiresAt)>now);
    save(_db);
  },

  // Система ключей активации
  createKey(type, days) {
    if(!_db.keys) _db.keys = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
    const key = `THEDAY-${type.toUpperCase()}-${rand(4)}-${rand(4)}`;
    const keyData = {
      key,
      type,
      days,
      used: false,
      usedBy: null,
      usedAt: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString() // 24 часа
    };
    _db.keys.push(keyData);
    save(_db);
    return key;
  },

  useKey(key, userId) {
    if(!_db.keys) _db.keys = [];
    const keyData = _db.keys.find(k => k.key === key.trim().toUpperCase());
    if(!keyData) return {ok:false, reason:'Ключ не найден'};
    if(keyData.used) return {ok:false, reason:'Ключ уже использован'};
    if(new Date(keyData.expiresAt) < new Date()) {
      return {ok:false, reason:'Ключ истёк (действителен 24 часа)'};
    }
    keyData.used = true;
    keyData.usedBy = userId;
    keyData.usedAt = new Date().toISOString();
    save(_db);
    return {ok:true, days: keyData.days, type: keyData.type};
  },

  getAllKeys() {
    if(!_db.keys) _db.keys = [];
    return [..._db.keys];
  },
};

setInterval(()=>db.cleanExpired(), 5*60000);
module.exports = db;
