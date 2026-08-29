/* ============================================================
   PART 1 — SERVER + CONFIG + GLOBAL STATE

   SAFWAN CRIPTO AI ALERT

   PURPOSE:
   - Server setup
   - Telegram setup
   - Environment config
   - Luno MAIN API initialization
   - Luno TRADE API initialization
   - Coin configuration
   - Fees
   - Intervals
   - Trading limits
   - Market structure config
   - Global runtime state

   IMPORTANT:
   No market analysis happens in PART 1.
============================================================ */

require("dotenv").config();

const express =
  require("express");

const axios =
  require("axios");

const TelegramBot =
  require("node-telegram-bot-api");

const fs =
  require("fs");


/* ============================================================
   EXPRESS SERVER
============================================================ */

const app =
  express();

app.use(
  express.json()
);

const PORT =
  process.env.PORT ||
  3000;


/* ============================================================
   TELEGRAM CONFIG
============================================================ */

const BOT_TOKEN =
  process.env.BOT_TOKEN;

const CHAT_ID =
  process.env.CHAT_ID;

if (
  !BOT_TOKEN ||
  !CHAT_ID
) {
  console.log(
    "Missing BOT_TOKEN or CHAT_ID"
  );

  process.exit(
    1
  );
}

const bot =
  new TelegramBot(
    BOT_TOKEN,
    {
      polling:
        true,
    }
  );


/* ============================================================
   TELEGRAM COMMAND MENU

   UPDATED:
   - /autostatus added
   - /autooff added
============================================================ */

bot.setMyCommands([
  {
    command:
      "momentum",

    description:
      "Check BTC & GRT momentum",
  },

  {
    command:
      "structure",

    description:
      "Check BTC & GRT market structure",
  },

  {
    command:
      "flow",

    description:
      "Check 2H executed flow",
  },

  {
    command:
      "grt24",

    description:
      "GRT 24H report",
  },

  {
    command:
      "grthold",

    description:
      "Manual GRT hold analysis",
  },

  {
    command:
      "buytest",

    description:
      "GRT BUY NOW learning statistics",
  },

  {
    command:
      "buylast",

    description:
      "Latest GRT BUY NOW result",
  },

  {
    command:
      "tuning",

    description:
      "GRT momentum tuning status",
  },

  {
    command:
      "status",

    description:
      "Bot system status",
  },

  {
    command:
      "autostatus",

    description:
      "Check Auto Trade session status",
  },

  {
    command:
      "autooff",

    description:
      "Stop Auto Trade session",
  },
]).catch(
  (error) => {
    console.log(
      "Telegram command menu error:",
      error.message
    );
  }
);


/* ============================================================
   UNIQUE SERVICE CODE

   New code is generated on every deployment.
============================================================ */

const SERVICE_CODE =
  `[${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}]`;


/* ============================================================
   SERVER RUNTIME
============================================================ */

const BOT_STARTED_AT =
  Date.now();


/* ============================================================
   LUNO FEES

   IMPORTANT:

   Existing signal / calculation engine currently uses:

   BUY  = 0.5%
   SELL = 0.5%

   This value is retained for compatibility with the
   existing bot.

   Later, before REAL AUTO / SEMI AUTO trading is enabled,
   the execution layer will obtain / calculate the actual
   applicable maker / taker fee instead of blindly relying
   on this fixed value.
============================================================ */

const BUY_FEE =
  0.005;

const SELL_FEE =
  0.005;


/* ============================================================
   LUNO API CREDENTIAL INITIALIZATION

   TWO ACCOUNT ARCHITECTURE

   ACCOUNT 1 — MAIN
   ----------------
   Purpose:
   - Market monitoring
   - Ticker
   - Orderbook
   - Executed trades
   - Balance reading if required
   - Existing bot functions

   Recommended permission:
   READ ONLY


   ACCOUNT 2 — TRADE
   -----------------
   Purpose later:
   - Semi Auto trading
   - Full Auto trading
   - Place BUY order
   - Place SELL order
   - Cancel order
   - Check order status

   IMPORTANT:
   - TRADE API can remain EMPTY for now.
   - NO withdrawal credential is initialized.
   - NO withdrawal function will be connected to the
     Auto Trade execution engine.
============================================================ */


/* ============================================================
   MAIN LUNO ACCOUNT
============================================================ */

const LUNO_MAIN_API_KEY_ID =
  process.env
    .LUNO_MAIN_API_KEY_ID ||

  process.env
    .LUNO_API_KEY_ID ||

  "";

const LUNO_MAIN_API_KEY_SECRET =
  process.env
    .LUNO_MAIN_API_KEY_SECRET ||

  process.env
    .LUNO_API_KEY_SECRET ||

  "";


/* ============================================================
   SECONDARY / TRADING LUNO ACCOUNT

   Safe to leave blank until the secondary account
   and API credentials are ready.
============================================================ */

const LUNO_TRADE_API_KEY_ID =
  process.env
    .LUNO_TRADE_API_KEY_ID ||
  "";

const LUNO_TRADE_API_KEY_SECRET =
  process.env
    .LUNO_TRADE_API_KEY_SECRET ||
  "";


/* ============================================================
   BACKWARD COMPATIBILITY

   Existing code in later PARTS may still reference:

   LUNO_API_KEY_ID
   LUNO_API_KEY_SECRET

   They are intentionally mapped to MAIN account.

   This prevents the current bot from breaking while
   we migrate the architecture gradually.
============================================================ */

const LUNO_API_KEY_ID =
  LUNO_MAIN_API_KEY_ID;

const LUNO_API_KEY_SECRET =
  LUNO_MAIN_API_KEY_SECRET;


/* ============================================================
   LUNO API READINESS STATE

   IMPORTANT:

   tradeReady === false
   means future execution engine MUST NOT submit orders.

   We initialize this state now, but actual trading logic
   will only be introduced later.
============================================================ */

const LUNO_API_STATUS = {

  mainReady:
    Boolean(
      LUNO_MAIN_API_KEY_ID &&
      LUNO_MAIN_API_KEY_SECRET
    ),

  tradeReady:
    Boolean(
      LUNO_TRADE_API_KEY_ID &&
      LUNO_TRADE_API_KEY_SECRET
    ),

};


/* ============================================================
   COINS

   BTC:
   market context only.

   GRT:
   dedicated 1-minute momentum engine.

   XRP / XLM / CRV / AAVE:
   generic opportunity scanner every 30 minutes.
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

const ALTCOIN_SCALPING_COINS = [
  "XRP",
  "XLM",
  "CRV",
  "AAVE",
];


/* ============================================================
   MAIN INTERVALS
============================================================ */

/*
   GRT master analysis:
   every 1 minute.
*/

const GRT_MASTER_SCAN_INTERVAL =
  60 *
  1000;


/*
   Other coin scalping opportunity scan:
   every 30 minutes.

   IMPORTANT:
   No setup = no Telegram alert.
*/

const ALTCOIN_SCALPING_SCAN_INTERVAL =
  30 *
  60 *
  1000;


/*
   Telegram Price Alert:
   every 5 minutes.
*/

const PRICE_ALERT_INTERVAL =
  5 *
  60 *
  1000;


/*
   Market Structure:
   every 15 minutes.
*/

const MARKET_STRUCTURE_INTERVAL =
  15 *
  60 *
  1000;


/*
   Luno executed trade collector.
*/

const TRADE_COLLECT_INTERVAL =
  5 *
  1000;


/*
   Price memory collector.
*/

const PRICE_MEMORY_INTERVAL =
  15 *
  1000;


/*
   Active trade monitor.
*/

const TRADE_MONITOR_INTERVAL =
  15 *
  1000;


/*
   GRT daily / 24H maintenance.
*/

const DAILY_WATCH_CHECK_INTERVAL =
  60 *
  1000;

const DAILY_WATCH_SAVE_INTERVAL =
  60 *
  1000;


/* ============================================================
   MARKET TIME WINDOWS
============================================================ */

const FIVE_MINUTES =
  5 *
  60 *
  1000;

const FIFTEEN_MINUTES =
  15 *
  60 *
  1000;

const THIRTY_MINUTES =
  30 *
  60 *
  1000;

const ONE_HOUR =
  60 *
  60 *
  1000;

const TWO_HOURS =
  2 *
  60 *
  60 *
  1000;

const SIX_HOURS =
  6 *
  60 *
  60 *
  1000;

const TWENTY_FOUR_HOURS =
  24 *
  60 *
  60 *
  1000;


/*
   Keep slightly more than 24H
   executed history.
*/

const HISTORY_KEEP_MS =
  26 *
  60 *
  60 *
  1000;


/*
   Minimum historical coverage
   before 2H context is considered mature.
*/

const TWO_HOUR_MIN_COVERAGE_MS =
  90 *
  60 *
  1000;


/* ============================================================
   SCALPING COOLDOWNS
============================================================ */

const GLOBAL_SCALPING_COOLDOWN =
  5 *
  60 *
  1000;

const PER_COIN_COOLDOWN =
  10 *
  60 *
  1000;


/* ============================================================
   GRT BUY NOW COOLDOWN
============================================================ */

const GRT_BUY_NOW_COOLDOWN_MS =
  15 *
  60 *
  1000;


/* ============================================================
   GRT SCALPING QUANTITY LIMIT

   HARD LIMIT:

   GRT scalping recommendation must never
   require more than 30,000 gross GRT.

   IMPORTANT:

   30,000 is a ceiling.
   It does NOT mean every trade must use
   30,000 GRT.
============================================================ */

const MAX_GRT_SCALPING_QUANTITY =
  30000;


/* ============================================================
   ORDERBOOK STRUCTURE RANGE
============================================================ */

const ORDERBOOK_STRUCTURE_RANGE_PCT = {
  BTC:
    2.00,

  GRT:
    3.00,

  XRP:
    3.00,

  XLM:
    3.00,

  CRV:
    3.00,

  AAVE:
    3.00,
};


/* ============================================================
   ORDERBOOK CLUSTER SIZE
============================================================ */

const ORDERBOOK_CLUSTER_PCT = {
  BTC:
    0.08,

  GRT:
    0.15,

  XRP:
    0.15,

  XLM:
    0.15,

  CRV:
    0.15,

  AAVE:
    0.15,
};


/* ============================================================
   WALL CONFIG
============================================================ */

const MIN_WALL_RELATIVE_RATIO =
  1.20;

const WALL_DISTANCE_WEIGHT =
  0.35;

const MEANINGFUL_RESISTANCE_MIN_RATING =
  5;

const MEANINGFUL_RESISTANCE_MIN_RATIO =
  1.35;


/* ============================================================
   RESISTANCE STRENGTH

   1-3  = WEAK
   4-6  = MEDIUM
   7-10 = STRONG
============================================================ */

const GRT_WEAK_RESISTANCE_MAX_RATING =
  3;

const GRT_MEDIUM_RESISTANCE_MAX_RATING =
  6;

const GRT_STRONG_RESISTANCE_MIN_RATING =
  7;


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
  30 *
  60 *
  1000;

const CONFIRMED_BREAKOUT_VISIBLE_MS =
  30 *
  60 *
  1000;

const CONFIRMED_STRUCTURE_TOLERANCE_PCT =
  0.50;


/* ============================================================
   ENTRY EXECUTION CONFIG
============================================================ */

const MAX_ENTRY_CHASE_PCT =
  0.30;


/*
   Generic altcoin minimum gross TP room.

   Generic scanner is intentionally less
   rigid than the dedicated GRT engine.
*/

const MIN_GROSS_ROOM_PCT =
  1.30;


/*
   GRT practical room.

   This will be used by the execution layer,
   NOT as the first trigger for BUY NOW.
*/

const GRT_MIN_PRACTICAL_TP_ROOM_PCT =
  0.90;

const TP_RESISTANCE_BUFFER_PCT =
  0.25;


/* ============================================================
   GENERIC DEFAULT PROJECTED TP

   Used mainly by generic altcoin scanner
   when stronger dynamic projection is absent.
============================================================ */

const DEFAULT_BREAKOUT_TP_PCT = {
  BTC:
    1.60,

  GRT:
    2.00,

  XRP:
    2.50,

  XLM:
    2.50,

  CRV:
    2.50,

  AAVE:
    2.00,
};


/* ============================================================
   GRT MOMENTUM CANDLE CONFIG

   Detailed BUY NOW thresholds will live
   inside PART 4.

   These are shared technical constants only.
============================================================ */

const MOMENTUM_CANDLE_DURATION_SEC =
  5 *
  60;

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
   GRT DIRECTION CONFIG

   SIDEWAY is now a valid direction.

   Display states:

   MASIH_DROP
   DROP_PERLAHAN
   SIDEWAY
   NAIK_PERLAHAN
   NAIK_LAJU
============================================================ */

const GRT_DIRECTION_SLOW_UP_5M_PCT =
  0.08;

const GRT_DIRECTION_FAST_UP_5M_PCT =
  0.35;

const GRT_DIRECTION_ACTIVE_DROP_5M_PCT =
  -0.20;

const GRT_DIRECTION_MIN_SEQUENCE_PCT =
  55;


/* ============================================================
   GRT HARD DANGER CONFIG

   These are real danger signals.
   We do not want mild bearish context
   to block every fresh reversal.
============================================================ */

const GRT_HARD_SELL_VOLUME_PCT =
  65;

const GRT_HARD_PRICE_DROP_5M_PCT =
  -0.35;


/* ============================================================
   GRT HOLD PROJECTED REACH

   Used by /grthold.

   It is NOT a fixed TP.
============================================================ */

const GRT_HOLD_BASE_REACH = {
  WEAK:
    0.75,

  NEUTRAL:
    1.25,

  BUILDING:
    1.80,

  STRONG:
    2.75,

  ACCELERATING:
    4.00,
};

const GRT_HOLD_MAX_DYNAMIC_REACH_PCT =
  6.00;


/* ============================================================
   GRT BUY NOW LEARNING CONFIG
============================================================ */

const GRT_BUY_NOW_HISTORY_LIMIT =
  250;

const GRT_BUY_NOW_SUCCESS_PCT =
  0.30;

const GRT_BUY_NOW_FALSE_PCT =
  -0.30;

const GRT_BUY_NOW_MONITOR_INTERVAL =
  60 *
  1000;

const GRT_TUNING_MIN_COMPLETED_SIGNALS =
  20;


/* ============================================================
   PERSISTENCE FILES
============================================================ */

const GRT_BUY_NOW_FILE =
  process.env
    .GRT_BUY_NOW_FILE ||
  "/tmp/grt-buy-now-history.json";

const GRT_TUNING_FILE =
  process.env
    .GRT_TUNING_FILE ||
  "/tmp/grt-momentum-tuning.json";

const DAILY_WATCH_FILE =
  process.env
    .DAILY_WATCH_FILE ||
  "/tmp/grt-daily-watch.json";


/* ============================================================
   MALAYSIA TIMEZONE
============================================================ */

const MALAYSIA_TIMEZONE =
  "Asia/Kuala_Lumpur";

const GRT_DAILY_HISTORY_DAYS =
  7;


/* ============================================================
   TRADE / TELEGRAM STATE
============================================================ */

const ACTIVE_TRADES =
  {};

const PENDING_ENTRIES =
  {};

const USER_STATE =
  {};


/* ============================================================
   SIGNAL STATE
============================================================ */

const LAST_SIGNAL =
  {};

let LAST_GLOBAL_SIGNAL =
  0;


/* ============================================================
   PRICE STATE
============================================================ */

const LAST_PRICE =
  {};

const LAST_ALERT_PRICE =
  {};

const PRICE_MEMORY =
  {};


/* ============================================================
   BREAKOUT STATE
============================================================ */

const BREAKOUT_WATCH =
  {};

const LAST_FAKE_BREAKOUT =
  {};

const LAST_CONFIRMED_BREAKOUT =
  {};


/* ============================================================
   EXECUTED TRADE HISTORY
============================================================ */

const TRADE_HISTORY =
  Object.fromEntries(
    SCAN_COINS.map(
      (coin) => [
        coin,
        [],
      ]
    )
  );

const SEEN_TRADE_SEQUENCES =
  Object.fromEntries(
    SCAN_COINS.map(
      (coin) => [
        coin,
        new Set(),
      ]
    )
  );

let TRADE_HISTORY_BUSY =
  false;


/* ============================================================
   GRT MOMENTUM RUNTIME
============================================================ */

const GRT_MOMENTUM_RUNTIME = {
  recentPrices:
    [],

  phase:
    "COLLECTING",

  lastDirection:
    "UNKNOWN",

  lastDirectionAt:
    null,

  lastDecision:
    "COLLECTING",

  lastBuyNowAt:
    null,

  peakScore:
    0,

  peakBuyVolumePct:
    0,

  peakPriceResponsePct:
    0,
};


/* ============================================================
   GRT DECISION STATE
============================================================ */

let LAST_BTC_SURGE_STATE =
  "BUY_SURGE_OFF";

let GRT_VALIDATION_STARTED_AT =
  null;

let LAST_GRT_FINAL_DECISION =
  "DONT_BUY";

let GRT_ENGINE_HAS_BEEN_READY =
  false;


/* ============================================================
   GRT BUY NOW LEARNING STATE
============================================================ */

let GRT_BUY_NOW_HISTORY =
  [];

let LAST_GRT_BUY_NOW_SIGNAL =
  0;

let LAST_TUNING_SUGGESTION_COUNT =
  0;

let GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
  55;


/* ============================================================
   GRT DAILY / 24H STATE
============================================================ */

let GRT_DAILY_STATE =
  null;

let GRT_DAILY_HISTORY =
  [];

let LAST_DAILY_REPORT_KEY =
  null;


/* ============================================================
   ALTCOIN SCANNER RUNTIME

   XRP / XLM / CRV / AAVE only.

   Scanner runs every 30 minutes.
   No qualified setup = no Telegram alert.
============================================================ */

const ALTCOIN_SCANNER_RUNTIME = {
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

  lastOpportunities:
    {},
};


/* ============================================================
   END PART 1
============================================================ */
/* ============================================================
   PART 2 — LUNO API + BASIC DATA HELPERS

   PURPOSE:
   - Safe number helpers
   - Price formatting
   - Percentage calculations
   - Coin pair mapping
   - Luno MAIN API helpers
   - Luno TRADE API foundation
   - Ticker
   - Orderbook
   - Executed trades
   - Candle retrieval
   - Price memory
   - Fee calculations
   - Telegram helpers

   IMPORTANT:
   No GRT momentum decision happens here.

   IMPORTANT API RULE:
   MAIN API  = market/read functions
   TRADE API = reserved for later execution engine

   No withdrawal function exists here.
============================================================ */


/* ============================================================
   BASIC NUMBER HELPERS
============================================================ */

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function average(
  values
) {
  if (
    !Array.isArray(
      values
    )
  ) {
    return 0;
  }

  const clean =
    values
      .map(
        (value) =>
          Number(
            value
          )
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          )
      );

  if (
    !clean.length
  ) {
    return 0;
  }

  return (
    clean.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    clean.length
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


function percentChange(
  oldValue,
  newValue
) {
  const oldNumber =
    safeNumber(
      oldValue,
      0
    );

  const newNumber =
    safeNumber(
      newValue,
      0
    );

  if (
    oldNumber <=
    0
  ) {
    return 0;
  }

  return (
    (
      newNumber -
      oldNumber
    ) /
    oldNumber
  ) *
    100;
}


function formatPercent(
  value,
  digits = 2
) {
  const number =
    safeNumber(
      value,
      0
    );

  const sign =
    number >
    0
      ? "+"
      : "";

  return `${sign}${number.toFixed(
    digits
  )}%`;
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
   PRICE FORMAT
============================================================ */

function formatPrice(
  coin,
  price
) {
  const value =
    safeNumber(
      price,
      0
    );

  if (
    coin ===
    "BTC"
  ) {
    return value.toFixed(
      2
    );
  }

  if (
    coin ===
      "GRT" ||
    coin ===
      "XLM"
  ) {
    return value.toFixed(
      4
    );
  }

  if (
    coin ===
    "CRV"
  ) {
    return value.toFixed(
      3
    );
  }

  return value.toFixed(
    2
  );
}


/* ============================================================
   COIN → LUNO PAIR
============================================================ */

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
   LUNO MAIN ACCOUNT AUTH

   Existing monitoring functions use MAIN account only.

   This allows the existing bot to keep running even
   before TRADE account credentials are configured.
============================================================ */

function getLunoMainAuth() {
  if (
    !LUNO_MAIN_API_KEY_ID ||
    !LUNO_MAIN_API_KEY_SECRET
  ) {
    return null;
  }

  return {
    username:
      LUNO_MAIN_API_KEY_ID,

    password:
      LUNO_MAIN_API_KEY_SECRET,
  };
}


/* ============================================================
   LUNO TRADE ACCOUNT AUTH

   FOUNDATION ONLY.

   This function DOES NOT execute any order.

   It only prepares authentication for the future
   Semi Auto / Full Auto execution module.
============================================================ */

function getLunoTradeAuth() {
  if (
    !LUNO_TRADE_API_KEY_ID ||
    !LUNO_TRADE_API_KEY_SECRET
  ) {
    return null;
  }

  return {
    username:
      LUNO_TRADE_API_KEY_ID,

    password:
      LUNO_TRADE_API_KEY_SECRET,
  };
}


/* ============================================================
   BACKWARD COMPATIBILITY

   Older functions that call getLunoAuth()
   automatically use MAIN account.

   This prevents existing code from breaking.
============================================================ */

function getLunoAuth() {
  return getLunoMainAuth();
}


/* ============================================================
   LUNO API ACCOUNT STATUS
============================================================ */

function getLunoApiReadiness() {
  return {
    mainReady:
      Boolean(
        getLunoMainAuth()
      ),

    tradeReady:
      Boolean(
        getLunoTradeAuth()
      ),
  };
}


/* ============================================================
   SAFE LUNO GET REQUEST

   accountType:

   MAIN  = default market/read account
   TRADE = future secondary trading account

   GET requests only.

   No order placement happens here.
============================================================ */

async function lunoGet(
  endpoint,
  params = {},
  authenticated = false,
  accountType = "MAIN"
) {
  const options = {
    method:
      "GET",

    url:
      `https://api.luno.com${endpoint}`,

    params,

    timeout:
      15000,
  };

  if (
    authenticated
  ) {
    let auth =
      null;

    if (
      accountType ===
      "TRADE"
    ) {
      auth =
        getLunoTradeAuth();
    } else {
      auth =
        getLunoMainAuth();
    }

    if (
      !auth
    ) {
      throw new Error(
        accountType ===
          "TRADE"
          ? "LUNO TRADE AUTH NOT CONFIGURED"
          : "LUNO MAIN AUTH NOT CONFIGURED"
      );
    }

    options.auth =
      auth;
  }

  const response =
    await axios(
      options
    );

  return (
    response?.data ||
    null
  );
}


/* ============================================================
   TICKER
============================================================ */

async function getTicker(
  coin
) {
  try {
    const pair =
      getPair(
        coin
      );

    const data =
      await lunoGet(
        "/api/1/ticker",
        {
          pair,
        }
      );

    if (
      !data
    ) {
      return null;
    }

    const bid =
      safeNumber(
        data.bid,
        0
      );

    const ask =
      safeNumber(
        data.ask,
        0
      );

    const lastTrade =
      safeNumber(
        data.last_trade,
        0
      );

    const currentPrice =
      lastTrade >
      0
        ? lastTrade
        : bid >
            0 &&
          ask >
            0
          ? (
              bid +
              ask
            ) /
            2
          : bid ||
            ask ||
            0;

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

      lastTrade,

      rolling24HourVolume:
        safeNumber(
          data.rolling_24_hour_volume,
          0
        ),

      timestamp:
        Date.now(),

      raw:
        data,
    };
  } catch (
    error
  ) {
    console.log(
      `Ticker ${coin} error:`,
      error.message
    );

    return null;
  }
}


/* ============================================================
   ORDERBOOK
============================================================ */

async function getOrderBook(
  coin
) {
  try {
    const pair =
      getPair(
        coin
      );

    const data =
      await lunoGet(
        "/api/1/orderbook",
        {
          pair,
        }
      );

    if (
      !data
    ) {
      return null;
    }

    const bids =
      Array.isArray(
        data.bids
      )
        ? data.bids
            .map(
              (item) => ({
                price:
                  safeNumber(
                    item.price,
                    0
                  ),

                volume:
                  safeNumber(
                    item.volume,
                    0
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
        : [];

    const asks =
      Array.isArray(
        data.asks
      )
        ? data.asks
            .map(
              (item) => ({
                price:
                  safeNumber(
                    item.price,
                    0
                  ),

                volume:
                  safeNumber(
                    item.volume,
                    0
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
        : [];

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
      `Orderbook ${coin} error:`,
      error.message
    );

    return null;
  }
}


/* ============================================================
   RECENT EXECUTED TRADES

   Normalized shape:

   {
     sequence,
     timestamp,
     price,
     volume,
     isBuy
   }
============================================================ */

async function getRecentTrades(
  coin,
  since = null
) {
  try {
    const pair =
      getPair(
        coin
      );

    const params = {
      pair,
    };

    if (
      since
    ) {
      params.since =
        since;
    }

    const data =
      await lunoGet(
        "/api/1/trades",
        params
      );

    const rawTrades =
      Array.isArray(
        data?.trades
      )
        ? data.trades
        : [];

    return rawTrades
      .map(
        (trade) => {
          const sequence =
            trade.sequence;

          const timestamp =
            safeNumber(
              trade.timestamp,
              0
            );

          const price =
            safeNumber(
              trade.price,
              0
            );

          const volume =
            safeNumber(
              trade.volume,
              0
            );

          /*
             Luno trade object provides
             is_buy where available.
          */

          const isBuy =
            trade.is_buy ===
              true ||
            trade.is_buy ===
              "true";

          return {
            sequence,

            timestamp,

            price,

            volume,

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
      );
  } catch (
    error
  ) {
    console.log(
      `Recent trades ${coin} error:`,
      error.message
    );

    return [];
  }
}


/* ============================================================
   STORE EXECUTED TRADE

   Duplicate trade sequence protection.
============================================================ */

function storeExecutedTrade(
  coin,
  trade
) {
  if (
    !trade ||
    !TRADE_HISTORY[
      coin
    ]
  ) {
    return false;
  }

  const sequenceKey =
    String(
      trade.sequence ??
      `${trade.timestamp}:${trade.price}:${trade.volume}`
    );

  const seen =
    SEEN_TRADE_SEQUENCES[
      coin
    ];

  if (
    seen.has(
      sequenceKey
    )
  ) {
    return false;
  }

  seen.add(
    sequenceKey
  );

  TRADE_HISTORY[
    coin
  ].push(
    trade
  );

  const cutoff =
    Date.now() -
    HISTORY_KEEP_MS;

  TRADE_HISTORY[
    coin
  ] =
    TRADE_HISTORY[
      coin
    ].filter(
      (item) =>
        item.timestamp >=
        cutoff
    );

  /*
     Prevent seen sequence set
     growing forever.

     Rebuild if it gets too large.
  */

  if (
    seen.size >
    10000
  ) {
    SEEN_TRADE_SEQUENCES[
      coin
    ] =
      new Set(
        TRADE_HISTORY[
          coin
        ].map(
          (item) =>
            String(
              item.sequence ??
              `${item.timestamp}:${item.price}:${item.volume}`
            )
        )
      );
  }

  return true;
}


/* ============================================================
   GET TRADES IN WINDOW
============================================================ */

function getTradesInWindow(
  coin,
  windowMs
) {
  const history =
    TRADE_HISTORY[
      coin
    ] ||
    [];

  const cutoff =
    Date.now() -
    windowMs;

  return history.filter(
    (trade) =>
      trade.timestamp >=
      cutoff
  );
}


/* ============================================================
   CANDLE DATA

   durationSec example:
   300 = 5 minute candle
============================================================ */

async function getLunoCandles(
  coin,
  durationSec =
    300,
  limit =
    50
) {
  try {
    const pair =
      getPair(
        coin
      );

    const duration =
      durationSec;

    const safeLimit =
      Math.max(
        2,
        Math.min(
          1000,
          Math.floor(
            safeNumber(
              limit,
              50
            )
          )
        )
      );

    /*
       Luno candle endpoint expects
       a since timestamp.

       Give enough history for requested
       candle count.
    */

    const since =
      Date.now() -
      safeLimit *
        duration *
        1000;

    const data =
      await lunoGet(
        "/api/exchange/1/candles",
        {
          pair,
          since,
          duration,
        }
      );

    const candles =
      Array.isArray(
        data?.candles
      )
        ? data.candles
        : [];

    return candles
      .map(
        (candle) => ({
          timestamp:
            safeNumber(
              candle.timestamp,
              0
            ),

          open:
            safeNumber(
              candle.open,
              0
            ),

          close:
            safeNumber(
              candle.close,
              0
            ),

          high:
            safeNumber(
              candle.high,
              0
            ),

          low:
            safeNumber(
              candle.low,
              0
            ),

          volume:
            safeNumber(
              candle.volume,
              0
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
        (
          a,
          b
        ) =>
          a.timestamp -
          b.timestamp
      )
      .slice(
        -safeLimit
      );
  } catch (
    error
  ) {
    console.log(
      `Candles ${coin} error:`,
      error.message
    );

    return [];
  }
}


/* ============================================================
   COMPLETED CANDLES
============================================================ */

function getCompletedCandles(
  candles,
  durationSec
) {
  if (
    !Array.isArray(
      candles
    )
  ) {
    return [];
  }

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
   PRICE MEMORY
============================================================ */

function updatePriceMemory(
  coin,
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
    return false;
  }

  if (
    !Array.isArray(
      PRICE_MEMORY[
        coin
      ]
    )
  ) {
    PRICE_MEMORY[
      coin
    ] =
      [];
  }

  const now =
    Date.now();

  const memory =
    PRICE_MEMORY[
      coin
    ];

  const last =
    memory[
      memory.length -
      1
    ];

  /*
     Avoid unnecessary duplicate
     samples within a few seconds.
  */

  if (
    last &&
    now -
      last.timestamp <
      5000 &&
    last.price ===
      currentPrice
  ) {
    return false;
  }

  memory.push({
    timestamp:
      now,

    price:
      currentPrice,
  });

  const cutoff =
    now -
    HISTORY_KEEP_MS;

  PRICE_MEMORY[
    coin
  ] =
    memory.filter(
      (item) =>
        item.timestamp >=
        cutoff
    );

  LAST_PRICE[
    coin
  ] =
    currentPrice;

  return true;
}


/* ============================================================
   PRICE MEMORY WINDOW
============================================================ */

function getPriceMemoryWindow(
  coin,
  windowMs
) {
  const memory =
    PRICE_MEMORY[
      coin
    ] ||
    [];

  const cutoff =
    Date.now() -
    windowMs;

  return memory.filter(
    (item) =>
      item.timestamp >=
      cutoff
  );
}


/* ============================================================
   PRICE SNAPSHOT

   Used later by:
   - Market Structure
   - Generic Scalping
   - 15M / 60M context
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
    points[
      0
    ].price;

  const close =
    points[
      points.length -
      1
    ].price;

  return {
    coin,

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
   PREVIOUS REFERENCE PRICE

   Get closest price memory sample
   at or before requested lookback.

   IMPORTANT:
   This powers the redesigned rolling:

   BTC:
   15M

   GRT:
   5M
   15M
   1H

   These are rolling measurements,
   NOT candle-close measurements.
============================================================ */

function getReferencePrice(
  coin,
  lookbackMs
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

  const target =
    Date.now() -
    lookbackMs;

  let selected =
    null;

  for (
    const item of
    memory
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

  if (
    selected
  ) {
    return selected;
  }

  /*
     Startup fallback:
     return oldest available sample.

     Later Price Alert logic will know
     that historical coverage may still
     be immature during startup.
  */

  return memory[
    0
  ] ||
    null;
}


/* ============================================================
   REFERENCE PRICE AGE

   Used later so rolling movement can distinguish:

   REAL 15M history

   versus

   bot just restarted and only has
   a few minutes of price memory.
============================================================ */

function getReferencePriceAgeMs(
  reference
) {
  if (
    !reference ||
    !reference.timestamp
  ) {
    return 0;
  }

  return Math.max(
    0,
    Date.now() -
      safeNumber(
        reference.timestamp,
        Date.now()
      )
  );
}


/* ============================================================
   ROLLING PRICE CHANGE HELPER

   Generic helper used later by
   redesigned Price Alert.

   This DOES NOT classify BUY / SELL.

   It only measures movement.
============================================================ */

function getRollingPriceChange(
  coin,
  currentPrice,
  lookbackMs
) {
  const current =
    safeNumber(
      currentPrice,
      0
    );

  if (
    current <=
    0
  ) {
    return {
      ready:
        false,

      changePct:
        0,

      referencePrice:
        null,

      referenceTimestamp:
        null,

      ageMs:
        0,
    };
  }

  const reference =
    getReferencePrice(
      coin,
      lookbackMs
    );

  if (
    !reference ||
    safeNumber(
      reference.price,
      0
    ) <=
      0
  ) {
    return {
      ready:
        false,

      changePct:
        0,

      referencePrice:
        null,

      referenceTimestamp:
        null,

      ageMs:
        0,
    };
  }

  const ageMs =
    getReferencePriceAgeMs(
      reference
    );

  /*
     Allow slight timing tolerance because
     PRICE_MEMORY samples every ~15 seconds.
  */

  const minimumCoverage =
    lookbackMs *
    0.90;

  return {
    ready:
      ageMs >=
      minimumCoverage,

    changePct:
      percentChange(
        reference.price,
        current
      ),

    referencePrice:
      reference.price,

    referenceTimestamp:
      reference.timestamp,

    ageMs,
  };
}


/* ============================================================
   NET PROFIT PER GROSS UNIT

   Gross purchased unit
      ↓ BUY FEE
   Tradeable unit
      ↓ SELL FEE
   Net sell unit

   NOTE:
   Current BUY_FEE / SELL_FEE are retained
   for legacy calculations.

   Real Auto Trade later will use the
   applicable account fee information.
============================================================ */

function calculateNetProfitPerGrossUnit({
  entryPrice,
  sellPrice,
}) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const sell =
    safeNumber(
      sellPrice,
      0
    );

  if (
    entry <=
      0 ||
    sell <=
      0
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
    sell *
    sellableUnitFactor;

  const netProfitPerGrossUnit =
    netSellValuePerGrossUnit -
    entry;

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
   TRADE AFTER FEES

   Used by:
   - Scalping plan
   - GRT HOLD
   - Active trades
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

  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const sell =
    safeNumber(
      sellPrice,
      0
    );

  if (
    grossQuantity <=
      0 ||
    entry <=
      0 ||
    sell <=
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
    entry;

  const sellFeeUnit =
    netTradeUnit *
    SELL_FEE;

  const netSellUnit =
    netTradeUnit -
    sellFeeUnit;

  const netSellValue =
    netSellUnit *
    sell;

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
   BREAK EVEN PRICE AFTER FEES
============================================================ */

function calculateBreakEvenPrice(
  entryPrice
) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  if (
    entry <=
    0
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

  if (
    sellableUnitFactor <=
    0
  ) {
    return null;
  }

  return (
    entry /
    sellableUnitFactor
  );
}


/* ============================================================
   QUANTITY REQUIRED FOR TARGET NET PROFIT
============================================================ */

function calculateQuantityForTargetProfit({
  entryPrice,
  sellPrice,
  targetProfit,
}) {
  const target =
    safeNumber(
      targetProfit,
      0
    );

  if (
    target <=
    0
  ) {
    return null;
  }

  const unit =
    calculateNetProfitPerGrossUnit({
      entryPrice,
      sellPrice,
    });

  if (
    !unit ||
    !unit.profitable ||
    unit.netProfitPerGrossUnit <=
      0
  ) {
    return null;
  }

  const quantity =
    Math.ceil(
      target /
      unit.netProfitPerGrossUnit
    );

  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity <=
    0
  ) {
    return null;
  }

  return {
    quantity,

    netProfitPerGrossUnit:
      unit.netProfitPerGrossUnit,

    sellableUnitFactor:
      unit.sellableUnitFactor,
  };
}


/* ============================================================
   TELEGRAM SEND HELPERS
============================================================ */

async function sendTelegram(
  text,
  options = {}
) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      `${SERVICE_CODE}

${text}`,
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
      `${SERVICE_CODE}

${text}`,
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
   END PART 2
==============================================================*/
/* ============================================================
   PART 3 — EXECUTED FLOW + MARKET STRUCTURE

   PURPOSE:
   - Executed buy / sell flow
   - Price response
   - 2H market context
   - Orderbook liquidity
   - Support / resistance
   - Wall rating
   - Market direction
   - Structure snapshot
   - Generic execution snapshot

   IMPORTANT:
   PART 3 does NOT decide GRT BUY NOW.
   GRT final momentum decision will live in PART 4.
============================================================ */


/* ============================================================
   EXECUTED FLOW SUMMARY
============================================================ */

function getExecutedFlowSummary(
  coin,
  windowMs
) {
  const trades =
    getTradesInWindow(
      coin,
      windowMs
    );

  if (
    !trades.length
  ) {
    return {
      coin,

      ready:
        false,

      totalCount:
        0,

      buyCount:
        0,

      sellCount:
        0,

      buyVolume:
        0,

      sellVolume:
        0,

      totalVolume:
        0,

      buyVolumePct:
        50,

      sellVolumePct:
        50,

      buyFrequencyPct:
        50,

      sellFrequencyPct:
        50,
    };
  }

  let buyCount =
    0;

  let sellCount =
    0;

  let buyVolume =
    0;

  let sellVolume =
    0;

  for (
    const trade of
    trades
  ) {
    if (
      trade.isBuy
    ) {
      buyCount++;

      buyVolume +=
        safeNumber(
          trade.volume,
          0
        );
    } else {
      sellCount++;

      sellVolume +=
        safeNumber(
          trade.volume,
          0
        );
    }
  }

  const totalCount =
    buyCount +
    sellCount;

  const totalVolume =
    buyVolume +
    sellVolume;

  const buyVolumePct =
    totalVolume >
    0
      ? (
          buyVolume /
          totalVolume
        ) *
        100
      : 50;

  const sellVolumePct =
    totalVolume >
    0
      ? (
          sellVolume /
          totalVolume
        ) *
        100
      : 50;

  const buyFrequencyPct =
    totalCount >
    0
      ? (
          buyCount /
          totalCount
        ) *
        100
      : 50;

  const sellFrequencyPct =
    totalCount >
    0
      ? (
          sellCount /
          totalCount
        ) *
        100
      : 50;

  return {
    coin,

    ready:
      true,

    totalCount,

    buyCount,

    sellCount,

    buyVolume,

    sellVolume,

    totalVolume,

    buyVolumePct,

    sellVolumePct,

    buyFrequencyPct,

    sellFrequencyPct,
  };
}


/* ============================================================
   EXECUTED PRICE RESPONSE
============================================================ */

function getExecutedPriceResponse(
  coin,
  windowMs
) {
  const trades =
    getTradesInWindow(
      coin,
      windowMs
    );

  if (
    trades.length <
    2
  ) {
    return {
      coin,

      ready:
        false,

      changePct:
        0,

      firstPrice:
        null,

      lastPrice:
        null,

      high:
        null,

      low:
        null,

      totalTrades:
        trades.length,
    };
  }

  const first =
    trades[
      0
    ];

  const last =
    trades[
      trades.length -
      1
    ];

  const prices =
    trades
      .map(
        (trade) =>
          safeNumber(
            trade.price,
            0
          )
      )
      .filter(
        (price) =>
          price >
          0
      );

  if (
    !prices.length
  ) {
    return {
      coin,

      ready:
        false,

      changePct:
        0,

      firstPrice:
        null,

      lastPrice:
        null,

      high:
        null,

      low:
        null,

      totalTrades:
        trades.length,
    };
  }

  const firstPrice =
    safeNumber(
      first.price,
      0
    );

  const lastPrice =
    safeNumber(
      last.price,
      0
    );

  return {
    coin,

    ready:
      firstPrice >
        0 &&
      lastPrice >
        0,

    changePct:
      percentChange(
        firstPrice,
        lastPrice
      ),

    firstPrice,

    lastPrice,

    high:
      Math.max(
        ...prices
      ),

    low:
      Math.min(
        ...prices
      ),

    totalTrades:
      trades.length,

    windowMs,
  };
}


/* ============================================================
   PRESSURE LABEL
============================================================ */

function getPressureLabel(
  buyPct,
  sellPct
) {
  const buy =
    safeNumber(
      buyPct,
      50
    );

  const sell =
    safeNumber(
      sellPct,
      50
    );

  if (
    buy >=
      65 &&
    buy >
      sell
  ) {
    return "BUY_STRONG";
  }

  if (
    buy >=
      55 &&
    buy >
      sell
  ) {
    return "BUY";
  }

  if (
    sell >=
      65 &&
    sell >
      buy
  ) {
    return "SELL_STRONG";
  }

  if (
    sell >=
      55 &&
    sell >
      buy
  ) {
    return "SELL";
  }

  return "BALANCED";
}


/* ============================================================
   DISPLAY PRESSURE
============================================================ */

function formatPressure(
  pressure
) {
  switch (
    pressure
  ) {
    case "BUY_STRONG":
      return "TEKANAN BELI KUAT";

    case "BUY":
      return "TEKANAN BELI";

    case "SELL_STRONG":
      return "TEKANAN JUAL KUAT";

    case "SELL":
      return "TEKANAN JUAL";

    default:
      return "SEIMBANG";
  }
}


/* ============================================================
   SIMPLE MARKET DIRECTION
============================================================ */

function getMarketDirection(
  changePct
) {
  const change =
    safeNumber(
      changePct,
      0
    );

  if (
    change >=
    1.00
  ) {
    return "NAIK_KUAT";
  }

  if (
    change >=
    0.20
  ) {
    return "NAIK";
  }

  if (
    change <=
    -1.00
  ) {
    return "TURUN_KUAT";
  }

  if (
    change <=
    -0.20
  ) {
    return "TURUN";
  }

  return "SIDEWAY";
}


/* ============================================================
   FORMAT MARKET DIRECTION
============================================================ */

function formatMarketDirection(
  direction
) {
  switch (
    direction
  ) {
    case "NAIK_KUAT":
      return "SEDANG NAIK KUAT";

    case "NAIK":
      return "SEDANG NAIK";

    case "TURUN_KUAT":
      return "SEDANG TURUN KUAT";

    case "TURUN":
      return "SEDANG TURUN";

    default:
      return "SIDEWAY";
  }
}


/* ============================================================
   2H MARKET CONDITION
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

  const oldestTrade =
    trades.length
      ? trades[
          0
        ]
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

  const coverageMinutes =
    coverageMs /
    60000;

  const coverageReady =
    coverageMs >=
    TWO_HOUR_MIN_COVERAGE_MS;

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

  const pressure =
    getPressureLabel(
      buyVolumePct,
      sellVolumePct
    );

  return {
    coin,

    ready:
      Boolean(
        coverageReady &&
        flowReady &&
        priceReady
      ),

    coverageReady,

    coverageMs,

    coverageMinutes,

    totalTrades:
      trades.length,

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
      Date.now(),
  };
}


/* ============================================================
   ORDERBOOK TOTAL VOLUME
============================================================ */

function getOrderBookTotalVolume(
  levels
) {
  if (
    !Array.isArray(
      levels
    )
  ) {
    return 0;
  }

  return levels.reduce(
    (
      sum,
      level
    ) =>
      sum +
      safeNumber(
        level.volume,
        0
      ),
    0
  );
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

  return levels.filter(
    (level) => {
      const price =
        safeNumber(
          level.price,
          0
        );

      if (
        price <=
        0
      ) {
        return false;
      }

      const distancePct =
        Math.abs(
          percentChange(
            currentPrice,
            price
          )
        );

      if (
        distancePct >
        rangePct
      ) {
        return false;
      }

      if (
        side ===
        "BID"
      ) {
        return (
          price <=
          currentPrice
        );
      }

      return (
        price >=
        currentPrice
      );
    }
  );
}


/* ============================================================
   CLUSTER ORDERBOOK LEVELS
============================================================ */

function clusterOrderBookLevels(
  levels,
  clusterPct
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
    [...levels].sort(
      (
        a,
        b
      ) =>
        a.price -
        b.price
    );

  const clusters =
    [];

  let current =
    null;

  for (
    const level of
    sorted
  ) {
    if (
      !current
    ) {
      current = {
        minPrice:
          level.price,

        maxPrice:
          level.price,

        weightedPrice:
          level.price *
          level.volume,

        volume:
          level.volume,

        count:
          1,
      };

      continue;
    }

    const centerPrice =
      current.volume >
        0
        ? current.weightedPrice /
          current.volume
        : current.maxPrice;

    const distance =
      Math.abs(
        percentChange(
          centerPrice,
          level.price
        )
      );

    if (
      distance <=
      clusterPct
    ) {
      current.minPrice =
        Math.min(
          current.minPrice,
          level.price
        );

      current.maxPrice =
        Math.max(
          current.maxPrice,
          level.price
        );

      current.weightedPrice +=
        level.price *
        level.volume;

      current.volume +=
        level.volume;

      current.count++;
    } else {
      clusters.push(
        current
      );

      current = {
        minPrice:
          level.price,

        maxPrice:
          level.price,

        weightedPrice:
          level.price *
          level.volume,

        volume:
          level.volume,

        count:
          1,
      };
    }
  }

  if (
    current
  ) {
    clusters.push(
      current
    );
  }

  return clusters.map(
    (cluster) => ({
      price:
        cluster.volume >
          0
          ? cluster.weightedPrice /
            cluster.volume
          : cluster.maxPrice,

      volume:
        cluster.volume,

      count:
        cluster.count,

      minPrice:
        cluster.minPrice,

      maxPrice:
        cluster.maxPrice,
    })
  );
}


/* ============================================================
   WALL RATING
============================================================ */

function rateOrderBookWall({
  wall,
  averageVolume,
  currentPrice,
}) {
  if (
    !wall ||
    currentPrice <=
    0
  ) {
    return 0;
  }

  const volume =
    safeNumber(
      wall.volume,
      0
    );

  const avg =
    safeNumber(
      averageVolume,
      0
    );

  const relativeRatio =
    avg >
      0
      ? volume /
        avg
      : 1;

  const distancePct =
    Math.abs(
      percentChange(
        currentPrice,
        wall.price
      )
    );

  const volumeScore =
    clamp(
      relativeRatio *
        2,
      1,
      8
    );

  const distanceBoost =
    clamp(
      2 -
        distancePct *
          WALL_DISTANCE_WEIGHT,
      0,
      2
    );

  return Math.round(
    clamp(
      volumeScore +
        distanceBoost,
      1,
      10
    )
  );
}


/* ============================================================
   WALL STRENGTH
============================================================ */

function getWallStrength(
  rating
) {
  const value =
    safeNumber(
      rating,
      0
    );

  if (
    value >=
    7
  ) {
    return "STRONG";
  }

  if (
    value >=
    4
  ) {
    return "MEDIUM";
  }

  return "WEAK";
}


/* ============================================================
   FIND BEST SUPPORT / RESISTANCE WALL
============================================================ */

function findBestWall({
  levels,
  currentPrice,
  coin,
  side,
}) {
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
    safeNumber(
      ORDERBOOK_STRUCTURE_RANGE_PCT[
        coin
      ],
      3
    );

  const clusterPct =
    safeNumber(
      ORDERBOOK_CLUSTER_PCT[
        coin
      ],
      0.15
    );

  const ranged =
    filterOrderBookRange(
      levels,
      currentPrice,
      rangePct,
      side
    );

  if (
    !ranged.length
  ) {
    return null;
  }

  const clusters =
    clusterOrderBookLevels(
      ranged,
      clusterPct
    );

  if (
    !clusters.length
  ) {
    return null;
  }

  const averageVolume =
    average(
      clusters.map(
        (wall) =>
          wall.volume
      )
    );

  const rated =
    clusters
      .map(
        (wall) => {
          const rating =
            rateOrderBookWall({
              wall,
              averageVolume,
              currentPrice,
            });

          const relativeRatio =
            averageVolume >
              0
              ? wall.volume /
                averageVolume
              : 1;

          const distancePct =
            Math.abs(
              percentChange(
                currentPrice,
                wall.price
              )
            );

          return {
            ...wall,

            rating,

            strength:
              getWallStrength(
                rating
              ),

            relativeRatio,

            distancePct,
          };
        }
      )
      .filter(
        (wall) =>
          wall.relativeRatio >=
          MIN_WALL_RELATIVE_RATIO
      );

  if (
    !rated.length
  ) {
    const fallback =
      clusters
        .map(
          (wall) => ({
            ...wall,

            rating:
              rateOrderBookWall({
                wall,
                averageVolume,
                currentPrice,
              }),

            relativeRatio:
              averageVolume >
                0
                ? wall.volume /
                  averageVolume
                : 1,

            distancePct:
              Math.abs(
                percentChange(
                  currentPrice,
                  wall.price
                )
              ),
          }))
        .sort(
          (
            a,
            b
          ) =>
            b.rating -
            a.rating
        )[0];

    if (
      !fallback
    ) {
      return null;
    }

    return {
      ...fallback,

      strength:
        getWallStrength(
          fallback.rating
        ),
    };
  }

  rated.sort(
    (
      a,
      b
    ) => {
      if (
        b.rating !==
        a.rating
      ) {
        return (
          b.rating -
          a.rating
        );
      }

      return (
        a.distancePct -
        b.distancePct
      );
    }
  );

  return rated[
    0
  ];
}


/* ============================================================
   LIQUIDITY ANALYSIS
============================================================ */

async function getLiquidityAnalysis(
  coin,
  currentPrice
) {
  const orderBook =
    await getOrderBook(
      coin
    );

  if (
    !orderBook
  ) {
    return {
      coin,

      ready:
        false,

      support:
        null,

      resistance:
        null,

      bidLiquidityPct:
        50,

      askLiquidityPct:
        50,
    };
  }

  const rangePct =
    safeNumber(
      ORDERBOOK_STRUCTURE_RANGE_PCT[
        coin
      ],
      3
    );

  const nearbyBids =
    filterOrderBookRange(
      orderBook.bids,
      currentPrice,
      rangePct,
      "BID"
    );

  const nearbyAsks =
    filterOrderBookRange(
      orderBook.asks,
      currentPrice,
      rangePct,
      "ASK"
    );

  const bidVolume =
    getOrderBookTotalVolume(
      nearbyBids
    );

  const askVolume =
    getOrderBookTotalVolume(
      nearbyAsks
    );

  const totalLiquidity =
    bidVolume +
    askVolume;

  const bidLiquidityPct =
    totalLiquidity >
      0
      ? (
          bidVolume /
          totalLiquidity
        ) *
        100
      : 50;

  const askLiquidityPct =
    totalLiquidity >
      0
      ? (
          askVolume /
          totalLiquidity
        ) *
        100
      : 50;

  const support =
    findBestWall({
      levels:
        orderBook.bids,

      currentPrice,

      coin,

      side:
        "BID",
    });

  const resistance =
    findBestWall({
      levels:
        orderBook.asks,

      currentPrice,

      coin,

      side:
        "ASK",
    });

  const resistanceBlocking =
    Boolean(
      resistance &&
      resistance.rating >=
        GRT_STRONG_RESISTANCE_MIN_RATING &&
      resistance.distancePct <=
        0.75
    );

  return {
    coin,

    ready:
      true,

    orderBook,

    bidVolume,

    askVolume,

    bidLiquidityPct,

    askLiquidityPct,

    support,

    resistance,

    resistanceBlocking,
  };
}


/* ============================================================
   GRT LIQUIDITY WRAPPER
============================================================ */

async function getGRTLiquidityAnalysis(
  currentPrice
) {
  return getLiquidityAnalysis(
    "GRT",
    currentPrice
  );
}


/* ============================================================
   RESISTANCE RATING HELPER
============================================================ */

function getResistanceRating(
  resistance
) {
  if (
    !resistance
  ) {
    return 0;
  }

  const direct =
    safeNumber(
      resistance.rating,
      NaN
    );

  if (
    Number.isFinite(
      direct
    )
  ) {
    return clamp(
      Math.round(
        direct
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
   MARKET STRUCTURE SNAPSHOT
============================================================ */

async function getMarketStructureSnapshot(
  coin,
  suppliedPrice =
    null
) {
  let currentPrice =
    safeNumber(
      suppliedPrice,
      0
    );

  let ticker =
    null;

  if (
    currentPrice <=
    0
  ) {
    ticker =
      await getTicker(
        coin
      );

    currentPrice =
      safeNumber(
        ticker
          ?.currentPrice,
        0
      );
  }

  if (
    currentPrice <=
    0
  ) {
    return null;
  }

  const [
    liquidity,
    flow,
  ] =
    await Promise.all([
      getLiquidityAnalysis(
        coin,
        currentPrice
      ),

      Promise.resolve(
        getExecutedFlowSummary(
          coin,
          FIVE_MINUTES
        )
      ),
    ]);

  const snapshot15m =
    getPriceSnapshot(
      coin,
      FIFTEEN_MINUTES
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      ONE_HOUR
    );

  const change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change,
          0
        )
      : 0;

  const marketDirection =
    getMarketDirection(
      change15m
    );

  const pressure =
    getPressureLabel(
      flow?.buyVolumePct,
      flow?.sellVolumePct
    );

  return {
    coin,

    currentPrice,

    ticker,

    flow,

    snapshot15m,

    snapshot60m,

    direction:
      marketDirection,

    directionText:
      formatMarketDirection(
        marketDirection
      ),

    pressure,

    pressureText:
      formatPressure(
        pressure
      ),

    support:
      liquidity
        ?.support ||
      null,

    resistance:
      liquidity
        ?.resistance ||
      null,

    bidLiquidityPct:
      liquidity
        ?.bidLiquidityPct ??
      50,

    askLiquidityPct:
      liquidity
        ?.askLiquidityPct ??
      50,

    liquidityReady:
      Boolean(
        liquidity
          ?.ready
      ),
  };
}


/* ============================================================
   EXECUTION STRUCTURE SNAPSHOT
============================================================ */

async function getExecutionStructureSnapshot(
  coin,
  currentPrice =
    null
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
      FIVE_MINUTES
    );

  const priceResponse =
    getExecutedPriceResponse(
      coin,
      FIVE_MINUTES
    );

  const snapshot15m =
    getPriceSnapshot(
      coin,
      FIFTEEN_MINUTES
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      ONE_HOUR
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
      MEANINGFUL_RESISTANCE_MIN_RATING &&
    safeNumber(
      resistance.relativeRatio,
      0
    ) >=
      MEANINGFUL_RESISTANCE_MIN_RATIO
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

    pressureText:
      formatPressure(
        pressure
      ),

    direction,

    directionText:
      formatMarketDirection(
        direction
      ),

    support,

    resistance,

    supportPrice,

    resistancePrice,

    meaningfulResistancePrice,
  };
}


/* ============================================================
   MARKET STRUCTURE SECTION
============================================================ */

function buildMarketStructureSection(
  data
) {
  if (
    !data
  ) {
    return null;
  }

  const coin =
    data.coin;

  const icon =
    coin ===
    "BTC"
      ? "₿"
      : "🪙";

  const support =
    data.support;

  const resistance =
    data.resistance;

  const supportText =
    support
      ? `RM${formatPrice(
          coin,
          support.price
        )} — ${getResistanceRating(
          support
        )}/10`
      : "N/A";

  const resistanceText =
    resistance
      ? `RM${formatPrice(
          coin,
          resistance.price
        )} — ${getResistanceRating(
          resistance
        )}/10${
          resistance.strength ===
          "STRONG"
            ? " (STRONG)"
            : ""
        }`
      : "N/A";

  return `${icon} ${coin}

💵 Harga Semasa:
RM${formatPrice(
    coin,
    data.currentPrice
  )}

🟢 Support:
${supportText}

🔴 Resistance:
${resistanceText}

📈 Market:
${data.directionText ||
  formatMarketDirection(
    data.direction
  )}

⚡ Tekanan:
${data.pressureText ||
  formatPressure(
    data.pressure
  )}`;
}


/* ============================================================
   2H FLOW TELEGRAM FORMATTER
============================================================ */

function build2HFlowSection(
  data
) {
  if (
    !data
  ) {
    return "NO DATA";
  }

  const coin =
    data.coin;

  const icon =
    coin ===
    "BTC"
      ? "₿"
      : "🪙";

  const directionText =
    String(
      data.direction ||
      "SIDEWAY"
    )
      .replace(
        /_/g,
        " "
      );

  const pressureText =
    String(
      data.pressure ||
      "BALANCED"
    )
      .replace(
        /_/g,
        " "
      );

  const coverageText =
    data.coverageReady
      ? "READY"
      : "BUILDING";

  return `${icon} ${coin}

📊 Trades:
${safeNumber(
    data.totalTrades,
    0
  )}

🟢 Buy Volume:
${formatPercent(
    data.buyVolumePct
  )}

🔴 Sell Volume:
${formatPercent(
    data.sellVolumePct
  )}

🟢 Buy Frequency:
${formatPercent(
    data.buyFrequencyPct
  )}

🔴 Sell Frequency:
${formatPercent(
    data.sellFrequencyPct
  )}

📈 Change:
${formatPercent(
    data.changePct
  )}

🧭 Direction:
${directionText}

⚡ Pressure:
${pressureText}

🗂 Data:
${coverageText}`;
}


/* ============================================================
   END PART 3
============================================================*/
/* ============================================================
   PART 4 — GRT MOMENTUM ENGINE

   PURPOSE:
   - Fast GRT direction
   - SIDEWAY classification
   - 5M / 15M / 30M momentum
   - Accumulation
   - Early momentum
   - Acceleration
   - Early reversal detection
   - BTC context
   - 2H confirmation boost
   - Validation
   - Final BUY NOW / DON'T BUY

   IMPORTANT:
   BUY NOW = momentum decision only.

   Profit room does NOT block BUY NOW here.
   Practical entry quality is checked later in PART 5.
============================================================ */


/* ============================================================
   GRT MOMENTUM CONFIG
============================================================ */

const GRT_EARLY_MIN_BUY_VOLUME_PCT = 52;
const GRT_EARLY_MIN_PRICE_RESPONSE_PCT = 0.03;

const GRT_SUSTAINED_MIN_BUY_VOLUME_PCT = 54;
const GRT_SUSTAINED_MIN_BUY_FREQUENCY_PCT = 54;

const GRT_SUSTAINED_15M_MOVE_PCT = 0.45;
const GRT_SUSTAINED_30M_MOVE_PCT = 0.75;

const GRT_ACCELERATION_5M_MOVE_PCT = 0.55;
const GRT_ACCELERATION_15M_MOVE_PCT = 1.00;
const GRT_ACCELERATION_30M_MOVE_PCT = 1.50;

const GRT_VALIDATION_MAX_MS =
  10 *
  60 *
  1000;

const GRT_FAST_REEVALUATE_30M_MOVE_PCT =
  1.00;


/* ============================================================
   EARLY REVERSAL CONFIG
============================================================ */

const GRT_EARLY_REVERSAL_MIN_5M_PCT =
  0.30;

const GRT_EARLY_REVERSAL_MIN_BUY_VOLUME_PCT =
  54;

const GRT_EARLY_REVERSAL_MIN_BUY_FREQUENCY_PCT =
  50;

const GRT_EARLY_REVERSAL_MIN_PRICE_RESPONSE_PCT =
  0.03;

const GRT_EARLY_REVERSAL_MIN_SCORE =
  6;


/* ============================================================
   2H EARLY CONFIRMATION BOOST
============================================================ */

const GRT_2H_BOOST_MIN_TRADES =
  12;

const GRT_2H_BOOST_MIN_BUY_VOLUME_PCT =
  65;

const GRT_2H_BOOST_MIN_BUY_FREQUENCY_PCT =
  55;


/* ============================================================
   BTC BUY SURGE CONFIG
============================================================ */

const BTC_BUY_SURGE_MIN_BUY_PCT =
  55;

const BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT =
  0.03;

const BTC_BUY_SURGE_CONFIRM_MIN_AGE_SEC =
  120;


/* ============================================================
   GRT PRICE HISTORY
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

  const cutoff =
    now -
    35 *
      60 *
      1000;

  GRT_MOMENTUM_RUNTIME
    .recentPrices =
    history.filter(
      (item) =>
        item.timestamp >=
        cutoff
    );
}


/* ============================================================
   GRT REFERENCE PRICE
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
    null;

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

  return (
    selected ||
    history[
      0
    ]
  );
}


/* ============================================================
   GRT LOCAL LOW
============================================================ */

function getGRTRecentLocalLow(
  windowMs =
    FIVE_MINUTES
) {
  const cutoff =
    Date.now() -
    windowMs;

  const points =
    GRT_MOMENTUM_RUNTIME
      .recentPrices
      .filter(
        (item) =>
          item.timestamp >=
          cutoff
      );

  if (
    !points.length
  ) {
    return null;
  }

  let low =
    points[
      0
    ];

  for (
    const item of
    points
  ) {
    if (
      item.price <
      low.price
    ) {
      low =
        item;
    }
  }

  return low;
}


/* ============================================================
   GRT DIRECTION FORMAT
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

    case "SIDEWAY":
      return "➖ SIDEWAY";

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

      directionText:
        "",

      change5m:
        0,

      change15m:
        0,
    };
  }

  const ref5m =
    getGRTReferencePrice(
      FIVE_MINUTES
    );

  const ref15m =
    getGRTReferencePrice(
      FIFTEEN_MINUTES
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

      directionText:
        formatGRTDirection(
          GRT_MOMENTUM_RUNTIME
            .lastDirection
        ),

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

  let direction =
    "SIDEWAY";

  if (
    change5m >=
    GRT_DIRECTION_FAST_UP_5M_PCT
  ) {
    direction =
      "NAIK_LAJU";
  } else if (
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
  } else if (
    change5m <=
    GRT_DIRECTION_ACTIVE_DROP_5M_PCT
  ) {
    direction =
      "MASIH_DROP";
  } else if (
    change5m <
    0
  ) {
    direction =
      "DROP_PERLAHAN";
  } else {
    direction =
      "SIDEWAY";
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
   SUSTAINED MOVE
============================================================ */

function getGRTSustainedMove(
  currentPrice
) {
  updateGRTMomentumPriceHistory(
    currentPrice
  );

  const ref5m =
    getGRTReferencePrice(
      FIVE_MINUTES
    );

  const ref15m =
    getGRTReferencePrice(
      FIFTEEN_MINUTES
    );

  const ref30m =
    getGRTReferencePrice(
      THIRTY_MINUTES
    );

  if (
    !ref5m
  ) {
    return {
      ready:
        false,

      change5m:
        0,

      change15m:
        0,

      change30m:
        0,

      sustained:
        false,

      accelerating:
        false,

      momentum15mActive:
        false,

      momentum15mStrong:
        false,

      fastReevaluate:
        false,
    };
  }

  const change5m =
    percentChange(
      ref5m.price,
      currentPrice
    );

  const change15m =
    ref15m
      ? percentChange(
          ref15m.price,
          currentPrice
        )
      : change5m;

  const change30m =
    ref30m
      ? percentChange(
          ref30m.price,
          currentPrice
        )
      : change15m;

  const momentum15mActive =
    change15m >=
    GRT_SUSTAINED_15M_MOVE_PCT;

  const momentum15mStrong =
    change15m >=
    GRT_ACCELERATION_15M_MOVE_PCT;

  const sustained =
    Boolean(
      momentum15mActive &&
      change30m >=
        GRT_SUSTAINED_30M_MOVE_PCT
    );

  const accelerating =
    Boolean(
      change5m >=
        GRT_ACCELERATION_5M_MOVE_PCT ||
      (
        change15m >=
          GRT_ACCELERATION_15M_MOVE_PCT &&
        change30m >=
          GRT_ACCELERATION_30M_MOVE_PCT
      )
    );

  const fastReevaluate =
    change30m >=
    GRT_FAST_REEVALUATE_30M_MOVE_PCT;

  return {
    ready:
      true,

    change5m,

    change15m,

    change30m,

    momentum15mActive,

    momentum15mStrong,

    sustained,

    accelerating,

    fastReevaluate,
  };
}


/* ============================================================
   MERGE DIRECTION + SUSTAINED MOMENTUM
============================================================ */

function mergeGRTDirectionWithMomentum(
  fastDirection,
  sustainedMove
) {
  let direction =
    fastDirection
      ?.direction ||
    "UNKNOWN";

  if (
    sustainedMove
      ?.momentum15mStrong &&
    (
      direction ===
        "SIDEWAY" ||
      direction ===
        "DROP_PERLAHAN"
    ) &&
    sustainedMove.change5m >=
      -0.05
  ) {
    direction =
      "NAIK_PERLAHAN";
  }

  if (
    sustainedMove
      ?.accelerating &&
    sustainedMove.change5m >
      0
  ) {
    direction =
      "NAIK_LAJU";
  }

  return {
    direction,

    directionText:
      formatGRTDirection(
        direction
      ),
  };
}


/* ============================================================
   BUY VOLUME BASELINE
============================================================ */

function getBuyVolumeBaseline(
  coin
) {
  const current =
    getExecutedFlowSummary(
      coin,
      FIVE_MINUTES
    );

  const tenMinuteTrades =
    getTradesInWindow(
      coin,
      10 *
        60 *
        1000
    );

  const cutoffCurrent =
    Date.now() -
    FIVE_MINUTES;

  const previousTrades =
    tenMinuteTrades.filter(
      (trade) =>
        trade.timestamp <
        cutoffCurrent
    );

  let previousBuyVolume =
    0;

  let previousSellVolume =
    0;

  let previousBuyCount =
    0;

  let previousSellCount =
    0;

  for (
    const trade of
    previousTrades
  ) {
    if (
      trade.isBuy
    ) {
      previousBuyVolume +=
        trade.volume;

      previousBuyCount++;
    } else {
      previousSellVolume +=
        trade.volume;

      previousSellCount++;
    }
  }

  const previousTotalVolume =
    previousBuyVolume +
    previousSellVolume;

  const previousBuyVolumePct =
    previousTotalVolume >
      0
      ? (
          previousBuyVolume /
          previousTotalVolume
        ) *
        100
      : 50;

  const buyIncreasePct =
    previousBuyVolume >
      0
      ? (
          (
            current.buyVolume -
            previousBuyVolume
          ) /
          previousBuyVolume
        ) *
          100
      : current.buyVolume >
          0
        ? 100
        : 0;

  return {
    ready:
      Boolean(
        current.totalCount >
        0
      ),

    current,

    previous: {
      buyVolume:
        previousBuyVolume,

      sellVolume:
        previousSellVolume,

      buyCount:
        previousBuyCount,

      sellCount:
        previousSellCount,

      buyVolumePct:
        previousBuyVolumePct,
    },

    buyIncreasePct,
  };
}


/* ============================================================
   GRT TREND PERMISSION
============================================================ */

async function getGRTTrendPermission() {
  const candles =
    await getLunoCandles(
      "GRT",
      MOMENTUM_CANDLE_DURATION_SEC,
      60
    );

  const completed =
    getCompletedCandles(
      candles,
      MOMENTUM_CANDLE_DURATION_SEC
    );

  if (
    completed.length <
    GRT_MA_SLOW
  ) {
    return {
      ready:
        false,

      hardBearish:
        false,

      ma9:
        null,

      ma50:
        null,

      nearCross:
        false,
    };
  }

  const closes =
    completed.map(
      (candle) =>
        candle.close
    );

  const recent9 =
    closes.slice(
      -GRT_MA_FAST
    );

  const recent50 =
    closes.slice(
      -GRT_MA_SLOW
    );

  const ma9 =
    average(
      recent9
    );

  const ma50 =
    average(
      recent50
    );

  const latest =
    closes[
      closes.length -
      1
    ];

  const gapPct =
    ma50 >
      0
      ? percentChange(
          ma50,
          ma9
        )
      : 0;

  const nearCross =
    Math.abs(
      gapPct
    ) <=
    GRT_MA_NEAR_CROSS_PCT;

  const hardBearish =
    Boolean(
      latest <
        ma9 &&
      ma9 <
        ma50 &&
      gapPct <=
        -0.50
    );

  return {
    ready:
      true,

    latest,

    ma9,

    ma50,

    gapPct,

    nearCross,

    bullish:
      ma9 >=
      ma50,

    hardBearish,
  };
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

  const sample =
    closes.slice(
      -(
        period +
        1
      )
    );

  let gains =
    0;

  let losses =
    0;

  for (
    let i = 1;
    i <
    sample.length;
    i++
  ) {
    const change =
      sample[
        i
      ] -
      sample[
        i -
          1
      ];

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

  const avgGain =
    gains /
    period;

  const avgLoss =
    losses /
    period;

  if (
    avgLoss ===
    0
  ) {
    return 100;
  }

  const rs =
    avgGain /
    avgLoss;

  return (
    100 -
    (
      100 /
      (
        1 +
        rs
      )
    )
  );
}


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

  const closes =
    completed.map(
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

  if (
    current ===
      null ||
    previous ===
      null
  ) {
    return {
      ready:
        false,
    };
  }

  const change =
    current -
    previous;

  return {
    ready:
      true,

    current,

    previous,

    change,

    direction:
      change >=
        1
        ? "RISING"
        : change <=
            -1
          ? "FALLING"
          : "FLAT",

    oversold:
      current <=
      30,

    overbought:
      current >=
      70,
  };
}


/* ============================================================
   ACCUMULATION DETECTOR
============================================================ */

function detectGRTAccumulation(
  baseline,
  liquidity,
  sustainedMove
) {
  if (
    !baseline
      ?.ready
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
      baseline
        .buyIncreasePct,
      -100
    );

  const buyVolumePct =
    safeNumber(
      current
        .buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      current
        .buyFrequencyPct,
      0
    );

  let score =
    0;

  if (
    buyIncreasePct >=
    10
  ) {
    score++;
  }

  if (
    buyIncreasePct >=
    25
  ) {
    score++;
  }

  if (
    buyVolumePct >=
    52
  ) {
    score++;
  }

  if (
    buyVolumePct >=
    58
  ) {
    score++;
  }

  if (
    buyFrequencyPct >=
    52
  ) {
    score++;
  }

  if (
    liquidity
      ?.ready &&
    liquidity
      .bidLiquidityPct >=
      52
  ) {
    score++;
  }

  if (
    sustainedMove
      ?.ready &&
    sustainedMove
      .change5m >
      0
  ) {
    score++;
  }

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score++;
  }

  return {
    detected:
      Boolean(
        score >=
          4 &&
        buyVolumePct >=
          52
      ),

    score,

    buyIncreasePct,

    buyVolumePct,

    buyFrequencyPct,
  };
}


/* ============================================================
   EARLY MOMENTUM
============================================================ */

function detectGRTEarlyMomentum({
  baseline,
  priceResponse,
  trend,
  liquidity,
  sustainedMove,
}) {
  if (
    !baseline
      ?.ready
  ) {
    return {
      detected:
        false,

      score:
        0,
    };
  }

  const buyVolumePct =
    safeNumber(
      baseline
        .current
        .buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      baseline
        .current
        .buyFrequencyPct,
      0
    );

  const responsePct =
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  let score =
    0;

  if (
    buyVolumePct >=
    GRT_EARLY_MIN_BUY_VOLUME_PCT
  ) {
    score +=
      2;
  }

  if (
    buyFrequencyPct >=
    50
  ) {
    score++;
  }

  if (
    responsePct >=
    GRT_EARLY_MIN_PRICE_RESPONSE_PCT
  ) {
    score +=
      2;
  }

  if (
    sustainedMove
      ?.change5m >
    0
  ) {
    score++;
  }

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score++;
  }

  if (
    trend
      ?.ready &&
    (
      trend.bullish ||
      trend.nearCross
    )
  ) {
    score++;
  }

  if (
    liquidity
      ?.ready &&
    liquidity
      .bidLiquidityPct >=
      50
  ) {
    score++;
  }

  return {
    detected:
      Boolean(
        score >=
        5
      ),

    score,

    buyVolumePct,

    buyFrequencyPct,

    responsePct,
  };
}


/* ============================================================
   ACCELERATION
============================================================ */

function detectGRTAcceleration({
  baseline,
  priceResponse,
  sustainedMove,
}) {
  const buyVolumePct =
    safeNumber(
      baseline
        ?.current
        ?.buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      baseline
        ?.current
        ?.buyFrequencyPct,
      0
    );

  const responsePct =
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  let score =
    0;

  if (
    sustainedMove
      ?.change5m >=
      GRT_ACCELERATION_5M_MOVE_PCT
  ) {
    score +=
      3;
  }

  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      2;
  }

  if (
    buyVolumePct >=
    58
  ) {
    score +=
      2;
  }

  if (
    buyFrequencyPct >=
    52
  ) {
    score++;
  }

  if (
    responsePct >
    0
  ) {
    score++;
  }

  return {
    detected:
      Boolean(
        score >=
        6
      ),

    score,

    buyVolumePct,

    buyFrequencyPct,

    responsePct,
  };
}


/* ============================================================
   MOMENTUM SCORE
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
    accumulation
      ?.detected
  ) {
    score +=
      1;
  }

  if (
    earlyMomentum
      ?.detected
  ) {
    score +=
      2;
  }

  if (
    acceleration
      ?.detected
  ) {
    score +=
      3;
  }

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score++;
  }

  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score++;
  }

  if (
    trend
      ?.ready &&
    (
      trend.bullish ||
      trend.nearCross
    )
  ) {
    score++;
  }

  if (
    liquidity
      ?.ready &&
    liquidity
      .bidLiquidityPct >
    liquidity
      .askLiquidityPct
  ) {
    score++;
  }

  if (
    priceResponse
      ?.ready &&
    priceResponse
      .changePct >
    0
  ) {
    score++;
  }

  return Math.round(
    clamp(
      score,
      0,
      10
    )
  );
}


/* ============================================================
   MOMENTUM PEAK TRACKER
============================================================ */

function updateGRTMomentumPeaks({
  score,
  baseline,
  priceResponse,
}) {
  GRT_MOMENTUM_RUNTIME
    .peakScore =
    Math.max(
      GRT_MOMENTUM_RUNTIME
        .peakScore,
      safeNumber(
        score,
        0
      )
    );

  GRT_MOMENTUM_RUNTIME
    .peakBuyVolumePct =
    Math.max(
      GRT_MOMENTUM_RUNTIME
        .peakBuyVolumePct,
      safeNumber(
        baseline
          ?.current
          ?.buyVolumePct,
        0
      )
    );

  GRT_MOMENTUM_RUNTIME
    .peakPriceResponsePct =
    Math.max(
      GRT_MOMENTUM_RUNTIME
        .peakPriceResponsePct,
      safeNumber(
        priceResponse
          ?.changePct,
        0
      )
    );
}


/* ============================================================
   BTC BUY SURGE
============================================================ */

async function getBTCBuySurge() {
  const flow =
    getExecutedFlowSummary(
      "BTC",
      FIVE_MINUTES
    );

  const response =
    getExecutedPriceResponse(
      "BTC",
      FIVE_MINUTES
    );

  if (
    !flow
      ?.ready ||
    !response
      ?.ready
  ) {
    LAST_BTC_SURGE_STATE =
      "BUY_SURGE_OFF";

    return {
      ready:
        false,

      active:
        false,

      state:
        "BUY_SURGE_OFF",
    };
  }

  const active =
    Boolean(
      flow.buyVolumePct >=
        BTC_BUY_SURGE_MIN_BUY_PCT &&
      response.changePct >=
        BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT
    );

  LAST_BTC_SURGE_STATE =
    active
      ? "BUY_SURGE_ON"
      : "BUY_SURGE_OFF";

  return {
    ready:
      true,

    active,

    state:
      LAST_BTC_SURGE_STATE,

    buyVolumePct:
      flow.buyVolumePct,

    buyFrequencyPct:
      flow.buyFrequencyPct,

    priceResponsePct:
      response.changePct,
  };
}


/* ============================================================
   VALIDATION STATE
============================================================ */

function ensureGRTValidationStarted() {
  if (
    !GRT_VALIDATION_STARTED_AT
  ) {
    GRT_VALIDATION_STARTED_AT =
      Date.now();
  }

  return getGRTValidationState();
}


function clearGRTValidation() {
  GRT_VALIDATION_STARTED_AT =
    null;
}


function getGRTValidationState() {
  if (
    !GRT_VALIDATION_STARTED_AT
  ) {
    return {
      active:
        false,

      startedAt:
        null,

      elapsedMs:
        0,

      expired:
        false,
    };
  }

  const elapsedMs =
    Date.now() -
    GRT_VALIDATION_STARTED_AT;

  return {
    active:
      true,

    startedAt:
      GRT_VALIDATION_STARTED_AT,

    elapsedMs,

    expired:
      elapsedMs >=
      GRT_VALIDATION_MAX_MS,
  };
}


/* ============================================================
   MOMENTUM PHASE
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
   LAST DECISION
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


/* ============================================================
   ENGINE READY
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
    decision.status !==
    "COLLECTING"
  ) {
    GRT_ENGINE_HAS_BEEN_READY =
      true;
  }
}


/* ============================================================
   2H CONFIRMATION BOOST
============================================================ */

function getGRT2HConfirmationBoost(
  twoHour
) {
  if (
    !twoHour ||
    !twoHour.ready ||
    twoHour.totalTrades <
      GRT_2H_BOOST_MIN_TRADES
  ) {
    return {
      active:
        false,

      scoreBoost:
        0,
    };
  }

  const bullishDirection =
    twoHour.direction ===
      "BULLISH" ||
    twoHour.direction ===
      "BULLISH_STRONG";

  const active =
    Boolean(
      bullishDirection &&
      twoHour.buyVolumePct >=
        GRT_2H_BOOST_MIN_BUY_VOLUME_PCT &&
      twoHour.buyFrequencyPct >=
        GRT_2H_BOOST_MIN_BUY_FREQUENCY_PCT
    );

  return {
    active,

    scoreBoost:
      active
        ? 2
        : 0,

    totalTrades:
      twoHour.totalTrades,

    buyVolumePct:
      twoHour.buyVolumePct,

    buyFrequencyPct:
      twoHour.buyFrequencyPct,

    direction:
      twoHour.direction,
  };
}


/* ============================================================
   EARLY REVERSAL DETECTOR
============================================================ */

function detectGRTEarlyReversal({
  currentPrice,
  direction,
  sustainedMove,
  baseline,
  priceResponse,
  liquidity,
  twoHourBoost,
}) {
  const localLow =
    getGRTRecentLocalLow(
      10 *
        60 *
        1000
    );

  if (
    !localLow
  ) {
    return {
      detected:
        false,

      score:
        0,
    };
  }

  const recoveryPct =
    percentChange(
      localLow.price,
      currentPrice
    );

  const buyVolumePct =
    safeNumber(
      baseline
        ?.current
        ?.buyVolumePct,
      0
    );

  const buyFrequencyPct =
    safeNumber(
      baseline
        ?.current
        ?.buyFrequencyPct,
      0
    );

  const responsePct =
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  let score =
    0;

  if (
    recoveryPct >=
    GRT_EARLY_REVERSAL_MIN_5M_PCT
  ) {
    score +=
      2;
  }

  if (
    direction ===
    "NAIK_LAJU"
  ) {
    score +=
      2;
  } else if (
    direction ===
    "NAIK_PERLAHAN"
  ) {
    score++;
  }

  if (
    buyVolumePct >=
    GRT_EARLY_REVERSAL_MIN_BUY_VOLUME_PCT
  ) {
    score +=
      2;
  }

  if (
    buyFrequencyPct >=
    GRT_EARLY_REVERSAL_MIN_BUY_FREQUENCY_PCT
  ) {
    score++;
  }

  if (
    responsePct >=
    GRT_EARLY_REVERSAL_MIN_PRICE_RESPONSE_PCT
  ) {
    score++;
  }

  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score++;
  }

  if (
    twoHourBoost
      ?.active
  ) {
    score +=
      twoHourBoost
        .scoreBoost;
  }

  const resistanceBlocking =
    Boolean(
      liquidity
        ?.ready &&
      liquidity
        .resistanceBlocking
    );

  return {
    detected:
      Boolean(
        score >=
          GRT_EARLY_REVERSAL_MIN_SCORE &&
        recoveryPct >=
          GRT_EARLY_REVERSAL_MIN_5M_PCT &&
        buyVolumePct >=
          GRT_EARLY_REVERSAL_MIN_BUY_VOLUME_PCT &&
        buyFrequencyPct >=
          GRT_EARLY_REVERSAL_MIN_BUY_FREQUENCY_PCT &&
        responsePct >=
          GRT_EARLY_REVERSAL_MIN_PRICE_RESPONSE_PCT &&
        !resistanceBlocking
      ),

    score,

    recoveryPct,

    localLowPrice:
      localLow.price,

    buyVolumePct,

    buyFrequencyPct,

    responsePct,

    twoHourBoost:
      Boolean(
        twoHourBoost
          ?.active
      ),

    resistanceBlocking,
  };
}


/* ============================================================
   FINAL GRT MOMENTUM DECISION
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

      reason:
        "TICKER UNAVAILABLE",
    };
  }

  const currentPrice =
    ticker.currentPrice;

  updateGRTMomentumPriceHistory(
    currentPrice
  );

  const fastDirection =
    getGRTFastDirection(
      currentPrice
    );

  const sustainedMove =
    getGRTSustainedMove(
      currentPrice
    );

  const mergedDirection =
    mergeGRTDirectionWithMomentum(
      fastDirection,
      sustainedMove
    );

  const direction =
    mergedDirection
      .direction;

  const directionText =
    mergedDirection
      .directionText;

  const [
    trend,
    liquidity,
    btcSurge,
    twoHour,
  ] =
    await Promise.all([
      getGRTTrendPermission(),

      getGRTLiquidityAnalysis(
        currentPrice
      ),

      getBTCBuySurge(),

      analyze2HMarketCondition(
        "GRT"
      ),
    ]);

  const baseline =
    getBuyVolumeBaseline(
      "GRT"
    );

  const priceResponse =
    getExecutedPriceResponse(
      "GRT",
      FIVE_MINUTES
    );

  const confirmationReady =
    Boolean(
      baseline
        ?.ready &&
      trend
        ?.ready
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

      twoHour,
    };
  }

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

      twoHour,
    };
  }

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

      twoHour,

      validation:
        getGRTValidationState(),
    };
  }

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
      sustainedMove,
    });

  let score =
    calculateGRTMomentumScore({
      accumulation,
      earlyMomentum,
      acceleration,
      sustainedMove,
      trend,
      liquidity,
      priceResponse,
    });

  const twoHourBoost =
    getGRT2HConfirmationBoost(
      twoHour
    );

  score +=
    twoHourBoost
      .scoreBoost;

  score =
    Math.round(
      clamp(
        score,
        0,
        10
      )
    );

  updateGRTMomentumPeaks({
    score,
    baseline,
    priceResponse,
  });

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
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  const hardBearish =
    Boolean(
      trend
        ?.hardBearish
    );

  const hardResistance =
    Boolean(
      liquidity
        ?.ready &&
      liquidity
        .resistanceBlocking
    );

  const negativePriceFailure =
    Boolean(
      priceResponse
        ?.ready &&
      priceResponsePct <=
        GRT_HARD_PRICE_DROP_5M_PCT
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

  const earlyReversal =
    detectGRTEarlyReversal({
      currentPrice,
      direction,
      sustainedMove,
      baseline,
      priceResponse,
      liquidity,
      twoHourBoost,
    });


  /* ==========================================================
     BUY PATH A — EARLY REVERSAL
  ========================================================== */

  const earlyReversalBuy =
    Boolean(
      earlyReversal
        .detected &&
      !hardVeto &&
      !hardResistance
    );


  /* ==========================================================
     BUY PATH B — ACCELERATION
  ========================================================== */

  const accelerationBuy =
    Boolean(
      acceleration
        .detected &&
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


  /* ==========================================================
     BUY PATH C — EARLY + SUSTAINED
  ========================================================== */

  const sustainedMomentumBuy =
    Boolean(
      earlyMomentum
        .detected &&
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


  /* ==========================================================
     BUY PATH D — STRONG EXECUTED FLOW
  ========================================================== */

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


  /* ==========================================================
     BUY PATH E — FAST 5M BREAKOUT
  ========================================================== */

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


  /* ==========================================================
     BUY PATH F — 15M BACKBONE
  ========================================================== */

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
      earlyReversalBuy ||
      accelerationBuy ||
      sustainedMomentumBuy ||
      strongFlowBuy ||
      fastBreakoutBuy ||
      backbone15mBuy
    );

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
      earlyReversalBuy
    ) {
      reason =
        twoHourBoost
          .active
          ? "EARLY REVERSAL + 2H BUY SUPPORT"
          : "EARLY REVERSAL CONFIRMED";
    } else if (
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

      earlyReversal,

      twoHourBoost,

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      twoHour,

      validation,
    };
  }


  /* ==========================================================
     CLEAR DROP
  ========================================================== */

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

      earlyReversal,

      twoHourBoost,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      twoHour,
    };
  }


  /* ==========================================================
     HARD FAILURE
  ========================================================== */

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

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      twoHour,
    };
  }


  /* ==========================================================
     VALIDATION TIMEOUT
  ========================================================== */

  if (
    validation.active &&
    validation.expired
  ) {
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
      clearGRTValidation();

      setGRTMomentumPhase(
        "BUY_NOW"
      );

      setGRTLastDecision(
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

        reason:
          "15M MOMENTUM VALIDATED",

        currentPrice,

        direction,

        directionText,

        score,

        earlyReversal,

        twoHourBoost,

        sustainedMove,

        baseline,

        priceResponse,

        trend,

        liquidity,

        btcSurge,

        twoHour,

        validation,
      };
    }

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

      earlyReversal,

      twoHourBoost,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      twoHour,

      validation,
    };
  }


  /* ==========================================================
     STILL VERIFYING
  ========================================================== */

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
        earlyReversal
          .score >=
          4
          ? "EARLY REVERSAL VALIDATING"
          : sustainedMove
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

      earlyReversal,

      twoHourBoost,

      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      baseline,

      priceResponse,

      trend,

      liquidity,

      btcSurge,

      twoHour,

      validation,
    };
  }


  /* ==========================================================
     NO ENTRY
  ========================================================== */

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
        : direction ===
            "SIDEWAY"
          ? "SIDEWAY"
          : "NO UPWARD MOMENTUM",

    currentPrice,

    direction,

    directionText,

    score,

    earlyReversal,

    twoHourBoost,

    sustainedMove,

    baseline,

    priceResponse,

    trend,

    liquidity,

    btcSurge,

    twoHour,
  };
}


/* ============================================================
   NORMALIZE GRT DECISION
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

      direction:
        "UNKNOWN",

      directionText:
        "",

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

      directionText,

      criteria:
        "COLLECTING DATA",

      actionable:
        false,

      validating:
        false,
    };
  }

  return {
    status:
      "NO_ENTRY",

    text:
      "🔴 DON'T BUY",

    direction,

    directionText,

    criteria:
      decision.reason ||
      "DON'T BUY",

    actionable:
      false,

    validating:
      false,
  };
}


/* ============================================================
   GRT MASTER SNAPSHOT
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

  return {
    ticker:
      activeTicker,

    decision,

    normalized,
  };
}


/* ============================================================
   END PART 4
============================================================ */
/* ============================================================
   PART 5 — GRT ENTRY + SCALPING ENGINE

   PURPOSE:
   - BUY NOW → Scalping Opportunity
   - Practical entry check
   - Orderbook-aware entry
   - TP1 / TP2
   - SL reference
   - Confidence
   - Execution score
   - Explicit rejection reason
   - Quantity planning
   - Maximum 30,000 GRT
   - Interactive START ENTRY / SKIP

   IMPORTANT:

   BUY NOW comes from PART 4.

   BUY NOW does NOT guarantee Scalping Entry.

   PART 5 determines whether the BUY NOW signal
   can become a practical executable setup.
============================================================ */


/* ============================================================
   GRT ENTRY CONFIG
============================================================ */

const GRT_MIN_EXECUTION_SCORE =
  60;

const GRT_DEFAULT_SL_PCT =
  1.20;

const GRT_ORDER_PLAN_MAX_ITERATIONS =
  4;

const GRT_TP2_MIN_EXTRA_ROOM_PCT =
  0.70;


/* ============================================================
   GRT ENTRY REJECTION STATE

   Stores latest reason why BUY NOW did not
   become a practical Scalping Entry.

   Useful later for:
   - Telegram
   - /status
   - learning
   - adaptive trade review
============================================================ */

const GRT_ENTRY_REJECTION_STATE = {
  lastRejectedAt:
    null,

  reason:
    null,

  score:
    null,

  details:
    null,
};


function setGRTEntryRejection(
  reason,
  details = {}
) {
  GRT_ENTRY_REJECTION_STATE
    .lastRejectedAt =
    Date.now();

  GRT_ENTRY_REJECTION_STATE
    .reason =
    reason ||
    "UNKNOWN";

  GRT_ENTRY_REJECTION_STATE
    .score =
    Number.isFinite(
      Number(
        details.score
      )
    )
      ? Number(
          details.score
        )
      : null;

  GRT_ENTRY_REJECTION_STATE
    .details =
    details;

  return {
    ...GRT_ENTRY_REJECTION_STATE,
  };
}


function clearGRTEntryRejection() {
  GRT_ENTRY_REJECTION_STATE
    .lastRejectedAt =
    null;

  GRT_ENTRY_REJECTION_STATE
    .reason =
    null;

  GRT_ENTRY_REJECTION_STATE
    .score =
    null;

  GRT_ENTRY_REJECTION_STATE
    .details =
    null;
}


/* ============================================================
   CONFIDENCE LABEL
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
   SCALPING EXECUTION SCORE

   Momentum already passed in PART 4.

   This score focuses on:
   - 15M context
   - 1H context
   - executed pressure
   - market direction
   - support
   - resistance room
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
          snapshot15m.change,
          0
        )
      : 0;

  const change60m =
    snapshot60m
      ? safeNumber(
          snapshot60m.change,
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
     15M DIRECTION
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
     1H CONTEXT
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
    pressureText ===
    "BUY_STRONG"
  ) {
    score +=
      8;
  } else if (
    pressureText ===
    "BUY"
  ) {
    score +=
      4;
  }

  if (
    pressureText ===
    "SELL_STRONG"
  ) {
    score -=
      10;
  } else if (
    pressureText ===
    "SELL"
  ) {
    score -=
      5;
  }


  /* ========================================================
     MARKET DIRECTION
  ======================================================== */

  const marketText =
    String(
      market ||
      ""
    ).toUpperCase();

  if (
    marketText ===
    "NAIK_KUAT"
  ) {
    score +=
      7;
  } else if (
    marketText ===
    "NAIK"
  ) {
    score +=
      4;
  }

  if (
    marketText ===
    "TURUN_KUAT"
  ) {
    score -=
      8;
  } else if (
    marketText ===
    "TURUN"
  ) {
    score -=
      4;
  }


  /* ========================================================
     SUPPORT LOCATION
  ======================================================== */

  if (
    price >
      0 &&
    supportPrice >
      0 &&
    supportPrice <
      price
  ) {
    const distancePct =
      Math.abs(
        percentChange(
          price,
          supportPrice
        )
      );

    if (
      distancePct <=
      0.50
    ) {
      score +=
        3;
    }
  }


  /* ========================================================
     RESISTANCE ROOM
  ======================================================== */

  if (
    price >
      0 &&
    resistancePrice >
      price
  ) {
    const roomPct =
      percentChange(
        price,
        resistancePrice
      );

    if (
      roomPct >=
      2.00
    ) {
      score +=
        4;
    } else if (
      roomPct <
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
   PROJECTED GRT REACH

   TP is determined from market condition.

   User desired RM profit does NOT determine TP.
============================================================ */

async function calculateGRTProjectedReach({
  currentPrice,
  momentum,
}) {
  const price =
    safeNumber(
      currentPrice,
      0
    );

  if (
    price <=
    0
  ) {
    return null;
  }

  const execution =
    await getExecutionStructureSnapshot(
      "GRT",
      price
    );

  const score =
    safeNumber(
      momentum
        ?.score,
      0
    );

  const sustained =
    momentum
      ?.sustainedMove ||
    {};

  const earlyReversal =
    momentum
      ?.earlyReversal ||
    {};

  let baseReachPct =
    GRT_HOLD_BASE_REACH
      .NEUTRAL;

  if (
    sustained
      .accelerating ||
    momentum
      ?.reason ===
      "FAST 5M BREAKOUT"
  ) {
    baseReachPct =
      GRT_HOLD_BASE_REACH
        .ACCELERATING;
  } else if (
    sustained
      .momentum15mStrong ||
    score >=
      8
  ) {
    baseReachPct =
      GRT_HOLD_BASE_REACH
        .STRONG;
  } else if (
    sustained
      .momentum15mActive ||
    earlyReversal
      .detected ||
    score >=
      6
  ) {
    baseReachPct =
      GRT_HOLD_BASE_REACH
        .BUILDING;
  } else if (
    score <=
    3
  ) {
    baseReachPct =
      GRT_HOLD_BASE_REACH
        .WEAK;
  }

  baseReachPct =
    clamp(
      baseReachPct,
      0.50,
      GRT_HOLD_MAX_DYNAMIC_REACH_PCT
    );

  let projectedPrice =
    price *
    (
      1 +
      baseReachPct /
        100
    );

  const resistance =
    execution
      ?.resistance ||
    null;

  const resistancePrice =
    safeNumber(
      resistance
        ?.price,
      0
    );

  const resistanceRating =
    getResistanceRating(
      resistance
    );

  /*
     Strong meaningful resistance can
     cap projected TP.

     Weak resistance does not kill trade.
  */

  if (
    resistancePrice >
      price &&
    resistanceRating >=
      MEANINGFUL_RESISTANCE_MIN_RATING
  ) {
    const bufferedResistance =
      resistancePrice *
      (
        1 -
        TP_RESISTANCE_BUFFER_PCT /
          100
      );

    projectedPrice =
      Math.min(
        projectedPrice,
        bufferedResistance
      );
  }

  if (
    projectedPrice <=
    price
  ) {
    projectedPrice =
      price *
      1.005;
  }

  const tp1 =
    projectedPrice;

  const grossRoomPct =
    percentChange(
      price,
      tp1
    );

  let tp2 =
    null;

  let tp2Confidence =
    null;

  let tp2Requirement =
    null;

  const strongExtension =
    Boolean(
      sustained
        .momentum15mStrong ||
      sustained
        .accelerating ||
      momentum
        ?.twoHourBoost
        ?.active
    );

  if (
    strongExtension &&
    grossRoomPct >=
      GRT_MIN_PRACTICAL_TP_ROOM_PCT
  ) {
    const tp2ReachPct =
      Math.min(
        baseReachPct +
          GRT_TP2_MIN_EXTRA_ROOM_PCT,
        GRT_HOLD_MAX_DYNAMIC_REACH_PCT
      );

    const candidateTP2 =
      price *
      (
        1 +
        tp2ReachPct /
          100
      );

    if (
      candidateTP2 >
      tp1
    ) {
      tp2 =
        candidateTP2;

      tp2Confidence =
        sustained
          .accelerating
          ? "MID"
          : "WEAK";

      tp2Requirement =
        "Momentum kekal kuat dan resistance seterusnya tidak menahan harga.";
    }
  }

  return {
    currentPrice:
      price,

    tp1,

    tp2,

    grossRoomPct,

    baseReachPct,

    resistance,

    resistanceRating,

    execution,

    tp2Confidence,

    tp2Requirement,

    reason:
      momentum
        ?.reason ||
      "MOMENTUM-BASED PROJECTED REACH",
  };
}


/* ============================================================
   QUANTITY-AWARE LIMIT ENTRY

   Checks how far into ask-side orderbook
   required quantity may need to reach.

   DOES NOT PLACE AN ORDER.
============================================================ */

async function chooseQuantityAwareLimitEntry({
  coin,
  technicalEntry,
  requiredQuantity =
    0,
}) {
  const entry =
    safeNumber(
      technicalEntry,
      0
    );

  if (
    entry <=
    0
  ) {
    return {
      finalEntry:
        null,

      chasePct:
        0,

      reason:
        "INVALID TECHNICAL ENTRY",
    };
  }

  const orderBook =
    await getOrderBook(
      coin
    );

  if (
    !orderBook ||
    !orderBook.asks.length
  ) {
    return {
      finalEntry:
        entry,

      chasePct:
        0,

      reason:
        "ORDERBOOK UNAVAILABLE — TECHNICAL ENTRY USED",
    };
  }

  const asks =
    [...orderBook.asks]
      .sort(
        (
          a,
          b
        ) =>
          a.price -
          b.price
      );

  const quantity =
    safeNumber(
      requiredQuantity,
      0
    );

  if (
    quantity <=
    0
  ) {
    const bestAsk =
      safeNumber(
        asks[
          0
        ]?.price,
        entry
      );

    const finalEntry =
      Math.max(
        entry,
        bestAsk
      );

    return {
      finalEntry,

      bestAsk,

      chasePct:
        percentChange(
          entry,
          finalEntry
        ),

      reason:
        "BEST ASK",
    };
  }

  let accumulated =
    0;

  let matchedPrice =
    null;

  for (
    const ask of
    asks
  ) {
    accumulated +=
      safeNumber(
        ask.volume,
        0
      );

    matchedPrice =
      ask.price;

    if (
      accumulated >=
      quantity
    ) {
      break;
    }
  }

  if (
    !matchedPrice
  ) {
    matchedPrice =
      asks[
        asks.length -
        1
      ].price;
  }

  const finalEntry =
    Math.max(
      entry,
      safeNumber(
        matchedPrice,
        entry
      )
    );

  const chasePct =
    percentChange(
      entry,
      finalEntry
    );

  return {
    finalEntry,

    bestAsk:
      asks[
        0
      ]?.price ||
      null,

    matchedPrice,

    requiredQuantity:
      quantity,

    availableQuantity:
      accumulated,

    chasePct,

    reason:
      accumulated >=
        quantity
        ? "QUANTITY-AWARE ORDERBOOK ENTRY"
        : "AVAILABLE ORDERBOOK DEPTH USED",
  };
}


/* ============================================================
   ENTRY RISK LEVELS
============================================================ */

function buildEntryRiskLevels({
  coin,
  entryPrice,
  room,
  confidence,
}) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  if (
    entry <=
      0 ||
    !room
  ) {
    return null;
  }

  const tp =
    room.tp1;

  const tp2 =
    room.tp2 ||
    null;

  let slPct =
    GRT_DEFAULT_SL_PCT;

  if (
    confidence ===
    "STRONG"
  ) {
    slPct =
      1.00;
  }

  if (
    confidence ===
    "WEAK"
  ) {
    slPct =
      1.40;
  }

  const sl =
    entry *
    (
      1 -
      slPct /
        100
    );

  let durationHours =
    "2-6";

  if (
    confidence ===
    "STRONG"
  ) {
    durationHours =
      "1-6";
  } else if (
    confidence ===
    "WEAK"
  ) {
    durationHours =
      "2-8";
  }

  return {
    coin,

    entryPrice:
      entry,

    tp,

    tp2,

    sl,

    slPct,

    durationHours,
  };
}


/* ============================================================
   GRT MOMENTUM ENTRY QUALIFICATION

   BUY NOW already passed.

   This stage asks:

   - Is entry chase reasonable?
   - Is projected TP available?
   - Is practical room usable?

   Small projected room is NOT immediately
   rejected. It is labelled LOW.
============================================================ */

async function qualifyGRTMomentumEntry({
  ticker,
  momentumDecision,
}) {
  if (
    !ticker ||
    !momentumDecision ||
    momentumDecision.status !==
      "BUY_NOW"
  ) {
    return {
      allowed:
        false,

      reason:
        "NOT BUY NOW",
    };
  }

  const currentPrice =
    safeNumber(
      ticker.currentPrice,
      0
    );

  if (
    currentPrice <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "CURRENT PRICE UNAVAILABLE",
    };
  }

  const room =
    await calculateGRTProjectedReach({
      currentPrice,

      momentum:
        momentumDecision,
    });

  if (
    !room ||
    !room.tp1
  ) {
    return {
      allowed:
        false,

      reason:
        "PROJECTED REACH UNAVAILABLE",
    };
  }

  const preliminaryDepth =
    await chooseQuantityAwareLimitEntry({
      coin:
        "GRT",

      technicalEntry:
        currentPrice,

      requiredQuantity:
        0,
    });

  const finalEntry =
    safeNumber(
      preliminaryDepth
        .finalEntry,
      currentPrice
    );

  const chasePct =
    safeNumber(
      preliminaryDepth
        .chasePct,
      0
    );

  if (
    chasePct >
    MAX_ENTRY_CHASE_PCT
  ) {
    return {
      allowed:
        false,

      reason:
        "ENTRY CHASE TOO HIGH",

      chasePct,

      maxChasePct:
        MAX_ENTRY_CHASE_PCT,
    };
  }

  const finalRoomPct =
    percentChange(
      finalEntry,
      room.tp1
    );

  let roomQuality =
    "GOOD";

  if (
    finalRoomPct <
    GRT_MIN_PRACTICAL_TP_ROOM_PCT
  ) {
    roomQuality =
      "LOW";
  } else if (
    finalRoomPct >=
    2.00
  ) {
    roomQuality =
      "STRONG";
  }

  return {
    allowed:
      true,

    reason:
      roomQuality ===
        "LOW"
        ? "BUY NOW VALID — PROFIT ROOM LOW"
        : "ENTRY QUALIFIED",

    currentPrice,

    technicalEntry:
      currentPrice,

    finalEntry,

    chasePct,

    room,

    finalRoomPct,

    roomQuality,

    preliminaryDepth,
  };
}


/* ============================================================
   BUILD GRT SCALPING CANDIDATE
============================================================ */

async function buildGRTScalpingCandidate(
  ticker,
  momentumDecision
) {
  const qualification =
    await qualifyGRTMomentumEntry({
      ticker,
      momentumDecision,
    });

  if (
    !qualification.allowed
  ) {
    setGRTEntryRejection(
      qualification.reason,
      qualification
    );

    return {
      allowed:
        false,

      reason:
        qualification.reason,

      qualification,
    };
  }

  const execution =
    qualification
      .room
      ?.execution ||
    await getExecutionStructureSnapshot(
      "GRT",
      ticker.currentPrice
    );

  if (
    !execution
  ) {
    setGRTEntryRejection(
      "EXECUTION DATA UNAVAILABLE"
    );

    return {
      allowed:
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

  const liveSellDanger =
    Boolean(
      flowReady &&
      execution.flow.sellVolumePct >=
        GRT_HARD_SELL_VOLUME_PCT &&
      execution.flow.sellFrequencyPct >=
        58
    );

  if (
    liveSellDanger
  ) {
    const details = {
      sellVolumePct:
        execution.flow
          .sellVolumePct,

      sellFrequencyPct:
        execution.flow
          .sellFrequencyPct,
    };

    setGRTEntryRejection(
      "LIVE SELL PRESSURE TOO STRONG",
      details
    );

    return {
      allowed:
        false,

      reason:
        "LIVE SELL PRESSURE TOO STRONG",

      ...details,
    };
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


  /* ========================================================
     MOMENTUM SCORE BONUS
  ======================================================== */

  score +=
    Math.min(
      safeNumber(
        momentumDecision.score,
        0
      ) *
        2,
      20
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

  if (
    momentumDecision
      .twoHourBoost
      ?.active
  ) {
    score +=
      4;
  }

  /*
     Weak resistance is not considered bearish.
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


  /* ========================================================
     EXECUTION SCORE FILTER
  ======================================================== */

  if (
    score <
    GRT_MIN_EXECUTION_SCORE
  ) {
    const details = {
      score,

      minimumScore:
        GRT_MIN_EXECUTION_SCORE,

      pressure:
        execution.pressure,

      direction:
        execution.direction,
    };

    setGRTEntryRejection(
      "EXECUTION SCORE TOO LOW",
      details
    );

    return {
      allowed:
        false,

      reason:
        "EXECUTION SCORE TOO LOW",

      score,

      minimumScore:
        GRT_MIN_EXECUTION_SCORE,

      execution,
    };
  }

  const confidence =
    confidenceLabel(
      score
    );

  const risk =
    buildEntryRiskLevels({
      coin:
        "GRT",

      entryPrice:
        qualification.finalEntry,

      room:
        qualification.room,

      confidence,
    });

  if (
    !risk
  ) {
    setGRTEntryRejection(
      "RISK LEVELS UNAVAILABLE",
      {
        score,
      }
    );

    return {
      allowed:
        false,

      reason:
        "RISK LEVELS UNAVAILABLE",

      score,
    };
  }

  let setup =
    "MOMENTUM BUY NOW";

  if (
    momentumDecision.reason ===
      "EARLY REVERSAL CONFIRMED" ||
    momentumDecision.reason ===
      "EARLY REVERSAL + 2H BUY SUPPORT"
  ) {
    setup =
      "EARLY REVERSAL";
  } else if (
    momentumDecision.reason ===
    "FAST 5M BREAKOUT"
  ) {
    setup =
      "FAST MOMENTUM";
  } else if (
    momentumDecision.reason ===
    "15M MOMENTUM CONFIRMED"
  ) {
    setup =
      "15M MOMENTUM";
  } else if (
    momentumDecision.reason ===
    "ACCELERATION"
  ) {
    setup =
      "EARLY ACCELERATION";
  }

  clearGRTEntryRejection();

  return {
    allowed:
      true,

    coin:
      "GRT",

    score,

    confidence,

    setup,

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
      qualification
        .room
        .tp2Confidence ||
      null,

    tp2Requirement:
      qualification
        .room
        .tp2Requirement ||
      null,

    sl:
      risk.sl,

    slPct:
      risk.slPct,

    durationHours:
      risk.durationHours,

    nextResistance:
      execution.resistance,

    roomReason:
      qualification
        .room
        .reason,

    roomQuality:
      qualification
        .roomQuality,

    grossRoomPct:
      qualification
        .finalRoomPct,

    momentumSnapshot:
      momentumDecision,

    execution,

    qualification,
  };
}


/* ============================================================
   SCALPING REJECTION MESSAGE

   Example:

   🟢 BUY NOW

   ⚠️ SCALPING ENTRY NOT READY
   Reason : EXECUTION SCORE TOO LOW
   Score  : 54/100
============================================================ */

function buildGRTScalpingRejectionMessage(
  entryResult
) {
  if (
    !entryResult ||
    entryResult.triggered
  ) {
    return null;
  }

  const reason =
    entryResult.reason ||
    entryResult
      ?.candidateResult
      ?.reason ||
    "ENTRY NOT READY";

  const score =
    entryResult
      ?.candidateResult
      ?.score ??
    entryResult
      ?.candidateResult
      ?.qualification
      ?.score ??
    GRT_ENTRY_REJECTION_STATE
      .score;

  let scoreText =
    "";

  if (
    Number.isFinite(
      Number(
        score
      )
    )
  ) {
    scoreText =
      `\nScore  : ${Math.round(
        Number(
          score
        )
      )}/100`;
  }

  let heading =
    "⚠️ SCALPING ENTRY NOT READY";

  if (
    reason.includes(
      "ACTIVE"
    ) ||
    reason.includes(
      "COOLDOWN"
    )
  ) {
    heading =
      "⚠️ SCALPING ENTRY BLOCKED";
  }

  return `🟢 BUY NOW

${heading}
Reason : ${reason}${scoreText}`;
}


/* ============================================================
   SEND SCALPING ENTRY

   Generic enough for PART 6 altcoin scanner.
============================================================ */

async function sendScalpingEntry(
  candidate,
  options = {}
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

  if (
    LAST_SIGNAL[
      candidate.coin
    ] &&
    Date.now() -
      LAST_SIGNAL[
        candidate.coin
      ] <
      PER_COIN_COOLDOWN
  ) {
    return {
      sent:
        false,

      reason:
        "PER COIN COOLDOWN",
    };
  }

  if (
    !options.bypassGlobalCooldown &&
    LAST_GLOBAL_SIGNAL &&
    Date.now() -
      LAST_GLOBAL_SIGNAL <
      GLOBAL_SCALPING_COOLDOWN
  ) {
    return {
      sent:
        false,

      reason:
        "GLOBAL SCALPING COOLDOWN",
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
      )}`;

    if (
      candidate.tp2Confidence
    ) {
      tp2Text +=
        `

📊 TP2 Confidence:
${candidate.tp2Confidence}`;
    }

    if (
      candidate.tp2Requirement
    ) {
      tp2Text +=
        `

📌 TP2 Requirement:
${candidate.tp2Requirement}`;
    }
  }

  let resistanceText =
    "";

  if (
    candidate.nextResistance
  ) {
    resistanceText =
      `

🧱 Next Resistance:
RM${formatPrice(
        candidate.coin,
        candidate
          .nextResistance
          .price
      )} — ${getResistanceRating(
        candidate.nextResistance
      )}/10`;
  }

  const roomWarning =
    candidate.roomQuality ===
      "LOW"
      ? `

⚠️ PROFIT ROOM:
LOW

Momentum BUY NOW valid,
tetapi ruang projected TP agak kecil.`
      : `

💰 PROFIT ROOM:
${candidate.roomQuality ||
  "GOOD"}`;

  const buttons = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text:
              "▶️ START ENTRY",

            callback_data:
              `START_ENTRY:${candidate.coin}`,
          },

          {
            text:
              "❌ SKIP",

            callback_data:
              `SKIP_ENTRY:${candidate.coin}`,
          },
        ],
      ],
    },
  };

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

📏 Gross Room:
${formatPercent(
      candidate.grossRoomPct
    )}

📊 Confidence:
${candidate.confidence}

🧠 Setup:
${candidate.setup}

⭐ Execution Score:
${candidate.score}/100${roomWarning}${resistanceText}

⏱ Estimated Trade:
${candidate.durationHours} hours`;

  const result =
    await sendTelegram(
      message,
      buttons
    );

  if (
    !result
  ) {
    delete PENDING_ENTRIES[
      candidate.coin
    ];

    return {
      sent:
        false,

      reason:
        "TELEGRAM SEND FAILED",
    };
  }

  return {
    sent:
      true,

    candidate,

    message,
  };
}


/* ============================================================
   TRIGGER GRT SCALPING ENTRY

   BUY NOW from PART 4 enters here.
============================================================ */

async function triggerMomentumScalpingEntry(
  ticker,
  momentumDecision
) {
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
    ACTIVE_TRADES
      .GRT ||
    PENDING_ENTRIES
      .GRT
  ) {
    const result = {
      triggered:
        false,

      reason:
        "TRADE OR ENTRY ALREADY ACTIVE",
    };

    setGRTEntryRejection(
      result.reason
    );

    return result;
  }

  const candidateResult =
    await buildGRTScalpingCandidate(
      ticker,
      momentumDecision
    );

  if (
    !candidateResult.allowed
  ) {
    return {
      triggered:
        false,

      reason:
        candidateResult.reason,

      candidateResult,
    };
  }

  const result =
    await sendScalpingEntry(
      candidateResult
    );

  if (
    !result?.sent
  ) {
    setGRTEntryRejection(
      result?.reason ||
      "SCALPING ENTRY SEND FAILED",
      {
        score:
          candidateResult.score,
      }
    );
  }

  return {
    triggered:
      Boolean(
        result?.sent
      ),

    reason:
      result?.sent
        ? "SCALPING ENTRY SENT"
        : result?.reason ||
          "SCALPING ENTRY NOT SENT",

    result,

    candidate:
      candidateResult,
  };
}


/* ============================================================
   GRT BUY NOW LEARNING RECORD
============================================================ */

function recordGRTBuyNowSignal(
  ticker,
  momentumDecision
) {
  if (
    !ticker ||
    !momentumDecision
  ) {
    return null;
  }

  const record = {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`,

    createdAt:
      Date.now(),

    price:
      ticker.currentPrice,

    reason:
      momentumDecision.reason ||
      null,

    score:
      safeNumber(
        momentumDecision.score,
        0
      ),

    direction:
      momentumDecision.direction ||
      null,

    change5m:
      safeNumber(
        momentumDecision
          .sustainedMove
          ?.change5m,
        0
      ),

    change15m:
      safeNumber(
        momentumDecision
          .sustainedMove
          ?.change15m,
        0
      ),

    buyVolumePct:
      safeNumber(
        momentumDecision
          .baseline
          ?.current
          ?.buyVolumePct,
        0
      ),

    buyFrequencyPct:
      safeNumber(
        momentumDecision
          .baseline
          ?.current
          ?.buyFrequencyPct,
        0
      ),

    twoHourBoost:
      Boolean(
        momentumDecision
          .twoHourBoost
          ?.active
      ),

    status:
      "OPEN",

    result:
      null,
  };

  GRT_BUY_NOW_HISTORY.push(
    record
  );

  if (
    GRT_BUY_NOW_HISTORY.length >
    GRT_BUY_NOW_HISTORY_LIMIT
  ) {
    GRT_BUY_NOW_HISTORY =
      GRT_BUY_NOW_HISTORY.slice(
        -GRT_BUY_NOW_HISTORY_LIMIT
      );
  }

  return record;
}


/* ============================================================
   SHARED GRT BUY NOW HANDLER

   Every BUY NOW source uses this.
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
   IMMEDIATE BUY NOW MESSAGE
============================================================ */

function buildImmediateGRTBuyNowMessage(
  snapshot
) {
  const ticker =
    snapshot
      ?.ticker ||
    null;

  const decision =
    snapshot
      ?.decision ||
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

  const change5m =
    safeNumber(
      decision
        .sustainedMove
        ?.change5m,
      0
    );

  const change15m =
    safeNumber(
      decision
        .sustainedMove
        ?.change15m,
      0
    );

  return `🚨 GRT BUY NOW

🪙 GRT RM${formatPrice(
    "GRT",
    ticker.currentPrice
  )}

⏱ 5M:
${formatPercent(
    change5m
  )}

⏱ 15M:
${formatPercent(
    change15m
  )}

⚡ ${normalized.text}

${normalized.directionText}

🧠 Sebab:
${decision.reason ||
  "MOMENTUM CONFIRMED"}`;
}


/* ============================================================
   GRT IMMEDIATE ALERT STATE
============================================================ */

let LAST_GRT_IMMEDIATE_BUY_ALERT_AT =
  0;

const GRT_IMMEDIATE_BUY_ALERT_COOLDOWN_MS =
  5 *
  60 *
  1000;


/* ============================================================
   SEND IMMEDIATE GRT BUY NOW ALERT
============================================================ */

async function sendImmediateGRTBuyNowAlert(
  snapshot
) {
  if (
    !snapshot
      ?.decision ||
    snapshot
      .decision
      .status !==
      "BUY_NOW"
  ) {
    return {
      sent:
        false,

      reason:
        "NOT BUY NOW",
    };
  }

  const elapsed =
    Date.now() -
    LAST_GRT_IMMEDIATE_BUY_ALERT_AT;

  if (
    LAST_GRT_IMMEDIATE_BUY_ALERT_AT &&
    elapsed <
      GRT_IMMEDIATE_BUY_ALERT_COOLDOWN_MS
  ) {
    return {
      sent:
        false,

      reason:
        "IMMEDIATE ALERT COOLDOWN",
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

  const sent =
    await sendTelegram(
      message
    );

  if (
    !sent
  ) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM SEND FAILED",
    };
  }

  LAST_GRT_IMMEDIATE_BUY_ALERT_AT =
    Date.now();

  return {
    sent:
      true,

    message,
  };
}


/* ============================================================
   PROCESS GRT MASTER RESULT

   BUY NOW:

   1. Send BUY NOW alert.
   2. Run practical Scalping Entry engine.
   3. If Scalping Entry rejected, expose reason.

   VERIFYING / DON'T BUY:
   No entry trigger.
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

      rejectionAlert:
        null,
    };
  }

  const immediateAlert =
    await sendImmediateGRTBuyNowAlert(
      snapshot
    );

  const buyHandler =
    await handleGRTBuyNowSignal(
      snapshot.ticker,
      decision
    );

  let rejectionAlert =
    null;

  const entryResult =
    buyHandler
      ?.entryResult ||
    null;

  /*
     BUY NOW occurred but practical
     Scalping Entry was rejected.

     Do not silently swallow rejection.
  */

  if (
    entryResult &&
    !entryResult.triggered
  ) {
    const rejectionMessage =
      buildGRTScalpingRejectionMessage(
        entryResult
      );

    if (
      rejectionMessage
    ) {
      /*
         If immediate BUY alert was already sent,
         this second compact message explains
         why Scalping Entry did not appear.
      */

      const rejectionSent =
        await sendTelegram(
          rejectionMessage
        );

      rejectionAlert = {
        sent:
          Boolean(
            rejectionSent
          ),

        message:
          rejectionMessage,

        reason:
          entryResult.reason ||
          null,
      };
    }
  }

  return {
    processed:
      true,

    status:
      "BUY_NOW",

    immediateAlert,

    buyHandler,

    rejectionAlert,
  };
}


/* ============================================================
   FINAL ORDER PLAN

   Existing manual Scalping Entry flow:

   User provides desired NET profit.

   Bot calculates quantity based on:
   - practical entry price
   - projected TP1
   - BUY fee
   - SELL fee

   HARD RULE:
   GRT quantity <= 30,000.

   NOTE:
   Future Auto Trade module will use CAPITAL amount
   rather than this legacy target-profit workflow.
============================================================ */

async function buildFinalOrderPlan({
  candidate,
  targetProfit,
}) {
  if (
    !candidate
  ) {
    return {
      allowed:
        false,

      reason:
        "CANDIDATE MISSING",
    };
  }

  const target =
    safeNumber(
      targetProfit,
      0
    );

  if (
    target <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "INVALID TARGET PROFIT",
    };
  }

  let entryPrice =
    safeNumber(
      candidate.preliminaryEntry,
      0
    );

  if (
    entryPrice <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "ENTRY PRICE UNAVAILABLE",
    };
  }

  for (
    let iteration = 0;
    iteration <
      GRT_ORDER_PLAN_MAX_ITERATIONS;
    iteration++
  ) {
    const sellPrice =
      safeNumber(
        candidate.tp,
        0
      );

    const quantityResult =
      calculateQuantityForTargetProfit({
        entryPrice,

        sellPrice,

        targetProfit:
          target,
      });

    if (
      !quantityResult
    ) {
      return {
        allowed:
          false,

        reason:
          "NET PROFIT NEGATIVE AFTER FEES",
      };
    }

    const quantity =
      quantityResult
        .quantity;

    if (
      candidate.coin ===
        "GRT" &&
      quantity >
        MAX_GRT_SCALPING_QUANTITY
    ) {
      return {
        allowed:
          false,

        reason:
          "REQUIRED QUANTITY ABOVE 30000 GRT",

        quantity,

        maximumQuantity:
          MAX_GRT_SCALPING_QUANTITY,

        targetProfit:
          target,
      };
    }

    const depth =
      await chooseQuantityAwareLimitEntry({
        coin:
          candidate.coin,

        technicalEntry:
          candidate.technicalEntry,

        requiredQuantity:
          quantity,
      });

    const nextEntry =
      safeNumber(
        depth.finalEntry,
        0
      );

    if (
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

        chasePct:
          depth.chasePct,
      };
    }

    /*
       Entry price stabilised.
    */

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

          sellPrice,
        });

      if (
        !feeEstimate
      ) {
        return {
          allowed:
            false,

          reason:
            "FEE CALCULATION FAILED",
        };
      }

      if (
        feeEstimate.netProfit <=
        0
      ) {
        return {
          allowed:
            false,

          reason:
            "NET PROFIT NEGATIVE AFTER FEES",

          estimatedNetProfit:
            feeEstimate.netProfit,
        };
      }

      return {
        allowed:
          true,

        coin:
          candidate.coin,

        targetProfit:
          target,

        entryPrice,

        quantity,

        maximumQuantity:
          candidate.coin ===
            "GRT"
            ? MAX_GRT_SCALPING_QUANTITY
            : null,

        tp:
          sellPrice,

        tp2:
          candidate.tp2 ||
          null,

        sl:
          candidate.sl,

        estimatedNetProfit:
          feeEstimate
            .netProfit,

        estimatedNetProfitPct:
          feeEstimate
            .netProfitPct,

        feeEstimate,

        depthSelection:
          depth,

        confidence:
          candidate.confidence,

        setup:
          candidate.setup,

        roomQuality:
          candidate.roomQuality,
      };
    }

    /*
       Orderbook depth changed practical entry.
       Recalculate required quantity on next loop.
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
   END PART 5
============================================================ */
/* ============================================================
   PART 6 — ALTCOIN SCALPING SCANNER

   COINS:
   - XRP
   - XLM
   - CRV
   - AAVE

   INTERVAL:
   30 MINUTES

   PURPOSE:
   - Find practical scalping opportunities
   - Less rigid than GRT
   - No multi-stage VALIDATING
   - No alert if no setup exists
   - Reuse sendScalpingEntry()

   IMPORTANT:
   BTC is context only.
   GRT uses its own dedicated engine.
============================================================ */


/* ============================================================
   ALTCOIN SCANNER CONFIG
============================================================ */

const ALTCOIN_MIN_SCORE =
  60;

const ALTCOIN_MIN_15M_MOVE_PCT =
  0.15;

const ALTCOIN_MIN_BUY_VOLUME_PCT =
  52;

const ALTCOIN_MIN_BUY_FREQUENCY_PCT =
  48;

const ALTCOIN_HARD_SELL_VOLUME_PCT =
  68;

const ALTCOIN_HARD_SELL_FREQUENCY_PCT =
  60;

const ALTCOIN_MIN_PROFIT_ROOM_PCT =
  0.90;


/* ============================================================
   ALTCOIN MOMENTUM CONTEXT
============================================================ */

function getAltcoinMomentumContext(
  coin,
  currentPrice
) {
  const snapshot5m =
    getPriceSnapshot(
      coin,
      FIVE_MINUTES
    );

  const snapshot15m =
    getPriceSnapshot(
      coin,
      FIFTEEN_MINUTES
    );

  const snapshot60m =
    getPriceSnapshot(
      coin,
      ONE_HOUR
    );

  const change5m =
    snapshot5m
      ? safeNumber(
          snapshot5m.change,
          0
        )
      : 0;

  const change15m =
    snapshot15m
      ? safeNumber(
          snapshot15m.change,
          0
        )
      : 0;

  const change60m =
    snapshot60m
      ? safeNumber(
          snapshot60m.change,
          0
        )
      : 0;

  let direction =
    "SIDEWAY";

  if (
    change5m >=
      0.45 ||
    change15m >=
      0.80
  ) {
    direction =
      "NAIK_KUAT";
  } else if (
    change5m >
      0 ||
    change15m >=
      ALTCOIN_MIN_15M_MOVE_PCT
  ) {
    direction =
      "NAIK";
  } else if (
    change5m <=
      -0.50 ||
    change15m <=
      -0.80
  ) {
    direction =
      "TURUN_KUAT";
  } else if (
    change5m <
      0 ||
    change15m <
      0
  ) {
    direction =
      "TURUN";
  }

  return {
    coin,

    currentPrice,

    snapshot5m,

    snapshot15m,

    snapshot60m,

    change5m,

    change15m,

    change60m,

    direction,
  };
}


/* ============================================================
   ALTCOIN PROJECTED REACH
============================================================ */

function calculateAltcoinProjectedReach({
  coin,
  currentPrice,
  structure,
  score,
}) {
  const price =
    safeNumber(
      currentPrice,
      0
    );

  if (
    price <=
    0
  ) {
    return null;
  }

  let baseReachPct =
    safeNumber(
      DEFAULT_BREAKOUT_TP_PCT[
        coin
      ],
      2.00
    );

  if (
    score <
    65
  ) {
    baseReachPct *=
      0.75;
  }

  if (
    score >=
    78
  ) {
    baseReachPct *=
      1.15;
  }

  baseReachPct =
    clamp(
      baseReachPct,
      0.75,
      4.00
    );

  let tp1 =
    price *
    (
      1 +
      baseReachPct /
        100
    );

  const resistance =
    structure
      ?.resistance ||
    null;

  const resistancePrice =
    safeNumber(
      resistance
        ?.price,
      0
    );

  const resistanceRating =
    getResistanceRating(
      resistance
    );

  if (
    resistancePrice >
      price &&
    resistanceRating >=
      MEANINGFUL_RESISTANCE_MIN_RATING
  ) {
    const bufferedResistance =
      resistancePrice *
      (
        1 -
        TP_RESISTANCE_BUFFER_PCT /
          100
      );

    tp1 =
      Math.min(
        tp1,
        bufferedResistance
      );
  }

  if (
    tp1 <=
    price
  ) {
    tp1 =
      price *
      1.005;
  }

  const grossRoomPct =
    percentChange(
      price,
      tp1
    );

  let tp2 =
    null;

  if (
    score >=
      72 &&
    grossRoomPct >=
      1.20
  ) {
    tp2 =
      price *
      (
        1 +
        Math.min(
          baseReachPct +
            0.75,
          4.50
        ) /
          100
      );

    if (
      tp2 <=
      tp1
    ) {
      tp2 =
        null;
    }
  }

  return {
    tp1,

    tp2,

    grossRoomPct,

    baseReachPct,

    resistance,

    resistanceRating,
  };
}


/* ============================================================
   ALTCOIN HARD DANGER
============================================================ */

function getAltcoinHardDanger({
  flow,
  priceResponse,
  structure,
}) {
  const sellVolumePct =
    safeNumber(
      flow
        ?.sellVolumePct,
      50
    );

  const sellFrequencyPct =
    safeNumber(
      flow
        ?.sellFrequencyPct,
      50
    );

  const responsePct =
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse.changePct,
          0
        )
      : 0;

  const strongSellPressure =
    Boolean(
      sellVolumePct >=
        ALTCOIN_HARD_SELL_VOLUME_PCT &&
      sellFrequencyPct >=
        ALTCOIN_HARD_SELL_FREQUENCY_PCT
    );

  const activePriceFailure =
    responsePct <=
    -0.45;

  const resistanceBlocking =
    Boolean(
      structure
        ?.resistance &&
      getResistanceRating(
        structure.resistance
      ) >=
        8 &&
      safeNumber(
        structure
          .resistance
          .distancePct,
        99
      ) <=
        0.50
    );

  return {
    blocked:
      Boolean(
        strongSellPressure ||
        activePriceFailure ||
        resistanceBlocking
      ),

    strongSellPressure,

    activePriceFailure,

    resistanceBlocking,
  };
}


/* ============================================================
   ALTCOIN OPPORTUNITY SCORE
============================================================ */

function calculateAltcoinOpportunityScore({
  momentum,
  flow,
  priceResponse,
  structure,
  twoHour,
}) {
  let score =
    50;

  const buyVolumePct =
    safeNumber(
      flow
        ?.buyVolumePct,
      50
    );

  const buyFrequencyPct =
    safeNumber(
      flow
        ?.buyFrequencyPct,
      50
    );

  const responsePct =
    priceResponse
      ?.ready
      ? safeNumber(
          priceResponse
            .changePct,
          0
        )
      : 0;

  const change5m =
    safeNumber(
      momentum
        ?.change5m,
      0
    );

  const change15m =
    safeNumber(
      momentum
        ?.change15m,
      0
    );


  /* ========================================================
     PRICE MOMENTUM
  ======================================================== */

  if (
    change5m >=
    0.50
  ) {
    score +=
      10;
  } else if (
    change5m >=
    0.20
  ) {
    score +=
      6;
  } else if (
    change5m >
    0
  ) {
    score +=
      2;
  }

  if (
    change15m >=
    1.00
  ) {
    score +=
      8;
  } else if (
    change15m >=
    0.35
  ) {
    score +=
      5;
  } else if (
    change15m >=
    ALTCOIN_MIN_15M_MOVE_PCT
  ) {
    score +=
      2;
  }

  if (
    change5m <=
    -0.50
  ) {
    score -=
      10;
  }

  if (
    change15m <=
    -0.75
  ) {
    score -=
      8;
  }


  /* ========================================================
     EXECUTED BUY FLOW
  ======================================================== */

  if (
    buyVolumePct >=
    65
  ) {
    score +=
      9;
  } else if (
    buyVolumePct >=
    58
  ) {
    score +=
      6;
  } else if (
    buyVolumePct >=
    ALTCOIN_MIN_BUY_VOLUME_PCT
  ) {
    score +=
      3;
  }

  if (
    buyFrequencyPct >=
    60
  ) {
    score +=
      5;
  } else if (
    buyFrequencyPct >=
    ALTCOIN_MIN_BUY_FREQUENCY_PCT
  ) {
    score +=
      2;
  }


  /* ========================================================
     EXECUTED PRICE RESPONSE
  ======================================================== */

  if (
    responsePct >=
    0.25
  ) {
    score +=
      5;
  } else if (
    responsePct >
    0
  ) {
    score +=
      2;
  }


  /* ========================================================
     2H CONTEXT

     Small modifier only.
  ======================================================== */

  if (
    twoHour
      ?.stronglyBullish
  ) {
    score +=
      5;
  } else if (
    twoHour
      ?.bullish
  ) {
    score +=
      2;
  }

  if (
    twoHour
      ?.stronglyBearish
  ) {
    score -=
      6;
  } else if (
    twoHour
      ?.bearish
  ) {
    score -=
      3;
  }


  /* ========================================================
     MARKET STRUCTURE
  ======================================================== */

  if (
    structure
      ?.direction ===
      "NAIK_KUAT"
  ) {
    score +=
      5;
  } else if (
    structure
      ?.direction ===
      "NAIK"
  ) {
    score +=
      3;
  }

  if (
    structure
      ?.support &&
    safeNumber(
      structure
        .support
        .distancePct,
      99
    ) <=
      0.75
  ) {
    score +=
      2;
  }

  if (
    structure
      ?.resistance
  ) {
    const rating =
      getResistanceRating(
        structure.resistance
      );

    if (
      rating <=
      3
    ) {
      score +=
        2;
    }

    if (
      rating >=
      8 &&
      safeNumber(
        structure
          .resistance
          .distancePct,
        99
      ) <=
        0.75
    ) {
      score -=
        8;
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
   BUILD ALTCOIN SCALPING CANDIDATE
============================================================ */

async function buildAltcoinScalpingCandidate(
  coin
) {
  if (
    !ALTCOIN_SCALPING_COINS.includes(
      coin
    )
  ) {
    return {
      allowed:
        false,

      reason:
        "INVALID ALTCOIN",
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
      allowed:
        false,

      reason:
        "TRADE OR ENTRY ALREADY ACTIVE",
    };
  }

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    return {
      allowed:
        false,

      reason:
        "TICKER UNAVAILABLE",
    };
  }

  const currentPrice =
    ticker.currentPrice;

  const momentum =
    getAltcoinMomentumContext(
      coin,
      currentPrice
    );

  const [
    structure,
    twoHour,
  ] =
    await Promise.all([
      getExecutionStructureSnapshot(
        coin,
        currentPrice
      ),

      analyze2HMarketCondition(
        coin
      ),
    ]);

  if (
    !structure
  ) {
    return {
      allowed:
        false,

      reason:
        "STRUCTURE UNAVAILABLE",
    };
  }

  const flow =
    structure.flow;

  const priceResponse =
    structure
      .priceResponse;

  if (
    !flow ||
    flow.totalCount <
      3
  ) {
    return {
      allowed:
        false,

      reason:
        "NOT ENOUGH EXECUTED FLOW",
    };
  }

  const danger =
    getAltcoinHardDanger({
      flow,
      priceResponse,
      structure,
    });

  if (
    danger.blocked
  ) {
    return {
      allowed:
        false,

      reason:
        danger.strongSellPressure
          ? "STRONG SELL PRESSURE"
          : danger.activePriceFailure
            ? "PRICE RESPONSE NEGATIVE"
            : "STRONG RESISTANCE BLOCKING",

      danger,
    };
  }

  const score =
    calculateAltcoinOpportunityScore({
      momentum,
      flow,
      priceResponse,
      structure,
      twoHour,
    });

  if (
    score <
    ALTCOIN_MIN_SCORE
  ) {
    return {
      allowed:
        false,

      reason:
        "SCORE BELOW MINIMUM",

      score,
    };
  }


  /* ========================================================
     CURRENT EVIDENCE FILTER

     Prevent 2H context alone from creating
     a stale entry.
  ======================================================== */

  const currentPositive =
    Boolean(
      momentum.change5m >
        0 ||
      momentum.change15m >=
        ALTCOIN_MIN_15M_MOVE_PCT ||
      (
        flow.buyVolumePct >=
          ALTCOIN_MIN_BUY_VOLUME_PCT &&
        priceResponse
          ?.changePct >
          0
      )
    );

  if (
    !currentPositive
  ) {
    return {
      allowed:
        false,

      reason:
        "NO CURRENT UPWARD EVIDENCE",

      score,
    };
  }

  const projection =
    calculateAltcoinProjectedReach({
      coin,

      currentPrice,

      structure,

      score,
    });

  if (
    !projection ||
    !projection.tp1
  ) {
    return {
      allowed:
        false,

      reason:
        "TP PROJECTION UNAVAILABLE",

      score,
    };
  }

  const depth =
    await chooseQuantityAwareLimitEntry({
      coin,

      technicalEntry:
        currentPrice,

      requiredQuantity:
        0,
    });

  const entryPrice =
    safeNumber(
      depth.finalEntry,
      currentPrice
    );

  if (
    depth.chasePct >
    MAX_ENTRY_CHASE_PCT
  ) {
    return {
      allowed:
        false,

      reason:
        "ENTRY CHASE TOO HIGH",

      score,

      chasePct:
        depth.chasePct,
    };
  }

  const grossRoomPct =
    percentChange(
      entryPrice,
      projection.tp1
    );

  if (
    grossRoomPct <
    ALTCOIN_MIN_PROFIT_ROOM_PCT
  ) {
    return {
      allowed:
        false,

      reason:
        "PROFIT ROOM TOO SMALL",

      score,

      grossRoomPct,
    };
  }

  const confidence =
    confidenceLabel(
      score
    );

  const risk =
    buildEntryRiskLevels({
      coin,

      entryPrice,

      room: {
        tp1:
          projection.tp1,

        tp2:
          projection.tp2,
      },

      confidence,
    });

  if (
    !risk
  ) {
    return {
      allowed:
        false,

      reason:
        "RISK LEVELS UNAVAILABLE",
    };
  }

  let setup =
    "ALTCOIN MOMENTUM";

  if (
    momentum.change5m >=
    0.50
  ) {
    setup =
      "FAST MOMENTUM";
  } else if (
    momentum.change15m >=
    0.75
  ) {
    setup =
      "15M MOMENTUM";
  } else if (
    flow.buyVolumePct >=
      65
  ) {
    setup =
      "STRONG BUY FLOW";
  }

  return {
    allowed:
      true,

    coin,

    score,

    confidence,

    setup,

    currentPrice,

    technicalEntry:
      currentPrice,

    preliminaryEntry:
      entryPrice,

    tp:
      projection.tp1,

    tp2:
      projection.tp2,

    tp2Confidence:
      projection.tp2
        ? (
            score >=
              78
              ? "MID"
              : "WEAK"
          )
        : null,

    tp2Requirement:
      projection.tp2
        ? "Momentum kekal positif dan resistance seterusnya tidak menahan harga."
        : null,

    sl:
      risk.sl,

    slPct:
      risk.slPct,

    durationHours:
      risk.durationHours,

    nextResistance:
      structure.resistance,

    roomReason:
      "GENERIC ALTCOIN PROJECTED REACH",

    roomQuality:
      grossRoomPct >=
        2.00
        ? "STRONG"
        : "GOOD",

    grossRoomPct,

    structure,

    twoHour,

    momentum,
  };
}


/* ============================================================
   SCAN ONE ALTCOIN
============================================================ */

async function scanSingleAltcoinOpportunity(
  coin
) {
  try {
    const candidate =
      await buildAltcoinScalpingCandidate(
        coin
      );

    if (
      !candidate.allowed
    ) {
      return {
        coin,

        found:
          false,

        reason:
          candidate.reason,

        score:
          candidate.score ??
          null,

        candidate,
      };
    }

    /*
       Each qualified altcoin may send its own
       alert during this scheduled scan.

       Per-coin cooldown still remains active.
    */

    const result =
      await sendScalpingEntry(
        candidate,
        {
          bypassGlobalCooldown:
            true,
        }
      );

    return {
      coin,

      found:
        Boolean(
          result
            ?.sent
        ),

      reason:
        result?.sent
          ? "OPPORTUNITY SENT"
          : result?.reason ||
            "ENTRY NOT SENT",

      candidate,

      result,
    };
  } catch (
    error
  ) {
    console.log(
      `Altcoin scanner ${coin} error:`,
      error.message
    );

    return {
      coin,

      found:
        false,

      error:
        error.message,
    };
  }
}


/* ============================================================
   RUN ALTCOIN SCALPING SCANNER

   Every 30 minutes.

   RULE:
   - No setup = no Telegram alert.
   - Qualified setup = sendScalpingEntry().
============================================================ */

async function runAltcoinScalpingScanner() {
  if (
    ALTCOIN_SCANNER_RUNTIME
      .running
  ) {
    ALTCOIN_SCANNER_RUNTIME
      .skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS ALTCOIN SCAN STILL RUNNING",
    };
  }

  ALTCOIN_SCANNER_RUNTIME
    .running =
    true;

  ALTCOIN_SCANNER_RUNTIME
    .lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const results =
      [];

    /*
       Sequential scan avoids unnecessary
       request bursts.

       Only four coins are checked.
    */

    for (
      const coin of
      ALTCOIN_SCALPING_COINS
    ) {
      const result =
        await scanSingleAltcoinOpportunity(
          coin
        );

      results.push(
        result
      );
    }

    const opportunities =
      results.filter(
        (item) =>
          item.found
      );

    const latest =
      {};

    for (
      const result of
      results
    ) {
      latest[
        result.coin
      ] =
        result;
    }

    ALTCOIN_SCANNER_RUNTIME
      .lastOpportunities =
      latest;

    ALTCOIN_SCANNER_RUNTIME
      .lastCompletedAt =
      Date.now();

    ALTCOIN_SCANNER_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

    ALTCOIN_SCANNER_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      results,

      opportunities,

      opportunityCount:
        opportunities.length,

      durationMs:
        ALTCOIN_SCANNER_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    ALTCOIN_SCANNER_RUNTIME
      .errors++;

    console.log(
      "Altcoin scanner error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    ALTCOIN_SCANNER_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   ALTCOIN SCANNER STATUS
============================================================ */

function getAltcoinScannerStatus() {
  return {
    running:
      ALTCOIN_SCANNER_RUNTIME
        .running,

    totalRuns:
      ALTCOIN_SCANNER_RUNTIME
        .totalRuns,

    skippedRuns:
      ALTCOIN_SCANNER_RUNTIME
        .skippedRuns,

    errors:
      ALTCOIN_SCANNER_RUNTIME
        .errors,

    lastStartedAt:
      ALTCOIN_SCANNER_RUNTIME
        .lastStartedAt,

    lastCompletedAt:
      ALTCOIN_SCANNER_RUNTIME
        .lastCompletedAt,

    lastDurationMs:
      ALTCOIN_SCANNER_RUNTIME
        .lastDurationMs,

    coins:
      [...ALTCOIN_SCALPING_COINS],

    intervalMinutes:
      ALTCOIN_SCALPING_SCAN_INTERVAL /
      60000,

    latest:
      ALTCOIN_SCANNER_RUNTIME
        .lastOpportunities,
  };
}


/* ============================================================
   END PART 6
============================================================ */

/* ============================================================
   PART 7 — ACTIVE TRADE MONITORING

   PURPOSE:
   - Create active trade after matched buy
   - Preserve Luno fee calculation
   - Monitor current NET P/L
   - Monitor TP1 / TP2 / SL
   - HOLD / CAUTION / SELL suggestion
   - Avoid duplicate trade alerts
   - Close trade after matched sell price
   - Produce final realised NET P/L

   IMPORTANT:
   Telegram command / callback wiring
   will be done in PART 9.
============================================================ */


/* ============================================================
   ACTIVE TRADE CONFIG
============================================================ */

const ACTIVE_TRADE_ALERT_COOLDOWN_MS =
  5 *
  60 *
  1000;

const ACTIVE_TRADE_NEAR_TP_PCT =
  0.30;

const ACTIVE_TRADE_CAUTION_LOSS_PCT =
  -0.60;


/* ============================================================
   ACTIVE TRADE RUNTIME
============================================================ */

const ACTIVE_TRADE_RUNTIME = {
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
};


/* ============================================================
   CREATE ACTIVE TRADE FROM MATCHED ORDER

   Gross matched quantity = quantity BEFORE buy fee.
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
      Number(
        matchedQuantity
      )
    ) ||
    Number(
      matchedQuantity
    ) <=
      0
  ) {
    return {
      created:
        false,

      reason:
        "INVALID MATCHED ORDER",
    };
  }

  const coin =
    state.coin ||
    entry.coin;

  if (
    !coin
  ) {
    return {
      created:
        false,

      reason:
        "COIN MISSING",
    };
  }

  const quantity =
    safeNumber(
      matchedQuantity,
      0
    );

  if (
    coin ===
      "GRT" &&
    quantity >
      MAX_GRT_SCALPING_QUANTITY
  ) {
    return {
      created:
        false,

      reason:
        "MATCHED QUANTITY ABOVE 30000 GRT",
    };
  }

  const plan =
    state.orderPlan ||
    state.finalPlan ||
    entry.orderPlan ||
    null;

  const buyPrice =
    safeNumber(
      state.matchedBuyPrice ||
      state.entryPrice ||
      plan?.entryPrice ||
      entry.preliminaryEntry ||
      entry.currentPrice,
      0
    );

  if (
    buyPrice <=
    0
  ) {
    return {
      created:
        false,

      reason:
        "BUY PRICE MISSING",
    };
  }

  const tp =
    safeNumber(
      plan?.tp ||
      entry.tp,
      0
    );

  const tp2 =
    safeNumber(
      plan?.tp2 ||
      entry.tp2,
      0
    );

  const sl =
    safeNumber(
      plan?.sl ||
      entry.sl,
      0
    );

  const buyFeeUnit =
    quantity *
    BUY_FEE;

  const netTradeUnit =
    quantity -
    buyFeeUnit;

  const totalBuyCost =
    quantity *
    buyPrice;

  const trade = {
    id:
      `${coin}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`,

    coin,

    status:
      "ACTIVE",

    createdAt:
      Date.now(),

    buyPrice,

    grossQuantity:
      quantity,

    buyFeeUnit,

    netTradeUnit,

    totalBuyCost,

    targetProfit:
      safeNumber(
        plan?.targetProfit ||
        state.targetProfit,
        0
      ),

    tp:
      tp >
        0
        ? tp
        : null,

    tp2:
      tp2 >
        0
        ? tp2
        : null,

    sl:
      sl >
        0
        ? sl
        : null,

    confidence:
      plan?.confidence ||
      entry.confidence ||
      "WEAK",

    setup:
      plan?.setup ||
      entry.setup ||
      "SCALPING",

    roomQuality:
      plan?.roomQuality ||
      entry.roomQuality ||
      null,

    durationHours:
      entry.durationHours ||
      null,

    tp1Hit:
      false,

    tp1HitAt:
      null,

    tp2Hit:
      false,

    tp2HitAt:
      null,

    slTouched:
      false,

    slTouchedAt:
      null,

    peakPrice:
      buyPrice,

    lowestPrice:
      buyPrice,

    peakNetProfit:
      null,

    worstNetProfit:
      null,

    lastPrice:
      buyPrice,

    lastNetProfit:
      null,

    lastNetProfitPct:
      null,

    lastAction:
      "HOLD",

    lastActionReason:
      "TRADE STARTED",

    lastAlertType:
      null,

    lastAlertAt:
      0,

    sellPrice:
      null,

    soldAt:
      null,

    realised:
      null,
  };

  ACTIVE_TRADES[
    coin
  ] =
    trade;

  return {
    created:
      true,

    trade,
  };
}


/* ============================================================
   CURRENT ACTIVE TRADE P/L

   Calculates current NET value if position
   were sold at supplied current price.
============================================================ */

function calculateActiveTradePnL(
  trade,
  currentPrice
) {
  if (
    !trade
  ) {
    return null;
  }

  const price =
    safeNumber(
      currentPrice,
      0
    );

  if (
    price <=
    0
  ) {
    return null;
  }

  return calculateTradeAfterFees({
    quantity:
      trade.grossQuantity,

    entryPrice:
      trade.buyPrice,

    sellPrice:
      price,
  });
}


/* ============================================================
   DISTANCE TO PRICE TARGET
============================================================ */

function getDistanceToTarget(
  currentPrice,
  targetPrice
) {
  const current =
    safeNumber(
      currentPrice,
      0
    );

  const target =
    safeNumber(
      targetPrice,
      0
    );

  if (
    current <=
      0 ||
    target <=
      0
  ) {
    return null;
  }

  const priceDistance =
    target -
    current;

  const pct =
    percentChange(
      current,
      target
    );

  return {
    priceDistance,

    pct,

    reached:
      current >=
      target,
  };
}


/* ============================================================
   ACTIVE TRADE DECISION

   IMPORTANT:
   This is NOT an automatic market sell.

   Output:
   HOLD
   CAUTION
   TAKE_PROFIT
   EXIT
============================================================ */

function getActiveTradeDecision({
  trade,
  currentPrice,
  pnl,
}) {
  if (
    !trade ||
    !pnl
  ) {
    return {
      action:
        "HOLD",

      reason:
        "INSUFFICIENT DATA",
    };
  }

  const price =
    safeNumber(
      currentPrice,
      0
    );

  const netPct =
    safeNumber(
      pnl.netProfitPct,
      0
    );


  /* ========================================================
     SL — HIGHEST PRIORITY DANGER
  ======================================================== */

  if (
    trade.sl &&
    price <=
      trade.sl
  ) {
    return {
      action:
        "EXIT",

      reason:
        "SL LEVEL REACHED",
    };
  }


  /* ========================================================
     TP2 BEFORE TP1
  ======================================================== */

  if (
    trade.tp2 &&
    price >=
      trade.tp2
  ) {
    return {
      action:
        "TAKE_PROFIT",

      reason:
        "TP2 REACHED",
    };
  }

  if (
    trade.tp &&
    price >=
      trade.tp
  ) {
    return {
      action:
        "TAKE_PROFIT",

      reason:
        "TP1 REACHED",
    };
  }


  /* ========================================================
     CAUTION
  ======================================================== */

  if (
    netPct <=
    ACTIVE_TRADE_CAUTION_LOSS_PCT
  ) {
    return {
      action:
        "CAUTION",

      reason:
        "NET LOSS INCREASING",
    };
  }


  /* ========================================================
     NEAR TP1
  ======================================================== */

  if (
    trade.tp &&
    price <
      trade.tp
  ) {
    const distance =
      percentChange(
        price,
        trade.tp
      );

    if (
      distance >=
        0 &&
      distance <=
        ACTIVE_TRADE_NEAR_TP_PCT
    ) {
      return {
        action:
          "HOLD",

        reason:
          "NEAR TP1",
      };
    }
  }

  return {
    action:
      "HOLD",

    reason:
      pnl.netProfit >=
        0
        ? "POSITION PROFITABLE"
        : "WAITING FOR RECOVERY",
  };
}


/* ============================================================
   UPDATE ACTIVE TRADE RUNTIME
============================================================ */

function updateActiveTradeRuntime({
  trade,
  currentPrice,
  pnl,
  decision,
}) {
  if (
    !trade
  ) {
    return;
  }

  const price =
    safeNumber(
      currentPrice,
      0
    );

  if (
    price <=
    0
  ) {
    return;
  }

  trade.lastPrice =
    price;

  trade.peakPrice =
    Math.max(
      safeNumber(
        trade.peakPrice,
        price
      ),
      price
    );

  trade.lowestPrice =
    Math.min(
      safeNumber(
        trade.lowestPrice,
        price
      ),
      price
    );

  if (
    pnl
  ) {
    trade.lastNetProfit =
      pnl.netProfit;

    trade.lastNetProfitPct =
      pnl.netProfitPct;

    if (
      trade.peakNetProfit ===
        null ||
      pnl.netProfit >
        trade.peakNetProfit
    ) {
      trade.peakNetProfit =
        pnl.netProfit;
    }

    if (
      trade.worstNetProfit ===
        null ||
      pnl.netProfit <
        trade.worstNetProfit
    ) {
      trade.worstNetProfit =
        pnl.netProfit;
    }
  }

  if (
    trade.tp &&
    !trade.tp1Hit &&
    price >=
      trade.tp
  ) {
    trade.tp1Hit =
      true;

    trade.tp1HitAt =
      Date.now();
  }

  if (
    trade.tp2 &&
    !trade.tp2Hit &&
    price >=
      trade.tp2
  ) {
    trade.tp2Hit =
      true;

    trade.tp2HitAt =
      Date.now();
  }

  if (
    trade.sl &&
    !trade.slTouched &&
    price <=
      trade.sl
  ) {
    trade.slTouched =
      true;

    trade.slTouchedAt =
      Date.now();
  }

  if (
    decision
  ) {
    trade.lastAction =
      decision.action;

    trade.lastActionReason =
      decision.reason;
  }
}


/* ============================================================
   ACTIVE TRADE ALERT GUARD

   Alert only when:
   - action changes
   - TP1 newly hit
   - TP2 newly hit
   - SL newly touched
   - near TP state appears
============================================================ */

function shouldSendActiveTradeAlert({
  trade,
  decision,
  previous,
}) {
  if (
    !trade ||
    !decision
  ) {
    return {
      send:
        false,

      type:
        null,
    };
  }

  let type =
    null;

  if (
    trade.tp2Hit &&
    !previous.tp2Hit
  ) {
    type =
      "TP2_HIT";
  } else if (
    trade.tp1Hit &&
    !previous.tp1Hit
  ) {
    type =
      "TP1_HIT";
  } else if (
    trade.slTouched &&
    !previous.slTouched
  ) {
    type =
      "SL_TOUCHED";
  } else if (
    decision.action !==
    previous.lastAction
  ) {
    type =
      `ACTION_${decision.action}`;
  } else if (
    decision.reason ===
      "NEAR TP1" &&
    previous.lastActionReason !==
      "NEAR TP1"
  ) {
    type =
      "NEAR_TP1";
  }

  if (
    !type
  ) {
    return {
      send:
        false,

      type:
        null,
    };
  }

  const critical =
    [
      "TP1_HIT",
      "TP2_HIT",
      "SL_TOUCHED",
    ].includes(
      type
    );

  if (
    !critical &&
    trade.lastAlertAt &&
    Date.now() -
      trade.lastAlertAt <
      ACTIVE_TRADE_ALERT_COOLDOWN_MS
  ) {
    return {
      send:
        false,

      type,

      reason:
        "ALERT COOLDOWN",
    };
  }

  return {
    send:
      true,

    type,
  };
}


/* ============================================================
   BUILD ACTIVE TRADE MESSAGE
============================================================ */

function buildActiveTradeMonitorMessage({
  trade,
  currentPrice,
  pnl,
  decision,
}) {
  if (
    !trade ||
    !pnl ||
    !decision
  ) {
    return null;
  }

  const pnlEmoji =
    pnl.netProfit >=
      0
      ? "🟢"
      : "🔴";

  let actionEmoji =
    "🟢";

  if (
    decision.action ===
    "CAUTION"
  ) {
    actionEmoji =
      "🟡";
  }

  if (
    decision.action ===
      "TAKE_PROFIT" ||
    decision.action ===
      "EXIT"
  ) {
    actionEmoji =
      "🔴";
  }

  const tp1Distance =
    trade.tp
      ? getDistanceToTarget(
          currentPrice,
          trade.tp
        )
      : null;

  const tp2Distance =
    trade.tp2
      ? getDistanceToTarget(
          currentPrice,
          trade.tp2
        )
      : null;

  const breakEvenPrice =
    calculateBreakEvenPrice(
      trade.buyPrice
    );

  const breakEvenDistance =
    breakEvenPrice
      ? getDistanceToTarget(
          currentPrice,
          breakEvenPrice
        )
      : null;

  const tp1Text =
    trade.tp
      ? `RM${formatPrice(
          trade.coin,
          trade.tp
        )}`
      : "N/A";

  const tp2Text =
    trade.tp2
      ? `RM${formatPrice(
          trade.coin,
          trade.tp2
        )}`
      : "N/A";

  return `📈 ACTIVE TRADE MONITOR

🪙 ${trade.coin}

━━━━━━━━━━━━━━

📌 POSITION

💵 Entry:
RM${formatPrice(
    trade.coin,
    trade.buyPrice
  )}

📦 Gross Quantity:
${trade.grossQuantity.toLocaleString(
    "en-MY"
  )}

💳 Modal:
RM${trade.totalBuyCost.toFixed(
    2
  )}

━━━━━━━━━━━━━━

📊 CURRENT

💵 Current Price:
RM${formatPrice(
    trade.coin,
    currentPrice
  )}

${pnlEmoji} Current NET P/L:
RM${pnl.netProfit.toFixed(
    2
  )} (${formatPercent(
    pnl.netProfitPct
  )})

━━━━━━━━━━━━━━

⚖️ Break Even:
${
  breakEvenPrice
    ? `RM${formatPrice(
        trade.coin,
        breakEvenPrice
      )}`
    : "N/A"
}

📏 Distance to Break Even:
${
  !breakEvenDistance
    ? "N/A"
    : breakEvenDistance.reached
      ? "✅ DAH LEPAS BREAK EVEN"
      : `${formatPercent(
          breakEvenDistance.pct
        )}`
}

━━━━━━━━━━━━━━

🎯 TP1:
${tp1Text}

📏 Distance TP1:
${
  !tp1Distance
    ? "N/A"
    : tp1Distance.reached
      ? "✅ REACHED"
      : formatPercent(
          tp1Distance.pct
        )
}

🚀 TP2:
${tp2Text}

📏 Distance TP2:
${
  !tp2Distance
    ? "N/A"
    : tp2Distance.reached
      ? "✅ REACHED"
      : formatPercent(
          tp2Distance.pct
        )
}

🛑 SL:
${
  trade.sl
    ? `RM${formatPrice(
        trade.coin,
        trade.sl
      )}`
    : "N/A"
}

━━━━━━━━━━━━━━

${actionEmoji} ACTION:
${decision.action}

🧠 Reason:
${decision.reason}`;
}


/* ============================================================
   MONITOR ONE ACTIVE TRADE
============================================================ */

async function monitorSingleActiveTrade(
  coin
) {
  const trade =
    ACTIVE_TRADES[
      coin
    ];

  if (
    !trade ||
    trade.status !==
      "ACTIVE"
  ) {
    return {
      monitored:
        false,

      reason:
        "NO ACTIVE TRADE",
    };
  }

  const ticker =
    await getTicker(
      coin
    );

  if (
    !ticker
  ) {
    return {
      monitored:
        false,

      reason:
        "TICKER UNAVAILABLE",
    };
  }

  const currentPrice =
    ticker.currentPrice;

  const pnl =
    calculateActiveTradePnL(
      trade,
      currentPrice
    );

  if (
    !pnl
  ) {
    return {
      monitored:
        false,

      reason:
        "PNL UNAVAILABLE",
    };
  }

  const previous = {
    tp1Hit:
      trade.tp1Hit,

    tp2Hit:
      trade.tp2Hit,

    slTouched:
      trade.slTouched,

    lastAction:
      trade.lastAction,

    lastActionReason:
      trade.lastActionReason,
  };

  const decision =
    getActiveTradeDecision({
      trade,
      currentPrice,
      pnl,
    });

  updateActiveTradeRuntime({
    trade,
    currentPrice,
    pnl,
    decision,
  });

  const alert =
    shouldSendActiveTradeAlert({
      trade,
      decision,
      previous,
    });

  let sent =
    false;

  if (
    alert.send
  ) {
    const message =
      buildActiveTradeMonitorMessage({
        trade,
        currentPrice,
        pnl,
        decision,
      });

    if (
      message
    ) {
      const result =
        await sendTelegram(
          message
        );

      sent =
        Boolean(
          result
        );

      if (
        sent
      ) {
        trade.lastAlertType =
          alert.type;

        trade.lastAlertAt =
          Date.now();
      }
    }
  }

  return {
    monitored:
      true,

    coin,

    currentPrice,

    pnl,

    decision,

    alertSent:
      sent,

    alertType:
      alert.type ||
      null,

    trade,
  };
}


/* ============================================================
   RUN ACTIVE TRADE MONITOR

   Scheduled every 15 seconds in PART 10.
============================================================ */

async function runActiveTradeMonitor() {
  if (
    ACTIVE_TRADE_RUNTIME
      .running
  ) {
    ACTIVE_TRADE_RUNTIME
      .skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS TRADE MONITOR STILL RUNNING",
    };
  }

  ACTIVE_TRADE_RUNTIME
    .running =
    true;

  ACTIVE_TRADE_RUNTIME
    .lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const coins =
      Object.keys(
        ACTIVE_TRADES
      );

    const results =
      [];

    for (
      const coin of
      coins
    ) {
      const result =
        await monitorSingleActiveTrade(
          coin
        );

      results.push(
        result
      );
    }

    ACTIVE_TRADE_RUNTIME
      .lastCompletedAt =
      Date.now();

    ACTIVE_TRADE_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

    ACTIVE_TRADE_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      activeTrades:
        coins.length,

      results,

      durationMs:
        ACTIVE_TRADE_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    ACTIVE_TRADE_RUNTIME
      .errors++;

    console.log(
      "Active trade monitor error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    ACTIVE_TRADE_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   ACTIVE TRADE MONITOR STATUS
============================================================ */

function getActiveTradeMonitorStatus() {
  return {
    running:
      ACTIVE_TRADE_RUNTIME
        .running,

    totalRuns:
      ACTIVE_TRADE_RUNTIME
        .totalRuns,

    skippedRuns:
      ACTIVE_TRADE_RUNTIME
        .skippedRuns,

    errors:
      ACTIVE_TRADE_RUNTIME
        .errors,

    lastStartedAt:
      ACTIVE_TRADE_RUNTIME
        .lastStartedAt,

    lastCompletedAt:
      ACTIVE_TRADE_RUNTIME
        .lastCompletedAt,

    lastDurationMs:
      ACTIVE_TRADE_RUNTIME
        .lastDurationMs,

    activeTrades:
      Object.keys(
        ACTIVE_TRADES
      ).length,
  };
}


/* ============================================================
   GET ACTIVE TRADE CURRENT SNAPSHOT
============================================================ */

async function getActiveTradeSnapshot(
  coin
) {
  const trade =
    ACTIVE_TRADES[
      coin
    ];

  if (
    !trade
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
    return {
      trade,

      ticker:
        null,

      pnl:
        null,

      decision:
        null,
    };
  }

  const pnl =
    calculateActiveTradePnL(
      trade,
      ticker.currentPrice
    );

  const decision =
    pnl
      ? getActiveTradeDecision({
          trade,

          currentPrice:
            ticker.currentPrice,

          pnl,
        })
      : null;

  return {
    trade,

    ticker,

    pnl,

    decision,
  };
}


/* ============================================================
   CLOSE ACTIVE TRADE

   User supplies ACTUAL matched sell price.

   IMPORTANT:
   Realised P/L uses actual matched sell price.

   NOT:
   - TP reference
   - current ticker price
   - estimated sell price
============================================================ */

function closeActiveTrade({
  coin,
  matchedSellPrice,
}) {
  const trade =
    ACTIVE_TRADES[
      coin
    ];

  if (
    !trade
  ) {
    return {
      closed:
        false,

      reason:
        "ACTIVE TRADE NOT FOUND",
    };
  }

  const sellPrice =
    safeNumber(
      matchedSellPrice,
      0
    );

  if (
    sellPrice <=
    0
  ) {
    return {
      closed:
        false,

      reason:
        "INVALID SELL PRICE",
    };
  }

  const realised =
    calculateTradeAfterFees({
      quantity:
        trade.grossQuantity,

      entryPrice:
        trade.buyPrice,

      sellPrice,
    });

  if (
    !realised
  ) {
    return {
      closed:
        false,

      reason:
        "REALIZED PNL CALCULATION FAILED",
    };
  }

  trade.status =
    "CLOSED";

  trade.sellPrice =
    sellPrice;

  trade.soldAt =
    Date.now();

  trade.realised =
    realised;

  const closedTrade = {
    ...trade,
  };

  delete ACTIVE_TRADES[
    coin
  ];

  return {
    closed:
      true,

    trade:
      closedTrade,

    realised,
  };
}


/* ============================================================
   FINAL CLOSED TRADE MESSAGE
============================================================ */

function buildClosedTradeMessage(
  result
) {
  if (
    !result
      ?.closed ||
    !result.trade ||
    !result.realised
  ) {
    return null;
  }

  const trade =
    result.trade;

  const realised =
    result.realised;

  const emoji =
    realised.netProfit >=
      0
      ? "🟢"
      : "🔴";

  const durationMs =
    safeNumber(
      trade.soldAt,
      Date.now()
    ) -
    safeNumber(
      trade.createdAt,
      Date.now()
    );

  const durationMinutes =
    Math.max(
      0,
      durationMs /
        60000
    );

  return `✅ TRADE CLOSED

🪙 ${trade.coin}

━━━━━━━━━━━━━━

💵 Buy Price:
RM${formatPrice(
    trade.coin,
    trade.buyPrice
  )}

💵 Matched Sell:
RM${formatPrice(
    trade.coin,
    trade.sellPrice
  )}

📦 Gross Quantity:
${trade.grossQuantity.toLocaleString(
    "en-MY"
  )}

💳 Modal:
RM${trade.totalBuyCost.toFixed(
    2
  )}

━━━━━━━━━━━━━━

${emoji} REALISED NET P/L:

RM${realised.netProfit.toFixed(
    2
  )}

${formatPercent(
    realised.netProfitPct
  )}

━━━━━━━━━━━━━━

⏱ Trade Duration:
${durationMinutes.toFixed(
    0
  )} min

🧠 Setup:
${trade.setup}

📊 Confidence:
${trade.confidence}`;
}


/* ============================================================
   END PART 7
============================================================ */
/* ============================================================
   PART 8 — ALERTS + REPORTS

   PURPOSE:
   - BTC + GRT rolling Price Alert
   - BTC 15M market context
   - GRT 5M / 15M / 1H movement
   - Natural GRT movement classification
   - Market structure alert
   - 2H flow report
   - GRT 24H / daily report
   - User-friendly formatting
   - No raw JSON dump
============================================================ */


/* ============================================================
   PRICE ALERT CONFIG

   Rolling timeframe.
   NOT candle close.

   BTC:
   15M threshold ±0.20%

   GRT:
   5M  threshold ±0.10%
   15M threshold ±0.20%
   1H   threshold ±0.40%
============================================================ */

const BTC_PRICE_ALERT_15M_THRESHOLD_PCT =
  0.20;

const GRT_PRICE_ALERT_5M_THRESHOLD_PCT =
  0.10;

const GRT_PRICE_ALERT_15M_THRESHOLD_PCT =
  0.20;

const GRT_PRICE_ALERT_1H_THRESHOLD_PCT =
  0.40;


/* ============================================================
   PRICE ALERT RUNTIME
============================================================ */

const PRICE_ALERT_RUNTIME = {
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
};


/* ============================================================
   MARKET STRUCTURE ALERT RUNTIME
============================================================ */

const MARKET_STRUCTURE_RUNTIME = {
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
};


/* ============================================================
   ROLLING MOVE STATE

   Returns:
   UP
   DOWN
   NEUTRAL
   BUILDING
============================================================ */

function classifyRollingMove(
  rolling,
  thresholdPct
) {
  if (
    !rolling ||
    !rolling.ready
  ) {
    return "BUILDING";
  }

  const change =
    safeNumber(
      rolling.changePct,
      0
    );

  if (
    change >=
    thresholdPct
  ) {
    return "UP";
  }

  if (
    change <=
    -thresholdPct
  ) {
    return "DOWN";
  }

  return "NEUTRAL";
}


/* ============================================================
   FORMAT ROLLING PRICE MOVEMENT
============================================================ */

function formatRollingPriceMove(
  rolling,
  thresholdPct
) {
  if (
    !rolling ||
    !rolling.ready
  ) {
    return "BUILDING 🩶";
  }

  const change =
    safeNumber(
      rolling.changePct,
      0
    );

  const state =
    classifyRollingMove(
      rolling,
      thresholdPct
    );

  let emoji =
    "🩶";

  if (
    state ===
    "UP"
  ) {
    emoji =
      "🟢";
  } else if (
    state ===
    "DOWN"
  ) {
    emoji =
      "🔴";
  }

  return `${formatPercent(
    change
  )} ${emoji}`;
}


/* ============================================================
   BTC 15M DIRECTION
============================================================ */

function getBTC15mDirection(
  rolling15m
) {
  const state =
    classifyRollingMove(
      rolling15m,
      BTC_PRICE_ALERT_15M_THRESHOLD_PCT
    );

  if (
    state ===
    "UP"
  ) {
    return "📈 NAIK";
  }

  if (
    state ===
    "DOWN"
  ) {
    return "📉 DROP";
  }

  if (
    state ===
    "BUILDING"
  ) {
    return "🩶 BUILDING DATA";
  }

  return "↔️ SIDEWAY";
}


/* ============================================================
   NATURAL GRT MOVEMENT LABEL

   Rules:

   5M UP + 15M neutral/down + 1H neutral/down
   → MULA NAIK

   5M UP + 15M UP + 1H neutral/down
   → SEDANG NAIK

   5M UP + 15M UP + 1H UP
   → TELAH NAIK

   5M DOWN + 15M UP + 1H UP
   → TURUN SEKETIKA

   5M DOWN + 15M DOWN + 1H neutral/up
   → SEDANG DROP

   5M DOWN + 15M DOWN + 1H DOWN
   → DROP LAJU
============================================================ */

function getGRTNaturalMovementLabel({
  rolling5m,
  rolling15m,
  rolling1h,
}) {
  const state5m =
    classifyRollingMove(
      rolling5m,
      GRT_PRICE_ALERT_5M_THRESHOLD_PCT
    );

  const state15m =
    classifyRollingMove(
      rolling15m,
      GRT_PRICE_ALERT_15M_THRESHOLD_PCT
    );

  const state1h =
    classifyRollingMove(
      rolling1h,
      GRT_PRICE_ALERT_1H_THRESHOLD_PCT
    );

  if (
    [
      state5m,
      state15m,
      state1h,
    ].includes(
      "BUILDING"
    )
  ) {
    return {
      state:
        "BUILDING",

      text:
        "🩶 BUILDING DATA",
    };
  }


  /* ========================================================
     STRONG / CONFIRMED RISE
  ======================================================== */

  if (
    state5m ===
      "UP" &&
    state15m ===
      "UP" &&
    state1h ===
      "UP"
  ) {
    return {
      state:
        "TELAH_NAIK",

      text:
        "🟢 TELAH NAIK",
    };
  }


  /* ========================================================
     MID-STAGE RISE
  ======================================================== */

  if (
    state5m ===
      "UP" &&
    state15m ===
      "UP" &&
    state1h !==
      "UP"
  ) {
    return {
      state:
        "SEDANG_NAIK",

      text:
        "🟠 SEDANG NAIK",
    };
  }


  /* ========================================================
     EARLY RISE
  ======================================================== */

  if (
    state5m ===
      "UP" &&
    state15m !==
      "UP"
  ) {
    return {
      state:
        "MULA_NAIK",

      text:
        "🟡 MULA NAIK",
    };
  }


  /* ========================================================
     SHORT PULLBACK IN BULLISH STRUCTURE
  ======================================================== */

  if (
    state5m ===
      "DOWN" &&
    state15m ===
      "UP" &&
    state1h ===
      "UP"
  ) {
    return {
      state:
        "TURUN_SEKETIKA",

      text:
        "🟡 TURUN SEKETIKA",
    };
  }


  /* ========================================================
     FAST / CONFIRMED DROP
  ======================================================== */

  if (
    state5m ===
      "DOWN" &&
    state15m ===
      "DOWN" &&
    state1h ===
      "DOWN"
  ) {
    return {
      state:
        "DROP_LAJU",

      text:
        "🔴 DROP LAJU",
    };
  }


  /* ========================================================
     DEVELOPING DROP
  ======================================================== */

  if (
    state5m ===
      "DOWN" &&
    state15m ===
      "DOWN"
  ) {
    return {
      state:
        "SEDANG_DROP",

      text:
        "🔴 SEDANG DROP",
    };
  }


  /* ========================================================
     5M NEUTRAL WHILE HIGHER TF STILL POSITIVE
  ======================================================== */

  if (
    state5m ===
      "NEUTRAL" &&
    (
      state15m ===
        "UP" ||
      state1h ===
        "UP"
    )
  ) {
    return {
      state:
        "NAIK_BERTAHAN",

      text:
        "🟢 NAIK MASIH BERTAHAN",
    };
  }


  /* ========================================================
     5M NEUTRAL WHILE HIGHER TF NEGATIVE
  ======================================================== */

  if (
    state5m ===
      "NEUTRAL" &&
    (
      state15m ===
        "DOWN" ||
      state1h ===
        "DOWN"
    )
  ) {
    return {
      state:
        "DROP_BERTAHAN",

      text:
        "🔴 TEKANAN DROP MASIH ADA",
    };
  }

  return {
    state:
      "SIDEWAY",

    text:
      "🩶 SIDEWAY SEKETIKA",
  };
}


/* ============================================================
   GRT DAILY WATCH HELPERS
============================================================ */

function getMalaysiaDateParts(
  date =
    new Date()
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

  const values =
    {};

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
  date =
    new Date()
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
   CREATE DAILY WATCH STATE
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


/* ============================================================
   ENSURE DAILY WATCH STATE
============================================================ */

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


/* ============================================================
   UPDATE DAILY WATCH PRICE
============================================================ */

function updateDailyWatchPrice(
  coin,
  price
) {
  const value =
    safeNumber(
      price,
      0
    );

  if (
    value <=
    0
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
        value;
    }

    state.grtClose =
      value;

    state.grtHigh =
      state.grtHigh ===
        null
        ? value
        : Math.max(
            state.grtHigh,
            value
          );

    state.grtLow =
      state.grtLow ===
        null
        ? value
        : Math.min(
            state.grtLow,
            value
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
        value;
    }

    state.btcClose =
      value;
  }
}


/* ============================================================
   UPDATE DAILY WATCH TRADE
============================================================ */

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
    state.buyExecutions++;

    state.buyVolume +=
      safeNumber(
        trade.volume,
        0
      );
  } else {
    state.sellExecutions++;

    state.sellVolume +=
      safeNumber(
        trade.volume,
        0
      );
  }
}


/* ============================================================
   DAILY ROLLOVER
============================================================ */

async function checkDailyWatchRollover() {
  const today =
    getMalaysiaDateKey();

  if (
    !GRT_DAILY_STATE
  ) {
    GRT_DAILY_STATE =
      createDailyWatchState(
        today
      );

    return {
      rolled:
        false,

      reason:
        "INITIALIZED",
    };
  }

  if (
    GRT_DAILY_STATE
      .dateKey ===
    today
  ) {
    return {
      rolled:
        false,

      reason:
        "SAME DAY",
    };
  }

  const completed = {
    ...GRT_DAILY_STATE,
  };

  GRT_DAILY_HISTORY.push(
    completed
  );

  if (
    GRT_DAILY_HISTORY.length >
    GRT_DAILY_HISTORY_DAYS
  ) {
    GRT_DAILY_HISTORY =
      GRT_DAILY_HISTORY.slice(
        -GRT_DAILY_HISTORY_DAYS
      );
  }

  GRT_DAILY_STATE =
    createDailyWatchState(
      today
    );

  return {
    rolled:
      true,

    previous:
      completed,

    current:
      GRT_DAILY_STATE,
  };
}


/* ============================================================
   SAVE DAILY WATCH
============================================================ */

function saveDailyWatchState() {
  try {
    const payload = {
      current:
        GRT_DAILY_STATE,

      history:
        GRT_DAILY_HISTORY,

      lastDailyReportKey:
        LAST_DAILY_REPORT_KEY,
    };

    fs.writeFileSync(
      DAILY_WATCH_FILE,
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    return true;
  } catch (
    error
  ) {
    console.log(
      "Daily watch save error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   LOAD DAILY WATCH
============================================================ */

function loadDailyWatchState() {
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

    const data =
      JSON.parse(
        raw
      );

    if (
      data?.current
    ) {
      GRT_DAILY_STATE =
        data.current;
    }

    if (
      Array.isArray(
        data?.history
      )
    ) {
      GRT_DAILY_HISTORY =
        data.history;
    }

    if (
      data?.lastDailyReportKey
    ) {
      LAST_DAILY_REPORT_KEY =
        data.lastDailyReportKey;
    }

    return true;
  } catch (
    error
  ) {
    console.log(
      "Daily watch load error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   PRICE ALERT SNAPSHOT — BTC

   New format:
   - Current price
   - Rolling 15M only
   - Direction

   BTC BUY SURGE remains available internally,
   but is NOT displayed in compact Price Alert.
============================================================ */

async function getBTCPriceAlertSnapshot() {
  const ticker =
    await getTicker(
      "BTC"
    );

  if (
    !ticker
  ) {
    return {
      section:
        `₿ BTC
⚠️ DATA UNAVAILABLE`,
    };
  }

  updatePriceMemory(
    "BTC",
    ticker.currentPrice
  );

  updateDailyWatchPrice(
    "BTC",
    ticker.currentPrice
  );

  const rolling15m =
    getRollingPriceChange(
      "BTC",
      ticker.currentPrice,
      FIFTEEN_MINUTES
    );

  /*
     Keep old BTC surge engine alive internally.
     Price Alert no longer needs to display it.
  */

  const surge =
    await getBTCBuySurge();

  const direction =
    getBTC15mDirection(
      rolling15m
    );

  return {
    ticker,

    rolling15m,

    change15m:
      safeNumber(
        rolling15m
          ?.changePct,
        0
      ),

    direction,

    surge,

    section:
      `₿ BTC RM${formatPrice(
        "BTC",
        ticker.currentPrice
      )}
15M : ${formatRollingPriceMove(
        rolling15m,
        BTC_PRICE_ALERT_15M_THRESHOLD_PCT
      )}  ${direction}`,
  };
}


/* ============================================================
   PRICE ALERT SNAPSHOT — GRT

   Rolling:
   - 5M
   - 15M
   - 1H

   Natural movement classification is separate
   from PART 4 Momentum Decision.
============================================================ */

async function getGRTPriceAlertSnapshot(
  suppliedSnapshot =
    null
) {
  const snapshot =
    suppliedSnapshot ||
    await getGRTMomentumSnapshot();

  const ticker =
    snapshot
      ?.ticker ||
    null;

  const decision =
    snapshot
      ?.decision ||
    null;

  const normalized =
    snapshot
      ?.normalized ||
    normalizeGRTDecision(
      decision
    );

  if (
    !ticker
  ) {
    return {
      section:
        `🪙 GRT
⚠️ DATA UNAVAILABLE`,
    };
  }

  updatePriceMemory(
    "GRT",
    ticker.currentPrice
  );

  updateDailyWatchPrice(
    "GRT",
    ticker.currentPrice
  );

  const rolling5m =
    getRollingPriceChange(
      "GRT",
      ticker.currentPrice,
      FIVE_MINUTES
    );

  const rolling15m =
    getRollingPriceChange(
      "GRT",
      ticker.currentPrice,
      FIFTEEN_MINUTES
    );

  const rolling1h =
    getRollingPriceChange(
      "GRT",
      ticker.currentPrice,
      ONE_HOUR
    );

  const movement =
    getGRTNaturalMovementLabel({
      rolling5m,
      rolling15m,
      rolling1h,
    });

  let momentumText =
    normalized
      ?.directionText ||
    decision
      ?.directionText ||
    "";

  if (
    !momentumText
  ) {
    momentumText =
      normalized
        ?.text ||
      "🩶 WAITING";
  }

  let verifyingText =
    "";

  if (
    normalized
      ?.validating
  ) {
    verifyingText =
      "\n🔎 VERIFYING...";
  }

  return {
    ticker,

    decision,

    normalized,

    rolling5m,

    rolling15m,

    rolling1h,

    movement,

    section:
      `🪙 GRT RM${formatPrice(
        "GRT",
        ticker.currentPrice
      )}
5M  : ${formatRollingPriceMove(
        rolling5m,
        GRT_PRICE_ALERT_5M_THRESHOLD_PCT
      )}
15M : ${formatRollingPriceMove(
        rolling15m,
        GRT_PRICE_ALERT_15M_THRESHOLD_PCT
      )}
1H  : ${formatRollingPriceMove(
        rolling1h,
        GRT_PRICE_ALERT_1H_THRESHOLD_PCT
      )}
${movement.text}

⚡ MOMENTUM: ${momentumText}${verifyingText}`,
  };
}


/* ============================================================
   RUN PRICE ALERT
============================================================ */

async function runPriceAlert() {
  if (
    PRICE_ALERT_RUNTIME
      .running
  ) {
    PRICE_ALERT_RUNTIME
      .skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS PRICE ALERT STILL RUNNING",
    };
  }

  PRICE_ALERT_RUNTIME
    .running =
    true;

  PRICE_ALERT_RUNTIME
    .lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const grtSnapshot =
      await getGRTMomentumSnapshot();

    const [
      btcAlert,
      grtAlert,
    ] =
      await Promise.all([
        getBTCPriceAlertSnapshot(),

        getGRTPriceAlertSnapshot(
          grtSnapshot
        ),
      ]);

    const message =
      `🚨 PRICE ALERT

${btcAlert.section}
━━━━━━━━━━━━━━━━━━
${grtAlert.section}`;

    const sent =
      await sendTelegram(
        message
      );

    PRICE_ALERT_RUNTIME
      .lastCompletedAt =
      Date.now();

    PRICE_ALERT_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

    PRICE_ALERT_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      sent:
        Boolean(
          sent
        ),

      btc:
        btcAlert,

      grt:
        grtAlert,

      durationMs:
        PRICE_ALERT_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    PRICE_ALERT_RUNTIME
      .errors++;

    console.log(
      "Price alert error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    PRICE_ALERT_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   RUN MARKET STRUCTURE ALERT

   NOTE:
   Current Luno structure remains fully active.

   GLOBAL LEAD is NOT fabricated here.
   External global market source will only be
   connected once a real exchange source/API
   is configured.
============================================================ */

async function runMarketStructureAlert() {
  if (
    MARKET_STRUCTURE_RUNTIME
      .running
  ) {
    MARKET_STRUCTURE_RUNTIME
      .skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS STRUCTURE ALERT STILL RUNNING",
    };
  }

  MARKET_STRUCTURE_RUNTIME
    .running =
    true;

  MARKET_STRUCTURE_RUNTIME
    .lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const [
      btc,
      grt,
      grtSnapshot,
    ] =
      await Promise.all([
        getMarketStructureSnapshot(
          "BTC"
        ),

        getMarketStructureSnapshot(
          "GRT"
        ),

        getGRTMomentumSnapshot(),
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
      const normalized =
        grtSnapshot
          ?.normalized ||
        normalizeGRTDecision(
          grtSnapshot
            ?.decision
        );

      const grtSection =
        `${buildMarketStructureSection(
          grt
        )}

⚡ Momentum:
${normalized.text}

${normalized.directionText}

🧠 Kriteria:
${normalized.criteria ||
  "MARKET REFERENCE"}`;

      sections.push(
        grtSection
      );
    }

    if (
      !sections.length
    ) {
      return {
        skipped:
          false,

        sent:
          false,

        reason:
          "NO STRUCTURE DATA",
      };
    }

    const message =
      `📊 MARKET STRUCTURE UPDATE

${sections.join(
        "\n\n━━━━━━━━━━━━━━━━━━\n\n"
      )}`;

    const sent =
      await sendTelegram(
        message
      );

    MARKET_STRUCTURE_RUNTIME
      .lastCompletedAt =
      Date.now();

    MARKET_STRUCTURE_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

    MARKET_STRUCTURE_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      sent:
        Boolean(
          sent
        ),

      btc,

      grt,

      durationMs:
        MARKET_STRUCTURE_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    MARKET_STRUCTURE_RUNTIME
      .errors++;

    console.log(
      "Market structure alert error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    MARKET_STRUCTURE_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   BUILD 2H FLOW REPORT
============================================================ */

async function build2HFlowReport() {
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

  return `🌊 2H EXECUTED FLOW

${build2HFlowSection(
    btc
  )}

━━━━━━━━━━━━━━

${build2HFlowSection(
    grt
  )}`;
}


/* ============================================================
   BUILD GRT 24H REPORT
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
    safeNumber(
      state.grtOpen,
      0
    );

  const high =
    safeNumber(
      state.grtHigh,
      0
    );

  const low =
    safeNumber(
      state.grtLow,
      0
    );

  const close =
    safeNumber(
      state.grtClose,
      0
    );

  const current =
    currentTicker
      ? currentTicker.currentPrice
      : close;

  const changePct =
    open >
      0 &&
    current >
      0
      ? percentChange(
          open,
          current
        )
      : 0;

  const totalExecutions =
    state.buyExecutions +
    state.sellExecutions;

  const totalVolume =
    state.buyVolume +
    state.sellVolume;

  const buyExecutionPct =
    totalExecutions >
      0
      ? (
          state.buyExecutions /
          totalExecutions
        ) *
        100
      : 50;

  const sellExecutionPct =
    totalExecutions >
      0
      ? (
          state.sellExecutions /
          totalExecutions
        ) *
        100
      : 50;

  const buyVolumePct =
    totalVolume >
      0
      ? (
          state.buyVolume /
          totalVolume
        ) *
        100
      : 50;

  const sellVolumePct =
    totalVolume >
      0
      ? (
          state.sellVolume /
          totalVolume
        ) *
        100
      : 50;

  const pressure =
    getPressureLabel(
      buyVolumePct,
      sellVolumePct
    );

  const direction =
    getMarketDirection(
      changePct
    );

  const dateLabel =
    formatMalaysiaDateLabel(
      state.dateKey
    );

  const openText =
    open >
      0
      ? `RM${formatPrice(
          "GRT",
          open
        )}`
      : "N/A";

  const highText =
    high >
      0
      ? `RM${formatPrice(
          "GRT",
          high
        )}`
      : "N/A";

  const lowText =
    low >
      0
      ? `RM${formatPrice(
          "GRT",
          low
        )}`
      : "N/A";

  const currentText =
    current >
      0
      ? `RM${formatPrice(
          "GRT",
          current
        )}`
      : "N/A";

  return `🌙 GRT 24H REPORT

📅 ${dateLabel}

━━━━━━━━━━━━━━

💵 Open:
${openText}

⬆️ High:
${highText}

⬇️ Low:
${lowText}

💵 Current:
${currentText}

📈 Change:
${formatPercent(
    changePct
  )}

🧭 Direction:
${formatMarketDirection(
    direction
  )}

━━━━━━━━━━━━━━

🌊 EXECUTED FLOW

📊 Total Trades:
${totalExecutions}

🟢 Buy Executions:
${state.buyExecutions}
(${formatPercent(
    buyExecutionPct
  )})

🔴 Sell Executions:
${state.sellExecutions}
(${formatPercent(
    sellExecutionPct
  )})

🟢 Buy Volume:
${formatPercent(
    buyVolumePct
  )}

🔴 Sell Volume:
${formatPercent(
    sellVolumePct
  )}

⚡ Pressure:
${formatPressure(
    pressure
  )}`;
}


/* ============================================================
   PRICE ALERT STATUS
============================================================ */

function getPriceAlertStatus() {
  return {
    running:
      PRICE_ALERT_RUNTIME
        .running,

    totalRuns:
      PRICE_ALERT_RUNTIME
        .totalRuns,

    skippedRuns:
      PRICE_ALERT_RUNTIME
        .skippedRuns,

    errors:
      PRICE_ALERT_RUNTIME
        .errors,

    lastStartedAt:
      PRICE_ALERT_RUNTIME
        .lastStartedAt,

    lastCompletedAt:
      PRICE_ALERT_RUNTIME
        .lastCompletedAt,

    lastDurationMs:
      PRICE_ALERT_RUNTIME
        .lastDurationMs,
  };
}


/* ============================================================
   MARKET STRUCTURE STATUS
============================================================ */

function getMarketStructureAlertStatus() {
  return {
    running:
      MARKET_STRUCTURE_RUNTIME
        .running,

    totalRuns:
      MARKET_STRUCTURE_RUNTIME
        .totalRuns,

    skippedRuns:
      MARKET_STRUCTURE_RUNTIME
        .skippedRuns,

    errors:
      MARKET_STRUCTURE_RUNTIME
        .errors,

    lastStartedAt:
      MARKET_STRUCTURE_RUNTIME
        .lastStartedAt,

    lastCompletedAt:
      MARKET_STRUCTURE_RUNTIME
        .lastCompletedAt,

    lastDurationMs:
      MARKET_STRUCTURE_RUNTIME
        .lastDurationMs,
  };
}


/* ============================================================
   END PART 8
============================================================ */
/* ============================================================
   PART 9 — TELEGRAM INTERACTIVE COMMANDS

   PURPOSE:
   - /momentum
   - /structure
   - /flow
   - /grt24
   - /grthold
   - /buytest
   - /buylast
   - /tuning
   - /status
   - /autostatus
   - /autooff

   INTERACTIVE SCALPING:
   SCALPING ENTRY
      ↓
   START ENTRY
      ↓
   TARGET NET PROFIT
      ↓
   FINAL ORDER PLAN
      ↓
   CONFIRM ORDER
      ↓
   ACTUAL MATCHED BUY PRICE
      ↓
   ACTUAL MATCHED QUANTITY
      ↓
   ACTIVE TRADE
      ↓
   SELL / CLOSE
      ↓
   ACTUAL MATCHED SELL PRICE
      ↓
   TRADE CLOSED
      ↓
   ASK:
   DO YOU WANT TO AUTO TRADE?
      ↓
   YES
      ↓
   AUTO SESSION ARMED
      ↓
   PART 10 TAKES OVER NEXT CYCLE

   IMPORTANT:
   - First trade is initiated by user.
   - Auto Mode is NEVER enabled before first trade closes.
   - User must explicitly press YES.
   - Restart defaults to AUTO OFF.
   - No withdrawal functionality.
============================================================ */


/* ============================================================
   USER STATE HELPERS
============================================================ */

function getTelegramUserState(
  chatId
) {
  return (
    USER_STATE[
      String(
        chatId
      )
    ] ||
    null
  );
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

  return state;
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
   AUTO TRADE SESSION

   IMPORTANT:
   Session starts OFF.

   It can only become enabled after:
   1. A real monitored trade closes.
   2. Bot asks user whether to continue automatically.
   3. User explicitly presses YES.

   PART 10 will run the background cycle.
============================================================ */

const AUTO_TRADE_SESSION = {
  enabled:
    false,

  armed:
    false,

  status:
    "OFF",

  chatId:
    null,

  coin:
    null,

  capital:
    null,

  lastTradeCapital:
    null,

  previousTrade: null,

  sourceTradeId:
    null,

  startedAt:
    null,

  lastCycleAt:
    null,

  lastDecisionAt:
    null,

  cycleCount:
    0,

  successfulTrades:
    0,

  failedTrades:
    0,

  awaitingSetup:
    false,

  positionActive:
    false,

  frozen:
    false,

  freezeReason:
    null,

  stopRequested:
    false,
};


/* ============================================================
   RESET AUTO TRADE SESSION
============================================================ */

function resetAutoTradeSession(
  reason =
    "USER STOP"
) {
  AUTO_TRADE_SESSION.enabled =
    false;

  AUTO_TRADE_SESSION.armed =
    false;

  AUTO_TRADE_SESSION.status =
    "OFF";

  AUTO_TRADE_SESSION.chatId =
    null;

  AUTO_TRADE_SESSION.coin =
    null;

  AUTO_TRADE_SESSION.capital =
    null;

  AUTO_TRADE_SESSION.lastTradeCapital =
    null;

  AUTO_TRADE_SESSION.previousTrade =
    null;

  AUTO_TRADE_SESSION.sourceTradeId =
    null;

  AUTO_TRADE_SESSION.startedAt =
    null;

  AUTO_TRADE_SESSION.lastCycleAt =
    null;

  AUTO_TRADE_SESSION.lastDecisionAt =
    null;

  AUTO_TRADE_SESSION.cycleCount =
    0;

  AUTO_TRADE_SESSION.awaitingSetup =
    false;

  AUTO_TRADE_SESSION.positionActive =
    false;

  AUTO_TRADE_SESSION.frozen =
    false;

  AUTO_TRADE_SESSION.freezeReason =
    null;

  AUTO_TRADE_SESSION.stopRequested =
    false;

  console.log(
    `🤖 AUTO TRADE OFF: ${reason}`
  );
}


/* ============================================================
   FREEZE AUTO TRADE SESSION

   If state becomes uncertain, do not continue
   opening additional positions.
============================================================ */

function freezeAutoTradeSession(
  reason
) {
  AUTO_TRADE_SESSION.enabled =
    false;

  AUTO_TRADE_SESSION.armed =
    false;

  AUTO_TRADE_SESSION.status =
    "FROZEN";

  AUTO_TRADE_SESSION.awaitingSetup =
    false;

  AUTO_TRADE_SESSION.positionActive =
    false;

  AUTO_TRADE_SESSION.frozen =
    true;

  AUTO_TRADE_SESSION.freezeReason =
    reason ||
    "UNKNOWN STATE";

  console.log(
    "🧊 AUTO TRADE FROZEN:",
    AUTO_TRADE_SESSION.freezeReason
  );
}


/* ============================================================
   GET AUTO TRADE SESSION STATUS
============================================================ */

function getAutoTradeSessionStatus() {
  return {
    enabled:
      AUTO_TRADE_SESSION.enabled,

    armed:
      AUTO_TRADE_SESSION.armed,

    status:
      AUTO_TRADE_SESSION.status,

    coin:
      AUTO_TRADE_SESSION.coin,

    capital:
      AUTO_TRADE_SESSION.capital,

    cycleCount:
      AUTO_TRADE_SESSION.cycleCount,

    successfulTrades:
      AUTO_TRADE_SESSION.successfulTrades,

    failedTrades:
      AUTO_TRADE_SESSION.failedTrades,

    awaitingSetup:
      AUTO_TRADE_SESSION.awaitingSetup,

    positionActive:
      AUTO_TRADE_SESSION.positionActive,

    frozen:
      AUTO_TRADE_SESSION.frozen,

    freezeReason:
      AUTO_TRADE_SESSION.freezeReason,

    startedAt:
      AUTO_TRADE_SESSION.startedAt,
  };
}


/* ============================================================
   CALCULATE CAPITAL FROM CLOSED TRADE
============================================================ */

function getClosedTradeCapital(
  result
) {
  const realised =
    result?.realised ||
    result?.trade?.realised ||
    result?.closedTrade?.realised ||
    null;

  const netSellValue =
    safeNumber(
      realised?.netSellValue,
      0
    );

  if (
    netSellValue >
    0
  ) {
    return netSellValue;
  }

  const trade =
    result?.trade ||
    result?.closedTrade ||
    null;

  if (
    !trade
  ) {
    return null;
  }

  const buyCost =
    safeNumber(
      trade.totalBuyCost,
      0
    );

  if (
    buyCost >
    0
  ) {
    return buyCost;
  }

  const quantity =
    safeNumber(
      trade.grossQuantity ||
      trade.quantity,
      0
    );

  const buyPrice =
    safeNumber(
      trade.buyPrice,
      0
    );

  if (
    quantity >
      0 &&
    buyPrice >
      0
  ) {
    return (
      quantity *
      buyPrice
    );
  }

  return null;
}


/* ============================================================
   PREPARE AUTO TRADE OFFER

   Called AFTER a trade has successfully closed.
============================================================ */

function prepareAutoTradeOffer({
  chatId,
  result,
  coin,
}) {
  const trade =
    result?.trade ||
    result?.closedTrade ||
    null;

  const capital =
    getClosedTradeCapital(
      result
    );

  AUTO_TRADE_SESSION.enabled =
    false;

  AUTO_TRADE_SESSION.armed =
    false;

  AUTO_TRADE_SESSION.status =
    "WAIT_USER_PERMISSION";

  AUTO_TRADE_SESSION.chatId =
    chatId;

  AUTO_TRADE_SESSION.coin =
    String(
      coin ||
      trade?.coin ||
      "GRT"
    ).toUpperCase();

  AUTO_TRADE_SESSION.capital =
    capital;

  AUTO_TRADE_SESSION.lastTradeCapital =
    capital;

  AUTO_TRADE_SESSION.previousTrade =
    trade ||
    null;

  AUTO_TRADE_SESSION.sourceTradeId =
    trade?.id ||
    trade?.tradeId ||
    null;

  AUTO_TRADE_SESSION.startedAt =
    null;

  AUTO_TRADE_SESSION.lastCycleAt =
    null;

  AUTO_TRADE_SESSION.lastDecisionAt =
    null;

  AUTO_TRADE_SESSION.cycleCount =
    0;

  AUTO_TRADE_SESSION.awaitingSetup =
    false;

  AUTO_TRADE_SESSION.positionActive =
    false;

  AUTO_TRADE_SESSION.frozen =
    false;

  AUTO_TRADE_SESSION.freezeReason =
    null;

  AUTO_TRADE_SESSION.stopRequested =
    false;

  return AUTO_TRADE_SESSION;
}


/* ============================================================
   ENABLE AUTO TRADE AFTER EXPLICIT YES
============================================================ */

function enableAutoTradeSession() {
  if (
    AUTO_TRADE_SESSION.status !==
    "WAIT_USER_PERMISSION"
  ) {
    return {
      enabled:
        false,

      reason:
        "NO AUTO TRADE OFFER PENDING",
    };
  }

  if (
    !AUTO_TRADE_SESSION.coin
  ) {
    return {
      enabled:
        false,

      reason:
        "COIN UNAVAILABLE",
    };
  }

  const capital =
    safeNumber(
      AUTO_TRADE_SESSION.capital,
      0
    );

  if (
    capital <=
    0
  ) {
    return {
      enabled:
        false,

      reason:
        "TRADE CAPITAL UNAVAILABLE",
    };
  }

  AUTO_TRADE_SESSION.enabled =
    true;

  AUTO_TRADE_SESSION.armed =
    true;

  AUTO_TRADE_SESSION.status =
    "WAITING_SETUP";

  AUTO_TRADE_SESSION.startedAt =
    Date.now();

  AUTO_TRADE_SESSION.lastCycleAt =
    null;

  AUTO_TRADE_SESSION.lastDecisionAt =
    null;

  AUTO_TRADE_SESSION.awaitingSetup =
    true;

  AUTO_TRADE_SESSION.positionActive =
    false;

  AUTO_TRADE_SESSION.stopRequested =
    false;

  return {
    enabled:
      true,

    session:
      AUTO_TRADE_SESSION,
  };
}


/* ============================================================
   BUILD AUTO TRADE QUESTION
============================================================ */

async function askAutoTradeAfterClose({
  chatId,
  result,
  coin,
}) {
  const session =
    prepareAutoTradeOffer({
      chatId,
      result,
      coin,
    });

  const capital =
    safeNumber(
      session.capital,
      0
    );

  await replyTelegram(
    chatId,
    `🤖 DO YOU WANT TO AUTO TRADE?

🪙 Coin:
${session.coin}

💳 Next Trade Capital:
${
  capital >
  0
    ? `RM${capital.toFixed(
        2
      )}`
    : "N/A"
}

Kalau tekan YES:

✅ Auto Mode akan diaktifkan
✅ Bot akan tunggu setup seterusnya
✅ Tak paksa entry kalau setup tak cukup syarat
✅ Modal cycle seterusnya bermula daripada hasil SELL bersih trade tadi

Tekan YES hanya kalau mahu sambung Auto Mode.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "✅ YES — AUTO TRADE",

              callback_data:
                `AUTO_TRADE_YES:${session.coin}`,
            },

            {
              text:
                "❌ NO",

              callback_data:
                `AUTO_TRADE_NO:${session.coin}`,
            },
          ],
        ],
      },
    }
  );
}


/* ============================================================
   /AUTOSTATUS
============================================================ */

bot.onText(
  /^\/autostatus(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    const status =
      getAutoTradeSessionStatus();

    await replyTelegram(
      chatId,
      `🤖 AUTO TRADE STATUS

Status:
${status.status}

Enabled:
${status.enabled
  ? "YES"
  : "NO"}

Armed:
${status.armed
  ? "YES"
  : "NO"}

🪙 Coin:
${status.coin ||
  "N/A"}

💳 Capital:
${
  status.capital
    ? `RM${safeNumber(
        status.capital,
        0
      ).toFixed(
        2
      )}`
    : "N/A"
}

🔁 Cycles:
${status.cycleCount}

✅ Successful:
${status.successfulTrades}

❌ Failed:
${status.failedTrades}

🔎 Waiting Setup:
${status.awaitingSetup
  ? "YES"
  : "NO"}

📈 Position Active:
${status.positionActive
  ? "YES"
  : "NO"}

🧊 Frozen:
${status.frozen
  ? "YES"
  : "NO"}

${
  status.freezeReason
    ? `Reason:
${status.freezeReason}`
    : ""
}`
    );
  }
);


/* ============================================================
   /AUTOOFF
============================================================ */

bot.onText(
  /^\/autooff(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    const wasActive =
      AUTO_TRADE_SESSION.enabled ||
      AUTO_TRADE_SESSION.status !==
        "OFF";

    resetAutoTradeSession(
      "USER /autooff"
    );

    await replyTelegram(
      chatId,
      wasActive
        ? `⛔ AUTO TRADE OFF

Auto session dihentikan.

Bot kembali ke manual monitoring mode.`
        : "⛔ AUTO TRADE memang OFF."
    );
  }
);


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
      const grtSnapshot =
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

━━━━━━━━━━━━━━

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
      const [
        btc,
        grt,
        grtSnapshot,
      ] =
        await Promise.all([
          getMarketStructureSnapshot(
            "BTC"
          ),

          getMarketStructureSnapshot(
            "GRT"
          ),

          getGRTMomentumSnapshot(),
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
        const normalized =
          grtSnapshot
            ?.normalized ||
          normalizeGRTDecision(
            grtSnapshot
              ?.decision
          );

        sections.push(
          `${buildMarketStructureSection(
            grt
          )}

⚡ Momentum:
${normalized.text}

${normalized.directionText}

🧠 Kriteria:
${normalized.criteria ||
  "MARKET REFERENCE"}`
        );
      }

      await replyTelegram(
        chatId,
        `📊 MARKET STRUCTURE

${sections.join(
          "\n\n━━━━━━━━━━━━━━━━━━\n\n"
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
============================================================ */

bot.onText(
  /^\/flow(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const report =
        await build2HFlowReport();

      await replyTelegram(
        chatId,
        report
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
   /GRT24
============================================================ */

bot.onText(
  /^\/grt24(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    try {
      const report =
        await buildGRT24Report();

      if (
        !report
      ) {
        await replyTelegram(
          chatId,
          "🌙 GRT 24H data belum cukup."
        );

        return;
      }
            await replyTelegram(
        chatId,
        report
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,
        `⚠️ GRT24 error:
${error.message}`
      );
    }
  }
);


/* ============================================================
   MANUAL GRT HOLD — COMMAND
============================================================ */

bot.onText(
  /^\/grthold(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    clearTelegramUserState(
      chatId
    );

    setTelegramUserState(
      chatId,
      {
        step:
          "WAIT_GRT_HOLD_ENTRY",
      }
    );

    await replyTelegram(
      chatId,
      `📡 MANUAL GRT HOLD CHECK

Masukkan ENTRY PRICE GRT anda.

Contoh:
0.4061`
    );
  }
);


/* ============================================================
   MANUAL HOLD STATUS
============================================================ */

function getManualGRTHoldStatus(
  momentumDecision
) {
  if (
    !momentumDecision
  ) {
    return {
      status:
        "HOLD",

      emoji:
        "🟢",

      reason:
        "Market data sedang dikemaskini.",
    };
  }

  if (
    momentumDecision.status ===
    "BUY_NOW"
  ) {
    return {
      status:
        "HOLD",

      emoji:
        "🟢",

      reason:
        "Momentum semasa positif.",
    };
  }

  if (
    momentumDecision.status ===
    "VERIFYING"
  ) {
    return {
      status:
        "HOLD",

      emoji:
        "🟡",

      reason:
        "Momentum sedang divalidasi.",
    };
  }

  if (
    momentumDecision.direction ===
    "MASIH_DROP"
  ) {
    return {
      status:
        "CAUTION",

      emoji:
        "🟡",

      reason:
        "Harga masih dalam tekanan menurun.",
    };
  }

  if (
    momentumDecision.reason ===
      "HARD BEARISH" ||
    momentumDecision.reason ===
      "PRICE FAILED"
  ) {
    return {
      status:
        "CAUTION",

      emoji:
        "🟡",

      reason:
        `Short-term bearish pressure: ${momentumDecision.reason}`,
    };
  }

  return {
    status:
      "HOLD",

    emoji:
      "🟢",

    reason:
      momentumDecision.reason ||
      "Monitoring market structure.",
  };
}


/* ============================================================
   /BUYTEST
============================================================ */

bot.onText(
  /^\/buytest(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    const completed =
      GRT_BUY_NOW_HISTORY.filter(
        (item) =>
          item.status !==
          "OPEN"
      );

    const successful =
      completed.filter(
        (item) =>
          item.result ===
          "SUCCESS"
      );

    const failed =
      completed.filter(
        (item) =>
          item.result ===
          "FALSE"
      );

    const successRate =
      completed.length >
        0
        ? (
            successful.length /
            completed.length
          ) *
          100
        : 0;

    await replyTelegram(
      chatId,
      `🧪 GRT BUY NOW LEARNING

📊 Total Records:
${GRT_BUY_NOW_HISTORY.length}

✅ Completed:
${completed.length}

🟢 Success:
${successful.length}

🔴 False:
${failed.length}

📈 Success Rate:
${formatPercent(
        successRate
      )}

⚙️ Dynamic BUY Volume Min:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
        1
      )}%`
    );
  }
);


/* ============================================================
   /BUYLAST
============================================================ */

bot.onText(
  /^\/buylast(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    const latest =
      GRT_BUY_NOW_HISTORY[
        GRT_BUY_NOW_HISTORY.length -
          1
      ];

    if (
      !latest
    ) {
      await replyTelegram(
        chatId,
        "🧪 Belum ada rekod BUY NOW."
      );

      return;
    }

    await replyTelegram(
      chatId,
      `🧪 LAST GRT BUY NOW

💵 Price:
RM${formatPrice(
        "GRT",
        latest.price
      )}

🧠 Reason:
${latest.reason ||
  "N/A"}

⭐ Momentum Score:
${latest.score}/10

📈 Direction:
${latest.direction ||
  "N/A"}

⏱ 5M:
${formatPercent(
        latest.change5m
      )}

⏱ 15M:
${formatPercent(
        latest.change15m
      )}

🟢 Buy Volume:
${formatPercent(
        latest.buyVolumePct
      )}

🟢 Buy Frequency:
${formatPercent(
        latest.buyFrequencyPct
      )}

🌊 2H Boost:
${latest.twoHourBoost
  ? "YES"
  : "NO"}

📌 Status:
${latest.status}

🎯 Result:
${latest.result ||
  "PENDING"}`
    );
  }
);


/* ============================================================
   /TUNING
============================================================ */

bot.onText(
  /^\/tuning(?:@\w+)?$/i,
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    await replyTelegram(
      chatId,
      `🧠 GRT TUNING STATUS

Dynamic BUY Volume Min:
${GRT_DYNAMIC_BUY_VOLUME_MIN_PCT.toFixed(
        1
      )}%

Learning Records:
${GRT_BUY_NOW_HISTORY.length}

Minimum Completed Signals:
${GRT_TUNING_MIN_COMPLETED_SIGNALS}

Early Reversal:
ACTIVE

2H Confirmation Boost:
ACTIVE

Max GRT Scalping Quantity:
${MAX_GRT_SCALPING_QUANTITY.toLocaleString(
        "en-MY"
      )} GRT`
    );
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
        typeof getBackgroundServicesStatus ===
        "function"
          ? getBackgroundServicesStatus()
          : null;

      const alt =
        getAltcoinScannerStatus();

      const active =
        getActiveTradeMonitorStatus();

      const auto =
        getAutoTradeSessionStatus();

      await replyTelegram(
        chatId,
        `🤖 BOT SYSTEM STATUS

🧠 GRT ENGINE:
${GRT_MOMENTUM_RUNTIME.phase}

📈 Direction:
${formatGRTDirection(
          GRT_MOMENTUM_RUNTIME
            .lastDirection
        ) ||
  "UNKNOWN"}

📌 Last Decision:
${LAST_GRT_FINAL_DECISION}

━━━━━━━━━━━━━━

🪙 ALTCOIN SCANNER:
${alt.running
  ? "RUNNING"
  : "READY"}

⏱ Interval:
${alt.intervalMinutes} MIN

📊 Runs:
${alt.totalRuns}

⚠️ Errors:
${alt.errors}

━━━━━━━━━━━━━━

📈 ACTIVE TRADE MONITOR:
${active.running
  ? "RUNNING"
  : "READY"}

Active Trades:
${active.activeTrades}

Monitor Runs:
${active.totalRuns}

━━━━━━━━━━━━━━

🤖 AUTO TRADE:
${auto.status}

Coin:
${auto.coin ||
  "N/A"}

Capital:
${
  auto.capital
    ? `RM${safeNumber(
        auto.capital,
        0
      ).toFixed(
        2
      )}`
    : "N/A"
}

Cycles:
${auto.cycleCount}

━━━━━━━━━━━━━━

📡 BACKGROUND SERVICES:
${
  status
    ? "AVAILABLE"
    : "WAITING FOR PART 10"
}`
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


    /* ========================================================
       AUTO TRADE — USER SAID YES

       This is THE point where Auto Mode becomes enabled.

       It cannot be enabled before this callback.
    ======================================================== */

    if (
      data.startsWith(
        "AUTO_TRADE_YES:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      if (
        AUTO_TRADE_SESSION.status !==
          "WAIT_USER_PERMISSION" ||
        AUTO_TRADE_SESSION.coin !==
          coin
      ) {
        await replyTelegram(
          chatId,
          `⚠️ AUTO TRADE OFFER EXPIRED

Tiada pending permission untuk ${coin}.`
        );

        return;
      }

      const result =
        enableAutoTradeSession();

      if (
        !result.enabled
      ) {
        await replyTelegram(
          chatId,
          `⚠️ AUTO TRADE TAK DAPAT DIAKTIFKAN

Reason:
${result.reason}`
        );

        return;
      }

      await replyTelegram(
        chatId,
        `🤖✅ AUTO TRADE ENABLED

🪙 ${AUTO_TRADE_SESSION.coin}

💳 Working Capital:
RM${safeNumber(
          AUTO_TRADE_SESSION.capital,
          0
        ).toFixed(
          2
        )}

📌 Status:
WAITING FOR NEXT SETUP

Bot sekarang akan tunggu setup yang cukup syarat.

❌ Tak ada setup cantik = TAK TRADE
✅ Setup cukup syarat = cycle seterusnya boleh bermula

Untuk hentikan:
/autooff`
      );

      return;
    }


    /* ========================================================
       AUTO TRADE — USER SAID NO
    ======================================================== */

    if (
      data.startsWith(
        "AUTO_TRADE_NO:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      resetAutoTradeSession(
        "USER SELECTED NO"
      );

      await replyTelegram(
        chatId,
        `👍 AUTO TRADE NOT ENABLED

🪙 ${coin}

Bot kekal dalam manual mode.`
      );

      return;
    }


    /* ========================================================
       START ENTRY
    ======================================================== */

    if (
      data.startsWith(
        "START_ENTRY:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

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

      clearTelegramUserState(
        chatId
      );

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
10

Bot akan kira quantity berdasarkan:
• Suggested Entry
• Projected TP1
• Buy Fee
• Sell Fee

${
  coin ===
    "GRT"
    ? `⚠️ Maximum ${MAX_GRT_SCALPING_QUANTITY.toLocaleString(
        "en-MY"
      )} GRT`
    : ""
}`
      );

      return;
    }


    /* ========================================================
       SKIP ENTRY
    ======================================================== */

    if (
      data.startsWith(
        "SKIP_ENTRY:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      delete PENDING_ENTRIES[
        coin
      ];

      clearTelegramUserState(
        chatId
      );

      await replyTelegram(
        chatId,
        `❌ ${coin} SCALPING ENTRY SKIPPED`
      );

      return;
    }


    /* ========================================================
       CONFIRM ORDER PLAN

       User still executes the FIRST trade manually.
    ======================================================== */

    if (
      data.startsWith(
        "CONFIRM_ORDER:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      const state =
        getTelegramUserState(
          chatId
        );

      if (
        !state ||
        state.coin !==
          coin ||
        !state.orderPlan
      ) {
        await replyTelegram(
          chatId,
          "⚠️ Order plan dah expired."
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          ...state,

          step:
            "WAIT_MATCHED_BUY_PRICE",
        }
      );

      await replyTelegram(
        chatId,
        `✅ ORDER PLAN CONFIRMED

🪙 ${coin}

Sekarang buat BUY pertama di Luno.

Selepas order match, masukkan:

ACTUAL MATCHED BUY PRICE

Contoh:
0.0723`
      );

      return;
    }


    /* ========================================================
       CANCEL ORDER
    ======================================================== */

    if (
      data.startsWith(
        "CANCEL_ORDER:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      delete PENDING_ENTRIES[
        coin
      ];

      clearTelegramUserState(
        chatId
      );

      await replyTelegram(
        chatId,
        `❌ ${coin} ORDER PLAN CANCELLED`
      );

      return;
    }


    /* ========================================================
       SELL ACTIVE TRADE
    ======================================================== */

    if (
      data.startsWith(
        "SELL_TRADE:"
      )
    ) {
      const coin =
        data.split(
          ":"
        )[1];

      const trade =
        ACTIVE_TRADES[
          coin
        ];

      if (
        !trade
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Tiada active trade ${coin}.`
        );

        return;
      }

      clearTelegramUserState(
        chatId
      );

      setTelegramUserState(
        chatId,
        {
          step:
            "WAIT_MATCHED_SELL_PRICE",

          coin,
        }
      );

      await replyTelegram(
        chatId,
        `💰 CLOSE ${coin} TRADE

Masukkan ACTUAL MATCHED SELL PRICE dari Luno.

Contoh:
${formatPrice(
          coin,
          trade.lastPrice ||
          trade.buyPrice
        )}`
      );

      return;
    }
  }
);


/* ============================================================
   TELEGRAM TEXT STATE MACHINE

   Commands beginning with /
   are ignored here because onText handlers
   already process them.
============================================================ */

bot.on(
  "message",
  async (
    msg
  ) => {
    const chatId =
      msg.chat.id;

    const text =
      String(
        msg.text ||
        ""
      ).trim();

    if (
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


    /* ========================================================
       MANUAL GRT HOLD — ENTRY PRICE
    ======================================================== */

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

Contoh:
0.4061`
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

Masukkan QUANTITY GRT.

Contoh:
7000`
      );

      return;
    }


    /* ========================================================
       MANUAL GRT HOLD — QUANTITY + REPORT
    ======================================================== */

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

Contoh:
7000`
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
          "⚠️ Entry price hilang. Taip /grthold semula."
        );

        return;
      }

      try {
        const ticker =
          await getTicker(
            "GRT"
          );

        if (
          !ticker
        ) {
          throw new Error(
            "GRT ticker unavailable"
          );
        }

        const momentum =
          await getGRTMomentumDecision(
            ticker
          );

        const projection =
          await calculateGRTProjectedReach({
            currentPrice:
              ticker.currentPrice,

            momentum,
          });

        const currentFees =
          calculateTradeAfterFees({
            quantity,

            entryPrice,

            sellPrice:
              ticker.currentPrice,
          });

        const breakEven =
          calculateBreakEvenPrice(
            entryPrice
          );

        const breakEvenDistance =
          breakEven
            ? getDistanceToTarget(
                ticker.currentPrice,
                breakEven
              )
            : null;

        const tp1Fees =
          projection
            ?.tp1
            ? calculateTradeAfterFees({
                quantity,

                entryPrice,

                sellPrice:
                  projection.tp1,
              })
            : null;

        const tp2Fees =
          projection
            ?.tp2
            ? calculateTradeAfterFees({
                quantity,

                entryPrice,

                sellPrice:
                  projection.tp2,
              })
            : null;

        const tp1Distance =
          projection
            ?.tp1
            ? getDistanceToTarget(
                ticker.currentPrice,
                projection.tp1
              )
            : null;

        const tp2Distance =
          projection
            ?.tp2
            ? getDistanceToTarget(
                ticker.currentPrice,
                projection.tp2
              )
            : null;

        const hold =
          getManualGRTHoldStatus(
            momentum
          );

        const capital =
          quantity *
          entryPrice;

        const priceVsEntry =
          percentChange(
            entryPrice,
            ticker.currentPrice
          );

        const pnlEmoji =
          currentFees
            ?.netProfit >=
            0
            ? "🟢"
            : "🔴";

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
RM${capital.toFixed(
            2
          )}

━━━━━━━━━━━━━━

📊 CURRENT

💵 Current Price:
RM${formatPrice(
            "GRT",
            ticker.currentPrice
          )}

📈 Price vs Entry:
${formatPercent(
            priceVsEntry
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

⚖️ BREAK EVEN AFTER FEES

💵 Break Even:
${
  breakEven
    ? `RM${formatPrice(
        "GRT",
        breakEven
      )}`
    : "N/A"
}

📏 Lagi nak Break Even:
${
  !breakEvenDistance
    ? "N/A"
    : breakEvenDistance.reached
      ? "✅ DAH LEPAS BREAK EVEN"
      : `RM${formatPrice(
          "GRT",
          breakEvenDistance
            .priceDistance
        )} (${formatPercent(
          breakEvenDistance.pct
        )})`
}

━━━━━━━━━━━━━━

${hold.emoji} HOLD STATUS:
${hold.status}

🧠 Reason:
${hold.reason}

━━━━━━━━━━━━━━

⚡ MOMENTUM

${momentum.text}

${momentum.directionText ||
  ""}

━━━━━━━━━━━━━━

🎯 PROJECTED TP1

💵 Price:
${
  projection
    ?.tp1
    ? `RM${formatPrice(
        "GRT",
        projection.tp1
      )}`
    : "N/A"
}

📏 Lagi nak TP1:
${
  !tp1Distance
    ? "N/A"
    : tp1Distance.reached
      ? "✅ TP1 DAH DICAPAI"
      : `RM${formatPrice(
          "GRT",
          tp1Distance.priceDistance
        )} (${formatPercent(
          tp1Distance.pct
        )})`
}

💰 NET P/L @ TP1:
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
  projection
    ?.tp2
    ? `RM${formatPrice(
        "GRT",
        projection.tp2
      )}`
    : "N/A"
}

📏 Lagi nak TP2:
${
  !tp2Distance
    ? "N/A"
    : tp2Distance.reached
      ? "✅ TP2 DAH DICAPAI"
      : `RM${formatPrice(
          "GRT",
          tp2Distance.priceDistance
        )} (${formatPercent(
          tp2Distance.pct
        )})`
}

💰 NET P/L @ TP2:
${
  tp2Fees
    ? `RM${tp2Fees.netProfit.toFixed(
        2
      )}`
    : "N/A"
}`
        );

        clearTelegramUserState(
          chatId
        );
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
      }

      return;
    }


    /* ========================================================
       TARGET NET PROFIT
    ======================================================== */

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
          `⚠️ Target profit tak sah.

Contoh:
10`
        );

        return;
      }

      const candidate =
        PENDING_ENTRIES[
          state.coin
        ];

      if (
        !candidate
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

      const plan =
        await buildFinalOrderPlan({
          candidate,

          targetProfit,
        });

      if (
        !plan.allowed
      ) {
        let extra =
          "";

        if (
          plan.reason ===
          "REQUIRED QUANTITY ABOVE 30000 GRT"
        ) {
          extra =
            `

📦 Required:
${plan.quantity.toLocaleString(
              "en-MY"
            )} GRT

🚧 Maximum:
${MAX_GRT_SCALPING_QUANTITY.toLocaleString(
              "en-MY"
            )} GRT`;
        }

        await replyTelegram(
          chatId,
          `⚠️ ORDER PLAN TAK SESUAI

Reason:
${plan.reason}${extra}`
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          ...state,

          step:
            "WAIT_ORDER_CONFIRMATION",

          targetProfit,

          orderPlan:
            plan,
        }
      );

      await replyTelegram(
        chatId,
        `📋 FINAL ORDER PLAN

🪙 ${plan.coin}

💵 LIMIT BUY:
RM${formatPrice(
          plan.coin,
          plan.entryPrice
        )}

📦 Quantity:
${plan.quantity.toLocaleString(
          "en-MY"
        )}

💳 Estimated Modal:
RM${(
  plan.quantity *
  plan.entryPrice
).toFixed(
          2
        )}

🎯 TP1:
RM${formatPrice(
          plan.coin,
          plan.tp
        )}

${
  plan.tp2
    ? `🚀 TP2:
RM${formatPrice(
        plan.coin,
        plan.tp2
      )}`
    : "🚀 TP2: N/A"
}

🛑 SL:
RM${formatPrice(
          plan.coin,
          plan.sl
        )}

💰 Target NET:
RM${targetProfit.toFixed(
          2
        )}

💰 Estimated NET @ TP1:
RM${plan.estimatedNetProfit.toFixed(
          2
        )}

📊 Confidence:
${plan.confidence}

🧠 Setup:
${plan.setup}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "✅ CONFIRM ORDER",

                  callback_data:
                    `CONFIRM_ORDER:${plan.coin}`,
                },

                {
                  text:
                    "❌ CANCEL",

                  callback_data:
                    `CANCEL_ORDER:${plan.coin}`,
                },
              ],
            ],
          },
        }
      );

      return;
    }


    /* ========================================================
       MATCHED BUY PRICE
    ======================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_BUY_PRICE"
    ) {
      const matchedBuyPrice =
        Number(
          text.replace(
            ",",
            "."
          )
        );

      if (
        !Number.isFinite(
          matchedBuyPrice
        ) ||
        matchedBuyPrice <=
          0
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Matched buy price tak sah.

Contoh:
0.0723`
        );

        return;
      }

      setTelegramUserState(
        chatId,
        {
          ...state,

          matchedBuyPrice,

          step:
            "WAIT_MATCHED_QUANTITY",
        }
      );

      await replyTelegram(
        chatId,
        `✅ MATCHED BUY PRICE SAVED

💵 RM${formatPrice(
          state.coin,
          matchedBuyPrice
        )}

Sekarang masukkan ACTUAL MATCHED QUANTITY dari Luno.

Contoh:
7000`
      );

      return;
    }


    /* ========================================================
       MATCHED BUY QUANTITY
    ======================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_QUANTITY"
    ) {
      const matchedQuantity =
        Number(
          text.replace(
            /,/g,
            ""
          )
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
          `⚠️ Matched quantity tak sah.

Masukkan:
0 = order tak match

atau quantity sebenar, contoh:
7000`
        );

        return;
      }

      if (
        matchedQuantity ===
        0
      ) {
        const coin =
          state.coin;

        const coinSignalTime =
          LAST_SIGNAL[
            coin
          ] ||
          0;

        delete PENDING_ENTRIES[
          coin
        ];

        LAST_SIGNAL[
          coin
        ] =
          0;

        if (
          coinSignalTime &&
          LAST_GLOBAL_SIGNAL &&
          Math.abs(
            LAST_GLOBAL_SIGNAL -
            coinSignalTime
          ) <=
            2000
        ) {
          LAST_GLOBAL_SIGNAL =
            0;
        }

        clearTelegramUserState(
          chatId
        );

        await replyTelegram(
          chatId,
          `❌ ${coin} ORDER NOT MATCHED

Matched Quantity: 0

✅ Pending entry released
✅ Coin cooldown released

Bot boleh cari entry baru semula.`
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
        `✅ ACTIVE TRADE STARTED

🪙 ${trade.coin}

💵 Matched Entry:
RM${formatPrice(
          trade.coin,
          trade.buyPrice
        )}

📦 Gross Quantity:
${trade.grossQuantity.toLocaleString(
          "en-MY"
        )}

💳 Modal:
RM${trade.totalBuyCost.toFixed(
          2
        )}

🎯 TP1:
${
  trade.tp
    ? `RM${formatPrice(
        trade.coin,
        trade.tp
      )}`
    : "N/A"
}

🚀 TP2:
${
  trade.tp2
    ? `RM${formatPrice(
        trade.coin,
        trade.tp2
      )}`
    : "N/A"
}

🛑 SL:
${
  trade.sl
    ? `RM${formatPrice(
        trade.coin,
        trade.sl
      )}`
    : "N/A"
}

📡 Trade Monitor:
ACTIVE`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "💰 SELL / CLOSE TRADE",

                  callback_data:
                    `SELL_TRADE:${trade.coin}`,
                },
              ],
            ],
          },
        }
      );

      return;
    }


    /* ========================================================
       MATCHED SELL PRICE

       IMPORTANT CHANGE:
       After successful close,
       ASK USER WHETHER TO ENABLE AUTO TRADE.
    ======================================================== */

    if (
      state.step ===
      "WAIT_MATCHED_SELL_PRICE"
    ) {
      const sellPrice =
        Number(
          text.replace(
            ",",
            "."
          )
        );

      if (
        !Number.isFinite(
          sellPrice
        ) ||
        sellPrice <=
          0
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Sell price tak sah.

Masukkan actual matched sell price.`
        );

        return;
      }

      const coin =
        state.coin;

      const result =
        closeActiveTrade({
          coin,

          matchedSellPrice:
            sellPrice,
        });

      clearTelegramUserState(
        chatId
      );

      if (
        !result.closed
      ) {
        await replyTelegram(
          chatId,
          `⚠️ Close trade failed:

${result.reason}`
        );

        return;
      }

      const message =
        buildClosedTradeMessage(
          result
        );

      await replyTelegram(
        chatId,
        message
      );


      /* ======================================================
         NEW FLOW

         First trade has now CLOSED.

         Only now do we offer AUTO TRADE.
      ====================================================== */

      await askAutoTradeAfterClose({
        chatId,

        result,

        coin,
      });

      return;
    }
  }
);


/* ============================================================
   END PART 9
============================================================ */
/* ============================================================
   PART 10 — BACKGROUND SERVICES + BOOTSTRAP

   PURPOSE:
   - Executed trade collector
   - Price memory collector
   - GRT master scanner 1 minute
   - Altcoin scanner 30 minutes
   - Price alert 5 minutes
   - Market structure 15 minutes
   - Active trade monitor 15 seconds
   - GRT BUY NOW learning monitor
   - AUTO TRADE SESSION background monitor
   - Daily / 24H maintenance
   - Persistence
   - Scheduler
   - Startup notification
   - /health
   - Express server
   - Final bootstrap

   AUTO TRADE FLOW:
   First trade closed
      ↓
   User presses YES in PART 9
      ↓
   AUTO_TRADE_SESSION.enabled = true
      ↓
   PART 10 monitors next setup
      ↓
   Setup qualifies
      ↓
   Setup is locked for the session
      ↓
   Telegram notification sent

   IMPORTANT:
   - AUTO TRADE DOES NOT START ON SERVER BOOT.
   - Restart always means AUTO OFF.
   - User permission in PART 9 is mandatory.
   - No withdrawal functionality.
   - No automatic financial order submission.
============================================================ */


/* ============================================================
   AUTO TRADE BACKGROUND CONFIG
============================================================ */

const AUTO_TRADE_SCAN_INTERVAL_MS =
  60 * 1000;

const AUTO_TRADE_NOTIFY_COOLDOWN_MS =
  5 * 60 * 1000;

const AUTO_TRADE_SETUP_MAX_AGE_MS =
  12 * 60 * 1000;

const AUTO_TRADE_ENTRY_CHANGE_NOTIFY_PCT =
  0.15;


/* ============================================================
   AUTO TRADE BACKGROUND RUNTIME
============================================================ */

const AUTO_TRADE_RUNTIME = {
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

  setupsDetected:
    0,

  notifications:
    0,

  lastSetupAt:
    null,

  lastNotificationAt:
    null,

  lastProposal:
    null,

  lastReason:
    null,
};


/* ============================================================
   COLLECTOR RUNTIME
============================================================ */

const COLLECTOR_RUNTIME = {
  executedTrades: {
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
  },

  priceMemory: {
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
  },
};


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

  latestBTC:
    null,

  latestGRTSnapshot:
    null,

  latestGRTProcessed:
    null,
};


/* ============================================================
   SCHEDULER RUNTIME
============================================================ */

const SCHEDULER_RUNTIME = {
  started:
    false,

  startedAt:
    null,

  intervals:
    {},

  errors:
    0,
};


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
   GRT BUY NOW LEARNING MONITOR RUNTIME
============================================================ */

const GRT_LEARNING_RUNTIME = {
  running:
    false,

  lastStartedAt:
    null,

  lastCompletedAt:
    null,

  totalRuns:
    0,

  errors:
    0,
};


/* ============================================================
   SAFE JSON WRITE
============================================================ */

function safeWriteJSON(
  file,
  data
) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(
        data,
        null,
        2
      )
    );

    return true;
  } catch (
    error
  ) {
    console.log(
      `JSON write error ${file}:`,
      error.message
    );

    return false;
  }
}


/* ============================================================
   SAFE JSON READ
============================================================ */

function safeReadJSON(
  file,
  fallback =
    null
) {
  try {
    if (
      !fs.existsSync(
        file
      )
    ) {
      return fallback;
    }

    const raw =
      fs.readFileSync(
        file,
        "utf8"
      );

    return JSON.parse(
      raw
    );
  } catch (
    error
  ) {
    console.log(
      `JSON read error ${file}:`,
      error.message
    );

    return fallback;
  }
}


/* ============================================================
   SAVE GRT BUY NOW HISTORY
============================================================ */

function saveGRTBuyNowHistory() {
  return safeWriteJSON(
    GRT_BUY_NOW_FILE,
    GRT_BUY_NOW_HISTORY
  );
}


/* ============================================================
   LOAD GRT BUY NOW HISTORY
============================================================ */

function loadGRTBuyNowHistory() {
  const data =
    safeReadJSON(
      GRT_BUY_NOW_FILE,
      []
    );

  if (
    Array.isArray(
      data
    )
  ) {
    GRT_BUY_NOW_HISTORY =
      data.slice(
        -GRT_BUY_NOW_HISTORY_LIMIT
      );

    return true;
  }

  return false;
}


/* ============================================================
   SAVE GRT TUNING
============================================================ */

function saveGRTTuning() {
  return safeWriteJSON(
    GRT_TUNING_FILE,
    {
      dynamicBuyVolumeMinPct:
        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

      lastSuggestionCount:
        LAST_TUNING_SUGGESTION_COUNT,

      savedAt:
        Date.now(),
    }
  );
}


/* ============================================================
   LOAD GRT TUNING
============================================================ */

function loadGRTTuning() {
  const data =
    safeReadJSON(
      GRT_TUNING_FILE,
      null
    );

  if (
    !data
  ) {
    return false;
  }

  const dynamic =
    safeNumber(
      data.dynamicBuyVolumeMinPct,
      NaN
    );

  if (
    Number.isFinite(
      dynamic
    )
  ) {
    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
      clamp(
        dynamic,
        50,
        65
      );
  }

  LAST_TUNING_SUGGESTION_COUNT =
    safeNumber(
      data.lastSuggestionCount,
      0
    );

  return true;
}


/* ============================================================
   AUTO TRADE — GET CURRENT SETUP

   This reads the setup already produced by
   the normal GRT / altcoin engines.

   It does NOT bypass existing qualification rules.
============================================================ */

function getAutoTradePendingSetup(
  coin
) {
  const normalizedCoin =
    String(
      coin ||
      ""
    ).toUpperCase();

  const candidate =
    PENDING_ENTRIES[
      normalizedCoin
    ];

  if (
    !candidate
  ) {
    return null;
  }

  const rawCreatedAt =
    safeNumber(
      candidate.createdAt ||
      candidate.timestamp ||
      candidate.signalAt,
      0
    );

  if (
    rawCreatedAt <=
    0
  ) {
    candidate.createdAt =
      Date.now();
  }

  const createdAt =
    safeNumber(
      candidate.createdAt,
      Date.now()
    );

  if (
    createdAt >
      0 &&
    Date.now() -
      createdAt >
      AUTO_TRADE_SETUP_MAX_AGE_MS
  ) {
    return null;
  }

  return candidate;
}


/* ============================================================
   AUTO TRADE — PROPOSAL FINGERPRINT
============================================================ */

function getAutoTradeProposalFingerprint(
  proposal
) {
  if (
    !proposal
  ) {
    return null;
  }

  return [
    proposal.coin,

    Number(
      proposal.entryPrice ||
      0
    ).toFixed(
      8
    ),

    Number(
      proposal.tp ||
      proposal.tp1 ||
      0
    ).toFixed(
      8
    ),

    Number(
      proposal.sl ||
      0
    ).toFixed(
      8
    ),

    safeNumber(
      proposal.score,
      0
    ),
  ].join(
    "|"
  );
}


/* ============================================================
   AUTO TRADE — MATERIAL CHANGE CHECK
============================================================ */

function hasAutoTradeProposalChanged(
  previous,
  next
) {
  if (
    !previous ||
    !next
  ) {
    return true;
  }

  const previousEntry =
    safeNumber(
      previous.entryPrice,
      0
    );

  const nextEntry =
    safeNumber(
      next.entryPrice,
      0
    );

  if (
    previousEntry <=
      0 ||
    nextEntry <=
      0
  ) {
    return (
      getAutoTradeProposalFingerprint(
        previous
      ) !==
      getAutoTradeProposalFingerprint(
        next
      )
    );
  }

  const entryMove =
    Math.abs(
      percentChange(
        previousEntry,
        nextEntry
      )
    );

  if (
    entryMove >=
    AUTO_TRADE_ENTRY_CHANGE_NOTIFY_PCT
  ) {
    return true;
  }

  if (
    safeNumber(
      previous.score,
      0
    ) !==
    safeNumber(
      next.score,
      0
    )
  ) {
    return true;
  }

  if (
    previous.setup !==
    next.setup
  ) {
    return true;
  }

  return false;
}


/* ============================================================
   AUTO TRADE — BUILD NEXT TRADE PROPOSAL

   Uses working capital stored after previous trade.

   This is a planning calculation only.
============================================================ */

function buildAutoTradeNextProposal(
  candidate
) {
  if (
    !candidate
  ) {
    return {
      allowed:
        false,

      reason:
        "NO CANDIDATE",
    };
  }

  const coin =
    String(
      candidate.coin ||
      AUTO_TRADE_SESSION.coin ||
      ""
    ).toUpperCase();

  const entryPrice =
    safeNumber(
      candidate.preliminaryEntry ||
      candidate.entryPrice ||
      candidate.suggestedEntry ||
      candidate.limitEntry ||
      candidate.currentPrice,
      0
    );

  if (
    entryPrice <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "ENTRY PRICE UNAVAILABLE",
    };
  }

  const capital =
    safeNumber(
      AUTO_TRADE_SESSION.capital,
      0
    );

  if (
    capital <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "AUTO CAPITAL UNAVAILABLE",
    };
  }

  /*
     Conservative quantity estimate using
     the bot's configured BUY_FEE assumption.
  */

  const grossQuantity =
    capital /
    (
      entryPrice *
      (
        1 +
        BUY_FEE
      )
    );

  let quantity =
    Math.floor(
      grossQuantity
    );

  if (
    coin ===
    "GRT"
  ) {
    quantity =
      Math.min(
        quantity,
        MAX_GRT_SCALPING_QUANTITY
      );
  }

  if (
    quantity <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "CAPITAL TOO SMALL FOR ENTRY",
    };
  }

  const tp =
    safeNumber(
      candidate.tp ||
      candidate.tp1 ||
      candidate.projectedTP1,
      0
    );

  const tp2 =
    safeNumber(
      candidate.tp2 ||
      candidate.projectedTP2,
      0
    );

  const sl =
    safeNumber(
      candidate.sl ||
      candidate.stopLoss,
      0
    );

  if (
    tp <=
    entryPrice
  ) {
    return {
      allowed:
        false,

      reason:
        "VALID TP UNAVAILABLE",
    };
  }

  if (
    sl <=
    0
  ) {
    return {
      allowed:
        false,

      reason:
        "VALID SL UNAVAILABLE",
    };
  }

  const estimated =
    calculateTradeAfterFees({
      quantity,

      entryPrice,
            sellPrice:
        tp,
    });

  return {
    allowed:
      true,

    coin,

    capital,

    entryPrice,

    quantity,

    tp,

    tp2:
      tp2 >
      tp
        ? tp2
        : null,

    sl,

    score:
      safeNumber(
        candidate.score ||
        candidate.executionScore ||
        candidate.scalpingScore,
        0
      ),

    confidence:
      candidate.confidence ||
      confidenceLabel(
        safeNumber(
          candidate.score ||
          candidate.executionScore ||
          candidate.scalpingScore,
          0
        )
      ),

    setup:
      candidate.setup ||
      candidate.reason ||
      "QUALIFIED SETUP",

    estimatedNetProfit:
      estimated
        ?.netProfit ??
      null,

    candidate,

    generatedAt:
      Date.now(),
  };
}


/* ============================================================
   AUTO TRADE — MESSAGE
============================================================ */

function buildAutoTradeSetupMessage(
  proposal
) {
  return `🤖 AUTO TRADE — SETUP READY

🪙 ${proposal.coin}

💳 Working Capital:
RM${proposal.capital.toFixed(
    2
  )}

━━━━━━━━━━━━━━

💵 Suggested Entry:
RM${formatPrice(
    proposal.coin,
    proposal.entryPrice
  )}

📦 Estimated Quantity:
${proposal.quantity.toLocaleString(
    "en-MY"
  )}

🎯 TP1:
RM${formatPrice(
    proposal.coin,
    proposal.tp
  )}

🚀 TP2:
${
  proposal.tp2
    ? `RM${formatPrice(
        proposal.coin,
        proposal.tp2
      )}`
    : "N/A"
}

🛑 SL:
RM${formatPrice(
    proposal.coin,
    proposal.sl
  )}

💰 Estimated NET @ TP1:
${
  Number.isFinite(
    proposal.estimatedNetProfit
  )
    ? `RM${proposal.estimatedNetProfit.toFixed(
        2
      )}`
    : "N/A"
}

⭐ Score:
${proposal.score}

📊 Confidence:
${proposal.confidence}

🧠 Setup:
${proposal.setup}

━━━━━━━━━━━━━━

🤖 AUTO SESSION:
ACTIVE

⚠️ Order sebenar tidak dihantar oleh bot.
Gunakan setup ini untuk execution di Luno.

Untuk hentikan:
/autooff`;
}


/* ============================================================
   AUTO TRADE — BACKGROUND MONITOR

   IMPORTANT:
   1. Runs only when user explicitly enabled Auto Mode.
   2. Does nothing while positionActive = true.
   3. Does nothing if session is frozen.
   4. Uses existing scanner output.
   5. Does not submit BUY / SELL orders.
============================================================ */

async function runAutoTradeBackgroundMonitor() {
  if (
    AUTO_TRADE_RUNTIME.running
  ) {
    AUTO_TRADE_RUNTIME.skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS AUTO TRADE SCAN STILL RUNNING",
    };
  }

  if (
    !AUTO_TRADE_SESSION.enabled ||
    !AUTO_TRADE_SESSION.armed
  ) {
    return {
      skipped:
        true,

      reason:
        "AUTO TRADE OFF",
    };
  }

  if (
    AUTO_TRADE_SESSION.frozen
  ) {
    return {
      skipped:
        true,

      reason:
        "AUTO TRADE FROZEN",
    };
  }

  if (
    AUTO_TRADE_SESSION.stopRequested
  ) {
    resetAutoTradeSession(
      "STOP REQUESTED"
    );

    return {
      skipped:
        true,

      reason:
        "AUTO TRADE STOPPED",
    };
  }

  if (
    AUTO_TRADE_SESSION.positionActive
  ) {
    return {
      skipped:
        true,

      reason:
        "AUTO POSITION ALREADY ACTIVE",
    };
  }

  const chatId =
    AUTO_TRADE_SESSION.chatId;

  const coin =
    String(
      AUTO_TRADE_SESSION.coin ||
      ""
    ).toUpperCase();

  if (
    !chatId ||
    !coin
  ) {
    freezeAutoTradeSession(
      "INVALID AUTO SESSION STATE"
    );

    return {
      skipped:
        true,

      reason:
        "INVALID AUTO SESSION",
    };
  }

  AUTO_TRADE_RUNTIME.running =
    true;

  AUTO_TRADE_RUNTIME.lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    AUTO_TRADE_SESSION.lastCycleAt =
      Date.now();

    /*
       Make sure the latest market engines
       have an opportunity to refresh.

       GRT:
       master scanner runs every 1 minute.

       Altcoins:
       their own scanner remains 30 minutes
       to avoid API burst.

       We DO NOT launch extra altcoin scans
       every 60 seconds.
    */

    if (
      coin ===
      "GRT"
    ) {
      if (
        !MASTER_SCANNER_RUNTIME.running
      ) {
        await runMasterScanner1M();
      }
    }

    const candidate =
      getAutoTradePendingSetup(
        coin
      );

    if (
      !candidate
    ) {
      AUTO_TRADE_SESSION.status =
        "WAITING_SETUP";

      AUTO_TRADE_SESSION.awaitingSetup =
        true;

      AUTO_TRADE_RUNTIME.lastReason =
        "NO QUALIFIED SETUP";

      AUTO_TRADE_RUNTIME.lastCompletedAt =
        Date.now();

      AUTO_TRADE_RUNTIME.lastDurationMs =
        Date.now() -
        startedAt;

      AUTO_TRADE_RUNTIME.totalRuns++;

      return {
        skipped:
          false,

        ready:
          false,

        reason:
          "NO QUALIFIED SETUP",
      };
    }

    const proposal =
      buildAutoTradeNextProposal(
        candidate
      );

    if (
      !proposal.allowed
    ) {
      AUTO_TRADE_RUNTIME.lastReason =
        proposal.reason;

      AUTO_TRADE_RUNTIME.lastCompletedAt =
        Date.now();

      AUTO_TRADE_RUNTIME.lastDurationMs =
        Date.now() -
        startedAt;

      AUTO_TRADE_RUNTIME.totalRuns++;

      return {
        skipped:
          false,

        ready:
          false,

        reason:
          proposal.reason,
      };
    }

    AUTO_TRADE_RUNTIME.setupsDetected++;

    AUTO_TRADE_RUNTIME.lastSetupAt =
      Date.now();

    const previous =
      AUTO_TRADE_RUNTIME.lastProposal;

    const changed =
      hasAutoTradeProposalChanged(
        previous,
        proposal
      );

    const notificationCooldownPassed =
      !AUTO_TRADE_RUNTIME.lastNotificationAt ||
      Date.now() -
        AUTO_TRADE_RUNTIME.lastNotificationAt >=
        AUTO_TRADE_NOTIFY_COOLDOWN_MS;

    const firstReady =
      AUTO_TRADE_SESSION.status !==
      "SETUP_READY";

    AUTO_TRADE_SESSION.status =
      "SETUP_READY";

    AUTO_TRADE_SESSION.awaitingSetup =
      false;

    AUTO_TRADE_SESSION.lastDecisionAt =
      Date.now();

    AUTO_TRADE_RUNTIME.lastProposal =
      proposal;

    AUTO_TRADE_RUNTIME.lastReason =
      "QUALIFIED SETUP READY";

    /*
       Prevent Telegram spam.

       Notify:
       - first qualified setup
       - materially changed setup after cooldown
    */

    if (
      firstReady ||
      (
        changed &&
        notificationCooldownPassed
      )
    ) {
      await replyTelegram(
        chatId,
        buildAutoTradeSetupMessage(
          proposal
        )
      );

      AUTO_TRADE_RUNTIME.notifications++;

      AUTO_TRADE_RUNTIME.lastNotificationAt =
        Date.now();
    }

    AUTO_TRADE_RUNTIME.lastCompletedAt =
      Date.now();

    AUTO_TRADE_RUNTIME.lastDurationMs =
      Date.now() -
      startedAt;

    AUTO_TRADE_RUNTIME.totalRuns++;

    return {
      skipped:
        false,

      ready:
        true,

      proposal,
    };
  } catch (
    error
  ) {
    AUTO_TRADE_RUNTIME.errors++;

    AUTO_TRADE_RUNTIME.lastReason =
      error.message;

    console.log(
      "Auto trade background monitor error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    AUTO_TRADE_RUNTIME.running =
      false;
  }
}


/* ============================================================
   AUTO TRADE BACKGROUND STATUS
============================================================ */

function getAutoTradeBackgroundStatus() {
  return {
    running:
      AUTO_TRADE_RUNTIME.running,

    totalRuns:
      AUTO_TRADE_RUNTIME.totalRuns,

    skippedRuns:
      AUTO_TRADE_RUNTIME.skippedRuns,

    errors:
      AUTO_TRADE_RUNTIME.errors,

    setupsDetected:
      AUTO_TRADE_RUNTIME.setupsDetected,

    notifications:
      AUTO_TRADE_RUNTIME.notifications,

    lastStartedAt:
      AUTO_TRADE_RUNTIME.lastStartedAt,

    lastCompletedAt:
      AUTO_TRADE_RUNTIME.lastCompletedAt,

    lastDurationMs:
      AUTO_TRADE_RUNTIME.lastDurationMs,

    lastSetupAt:
      AUTO_TRADE_RUNTIME.lastSetupAt,

    lastNotificationAt:
      AUTO_TRADE_RUNTIME.lastNotificationAt,

    lastReason:
      AUTO_TRADE_RUNTIME.lastReason,

    session:
      getAutoTradeSessionStatus(),
  };
}


/* ============================================================
   COLLECT EXECUTED TRADES FOR ONE COIN
============================================================ */

async function collectExecutedTradesForCoin(
  coin
) {
  const history =
    TRADE_HISTORY[
      coin
    ] ||
    [];

  const lastTrade =
    history[
      history.length -
      1
    ];

  const since =
    lastTrade
      ?.timestamp ||
    null;

  const trades =
    await getRecentTrades(
      coin,
      since
    );

  let added =
    0;

  for (
    const trade of
    trades
  ) {
    const stored =
      storeExecutedTrade(
        coin,
        trade
      );

    if (
      stored
    ) {
      added++;

      updateDailyWatchTrade(
        coin,
        trade
      );
    }
  }

  return {
    coin,

    received:
      trades.length,

    added,
  };
}


/* ============================================================
   EXECUTED TRADE COLLECTOR

   Runs every 5 seconds.
============================================================ */

async function runExecutedTradeCollector() {
  const runtime =
    COLLECTOR_RUNTIME
      .executedTrades;

  if (
    runtime.running
  ) {
    runtime.skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS TRADE COLLECTION STILL RUNNING",
    };
  }

  if (
    TRADE_HISTORY_BUSY
  ) {
    runtime.skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "TRADE HISTORY BUSY",
    };
  }

  runtime.running =
    true;

  TRADE_HISTORY_BUSY =
    true;

  runtime.lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const results =
      [];

    /*
       Sequential collection reduces
       unnecessary API burst.
    */

    for (
      const coin of
      SCAN_COINS
    ) {
      const result =
        await collectExecutedTradesForCoin(
          coin
        );

      results.push(
        result
      );
    }

    runtime.lastCompletedAt =
      Date.now();

    runtime.lastDurationMs =
      Date.now() -
      startedAt;

    runtime.totalRuns++;

    return {
      skipped:
        false,

      results,

      durationMs:
        runtime.lastDurationMs,
    };
  } catch (
    error
  ) {
    runtime.errors++;

    console.log(
      "Executed trade collector error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    runtime.running =
      false;

    TRADE_HISTORY_BUSY =
      false;
  }
}


/* ============================================================
   PRICE MEMORY COLLECTOR

   Runs every 15 seconds.

   All configured coins are collected
   because altcoin 30M scanner also
   needs 5M / 15M / 60M memory.
============================================================ */

async function runPriceMemoryCollector() {
  const runtime =
    COLLECTOR_RUNTIME
      .priceMemory;

  if (
    runtime.running
  ) {
    runtime.skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS PRICE COLLECTION STILL RUNNING",
    };
  }

  runtime.running =
    true;

  runtime.lastStartedAt =
    Date.now();

  const startedAt =
    Date.now();

  try {
    const results =
      [];

    for (
      const coin of
      SCAN_COINS
    ) {
      const ticker =
        await getTicker(
          coin
        );

      if (
        ticker
      ) {
        updatePriceMemory(
          coin,
          ticker.currentPrice
        );

        updateDailyWatchPrice(
          coin,
          ticker.currentPrice
        );

        if (
          coin ===
          "GRT"
        ) {
          updateGRTMomentumPriceHistory(
            ticker.currentPrice
          );
        }

        results.push({
          coin,

          success:
            true,

          price:
            ticker.currentPrice,
        });
      } else {
        results.push({
          coin,

          success:
            false,
        });
      }
    }

    runtime.lastCompletedAt =
          Date.now();

    runtime.lastDurationMs =
      Date.now() -
      startedAt;

    runtime.totalRuns++;

    return {
      skipped:
        false,

      results,

      durationMs:
        runtime.lastDurationMs,
    };
  } catch (
    error
  ) {
    runtime.errors++;

    console.log(
      "Price memory collector error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    runtime.running =
      false;
  }
}


/* ============================================================
   BTC MASTER CONTEXT

   BTC is context only.
============================================================ */

async function scanMasterBTCContext() {
  const ticker =
    await getTicker(
      "BTC"
    );

  if (
    !ticker
  ) {
    return {
      ready:
        false,
    };
  }

  updatePriceMemory(
    "BTC",
    ticker.currentPrice
  );

  const [
    surge,
    twoHour,
  ] =
    await Promise.all([
      getBTCBuySurge(),

      analyze2HMarketCondition(
        "BTC"
      ),
    ]);

  return {
    ready:
      true,

    ticker,

    surge,

    twoHour,

    timestamp:
      Date.now(),
  };
}


/* ============================================================
   GRT MASTER SCAN

   Runs every 1 minute.

   Flow:
   Snapshot
      ↓
   Momentum Decision
      ↓
   BUY NOW?
      ↓
   Immediate alert
      ↓
   Scalping Entry
============================================================ */

async function scanMasterGRT() {
  const ticker =
    await getTicker(
      "GRT"
    );

  if (
    !ticker
  ) {
    return {
      ready:
        false,

      snapshot:
        null,

      processed:
        null,

      reason:
        "GRT TICKER UNAVAILABLE",
    };
  }

  updatePriceMemory(
    "GRT",
    ticker.currentPrice
  );

  updateGRTMomentumPriceHistory(
    ticker.currentPrice
  );

  updateDailyWatchPrice(
    "GRT",
    ticker.currentPrice
  );

  const snapshot =
    await getGRTMomentumSnapshot(
      ticker
    );

  const processed =
    await processGRTMasterScanResult(
      snapshot
    );

  return {
    ready:
      true,

    snapshot,

    processed,
  };
}


/* ============================================================
   MASTER SCANNER 1 MINUTE
============================================================ */

async function runMasterScanner1M() {
  if (
    MASTER_SCANNER_RUNTIME
      .running
  ) {
    MASTER_SCANNER_RUNTIME
      .skippedRuns++;

    return {
      skipped:
        true,

      reason:
        "PREVIOUS MASTER SCAN STILL RUNNING",
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

    MASTER_SCANNER_RUNTIME
      .latestGRTSnapshot =
      grtResult
        ?.snapshot ||
      null;

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
      "Master scanner error:",
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
      GRT_MOMENTUM_RUNTIME
        .phase,

    grtDirection:
      latest
        ?.decision
        ?.direction ||
      GRT_MOMENTUM_RUNTIME
        .lastDirection,

    grtPrice:
      latest
        ?.ticker
        ?.currentPrice ||
      null,
  };
}


/* ============================================================
   COLLECTOR STATUS
============================================================ */

function getCollectorStatus() {
  return {
    executedTrades: {
      ...COLLECTOR_RUNTIME
        .executedTrades,
    },

    priceMemory: {
      ...COLLECTOR_RUNTIME
        .priceMemory,
    },
  };
}


/* ============================================================
   GRT BUY NOW LEARNING MONITOR

   Each OPEN signal is checked against
   current GRT price.

   SUCCESS:
   price reached +0.30%

   FALSE:
   price reached -0.30%

   Otherwise keep OPEN.

   This is statistical learning only.
============================================================ */

async function runGRTBuyNowLearningMonitor() {
  if (
    GRT_LEARNING_RUNTIME
      .running
  ) {
    return {
      skipped:
        true,
    };
  }

  const openRecords =
    GRT_BUY_NOW_HISTORY.filter(
      (record) =>
        record.status ===
        "OPEN"
    );

  if (
    !openRecords.length
  ) {
    return {
      skipped:
        false,

      checked:
        0,
    };
  }

  GRT_LEARNING_RUNTIME
    .running =
    true;

  GRT_LEARNING_RUNTIME
    .lastStartedAt =
    Date.now();

  try {
    const ticker =
      await getTicker(
        "GRT"
      );

    if (
      !ticker
    ) {
      return {
        skipped:
          false,

        checked:
          0,

        reason:
          "TICKER UNAVAILABLE",
      };
    }

    const currentPrice =
      ticker.currentPrice;

    let completed =
      0;

    for (
      const record of
      openRecords
    ) {
      const change =
        percentChange(
          record.price,
          currentPrice
        );

      if (
        change >=
        GRT_BUY_NOW_SUCCESS_PCT
      ) {
        record.status =
          "COMPLETED";

        record.result =
          "SUCCESS";

        record.completedAt =
          Date.now();

        record.finalChangePct =
          change;

        record.finalPrice =
          currentPrice;

        completed++;
      } else if (
        change <=
        GRT_BUY_NOW_FALSE_PCT
      ) {
        record.status =
          "COMPLETED";

        record.result =
          "FALSE";

        record.completedAt =
          Date.now();

        record.finalChangePct =
          change;

        record.finalPrice =
          currentPrice;

        completed++;
      }
    }

    if (
      completed >
      0
    ) {
      saveGRTBuyNowHistory();
    }

    GRT_LEARNING_RUNTIME
      .lastCompletedAt =
      Date.now();

    GRT_LEARNING_RUNTIME
      .totalRuns++;

    return {
      skipped:
        false,

      checked:
        openRecords.length,

      completed,
    };
  } catch (
    error
  ) {
    GRT_LEARNING_RUNTIME
      .errors++;

    console.log(
      "GRT learning monitor error:",
      error.message
    );

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    GRT_LEARNING_RUNTIME
      .running =
      false;
  }
}


/* ============================================================
   DAILY WATCH MAINTENANCE
============================================================ */

async function runDailyWatchMaintenance() {
  try {
    const rollover =
      await checkDailyWatchRollover();

    if (
      rollover
        ?.rolled
    ) {
      saveDailyWatchState();
    }

    return rollover;
  } catch (
    error
  ) {
    console.log(
      "Daily watch maintenance error:",
      error.message
    );

    return {
      error:
        error.message,
    };
  }
}


/* ============================================================
   SAFE INTERVAL WRAPPER

   Prevent unhandled async rejection
   from crashing background scheduler.
============================================================ */

function createSafeInterval(
  name,
  handler,
  intervalMs
) {
  const timer =
    setInterval(
      async () => {
        try {
          await handler();
        } catch (
          error
        ) {
          SCHEDULER_RUNTIME
            .errors++;

          console.log(
            `${name} interval error:`,
            error.message
          );
        }
      },
      intervalMs
    );

  SCHEDULER_RUNTIME
    .intervals[
      name
    ] =
      timer;

  return timer;
}


/* ============================================================
   START SCHEDULER

   Duplicate-start protected.
============================================================ */

function startScheduler() {
  if (
    SCHEDULER_RUNTIME
      .started
  ) {
    return {
      started:
        false,

      reason:
        "SCHEDULER ALREADY STARTED",
    };
  }

  /*
     Core collectors.
  */

  createSafeInterval(
    "executedTrades",
    runExecutedTradeCollector,
    TRADE_COLLECT_INTERVAL
  );

  createSafeInterval(
    "priceMemory",
    runPriceMemoryCollector,
    PRICE_MEMORY_INTERVAL
  );

  /*
     GRT dedicated 1M scanner.
  */

  createSafeInterval(
    "grtMasterScanner",
    runMasterScanner1M,
    GRT_MASTER_SCAN_INTERVAL
  );

  /*
     XRP / XLM / CRV / AAVE.
     Every 30 minutes only.
  */

  createSafeInterval(
    "altcoinScanner",
    runAltcoinScalpingScanner,
    ALTCOIN_SCALPING_SCAN_INTERVAL
  );

  /*
     User-facing scheduled alerts.
  */

  createSafeInterval(
    "priceAlert",
    runPriceAlert,
    PRICE_ALERT_INTERVAL
  );

  createSafeInterval(
    "marketStructure",
    runMarketStructureAlert,
    MARKET_STRUCTURE_INTERVAL
  );

  /*
     Active scalping trade monitor.
  */

  createSafeInterval(
    "activeTradeMonitor",
    runActiveTradeMonitor,
    TRADE_MONITOR_INTERVAL
  );

  /*
     AUTO TRADE SESSION MONITOR.

     Runs every 60 seconds,
     but does nothing unless user
     has explicitly enabled AUTO MODE
     from PART 9.
  */

  createSafeInterval(
    "autoTradeMonitor",
    runAutoTradeBackgroundMonitor,
    AUTO_TRADE_SCAN_INTERVAL_MS
  );

  /*
     BUY NOW learning.
  */

  createSafeInterval(
    "grtLearning",
    runGRTBuyNowLearningMonitor,
    GRT_BUY_NOW_MONITOR_INTERVAL
  );

  /*
     Daily / 24H watch.
  */

  createSafeInterval(
    "dailyWatch",
    runDailyWatchMaintenance,
    DAILY_WATCH_CHECK_INTERVAL
  );

  createSafeInterval(
    "dailyWatchSave",
    async () => {
      saveDailyWatchState();
    },
    DAILY_WATCH_SAVE_INTERVAL
  );

  SCHEDULER_RUNTIME
    .started =
    true;

  SCHEDULER_RUNTIME
    .startedAt =
    Date.now();

  return {
    started:
      true,

    jobs:
      Object.keys(
        SCHEDULER_RUNTIME
          .intervals
      ),
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

    errors:
      SCHEDULER_RUNTIME
        .errors,

    activeIntervals:
      Object.keys(
        SCHEDULER_RUNTIME
          .intervals
      ),
  };
}


/* ============================================================
   ALERT DELIVERY STATUS
============================================================ */

function getAlertDeliveryStatus() {
  return {
    priceAlert:
      getPriceAlertStatus(),

    marketStructure:
      getMarketStructureAlertStatus(),
  };
}


/* ============================================================
   EXTRA BACKGROUND STATUS
============================================================ */

function getExtraBackgroundStatus() {
  return {
    altcoinScanner:
      getAltcoinScannerStatus(),

    activeTradeMonitor:
      getActiveTradeMonitorStatus(),

    autoTrade:
      getAutoTradeBackgroundStatus(),

    grtLearning: {
      running:
        GRT_LEARNING_RUNTIME
          .running,

      totalRuns:
        GRT_LEARNING_RUNTIME
          .totalRuns,

      errors:
        GRT_LEARNING_RUNTIME
          .errors,

      lastStartedAt:
        GRT_LEARNING_RUNTIME
          .lastStartedAt,

      lastCompletedAt:
        GRT_LEARNING_RUNTIME
          .lastCompletedAt,
    },
  };
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

    autoTrade:
      getAutoTradeBackgroundStatus(),

    extraBackground:
      getExtraBackgroundStatus(),
  };
}


/* ============================================================
   RESET AUTO TRADE ON BOOT

   CRITICAL SAFETY RULE:

   Server restart / Render redeploy
   must NEVER resume an old auto session.

   User must finish first trade again
   and explicitly press YES again.
============================================================ */

function enforceAutoTradeOffOnBoot() {
  AUTO_TRADE_SESSION.enabled =
    false;

  AUTO_TRADE_SESSION.armed =
    false;

  AUTO_TRADE_SESSION.status =
    "OFF";

  AUTO_TRADE_SESSION.chatId =
    null;

  AUTO_TRADE_SESSION.coin =
    null;

  AUTO_TRADE_SESSION.capital =
    null;

  AUTO_TRADE_SESSION.lastTradeCapital =
    null;

  AUTO_TRADE_SESSION.previousTrade =
    null;

  AUTO_TRADE_SESSION.sourceTradeId =
    null;

  AUTO_TRADE_SESSION.startedAt =
    null;

  AUTO_TRADE_SESSION.lastCycleAt =
    null;

  AUTO_TRADE_SESSION.lastDecisionAt =
    null;

  AUTO_TRADE_SESSION.cycleCount =
    0;

  AUTO_TRADE_SESSION.awaitingSetup =
    false;

  AUTO_TRADE_SESSION.positionActive =
    false;

  AUTO_TRADE_SESSION.frozen =
    false;

  AUTO_TRADE_SESSION.freezeReason =
    null;

  AUTO_TRADE_SESSION.stopRequested =
    false;

  AUTO_TRADE_RUNTIME.lastProposal =
    null;

  AUTO_TRADE_RUNTIME.lastNotificationAt =
    null;

  console.log(
    "🤖 AUTO TRADE: OFF ON STARTUP"
  );
}


/* ============================================================
   STARTUP DATA WARMUP

   Purpose:
   populate enough initial state
   before normal intervals take over.

   We do NOT wait 30 minutes for
   first altcoin scan.

   First altcoin scan is allowed
   after startup warmup.
============================================================ */

async function warmupBackgroundData() {
  const results =
    {};

  try {
    results.priceMemory =
      await runPriceMemoryCollector();
  } catch (
    error
  ) {
    results.priceMemory = {
      error:
        error.message,
    };
  }

  try {
    results.executedTrades =
      await runExecutedTradeCollector();
  } catch (
    error
  ) {
    results.executedTrades = {
      error:
        error.message,
    };
  }

  try {
    results.master =
      await runMasterScanner1M();
  } catch (
    error
  ) {
    results.master = {
      error:
        error.message,
    };
  }

  return results;
}


/* ============================================================
   START ALL BACKGROUND SERVICES

   Duplicate-start protected.
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
        "BACKGROUND SERVICES ALREADY STARTED",
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
        "BACKGROUND SERVICES ARE STARTING",
    };
  }

  BACKGROUND_STARTUP_RUNTIME
    .starting =
    true;

  try {
    /*
       CRITICAL:
       Auto trade always OFF after
       process startup / restart.
    */

    enforceAutoTradeOffOnBoot();

    /*
       Restore persisted analytical
       data only.

       AUTO TRADE SESSION IS NOT
       PERSISTED OR RESTORED.
    */

    loadGRTBuyNowHistory();

    loadGRTTuning();

    loadDailyWatchState();

    await checkDailyWatchRollover();

    /*
       Start scheduler BEFORE warmup,
       but normal intervals won't fire
       immediately.
    */

    const scheduler =
      startScheduler();

    /*
       Initial warmup.
    */

    const warmup =
      await warmupBackgroundData();

    /*
       Run one altcoin opportunity scan
       at startup too.

       If nothing qualifies:
       no Telegram alert.
    */

    let altcoinWarmup =
      null;

    try {
      altcoinWarmup =
        await runAltcoinScalpingScanner();
    } catch (
      error
    ) {
      altcoinWarmup = {
        error:
          error.message,
      };
    }

    BACKGROUND_STARTUP_RUNTIME
      .started =
      true;

    BACKGROUND_STARTUP_RUNTIME
      .startedAt =
      Date.now();

    return {
      started:
        true,

      scheduler,

      warmup,

      altcoinWarmup,

      autoTrade: {
        enabled:
          AUTO_TRADE_SESSION.enabled,

        status:
          AUTO_TRADE_SESSION.status,
      },
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
   STARTUP TELEGRAM MESSAGE
============================================================ */

async function sendStartupMessage() {
  const scheduler =
    getSchedulerStatus();

  const message =
    `🤖 ONE AI COIN ALERT ONLINE

✅ SERVICE ACTIVE

🧠 GRT MASTER SCANNER:
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

🤖 AUTO SESSION CHECK:
1 MIN

🪙 ALTCOIN SCANNER:
30 MIN

Altcoins:
XRP / XLM / CRV / AAVE

🎯 GRT MAX SCALPING:
${MAX_GRT_SCALPING_QUANTITY.toLocaleString(
      "en-MY"
    )} UNIT

🪙 GRT STATE:
${GRT_MOMENTUM_RUNTIME.phase}

🤖 AUTO TRADE:
OFF

⚠️ Auto Mode requires:
1️⃣ First trade completed
2️⃣ Trade closed
3️⃣ User presses YES

📍 SERVICE:
${SERVICE_CODE}

━━━━━━━━━━━━━━

Startup:
${scheduler.started
  ? "COMPLETE"
  : "PARTIAL"}`;

  return sendTelegram(
    message
  );
}


/* ============================================================
   FINAL BACKGROUND BOOTSTRAP
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

      console.log(
        "🤖 AUTO TRADE ENGINE: READY — SESSION OFF"
      );

      await sendStartupMessage();
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
}


/* ============================================================
   ROOT ROUTE
============================================================ */

app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      service:
        "ONE AI COIN ALERT",

      status:
        "ONLINE",

      serviceCode:
        SERVICE_CODE,

      autoTrade: {
        enabled:
          AUTO_TRADE_SESSION
            .enabled,

        status:
          AUTO_TRADE_SESSION
            .status,

        coin:
          AUTO_TRADE_SESSION
            .coin,
      },

      uptimeSeconds:
        Math.floor(
          (
            Date.now() -
            BOT_STARTED_AT
          ) /
          1000
        ),

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   HEALTH ROUTE
============================================================ */

app.get(
  "/health",
  (
    req,
    res
  ) => {
    const background =
      getBackgroundServicesStatus();

    res.json({
      ok:
        true,

      service:
        "ONE AI COIN ALERT",

      serviceCode:
        SERVICE_CODE,

      uptimeSeconds:
        Math.floor(
          (
            Date.now() -
            BOT_STARTED_AT
          ) /
          1000
        ),

      grt: {
        phase:
          GRT_MOMENTUM_RUNTIME
            .phase,

        direction:
          GRT_MOMENTUM_RUNTIME
            .lastDirection,

        lastDecision:
          LAST_GRT_FINAL_DECISION,

        engineReady:
          GRT_ENGINE_HAS_BEEN_READY,
      },

      autoTrade: {
        enabled:
          AUTO_TRADE_SESSION
            .enabled,

        armed:
          AUTO_TRADE_SESSION
            .armed,

        status:
          AUTO_TRADE_SESSION
            .status,

        coin:
          AUTO_TRADE_SESSION
            .coin,

        capital:
          AUTO_TRADE_SESSION
            .capital,

        cycleCount:
          AUTO_TRADE_SESSION
            .cycleCount,

        positionActive:
          AUTO_TRADE_SESSION
            .positionActive,

        frozen:
          AUTO_TRADE_SESSION
            .frozen,

        freezeReason:
          AUTO_TRADE_SESSION
            .freezeReason,

        runtime:
          getAutoTradeBackgroundStatus(),
      },

      activeTrades:
        Object.keys(
          ACTIVE_TRADES
        ),

      pendingEntries:
        Object.keys(
          PENDING_ENTRIES
        ),

      background,

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   TELEGRAM POLLING ERROR
============================================================ */

bot.on(
  "polling_error",
  (
    error
  ) => {
    console.log(
      "Telegram polling error:",
      error.message
    );
  }
);


/* ============================================================
   PROCESS ERROR GUARDS
============================================================ */

process.on(
  "unhandledRejection",
  (
    reason
  ) => {
    console.log(
      "Unhandled rejection:",
      reason
    );
  }
);


process.on(
  "uncaughtException",
  (
    error
  ) => {
    console.log(
      "Uncaught exception:",
      error.message
    );
  }
);


/* ============================================================
   SAVE STATE BEFORE EXIT

   IMPORTANT:
   AUTO TRADE SESSION IS DELIBERATELY
   NOT SAVED.

   Restart = AUTO OFF.
============================================================ */

function saveAllPersistentState() {
  saveGRTBuyNowHistory();

  saveGRTTuning();

  saveDailyWatchState();
}


process.on(
  "SIGTERM",
  () => {
    /*
       Do NOT persist AUTO_TRADE_SESSION.
    */

    saveAllPersistentState();

    process.exit(
      0
    );
  }
);


process.on(
  "SIGINT",
  () => {
    /*
       Do NOT persist AUTO_TRADE_SESSION.
    */

    saveAllPersistentState();

    process.exit(
      0
    );
  }
);


/* ============================================================
   EXPRESS START
============================================================ */

app.listen(
  PORT,
  () => {
    console.log(
      `ONE AI COIN ALERT running on port ${PORT}`
    );

    console.log(
      `Service code: ${SERVICE_CODE}`
    );

    console.log(
      "🤖 AUTO TRADE DEFAULT: OFF"
    );
  }
);


/* ============================================================
   BOOTSTRAP BACKGROUND SERVICES
============================================================ */

bootstrapBackgroundServices();


/* ============================================================
   END PART 10
   END ONE AI COIN ALERT
============================================================ */
