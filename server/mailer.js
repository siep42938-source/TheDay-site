const nodemailer = require('nodemailer');

let _t = null;
function getT() {
  if (_t) return _t;
  _t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _t;
}

const html = {
  register: (code) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{margin:0;background:#0a0a0f;font-family:Arial,sans-serif;color:#e2e8f0}.w{max-width:460px;margin:40px auto;background:#0d0d14;border:1px solid rgba(135,206,235,0.15);border-radius:16px;overflow:hidden}.h{background:linear-gradient(135deg,rgba(2,136,209,0.25),rgba(135,206,235,0.1));padding:28px;text-align:center;border-bottom:1px solid rgba(135,206,235,0.1)}.logo{font-size:22px;font-weight:900;color:#fff}.logo span{color:#87CEEB}.b{padding:32px}.t{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px}.s{font-size:13px;color:#4a5568;margin-bottom:24px}.cb{background:rgba(135,206,235,0.06);border:1px solid rgba(135,206,235,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px}.code{font-size:44px;font-weight:900;letter-spacing:14px;color:#87CEEB;font-family:monospace}.exp{font-size:11px;color:#4a5568;margin-top:8px}.warn{background:rgba(239,83,80,0.08);border:1px solid rgba(239,83,80,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#ef5350}.f{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#2d3748;text-align:center}</style></head><body><div class="w"><div class="h"><div class="logo">✦ <span>TheDay</span> Client</div></div><div class="b"><div class="t">Подтверждение регистрации</div><div class="s">Введите этот код на странице регистрации</div><div class="cb"><div class="code">${code}</div><div class="exp">Действителен 10 минут</div></div><div class="warn">⚠️ Никому не сообщайте этот код</div></div><div class="f">© 2026 TheDay Client</div></div></body></html>`,

  login: (code) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{margin:0;background:#0a0a0f;font-family:Arial,sans-serif;color:#e2e8f0}.w{max-width:460px;margin:40px auto;background:#0d0d14;border:1px solid rgba(99,102,241,0.2);border-radius:16px;overflow:hidden}.h{background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(135,206,235,0.08));padding:28px;text-align:center;border-bottom:1px solid rgba(99,102,241,0.15)}.logo{font-size:22px;font-weight:900;color:#fff}.logo span{color:#87CEEB}.b{padding:32px}.t{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px}.s{font-size:13px;color:#4a5568;margin-bottom:24px}.cb{background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px}.code{font-size:44px;font-weight:900;letter-spacing:14px;color:#a78bfa;font-family:monospace}.exp{font-size:11px;color:#4a5568;margin-top:8px}.warn{background:rgba(239,83,80,0.08);border:1px solid rgba(239,83,80,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#ef5350}.f{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#2d3748;text-align:center}</style></head><body><div class="w"><div class="h"><div class="logo">✦ <span>TheDay</span> Client</div></div><div class="b"><div class="t">Код для входа</div><div class="s">Кто-то входит в ваш аккаунт TheDay Client</div><div class="cb"><div class="code">${code}</div><div class="exp">Действителен 10 минут</div></div><div class="warn">⚠️ Если это не вы — смените пароль немедленно</div></div><div class="f">© 2026 TheDay Client</div></div></body></html>`,

  reset: (code) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{margin:0;background:#0a0a0f;font-family:Arial,sans-serif;color:#e2e8f0}.w{max-width:460px;margin:40px auto;background:#0d0d14;border:1px solid rgba(239,83,80,0.2);border-radius:16px;overflow:hidden}.h{background:linear-gradient(135deg,rgba(239,83,80,0.15),rgba(183,28,28,0.1));padding:28px;text-align:center}.logo{font-size:22px;font-weight:900;color:#fff}.logo span{color:#87CEEB}.b{padding:32px}.t{font-size:20px;font-weight:700;color:#fff;margin-bottom:8px}.s{font-size:13px;color:#4a5568;margin-bottom:24px}.cb{background:rgba(239,83,80,0.06);border:1px solid rgba(239,83,80,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px}.code{font-size:44px;font-weight:900;letter-spacing:14px;color:#ef5350;font-family:monospace}.exp{font-size:11px;color:#4a5568;margin-top:8px}.f{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#2d3748;text-align:center}</style></head><body><div class="w"><div class="h"><div class="logo">✦ <span>TheDay</span> Client</div></div><div class="b"><div class="t">Сброс пароля</div><div class="s">Введите код для подтверждения сброса пароля</div><div class="cb"><div class="code">${code}</div><div class="exp">Действителен 10 минут</div></div></div><div class="f">© 2026 TheDay Client</div></div></body></html>`,
};

async function sendOTP(email, code, type) {
  const subj = { register:'🔐 Код регистрации — TheDay', login:'🔑 Код входа — TheDay', reset:'🔒 Сброс пароля — TheDay' };
  await getT().sendMail({
    from: process.env.SMTP_FROM || '"TheDay Client" <noreply@thedayclient.su>',
    to: email,
    subject: subj[type] || 'TheDay — Код подтверждения',
    html: html[type]?.(code) || `<p>Ваш код: <b>${code}</b></p>`,
  });
}

module.exports = { sendOTP };
