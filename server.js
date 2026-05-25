// =====================================
// FINAL ADVANCED AI SCALPING TERMINAL
// =====================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================
// RANDOM SERVICE CODE
// =====================================

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

// =====================================
// TELEGRAM
// =====================================

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TOKEN || !CHAT_ID) {

  console.log(
    "Missing BOT_TOKEN / CHAT_ID"
  );

  process.exit(1);
}

const bot = new TelegramBot(
  TOKEN,
  {
    polling: true,
  }
);

// =====================================
// CONFIG
// =====================================

const COINS = {
  BTC: "XBTMYR",
  GRT: "GRTMYR",
};

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

const SIGNAL_EXPIRY =
  30 * 60 * 1000;

const EXIT_EXPIRY =
  15 * 60 * 1000;

const MONITOR_INTERVAL =
  10000;

const MIN_SCORE = 75;

// =====================================
// MEMORY
// =====================================

const PENDING_SIGNALS = {};

const ACTIVE_TRADES = {};

const USER_FLOW = {};

const TRADE_JOURNAL = [];

const LAST_PRICE = {};

const CANDLE_MEMORY = {};

const BREAKOUT_MEMORY = {};
const BREAKDOWN_MEMORY = {};

// =====================================
// HELPERS
// =====================================

function now() {
  return Date.now();
}

function safeNumber(value) {

  if (
    isNaN(value) ||
    !isFinite(value)
  ) {
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

// =====================================
// API
// =====================================

async function getTicker(
  coin
) {

  try {

    const response =
      await axios.get(
        `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`
      );

    return response.data;

  } catch (err) {

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

  } catch (err) {

    return null;
  }
}

// =====================================
// MARKET ENGINE
// =====================================

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

    if (
      !CANDLE_MEMORY[coin]
    ) {

      CANDLE_MEMORY[coin] = [];
    }

    CANDLE_MEMORY[coin]
      .push(currentPrice);

    if (
      CANDLE_MEMORY[coin]
        .length > 50
    ) {

      CANDLE_MEMORY[coin]
        .shift();
    }

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

    const spread =
      bestAsk - bestBid;

    const spreadPercent =
      spread / currentPrice;

    const supportZone =
      bids.filter((bid) => {

        const price =
          safeNumber(
            bid.price
          );

        return (
          price <
            currentPrice &&
          price >
            currentPrice *
              0.97
        );
      });

    const resistanceZone =
      asks.filter((ask) => {

        const price =
          safeNumber(
            ask.price
          );

        return (
          price >
            currentPrice &&
          price <
            currentPrice *
              1.03
        );
      });

    if (
      !supportZone.length ||
      !resistanceZone.length
    ) {
      return null;
    }

    const strongestSupport =
      supportZone.reduce(
        (a, b) => {

          return safeNumber(
            a.volume
          ) >
            safeNumber(
              b.volume
            )
            ? a
            : b;
        }
      );

    const strongestResistance =
      resistanceZone.reduce(
        (a, b) => {

          return safeNumber(
            a.volume
          ) >
            safeNumber(
              b.volume
            )
            ? a
            : b;
        }
      );

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
      buyVolume /
      (sellVolume || 1);

    let trend =
      "SIDEWAYS";

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

      supportPrice:
        safeNumber(
          strongestSupport.price
        ),

      resistancePrice:
        safeNumber(
          strongestResistance.price
        ),

      supportVolume:
        safeNumber(
          strongestSupport.volume
        ),

      resistanceVolume:
        safeNumber(
          strongestResistance.volume
        ),
    };

  } catch (err) {

    return null;
  }
}

// =====================================
// FILTERS
// =====================================

function emaFilter(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 21
  ) {
    return false;
  }

  const ema9 =
    prices
      .slice(-9)
      .reduce(
        (a, b) => a + b,
        0
      ) / 9;

  const ema21 =
    prices
      .slice(-21)
      .reduce(
        (a, b) => a + b,
        0
      ) / 21;

  return ema9 > ema21;
}

function detectEmaCross(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 21
  ) {
    return "No EMA Cross";
  }

  const ema9 =
    prices
      .slice(-9)
      .reduce(
        (a, b) => a + b,
        0
      ) / 9;

  const ema21 =
    prices
      .slice(-21)
      .reduce(
        (a, b) => a + b,
        0
      ) / 21;

  if (ema9 > ema21) {
    return "EMA9 crossed above EMA21";
  }

  if (ema9 < ema21) {
    return "EMA9 crossed below EMA21";
  }

  return "No EMA Cross";
}

function rsiFilter(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 15
  ) {
    return false;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i < prices.length;
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

  if (losses === 0) {
    return false;
  }

  const rs =
    gains / losses;

  const rsi =
    100 -
    100 / (1 + rs);

  return (
    rsi > 45 &&
    rsi < 72
  );
}

function momentumFilter(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 5
  ) {
    return false;
  }

  return (
    prices[
      prices.length - 1
    ] >
    prices[
      prices.length - 5
    ]
  );
}

function microTrendFilter(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 6
  ) {
    return false;
  }

  let bullish = 0;

  for (
    let i = 1;
    i < prices.length;
    i++
  ) {

    if (
      prices[i] >
      prices[i - 1]
    ) {

      bullish++;
    }
  }

  return bullish >= 4;
}

function volumeSpikeFilter(
  data
) {

  return (
    data.supportVolume >
    data.resistanceVolume *
      1.5
  );
}

function retestFilter(
  data
) {

  const distance =
    Math.abs(
      data.currentPrice -
        data.supportPrice
    ) /
    data.currentPrice;

  return distance < 0.01;
}

function candleConfirmation(
  data
) {

  return (
    data.pressure > 1.1 &&
    data.spreadPercent <
      0.002
  );
}

// =====================================
// BREAKOUT / BREAKDOWN ENGINE
// =====================================

async function detectBreakoutBreakdown(
  coin,
  data
) {

  const emaCross =
    detectEmaCross(
      coin
    );

  // BREAKOUT

  if (
    data.currentPrice >
    data.resistancePrice *
      1.0015
  ) {

    const lastBreakout =
      BREAKOUT_MEMORY[
        coin
      ];

    if (
      !lastBreakout ||
      now() -
        lastBreakout >
        300000
    ) {

      BREAKOUT_MEMORY[
        coin
      ] = now();

      await sendTelegram(`
🚀 <b>BREAKOUT DETECTED</b>

🪙 ${coin}

💵 Current Price
RM${formatPrice(
        coin,
        data.currentPrice
      )}

🔴 Resistance Break
RM${formatPrice(
        coin,
        data.resistancePrice
      )} → RM${formatPrice(
        coin,
        data.currentPrice
      )}

📈 EMA Cross
${emaCross}

📊 Momentum
Bullish Expansion
`);
    }
  }

  // BREAKDOWN

  if (
    data.currentPrice <
    data.supportPrice *
      0.9985
  ) {

    const lastBreakdown =
      BREAKDOWN_MEMORY[
        coin
      ];

    if (
      !lastBreakdown ||
      now() -
        lastBreakdown >
        300000
    ) {

      BREAKDOWN_MEMORY[
        coin
      ] = now();

      await sendTelegram(`
⚠️ <b>BREAKDOWN DETECTED</b>

🪙 ${coin}

💵 Current Price
RM${formatPrice(
        coin,
        data.currentPrice
      )}

🟢 Support Break
RM${formatPrice(
        coin,
        data.supportPrice
      )} → RM${formatPrice(
        coin,
        data.currentPrice
      )}

📉 EMA Cross
${emaCross}

📊 Momentum
Bearish Expansion
`);
    }
  }
}
