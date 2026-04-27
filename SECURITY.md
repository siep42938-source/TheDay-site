# Чек-лист безопасности TheDay Client

> Проверь каждый пункт перед деплоем на продакшн.

---

## 1. HTTPS и TLS

- [ ] Сайт доступен **только по HTTPS** (HTTP автоматически редиректит на HTTPS)
- [ ] SSL-сертификат действителен и не истёк (проверь на [SSL Labs](https://www.ssllabs.com/ssltest/))
- [ ] Используется TLS 1.2 или 1.3 (TLS 1.0 и 1.1 отключены)
- [ ] HSTS-заголовок включён: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 2. Content Security Policy (CSP)

- [ ] CSP-заголовок присутствует на **всех страницах** (проверь в DevTools → Network → Response Headers)
- [ ] `object-src 'none'` — Flash и плагины заблокированы
- [ ] `frame-ancestors 'none'` — страница не встраивается во фреймы
- [ ] `base-uri 'self'` — подмена `<base>` заблокирована
- [ ] `form-action 'self'` — формы отправляются только на свой домен
- [ ] Если убираешь `'unsafe-inline'` из `script-src` — замени на хэши (`'sha256-...'`) или nonce

---

## 3. Заголовки безопасности

- [ ] `X-Frame-Options: DENY` — защита от кликджекинга
- [ ] `X-Content-Type-Options: nosniff` — защита от MIME-сниффинга
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` — не утекает URL
- [ ] `Permissions-Policy` — отключены камера, микрофон, геолокация
- [ ] Заголовок `Server` скрыт или не раскрывает версию ПО

---

## 4. Зависимости и внешние ресурсы

- [ ] Все CDN-ресурсы имеют атрибут `integrity` (SRI — Subresource Integrity)
- [ ] Все внешние `<link>` и `<script>` имеют `crossorigin="anonymous"`
- [ ] Нет подключения к сторонним трекерам, пикселям аналитики без согласия пользователя
- [ ] Google Fonts загружается через `fonts.googleapis.com` (уже в CSP) — ✅

---

## 5. Защита от XSS

- [ ] Нигде не используется `innerHTML` с пользовательскими данными без санитизации
- [ ] Нет `eval()`, `new Function()`, `setTimeout('строка')` в коде
- [ ] Нет inline-обработчиков событий (`onclick="..."`) с динамическими данными
- [ ] Данные из `localStorage` / `sessionStorage` не вставляются напрямую в DOM

---

## 6. Защита данных пользователей

- [ ] Пароли **никогда** не хранятся в `localStorage` (только токены/сессии)
- [ ] Чувствительные данные не попадают в URL (query string)
- [ ] Нет `console.log` с персональными данными в продакшн-коде
- [ ] Форма входа использует `autocomplete="current-password"` для менеджеров паролей

---

## 7. HTTP-методы

- [ ] На сервере разрешены только `GET`, `HEAD`, `POST` (запрещены `PUT`, `DELETE`, `TRACE`, `OPTIONS` если не нужны)
- [ ] Метод `TRACE` отключён (защита от XST-атак)

---

## 8. Конфигурационные файлы

- [ ] Файлы `.env`, `.git`, `netlify.toml`, `vercel.json` **недоступны** через браузер
- [ ] Листинг директорий отключён (`Options -Indexes` в Apache / аналог в Nginx)
- [ ] Нет секретных ключей, токенов или паролей в коде (проверь через `git log`)

---

## 9. Зависимости npm (если используются)

- [ ] Запущен `npm audit` — нет критических уязвимостей
- [ ] Зависимости обновлены до последних стабильных версий
- [ ] `node_modules` добавлен в `.gitignore`

---

## 10. Мониторинг и реагирование

- [ ] Настроен мониторинг доступности сайта (UptimeRobot, BetterUptime и т.д.)
- [ ] Есть резервная копия файлов сайта
- [ ] Настроены уведомления об ошибках (если есть бэкенд)
- [ ] Добавлен файл `security.txt` по адресу `/.well-known/security.txt` с контактом для сообщений об уязвимостях

---

## 11. Проверка перед деплоем — инструменты

| Инструмент | Что проверяет | Ссылка |
|---|---|---|
| Mozilla Observatory | Заголовки, CSP, HSTS | https://observatory.mozilla.org |
| SSL Labs | TLS, сертификат | https://www.ssllabs.com/ssltest/ |
| CSP Evaluator | Качество CSP | https://csp-evaluator.withgoogle.com |
| Security Headers | Все заголовки | https://securityheaders.com |
| Have I Been Pwned | Утечки данных | https://haveibeenpwned.com |

---

## 12. Файлы конфигурации в этом проекте

| Файл | Хостинг |
|---|---|
| `_headers` | Netlify, Cloudflare Pages |
| `netlify.toml` | Netlify |
| `vercel.json` | Vercel |
| `.htaccess` | Apache (shared-хостинг, VPS) |
| `nginx.conf.sample` | Nginx (VPS, выделенный сервер) |

> Оставь **только один** файл, соответствующий твоему хостингу. Остальные можно удалить.
