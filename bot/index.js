require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { message } = require('telegraf/filters');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const SITE_URL = process.env.SITE_URL || 'https://theday-site.pages.dev';

const bot = new Telegraf(BOT_TOKEN);

// Товары
const PRODUCTS = [
  { id: 'sub_7',  name: '⚡ TheDay — 7 дней',    price: 199,  days: 7,     key: 'THEDAY-7DAY-DEMO' },
  { id: 'sub_30', name: '🌟 TheDay — 30 дней',   price: 499,  days: 30,    key: 'THEDAY-30DAY-DEMO' },
  { id: 'sub_90', name: '💎 TheDay — 90 дней',   price: 999,  days: 90,    key: 'THEDAY-90DAY-DEMO' },
  { id: 'sub_inf',name: '♾️ TheDay — Навсегда',  price: 2499, days: 36500, key: 'THEDAY-FOREVER-DEMO' },
  { id: 'hwid',   name: '🔄 Сброс HWID',         price: 199,  days: 0,     key: null },
];

// Генерация уникального ключа
function genKey(type) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `THEDAY-${type.toUpperCase()}-${rand(4)}-${rand(4)}-${rand(4)}`;
}

// Главное меню
const mainMenu = Markup.keyboard([
  ['🛒 Купить подписку', '💰 Мой баланс'],
  ['👤 Мой аккаунт', '❓ Поддержка'],
  ['🌐 Перейти на сайт']
]).resize();

// /start
bot.start(async (ctx) => {
  const name = ctx.from.first_name || 'игрок';
  await ctx.replyWithPhoto(
    { url: 'https://theday-site.pages.dev/og-image.png' },
    {
      caption: `✦ *Добро пожаловать в TheDay Client, ${name}!*\n\nМощный клиент для игры с расширенными возможностями.\n\n🔹 Выберите действие в меню ниже:`,
      parse_mode: 'Markdown',
      ...mainMenu
    }
  ).catch(() => {
    ctx.reply(
      `✦ *Добро пожаловать в TheDay Client, ${name}!*\n\nМощный клиент для игры с расширенными возможностями.\n\n🔹 Выберите действие в меню ниже:`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  });
});

// Купить подписку
bot.hears('🛒 Купить подписку', async (ctx) => {
  const buttons = PRODUCTS.map(p =>
    [Markup.button.callback(`${p.name} — ${p.price}₽`, `buy_${p.id}`)]
  );
  await ctx.reply(
    '🛒 *Выберите товар:*',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
});

// Обработка выбора товара
bot.action(/^buy_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return ctx.answerCbQuery('Товар не найден');

  await ctx.answerCbQuery();
  await ctx.reply(
    `📦 *${product.name}*\n💰 Цена: *${product.price}₽*\n\n` +
    `Для оплаты переведите *${product.price}₽* по СБП:\n` +
    `📱 Напишите нам — пришлём реквизиты\n\n` +
    `После оплаты нажмите кнопку ниже и отправьте скриншот чека.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Я оплатил', `paid_${productId}`)],
        [Markup.button.callback('◀️ Назад', 'back_shop')]
      ])
    }
  );
});

// Пользователь нажал "Я оплатил"
bot.action(/^paid_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return ctx.answerCbQuery();

  await ctx.answerCbQuery();

  // Сохраняем ожидающий заказ
  const orderId = `ORD-${Date.now()}`;

  await ctx.reply(
    `📸 Отправьте скриншот чека об оплате.\n\nПосле проверки вы получите ключ активации в течение 5-15 минут.`,
    { parse_mode: 'Markdown' }
  );

  // Уведомляем админа
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `🔔 *Новый заказ #${orderId}*\n\n` +
    `👤 Пользователь: [${ctx.from.first_name}](tg://user?id=${ctx.from.id})\n` +
    `🆔 ID: \`${ctx.from.id}\`\n` +
    `📦 Товар: ${product.name}\n` +
    `💰 Сумма: ${product.price}₽\n\n` +
    `Ожидает скриншот чека...`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`✅ Выдать ключ`, `issue_${ctx.from.id}_${productId}`)],
        [Markup.button.callback(`❌ Отклонить`, `reject_${ctx.from.id}`)]
      ])
    }
  );

  // Сохраняем состояние пользователя
  ctx.session = ctx.session || {};
  ctx.session.waitingReceipt = { productId, orderId };
});

// Получение скриншота
bot.on(message('photo'), async (ctx) => {
  // Пересылаем фото админу
  await bot.telegram.forwardMessage(ADMIN_ID, ctx.chat.id, ctx.message.message_id);
  await bot.telegram.sendMessage(
    ADMIN_ID,
    `👆 Скриншот от пользователя [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) (ID: \`${ctx.from.id}\`)`,
    { parse_mode: 'Markdown' }
  );
  await ctx.reply('✅ Скриншот получен! Ожидайте подтверждения (5-15 минут).');
});

// Админ выдаёт ключ
bot.action(/^issue_(\d+)_(.+)$/, async (ctx) => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');

  const userId = ctx.match[1];
  const productId = ctx.match[2];
  const product = PRODUCTS.find(p => p.id === productId);

  await ctx.answerCbQuery('✅ Ключ выдан!');

  const key = product?.key || genKey(productId);

  // Отправляем ключ пользователю
  await bot.telegram.sendMessage(
    userId,
    `🎉 *Оплата подтверждена!*\n\n` +
    `📦 Товар: ${product?.name}\n` +
    `🔑 Ваш ключ активации:\n\`${key}\`\n\n` +
    `Активируйте ключ на сайте в разделе *Аккаунт → Активация ключа*\n\n` +
    `🌐 ${SITE_URL}`,
    { parse_mode: 'Markdown' }
  );

  await ctx.editMessageText(
    ctx.callbackQuery.message.text + '\n\n✅ Ключ выдан: `' + key + '`',
    { parse_mode: 'Markdown' }
  );
});

// Админ отклоняет заказ
bot.action(/^reject_(\d+)$/, async (ctx) => {
  if (String(ctx.from.id) !== String(ADMIN_ID)) return ctx.answerCbQuery('Нет доступа');

  const userId = ctx.match[1];
  await ctx.answerCbQuery('❌ Отклонено');

  await bot.telegram.sendMessage(
    userId,
    `❌ *Оплата не подтверждена.*\n\nЕсли вы уверены что оплатили — обратитесь в поддержку.`,
    { parse_mode: 'Markdown' }
  );

  await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ Отклонено', { parse_mode: 'Markdown' });
});

// Назад в магазин
bot.action('back_shop', async (ctx) => {
  await ctx.answerCbQuery();
  const buttons = PRODUCTS.map(p =>
    [Markup.button.callback(`${p.name} — ${p.price}₽`, `buy_${p.id}`)]
  );
  await ctx.editMessageText('🛒 *Выберите товар:*', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
});

// Мой аккаунт
bot.hears('👤 Мой аккаунт', async (ctx) => {
  await ctx.reply(
    `👤 *Ваш аккаунт*\n\n🆔 Telegram ID: \`${ctx.from.id}\`\n\nДля управления аккаунтом перейдите на сайт:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.url('🌐 Открыть сайт', SITE_URL)]])
    }
  );
});

// Поддержка
bot.hears('❓ Поддержка', async (ctx) => {
  await ctx.reply(
    `❓ *Поддержка TheDay*\n\n` +
    `По всем вопросам:\n` +
    `• Напишите сюда — мы ответим\n` +
    `• Или перейдите на сайт в раздел Поддержка\n\n` +
    `⏱ Время ответа: до 30 минут`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.url('🌐 Поддержка на сайте', `${SITE_URL}/support.html`)]])
    }
  );
});

// Перейти на сайт
bot.hears('🌐 Перейти на сайт', async (ctx) => {
  await ctx.reply(
    '🌐 Открыть сайт TheDay:',
    Markup.inlineKeyboard([[Markup.button.url('Открыть', SITE_URL)]])
  );
});

// Мой баланс
bot.hears('💰 Мой баланс', async (ctx) => {
  await ctx.reply(
    `💰 *Баланс*\n\nУправляйте балансом на сайте:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.url('💰 Открыть баланс', `${SITE_URL}/balance.html`)]])
    }
  );
});

// Любое сообщение от пользователя — пересылаем админу
bot.on(message('text'), async (ctx) => {
  if (String(ctx.from.id) === String(ADMIN_ID)) return;

  await bot.telegram.sendMessage(
    ADMIN_ID,
    `💬 Сообщение от [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) (ID: \`${ctx.from.id}\`):\n\n${ctx.message.text}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(`Ответить`, `reply_${ctx.from.id}`)]])
    }
  );

  await ctx.reply('✉️ Ваше сообщение отправлено в поддержку. Ожидайте ответа.');
});

// Запуск
bot.launch().then(() => {
  console.log('✦ TheDay Bot запущен!');
  // Уведомляем админа
  bot.telegram.sendMessage(ADMIN_ID, '✅ Бот TheDay запущен и готов к работе!').catch(() => {});
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
