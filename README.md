# TheDay Client — Запуск сервера

## Быстрый старт

### 1. Установить зависимости
```bash
cd server
npm install
```

### 2. Настроить .env
```bash
cp .env.example .env
```
Открой `server/.env` и заполни:

```env
PORT=3001
JWT_SECRET=сгенерируй_случайную_строку_64_символа

# Gmail (включи "Пароли приложений" в Google аккаунте)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=твой@gmail.com
SMTP_PASS=пароль_приложения_из_google

FRONTEND_URL=http://localhost:3001
OTP_EXPIRES_MIN=10
```

### 3. Запустить
```bash
npm start
```
Сайт откроется на http://localhost:3001

---

## Как получить пароль приложения Gmail

1. Зайди в [myaccount.google.com](https://myaccount.google.com)
2. Безопасность → Двухэтапная аутентификация (включи)
3. Безопасность → Пароли приложений
4. Создай пароль для "Почта" → скопируй 16-значный код
5. Вставь в `SMTP_PASS`

## Демо-ключи для тестирования
- `THEDAY-7DAY-DEMO` — 7 дней
- `THEDAY-30DAY-DEMO` — 30 дней
- `THEDAY-90DAY-DEMO` — 90 дней
- `THEDAY-FOREVER-DEMO` — Навсегда
