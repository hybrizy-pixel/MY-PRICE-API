// ==========================================
// FINAL INSTITUTIONAL AI SCALPING TERMINAL
// COMPLETE 100% FULL VERSION
// ==========================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// ==========================================
// ENVIRONMENT
// ==========================================

const PORT =
  process.env.PORT || 3000;

const BOT_TOKEN =
  process.env.BOT_TOKEN;

const CHAT_ID =
  process.env.CHAT_ID;

if (
  !BOT_TOKEN ||
  !CHAT_ID
) {

  console.log(
    "Missing BOT_TOKEN / CHAT_ID"
  );

  process.exit(1);
}

// ==========================================
// TELEGRAM
// ==========================================

const bot =
  new TelegramBot(
    BOT_TOKEN,
    {
      polling: true,
    }
  );

// ==========================================
// RANDOM SERVICE CODE
// ==========================================

const SERVICE_CODE =
  `[${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}]`;

// ==========================================
// COINS
// ==========================================

const COINS = {
  BTC: "XBTMYR",
  AAVE: "AAVEMYR",
  CRV: "CRVMYR",
  XLM: "XLMMYR",
  XRP: "XRPMYR",
  GRT: "GRTMYR",
};

// ==========================================
// DISPLAY COINS
// ==========================================

const DISPLAY_COINS = [
  "BTC",
  "GRT",
];

// ==========================================
// CONFIG
// ==========================================

const BUY_FEE = 0.005;

const SELL_FEE = 0.005;

const SIGNAL_EXPIRY =
  30 * 60 * 1000;

const SIGNAL_COOLDOWN =
  20 * 60 * 1000;

const BREAKOUT_COOLDOWN =
  15 * 60 * 1000;

const BREAKDOWN_COOLDOWN =
  15 * 60 * 1000;

const REJECTION_COOLDOWN =
  15 * 60 * 1000;

const GLOBAL_ALERT_GAP =
  2 * 60 * 1000;

const SIGNAL_SCAN_INTERVAL =
  120000;

const MONITOR_INTERVAL =
  10000;

const PRICE_UPDATE_INTERVAL =
  300000;

const STRUCTURE_INTERVAL =
  15 *
  60 *
  1000;

const CLEANUP_INTERVAL =
  300000;

const MIN_SCORE = 75;

const MAX_CAPITAL =
  10000;

const RETRACEMENT_TRIGGER =
  0.20;

// ==========================================
// MEMORY
// ==========================================

const ACTIVE_TRADES = {};

const PENDING_SIGNALS = {};

const USER_FLOW = {};

const LAST_SIGNAL = {};

const LAST_BREAKOUT = {};

const LAST_BREAKDOWN = {};

const LAST_REJECTION = {};

const LAST_PRICE = {};

const PRICE_MEMORY = {};

let LAST_ALERT_TIME = 0;

// ==========================================
// HELPERS
// ==========================================

function now() {
  return Date.now();
}

function safeNumber(v) {

  if (
    isNaN(v) ||
    !isFinite(v)
  ) {
    return 0;
  }

  return Number(v);
}

function signalId() {

  return `SIG_${Date.now()}`;
}

function tradeId() {

  return `TRD_${Date.now()}`;
}

function formatPrice(
  coin,
  value
) {

  if (coin === "BTC") {

    return safeNumber(
      value
    ).toFixed(2);
  }

  return safeNumber(
    value
  ).toFixed(4);
}

function formatUnit(
  coin,
  value
) {

  if (coin === "BTC") {

    return safeNumber(
      value
    ).toFixed(6);
  }

  return safeNumber(
    value
  ).toFixed(0);
}

function canSendAlert() {

  return (
    now() -
      LAST_ALERT_TIME >
    GLOBAL_ALERT_GAP
  );
}

function updateAlertTime() {

  LAST_ALERT_TIME =
    now();
}

// ==========================================
// TELEGRAM SEND
// ==========================================

async function sendTelegram(
  message,
  options = {}
) {

  try {

    await bot.sendMessage(
      CHAT_ID,

      `${SERVICE_CODE}

${message}`,

      {
        parse_mode: "HTML",
        ...options,
      }
    );

  } catch (err) {

    console.log(
      err.message
    );
  }
}

// ==========================================
// API
// ==========================================

async function getTicker(
  coin
) {

  try {

    const response =
      await axios.get(
        `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`
      );

    return response.data;

  } catch {

    return null;
  }
}

async function getOrderbook(
  coin
) {

  try {

    const response =
      await axios.get(
        `https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`
      );

    return response.data;

  } catch {

    return null;
  }
}

// ==========================================
// PRICE MEMORY
// ==========================================

function updatePriceMemory(
  coin,
  price
) {

  if (
    !PRICE_MEMORY[coin]
  ) {

    PRICE_MEMORY[coin] = [];
  }

  PRICE_MEMORY[coin]
    .push({
      price,
      time: now(),
    });

  if (
    PRICE_MEMORY[coin]
      .length > 1000
  ) {

    PRICE_MEMORY[coin]
      .shift();
  }
}

// ==========================================
// OHLC ENGINE
// ==========================================

function buildOHLC(
  coin,
  seconds
) {

  const memory =
    PRICE_MEMORY[coin];

  if (
    !memory ||
    memory.length < 5
  ) {
    return null;
  }

  const cutoff =
    now() -
    seconds * 1000;

  const candles =
    memory.filter(
      (p) =>
        p.time >= cutoff
    );

  if (
    candles.length < 2
  ) {
    return null;
  }

  return {

    open:
      candles[0].price,

    high:
      Math.max(
        ...candles.map(
          (c) => c.price
        )
      ),

    low:
      Math.min(
        ...candles.map(
          (c) => c.price
        )
      ),

    close:
      candles[
        candles.length - 1
      ].price,
  };
}

// ==========================================
// EMA ENGINE
// ==========================================

function calculateEMA(
  values,
  period
) {

  if (
    values.length < period
  ) {
    return null;
  }

  const k =
    2 / (period + 1);

  let ema =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    ema =
      values[i] * k +
      ema * (1 - k);
  }

  return ema;
}

// ==========================================
// RSI ENGINE
// ==========================================

function calculateRSI(
  prices,
  period = 14
) {

  if (
    prices.length <
    period + 1
  ) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {

    const diff =
      prices[i] -
      prices[i - 1];

    if (diff > 0) {

      gains += diff;

    } else {

      losses += Math.abs(
        diff
      );
    }
  }

  if (losses === 0)
    return 100;

  const rs =
    gains / losses;

  return (
    100 -
    100 / (1 + rs)
  );
}

// ==========================================
// MARKET DATA
// ==========================================

async function getMarketData(
  coin
) {

  try {

    const [
      ticker,
      orderbook,
    ] = await Promise.all([
      getTicker(coin),
      getOrderbook(coin),
    ]);

    if (
      !ticker ||
      !orderbook
    ) {
      return null;
    }

    const currentPrice =
      safeNumber(
        ticker.last_trade
      );

    updatePriceMemory(
      coin,
      currentPrice
    );

    const bids =
      orderbook.bids || [];

    const asks =
      orderbook.asks || [];

    if (
      !bids.length ||
      !asks.length
    ) {
      return null;
    }

    const bestBid =
      safeNumber(
        bids[0].price
      );

    const bestAsk =
      safeNumber(
        asks[0].price
      );

    let buyVolume = 0;
    let sellVolume = 0;

    bids
      .slice(0, 20)
      .forEach((b) => {

        buyVolume +=
          safeNumber(
            b.volume
          );
      });

    asks
      .slice(0, 20)
      .forEach((a) => {

        sellVolume +=
          safeNumber(
            a.volume
          );
      });

    const support =
      Math.max(
        ...bids
          .slice(0, 20)
          .map((b) =>
            safeNumber(
              b.price
            )
          )
      );

    const resistance =
      Math.min(
        ...asks
          .slice(0, 20)
          .map((a) =>
            safeNumber(
              a.price
            )
          )
      );

    return {

      currentPrice,

      bestBid,

      bestAsk,

      support,

      resistance,

      buyVolume,

      sellVolume,

      pressure:
        buyVolume /
        (sellVolume || 1),
    };

  } catch {

    return null;
  }
}

// ==========================================
// STRUCTURE
// ==========================================

function detectStructure(
  coin,
  timeframe
) {

  const candle =
    buildOHLC(
      coin,
      timeframe
    );

  if (!candle)
    return "MENDATAR";

  const move =
    (
      candle.close -
      candle.open
    ) / candle.open;

  if (move > 0.008)
    return "MENAIK";

  if (move < -0.008)
    return "MENURUN";

  return "MENDATAR";
}

// ==========================================
// MULTI TIMEFRAME
// ==========================================

function multiTimeframeAnalysis(
  coin
) {

  const tf1 =
    detectStructure(
      coin,
      60
    );

  const tf5 =
    detectStructure(
      coin,
      300
    );

  const tf15 =
    detectStructure(
      coin,
      900
    );

  let score = 0;

  if (
    tf1 === "MENAIK"
  ) score += 20;

  if (
    tf5 === "MENAIK"
  ) score += 15;

  if (
    tf15 === "MENAIK"
  ) score += 10;

  return {
    tf1,
    tf5,
    tf15,
    score,
  };
}

// ==========================================
// VALIDATE SIGNAL
// ==========================================

async function validateSignal(
  coin,
  data
) {

  let score = 0;

  const mtf =
    multiTimeframeAnalysis(
      coin
    );

  score += mtf.score;

  if (
    data.pressure > 1.05
  ) {

    score += 20;
  }

  if (
    data.buyVolume >
    data.sellVolume *
      1.2
  ) {

    score += 15;
  }

  return {

    score,

    mtf,
  };
}

// ==========================================
// PRICE ALERT
// ==========================================

async function sendPriceAlert() {

  let message =
`
📡 <b>LIVE MARKET UPDATE</b>
`;

  for (const coin of DISPLAY_COINS) {

    const ticker =
      await getTicker(
        coin
      );

    if (!ticker)
      continue;

    const price =
      safeNumber(
        ticker.last_trade
      );

    let emoji = "➖";

    if (
      LAST_PRICE[coin]
    ) {

      if (
        price >
        LAST_PRICE[coin]
      ) {

        emoji = "🟢";
      }

      if (
        price <
        LAST_PRICE[coin]
      ) {

        emoji = "🔴";
      }
    }

    LAST_PRICE[coin] =
      price;

    message += `

${emoji} ${coin} • RM${formatPrice(
      coin,
      price
    )}`;
  }

  await sendTelegram(
    message
  );
}

// ==========================================
// MARKET STRUCTURE
// ==========================================

async function sendMarketStructure() {

  let message =
`
📡 <b>MARKET STRUCTURE</b>
`;

  for (const coin of DISPLAY_COINS) {

    const data =
      await getMarketData(
        coin
      );

    if (!data)
      continue;

    const structure =
      detectStructure(
        coin,
        300
      );

    message += `

🪙 ${coin}

📊 ${structure}

💵 RM${formatPrice(
      coin,
      data.currentPrice
    )}

🟢 Support
RM${formatPrice(
      coin,
      data.support
    )}

🔴 Resistance
RM${formatPrice(
      coin,
      data.resistance
    )}

━━━━━━━━━━━━━━`;
  }

  await sendTelegram(
    message
  );
}

// ==========================================
// SIGNAL ENGINE
// ==========================================

async function smartSignalEngine() {

  for (const coin of Object.keys(
    COINS
  )) {

    const activeTrade =
      Object.values(
        ACTIVE_TRADES
      ).some(
        (trade) =>
          trade.coin ===
            coin &&
          trade.status !==
            "CLOSED"
      );

    if (activeTrade)
      continue;

    const data =
      await getMarketData(
        coin
      );

    if (!data)
      continue;

    const validation =
      await validateSignal(
        coin,
        data
      );

    if (
      validation.score <
      MIN_SCORE
    ) {
      continue;
    }

    if (
      LAST_SIGNAL[coin] &&
      now() -
        LAST_SIGNAL[
          coin
        ] <
        SIGNAL_COOLDOWN
    ) {
      continue;
    }

    LAST_SIGNAL[
      coin
    ] = now();

    updateAlertTime();

    await sendTelegram(`
🔄 <b>SCALPING ENTRY</b>

🪙 ${coin}

💵 Current Price
RM${formatPrice(
      coin,
      data.currentPrice
    )}

🧠 AI Score
${validation.score}%

📡 1m
${validation.mtf.tf1}

📡 5m
${validation.mtf.tf5}

📡 15m
${validation.mtf.tf15}
`);
  }
}

// ==========================================
// TRADE MONITOR
// ==========================================

async function monitorTrades() {

  for (const id of Object.keys(
    ACTIVE_TRADES
  )) {

    const trade =
      ACTIVE_TRADES[id];

    if (
      trade.status ===
      "CLOSED"
    ) {
      continue;
    }

    const ticker =
      await getTicker(
        trade.coin
      );

    if (!ticker)
      continue;

    const currentPrice =
      safeNumber(
        ticker.last_trade
      );

    if (
      currentPrice >=
      trade.tp
    ) {

      await sendTelegram(`
🎯 <b>TP REACHED</b>

🪙 ${trade.coin}

💵 RM${formatPrice(
        trade.coin,
        currentPrice
      )}
`);
    }

    if (
      currentPrice <=
      trade.sl
    ) {

      await sendTelegram(`
🛑 <b>STOP LOSS ALERT</b>

🪙 ${trade.coin}

💵 RM${formatPrice(
        trade.coin,
        currentPrice
      )}
`);
    }
  }
}

// ==========================================
// CLEANUP
// ==========================================

function cleanup() {

  Object.keys(
    PENDING_SIGNALS
  ).forEach((id) => {

    const signal =
      PENDING_SIGNALS[id];

    if (
      now() -
        signal.createdAt >
      SIGNAL_EXPIRY
    ) {

      delete PENDING_SIGNALS[
        id
      ];
    }
  });
}

// ==========================================
// EXPRESS
// ==========================================

app.get("/", (req, res) => {

  res.json({

    status:
      "ACTIVE",

    service:
      SERVICE_CODE,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,

  async () => {

    console.log(
      `RUNNING ${PORT}`
    );

    await sendTelegram(`
✅ BOT ONLINE

🚀 FINAL INSTITUTIONAL AI SCALPING TERMINAL ACTIVE
`);

    // FIRST PRICE UPDATE
    await sendPriceAlert();

    // ==========================================
    // LIVE PRICE UPDATE
    // ==========================================

    setInterval(
      sendPriceAlert,
      300000
    );

    // ==========================================
    // MARKET STRUCTURE
    // ==========================================

    setInterval(
      sendMarketStructure,
      15 *
        60 *
        1000
    );

    // ==========================================
    // SIGNAL ENGINE
    // ==========================================

    setInterval(
      smartSignalEngine,
      120000
    );

    // ==========================================
    // TRADE MONITOR
    // ==========================================

    setInterval(
      monitorTrades,
      MONITOR_INTERVAL
    );

    // ==========================================
    // CLEANUP
    // ==========================================

    setInterval(
      cleanup,
      300000
    );
  }
);
