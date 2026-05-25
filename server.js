// =====================================
// FINAL ADVANCED AI SCALPING ECOSYSTEM
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

const LAST_ALERT = {};
const LAST_PRICE = {};

const CANDLE_MEMORY = {};

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
    return safeNumber(value)
      .toFixed(2);
  }

  return safeNumber(value)
    .toFixed(4);
}

function formatUnit(
  coin,
  value
) {
  if (coin === "BTC") {
    return safeNumber(value)
      .toFixed(6);
  }

  return safeNumber(value)
    .toFixed(0);
}

function cooldown(
  key,
  seconds
) {
  if (!LAST_ALERT[key]) {
    LAST_ALERT[key] = now();
    return true;
  }

  if (
    now() - LAST_ALERT[key] >
    seconds * 1000
  ) {
    LAST_ALERT[key] = now();
    return true;
  }

  return false;
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
    console.log(err.message);
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
    const [ticker, orderbook] =
      await Promise.all([
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

    CANDLE_MEMORY[coin].push(
      currentPrice
    );

    if (
      CANDLE_MEMORY[coin]
        .length > 50
    ) {
      CANDLE_MEMORY[coin].shift();
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
// ADVANCED FILTERS
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
// MARKET REGIME
// =====================================

function detectMarketRegime(
  data
) {
  if (
    data.spreadPercent >
    0.004
  ) {
    return "VOLATILE";
  }

  if (data.pressure > 1.2) {
    return "TRENDING";
  }

  return "RANGING";
}

// =====================================
// MARKET STRUCTURE
// =====================================

function detectStructure(
  coin
) {
  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 10
  ) {
    return null;
  }

  const recent =
    prices.slice(-10);

  const first =
    recent[0];

  const last =
    recent[
      recent.length - 1
    ];

  const move =
    (last - first) / first;

  let structure =
    "RANGING";

  if (move > 0.015) {
    structure =
      "BULLISH";
  }

  if (move < -0.015) {
    structure =
      "BEARISH";
  }

  return {
    structure,
    momentum:
      Math.abs(move),
  };
}

// =====================================
// AI SCORE ENGINE
// =====================================

async function validateSignal(
  coin,
  data
) {
  let score = 0;

  if (data.pressure > 1.1) {
    score += 15;
  }

  if (data.pressure > 1.3) {
    score += 15;
  }

  if (
    data.spreadPercent <
    0.0015
  ) {
    score += 10;
  }

  if (
    data.supportVolume >
    data.resistanceVolume
  ) {
    score += 15;
  }

  if (
    candleConfirmation(
      data
    )
  ) {
    score += 10;
  }

  if (
    momentumFilter(
      coin
    )
  ) {
    score += 10;
  }

  if (
    microTrendFilter(
      coin
    )
  ) {
    score += 10;
  }

  if (
    volumeSpikeFilter(
      data
    )
  ) {
    score += 10;
  }

  if (
    retestFilter(data)
  ) {
    score += 10;
  }

  if (
    emaFilter(coin)
  ) {
    score += 10;
  }

  if (
    rsiFilter(coin)
  ) {
    score += 10;
  }

  return score;
}

// =====================================
// LIVE PRICE ALERT
// =====================================

async function sendPriceAlert() {

  let message =
`📡 <b>LIVE MARKET UPDATE</b>`;

  for (const coin of Object.keys(COINS)) {

    const ticker =
      await getTicker(coin);

    if (!ticker) {
      continue;
    }

    const price =
      safeNumber(
        ticker.last_trade
      );

    let emoji = "➖";

    if (LAST_PRICE[coin]) {

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

${emoji} ${coin}

💵 Price
RM${formatPrice(
      coin,
      price
    )}`;
  }

  await sendTelegram(
    message
  );
}

// =====================================
// LIVE MARKET STRUCTURE
// =====================================

async function sendMarketStructure() {

  for (const coin of Object.keys(COINS)) {

    const data =
      await getMarketData(
        coin
      );

    if (!data) {
      continue;
    }

    const structure =
      detectStructure(
        coin
      );

    if (!structure) {
      continue;
    }

    const regime =
      detectMarketRegime(
        data
      );

    await sendTelegram(`
📡 <b>LIVE MARKET STRUCTURE</b>

🪙 ${coin}

📊 Structure
${structure.structure}

⚡ Momentum
${(
      structure.momentum *
      100
    ).toFixed(2)}%

📡 Market Regime
${regime}

📈 EMA Trend
${emaFilter(coin)
        ? "BULLISH"
        : "WEAK"}

📉 RSI Condition
${rsiFilter(coin)
        ? "HEALTHY"
        : "EXTREME"}

💵 Current Price
RM${formatPrice(
      coin,
      data.currentPrice
    )}

🟢 Support
RM${formatPrice(
      coin,
      data.supportPrice
    )}

🔴 Resistance
RM${formatPrice(
      coin,
      data.resistancePrice
    )}

📊 Pressure
${data.pressure.toFixed(
      2
    )}
`);
  }
}

// =====================================
// SCALPING SIGNAL
// =====================================

async function sendScalpSignal(
  coin,
  data
) {

  const score =
    await validateSignal(
      coin,
      data
    );

  if (
    score < MIN_SCORE
  ) {
    return;
  }

  const regime =
    detectMarketRegime(
      data
    );

  const tpMultiplier =
    score >= 90
      ? 1.05
      : score >= 80
      ? 1.03
      : 1.02;

  const tp =
    data.currentPrice *
    tpMultiplier;

  const sl =
    data.supportPrice *
    0.995;

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

💵 Current Price
RM${formatPrice(
  coin,
  data.currentPrice
)}

📌 Suggested Entry
RM${formatPrice(
  coin,
  data.bestAsk
)}

📈 Take Profit
RM${formatPrice(
  coin,
  tp
)}

🛑 Stop Loss
RM${formatPrice(
  coin,
  sl
)}

🟢 Strong Support
RM${formatPrice(
  coin,
  data.supportPrice
)}

🔴 Resistance
RM${formatPrice(
  coin,
  data.resistancePrice
)}

📊 Buy Pressure
${data.pressure.toFixed(
  2
)}

🧠 AI Score
${score}%

📡 Market Regime
${regime}

⌛ Signal Expiry
30 Minutes
`,
{
  reply_markup: {
    inline_keyboard: [
      [
        {
          text:
            "✅ START ENTRY",

          callback_data:
            `entry_${id}`,
        },
      ],
    ],
  },
}
  );
}

// =====================================
// SIGNAL ENGINE
// =====================================

async function smartSignalEngine() {

  for (const coin of Object.keys(COINS)) {

    const hasActiveTrade =
      Object.values(
        ACTIVE_TRADES
      ).some(
        (trade) =>
          trade.coin ===
            coin &&
          (
            trade.status ===
              "ACTIVE" ||
            trade.status ===
              "PENDING" ||
            trade.status ===
              "WAIT_EXIT"
          )
      );

    if (hasActiveTrade) {
      continue;
    }

    const data =
      await getMarketData(
        coin
      );

    if (!data) {
      continue;
    }

    if (
      data.trend ===
      "BULLISH"
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

    const data =
      query.data;

    const userId =
      query.from.id;

    // ENTRY

    if (
      data.startsWith(
        "entry_"
      )
    ) {

      const id =
        data.substring(
          data.indexOf(
            "_"
          ) + 1
        );

      const signal =
        PENDING_SIGNALS[
          id
        ];

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

      USER_FLOW[userId] =
        {
          step:
            "WAIT_TARGET",

          signal,
        };

      await sendTelegram(
        "💸 Enter target profit RM:"
      );
    }

    // BUY

    else if (
      data.startsWith(
        "buy_"
      )
    ) {

      const id =
        data.substring(
          data.indexOf(
            "_"
          ) + 1
        );

      USER_FLOW[userId] =
        {
          step:
            "WAIT_MATCHED_BUY",

          tradeId: id,
        };

      await sendTelegram(
        "📌 Enter matched buy price:"
      );
    }

    // CANCEL

    else if (
      data.startsWith(
        "cancel_"
      )
    ) {

      const id =
        data.substring(
          data.indexOf(
            "_"
          ) + 1
        );

      delete ACTIVE_TRADES[
        id
      ];

      delete USER_FLOW[
        userId
      ];

      await sendTelegram(`
❌ TRADE CANCELLED

🛑 Monitoring stopped.
`);
    }

    // SELL

    else if (
      data.startsWith(
        "sell_"
      )
    ) {

      const id =
        data.substring(
          data.indexOf(
            "_"
          ) + 1
        );

      USER_FLOW[userId] =
        {
          step:
            "WAIT_MATCHED_SELL",

          tradeId: id,
        };

      await sendTelegram(
        "📌 Enter matched sell price:"
      );
    }

    // HOLD

    else if (
      data.startsWith(
        "hold_"
      )
    ) {

      const id =
        data.substring(
          data.indexOf(
            "_"
          ) + 1
        );

      const trade =
        ACTIVE_TRADES[
          id
        ];

      if (!trade) {
        return;
      }

      trade.status =
        "ACTIVE";

      trade.exitTriggeredAt =
        null;

      await sendTelegram(`
🟢 HOLD ACTIVE

🪙 ${trade.coin}

📡 Monitoring resumed.
`);
    }
  }
);

// =====================================
// MESSAGE FLOW
// =====================================

bot.on(
  "message",
  async (msg) => {

    const userId =
      msg.from.id;

    const text =
      msg.text;

    if (
      !USER_FLOW[userId]
    ) {
      return;
    }

    const flow =
      USER_FLOW[userId];

    // TARGET

    if (
      flow.step ===
      "WAIT_TARGET"
    ) {

      const targetProfit =
        safeNumber(text);

      if (
        targetProfit <= 0
      ) {
        return;
      }

      const signal =
        flow.signal;

      const diff =
        signal.tp -
        signal.entry;

      let quantity =
        targetProfit /
        diff;

      quantity =
        quantity *
        1.15;

      const estimatedBuy =
        quantity *
        signal.entry;

      const estimatedSell =
        quantity *
        signal.tp;

      const pnl =
        estimatedSell -
        estimatedBuy -
        estimatedBuy *
          BUY_FEE -
        estimatedSell *
          SELL_FEE;

      const id =
        tradeId();

      ACTIVE_TRADES[id] = {

        id,

        coin:
          signal.coin,

        quantity,

        entryPrice:
          signal.entry,

        tp:
          signal.tp,

        sl:
          signal.sl,

        status:
          "PENDING",

        partialTaken:
          false,

        createdAt:
          now(),
      };

      await bot.sendMessage(
        CHAT_ID,

`
${SERVICE_CODE}

📊 <b>SUGGESTED BUY</b>

🪙 ${signal.coin}

📦 Quantity
${formatUnit(
  signal.coin,
  quantity
)}

💰 Estimated Buy
RM${estimatedBuy.toFixed(
  2
)}

💵 Estimated Sell
RM${estimatedSell.toFixed(
  2
)}

🔥 Estimated PNL
RM${pnl.toFixed(2)}
`,

{
  parse_mode:
    "HTML",

  reply_markup: {
    inline_keyboard:
      [
        [
          {
            text:
              "✅ BUY",

            callback_data:
              `buy_${id}`,
          },

          {
            text:
              "❌ NO",

            callback_data:
              `cancel_${id}`,
          },
        ],
      ],
  },
}

      );

      delete USER_FLOW[
        userId
      ];
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

      trade.status =
        "ACTIVE";

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

      delete USER_FLOW[
        userId
      ];
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
        sellPrice *
        trade.quantity;

      const buyValue =
        trade.entryPrice *
        trade.quantity;

      const pnl =
        saleValue -
        buyValue -
        buyValue *
          BUY_FEE -
        saleValue *
          SELL_FEE;

      TRADE_JOURNAL.push({

        coin:
          trade.coin,

        pnl,

        createdAt:
          new Date(),
      });

      await sendTelegram(`
✅ <b>TRADE CLOSED</b>

🪙 ${trade.coin}

💰 Sale Value
RM${saleValue.toFixed(
        2
      )}

🔥 Final PNL
RM${pnl.toFixed(2)}
`);

      delete ACTIVE_TRADES[
        flow.tradeId
      ];

      delete USER_FLOW[
        userId
      ];
    }
  }
);

// =====================================
// TRADE MONITOR
// =====================================

async function monitorTrades() {

  for (const id of Object.keys(
    ACTIVE_TRADES
  )) {

    const trade =
      ACTIVE_TRADES[id];

    if (
      trade.status !==
      "ACTIVE"
    ) {
      continue;
    }

    const ticker =
      await getTicker(
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
        currentPrice *
        0.985;

      if (
        newSL > trade.sl
      ) {

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
        trade.entryPrice *
          1.03
    ) {

      trade.partialTaken =
        true;

      await sendTelegram(`
💰 PARTIAL TAKE PROFIT

🪙 ${trade.coin}

50% secured.
`);
    }

    // TP

    if (
      currentPrice >=
      trade.tp
    ) {

      trade.status =
        "WAIT_EXIT";

      trade.exitTriggeredAt =
        now();

      await sendTelegram(
`
🚀 <b>SELL NOW</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
  trade.coin,
  currentPrice
)}

📈 TP Reached
`,
{
  reply_markup: {
    inline_keyboard:
      [
        [
          {
            text:
              "✅ CONFIRM SELL",

            callback_data:
              `sell_${id}`,
          },

          {
            text:
              "❌ HOLD",

            callback_data:
              `hold_${id}`,
          },
        ],
      ],
  },
}
      );
    }

    // SL

    if (
      currentPrice <=
      trade.sl
    ) {

      trade.status =
        "WAIT_EXIT";

      trade.exitTriggeredAt =
        now();

      await sendTelegram(
`
🛑 <b>CUTLOSS NOW</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
  trade.coin,
  currentPrice
)}

⚠️ Stop loss triggered.
`,
{
  reply_markup: {
    inline_keyboard:
      [
        [
          {
            text:
              "✅ CONFIRM CUTLOSS",

            callback_data:
              `sell_${id}`,
          },

          {
            text:
              "❌ HOLD",

            callback_data:
              `hold_${id}`,
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

  for (const id of Object.keys(
    PENDING_SIGNALS
  )) {

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
  }

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

      trade.status =
        "ACTIVE";

      trade.exitTriggeredAt =
        null;
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

    status:
      "ACTIVE",

    service:
      SERVICE_CODE,

    activeTrades:
      Object.keys(
        ACTIVE_TRADES
      ).length,
  });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, async () => {

  console.log(
    `SERVER RUNNING ${PORT}`
  );

  console.log(
    `SERVICE ${SERVICE_CODE}`
  );

  await sendTelegram(`
✅ BOT ONLINE

🚀 FINAL ADVANCED AI SCALPING TERMINAL ACTIVE
`);

  await sendPriceAlert();

  setInterval(
    sendPriceAlert,
    300000
  );

  setInterval(
    smartSignalEngine,
    120000
  );

  setInterval(
    monitorTrades,
    MONITOR_INTERVAL
  );

  setInterval(
    cleanup,
    60000
  );

  setInterval(
    sendDailyReport,
    24 *
      60 *
      60 *
      1000
  );

  setInterval(
    sendMarketStructure,
    15 *
      60 *
      1000
  );
});
