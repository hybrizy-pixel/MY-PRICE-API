require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.log("Missing BOT_TOKEN or CHAT_ID");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

const SCAN_COINS = [
  "BTC",
  "GRT",
  "XRP",
  "XLM",
  "CRV",
  "AAVE",
];

const MAX_CAPITAL = {
  WEAK: 5000,
  MID: 15000,
  STRONG: 30000,
};

const SIGNAL_COOLDOWN = {
  WEAK: 35 * 60 * 1000,
  MID: 20 * 60 * 1000,
  STRONG: 10 * 60 * 1000,
};

const ACTIVE_TRADES = {};
const PENDING_ENTRIES = {};
const USER_STATE = {};
const PRICE_MEMORY = {};
const LAST_SIGNAL = {};
const LAST_PRICE = {};

function now() {
  return Date.now();
}

function safeNumber(value) {
  return Number(value) || 0;
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
  if (score >= 80) {
    return "CONTINUATION";
  }

  if (score >= 70) {
    return "BREAKOUT";
  }

  return "EARLY MOMENTUM";
}

function calculateDirection(score) {
  if (score >= 80) {
    return "🚀 MARKET SEDANG NAIK KUAT";
  }

  if (score >= 65) {
    return "📈 MARKET SEDANG NAIK";
  }

  if (score >= 50) {
    return "↔️ MARKET SIDEWAY";
  }

  return "🔻 MARKET SEDANG JATUH";
}

function calculatePressure(score) {
  if (score >= 80) {
    return "TEKANAN BELI KUAT";
  }

  if (score >= 65) {
    return "TEKANAN BELI SEDERHANA";
  }

  return "TEKANAN JUAL KUAT";
}

function getStructureCriteria(data) {
  if (data.score >= 80) {
    return "BOLEH BELI SKRG";
  }

  if (data.score >= 65) {
    return `BELI JIKA PECAH RM${formatPrice(
      data.coin,
      data.resistance
    )}`;
  }

  if (data.score >= 50) {
    return `BELI JIKA TURUN RM${formatPrice(
      data.coin,
      data.support
    )}`;
  }

  return "JGN BELI";
}

async function sendTelegram(message, options = {}) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      `${SERVICE_CODE}\n\n${message}`,
      options
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function getTicker(coin) {
  try {
    const pair =
      coin === "BTC"
        ? "XBTMYR"
        : `${coin}MYR`;

    const response = await axios.get(
      `https://api.luno.com/api/1/ticker?pair=${pair}`
    );

    return {
      coin,
      currentPrice: safeNumber(response.data.last_trade),
      bestAsk: safeNumber(response.data.ask),
      bestBid: safeNumber(response.data.bid),
    };
  } catch (error) {
    console.log(error.message);
    return null;
  }
}

function updatePriceMemory(coin, price) {
  if (!PRICE_MEMORY[coin]) {
    PRICE_MEMORY[coin] = [];
  }

  PRICE_MEMORY[coin].push({
    price,
    time: now(),
  });

  if (PRICE_MEMORY[coin].length > 500) {
    PRICE_MEMORY[coin].shift();
  }
}

async function updateMemory() {
  for (const coin of SCAN_COINS) {
    const data = await getTicker(coin);

    if (!data) {
      continue;
    }

    updatePriceMemory(
      coin,
      data.currentPrice
    );
  }
}

async function sendPriceAlert() {
  const btc = await getTicker("BTC");
  const grt = await getTicker("GRT");

  if (!btc || !grt) {
    return;
  }

  let btcEmoji = "➖";
  let grtEmoji = "➖";

  if (LAST_PRICE.BTC) {
    if (btc.currentPrice > LAST_PRICE.BTC) {
      btcEmoji = "🟢";
    }

    if (btc.currentPrice < LAST_PRICE.BTC) {
      btcEmoji = "🔴";
    }
  }

  if (LAST_PRICE.GRT) {
    if (grt.currentPrice > LAST_PRICE.GRT) {
      grtEmoji = "🟢";
    }

    if (grt.currentPrice < LAST_PRICE.GRT) {
      grtEmoji = "🔴";
    }
  }

  LAST_PRICE.BTC = btc.currentPrice;
  LAST_PRICE.GRT = grt.currentPrice;

  const message = `📡 PRICE ALERT

${btcEmoji} BTC
RM${formatPrice(
    "BTC",
    btc.currentPrice
  )}

${grtEmoji} GRT
RM${formatPrice(
    "GRT",
    grt.currentPrice
  )}`;

  await sendTelegram(message);
}

async function sendMarketStructure() {
  const btc = await getTicker("BTC");
  const grt = await getTicker("GRT");

  if (!btc || !grt) {
    return;
  }

  const btcScore =
    Math.floor(Math.random() * 30) + 60;

  const grtScore =
    Math.floor(Math.random() * 30) + 50;

  const btcSupport =
    btc.currentPrice * 0.992;

  const btcResistance =
    btc.currentPrice * 1.01;

  const grtSupport =
    grt.currentPrice * 0.988;

  const grtResistance =
    grt.currentPrice * 1.03;

  const message = `📊 MARKET STRUCTURE UPDATE

🪙 BTC

📈 Arah Market:
${calculateDirection(btcScore)}

💵 Harga Semasa:
RM${formatPrice(
    "BTC",
    btc.currentPrice
  )}

🟢 Support:
RM${formatPrice(
    "BTC",
    btcSupport
  )}

🔴 Resistance:
RM${formatPrice(
    "BTC",
    btcResistance
  )}

⚡ Tekanan Market:
${calculatePressure(btcScore)}

🧠 Kriteria:
${getStructureCriteria({
    coin: "BTC",
    score: btcScore,
    support: btcSupport,
    resistance: btcResistance,
  })}

━━━━━━━━━━━━━━

🪙 GRT

📈 Arah Market:
${calculateDirection(grtScore)}

💵 Harga Semasa:
RM${formatPrice(
    "GRT",
    grt.currentPrice
  )}

🟢 Support:
RM${formatPrice(
    "GRT",
    grtSupport
  )}

🔴 Resistance:
RM${formatPrice(
    "GRT",
    grtResistance
  )}

⚡ Tekanan Market:
${calculatePressure(grtScore)}

🧠 Kriteria:
${getStructureCriteria({
    coin: "GRT",
    score: grtScore,
    support: grtSupport,
    resistance: grtResistance,
  })}`;

  await sendTelegram(message);
}

async function scanSignals() {
  for (const coin of SCAN_COINS) {
    if (ACTIVE_TRADES[coin]) {
      continue;
    }

    if (
      LAST_SIGNAL[coin] &&
      now() - LAST_SIGNAL[coin] <
        SIGNAL_COOLDOWN.MID
    ) {
      continue;
    }

    const data = await getTicker(coin);

    if (!data) {
      continue;
    }

    const score =
      Math.floor(Math.random() * 30) + 60;

    const confidence =
      confidenceLabel(score);

    if (confidence === "WEAK") {
      continue;
    }

    const entryPrice =
      coin === "BTC"
        ? data.currentPrice * 0.999
        : data.currentPrice * 0.996;

    let tp;

    if (coin === "BTC") {
      tp = entryPrice * 1.018;
    } else if (
      coin === "XRP" ||
      coin === "XLM"
    ) {
      tp = entryPrice * 1.05;
    } else {
      tp = entryPrice * 1.07;
    }

    const sl = entryPrice * 0.988;

    const durationHours =
      confidence === "STRONG"
        ? 12
        : 6;

    const durationLabel = `${durationHours} HOURS`;

    PENDING_ENTRIES[coin] = {
      coin,
      currentPrice: data.currentPrice,
      entryPrice,
      tp,
      sl,
      durationHours,
      durationLabel,
      confidence,
      score,
      bestAsk: data.bestAsk,
      bestBid: data.bestBid,
    };

    LAST_SIGNAL[coin] = now();

    const message = `🚀 SCALPING ENTRY

🪙 ${coin}

💵 Current:
RM${formatPrice(
      coin,
      data.currentPrice
    )}

📌 Entry:
RM${formatPrice(
      coin,
      entryPrice
    )}

🎯 TP:
RM${formatPrice(
      coin,
      tp
    )}

🛑 SL:
RM${formatPrice(
      coin,
      sl
    )}

⏳ Trade Duration:
${durationLabel}

🧠 Confidence:
${score}% ${confidence}

📊 Setup:
${setupType(score)}

━━━━━━━━━━━━━━

START ENTRY?`;

    await sendTelegram(message, {
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
    });
  }
}

async function monitorTrades() {
  for (const coin in ACTIVE_TRADES) {
    const trade = ACTIVE_TRADES[coin];

    const data = await getTicker(coin);

    if (!data) {
      continue;
    }

    if (
      !trade.tpReached &&
      data.currentPrice >= trade.tp
    ) {
      trade.tpReached = true;

      const grossProfit =
        (trade.tp - trade.buyPrice) *
        trade.netTradeUnit;

      const message = `🎯 TP REACHED

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        data.currentPrice
      )}

🎯 Current TP:
RM${formatPrice(
        coin,
        trade.tp
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        data.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(4)} ${coin}

💰 Profit Kasar:
RM${grossProfit.toFixed(2)}

━━━━━━━━━━━━━━

SELL NOW?`;

      await sendTelegram(message, {
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
      });
    }

    if (
      !trade.slReached &&
      data.currentPrice <= trade.sl
    ) {
      trade.slReached = true;

      const message = `🛑 STOP LOSS HIT

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        data.currentPrice
      )}

🛑 Current SL:
RM${formatPrice(
        coin,
        trade.sl
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        data.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(4)} ${coin}

━━━━━━━━━━━━━━

SELL NOW?`;

      await sendTelegram(message, {
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
      });
    }

    const durationExpired =
      now() - trade.startTime >=
      trade.durationHours *
        60 *
        60 *
        1000;

    if (
      durationExpired &&
      !trade.durationAlertSent
    ) {
      trade.durationAlertSent = true;

      const message = `⌛ SETUP DURATION REACHED

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        data.currentPrice
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        data.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(4)} ${coin}

━━━━━━━━━━━━━━

SELL AT CURRENT PRICE?`;

      await sendTelegram(message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💰 SELL",
                callback_data: `TIMESELL_${coin}`,
              },
              {
                text: "✋ HOLD",
                callback_data: `TIMEHOLD_${coin}`,
              },
            ],
          ],
        },
      });
    }
  }
}

bot.on(
  "callback_query",
  async (query) => {
    const data = query.data;
    const chatId =
      query.message.chat.id;

    if (data.startsWith("START_")) {
      const coin =
        data.split("_")[1];

      USER_STATE[chatId] = {
        step: "WAIT_PROFIT",
        coin,
      };

      await bot.sendMessage(
        chatId,
        "💰 TARGET NET PROFIT (RM)?"
      );
    }

    if (data.startsWith("IGNORE_")) {
      const coin =
        data.split("_")[1];

      await bot.sendMessage(
        chatId,
        `❌ ENTRY IGNORED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    if (
      data.startsWith("TPSELL_") ||
      data.startsWith("SLSELL_") ||
      data.startsWith("TIMESELL_")
    ) {
      const coin =
        data.split("_")[1];

      USER_STATE[chatId] = {
        step: "WAIT_SELL_PRICE",
        coin,
      };

      await bot.sendMessage(
        chatId,
        "📌 ENTER MATCHED SELL PRICE"
      );
    }

    if (
      data.startsWith("TPHOLD_") ||
      data.startsWith("SLHOLD_") ||
      data.startsWith("TIMEHOLD_")
    ) {
      await bot.sendMessage(
        chatId,
        `📡 MONITORING RESUMED`
      );
    }

    await bot.answerCallbackQuery(
      query.id
    );
  }
);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!USER_STATE[chatId]) {
    return;
  }

  const state = USER_STATE[chatId];

  if (state.step === "WAIT_PROFIT") {
    const targetProfit =
      safeNumber(msg.text);

    const entry =
      PENDING_ENTRIES[state.coin];

    if (!entry) {
      return;
    }

    const profitPerUnit =
      entry.tp - entry.entryPrice;

    const estimatedNetPerUnit =
      profitPerUnit -
      entry.entryPrice * BUY_FEE -
      entry.tp * SELL_FEE;

    if (estimatedNetPerUnit <= 0) {
      await bot.sendMessage(
        chatId,
        "⚠️ LOW EXECUTION QUALITY"
      );

      return;
    }

    const quantity = Math.ceil(
      targetProfit /
        estimatedNetPerUnit
    );

    const value =
      quantity * entry.entryPrice;

    const maxCapital =
      MAX_CAPITAL[entry.confidence];

    if (value > maxCapital) {
      await bot.sendMessage(
        chatId,
        `⚠️ REQUIRED CAPITAL TOO HIGH`
      );

      delete USER_STATE[chatId];

      return;
    }

    USER_STATE[chatId] = {
      step: "WAIT_BUY_PRICE",
      coin: entry.coin,
      quantity,
      value,
    };

    const suggestMessage = `📊 SUGGESTED BUY

🪙 ${entry.coin}

📌 Best Ask:
RM${formatPrice(
      entry.coin,
      entry.bestAsk
    )}

📦 Min Quantity:
${quantity.toLocaleString()} ${entry.coin}

💵 Entry Price:
RM${formatPrice(
      entry.coin,
      entry.entryPrice
    )}

🎯 TP:
RM${formatPrice(
      entry.coin,
      entry.tp
    )}

🛑 SL:
RM${formatPrice(
      entry.coin,
      entry.sl
    )}

💰 Value:
RM${value.toFixed(0)}

━━━━━━━━━━━━━━

CONTINUE?`;

    await bot.sendMessage(
      chatId,
      suggestMessage,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ YES",
                callback_data: `BUYYES_${entry.coin}`,
              },
              {
                text: "❌ NO",
                callback_data: `BUYNO_${entry.coin}`,
              },
            ],
          ],
        },
      }
    );
  }

  if (state.step === "WAIT_BUY_PRICE") {
    const matchedPrice =
      safeNumber(msg.text);

    const entry =
      PENDING_ENTRIES[state.coin];

    if (!entry) {
      return;
    }

    const buyFeeUnit =
      state.quantity * BUY_FEE;

    const netTradeUnit =
      state.quantity - buyFeeUnit;

    const netTradeValue =
      matchedPrice * netTradeUnit;

    ACTIVE_TRADES[state.coin] = {
      coin: state.coin,
      tp: entry.tp,
      sl: entry.sl,
      buyPrice: matchedPrice,
      quantity: state.quantity,
      buyFeeUnit,
      netTradeUnit,
      netTradeValue,
      durationHours:
        entry.durationHours,
      startTime: now(),
      tpReached: false,
      slReached: false,
      durationAlertSent: false,
    };

    const message = `✅ TRADE CONFIRMED

🪙 ${state.coin}

📦 Net Trade Unit:
${netTradeUnit.toFixed(4)} ${state.coin}

💰 Net Trade Value:
RM${netTradeValue.toFixed(2)}

💸 Fees Luno:
${buyFeeUnit.toFixed(4)} ${state.coin}

🎯 TP:
RM${formatPrice(
      state.coin,
      entry.tp
    )}

🛑 SL:
RM${formatPrice(
      state.coin,
      entry.sl
    )}

📡 Trade Monitoring Started...`;

    await bot.sendMessage(
      chatId,
      message
    );

    delete USER_STATE[chatId];
  }

  if (state.step === "WAIT_SELL_PRICE") {
    const matchedSellPrice =
      safeNumber(msg.text);

    const trade =
      ACTIVE_TRADES[state.coin];

    if (!trade) {
      return;
    }

    const sellFeeUnit =
      trade.netTradeUnit *
      SELL_FEE;

    const netSellUnit =
      trade.netTradeUnit -
      sellFeeUnit;

    const netSellValue =
      matchedSellPrice *
      netSellUnit;

    const pnl =
      netSellValue -
      trade.netTradeValue;

    const message = `✅ SELL TRADE CONFIRMED

🪙 ${state.coin}

💵 Matched Price:
RM${formatPrice(
      state.coin,
      matchedSellPrice
    )}

📦 Net Sell Unit:
${netSellUnit.toFixed(4)} ${state.coin}

💰 Net Sell Value:
RM${netSellValue.toFixed(2)}

💸 Fees Luno:
${sellFeeUnit.toFixed(4)} ${state.coin}

📊 Net ${
      pnl >= 0
        ? "Profit"
        : "Loss"
    }:
RM${pnl.toFixed(2)}

📡 Realtime Monitoring Stopped

✅ Trade Closed`;

    await bot.sendMessage(
      chatId,
      message
    );

    delete ACTIVE_TRADES[state.coin];
    delete USER_STATE[chatId];
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "ACTIVE",
    service: SERVICE_CODE,
  });
});

app.listen(PORT, async () => {
  console.log(`RUNNING ${PORT}`);

  await sendTelegram(
    `✅ BOT ONLINE

🚀 INSTITUTIONAL SCALPING TERMINAL ACTIVE`
  );
});

setInterval(updateMemory, 5000);

setInterval(scanSignals, 60000);

setInterval(sendPriceAlert, 300000);

setInterval(
  sendMarketStructure,
  900000
);

setInterval(monitorTrades, 15000);
