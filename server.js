// ==========================================
// FINAL INSTITUTIONAL AI SCALPING TERMINAL
// MULTI COIN + INTERACTIVE + ANTI SPAM
// ==========================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const PORT =
  process.env.PORT || 3000;

// ==========================================
// RANDOM SERVICE CODE
// ==========================================

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

// ==========================================
// TELEGRAM CONFIG
// ==========================================

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

const bot =
  new TelegramBot(
    BOT_TOKEN,
    {
      polling: true,
    }
  );

// ==========================================
// COIN SCANNER
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

const GLOBAL_ALERT_GAP =
  2 * 60 * 1000;

const MONITOR_INTERVAL =
  10000;

const MIN_SCORE = 88;

// ==========================================
// MEMORY
// ==========================================

const ACTIVE_TRADES = {};

const PENDING_SIGNALS = {};

const USER_FLOW = {};

const LAST_SIGNAL = {};

const LAST_BREAKOUT = {};

const LAST_BREAKDOWN = {};

const LAST_PRICE = {};

const CANDLE_MEMORY = {};

let LAST_ALERT_TIME = 0;

// ==========================================
// HELPERS
// ==========================================

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
// API ENGINE
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
// MARKET ENGINE
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

    if (
      !CANDLE_MEMORY[coin]
    ) {

      CANDLE_MEMORY[coin] = [];
    }

    CANDLE_MEMORY[coin]
      .push(currentPrice);

    if (
      CANDLE_MEMORY[coin]
        .length > 60
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

    return {

      currentPrice,

      bestBid,

      bestAsk,

      spreadPercent,

      pressure,

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

  } catch {

    return null;
  }
}

// ==========================================
// MARKET STRUCTURE
// ==========================================

function detectStructure(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 15
  ) {
    return "MENDATAR";
  }

  const first =
    prices[
      prices.length - 15
    ];

  const last =
    prices[
      prices.length - 1
    ];

  const move =
    (last - first) /
    first;

  if (move > 0.015) {
    return "MENAIK";
  }

  if (move < -0.015) {
    return "MENURUN";
  }

  return "MENDATAR";
}

// ==========================================
// MARKET REGIME
// ==========================================

function detectRegime(
  data
) {

  if (
    data.spreadPercent >
    0.004
  ) {
    return "VOLATILE";
  }

  if (
    data.pressure > 1.25
  ) {
    return "TRENDING";
  }

  return "SIDEWAYS";
}

// ==========================================
// FILTER ENGINE
// ==========================================

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

function momentumFilter(
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

  return (
    prices[
      prices.length - 1
    ] >
    prices[
      prices.length - 6
    ]
  );
}

function candleConfirmation(
  coin
) {

  const prices =
    CANDLE_MEMORY[coin];

  if (
    !prices ||
    prices.length < 3
  ) {
    return false;
  }

  return (
    prices[
      prices.length - 1
    ] >
    prices[
      prices.length - 2
    ] &&
    prices[
      prices.length - 2
    ] >
    prices[
      prices.length - 3
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
    prices.length < 7
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

  return bullish >= 5;
}

function volumeSpikeFilter(
  data
) {

  return (
    data.supportVolume >
    data.resistanceVolume *
      1.8
  );
}

function volatilityFilter(
  data
) {

  return (
    data.spreadPercent >
      0.0002 &&
    data.spreadPercent <
      0.0035
  );
}

function priceActionFilter(
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

// ==========================================
// BTC BIAS ENGINE
// ==========================================

function btcTrendBias() {

  const prices =
    CANDLE_MEMORY["BTC"];

  if (
    !prices ||
    prices.length < 10
  ) {
    return 0;
  }

  const first =
    prices[
      prices.length - 10
    ];

  const last =
    prices[
      prices.length - 1
    ];

  const move =
    (last - first) /
    first;

  if (move > 0.01) {
    return 10;
  }

  if (move < -0.02) {
    return -10;
  }

  if (move < 0) {
    return -5;
  }

  return 0;
}

// ==========================================
// AI SCORE ENGINE
// ==========================================

async function validateSignal(
  coin,
  data
) {

  let score = 0;

  const structure =
    detectStructure(
      coin
    );

  const regime =
    detectRegime(data);

  if (
    structure ===
      "MENDATAR" &&
    regime ===
      "SIDEWAYS"
  ) {

    return 0;
  }

  if (
    emaFilter(coin)
  ) {
    score += 15;
  }

  if (
    momentumFilter(
      coin
    )
  ) {
    score += 15;
  }

  if (
    candleConfirmation(
      coin
    )
  ) {
    score += 15;
  }

  if (
    microTrendFilter(
      coin
    )
  ) {
    score += 15;
  }

  if (
    priceActionFilter(
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
    volatilityFilter(
      data
    )
  ) {
    score += 10;
  }

  if (
    data.pressure > 1.15
  ) {
    score += 10;
  }

  if (
    coin !== "BTC"
  ) {

    score +=
      btcTrendBias();
  }

  return Math.min(
    score,
    95
  );
}

// ==========================================
// SETUP LABEL
// ==========================================

function getSetup(
  score
) {

  if (score >= 92) {
    return "🔥 ELITE SETUP";
  }

  if (score >= 88) {
    return "✅ STRONG SETUP";
  }

  return "⚠️ MODERATE SETUP";
}

// ==========================================
// PRICE UPDATE
// ==========================================

async function sendPriceAlert() {

  let message =
`📡 <b>LIVE MARKET UPDATE</b>`;

  for (const coin of DISPLAY_COINS) {

    const ticker =
      await getTicker(
        coin
      );

    if (!ticker) {
      continue;
    }

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
`📡 <b>MARKET STRUCTURE</b>`;

  for (const coin of DISPLAY_COINS) {

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
      data.supportPrice
    )}

🔴 Resistance
RM${formatPrice(
      coin,
      data.resistancePrice
    )}

${data.pressure > 1
  ? "📈 Buyer Dominance"
  : "📉 Seller Dominance"}

━━━━━━━━━━━━━━`;
  }

  await sendTelegram(
    message
  );
}

// ==========================================
// BREAKOUT / BREAKDOWN
// ==========================================

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
      1.0035
  ) {

    if (
      LAST_BREAKOUT[
        coin
      ] &&
      now() -
        LAST_BREAKOUT[
          coin
        ] <
        BREAKOUT_COOLDOWN
    ) {
      return;
    }

    if (
      !canSendAlert()
    ) {
      return;
    }

    LAST_BREAKOUT[
      coin
    ] = now();

    updateAlertTime();

    await sendTelegram(`
🚀 <b>BREAKOUT DETECTED</b>

🪙 ${coin}

🔴 Resistance
RM${formatPrice(
      coin,
      data.resistancePrice
    )} → RM${formatPrice(
      coin,
      data.currentPrice
    )}

📈 ${emaCross}

📊 Bullish Expansion
`);
  }

  // BREAKDOWN

  if (
    data.currentPrice <
    data.supportPrice *
      0.9965
  ) {

    if (
      LAST_BREAKDOWN[
        coin
      ] &&
      now() -
        LAST_BREAKDOWN[
          coin
        ] <
        BREAKOUT_COOLDOWN
    ) {
      return;
    }

    if (
      !canSendAlert()
    ) {
      return;
    }

    LAST_BREAKDOWN[
      coin
    ] = now();

    updateAlertTime();

    await sendTelegram(`
⚠️ <b>BREAKDOWN DETECTED</b>

🪙 ${coin}

🟢 Support
RM${formatPrice(
      coin,
      data.supportPrice
    )} → RM${formatPrice(
      coin,
      data.currentPrice
    )}

📉 ${emaCross}

📊 Bearish Expansion
`);
  }
}

// ==========================================
// SCALPING ENTRY
// ==========================================

async function sendScalpSignal(
  coin,
  data
) {

  // ACTIVE TRADE LOCK
  const activeTrade =
    Object.values(
      ACTIVE_TRADES
    ).some(
      (trade) =>
        trade.coin ===
          coin &&
        trade.status ===
          "ACTIVE"
    );

  if (activeTrade) {
    return;
  }

  // SIGNAL COOLDOWN
  if (
    LAST_SIGNAL[coin] &&
    now() -
      LAST_SIGNAL[coin] <
      SIGNAL_COOLDOWN
  ) {
    return;
  }

  // GLOBAL ALERT GAP
  if (
    !canSendAlert()
  ) {
    return;
  }

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

  const structure =
    detectStructure(
      coin
    );

  if (
    structure ===
    "MENDATAR"
  ) {
    return;
  }

  const tp =
    data.currentPrice *
    1.03;

  const sl =
    data.supportPrice *
    0.995;

  const id = signalId();

  PENDING_SIGNALS[id] = {

    id,

    coin,

    entry:
      data.bestAsk,

    bestAsk:
      data.bestAsk,

    bestBid:
      data.bestBid,

    tp,

    sl,

    createdAt:
      now(),
  };

  LAST_SIGNAL[coin] =
    now();

  updateAlertTime();

  await sendTelegram(
`
🔄 <b>SCALPING ENTRY</b>

🪙 ${coin}

💵 RM${formatPrice(
  coin,
  data.currentPrice
)}

📌 Suggested Entry
RM${formatPrice(
  coin,
  data.bestAsk
)}

📌 Best Ask
RM${formatPrice(
  coin,
  data.bestAsk
)}

📈 TP
RM${formatPrice(
  coin,
  tp
)}

🛑 SL
RM${formatPrice(
  coin,
  sl
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

🧠 AI Score
${score}%

${getSetup(score)}

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

// ==========================================
// CALLBACK ENGINE
// ==========================================

bot.on(
  "callback_query",

  async (query) => {

    const data =
      query.data;

    const chatId =
      query.message.chat.id;

    // START ENTRY

    if (
      data.startsWith(
        "entry_"
      )
    ) {

      const id =
        data.replace(
          "entry_",
          ""
        );

      USER_FLOW[
        chatId
      ] = {

        mode:
          "TARGET_PROFIT",

        signalId:
          id,
      };

      await bot.sendMessage(
        chatId,

        `${SERVICE_CODE}

💸 Enter target profit RM:`
      );
    }

    // BUY CONFIRM

    if (
      data.startsWith(
        "buy_"
      )
    ) {

      const id =
        data.replace(
          "buy_",
          ""
        );

      const flow =
        USER_FLOW[
          chatId
        ];

      USER_FLOW[
        chatId
      ] = {

        ...flow,

        mode:
          "MATCHED_PRICE",

        signalId:
          id,
      };

      await bot.sendMessage(
        chatId,

        `${SERVICE_CODE}

📌 Enter matched buy price:`
      );
    }

    // TP SELL NOW

    if (
      data.startsWith(
        "tp_sell_"
      )
    ) {

      const id =
        data.replace(
          "tp_sell_",
          ""
        );

      const trade =
        ACTIVE_TRADES[
          id
        ];

      if (!trade) {
        return;
      }

      const ticker =
        await getTicker(
          trade.coin
        );

      if (!ticker) {
        return;
      }

      const currentPrice =
        safeNumber(
          ticker.last_trade
        );

      const netSellUnit =
        trade.netBuyUnit *
        (1 - SELL_FEE);

      const estimatedSellValue =
        currentPrice *
        netSellUnit;

      const profit =
        estimatedSellValue -
        trade.netBuyValue;

      trade.status =
        "CLOSED";

      await sendTelegram(`
💰 <b>SELL NOW CONFIRMED</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
          trade.coin,
          currentPrice
        )}

📦 Quantity Must Sell
${formatUnit(
          trade.coin,
          netSellUnit
        )}

💰 Estimated Sell Value
RM${estimatedSellValue.toFixed(
          2
        )}

📈 Net Profit
RM${profit.toFixed(
          2
        )}

🔥 Trade Closed
`);
    }

    // SL SELL NOW

    if (
      data.startsWith(
        "sl_sell_"
      )
    ) {

      const id =
        data.replace(
          "sl_sell_",
          ""
        );

      const trade =
        ACTIVE_TRADES[
          id
        ];

      if (!trade) {
        return;
      }

      const ticker =
        await getTicker(
          trade.coin
        );

      if (!ticker) {
        return;
      }

      const currentPrice =
        safeNumber(
          ticker.last_trade
        );

      const netSellUnit =
        trade.netBuyUnit *
        (1 - SELL_FEE);

      const estimatedSellValue =
        currentPrice *
        netSellUnit;

      const loss =
        estimatedSellValue -
        trade.netBuyValue;

      trade.status =
        "CLOSED";

      await sendTelegram(`
🛑 <b>STOP LOSS EXECUTED</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
          trade.coin,
          currentPrice
        )}

📦 Quantity Must Sell
${formatUnit(
          trade.coin,
          netSellUnit
        )}

💰 Estimated Sell Value
RM${estimatedSellValue.toFixed(
          2
        )}

📉 Net Loss
RM${loss.toFixed(
          2
        )}

🔥 Trade Closed
`);
    }
  }
);

// ==========================================
// MESSAGE FLOW
// ==========================================

bot.on(
  "message",

  async (msg) => {

    const chatId =
      msg.chat.id;

    const flow =
      USER_FLOW[
        chatId
      ];

    if (!flow) {
      return;
    }

    // TARGET PROFIT

    if (
      flow.mode ===
      "TARGET_PROFIT"
    ) {

      const targetProfit =
        safeNumber(
          msg.text
        );

      if (
        !targetProfit
      ) {
        return;
      }

      const signal =
        PENDING_SIGNALS[
          flow.signalId
        ];

      if (!signal) {
        return;
      }

      const estimatedNet =
        targetProfit /
        0.0045;

      const quantity =
        estimatedNet /
        signal.bestAsk;

      USER_FLOW[
        chatId
      ] = {

        ...flow,

        quantity,
      };

      await sendTelegram(
`
📊 <b>SUGGESTED BUY</b>

🪙 ${signal.coin}

📦 Min Quantity
${formatUnit(
  signal.coin,
  quantity
)}

📌 Entry Price
RM${formatPrice(
  signal.coin,
  signal.entry
)}

📌 Best Ask
RM${formatPrice(
  signal.coin,
  signal.bestAsk
)}

📈 TP
RM${formatPrice(
  signal.coin,
  signal.tp
)}

🔥 Estimated Profit
RM${targetProfit.toFixed(
  2
)}
`,
{
  reply_markup: {
    inline_keyboard: [
      [
        {
          text:
            "✅ BUY",

          callback_data:
            `buy_${signal.id}`,
        },

        {
          text:
            "❌ NO",

          callback_data:
            `cancel_${signal.id}`,
        },
      ],
    ],
  },
}
      );
    }

    // MATCHED PRICE

    if (
      flow.mode ===
      "MATCHED_PRICE"
    ) {

      const matchedPrice =
        safeNumber(
          msg.text
        );

      if (
        !matchedPrice
      ) {
        return;
      }

      const signal =
        PENDING_SIGNALS[
          flow.signalId
        ];

      if (!signal) {
        return;
      }

      const quantity =
        flow.quantity;

      const netBuyUnit =
        quantity *
        (1 - BUY_FEE);

      const netBuyValue =
        matchedPrice *
        quantity;

      const tp =
        matchedPrice *
        1.03;

      const sl =
        matchedPrice *
        0.992;

      const tradeID =
        tradeId();

      ACTIVE_TRADES[
        tradeID
      ] = {

        id: tradeID,

        coin:
          signal.coin,

        matchedPrice,

        netBuyUnit,

        netBuyValue,

        tp,

        sl,

        status:
          "ACTIVE",
      };

      delete USER_FLOW[
        chatId
      ];

      await sendTelegram(`
✅ <b>TRADE ACTIVE</b>

🪙 ${signal.coin}

📌 Matched Price
RM${formatPrice(
        signal.coin,
        matchedPrice
      )}

📦 Net Buy Unit
${formatUnit(
        signal.coin,
        netBuyUnit
      )}

💰 Net Buy Value
RM${netBuyValue.toFixed(
        2
      )}

📈 TP
RM${formatPrice(
        signal.coin,
        tp
      )}

🛑 SL
RM${formatPrice(
        signal.coin,
        sl
      )}

📡 Monitoring Trade...
`);
    }
  }
);

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

    const netSellUnit =
      trade.netBuyUnit *
      (1 - SELL_FEE);

    const estimatedSellValue =
      currentPrice *
      netSellUnit;

    const profit =
      estimatedSellValue -
      trade.netBuyValue;

    // TAKE PROFIT

    if (
      currentPrice >=
      trade.tp
    ) {

      trade.status =
        "WAIT_TP";

      await sendTelegram(
`
🎯 <b>TAKE PROFIT TARGET REACHED</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
  trade.coin,
  currentPrice
)}

📦 Quantity Must Sell
${formatUnit(
  trade.coin,
  netSellUnit
)}

💰 Estimated Sell Value
RM${estimatedSellValue.toFixed(
  2
)}

📈 Estimated Profit
RM${profit.toFixed(
  2
)}

`,
{
  reply_markup: {
    inline_keyboard: [
      [
        {
          text:
            "💰 SELL NOW",

          callback_data:
            `tp_sell_${id}`,
        },
      ],
    ],
  },
}
      );

      continue;
    }

    // STOP LOSS

    if (
      currentPrice <=
      trade.sl
    ) {

      trade.status =
        "WAIT_SL";

      await sendTelegram(
`
⚠️ <b>STOP LOSS ALERT</b>

🪙 ${trade.coin}

💵 Current Price
RM${formatPrice(
  trade.coin,
  currentPrice
)}

📦 Quantity Must Sell
${formatUnit(
  trade.coin,
  netSellUnit
)}

💰 Estimated Sell Value
RM${estimatedSellValue.toFixed(
  2
)}

📉 Estimated Loss
RM${profit.toFixed(
  2
)}

`,
{
  reply_markup: {
    inline_keyboard: [
      [
        {
          text:
            "🛑 SELL NOW",

          callback_data:
            `sl_sell_${id}`,
        },
      ],
    ],
  },
}
      );

      continue;
    }
  }
}

// ==========================================
// CLEANUP
// ==========================================

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
}

// ==========================================
// SMART SIGNAL ENGINE
// ==========================================

async function smartSignalEngine() {

  for (const coin of Object.keys(
    COINS
  )) {

    const data =
      await getMarketData(
        coin
      );

    if (!data) {
      continue;
    }

    await detectBreakoutBreakdown(
      coin,
      data
    );

    await sendScalpSignal(
      coin,
      data
    );
  }
}

// ==========================================
// EXPRESS SERVER
// ==========================================

app.get(
  "/",
  (req, res) => {

    res.json({

      status:
        "ACTIVE",

      service:
        SERVICE_CODE,
    });
  }
);

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

    await sendPriceAlert();

    // LIVE PRICE UPDATE
    setInterval(
      sendPriceAlert,
      300000
    );

    // MARKET STRUCTURE
    setInterval(
      sendMarketStructure,
      15 *
        60 *
        1000
    );

    // SIGNAL ENGINE
    setInterval(
      smartSignalEngine,
      120000
    );

    // TRADE MONITOR
    setInterval(
      monitorTrades,
      MONITOR_INTERVAL
    );

    // CLEANUP
    setInterval(
      cleanup,
      300000
    );
  }
);
