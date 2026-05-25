require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================
// TELEGRAM
// =====================================

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.log("Missing BOT_TOKEN / CHAT_ID");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
  polling: true,
});

// =====================================
// CONFIG
// =====================================

const COINS = {
  BTC: "XBTMYR",
  GRT: "GRTMYR",
};

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

const SIGNAL_EXPIRY = 30 * 60 * 1000;
const EXIT_EXPIRY = 15 * 60 * 1000;
const MONITOR_INTERVAL = 10000;

const MIN_SCORE = 70;

// =====================================
// MEMORY
// =====================================

const PENDING_SIGNALS = {};
const ACTIVE_TRADES = {};
const USER_FLOW = {};
const TRADE_JOURNAL = [];
const LAST_ALERT = {};
const LAST_PRICE = {};

// =====================================
// HELPERS
// =====================================

function now() {
  return Date.now();
}

function safeNumber(value) {
  if (isNaN(value) || !isFinite(value)) {
    return 0;
  }

  return Number(value);
}

function signalId() {
  return `SIG_${Date.now()}`;
}

function tradeId() {
  return `TRD_${Date.now()}`;
}

function formatPrice(coin, value) {
  if (coin === "BTC") {
    return safeNumber(value).toFixed(2);
  }

  return safeNumber(value).toFixed(4);
}

function formatUnit(coin, value) {
  if (coin === "BTC") {
    return safeNumber(value).toFixed(6);
  }

  return safeNumber(value).toFixed(0);
}

function cooldown(key, seconds) {
  if (!LAST_ALERT[key]) {
    LAST_ALERT[key] = now();
    return true;
  }

  if (now() - LAST_ALERT[key] > seconds * 1000) {
    LAST_ALERT[key] = now();
    return true;
  }

  return false;
}

async function sendTelegram(message, options = {}) {
  try {
    await bot.sendMessage(CHAT_ID, message, {
      parse_mode: "HTML",
      ...options,
    });
  } catch (err) {
    console.log(err.message);
  }
}

// =====================================
// API
// =====================================

async function getTicker(coin) {
  try {
    const response = await axios.get(
      `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`
    );

    return response.data;
  } catch (err) {
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
    return null;
  }
}

// =====================================
// MARKET ENGINE
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

    const currentPrice = safeNumber(
      ticker.last_trade
    );

    const bids = orderbook.bids || [];
    const asks = orderbook.asks || [];

    if (!bids.length || !asks.length) {
      return null;
    }

    const bestBid = safeNumber(
      bids[0].price
    );

    const bestAsk = safeNumber(
      asks[0].price
    );

    const spread = bestAsk - bestBid;

    const spreadPercent =
      spread / currentPrice;

    // SUPPORT

    const supportZone = bids.filter(
      (bid) => {
        const price = safeNumber(
          bid.price
        );

        return (
          price < currentPrice &&
          price > currentPrice * 0.97
        );
      }
    );

    // RESISTANCE

    const resistanceZone = asks.filter(
      (ask) => {
        const price = safeNumber(
          ask.price
        );

        return (
          price > currentPrice &&
          price < currentPrice * 1.03
        );
      }
    );

    if (
      !supportZone.length ||
      !resistanceZone.length
    ) {
      return null;
    }

    const strongestSupport =
      supportZone.reduce((a, b) => {
        return safeNumber(a.volume) >
          safeNumber(b.volume)
          ? a
          : b;
      });

    const strongestResistance =
      resistanceZone.reduce((a, b) => {
        return safeNumber(a.volume) >
          safeNumber(b.volume)
          ? a
          : b;
      });

    let buyVolume = 0;
    let sellVolume = 0;

    for (const bid of supportZone) {
      buyVolume += safeNumber(
        bid.volume
      );
    }

    for (const ask of resistanceZone) {
      sellVolume += safeNumber(
        ask.volume
      );
    }

    const pressure =
      buyVolume / (sellVolume || 1);

    let trend = "SIDEWAYS";

    if (pressure > 1.15) {
      trend = "BULLISH";
    }

    if (pressure < 0.85) {
      trend = "BEARISH";
    }

    return {
      currentPrice,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      pressure,
      trend,

      supportPrice: safeNumber(
        strongestSupport.price
      ),

      resistancePrice: safeNumber(
        strongestResistance.price
      ),

      supportVolume: safeNumber(
        strongestSupport.volume
      ),

      resistanceVolume: safeNumber(
        strongestResistance.volume
      ),
    };
  } catch (err) {
    return null;
  }
}

// =====================================
// SCORE ENGINE
// =====================================

function calculateScore(data) {
  let score = 0;

  if (data.pressure > 1.1) {
    score += 20;
  }

  if (data.pressure > 1.3) {
    score += 10;
  }

  if (data.spreadPercent < 0.0015) {
    score += 20;
  }

  if (
    data.supportVolume >
    data.resistanceVolume
  ) {
    score += 20;
  }

  const tpSpace =
    (data.resistancePrice -
      data.currentPrice) /
    data.currentPrice;

  if (tpSpace > 0.015) {
    score += 20;
  }

  if (data.trend === "BULLISH") {
    score += 10;
  }

  if (data.supportVolume > 100000) {
    score += 10;
  }

  if (score > 100) {
    score = 100;
  }

  return score;
}

function getSetup(score) {
  if (score >= 90) {
    return "🔥 ELITE SETUP";
  }

  if (score >= 80) {
    return "✅ STRONG SETUP";
  }

  return "⚠️ MODERATE SETUP";
}

// =====================================
// MARKET REGIME
// =====================================

function detectMarketRegime(data) {
  if (data.spreadPercent > 0.004) {
    return "VOLATILE";
  }

  if (data.pressure > 1.2) {
    return "TRENDING";
  }

  return "RANGING";
}

function detectFakeBreakout(data) {
  if (data.pressure < 1) {
    return true;
  }

  if (data.spreadPercent > 0.004) {
    return true;
  }

  return false;
}

// =====================================
// PRICE ALERTS
// =====================================

async function sendPriceAlert() {
  let message =
    "📡 <b>PRICE UPDATE</b>\n";

  for (const coin of Object.keys(
    COINS
  )) {
    const ticker = await getTicker(
      coin
    );

    if (!ticker) {
      continue;
    }

    const price = safeNumber(
      ticker.last_trade
    );

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

    message += `

${emoji} ${coin}
RM${formatPrice(coin, price)}
`;
  }

  await sendTelegram(message);
}

// =====================================
// EVENT ENGINE
// =====================================

async function marketEventEngine() {
  for (const coin of Object.keys(
    COINS
  )) {
    const data = await getMarketData(
      coin
    );

    if (!data) {
      continue;
    }

    // BREAKOUT

    if (
      data.currentPrice >
        data.resistancePrice &&
      data.pressure > 1.15 &&
      cooldown(`breakout_${coin}`, 600)
    ) {
      await sendTelegram(`
🚀 <b>BREAKOUT DETECTED</b>

🪙 ${coin}

📈 Price
RM${formatPrice(
        coin,
        data.currentPrice
      )}
`);
    }

    // REJECTION

    if (
      data.currentPrice >
        data.resistancePrice * 0.998 &&
      data.pressure < 1 &&
      cooldown(`reject_${coin}`, 600)
    ) {
      await sendTelegram(`
❌ <b>REJECTION DETECTED</b>

🪙 ${coin}

⚠️ Seller defending resistance.
`);
    }

    // WHALE

    if (
      data.supportVolume > 100000 &&
      cooldown(`whale_${coin}`, 1200)
    ) {
      await sendTelegram(`
🐋 <b>WHALE BUY WALL</b>

🪙 ${coin}

📦 Volume
${formatUnit(
        coin,
        data.supportVolume
      )}
`);
    }
  }
}

// =====================================
// SIGNAL ENGINE
// =====================================

async function sendScalpSignal(
  coin,
  data
) {
  if (detectFakeBreakout(data)) {
    return;
  }

  const regime =
    detectMarketRegime(data);

  if (regime === "VOLATILE") {
    return;
  }

  const score = calculateScore(
    data
  );

  if (score < MIN_SCORE) {
    return;
  }

  const tpMultiplier =
    score >= 90
      ? 1.05
      : score >= 80
      ? 1.03
      : 1.02;

  const tp =
    data.currentPrice * tpMultiplier;

  const sl =
    data.supportPrice * 0.995;

  const id = signalId();

  PENDING_SIGNALS[id] = {
    id,
    coin,
    entry: data.bestAsk,
    tp,
    sl,
    used: false,
    createdAt: now(),
  };

  await sendTelegram(
    `
🔄 <b>SCALPING ENTRY</b>

🪙 ${coin}

🧠 Score
${score}%

${getSetup(score)}

📡 Market Regime
${regime}

📌 Entry
RM${formatPrice(
      coin,
      data.bestAsk
    )}

📈 TP
RM${formatPrice(coin, tp)}

🛑 SL
RM${formatPrice(coin, sl)}

⌛ Expiry 30 min
`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ START ENTRY",
              callback_data: `entry_${id}`,
            },
          ],
        ],
      },
    }
  );
}

async function smartSignalEngine() {
  for (const coin of Object.keys(
    COINS
  )) {
    const data = await getMarketData(
      coin
    );

    if (!data) {
      continue;
    }

    if (
      data.trend === "BULLISH" &&
      data.pressure > 1.15 &&
      cooldown(`signal_${coin}`, 120)
    ) {
      await sendScalpSignal(
        coin,
        data
      );
    }
  }
}

// =====================================
// CALLBACK FLOW
// =====================================

bot.on(
  "callback_query",
  async (query) => {
    const data = query.data;
    const userId = query.from.id;

    // ENTRY

    if (data.startsWith("entry_")) {
      const id = data.split("_")[1];

      const signal =
        PENDING_SIGNALS[id];

      if (!signal) {
        await sendTelegram(
          "❌ Signal expired"
        );

        return;
      }

      if (signal.used) {
        await sendTelegram(
          "⚠️ Signal already used"
        );

        return;
      }

      signal.used = true;

      USER_FLOW[userId] = {
        step: "WAIT_TARGET",
        signal,
      };

      await sendTelegram(
        "💸 Enter target profit RM:"
      );
    }

    // CONFIRM BUY

    else if (
      data.startsWith(
        "confirmbuy_"
      )
    ) {
      const id = data.split("_")[1];

      USER_FLOW[userId] = {
        step: "WAIT_MATCHED_BUY",
        tradeId: id,
      };

      await sendTelegram(
        "📌 Enter matched buy price:"
      );
    }

    // SELL

    else if (
      data.startsWith("sell_")
    ) {
      const id = data.split("_")[1];

      USER_FLOW[userId] = {
        step: "WAIT_MATCHED_SELL",
        tradeId: id,
      };

      await sendTelegram(
        "📌 Enter matched sell price:"
      );
    }

    // HOLD

    else if (
      data.startsWith("hold_")
    ) {
      const id = data.split("_")[1];

      const trade =
        ACTIVE_TRADES[id];

      if (!trade) {
        return;
      }

      trade.status = "ACTIVE";

      trade.exitTriggeredAt = null;

      await sendTelegram(`
🟢 HOLD ACTIVE

🪙 ${trade.coin}

👀 Monitoring resumed.
`);
    }
  }
);

// =====================================
// MESSAGE FLOW
// =====================================

bot.on("message", async (msg) => {
  const userId = msg.from.id;
  const text = msg.text;

  if (!USER_FLOW[userId]) {
    return;
  }

  const flow = USER_FLOW[userId];

  // TARGET PROFIT

  if (flow.step === "WAIT_TARGET") {
    const targetProfit =
      safeNumber(text);

    if (targetProfit <= 0) {
      await sendTelegram(
        "❌ Invalid target profit"
      );

      return;
    }

    const signal = flow.signal;

    const diff =
      signal.tp - signal.entry;

    if (diff <= 0) {
      await sendTelegram(
        "❌ Invalid TP setup"
      );

      return;
    }

    let quantity =
      targetProfit / diff;

    quantity = quantity * 1.15;

    const estimatedBuy =
      quantity * signal.entry;

    const estimatedSell =
      quantity * signal.tp;

    const pnl =
      estimatedSell -
      estimatedBuy -
      estimatedBuy * BUY_FEE -
      estimatedSell * SELL_FEE;

    const id = tradeId();

    ACTIVE_TRADES[id] = {
      id,
      coin: signal.coin,
      quantity,
      entryPrice: signal.entry,
      tp: signal.tp,
      sl: signal.sl,
      status: "PENDING",
      partialTaken: false,
      createdAt: now(),
    };

    USER_FLOW[userId] = {
      step: "WAIT_MATCHED_BUY",
      tradeId: id,
    };

    await sendTelegram(
      `
📊 <b>SUGGESTED BUY</b>

🪙 ${signal.coin}

📦 Quantity
${formatUnit(
        signal.coin,
        quantity
      )}

💰 Estimated Buy
RM${estimatedBuy.toFixed(2)}

💵 Estimated Sell
RM${estimatedSell.toFixed(2)}

🔥 Estimated PNL
RM${pnl.toFixed(2)}
`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ CONFIRM BUY",
                callback_data: `confirmbuy_${id}`,
              },
            ],
          ],
        },
      }
    );
  }

  // MATCHED BUY

  else if (
    flow.step ===
    "WAIT_MATCHED_BUY"
  ) {
    const trade =
      ACTIVE_TRADES[
        flow.tradeId
      ];

    if (!trade) {
      return;
    }

    trade.entryPrice =
      safeNumber(text);

    trade.status = "ACTIVE";

    await sendTelegram(`
✅ <b>TRADE ACTIVE</b>

🪙 ${trade.coin}

📌 Entry
RM${formatPrice(
      trade.coin,
      trade.entryPrice
    )}

📈 TP
RM${formatPrice(
      trade.coin,
      trade.tp
    )}

🛑 SL
RM${formatPrice(
      trade.coin,
      trade.sl
    )}
`);

    delete USER_FLOW[userId];
  }

  // MATCHED SELL

  else if (
    flow.step ===
    "WAIT_MATCHED_SELL"
  ) {
    const trade =
      ACTIVE_TRADES[
        flow.tradeId
      ];

    if (!trade) {
      return;
    }

    const sellPrice =
      safeNumber(text);

    const saleValue =
      sellPrice * trade.quantity;

    const buyValue =
      trade.entryPrice *
      trade.quantity;

    const pnl =
      saleValue -
      buyValue -
      buyValue * BUY_FEE -
      saleValue * SELL_FEE;

    TRADE_JOURNAL.push({
      coin: trade.coin,
      pnl,
      createdAt: new Date(),
    });

    await sendTelegram(`
✅ <b>TRADE CLOSED</b>

🪙 ${trade.coin}

💰 Sale Value
RM${saleValue.toFixed(2)}

🔥 Final PNL
RM${pnl.toFixed(2)}
`);

    delete ACTIVE_TRADES[
      flow.tradeId
    ];

    delete USER_FLOW[userId];
  }
});

// =====================================
// TRADE MONITOR
// =====================================

async function monitorTrades() {
  for (const id of Object.keys(
    ACTIVE_TRADES
  )) {
    const trade =
      ACTIVE_TRADES[id];

    if (trade.status !== "ACTIVE") {
      continue;
    }

    const ticker = await getTicker(
      trade.coin
    );

    if (!ticker) {
      continue;
    }

    const currentPrice =
      safeNumber(
        ticker.last_trade
      );

    // TRAILING STOP

    const move =
      (currentPrice -
        trade.entryPrice) /
      trade.entryPrice;

    if (move > 0.03) {
      const newSL =
        currentPrice * 0.985;

      if (newSL > trade.sl) {
        trade.sl = newSL;

        await sendTelegram(`
📈 TRAILING STOP UPDATED

🪙 ${trade.coin}

🛑 New SL
RM${formatPrice(
          trade.coin,
          newSL
        )}
`);
      }
    }

    // PARTIAL TP

    if (
      !trade.partialTaken &&
      currentPrice >=
        trade.entryPrice * 1.03
    ) {
      trade.partialTaken = true;

      await sendTelegram(`
💰 PARTIAL TAKE PROFIT

🪙 ${trade.coin}

50% secured.
`);
    }

    // TAKE PROFIT

    if (currentPrice >= trade.tp) {
      trade.status = "WAIT_EXIT";

      trade.exitTriggeredAt = now();

      await sendTelegram(
        `
🚀 <b>SELL NOW</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
          trade.coin,
          currentPrice
        )}
`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ CONFIRM SELL",
                  callback_data: `sell_${id}`,
                },

                {
                  text: "❌ HOLD",
                  callback_data: `hold_${id}`,
                },
              ],
            ],
          },
        }
      );
    }

    // STOP LOSS

    if (currentPrice <= trade.sl) {
      trade.status = "WAIT_EXIT";

      trade.exitTriggeredAt = now();

      await sendTelegram(
        `
🛑 <b>CUTLOSS NOW</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
          trade.coin,
          currentPrice
        )}
`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "✅ CONFIRM CUTLOSS",

                  callback_data: `sell_${id}`,
                },

                {
                  text: "❌ HOLD",
                  callback_data: `hold_${id}`,
                },
              ],
            ],
          },
        }
      );
    }
  }
}

// =====================================
// CLEANUP
// =====================================

function cleanup() {
  // SIGNAL CLEANUP

  for (const id of Object.keys(
    PENDING_SIGNALS
  )) {
    const signal =
      PENDING_SIGNALS[id];

    if (
      now() - signal.createdAt >
      SIGNAL_EXPIRY
    ) {
      delete PENDING_SIGNALS[id];
    }
  }

  // EXIT CLEANUP

  for (const id of Object.keys(
    ACTIVE_TRADES
  )) {
    const trade =
      ACTIVE_TRADES[id];

    if (
      trade.status ===
        "WAIT_EXIT" &&
      trade.exitTriggeredAt &&
      now() -
        trade.exitTriggeredAt >
        EXIT_EXPIRY
    ) {
      trade.status = "ACTIVE";

      trade.exitTriggeredAt = null;
    }
  }
}

// =====================================
// DAILY REPORT
// =====================================

async function sendDailyReport() {
  let pnl = 0;
  let wins = 0;
  let losses = 0;

  for (const trade of TRADE_JOURNAL) {
    pnl += trade.pnl;

    if (trade.pnl > 0) {
      wins++;
    } else {
      losses++;
    }
  }

  await sendTelegram(`
📊 <b>DAILY REPORT</b>

📦 Trades
${TRADE_JOURNAL.length}

✅ Wins
${wins}

❌ Losses
${losses}

💰 Total PNL
RM${pnl.toFixed(2)}
`);
}

// =====================================
// EXPRESS
// =====================================

app.get("/", (req, res) => {
  res.json({
    status: "ACTIVE",

    activeTrades:
      Object.keys(ACTIVE_TRADES)
        .length,

    pendingSignals:
      Object.keys(PENDING_SIGNALS)
        .length,
  });
});

// =====================================
// START
// =====================================

app.listen(PORT, async () => {
  console.log(
    `SERVER RUNNING ${PORT}`
  );

  await sendTelegram(`
✅ BOT ONLINE

🚀 SMART SCALPING TERMINAL ACTIVE
`);

  await sendPriceAlert();

  setInterval(
    sendPriceAlert,
    300000
  );

  setInterval(
    marketEventEngine,
    120000
  );

  setInterval(
    smartSignalEngine,
    120000
  );

  setInterval(
    monitorTrades,
    MONITOR_INTERVAL
  );

  setInterval(cleanup, 60000);

  setInterval(
    sendDailyReport,
    24 * 60 * 60 * 1000
  );
});
