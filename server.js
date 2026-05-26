require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// =====================================
// ENV
// =====================================

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.log("Missing BOT_TOKEN or CHAT_ID");
  process.exit(1);
}

// =====================================
// TELEGRAM
// =====================================

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// =====================================
// SERVICE CODE
// =====================================

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

// =====================================
// CONFIG
// =====================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

const MIN_SCORE = 55;

const SIGNAL_COOLDOWN = {
  WEAK: 35 * 60 * 1000,
  MID: 20 * 60 * 1000,
  STRONG: 10 * 60 * 1000,
};

const GLOBAL_ALERT_GAP = 2 * 60 * 1000;

// =====================================
// EXECUTION QUALITY FILTER
// =====================================

const MAX_CAPITAL = {
  WEAK: 5000,
  MID: 15000,
  STRONG: 30000,
};

const MIN_NET_MOVE = {
  BTC: 0.008,
  ALT: 0.025,
};

// =====================================
// COINS
// =====================================

const COINS = {
  BTC: "XBTMYR",
  GRT: "GRTMYR",
  XRP: "XRPMYR",
  XLM: "XLMMYR",
  CRV: "CRVMYR",
  AAVE: "AAVEMYR",
};

// =====================================
// MEMORY
// =====================================

const PRICE_MEMORY = {};
const ACTIVE_TRADES = {};
const DAILY_STATS = {
  wins: 0,
  losses: 0,
  pnl: 0,
};
const LAST_SIGNAL = {};
const USER_STATE = {};
const PENDING_ENTRIES = {};
const LAST_PRICE = {};

let LAST_ALERT_TIME = 0;

// =====================================
// HELPERS
// =====================================

function now() {
  return Date.now();
}

function safeNumber(v) {
  return Number(v) || 0;
}

function canSendGlobalAlert() {
  return now() - LAST_ALERT_TIME > GLOBAL_ALERT_GAP;
}

function updateGlobalAlert() {
  LAST_ALERT_TIME = now();
}

function formatPrice(coin, value) {
  if (coin === "BTC") {
    return safeNumber(value).toFixed(2);
  }

  return safeNumber(value).toFixed(4);
}

function confidenceLabel(score) {
  if (score >= 75) {
    return "STRONG";
  }

  if (score >= 60) {
    return "MID";
  }

  return "WEAK";
}

function setupType(score) {
  if (score >= 75) {
    return "CONTINUATION";
  }

  if (score >= 60) {
    return "BREAKOUT";
  }

  return "EARLY MOMENTUM";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================
// TELEGRAM
// =====================================

async function sendTelegram(message, options = {}) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      `${SERVICE_CODE}\n\n${message}`,
      {
        parse_mode: "HTML",
        ...options,
      }
    );
  } catch (err) {
    console.log(err.message);
  }
}

// =====================================
// LUNO API
// =====================================

async function getTicker(coin) {
  try {
    const response = await axios.get(
      `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`
    );

    return response.data;
  } catch (err) {
    console.log(err.message);
    return null;
  }
}

async function getOrderbook(coin) {
  try {
    const response = await axios.get(
      `https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`
    );

    return response.data;
  } catch (err) {
    console.log(err.message);
    return null;
  }
}

// =====================================
// PRICE MEMORY
// =====================================

function updatePriceMemory(coin, price) {
  if (!PRICE_MEMORY[coin]) {
    PRICE_MEMORY[coin] = [];
  }

  PRICE_MEMORY[coin].push({
    price,
    time: now(),
  });

  if (PRICE_MEMORY[coin].length > 3000) {
    PRICE_MEMORY[coin].shift();
  }
}

function getPrices(coin) {
  return PRICE_MEMORY[coin]?.map((p) => p.price) || [];
}

// =====================================
// OHLC ENGINE
// =====================================

function buildOHLC(coin, seconds) {
  const memory = PRICE_MEMORY[coin];

  if (!memory || memory.length < 5) {
    return null;
  }

  const cutoff = now() - seconds * 1000;

  const candles = memory.filter((p) => p.time >= cutoff);

  if (candles.length < 2) {
    return null;
  }

  return {
    open: candles[0].price,
    high: Math.max(...candles.map((c) => c.price)),
    low: Math.min(...candles.map((c) => c.price)),
    close: candles[candles.length - 1].price,
  };
}

// =====================================
// EMA
// =====================================

function calculateEMA(values, period) {
  if (values.length < period) {
    return null;
  }

  const k = 2 / (period + 1);

  let ema = values[0];

  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

// =====================================
// RSI
// =====================================

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];

    if (diff > 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;

  return 100 - 100 / (1 + rs);
}

// =====================================
// STRUCTURE
// =====================================

function detectStructure(coin, timeframe) {
  const candle = buildOHLC(coin, timeframe);

  if (!candle) {
    return "MENDATAR";
  }

  const move = (candle.close - candle.open) / candle.open;

  if (move > 0.0035) {
    return "MENAIK";
  }

  if (move < -0.0035) {
    return "MENURUN";
  }

  return "MENDATAR";
}

// =====================================
// MARKET DATA
// =====================================

async function getMarketData(coin) {
  try {
    const [ticker, orderbook] = await Promise.all([
      getTicker(coin),
      getOrderbook(coin),
    ]);

    if (!ticker || !orderbook) {
      return null;
    }

    const currentPrice = safeNumber(ticker.last_trade);

    updatePriceMemory(coin, currentPrice);

    const bids = orderbook.bids || [];
    const asks = orderbook.asks || [];

    const bestBid = safeNumber(bids[0]?.price);
    const bestAsk = safeNumber(asks[0]?.price);

    let buyVolume = 0;
    let sellVolume = 0;

    bids.slice(0, 20).forEach((b) => {
      buyVolume += safeNumber(b.volume);
    });

    asks.slice(0, 20).forEach((a) => {
      sellVolume += safeNumber(a.volume);
    });

    return {
      currentPrice,
      bestBid,
      bestAsk,
      buyVolume,
      sellVolume,
      pressure: buyVolume / (sellVolume || 1),
    };
  } catch (err) {
    console.log(err.message);
    return null;
  }
}

// =====================================
// FILTER ENGINE
// =====================================

async function validateSignal(coin, data) {
  let score = 0;

  const prices = getPrices(coin);

  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  const ema50 = calculateEMA(prices, 50);

  const rsi = calculateRSI(prices);

  const tf1 = detectStructure(coin, 60);
  const tf5 = detectStructure(coin, 300);
  const tf15 = detectStructure(coin, 900);

  // EMA
  if (ema9 > ema21) {
    score += 25;
  }

  if (data.currentPrice > ema50) {
    score += 10;
  }

  // RSI
  if (rsi >= 48 && rsi <= 78) {
    score += 15;
  }

  if (rsi > 85) {
    score -= 20;
  }

  // BREAKOUT
  if (prices.length > 20) {
    const recentHigh = Math.max(...prices.slice(-20));

    if (data.currentPrice > recentHigh * 1.0015) {
      score += 20;
    }
  }

  // BUY PRESSURE
  if (data.pressure > 1.2) {
    score += 15;
  }

  // VOLUME
  const volumeStrength =
    data.buyVolume / (data.sellVolume || 1);

  if (volumeStrength > 1.4) {
    score += 15;
  }

  // TIMEFRAME
  if (tf1 === "MENAIK") {
    score += 10;
  }

  if (tf5 === "MENAIK") {
    score += 10;
  }

  if (tf15 === "MENAIK") {
    score += 5;
  }

  // REJECTION FILTER
  const candle = buildOHLC(coin, 60);

  if (candle) {
    const rejection =
      candle.high - candle.close >
      (candle.close - candle.open) * 1.5;

    if (rejection) {
      score -= 25;
    }
  }

  return {
    score,
    rsi,
    type: setupType(score),
    confidence: confidenceLabel(score),
  };
}

// =====================================
// PRICE ALERT
// =====================================

async function sendPriceAlert() {
  let message = `📡 <b>LIVE PRICE UPDATE</b>`;

  for (const coin of ["BTC", "GRT"]) {
    const ticker = await getTicker(coin);

    if (!ticker) continue;

    const price = safeNumber(ticker.last_trade);

    let emoji = "➖";

    if (LAST_PRICE[coin]) {
      if (price > LAST_PRICE[coin]) {
        emoji = "🟢";
      }

      if (price < LAST_PRICE[coin]) {
        emoji = "🔴";
      }
    }

    LAST_PRICE[coin] = price;

    message += `\n\n${emoji} ${coin}`;
    message += `\nRM${formatPrice(coin, price)}`;
  }

  await sendTelegram(message);
}

// =====================================
// MARKET STRUCTURE
// =====================================

async function sendStructureAlert() {
  let message = `📊 <b>MARKET STRUCTURE</b>`;

  for (const coin of ["BTC", "GRT"]) {
    const tf1 = detectStructure(coin, 60);
    const tf5 = detectStructure(coin, 300);
    const tf15 = detectStructure(coin, 900);

    message += `\n\n🪙 ${coin}`;
    message += `\n1m  → ${tf1}`;
    message += `\n5m  → ${tf5}`;
    message += `\n15m → ${tf15}`;
  }

  await sendTelegram(message);
}

// =====================================
// SIGNAL ENGINE
// =====================================

async function smartSignalEngine() {
  for (const coin of Object.keys(COINS)) {
    if (ACTIVE_TRADES[coin]) {
      continue;
    }

    const data = await getMarketData(coin);

    if (!data) {
      continue;
    }

    const validation = await validateSignal(
      coin,
      data
    );

    if (validation.score < MIN_SCORE) {
      continue;
    }

    const cooldown =
      SIGNAL_COOLDOWN[
        validation.confidence
      ];

    if (
      LAST_SIGNAL[coin] &&
      now() - LAST_SIGNAL[coin] < cooldown
    ) {
      continue;
    }

    if (!canSendGlobalAlert()) {
      continue;
    }

    LAST_SIGNAL[coin] = now();

    updateGlobalAlert();

    // =====================================
    // EXECUTION QUALITY PRE-FILTER
    // =====================================

    const projectedTP =
      coin === "BTC"
        ? data.currentPrice * 1.01
        : data.currentPrice * 1.03;

    const projectedSL =
      coin === "BTC"
        ? data.currentPrice * 0.994
        : data.currentPrice * 0.988;

    const projectedMove =
      (projectedTP - data.currentPrice) /
      data.currentPrice;

    if (
      coin !== "BTC" &&
      projectedMove < MIN_NET_MOVE.ALT
    ) {
      continue;
    }

    if (
      coin === "BTC" &&
      projectedMove < MIN_NET_MOVE.BTC
    ) {
      continue;
    }

    PENDING_ENTRIES[coin] = {
      coin,
      tp:
        projectedTP,
      sl:
        projectedSL,
      currentPrice:
        data.currentPrice,
      bestAsk:
        data.bestAsk,
      bestBid:
        data.bestBid,
      confidence:
        validation.confidence,
      score:
        validation.score,
      type:
        validation.type,
    };

    await sendTelegram(
      `🚀 <b>SCALPING ENTRY</b>

🪙 ${coin}

💵 Current:
RM${formatPrice(
        coin,
        data.currentPrice
      )}

🎯 TP:
RM${formatPrice(
        coin,
        projectedTP
      )}

🛑 SL:
RM${formatPrice(
        coin,
        projectedSL
      )}

🧠 Confidence:
${validation.score}% ${validation.confidence}

📊 Setup:
${validation.type}

━━━━━━━━━━━━━━

START ENTRY?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ START ENTRY",
                callback_data: `START_${coin}`,
              },
              {
                text: "❌ IGNORE",
                callback_data: `IGNORE_${coin}`,
              },
            ],
          ],
        },
      }
    );
  }
}

// =====================================
// TELEGRAM CALLBACKS
// =====================================

bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  // START ENTRY
  if (data.startsWith("START_")) {
    const coin = data.split("_")[1];

    USER_STATE[chatId] = {
      step: "WAIT_PROFIT",
      coin,
      createdAt: now(),
    };

    await bot.sendMessage(
      chatId,
      `💰 TARGET NET PROFIT (RM)?`
    );
  }

  // IGNORE
  if (data.startsWith("IGNORE_")) {
    const coin = data.split("_")[1];

    await bot.sendMessage(
      chatId,
      `❌ ENTRY IGNORED

🪙 ${coin}

📡 Monitoring Next Entry...`
    );
  }

  // BUY YES
  if (data.startsWith("BUYYES_")) {
    const coin = data.split("_")[1];

    USER_STATE[chatId] = {
      step: "WAIT_BUY_MATCHED",
      coin,
      createdAt: now(),
    };

    await bot.sendMessage(
      chatId,
      `📌 ENTER MATCHED BUY PRICE`
    );
  }

  // BUY NO
  if (data.startsWith("BUYNO_")) {
    const coin = data.split("_")[1];

    await bot.sendMessage(
      chatId,
      `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
    );
  }

  // TP SELL
  if (data.startsWith("TPSELL_")) {
    const coin = data.split("_")[1];

    USER_STATE[chatId] = {
      step: "WAIT_TP_SELL_MATCHED",
      coin,
      createdAt: now(),
    };

    await bot.sendMessage(
      chatId,
      `📌 ENTER MATCHED SELL PRICE`
    );
  }

  // TP HOLD
  if (data.startsWith("TPHOLD_")) {
    const coin = data.split("_")[1];

    await bot.sendMessage(
      chatId,
      `📡 TRADE HOLD

🪙 ${coin}

Realtime Monitoring Resumed...`
    );
  }

  // SL SELL
  if (data.startsWith("SLSELL_")) {
    const coin = data.split("_")[1];

    USER_STATE[chatId] = {
      step: "WAIT_SL_SELL_MATCHED",
      coin,
      createdAt: now(),
    };

    await bot.sendMessage(
      chatId,
      `📌 ENTER MATCHED SELL PRICE`
    );
  }

  // SL HOLD
  if (data.startsWith("SLHOLD_")) {
    const coin = data.split("_")[1];

    await bot.sendMessage(
      chatId,
      `⚠️ STOP LOSS OVERRIDDEN

🪙 ${coin}

📡 Realtime Monitoring Resumed...`
    );
  }

  await bot.answerCallbackQuery(query.id);
});

// =====================================
// USER MESSAGE FLOW
// =====================================

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!USER_STATE[chatId]) {
    return;
  }

  const state = USER_STATE[chatId];
  const coin = state.coin;

  // =====================================
  // TARGET PROFIT
  // =====================================

  if (state.step === "WAIT_PROFIT") {
    const targetProfit = safeNumber(msg.text);

    const entry = PENDING_ENTRIES[coin];

    const entryPrice = entry.bestAsk;
    const tp = entry.tp;

    const profitPerUnit =
      tp - entryPrice;

    // =====================================
    // EXECUTION QUALITY FILTER
    // =====================================

    const coinType =
      coin === "BTC"
        ? "BTC"
        : "ALT";

    const minimumMove =
      MIN_NET_MOVE[coinType];

    const movePercent =
      profitPerUnit / entryPrice;

    // REJECT SMALL TP
    if (movePercent < minimumMove) {
      delete USER_STATE[chatId];

      await bot.sendMessage(
        chatId,
        `⚠️ LOW EXECUTION QUALITY

🪙 ${coin}

TP distance too small after fees.

📡 Monitoring Next Entry...`
      );

      return;
    }

    const estimatedNetPerUnit =
      profitPerUnit -
      entryPrice * BUY_FEE -
      tp * SELL_FEE;

    const quantity = Math.ceil(
      targetProfit /
        estimatedNetPerUnit
    );

    const value = quantity * entryPrice;

    // REJECT NEGATIVE PROFITABILITY
    if (
      !isFinite(quantity) ||
      quantity <= 0 ||
      estimatedNetPerUnit <= 0
    ) {
      delete USER_STATE[chatId];

      await bot.sendMessage(
        chatId,
        `⚠️ LOW EXECUTION QUALITY

🪙 ${coin}

Fees dominating movement.

📡 Monitoring Next Entry...`
      );

      return;
    }

    // MAX CAPITAL FILTER
    const confidence =
      entry.confidence;

    const maxCapital =
      MAX_CAPITAL[confidence];

    if (value > maxCapital) {
      delete USER_STATE[chatId];

      await bot.sendMessage(
        chatId,
        `⚠️ LOW EXECUTION QUALITY

🪙 ${coin}

Required capital too high.

💰 Required:
RM${value.toFixed(0)}

🛑 Max Allowed:
RM${maxCapital.toFixed(0)}

📡 Monitoring Next Entry...`
      );

      return;
    }

    PENDING_ENTRIES[coin].quantity = quantity;
    PENDING_ENTRIES[coin].value = value;

    USER_STATE[chatId] = {
      step: "WAIT_BUY_CONFIRM",
      coin,
    };

    await bot.sendMessage(
      chatId,
      `📊 SUGGESTED BUY

🪙 ${coin}

📌 Best Ask:
RM${formatPrice(
        coin,
        entry.bestAsk
      )}

📦 Min Quantity:
${quantity.toLocaleString()} ${coin}

💵 Entry Price:
RM${formatPrice(
        coin,
        entry.bestAsk
      )}

🎯 TP:
RM${formatPrice(
        coin,
        entry.tp
      )}

🛑 SL:
RM${formatPrice(
        coin,
        entry.sl
      )}

💰 Value:
RM${value.toFixed(0)}

━━━━━━━━━━━━━━

CONTINUE?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ YES",
                callback_data: `BUYYES_${coin}`,
              },
              {
                text: "❌ NO",
                callback_data: `BUYNO_${coin}`,
              },
            ],
          ],
        },
      }
    );
  }

  // =====================================
  // BUY MATCHED
  // =====================================

  if (state.step === "WAIT_BUY_MATCHED") {
    const matchedPrice =
      safeNumber(msg.text);

    const entry = PENDING_ENTRIES[coin];

    const feesUnit =
      entry.quantity * BUY_FEE;

    const netTradeUnit =
      entry.quantity - feesUnit;

    const netTradeValue =
      matchedPrice * netTradeUnit;

    ACTIVE_TRADES[coin] = {
      coin,
      tp: entry.tp,
      sl: entry.sl,
      matchedPrice,
      quantity: entry.quantity,
      netTradeUnit,
      netTradeValue,
      status: "OPEN",
      startTime: now(),
      tpAlertSent: false,
      slAlertSent: false,
      breakEvenActivated: false,
    };

    delete USER_STATE[chatId];

    await bot.sendMessage(
      chatId,
      `✅ TRADE CONFIRMED

🪙 ${coin}

💵 Matched Price:
RM${formatPrice(
        coin,
        matchedPrice
      )}

📦 Net Trade Unit:
${netTradeUnit.toLocaleString()} ${coin}

💰 Net Trade Value:
RM${netTradeValue.toFixed(0)}

📉 Luno Fees:
${feesUnit.toLocaleString()} ${coin}

━━━━━━━━━━━━━━

📡 Trade Monitoring Started...`
    );
  }

  // =====================================
  // TP SELL MATCHED
  // =====================================

  if (state.step === "WAIT_TP_SELL_MATCHED") {
    const matchedPrice =
      safeNumber(msg.text);

    const trade = ACTIVE_TRADES[coin];

    const sellFees =
      trade.netTradeUnit * SELL_FEE;

    const netSaleUnit =
      trade.netTradeUnit - sellFees;

    const netSaleValue =
      matchedPrice * netSaleUnit;

    const netProfit =
      netSaleValue -
      trade.netTradeValue;

    DAILY_STATS.wins += 1;
    DAILY_STATS.pnl += netProfit;

    delete ACTIVE_TRADES[coin];
    delete USER_STATE[chatId];

    await bot.sendMessage(
      chatId,
      `✅ SELL TRADE CONFIRMED

🪙 ${coin}

💵 Matched Price:
RM${formatPrice(
        coin,
        matchedPrice
      )}

📦 Net Sale Unit:
${netSaleUnit.toLocaleString()} ${coin}

💰 Net Sale Value:
RM${netSaleValue.toFixed(0)}

📉 Luno Fees:
${sellFees.toLocaleString()} ${coin}

💵 Net Profit:
RM${netProfit.toFixed(0)}

━━━━━━━━━━━━━━

📡 Live Monitoring Stopped

✅ Trade Closed`
    );
  }

  // =====================================
  // SL SELL MATCHED
  // =====================================

  if (state.step === "WAIT_SL_SELL_MATCHED") {
    const matchedPrice =
      safeNumber(msg.text);

    const trade = ACTIVE_TRADES[coin];

    const sellFees =
      trade.netTradeUnit * SELL_FEE;

    const netSaleUnit =
      trade.netTradeUnit - sellFees;

    const netSaleValue =
      matchedPrice * netSaleUnit;

    const netLoss =
      netSaleValue -
      trade.netTradeValue;

    DAILY_STATS.losses += 1;
    DAILY_STATS.pnl += netLoss;

    delete ACTIVE_TRADES[coin];
    delete USER_STATE[chatId];

    await bot.sendMessage(
      chatId,
      `🛑 STOP LOSS CONFIRMED

🪙 ${coin}

💵 Matched Price:
RM${formatPrice(
        coin,
        matchedPrice
      )}

📦 Net Sell Unit:
${netSaleUnit.toLocaleString()} ${coin}

💰 Net Value After Sell:
RM${netSaleValue.toFixed(0)}

📉 Luno Fees:
${sellFees.toLocaleString()} ${coin}

💸 Net Loss:
RM${netLoss.toFixed(0)}

━━━━━━━━━━━━━━

📡 Live Monitoring Stopped

✅ Trade Ended`
    );
  }
});

// =====================================
  // DAILY REPORT
  // =====================================

  setInterval(
    sendDailyReport,
    24 * 60 * 60 * 1000
  );

  // =====================================
  // TRADE MONITOR
// =====================================

async function monitorTrades() {
  for (const coin of Object.keys(ACTIVE_TRADES)) {
    const trade = ACTIVE_TRADES[coin];

    const market = await getMarketData(coin);

    if (!market) {
      continue;
    }

    // =====================================
    // TP HIT
    // =====================================

    // =====================================
    // BREAK EVEN SYSTEM
    // =====================================

    if (
      !trade.breakEvenActivated &&
      market.currentPrice >=
        trade.matchedPrice * 1.006
    ) {
      trade.sl = trade.matchedPrice;
      trade.breakEvenActivated = true;

      await sendTelegram(
        `🛡 <b>BREAK EVEN ACTIVATED</b>

🪙 ${coin}

🛑 New SL:
RM${formatPrice(
          coin,
          trade.sl
        )}`
      );
    }

    // =====================================
    // TRAILING TP
    // =====================================

    if (
      market.currentPrice >=
      trade.tp * 1.003
    ) {
      trade.tp = trade.tp * 1.002;
    }

    // =====================================
    // TP HIT
    // =====================================

    if (
      market.currentPrice >= trade.tp &&
      !trade.tpAlertSent
    ) {
      trade.tpAlertSent = true;
      const sellFees =
        trade.netTradeUnit * SELL_FEE;

      const netMustSell =
        trade.netTradeUnit - sellFees;

      const grossProfit =
        market.bestBid * netMustSell -
        trade.netTradeValue;

      await sendTelegram(
        `🎯 <b>TP REACHED</b>

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
          coin,
          market.currentPrice
        )}

📌 Best Bid:
RM${formatPrice(
          coin,
          market.bestBid
        )}

🎯 Current TP:
RM${formatPrice(
          coin,
          trade.tp
        )}

━━━━━━━━━━━━━━

📦 Net Must Sell
(Luno Quantity)

${netMustSell.toLocaleString()} ${coin}

💰 Profit Kasar:
RM${grossProfit.toFixed(0)}

━━━━━━━━━━━━━━

SELL NOW?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "💰 SELL",
                  callback_data: `TPSELL_${coin}`,
                },
                {
                  text: "✋ HOLD",
                  callback_data: `TPHOLD_${coin}`,
                },
              ],
            ],
          },
        }
      );

      await sleep(10000);

      trade.slAlertSent = false;

      trade.tpAlertSent = false;
    }

    // =====================================
    // SL HIT
    // =====================================

    if (
      market.currentPrice <= trade.sl &&
      !trade.slAlertSent
    ) {
      trade.slAlertSent = true;
      const sellFees =
        trade.netTradeUnit * SELL_FEE;

      const netMustSell =
        trade.netTradeUnit - sellFees;

      const estimatedLoss =
        market.bestBid * netMustSell -
        trade.netTradeValue;

      await sendTelegram(
        `🛑 <b>STOP LOSS HIT</b>

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
          coin,
          market.currentPrice
        )}

📌 Best Bid:
RM${formatPrice(
          coin,
          market.bestBid
        )}

🛑 Current SL:
RM${formatPrice(
          coin,
          trade.sl
        )}

━━━━━━━━━━━━━━

📦 Net Must Sell
(Luno Quantity)

${netMustSell.toLocaleString()} ${coin}

💸 Estimated Loss:
RM${estimatedLoss.toFixed(0)}

━━━━━━━━━━━━━━

SELL NOW?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "💰 SELL",
                  callback_data: `SLSELL_${coin}`,
                },
                {
                  text: "✋ HOLD",
                  callback_data: `SLHOLD_${coin}`,
                },
              ],
            ],
          },
        }
      );

      await sleep(10000);

      trade.slAlertSent = false;
    }
  }
}

// =====================================
// EXPRESS
// =====================================

app.get("/", (req, res) => {
  res.json({
    status: "ACTIVE",
    service: SERVICE_CODE,
  });
});

// =====================================
// DAILY REPORT
// =====================================

async function sendDailyReport() {
  await sendTelegram(
    `📊 <b>DAILY REPORT</b>

✅ Wins: ${DAILY_STATS.wins}
❌ Losses: ${DAILY_STATS.losses}

💰 Net PNL:
RM${DAILY_STATS.pnl.toFixed(0)}`
  );
}

// =====================================
// ENTRY SESSION CLEANER
// =====================================

setInterval(() => {
  Object.keys(USER_STATE).forEach((chatId) => {
    const state = USER_STATE[chatId];

    if (
      state.createdAt &&
      now() - state.createdAt >
        5 * 60 * 1000
    ) {
      delete USER_STATE[chatId];

      bot.sendMessage(
        chatId,
        `⌛ ENTRY SESSION EXPIRED

📡 Monitoring Next Entry...`
      );
    }
  });
}, 60000);

// =====================================
// START SERVER
// =====================================

app.listen(PORT, async () => {
  console.log(`RUNNING ${PORT}`);

  await sendTelegram(
    `✅ BOT ONLINE

🚀 INSTITUTIONAL SCALPING TERMINAL ACTIVE`
  );

  // =====================================
  // LIVE PRICE MEMORY
  // =====================================

  setInterval(async () => {
    for (const coin of Object.keys(COINS)) {
      const ticker = await getTicker(coin);

      if (!ticker) {
        continue;
      }

      updatePriceMemory(
        coin,
        safeNumber(ticker.last_trade)
      );
    }
  }, 5000);

  // =====================================
  // PRICE ALERT
  // =====================================

  setInterval(
    sendPriceAlert,
    5 * 60 * 1000
  );

  // =====================================
  // MARKET STRUCTURE
  // =====================================

  setInterval(
    sendStructureAlert,
    15 * 60 * 1000
  );

  // =====================================
  // SIGNAL ENGINE
  // =====================================

  setInterval(
    smartSignalEngine,
    60 * 1000
  );

  // =====================================
  // TRADE MONITOR
  // =====================================

  setInterval(
    monitorTrades,
    15000
  );
});
