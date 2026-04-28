require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const fetch = (...args) => import('node-fetch').then(({default:f}) => f(...args));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID  = process.env.ADMIN_ID;
const SITE_URL  = process.env.SITE_URL  || 'https://theday-site.pages.dev';
const API_URL   = process.env.API_URL   || 'https://the-day-site-ovk7.vercel.app/api';
const BOT_SECRET= process.env.BOT_SECRET|| 'bot_theday_2026';

const bot = new Telegraf(BOT_TOKEN);

const PRODUCTS = [
  { id:'sub_7',  name:'7 дней',   emoji:'⚡', price:199, days:7,     type:'7DAYS'   },
  { id:'sub_30', name:'30 дней',  emoji:'🌟', price:499, days:30,    type:'30DAYS'  },
  { id:'sub_90', name:'90 дней',  emoji:'💎', price:500, days:90,    type:'90DAYS'  },
  { id:'sub_inf',name:'Навсегда', emoji:'♾️', price:900, days:36500, type:'FOREVER' },
  { id:'hwid',   name:'Сброс HWID',emoji:'🔄',price:199, days:0,     type:'HWID'    },
];

const TOPUP_AMOUNTS = [50, 100, 250, 500, 1000];

// ── API ───────────────────────────────────────────────────
async function api(path, body) {
  try {
    const r = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: BOT_SECRET, ...body }),
    });
    return await r.json();
  } catch(e) { return { error: 'Сервер недоступен: ' + e.message }; }
}

const createKey    = (type, days)          => api('/bot/create-key',      { type, days });
const topup        = (tgId, amount, desc)  => api('/bot/topup',           { telegramId: String(tgId), amount, desc, source:'bot' });
const getBalance   = (tgId)               => api('/bot/balance',          { telegramId: String(tgId) });
const buyBalance   = (tgId, productId)    => api('/bot/buy-with-balance', { telegramId: String(tgId), productId });
const linkTg       = (token, tgId, uname) => api('/bot/link-tg',         { token, telegramId: String(tgId), telegramUsername: uname });

// ── Меню ─────────────────────────────────────────────────
const mainMenu = Markup.keyboard([
  ['🛒 Купить подписку', '💰 Мой баланс'],
  ['👤 Мой аккаунт',    '🔗 Привязать аккаунт'],
  ['💳 Пополнить баланс','❓ Поддержка'],
  ['🌐 Перейти на сайт']
]).resize();

// ── /start ────────────────────────────────────────────────
bot.start(async ctx => {
  const name = ctx.from.first_name || 'игрок';
  const text = `✦ *Добро пожаловать в TheDay Client, ${name}!*\n\nВыберите действие:`;
  await ctx.replyWithPhoto({ url:`${SITE_URL}/og-image.png` }, { caption:text, parse_mode:'Markdown', ...mainMenu })
    .catch(() => ctx.reply(text, { parse_mode:'Markdown', ...mainMenu }));
});

// ── Купить подписку ───────────────────────────────────────
bot.hears('🛒 Купить подписку', async ctx => {
  await ctx.reply('🛒 *Выберите товар:*', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(PRODUCTS.map(p =>
      [Markup.button.callback(`${p.emoji} ${p.name} — ${p.price}₽`, `buy_${p.id}`)]
    ))
  });
});

bot.action(/^buy_(.+)$/, async ctx => {
  const p = PRODUCTS.find(x => x.id === ctx.match[1]);
  if (!p) return ctx.answerCbQuery('Не найден');
  await ctx.answerCbQuery();

  const bal = await getBalance(ctx.from.id);
  const hasCoins = !bal.error && (bal.balance || 0) >= p.price;

  const rows = [
    [Markup.button.url('💳 FanPay (карта/СБП/крипто)', 'https://funpay.com/users/17389840/')],
    [Markup.button.callback('✅ Оплатил FanPay — отправить чек', `paid_${p.id}`)],
  ];
  if (hasCoins) rows.splice(1, 0,
    [Markup.button.callback(`💎 Купить за монеты (${bal.balance} монет)`, `bal_${p.id}`)]
  );
  rows.push([Markup.button.callback('◀️ Назад', 'back_shop')]);

  await ctx.reply(
    `${p.emoji} *TheDay — ${p.name}*\n💰 Цена: *${p.price}₽*\n\n` +
    `💳 *FanPay* — оплати, пришли скриншот, получишь ключ\n` +
    (hasCoins ? `💎 *Монеты* — мгновенная покупка (баланс: ${bal.balance})\n` : '') +
    `\nВыберите способ:`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard(rows) }
  );
});

// ── Покупка за монеты ─────────────────────────────────────
bot.action(/^bal_(.+)$/, async ctx => {
  const p = PRODUCTS.find(x => x.id === ctx.match[1]);
  if (!p) return ctx.answerCbQuery('Не найден');
  await ctx.answerCbQuery('💎 Покупаю...');

  const r = await buyBalance(ctx.from.id, p.id);
  if (r.error) return ctx.reply(`❌ ${r.error}`);

  if (r.key) {
    const exp = new Date(Date.now() + 86400000).toLocaleString('ru-RU');
    await ctx.reply(
      `✅ *Куплено за монеты!*\n\n${p.emoji} ${p.name}\n💎 Списано: *${p.price} монет*\n💰 Остаток: *${r.balance} монет*\n\n` +
      `🔑 Ваш ключ:\n\`${r.key}\`\n\n⚠️ Действителен 24 ч (до ${exp})\nАктивируйте: Аккаунт → Активация ключа\n🌐 ${SITE_URL}`,
      { parse_mode:'Markdown' }
    );
  } else {
    await ctx.reply(`✅ *${r.message}*\n\n💎 Списано: ${p.price} монет\n💰 Остаток: ${r.balance} монет`, { parse_mode:'Markdown' });
  }
});

// ── FanPay — пользователь нажал "Я оплатил" ──────────────
bot.action(/^paid_(.+)$/, async ctx => {
  const p = PRODUCTS.find(x => x.id === ctx.match[1]);
  if (!p) return ctx.answerCbQuery();
  await ctx.answerCbQuery();
  const orderId = `ORD-${Date.now()}`;
  await ctx.reply('📸 Отправьте скриншот чека.\n\nПосле проверки получите ключ в течение 5-15 минут.');
  await bot.telegram.sendMessage(ADMIN_ID,
    `🔔 *Заказ #${orderId}*\n\n👤 [${ctx.from.first_name}](tg://user?id=${ctx.from.id})\n🆔 \`${ctx.from.id}\`\n${p.emoji} ${p.name} — ${p.price}₽\n\nОжидает скриншот...`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Выдать ключ`, `issue_${ctx.from.id}_${p.id}`)],
      [Markup.button.callback(`❌ Отклонить`,   `reject_${ctx.from.id}`)]
    ])}
  );
});

// ── Скриншот от пользователя ──────────────────────────────
bot.on(message('photo'), async ctx => {
  if (String(ctx.from.id) === String(ADMIN_ID)) return;
  await bot.telegram.forwardMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id);
  await bot.telegram.sendMessage(ADMIN_ID,
    `👆 Скриншот от [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) (\`${ctx.from.id}\`)`,
    { parse_mode:'Markdown' }
  );
  await ctx.reply('✅ Скриншот получен! Ожидайте подтверждения (5-15 мин).');
});

// ── Админ: выдать ключ ────────────────────────────────────
bot.action(/^issue_(\d+)_(.+)$/, async ctx => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');
  const tgUserId = ctx.match[1];
  const p = PRODUCTS.find(x => x.id === ctx.match[2]);
  await ctx.answerCbQuery('✅ Выдаю...');

  const r = await createKey(p?.type || 'CUSTOM', p?.days || 7);
  if (!r.ok || !r.key) { await ctx.reply('❌ Ошибка создания ключа'); return; }

  const exp = new Date(Date.now() + 86400000).toLocaleString('ru-RU');
  await bot.telegram.sendMessage(tgUserId,
    `🎉 *Оплата подтверждена!*\n\n${p?.emoji} ${p?.name}\n🔑 Ваш ключ:\n\`${r.key}\`\n\n⚠️ Действителен 24 ч (до ${exp})\nАктивируйте: Аккаунт → Активация ключа\n🌐 ${SITE_URL}`,
    { parse_mode:'Markdown' }
  );
  await ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ Ключ выдан: \`${r.key}\``, { parse_mode:'Markdown' }).catch(()=>{});
});

// ── Админ: отклонить заказ ────────────────────────────────
bot.action(/^reject_(\d+)$/, async ctx => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');
  await ctx.answerCbQuery('❌');
  await bot.telegram.sendMessage(ctx.match[1], `❌ *Оплата не подтверждена.*\n\nЕсли оплатили — обратитесь в поддержку.`, { parse_mode:'Markdown' });
  await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ Отклонено', { parse_mode:'Markdown' }).catch(()=>{});
});

bot.action('back_shop', async ctx => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🛒 *Выберите товар:*', {
    parse_mode:'Markdown',
    ...Markup.inlineKeyboard(PRODUCTS.map(p => [Markup.button.callback(`${p.emoji} ${p.name} — ${p.price}₽`, `buy_${p.id}`)]))
  });
});

// ── Мой баланс ────────────────────────────────────────────
bot.hears('💰 Мой баланс', async ctx => {
  const r = await getBalance(ctx.from.id);
  if (r.error) return ctx.reply(
    `💰 *Баланс*\n\n⚠️ ${r.error}\n\nПривяжите аккаунт через "🔗 Привязать аккаунт"`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🌐 Сайт', SITE_URL)]]) }
  );
  await ctx.reply(
    `💰 *Баланс: ${r.username}*\n\n💎 *${r.balance} монет*\n\nПополнить: "💳 Пополнить баланс"`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('💰 Управление', `${SITE_URL}/balance.html`)]]) }
  );
});

// ── Пополнить баланс ──────────────────────────────────────
bot.hears('💳 Пополнить баланс', async ctx => {
  await ctx.reply(
    `💳 *Пополнение баланса*\n\n1. Выберите сумму\n2. Оплатите на FanPay\n3. Пришлите скриншот\n4. Баланс зачислится автоматически\n\nВыберите сумму:`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('50 монет — 50₽',   'tp_50'),
       Markup.button.callback('100 монет — 100₽', 'tp_100')],
      [Markup.button.callback('250 монет — 250₽', 'tp_250'),
       Markup.button.callback('500 монет — 500₽', 'tp_500')],
      [Markup.button.callback('1000 монет — 1000₽','tp_1000')],
    ])}
  );
});

bot.action(/^tp_(\d+)$/, async ctx => {
  const amount = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  const orderId = `TOP-${Date.now()}`;
  await ctx.reply(
    `📋 *Пополнение #${orderId}*\n\n💎 Сумма: *${amount} монет*\n💰 К оплате: *${amount}₽*\n\nОплатите на FanPay и пришлите скриншот:`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('💳 FanPay', 'https://funpay.com/users/17389840/')]]) }
  );
  await bot.telegram.sendMessage(ADMIN_ID,
    `💳 *Пополнение #${orderId}*\n\n👤 [${ctx.from.first_name}](tg://user?id=${ctx.from.id})\n🆔 \`${ctx.from.id}\`\n💎 ${amount} монет / ${amount}₽\n\nОжидает скриншот...`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Зачислить +${amount} монет`, `ctop_${ctx.from.id}_${amount}`)],
      [Markup.button.callback(`❌ Отклонить`, `rtop_${ctx.from.id}`)]
    ])}
  );
});

// ── Админ: подтвердить пополнение ────────────────────────
bot.action(/^ctop_(\d+)_(\d+)$/, async ctx => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');
  const tgId = ctx.match[1], amount = parseInt(ctx.match[2]);
  await ctx.answerCbQuery('✅');
  const r = await topup(tgId, amount, 'Пополнение через FanPay');
  if (r.error) { await ctx.reply(`❌ ${r.error}`); return; }
  await bot.telegram.sendMessage(tgId,
    `✅ *Баланс пополнен!*\n\n💎 Зачислено: *+${amount} монет*\n💰 Баланс: *${r.balance} монет*\n\nОбновлено на сайте автоматически.`,
    { parse_mode:'Markdown' }
  );
  await ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ Зачислено. Баланс: ${r.balance}`, { parse_mode:'Markdown' }).catch(()=>{});
});

// ── Админ: отклонить пополнение ───────────────────────────
bot.action(/^rtop_(\d+)$/, async ctx => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');
  await ctx.answerCbQuery('❌');
  await bot.telegram.sendMessage(ctx.match[1], `❌ *Пополнение отклонено.*\n\nЕсли оплатили — обратитесь в поддержку.`, { parse_mode:'Markdown' });
  await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ Отклонено', { parse_mode:'Markdown' }).catch(()=>{});
});

// ── Привязать аккаунт ─────────────────────────────────────
bot.hears('🔗 Привязать аккаунт', async ctx => {
  await ctx.reply(
    `🔗 *Привязка аккаунта*\n\n1. Зайдите на сайт → Аккаунт\n2. Нажмите "Привязать Telegram"\n3. Получите 6-значный код\n4. Отправьте: /link КОД`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🌐 Открыть сайт', `${SITE_URL}/account.html`)]]) }
  );
});

bot.command('link', async ctx => {
  const token = ctx.message.text.split(' ')[1]?.trim().toUpperCase();
  if (!token) return ctx.reply('Использование: /link XXXXXX\n\nКод получите на сайте: Аккаунт → Привязать Telegram');
  const r = await linkTg(token, ctx.from.id, ctx.from.username || null);
  if (r.error) return ctx.reply(`❌ ${r.error}`);
  await ctx.reply(`✅ *Telegram привязан!*\n\nАккаунт: *${r.user?.username}*\nБаланс синхронизируется автоматически.`, { parse_mode:'Markdown' });
});

// ── Мой аккаунт ───────────────────────────────────────────
bot.hears('👤 Мой аккаунт', async ctx => {
  const r = await getBalance(ctx.from.id);
  if (r.error) return ctx.reply(
    `👤 *Аккаунт*\n\n🆔 TG ID: \`${ctx.from.id}\`\n\n⚠️ Аккаунт не привязан. Используйте "🔗 Привязать аккаунт"`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🌐 Сайт', SITE_URL)]]) }
  );
  await ctx.reply(
    `👤 *${r.username}*\n\n🆔 TG ID: \`${ctx.from.id}\`\n💎 Баланс: *${r.balance} монет*`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🌐 Управление', `${SITE_URL}/account.html`)]]) }
  );
});

// ── Поддержка ─────────────────────────────────────────────
bot.hears('❓ Поддержка', async ctx => {
  await ctx.reply(
    `❓ *Поддержка TheDay*\n\n• Напишите сюда — ответим\n• Или на сайте\n\n⏱ До 30 минут`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🌐 Поддержка', `${SITE_URL}/support.html`)]]) }
  );
});

bot.hears('🌐 Перейти на сайт', async ctx => {
  await ctx.reply('🌐 TheDay Client:', Markup.inlineKeyboard([[Markup.button.url('Открыть', SITE_URL)]]));
});

// ── Текст → поддержка ─────────────────────────────────────
bot.on(message('text'), async ctx => {
  if (String(ctx.from.id) === String(ADMIN_ID)) return;
  await bot.telegram.sendMessage(ADMIN_ID,
    `💬 [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) (\`${ctx.from.id}\`):\n\n${ctx.message.text}`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('Ответить', `reply_${ctx.from.id}`)]]) }
  );
  await ctx.reply('✉️ Сообщение отправлено в поддержку.');
});

// ── Запуск ────────────────────────────────────────────────
bot.launch().then(() => {
  console.log('✦ TheDay Bot запущен!');
  bot.telegram.sendMessage(ADMIN_ID, '✅ Бот запущен!').catch(()=>{});
});
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));