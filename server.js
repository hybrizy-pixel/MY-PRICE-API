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

const GRT_EARLY_MIN_BUY_VOLUME_PCT = 52;
const GRT_EARLY_MIN_PRICE_RESPONSE_PCT = 0.03;
const GRT_BUY_NOW_COOLDOWN_MS = 15 * 60 * 1000;

const GRT_BUY_NOW_HISTORY_LIMIT = 250;
const GRT_BUY_NOW_SUCCESS_PCT = 0.30;
const GRT_BUY_NOW_FALSE_PCT = -0.30;
const GRT_BUY_NOW_MONITOR_INTERVAL = 60 * 1000;
const GRT_TUNING_MIN_COMPLETED_SIGNALS = 20;

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
      currentPrice <= 0
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
    totalVolume > 0
      ? (
          buyVolume /
          totalVolume
        ) * 100
      : 0;

  const sellVolumePct =
    totalVolume > 0
      ? (
          sellVolume /
          totalVolume
        ) * 100
      : 0;

  const buyFrequencyPct =
    totalCount > 0
      ? (
          buyCount /
          totalCount
        ) * 100
      : 0;

  const sellFrequencyPct =
    totalCount > 0
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
    let i = 1;
    i <= period;
    i++
  ) {
    const change =
      closes[i] -
      closes[
        i - 1
      ];

    if (
      change >= 0
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
      period + 1;
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
      change > 0
        ? change
        : 0;

    const loss =
      change < 0
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
    ma50 > 0
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

  const windows = [];

  for (
    let index =
      numberOfWindows;
    index >= 1;
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

   IMPORTANT:
   We compare CURRENT EXECUTED BUY volume
   against previous completed 5M BUY volumes.

   We no longer treat total volume alone
   as a positive momentum signal.
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

  /*
    Candle volume from Luno does not tell
    BUY vs SELL direction.

    Therefore authenticated candles are used
    only as a secondary total-volume reference.

    Positive BUY surge must still come from
    executed trades collected by the bot.
  */

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

  /*
    BUY baseline needs at least 3 local windows.
    Total-volume baseline may come from Luno candles.
  */

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
  const clusters = [];

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

        /*
          Nearby walls matter more.
        */

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

  if (
    resistance
  ) {
    if (
      resistance.distancePct <=
        0.20 &&
      resistance.rating >=
        7
    ) {
      resistanceBlocking =
        true;
    }

    if (
      resistance.distancePct <=
        0.35 &&
      resistance.rating >=
        8
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

    support,
    resistance,

    bidLiquidityPct:
      structure.bidLiquidityPct,

    askLiquidityPct:
      structure.askLiquidityPct,

    structure,
  };
}

/* ============================================================
   BTC BUY SURGE RADAR

   BTC IS NOT A TRADE SIGNAL.

   Trigger only when:
   1. Executed BUY activity is unusually high.
   2. Buyer dominance is positive.
   3. Price starts responding positively.

   Large volume while price is falling
   is intentionally NOT announced.
============================================================ */

async function getBTCBuySurge() {
  const baseline =
    await getBuyVolumeBaseline(
      "BTC"
    );

  const priceResponse =
    getExecutedPriceResponse(
      "BTC",
      5 * 60 * 1000
    );

  if (
    !baseline.ready
  ) {
    return {
      status:
        "COLLECTING",

      text:
        "⚪ COLLECTING DATA",
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

  if (
    unusualBuy &&
    buyerDominant &&
    positivePrice
  ) {
    return {
      status:
        "BUY_SURGE",

      text:
        `🟢 BUY SURGE +${Math.max(
          0,
          buyIncreasePct
        ).toFixed(
          0
        )}%`,

      buyIncreasePct,

      buyVolumePct:
        current.buyVolumePct,

      priceResponsePct:
        priceResponse.changePct,
    };
  }

  return {
    status:
      "NO_SURGE",

    text:
      "🔴 NO BUY SURGE",

    buyIncreasePct,

    buyVolumePct:
      current.buyVolumePct,

    priceResponsePct:
      priceResponse.changePct,
  };
}

/* ============================================================
   GRT MOMENTUM RAW ANALYSIS

   This is the main 5M early-entry detector.

   IMPORTANT:
   - Abnormal volume alone is NOT enough.
   - SELL spike is ignored.
   - Price must show early positive response.
   - RSI / orderbook / MA are supporting filters.
============================================================ */

async function analyzeGRTMomentum(
  ticker
) {
  const [
    baseline,
    rsi,
    ma,
    liquidity,
  ] =
    await Promise.all([
      getBuyVolumeBaseline(
        "GRT"
      ),

      getGRT5mRSI(),

      getGRT1hMA(),

      getGRTLiquidityAnalysis(
        ticker.currentPrice
      ),
    ]);

  const priceResponse =
    getExecutedPriceResponse(
      "GRT",
      5 * 60 * 1000
    );

  if (
    !baseline.ready
  ) {
    return {
      ready:
        false,

      status:
        "COLLECTING",
    };
  }

  const flow =
    baseline.current;

  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );

  const unusualBuy =
    buyIncreasePct >=
    MOMENTUM_SPIKE_THRESHOLD_PCT;

  const positivePrice =
    priceResponse.ready &&
    priceResponse.changePct >=
      GRT_EARLY_MIN_PRICE_RESPONSE_PCT;

  const priceNotFalling =
    !priceResponse.ready ||
    priceResponse.changePct >=
      -0.02;

  const buyerDominant =
    flow.buyVolumePct >=
    GRT_EARLY_MIN_BUY_VOLUME_PCT;

  const buyerStrong =
    flow.buyVolumePct >=
    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT;

  const frequencySupport =
    flow.buyFrequencyPct >=
    52;

  const rsiImproving =
    rsi.ready &&
    (
      rsi.direction ===
        "RISING" ||
      (
        rsi.oversold &&
        rsi.change >
        0
      )
    );

  const rsiDanger =
    rsi.ready &&
    rsi.overbought &&
    rsi.direction ===
      "FALLING";

  const maSupport =
    !ma.ready ||
    ma.bullish ||
    ma.nearCross;

  const maStrongBearish =
    ma.ready &&
    !ma.bullish &&
    !ma.nearCross &&
    ma.gapPct <
      -0.50;

  const liquiditySupport =
    !liquidity.ready ||
    liquidity.supportive;

  const resistanceBlocking =
    liquidity.ready &&
    liquidity.resistanceBlocking;

  /*
    Hard veto conditions.
  */

  const sellDominant =
    flow.sellVolumePct >=
    60;

  const meaningfulPriceDrop =
    priceResponse.ready &&
    priceResponse.changePct <=
      -0.10;

  const hardVeto =
    sellDominant ||
    meaningfulPriceDrop ||
    resistanceBlocking ||
    rsiDanger;

  /*
    Positive confluence scoring.

    This is deliberately NOT 6/6 rigid.
  */

  let score =
    0;

  if (
    unusualBuy
  ) {
    score +=
      2;
  }

  if (
    buyerStrong
  ) {
    score +=
      2;
  } else if (
    buyerDominant
  ) {
    score +=
      1;
  }

  if (
    frequencySupport
  ) {
    score +=
      1;
  }

  if (
    positivePrice
  ) {
    score +=
      2;
  } else if (
    priceNotFalling
  ) {
    score +=
      1;
  }

  if (
    rsiImproving
  ) {
    score +=
      1;
  }

  if (
    maSupport
  ) {
    score +=
      1;
  }

  if (
    liquiditySupport
  ) {
    score +=
      1;
  }

  /*
    VERIFYING BUY:
    early positive setup.

    BUY NOW:
    stronger confluence + positive price response.

    BUY NOW still needs user visual confirmation
    on the Luno chart.
  */

  const verifyingBuy =
    !hardVeto &&
    unusualBuy &&
    buyerDominant &&
    priceNotFalling &&
    score >=
      5;

  let buyNowThreshold =
    8;

  if (
    ma.ready &&
    ma.bullish
  ) {
    buyNowThreshold =
      7;
  }

  const buyNow =
    verifyingBuy &&
    positivePrice &&
    buyerStrong &&
    score >=
      buyNowThreshold &&
    !maStrongBearish;

  let status =
    "NO_ENTRY";

  if (
    verifyingBuy
  ) {
    status =
      "VERIFYING";
  }

  if (
    buyNow
  ) {
    status =
      "BUY_NOW";
  }

  return {
    ready:
      true,

    status,

    score,

    buyNow,

    verifyingBuy,

    hardVeto,

    unusualBuy,

    buyIncreasePct,

    flow,

    priceResponse,

    rsi,

    ma,

    liquidity,

    reasons: {
      buyerDominant,
      buyerStrong,
      frequencySupport,
      positivePrice,
      priceNotFalling,
      rsiImproving,
      maSupport,
      liquiditySupport,
      sellDominant,
      meaningfulPriceDrop,
      resistanceBlocking,
      rsiDanger,
      maStrongBearish,
    },
  };
}

/* ============================================================
   GRT MOMENTUM DISPLAY DECISION
============================================================ */

async function getGRTMomentumDecision(
  ticker
) {
  const analysis =
    await analyzeGRTMomentum(
      ticker
    );

  if (
    !analysis.ready
  ) {
    return {
      status:
        "COLLECTING",

      momentumText:
        "⚪ COLLECTING DATA",

      actionText:
        "",

      analysis,
    };
  }

  if (
    analysis.status ===
    "BUY_NOW"
  ) {
    return {
      status:
        "BUY_NOW",

      momentumText:
        "🟢 BUY NOW",

      actionText:
        "",

      analysis,
    };
  }

  if (
    analysis.status ===
    "VERIFYING"
  ) {
    return {
      status:
        "VERIFYING",

      momentumText:
        "🟡 VERIFYING BUY...",

      actionText:
        "",

      analysis,
    };
  }

  return {
    status:
      "NO_ENTRY",

    momentumText:
      "🔴 NO ENTRY SIGNAL",

    actionText:
      "",

    analysis,
  };
}

/* ============================================================
   5M PRICE ALERT FORMAT

   BUY NOW trigger itself will be connected
   to Scalping Entry in a later PART.
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
        )}`
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
        )}`
      : "";

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
⚡ MOMENTUM: ${grtMomentum.momentumText}`
  );

  /*
    We call the dedicated BUY NOW handler
    only when the GRT momentum engine
    actually confirms BUY NOW.

    Function is defined in later PART.
  */

  if (
    grtMomentum.status ===
    "BUY_NOW"
  ) {
    await handleGRTBuyNowSignal(
      grt,
      grtMomentum.analysis
    );
  }
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
    return null;
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
    pressure.includes(
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

      return;
    }
  }

  BREAKOUT_WATCH[
    coin
  ] = {
    coin,

    resistance,

    resistanceRating,

    startedAt:
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
    resistance
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
      15 * 60 * 1000
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      60 * 60 * 1000
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
      15 * 60 * 1000
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

  const criteria =
    getMarketCriteria({
      coin,

      direction,

      pressure,

      resistance:
        resistance
          ?.price ||
        null,

      resistanceDistancePct:
        resistance
          ?.distancePct ??
        null,

      fakeBreakout,

      confirmedBreakout,
    });

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
        )} — ${data.resistanceRating}/10`
      : "N/A";

  return `🪙 ${data.coin}
💵 Harga Semasa: RM${formatPrice(
    data.coin,
    data.currentPrice
  )}
🟢 Support: ${supportText}
🔴 Resistance: ${resistanceText}
📈 Market: ${data.market}
⚡️ Tekanan: ${data.pressure}
🧠 Kriteria: ${data.criteria}`;
}

/* ============================================================
   MARKET STRUCTURE ALERT
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
  "\n━━━━━━━━━━━━━━━━━━\n"
)}`
  );
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
          a - b
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
      middle - 1
    ] +
    volumes[
      middle
    ]
  ) / 2;
}

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

   This function is called by collectTradeHistory()
   from PART 2.
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

  /* ========================================================
     EXECUTED ABOVE RESISTANCE
  ======================================================== */

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

    watch.failureScore =
      0;

    const enoughEvidence =
      (
        watch.aboveTradeCount >=
          2 &&
        watch.buyEvidence >=
          3
      ) ||
      watch.buyEvidence >=
        4;

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

        confirmedPrice:
          trade.price,

        entryBlocked:
          false,
      };

      /*
        Dedicated breakout scalping trigger
        is defined in a later PART.
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

  /* ========================================================
     STILL WITHIN NORMAL PULLBACK
  ======================================================== */

  if (
    trade.price >=
    failurePrice
  ) {
    return;
  }

  /* ========================================================
     FAILURE EVIDENCE
  ======================================================== */

  watch.failureScore +=
    trade.isBuy
      ? 1
      : 2;

  if (
    trade.price <=
      hardFailurePrice ||
    watch.failureScore >=
      2
  ) {
    LAST_FAKE_BREAKOUT[
      coin
    ] = {
      at:
        Date.now(),

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
   2H FLOW ANALYSIS
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

  const buyerDominant =
    flow.buyVolumePct >=
    55;

  const sellerDominant =
    flow.sellVolumePct >=
    55;

  let action =
    "CAUTION";

  if (
    buyerDominant &&
    price.ready &&
    price.changePct >
      0
  ) {
    action =
      "ALLOW";
  }

  if (
    sellerDominant &&
    price.ready &&
    price.changePct <
      0
  ) {
    action =
      "BLOCK";
  }

  if (
    buyerDominant &&
    price.ready &&
    price.changePct <
      -0.25
  ) {
    action =
      "BLOCK";
  }

  return {
    coin,

    action,

    buyVolumePct:
      flow.buyVolumePct,

    sellVolumePct:
      flow.sellVolumePct,

    buyFrequencyPct:
      flow.buyFrequencyPct,

    sellFrequencyPct:
      flow.sellFrequencyPct,

    priceChangePct:
      price.changePct,
  };
}

/* ============================================================
   2H SAFETY
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
   NEXT RESISTANCE
============================================================ */

async function findNextOrderBookResistance(
  coin,
  currentPrice
) {
  const structure =
    await getOrderBookStructure(
      coin,
      currentPrice
    );

  if (
    !structure ||
    !structure.askWalls
      ?.length
  ) {
    return null;
  }

  const candidates =
    structure.askWalls
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

  if (
    !candidates.length
  ) {
    return null;
  }

  const meaningful =
    candidates.find(
      (wall) =>
        wall.rating >=
          4 ||
        wall.ratio >=
          MIN_WALL_RELATIVE_RATIO
    );

  const selected =
    meaningful ||
    candidates[0];

  return {
    price:
      selected.price,

    volume:
      selected.volume,

    distancePct:
      percentChange(
        currentPrice,
        selected.price
      ),

    strength: {
      rating:
        selected.rating,

      ratio:
        selected.ratio,
    },
  };
}

/* ============================================================
   ROOM TO TP
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

  const defaultTarget =
    entryPrice *
    (
      1 +
      DEFAULT_BREAKOUT_TP_PCT[
        coin
      ] /
        100
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
        defaultTarget,

      reason:
        "NO STRONG WALL ABOVE",
    };
  }

  if (
    nextResistance
      .distancePct <
    MIN_GROSS_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      nextResistance,

      maxTargetPrice:
        null,

      reason:
        "ROOM TOO SMALL",
    };
  }

  if (
    nextResistance
      .distancePct <=
      1.00 &&
    nextResistance
      .strength
      .rating >=
      7
  ) {
    return {
      allowed:
        false,

      nextResistance,

      maxTargetPrice:
        null,

      reason:
        "STRONG RESISTANCE TOO CLOSE",
    };
  }

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

      maxTargetPrice,

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
   QUANTITY-AWARE LIMIT ENTRY
============================================================ */

async function chooseQuantityAwareLimitEntry({
  coin,
  technicalEntry,
  requiredQuantity,
}) {
  const book =
    await getTopOrderBook(
      coin
    );

  if (
    !book ||
    !book.asks.length
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
    book.asks
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
    book.asks
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
    Date.now();

  LAST_SIGNAL[
    candidate.coin
  ] =
    Date.now();

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
   MOMENTUM BUY NOW -> SCALPING ENTRY

   IMPORTANT:
   BUY NOW itself is still an EARLY technical signal.

   Before sending SCALPING ENTRY, this function re-checks:
   - Market Structure
   - 2H Safety
   - Orderbook room
   - Resistance
   - Entry chase
============================================================ */

async function triggerMomentumScalpingEntry(
  ticker,
  momentumAnalysis
) {
  const coin =
    "GRT";

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

  const structure =
    await analyzeMarketStructure(
      coin
    );

  if (
    !structure
  ) {
    return;
  }

  /*
    Momentum BUY NOW should not be converted
    into a scalping entry if market structure
    has already turned strongly bearish.
  */

  if (
    structure.pressure ===
      "TEKANAN JUAL KUAT" ||
    structure.direction ===
      "SEDANG MENURUN KUAT"
  ) {
    return;
  }

  const twoHourSafety =
    await getTwoHourSafety(
      coin
    );

  if (
    twoHourSafety ===
    "BLOCK"
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

  const room =
    await evaluateRoomToTP(
      coin,
      preliminary.entryPrice
    );

  if (
    !room.allowed
  ) {
    return;
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
        structure.resistancePrice,
    });

  /*
    Momentum engine already confirmed BUY NOW.
    Give a controlled bonus, not an automatic 100%.
  */

  score +=
    Math.min(
      momentumAnalysis.score *
        2,
      18
    );

  score =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  /*
    Momentum BUY NOW should not create
    a weak scalping entry.
  */

  if (
    score <
    65
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

    sl:
      risk.sl,

    durationHours:
      risk.durationHours,

    setup:
      "MOMENTUM BUY NOW",

    brokenResistance:
      null,

    nextResistance:
      room.nextResistance,

    momentumSnapshot:
      momentumAnalysis,
  });
}

/* ============================================================
   HANDLE GRT BUY NOW SIGNAL

   Called directly by sendPriceAlert() in PART 3.

   Responsibilities:
   1. Prevent duplicate BUY NOW records.
   2. Record the signal for learning.
   3. Trigger scalping-entry safety engine.
============================================================ */

async function handleGRTBuyNowSignal(
  ticker,
  momentumAnalysis
) {
  if (
    !ticker ||
    !momentumAnalysis
  ) {
    return;
  }

  const elapsed =
    Date.now() -
    LAST_GRT_BUY_NOW_SIGNAL;

  /*
    Do not create another learning record
    every 5 minutes if the same momentum
    condition remains active.

    15-minute cooldown keeps tests cleaner.
  */

  if (
    elapsed <
    GRT_BUY_NOW_COOLDOWN_MS
  ) {
    /*
      Even during learning cooldown,
      scalping trigger may still be checked
      if there is no active/pending entry.
    */

    await triggerMomentumScalpingEntry(
      ticker,
      momentumAnalysis
    );

    return;
  }

  LAST_GRT_BUY_NOW_SIGNAL =
    Date.now();

  /*
    Defined in PART 7.
  */

  recordGRTBuyNowSignal(
    ticker,
    momentumAnalysis
  );

  await triggerMomentumScalpingEntry(
    ticker,
    momentumAnalysis
  );
}

/* ============================================================
   BREAKOUT SCALPING ENTRY
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

  const structure =
    await analyzeMarketStructure(
      coin
    );

  if (
    !structure
  ) {
    return;
  }

  if (
    structure.pressure.includes(
      "JUAL"
    )
  ) {
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
      return;
    }
  }

  const technicalEntry =
    trade.price;

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
    LAST_CONFIRMED_BREAKOUT[
      coin
    ] = {
      at:
        Date.now(),

      resistance:
        watch.resistance,

      entryBlocked:
        true,

      reason:
        room.reason,
    };

    return;
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
      watch.buyEvidence *
        3,
      12
    );

  const score =
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

    confirmedPrice:
      trade.price,

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
   GENERAL 1-MINUTE SCALPING SCANNER
============================================================ */

async function scanSignals() {
  if (
    Date.now() -
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
      Date.now() -
        LAST_SIGNAL[
          coin
        ] <
        PER_COIN_COOLDOWN
    ) {
      continue;
    }

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
      For BTC/GRT near resistance,
      breakout engine gets priority.
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
        15 * 60 * 1000
      );

    const snapshot60m =
      getPriceSnapshot(
        coin,
        60 * 60 * 1000
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
          ticker.currentPrice,

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

    const quantity =
      Math.ceil(
        targetProfit /
        netProfitPerGrossUnit
      );

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

        netProfitPerGrossUnit,

        depthSelection:
          depth,
      };
    }

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
      query.message.chat.id;

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
          "💰 TARGET NET PROFIT (RM)?"
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

Masukkan 0 jika order tidak match.`
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

🪙 ${coin}`
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
          "⚠️ Masukkan target profit yang sah."
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
          Date.now(),

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
RM${adjustedProfit.toFixed(
          2
        )}

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
RM${pnl.toFixed(
          2
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
   GRT BUY NOW LEARNING
   SAVE / LOAD
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

    if (
      parsed.lastSignal
    ) {
      LAST_GRT_BUY_NOW_SIGNAL =
        safeNumber(
          parsed.lastSignal
        );
    }

    if (
      parsed.lastSuggestionCount
    ) {
      LAST_TUNING_SUGGESTION_COUNT =
        safeNumber(
          parsed.lastSuggestionCount
        );
    }
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
   GRT TUNING SAVE / LOAD
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

    /*
      Safety range.
      Never allow absurd automatic thresholds.
    */

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
   CREATE UNIQUE LEARNING SIGNAL ID
============================================================ */

function createGRTSignalId() {
  return `GRT-${Date.now()}-${Math.random()
    .toString(36)
    .substring(
      2,
      6
    )
    .toUpperCase()}`;
}

/* ============================================================
   RECORD GRT BUY NOW SIGNAL

   Called by handleGRTBuyNowSignal()
   from PART 5.
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

    /*
      Snapshot of indicators when BUY NOW fired.
    */

    score:
      safeNumber(
        analysis.score
      ),

    buyIncreasePct:
      safeNumber(
        analysis.buyIncreasePct
      ),

    buyVolumePct:
      safeNumber(
        analysis.flow
          ?.buyVolumePct
      ),

    sellVolumePct:
      safeNumber(
        analysis.flow
          ?.sellVolumePct
      ),

    buyFrequencyPct:
      safeNumber(
        analysis.flow
          ?.buyFrequencyPct
      ),

    sellFrequencyPct:
      safeNumber(
        analysis.flow
          ?.sellFrequencyPct
      ),

    priceResponsePct:
      safeNumber(
        analysis.priceResponse
          ?.changePct
      ),

    rsi:
      analysis.rsi
        ?.ready
        ? safeNumber(
            analysis.rsi.current
          )
        : null,

    rsiDirection:
      analysis.rsi
        ?.direction ||
      "UNKNOWN",

    ma9:
      analysis.ma
        ?.ready
        ? safeNumber(
            analysis.ma.ma9
          )
        : null,

    ma50:
      analysis.ma
        ?.ready
        ? safeNumber(
            analysis.ma.ma50
          )
        : null,

    maCondition:
      analysis.ma
        ?.condition ||
      "UNKNOWN",

    bidLiquidityPct:
      analysis.liquidity
        ?.ready
        ? safeNumber(
            analysis.liquidity
              .bidLiquidityPct
          )
        : null,

    askLiquidityPct:
      analysis.liquidity
        ?.ready
        ? safeNumber(
            analysis.liquidity
              .askLiquidityPct
          )
        : null,

    support:
      analysis.liquidity
        ?.support
        ?.price ||
      null,

    supportRating:
      analysis.liquidity
        ?.support
        ?.rating ||
      null,

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

    /*
      Future outcome snapshots.
    */

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
    90 * 1000
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
   UPDATE BEST / WORST MOVE
============================================================ */

function updateGRTSignalExtremes(
  signal,
  currentPrice,
  currentTime =
    Date.now()
) {
  if (
    !signal
  ) {
    return;
  }

  const monitorEndTime =
    Math.min(
      currentTime,
      signal.createdAt +
        15 *
          60 *
          1000
    );

  const memoryPoints =
    (
      PRICE_MEMORY[
        "GRT"
      ] ||
      []
    ).filter(
      (item) =>
        item.timestamp >=
          signal.createdAt &&
        item.timestamp <=
          monitorEndTime &&
        item.price >
          0
    );

  const prices =
    memoryPoints.map(
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
    prices.push(
      currentPrice
    );
  }

  if (
    !prices.length
  ) {
    return;
  }

  const bestPrice =
    Math.max(
      signal.bestPrice ||
        signal.entryPrice,
      ...prices
    );

  const worstPrice =
    Math.min(
      signal.worstPrice ||
        signal.entryPrice,
      ...prices
    );

  signal.bestPrice =
    bestPrice;

  signal.bestMovePct =
    percentChange(
      signal.entryPrice,
      bestPrice
    );

  signal.worstPrice =
    worstPrice;

  signal.worstMovePct =
    percentChange(
      signal.entryPrice,
      worstPrice
    );
}

/* ============================================================
   CLASSIFY GRT BUY NOW RESULT

   SUCCESS:
   price managed at least +0.30% within 15m.

   FALSE:
   price fell at least -0.30% without first
   producing meaningful positive movement.

   MIXED:
   neither clearly succeeded nor failed.
============================================================ */

function classifyGRTBuyNowSignal(
  signal
) {
  if (
    !signal
  ) {
    return "UNKNOWN";
  }

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
   MONITOR BUY NOW OUTCOMES

   Uses existing ticker / price memory.
   No fast extra polling is required.
============================================================ */

async function monitorGRTBuyNowSignals() {
  const activeSignals =
    GRT_BUY_NOW_HISTORY.filter(
      (signal) =>
        !signal.completed
    );

  if (
    !activeSignals.length
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

  const currentPrice =
    ticker.currentPrice;

  const currentTime =
    Date.now();

  let changed =
    false;

    for (
    const signal of
    activeSignals
  ) {
    updateGRTSignalExtremes(
      signal,
      currentPrice,
      currentTime
    );

    const elapsed =
      currentTime -
      signal.createdAt;

    /* ======================================================
       +5 MINUTES
    ====================================================== */

    if (
      elapsed >=
        5 * 60 * 1000 &&
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

      const price =
        point
          ?.price ||
        currentPrice;

      signal.price5m =
        price;

      signal.change5m =
        percentChange(
          signal.entryPrice,
          price
        );

      changed =
        true;
    }

    /* ======================================================
       +10 MINUTES
    ====================================================== */

    if (
      elapsed >=
        10 * 60 * 1000 &&
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

      const price =
        point
          ?.price ||
        currentPrice;

      signal.price10m =
        price;

      signal.change10m =
        percentChange(
          signal.entryPrice,
          price
        );

      changed =
        true;
    }

    /* ======================================================
       +15 MINUTES
    ====================================================== */

    if (
      elapsed >=
        15 * 60 * 1000 &&
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

      const price =
        point
          ?.price ||
        currentPrice;

      signal.price15m =
        price;

      signal.change15m =
        percentChange(
          signal.entryPrice,
          price
        );

      signal.result =
        classifyGRTBuyNowSignal(
          signal
        );

      signal.completed =
        true;

      signal.finishedAt =
        currentTime;

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
   COMPLETED BUY NOW SIGNALS
============================================================ */

function getCompletedGRTBuyNowSignals() {
  return GRT_BUY_NOW_HISTORY.filter(
    (signal) =>
      signal.completed
  );
}

/* ============================================================
   BUY NOW PERFORMANCE STATS
============================================================ */

function getGRTBuyNowPerformance() {
  const completed =
    getCompletedGRTBuyNowSignals();

  const total =
    completed.length;

  if (
    total ===
    0
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
    total,

    success,

    falseSignals,

    mixed,

    accuracy:
      (
        success /
        total
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
   THRESHOLD PERFORMANCE TEST
============================================================ */

function testBuyVolumeThreshold(
  signals,
  threshold
) {
  const selected =
    signals.filter(
      (signal) =>
        safeNumber(
          signal.buyVolumePct
        ) >=
        threshold
    );

  if (
    !selected.length
  ) {
    return {
      threshold,

      total:
        0,

      success:
        0,

      accuracy:
        0,
    };
  }

  const success =
    selected.filter(
      (signal) =>
        signal.result ===
        "SUCCESS"
    ).length;

  return {
    threshold,

    total:
      selected.length,

    success,

    accuracy:
      (
        success /
        selected.length
      ) * 100,
  };
}

/* ============================================================
   GENERATE TUNING SUGGESTION

   Bot does NOT apply this automatically.
============================================================ */

function generateGRTTuningSuggestion() {
  const completed =
    getCompletedGRTBuyNowSignals();

  if (
    completed.length <
    GRT_TUNING_MIN_COMPLETED_SIGNALS
  ) {
    return null;
  }

  const thresholds = [
    52,
    55,
    58,
    60,
    62,
    65,
  ];

  const tests =
    thresholds.map(
      (threshold) =>
        testBuyVolumeThreshold(
          completed,
          threshold
        )
    );

  /*
    Require enough examples at the new threshold.
    Avoid recommending based on 1 or 2 lucky signals.
  */

  const minimumSample =
    Math.max(
      8,
      Math.floor(
        completed.length *
          0.25
      )
    );

  const usable =
    tests.filter(
      (item) =>
        item.total >=
        minimumSample
    );

  if (
    !usable.length
  ) {
    return null;
  }

  const currentResult =
    testBuyVolumeThreshold(
      completed,
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
    );

  usable.sort(
    (a, b) =>
      b.accuracy -
        a.accuracy ||
      b.total -
        a.total
  );

  const best =
    usable[0];

  /*
    Only suggest if historical improvement
    is meaningful.
  */

  if (
    best.threshold ===
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
  ) {
    return null;
  }

  if (
    best.accuracy <
    currentResult.accuracy +
      7
  ) {
    return null;
  }

  return {
    currentThreshold:
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

    suggestedThreshold:
      best.threshold,

    currentAccuracy:
      currentResult.accuracy,

    currentSamples:
      currentResult.total,

    suggestedAccuracy:
      best.accuracy,

    suggestedSamples:
      best.total,

    completedSignals:
      completed.length,
  };
}

/* ============================================================
   TUNING SUGGESTION ALERT
============================================================ */

async function maybeSuggestGRTTuning() {
  const completed =
    getCompletedGRTBuyNowSignals();

  if (
    completed.length <
    GRT_TUNING_MIN_COMPLETED_SIGNALS
  ) {
    return;
  }

  /*
    Do not spam a suggestion after every signal.
    Re-evaluate after every additional 10 completed signals.
  */

  if (
    completed.length <
    LAST_TUNING_SUGGESTION_COUNT +
      10 &&
    LAST_TUNING_SUGGESTION_COUNT >
      0
  ) {
    return;
  }

  const suggestion =
    generateGRTTuningSuggestion();

  if (
    !suggestion
  ) {
    return;
  }

  LAST_TUNING_SUGGESTION_COUNT =
    completed.length;

  saveGRTBuyNowHistory();

  await sendTelegram(
    `🧠 GRT TUNING SUGGESTION

BUY NOW signals analysed:
${suggestion.completedSignals}

Current BUY dominance:
${suggestion.currentThreshold.toFixed(
      0
    )}%

Historical:
${suggestion.currentThreshold.toFixed(
      0
    )}% → ${suggestion.currentAccuracy.toFixed(
      1
    )}% success
(${suggestion.currentSamples} signals)

Suggested:
${suggestion.suggestedThreshold.toFixed(
      0
    )}% → ${suggestion.suggestedAccuracy.toFixed(
      1
    )}% success
(${suggestion.suggestedSamples} signals)

APPLY NEW THRESHOLD?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                `✅ APPLY ${suggestion.suggestedThreshold}%`,

              callback_data:
                `TUNE_APPLY_${suggestion.suggestedThreshold}`,
            },
            {
              text:
                "❌ KEEP CURRENT",

              callback_data:
                "TUNE_KEEP",
            },
          ],
        ],
      },
    }
  );
}

/* ============================================================
   TUNING CALLBACK
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
      data.startsWith(
        "TUNE_APPLY_"
      )
    ) {
      const newThreshold =
        Number(
          data.replace(
            "TUNE_APPLY_",
            ""
          )
        );

      if (
        Number.isFinite(
          newThreshold
        ) &&
        newThreshold >=
          50 &&
        newThreshold <=
          75
      ) {
        const previous =
          GRT_DYNAMIC_BUY_VOLUME_MIN_PCT;

        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
          newThreshold;

        saveGRTTuning();

        if (
          chatId
        ) {
          await replyTelegram(
            chatId,
            `✅ GRT MOMENTUM TUNING APPLIED

BUY dominance:
${previous.toFixed(
              0
            )}% → ${newThreshold.toFixed(
              0
            )}%

📡 Future BUY NOW signals will use the new threshold.`
          );
        }
      }
    }

    if (
      data ===
      "TUNE_KEEP"
    ) {
      if (
        chatId
      ) {
        await replyTelegram(
          chatId,
          `✅ CURRENT FORMULA KEPT

BUY dominance remains:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
            0
          )}%`
        );
      }
    }
  }
);

/* ============================================================
   LAST BUY NOW SIGNAL
============================================================ */

function getLastGRTBuyNowSignal() {
  if (
    !GRT_BUY_NOW_HISTORY.length
  ) {
    return null;
  }

  return GRT_BUY_NOW_HISTORY[
    GRT_BUY_NOW_HISTORY.length -
      1
  ];
}

/* ============================================================
   FORMAT BUY NOW SIGNAL RESULT
============================================================ */

function formatLearningSignal(
  signal
) {
  if (
    !signal
  ) {
    return "NO DATA";
  }

  const five =
    signal.change5m ===
      null
      ? "WAITING"
      : formatPercent(
          signal.change5m
        );

  const ten =
    signal.change10m ===
      null
      ? "WAITING"
      : formatPercent(
          signal.change10m
        );

  const fifteen =
    signal.change15m ===
      null
      ? "WAITING"
      : formatPercent(
          signal.change15m
        );

  return `Signal:
${signal.id}

BUY NOW:
RM${formatPrice(
    "GRT",
    signal.entryPrice
  )}

5M: ${five}
10M: ${ten}
15M: ${fifteen}

⬆️ Best:
${formatPercent(
    signal.bestMovePct
  )}

⬇️ Worst:
${formatPercent(
    signal.worstMovePct
  )}

Result:
${signal.completed
  ? signal.result ===
      "SUCCESS"
    ? "✅ SUCCESS"
    : signal.result ===
        "FALSE"
      ? "❌ FALSE SIGNAL"
      : "➖ MIXED"
  : "⏳ MONITORING"}`;
}

/* ============================================================
   /BUYTEST COMMAND
============================================================ */

bot.onText(
  /\/buytest/i,
  async (msg) => {
    const stats =
      getGRTBuyNowPerformance();

    const last =
      getLastGRTBuyNowSignal();

    if (
      GRT_BUY_NOW_HISTORY.length ===
      0
    ) {
      await replyTelegram(
        msg.chat.id,
        `🧪 GRT BUY NOW TEST

No BUY NOW signals recorded yet.

Current BUY dominance threshold:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
          0
        )}%`
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      `🧪 GRT BUY NOW TEST

Signals Recorded:
${GRT_BUY_NOW_HISTORY.length}

Completed:
${stats.total}

✅ Success:
${stats.success}

❌ False:
${stats.falseSignals}

➖ Mixed:
${stats.mixed}

🎯 Accuracy:
${stats.accuracy.toFixed(
        1
      )}%

📈 Average Move
5M: ${formatPercent(
        stats.average5m
      )}
10M: ${formatPercent(
        stats.average10m
      )}
15M: ${formatPercent(
        stats.average15m
      )}

⬆️ Avg Best Move:
${formatPercent(
        stats.averageBest
      )}

⬇️ Avg Worst Move:
${formatPercent(
        stats.averageWorst
      )}

⚙️ Current BUY Threshold:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
        0
      )}%

━━━━━━━━━━━━━━

${formatLearningSignal(
  last
)}`
    );
  }
);

/* ============================================================
   /BUYLAST COMMAND
============================================================ */

bot.onText(
  /\/buylast/i,
  async (msg) => {
    const last =
      getLastGRTBuyNowSignal();

    if (
      !last
    ) {
      await replyTelegram(
        msg.chat.id,
        "🧪 No GRT BUY NOW signal recorded yet."
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      `🧪 LAST GRT BUY NOW

${formatLearningSignal(
        last
      )}

BUY Volume:
${safeNumber(
  last.buyVolumePct
).toFixed(
  1
)}%

BUY Frequency:
${safeNumber(
  last.buyFrequencyPct
).toFixed(
  1
)}%

Initial Price Response:
${formatPercent(
  last.priceResponsePct
)}

RSI:
${
  last.rsi !==
    null
    ? last.rsi.toFixed(
        1
      )
    : "N/A"
}

1H MA:
${last.maCondition}

Signal Score:
${last.score}`
    );
  }
);

/* ============================================================
   /TUNING COMMAND
============================================================ */

bot.onText(
  /\/tuning/i,
  async (msg) => {
    const completed =
      getCompletedGRTBuyNowSignals();

    const suggestion =
      generateGRTTuningSuggestion();

    if (
      completed.length <
      GRT_TUNING_MIN_COMPLETED_SIGNALS
    ) {
      await replyTelegram(
        msg.chat.id,
        `🧠 GRT TUNING

Completed BUY NOW signals:
${completed.length}/${GRT_TUNING_MIN_COMPLETED_SIGNALS}

Current BUY threshold:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
          0
        )}%

More data is needed before tuning.`
      );

      return;
    }

    if (
      !suggestion
    ) {
      await replyTelegram(
        msg.chat.id,
        `🧠 GRT TUNING

Current BUY threshold:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
          0
        )}%

Completed signals:
${completed.length}

✅ No meaningful threshold improvement detected yet.`
      );

      return;
    }

    await replyTelegram(
      msg.chat.id,
      `🧠 GRT TUNING ANALYSIS

Current:
${suggestion.currentThreshold}% → ${suggestion.currentAccuracy.toFixed(
        1
      )}%

Suggested:
${suggestion.suggestedThreshold}% → ${suggestion.suggestedAccuracy.toFixed(
        1
      )}%

Samples:
${suggestion.currentSamples} vs ${suggestion.suggestedSamples}

Use the next tuning suggestion alert to APPLY or KEEP.`
    );
  }
);
/* ============================================================
   DAILY WATCH SNAPSHOT SAVE
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
      "Daily watch save error:",
      error.message
    );
  }
}

/* ============================================================
   DAILY WATCH SNAPSHOT LOAD
============================================================ */

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
  } catch (
    error
  ) {
    console.log(
      "Daily watch load error:",
      error.message
    );
  }
}

/* ============================================================
   DAILY WATCH METRICS
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

  return {
    totalExecutions,

    totalVolume,

    buyFrequencyPct,

    sellFrequencyPct,

    buyVolumePct,

    sellVolumePct,

    grtChangePct,

    btcChangePct,

    grtOutperformance:
      grtChangePct -
      btcChangePct,
  };
}

/* ============================================================
   FORMAT LARGE VOLUME
============================================================ */

function formatLargeNumber(
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
   DAILY HISTORY AVERAGE
============================================================ */

function getDailyHistoryAverage(
  key
) {
  if (
    !GRT_DAILY_HISTORY.length
  ) {
    return 0;
  }

  return average(
    GRT_DAILY_HISTORY.map(
      (item) =>
        safeNumber(
          item[key]
        )
    )
  );
}

/* ============================================================
   DAILY PRICE TREND
============================================================ */

function getDailyPriceTrend(
  metrics
) {
  const previous =
    getPreviousDailySummary();

  if (
    !previous
  ) {
    if (
      metrics.grtChangePct >
      1
    ) {
      return "STRENGTHENING ↑";
    }

    if (
      metrics.grtChangePct <
      -1
    ) {
      return "WEAKENING ↓";
    }

    return "NEUTRAL";
  }

  if (
    metrics.grtChangePct >
      previous.grtChangePct
  ) {
    return "STRENGTHENING ↑";
  }

  if (
    metrics.grtChangePct <
      previous.grtChangePct
  ) {
    return "WEAKENING ↓";
  }

  return "STABLE";
}

/* ============================================================
   DAILY BUY TREND
============================================================ */

function getDailyBuyTrend(
  metrics
) {
  const previous =
    getPreviousDailySummary();

  if (
    !previous
  ) {
    if (
      metrics.buyFrequencyPct >=
        55 &&
      metrics.buyVolumePct >=
        55
    ) {
      return "INCREASING ↑";
    }

    return "NEUTRAL";
  }

  const frequencyUp =
    metrics.buyFrequencyPct >
    previous.buyFrequencyPct;

  const volumeUp =
    metrics.buyVolumePct >
    previous.buyVolumePct;

  if (
    frequencyUp &&
    volumeUp
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

  const positiveDays =
    history.filter(
      (item) =>
        item.grtChangePct >
        0
    ).length;

  const ratio =
    positiveDays /
    history.length;

  if (
    ratio >=
    0.70
  ) {
    return "UPTREND";
  }

  if (
    ratio <=
    0.30
  ) {
    return "DOWNTREND";
  }

  return "SIDEWAY / MIXED";
}

/* ============================================================
   DAILY MOMENTUM SUMMARY
============================================================ */

function getDailyMomentumSummary({
  metrics,
  priceTrend,
  buyTrend,
  sevenDayTrend,
}) {
  let score =
    0;

  if (
    metrics.grtChangePct >
    0
  ) {
    score++;
  }

  if (
    metrics.buyFrequencyPct >=
    52
  ) {
    score++;
  }

  if (
    metrics.buyVolumePct >=
    52
  ) {
    score++;
  }

  if (
    metrics.grtOutperformance >
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
    sevenDayTrend ===
    "UPTREND"
  ) {
    score++;
  }

  if (
    score >=
    6
  ) {
    return "STRONGER";
  }

  if (
    score >=
    4
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
   ALTCOIN ROTATION WATCH
============================================================ */

function getAltcoinRotationSignal({
  metrics,
  priceTrend,
  buyTrend,
  sevenDayTrend,
}) {
  let score =
    0;

  if (
    metrics.grtOutperformance >=
    1
  ) {
    score +=
      2;
  } else if (
    metrics.grtOutperformance >
    0
  ) {
    score++;
  }

  if (
    metrics.buyFrequencyPct >=
    55
  ) {
    score++;
  }

  if (
    metrics.buyVolumePct >=
    55
  ) {
    score++;
  }

  if (
    metrics.grtChangePct >
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

  const baseSummary = {
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
      baseSummary
    );

  const momentum =
    getDailyMomentumSummary({
      metrics,
      priceTrend,
      buyTrend,
      sevenDayTrend,
    });

  const rotation =
    getAltcoinRotationSignal({
      metrics,
      priceTrend,
      buyTrend,
      sevenDayTrend,
    });

  return {
    ...baseSummary,

    priceTrend,

    buyTrend,

    sevenDayTrend,

    momentum,

    rotation,
  };
}

/* ============================================================
   BUILD DAILY REPORT
============================================================ */

function buildGRTDailyReport(
  summary,
  live =
    false
) {
  const previous =
    getPreviousDailySummary();

  let comparison =
    "";

  if (
    previous
  ) {
    comparison = `

📊 VS PREVIOUS DAY
Price:
${formatPercent(
      previous.grtChangePct
    )} → ${formatPercent(
      summary.grtChangePct
    )}

BUY Frequency:
${previous.buyFrequencyPct.toFixed(
      1
    )}% → ${summary.buyFrequencyPct.toFixed(
      1
    )}%

BUY Volume:
${previous.buyVolumePct.toFixed(
      1
    )}% → ${summary.buyVolumePct.toFixed(
      1
    )}%`;
  }

  return `🌙 GRT 24H DAILY REPORT
${formatMalaysiaDateLabel(
    summary.dateKey
  )}
${live
  ? "12AM → NOW MYT"
  : "12AM → 12AM MYT"}

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
🟢 BUY: ${formatLargeNumber(
    summary.buyVolume
  )} — ${summary.buyVolumePct.toFixed(
    1
  )}%
🔴 SELL: ${formatLargeNumber(
    summary.sellVolume
  )} — ${summary.sellVolumePct.toFixed(
    1
  )}%

₿ GRT VS BTC
GRT: ${formatPercent(
    summary.grtChangePct
  )}
BTC: ${formatPercent(
    summary.btcChangePct
  )}
Outperform: ${formatPercent(
    summary.grtOutperformance
  )}

📈 TREND
Price: ${summary.priceTrend}
Buy Activity: ${summary.buyTrend}
7-Day: ${summary.sevenDayTrend}

🧠 SUMMARY
GRT MOMENTUM: ${summary.momentum}
ALTCOIN ROTATION: ${summary.rotation}${comparison}`;
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
        buildGRTDailyReport(
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
   CURRENT DAILY REPORT
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

  return buildGRTDailyReport(
    summary,
    true
  );
}

/* ============================================================
   MANUAL COMMAND /MOMENTUM
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

₿ BTC RM${formatPrice(
        "BTC",
        btc.currentPrice
      )}
⚡ MOMENTUM: ${btcMomentum.text}

🪙 GRT RM${formatPrice(
        "GRT",
        grt.currentPrice
      )}
⚡ MOMENTUM: ${grtMomentum.momentumText}`
    );
  }
);

/* ============================================================
   MANUAL COMMAND /STRUCTURE
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
   MANUAL COMMAND /FLOW
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

    const sections = [];

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

Price:
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
   MANUAL COMMAND /GRT24
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
   MANUAL COMMAND /STATUS
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

📡 Price Alert:
5 MIN

₿ BTC:
BUY SURGE RADAR

🪙 GRT:
NO ENTRY SIGNAL
→ VERIFYING BUY
→ BUY NOW

⚡ BUY Surge Threshold:
+${MOMENTUM_SPIKE_THRESHOLD_PCT}%

🎯 Dynamic GRT BUY Threshold:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
        0
      )}%

🔐 Luno Candle API:
${candleAuth}

📊 Market Structure:
15 MIN

🚀 Scalping Scan:
1 MIN

🧠 BUY NOW Learning:
ACTIVE

🧪 BUY NOW Records:
${GRT_BUY_NOW_HISTORY.length}

🌙 Daily Watch:
ACTIVE

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

      momentum: {
        btc:
          "BUY SURGE RADAR",

        grt:
          "NO ENTRY -> VERIFYING -> BUY NOW",

        buyIncreaseThreshold:
          MOMENTUM_SPIKE_THRESHOLD_PCT,

        grtDynamicBuyVolumePct:
          GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,
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
   BUY TEST ENDPOINT
============================================================ */

app.get(
  "/buytest",
  (
    req,
    res
  ) => {
    res.json({
      threshold:
        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

      stats:
        getGRTBuyNowPerformance(),

      history:
        GRT_BUY_NOW_HISTORY,
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
          ? 40
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
   STARTUP
============================================================ */

app.listen(
  PORT,
  async () => {
    console.log(
      `RUNNING ${PORT} ${SERVICE_CODE}`
    );

    /*
      Load stored state before
      starting the monitoring engines.
    */

    loadDailyWatchSnapshot();

    loadGRTBuyNowHistory();

    loadGRTTuning();

    ensureDailyWatchState();

    /*
      Prime local data.
    */

    await backfillTradeHistory();

    await collectTradeHistory();

    await updateMemory();

    /* ========================================================
       LUNO CANDLE AUTH TEST
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

    await sendTelegram(
      `✅ BOT ONLINE

📡 PRICE ALERT:
5 MIN

₿ BTC:
BUY SURGE RADAR
Executed BUY + Positive Price Response

🪙 GRT MOMENTUM:
🔴 NO ENTRY SIGNAL
🟡 VERIFYING BUY
🟢 BUY NOW

🟢 BUY NOW:
TRIGGERS SCALPING ENTRY SAFETY CHECK

⚡ BUY ACTIVITY THRESHOLD:
+${MOMENTUM_SPIKE_THRESHOLD_PCT}%

🎯 GRT BUY DOMINANCE:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
        0
      )}%

📈 GRT FILTERS:
RSI 5M
MA9 / MA50 1H
Executed BUY
Price Response
Orderbook
Liquidity
Support / Resistance

🧪 BUY NOW LEARNING:
ACTIVE

Outcome:
5M / 10M / 15M
Best Move / Worst Move

🧠 SEMI-AUTO TUNING:
ACTIVE
USER APPROVAL REQUIRED

🔐 LUNO CANDLE API:
${candleStatus}

📊 MARKET STRUCTURE:
15 MIN

🚀 SCALPING:
ACTIVE

🌙 GRT DAILY WATCH:
ACTIVE`
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
   EXECUTED TRADE COLLECTOR
   EVERY 5 SECONDS
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
   PRICE MEMORY
   EVERY 15 SECONDS
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
   ACTIVE TRADE MONITOR
   EVERY 15 SECONDS
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
   GENERAL SCALPING SCAN
   EVERY 1 MINUTE
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
   GRT BUY NOW LEARNING MONITOR
   EVERY 1 MINUTE
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
   PRICE + MOMENTUM ALERT
   EVERY 5 MINUTES
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
   MARKET STRUCTURE
   EVERY 15 MINUTES
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
   DAILY WATCH DAY CHANGE CHECK
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
   SAVE DAILY WATCH
============================================================ */

setInterval(
  saveDailyWatchSnapshot,
  DAILY_WATCH_SAVE_INTERVAL
);

/* ============================================================
   SAVE BUY NOW LEARNING
============================================================ */

setInterval(
  saveGRTBuyNowHistory,
  60 * 1000
);
