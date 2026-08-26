require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

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
   UNIQUE SERVICE CODE
============================================================ */

const SERVICE_CODE = `[${Math.random()
  .toString(36)
  .substring(2, 6)
  .toUpperCase()}]`;

/* ============================================================
   FEES
============================================================ */

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

/* ============================================================
   COINS
============================================================ */

const SCAN_COINS = [
  "BTC",
  "GRT",
  "XRP",
  "XLM",
  "CRV",
  "AAVE",
];

const CORE_COINS = [
  "BTC",
  "GRT",
];

/* ============================================================
   STATES
============================================================ */

const ACTIVE_TRADES = {};
const PENDING_ENTRIES = {};
const USER_STATE = {};

const LAST_SIGNAL = {};
const LAST_PRICE = {};

const PRICE_MEMORY = {};

const BREAKOUT_WATCH = {};

const LAST_FAKE_BREAKOUT = {};
const LAST_CONFIRMED_BREAKOUT = {};

/* ============================================================
   TRADE HISTORY
============================================================ */

const TRADE_HISTORY = Object.fromEntries(
  SCAN_COINS.map((coin) => [
    coin,
    [],
  ])
);

const SEEN_TRADE_SEQUENCES = Object.fromEntries(
  SCAN_COINS.map((coin) => [
    coin,
    new Set(),
  ])
);

/* ============================================================
   SERVER TIME
============================================================ */

const BOT_STARTED_AT = Date.now();

/* ============================================================
   INTERVALS
============================================================ */

const PRICE_ALERT_INTERVAL =
  5 * 60 * 1000;

const MARKET_STRUCTURE_INTERVAL =
  15 * 60 * 1000;

const SCALPING_SCAN_INTERVAL =
  60 * 1000;

const TRADE_COLLECT_INTERVAL =
  5 * 1000;

const PRICE_MEMORY_INTERVAL =
  15 * 1000;

const TRADE_MONITOR_INTERVAL =
  15 * 1000;

/* ============================================================
   TIME WINDOWS
============================================================ */

const TWO_HOURS =
  2 * 60 * 60 * 1000;

const SIX_HOURS =
  6 * 60 * 60 * 1000;

const TWENTY_FOUR_HOURS =
  24 * 60 * 60 * 1000;

const HISTORY_KEEP_MS =
  26 * 60 * 60 * 1000;

const TWO_HOUR_MIN_COVERAGE_MS =
  90 * 60 * 1000;

/* ============================================================
   COOLDOWNS
============================================================ */

const GLOBAL_SCALPING_COOLDOWN =
  5 * 60 * 1000;

const PER_COIN_COOLDOWN =
  10 * 60 * 1000;

let LAST_GLOBAL_SIGNAL = 0;

/* ============================================================
   ORDERBOOK MARKET STRUCTURE CONFIG
============================================================ */

const ORDERBOOK_STRUCTURE_RANGE_PCT = {
  BTC: 2.00,
  GRT: 3.00,
  XRP: 3.00,
  XLM: 3.00,
  CRV: 3.00,
  AAVE: 3.00,
};

const ORDERBOOK_CLUSTER_PCT = {
  BTC: 0.08,
  GRT: 0.15,
  XRP: 0.15,
  XLM: 0.15,
  CRV: 0.15,
  AAVE: 0.15,
};

const MIN_WALL_RELATIVE_RATIO =
  1.20;

const WALL_DISTANCE_WEIGHT =
  0.35;

/* ============================================================
   BREAKOUT CONFIG
============================================================ */

const BREAKOUT_BUFFER_PCT =
  0.10;

const BREAKOUT_HOLD_BUFFER_PCT =
  0.05;

const BREAKOUT_FAILURE_BUFFER_PCT =
  0.35;

const BREAKOUT_HARD_FAILURE_PCT =
  0.60;

const BREAKOUT_WATCH_MAX_DISTANCE_PCT =
  1.00;

const FAKE_BREAKOUT_VISIBLE_MS =
  30 * 60 * 1000;

const CONFIRMED_BREAKOUT_VISIBLE_MS =
  30 * 60 * 1000;

const CONFIRMED_STRUCTURE_TOLERANCE_PCT =
  0.50;

/* ============================================================
   ENTRY CONFIG
============================================================ */

const MAX_ENTRY_CHASE_PCT =
  0.30;

const MIN_GROSS_ROOM_PCT =
  1.30;

/* ============================================================
   DEFAULT TP
============================================================ */

const DEFAULT_BREAKOUT_TP_PCT = {
  BTC: 1.60,
  GRT: 2.00,
  XRP: 2.50,
  XLM: 2.50,
  CRV: 2.50,
  AAVE: 2.00,
};

/* ============================================================
   MAX CAPITAL
============================================================ */

const MAX_CAPITAL = {
  WEAK: 5000,
  MID: 15000,
  STRONG: 30000,
};

/* ============================================================
   LUNO AUTHENTICATED MARKET DATA
============================================================ */

const LUNO_API_KEY_ID =
  process.env.LUNO_API_KEY_ID ||
  "";

const LUNO_API_KEY_SECRET =
  process.env.LUNO_API_KEY_SECRET ||
  "";

/* ============================================================
   5M MOMENTUM CONFIG
============================================================ */

const MOMENTUM_CANDLE_DURATION_SEC =
  5 * 60;

const MOMENTUM_BASELINE_WINDOWS =
  12;

const MOMENTUM_MIN_BASELINE_WINDOWS =
  3;

const MOMENTUM_SPIKE_THRESHOLD_PCT =
  30;

const MOMENTUM_MIN_CURRENT_CANDLE_AGE_SEC =
  60;

const GRT_RSI_PERIOD =
  14;

const GRT_MA_FAST =
  9;

const GRT_MA_SLOW =
  50;

const GRT_MA_NEAR_CROSS_PCT =
  0.20;

/* ============================================================
   GRT DAILY WATCH CONFIG
============================================================ */

const MALAYSIA_TIMEZONE =
  "Asia/Kuala_Lumpur";

const GRT_DAILY_HISTORY_DAYS =
  7;

const DAILY_WATCH_CHECK_INTERVAL =
  60 * 1000;

const DAILY_WATCH_SAVE_INTERVAL =
  60 * 1000;

const DAILY_WATCH_FILE =
  process.env.DAILY_WATCH_FILE ||
  "/tmp/grt-daily-watch.json";

let GRT_DAILY_STATE =
  null;

let GRT_DAILY_HISTORY =
  [];

let LAST_DAILY_REPORT_KEY =
  null;

/* ============================================================
   MALAYSIA DATE / TIME HELPERS
============================================================ */

function getMalaysiaDateParts(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          MALAYSIA_TIMEZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      date
    );

  const values = {};

  for (
    const part of
    parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] =
        part.value;
    }
  }

  return {
    year:
      Number(
        values.year
      ),

    month:
      Number(
        values.month
      ),

    day:
      Number(
        values.day
      ),

    hour:
      Number(
        values.hour
      ),

    minute:
      Number(
        values.minute
      ),

    second:
      Number(
        values.second
      ),
  };
}

function getMalaysiaDateKey(
  date = new Date()
) {
  const parts =
    getMalaysiaDateParts(
      date
    );

  const year =
    String(
      parts.year
    );

  const month =
    String(
      parts.month
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      parts.day
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatMalaysiaDateLabel(
  dateKey
) {
  if (
    !dateKey
  ) {
    return "UNKNOWN DATE";
  }

  const [
    year,
    month,
    day,
  ] =
    dateKey.split(
      "-"
    );

  const date =
    new Date(
      `${year}-${month}-${day}T00:00:00+08:00`
    );

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        MALAYSIA_TIMEZONE,

      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  )
    .format(
      date
    )
    .toUpperCase();
}

/* ============================================================
   GRT DAILY WATCH STATE
============================================================ */

function createDailyWatchState(
  dateKey =
    getMalaysiaDateKey()
) {
  return {
    dateKey,

    createdAt:
      Date.now(),

    grtOpen:
      null,

    grtHigh:
      null,

    grtLow:
      null,

    grtClose:
      null,

    btcOpen:
      null,

    btcClose:
      null,

    buyExecutions:
      0,

    sellExecutions:
      0,

    buyVolume:
      0,

    sellVolume:
      0,
  };
}

function ensureDailyWatchState() {
  const today =
    getMalaysiaDateKey();

  if (
    !GRT_DAILY_STATE
  ) {
    GRT_DAILY_STATE =
      createDailyWatchState(
        today
      );
  }

  return GRT_DAILY_STATE;
}

function updateDailyWatchPrice(
  coin,
  price
) {
  if (
    !price ||
    price <= 0
  ) {
    return;
  }

  const state =
    ensureDailyWatchState();

  const today =
    getMalaysiaDateKey();

  if (
    state.dateKey !==
    today
  ) {
    return;
  }

  if (
    coin ===
    "GRT"
  ) {
    if (
      state.grtOpen ===
      null
    ) {
      state.grtOpen =
        price;
    }

    state.grtClose =
      price;

    state.grtHigh =
      state.grtHigh ===
        null
        ? price
        : Math.max(
            state.grtHigh,
            price
          );

    state.grtLow =
      state.grtLow ===
        null
        ? price
        : Math.min(
            state.grtLow,
            price
          );
  }

  if (
    coin ===
    "BTC"
  ) {
    if (
      state.btcOpen ===
      null
    ) {
      state.btcOpen =
        price;
    }

    state.btcClose =
      price;
  }
}

function updateDailyWatchTrade(
  coin,
  trade
) {
  if (
    coin !==
      "GRT" ||
    !trade
  ) {
    return;
  }

  const state =
    ensureDailyWatchState();

  const tradeDateKey =
    getMalaysiaDateKey(
      new Date(
        trade.timestamp
      )
    );

  if (
    tradeDateKey !==
    state.dateKey
  ) {
    return;
  }

  if (
    trade.isBuy
  ) {
    state.buyExecutions +=
      1;

    state.buyVolume +=
      trade.volume;
  } else {
    state.sellExecutions +=
      1;

    state.sellVolume +=
      trade.volume;
  }
}

/* ============================================================
   DAILY WATCH SNAPSHOT
============================================================ */

function saveDailyWatchSnapshot() {
  try {
    fs.writeFileSync(
      DAILY_WATCH_FILE,
      JSON.stringify(
        {
          state:
            GRT_DAILY_STATE,

          history:
            GRT_DAILY_HISTORY,

          lastReportKey:
            LAST_DAILY_REPORT_KEY,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.log(
      "Daily watch save error:",
      error.message
    );
  }
}

function loadDailyWatchSnapshot() {
  try {
    if (
      !fs.existsSync(
        DAILY_WATCH_FILE
      )
    ) {
      return;
    }

    const raw =
      fs.readFileSync(
        DAILY_WATCH_FILE,
        "utf8"
      );

    if (
      !raw
    ) {
      return;
    }

    const parsed =
      JSON.parse(
        raw
      );

    if (
      parsed.state
    ) {
      GRT_DAILY_STATE =
        parsed.state;
    }

    if (
      Array.isArray(
        parsed.history
      )
    ) {
      GRT_DAILY_HISTORY =
        parsed.history.slice(
          -GRT_DAILY_HISTORY_DAYS
        );
    }

    if (
      parsed.lastReportKey
    ) {
      LAST_DAILY_REPORT_KEY =
        parsed.lastReportKey;
    }
  } catch (error) {
    console.log(
      "Daily watch load error:",
      error.message
    );
  }
}

/* ============================================================
   BASIC HELPERS
============================================================ */

function now() {
  return Date.now();
}

function safeNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}

function percentChange(
  from,
  to
) {
  if (
    !from
  ) {
    return 0;
  }

  return (
    (
      to -
      from
    ) /
    from
  ) * 100;
}

function average(
  values
) {
  if (
    !values.length
  ) {
    return 0;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    values.length
  );
}

function median(
  values
) {
  if (
    !values.length
  ) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (
      a,
      b
    ) =>
      a - b
  );

  const middle =
    Math.floor(
      sorted.length /
      2
    );

  if (
    sorted.length %
    2
  ) {
    return sorted[
      middle
    ];
  }

  return (
    sorted[
      middle - 1
    ] +
    sorted[
      middle
    ]
  ) / 2;
}

/* ============================================================
   INPUT VALIDATION
============================================================ */

function parseUserNumber(
  input
) {
  const raw =
    String(
      input ?? ""
    )
      .replace(
        /,/g,
        ""
      )
      .trim();

  if (
    raw === ""
  ) {
    return {
      valid:
        false,

      value:
        null,
    };
  }

  const value =
    Number(raw);

  if (
    !Number.isFinite(
      value
    )
  ) {
    return {
      valid:
        false,

      value:
        null,
    };
  }

  return {
    valid:
      true,

    value,
  };
}

/* ============================================================
   FORMAT
============================================================ */

function pairForCoin(
  coin
) {
  if (
    coin ===
    "BTC"
  ) {
    return "XBTMYR";
  }

  return `${coin}MYR`;
}

function formatPrice(
  coin,
  value
) {
  if (
    coin ===
    "BTC"
  ) {
    return safeNumber(
      value
    ).toFixed(
      2
    );
  }

  return safeNumber(
    value
  ).toFixed(
    4
  );
}

function formatPercent(
  value,
  digits = 2
) {
  const number =
    safeNumber(
      value
    );

  return `${
    number >= 0
      ? "+"
      : ""
  }${number.toFixed(
    digits
  )}%`;
}

function formatMoney(
  value
) {
  const number =
    safeNumber(
      value
    );

  if (
    number >= 0
  ) {
    return `RM${number.toFixed(
      2
    )}`;
  }

  return `-RM${Math.abs(
    number
  ).toFixed(
    2
  )}`;
}

/* ============================================================
   TELEGRAM HELPERS
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

async function replyTelegram(
  chatId,
  message,
  options = {}
) {
  try {
    return await bot.sendMessage(
      chatId,
      `${SERVICE_CODE}\n\n${message}`,
      options
    );
  } catch (error) {
    console.log(
      "Telegram reply error:",
      error.response?.data ||
        error.message
    );

    return null;
  }
}

/* ============================================================
   LUNO TICKER
============================================================ */

async function getTicker(
  coin
) {
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

          timeout:
            10000,
        }
      );

    return {
      coin,

      currentPrice:
        safeNumber(
          response
            .data
            .last_trade
        ),

      bestAsk:
        safeNumber(
          response
            .data
            .ask
        ),

      bestBid:
        safeNumber(
          response
            .data
            .bid
        ),

      timestamp:
        safeNumber(
          response
            .data
            .timestamp
        ) ||
        now(),
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

/* ============================================================
   LUNO TOP ORDERBOOK
============================================================ */

async function getTopOrderBook(
  coin
) {
  try {
    const response =
      await axios.get(
        "https://api.luno.com/api/1/orderbook_top",
        {
          params: {
            pair:
              pairForCoin(
                coin
              ),
          },

          timeout:
            10000,
        }
      );

    const asks =
      Array.isArray(
        response.data
          ?.asks
      )
        ? response.data.asks
            .map(
              (order) => ({
                price:
                  safeNumber(
                    order.price
                  ),

                volume:
                  safeNumber(
                    order.volume
                  ),
              })
            )
            .filter(
              (order) =>
                order.price >
                  0 &&
                order.volume >
                  0
            )
            .sort(
              (
                a,
                b
              ) =>
                a.price -
                b.price
            )
        : [];

    const bids =
      Array.isArray(
        response.data
          ?.bids
      )
        ? response.data.bids
            .map(
              (order) => ({
                price:
                  safeNumber(
                    order.price
                  ),

                volume:
                  safeNumber(
                    order.volume
                  ),
              })
            )
            .filter(
              (order) =>
                order.price >
                  0 &&
                order.volume >
                  0
            )
            .sort(
              (
                a,
                b
              ) =>
                b.price -
                a.price
            )
        : [];

    return {
      coin,
      asks,
      bids,

      timestamp:
        safeNumber(
          response.data
            ?.timestamp
        ) ||
        now(),
    };
  } catch (error) {
    console.log(
      `Orderbook ${coin}:`,
      error.response?.data ||
        error.message
    );

    return null;
  }
}

/* ============================================================
   LUNO EXECUTED TRADES
============================================================ */

async function getRecentTrades(
  coin,
  since = null
) {
  try {
    const params = {
      pair:
        pairForCoin(
          coin
        ),
    };

    if (
      since
    ) {
      params.since =
        since;
    }

    const response =
      await axios.get(
        "https://api.luno.com/api/1/trades",
        {
          params,

          timeout:
            10000,
        }
      );

    const trades =
      Array.isArray(
        response.data
          ?.trades
      )
        ? response.data
            .trades
        : [];

    return trades
      .map(
        (trade) => ({
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
        })
      )
      .filter(
        (trade) =>
          trade.timestamp >
            0 &&
          trade.price >
            0 &&
          trade.volume >
            0
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
    !PRICE_MEMORY[
      coin
    ]
  ) {
    PRICE_MEMORY[
      coin
    ] = [];
  }

  PRICE_MEMORY[
    coin
  ].push({
    price,

    time:
      timestamp,
  });

  const cutoff =
    now() -
    HISTORY_KEEP_MS;

  PRICE_MEMORY[
    coin
  ] =
    PRICE_MEMORY[
      coin
    ].filter(
      (item) =>
        item.time >=
        cutoff
    );
}

async function updateMemory() {
  for (
    const coin of
    SCAN_COINS
  ) {
    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      continue;
    }

    updatePriceMemory(
      coin,
      ticker.currentPrice,
      ticker.timestamp
    );

    if (
      coin ===
        "BTC" ||
      coin ===
        "GRT"
    ) {
      updateDailyWatchPrice(
        coin,
        ticker.currentPrice
      );
    }
  }
}

function getPriceMemoryWindow(
  coin,
  durationMs
) {
  const cutoff =
    now() -
    durationMs;

  return (
    PRICE_MEMORY[
      coin
    ] || []
  ).filter(
    (item) =>
      item.time >=
      cutoff
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

  const prices =
    data.map(
      (item) =>
        item.price
    );

  const high =
    Math.max(
      ...prices
    );

  const low =
    Math.min(
      ...prices
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
   TRADE HISTORY CLEANUP
============================================================ */

function purgeOldTrades(
  coin
) {
  const cutoff =
    now() -
    HISTORY_KEEP_MS;

  TRADE_HISTORY[
    coin
  ] =
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
  ] =
    new Set(
      TRADE_HISTORY[
        coin
      ].map(
        (trade) =>
          trade.sequence
      )
    );
}

/* ============================================================
   REAL EXECUTED TRADE COLLECTOR
============================================================ */

async function collectTradesForCoin(
  coin
) {
  const existing =
    TRADE_HISTORY[
      coin
    ] || [];

  let since =
    null;

  if (
    existing.length
  ) {
    const recent =
      existing.slice(
        -20
      );

    since =
      Math.max(
        ...recent.map(
          (trade) =>
            trade.timestamp
        )
      ) -
      1000;
  }

  const trades =
    await getRecentTrades(
      coin,
      since
    );

  if (
    !trades.length
  ) {
    return;
  }

  const newTrades = [];

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
    ].push(
      trade
    );

    newTrades.push(
      trade
    );
  }

  TRADE_HISTORY[
    coin
  ].sort(
    (
      a,
      b
    ) =>
      a.timestamp -
      b.timestamp
  );

  purgeOldTrades(
    coin
  );

  newTrades.sort(
    (
      a,
      b
    ) =>
      a.timestamp -
      b.timestamp
  );

  for (
    const trade of
    newTrades
  ) {
    updateDailyWatchTrade(
      coin,
      trade
    );

    await processBreakoutWatchTrade(
      coin,
      trade
    );
  }
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

/* ============================================================
   GET TRADES IN WINDOW
============================================================ */

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

/* ============================================================
   SUMMARIZE EXECUTED TRADES
============================================================ */

function summarizeTrades(
  coin,
  trades
) {
  if (
    !trades.length
  ) {
    return null;
  }

  const sorted = [
    ...trades,
  ].sort(
    (
      a,
      b
    ) =>
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
    if (
      trade.isBuy
    ) {
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
        ? (
            buyVolume /
            totalVolume
          ) * 100
        : 0,

    sellPct:
      totalVolume > 0
        ? (
            sellVolume /
            totalVolume
          ) * 100
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
   PRICE ALERT — 5 MIN
============================================================ */

async function sendPriceAlert() {
  const btc =
    await getTicker(
      "BTC"
    );

  const grt =
    await getTicker(
      "GRT"
    );

  if (
    !btc ||
    !grt
  ) {
    return;
  }

  const btcMomentum =
    await getBTCMomentumText();

  const grtMomentum =
    await getGRTMomentumDecision(
      grt
    );

  const buildPriceMove = (
    coin,
    ticker
  ) => {
    const previous =
      LAST_PRICE[
        coin
      ];

    LAST_PRICE[
      coin
    ] =
      ticker.currentPrice;

    if (
      !previous
    ) {
      return "";
    }

    const change =
      percentChange(
        previous,
        ticker.currentPrice
      );

    if (
      Math.abs(
        change
      ) <
      0.005
    ) {
      return "";
    }

    return ` ${
      change > 0
        ? "⬆️"
        : "⬇️"
    } ${formatPercent(
      change
    )}`;
  };

  const btcMove =
    buildPriceMove(
      "BTC",
      btc
    );

  const grtMove =
    buildPriceMove(
      "GRT",
      grt
    );

  const grtAction =
    grtMomentum.actionText
      ? `\n${grtMomentum.actionText}`
      : "";

  await sendTelegram(
    `📡 PRICE ALERT

₿ BTC RM${formatPrice(
      "BTC",
      btc.currentPrice
    )}${btcMove}
⚡ MOMENTUM: ${btcMomentum}

🪙 GRT RM${formatPrice(
      "GRT",
      grt.currentPrice
    )}${grtMove}
⚡ MOMENTUM: ${grtMomentum.momentumText}${grtAction}`
  );
}
/* ============================================================
   AUTHENTICATED LUNO CANDLES
============================================================ */

async function getLunoCandles(
  coin,
  durationSec,
  candleCount
) {
  if (
    !LUNO_API_KEY_ID ||
    !LUNO_API_KEY_SECRET
  ) {
    return [];
  }

  try {
    const since =
      now() -
      (
        durationSec *
        candleCount *
        1000
      );

    const response =
      await axios.get(
        "https://api.luno.com/api/exchange/1/candles",
        {
          params: {
            pair:
              pairForCoin(
                coin
              ),

            since,

            duration:
              durationSec,
          },

          auth: {
            username:
              LUNO_API_KEY_ID,

            password:
              LUNO_API_KEY_SECRET,
          },

          timeout:
            10000,
        }
      );

    const candles =
      Array.isArray(
        response.data
          ?.candles
      )
        ? response.data.candles
        : [];

    return candles
      .map(
        (candle) => ({
          timestamp:
            safeNumber(
              candle.timestamp
            ),

          open:
            safeNumber(
              candle.open
            ),

          close:
            safeNumber(
              candle.close
            ),

          high:
            safeNumber(
              candle.high
            ),

          low:
            safeNumber(
              candle.low
            ),

          volume:
            safeNumber(
              candle.volume
            ),
        })
      )
      .filter(
        (candle) =>
          candle.timestamp >
            0 &&
          candle.close >
            0
      )
      .sort(
        (
          a,
          b
        ) =>
          a.timestamp -
          b.timestamp
      );
  } catch (error) {
    console.log(
      `Candles ${coin} ${durationSec}:`,
      error.response?.data ||
        error.message
    );

    return [];
  }
}

/* ============================================================
   SIMPLE MOVING AVERAGE
============================================================ */

function calculateSMA(
  values,
  period
) {
  if (
    !Array.isArray(
      values
    ) ||
    values.length <
      period
  ) {
    return null;
  }

  const selected =
    values.slice(
      -period
    );

  return average(
    selected
  );
}

/* ============================================================
   RSI
============================================================ */

function calculateRSI(
  closes,
  period =
    14
) {
  if (
    !Array.isArray(
      closes
    ) ||
    closes.length <
      period + 1
  ) {
    return null;
  }

  const changes = [];

  for (
    let i = 1;
    i <
      closes.length;
    i++
  ) {
    changes.push(
      closes[i] -
      closes[i - 1]
    );
  }

  const recentChanges =
    changes.slice(
      -(period + 5)
    );

  if (
    recentChanges.length <
    period
  ) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  const initial =
    recentChanges.slice(
      0,
      period
    );

  for (
    const change of
    initial
  ) {
    if (
      change >
      0
    ) {
      gains +=
        change;
    } else {
      losses +=
        Math.abs(
          change
        );
    }
  }

  let averageGain =
    gains /
    period;

  let averageLoss =
    losses /
    period;

  for (
    let i =
      period;
    i <
      recentChanges.length;
    i++
  ) {
    const change =
      recentChanges[i];

    const gain =
      change >
        0
        ? change
        : 0;

    const loss =
      change <
        0
        ? Math.abs(
            change
          )
        : 0;

    averageGain =
      (
        averageGain *
          (
            period -
            1
          ) +
        gain
      ) /
      period;

    averageLoss =
      (
        averageLoss *
          (
            period -
            1
          ) +
        loss
      ) /
      period;
  }

  if (
    averageLoss ===
    0
  ) {
    return 100;
  }

  const relativeStrength =
    averageGain /
    averageLoss;

  return (
    100 -
    (
      100 /
      (
        1 +
        relativeStrength
      )
    )
  );
}

/* ============================================================
   5M COMPLETED VOLUME WINDOWS FROM EXECUTED TRADES

   Used as fallback when authenticated candle history
   is not yet available.

   Current unfinished 5M window is NOT included
   inside its own baseline.
============================================================ */

function getExecuted5MWindows(
  coin,
  numberOfWindows =
    13
) {
  const windowMs =
    5 *
    60 *
    1000;

  const currentWindowStart =
    Math.floor(
      now() /
      windowMs
    ) *
    windowMs;

  const windows = [];

  for (
    let index =
      numberOfWindows;
    index >= 1;
    index--
  ) {
    const start =
      currentWindowStart -
      (
        index *
        windowMs
      );

    const end =
      start +
      windowMs -
      1;

    const trades =
      getTradesInWindow(
        coin,
        start,
        end
      );

    const totalVolume =
      trades.reduce(
        (
          total,
          trade
        ) =>
          total +
          trade.volume,
        0
      );

    windows.push({
      start,
      end,
      volume:
        totalVolume,
    });
  }

  return windows;
}

/* ============================================================
   CURRENT 5M EXECUTED VOLUME
============================================================ */

function getCurrent5MExecutedVolume(
  coin
) {
  const windowMs =
    5 *
    60 *
    1000;

  const start =
    Math.floor(
      now() /
      windowMs
    ) *
    windowMs;

  const trades =
    getTradesInWindow(
      coin,
      start,
      now()
    );

  return {
    start,

    ageSec:
      (
        now() -
        start
      ) /
      1000,

    volume:
      trades.reduce(
        (
          total,
          trade
        ) =>
          total +
          trade.volume,
        0
      ),

    trades,
  };
}

/* ============================================================
   MOMENTUM VOLUME BASELINE

   Rule:
   Current 5M volume
   VS
   average of previous completed 5M windows.

   Full baseline:
   previous 12 windows = 1 hour.

   Warm-up:
   minimum 3 completed windows.
============================================================ */

async function getMomentumVolumeData(
  coin
) {
  const current =
    getCurrent5MExecutedVolume(
      coin
    );

  /*
    Prefer authenticated candle history
    because this gives historical baseline
    immediately after deploy.
  */

  const candles =
    await getLunoCandles(
      coin,
      MOMENTUM_CANDLE_DURATION_SEC,
      MOMENTUM_BASELINE_WINDOWS +
        3
    );

  let baselineVolumes =
    [];

  if (
    candles.length >=
    MOMENTUM_MIN_BASELINE_WINDOWS
  ) {
    const currentWindowStart =
      Math.floor(
        now() /
        (
          MOMENTUM_CANDLE_DURATION_SEC *
          1000
        )
      ) *
      (
        MOMENTUM_CANDLE_DURATION_SEC *
        1000
      );

    baselineVolumes =
      candles
        .filter(
          (candle) =>
            candle.timestamp <
            currentWindowStart
        )
        .slice(
          -MOMENTUM_BASELINE_WINDOWS
        )
        .map(
          (candle) =>
            candle.volume
        )
        .filter(
          (volume) =>
            volume >
            0
        );
  }

  /*
    Fallback kepada local executed history.
  */

  if (
    baselineVolumes.length <
    MOMENTUM_MIN_BASELINE_WINDOWS
  ) {
    const localWindows =
      getExecuted5MWindows(
        coin,
        MOMENTUM_BASELINE_WINDOWS
      );

    baselineVolumes =
      localWindows
        .map(
          (item) =>
            item.volume
        )
        .filter(
          (volume) =>
            volume >
            0
        );
  }

  if (
    baselineVolumes.length <
    MOMENTUM_MIN_BASELINE_WINDOWS
  ) {
    return {
      ready:
        false,

      currentVolume:
        current.volume,

      baselineWindowCount:
        baselineVolumes.length,

      baselineAverage:
        null,

      spikePct:
        null,

      isSpike:
        false,

      ageSec:
        current.ageSec,

      trades:
        current.trades,
    };
  }

  const selectedBaseline =
    baselineVolumes.slice(
      -MOMENTUM_BASELINE_WINDOWS
    );

  const baselineAverage =
    average(
      selectedBaseline
    );

  if (
    baselineAverage <=
    0
  ) {
    return {
      ready:
        false,

      currentVolume:
        current.volume,

      baselineWindowCount:
        selectedBaseline.length,

      baselineAverage:
        0,

      spikePct:
        null,

      isSpike:
        false,

      ageSec:
        current.ageSec,

      trades:
        current.trades,
    };
  }

  const spikePct =
    (
      (
        current.volume -
        baselineAverage
      ) /
      baselineAverage
    ) *
    100;

  const oldEnough =
    current.ageSec >=
    MOMENTUM_MIN_CURRENT_CANDLE_AGE_SEC;

  return {
    ready:
      true,

    currentVolume:
      current.volume,

    baselineAverage,

    baselineWindowCount:
      selectedBaseline.length,

    spikePct,

    isSpike:
      oldEnough &&
      spikePct >=
        MOMENTUM_SPIKE_THRESHOLD_PCT,

    ageSec:
      current.ageSec,

    trades:
      current.trades,
  };
}

/* ============================================================
   BTC MOMENTUM TEXT

   BTC is radar only.
   BTC NEVER participates in GRT BUY NOW decision.
============================================================ */

async function getBTCMomentumText() {
  const volumeData =
    await getMomentumVolumeData(
      "BTC"
    );

  if (
    !volumeData.ready
  ) {
    return "⚪ COLLECTING DATA";
  }

  if (
    !volumeData.isSpike
  ) {
    return "🔴 NO SPIKE";
  }

  return `🟢 SPIKE +${Math.max(
    0,
    volumeData.spikePct
  ).toFixed(
    0
  )}%`;
}

/* ============================================================
   GRT 5M RSI ANALYSIS
============================================================ */

async function getGRT5MRSI() {
  const candles =
    await getLunoCandles(
      "GRT",
      300,
      30
    );

  if (
    candles.length <
    GRT_RSI_PERIOD +
      3
  ) {
    return {
      ready:
        false,

      current:
        null,

      previous:
        null,

      direction:
        "UNKNOWN",
    };
  }

  const closes =
    candles.map(
      (candle) =>
        candle.close
    );

  const current =
    calculateRSI(
      closes,
      GRT_RSI_PERIOD
    );

  const previous =
    calculateRSI(
      closes.slice(
        0,
        -1
      ),
      GRT_RSI_PERIOD
    );

  let direction =
    "FLAT";

  if (
    current !==
      null &&
    previous !==
      null
  ) {
    if (
      current >
      previous +
        1
    ) {
      direction =
        "RISING";
    } else if (
      current <
      previous -
        1
    ) {
      direction =
        "FALLING";
    }
  }

  return {
    ready:
      current !==
      null,

    current,

    previous,

    direction,
  };
}

/* ============================================================
   GRT 1H MA9 / MA50
============================================================ */

async function getGRT1HMATrend() {
  const candles =
    await getLunoCandles(
      "GRT",
      3600,
      70
    );

  if (
    candles.length <
    GRT_MA_SLOW +
      2
  ) {
    return {
      ready:
        false,

      ma9:
        null,

      ma50:
        null,

      previousMA9:
        null,

      previousMA50:
        null,

      status:
        "UNKNOWN",
    };
  }

  const closes =
    candles.map(
      (candle) =>
        candle.close
    );

  const ma9 =
    calculateSMA(
      closes,
      GRT_MA_FAST
    );

  const ma50 =
    calculateSMA(
      closes,
      GRT_MA_SLOW
    );

  const previousCloses =
    closes.slice(
      0,
      -1
    );

  const previousMA9 =
    calculateSMA(
      previousCloses,
      GRT_MA_FAST
    );

  const previousMA50 =
    calculateSMA(
      previousCloses,
      GRT_MA_SLOW
    );

  if (
    ma9 === null ||
    ma50 === null
  ) {
    return {
      ready:
        false,

      ma9,
      ma50,

      previousMA9,
      previousMA50,

      status:
        "UNKNOWN",
    };
  }

  const gapPct =
    percentChange(
      ma50,
      ma9
    );

  let status =
    "BEARISH";

  if (
    previousMA9 !==
      null &&
    previousMA50 !==
      null &&
    previousMA9 <=
      previousMA50 &&
    ma9 >
      ma50
  ) {
    status =
      "CROSS UP";
  } else if (
    ma9 >
    ma50
  ) {
    status =
      "BULLISH";
  } else if (
    Math.abs(
      gapPct
    ) <=
    GRT_MA_NEAR_CROSS_PCT
  ) {
    status =
      "NEAR CROSS";
  } else {
    status =
      "BEARISH";
  }

  return {
    ready:
      true,

    ma9,
    ma50,

    previousMA9,
    previousMA50,

    gapPct,

    status,
  };
}

/* ============================================================
   ORDERBOOK ZONE CLUSTERING
============================================================ */

function clusterOrderBookSide(
  orders,
  tolerancePct
) {
  if (
    !orders ||
    !orders.length
  ) {
    return [];
  }

  const clusters = [];

  for (
    const order of
    orders
  ) {
    let matchedCluster =
      null;

    for (
      const cluster of
      clusters
    ) {
      const distancePct =
        Math.abs(
          percentChange(
            cluster.price,
            order.price
          )
        );

      if (
        distancePct <=
        tolerancePct
      ) {
        matchedCluster =
          cluster;

        break;
      }
    }

    if (
      !matchedCluster
    ) {
      clusters.push({
        price:
          order.price,

        volume:
          order.volume,

        orders: [
          order,
        ],
      });

      continue;
    }

    matchedCluster
      .orders
      .push(
        order
      );

    matchedCluster.volume +=
      order.volume;

    const weightedValue =
      matchedCluster.orders.reduce(
        (
          total,
          item
        ) =>
          total +
          (
            item.price *
            item.volume
          ),
        0
      );

    const totalVolume =
      matchedCluster.orders.reduce(
        (
          total,
          item
        ) =>
          total +
          item.volume,
        0
      );

    matchedCluster.price =
      totalVolume >
        0
        ? weightedValue /
          totalVolume
        : matchedCluster.price;
  }

  return clusters;
}

/* ============================================================
   FILTER RELEVANT ORDERBOOK RANGE
============================================================ */

function getRelevantOrderBookZones({
  coin,
  currentPrice,
  asks,
  bids,
}) {
  const rangePct =
    ORDERBOOK_STRUCTURE_RANGE_PCT[
      coin
    ] || 3.00;

  const clusterPct =
    ORDERBOOK_CLUSTER_PCT[
      coin
    ] || 0.15;

  const minPrice =
    currentPrice *
    (
      1 -
      rangePct /
        100
    );

  const maxPrice =
    currentPrice *
    (
      1 +
      rangePct /
        100
    );

  const relevantBids =
    (
      bids || []
    ).filter(
      (order) =>
        order.price <
          currentPrice &&
        order.price >=
          minPrice
    );

  const relevantAsks =
    (
      asks || []
    ).filter(
      (order) =>
        order.price >
          currentPrice &&
        order.price <=
          maxPrice
    );

  const bidClusters =
    clusterOrderBookSide(
      relevantBids,
      clusterPct
    );

  const askClusters =
    clusterOrderBookSide(
      relevantAsks,
      clusterPct
    );

  return {
    bidClusters,
    askClusters,
  };
}

/* ============================================================
   ORDERBOOK WALL STATS
============================================================ */

function getWallStats(
  clusters
) {
  if (
    !clusters.length
  ) {
    return {
      medianVolume:
        0,

      averageVolume:
        0,

      maxVolume:
        0,
    };
  }

  const volumes =
    clusters.map(
      (cluster) =>
        cluster.volume
    );

  return {
    medianVolume:
      median(
        volumes
      ),

    averageVolume:
      average(
        volumes
      ),

    maxVolume:
      Math.max(
        ...volumes
      ),
  };
}

/* ============================================================
   WALL RATING 1–10
============================================================ */

function rateOrderBookWall({
  cluster,
  stats,
  currentPrice,
}) {
  if (
    !cluster ||
    !stats ||
    !stats.medianVolume
  ) {
    return {
      rating:
        1,

      ratio:
        1,

      distancePct:
        cluster
          ? Math.abs(
              percentChange(
                currentPrice,
                cluster.price
              )
            )
          : null,
    };
  }

  const ratio =
    cluster.volume /
    stats.medianVolume;

  let rating =
    1;

  if (
    ratio >= 1.2
  ) {
    rating =
      2;
  }

  if (
    ratio >= 1.5
  ) {
    rating =
      3;
  }

  if (
    ratio >= 2
  ) {
    rating =
      4;
  }

  if (
    ratio >= 3
  ) {
    rating =
      5;
  }

  if (
    ratio >= 4
  ) {
    rating =
      6;
  }

  if (
    ratio >= 6
  ) {
    rating =
      7;
  }

  if (
    ratio >= 8
  ) {
    rating =
      8;
  }

  if (
    ratio >= 12
  ) {
    rating =
      9;
  }

  if (
    ratio >= 18
  ) {
    rating =
      10;
  }

  const distancePct =
    Math.abs(
      percentChange(
        currentPrice,
        cluster.price
      )
    );

  if (
    distancePct <=
    0.30
  ) {
    rating +=
      1;
  }

  rating =
    Math.round(
      clamp(
        rating,
        1,
        10
      )
    );

  return {
    rating,
    ratio,
    distancePct,
  };
}

/* ============================================================
   SELECT BEST CURRENT WALL
============================================================ */

function selectBestOrderBookWall({
  clusters,
  currentPrice,
}) {
  if (
    !clusters.length
  ) {
    return null;
  }

  const stats =
    getWallStats(
      clusters
    );

  const candidates =
    clusters
      .map(
        (cluster) => {
          const strength =
            rateOrderBookWall({
              cluster,
              stats,
              currentPrice,
            });

          const validWall =
            clusters.length <=
              2 ||
            strength.ratio >=
              MIN_WALL_RELATIVE_RATIO;

          const score =
            (
              strength.rating *
              10
            ) -
            (
              strength.distancePct *
              WALL_DISTANCE_WEIGHT *
              10
            );

          return {
            ...cluster,

            strength,

            score,

            validWall,
          };
        }
      )
      .filter(
        (item) =>
          item.validWall
      )
      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );

  if (
    !candidates.length
  ) {
    return [
      ...clusters,
    ].sort(
      (
        a,
        b
      ) =>
        Math.abs(
          percentChange(
            currentPrice,
            a.price
          )
        ) -
        Math.abs(
          percentChange(
            currentPrice,
            b.price
          )
        )
    )[0];
  }

  return candidates[0];
}

/* ============================================================
   LIVE ORDERBOOK MARKET STRUCTURE
============================================================ */

async function getOrderBookStructure(
  coin,
  currentPrice
) {
  const orderBook =
    await getTopOrderBook(
      coin
    );

  if (
    !orderBook
  ) {
    return null;
  }

  const zones =
    getRelevantOrderBookZones({
      coin,

      currentPrice,

      asks:
        orderBook.asks,

      bids:
        orderBook.bids,
    });

  const supportCluster =
    selectBestOrderBookWall({
      clusters:
        zones.bidClusters,

      currentPrice,
    });

  const resistanceCluster =
    selectBestOrderBookWall({
      clusters:
        zones.askClusters,

      currentPrice,
    });

  const bidStats =
    getWallStats(
      zones.bidClusters
    );

  const askStats =
    getWallStats(
      zones.askClusters
    );

  let support =
    null;

  let resistance =
    null;

  if (
    supportCluster
  ) {
    const supportStrength =
      rateOrderBookWall({
        cluster:
          supportCluster,

        stats:
          bidStats,

        currentPrice,
      });

    support = {
      price:
        supportCluster.price,

      volume:
        supportCluster.volume,

      rating:
        supportStrength.rating,

      ratio:
        supportStrength.ratio,

      distancePct:
        Math.abs(
          percentChange(
            currentPrice,
            supportCluster.price
          )
        ),

      orderCount:
        supportCluster
          .orders
          ?.length ||
        1,
    };
  }

  if (
    resistanceCluster
  ) {
    const resistanceStrength =
      rateOrderBookWall({
        cluster:
          resistanceCluster,

        stats:
          askStats,

        currentPrice,
      });

    resistance = {
      price:
        resistanceCluster.price,

      volume:
        resistanceCluster.volume,

      rating:
        resistanceStrength.rating,

      ratio:
        resistanceStrength.ratio,

      distancePct:
        Math.abs(
          percentChange(
            currentPrice,
            resistanceCluster.price
          )
        ),

      orderCount:
        resistanceCluster
          .orders
          ?.length ||
        1,
    };
  }

  return {
    support,
    resistance,

    bidZones:
      zones.bidClusters,

    askZones:
      zones.askClusters,

    timestamp:
      orderBook.timestamp,
  };
}

/* ============================================================
   GRT EXECUTED FLOW INSIDE CURRENT 5M
============================================================ */

function getGRTCurrent5MFlow() {
  const current =
    getCurrent5MExecutedVolume(
      "GRT"
    );

  const trades =
    current.trades;

  let buyVolume =
    0;

  let sellVolume =
    0;

  let buyCount =
    0;

  let sellCount =
    0;

  for (
    const trade of
    trades
  ) {
    if (
      trade.isBuy
    ) {
      buyVolume +=
        trade.volume;

      buyCount++;
    } else {
      sellVolume +=
        trade.volume;

      sellCount++;
    }
  }

  const totalVolume =
    buyVolume +
    sellVolume;

  const totalCount =
    buyCount +
    sellCount;

  return {
    buyVolume,

    sellVolume,

    buyCount,

    sellCount,

    buyVolumePct:
      totalVolume >
        0
        ? (
            buyVolume /
            totalVolume
          ) *
          100
        : 50,

    buyFrequencyPct:
      totalCount >
        0
        ? (
            buyCount /
            totalCount
          ) *
          100
        : 50,
  };
}

/* ============================================================
   GRT PRICE RESPONSE
============================================================ */

function getGRT5MPriceResponse() {
  const current =
    getCurrent5MExecutedVolume(
      "GRT"
    );

  if (
    !current.trades.length
  ) {
    return {
      ready:
        false,

      changePct:
        0,

      rising:
        false,
    };
  }

  const sorted = [
    ...current.trades,
  ].sort(
    (
      a,
      b
    ) =>
      a.timestamp -
      b.timestamp
  );

  const firstPrice =
    sorted[0].price;

  const lastPrice =
    sorted[
      sorted.length -
      1
    ].price;

  const changePct =
    percentChange(
      firstPrice,
      lastPrice
    );

  return {
    ready:
      true,

    firstPrice,

    lastPrice,

    changePct,

    rising:
      changePct >
      0.03,
  };
}

/* ============================================================
   GRT ORDERBOOK / LIQUIDITY FILTER
============================================================ */

async function getGRTLiquidityFilter(
  currentPrice
) {
  const structure =
    await getOrderBookStructure(
      "GRT",
      currentPrice
    );

  if (
    !structure
  ) {
    return {
      ready:
        false,

      supportOkay:
        false,

      resistanceOkay:
        false,

      resistanceBlocking:
        false,

      structure:
        null,
    };
  }

  const support =
    structure.support;

  const resistance =
    structure.resistance;

  let supportOkay =
    false;

  let resistanceOkay =
    true;

  let resistanceBlocking =
    false;

  if (
    support
  ) {
    supportOkay =
      support.distancePct <=
        1.00 &&
      support.rating >=
        3;
  }

  if (
    resistance
  ) {
    /*
      A very strong wall extremely near the price
      can veto BUY NOW.

      Moderate walls do NOT automatically block,
      to avoid an overly rigid filter.
    */

    if (
      resistance.distancePct <=
        0.35 &&
      resistance.rating >=
        8
    ) {
      resistanceBlocking =
        true;

      resistanceOkay =
        false;
    } else if (
      resistance.distancePct <=
        0.20 &&
      resistance.rating >=
        7
    ) {
      resistanceBlocking =
        true;

      resistanceOkay =
        false;
    }
  }

  return {
    ready:
      true,

    supportOkay,

    resistanceOkay,

    resistanceBlocking,

    support,

    resistance,

    structure,
  };
}

/* ============================================================
   GRT MOMENTUM DECISION

   NO SPIKE:
   no action text.

   SPIKE:
   at least VERIFYING BUY.

   BUY NOW:
   uses confluence rather than requiring every
   single condition to be perfect.

   Strong red flags can veto BUY NOW.
============================================================ */

async function getGRTMomentumDecision(
  ticker
) {
  const volumeData =
    await getMomentumVolumeData(
      "GRT"
    );

  if (
    !volumeData.ready
  ) {
    return {
      momentumText:
        "⚪ COLLECTING DATA",

      actionText:
        "",

      status:
        "COLLECTING",
    };
  }

  if (
    !volumeData.isSpike
  ) {
    return {
      momentumText:
        "🔴 NO SPIKE",

      actionText:
        "",

      status:
        "NO_SPIKE",

      spikePct:
        volumeData.spikePct,
    };
  }

  const [
    rsi,
    ma,
    liquidity,
  ] =
    await Promise.all([
      getGRT5MRSI(),

      getGRT1HMATrend(),

      getGRTLiquidityFilter(
        ticker.currentPrice
      ),
    ]);

  const flow =
    getGRTCurrent5MFlow();

  const priceResponse =
    getGRT5MPriceResponse();

  let positiveScore =
    0;

  let strongRedFlag =
    false;

  /* ========================================================
     RSI FILTER
  ======================================================== */

  if (
    rsi.ready
  ) {
    if (
      rsi.direction ===
        "RISING"
    ) {
      positiveScore +=
        1;
    }

    if (
      rsi.current >=
        45 &&
      rsi.current <=
        72
    ) {
      positiveScore +=
        1;
    }

    /*
      Overbought alone does NOT automatically block.
      But overbought + falling RSI is a warning.
    */

    if (
      rsi.current >=
        75 &&
      rsi.direction ===
        "FALLING"
    ) {
      strongRedFlag =
        true;
    }

    if (
      rsi.current <=
        30 &&
      rsi.direction ===
        "RISING"
    ) {
      positiveScore +=
        1;
    }
  }

  /* ========================================================
     1H MA FILTER
  ======================================================== */

  if (
    ma.ready
  ) {
    if (
      ma.status ===
        "CROSS UP"
    ) {
      positiveScore +=
        2;
    } else if (
      ma.status ===
        "BULLISH"
    ) {
      positiveScore +=
        2;
    } else if (
      ma.status ===
        "NEAR CROSS"
    ) {
      positiveScore +=
        1;
    }

    /*
      MA9 clearly below MA50 does not kill
      VERIFYING BUY, but makes BUY NOW harder.
    */

    if (
      ma.status ===
        "BEARISH" &&
      ma.gapPct <
        -0.50
    ) {
      strongRedFlag =
        true;
    }
  }

  /* ========================================================
     EXECUTED FLOW FILTER
  ======================================================== */

  if (
    flow.buyVolumePct >=
    55
  ) {
    positiveScore +=
      1;
  }

  if (
    flow.buyFrequencyPct >=
    55
  ) {
    positiveScore +=
      1;
  }

  if (
    flow.buyVolumePct <
      40 &&
    flow.buyFrequencyPct <
      45
  ) {
    strongRedFlag =
      true;
  }

  /* ========================================================
     PRICE RESPONSE
  ======================================================== */

  if (
    priceResponse.ready &&
    priceResponse.rising
  ) {
    positiveScore +=
      1;
  }

  /*
    Large spike but price failing to respond
    suggests absorption by sellers.

    Do not issue BUY NOW.
  */

  if (
    volumeData.spikePct >=
      50 &&
    priceResponse.ready &&
    priceResponse.changePct <=
      0
  ) {
    strongRedFlag =
      true;
  }

  /* ========================================================
     ORDERBOOK / LIQUIDITY
  ======================================================== */

  if (
    liquidity.ready
  ) {
    if (
      liquidity.supportOkay
    ) {
      positiveScore +=
        1;
    }

    if (
      liquidity.resistanceOkay
    ) {
      positiveScore +=
        1;
    }

    if (
      liquidity.resistanceBlocking
    ) {
      strongRedFlag =
        true;
    }
  }

  /* ========================================================
     FINAL DECISION

     Deliberately tolerant:
     BUY NOW does not require every filter.

     But it needs meaningful confluence
     and no major veto condition.
  ======================================================== */

  let buyNowThreshold =
    6;

  /*
    If 1H MA is already bullish/cross-up,
    allow a slightly more responsive signal.
  */

  if (
    ma.ready &&
    (
      ma.status ===
        "CROSS UP" ||
      ma.status ===
        "BULLISH"
    )
  ) {
    buyNowThreshold =
      5;
  }

  const buyNow =
    !strongRedFlag &&
    positiveScore >=
      buyNowThreshold;

  return {
    momentumText:
      `🟢 SPIKE +${Math.max(
        0,
        volumeData.spikePct
      ).toFixed(
        0
      )}%`,

    actionText:
      buyNow
        ? "🟢 BUY NOW"
        : "🟡 VERIFYING BUY...",

    status:
      buyNow
        ? "BUY_NOW"
        : "VERIFYING",

    spikePct:
      volumeData.spikePct,

    score:
      positiveScore,

    strongRedFlag,

    rsi,

    ma,

    flow,

    priceResponse,

    liquidity,
  };
}

/* ============================================================
   NEXT RESISTANCE FROM ORDERBOOK
============================================================ */

async function findNextOrderBookResistance(
  coin,
  currentPrice
) {
  const orderBook =
    await getTopOrderBook(
      coin
    );

  if (
    !orderBook ||
    !orderBook.asks.length
  ) {
    return null;
  }

  const rangePct =
    ORDERBOOK_STRUCTURE_RANGE_PCT[
      coin
    ] || 3.00;

  const maxPrice =
    currentPrice *
    (
      1 +
      rangePct /
        100
    );

  const relevantAsks =
    orderBook.asks.filter(
      (ask) =>
        ask.price >
          currentPrice &&
        ask.price <=
          maxPrice
    );

  const clusters =
    clusterOrderBookSide(
      relevantAsks,
      ORDERBOOK_CLUSTER_PCT[
        coin
      ] || 0.15
    );

  if (
    !clusters.length
  ) {
    return null;
  }

  const stats =
    getWallStats(
      clusters
    );

  const sorted =
    clusters
      .map(
        (cluster) => {
          const strength =
            rateOrderBookWall({
              cluster,
              stats,
              currentPrice,
            });

          return {
            price:
              cluster.price,

            volume:
              cluster.volume,

            distancePct:
              percentChange(
                currentPrice,
                cluster.price
              ),

            strength,
          };
        }
      )
      .filter(
        (item) =>
          item.distancePct >
          0
      )
      .sort(
        (
          a,
          b
        ) =>
          a.price -
          b.price
      );

  if (
    !sorted.length
  ) {
    return null;
  }

  const meaningful =
    sorted.find(
      (item) =>
        item.strength.ratio >=
          MIN_WALL_RELATIVE_RATIO ||
        item.strength.rating >=
          4
    );

  return meaningful ||
    sorted[0];
}

/* ============================================================
   MARKET DIRECTION
============================================================ */

function getMarketDirection(
  changePct
) {
  if (
    changePct >=
    0.5
  ) {
    return "SEDANG NAIK KUAT";
  }

  if (
    changePct >=
    0.15
  ) {
    return "SEDANG NAIK";
  }

  if (
    changePct <=
    -0.5
  ) {
    return "SEDANG MENURUN KUAT";
  }

  if (
    changePct <=
    -0.15
  ) {
    return "SEDANG MENURUN";
  }

  return "SIDEWAY";
}

/* ============================================================
   BUY / SELL PRESSURE
============================================================ */

function getPressureLabel(
  buyPct,
  sellPct
) {
  if (
    buyPct >=
    65
  ) {
    return "TEKANAN BELI KUAT";
  }

  if (
    buyPct >=
    55
  ) {
    return "TEKANAN BELI SEDERHANA";
  }

  if (
    sellPct >=
    65
  ) {
    return "TEKANAN JUAL KUAT";
  }

  if (
    sellPct >=
    55
  ) {
    return "TEKANAN JUAL SEDERHANA";
  }

  return "SEIMBANG";
}

/* ============================================================
   RECENT FAKE BREAKOUT
============================================================ */

function getRecentFakeBreakout(
  coin
) {
  const item =
    LAST_FAKE_BREAKOUT[
      coin
    ];

  if (
    !item
  ) {
    return null;
  }

  if (
    now() -
      item.at >
    FAKE_BREAKOUT_VISIBLE_MS
  ) {
    delete LAST_FAKE_BREAKOUT[
      coin
    ];

    return null;
  }

  return item;
}

/* ============================================================
   VALIDATE RECENT CONFIRMED BREAKOUT
============================================================ */

function getRelevantConfirmedBreakout(
  coin,
  currentResistance
) {
  const item =
    LAST_CONFIRMED_BREAKOUT[
      coin
    ];

  if (
    !item
  ) {
    return null;
  }

  if (
    now() -
      item.at >
    CONFIRMED_BREAKOUT_VISIBLE_MS
  ) {
    delete LAST_CONFIRMED_BREAKOUT[
      coin
    ];

    return null;
  }

  if (
    !currentResistance
  ) {
    return null;
  }

  const referenceResistance =
    item.resistance;

  if (
    !referenceResistance
  ) {
    return null;
  }

  const difference =
    Math.abs(
      percentChange(
        referenceResistance,
        currentResistance
      )
    );

  if (
    difference >
    CONFIRMED_STRUCTURE_TOLERANCE_PCT
  ) {
    return null;
  }

  return item;
}

/* ============================================================
   BREAKOUT WATCH
============================================================ */

function ensureBreakoutWatch({
  coin,
  resistance,
  resistanceStrength,
  distancePct,
  pressure,
}) {
  if (
    !resistance
  ) {
    return;
  }

  const buyPressure =
    pressure.includes(
      "BELI"
    );

  if (
    !buyPressure ||
    distancePct ===
      null ||
    distancePct <
      0 ||
    distancePct >
      BREAKOUT_WATCH_MAX_DISTANCE_PCT
  ) {
    return;
  }

  const existing =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    existing &&
    Math.abs(
      percentChange(
        existing.resistance,
        resistance
      )
    ) <=
      0.35
  ) {
    existing.resistance =
      resistance;

    existing.resistanceStrength =
      resistanceStrength;

    return;
  }

  BREAKOUT_WATCH[
    coin
  ] = {
    coin,

    resistance,

    resistanceStrength,

    startedAt:
      now(),

    firstAboveAt:
      null,

    lastAboveAt:
      null,

    lastAbovePrice:
      null,

    aboveTradeCount:
      0,

    buyEvidenceScore:
      0,

    acceptanceScore:
      0,

    failureScore:
      0,

    sequences:
      new Set(),

    confirmed:
      false,
  };
}

function cancelBreakoutWatch(
  coin
) {
  delete BREAKOUT_WATCH[
    coin
  ];
}

/* ============================================================
   MARKET CRITERIA
============================================================ */

function getMarketCriteria({
  coin,
  direction,
  pressure,
  resistance,
  resistanceDistancePct,
  fakeBreakout,
  confirmedBreakout,
}) {
  if (
    fakeBreakout
  ) {
    return "JGN BELI";
  }

  if (
    confirmedBreakout
  ) {
    if (
      confirmedBreakout
        .entryBlocked
    ) {
      return "BREAKOUT CONFIRMED — ENTRY BLOCKED";
    }

    return "BREAKOUT CONFIRMED — SCALPER ACTIVE";
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
    resistance &&
    resistanceDistancePct !==
      null &&
    resistanceDistancePct >=
      0 &&
    resistanceDistancePct <=
      BREAKOUT_WATCH_MAX_DISTANCE_PCT &&
    pressure.includes(
      "BELI"
    )
  ) {
    return `BREAKOUT WATCH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  if (
    resistance &&
    direction.includes(
      "NAIK"
    ) &&
    pressure.includes(
      "BELI"
    )
  ) {
    return `BELI JIKA PECAH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  if (
    resistance &&
    (
      direction ===
        "SIDEWAY" ||
      pressure ===
        "SEIMBANG"
    )
  ) {
    return `BELI JIKA PECAH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  return "JGN BELI";
}
/* ============================================================
   MARKET STRUCTURE ANALYSIS
============================================================ */

async function analyzeMarketStructure(
  coin
) {
  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    return null;
  }

  const currentPrice =
    ticker.currentPrice;

  const bookStructure =
    await getOrderBookStructure(
      coin,
      currentPrice
    );

  if (
    !bookStructure
  ) {
    return null;
  }

  const snapshot15m =
    getPriceSnapshot(
      coin,
      15 *
        60 *
        1000
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      60 *
        60 *
        1000
    );

  let directionChange =
    0;

  if (
    snapshot15m
  ) {
    directionChange =
      snapshot15m.change;
  } else if (
    snapshot60m
  ) {
    directionChange =
      snapshot60m.change;
  }

  const direction =
    getMarketDirection(
      directionChange
    );

  const trades15m =
    getTradesInWindow(
      coin,
      now() -
        15 *
          60 *
          1000,
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

  const pressure =
    getPressureLabel(
      buyPct,
      sellPct
    );

  const support =
    bookStructure.support;

  const resistance =
    bookStructure.resistance;

  const resistanceDistancePct =
    resistance
      ? resistance.distancePct
      : null;

  const fakeBreakout =
    getRecentFakeBreakout(
      coin
    );

  const confirmedBreakout =
    getRelevantConfirmedBreakout(
      coin,
      resistance
        ? resistance.price
        : null
    );

  let market =
    direction;

  if (
    fakeBreakout
  ) {
    market =
      `${direction} — FAKE BREAKOUT DETECTED`;
  } else if (
    confirmedBreakout
  ) {
    market =
      `${direction} — BREAKOUT CONFIRMED`;
  } else if (
    resistance &&
    resistance.distancePct <=
      0.50
  ) {
    market =
      `${direction} — DEKAT RESISTANCE`;
  } else if (
    support &&
    support.distancePct <=
      0.50
  ) {
    market =
      `${direction} — DEKAT SUPPORT`;
  }

  ensureBreakoutWatch({
    coin,

    resistance:
      resistance
        ? resistance.price
        : null,

    resistanceStrength:
      resistance
        ? resistance.rating
        : 0,

    distancePct:
      resistanceDistancePct,

    pressure,
  });

  const criteria =
    getMarketCriteria({
      coin,

      direction,

      pressure,

      resistance:
        resistance
          ? resistance.price
          : null,

      resistanceDistancePct,

      fakeBreakout,

      confirmedBreakout,
    });

  return {
    coin,

    currentPrice,

    supportPrice:
      support
        ? support.price
        : null,

    supportRating:
      support
        ? support.rating
        : 0,

    supportVolume:
      support
        ? support.volume
        : 0,

    supportDistancePct:
      support
        ? support.distancePct
        : null,

    resistancePrice:
      resistance
        ? resistance.price
        : null,

    resistanceRating:
      resistance
        ? resistance.rating
        : 0,

    resistanceVolume:
      resistance
        ? resistance.volume
        : 0,

    resistanceDistancePct,

    market,

    direction,

    pressure,

    criteria,

    buyPct,

    sellPct,
  };
}

/* ============================================================
   MARKET STRUCTURE DISPLAY
============================================================ */

function buildMarketStructureSection(
  data
) {
  const supportText =
    data.supportPrice
      ? `RM${formatPrice(
          data.coin,
          data.supportPrice
        )} — ${data.supportRating}/10
📏 Jarak: ${data.supportDistancePct.toFixed(
          2
        )}%`
      : "N/A";

  const resistanceText =
    data.resistancePrice
      ? `RM${formatPrice(
          data.coin,
          data.resistancePrice
        )} — ${data.resistanceRating}/10
📏 Jarak: ${data.resistanceDistancePct.toFixed(
          2
        )}%`
      : "N/A";

  return `🪙 ${data.coin}

💵 Harga Semasa:
RM${formatPrice(
    data.coin,
    data.currentPrice
  )}

🟢 Support:
${supportText}

🔴 Resistance:
${resistanceText}

📈 Market:
${data.market}

⚡️ Tekanan:
${data.pressure}

🧠 Kriteria:
${data.criteria}`;
}

/* ============================================================
   SEND MARKET STRUCTURE — 15 MIN
============================================================ */

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

    if (
      data
    ) {
      sections.push(
        buildMarketStructureSection(
          data
        )
      );
    }
  }

  if (
    !sections.length
  ) {
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
   2H BACKGROUND ANALYSIS
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
      (
        i - 1
      ) *
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

/* ============================================================
   RELATIVE 2H VOLUME
============================================================ */

function getRelativeVolumeInfo(
  currentSummary,
  previousSummaries
) {
  if (
    !previousSummaries.length
  ) {
    return {
      ratio:
        null,

      label:
        null,
    };
  }

  const avg =
    average(
      previousSummaries.map(
        (item) =>
          item.totalVolume
      )
    );

  if (
    !avg
  ) {
    return {
      ratio:
        null,

      label:
        null,
    };
  }

  const ratio =
    currentSummary.totalVolume /
    avg;

  let label =
    "NORMAL VOLUME";

  if (
    ratio <
    0.8
  ) {
    label =
      "LOW VOLUME";
  } else if (
    ratio >=
    1.75
  ) {
    label =
      "VOLUME BREAKOUT";
  } else if (
    ratio >=
    1.25
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
============================================================ */

function getCurrent2HPriceTrend({
  coin,
  startPrice,
  peakPrice,
  currentPrice,
}) {
  const recent15m =
    getPriceSnapshot(
      coin,
      15 *
        60 *
        1000
    );

  const recentDirection =
    recent15m
      ? recent15m.change
      : percentChange(
          startPrice,
          currentPrice
        );

  const peakDrop =
    percentChange(
      peakPrice,
      currentPrice
    );

  const startMove =
    percentChange(
      startPrice,
      currentPrice
    );

  const isFallingNow =
    peakPrice >
      currentPrice &&
    (
      recentDirection <
        -0.08 ||
      currentPrice <
        startPrice
    );

  if (
    isFallingNow
  ) {
    return {
      direction:
        "DOWN",

      value:
        peakDrop,
    };
  }

  if (
    startMove >
    0.03
  ) {
    return {
      direction:
        "UP",

      value:
        startMove,
    };
  }

  if (
    startMove <
    -0.03
  ) {
    return {
      direction:
        "DOWN",

      value:
        startMove,
    };
  }

  return {
    direction:
      "FLAT",

    value:
      0,
  };
}

/* ============================================================
   2H DOMINANCE
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

      percent:
        summary.buyPct,
    };
  }

  return {
    side:
      "SELLER",

    percent:
      summary.sellPct,
  };
}

/* ============================================================
   2H DECISION
============================================================ */

function getTwoHourActionDecision({
  dominance,
  priceTrend,
  relativeVolume,
}) {
  const dominantPct =
    dominance.percent;

  const strongDominance =
    dominantPct >=
    62;

  const mildDominance =
    dominantPct >=
    55;

  const volumeRatio =
    relativeVolume.ratio;

  const highVolume =
    volumeRatio !==
      null &&
    volumeRatio >=
      1.25;

  if (
    dominance.side ===
      "BUYER" &&
    priceTrend.direction ===
      "UP"
  ) {
    if (
      strongDominance &&
      highVolume &&
      priceTrend.value >=
        0.5
    ) {
      return "ALLOW";
    }

    if (
      mildDominance &&
      priceTrend.value >
        0
    ) {
      return "CAUTION";
    }
  }

  if (
    dominance.side ===
      "BUYER" &&
    priceTrend.direction ===
      "DOWN"
  ) {
    return "BLOCK";
  }

  if (
    dominance.side ===
      "SELLER" &&
    priceTrend.direction ===
      "DOWN"
  ) {
    return "BLOCK";
  }

  return "CAUTION";
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

  if (
    !summary
  ) {
    return null;
  }

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

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    return null;
  }

  const previous =
    getPrevious2HWindows(
      coin,
      startTime,
      5
    );

  const relativeVolume =
    getRelativeVolumeInfo(
      summary,
      previous
    );

  const priceTrend =
    getCurrent2HPriceTrend({
      coin,

      startPrice:
        summary.open,

      peakPrice:
        summary.high,

      currentPrice:
        ticker.currentPrice,
    });

  const dominance =
    getDominance(
      summary
    );

  const action =
    getTwoHourActionDecision({
      dominance,

      priceTrend,

      relativeVolume,
    });

  return {
    coin,

    summary,

    relativeVolume,

    priceTrend,

    dominance,

    action,
  };
}

/* ============================================================
   RECENT MEDIAN TRADE VOLUME
============================================================ */

function getRecentMedianTradeVolume(
  coin,
  lookbackMs =
    TWO_HOURS
) {
  const trades =
    getTradesInWindow(
      coin,
      now() -
        lookbackMs,
      now()
    );

  if (
    !trades.length
  ) {
    return 0;
  }

  return median(
    trades.map(
      (trade) =>
        trade.volume
    )
  );
}

/* ============================================================
   EXECUTED TRADE EVIDENCE WEIGHT
============================================================ */

function getTradeEvidenceWeight(
  coin,
  trade
) {
  const normal =
    getRecentMedianTradeVolume(
      coin
    );

  if (
    !normal
  ) {
    return 1;
  }

  const multiple =
    trade.volume /
    normal;

  if (
    multiple >=
    5
  ) {
    return 3;
  }

  if (
    multiple >=
    2
  ) {
    return 2;
  }

  return 1;
}

/* ============================================================
   PROCESS EXECUTED TRADE AGAINST BREAKOUT WATCH
============================================================ */

async function processBreakoutWatchTrade(
  coin,
  trade
) {
  const watch =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    !watch ||
    watch.confirmed ||
    ACTIVE_TRADES[
      coin
    ] ||
    PENDING_ENTRIES[
      coin
    ]
  ) {
    return;
  }

  if (
    watch.sequences.has(
      trade.sequence
    )
  ) {
    return;
  }

  watch.sequences.add(
    trade.sequence
  );

  const resistance =
    watch.resistance;

  const aboveThreshold =
    resistance *
    (
      1 +
      BREAKOUT_BUFFER_PCT /
        100
    );

  const holdThreshold =
    resistance *
    (
      1 +
      BREAKOUT_HOLD_BUFFER_PCT /
        100
    );

  const failureThreshold =
    resistance *
    (
      1 -
      BREAKOUT_FAILURE_BUFFER_PCT /
        100
    );

  const hardFailureThreshold =
    resistance *
    (
      1 -
      BREAKOUT_HARD_FAILURE_PCT /
        100
    );

  /* =========================================================
     TRADE EXECUTED ABOVE RESISTANCE
  ========================================================= */

  if (
    trade.price >=
    aboveThreshold
  ) {
    const weight =
      getTradeEvidenceWeight(
        coin,
        trade
      );

    watch.firstAboveAt =
      watch.firstAboveAt ||
      trade.timestamp;

    watch.lastAboveAt =
      trade.timestamp;

    watch.lastAbovePrice =
      trade.price;

    watch.aboveTradeCount +=
      1;

    if (
      trade.isBuy
    ) {
      watch.buyEvidenceScore +=
        weight;
    } else {
      watch.acceptanceScore +=
        0.5;
    }

    watch.failureScore =
      0;

    const structure =
      await analyzeMarketStructure(
        coin
      );

    if (
      !structure
    ) {
      return;
    }

    const pressureOkay =
      !structure.pressure.includes(
        "JUAL"
      );

    /*
      Flexible confirmation:
      1 exceptionally large executed buy
      can contribute much more evidence,
      but ordinary trades still need repetition.
    */

    const enoughEvidence =
      (
        watch.aboveTradeCount >=
          2 &&
        watch.buyEvidenceScore >=
          3
      ) ||
      (
        watch.aboveTradeCount >=
          3 &&
        watch.buyEvidenceScore >=
          2
      ) ||
      (
        watch.aboveTradeCount >=
          1 &&
        watch.buyEvidenceScore >=
          3
      );

    const lastPriceHolding =
      trade.price >=
      holdThreshold;

    if (
      enoughEvidence &&
      pressureOkay &&
      lastPriceHolding
    ) {
      watch.confirmed =
        true;

      await triggerBreakoutScalpingEntry(
        coin,
        watch,
        trade
      );
    }

    return;
  }

  /* =========================================================
     MINOR PULLBACK — STILL WITHIN TOLERANCE
  ========================================================= */

  if (
    trade.price >=
    failureThreshold
  ) {
    return;
  }

  /* =========================================================
     BREAKOUT FAILURE
  ========================================================= */

  const failureWeight =
    trade.isBuy
      ? 1
      : 2;

  watch.failureScore +=
    failureWeight;

  const hardFailure =
    trade.price <=
    hardFailureThreshold;

  if (
    hardFailure ||
    watch.failureScore >=
      2
  ) {
    LAST_FAKE_BREAKOUT[
      coin
    ] = {
      at:
        now(),

      resistance,

      failedPrice:
        trade.price,
    };

    cancelBreakoutWatch(
      coin
    );
  }
}

/* ============================================================
   PRELIMINARY ENTRY
============================================================ */

function choosePreliminaryEntry({
  technicalEntry,
  bestAsk,
}) {
  if (
    !bestAsk ||
    bestAsk <=
      0
  ) {
    return {
      entryPrice:
        technicalEntry,

      source:
        "TECHNICAL ENTRY",
    };
  }

  if (
    bestAsk <=
    technicalEntry
  ) {
    return {
      entryPrice:
        bestAsk,

      source:
        "BEST ASK",
    };
  }

  const chasePct =
    percentChange(
      technicalEntry,
      bestAsk
    );

  if (
    chasePct <=
    MAX_ENTRY_CHASE_PCT
  ) {
    return {
      entryPrice:
        bestAsk,

      source:
        "BEST ASK",
    };
  }

  return {
    entryPrice:
      technicalEntry,

    source:
      "TECHNICAL ENTRY",
  };
}

/* ============================================================
   QUANTITY-AWARE LIMIT ENTRY
============================================================ */

async function chooseQuantityAwareLimitEntry({
  coin,
  technicalEntry,
  requiredQuantity,
}) {
  const orderBook =
    await getTopOrderBook(
      coin
    );

  if (
    !orderBook ||
    !orderBook.asks.length
  ) {
    return {
      finalEntry:
        technicalEntry,

      source:
        "TECHNICAL ENTRY",

      depthAvailable:
        0,

      requiredQuantity,

      chasePct:
        0,

      fullFillEstimated:
        false,
    };
  }

  const maxAllowedEntry =
    technicalEntry *
    (
      1 +
      MAX_ENTRY_CHASE_PCT /
        100
    );

  let cumulativeVolume =
    0;

  let selectedPrice =
    null;

  for (
    const ask of
    orderBook.asks
  ) {
    if (
      ask.price >
      maxAllowedEntry
    ) {
      break;
    }

    cumulativeVolume +=
      ask.volume;

    if (
      cumulativeVolume >=
      requiredQuantity
    ) {
      selectedPrice =
        ask.price;

      break;
    }
  }

  if (
    selectedPrice
  ) {
    return {
      finalEntry:
        selectedPrice,

      source:
        "ORDERBOOK DEPTH",

      depthAvailable:
        cumulativeVolume,

      requiredQuantity,

      chasePct:
        percentChange(
          technicalEntry,
          selectedPrice
        ),

      fullFillEstimated:
        true,
    };
  }

  const technicalDepth =
    orderBook.asks
      .filter(
        (ask) =>
          ask.price <=
          technicalEntry
      )
      .reduce(
        (
          total,
          ask
        ) =>
          total +
          ask.volume,
        0
      );

  return {
    finalEntry:
      technicalEntry,

    source:
      "TECHNICAL ENTRY",

    depthAvailable:
      technicalDepth,

    requiredQuantity,

    chasePct:
      0,

    fullFillEstimated:
      technicalDepth >=
      requiredQuantity,
  };
}

/* ============================================================
   ROOM TO TP — ORDERBOOK FIRST
============================================================ */

async function evaluateRoomToTP(
  coin,
  entryPrice
) {
  const nextResistance =
    await findNextOrderBookResistance(
      coin,
      entryPrice
    );

  if (
    !nextResistance
  ) {
    return {
      allowed:
        true,

      nextResistance:
        null,

      maxTargetPrice:
        entryPrice *
        (
          1 +
          DEFAULT_BREAKOUT_TP_PCT[
            coin
          ] /
            100
        ),

      reason:
        "NO STRONG WALL ABOVE",
    };
  }

  const distance =
    nextResistance
      .distancePct;

  const strength =
    nextResistance
      .strength
      .rating;

  if (
    distance <
    MIN_GROSS_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      nextResistance,

      reason:
        "ROOM TOO SMALL AFTER FEES",
    };
  }

  if (
    distance <=
      1.00 &&
    strength >=
      7
  ) {
    return {
      allowed:
        false,

      nextResistance,

      reason:
        "STRONG RESISTANCE TOO CLOSE",
    };
  }

  if (
    distance <=
      1.50 &&
    strength >=
      8
  ) {
    return {
      allowed:
        false,

      nextResistance,

      reason:
        "VERY STRONG RESISTANCE NEARBY",
    };
  }

  const defaultTarget =
    entryPrice *
    (
      1 +
      DEFAULT_BREAKOUT_TP_PCT[
        coin
      ] /
        100
    );

  const beforeWall =
    nextResistance.price *
    0.9975;

  const maxTargetPrice =
    Math.min(
      defaultTarget,
      beforeWall
    );

  if (
    percentChange(
      entryPrice,
      maxTargetPrice
    ) <
    MIN_GROSS_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      nextResistance,

      reason:
        "TP SPACE TOO TIGHT",
    };
  }

  return {
    allowed:
      true,

    nextResistance,

    maxTargetPrice,

    reason:
      "ROOM OK",
  };
}

/* ============================================================
   CONFIDENCE
============================================================ */

function confidenceLabel(
  score
) {
  if (
    score >=
    80
  ) {
    return "STRONG";
  }

  if (
    score >=
    65
  ) {
    return "MID";
  }

  return "WEAK";
}

/* ============================================================
   SETUP TYPE
============================================================ */

function setupType(
  score,
  market
) {
  if (
    market.includes(
      "BREAKOUT"
    ) &&
    !market.includes(
      "FAKE"
    )
  ) {
    return "BREAKOUT";
  }

  if (
    score >=
    80
  ) {
    return "CONTINUATION";
  }

  return "EARLY MOMENTUM";
}

/* ============================================================
   SCALPING SCORE
============================================================ */

function getScalpingScore({
  snapshot15m,
  snapshot60m,
  pressure,
  market,
  currentPrice,
  support,
  resistance,
}) {
  let score =
    50;

  if (
    snapshot15m
  ) {
    score +=
      clamp(
        snapshot15m.change *
          20,
        -25,
        25
      );
  }

  if (
    snapshot60m
  ) {
    score +=
      clamp(
        snapshot60m.change *
          8,
        -15,
        15
      );
  }

  if (
    pressure ===
    "TEKANAN BELI KUAT"
  ) {
    score +=
      15;
  } else if (
    pressure ===
    "TEKANAN BELI SEDERHANA"
  ) {
    score +=
      8;
  } else if (
    pressure ===
    "TEKANAN JUAL KUAT"
  ) {
    score -=
      18;
  } else if (
    pressure ===
    "TEKANAN JUAL SEDERHANA"
  ) {
    score -=
      10;
  }

  if (
    market.includes(
      "BREAKOUT CONFIRMED"
    )
  ) {
    score +=
      15;
  }

  if (
    market.includes(
      "FAKE BREAKOUT"
    )
  ) {
    score -=
      30;
  }

  if (
    support &&
    resistance &&
    resistance >
      support
  ) {
    const position =
      (
        currentPrice -
        support
      ) /
      (
        resistance -
        support
      );

    if (
      position >=
        0.55 &&
      position <=
        0.90
    ) {
      score +=
        5;
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

/* ============================================================
   HIDDEN 2H SAFETY FILTER
============================================================ */

async function getTwoHourSafety(
  coin
) {
  const analysis =
    await analyze2HMarketCondition(
      coin
    );

  if (
    !analysis
  ) {
    return "UNKNOWN";
  }

  return analysis.action;
}

/* ============================================================
   TP / SL / DURATION
============================================================ */

function buildEntryRiskLevels({
  coin,
  entryPrice,
  brokenResistance =
    null,
  room,
  confidence,
}) {
  const tp =
    room?.maxTargetPrice ||
    entryPrice *
    (
      1 +
      DEFAULT_BREAKOUT_TP_PCT[
        coin
      ] /
        100
    );

  let sl =
    entryPrice *
    0.985;

  if (
    brokenResistance
  ) {
    const structureSL =
      brokenResistance *
      0.996;

    sl =
      Math.max(
        sl,
        structureSL
      );
  }

  let durationHours =
    confidence ===
      "STRONG"
      ? 8
      : 6;

  if (
    coin ===
    "BTC"
  ) {
    durationHours =
      confidence ===
        "STRONG"
        ? 8
        : 4;
  }

  return {
    tp,

    sl,

    durationHours,
  };
}

/* ============================================================
   SEND SCALPING ENTRY
============================================================ */

async function sendScalpingEntry(
  candidate
) {
  if (
    PENDING_ENTRIES[
      candidate.coin
    ] ||
    ACTIVE_TRADES[
      candidate.coin
    ]
  ) {
    return;
  }

  PENDING_ENTRIES[
    candidate.coin
  ] =
    candidate;

  LAST_GLOBAL_SIGNAL =
    now();

  LAST_SIGNAL[
    candidate.coin
  ] =
    now();

  let roomText =
    "";

  if (
    candidate.nextResistance
  ) {
    roomText = `

🧱 Next Resistance:
RM${formatPrice(
      candidate.coin,
      candidate.nextResistance.price
    )} — ${
      candidate
        .nextResistance
        .strength
        .rating
    }/10

📏 Room:
${candidate
  .nextResistance
  .distancePct
  .toFixed(
    2
  )}%`;
  }

  await sendTelegram(
    `🚀 SCALPING ENTRY

🪙 ${candidate.coin}

💵 Current:
RM${formatPrice(
      candidate.coin,
      candidate.currentPrice
    )}

📐 Technical Entry:
RM${formatPrice(
      candidate.coin,
      candidate.technicalEntry
    )}

🎯 TP Reference:
RM${formatPrice(
      candidate.coin,
      candidate.tp
    )}

🛑 SL Reference:
RM${formatPrice(
      candidate.coin,
      candidate.sl
    )}

⏳ Trade Duration:
${candidate.durationHours} HOURS

🧠 Confidence:
${candidate.score}% ${candidate.confidence}

📊 Setup:
${candidate.setup}${roomText}

━━━━━━━━━━━━━━

START ENTRY?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "✅ START ENTRY",

              callback_data:
                `START_${candidate.coin}`,
            },
            {
              text:
                "❌ IGNORE",

              callback_data:
                `IGNORE_${candidate.coin}`,
            },
          ],
        ],
      },
    }
  );
}

/* ============================================================
   BREAKOUT CONFIRMED
   -> SCALPING ENTRY
============================================================ */

async function triggerBreakoutScalpingEntry(
  coin,
  watch,
  trade
) {
  if (
    ACTIVE_TRADES[
      coin
    ] ||
    PENDING_ENTRIES[
      coin
    ]
  ) {
    return;
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
    return;
  }

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    watch.confirmed =
      false;

    return;
  }

  const structure =
    await analyzeMarketStructure(
      coin
    );

  if (
    !structure
  ) {
    watch.confirmed =
      false;

    return;
  }

  if (
    structure.pressure.includes(
      "JUAL"
    )
  ) {
    watch.confirmed =
      false;

    return;
  }

  if (
    CORE_COINS.includes(
      coin
    )
  ) {
    const safety =
      await getTwoHourSafety(
        coin
      );

    if (
      safety ===
      "BLOCK"
    ) {
      watch.confirmed =
        false;

      return;
    }
  }

  const technicalEntry =
    trade.price;

  const preliminary =
    choosePreliminaryEntry({
      technicalEntry,

      bestAsk:
        ticker.bestAsk,
    });

  const room =
    await evaluateRoomToTP(
      coin,
      preliminary.entryPrice
    );

  if (
    !room.allowed
  ) {
    LAST_CONFIRMED_BREAKOUT[
      coin
    ] = {
      at:
        now(),

      resistance:
        watch.resistance,

      entryBlocked:
        true,

      reason:
        room.reason,
    };

    cancelBreakoutWatch(
      coin
    );

    return;
  }

  const snapshot15m =
    getPriceSnapshot(
      coin,
      15 *
        60 *
        1000
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      60 *
        60 *
        1000
    );

  const baseScore =
    getScalpingScore({
      snapshot15m,

      snapshot60m,

      pressure:
        structure.pressure,

      market:
        `${structure.market} — BREAKOUT CONFIRMED`,

      currentPrice:
        ticker.currentPrice,

      support:
        structure.supportPrice,

      resistance:
        structure.resistancePrice,
    });

  const evidenceBonus =
    Math.min(
      watch.buyEvidenceScore *
        3,
      12
    );

  const finalScore =
    Math.round(
      clamp(
        Math.max(
          75,
          baseScore +
            evidenceBonus
        ),
        0,
        100
      )
    );

  const confidence =
    confidenceLabel(
      finalScore
    );

  const risk =
    buildEntryRiskLevels({
      coin,

      entryPrice:
        preliminary.entryPrice,

      brokenResistance:
        watch.resistance,

      room,

      confidence,
    });

  LAST_CONFIRMED_BREAKOUT[
    coin
  ] = {
    at:
      now(),

    resistance:
      watch.resistance,

    confirmedPrice:
      trade.price,

    entryBlocked:
      false,
  };

  cancelBreakoutWatch(
    coin
  );

  await sendScalpingEntry({
    coin,

    score:
      finalScore,

    confidence,

    currentPrice:
      ticker.currentPrice,

    technicalEntry,

    preliminaryEntry:
      preliminary.entryPrice,

    tp:
      risk.tp,

    sl:
      risk.sl,

    durationHours:
      risk.durationHours,

    setup:
      "BREAKOUT",

    brokenResistance:
      watch.resistance,

    nextResistance:
      room.nextResistance,
  });
}
/* ============================================================
   GENERAL 1-MINUTE SCALPING SCAN
============================================================ */

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
      ] ||
      PENDING_ENTRIES[
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

    /*
      BTC/GRT yang sedang breakout watch
      tidak boleh bypass anti-fake engine.
    */

    if (
      CORE_COINS.includes(
        coin
      ) &&
      BREAKOUT_WATCH[
        coin
      ]
    ) {
      continue;
    }

    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      continue;
    }

    const structure =
      await analyzeMarketStructure(
        coin
      );

    if (
      !structure
    ) {
      continue;
    }

    /*
      BTC/GRT dekat resistance:
      serahkan kepada breakout watch.
    */

    if (
      CORE_COINS.includes(
        coin
      ) &&
      structure.resistanceDistancePct !==
        null &&
      structure.resistanceDistancePct >=
        0 &&
      structure.resistanceDistancePct <=
        BREAKOUT_WATCH_MAX_DISTANCE_PCT
    ) {
      continue;
    }

    const snapshot15m =
      getPriceSnapshot(
        coin,
        15 *
          60 *
          1000
      );

    const snapshot60m =
      getPriceSnapshot(
        coin,
        60 *
          60 *
          1000
      );

    if (
      !snapshot15m &&
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
          structure.supportPrice,

        resistance:
          structure.resistancePrice,
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

    /*
      Hidden 2H filter
      untuk BTC/GRT sahaja.
    */

    if (
      CORE_COINS.includes(
        coin
      )
    ) {
      const safety =
        await getTwoHourSafety(
          coin
        );

      if (
        safety ===
        "BLOCK"
      ) {
        continue;
      }
    }

    const technicalEntry =
      ticker.currentPrice;

    const preliminary =
      choosePreliminaryEntry({
        technicalEntry,

        bestAsk:
          ticker.bestAsk,
      });

    const room =
      await evaluateRoomToTP(
        coin,
        preliminary.entryPrice
      );

    if (
      !room.allowed
    ) {
      continue;
    }

    const risk =
      buildEntryRiskLevels({
        coin,

        entryPrice:
          preliminary.entryPrice,

        room,

        confidence,
      });

    const grossTarget =
      percentChange(
        preliminary.entryPrice,
        risk.tp
      );

    if (
      grossTarget <
      MIN_GROSS_ROOM_PCT
    ) {
      continue;
    }

    candidates.push({
      coin,

      score,

      confidence,

      currentPrice:
        ticker.currentPrice,

      technicalEntry,

      preliminaryEntry:
        preliminary.entryPrice,

      tp:
        risk.tp,

      sl:
        risk.sl,

      durationHours:
        risk.durationHours,

      setup:
        setupType(
          score,
          structure.market
        ),

      brokenResistance:
        null,

      nextResistance:
        room.nextResistance,
    });
  }

  if (
    !candidates.length
  ) {
    return;
  }

  candidates.sort(
    (
      a,
      b
    ) =>
      b.score -
      a.score
  );

  await sendScalpingEntry(
    candidates[0]
  );
}

/* ============================================================
   FINAL ORDER PLAN RESOLVER
============================================================ */

async function resolveFinalOrderPlan(
  entry,
  targetProfit
) {
  const finalSellableUnitPerGrossUnit =
    (
      1 -
      BUY_FEE
    ) *
    (
      1 -
      SELL_FEE
    );

  let entryPrice =
    entry.preliminaryEntry ||
    entry.technicalEntry;

  let lastDepthSelection =
    null;

  /* ========================================================
     ITERATIVE ORDERBOOK RESOLUTION
  ======================================================== */

  for (
    let attempt = 0;
    attempt < 4;
    attempt++
  ) {
    const room =
      await evaluateRoomToTP(
        entry.coin,
        entryPrice
      );

    if (
      !room.allowed
    ) {
      return {
        allowed:
          false,

        reason:
          room.reason,
      };
    }

    const risk =
      buildEntryRiskLevels({
        coin:
          entry.coin,

        entryPrice,

        brokenResistance:
          entry.brokenResistance ||
          null,

        room,

        confidence:
          entry.confidence,
      });

    const netPerUnit =
      risk.tp *
        finalSellableUnitPerGrossUnit -
      entryPrice;

    if (
      netPerUnit <=
      0
    ) {
      return {
        allowed:
          false,

        reason:
          "NET PROFIT NEGATIVE AFTER FEES",
      };
    }

    const quantity =
      Math.ceil(
        targetProfit /
          netPerUnit
      );

    const depthSelection =
      await chooseQuantityAwareLimitEntry({
        coin:
          entry.coin,

        technicalEntry:
          entry.technicalEntry,

        requiredQuantity:
          quantity,
      });

    lastDepthSelection =
      depthSelection;

    const nextEntry =
      depthSelection.finalEntry;

    if (
      Math.abs(
        nextEntry -
        entryPrice
      ) <
      0.0000000001
    ) {
      return {
        allowed:
          true,

        entryPrice,

        quantity,

        room,

        risk,

        netPerUnit,

        depthSelection,
      };
    }

    entryPrice =
      nextEntry;
  }

  /* ========================================================
     FINAL PASS
  ======================================================== */

  const room =
    await evaluateRoomToTP(
      entry.coin,
      entryPrice
    );

  if (
    !room.allowed
  ) {
    return {
      allowed:
        false,

      reason:
        room.reason,
    };
  }

  const risk =
    buildEntryRiskLevels({
      coin:
        entry.coin,

      entryPrice,

      brokenResistance:
        entry.brokenResistance ||
        null,

      room,

      confidence:
        entry.confidence,
    });

  const netPerUnit =
    risk.tp *
      finalSellableUnitPerGrossUnit -
    entryPrice;

  if (
    netPerUnit <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "FINAL PROFIT ROOM NOT VIABLE",
    };
  }

  const quantity =
    Math.ceil(
      targetProfit /
        netPerUnit
    );

  const depthSelection =
    await chooseQuantityAwareLimitEntry({
      coin:
        entry.coin,

      technicalEntry:
        entry.technicalEntry,

      requiredQuantity:
        quantity,
    });

  if (
    !depthSelection ||
    Math.abs(
      depthSelection.finalEntry -
        entryPrice
    ) >=
      0.0000000001
  ) {
    return {
      allowed:
        false,

      reason:
        "ORDERBOOK CHANGED DURING FINAL CHECK",
    };
  }

  return {
    allowed:
      true,

    entryPrice,

    quantity,

    room,

    risk,

    netPerUnit,

    depthSelection:
      depthSelection ||
      lastDepthSelection,
  };
}

/* ============================================================
   ACTIVE TRADE MONITOR
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

    if (
      !ticker
    ) {
      continue;
    }

    if (
      !trade.tpReached &&
      ticker.currentPrice >=
        trade.tp
    ) {
      trade.tpReached =
        true;

      const sellFeeUnit =
        trade.netTradeUnit *
        SELL_FEE;

      const netSellUnit =
        trade.netTradeUnit -
        sellFeeUnit;

      const estimatedSellValue =
        trade.tp *
        netSellUnit;

      const estimatedNetProfit =
        estimatedSellValue -
        trade.totalBuyCost;

      await sendTelegram(
        `🎯 TP REACHED SELL NOW

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

📦 Net Must Sell:
${trade.netTradeUnit.toFixed(
          4
        )} ${coin}

💰 Estimated Net Profit:
${formatMoney(
          estimatedNetProfit
        )}

SELL NOW?`,
        {
          reply_markup: {
            inline_keyboard: [
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

    if (
      !trade.slReached &&
      ticker.currentPrice <=
        trade.sl
    ) {
      trade.slReached =
        true;

      await sendTelegram(
        `🛑 STOP LOSS HIT

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

📦 Net Must Sell:
${trade.netTradeUnit.toFixed(
          4
        )} ${coin}

SELL NOW?`,
        {
          reply_markup: {
            inline_keyboard: [
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

      await sendTelegram(
        `⌛ SETUP DURATION REACHED

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

📦 Net Must Sell:
${trade.netTradeUnit.toFixed(
          4
        )} ${coin}

SELL AT CURRENT PRICE?`,
        {
          reply_markup: {
            inline_keyboard: [
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
   TELEGRAM CALLBACKS
============================================================ */

bot.on(
  "callback_query",
  async (query) => {
    const data =
      String(
        query.data ||
          ""
      );

    const chatId =
      query.message.chat.id;

    if (
      data.startsWith(
        "START_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      const pending =
        PENDING_ENTRIES[
          coin
        ];

      if (
        !pending
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Entry signal sudah expired."
        );
      } else {
        USER_STATE[
          chatId
        ] = {
          step:
            "WAIT_PROFIT",

          coin,
        };

        await replyTelegram(
          chatId,
          "💰 TARGET NET PROFIT (RM)?"
        );
      }
    }

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

      delete USER_STATE[
        chatId
      ];

      await replyTelegram(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    if (
      data.startsWith(
        "BUYYES_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      const state =
        USER_STATE[
          chatId
        ];

      if (
        !state ||
        state.coin !==
          coin ||
        state.step !==
          "WAIT_CONFIRM"
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Session expired. Start entry semula."
        );
      } else {
        state.step =
          "WAIT_MATCHED_QUANTITY";

        await replyTelegram(
          chatId,
          `📦 ENTER MATCHED QUANTITY

Suggested:
${state.quantity.toLocaleString(
            "en-MY"
          )} ${state.coin}

📌 Limit Entry:
RM${formatPrice(
            state.coin,
            state.entryPrice
          )}

Masukkan 0 jika order tidak match.`
        );
      }
    }

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

      await replyTelegram(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    if (
      data.startsWith(
        "SELL_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      if (
        !ACTIVE_TRADES[
          coin
        ]
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Active trade tidak dijumpai."
        );
      } else {
        USER_STATE[
          chatId
        ] = {
          step:
            "WAIT_SELL_PRICE",

          coin,
        };

        await replyTelegram(
          chatId,
          `📌 ENTER MATCHED SELL PRICE

🪙 ${coin}`
        );
      }
    }

    if (
      data.startsWith(
        "HOLD_"
      )
    ) {
      const coin =
        data.split(
          "_"
        )[1];

      const trade =
        ACTIVE_TRADES[
          coin
        ];

      if (
        trade
      ) {
        trade.tpReached =
          false;

        trade.slReached =
          false;

        await replyTelegram(
          chatId,
          `📡 Monitoring Resumed

🪙 ${coin}`
        );
      }
    }

    try {
      await bot.answerCallbackQuery(
        query.id
      );
    } catch (error) {
      console.log(
        "Callback answer error:",
        error.message
      );
    }
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

    const state =
      USER_STATE[
        chatId
      ];

    if (
      !state
    ) {
      return;
    }

    if (
      typeof msg.text ===
        "string" &&
      msg.text.startsWith(
        "/"
      )
    ) {
      return;
    }

    /* ======================================================
       TARGET NET PROFIT
    ====================================================== */

    if (
      state.step ===
      "WAIT_PROFIT"
    ) {
      const parsed =
        parseUserNumber(
          msg.text
        );

      if (
        !parsed.valid ||
        parsed.value <=
          0
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Masukkan target profit yang sah."
        );

        return;
      }

      const targetProfit =
        parsed.value;

      const entry =
        PENDING_ENTRIES[
          state.coin
        ];

      if (
        !entry
      ) {
        delete USER_STATE[
          chatId
        ];

        await replyTelegram(
          chatId,
          "⚠️ Entry signal sudah expired."
        );

        return;
      }

      const plan =
        await resolveFinalOrderPlan(
          entry,
          targetProfit
        );

      if (
        !plan.allowed
      ) {
        delete USER_STATE[
          chatId
        ];

        delete PENDING_ENTRIES[
          state.coin
        ];

        await replyTelegram(
          chatId,
          `⚠️ ENTRY CANCELLED

🪙 ${entry.coin}

❌ ${plan.reason}

📡 Monitoring Next Entry...`
        );

        return;
      }

      const value =
        plan.quantity *
        plan.entryPrice;

      const maxCapital =
        MAX_CAPITAL[
          entry.confidence
        ];

      if (
        value >
        maxCapital
      ) {
        delete USER_STATE[
          chatId
        ];

        delete PENDING_ENTRIES[
          state.coin
        ];

        await replyTelegram(
          chatId,
          `⚠️ REQUIRED CAPITAL TOO HIGH

Required:
RM${value.toFixed(
            2
          )}

Maximum:
RM${maxCapital.toFixed(
            2
          )}`
        );

        return;
      }

      USER_STATE[
        chatId
      ] = {
        step:
          "WAIT_CONFIRM",

        coin:
          entry.coin,

        quantity:
          plan.quantity,

        value,

        targetProfit,

        entryPrice:
          plan.entryPrice,

        tp:
          plan.risk.tp,

        sl:
          plan.risk.sl,

        technicalEntry:
          entry.technicalEntry,

        fullFillEstimated:
          plan.depthSelection
            ?.fullFillEstimated ||
          false,

        orderbookDepth:
          plan.depthSelection
            ?.depthAvailable ||
          0,

        entrySource:
          plan.depthSelection
            ?.source ||
          "TECHNICAL ENTRY",
      };

      const fillText =
        plan.depthSelection
          ?.fullFillEstimated
          ? "✅ DEPTH CUKUP"
          : "⚠️ DEPTH TAK CUKUP — PARTIAL MATCH MUNGKIN";

      await replyTelegram(
        chatId,
        `📊 SUGGESTED LIMIT ORDER

🪙 ${entry.coin}

📐 Technical Entry:
RM${formatPrice(
          entry.coin,
          entry.technicalEntry
        )}

📌 Final Limit Entry:
RM${formatPrice(
          entry.coin,
          plan.entryPrice
        )}

📦 Suggested Quantity:
${plan.quantity.toLocaleString(
          "en-MY"
        )} ${entry.coin}

💰 Order Value:
RM${value.toFixed(
          2
        )}

🎯 TP:
RM${formatPrice(
          entry.coin,
          plan.risk.tp
        )}

🛑 SL:
RM${formatPrice(
          entry.coin,
          plan.risk.sl
        )}

💰 Target Net Profit:
RM${targetProfit.toFixed(
          2
        )}

📚 Orderbook:
${fillText}

📌 Entry Source:
${
  plan.depthSelection
    ?.source ||
  "TECHNICAL ENTRY"
}

PLACE ORDER?`,
        {
          reply_markup: {
            inline_keyboard: [
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

      return;
    }

    /* ======================================================
       MATCHED QUANTITY
    ====================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_QUANTITY"
    ) {
      const parsed =
        parseUserNumber(
          msg.text
        );

      if (
        !parsed.valid ||
        parsed.value <
          0
      ) {
        await replyTelegram(
          chatId,
          `⚠️ MATCHED QUANTITY TAK SAH

Masukkan nombor sahaja.

Contoh:
18000

Atau:
0`
        );

        return;
      }

      const matchedQuantity =
        parsed.value;

      const entry =
        PENDING_ENTRIES[
          state.coin
        ];

      if (
        !entry
      ) {
        delete USER_STATE[
          chatId
        ];

        await replyTelegram(
          chatId,
          "⚠️ Entry signal sudah expired."
        );

        return;
      }

      if (
        matchedQuantity ===
        0
      ) {
        const coin =
          state.coin;

        delete PENDING_ENTRIES[
          coin
        ];

        delete USER_STATE[
          chatId
        ];

        delete LAST_SIGNAL[
          coin
        ];

        LAST_GLOBAL_SIGNAL =
          0;

        await replyTelegram(
          chatId,
          `❌ ORDER NOT MATCHED

🪙 ${coin}

📌 Limit Entry:
RM${formatPrice(
            coin,
            state.entryPrice
          )}

📦 Matched Quantity:
0 ${coin}

📡 Trade Monitoring Stopped

🔎 Looking For Next Scalping Entry...`
        );

        return;
      }

      const buyFeeUnit =
        matchedQuantity *
        BUY_FEE;

      const netTradeUnit =
        matchedQuantity -
        buyFeeUnit;

      const totalBuyCost =
        matchedQuantity *
        state.entryPrice;

      const estimatedSellFeeUnit =
        netTradeUnit *
        SELL_FEE;

      const estimatedNetSellUnit =
        netTradeUnit -
        estimatedSellFeeUnit;

      const estimatedNetSellValue =
        state.tp *
        estimatedNetSellUnit;

      const adjustedProfit =
        estimatedNetSellValue -
        totalBuyCost;

      const targetAchievement =
        state.targetProfit >
          0
          ? (
              adjustedProfit /
              state.targetProfit
            ) *
            100
          : 0;

      ACTIVE_TRADES[
        state.coin
      ] = {
        coin:
          state.coin,

        buyPrice:
          state.entryPrice,

        tp:
          state.tp,

        sl:
          state.sl,

        matchedQuantity,

        suggestedQuantity:
          state.quantity,

        originalTargetProfit:
          state.targetProfit,

        adjustedProfit,

        buyFeeUnit,

        netTradeUnit,

        totalBuyCost,

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

      const matchType =
        matchedQuantity <
          state.quantity
          ? "✅ PARTIAL TRADE CONFIRMED"
          : "✅ TRADE CONFIRMED";

      await replyTelegram(
        chatId,
        `${matchType}

🪙 ${state.coin}

📌 Limit Entry:
RM${formatPrice(
          state.coin,
          state.entryPrice
        )}

📦 Suggested Quantity:
${state.quantity.toLocaleString(
          "en-MY"
        )} ${state.coin}

📦 Matched Quantity:
${matchedQuantity.toLocaleString(
          "en-MY"
        )} ${state.coin}

💸 Buy Fee:
${buyFeeUnit.toFixed(
          4
        )} ${state.coin}

📦 Net Trade Unit:
${netTradeUnit.toFixed(
          4
        )} ${state.coin}

💰 Capital Used:
RM${totalBuyCost.toFixed(
          2
        )}

🎯 TP:
RM${formatPrice(
          state.coin,
          state.tp
        )}

🛑 SL:
RM${formatPrice(
          state.coin,
          state.sl
        )}

💰 Original Target:
RM${state.targetProfit.toFixed(
          2
        )}

🔄 Profit Adjusted To:
${formatMoney(
          adjustedProfit
        )}${
          adjustedProfit <
            0
            ? " ⚠️"
            : ""
        }

📊 Target Achievement:
${targetAchievement.toFixed(
          1
        )}%

📡 Trade Monitoring Started...`
      );

      delete PENDING_ENTRIES[
        state.coin
      ];

      delete USER_STATE[
        chatId
      ];

      return;
    }

    /* ======================================================
       MATCHED SELL PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_SELL_PRICE"
    ) {
      const parsed =
        parseUserNumber(
          msg.text
        );

      if (
        !parsed.valid ||
        parsed.value <=
          0
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Masukkan matched sell price yang sah."
        );

        return;
      }

      const matchedPrice =
        parsed.value;

      const trade =
        ACTIVE_TRADES[
          state.coin
        ];

      if (
        !trade
      ) {
        delete USER_STATE[
          chatId
        ];

        await replyTelegram(
          chatId,
          "⚠️ Active trade tidak dijumpai."
        );

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
        trade.totalBuyCost;

      await replyTelegram(
        chatId,
        `✅ SELL TRADE CONFIRMED

🪙 ${state.coin}

💵 Matched Sell Price:
RM${formatPrice(
          state.coin,
          matchedPrice
        )}

📦 Gross Matched Buy:
${trade.matchedQuantity.toFixed(
          4
        )} ${state.coin}

📦 Net Sell Unit:
${netSellUnit.toFixed(
          4
        )} ${state.coin}

💰 Net Sell Value:
RM${netSellValue.toFixed(
          2
        )}

💸 Sell Fee:
${sellFeeUnit.toFixed(
          4
        )} ${state.coin}

📊 Net ${
          pnl >=
            0
            ? "Profit"
            : "Loss"
        }:
${formatMoney(
          pnl
        )}

📡 Realtime Monitoring Stopped

✅ Trade Closed`
      );

      delete ACTIVE_TRADES[
        state.coin
      ];

      delete USER_STATE[
        chatId
      ];

      return;
    }
  }
);
/* ============================================================
   GRT DAILY WATCH METRICS
============================================================ */

function getDailyWatchMetrics(
  state
) {
  if (
    !state
  ) {
    return null;
  }

  const totalExecutions =
    safeNumber(
      state.buyExecutions
    ) +
    safeNumber(
      state.sellExecutions
    );

  const totalVolume =
    safeNumber(
      state.buyVolume
    ) +
    safeNumber(
      state.sellVolume
    );

  const buyFrequencyPct =
    totalExecutions >
      0
      ? (
          state.buyExecutions /
          totalExecutions
        ) *
        100
      : 0;

  const sellFrequencyPct =
    totalExecutions >
      0
      ? (
          state.sellExecutions /
          totalExecutions
        ) *
        100
      : 0;

  const buyVolumePct =
    totalVolume >
      0
      ? (
          state.buyVolume /
          totalVolume
        ) *
        100
      : 0;

  const sellVolumePct =
    totalVolume >
      0
      ? (
          state.sellVolume /
          totalVolume
        ) *
        100
      : 0;

  const grtChangePct =
    state.grtOpen &&
    state.grtClose
      ? percentChange(
          state.grtOpen,
          state.grtClose
        )
      : 0;

  const btcChangePct =
    state.btcOpen &&
    state.btcClose
      ? percentChange(
          state.btcOpen,
          state.btcClose
        )
      : 0;

  const grtOutperformance =
    grtChangePct -
    btcChangePct;

  return {
    totalExecutions,

    totalVolume,

    buyFrequencyPct,

    sellFrequencyPct,

    buyVolumePct,

    sellVolumePct,

    grtChangePct,

    btcChangePct,

    grtOutperformance,
  };
}

/* ============================================================
   FORMAT LARGE GRT VOLUME
============================================================ */

function formatGRTVolume(
  value
) {
  const number =
    safeNumber(
      value
    );

  if (
    number >=
    1000000000
  ) {
    return `${(
      number /
      1000000000
    ).toFixed(
      2
    )}B`;
  }

  if (
    number >=
    1000000
  ) {
    return `${(
      number /
      1000000
    ).toFixed(
      2
    )}M`;
  }

  if (
    number >=
    1000
  ) {
    return `${(
      number /
      1000
    ).toFixed(
      1
    )}K`;
  }

  return number.toFixed(
    0
  );
}

/* ============================================================
   PREVIOUS DAILY SUMMARY
============================================================ */

function getPreviousDailySummary() {
  if (
    !GRT_DAILY_HISTORY.length
  ) {
    return null;
  }

  return GRT_DAILY_HISTORY[
    GRT_DAILY_HISTORY.length -
      1
  ];
}

/* ============================================================
   DAILY HISTORY AVERAGES
============================================================ */

function getDailyHistoryAverages() {
  if (
    !GRT_DAILY_HISTORY.length
  ) {
    return null;
  }

  const history =
    GRT_DAILY_HISTORY.slice(
      -GRT_DAILY_HISTORY_DAYS
    );

  return {
    grtChangePct:
      average(
        history.map(
          (item) =>
            safeNumber(
              item.grtChangePct
            )
        )
      ),

    buyFrequencyPct:
      average(
        history.map(
          (item) =>
            safeNumber(
              item.buyFrequencyPct
            )
        )
      ),

    buyVolumePct:
      average(
        history.map(
          (item) =>
            safeNumber(
              item.buyVolumePct
            )
        )
      ),

    btcChangePct:
      average(
        history.map(
          (item) =>
            safeNumber(
              item.btcChangePct
            )
        )
      ),

    grtOutperformance:
      average(
        history.map(
          (item) =>
            safeNumber(
              item.grtOutperformance
            )
        )
      ),
  };
}

/* ============================================================
   DAILY PRICE TREND
============================================================ */

function getDailyPriceTrend(
  currentMetrics
) {
  const averages =
    getDailyHistoryAverages();

  const previous =
    getPreviousDailySummary();

  if (
    !averages ||
    !previous
  ) {
    if (
      currentMetrics
        .grtChangePct >
      1
    ) {
      return "STRENGTHENING ↑";
    }

    if (
      currentMetrics
        .grtChangePct <
      -1
    ) {
      return "WEAKENING ↓";
    }

    return "NEUTRAL";
  }

  const strongerThanYesterday =
    currentMetrics
      .grtChangePct >
    previous.grtChangePct;

  const aboveAverage =
    currentMetrics
      .grtChangePct >
    averages.grtChangePct;

  if (
    strongerThanYesterday &&
    aboveAverage
  ) {
    return "STRENGTHENING ↑";
  }

  if (
    !strongerThanYesterday &&
    currentMetrics
      .grtChangePct <
      averages.grtChangePct
  ) {
    return "WEAKENING ↓";
  }

  return "STABLE";
}

/* ============================================================
   DAILY BUY ACTIVITY TREND
============================================================ */

function getDailyBuyTrend(
  currentMetrics
) {
  const averages =
    getDailyHistoryAverages();

  const previous =
    getPreviousDailySummary();

  if (
    !averages ||
    !previous
  ) {
    if (
      currentMetrics
        .buyFrequencyPct >=
        55 &&
      currentMetrics
        .buyVolumePct >=
        55
    ) {
      return "INCREASING ↑";
    }

    if (
      currentMetrics
        .buyFrequencyPct <
        45 &&
      currentMetrics
        .buyVolumePct <
        45
    ) {
      return "DECREASING ↓";
    }

    return "NEUTRAL";
  }

  const frequencyUp =
    currentMetrics
      .buyFrequencyPct >
    previous.buyFrequencyPct;

  const volumeUp =
    currentMetrics
      .buyVolumePct >
    previous.buyVolumePct;

  const aboveFrequencyAverage =
    currentMetrics
      .buyFrequencyPct >
    averages.buyFrequencyPct;

  const aboveVolumeAverage =
    currentMetrics
      .buyVolumePct >
    averages.buyVolumePct;

  if (
    frequencyUp &&
    volumeUp &&
    aboveFrequencyAverage &&
    aboveVolumeAverage
  ) {
    return "INCREASING ↑";
  }

  if (
    !frequencyUp &&
    !volumeUp
  ) {
    return "DECREASING ↓";
  }

  return "MIXED";
}

/* ============================================================
   7-DAY TREND
============================================================ */

function getSevenDayTrend(
  currentSummary
) {
  const history = [
    ...GRT_DAILY_HISTORY,
    currentSummary,
  ].slice(
    -GRT_DAILY_HISTORY_DAYS
  );

  if (
    history.length <
    3
  ) {
    return "BUILDING DATA";
  }

  let positiveDays =
    0;

  let strengtheningDays =
    0;

  for (
    let i = 0;
    i < history.length;
    i++
  ) {
    if (
      history[i]
        .grtChangePct >
      0
    ) {
      positiveDays++;
    }

    if (
      i >
        0 &&
      history[i]
        .grtChangePct >
      history[
        i - 1
      ].grtChangePct
    ) {
      strengtheningDays++;
    }
  }

  const positiveRatio =
    positiveDays /
    history.length;

  if (
    positiveRatio >=
      0.70 &&
    strengtheningDays >=
      Math.floor(
        (
          history.length -
          1
        ) /
        2
      )
  ) {
    return "UPTREND";
  }

  if (
    positiveRatio <=
    0.30
  ) {
    return "DOWNTREND";
  }

  return "SIDEWAY / MIXED";
}

/* ============================================================
   DAILY GRT MOMENTUM
============================================================ */

function getDailyGRTMomentum({
  currentMetrics,
  priceTrend,
  buyTrend,
}) {
  let score =
    0;

  if (
    currentMetrics
      .grtChangePct >
    0
  ) {
    score++;
  }

  if (
    currentMetrics
      .buyFrequencyPct >=
    52
  ) {
    score++;
  }

  if (
    currentMetrics
      .buyVolumePct >=
    52
  ) {
    score++;
  }

  if (
    currentMetrics
      .grtOutperformance >
    0
  ) {
    score++;
  }

  if (
    priceTrend.includes(
      "STRENGTHENING"
    )
  ) {
    score++;
  }

  if (
    buyTrend.includes(
      "INCREASING"
    )
  ) {
    score++;
  }

  if (
    score >=
    5
  ) {
    return "STRONGER";
  }

  if (
    score >=
    3
  ) {
    return "BUILDING";
  }

  if (
    score <=
    1
  ) {
    return "WEAK";
  }

  return "NEUTRAL";
}

/* ============================================================
   ALTCOIN ROTATION SIGNAL

   THIS IS NOT:
   "ALTCOIN SEASON CONFIRMED"

   It only evaluates:
   GRT vs BTC + GRT flow + multi-day trend.
============================================================ */

function getAltcoinRotationSignal({
  currentMetrics,
  buyTrend,
  priceTrend,
  sevenDayTrend,
}) {
  let score =
    0;

  if (
    currentMetrics
      .grtOutperformance >=
    1
  ) {
    score +=
      2;
  } else if (
    currentMetrics
      .grtOutperformance >
    0
  ) {
    score++;
  }

  if (
    currentMetrics
      .buyFrequencyPct >=
    55
  ) {
    score++;
  }

  if (
    currentMetrics
      .buyVolumePct >=
    55
  ) {
    score++;
  }

  if (
    currentMetrics
      .grtChangePct >
    0
  ) {
    score++;
  }

  if (
    buyTrend.includes(
      "INCREASING"
    )
  ) {
    score++;
  }

  if (
    priceTrend.includes(
      "STRENGTHENING"
    )
  ) {
    score++;
  }

  if (
    sevenDayTrend ===
    "UPTREND"
  ) {
    score++;
  }

  if (
    score >=
    7
  ) {
    return "STRONG ALTCOIN MOMENTUM";
  }

  if (
    score >=
    5
  ) {
    return "ROTATION BUILDING";
  }

  if (
    score >=
    3
  ) {
    return "EARLY ROTATION";
  }

  return "NO CLEAR SIGNAL";
}

/* ============================================================
   FINALIZE DAILY SUMMARY
============================================================ */

function finalizeDailySummary(
  state
) {
  const metrics =
    getDailyWatchMetrics(
      state
    );

  if (
    !metrics
  ) {
    return null;
  }

  const summary = {
    dateKey:
      state.dateKey,

    grtOpen:
      state.grtOpen,

    grtClose:
      state.grtClose,

    grtHigh:
      state.grtHigh,

    grtLow:
      state.grtLow,

    btcOpen:
      state.btcOpen,

    btcClose:
      state.btcClose,

    buyExecutions:
      state.buyExecutions,

    sellExecutions:
      state.sellExecutions,

    buyVolume:
      state.buyVolume,

    sellVolume:
      state.sellVolume,

    ...metrics,
  };

  const priceTrend =
    getDailyPriceTrend(
      metrics
    );

  const buyTrend =
    getDailyBuyTrend(
      metrics
    );

  const sevenDayTrend =
    getSevenDayTrend(
      summary
    );

  const momentum =
    getDailyGRTMomentum({
      currentMetrics:
        metrics,

      priceTrend,

      buyTrend,
    });

  const rotation =
    getAltcoinRotationSignal({
      currentMetrics:
        metrics,

      buyTrend,

      priceTrend,

      sevenDayTrend,
    });

  return {
    ...summary,

    priceTrend,

    buyTrend,

    sevenDayTrend,

    momentum,

    rotation,
  };
}

/* ============================================================
   BUILD GRT 24H REPORT
============================================================ */

function buildGRTDailyReport(
  summary
) {
  const previous =
    getPreviousDailySummary();

  const previousSection =
    previous
      ? `📊 VS YESTERDAY
Price: ${formatPercent(
          previous.grtChangePct
        )} → ${formatPercent(
          summary.grtChangePct
        )} ${
          summary.grtChangePct >=
          previous.grtChangePct
            ? "↑"
            : "↓"
        }
BUY Frequency: ${previous.buyFrequencyPct.toFixed(
          1
        )}% → ${summary.buyFrequencyPct.toFixed(
          1
        )}% ${
          summary.buyFrequencyPct >=
          previous.buyFrequencyPct
            ? "↑"
            : "↓"
        }
BUY Volume: ${previous.buyVolumePct.toFixed(
          1
        )}% → ${summary.buyVolumePct.toFixed(
          1
        )}% ${
          summary.buyVolumePct >=
          previous.buyVolumePct
            ? "↑"
            : "↓"
        }

`
      : "";

  return `🌙 GRT 24H DAILY REPORT
${formatMalaysiaDateLabel(
    summary.dateKey
  )} | 12AM → 12AM MYT

💵 PRICE
Open: RM${formatPrice(
    "GRT",
    summary.grtOpen
  )}
Close: RM${formatPrice(
    "GRT",
    summary.grtClose
  )}
24H: ${formatPercent(
    summary.grtChangePct
  )}
High: RM${formatPrice(
    "GRT",
    summary.grtHigh
  )}
Low: RM${formatPrice(
    "GRT",
    summary.grtLow
  )}

🧾 TRADE FREQUENCY
🟢 BUY: ${summary.buyFrequencyPct.toFixed(
    1
  )}%
🔴 SELL: ${summary.sellFrequencyPct.toFixed(
    1
  )}%

📦 EXECUTED VOLUME
🟢 BUY: ${formatGRTVolume(
    summary.buyVolume
  )} — ${summary.buyVolumePct.toFixed(
    1
  )}%
🔴 SELL: ${formatGRTVolume(
    summary.sellVolume
  )} — ${summary.sellVolumePct.toFixed(
    1
  )}%

${previousSection}₿ GRT VS BTC
GRT: ${formatPercent(
    summary.grtChangePct
  )}
BTC: ${formatPercent(
    summary.btcChangePct
  )}
GRT Outperform: ${formatPercent(
    summary.grtOutperformance
  )}

📈 TREND
Price: ${summary.priceTrend}
Buy Activity: ${summary.buyTrend}
7-Day: ${summary.sevenDayTrend}

🧠 SUMMARY
GRT MOMENTUM: ${summary.momentum}
ALTCOIN ROTATION: ${summary.rotation}`;
}

/* ============================================================
   DAILY WATCH ROLLOVER
============================================================ */

async function checkDailyWatchRollover() {
  const today =
    getMalaysiaDateKey();

  const state =
    ensureDailyWatchState();

  if (
    state.dateKey ===
    today
  ) {
    return;
  }

  if (
    LAST_DAILY_REPORT_KEY ===
    state.dateKey
  ) {
    GRT_DAILY_STATE =
      createDailyWatchState(
        today
      );

    saveDailyWatchSnapshot();

    return;
  }

  const grt =
    await getTicker(
      "GRT"
    );

  const btc =
    await getTicker(
      "BTC"
    );

  if (
    grt &&
    state.grtClose ===
      null
  ) {
    state.grtClose =
      grt.currentPrice;
  }

  if (
    btc &&
    state.btcClose ===
      null
  ) {
    state.btcClose =
      btc.currentPrice;
  }

  const summary =
    finalizeDailySummary(
      state
    );

  if (
    summary &&
    summary.grtOpen &&
    summary.grtClose
  ) {
    await sendTelegram(
      buildGRTDailyReport(
        summary
      )
    );

    GRT_DAILY_HISTORY.push(
      summary
    );

    GRT_DAILY_HISTORY =
      GRT_DAILY_HISTORY.slice(
        -GRT_DAILY_HISTORY_DAYS
      );

    LAST_DAILY_REPORT_KEY =
      state.dateKey;
  }

  GRT_DAILY_STATE =
    createDailyWatchState(
      today
    );

  if (
    grt
  ) {
    updateDailyWatchPrice(
      "GRT",
      grt.currentPrice
    );
  }

  if (
    btc
  ) {
    updateDailyWatchPrice(
      "BTC",
      btc.currentPrice
    );
  }

  saveDailyWatchSnapshot();
}

/* ============================================================
   CURRENT /GRt24 REPORT
============================================================ */

async function buildCurrentGRTDailyWatch() {
  const state =
    ensureDailyWatchState();

  const grt =
    await getTicker(
      "GRT"
    );

  const btc =
    await getTicker(
      "BTC"
    );

  if (
    grt
  ) {
    updateDailyWatchPrice(
      "GRT",
      grt.currentPrice
    );
  }

  if (
    btc
  ) {
    updateDailyWatchPrice(
      "BTC",
      btc.currentPrice
    );
  }

  const summary =
    finalizeDailySummary(
      state
    );

  if (
    !summary
  ) {
    return null;
  }

  return buildGRTDailyReport(
    summary
  ).replace(
    "12AM → 12AM MYT",
    "12AM → NOW MYT"
  );
}

/* ============================================================
   MANUAL COMMAND — /momentum
============================================================ */

bot.onText(
  /\/momentum/i,
  async (msg) => {
    const btc =
      await getTicker(
        "BTC"
      );

    const grt =
      await getTicker(
        "GRT"
      );

    if (
      !btc ||
      !grt
    ) {
      await replyTelegram(
        msg.chat.id,
        "⚠️ Momentum data unavailable."
      );

      return;
    }

    const btcMomentum =
      await getBTCMomentumText();

    const grtMomentum =
      await getGRTMomentumDecision(
        grt
      );

    const grtAction =
      grtMomentum.actionText
        ? `\n${grtMomentum.actionText}`
        : "";

    await replyTelegram(
      msg.chat.id,
      `📡 MOMENTUM CHECK

₿ BTC RM${formatPrice(
        "BTC",
        btc.currentPrice
      )}
⚡ MOMENTUM: ${btcMomentum}

🪙 GRT RM${formatPrice(
        "GRT",
        grt.currentPrice
      )}
⚡ MOMENTUM: ${grtMomentum.momentumText}${grtAction}`
    );
  }
);

/* ============================================================
   MANUAL COMMAND — /structure
============================================================ */

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

      if (
        data
      ) {
        sections.push(
          buildMarketStructureSection(
            data
          )
        );
      }
    }

    if (
      !sections.length
    ) {
      await replyTelegram(
        msg.chat.id,
        `📊 MARKET STRUCTURE UPDATE

Data belum mencukupi.`
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      `📊 MARKET STRUCTURE UPDATE

${sections.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

/* ============================================================
   MANUAL COMMAND — /flow
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

    const lines = [];

    for (
      const coin of
      coins
    ) {
      const analysis =
        await analyze2HMarketCondition(
          coin
        );

      if (
        !analysis
      ) {
        lines.push(
          `${coin}: DATA BELUM CUKUP`
        );

        continue;
      }

      const ratioText =
        analysis.relativeVolume
          .ratio !==
          null &&
        analysis.relativeVolume
          .ratio !==
          undefined
          ? analysis.relativeVolume
              .ratio
              .toFixed(
                2
              )
          : "N/A";

      lines.push(
        `${coin}: ${analysis.action}

Dominance:
${analysis.dominance.side} ${analysis.dominance.percent.toFixed(
          1
        )}%

Price Trend:
${analysis.priceTrend.direction} ${formatPercent(
          analysis.priceTrend.value
        )}

Volume:
${ratioText}x ${
          analysis.relativeVolume
            .label ||
          ""
        }`
      );
    }

    await replyTelegram(
      msg.chat.id,
      `🧠 2H BACKGROUND ANALYSIS

${lines.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

/* ============================================================
   MANUAL COMMAND — /grt24
============================================================ */

bot.onText(
  /\/grt24/i,
  async (msg) => {
    const report =
      await buildCurrentGRTDailyWatch();

    if (
      !report
    ) {
      await replyTelegram(
        msg.chat.id,
        "⚠️ GRT Daily Watch data belum mencukupi."
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      report
    );
  }
);

/* ============================================================
   MANUAL COMMAND — /watch
============================================================ */

bot.onText(
  /\/watch/i,
  async (msg) => {
    const lines =
      CORE_COINS.map(
        (coin) => {
          const watch =
            BREAKOUT_WATCH[
              coin
            ];

          if (
            !watch
          ) {
            return `${coin}: NO BREAKOUT WATCH`;
          }

          return `${coin}:
Resistance: RM${formatPrice(
            coin,
            watch.resistance
          )}
Strength: ${watch.resistanceStrength}/10
Executed Above: ${watch.aboveTradeCount}
Buyer Evidence: ${watch.buyEvidenceScore}
Failure Score: ${watch.failureScore}`;
        }
      );

    await replyTelegram(
      msg.chat.id,
      `👀 BREAKOUT WATCH

${lines.join(
  "\n\n━━━━━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

/* ============================================================
   MANUAL COMMAND — /status
============================================================ */

bot.onText(
  /\/status/i,
  async (msg) => {
    const stored =
      CORE_COINS.map(
        (coin) =>
          `${coin}: ${
            TRADE_HISTORY[
              coin
            ].length
          } trades`
      ).join(
        "\n"
      );

    const active =
      Object.keys(
        ACTIVE_TRADES
      );

    const pending =
      Object.keys(
        PENDING_ENTRIES
      );

    const candleAuth =
      LUNO_API_KEY_ID &&
      LUNO_API_KEY_SECRET
        ? "ACTIVE"
        : "NOT CONFIGURED";

    await replyTelegram(
      msg.chat.id,
      `✅ BOT ACTIVE

${stored}

📡 Price Alert:
5 MIN + MOMENTUM

⚡ Spike Threshold:
+${MOMENTUM_SPIKE_THRESHOLD_PCT}%

⏱️ Volume Baseline:
PREVIOUS 1H

🔐 Luno Candle API:
${candleAuth}

📊 Market Structure:
15 MIN

👀 Anti-Fake Breakout:
ACTIVE

🧾 Executed Confirmation:
ACTIVE

📚 Quantity-Aware Entry:
ACTIVE

🧠 2H Analysis:
BACKGROUND ONLY

🌙 GRT Daily Watch:
12AM → 12AM MYT

📈 Active Trades:
${
  active.length
    ? active.join(
        ", "
      )
    : "NONE"
}

⏳ Pending Entries:
${
  pending.length
    ? pending.join(
        ", "
      )
    : "NONE"
}`
    );
  }
);

/* ============================================================
   EXPRESS ROOT
============================================================ */

app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      status:
        "ACTIVE",

      service:
        SERVICE_CODE,

      time:
        new Date()
          .toISOString(),

      config: {
        priceAlert:
          "5 minutes",

        momentumSpikeThresholdPct:
          MOMENTUM_SPIKE_THRESHOLD_PCT,

        momentumBaseline:
          "previous completed 5m windows up to 1 hour",

        momentumMinWindows:
          MOMENTUM_MIN_BASELINE_WINDOWS,

        lunoCandleAuth:
          Boolean(
            LUNO_API_KEY_ID &&
            LUNO_API_KEY_SECRET
          ),

        grtRSI:
          "5m RSI14",

        grtMA:
          "1h MA9/MA50",

        marketStructure:
          "15 minutes",

        supportResistance:
          "live orderbook first",

        wallRating:
          "relative depth 1-10",

        breakoutWatch:
          "executed-trade based",

        antiFakeBreakout:
          true,

        scalpingScan:
          "1 minute",

        tradeMonitor:
          "15 seconds",

        tradeCollector:
          "5 seconds",

        marketCondition2H:
          "background only",

        grtDailyWatch:
          "12AM to 12AM Asia/Kuala_Lumpur",

        orderbookEntry:
          "quantity-aware",

        maxEntryChasePct:
          MAX_ENTRY_CHASE_PCT,

        minimumGrossRoomPct:
          MIN_GROSS_ROOM_PCT,

        buyFee:
          BUY_FEE,

        sellFee:
          SELL_FEE,
      },

      storedTrades:
        Object.fromEntries(
          SCAN_COINS.map(
            (coin) => [
              coin,
              TRADE_HISTORY[
                coin
              ].length,
            ]
          )
        ),

      activeTrades:
        Object.keys(
          ACTIVE_TRADES
        ),

      pendingEntries:
        Object.keys(
          PENDING_ENTRIES
        ),

      dailyWatch: {
        currentDate:
          GRT_DAILY_STATE
            ?.dateKey ||
          null,

        historyDays:
          GRT_DAILY_HISTORY
            .length,

        lastReport:
          LAST_DAILY_REPORT_KEY,
      },
    });
  }
);

/* ============================================================
   PRICE ENDPOINT
============================================================ */

app.get(
  "/price/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      return res
        .status(
          502
        )
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

/* ============================================================
   MOMENTUM ENDPOINT
============================================================ */

app.get(
  "/momentum/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Only BTC and GRT are supported",
        });
    }

    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      return res
        .status(
          502
        )
        .json({
          error:
            "Unable to fetch ticker",
        });
    }

    const volume =
      await getMomentumVolumeData(
        coin
      );

    if (
      coin ===
      "BTC"
    ) {
      return res.json({
        coin,

        currentPrice:
          ticker.currentPrice,

        volume,

        momentumText:
          await getBTCMomentumText(),
      });
    }

    const decision =
      await getGRTMomentumDecision(
        ticker
      );

    return res.json({
      coin,

      currentPrice:
        ticker.currentPrice,

      volume,

      decision,
    });
  }
);

/* ============================================================
   CANDLE TEST ENDPOINT
============================================================ */

app.get(
  "/candles/:coin/:duration",
  async (
    req,
    res
  ) => {
    const coin =
      String(
        req.params.coin ||
          ""
      ).toUpperCase();

    const duration =
      Number(
        req.params.duration
      );

    if (
      !CORE_COINS.includes(
        coin
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            "Only BTC and GRT are supported",
        });
    }

    if (
      ![
        300,
        3600,
      ].includes(
        duration
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            "Duration must be 300 or 3600",
        });
    }

    const candles =
      await getLunoCandles(
        coin,
        duration,
        duration ===
          300
          ? 30
          : 70
      );

    return res.json({
      authenticated:
        Boolean(
          LUNO_API_KEY_ID &&
          LUNO_API_KEY_SECRET
        ),

      coin,

      duration,

      count:
        candles.length,

      candles,
    });
  }
);

/* ============================================================
   ORDERBOOK ENDPOINT
============================================================ */

app.get(
  "/orderbook/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const orderBook =
      await getTopOrderBook(
        coin
      );

    if (
      !orderBook
    ) {
      return res
        .status(
          502
        )
        .json({
          error:
            "Unable to fetch orderbook",
        });
    }

    return res.json(
      orderBook
    );
  }
);

/* ============================================================
   BOOK STRUCTURE ENDPOINT
============================================================ */

app.get(
  "/book-structure/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      return res
        .status(
          502
        )
        .json({
          error:
            "Unable to fetch ticker",
        });
    }

    const structure =
      await getOrderBookStructure(
        coin,
        ticker.currentPrice
      );

    return res.json({
      ready:
        Boolean(
          structure
        ),

      currentPrice:
        ticker.currentPrice,

      data:
        structure,
    });
  }
);

/* ============================================================
   MARKET STRUCTURE ENDPOINT
============================================================ */

app.get(
  "/structure/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Only BTC and GRT are supported",
        });
    }

    const data =
      await analyzeMarketStructure(
        coin
      );

    return res.json({
      ready:
        Boolean(
          data
        ),

      data,
    });
  }
);

/* ============================================================
   NEXT RESISTANCE ENDPOINT
============================================================ */

app.get(
  "/next-resistance/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const ticker =
      await getTicker(
        coin
      );

    if (
      !ticker
    ) {
      return res
        .status(
          502
        )
        .json({
          error:
            "Unable to fetch ticker",
        });
    }

    const resistance =
      await findNextOrderBookResistance(
        coin,
        ticker.currentPrice
      );

    return res.json({
      coin,

      currentPrice:
        ticker.currentPrice,

      resistance,
    });
  }
);

/* ============================================================
   2H FLOW ENDPOINT
============================================================ */

app.get(
  "/flow/:coin",
  async (
    req,
    res
  ) => {
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
        .status(
          400
        )
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
        Boolean(
          data
        ),

      data,
    });
  }
);

/* ============================================================
   GRT DAILY WATCH ENDPOINT
============================================================ */

app.get(
  "/grt24",
  async (
    req,
    res
  ) => {
    const state =
      ensureDailyWatchState();

    const metrics =
      getDailyWatchMetrics(
        state
      );

    return res.json({
      timezone:
        MALAYSIA_TIMEZONE,

      dateKey:
        state.dateKey,

      state,

      metrics,

      history:
        GRT_DAILY_HISTORY,
    });
  }
);

/* ============================================================
   BREAKOUT WATCH ENDPOINT
============================================================ */

app.get(
  "/watch/:coin",
  (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Only BTC and GRT are supported",
        });
    }

    const watch =
      BREAKOUT_WATCH[
        coin
      ];

    if (
      !watch
    ) {
      return res.json({
        active:
          false,

        coin,
      });
    }

    return res.json({
      active:
        true,

      coin,

      resistance:
        watch.resistance,

      resistanceStrength:
        watch.resistanceStrength,

      startedAt:
        watch.startedAt,

      firstAboveAt:
        watch.firstAboveAt,

      lastAboveAt:
        watch.lastAboveAt,

      lastAbovePrice:
        watch.lastAbovePrice,

      aboveTradeCount:
        watch.aboveTradeCount,

      buyEvidenceScore:
        watch.buyEvidenceScore,

      acceptanceScore:
        watch.acceptanceScore,

      failureScore:
        watch.failureScore,

      confirmed:
        watch.confirmed,
    });
  }
);

/* ============================================================
   ACTIVE TRADE ENDPOINT
============================================================ */

app.get(
  "/trade/:coin",
  (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const trade =
      ACTIVE_TRADES[
        coin
      ];

    if (
      !trade
    ) {
      return res.json({
        active:
          false,

        coin,
      });
    }

    return res.json({
      active:
        true,

      coin,

      data:
        trade,
    });
  }
);

/* ============================================================
   PENDING ENTRY ENDPOINT
============================================================ */

app.get(
  "/pending/:coin",
  (
    req,
    res
  ) => {
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
        .status(
          400
        )
        .json({
          error:
            "Unsupported coin",
        });
    }

    const entry =
      PENDING_ENTRIES[
        coin
      ];

    if (
      !entry
    ) {
      return res.json({
        pending:
          false,

        coin,
      });
    }

    return res.json({
      pending:
        true,

      coin,

      data:
        entry,
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

    loadDailyWatchSnapshot();

    ensureDailyWatchState();

    await collectTradeHistory();

    await updateMemory();

    /* ========================================================
       TEST LUNO CANDLE AUTH
    ======================================================== */

    let candleStatus =
      "NOT CONFIGURED";

    if (
      LUNO_API_KEY_ID &&
      LUNO_API_KEY_SECRET
    ) {
      const candleTest =
        await getLunoCandles(
          "GRT",
          300,
          5
        );

      if (
        candleTest.length
      ) {
        candleStatus =
          "ACTIVE";

        console.log(
          `LUNO CANDLE API READY — ${candleTest.length} candles`
        );
      } else {
        candleStatus =
          "FAILED";

        console.log(
          "LUNO CANDLE API AUTH FAILED OR NO DATA"
        );
      }
    }

    /* ========================================================
       ORDERBOOK TEST
    ======================================================== */

    for (
      const coin of
      CORE_COINS
    ) {
      const ticker =
        await getTicker(
          coin
        );

      if (
        ticker
      ) {
        const structure =
          await getOrderBookStructure(
            coin,
            ticker.currentPrice
          );

        if (
          structure
        ) {
          console.log(
            `${coin} ORDERBOOK STRUCTURE READY`
          );
        }
      }
    }

    await sendTelegram(
      `✅ BOT ONLINE

🚀 INSTITUTIONAL SCALPING TERMINAL ACTIVE

📡 PRICE ALERT:
5 MIN + MOMENTUM

⚡ VOLUME SPIKE:
+${MOMENTUM_SPIKE_THRESHOLD_PCT}% VS 1H BASELINE

₿ BTC MOMENTUM:
RADAR ONLY

🪙 GRT MOMENTUM:
RSI 5M + MA9/MA50 1H
+ EXECUTED FLOW
+ PRICE RESPONSE
+ LIQUIDITY
+ ORDERBOOK

🔐 LUNO CANDLE API:
${candleStatus}

📊 MARKET STRUCTURE:
15 MIN

🟢 SUPPORT:
LIVE BUY WALL

🔴 RESISTANCE:
LIVE SELL WALL

👀 ANTI-FAKE BREAKOUT:
ACTIVE

🧾 EXECUTED TRADE CONFIRMATION:
ACTIVE

📚 QUANTITY-AWARE ORDERBOOK:
ACTIVE

🎯 MAX ENTRY CHASE:
${MAX_ENTRY_CHASE_PCT.toFixed(
        2
      )}%

🧱 NEXT RESISTANCE FILTER:
ACTIVE

🚀 SCALPING ENTRY:
ACTIVE

📦 MATCHED QUANTITY FLOW:
ACTIVE

🧠 2H ANALYSIS:
BACKGROUND ONLY

🌙 GRT 24H DAILY REPORT:
12AM MYT`
    );

    await checkDailyWatchRollover();

    saveDailyWatchSnapshot();
  }
);

/* ============================================================
   SCHEDULES
============================================================ */

/* ============================================================
   EXECUTED TRADE COLLECTOR
   EVERY 5 SECONDS
============================================================ */

setInterval(
  collectTradeHistory,
  TRADE_COLLECT_INTERVAL
);

/* ============================================================
   PRICE MEMORY
   EVERY 15 SECONDS
============================================================ */

setInterval(
  updateMemory,
  PRICE_MEMORY_INTERVAL
);

/* ============================================================
   GENERAL SCALPING SCAN
   EVERY 1 MINUTE
============================================================ */

setInterval(
  scanSignals,
  SCALPING_SCAN_INTERVAL
);

/* ============================================================
   PRICE + MOMENTUM ALERT
   EVERY 5 MINUTES
============================================================ */

setInterval(
  sendPriceAlert,
  PRICE_ALERT_INTERVAL
);

/* ============================================================
   MARKET STRUCTURE
   EVERY 15 MINUTES
============================================================ */

setInterval(
  sendMarketStructure,
  MARKET_STRUCTURE_INTERVAL
);

/* ============================================================
   ACTIVE TRADE MONITOR
   EVERY 15 SECONDS
============================================================ */

setInterval(
  monitorTrades,
  TRADE_MONITOR_INTERVAL
);

/* ============================================================
   GRT DAILY WATCH ROLLOVER
   CHECK EVERY 1 MINUTE

   Actual day boundary uses:
   Asia/Kuala_Lumpur
============================================================ */

setInterval(
  checkDailyWatchRollover,
  DAILY_WATCH_CHECK_INTERVAL
);

/* ============================================================
   DAILY WATCH SNAPSHOT
   EVERY 1 MINUTE
============================================================ */

setInterval(
  saveDailyWatchSnapshot,
  DAILY_WATCH_SAVE_INTERVAL
);
