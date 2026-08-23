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

/* ============================================================
   UNIQUE SERVER / DEPLOYMENT CODE
   - New code generated every server restart/deploy
   - Added automatically to every Telegram alert
============================================================ */

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

/* ============================================================
   CONFIG
============================================================ */

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

const CORE_COINS = ["BTC", "GRT"];

const ACTIVE_TRADES = {};
const PENDING_ENTRIES = {};
const USER_STATE = {};
const LAST_SIGNAL = {};
const LAST_PRICE = {};
const PRICE_MEMORY = {};

const TRADE_HISTORY = {
  BTC: [],
  GRT: [],
  XRP: [],
  XLM: [],
  CRV: [],
  AAVE: [],
};

const SEEN_TRADE_SEQUENCES = {
  BTC: new Set(),
  GRT: new Set(),
  XRP: new Set(),
  XLM: new Set(),
  CRV: new Set(),
  AAVE: new Set(),
};

const BOT_STARTED_AT = Date.now();

const GLOBAL_SCALPING_COOLDOWN =
  5 * 60 * 1000;

const PER_COIN_COOLDOWN =
  10 * 60 * 1000;

const PRICE_ALERT_INTERVAL =
  5 * 60 * 1000;

const MARKET_STRUCTURE_INTERVAL =
  15 * 60 * 1000;

const TWO_HOURS =
  2 * 60 * 60 * 1000;

const FLOW_REPORT_INTERVAL =
  TWO_HOURS;

const TRADE_COLLECT_INTERVAL =
  5000;

const PRICE_MEMORY_INTERVAL =
  15000;

const TRADE_MONITOR_INTERVAL =
  15000;

const SCALPING_SCAN_INTERVAL =
  60000;

const HISTORY_KEEP_MS =
  14 * 60 * 60 * 1000;

const TWO_HOUR_MIN_COVERAGE_MS =
  90 * 60 * 1000;

const MAX_CAPITAL = {
  WEAK: 5000,
  MID: 15000,
  STRONG: 30000,
};

let LAST_GLOBAL_SIGNAL = 0;

/* ============================================================
   BASIC HELPERS
============================================================ */

function now() {
  return Date.now();
}

function safeNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function percentChange(
  from,
  to
) {
  if (!from) {
    return 0;
  }

  return (
    ((to - from) / from) *
    100
  );
}

function pairForCoin(coin) {
  return coin === "BTC"
    ? "XBTMYR"
    : `${coin}MYR`;
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

function formatPercent(
  value,
  digits = 2
) {
  const n =
    safeNumber(value);

  return `${
    n >= 0 ? "+" : ""
  }${n.toFixed(digits)}%`;
}

function formatRatio(
  value
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return `${value.toFixed(
    2
  )}x NORMAL`;
}

function formatTimeMY(
  timestamp
) {
  return new Intl.DateTimeFormat(
    "en-MY",
    {
      timeZone:
        "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(
    new Date(timestamp)
  );
}

/* ============================================================
   TELEGRAM
============================================================ */

async function sendTelegram(
  message,
  options = {}
) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      `${SERVICE_CODE}\n\n${message}`,
      options
    );
  } catch (error) {
    console.log(
      "Telegram error:",
      error.response?.data ||
        error.message
    );

    return null;
  }
}

/* ============================================================
   LUNO API
============================================================ */

async function getTicker(coin) {
  try {
    const response =
      await axios.get(
        "https://api.luno.com/api/1/ticker",
        {
          params: {
            pair:
              pairForCoin(
                coin
              ),
          },
          timeout: 10000,
        }
      );

    return {
      coin,
      currentPrice:
        safeNumber(
          response.data
            .last_trade
        ),
      bestAsk:
        safeNumber(
          response.data.ask
        ),
      bestBid:
        safeNumber(
          response.data.bid
        ),
      timestamp:
        safeNumber(
          response.data.timestamp
        ) || now(),
    };
  } catch (error) {
    console.log(
      `Ticker ${coin}:`,
      error.response?.data ||
        error.message
    );

    return null;
  }
}

async function getRecentTrades(
  coin
) {
  try {
    const response =
      await axios.get(
        "https://api.luno.com/api/1/trades",
        {
          params: {
            pair:
              pairForCoin(
                coin
              ),
          },
          timeout: 10000,
        }
      );

    const trades =
      Array.isArray(
        response.data?.trades
      )
        ? response.data
            .trades
        : [];

    return trades
      .map((trade) => ({
        sequence:
          String(
            trade.sequence
          ),
        timestamp:
          safeNumber(
            trade.timestamp
          ),
        price:
          safeNumber(
            trade.price
          ),
        volume:
          safeNumber(
            trade.volume
          ),
        isBuy:
          trade.is_buy ===
            true ||
          trade.is_buy ===
            "true",
      }))
      .filter(
        (trade) =>
          trade.timestamp >
            0 &&
          trade.price > 0 &&
          trade.volume > 0
      );
  } catch (error) {
    console.log(
      `Trades ${coin}:`,
      error.response?.data ||
        error.message
    );

    return [];
  }
}

/* ============================================================
   PRICE MEMORY
============================================================ */

function updatePriceMemory(
  coin,
  price,
  timestamp = now()
) {
  if (
    !PRICE_MEMORY[coin]
  ) {
    PRICE_MEMORY[coin] =
      [];
  }

  PRICE_MEMORY[coin].push({
    price,
    time: timestamp,
  });

  const cutoff =
    now() -
    HISTORY_KEEP_MS;

  PRICE_MEMORY[coin] =
    PRICE_MEMORY[
      coin
    ].filter(
      (item) =>
        item.time >= cutoff
    );
}

async function updateMemory() {
  for (
    const coin of
    SCAN_COINS
  ) {
    const ticker =
      await getTicker(coin);

    if (!ticker) {
      continue;
    }

    updatePriceMemory(
      coin,
      ticker.currentPrice,
      ticker.timestamp
    );
  }
}

function getPriceMemoryWindow(
  coin,
  durationMs
) {
  const cutoff =
    now() - durationMs;

  return (
    PRICE_MEMORY[coin] ||
    []
  ).filter(
    (item) =>
      item.time >= cutoff
  );
}

function getPriceSnapshot(
  coin,
  durationMs
) {
  const data =
    getPriceMemoryWindow(
      coin,
      durationMs
    );

  if (
    data.length < 2
  ) {
    return null;
  }

  const first =
    data[0].price;

  const last =
    data[
      data.length - 1
    ].price;

  const high =
    Math.max(
      ...data.map(
        (x) => x.price
      )
    );

  const low =
    Math.min(
      ...data.map(
        (x) => x.price
      )
    );

  return {
    first,
    last,
    high,
    low,
    change:
      percentChange(
        first,
        last
      ),
    data,
  };
}

/* ============================================================
   REAL TRADE COLLECTOR
============================================================ */

function purgeOldTrades(
  coin
) {
  const cutoff =
    now() -
    HISTORY_KEEP_MS;

  TRADE_HISTORY[coin] =
    (
      TRADE_HISTORY[
        coin
      ] || []
    ).filter(
      (trade) =>
        trade.timestamp >=
        cutoff
    );

  SEEN_TRADE_SEQUENCES[
    coin
  ] = new Set(
    TRADE_HISTORY[
      coin
    ].map(
      (trade) =>
        trade.sequence
    )
  );
}

async function collectTradesForCoin(
  coin
) {
  const trades =
    await getRecentTrades(
      coin
    );

  if (!trades.length) {
    return;
  }

  for (
    const trade of
    trades
  ) {
    if (
      SEEN_TRADE_SEQUENCES[
        coin
      ].has(
        trade.sequence
      )
    ) {
      continue;
    }

    SEEN_TRADE_SEQUENCES[
      coin
    ].add(
      trade.sequence
    );

    TRADE_HISTORY[
      coin
    ].push(trade);
  }

  TRADE_HISTORY[
    coin
  ].sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  purgeOldTrades(coin);
}

async function collectTradeHistory() {
  for (
    const coin of
    SCAN_COINS
  ) {
    await collectTradesForCoin(
      coin
    );
  }
}

function getTradesInWindow(
  coin,
  startTime,
  endTime
) {
  return (
    TRADE_HISTORY[
      coin
    ] || []
  ).filter(
    (trade) =>
      trade.timestamp >=
        startTime &&
      trade.timestamp <=
        endTime
  );
}

function summarizeTrades(
  coin,
  trades
) {
  if (!trades.length) {
    return null;
  }

  const sorted =
    [...trades].sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );

  let buyVolume = 0;
  let sellVolume = 0;

  let high =
    -Infinity;

  let low =
    Infinity;

  for (
    const trade of
    sorted
  ) {
    if (trade.isBuy) {
      buyVolume +=
        trade.volume;
    } else {
      sellVolume +=
        trade.volume;
    }

    high =
      Math.max(
        high,
        trade.price
      );

    low =
      Math.min(
        low,
        trade.price
      );
  }

  const totalVolume =
    buyVolume +
    sellVolume;

  return {
    coin,
    open:
      sorted[0].price,
    close:
      sorted[
        sorted.length - 1
      ].price,
    high,
    low,
    buyVolume,
    sellVolume,
    totalVolume,
    buyPct:
      totalVolume > 0
        ? (buyVolume /
            totalVolume) *
          100
        : 0,
    sellPct:
      totalVolume > 0
        ? (sellVolume /
            totalVolume) *
          100
        : 0,
    startTime:
      sorted[0]
        .timestamp,
    endTime:
      sorted[
        sorted.length - 1
      ].timestamp,
    tradeCount:
      sorted.length,
  };
}

/* ============================================================
   1) PRICE ALERT - EVERY 5 MINUTES
============================================================ */

async function sendPriceAlert() {
  const btc =
    await getTicker("BTC");

  const grt =
    await getTicker("GRT");

  if (!btc || !grt) {
    return;
  }

  const buildLine = (
    coin,
    ticker
  ) => {
    const previous =
      LAST_PRICE[coin];

    let emoji = "➖";
    let changeText = "";

    if (previous) {
      const change =
        percentChange(
          previous,
          ticker.currentPrice
        );

      if (change > 0) {
        emoji = "🟢";
      } else if (
        change < 0
      ) {
        emoji = "🔴";
      }

      changeText =
        `\n${
          change > 0
            ? "⬆️"
            : change < 0
            ? "⬇️"
            : "➖"
        } ${formatPercent(
          change
        )}`;
    }

    LAST_PRICE[coin] =
      ticker.currentPrice;

    return `${emoji} ${coin}
RM${formatPrice(
      coin,
      ticker.currentPrice
    )}${changeText}`;
  };

  const message = `📡 PRICE ALERT

${buildLine(
    "BTC",
    btc
  )}

${buildLine(
    "GRT",
    grt
  )}`;

  await sendTelegram(
    message
  );
}

/* ============================================================
   2) MARKET STRUCTURE - EVERY 15 MINUTES
   Full screening:
   - Current price
   - Support
   - Resistance
   - Market
   - Pressure
   - Criteria
============================================================ */

function getMarketDirection(
  changePct
) {
  if (changePct >= 0.5) {
    return "SEDANG NAIK KUAT";
  }

  if (changePct >= 0.15) {
    return "SEDANG NAIK";
  }

  if (changePct <= -0.5) {
    return "SEDANG MENURUN KUAT";
  }

  if (changePct <= -0.15) {
    return "SEDANG MENURUN";
  }

  return "SIDEWAY";
}

function getPressureLabel(
  buyPct,
  sellPct
) {
  if (
    buyPct >= 65
  ) {
    return "TEKANAN BELI KUAT";
  }

  if (
    buyPct >= 55
  ) {
    return "TEKANAN BELI SEDERHANA";
  }

  if (
    sellPct >= 65
  ) {
    return "TEKANAN JUAL KUAT";
  }

  if (
    sellPct >= 55
  ) {
    return "TEKANAN JUAL SEDERHANA";
  }

  return "SEIMBANG";
}

function calculateSupportResistance(
  coin
) {
  const snapshot =
    getPriceSnapshot(
      coin,
      TWO_HOURS
    );

  if (!snapshot) {
    return null;
  }

  const prices =
    snapshot.data
      .map(
        (item) =>
          item.price
      )
      .sort(
        (a, b) =>
          a - b
      );

  if (
    prices.length < 5
  ) {
    return {
      support:
        snapshot.low,
      resistance:
        snapshot.high,
    };
  }

  const supportIndex =
    Math.floor(
      prices.length *
        0.08
    );

  const resistanceIndex =
    Math.ceil(
      prices.length *
        0.92
    ) - 1;

  return {
    support:
      prices[
        clamp(
          supportIndex,
          0,
          prices.length -
            1
        )
      ],
    resistance:
      prices[
        clamp(
          resistanceIndex,
          0,
          prices.length -
            1
        )
      ],
  };
}

function detectStructureEvent({
  currentPrice,
  support,
  resistance,
  snapshot15m,
  snapshot60m,
}) {
  if (
    !snapshot15m ||
    !snapshot60m
  ) {
    return "";
  }

  const aboveResistance =
    currentPrice >
    resistance * 1.0015;

  const belowSupport =
    currentPrice <
    support * 0.9985;

  const nearResistance =
    currentPrice >=
      resistance * 0.995 &&
    currentPrice <=
      resistance * 1.0015;

  const nearSupport =
    currentPrice <=
      support * 1.005 &&
    currentPrice >=
      support * 0.9985;

  const pulledBack =
    snapshot60m.high >
      snapshot60m.first *
        1.005 &&
    currentPrice <
      snapshot60m.high *
        0.995 &&
    snapshot15m.change <
      -0.1;

  const failedBreakout =
    snapshot60m.high >
      resistance *
        1.0015 &&
    currentPrice <
      resistance &&
    snapshot15m.change <
      -0.1;

  if (failedBreakout) {
    return " — FAILED BREAKOUT";
  }

  if (aboveResistance) {
    return " — BREAKOUT";
  }

  if (belowSupport) {
    return " — BREAKDOWN";
  }

  if (pulledBack) {
    return " — PULLBACK";
  }

  if (
    nearResistance
  ) {
    return " — DEKAT RESISTANCE";
  }

  if (nearSupport) {
    return " — DEKAT SUPPORT";
  }

  return "";
}

function getMarketCriteria({
  coin,
  currentPrice,
  support,
  resistance,
  direction,
  pressure,
  event,
}) {
  if (
    event.includes(
      "FAILED BREAKOUT"
    )
  ) {
    return "JGN BELI";
  }

  if (
    event.includes(
      "BREAKDOWN"
    )
  ) {
    return "JGN BELI";
  }

  if (
    pressure.includes(
      "JUAL KUAT"
    ) ||
    direction.includes(
      "MENURUN KUAT"
    )
  ) {
    return "JGN BELI";
  }

  if (
    event.includes(
      "BREAKOUT"
    ) &&
    pressure.includes(
      "BELI"
    ) &&
    direction.includes(
      "NAIK"
    )
  ) {
    return "BOLEH BELI SKRG";
  }

  if (
    event.includes(
      "PULLBACK"
    )
  ) {
    return `TUNGGU PULLBACK RM${formatPrice(
      coin,
      support
    )}`;
  }

  if (
    direction.includes(
      "NAIK"
    ) &&
    pressure.includes(
      "BELI"
    ) &&
    currentPrice <
      resistance
  ) {
    return `BELI JIKA PECAH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  if (
    pressure ===
      "SEIMBANG" ||
    direction ===
      "SIDEWAY"
  ) {
    return `BELI JIKA PECAH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  return "JGN BELI";
}

async function analyzeMarketStructure(
  coin
) {
  const ticker =
    await getTicker(coin);

  if (!ticker) {
    return null;
  }

  const levels =
    calculateSupportResistance(
      coin
    );

  const snapshot15m =
    getPriceSnapshot(
      coin,
      15 * 60 * 1000
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      60 * 60 * 1000
    );

  if (
    !levels ||
    !snapshot15m ||
    !snapshot60m
  ) {
    return null;
  }

  const trades15m =
    getTradesInWindow(
      coin,
      now() -
        15 * 60 * 1000,
      now()
    );

  const flow15m =
    summarizeTrades(
      coin,
      trades15m
    );

  const buyPct =
    flow15m
      ? flow15m.buyPct
      : 50;

  const sellPct =
    flow15m
      ? flow15m.sellPct
      : 50;

  const direction =
    getMarketDirection(
      snapshot15m.change
    );

  const pressure =
    getPressureLabel(
      buyPct,
      sellPct
    );

  const event =
    detectStructureEvent({
      currentPrice:
        ticker.currentPrice,
      support:
        levels.support,
      resistance:
        levels.resistance,
      snapshot15m,
      snapshot60m,
    });

  const market =
    `${direction}${event}`;

  const criteria =
    getMarketCriteria({
      coin,
      currentPrice:
        ticker.currentPrice,
      support:
        levels.support,
      resistance:
        levels.resistance,
      direction,
      pressure,
      event,
    });

  return {
    coin,
    currentPrice:
      ticker.currentPrice,
    support:
      levels.support,
    resistance:
      levels.resistance,
    market,
    pressure,
    criteria,
  };
}

function buildMarketStructureSection(
  data
) {
  return `🪙 ${data.coin}

💵 Harga Semasa:
RM${formatPrice(
    data.coin,
    data.currentPrice
  )}

🟢 Support:
RM${formatPrice(
    data.coin,
    data.support
  )}

🔴 Resistance:
RM${formatPrice(
    data.coin,
    data.resistance
  )}

📈 Market:
${data.market}

⚡️ Tekanan:
${data.pressure}

🧠 Kriteria:
${data.criteria}`;
}

async function sendMarketStructure() {
  const sections = [];

  for (
    const coin of
    CORE_COINS
  ) {
    const data =
      await analyzeMarketStructure(
        coin
      );

    if (data) {
      sections.push(
        buildMarketStructureSection(
          data
        )
      );
    }
  }

  if (!sections.length) {
    return;
  }

  await sendTelegram(
    `📊 MARKET STRUCTURE UPDATE

${sections.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
  );
}

/* ============================================================
   3) SCALPING ENTRY - EVENT BASED / INTERACTIVE
============================================================ */

function confidenceLabel(
  score
) {
  if (score >= 80) {
    return "STRONG";
  }

  if (score >= 65) {
    return "MID";
  }

  return "WEAK";
}

function setupType(
  score,
  market
) {
  if (
    market.includes(
      "BREAKOUT"
    ) &&
    !market.includes(
      "FAILED"
    )
  ) {
    return "BREAKOUT";
  }

  if (score >= 80) {
    return "CONTINUATION";
  }

  return "EARLY MOMENTUM";
}

function getScalpingScore({
  snapshot15m,
  snapshot60m,
  pressure,
  market,
  currentPrice,
  support,
  resistance,
}) {
  let score = 50;

  score += clamp(
    snapshot15m.change *
      20,
    -25,
    25
  );

  score += clamp(
    snapshot60m.change *
      8,
    -15,
    15
  );

  if (
    pressure ===
      "TEKANAN BELI KUAT"
  ) {
    score += 15;
  } else if (
    pressure ===
      "TEKANAN BELI SEDERHANA"
  ) {
    score += 8;
  } else if (
    pressure ===
      "TEKANAN JUAL KUAT"
  ) {
    score -= 18;
  } else if (
    pressure ===
      "TEKANAN JUAL SEDERHANA"
  ) {
    score -= 10;
  }

  if (
    market.includes(
      "BREAKOUT"
    ) &&
    !market.includes(
      "FAILED"
    )
  ) {
    score += 12;
  }

  if (
    market.includes(
      "FAILED BREAKOUT"
    ) ||
    market.includes(
      "BREAKDOWN"
    )
  ) {
    score -= 25;
  }

  const range =
    resistance -
    support;

  if (range > 0) {
    const position =
      (currentPrice -
        support) /
      range;

    if (
      position >= 0.55 &&
      position <= 0.9
    ) {
      score += 5;
    }

    if (
      position > 1.02
    ) {
      score += 5;
    }

    if (
      position < 0.2
    ) {
      score -= 5;
    }
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

async function getTwoHourAction(
  coin
) {
  const analysis =
    await analyze2HMarketCondition(
      coin
    );

  if (!analysis) {
    return null;
  }

  return analysis.action;
}

async function scanSignals() {
  if (
    now() -
      LAST_GLOBAL_SIGNAL <
    GLOBAL_SCALPING_COOLDOWN
  ) {
    return;
  }

  const candidates = [];

  for (
    const coin of
    SCAN_COINS
  ) {
    if (
      ACTIVE_TRADES[
        coin
      ]
    ) {
      continue;
    }

    if (
      LAST_SIGNAL[
        coin
      ] &&
      now() -
        LAST_SIGNAL[
          coin
        ] <
        PER_COIN_COOLDOWN
    ) {
      continue;
    }

    const ticker =
      await getTicker(coin);

    if (!ticker) {
      continue;
    }

    const structure =
      await analyzeMarketStructure(
        coin
      );

    if (!structure) {
      continue;
    }

    const snapshot15m =
      getPriceSnapshot(
        coin,
        15 * 60 * 1000
      );

    const snapshot60m =
      getPriceSnapshot(
        coin,
        60 * 60 * 1000
      );

    if (
      !snapshot15m ||
      !snapshot60m
    ) {
      continue;
    }

    const score =
      getScalpingScore({
        snapshot15m,
        snapshot60m,
        pressure:
          structure.pressure,
        market:
          structure.market,
        currentPrice:
          structure.currentPrice,
        support:
          structure.support,
        resistance:
          structure.resistance,
      });

    const confidence =
      confidenceLabel(
        score
      );

    if (
      confidence ===
      "WEAK"
    ) {
      continue;
    }

    if (
      CORE_COINS.includes(
        coin
      )
    ) {
      const action =
        await getTwoHourAction(
          coin
        );

      if (
        action &&
        action.includes(
          "JANGAN ENTER"
        )
      ) {
        continue;
      }
    }

    const entryPrice =
      coin === "BTC"
        ? ticker.currentPrice *
          0.999
        : ticker.currentPrice *
          0.996;

    let tp;
    let durationHours;

    if (coin === "BTC") {
      if (
        confidence ===
        "STRONG"
      ) {
        tp =
          entryPrice *
          1.03;
        durationHours = 8;
      } else {
        tp =
          entryPrice *
          1.015;
        durationHours = 4;
      }
    } else if (
      coin === "XRP" ||
      coin === "XLM"
    ) {
      if (
        confidence ===
        "STRONG"
      ) {
        tp =
          entryPrice *
          1.06;
        durationHours = 8;
      } else {
        tp =
          entryPrice *
          1.03;
        durationHours = 6;
      }
    } else {
      if (
        confidence ===
        "STRONG"
      ) {
        tp =
          entryPrice *
          1.05;
        durationHours = 8;
      } else {
        tp =
          entryPrice *
          1.03;
        durationHours = 6;
      }
    }

    const sl =
      entryPrice *
      0.985;

    const tpDistance =
      percentChange(
        entryPrice,
        tp
      );

    if (
      tpDistance < 1.5
    ) {
      continue;
    }

    candidates.push({
      coin,
      score,
      confidence,
      entryPrice,
      tp,
      sl,
      durationHours,
      currentPrice:
        ticker.currentPrice,
      bestAsk:
        ticker.bestAsk,
      bestBid:
        ticker.bestBid,
      market:
        structure.market,
    });
  }

  if (
    !candidates.length
  ) {
    return;
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const best =
    candidates[0];

  PENDING_ENTRIES[
    best.coin
  ] = best;

  LAST_GLOBAL_SIGNAL =
    now();

  LAST_SIGNAL[
    best.coin
  ] = now();

  const message = `🚀 SCALPING ENTRY

🪙 ${best.coin}

💵 Current:
RM${formatPrice(
    best.coin,
    best.currentPrice
  )}

📌 Entry:
RM${formatPrice(
    best.coin,
    best.entryPrice
  )}

🎯 TP:
RM${formatPrice(
    best.coin,
    best.tp
  )}

🛑 SL:
RM${formatPrice(
    best.coin,
    best.sl
  )}

⏳ Trade Duration:
${best.durationHours} HOURS

🧠 Confidence:
${best.score}% ${best.confidence}

📊 Setup:
${setupType(
    best.score,
    best.market
  )}

━━━━━━━━━━━━━━

START ENTRY?`;

  await sendTelegram(
    message,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "✅ START ENTRY",
              callback_data:
                `START_${best.coin}`,
            },
            {
              text:
                "❌ IGNORE",
              callback_data:
                `IGNORE_${best.coin}`,
            },
          ],
        ],
      },
    }
  );
}
/* ============================================================
   4) 2H MARKET CONDITION
   Final display:
   - Start
   - Peak
   - Now
   - Price Trend
   - One dominant side + %
   - Relative volume
   - Action

   NO order book
   NO momentum section
   NO confidence
   NO market structure duplication
============================================================ */

function getPrevious2HWindows(
  coin,
  currentStart,
  maxWindows = 5
) {
  const summaries = [];

  for (
    let i = 1;
    i <= maxWindows;
    i++
  ) {
    const end =
      currentStart -
      (i - 1) *
        TWO_HOURS;

    const start =
      end -
      TWO_HOURS;

    const trades =
      getTradesInWindow(
        coin,
        start,
        end
      );

    const summary =
      summarizeTrades(
        coin,
        trades
      );

    if (
      summary &&
      summary.totalVolume >
        0
    ) {
      summaries.push(
        summary
      );
    }
  }

  return summaries;
}

function getRelativeVolumeInfo(
  currentSummary,
  previousSummaries
) {
  if (
    !previousSummaries.length
  ) {
    return {
      ratio: null,
      label: null,
    };
  }

  const avg =
    previousSummaries.reduce(
      (sum, item) =>
        sum +
        item.totalVolume,
      0
    ) /
    previousSummaries.length;

  if (!avg) {
    return {
      ratio: null,
      label: null,
    };
  }

  const ratio =
    currentSummary.totalVolume /
    avg;

  let label =
    "NORMAL VOLUME";

  if (ratio < 0.8) {
    label = "LOW VOLUME";
  } else if (
    ratio >= 1.75
  ) {
    label =
      "VOLUME BREAKOUT";
  } else if (
    ratio >= 1.25
  ) {
    label =
      "HIGH VOLUME";
  }

  return {
    ratio,
    label,
  };
}

/* ============================================================
   2H PRICE TREND

   LOGIC:

   Kalau harga pada waktu alert masih menaik:
   percentage = START -> NOW

   Kalau harga sudah berpatah turun:
   percentage = PEAK -> NOW

   Contoh:

   Start : RM0.0660
   Peak  : RM0.0690
   Now   : RM0.0690

   PRICE TREND
   ⬆️ +4.55%

   --------------------------------

   Start : RM0.0660
   Peak  : RM0.0690
   Now   : RM0.0667

   PRICE TREND
   ⬇️ -3.33%
============================================================ */

function getCurrent2HPriceTrend({
  coin,
  startPrice,
  peakPrice,
  currentPrice,
}) {
  /*
    Kita guna movement 15 minit terakhir
    untuk tentukan arah harga SEMASA
    ketika 2H alert keluar.
  */

  const recent15m =
    getPriceSnapshot(
      coin,
      15 * 60 * 1000
    );

  const recentDirection =
    recent15m
      ? recent15m.change
      : percentChange(
          startPrice,
          currentPrice
        );

  /*
    Berapa % current price
    berada di bawah peak.
  */

  const peakDrop =
    percentChange(
      peakPrice,
      currentPrice
    );

  /*
    Berapa % current price
    berubah daripada start.
  */

  const startMove =
    percentChange(
      startPrice,
      currentPrice
    );

  /*
    Kita anggap harga sedang turun
    jika:

    1. Peak lebih tinggi daripada current
    DAN
    2. 15M movement sedang negatif

    ATAU current sudah jatuh
    bawah start price.
  */

  const isFallingNow =
    peakPrice >
      currentPrice &&
    (
      recentDirection <
        -0.08 ||
      currentPrice <
        startPrice
    );

  if (isFallingNow) {
    return {
      direction:
        "DOWN",

      display:
        `⬇️ ${peakDrop.toFixed(
          2
        )}%`,

      value:
        peakDrop,
    };
  }

  /*
    Kalau current masih atas start
    dan tak sedang berpatah turun,
    kita anggap trend masih menaik.
  */

  if (
    startMove > 0.03
  ) {
    return {
      direction:
        "UP",

      display:
        `⬆️ +${startMove.toFixed(
          2
        )}%`,

      value:
        startMove,
    };
  }

  /*
    Kalau current bawah start.
  */

  if (
    startMove < -0.03
  ) {
    return {
      direction:
        "DOWN",

      display:
        `⬇️ ${startMove.toFixed(
          2
        )}%`,

      value:
        startMove,
    };
  }

  /*
    Kalau movement terlalu kecil.
  */

  return {
    direction:
      "FLAT",

    display:
      "➖ 0.00%",

    value: 0,
  };
}

/* ============================================================
   MARKET DOMINANCE

   Bot tetap kira BUY + SELL di belakang.

   Tapi Telegram hanya display
   SATU pihak yang dominan.

   Contoh:

   👑 MARKET DOMINANCE
   🟢 BUYER 68.4%

   ATAU

   👑 MARKET DOMINANCE
   🔴 SELLER 64.7%
============================================================ */

function getDominance(
  summary
) {
  if (
    summary.buyPct >=
    summary.sellPct
  ) {
    return {
      side:
        "BUYER",

      emoji:
        "🟢",

      percent:
        summary.buyPct,
    };
  }

  return {
    side:
      "SELLER",

    emoji:
      "🔴",

    percent:
      summary.sellPct,
  };
}

/* ============================================================
   2H ACTION ENGINE

   Action bukan berdasarkan BUYER/SELLER
   dominance sahaja.

   Ia gabungkan:

   1. PRICE TREND
   2. MARKET DOMINANCE
   3. RELATIVE VOLUME

   Contoh:

   BUYER 70%
   tapi harga sedang jatuh dari peak

   = JANGAN ENTER

   BUYER 70%
   + harga naik
   + volume tinggi

   = BOLEH MULA MEMBELI
============================================================ */

function getTwoHourActionDecision({
  dominance,
  priceTrend,
  relativeVolume,
}) {
  const dominantPct =
    dominance.percent;

  const strongDominance =
    dominantPct >= 62;

  const mildDominance =
    dominantPct >= 55;

  const volumeRatio =
    relativeVolume.ratio;

  const highVolume =
    volumeRatio !== null &&
    volumeRatio >= 1.25;

  const veryHighVolume =
    volumeRatio !== null &&
    volumeRatio >= 1.75;

  /*
    ========================================================
    BUYER DOMINANT + PRICE MENAIK
    ========================================================
  */

  if (
    dominance.side ===
      "BUYER" &&
    priceTrend.direction ===
      "UP"
  ) {
    /*
      Strong confirmation:

      BUYER >= 62%
      Price naik sekurang-kurangnya 0.5%
      Volume >= 1.25x normal
    */

    if (
      strongDominance &&
      highVolume &&
      priceTrend.value >=
        0.5
    ) {
      return "🟢 BOLEH MULA MEMBELI";
    }

    /*
      Buyer masih dominant
      tetapi confirmation belum cukup kuat.
    */

    if (
      mildDominance &&
      priceTrend.value >
        0
    ) {
      return "🟡 TUNGGU CONFIRMATION";
    }
  }

  /*
    ========================================================
    BUYER DOMINANT TAPI PRICE MENURUN
    ========================================================

    Ini penting.

    Walaupun BUYER 70%,
    kalau harga sedang jatuh daripada peak,
    kita TAK anggap buyer sedang control harga.
  */

  if (
    dominance.side ===
      "BUYER" &&
    priceTrend.direction ===
      "DOWN"
  ) {
    return "🔴 JANGAN ENTER MARKET";
  }

  /*
    ========================================================
    SELLER DOMINANT + PRICE MENURUN
    ========================================================
  */

  if (
    dominance.side ===
      "SELLER" &&
    priceTrend.direction ===
      "DOWN"
  ) {
    return "🔴 JANGAN ENTER MARKET";
  }

  /*
    ========================================================
    SELLER DOMINANT TAPI PRICE MENAIK
    ========================================================

    Kemungkinan selling sedang diserap.

    Tetapi kita tak terus suruh beli.
    Tunggu confirmation.
  */

  if (
    dominance.side ===
      "SELLER" &&
    priceTrend.direction ===
      "UP"
  ) {
    return "🟡 TUNGGU CONFIRMATION";
  }

  /*
    ========================================================
    FLAT / WEAK MARKET
    ========================================================
  */

  if (
    !strongDominance ||
    !veryHighVolume
  ) {
    return "🟡 TUNGGU CONFIRMATION";
  }

  return "🟡 TUNGGU CONFIRMATION";
}

/* ============================================================
   ANALYZE 2H MARKET CONDITION
============================================================ */

async function analyze2HMarketCondition(
  coin
) {
  const endTime =
    now();

  const startTime =
    endTime -
    TWO_HOURS;

  /*
    Ambil semua executed trades
    dalam 2 jam semasa.
  */

  const currentTrades =
    getTradesInWindow(
      coin,
      startTime,
      endTime
    );

  if (
    !currentTrades.length
  ) {
    return null;
  }

  const summary =
    summarizeTrades(
      coin,
      currentTrades
    );

  if (!summary) {
    return null;
  }

  /*
    ========================================================
    SILENT DATA WARM-UP
    ========================================================

    Kalau bot baru restart / deploy,
    kita TAK hantar:

    DATA WARMING UP
    DATA BELUM CUKUP
    dan sebagainya.

    Scheduled 2H alert akan diam sahaja.
  */

  const coverageMs =
    summary.endTime -
    summary.startTime;

  const startupCoverage =
    endTime -
    Math.max(
      BOT_STARTED_AT,
      startTime
    );

  if (
    coverageMs <
      TWO_HOUR_MIN_COVERAGE_MS ||
    startupCoverage <
      TWO_HOUR_MIN_COVERAGE_MS
  ) {
    return null;
  }

  /*
    Ambil harga live sekarang.
  */

  const ticker =
    await getTicker(
      coin
    );

  if (!ticker) {
    return null;
  }

  /*
    Ambil previous 2H windows
    untuk compare volume.
  */

  const previous =
    getPrevious2HWindows(
      coin,
      startTime,
      5
    );

  /*
    Kalau belum ada previous window
    yang cukup untuk benchmark volume,
    jangan reka ratio.

    Scheduled alert diam.
  */

  if (
    !previous.length
  ) {
    return null;
  }

  const relativeVolume =
    getRelativeVolumeInfo(
      summary,
      previous
    );

  if (
    relativeVolume.ratio ===
      null ||
    !relativeVolume.label
  ) {
    return null;
  }

  /*
    PRICE
  */

  const startPrice =
    summary.open;

  const peakPrice =
    summary.high;

  const currentPrice =
    ticker.currentPrice;

  /*
    PRICE TREND
  */

  const priceTrend =
    getCurrent2HPriceTrend({
      coin,
      startPrice,
      peakPrice,
      currentPrice,
    });

  /*
    MARKET DOMINANCE
  */

  const dominance =
    getDominance(
      summary
    );

  /*
    ACTION
  */

  const action =
    getTwoHourActionDecision({
      dominance,
      priceTrend,
      relativeVolume,
    });

  return {
    coin,

    startTime,
    endTime,

    startPrice,
    peakPrice,
    currentPrice,

    priceTrend,
    dominance,
    relativeVolume,

    action,
  };
}

/* ============================================================
   BUILD 2H TELEGRAM DISPLAY
============================================================ */

function build2HMarketConditionSection(
  data
) {
  return `🪙 ${data.coin} / MYR

💵 PRICE
Start : RM${formatPrice(
    data.coin,
    data.startPrice
  )}
Peak  : RM${formatPrice(
    data.coin,
    data.peakPrice
  )}
Now   : RM${formatPrice(
    data.coin,
    data.currentPrice
  )}

📈 PRICE TREND
${data.priceTrend.display}

👑 MARKET DOMINANCE
${data.dominance.emoji} ${data.dominance.side} ${data.dominance.percent.toFixed(
    1
  )}%

📊 VOLUME
${formatRatio(
    data.relativeVolume.ratio
  )}
${data.relativeVolume.label}

🎯 ACTION
${data.action}`;
}

/* ============================================================
   SEND 2H MARKET CONDITION
============================================================ */

async function send2HMarketCondition() {
  const sections = [];

  for (
    const coin of
    CORE_COINS
  ) {
    const data =
      await analyze2HMarketCondition(
        coin
      );

    if (data) {
      sections.push(
        build2HMarketConditionSection(
          data
        )
      );
    }
  }

  /*
    Kalau BTC dan GRT dua-dua
    belum cukup data:

    DIAM.

    Tak hantar Telegram.
  */

  if (
    !sections.length
  ) {
    return;
  }

  await sendTelegram(
    `📊 2H MARKET CONDITION

${sections.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
  );
}

/* ============================================================
   ACTIVE TRADE MONITOR

   Check setiap 15 saat:

   - TP
   - SL
   - Trade duration
============================================================ */

async function monitorTrades() {
  for (
    const coin in
    ACTIVE_TRADES
  ) {
    const trade =
      ACTIVE_TRADES[
        coin
      ];

    const ticker =
      await getTicker(
        coin
      );

    if (!ticker) {
      continue;
    }

    /* ======================================================
       TP REACHED
    ====================================================== */

    if (
      !trade.tpReached &&
      ticker.currentPrice >=
        trade.tp
    ) {
      trade.tpReached =
        true;

      const grossProfit =
        (trade.tp -
          trade.buyPrice) *
        trade.netTradeUnit;

      const message = `🎯 TP REACHED SELL NOW

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        ticker.currentPrice
      )}

🎯 Current TP:
RM${formatPrice(
        coin,
        trade.tp
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        ticker.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(
        4
      )} ${coin}

💰 Profit Kasar:
RM${grossProfit.toFixed(
        2
      )}

━━━━━━━━━━━━━━

SELL NOW?`;

      await sendTelegram(
        message,
        {
          reply_markup: {
            inline_keyboard:
              [
                [
                  {
                    text:
                      "💰 SELL",
                    callback_data:
                      `SELL_${coin}`,
                  },
                  {
                    text:
                      "✋ HOLD",
                    callback_data:
                      `HOLD_${coin}`,
                  },
                ],
              ],
          },
        }
      );
    }

    /* ======================================================
       STOP LOSS REACHED
    ====================================================== */

    if (
      !trade.slReached &&
      ticker.currentPrice <=
        trade.sl
    ) {
      trade.slReached =
        true;

      const message = `🛑 STOP LOSS HIT

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        ticker.currentPrice
      )}

🛑 Current SL:
RM${formatPrice(
        coin,
        trade.sl
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        ticker.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(
        4
      )} ${coin}

━━━━━━━━━━━━━━

SELL NOW?`;

      await sendTelegram(
        message,
        {
          reply_markup: {
            inline_keyboard:
              [
                [
                  {
                    text:
                      "💰 SELL",
                    callback_data:
                      `SELL_${coin}`,
                  },
                  {
                    text:
                      "✋ HOLD",
                    callback_data:
                      `HOLD_${coin}`,
                  },
                ],
              ],
          },
        }
      );
    }

    /* ======================================================
       TRADE DURATION REACHED
    ====================================================== */

    const expired =
      now() -
        trade.startTime >=
      trade.durationHours *
        60 *
        60 *
        1000;

    if (
      expired &&
      !trade.durationAlertSent
    ) {
      trade.durationAlertSent =
        true;

      const message = `⌛ SETUP DURATION REACHED

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
        coin,
        ticker.currentPrice
      )}

📌 Best Bid:
RM${formatPrice(
        coin,
        ticker.bestBid
      )}

📦 Net Must Sell
(LUNO QUANTITY)

${trade.netTradeUnit.toFixed(
        4
      )} ${coin}

━━━━━━━━━━━━━━

SELL AT CURRENT PRICE?`;

      await sendTelegram(
        message,
        {
          reply_markup: {
            inline_keyboard:
              [
                [
                  {
                    text:
                      "💰 SELL",
                    callback_data:
                      `SELL_${coin}`,
                  },
                  {
                    text:
                      "✋ HOLD",
                    callback_data:
                      `HOLD_${coin}`,
                  },
                ],
              ],
          },
        }
      );
    }
  }
}

/* ============================================================
   TELEGRAM INTERACTIVE CALLBACKS
============================================================ */

bot.on(
  "callback_query",
  async (query) => {
    const data =
      query.data;

    const chatId =
      query.message
        .chat.id;

    /* ======================================================
       START ENTRY
    ====================================================== */

    if (
      data.startsWith(
        "START_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      USER_STATE[
        chatId
      ] = {
        step:
          "WAIT_PROFIT",
        coin,
      };

      await bot.sendMessage(
        chatId,
        "💰 TARGET NET PROFIT (RM)?"
      );
    }

    /* ======================================================
       IGNORE ENTRY
    ====================================================== */

    if (
      data.startsWith(
        "IGNORE_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      delete PENDING_ENTRIES[
        coin
      ];

      await bot.sendMessage(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    /* ======================================================
       SELL BUTTON
    ====================================================== */

    if (
      data.startsWith(
        "SELL_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      USER_STATE[
        chatId
      ] = {
        step:
          "WAIT_SELL_PRICE",
        coin,
      };

      await bot.sendMessage(
        chatId,
        "📌 ENTER MATCHED SELL PRICE"
      );
    }

    /* ======================================================
       HOLD BUTTON
    ====================================================== */

    if (
      data.startsWith(
        "HOLD_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      if (
        ACTIVE_TRADES[
          coin
        ]
      ) {
        ACTIVE_TRADES[
          coin
        ].tpReached =
          false;

        ACTIVE_TRADES[
          coin
        ].slReached =
          false;
      }

      await bot.sendMessage(
        chatId,
        "📡 Monitoring Resumed"
      );
    }

    /* ======================================================
       CONFIRM BUY = YES
    ====================================================== */

    if (
      data.startsWith(
        "BUYYES_"
      )
    ) {
      const state =
        USER_STATE[
          chatId
        ];

      if (!state) {
        await bot.sendMessage(
          chatId,
          "⚠️ Session expired. Start entry semula."
        );
      } else {
        state.step =
          "WAIT_BUY_PRICE";

        await bot.sendMessage(
          chatId,
          "📌 ENTER MATCHED BUY PRICE"
        );
      }
    }

    /* ======================================================
       CONFIRM BUY = NO
    ====================================================== */

    if (
      data.startsWith(
        "BUYNO_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      delete USER_STATE[
        chatId
      ];

      delete PENDING_ENTRIES[
        coin
      ];

      await bot.sendMessage(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    await bot.answerCallbackQuery(
      query.id
    );
  }
);

/* ============================================================
   TELEGRAM MESSAGE STATE MACHINE
============================================================ */

bot.on(
  "message",
  async (msg) => {
    const chatId =
      msg.chat.id;

    if (
      !USER_STATE[
        chatId
      ]
    ) {
      return;
    }

    const state =
      USER_STATE[
        chatId
      ];

    /* ======================================================
       USER ENTER TARGET NET PROFIT
    ====================================================== */

    if (
      state.step ===
      "WAIT_PROFIT"
    ) {
      const targetProfit =
        safeNumber(
          msg.text
        );

      if (
        targetProfit <= 0
      ) {
        await bot.sendMessage(
          chatId,
          "⚠️ Masukkan target profit yang sah."
        );

        return;
      }

      const entry =
        PENDING_ENTRIES[
          state.coin
        ];

      if (!entry) {
        await bot.sendMessage(
          chatId,
          "⚠️ Entry signal sudah expired."
        );

        delete USER_STATE[
          chatId
        ];

        return;
      }

      const profitPerUnit =
        entry.tp -
        entry.entryPrice;

      const estimatedNetPerUnit =
        profitPerUnit -
        entry.entryPrice *
          BUY_FEE -
        entry.tp *
          SELL_FEE;

      if (
        estimatedNetPerUnit <=
        0
      ) {
        await bot.sendMessage(
          chatId,
          "⚠️ LOW EXECUTION QUALITY"
        );

        return;
      }

      const quantity =
        Math.ceil(
          targetProfit /
            estimatedNetPerUnit
        );

      const value =
        quantity *
        entry.entryPrice;

      const maxCapital =
        MAX_CAPITAL[
          entry.confidence
        ];

      if (
        value >
        maxCapital
      ) {
        await bot.sendMessage(
          chatId,
          "⚠️ REQUIRED CAPITAL TOO HIGH"
        );

        delete USER_STATE[
          chatId
        ];

        return;
      }

      USER_STATE[
        chatId
      ] = {
        step:
          "WAIT_CONFIRM",
        coin:
          entry.coin,
        quantity,
        value,
      };

      const message = `📊 SUGGESTED BUY

🪙 ${entry.coin}

📌 Best Ask:
RM${formatPrice(
        entry.coin,
        entry.bestAsk
      )}

📦 Min Quantity:
${quantity.toLocaleString(
        "en-MY"
      )} ${entry.coin}

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
RM${value.toFixed(
        0
      )}

━━━━━━━━━━━━━━

CONTINUE?`;

      await bot.sendMessage(
        chatId,
        message,
        {
          reply_markup: {
            inline_keyboard:
              [
                [
                  {
                    text:
                      "✅ YES",
                    callback_data:
                      `BUYYES_${entry.coin}`,
                  },
                  {
                    text:
                      "❌ NO",
                    callback_data:
                      `BUYNO_${entry.coin}`,
                  },
                ],
              ],
          },
        }
      );
    }

    /* ======================================================
       USER ENTER MATCHED BUY PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_BUY_PRICE"
    ) {
      const matchedPrice =
        safeNumber(
          msg.text
        );

      if (
        matchedPrice <= 0
      ) {
        await bot.sendMessage(
          chatId,
          "⚠️ Masukkan matched buy price yang sah."
        );

        return;
      }

      const entry =
        PENDING_ENTRIES[
          state.coin
        ];

      if (!entry) {
        await bot.sendMessage(
          chatId,
          "⚠️ Entry signal sudah expired."
        );

        delete USER_STATE[
          chatId
        ];

        return;
      }

      const buyFeeUnit =
        state.quantity *
        BUY_FEE;

      const netTradeUnit =
        state.quantity -
        buyFeeUnit;

      const netTradeValue =
        matchedPrice *
        netTradeUnit;

      ACTIVE_TRADES[
        state.coin
      ] = {
        coin:
          state.coin,

        tp:
          entry.tp,

        sl:
          entry.sl,

        buyPrice:
          matchedPrice,

        quantity:
          state.quantity,

        buyFeeUnit,

        netTradeUnit,

        netTradeValue,

        durationHours:
          entry.durationHours,

        startTime:
          now(),

        tpReached:
          false,

        slReached:
          false,

        durationAlertSent:
          false,
      };

      const message = `✅ TRADE CONFIRMED

🪙 ${state.coin}

📦 Net Trade Unit:
${netTradeUnit.toFixed(
        4
      )} ${state.coin}

💰 Net Trade Value:
RM${netTradeValue.toFixed(
        2
      )}

💸 Fees Luno:
${buyFeeUnit.toFixed(
        4
      )} ${state.coin}

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

      delete PENDING_ENTRIES[
        state.coin
      ];

      delete USER_STATE[
        chatId
      ];
    }

    /* ======================================================
       USER ENTER MATCHED SELL PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_SELL_PRICE"
    ) {
      const matchedPrice =
        safeNumber(
          msg.text
        );

      if (
        matchedPrice <= 0
      ) {
        await bot.sendMessage(
          chatId,
          "⚠️ Masukkan matched sell price yang sah."
        );

        return;
      }

      const trade =
        ACTIVE_TRADES[
          state.coin
        ];

      if (!trade) {
        await bot.sendMessage(
          chatId,
          "⚠️ Active trade tidak dijumpai."
        );

        delete USER_STATE[
          chatId
        ];

        return;
      }

      const sellFeeUnit =
        trade.netTradeUnit *
        SELL_FEE;

      const netSellUnit =
        trade.netTradeUnit -
        sellFeeUnit;

      const netSellValue =
        matchedPrice *
        netSellUnit;

      const pnl =
        netSellValue -
        trade.netTradeValue;

      const message = `✅ SELL TRADE CONFIRMED

🪙 ${state.coin}

💵 Matched Price:
RM${formatPrice(
        state.coin,
        matchedPrice
      )}

📦 Net Sell Unit:
${netSellUnit.toFixed(
        4
      )} ${state.coin}

💰 Net Sell Value:
RM${netSellValue.toFixed(
        2
      )}

💸 Fees Luno:
${sellFeeUnit.toFixed(
        4
      )} ${state.coin}

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

      delete ACTIVE_TRADES[
        state.coin
      ];

      delete USER_STATE[
        chatId
      ];
    }
  }
);
/* ============================================================
   OPTIONAL MANUAL COMMANDS
============================================================ */

bot.onText(
  /\/flow(?:\s+(BTC|GRT))?/i,
  async (
    msg,
    match
  ) => {
    const requestedCoin =
      match?.[1]
        ?.toUpperCase();

    const coins =
      requestedCoin
        ? [
            requestedCoin,
          ]
        : CORE_COINS;

    const sections = [];

    for (
      const coin of
      coins
    ) {
      const data =
        await analyze2HMarketCondition(
          coin
        );

      if (data) {
        sections.push(
          build2HMarketConditionSection(
            data
          )
        );
      }
    }

    if (!sections.length) {
      await bot.sendMessage(
        msg.chat.id,
        `${SERVICE_CODE}

📊 2H MARKET CONDITION

Belum ada data lengkap untuk report 2 jam.`
      );

      return;
    }

    await bot.sendMessage(
      msg.chat.id,
      `${SERVICE_CODE}

📊 2H MARKET CONDITION

${sections.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

bot.onText(
  /\/structure/i,
  async (msg) => {
    const sections = [];

    for (
      const coin of
      CORE_COINS
    ) {
      const data =
        await analyzeMarketStructure(
          coin
        );

      if (data) {
        sections.push(
          buildMarketStructureSection(
            data
          )
        );
      }
    }

    if (!sections.length) {
      await bot.sendMessage(
        msg.chat.id,
        `${SERVICE_CODE}

📊 MARKET STRUCTURE UPDATE

Data belum mencukupi.`
      );

      return;
    }

    await bot.sendMessage(
      msg.chat.id,
      `${SERVICE_CODE}

📊 MARKET STRUCTURE UPDATE

${sections.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

bot.onText(
  /\/status/i,
  async (msg) => {
    const status =
      CORE_COINS.map(
        (coin) =>
          `${coin}: ${
            TRADE_HISTORY[
              coin
            ].length
          } trades stored`
      ).join("\n");

    await bot.sendMessage(
      msg.chat.id,
      `${SERVICE_CODE}

✅ BOT ACTIVE

${status}`
    );
  }
);

/* ============================================================
   EXPRESS
============================================================ */

app.get(
  "/",
  (req, res) => {
    res.json({
      status: "ACTIVE",
      service:
        SERVICE_CODE,
      time:
        new Date().toISOString(),

      alerts: {
        price:
          "5 minutes",

        marketStructure:
          "15 minutes",

        scalping:
          "event based",

        marketCondition:
          "2 hours",
      },

      storedTrades: {
        BTC:
          TRADE_HISTORY
            .BTC.length,

        GRT:
          TRADE_HISTORY
            .GRT.length,
      },
    });
  }
);

app.get(
  "/price/:coin",
  async (req, res) => {
    const coin =
      String(
        req.params.coin ||
          ""
      ).toUpperCase();

    if (
      !SCAN_COINS.includes(
        coin
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Unsupported coin",
        });
    }

    const ticker =
      await getTicker(
        coin
      );

    if (!ticker) {
      return res
        .status(502)
        .json({
          error:
            "Unable to fetch ticker",
        });
    }

    return res.json(
      ticker
    );
  }
);

app.get(
  "/flow/:coin",
  async (req, res) => {
    const coin =
      String(
        req.params.coin ||
          ""
      ).toUpperCase();

    if (
      !CORE_COINS.includes(
        coin
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Only BTC and GRT are supported",
        });
    }

    const data =
      await analyze2HMarketCondition(
        coin
      );

    return res.json({
      ready:
        Boolean(data),

      data,
    });
  }
);

/* ============================================================
   STARTUP
============================================================ */

app.listen(
  PORT,
  async () => {
    console.log(
      `RUNNING ${PORT} ${SERVICE_CODE}`
    );

    /*
      First fetch immediately
      supaya bot terus mula kumpul data
      tanpa tunggu interval pertama.
    */

    await collectTradeHistory();

    await updateMemory();

    await sendTelegram(
      `✅ BOT ONLINE

🚀 INSTITUTIONAL SCALPING TERMINAL ACTIVE

📡 PRICE ALERT: 5 MIN
📊 MARKET STRUCTURE: 15 MIN
🚀 SCALPING ENTRY: ACTIVE
📊 2H MARKET CONDITION: ACTIVE`
    );
  }
);

/* ============================================================
   SCHEDULES
============================================================ */

/*
  Collect real executed Luno trades.
*/

setInterval(
  collectTradeHistory,
  TRADE_COLLECT_INTERVAL
);

/*
  Store real ticker prices
  untuk trend / support / resistance.
*/

setInterval(
  updateMemory,
  PRICE_MEMORY_INTERVAL
);

/*
  Scalping scan setiap 1 minit.
*/

setInterval(
  scanSignals,
  SCALPING_SCAN_INTERVAL
);

/*
  PRICE ALERT
  setiap 5 minit.
*/

setInterval(
  sendPriceAlert,
  PRICE_ALERT_INTERVAL
);

/*
  MARKET STRUCTURE
  full screening setiap 15 minit.
*/

setInterval(
  sendMarketStructure,
  MARKET_STRUCTURE_INTERVAL
);

/*
  2H MARKET CONDITION
  setiap 2 jam.

  Kalau data tak cukup:
  DIAM.
*/

setInterval(
  send2HMarketCondition,
  FLOW_REPORT_INTERVAL
);

/*
  Monitor active trade:
  TP / SL / duration
  setiap 15 saat.
*/

setInterval(
  monitorTrades,
  TRADE_MONITOR_INTERVAL
);
