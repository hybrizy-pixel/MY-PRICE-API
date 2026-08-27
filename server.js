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

/*
  COLLECTING hanya dibenarkan sebelum
  engine pernah cukup data selepas startup.

  Selepas engine pernah READY:
  jika data sementara tak cukup,
  keputusan selamat kekal DON'T BUY.
*/
let GRT_ENGINE_HAS_BEEN_READY =
  false;

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
  10 * 60 * 1000;

/*
  Kalau price dah bergerak kuat dalam 30M
  + ada BUY evidence, bot wajib re-evaluate.
*/

const GRT_FAST_REEVALUATE_30M_MOVE_PCT =
  1.00;

/*
  FAST PRICE DIRECTION LAYER

  Purpose:
  baca arah graf lebih awal daripada
  BUY validation supaya bot tak terlepas
  bila harga mula reverse.

  Direction display:
  MASIH DROP
  DROP PERLAHAN
  NAIK PERLAHAN
  NAIK LAJU
*/

const GRT_DIRECTION_SLOW_UP_5M_PCT =
  0.08;

const GRT_DIRECTION_FAST_UP_5M_PCT =
  0.35;

const GRT_DIRECTION_ACTIVE_DROP_5M_PCT =
  -0.20;

const GRT_DIRECTION_MIN_SEQUENCE_PCT =
  55;

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
/* ============================================================
   FINAL CORRECTION A
   GRT MOMENTUM RUNTIME + CANDLE + DIRECTION HELPERS

   PURPOSE:

   Restore missing dependencies used by:

   - GRT sustained momentum
   - fast direction
   - 5M / 15M progression
   - validation runtime
   - candle momentum
============================================================ */


/* ============================================================
   GRT MOMENTUM RUNTIME
============================================================ */

const GRT_MOMENTUM_RUNTIME = {
  recentPrices: [],

  lastDirection:
    "UNKNOWN",

  lastDirectionAt:
    null,

  phase:
    "COLLECTING",

  lastDecision:
    "COLLECTING",

  validationStartedAt:
    null,

  candidateStartedAt:
    null,

  lastBuyNowAt:
    null,

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
   COMPLETED CANDLES

   Candle dianggap complete apabila:

   timestamp + duration <= current time
============================================================ */

function getCompletedCandles(
  candles,
  durationSec
) {
  if (
    !Array.isArray(
      candles
    ) ||
    !candles.length
  ) {
    return [];
  }

  const durationMs =
    safeNumber(
      durationSec,
      0
    ) *
    1000;

  if (
    durationMs <=
    0
  ) {
    return [];
  }

  const now =
    Date.now();

  return candles.filter(
    (
      candle
    ) =>
      candle &&
      safeNumber(
        candle.timestamp,
        0
      ) >
        0 &&
      safeNumber(
        candle.timestamp,
        0
      ) +
        durationMs <=
        now
  );
}


/* ============================================================
   BASIC CANDLE ANALYSIS

   Used by:
   - 5M candle momentum
   - higher timeframe candle checks
============================================================ */

function analyzeCandle(
  candle
) {
  if (
    !candle
  ) {
    return {
      ready:
        false,
    };
  }

  const open =
    safeNumber(
      candle.open,
      0
    );

  const close =
    safeNumber(
      candle.close,
      0
    );

  const high =
    safeNumber(
      candle.high,
      0
    );

  const low =
    safeNumber(
      candle.low,
      0
    );

  const volume =
    safeNumber(
      candle.volume,
      0
    );

  if (
    open <=
      0 ||
    close <=
      0
  ) {
    return {
      ready:
        false,
    };
  }

  const changePct =
    percentChange(
      open,
      close
    );

  const rangePct =
    low >
      0
      ? percentChange(
          low,
          high
        )
      : 0;

  const bodyPct =
    Math.abs(
      changePct
    );

  let direction =
    "FLAT";

  if (
    close >
    open
  ) {
    direction =
      "BULLISH";
  } else if (
    close <
    open
  ) {
    direction =
      "BEARISH";
  }

  return {
    ready:
      true,

    open,
    close,
    high,
    low,
    volume,

    changePct,
    bodyPct,
    rangePct,

    direction,

    bullish:
      close >
      open,

    bearish:
      close <
      open,
  };
}


/* ============================================================
   UPDATE GRT INTERNAL PRICE HISTORY

   Master scanner runs every 1 minute.

   Keep enough data for:
   - 5M
   - 10M
   - 15M
   - 30M

   Duplicate sample protection:
   if same price comes again within
   a short period, don't keep stacking
   unnecessary duplicate points.
============================================================ */

function updateGRTMomentumPriceHistory(
  price
) {
  const currentPrice =
    safeNumber(
      price,
      0
    );

  if (
    currentPrice <=
    0
  ) {
    return;
  }

  const now =
    Date.now();

  const history =
    GRT_MOMENTUM_RUNTIME
      .recentPrices;

  const last =
    history[
      history.length -
        1
    ];

  /*
    getGRTMomentumDecision()
    dan getGRTSustainedMove()
    boleh memanggil helper ini dalam
    cycle yang sama.

    Jangan simpan duplicate sample
    beberapa millisecond kemudian.
  */

  if (
    last &&
    now -
      last.timestamp <
      5000 &&
    last.price ===
      currentPrice
  ) {
    return;
  }

  history.push({
    timestamp:
      now,

    price:
      currentPrice,
  });

  /*
    Keep 60 minutes internal history.

    30M detector masih mempunyai
    margin data yang cukup.
  */

  const cutoff =
    now -
    60 *
      60 *
      1000;

  GRT_MOMENTUM_RUNTIME
    .recentPrices =
    history.filter(
      (
        item
      ) =>
        item.timestamp >=
        cutoff
    );
}


/* ============================================================
   GRT REFERENCE PRICE

   Returns nearest historical sample
   at-or-before requested lookback.

   Example:
   lookback = 15M
   → reference price around 15M ago.
============================================================ */

function getGRTReferencePrice(
  lookbackMs
) {
  const history =
    GRT_MOMENTUM_RUNTIME
      .recentPrices;

  if (
    !Array.isArray(
      history
    ) ||
    !history.length
  ) {
    return null;
  }

  const targetTime =
    Date.now() -
    lookbackMs;

  let selected =
    null;

  /*
    Prefer latest sample that is
    already older than targetTime.
  */

  for (
    const item of
    history
  ) {
    if (
      item.timestamp <=
      targetTime
    ) {
      selected =
        item;
    } else {
      break;
    }
  }

  /*
    Kalau bot belum cukup lama hidup,
    guna oldest sample sebagai temporary
    reference.

    ready logic di momentum layer tetap
    akan kawal keputusan.
  */

  if (
    !selected
  ) {
    selected =
      history[0];
  }

  return {
    price:
      selected.price,

    timestamp:
      selected.timestamp,

    ageMs:
      Date.now() -
      selected.timestamp,
  };
}


/* ============================================================
   FORMAT GRT FAST DIRECTION
============================================================ */

function formatGRTDirection(
  direction
) {
  switch (
    direction
  ) {
    case "MASIH_DROP":
      return "📉 MASIH DROP";

    case "DROP_PERLAHAN":
      return "📉 DROP PERLAHAN";

    case "NAIK_PERLAHAN":
      return "📈 NAIK PERLAHAN";

    case "NAIK_LAJU":
      return "🚀 NAIK LAJU";

    default:
      return "";
  }
}


/* ============================================================
   FAST GRT DIRECTION

   Designed around the agreed display:

   MASIH DROP
   DROP PERLAHAN
   NAIK PERLAHAN
   NAIK LAJU

   5M = fastest response
   15M = supporting direction
============================================================ */

function getGRTFastDirection(
  currentPrice
) {
  const price =
    safeNumber(
      currentPrice,
      0
    );

  if (
    price <=
    0
  ) {
    return {
      ready:
        false,

      direction:
        GRT_MOMENTUM_RUNTIME
          .lastDirection ||
        "UNKNOWN",

      change5m:
        0,

      change15m:
        0,
    };
  }

  const ref5m =
    getGRTReferencePrice(
      5 *
        60 *
        1000
    );

  const ref15m =
    getGRTReferencePrice(
      15 *
        60 *
        1000
    );

  if (
    !ref5m
  ) {
    return {
      ready:
        false,

      direction:
        GRT_MOMENTUM_RUNTIME
          .lastDirection ||
        "UNKNOWN",

      change5m:
        0,

      change15m:
        0,
    };
  }

  const change5m =
    percentChange(
      ref5m.price,
      price
    );

  const change15m =
    ref15m
      ? percentChange(
          ref15m.price,
          price
        )
      : change5m;

  let direction;

  /* ========================================================
     FAST UP
  ======================================================== */

  if (
    change5m >=
    GRT_DIRECTION_FAST_UP_5M_PCT
  ) {
    direction =
      "NAIK_LAJU";
  }

  /* ========================================================
     SLOW / BUILDING UP

     15M positive can keep upward
     direction even if latest 5M
     temporarily slows.
  ======================================================== */

  else if (
    change5m >=
      GRT_DIRECTION_SLOW_UP_5M_PCT ||
    (
      change5m >
        -0.05 &&
      change15m >=
        GRT_SUSTAINED_15M_MOVE_PCT
    )
  ) {
    direction =
      "NAIK_PERLAHAN";
  }

  /* ========================================================
     ACTIVE DROP
  ======================================================== */

  else if (
    change5m <=
    GRT_DIRECTION_ACTIVE_DROP_5M_PCT
  ) {
    direction =
      "MASIH_DROP";
  }

  /* ========================================================
     WEAK DROP / FLAT-DOWN
  ======================================================== */

  else {
    direction =
      "DROP_PERLAHAN";
  }

  if (
    GRT_MOMENTUM_RUNTIME
      .lastDirection !==
    direction
  ) {
    GRT_MOMENTUM_RUNTIME
      .lastDirection =
      direction;

    GRT_MOMENTUM_RUNTIME
      .lastDirectionAt =
      Date.now();
  }

  return {
    ready:
      true,

    direction,

    directionText:
      formatGRTDirection(
        direction
      ),

    change5m,

    change15m,
  };
}


/* ============================================================
   MOMENTUM PHASE STATE
============================================================ */

function setGRTMomentumPhase(
  phase
) {
  GRT_MOMENTUM_RUNTIME
    .phase =
    phase;

  return phase;
}


/* ============================================================
   FINAL DECISION STATE
============================================================ */

function setGRTLastDecision(
  decision
) {
  GRT_MOMENTUM_RUNTIME
    .lastDecision =
    decision;

  LAST_GRT_FINAL_DECISION =
    decision;

  return decision;
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

function getLunoAuth() {
  if (
    !LUNO_API_KEY_ID ||
    !LUNO_API_KEY_SECRET
  ) {
    return null;
  }

  return {
    username:
      LUNO_API_KEY_ID,

    password:
      LUNO_API_KEY_SECRET,
  };
}

/* ============================================================
   LUNO CANDLES
============================================================ */

async function getLunoCandles(
  coin,
  duration =
    MOMENTUM_CANDLE_DURATION_SEC,
  count = 100
) {
  try {
    const pair =
      getPair(
        coin
      );

    const auth =
      getLunoAuth();

    const params = {
      pair,
      duration,
    };

    /*
      Luno candle endpoint uses
      a time range rather than
      a simple candle count.
    */

    const endTime =
      Date.now();

    const startTime =
      endTime -
      duration *
        1000 *
        Math.max(
          count + 5,
          20
        );

    params.since =
      startTime;

    const config = {
      params,

      timeout:
        10000,
    };

    if (
      auth
    ) {
      config.auth =
        auth;
    }

    const response =
      await axios.get(
        "https://api.luno.com/api/exchange/1/candles",
        config
      );

    const rawCandles =
      response.data
        ?.candles ||
      [];

    return rawCandles
      .map(
        (candle) => {
          const timestamp =
            safeNumber(
              candle.timestamp
            );

          const open =
            safeNumber(
              candle.open
            );

          const close =
            safeNumber(
              candle.close
            );

          const high =
            safeNumber(
              candle.high
            );

          const low =
            safeNumber(
              candle.low
            );

          const volume =
            safeNumber(
              candle.volume
            );

          return {
            timestamp,
            open,
            close,
            high,
            low,
            volume,
          };
        }
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
      )
      .slice(
        -count
      );
  } catch (
    error
  ) {
    console.log(
      `Candles ${coin}:`,
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
      period ||
    period <=
      0
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
  values,
  period =
    GRT_RSI_PERIOD
) {
  if (
    !Array.isArray(
      values
    ) ||
    values.length <
      period + 1
  ) {
    return null;
  }

  const selected =
    values.slice(
      -(period + 1)
    );

  let gains =
    0;

  let losses =
    0;

  for (
    let index = 1;
    index <
      selected.length;
    index++
  ) {
    const change =
      selected[index] -
      selected[
        index - 1
      ];

    if (
      change >
      0
    ) {
      gains +=
        change;
    } else if (
      change <
      0
    ) {
      losses +=
        Math.abs(
          change
        );
    }
  }

  const averageGain =
    gains /
    period;

  const averageLoss =
    losses /
    period;

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
    100 /
      (
        1 +
        relativeStrength
      )
  );
}

/* ============================================================
   GRT TECHNICAL SNAPSHOT
============================================================ */

async function getGRTTechnicalSnapshot() {
  const candles =
    await getLunoCandles(
      "GRT",
      MOMENTUM_CANDLE_DURATION_SEC,
      70
    );

  if (
    !candles.length
  ) {
    return {
      ready:
        false,

      candles:
        [],
    };
  }

  const closes =
    candles.map(
      (candle) =>
        candle.close
    );

  const rsi =
    calculateRSI(
      closes,
      GRT_RSI_PERIOD
    );

  const maFast =
    calculateSMA(
      closes,
      GRT_MA_FAST
    );

  const maSlow =
    calculateSMA(
      closes,
      GRT_MA_SLOW
    );

  const currentPrice =
    closes[
      closes.length -
        1
    ];

  const maDistancePct =
    maFast &&
    maSlow
      ? percentChange(
          maSlow,
          maFast
        )
      : 0;

  let maState =
    "UNKNOWN";

  if (
    maFast !==
      null &&
    maSlow !==
      null
  ) {
    if (
      maFast >
      maSlow
    ) {
      maState =
        "BULLISH";
    } else if (
      maFast <
      maSlow
    ) {
      maState =
        "BEARISH";
    } else {
      maState =
        "FLAT";
    }
  }

  const nearCross =
    maFast !==
      null &&
    maSlow !==
      null &&
    Math.abs(
      maDistancePct
    ) <=
      GRT_MA_NEAR_CROSS_PCT;

  return {
    ready:
      Boolean(
        rsi !==
          null &&
        maFast !==
          null &&
        maSlow !==
          null
      ),

    candles,

    currentPrice,

    rsi,

    maFast,
    maSlow,

    maState,
    maDistancePct,
    nearCross,
  };
}

/* ============================================================
   5M CANDLE MOMENTUM BASELINE
============================================================ */

async function getCandleMomentumBaseline(
  coin
) {
  const candles =
    await getLunoCandles(
      coin,
      MOMENTUM_CANDLE_DURATION_SEC,
      MOMENTUM_BASELINE_WINDOWS +
        4
    );

  if (
    candles.length <
    MOMENTUM_MIN_BASELINE_WINDOWS +
      1
  ) {
    return {
      ready:
        false,

      candles,

      current:
        null,

      baseline:
        null,

      spikePct:
        0,

      currentAgeSec:
        0,
    };
  }

  const current =
    candles[
      candles.length -
        1
    ];

  const previous =
    candles
      .slice(
        0,
        -1
      )
      .slice(
        -MOMENTUM_BASELINE_WINDOWS
      );

  if (
    previous.length <
    MOMENTUM_MIN_BASELINE_WINDOWS
  ) {
    return {
      ready:
        false,

      candles,

      current,

      baseline:
        null,

      spikePct:
        0,

      currentAgeSec:
        0,
    };
  }

  const baseline =
    average(
      previous.map(
        (candle) =>
          candle.volume
      )
    );

  const currentVolume =
    safeNumber(
      current.volume
    );

  const spikePct =
    baseline >
      0
      ? (
          (
            currentVolume -
            baseline
          ) /
          baseline
        ) * 100
      : 0;

  const currentAgeSec =
    Math.max(
      0,
      (
        Date.now() -
        current.timestamp
      ) /
        1000
    );

  return {
    ready:
      baseline >
      0,

    candles,

    current,

    baseline,

    spikePct,

    currentAgeSec,
  };
}

/* ============================================================
   ORDERBOOK RANGE FILTER
============================================================ */

function filterOrderBookRange(
  levels,
  currentPrice,
  rangePct,
  side
) {
  if (
    !Array.isArray(
      levels
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

    return levels.filter(
      (level) =>
        level.price <=
          currentPrice &&
        level.price >=
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

  return levels.filter(
    (level) =>
      level.price >=
        currentPrice &&
      level.price <=
        maximumPrice
  );
}

/* ============================================================
   ORDERBOOK CLUSTER
============================================================ */

function clusterOrderBookLevels(
  levels,
  clusterPct,
  side
) {
  if (
    !Array.isArray(
      levels
    ) ||
    !levels.length
  ) {
    return [];
  }

  const sorted =
    [
      ...levels,
    ].sort(
      side ===
        "BID"
        ? (
            a,
            b
          ) =>
            b.price -
            a.price
        : (
            a,
            b
          ) =>
            a.price -
            b.price
    );

  const clusters =
    [];

  for (
    const level of
    sorted
  ) {
    const lastCluster =
      clusters[
        clusters.length -
          1
      ];

    if (
      !lastCluster
    ) {
      clusters.push({
        price:
          level.price,

        totalVolume:
          level.volume,

        levels:
          [
            level,
          ],
      });

      continue;
    }

    const distancePct =
      Math.abs(
        percentChange(
          lastCluster.price,
          level.price
        )
      );

    if (
      distancePct <=
      clusterPct
    ) {
      lastCluster.totalVolume +=
        level.volume;

      lastCluster.levels.push(
        level
      );

      const weightedPrice =
        lastCluster.levels.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.price *
              item.volume,
          0
        ) /
        lastCluster.totalVolume;

      lastCluster.price =
        weightedPrice;
    } else {
      clusters.push({
        price:
          level.price,

        totalVolume:
          level.volume,

        levels:
          [
            level,
          ],
      });
    }
  }

  return clusters;
}

/* ============================================================
   WALL RATING
============================================================ */

function calculateWallRating(
  wallVolume,
  averageVolume,
  distancePct
) {
  if (
    wallVolume <=
      0 ||
    averageVolume <=
      0
  ) {
    return 1;
  }

  const ratio =
    wallVolume /
    averageVolume;

  let rating =
    1;

  if (
    ratio >=
    1.20
  ) {
    rating =
      2;
  }

  if (
    ratio >=
    1.50
  ) {
    rating =
      3;
  }

  if (
    ratio >=
    2.00
  ) {
    rating =
      4;
  }

  if (
    ratio >=
    2.75
  ) {
    rating =
      5;
  }

  if (
    ratio >=
    3.50
  ) {
    rating =
      6;
  }

  if (
    ratio >=
    4.50
  ) {
    rating =
      7;
  }

  if (
    ratio >=
    6.00
  ) {
    rating =
      8;
  }

  if (
    ratio >=
    8.00
  ) {
    rating =
      9;
  }

  if (
    ratio >=
    10.00
  ) {
    rating =
      10;
  }

  /*
    Nearby walls are more relevant.
  */

  if (
    distancePct <=
    0.25
  ) {
    rating +=
      1;
  } else if (
    distancePct >=
    2.00
  ) {
    rating -=
      1;
  }

  return clamp(
    Math.round(
      rating
    ),
    1,
    10
  );
}

/* ============================================================
   FIND STRONGEST ORDERBOOK WALL
============================================================ */

function findStrongestWall(
  levels,
  currentPrice,
  coin,
  side
) {
  if (
    !Array.isArray(
      levels
    ) ||
    !levels.length ||
    currentPrice <=
      0
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

  const rangedLevels =
    filterOrderBookRange(
      levels,
      currentPrice,
      rangePct,
      side
    );

  if (
    !rangedLevels.length
  ) {
    return null;
  }

  const clusters =
    clusterOrderBookLevels(
      rangedLevels,
      clusterPct,
      side
    );

  if (
    !clusters.length
  ) {
    return null;
  }

  const averageVolume =
    average(
      clusters.map(
        (cluster) =>
          cluster.totalVolume
      )
    );

  let best =
    null;

  for (
    const cluster of
    clusters
  ) {
    const distancePct =
      Math.abs(
        percentChange(
          currentPrice,
          cluster.price
        )
      );

    const ratio =
      averageVolume >
        0
        ? cluster.totalVolume /
          averageVolume
        : 0;

    if (
      ratio <
      MIN_WALL_RELATIVE_RATIO
    ) {
      continue;
    }

    const rating =
      calculateWallRating(
        cluster.totalVolume,
        averageVolume,
        distancePct
      );

    const distanceFactor =
      1 /
      (
        1 +
        distancePct *
          WALL_DISTANCE_WEIGHT
      );

    const score =
      ratio *
      distanceFactor;

    const candidate = {
      price:
        cluster.price,

      volume:
        cluster.totalVolume,

      ratio,

      rating,

      distancePct,

      score,

      levelCount:
        cluster.levels.length,
    };

    if (
      !best ||
      candidate.score >
        best.score
    ) {
      best =
        candidate;
    }
  }

  return best;
}

/* ============================================================
   MARKET STRUCTURE SNAPSHOT
============================================================ */

async function getMarketStructureSnapshot(
  coin,
  currentPrice = null
) {
  const ticker =
    currentPrice
      ? {
          currentPrice,
        }
      : await getTicker(
          coin
        );

  if (
    !ticker ||
    !ticker.currentPrice
  ) {
    return null;
  }

  const price =
    ticker.currentPrice;

  const orderBook =
    await getTopOrderBook(
      coin
    );

  if (
    !orderBook
  ) {
    return {
      coin,

      currentPrice:
        price,

      support:
        null,

      resistance:
        null,

      timestamp:
        Date.now(),
    };
  }

  const support =
    findStrongestWall(
      orderBook.bids,
      price,
      coin,
      "BID"
    );

  const resistance =
    findStrongestWall(
      orderBook.asks,
      price,
      coin,
      "ASK"
    );

  return {
    coin,

    currentPrice:
      price,

    support,
    resistance,

    timestamp:
      Date.now(),
  };
}

/* ============================================================
   EXECUTION STRUCTURE SNAPSHOT
============================================================ */
async function getExecutionStructureSnapshot(
  coin,
  currentPrice = null
) {
  const structure =
    await getMarketStructureSnapshot(
      coin,
      currentPrice
    );

  if (
    !structure
  ) {
    return null;
  }

  const flow =
    getExecutedFlowSummary(
      coin,
      5 *
        60 *
        1000
    );

  const priceResponse =
    getExecutedPriceResponse(
      coin,
      5 *
        60 *
        1000
    );

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

  const buyPct =
    flow &&
    flow.totalCount >
      0
      ? safeNumber(
          flow.buyVolumePct,
          50
        )
      : 50;

  const sellPct =
    flow &&
    flow.totalCount >
      0
      ? safeNumber(
          flow.sellVolumePct,
          50
        )
      : 50;

  const pressure =
    getPressureLabel(
      buyPct,
      sellPct
    );

  const change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change,
          0
        )
      : 0;

  const direction =
    getMarketDirection(
      change15m
    );

  const support =
    structure.support ||
    null;

  const resistance =
    structure.resistance ||
    null;

  const supportPrice =
    support?.price ||
    null;

  const resistancePrice =
    resistance?.price ||
    null;

  let meaningfulResistancePrice =
    null;

  if (
    resistance &&
    safeNumber(
      resistance.rating,
      0
    ) >=
      MEANINGFUL_RESISTANCE_MIN_RATING
  ) {
    meaningfulResistancePrice =
      resistance.price;
  }

  return {
    ...structure,

    flow,

    priceResponse,

    snapshot15m,

    snapshot60m,

    pressure,

    direction,

    support,

    resistance,

    supportPrice,

    resistancePrice,

    meaningfulResistancePrice,
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

   1H bearish tidak terus DON'T BUY.

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

  /*
    PENTING UNTUK UPDATE BARU:

    Kalau 5M/RSI sudah ada tetapi
    data 1H belum ready,
    jangan paksa balik COLLECTING.

    Kita masih boleh baca fast direction.
  */

  const fastReady =
    Boolean(
      candle5m.ready &&
      rsi5m.ready
    );

  const contextReady =
    Boolean(
      candle1h.ready &&
      ma1h.ready
    );

  if (
    !fastReady
  ) {
    return {
      ready:
        false,

      fastReady:
        false,

      contextReady,

      status:
        "WAIT_FAST_DATA",

      scoreModifier:
        0,

      hardBearish:
        false,

      fiveMinutePositive:
        false,

      fiveMinuteNegative:
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

  /*
    Kalau 1H belum ready,
    jangan block fast reversal.
  */

  const oneHourBearish =
    Boolean(
      contextReady &&
      candle1h.strongBearish &&
      !ma1h.bullish &&
      !ma1h.nearCross
    );

  const oneHourSupportive =
    Boolean(
      contextReady &&
      (
        ma1h.bullish ||
        ma1h.nearCross ||
        candle1h.bullish ||
        candle1h.strongBullish
      )
    );

  const hardBearish =
    Boolean(
      contextReady &&
      oneHourBearish &&
      fiveMinuteNegative &&
      candle5m.strongBearish
    );

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
    contextReady &&
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
    /*
      Ini penting.

      Walaupun 1H belum bullish,
      5M reversal dah dibenarkan
      buka CEK MOMENTUM.
    */
    status =
      "FAST_MOMENTUM_POSITIVE";
  } else if (
    fiveMinuteNegative
  ) {
    status =
      "FAST_MOMENTUM_NEGATIVE";
  } else if (
    oneHourBearish
  ) {
    status =
      "BEARISH_CONTEXT";
  }

  return {
    /*
      ready = fast layer sudah boleh
      digunakan untuk keputusan awal.
    */
    ready:
      true,

    fastReady:
      true,

    contextReady,

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
   GRT SUSTAINED MOVE DETECTOR

   NEW DESIGN:

   5M  = FAST TRIGGER
   15M = MOMENTUM BACKBONE
   30M = EXTENDED CONTEXT

   IMPORTANT:

   Kalau 5M selepas spike jadi kecil,
   tetapi 15M masih kuat,
   momentum TIDAK dianggap hilang.

   Contoh sebenar:

   4:49
   5M  +1.27%
   15M +1.27%

   4:54
   5M  +0.14%
   15M +1.41%

   4:59
   5M  +0.14%
   15M +1.55%

   Dalam keadaan macam ini,
   engine mesti kekalkan
   upward momentum.
============================================================ */

function getGRTSustainedMove(
  currentPrice
) {
  /*
    Update history dulu.

    Ini membolehkan engine scan 1 minit
    membina progression harga sendiri.
  */

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

      momentum15mActive:
        false,

      momentum15mStrong:
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

      higherMovePct:
        50,

      lowerMovePct:
        50,
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
    Kita tengok directional sequence
    10 minit terakhir.

    Bukan satu tick sahaja.
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
    let index =
      1;
    index <
      recent.length;
    index++
  ) {
    const previous =
      recent[
        index - 1
      ].price;

    const current =
      recent[
        index
      ].price;

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

  const lowerMovePct =
    directionalMoves >
      0
      ? (
          lowerMoves /
          directionalMoves
        ) * 100
      : 50;

  /*
    ============================================================
    15M MOMENTUM BACKBONE
    ============================================================

    Ini correction utama kita.

    15M tak trigger BUY sendiri.

    Tetapi jika 15M masih kuat,
    engine tak boleh lupa momentum
    hanya sebab latest 5M jadi kecil.
  */

  const momentum15mActive =
    Boolean(
      change15m >=
        GRT_SUSTAINED_15M_MOVE_PCT &&
      higherMovePct >=
        GRT_DIRECTION_MIN_SEQUENCE_PCT
    );

  const momentum15mStrong =
    Boolean(
      change15m >=
        GRT_ACCELERATION_15M_MOVE_PCT &&
      higherMovePct >=
        GRT_DIRECTION_MIN_SEQUENCE_PCT
    );

  /*
    Banding latest 5M
    dengan previous 5M section.

    Example:

    10M change = +1.40
    latest 5M  = +0.20

    previous 5M approximately:
    +1.20
  */

  const previous5mChange =
    change10m -
    change5m;

  /*
    ============================================================
    ACCELERATION
    ============================================================

    NAIK LAJU boleh datang daripada:

    1. latest 5M sangat kuat,
    2. latest 5M mempercepat,
    3. 15M sudah kuat,
    4. 30M progression sangat kuat.

    15M intentionally diberi
    authority lebih tinggi.
  */

  const accelerating =
    Boolean(
      (
        (
          change5m >=
            GRT_ACCELERATION_5M_MOVE_PCT &&
          change5m >
            previous5mChange
        ) ||
        momentum15mStrong ||
        change30m >=
          GRT_ACCELERATION_30M_MOVE_PCT
      ) &&
      higherMovePct >=
        GRT_DIRECTION_MIN_SEQUENCE_PCT
    );

  /*
    ============================================================
    SUSTAINED MOMENTUM
    ============================================================

    5M boleh trigger awal.

    15M pula boleh KEEP momentum alive.
  */

  const sustained =
    Boolean(
      (
        change5m >=
          0.25 ||
        change10m >=
          0.45 ||
        momentum15mActive ||
        change30m >=
          GRT_SUSTAINED_30M_MOVE_PCT
      ) &&
      higherMovePct >=
        GRT_DIRECTION_MIN_SEQUENCE_PCT
    );

  /*
    ============================================================
    FAST RE-EVALUATE
    ============================================================

    Jangan tunggu validation terlalu lama
    jika price sudah bergerak nyata.

    15M strong sekarang juga boleh
    force re-evaluation.

    Ini penting untuk kes:
    5M +0.14
    tetapi 15M +1.41.
  */

  const fastReevaluate =
    Boolean(
      (
        change30m >=
          GRT_FAST_REEVALUATE_30M_MOVE_PCT ||
        momentum15mStrong ||
        change5m >=
          GRT_ACCELERATION_5M_MOVE_PCT
      ) &&
      higherMovePct >=
        GRT_DIRECTION_MIN_SEQUENCE_PCT
    );

  /*
    ============================================================
    SCORE
    ============================================================

    15M sengaja diberi score lebih besar
    sebab ia backbone momentum kita.
  */

  let score =
    0;

  if (
    change5m >=
    GRT_DIRECTION_SLOW_UP_5M_PCT
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
    change5m >=
    GRT_ACCELERATION_5M_MOVE_PCT
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

  /*
    15M backbone.
  */

  if (
    momentum15mActive
  ) {
    score +=
      2;
  }

  if (
    momentum15mStrong
  ) {
    score +=
      2;
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
    higherMovePct >=
    70
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

  /*
    Negative sequence penalty.

    Jangan classify upward momentum
    kalau price sequence sudah mula
    jelas breakdown.
  */

  if (
    lowerMovePct >=
      65 &&
    change5m <
      0
  ) {
    score -=
      2;
  }

  return {
    ready:
      true,

    sustained,

    accelerating,

    fastReevaluate,

    momentum15mActive,

    momentum15mStrong,

    score,

    change5m,
    change10m,
    change15m,
    change30m,

    previous5mChange,

    higherMoves,
    lowerMoves,

    higherMovePct,
    lowerMovePct,

    sampleCount:
      recent.length,
  };
}

/* ============================================================
   GRT DIRECTION + MOMENTUM MERGE

   Purpose:

   Gabungkan FAST DIRECTION
   dengan 15M BACKBONE.

   Ini memastikan alert konsisten
   dengan graf.

   Example:

   5M  +0.14%
   15M +1.41%

   Direction jangan jadi flat/drop.
============================================================ */

function mergeGRTDirectionWithMomentum(
  fastDirection,
  sustainedMove
) {
  if (
    !fastDirection?.ready &&
    !sustainedMove?.ready
  ) {
    return {
      ready:
        false,

      direction:
        GRT_MOMENTUM_RUNTIME
          .lastDirection ||
        "UNKNOWN",
    };
  }

  let direction =
    fastDirection?.direction ||
    GRT_MOMENTUM_RUNTIME
      .lastDirection ||
    "UNKNOWN";

  /*
    15M strong overrides
    weak latest 5M reading.

    Tapi kalau latest 5M dah breakdown
    jelas, jangan paksa NAIK.
  */

  const latest5mBreakingDown =
    Boolean(
      sustainedMove?.ready &&
      sustainedMove.change5m <=
        GRT_DIRECTION_ACTIVE_DROP_5M_PCT &&
      sustainedMove.lowerMovePct >=
        65
    );

  if (
    sustainedMove?.momentum15mStrong &&
    !latest5mBreakingDown
  ) {
    direction =
      "NAIK_LAJU";
  } else if (
    sustainedMove?.momentum15mActive &&
    !latest5mBreakingDown &&
    (
      direction ===
        "DROP_PERLAHAN" ||
      direction ===
        "UNKNOWN"
    )
  ) {
    direction =
      "NAIK_PERLAHAN";
  }

  /*
    Kalau latest 5M sendiri kuat,
    terus NAIK LAJU.
  */

  if (
    sustainedMove?.change5m >=
      GRT_DIRECTION_FAST_UP_5M_PCT &&
    sustainedMove.higherMovePct >=
      GRT_DIRECTION_MIN_SEQUENCE_PCT
  ) {
    direction =
      "NAIK_LAJU";
  }

  if (
    GRT_MOMENTUM_RUNTIME.lastDirection !==
    direction
  ) {
    GRT_MOMENTUM_RUNTIME.lastDirection =
      direction;

    GRT_MOMENTUM_RUNTIME.lastDirectionAt =
      Date.now();
  }

  return {
    ready:
      true,

    direction,

    directionText:
      formatGRTDirection(
        direction
      ),

    change5m:
      sustainedMove?.change5m ??
      fastDirection?.change5m ??
      0,

    change15m:
      sustainedMove?.change15m ??
      fastDirection?.change15m ??
      0,

    momentum15mActive:
      Boolean(
        sustainedMove
          ?.momentum15mActive
      ),

    momentum15mStrong:
      Boolean(
        sustainedMove
          ?.momentum15mStrong
      ),

    sustained:
      Boolean(
        sustainedMove
          ?.sustained
      ),

    accelerating:
      Boolean(
        sustainedMove
          ?.accelerating
      ),

    fastReevaluate:
      Boolean(
        sustainedMove
          ?.fastReevaluate
      ),
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

  /*
    NEW:
    15M backbone already active.

    Ini penting bila latest 5M kecil
    tetapi recovery 15M masih hidup.
  */

  if (
    sustainedMove
      ?.momentum15mActive
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

   Purpose:
   detect tradeable upward movement
   BEFORE textbook confirmation.

   Need combination of:
   - BUY pressure
   - price response
   - fast technical improvement
   - 15M momentum backbone
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

  /* ========================================================
     BUY EXPANSION
  ======================================================== */

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

  /* ========================================================
     BUYER DOMINANCE
  ======================================================== */

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

  /* ========================================================
     PRICE RESPONSE
  ======================================================== */

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

  /* ========================================================
     5M / 15M MOMENTUM
  ======================================================== */

  if (
    sustainedMove
      ?.sustained
  ) {
    score +=
      2;
  }

  /*
    15M backbone now gets
    explicit weight.
  */

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      1;
  }

  if (
    sustainedMove
      ?.accelerating
  ) {
    score +=
      1;
  }

  /* ========================================================
     FAST TECHNICAL LAYER
  ======================================================== */

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

    /*
      FAST_MOMENTUM_POSITIVE
      boleh hidup walaupun 1H
      belum bullish.
    */

    if (
      trend.status ===
        "FAST_MOMENTUM_POSITIVE" ||
      trend.status ===
        "UPWARD_ALLOWED"
    ) {
      score +=
        1;
    }
  }

  /* ========================================================
     LIQUIDITY
  ======================================================== */

  if (
    liquidity?.supportive
  ) {
    score +=
      1;
  }

  /*
    Weak resistance bukan bearish.
  */

  if (
    liquidity?.resistanceClass ===
    "WEAK"
  ) {
    score +=
      1;
  }

  /*
    Untuk detection kita masih perlu
    executed BUY evidence.

    Tetapi 15M backbone boleh bantu
    capai threshold lebih cepat.
  */

  const detected =
    score >=
      7 &&
    buyVolumePct >=
      54 &&
    (
      priceResponsePct >
        0 ||
      sustainedMove
        ?.momentum15mStrong
    );

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

   Ini tempat engine patut mula
   aggressive dan berhenti tunggu
   terlalu lama.
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

  /* ========================================================
     EXECUTED BUY PRESSURE
  ======================================================== */

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
    buyFrequencyPct >=
    55
  ) {
    score +=
      1;
  }

  /* ========================================================
     PRICE RESPONSE
  ======================================================== */

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

  /* ========================================================
     MOMENTUM BACKBONE
  ======================================================== */

  if (
    sustainedMove
      ?.sustained
  ) {
    score +=
      1;
  }

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score +=
      1;
  }

  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.accelerating
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.fastReevaluate
  ) {
    score +=
      1;
  }

  /* ========================================================
     TECHNICAL
  ======================================================== */

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
    trend?.status ===
      "UPWARD_ALLOWED" ||
    trend?.status ===
      "FAST_MOMENTUM_POSITIVE"
  ) {
    score +=
      1;
  }

  /* ========================================================
     LIQUIDITY
  ======================================================== */

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
    (
      priceResponsePct >
        0 ||
      sustainedMove
        ?.momentum15mStrong
    );

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
   GRT MOMENTUM SCORE

   Combines all layers.

   Current movement gets priority.

   1H context cannot overpower
   obvious fresh 5M/15M momentum.
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
    sustainedMove
      ?.sustained
  ) {
    score +=
      2;
  }

  /*
    15M backbone explicit weighting.
  */

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.accelerating
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.fastReevaluate
  ) {
    score +=
      1;
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
    baseline
      ?.buyIncreasePct;

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
    baseline
      ?.current
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
    priceResponse
      ?.changePct;

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

   RULE BARU:

   GRT_VALIDATION_MAX_MS = 10 MINIT.

   10 minit = MAXIMUM.

   BUKAN wajib tunggu 10 minit.

   Engine scan setiap 1 minit boleh
   BUY NOW / DON'T BUY lebih awal.
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

      /*
        Untuk alert 5 minit:

        0 = belum validating
        1 = first 5M cycle
        2 = second 5M cycle / deadline
      */

      alertCycle:
        0,
    };
  }

  const ageMs =
    Date.now() -
    GRT_MOMENTUM_RUNTIME
      .validationStartedAt;

  const ageMinutes =
    ageMs /
    60000;

  return {
    active:
      true,

    expired:
      ageMs >=
      timeoutMs,

    ageMs,

    ageMinutes,

    timeoutMs,

    alertCycle:
      Math.floor(
        ageMinutes /
        5
      ) +
      1,
  };
}

/* ============================================================
   START VALIDATION WHEN NEEDED

   Validation timer hanya start
   apabila upward candidate sebenar
   telah dikesan.

   Jangan start timer hanya kerana
   market sedang DROP.
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
   CLEAR VALIDATION

   Digunakan bila:
   - BUY NOW confirmed
   - validation failed
   - market clearly returned downward
============================================================ */

function clearGRTValidation() {
  GRT_MOMENTUM_RUNTIME
    .validationStartedAt =
    null;

  GRT_MOMENTUM_RUNTIME
    .candidateStartedAt =
    null;
}
/* ============================================================
   GRT FINAL MOMENTUM DECISION

   FINAL USER STATES:

   🟡 COLLECTING MARKET DATA
   🔴 DON'T BUY
   🟠 CEK MOMENTUM
   🟢 BUY NOW

   DIRECTION:

   📉 MASIH DROP
   📉 DROP PERLAHAN
   📈 NAIK PERLAHAN
   🚀 NAIK LAJU

   CORE RULE:

   5M  = FAST TRIGGER
   15M = MOMENTUM BACKBONE
   1H  = CONTEXT ONLY

   IMPORTANT:

   DON'T BUY tidak boleh kembali
   COLLECTING hanya kerana satu
   cycle data kurang lengkap.

   VALIDATION MAXIMUM = 10 MINIT.
   BUY NOW boleh keluar lebih awal.
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
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      direction:
        GRT_MOMENTUM_RUNTIME
          .lastDirection ||
        "UNKNOWN",

      directionText:
        formatGRTDirection(
          GRT_MOMENTUM_RUNTIME
            .lastDirection
        ),
    };
  }

  const currentPrice =
    ticker.currentPrice;

  /* ========================================================
     PRICE DIRECTION FIRST

     Direction mesti dinilai sebelum
     BUY-flow validation.

     Ini yang memastikan graf sudah
     naik → bot sedar lebih awal.
  ======================================================== */

  updateGRTMomentumPriceHistory(
    currentPrice
  );

  const fastDirection =
    getGRTFastDirection(
      currentPrice
    );

  /*
    getGRTSustainedMove() juga memanggil
    update history.

    Duplicate sample dilindungi oleh
    fungsi history kita.
  */

  const sustainedMove =
    getGRTSustainedMove(
      currentPrice
    );

  const directionState =
    mergeGRTDirectionWithMomentum(
      fastDirection,
      sustainedMove
    );

  const direction =
    directionState.direction;

  const directionText =
    directionState.directionText ||
    formatGRTDirection(
      direction
    );

  /* ========================================================
     LOAD CONFIRMATION LAYERS
  ======================================================== */

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

  /* ========================================================
     DATA READINESS

     CRITICAL CHANGE:

     Kalau direction dah diketahui,
     missing BUY baseline / technical
     data TAK BOLEH sentiasa paksa
     COLLECTING.

     COLLECTING hanya digunakan ketika
     kita betul-betul belum tahu
     keadaan market.
  ======================================================== */

  const confirmationReady =
    Boolean(
      baseline?.ready &&
      trend?.ready
    );

  const directionKnown =
    Boolean(
      direction &&
      direction !==
        "UNKNOWN"
    );

  if (
    !confirmationReady &&
    !directionKnown
  ) {
    setGRTMomentumPhase(
      "COLLECTING"
    );

    setGRTLastDecision(
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

      direction,
      directionText,

      sustainedMove,
      baseline,
      trend,
      liquidity,
      btcSurge,
      priceResponse,
    };
  }

  /* ========================================================
     DOWNWARD MARKET BEFORE FULL CONFIRMATION

     Kalau kita dah tahu graf masih
     menurun, tak perlu tulis
     COLLECTING.

     User memang nak:
     DON'T BUY + direction.
  ======================================================== */

  if (
    !confirmationReady &&
    (
      direction ===
        "MASIH_DROP" ||
      direction ===
        "DROP_PERLAHAN"
    )
  ) {
    clearGRTValidation();

    setGRTMomentumPhase(
      "NO_ENTRY"
    );

    setGRTLastDecision(
      "DONT_BUY"
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "NO_ENTRY",

      text:
        "🔴 DON'T BUY",

      reason:
        direction ===
          "MASIH_DROP"
          ? "PRICE STILL DROPPING"
          : "PRICE STILL WEAK",

      currentPrice,

      direction,
      directionText,

      sustainedMove,
      baseline,
      trend,
      liquidity,
      btcSurge,
      priceResponse,
    };
  }

  /* ========================================================
     UPWARD PRICE DETECTED BUT
     CONFIRMATION DATA NOT READY

     THIS IS NOT COLLECTING.

     Harga sudah bagi signal.
     Sekarang kita CEK MOMENTUM.
  ======================================================== */

  if (
    !confirmationReady &&
    (
      direction ===
        "NAIK_PERLAHAN" ||
      direction ===
        "NAIK_LAJU"
    )
  ) {
    ensureGRTValidationStarted();

    setGRTMomentumPhase(
      "VERIFYING"
    );

    setGRTLastDecision(
      "CEK_MOMENTUM"
    );

    return {
      status:
        "VERIFYING",

      phase:
        "VERIFYING",

      text:
        "🟠 CEK MOMENTUM",

      reason:
        "UPWARD PRICE DETECTED",

      currentPrice,

      direction,
      directionText,

      sustainedMove,
      baseline,
      trend,
      liquidity,
      btcSurge,
      priceResponse,

      validation:
        getGRTValidationState(),
    };
  }

  /* ========================================================
     DETECT MOMENTUM STAGES
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
     CURRENT EXECUTED FLOW
  ======================================================== */

  const rawBuyIncrease =
    safeNumber(
      baseline
        ?.buyIncreasePct,
      -100
    );

  const rawBuyPct =
    safeNumber(
      baseline
        ?.current
        ?.buyVolumePct,
      0
    );

  const rawSellPct =
    safeNumber(
      baseline
        ?.current
        ?.sellVolumePct,
      0
    );

  const rawBuyFrequency =
    safeNumber(
      baseline
        ?.current
        ?.buyFrequencyPct,
      0
    );

  const priceResponsePct =
    priceResponse?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  /* ========================================================
     HARD VETO

     Genuine danger only.

     1H bearish sahaja TIDAK cukup
     untuk veto fresh 5M/15M run.
  ======================================================== */

  const hardBearish =
    Boolean(
      trend?.hardBearish
    );

  const hardResistance =
    Boolean(
      liquidity?.ready &&
      liquidity
        .resistanceBlocking
    );

  const negativePriceFailure =
    Boolean(
      priceResponse?.ready &&
      priceResponsePct <=
        -0.35
    );

  const buyerCollapse =
    Boolean(
      rawBuyPct <
        42 &&
      rawSellPct >
        58
    );

  const activeBreakdown =
    Boolean(
      direction ===
        "MASIH_DROP" &&
      sustainedMove
        ?.change5m <
        0
    );

  const hardVeto =
    Boolean(
      hardBearish ||
      negativePriceFailure ||
      buyerCollapse ||
      activeBreakdown
    );

  /* ========================================================
     UPWARD CANDIDATE

     Price sendiri boleh trigger
     CEK MOMENTUM.

     Kita tak perlu tunggu BUY-flow
     detector dahulu untuk mula tengok.
  ======================================================== */

  const upwardCandidate =
    Boolean(
      direction ===
        "NAIK_PERLAHAN" ||
      direction ===
        "NAIK_LAJU" ||
      sustainedMove
        ?.sustained ||
      sustainedMove
        ?.momentum15mActive ||
      earlyMomentum
        .detected ||
      acceleration
        .detected
    );

  if (
    upwardCandidate
  ) {
    ensureGRTValidationStarted();
  }

  const validation =
    getGRTValidationState();

  /* ========================================================
     PHASE SELECTION
  ======================================================== */

  if (
    acceleration.detected ||
    sustainedMove
      ?.accelerating
  ) {
    setGRTMomentumPhase(
      "ACCELERATION"
    );
  } else if (
    earlyMomentum.detected ||
    sustainedMove
      ?.momentum15mStrong
  ) {
    setGRTMomentumPhase(
      "EARLY_MOMENTUM"
    );
  } else if (
    accumulation.detected
  ) {
    setGRTMomentumPhase(
      "ACCUMULATION"
    );
  } else if (
    upwardCandidate
  ) {
    setGRTMomentumPhase(
      "VERIFYING"
    );
  } else {
    setGRTMomentumPhase(
      "NO_ENTRY"
    );
  }

  /* ========================================================
     BUY NOW — PATH A
     ACCELERATION

     Strong current movement.

     Tidak perlu tunggu validation
     sampai 10 minit.
  ======================================================== */

  const accelerationBuy =
    Boolean(
      acceleration.detected &&
      score >=
        8 &&
      rawBuyPct >=
        58 &&
      !hardVeto &&
      !hardResistance &&
      (
        priceResponsePct >
          0 ||
        sustainedMove
          ?.momentum15mStrong
      )
    );

  /* ========================================================
     BUY NOW — PATH B
     EARLY + SUSTAINED

     Sesuai untuk gradual run.
  ======================================================== */

  const sustainedMomentumBuy =
    Boolean(
      earlyMomentum.detected &&
      sustainedMove
        ?.sustained &&
      score >=
        7 &&
      rawBuyPct >=
        54 &&
      !hardVeto &&
      !hardResistance &&
      (
        priceResponsePct >
          0 ||
        sustainedMove
          ?.momentum15mActive
      )
    );

  /* ========================================================
     BUY NOW — PATH C
     STRONG EXECUTED BUY FLOW
  ======================================================== */

  const strongFlowBuy =
    Boolean(
      rawBuyIncrease >=
        80 &&
      rawBuyPct >=
        62 &&
      rawBuyFrequency >=
        52 &&
      priceResponsePct >=
        0.15 &&
      score >=
        7 &&
      !hardVeto &&
      !hardResistance
    );

  /* ========================================================
     BUY NOW — PATH D
     FAST 5M BREAKOUT

     NEW.

     Kes seperti:
     +1.27% dalam 5 minit

     tak patut tunggu dua alert
     semata-mata untuk acknowledge
     momentum.

     Tetapi masih perlukan BUY flow.
  ======================================================== */

  const fastBreakoutBuy =
    Boolean(
      direction ===
        "NAIK_LAJU" &&
      sustainedMove
        ?.change5m >=
        GRT_ACCELERATION_5M_MOVE_PCT &&
      rawBuyPct >=
        58 &&
      rawBuyFrequency >=
        50 &&
      priceResponsePct >
        0 &&
      score >=
        7 &&
      !hardVeto &&
      !hardResistance
    );

  /* ========================================================
     BUY NOW — PATH E
     15M BACKBONE

     Example:

     5M  +0.14%
     15M +1.41%

     Latest 5M sudah perlahan,
     tetapi overall run masih hidup.
  ======================================================== */

  const backbone15mBuy =
    Boolean(
      sustainedMove
        ?.momentum15mStrong &&
      sustainedMove
        ?.change5m >=
        0 &&
      rawBuyPct >=
        56 &&
      rawBuyFrequency >=
        50 &&
      score >=
        8 &&
      !hardVeto &&
      !hardResistance
    );

  const buyNow =
    Boolean(
      accelerationBuy ||
      sustainedMomentumBuy ||
      strongFlowBuy ||
      fastBreakoutBuy ||
      backbone15mBuy
    );

  /* ========================================================
     BUY NOW RESULT
  ======================================================== */

  if (
    buyNow
  ) {
    setGRTMomentumPhase(
      "BUY_NOW"
    );

    setGRTLastDecision(
      "BUY_NOW"
    );

    GRT_MOMENTUM_RUNTIME
      .lastBuyNowAt =
      Date.now();

    clearGRTValidation();

    let reason =
      "MOMENTUM CONFIRMED";

    if (
      fastBreakoutBuy
    ) {
      reason =
        "FAST 5M BREAKOUT";
    } else if (
      backbone15mBuy
    ) {
      reason =
        "15M MOMENTUM CONFIRMED";
    } else if (
      accelerationBuy
    ) {
      reason =
        "ACCELERATION";
    } else if (
      sustainedMomentumBuy
    ) {
      reason =
        "SUSTAINED EARLY MOMENTUM";
    } else if (
      strongFlowBuy
    ) {
      reason =
        "STRONG BUY FLOW";
    }

    return {
      status:
        "BUY_NOW",

      phase:
        "BUY_NOW",

      text:
        "🟢 BUY NOW",

      reason,

      currentPrice,

      direction,
      directionText,

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
    };
  }

  /* ========================================================
     IMMEDIATE DON'T BUY

     Market memang masih jatuh.

     Tak ada sebab untuk VERIFYING
     upward momentum.
  ======================================================== */

  const clearlyDropping =
    Boolean(
      direction ===
        "MASIH_DROP" &&
      sustainedMove
        ?.change5m <
        0 &&
      !sustainedMove
        ?.momentum15mActive
    );

  if (
    clearlyDropping
  ) {
    clearGRTValidation();

    setGRTMomentumPhase(
      "NO_ENTRY"
    );

    setGRTLastDecision(
      "DONT_BUY"
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "NO_ENTRY",

      text:
        "🔴 DON'T BUY",

      reason:
        "MASIH DROP",

      currentPrice,

      direction,
      directionText,

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
    };
  }

  /* ========================================================
     HARD FAILURE DURING VALIDATION

     Tak perlu tunggu 10 minit kalau
     bukti dah jelas gagal.
  ======================================================== */

  if (
    hardVeto &&
    !sustainedMove
      ?.momentum15mStrong
  ) {
    clearGRTValidation();

    setGRTMomentumPhase(
      "NO_ENTRY"
    );

    setGRTLastDecision(
      "DONT_BUY"
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "NO_ENTRY",

      text:
        "🔴 DON'T BUY",

      reason:
        hardBearish
          ? "HARD BEARISH"
          : negativePriceFailure
            ? "PRICE FAILED"
            : buyerCollapse
              ? "BUYERS WEAK"
              : "MOMENTUM FAILED",

      currentPrice,

      direction,
      directionText,

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
    };
  }

  /* ========================================================
     VALIDATION TIMEOUT

     10 MINUTES MAXIMUM.

     Pada deadline, bot WAJIB decide.

     Tak boleh:
     VALIDATING → VALIDATING →
     VALIDATING berjam-jam.
  ======================================================== */

  if (
    validation.active &&
    validation.expired
  ) {
    /*
      Deadline rescue BUY:

      Momentum masih positif dan
      evidence hampir cukup.

      Kita benarkan BUY jika 15M
      masih kuat + buyers masih
      dominant.

      Ini bukan blind timeout BUY.
    */

    const timeoutBuy =
      Boolean(
        sustainedMove
          ?.momentum15mStrong &&
        sustainedMove
          ?.change5m >=
          0 &&
        rawBuyPct >=
          56 &&
        rawBuyFrequency >=
          50 &&
        score >=
          7 &&
        !hardVeto &&
        !hardResistance
      );

    if (
      timeoutBuy
    ) {
      setGRTMomentumPhase(
        "BUY_NOW"
      );

      setGRTLastDecision(
        "BUY_NOW"
      );

      GRT_MOMENTUM_RUNTIME
        .lastBuyNowAt =
        Date.now();

      clearGRTValidation();

      return {
        status:
          "BUY_NOW",

        phase:
          "BUY_NOW",

        text:
          "🟢 BUY NOW",

        reason:
          "15M MOMENTUM VALIDATED",

        currentPrice,

        direction,
        directionText,

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
      };
    }

    /*
      Kalau sampai deadline masih
      tak cukup bukti → DON'T BUY.
    */

    clearGRTValidation();

    setGRTMomentumPhase(
      "NO_ENTRY"
    );

    setGRTLastDecision(
      "DONT_BUY"
    );

    return {
      status:
        "NO_ENTRY",

      phase:
        "NO_ENTRY",

      text:
        "🔴 DON'T BUY",

      reason:
        "MOMENTUM NOT CONFIRMED",

      currentPrice,

      direction,
      directionText,

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
    };
  }

  /* ========================================================
     CEK MOMENTUM

     Upward move exists,
     tetapi BUY belum cukup confirm.

     Kekal scan.

     Tidak dipanggil COLLECTING.
  ======================================================== */

  if (
    upwardCandidate
  ) {
    setGRTMomentumPhase(
      "VERIFYING"
    );

    setGRTLastDecision(
      "CEK_MOMENTUM"
    );

    return {
      status:
        "VERIFYING",

      phase:
        "VERIFYING",

      text:
        "🟠 CEK MOMENTUM",

      reason:
        sustainedMove
          ?.fastReevaluate
          ? "FAST RECHECK"
          : sustainedMove
              ?.momentum15mStrong
            ? "15M MOMENTUM STRONG"
            : sustainedMove
                ?.momentum15mActive
              ? "15M MOMENTUM ACTIVE"
              : "UPWARD MOVE DETECTED",

      currentPrice,

      direction,
      directionText,

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
    };
  }

  /* ========================================================
     DROP PERLAHAN / NO UPWARD CANDIDATE

     Stick with DON'T BUY.

     THIS FIXES:

     DON'T BUY
        ↓
     next 5 min
        ↓
     COLLECTING   ❌

     Sekarang:

     DON'T BUY
        ↓
     DROP PERLAHAN
        ↓
     DON'T BUY    ✅
  ======================================================== */

  clearGRTValidation();

  setGRTMomentumPhase(
    "NO_ENTRY"
  );

  setGRTLastDecision(
    "DONT_BUY"
  );

  return {
    status:
      "NO_ENTRY",

    phase:
      "NO_ENTRY",

    text:
      "🔴 DON'T BUY",

    reason:
      direction ===
        "DROP_PERLAHAN"
        ? "DROP PERLAHAN"
        : "NO UPWARD MOMENTUM",

    currentPrice,

    direction,
    directionText,

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
  };
}
/* ============================================================
   GRT FINAL DECISION DISPLAY

   ONE SOURCE OF TRUTH.

   Semua modul mesti guna
   keputusan yang sama:

   PRICE ALERT
   MARKET STRUCTURE
   SCALPING SCANNER

   FINAL DISPLAY STATES:

   🟡 COLLECTING MARKET DATA

   🔴 DON'T BUY
   📉 MASIH DROP

   🔴 DON'T BUY
   📉 DROP PERLAHAN

   🟠 CEK MOMENTUM
   📈 NAIK PERLAHAN
   🔎 VALIDATING

   🟠 CEK MOMENTUM
   🚀 NAIK LAJU
   🔎 VALIDATING

   🟢 BUY NOW
   🚀 NAIK LAJU
============================================================ */

function normalizeGRTDecision(
  decision
) {
  /*
    No decision at all.

    COLLECTING hanya untuk keadaan
    betul-betul belum mempunyai
    keputusan market.
  */

  if (
    !decision
  ) {
    return {
      status:
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      direction:
        "UNKNOWN",

      directionText:
        "",

      criteria:
        "COLLECTING DATA",

      actionable:
        false,

      validating:
        false,
    };
  }

  const direction =
    decision.direction ||
    GRT_MOMENTUM_RUNTIME
      .lastDirection ||
    "UNKNOWN";

  const directionText =
    decision.directionText ||
    (
      direction !==
        "UNKNOWN"
        ? formatGRTDirection(
            direction
          )
        : ""
    );

  /* ========================================================
     BUY NOW
  ======================================================== */

  if (
    decision.status ===
    "BUY_NOW"
  ) {
    return {
      status:
        "BUY_NOW",

      text:
        "🟢 BUY NOW",

      direction,

      directionText,

      criteria:
        decision.reason ||
        "MOMENTUM CONFIRMED",

      actionable:
        true,

      validating:
        false,
    };
  }

  /* ========================================================
     CEK MOMENTUM / VERIFYING

     User tak perlu nampak:
     WATCHING_MOVE
     EARLY_MOMENTUM
     ACCELERATION
     FINAL_CHECK

     Itu internal engine sahaja.

     Paparan user kekal:
     CEK MOMENTUM
     + direction
     + VALIDATING
  ======================================================== */

  if (
    decision.status ===
    "VERIFYING"
  ) {
    return {
      status:
        "VERIFYING",

      text:
        "🟠 CEK MOMENTUM",

      direction,

      directionText,

      criteria:
        decision.reason ||
        "VALIDATING MOMENTUM",

      actionable:
        false,

      validating:
        true,
    };
  }

  /* ========================================================
     COLLECTING

     PENTING:

     Kalau engine pernah READY
     atau kita sudah tahu direction,
     jangan paparkan COLLECTING lagi.

     Stick dengan last valid decision.
  ======================================================== */

  if (
    decision.status ===
    "COLLECTING"
  ) {
    const directionKnown =
      Boolean(
        direction &&
        direction !==
          "UNKNOWN"
      );

    if (
      GRT_ENGINE_HAS_BEEN_READY ||
      directionKnown
    ) {
      /*
        Kalau last decision BUY NOW,
        jangan kekalkan BUY NOW
        hanya sebab current data hilang.

        Safe fallback = DON'T BUY.
      */

      return {
        status:
          "NO_ENTRY",

        text:
          "🔴 DON'T BUY",

        direction,

        directionText,

        criteria:
          "WAITING FOR FRESH CONFIRMATION",

        actionable:
          false,

        validating:
          false,
      };
    }

    return {
      status:
        "COLLECTING",

      text:
        "🟡 COLLECTING MARKET DATA",

      direction,

      directionText:
        "",

      criteria:
        "COLLECTING DATA",

      actionable:
        false,

      validating:
        false,
    };
  }

  /* ========================================================
     DON'T BUY
  ======================================================== */

  return {
    status:
      "NO_ENTRY",

    text:
      "🔴 DON'T BUY",

    direction,

    directionText,

    criteria:
      decision.reason ||
      "NO QUALIFIED MOMENTUM",

    actionable:
      false,

    validating:
      false,
  };
}

/* ============================================================
   MARK ENGINE AS READY

   Bila engine pernah berjaya menghasilkan
   BUY / DON'T BUY / CEK MOMENTUM,
   COLLECTING tak boleh lagi ambil alih
   hanya kerana satu cycle data tak lengkap.
============================================================ */

function markGRTEngineReady(
  decision
) {
  if (
    !decision
  ) {
    return;
  }

  if (
    [
      "BUY_NOW",
      "VERIFYING",
      "NO_ENTRY",
    ].includes(
      decision.status
    )
  ) {
    GRT_ENGINE_HAS_BEEN_READY =
      true;
  }
}

/* ============================================================
   GRT PRICE ALERT DISPLAY HELPER

   IMPORTANT:

   5M / 15M TIDAK dimasukkan di sini.

   Sebab kita dah lock format:
   5M / 15M mesti duduk BETUL-BETUL
   bawah harga GRT dalam sendPriceAlert().

   Helper ini hanya urus:
   KEPUTUSAN + DIRECTION + VALIDATING.
============================================================ */

function buildGRTMomentumAlertText(
  decision
) {
  markGRTEngineReady(
    decision
  );

  const normalized =
    normalizeGRTDecision(
      decision
    );

  /*
    COLLECTING:
    satu line sahaja.
  */

  if (
    normalized.status ===
    "COLLECTING"
  ) {
    return normalized.text;
  }

  /*
    BUY NOW:
    BUY NOW + direction.
  */

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    return [
      `⚡ ${normalized.text}`,

      normalized.directionText,
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );
  }

  /*
    CEK MOMENTUM:
    CEK MOMENTUM
    direction
    VALIDATING
  */

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    return [
      `⚡ ${normalized.text}`,

      normalized.directionText,

      "🔎 VALIDATING",
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );
  }

  /*
    DON'T BUY:
    DON'T BUY + direction.
  */

  return [
    `⚡ ${normalized.text}`,

    normalized.directionText,
  ]
    .filter(
      Boolean
    )
    .join(
      "\n"
    );
}

/* ============================================================
   GRT DECISION CRITERIA HELPER

   Digunakan oleh Market Structure.

   Market Structure boleh tunjuk sebab
   lebih detail.

   Price Alert kekal compact.
============================================================ */

function getGRTDecisionCriteria(
  decision
) {
  const normalized =
    normalizeGRTDecision(
      decision
    );

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    return (
      decision?.reason ||
      "MOMENTUM CONFIRMED"
    );
  }

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    return (
      decision?.reason ||
      "VALIDATING MOMENTUM"
    );
  }

  if (
    normalized.status ===
    "COLLECTING"
  ) {
    return "COLLECTING DATA";
  }

  return (
    decision?.reason ||
    "DON'T BUY"
  );
}
/* ============================================================
   GRT BUY NOW COOLDOWN

   Purpose:

   BUY NOW engine boleh scan setiap 1 minit,
   tetapi kita tak mahu signal BUY yang sama
   direkod / dihantar berulang kali.

   IMPORTANT:

   Cooldown TIDAK block analysis.

   Bot masih terus:
   - scan price
   - update direction
   - update momentum
   - monitor active trade

   Cooldown hanya lindungi
   duplicate BUY NOW signal.
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

      remainingMinutes:
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

    remainingMinutes:
      Math.max(
        0,
        remainingMs
      ) /
      60000,
  };
}

/* ============================================================
   GRT BUY NOW SIGNAL HANDLER

   ONE BUY NOW HANDLER.

   Semua source seperti:

   - 1 MIN momentum scanner
   - 5 MIN Price Alert
   - Market Structure

   boleh menggunakan handler yang sama.

   Ini mengelakkan duplicate logic.
============================================================ */

async function handleGRTBuyNowSignal(
  ticker,
  momentumDecision
) {
  if (
    !ticker ||
    !momentumDecision
  ) {
    return {
      handled:
        false,

      reason:
        "MISSING DATA",
    };
  }

  if (
    momentumDecision.status !==
    "BUY_NOW"
  ) {
    return {
      handled:
        false,

      reason:
        "NOT BUY NOW",
    };
  }

  const cooldown =
    getGRTBuyNowCooldown();

  /*
    ==========================================================
    NEW SIGNAL

    Record learning/statistics hanya
    sekali apabila cooldown tak active.
    ==========================================================
  */

  if (
    !cooldown.active
  ) {
    LAST_GRT_BUY_NOW_SIGNAL =
      Date.now();

    /*
      Simpan signal untuk:
      /buytest
      /buylast
      tuning / learning engine.

      Function ini berada di bahagian
      BUY NOW learning nanti.
    */

    recordGRTBuyNowSignal(
      ticker,
      momentumDecision
    );
  }

  /*
    ==========================================================
    SCALPING ENTRY HANDLER

    triggerMomentumScalpingEntry()
    sendiri nanti akan semak:

    - active trade
    - pending entry
    - entry room
    - TP
    - resistance
    - quantity
    - fee
    - cooldown protection

    Jadi BUY NOW di sini bukan bermaksud
    blind market buy.
    ==========================================================
  */

  const entryResult =
    await triggerMomentumScalpingEntry(
      ticker,
      momentumDecision
    );

  return {
    handled:
      true,

    cooldownActive:
      cooldown.active,

    cooldownRemainingMs:
      cooldown.remainingMs,

    entryResult:
      entryResult ||
      null,
  };
}

/* ============================================================
   GRT MOMENTUM MASTER SNAPSHOT

   Purpose:

   Satu function untuk modules lain
   mendapatkan momentum decision GRT
   yang sama.

   Price Alert
   Market Structure
   Scanner

   tidak patut bina decision sendiri.
============================================================ */

async function getGRTMomentumSnapshot(
  ticker =
    null
) {
  let activeTicker =
    ticker;

  if (
    !activeTicker
  ) {
    activeTicker =
      await getTicker(
        "GRT"
      );
  }

  if (
    !activeTicker
  ) {
    return {
      ticker:
        null,

      decision: {
        status:
          GRT_ENGINE_HAS_BEEN_READY
            ? "NO_ENTRY"
            : "COLLECTING",

        phase:
          GRT_ENGINE_HAS_BEEN_READY
            ? "NO_ENTRY"
            : "COLLECTING",

        text:
          GRT_ENGINE_HAS_BEEN_READY
            ? "🔴 DON'T BUY"
            : "🟡 COLLECTING MARKET DATA",

        direction:
          GRT_MOMENTUM_RUNTIME
            .lastDirection ||
          "UNKNOWN",

        directionText:
          formatGRTDirection(
            GRT_MOMENTUM_RUNTIME
              .lastDirection
          ),

        reason:
          GRT_ENGINE_HAS_BEEN_READY
            ? "TICKER TEMPORARILY UNAVAILABLE"
            : "WAITING FOR MARKET DATA",
      },

      normalized:
        null,
    };
  }

  const decision =
    await getGRTMomentumDecision(
      activeTicker
    );

  markGRTEngineReady(
    decision
  );

  const normalized =
    normalizeGRTDecision(
      decision
    );

  /*
    Simpan final decision supaya
    modules lain dan diagnostics
    mempunyai latest state.
  */

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    LAST_GRT_FINAL_DECISION =
      "BUY_NOW";
  } else if (
    normalized.status ===
    "VERIFYING"
  ) {
    LAST_GRT_FINAL_DECISION =
      "CEK_MOMENTUM";
  } else if (
    normalized.status ===
    "NO_ENTRY"
  ) {
    LAST_GRT_FINAL_DECISION =
      "DONT_BUY";
  } else {
    LAST_GRT_FINAL_DECISION =
      "COLLECTING";
  }

  return {
    ticker:
      activeTicker,

    decision,

    normalized,
  };
}

/* ============================================================
   GRT MOMENTUM SCAN + HANDLE

   Background scanner boleh guna
   function ini.

   Ia analyse dahulu.

   BUY NOW sahaja akan masuk
   signal handler.

   DON'T BUY / CEK MOMENTUM
   tidak trigger trade.
============================================================ */

async function scanGRTMomentumEngine() {
  const snapshot =
    await getGRTMomentumSnapshot();

  if (
    !snapshot ||
    !snapshot.ticker ||
    !snapshot.decision
  ) {
    return snapshot;
  }

  if (
    snapshot.decision.status ===
    "BUY_NOW"
  ) {
    await handleGRTBuyNowSignal(
      snapshot.ticker,
      snapshot.decision
    );
  }

  return snapshot;
}
/* ============================================================
   PRICE SNAPSHOT

   Used by:
   - Market Structure 15M
   - Market context
   - Direction calculation

   NOTE:
   GRT momentum engine sendiri sudah
   ada 5M trigger + 15M backbone.

   Fungsi ini untuk Market Structure,
   bukan menggantikan momentum engine.
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

    sampleCount:
      points.length,

    windowMs,
  };
}

/* ============================================================
   MARKET DIRECTION

   Market Structure uses mainly 15M.

   This is descriptive only.

   It MUST NOT independently override
   GRT final momentum decision.
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

   Based on executed BUY / SELL volume.

   This remains descriptive market data.

   GRT BUY NOW still comes from
   final momentum decision engine.
============================================================ */

function getPressureLabel(
  buyPct,
  sellPct
) {
  const safeBuy =
    safeNumber(
      buyPct,
      50
    );

  const safeSell =
    safeNumber(
      sellPct,
      50
    );

  if (
    safeBuy >=
    65
  ) {
    return "TEKANAN BELI KUAT";
  }

  if (
    safeBuy >=
    55
  ) {
    return "TEKANAN BELI SEDERHANA";
  }

  if (
    safeSell >=
    65
  ) {
    return "TEKANAN JUAL KUAT";
  }

  if (
    safeSell >=
    55
  ) {
    return "TEKANAN JUAL SEDERHANA";
  }

  return "SEIMBANG";
}

/* ============================================================
   RECENT FAKE BREAKOUT

   Fake breakout remains visible
   for configured time only.
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

   Only use confirmed breakout
   if still relevant to current
   resistance structure.
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

  /*
    If current structure does not have
    resistance reference, keep recent
    breakout information.
  */

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

  /*
    If current resistance has moved
    too far away, old breakout no
    longer describes current structure.
  */

  if (
    differencePct >
    CONFIRMED_STRUCTURE_TOLERANCE_PCT
  ) {
    return null;
  }

  return item;
}

/* ============================================================
   GRT MARKET DIRECTION CONTEXT

   This helper keeps Market Structure
   consistent with GRT momentum engine.

   Market Structure may describe:
   SEDANG NAIK KUAT

   While momentum may say:
   CEK MOMENTUM

   That is NOT a contradiction.

   Market direction = what price is doing.
   Momentum decision = whether entry is
   qualified yet.
============================================================ */

function mergeGRTMarketDirectionContext({
  structureDirection,
  grtDecision,
}) {
  const normalized =
    normalizeGRTDecision(
      grtDecision
    );

  const momentumDirection =
    normalized
      ?.direction ||
    grtDecision
      ?.direction ||
    "UNKNOWN";

  /*
    If momentum engine clearly sees
    NAIK LAJU, structure should not
    describe the market as SIDEWAY
    merely because snapshot boundary
    is temporarily flat.
  */

  if (
    momentumDirection ===
    "NAIK_LAJU"
  ) {
    return "SEDANG NAIK KUAT";
  }

  if (
    momentumDirection ===
      "NAIK_PERLAHAN" &&
    (
      structureDirection ===
        "SIDEWAY" ||
      structureDirection.includes(
        "MENURUN"
      )
    )
  ) {
    return "SEDANG NAIK";
  }

  /*
    Same logic downward.
  */

  if (
    momentumDirection ===
    "MASIH_DROP"
  ) {
    return "SEDANG MENURUN KUAT";
  }

  if (
    momentumDirection ===
      "DROP_PERLAHAN" &&
    structureDirection ===
      "SIDEWAY"
  ) {
    return "SEDANG MENURUN";
  }

  return structureDirection;
}
/* ============================================================
   BREAKOUT WATCH CREATION

   GRT RULE:

   Resistance 1-3:
   NEVER full breakout lock.

   Resistance 4-6:
   context / caution only.

   Resistance 7-10:
   full anti-fake breakout validation.

   Tujuan:
   weak wall tak boleh block entry
   terlalu lama.
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
    GRT:
    hanya strong resistance
    boleh create full breakout watch.
  */

  if (
    coin ===
      "GRT" &&
    resistanceRating <
      GRT_STRONG_RESISTANCE_MIN_RATING
  ) {
    /*
      Kalau wall lama dah lemah,
      buang stale breakout watch.
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

  /*
    Existing watch dekat resistance
    yang hampir sama → refresh saja.
  */

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

      existing.resistanceDistancePct =
        resistanceDistancePct;

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

    sellEvidence:
      0,

    failureScore:
      0,

    processedSequences:
      new Set(),

    confirmed:
      false,

    fakeBreakout:
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
    30 minit tanpa structure refresh
    → buang watch lama.
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
   BREAKOUT BUFFER HELPERS
============================================================ */

function getBreakoutTriggerPrice(
  resistance
) {
  if (
    !resistance ||
    resistance <=
      0
  ) {
    return null;
  }

  return (
    resistance *
    (
      1 +
      BREAKOUT_BUFFER_PCT /
        100
    )
  );
}

function getBreakoutHoldPrice(
  resistance
) {
  if (
    !resistance ||
    resistance <=
      0
  ) {
    return null;
  }

  return (
    resistance *
    (
      1 +
      BREAKOUT_HOLD_BUFFER_PCT /
        100
    )
  );
}

function getBreakoutFailurePrice(
  resistance
) {
  if (
    !resistance ||
    resistance <=
      0
  ) {
    return null;
  }

  return (
    resistance *
    (
      1 -
      BREAKOUT_FAILURE_BUFFER_PCT /
        100
    )
  );
}

function getBreakoutHardFailurePrice(
  resistance
) {
  if (
    !resistance ||
    resistance <=
      0
  ) {
    return null;
  }

  return (
    resistance *
    (
      1 -
      BREAKOUT_HARD_FAILURE_PCT /
        100
    )
  );
}

/* ============================================================
   PROCESS BREAKOUT EXECUTED TRADE

   Called by trade collector.

   Purpose:
   validate actual executed trades
   around resistance.
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
    !trade
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

  watch.processedSequences
    .add(
      trade.sequence
    );

  watch.lastUpdatedAt =
    Date.now();

  const triggerPrice =
    getBreakoutTriggerPrice(
      watch.resistance
    );

  const holdPrice =
    getBreakoutHoldPrice(
      watch.resistance
    );

  const failurePrice =
    getBreakoutFailurePrice(
      watch.resistance
    );

  const hardFailurePrice =
    getBreakoutHardFailurePrice(
      watch.resistance
    );

  if (
    !triggerPrice ||
    !holdPrice ||
    !failurePrice ||
    !hardFailurePrice
  ) {
    return;
  }

  /* ========================================================
     TRADE ABOVE BREAKOUT TRIGGER
  ======================================================== */

  if (
    trade.price >=
    triggerPrice
  ) {
    if (
      !watch.firstAboveAt
    ) {
      watch.firstAboveAt =
        trade.timestamp;
    }

    watch.lastAboveAt =
      trade.timestamp;

    watch.aboveTradeCount +=
      1;

    if (
      trade.isBuy
    ) {
      watch.buyEvidence +=
        1;
    } else {
      watch.sellEvidence +=
        1;
    }
  }

  /* ========================================================
     HOLD ABOVE RESISTANCE

     Executed trade still above
     hold level supports breakout.
  ======================================================== */

  else if (
    trade.price >=
    holdPrice
  ) {
    if (
      trade.isBuy
    ) {
      watch.buyEvidence +=
        1;
    }
  }

  /* ========================================================
     FAILURE BELOW RESISTANCE
  ======================================================== */

  if (
    trade.price <=
    failurePrice
  ) {
    watch.failureScore +=
      trade.isBuy
        ? 1
        : 2;
  }

  if (
    trade.price <=
    hardFailurePrice
  ) {
    watch.failureScore +=
      3;
  }

  /* ========================================================
     CONFIRM BREAKOUT

     Need:
     - trades above trigger
     - BUY evidence
     - limited failure
  ======================================================== */

  const breakoutConfirmed =
    Boolean(
      watch.aboveTradeCount >=
        3 &&
      watch.buyEvidence >=
        2 &&
      watch.failureScore <=
        2
    );

  if (
    breakoutConfirmed &&
    !watch.confirmed
  ) {
    watch.confirmed =
      true;

    LAST_CONFIRMED_BREAKOUT[
      coin
    ] = {
      coin,

      resistance:
        watch.resistance,

      resistanceRating:
        watch.resistanceRating,

      confirmedPrice:
        trade.price,

      at:
        Date.now(),

      entryBlocked:
        false,
    };

    /*
      Confirmed breakout no longer
      needs active watch.
    */

    cancelBreakoutWatch(
      coin
    );

    return;
  }

  /* ========================================================
     FAKE BREAKOUT

     Condition:
     price attempted breakout,
     then failed below resistance
     with enough sell/failure evidence.
  ======================================================== */

  const breakoutAttempted =
    Boolean(
      watch.firstAboveAt ||
      watch.aboveTradeCount >
        0
    );

  const fakeBreakout =
    Boolean(
      breakoutAttempted &&
      (
        watch.failureScore >=
          4 ||
        (
          trade.price <=
            failurePrice &&
          watch.sellEvidence >
            watch.buyEvidence
        )
      )
    );

  if (
    fakeBreakout
  ) {
    watch.fakeBreakout =
      true;

    LAST_FAKE_BREAKOUT[
      coin
    ] = {
      coin,

      resistance:
        watch.resistance,

      resistanceRating:
        watch.resistanceRating,

      failurePrice:
        trade.price,

      at:
        Date.now(),
    };

    cancelBreakoutWatch(
      coin
    );
  }
}

/* ============================================================
   BREAKOUT STATUS SNAPSHOT

   Used by diagnostics / structure.
============================================================ */

function getBreakoutWatchStatus(
  coin
) {
  cleanStaleBreakoutWatch(
    coin
  );

  const watch =
    BREAKOUT_WATCH[
      coin
    ];

  if (
    !watch
  ) {
    return {
      active:
        false,

      watch:
        null,
    };
  }

  return {
    active:
      true,

    watch: {
      coin:
        watch.coin,

      resistance:
        watch.resistance,

      resistanceRating:
        watch.resistanceRating,

      resistanceDistancePct:
        watch.resistanceDistancePct,

      startedAt:
        watch.startedAt,

      lastUpdatedAt:
        watch.lastUpdatedAt,

      firstAboveAt:
        watch.firstAboveAt,

      lastAboveAt:
        watch.lastAboveAt,

      aboveTradeCount:
        watch.aboveTradeCount,

      buyEvidence:
        watch.buyEvidence,

      sellEvidence:
        watch.sellEvidence,

      failureScore:
        watch.failureScore,

      confirmed:
        watch.confirmed,

      fakeBreakout:
        watch.fakeBreakout,
    },
  };
}
/* ============================================================
   UNIFIED GRT MARKET CRITERIA

   IMPORTANT:

   GRT Market Structure MUST follow
   getGRTMomentumDecision().

   Market Structure hanya tambah context:

   - fake breakout
   - confirmed breakout
   - strong resistance

   Tetapi ia TIDAK boleh tukar
   DON'T BUY menjadi BUY sendiri.
============================================================ */

function getGRTUnifiedCriteria({
  decision,
  fakeBreakout,
  confirmedBreakout,
  resistance,
  resistanceRating,
}) {
  /*
    ==========================================================
    FAKE BREAKOUT

    Highest priority danger context.
    ==========================================================
  */

  if (
    fakeBreakout
  ) {
    return "JGN BELI — FAKE BREAKOUT";
  }

  const normalized =
    normalizeGRTDecision(
      decision
    );

  /* ========================================================
     BUY NOW

     Final momentum engine already
     confirmed entry momentum.
  ======================================================== */

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    return `BUY NOW — ${
      decision?.reason ||
      "QUALIFIED MOMENTUM"
    }`;
  }

  /* ========================================================
     CEK MOMENTUM

     Jangan paparkan internal phase
     macam WATCHING_MOVE.

     User hanya perlu tahu market
     sedang divalidate.
  ======================================================== */

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    const direction =
      normalized.direction ||
      decision?.direction ||
      "UNKNOWN";

    if (
      direction ===
      "NAIK_LAJU"
    ) {
      return "CEK MOMENTUM — NAIK LAJU";
    }

    if (
      direction ===
      "NAIK_PERLAHAN"
    ) {
      return "CEK MOMENTUM — NAIK PERLAHAN";
    }

    return "CEK MOMENTUM — VALIDATING";
  }

  /* ========================================================
     COLLECTING

     Sepatutnya hanya berlaku
     ketika startup / data awal.
  ======================================================== */

  if (
    normalized.status ===
    "COLLECTING"
  ) {
    return "COLLECTING DATA";
  }

  /* ========================================================
     CONFIRMED BREAKOUT

     Important:
     Breakout confirmed TIDAK bermaksud
     auto BUY jika momentum engine
     masih NO_ENTRY.

     Kita cuma paparkan context.
  ======================================================== */

  if (
    confirmedBreakout
  ) {
    if (
      confirmedBreakout
        .entryBlocked
    ) {
      return "BREAKOUT CONFIRMED — ENTRY BLOCKED";
    }

    return "BREAKOUT CONFIRMED — WAIT MOMENTUM";
  }

  /* ========================================================
     STRONG RESISTANCE

     Hanya strong wall 7-10
     layak diberi perhatian besar.
  ======================================================== */

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

  /* ========================================================
     FINAL DON'T BUY

     Kekal ikut reason momentum engine.
  ======================================================== */

  return `JGN BELI — ${
    decision?.reason ||
    "NO QUALIFIED MOMENTUM"
  }`;
}

/* ============================================================
   BTC / GENERIC MARKET CRITERIA

   GRT DOES NOT USE THIS FUNCTION.

   BTC masih boleh guna logic market
   structure biasa sebab BUY GRT tidak
   ditentukan oleh BTC sahaja.
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
  /* ========================================================
     FAKE BREAKOUT
  ======================================================== */

  if (
    fakeBreakout
  ) {
    return "JGN BELI";
  }

  /* ========================================================
     CONFIRMED BREAKOUT
  ======================================================== */

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

  /* ========================================================
     STRONG SELLING / STRONG DROP
  ======================================================== */

  if (
    String(
      pressure ||
      ""
    ).includes(
      "JUAL KUAT"
    ) ||
    String(
      direction ||
      ""
    ).includes(
      "MENURUN KUAT"
    )
  ) {
    return "JGN BELI";
  }

  /* ========================================================
     STRONG RESISTANCE BREAKOUT WATCH
  ======================================================== */

  if (
    resistance &&
    resistanceRating >=
      7 &&
    resistanceDistancePct !==
      null &&
    resistanceDistancePct !==
      undefined &&
    resistanceDistancePct <=
      BREAKOUT_WATCH_MAX_DISTANCE_PCT &&
    String(
      pressure ||
      ""
    ).includes(
      "BELI"
    )
  ) {
    return `BREAKOUT WATCH RM${formatPrice(
      coin,
      resistance
    )}`;
  }

  /* ========================================================
     MEDIUM RESISTANCE WATCH
  ======================================================== */

  if (
    resistance &&
    resistanceRating >=
      4 &&
    String(
      direction ||
      ""
    ).includes(
      "NAIK"
    ) &&
    String(
      pressure ||
      ""
    ).includes(
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
   ANALYZE MARKET STRUCTURE

   PURPOSE:

   BTC:
   - normal market structure reference

   GRT:
   - structure + support/resistance
   - BUT final entry criteria MUST follow
     GRT Momentum Engine

   IMPORTANT:

   Market Structure TIDAK boleh cipta
   BUY NOW sendiri untuk GRT.
============================================================ */

async function analyzeMarketStructure(
  coin,
  options = {}
) {
  const suppliedTicker =
    options.ticker ||
    null;

  const suppliedGRTSnapshot =
    options.grtSnapshot ||
    null;

  /* ========================================================
     TICKER
  ======================================================== */

  const ticker =
    suppliedTicker ||
    await getTicker(
      coin
    );

  if (
    !ticker ||
    !Number.isFinite(
      ticker.currentPrice
    ) ||
    ticker.currentPrice <=
      0
  ) {
    return null;
  }

  const currentPrice =
    ticker.currentPrice;

  /* ========================================================
     PRICE SNAPSHOT

     Market Structure = mainly 15M.

     5M / 15M momentum GRT sendiri
     tetap datang daripada Part 3.
  ======================================================== */

  const snapshot15m =
    getPriceSnapshot(
      coin,
      15 *
        60 *
        1000
    );

  const snapshot5m =
    getPriceSnapshot(
      coin,
      5 *
        60 *
        1000
    );

  const change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change,
          0
        )
      : 0;

  const change5m =
    snapshot5m
      ? safeNumber(
          snapshot5m.change,
          0
        )
      : 0;

  let direction =
    getMarketDirection(
      change15m
    );

  /* ========================================================
     EXECUTED FLOW
  ======================================================== */

const executed =
  getExecutedFlowSummary(
    coin,
    5 *
      60 *
      1000
  );

const flowReady =
  Boolean(
    executed &&
    executed.totalCount >
      0
  );

const buyPct =
  flowReady
    ? safeNumber(
        executed.buyVolumePct,
        50
      )
    : 50;

const sellPct =
  flowReady
    ? safeNumber(
        executed.sellVolumePct,
        50
      )
    : 50;

    /* ========================================================
   EXECUTED PRESSURE LABEL

   Required by:
   - breakout watch
   - generic market criteria
   - final market structure return
======================================================== */

const pressure =
  getPressureLabel(
    buyPct,
    sellPct
  );


  /* ========================================================
     ORDERBOOK STRUCTURE
  ======================================================== */

  const orderbook =
    await getOrderBookStructure(
      coin,
      currentPrice
    );

  const support =
    orderbook?.support ||
    null;

  const resistance =
    orderbook?.resistance ||
    null;

  const supportPrice =
    support?.price ||
    null;

  const supportRating =
    safeNumber(
      support?.rating,
      0
    );

  const resistancePrice =
    resistance?.price ||
    null;

  const resistanceRating =
    safeNumber(
      resistance?.rating,
      0
    );

  const resistanceDistancePct =
    resistance
      ? safeNumber(
          resistance.distancePct,
          null
        )
      : null;

  /* ========================================================
     CLEAN OLD BREAKOUT WATCH
  ======================================================== */

  cleanStaleBreakoutWatch(
    coin
  );

  /* ========================================================
     CREATE / REFRESH BREAKOUT WATCH

     GRT weak resistance 1-3
     automatically ignored by
     ensureBreakoutWatch().
  ======================================================== */

  ensureBreakoutWatch({
    coin,

    resistance:
      resistancePrice,

    resistanceRating,

    resistanceDistancePct,

    pressure,
  });

  /* ========================================================
     BREAKOUT CONTEXT
  ======================================================== */

  const fakeBreakout =
    getRecentFakeBreakout(
      coin
    );

  const confirmedBreakout =
    getRecentConfirmedBreakout(
      coin,
      resistancePrice
    );

  const breakoutWatch =
    getBreakoutWatchStatus(
      coin
    );

  /* ========================================================
     GRT MOMENTUM SNAPSHOT

     CRITICAL:

     Kalau caller dah ada snapshot
     daripada master scanner,
     GUNA snapshot yang sama.

     Jangan analyse GRT dua kali
     dalam cycle yang sama.
  ======================================================== */

  let grtSnapshot =
    suppliedGRTSnapshot;

  let grtDecision =
    null;

  let normalizedGRT =
    null;

  if (
    coin ===
    "GRT"
  ) {
    if (
      !grtSnapshot
    ) {
      grtSnapshot =
        await getGRTMomentumSnapshot(
          ticker
        );
    }

    grtDecision =
      grtSnapshot?.decision ||
      null;

    normalizedGRT =
      grtSnapshot?.normalized ||
      (
        grtDecision
          ? normalizeGRTDecision(
              grtDecision
            )
          : null
      );

    /*
      Market direction diselaraskan
      dengan fast GRT direction.

      Contoh:

      snapshot 15M boundary = SIDEWAY

      tetapi momentum engine:
      🚀 NAIK LAJU

      Structure tak patut tulis SIDEWAY.
    */

    direction =
      mergeGRTMarketDirectionContext({
        structureDirection:
          direction,

        grtDecision,
      });
  }

  /* ========================================================
     MARKET DISPLAY MODIFIER:
     CONFIRMED BREAKOUT

     Ini DESCRIPTIVE sahaja.

     Ia tidak menghasilkan BUY NOW.
  ======================================================== */

  let marketText =
    direction;

  if (
    confirmedBreakout
  ) {
    if (
      String(
        direction
      ).includes(
        "NAIK"
      )
    ) {
      marketText =
        `${direction} — BREAKOUT CONFIRMED`;
    } else {
      marketText =
        "BREAKOUT CONFIRMED";
    }
  }

  /* ========================================================
     FAKE BREAKOUT DISPLAY

     Fake breakout lebih penting daripada
     breakout confirmed yang lama.
  ======================================================== */

  if (
    fakeBreakout
  ) {
    marketText =
      "FAKE BREAKOUT — TEKANAN TURUN";
  }

  /* ========================================================
     NEAR STRONG RESISTANCE DISPLAY

     Jangan label weak wall sebagai
     serious resistance.

     GRT:
     hanya rating 7+.

     BTC:
     generic rating 7+.
  ======================================================== */

  const nearStrongResistance =
    Boolean(
      resistancePrice &&
      resistanceRating >=
        7 &&
      resistanceDistancePct !==
        null &&
      resistanceDistancePct <=
        BREAKOUT_WATCH_MAX_DISTANCE_PCT
    );

  if (
    nearStrongResistance &&
    !confirmedBreakout &&
    !fakeBreakout &&
    direction ===
      "SIDEWAY"
  ) {
    marketText =
      "SIDEWAY — DEKAT RESISTANCE";
  }

  /* ========================================================
     FINAL CRITERIA
  ======================================================== */

  let criteria;

  if (
    coin ===
    "GRT"
  ) {
    criteria =
      getGRTUnifiedCriteria({
        decision:
          grtDecision,

        fakeBreakout,

        confirmedBreakout,

        resistance:
          resistancePrice,

        resistanceRating,
      });
  } else {
    criteria =
      getGenericMarketCriteria({
        coin,

        direction,

        pressure,

        resistance:
          resistancePrice,

        resistanceRating,

        resistanceDistancePct,

        fakeBreakout,

        confirmedBreakout,
      });
  }

  /* ========================================================
     FINAL RESULT
  ======================================================== */

  return {
    coin,

    currentPrice,

    ticker,

    snapshot5m,
    snapshot15m,

    change5m,
    change15m,

    direction,

    marketText,

    pressure,

    executed,

    support,
    resistance,

    supportPrice,
    supportRating,

    resistancePrice,
    resistanceRating,
    resistanceDistancePct,

    nearStrongResistance,

    fakeBreakout,
    confirmedBreakout,
    breakoutWatch,

    criteria,

    /*
      GRT only.
    */

    grtSnapshot:
      coin ===
        "GRT"
        ? grtSnapshot
        : null,

    grtDecision:
      coin ===
        "GRT"
        ? grtDecision
        : null,

    normalizedGRT:
      coin ===
        "GRT"
        ? normalizedGRT
        : null,
  };
}
/* ============================================================
   MARKET STRUCTURE TEXT

   BTC:
   normal structure display.

   GRT:
   final momentum decision + direction
   mesti konsisten dengan Price Alert.

   Internal phase seperti:
   WATCHING_MOVE
   EARLY_MOMENTUM
   ACCELERATION

   TIDAK perlu dipaparkan kepada user.
============================================================ */

function buildMarketStructureSection(
  data
) {
  if (
    !data
  ) {
    return "";
  }

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
          data.resistanceRating >=
            GRT_STRONG_RESISTANCE_MIN_RATING
            ? " (STRONG)"
            : ""
        }`
      : "N/A";

  /* ========================================================
     BTC DISPLAY
  ======================================================== */

  if (
    data.coin !==
    "GRT"
  ) {
    return `🪙 ${data.coin}
💵 Harga Semasa: RM${formatPrice(
      data.coin,
      data.currentPrice
    )}
🟢 Support: ${supportText}
🔴 Resistance: ${resistanceText}
📈 Market: ${data.marketText}
⚡️ Tekanan: ${data.pressure}
🧠 Kriteria: ${data.criteria}`;
  }

  /* ========================================================
     GRT DISPLAY
  ======================================================== */

  const normalized =
    data.normalizedGRT ||
    normalizeGRTDecision(
      data.grtDecision
    );

  let momentumText =
    normalized.text;

  let directionText =
    normalized.directionText ||
    "";

  /*
    BUY NOW / CEK MOMENTUM / DON'T BUY
    ditunjukkan satu line utama.
  */

  let validationText =
    "";

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    validationText =
      "\n🔎 Status: VALIDATING";
  }

  /*
    5M / 15M movement optional dalam
    Market Structure.

    Price Alert memang wajib paparkan.
    Structure boleh paparkan sebab berguna
    untuk tengok context 15M.
  */

  let momentumWindowText =
    "";

  const sustainedMove =
    data.grtDecision
      ?.sustainedMove;

  if (
    sustainedMove?.ready
  ) {
    momentumWindowText =
      `\n⏱ Momentum: 5M ${formatPercent(
        sustainedMove.change5m
      )} | 15M ${formatPercent(
        sustainedMove.change15m
      )}`;
  }

  return `🪙 GRT
💵 Harga Semasa: RM${formatPrice(
    "GRT",
    data.currentPrice
  )}
🟢 Support: ${supportText}
🔴 Resistance: ${resistanceText}
📈 Market: ${data.marketText}
⚡️ Tekanan: ${data.pressure}

⚡ Momentum: ${momentumText}${
    directionText
      ? `\n${directionText}`
      : ""
  }${validationText}${momentumWindowText}

🧠 Kriteria: ${data.criteria}`;
}

/* ============================================================
   MARKET STRUCTURE ALERT

   IMPORTANT:

   Kalau caller sudah mempunyai latest
   GRT snapshot daripada master scanner,
   pass snapshot tersebut supaya
   Market Structure tak analyse GRT
   sekali lagi.
============================================================ */

async function sendMarketStructure(
  options = {}
) {
  const suppliedGRTSnapshot =
    options.grtSnapshot ||
    null;

  const sections =
    [];

  /* ========================================================
     BTC
  ======================================================== */

  const btcData =
    await analyzeMarketStructure(
      "BTC"
    );

  if (
    btcData
  ) {
    const btcSection =
      buildMarketStructureSection(
        btcData
      );

    if (
      btcSection
    ) {
      sections.push(
        btcSection
      );
    }
  }

  /* ========================================================
     GRT
  ======================================================== */

  let grtTicker =
    suppliedGRTSnapshot
      ?.ticker ||
    null;

  if (
    !grtTicker
  ) {
    grtTicker =
      await getTicker(
        "GRT"
      );
  }

  if (
    grtTicker
  ) {
    let grtSnapshot =
      suppliedGRTSnapshot;

    /*
      Kalau master scanner tak pass
      snapshot, baru kita analyse.
    */

    if (
      !grtSnapshot
    ) {
      grtSnapshot =
        await getGRTMomentumSnapshot(
          grtTicker
        );
    }

    const grtData =
      await analyzeMarketStructure(
        "GRT",
        {
          ticker:
            grtTicker,

          grtSnapshot,
        }
      );

    if (
      grtData
    ) {
      const grtSection =
        buildMarketStructureSection(
          grtData
        );

      if (
        grtSection
      ) {
        sections.push(
          grtSection
        );
      }
    }
  }

  if (
    !sections.length
  ) {
    return {
      sent:
        false,

      reason:
        "NO STRUCTURE DATA",
    };
  }

  const message =
    `📊 MARKET STRUCTURE UPDATE

${sections.join(
  "\n━━━━━━━━━━━━━━━━━━\n"
)}`;

  await sendTelegram(
    message
  );

  return {
    sent:
      true,

    message,
  };
}
/* ============================================================
   PART 5 — PRICE ALERT ENGINE

   PRICE ALERT:
   every 5 minutes

   ANALYSIS:
   master GRT engine may scan every 1 minute

   IMPORTANT:

   Notification frequency
   !=
   Analysis frequency
============================================================ */

/* ============================================================
   PRICE ALERT MOVEMENT SNAPSHOT

   5M  = short-term price movement
   15M = momentum backbone

   We prefer PRICE MEMORY instead of
   only previous Telegram alert price.

   Reason:

   Telegram interval boundary can hide
   an actual move.

   Example:

   4:49 +1.27%
   4:54 +0.14%

   15M still +1.41%

   So momentum is NOT lost.
============================================================ */

function getPriceAlertMovement(
  coin,
  currentPrice
) {
  const snapshot5m =
    getPriceSnapshot(
      coin,
      5 *
        60 *
        1000
    );

  const snapshot15m =
    getPriceSnapshot(
      coin,
      15 *
        60 *
        1000
    );

  let change5m =
    snapshot5m
      ? safeNumber(
          snapshot5m.change,
          0
        )
      : null;

  let change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change,
          0
        )
      : null;

  /* ========================================================
     FALLBACK 5M

     Kalau price memory belum cukup,
     guna previous Price Alert.

     Ini hanya fallback,
     bukan primary source.
  ======================================================== */

  const previousAlert =
    LAST_ALERT_PRICE[
      coin
    ];

  if (
    change5m ===
      null &&
    previousAlert &&
    previousAlert >
      0
  ) {
    change5m =
      percentChange(
        previousAlert,
        currentPrice
      );
  }

  if (
    change5m ===
    null
  ) {
    change5m =
      0;
  }

  /*
    Kalau 15M belum cukup data,
    fallback kepada 5M.

    Jangan reka movement 15M.
  */

  if (
    change15m ===
    null
  ) {
    change15m =
      change5m;
  }

  return {
    change5m,

    change15m,

    snapshot5m,

    snapshot15m,

    currentPrice,
  };
}

/* ============================================================
   PRICE MOVE ARROW

   Used on same line as coin price.

   Example:

   RM0.0718 ⬆️ +1.27%
============================================================ */

function buildPriceMoveText(
  changePct,
  label =
    null
) {
  const change =
    safeNumber(
      changePct,
      0
    );

  /*
    Tiny movement:
    don't clutter price line.
  */

  if (
    Math.abs(
      change
    ) <
    0.01
  ) {
    return "";
  }

  const arrow =
    change >
      0
      ? "⬆️"
      : "⬇️";

  const suffix =
    label
      ? ` (${label})`
      : "";

  return ` ${arrow} ${formatPercent(
    change
  )}${suffix}`;
}

/* ============================================================
   GRT 5M / 15M DISPLAY

   MUST sit directly below GRT price.

   This was specifically locked
   in our alert design.
============================================================ */

function buildGRTMovementLine(
  movement
) {
  if (
    !movement
  ) {
    return "⏱ 5M: 0.00% | 15M: 0.00%";
  }

  return `⏱ 5M: ${formatPercent(
    movement.change5m
  )} | 15M: ${formatPercent(
    movement.change15m
  )}`;
}

/* ============================================================
   BTC PRICE ALERT MOVE

   BTC remains simpler.

   We only need short-term 5M display
   + BTC BUY SURGE status.
============================================================ */

function buildBTCPriceLine(
  ticker,
  movement
) {
  if (
    !ticker
  ) {
    return "₿ BTC N/A";
  }

  const moveText =
    buildPriceMoveText(
      movement?.change5m ||
        0,
      "5M"
    );

  return `₿ BTC RM${formatPrice(
    "BTC",
    ticker.currentPrice
  )}${moveText}`;
}

/* ============================================================
   GRT PRICE LINE

   5M arrow remains beside price.

   Full 5M / 15M line appears
   directly underneath.
============================================================ */

function buildGRTPriceLine(
  ticker,
  movement
) {
  if (
    !ticker
  ) {
    return "🪙 GRT N/A";
  }

  const moveText =
    buildPriceMoveText(
      movement?.change5m ||
        0
    );

  return `🪙 GRT RM${formatPrice(
    "GRT",
    ticker.currentPrice
  )}${moveText}`;
}

/* ============================================================
   SYNC LAST ALERT PRICE

   Keep this for fallback / diagnostics.

   It is no longer the only source
   for momentum movement.
============================================================ */

function updateLastAlertPrices({
  btc,
  grt,
}) {
  if (
    btc?.currentPrice >
    0
  ) {
    LAST_ALERT_PRICE[
      "BTC"
    ] =
      btc.currentPrice;
  }

  if (
    grt?.currentPrice >
    0
  ) {
    LAST_ALERT_PRICE[
      "GRT"
    ] =
      grt.currentPrice;
  }
}
/* ============================================================
   PART 5B — BTC PRICE ALERT

   BTC PURPOSE:

   - Market lead indicator
   - 5M price context
   - BUY SURGE context

   BTC TIDAK menentukan BUY NOW GRT.
============================================================ */

/* ============================================================
   BTC MOMENTUM DISPLAY

   Keep BTC compact.

   Example:

   ⚡ MOMENTUM: 🟢 BUY SURGE ON

   or

   ⚡ MOMENTUM: 🔴 BUY SURGE OFF
============================================================ */

function buildBTCMomentumText(
  btcMomentum
) {
  if (
    !btcMomentum
  ) {
    return "🟡 VALIDATING";
  }

  if (
    btcMomentum.status ===
    "BUY_SURGE_ON"
  ) {
    return "🟢 BUY SURGE ON";
  }

  if (
    btcMomentum.status ===
    "BUY_SURGE_OFF"
  ) {
    return "🔴 BUY SURGE OFF";
  }

  return (
    btcMomentum.text ||
    "🟡 VALIDATING"
  );
}

/* ============================================================
   BTC PRICE ALERT SECTION
============================================================ */

function buildBTCPriceAlertSection({
  ticker,
  movement,
  momentum,
}) {
  if (
    !ticker
  ) {
    return `₿ BTC N/A
⚡ MOMENTUM: 🟡 DATA UNAVAILABLE`;
  }

  const priceLine =
    buildBTCPriceLine(
      ticker,
      movement
    );

  const momentumText =
    buildBTCMomentumText(
      momentum
    );

  return `${priceLine}
⚡ MOMENTUM: ${momentumText}`;
}

/* ============================================================
   GET BTC PRICE ALERT SNAPSHOT

   Collect:
   - ticker
   - 5M movement
   - BUY SURGE context

   This function does NOT send Telegram.
============================================================ */

async function getBTCPriceAlertSnapshot(
  ticker =
    null
) {
  const activeTicker =
    ticker ||
    await getTicker(
      "BTC"
    );

  if (
    !activeTicker
  ) {
    return {
      ticker:
        null,

      movement:
        null,

      momentum: {
        status:
          "VALIDATING",

        text:
          "🟡 VALIDATING",
      },

      section:
        buildBTCPriceAlertSection({
          ticker:
            null,

          movement:
            null,

          momentum:
            null,
        }),
    };
  }

  const movement =
    getPriceAlertMovement(
      "BTC",
      activeTicker.currentPrice
    );

  const momentum =
    await getBTCBuySurge();

  const section =
    buildBTCPriceAlertSection({
      ticker:
        activeTicker,

      movement,

      momentum,
    });

  return {
    ticker:
      activeTicker,

    movement,

    momentum,

    section,
  };
}
/* ============================================================
   PART 5C — GRT PRICE ALERT

   FINAL DISPLAY TARGET:

   🪙 GRT RM0.0718 ⬆️ +1.27%
   ⏱ 5M: +1.27% | 15M: +1.27%

   ⚡ 🟠 CEK MOMENTUM
   🚀 NAIK LAJU
   🔎 VALIDATING

   OR:

   🪙 GRT RM0.0703 ⬇️ -0.28%
   ⏱ 5M: -0.28% | 15M: -0.42%

   ⚡ 🔴 DON'T BUY
   📉 MASIH DROP
============================================================ */

/* ============================================================
   GRT MOMENTUM DISPLAY SECTION
============================================================ */

function buildGRTMomentumDisplay(
  decision
) {
  const normalized =
    normalizeGRTDecision(
      decision
    );

  /*
    Startup only.
  */

  if (
    normalized.status ===
    "COLLECTING"
  ) {
    return "⚡ 🟡 COLLECTING MARKET DATA";
  }

  /*
    BUY NOW.
  */

  if (
    normalized.status ===
    "BUY_NOW"
  ) {
    return [
      "⚡ 🟢 BUY NOW",

      normalized.directionText ||
      "🚀 NAIK LAJU",
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );
  }

  /*
    CEK MOMENTUM.
  */

  if (
    normalized.status ===
    "VERIFYING"
  ) {
    return [
      "⚡ 🟠 CEK MOMENTUM",

      normalized.directionText,

      "🔎 VALIDATING",
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );
  }

  /*
    DON'T BUY.
  */

  return [
    "⚡ 🔴 DON'T BUY",

    normalized.directionText,
  ]
    .filter(
      Boolean
    )
    .join(
      "\n"
    );
}

/* ============================================================
   GRT PRICE ALERT SECTION

   IMPORTANT:

   5M / 15M line sits DIRECTLY
   below GRT price.

   Momentum comes after one blank line.
============================================================ */

function buildGRTPriceAlertSection({
  ticker,
  movement,
  decision,
}) {
  if (
    !ticker
  ) {
    return `🪙 GRT N/A
⏱ 5M: 0.00% | 15M: 0.00%

⚡ 🟡 COLLECTING MARKET DATA`;
  }

  const priceLine =
    buildGRTPriceLine(
      ticker,
      movement
    );

  const movementLine =
    buildGRTMovementLine(
      movement
    );

  const momentumText =
    buildGRTMomentumDisplay(
      decision
    );

  return `${priceLine}
${movementLine}

${momentumText}`;
}

/* ============================================================
   GET GRT PRICE ALERT SNAPSHOT

   Prefer master-engine snapshot
   if caller already has one.

   This prevents duplicate analysis.
============================================================ */

async function getGRTPriceAlertSnapshot(
  suppliedSnapshot =
    null
) {
  let snapshot =
    suppliedSnapshot;

  if (
    !snapshot
  ) {
    snapshot =
      await getGRTMomentumSnapshot();
  }

  const ticker =
    snapshot?.ticker ||
    null;

  const decision =
    snapshot?.decision ||
    null;

  const normalized =
    snapshot?.normalized ||
    (
      decision
        ? normalizeGRTDecision(
            decision
          )
        : null
    );

  if (
    !ticker
  ) {
    return {
      ticker:
        null,

      movement:
        null,

      decision,

      normalized,

      section:
        buildGRTPriceAlertSection({
          ticker:
            null,

          movement:
            null,

          decision,
        }),
    };
  }

  /*
    Movement display primarily uses
    the SAME sustained move calculated
    by momentum engine.

    This prevents Price Alert saying:

    5M 0.00
    15M 0.00

    while momentum engine internally
    sees +1.20%.
  */

  let movement =
    null;

  const sustainedMove =
    decision
      ?.sustainedMove;

  if (
    sustainedMove?.ready
  ) {
    movement = {
      change5m:
        safeNumber(
          sustainedMove.change5m,
          0
        ),

      change15m:
        safeNumber(
          sustainedMove.change15m,
          0
        ),

      currentPrice:
        ticker.currentPrice,

      source:
        "MOMENTUM ENGINE",
    };
  } else {
    movement =
      getPriceAlertMovement(
        "GRT",
        ticker.currentPrice
      );

    movement.source =
      "PRICE MEMORY";
  }

  const section =
    buildGRTPriceAlertSection({
      ticker,

      movement,

      decision,
    });

  return {
    ticker,

    movement,

    decision,

    normalized,

    section,
  };
}

/* ============================================================
   GRT PRICE ALERT DECISION SUMMARY

   Small helper for diagnostics
   and future commands.
============================================================ */

function getGRTPriceAlertDecisionSummary(
  snapshot
) {
  if (
    !snapshot
  ) {
    return {
      status:
        "COLLECTING",

      direction:
        "UNKNOWN",

      change5m:
        0,

      change15m:
        0,
    };
  }

  return {
    status:
      snapshot.normalized
        ?.status ||
      snapshot.decision
        ?.status ||
      "COLLECTING",

    direction:
      snapshot.normalized
        ?.direction ||
      snapshot.decision
        ?.direction ||
      "UNKNOWN",

    change5m:
      safeNumber(
        snapshot.movement
          ?.change5m,
        0
      ),

    change15m:
      safeNumber(
        snapshot.movement
          ?.change15m,
        0
      ),

    reason:
      snapshot.decision
        ?.reason ||
      null,
  };
}
/* ============================================================
   PART 5D — FINAL PRICE ALERT BUILDER

   TARGET FORMAT:

   📡 PRICE ALERT

   ₿ BTC RM321007.00 ⬆️ +0.07% (5M)
   ⚡ MOMENTUM: 🔴 BUY SURGE OFF

   🪙 GRT RM0.0718 ⬆️ +1.27%
   ⏱ 5M: +1.27% | 15M: +1.27%

   ⚡ 🟠 CEK MOMENTUM
   🚀 NAIK LAJU
   🔎 VALIDATING
============================================================ */

/* ============================================================
   BUILD FINAL PRICE ALERT MESSAGE
============================================================ */

function buildFinalPriceAlertMessage({
  btcSnapshot,
  grtSnapshot,
}) {
  const btcSection =
    btcSnapshot
      ?.section ||
    `₿ BTC N/A
⚡ MOMENTUM: 🟡 DATA UNAVAILABLE`;

  const grtSection =
    grtSnapshot
      ?.section ||
    `🪙 GRT N/A
⏱ 5M: 0.00% | 15M: 0.00%

⚡ 🟡 COLLECTING MARKET DATA`;

  return `📡 PRICE ALERT

${btcSection}

${grtSection}`;
}

/* ============================================================
   GET COMPLETE PRICE ALERT SNAPSHOT

   Caller boleh pass latest
   GRT master snapshot.

   Ini elak duplicate GRT analysis.
============================================================ */

async function getCompletePriceAlertSnapshot(
  options = {}
) {
  const suppliedGRTSnapshot =
    options.grtSnapshot ||
    null;

  const [
    btcSnapshot,
    grtAlertSnapshot,
  ] =
    await Promise.all([
      getBTCPriceAlertSnapshot(),

      getGRTPriceAlertSnapshot(
        suppliedGRTSnapshot
      ),
    ]);

  const message =
    buildFinalPriceAlertMessage({
      btcSnapshot,

      grtSnapshot:
        grtAlertSnapshot,
    });

  return {
    btcSnapshot,

    grtSnapshot:
      grtAlertSnapshot,

    message,
  };
}

/* ============================================================
   PRICE ALERT STATE SUMMARY

   Useful later for:
   - diagnostics
   - /status
   - master scanner
============================================================ */

function getPriceAlertStateSummary(
  completeSnapshot
) {
  if (
    !completeSnapshot
  ) {
    return {
      btc:
        null,

      grt:
        null,
    };
  }

  const btc =
    completeSnapshot
      .btcSnapshot;

  const grt =
    completeSnapshot
      .grtSnapshot;

  return {
    btc: {
      price:
        btc?.ticker
          ?.currentPrice ||
        null,

      change5m:
        safeNumber(
          btc?.movement
            ?.change5m,
          0
        ),

      momentum:
        btc?.momentum
          ?.status ||
        "VALIDATING",
    },

    grt: {
      price:
        grt?.ticker
          ?.currentPrice ||
        null,

      change5m:
        safeNumber(
          grt?.movement
            ?.change5m,
          0
        ),

      change15m:
        safeNumber(
          grt?.movement
            ?.change15m,
          0
        ),

      status:
        grt?.normalized
          ?.status ||
        "COLLECTING",

      direction:
        grt?.normalized
          ?.direction ||
        "UNKNOWN",

      reason:
        grt?.decision
          ?.reason ||
        null,
    },
  };
}
/* ============================================================
   PART 5E — SEND PRICE ALERT

   IMPORTANT:

   - BTC snapshot = market context
   - GRT snapshot = master momentum decision
   - GRT 5M / 15M comes from same momentum engine
   - BUY NOW goes through same handler
============================================================ */

async function sendPriceAlert(
  options = {}
) {
  const suppliedGRTSnapshot =
    options.grtSnapshot ||
    null;

  /* ========================================================
     GET COMPLETE SNAPSHOT
  ======================================================== */

  const completeSnapshot =
    await getCompletePriceAlertSnapshot({
      grtSnapshot:
        suppliedGRTSnapshot,
    });

  if (
    !completeSnapshot
  ) {
    return {
      sent:
        false,

      reason:
        "PRICE ALERT SNAPSHOT UNAVAILABLE",
    };
  }

  const btcSnapshot =
    completeSnapshot
      .btcSnapshot;

  const grtSnapshot =
    completeSnapshot
      .grtSnapshot;

  const message =
    completeSnapshot
      .message;

  if (
    !message
  ) {
    return {
      sent:
        false,

      reason:
        "PRICE ALERT MESSAGE EMPTY",
    };
  }

  /* ========================================================
     TELEGRAM
  ======================================================== */

  await sendTelegram(
    message
  );

  /* ========================================================
     UPDATE FALLBACK ALERT PRICE

     Only AFTER successful Telegram send.
  ======================================================== */

  updateLastAlertPrices({
    btc:
      btcSnapshot
        ?.ticker ||
      null,

    grt:
      grtSnapshot
        ?.ticker ||
      null,
  });

  /* ========================================================
     BUY NOW HANDLER

     Price Alert does NOT create
     separate BUY logic.

     It passes the SAME decision
     to the shared handler.

     Cooldown prevents duplicate signal
     if 1-minute scanner already handled it.
  ======================================================== */

  const grtDecision =
    grtSnapshot
      ?.decision ||
    null;

  if (
    grtDecision?.status ===
    "BUY_NOW"
  ) {
    await handleGRTBuyNowSignal(
      grtSnapshot.ticker,
      grtDecision
    );
  }

  return {
    sent:
      true,

    message,

    summary:
      getPriceAlertStateSummary(
        completeSnapshot
      ),

    btcSnapshot,

    grtSnapshot,
  };
}
/* ============================================================
   PART 5F — IMMEDIATE BUY NOW ALERT

   PURPOSE:

   Master scanner may confirm BUY NOW
   between normal 5-minute Price Alerts.

   Example:

   4:49 Price Alert
   → CEK MOMENTUM

   4:51 master scanner
   → BUY NOW confirmed

   Bot should alert immediately.
   Jangan tunggu 4:54.
============================================================ */

/* ============================================================
   BUILD IMMEDIATE BUY NOW MESSAGE
============================================================ */

function buildImmediateGRTBuyNowMessage(
  snapshot
) {
  const ticker =
    snapshot?.ticker ||
    null;

  const decision =
    snapshot?.decision ||
    null;

  if (
    !ticker ||
    !decision ||
    decision.status !==
      "BUY_NOW"
  ) {
    return null;
  }

  const normalized =
    snapshot.normalized ||
    normalizeGRTDecision(
      decision
    );

  const sustainedMove =
    decision.sustainedMove ||
    null;

  const change5m =
    sustainedMove?.ready
      ? safeNumber(
          sustainedMove.change5m,
          0
        )
      : 0;

  const change15m =
    sustainedMove?.ready
      ? safeNumber(
          sustainedMove.change15m,
          0
        )
      : 0;

  const directionText =
    normalized.directionText ||
    decision.directionText ||
    "🚀 NAIK LAJU";

  const reason =
    decision.reason ||
    "MOMENTUM CONFIRMED";

  return `🚨 GRT BUY NOW

🪙 GRT RM${formatPrice(
    "GRT",
    ticker.currentPrice
  )}
⏱ 5M: ${formatPercent(
    change5m
  )} | 15M: ${formatPercent(
    change15m
  )}

⚡ 🟢 BUY NOW
${directionText}

🧠 Sebab: ${reason}`;
}

/* ============================================================
   IMMEDIATE BUY NOW NOTIFICATION GUARD

   Prevent Telegram spam.

   IMPORTANT:

   Signal handler already has its own
   BUY NOW cooldown.

   This guard is only for the
   immediate Telegram notification.
============================================================ */

let LAST_GRT_IMMEDIATE_BUY_ALERT_AT =
  null;

function getImmediateGRTBuyAlertCooldown() {
  if (
    !LAST_GRT_IMMEDIATE_BUY_ALERT_AT
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
    LAST_GRT_IMMEDIATE_BUY_ALERT_AT;

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
   SEND IMMEDIATE BUY NOW ALERT

   Called by 1-minute master scanner
   when decision becomes BUY_NOW.
============================================================ */

async function sendImmediateGRTBuyNowAlert(
  snapshot
) {
  if (
    !snapshot ||
    !snapshot.ticker ||
    !snapshot.decision
  ) {
    return {
      sent:
        false,

      reason:
        "MISSING SNAPSHOT",
    };
  }

  if (
    snapshot.decision.status !==
    "BUY_NOW"
  ) {
    return {
      sent:
        false,

      reason:
        "NOT BUY NOW",
    };
  }

  const cooldown =
    getImmediateGRTBuyAlertCooldown();

  /*
    If same BUY NOW was already pushed
    recently, don't spam Telegram.
  */

  if (
    cooldown.active
  ) {
    return {
      sent:
        false,

      reason:
        "IMMEDIATE ALERT COOLDOWN",

      remainingMs:
        cooldown.remainingMs,
    };
  }

  const message =
    buildImmediateGRTBuyNowMessage(
      snapshot
    );

  if (
    !message
  ) {
    return {
      sent:
        false,

      reason:
        "MESSAGE UNAVAILABLE",
    };
  }

  await sendTelegram(
    message
  );

  LAST_GRT_IMMEDIATE_BUY_ALERT_AT =
    Date.now();

  return {
    sent:
      true,

    message,
  };
}

/* ============================================================
   PROCESS GRT MASTER SCAN RESULT

   One place to process results from
   the future 1-minute master scanner.

   DON'T BUY:
   update state only.

   CEK MOMENTUM:
   update state only.

   BUY NOW:
   - immediate Telegram alert
   - shared BUY NOW handler
============================================================ */

async function processGRTMasterScanResult(
  snapshot
) {
  if (
    !snapshot ||
    !snapshot.ticker ||
    !snapshot.decision
  ) {
    return {
      processed:
        false,

      reason:
        "INVALID SNAPSHOT",
    };
  }

  const decision =
    snapshot.decision;

  if (
    decision.status !==
    "BUY_NOW"
  ) {
    return {
      processed:
        true,

      status:
        decision.status,

      immediateAlert:
        null,

      buyHandler:
        null,
    };
  }

  /* ========================================================
     BUY NOW

     Immediate notification first.
  ======================================================== */

  const immediateAlert =
    await sendImmediateGRTBuyNowAlert(
      snapshot
    );

  /*
    Same decision goes into shared
    scalping entry handler.

    No separate BUY logic here.
  */

  const buyHandler =
    await handleGRTBuyNowSignal(
      snapshot.ticker,
      decision
    );

  return {
    processed:
      true,

    status:
      "BUY_NOW",

    immediateAlert,

    buyHandler,
  };
}/* ============================================================
   FINAL CORRECTION B
   2H CONTEXT + SCALPING SUPPORT HELPERS

   PURPOSE:

   Restore missing:

   - analyze2HMarketCondition()
   - allowGRTEntryAgainst2H()
   - getScalpingScore()
   - confidenceLabel()
   - getResistanceRating()

   IMPORTANT:

   2H = CONTEXT / FILTER ONLY.

   Ia TIDAK menghasilkan BUY NOW.

   BUY NOW tetap datang daripada
   GRT Momentum Engine.
============================================================ */


/* ============================================================
   2H MARKET CONDITION

   Uses executed trades already stored
   in TRADE_HISTORY.

   This avoids creating another
   external market scanner.
============================================================ */

async function analyze2HMarketCondition(
  coin
) {
  const flow =
    getExecutedFlowSummary(
      coin,
      TWO_HOURS
    );

  const priceResponse =
    getExecutedPriceResponse(
      coin,
      TWO_HOURS
    );

  const trades =
    getTradesInWindow(
      coin,
      TWO_HOURS
    );

  const now =
    Date.now();

  const oldestTrade =
    trades.length
      ? trades[0]
      : null;

  const newestTrade =
    trades.length
      ? trades[
          trades.length -
            1
        ]
      : null;

  const coverageMs =
    oldestTrade &&
    newestTrade
      ? Math.max(
          0,
          newestTrade.timestamp -
            oldestTrade.timestamp
        )
      : 0;

  const coverageReady =
    Boolean(
      coverageMs >=
      TWO_HOUR_MIN_COVERAGE_MS
    );

  const flowReady =
    Boolean(
      flow &&
      flow.totalCount >
        0
    );

  const priceReady =
    Boolean(
      priceResponse
        ?.ready
    );

  const buyVolumePct =
    flowReady
      ? safeNumber(
          flow.buyVolumePct,
          50
        )
      : 50;

  const sellVolumePct =
    flowReady
      ? safeNumber(
          flow.sellVolumePct,
          50
        )
      : 50;

  const buyFrequencyPct =
    flowReady
      ? safeNumber(
          flow.buyFrequencyPct,
          50
        )
      : 50;

  const sellFrequencyPct =
    flowReady
      ? safeNumber(
          flow.sellFrequencyPct,
          50
        )
      : 50;

  const changePct =
    priceReady
      ? safeNumber(
          priceResponse.changePct,
          0
        )
      : 0;

  let direction =
    "SIDEWAY";

  /*
    Strong directional context.
  */

  if (
    changePct >=
      1.00 &&
    buyVolumePct >=
      55
  ) {
    direction =
      "BULLISH_STRONG";
  } else if (
    changePct >=
      0.25
  ) {
    direction =
      "BULLISH";
  } else if (
    changePct <=
      -1.00 &&
    sellVolumePct >=
      55
  ) {
    direction =
      "BEARISH_STRONG";
  } else if (
    changePct <=
      -0.25
  ) {
    direction =
      "BEARISH";
  }

  let pressure =
    "BALANCED";

  if (
    buyVolumePct >=
      65 &&
    buyFrequencyPct >=
      55
  ) {
    pressure =
      "BUY_STRONG";
  } else if (
    buyVolumePct >=
      55
  ) {
    pressure =
      "BUY";
  } else if (
    sellVolumePct >=
      65 &&
    sellFrequencyPct >=
      55
  ) {
    pressure =
      "SELL_STRONG";
  } else if (
    sellVolumePct >=
      55
  ) {
    pressure =
      "SELL";
  }

  return {
    coin,

    ready:
      Boolean(
        flowReady &&
        priceReady
      ),

    coverageReady,

    coverageMs,

    coverageMinutes:
      coverageMs /
      60000,

    totalTrades:
      flow?.totalCount ||
      0,

    buyVolumePct,

    sellVolumePct,

    buyFrequencyPct,

    sellFrequencyPct,

    changePct,

    direction,

    pressure,

    bullish:
      direction ===
        "BULLISH" ||
      direction ===
        "BULLISH_STRONG",

    bearish:
      direction ===
        "BEARISH" ||
      direction ===
        "BEARISH_STRONG",

    stronglyBullish:
      direction ===
      "BULLISH_STRONG",

    stronglyBearish:
      direction ===
      "BEARISH_STRONG",

    timestamp:
      now,
  };
}


/* ============================================================
   GRT ENTRY PERMISSION AGAINST 2H

   2H = CONTEXT ONLY.

   Jangan veto momentum baru hanya
   sebab 2H masih sedikit bearish.

   Hard veto hanya apabila:

   - 2H clearly bearish
   - sell flow strong
   - current GRT momentum belum cukup
     kuat untuk override context
============================================================ */

function allowGRTEntryAgainst2H({
  twoHour,
  momentum,
}) {
  /*
    Kalau 2H data belum cukup,
    jangan block BUY NOW.

    Neutral modifier sahaja.
  */

  if (
    !twoHour ||
    !twoHour.ready
  ) {
    return {
      allowed:
        true,

      modifier:
        0,

      reason:
        "2H DATA NOT READY — MOMENTUM ENGINE HAS PRIORITY",
    };
  }

  const accelerating =
    Boolean(
      momentum
        ?.sustainedMove
        ?.accelerating
    );

  const strong15m =
    Boolean(
      momentum
        ?.sustainedMove
        ?.momentum15mStrong
    );

  const sustained =
    Boolean(
      momentum
        ?.sustainedMove
        ?.sustained
    );

  const momentumScore =
    safeNumber(
      momentum?.score,
      0
    );

  /*
    2H bullish assists execution score.
  */

  if (
    twoHour.stronglyBullish
  ) {
    return {
      allowed:
        true,

      modifier:
        8,

      reason:
        "2H STRONG BULLISH CONTEXT",
    };
  }

  if (
    twoHour.bullish
  ) {
    return {
      allowed:
        true,

      modifier:
        4,

      reason:
        "2H BULLISH CONTEXT",
    };
  }

  /*
    Strong current momentum may override
    older bearish 2H context.

    This prevents a new reversal from
    being detected too late.
  */

  const canOverrideBearishContext =
    Boolean(
      accelerating ||
      strong15m ||
      (
        sustained &&
        momentumScore >=
          7
      )
    );

  if (
    twoHour.stronglyBearish &&
    twoHour.pressure ===
      "SELL_STRONG" &&
    !canOverrideBearishContext
  ) {
    return {
      allowed:
        false,

      modifier:
        -12,

      reason:
        "2H STRONG SELL CONTEXT",
    };
  }

  if (
    twoHour.stronglyBearish &&
    canOverrideBearishContext
  ) {
    return {
      allowed:
        true,

      modifier:
        -5,

      reason:
        "CURRENT MOMENTUM OVERRIDES 2H BEARISH CONTEXT",
    };
  }

  if (
    twoHour.bearish
  ) {
    return {
      allowed:
        true,

      modifier:
        -3,

      reason:
        "2H BEARISH CONTEXT — CAUTION ONLY",
    };
  }

  return {
    allowed:
      true,

    modifier:
      0,

    reason:
      "2H NEUTRAL CONTEXT",
  };
}


/* ============================================================
   SCALPING SCORE

   Base execution-quality score.

   BUY NOW momentum score is added
   later by triggerMomentumScalpingEntry().

   Therefore this helper should NOT
   duplicate the entire momentum engine.
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

  const change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change ??
            snapshot15m.changePct,
          0
        )
      : 0;

  const change60m =
    snapshot60m
      ? safeNumber(
          snapshot60m.change ??
            snapshot60m.changePct,
          0
        )
      : 0;

  const price =
    safeNumber(
      currentPrice,
      0
    );

  const supportPrice =
    safeNumber(
      support,
      0
    );

  const resistancePrice =
    safeNumber(
      resistance,
      0
    );

  /* ========================================================
     15M PRICE DIRECTION
  ======================================================== */

  if (
    change15m >=
      1.00
  ) {
    score +=
      10;
  } else if (
    change15m >=
      0.45
  ) {
    score +=
      7;
  } else if (
    change15m >=
      0.15
  ) {
    score +=
      4;
  } else if (
    change15m <=
      -0.75
  ) {
    score -=
      10;
  } else if (
    change15m <=
      -0.25
  ) {
    score -=
      5;
  }

  /* ========================================================
     60M CONTEXT

     Context only.
     Smaller weight than 15M.
  ======================================================== */

  if (
    change60m >=
      1.50
  ) {
    score +=
      5;
  } else if (
    change60m >=
      0.40
  ) {
    score +=
      2;
  } else if (
    change60m <=
      -1.50
  ) {
    score -=
      6;
  } else if (
    change60m <=
      -0.40
  ) {
    score -=
      3;
  }

  /* ========================================================
     EXECUTED PRESSURE
  ======================================================== */

  const pressureText =
    String(
      pressure ||
      ""
    ).toUpperCase();

  if (
    pressureText.includes(
      "BELI KUAT"
    ) ||
    pressureText ===
      "BUY_STRONG"
  ) {
    score +=
      8;
  } else if (
    pressureText.includes(
      "BELI"
    ) ||
    pressureText ===
      "BUY"
  ) {
    score +=
      4;
  }

  if (
    pressureText.includes(
      "JUAL KUAT"
    ) ||
    pressureText ===
      "SELL_STRONG"
  ) {
    score -=
      10;
  } else if (
    pressureText.includes(
      "JUAL"
    ) ||
    pressureText ===
      "SELL"
  ) {
    score -=
      5;
  }

  /* ========================================================
     MARKET STRUCTURE DIRECTION
  ======================================================== */

  const marketText =
    String(
      market ||
      ""
    ).toUpperCase();

  if (
    marketText.includes(
      "NAIK KUAT"
    )
  ) {
    score +=
      7;
  } else if (
    marketText.includes(
      "NAIK"
    )
  ) {
    score +=
      4;
  }

  if (
    marketText.includes(
      "TURUN KUAT"
    )
  ) {
    score -=
      8;
  } else if (
    marketText.includes(
      "TURUN"
    )
  ) {
    score -=
      4;
  }

  /* ========================================================
     SUPPORT LOCATION

     Near support = slightly better
     risk/reward.

     Do not overweight it.
  ======================================================== */

  if (
    price >
      0 &&
    supportPrice >
      0 &&
    supportPrice <
      price
  ) {
    const supportDistancePct =
      Math.abs(
        percentChange(
          price,
          supportPrice
        )
      );

    if (
      supportDistancePct <=
      0.50
    ) {
      score +=
        3;
    }
  }

  /* ========================================================
     RESISTANCE ROOM

     Very close resistance reduces
     execution quality.

     Final TP room engine still makes
     the actual entry decision.
  ======================================================== */

  if (
    price >
      0 &&
    resistancePrice >
      price
  ) {
    const resistanceDistancePct =
      percentChange(
        price,
        resistancePrice
      );

    if (
      resistanceDistancePct >=
      2.00
    ) {
      score +=
        4;
    } else if (
      resistanceDistancePct <
      0.60
    ) {
      score -=
        6;
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
   CONFIDENCE LABEL

   Used by scalping notification.

   Existing bot format:
   STRONG / MID / WEAK
============================================================ */

function confidenceLabel(
  score
) {
  const value =
    safeNumber(
      score,
      0
    );

  if (
    value >=
    78
  ) {
    return "STRONG";
  }

  if (
    value >=
    65
  ) {
    return "MID";
  }

  return "WEAK";
}


/* ============================================================
   RESISTANCE RATING

   Candidate resistance may be:

   - wall object with .rating
   - nested wall information
   - null

   Always return 1-10.
============================================================ */

function getResistanceRating(
  resistance
) {
  if (
    !resistance
  ) {
    return 0;
  }

  const directRating =
    safeNumber(
      resistance.rating,
      NaN
    );

  if (
    Number.isFinite(
      directRating
    )
  ) {
    return clamp(
      Math.round(
        directRating
      ),
      1,
      10
    );
  }

  const strength =
    String(
      resistance.strength ||
      resistance.class ||
      ""
    ).toUpperCase();

  if (
    strength ===
    "STRONG"
  ) {
    return 8;
  }

  if (
    strength ===
      "MEDIUM" ||
    strength ===
      "MID"
  ) {
    return 5;
  }

  if (
    strength ===
    "WEAK"
  ) {
    return 2;
  }

  return 1;
}

/* ============================================================
   PART 6A — GRT ENTRY + TARGET ENGINE

   PURPOSE:

   BUY NOW sudah disahkan oleh
   Momentum Engine.

   Sekarang kita tentukan:

   1. Berapa jauh price munasabah boleh pergi
   2. TP1
   3. TP2 jika momentum kuat
   4. Resistance yang menghalang
   5. Adakah masih cukup room untuk scalping
   6. Entry price terbaik tanpa chase
   7. Final TP / SL structure

   IMPORTANT:

   BUY NOW != blind buy.

   BUY NOW hanya bermaksud:
   MOMENTUM ENTRY QUALIFIED.

   Part 6A masih perlu pastikan:
   ada ruang keuntungan yang praktikal.
============================================================ */

/* ============================================================
   GRT RAW PROJECTED MOVE

   Dynamic projection.

   5M / 15M momentum baru kita
   diberi weight di sini juga.
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

  const reason =
    momentum.reason ||
    "";

  /* ========================================================
     INTERNAL MOMENTUM PHASE
  ======================================================== */

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
      "EARLY_MOMENTUM" ||
    phase ===
      "VERIFYING"
  ) {
    projectedPct =
      Math.max(
        projectedPct,
        GRT_HOLD_BASE_REACH
          .STRONG
      );
  }

  if (
    phase ===
      "ACCELERATION" ||
    reason ===
      "ACCELERATION" ||
    reason ===
      "FAST 5M BREAKOUT"
  ) {
    projectedPct =
      GRT_HOLD_BASE_REACH
        .ACCELERATING;
  }

  /* ========================================================
     NEW 15M BACKBONE

     Contoh:
     5M +0.14%
     15M +1.41%

     Projection tidak patut kembali
     terlalu lemah hanya sebab latest
     5M mengecil.
  ======================================================== */

  const sustained =
    momentum
      .sustainedMove;

  if (
    sustained
      ?.momentum15mActive
  ) {
    projectedPct +=
      0.30;
  }

  if (
    sustained
      ?.momentum15mStrong
  ) {
    projectedPct +=
      0.45;
  }

  if (
    reason ===
    "15M MOMENTUM CONFIRMED"
  ) {
    projectedPct +=
      0.25;
  }

  /* ========================================================
     MOMENTUM SCORE
  ======================================================== */

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

  /* ========================================================
     SUSTAINED / ACCELERATION
  ======================================================== */

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

  if (
    sustained?.fastReevaluate
  ) {
    projectedPct +=
      0.15;
  }

  /* ========================================================
     EXECUTED BUY FLOW
  ======================================================== */

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

  /* ========================================================
     1H CONTEXT

     Context only.

     Jangan overpower fresh
     5M / 15M momentum.
  ======================================================== */

  if (
    momentum.trend
      ?.oneHourBearish
  ) {
    projectedPct -=
      0.35;
  }

  /* ========================================================
     BTC CONTEXT

     Small bonus only.
  ======================================================== */

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
    GRT_HOLD_BASE_REACH
      .WEAK,
    GRT_HOLD_MAX_DYNAMIC_REACH_PCT
  );
}

/* ============================================================
   FIND GRT RESISTANCE MAP

   Return all ask walls above
   current price in nearest-first order.
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

   TP is NOT fixed percentage.

   Projection is based on:
   - current momentum
   - 15M backbone
   - executed BUY flow
   - orderbook resistance
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

  /* ========================================================
     ORDERBOOK UNAVAILABLE

     Still provide momentum projection.
  ======================================================== */

  if (
    !resistanceMap.ready
  ) {
    return {
      currentPrice,

      rawMovePct,

      rawProjection,

      tp1:
        rawProjection,

      tp1MovePct:
        rawMovePct,

      tp1Confidence:
        momentum?.score >=
          8
          ? "MEDIUM"
          : "LOW",

      tp1Resistance:
        null,

      tp2:
        null,

      tp2MovePct:
        null,

      tp2Confidence:
        null,

      tp2Resistance:
        null,

      tp2Requirement:
        null,

      structure:
        null,

      reason:
        "MOMENTUM PROJECTION — ORDERBOOK UNAVAILABLE",
    };
  }

  const walls =
    resistanceMap.walls;

  /*
    Weak resistance 1-3 boleh di-skip.
  */

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

  /* ========================================================
     TP1 NEAR FIRST MEANINGFUL WALL
  ======================================================== */

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
      Jangan hasilkan TP lebih rendah
      daripada current price.

      Kalau buffer terlalu dekat,
      resistance sendiri jadi
      obstacle reference.
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

  /* ========================================================
     TP1 CONFIDENCE
  ======================================================== */

  if (
    (
      momentum?.reason ===
        "ACCELERATION" ||
      momentum?.reason ===
        "FAST 5M BREAKOUT"
    ) &&
    tp1MovePct >=
      1
  ) {
    tp1Confidence =
      "HIGH";
  } else if (
    momentum?.score >=
      7 ||
    momentum
      ?.sustainedMove
      ?.momentum15mStrong
  ) {
    tp1Confidence =
      "MEDIUM";
  } else {
    tp1Confidence =
      "LOW";
  }

  /* ========================================================
     TP2 CONTINUATION

     TP2 only when continuation
     evidence is strong.
  ======================================================== */

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
        momentum.reason ===
          "FAST 5M BREAKOUT" ||
        momentum.reason ===
          "15M MOMENTUM CONFIRMED" ||
        momentum
          .sustainedMove
          ?.accelerating ||
        momentum
          .sustainedMove
          ?.momentum15mStrong ||
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
        meaningfulWalls
          .findIndex(
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
        "ACCELERATION" ||
      momentum.reason ===
        "FAST 5M BREAKOUT"
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

    if (
      momentum
        .sustainedMove
        ?.momentum15mStrong
    ) {
      extensionPct +=
        0.25;
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

      const beforeNextWall =
        nextWall.price *
        (
          1 -
          TP_RESISTANCE_BUFFER_PCT /
            100
        );

      if (
        beforeNextWall >
        tp1
      ) {
        tp2 =
          Math.min(
            extendedProjection,
            beforeNextWall
          );
      }
    } else {
      tp2 =
        extendedProjection;
    }

    if (
      tp2
    ) {
      tp2Confidence =
        (
          momentum.reason ===
            "ACCELERATION" ||
          momentum
            .sustainedMove
            ?.momentum15mStrong
        )
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

      /*
        TP2 terlalu dekat dengan TP1
        tak beri value tambahan.
      */

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
   PRELIMINARY ENTRY PRICE

   Compare:
   technical/current entry
   vs
   best ask.

   Jangan chase terlalu jauh.
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

  /*
    Ask terlalu jauh.

    Jangan kejar market.
  */

  return {
    entryPrice:
      technicalEntry,

    source:
      "TECHNICAL ENTRY — DON'T CHASE",

    chasePct:
      0,
  };
}

/* ============================================================
   QUANTITY-AWARE LIMIT ENTRY

   Kalau user nak quantity besar,
   best ask sahaja belum tentu cukup.

   Scan ask depth sampai quantity
   boleh dipenuhi dalam chase limit.
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

   BUY NOW alone is NOT sufficient.

   There must still be practical room
   from entry → TP1.
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

  /* ========================================================
     TOO LITTLE ROOM
  ======================================================== */

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

  /* ========================================================
     STRONG RESISTANCE TOO CLOSE

     Weak wall cannot block.
  ======================================================== */

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

   GRT uses dynamic momentum room.

   Other coins can still use generic
   resistance-aware target logic.
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
   BUILD ENTRY RISK LEVELS

   TP:
   from dynamic projected reach.

   SL:
   base protective SL,
   or structure-aware SL when relevant.
============================================================ */

function buildEntryRiskLevels({
  coin,
  entryPrice,
  brokenResistance =
    null,
  room,
  confidence =
    "MID",
}) {
  const tp =
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

  /*
    Default protective SL = -1.5%.

    Active trade logic nanti masih boleh
    EXIT EARLY sebelum SL jika momentum
    collapse.
  */

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
   FINAL GRT ENTRY QUALIFICATION

   This is the final Part 6A helper.

   Input:
   BUY NOW momentum decision.

   Output:
   whether there is enough practical
   price room to attempt scalping entry.

   It still does NOT create trade yet.
============================================================ */

async function qualifyGRTMomentumEntry({
  ticker,
  momentumDecision,
  requiredQuantity =
    0,
}) {
  if (
    !ticker ||
    !momentumDecision
  ) {
    return {
      allowed:
        false,

      reason:
        "MISSING ENTRY DATA",
    };
  }

  if (
    momentumDecision.status !==
    "BUY_NOW"
  ) {
    return {
      allowed:
        false,

      reason:
        "MOMENTUM NOT BUY NOW",
    };
  }

  const technicalEntry =
    ticker.currentPrice;

  /* ========================================================
     BEST ASK
  ======================================================== */

  const orderBook =
    await getTopOrderBook(
      "GRT"
    );

  const bestAsk =
    orderBook
      ?.asks?.[0]
      ?.price ||
    null;

  const preliminary =
    choosePreliminaryEntry({
      technicalEntry,

      bestAsk,
    });

  let finalEntry =
    preliminary.entryPrice;

  let entrySource =
    preliminary.source;

  let depth =
    null;

  /* ========================================================
     QUANTITY-AWARE DEPTH

     Only when quantity is already known.
  ======================================================== */

  if (
    requiredQuantity >
    0
  ) {
    depth =
      await chooseQuantityAwareLimitEntry({
        coin:
          "GRT",

        technicalEntry:
          finalEntry,

        requiredQuantity,
      });

    if (
      depth.finalEntry >
      0
    ) {
      finalEntry =
        depth.finalEntry;

      entrySource =
        depth.source;
    }
  }

  /* ========================================================
     FINAL ROOM CHECK BASED ON ACTUAL ENTRY
  ======================================================== */

  const room =
    await evaluateGRTMomentumRoom({
      entryPrice:
        finalEntry,

      momentum:
        momentumDecision,
    });

  if (
    !room.allowed
  ) {
    return {
      allowed:
        false,

      reason:
        room.reason,

      technicalEntry,

      finalEntry,

      entrySource,

      preliminary,

      depth,

      room,
    };
  }

  return {
    allowed:
      true,

    reason:
      "ENTRY ROOM QUALIFIED",

    technicalEntry,

    finalEntry,

    entrySource,

    chasePct:
      percentChange(
        technicalEntry,
        finalEntry
      ),

    preliminary,

    depth,

    room,

    tp1:
      room.tp1,

    tp2:
      room.tp2,

    projectedReach:
      room.projection,
  };
}
/* ============================================================
   PART 6B — CAPITAL + FEE + TRADE CREATION

   FLOW:

   BUY NOW
      ↓
   Entry Qualified
      ↓
   Send Scalping Entry
      ↓
   User START ENTRY
      ↓
   Enter Target Net Profit
      ↓
   Calculate Quantity + Luno Fees
      ↓
   Re-check Orderbook / TP Room
      ↓
   User places LIMIT ORDER
      ↓
   Enter Actual Matched Quantity
      ↓
   ACTIVE TRADE CREATED

   IMPORTANT:

   Target RM profit DOES NOT move TP.

   TP remains market / momentum based.

   Target RM only determines:
   REQUIRED QUANTITY.
============================================================ */

/* ============================================================
   LUNO NET PROFIT PER GROSS UNIT

   Gross purchased unit
      ↓ BUY_FEE
   Net trade unit
      ↓ SELL_FEE
   Net sell unit
============================================================ */

function calculateNetProfitPerGrossUnit({
  entryPrice,
  sellPrice,
}) {
  if (
    !entryPrice ||
    !sellPrice ||
    entryPrice <= 0 ||
    sellPrice <= 0
  ) {
    return null;
  }

  const sellableUnitFactor =
    (
      1 -
      BUY_FEE
    ) *
    (
      1 -
      SELL_FEE
    );

  const netSellValuePerGrossUnit =
    sellPrice *
    sellableUnitFactor;

  const netProfitPerGrossUnit =
    netSellValuePerGrossUnit -
    entryPrice;

  return {
    sellableUnitFactor,

    netSellValuePerGrossUnit,

    netProfitPerGrossUnit,

    profitable:
      netProfitPerGrossUnit >
      0,
  };
}

/* ============================================================
   ESTIMATE TRADE AFTER FEES

   Used for:
   - suggested order
   - matched quantity
   - diagnostics
============================================================ */

function calculateTradeAfterFees({
  quantity,
  entryPrice,
  sellPrice,
}) {
  const grossQuantity =
    safeNumber(
      quantity,
      0
    );

  if (
    grossQuantity <=
      0 ||
    entryPrice <=
      0 ||
    sellPrice <=
      0
  ) {
    return null;
  }

  const buyFeeUnit =
    grossQuantity *
    BUY_FEE;

  const netTradeUnit =
    grossQuantity -
    buyFeeUnit;

  const totalBuyCost =
    grossQuantity *
    entryPrice;

  const sellFeeUnit =
    netTradeUnit *
    SELL_FEE;

  const netSellUnit =
    netTradeUnit -
    sellFeeUnit;

  const netSellValue =
    netSellUnit *
    sellPrice;

  const netProfit =
    netSellValue -
    totalBuyCost;

  const netProfitPct =
    totalBuyCost >
      0
      ? (
          netProfit /
          totalBuyCost
        ) *
        100
      : 0;

  return {
    grossQuantity,

    buyFeeUnit,

    netTradeUnit,

    totalBuyCost,

    sellFeeUnit,

    netSellUnit,

    netSellValue,

    netProfit,

    netProfitPct,
  };
}

/* ============================================================
   FINAL ORDER PLAN

   Target profit decides quantity.

   TP remains technical projected reach.

   IMPORTANT FOR GRT:

   momentumSnapshot MUST be passed
   during every revalidation.

   Otherwise the new 5M / 15M dynamic
   projection would disappear here.
============================================================ */

async function resolveFinalOrderPlan(
  entry,
  targetProfit
) {
  if (
    !entry ||
    !targetProfit ||
    targetProfit <=
      0
  ) {
    return {
      allowed:
        false,

      reason:
        "INVALID ORDER REQUEST",
    };
  }

  let entryPrice =
    entry.preliminaryEntry ||
    entry.technicalEntry;

  /*
    We allow up to 4 recalculation loops
    because quantity can move the
    required orderbook entry price.
  */

  for (
    let attempt =
      0;
    attempt <
      4;
    attempt++
  ) {
    /* ======================================================
       RECHECK ROOM AT CURRENT ENTRY
    ====================================================== */

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

    /* ======================================================
       NET PROFIT AFTER LUNO FEES
    ====================================================== */

    const unitProfit =
      calculateNetProfitPerGrossUnit({
        entryPrice,

        sellPrice:
          risk.tp,
      });

    if (
      !unitProfit ||
      !unitProfit.profitable
    ) {
      return {
        allowed:
          false,

        reason:
          "NET PROFIT NEGATIVE AFTER FEES",
      };
    }

    /* ======================================================
       QUANTITY FROM TARGET NET PROFIT

       Example:

       target = RM20
       net profit per gross GRT = RM0.001
       quantity ≈ 20,000 GRT
    ====================================================== */

    const quantity =
      Math.ceil(
        targetProfit /
        unitProfit
          .netProfitPerGrossUnit
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

    /* ======================================================
       QUANTITY-AWARE ORDERBOOK CHECK
    ====================================================== */

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
      !nextEntry ||
      nextEntry <=
        0
    ) {
      return {
        allowed:
          false,

        reason:
          "ENTRY PRICE UNAVAILABLE",
      };
    }

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

    /* ======================================================
       ENTRY STABLE → FINAL PLAN READY
    ====================================================== */

    if (
      Math.abs(
        nextEntry -
        entryPrice
      ) <
      0.0000000001
    ) {
      const feeEstimate =
        calculateTradeAfterFees({
          quantity,

          entryPrice,

          sellPrice:
            risk.tp,
        });

      return {
        allowed:
          true,

        entryPrice,

        quantity,

        room,

        risk,

        grossRoomPct,

        netProfitPerGrossUnit:
          unitProfit
            .netProfitPerGrossUnit,

        estimatedNetProfit:
          feeEstimate
            ?.netProfit ||
          0,

        feeEstimate,

        depthSelection:
          depth,
      };
    }

    /*
      Entry moved because orderbook
      depth changed.

      Loop again:
      recalculate TP room + fees
      using new actual entry.
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
   SCALPING ENTRY ALERT

   This alert is still interactive.

   BUY NOW means momentum qualified.

   User still decides whether to
   START ENTRY.
============================================================ */

async function sendScalpingEntry(
  candidate
) {
  if (
    !candidate ||
    candidate.coin ===
      "BTC"
  ) {
    return {
      sent:
        false,

      reason:
        "INVALID ENTRY CANDIDATE",
    };
  }

  if (
    PENDING_ENTRIES[
      candidate.coin
    ] ||
    ACTIVE_TRADES[
      candidate.coin
    ]
  ) {
    return {
      sent:
        false,

      reason:
        "ENTRY OR TRADE ALREADY ACTIVE",
    };
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

    resistanceText =
      `

🧱 Next Resistance:
RM${formatPrice(
        candidate.coin,
        candidate
          .nextResistance
          .price
      )} — ${rating}/10`;
  }

  let tp2Text =
    "";

  if (
    candidate.tp2
  ) {
    tp2Text =
      `

🎯 TP2 — EXTENDED REACH:
RM${formatPrice(
        candidate.coin,
        candidate.tp2
      )}

⚠️ TP2:
CONDITIONAL`;

    if (
      candidate
        .tp2Requirement
    ) {
      tp2Text +=
        `

📌 TP2 Requirement:
${candidate.tp2Requirement}`;
    }
  }

  /*
    Don't expose confusing internal
    WATCHING_MOVE etc.

    Show momentum reason instead.
  */

  const momentumReason =
    candidate
      .momentumSnapshot
      ?.reason ||
    candidate.setup ||
    "MOMENTUM ENTRY";

  const message =
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
    )}${tp2Text}

🛑 SL Reference:
RM${formatPrice(
      candidate.coin,
      candidate.sl
    )}

⏳ Trade Duration:
${candidate.durationHours} HOURS

🧠 Confidence:
${candidate.score}% ${candidate.confidence}

⚡ Momentum:
${momentumReason}${resistanceText}

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

  return {
    sent:
      true,

    candidate,

    message,
  };
}

/* ============================================================
   MOMENTUM BUY NOW → SCALPING ENTRY

   BUY NOW already passed Part 3.

   This stage DOES NOT re-demand
   all momentum confirmation again.

   It only checks:
   - active/pending protection
   - live sell danger
   - fake breakout
   - 2H context
   - practical TP room
   - execution quality
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
    return {
      triggered:
        false,

      reason:
        "NOT BUY NOW",
    };
  }

  if (
    ACTIVE_TRADES[
      coin
    ] ||
    PENDING_ENTRIES[
      coin
    ]
  ) {
    return {
      triggered:
        false,

      reason:
        "TRADE OR ENTRY ALREADY ACTIVE",
    };
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
    return {
      triggered:
        false,

      reason:
        "PER COIN COOLDOWN",
    };
  }

  /* ======================================================
     EXECUTION QUALITY
  ====================================================== */

  const execution =
    await getExecutionStructureSnapshot(
      coin,
      ticker.currentPrice
    );

  if (
    !execution
  ) {
    return {
      triggered:
        false,

      reason:
        "EXECUTION DATA UNAVAILABLE",
    };
  }

  const flowReady =
    Boolean(
      execution.flow &&
      execution.flow.totalCount >=
        5
    );

  /*
    Don't treat 0 trades as
    100% sell pressure.
  */

  const liveSellDanger =
    Boolean(
      flowReady &&
      execution.flow
        .sellVolumePct >=
        GRT_HARD_SELL_VOLUME_PCT &&
      execution.flow
        .sellFrequencyPct >=
        58
    );

  if (
    liveSellDanger
  ) {
    return {
      triggered:
        false,

      reason:
        "LIVE SELL PRESSURE TOO STRONG",
    };
  }

  /* ======================================================
     FAKE BREAKOUT VETO
  ====================================================== */

  const fakeBreakout =
    getRecentFakeBreakout(
      coin
    );

  if (
    fakeBreakout
  ) {
    return {
      triggered:
        false,

      reason:
        "FAKE BREAKOUT",
    };
  }

  /* ======================================================
     2H CONTEXT
  ====================================================== */

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
    return {
      triggered:
        false,

      reason:
        twoHourPermission.reason,
    };
  }

  /* ======================================================
     FINAL ENTRY QUALIFICATION
  ====================================================== */

  const qualification =
    await qualifyGRTMomentumEntry({
      ticker,

      momentumDecision,
    });

  if (
    !qualification.allowed
  ) {
    return {
      triggered:
        false,

      reason:
        qualification.reason,

      qualification,
    };
  }

  /* ======================================================
     EXECUTION SCORE

     BUY NOW already passed momentum
     threshold, so we use a reasonable
     execution threshold here.
  ====================================================== */

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

  score +=
    Math.min(
      safeNumber(
        momentumDecision.score,
        0
      ) *
        2,
      20
    );

  score +=
    safeNumber(
      twoHourPermission
        .modifier,
      0
    );

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

  if (
    momentumDecision
      .sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      4;
  }

  /*
    Weak resistance isn't bearish.
  */

  if (
    execution.resistance &&
    execution.resistance.rating <=
      GRT_WEAK_RESISTANCE_MAX_RATING
  ) {
    score +=
      3;
  }

  score =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  if (
    score <
      60
  ) {
    return {
      triggered:
        false,

      reason:
        "EXECUTION SCORE TOO LOW",

      score,
    };
  }

  const confidence =
    confidenceLabel(
      score
    );

  const room =
    qualification.room;

  const risk =
    buildEntryRiskLevels({
      coin,

      entryPrice:
        qualification.finalEntry,

      room,

      confidence,
    });

  const setup =
    momentumDecision.reason ===
      "FAST 5M BREAKOUT"
      ? "FAST MOMENTUM"
      : momentumDecision.reason ===
          "15M MOMENTUM CONFIRMED"
        ? "15M MOMENTUM"
        : momentumDecision.reason ===
            "ACCELERATION"
          ? "EARLY ACCELERATION"
          : "MOMENTUM BUY NOW";

  const result =
    await sendScalpingEntry({
      coin,

      score,

      confidence,

      currentPrice:
        ticker.currentPrice,

      technicalEntry:
        qualification
          .technicalEntry,

      preliminaryEntry:
        qualification
          .finalEntry,

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

      setup,

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

  return {
    triggered:
      Boolean(
        result?.sent
      ),

    score,

    confidence,

    qualification,

    result,
  };
}

/* ============================================================
   CREATE ACTIVE TRADE FROM MATCHED QUANTITY

   This helper centralizes fee math
   and active-trade object creation.

   Telegram message-state machine later
   only needs to call this function.
============================================================ */

function createActiveTradeFromMatchedOrder({
  state,
  entry,
  matchedQuantity,
}) {
  if (
    !state ||
    !entry ||
    !Number.isFinite(
      matchedQuantity
    ) ||
    matchedQuantity <=
      0
  ) {
    return {
      created:
        false,

      reason:
        "INVALID MATCHED ORDER",
    };
  }

  const feeResult =
    calculateTradeAfterFees({
      quantity:
        matchedQuantity,

      entryPrice:
        state.entryPrice,

      sellPrice:
        state.tp,
    });

  if (
    !feeResult
  ) {
    return {
      created:
        false,

      reason:
        "FEE CALCULATION FAILED",
    };
  }

  const targetAchievement =
    state.targetProfit >
      0
      ? (
          feeResult.netProfit /
          state.targetProfit
        ) *
        100
      : 0;

  const trade = {
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

    adjustedProfit:
      feeResult.netProfit,

    buyFeeUnit:
      feeResult.buyFeeUnit,

    netTradeUnit:
      feeResult.netTradeUnit,

    totalBuyCost:
      feeResult.totalBuyCost,

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

  ACTIVE_TRADES[
    state.coin
  ] =
    trade;

  return {
    created:
      true,

    trade,

    feeResult,

    targetAchievement,
  };
}
/* ============================================================
   PART 6C — ACTIVE TRADE INTELLIGENCE + MONITOR

   PURPOSE:

   Once actual BUY is confirmed:

   ACTIVE TRADE
      ↓
   Continuous monitoring
      ↓
   ├─ TP1 reached
   ├─ TP2 extended reach
   ├─ SL
   ├─ HOLD
   ├─ CAUTION
   ├─ EXIT EARLY
   └─ Duration exceeded

   IMPORTANT:

   EXIT EARLY must NOT happen
   because of one red tick.

   We require combined evidence:
   - price structure
   - executed BUY / SELL flow
   - support
   - momentum
   - price vs entry
============================================================ */


/* ============================================================
   ACTIVE GRT HOLD STATUS

   Possible status:

   HOLD
   CAUTION
   EXIT_EARLY
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

  /* ======================================================
     EXECUTED FLOW

     Critical protection:

     If trade sample is too small,
     don't interpret empty / tiny data
     as genuine selling pressure.
  ====================================================== */

  const flowReady =
    Boolean(
      execution.flow &&
      execution.flow.totalCount >=
        5
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

  /* ======================================================
     SUPPORT CONDITION
  ====================================================== */

  const support =
    execution.support;

  const supportBroken =
    Boolean(
      support &&
      currentPrice <
        support.price *
          0.997
    );

  const supportHolding =
    Boolean(
      support &&
      !supportBroken
    );

  /* ======================================================
     SELL PRESSURE
  ====================================================== */

  const strongSellPressure =
    Boolean(
      flowReady &&
      sellPct >=
        65 &&
      sellFrequency >=
        58
    );

  /* ======================================================
     BUYER HEALTH
  ====================================================== */

  const buyerHealthy =
    Boolean(
      flowReady &&
      buyPct >=
        52 &&
      buyFrequency >=
        50
    );

  /* ======================================================
     MOMENTUM CONDITION
  ====================================================== */

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

  const momentum15mStrong =
    Boolean(
      momentum
        ?.sustainedMove
        ?.momentum15mStrong
    );

  /*
    Only treat momentum as genuinely
    lost when decision engine gives
    a bearish reason.

    WAITING alone is NOT enough.
  */

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

  /* ======================================================
     DANGER SCORE

     We deliberately require
     COMBINED bearish evidence.

     One condition alone should
     never trigger EXIT EARLY.
  ====================================================== */

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

  /* ======================================================
     HEALTH SCORE
  ====================================================== */

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
    momentum15mStrong
  ) {
    healthScore +=
      1;
  }

  if (
    supportHolding
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

  /* ======================================================
     FINAL STATUS
  ====================================================== */

  let status =
    "HOLD";

  let reason =
    "Trade structure masih stabil.";

  /*
    EXIT EARLY:

    Need serious combined weakness.
  */

  if (
    dangerScore >=
      5 &&
    dangerScore >
      healthScore
  ) {
    status =
      "EXIT_EARLY";

    reason =
      "Gabungan support break, selling pressure dan momentum weakness.";
  }

  /*
    CAUTION:

    Some weakness exists,
    but evidence is not strong enough
    for EXIT EARLY.
  */

  else if (
    dangerScore >=
      2 &&
    dangerScore >
      healthScore
  ) {
    status =
      "CAUTION";

    reason =
      "Weakness dikesan tetapi belum cukup kuat untuk EXIT EARLY.";
  }

  /*
    Strong healthy continuation.
  */

  else if (
    healthScore >=
      4
  ) {
    status =
      "HOLD";

    reason =
      "Buyer / momentum masih menyokong continuation.";
  }

  return {
    status,

    reason,

    currentPrice,

    moveFromEntryPct,

    dangerScore,

    healthScore,

    flowReady,

    buyPct,

    sellPct,

    buyFrequency,

    sellFrequency,

    support:
      support?.price ||
      null,

    supportBroken,

    strongSellPressure,

    buyerHealthy,

    sustained,

    accelerating,

    momentum15mStrong,

    momentumLost,

    momentumStatus:
      momentum?.status ||
      null,

    momentumReason:
      momentum?.reason ||
      null,
  };
}


/* ============================================================
   SEND HOLD STATUS ALERT

   Avoid repeating the same alert
   every monitor cycle.

   HOLD is normally silent.

   CAUTION / EXIT EARLY are alerts.
============================================================ */

async function sendActiveTradeStatusAlert(
  trade,
  analysis
) {
  if (
    !trade ||
    !analysis
  ) {
    return;
  }

  /*
    Don't spam HOLD messages.

    HOLD is stored internally.
  */

  if (
    analysis.status ===
      "HOLD"
  ) {
    return;
  }

  const current =
    analysis.currentPrice;

  const pnlText =
    analysis.moveFromEntryPct >=
      0
      ? `+${analysis.moveFromEntryPct.toFixed(
          2
        )}%`
      : `${analysis.moveFromEntryPct.toFixed(
          2
        )}%`;

  let flowText =
    "Flow belum cukup data";

  if (
    analysis.flowReady
  ) {
    flowText =
      `BUY ${analysis.buyPct.toFixed(
        1
      )}% | SELL ${analysis.sellPct.toFixed(
        1
      )}%`;
  }

  /* ======================================================
     CAUTION
  ====================================================== */

  if (
    analysis.status ===
      "CAUTION"
  ) {
    await sendTelegram(
      `⚠️ GRT TRADE CAUTION

💵 Current:
RM${formatPrice(
        "GRT",
        current
      )}

📌 Entry:
RM${formatPrice(
        "GRT",
        trade.buyPrice
      )}

📊 Price vs Entry:
${pnlText}

📦 Executed Flow:
${flowText}

🧠 Danger Score:
${analysis.dangerScore}

💚 Health Score:
${analysis.healthScore}

📌 Reason:
${analysis.reason}

━━━━━━━━━━━━━━

Belum cukup bukti untuk EXIT EARLY.

📡 Bot terus monitor trade.`
    );

    return;
  }

  /* ======================================================
     EXIT EARLY
  ====================================================== */

  if (
    analysis.status ===
      "EXIT_EARLY"
  ) {
    await sendTelegram(
      `🚨 GRT EXIT EARLY WARNING

💵 Current:
RM${formatPrice(
        "GRT",
        current
      )}

📌 Entry:
RM${formatPrice(
        "GRT",
        trade.buyPrice
      )}

📊 Price vs Entry:
${pnlText}

📦 Executed Flow:
${flowText}

🧱 Support:
${
  analysis.support
    ? `RM${formatPrice(
        "GRT",
        analysis.support
      )}`
    : "N/A"
}

🧠 Danger Score:
${analysis.dangerScore}

💚 Health Score:
${analysis.healthScore}

❌ Reason:
${analysis.reason}

━━━━━━━━━━━━━━

⚠️ Momentum trade sedang gagal.

Pertimbangkan EXIT sebelum SL.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "💰 SELL",

                callback_data:
                  `SELL_${trade.coin}`,
              },

              {
                text:
                  "📡 HOLD",

                callback_data:
                  `HOLD_${trade.coin}`,
              },
            ],
          ],
        },
      }
    );
  }
}


/* ============================================================
   TP1 ALERT
============================================================ */

async function sendTP1Alert(
  trade,
  ticker
) {
  const currentPrice =
    ticker.currentPrice;

  const result =
    calculateTradeAfterFees({
      quantity:
        trade.matchedQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice:
        currentPrice,
    });

  const netProfit =
    result?.netProfit ||
    0;

  await sendTelegram(
    `🎯 TP1 REACHED

🪙 ${trade.coin}

📌 Entry:
RM${formatPrice(
      trade.coin,
      trade.buyPrice
    )}

🎯 TP1:
RM${formatPrice(
      trade.coin,
      trade.tp
    )}

💵 Current:
RM${formatPrice(
      trade.coin,
      currentPrice
    )}

📦 Trade Unit:
${trade.matchedQuantity.toLocaleString(
      "en-MY"
    )} ${trade.coin}

💰 Estimated Net Profit:
RM${netProfit.toFixed(
      2
    )}

━━━━━━━━━━━━━━

TP1 projected reach telah dicapai.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "💰 SELL",

              callback_data:
                `SELL_${trade.coin}`,
            },

            {
              text:
                trade.tp2
                  ? "🚀 HOLD FOR TP2"
                  : "📡 HOLD",

              callback_data:
                `HOLD_${trade.coin}`,
            },
          ],
        ],
      },
    }
  );
}


/* ============================================================
   TP2 ALERT
============================================================ */

async function sendTP2Alert(
  trade,
  ticker
) {
  const currentPrice =
    ticker.currentPrice;

  const result =
    calculateTradeAfterFees({
      quantity:
        trade.matchedQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice:
        currentPrice,
    });

  const netProfit =
    result?.netProfit ||
    0;

  await sendTelegram(
    `🚀 TP2 EXTENDED REACH

🪙 ${trade.coin}

📌 Entry:
RM${formatPrice(
      trade.coin,
      trade.buyPrice
    )}

🎯 TP2:
RM${formatPrice(
      trade.coin,
      trade.tp2
    )}

💵 Current:
RM${formatPrice(
      trade.coin,
      currentPrice
    )}

💰 Estimated Net Profit:
RM${netProfit.toFixed(
      2
    )}

━━━━━━━━━━━━━━

🔥 Extended momentum target telah dicapai.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "💰 SELL",

              callback_data:
                `SELL_${trade.coin}`,
            },

            {
              text:
                "📡 HOLD",

              callback_data:
                `HOLD_${trade.coin}`,
            },
          ],
        ],
      },
    }
  );
}


/* ============================================================
   STOP LOSS ALERT
============================================================ */

async function sendSLAlert(
  trade,
  ticker
) {
  const currentPrice =
    ticker.currentPrice;

  const result =
    calculateTradeAfterFees({
      quantity:
        trade.matchedQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice:
        currentPrice,
    });

  const pnl =
    result?.netProfit ||
    0;

  await sendTelegram(
    `🛑 STOP LOSS TRIGGERED

🪙 ${trade.coin}

📌 Entry:
RM${formatPrice(
      trade.coin,
      trade.buyPrice
    )}

🛑 SL:
RM${formatPrice(
      trade.coin,
      trade.sl
    )}

💵 Current:
RM${formatPrice(
      trade.coin,
      currentPrice
    )}

📉 Estimated Net P/L:
RM${pnl.toFixed(
      2
    )}

━━━━━━━━━━━━━━

⚠️ Risk level telah ditembusi.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "💰 SELL",

              callback_data:
                `SELL_${trade.coin}`,
            },

            {
              text:
                "📡 HOLD",

              callback_data:
                `HOLD_${trade.coin}`,
            },
          ],
        ],
      },
    }
  );
}


/* ============================================================
   TRADE DURATION ALERT
============================================================ */

async function sendDurationAlert(
  trade,
  ticker
) {
  const currentPrice =
    ticker.currentPrice;

  const elapsedHours =
    (
      Date.now() -
      trade.startTime
    ) /
    (
      60 *
      60 *
      1000
    );

  const result =
    calculateTradeAfterFees({
      quantity:
        trade.matchedQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice:
        currentPrice,
    });

  const pnl =
    result?.netProfit ||
    0;

  await sendTelegram(
    `⏰ TRADE DURATION REACHED

🪙 ${trade.coin}

⏳ Planned Duration:
${trade.durationHours} HOURS

⏱ Elapsed:
${elapsedHours.toFixed(
      1
    )} HOURS

📌 Entry:
RM${formatPrice(
      trade.coin,
      trade.buyPrice
    )}

💵 Current:
RM${formatPrice(
      trade.coin,
      currentPrice
    )}

💰 Estimated Net P/L:
RM${pnl.toFixed(
      2
    )}

━━━━━━━━━━━━━━

Trade telah melepasi tempoh scalping asal.

Semak semula sama ada mahu SELL atau HOLD.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "💰 SELL",

              callback_data:
                `SELL_${trade.coin}`,
            },

            {
              text:
                "📡 HOLD",

              callback_data:
                `HOLD_${trade.coin}`,
            },
          ],
        ],
      },
    }
  );
}


/* ============================================================
   MONITOR ONE ACTIVE TRADE
============================================================ */

async function monitorSingleTrade(
  coin,
  trade
) {
  if (
    !trade
  ) {
    return;
  }

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker ||
    !ticker.currentPrice
  ) {
    return;
  }

  const currentPrice =
    ticker.currentPrice;

  /* ======================================================
     STOP LOSS

     SL is checked first because
     capital protection has priority.
  ====================================================== */

  if (
    !trade.slReached &&
    trade.sl &&
    currentPrice <=
      trade.sl
  ) {
    trade.slReached =
      true;

    await sendSLAlert(
      trade,
      ticker
    );

    /*
      IMPORTANT:

      We don't delete ACTIVE_TRADES here.

      Alert ≠ confirmed actual sell.

      Trade remains active until user
      presses SELL and enters matched
      sell price.
    */

    return;
  }

  /* ======================================================
     TP2

     Check before TP1 only when TP1
     has already been alerted.
  ====================================================== */

  if (
    trade.tpReached &&
    !trade.tp2Reached &&
    trade.tp2 &&
    currentPrice >=
      trade.tp2
  ) {
    trade.tp2Reached =
      true;

    await sendTP2Alert(
      trade,
      ticker
    );

    return;
  }

  /* ======================================================
     TP1
  ====================================================== */

  if (
    !trade.tpReached &&
    trade.tp &&
    currentPrice >=
      trade.tp
  ) {
    trade.tpReached =
      true;

    await sendTP1Alert(
      trade,
      ticker
    );

    return;
  }

  /* ======================================================
     DURATION
  ====================================================== */

  const elapsedHours =
    (
      Date.now() -
      trade.startTime
    ) /
    (
      60 *
      60 *
      1000
    );

  if (
    !trade.durationAlertSent &&
    trade.durationHours &&
    elapsedHours >=
      trade.durationHours
  ) {
    trade.durationAlertSent =
      true;

    await sendDurationAlert(
      trade,
      ticker
    );

    /*
      Don't return.

      HOLD intelligence should still
      run below.
    */
  }

  /* ======================================================
     GRT INTELLIGENT HOLD MONITOR

     Other coins keep normal TP/SL
     monitoring only.
  ====================================================== */

  if (
    coin !==
      "GRT"
  ) {
    return;
  }

  /*
    Don't run expensive market analysis
    every 15-second price cycle.

    Full HOLD analysis every 60 sec.
  */

  const HOLD_CHECK_INTERVAL =
    60 *
    1000;

  if (
    trade.lastHoldCheckAt &&
    Date.now() -
      trade.lastHoldCheckAt <
      HOLD_CHECK_INTERVAL
  ) {
    return;
  }

  trade.lastHoldCheckAt =
    Date.now();

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

  trade.lastHoldAnalysis =
    analysis;

  const previousStatus =
    trade.lastHoldStatus;

  trade.lastHoldStatus =
    analysis.status;

  /* ======================================================
     ALERT ONLY ON STATUS CHANGE

     HOLD → CAUTION
     CAUTION → EXIT
     HOLD → EXIT

     This prevents Telegram spam.
  ====================================================== */

  if (
    analysis.status ===
      previousStatus
  ) {
    return;
  }

  if (
    analysis.status ===
      "CAUTION" ||
    analysis.status ===
      "EXIT_EARLY"
  ) {
    await sendActiveTradeStatusAlert(
      trade,
      analysis
    );
  }
}


/* ============================================================
   ACTIVE TRADE MONITOR
============================================================ */

async function monitorTrades() {
  const coins =
    Object.keys(
      ACTIVE_TRADES
    );

  if (
    !coins.length
  ) {
    return;
  }

  for (
    const coin of
    coins
  ) {
    const trade =
      ACTIVE_TRADES[
        coin
      ];

    if (
      !trade
    ) {
      continue;
    }

    try {
      await monitorSingleTrade(
        coin,
        trade
      );
    } catch (
      error
    ) {
      console.log(
        `Trade monitor error ${coin}:`,
        error.message
      );
    }

    /*
      Small spacing if multiple coins
      are active.
    */

    await sleep(
      100
    );
  }
}


/* ============================================================
   CONFIRM ACTUAL SELL

   IMPORTANT:

   Alert is not treated as a sale.

   Only actual matched sell price
   closes ACTIVE_TRADES.
============================================================ */

async function confirmMatchedSell({
  coin,
  matchedPrice,
}) {
  const trade =
    ACTIVE_TRADES[
      coin
    ];

  if (
    !trade
  ) {
    return {
      confirmed:
        false,

      reason:
        "ACTIVE TRADE NOT FOUND",
    };
  }

  if (
    !Number.isFinite(
      matchedPrice
    ) ||
    matchedPrice <=
      0
  ) {
    return {
      confirmed:
        false,

      reason:
        "INVALID SELL PRICE",
    };
  }

  const result =
    calculateTradeAfterFees({
      quantity:
        trade.matchedQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice:
        matchedPrice,
    });

  if (
    !result
  ) {
    return {
      confirmed:
        false,

      reason:
        "P/L CALCULATION FAILED",
    };
  }

  const closedTrade = {
    ...trade,

    matchedSellPrice:
      matchedPrice,

    sellFeeUnit:
      result.sellFeeUnit,

    netSellUnit:
      result.netSellUnit,

    netSellValue:
      result.netSellValue,

    pnl:
      result.netProfit,

    pnlPct:
      result.netProfitPct,

    closedAt:
      Date.now(),
  };

  delete ACTIVE_TRADES[
    coin
  ];

  delete PENDING_ENTRIES[
    coin
  ];

  delete LAST_SIGNAL[
    coin
  ];

  LAST_GLOBAL_SIGNAL =
    0;

  return {
    confirmed:
      true,

    trade:
      closedTrade,

    pnl:
      result.netProfit,

    pnlPct:
      result.netProfitPct,
  };
}


/* ============================================================
   START ACTIVE TRADE MONITOR

   Fast price checks:
   every 15 seconds.

   Heavy GRT HOLD analysis:
   internally throttled to 60 seconds.
============================================================ */
/* ============================================================
   PART 7A — MASTER 1-MINUTE SCANNER

   CORE ARCHITECTURE:

   ONE MASTER SCANNER
          ↓
   GRT MOMENTUM SNAPSHOT
          ↓
   FINAL DECISION
          ↓
   ├─ DON'T BUY
   ├─ CEK MOMENTUM
   └─ BUY NOW
          ↓
   BUY NOW = immediate processing

   IMPORTANT:

   Price Alert 5M dan Market Structure
   15M TIDAK bina GRT decision baru.

   Mereka akan baca latest cached
   master snapshot.
============================================================ */

/* ============================================================
   MASTER SCANNER RUNTIME
============================================================ */

const MASTER_SCANNER_RUNTIME = {
  running:
    false,

  lastStartedAt:
    null,

  lastCompletedAt:
    null,

  lastDurationMs:
    null,

  totalRuns:
    0,

  skippedRuns:
    0,

  errors:
    0,

  latestGRTSnapshot:
    null,

  latestGRTProcessed:
    null,

  latestBTC:
    null,
};

/* ============================================================
   GET LATEST MASTER GRT SNAPSHOT

   Price Alert / Market Structure
   boleh guna snapshot ini.

   Tidak perlu analyse GRT sekali lagi
   jika snapshot masih fresh.
============================================================ */

function getLatestMasterGRTSnapshot(
  maxAgeMs =
    90 *
      1000
) {
  const snapshot =
    MASTER_SCANNER_RUNTIME
      .latestGRTSnapshot;

  if (
    !snapshot
  ) {
    return null;
  }

  const completedAt =
    MASTER_SCANNER_RUNTIME
      .lastCompletedAt;

  if (
    !completedAt
  ) {
    return null;
  }

  const ageMs =
    Date.now() -
    completedAt;

  if (
    ageMs >
    maxAgeMs
  ) {
    return null;
  }

  return snapshot;
}

/* ============================================================
   SCAN BTC CONTEXT

   BTC is reference only.

   We don't run a separate trading
   engine for BTC.
============================================================ */

async function scanMasterBTCContext() {
  const ticker =
    await getTicker(
      "BTC"
    );

  if (
    !ticker
  ) {
    return null;
  }

  const momentum =
    await getBTCBuySurge();

  return {
    ticker,

    momentum,

    scannedAt:
      Date.now(),
  };
}

/* ============================================================
   MASTER GRT SCAN

   This is the ONLY main GRT
   momentum analysis path.
============================================================ */

async function scanMasterGRT() {
  const snapshot =
    await getGRTMomentumSnapshot();

  if (
    !snapshot ||
    !snapshot.ticker ||
    !snapshot.decision
  ) {
    return {
      snapshot,

      processed:
        null,
    };
  }

  /*
    Process BUY NOW / normal state.

    BUY NOW:
    immediate alert +
    scalping handler.

    DON'T BUY / CEK MOMENTUM:
    state update only.
  */

  const processed =
    await processGRTMasterScanResult(
      snapshot
    );

  return {
    snapshot,

    processed,
  };
}

/* ============================================================
   MASTER SCANNER — ONE CYCLE

   Designed to run every 1 minute.

   Lock prevents overlapping runs.

   Example:
   previous API request takes 70 sec
   → next interval will SKIP instead
     of creating another concurrent scan.
============================================================ */

async function runMasterScanner1M() {
  if (
    MASTER_SCANNER_RUNTIME
      .running
  ) {
    MASTER_SCANNER_RUNTIME
      .skippedRuns++;

    console.log(
      "Master scanner skipped: previous cycle still running."
    );

    return {
      skipped:
        true,

      reason:
        "PREVIOUS SCAN STILL RUNNING",
    };
  }

  MASTER_SCANNER_RUNTIME
    .running =
    true;

  MASTER_SCANNER_RUNTIME
    .lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    /* ======================================================
       BTC + GRT

       Run in parallel where possible.
    ====================================================== */

    const [
      btcContext,
      grtResult,
    ] =
      await Promise.all([
        scanMasterBTCContext(),

        scanMasterGRT(),
      ]);

    MASTER_SCANNER_RUNTIME
      .latestBTC =
      btcContext;

    if (
      grtResult
        ?.snapshot
    ) {
      MASTER_SCANNER_RUNTIME
        .latestGRTSnapshot =
        grtResult.snapshot;
    }

    MASTER_SCANNER_RUNTIME
      .latestGRTProcessed =
      grtResult
        ?.processed ||
      null;

    MASTER_SCANNER_RUNTIME
      .lastCompletedAt =
      Date.now();

    MASTER_SCANNER_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

    MASTER_SCANNER_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      btc:
        btcContext,

      grt:
        grtResult,

      durationMs:
        MASTER_SCANNER_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    MASTER_SCANNER_RUNTIME
      .errors++;

    console.log(
      "Master 1M scanner error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    MASTER_SCANNER_RUNTIME
      .running =
      false;
  }
}

/* ============================================================
   MASTER SCANNER STATUS

   Used later by /status.
============================================================ */

function getMasterScannerStatus() {
  const latest =
    MASTER_SCANNER_RUNTIME
      .latestGRTSnapshot;

  return {
    running:
      MASTER_SCANNER_RUNTIME
        .running,

    totalRuns:
      MASTER_SCANNER_RUNTIME
        .totalRuns,

    skippedRuns:
      MASTER_SCANNER_RUNTIME
        .skippedRuns,

    errors:
      MASTER_SCANNER_RUNTIME
        .errors,

    lastStartedAt:
      MASTER_SCANNER_RUNTIME
        .lastStartedAt,

    lastCompletedAt:
      MASTER_SCANNER_RUNTIME
        .lastCompletedAt,

    lastDurationMs:
      MASTER_SCANNER_RUNTIME
        .lastDurationMs,

    grtStatus:
      latest
        ?.decision
        ?.status ||
      null,

    grtDirection:
      latest
        ?.decision
        ?.direction ||
      null,

    grtPrice:
      latest
        ?.ticker
        ?.currentPrice ||
      null,
  };
}
/* ============================================================
   PART 7B — CACHED ALERT DELIVERY

   PRICE ALERT:
   every 5 minutes

   MARKET STRUCTURE:
   every 15 minutes

   IMPORTANT:

   Both should reuse latest
   MASTER SCANNER GRT snapshot.

   This prevents:
   - duplicate GRT analysis
   - conflicting states
   - unnecessary Luno API calls
============================================================ */


/* ============================================================
   GET FRESH GRT SNAPSHOT FOR ALERT

   Prefer master cache.

   If cache expired / unavailable,
   only then build a fresh snapshot.
============================================================ */

async function getFreshGRTSnapshotForAlert(
  maxAgeMs =
    90 *
      1000
) {
  const cached =
    getLatestMasterGRTSnapshot(
      maxAgeMs
    );

  if (
    cached
  ) {
    return {
      snapshot:
        cached,

      source:
        "MASTER CACHE",
    };
  }

  /*
    Fallback only.

    Example:
    bot baru startup,
    master scanner belum sempat run.
  */

  const fresh =
    await getGRTMomentumSnapshot();

  return {
    snapshot:
      fresh,

    source:
      "FRESH FALLBACK",
  };
}


/* ============================================================
   SEND CACHED PRICE ALERT

   Price Alert = 5-minute notification.

   It does NOT mean analysis only
   happens every 5 minutes.

   GRT analysis still comes from
   Master Scanner every 1 minute.
============================================================ */

async function sendCachedPriceAlert() {
  try {
    const grtData =
      await getFreshGRTSnapshotForAlert(
        90 *
          1000
      );

    const result =
      await sendPriceAlert({
        grtSnapshot:
          grtData.snapshot,
      });

    return {
      sent:
        Boolean(
          result?.sent
        ),

      source:
        grtData.source,

      result,
    };
  } catch (
    error
  ) {
    console.log(
      "Cached Price Alert error:",
      error.message
    );

    return {
      sent:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   SEND CACHED MARKET STRUCTURE

   Market Structure = 15-minute
   descriptive notification.

   GRT criteria / momentum state
   comes from same cached snapshot.
============================================================ */

async function sendCachedMarketStructure() {
  try {
    const grtData =
      await getFreshGRTSnapshotForAlert(
        90 *
          1000
      );

    const result =
      await sendMarketStructure({
        grtSnapshot:
          grtData.snapshot,
      });

    return {
      sent:
        Boolean(
          result?.sent
        ),

      source:
        grtData.source,

      result,
    };
  } catch (
    error
  ) {
    console.log(
      "Cached Market Structure error:",
      error.message
    );

    return {
      sent:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   ALERT DELIVERY LOCKS

   Prevent overlapping Telegram jobs.

   Example:
   Price Alert request still running
   when next cycle starts.

   Don't launch duplicate delivery.
============================================================ */

const ALERT_DELIVERY_RUNTIME = {
  priceAlertRunning:
    false,

  marketStructureRunning:
    false,

  lastPriceAlertAt:
    null,

  lastMarketStructureAt:
    null,

  priceAlertErrors:
    0,

  marketStructureErrors:
    0,
};


/* ============================================================
   SAFE PRICE ALERT RUNNER
============================================================ */

async function runPriceAlert5M() {
  if (
    ALERT_DELIVERY_RUNTIME
      .priceAlertRunning
  ) {
    console.log(
      "Price Alert skipped: previous run still active."
    );

    return {
      skipped:
        true,
    };
  }

  ALERT_DELIVERY_RUNTIME
    .priceAlertRunning =
    true;

  try {
    const result =
      await sendCachedPriceAlert();

    if (
      result?.sent
    ) {
      ALERT_DELIVERY_RUNTIME
        .lastPriceAlertAt =
        Date.now();
    }

    return result;
  } catch (
    error
  ) {
    ALERT_DELIVERY_RUNTIME
      .priceAlertErrors++;

    console.log(
      "Price Alert 5M error:",
      error.message
    );

    return {
      sent:
        false,

      error:
        error.message,
    };
  } finally {
    ALERT_DELIVERY_RUNTIME
      .priceAlertRunning =
      false;
  }
}


/* ============================================================
   SAFE MARKET STRUCTURE RUNNER
============================================================ */

async function runMarketStructure15M() {
  if (
    ALERT_DELIVERY_RUNTIME
      .marketStructureRunning
  ) {
    console.log(
      "Market Structure skipped: previous run still active."
    );

    return {
      skipped:
        true,
    };
  }

  ALERT_DELIVERY_RUNTIME
    .marketStructureRunning =
    true;

  try {
    const result =
      await sendCachedMarketStructure();

    if (
      result?.sent
    ) {
      ALERT_DELIVERY_RUNTIME
        .lastMarketStructureAt =
        Date.now();
    }

    return result;
  } catch (
    error
  ) {
    ALERT_DELIVERY_RUNTIME
      .marketStructureErrors++;

    console.log(
      "Market Structure 15M error:",
      error.message
    );

    return {
      sent:
        false,

      error:
        error.message,
    };
  } finally {
    ALERT_DELIVERY_RUNTIME
      .marketStructureRunning =
      false;
  }
}


/* ============================================================
   ALERT DELIVERY STATUS

   Used later by /status.
============================================================ */

function getAlertDeliveryStatus() {
  return {
    priceAlertRunning:
      ALERT_DELIVERY_RUNTIME
        .priceAlertRunning,

    marketStructureRunning:
      ALERT_DELIVERY_RUNTIME
        .marketStructureRunning,

    lastPriceAlertAt:
      ALERT_DELIVERY_RUNTIME
        .lastPriceAlertAt,

    lastMarketStructureAt:
      ALERT_DELIVERY_RUNTIME
        .lastMarketStructureAt,

    priceAlertErrors:
      ALERT_DELIVERY_RUNTIME
        .priceAlertErrors,

    marketStructureErrors:
      ALERT_DELIVERY_RUNTIME
        .marketStructureErrors,
  };
}
/* ============================================================
   PART 7C — BACKGROUND DATA COLLECTORS

   PURPOSE:

   MASTER SCANNER = analysis brain

   COLLECTORS = data supply

   We still need lightweight collectors for:

   1. Executed trades
   2. Price memory
   3. Active trade monitoring

   IMPORTANT:

   Collector != another momentum scanner.

   Collector only gathers / maintains data.
============================================================ */


/* ============================================================
   COLLECTOR RUNTIME

   Prevent overlapping jobs.
============================================================ */

const COLLECTOR_RUNTIME = {
  executedTradesRunning:
    false,

  priceMemoryRunning:
    false,

  tradeMonitorRunning:
    false,

  lastExecutedTradesAt:
    null,

  lastPriceMemoryAt:
    null,

  lastTradeMonitorAt:
    null,

  executedTradesErrors:
    0,

  priceMemoryErrors:
    0,

  tradeMonitorErrors:
    0,
};


/* ============================================================
   EXECUTED TRADES COLLECTOR

   Uses existing:
   collectExecutedTrades()

   This is market-flow DATA collection,
   not a separate BUY/SELL decision engine.
============================================================ */

async function runExecutedTradesCollector() {
  if (
    COLLECTOR_RUNTIME
      .executedTradesRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "EXECUTED TRADES COLLECTOR BUSY",
    };
  }

  COLLECTOR_RUNTIME
    .executedTradesRunning =
    true;

  try {
    await collectTradeHistory();

    COLLECTOR_RUNTIME
      .lastExecutedTradesAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    COLLECTOR_RUNTIME
      .executedTradesErrors++;

    console.log(
      "Executed trades collector error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    COLLECTOR_RUNTIME
      .executedTradesRunning =
      false;
  }
}


/* ============================================================
   PRICE MEMORY COLLECTOR

   Uses existing:
   collectPriceMemory()

   This feeds:

   - 5M movement
   - 15M movement
   - 30M movement
   - 1H context

   Critical for the new momentum engine.
============================================================ */

async function runPriceMemoryCollector() {
  if (
    COLLECTOR_RUNTIME
      .priceMemoryRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "PRICE MEMORY COLLECTOR BUSY",
    };
  }

  COLLECTOR_RUNTIME
    .priceMemoryRunning =
    true;

  try {
    await updateMemory();

    COLLECTOR_RUNTIME
      .lastPriceMemoryAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    COLLECTOR_RUNTIME
      .priceMemoryErrors++;

    console.log(
      "Price memory collector error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    COLLECTOR_RUNTIME
      .priceMemoryRunning =
      false;
  }
}


/* ============================================================
   ACTIVE TRADE MONITOR RUNNER

   monitorTrades() already exists
   from Part 6C.

   Here we only provide the protected
   scheduler runner.

   Fast monitoring is useful for:
   - TP
   - SL
   - duration

   Heavy GRT HOLD analysis already has
   its own internal 60-second throttle.
============================================================ */

async function runActiveTradeMonitor() {
  if (
    COLLECTOR_RUNTIME
      .tradeMonitorRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "TRADE MONITOR BUSY",
    };
  }

  COLLECTOR_RUNTIME
    .tradeMonitorRunning =
    true;

  try {
    await monitorTrades();

    COLLECTOR_RUNTIME
      .lastTradeMonitorAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    COLLECTOR_RUNTIME
      .tradeMonitorErrors++;

    console.log(
      "Active trade monitor error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    COLLECTOR_RUNTIME
      .tradeMonitorRunning =
      false;
  }
}


/* ============================================================
   DATA READINESS

   Useful for diagnostics.

   Master scanner can still run during
   startup, but this tells us whether
   enough background data has begun
   accumulating.
============================================================ */

function getCollectorReadiness() {
  const now =
    Date.now();

  const executedAge =
    COLLECTOR_RUNTIME
      .lastExecutedTradesAt
      ? now -
        COLLECTOR_RUNTIME
          .lastExecutedTradesAt
      : null;

  const priceAge =
    COLLECTOR_RUNTIME
      .lastPriceMemoryAt
      ? now -
        COLLECTOR_RUNTIME
          .lastPriceMemoryAt
      : null;

  return {
    executedTradesReady:
      executedAge !==
        null &&
      executedAge <=
        60 *
          1000,

    priceMemoryReady:
      priceAge !==
        null &&
      priceAge <=
        60 *
          1000,

    executedAgeMs:
      executedAge,

    priceMemoryAgeMs:
      priceAge,
  };
}


/* ============================================================
   COLLECTOR STATUS

   Later /status can show whether
   any collector is stuck.
============================================================ */

function getCollectorStatus() {
  return {
    executedTrades: {
      running:
        COLLECTOR_RUNTIME
          .executedTradesRunning,

      lastRun:
        COLLECTOR_RUNTIME
          .lastExecutedTradesAt,

      errors:
        COLLECTOR_RUNTIME
          .executedTradesErrors,
    },

    priceMemory: {
      running:
        COLLECTOR_RUNTIME
          .priceMemoryRunning,

      lastRun:
        COLLECTOR_RUNTIME
          .lastPriceMemoryAt,

      errors:
        COLLECTOR_RUNTIME
          .priceMemoryErrors,
    },

    tradeMonitor: {
      running:
        COLLECTOR_RUNTIME
          .tradeMonitorRunning,

      lastRun:
        COLLECTOR_RUNTIME
          .lastTradeMonitorAt,

      errors:
        COLLECTOR_RUNTIME
          .tradeMonitorErrors,
    },
  };
}
/* ============================================================
   PART 7D — CENTRAL SCHEDULER

   ALL BACKGROUND TIMERS LIVE HERE.

   PURPOSE:

   5 SEC
   → executed trades collector

   15 SEC
   → price memory
   → active trade monitor

   1 MIN
   → master scanner

   5 MIN
   → Price Alert

   15 MIN
   → Market Structure

   IMPORTANT:

   This is the ONLY place that creates
   these repeating intervals.
============================================================ */


/* ============================================================
   SCHEDULER RUNTIME
============================================================ */

const SCHEDULER_RUNTIME = {
  started:
    false,

  startedAt:
    null,

  intervals: {},
};


/* ============================================================
   INTERVAL CONFIG

   Use existing constants where available.

   Fallback values are provided so
   scheduler remains robust.
============================================================ */

const CENTRAL_SCHEDULE = {
  executedTrades:
    typeof TRADE_COLLECT_INTERVAL !==
      "undefined"
      ? TRADE_COLLECT_INTERVAL
      : 5 *
        1000,

  priceMemory:
    typeof PRICE_MEMORY_INTERVAL !==
      "undefined"
      ? PRICE_MEMORY_INTERVAL
      : 15 *
        1000,

  activeTradeMonitor:
    15 *
    1000,

  masterScanner:
    60 *
    1000,

  priceAlert:
    typeof PRICE_ALERT_INTERVAL !==
      "undefined"
      ? PRICE_ALERT_INTERVAL
      : 5 *
        60 *
        1000,

  marketStructure:
    typeof MARKET_STRUCTURE_INTERVAL !==
      "undefined"
      ? MARKET_STRUCTURE_INTERVAL
      : 15 *
        60 *
        1000,
};


/* ============================================================
   SAFE INTERVAL CREATOR

   Prevent accidental duplicate timer
   creation for same scheduler key.
============================================================ */

function createSchedulerInterval(
  key,
  runner,
  intervalMs
) {
  if (
    SCHEDULER_RUNTIME
      .intervals[
        key
      ]
  ) {
    console.log(
      `Scheduler ${key} already active.`
    );

    return;
  }

  const id =
    setInterval(
      () => {
        Promise.resolve(
          runner()
        ).catch(
          error => {
            console.log(
              `Scheduler ${key} error:`,
              error.message
            );
          }
        );
      },
      intervalMs
    );

  SCHEDULER_RUNTIME
    .intervals[
      key
    ] =
    id;
}


/* ============================================================
   WARMUP

   Run collectors first before
   relying on master momentum state.
============================================================ */

async function warmupMarketData() {
  try {
    await Promise.all([
      runExecutedTradesCollector(),

      runPriceMemoryCollector(),
    ]);

    /*
      Small delay allows memory /
      executed data to settle.
    */

    await sleep(
      1000
    );

    await runMasterScanner1M();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.log(
      "Market data warmup error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   START CENTRAL SCHEDULER
============================================================ */

async function startCentralScheduler() {
  if (
    SCHEDULER_RUNTIME
      .started
  ) {
    console.log(
      "Central scheduler already started."
    );

    return {
      started:
        false,

      reason:
        "ALREADY STARTED",
    };
  }

  SCHEDULER_RUNTIME
    .started =
    true;

  SCHEDULER_RUNTIME
    .startedAt =
    Date.now();

  /* ========================================================
     INITIAL WARMUP
  ======================================================== */

  await warmupMarketData();

  /* ========================================================
     EXECUTED TRADES — 5 SEC
  ======================================================== */

  createSchedulerInterval(
    "executedTrades",

    runExecutedTradesCollector,

    CENTRAL_SCHEDULE
      .executedTrades
  );

  /* ========================================================
     PRICE MEMORY — 15 SEC
  ======================================================== */

  createSchedulerInterval(
    "priceMemory",

    runPriceMemoryCollector,

    CENTRAL_SCHEDULE
      .priceMemory
  );

  /* ========================================================
     ACTIVE TRADE MONITOR — 15 SEC
  ======================================================== */

  createSchedulerInterval(
    "activeTradeMonitor",

    runActiveTradeMonitor,

    CENTRAL_SCHEDULE
      .activeTradeMonitor
  );

  /* ========================================================
     MASTER SCANNER — 1 MIN
  ======================================================== */

  createSchedulerInterval(
    "masterScanner",

    runMasterScanner1M,

    CENTRAL_SCHEDULE
      .masterScanner
  );

  /* ========================================================
     PRICE ALERT — 5 MIN
  ======================================================== */

  createSchedulerInterval(
    "priceAlert",

    runPriceAlert5M,

    CENTRAL_SCHEDULE
      .priceAlert
  );

  /* ========================================================
     MARKET STRUCTURE — 15 MIN
  ======================================================== */

  createSchedulerInterval(
    "marketStructure",

    runMarketStructure15M,

    CENTRAL_SCHEDULE
      .marketStructure
  );

  console.log(
    "✅ Central scheduler started."
  );

  return {
    started:
      true,

    startedAt:
      SCHEDULER_RUNTIME
        .startedAt,
  };
}


/* ============================================================
   STOP CENTRAL SCHEDULER

   Useful for restart / diagnostics.
============================================================ */

function stopCentralScheduler() {
  const keys =
    Object.keys(
      SCHEDULER_RUNTIME
        .intervals
    );

  for (
    const key of
    keys
  ) {
    clearInterval(
      SCHEDULER_RUNTIME
        .intervals[
          key
        ]
    );
  }

  SCHEDULER_RUNTIME
    .intervals =
    {};

  SCHEDULER_RUNTIME
    .started =
    false;

  console.log(
    "Central scheduler stopped."
  );

  return {
    stopped:
      true,
  };
}


/* ============================================================
   SCHEDULER STATUS
============================================================ */

function getSchedulerStatus() {
  return {
    started:
      SCHEDULER_RUNTIME
        .started,

    startedAt:
      SCHEDULER_RUNTIME
        .startedAt,

    activeIntervals:
      Object.keys(
        SCHEDULER_RUNTIME
          .intervals
      ),

    schedule: {
      executedTradesMs:
        CENTRAL_SCHEDULE
          .executedTrades,

      priceMemoryMs:
        CENTRAL_SCHEDULE
          .priceMemory,

      activeTradeMonitorMs:
        CENTRAL_SCHEDULE
          .activeTradeMonitor,

      masterScannerMs:
        CENTRAL_SCHEDULE
          .masterScanner,

      priceAlertMs:
        CENTRAL_SCHEDULE
          .priceAlert,

      marketStructureMs:
        CENTRAL_SCHEDULE
          .marketStructure,
    },
  };
}
/* ============================================================
   PART 7E — LEARNING + PERSISTENCE RUNNERS

   PURPOSE:

   1. BUY NOW learning monitor
   2. Daily GRT state save
   3. BUY NOW learning state save

   IMPORTANT:

   These are background support jobs.

   They DO NOT perform a second
   GRT momentum decision.

   MASTER SCANNER remains
   the one analysis brain.
============================================================ */


/* ============================================================
   LEARNING / SAVE RUNTIME

   Prevent overlapping file writes
   or learning jobs.
============================================================ */

const BACKGROUND_STATE_RUNTIME = {
  learningRunning:
    false,

  dailySaveRunning:
    false,

  learningSaveRunning:
    false,

  lastLearningAt:
    null,

  lastDailySaveAt:
    null,

  lastLearningSaveAt:
    null,

  learningErrors:
    0,

  dailySaveErrors:
    0,

  learningSaveErrors:
    0,
};


/* ============================================================
   BUY NOW LEARNING RUNNER

   Existing function:
   monitorGRTBuyNowSignals()

   This evaluates historical BUY NOW
   signals AFTER they were generated.

   It does NOT create BUY NOW.
============================================================ */

async function runGRTBuyNowLearning() {
  if (
    BACKGROUND_STATE_RUNTIME
      .learningRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "BUY NOW LEARNING BUSY",
    };
  }

  BACKGROUND_STATE_RUNTIME
    .learningRunning =
    true;

  try {
    await monitorGRTBuyNowSignals();

    BACKGROUND_STATE_RUNTIME
      .lastLearningAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    BACKGROUND_STATE_RUNTIME
      .learningErrors++;

    console.log(
      "GRT BUY NOW learning error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    BACKGROUND_STATE_RUNTIME
      .learningRunning =
      false;
  }
}


/* ============================================================
   DAILY WATCH SAVE RUNNER

   Existing:
   saveDailyWatchSnapshot()

   Save only.

   No market analysis.
============================================================ */

async function runDailyWatchSave() {
  if (
    BACKGROUND_STATE_RUNTIME
      .dailySaveRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "DAILY WATCH SAVE BUSY",
    };
  }

  BACKGROUND_STATE_RUNTIME
    .dailySaveRunning =
    true;

  try {
    saveDailyWatchSnapshot();

    BACKGROUND_STATE_RUNTIME
      .lastDailySaveAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    BACKGROUND_STATE_RUNTIME
      .dailySaveErrors++;

    console.log(
      "Daily watch save runner error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    BACKGROUND_STATE_RUNTIME
      .dailySaveRunning =
      false;
  }
}


/* ============================================================
   BUY NOW HISTORY SAVE RUNNER

   Existing:
   saveGRTBuyNowHistory()
============================================================ */

async function runGRTLearningSave() {
  if (
    BACKGROUND_STATE_RUNTIME
      .learningSaveRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "LEARNING SAVE BUSY",
    };
  }

  BACKGROUND_STATE_RUNTIME
    .learningSaveRunning =
    true;

  try {
    saveGRTBuyNowHistory();

    BACKGROUND_STATE_RUNTIME
      .lastLearningSaveAt =
      Date.now();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    BACKGROUND_STATE_RUNTIME
      .learningSaveErrors++;

    console.log(
      "GRT learning save runner error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    BACKGROUND_STATE_RUNTIME
      .learningSaveRunning =
      false;
  }
}


/* ============================================================
   BACKGROUND STATE STATUS

   Later /status can show whether
   learning / persistence is healthy.
============================================================ */

function getBackgroundStateStatus() {
  return {
    learning: {
      running:
        BACKGROUND_STATE_RUNTIME
          .learningRunning,

      lastRun:
        BACKGROUND_STATE_RUNTIME
          .lastLearningAt,

      errors:
        BACKGROUND_STATE_RUNTIME
          .learningErrors,

      records:
        Array.isArray(
          GRT_BUY_NOW_HISTORY
        )
          ? GRT_BUY_NOW_HISTORY
              .length
          : 0,
    },

    dailyWatchSave: {
      running:
        BACKGROUND_STATE_RUNTIME
          .dailySaveRunning,

      lastRun:
        BACKGROUND_STATE_RUNTIME
          .lastDailySaveAt,

      errors:
        BACKGROUND_STATE_RUNTIME
          .dailySaveErrors,
    },

    learningSave: {
      running:
        BACKGROUND_STATE_RUNTIME
          .learningSaveRunning,

      lastRun:
        BACKGROUND_STATE_RUNTIME
          .lastLearningSaveAt,

      errors:
        BACKGROUND_STATE_RUNTIME
          .learningSaveErrors,
    },
  };
}
/* ============================================================
   PART 7F — DAILY 12AM MALAYSIA ROLLOVER

   PURPOSE:

   Maintain GRT daily tracking:

   12:00 AM Malaysia
        ↓
   close previous daily watch
        ↓
   reset / create today's state
        ↓
   continue tracking

   IMPORTANT:

   We reuse existing:
   checkDailyWatchRollover()

   Do NOT create another daily-watch
   calculation engine here.
============================================================ */


/* ============================================================
   DAILY ROLLOVER RUNTIME
============================================================ */

const DAILY_ROLLOVER_RUNTIME = {
  running:
    false,

  lastCheckAt:
    null,

  lastDateKey:
    null,

  rolloverCount:
    0,

  errors:
    0,
};


/* ============================================================
   SAFE MALAYSIA DATE KEY

   Existing getMalaysiaDateKey()
   remains the main source.

   This wrapper prevents a scheduler
   failure if date processing throws.
============================================================ */

function getSafeMalaysiaDateKey() {
  try {
    return getMalaysiaDateKey();
  } catch (
    error
  ) {
    console.log(
      "Malaysia date key error:",
      error.message
    );

    return null;
  }
}


/* ============================================================
   DAILY WATCH ROLLOVER RUNNER

   This does NOT blindly reset state.

   Existing checkDailyWatchRollover()
   decides whether the Malaysia
   calendar date actually changed.
============================================================ */

async function runDailyWatchRollover() {
  if (
    DAILY_ROLLOVER_RUNTIME
      .running
  ) {
    return {
      skipped:
        true,

      reason:
        "DAILY ROLLOVER BUSY",
    };
  }

  DAILY_ROLLOVER_RUNTIME
    .running =
    true;

  const beforeDate =
    getSafeMalaysiaDateKey();

  try {
    await checkDailyWatchRollover();

    const afterDate =
      getSafeMalaysiaDateKey();

    DAILY_ROLLOVER_RUNTIME
      .lastCheckAt =
      Date.now();

    /*
      First run only establishes
      our scheduler reference date.

      It is NOT counted as rollover.
    */

    if (
      DAILY_ROLLOVER_RUNTIME
        .lastDateKey ===
        null
    ) {
      DAILY_ROLLOVER_RUNTIME
        .lastDateKey =
        afterDate ||
        beforeDate;

      return {
        success:
          true,

        rolledOver:
          false,

        dateKey:
          DAILY_ROLLOVER_RUNTIME
            .lastDateKey,
      };
    }

    /*
      If Malaysia date changed since
      previous scheduler check,
      existing daily rollover function
      has already handled the state.
    */

    const rolledOver =
      Boolean(
        afterDate &&
        DAILY_ROLLOVER_RUNTIME
          .lastDateKey &&
        afterDate !==
          DAILY_ROLLOVER_RUNTIME
            .lastDateKey
      );

    if (
      rolledOver
    ) {
      DAILY_ROLLOVER_RUNTIME
        .rolloverCount++;

      console.log(
        `🌙 GRT DAILY WATCH ROLLOVER: ${
          DAILY_ROLLOVER_RUNTIME
            .lastDateKey
        } → ${afterDate}`
      );
    }

    DAILY_ROLLOVER_RUNTIME
      .lastDateKey =
      afterDate ||
      DAILY_ROLLOVER_RUNTIME
        .lastDateKey;

    return {
      success:
        true,

      rolledOver,

      dateKey:
        DAILY_ROLLOVER_RUNTIME
          .lastDateKey,
    };
  } catch (
    error
  ) {
    DAILY_ROLLOVER_RUNTIME
      .errors++;

    console.log(
      "Daily watch rollover error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  } finally {
    DAILY_ROLLOVER_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   DAILY WATCH STATE HEALTH

   Diagnostic only.

   It DOES NOT modify GRT_DAILY_STATE.
============================================================ */

function getDailyWatchHealth() {
  const today =
    getSafeMalaysiaDateKey();

  const stateDate =
    GRT_DAILY_STATE
      ?.dateKey ||
    GRT_DAILY_STATE
      ?.date ||
    null;

  return {
    today,

    stateDate,

    aligned:
      Boolean(
        today &&
        stateDate &&
        today ===
          stateDate
      ),

    hasState:
      Boolean(
        GRT_DAILY_STATE
      ),

    lastRolloverCheck:
      DAILY_ROLLOVER_RUNTIME
        .lastCheckAt,

    rolloverCount:
      DAILY_ROLLOVER_RUNTIME
        .rolloverCount,

    errors:
      DAILY_ROLLOVER_RUNTIME
        .errors,
  };
}


/* ============================================================
   DAILY ROLLOVER STATUS
============================================================ */

function getDailyRolloverStatus() {
  return {
    running:
      DAILY_ROLLOVER_RUNTIME
        .running,

    lastCheckAt:
      DAILY_ROLLOVER_RUNTIME
        .lastCheckAt,

    lastDateKey:
      DAILY_ROLLOVER_RUNTIME
        .lastDateKey,

    rolloverCount:
      DAILY_ROLLOVER_RUNTIME
        .rolloverCount,

    errors:
      DAILY_ROLLOVER_RUNTIME
        .errors,

    health:
      getDailyWatchHealth(),
  };
}
/* ============================================================
   PART 7G — EXTRA BACKGROUND JOBS

   PASTE TERUS BAWAH PART 7F.

   TAK PERLU UBAH PART 7D.

   Job tambahan:

   1 MIN
   → BUY NOW learning

   1 MIN
   → Malaysia daily rollover check

   PERIODIC
   → Daily Watch save

   1 MIN
   → BUY NOW learning history save

   IMPORTANT:

   Kita masih guna:
   createSchedulerInterval()

   daripada PART 7D.

   Jadi timer tetap direkod dalam
   CENTRAL SCHEDULER yang sama.
============================================================ */


/* ============================================================
   EXTRA BACKGROUND SCHEDULE
============================================================ */

const EXTRA_BACKGROUND_SCHEDULE = {
  buyNowLearning:
    typeof GRT_BUY_NOW_MONITOR_INTERVAL !==
      "undefined"
      ? GRT_BUY_NOW_MONITOR_INTERVAL
      : 60 *
        1000,

  dailyRolloverCheck:
    60 *
    1000,

  dailyWatchSave:
    typeof DAILY_WATCH_SAVE_INTERVAL !==
      "undefined"
      ? DAILY_WATCH_SAVE_INTERVAL
      : 60 *
        1000,

  learningSave:
    60 *
    1000,
};


/* ============================================================
   EXTRA BACKGROUND RUNTIME
============================================================ */

const EXTRA_BACKGROUND_RUNTIME = {
  registered:
    false,

  registeredAt:
    null,
};


/* ============================================================
   INITIAL EXTRA BACKGROUND SYNC

   Run once during startup.

   No interval created here.
============================================================ */

async function warmupExtraBackgroundJobs() {
  try {
    /*
      Make sure Malaysia daily state
      is aligned immediately.
    */

    await runDailyWatchRollover();

    /*
      Save current persistent states.
    */

    await Promise.all([
      runDailyWatchSave(),

      runGRTLearningSave(),
    ]);

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.log(
      "Extra background warmup error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   REGISTER EXTRA BACKGROUND JOBS

   IMPORTANT:

   This uses the SAME
   createSchedulerInterval()

   from PART 7D.

   Jadi interval masih berada dalam:

   SCHEDULER_RUNTIME.intervals
============================================================ */

async function registerExtraBackgroundJobs() {
  if (
    EXTRA_BACKGROUND_RUNTIME
      .registered
  ) {
    console.log(
      "Extra background jobs already registered."
    );

    return {
      registered:
        false,

      reason:
        "ALREADY REGISTERED",
    };
  }

  /* ========================================================
     INITIAL SYNC
  ======================================================== */

  await warmupExtraBackgroundJobs();


  /* ========================================================
     BUY NOW LEARNING — 1 MIN
  ======================================================== */

  createSchedulerInterval(
    "buyNowLearning",

    runGRTBuyNowLearning,

    EXTRA_BACKGROUND_SCHEDULE
      .buyNowLearning
  );


  /* ========================================================
     DAILY 12AM MALAYSIA CHECK — 1 MIN

     Function akan check date.

     Ia TAK reset setiap minit.
     Reset hanya bila date Malaysia berubah.
  ======================================================== */

  createSchedulerInterval(
    "dailyRolloverCheck",

    runDailyWatchRollover,

    EXTRA_BACKGROUND_SCHEDULE
      .dailyRolloverCheck
  );


  /* ========================================================
     DAILY WATCH STATE SAVE
  ======================================================== */

  createSchedulerInterval(
    "dailyWatchSave",

    runDailyWatchSave,

    EXTRA_BACKGROUND_SCHEDULE
      .dailyWatchSave
  );


  /* ========================================================
     BUY NOW LEARNING HISTORY SAVE
  ======================================================== */

  createSchedulerInterval(
    "learningSave",

    runGRTLearningSave,

    EXTRA_BACKGROUND_SCHEDULE
      .learningSave
  );


  EXTRA_BACKGROUND_RUNTIME
    .registered =
    true;

  EXTRA_BACKGROUND_RUNTIME
    .registeredAt =
    Date.now();

  console.log(
    "✅ Extra background jobs registered."
  );

  return {
    registered:
      true,

    registeredAt:
      EXTRA_BACKGROUND_RUNTIME
        .registeredAt,
  };
}


/* ============================================================
   EXTRA BACKGROUND STATUS
============================================================ */

function getExtraBackgroundStatus() {
  return {
    registered:
      EXTRA_BACKGROUND_RUNTIME
        .registered,

    registeredAt:
      EXTRA_BACKGROUND_RUNTIME
        .registeredAt,

    schedule: {
      buyNowLearningMs:
        EXTRA_BACKGROUND_SCHEDULE
          .buyNowLearning,

      dailyRolloverCheckMs:
        EXTRA_BACKGROUND_SCHEDULE
          .dailyRolloverCheck,

      dailyWatchSaveMs:
        EXTRA_BACKGROUND_SCHEDULE
          .dailyWatchSave,

      learningSaveMs:
        EXTRA_BACKGROUND_SCHEDULE
          .learningSave,
    },

    learning:
      getBackgroundStateStatus(),

    daily:
      getDailyRolloverStatus(),
  };
}
/* ============================================================
   PART 7H — FINAL BACKGROUND STARTUP + CLEANUP

   PURPOSE:

   1. Load stored state
   2. Prime market data
   3. Start CENTRAL scheduler
   4. Register extra background jobs
   5. Prevent duplicate startup

   IMPORTANT:

   Do NOT create old individual
   setInterval() blocks after this.
============================================================ */


/* ============================================================
   BACKGROUND STARTUP RUNTIME
============================================================ */

const BACKGROUND_STARTUP_RUNTIME = {
  started:
    false,

  starting:
    false,

  startedAt:
    null,

  errors:
    0,
};


/* ============================================================
   LOAD STORED BOT STATE

   Reuse existing functions.
============================================================ */

function loadStoredBotState() {
  try {
    loadDailyWatchSnapshot();

    loadGRTBuyNowHistory();

    loadGRTTuning();

    loadGRT24hSnapshot();

    ensureDailyWatchState();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.log(
      "Stored bot state load error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   PRIME MARKET DATA

   Existing base functions are reused.

   Backfill gives executed-trade history
   immediately after Render restart.

   Price memory is sampled twice so
   early calculations have more than
   one point.
============================================================ */

async function primeMarketDataOnStartup() {
  try {
    await backfillTradeHistory();

    await collectTradeHistory();

    await updateMemory();

    /*
      Add second price-memory point.
    */

    await sleep(
      3000
    );

    await updateMemory();

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.log(
      "Startup market prime error:",
      error.message
    );

    return {
      success:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   START ALL BACKGROUND SERVICES

   ONE startup function.

   Calling twice is protected.
============================================================ */

async function startAllBackgroundServices() {
  if (
    BACKGROUND_STARTUP_RUNTIME
      .started
  ) {
    return {
      started:
        false,

      reason:
        "ALREADY STARTED",
    };
  }

  if (
    BACKGROUND_STARTUP_RUNTIME
      .starting
  ) {
    return {
      started:
        false,

      reason:
        "STARTUP ALREADY IN PROGRESS",
    };
  }

  BACKGROUND_STARTUP_RUNTIME
    .starting =
    true;

  try {
    /* ======================================================
       LOAD SAVED STATE
    ====================================================== */

    const loadState =
      loadStoredBotState();

    /* ======================================================
       PRIME MARKET DATA
    ====================================================== */

    const prime =
      await primeMarketDataOnStartup();

    /* ======================================================
       START CORE CENTRAL SCHEDULER

       This handles:

       - executed trades
       - price memory
       - active trade monitor
       - master scanner
       - Price Alert
       - Market Structure
    ====================================================== */

    const central =
      await startCentralScheduler();

    /* ======================================================
       START EXTRA JOBS

       - BUY NOW learning
       - daily rollover
       - state save
       - learning save
    ====================================================== */

    const extra =
      await registerExtraBackgroundJobs();

    BACKGROUND_STARTUP_RUNTIME
      .started =
      true;

    BACKGROUND_STARTUP_RUNTIME
      .startedAt =
      Date.now();

    console.log(
      "✅ ALL BACKGROUND SERVICES ACTIVE"
    );

    return {
      started:
        true,

      loadState,

      prime,

      central,

      extra,

      startedAt:
        BACKGROUND_STARTUP_RUNTIME
          .startedAt,
    };
  } catch (
    error
  ) {
    BACKGROUND_STARTUP_RUNTIME
      .errors++;

    console.log(
      "Background startup error:",
      error.message
    );

    return {
      started:
        false,

      error:
        error.message,
    };
  } finally {
    BACKGROUND_STARTUP_RUNTIME
      .starting =
      false;
  }
}


/* ============================================================
   BACKGROUND SERVICES STATUS
============================================================ */

function getBackgroundServicesStatus() {
  return {
    startup: {
      started:
        BACKGROUND_STARTUP_RUNTIME
          .started,

      starting:
        BACKGROUND_STARTUP_RUNTIME
          .starting,

      startedAt:
        BACKGROUND_STARTUP_RUNTIME
          .startedAt,

      errors:
        BACKGROUND_STARTUP_RUNTIME
          .errors,
    },

    scheduler:
      getSchedulerStatus(),

    masterScanner:
      getMasterScannerStatus(),

    collectors:
      getCollectorStatus(),

    alerts:
      getAlertDeliveryStatus(),

    extraBackground:
      getExtraBackgroundStatus(),
  };
}
/* ============================================================
   PART 7I — FINAL BACKGROUND BOOTSTRAP

   PURPOSE:

   Actually start all background services.

   IMPORTANT:

   startAllBackgroundServices()
   already has duplicate-start protection.

   So this call is safe.
============================================================ */

async function bootstrapBackgroundServices() {
  try {
    const result =
      await startAllBackgroundServices();

    if (
      result?.started
    ) {
      console.log(
        "✅ BACKGROUND BOOTSTRAP COMPLETE"
      );
    } else {
      console.log(
        "Background bootstrap:",
        result?.reason ||
        "NOT STARTED"
      );
    }

    return result;
  } catch (
    error
  ) {
    console.log(
      "Background bootstrap fatal error:",
      error.message
    );

    return {
      started:
        false,

      error:
        error.message,
    };
  }
}/* ============================================================
   PART 8A — TELEGRAM INTERACTION LAYER

   PURPOSE:

   COMMANDS:
   /momentum
   /structure
   /flow
   /grt24
   /grthold
   /buytest
   /buylast
   /tuning
   /status

   CALLBACK FLOW:

   START ENTRY
      ↓
   TARGET NET PROFIT
      ↓
   FINAL ORDER PLAN
      ↓
   CONFIRM ORDER
      ↓
   MATCHED QUANTITY
      ↓
   ACTIVE TRADE

   SELL
      ↓
   MATCHED SELL PRICE
      ↓
   CLOSE TRADE
============================================================ */


/* ============================================================
   USER STATE HELPERS
============================================================ */

function getTelegramUserState(
  chatId
) {
  return USER_STATE[
    String(
      chatId
    )
  ] || null;
}


function setTelegramUserState(
  chatId,
  state
) {
  USER_STATE[
    String(
      chatId
    )
  ] =
    state;
}


function clearTelegramUserState(
  chatId
) {
  delete USER_STATE[
    String(
      chatId
    )
  ];
}


/* ============================================================
   ANSWER CALLBACK SAFELY
============================================================ */

async function answerCallback(
  callbackId,
  text =
    null
) {
  try {
    await bot.answerCallbackQuery(
      callbackId,
      text
        ? {
            text,
          }
        : {}
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


/* ============================================================
   /MOMENTUM
============================================================ */

bot.onText(
  /^\/momentum(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const cached =
        getLatestMasterGRTSnapshot(
          90 *
            1000
        );

      const grtSnapshot =
        cached ||
        await getGRTMomentumSnapshot();

      const grtAlert =
        await getGRTPriceAlertSnapshot(
          grtSnapshot
        );

      const btcAlert =
        await getBTCPriceAlertSnapshot();

      await replyTelegram(
        chatId,
        `⚡ MOMENTUM CHECK

${btcAlert.section}

${grtAlert.section}`
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,
        `⚠️ Momentum check error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   /STRUCTURE
============================================================ */

bot.onText(
  /^\/structure(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const grtData =
        await getFreshGRTSnapshotForAlert();

      const [
        btc,
        grt,
      ] =
        await Promise.all([
          analyzeMarketStructure(
            "BTC"
          ),

          analyzeMarketStructure(
            "GRT",
            {
              ticker:
                grtData
                  .snapshot
                  ?.ticker ||
                null,

              grtSnapshot:
                grtData
                  .snapshot,
            }
          ),
        ]);

      const sections =
        [];

      if (
        btc
      ) {
        sections.push(
          buildMarketStructureSection(
            btc
          )
        );
      }

      if (
        grt
      ) {
        sections.push(
          buildMarketStructureSection(
            grt
          )
        );
      }

      await replyTelegram(
        chatId,
        `📊 MARKET STRUCTURE

${sections.join(
  "\n━━━━━━━━━━━━━━━━━━\n"
)}`
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,
        `⚠️ Structure error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   /FLOW

   Existing 2H analysis helper.
============================================================ */

bot.onText(
  /^\/flow(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const [
        btc,
        grt,
      ] =
        await Promise.all([
          analyze2HMarketCondition(
            "BTC"
          ),

          analyze2HMarketCondition(
            "GRT"
          ),
        ]);

      await replyTelegram(
        chatId,
        `🌊 2H EXECUTED FLOW

₿ BTC
${btc
  ? JSON.stringify(
      btc,
      null,
      2
    )
  : "NO DATA"}

━━━━━━━━━━━━━━

🪙 GRT
${grt
  ? JSON.stringify(
      grt,
      null,
      2
    )
  : "NO DATA"}`
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,
        `⚠️ Flow error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   /STATUS
============================================================ */

bot.onText(
  /^\/status(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const status =
        getBackgroundServicesStatus();

      const master =
        status
          .masterScanner;

      const collector =
        status
          .collectors;

      const scheduler =
        status
          .scheduler;

      await replyTelegram(
        chatId,
        `🤖 BOT SYSTEM STATUS

🧠 Master Scanner:
${master.running
  ? "RUNNING"
  : "IDLE"}

Runs:
${master.totalRuns}

Skipped:
${master.skippedRuns}

Errors:
${master.errors}

🪙 GRT:
${master.grtStatus ||
  "N/A"}

Direction:
${master.grtDirection ||
  "N/A"}

Price:
${
  master.grtPrice
    ? `RM${formatPrice(
        "GRT",
        master.grtPrice
      )}`
    : "N/A"
}

━━━━━━━━━━━━━━

📡 Scheduler:
${scheduler.started
  ? "ACTIVE"
  : "OFF"}

Active Jobs:
${scheduler.activeIntervals.length}

📦 Trade Collector:
${collector
  .executedTrades
  .running
  ? "RUNNING"
  : "READY"}

💾 Price Memory:
${collector
  .priceMemory
  .running
  ? "RUNNING"
  : "READY"}

📈 Active Trades:
${Object.keys(
  ACTIVE_TRADES
).length}

⏳ Pending Entries:
${Object.keys(
  PENDING_ENTRIES
).length}`
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,
        `⚠️ Status error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   COMMAND WRAPPERS FOR EXISTING MODULES

   These functions are expected from
   the learning / daily modules.

   If unavailable, reply gracefully
   instead of crashing Telegram.
============================================================ */

/* ============================================================
   INTERACTIVE GRT HOLD — COMMAND

   Flow:
   /grthold
      ↓
   Ask ENTRY PRICE
      ↓
   WAIT_GRT_HOLD_ENTRY
============================================================ */

bot.onText(
  /^\/grthold(?:@\w+)?$/i,
  async (msg) => {
    const chatId = msg.chat.id;

    clearTelegramUserState(chatId);

    setTelegramUserState(chatId, {
      step: "WAIT_GRT_HOLD_ENTRY",
    });

    await replyTelegram(
      chatId,
      `📡 GRT HOLD ANALYSIS

Masukkan ENTRY PRICE GRT anda.

Contoh:
0.0709`
    );
  }
);


/* ============================================================
   BUY NOW TEST STATISTICS
============================================================ */

bot.onText(
  /^\/buytest(?:@\w+)?$/i,
  async (msg) => {
    const chatId = msg.chat.id;

    try {
      if (
        typeof getGRTBuyNowStatistics !==
        "function"
      ) {
        await replyTelegram(
          chatId,
          `🧪 BUY NOW LEARNING

Records:
${GRT_BUY_NOW_HISTORY.length}

Detailed statistics module belum ready.`
        );

        return;
      }

      const stats =
        getGRTBuyNowStatistics();

      await replyTelegram(
        chatId,
        `🧪 BUY NOW LEARNING

${JSON.stringify(
  stats,
  null,
  2
)}`
      );
    } catch (error) {
      await replyTelegram(
        chatId,
        `⚠️ BUY test error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   LAST BUY NOW RECORD
============================================================ */

bot.onText(
  /^\/buylast(?:@\w+)?$/i,
  async (msg) => {
    const chatId = msg.chat.id;

    const latest =
      GRT_BUY_NOW_HISTORY[
        GRT_BUY_NOW_HISTORY.length - 1
      ];

    if (!latest) {
      await replyTelegram(
        chatId,
        "🧪 Belum ada rekod BUY NOW."
      );

      return;
    }

    await replyTelegram(
      chatId,
      `🧪 LAST BUY NOW RECORD

${JSON.stringify(
  latest,
  null,
  2
)}`
    );
  }
);


/* ============================================================
   GRT TUNING STATUS
============================================================ */

bot.onText(
  /^\/tuning(?:@\w+)?$/i,
  async (msg) => {
    const chatId = msg.chat.id;

    await replyTelegram(
      chatId,
      `🧠 GRT TUNING STATUS

Dynamic BUY Volume Min:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(1)}%

Learning Records:
${GRT_BUY_NOW_HISTORY.length}

Minimum Completed Signals:
${GRT_TUNING_MIN_COMPLETED_SIGNALS}`
    );
  }
);

/* ============================================================
   CALLBACK QUERY HANDLER
============================================================ */

bot.on(
  "callback_query",
  async (
    query
  ) => {
    const data =
      query.data ||
      "";

    const chatId =
      query.message
        ?.chat
        ?.id;

    if (
      !chatId
    ) {
      return;
    }

    await answerCallback(
      query.id
    );

    /* ======================================================
       START ENTRY
    ====================================================== */

    if (
      data.startsWith(
        "START_"
      )
    ) {
      const coin =
        data.replace(
          "START_",
          ""
        );

      const entry =
        PENDING_ENTRIES[
          coin
        ];

      if (
        !entry
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Entry signal dah expired / tak jumpa."
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          step:
            "WAIT_TARGET_PROFIT",

          coin,
        }
      );

      await replyTelegram(
        chatId,
        `🎯 ${coin} TARGET NET PROFIT

Masukkan target keuntungan bersih dalam RM.

Contoh:
20

TP tidak akan dipaksa berubah.
Bot hanya kira quantity yang diperlukan.`
      );

      return;
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
        data.replace(
          "IGNORE_",
          ""
        );

      delete PENDING_ENTRIES[
        coin
      ];

      clearTelegramUserState(
        chatId
      );

      await replyTelegram(
        chatId,
        `❌ ${coin} entry ignored.`
      );

      return;
    }


    /* ======================================================
       CONFIRM FINAL LIMIT ORDER
    ====================================================== */

    if (
      data.startsWith(
        "CONFIRM_ORDER_"
      )
    ) {
      const coin =
        data.replace(
          "CONFIRM_ORDER_",
          ""
        );

      const state =
        getTelegramUserState(
          chatId
        );

      if (
        !state ||
        state.coin !==
          coin ||
        state.step !==
          "WAIT_ORDER_CONFIRMATION"
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Order state dah expired."
        );

        return;
      }

      state.step =
        "WAIT_MATCHED_QUANTITY";

      setTelegramUserState(
        chatId,
        state
      );

      await replyTelegram(
        chatId,
        `✅ LIMIT ORDER CONFIRMED

🪙 ${coin}

📐 Buy Price:
RM${formatPrice(
          coin,
          state.entryPrice
        )}

📦 Suggested Quantity:
${state.quantity.toLocaleString(
          "en-MY"
        )}

Sekarang masukkan ACTUAL MATCHED QUANTITY selepas order matched.`
      );

      return;
    }


    /* ======================================================
       CANCEL ORDER
    ====================================================== */

    if (
      data.startsWith(
        "CANCEL_ORDER_"
      )
    ) {
      const coin =
        data.replace(
          "CANCEL_ORDER_",
          ""
        );

      delete PENDING_ENTRIES[
        coin
      ];

      clearTelegramUserState(
        chatId
      );

      await replyTelegram(
        chatId,
        `❌ ${coin} order cancelled.`
      );

      return;
    }


    /* ======================================================
       SELL ACTIVE TRADE
    ====================================================== */

    if (
      data.startsWith(
        "SELL_"
      )
    ) {
      const coin =
        data.replace(
          "SELL_",
          ""
        );

      const trade =
        ACTIVE_TRADES[
          coin
        ];

      if (
        !trade
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Active trade tak dijumpai."
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          step:
            "WAIT_SELL_PRICE",

          coin,
        }
      );

      await replyTelegram(
        chatId,
        `💰 ${coin} SELL

Masukkan ACTUAL MATCHED SELL PRICE.

Contoh:
${formatPrice(
          coin,
          trade.tp ||
            trade.buyPrice
        )}`
      );

      return;
    }


    /* ======================================================
       HOLD ACTIVE TRADE
    ====================================================== */

    if (
      data.startsWith(
        "HOLD_"
      )
    ) {
      const coin =
        data.replace(
          "HOLD_",
          ""
        );

      const trade =
        ACTIVE_TRADES[
          coin
        ];

      if (
        !trade
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Active trade tak dijumpai."
        );

        return;
      }

      const ticker =
        await getTicker(
          coin
        );

      if (
        coin ===
          "GRT" &&
        ticker
      ) {
        const hold =
          await analyzeActiveGRTHoldStatus(
            trade,
            ticker
          );

        await replyTelegram(
          chatId,
          `📡 GRT HOLD

Status:
${hold?.status ||
  "HOLD"}

💵 Current:
RM${formatPrice(
            coin,
            ticker.currentPrice
          )}

📊 Price vs Entry:
${formatPercent(
            hold
              ?.moveFromEntryPct ||
              0
          )}

🧠 Reason:
${hold?.reason ||
  "Monitoring continues."}`
        );

        return;
      }

      await replyTelegram(
        chatId,
        `📡 ${coin} HOLD

Trade masih aktif.
Bot terus monitor TP / SL.`
      );

      return;
    }
  }
);


/* ============================================================
   USER TEXT STATE MACHINE

   IMPORTANT:

   Ignore slash commands.

   This handler only processes
   interactive numeric input.
============================================================ */

bot.on(
  "message",
  async (
    msg
  ) => {
    const chatId =
      msg.chat
        ?.id;

    const text =
      String(
        msg.text ||
        ""
      ).trim();

    if (
      !chatId ||
      !text ||
      text.startsWith(
        "/"
      )
    ) {
      return;
    }

    const state =
      getTelegramUserState(
        chatId
      );

    if (
      !state
    ) {
      return;
    }

    /* ======================================================
       MANUAL GRT HOLD CHECK — USER INPUT FLOW

       PURPOSE:
       Check any manually purchased GRT position.

       Independent from:
       - Scalping Entry
       - PENDING_ENTRIES
       - ACTIVE_TRADES

       FLOW:

       /grthold
          ↓
       ENTRY PRICE
          ↓
       QUANTITY
          ↓
       CURRENT NET P/L
          ↓
       BREAK EVEN
          ↓
       DISTANCE TO BREAK EVEN
          ↓
       HOLD / CAUTION / EXIT EARLY
          ↓
       PROJECTED TP1 / TP2
          ↓
       DISTANCE + NET PROFIT
    ====================================================== */


    /* ======================================================
       STEP 1 — RECEIVE ENTRY PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_GRT_HOLD_ENTRY"
    ) {
      const entryPrice =
        Number(
          text.replace(
            ",",
            "."
          )
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
          `⚠️ Entry price tak sah.

Masukkan contoh:
0.0709`
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          step:
            "WAIT_GRT_HOLD_QUANTITY",

          entryPrice,
        }
      );

      await replyTelegram(
        chatId,
        `📦 GRT HOLD CHECK

💵 Entry Price:
RM${formatPrice(
          "GRT",
          entryPrice
        )}

Sekarang masukkan QUANTITY GRT yang dibeli.

Contoh:
10000`
      );

      return;
    }


    /* ======================================================
       STEP 2 — RECEIVE QUANTITY + RUN ANALYSIS
    ====================================================== */

    if (
      state.step ===
      "WAIT_GRT_HOLD_QUANTITY"
    ) {
      const quantity =
        Number(
          text.replace(
            /,/g,
            ""
          )
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
          `⚠️ Quantity tak sah.

Masukkan contoh:
10000`
        );

        return;
      }

      const entryPrice =
        safeNumber(
          state.entryPrice,
          0
        );

      if (
        entryPrice <=
        0
      ) {
        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          `⚠️ Entry price hilang.

Taip /grthold semula.`
        );

        return;
      }

      try {
        /* ================================================
           CURRENT MARKET
        ================================================ */

        const ticker =
          await getTicker(
            "GRT"
          );

        if (
          !ticker
        ) {
          await replyTelegram(
            chatId,
            "⚠️ GRT ticker unavailable."
          );

          return;
        }

        const currentPrice =
          ticker.currentPrice;


        /* ================================================
           CURRENT MOMENTUM + PROJECTED REACH
        ================================================ */

        const momentum =
          await getGRTMomentumDecision(
            ticker
          );

        const projection =
          await calculateGRTProjectedReach({
            currentPrice,
            momentum,
          });


        /* ================================================
           MANUAL HOLD STATUS

           NOT registered as active scalping trade.
        ================================================ */

        const holdAnalysis =
          await analyzeActiveGRTHoldStatus(
            {
              coin:
                "GRT",

              buyPrice:
                entryPrice,
            },
            ticker
          );


        /* ================================================
           CURRENT NET P/L

           Reuse existing Luno fee calculation.
        ================================================ */

        const currentFees =
          calculateTradeAfterFees({
            quantity,
            entryPrice,
            sellPrice:
              currentPrice,
          });

        const tp1Fees =
          projection?.tp1
            ? calculateTradeAfterFees({
                quantity,
                entryPrice,
                sellPrice:
                  projection.tp1,
              })
            : null;

        const tp2Fees =
          projection?.tp2
            ? calculateTradeAfterFees({
                quantity,
                entryPrice,
                sellPrice:
                  projection.tp2,
              })
            : null;


        /* ================================================
           CAPITAL
        ================================================ */

        const totalBuyCost =
          quantity *
          entryPrice;


        /* ================================================
           BREAK EVEN

           Existing fee model:
           BUY 0.5%
           SELL 0.5%
        ================================================ */

        const netUnitAfterBuy =
          quantity *
          (
            1 -
            BUY_FEE
          );

        const sellableUnitAfterFee =
          netUnitAfterBuy *
          (
            1 -
            SELL_FEE
          );

        const breakEvenPrice =
          sellableUnitAfterFee >
            0
            ? totalBuyCost /
              sellableUnitAfterFee
            : null;


        /* ================================================
           CURRENT POSITION
        ================================================ */

        const moveFromEntryPct =
          percentChange(
            entryPrice,
            currentPrice
          );


        /* ================================================
           DISTANCE TO BREAK EVEN
        ================================================ */

        const distanceToBreakEven =
          breakEvenPrice
            ? breakEvenPrice -
              currentPrice
            : null;

        const distanceToBreakEvenPct =
          breakEvenPrice &&
          currentPrice >
            0
            ? percentChange(
                currentPrice,
                breakEvenPrice
              )
            : null;

        const breakEvenReached =
          Boolean(
            breakEvenPrice &&
            currentPrice >=
              breakEvenPrice
          );


        /* ================================================
           DISTANCE TO TP1
        ================================================ */

        const distanceToTP1 =
          projection?.tp1
            ? projection.tp1 -
              currentPrice
            : null;

        const distanceToTP1Pct =
          projection?.tp1 &&
          currentPrice >
            0
            ? percentChange(
                currentPrice,
                projection.tp1
              )
            : null;

        const tp1Reached =
          Boolean(
            projection?.tp1 &&
            currentPrice >=
              projection.tp1
          );


        /* ================================================
           DISTANCE TO TP2
        ================================================ */

        const distanceToTP2 =
          projection?.tp2
            ? projection.tp2 -
              currentPrice
            : null;

        const distanceToTP2Pct =
          projection?.tp2 &&
          currentPrice >
            0
            ? percentChange(
                currentPrice,
                projection.tp2
              )
            : null;

        const tp2Reached =
          Boolean(
            projection?.tp2 &&
            currentPrice >=
              projection.tp2
          );


        /* ================================================
           DISPLAY STATUS
        ================================================ */

        const pnlEmoji =
          currentFees &&
          currentFees.netProfit >=
            0
            ? "🟢"
            : "🔴";

        const holdStatus =
          holdAnalysis?.status ||
          "HOLD";

        let holdEmoji =
          "🟢";

        if (
          holdStatus ===
          "CAUTION"
        ) {
          holdEmoji =
            "🟡";
        }

        if (
          holdStatus ===
          "EXIT_EARLY"
        ) {
          holdEmoji =
            "🔴";
        }


        /* ================================================
           BREAK EVEN DISTANCE TEXT
        ================================================ */

        const breakEvenDistanceText =
          !breakEvenPrice
            ? "N/A"
            : breakEvenReached
              ? "✅ DAH LEPAS BREAK EVEN"
              : `RM${formatPrice(
                  "GRT",
                  distanceToBreakEven
                )} lagi (${formatPercent(
                  distanceToBreakEvenPct
                )})`;


        /* ================================================
           TP1 DISTANCE TEXT
        ================================================ */

        const tp1DistanceText =
          !projection?.tp1
            ? "N/A"
            : tp1Reached
              ? "✅ TP1 DAH DICAPAI"
              : `RM${formatPrice(
                  "GRT",
                  distanceToTP1
                )} lagi (${formatPercent(
                  distanceToTP1Pct
                )})`;


        /* ================================================
           TP2 DISTANCE TEXT
        ================================================ */

        const tp2DistanceText =
          !projection?.tp2
            ? "N/A"
            : tp2Reached
              ? "✅ TP2 DAH DICAPAI"
              : `RM${formatPrice(
                  "GRT",
                  distanceToTP2
                )} lagi (${formatPercent(
                  distanceToTP2Pct
                )})`;


        /* ================================================
           FINAL TELEGRAM REPORT
        ================================================ */

        await replyTelegram(
          chatId,
          `📡 MANUAL GRT HOLD CHECK

━━━━━━━━━━━━━━

📌 POSITION

💵 Entry Price:
RM${formatPrice(
            "GRT",
            entryPrice
          )}

📦 Quantity:
${quantity.toLocaleString(
            "en-MY"
          )} GRT

💳 Modal:
RM${totalBuyCost.toFixed(
            2
          )}

━━━━━━━━━━━━━━

📊 CURRENT POSITION

💵 Current Price:
RM${formatPrice(
            "GRT",
            currentPrice
          )}

📈 Price vs Entry:
${formatPercent(
            moveFromEntryPct
          )}

${pnlEmoji} Current NET P/L:
${
  currentFees
    ? `RM${currentFees.netProfit.toFixed(
        2
      )} (${formatPercent(
        currentFees.netProfitPct
      )})`
    : "N/A"
}

━━━━━━━━━━━━━━

⚖️ BREAK EVEN

💵 Break Even Price:
${
  breakEvenPrice
    ? `RM${formatPrice(
        "GRT",
        breakEvenPrice
      )}`
    : "N/A"
}

📏 Lagi nak Break Even:
${breakEvenDistanceText}

━━━━━━━━━━━━━━

${holdEmoji} HOLD STATUS:
${holdStatus}

🧠 Reason:
${holdAnalysis?.reason ||
  "Monitoring current GRT structure."}

━━━━━━━━━━━━━━

⚡ MOMENTUM

${momentum.text ||
  momentum.status}

${momentum.directionText ||
  ""}

━━━━━━━━━━━━━━

🎯 PROJECTED TP1

💵 Price:
${
  projection?.tp1
    ? `RM${formatPrice(
        "GRT",
        projection.tp1
      )}`
    : "N/A"
}

📏 Lagi nak TP1:
${tp1DistanceText}

💰 NET Profit @ TP1:
${
  tp1Fees
    ? `RM${tp1Fees.netProfit.toFixed(
        2
      )}`
    : "N/A"
}

━━━━━━━━━━━━━━

🚀 PROJECTED TP2

💵 Price:
${
  projection?.tp2
    ? `RM${formatPrice(
        "GRT",
        projection.tp2
      )}`
    : "N/A"
}

📏 Lagi nak TP2:
${tp2DistanceText}

💰 NET Profit @ TP2:
${
  tp2Fees
    ? `RM${tp2Fees.netProfit.toFixed(
        2
      )}`
    : "N/A"
}

━━━━━━━━━━━━━━

📌 Projection:
${projection?.reason ||
  "N/A"}`
        );


        /* ================================================
           FINISH MANUAL HOLD FLOW
        ================================================ */

        clearTelegramUserState(
          chatId
        );

        return;
      } catch (
        error
      ) {
        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          `⚠️ GRT HOLD error:
${error.message}`
        );

        return;
      }
    }


    /* ======================================================
       TARGET NET PROFIT
    ====================================================== */


    if (
      state.step ===
      "WAIT_TARGET_PROFIT"
    ) {
      const targetProfit =
        Number(
          text.replace(
            ",",
            "."
          )
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
          "⚠️ Masukkan target RM yang sah. Contoh: 20"
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
        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          "⚠️ Pending entry dah tiada."
        );

        return;
      }

      const orderPlan =
        await resolveFinalOrderPlan(
          entry,
          targetProfit
        );

      if (
        !orderPlan.allowed
      ) {
        delete PENDING_ENTRIES[
          state.coin
        ];

        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          `❌ ENTRY CANCELLED

Reason:
${orderPlan.reason}`
        );

        return;
      }

      const risk =
        orderPlan.risk;

      const newState = {
        step:
          "WAIT_ORDER_CONFIRMATION",

        coin:
          state.coin,

        targetProfit,

        entryPrice:
          orderPlan.entryPrice,

        quantity:
          orderPlan.quantity,

        tp:
          risk.tp,

        tp2:
          risk.tp2 ||
          null,

        sl:
          risk.sl,

        tpLogic:
          orderPlan.room
            ?.reason ||
          null,

        grossRoomPct:
          orderPlan.grossRoomPct,

        momentumSnapshot:
          entry.momentumSnapshot ||
          null,

        tp2Confidence:
          orderPlan.room
            ?.projection
            ?.tp2Confidence ||
          null,

        tp2Requirement:
          orderPlan.room
            ?.projection
            ?.tp2Requirement ||
          null,
      };

      setTelegramUserState(
        chatId,
        newState
      );

      await replyTelegram(
        chatId,
        `📐 FINAL LIMIT ORDER

🪙 ${state.coin}

💵 Entry:
RM${formatPrice(
          state.coin,
          orderPlan.entryPrice
        )}

📦 Quantity:
${orderPlan.quantity.toLocaleString(
          "en-MY"
        )}

💳 Estimated Capital:
RM${orderPlan
  .feeEstimate
  .totalBuyCost
  .toFixed(
    2
  )}

🎯 TP1:
RM${formatPrice(
          state.coin,
          risk.tp
        )}

${
  risk.tp2
    ? `🚀 TP2:
RM${formatPrice(
        state.coin,
        risk.tp2
      )}

`
    : ""
}🛑 SL:
RM${formatPrice(
          state.coin,
          risk.sl
        )}

💰 Target Net Profit:
RM${targetProfit.toFixed(
          2
        )}

📈 Estimated Net Profit:
RM${orderPlan
  .estimatedNetProfit
  .toFixed(
    2
  )}

📊 Gross Room:
${formatPercent(
          orderPlan.grossRoomPct
        )}

Confirm order?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "✅ YES",

                  callback_data:
                    `CONFIRM_ORDER_${state.coin}`,
                },

                {
                  text:
                    "❌ NO",

                  callback_data:
                    `CANCEL_ORDER_${state.coin}`,
                },
              ],
            ],
          },
        }
      );

      return;
    }


    /* ======================================================
       ACTUAL MATCHED QUANTITY
    ====================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_QUANTITY"
    ) {
      const matchedQuantity =
        Number(
          text
            .replace(
              /,/g,
              ""
            )
        );

      if (
        !Number.isFinite(
          matchedQuantity
        ) ||
        matchedQuantity <=
          0
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Masukkan actual matched quantity yang sah."
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
        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          "⚠️ Pending entry dah expired."
        );

        return;
      }

      const created =
        createActiveTradeFromMatchedOrder({
          state,

          entry,

          matchedQuantity,
        });

      if (
        !created.created
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Trade creation failed:
${created.reason}`
        );

        return;
      }

      delete PENDING_ENTRIES[
        state.coin
      ];

      clearTelegramUserState(
        chatId
      );

      const trade =
        created.trade;

      await replyTelegram(
        chatId,
        `✅ ACTIVE TRADE CREATED

🪙 ${trade.coin}

📌 Buy Price:
RM${formatPrice(
          trade.coin,
          trade.buyPrice
        )}

📦 Matched Quantity:
${trade.matchedQuantity.toLocaleString(
          "en-MY"
        )}

💳 Buy Cost:
RM${trade.totalBuyCost.toFixed(
          2
        )}

🎯 TP1:
RM${formatPrice(
          trade.coin,
          trade.tp
        )}

${
  trade.tp2
    ? `🚀 TP2:
RM${formatPrice(
        trade.coin,
        trade.tp2
      )}

`
    : ""
}🛑 SL:
RM${formatPrice(
          trade.coin,
          trade.sl
        )}

💰 Estimated Net Profit @ TP1:
RM${created
  .feeResult
  .netProfit
  .toFixed(
    2
  )}

🎯 Target Achievement:
${created
  .targetAchievement
  .toFixed(
    1
  )}%`
      );

      return;
    }


    /* ======================================================
       ACTUAL MATCHED SELL PRICE
    ====================================================== */

    if (
      state.step ===
      "WAIT_SELL_PRICE"
    ) {
      const matchedPrice =
        Number(
          text.replace(
            ",",
            "."
          )
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
          "⚠️ Masukkan actual matched sell price yang sah."
        );

        return;
      }

      const result =
        await confirmMatchedSell({
          coin:
            state.coin,

          matchedPrice,
        });

      if (
        !result.confirmed
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Sell confirmation failed:
${result.reason}`
        );

        return;
      }

      clearTelegramUserState(
        chatId
      );

      const profitEmoji =
        result.pnl >=
          0
          ? "✅"
          : "🔴";

      await replyTelegram(
        chatId,
        `${profitEmoji} TRADE CLOSED

🪙 ${state.coin}

📌 Buy:
RM${formatPrice(
          state.coin,
          result.trade.buyPrice
        )}

💰 Sell:
RM${formatPrice(
          state.coin,
          matchedPrice
        )}

📦 Quantity:
${result.trade.matchedQuantity.toLocaleString(
          "en-MY"
        )}

━━━━━━━━━━━━━━

NET P/L:
RM${result.pnl.toFixed(
          2
        )}

P/L:
${formatPercent(
          result.pnlPct
        )}`
      );

      return;
    }
  }
);

/* ============================================================
   PART 8B — API ENDPOINTS + DIAGNOSTICS

   PURPOSE:

   GET /
   → health

   GET /status
   → full bot status

   GET /price/:coin
   → current Luno ticker

   GET /momentum/grt
   → latest GRT master momentum

   GET /structure/:coin
   → BTC / GRT structure

   GET /flow/:coin
   → executed flow summary

   GET /trade/:coin
   → active / pending trade status

   GET /learning
   → BUY NOW learning status

   IMPORTANT:

   Diagnostic endpoints DO NOT create
   new repeating scanners.

   They either:
   - read cached state
   - or perform one manual request
============================================================ */


/* ============================================================
   API COIN VALIDATION
============================================================ */

function normalizeApiCoin(
  value
) {
  const coin =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !SCAN_COINS.includes(
      coin
    )
  ) {
    return null;
  }

  return coin;
}


/* ============================================================
   ROOT / HEALTH
============================================================ */

app.get(
  "/",
  (
    req,
    res
  ) => {
    const master =
      getMasterScannerStatus();

    res.json({
      ok:
        true,

      service:
        "ONE AI COIN ALERT",

      serviceCode:
        SERVICE_CODE,

      uptimeSec:
        Math.floor(
          (
            Date.now() -
            BOT_STARTED_AT
          ) /
            1000
        ),

      scheduler:
        SCHEDULER_RUNTIME
          ?.started ||
        false,

      masterScanner: {
        running:
          master.running,

        grtStatus:
          master.grtStatus,

        grtDirection:
          master.grtDirection,

        grtPrice:
          master.grtPrice,
      },

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   FULL SYSTEM STATUS
============================================================ */

app.get(
  "/status",
  (
    req,
    res
  ) => {
    try {
      res.json({
        ok:
          true,

        serviceCode:
          SERVICE_CODE,

        botStartedAt:
          BOT_STARTED_AT,

        uptimeMs:
          Date.now() -
          BOT_STARTED_AT,

        background:
          getBackgroundServicesStatus(),

        activeTrades:
          Object.keys(
            ACTIVE_TRADES
          ),

        pendingEntries:
          Object.keys(
            PENDING_ENTRIES
          ),

        timestamp:
          Date.now(),
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   CURRENT PRICE

   Example:

   /price/GRT
   /price/BTC
============================================================ */

app.get(
  "/price/:coin",
  async (
    req,
    res
  ) => {
    const coin =
      normalizeApiCoin(
        req.params.coin
      );

    if (
      !coin
    ) {
      res
        .status(
          400
        )
        .json({
          ok:
            false,

          error:
            "INVALID COIN",
        });

      return;
    }

    try {
      const ticker =
        await getTicker(
          coin
        );

      if (
        !ticker
      ) {
        res
          .status(
            503
          )
          .json({
            ok:
              false,

            error:
              "TICKER UNAVAILABLE",
          });

        return;
      }

      res.json({
        ok:
          true,

        coin,

        pair:
          ticker.pair,

        price:
          ticker.currentPrice,

        bid:
          ticker.bid,

        ask:
          ticker.ask,

        timestamp:
          ticker.timestamp,
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   GRT MOMENTUM

   Prefer MASTER CACHE.

   Fresh fallback only if cache
   is unavailable.
============================================================ */

app.get(
  "/momentum/grt",
  async (
    req,
    res
  ) => {
    try {
      const cached =
        getLatestMasterGRTSnapshot(
          90 *
            1000
        );

      const snapshot =
        cached ||
        await getGRTMomentumSnapshot();

      if (
        !snapshot
      ) {
        res
          .status(
            503
          )
          .json({
            ok:
              false,

            error:
              "GRT MOMENTUM UNAVAILABLE",
          });

        return;
      }

      res.json({
        ok:
          true,

        source:
          cached
            ? "MASTER CACHE"
            : "FRESH FALLBACK",

        price:
          snapshot.ticker
            ?.currentPrice ||
          null,

        decision:
          snapshot.decision ||
          null,

        normalized:
          snapshot.normalized ||
          (
            snapshot.decision
              ? normalizeGRTDecision(
                  snapshot.decision
                )
              : null
          ),

        scanner:
          getMasterScannerStatus(),

        timestamp:
          Date.now(),
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   MARKET STRUCTURE

   Example:

   /structure/GRT
   /structure/BTC
============================================================ */

app.get(
  "/structure/:coin",
  async (
    req,
    res
  ) => {
    const coin =
      normalizeApiCoin(
        req.params.coin
      );

    if (
      !coin
    ) {
      res
        .status(
          400
        )
        .json({
          ok:
            false,

          error:
            "INVALID COIN",
        });

      return;
    }

    try {
      let result;

      if (
        coin ===
        "GRT"
      ) {
        const grtData =
          await getFreshGRTSnapshotForAlert();

        result =
          await analyzeMarketStructure(
            "GRT",
            {
              ticker:
                grtData
                  .snapshot
                  ?.ticker ||
                null,

              grtSnapshot:
                grtData
                  .snapshot,
            }
          );
      } else {
        result =
          await analyzeMarketStructure(
            coin
          );
      }

      if (
        !result
      ) {
        res
          .status(
            503
          )
          .json({
            ok:
              false,

            error:
              "STRUCTURE UNAVAILABLE",
          });

        return;
      }

      res.json({
        ok:
          true,

        coin,

        currentPrice:
          result.currentPrice,

        market:
          result.marketText,

        pressure:
          result.pressure,

        support:
          result.support,

        resistance:
          result.resistance,

        criteria:
          result.criteria,

        change5m:
          result.change5m,

        change15m:
          result.change15m,

        fakeBreakout:
          result.fakeBreakout,

        confirmedBreakout:
          result.confirmedBreakout,

        timestamp:
          Date.now(),
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   EXECUTED FLOW

   Optional query:

   /flow/GRT
   /flow/GRT?minutes=15

   Range:
   1 - 120 minutes
============================================================ */

app.get(
  "/flow/:coin",
  (
    req,
    res
  ) => {
    const coin =
      normalizeApiCoin(
        req.params.coin
      );

    if (
      !coin
    ) {
      res
        .status(
          400
        )
        .json({
          ok:
            false,

          error:
            "INVALID COIN",
        });

      return;
    }

    let minutes =
      safeNumber(
        req.query.minutes,
        5
      );

    minutes =
      clamp(
        minutes,
        1,
        120
      );

    const windowMs =
      minutes *
      60 *
      1000;

    try {
      const flow =
        getExecutedFlowSummary(
          coin,
          windowMs
        );

      const priceResponse =
        getExecutedPriceResponse(
          coin,
          windowMs
        );

      res.json({
        ok:
          true,

        coin,

        minutes,

        flow,

        priceResponse,

        timestamp:
          Date.now(),
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   ACTIVE / PENDING TRADE

   Example:

   /trade/GRT
============================================================ */

app.get(
  "/trade/:coin",
  (
    req,
    res
  ) => {
    const coin =
      normalizeApiCoin(
        req.params.coin
      );

    if (
      !coin
    ) {
      res
        .status(
          400
        )
        .json({
          ok:
            false,

          error:
            "INVALID COIN",
        });

      return;
    }

    const active =
      ACTIVE_TRADES[
        coin
      ] ||
      null;

    const pending =
      PENDING_ENTRIES[
        coin
      ] ||
      null;

    res.json({
      ok:
        true,

      coin,

      active:
        Boolean(
          active
        ),

      pending:
        Boolean(
          pending
        ),

      activeTrade:
        active,

      pendingEntry:
        pending,

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   LEARNING STATUS

   Safe even before complete
   performance-learning module exists.
============================================================ */

app.get(
  "/learning",
  (
    req,
    res
  ) => {
    try {
      let statistics =
        null;

      if (
        typeof getGRTBuyNowStatistics ===
        "function"
      ) {
        statistics =
          getGRTBuyNowStatistics();
      }

      const latest =
        Array.isArray(
          GRT_BUY_NOW_HISTORY
        ) &&
        GRT_BUY_NOW_HISTORY
          .length
          ? GRT_BUY_NOW_HISTORY[
              GRT_BUY_NOW_HISTORY.length -
                1
            ]
          : null;

      res.json({
        ok:
          true,

        records:
          Array.isArray(
            GRT_BUY_NOW_HISTORY
          )
            ? GRT_BUY_NOW_HISTORY
                .length
            : 0,

        dynamicBuyVolumeMinPct:
          GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

        minimumCompletedSignals:
          GRT_TUNING_MIN_COMPLETED_SIGNALS,

        latest,

        statistics,

        runtime:
          getBackgroundStateStatus(),

        timestamp:
          Date.now(),
      });
    } catch (
      error
    ) {
      res
        .status(
          500
        )
        .json({
          ok:
            false,

          error:
            error.message,
        });
    }
  }
);


/* ============================================================
   DEBUG MASTER CACHE

   Useful on Render to check whether
   master scanner is actually updating.
============================================================ */

app.get(
  "/debug/master",
  (
    req,
    res
  ) => {
    const snapshot =
      getLatestMasterGRTSnapshot(
        5 *
          60 *
          1000
      );

    res.json({
      ok:
        true,

      scanner:
        getMasterScannerStatus(),

      latestSnapshot:
        snapshot,

      delivery:
        getAlertDeliveryStatus(),

      collectors:
        getCollectorStatus(),

      scheduler:
        getSchedulerStatus(),

      timestamp:
        Date.now(),
    });
  }
);
/* ============================================================
   PART 8C — FINAL SUPPORT MODULES + STARTUP

   THIS IS THE FINAL PART.

   PURPOSE:

   1. Daily Watch persistence
   2. BUY NOW learning persistence
   3. BUY NOW performance monitor
   4. Basic adaptive tuning
   5. GRT 24H report
   6. Final app.listen()
   7. Bootstrap all background services

   IMPORTANT:

   NO MORE setInterval() HERE.

   All repeating jobs already live
   inside Central Scheduler.
============================================================ */


/* ============================================================
   DAILY WATCH SAVE
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

          lastDailyReportKey:
            LAST_DAILY_REPORT_KEY,

          savedAt:
            Date.now(),
        },
        null,
        2
      )
    );

    return true;
  } catch (
    error
  ) {
    console.log(
      "Daily watch save:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   DAILY WATCH LOAD
============================================================ */

function loadDailyWatchSnapshot() {
  try {
    if (
      !fs.existsSync(
        DAILY_WATCH_FILE
      )
    ) {
      return false;
    }

    const raw =
      fs.readFileSync(
        DAILY_WATCH_FILE,
        "utf8"
      );

    if (
      !raw
    ) {
      return false;
    }

    const parsed =
      JSON.parse(
        raw
      );

    if (
      parsed.state &&
      typeof parsed.state ===
        "object"
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
      parsed.lastDailyReportKey ||
      null;

    return true;
  } catch (
    error
  ) {
    console.log(
      "Daily watch load:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   DAILY ROLLOVER

   Existing state is moved into history
   only when Malaysia date changes.
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
    return {
      rolledOver:
        false,

      dateKey:
        today,
    };
  }

  /* ========================================================
     ARCHIVE PREVIOUS DAY
  ======================================================== */

  const completed = {
    ...state,

    completedAt:
      Date.now(),
  };

  GRT_DAILY_HISTORY.push(
    completed
  );

  GRT_DAILY_HISTORY =
    GRT_DAILY_HISTORY.slice(
      -GRT_DAILY_HISTORY_DAYS
    );

  /* ========================================================
     START NEW MALAYSIA DAY
  ======================================================== */

  GRT_DAILY_STATE =
    createDailyWatchState(
      today
    );

  saveDailyWatchSnapshot();

  return {
    rolledOver:
      true,

    previousDate:
      completed.dateKey,

    dateKey:
      today,
  };
}


/* ============================================================
   GRT 24H SNAPSHOT LOAD

   Daily Watch file is already the
   source of this information.

   This compatibility function exists
   because loadStoredBotState() calls it.
============================================================ */

function loadGRT24hSnapshot() {
  /*
    No second file is needed.

    Daily Watch persistence already
    restores current + historical state.
  */

  return Boolean(
    GRT_DAILY_STATE ||
    GRT_DAILY_HISTORY.length
  );
}


/* ============================================================
   BUILD GRT DAILY / 24H REPORT
============================================================ */

async function buildGRT24Report() {
  await checkDailyWatchRollover();

  const state =
    ensureDailyWatchState();

  const currentTicker =
    await getTicker(
      "GRT"
    );

  if (
    currentTicker
  ) {
    updateDailyWatchPrice(
      "GRT",
      currentTicker.currentPrice
    );
  }

  const open =
    state.grtOpen;

  const close =
    state.grtClose ||
    currentTicker
      ?.currentPrice ||
    null;

  const changePct =
    open &&
    close
      ? percentChange(
          open,
          close
        )
      : 0;

  const totalExecuted =
    state.buyExecutions +
    state.sellExecutions;

  const totalVolume =
    state.buyVolume +
    state.sellVolume;

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

  return `🌙 GRT DAILY WATCH

📅 ${formatMalaysiaDateLabel(
    state.dateKey
  )}

⏱ 12AM → CURRENT

💵 Open:
${
  open
    ? `RM${formatPrice(
        "GRT",
        open
      )}`
    : "N/A"
}

🔺 High:
${
  state.grtHigh
    ? `RM${formatPrice(
        "GRT",
        state.grtHigh
      )}`
    : "N/A"
}

🔻 Low:
${
  state.grtLow
    ? `RM${formatPrice(
        "GRT",
        state.grtLow
      )}`
    : "N/A"
}

💵 Current:
${
  close
    ? `RM${formatPrice(
        "GRT",
        close
      )}`
    : "N/A"
}

📈 Change:
${formatPercent(
    changePct
  )}

━━━━━━━━━━━━━━

🟢 BUY Volume:
${buyVolumePct.toFixed(
    1
  )}%

🔴 SELL Volume:
${sellVolumePct.toFixed(
    1
  )}%

📦 Executions:
${totalExecuted}

BUY:
${state.buyExecutions}

SELL:
${state.sellExecutions}`;
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
            GRT_BUY_NOW_HISTORY.slice(
              -GRT_BUY_NOW_HISTORY_LIMIT
            ),

          lastSignal:
            LAST_GRT_BUY_NOW_SIGNAL,

          lastSuggestionCount:
            LAST_TUNING_SUGGESTION_COUNT,

          savedAt:
            Date.now(),
        },
        null,
        2
      )
    );

    return true;
  } catch (
    error
  ) {
    console.log(
      "GRT BUY NOW save error:",
      error.message
    );

    return false;
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
      return false;
    }

    const raw =
      fs.readFileSync(
        GRT_BUY_NOW_FILE,
        "utf8"
      );

    if (
      !raw
    ) {
      return false;
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
        0
      );

    LAST_TUNING_SUGGESTION_COUNT =
      safeNumber(
        parsed.lastSuggestionCount,
        0
      );

    return true;
  } catch (
    error
  ) {
    console.log(
      "GRT BUY NOW load error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   CREATE BUY NOW SIGNAL RECORD
============================================================ */

function recordGRTBuyNowSignal(
  ticker,
  decision
) {
  if (
    !ticker ||
    !decision
  ) {
    return null;
  }

  const signal = {
    id:
      `GRT-${Date.now()}-${Math.random()
        .toString(
          36
        )
        .substring(
          2,
          6
        )
        .toUpperCase()}`,

    createdAt:
      Date.now(),

    entryPrice:
      ticker.currentPrice,

    status:
      "ACTIVE",

    decisionStatus:
      decision.status,

    reason:
      decision.reason ||
      null,

    direction:
      decision.direction ||
      null,

    directionText:
      decision.directionText ||
      null,

    score:
      safeNumber(
        decision.score,
        0
      ),

    change5m:
      safeNumber(
        decision
          .sustainedMove
          ?.change5m,
        0
      ),

    change15m:
      safeNumber(
        decision
          .sustainedMove
          ?.change15m,
        0
      ),

    highestPrice:
      ticker.currentPrice,

    lowestPrice:
      ticker.currentPrice,

    bestMovePct:
      0,

    worstMovePct:
      0,

    completedAt:
      null,

    result:
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
   BUY NOW LEARNING MONITOR

   Observe every ACTIVE historical signal.

   SUCCESS:
   price reaches +0.30%

   FALSE:
   price reaches -0.30%

   Otherwise remain ACTIVE until
   observation window expires.
============================================================ */

async function monitorGRTBuyNowSignals() {
  const active =
    GRT_BUY_NOW_HISTORY.filter(
      (
        signal
      ) =>
        signal.status ===
        "ACTIVE"
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

  const currentPrice =
    ticker.currentPrice;

  let changed =
    false;

  for (
    const signal of
    active
  ) {
    const movePct =
      percentChange(
        signal.entryPrice,
        currentPrice
      );

    if (
      !Number.isFinite(
        signal.highestPrice
      ) ||
      currentPrice >
        signal.highestPrice
    ) {
      signal.highestPrice =
        currentPrice;

      changed =
        true;
    }

    if (
      !Number.isFinite(
        signal.lowestPrice
      ) ||
      currentPrice <
        signal.lowestPrice
    ) {
      signal.lowestPrice =
        currentPrice;

      changed =
        true;
    }

    signal.bestMovePct =
      Math.max(
        safeNumber(
          signal.bestMovePct,
          0
        ),
        movePct
      );

    signal.worstMovePct =
      Math.min(
        safeNumber(
          signal.worstMovePct,
          0
        ),
        movePct
      );

    /* ======================================================
       SUCCESS
    ====================================================== */

    if (
      movePct >=
      GRT_BUY_NOW_SUCCESS_PCT
    ) {
      signal.status =
        "COMPLETED";

      signal.result =
        "SUCCESS";

      signal.completedAt =
        Date.now();

      signal.exitPrice =
        currentPrice;

      signal.finalMovePct =
        movePct;

      changed =
        true;

      continue;
    }

    /* ======================================================
       FALSE SIGNAL
    ====================================================== */

    if (
      movePct <=
      GRT_BUY_NOW_FALSE_PCT
    ) {
      signal.status =
        "COMPLETED";

      signal.result =
        "FALSE";

      signal.completedAt =
        Date.now();

      signal.exitPrice =
        currentPrice;

      signal.finalMovePct =
        movePct;

      changed =
        true;

      continue;
    }

    /* ======================================================
       EXPIRE AFTER 30 MIN

       Neutral signals are useful too.
    ====================================================== */

    const ageMs =
      Date.now() -
      signal.createdAt;

    if (
      ageMs >=
      30 *
        60 *
        1000
    ) {
      signal.status =
        "COMPLETED";

      signal.result =
        movePct >
          0
          ? "MIXED_POSITIVE"
          : movePct <
              0
            ? "MIXED_NEGATIVE"
            : "FLAT";

      signal.completedAt =
        Date.now();

      signal.exitPrice =
        currentPrice;

      signal.finalMovePct =
        movePct;

      changed =
        true;
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
   BUY NOW STATISTICS
============================================================ */

function getGRTBuyNowStatistics() {
  const completed =
    GRT_BUY_NOW_HISTORY.filter(
      (
        signal
      ) =>
        signal.status ===
        "COMPLETED"
    );

  const success =
    completed.filter(
      (
        signal
      ) =>
        signal.result ===
        "SUCCESS"
    ).length;

  const falseSignals =
    completed.filter(
      (
        signal
      ) =>
        signal.result ===
        "FALSE"
    ).length;

  const mixed =
    completed.length -
    success -
    falseSignals;

  const accuracy =
    completed.length >
      0
      ? (
          success /
          completed.length
        ) *
        100
      : 0;

  const falseRate =
    completed.length >
      0
      ? (
          falseSignals /
          completed.length
        ) *
        100
      : 0;

  return {
    total:
      GRT_BUY_NOW_HISTORY.length,

    active:
      GRT_BUY_NOW_HISTORY.filter(
        (
          signal
        ) =>
          signal.status ===
          "ACTIVE"
      ).length,

    completed:
      completed.length,

    success,

    falseSignals,

    mixed,

    accuracy,

    falseRate,
  };
}


/* ============================================================
   SAVE GRT TUNING
============================================================ */

function saveGRTTuning() {
  try {
    fs.writeFileSync(
      GRT_TUNING_FILE,
      JSON.stringify(
        {
          dynamicBuyVolumeMinPct:
            GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

          lastSuggestionCount:
            LAST_TUNING_SUGGESTION_COUNT,

          savedAt:
            Date.now(),
        },
        null,
        2
      )
    );

    return true;
  } catch (
    error
  ) {
    console.log(
      "GRT tuning save error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   LOAD GRT TUNING
============================================================ */

function loadGRTTuning() {
  try {
    if (
      !fs.existsSync(
        GRT_TUNING_FILE
      )
    ) {
      return false;
    }

    const raw =
      fs.readFileSync(
        GRT_TUNING_FILE,
        "utf8"
      );

    if (
      !raw
    ) {
      return false;
    }

    const parsed =
      JSON.parse(
        raw
      );

    const value =
      safeNumber(
        parsed.dynamicBuyVolumeMinPct,
        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
      );

    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
      clamp(
        value,
        50,
        65
      );

    LAST_TUNING_SUGGESTION_COUNT =
      safeNumber(
        parsed.lastSuggestionCount,
        LAST_TUNING_SUGGESTION_COUNT
      );

    return true;
  } catch (
    error
  ) {
    console.log(
      "GRT tuning load error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   LIGHTWEIGHT ADAPTIVE TUNING

   IMPORTANT:

   Small changes only.

   We DO NOT allow learning engine
   to radically rewrite thresholds.

   Adjustment step = 1%.

   Range = 50% to 65%.
============================================================ */

async function maybeSuggestGRTTuning() {
  const stats =
    getGRTBuyNowStatistics();

  if (
    stats.completed <
    GRT_TUNING_MIN_COMPLETED_SIGNALS
  ) {
    return {
      changed:
        false,

      reason:
        "NOT ENOUGH COMPLETED SIGNALS",
    };
  }

  /*
    Only reconsider tuning after
    another block of 10 completed
    signals.

    Prevent constant threshold changes.
  */

  if (
    stats.completed -
      LAST_TUNING_SUGGESTION_COUNT <
      10
  ) {
    return {
      changed:
        false,

      reason:
        "WAITING FOR MORE SAMPLES",
    };
  }

  const previous =
    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT;

  let next =
    previous;

  /*
    High false-signal rate:
    require stronger BUY pressure.
  */

  if (
    stats.falseRate >=
      35
  ) {
    next +=
      1;
  }

  /*
    Good accuracy:
    slightly loosen threshold so
    bot doesn't become unnecessarily
    slow.
  */

  else if (
    stats.accuracy >=
      70
  ) {
    next -=
      1;
  }

  next =
    clamp(
      next,
      50,
      65
    );

  LAST_TUNING_SUGGESTION_COUNT =
    stats.completed;

  if (
    next ===
      previous
  ) {
    saveGRTTuning();

    return {
      changed:
        false,

      reason:
        "NO CHANGE REQUIRED",
    };
  }

  GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
    next;

  saveGRTTuning();

  await sendTelegram(
    `🧠 GRT LEARNING UPDATE

Completed Samples:
${stats.completed}

Accuracy:
${stats.accuracy.toFixed(
      1
    )}%

False Rate:
${stats.falseRate.toFixed(
      1
    )}%

BUY Volume Threshold:
${previous.toFixed(
      1
    )}% → ${next.toFixed(
      1
    )}%

📌 Adjustment:
SMALL AUTO-TUNING`
  );

  return {
    changed:
      true,

    previous,

    next,

    stats,
  };
}


/* ============================================================
   FINAL STARTUP

   THIS IS THE ONLY app.listen().
============================================================ */

app.listen(
  PORT,
  async () => {
    console.log(
      `RUNNING ${PORT} ${SERVICE_CODE}`
    );

    try {
      /* ====================================================
         START EVERYTHING

         Internally this will:
         - load saved state
         - backfill trades
         - prime price memory
         - start Central Scheduler
         - register extra jobs
      ==================================================== */

      const startup =
        await bootstrapBackgroundServices();

      /* ====================================================
         STARTUP TELEGRAM
      ==================================================== */

      const scheduler =
        getSchedulerStatus();

      const master =
        getMasterScannerStatus();

      await sendTelegram(
        `🤖 ONE AI COIN ALERT ONLINE

✅ SERVICE ACTIVE

🧠 MASTER SCANNER:
${scheduler.started
  ? "ACTIVE"
  : "NOT ACTIVE"}

⏱ GRT ANALYSIS:
1 MIN

📡 PRICE ALERT:
5 MIN

📊 MARKET STRUCTURE:
15 MIN

📦 EXECUTED FLOW:
5 SEC

💾 PRICE MEMORY:
15 SEC

📈 TRADE MONITOR:
15 SEC

🪙 GRT STATE:
${master.grtStatus ||
  "INITIALIZING"}

📍 SERVICE:
${SERVICE_CODE}

━━━━━━━━━━━━━━

Startup:
${
  startup?.started
    ? "COMPLETE"
    : startup?.reason ||
      "CHECK LOG"
}`
      );

      console.log(
        "✅ FINAL BOT STARTUP COMPLETE"
      );
    } catch (
      error
    ) {
      console.log(
        "Final app startup error:",
        error.message
      );

      try {
        await sendTelegram(
          `🚨 BOT STARTUP ERROR

${error.message}`
        );
      } catch (
        telegramError
      ) {
        console.log(
          "Startup error Telegram failed:",
          telegramError.message
        );
      }
    }
  }
);
