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

bot.setMyCommands([
  {
    command: "momentum",
    description: "Check BTC & GRT momentum",
  },
  {
    command: "structure",
    description: "Check BTC & GRT market structure",
  },
  {
    command: "flow",
    description: "Check 2H executed flow",
  },
  {
    command: "grt24",
    description: "GRT 24H daily report",
  },
  {
    command: "grthold",
    description: "Manual GRT hold & projected reach",
  },
  {
    command: "buytest",
    description: "GRT BUY NOW test statistics",
  },
  {
    command: "buylast",
    description: "Show latest GRT BUY NOW result",
  },
  {
    command: "tuning",
    description: "Check GRT tuning status",
  },
  {
    command: "status",
    description: "Bot system status",
  },
]).catch((error) => {
  console.log(
    "Telegram command menu error:",
    error.message
  );
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
const LAST_ALERT_PRICE = {};

const PRICE_MEMORY = {};

const BREAKOUT_WATCH = {};

const LAST_FAKE_BREAKOUT = {};
const LAST_CONFIRMED_BREAKOUT = {};

/* ============================================================
   GRT BUY NOW LEARNING STATE
============================================================ */

let GRT_BUY_NOW_HISTORY = [];
let LAST_GRT_BUY_NOW_SIGNAL = 0;
let LAST_TUNING_SUGGESTION_COUNT = 0;
let GRT_DYNAMIC_BUY_VOLUME_MIN_PCT = 55;

let LAST_BTC_SURGE_STATE =
  "BUY_SURGE_OFF";

let GRT_VALIDATION_STARTED_AT =
  null;

let LAST_GRT_FINAL_DECISION =
  "DONT_BUY";

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

let TRADE_HISTORY_BUSY = false;

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

const GRT_MIN_PRACTICAL_TP_ROOM_PCT =
  0.90;

const TP_RESISTANCE_BUFFER_PCT =
  0.25;

const MEANINGFUL_RESISTANCE_MIN_RATING =
  5;

const MEANINGFUL_RESISTANCE_MIN_RATIO =
  1.35;

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
   MOMENTUM ENTRY + LEARNING CONFIG
============================================================ */

const BTC_BUY_SURGE_MIN_BUY_PCT = 55;
const BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT = 0.03;
const BTC_BUY_SURGE_CONFIRM_MIN_AGE_SEC = 120;

const GRT_EARLY_MIN_BUY_VOLUME_PCT = 52;
const GRT_EARLY_MIN_PRICE_RESPONSE_PCT = 0.03;
const GRT_BUY_NOW_COOLDOWN_MS = 15 * 60 * 1000;

/* ============================================================
   GRT SUSTAINED MOMENTUM / ACCUMULATION CONFIG
============================================================ */

const GRT_SUSTAINED_MIN_BUY_VOLUME_PCT = 54;
const GRT_SUSTAINED_MIN_BUY_FREQUENCY_PCT = 54;

const GRT_SUSTAINED_15M_MOVE_PCT = 0.45;
const GRT_SUSTAINED_30M_MOVE_PCT = 0.75;

const GRT_ACCELERATION_5M_MOVE_PCT = 0.55;
const GRT_ACCELERATION_15M_MOVE_PCT = 1.00;
const GRT_ACCELERATION_30M_MOVE_PCT = 1.50;

/*
  VALIDATING tak boleh lagi lock
  berjam-jam macam kes pagi tadi.
*/

const GRT_VALIDATION_MAX_MS =
  20 * 60 * 1000;

/*
  Kalau price dah bergerak kuat dalam 30M
  + ada BUY evidence, bot wajib re-evaluate.
*/

const GRT_FAST_REEVALUATE_30M_MOVE_PCT =
  1.00;

/*
  Resistance sekarang strength-aware.

  1-3  = WEAK
  4-6  = MEDIUM
  7-10 = STRONG
*/

const GRT_WEAK_RESISTANCE_MAX_RATING =
  3;

const GRT_MEDIUM_RESISTANCE_MAX_RATING =
  6;

const GRT_STRONG_RESISTANCE_MIN_RATING =
  7;

/*
  Hard veto hanya untuk evidence
  yang betul-betul bearish.
*/

const GRT_HARD_SELL_VOLUME_PCT =
  65;

const GRT_HARD_PRICE_DROP_5M_PCT =
  -0.35;

/*
  /grthold projected reach.

  BUKAN fixed take-profit.
  Ini base projection sebelum
  orderbook / momentum adjustment.
*/

const GRT_HOLD_BASE_REACH = {
  WEAK: 0.75,
  NEUTRAL: 1.25,
  BUILDING: 1.80,
  STRONG: 2.75,
  ACCELERATING: 4.00,
};

const GRT_HOLD_MAX_DYNAMIC_REACH_PCT =
  6.00;

const GRT_BUY_NOW_HISTORY_LIMIT = 250;
const GRT_BUY_NOW_SUCCESS_PCT = 0.30;
const GRT_BUY_NOW_FALSE_PCT = -0.30;

const GRT_BUY_NOW_MONITOR_INTERVAL =
  60 * 1000;

const GRT_TUNING_MIN_COMPLETED_SIGNALS =
  20;

const GRT_BUY_NOW_FILE =
  process.env.GRT_BUY_NOW_FILE ||
  "/tmp/grt-buy-now-history.json";

const GRT_TUNING_FILE =
  process.env.GRT_TUNING_FILE ||
  "/tmp/grt-momentum-tuning.json";

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
   BASIC HELPERS
============================================================ */

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

function average(
  values
) {
  const clean =
    values.filter(
      (value) =>
        Number.isFinite(
          Number(value)
        )
    );

  if (
    !clean.length
  ) {
    return 0;
  }

  return (
    clean.reduce(
      (sum, value) =>
        sum +
        Number(value),
      0
    ) /
    clean.length
  );
}

function percentChange(
  oldValue,
  newValue
) {
  const oldNumber =
    safeNumber(
      oldValue
    );

  const newNumber =
    safeNumber(
      newValue
    );

  if (
    oldNumber <= 0
  ) {
    return 0;
  }

  return (
    (
      newNumber -
      oldNumber
    ) /
    oldNumber
  ) * 100;
}

function formatPercent(
  value,
  digits = 2
) {
  const number =
    safeNumber(
      value
    );

  const sign =
    number > 0
      ? "+"
      : "";

  return `${sign}${number.toFixed(
    digits
  )}%`;
}

function formatPrice(
  coin,
  price
) {
  const value =
    safeNumber(
      price
    );

  if (
    coin === "BTC"
  ) {
    return value.toFixed(
      2
    );
  }

  if (
    [
      "GRT",
      "XLM",
    ].includes(
      coin
    )
  ) {
    return value.toFixed(
      4
    );
  }

  if (
    coin === "CRV"
  ) {
    return value.toFixed(
      3
    );
  }

  return value.toFixed(
    2
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function sleep(
  ms
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function getPair(
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

/* ============================================================
   TELEGRAM HELPERS
============================================================ */

async function sendTelegram(
  text,
  options = {}
) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      `${SERVICE_CODE}\n\n${text}`,
      options
    );
  } catch (
    error
  ) {
    console.log(
      "Telegram send error:",
      error.message
    );

    return null;
  }
}

async function replyTelegram(
  chatId,
  text,
  options = {}
) {
  try {
    return await bot.sendMessage(
      chatId,
      `${SERVICE_CODE}\n\n${text}`,
      options
    );
  } catch (
    error
  ) {
    console.log(
      "Telegram reply error:",
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
    const pair =
      getPair(
        coin
      );

    const response =
      await axios.get(
        "https://api.luno.com/api/1/ticker",
        {
          params: {
            pair,
          },

          timeout:
            10000,
        }
      );

    const data =
      response.data ||
      {};

    const currentPrice =
      safeNumber(
        data.last_trade
      );

    const bid =
      safeNumber(
        data.bid
      );

    const ask =
      safeNumber(
        data.ask
      );

    if (
      currentPrice <=
      0
    ) {
      return null;
    }

    return {
      coin,
      pair,
      currentPrice,
      bid,
      ask,

      timestamp:
        Date.now(),
    };
  } catch (
    error
  ) {
    console.log(
      `Ticker ${coin}:`,
      error.response?.data ||
        error.message
    );

    return null;
  }
}

/* ============================================================
   LUNO ORDERBOOK
============================================================ */

async function getTopOrderBook(
  coin
) {
  try {
    const pair =
      getPair(
        coin
      );

    const response =
      await axios.get(
        "https://api.luno.com/api/1/orderbook_top",
        {
          params: {
            pair,
          },

          timeout:
            10000,
        }
      );

    const data =
      response.data ||
      {};

    const bids =
      (
        data.bids ||
        []
      )
        .map(
          (item) => ({
            price:
              safeNumber(
                item.price
              ),

            volume:
              safeNumber(
                item.volume
              ),
          })
        )
        .filter(
          (item) =>
            item.price >
              0 &&
            item.volume >
              0
        )
        .sort(
          (a, b) =>
            b.price -
            a.price
        );

    const asks =
      (
        data.asks ||
        []
      )
        .map(
          (item) => ({
            price:
              safeNumber(
                item.price
              ),

            volume:
              safeNumber(
                item.volume
              ),
          })
        )
        .filter(
          (item) =>
            item.price >
              0 &&
            item.volume >
              0
        )
        .sort(
          (a, b) =>
            a.price -
            b.price
        );

    return {
      coin,
      pair,
      bids,
      asks,

      timestamp:
        Date.now(),
    };
  } catch (
    error
  ) {
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
  since = null,
  maxPages = 1
) {
  try {
    const pair =
      getPair(
        coin
      );

    const allTrades =
      [];

    let nextSince =
      since;

    for (
      let page =
        0;
      page <
        maxPages;
      page++
    ) {
      const params = {
        pair,
      };

      if (
        nextSince !==
          null &&
        nextSince !==
          undefined
      ) {
        params.since =
          nextSince;
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

      const rawTrades =
        response.data
          ?.trades ||
        [];

      if (
        !rawTrades.length
      ) {
        break;
      }

      const parsedTrades =
        rawTrades
          .map(
            (trade) => {
              const timestamp =
                safeNumber(
                  trade.timestamp
                );

              const price =
                safeNumber(
                  trade.price
                );

              const volume =
                safeNumber(
                  trade.volume
                );

              const sequence =
                String(
                  trade.sequence ||
                    `${timestamp}-${price}-${volume}`
                );

              const isBuy =
                trade.is_buy ===
                  true ||
                trade.is_buy ===
                  "true";

              return {
                timestamp,
                price,
                volume,
                sequence,
                isBuy,
              };
            }
          )
          .filter(
            (trade) =>
              trade.timestamp >
                0 &&
              trade.price >
                0 &&
              trade.volume >
                0
          )
          .sort(
            (a, b) =>
              a.timestamp -
              b.timestamp
          );

      if (
        !parsedTrades.length
      ) {
        break;
      }

      allTrades.push(
        ...parsedTrades
      );

      const lastTrade =
        parsedTrades[
          parsedTrades.length -
            1
        ];

      const newSince =
        lastTrade.timestamp +
        1;

      if (
        nextSince !==
          null &&
        nextSince !==
          undefined &&
        newSince <=
          nextSince
      ) {
        break;
      }

      nextSince =
        newSince;

      if (
        rawTrades.length <
        100
      ) {
        break;
      }

      await sleep(
        100
      );
    }

    const unique =
      new Map();

    for (
      const trade of
      allTrades
    ) {
      unique.set(
        trade.sequence,
        trade
      );
    }

    return [
      ...unique.values(),
    ].sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );
  } catch (
    error
  ) {
    console.log(
      `Trades ${coin}:`,
      error.response?.data ||
        error.message
    );

    return [];
  }
}

/* ============================================================
   TRADE HISTORY CLEANUP
============================================================ */

function cleanTradeHistory(
  coin
) {
  const cutoff =
    Date.now() -
    HISTORY_KEEP_MS;

  TRADE_HISTORY[
    coin
  ] =
    TRADE_HISTORY[
      coin
    ].filter(
      (trade) =>
        trade.timestamp >=
        cutoff
    );

  const activeSequences =
    new Set(
      TRADE_HISTORY[
        coin
      ].map(
        (trade) =>
          trade.sequence
      )
    );

  SEEN_TRADE_SEQUENCES[
    coin
  ] =
    activeSequences;
}

/* ============================================================
   EXECUTED TRADE COLLECTOR
============================================================ */

async function collectTradeHistory() {
  if (
    TRADE_HISTORY_BUSY
  ) {
    return;
  }

  TRADE_HISTORY_BUSY =
    true;

  try {
    for (
      const coin of
      SCAN_COINS
    ) {
      try {
        const history =
          TRADE_HISTORY[
            coin
          ];

        const latestTimestamp =
          history.length
            ? history[
                history.length -
                  1
              ].timestamp
            : Date.now() -
              TWO_HOURS;

        const trades =
          await getRecentTrades(
            coin,
            latestTimestamp
          );

        if (
          !trades.length
        ) {
          cleanTradeHistory(
            coin
          );

          continue;
        }

        trades.sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );

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

          if (
            coin ===
            "GRT"
          ) {
            updateDailyWatchTrade(
              coin,
              trade
            );
          }

          await processBreakoutTrade(
            coin,
            trade
          );
        }

        TRADE_HISTORY[
          coin
        ].sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );

        cleanTradeHistory(
          coin
        );
      } catch (
        error
      ) {
        console.log(
          `Trade collector ${coin}:`,
          error.message
        );
      }

      await sleep(
        100
      );
    }
  } finally {
    TRADE_HISTORY_BUSY =
      false;
  }
}

/* ============================================================
   STARTUP TRADE HISTORY BACKFILL
============================================================ */

async function backfillTradeHistory() {
  if (
    TRADE_HISTORY_BUSY
  ) {
    return;
  }

  TRADE_HISTORY_BUSY =
    true;

  try {
    for (
      const coin of
      SCAN_COINS
    ) {
      try {
        const since =
          Date.now() -
          TWO_HOURS;

        const trades =
          await getRecentTrades(
            coin,
            since,
            8
          );

        if (
          !trades.length
        ) {
          console.log(
            `${coin} BACKFILL — NO DATA`
          );

          continue;
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
          ].push(
            trade
          );

          if (
            coin ===
            "GRT"
          ) {
            updateDailyWatchTrade(
              coin,
              trade
            );
          }
        }

        TRADE_HISTORY[
          coin
        ].sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );

        cleanTradeHistory(
          coin
        );

        console.log(
          `${coin} BACKFILL READY — ${TRADE_HISTORY[
            coin
          ].length} trades`
        );
      } catch (
        error
      ) {
        console.log(
          `Backfill ${coin}:`,
          error.message
        );
      }

      await sleep(
        150
      );
    }
  } finally {
    TRADE_HISTORY_BUSY =
      false;
  }
}

/* ============================================================
   TRADE WINDOW
============================================================ */

function getTradesInWindow(
  coin,
  windowMs,
  endTime =
    Date.now()
) {
  const startTime =
    endTime -
    windowMs;

  return (
    TRADE_HISTORY[
      coin
    ] ||
    []
  ).filter(
    (trade) =>
      trade.timestamp >=
        startTime &&
      trade.timestamp <=
        endTime
  );
}

/* ============================================================
   EXECUTED FLOW SUMMARY
============================================================ */

function getExecutedFlowSummary(
  coin,
  windowMs =
    5 * 60 * 1000
) {
  const trades =
    getTradesInWindow(
      coin,
      windowMs
    );

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

  const buyVolumePct =
    totalVolume >
      0
      ? (
          buyVolume /
          totalVolume
        ) * 100
      : 0;

  const sellVolumePct =
    totalVolume >
      0
      ? (
          sellVolume /
          totalVolume
        ) * 100
      : 0;

  const buyFrequencyPct =
    totalCount >
      0
      ? (
          buyCount /
          totalCount
        ) * 100
      : 0;

  const sellFrequencyPct =
    totalCount >
      0
      ? (
          sellCount /
          totalCount
        ) * 100
      : 0;

  return {
    trades:
      trades.length,

    buyVolume,
    sellVolume,
    totalVolume,

    buyCount,
    sellCount,
    totalCount,

    buyVolumePct,
    sellVolumePct,

    buyFrequencyPct,
    sellFrequencyPct,
  };
}

/* ============================================================
   PRICE RESPONSE FROM EXECUTED TRADES
============================================================ */

function getExecutedPriceResponse(
  coin,
  windowMs =
    5 * 60 * 1000
) {
  const trades =
    getTradesInWindow(
      coin,
      windowMs
    ).sort(
      (a, b) =>
        a.timestamp -
        b.timestamp
    );

  if (
    trades.length <
    2
  ) {
    return {
      ready:
        false,

      open:
        null,

      close:
        null,

      changePct:
        0,
    };
  }

  const open =
    trades[0].price;

  const close =
    trades[
      trades.length -
        1
    ].price;

  return {
    ready:
      true,

    open,
    close,

    changePct:
      percentChange(
        open,
        close
      ),
  };
}

/* ============================================================
   PRICE MEMORY
============================================================ */

function addPriceMemory(
  coin,
  price
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

  const now =
    Date.now();

  PRICE_MEMORY[
    coin
  ].push({
    timestamp:
      now,

    price:
      safeNumber(
        price
      ),
  });

  const cutoff =
    now -
    HISTORY_KEEP_MS;

  PRICE_MEMORY[
    coin
  ] =
    PRICE_MEMORY[
      coin
    ].filter(
      (item) =>
        item.timestamp >=
        cutoff
    );
}

function getPriceMemoryWindow(
  coin,
  windowMs,
  endTime =
    Date.now()
) {
  const startTime =
    endTime -
    windowMs;

  return (
    PRICE_MEMORY[
      coin
    ] ||
    []
  ).filter(
    (item) =>
      item.timestamp >=
        startTime &&
      item.timestamp <=
        endTime
  );
}

/* ============================================================
   PRICE CHANGE FROM MEMORY
============================================================ */

function getMemoryPriceChange(
  coin,
  windowMs
) {
  const points =
    getPriceMemoryWindow(
      coin,
      windowMs
    );

  if (
    points.length <
    2
  ) {
    return {
      ready:
        false,

      open:
        null,

      close:
        null,

      changePct:
        0,
    };
  }

  const open =
    points[0].price;

  const close =
    points[
      points.length -
        1
    ].price;

  return {
    ready:
      true,

    open,
    close,

    changePct:
      percentChange(
        open,
        close
      ),
  };
}

/* ============================================================
   UPDATE PRICE MEMORY
============================================================ */

async function updateMemory() {
  for (
    const coin of
    SCAN_COINS
  ) {
    try {
      const ticker =
        await getTicker(
          coin
        );

      if (
        !ticker
      ) {
        continue;
      }

      addPriceMemory(
        coin,
        ticker.currentPrice
      );

      if (
        coin ===
          "GRT" ||
        coin ===
          "BTC"
      ) {
        updateDailyWatchPrice(
          coin,
          ticker.currentPrice
        );
      }
    } catch (
      error
    ) {
      console.log(
        `Memory ${coin}:`,
        error.message
      );
    }

    await sleep(
      100
    );
  }
}
/* ============================================================
   AUTHENTICATED LUNO REQUEST
============================================================ */

function getLunoAuthConfig() {
  if (
    !LUNO_API_KEY_ID ||
    !LUNO_API_KEY_SECRET
  ) {
    return null;
  }

  return {
    auth: {
      username:
        LUNO_API_KEY_ID,

      password:
        LUNO_API_KEY_SECRET,
    },

    timeout:
      10000,
  };
}

/* ============================================================
   AUTHENTICATED LUNO CANDLES
============================================================ */

async function getLunoCandles(
  coin,
  durationSec,
  candleCount =
    100
) {
  const authConfig =
    getLunoAuthConfig();

  if (
    !authConfig
  ) {
    return [];
  }

  try {
    const pair =
      getPair(
        coin
      );

    const durationMs =
      durationSec *
      1000;

    const since =
      Date.now() -
      (
        candleCount +
        5
      ) *
      durationMs;

    const response =
      await axios.get(
        "https://api.luno.com/api/exchange/1/candles",
        {
          ...authConfig,

          params: {
            pair,

            duration:
              durationSec,

            since,
          },
        }
      );

    const candles =
      response.data
        ?.candles ||
      [];

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
          candle.open >
            0 &&
          candle.close >
            0 &&
          candle.high >
            0 &&
          candle.low >
            0
      )
      .sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      );
  } catch (
    error
  ) {
    console.log(
      `Candles ${coin} ${durationSec}:`,
      error.response?.data ||
        error.message
    );

    return [];
  }
}

/* ============================================================
   GRT ROLLING 24H MARKET STATS
============================================================ */

const GRT_24H_SNAPSHOT_FILE =
  process.env.GRT_24H_SNAPSHOT_FILE ||
  "/tmp/grt-24h-snapshot.json";

let GRT_24H_PREVIOUS_SNAPSHOT =
  null;

/* ============================================================
   24H SNAPSHOT SAVE / LOAD
============================================================ */

function saveGRT24hSnapshot(
  snapshot
) {
  if (
    !snapshot
  ) {
    return;
  }

  try {
    fs.writeFileSync(
      GRT_24H_SNAPSHOT_FILE,
      JSON.stringify(
        snapshot,
        null,
        2
      )
    );
  } catch (
    error
  ) {
    console.log(
      "GRT 24H snapshot save error:",
      error.message
    );
  }
}

function loadGRT24hSnapshot() {
  try {
    if (
      !fs.existsSync(
        GRT_24H_SNAPSHOT_FILE
      )
    ) {
      return;
    }

    const raw =
      fs.readFileSync(
        GRT_24H_SNAPSHOT_FILE,
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
      parsed &&
      parsed.timestamp
    ) {
      GRT_24H_PREVIOUS_SNAPSHOT =
        parsed;
    }
  } catch (
    error
  ) {
    console.log(
      "GRT 24H snapshot load error:",
      error.message
    );
  }
}

/* ============================================================
   COMPLETED CANDLES ONLY
============================================================ */

function getCompletedCandles(
  candles,
  durationSec
) {
  const now =
    Date.now();

  const durationMs =
    durationSec *
    1000;

  return candles.filter(
    (candle) =>
      candle.timestamp +
        durationMs <=
      now
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
      period +
        1
  ) {
    return null;
  }

  let gains =
    0;

  let losses =
    0;

  for (
    let i =
      1;
    i <=
      period;
    i++
  ) {
    const change =
      closes[i] -
      closes[
        i - 1
      ];

    if (
      change >=
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
      period +
      1;
    i <
      closes.length;
    i++
  ) {
    const change =
      closes[i] -
      closes[
        i - 1
      ];

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

  const rs =
    averageGain /
    averageLoss;

  return (
    100 -
    100 /
      (
        1 +
        rs
      )
  );
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

  const slice =
    values.slice(
      -period
    );

  return average(
    slice
  );
}

/* ============================================================
   CANDLE TECHNICAL HELPER
============================================================ */

function analyzeCandle(
  candle
) {
  if (
    !candle ||
    candle.open <=
      0 ||
    candle.high <=
      0 ||
    candle.low <=
      0 ||
    candle.close <=
      0
  ) {
    return {
      ready:
        false,
    };
  }

  const bodyPct =
    percentChange(
      candle.open,
      candle.close
    );

  const range =
    candle.high -
    candle.low;

  const closePositionPct =
    range >
      0
      ? (
          (
            candle.close -
            candle.low
          ) /
          range
        ) * 100
      : 50;

  const bullish =
    candle.close >
    candle.open;

  const bearish =
    candle.close <
    candle.open;

  const strongBullish =
    bullish &&
    bodyPct >=
      0.20 &&
    closePositionPct >=
      65;

  const strongBearish =
    bearish &&
    bodyPct <=
      -0.20 &&
    closePositionPct <=
      35;

  let direction =
    "NEUTRAL";

  if (
    strongBullish
  ) {
    direction =
      "STRONG BULLISH";
  } else if (
    bullish
  ) {
    direction =
      "BULLISH";
  } else if (
    strongBearish
  ) {
    direction =
      "STRONG BEARISH";
  } else if (
    bearish
  ) {
    direction =
      "BEARISH";
  }

  return {
    ready:
      true,

    open:
      candle.open,

    high:
      candle.high,

    low:
      candle.low,

    close:
      candle.close,

    bodyPct,

    closePositionPct,

    bullish,
    bearish,

    strongBullish,
    strongBearish,

    direction,
  };
}

/* ============================================================
   GRT 5M CANDLE MOMENTUM

   5M = FAST TRIGGER
============================================================ */

async function getGRT5mCandleMomentum() {
  const candles =
    await getLunoCandles(
      "GRT",
      300,
      8
    );

  if (
    !candles.length
  ) {
    return {
      ready:
        false,
    };
  }

  const now =
    Date.now();

  const durationMs =
    300 *
    1000;

  const completed =
    getCompletedCandles(
      candles,
      300
    );

  const live =
    candles.find(
      (candle) =>
        candle.timestamp +
          durationMs >
        now
    );

  const liveAgeSec =
    live
      ? (
          now -
          live.timestamp
        ) /
        1000
      : 0;

  let selected =
    null;

  let usingLive =
    false;

  if (
    live &&
    liveAgeSec >=
      MOMENTUM_MIN_CURRENT_CANDLE_AGE_SEC
  ) {
    selected =
      live;

    usingLive =
      true;
  } else if (
    completed.length
  ) {
    selected =
      completed[
        completed.length -
          1
      ];
  }

  if (
    !selected
  ) {
    return {
      ready:
        false,
    };
  }

  return {
    ...analyzeCandle(
      selected
    ),

    usingLive,

    liveAgeSec,
  };
}

/* ============================================================
   GRT 5M RSI TREND
============================================================ */

async function getGRT5mRSI() {
  const candles =
    await getLunoCandles(
      "GRT",
      MOMENTUM_CANDLE_DURATION_SEC,
      40
    );

  const completed =
    getCompletedCandles(
      candles,
      MOMENTUM_CANDLE_DURATION_SEC
    );

  if (
    completed.length <
    GRT_RSI_PERIOD +
      3
  ) {
    return {
      ready:
        false,
    };
  }

  const durationMs =
    MOMENTUM_CANDLE_DURATION_SEC *
    1000;

  const now =
    Date.now();

  const liveCandle =
    candles.find(
      (candle) =>
        candle.timestamp +
          durationMs >
        now
    );

  const liveCandleAgeSec =
    liveCandle
      ? (
          now -
          liveCandle.timestamp
        ) /
        1000
      : 0;

  const useLiveCandle =
    Boolean(
      liveCandle &&
      liveCandleAgeSec >=
        MOMENTUM_MIN_CURRENT_CANDLE_AGE_SEC
    );

  const closes =
    completed.map(
      (candle) =>
        candle.close
    );

  if (
    useLiveCandle
  ) {
    closes.push(
      liveCandle.close
    );
  }

  const currentRSI =
    calculateRSI(
      closes,
      GRT_RSI_PERIOD
    );

  const previousRSI =
    calculateRSI(
      closes.slice(
        0,
        -1
      ),
      GRT_RSI_PERIOD
    );

  if (
    currentRSI ===
      null ||
    previousRSI ===
      null
  ) {
    return {
      ready:
        false,
    };
  }

  const change =
    currentRSI -
    previousRSI;

  let direction =
    "FLAT";

  if (
    change >=
    1
  ) {
    direction =
      "RISING";
  } else if (
    change <=
    -1
  ) {
    direction =
      "FALLING";
  }

  return {
    ready:
      true,

    current:
      currentRSI,

    previous:
      previousRSI,

    change,

    direction,

    usingLiveCandle:
      useLiveCandle,

    liveCandleAgeSec,

    oversold:
      currentRSI <=
      30,

    overbought:
      currentRSI >=
      70,
  };
}

/* ============================================================
   GRT 1H MA9 / MA50
============================================================ */

async function getGRT1hMA() {
  const candles =
    await getLunoCandles(
      "GRT",
      3600,
      70
    );

  const completed =
    getCompletedCandles(
      candles,
      3600
    );

  if (
    completed.length <
    GRT_MA_SLOW
  ) {
    return {
      ready:
        false,
    };
  }

  const closes =
    completed.map(
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

  if (
    ma9 ===
      null ||
    ma50 ===
      null
  ) {
    return {
      ready:
        false,
    };
  }

  const gapPct =
    ma50 >
      0
      ? (
          (
            ma9 -
            ma50
          ) /
          ma50
        ) * 100
      : 0;

  let condition =
    "BEARISH";

  if (
    ma9 >
    ma50
  ) {
    condition =
      "BULLISH";
  } else if (
    Math.abs(
      gapPct
    ) <=
    GRT_MA_NEAR_CROSS_PCT
  ) {
    condition =
      "NEAR CROSS";
  }

  return {
    ready:
      true,

    ma9,
    ma50,
    gapPct,
    condition,

    bullish:
      ma9 >
      ma50,

    nearCross:
      Math.abs(
        gapPct
      ) <=
      GRT_MA_NEAR_CROSS_PCT,
  };
}

/* ============================================================
   GRT 1H CANDLE CONTEXT

   IMPORTANT:
   1H TAK LAGI AUTO-BLOCK
   EARLY MOMENTUM SECARA SENDIRIAN.

   Ia hanya bagi:
   BULLISH
   NEUTRAL
   BEARISH CONTEXT
============================================================ */

async function getGRT1hCandleTrend() {
  const candles =
    await getLunoCandles(
      "GRT",
      3600,
      8
    );

  const completed =
    getCompletedCandles(
      candles,
      3600
    );

  if (
    !completed.length
  ) {
    return {
      ready:
        false,
    };
  }

  const latest =
    completed[
      completed.length -
        1
    ];

  const analysis =
    analyzeCandle(
      latest
    );

  if (
    !analysis.ready
  ) {
    return {
      ready:
        false,
    };
  }

  return {
    ...analysis,

    timestamp:
      latest.timestamp,

    context:
      analysis.strongBearish
        ? "BEARISH"
        : analysis.strongBullish
          ? "BULLISH"
          : "NEUTRAL",
  };
}

/* ============================================================
   GRT MULTI-TIMEFRAME TREND CONTEXT

   NEW LOGIC:
   - 5M = FAST SIGNAL
   - RSI = FAST SUPPORT
   - 1H = CONTEXT
   - MA9/MA50 = CONTEXT

   1H bearish tidak terus DON’T BUY.

   HARD BEARISH hanya bila:
   1H strong bearish
   + MA bearish
   + 5M bearish
   + RSI falling
============================================================ */

async function getGRTTrendPermission() {
  const [
    candle5m,
    rsi5m,
    candle1h,
    ma1h,
  ] =
    await Promise.all([
      getGRT5mCandleMomentum(),
      getGRT5mRSI(),
      getGRT1hCandleTrend(),
      getGRT1hMA(),
    ]);

  if (
    !candle5m.ready ||
    !rsi5m.ready ||
    !candle1h.ready ||
    !ma1h.ready
  ) {
    return {
      ready:
        false,

      status:
        "VALIDATING",

      scoreModifier:
        0,

      hardBearish:
        false,

      candle5m,
      rsi5m,
      candle1h,
      ma1h,
    };
  }

  const fiveMinutePositive =
    (
      candle5m.bullish ||
      candle5m.strongBullish
    ) &&
    (
      rsi5m.direction ===
        "RISING" ||
      rsi5m.direction ===
        "FLAT"
    );

  const fiveMinuteNegative =
    (
      candle5m.bearish ||
      candle5m.strongBearish
    ) &&
    rsi5m.direction ===
      "FALLING";

  const oneHourBearish =
    candle1h.strongBearish &&
    !ma1h.bullish &&
    !ma1h.nearCross;

  const oneHourSupportive =
    ma1h.bullish ||
    ma1h.nearCross ||
    candle1h.bullish ||
    candle1h.strongBullish;

  const hardBearish =
    oneHourBearish &&
    fiveMinuteNegative &&
    candle5m.strongBearish;

  let scoreModifier =
    0;

  if (
    fiveMinutePositive
  ) {
    scoreModifier +=
      2;
  }

  if (
    candle5m.strongBullish
  ) {
    scoreModifier +=
      1;
  }

  if (
    rsi5m.direction ===
    "RISING"
  ) {
    scoreModifier +=
      1;
  }

  if (
    oneHourSupportive
  ) {
    scoreModifier +=
      1;
  }

  if (
    ma1h.bullish
  ) {
    scoreModifier +=
      1;
  }

  if (
    oneHourBearish
  ) {
    scoreModifier -=
      2;
  }

  if (
    fiveMinuteNegative
  ) {
    scoreModifier -=
      2;
  }

  if (
    hardBearish
  ) {
    scoreModifier -=
      3;
  }

  let status =
    "NEUTRAL";

  if (
    hardBearish
  ) {
    status =
      "HARD_BEARISH";
  } else if (
    fiveMinutePositive &&
    oneHourSupportive
  ) {
    status =
      "UPWARD_ALLOWED";
  } else if (
    fiveMinutePositive
  ) {
    status =
      "FAST_MOMENTUM_POSITIVE";
  } else if (
    oneHourBearish
  ) {
    status =
      "BEARISH_CONTEXT";
  }

  return {
    ready:
      true,

    status,

    scoreModifier,

    hardBearish,

    fiveMinutePositive,

    fiveMinuteNegative,

    oneHourBearish,

    oneHourSupportive,

    candle5m,
    rsi5m,
    candle1h,
    ma1h,
  };
}

/* ============================================================
   5M EXECUTED VOLUME WINDOWS
============================================================ */

function getExecuted5mWindows(
  coin,
  numberOfWindows =
    MOMENTUM_BASELINE_WINDOWS
) {
  const windowMs =
    MOMENTUM_CANDLE_DURATION_SEC *
    1000;

  const currentWindowStart =
    Math.floor(
      Date.now() /
      windowMs
    ) *
    windowMs;

  const windows =
    [];

  for (
    let index =
      numberOfWindows;
    index >=
      1;
    index--
  ) {
    const start =
      currentWindowStart -
      index *
        windowMs;

    const end =
      start +
      windowMs;

    const trades =
      (
        TRADE_HISTORY[
          coin
        ] ||
        []
      ).filter(
        (trade) =>
          trade.timestamp >=
            start &&
          trade.timestamp <
            end
      );

    const buyVolume =
      trades
        .filter(
          (trade) =>
            trade.isBuy
        )
        .reduce(
          (
            total,
            trade
          ) =>
            total +
            trade.volume,
          0
        );

    const sellVolume =
      trades
        .filter(
          (trade) =>
            !trade.isBuy
        )
        .reduce(
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

      buyVolume,
      sellVolume,

      totalVolume:
        buyVolume +
        sellVolume,

      tradeCount:
        trades.length,
    });
  }

  return windows;
}

/* ============================================================
   CURRENT 5M EXECUTED WINDOW
============================================================ */

function getCurrentExecuted5mWindow(
  coin
) {
  const windowMs =
    MOMENTUM_CANDLE_DURATION_SEC *
    1000;

  const start =
    Math.floor(
      Date.now() /
      windowMs
    ) *
    windowMs;

  const trades =
    (
      TRADE_HISTORY[
        coin
      ] ||
      []
    ).filter(
      (trade) =>
        trade.timestamp >=
        start
    );

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
    start,

    ageSec:
      (
        Date.now() -
        start
      ) /
      1000,

    trades,

    buyVolume,
    sellVolume,
    totalVolume,

    buyCount,
    sellCount,
    totalCount,

    buyVolumePct:
      totalVolume >
        0
        ? (
            buyVolume /
            totalVolume
          ) * 100
        : 0,

    sellVolumePct:
      totalVolume >
        0
        ? (
            sellVolume /
            totalVolume
          ) * 100
        : 0,

    buyFrequencyPct:
      totalCount >
        0
        ? (
            buyCount /
            totalCount
          ) * 100
        : 0,

    sellFrequencyPct:
      totalCount >
        0
        ? (
            sellCount /
            totalCount
          ) * 100
        : 0,
  };
}

/* ============================================================
   BUY VOLUME BASELINE

   Current executed BUY volume dibandingkan
   dengan previous completed 5M windows.

   Total volume sahaja TIDAK dianggap bullish.
============================================================ */

async function getBuyVolumeBaseline(
  coin
) {
  const current =
    getCurrentExecuted5mWindow(
      coin
    );

  const usableAgeSec =
    Math.max(
      current.ageSec,
      MOMENTUM_MIN_CURRENT_CANDLE_AGE_SEC
    );

  const projectedBuyVolume =
    current.buyVolume *
    (
      MOMENTUM_CANDLE_DURATION_SEC /
      usableAgeSec
    );

  const candles =
    await getLunoCandles(
      coin,
      MOMENTUM_CANDLE_DURATION_SEC,
      MOMENTUM_BASELINE_WINDOWS +
        5
    );

  const completedCandles =
    getCompletedCandles(
      candles,
      MOMENTUM_CANDLE_DURATION_SEC
    ).slice(
      -MOMENTUM_BASELINE_WINDOWS
    );

  const localWindows =
    getExecuted5mWindows(
      coin,
      MOMENTUM_BASELINE_WINDOWS
    );

  const validLocalBuyVolumes =
    localWindows
      .filter(
        (window) =>
          window.tradeCount >
          0
      )
      .map(
        (window) =>
          window.buyVolume
      )
      .filter(
        (volume) =>
          volume >
          0
      );

  const validLocalTotalVolumes =
    localWindows
      .filter(
        (window) =>
          window.tradeCount >
          0
      )
      .map(
        (window) =>
          window.totalVolume
      )
      .filter(
        (volume) =>
          volume >
          0
      );

  const candleVolumes =
    completedCandles
      .map(
        (candle) =>
          candle.volume
      )
      .filter(
        (volume) =>
          volume >
          0
      );

  const buyBaselineReady =
    validLocalBuyVolumes.length >=
    MOMENTUM_MIN_BASELINE_WINDOWS;

  const totalBaselineSource =
    candleVolumes.length >=
      MOMENTUM_MIN_BASELINE_WINDOWS
      ? candleVolumes
      : validLocalTotalVolumes;

  const totalBaselineReady =
    totalBaselineSource.length >=
    MOMENTUM_MIN_BASELINE_WINDOWS;

  const buyBaselineAverage =
    buyBaselineReady
      ? average(
          validLocalBuyVolumes.slice(
            -MOMENTUM_BASELINE_WINDOWS
          )
        )
      : null;

  const totalBaselineAverage =
    totalBaselineReady
      ? average(
          totalBaselineSource.slice(
            -MOMENTUM_BASELINE_WINDOWS
          )
        )
      : null;

  const buyIncreasePct =
    buyBaselineAverage &&
    buyBaselineAverage >
      0
      ? (
          (
            projectedBuyVolume -
            buyBaselineAverage
          ) /
          buyBaselineAverage
        ) * 100
      : null;

  const totalIncreasePct =
    totalBaselineAverage &&
    totalBaselineAverage >
      0
      ? (
          (
            current.totalVolume -
            totalBaselineAverage
          ) /
          totalBaselineAverage
        ) * 100
      : null;

  return {
    ready:
      buyBaselineReady,

    totalBaselineReady,

    current,

    projectedBuyVolume,

    buyBaselineAverage,
    totalBaselineAverage,

    buyBaselineWindows:
      validLocalBuyVolumes.length,

    totalBaselineWindows:
      totalBaselineSource.length,

    buyIncreasePct,
    totalIncreasePct,
  };
}

/* ============================================================
   NEARBY ORDERBOOK FILTER
============================================================ */

function filterNearbyOrders(
  orders,
  currentPrice,
  rangePct,
  side
) {
  if (
    !Array.isArray(
      orders
    ) ||
    currentPrice <=
      0
  ) {
    return [];
  }

  if (
    side ===
    "BID"
  ) {
    const minimumPrice =
      currentPrice *
      (
        1 -
        rangePct /
          100
      );

    return orders.filter(
      (order) =>
        order.price <
          currentPrice &&
        order.price >=
          minimumPrice
    );
  }

  const maximumPrice =
    currentPrice *
    (
      1 +
      rangePct /
        100
    );

  return orders.filter(
    (order) =>
      order.price >
        currentPrice &&
      order.price <=
        maximumPrice
  );
}

/* ============================================================
   ORDERBOOK CLUSTERING
============================================================ */

function clusterOrderBook(
  orders,
  tolerancePct
) {
  const clusters =
    [];

  for (
    const order of
    orders
  ) {
    let selected =
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
        selected =
          cluster;

        break;
      }
    }

    if (
      !selected
    ) {
      clusters.push({
        price:
          order.price,

        volume:
          order.volume,

        orderCount:
          1,

        weightedPrice:
          order.price *
          order.volume,
      });

      continue;
    }

    selected.volume +=
      order.volume;

    selected.orderCount++;

    selected.weightedPrice +=
      order.price *
      order.volume;

    selected.price =
      selected.weightedPrice /
      selected.volume;
  }

  return clusters;
}

/* ============================================================
   WALL STRENGTH
============================================================ */

function calculateWallStrength(
  clusters,
  currentPrice
) {
  if (
    !clusters.length
  ) {
    return [];
  }

  const volumes =
    clusters.map(
      (cluster) =>
        cluster.volume
    );

  const normalVolume =
    average(
      volumes
    );

  return clusters
    .map(
      (cluster) => {
        const ratio =
          normalVolume >
            0
            ? cluster.volume /
              normalVolume
            : 1;

        const distancePct =
          Math.abs(
            percentChange(
              currentPrice,
              cluster.price
            )
          );

        let rating =
          1;

        if (
          ratio >=
          1.25
        ) {
          rating =
            3;
        }

        if (
          ratio >=
          1.75
        ) {
          rating =
            5;
        }

        if (
          ratio >=
          2.50
        ) {
          rating =
            7;
        }

        if (
          ratio >=
          4
        ) {
          rating =
            9;
        }

        if (
          ratio >=
          6
        ) {
          rating =
            10;
        }

        if (
          distancePct <=
          0.20
        ) {
          rating +=
            1;
        }

        return {
          ...cluster,

          ratio,
          distancePct,

          rating:
            Math.round(
              clamp(
                rating,
                1,
                10
              )
            ),
        };
      }
    )
    .sort(
      (a, b) =>
        b.rating -
          a.rating ||
        a.distancePct -
          b.distancePct
    );
}

/* ============================================================
   SELECT RELEVANT SUPPORT / RESISTANCE
============================================================ */

function selectRelevantWall(
  walls
) {
  if (
    !walls.length
  ) {
    return null;
  }

  const meaningful =
    walls.filter(
      (wall) =>
        wall.ratio >=
          MIN_WALL_RELATIVE_RATIO ||
        wall.rating >=
          4
    );

  if (
    meaningful.length
  ) {
    return [
      ...meaningful,
    ].sort(
      (a, b) =>
        (
          a.distancePct -
          b.distancePct
        ) ||
        (
          b.rating -
          a.rating
        )
    )[0];
  }

  return [
    ...walls,
  ].sort(
    (a, b) =>
      (
        a.distancePct -
        b.distancePct
      ) ||
      (
        b.rating -
        a.rating
      )
  )[0];
}

/* ============================================================
   SELECT MEANINGFUL RESISTANCE FOR TP

   Weak wall boleh di-skip.

   Ini penting sebab resistance 1/10
   TAK BOLEH lagi dianggap sama
   macam resistance 8/10.
============================================================ */

function selectMeaningfulResistance(
  askWalls,
  currentPrice
) {
  if (
    !Array.isArray(
      askWalls
    ) ||
    !askWalls.length
  ) {
    return null;
  }

  const valid =
    askWalls
      .filter(
        (wall) =>
          wall.price >
            currentPrice &&
          (
            wall.rating >=
              MEANINGFUL_RESISTANCE_MIN_RATING ||
            wall.ratio >=
              MEANINGFUL_RESISTANCE_MIN_RATIO
          )
      )
      .sort(
        (a, b) =>
          a.price -
          b.price
      );

  if (
    !valid.length
  ) {
    return null;
  }

  return valid[0];
}

/* ============================================================
   ORDERBOOK STRUCTURE
============================================================ */

async function getOrderBookStructure(
  coin,
  currentPrice
) {
  const book =
    await getTopOrderBook(
      coin
    );

  if (
    !book
  ) {
    return null;
  }

  const rangePct =
    ORDERBOOK_STRUCTURE_RANGE_PCT[
      coin
    ] ||
    3;

  const clusterPct =
    ORDERBOOK_CLUSTER_PCT[
      coin
    ] ||
    0.15;

  const nearbyBids =
    filterNearbyOrders(
      book.bids,
      currentPrice,
      rangePct,
      "BID"
    );

  const nearbyAsks =
    filterNearbyOrders(
      book.asks,
      currentPrice,
      rangePct,
      "ASK"
    );

  const bidClusters =
    clusterOrderBook(
      nearbyBids,
      clusterPct
    );

  const askClusters =
    clusterOrderBook(
      nearbyAsks,
      clusterPct
    );

  const bidWalls =
    calculateWallStrength(
      bidClusters,
      currentPrice
    );

  const askWalls =
    calculateWallStrength(
      askClusters,
      currentPrice
    );

  const support =
    selectRelevantWall(
      bidWalls
    );

  const resistance =
    selectRelevantWall(
      askWalls
    );

  const meaningfulResistance =
    selectMeaningfulResistance(
      askWalls,
      currentPrice
    );

  const totalBidLiquidity =
    nearbyBids.reduce(
      (
        total,
        order
      ) =>
        total +
        order.volume,
      0
    );

  const totalAskLiquidity =
    nearbyAsks.reduce(
      (
        total,
        order
      ) =>
        total +
        order.volume,
      0
    );

  const totalLiquidity =
    totalBidLiquidity +
    totalAskLiquidity;

  const bidLiquidityPct =
    totalLiquidity >
      0
      ? (
          totalBidLiquidity /
          totalLiquidity
        ) * 100
      : 50;

  const askLiquidityPct =
    totalLiquidity >
      0
      ? (
          totalAskLiquidity /
          totalLiquidity
        ) * 100
      : 50;

  return {
    coin,

    support,
    resistance,
    meaningfulResistance,

    bidWalls,
    askWalls,

    totalBidLiquidity,
    totalAskLiquidity,

    bidLiquidityPct,
    askLiquidityPct,

    bestBid:
      book.bids[0]
        ?.price ||
      null,

    bestAsk:
      book.asks[0]
        ?.price ||
      null,
  };
}

/* ============================================================
   GRT LIQUIDITY ANALYSIS

   NEW:
   Weak resistance TIDAK block.

   Hard block hanya bila
   resistance betul-betul kuat
   dan sangat dekat.
============================================================ */

async function getGRTLiquidityAnalysis(
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

      supportive:
        false,

      resistanceBlocking:
        false,

      resistanceClass:
        "UNKNOWN",
    };
  }

  const support =
    structure.support;

  const resistance =
    structure.resistance;

  const nearbySupport =
    Boolean(
      support &&
      support.distancePct <=
        1.00
    );

  const strongSupport =
    Boolean(
      nearbySupport &&
      support.rating >=
        4
    );

  let resistanceBlocking =
    false;

  let resistanceClass =
    "NONE";

  if (
    resistance
  ) {
    if (
      resistance.rating <=
      GRT_WEAK_RESISTANCE_MAX_RATING
    ) {
      resistanceClass =
        "WEAK";
    } else if (
      resistance.rating <=
      GRT_MEDIUM_RESISTANCE_MAX_RATING
    ) {
      resistanceClass =
        "MEDIUM";
    } else {
      resistanceClass =
        "STRONG";
    }

    /*
      1-3/10 TAK BLOCK.

      4-6/10 jadi caution sahaja.

      7-10/10 hanya block
      jika terlalu dekat.
    */

    if (
      resistance.rating >=
        GRT_STRONG_RESISTANCE_MIN_RATING &&
      resistance.distancePct <=
        0.30
    ) {
      resistanceBlocking =
        true;
    }

    if (
      resistance.rating >=
        9 &&
      resistance.distancePct <=
        0.50
    ) {
      resistanceBlocking =
        true;
    }
  }

  const bidSupportive =
    structure.bidLiquidityPct >=
    52;

  const supportive =
    (
      strongSupport ||
      bidSupportive
    ) &&
    !resistanceBlocking;

  return {
    ready:
      true,

    supportive,

    resistanceBlocking,

    resistanceClass,

    support,
    resistance,

    meaningfulResistance:
      structure
        .meaningfulResistance,

    bidLiquidityPct:
      structure.bidLiquidityPct,

    askLiquidityPct:
      structure.askLiquidityPct,

    structure,
  };
}

/* ============================================================
   BTC BUY SURGE STATE

   BTC = MARKET LEAD INDICATOR ONLY.

   BTC TIDAK trigger scalping entry GRT.
============================================================ */

let BTC_SURGE_CANDIDATE_STARTED_AT =
  null;

async function getBTCBuySurge() {
  const baseline =
    await getBuyVolumeBaseline(
      "BTC"
    );

  const priceResponse =
    getExecutedPriceResponse(
      "BTC",
      5 *
        60 *
        1000
    );

  if (
    !baseline.ready
  ) {
    BTC_SURGE_CANDIDATE_STARTED_AT =
      null;

    LAST_BTC_SURGE_STATE =
      "VALIDATING";

    return {
      status:
        "VALIDATING",

      text:
        "🟡 VALIDATING",
    };
  }

  const current =
    baseline.current;

  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const unusualBuy =
    buyIncreasePct >=
    MOMENTUM_SPIKE_THRESHOLD_PCT;

  const buyerDominant =
    current.buyVolumePct >=
    BTC_BUY_SURGE_MIN_BUY_PCT;

  const positivePrice =
    priceResponse.ready &&
    priceResponse.changePct >=
      BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT;

  const candidate =
    unusualBuy &&
    buyerDominant &&
    positivePrice;

  if (
    !candidate
  ) {
    BTC_SURGE_CANDIDATE_STARTED_AT =
      null;

    LAST_BTC_SURGE_STATE =
      "BUY_SURGE_OFF";

    return {
      status:
        "BUY_SURGE_OFF",

      text:
        "🔴 BUY SURGE OFF",

      buyIncreasePct,

      buyVolumePct:
        current.buyVolumePct,

      priceResponsePct:
        priceResponse.changePct,
    };
  }

  if (
    !BTC_SURGE_CANDIDATE_STARTED_AT
  ) {
    BTC_SURGE_CANDIDATE_STARTED_AT =
      Date.now();

    LAST_BTC_SURGE_STATE =
      "VALIDATING";

    return {
      status:
        "VALIDATING",

      text:
        "🟡 VALIDATING",

      buyIncreasePct,

      buyVolumePct:
        current.buyVolumePct,

      priceResponsePct:
        priceResponse.changePct,
    };
  }

  const candidateAgeSec =
    (
      Date.now() -
      BTC_SURGE_CANDIDATE_STARTED_AT
    ) /
    1000;

  if (
    candidateAgeSec <
    BTC_BUY_SURGE_CONFIRM_MIN_AGE_SEC
  ) {
    LAST_BTC_SURGE_STATE =
      "VALIDATING";

    return {
      status:
        "VALIDATING",

      text:
        "🟡 VALIDATING",

      buyIncreasePct,

      buyVolumePct:
        current.buyVolumePct,

      priceResponsePct:
        priceResponse.changePct,

      candidateAgeSec,
    };
  }

  LAST_BTC_SURGE_STATE =
    "BUY_SURGE_ON";

  return {
    status:
      "BUY_SURGE_ON",

    text:
      "🟢 BUY SURGE ON",

    buyIncreasePct,

    buyVolumePct:
      current.buyVolumePct,

    priceResponsePct:
      priceResponse.changePct,

    candidateAgeSec,
  };
}
/* ============================================================
   GRT MOMENTUM ENGINE — PART 3

   PURPOSE:
   Detect movement BEFORE the market becomes obvious.

   FLOW:

   ACCUMULATION
        ↓
   EARLY MOMENTUM
        ↓
   ACCELERATION
        ↓
   BUY NOW

   IMPORTANT:
   - 5M executed trades = primary trigger
   - Price response = confirmation
   - 5M candle + RSI = fast technical confirmation
   - 1H = context / score modifier
   - Orderbook = liquidity confirmation
   - Weak resistance does NOT veto
   - BTC = market context only
============================================================ */

/* ============================================================
   GRT MOMENTUM RUNTIME STATE
============================================================ */

const GRT_MOMENTUM_RUNTIME = {
  phase:
    "IDLE",

  phaseStartedAt:
    null,

  candidateStartedAt:
    null,

  validationStartedAt:
    null,

  lastBuyNowAt:
    null,

  lastPrice:
    null,

  lastPriceAt:
    null,

  recentPrices:
    [],

  peakScore:
    0,

  peakBuyIncreasePct:
    null,

  peakBuyVolumePct:
    null,

  peakPriceResponsePct:
    null,
};

/* ============================================================
   RESET GRT MOMENTUM CANDIDATE
============================================================ */

function resetGRTMomentumCandidate(
  keepPriceHistory =
    true
) {
  GRT_MOMENTUM_RUNTIME.phase =
    "IDLE";

  GRT_MOMENTUM_RUNTIME.phaseStartedAt =
    null;

  GRT_MOMENTUM_RUNTIME.candidateStartedAt =
    null;

  GRT_MOMENTUM_RUNTIME.validationStartedAt =
    null;

  GRT_MOMENTUM_RUNTIME.peakScore =
    0;

  GRT_MOMENTUM_RUNTIME.peakBuyIncreasePct =
    null;

  GRT_MOMENTUM_RUNTIME.peakBuyVolumePct =
    null;

  GRT_MOMENTUM_RUNTIME.peakPriceResponsePct =
    null;

  if (
    !keepPriceHistory
  ) {
    GRT_MOMENTUM_RUNTIME.recentPrices =
      [];

    GRT_MOMENTUM_RUNTIME.lastPrice =
      null;

    GRT_MOMENTUM_RUNTIME.lastPriceAt =
      null;
  }
}

/* ============================================================
   SET GRT MOMENTUM PHASE
============================================================ */

function setGRTMomentumPhase(
  phase
) {
  if (
    GRT_MOMENTUM_RUNTIME.phase ===
    phase
  ) {
    return;
  }

  GRT_MOMENTUM_RUNTIME.phase =
    phase;

  GRT_MOMENTUM_RUNTIME.phaseStartedAt =
    Date.now();
}

/* ============================================================
   GRT PRICE HISTORY

   Keep short rolling history for sustained-move detection.
============================================================ */

function updateGRTMomentumPriceHistory(
  price
) {
  if (
    !Number.isFinite(
      price
    ) ||
    price <=
      0
  ) {
    return;
  }

  const now =
    Date.now();

  const last =
    GRT_MOMENTUM_RUNTIME
      .recentPrices[
        GRT_MOMENTUM_RUNTIME
          .recentPrices.length -
          1
      ];

  /*
    Avoid storing identical samples
    too frequently.
  */

  if (
    last &&
    now -
      last.timestamp <
      5000 &&
    last.price ===
      price
  ) {
    return;
  }

  GRT_MOMENTUM_RUNTIME
    .recentPrices
    .push({
      timestamp:
        now,

      price,
    });

  /*
    Keep 30 minutes maximum.
  */

  const cutoff =
    now -
    30 *
      60 *
      1000;

  GRT_MOMENTUM_RUNTIME.recentPrices =
    GRT_MOMENTUM_RUNTIME
      .recentPrices
      .filter(
        (item) =>
          item.timestamp >=
          cutoff
      );

  GRT_MOMENTUM_RUNTIME.lastPrice =
    price;

  GRT_MOMENTUM_RUNTIME.lastPriceAt =
    now;
}

/* ============================================================
   PRICE AT / BEFORE LOOKBACK
============================================================ */

function getGRTReferencePrice(
  lookbackMs
) {
  const history =
    GRT_MOMENTUM_RUNTIME
      .recentPrices;

  if (
    !history.length
  ) {
    return null;
  }

  const target =
    Date.now() -
    lookbackMs;

  let selected =
    history[0];

  for (
    const item of
    history
  ) {
    if (
      item.timestamp <=
      target
    ) {
      selected =
        item;
    } else {
      break;
    }
  }

  return selected;
}

/* ============================================================
   SUSTAINED MOVE DETECTOR

   Purpose:
   Catch a move such as:

   0.0691
      ↓
   0.0695
      ↓
   0.0699
      ↓
   0.0703

   WITHOUT waiting for the full 1H trend
   to turn bullish first.
============================================================ */

function getGRTSustainedMove(
  currentPrice
) {
  updateGRTMomentumPriceHistory(
    currentPrice
  );

  const history =
    GRT_MOMENTUM_RUNTIME
      .recentPrices;

  if (
    history.length <
    2
  ) {
    return {
      ready:
        false,

      sustained:
        false,

      accelerating:
        false,

      fastReevaluate:
        false,

      score:
        0,

      change5m:
        0,

      change10m:
        0,

      change15m:
        0,

      change30m:
        0,
    };
  }

  const ref5m =
    getGRTReferencePrice(
      5 *
        60 *
        1000
    );

  const ref10m =
    getGRTReferencePrice(
      10 *
        60 *
        1000
    );

  const ref15m =
    getGRTReferencePrice(
      15 *
        60 *
        1000
    );

  const ref30m =
    getGRTReferencePrice(
      30 *
        60 *
        1000
    );

  const change5m =
    ref5m
      ? percentChange(
          ref5m.price,
          currentPrice
        )
      : 0;

  const change10m =
    ref10m
      ? percentChange(
          ref10m.price,
          currentPrice
        )
      : 0;

  const change15m =
    ref15m
      ? percentChange(
          ref15m.price,
          currentPrice
        )
      : 0;

  const change30m =
    ref30m
      ? percentChange(
          ref30m.price,
          currentPrice
        )
      : 0;

  /*
    Count directional price movement
    during recent 10 minutes.
  */

  const recent =
    history.filter(
      (item) =>
        item.timestamp >=
        Date.now() -
          10 *
            60 *
            1000
    );

  let higherMoves =
    0;

  let lowerMoves =
    0;

  for (
    let i =
      1;
    i <
      recent.length;
    i++
  ) {
    const previous =
      recent[
        i - 1
      ].price;

    const current =
      recent[i].price;

    if (
      current >
      previous
    ) {
      higherMoves++;
    } else if (
      current <
      previous
    ) {
      lowerMoves++;
    }
  }

  const directionalMoves =
    higherMoves +
    lowerMoves;

  const higherMovePct =
    directionalMoves >
      0
      ? (
          higherMoves /
          directionalMoves
        ) * 100
      : 50;

  /*
    Acceleration can come from:
    - strong latest 5M
    - strong 15M
    - strong 30M progression
  */

  const earlier5mChange =
    change10m -
    change5m;

  const accelerating =
    (
      (
        change5m >=
          GRT_ACCELERATION_5M_MOVE_PCT &&
        change5m >
          earlier5mChange
      ) ||
      change15m >=
        GRT_ACCELERATION_15M_MOVE_PCT ||
      change30m >=
        GRT_ACCELERATION_30M_MOVE_PCT
    ) &&
    higherMovePct >=
      55;

  /*
    Sustained move.

    Uses configured 15M / 30M thresholds.
  */

  const sustained =
    (
      change5m >=
        0.25 ||
      change10m >=
        0.45 ||
      change15m >=
        GRT_SUSTAINED_15M_MOVE_PCT ||
      change30m >=
        GRT_SUSTAINED_30M_MOVE_PCT
    ) &&
    higherMovePct >=
      55;

  /*
    FAILSAFE:

    If GRT has already moved >= 1%
    over 30M, force higher-level engine
    to reconsider the setup.

    It still needs BUY evidence later;
    this flag alone is NOT BUY NOW.
  */

  const fastReevaluate =
    change30m >=
      GRT_FAST_REEVALUATE_30M_MOVE_PCT &&
    higherMovePct >=
      55;

  let score =
    0;

  if (
    change5m >=
    0.15
  ) {
    score +=
      1;
  }

  if (
    change5m >=
    0.30
  ) {
    score +=
      1;
  }

  if (
    change10m >=
    0.40
  ) {
    score +=
      1;
  }

  if (
    change15m >=
    GRT_SUSTAINED_15M_MOVE_PCT
  ) {
    score +=
      1;
  }

  if (
    change30m >=
    GRT_SUSTAINED_30M_MOVE_PCT
  ) {
    score +=
      1;
  }

  if (
    higherMovePct >=
    60
  ) {
    score +=
      1;
  }

  if (
    accelerating
  ) {
    score +=
      2;
  }

  if (
    fastReevaluate
  ) {
    score +=
      2;
  }

  return {
    ready:
      true,

    sustained,

    accelerating,

    fastReevaluate,

    score,

    change5m,
    change10m,
    change15m,
    change30m,

    higherMoves,
    lowerMoves,
    higherMovePct,

    sampleCount:
      recent.length,
  };
}

/* ============================================================
   GRT ACCUMULATION DETECTOR

   Accumulation = buyers appearing
   BEFORE a clear breakout.

   This is NOT BUY NOW yet.
============================================================ */

function detectGRTAccumulation(
  baseline,
  liquidity,
  sustainedMove
) {
  if (
    !baseline?.ready
  ) {
    return {
      detected:
        false,

      score:
        0,
    };
  }

  const current =
    baseline.current;

  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const buyVolumePct =
    safeNumber(
      current.buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      current.buyFrequencyPct,
      0
    );

  let score =
    0;

  /*
    Executed BUY volume beginning
    to expand.
  */

  if (
    buyIncreasePct >=
    10
  ) {
    score +=
      1;
  }

  if (
    buyIncreasePct >=
    25
  ) {
    score +=
      1;
  }

  /*
    Buyers controlling executed volume.
  */

  if (
    buyVolumePct >=
    52
  ) {
    score +=
      1;
  }

  if (
    buyVolumePct >=
    58
  ) {
    score +=
      1;
  }

  /*
    Frequency prevents one giant
    isolated order from fooling us.
  */

  if (
    buyFrequencyPct >=
    52
  ) {
    score +=
      1;
  }

  /*
    Bid-side liquidity support.
  */

  if (
    liquidity?.ready &&
    liquidity.bidLiquidityPct >=
      52
  ) {
    score +=
      1;
  }

  /*
    Price already creeping upward.
  */

  if (
    sustainedMove?.ready &&
    sustainedMove.change5m >
      0
  ) {
    score +=
      1;
  }

  const detected =
    score >=
      4 &&
    buyVolumePct >=
      52;

  return {
    detected,

    score,

    buyIncreasePct,

    buyVolumePct,

    buyFrequencyPct,
  };
}

/* ============================================================
   GRT EARLY MOMENTUM DETECTOR

   More important than waiting
   for textbook confirmation.

   We want:
   BUY pressure
   + price response
   + fast technical improvement
============================================================ */

function detectGRTEarlyMomentum({
  baseline,
  priceResponse,
  trend,
  liquidity,
  sustainedMove,
}) {
  if (
    !baseline?.ready
  ) {
    return {
      detected:
        false,

      score:
        0,
    };
  }

  const current =
    baseline.current;

  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const buyVolumePct =
    safeNumber(
      current.buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      current.buyFrequencyPct,
      0
    );

  const priceResponsePct =
    priceResponse?.ready
      ? safeNumber(
          priceResponse.changePct,
          0
        )
      : 0;

  let score =
    0;

  /* BUY expansion */

  if (
    buyIncreasePct >=
    20
  ) {
    score +=
      1;
  }

  if (
    buyIncreasePct >=
    40
  ) {
    score +=
      1;
  }

  if (
    buyIncreasePct >=
    MOMENTUM_SPIKE_THRESHOLD_PCT
  ) {
    score +=
      1;
  }

  /* Buyer dominance */

  if (
    buyVolumePct >=
    54
  ) {
    score +=
      1;
  }

  if (
    buyVolumePct >=
    60
  ) {
    score +=
      1;
  }

  if (
    buyFrequencyPct >=
    52
  ) {
    score +=
      1;
  }

  /* Price actually responding */

  if (
    priceResponsePct >
    0
  ) {
    score +=
      1;
  }

  if (
    priceResponsePct >=
    0.15
  ) {
    score +=
      1;
  }

  /* Sustained move */

  if (
    sustainedMove?.sustained
  ) {
    score +=
      2;
  }

  if (
    sustainedMove?.accelerating
  ) {
    score +=
      1;
  }

  /* Fast technical layer */

  if (
    trend?.ready
  ) {
    if (
      trend.candle5m
        ?.bullish
    ) {
      score +=
        1;
    }

    if (
      trend.candle5m
        ?.strongBullish
    ) {
      score +=
        1;
    }

    if (
      trend.rsi5m
        ?.direction ===
      "RISING"
    ) {
      score +=
        1;
    }
  }

  /* Liquidity */

  if (
    liquidity?.supportive
  ) {
    score +=
      1;
  }

  /*
    Weak resistance is NOT bearish.

    A weak nearby wall can actually
    become breakout fuel.
  */

  if (
    liquidity?.resistanceClass ===
    "WEAK"
  ) {
    score +=
      1;
  }

  const detected =
    score >=
      7 &&
    buyVolumePct >=
      54 &&
    priceResponsePct >
      0;

  return {
    detected,

    score,

    buyIncreasePct,

    buyVolumePct,

    buyFrequencyPct,

    priceResponsePct,
  };
}

/* ============================================================
   GRT ACCELERATION DETECTOR

   Stronger stage than early momentum.

   This is where we want the engine
   to become aggressive enough
   to stop waiting unnecessarily.
============================================================ */

function detectGRTAcceleration({
  baseline,
  priceResponse,
  trend,
  liquidity,
  sustainedMove,
}) {
  if (
    !baseline?.ready
  ) {
    return {
      detected:
        false,

      score:
        0,
    };
  }

  const current =
    baseline.current;

  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const buyVolumePct =
    safeNumber(
      current.buyVolumePct,
      0
    );

  const priceResponsePct =
    priceResponse?.ready
      ? safeNumber(
          priceResponse.changePct,
          0
        )
      : 0;

  let score =
    0;

  if (
    buyIncreasePct >=
    40
  ) {
    score +=
      1;
  }

  if (
    buyIncreasePct >=
    70
  ) {
    score +=
      2;
  }

  if (
    buyIncreasePct >=
    100
  ) {
    score +=
      1;
  }

  if (
    buyVolumePct >=
    58
  ) {
    score +=
      1;
  }

  if (
    buyVolumePct >=
    65
  ) {
    score +=
      1;
  }

  if (
    priceResponsePct >=
    0.15
  ) {
    score +=
      1;
  }

  if (
    priceResponsePct >=
    0.30
  ) {
    score +=
      1;
  }

  if (
    sustainedMove?.sustained
  ) {
    score +=
      1;
  }

  if (
    sustainedMove?.accelerating
  ) {
    score +=
      2;
  }

  if (
    trend?.candle5m
      ?.strongBullish
  ) {
    score +=
      1;
  }

  if (
    trend?.rsi5m
      ?.direction ===
    "RISING"
  ) {
    score +=
      1;
  }

  if (
    liquidity?.supportive
  ) {
    score +=
      1;
  }

  const detected =
    score >=
      8 &&
    buyVolumePct >=
      58 &&
    priceResponsePct >
      0;

  return {
    detected,

    score,

    buyIncreasePct,

    buyVolumePct,

    priceResponsePct,
  };
}

/* ============================================================
   GRT MOMENTUM SCORE

   This combines all layers.

   The score is deliberately weighted
   toward CURRENT market behavior.

   Historical 1H trend cannot dominate
   a fresh 5M acceleration.
============================================================ */

function calculateGRTMomentumScore({
  accumulation,
  earlyMomentum,
  acceleration,
  sustainedMove,
  trend,
  liquidity,
  priceResponse,
}) {
  let score =
    0;

  if (
    accumulation.detected
  ) {
    score +=
      2;
  }

  if (
    earlyMomentum.detected
  ) {
    score +=
      3;
  }

  if (
    acceleration.detected
  ) {
    score +=
      4;
  }

  if (
    sustainedMove?.sustained
  ) {
    score +=
      2;
  }

  if (
    sustainedMove?.accelerating
  ) {
    score +=
      2;
  }

  if (
    trend?.ready
  ) {
    score +=
      safeNumber(
        trend.scoreModifier,
        0
      );
  }

  if (
    liquidity?.supportive
  ) {
    score +=
      1;
  }

  if (
    liquidity?.resistanceClass ===
    "WEAK"
  ) {
    score +=
      1;
  }

  if (
    liquidity
      ?.resistanceBlocking
  ) {
    score -=
      4;
  }

  if (
    priceResponse?.ready &&
    priceResponse.changePct <
      -0.20
  ) {
    score -=
      3;
  }

  if (
    trend?.hardBearish
  ) {
    score -=
      5;
  }

  return score;
}

/* ============================================================
   UPDATE PEAK MOMENTUM DATA
============================================================ */

function updateGRTMomentumPeaks({
  score,
  baseline,
  priceResponse,
}) {
  GRT_MOMENTUM_RUNTIME.peakScore =
    Math.max(
      GRT_MOMENTUM_RUNTIME
        .peakScore,
      score
    );

  const buyIncreasePct =
    baseline?.buyIncreasePct;

  if (
    Number.isFinite(
      buyIncreasePct
    )
  ) {
    if (
      GRT_MOMENTUM_RUNTIME
        .peakBuyIncreasePct ===
        null ||
      buyIncreasePct >
        GRT_MOMENTUM_RUNTIME
          .peakBuyIncreasePct
    ) {
      GRT_MOMENTUM_RUNTIME
        .peakBuyIncreasePct =
        buyIncreasePct;
    }
  }

  const buyVolumePct =
    baseline?.current
      ?.buyVolumePct;

  if (
    Number.isFinite(
      buyVolumePct
    )
  ) {
    if (
      GRT_MOMENTUM_RUNTIME
        .peakBuyVolumePct ===
        null ||
      buyVolumePct >
        GRT_MOMENTUM_RUNTIME
          .peakBuyVolumePct
    ) {
      GRT_MOMENTUM_RUNTIME
        .peakBuyVolumePct =
        buyVolumePct;
    }
  }

  const pricePct =
    priceResponse?.changePct;

  if (
    Number.isFinite(
      pricePct
    )
  ) {
    if (
      GRT_MOMENTUM_RUNTIME
        .peakPriceResponsePct ===
        null ||
      pricePct >
        GRT_MOMENTUM_RUNTIME
          .peakPriceResponsePct
    ) {
      GRT_MOMENTUM_RUNTIME
        .peakPriceResponsePct =
        pricePct;
    }
  }
}

/* ============================================================
   VALIDATION TIMER

   IMPORTANT CHANGE:

   Candidate must NOT sit in
   VALIDATING forever.

   Maximum validation:
   GRT_VALIDATION_TIMEOUT_MS

   Default fallback:
   15 minutes.
============================================================ */

function getGRTValidationState() {
  const timeoutMs =
    GRT_VALIDATION_MAX_MS;

  if (
    !GRT_MOMENTUM_RUNTIME
      .validationStartedAt
  ) {
    return {
      active:
        false,

      expired:
        false,

      ageMs:
        0,

      ageMinutes:
        0,

      timeoutMs,
    };
  }

  const ageMs =
    Date.now() -
    GRT_MOMENTUM_RUNTIME
      .validationStartedAt;

  return {
    active:
      true,

    expired:
      ageMs >=
      timeoutMs,

    ageMs,

    ageMinutes:
      ageMs /
      60000,

    timeoutMs,
  };
}

/* ============================================================
   START VALIDATION WHEN NEEDED
============================================================ */

function ensureGRTValidationStarted() {
  if (
    !GRT_MOMENTUM_RUNTIME
      .validationStartedAt
  ) {
    GRT_MOMENTUM_RUNTIME
      .validationStartedAt =
      Date.now();
  }

  if (
    !GRT_MOMENTUM_RUNTIME
      .candidateStartedAt
  ) {
    GRT_MOMENTUM_RUNTIME
      .candidateStartedAt =
      Date.now();
  }
}

/* ============================================================
   GRT FINAL MOMENTUM DECISION

   FINAL STATES:

   COLLECTING
   VERIFYING
   BUY_NOW
   NO_ENTRY

   Internal phase additionally tracks:
   ACCUMULATION
   EARLY_MOMENTUM
   ACCELERATION
============================================================ */

async function getGRTMomentumDecision(
  ticker
) {
  if (
    !ticker ||
    !Number.isFinite(
      ticker.currentPrice
    ) ||
    ticker.currentPrice <=
      0
  ) {
    return {
      status:
        "COLLECTING",

      phase:
        "IDLE",

      text:
        "🟡 COLLECTING MARKET DATA",
    };
  }

  const currentPrice =
    ticker.currentPrice;

  /*
    Update price history FIRST.
  */

  const sustainedMove =
    getGRTSustainedMove(
      currentPrice
    );

  const [
    baseline,
    trend,
    liquidity,
    btcSurge,
  ] =
    await Promise.all([
      getBuyVolumeBaseline(
        "GRT"
      ),

      getGRTTrendPermission(),

      getGRTLiquidityAnalysis(
        currentPrice
      ),

      getBTCBuySurge(),
    ]);

  const priceResponse =
    getExecutedPriceResponse(
      "GRT",
      5 *
        60 *
        1000
    );

  /*
    Still genuinely collecting data.
  */

  if (
    !baseline.ready ||
    !trend.ready
  ) {
    setGRTMomentumPhase(
      "COLLECTING"
    );

    return {
      status:
        "COLLECTING",

      phase:
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      currentPrice,

      sustainedMove,

      baseline,

      trend,

      liquidity,

      btcSurge,

      priceResponse,
    };
  }

  /* ========================================================
     DETECT EACH MOMENTUM STAGE
  ======================================================== */

  const accumulation =
    detectGRTAccumulation(
      baseline,
      liquidity,
      sustainedMove
    );

  const earlyMomentum =
    detectGRTEarlyMomentum({
      baseline,
      priceResponse,
      trend,
      liquidity,
      sustainedMove,
    });

  const acceleration =
    detectGRTAcceleration({
      baseline,
      priceResponse,
      trend,
      liquidity,
      sustainedMove,
    });

  const score =
    calculateGRTMomentumScore({
      accumulation,
      earlyMomentum,
      acceleration,
      sustainedMove,
      trend,
      liquidity,
      priceResponse,
    });

  updateGRTMomentumPeaks({
    score,
    baseline,
    priceResponse,
  });

  /* ========================================================
     HARD VETO

     These are genuine danger conditions.

     Unlike old logic,
     normal bearish 1H alone
     is NOT enough.
  ======================================================== */

  const hardBearish =
    Boolean(
      trend.hardBearish
    );

  const hardResistance =
    Boolean(
      liquidity?.ready &&
      liquidity.resistanceBlocking
    );

  const negativePriceFailure =
    Boolean(
      priceResponse.ready &&
      priceResponse.changePct <=
        -0.35
    );

  const buyerCollapse =
    Boolean(
      baseline.current
        .buyVolumePct <
        42 &&
      baseline.current
        .sellVolumePct >
        58
    );

  const hardVeto =
    hardBearish ||
    negativePriceFailure ||
    buyerCollapse;

  /* ========================================================
     PHASE SELECTION
  ======================================================== */

  if (
    acceleration.detected
  ) {
    setGRTMomentumPhase(
      "ACCELERATION"
    );

    ensureGRTValidationStarted();
  } else if (
    earlyMomentum.detected
  ) {
    setGRTMomentumPhase(
      "EARLY_MOMENTUM"
    );

    ensureGRTValidationStarted();
  } else if (
    accumulation.detected
  ) {
    setGRTMomentumPhase(
      "ACCUMULATION"
    );

    ensureGRTValidationStarted();
  } else if (
    sustainedMove.sustained
  ) {
    setGRTMomentumPhase(
      "WATCHING_MOVE"
    );

    ensureGRTValidationStarted();
  } else {
    setGRTMomentumPhase(
      "IDLE"
    );
  }

  const validation =
    getGRTValidationState();

  /* ========================================================
     BUY NOW — PATH A

     ACCELERATION ENTRY

     Strong current momentum can trigger
     without waiting for 1H to become bullish.
  ======================================================== */

  const accelerationBuy =
    acceleration.detected &&
    score >=
      8 &&
    !hardVeto &&
    !hardResistance &&
    priceResponse.ready &&
    priceResponse.changePct >
      0;

  /* ========================================================
     BUY NOW — PATH B

     EARLY MOMENTUM + SUSTAINED MOVE

     This is specifically designed
     for gradual runs that the old
     engine could miss.
  ======================================================== */

  const sustainedMomentumBuy =
    earlyMomentum.detected &&
    sustainedMove.sustained &&
    score >=
      7 &&
    !hardVeto &&
    !hardResistance &&
    priceResponse.ready &&
    priceResponse.changePct >
      0;

  /* ========================================================
     BUY NOW — PATH C

     VERY STRONG EXECUTED BUY PRESSURE

     Allows entry before perfect
     technical alignment.
  ======================================================== */

  const rawBuyIncrease =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const rawBuyPct =
    safeNumber(
      baseline.current
        .buyVolumePct,
      0
    );

  const strongFlowBuy =
    rawBuyIncrease >=
      80 &&
    rawBuyPct >=
      62 &&
    priceResponse.ready &&
    priceResponse.changePct >=
      0.15 &&
    score >=
      7 &&
    !hardVeto &&
    !hardResistance;

  const buyNow =
    accelerationBuy ||
    sustainedMomentumBuy ||
    strongFlowBuy;

  /* ========================================================
     BUY NOW RESULT
  ======================================================== */

  if (
    buyNow
  ) {
    setGRTMomentumPhase(
      "BUY_NOW"
    );

    GRT_MOMENTUM_RUNTIME
      .lastBuyNowAt =
      Date.now();

    return {
      status:
        "BUY_NOW",

      phase:
        "BUY_NOW",

      text:
        "🟢 BUY NOW",

      currentPrice,

      score,

      reason:
        accelerationBuy
          ? "ACCELERATION"
          : sustainedMomentumBuy
            ? "SUSTAINED EARLY MOMENTUM"
            : "STRONG BUY FLOW",

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      validation,

      peakScore:
        GRT_MOMENTUM_RUNTIME
          .peakScore,
    };
  }

  /* ========================================================
     HARD FAILURE
  ======================================================== */

  if (
    hardVeto
  ) {
    const previousPhase =
      GRT_MOMENTUM_RUNTIME
        .phase;

    resetGRTMomentumCandidate(
      true
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "REJECTED",

      text:
        "🔴 DON'T BUY",

      currentPrice,

      score,

      reason:
        hardBearish
          ? "MULTI-TIMEFRAME BEARISH"
          : negativePriceFailure
            ? "PRICE RESPONSE FAILED"
            : "BUYER PRESSURE COLLAPSED",

      previousPhase,

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,
    };
  }

  /* ========================================================
     VALIDATION TIMEOUT

     No more endless VALIDATING.

     After timeout:
     - if momentum still reasonably alive,
       return VERIFYING with timeout flag
       only for one final cycle.
     - otherwise cancel candidate.
  ======================================================== */

  if (
    validation.expired
  ) {
    const momentumStillAlive =
      (
        accumulation.detected ||
        earlyMomentum.detected ||
        sustainedMove.sustained
      ) &&
      score >=
        4 &&
      (
        !priceResponse.ready ||
        priceResponse.changePct >
          -0.10
      );

    if (
      momentumStillAlive &&
      GRT_MOMENTUM_RUNTIME
        .phase !==
        "FINAL_CHECK"
    ) {
      setGRTMomentumPhase(
        "FINAL_CHECK"
      );

      return {
        status:
          "VERIFYING",

        phase:
          "FINAL_CHECK",

        text:
          "🟠 FINAL MOMENTUM CHECK",

        currentPrice,

        score,

        validationExpired:
          true,

        accumulation,

        earlyMomentum,

        acceleration,

        sustainedMove,

        baseline,

        priceResponse,

        trend,

        liquidity,

        btcSurge,

        validation,
      };
    }

    const expiredPeakScore =
      GRT_MOMENTUM_RUNTIME
        .peakScore;

    resetGRTMomentumCandidate(
      true
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "TIMEOUT",

      text:
        "🔴 ENTRY CANCELLED",

      currentPrice,

      score,

      reason:
        "NO ENTRY CONFIRMED WITHIN VALIDATION WINDOW",

      peakScore:
        expiredPeakScore,

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      validation,
    };
  }

  /* ========================================================
     VERIFYING

     Candidate exists.
     We have a real reason to keep watching.
  ======================================================== */

  if (
    accumulation.detected ||
    earlyMomentum.detected ||
    acceleration.detected ||
    sustainedMove.sustained
  ) {
    return {
      status:
        "VERIFYING",

      phase:
        GRT_MOMENTUM_RUNTIME
          .phase,

      text:
        GRT_MOMENTUM_RUNTIME
          .phase ===
          "ACCELERATION"
          ? "🟠 VERIFYING ACCELERATION"
          : GRT_MOMENTUM_RUNTIME
                .phase ===
              "EARLY_MOMENTUM"
            ? "🟠 EARLY MOMENTUM"
            : GRT_MOMENTUM_RUNTIME
                  .phase ===
                "ACCUMULATION"
              ? "🟡 ACCUMULATION"
              : "🟡 WATCHING UPWARD MOVE",

      currentPrice,

      score,

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      validation,

      peakScore:
        GRT_MOMENTUM_RUNTIME
          .peakScore,
    };
  }

  /* ========================================================
     NOTHING ACTIONABLE
  ======================================================== */

  /*
    If there is no candidate anymore,
    clear an old validation timer.

    This prevents stale validation
    from contaminating a future setup.
  */

  if (
    GRT_MOMENTUM_RUNTIME
      .validationStartedAt
  ) {
    resetGRTMomentumCandidate(
      true
    );
  }

  return {
    status:
      "NO_ENTRY",

    phase:
      "IDLE",

    text:
      "🔴 DON'T BUY",

    currentPrice,

    score,

    reason:
      "NO QUALIFIED MOMENTUM",

    accumulation,

    earlyMomentum,

    acceleration,

    sustainedMove,

    baseline,

    priceResponse,

    trend,

    liquidity,

    btcSurge,
  };
}
/* ============================================================
   GRT FINAL DECISION DISPLAY

   ONE SOURCE OF TRUTH.

   Semua alert selepas ini mesti gunakan
   final decision yang sama supaya:

   Price Alert
   Market Structure
   Scalping Scanner

   tidak bercanggah sesama sendiri.
============================================================ */

function normalizeGRTDecision(
  decision
) {
  if (
    !decision
  ) {
    return {
      status:
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      criteria:
        "COLLECTING DATA",

      actionable:
        false,
    };
  }

  if (
    decision.status ===
    "BUY_NOW"
  ) {
    return {
      status:
        "BUY_NOW",

      text:
        "🟢 BUY NOW",

      criteria:
        decision.reason ||
        "MOMENTUM ENTRY",

      actionable:
        true,
    };
  }

  if (
    decision.status ===
    "VERIFYING"
  ) {
    return {
      status:
        "VERIFYING",

      text:
        decision.text ||
        "🟠 VERIFYING",

      criteria:
        decision.phase ||
        "VERIFYING",

      actionable:
        false,
    };
  }

  if (
    decision.status ===
    "COLLECTING"
  ) {
    return {
      status:
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      criteria:
        "COLLECTING DATA",

      actionable:
        false,
    };
  }

  return {
    status:
      "NO_ENTRY",

    text:
      "🔴 DON'T BUY",

    criteria:
      decision.reason ||
      "NO QUALIFIED MOMENTUM",

    actionable:
      false,
  };
}

/* ============================================================
   GRT BUY NOW COOLDOWN
============================================================ */

function getGRTBuyNowCooldown() {
  if (
    !LAST_GRT_BUY_NOW_SIGNAL
  ) {
    return {
      active:
        false,

      remainingMs:
        0,
    };
  }

  const elapsed =
    Date.now() -
    LAST_GRT_BUY_NOW_SIGNAL;

  const remainingMs =
    GRT_BUY_NOW_COOLDOWN_MS -
    elapsed;

  return {
    active:
      remainingMs >
      0,

    remainingMs:
      Math.max(
        0,
        remainingMs
      ),
  };
}

/* ============================================================
   GRT RESISTANCE CLASS
============================================================ */

function classifyGRTResistance(
  resistance
) {
  if (
    !resistance
  ) {
    return {
      className:
        "NONE",

      rating:
        0,

      blocking:
        false,
    };
  }

  const rating =
    safeNumber(
      resistance.rating,
      0
    );

  if (
    rating <=
    GRT_WEAK_RESISTANCE_MAX_RATING
  ) {
    return {
      className:
        "WEAK",

      rating,

      blocking:
        false,
    };
  }

  if (
    rating <=
    GRT_MEDIUM_RESISTANCE_MAX_RATING
  ) {
    return {
      className:
        "MEDIUM",

      rating,

      blocking:
        false,
    };
  }

  return {
    className:
      "STRONG",

    rating,

    blocking:
      true,
  };
}

/* ============================================================
   GRT RAW PROJECTED MOVE

   Ini bukan fixed profit target.
============================================================ */

function getGRTRawProjectedMovePct(
  momentum
) {
  if (
    !momentum
  ) {
    return GRT_HOLD_BASE_REACH
      .NEUTRAL;
  }

  let projectedPct =
    GRT_HOLD_BASE_REACH
      .NEUTRAL;

  const phase =
    momentum.phase ||
    "";

  if (
    phase ===
    "ACCUMULATION"
  ) {
    projectedPct =
      GRT_HOLD_BASE_REACH
        .BUILDING;
  }

  if (
    phase ===
    "EARLY_MOMENTUM"
  ) {
    projectedPct =
      GRT_HOLD_BASE_REACH
        .STRONG;
  }

  if (
    phase ===
      "ACCELERATION" ||
    momentum.reason ===
      "ACCELERATION"
  ) {
    projectedPct =
      GRT_HOLD_BASE_REACH
        .ACCELERATING;
  }

  const score =
    safeNumber(
      momentum.score,
      0
    );

  if (
    score >=
    7
  ) {
    projectedPct +=
      0.25;
  }

  if (
    score >=
    9
  ) {
    projectedPct +=
      0.35;
  }

  if (
    score >=
    11
  ) {
    projectedPct +=
      0.40;
  }

  const sustained =
    momentum
      .sustainedMove;

  if (
    sustained?.sustained
  ) {
    projectedPct +=
      0.30;
  }

  if (
    sustained?.accelerating
  ) {
    projectedPct +=
      0.50;
  }

  const buyIncreasePct =
    safeNumber(
      momentum.baseline
        ?.buyIncreasePct,
      0
    );

  if (
    buyIncreasePct >=
    70
  ) {
    projectedPct +=
      0.25;
  }

  if (
    buyIncreasePct >=
    120
  ) {
    projectedPct +=
      0.35;
  }

  const buyVolumePct =
    safeNumber(
      momentum.baseline
        ?.current
        ?.buyVolumePct,
      0
    );

  if (
    buyVolumePct >=
    62
  ) {
    projectedPct +=
      0.25;
  }

  if (
    buyVolumePct >=
    70
  ) {
    projectedPct +=
      0.25;
  }

  if (
    momentum.trend
      ?.oneHourBearish
  ) {
    projectedPct -=
      0.50;
  }

  if (
    momentum.btcSurge
      ?.status ===
    "BUY_SURGE_ON"
  ) {
    projectedPct +=
      0.20;
  }

  return clamp(
    projectedPct,
    GRT_HOLD_BASE_REACH.WEAK,
    GRT_HOLD_MAX_DYNAMIC_REACH_PCT
  );
}

/* ============================================================
   FIND NEXT MEANINGFUL RESISTANCES
============================================================ */

async function getGRTResistanceMap(
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

      structure:
        null,

      walls:
        [],
    };
  }

  const walls =
    (
      structure.askWalls ||
      []
    )
      .filter(
        (wall) =>
          wall.price >
          currentPrice
      )
      .sort(
        (a, b) =>
          a.price -
          b.price
      );

  return {
    ready:
      true,

    structure,

    walls,
  };
}

/* ============================================================
   PROJECTED REACH ENGINE
============================================================ */

async function calculateGRTProjectedReach({
  currentPrice,
  momentum,
}) {
  if (
    !currentPrice ||
    currentPrice <=
    0
  ) {
    return null;
  }

  const rawMovePct =
    getGRTRawProjectedMovePct(
      momentum
    );

  const rawProjection =
    currentPrice *
    (
      1 +
      rawMovePct /
        100
    );

  const resistanceMap =
    await getGRTResistanceMap(
      currentPrice
    );

  if (
    !resistanceMap.ready
  ) {
    return {
      currentPrice,

      rawMovePct,

      rawProjection,

      tp1:
        rawProjection,

      tp1Confidence:
        momentum?.score >=
          8
          ? "MEDIUM"
          : "LOW",

      tp1Resistance:
        null,

      tp2:
        null,

      tp2Confidence:
        null,

      tp2Resistance:
        null,

      tp2Requirement:
        null,

      reason:
        "MOMENTUM PROJECTION — ORDERBOOK UNAVAILABLE",
    };
  }

  const walls =
    resistanceMap.walls;

  const meaningfulWalls =
    walls.filter(
      (wall) =>
        wall.rating >=
          MEANINGFUL_RESISTANCE_MIN_RATING ||
        wall.ratio >=
          MEANINGFUL_RESISTANCE_MIN_RATIO
    );

  let tp1 =
    rawProjection;

  let tp1Resistance =
    null;

  let tp1Confidence =
    "MEDIUM";

  const firstMeaningfulWall =
    meaningfulWalls[0] ||
    null;

  if (
    firstMeaningfulWall &&
    firstMeaningfulWall.price <=
      rawProjection *
      1.005
  ) {
    tp1Resistance =
      firstMeaningfulWall;

    const beforeWall =
  firstMeaningfulWall.price *
  (
    1 -
    TP_RESISTANCE_BUFFER_PCT /
      100
  );

/*
  Never allow TP1 projected reach
  to fall at or below current price.

  If resistance is too close for the
  normal buffer, use the resistance
  itself as the obstacle reference.

  evaluateGRTMomentumRoom() will later
  decide whether the remaining room
  is practical enough for entry.
*/

if (
  beforeWall >
  currentPrice
) {
  tp1 =
    Math.min(
      rawProjection,
      beforeWall
    );
} else if (
  firstMeaningfulWall.price >
  currentPrice
) {
  tp1 =
    Math.min(
      rawProjection,
      firstMeaningfulWall.price
    );
} else {
  tp1 =
    rawProjection;

  tp1Resistance =
    null;
}
}

  const tp1MovePct =
    percentChange(
      currentPrice,
      tp1
    );

  if (
    momentum?.reason ===
      "ACCELERATION" &&
    tp1MovePct >=
      1
  ) {
    tp1Confidence =
      "HIGH";
  } else if (
    momentum?.score >=
      7
  ) {
    tp1Confidence =
      "MEDIUM";
  } else {
    tp1Confidence =
      "LOW";
  }

  let tp2 =
    null;

  let tp2Resistance =
    null;

  let tp2Confidence =
    null;

  let tp2Requirement =
    null;

  const continuationAllowed =
    Boolean(
      momentum &&
      (
        momentum.reason ===
          "ACCELERATION" ||
        momentum
          .sustainedMove
          ?.accelerating ||
        momentum.score >=
          8
      )
    );

  if (
    continuationAllowed
  ) {
    let nextWallIndex =
      0;

    if (
      tp1Resistance
    ) {
      const index =
        meaningfulWalls.findIndex(
          (wall) =>
            wall ===
              tp1Resistance ||
            (
              wall.price ===
                tp1Resistance.price &&
              wall.rating ===
                tp1Resistance.rating
            )
        );

      nextWallIndex =
        index >=
          0
          ? index +
            1
          : 1;
    }

    const nextWall =
      meaningfulWalls[
        nextWallIndex
      ] ||
      null;

    let extensionPct =
      rawMovePct *
      0.60;

    if (
      momentum.reason ===
      "ACCELERATION"
    ) {
      extensionPct +=
        0.50;
    }

    if (
      momentum
        .sustainedMove
        ?.accelerating
    ) {
      extensionPct +=
        0.35;
    }

    extensionPct =
      clamp(
        extensionPct,
        0.75,
        3.50
      );

    let extendedProjection =
      tp1 *
      (
        1 +
        extensionPct /
          100
      );

    const absoluteMaximum =
      currentPrice *
      (
        1 +
        GRT_HOLD_MAX_DYNAMIC_REACH_PCT /
          100
      );

    extendedProjection =
      Math.min(
        extendedProjection,
        absoluteMaximum
      );

    if (
      nextWall &&
      nextWall.price <=
        extendedProjection *
        1.005
    ) {
      tp2Resistance =
        nextWall;

      tp2 =
        Math.min(
          extendedProjection,
          nextWall.price *
            (
              1 -
              TP_RESISTANCE_BUFFER_PCT /
                100
            )
        );
    } else {
      tp2 =
        extendedProjection;
    }

    tp2Confidence =
      momentum.reason ===
        "ACCELERATION"
        ? "MEDIUM"
        : "LOW";

    if (
      tp1Resistance
    ) {
      tp2Requirement =
        `BREAK RM${formatPrice(
          "GRT",
          tp1Resistance.price
        )} + BUY MOMENTUM KEKAL`;
    } else {
      tp2Requirement =
        "BUY MOMENTUM + SUSTAINED PRICE MUST REMAIN STRONG";
    }

    if (
      percentChange(
        tp1,
        tp2
      ) <
      0.50
    ) {
      tp2 =
        null;

      tp2Resistance =
        null;

      tp2Confidence =
        null;

      tp2Requirement =
        null;
    }
  }

  return {
    currentPrice,

    rawMovePct,

    rawProjection,

    tp1,

    tp1MovePct,

    tp1Confidence,

    tp1Resistance,

    tp2,

    tp2MovePct:
      tp2
        ? percentChange(
            currentPrice,
            tp2
          )
        : null,

    tp2Confidence,

    tp2Resistance,

    tp2Requirement,

    structure:
      resistanceMap.structure,

    reason:
      tp1Resistance
        ? "PROJECTED TO MEANINGFUL RESISTANCE AREA"
        : "MOMENTUM-BASED PROJECTED REACH",
  };
}

/* ============================================================
   ENTRY PRICE FROM ORDERBOOK
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

      chasePct:
        0,
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

      chasePct:
        percentChange(
          technicalEntry,
          bestAsk
        ),
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

      chasePct,
    };
  }

  return {
    entryPrice:
      technicalEntry,

    source:
      "TECHNICAL ENTRY",

    chasePct:
      0,
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

  const availableWithinChase =
    orderBook.asks
      .filter(
        (ask) =>
          ask.price <=
          maxAllowedEntry
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
      "TECHNICAL ENTRY — CHASE LIMITED",

    depthAvailable:
      availableWithinChase,

    requiredQuantity,

    chasePct:
      0,

    fullFillEstimated:
      false,
  };
}

/* ============================================================
   GRT SCALPING ROOM CHECK
============================================================ */

async function evaluateGRTMomentumRoom({
  entryPrice,
  momentum,
}) {
  const projection =
    await calculateGRTProjectedReach({
      currentPrice:
        entryPrice,

      momentum,
    });

  if (
    !projection ||
    !projection.tp1
  ) {
    return {
      allowed:
        false,

      reason:
        "PROJECTED REACH UNAVAILABLE",
    };
  }

  const roomPct =
    percentChange(
      entryPrice,
      projection.tp1
    );

  if (
    roomPct <
    GRT_MIN_PRACTICAL_TP_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      reason:
        "PROJECTED REACH TOO CLOSE",

      projection,

      roomPct,
    };
  }

  const resistance =
    projection
      .tp1Resistance;

  if (
    resistance &&
    resistance.rating >=
      GRT_STRONG_RESISTANCE_MIN_RATING &&
    resistance.distancePct <=
      0.35 &&
    roomPct <
      1.20
  ) {
    return {
      allowed:
        false,

      reason:
        "STRONG RESISTANCE TOO CLOSE",

      projection,

      roomPct,
    };
  }

  return {
    allowed:
      true,

    reason:
      projection.reason,

    projection,

    roomPct,

    tp1:
      projection.tp1,

    tp2:
      projection.tp2,

    nextResistance:
      projection
        .tp1Resistance,

    breakoutAllowed:
      Boolean(
        projection.tp2
      ),
  };
}

/* ============================================================
   GENERIC ROOM TO TP
============================================================ */

async function evaluateRoomToTP(
  coin,
  entryPrice,
  momentum =
    null
) {
  if (
    coin ===
    "GRT" &&
    momentum
  ) {
    return await evaluateGRTMomentumRoom({
      entryPrice,

      momentum,
    });
  }

  const structure =
    await getOrderBookStructure(
      coin,
      entryPrice
    );

  const defaultMovePct =
    DEFAULT_BREAKOUT_TP_PCT[
      coin
    ] ||
    2.00;

  const defaultTP =
    entryPrice *
    (
      1 +
      defaultMovePct /
        100
    );

  if (
    !structure
  ) {
    return {
      allowed:
        true,

      maxTargetPrice:
        defaultTP,

      nextResistance:
        null,

      reason:
        "DEFAULT TARGET",

      breakoutAllowed:
        false,
    };
  }

  const meaningful =
    structure
      .meaningfulResistance;

  if (
    !meaningful
  ) {
    return {
      allowed:
        true,

      maxTargetPrice:
        defaultTP,

      nextResistance:
        null,

      reason:
        "NO MEANINGFUL RESISTANCE",

      breakoutAllowed:
        false,
    };
  }

  const beforeResistance =
    meaningful.price *
    (
      1 -
      TP_RESISTANCE_BUFFER_PCT /
        100
    );

  const maxTargetPrice =
    Math.min(
      defaultTP,
      beforeResistance
    );

  const roomPct =
    percentChange(
      entryPrice,
      maxTargetPrice
    );

  if (
    roomPct <
    MIN_GROSS_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      reason:
        "ROOM TOO SMALL",

      maxTargetPrice,

      nextResistance:
        meaningful,

      breakoutAllowed:
        false,
    };
  }

  return {
    allowed:
      true,

    maxTargetPrice,

    nextResistance:
      meaningful,

    reason:
      "ROOM OK",

    breakoutAllowed:
      false,
  };
}

/* ============================================================
   CONFIDENCE LABEL
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
    String(
      market ||
      ""
    ).includes(
      "BREAKOUT"
    ) &&
    !String(
      market ||
      ""
    ).includes(
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
   BUILD ENTRY RISK LEVELS
============================================================ */

function buildEntryRiskLevels({
  coin,
  entryPrice,
  brokenResistance =
    null,
  room,
  confidence,
}) {
  let tp =
    room?.tp1 ||
    room?.maxTargetPrice ||
    entryPrice *
      (
        1 +
        (
          DEFAULT_BREAKOUT_TP_PCT[
            coin
          ] ||
          2
        ) /
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

    tp2:
      room?.tp2 ||
      null,

    sl,

    durationHours,

    projectedReach:
      room?.projection ||
      null,
  };
}

/* ============================================================
   GRT BUY NOW SIGNAL HANDLER
============================================================ */

async function handleGRTBuyNowSignal(
  ticker,
  momentumDecision
) {
  if (
    !ticker ||
    !momentumDecision
  ) {
    return;
  }

  if (
    momentumDecision.status !==
    "BUY_NOW"
  ) {
    return;
  }

  const cooldown =
    getGRTBuyNowCooldown();

  if (
    !cooldown.active
  ) {
    LAST_GRT_BUY_NOW_SIGNAL =
      Date.now();

    recordGRTBuyNowSignal(
      ticker,
      momentumDecision
    );
  }

  await triggerMomentumScalpingEntry(
    ticker,
    momentumDecision
  );
}

/* ============================================================
   GRT PRICE ALERT DISPLAY HELPER
============================================================ */

function buildGRTMomentumAlertText(
  decision
) {
  const normalized =
    normalizeGRTDecision(
      decision
    );

  let phaseText =
    "";

  if (
    decision?.phase &&
    ![
      "IDLE",
      "COLLECTING",
      "BUY_NOW",
    ].includes(
      decision.phase
    )
  ) {
    phaseText =
      `\n📈 Phase: ${
        decision.phase
      }`;
  }

  let moveText =
    "";

  if (
    decision
      ?.sustainedMove
      ?.ready
  ) {
    moveText =
      `\n⏱ 5M: ${formatPercent(
        decision
          .sustainedMove
          .change5m
      )} | 15M: ${formatPercent(
        decision
          .sustainedMove
          .change15m
      )}`;
  }

  return `${normalized.text}${phaseText}${moveText}`;
}
/* ============================================================
   PRICE SNAPSHOT
============================================================ */

function getPriceSnapshot(
  coin,
  windowMs
) {
  const points =
    getPriceMemoryWindow(
      coin,
      windowMs
    );

  if (
    points.length <
    2
  ) {
    return null;
  }

  const prices =
    points.map(
      (item) =>
        item.price
    );

  const open =
    points[0].price;

  const close =
    points[
      points.length -
        1
    ].price;

  return {
    open,
    close,

    high:
      Math.max(
        ...prices
      ),

    low:
      Math.min(
        ...prices
      ),

    change:
      percentChange(
        open,
        close
      ),
  };
}

/* ============================================================
   MARKET DIRECTION
============================================================ */

function getMarketDirection(
  changePct
) {
  if (
    changePct >=
    0.50
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
    -0.50
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
   EXECUTED PRESSURE
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
    Date.now() -
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
   RECENT CONFIRMED BREAKOUT
============================================================ */

function getRecentConfirmedBreakout(
  coin,
  resistancePrice
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
    Date.now() -
      item.at >
    CONFIRMED_BREAKOUT_VISIBLE_MS
  ) {
    delete LAST_CONFIRMED_BREAKOUT[
      coin
    ];

    return null;
  }

  if (
    !resistancePrice ||
    !item.resistance
  ) {
    return item;
  }

  const differencePct =
    Math.abs(
      percentChange(
        item.resistance,
        resistancePrice
      )
    );

  if (
    differencePct >
    CONFIRMED_STRUCTURE_TOLERANCE_PCT
  ) {
    return null;
  }

  return item;
}

/* ============================================================
   BREAKOUT WATCH CREATION

   NEW GRT RULE:

   Resistance 1-3:
   NEVER full breakout lock.

   Resistance 4-6:
   context / caution only.

   Resistance 7-10:
   full anti-fake breakout validation.

   This prevents a weak wall from
   locking GRT entry for hours.
============================================================ */

function ensureBreakoutWatch({
  coin,
  resistance,
  resistanceRating,
  resistanceDistancePct,
  pressure,
}) {
  if (
    !resistance ||
    resistance <=
      0
  ) {
    return;
  }

  const positivePressure =
    String(
      pressure ||
      ""
    ).includes(
      "BELI"
    );

  if (
    !positivePressure
  ) {
    return;
  }

  if (
    resistanceDistancePct ===
      null ||
    resistanceDistancePct ===
      undefined ||
    resistanceDistancePct >
      BREAKOUT_WATCH_MAX_DISTANCE_PCT
  ) {
    return;
  }

  /*
    CRITICAL CHANGE FOR GRT.

    Only a strong wall may create
    a full BREAKOUT_WATCH.
  */

  if (
    coin ===
      "GRT" &&
    resistanceRating <
      GRT_STRONG_RESISTANCE_MIN_RATING
  ) {
    /*
      Remove an old stale watch
      if the wall has weakened.
    */

    if (
      BREAKOUT_WATCH[
        coin
      ]
    ) {
      delete BREAKOUT_WATCH[
        coin
      ];
    }

    return;
  }

  const existing =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    existing
  ) {
    const difference =
      Math.abs(
        percentChange(
          existing.resistance,
          resistance
        )
      );

    if (
      difference <=
      0.35
    ) {
      existing.resistance =
        resistance;

      existing.resistanceRating =
        resistanceRating;

      existing.lastUpdatedAt =
        Date.now();

      return;
    }
  }

  BREAKOUT_WATCH[
    coin
  ] = {
    coin,

    resistance,

    resistanceRating,

    resistanceDistancePct,

    startedAt:
      Date.now(),

    lastUpdatedAt:
      Date.now(),

    firstAboveAt:
      null,

    lastAboveAt:
      null,

    aboveTradeCount:
      0,

    buyEvidence:
      0,

    failureScore:
      0,

    processedSequences:
      new Set(),

    confirmed:
      false,
  };
}

/* ============================================================
   CANCEL BREAKOUT WATCH
============================================================ */

function cancelBreakoutWatch(
  coin
) {
  delete BREAKOUT_WATCH[
    coin
  ];
}

/* ============================================================
   CLEAN STALE BREAKOUT WATCH

   Prevent obsolete resistance from
   remaining active indefinitely.
============================================================ */

function cleanStaleBreakoutWatch(
  coin
) {
  const watch =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    !watch
  ) {
    return;
  }

  const ageMs =
    Date.now() -
    (
      watch.lastUpdatedAt ||
      watch.startedAt
    );

  /*
    30 minutes without a valid
    structure refresh is enough.
  */

  if (
    ageMs >
    30 *
      60 *
      1000
  ) {
    cancelBreakoutWatch(
      coin
    );
  }
}

/* ============================================================
   UNIFIED GRT MARKET CRITERIA

   IMPORTANT:

   GRT criteria now follows
   getGRTMomentumDecision().

   Market structure is NOT allowed
   to independently contradict it.
============================================================ */

function getGRTUnifiedCriteria({
  decision,
  fakeBreakout,
  confirmedBreakout,
  resistance,
  resistanceRating,
}) {
  if (
    fakeBreakout
  ) {
    return "JGN BELI — FAKE BREAKOUT";
  }

  const normalized =
    normalizeGRTDecision(
      decision
    );

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    return `BUY NOW — ${
      decision.reason ||
      "QUALIFIED MOMENTUM"
    }`;
  }

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    if (
      decision.phase ===
      "ACCUMULATION"
    ) {
      return "ACCUMULATION — WATCH ENTRY";
    }

    if (
      decision.phase ===
      "EARLY_MOMENTUM"
    ) {
      return "EARLY MOMENTUM — VERIFYING";
    }

    if (
      decision.phase ===
      "ACCELERATION"
    ) {
      return "ACCELERATION — VERIFYING ENTRY";
    }

    if (
      decision.phase ===
      "FINAL_CHECK"
    ) {
      return "FINAL MOMENTUM CHECK";
    }

    return "MOMENTUM VERIFYING";
  }

  if (
    normalized.status ===
    "COLLECTING"
  ) {
    return "COLLECTING DATA";
  }

  /*
    Confirmed strong-wall breakout
    may still be displayed.

    But if final momentum engine says
    NO ENTRY, it is NOT converted into
    an automatic BUY.
  */

  if (
    confirmedBreakout
  ) {
    return confirmedBreakout
      .entryBlocked
      ? "BREAKOUT CONFIRMED — ENTRY BLOCKED"
      : "BREAKOUT CONFIRMED — WAIT MOMENTUM";
  }

  /*
    Strong wall only.
  */

  if (
    resistance &&
    resistanceRating >=
      GRT_STRONG_RESISTANCE_MIN_RATING
  ) {
    return `STRONG RESISTANCE RM${formatPrice(
      "GRT",
      resistance
    )} — WAIT SETUP`;
  }

  return `JGN BELI — ${
    decision?.reason ||
    "NO QUALIFIED MOMENTUM"
  }`;
}

/* ============================================================
   BTC / GENERIC MARKET CRITERIA

   GRT DOES NOT USE THIS FUNCTION.
============================================================ */

function getGenericMarketCriteria({
  coin,
  direction,
  pressure,
  resistance,
  resistanceRating,
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

    return "BREAKOUT CONFIRMED";
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
    resistanceRating >=
      7 &&
    resistanceDistancePct !==
      null &&
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
    resistanceRating >=
      4 &&
    direction.includes(
      "NAIK"
    ) &&
    pressure.includes(
      "BELI"
    )
  ) {
    return `WATCH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  return "MARKET REFERENCE";
}

/* ============================================================
   MARKET STRUCTURE ANALYSIS

   GRT receives final momentum decision
   here so structure criteria and
   Price Alert use the same decision
   architecture.
============================================================ */

async function analyzeMarketStructure(
  coin
) {
  cleanStaleBreakoutWatch(
    coin
  );

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    return null;
  }

  const structure =
    await getOrderBookStructure(
      coin,
      ticker.currentPrice
    );

  if (
    !structure
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

  const directionChange =
    snapshot15m
      ? snapshot15m.change
      : snapshot60m
        ? snapshot60m.change
        : 0;

  const direction =
    getMarketDirection(
      directionChange
    );

  const flow =
    getExecutedFlowSummary(
      coin,
      15 *
        60 *
        1000
    );

  const pressure =
    getPressureLabel(
      flow.buyVolumePct ||
        50,

      flow.sellVolumePct ||
        50
    );

  const support =
    structure.support;

  const resistance =
    structure.resistance;

  const meaningfulResistance =
    structure
      .meaningfulResistance ||
    null;

  const resistanceClass =
    coin ===
      "GRT"
      ? classifyGRTResistance(
          resistance
        )
      : null;

  const fakeBreakout =
    getRecentFakeBreakout(
      coin
    );

  const confirmedBreakout =
    getRecentConfirmedBreakout(
      coin,
      resistance
        ?.price ||
        null
    );

  let market =
    direction;

  if (
    fakeBreakout
  ) {
    market =
      `${direction} — FAKE BREAKOUT`;
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
    if (
      coin ===
        "GRT" &&
      resistance.rating <=
        GRT_WEAK_RESISTANCE_MAX_RATING
    ) {
      market =
        `${direction} — WEAK RESISTANCE`;
    } else {
      market =
        `${direction} — DEKAT RESISTANCE`;
    }
  } else if (
    support &&
    support.distancePct <=
      0.50
  ) {
    market =
      `${direction} — DEKAT SUPPORT`;
  }

  /*
    Create breakout watch only under
    strength-aware rules.
  */

  ensureBreakoutWatch({
    coin,

    resistance:
      resistance
        ?.price ||
      null,

    resistanceRating:
      resistance
        ?.rating ||
      0,

    resistanceDistancePct:
      resistance
        ?.distancePct ??
      null,

    pressure,
  });

  /*
    GRT decision is generated here
    and becomes part of structure output.
  */

  let grtDecision =
    null;

  let criteria =
    "";

  if (
    coin ===
    "GRT"
  ) {
    grtDecision =
      await getGRTMomentumDecision(
        ticker
      );

    criteria =
      getGRTUnifiedCriteria({
        decision:
          grtDecision,

        fakeBreakout,

        confirmedBreakout,

        resistance:
          resistance
            ?.price ||
          null,

        resistanceRating:
          resistance
            ?.rating ||
          0,
      });
  } else {
    criteria =
      getGenericMarketCriteria({
        coin,

        direction,

        pressure,

        resistance:
          resistance
            ?.price ||
          null,

        resistanceRating:
          resistance
            ?.rating ||
          0,

        resistanceDistancePct:
          resistance
            ?.distancePct ??
          null,

        fakeBreakout,

        confirmedBreakout,
      });
  }

  return {
    coin,

    currentPrice:
      ticker.currentPrice,

    supportPrice:
      support
        ?.price ||
      null,

    supportRating:
      support
        ?.rating ||
      0,

    supportVolume:
      support
        ?.volume ||
      0,

    supportDistancePct:
      support
        ?.distancePct ??
      null,

    resistancePrice:
      resistance
        ?.price ||
      null,

    resistanceRating:
      resistance
        ?.rating ||
      0,

    resistanceVolume:
      resistance
        ?.volume ||
      0,

    resistanceDistancePct:
      resistance
        ?.distancePct ??
      null,

    resistanceClass:
      resistanceClass
        ?.className ||
      null,

    meaningfulResistancePrice:
      meaningfulResistance
        ?.price ||
      null,

    meaningfulResistanceRating:
      meaningfulResistance
        ?.rating ||
      0,

    meaningfulResistanceDistancePct:
      meaningfulResistance
        ?.distancePct ??
      null,

    bidLiquidityPct:
      structure.bidLiquidityPct,

    askLiquidityPct:
      structure.askLiquidityPct,

    market,

    direction,

    pressure,

    criteria,

    buyPct:
      flow.buyVolumePct,

    sellPct:
      flow.sellVolumePct,

    buyFrequencyPct:
      flow.buyFrequencyPct,

    sellFrequencyPct:
      flow.sellFrequencyPct,

    grtDecision,

    fakeBreakout,

    confirmedBreakout,
  };
}

/* ============================================================
   MARKET STRUCTURE TEXT
============================================================ */

function buildMarketStructureSection(
  data
) {
  const supportText =
    data.supportPrice
      ? `RM${formatPrice(
          data.coin,
          data.supportPrice
        )} — ${data.supportRating}/10`
      : "N/A";

  const resistanceText =
    data.resistancePrice
      ? `RM${formatPrice(
          data.coin,
          data.resistancePrice
        )} — ${data.resistanceRating}/10${
          data.coin ===
            "GRT" &&
          data.resistanceClass
            ? ` (${data.resistanceClass})`
            : ""
        }`
      : "N/A";

  let momentumLine =
    "";

  if (
    data.coin ===
      "GRT" &&
    data.grtDecision
  ) {
    const normalized =
      normalizeGRTDecision(
        data.grtDecision
      );

    momentumLine =
      `\n⚡ Momentum: ${normalized.text}`;

    if (
      data.grtDecision.phase &&
      ![
        "IDLE",
        "COLLECTING",
        "BUY_NOW",
      ].includes(
        data.grtDecision.phase
      )
    ) {
      momentumLine +=
        ` — ${data.grtDecision.phase}`;
    }
  }

  return `🪙 ${data.coin}
💵 Harga Semasa: RM${formatPrice(
    data.coin,
    data.currentPrice
  )}
🟢 Support: ${supportText}
🔴 Resistance: ${resistanceText}
📈 Market: ${data.market}
⚡️ Tekanan: ${data.pressure}${momentumLine}
🧠 Kriteria: ${data.criteria}`;
}

/* ============================================================
   MARKET STRUCTURE ALERT
============================================================ */

async function sendMarketStructure() {
  const sections =
    [];

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
  "\n━━━━━━━━━━━━━━━━━━\n"
)}`
  );
}

/* ============================================================
   PRICE ALERT 5 MIN

   IMPORTANT:

   GRT alert now shows:
   - 5M price move
   - FINAL momentum state
   - sustained phase when applicable

   It does NOT independently calculate
   a contradictory entry status.
============================================================ */

async function sendPriceAlert() {
  const [
    btc,
    grt,
  ] =
    await Promise.all([
      getTicker(
        "BTC"
      ),

      getTicker(
        "GRT"
      ),
    ]);

  if (
    !btc ||
    !grt
  ) {
    return;
  }

  const btcMomentum =
    await getBTCBuySurge();

  const grtDecision =
    await getGRTMomentumDecision(
      grt
    );

  const previousBTC =
    LAST_ALERT_PRICE[
      "BTC"
    ];

  const previousGRT =
    LAST_ALERT_PRICE[
      "GRT"
    ];

  const btcMove =
    previousBTC >
      0
      ? percentChange(
          previousBTC,
          btc.currentPrice
        )
      : 0;

  const grtMove =
    previousGRT >
      0
      ? percentChange(
          previousGRT,
          grt.currentPrice
        )
      : 0;

  LAST_ALERT_PRICE[
    "BTC"
  ] =
    btc.currentPrice;

  LAST_ALERT_PRICE[
    "GRT"
  ] =
    grt.currentPrice;

  const btcMoveText =
    Math.abs(
      btcMove
    ) >=
      0.01
      ? ` ${
          btcMove >
            0
            ? "⬆️"
            : "⬇️"
        } ${formatPercent(
          btcMove
        )} (5M)`
      : "";

  const grtMoveText =
    Math.abs(
      grtMove
    ) >=
      0.01
      ? ` ${
          grtMove >
            0
            ? "⬆️"
            : "⬇️"
        } ${formatPercent(
          grtMove
        )} (5M)`
      : "";

  const grtMomentumText =
    buildGRTMomentumAlertText(
      grtDecision
    );

  await sendTelegram(
    `📡 PRICE ALERT

₿ BTC RM${formatPrice(
      "BTC",
      btc.currentPrice
    )}${btcMoveText}
⚡ MOMENTUM: ${btcMomentum.text}

🪙 GRT RM${formatPrice(
      "GRT",
      grt.currentPrice
    )}${grtMoveText}
⚡ MOMENTUM:
${grtMomentumText}`
  );

  /*
    BUY NOW from Price Alert and
    BUY NOW from scanner both enter
    the SAME handler.

    Handler contains cooldown /
    active trade protection.
  */

  if (
    grtDecision.status ===
    "BUY_NOW"
  ) {
    await handleGRTBuyNowSignal(
      grt,
      grtDecision
    );
  }
}

/* ============================================================
   TRADE SIZE EVIDENCE
============================================================ */

function getMedianTradeVolume(
  coin,
  windowMs =
    TWO_HOURS
) {
  const trades =
    getTradesInWindow(
      coin,
      windowMs
    );

  if (
    !trades.length
  ) {
    return 0;
  }

  const volumes =
    trades
      .map(
        (trade) =>
          trade.volume
      )
      .sort(
        (a, b) =>
          a -
          b
      );

  const middle =
    Math.floor(
      volumes.length /
        2
    );

  if (
    volumes.length %
      2 ===
    1
  ) {
    return volumes[
      middle
    ];
  }

  return (
    volumes[
      middle -
        1
    ] +
    volumes[
      middle
    ]
  ) / 2;
}

/* ============================================================
   EXECUTED TRADE EVIDENCE WEIGHT
============================================================ */

function getTradeEvidenceWeight(
  coin,
  trade
) {
  const medianVolume =
    getMedianTradeVolume(
      coin
    );

  if (
    medianVolume <=
    0
  ) {
    return 1;
  }

  const multiple =
    trade.volume /
    medianVolume;

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
   BREAKOUT EXECUTED-TRADE PROCESSOR

   Full anti-fake validation is now
   reserved for genuine strong walls
   on GRT.

   Weak resistance should never reach
   this processor because no watch
   should exist for it.
============================================================ */

async function processBreakoutTrade(
  coin,
  trade
) {
  const watch =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    !watch ||
    watch.confirmed
  ) {
    return;
  }

  /*
    Extra safeguard.

    If GRT wall later becomes weak,
    cancel old watch immediately.
  */

  if (
    coin ===
      "GRT" &&
    watch.resistanceRating <
      GRT_STRONG_RESISTANCE_MIN_RATING
  ) {
    cancelBreakoutWatch(
      coin
    );

    return;
  }

  if (
    watch.processedSequences
      .has(
        trade.sequence
      )
  ) {
    return;
  }

  watch.processedSequences.add(
    trade.sequence
  );

  const resistance =
    watch.resistance;

  const breakoutPrice =
    resistance *
    (
      1 +
      BREAKOUT_BUFFER_PCT /
        100
    );

  const holdPrice =
    resistance *
    (
      1 +
      BREAKOUT_HOLD_BUFFER_PCT /
        100
    );

  const failurePrice =
    resistance *
    (
      1 -
      BREAKOUT_FAILURE_BUFFER_PCT /
        100
    );

  const hardFailurePrice =
    resistance *
    (
      1 -
      BREAKOUT_HARD_FAILURE_PCT /
        100
    );

  /*
    ========================================================
    ABOVE RESISTANCE
    ========================================================
  */

  if (
    trade.price >=
    breakoutPrice
  ) {
    const evidence =
      getTradeEvidenceWeight(
        coin,
        trade
      );

    watch.firstAboveAt =
      watch.firstAboveAt ||
      trade.timestamp;

    watch.lastAboveAt =
      trade.timestamp;

    watch.aboveTradeCount++;

    if (
      trade.isBuy
    ) {
      watch.buyEvidence +=
        evidence;
    }

    /*
      Sell execution above resistance
      does not add bullish evidence.
    */

    watch.failureScore =
      0;

    /*
      Stronger resistance requires
      slightly stronger confirmation.

      7-8/10:
      normal evidence.

      9-10/10:
      stronger executed BUY evidence.
    */

    const requiredEvidence =
      watch.resistanceRating >=
        9
        ? 5
        : 3;

    const enoughEvidence =
      (
        watch.aboveTradeCount >=
          2 &&
        watch.buyEvidence >=
          requiredEvidence
      ) ||
      watch.buyEvidence >=
        requiredEvidence +
          1;

    if (
      enoughEvidence &&
      trade.price >=
        holdPrice
    ) {
      watch.confirmed =
        true;

      LAST_CONFIRMED_BREAKOUT[
        coin
      ] = {
        at:
          Date.now(),

        resistance,

        resistanceRating:
          watch.resistanceRating,

        confirmedPrice:
          trade.price,

        buyEvidence:
          watch.buyEvidence,

        entryBlocked:
          false,
      };

      /*
        Entry safety is checked later
        by triggerBreakoutScalpingEntry.
      */

      await triggerBreakoutScalpingEntry(
        coin,
        watch,
        trade
      );

      cancelBreakoutWatch(
        coin
      );
    }

    return;
  }

  /*
    ========================================================
    STILL NEAR RESISTANCE

    Do nothing.
    Don't call it fake breakout yet.
    ========================================================
  */

  if (
    trade.price >=
    failurePrice
  ) {
    return;
  }

  /*
    ========================================================
    BREAKOUT FAILURE
    ========================================================
  */

  watch.failureScore +=
    trade.isBuy
      ? 1
      : 2;

  if (
    trade.price <=
      hardFailurePrice ||
    watch.failureScore >=
      3
  ) {
    LAST_FAKE_BREAKOUT[
      coin
    ] = {
      at:
        Date.now(),

      resistance,

      resistanceRating:
        watch.resistanceRating,

      failedPrice:
        trade.price,
    };

    cancelBreakoutWatch(
      coin
    );
  }
}
/* ============================================================
   2H MARKET CONTEXT

   IMPORTANT NEW LOGIC:

   2H = CONTEXT / MODIFIER.

   Ia BUKAN lagi normal hard gate
   untuk fresh GRT momentum.

   HARD BLOCK hanya bila:
   - executed selling memang kuat
   - frequency seller juga kuat
   - price 2H memang jatuh jelas

   Ini elak history 2H lambat
   membunuh reversal baru.
============================================================ */

async function analyze2HMarketCondition(
  coin
) {
  const trades =
    getTradesInWindow(
      coin,
      TWO_HOURS
    );

  if (
    trades.length <
    2
  ) {
    return null;
  }

  const sorted = [
    ...trades,
  ].sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  const coverageMs =
    sorted[
      sorted.length -
        1
    ].timestamp -
    sorted[0].timestamp;

  if (
    coverageMs <
    TWO_HOUR_MIN_COVERAGE_MS
  ) {
    return null;
  }

  const flow =
    getExecutedFlowSummary(
      coin,
      TWO_HOURS
    );

  const price =
    getMemoryPriceChange(
      coin,
      TWO_HOURS
    );

  const buyVolumePct =
    safeNumber(
      flow.buyVolumePct,
      50
    );

  const sellVolumePct =
    safeNumber(
      flow.sellVolumePct,
      50
    );

  const buyFrequencyPct =
    safeNumber(
      flow.buyFrequencyPct,
      50
    );

  const sellFrequencyPct =
    safeNumber(
      flow.sellFrequencyPct,
      50
    );

  const priceChangePct =
    price.ready
      ? safeNumber(
          price.changePct,
          0
        )
      : 0;

  /*
    ========================================================
    2H HARD BEARISH

    Must be clearly bearish,
    not merely CAUTION.
    ========================================================
  */

  const hardBearish =
    price.ready &&
    sellVolumePct >=
      65 &&
    sellFrequencyPct >=
      58 &&
    priceChangePct <=
      -0.60;

  /*
    Strong bullish context.
  */

  const bullishContext =
    price.ready &&
    buyVolumePct >=
      58 &&
    buyFrequencyPct >=
      52 &&
    priceChangePct >
      0;

  /*
    Mild bearish context.

    This only reduces score.
    It does NOT automatically block.
  */

  const bearishContext =
    !hardBearish &&
    price.ready &&
    (
      sellVolumePct >=
        55 ||
      priceChangePct <=
        -0.25
    );

  let action =
    "CAUTION";

  let scoreModifier =
    0;

  if (
    bullishContext
  ) {
    action =
      "ALLOW";

    scoreModifier =
      4;
  }

  if (
    bearishContext
  ) {
    action =
      "CAUTION";

    scoreModifier =
      -3;
  }

  if (
    hardBearish
  ) {
    action =
      "BLOCK";

    scoreModifier =
      -10;
  }

  return {
    coin,

    action,

    scoreModifier,

    hardBearish,

    bullishContext,

    bearishContext,

    buyVolumePct,

    sellVolumePct,

    buyFrequencyPct,

    sellFrequencyPct,

    priceChangePct,
  };
}

/* ============================================================
   2H SAFETY

   Kept for compatibility.

   GRT only returns BLOCK
   on truly hard bearish context.
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
   GRT 2H ENTRY PERMISSION

   Strong current momentum may continue
   under ordinary 2H CAUTION.

   Only genuine HARD BLOCK remains veto.
============================================================ */

function allowGRTEntryAgainst2H({
  twoHour,
  momentum,
}) {
  if (
    !twoHour
  ) {
    return {
      allowed:
        true,

      modifier:
        0,

      reason:
        "2H DATA INCOMPLETE",
    };
  }

  if (
    !twoHour.hardBearish
  ) {
    return {
      allowed:
        true,

      modifier:
        twoHour.scoreModifier,

      reason:
        twoHour.action,
    };
  }

  /*
    Even with bearish 2H,
    check whether current move is
    exceptionally strong.

    But we do NOT override if the
    current momentum engine itself
    already has hard bearish evidence.
  */

  const exceptionalCurrentMove =
    Boolean(
      momentum &&
      momentum.status ===
        "BUY_NOW" &&
      (
        momentum.reason ===
          "ACCELERATION" ||
        momentum.score >=
          10
      ) &&
      momentum
        .sustainedMove
        ?.accelerating &&
      safeNumber(
        momentum.baseline
          ?.current
          ?.buyVolumePct,
        0
      ) >=
        65
    );

  if (
    exceptionalCurrentMove &&
    !momentum.trend
      ?.hardBearish
  ) {
    return {
      allowed:
        true,

      modifier:
        -5,

      reason:
        "2H BEARISH — FAST MOMENTUM OVERRIDE",
    };
  }

  return {
    allowed:
      false,

    modifier:
      -10,

    reason:
      "2H HARD BEARISH",
  };
}

/* ============================================================
   EXECUTION STRUCTURE SNAPSHOT

   IMPORTANT:

   This function DOES NOT call
   analyzeMarketStructure().

   Therefore it cannot recursively
   trigger GRT momentum decision again.
============================================================ */

async function getExecutionStructureSnapshot(
  coin,
  currentPrice
) {
  const structure =
    await getOrderBookStructure(
      coin,
      currentPrice
    );

  if (
    !structure
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

  const directionChange =
    snapshot15m
      ? snapshot15m.change
      : snapshot60m
        ? snapshot60m.change
        : 0;

  const direction =
    getMarketDirection(
      directionChange
    );

  const flow =
    getExecutedFlowSummary(
      coin,
      15 *
        60 *
        1000
    );

  const pressure =
    getPressureLabel(
      flow.buyVolumePct ||
        50,

      flow.sellVolumePct ||
        50
    );

  return {
    coin,

    currentPrice,

    structure,

    support:
      structure.support,

    resistance:
      structure.resistance,

    meaningfulResistance:
      structure
        .meaningfulResistance,

    supportPrice:
      structure.support
        ?.price ||
      null,

    resistancePrice:
      structure.resistance
        ?.price ||
      null,

    resistanceRating:
      structure.resistance
        ?.rating ||
      0,

    meaningfulResistancePrice:
      structure
        .meaningfulResistance
        ?.price ||
      null,

    bidLiquidityPct:
      structure.bidLiquidityPct,

    askLiquidityPct:
      structure.askLiquidityPct,

    snapshot15m,

    snapshot60m,

    direction,

    pressure,

    flow,
  };
}

/* ============================================================
   SCALPING SCORE

   Base scoring remains compatible
   with other coins.

   GRT momentum score will be added
   separately by its dedicated engine.
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

  const marketText =
    String(
      market ||
      ""
    );

  if (
    marketText.includes(
      "BREAKOUT CONFIRMED"
    )
  ) {
    score +=
      15;
  }

  if (
    marketText.includes(
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

    /*
      Upper-middle structure can
      indicate upward continuation.

      But do not reward price
      almost touching resistance.
    */

    if (
      position >=
        0.50 &&
      position <=
        0.85
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
   FORMAT RESISTANCE RATING

   Supports both:
   wall.rating

   and older:
   resistance.strength.rating
============================================================ */

function getResistanceRating(
  resistance
) {
  if (
    !resistance
  ) {
    return 0;
  }

  return safeNumber(
    resistance.rating ??
      resistance.strength
        ?.rating,
    0
  );
}

/* ============================================================
   FORMAT RESISTANCE DISTANCE
============================================================ */

function getResistanceDistance(
  resistance,
  referencePrice =
    null
) {
  if (
    !resistance
  ) {
    return null;
  }

  if (
    Number.isFinite(
      resistance.distancePct
    )
  ) {
    return resistance
      .distancePct;
  }

  if (
    referencePrice &&
    resistance.price
  ) {
    return percentChange(
      referencePrice,
      resistance.price
    );
  }

  return null;
}

/* ============================================================
   SEND SCALPING ENTRY

   TP1 = projected reachable area.

   TP2 is shown only when continuation
   screening says further reach
   is plausible.

   START ENTRY remains interactive.
============================================================ */

async function sendScalpingEntry(
  candidate
) {
  /*
    BTC is reference only.
  */

  if (
    candidate.coin ===
    "BTC"
  ) {
    return;
  }

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
    Date.now();

  LAST_SIGNAL[
    candidate.coin
  ] =
    Date.now();

  let resistanceText =
    "";

  if (
    candidate.nextResistance
  ) {
    const rating =
      getResistanceRating(
        candidate
          .nextResistance
      );

    const distance =
      getResistanceDistance(
        candidate
          .nextResistance,
        candidate
          .preliminaryEntry
      );

    resistanceText = `

🧱 Next Meaningful Resistance:
RM${formatPrice(
      candidate.coin,
      candidate
        .nextResistance
        .price
    )} — ${rating}/10`;

    if (
      distance !==
      null
    ) {
      resistanceText += `

📏 Resistance Distance:
${distance.toFixed(
  2
)}%`;
    }
  }

  let tp2Text =
    "";

  if (
    candidate.tp2
  ) {
    tp2Text = `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
      candidate.coin,
      candidate.tp2
    )}

⚠️ TP2 Confidence:
${
  candidate.tp2Confidence ||
  "CONDITIONAL"
}`;

    if (
      candidate.tp2Requirement
    ) {
      tp2Text += `

📌 TP2 Requirement:
${candidate.tp2Requirement}`;
    }
  }

  let tpModeText =
    "";

  if (
    candidate.roomReason
  ) {
    tpModeText = `

🎯 Projection Logic:
${candidate.roomReason}`;
  }

  let phaseText =
    "";

  if (
    candidate
      .momentumSnapshot
      ?.phase
  ) {
    phaseText = `

⚡ Momentum Phase:
${candidate
  .momentumSnapshot
  .phase}`;
  }

  await sendTelegram(
    `🚀 SCALPING ENTRY

🪙 ${candidate.coin}

💵 Current:
RM${formatPrice(
      candidate.coin,
      candidate.currentPrice
    )}

📐 Suggested Entry:
RM${formatPrice(
      candidate.coin,
      candidate.preliminaryEntry
    )}

🎯 TP1 — PROJECTED REACH:
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
${candidate.setup}${phaseText}${resistanceText}${tpModeText}${tp2Text}

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
   MOMENTUM BUY NOW -> SCALPING ENTRY

   BUY NOW already passed the
   new momentum decision engine.

   This stage only checks:
   - current execution quality
   - genuine sell danger
   - 2H context
   - projected room
   - entry chase

   It does NOT re-demand the exact
   same confirmation all over again.
============================================================ */

async function triggerMomentumScalpingEntry(
  ticker,
  momentumDecision
) {
  const coin =
    "GRT";

  if (
    !ticker ||
    !momentumDecision ||
    momentumDecision.status !==
      "BUY_NOW"
  ) {
    return;
  }

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
    Date.now() -
      LAST_SIGNAL[
        coin
      ] <
      PER_COIN_COOLDOWN
  ) {
    return;
  }

  const execution =
    await getExecutionStructureSnapshot(
      coin,
      ticker.currentPrice
    );

  if (
    !execution
  ) {
    return;
  }

  /*
    Current strong selling can veto.

    This uses LIVE 15M executed flow,
    not stale 2H history.
  */

  const liveSellDanger =
    execution.flow
      .sellVolumePct >=
        GRT_HARD_SELL_VOLUME_PCT &&
    execution.flow
      .sellFrequencyPct >=
        58;

  if (
    liveSellDanger
  ) {
    return;
  }

  /*
    Fake breakout remains a genuine veto.
  */

  const fakeBreakout =
    getRecentFakeBreakout(
      coin
    );

  if (
    fakeBreakout
  ) {
    return;
  }

  /*
    2H context.
  */

  const twoHour =
    await analyze2HMarketCondition(
      coin
    );

  const twoHourPermission =
    allowGRTEntryAgainst2H({
      twoHour,

      momentum:
        momentumDecision,
    });

  if (
    !twoHourPermission.allowed
  ) {
    return;
  }

  const technicalEntry =
    ticker.currentPrice;

  const preliminary =
    choosePreliminaryEntry({
      technicalEntry,

      bestAsk:
        ticker.ask,
    });

  /*
    CRITICAL:

    Pass momentumDecision here.

    This activates the new dynamic
    GRT projected-reach engine
    from PART 4.
  */

  const room =
    await evaluateRoomToTP(
      coin,
      preliminary.entryPrice,
      momentumDecision
    );

  if (
    !room.allowed
  ) {
    return;
  }

  let score =
    getScalpingScore({
      snapshot15m:
        execution.snapshot15m,

      snapshot60m:
        execution.snapshot60m,

      pressure:
        execution.pressure,

      market:
        execution.direction,

      currentPrice:
        ticker.currentPrice,

      support:
        execution.supportPrice,

      resistance:
        execution
          .meaningfulResistancePrice ||
        execution.resistancePrice,
    });

  /*
    Dedicated momentum score bonus.
  */

  score +=
    Math.min(
      safeNumber(
        momentumDecision.score,
        0
      ) *
        2,
      20
    );

  /*
    2H is a modifier,
    not ordinary veto.
  */

  score +=
    twoHourPermission
      .modifier;

  /*
    Sustained buying bonus.
  */

  if (
    momentumDecision
      .sustainedMove
      ?.sustained
  ) {
    score +=
      4;
  }

  if (
    momentumDecision
      .sustainedMove
      ?.accelerating
  ) {
    score +=
      5;
  }

  /*
    Weak resistance should NOT
    penalize entry.
  */

  if (
    execution.resistance &&
    execution.resistance.rating <=
      GRT_WEAK_RESISTANCE_MAX_RATING
  ) {
    score +=
      3;
  }

  /*
    Strong resistance very near
    is already dealt with by
    projected-room engine.

    Small score penalty only.
  */

  if (
    execution.resistance &&
    execution.resistance.rating >=
      GRT_STRONG_RESISTANCE_MIN_RATING &&
    execution.resistance.distancePct <=
      0.50
  ) {
    score -=
      4;
  }

  score =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  /*
    BUY NOW has already passed
    a dedicated momentum threshold.

    Execution score threshold therefore
    stays reasonable rather than forcing
    another overly strict 80+ confirmation.
  */

  if (
    score <
    60
  ) {
    return;
  }

  const confidence =
    confidenceLabel(
      score
    );

  const risk =
    buildEntryRiskLevels({
      coin,

      entryPrice:
        preliminary.entryPrice,

      room,

      confidence,
    });

  await sendScalpingEntry({
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

    tp2:
      risk.tp2,

    tp2Confidence:
      room.projection
        ?.tp2Confidence ||
      null,

    tp2Requirement:
      room.projection
        ?.tp2Requirement ||
      null,

    sl:
      risk.sl,

    durationHours:
      risk.durationHours,

    setup:
      momentumDecision.reason ===
        "ACCELERATION"
        ? "EARLY ACCELERATION"
        : momentumDecision.reason ===
            "SUSTAINED EARLY MOMENTUM"
          ? "SUSTAINED MOMENTUM"
          : "MOMENTUM BUY NOW",

    brokenResistance:
      null,

    nextResistance:
      room.nextResistance,

    roomReason:
      room.reason,

    breakoutAllowed:
      room.breakoutAllowed,

    momentumSnapshot:
      momentumDecision,

    twoHourContext:
      twoHour,
  });
}

/* ============================================================
   BREAKOUT SCALPING ENTRY

   This remains a SEPARATE entry path.

   For GRT it only runs after
   a STRONG wall 7-10/10 has passed
   executed-trade anti-fake validation.
============================================================ */

async function triggerBreakoutScalpingEntry(
  coin,
  watch,
  trade
) {
  /*
    BTC is never traded.
  */

  if (
    coin ===
    "BTC"
  ) {
    return;
  }

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
    Date.now() -
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
    return;
  }

  const execution =
    await getExecutionStructureSnapshot(
      coin,
      ticker.currentPrice
    );

  if (
    !execution
  ) {
    return;
  }

  /*
    Breakout must not be accompanied
    by strong executed selling.
  */

  if (
    execution.pressure ===
      "TEKANAN JUAL KUAT"
  ) {
    return;
  }

  let momentumDecision =
    null;

  /*
    GRT gets its dedicated
    momentum confirmation.

    BUT we do not require old-style
    oneHourBlocked / fiveMinutePositive.
  */

  if (
    coin ===
    "GRT"
  ) {
    momentumDecision =
      await getGRTMomentumDecision(
        ticker
      );

    /*
      Strong-wall breakout already has
      executed confirmation.

      We reject only clear current
      NO_ENTRY with bearish reason.
    */

    if (
      momentumDecision.status ===
        "NO_ENTRY" &&
      (
        momentumDecision.reason ===
          "MULTI-TIMEFRAME BEARISH" ||
        momentumDecision.reason ===
          "PRICE RESPONSE FAILED" ||
        momentumDecision.reason ===
          "BUYER PRESSURE COLLAPSED"
      )
    ) {
      return;
    }
  }

  /*
    2H context.
  */

  const twoHour =
    CORE_COINS.includes(
      coin
    )
      ? await analyze2HMarketCondition(
          coin
        )
      : null;

  if (
    coin ===
    "GRT"
  ) {
    const permission =
      allowGRTEntryAgainst2H({
        twoHour,

        momentum:
          momentumDecision,
      });

    if (
      !permission.allowed
    ) {
      return;
    }
  } else if (
    twoHour?.hardBearish
  ) {
    return;
  }

  const technicalEntry =
    trade.price;

  const preliminary =
    choosePreliminaryEntry({
      technicalEntry,

      bestAsk:
        ticker.ask,
    });

  /*
    GRT breakout uses dynamic projection
    when usable momentum data exists.

    Other coins use generic room engine.
  */

  const room =
    await evaluateRoomToTP(
      coin,
      preliminary.entryPrice,
      coin ===
        "GRT"
        ? momentumDecision
        : null
    );

  if (
    !room.allowed
  ) {
    LAST_CONFIRMED_BREAKOUT[
      coin
    ] = {
      at:
        Date.now(),

      resistance:
        watch.resistance,

      resistanceRating:
        watch.resistanceRating,

      confirmedPrice:
        trade.price,

      entryBlocked:
        true,

      reason:
        room.reason,
    };

    return;
  }

  const baseScore =
    getScalpingScore({
      snapshot15m:
        execution.snapshot15m,

      snapshot60m:
        execution.snapshot60m,

      pressure:
        execution.pressure,

      market:
        `${execution.direction} — BREAKOUT CONFIRMED`,

      currentPrice:
        ticker.currentPrice,

      support:
        execution.supportPrice,

      resistance:
        execution
          .meaningfulResistancePrice ||
        execution.resistancePrice,
    });

  const evidenceBonus =
    Math.min(
      watch.buyEvidence *
        3,
      15
    );

  let score =
    Math.max(
      72,
      baseScore +
        evidenceBonus
    );

  if (
    coin ===
      "GRT" &&
    momentumDecision
  ) {
    score +=
      Math.min(
        safeNumber(
          momentumDecision.score,
          0
        ),
        10
      );

    if (
      momentumDecision
        .sustainedMove
        ?.accelerating
    ) {
      score +=
        4;
    }
  }

  score =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  const confidence =
    confidenceLabel(
      score
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
      Date.now(),

    resistance:
      watch.resistance,

    resistanceRating:
      watch.resistanceRating,

    confirmedPrice:
      trade.price,

    buyEvidence:
      watch.buyEvidence,

    entryBlocked:
      false,
  };

  await sendScalpingEntry({
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

    tp2:
      risk.tp2,

    tp2Confidence:
      room.projection
        ?.tp2Confidence ||
      null,

    tp2Requirement:
      room.projection
        ?.tp2Requirement ||
      null,

    sl:
      risk.sl,

    durationHours:
      risk.durationHours,

    setup:
      "BREAKOUT CONFIRMED",

    brokenResistance:
      watch.resistance,

    nextResistance:
      room.nextResistance,

    roomReason:
      room.reason,

    breakoutAllowed:
      room.breakoutAllowed,

    momentumSnapshot:
      momentumDecision,

    twoHourContext:
      twoHour,
  });
}
/* ============================================================
   GENERAL 1-MINUTE SCALPING SCANNER

   IMPORTANT NEW ARCHITECTURE:

   BTC:
   reference only.

   GRT:
   uses ONLY dedicated momentum decision.

   Other coins:
   retain general scanner.

   This prevents two separate engines
   from giving contradictory GRT entries.
============================================================ */

async function scanSignals() {
  if (
    Date.now() -
      LAST_GLOBAL_SIGNAL <
    GLOBAL_SCALPING_COOLDOWN
  ) {
    return;
  }

  const candidates =
    [];

  for (
    const coin of
    SCAN_COINS
  ) {
    /* ========================================================
       BTC = MARKET REFERENCE ONLY
    ======================================================== */

    if (
      coin ===
      "BTC"
    ) {
      continue;
    }

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
      Date.now() -
        LAST_SIGNAL[
          coin
        ] <
        PER_COIN_COOLDOWN
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

    /* ========================================================
       GRT DEDICATED PATH

       NO general decision duplication.
    ======================================================== */

    if (
      coin ===
      "GRT"
    ) {
      const momentum =
        await getGRTMomentumDecision(
          ticker
        );

      if (
        momentum.status ===
        "BUY_NOW"
      ) {
        await handleGRTBuyNowSignal(
          ticker,
          momentum
        );
      }

      /*
        GRT stops here.

        It will NEVER fall through
        into generic scanner logic.
      */

      continue;
    }

    /* ========================================================
       OTHER COINS
    ======================================================== */

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
      Active strong-wall breakout watch
      owns the entry path.

      Do not bypass anti-fake engine.
    */

    if (
      BREAKOUT_WATCH[
        coin
      ]
    ) {
      continue;
    }

    if (
      structure.pressure ===
        "TEKANAN JUAL KUAT" ||
      structure.direction ===
        "SEDANG MENURUN KUAT"
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

    let score =
      getScalpingScore({
        snapshot15m,

        snapshot60m,

        pressure:
          structure.pressure,

        market:
          structure.market,

        currentPrice:
          ticker.currentPrice,

        support:
          structure.supportPrice,

        resistance:
          structure
            .meaningfulResistancePrice ||
          structure.resistancePrice,
      });

    const twoHour =
      await analyze2HMarketCondition(
        coin
      );

    if (
      twoHour?.hardBearish
    ) {
      continue;
    }

    if (
      twoHour
    ) {
      score +=
        twoHour.scoreModifier;
    }

    score =
      Math.round(
        clamp(
          score,
          0,
          100
        )
      );

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

    const technicalEntry =
      ticker.currentPrice;

    const preliminary =
      choosePreliminaryEntry({
        technicalEntry,

        bestAsk:
          ticker.ask,
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

    if (
      percentChange(
        preliminary.entryPrice,
        risk.tp
      ) <
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

      tp2:
        risk.tp2,

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

      roomReason:
        room.reason,

      breakoutAllowed:
        room.breakoutAllowed,

      momentumSnapshot:
        null,
    });

    await sleep(
      100
    );
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

  await sendScalpingEntry(
    candidates[0]
  );
}

/* ============================================================
   FINAL ORDER PLAN

   IMPORTANT:

   Target RM does NOT force TP higher.

   TP remains technical / projected reach.

   Target profit changes suggested quantity.

   For GRT:
   momentumSnapshot MUST be passed again
   during final order revalidation.

   Otherwise the dynamic TP engine would
   disappear during final order planning.
============================================================ */

async function resolveFinalOrderPlan(
  entry,
  targetProfit
) {
  const sellableUnitFactor =
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

  for (
    let attempt =
      0;
    attempt <
      4;
    attempt++
  ) {
    /*
      Recalculate current room.

      GRT retains momentum projection.
    */

    const room =
      await evaluateRoomToTP(
        entry.coin,
        entryPrice,
        entry.momentumSnapshot ||
          null
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

    const grossRoomPct =
      percentChange(
        entryPrice,
        risk.tp
      );

    const minimumPracticalRoom =
      entry.coin ===
        "GRT"
        ? GRT_MIN_PRACTICAL_TP_ROOM_PCT
        : MIN_GROSS_ROOM_PCT;

    if (
      grossRoomPct <
      minimumPracticalRoom
    ) {
      return {
        allowed:
          false,

        reason:
          "PROJECTED RANGE NOT PRACTICAL",
      };
    }

    /*
      Luno fees:

      Gross purchased quantity
      ↓
      buy fee
      ↓
      net tradable quantity
      ↓
      sell fee
      ↓
      actual proceeds.
    */

    const netProfitPerGrossUnit =
      risk.tp *
        sellableUnitFactor -
      entryPrice;

    if (
      netProfitPerGrossUnit <=
      0
    ) {
      return {
        allowed:
          false,

        reason:
          "NET PROFIT NEGATIVE AFTER FEES",
      };
    }

    /*
      Flexible quantity:
      desired RM profit determines
      how many gross units are needed.
    */

    const quantity =
      Math.ceil(
        targetProfit /
        netProfitPerGrossUnit
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <=
        0
    ) {
      return {
        allowed:
          false,

        reason:
          "INVALID QUANTITY",
      };
    }

    /*
      Check actual Luno ask depth.
    */

    const depth =
      await chooseQuantityAwareLimitEntry({
        coin:
          entry.coin,

        technicalEntry:
          entry.technicalEntry,

        requiredQuantity:
          quantity,
      });

    const nextEntry =
      depth.finalEntry;

    if (
      depth.chasePct >
      MAX_ENTRY_CHASE_PCT
    ) {
      return {
        allowed:
          false,

        reason:
          "ENTRY CHASE TOO HIGH",
      };
    }

    /*
      If orderbook-selected entry
      did not move meaningfully,
      final plan is ready.
    */

    if (
      Math.abs(
        nextEntry -
        entryPrice
      ) <
      0.0000000001
    ) {
      const estimatedNetProfit =
        quantity *
        netProfitPerGrossUnit;

      return {
        allowed:
          true,

        entryPrice,

        quantity,

        room,

        risk,

        grossRoomPct,

        netProfitPerGrossUnit,

        estimatedNetProfit,

        depthSelection:
          depth,
      };
    }

    /*
      Entry moved because depth changed.

      Recalculate projected reach,
      fees and quantity again.
    */

    entryPrice =
      nextEntry;
  }

  return {
    allowed:
      false,

    reason:
      "ORDERBOOK CHANGED DURING FINAL CHECK",
  };
}

/* ============================================================
   ACTIVE GRT SUSTAINED STATUS

   Purpose after user has actually bought:

   HOLD
   CAUTION
   EXIT_EARLY

   This is NOT based on one red tick.

   It combines:
   - price structure
   - executed BUY/SELL flow
   - support
   - momentum
   - price vs entry
============================================================ */

async function analyzeActiveGRTHoldStatus(
  trade,
  ticker
) {
  if (
    !trade ||
    !ticker
  ) {
    return null;
  }

  const [
    execution,
    momentum,
  ] =
    await Promise.all([
      getExecutionStructureSnapshot(
        "GRT",
        ticker.currentPrice
      ),

      getGRTMomentumDecision(
        ticker
      ),
    ]);

  if (
    !execution
  ) {
    return null;
  }

  const currentPrice =
    ticker.currentPrice;

  const moveFromEntryPct =
    percentChange(
      trade.buyPrice,
      currentPrice
    );


const flowReady =
  Boolean(
    execution.flow &&
    execution.flow.totalCount >
      0
  );

const buyPct =
  flowReady
    ? safeNumber(
        execution.flow
          .buyVolumePct,
        50
      )
    : null;

const sellPct =
  flowReady
    ? safeNumber(
        execution.flow
          .sellVolumePct,
        50
      )
    : null;

const buyFrequency =
  flowReady
    ? safeNumber(
        execution.flow
          .buyFrequencyPct,
        50
      )
    : null;

const sellFrequency =
  flowReady
    ? safeNumber(
        execution.flow
          .sellFrequencyPct,
        50
      )
    : null;
  const support =
    execution.support;

  const supportBroken =
    Boolean(
      support &&
      currentPrice <
        support.price *
          0.997
    );

 const strongSellPressure =
  flowReady &&
  sellPct >=
    65 &&
  sellFrequency >=
    58;

const buyerHealthy =
  flowReady &&
  buyPct >=
    52 &&
  buyFrequency >=
    50;

  const sustained =
    Boolean(
      momentum
        ?.sustainedMove
        ?.sustained
    );

  const accelerating =
    Boolean(
      momentum
        ?.sustainedMove
        ?.accelerating
    );

  const momentumLost =
    Boolean(
      momentum?.status ===
        "NO_ENTRY" &&
      (
        momentum.reason ===
          "PRICE RESPONSE FAILED" ||
        momentum.reason ===
          "BUYER PRESSURE COLLAPSED" ||
        momentum.reason ===
          "MULTI-TIMEFRAME BEARISH"
      )
    );

  /*
    SELL evidence should be combined.

    One condition alone does not
    automatically produce EXIT EARLY.
  */

  let dangerScore =
    0;

  if (
    supportBroken
  ) {
    dangerScore +=
      2;
  }

  if (
    strongSellPressure
  ) {
    dangerScore +=
      2;
  }

  if (
    momentumLost
  ) {
    dangerScore +=
      2;
  }

  if (
    moveFromEntryPct <=
      -0.75
  ) {
    dangerScore +=
      1;
  }

  /*
    Healthy score.
  */

  let healthScore =
    0;

  if (
    buyerHealthy
  ) {
    healthScore +=
      2;
  }

  if (
    sustained
  ) {
    healthScore +=
      2;
  }

  if (
    accelerating
  ) {
    healthScore +=
      1;
  }

  if (
    support &&
    !supportBroken
  ) {
    healthScore +=
      1;
  }

  if (
    moveFromEntryPct >
    0
  ) {
    healthScore +=
      1;
  }

  let status =
    "CAUTION";

  let reason =
    "MOMENTUM MIXED";

  if (
    dangerScore >=
    4
  ) {
    status =
      "EXIT_EARLY";

    reason =
      supportBroken
        ? "SUPPORT + MOMENTUM WEAKENING"
        : "SELL PRESSURE RISING";
  } else if (
    healthScore >=
      5 &&
    dangerScore <=
      1
  ) {
    status =
      "HOLD";

    reason =
      accelerating
        ? "SUSTAINED BUYING + ACCELERATION"
        : "PRICE STRUCTURE STILL HEALTHY";
 } else if (
  flowReady &&
  !buyerHealthy
) {
  status =
    "CAUTION";

  reason =
    "BUY ACTIVITY WEAKENING";
} else if (
  !flowReady
) {
  status =
    "CAUTION";

  reason =
    "EXECUTED FLOW DATA NOT READY";

  }

  return {
    status,

    reason,

    currentPrice,

    moveFromEntryPct,

    buyPct,

    sellPct,

    buyFrequency,

    sellFrequency,

    support,

    supportBroken,

    sustained,

    accelerating,

    momentumLost,

    healthScore,

    dangerScore,

    momentum,
  };
}

/* ============================================================
   POST-ENTRY STATUS LABEL
============================================================ */

function getPostEntryStatusLabel(
  status
) {
  if (
    status ===
    "HOLD"
  ) {
    return "🟢 HOLD";
  }

  if (
    status ===
    "EXIT_EARLY"
  ) {
    return "🔴 EXIT EARLY";
  }

  return "🟡 CAUTION";
}

/* ============================================================
   SEND POST-ENTRY STATUS CHANGE

   We alert only when status changes,
   avoiding Telegram spam every 15 sec.
============================================================ */

async function maybeSendGRTPostEntryStatus(
  trade,
  ticker
) {
  if (
    trade.coin !==
    "GRT"
  ) {
    return;
  }

  const analysis =
    await analyzeActiveGRTHoldStatus(
      trade,
      ticker
    );

  if (
    !analysis
  ) {
    return;
  }

  const previousStatus =
    trade.lastHoldStatus ||
    null;

  trade.lastHoldStatus =
    analysis.status;

  trade.lastHoldAnalysis =
    analysis;

  /*
    First sample:
    store baseline but do not
    immediately spam after BUY confirmation.
  */

  if (
    !previousStatus
  ) {
    return;
  }

  if (
    previousStatus ===
    analysis.status
  ) {
    return;
  }

  const label =
    getPostEntryStatusLabel(
      analysis.status
    );

  const supportText =
    analysis.support
      ? `RM${formatPrice(
          "GRT",
          analysis.support.price
        )} — ${analysis.support.rating}/10`
      : "N/A";

  let actionButtons =
    [];

  if (
    analysis.status ===
    "EXIT_EARLY"
  ) {
    actionButtons = [
      [
        {
          text:
            "💰 SELL",

          callback_data:
            "SELL_GRT",
        },

        {
          text:
            "✋ HOLD",

          callback_data:
            "HOLD_GRT",
        },
      ],
    ];
  }

  const options =
    actionButtons.length
      ? {
          reply_markup: {
            inline_keyboard:
              actionButtons,
          },
        }
      : {};

  await sendTelegram(
    `📡 GRT POST-ENTRY STATUS

${label}

💵 Entry:
RM${formatPrice(
      "GRT",
      trade.buyPrice
    )}

💵 Current:
RM${formatPrice(
      "GRT",
      analysis.currentPrice
    )}

📈 Price vs Entry:
${formatPercent(
      analysis.moveFromEntryPct
    )}

🧾 BUY Volume:
${analysis.buyPct.toFixed(
  1
)}%

🧾 BUY Frequency:
${analysis.buyFrequency.toFixed(
  1
)}%

🟢 Support:
${supportText}

📊 Sustained:
${
  analysis.sustained
    ? "YES"
    : "NO"
}

⚡ Acceleration:
${
  analysis.accelerating
    ? "YES"
    : "NO"
}

🧠 Reason:
${analysis.reason}`,
    options
  );
}

/* ============================================================
   ACTIVE TRADE MONITOR

   Existing:
   - TP
   - SL
   - duration

   NEW:
   - GRT HOLD / CAUTION / EXIT EARLY
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

    /* ========================================================
       POST-ENTRY SUSTAINED WATCH

       Run max once every 60 sec
       even though monitor loop is faster.
    ======================================================== */

    if (
      coin ===
      "GRT"
    ) {
      const lastCheck =
        trade.lastHoldCheckAt ||
        0;

      if (
        Date.now() -
          lastCheck >=
        60 *
          1000
      ) {
        trade.lastHoldCheckAt =
          Date.now();

        try {
          await maybeSendGRTPostEntryStatus(
            trade,
            ticker
          );
        } catch (
          error
        ) {
          console.log(
            "Post-entry GRT status error:",
            error.message
          );
        }
      }
    }

    /* ========================================================
       TAKE PROFIT 1 REACHED
    ======================================================== */

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
        ticker.currentPrice *
        netSellUnit;

      const estimatedNetProfit =
        estimatedSellValue -
        trade.totalBuyCost;

      let continuationText =
        "";

      /*
        For GRT:
        reaching TP1 does NOT automatically
        mean move is finished.

        Show TP2 if current screening
        previously provided one.
      */

      if (
        coin ===
          "GRT" &&
        trade.tp2
      ) {
        continuationText = `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
          coin,
          trade.tp2
        )}

📌 TP2 hanya relevan jika momentum kekal.`;
      }

      await sendTelegram(
        `🎯 TP1 PROJECTED REACH HIT

🪙 ${coin}

💵 Current Price:
RM${formatPrice(
          coin,
          ticker.currentPrice
        )}

🎯 TP1:
RM${formatPrice(
          coin,
          trade.tp
        )}${continuationText}

📌 Best Bid:
RM${formatPrice(
          coin,
          ticker.bid
        )}

📦 Net Must Sell:
${trade.netTradeUnit.toFixed(
          4
        )} ${coin}

💰 Estimated Net Profit:
RM${estimatedNetProfit.toFixed(
          2
        )}

SELL OR HOLD?`,
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

    /* ========================================================
       TP2 REACHED
    ======================================================== */

    if (
      trade.tp2 &&
      trade.tpReached &&
      !trade.tp2Reached &&
      ticker.currentPrice >=
        trade.tp2
    ) {
      trade.tp2Reached =
        true;

      await sendTelegram(
        `🚀 TP2 EXTENDED REACH HIT

🪙 ${coin}

💵 Current:
RM${formatPrice(
          coin,
          ticker.currentPrice
        )}

🎯 TP2:
RM${formatPrice(
          coin,
          trade.tp2
        )}

⚠️ Extended projection sudah dicapai.

SELL OR HOLD?`,
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

    /* ========================================================
       STOP LOSS
    ======================================================== */

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
          ticker.bid
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

    /* ========================================================
       TRADE DURATION
    ======================================================== */

    const expired =
      Date.now() -
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
          ticker.bid
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
      query.message
        ?.chat
        ?.id;

    if (
      !chatId
    ) {
      return;
    }

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
          `💰 TARGET NET PROFIT (RM)?

Contoh:
50

Bot akan kekalkan technical/projected TP dan kira quantity yang diperlukan.`
        );
      }
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

      delete USER_STATE[
        chatId
      ];

      /*
        No trade happened.
        Let scanner look again.
      */

      delete LAST_SIGNAL[
        coin
      ];

      LAST_GLOBAL_SIGNAL =
        0;

      await replyTelegram(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    /* ======================================================
       CONFIRM BUY
    ====================================================== */

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

Masukkan quantity yang betul-betul matched.

Masukkan:
0

jika order tak match.`
        );
      }
    }

    /* ======================================================
       CANCEL BUY
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

      delete LAST_SIGNAL[
        coin
      ];

      LAST_GLOBAL_SIGNAL =
        0;

      await replyTelegram(
        chatId,
        `❌ ENTRY CANCELLED

🪙 ${coin}

📡 Monitoring Next Entry...`
      );
    }

    /* ======================================================
       SELL
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

🪙 ${coin}

Masukkan harga sebenar order SELL yang matched.`
        );
      }
    }

/* ======================================================
   HOLD
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

  const trade =
    ACTIVE_TRADES[
      coin
    ];

  if (
    trade
  ) {
    /*
      HOLD means:
      continue monitoring the trade
      WITHOUT re-arming an alert
      that has already fired.

      TP2 and sustained-status
      monitoring continue normally.
    */

    await replyTelegram(
      chatId,
      `📡 MONITORING CONTINUES

🪙 ${coin}

Bot akan terus pantau:

• Sustained momentum
• HOLD / CAUTION / EXIT EARLY
• TP2 jika ada
• New market weakness
• SL jika belum triggered`
    );
  }
}

    try {
      await bot.answerCallbackQuery(
        query.id
      );
    } catch (
      error
    ) {
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

    /*
      Commands are processed separately.
    */

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
       WAIT TARGET PROFIT
    ====================================================== */

    if (
      state.step ===
      "WAIT_PROFIT"
    ) {
      const targetProfit =
        Number(
          String(
            msg.text ||
              ""
          )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );

      if (
        !Number.isFinite(
          targetProfit
        ) ||
        targetProfit <=
          0
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Masukkan target profit RM yang sah."
        );

        return;
      }

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

      /*
        Re-check market and orderbook
        BEFORE suggesting actual order.
      */

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

        /*
          No actual trade occurred.
        */

        delete LAST_SIGNAL[
          state.coin
        ];

        LAST_GLOBAL_SIGNAL =
          0;

        await replyTelegram(
          chatId,
          `⚠️ ENTRY CANCELLED

🪙 ${entry.coin}

❌ ${plan.reason}

Market / orderbook berubah selepas signal.

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
        ] ||
        MAX_CAPITAL.MID;

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

        delete LAST_SIGNAL[
          state.coin
        ];

        LAST_GLOBAL_SIGNAL =
          0;

        await replyTelegram(
          chatId,
          `⚠️ REQUIRED CAPITAL TOO HIGH

🪙 ${entry.coin}

💰 Target Net Profit:
RM${targetProfit.toFixed(
            2
          )}

📦 Required Quantity:
${plan.quantity.toLocaleString(
            "en-MY"
          )} ${entry.coin}

💵 Required:
RM${value.toFixed(
            2
          )}

Maximum For ${entry.confidence} Setup:
RM${maxCapital.toFixed(
            2
          )}

📡 Monitoring Next Entry...`
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

        estimatedNetProfit:
          plan.estimatedNetProfit,

        grossRoomPct:
          plan.grossRoomPct,

        entryPrice:
          plan.entryPrice,

        tp:
          plan.risk.tp,

        tp2:
          plan.risk.tp2 ||
          null,

        tp2Confidence:
          plan.room
            ?.projection
            ?.tp2Confidence ||
          null,

        tp2Requirement:
          plan.room
            ?.projection
            ?.tp2Requirement ||
          null,

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

        tpLogic:
          plan.room
            ?.reason ||
          "TECHNICAL PROJECTED REACH",

        momentumSnapshot:
          entry.momentumSnapshot ||
          null,
      };

      const fillText =
        plan.depthSelection
          ?.fullFillEstimated
          ? "✅ DEPTH CUKUP"
          : "⚠️ DEPTH TAK CUKUP — PARTIAL MATCH MUNGKIN";

      let tp2Text =
        "";

      if (
        plan.risk.tp2
      ) {
        tp2Text = `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
          entry.coin,
          plan.risk.tp2
        )}

⚠️ TP2:
CONDITIONAL`;
      }

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

🎯 TP1 — PROJECTED REACH:
RM${formatPrice(
          entry.coin,
          plan.risk.tp
        )}${tp2Text}

📈 Gross TP1 Room:
${plan.grossRoomPct.toFixed(
          2
        )}%

🧠 Projection Logic:
${plan.room.reason}

🛑 SL:
RM${formatPrice(
          entry.coin,
          plan.risk.sl
        )}

💰 Target Net Profit:
RM${targetProfit.toFixed(
          2
        )}

💵 Estimated Net Profit At TP1:
RM${plan.estimatedNetProfit.toFixed(
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
       WAIT MATCHED QUANTITY
    ====================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_QUANTITY"
    ) {
      const matchedQuantity =
        Number(
          String(
            msg.text ||
              ""
          )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );

      if (
        !Number.isFinite(
          matchedQuantity
        ) ||
        matchedQuantity <
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

      /* ====================================================
         ORDER NOT MATCHED
      ==================================================== */

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

      /*
        Prevent impossible user input
        far above suggested quantity.

        Partial match is fine.
      */

      if (
        matchedQuantity >
        state.quantity *
          1.05
      ) {
        await replyTelegram(
          chatId,
          `⚠️ MATCHED QUANTITY TERLALU TINGGI

Suggested:
${state.quantity.toLocaleString(
            "en-MY"
          )} ${state.coin}

Masukkan actual matched quantity sahaja.`
        );

        return;
      }

      /* ====================================================
         BUY FEE + ACTUAL TRADE SIZE
      ==================================================== */

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

      /* ====================================================
         ACTIVATE TRADE MONITOR
      ==================================================== */

      ACTIVE_TRADES[
        state.coin
      ] = {
        coin:
          state.coin,

        buyPrice:
          state.entryPrice,

        tp:
          state.tp,

        tp2:
          state.tp2 ||
          null,

        tp2Confidence:
          state.tp2Confidence ||
          null,

        tp2Requirement:
          state.tp2Requirement ||
          null,

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
          Date.now(),

        tpReached:
          false,

        tp2Reached:
          false,

        slReached:
          false,

        durationAlertSent:
          false,

        setup:
          entry.setup,

        confidence:
          entry.confidence,

        score:
          entry.score,

        tpLogic:
          state.tpLogic,

        grossRoomPct:
          state.grossRoomPct,

        momentumSnapshot:
          state.momentumSnapshot ||
          entry.momentumSnapshot ||
          null,

        lastHoldStatus:
          null,

        lastHoldAnalysis:
          null,

        lastHoldCheckAt:
          0,
      };

      const matchType =
        matchedQuantity <
          state.quantity
          ? "✅ PARTIAL TRADE CONFIRMED"
          : "✅ TRADE CONFIRMED";

      let tp2ConfirmedText =
        "";

      if (
        state.tp2
      ) {
        tp2ConfirmedText = `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
          state.coin,
          state.tp2
        )}

⚠️ TP2:
CONDITIONAL — momentum mesti kekal`;
      }

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

🎯 TP1 — PROJECTED REACH:
RM${formatPrice(
          state.coin,
          state.tp
        )}${tp2ConfirmedText}

🧠 Projection Logic:
${state.tpLogic}

🛑 SL:
RM${formatPrice(
          state.coin,
          state.sl
        )}

💰 Original Target:
RM${state.targetProfit.toFixed(
          2
        )}

🔄 Estimated Profit At TP1:
RM${adjustedProfit.toFixed(
          2
        )}

📊 Target Achievement:
${targetAchievement.toFixed(
          1
        )}%

📡 Trade Monitoring Started

Untuk GRT bot juga akan pantau:
HOLD / CAUTION / EXIT EARLY`
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
       WAIT SELL PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_SELL_PRICE"
    ) {
      const matchedPrice =
        Number(
          String(
            msg.text ||
              ""
          )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );

      if (
        !Number.isFinite(
          matchedPrice
        ) ||
        matchedPrice <=
          0
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Masukkan matched sell price yang sah."
        );

        return;
      }

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

      const pnlPct =
        trade.totalBuyCost >
          0
          ? (
              pnl /
              trade.totalBuyCost
            ) *
            100
          : 0;

      await replyTelegram(
        chatId,
        `✅ SELL TRADE CONFIRMED

🪙 ${state.coin}

💵 Buy Price:
RM${formatPrice(
          state.coin,
          trade.buyPrice
        )}

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
RM${pnl.toFixed(
          2
        )}

📈 Return:
${formatPercent(
          pnlPct
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

      LAST_GLOBAL_SIGNAL =
        0;

      return;
    }
  }
);
/* ============================================================
   PART 8 / 8

   FINAL MODULES:

   - /grthold interactive manual analysis
   - GRT BUY NOW learning
   - learning performance
   - tuning report
   - GRT rolling 24H
   - daily 12AM Malaysia rollover
   - manual Telegram commands
   - API endpoints
   - startup
   - schedulers
============================================================ */

/* ============================================================
   NUMBER DISPLAY HELPERS
============================================================ */

function formatLargeNumber(
  value
) {
  const number =
    safeNumber(
      value
    );

  if (
    Math.abs(
      number
    ) >=
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
    Math.abs(
      number
    ) >=
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
    Math.abs(
      number
    ) >=
    1000
  ) {
    return `${(
      number /
      1000
    ).toFixed(
      2
    )}K`;
  }

  return number.toFixed(
    2
  );
}

function formatFullVolume(
  value
) {
  return safeNumber(
    value
  ).toLocaleString(
    "en-MY",
    {
      maximumFractionDigits:
        2,
    }
  );
}

/* ============================================================
   GRT HOLD P/L

   User enters:
   - actual entry price
   - gross quantity bought

   Fee model remains:
   BUY 0.5%
   SELL 0.5%
============================================================ */

function calculateManualGRTHoldPnL({
  entryPrice,
  quantity,
  currentPrice,
}) {
  const grossBuyCost =
    quantity *
    entryPrice;

  const buyFeeUnit =
    quantity *
    BUY_FEE;

  const netTradeUnit =
    quantity -
    buyFeeUnit;

  const sellFeeUnit =
    netTradeUnit *
    SELL_FEE;

  const netSellUnit =
    netTradeUnit -
    sellFeeUnit;

  const currentNetSellValue =
    netSellUnit *
    currentPrice;

  const netPnL =
    currentNetSellValue -
    grossBuyCost;

  const netPnLPct =
    grossBuyCost >
      0
      ? (
          netPnL /
          grossBuyCost
        ) * 100
      : 0;

  const grossPriceMovePct =
    percentChange(
      entryPrice,
      currentPrice
    );

  return {
    grossBuyCost,

    buyFeeUnit,

    netTradeUnit,

    sellFeeUnit,

    netSellUnit,

    currentNetSellValue,

    netPnL,

    netPnLPct,

    grossPriceMovePct,
  };
}

/* ============================================================
   MANUAL GRT HOLD MARKET STATUS

   Unlike ACTIVE_TRADES, /grthold works
   even if user bought manually outside
   bot scalping flow.

   STATUS:
   HOLD
   CAUTION
   EXIT_EARLY
============================================================ */

async function analyzeManualGRTHold({
  entryPrice,
  quantity,
}) {
  const ticker =
    await getTicker(
      "GRT"
    );

  if (
    !ticker
  ) {
    return null;
  }

  const currentPrice =
    ticker.currentPrice;

  const [
    momentum,
    execution,
    twoHour,
  ] =
    await Promise.all([
      getGRTMomentumDecision(
        ticker
      ),

      getExecutionStructureSnapshot(
        "GRT",
        currentPrice
      ),

      analyze2HMarketCondition(
        "GRT"
      ),
    ]);

  if (
    !execution
  ) {
    return null;
  }

  const pnl =
    calculateManualGRTHoldPnL({
      entryPrice,

      quantity,

      currentPrice,
    });

  const projection =
    await calculateGRTProjectedReach({
      currentPrice,

      momentum,
    });

  const support =
    execution.support;

  const resistance =
    execution.resistance;

const flowReady =
  Boolean(
    execution.flow &&
    execution.flow.totalCount >
      0
  );

const buyVolumePct =
  flowReady
    ? safeNumber(
        execution.flow
          .buyVolumePct,
        50
      )
    : null;

const sellVolumePct =
  flowReady
    ? safeNumber(
        execution.flow
          .sellVolumePct,
        50
      )
    : null;

const buyFrequencyPct =
  flowReady
    ? safeNumber(
        execution.flow
          .buyFrequencyPct,
        50
      )
    : null;

const sellFrequencyPct =
  flowReady
    ? safeNumber(
        execution.flow
          .sellFrequencyPct,
        50
      )
    : null;

  const sustained =
    Boolean(
      momentum
        ?.sustainedMove
        ?.sustained
    );

  const accelerating =
    Boolean(
      momentum
        ?.sustainedMove
        ?.accelerating
    );

  const supportBroken =
    Boolean(
      support &&
      currentPrice <
        support.price *
          0.997
    );

const sellingDanger =
  flowReady &&
  sellVolumePct >=
    65 &&
  sellFrequencyPct >=
    58;

  const momentumFailure =
    Boolean(
      momentum?.status ===
        "NO_ENTRY" &&
      (
        momentum.reason ===
          "PRICE RESPONSE FAILED" ||
        momentum.reason ===
          "BUYER PRESSURE COLLAPSED" ||
        momentum.reason ===
          "MULTI-TIMEFRAME BEARISH"
      )
    );

  let dangerScore =
    0;

  if (
    supportBroken
  ) {
    dangerScore +=
      2;
  }

  if (
    sellingDanger
  ) {
    dangerScore +=
      2;
  }

  if (
    momentumFailure
  ) {
    dangerScore +=
      2;
  }

  if (
    pnl.grossPriceMovePct <=
    -0.75
  ) {
    dangerScore +=
      1;
  }

  let healthScore =
    0;

  if (
    buyVolumePct >=
    52
  ) {
    healthScore +=
      1;
  }

  if (
    buyFrequencyPct >=
    52
  ) {
    healthScore +=
      1;
  }

  if (
    sustained
  ) {
    healthScore +=
      2;
  }

  if (
    accelerating
  ) {
    healthScore +=
      1;
  }

  if (
    support &&
    !supportBroken
  ) {
    healthScore +=
      1;
  }

  if (
    pnl.grossPriceMovePct >
    0
  ) {
    healthScore +=
      1;
  }

  let holdStatus =
    "CAUTION";

  let holdReason =
    "MOMENTUM MIXED";

  if (
    dangerScore >=
    4
  ) {
    holdStatus =
      "EXIT_EARLY";

    holdReason =
      supportBroken
        ? "SUPPORT / MOMENTUM WEAKENING"
        : "SELL PRESSURE RISING";
  } else if (
    healthScore >=
      5 &&
    dangerScore <=
      1
  ) {
    holdStatus =
      "HOLD";

    holdReason =
      accelerating
        ? "SUSTAINED BUYING + ACCELERATION"
        : "CURRENT STRUCTURE STILL HEALTHY";
  } else if (
    sellingDanger
  ) {
    holdStatus =
      "CAUTION";

    holdReason =
      "SELL PRESSURE INCREASING";
  } else if (
    !sustained
  ) {
    holdStatus =
      "CAUTION";

    holdReason =
      "PRICE NOT YET CLEARLY SUSTAINED";
  }

  return {
    ticker,

    currentPrice,

    entryPrice,

    quantity,

    pnl,

    momentum,

    execution,

    twoHour,

    projection,

    flowReady,

    support,

    resistance,

    buyVolumePct,

    sellVolumePct,

    buyFrequencyPct,

    sellFrequencyPct,

    sustained,

    accelerating,

    supportBroken,

    sellingDanger,

    momentumFailure,

    healthScore,

    dangerScore,

    holdStatus,

    holdReason,
  };
}

/* ============================================================
   GRT HOLD STATUS LABEL
============================================================ */

function getManualHoldStatusLabel(
  status
) {
  if (
    status ===
    "HOLD"
  ) {
    return "🟢 HOLD";
  }

  if (
    status ===
    "EXIT_EARLY"
  ) {
    return "🔴 EXIT EARLY";
  }

  return "🟡 CAUTION";
}

/* ============================================================
   BUILD /GRTHOLD REPORT

   TP means projected market reach,
   NOT sell instruction.
============================================================ */

function buildManualGRTHoldReport(
  analysis
) {
  const pnl =
    analysis.pnl;

  const projection =
    analysis.projection;

  const supportText =
    analysis.support
      ? `RM${formatPrice(
          "GRT",
          analysis.support.price
        )} — ${analysis.support.rating}/10`
      : "N/A";

  const resistanceText =
    analysis.resistance
      ? `RM${formatPrice(
          "GRT",
          analysis.resistance.price
        )} — ${analysis.resistance.rating}/10`
      : "N/A";

  const statusLabel =
    getManualHoldStatusLabel(
      analysis.holdStatus
    );

  let tp1Text =
    "N/A";

  let tp2Section =
    "";

  if (
    projection?.tp1
  ) {
    tp1Text =
      `RM${formatPrice(
        "GRT",
        projection.tp1
      )}`;
  }

  if (
    projection?.tp2
  ) {
    tp2Section = `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
      "GRT",
      projection.tp2
    )}

Confidence:
${projection.tp2Confidence || "LOW"}

Requirement:
${projection.tp2Requirement || "MOMENTUM MUST REMAIN STRONG"}`;
  }

  let tp1ResistanceText =
    "";

  if (
    projection?.tp1Resistance
  ) {
    tp1ResistanceText = `

🧱 TP1 Resistance:
RM${formatPrice(
      "GRT",
      projection.tp1Resistance.price
    )} — ${projection.tp1Resistance.rating}/10`;
  }

  const pnlEmoji =
    pnl.netPnL >=
      0
      ? "🟢"
      : "🔴";

  return `🪙 GRT HOLD STATUS

📌 Entry:
RM${formatPrice(
    "GRT",
    analysis.entryPrice
  )}

💵 Current:
RM${formatPrice(
    "GRT",
    analysis.currentPrice
  )}

📦 Quantity:
${analysis.quantity.toLocaleString(
    "en-MY"
  )} GRT

📈 Price Move:
${formatPercent(
    pnl.grossPriceMovePct
  )}

${pnlEmoji} Estimated Net P/L:
RM${pnl.netPnL.toFixed(
    2
  )} (${formatPercent(
    pnl.netPnLPct
  )})

━━━━━━━━━━━━━━

📊 HOLD STATUS:
${statusLabel}

🧠 Reason:
${analysis.holdReason}

📈 Sustained:
${analysis.sustained
  ? "YES"
  : "NO"}

⚡ Acceleration:
${analysis.accelerating
  ? "YES"
  : "NO"}

🧾 BUY Volume:
${analysis.flowReady
  ? `${analysis.buyVolumePct.toFixed(
      1
    )}%`
  : "DATA NOT READY"}

🧾 BUY Frequency:
${analysis.flowReady
  ? `${analysis.buyFrequencyPct.toFixed(
      1
    )}%`
  : "DATA NOT READY"}

🟢 Support:
${supportText}

🔴 Resistance:
${resistanceText}

━━━━━━━━━━━━━━

🎯 TP1 — PROJECTED REACH:
${tp1Text}

Confidence:
${projection?.tp1Confidence || "LOW"}

Projected From Current:
${projection?.tp1MovePct !==
  undefined &&
projection?.tp1MovePct !==
  null
  ? formatPercent(
      projection.tp1MovePct
    )
  : "N/A"}${tp1ResistanceText}${tp2Section}

━━━━━━━━━━━━━━

📌 TP = anggaran maximum reasonable reach berdasarkan keadaan market SEMASA.

Ia BUKAN arahan wajib jual.`;
}

/* ============================================================
   /GRTHOLD COMMAND

   FLOW:
   /grthold
      ↓
   ENTRY PRICE
      ↓
   QUANTITY
      ↓
   CURRENT MARKET SCREENING
============================================================ */

bot.onText(
  /\/grthold/i,
  async (msg) => {
    const chatId =
      msg.chat.id;

    USER_STATE[
      chatId
    ] = {
      step:
        "WAIT_GRTHOLD_ENTRY",
    };

    await replyTelegram(
      chatId,
      `🪙 GRT HOLD CHECK

Masukkan ENTRY PRICE GRT.

Contoh:
0.0691`
    );
  }
);

/* ============================================================
   /GRTHOLD MESSAGE HANDLER

   Separate listener is safe because
   Part 7 state machine ignores these
   specific GRTHOLD states.
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
       WAIT GRT HOLD ENTRY PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_GRTHOLD_ENTRY"
    ) {
      const entryPrice =
        Number(
          String(
            msg.text ||
              ""
          )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );

      if (
        !Number.isFinite(
          entryPrice
        ) ||
        entryPrice <=
          0
      ) {
        await replyTelegram(
          chatId,
          `⚠️ ENTRY PRICE TAK SAH

Contoh:
0.0691`
        );

        return;
      }

      USER_STATE[
        chatId
      ] = {
        step:
          "WAIT_GRTHOLD_QUANTITY",

        entryPrice,
      };

      await replyTelegram(
        chatId,
        `📦 Masukkan QUANTITY GRT yang dibeli.

Contoh:
20000`
      );

      return;
    }

    /* ======================================================
       WAIT GRT HOLD QUANTITY
    ====================================================== */

    if (
      state.step ===
      "WAIT_GRTHOLD_QUANTITY"
    ) {
      const quantity =
        Number(
          String(
            msg.text ||
              ""
          )
            .replace(
              /,/g,
              ""
            )
            .trim()
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <=
          0
      ) {
        await replyTelegram(
          chatId,
          `⚠️ QUANTITY TAK SAH

Contoh:
20000`
        );

        return;
      }

      await replyTelegram(
        chatId,
        "🔎 Screening current GRT market..."
      );

      try {
        const analysis =
          await analyzeManualGRTHold({
            entryPrice:
              state.entryPrice,

            quantity,
          });

        if (
          !analysis
        ) {
          await replyTelegram(
            chatId,
            "⚠️ GRT market data unavailable."
          );

          delete USER_STATE[
            chatId
          ];

          return;
        }

        await replyTelegram(
          chatId,
          buildManualGRTHoldReport(
            analysis
          )
        );
      } catch (
        error
      ) {
        console.log(
          "GRT hold analysis:",
          error.message
        );

        await replyTelegram(
          chatId,
          "⚠️ GRT HOLD screening gagal. Cuba semula."
        );
      }

      delete USER_STATE[
        chatId
      ];

      return;
    }
  }
);

/* ============================================================
   GRT BUY NOW LEARNING
============================================================ */

function createGRTSignalId() {
  return `GRT-${Date.now()}-${Math.random()
    .toString(
      36
    )
    .substring(
      2,
      6
    )
    .toUpperCase()}`;
}

/* ============================================================
   SAVE BUY NOW HISTORY
============================================================ */

function saveGRTBuyNowHistory() {
  try {
    fs.writeFileSync(
      GRT_BUY_NOW_FILE,
      JSON.stringify(
        {
          history:
            GRT_BUY_NOW_HISTORY,

          lastSignal:
            LAST_GRT_BUY_NOW_SIGNAL,

          lastSuggestionCount:
            LAST_TUNING_SUGGESTION_COUNT,
        },
        null,
        2
      )
    );
  } catch (
    error
  ) {
    console.log(
      "GRT BUY NOW save error:",
      error.message
    );
  }
}

/* ============================================================
   LOAD BUY NOW HISTORY
============================================================ */

function loadGRTBuyNowHistory() {
  try {
    if (
      !fs.existsSync(
        GRT_BUY_NOW_FILE
      )
    ) {
      return;
    }

    const raw =
      fs.readFileSync(
        GRT_BUY_NOW_FILE,
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
      Array.isArray(
        parsed.history
      )
    ) {
      GRT_BUY_NOW_HISTORY =
        parsed.history.slice(
          -GRT_BUY_NOW_HISTORY_LIMIT
        );
    }

    LAST_GRT_BUY_NOW_SIGNAL =
      safeNumber(
        parsed.lastSignal,
        LAST_GRT_BUY_NOW_SIGNAL
      );

    LAST_TUNING_SUGGESTION_COUNT =
      safeNumber(
        parsed.lastSuggestionCount,
        LAST_TUNING_SUGGESTION_COUNT
      );
  } catch (
    error
  ) {
    console.log(
      "GRT BUY NOW load error:",
      error.message
    );
  }
}

/* ============================================================
   TUNING SAVE / LOAD

   Current rebuild keeps this as
   LEARNING / OBSERVATION.

   It does NOT silently alter
   major entry architecture.
============================================================ */

function saveGRTTuning() {
  try {
    fs.writeFileSync(
      GRT_TUNING_FILE,
      JSON.stringify(
        {
          buyVolumeMinPct:
            GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

          updatedAt:
            Date.now(),
        },
        null,
        2
      )
    );
  } catch (
    error
  ) {
    console.log(
      "GRT tuning save error:",
      error.message
    );
  }
}

function loadGRTTuning() {
  try {
    if (
      !fs.existsSync(
        GRT_TUNING_FILE
      )
    ) {
      return;
    }

    const raw =
      fs.readFileSync(
        GRT_TUNING_FILE,
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

    const saved =
      safeNumber(
        parsed.buyVolumeMinPct,
        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
      );

    if (
      saved >=
        50 &&
      saved <=
        75
    ) {
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
        saved;
    }
  } catch (
    error
  ) {
    console.log(
      "GRT tuning load error:",
      error.message
    );
  }
}

/* ============================================================
   RECORD GRT BUY NOW

   Mapping updated for NEW momentum engine.
============================================================ */

function recordGRTBuyNowSignal(
  ticker,
  analysis
) {
  if (
    !ticker ||
    !analysis
  ) {
    return null;
  }

  const baseline =
    analysis.baseline;

  const flow =
    baseline
      ?.current ||
    {};

  const trend =
    analysis.trend ||
    {};

  const signal = {
    id:
      createGRTSignalId(),

    createdAt:
      Date.now(),

    entryPrice:
      ticker.currentPrice,

    completed:
      false,

    result:
      "MONITORING",

    phase:
      analysis.phase ||
      "UNKNOWN",

    reason:
      analysis.reason ||
      "UNKNOWN",

    score:
      safeNumber(
        analysis.score
      ),

    buyIncreasePct:
      safeNumber(
        baseline
          ?.buyIncreasePct
      ),

    buyVolumePct:
      safeNumber(
        flow.buyVolumePct
      ),

    sellVolumePct:
      safeNumber(
        flow.sellVolumePct
      ),

    buyFrequencyPct:
      safeNumber(
        flow.buyFrequencyPct
      ),

    sellFrequencyPct:
      safeNumber(
        flow.sellFrequencyPct
      ),

    priceResponsePct:
      safeNumber(
        analysis.priceResponse
          ?.changePct
      ),

    sustained:
      Boolean(
        analysis
          .sustainedMove
          ?.sustained
      ),

    accelerating:
      Boolean(
        analysis
          .sustainedMove
          ?.accelerating
      ),

    move5mAtSignal:
      safeNumber(
        analysis
          .sustainedMove
          ?.change5m
      ),

    move15mAtSignal:
      safeNumber(
        analysis
          .sustainedMove
          ?.change15m
      ),

    rsi:
      trend.rsi5m
        ?.ready
        ? safeNumber(
            trend.rsi5m
              .current
          )
        : null,

    rsiDirection:
      trend.rsi5m
        ?.direction ||
      "UNKNOWN",

    candle5mDirection:
      trend.candle5m
        ?.direction ||
      "UNKNOWN",

    candle1hDirection:
      trend.candle1h
        ?.direction ||
      "UNKNOWN",

    ma9:
      trend.ma1h
        ?.ready
        ? safeNumber(
            trend.ma1h.ma9
          )
        : null,

    ma50:
      trend.ma1h
        ?.ready
        ? safeNumber(
            trend.ma1h.ma50
          )
        : null,

    maCondition:
      trend.ma1h
        ?.condition ||
      "UNKNOWN",

    resistance:
      analysis.liquidity
        ?.resistance
        ?.price ||
      null,

    resistanceRating:
      analysis.liquidity
        ?.resistance
        ?.rating ||
      null,

    resistanceClass:
      analysis.liquidity
        ?.resistanceClass ||
      "UNKNOWN",

    bidLiquidityPct:
      analysis.liquidity
        ?.bidLiquidityPct ??
      null,

    btcState:
      analysis.btcSurge
        ?.status ||
      LAST_BTC_SURGE_STATE ||
      "UNKNOWN",

    price5m:
      null,

    change5m:
      null,

    price10m:
      null,

    change10m:
      null,

    price15m:
      null,

    change15m:
      null,

    bestPrice:
      ticker.currentPrice,

    bestMovePct:
      0,

    worstPrice:
      ticker.currentPrice,

    worstMovePct:
      0,

    finishedAt:
      null,
  };

  GRT_BUY_NOW_HISTORY.push(
    signal
  );

  GRT_BUY_NOW_HISTORY =
    GRT_BUY_NOW_HISTORY.slice(
      -GRT_BUY_NOW_HISTORY_LIMIT
    );

  saveGRTBuyNowHistory();

  console.log(
    `GRT BUY NOW RECORDED ${signal.id} @ ${signal.entryPrice}`
  );

  return signal;
}

/* ============================================================
   FIND CLOSEST PRICE MEMORY POINT
============================================================ */

function findClosestPricePoint(
  coin,
  targetTime,
  toleranceMs =
    90 *
      1000
) {
  const memory =
    PRICE_MEMORY[
      coin
    ] ||
    [];

  if (
    !memory.length
  ) {
    return null;
  }

  let closest =
    null;

  let bestDifference =
    Infinity;

  for (
    const item of
    memory
  ) {
    const difference =
      Math.abs(
        item.timestamp -
        targetTime
      );

    if (
      difference <
      bestDifference
    ) {
      closest =
        item;

      bestDifference =
        difference;
    }
  }

  if (
    bestDifference >
    toleranceMs
  ) {
    return null;
  }

  return closest;
}

/* ============================================================
   UPDATE BUY NOW BEST / WORST MOVE
============================================================ */

function updateGRTSignalExtremes(
  signal,
  currentPrice,
  currentTime =
    Date.now()
) {
  const endTime =
    Math.min(
      currentTime,
      signal.createdAt +
        15 *
          60 *
          1000
    );

  const points =
    (
      PRICE_MEMORY[
        "GRT"
      ] ||
      []
    )
      .filter(
        (item) =>
          item.timestamp >=
            signal.createdAt &&
          item.timestamp <=
            endTime
      )
      .map(
        (item) =>
          item.price
      );

  if (
    currentPrice >
      0 &&
    currentTime <=
      signal.createdAt +
        15 *
          60 *
          1000
  ) {
    points.push(
      currentPrice
    );
  }

  if (
    !points.length
  ) {
    return;
  }

  signal.bestPrice =
    Math.max(
      signal.bestPrice ||
        signal.entryPrice,
      ...points
    );

  signal.worstPrice =
    Math.min(
      signal.worstPrice ||
        signal.entryPrice,
      ...points
    );

  signal.bestMovePct =
    percentChange(
      signal.entryPrice,
      signal.bestPrice
    );

  signal.worstMovePct =
    percentChange(
      signal.entryPrice,
      signal.worstPrice
    );
}

/* ============================================================
   CLASSIFY BUY NOW RESULT
============================================================ */

function classifyGRTBuyNowSignal(
  signal
) {
  if (
    signal.bestMovePct >=
    GRT_BUY_NOW_SUCCESS_PCT
  ) {
    return "SUCCESS";
  }

  if (
    signal.worstMovePct <=
      GRT_BUY_NOW_FALSE_PCT &&
    signal.bestMovePct <
      GRT_BUY_NOW_SUCCESS_PCT
  ) {
    return "FALSE";
  }

  return "MIXED";
}

/* ============================================================
   MONITOR BUY NOW LEARNING
============================================================ */

async function monitorGRTBuyNowSignals() {
  const active =
    GRT_BUY_NOW_HISTORY.filter(
      (signal) =>
        !signal.completed
    );

  if (
    !active.length
  ) {
    return;
  }

  const ticker =
    await getTicker(
      "GRT"
    );

  if (
    !ticker
  ) {
    return;
  }

  const now =
    Date.now();

  let changed =
    false;

  for (
    const signal of
    active
  ) {
    updateGRTSignalExtremes(
      signal,
      ticker.currentPrice,
      now
    );

    const elapsed =
      now -
      signal.createdAt;

    if (
      elapsed >=
        5 *
          60 *
          1000 &&
      signal.price5m ===
        null
    ) {
      const point =
        findClosestPricePoint(
          "GRT",
          signal.createdAt +
            5 *
              60 *
              1000
        );

      signal.price5m =
        point?.price ||
        ticker.currentPrice;

      signal.change5m =
        percentChange(
          signal.entryPrice,
          signal.price5m
        );

      changed =
        true;
    }

    if (
      elapsed >=
        10 *
          60 *
          1000 &&
      signal.price10m ===
        null
    ) {
      const point =
        findClosestPricePoint(
          "GRT",
          signal.createdAt +
            10 *
              60 *
              1000
        );

      signal.price10m =
        point?.price ||
        ticker.currentPrice;

      signal.change10m =
        percentChange(
          signal.entryPrice,
          signal.price10m
        );

      changed =
        true;
    }

    if (
      elapsed >=
        15 *
          60 *
          1000 &&
      signal.price15m ===
        null
    ) {
      const point =
        findClosestPricePoint(
          "GRT",
          signal.createdAt +
            15 *
              60 *
              1000
        );

      signal.price15m =
        point?.price ||
        ticker.currentPrice;

      signal.change15m =
        percentChange(
          signal.entryPrice,
          signal.price15m
        );

      signal.result =
        classifyGRTBuyNowSignal(
          signal
        );

      signal.completed =
        true;

      signal.finishedAt =
        now;

      changed =
        true;

      console.log(
        `GRT BUY NOW RESULT ${signal.id}: ${signal.result}`
      );
    }
  }

  if (
    changed
  ) {
    saveGRTBuyNowHistory();

    await maybeSuggestGRTTuning();
  }
}

/* ============================================================
   BUY NOW PERFORMANCE
============================================================ */

function getCompletedGRTBuyNowSignals() {
  return GRT_BUY_NOW_HISTORY.filter(
    (signal) =>
      signal.completed
  );
}

function getGRTBuyNowPerformance() {
  const completed =
    getCompletedGRTBuyNowSignals();

  if (
    !completed.length
  ) {
    return {
      total:
        0,

      success:
        0,

      falseSignals:
        0,

      mixed:
        0,

      accuracy:
        0,

      average5m:
        0,

      average10m:
        0,

      average15m:
        0,

      averageBest:
        0,

      averageWorst:
        0,
    };
  }

  const success =
    completed.filter(
      (signal) =>
        signal.result ===
        "SUCCESS"
    ).length;

  const falseSignals =
    completed.filter(
      (signal) =>
        signal.result ===
        "FALSE"
    ).length;

  const mixed =
    completed.filter(
      (signal) =>
        signal.result ===
        "MIXED"
    ).length;

  return {
    total:
      completed.length,

    success,

    falseSignals,

    mixed,

    accuracy:
      (
        success /
        completed.length
      ) * 100,

    average5m:
      average(
        completed.map(
          (signal) =>
            safeNumber(
              signal.change5m
            )
        )
      ),

    average10m:
      average(
        completed.map(
          (signal) =>
            safeNumber(
              signal.change10m
            )
        )
      ),

    average15m:
      average(
        completed.map(
          (signal) =>
            safeNumber(
              signal.change15m
            )
        )
      ),

    averageBest:
      average(
        completed.map(
          (signal) =>
            safeNumber(
              signal.bestMovePct
            )
        )
      ),

    averageWorst:
      average(
        completed.map(
          (signal) =>
            safeNumber(
              signal.worstMovePct
            )
        )
      ),
  };
}

/* ============================================================
   TUNING OBSERVATION

   We do NOT auto-change architecture
   from only a few signals.

   Wait minimum completed samples.
============================================================ */

async function maybeSuggestGRTTuning() {
  const stats =
    getGRTBuyNowPerformance();

  if (
    stats.total <
    GRT_TUNING_MIN_COMPLETED_SIGNALS
  ) {
    return;
  }

  if (
    stats.total ===
    LAST_TUNING_SUGGESTION_COUNT
  ) {
    return;
  }

  LAST_TUNING_SUGGESTION_COUNT =
    stats.total;

  saveGRTBuyNowHistory();

  console.log(
    `GRT LEARNING: ${stats.total} samples, accuracy ${stats.accuracy.toFixed(
      1
    )}%`
  );
}

/* ============================================================
   /BUYTEST
============================================================ */

bot.onText(
  /\/buytest/i,
  async (msg) => {
    const stats =
      getGRTBuyNowPerformance();

    await replyTelegram(
      msg.chat.id,
      `🧪 GRT BUY NOW TEST

Completed:
${stats.total}

✅ Success:
${stats.success}

❌ False:
${stats.falseSignals}

➖ Mixed:
${stats.mixed}

🎯 Success Rate:
${stats.accuracy.toFixed(
        1
      )}%

📈 Average +5M:
${formatPercent(
        stats.average5m
      )}

📈 Average +10M:
${formatPercent(
        stats.average10m
      )}

📈 Average +15M:
${formatPercent(
        stats.average15m
      )}

🚀 Average Best Move:
${formatPercent(
        stats.averageBest
      )}

⚠️ Average Worst Move:
${formatPercent(
        stats.averageWorst
      )}`
    );
  }
);

/* ============================================================
   /BUYLAST
============================================================ */

bot.onText(
  /\/buylast/i,
  async (msg) => {
    const signal =
      GRT_BUY_NOW_HISTORY[
        GRT_BUY_NOW_HISTORY.length -
          1
      ];

    if (
      !signal
    ) {
      await replyTelegram(
        msg.chat.id,
        "⚠️ Belum ada GRT BUY NOW record."
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      `🧪 LATEST GRT BUY NOW

ID:
${signal.id}

Entry:
RM${formatPrice(
        "GRT",
        signal.entryPrice
      )}

Phase:
${signal.phase}

Reason:
${signal.reason}

Score:
${signal.score}

BUY Volume:
${safeNumber(
        signal.buyVolumePct
      ).toFixed(
        1
      )}%

BUY Frequency:
${safeNumber(
        signal.buyFrequencyPct
      ).toFixed(
        1
      )}%

Sustained:
${signal.sustained
  ? "YES"
  : "NO"}

Acceleration:
${signal.accelerating
  ? "YES"
  : "NO"}

Result:
${signal.result}

Best:
${formatPercent(
        signal.bestMovePct
      )}

Worst:
${formatPercent(
        signal.worstMovePct
      )}`
    );
  }
);

/* ============================================================
   /TUNING
============================================================ */

bot.onText(
  /\/tuning/i,
  async (msg) => {
    const stats =
      getGRTBuyNowPerformance();

    await replyTelegram(
      msg.chat.id,
      `🧠 GRT LEARNING STATUS

Mode:
OBSERVATION

Completed Samples:
${stats.total}

Minimum Before Evaluation:
${GRT_TUNING_MIN_COMPLETED_SIGNALS}

Success Rate:
${stats.accuracy.toFixed(
        1
      )}%

📌 Current rebuild does NOT silently change major momentum thresholds from a small sample.

Learning data is used to evaluate future tuning safely.`
    );
  }
);

/* ============================================================
   DAILY WATCH SAVE / LOAD
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
  } catch (
    error
  ) {
    console.log(
      "Daily watch save:",
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

    LAST_DAILY_REPORT_KEY =
      parsed.lastReportKey ||
      null;
  } catch (
    error
  ) {
    console.log(
      "Daily watch load:",
      error.message
    );
  }
}

/* ============================================================
   FINALIZE DAILY SUMMARY
============================================================ */

function finalizeDailySummary(
  state
) {
  if (
    !state
  ) {
    return null;
  }

  const totalExecutions =
    state.buyExecutions +
    state.sellExecutions;

  const totalVolume =
    state.buyVolume +
    state.sellVolume;

  const buyFrequencyPct =
    totalExecutions >
      0
      ? (
          state.buyExecutions /
          totalExecutions
        ) * 100
      : 0;

  const sellFrequencyPct =
    totalExecutions >
      0
      ? (
          state.sellExecutions /
          totalExecutions
        ) * 100
      : 0;

  const buyVolumePct =
    totalVolume >
      0
      ? (
          state.buyVolume /
          totalVolume
        ) * 100
      : 0;

  const sellVolumePct =
    totalVolume >
      0
      ? (
          state.sellVolume /
          totalVolume
        ) * 100
      : 0;

  const priceChangePct =
    state.grtOpen &&
    state.grtClose
      ? percentChange(
          state.grtOpen,
          state.grtClose
        )
      : 0;

  const previous =
    GRT_DAILY_HISTORY[
      GRT_DAILY_HISTORY.length -
        1
    ] ||
    null;

  let priceTrend =
    "SIDEWAY";

  if (
    priceChangePct >=
    1
  ) {
    priceTrend =
      "NAIK KUAT";
  } else if (
    priceChangePct >
    0
  ) {
    priceTrend =
      "NAIK";
  } else if (
    priceChangePct <=
    -1
  ) {
    priceTrend =
      "TURUN KUAT";
  } else if (
    priceChangePct <
    0
  ) {
    priceTrend =
      "TURUN";
  }

  let buyTrend =
    "SEIMBANG";

  if (
    buyFrequencyPct >=
    60
  ) {
    buyTrend =
      "BUY ACTIVITY KUAT";
  } else if (
    buyFrequencyPct >=
    52
  ) {
    buyTrend =
      "BUY ACTIVITY POSITIF";
  } else if (
    sellFrequencyPct >=
    60
  ) {
    buyTrend =
      "SELL ACTIVITY KUAT";
  }

  let sevenDayTrend =
    "DATA BUILDING";

  if (
    GRT_DAILY_HISTORY.length >=
    2
  ) {
    const recent =
      GRT_DAILY_HISTORY.slice(
        -GRT_DAILY_HISTORY_DAYS
      );

    const positiveDays =
      recent.filter(
        (item) =>
          safeNumber(
            item.priceChangePct
          ) >
          0
      ).length;

    sevenDayTrend =
      positiveDays >=
        Math.ceil(
          recent.length *
            0.6
        )
        ? "IMPROVING"
        : positiveDays <=
            Math.floor(
              recent.length *
                0.4
            )
          ? "WEAKENING"
          : "MIXED";
  }

  let momentum =
    "NEUTRAL";

  if (
    priceChangePct >
      0 &&
    buyFrequencyPct >=
      55
  ) {
    momentum =
      "POSITIVE";
  }

  if (
    priceChangePct >=
      2 &&
    buyFrequencyPct >=
      60
  ) {
    momentum =
      "STRONG POSITIVE";
  }

  if (
    priceChangePct <
      0 &&
    sellFrequencyPct >=
      55
  ) {
    momentum =
      "NEGATIVE";
  }

  return {
    ...state,

    buyFrequencyPct,

    sellFrequencyPct,

    buyVolumePct,

    sellVolumePct,

    priceChangePct,

    priceTrend,

    buyTrend,

    sevenDayTrend,

    momentum,

    previousDateKey:
      previous
        ?.dateKey ||
      null,
  };
}

/* ============================================================
   CANDLE WINDOW STATS
============================================================ */

function calculateCandleWindowStats(
  candles
) {
  if (
    !Array.isArray(
      candles
    ) ||
    !candles.length
  ) {
    return null;
  }

  const sorted = [
    ...candles,
  ].sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  const open =
    sorted[0].open;

  const close =
    sorted[
      sorted.length -
        1
    ].close;

  return {
    open,

    close,

    high:
      Math.max(
        ...sorted.map(
          (candle) =>
            candle.high
        )
      ),

    low:
      Math.min(
        ...sorted.map(
          (candle) =>
            candle.low
        )
      ),

    volume:
      sorted.reduce(
        (
          total,
          candle
        ) =>
          total +
          safeNumber(
            candle.volume
          ),
        0
      ),

    changePct:
      percentChange(
        open,
        close
      ),

    candleCount:
      sorted.length,
  };
}

/* ============================================================
   GRT TRUE ROLLING 24H

   Use 5M Luno candles.
============================================================ */

async function getGRT24hMarketWindows() {
  const candles =
    await getLunoCandles(
      "GRT",
      300,
      600
    );

  if (
    !candles.length
  ) {
    return null;
  }

  const now =
    Date.now();

  const currentStart =
    now -
    TWENTY_FOUR_HOURS;

  const previousStart =
    now -
    2 *
      TWENTY_FOUR_HOURS;

  const currentCandles =
    candles.filter(
      (candle) =>
        candle.timestamp >=
          currentStart &&
        candle.timestamp <=
          now
    );

  const previousCandles =
    candles.filter(
      (candle) =>
        candle.timestamp >=
          previousStart &&
        candle.timestamp <
          currentStart
    );

  const current =
    calculateCandleWindowStats(
      currentCandles
    );

  const previous =
    calculateCandleWindowStats(
      previousCandles
    );

  if (
    !current
  ) {
    return null;
  }

  const comparison =
    previous
      ? {
          ready:
            true,

          highChangePct:
            percentChange(
              previous.high,
              current.high
            ),

          lowChangePct:
            percentChange(
              previous.low,
              current.low
            ),

          volumeChangePct:
            percentChange(
              previous.volume,
              current.volume
            ),
        }
      : {
          ready:
            false,
        };

  const snapshot = {
    timestamp:
      now,

    current,

    previous,

    comparison,
  };

  GRT_24H_PREVIOUS_SNAPSHOT =
    snapshot;

  saveGRT24hSnapshot(
    snapshot
  );

  return snapshot;
}

/* ============================================================
   BTC ROLLING 24H
============================================================ */

async function getBTC24hMarketStats() {
  const candles =
    await getLunoCandles(
      "BTC",
      300,
      320
    );

  if (
    !candles.length
  ) {
    return null;
  }

  const cutoff =
    Date.now() -
    TWENTY_FOUR_HOURS;

  const rolling =
    candles.filter(
      (candle) =>
        candle.timestamp >=
        cutoff
    );

  return calculateCandleWindowStats(
    rolling
  );
}

/* ============================================================
   24H COMPARISON DISPLAY
============================================================ */

function format24hComparison(
  value
) {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "";
  }

  return ` (${formatPercent(
    value
  )} vs previous 24H)`;
}

/* ============================================================
   GRT VS BTC RELATIVE STRENGTH
============================================================ */

function getBTCGRTRelationship({
  grtChangePct,
  btcChangePct,
}) {
  const outperformance =
    grtChangePct -
    btcChangePct;

  if (
    grtChangePct >
      0 &&
    btcChangePct <
      0 &&
    outperformance >=
      2
  ) {
    return {
      strength:
        "GRT STRONG VS BTC",

      rotation:
        "POSSIBLE ALTCOIN ROTATION",

      description:
        "GRT naik ketika BTC melemah.",
    };
  }

  if (
    grtChangePct >
      0 &&
    btcChangePct <=
      0
  ) {
    return {
      strength:
        "GRT OUTPERFORMING BTC",

      rotation:
        "ROTATION WATCH",

      description:
        "GRT bertahan / naik ketika BTC lemah atau sideway.",
    };
  }

  if (
    outperformance >=
      1 &&
    grtChangePct >
      btcChangePct
  ) {
    return {
      strength:
        "GRT OUTPERFORMING BTC",

      rotation:
        "RELATIVE STRENGTH POSITIVE",

      description:
        "GRT bergerak lebih kuat daripada BTC.",
    };
  }

  if (
    btcChangePct >
      0 &&
    grtChangePct <
      0
  ) {
    return {
      strength:
        "GRT WEAK VS BTC",

      rotation:
        "NO CLEAR ROTATION INTO GRT",

      description:
        "BTC naik tetapi GRT masih lemah.",
    };
  }

  if (
    grtChangePct <
      0 &&
    btcChangePct <
      0
  ) {
    return {
      strength:
        outperformance >
          0
          ? "GRT LESS WEAK THAN BTC"
          : "GRT WEAK WITH BTC",

      rotation:
        "RISK-OFF / NO CLEAR ROTATION",

      description:
        "BTC dan GRT masih berada dalam tekanan.",
    };
  }

  return {
    strength:
      Math.abs(
        outperformance
      ) <
        0.5
        ? "GRT TRACKING BTC"
        : outperformance >
            0
          ? "GRT SLIGHTLY STRONGER"
          : "GRT SLIGHTLY WEAKER",

    rotation:
      "NO STRONG ROTATION SIGNAL",

    description:
      "Belum ada divergence kuat antara GRT dan BTC.",
  };
}

/* ============================================================
   BUILD GRT DAILY REPORT

   Goal:
   short enough to read,
   enough data to see:
   - daily trend
   - trade frequency
   - volume
   - GRT vs BTC
   - possible rotation
============================================================ */

async function buildGRTDailyReport(
  summary,
  live =
    false
) {
  const [
    market24h,
    btc24h,
  ] =
    await Promise.all([
      getGRT24hMarketWindows(),

      getBTC24hMarketStats(),
    ]);

  let marketSection =
    `📊 LUNO ROLLING 24H
DATA UNAVAILABLE`;

  if (
    market24h?.current
  ) {
    const current =
      market24h.current;

    const comparison =
      market24h.comparison;

    marketSection =
      `📊 LUNO ROLLING 24H

24H CHANGE:
${formatPercent(
        current.changePct
      )}

HIGH:
RM${formatPrice(
        "GRT",
        current.high
      )}${comparison.ready
        ? format24hComparison(
            comparison.highChangePct
          )
        : ""}

LOW:
RM${formatPrice(
        "GRT",
        current.low
      )}${comparison.ready
        ? format24hComparison(
            comparison.lowChangePct
          )
        : ""}

VOLUME:
${formatFullVolume(
        current.volume
      )} GRT${comparison.ready
        ? format24hComparison(
            comparison.volumeChangePct
          )
        : ""}`;
  }

  let relationship =
    null;

  if (
    market24h
      ?.current &&
    btc24h
  ) {
    relationship =
      getBTCGRTRelationship({
        grtChangePct:
          market24h.current
            .changePct,

        btcChangePct:
          btc24h.changePct,
      });
  }

  const relationshipText =
    relationship
      ? `₿ GRT VS BTC

GRT:
${formatPercent(
          market24h
            .current
            .changePct
        )}

BTC:
${formatPercent(
          btc24h.changePct
        )}

Relative Strength:
${formatPercent(
          market24h
            .current
            .changePct -
          btc24h.changePct
        )}

🧠 ${relationship.strength}
🔄 ${relationship.rotation}`
      : `₿ GRT VS BTC

VALIDATING`;

  return `🌙 GRT 24H DAILY REPORT

${formatMalaysiaDateLabel(
    summary.dateKey
  )}

${live
  ? "LIVE REPORT"
  : "DAILY CLOSE — 12AM MALAYSIA"}

${marketSection}

━━━━━━━━━━━━━━

🧾 TRADE FREQUENCY

🟢 BUY:
${summary.buyFrequencyPct.toFixed(
    1
  )}%

🔴 SELL:
${summary.sellFrequencyPct.toFixed(
    1
  )}%

📦 EXECUTED VOLUME

🟢 BUY:
${formatLargeNumber(
    summary.buyVolume
  )} — ${summary.buyVolumePct.toFixed(
    1
  )}%

🔴 SELL:
${formatLargeNumber(
    summary.sellVolume
  )} — ${summary.sellVolumePct.toFixed(
    1
  )}%

━━━━━━━━━━━━━━

${relationshipText}

━━━━━━━━━━━━━━

📈 DAY TREND:
${summary.priceTrend}

🧾 BUY ACTIVITY:
${summary.buyTrend}

📅 MULTI-DAY:
${summary.sevenDayTrend}

🧠 GRT MOMENTUM:
${summary.momentum}

🔄 ALTCOIN ROTATION:
${relationship
  ? relationship.rotation
  : "VALIDATING"}`;
}

/* ============================================================
   DAILY ROLLOVER

   Malaysia date changes at 12:00 AM.

   First check after midnight sends
   previous day's report.
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
    LAST_DAILY_REPORT_KEY !==
    state.dateKey
  ) {
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
        await buildGRTDailyReport(
          summary,
          false
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
  }

  GRT_DAILY_STATE =
    createDailyWatchState(
      today
    );

  saveDailyWatchSnapshot();
}

/* ============================================================
   CURRENT /GRT24 REPORT
============================================================ */

async function buildCurrentGRTDailyReport() {
  const state =
    ensureDailyWatchState();

  const [
    grt,
    btc,
  ] =
    await Promise.all([
      getTicker(
        "GRT"
      ),

      getTicker(
        "BTC"
      ),
    ]);

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

  return await buildGRTDailyReport(
    summary,
    true
  );
}

/* ============================================================
   /MOMENTUM
============================================================ */

bot.onText(
  /\/momentum/i,
  async (msg) => {
    const [
      btc,
      grt,
    ] =
      await Promise.all([
        getTicker(
          "BTC"
        ),

        getTicker(
          "GRT"
        ),
      ]);

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

    const [
      btcMomentum,
      grtMomentum,
    ] =
      await Promise.all([
        getBTCBuySurge(),

        getGRTMomentumDecision(
          grt
        ),
      ]);

    await replyTelegram(
      msg.chat.id,
      `📡 MOMENTUM CHECK

₿ BTC
RM${formatPrice(
        "BTC",
        btc.currentPrice
      )}

⚡ ${btcMomentum.text}

━━━━━━━━━━━━━━

🪙 GRT
RM${formatPrice(
        "GRT",
        grt.currentPrice
      )}

${buildGRTMomentumAlertText(
        grtMomentum
      )}

🧠 Score:
${safeNumber(
        grtMomentum.score
      )}

📌 Reason:
${grtMomentum.reason || grtMomentum.phase || "VALIDATING"}`
    );
  }
);

/* ============================================================
   /STRUCTURE
============================================================ */

bot.onText(
  /\/structure/i,
  async (msg) => {
    const sections =
      [];

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

    await replyTelegram(
      msg.chat.id,
      sections.length
        ? `📊 MARKET STRUCTURE UPDATE

${sections.join(
  "\n━━━━━━━━━━━━━━━━━━\n"
)}`
        : "⚠️ Market structure data unavailable."
    );
  }
);

/* ============================================================
   /FLOW
============================================================ */

bot.onText(
  /\/flow(?:\s+(BTC|GRT))?/i,
  async (
    msg,
    match
  ) => {
    const requested =
      match?.[1]
        ?.toUpperCase();

    const coins =
      requested
        ? [
            requested,
          ]
        : CORE_COINS;

    const sections =
      [];

    for (
      const coin of
      coins
    ) {
      const data =
        await analyze2HMarketCondition(
          coin
        );

      if (
        !data
      ) {
        sections.push(
          `${coin}: DATA BELUM CUKUP`
        );

        continue;
      }

      sections.push(
        `${coin}: ${data.action}

BUY Volume:
${data.buyVolumePct.toFixed(
          1
        )}%

SELL Volume:
${data.sellVolumePct.toFixed(
          1
        )}%

BUY Frequency:
${data.buyFrequencyPct.toFixed(
          1
        )}%

SELL Frequency:
${data.sellFrequencyPct.toFixed(
          1
        )}%

Price 2H:
${formatPercent(
          data.priceChangePct
        )}`
      );
    }

    await replyTelegram(
      msg.chat.id,
      `🧠 2H BACKGROUND

${sections.join(
  "\n\n━━━━━━━━━━━━━━\n\n"
)}`
    );
  }
);

/* ============================================================
   /GRT24
============================================================ */

bot.onText(
  /\/grt24/i,
  async (msg) => {
    const report =
      await buildCurrentGRTDailyReport();

    await replyTelegram(
      msg.chat.id,
      report ||
        "⚠️ GRT daily data unavailable."
    );
  }
);

/* ============================================================
   /STATUS
============================================================ */

bot.onText(
  /\/status/i,
  async (msg) => {
    const candleAuth =
      LUNO_API_KEY_ID &&
      LUNO_API_KEY_SECRET
        ? "CONFIGURED"
        : "NOT CONFIGURED";

    await replyTelegram(
      msg.chat.id,
      `✅ BOT ACTIVE

📡 PRICE ALERT:
5 MIN

📊 MARKET STRUCTURE:
15 MIN

🚀 SCALPING SCAN:
1 MIN

━━━━━━━━━━━━━━

🪙 GRT ENGINE:

ACCUMULATION
→ EARLY MOMENTUM
→ ACCELERATION
→ BUY NOW

⏱ VALIDATION MAX:
${(
  GRT_VALIDATION_MAX_MS /
  60000
).toFixed(
        0
      )} MIN

🧱 RESISTANCE:

1–3/10:
WEAK — NO ENTRY BLOCK

4–6/10:
CAUTION

7–10/10:
FULL BREAKOUT VALIDATION

🧠 2H:
CONTEXT / MODIFIER

Hard Block:
ONLY STRONG BEARISH EVIDENCE

🎯 TP ENGINE:
DYNAMIC PROJECTED REACH

TP1:
CURRENT REASONABLE REACH

TP2:
CONDITIONAL EXTENDED REACH

📡 POST-ENTRY GRT:
HOLD / CAUTION / EXIT EARLY

🪙 /grthold:
ACTIVE

🌙 GRT 24H:
12AM → 12AM MALAYSIA

🧪 BUY NOW LEARNING:
ACTIVE

Learning Records:
${GRT_BUY_NOW_HISTORY.length}

🔐 Luno Candle API:
${candleAuth}

📈 Active Trades:
${
  Object.keys(
    ACTIVE_TRADES
  ).length
    ? Object.keys(
        ACTIVE_TRADES
      ).join(
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

      grtEngine: {
        accumulation:
          true,

        earlyMomentum:
          true,

        acceleration:
          true,

        sustainedMove:
          true,

        validationMaxMinutes:
          GRT_VALIDATION_MAX_MS /
          60000,

        weakResistanceBlocks:
          false,

        twoHourHardGate:
          false,

        projectedReach:
          true,

        postEntrySustainedWatch:
          true,

        manualHold:
          true,
      },

      learning: {
        records:
          GRT_BUY_NOW_HISTORY.length,

        completed:
          getCompletedGRTBuyNowSignals()
            .length,
      },

      activeTrades:
        Object.keys(
          ACTIVE_TRADES
        ),

      pendingEntries:
        Object.keys(
          PENDING_ENTRIES
        ),
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

    return res.json({
      ready:
        Boolean(
          ticker
        ),

      data:
        ticker,
    });
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
            "BTC or GRT only",
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
            "Ticker unavailable",
        });
    }

    if (
      coin ===
      "BTC"
    ) {
      return res.json(
        await getBTCBuySurge()
      );
    }

    return res.json(
      await getGRTMomentumDecision(
        ticker
      )
    );
  }
);

/* ============================================================
   STRUCTURE ENDPOINT
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
   BUY LEARNING ENDPOINT
============================================================ */

app.get(
  "/buytest",
  (
    req,
    res
  ) => {
    res.json({
      stats:
        getGRTBuyNowPerformance(),

      history:
        GRT_BUY_NOW_HISTORY,
    });
  }
);

/* ============================================================
   GRT 24H ENDPOINT
============================================================ */

app.get(
  "/grt24",
  async (
    req,
    res
  ) => {
    const data =
      await getGRT24hMarketWindows();

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
   GRT HOLD ENDPOINT

   Example:
   /grthold?entry=0.0691&quantity=20000
============================================================ */

app.get(
  "/grthold",
  async (
    req,
    res
  ) => {
    const entryPrice =
      Number(
        req.query.entry
      );

    const quantity =
      Number(
        req.query.quantity
      );

    if (
      !Number.isFinite(
        entryPrice
      ) ||
      entryPrice <=
        0 ||
      !Number.isFinite(
        quantity
      ) ||
      quantity <=
        0
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            "Use ?entry=0.0691&quantity=20000",
        });
    }

    const data =
      await analyzeManualGRTHold({
        entryPrice,

        quantity,
      });

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
      ) ||
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
            "Use BTC/GRT and duration 300/3600",
        });
    }

    const candles =
      await getLunoCandles(
        coin,
        duration,
        duration ===
          300
          ? 100
          : 70
      );

    return res.json({
      coin,

      duration,

      count:
        candles.length,

      candles,
    });
  }
);
/* ============================================================
   DEBUG GRT EXECUTED TRADES

   Purpose:
   Check whether recent Luno executed trades
   are being classified as BUY or SELL.

   Temporary diagnostic endpoint.
============================================================ */

app.get(
  "/debug/grttrades",
  async (
    req,
    res
  ) => {
    const trades =
      await getRecentTrades(
        "GRT",
        Date.now() -
          60 *
            60 *
            1000
      );

    const buyTrades =
      trades.filter(
        (trade) =>
          trade.isBuy
      );

    const sellTrades =
      trades.filter(
        (trade) =>
          !trade.isBuy
      );

    res.json({
      count:
        trades.length,

      buyCount:
        buyTrades.length,

      sellCount:
        sellTrades.length,

      buyFrequencyPct:
        trades.length >
          0
          ? (
              buyTrades.length /
              trades.length
            ) *
            100
          : 0,

      sellFrequencyPct:
        trades.length >
          0
          ? (
              sellTrades.length /
              trades.length
            ) *
            100
          : 0,

      latestTrades:
        trades.slice(
          -20
        ),
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

    /* ========================================================
       LOAD STORED DATA
    ======================================================== */

    loadDailyWatchSnapshot();

    loadGRTBuyNowHistory();

    loadGRTTuning();

    loadGRT24hSnapshot();

    ensureDailyWatchState();

    /* ========================================================
       PRIME EXECUTED DATA
    ======================================================== */

    await backfillTradeHistory();

    await collectTradeHistory();

    await updateMemory();

    /*
      Run memory twice with a small delay
      so startup has more than one point.
    */

    await sleep(
      3000
    );

    await updateMemory();

    /* ========================================================
       CANDLE API TEST
    ======================================================== */

    let candleStatus =
      "NOT CONFIGURED";

    if (
      LUNO_API_KEY_ID &&
      LUNO_API_KEY_SECRET
    ) {
      const test =
        await getLunoCandles(
          "GRT",
          300,
          5
        );

      if (
        test.length
      ) {
        candleStatus =
          "ACTIVE";

        console.log(
          `LUNO CANDLE API READY — ${test.length} candles`
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
        !ticker
      ) {
        continue;
      }

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

    /* ========================================================
       24H TEST
    ======================================================== */

    const market24h =
      await getGRT24hMarketWindows();

    if (
      market24h?.current
    ) {
      console.log(
        `GRT 24H READY — HIGH ${market24h.current.high} LOW ${market24h.current.low}`
      );
    }

    /* ========================================================
       ONLINE MESSAGE
    ======================================================== */

    await sendTelegram(
      `✅ BOT ONLINE

🚀 INSTITUTIONAL SCALPING TERMINAL ACTIVE

📡 PRICE ALERT:
5 MIN

📊 MARKET STRUCTURE:
15 MIN

🔎 SCALPING SCAN:
1 MIN

━━━━━━━━━━━━━━

🪙 GRT EARLY ENGINE:

ACCUMULATION
→ EARLY MOMENTUM
→ ACCELERATION
→ BUY NOW

⏱ VALIDATING MAX:
${(
  GRT_VALIDATION_MAX_MS /
  60000
).toFixed(
        0
      )} MIN

🧱 RESISTANCE FILTER:

1–3/10
WEAK — NO BLOCK

4–6/10
CAUTION

7–10/10
FULL BREAKOUT VALIDATION

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

━━━━━━━━━━━━━━

🎯 GRT PROJECTED REACH:

TP1
CURRENT REASONABLE REACH

TP2
CONDITIONAL EXTENDED REACH

📡 POST-ENTRY:
HOLD / CAUTION / EXIT EARLY

🪙 /grthold:
ACTIVE

🌙 24H GRT:
12AM → 12AM MALAYSIA

🧪 BUY NOW LEARNING:
ACTIVE

🧠 2H:
BACKGROUND / MODIFIER

🔐 LUNO CANDLE API:
${candleStatus}`
    );

    await checkDailyWatchRollover();

    saveDailyWatchSnapshot();

    saveGRTBuyNowHistory();
  }
);

/* ============================================================
   SCHEDULERS
============================================================ */

/* ============================================================
   EXECUTED TRADES — 5 SEC
============================================================ */

setInterval(
  () => {
    collectTradeHistory()
      .catch(
        (error) =>
          console.log(
            "Trade collector interval:",
            error.message
          )
      );
  },
  TRADE_COLLECT_INTERVAL
);

/* ============================================================
   PRICE MEMORY — 15 SEC
============================================================ */

setInterval(
  () => {
    updateMemory()
      .catch(
        (error) =>
          console.log(
            "Price memory interval:",
            error.message
          )
      );
  },
  PRICE_MEMORY_INTERVAL
);

/* ============================================================
   ACTIVE TRADE MONITOR — 15 SEC
============================================================ */

setInterval(
  () => {
    monitorTrades()
      .catch(
        (error) =>
          console.log(
            "Trade monitor interval:",
            error.message
          )
      );
  },
  TRADE_MONITOR_INTERVAL
);

/* ============================================================
   GRT + GENERAL SCANNER — 1 MIN
============================================================ */

setInterval(
  () => {
    scanSignals()
      .catch(
        (error) =>
          console.log(
            "Scalping scan interval:",
            error.message
          )
      );
  },
  SCALPING_SCAN_INTERVAL
);

/* ============================================================
   BUY NOW LEARNING — 1 MIN
============================================================ */

setInterval(
  () => {
    monitorGRTBuyNowSignals()
      .catch(
        (error) =>
          console.log(
            "BUY NOW learning interval:",
            error.message
          )
      );
  },
  GRT_BUY_NOW_MONITOR_INTERVAL
);

/* ============================================================
   PRICE ALERT — 5 MIN
============================================================ */

setInterval(
  () => {
    sendPriceAlert()
      .catch(
        (error) =>
          console.log(
            "Price alert interval:",
            error.message
          )
      );
  },
  PRICE_ALERT_INTERVAL
);

/* ============================================================
   MARKET STRUCTURE — 15 MIN
============================================================ */

setInterval(
  () => {
    sendMarketStructure()
      .catch(
        (error) =>
          console.log(
            "Market structure interval:",
            error.message
          )
      );
  },
  MARKET_STRUCTURE_INTERVAL
);

/* ============================================================
   12AM MALAYSIA DAILY ROLLOVER CHECK
============================================================ */

setInterval(
  () => {
    checkDailyWatchRollover()
      .catch(
        (error) =>
          console.log(
            "Daily rollover interval:",
            error.message
          )
      );
  },
  DAILY_WATCH_CHECK_INTERVAL
);

/* ============================================================
   SAVE DAILY STATE
============================================================ */

setInterval(
  saveDailyWatchSnapshot,
  DAILY_WATCH_SAVE_INTERVAL
);

/* ============================================================
   SAVE LEARNING STATE
============================================================ */

setInterval(
  saveGRTBuyNowHistory,
  60 *
    1000
);
