/* ============================================================
   PART 1 — SERVER + CONFIG + GLOBAL STATE

   SAFWAN CRIPTO AI ALERT
   NEW DEVELOPMENT BUILD

   PURPOSE:
   - Server + Telegram setup
   - Environment configuration
   - Luno MAIN / TRADE account separation
   - Coin configuration
   - Shared market / momentum / breakout configuration
   - GRT Global Lead configuration
   - Semi-auto session / execution safety state
   - Persistence paths
   - Global runtime state

   IMPORTANT:
   - No market analysis happens in PART 1.
   - No real BUY / SELL happens in PART 1.
   - Real orders are SEMI-AUTO only and always require
     explicit Telegram confirmation per transaction.
   - No withdrawal / transfer-out capability exists.
============================================================ */

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const crypto = require("crypto");


/* ============================================================
   EXPRESS SERVER
============================================================ */

const app = express();

app.use(
  express.json()
);

const PORT =
  Number(
    process.env.PORT ||
    3000
  );


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


bot.setMyCommands([
  {
    command: "start",
    description: "Show bot commands",
  },
  {
    command: "market",
    description: "GRT market structure + Global Lead",
  },
  {
    command: "flow",
    description: "Check 2H executed flow",
  },
  {
    command: "grt24",
    description: "GRT 24H report",
  },
  {
    command: "grthold",
    description: "GRT hold analysis",
  },
  {
    command: "learning",
    description: "GRT BUY NOW learning statistics",
  },
  {
    command: "tuning",
    description: "GRT momentum tuning status",
  },
  {
    command: "altstatus",
    description: "Altcoin scanner status",
  },
  {
    command: "tradestatus",
    description: "Active trade status",
  },
  {
    command: "autotrade",
    description: "Start semi-auto trade session",
  },
  {
    command: "autostatus",
    description: "Check semi-auto session status",
  },
  {
    command: "autooff",
    description: "Stop semi-auto session",
  },
  {
    command: "status",
    description: "Bot system status",
  },
  {
    command: "health",
    description: "Bot health diagnostics",
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
   SERVICE / RUNTIME IDENTITY
============================================================ */

const SERVICE_CODE =
  `[${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}]`;

const BOT_STARTED_AT =
  Date.now();

const BUILD_NAME =
  "SAFWAN CRIPTO AI ALERT";

const BUILD_MODE =
  "SEMI_AUTO";


/* ============================================================
   LUNO ACCOUNT ARCHITECTURE
============================================================ */

const LUNO_MAIN_API_KEY_ID =
  process.env.LUNO_MAIN_API_KEY_ID ||
  process.env.LUNO_API_KEY_ID ||
  "";

const LUNO_MAIN_API_KEY_SECRET =
  process.env.LUNO_MAIN_API_KEY_SECRET ||
  process.env.LUNO_API_KEY_SECRET ||
  "";

const LUNO_TRADE_API_KEY_ID =
  process.env.LUNO_TRADE_API_KEY_ID ||
  "";

const LUNO_TRADE_API_KEY_SECRET =
  process.env.LUNO_TRADE_API_KEY_SECRET ||
  "";

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
   FEES
============================================================ */

const BUY_FEE =
  0.005;

const SELL_FEE =
  0.005;


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

const ALTCOIN_SCALPING_COINS = [
  "XRP",
  "XLM",
  "CRV",
  "AAVE",
];

const MARKET_ROLE = {
  BTC: "MARKET_CONTEXT",
  GRT: "PRIMARY_ENGINE",
  XRP: "ALTCOIN_OPPORTUNITY",
  XLM: "ALTCOIN_OPPORTUNITY",
  CRV: "ALTCOIN_OPPORTUNITY",
  AAVE: "ALTCOIN_OPPORTUNITY",
};


/* ============================================================
   MAIN INTERVALS
============================================================ */

const GRT_MASTER_SCAN_INTERVAL =
  60 * 1000;

const ALTCOIN_SCALPING_SCAN_INTERVAL =
  30 * 60 * 1000;

const PRICE_ALERT_INTERVAL =
  5 * 60 * 1000;

const MARKET_STRUCTURE_INTERVAL =
  15 * 60 * 1000;

const TRADE_COLLECT_INTERVAL =
  5 * 1000;

const PRICE_MEMORY_INTERVAL =
  15 * 1000;

const TRADE_MONITOR_INTERVAL =
  15 * 1000;

const DAILY_WATCH_CHECK_INTERVAL =
  60 * 1000;

const DAILY_WATCH_SAVE_INTERVAL =
  60 * 1000;

const GRT_BUY_NOW_MONITOR_INTERVAL =
  60 * 1000;

const SEMI_AUTO_STATE_SAVE_INTERVAL =
  30 * 1000;


/* ============================================================
   MARKET TIME WINDOWS
============================================================ */

const FIVE_MINUTES =
  5 * 60 * 1000;

const FIFTEEN_MINUTES =
  15 * 60 * 1000;

const THIRTY_MINUTES =
  30 * 60 * 1000;

const ONE_HOUR =
  60 * 60 * 1000;

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
   COOLDOWNS / ANTI-SPAM
============================================================ */

const GLOBAL_SCALPING_COOLDOWN =
  5 * 60 * 1000;

const PER_COIN_COOLDOWN =
  10 * 60 * 1000;

const GRT_BUY_NOW_COOLDOWN_MS =
  15 * 60 * 1000;

const BREAKOUT_ALERT_COOLDOWN_MS =
  10 * 60 * 1000;

const FAKE_BREAKOUT_ALERT_COOLDOWN_MS =
  15 * 60 * 1000;


/* ============================================================
   GRT QUANTITY / PRACTICAL ENTRY LIMITS
============================================================ */

const MAX_GRT_SCALPING_QUANTITY =
  30000;

const MAX_ENTRY_CHASE_PCT =
  0.30;

const MIN_GROSS_ROOM_PCT =
  1.30;

const GRT_MIN_PRACTICAL_TP_ROOM_PCT =
  0.90;

const TP_RESISTANCE_BUFFER_PCT =
  0.25;


/* ============================================================
   ORDERBOOK STRUCTURE
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

const MEANINGFUL_RESISTANCE_MIN_RATING =
  5;

const MEANINGFUL_RESISTANCE_MIN_RATIO =
  1.35;

const GRT_WEAK_RESISTANCE_MAX_RATING =
  3;

const GRT_MEDIUM_RESISTANCE_MAX_RATING =
  6;

const GRT_STRONG_RESISTANCE_MIN_RATING =
  7;


/* ============================================================
   BREAKOUT INTELLIGENCE CONFIG
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
   DEFAULT PROJECTED TP
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
   GRT MOMENTUM CONFIG
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

const GRT_DIRECTION_SLOW_UP_5M_PCT =
  0.08;

const GRT_DIRECTION_FAST_UP_5M_PCT =
  0.35;

const GRT_DIRECTION_ACTIVE_DROP_5M_PCT =
  -0.20;

const GRT_DIRECTION_MIN_SEQUENCE_PCT =
  55;

const GRT_HARD_SELL_VOLUME_PCT =
  65;

const GRT_HARD_PRICE_DROP_5M_PCT =
  -0.35;


/* ============================================================
   GRT GLOBAL LEAD CONFIG
============================================================ */

const GRT_GLOBAL_LEAD_CONFIG = {
  coin: "GRT",

  fiveMinuteWindowMs:
    FIVE_MINUTES,

  fifteenMinuteWindowMs:
    FIFTEEN_MINUTES,

  directionThresholdPct:
    0.08,

  meaningfulGapPct:
    0.30,

  strongGapPct:
    0.75,

  staleAfterMs:
    2 * 60 * 1000,

  historyKeepMs:
    60 * 60 * 1000,

  minimumSamples5m:
    2,

  minimumSamples15m:
    3,
};


/* ============================================================
   GRT HOLD PROJECTED REACH
============================================================ */

const GRT_HOLD_BASE_REACH = {
  WEAK: 0.75,
  NEUTRAL: 1.25,
  BUILDING: 1.80,
  STRONG: 2.75,
  ACCELERATING: 4.00,
};

const GRT_HOLD_MAX_DYNAMIC_REACH_PCT =
  6.00;


/* ============================================================
   GRT BUY NOW LEARNING / TUNING
============================================================ */

const GRT_BUY_NOW_HISTORY_LIMIT =
  250;

const GRT_BUY_NOW_SUCCESS_PCT =
  0.30;

const GRT_BUY_NOW_FALSE_PCT =
  -0.30;

const GRT_TUNING_MIN_COMPLETED_SIGNALS =
  20;


/* ============================================================
   REAL ORDER / SEMI-AUTO SAFETY
============================================================ */

const SEMI_AUTO_EXECUTION_ENABLED =
  true;

const REQUIRE_CONFIRMATION_EVERY_REAL_ORDER =
  true;

const EXECUTION_LOCK_TIMEOUT_MS =
  30 * 1000;

const ORDER_STATUS_POLL_INTERVAL_MS =
  1500;

const ORDER_STATUS_POLL_TIMEOUT_MS =
  45 * 1000;

const TELEGRAM_ACTION_TOKEN_TTL_MS =
  15 * 60 * 1000;

const TP_EXTENSION_STEP_PCT =
  1.00;


const SEMI_AUTO_SESSION_STATES =
  Object.freeze({
    OFF:
      "OFF",

    WAITING_SETUP:
      "WAITING_SETUP",

    WAIT_BUY_CONFIRM:
      "WAIT_BUY_CONFIRM",

    BUY_SUBMITTED:
      "BUY_SUBMITTED",

    POSITION_ACTIVE:
      "POSITION_ACTIVE",

    WAIT_SELL_CONFIRM:
      "WAIT_SELL_CONFIRM",
  });


const TRADE_POSITION_STATES =
  Object.freeze({
    NONE:
      "NONE",

    BUY_PENDING:
      "BUY_PENDING",

    ACTIVE:
      "ACTIVE",

    SELL_PENDING:
      "SELL_PENDING",

    PARTIALLY_CLOSED:
      "PARTIALLY_CLOSED",

    CLOSED:
      "CLOSED",
  });


/* ============================================================
   PERSISTENCE FILES
============================================================ */

const GRT_BUY_NOW_FILE =
  process.env.GRT_BUY_NOW_FILE ||
  "/tmp/grt-buy-now-history.json";

const GRT_TUNING_FILE =
  process.env.GRT_TUNING_FILE ||
  "/tmp/grt-momentum-tuning.json";

const DAILY_WATCH_FILE =
  process.env.DAILY_WATCH_FILE ||
  "/tmp/grt-daily-watch.json";

const SEMI_AUTO_STATE_FILE =
  process.env.SEMI_AUTO_STATE_FILE ||
  "/tmp/grt-semi-auto-state.json";

const ACTIVE_TRADE_STATE_FILE =
  process.env.ACTIVE_TRADE_STATE_FILE ||
  "/tmp/grt-active-trade-state.json";


/* ============================================================
   MALAYSIA TIMEZONE
============================================================ */

const MALAYSIA_TIMEZONE =
  "Asia/Kuala_Lumpur";

const GRT_DAILY_HISTORY_DAYS =
  7;


/* ============================================================
   GENERIC TRADE / TELEGRAM STATE
============================================================ */

const ACTIVE_TRADES =
  {};

const PENDING_ENTRIES =
  {};

const USER_STATE =
  {};

const LAST_SIGNAL =
  {};

let LAST_GLOBAL_SIGNAL =
  0;

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
   GRT GLOBAL LEAD RUNTIME
============================================================ */

const GRT_GLOBAL_LEAD_RUNTIME = {
  ready:
    false,

  updatedAt:
    null,

  globalPrice:
    null,

  lunoPrice:
    null,

  global5mPct:
    null,

  global15mPct:
    null,

  gapPct:
    null,

  globalDirection:
    "UNKNOWN",

  lunoDirection:
    "UNKNOWN",

  globalSupport:
    null,

  globalResistance:
    null,

  lunoSupport:
    null,

  lunoResistance:
    null,

  status:
    "COLLECTING",

  lastError:
    null,
};

const GRT_GLOBAL_PRICE_MEMORY =
  [];


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
   SEMI-AUTO SESSION RUNTIME
============================================================ */

const SEMI_AUTO_SESSION = {
  enabled:
    false,

  state:
    SEMI_AUTO_SESSION_STATES.OFF,

  chatId:
    null,

  capitalMYR:
    0,

  startedAt:
    null,

  updatedAt:
    null,

  cycleCount:
    0,

  successCount:
    0,

  failCount:
    0,

  pendingCandidate:
    null,

  pendingOrderPlan:
    null,

  lastDecision:
    null,

  lastError:
    null,
};


/* ============================================================
   EXECUTION SAFETY RUNTIME
============================================================ */

const EXECUTION_RUNTIME = {
  locked:
    false,

  lockType:
    null,

  lockToken:
    null,

  lockedAt:
    null,

  lastClientOrderId:
    null,

  lastOrderId:
    null,

  lastOrderState:
    null,

  lastError:
    null,
};


/* ============================================================
   TELEGRAM ACTION STATE
============================================================ */

const TELEGRAM_ACTIONS =
  new Map();


/* ============================================================
   ACTIVE POSITION STATE
============================================================ */

let ACTIVE_POSITION =
  null;


/* ============================================================
   SYSTEM HEALTH / DIAGNOSTICS
============================================================ */

const SYSTEM_HEALTH = {
  bootedAt:
    BOT_STARTED_AT,

  mainApiReady:
    LUNO_API_STATUS.mainReady,

  tradeApiReady:
    LUNO_API_STATUS.tradeReady,

  telegramReady:
    true,

  priceCollectorReady:
    false,

  tradeCollectorReady:
    false,

  grtBaselineReady:
    false,

  grtScannerReady:
    false,

  globalLeadReady:
    false,

  altcoinScannerReady:
    false,

  activeTradeMonitorReady:
    false,

  lastCriticalError:
    null,
};


/* ============================================================
   PART 1 HELPER — CLIENT ORDER ID SEED
============================================================ */

function createClientOrderId(
  prefix = "SAFWAN"
) {
  const random =
    crypto
      .randomBytes(
        5
      )
      .toString(
        "hex"
      )
      .toUpperCase();

  return `${prefix}-${Date.now()}-${random}`;
}


/* ============================================================
   END PART 1
============================================================ */


/* ============================================================
   PART 2 — LUNO API + GLOBAL API + BASIC DATA HELPERS

   PURPOSE:
   - Safe number / formatting helpers
   - Canonical coin / pair mapping
   - Luno MAIN read helpers
   - Luno TRADE read foundation
   - Ticker / orderbook / executed trades / candles
   - Price memory + rolling price change
   - GRT global-market price/history foundation
   - Fee / quantity calculations
   - Telegram send helpers

   IMPORTANT:
   - No trading decision happens here.
   - No BUY / SELL order is submitted here.
   - MAIN is used for market/read functions.
   - TRADE is reserved for balance/order/execution layers later.
   - No withdrawal / transfer-out capability exists.
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
    ) ||
    values.length ===
      0
  ) {
    return 0;
  }

  const clean =
    values
      .map(
        (
          value
        ) =>
          Number(
            value
          )
      )
      .filter(
        (
          value
        ) =>
          Number.isFinite(
            value
          )
      );

  if (
    clean.length ===
    0
  ) {
    return 0;
  }

  return (
    clean.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    clean.length
  );
}


function sum(
  values
) {
  if (
    !Array.isArray(
      values
    ) ||
    values.length ===
      0
  ) {
    return 0;
  }

  return values.reduce(
    (
      total,
      value
    ) =>
      total +
      safeNumber(
        value,
        0
      ),
    0
  );
}


function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      safeNumber(
        value,
        minimum
      )
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


function percentDistance(
  fromPrice,
  toPrice
) {
  return percentChange(
    fromPrice,
    toPrice
  );
}


function formatPercent(
  value,
  digits = 2,
  showPlus = true
) {
  const number =
    safeNumber(
      value,
      0
    );

  const prefix =
    showPlus &&
    number >
      0
      ? "+"
      : "";

  return (
    `${prefix}` +
    `${number.toFixed(
      digits
    )}%`
  );
}


function sleep(
  ms
) {
  return new Promise(
    (
      resolve
    ) =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function roundTo(
  value,
  decimals = 8
) {
  const number =
    safeNumber(
      value,
      0
    );

  const places =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          decimals,
          8
        )
      )
    );

  const factor =
    10 **
    places;

  return (
    Math.round(
      (
        number +
        Number.EPSILON
      ) *
        factor
    ) /
    factor
  );
}


function floorTo(
  value,
  decimals = 8
) {
  const number =
    safeNumber(
      value,
      0
    );

  const places =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          decimals,
          8
        )
      )
    );

  const factor =
    10 **
    places;

  return (
    Math.floor(
      number *
        factor
    ) /
    factor
  );
}


function formatPrice(
  value
) {
  const price =
    safeNumber(
      value,
      0
    );

  if (
    price >=
    1000
  ) {
    return price.toFixed(
      2
    );
  }

  if (
    price >=
    100
  ) {
    return price.toFixed(
      3
    );
  }

  if (
    price >=
    1
  ) {
    return price.toFixed(
      4
    );
  }

  if (
    price >=
    0.1
  ) {
    return price.toFixed(
      4
    );
  }

  if (
    price >=
    0.01
  ) {
    return price.toFixed(
      5
    );
  }

  return price.toFixed(
    6
  );
}


function formatMYR(
  value
) {
  return (
    `RM${formatPrice(
      value
    )}`
  );
}


function normalizeCoin(
  value
) {
  const coin =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();

  return SCAN_COINS.includes(
    coin
  )
    ? coin
    : null;
}


/* ============================================================
   COIN → LUNO PAIR
============================================================ */

const LUNO_PAIR_MAP =
  Object.freeze({
    BTC:
      "XBTMYR",

    GRT:
      "GRTMYR",

    XRP:
      "XRPMYR",

    XLM:
      "XLMMYR",

    CRV:
      "CRVMYR",

    AAVE:
      "AAVEMYR",
  });


function getPair(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    throw new Error(
      `UNSUPPORTED COIN: ${coin}`
    );
  }

  return LUNO_PAIR_MAP[
    normalized
  ];
}


/* ============================================================
   LUNO AUTH
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
   HTTP / API ERROR HELPERS
============================================================ */

function getHttpStatus(
  error
) {
  return safeNumber(
    error
      ?.response
      ?.status,
    0
  );
}


function getApiErrorMessage(
  error
) {
  return (
    error
      ?.response
      ?.data
      ?.error ||

    error
      ?.response
      ?.data
      ?.error_code ||

    error
      ?.response
      ?.data
      ?.message ||

    error
      ?.message ||

    "UNKNOWN API ERROR"
  );
}


function isTransientHttpError(
  error
) {
  const status =
    getHttpStatus(
      error
    );

  return (
    status ===
      0 ||

    status ===
      408 ||

    status ===
      425 ||

    status ===
      429 ||

    status >=
      500
  );
}


/* ============================================================
   LUNO REQUEST FOUNDATION
============================================================ */

const LUNO_API_BASE_URL =
  "https://api.luno.com";


async function lunoRequest({
  method = "GET",
  endpoint,
  params = {},
  data = undefined,
  accountType = "MAIN",
  authenticated = false,
  timeoutMs = 15000,
}) {
  if (
    !endpoint
  ) {
    throw new Error(
      "LUNO ENDPOINT REQUIRED"
    );
  }

  const normalizedAccount =
    String(
      accountType ||
      "MAIN"
    ).toUpperCase();

  if (
    ![
      "MAIN",
      "TRADE",
    ].includes(
      normalizedAccount
    )
  ) {
    throw new Error(
      `INVALID LUNO ACCOUNT TYPE: ${accountType}`
    );
  }

  const options = {
    method,

    url:
      `${LUNO_API_BASE_URL}${endpoint}`,

    params,

    timeout:
      timeoutMs,
  };

  if (
    data !==
    undefined
  ) {
    options.data =
      data;
  }

  if (
    authenticated
  ) {
    const auth =
      normalizedAccount ===
      "TRADE"
        ? getLunoTradeAuth()
        : getLunoMainAuth();

    if (
      !auth
    ) {
      throw new Error(
        normalizedAccount ===
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
    response
      ?.data ??
    null
  );
}


async function lunoGet(
  endpoint,
  params = {},
  authenticated = false,
  accountType = "MAIN"
) {
  return lunoRequest({
    method:
      "GET",

    endpoint,

    params,

    authenticated,

    accountType,
  });
}


/* ============================================================
   TICKER

   CANONICAL SHAPE:

   {
     coin,
     pair,
     currentPrice,
     bid,
     ask,
     lastTrade,
     rolling24HourVolume,
     timestamp
   }
============================================================ */

async function getTicker(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return null;
  }

  try {
    const pair =
      getPair(
        normalized
      );

    const data =
      await lunoGet(
        "/api/1/ticker",
        {
          pair,
        },
        false,
        "MAIN"
      );

    const bid =
      safeNumber(
        data?.bid,
        0
      );

    const ask =
      safeNumber(
        data?.ask,
        0
      );

    const lastTrade =
      safeNumber(
        data?.last_trade,
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

    LAST_PRICE[
      normalized
    ] =
      currentPrice;

    return {
      coin:
        normalized,

      pair,

      currentPrice,

      bid,

      ask,

      lastTrade,

      rolling24HourVolume:
        safeNumber(
          data
            ?.rolling_24_hour_volume,
          0
        ),

      timestamp:
        Date.now(),
    };
  } catch (
    error
  ) {
    console.log(
      `Ticker ${normalized} error:`,
      getApiErrorMessage(
        error
      )
    );

    return null;
  }
}


async function getCurrentPrice(
  coin
) {
  const ticker =
    await getTicker(
      coin
    );

  return (
    ticker
      ?.currentPrice ||
    0
  );
}


/* ============================================================
   ORDERBOOK
============================================================ */

function normalizeOrderBookSide(
  items
) {
  if (
    !Array.isArray(
      items
    )
  ) {
    return [];
  }

  return items
    .map(
      (
        item
      ) => ({
        price:
          safeNumber(
            item?.price,
            0
          ),

        volume:
          safeNumber(
            item?.volume,
            0
          ),
      })
    )
    .filter(
      (
        item
      ) =>
        item.price >
          0 &&
        item.volume >
          0
    );
}


async function getOrderBook(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return null;
  }

  try {
    const pair =
      getPair(
        normalized
      );

    const data =
      await lunoGet(
        "/api/1/orderbook",
        {
          pair,
        },
        false,
        "MAIN"
      );

    return {
      coin:
        normalized,

      pair,

      bids:
        normalizeOrderBookSide(
          data?.bids
        ),

      asks:
        normalizeOrderBookSide(
          data?.asks
        ),

      timestamp:
        Date.now(),
    };
  } catch (
    error
  ) {
    console.log(
      `Orderbook ${normalized} error:`,
      getApiErrorMessage(
        error
      )
    );

    return null;
  }
}


/* ============================================================
   EXECUTED TRADES
============================================================ */

function normalizeLunoTrade(
  trade
) {
  if (
    !trade
  ) {
    return null;
  }

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

  if (
    timestamp <=
      0 ||
    price <=
      0 ||
    volume <=
      0
  ) {
    return null;
  }

  const isBuy =
    trade.is_buy ===
      true ||
    trade.is_buy ===
      "true";

  return {
    sequence:
      trade.sequence ??
      `${timestamp}:${price}:${volume}:${isBuy ? "B" : "S"}`,

    timestamp,

    price,

    volume,

    isBuy,
  };
}


async function getRecentTrades(
  coin,
  since = null
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return [];
  }

  try {
    const pair =
      getPair(
        normalized
      );

    const params = {
      pair,
    };

    if (
      since !==
        null &&
      since !==
        undefined
    ) {
      params.since =
        safeNumber(
          since,
          0
        );
    }

    const data =
      await lunoGet(
        "/api/1/trades",
        params,
        false,
        "MAIN"
      );

    return (
      Array.isArray(
        data?.trades
      )
        ? data.trades
        : []
    )
      .map(
        normalizeLunoTrade
      )
      .filter(
        Boolean
      );
  } catch (
    error
  ) {
    console.log(
      `Recent trades ${normalized} error:`,
      getApiErrorMessage(
        error
      )
    );

    return [];
  }
}


function storeExecutedTrade(
  coin,
  trade
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized ||
    !trade ||
    !TRADE_HISTORY[
      normalized
    ]
  ) {
    return false;
  }

  const sequenceKey =
    String(
      trade.sequence ??
      `${trade.timestamp}:${trade.price}:${trade.volume}:${trade.isBuy}`
    );

  const seen =
    SEEN_TRADE_SEQUENCES[
      normalized
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
    normalized
  ].push(
    trade
  );

  const cutoff =
    Date.now() -
    HISTORY_KEEP_MS;

  TRADE_HISTORY[
    normalized
  ] =
    TRADE_HISTORY[
      normalized
    ]
      .filter(
        (
          item
        ) =>
          safeNumber(
            item?.timestamp,
            0
          ) >=
          cutoff
      )
      .sort(
        (
          a,
          b
        ) =>
          a.timestamp -
          b.timestamp
      );

  if (
    seen.size >
    10000
  ) {
    SEEN_TRADE_SEQUENCES[
      normalized
    ] =
      new Set(
        TRADE_HISTORY[
          normalized
        ].map(
          (
            item
          ) =>
            String(
              item.sequence ??
              `${item.timestamp}:${item.price}:${item.volume}:${item.isBuy}`
            )
        )
      );
  }

  return true;
}


function getTradesInWindow(
  coin,
  windowMs
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return [];
  }

  const cutoff =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        windowMs,
        0
      )
    );

  return (
    TRADE_HISTORY[
      normalized
    ] ||
    []
  ).filter(
    (
      trade
    ) =>
      safeNumber(
        trade?.timestamp,
        0
      ) >=
      cutoff
  );
}


function getExecutedTradeMemory(
  coin,
  windowMs =
    TWO_HOURS
) {
  return getTradesInWindow(
    coin,
    windowMs
  );
}


/* ============================================================
   LUNO CANDLES

   durationSec example:

   300  = 5 minute
   900  = 15 minute
   3600 = 1 hour

   Luno requires authentication for candle endpoint.
============================================================ */

function normalizeCandle(
  candle
) {
  const normalized = {
    timestamp:
      safeNumber(
        candle?.timestamp,
        0
      ),

    open:
      safeNumber(
        candle?.open,
        0
      ),

    close:
      safeNumber(
        candle?.close,
        0
      ),

    high:
      safeNumber(
        candle?.high,
        0
      ),

    low:
      safeNumber(
        candle?.low,
        0
      ),

    volume:
      safeNumber(
        candle?.volume,
        0
      ),
  };

  if (
    normalized.timestamp <=
      0 ||
    normalized.open <=
      0 ||
    normalized.close <=
      0 ||
    normalized.high <=
      0 ||
    normalized.low <=
      0
  ) {
    return null;
  }

  return normalized;
}


async function getLunoCandles(
  coin,
  durationSec = 300,
  limit = 50
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return [];
  }

  try {
    const pair =
      getPair(
        normalized
      );

    const duration =
      Math.max(
        60,
        Math.floor(
          safeNumber(
            durationSec,
            300
          )
        )
      );

    const safeLimit =
      clamp(
        Math.floor(
          safeNumber(
            limit,
            50
          )
        ),
        2,
        1000
      );

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
        },
        true,
        "MAIN"
      );

    return (
      Array.isArray(
        data?.candles
      )
        ? data.candles
        : []
    )
      .map(
        normalizeCandle
      )
      .filter(
        Boolean
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
      `Candles ${normalized} error:`,
      getApiErrorMessage(
        error
      )
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

  const durationMs =
    Math.max(
      0,
      safeNumber(
        durationSec,
        0
      )
    ) *
    1000;

  const now =
    Date.now();

  return candles.filter(
    (
      candle
    ) =>
      safeNumber(
        candle?.timestamp,
        0
      ) +
        durationMs <=
      now
  );
}


/* ============================================================
   PRICE MEMORY
============================================================ */

function updatePriceMemory(
  coin,
  price,
  timestamp =
    Date.now()
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const currentPrice =
    safeNumber(
      price,
      0
    );

  const time =
    safeNumber(
      timestamp,
      Date.now()
    );

  if (
    !normalized ||
    currentPrice <=
      0
  ) {
    return false;
  }

  if (
    !Array.isArray(
      PRICE_MEMORY[
        normalized
      ]
    )
  ) {
    PRICE_MEMORY[
      normalized
    ] =
      [];
  }

  const memory =
    PRICE_MEMORY[
      normalized
    ];

  const previous =
    memory[
      memory.length -
      1
    ];

  if (
    previous &&
    previous.price ===
      currentPrice &&
    time -
      previous.timestamp <
      1000
  ) {
    return false;
  }

  memory.push({
    timestamp:
      time,

    price:
      currentPrice,
  });

  const cutoff =
    time -
    HISTORY_KEEP_MS;

  PRICE_MEMORY[
    normalized
  ] =
    memory.filter(
      (
        item
      ) =>
        item.timestamp >=
        cutoff
    );

  LAST_PRICE[
    normalized
  ] =
    currentPrice;

  return true;
}


function pushPriceMemory(
  coin,
  price,
  timestamp =
    Date.now()
) {
  return updatePriceMemory(
    coin,
    price,
    timestamp
  );
}


function getPriceMemoryWindow(
  coin,
  windowMs
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return [];
  }

  const cutoff =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        windowMs,
        0
      )
    );

  return (
    PRICE_MEMORY[
      normalized
    ] ||
    []
  ).filter(
    (
      item
    ) =>
      safeNumber(
        item?.timestamp,
        0
      ) >=
      cutoff
  );
}


function findNearestPriceAtOrBefore(
  samples,
  targetTimestamp
) {
  if (
    !Array.isArray(
      samples
    ) ||
    samples.length ===
      0
  ) {
    return null;
  }

  const target =
    safeNumber(
      targetTimestamp,
      0
    );

  let best =
    null;

  for (
    const sample
    of samples
  ) {
    const timestamp =
      safeNumber(
        sample?.timestamp,
        0
      );

    const price =
      safeNumber(
        sample?.price,
        0
      );

    if (
      timestamp <=
        target &&
      price >
        0
    ) {
      if (
        !best ||
        timestamp >
          best.timestamp
      ) {
        best = {
          timestamp,
          price,
        };
      }
    }
  }

  return best;
}


function findNearestPriceSample(
  samples,
  targetTimestamp
) {
  if (
    !Array.isArray(
      samples
    ) ||
    samples.length ===
      0
  ) {
    return null;
  }

  const target =
    safeNumber(
      targetTimestamp,
      0
    );

  let best =
    null;

  let bestDistance =
    Infinity;

  for (
    const sample
    of samples
  ) {
    const timestamp =
      safeNumber(
        sample?.timestamp,
        0
      );

    const price =
      safeNumber(
        sample?.price,
        0
      );

    if (
      timestamp <=
        0 ||
      price <=
        0
    ) {
      continue;
    }

    const distance =
      Math.abs(
        timestamp -
        target
      );

    if (
      distance <
      bestDistance
    ) {
      bestDistance =
        distance;

      best = {
        timestamp,
        price,
      };
    }
  }

  return best;
}


function getReferencePrice(
  coin,
  lookbackMs
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return null;
  }

  const history =
    PRICE_MEMORY[
      normalized
    ] ||
    [];

  if (
    history.length ===
    0
  ) {
    return null;
  }

  const target =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        lookbackMs,
        0
      )
    );

  return (
    findNearestPriceAtOrBefore(
      history,
      target
    ) ||
    findNearestPriceSample(
      history,
      target
    )
  );
}


function getReferencePriceAgeMs(
  coin,
  lookbackMs
) {
  const reference =
    getReferencePrice(
      coin,
      lookbackMs
    );

  if (
    !reference
  ) {
    return null;
  }

  const target =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        lookbackMs,
        0
      )
    );

  return Math.abs(
    reference.timestamp -
    target
  );
}


function getRollingPriceChange(
  coin,
  windowMs,
  currentPrice =
    null
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return null;
  }

  const latest =
    safeNumber(
      currentPrice,
      0
    ) ||
    safeNumber(
      LAST_PRICE[
        normalized
      ],
      0
    );

  if (
    latest <=
    0
  ) {
    return null;
  }

  const reference =
    getReferencePrice(
      normalized,
      windowMs
    );

  if (
    !reference ||
    reference.price <=
      0
  ) {
    return null;
  }

   return {
    ready:
      true,

    coin:
      normalized,

    currentPrice:
      latest,

    referencePrice:
      reference.price,

    referenceTimestamp:
      reference.timestamp,

    changePct:
      percentChange(
        reference.price,
        latest
      ),

    windowMs,
  };
}


function getPriceSnapshot(
  coin,
  currentPrice =
    null
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !normalized
  ) {
    return null;
  }

  const latest =
    safeNumber(
      currentPrice,
      0
    ) ||
    safeNumber(
      LAST_PRICE[
        normalized
      ],
      0
    );

  if (
    latest <=
    0
  ) {
    return null;
  }

  return {
    coin:
      normalized,

    currentPrice:
      latest,

    change5m:
      getRollingPriceChange(
        normalized,
        FIVE_MINUTES,
        latest
      ),

    change15m:
      getRollingPriceChange(
        normalized,
        FIFTEEN_MINUTES,
        latest
      ),

    change30m:
      getRollingPriceChange(
        normalized,
        THIRTY_MINUTES,
        latest
      ),

    change1h:
      getRollingPriceChange(
        normalized,
        ONE_HOUR,
        latest
      ),

    change2h:
      getRollingPriceChange(
        normalized,
        TWO_HOURS,
        latest
      ),

    change6h:
      getRollingPriceChange(
        normalized,
        SIX_HOURS,
        latest
      ),

    timestamp:
      Date.now(),
  };
}


/* ============================================================
   GLOBAL GRT MARKET API

   Provider foundation:
   CoinGecko public market API.

   GRT ONLY.

   This PART collects raw data only.

   Global Lead interpretation,
   lead / lag,
   direction agreement,
   structure comparison
   and scoring happen in PART 3.
============================================================ */

const GLOBAL_MARKET_API =
  Object.freeze({
    baseUrl:
      process.env
        .GLOBAL_MARKET_API_BASE_URL ||
      "https://api.coingecko.com/api/v3",

    grtId:
      process.env
        .GLOBAL_GRT_ID ||
      "the-graph",

    vsCurrency:
      "myr",

    timeoutMs:
      12000,

    minRequestGapMs:
      10000,
  });


const GLOBAL_MARKET_HTTP_RUNTIME = {
  lastRequestAt:
    0,

  lastPriceFetchAt:
    0,

  lastHistoryFetchAt:
    0,

  lastError:
    null,
};


async function globalMarketGet(
  endpoint,
  params = {}
) {
  const now =
    Date.now();

  const waitMs =
    GLOBAL_MARKET_API
      .minRequestGapMs -
    (
      now -
      GLOBAL_MARKET_HTTP_RUNTIME
        .lastRequestAt
    );

  if (
    waitMs >
    0
  ) {
    await sleep(
      waitMs
    );
  }

  GLOBAL_MARKET_HTTP_RUNTIME
    .lastRequestAt =
      Date.now();

  try {
    const response =
      await axios({
        method:
          "GET",

        url:
          `${GLOBAL_MARKET_API.baseUrl}${endpoint}`,

        params,

        timeout:
          GLOBAL_MARKET_API.timeoutMs,

        headers: {
          Accept:
            "application/json",

          "User-Agent":
            "SAFWAN-CRIPTO-AI-ALERT/1.0",
        },
      });

    GLOBAL_MARKET_HTTP_RUNTIME
      .lastError =
        null;

    return (
      response
        ?.data ??
      null
    );
  } catch (
    error
  ) {
    GLOBAL_MARKET_HTTP_RUNTIME
      .lastError =
        getApiErrorMessage(
          error
        );

    throw error;
  }
}


/* ============================================================
   GLOBAL GRT PRICE MEMORY
============================================================ */

function pushGlobalGRTPrice(
  price,
  timestamp =
    Date.now()
) {
  const currentPrice =
    safeNumber(
      price,
      0
    );

  const time =
    safeNumber(
      timestamp,
      Date.now()
    );

  if (
    currentPrice <=
    0
  ) {
    return false;
  }

  const previous =
    GRT_GLOBAL_PRICE_MEMORY[
      GRT_GLOBAL_PRICE_MEMORY
        .length -
      1
    ];

  if (
    previous &&
    previous.price ===
      currentPrice &&
    time -
      previous.timestamp <
      1000
  ) {
    return false;
  }

  GRT_GLOBAL_PRICE_MEMORY.push({
    timestamp:
      time,

    price:
      currentPrice,
  });

  const cutoff =
    time -
    GRT_GLOBAL_LEAD_CONFIG
      .historyKeepMs;

  while (
    GRT_GLOBAL_PRICE_MEMORY
      .length >
      0 &&
    GRT_GLOBAL_PRICE_MEMORY[
      0
    ].timestamp <
      cutoff
  ) {
    GRT_GLOBAL_PRICE_MEMORY
      .shift();
  }

  return true;
}


function getGlobalGRTMemoryWindow(
  windowMs
) {
  const cutoff =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        windowMs,
        0
      )
    );

  return GRT_GLOBAL_PRICE_MEMORY.filter(
    (
      item
    ) =>
      item.timestamp >=
      cutoff
  );
}


function getGlobalGRTReferencePrice(
  lookbackMs
) {
  if (
    GRT_GLOBAL_PRICE_MEMORY
      .length ===
    0
  ) {
    return null;
  }

  const target =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        lookbackMs,
        0
      )
    );

  return (
    findNearestPriceAtOrBefore(
      GRT_GLOBAL_PRICE_MEMORY,
      target
    ) ||
    findNearestPriceSample(
      GRT_GLOBAL_PRICE_MEMORY,
      target
    )
  );
}


function getGlobalGRTRollingChange(
  windowMs,
  currentPrice =
    null
) {
  const latest =
    safeNumber(
      currentPrice,
      0
    ) ||
    safeNumber(
      GRT_GLOBAL_PRICE_MEMORY[
        GRT_GLOBAL_PRICE_MEMORY
          .length -
        1
      ]?.price,
      0
    );

  if (
    latest <=
    0
  ) {
    return null;
  }

  const reference =
    getGlobalGRTReferencePrice(
      windowMs
    );

  if (
    !reference ||
    reference.price <=
      0
  ) {
    return null;
  }

  return {
    currentPrice:
      latest,

    referencePrice:
      reference.price,

    referenceTimestamp:
      reference.timestamp,

    changePct:
      percentChange(
        reference.price,
        latest
      ),

    windowMs,
  };
}


/* ============================================================
   FETCH GLOBAL GRT CURRENT PRICE
============================================================ */

async function getGlobalGRTPrice() {
  try {
    const data =
      await globalMarketGet(
        "/simple/price",
        {
          ids:
            GLOBAL_MARKET_API
              .grtId,

          vs_currencies:
            GLOBAL_MARKET_API
              .vsCurrency,

          include_last_updated_at:
            "true",
        }
      );

    const item =
      data?.[
        GLOBAL_MARKET_API
          .grtId
      ];

    const price =
      safeNumber(
        item?.[
          GLOBAL_MARKET_API
            .vsCurrency
        ],
        0
      );

    if (
      price <=
      0
    ) {
      return null;
    }

    const providerTimestamp =
      safeNumber(
        item
          ?.last_updated_at,
        0
      );

    const timestamp =
      providerTimestamp >
      0
        ? providerTimestamp *
          1000
        : Date.now();

    pushGlobalGRTPrice(
      price,
      timestamp
    );

    GLOBAL_MARKET_HTTP_RUNTIME
      .lastPriceFetchAt =
        Date.now();

    return {
      coin:
        "GRT",

      price,

      timestamp,

      provider:
        "COINGECKO",
    };
  } catch (
    error
  ) {
    console.log(
      "Global GRT price error:",
      getApiErrorMessage(
        error
      )
    );

    return null;
  }
}


/* ============================================================
   SEED GLOBAL GRT HISTORY

   Used at startup so 5M / 15M Global Lead
   does not need to wait 15 minutes from zero.
============================================================ */

async function seedGlobalGRTHistory() {
  try {
    const data =
      await globalMarketGet(
        `/coins/${GLOBAL_MARKET_API.grtId}/market_chart`,
        {
          vs_currency:
            GLOBAL_MARKET_API
              .vsCurrency,

          days:
            "1",
        }
      );

    const prices =
      Array.isArray(
        data?.prices
      )
        ? data.prices
        : [];

    for (
      const point
      of prices
    ) {
      if (
        !Array.isArray(
          point
        ) ||
        point.length <
          2
      ) {
        continue;
      }

      const timestamp =
        safeNumber(
          point[
            0
          ],
          0
        );

      const price =
        safeNumber(
          point[
            1
          ],
          0
        );

      if (
        timestamp >
          0 &&
        price >
          0
      ) {
        pushGlobalGRTPrice(
          price,
          timestamp
        );
      }
    }

    GLOBAL_MARKET_HTTP_RUNTIME
      .lastHistoryFetchAt =
        Date.now();

    return (
      GRT_GLOBAL_PRICE_MEMORY
        .length
    );
  } catch (
    error
  ) {
    console.log(
      "Global GRT history error:",
      getApiErrorMessage(
        error
      )
    );

    return 0;
  }
}


/* ============================================================
   GLOBAL GRT RAW SNAPSHOT

   IMPORTANT:
   No bullish / bearish trade decision
   is made inside this function.
============================================================ */

async function getGlobalGRTRawSnapshot({
  refreshPrice =
    true,
} = {}) {
  let latest =
    null;

  if (
    refreshPrice
  ) {
    latest =
      await getGlobalGRTPrice();
  }

  const currentPrice =
    safeNumber(
      latest?.price,
      0
    ) ||
    safeNumber(
      GRT_GLOBAL_PRICE_MEMORY[
        GRT_GLOBAL_PRICE_MEMORY
          .length -
        1
      ]?.price,
      0
    );

  if (
    currentPrice <=
    0
  ) {
    return null;
  }

  const change5m =
    getGlobalGRTRollingChange(
      GRT_GLOBAL_LEAD_CONFIG
        .fiveMinuteWindowMs,
      currentPrice
    );

  const change15m =
    getGlobalGRTRollingChange(
      GRT_GLOBAL_LEAD_CONFIG
        .fifteenMinuteWindowMs,
      currentPrice
    );

  return {
    coin:
      "GRT",

    currentPrice,

    change5m,

    change15m,

    samples:
      GRT_GLOBAL_PRICE_MEMORY
        .length,

    timestamp:
      Date.now(),

    provider:
      "COINGECKO",
  };
}


/* ============================================================
   FEE CALCULATIONS
============================================================ */

function calculateNetProfitPerGrossUnit({
  entryPrice,
  sellPrice,
  buyFeeRate =
    BUY_FEE,
  sellFeeRate =
    SELL_FEE,
}) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const exit =
    safeNumber(
      sellPrice,
      0
    );

  const buyFee =
    Math.max(
      0,
      safeNumber(
        buyFeeRate,
        BUY_FEE
      )
    );

  const sellFee =
    Math.max(
      0,
      safeNumber(
        sellFeeRate,
        SELL_FEE
      )
    );

  if (
    entry <=
      0 ||
    exit <=
      0
  ) {
    return 0;
  }

  const costPerUnit =
    entry *
    (
      1 +
      buyFee
    );

  const proceedsPerUnit =
    exit *
    (
      1 -
      sellFee
    );

  return (
    proceedsPerUnit -
    costPerUnit
  );
}


/* ============================================================
   COMPLETE TRADE FEE CALCULATION
============================================================ */

function calculateTradeAfterFees({
  quantity,
  entryPrice,
  sellPrice,
  buyFeeRate =
    BUY_FEE,
  sellFeeRate =
    SELL_FEE,
}) {
  const qty =
    Math.max(
      0,
      safeNumber(
        quantity,
        0
      )
    );

  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const exit =
    safeNumber(
      sellPrice,
      0
    );

  const buyFee =
    Math.max(
      0,
      safeNumber(
        buyFeeRate,
        BUY_FEE
      )
    );

  const sellFee =
    Math.max(
      0,
      safeNumber(
        sellFeeRate,
        SELL_FEE
      )
    );

  if (
    qty <=
      0 ||
    entry <=
      0 ||
    exit <=
      0
  ) {
    return {
      quantity:
        qty,

      entryPrice:
        entry,

      sellPrice:
        exit,

      grossBuyValue:
        0,

      buyFeeValue:
        0,

      totalBuyCost:
        0,

      grossSellValue:
        0,

      sellFeeValue:
        0,

      netSellValue:
        0,

      netProfit:
        0,

      netProfitPct:
        0,
    };
  }

  const grossBuyValue =
    qty *
    entry;

  const buyFeeValue =
    grossBuyValue *
    buyFee;

  const totalBuyCost =
    grossBuyValue +
    buyFeeValue;

  const grossSellValue =
    qty *
    exit;

  const sellFeeValue =
    grossSellValue *
    sellFee;

  const netSellValue =
    grossSellValue -
    sellFeeValue;

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
    quantity:
      qty,

    entryPrice:
      entry,

    sellPrice:
      exit,

    grossBuyValue,

    buyFeeValue,

    totalBuyCost,

    grossSellValue,

    sellFeeValue,

    netSellValue,

    netProfit,

    netProfitPct,
  };
}


/* ============================================================
   BREAK EVEN PRICE
============================================================ */

function calculateBreakEvenPrice(
  entryPrice,
  buyFeeRate =
    BUY_FEE,
  sellFeeRate =
    SELL_FEE
) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const buyFee =
    Math.max(
      0,
      safeNumber(
        buyFeeRate,
        BUY_FEE
      )
    );

  const sellFee =
    Math.max(
      0,
      safeNumber(
        sellFeeRate,
        SELL_FEE
      )
    );

  if (
    entry <=
      0 ||
    sellFee >=
      1
  ) {
    return 0;
  }

  return (
    entry *
    (
      1 +
      buyFee
    )
  ) /
    (
      1 -
      sellFee
    );
}


/* ============================================================
   QUANTITY FOR TARGET NET PROFIT
============================================================ */

function calculateQuantityForTargetProfit({
  entryPrice,
  sellPrice,
  targetNetProfit,
  buyFeeRate =
    BUY_FEE,
  sellFeeRate =
    SELL_FEE,
  maxQuantity =
    Infinity,
}) {
  const target =
    Math.max(
      0,
      safeNumber(
        targetNetProfit,
        0
      )
    );

  const netPerUnit =
    calculateNetProfitPerGrossUnit({
      entryPrice,

      sellPrice,

      buyFeeRate,

      sellFeeRate,
    });

  if (
    target <=
      0 ||
    netPerUnit <=
      0
  ) {
    return 0;
  }

  const rawQuantity =
    target /
    netPerUnit;

  const maximum =
    safeNumber(
      maxQuantity,
      Infinity
    );

  return Math.min(
    rawQuantity,
    maximum
  );
}


/* ============================================================
   QUANTITY FROM CAPITAL

   Used later by /autotrade.

   Example:
   Capital = RM500

   Quantity is calculated after
   estimated BUY fee.
============================================================ */

function calculateQuantityFromCapital({
  capitalMYR,
  entryPrice,
  buyFeeRate =
    BUY_FEE,
  maxQuantity =
    Infinity,
}) {
  const capital =
    Math.max(
      0,
      safeNumber(
        capitalMYR,
        0
      )
    );

  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const buyFee =
    Math.max(
      0,
      safeNumber(
        buyFeeRate,
        BUY_FEE
      )
    );

  if (
    capital <=
      0 ||
    entry <=
      0
  ) {
    return 0;
  }

  const quantity =
    capital /
    (
      entry *
      (
        1 +
        buyFee
      )
    );

  return Math.min(
    quantity,
    safeNumber(
      maxQuantity,
      Infinity
    )
  );
}


/* ============================================================
   TELEGRAM HELPERS
============================================================ */

function withServiceCode(
  text
) {
  return (
    `${SERVICE_CODE}\n\n` +
    `${String(
      text ??
      ""
    )}`
  );
}


async function sendTelegram(
  text,
  options = {}
) {
  try {
    return await bot.sendMessage(
      CHAT_ID,
      withServiceCode(
        text
      ),
      options
    );
  } catch (
    error
  ) {
    console.log(
      "Telegram send error:",
      getApiErrorMessage(
        error
      )
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
      withServiceCode(
        text
      ),
      options
    );
  } catch (
    error
  ) {
    console.log(
      "Telegram reply error:",
      getApiErrorMessage(
        error
      )
    );

    return null;
  }
}


/* ============================================================
   END PART 2
============================================================ */
/* ============================================================
   PART 3 — EXECUTED FLOW + MARKET STRUCTURE + GLOBAL LEAD

   PURPOSE:
   - Executed BUY / SELL flow
   - 2H market condition
   - Buyer / seller dominance
   - Executed price response
   - Orderbook liquidity
   - Support / resistance
   - Wall clustering
   - Wall rating
   - Support / resistance tested count
   - BTC 15M market context
   - GRT Luno market structure
   - GRT Global Lead
   - Global vs Luno structure
   - Global vs Luno momentum

   IMPORTANT:
   - PART 3 does NOT decide GRT BUY NOW.
   - PART 3 does NOT execute any real order.
   - Global Lead applies to GRT only.
   - BTC is used only as market context here.
============================================================ */


/* ============================================================
   EXECUTED FLOW SUMMARY
============================================================ */

function getExecutedFlowSummary(
  coin,
  windowMs
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const trades =
    normalized
      ? getTradesInWindow(
          normalized,
          windowMs
        )
      : [];

  let buyCount =
    0;

  let sellCount =
    0;

  let buyVolume =
    0;

  let sellVolume =
    0;


  for (
    const trade
    of trades
  ) {
    const volume =
      Math.max(
        0,
        safeNumber(
          trade?.volume,
          0
        )
      );

    if (
      trade?.isBuy
    ) {
      buyCount +=
        1;

      buyVolume +=
        volume;
    } else {
      sellCount +=
        1;

      sellVolume +=
        volume;
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
    coin:
      normalized ||
      String(
        coin ||
        ""
      ).toUpperCase(),

    ready:
      totalCount >
      0,

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

    windowMs,
  };
}


/* ============================================================
   EXECUTED PRICE RESPONSE
============================================================ */

function getExecutedPriceResponse(
  coin,
  windowMs
) {
  const normalized =
    normalizeCoin(
      coin
    );


  const trades =
    normalized
      ? getTradesInWindow(
          normalized,
          windowMs
        )
      : [];


  const validTrades =
    trades
      .filter(
        (
          trade
        ) =>
          safeNumber(
            trade?.price,
            0
          ) >
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


  if (
    validTrades.length <
    2
  ) {
    return {
      coin:
        normalized,

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
        validTrades.length,

      windowMs,
    };
  }


  const prices =
    validTrades.map(
      (
        trade
      ) =>
        safeNumber(
          trade.price,
          0
        )
    );


  const firstPrice =
    prices[
      0
    ];


  const lastPrice =
    prices[
      prices.length -
      1
    ];


  return {
    coin:
      normalized,

    ready:
      true,

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
      validTrades.length,

    windowMs,
  };
}


/* ============================================================
   PRESSURE
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
   MARKET DIRECTION
============================================================ */

function getMarketDirection(
  changePct,
  thresholdPct =
    0.20
) {
  const change =
    safeNumber(
      changePct,
      0
    );


  const threshold =
    Math.abs(
      safeNumber(
        thresholdPct,
        0.20
      )
    );


  const strongThreshold =
    Math.max(
      1,
      threshold *
        3
    );


  if (
    change >=
    strongThreshold
  ) {
    return "NAIK_KUAT";
  }


  if (
    change >=
    threshold
  ) {
    return "NAIK";
  }


  if (
    change <=
    -strongThreshold
  ) {
    return "TURUN_KUAT";
  }


  if (
    change <=
    -threshold
  ) {
    return "TURUN";
  }


  return "SIDEWAY";
}


function formatMarketDirection(
  direction
) {
  switch (
    direction
  ) {
    case "NAIK_KUAT":
      return "NAIK KUAT";

    case "NAIK":
      return "NAIK";

    case "TURUN_KUAT":
      return "TURUN KUAT";

    case "TURUN":
      return "TURUN";

    default:
      return "SIDEWAY";
  }
}


function getDirectionEmoji(
  direction
) {
  if (
    direction ===
      "NAIK" ||
    direction ===
      "NAIK_KUAT"
  ) {
    return "🟢";
  }


  if (
    direction ===
      "TURUN" ||
    direction ===
      "TURUN_KUAT"
  ) {
    return "🔴";
  }


  return "⚪";
}


/* ============================================================
   MARKET DOMINANCE
============================================================ */

function getDominance(
  flow
) {
  if (
    !flow?.ready
  ) {
    return {
      side:
        "BALANCED",

      pct:
        50,

      oppositePct:
        50,
    };
  }


  const buy =
    safeNumber(
      flow.buyVolumePct,
      50
    );


  const sell =
    safeNumber(
      flow.sellVolumePct,
      50
    );


  if (
    buy >
    sell
  ) {
    return {
      side:
        "BUYER",

      pct:
        buy,

      oppositePct:
        sell,
    };
  }


  if (
    sell >
    buy
  ) {
    return {
      side:
        "SELLER",

      pct:
        sell,

      oppositePct:
        buy,
    };
  }


  return {
    side:
      "BALANCED",

    pct:
      50,

    oppositePct:
      50,
  };
}


/* ============================================================
   2H MARKET CONDITION
============================================================ */

async function analyze2HMarketCondition(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );


  if (
    !normalized
  ) {
    return null;
  }


  const flow =
    getExecutedFlowSummary(
      normalized,
      TWO_HOURS
    );


  const priceResponse =
    getExecutedPriceResponse(
      normalized,
      TWO_HOURS
    );


  const trades =
    getTradesInWindow(
      normalized,
      TWO_HOURS
    )
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          a.timestamp -
          b.timestamp
      );


  const coverageMs =
    trades.length >=
    2
      ? Math.max(
          0,
          trades[
            trades.length -
            1
          ].timestamp -
            trades[
              0
            ].timestamp
        )
      : 0;


  const coverageReady =
    coverageMs >=
    TWO_HOUR_MIN_COVERAGE_MS;


  const dominance =
    getDominance(
      flow
    );


  const changePct =
    priceResponse.ready
      ? safeNumber(
          priceResponse.changePct,
          0
        )
      : 0;


  let direction =
    "SIDEWAY";


  if (
    changePct >=
      1 &&
    flow.buyVolumePct >=
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
      -1 &&
    flow.sellVolumePct >=
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


  return {
    coin:
      normalized,

    ready:
      Boolean(
        coverageReady &&
        flow.ready &&
        priceResponse.ready
      ),

    coverageReady,

    coverageMs,

    coverageMinutes:
      coverageMs /
      60000,

    totalTrades:
      trades.length,

    buyVolumePct:
      flow.buyVolumePct,

    sellVolumePct:
      flow.sellVolumePct,

    buyFrequencyPct:
      flow.buyFrequencyPct,

    sellFrequencyPct:
      flow.sellFrequencyPct,

    changePct,

    direction,

    pressure:
      getPressureLabel(
        flow.buyVolumePct,
        flow.sellVolumePct
      ),

    dominance,

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
      total,
      level
    ) =>
      total +
      Math.max(
        0,
        safeNumber(
          level?.volume,
          0
        )
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
  const current =
    safeNumber(
      currentPrice,
      0
    );


  const range =
    Math.abs(
      safeNumber(
        rangePct,
        0
      )
    );


  if (
    !Array.isArray(
      levels
    ) ||
    current <=
      0
  ) {
    return [];
  }


  return levels.filter(
    (
      level
    ) => {
      const price =
        safeNumber(
          level?.price,
          0
        );


      if (
        price <=
        0
      ) {
        return false;
      }


      const distance =
        Math.abs(
          percentChange(
            current,
            price
          )
        );


      if (
        distance >
        range
      ) {
        return false;
      }


      if (
        side ===
        "BID"
      ) {
        return (
          price <=
          current
        );
      }


      return (
        price >=
        current
      );
    }
  );
}


/* ============================================================
   ORDERBOOK CLUSTER
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
    levels
      .map(
        (
          level
        ) => ({
          price:
            safeNumber(
              level.price,
              0
            ),

          volume:
            safeNumber(
              level.volume,
              0
            ),
        })
      )
      .filter(
        (
          level
        ) =>
          level.price >
            0 &&
          level.volume >
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


  const clusters =
    [];


  let current =
    null;


  for (
    const level
    of sorted
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


    const center =
      current.volume >
      0
        ? current.weightedPrice /
          current.volume
        : current.maxPrice;


    const distance =
      Math.abs(
        percentChange(
          center,
          level.price
        )
      );


    if (
      distance <=
      Math.abs(
        safeNumber(
          clusterPct,
          0.15
        )
      )
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


      current.count +=
        1;
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
    (
      cluster
    ) => ({
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
    safeNumber(
      currentPrice,
      0
    ) <=
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
   SUPPORT / RESISTANCE TEST COUNT

   Counts separate visits into the price area.

   Continuous samples inside the same zone count as ONE test,
   preventing one long stay near the level from being counted
   many times.
============================================================ */

function countStructureTests(
  coin,
  levelPrice,
  tolerancePct =
    0.25,
  windowMs =
    SIX_HOURS
) {
  const normalized =
    normalizeCoin(
      coin
    );


  const level =
    safeNumber(
      levelPrice,
      0
    );


  if (
    !normalized ||
    level <=
      0
  ) {
    return 0;
  }


  const samples =
    getPriceMemoryWindow(
      normalized,
      windowMs
    );


  let tests =
    0;


  let insideZone =
    false;


  for (
    const sample
    of samples
  ) {
    const samplePrice =
      safeNumber(
        sample?.price,
        0
      );


    if (
      samplePrice <=
      0
    ) {
      continue;
    }


    const near =
      Math.abs(
        percentChange(
          level,
          samplePrice
        )
      ) <=
      tolerancePct;


    if (
      near &&
      !insideZone
    ) {
      tests +=
        1;
    }


    insideZone =
      near;
  }


  return tests;
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
  const normalized =
    normalizeCoin(
      coin
    );


  const current =
    safeNumber(
      currentPrice,
      0
    );


  if (
    !normalized ||
    !Array.isArray(
      levels
    ) ||
    !levels.length ||
    current <=
      0
  ) {
    return null;
  }


  const rangePct =
    safeNumber(
      ORDERBOOK_STRUCTURE_RANGE_PCT[
        normalized
      ],
      3
    );


  const clusterPct =
    safeNumber(
      ORDERBOOK_CLUSTER_PCT[
        normalized
      ],
      0.15
    );


  const ranged =
    filterOrderBookRange(
      levels,
      current,
      rangePct,
      side
    );


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
        (
          wall
        ) =>
          wall.volume
      )
    );


  const rated =
    clusters.map(
      (
        wall
      ) => {
        const rating =
          rateOrderBookWall({
            wall,

            averageVolume,

            currentPrice:
              current,
          });


        const relativeRatio =
          averageVolume >
          0
            ? wall.volume /
              averageVolume
            : 1;


        return {
          ...wall,

          rating,

          strength:
            getWallStrength(
              rating
            ),

          relativeRatio,

          distancePct:
            Math.abs(
              percentChange(
                current,
                wall.price
              )
            ),

          testedCount:
            countStructureTests(
              normalized,
              wall.price
            ),
        };
      }
    );


  const meaningful =
    rated.filter(
      (
        wall
      ) =>
        wall.relativeRatio >=
        MIN_WALL_RELATIVE_RATIO
    );


  const candidates =
    meaningful.length
      ? meaningful
      : rated;


  candidates.sort(
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


  return (
    candidates[
      0
    ] ||
    null
  );
}


/* ============================================================
   LIQUIDITY ANALYSIS
============================================================ */

async function getLiquidityAnalysis(
  coin,
  currentPrice
) {
  const normalized =
    normalizeCoin(
      coin
    );


  const current =
    safeNumber(
      currentPrice,
      0
    );


  if (
    !normalized ||
    current <=
      0
  ) {
    return null;
  }


  const orderBook =
    await getOrderBook(
      normalized
    );


  if (
    !orderBook
  ) {
    return {
      coin:
        normalized,

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

      resistanceBlocking:
        false,
    };
  }


  const rangePct =
    safeNumber(
      ORDERBOOK_STRUCTURE_RANGE_PCT[
        normalized
      ],
      3
    );


  const nearbyBids =
    filterOrderBookRange(
      orderBook.bids,
      current,
      rangePct,
      "BID"
    );


  const nearbyAsks =
    filterOrderBookRange(
      orderBook.asks,
      current,
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


  const support =
    findBestWall({
      levels:
        orderBook.bids,

      currentPrice:
        current,

      coin:
        normalized,

      side:
        "BID",
    });


  const resistance =
    findBestWall({
      levels:
        orderBook.asks,

      currentPrice:
        current,

      coin:
        normalized,

      side:
        "ASK",
    });


  return {
    coin:
      normalized,

    ready:
      true,

    orderBook,

    bidVolume,

    askVolume,

    bidLiquidityPct:
      totalLiquidity >
      0
        ? (
            bidVolume /
            totalLiquidity
          ) *
          100
        : 50,

    askLiquidityPct:
      totalLiquidity >
      0
        ? (
            askVolume /
            totalLiquidity
          ) *
          100
        : 50,

    support,

    resistance,

    resistanceBlocking:
      Boolean(
        normalized ===
          "GRT" &&
        resistance &&
        resistance.rating >=
          GRT_STRONG_RESISTANCE_MIN_RATING &&
        resistance.distancePct <=
          0.75
      ),
  };
}


async function getGRTLiquidityAnalysis(
  currentPrice
) {
  return getLiquidityAnalysis(
    "GRT",
    currentPrice
  );
}


/* ============================================================
   WALL RATING ACCESSOR
============================================================ */

function getResistanceRating(
  wall
) {
  if (
    !wall
  ) {
    return 0;
  }


  return clamp(
    Math.round(
      safeNumber(
        wall.rating,
        1
      )
    ),
    1,
    10
  );
}


/* ============================================================
   MARKET STRUCTURE SNAPSHOT
============================================================ */

async function getMarketStructureSnapshot(
  coin,
  suppliedPrice =
    null
) {
  const normalized =
    normalizeCoin(
      coin
    );


  if (
    !normalized
  ) {
    return null;
  }


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
        normalized
      );


    currentPrice =
      safeNumber(
        ticker?.currentPrice,
        0
      );
  }


  if (
    currentPrice <=
    0
  ) {
    return null;
  }


  const liquidity =
    await getLiquidityAnalysis(
      normalized,
      currentPrice
    );


  const flow =
    getExecutedFlowSummary(
      normalized,
      FIVE_MINUTES
    );


  const rolling15m =
    getRollingPriceChange(
      normalized,
      FIFTEEN_MINUTES,
      currentPrice
    );


  const rolling1h =
    getRollingPriceChange(
      normalized,
      ONE_HOUR,
      currentPrice
    );


  const change15mPct =
    safeNumber(
      rolling15m?.changePct,
      0
    );


  const direction =
    getMarketDirection(
      change15mPct
    );


  const pressure =
    getPressureLabel(
      flow.buyVolumePct,
      flow.sellVolumePct
    );


  return {
    coin:
      normalized,

    currentPrice,

    ticker,

    flow,

    change15mPct,

    change1hPct:
      safeNumber(
        rolling1h?.changePct,
        0
      ),

    direction,

    directionText:
      formatMarketDirection(
        direction
      ),

    pressure,

    pressureText:
      formatPressure(
        pressure
      ),

    support:
      liquidity?.support ||
      null,

    resistance:
      liquidity?.resistance ||
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
        liquidity?.ready
      ),

    resistanceBlocking:
      Boolean(
        liquidity
          ?.resistanceBlocking
      ),

    timestamp:
      Date.now(),
  };
}


/* ============================================================
   EXECUTION STRUCTURE SNAPSHOT

   Used later by the entry engine.

   Still analysis only.
   No real order is created here.
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
      structure.coin,
      FIVE_MINUTES
    );


  const priceResponse =
    getExecutedPriceResponse(
      structure.coin,
      FIVE_MINUTES
    );


  const support =
    structure.support ||
    null;


  const resistance =
    structure.resistance ||
    null;


  const meaningfulResistancePrice =
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
      ? resistance.price
      : null;


  return {
    ...structure,

    flow,

    priceResponse,

    support,

    resistance,

    supportPrice:
      support?.price ||
      null,

    resistancePrice:
      resistance?.price ||
      null,

    meaningfulResistancePrice,
  };
}


/* ============================================================
   PRICE-DERIVED STRUCTURE

   Used for GLOBAL GRT because the global provider
   does not provide a Luno-style MYR orderbook.

   Local turning points are used to estimate nearby
   support and resistance.
============================================================ */

function buildPriceDerivedStructure(
  samples,
  currentPrice,
  rangePct =
    3
) {
  const current =
    safeNumber(
      currentPrice,
      0
    );


  if (
    !Array.isArray(
      samples
    ) ||
    samples.length <
      3 ||
    current <=
      0
  ) {
    return {
      ready:
        false,

      support:
        null,

      resistance:
        null,
    };
  }


  const clean =
    samples
      .map(
        (
          sample
        ) => ({
          timestamp:
            safeNumber(
              sample?.timestamp,
              0
            ),

          price:
            safeNumber(
              sample?.price,
              0
            ),
        })
      )
      .filter(
        (
          sample
        ) =>
          sample.timestamp >
            0 &&
          sample.price >
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


  if (
    clean.length <
    3
  ) {
    return {
      ready:
        false,

      support:
        null,

      resistance:
        null,
    };
  }


  const lows =
    [];


  const highs =
    [];


  for (
    let index =
      1;
    index <
      clean.length -
        1;
    index++
  ) {
    const previous =
      clean[
        index -
        1
      ].price;


    const currentSample =
      clean[
        index
      ].price;


    const next =
      clean[
        index +
        1
      ].price;


    if (
      currentSample <=
        previous &&
      currentSample <=
        next
    ) {
      lows.push(
        currentSample
      );
    }


    if (
      currentSample >=
        previous &&
      currentSample >=
        next
    ) {
      highs.push(
        currentSample
      );
    }
  }


  const nearbySupport =
    lows
      .filter(
        (
          price
        ) =>
          price <=
            current &&
          Math.abs(
            percentChange(
              current,
              price
            )
          ) <=
            rangePct
      )
      .sort(
        (
          a,
          b
        ) =>
          Math.abs(
            current -
            a
          ) -
          Math.abs(
            current -
            b
          )
      )[
        0
      ] ||
    null;


  const nearbyResistance =
    highs
      .filter(
        (
          price
        ) =>
          price >=
            current &&
          Math.abs(
            percentChange(
              current,
              price
            )
          ) <=
            rangePct
      )
      .sort(
        (
          a,
          b
        ) =>
          Math.abs(
            current -
            a
          ) -
          Math.abs(
            current -
            b
          )
      )[
        0
      ] ||
    null;


  return {
    ready:
      Boolean(
        nearbySupport ||
        nearbyResistance
      ),

    support:
      nearbySupport,

    resistance:
      nearbyResistance,
  };
}


/* ============================================================
   GLOBAL GRT STRUCTURE
============================================================ */

function getGlobalGRTStructure(
  currentPrice
) {
  const recent =
    getGlobalGRTMemoryWindow(
      GRT_GLOBAL_LEAD_CONFIG
        .historyKeepMs
    );


  return buildPriceDerivedStructure(
    recent,
    currentPrice,
    3
  );
}


/* ============================================================
   GLOBAL LEAD DIRECTION
============================================================ */

function classifyGlobalLeadDirection(
  changePct
) {
  return getMarketDirection(
    changePct,
    GRT_GLOBAL_LEAD_CONFIG
      .directionThresholdPct
  );
}


/* ============================================================
   GLOBAL / LUNO DIRECTION AGREEMENT
============================================================ */

function getLeadAgreement(
  globalDirection,
  lunoDirection
) {
  const upward =
    new Set([
      "NAIK",
      "NAIK_KUAT",
    ]);


  const downward =
    new Set([
      "TURUN",
      "TURUN_KUAT",
    ]);


  if (
    upward.has(
      globalDirection
    ) &&
    upward.has(
      lunoDirection
    )
  ) {
    return "AGREE_UP";
  }


  if (
    downward.has(
      globalDirection
    ) &&
    downward.has(
      lunoDirection
    )
  ) {
    return "AGREE_DOWN";
  }


  if (
    globalDirection ===
      "SIDEWAY" &&
    lunoDirection ===
      "SIDEWAY"
  ) {
    return "AGREE_SIDEWAY";
  }


  return "DIVERGENCE";
}


/* ============================================================
   GLOBAL LEAD STRENGTH
============================================================ */

function getGlobalLeadStrength(
  gapPct,
  global15mPct
) {
  const gap =
    Math.abs(
      safeNumber(
        gapPct,
        0
      )
    );


  const movement =
    Math.abs(
      safeNumber(
        global15mPct,
        0
      )
    );


  if (
    gap >=
      GRT_GLOBAL_LEAD_CONFIG
        .strongGapPct ||
    movement >=
      1
  ) {
    return "STRONG";
  }


  if (
    gap >=
      GRT_GLOBAL_LEAD_CONFIG
        .meaningfulGapPct ||
    movement >=
      0.35
  ) {
    return "MEDIUM";
  }


  return "WEAK";
}


/* ============================================================
   GRT GLOBAL LEAD SNAPSHOT

   IMPORTANT:
   This does NOT produce BUY NOW.

   PART 4 will decide how much weight Global Lead
   contributes to the GRT momentum decision.
============================================================ */

async function buildGRTGlobalLeadSnapshot(
  lunoStructure =
    null
) {
  const structure =
    lunoStructure ||
    await getMarketStructureSnapshot(
      "GRT"
    );


  if (
    !structure
  ) {
    return null;
  }


  const global =
    await getGlobalGRTRawSnapshot({
      refreshPrice:
        true,
    });


  if (
    !global
  ) {
    GRT_GLOBAL_LEAD_RUNTIME
      .ready =
        false;


    GRT_GLOBAL_LEAD_RUNTIME
      .status =
        "GLOBAL_DATA_UNAVAILABLE";


    GRT_GLOBAL_LEAD_RUNTIME
      .lastError =
        GLOBAL_MARKET_HTTP_RUNTIME
          .lastError ||
        "GLOBAL DATA UNAVAILABLE";


    return null;
  }


  const globalPrice =
    safeNumber(
      global.currentPrice,
      0
    );


  const lunoPrice =
    safeNumber(
      structure.currentPrice,
      0
    );


  const global5mPct =
    safeNumber(
      global
        .change5m
        ?.changePct,
      0
    );


  const global15mPct =
    safeNumber(
      global
        .change15m
        ?.changePct,
      0
    );


  const luno15m =
    getRollingPriceChange(
      "GRT",
      FIFTEEN_MINUTES,
      lunoPrice
    );


  const luno15mPct =
    safeNumber(
      luno15m?.changePct,
      0
    );


  const gapPct =
    lunoPrice >
    0
      ? percentChange(
          lunoPrice,
          globalPrice
        )
      : 0;


  const globalDirection =
    classifyGlobalLeadDirection(
      global15mPct
    );


  const lunoDirection =
    classifyGlobalLeadDirection(
      luno15mPct
    );


  const globalStructure =
    getGlobalGRTStructure(
      globalPrice
    );


  const agreement =
    getLeadAgreement(
      globalDirection,
      lunoDirection
    );


  const strength =
    getGlobalLeadStrength(
      gapPct,
      global15mPct
    );


  const snapshot = {
    ready:
      true,

    globalPrice,

    lunoPrice,

    global5mPct,

    global15mPct,

    luno15mPct,

    gapPct,

    globalDirection,

    lunoDirection,

    agreement,

    strength,

    lunoSupport:
      structure
        .support
        ?.price ||
      null,

    lunoResistance:
      structure
        .resistance
        ?.price ||
      null,

    globalSupport:
      globalStructure
        .support,

    globalResistance:
      globalStructure
        .resistance,

    timestamp:
      Date.now(),

    provider:
      global.provider,
  };


  Object.assign(
    GRT_GLOBAL_LEAD_RUNTIME,
    {
      ready:
        true,

      updatedAt:
        snapshot.timestamp,

      globalPrice,

      lunoPrice,

      global5mPct,

      global15mPct,

      gapPct,

      globalDirection,

      lunoDirection,

      globalSupport:
        snapshot.globalSupport,

      globalResistance:
        snapshot.globalResistance,

      lunoSupport:
        snapshot.lunoSupport,

      lunoResistance:
        snapshot.lunoResistance,

      status:
        agreement,

      lastError:
        null,
    }
  );


  SYSTEM_HEALTH
    .globalLeadReady =
      true;


  return snapshot;
}


/* ============================================================
   BTC 15M CONTEXT

   BTC is deliberately compact.

   No BTC Global Lead.
   No BTC detailed support / resistance in the final
   GRT Market Structure Telegram alert.
============================================================ */

async function getBTC15mContext() {
  const ticker =
    await getTicker(
      "BTC"
    );


  const currentPrice =
    safeNumber(
      ticker?.currentPrice,
      0
    );


  if (
    currentPrice <=
    0
  ) {
    return {
      ready:
        false,

      change15mPct:
        0,

      direction:
        "SIDEWAY",

      directionText:
        "BTC SIDEWAY",
    };
  }


  const rolling =
    getRollingPriceChange(
      "BTC",
      FIFTEEN_MINUTES,
      currentPrice
    );


  const change15mPct =
    safeNumber(
      rolling?.changePct,
      0
    );


  const direction =
    getMarketDirection(
      change15mPct
    );


  return {
    ready:
      Boolean(
        rolling
      ),

    currentPrice,

    change15mPct,

    direction,

    directionText:
      `BTC ${formatMarketDirection(
        direction
      )}`,

    timestamp:
      Date.now(),
  };
}


/* ============================================================
   MARKET STRUCTURE DISPLAY HELPERS
============================================================ */

function formatStructureWall(
  wall
) {
  if (
    !wall ||
    safeNumber(
      wall?.price,
      0
    ) <=
      0
  ) {
    return "N/A";
  }


  const rating =
    getResistanceRating(
      wall
    );


  const tested =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          wall.testedCount,
          0
        )
      )
    );


  const strength =
    wall.strength ||
    getWallStrength(
      rating
    );


  return (
    `${formatMYR(
      wall.price
    )}` +
    ` — ${rating}/10` +
    ` | Tested: ${tested}x` +
    ` | Volume: ${strength}`
  );
}


function formatOptionalStructurePrice(
  value
) {
  return safeNumber(
    value,
    0
  ) >
    0
    ? formatMYR(
        value
      )
    : "N/A";
}


function formatMovementWithEmoji(
  value
) {
  const number =
    safeNumber(
      value,
      0
    );


  const emoji =
    number >
      0
      ? "🟢"
      : number <
          0
        ? "🔴"
        : "⚪";


  return (
    `${formatPercent(
      number,
      2,
      true
    )} ${emoji}`
  );
}


function formatLeadMomentum(
  direction
) {
  if (
    direction ===
      "NAIK" ||
    direction ===
      "NAIK_KUAT"
  ) {
    return "📈 NAIK";
  }


  if (
    direction ===
      "TURUN" ||
    direction ===
      "TURUN_KUAT"
  ) {
    return "📉 TURUN";
  }


  return "↔️ SIDEWAY";
}


/* ============================================================
   FINAL MARKET STRUCTURE REPORT

   TEMPLATE LOCK:
   - BTC compact 15M only
   - DOUBLE separator between BTC and GRT
   - GRT Luno price
   - Support / resistance
   - Single separator before Global Lead
   - Global Lead is GRT only
============================================================ */

async function buildMarketStructureReport() {
  const [
    btc,
    grt,
  ] =
    await Promise.all([
      getBTC15mContext(),

      getMarketStructureSnapshot(
        "GRT"
      ),
    ]);


  if (
    !grt
  ) {
    return (
      "📊 MARKET STRUCTURE\n\n" +
      "GRT DATA BELUM READY"
    );
  }


  const globalLead =
    await buildGRTGlobalLeadSnapshot(
      grt
    );


  const btcChange =
    safeNumber(
      btc?.change15mPct,
      0
    );


  const btcDirection =
    btc?.directionText ||
    "BTC SIDEWAY";


  const globalPrice =
    globalLead
      ? formatMYR(
          globalLead.globalPrice
        )
      : "N/A";


  const global5m =
    globalLead
      ? formatMovementWithEmoji(
          globalLead.global5mPct
        )
      : "N/A";


  const global15m =
    globalLead
      ? formatMovementWithEmoji(
          globalLead.global15mPct
        )
      : "N/A";


  const lunoStructure =
    `${formatOptionalStructurePrice(
      grt.support?.price
    )} / ` +
    `${formatOptionalStructurePrice(
      grt.resistance?.price
    )}`;


  const globalStructure =
    globalLead
      ? (
          `${formatOptionalStructurePrice(
            globalLead.globalSupport
          )} / ` +
          `${formatOptionalStructurePrice(
            globalLead.globalResistance
          )}`
        )
      : "N/A / N/A";


  const gap =
    globalLead
      ? formatPercent(
          globalLead.gapPct,
          2,
          true
        )
      : "N/A";


  const globalMomentum =
    globalLead
      ? formatLeadMomentum(
          globalLead.globalDirection
        )
      : "N/A";


  const lunoMomentum =
    globalLead
      ? formatLeadMomentum(
          globalLead.lunoDirection
        )
      : formatLeadMomentum(
          grt.direction
        );


  return `📊 MARKET STRUCTURE

₿ BTC
15M : ${formatMovementWithEmoji(
    btcChange
  )} | ${getDirectionEmoji(
    btc?.direction
  )} ${btcDirection}
━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━
🪙 GRT LUNO
💰 Price: ${formatMYR(
    grt.currentPrice
  )}

🧱 SUPPORT
${formatStructureWall(
    grt.support
  )}

🚧 RESISTANCE
${formatStructureWall(
    grt.resistance
  )}
━━━━━━━━━━━━━━━━━━
🌍 GLOBAL LEAD
Global Price : ${globalPrice}
5M: ${global5m} | 15M: ${global15m}
Luno Price   : ${formatMYR(
    grt.currentPrice
  )}

Luno Structure   : ${lunoStructure}
Global Structure : ${globalStructure}
Gap: ${gap}

⚡ MOMENTUM
Global: ${globalMomentum} | Luno: ${lunoMomentum}`;
}


/* ============================================================
   2H FLOW TELEGRAM FORMATTER

   DISPLAY RULE:
   - Focus on MARKET DOMINANCE.
   - Show buyer / seller percentages.
   - Show price movement.
   - Do NOT clutter Telegram with total BUY / SELL units.
============================================================ */

function build2HFlowSection(
  data
) {
  if (
    !data
  ) {
    return "NO DATA";
  }


  const dominance =
    data.dominance ||
    getDominance({
      ready:
        true,

      buyVolumePct:
        data.buyVolumePct,

      sellVolumePct:
        data.sellVolumePct,
    });


  const icon =
    data.coin ===
    "BTC"
      ? "₿"
      : "🪙";


  let dominanceText =
    "⚪ BALANCED";


  if (
    dominance.side ===
    "BUYER"
  ) {
    dominanceText =
      "🟢 BUYER";
  } else if (
    dominance.side ===
    "SELLER"
  ) {
    dominanceText =
      "🔴 SELLER";
  }


  const priceEmoji =
    safeNumber(
      data.changePct,
      0
    ) >
    0
      ? "🟢"
      : safeNumber(
            data.changePct,
            0
          ) <
          0
        ? "🔴"
        : "⚪";


  const directionText =
    String(
      data.direction ||
      "SIDEWAY"
    ).replace(
      /_/g,
      " "
    );


  return `${icon} ${data.coin} — 2H EXECUTED FLOW

🎯 MARKET DOMINANCE
${dominanceText} — ${formatPercent(
    dominance.pct,
    2,
    false
  )}
Buyer: ${formatPercent(
    data.buyVolumePct,
    2,
    false
  )} | Seller: ${formatPercent(
    data.sellVolumePct,
    2,
    false
  )}

📈 PRICE CHANGE
${formatPercent(
    data.changePct,
    2,
    true
  )} ${priceEmoji}

🧭 DIRECTION
${directionText}

🗂 DATA
${data.coverageReady
    ? "READY"
    : "BUILDING"}`;
}


/* ============================================================
   END PART 3
============================================================ */
/* ============================================================
   PART 4 — GRT MOMENTUM ENGINE + BUY NOW DECISION

   PURPOSE:
   - GRT fast direction
   - 5M / 15M / 30M momentum
   - Executed BUY flow
   - Accumulation detection
   - Early momentum
   - Acceleration
   - Early reversal
   - RSI
   - MA9 / MA50
   - BTC market context / BUY surge
   - 2H confirmation
   - GRT Global Lead contribution
   - Confidence 0–100
   - BUY_NOW / VERIFYING / DONT_BUY

   IMPORTANT:
   - BUY NOW = momentum decision only.
   - Practical entry quality is checked in PART 5.
   - Profit room does NOT block BUY NOW here.
   - No real order is submitted here.
============================================================ */


/* ============================================================
   GRT MOMENTUM THRESHOLDS
============================================================ */

const GRT_EARLY_MIN_BUY_VOLUME_PCT =
  52;


const GRT_EARLY_MIN_BUY_FREQUENCY_PCT =
  50;


const GRT_EARLY_MIN_PRICE_RESPONSE_PCT =
  0.03;


const GRT_SUSTAINED_MIN_BUY_VOLUME_PCT =
  54;


const GRT_SUSTAINED_MIN_BUY_FREQUENCY_PCT =
  54;


const GRT_SUSTAINED_15M_MOVE_PCT =
  0.45;


const GRT_SUSTAINED_30M_MOVE_PCT =
  0.75;


const GRT_ACCELERATION_5M_MOVE_PCT =
  0.55;


const GRT_ACCELERATION_15M_MOVE_PCT =
  1.00;


const GRT_ACCELERATION_30M_MOVE_PCT =
  1.50;


const GRT_VALIDATION_MAX_MS =
  10 *
  60 *
  1000;


const GRT_FAST_REEVALUATE_30M_MOVE_PCT =
  1.00;


/* ============================================================
   EARLY REVERSAL
============================================================ */

const GRT_EARLY_REVERSAL_MIN_5M_PCT =
  0.30;


const GRT_EARLY_REVERSAL_MIN_BUY_VOLUME_PCT =
  54;


const GRT_EARLY_REVERSAL_MIN_BUY_FREQUENCY_PCT =
  50;


const GRT_EARLY_REVERSAL_MIN_PRICE_RESPONSE_PCT =
  0.03;


/* ============================================================
   2H CONFIRMATION
============================================================ */

const GRT_2H_BOOST_MIN_TRADES =
  12;


const GRT_2H_BOOST_MIN_BUY_VOLUME_PCT =
  65;


const GRT_2H_BOOST_MIN_BUY_FREQUENCY_PCT =
  55;


/* ============================================================
   BTC BUY SURGE
============================================================ */

const BTC_BUY_SURGE_MIN_BUY_PCT =
  55;


const BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT =
  0.03;


/* ============================================================
   FINAL DECISION CONFIDENCE
============================================================ */

const GRT_BUY_NOW_MIN_CONFIDENCE =
  72;


const GRT_VERIFYING_MIN_CONFIDENCE =
  55;


/* ============================================================
   GRT MOMENTUM PRICE HISTORY
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
    return false;
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
    return false;
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
        (
          item
        ) =>
          item.timestamp >=
          cutoff
      );


  return true;
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
    Math.max(
      0,
      safeNumber(
        lookbackMs,
        0
      )
    );


  return (
    findNearestPriceAtOrBefore(
      history,
      target
    ) ||
    findNearestPriceSample(
      history,
      target
    )
  );
}


/* ============================================================
   GRT RECENT LOCAL LOW
============================================================ */

function getGRTRecentLocalLow(
  windowMs =
    FIVE_MINUTES
) {
  const cutoff =
    Date.now() -
    Math.max(
      0,
      safeNumber(
        windowMs,
        FIVE_MINUTES
      )
    );


  const points =
    GRT_MOMENTUM_RUNTIME
      .recentPrices
      .filter(
        (
          item
        ) =>
          item.timestamp >=
          cutoff
      );


  if (
    !points.length
  ) {
    return null;
  }


  return points.reduce(
    (
      low,
      item
    ) =>
      item.price <
      low.price
        ? item
        : low,
    points[
      0
    ]
  );
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
      return "❔ UNKNOWN";
  }
}


/* ============================================================
   GRT FAST DIRECTION
============================================================ */

function getGRTFastDirection(
  currentPrice
) {
  const price =
    safeNumber(
      currentPrice,
      0
    );


  const ref5m =
    getGRTReferencePrice(
      FIVE_MINUTES
    );


  const ref15m =
    getGRTReferencePrice(
      FIFTEEN_MINUTES
    );


  if (
    price <=
      0 ||
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
   GRT SUSTAINED MOVE
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


  return {
    ready:
      true,

    change5m,

    change15m,

    change30m,

    momentum15mActive,

    momentum15mStrong,

    sustained:
      Boolean(
        momentum15mActive &&
        change30m >=
          GRT_SUSTAINED_30M_MOVE_PCT
      ),

    accelerating:
      Boolean(
        change5m >=
          GRT_ACCELERATION_5M_MOVE_PCT ||
        (
          change15m >=
            GRT_ACCELERATION_15M_MOVE_PCT &&
          change30m >=
            GRT_ACCELERATION_30M_MOVE_PCT
        )
      ),

    fastReevaluate:
      change30m >=
      GRT_FAST_REEVALUATE_30M_MOVE_PCT,
  };
}


/* ============================================================
   MERGE FAST + SUSTAINED DIRECTION
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
    [
      "SIDEWAY",
      "DROP_PERLAHAN",
    ].includes(
      direction
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


  const trades10m =
    getTradesInWindow(
      coin,
      10 *
        60 *
        1000
    );


  const cutoff =
    Date.now() -
    FIVE_MINUTES;


  const previousTrades =
    trades10m.filter(
      (
        trade
      ) =>
        trade.timestamp <
        cutoff
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
    const trade
    of previousTrades
  ) {
    if (
      trade.isBuy
    ) {
      previousBuyVolume +=
        safeNumber(
          trade.volume,
          0
        );


      previousBuyCount +=
        1;
    } else {
      previousSellVolume +=
        safeNumber(
          trade.volume,
          0
        );


      previousSellCount +=
        1;
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
      current.totalCount >
      0,

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
    let i =
      1;
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
    100 /
      (
        1 +
        rs
      )
  );
}


/* ============================================================
   GRT TECHNICAL SNAPSHOT

   One candle request is shared by:
   - RSI
   - MA9
   - MA50

   Prevents unnecessary duplicate candle requests.
============================================================ */

async function getGRTTechnicalSnapshot() {
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


  const closes =
    completed
      .map(
        (
          candle
        ) =>
          safeNumber(
            candle.close,
            0
          )
      )
      .filter(
        (
          value
        ) =>
          value >
          0
      );


  if (
    closes.length <
    GRT_MA_SLOW
  ) {
    return {
      ready:
        false,

      rsiReady:
        false,

      maReady:
        false,

      rsi:
        null,

      rsiPrevious:
        null,

      rsiDirection:
        "UNKNOWN",

      ma9:
        null,

      ma50:
        null,

      maGapPct:
        null,

      nearCross:
        false,

      bullishMA:
        false,

      hardBearish:
        false,
    };
  }


  const ma9 =
    average(
      closes.slice(
        -GRT_MA_FAST
      )
    );


  const ma50 =
    average(
      closes.slice(
        -GRT_MA_SLOW
      )
    );


  const latest =
    closes[
      closes.length -
      1
    ];


  const maGapPct =
    ma50 >
    0
      ? percentChange(
          ma50,
          ma9
        )
      : 0;


  const rsi =
    calculateRSI(
      closes,
      GRT_RSI_PERIOD
    );


  const rsiPrevious =
    calculateRSI(
      closes.slice(
        0,
        -1
      ),
      GRT_RSI_PERIOD
    );


  const rsiChange =
    rsi !==
        null &&
      rsiPrevious !==
        null
      ? rsi -
        rsiPrevious
      : 0;


  return {
    ready:
      true,

    rsiReady:
      rsi !==
      null,

    maReady:
      true,

    latest,

    rsi,

    rsiPrevious,

    rsiChange,

    rsiDirection:
      rsiChange >=
        1
        ? "RISING"
        : rsiChange <=
            -1
          ? "FALLING"
          : "FLAT",

    oversold:
      rsi !==
        null &&
      rsi <=
        30,

    overbought:
      rsi !==
        null &&
      rsi >=
        70,

    ma9,

    ma50,

    maGapPct,

    nearCross:
      Math.abs(
        maGapPct
      ) <=
      GRT_MA_NEAR_CROSS_PCT,

    bullishMA:
      ma9 >=
      ma50,

    hardBearish:
      Boolean(
        latest <
          ma9 &&
        ma9 <
          ma50 &&
        maGapPct <=
          -0.50
      ),
  };
}


/* ============================================================
   ACCUMULATION
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


  const buyIncreasePct =
    safeNumber(
      baseline.buyIncreasePct,
      -100
    );


  const buyVolumePct =
    safeNumber(
      baseline
        .current
        ?.buyVolumePct,
      0
    );


  const buyFrequencyPct =
    safeNumber(
      baseline
        .current
        ?.buyFrequencyPct,
      0
    );


  let score =
    0;


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


  if (
    buyFrequencyPct >=
    52
  ) {
    score +=
      1;
  }


  if (
    liquidity
      ?.ready &&
    liquidity.bidLiquidityPct >=
      52
  ) {
    score +=
      1;
  }


  if (
    sustainedMove
      ?.change5m >
    0
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
  technical,
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
        ?.buyVolumePct,
      0
    );


  const buyFrequencyPct =
    safeNumber(
      baseline
        .current
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
    buyVolumePct >=
    GRT_EARLY_MIN_BUY_VOLUME_PCT
  ) {
    score +=
      2;
  }


  if (
    buyFrequencyPct >=
    GRT_EARLY_MIN_BUY_FREQUENCY_PCT
  ) {
    score +=
      1;
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
    technical
      ?.maReady &&
    (
      technical.bullishMA ||
      technical.nearCross
    )
  ) {
    score +=
      1;
  }


  if (
    technical
      ?.rsiReady &&
    technical.rsiDirection ===
      "RISING" &&
    technical.rsi <
      72
  ) {
    score +=
      1;
  }


  if (
    liquidity
      ?.ready &&
    liquidity.bidLiquidityPct >=
      50
  ) {
    score +=
      1;
  }


  return {
    detected:
      score >=
      5,

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
          priceResponse.changePct,
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
    score +=
      1;
  }


  if (
    responsePct >
    0
  ) {
    score +=
      1;
  }


  return {
    detected:
      score >=
      6,

    score,

    buyVolumePct,

    buyFrequencyPct,

    responsePct,
  };
}


/* ============================================================
   BTC BUY SURGE

   BTC = market context only.

   BTC does not create a GRT BUY signal by itself.
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


  const context15m =
    await getBTC15mContext();


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
        LAST_BTC_SURGE_STATE,

      flow,

      response,

      context15m,
    };
  }


  const active =
    Boolean(
      flow.buyVolumePct >=
        BTC_BUY_SURGE_MIN_BUY_PCT &&
      response.changePct >=
        BTC_BUY_SURGE_MIN_PRICE_RESPONSE_PCT &&
      ![
        "TURUN",
        "TURUN_KUAT",
      ].includes(
        context15m
          ?.direction
      )
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

    context15m,
  };
}


/* ============================================================
   2H CONFIRMATION BOOST
============================================================ */

function getGRT2HConfirmationBoost(
  twoHour
) {
  if (
    !twoHour
      ?.ready ||
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
    [
      "BULLISH",
      "BULLISH_STRONG",
    ].includes(
      twoHour.direction
    );


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
        ? 8
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
   GLOBAL LEAD CONTRIBUTION

   IMPORTANT:
   Global Lead supports / penalizes the decision.
   It cannot independently create BUY NOW.
============================================================ */

function evaluateGlobalLeadContribution(
  globalLead
) {
  if (
    !globalLead
      ?.ready
  ) {
    return {
      ready:
        false,

      scoreAdjustment:
        0,

      bullish:
        false,

      bearish:
        false,

      reason:
        "GLOBAL LEAD NOT READY",
    };
  }


  let scoreAdjustment =
    0;


  const globalUp =
    [
      "NAIK",
      "NAIK_KUAT",
    ].includes(
      globalLead.globalDirection
    );


  const globalDown =
    [
      "TURUN",
      "TURUN_KUAT",
    ].includes(
      globalLead.globalDirection
    );


  const lunoUp =
    [
      "NAIK",
      "NAIK_KUAT",
    ].includes(
      globalLead.lunoDirection
    );


  const lunoDown =
    [
      "TURUN",
      "TURUN_KUAT",
    ].includes(
      globalLead.lunoDirection
    );


  if (
    globalLead.agreement ===
    "AGREE_UP"
  ) {
    scoreAdjustment +=
      globalLead.strength ===
        "STRONG"
        ? 10
        : globalLead.strength ===
            "MEDIUM"
          ? 7
          : 4;
  } else if (
    globalLead.agreement ===
    "AGREE_DOWN"
  ) {
    scoreAdjustment -=
      globalLead.strength ===
        "STRONG"
        ? 12
        : globalLead.strength ===
            "MEDIUM"
          ? 8
          : 4;
  } else if (
    globalUp &&
    !lunoDown
  ) {
    scoreAdjustment +=
      globalLead.strength ===
        "STRONG"
        ? 7
        : 4;
  } else if (
    globalDown &&
    !lunoUp
  ) {
    scoreAdjustment -=
      globalLead.strength ===
        "STRONG"
        ? 9
        : 5;
  }


  if (
    safeNumber(
      globalLead.global5mPct,
      0
    ) >
      0 &&
    safeNumber(
      globalLead.global15mPct,
      0
    ) >
      0
  ) {
    scoreAdjustment +=
      3;
  }


  if (
    safeNumber(
      globalLead.global5mPct,
      0
    ) <
      0 &&
    safeNumber(
      globalLead.global15mPct,
      0
    ) <
      0
  ) {
    scoreAdjustment -=
      3;
  }


  return {
    ready:
      true,

    scoreAdjustment:
      clamp(
        scoreAdjustment,
        -15,
        15
      ),

    bullish:
      Boolean(
        globalUp &&
        !lunoDown
      ),

    bearish:
      Boolean(
        globalDown &&
        !lunoUp
      ),

    agreement:
      globalLead.agreement,

    strength:
      globalLead.strength,

    gapPct:
      globalLead.gapPct,

    reason:
      globalLead.agreement,
  };
}


/* ============================================================
   EARLY REVERSAL
============================================================ */

function detectGRTEarlyReversal({
  currentPrice,
  direction,
  sustainedMove,
  baseline,
  priceResponse,
  liquidity,
  twoHourBoost,
  globalContribution,
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
    score +=
      1;
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
    score +=
      1;
  }


  if (
    responsePct >=
    GRT_EARLY_REVERSAL_MIN_PRICE_RESPONSE_PCT
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
    twoHourBoost
      ?.active
  ) {
    score +=
      1;
  }


  if (
    globalContribution
      ?.bullish
  ) {
    score +=
      1;
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
          6 &&
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

    resistanceBlocking,
  };
}


/* ============================================================
   CONFIDENCE SCORE 0–100
============================================================ */

function calculateGRTConfidence({
  accumulation,
  earlyMomentum,
  acceleration,
  sustainedMove,
  technical,
  liquidity,
  priceResponse,
  btcSurge,
  twoHourBoost,
  globalContribution,
}) {
  let score =
    35;


  if (
    accumulation
      ?.detected
  ) {
    score +=
      6;
  }


  if (
    earlyMomentum
      ?.detected
  ) {
    score +=
      10;
  }


  if (
    acceleration
      ?.detected
  ) {
    score +=
      12;
  }


  if (
    sustainedMove
      ?.momentum15mActive
  ) {
    score +=
      6;
  }


  if (
    sustainedMove
      ?.momentum15mStrong
  ) {
    score +=
      5;
  }


  if (
    technical
      ?.bullishMA
  ) {
    score +=
      6;
  } else if (
    technical
      ?.nearCross
  ) {
    score +=
      3;
  }


  if (
    technical
      ?.rsiReady &&
    technical.rsiDirection ===
      "RISING" &&
    technical.rsi >=
      35 &&
    technical.rsi <=
      68
  ) {
    score +=
      5;
  }


  if (
    technical
      ?.overbought &&
    technical.rsiDirection ===
      "FALLING"
  ) {
    score -=
      8;
  }


  if (
    liquidity
      ?.ready &&
    liquidity.bidLiquidityPct >
      liquidity.askLiquidityPct
  ) {
    score +=
      5;
  }


  if (
    liquidity
      ?.resistanceBlocking
  ) {
    score -=
      10;
  }


  if (
    priceResponse
      ?.ready &&
    priceResponse.changePct >
      0
  ) {
    score +=
      5;
  }


  if (
    btcSurge
      ?.active
  ) {
    score +=
      5;
  }


  if (
    [
      "TURUN",
      "TURUN_KUAT",
    ].includes(
      btcSurge
        ?.context15m
        ?.direction
    )
  ) {
    score -=
      7;
  }


  score +=
    safeNumber(
      twoHourBoost
        ?.scoreBoost,
      0
    );


  score +=
    safeNumber(
      globalContribution
        ?.scoreAdjustment,
      0
    );


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
============================================================ */

function getConfidenceLabel(
  confidence
) {
  const value =
    safeNumber(
      confidence,
      0
    );


  if (
    value >=
    80
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
   MOMENTUM STATE
============================================================ */

function setGRTMomentumPhase(
  phase
) {
  GRT_MOMENTUM_RUNTIME
    .phase =
      phase;


  return phase;
}


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


function markGRTEngineReady(
  decision
) {
  if (
    decision &&
    decision.status !==
      "COLLECTING"
  ) {
    GRT_ENGINE_HAS_BEEN_READY =
      true;
  }
}


/* ============================================================
   CANONICAL DECISION OBJECT
============================================================ */

function buildGRTDecisionResult({
  status,
  reason,
  currentPrice,
  direction,
  directionText,
  confidence =
    0,
  ...rest
}) {
  return {
    status,

    phase:
      status,

    text:
      status ===
        "BUY_NOW"
        ? "🟢 BUY NOW"
        : status ===
            "VERIFYING"
          ? "🟠 CEK MOMENTUM"
          : status ===
              "DONT_BUY"
            ? "🔴 DON'T BUY"
            : "🟡 COLLECTING MARKET DATA",

    reason,

    currentPrice,

    direction,

    directionText,

    confidence,

    confidenceLabel:
      getConfidenceLabel(
        confidence
      ),

    ...rest,
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
    return buildGRTDecisionResult({
      status:
        "COLLECTING",

      reason:
        "TICKER UNAVAILABLE",

      currentPrice:
        0,

      direction:
        GRT_MOMENTUM_RUNTIME
          .lastDirection ||
        "UNKNOWN",

      directionText:
        formatGRTDirection(
          GRT_MOMENTUM_RUNTIME
            .lastDirection
        ),

      confidence:
        0,
    });
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
    technical,
    liquidity,
    btcSurge,
    twoHour,
  ] =
    await Promise.all([
      getGRTTechnicalSnapshot(),

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


  const structureForGlobal = {
    coin:
      "GRT",

    currentPrice,

    support:
      liquidity
        ?.support ||
      null,

    resistance:
      liquidity
        ?.resistance ||
      null,

    direction,
  };


  const globalLead =
    await buildGRTGlobalLeadSnapshot(
      structureForGlobal
    );


  const globalContribution =
    evaluateGlobalLeadContribution(
      globalLead
    );


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

      technical,

      liquidity,

      sustainedMove,
    });


  const acceleration =
    detectGRTAcceleration({
      baseline,

      priceResponse,

      sustainedMove,
    });


  const twoHourBoost =
    getGRT2HConfirmationBoost(
      twoHour
    );


  const earlyReversal =
    detectGRTEarlyReversal({
      currentPrice,

      direction,

      sustainedMove,

      baseline,

      priceResponse,

      liquidity,

      twoHourBoost,

      globalContribution,
    });


  const confidence =
    calculateGRTConfidence({
      accumulation,

      earlyMomentum,

      acceleration,

      sustainedMove,

      technical,

      liquidity,

      priceResponse,

      btcSurge,

      twoHourBoost,

      globalContribution,
    });


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


/* ============================================================
   HARD DANGER RULES
============================================================ */

  const hardBearish =
    Boolean(
      technical
        ?.hardBearish
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


  const globalHardBearish =
    Boolean(
      globalContribution
        .ready &&
      globalContribution
        .bearish &&
      globalContribution
        .scoreAdjustment <=
        -10
    );


  const hardVeto =
    Boolean(
      hardBearish ||
      negativePriceFailure ||
      buyerCollapse ||
      activeBreakdown ||
      globalHardBearish
    );


  const common = {
    fastDirection,

    sustainedMove,

    technical,

    baseline,

    priceResponse,

    liquidity,

    btcSurge,

    twoHour,

    twoHourBoost,

    globalLead,

    globalContribution,

    accumulation,

    earlyMomentum,

    acceleration,

    earlyReversal,
  };


/* ============================================================
   BASELINE NOT READY
============================================================ */

  if (
    !baseline
      ?.ready &&
    !fastDirection
      ?.ready
  ) {
    setGRTMomentumPhase(
      "COLLECTING"
    );


    setGRTLastDecision(
      "COLLECTING"
    );


    return buildGRTDecisionResult({
      status:
        "COLLECTING",

      reason:
        "MARKET BASELINE NOT READY",

      currentPrice,

      direction,

      directionText,

      confidence,

      ...common,
    });
  }


/* ============================================================
   HARD VETO
============================================================ */

  if (
    hardVeto &&
    !sustainedMove
      ?.momentum15mStrong
  ) {
    clearGRTValidation();


    setGRTMomentumPhase(
      "DONT_BUY"
    );


    setGRTLastDecision(
      "DONT_BUY"
    );


    const reason =
      globalHardBearish
        ? "GLOBAL LEAD BEARISH"
        : hardBearish
          ? "HARD BEARISH MA STRUCTURE"
          : negativePriceFailure
            ? "PRICE RESPONSE FAILED"
            : buyerCollapse
              ? "BUYERS COLLAPSED"
              : "ACTIVE PRICE BREAKDOWN";


    return buildGRTDecisionResult({
      status:
        "DONT_BUY",

      reason,

      currentPrice,

      direction,

      directionText,

      confidence,

      hardVeto:
        true,

      ...common,
    });
  }


/* ============================================================
   UPWARD CANDIDATE
============================================================ */

  const strongFlow =
    Boolean(
      safeNumber(
        baseline
          ?.buyIncreasePct,
        -100
      ) >=
        60 &&
      rawBuyPct >=
        GRT_SUSTAINED_MIN_BUY_VOLUME_PCT &&
      rawBuyFrequency >=
        GRT_SUSTAINED_MIN_BUY_FREQUENCY_PCT &&
      priceResponsePct >
        0
    );


  const upwardCandidate =
    Boolean(
      [
        "NAIK_PERLAHAN",
        "NAIK_LAJU",
      ].includes(
        direction
      ) ||
      sustainedMove
        ?.momentum15mActive ||
      earlyMomentum
        .detected ||
      acceleration
        .detected ||
      earlyReversal
        .detected ||
      strongFlow
    );


/* ============================================================
   BUY PATHS
============================================================ */

  const buyPathReversal =
    Boolean(
      earlyReversal
        .detected &&
      confidence >=
        GRT_BUY_NOW_MIN_CONFIDENCE
    );


  const buyPathAcceleration =
    Boolean(
      acceleration
        .detected &&
      rawBuyPct >=
        58 &&
      rawBuyFrequency >=
        50 &&
      confidence >=
        GRT_BUY_NOW_MIN_CONFIDENCE
    );


  const buyPathSustained =
    Boolean(
      earlyMomentum
        .detected &&
      sustainedMove
        ?.sustained &&
      rawBuyPct >=
        54 &&
      confidence >=
        GRT_BUY_NOW_MIN_CONFIDENCE
    );


  const buyPathStrongFlow =
    Boolean(
      strongFlow &&
      confidence >=
        GRT_BUY_NOW_MIN_CONFIDENCE
    );


  const buyPath15m =
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
      confidence >=
        GRT_BUY_NOW_MIN_CONFIDENCE
    );


  const buyNow =
    Boolean(
      !hardVeto &&
      !liquidity
        ?.resistanceBlocking &&
      (
        buyPathReversal ||
        buyPathAcceleration ||
        buyPathSustained ||
        buyPathStrongFlow ||
        buyPath15m
      )
    );


  updateGRTMomentumPeaks({
    score:
      confidence,

    baseline,

    priceResponse,
  });


/* ============================================================
   BUY NOW
============================================================ */

  if (
    buyNow
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


    const reason =
      buyPathReversal
        ? "EARLY REVERSAL CONFIRMED"
        : buyPathAcceleration
          ? "ACCELERATION CONFIRMED"
          : buyPath15m
            ? "15M MOMENTUM CONFIRMED"
            : buyPathSustained
              ? "SUSTAINED MOMENTUM CONFIRMED"
              : "STRONG EXECUTED BUY FLOW";


    return buildGRTDecisionResult({
      status:
        "BUY_NOW",

      reason,

      currentPrice,

      direction,

      directionText,

      confidence,

      buyPaths: {
        reversal:
          buyPathReversal,

        acceleration:
          buyPathAcceleration,

        sustained:
          buyPathSustained,

        strongFlow:
          buyPathStrongFlow,

        backbone15m:
          buyPath15m,
      },

      ...common,
    });
  }


/* ============================================================
   VERIFYING
============================================================ */

  if (
    upwardCandidate &&
    confidence >=
      GRT_VERIFYING_MIN_CONFIDENCE
  ) {
    const validation =
      ensureGRTValidationStarted();


    if (
      validation.expired
    ) {
      clearGRTValidation();


      setGRTMomentumPhase(
        "DONT_BUY"
      );


      setGRTLastDecision(
        "DONT_BUY"
      );


      return buildGRTDecisionResult({
        status:
          "DONT_BUY",

        reason:
          "MOMENTUM VALIDATION EXPIRED",

        currentPrice,

        direction,

        directionText,

        confidence,

        validation,

        ...common,
      });
    }


    setGRTMomentumPhase(
      "VERIFYING"
    );


    setGRTLastDecision(
      "VERIFYING"
    );


    return buildGRTDecisionResult({
      status:
        "VERIFYING",

      reason:
        globalContribution
          .bullish
          ? "UPWARD MOVE + GLOBAL LEAD SUPPORT"
          : sustainedMove
              ?.momentum15mStrong
            ? "15M MOMENTUM STRONG — VERIFYING"
            : earlyReversal
                .score >=
              4
              ? "EARLY REVERSAL — VERIFYING"
              : "UPWARD MOMENTUM — VERIFYING",

      currentPrice,

      direction,

      directionText,

      confidence,

      validation,

      ...common,
    });
  }


/* ============================================================
   DON'T BUY
============================================================ */

  clearGRTValidation();


  setGRTMomentumPhase(
    "DONT_BUY"
  );


  setGRTLastDecision(
    "DONT_BUY"
  );


  return buildGRTDecisionResult({
    status:
      "DONT_BUY",

    reason:
      direction ===
        "MASIH_DROP"
        ? "PRICE STILL DROPPING"
        : direction ===
            "DROP_PERLAHAN"
          ? "PRICE STILL WEAK"
          : direction ===
              "SIDEWAY"
            ? "SIDEWAY — NO CONFIRMATION"
            : "MOMENTUM NOT STRONG ENOUGH",

    currentPrice,

    direction,

    directionText,

    confidence,

    ...common,
  });
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
   NORMALIZE DECISION
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
        "❔ UNKNOWN",

      confidence:
        0,

      confidenceLabel:
        "WEAK",

      actionable:
        false,

      validating:
        false,

      criteria:
        "COLLECTING DATA",
    };
  }


  return {
    status:
      decision.status,

    text:
      decision.text,

    direction:
      decision.direction ||
      "UNKNOWN",

    directionText:
      decision.directionText ||
      formatGRTDirection(
        decision.direction
      ),

    confidence:
      safeNumber(
        decision.confidence,
        0
      ),

    confidenceLabel:
      decision.confidenceLabel ||
      getConfidenceLabel(
        decision.confidence
      ),

    criteria:
      decision.reason ||
      "NO REASON",

    actionable:
      decision.status ===
      "BUY_NOW",

    validating:
      decision.status ===
      "VERIFYING",
  };
}


/* ============================================================
   GRT MASTER MOMENTUM SNAPSHOT
============================================================ */

async function getGRTMomentumSnapshot(
  ticker =
    null
) {
  const activeTicker =
    ticker ||
    await getTicker(
      "GRT"
    );


  if (
    !activeTicker
  ) {
    const fallbackDecision =
      buildGRTDecisionResult({
        status:
          GRT_ENGINE_HAS_BEEN_READY
            ? "DONT_BUY"
            : "COLLECTING",

        reason:
          GRT_ENGINE_HAS_BEEN_READY
            ? "TICKER TEMPORARILY UNAVAILABLE"
            : "WAITING FOR MARKET DATA",

        currentPrice:
          0,

        direction:
          GRT_MOMENTUM_RUNTIME
            .lastDirection ||
          "UNKNOWN",

        directionText:
          formatGRTDirection(
            GRT_MOMENTUM_RUNTIME
              .lastDirection
          ),

        confidence:
          0,
      });


    return {
      ticker:
        null,

      decision:
        fallbackDecision,

      normalized:
        normalizeGRTDecision(
          fallbackDecision
        ),
    };
  }


  const decision =
    await getGRTMomentumDecision(
      activeTicker
    );


  markGRTEngineReady(
    decision
  );


  return {
    ticker:
      activeTicker,

    decision,

    normalized:
      normalizeGRTDecision(
        decision
      ),
  };
}


/* ============================================================
   GRT MOMENTUM TELEGRAM REPORT
============================================================ */

function buildGRTMomentumReport(
  snapshot
) {
  if (
    !snapshot
      ?.decision
  ) {
    return (
      "🟡 GRT MOMENTUM\n" +
      "DATA BELUM READY"
    );
  }


  const decision =
    snapshot.decision;


  const flow =
    decision
      .baseline
      ?.current;


  const technical =
    decision
      .technical;


  const globalLead =
    decision
      .globalLead;


  const confidenceText =
    `${Math.round(
      safeNumber(
        decision.confidence,
        0
      )
    )}/100`;


  return `⚡ GRT MOMENTUM

${decision.text}
Confidence: ${confidenceText} | ${decision.confidenceLabel}
Reason: ${decision.reason}

${decision.directionText}
5M: ${formatPercent(
    decision
      .sustainedMove
      ?.change5m ||
    0
  )} | 15M: ${formatPercent(
    decision
      .sustainedMove
      ?.change15m ||
    0
  )}

🟢 Buy Vol: ${formatPercent(
    flow
      ?.buyVolumePct ||
    0,
    1,
    false
  )} | Buy Freq: ${formatPercent(
    flow
      ?.buyFrequencyPct ||
    0,
    1,
    false
  )}

RSI: ${
    technical
      ?.rsiReady
      ? safeNumber(
          technical.rsi,
          0
        ).toFixed(
          1
        )
      : "N/A"
  }

MA9/MA50: ${
    technical
      ?.maReady
      ? `${formatPrice(
          technical.ma9
        )} / ${formatPrice(
          technical.ma50
        )}`
      : "N/A"
  }

BTC: ${
    decision
      .btcSurge
      ?.active
      ? "🟢 BUY SURGE"
      : "⚪ NO SURGE"
  }

Global: ${
    globalLead
      ?.ready
      ? `${formatLeadMomentum(
          globalLead
            .globalDirection
        )} | Gap ${formatPercent(
          globalLead
            .gapPct
        )}`
      : "N/A"
  }`;
}


/* ============================================================
   END PART 4
============================================================ */
/* ============================================================
   PART 5 — GRT ENTRY + BREAKOUT INTELLIGENCE
              + PRACTICAL SCALPING + ORDER PLAN

   PURPOSE:
   - BUY NOW → practical entry qualification
   - Breakout quality / hold / false breakout
   - No-chase entry protection
   - Resistance room
   - Fee-aware room
   - Entry / TP / TP2 / SL
   - Quantity-aware orderbook entry
   - Capital-based order plan
   - Target-profit manual order plan

   IMPORTANT:
   - BUY NOW already comes from PART 4.
   - PART 5 decides whether entry is PRACTICAL.
   - PART 5 DOES NOT submit real BUY / SELL.
============================================================ */


/* ============================================================
   PART 5 CONFIG
============================================================ */

const PART5_CONFIG =
  Object.freeze({

    minExecutionScore:
      62,

    maxEntryChasePct:
      0.35,

    minPracticalRoomPct:
      0.85,

    strongRoomPct:
      2.00,

    defaultSlPct:
      1.20,

    strongSlPct:
      1.00,

    weakSlPct:
      1.40,

    resistanceBufferPct:
      0.18,

    breakoutBufferPct:
      0.12,

    breakoutHoldMs:
      2 *
      60 *
      1000,

    falseBreakoutLookbackMs:
      30 *
      60 *
      1000,

    maxOrderPlanIterations:
      4,

    maxGRTQuantity:
      30000,
  });


/* ============================================================
   BREAKOUT MEMORY
============================================================ */

const PART5_BREAKOUT_MEMORY = {

  lastConfirmedAt:
    0,

  lastConfirmedResistance:
    null,

  lastFalseBreakoutAt:
    0,

  lastFalseBreakoutResistance:
    null,
};


/* ============================================================
   GRT ENTRY REJECTION STATE
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
   PRACTICAL ENTRY CONFIDENCE
============================================================ */

function getPracticalEntryConfidence(
  score
) {
  const value =
    safeNumber(
      score,
      0
    );


  if (
    value >=
    80
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
   GRT BUY NOW COOLDOWN
============================================================ */

function getGRTBuyNowCooldown() {

  const last =
    safeNumber(
      LAST_GRT_BUY_NOW_SIGNAL,
      0
    );


  if (
    !last
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


  const remainingMs =
    Math.max(
      0,
      GRT_BUY_NOW_COOLDOWN_MS -
        (
          Date.now() -
          last
        )
    );


  return {

    active:
      remainingMs >
      0,

    remainingMs,

    remainingMinutes:
      remainingMs /
      60000,
  };
}


/* ============================================================
   BREAKOUT HOLD
============================================================ */

function calculateBreakoutHold(
  samples,
  resistancePrice,
  currentPrice
) {
  const resistance =
    safeNumber(
      resistancePrice,
      0
    );


  const price =
    safeNumber(
      currentPrice,
      0
    );


  if (
    !Array.isArray(
      samples
    ) ||
    !samples.length ||
    resistance <=
      0 ||
    price <=
      0
  ) {
    return {

      ready:
        false,

      held:
        false,

      heldMs:
        0,

      firstAboveAt:
        null,
    };
  }


  const threshold =
    resistance *
    (
      1 +
      PART5_CONFIG
        .breakoutBufferPct /
        100
    );


  let firstAboveAt =
    null;


  let lastAboveAt =
    null;


  for (
    const sample
    of samples
  ) {
    const samplePrice =
      safeNumber(
        sample?.price,
        0
      );


    const timestamp =
      safeNumber(
        sample?.timestamp,
        0
      );


    if (
      samplePrice >=
        threshold &&
      timestamp >
        0
    ) {
      if (
        !firstAboveAt
      ) {
        firstAboveAt =
          timestamp;
      }


      lastAboveAt =
        timestamp;

    } else if (
      firstAboveAt
    ) {
      firstAboveAt =
        null;


      lastAboveAt =
        null;
    }
  }


  const heldMs =
    firstAboveAt &&
    lastAboveAt
      ? Math.max(
          0,
          lastAboveAt -
            firstAboveAt
        )
      : 0;


  return {

    ready:
      true,

    held:
      Boolean(
        price >=
          threshold &&
        heldMs >=
          PART5_CONFIG
            .breakoutHoldMs
      ),

    heldMs,

    firstAboveAt,
  };
}


/* ============================================================
   FALSE BREAKOUT
============================================================ */

function detectFalseBreakout(
  samples,
  resistancePrice
) {
  const resistance =
    safeNumber(
      resistancePrice,
      0
    );


  if (
    !Array.isArray(
      samples
    ) ||
    samples.length <
      3 ||
    resistance <=
      0
  ) {
    return {

      detected:
        false,

      peakPrice:
        null,

      rejectionPct:
        0,
    };
  }


  const threshold =
    resistance *
    (
      1 +
      PART5_CONFIG
        .breakoutBufferPct /
        100
    );


  let peakPrice =
    0;


  let brokeAbove =
    false;


  for (
    const sample
    of samples
  ) {
    const price =
      safeNumber(
        sample?.price,
        0
      );


    if (
      price >=
      threshold
    ) {
      brokeAbove =
        true;
    }


    if (
      brokeAbove
    ) {
      peakPrice =
        Math.max(
          peakPrice,
          price
        );
    }
  }


  const latestPrice =
    safeNumber(
      samples[
        samples.length -
        1
      ]?.price,
      0
    );


  const detected =
    Boolean(
      brokeAbove &&
      latestPrice >
        0 &&
      latestPrice <
        resistance
    );


  return {

    detected,

    peakPrice:
      peakPrice ||
      null,

    latestPrice,

    rejectionPct:
      peakPrice >
        0 &&
      latestPrice >
        0
        ? Math.abs(
            percentChange(
              peakPrice,
              latestPrice
            )
          )
        : 0,
  };
}


/* ============================================================
   BREAKOUT INTELLIGENCE
============================================================ */

function assessGRTBreakout({
  currentPrice,
  resistance,
  momentumDecision,
}) {
  const price =
    safeNumber(
      currentPrice,
      0
    );


  const resistancePrice =
    safeNumber(
      resistance?.price,
      0
    );


  if (
    price <=
      0 ||
    resistancePrice <=
      0
  ) {
    return {

      ready:
        false,

      state:
        "NO_RESISTANCE",

      confirmed:
        false,

      falseBreakout:
        false,

      quality:
        "UNKNOWN",
    };
  }


  const samples =
    getPriceMemoryWindow(
      "GRT",
      PART5_CONFIG
        .falseBreakoutLookbackMs
    );


  const breakoutPct =
    percentChange(
      resistancePrice,
      price
    );


  const hold =
    calculateBreakoutHold(
      samples,
      resistancePrice,
      price
    );


  const falseBreakout =
    detectFalseBreakout(
      samples,
      resistancePrice
    );


  const flow =
    momentumDecision
      ?.baseline
      ?.current ||
    null;


  const buyVolumePct =
    safeNumber(
      flow?.buyVolumePct,
      0
    );


  const buyFrequencyPct =
    safeNumber(
      flow?.buyFrequencyPct,
      0
    );


  const priceResponsePct =
    safeNumber(
      momentumDecision
        ?.priceResponse
        ?.changePct,
      0
    );


  let qualityScore =
    0;


  if (
    breakoutPct >=
    PART5_CONFIG
      .breakoutBufferPct
  ) {
    qualityScore +=
      3;
  }


  if (
    hold.held
  ) {
    qualityScore +=
      3;
  }


  if (
    buyVolumePct >=
    56
  ) {
    qualityScore +=
      2;
  }


  if (
    buyFrequencyPct >=
    52
  ) {
    qualityScore +=
      1;
  }


  if (
    priceResponsePct >
    0
  ) {
    qualityScore +=
      1;
  }


  if (
    falseBreakout
      .detected
  ) {
    qualityScore -=
      5;
  }


  const confirmed =
    Boolean(
      price >
        resistancePrice &&
      qualityScore >=
        6 &&
      !falseBreakout
        .detected
    );


  const quality =
    qualityScore >=
      8
      ? "STRONG"
      : qualityScore >=
          5
        ? "MID"
        : "WEAK";


  if (
    confirmed
  ) {
    PART5_BREAKOUT_MEMORY
      .lastConfirmedAt =
        Date.now();


    PART5_BREAKOUT_MEMORY
      .lastConfirmedResistance =
        resistancePrice;
  }


  if (
    falseBreakout
      .detected
  ) {
    PART5_BREAKOUT_MEMORY
      .lastFalseBreakoutAt =
        Date.now();


    PART5_BREAKOUT_MEMORY
      .lastFalseBreakoutResistance =
        resistancePrice;
  }


  return {

    ready:
      true,

    state:
      falseBreakout
        .detected
        ? "FALSE_BREAKOUT"
        : confirmed
          ? "CONFIRMED_BREAKOUT"
          : price >
              resistancePrice
            ? "BREAKOUT_TESTING"
            : "BELOW_RESISTANCE",

    confirmed,

    falseBreakout:
      falseBreakout
        .detected,

    quality,

    qualityScore,

    breakoutPct,

    resistancePrice,

    hold,

    buyVolumePct,

    buyFrequencyPct,

    priceResponsePct,
  };
}


/* ============================================================
   PRACTICAL SCALPING SCORE
============================================================ */

function getScalpingExecutionScore({
  structure,
  momentumDecision,
  breakout,
}) {
  let score =
    45;


  const change15m =
    safeNumber(
      structure
        ?.change15mPct,
      0
    );


  const change1h =
    safeNumber(
      structure
        ?.change1hPct,
      0
    );


  const pressure =
    String(
      structure
        ?.pressure ||
      "BALANCED"
    );


  const direction =
    String(
      structure
        ?.direction ||
      "SIDEWAY"
    );


  if (
    change15m >=
    1
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


  if (
    change1h >=
    1.5
  ) {
    score +=
      5;

  } else if (
    change1h >=
    0.40
  ) {
    score +=
      2;

  } else if (
    change1h <=
    -1.50
  ) {
    score -=
      6;

  } else if (
    change1h <=
    -0.40
  ) {
    score -=
      3;
  }


  if (
    pressure ===
    "BUY_STRONG"
  ) {
    score +=
      8;

  } else if (
    pressure ===
    "BUY"
  ) {
    score +=
      4;

  } else if (
    pressure ===
    "SELL_STRONG"
  ) {
    score -=
      10;

  } else if (
    pressure ===
    "SELL"
  ) {
    score -=
      5;
  }


  if (
    direction ===
    "NAIK_KUAT"
  ) {
    score +=
      7;

  } else if (
    direction ===
    "NAIK"
  ) {
    score +=
      4;

  } else if (
    direction ===
    "TURUN_KUAT"
  ) {
    score -=
      8;

  } else if (
    direction ===
    "TURUN"
  ) {
    score -=
      4;
  }


  const momentumConfidence =
    safeNumber(
      momentumDecision
        ?.confidence,
      0
    );


  score +=
    clamp(
      (
        momentumConfidence -
        50
      ) *
        0.25,
      -10,
      12
    );


  if (
    breakout
      ?.confirmed
  ) {
    score +=
      breakout
        .quality ===
        "STRONG"
        ? 8
        : 5;
  }


  if (
    breakout
      ?.falseBreakout
  ) {
    score -=
      15;
  }


  if (
    momentumDecision
      ?.globalContribution
      ?.bearish
  ) {
    score -=
      6;
  }


  if (
    momentumDecision
      ?.globalContribution
      ?.bullish
  ) {
    score +=
      4;
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
   PROJECTED GRT REACH
============================================================ */

async function calculateGRTProjectedReach({
  currentPrice,
  momentumDecision,
  structure =
    null,
  breakout =
    null,
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
    structure ||
    await getExecutionStructureSnapshot(
      "GRT",
      price
    );


  if (
    !execution
  ) {
    return null;
  }


  const confidence =
    safeNumber(
      momentumDecision
        ?.confidence,
      0
    );


  let reachPct =
    1.00;


  if (
    confidence >=
    85
  ) {
    reachPct =
      2.20;

  } else if (
    confidence >=
    75
  ) {
    reachPct =
      1.70;

  } else if (
    confidence >=
    65
  ) {
    reachPct =
      1.25;
  }


  if (
    momentumDecision
      ?.sustainedMove
      ?.accelerating
  ) {
    reachPct +=
      0.35;
  }


  if (
    momentumDecision
      ?.sustainedMove
      ?.momentum15mStrong
  ) {
    reachPct +=
      0.25;
  }


  if (
    breakout
      ?.confirmed
  ) {
    reachPct +=
      breakout
        .quality ===
        "STRONG"
        ? 0.50
        : 0.25;
  }


  reachPct =
    clamp(
      reachPct,
      0.60,
      4.00
    );


  let tp1 =
    price *
    (
      1 +
      reachPct /
        100
    );


  const resistance =
    execution
      .resistance ||
    null;


  const resistancePrice =
    safeNumber(
      resistance?.price,
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
      6 &&
    !breakout
      ?.confirmed
  ) {
    const bufferedResistance =
      resistancePrice *
      (
        1 -
        PART5_CONFIG
          .resistanceBufferPct /
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
    return null;
  }


  const grossRoomPct =
    percentChange(
      price,
      tp1
    );


  const strongExtension =
    Boolean(
      confidence >=
        80 ||
      momentumDecision
        ?.sustainedMove
        ?.accelerating ||
      breakout
        ?.quality ===
        "STRONG"
    );


  const tp2Candidate =
    strongExtension
      ? price *
        (
          1 +
          Math.min(
            reachPct +
              1.00,
            5.00
          ) /
            100
        )
      : null;


  const tp2 =
    tp2Candidate >
    tp1
      ? tp2Candidate
      : null;


  return {

    currentPrice:
      price,

    tp1,

    tp2,

    grossRoomPct,

    baseReachPct:
      reachPct,

    resistance,

    resistanceRating,

    execution,

    tp2Confidence:
      tp2
        ? confidence >=
            85
          ? "MID"
          : "WEAK"
        : null,

    tp2Requirement:
      tp2
        ? "Momentum mesti kekal kuat dan resistance seterusnya tidak menahan harga."
        : null,

    reason:
      breakout
        ?.confirmed
        ? "BREAKOUT + MOMENTUM PROJECTED REACH"
        : "MOMENTUM PROJECTED REACH",
  };
}


/* ============================================================
   QUANTITY-AWARE LIMIT ENTRY
============================================================ */

async function chooseQuantityAwareLimitEntry({
  coin,
  technicalEntry,
  requiredQuantity =
    0,
}) {
  const normalized =
    normalizeCoin(
      coin
    );


  const entry =
    safeNumber(
      technicalEntry,
      0
    );


  const quantity =
    Math.max(
      0,
      safeNumber(
        requiredQuantity,
        0
      )
    );


  if (
    !normalized ||
    entry <=
      0
  ) {
    return {

      ready:
        false,

      finalEntry:
        null,

      bestAsk:
        null,

      matchedPrice:
        null,

      chasePct:
        0,

      sufficientDepth:
        false,

      reason:
        "INVALID TECHNICAL ENTRY",
    };
  }


  const orderBook =
    await getOrderBook(
      normalized
    );


  if (
    !orderBook
      ?.asks
      ?.length
  ) {
    return {

      ready:
        false,

      finalEntry:
        entry,

      bestAsk:
        null,

      matchedPrice:
        null,

      chasePct:
        0,

      sufficientDepth:
        false,

      reason:
        "ORDERBOOK UNAVAILABLE",
    };
  }


  const asks =
    [
      ...orderBook.asks,
    ].sort(
      (
        a,
        b
      ) =>
        a.price -
        b.price
    );


  const bestAsk =
    safeNumber(
      asks[
        0
      ]?.price,
      entry
    );


  if (
    quantity <=
    0
  ) {
    const finalEntry =
      Math.max(
        entry,
        bestAsk
      );


    return {

      ready:
        true,

      finalEntry,

      bestAsk,

      matchedPrice:
        bestAsk,

      chasePct:
        percentChange(
          entry,
          finalEntry
        ),

      requiredQuantity:
        0,

      availableQuantity:
        safeNumber(
          asks[
            0
          ]?.volume,
          0
        ),

      sufficientDepth:
        true,

      reason:
        "BEST ASK",
    };
  }


  let accumulated =
    0;


  let matchedPrice =
    null;


  for (
    const ask
    of asks
  ) {
    accumulated +=
      Math.max(
        0,
        safeNumber(
          ask.volume,
          0
        )
      );


    matchedPrice =
      safeNumber(
        ask.price,
        matchedPrice ||
        bestAsk
      );


    if (
      accumulated >=
      quantity
    ) {
      break;
    }
  }


  const sufficientDepth =
    accumulated >=
    quantity;


  const finalEntry =
    Math.max(
      entry,
      safeNumber(
        matchedPrice,
        bestAsk
      )
    );


  return {

    ready:
      true,

    finalEntry,

    bestAsk,

    matchedPrice,

    chasePct:
      percentChange(
        entry,
        finalEntry
      ),

    requiredQuantity:
      quantity,

    availableQuantity:
      accumulated,

    sufficientDepth,

    reason:
      sufficientDepth
        ? "QUANTITY-AWARE ORDERBOOK ENTRY"
        : "INSUFFICIENT VISIBLE ASK DEPTH",
  };
}


/* ============================================================
   ENTRY / TP / SL LEVELS
============================================================ */

function buildEntryRiskLevels({
  coin,
  entryPrice,
  projectedReach,
  confidence,
}) {
  const normalized =
    normalizeCoin(
      coin
    );


  const entry =
    safeNumber(
      entryPrice,
      0
    );


  if (
    !normalized ||
    entry <=
      0 ||
    !projectedReach
      ?.tp1
  ) {
    return null;
  }


  let slPct =
    PART5_CONFIG
      .defaultSlPct;


  if (
    confidence ===
    "STRONG"
  ) {
    slPct =
      PART5_CONFIG
        .strongSlPct;
  }


  if (
    confidence ===
    "WEAK"
  ) {
    slPct =
      PART5_CONFIG
        .weakSlPct;
  }


  let sl =
    entry *
    (
      1 -
      slPct /
        100
    );


  const supportPrice =
    safeNumber(
      projectedReach
        .execution
        ?.supportPrice,
      0
    );


  if (
    supportPrice >
      0 &&
    supportPrice <
      entry
  ) {
    const supportBuffer =
      supportPrice *
      0.998;


    const supportRiskPct =
      Math.abs(
        percentChange(
          entry,
          supportBuffer
        )
      );


    if (
      supportRiskPct <=
      2.00
    ) {
      sl =
        Math.min(
          sl,
          supportBuffer
        );


      slPct =
        Math.abs(
          percentChange(
            entry,
            sl
          )
        );
    }
  }


  return {

    coin:
      normalized,

    entryPrice:
      entry,

    tp:
      projectedReach
        .tp1,

    tp2:
      projectedReach
        .tp2 ||
      null,

    sl,

    slPct,

    durationHours:
      confidence ===
        "STRONG"
        ? "1-6"
        : confidence ===
            "WEAK"
          ? "2-8"
          : "2-6",
  };
}


/* ============================================================
   PRACTICAL GRT ENTRY QUALIFICATION
============================================================ */

async function qualifyGRTMomentumEntry({
  ticker,
  momentumDecision,
}) {
  if (
    !ticker ||
    !momentumDecision ||
    momentumDecision
      .status !==
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


  if (
    ACTIVE_TRADES
      ?.GRT
  ) {
    return {

      allowed:
        false,

      reason:
        "ACTIVE TRADE",
    };
  }


  if (
    PENDING_ENTRIES
      ?.GRT
  ) {
    return {

      allowed:
        false,

      reason:
        "ENTRY ALREADY PENDING",
    };
  }


  const structure =
    await getExecutionStructureSnapshot(
      "GRT",
      currentPrice
    );


  if (
    !structure
  ) {
    return {

      allowed:
        false,

      reason:
        "EXECUTION DATA UNAVAILABLE",
    };
  }


  const breakout =
    assessGRTBreakout({

      currentPrice,

      resistance:
        structure
          .resistance,

      momentumDecision,
    });


  if (
    breakout
      .falseBreakout
  ) {
    return {

      allowed:
        false,

      reason:
        "FALSE BREAKOUT DETECTED",

      structure,

      breakout,
    };
  }


  const depth =
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
      depth.finalEntry,
      currentPrice
    );


  const chasePct =
    safeNumber(
      depth.chasePct,
      0
    );


  if (
    chasePct >
    PART5_CONFIG
      .maxEntryChasePct
  ) {
    return {

      allowed:
        false,

      reason:
        "ENTRY CHASE TOO HIGH",

      chasePct,

      maximumChasePct:
        PART5_CONFIG
          .maxEntryChasePct,

      structure,

      breakout,

      depth,
    };
  }


  const projectedReach =
    await calculateGRTProjectedReach({

      currentPrice:
        finalEntry,

      momentumDecision,

      structure,

      breakout,
    });


  if (
    !projectedReach
      ?.tp1
  ) {
    return {

      allowed:
        false,

      reason:
        "PROJECTED REACH UNAVAILABLE",

      structure,

      breakout,

      depth,
    };
  }


  const finalRoomPct =
    percentChange(
      finalEntry,
      projectedReach.tp1
    );


  const breakEven =
    calculateBreakEvenPrice(
      finalEntry
    );


  const netRoomPct =
    percentChange(
      breakEven,
      projectedReach.tp1
    );


  if (
    finalRoomPct <
      PART5_CONFIG
        .minPracticalRoomPct ||
    netRoomPct <=
      0
  ) {
    return {

      allowed:
        false,

      reason:
        "INSUFFICIENT PRACTICAL ROOM AFTER FEES",

      finalEntry,

      finalRoomPct,

      netRoomPct,

      breakEven,

      minimumRoomPct:
        PART5_CONFIG
          .minPracticalRoomPct,

      structure,

      breakout,

      depth,

      projectedReach,
    };
  }


  const flow =
    structure.flow ||
    getExecutedFlowSummary(
      "GRT",
      FIVE_MINUTES
    );


  const liveSellDanger =
    Boolean(
      flow
        ?.ready &&
      flow.sellVolumePct >=
        68 &&
      flow.sellFrequencyPct >=
        58
    );


  if (
    liveSellDanger
  ) {
    return {

      allowed:
        false,

      reason:
        "LIVE SELL PRESSURE TOO STRONG",

      sellVolumePct:
        flow.sellVolumePct,

      sellFrequencyPct:
        flow.sellFrequencyPct,

      structure,

      breakout,

      depth,

      projectedReach,
    };
  }


  const executionScore =
    getScalpingExecutionScore({

      structure,

      momentumDecision,

      breakout,
    });


  if (
    executionScore <
    PART5_CONFIG
      .minExecutionScore
  ) {
    return {

      allowed:
        false,

      reason:
        "EXECUTION SCORE TOO LOW",

      score:
        executionScore,

      minimumScore:
        PART5_CONFIG
          .minExecutionScore,

      structure,

      breakout,

      depth,

      projectedReach,
    };
  }


  const roomQuality =
    finalRoomPct >=
    PART5_CONFIG
      .strongRoomPct
      ? "STRONG"
      : "GOOD";


  return {

    allowed:
      true,

    reason:
      breakout.confirmed
        ? "BREAKOUT ENTRY QUALIFIED"
        : "ENTRY QUALIFIED",

    currentPrice,

    technicalEntry:
      currentPrice,

    finalEntry,

    chasePct,

    finalRoomPct,

    netRoomPct,

    breakEven,

    roomQuality,

    executionScore,

    structure,

    breakout,

    depth,

    projectedReach,
  };
}


/* ============================================================
   SETUP CLASSIFICATION
============================================================ */

function classifyGRTSetup(
  momentumDecision,
  breakout
) {
  if (
    breakout
      ?.confirmed
  ) {
    return "BREAKOUT CONTINUATION";
  }


  if (
    momentumDecision
      ?.earlyReversal
      ?.detected
  ) {
    return "EARLY REVERSAL";
  }


  if (
    momentumDecision
      ?.acceleration
      ?.detected
  ) {
    return "EARLY ACCELERATION";
  }


  if (
    momentumDecision
      ?.sustainedMove
      ?.momentum15mStrong
  ) {
    return "15M MOMENTUM";
  }


  return "MOMENTUM CONTINUATION";
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
    !qualification
      .allowed
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


  const score =
    safeNumber(
      qualification
        .executionScore,
      0
    );


  const confidence =
    getPracticalEntryConfidence(
      score
    );


  const risk =
    buildEntryRiskLevels({

      coin:
        "GRT",

      entryPrice:
        qualification
          .finalEntry,

      projectedReach:
        qualification
          .projectedReach,

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

      qualification,
    };
  }


  clearGRTEntryRejection();


  return {

    allowed:
      true,

    coin:
      "GRT",

    currentPrice:
      safeNumber(
        ticker.currentPrice,
        0
      ),

    entryPrice:
      qualification
        .finalEntry,

    technicalEntry:
      qualification
        .technicalEntry,

    tp:
      risk.tp,

    tp2:
      risk.tp2,

    sl:
      risk.sl,

    slPct:
      risk.slPct,

    confidence,

    score,

    setup:
      classifyGRTSetup(
        momentumDecision,
        qualification
          .breakout
      ),

    durationHours:
      risk.durationHours,

    grossRoomPct:
      qualification
        .finalRoomPct,

    netRoomPct:
      qualification
        .netRoomPct,

    breakEven:
      qualification
        .breakEven,

    roomQuality:
      qualification
        .roomQuality,

    breakout:
      qualification
        .breakout,

    nextResistance:
      qualification
        .structure
        ?.resistance ||
      null,

    momentumSnapshot:
      momentumDecision,

    execution:
      qualification
        .structure,

    qualification,
  };
}


/* ============================================================
   ENTRY REJECTION MESSAGE
============================================================ */

function buildGRTScalpingRejectionMessage(
  entryResult
) {
  if (
    !entryResult ||
    entryResult.allowed
  ) {
    return null;
  }


  const reason =
    entryResult.reason ||
    entryResult
      .qualification
      ?.reason ||
    GRT_ENTRY_REJECTION_STATE
      .reason ||
    "ENTRY NOT READY";


  const score =
    entryResult.score ??
    entryResult
      .qualification
      ?.executionScore ??
    GRT_ENTRY_REJECTION_STATE
      .score;


  const scoreText =
    Number.isFinite(
      Number(
        score
      )
    )
      ? `\nScore  : ${Math.round(
          Number(
            score
          )
        )}/100`
      : "";


  return `🟢 BUY NOW

⚠️ SCALPING ENTRY NOT READY
Reason : ${reason}${scoreText}`;
}


/* ============================================================
   SCALPING CANDIDATE MESSAGE
============================================================ */

function buildGRTScalpingCandidateMessage(
  candidate
) {
  if (
    !candidate
      ?.allowed
  ) {
    return null;
  }


  const breakoutText =
    candidate
      .breakout
      ?.ready
      ? `${candidate.breakout.state} | ${candidate.breakout.quality}`
      : "N/A";


  const tp2Text =
    candidate.tp2
      ? `\n🎯 TP2: ${formatMYR(
          candidate.tp2
        )}`
      : "";


  return `🚀 GRT SCALPING CANDIDATE

💰 Current: ${formatMYR(
    candidate.currentPrice
  )}
📐 Entry: ${formatMYR(
    candidate.entryPrice
  )}
🎯 TP1: ${formatMYR(
    candidate.tp
  )}${tp2Text}
🛑 SL Ref: ${formatMYR(
    candidate.sl
  )}

📏 Gross Room: ${formatPercent(
    candidate.grossRoomPct
  )}
💵 Net Room Est: ${formatPercent(
    candidate.netRoomPct
  )}
⭐ Execution: ${candidate.score}/100 | ${candidate.confidence}
🧠 Setup: ${candidate.setup}
🚧 Breakout: ${breakoutText}
⏱ Estimate: ${candidate.durationHours} hours`;
}


/* ============================================================
   CAPITAL-BASED ORDER PLAN

   Used later by /autotrade.

   STILL NO REAL ORDER HERE.
============================================================ */

async function buildCapitalOrderPlan({
  candidate,
  capitalMYR,
}) {
  if (
    !candidate
      ?.allowed
  ) {
    return {

      allowed:
        false,

      reason:
        "CANDIDATE MISSING OR NOT ALLOWED",
    };
  }


  const capital =
    safeNumber(
      capitalMYR,
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
        "INVALID CAPITAL",
    };
  }


  let entryPrice =
    safeNumber(
      candidate.entryPrice,
      0
    );


  const sellPrice =
    safeNumber(
      candidate.tp,
      0
    );


  if (
    entryPrice <=
      0 ||
    sellPrice <=
      entryPrice
  ) {
    return {

      allowed:
        false,

      reason:
        "INVALID ENTRY OR TP",
    };
  }


  for (
    let iteration =
      0;
    iteration <
      PART5_CONFIG
        .maxOrderPlanIterations;
    iteration++
  ) {
    let quantity =
      calculateQuantityFromCapital({

        capitalMYR:
          capital,

        entryPrice,

        maxQuantity:
          candidate.coin ===
            "GRT"
            ? PART5_CONFIG
                .maxGRTQuantity
            : Infinity,
      });


    quantity =
      floorTo(
        quantity,
        2
      );


    if (
      quantity <=
      0
    ) {
      return {

        allowed:
          false,

        reason:
          "QUANTITY TOO SMALL",
      };
    }


    const depth =
      await chooseQuantityAwareLimitEntry({

        coin:
          candidate.coin,

        technicalEntry:
          candidate
            .technicalEntry,

        requiredQuantity:
          quantity,
      });


    if (
      !depth.ready
    ) {
      return {

        allowed:
          false,

        reason:
          depth.reason ||
          "ORDERBOOK UNAVAILABLE",

        depthSelection:
          depth,
      };
    }


    if (
      !depth
        .sufficientDepth
    ) {
      return {

        allowed:
          false,

        reason:
          "INSUFFICIENT VISIBLE ASK DEPTH",

        depthSelection:
          depth,

        quantity,
      };
    }


    if (
      depth.chasePct >
      PART5_CONFIG
        .maxEntryChasePct
    ) {
      return {

        allowed:
          false,

        reason:
          "ENTRY CHASE TOO HIGH",

        chasePct:
          depth.chasePct,

        quantity,
      };
    }


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
      Math.abs(
        nextEntry -
        entryPrice
      ) <
      1e-12
    ) {
      const feeEstimate =
        calculateTradeAfterFees({

          quantity,

          entryPrice,

          sellPrice,
        });


      if (
        feeEstimate
          .netProfit <=
        0
      ) {
        return {

          allowed:
            false,

          reason:
            "NET PROFIT NEGATIVE AFTER FEES",

          feeEstimate,
        };
      }


      return {

        allowed:
          true,

        mode:
          "CAPITAL",

        coin:
          candidate.coin,

        capitalMYR:
          capital,

        entryPrice,

        quantity,

        tp:
          sellPrice,

        tp2:
          candidate.tp2 ||
          null,

        sl:
          candidate.sl,

        projectedNetProfit:
          feeEstimate
            .netProfit,

        projectedNetProfitPct:
          feeEstimate
            .netProfitPct,

        feeEstimate,

        depthSelection:
          depth,

        confidence:
          candidate
            .confidence,

        score:
          candidate.score,

        setup:
          candidate.setup,

        createdAt:
          Date.now(),
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
   TARGET NET PROFIT ORDER PLAN

   Manual calculator flow.

   Still analysis only.
============================================================ */

async function buildTargetProfitOrderPlan({
  candidate,
  targetNetProfit,
}) {
  if (
    !candidate
      ?.allowed
  ) {
    return {

      allowed:
        false,

      reason:
        "CANDIDATE MISSING OR NOT ALLOWED",
    };
  }


  const target =
    safeNumber(
      targetNetProfit,
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
      candidate.entryPrice,
      0
    );


  const sellPrice =
    safeNumber(
      candidate.tp,
      0
    );


  if (
    entryPrice <=
      0 ||
    sellPrice <=
      entryPrice
  ) {
    return {

      allowed:
        false,

      reason:
        "INVALID ENTRY OR TP",
    };
  }


  for (
    let iteration =
      0;
    iteration <
      PART5_CONFIG
        .maxOrderPlanIterations;
    iteration++
  ) {
    let quantity =
      calculateQuantityForTargetProfit({

        entryPrice,

        sellPrice,

        targetNetProfit:
          target,

        maxQuantity:
          candidate.coin ===
            "GRT"
            ? PART5_CONFIG
                .maxGRTQuantity
            : Infinity,
      });


    quantity =
      floorTo(
        quantity,
        2
      );


    if (
      quantity <=
      0
    ) {
      return {

        allowed:
          false,

        reason:
          "TARGET PROFIT NOT PRACTICAL AFTER FEES",
      };
    }


    const depth =
      await chooseQuantityAwareLimitEntry({

        coin:
          candidate.coin,

        technicalEntry:
          candidate
            .technicalEntry,

        requiredQuantity:
          quantity,
      });


    if (
      !depth.ready ||
      !depth
        .sufficientDepth
    ) {
      return {

        allowed:
          false,

        reason:
          depth.reason ||
          "ORDERBOOK DEPTH UNAVAILABLE",

        depthSelection:
          depth,

        quantity,
      };
    }


    if (
      depth.chasePct >
      PART5_CONFIG
        .maxEntryChasePct
    ) {
      return {

        allowed:
          false,

        reason:
          "ENTRY CHASE TOO HIGH",

        chasePct:
          depth.chasePct,

        quantity,
      };
    }


    const nextEntry =
      safeNumber(
        depth.finalEntry,
        0
      );


    if (
      Math.abs(
        nextEntry -
        entryPrice
      ) <
      1e-12
    ) {
      const feeEstimate =
        calculateTradeAfterFees({

          quantity,

          entryPrice,

          sellPrice,
        });


      if (
        feeEstimate
          .netProfit <=
        0
      ) {
        return {

          allowed:
            false,

          reason:
            "NET PROFIT NEGATIVE AFTER FEES",

          feeEstimate,
        };
      }


      return {

        allowed:
          true,

        mode:
          "TARGET_PROFIT",

        coin:
          candidate.coin,

        targetNetProfit:
          target,

        entryPrice,

        quantity,

        tp:
          sellPrice,

        tp2:
          candidate.tp2 ||
          null,

        sl:
          candidate.sl,

        projectedNetProfit:
          feeEstimate
            .netProfit,

        projectedNetProfitPct:
          feeEstimate
            .netProfitPct,

        feeEstimate,

        depthSelection:
          depth,

        confidence:
          candidate
            .confidence,

        score:
          candidate.score,

        setup:
          candidate.setup,

        createdAt:
          Date.now(),
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
   CANONICAL FINAL ORDER PLAN

   Priority:
   1. capitalMYR
   2. targetNetProfit

   No order submission.
============================================================ */

async function buildFinalOrderPlan({
  candidate,
  capitalMYR =
    null,
  targetNetProfit =
    null,
}) {
  if (
    safeNumber(
      capitalMYR,
      0
    ) >
    0
  ) {
    return buildCapitalOrderPlan({

      candidate,

      capitalMYR,
    });
  }


  if (
    safeNumber(
      targetNetProfit,
      0
    ) >
    0
  ) {
    return buildTargetProfitOrderPlan({

      candidate,

      targetNetProfit,
    });
  }


  return {

    allowed:
      false,

    reason:
      "CAPITAL OR TARGET PROFIT REQUIRED",
  };
}


/* ============================================================
   END PART 5
============================================================ */
/* ============================================================
   PART 6 — ALTCOIN OPPORTUNITY SCANNER

   COINS: XRP / XLM / CRV / AAVE
   PURPOSE:
   - Scan practical altcoin scalping opportunities
   - Reuse canonical PART 2 / 3 / 5 helpers
   - No real BUY / SELL execution here
   - No alert when setup is not qualified
============================================================ */

const ALTCOIN_OPPORTUNITY_CONFIG = Object.freeze({
  minScore: 60,
  min15mMovePct: 0.15,
  minBuyVolumePct: 52,
  minBuyFrequencyPct: 48,
  hardSellVolumePct: 68,
  hardSellFrequencyPct: 60,
  minProfitRoomPct: 0.90,
  strongMomentum5mPct: 0.50,
  strongMomentum15mPct: 0.80,
  hardDrop5mPct: -0.50,
  hardDrop15mPct: -0.80,
  negativeResponsePct: -0.45,
  blockingResistanceRating: 8,
  blockingResistanceDistancePct: 0.50,
});


/* ============================================================
   ALTCOIN MOMENTUM CONTEXT
============================================================ */

function getAltcoinMomentumContext(
  coin,
  currentPrice
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const snapshot5m =
    getPriceSnapshot(
      normalized,
      FIVE_MINUTES
    );

  const snapshot15m =
    getPriceSnapshot(
      normalized,
      FIFTEEN_MINUTES
    );

  const snapshot60m =
    getPriceSnapshot(
      normalized,
      ONE_HOUR
    );

  const change5m =
    safeNumber(
      snapshot5m?.change,
      0
    );

  const change15m =
    safeNumber(
      snapshot15m?.change,
      0
    );

  const change60m =
    safeNumber(
      snapshot60m?.change,
      0
    );

  let direction =
    "SIDEWAY";

  if (
    change5m >=
      ALTCOIN_OPPORTUNITY_CONFIG
        .strongMomentum5mPct ||
    change15m >=
      ALTCOIN_OPPORTUNITY_CONFIG
        .strongMomentum15mPct
  ) {
    direction =
      "NAIK_KUAT";
  } else if (
    change5m >
      0 ||
    change15m >=
      ALTCOIN_OPPORTUNITY_CONFIG
        .min15mMovePct
  ) {
    direction =
      "NAIK";
  } else if (
    change5m <=
      ALTCOIN_OPPORTUNITY_CONFIG
        .hardDrop5mPct ||
    change15m <=
      ALTCOIN_OPPORTUNITY_CONFIG
        .hardDrop15mPct
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
    coin:
      normalized,

    currentPrice:
      safeNumber(
        currentPrice,
        0
      ),

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
  const normalized =
    normalizeCoin(
      coin
    );

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
      DEFAULT_BREAKOUT_TP_PCT?.[
        normalized
      ],
      2.0
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
      4.0
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
          priceResponse
            .changePct,
          0
        )
      : 0;

  const strongSellPressure =
    sellVolumePct >=
      ALTCOIN_OPPORTUNITY_CONFIG
        .hardSellVolumePct &&
    sellFrequencyPct >=
      ALTCOIN_OPPORTUNITY_CONFIG
        .hardSellFrequencyPct;

  const activePriceFailure =
    responsePct <=
    ALTCOIN_OPPORTUNITY_CONFIG
      .negativeResponsePct;

  const resistanceRating =
    getResistanceRating(
      structure
        ?.resistance ||
      null
    );

  const resistanceDistancePct =
    safeNumber(
      structure
        ?.resistance
        ?.distancePct,
      99
    );

  const resistanceBlocking =
    Boolean(
      structure
        ?.resistance &&
      resistanceRating >=
        ALTCOIN_OPPORTUNITY_CONFIG
          .blockingResistanceRating &&
      resistanceDistancePct <=
        ALTCOIN_OPPORTUNITY_CONFIG
          .blockingResistanceDistancePct
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

    sellVolumePct,

    sellFrequencyPct,

    responsePct,
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
      ALTCOIN_OPPORTUNITY_CONFIG
        .min15mMovePct
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
      ALTCOIN_OPPORTUNITY_CONFIG
        .minBuyVolumePct
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
      ALTCOIN_OPPORTUNITY_CONFIG
        .minBuyFrequencyPct
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
  } else if (
    responsePct <=
    -0.25
  ) {
    score -=
      4;
  }


  /* ========================================================
     2H CONTEXT
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
        structure
          .resistance
      );

    const distancePct =
      safeNumber(
        structure
          .resistance
          .distancePct,
        99
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
      distancePct <=
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
   ALTCOIN CONFIDENCE
============================================================ */

function getAltcoinConfidenceLabel(
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
   ALTCOIN SETUP LABEL
============================================================ */

function getAltcoinSetupLabel({
  momentum,
  flow,
}) {
  if (
    safeNumber(
      momentum
        ?.change5m,
      0
    ) >=
    0.50
  ) {
    return "FAST MOMENTUM";
  }

  if (
    safeNumber(
      momentum
        ?.change15m,
      0
    ) >=
    0.75
  ) {
    return "15M MOMENTUM";
  }

  if (
    safeNumber(
      flow
        ?.buyVolumePct,
      0
    ) >=
    65
  ) {
    return "STRONG BUY FLOW";
  }

  return "ALTCOIN MOMENTUM";
}


/* ============================================================
   ALTCOIN RISK LEVELS

   This is scanner planning only.
   It does NOT execute an order.
============================================================ */

function getAltcoinRiskLevels({
  entryPrice,
  tp1,
  tp2,
  score,
}) {
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

  let slPct =
    1.10;

  if (
    score >=
    78
  ) {
    slPct =
      0.90;
  } else if (
    score <
    65
  ) {
    slPct =
      1.25;
  }

  const sl =
    entry *
    (
      1 -
      slPct /
        100
    );

  const durationHours =
    score >=
      78
      ? 8
      : score >=
          65
        ? 6
        : 4;

  return {
    sl,

    slPct,

    tp1:
      safeNumber(
        tp1,
        0
      ) >
        entry
        ? tp1
        : null,

    tp2:
      safeNumber(
        tp2,
        0
      ) >
        entry
        ? tp2
        : null,

    durationHours,
  };
}


/* ============================================================
   BUILD ALTCOIN SCALPING CANDIDATE
============================================================ */

async function buildAltcoinScalpingCandidate(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  if (
    !ALTCOIN_SCALPING_COINS
      .includes(
        normalized
      )
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "INVALID ALTCOIN",
    };
  }


  /* ========================================================
     ACTIVE / PENDING PROTECTION
  ======================================================== */

  if (
    ACTIVE_TRADES[
      normalized
    ] ||
    PENDING_ENTRIES[
      normalized
    ]
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "TRADE OR ENTRY ALREADY ACTIVE",
    };
  }


  /* ========================================================
     CURRENT LUNO PRICE
  ======================================================== */

  const ticker =
    await getTicker(
      normalized
    );

  const currentPrice =
    safeNumber(
      ticker
        ?.currentPrice,
      0
    );

  if (
    !ticker ||
    currentPrice <=
      0
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "TICKER UNAVAILABLE",
    };
  }


  /* ========================================================
     MOMENTUM
  ======================================================== */

  const momentum =
    getAltcoinMomentumContext(
      normalized,
      currentPrice
    );


  /* ========================================================
     STRUCTURE + 2H
  ======================================================== */

  const [
    structure,
    twoHour,
  ] =
    await Promise.all([
      getExecutionStructureSnapshot(
        normalized,
        currentPrice
      ),

      analyze2HMarketCondition(
        normalized
      ),
    ]);

  if (
    !structure
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "STRUCTURE UNAVAILABLE",
    };
  }


  /* ========================================================
     EXECUTED FLOW + PRICE RESPONSE
  ======================================================== */

  const flow =
    structure
      .flow ||
    getExecutedFlowSummary(
      normalized,
      FIVE_MINUTES
    );

  const priceResponse =
    structure
      .priceResponse ||
    getExecutedPriceResponse(
      normalized,
      FIVE_MINUTES
    );

  if (
    !flow ||
    safeNumber(
      flow
        .totalCount,
      0
    ) <
      3
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "NOT ENOUGH EXECUTED FLOW",
    };
  }


  /* ========================================================
     HARD DANGER
  ======================================================== */

  const danger =
    getAltcoinHardDanger({
      flow,

      priceResponse,

      structure,
    });

  if (
    danger
      .blocked
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        danger
          .strongSellPressure
          ? "STRONG SELL PRESSURE"
          : danger
              .activePriceFailure
            ? "PRICE RESPONSE NEGATIVE"
            : "STRONG RESISTANCE BLOCKING",

      danger,
    };
  }


  /* ========================================================
     OPPORTUNITY SCORE
  ======================================================== */

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
    ALTCOIN_OPPORTUNITY_CONFIG
      .minScore
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "SCORE BELOW MINIMUM",

      score,
    };
  }


  /* ========================================================
     CURRENT POSITIVE EVIDENCE

     Prevent old 2H bullish context from creating
     an entry while current price is dead.
  ======================================================== */

  const currentPositive =
    Boolean(
      momentum
        .change5m >
        0 ||

      momentum
        .change15m >=
        ALTCOIN_OPPORTUNITY_CONFIG
          .min15mMovePct ||

      (
        safeNumber(
          flow
            .buyVolumePct,
          0
        ) >=
          ALTCOIN_OPPORTUNITY_CONFIG
            .minBuyVolumePct &&

        safeNumber(
          priceResponse
            ?.changePct,
          0
        ) >
          0
      )
    );

  if (
    !currentPositive
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "NO CURRENT UPWARD EVIDENCE",

      score,
    };
  }


  /* ========================================================
     PROJECTED TP
  ======================================================== */

  const projection =
    calculateAltcoinProjectedReach({
      coin:
        normalized,

      currentPrice,

      structure,

      score,
    });

  if (
    !projection ||
    safeNumber(
      projection
        .tp1,
      0
    ) <=
      currentPrice
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "TP PROJECTION UNAVAILABLE",

      score,
    };
  }


  /* ========================================================
     PRACTICAL ENTRY FROM ORDERBOOK
  ======================================================== */

  const depth =
    await chooseQuantityAwareLimitEntry({
      coin:
        normalized,

      technicalEntry:
        currentPrice,

      requiredQuantity:
        0,
    });

  const entryPrice =
    safeNumber(
      depth
        ?.finalEntry,
      currentPrice
    );

  const chasePct =
    safeNumber(
      depth
        ?.chasePct,
      0
    );

  if (
    entryPrice <=
    0
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "ENTRY PRICE UNAVAILABLE",

      score,
    };
  }

  if (
    chasePct >
    MAX_ENTRY_CHASE_PCT
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "ENTRY CHASE TOO HIGH",

      score,

      chasePct,
    };
  }


  /* ========================================================
     PROFIT ROOM
  ======================================================== */

  const grossRoomPct =
    percentChange(
      entryPrice,
      projection
        .tp1
    );

  if (
    grossRoomPct <
    ALTCOIN_OPPORTUNITY_CONFIG
      .minProfitRoomPct
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "PROFIT ROOM TOO SMALL",

      score,

      grossRoomPct,
    };
  }


  /* ========================================================
     FEE BREAK-EVEN PROTECTION
  ======================================================== */

  const breakEvenPrice =
    calculateBreakEvenPrice(
      entryPrice
    );

  if (
    !Number.isFinite(
      breakEvenPrice
    ) ||
    projection
      .tp1 <=
      breakEvenPrice
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "TP BELOW FEE BREAK-EVEN",

      score,

      grossRoomPct,

      breakEvenPrice,
    };
  }


  /* ========================================================
     CONFIDENCE + RISK
  ======================================================== */

  const confidence =
    getAltcoinConfidenceLabel(
      score
    );

  const risk =
    getAltcoinRiskLevels({
      entryPrice,

      tp1:
        projection
          .tp1,

      tp2:
        projection
          .tp2,

      score,
    });

  if (
    !risk
  ) {
    return {
      allowed:
        false,

      coin:
        normalized,

      reason:
        "RISK LEVELS UNAVAILABLE",

      score,
    };
  }


  /* ========================================================
     FINAL CANDIDATE
  ======================================================== */

  return {
    allowed:
      true,

    coin:
      normalized,

    score,

    confidence,

    setup:
      getAltcoinSetupLabel({
        momentum,

        flow,
      }),

    currentPrice,

    technicalEntry:
      currentPrice,

    preliminaryEntry:
      entryPrice,

    entryPrice,

    tp:
      projection
        .tp1,

    tp2:
      projection
        .tp2,

    tp2Confidence:
      projection
        .tp2
        ? (
            score >=
              78
              ? "MID"
              : "WEAK"
          )
        : null,

    tp2Requirement:
      projection
        .tp2
        ? "Momentum kekal positif dan resistance seterusnya tidak menahan harga."
        : null,

    sl:
      risk
        .sl,

    slPct:
      risk
        .slPct,

    durationHours:
      risk
        .durationHours,

    nextResistance:
      structure
        .resistance ||
      null,

    roomReason:
      "GENERIC ALTCOIN PROJECTED REACH",

    roomQuality:
      grossRoomPct >=
        2.0
        ? "STRONG"
        : "GOOD",

    grossRoomPct,

    breakEvenPrice,

    depthSelection:
      depth,

    projection,

    flow,

    priceResponse,

    structure,

    twoHour,

    momentum,

    createdAt:
      Date.now(),
  };
}


/* ============================================================
   SCAN ONE ALTCOIN
============================================================ */

async function scanSingleAltcoinOpportunity(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  try {
    const candidate =
      await buildAltcoinScalpingCandidate(
        normalized
      );

    if (
      !candidate
        .allowed
    ) {
      return {
        coin:
          normalized,

        found:
          false,

        reason:
          candidate
            .reason,

        score:
          candidate
            .score ??
          null,

        candidate,
      };
    }


    /* ======================================================
       QUALIFIED CANDIDATE

       sendScalpingEntry() belongs to PART 5.
       It handles pending-entry / cooldown protection.

       This does NOT submit a real Luno BUY.
    ====================================================== */

    const result =
      await sendScalpingEntry(
        candidate
      );

    return {
      coin:
        normalized,

      found:
        Boolean(
          result
            ?.sent
        ),

      reason:
        result
          ?.sent
          ? "OPPORTUNITY SENT"
          : result
              ?.reason ||
            "ENTRY NOT SENT",

      candidate,

      result,
    };
  } catch (
    error
  ) {
    console.log(
      `Altcoin scanner ${normalized} error:`,
      error.message
    );

    return {
      coin:
        normalized,

      found:
        false,

      reason:
        "SCANNER ERROR",

      error:
        error.message,
    };
  }
}


/* ============================================================
   RUN ALTCOIN SCALPING SCANNER

   Scheduler itself will be started in PART 10.

   RULE:
   - No setup = no Telegram alert
   - Qualified setup = sendScalpingEntry()
   - Sequential scan prevents request burst
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
        (
          item
        ) =>
          item
            .found
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
        opportunities
          .length,

      durationMs:
        ALTCOIN_SCANNER_RUNTIME
          .lastDurationMs,
    };
  } catch (
    error
  ) {
    ALTCOIN_SCANNER_RUNTIME
      .errors++;

    ALTCOIN_SCANNER_RUNTIME
      .lastCompletedAt =
      Date.now();

    ALTCOIN_SCANNER_RUNTIME
      .lastDurationMs =
      Date.now() -
      startedAt;

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
      [
        ...ALTCOIN_SCALPING_COINS,
      ],

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
   PART 7 — SEMI-AUTO EXECUTION + ACTIVE TRADE MONITOR
============================================================ */

const PART7_EXECUTION_CONFIG = Object.freeze({
  orderPollIntervalMs: 750,
  orderPollMaxAttempts: 16,
  orderTtlMs: 10000,
  activeTradeAlertCooldownMs: 5 * 60 * 1000,
  nearTpPct: 0.30,
  cautionLossPct: -0.60,
  tpExtensionPct: 1.00,
  sellIntentMaxAgeMs: 10 * 60 * 1000,
  entryIntentMaxAgeMs: 15 * 60 * 1000,
  reconciliationAttempts: 4,
  reconciliationDelayMs: 1200,
});

const PART7_EXECUTION_RUNTIME = {
  locks: {},
  buyIntents: {},
  sellIntents: {},
  lastOrder: null,
  lastError: null,
  monitorRunning: false,
  lastMonitorAt: null,
};

const PART7_ORDER_JOURNAL_FILE =
  process.env.PART7_ORDER_JOURNAL_FILE ||
  `${ACTIVE_TRADE_STATE_FILE}.orders.json`;

let PART7_ORDER_JOURNAL = {
  version: 1,
  updatedAt: null,
  entries: {},
};

function loadPart7OrderJournal() {
  try {
    if (!fs.existsSync(PART7_ORDER_JOURNAL_FILE)) {
      return PART7_ORDER_JOURNAL;
    }

    const raw =
      fs.readFileSync(
        PART7_ORDER_JOURNAL_FILE,
        "utf8"
      );

    const parsed =
      raw
        ? JSON.parse(raw)
        : null;

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      parsed.entries &&
      typeof parsed.entries ===
        "object" &&
      !Array.isArray(
        parsed.entries
      )
    ) {
      PART7_ORDER_JOURNAL = {
        version:
          1,

        updatedAt:
          safeNumber(
            parsed.updatedAt,
            0
          ) ||
          null,

        entries:
          parsed.entries,
      };
    }
  } catch (error) {
    PART7_EXECUTION_RUNTIME
      .lastError = {
        at:
          Date.now(),

        coin:
          null,

        side:
          "JOURNAL_LOAD",

        message:
          error?.message ||
          String(error),
      };
  }

  return PART7_ORDER_JOURNAL;
}

function savePart7OrderJournal() {
  try {
    PART7_ORDER_JOURNAL
      .updatedAt =
      Date.now();

    const tempFile =
      `${PART7_ORDER_JOURNAL_FILE}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(
        PART7_ORDER_JOURNAL,
        null,
        2
      ),
      "utf8"
    );

    fs.renameSync(
      tempFile,
      PART7_ORDER_JOURNAL_FILE
    );

    return true;
  } catch (error) {
    PART7_EXECUTION_RUNTIME
      .lastError = {
        at:
          Date.now(),

        coin:
          null,

        side:
          "JOURNAL_SAVE",

        message:
          error?.message ||
          String(error),
      };

    return false;
  }
}

function upsertPart7OrderJournalEntry(
  clientOrderId,
  patch = {}
) {
  if (!clientOrderId) {
    return null;
  }

  const current =
    PART7_ORDER_JOURNAL
      .entries[
        clientOrderId
      ] ||
    {};

  const entry = {
    ...current,
    ...patch,

    clientOrderId,

    createdAt:
      safeNumber(
        current.createdAt,
        0
      ) ||
      Date.now(),

    updatedAt:
      Date.now(),
  };

  PART7_ORDER_JOURNAL
    .entries[
      clientOrderId
    ] =
    entry;

  if (
    !savePart7OrderJournal()
  ) {
    return null;
  }

  return entry;
}

function getPart7OrderJournalEntry(
  clientOrderId
) {
  return clientOrderId
    ? PART7_ORDER_JOURNAL
        .entries[
          clientOrderId
        ] ||
        null
    : null;
}

function getPart7UnresolvedOrderJournalEntries() {
  return Object.values(
    PART7_ORDER_JOURNAL.entries
  ).filter(
    (entry) =>
      entry &&
      entry.resolved !==
        true
  );
}

function resolvePart7OrderJournalEntry(
  clientOrderId,
  status,
  patch = {}
) {
  return upsertPart7OrderJournalEntry(
    clientOrderId,
    {
      ...patch,

      status,

      resolved:
        true,

      resolvedAt:
        Date.now(),
    }
  );
}

loadPart7OrderJournal();

function getPart7ExecutionKey(
  chatId,
  coin,
  side
) {
  return `${String(
    chatId
  )}:${normalizeCoin(
    coin
  )}:${String(
    side
  ).toUpperCase()}`;
}

function isPart7ExecutionLocked(
  chatId,
  coin,
  side
) {
  const key =
    getPart7ExecutionKey(
      chatId,
      coin,
      side
    );

  const lockedAt =
    safeNumber(
      PART7_EXECUTION_RUNTIME
        .locks[
          key
        ],
      0
    );

  if (!lockedAt) {
    return false;
  }

  if (
    Date.now() -
      lockedAt >
    EXECUTION_LOCK_TIMEOUT_MS
  ) {
    delete PART7_EXECUTION_RUNTIME
      .locks[
        key
      ];

    return false;
  }

  return true;
}

function setPart7ExecutionLock(
  chatId,
  coin,
  side,
  locked
) {
  const key =
    getPart7ExecutionKey(
      chatId,
      coin,
      side
    );

  if (locked) {
    PART7_EXECUTION_RUNTIME
      .locks[
        key
      ] =
      Date.now();
  } else {
    delete PART7_EXECUTION_RUNTIME
      .locks[
        key
      ];
  }
}

function createPart7IntentToken(
  prefix,
  coin
) {
  return createClientOrderId(
    `${prefix}-${normalizeCoin(
      coin
    )}`
  );
}

function floorPart7(
  value,
  decimals = 8
) {
  const number =
    safeNumber(
      value,
      0
    );

  const digits =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          decimals,
          8
        )
      )
    );

  const factor =
    10 **
    digits;

  return (
    Math.floor(
      number *
      factor
    ) /
    factor
  );
}

async function part7TradeRequest(
  method,
  endpoint,
  data = null,
  params = null
) {
  const auth =
    getLunoTradeAuth();

  if (!auth) {
    throw new Error(
      "LUNO TRADE API KEY NOT CONFIGURED"
    );
  }

  const response =
    await axios({
      method,

      url:
        `${LUNO_API_BASE_URL}${endpoint}`,

      auth,

      data:
        data ||
        undefined,

      params:
        params ||
        undefined,

      timeout:
        15000,

      headers:
        data
          ? {
              "Content-Type":
                "application/x-www-form-urlencoded",
            }
          : undefined,

      transformRequest:
        data
          ? [
              (payload) =>
                new URLSearchParams(
                  Object.entries(
                    payload
                  ).filter(
                    (
                      [
                        ,
                        value,
                      ]
                    ) =>
                      value !==
                        undefined &&
                      value !==
                        null
                  )
                ).toString(),
            ]
          : undefined,
    });

  return (
    response?.data ||
    null
  );
}

async function getPart7TradeBalances() {
  const data =
    await part7TradeRequest(
      "GET",
      "/api/1/balance"
    );

  return Array.isArray(
    data?.balance
  )
    ? data.balance
    : [];
}

function getPart7AvailableBalance(
  balances,
  asset
) {
  const target =
    String(
      asset ||
      ""
    ).toUpperCase();

  const row =
    (
      balances ||
      []
    ).find(
      (item) =>
        String(
          item?.asset ||
          ""
        ).toUpperCase() ===
        target
    );

  return (
    safeNumber(
      row?.balance,
      0
    ) -
    safeNumber(
      row?.reserved,
      0
    )
  );
}

async function getPart7Order(
  orderId
) {
  if (!orderId) {
    throw new Error(
      "ORDER ID REQUIRED"
    );
  }

  return part7TradeRequest(
    "GET",
    `/api/1/orders/${encodeURIComponent(
      String(orderId)
    )}`
  );
}

async function getPart7OrderByClientOrderId(
  clientOrderId
) {
  if (!clientOrderId) {
    throw new Error(
      "CLIENT ORDER ID REQUIRED"
    );
  }

  return part7TradeRequest(
    "GET",
    "/api/exchange/3/order",
    null,
    {
      client_order_id:
        clientOrderId,
    }
  );
}

async function reconcilePart7SubmittedOrder({
  orderId = null,
  clientOrderId = null,
}) {
  let lastError =
    null;

  for (
    let attempt = 0;
    attempt <
    PART7_EXECUTION_CONFIG
      .reconciliationAttempts;
    attempt++
  ) {
    try {
      if (orderId) {
        const byId =
          await getPart7Order(
            orderId
          );

        if (byId) {
          return {
            found:
              true,

            order:
              byId,
          };
        }
      }
    } catch (error) {
      lastError =
        error;
    }

    try {
      if (clientOrderId) {
        const byClientId =
          await getPart7OrderByClientOrderId(
            clientOrderId
          );

        if (byClientId) {
          return {
            found:
              true,

            order:
              byClientId,
          };
        }
      }
    } catch (error) {
      lastError =
        error;
    }

    if (
      attempt +
        1 <
      PART7_EXECUTION_CONFIG
        .reconciliationAttempts
    ) {
      await sleep(
        PART7_EXECUTION_CONFIG
          .reconciliationDelayMs
      );
    }
  }

  return {
    found:
      false,

    order:
      null,

    error:
      lastError?.message ||
      null,
  };
}

function assertPart7RealExecutionAllowed(
  chatId
) {
  if (
    !SEMI_AUTO_EXECUTION_ENABLED
  ) {
    return {
      allowed:
        false,

      reason:
        "REAL EXECUTION DISABLED",
    };
  }

  if (
    !REQUIRE_CONFIRMATION_EVERY_REAL_ORDER
  ) {
    return {
      allowed:
        false,

      reason:
        "CONFIRMATION SAFETY FLAG INVALID",
    };
  }

  if (
    String(
      chatId
    ) !==
    String(
      CHAT_ID
    )
  ) {
    return {
      allowed:
        false,

      reason:
        "UNAUTHORIZED TELEGRAM CHAT",
    };
  }

  if (
    !LUNO_API_STATUS
      .tradeReady
  ) {
    return {
      allowed:
        false,

      reason:
        "LUNO TRADE API NOT READY",
    };
  }

  return {
    allowed:
      true,

    reason:
      null,
  };
}

function persistPart7ActiveTradeStateNow() {
  try {
    if (
      typeof savePart10ActiveTradeState ===
      "function"
    ) {
      return Boolean(
        savePart10ActiveTradeState()
      );
    }
  } catch (error) {
    PART7_EXECUTION_RUNTIME
      .lastError = {
        at:
          Date.now(),

        coin:
          null,

        side:
          "PERSIST",

        message:
          error?.message ||
          String(error),
      };
  }

  return false;
}

function isPart7FinalOrderState(
  state
) {
  const value =
    String(
      state ||
      ""
    ).toUpperCase();

  return [
    "COMPLETE",
    "COMPLETED",
    "CANCELLED",
    "CANCELED",
    "FAILED",
  ].includes(
    value
  );
}

function isPart7SuccessfulOrderState(
  state
) {
  return [
    "COMPLETE",
    "COMPLETED",
  ].includes(
    String(
      state ||
      ""
    ).toUpperCase()
  );
}

async function waitForPart7OrderFinal(
  orderId
) {
  let last =
    null;

  for (
    let attempt = 0;
    attempt <
    PART7_EXECUTION_CONFIG
      .orderPollMaxAttempts;
    attempt++
  ) {
    last =
      await getPart7Order(
        orderId
      );

    const state =
      String(
        last?.state ||
        last?.status ||
        ""
      ).toUpperCase();

    if (
      isPart7FinalOrderState(
        state
      )
    ) {
      return last;
    }

    await sleep(
      PART7_EXECUTION_CONFIG
        .orderPollIntervalMs
    );
  }

  return last;
}

function normalizePart7Execution(
  order,
  fallback = {}
) {
  const base =
    safeNumber(
      order?.base,
      0
    );

  const counter =
    safeNumber(
      order?.counter,
      0
    );

  const feeBase =
    safeNumber(
      order?.fee_base,
      0
    );

  const feeCounter =
    safeNumber(
      order?.fee_counter,
      0
    );

  const averagePrice =
    base >
      0 &&
    counter >
      0
      ? counter /
        base
      : safeNumber(
          fallback.price,
          0
        );

  return {
    orderId:
      order?.order_id ||
      fallback.orderId ||
      null,

    clientOrderId:
      order?.client_order_id ||
      fallback.clientOrderId ||
      null,

    state:
      String(
        order?.state ||
        order?.status ||
        "UNKNOWN"
      ).toUpperCase(),

    pair:
      order?.pair ||
      fallback.pair ||
      null,

    side:
      String(
        order?.side ||
        order?.type ||
        fallback.side ||
        ""
      ).toUpperCase(),

    base,
    counter,
    feeBase,
    feeCounter,
    averagePrice,

    completedTimestamp:
      safeNumber(
        order?.completed_timestamp,
        0
      ) ||
      null,

    raw:
      order ||
      null,
  };
}

function sendScalpingEntry(
  candidate
) {
  if (
    !candidate?.allowed ||
    !candidate?.coin
  ) {
    return Promise.resolve({
      sent:
        false,

      reason:
        "INVALID CANDIDATE",
    });
  }

  const coin =
    normalizeCoin(
      candidate.coin
    );

  if (
    ACTIVE_TRADES[
      coin
    ] ||
    PENDING_ENTRIES[
      coin
    ]
  ) {
    return Promise.resolve({
      sent:
        false,

      reason:
        "TRADE OR ENTRY ALREADY ACTIVE",
    });
  }

  const token =
    createPart7IntentToken(
      "ENTRY",
      coin
    );

  const pending = {
    ...candidate,

    coin,

    pendingToken:
      token,

    status:
      "PENDING_USER_ACTION",

    source:
      candidate.source ||
      (
        coin ===
          "GRT"
          ? "GRT_SCALPING"
          : "ALTCOIN_SCANNER"
      ),

    pendingAt:
      Date.now(),
  };

  PENDING_ENTRIES[
    coin
  ] =
    pending;

  const text =
`🚀 SCALPING ENTRY

🪙 ${coin}
📐 Entry: ${formatMYR(
  candidate.entryPrice ||
  candidate.preliminaryEntry
)}
🎯 TP1: ${formatMYR(
  candidate.tp
)}${candidate.tp2
  ? `\n🎯 TP2: ${formatMYR(
      candidate.tp2
    )}`
  : ""}
🛑 SL: ${formatMYR(
  candidate.sl
)}
⭐ Score: ${safeNumber(
  candidate.score,
  0
)}/100
📊 Confidence: ${candidate.confidence || "N/A"}
🧠 Setup: ${candidate.setup || "N/A"}

⚠️ Ini cadangan sahaja.
Real BUY hanya selepas confirmation Telegram.`;

  return sendTelegram(
    text,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "▶️ START ENTRY",

              callback_data:
                `START_ENTRY:${coin}:${token}`,
            },

            {
              text:
                "❌ SKIP",

              callback_data:
                `SKIP_ENTRY:${coin}:${token}`,
            },
          ],
        ],
      },
    }
  )
    .then(
      (sent) => {
        if (!sent) {
          delete PENDING_ENTRIES[
            coin
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

          candidate:
            pending,

          message:
            text,
        };
      }
    )
    .catch(
      (error) => {
        delete PENDING_ENTRIES[
          coin
        ];

        return {
          sent:
            false,

          reason:
            error?.message ||
            "TELEGRAM SEND FAILED",
        };
      }
    );
}

function getPendingScalpingEntry(
  coin,
  token = null
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const pending =
    PENDING_ENTRIES[
      normalized
    ] ||
    null;

  if (!pending) {
    return {
      valid:
        false,

      reason:
        "ENTRY NO LONGER AVAILABLE",

      candidate:
        null,
    };
  }

  if (
    token &&
    pending.pendingToken &&
    token !==
      pending.pendingToken
  ) {
    return {
      valid:
        false,

      reason:
        "STALE ENTRY BUTTON",

      candidate:
        null,
    };
  }

  if (
    Date.now() -
      safeNumber(
        pending.pendingAt,
        0
      ) >
    PART7_EXECUTION_CONFIG
      .entryIntentMaxAgeMs
  ) {
    delete PENDING_ENTRIES[
      normalized
    ];

    return {
      valid:
        false,

      reason:
        "ENTRY EXPIRED",

      candidate:
        null,
    };
  }

  if (
    ACTIVE_TRADES[
      normalized
    ]
  ) {
    return {
      valid:
        false,

      reason:
        "TRADE ALREADY ACTIVE",

      candidate:
        pending,
    };
  }

  return {
    valid:
      true,

    reason:
      null,

    candidate:
      pending,
  };
}

function clearPendingScalpingEntry(
  coin,
  token = null
) {
  const checked =
    getPendingScalpingEntry(
      coin,
      token
    );

  if (
    !checked.valid &&
    checked.reason !==
      "ENTRY EXPIRED"
  ) {
    return {
      cleared:
        false,

      reason:
        checked.reason,
    };
  }

  delete PENDING_ENTRIES[
    normalizeCoin(
      coin
    )
  ];

  return {
    cleared:
      true,

    coin:
      normalizeCoin(
        coin
      ),
  };
}

function prepareConfirmedBuyIntent({
  chatId,
  coin,
  token,
  capital,
  orderPlan = null,
}) {
  const checked =
    getPendingScalpingEntry(
      coin,
      token
    );

  if (!checked.valid) {
    return {
      ready:
        false,

      reason:
        checked.reason,
    };
  }

  const spend =
    safeNumber(
      capital,
      0
    );

  if (
    spend <=
      0
  ) {
    return {
      ready:
        false,

      reason:
        "INVALID CAPITAL",
    };
  }

  const normalized =
    normalizeCoin(
      coin
    );

  const intentToken =
    createPart7IntentToken(
      "BUY",
      normalized
    );

  const intent = {
    intentToken,

    chatId:
      String(
        chatId
      ),

    coin:
      normalized,

    capital:
      spend,

    candidate:
      checked.candidate,

    orderPlan,

    createdAt:
      Date.now(),

    consumed:
      false,
  };

  PART7_EXECUTION_RUNTIME
    .buyIntents[
      intentToken
    ] =
    intent;

  return {
    ready:
      true,

    intent,
  };
}

function getValidBuyIntent(
  intentToken,
  chatId
) {
  const intent =
    PART7_EXECUTION_RUNTIME
      .buyIntents[
        intentToken
      ];

  if (!intent) {
    return {
      valid:
        false,

      reason:
        "BUY CONFIRMATION STALE",
    };
  }

  if (
    intent.consumed
  ) {
    return {
      valid:
        false,

      reason:
        "BUY ALREADY USED",
    };
  }

  if (
    String(
      intent.chatId
    ) !==
    String(
      chatId
    )
  ) {
    return {
      valid:
        false,

      reason:
        "BUY CHAT MISMATCH",
    };
  }

  if (
    Date.now() -
      intent.createdAt >
    PART7_EXECUTION_CONFIG
      .entryIntentMaxAgeMs
  ) {
    delete PART7_EXECUTION_RUNTIME
      .buyIntents[
        intentToken
      ];

    return {
      valid:
        false,

      reason:
        "BUY CONFIRMATION EXPIRED",
    };
  }

  if (
    ACTIVE_TRADES[
      intent.coin
    ]
  ) {
    return {
      valid:
        false,

      reason:
        "TRADE ALREADY ACTIVE",
    };
  }

  return {
    valid:
      true,

    intent,
  };
}

async function submitConfirmedLunoMarketBuy({
  chatId,
  intentToken,
}) {
  const safety =
    assertPart7RealExecutionAllowed(
      chatId
    );

  if (!safety.allowed) {
    return {
      ok:
        false,

      reason:
        safety.reason,
    };
  }

  const checked =
    getValidBuyIntent(
      intentToken,
      chatId
    );

  if (!checked.valid) {
    return {
      ok:
        false,

      reason:
        checked.reason,
    };
  }

  const intent =
    checked.intent;

  const coin =
    intent.coin;

  const side =
    "BUY";

  if (
    isPart7ExecutionLocked(
      chatId,
      coin,
      side
    )
  ) {
    return {
      ok:
        false,

      reason:
        "BUY ALREADY SUBMITTING",
    };
  }

  setPart7ExecutionLock(
    chatId,
    coin,
    side,
    true
  );

  intent.consumed =
    true;

  let submissionAttempted =
    false;

  let clientOrderId =
    null;

  let orderId =
    null;

  let pair =
    null;

  const finalizeFilledBuy = (
    execution,
    recovered = false
  ) => {
    const active =
      createActiveTradeFromMatchedOrder({
        intent,
        execution,
      });

    if (!active.created) {
      throw new Error(
        active.reason ||
        "ACTIVE TRADE CREATION FAILED AFTER CONFIRMED BUY"
      );
    }

    delete PENDING_ENTRIES[
      coin
    ];

    delete PART7_EXECUTION_RUNTIME
      .buyIntents[
        intentToken
      ];

    PART7_EXECUTION_RUNTIME
      .lastOrder = {
        at:
          Date.now(),

        coin,

        side,

        execution,
      };

    PART7_EXECUTION_RUNTIME
      .lastError =
      null;

    resolvePart7OrderJournalEntry(
      execution.clientOrderId ||
      clientOrderId,
      "BUY_FILLED",
      {
        orderId:
          execution.orderId ||
          orderId,

        orderState:
          execution.state,

        execution,

        activeTradeCreated:
          true,
      }
    );

    persistPart7ActiveTradeStateNow();

    return {
      ok:
        true,

      recovered,

      execution,

      trade:
        active.trade,
    };
  };

  try {
    const balances =
      await getPart7TradeBalances();

    const availableMYR =
      getPart7AvailableBalance(
        balances,
        "MYR"
      );

    if (
      availableMYR +
        1e-9 <
      intent.capital
    ) {
      intent.consumed =
        false;

      throw new Error(
        `INSUFFICIENT MYR BALANCE — AVAILABLE RM${availableMYR.toFixed(
          2
        )}`
      );
    }

    pair =
      getPair(
        coin
      );

    clientOrderId =
      createClientOrderId(
        `BUY-${coin}`
      );

    const journalPrepared =
      upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "PREPARED",

          resolved:
            false,

          side,

          coin,

          pair,

          chatId:
            String(
              chatId
            ),

          intentToken,

          capitalMYR:
            intent.capital,

          orderId:
            null,

          submissionAttempted:
            false,
        }
      );

    if (!journalPrepared) {
      intent.consumed =
        false;

      throw new Error(
        "ORDER JOURNAL WRITE FAILED — BUY NOT SUBMITTED"
      );
    }

    submissionAttempted =
      true;

    if (
      !upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "SUBMITTING",

          resolved:
            false,

          submissionAttempted:
            true,

          submittedAt:
            Date.now(),
        }
      )
    ) {
      submissionAttempted =
        false;

      intent.consumed =
        false;

      throw new Error(
        "ORDER JOURNAL WRITE FAILED — BUY NOT SUBMITTED"
      );
    }

    const posted =
      await part7TradeRequest(
        "POST",
        "/api/1/marketorder",
        {
          pair,

          type:
            "BUY",

          counter_volume:
            intent.capital.toFixed(
              2
            ),

          timestamp:
            Date.now(),

          ttl:
            PART7_EXECUTION_CONFIG
              .orderTtlMs,

          client_order_id:
            clientOrderId,
        }
      );

    orderId =
      posted?.order_id ||
      null;

    upsertPart7OrderJournalEntry(
      clientOrderId,
      {
        status:
          orderId
            ? "ACCEPTED"
            : "ACCEPTANCE_UNKNOWN",

        orderId,

        acceptedAt:
          Date.now(),
      }
    );

    if (!orderId) {
      throw new Error(
        "LUNO BUY ACCEPTANCE STATUS UNKNOWN"
      );
    }

    let finalOrder =
      null;

    try {
      finalOrder =
        await waitForPart7OrderFinal(
          orderId
        );
    } catch (pollError) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (!reconciled.found) {
        throw new Error(
          `BUY STATUS UNKNOWN — DO NOT RETRY CONFIRMATION — ${pollError.message}`
        );
      }

      finalOrder =
        reconciled.order;
    }

    let execution =
      normalizePart7Execution(
        finalOrder,
        {
          orderId,
          clientOrderId,
          pair,
          side,
        }
      );

    if (
      !isPart7SuccessfulOrderState(
        execution.state
      ) ||
      execution.base <=
        0 ||
      execution.averagePrice <=
        0
    ) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (
        reconciled.found
      ) {
        execution =
          normalizePart7Execution(
            reconciled.order,
            {
              orderId,
              clientOrderId,
              pair,
              side,
            }
          );
      }
    }

    if (
      !isPart7SuccessfulOrderState(
        execution.state
      ) ||
      execution.base <=
        0 ||
      execution.averagePrice <=
        0
    ) {
      if (
        isPart7FinalOrderState(
          execution.state
        )
      ) {
        resolvePart7OrderJournalEntry(
          clientOrderId,
          "BUY_FINAL_NOT_FILLED",
          {
            orderId:
              execution.orderId ||
              orderId,

            orderState:
              execution.state,

            execution,
          }
        );
      } else {
        upsertPart7OrderJournalEntry(
          clientOrderId,
          {
            status:
              "BUY_UNRESOLVED",

            resolved:
              false,

            orderId:
              execution.orderId ||
              orderId,

            orderState:
              execution.state,

            execution,
          }
        );
      }

      throw new Error(
        `BUY NOT CONFIRMED FILLED — STATE ${execution.state} — DO NOT RETRY UNTIL ORDER IS CHECKED`
      );
    }

    return finalizeFilledBuy(
      execution,
      false
    );
  } catch (error) {
    if (
      submissionAttempted &&
      clientOrderId
    ) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (
        reconciled.found
      ) {
        const execution =
          normalizePart7Execution(
            reconciled.order,
            {
              orderId,
              clientOrderId,
              pair,
              side,
            }
          );

        orderId =
          execution.orderId ||
          orderId;

        if (
          isPart7SuccessfulOrderState(
            execution.state
          ) &&
          execution.base >
            0 &&
          execution.averagePrice >
            0
        ) {
          try {
            return finalizeFilledBuy(
              execution,
              true
            );
          } catch (finalizeError) {
            upsertPart7OrderJournalEntry(
              clientOrderId,
              {
                status:
                  "BUY_FILLED_LOCAL_STATE_PENDING",

                resolved:
                  false,

                orderId,

                orderState:
                  execution.state,

                execution,

                lastError:
                  finalizeError.message,
              }
            );

            PART7_EXECUTION_RUNTIME
              .lastError = {
                at:
                  Date.now(),

                coin,

                side,

                clientOrderId,

                orderId,

                submissionAttempted:
                  true,

                message:
                  finalizeError.message,
              };

            return {
              ok:
                false,

              ambiguous:
                true,

              clientOrderId,

              orderId,

              reason:
                "BUY FILLED AT LUNO BUT LOCAL POSITION RECOVERY IS PENDING — DO NOT BUY AGAIN",
            };
          }
        }

        if (
          isPart7FinalOrderState(
            execution.state
          )
        ) {
          resolvePart7OrderJournalEntry(
            clientOrderId,
            "BUY_FINAL_NOT_FILLED",
            {
              orderId,

              orderState:
                execution.state,

              execution,

              lastError:
                error?.message ||
                String(error),
            }
          );

          delete PART7_EXECUTION_RUNTIME
            .buyIntents[
              intentToken
            ];

          return {
            ok:
              false,

            ambiguous:
              false,

            clientOrderId,

            orderId,

            reason:
              `BUY NOT FILLED — STATE ${execution.state}`,
          };
        }
      }

      upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "BUY_AMBIGUOUS",

          resolved:
            false,

          orderId,

          lastError:
            error?.message ||
            String(error),
        }
      );
    } else {
      intent.consumed =
        false;
    }

    PART7_EXECUTION_RUNTIME
      .lastError = {
        at:
          Date.now(),

        coin,

        side,

        clientOrderId,

        orderId,

        submissionAttempted,

        message:
          error?.message ||
          String(error),
      };

    return {
      ok:
        false,

      ambiguous:
        submissionAttempted,

      clientOrderId,

      orderId,

      reason:
        error?.message ||
        String(error),
    };
  } finally {
    setPart7ExecutionLock(
      chatId,
      coin,
      side,
      false
    );
  }
}

function createActiveTradeFromMatchedOrder({
  intent,
  execution,
}) {
  if (
    !intent?.candidate ||
    !execution
  ) {
    return {
      created:
        false,

      reason:
        "INVALID MATCHED ORDER",
    };
  }

  const candidate =
    intent.candidate;

  const coin =
    normalizeCoin(
      intent.coin ||
      candidate.coin
    );

  if (
    ACTIVE_TRADES[
      coin
    ]
  ) {
    return {
      created:
        false,

      reason:
        "ACTIVE TRADE ALREADY EXISTS",
    };
  }

  const grossQuantity =
    safeNumber(
      execution.base,
      0
    );

  const feeBase =
    safeNumber(
      execution.feeBase,
      0
    );

  const netQuantity =
    Math.max(
      0,
      grossQuantity -
      feeBase
    );

  const entryPrice =
    safeNumber(
      execution.averagePrice,
      0
    );

  if (
    netQuantity <=
      0 ||
    entryPrice <=
      0
  ) {
    return {
      created:
        false,

      reason:
        "INVALID FILLED BUY",
    };
  }

  const tp1 =
    safeNumber(
      intent.orderPlan?.tp ||
      candidate.tp,
      0
    );

  const tp2 =
    safeNumber(
      intent.orderPlan?.tp2 ||
      candidate.tp2,
      0
    ) ||
    null;

  const sl =
    safeNumber(
      intent.orderPlan?.sl ||
      candidate.sl,
      0
    );

  const trade = {
    coin,

    status:
      "ACTIVE",

    source:
      candidate.source ||
      "SEMI_AUTO",

    openedAt:
      Date.now(),

    buyOrderId:
      execution.orderId,

    buyClientOrderId:
      execution.clientOrderId,

    buyState:
      execution.state,

    grossQuantity,

    buyFeeBase:
      feeBase,

    buyFeeCounter:
      safeNumber(
        execution.feeCounter,
        0
      ),

    quantity:
      netQuantity,

    entryPrice,

    capitalSpent:
      safeNumber(
        execution.counter,
        intent.capital
      ),

    tp:
      tp1,

    tp2,

    sl,

    originalTp:
      tp1,

    extensionReferencePrice:
      tp1,

    extensionCount:
      0,

    tp1Hit:
      false,

    tp2Hit:
      false,

    sellIntentToken:
      null,

    lastSellSignalAt:
      null,

    lastAlertAt:
      0,

    lastAlertType:
      null,

    highestPrice:
      entryPrice,

    lowestPrice:
      entryPrice,

    candidate,

    orderPlan:
      intent.orderPlan ||
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

function calculateActiveTradeNetSnapshot(
  trade,
  currentPrice
) {
  const price =
    safeNumber(
      currentPrice,
      0
    );

  const quantity =
    safeNumber(
      trade?.quantity,
      0
    );

  const entryPrice =
    safeNumber(
      trade?.entryPrice,
      0
    );

  if (
    price <=
      0 ||
    quantity <=
      0 ||
    entryPrice <=
      0
  ) {
    return null;
  }

  const estimated =
    calculateTradeAfterFees({
      quantity,

      entryPrice,

      sellPrice:
        price,
    });

  return {
    currentPrice:
      price,

    quantity,

    entryPrice,

    grossChangePct:
      percentChange(
        entryPrice,
        price
      ),

    estimatedNetProfit:
      safeNumber(
        estimated?.netProfit,
        0
      ),

    estimatedNetProfitPct:
      safeNumber(
        estimated?.netProfitPct,
        0
      ),

    feeEstimate:
      estimated,
  };
}

function createSellIntent(
  trade,
  reason,
  referencePrice,
  chatId = CHAT_ID
) {
  const coin =
    normalizeCoin(
      trade.coin
    );

  const token =
    createPart7IntentToken(
      "SELL",
      coin
    );

  if (
    trade.sellIntentToken
  ) {
    delete PART7_EXECUTION_RUNTIME
      .sellIntents[
        trade.sellIntentToken
      ];
  }

  const intent = {
    intentToken:
      token,

    chatId:
      String(
        chatId
      ),

    coin,

    reason,

    referencePrice:
      safeNumber(
        referencePrice,
        0
      ),

    quantity:
      safeNumber(
        trade.quantity,
        0
      ),

    createdAt:
      Date.now(),

    consumed:
      false,
  };

  PART7_EXECUTION_RUNTIME
    .sellIntents[
      token
    ] =
    intent;

  trade.sellIntentToken =
    token;

  trade.lastSellSignalAt =
    Date.now();

  persistPart7ActiveTradeStateNow();

  return intent;
}

function invalidateSellIntent(
  trade,
  reason =
    "SELL INTENT INVALIDATED"
) {
  if (!trade) {
    return;
  }

  const token =
    trade.sellIntentToken;

  if (token) {
    delete PART7_EXECUTION_RUNTIME
      .sellIntents[
        token
      ];
  }

  trade.sellIntentToken =
    null;

  trade.sellIntentInvalidatedAt =
    Date.now();

  trade.sellIntentInvalidatedReason =
    reason;
}

function getValidSellIntent(
  intentToken,
  coin,
  chatId = CHAT_ID
) {
  const intent =
    PART7_EXECUTION_RUNTIME
      .sellIntents[
        intentToken
      ];

  const normalized =
    normalizeCoin(
      coin ||
      intent?.coin
    );

  const trade =
    ACTIVE_TRADES[
      normalized
    ];

  if (!intent) {
    return {
      valid:
        false,

      reason:
        "SELL CONFIRMATION STALE",
    };
  }

  if (
    String(
      intent.chatId
    ) !==
    String(
      chatId
    )
  ) {
    return {
      valid:
        false,

      reason:
        "SELL CHAT MISMATCH",
    };
  }

  if (!trade) {
    return {
      valid:
        false,

      reason:
        "POSITION NO LONGER ACTIVE",
    };
  }

  if (
    intent.consumed
  ) {
    return {
      valid:
        false,

      reason:
        "SELL ALREADY USED",
    };
  }

  if (
    trade.sellIntentToken !==
    intentToken
  ) {
    return {
      valid:
        false,

      reason:
        "STALE SELL BUTTON",
    };
  }

  if (
    Date.now() -
      intent.createdAt >
    PART7_EXECUTION_CONFIG
      .sellIntentMaxAgeMs
  ) {
    invalidateSellIntent(
      trade,
      "SELL CONFIRMATION EXPIRED"
    );

    return {
      valid:
        false,

      reason:
        "SELL CONFIRMATION EXPIRED",
    };
  }

  return {
    valid:
      true,

    intent,

    trade,
  };
}

async function submitConfirmedLunoMarketSell({
  chatId,
  coin,
  intentToken,
}) {
  const safety =
    assertPart7RealExecutionAllowed(
      chatId
    );

  if (!safety.allowed) {
    return {
      ok:
        false,

      reason:
        safety.reason,
    };
  }

  const checked =
    getValidSellIntent(
      intentToken,
      coin,
      chatId
    );

  if (!checked.valid) {
    return {
      ok:
        false,

      reason:
        checked.reason,
    };
  }

  const {
    intent,
    trade,
  } =
    checked;

  const normalized =
    normalizeCoin(
      trade.coin
    );

  const side =
    "SELL";

  if (
    isPart7ExecutionLocked(
      chatId,
      normalized,
      side
    )
  ) {
    return {
      ok:
        false,

      reason:
        "SELL ALREADY SUBMITTING",
    };
  }

  setPart7ExecutionLock(
    chatId,
    normalized,
    side,
    true
  );

  intent.consumed =
    true;

  let submissionAttempted =
    false;

  let clientOrderId =
    null;

  let orderId =
    null;

  let pair =
    null;

  let requestedSellQuantity =
    0;

  const finalizeFilledSell = (
    execution,
    recovered = false
  ) => {
    const closeResult =
      closeActiveTradeFromMatchedSell({
        trade,

        execution,

        reason:
          intent.reason,
      });

    if (
      !closeResult.closed &&
      !closeResult.partial
    ) {
      throw new Error(
        closeResult.reason ||
        "TRADE CLOSE FAILED"
      );
    }

    delete PART7_EXECUTION_RUNTIME
      .sellIntents[
        intentToken
      ];

    PART7_EXECUTION_RUNTIME
      .lastOrder = {
        at:
          Date.now(),

        coin:
          normalized,

        side,

        execution,
      };

    PART7_EXECUTION_RUNTIME
      .lastError =
      null;

    resolvePart7OrderJournalEntry(
      execution.clientOrderId ||
      clientOrderId,
      closeResult.partial
        ? "SELL_PARTIAL_FILLED"
        : "SELL_FILLED",
      {
        orderId:
          execution.orderId ||
          orderId,

        orderState:
          execution.state,

        execution,

        partial:
          Boolean(
            closeResult.partial
          ),

        remainingQuantity:
          safeNumber(
            closeResult.trade
              ?.quantity,
            0
          ),
      }
    );

    persistPart7ActiveTradeStateNow();

    return {
      ok:
        true,

      recovered,

      execution,

      partial:
        Boolean(
          closeResult.partial
        ),

      closedTrade:
        closeResult.closedTrade ||
        null,

      trade:
        closeResult.trade ||
        null,
    };
  };

  try {
    const balances =
      await getPart7TradeBalances();

    const available =
      getPart7AvailableBalance(
        balances,
        normalized
      );

    const sellable =
      floorPart7(
        Math.min(
          safeNumber(
            trade.quantity,
            0
          ),
          available
        ),
        8
      );

    if (
      sellable <=
        0
    ) {
      intent.consumed =
        false;

      throw new Error(
        "NO AVAILABLE ASSET TO SELL"
      );
    }

    requestedSellQuantity =
      sellable;

    pair =
      getPair(
        normalized
      );

    clientOrderId =
      createClientOrderId(
        `SELL-${normalized}`
      );

    const journalPrepared =
      upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "PREPARED",

          resolved:
            false,

          side,

          coin:
            normalized,

          pair,

          chatId:
            String(
              chatId
            ),

          intentToken,

          requestedBaseVolume:
            requestedSellQuantity,

          sourceTrade: {
            entryPrice:
              safeNumber(
                trade.entryPrice,
                0
              ),

            quantityBeforeSell:
              safeNumber(
                trade.quantity,
                0
              ),

            buyOrderId:
              trade.buyOrderId ||
              null,

            buyClientOrderId:
              trade.buyClientOrderId ||
              null,
          },

          orderId:
            null,

          submissionAttempted:
            false,
        }
      );

    if (!journalPrepared) {
      intent.consumed =
        false;

      throw new Error(
        "ORDER JOURNAL WRITE FAILED — SELL NOT SUBMITTED"
      );
    }

    submissionAttempted =
      true;

    if (
      !upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "SUBMITTING",

          resolved:
            false,

          submissionAttempted:
            true,

          submittedAt:
            Date.now(),
        }
      )
    ) {
      submissionAttempted =
        false;

      intent.consumed =
        false;

      throw new Error(
        "ORDER JOURNAL WRITE FAILED — SELL NOT SUBMITTED"
      );
    }

    const posted =
      await part7TradeRequest(
        "POST",
        "/api/1/marketorder",
        {
          pair,

          type:
            "SELL",

          base_volume:
            String(
              sellable
            ),

          timestamp:
            Date.now(),

          ttl:
            PART7_EXECUTION_CONFIG
              .orderTtlMs,

          client_order_id:
            clientOrderId,
        }
      );

    orderId =
      posted?.order_id ||
      null;

    upsertPart7OrderJournalEntry(
      clientOrderId,
      {
        status:
          orderId
            ? "ACCEPTED"
            : "ACCEPTANCE_UNKNOWN",

        orderId,

        acceptedAt:
          Date.now(),
      }
    );

    if (!orderId) {
      throw new Error(
        "LUNO SELL ACCEPTANCE STATUS UNKNOWN"
      );
    }

    let finalOrder =
      null;

    try {
      finalOrder =
        await waitForPart7OrderFinal(
          orderId
        );
    } catch (pollError) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (
        !reconciled.found
      ) {
        throw new Error(
          `SELL STATUS UNKNOWN — DO NOT RETRY CONFIRMATION — ${pollError.message}`
        );
      }

      finalOrder =
        reconciled.order;
    }

    let execution =
      normalizePart7Execution(
        finalOrder,
        {
          orderId,

          clientOrderId,

          pair,

          side,
        }
      );

    if (
      !isPart7SuccessfulOrderState(
        execution.state
      ) ||
      execution.base <=
        0 ||
      execution.averagePrice <=
        0
    ) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (
        reconciled.found
      ) {
        execution =
          normalizePart7Execution(
            reconciled.order,
            {
              orderId,

              clientOrderId,

              pair,

              side,
            }
          );
      }
    }

    if (
      !isPart7SuccessfulOrderState(
        execution.state
      ) ||
      execution.base <=
        0 ||
      execution.averagePrice <=
        0
    ) {
      if (
        isPart7FinalOrderState(
          execution.state
        )
      ) {
        resolvePart7OrderJournalEntry(
          clientOrderId,
          "SELL_FINAL_NOT_FILLED",
          {
            orderId:
              execution.orderId ||
              orderId,

            orderState:
              execution.state,

            execution,
          }
        );
      } else {
        upsertPart7OrderJournalEntry(
          clientOrderId,
          {
            status:
              "SELL_UNRESOLVED",

            resolved:
              false,

            orderId:
              execution.orderId ||
              orderId,

            orderState:
              execution.state,

            execution,
          }
        );
      }

      throw new Error(
        `SELL NOT CONFIRMED FILLED — STATE ${execution.state} — DO NOT RETRY UNTIL ORDER IS CHECKED`
      );
    }

    return finalizeFilledSell(
      execution,
      false
    );
  } catch (error) {
    if (
      submissionAttempted &&
      clientOrderId
    ) {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId,
          clientOrderId,
        });

      if (
        reconciled.found
      ) {
        const execution =
          normalizePart7Execution(
            reconciled.order,
            {
              orderId,
              clientOrderId,
              pair,
              side,
            }
          );

        orderId =
          execution.orderId ||
          orderId;

        if (
          isPart7SuccessfulOrderState(
            execution.state
          ) &&
          execution.base >
            0 &&
          execution.averagePrice >
            0
        ) {
          try {
            return finalizeFilledSell(
              execution,
              true
            );
          } catch (finalizeError) {
            upsertPart7OrderJournalEntry(
              clientOrderId,
              {
                status:
                  "SELL_FILLED_LOCAL_STATE_PENDING",

                resolved:
                  false,

                orderId,

                orderState:
                  execution.state,

                execution,

                lastError:
                  finalizeError.message,
              }
            );

            PART7_EXECUTION_RUNTIME
              .lastError = {
                at:
                  Date.now(),

                coin:
                  normalized,

                side,

                clientOrderId,

                orderId,

                submissionAttempted:
                  true,

                message:
                  finalizeError.message,
              };

            return {
              ok:
                false,

              ambiguous:
                true,

              clientOrderId,

              orderId,

              reason:
                "SELL FILLED AT LUNO BUT LOCAL POSITION RECOVERY IS PENDING — DO NOT SELL AGAIN",
            };
          }
        }

        if (
          isPart7FinalOrderState(
            execution.state
          )
        ) {
          resolvePart7OrderJournalEntry(
            clientOrderId,
            "SELL_FINAL_NOT_FILLED",
            {
              orderId,

              orderState:
                execution.state,

              execution,

              lastError:
                error?.message ||
                String(error),
            }
          );

          delete PART7_EXECUTION_RUNTIME
            .sellIntents[
              intentToken
            ];

          return {
            ok:
              false,

            ambiguous:
              false,

            clientOrderId,

            orderId,

            reason:
              `SELL NOT FILLED — STATE ${execution.state}`,
          };
        }
      }

      upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            "SELL_AMBIGUOUS",

          resolved:
            false,

          orderId,

          requestedBaseVolume:
            requestedSellQuantity,

          lastError:
            error?.message ||
            String(error),
        }
      );
    } else {
      intent.consumed =
        false;
    }

    PART7_EXECUTION_RUNTIME
      .lastError = {
        at:
          Date.now(),

        coin:
          normalized,

        side,

        clientOrderId,

        orderId,

        submissionAttempted,

        message:
          error?.message ||
          String(error),
      };

    return {
      ok:
        false,

      ambiguous:
        submissionAttempted,

      clientOrderId,

      orderId,

      reason:
        error?.message ||
        String(error),
    };
  } finally {
    setPart7ExecutionLock(
      chatId,
      normalized,
      side,
      false
    );
  }
}

function closeActiveTradeFromMatchedSell({
  trade,
  execution,
  reason,
}) {
  if (
    !trade ||
    !execution
  ) {
    return {
      closed:
        false,

      reason:
        "INVALID SELL EXECUTION",
    };
  }

  const soldQuantity =
    safeNumber(
      execution.base,
      0
    );

  const sellPrice =
    safeNumber(
      execution.averagePrice,
      0
    );

  if (
    soldQuantity <=
      0 ||
    sellPrice <=
      0
  ) {
    return {
      closed:
        false,

      reason:
        "SELL FILL INVALID",
    };
  }

  const originalQuantity =
    safeNumber(
      trade.quantity,
      0
    );

  const remainingQuantity =
    Math.max(
      0,
      originalQuantity -
      soldQuantity
    );

  const feeEstimate =
    calculateTradeAfterFees({
      quantity:
        Math.min(
          originalQuantity,
          soldQuantity
        ),

      entryPrice:
        trade.entryPrice,

      sellPrice,
    });

  if (
    remainingQuantity >
      1e-8
  ) {
    trade.quantity =
      remainingQuantity;

    trade.status =
      "ACTIVE";

    trade.lastPartialSell = {
      at:
        Date.now(),

      soldQuantity,

      sellPrice,

      orderId:
        execution.orderId,

      clientOrderId:
        execution.clientOrderId,

      reason,
    };

    invalidateSellIntent(
      trade,
      "PARTIAL SELL FILLED"
    );

    return {
      closed:
        false,

      partial:
        true,

      reason:
        "PARTIAL SELL — POSITION REMAINS ACTIVE",

      trade,
    };
  }

  const closedTrade = {
    ...trade,

    status:
      "CLOSED",

    closedAt:
      Date.now(),

    closeReason:
      reason ||
      "USER CONFIRMED SELL",

    sellOrderId:
      execution.orderId,

    sellClientOrderId:
      execution.clientOrderId,

    sellPrice,

    soldQuantity,

    sellFeeBase:
      safeNumber(
        execution.feeBase,
        0
      ),

    sellFeeCounter:
      safeNumber(
        execution.feeCounter,
        0
      ),

    realisedNetProfit:
      safeNumber(
        feeEstimate?.netProfit,
        0
      ),

    realisedNetProfitPct:
      safeNumber(
        feeEstimate?.netProfitPct,
        0
      ),
  };

  invalidateSellIntent(
    trade,
    "TRADE CLOSED"
  );

  delete ACTIVE_TRADES[
    trade.coin
  ];

  return {
    closed:
      true,

    partial:
      false,

    closedTrade,

    trade:
      null,
  };
}

function shouldSendActiveTradeAlert(
  trade,
  type
) {
  if (!trade) {
    return false;
  }

  if (
    trade.lastAlertType !==
    type
  ) {
    return true;
  }

  return (
    Date.now() -
      safeNumber(
        trade.lastAlertAt,
        0
      ) >=
    PART7_EXECUTION_CONFIG
      .activeTradeAlertCooldownMs
  );
}

function markActiveTradeAlert(
  trade,
  type
) {
  trade.lastAlertType =
    type;

  trade.lastAlertAt =
    Date.now();

  persistPart7ActiveTradeStateNow();
}

function evaluateActiveTradeState(
  trade,
  currentPrice
) {
  const price =
    safeNumber(
      currentPrice,
      0
    );

  const entry =
    safeNumber(
      trade?.entryPrice,
      0
    );

  const tp =
    safeNumber(
      trade?.tp,
      0
    );

  const sl =
    safeNumber(
      trade?.sl,
      0
    );

  if (
    !trade ||
    price <=
      0 ||
    entry <=
      0
  ) {
    return {
      state:
        "INVALID",
    };
  }

  trade.highestPrice =
    Math.max(
      safeNumber(
        trade.highestPrice,
        entry
      ),
      price
    );

  trade.lowestPrice =
    Math.min(
      safeNumber(
        trade.lowestPrice,
        entry
      ),
      price
    );

  const changePct =
    percentChange(
      entry,
      price
    );

  const distanceToTpPct =
    tp >
      0
      ? percentChange(
          price,
          tp
        )
      : null;

  if (
    sl >
      0 &&
    price <=
      sl
  ) {
    return {
      state:
        "SL_HIT",

      changePct,

      distanceToTpPct,
    };
  }

  if (
    !trade.tp1Hit &&
    tp >
      0 &&
    price >=
      tp
  ) {
    trade.tp1Hit =
      true;

    trade.extensionReferencePrice =
      price;

    persistPart7ActiveTradeStateNow();

    return {
      state:
        "TP1_HIT",

      changePct,

      distanceToTpPct,
    };
  }

  if (
    trade.tp1Hit
  ) {
    const reference =
      safeNumber(
        trade.extensionReferencePrice,
        tp ||
        price
      );

    const nextExtension =
      reference *
      (
        1 +
        PART7_EXECUTION_CONFIG
          .tpExtensionPct /
        100
      );

    if (
      price >=
      nextExtension
    ) {
      trade.extensionCount =
        safeNumber(
          trade.extensionCount,
          0
        ) +
        1;

      trade.extensionReferencePrice =
        price;

      persistPart7ActiveTradeStateNow();

      return {
        state:
          "TP_EXTENDED",

        changePct,

        distanceToTpPct,

        extensionCount:
          trade.extensionCount,
      };
    }
  }

  if (
    !trade.tp1Hit &&
    tp >
      0 &&
    Math.abs(
      percentChange(
        price,
        tp
      )
    ) <=
      PART7_EXECUTION_CONFIG
        .nearTpPct
  ) {
    return {
      state:
        "NEAR_TP",

      changePct,

      distanceToTpPct,
    };
  }

  if (
    changePct <=
    PART7_EXECUTION_CONFIG
      .cautionLossPct
  ) {
    return {
      state:
        "CAUTION",

      changePct,

      distanceToTpPct,
    };
  }

  return {
    state:
      changePct >=
        0
        ? "HOLD_PROFIT"
        : "HOLD",

    changePct,

    distanceToTpPct,
  };
}

async function sendTradeSellDecision(
  trade,
  currentPrice,
  reason,
  title
) {
  const intent =
    createSellIntent(
      trade,
      reason,
      currentPrice,
      CHAT_ID
    );

  const snapshot =
    calculateActiveTradeNetSnapshot(
      trade,
      currentPrice
    );

  const text =
`${title}

🪙 ${trade.coin}
💰 Current: ${formatMYR(
  currentPrice
)}
📐 Entry: ${formatMYR(
  trade.entryPrice
)}
💵 Est. Net P/L: ${formatMYR(
  snapshot?.estimatedNetProfit ||
  0
)} (${formatPercent(
  snapshot?.estimatedNetProfitPct ||
  0
)})

⚠️ SELL hanya berlaku jika kau tekan SELL NOW.`;

  const sent =
    await sendTelegram(
      text,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🔴 SELL NOW",

                callback_data:
                  `SELL_NOW:${trade.coin}:${intent.intentToken}`,
              },

              {
                text:
                  "🟢 HOLD",

                callback_data:
                  `HOLD_TRADE:${trade.coin}:${intent.intentToken}`,
              },
            ],
          ],
        },
      }
    );

  if (!sent) {
    invalidateSellIntent(
      trade,
      "TELEGRAM SELL ALERT FAILED"
    );

    persistPart7ActiveTradeStateNow();

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

    intent,

    message:
      text,
  };
}

async function monitorSingleActiveTrade(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const trade =
    ACTIVE_TRADES[
      normalized
    ];

  if (!trade) {
    return {
      monitored:
        false,

      reason:
        "NO ACTIVE TRADE",
    };
  }

  const ticker =
    await getTicker(
      normalized
    );

  const currentPrice =
    safeNumber(
      ticker?.currentPrice,
      0
    );

  if (
    currentPrice <=
      0
  ) {
    return {
      monitored:
        false,

      reason:
        "PRICE UNAVAILABLE",
    };
  }

  const state =
    evaluateActiveTradeState(
      trade,
      currentPrice
    );

  const snapshot =
    calculateActiveTradeNetSnapshot(
      trade,
      currentPrice
    );

  trade.lastPrice =
    currentPrice;

  trade.lastSnapshot =
    snapshot;

  trade.lastMonitorAt =
    Date.now();

  if (
    state.state ===
      "TP1_HIT" &&
    shouldSendActiveTradeAlert(
      trade,
      "TP1_HIT"
    )
  ) {
    const sent =
      await sendTradeSellDecision(
        trade,
        currentPrice,
        "FIRST TP HIT",
        "🎯 FIRST TP HIT"
      );

    if (
      sent.sent
    ) {
      markActiveTradeAlert(
        trade,
        "TP1_HIT"
      );
    }

    return {
      monitored:
        true,

      state,

      snapshot,

      alert:
        sent,
    };
  }

  if (
    state.state ===
      "TP_EXTENDED"
  ) {
    const alertType =
      `TP_EXTENDED_${state.extensionCount}`;

    if (
      shouldSendActiveTradeAlert(
        trade,
        alertType
      )
    ) {
      const sent =
        await sendTradeSellDecision(
          trade,
          currentPrice,
          `TP EXTENDED #${state.extensionCount}`,
          `🚀 TP EXTENDED #${state.extensionCount}`
        );

      if (
        sent.sent
      ) {
        markActiveTradeAlert(
          trade,
          alertType
        );
      }

      return {
        monitored:
          true,

        state,

        snapshot,

        alert:
          sent,
      };
    }
  }

  if (
    state.state ===
      "SL_HIT" &&
    shouldSendActiveTradeAlert(
      trade,
      "SL_HIT"
    )
  ) {
    const sent =
      await sendTradeSellDecision(
        trade,
        currentPrice,
        "STOP LOSS LEVEL HIT",
        "🛑 STOP LOSS LEVEL HIT"
      );

    if (
      sent.sent
    ) {
      markActiveTradeAlert(
        trade,
        "SL_HIT"
      );
    }

    return {
      monitored:
        true,

      state,

      snapshot,

      alert:
        sent,
    };
  }

  if (
    trade.sellIntentToken &&
    ![
      "TP1_HIT",
      "TP_EXTENDED",
      "SL_HIT",
    ].includes(
      state.state
    )
  ) {
    const sellIntent =
      PART7_EXECUTION_RUNTIME
        .sellIntents[
          trade.sellIntentToken
        ];

    if (
      sellIntent?.reason
        ?.startsWith(
          "TP EXTENDED"
        ) ||
      sellIntent?.reason ===
        "FIRST TP HIT"
    ) {
      const reference =
        safeNumber(
          sellIntent.referencePrice,
          0
        );

      if (
        reference >
          0 &&
        currentPrice <
          reference *
          0.997
      ) {
        invalidateSellIntent(
          trade,
          "SELL OPPORTUNITY NO LONGER VALID"
        );

        persistPart7ActiveTradeStateNow();
      }
    }
  }

  return {
    monitored:
      true,

    state,

    snapshot,
  };
}

async function monitorActiveTrades() {
  if (
    PART7_EXECUTION_RUNTIME
      .monitorRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "ACTIVE TRADE MONITOR ALREADY RUNNING",
    };
  }

  PART7_EXECUTION_RUNTIME
    .monitorRunning =
    true;

  PART7_EXECUTION_RUNTIME
    .lastMonitorAt =
    Date.now();

  try {
    const coins =
      Object.keys(
        ACTIVE_TRADES
      ).filter(
        (coin) =>
          ACTIVE_TRADES[
            coin
          ]
      );

    const results =
      [];

    for (
      const coin of
      coins
    ) {
      try {
        results.push(
          await monitorSingleActiveTrade(
            coin
          )
        );
      } catch (error) {
        results.push({
          monitored:
            false,

          coin,

          reason:
            error?.message ||
            String(error),
        });
      }
    }

    return {
      skipped:
        false,

      activeCount:
        coins.length,

      results,
    };
  } finally {
    PART7_EXECUTION_RUNTIME
      .monitorRunning =
      false;
  }
}

function holdActiveTrade(
  coin,
  intentToken
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const trade =
    ACTIVE_TRADES[
      normalized
    ];

  if (!trade) {
    return {
      held:
        false,

      reason:
        "NO ACTIVE TRADE",
    };
  }

  if (
    trade.sellIntentToken !==
    intentToken
  ) {
    return {
      held:
        false,

      reason:
        "STALE HOLD BUTTON",
    };
  }

  invalidateSellIntent(
    trade,
    "USER CHOSE HOLD"
  );

  trade.holdCount =
    safeNumber(
      trade.holdCount,
      0
    ) +
    1;

  trade.lastHoldAt =
    Date.now();

  trade.lastAlertState =
    "HOLD";

  trade.lastAlertAt =
    Date.now();

  persistPart7ActiveTradeStateNow();

  return {
    held:
      true,

    trade,
  };
}

function getPart7ExecutionStatus() {
  return {
    lockedExecutions:
      Object.keys(
        PART7_EXECUTION_RUNTIME
          .locks
      ).length,

    pendingBuyIntents:
      Object.keys(
        PART7_EXECUTION_RUNTIME
          .buyIntents
      ).length,

    pendingSellIntents:
      Object.keys(
        PART7_EXECUTION_RUNTIME
          .sellIntents
      ).length,

    unresolvedOrders:
      getPart7UnresolvedOrderJournalEntries()
        .length,

    activeTrades:
      Object.keys(
        ACTIVE_TRADES
      ).filter(
        (coin) =>
          ACTIVE_TRADES[
            coin
          ]
      ),

    lastOrder:
      PART7_EXECUTION_RUNTIME
        .lastOrder,

    lastError:
      PART7_EXECUTION_RUNTIME
        .lastError,

    monitorRunning:
      PART7_EXECUTION_RUNTIME
        .monitorRunning,

    lastMonitorAt:
      PART7_EXECUTION_RUNTIME
        .lastMonitorAt,
  };
}

/* ============================================================
   END PART 7
============================================================ */
/* ============================================================
   PART 8 — ALERTS + GRT24 + HOLD + LEARNING + TUNING + PERSISTENCE
============================================================ */

const PART8_ALERT_CONFIG = Object.freeze({
  btc15mThresholdPct: 0.20,
  grt5mThresholdPct: 0.10,
  grt15mThresholdPct: 0.20,
  grt1hThresholdPct: 0.40,
  learningSuccessPct: 0.80,
  learningFailurePct: -0.30,
  learningMonitorMs: 60 * 1000,
  learningMaxAgeMs: 6 * 60 * 60 * 1000,
  tuningMinCompletedSignals: 20,
  tuningStep: 2,
  tuningMinThreshold: 50,
  tuningMaxThreshold: 75,
  tuningImprovementRequiredPct: 7,
});

const PART8_RUNTIME = {
  priceAlertRunning: false,
  structureAlertRunning: false,
  learningMonitorRunning: false,
  priceAlertRuns: 0,
  structureAlertRuns: 0,
  learningRuns: 0,
  errors: 0,
  lastPriceAlertAt: null,
  lastStructureAlertAt: null,
  lastLearningAt: null,
};


/* ============================================================
   ROLLING MOVE
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
      rolling.changePct ??
      rolling.change,
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
      rolling.changePct ??
      rolling.change,
      0
    );

  const state =
    classifyRollingMove(
      rolling,
      thresholdPct
    );

  const emoji =
    state ===
      "UP"
      ? "🟢"
      : state ===
          "DOWN"
        ? "🔴"
        : "⚪";

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
      PART8_ALERT_CONFIG
        .btc15mThresholdPct
    );

  if (
    state ===
    "UP"
  ) {
    return "🟢 BTC NAIK";
  }

  if (
    state ===
    "DOWN"
  ) {
    return "🔴 BTC DROP";
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
   NATURAL GRT MOVEMENT
============================================================ */

function getGRTNaturalMovementLabel({
  rolling5m,
  rolling15m,
  rolling1h,
}) {
  const s5 =
    classifyRollingMove(
      rolling5m,
      PART8_ALERT_CONFIG
        .grt5mThresholdPct
    );

  const s15 =
    classifyRollingMove(
      rolling15m,
      PART8_ALERT_CONFIG
        .grt15mThresholdPct
    );

  const s1h =
    classifyRollingMove(
      rolling1h,
      PART8_ALERT_CONFIG
        .grt1hThresholdPct
    );

  if (
    [
      s5,
      s15,
      s1h,
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

  if (
    s5 ===
      "UP" &&
    s15 ===
      "UP" &&
    s1h ===
      "UP"
  ) {
    return {
      state:
        "TELAH_NAIK",

      text:
        "🟢 TELAH NAIK",
    };
  }

  if (
    s5 ===
      "UP" &&
    s15 ===
      "UP"
  ) {
    return {
      state:
        "SEDANG_NAIK",

      text:
        "🟠 SEDANG NAIK",
    };
  }

  if (
    s5 ===
    "UP"
  ) {
    return {
      state:
        "MULA_NAIK",

      text:
        "🟡 MULA NAIK",
    };
  }

  if (
    s5 ===
      "DOWN" &&
    s15 ===
      "UP" &&
    s1h ===
      "UP"
  ) {
    return {
      state:
        "TURUN_SEKETIKA",

      text:
        "🟡 TURUN SEKETIKA",
    };
  }

  if (
    s5 ===
      "DOWN" &&
    s15 ===
      "DOWN" &&
    s1h ===
      "DOWN"
  ) {
    return {
      state:
        "DROP_LAJU",

      text:
        "🔴 DROP LAJU",
    };
  }

  if (
    s5 ===
      "DOWN" &&
    s15 ===
      "DOWN"
  ) {
    return {
      state:
        "SEDANG_DROP",

      text:
        "🔴 SEDANG DROP",
    };
  }

  if (
    s5 ===
      "NEUTRAL" &&
    (
      s15 ===
        "UP" ||
      s1h ===
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

  if (
    s5 ===
      "NEUTRAL" &&
    (
      s15 ===
        "DOWN" ||
      s1h ===
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
   MALAYSIA DATE HELPERS
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

  return `${String(
    parts.year
  )}-${String(
    parts.month
  ).padStart(
    2,
    "0"
  )}-${String(
    parts.day
  ).padStart(
    2,
    "0"
  )}`;
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
   DAILY WATCH
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
  const normalized =
    normalizeCoin(
      coin
    );

  const value =
    safeNumber(
      price,
      0
    );

  if (
    value <=
    0
  ) {
    return false;
  }

  const state =
    ensureDailyWatchState();

  if (
    state.dateKey !==
    getMalaysiaDateKey()
  ) {
    return false;
  }

  if (
    normalized ===
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
    normalized ===
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

  return true;
}


function updateDailyWatchTrade(
  coin,
  trade
) {
  if (
    normalizeCoin(
      coin
    ) !==
      "GRT" ||
    !trade
  ) {
    return false;
  }

  const state =
    ensureDailyWatchState();

  const stamp =
    safeNumber(
      trade.timestamp,
      Date.now()
    );

  if (
    getMalaysiaDateKey(
      new Date(
        stamp
      )
    ) !==
    state.dateKey
  ) {
    return false;
  }

  const volume =
    safeNumber(
      trade.volume,
      0
    );

  if (
    trade.isBuy
  ) {
    state.buyExecutions++;

    state.buyVolume +=
      volume;
  } else {
    state.sellExecutions++;

    state.sellVolume +=
      volume;
  }

  return true;
}


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

  saveDailyWatchState();

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
   DAILY PERSISTENCE
============================================================ */

function saveDailyWatchState() {
  try {
    fs.writeFileSync(
      DAILY_WATCH_FILE,
      JSON.stringify(
        {
          current:
            GRT_DAILY_STATE,

          history:
            GRT_DAILY_HISTORY.slice(
              -GRT_DAILY_HISTORY_DAYS
            ),

          lastDailyReportKey:
            LAST_DAILY_REPORT_KEY,
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
      "Daily watch save error:",
      error.message
    );

    return false;
  }
}


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

    if (
      !raw
    ) {
      return false;
    }

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
        data.history.slice(
          -GRT_DAILY_HISTORY_DAYS
        );
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
   BTC PRICE ALERT SNAPSHOT
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
    FIFTEEN_MINUTES,
    ticker.currentPrice
  );

  return {
    ticker,

    rolling15m,

    section:
      `₿ BTC RM${formatPrice(
        ticker.currentPrice
      )}
15M : ${formatRollingPriceMove(
        rolling15m,
        PART8_ALERT_CONFIG
          .btc15mThresholdPct
      )} | ${getBTC15mDirection(
        rolling15m
      )}`,
  };
}


/* ============================================================
   GRT PRICE ALERT SNAPSHOT
============================================================ */

async function getGRTPriceAlertSnapshot(
  suppliedSnapshot =
    null
) {
  const snapshot =
    suppliedSnapshot ||
    await getGRTMomentumSnapshot();

  const ticker =
    snapshot?.ticker ||
    (
      snapshot?.currentPrice
        ? {
            currentPrice:
              snapshot.currentPrice,
          }
        : null
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
    FIVE_MINUTES,
    ticker.currentPrice
  );

const rolling15m =
  getRollingPriceChange(
    "GRT",
    FIFTEEN_MINUTES,
    ticker.currentPrice
  );

const rolling1h =
  getRollingPriceChange(
    "GRT",
    ONE_HOUR,
    ticker.currentPrice
  );

  const movement =
    getGRTNaturalMovementLabel({
      rolling5m,

      rolling15m,

      rolling1h,
    });

  const decisionText =
    snapshot?.decisionText ||
    snapshot?.decision?.text ||
    snapshot?.normalized?.text ||
    "🟠 VERIFYING";

  return {
    ticker,

    snapshot,

    rolling5m,

    rolling15m,

    rolling1h,

    movement,

    section:
      `🪙 GRT RM${formatPrice(
        ticker.currentPrice
      )}
5M  : ${formatRollingPriceMove(
        rolling5m,
        PART8_ALERT_CONFIG
          .grt5mThresholdPct
      )}
15M : ${formatRollingPriceMove(
        rolling15m,
        PART8_ALERT_CONFIG
          .grt15mThresholdPct
      )}
1H  : ${formatRollingPriceMove(
        rolling1h,
        PART8_ALERT_CONFIG
          .grt1hThresholdPct
      )}
${movement.text}
⚡ MOMENTUM: ${decisionText}`,
  };
}


/* ============================================================
   RUN PRICE ALERT
============================================================ */

async function runPriceAlert() {
  if (
    PART8_RUNTIME
      .priceAlertRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "PRICE ALERT STILL RUNNING",
    };
  }

  PART8_RUNTIME
    .priceAlertRunning =
      true;

  try {
    const grtSnapshot =
      await getGRTMomentumSnapshot();

    const [
      btc,
      grt,
    ] =
      await Promise.all([
        getBTCPriceAlertSnapshot(),

        getGRTPriceAlertSnapshot(
          grtSnapshot
        ),
      ]);

    const message =
      `🚨 PRICE ALERT

${btc.section}
━━━━━━━━━━━━━━━━━━
${grt.section}`;

    const sent =
      await sendTelegram(
        message
      );

    PART8_RUNTIME
      .priceAlertRuns++;

    PART8_RUNTIME
      .lastPriceAlertAt =
        Date.now();

    saveDailyWatchState();

    return {
      skipped:
        false,

      sent:
        Boolean(
          sent
        ),

      btc,

      grt,
    };
  } catch (
    error
  ) {
    PART8_RUNTIME
      .errors++;

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    PART8_RUNTIME
      .priceAlertRunning =
        false;
  }
}


/* ============================================================
   MARKET STRUCTURE ALERT

   Uses canonical PART 3 report.
============================================================ */

async function runMarketStructureAlert() {
  if (
    PART8_RUNTIME
      .structureAlertRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "STRUCTURE ALERT STILL RUNNING",
    };
  }

  PART8_RUNTIME
    .structureAlertRunning =
      true;

  try {
    const report =
      await buildMarketStructureReport();

    if (
      !report
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

    const sent =
      await sendTelegram(
        report
      );

    PART8_RUNTIME
      .structureAlertRuns++;

    PART8_RUNTIME
      .lastStructureAlertAt =
        Date.now();

    return {
      skipped:
        false,

      sent:
        Boolean(
          sent
        ),

      report,
    };
  } catch (
    error
  ) {
    PART8_RUNTIME
      .errors++;

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    PART8_RUNTIME
      .structureAlertRunning =
        false;
  }
}


/* ============================================================
   2H FLOW REPORT
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
   GRT 24H REPORT
============================================================ */

async function buildGRT24Report() {
  await checkDailyWatchRollover();

  const state =
    ensureDailyWatchState();

  const ticker =
    await getTicker(
      "GRT"
    );

  if (
    ticker
  ) {
    updateDailyWatchPrice(
      "GRT",
      ticker.currentPrice
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

  const current =
    safeNumber(
      ticker?.currentPrice ??
      state.grtClose,
      0
    );

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

  return `🌙 GRT 24H REPORT

📅 ${formatMalaysiaDateLabel(
    state.dateKey
  )}
━━━━━━━━━━━━━━
💵 Open: ${
    open >
      0
      ? `RM${formatPrice(
          open
        )}`
      : "N/A"
  }
⬆️ High: ${
    high >
      0
      ? `RM${formatPrice(
          high
        )}`
      : "N/A"
  }
⬇️ Low: ${
    low >
      0
      ? `RM${formatPrice(
          low
        )}`
      : "N/A"
  }
💵 Current: ${
    current >
      0
      ? `RM${formatPrice(
          current
        )}`
      : "N/A"
  }
📈 Change: ${formatPercent(
    changePct
  )}
━━━━━━━━━━━━━━
🌊 EXECUTED FLOW
🟢 Buy Frequency: ${formatPercent(
    buyExecutionPct
  )}
🔴 Sell Frequency: ${formatPercent(
    sellExecutionPct
  )}
🟢 Buy Volume: ${formatPercent(
    buyVolumePct
  )}
🔴 Sell Volume: ${formatPercent(
    sellVolumePct
  )}
⚡ Pressure: ${formatPressure(
    pressure
  )}`;
}


/* ============================================================
   GRT HOLD ANALYSIS
============================================================ */

async function analyzeGRTHoldPosition({
  entryPrice,
  quantity =
    1,
}) {
  const entry =
    safeNumber(
      entryPrice,
      0
    );

  const qty =
    safeNumber(
      quantity,
      1
    );

  if (
    entry <=
      0 ||
    qty <=
      0
  ) {
    return {
      ready:
        false,

      reason:
        "INVALID ENTRY",
    };
  }

  const [
    ticker,
    momentum,
    structure,
    twoHour,
  ] =
    await Promise.all([
      getTicker(
        "GRT"
      ),

      getGRTMomentumSnapshot(),

      getExecutionStructureSnapshot(
        "GRT"
      ),

      analyze2HMarketCondition(
        "GRT"
      ),
    ]);

  const currentPrice =
    safeNumber(
      ticker?.currentPrice,
      0
    );

  if (
    currentPrice <=
    0
  ) {
    return {
      ready:
        false,

      reason:
        "PRICE UNAVAILABLE",
    };
  }

  const fee =
    calculateTradeAfterFees({
      quantity:
        qty,

      entryPrice:
        entry,

      sellPrice:
        currentPrice,
    });

  const changePct =
    percentChange(
      entry,
      currentPrice
    );

  const decisionCode =
    momentum?.decisionCode ||
    momentum?.decision?.status ||
    momentum?.decision?.code ||
    "VERIFYING";

  const sellPressure =
    safeNumber(
      structure
        ?.flow
        ?.sellVolumePct,
      50
    );

  const breakdown =
    Boolean(
      momentum
        ?.breakdownConfirmed ||
      momentum
        ?.supportBreakConfirmed
    );

  let action =
    "HOLD";

  let reason =
    "STRUCTURE MASIH BOLEH BERTAHAN";

  if (
    breakdown ||
    sellPressure >=
      68 ||
    decisionCode ===
      "DONT_BUY"
  ) {
    action =
      "CAUTION";

    reason =
      breakdown
        ? "BREAKDOWN CONFIRMED"
        : sellPressure >=
            68
          ? "SELL PRESSURE TINGGI"
          : "MOMENTUM LEMAH";
  }

  if (
    twoHour
      ?.stronglyBullish &&
    decisionCode ===
      "BUY_NOW"
  ) {
    action =
      "HOLD_STRONG";

    reason =
      "MOMENTUM + 2H MASIH KUAT";
  }

  return {
    ready:
      true,

    entryPrice:
      entry,

    quantity:
      qty,

    currentPrice,

    changePct,

    estimatedNetProfit:
      safeNumber(
        fee?.netProfit,
        0
      ),

    estimatedNetProfitPct:
      safeNumber(
        fee?.netProfitPct,
        0
      ),

    action,

    reason,

    momentum,

    structure,

    twoHour,
  };
}


function buildManualGRTHoldReport(
  analysis
) {
  if (
    !analysis
      ?.ready
  ) {
    return `⚠️ GRT HOLD
${analysis?.reason ||
      "DATA UNAVAILABLE"}`;
  }

  const icon =
    analysis.action ===
      "HOLD_STRONG"
      ? "🟢"
      : analysis.action ===
          "CAUTION"
        ? "🟠"
        : "🟡";

  return `🧭 GRT HOLD ANALYSIS

📐 Entry: ${formatMYR(
    analysis.entryPrice
  )}
💰 Current: ${formatMYR(
    analysis.currentPrice
  )}
📈 Gross Move: ${formatPercent(
    analysis.changePct
  )}
💵 Est. Net P/L: ${formatMYR(
    analysis.estimatedNetProfit
  )} (${formatPercent(
    analysis.estimatedNetProfitPct
  )})

${icon} Action: ${analysis.action}
🧠 Reason: ${analysis.reason}`;
}


/* ============================================================
   GRT BUY NOW LEARNING
============================================================ */

function createGRTLearningSignalId() {
  return createClientOrderId(
    "GRT-LEARN"
  );
}


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
        LAST_GRT_BUY_NOW_SIGNAL
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
      "GRT BUY NOW load error:",
      error.message
    );

    return false;
  }
}


/* ============================================================
   GRT TUNING PERSISTENCE
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

    const saved =
      safeNumber(
        parsed.buyVolumeMinPct,
        GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
      );

    if (
      saved >=
        PART8_ALERT_CONFIG
          .tuningMinThreshold &&
      saved <=
        PART8_ALERT_CONFIG
          .tuningMaxThreshold
    ) {
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
        saved;
    }

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
   RECORD BUY NOW SIGNAL
============================================================ */

function recordGRTBuyNowSignal(
  ticker,
  analysis
) {
  const price =
    safeNumber(
      ticker?.currentPrice ??
      analysis?.currentPrice,
      0
    );

  if (
    price <=
      0 ||
    !analysis
  ) {
    return null;
  }

  const flow =
    analysis.flow ||
    analysis.execution?.flow ||
    {};

  const signal = {
    id:
      createGRTLearningSignalId(),

    createdAt:
      Date.now(),

    entryPrice:
      price,

    score:
      safeNumber(
        analysis.score ??
        analysis.confidenceScore,
        0
      ),

    buyVolumePct:
      safeNumber(
        flow.buyVolumePct,
        50
      ),

    buyFrequencyPct:
      safeNumber(
        flow.buyFrequencyPct,
        50
      ),

    priceResponsePct:
      safeNumber(
        analysis
          ?.priceResponse
          ?.changePct ??
        analysis
          ?.execution
          ?.priceResponse
          ?.changePct,
        0
      ),

    outcome:
      "PENDING",

    outcomeAt:
      null,

    maxRisePct:
      0,

    maxDropPct:
      0,

    lastPrice:
      price,
  };

  GRT_BUY_NOW_HISTORY.push(
    signal
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

  LAST_GRT_BUY_NOW_SIGNAL =
    signal.createdAt;

  saveGRTBuyNowHistory();

  return signal;
}


function getCompletedGRTBuyNowSignals() {
  return GRT_BUY_NOW_HISTORY.filter(
    (
      item
    ) =>
      [
        "SUCCESS",
        "FALSE",
      ].includes(
        item?.outcome
      )
  );
}


function updateGRTLearningOutcome(
  signal,
  currentPrice
) {
  if (
    !signal ||
    signal.outcome !==
      "PENDING"
  ) {
    return signal;
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
    return signal;
  }

  const movePct =
    percentChange(
      signal.entryPrice,
      price
    );

  signal.lastPrice =
    price;

  signal.maxRisePct =
    Math.max(
      safeNumber(
        signal.maxRisePct,
        0
      ),
      movePct
    );

  signal.maxDropPct =
    Math.min(
      safeNumber(
        signal.maxDropPct,
        0
      ),
      movePct
    );

  if (
    signal.maxRisePct >=
    PART8_ALERT_CONFIG
      .learningSuccessPct
  ) {
    signal.outcome =
      "SUCCESS";

    signal.outcomeAt =
      Date.now();
  } else if (
    signal.maxDropPct <=
      PART8_ALERT_CONFIG
        .learningFailurePct ||
    Date.now() -
      signal.createdAt >=
      PART8_ALERT_CONFIG
        .learningMaxAgeMs
  ) {
    signal.outcome =
      "FALSE";

    signal.outcomeAt =
      Date.now();
  }

  return signal;
}


/* ============================================================
   LEARNING MONITOR
============================================================ */

async function monitorGRTBuyNowLearning() {
  if (
    PART8_RUNTIME
      .learningMonitorRunning
  ) {
    return {
      skipped:
        true,

      reason:
        "LEARNING MONITOR RUNNING",
    };
  }

  PART8_RUNTIME
    .learningMonitorRunning =
      true;

  try {
    const pending =
      GRT_BUY_NOW_HISTORY.filter(
        (
          item
        ) =>
          item?.outcome ===
          "PENDING"
      );

    if (
      !pending.length
    ) {
      return {
        skipped:
          false,

        updated:
          0,
      };
    }

    const ticker =
      await getTicker(
        "GRT"
      );

    const price =
      safeNumber(
        ticker?.currentPrice,
        0
      );

    if (
      price <=
      0
    ) {
      return {
        skipped:
          false,

        updated:
          0,

        reason:
          "PRICE UNAVAILABLE",
      };
    }

    let updated =
      0;

    for (
      const signal of
      pending
    ) {
      const before =
        signal.outcome;

      updateGRTLearningOutcome(
        signal,
        price
      );

      if (
        signal.outcome !==
        before
      ) {
        updated++;
      }
    }

    PART8_RUNTIME
      .learningRuns++;

    PART8_RUNTIME
      .lastLearningAt =
        Date.now();

    saveGRTBuyNowHistory();

    return {
      skipped:
        false,

      updated,

      pending:
        pending.length,
    };
  } catch (
    error
  ) {
    PART8_RUNTIME
      .errors++;

    return {
      skipped:
        false,

      error:
        error.message,
    };
  } finally {
    PART8_RUNTIME
      .learningMonitorRunning =
        false;
  }
}


/* ============================================================
   TUNING STATISTICS
============================================================ */

function evaluateGRTThresholdAccuracy(
  threshold
) {
  const completed =
    getCompletedGRTBuyNowSignals()
      .filter(
        (
          item
        ) =>
          safeNumber(
            item.buyVolumePct,
            0
          ) >=
          threshold
      );

  const success =
    completed.filter(
      (
        item
      ) =>
        item.outcome ===
        "SUCCESS"
    ).length;

  return {
    threshold,

    total:
      completed.length,

    success,

    accuracy:
      completed.length
        ? (
            success /
            completed.length
          ) *
          100
        : 0,
  };
}


function generateGRTTuningSuggestion() {
  const completed =
    getCompletedGRTBuyNowSignals();

  if (
    completed.length <
    PART8_ALERT_CONFIG
      .tuningMinCompletedSignals
  ) {
    return null;
  }

  const candidates =
    [];

  for (
    let threshold =
      PART8_ALERT_CONFIG
        .tuningMinThreshold;
    threshold <=
      PART8_ALERT_CONFIG
        .tuningMaxThreshold;
    threshold +=
      PART8_ALERT_CONFIG
        .tuningStep
  ) {
    candidates.push(
      evaluateGRTThresholdAccuracy(
        threshold
      )
    );
  }

  const current =
    evaluateGRTThresholdAccuracy(
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
    );

  const minimumSamples =
    Math.max(
      8,
      Math.floor(
        completed.length *
        0.25
      )
    );

  const viable =
    candidates.filter(
      (
        item
      ) =>
        item.total >=
        minimumSamples
    );

  if (
    !viable.length
  ) {
    return null;
  }

  viable.sort(
    (
      a,
      b
    ) =>
      b.accuracy -
        a.accuracy ||
      b.total -
        a.total
  );

  const best =
    viable[0];

  if (
    best.threshold ===
    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT
  ) {
    return null;
  }

  if (
    best.accuracy <
    current.accuracy +
      PART8_ALERT_CONFIG
        .tuningImprovementRequiredPct
  ) {
    return null;
  }

  return {
    completedSignals:
      completed.length,

    currentThreshold:
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,

    currentAccuracy:
      current.accuracy,

    currentSamples:
      current.total,

    suggestedThreshold:
      best.threshold,

    suggestedAccuracy:
      best.accuracy,

    suggestedSamples:
      best.total,
  };
}


/* ============================================================
   MANUAL TUNING APPLY

   No silent automatic parameter changes.
============================================================ */

function applyGRTTuningThreshold(
  value
) {
  const threshold =
    safeNumber(
      value,
      0
    );

  if (
    threshold <
      PART8_ALERT_CONFIG
        .tuningMinThreshold ||
    threshold >
      PART8_ALERT_CONFIG
        .tuningMaxThreshold
  ) {
    return {
      applied:
        false,

      reason:
        "THRESHOLD OUT OF SAFE RANGE",
    };
  }

  const previous =
    GRT_DYNAMIC_BUY_VOLUME_MIN_PCT;

  GRT_DYNAMIC_BUY_VOLUME_MIN_PCT =
    threshold;

  saveGRTTuning();

  return {
    applied:
      true,

    previous,

    current:
      threshold,
  };
}


/* ============================================================
   LEARNING SUMMARY
============================================================ */

function buildGRTLearningSummary() {
  const completed =
    getCompletedGRTBuyNowSignals();

  const success =
    completed.filter(
      (
        item
      ) =>
        item.outcome ===
        "SUCCESS"
    ).length;

  const failed =
    completed.filter(
      (
        item
      ) =>
        item.outcome ===
        "FALSE"
    ).length;

  const pending =
    GRT_BUY_NOW_HISTORY.filter(
      (
        item
      ) =>
        item?.outcome ===
        "PENDING"
    ).length;

  const accuracy =
    completed.length
      ? (
          success /
          completed.length
        ) *
        100
      : 0;

  return {
    total:
      GRT_BUY_NOW_HISTORY.length,

    completed:
      completed.length,

    success,

    failed,

    pending,

    accuracy,

    threshold:
      GRT_DYNAMIC_BUY_VOLUME_MIN_PCT,
  };
}


function buildGRTTuningReport() {
  const summary =
    buildGRTLearningSummary();

  const suggestion =
    generateGRTTuningSuggestion();

  return `🧠 GRT LEARNING / TUNING

Signals: ${summary.total}
Completed: ${summary.completed}
✅ Success: ${summary.success}
❌ False: ${summary.failed}
⏳ Pending: ${summary.pending}
🎯 Accuracy: ${summary.accuracy.toFixed(
    1
  )}%

Current BUY volume threshold: ${summary.threshold.toFixed(
    0
  )}%${
    suggestion
      ? `

Suggested: ${suggestion.suggestedThreshold.toFixed(
          0
        )}%
Expected historical accuracy: ${suggestion.suggestedAccuracy.toFixed(
          1
        )}%
Samples: ${suggestion.suggestedSamples}`
      : `

No stronger tuning suggestion yet.`
  }`;
}


function getLastGRTBuyNowLearningSignal() {
  return GRT_BUY_NOW_HISTORY.length
    ? GRT_BUY_NOW_HISTORY[
        GRT_BUY_NOW_HISTORY.length -
        1
      ]
    : null;
}


/* ============================================================
   PART 8 STATUS
============================================================ */

function getPart8Status() {
  return {
    ...PART8_RUNTIME,

    learning:
      buildGRTLearningSummary(),

    dailyStateReady:
      Boolean(
        GRT_DAILY_STATE
      ),

    dailyHistoryCount:
      GRT_DAILY_HISTORY.length,
  };
}


/* ============================================================
   END PART 8
============================================================ */
/* ============================================================
   PART 9 — TELEGRAM COMMANDS + SEMI-AUTO CONFIRMATION FLOW
============================================================ */

const PART9_CONFIG = Object.freeze({
  defaultCoin: "GRT",
  minCapitalMYR: 10,
  maxCapitalMYR: 1000000,
});

function isPart9AuthorizedChat(chatId) {
  return chatId !== undefined &&
    chatId !== null &&
    String(chatId) === String(CHAT_ID);
}

function setPart9UserState(chatId, state = null) {
  const key = String(chatId);

  if (!state) {
    delete USER_STATE[key];
    return null;
  }

  USER_STATE[key] = {
    ...state,
    updatedAt: Date.now(),
  };

  return USER_STATE[key];
}

function getPart9UserState(chatId) {
  return USER_STATE[String(chatId)] || null;
}

function clearPart9UserState(chatId) {
  delete USER_STATE[String(chatId)];
}

function isPart9SupportedTradeCoin(coin) {
  return [
    "GRT",
    "XRP",
    "XLM",
    "CRV",
    "AAVE",
  ].includes(
    normalizeCoin(coin)
  );
}

function parsePart9Capital(value) {
  const capital =
    safeNumber(
      String(value ?? "")
        .replace(/RM/gi, "")
        .replace(/,/g, "")
        .trim(),
      0
    );

  if (
    capital < PART9_CONFIG.minCapitalMYR ||
    capital > PART9_CONFIG.maxCapitalMYR
  ) {
    return 0;
  }

  return capital;
}

function invalidatePart9PendingBuyState(
  reason = "BUY INTENT INVALIDATED"
) {
  for (
    const token of
    Object.keys(
      PART7_EXECUTION_RUNTIME.buyIntents || {}
    )
  ) {
    delete PART7_EXECUTION_RUNTIME
      .buyIntents[token];
  }

  for (
    const coin of
    Object.keys(PENDING_ENTRIES)
  ) {
    delete PENDING_ENTRIES[coin];
  }

  SEMI_AUTO_SESSION.pendingCandidate = null;
  SEMI_AUTO_SESSION.pendingOrderPlan = null;
  SEMI_AUTO_SESSION.updatedAt = Date.now();
  SEMI_AUTO_SESSION.lastDecision = reason;
}

function getPart9SessionStatus() {
  return {
    enabled:
      Boolean(
        SEMI_AUTO_SESSION.enabled
      ),

    state:
      SEMI_AUTO_SESSION.state,

    chatId:
      SEMI_AUTO_SESSION.chatId,

    capitalMYR:
      safeNumber(
        SEMI_AUTO_SESSION.capitalMYR,
        0
      ),

    startedAt:
      SEMI_AUTO_SESSION.startedAt,

    updatedAt:
      SEMI_AUTO_SESSION.updatedAt,

    cycleCount:
      safeNumber(
        SEMI_AUTO_SESSION.cycleCount,
        0
      ),

    successCount:
      safeNumber(
        SEMI_AUTO_SESSION.successCount,
        0
      ),

    failCount:
      safeNumber(
        SEMI_AUTO_SESSION.failCount,
        0
      ),

    pendingCoin:
      SEMI_AUTO_SESSION
        .pendingCandidate
        ?.coin ||
      null,

    activeTrades:
      Object.keys(
        ACTIVE_TRADES
      ).filter(
        (coin) =>
          ACTIVE_TRADES[coin]
      ),
  };
}

function resetPart9SemiAutoSession(
  reason = "USER DISABLED"
) {
  SEMI_AUTO_SESSION.enabled =
    false;

  SEMI_AUTO_SESSION.state =
    SEMI_AUTO_SESSION_STATES.OFF;

  SEMI_AUTO_SESSION.chatId =
    null;

  SEMI_AUTO_SESSION.capitalMYR =
    0;

  SEMI_AUTO_SESSION.startedAt =
    null;

  SEMI_AUTO_SESSION.updatedAt =
    Date.now();

  SEMI_AUTO_SESSION.lastError =
    null;

  invalidatePart9PendingBuyState(
    reason
  );

  return getPart9SessionStatus();
}

function armPart9SemiAutoSession(
  chatId,
  capitalMYR
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return {
      armed:
        false,

      reason:
        "UNAUTHORIZED TELEGRAM CHAT",
    };
  }

  const capital =
    parsePart9Capital(
      capitalMYR
    );

  if (!capital) {
    return {
      armed:
        false,

      reason:
        "INVALID CAPITAL",
    };
  }

  invalidatePart9PendingBuyState(
    "NEW SEMI-AUTO SESSION"
  );

  SEMI_AUTO_SESSION.enabled =
    true;

  SEMI_AUTO_SESSION.state =
    SEMI_AUTO_SESSION_STATES
      .WAITING_SETUP;

  SEMI_AUTO_SESSION.chatId =
    String(chatId);

  SEMI_AUTO_SESSION.capitalMYR =
    capital;

  SEMI_AUTO_SESSION.startedAt =
    Date.now();

  SEMI_AUTO_SESSION.updatedAt =
    Date.now();

  SEMI_AUTO_SESSION.lastDecision =
    "WAITING FOR QUALIFIED SETUP";

  SEMI_AUTO_SESSION.lastError =
    null;

  return {
    armed:
      true,

    session:
      getPart9SessionStatus(),
  };
}

function buildPart9AutoStatusMessage() {
  const status =
    getPart9SessionStatus();

  return `🤖 SEMI-AUTO STATUS

Status: ${status.state}
Enabled: ${status.enabled ? "YES" : "NO"}

💳 Capital:
${status.capitalMYR > 0
  ? formatMYR(status.capitalMYR)
  : "N/A"}

🔁 Cycle:
${status.cycleCount}

📈 Active Trade:
${status.activeTrades.length
  ? status.activeTrades.join(", ")
  : "NONE"}

🪙 Pending Setup:
${status.pendingCoin || "NONE"}

🔐 Every REAL BUY and SELL requires Telegram confirmation.`;
}

async function buildPart9OrderPlan(
  candidate,
  capitalMYR
) {
  const capital =
    parsePart9Capital(
      capitalMYR
    );

  if (
    !candidate?.allowed ||
    !capital
  ) {
    return {
      allowed:
        false,

      reason:
        "INVALID CANDIDATE OR CAPITAL",
    };
  }

  const coin =
    normalizeCoin(
      candidate.coin
    );

  if (
    !isPart9SupportedTradeCoin(
      coin
    )
  ) {
    return {
      allowed:
        false,

      reason:
        "UNSUPPORTED TRADE COIN",
    };
  }

  if (
    coin === "GRT"
  ) {
    return buildFinalOrderPlan({
      candidate,

      capitalMYR:
        capital,
    });
  }

  const entryPrice =
    safeNumber(
      candidate.entryPrice ||
      candidate.preliminaryEntry,
      0
    );

  const tp =
    safeNumber(
      candidate.tp,
      0
    );

  const tp2 =
    safeNumber(
      candidate.tp2,
      0
    ) ||
    null;

  const sl =
    safeNumber(
      candidate.sl,
      0
    );

  if (
    entryPrice <= 0 ||
    tp <= entryPrice ||
    sl <= 0
  ) {
    return {
      allowed:
        false,

      reason:
        "ALTCOIN ORDER LEVELS INVALID",
    };
  }

  const quantity =
    calculateQuantityFromCapital({
      capitalMYR:
        capital,

      entryPrice,
    });

  if (
    safeNumber(
      quantity,
      0
    ) <= 0
  ) {
    return {
      allowed:
        false,

      reason:
        "CAPITAL TOO SMALL",
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

    capitalMYR:
      capital,

    quantity,

    entryPrice,

    tp,

    tp2,

    sl,

    confidence:
      candidate.confidence ||
      "N/A",

    estimatedNetProfit:
      safeNumber(
        estimated?.netProfit,
        0
      ),

    candidate,
  };
}

async function sendPart9BuyConfirmation({
  chatId,
  coin,
  pendingToken,
  capitalMYR,
}) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return {
      sent:
        false,

      reason:
        "UNAUTHORIZED TELEGRAM CHAT",
    };
  }

  const checked =
    getPendingScalpingEntry(
      coin,
      pendingToken
    );

  if (
    !checked.valid
  ) {
    return {
      sent:
        false,

      reason:
        checked.reason,
    };
  }

  const candidate =
    checked.candidate;

  const orderPlan =
    await buildPart9OrderPlan(
      candidate,
      capitalMYR
    );

  if (
    !orderPlan?.allowed
  ) {
    return {
      sent:
        false,

      reason:
        orderPlan?.reason ||
        "ORDER PLAN REJECTED",
    };
  }

  const prepared =
    prepareConfirmedBuyIntent({
      chatId,

      coin,

      token:
        pendingToken,

      capital:
        capitalMYR,

      orderPlan,
    });

  if (
    !prepared.ready
  ) {
    return {
      sent:
        false,

      reason:
        prepared.reason,
    };
  }

  const intent =
    prepared.intent;

  SEMI_AUTO_SESSION
    .pendingCandidate =
    candidate;

  SEMI_AUTO_SESSION
    .pendingOrderPlan =
    orderPlan;

  SEMI_AUTO_SESSION
    .updatedAt =
    Date.now();

  if (
    SEMI_AUTO_SESSION.enabled &&
    String(
      SEMI_AUTO_SESSION.chatId
    ) ===
      String(chatId)
  ) {
    SEMI_AUTO_SESSION.state =
      SEMI_AUTO_SESSION_STATES
        .WAIT_BUY_CONFIRM;
  }

  const estimatedNet =
    safeNumber(
      orderPlan.estimatedNetProfit ??
      orderPlan.projectedNetProfit,
      0
    );

  const sent =
    await replyTelegram(
      chatId,

      `🟢 REAL LUNO BUY CONFIRMATION

🪙 ${intent.coin}
💳 Capital: ${formatMYR(
  intent.capital
)}
💵 Planned Entry: ${formatMYR(
  orderPlan.entryPrice
)}
📦 Estimated Quantity: ${safeNumber(
  orderPlan.quantity,
  0
).toLocaleString("en-MY")}
🎯 TP1: ${formatMYR(
  orderPlan.tp
)}
🚀 TP2: ${
  orderPlan.tp2
    ? formatMYR(
        orderPlan.tp2
      )
    : "N/A"
}
🛑 SL: ${formatMYR(
  orderPlan.sl
)}
💰 Est. Net @ TP1: ${formatMYR(
  estimatedNet
)}

⚠️ CONFIRM BUY akan hantar REAL BUY ke Luno TRADE account.`,

      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "✅ CONFIRM BUY",

                callback_data:
                  `CONFIRM_BUY:${intent.intentToken}`,
              },

              {
                text:
                  "❌ CANCEL",

                callback_data:
                  `CANCEL_BUY:${intent.intentToken}`,
              },
            ],
          ],
        },
      }
    );

  if (!sent) {
    delete PART7_EXECUTION_RUNTIME
      .buyIntents[
        intent.intentToken
      ];

    delete PENDING_ENTRIES[
      intent.coin
    ];

    SEMI_AUTO_SESSION
      .pendingCandidate =
      null;

    SEMI_AUTO_SESSION
      .pendingOrderPlan =
      null;

    SEMI_AUTO_SESSION
      .updatedAt =
      Date.now();

    if (
      SEMI_AUTO_SESSION.enabled &&
      String(
        SEMI_AUTO_SESSION.chatId
      ) ===
        String(chatId)
    ) {
      SEMI_AUTO_SESSION.state =
        SEMI_AUTO_SESSION_STATES
          .WAITING_SETUP;
    }

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

    intent,

    orderPlan,
  };
}

async function handlePart9StartEntry(
  chatId,
  coin,
  pendingToken
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return false;
  }

  const checked =
    getPendingScalpingEntry(
      coin,
      pendingToken
    );

  if (
    !checked.valid
  ) {
    return replyTelegram(
      chatId,

      `⚠️ ENTRY EXPIRED
${checked.reason}`
    );
  }

  if (
    SEMI_AUTO_SESSION.enabled &&
    String(
      SEMI_AUTO_SESSION.chatId
    ) ===
      String(chatId) &&
    safeNumber(
      SEMI_AUTO_SESSION
        .capitalMYR,
      0
    ) > 0
  ) {
    const result =
      await sendPart9BuyConfirmation({
        chatId,

        coin,

        pendingToken,

        capitalMYR:
          SEMI_AUTO_SESSION
            .capitalMYR,
      });

    if (
      !result.sent
    ) {
      return replyTelegram(
        chatId,

        `⚠️ BUY PLAN FAILED
${result.reason}`
      );
    }

    return result;
  }

  setPart9UserState(
    chatId,

    {
      step:
        "WAIT_ENTRY_CAPITAL",

      coin:
        normalizeCoin(
          coin
        ),

      pendingToken,
    }
  );

  return replyTelegram(
    chatId,

    `💳 ${normalizeCoin(
      coin
    )} ENTRY

Masukkan modal dalam RM.
Contoh: 500`
  );
}

function cancelPart9BuyIntent(
  intentToken,
  chatId
) {
  const checked =
    getValidBuyIntent(
      intentToken,
      chatId
    );

  if (
    !checked.valid
  ) {
    return {
      cancelled:
        false,

      reason:
        checked.reason,
    };
  }

  const coin =
    checked.intent.coin;

  delete PART7_EXECUTION_RUNTIME
    .buyIntents[
      intentToken
    ];

  delete PENDING_ENTRIES[
    coin
  ];

  SEMI_AUTO_SESSION
    .pendingCandidate =
    null;

  SEMI_AUTO_SESSION
    .pendingOrderPlan =
    null;

  SEMI_AUTO_SESSION
    .updatedAt =
    Date.now();

  SEMI_AUTO_SESSION.state =
    SEMI_AUTO_SESSION.enabled
      ? SEMI_AUTO_SESSION_STATES
          .WAITING_SETUP
      : SEMI_AUTO_SESSION_STATES
          .OFF;

  return {
    cancelled:
      true,

    coin,
  };
}

async function handlePart9ConfirmedBuy(
  chatId,
  intentToken
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return false;
  }

  const checked =
    getValidBuyIntent(
      intentToken,
      chatId
    );

  if (
    !checked.valid
  ) {
    return replyTelegram(
      chatId,

      `⚠️ BUY BLOCKED
${checked.reason}

No BUY submitted.`
    );
  }

  const coin =
    checked.intent.coin;

  await replyTelegram(
    chatId,

    `⏳ Submitting confirmed REAL BUY for ${coin}...`
  );

  const result =
    await submitConfirmedLunoMarketBuy({
      chatId,

      intentToken,
    });

  if (
    !result.ok
  ) {
    SEMI_AUTO_SESSION
      .lastError =
      result.reason;

    SEMI_AUTO_SESSION
      .updatedAt =
      Date.now();

    if (
      result.ambiguous
    ) {
      SEMI_AUTO_SESSION
        .lastDecision =
        `BUY STATUS UNKNOWN ${coin}`;

      return replyTelegram(
        chatId,

        `⚠️ REAL BUY STATUS UNKNOWN
${result.reason}

🚫 Jangan tekan BUY sekali lagi.
Client Order ID: ${
  result.clientOrderId ||
  "N/A"
}
Order ID: ${
  result.orderId ||
  "N/A"
}`
      );
    }

    SEMI_AUTO_SESSION
      .failCount++;

    return replyTelegram(
      chatId,

      `⚠️ REAL BUY FAILED
${result.reason}

No fake active trade created.`
    );
  }

  SEMI_AUTO_SESSION
    .pendingCandidate =
    null;

  SEMI_AUTO_SESSION
    .pendingOrderPlan =
    null;

  SEMI_AUTO_SESSION
    .lastError =
    null;

  SEMI_AUTO_SESSION
    .lastDecision =
    `REAL BUY FILLED ${coin}`;

  SEMI_AUTO_SESSION
    .updatedAt =
    Date.now();

  if (
    SEMI_AUTO_SESSION.enabled &&
    String(
      SEMI_AUTO_SESSION.chatId
    ) ===
      String(chatId)
  ) {
    SEMI_AUTO_SESSION.state =
      SEMI_AUTO_SESSION_STATES
        .POSITION_ACTIVE;
  }

  return replyTelegram(
    chatId,

    `✅ REAL BUY FILLED

🪙 ${coin}
💵 Avg Entry: ${formatMYR(
  result.execution.averagePrice
)}
📦 Filled: ${safeNumber(
  result.trade?.quantity,
  0
).toLocaleString("en-MY")}
🧾 Order ID: ${
  result.execution.orderId ||
  "N/A"
}

📡 Active trade monitor is now responsible for TP / SL alerts.`
  );
}

async function handlePart9SellNow(
  chatId,
  coin,
  intentToken
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return false;
  }

  const checked =
    getValidSellIntent(
      intentToken,
      coin,
      chatId
    );

  if (
    !checked.valid
  ) {
    return replyTelegram(
      chatId,

      `⚠️ SELL ACTION EXPIRED
${checked.reason}

No SELL submitted.`
    );
  }

  const trade =
    checked.trade;

  const snapshot =
    calculateActiveTradeNetSnapshot(
      trade,

      checked.intent
        .referencePrice
    );

  return replyTelegram(
    chatId,

    `🔴 REAL LUNO SELL CONFIRMATION

🪙 ${trade.coin}
📦 Quantity: ${safeNumber(
  trade.quantity,
  0
).toLocaleString("en-MY")}
💵 Reference: ${formatMYR(
  checked.intent
    .referencePrice
)}
💰 Est. Net P/L: ${formatMYR(
  snapshot
    ?.estimatedNetProfit ||
  0
)}
📌 Reason: ${
  checked.intent.reason
}

⚠️ CONFIRM SELL akan hantar REAL SELL ke Luno TRADE account.`,

    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🔴 CONFIRM SELL",

              callback_data:
                `CONFIRM_SELL:${trade.coin}:${intentToken}`,
            },

            {
              text:
                "🟢 HOLD",

              callback_data:
                `HOLD_TRADE:${trade.coin}:${intentToken}`,
            },
          ],
        ],
      },
    }
  );
}

async function handlePart9ConfirmedSell(
  chatId,
  coin,
  intentToken
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return false;
  }

  const checked =
    getValidSellIntent(
      intentToken,
      coin,
      chatId
    );

  if (
    !checked.valid
  ) {
    return replyTelegram(
      chatId,

      `⚠️ SELL BLOCKED
${checked.reason}

No SELL submitted.`
    );
  }

  await replyTelegram(
    chatId,

    `⏳ Submitting confirmed REAL SELL for ${normalizeCoin(
      coin
    )}...`
  );

  const result =
    await submitConfirmedLunoMarketSell({
      chatId,

      coin,

      intentToken,
    });

  if (
    !result.ok
  ) {
    SEMI_AUTO_SESSION
      .lastError =
      result.reason;

    SEMI_AUTO_SESSION
      .updatedAt =
      Date.now();

    if (
      result.ambiguous
    ) {
      SEMI_AUTO_SESSION
        .lastDecision =
        `SELL STATUS UNKNOWN ${normalizeCoin(
          coin
        )}`;

      return replyTelegram(
        chatId,

        `⚠️ REAL SELL STATUS UNKNOWN
${result.reason}

🚫 Jangan tekan SELL sekali lagi.
Client Order ID: ${
  result.clientOrderId ||
  "N/A"
}
Order ID: ${
  result.orderId ||
  "N/A"
}`
      );
    }

    SEMI_AUTO_SESSION
      .failCount++;

    return replyTelegram(
      chatId,

      `⚠️ REAL SELL FAILED
${result.reason}

Trade remains ACTIVE.`
    );
  }

  SEMI_AUTO_SESSION
    .lastError =
    null;

  SEMI_AUTO_SESSION
    .updatedAt =
    Date.now();

  if (
    result.partial
  ) {
    const remaining =
      result.trade;

    SEMI_AUTO_SESSION
      .lastDecision =
      `REAL PARTIAL SELL FILLED ${normalizeCoin(
        coin
      )}`;

    SEMI_AUTO_SESSION.state =
      SEMI_AUTO_SESSION.enabled
        ? SEMI_AUTO_SESSION_STATES
            .POSITION_ACTIVE
        : SEMI_AUTO_SESSION_STATES
            .OFF;

    return replyTelegram(
      chatId,

      `✅ REAL PARTIAL SELL FILLED

🪙 ${normalizeCoin(
  coin
)}
💵 Avg Sell: ${formatMYR(
  result.execution
    ?.averagePrice
)}
📦 Sold: ${safeNumber(
  result.execution?.base,
  0
).toLocaleString("en-MY")}
📦 Remaining: ${safeNumber(
  remaining?.quantity,
  0
).toLocaleString("en-MY")}
🧾 Order ID: ${
  result.execution?.orderId ||
  "N/A"
}

📡 Remaining position stays ACTIVE and monitored.`
    );
  }

  const closed =
    result.closedTrade;

  if (
    !closed
  ) {
    SEMI_AUTO_SESSION
      .failCount++;

    SEMI_AUTO_SESSION
      .lastError =
      "SELL RESULT MISSING CLOSED TRADE";

    return replyTelegram(
      chatId,

      `⚠️ SELL RESULT INVALID
Position state must be checked.`
    );
  }

  SEMI_AUTO_SESSION
    .successCount++;

  SEMI_AUTO_SESSION
    .cycleCount++;

  SEMI_AUTO_SESSION
    .lastDecision =
    `REAL SELL FILLED ${closed.coin}`;

  SEMI_AUTO_SESSION.state =
    SEMI_AUTO_SESSION.enabled
      ? SEMI_AUTO_SESSION_STATES
          .WAITING_SETUP
      : SEMI_AUTO_SESSION_STATES
          .OFF;

  return replyTelegram(
    chatId,

    `✅ REAL SELL FILLED

🪙 ${closed.coin}
💵 Avg Sell: ${formatMYR(
  closed.sellPrice
)}
📦 Sold: ${safeNumber(
  closed.soldQuantity,
  0
).toLocaleString("en-MY")}
💰 Realised Net P/L: ${formatMYR(
  closed.realisedNetProfit
)} (${formatPercent(
  closed.realisedNetProfitPct
)})
🧾 Order ID: ${
  closed.sellOrderId ||
  "N/A"
}${
  SEMI_AUTO_SESSION.enabled
    ? `

🤖 Semi-auto remains ON and returns to WAITING SETUP.`
    : ""
}`
  );
}

async function handlePart9Hold(
  chatId,
  coin,
  intentToken
) {
  if (
    !isPart9AuthorizedChat(
      chatId
    )
  ) {
    return false;
  }

  const checked =
    getValidSellIntent(
      intentToken,
      coin,
      chatId
    );

  if (
    !checked.valid
  ) {
    return replyTelegram(
      chatId,

      `⚠️ HOLD FAILED
${checked.reason}`
    );
  }

  const result =
    holdActiveTrade(
      coin,
      intentToken
    );

  if (
    !result.held
  ) {
    return replyTelegram(
      chatId,

      `⚠️ HOLD FAILED
${result.reason}`
    );
  }

  if (
    SEMI_AUTO_SESSION.enabled &&
    String(
      SEMI_AUTO_SESSION.chatId
    ) ===
      String(chatId)
  ) {
    SEMI_AUTO_SESSION.state =
      SEMI_AUTO_SESSION_STATES
        .POSITION_ACTIVE;

    SEMI_AUTO_SESSION.updatedAt =
      Date.now();
  }

  return replyTelegram(
    chatId,

    `🚀 ${result.trade.coin} HOLD CONFIRMED

Trade remains ACTIVE.
Old SELL button is now invalid.`
  );
}

async function handlePart9TextState(
  msg
) {
  const chatId =
    msg?.chat?.id;

  const text =
    String(
      msg?.text ||
      ""
    ).trim();

  if (
    !isPart9AuthorizedChat(
      chatId
    ) ||
    !text ||
    text.startsWith("/")
  ) {
    return false;
  }

  const state =
    getPart9UserState(
      chatId
    );

  if (!state) {
    return false;
  }

  if (
    state.step ===
    "WAIT_ENTRY_CAPITAL"
  ) {
    const capital =
      parsePart9Capital(
        text
      );

    if (!capital) {
      await replyTelegram(
        chatId,

        `⚠️ Modal tak sah. Minimum ${formatMYR(
          PART9_CONFIG
            .minCapitalMYR
        )}.`
      );

      return true;
    }

    clearPart9UserState(
      chatId
    );

    const result =
      await sendPart9BuyConfirmation({
        chatId,

        coin:
          state.coin,

        pendingToken:
          state.pendingToken,

        capitalMYR:
          capital,
      });

    if (
      !result.sent
    ) {
      await replyTelegram(
        chatId,

        `⚠️ BUY PLAN FAILED
${result.reason}`
      );
    }

    return true;
  }

  if (
    state.step ===
    "WAIT_AUTOTRADE_CAPITAL"
  ) {
    const capital =
      parsePart9Capital(
        text
      );

    if (!capital) {
      await replyTelegram(
        chatId,

        `⚠️ Modal tak sah. Minimum ${formatMYR(
          PART9_CONFIG
            .minCapitalMYR
        )}.`
      );

      return true;
    }

    clearPart9UserState(
      chatId
    );

    const armed =
      armPart9SemiAutoSession(
        chatId,
        capital
      );

    if (
      !armed.armed
    ) {
      await replyTelegram(
        chatId,

        `⚠️ SEMI-AUTO FAILED
${armed.reason}`
      );

      return true;
    }

    await replyTelegram(
      chatId,

      `🤖 SEMI-AUTO ARMED

💳 Capital: ${formatMYR(
  armed.session.capitalMYR
)}
📌 Status: WAITING SETUP

REAL BUY/SELL tetap perlukan confirmation Telegram.`
    );

    return true;
  }

  if (
    state.step ===
    "WAIT_GRT_HOLD_ENTRY"
  ) {
    const entryPrice =
      safeNumber(
        text,
        0
      );

    if (
      entryPrice <= 0
    ) {
      await replyTelegram(
        chatId,

        "⚠️ Entry price tak sah. Contoh: 0.0680"
      );

      return true;
    }

    setPart9UserState(
      chatId,

      {
        step:
          "WAIT_GRT_HOLD_QUANTITY",

        entryPrice,
      }
    );

    await replyTelegram(
      chatId,

      `📦 Masukkan quantity GRT.
Contoh: 10000`
    );

    return true;
  }

  if (
    state.step ===
    "WAIT_GRT_HOLD_QUANTITY"
  ) {
    const quantity =
      safeNumber(
        text.replace(
          /,/g,
          ""
        ),
        0
      );

    if (
      quantity <= 0
    ) {
      await replyTelegram(
        chatId,

        "⚠️ Quantity tak sah."
      );

      return true;
    }

    clearPart9UserState(
      chatId
    );

    try {
      const analysis =
        await analyzeGRTHoldPosition({
          entryPrice:
            state.entryPrice,

          quantity,
        });

      await replyTelegram(
        chatId,

        buildManualGRTHoldReport(
          analysis
        )
      );
    } catch (
      error
    ) {
      await replyTelegram(
        chatId,

        `⚠️ GRT HOLD error: ${
          error?.message ||
          String(error)
        }`
      );
    }

    return true;
  }

  return false;
}

function part9OwnerOnly(
  handler
) {
  return async (
    msg,
    match
  ) => {
    if (
      !isPart9AuthorizedChat(
        msg?.chat?.id
      )
    ) {
      return;
    }

    return handler(
      msg,
      match
    );
  };
}

bot.onText(
  /^\/start(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      await replyTelegram(
        msg.chat.id,

        `🤖 ${BUILD_NAME}

Service: ${SERVICE_CODE}
Mode: ${BUILD_MODE}

Commands:
/market
/flow
/grt24
/grthold
/learning
/tuning
/altstatus
/tradestatus
/autotrade [capital]
/autostatus
/autooff
/status
/health`
      );
    }
  )
);

bot.onText(
  /^\/market(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      try {
        await replyTelegram(
          msg.chat.id,

          await buildMarketStructureReport()
        );
      } catch (
        error
      ) {
        await replyTelegram(
          msg.chat.id,

          `⚠️ Market structure error: ${
            error?.message ||
            String(error)
          }`
        );
      }
    }
  )
);

bot.onText(
  /^\/flow(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      try {
        await replyTelegram(
          msg.chat.id,

          await build2HFlowReport()
        );
      } catch (
        error
      ) {
        await replyTelegram(
          msg.chat.id,

          `⚠️ Flow error: ${
            error?.message ||
            String(error)
          }`
        );
      }
    }
  )
);

bot.onText(
  /^\/grt24(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      try {
        await replyTelegram(
          msg.chat.id,

          await buildGRT24Report()
        );
      } catch (
        error
      ) {
        await replyTelegram(
          msg.chat.id,

          `⚠️ GRT24 error: ${
            error?.message ||
            String(error)
          }`
        );
      }
    }
  )
);

bot.onText(
  /^\/grthold(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      setPart9UserState(
        msg.chat.id,

        {
          step:
            "WAIT_GRT_HOLD_ENTRY",
        }
      );

      await replyTelegram(
        msg.chat.id,

        `📡 GRT HOLD CHECK

Masukkan ENTRY PRICE GRT.
Contoh: 0.0680`
      );
    }
  )
);

bot.onText(
  /^\/learning(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      const status =
        buildGRTLearningSummary();

      await replyTelegram(
        msg.chat.id,

        `🧪 GRT BUY NOW LEARNING

Records: ${status.total}
Completed: ${status.completed}
✅ Success: ${status.success}
❌ False: ${status.failed}
⏳ Pending: ${status.pending}
🎯 Accuracy: ${status.accuracy.toFixed(
  1
)}%
⚙️ BUY Volume Threshold: ${status.threshold.toFixed(
  0
)}%`
      );
    }
  )
);

bot.onText(
  /^\/tuning(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      await replyTelegram(
        msg.chat.id,

        buildGRTTuningReport()
      );
    }
  )
);

bot.onText(
  /^\/altstatus(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      const status =
        getAltcoinScannerStatus();

      await replyTelegram(
        msg.chat.id,

        `🪙 ALTCOIN SCANNER

Running: ${
  status.running
    ? "YES"
    : "NO"
}
Runs: ${safeNumber(
  status.totalRuns,
  0
)}
Errors: ${safeNumber(
  status.errors,
  0
)}
Last Duration: ${safeNumber(
  status.lastDurationMs,
  0
)} ms
Coins: XRP / XLM / CRV / AAVE`
      );
    }
  )
);

bot.onText(
  /^\/tradestatus(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      const status =
        getPart7ExecutionStatus();

      await replyTelegram(
        msg.chat.id,

        `📈 TRADE STATUS

Active: ${
  status.activeTrades.length
    ? status.activeTrades.join(", ")
    : "NONE"
}
Pending BUY intents: ${
  status.pendingBuyIntents
}
Pending SELL intents: ${
  status.pendingSellIntents
}
Execution locks: ${
  status.lockedExecutions
}
Unresolved orders: ${
  status.unresolvedOrders
}
Monitor: ${
  status.monitorRunning
    ? "RUNNING"
    : "IDLE"
}`
      );
    }
  )
);

bot.onText(
  /^\/autotrade(?:@\w+)?(?:\s+(.+))?$/i,

  part9OwnerOnly(
    async (
      msg,
      match
    ) => {
      const chatId =
        msg.chat.id;

      const raw =
        String(
          match?.[1] ||
          ""
        ).trim();

      if (!raw) {
        setPart9UserState(
          chatId,

          {
            step:
              "WAIT_AUTOTRADE_CAPITAL",
          }
        );

        return replyTelegram(
          chatId,

          `🤖 SEMI-AUTO SETUP

Masukkan modal dalam RM.
Contoh: 500

Setiap REAL BUY dan REAL SELL tetap perlukan confirmation Telegram.`
        );
      }

      const capital =
        parsePart9Capital(
          raw.split(
            /\s+/
          )[0]
        );

      if (!capital) {
        return replyTelegram(
          chatId,

          "⚠️ Modal tak sah. Contoh: /autotrade 500"
        );
      }

      const armed =
        armPart9SemiAutoSession(
          chatId,
          capital
        );

      if (
        !armed.armed
      ) {
        return replyTelegram(
          chatId,

          `⚠️ SEMI-AUTO FAILED
${armed.reason}`
        );
      }

      return replyTelegram(
        chatId,

        `🤖 SEMI-AUTO ARMED

💳 Capital: ${formatMYR(
  armed.session.capitalMYR
)}
📌 Status: WAITING SETUP

Bot scan setup.
Setiap REAL BUY/SELL tetap perlukan confirmation Telegram.`
      );
    }
  )
);

bot.onText(
  /^\/autostatus(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      await replyTelegram(
        msg.chat.id,

        buildPart9AutoStatusMessage()
      );
    }
  )
);

bot.onText(
  /^\/autooff(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      resetPart9SemiAutoSession(
        "USER /autooff"
      );

      clearPart9UserState(
        msg.chat.id
      );

      await replyTelegram(
        msg.chat.id,

        `⛔ SEMI-AUTO OFF

All pending BUY confirmations were invalidated.

Any existing ACTIVE trade remains monitored and still requires SELL confirmation.`
      );
    }
  )
);

bot.onText(
  /^\/status(?:@\w+)?$/i,

  part9OwnerOnly(
    async (
      msg
    ) => {
      const api =
        getLunoApiReadiness();

      const part7 =
        getPart7ExecutionStatus();

      await replyTelegram(
        msg.chat.id,

        `🩺 SYSTEM STATUS

📍 Service: ${SERVICE_CODE}
🧠 Build: ${BUILD_NAME}
⚙️ Mode: ${BUILD_MODE}

📡 MAIN API: ${
  api.mainReady
    ? "READY"
    : "NOT READY"
}
💳 TRADE API: ${
  api.tradeReady
    ? "READY"
    : "NOT READY"
}
📈 Active Trades: ${
  part7.activeTrades.length
}
⚠️ Unresolved Orders: ${
  part7.unresolvedOrders
}
🤖 Semi-Auto: ${
  SEMI_AUTO_SESSION.enabled
    ? SEMI_AUTO_SESSION.state
    : "OFF"
}`
      );
    }
  )
);

bot.on(
  "callback_query",

  async (
    query
  ) => {
    const chatId =
      query?.message?.chat?.id;

    const data =
      String(
        query?.data ||
        ""
      );

    if (
      !chatId ||
      !data
    ) {
      return;
    }

    if (
      !isPart9AuthorizedChat(
        chatId
      )
    ) {
      try {
        await bot.answerCallbackQuery(
          query.id,

          {
            text:
              "Unauthorized",
          }
        );
      } catch (_) {}

      return;
    }

    try {
      await bot.answerCallbackQuery(
        query.id
      );
    } catch (_) {}

    try {
      if (
        data.startsWith(
          "START_ENTRY:"
        )
      ) {
        const [
          ,
          coin,
          token,
        ] =
          data.split(":");

        return handlePart9StartEntry(
          chatId,
          coin,
          token
        );
      }

      if (
        data.startsWith(
          "SKIP_ENTRY:"
        )
      ) {
        const [
          ,
          coin,
          token,
        ] =
          data.split(":");

        const cleared =
          clearPendingScalpingEntry(
            coin,
            token
          );

        if (
          cleared.cleared &&
          SEMI_AUTO_SESSION
            .pendingCandidate
            ?.coin ===
            normalizeCoin(coin)
        ) {
          SEMI_AUTO_SESSION
            .pendingCandidate =
            null;

          SEMI_AUTO_SESSION
            .pendingOrderPlan =
            null;

          SEMI_AUTO_SESSION.state =
            SEMI_AUTO_SESSION.enabled
              ? SEMI_AUTO_SESSION_STATES
                  .WAITING_SETUP
              : SEMI_AUTO_SESSION_STATES
                  .OFF;

          SEMI_AUTO_SESSION
            .updatedAt =
            Date.now();
        }

        return replyTelegram(
          chatId,

          cleared.cleared
            ? `❌ ${normalizeCoin(
                coin
              )} entry skipped.`
            : `⚠️ ${
                cleared.reason
              }`
        );
      }

      if (
        data.startsWith(
          "CONFIRM_BUY:"
        )
      ) {
        return handlePart9ConfirmedBuy(
          chatId,

          data.slice(
            "CONFIRM_BUY:"
              .length
          )
        );
      }

      if (
        data.startsWith(
          "CANCEL_BUY:"
        )
      ) {
        const result =
          cancelPart9BuyIntent(
            data.slice(
              "CANCEL_BUY:"
                .length
            ),

            chatId
          );

        return replyTelegram(
          chatId,

          result.cancelled
            ? `❌ ${result.coin} REAL BUY cancelled. No order submitted.`
            : `⚠️ ${result.reason}`
        );
      }

      if (
        data.startsWith(
          "SELL_NOW:"
        )
      ) {
        const [
          ,
          coin,
          token,
        ] =
          data.split(":");

        return handlePart9SellNow(
          chatId,
          coin,
          token
        );
      }

      if (
        data.startsWith(
          "CONFIRM_SELL:"
        )
      ) {
        const [
          ,
          coin,
          token,
        ] =
          data.split(":");

        return handlePart9ConfirmedSell(
          chatId,
          coin,
          token
        );
      }

      if (
        data.startsWith(
          "HOLD_TRADE:"
        )
      ) {
        const [
          ,
          coin,
          token,
        ] =
          data.split(":");

        return handlePart9Hold(
          chatId,
          coin,
          token
        );
      }
    } catch (
      error
    ) {
      console.log(
        "PART 9 callback error:",

        error?.message ||
        String(error)
      );

      return replyTelegram(
        chatId,

        `⚠️ Action error: ${
          error?.message ||
          String(error)
        }`
      );
    }
  }
);

bot.on(
  "message",

  async (
    msg
  ) => {
    if (
      !isPart9AuthorizedChat(
        msg?.chat?.id
      )
    ) {
      return;
    }

    try {
      await handlePart9TextState(
        msg
      );
    } catch (
      error
    ) {
      console.log(
        "PART 9 message state error:",

        error?.message ||
        String(error)
      );
    }
  }
);

/* ============================================================
   END PART 9
============================================================ */
/* ============================================================
   PART 10 — BACKGROUND SERVICES + STARTUP + RECOVERY + HEALTH

   SAFETY:
   - Semi-auto is ALWAYS OFF after restart.
   - Pending BUY/SELL confirmations are NEVER recovered.
   - Durable Part 7 order journal is reconciled BEFORE recovery.
   - Active positions are restored for monitoring only after
     live TRADE-account verification.
   - Background services NEVER submit a real BUY/SELL.
============================================================ */

const PART10_HEALTH_TOKEN =
  String(
    process.env.PART10_HEALTH_TOKEN ||
    process.env.HEALTH_TOKEN ||
    ""
  ).trim();


const PART10_CONFIG = Object.freeze({
  semiAutoScanIntervalMs: 60 * 1000,
  persistenceIntervalMs: SEMI_AUTO_STATE_SAVE_INTERVAL,
  startupWarmupDelayMs: 1500,
  initialAltcoinScanDelayMs: 10 * 1000,
  recoveryBalanceTolerance: 1e-8,
  confirmationGuardMaxAgeMs:
    Math.max(
      safeNumber(
        PART7_EXECUTION_CONFIG
          .entryIntentMaxAgeMs,
        0
      ),
      60 * 1000
    ),
});

const PART10_RUNTIME = {
  bootstrapping: false,
  started: false,
  startedAt: null,
  schedulerStarted: false,
  fatalShutdownStarted: false,
  intervals: {},
  confirmationGuards: {},

  collector: {
    prices: {
      running: false,
      runs: 0,
      errors: 0,
      lastAt: null,
    },

    trades: {
      running: false,
      runs: 0,
      errors: 0,
      lastAt: null,
    },
  },

  grtScanner: {
    running: false,
    runs: 0,
    errors: 0,
    lastAt: null,
    lastResult: null,
  },

  semiAuto: {
    running: false,
    runs: 0,
    errors: 0,
    lastAt: null,
    lastReason: null,
  },

  persistence: {
    saves: 0,
    errors: 0,
    lastAt: null,
  },

  recovery: {
    loaded: false,
    activeTradeCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,

    unresolvedJournalCount: 0,
    journalCheckedAt: null,

    journalBlocked: false,
    activeRecoveryBlocked: false,
    persistenceBlocked: false,

    lastAt: null,
    error: null,

    results: [],
    journalResults: [],
  },
};


function refreshPart10PersistenceBlock() {
  PART10_RUNTIME
    .recovery
    .persistenceBlocked =
    Boolean(
      PART10_RUNTIME
        .recovery
        .journalBlocked ||
      PART10_RUNTIME
        .recovery
        .activeRecoveryBlocked
    );

  return PART10_RUNTIME
    .recovery
    .persistenceBlocked;
}


function isPart10HttpHealthAuthorized(
  req
) {
  if (
    !PART10_HEALTH_TOKEN
  ) {
    return false;
  }

  const direct =
    String(
      req
        ?.headers
        ?.["x-health-token"] ||
      ""
    ).trim();

  if (
    direct &&
    direct ===
      PART10_HEALTH_TOKEN
  ) {
    return true;
  }

  const authorization =
    String(
      req
        ?.headers
        ?.authorization ||
      ""
    ).trim();

  const bearer =
    authorization
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

  return Boolean(
    bearer &&
    bearer ===
      PART10_HEALTH_TOKEN
  );
}


function prunePart10ConfirmationGuards() {
  const now =
    Date.now();

  for (
    const [
      key,
      sentAt,
    ] of Object.entries(
      PART10_RUNTIME
        .confirmationGuards
    )
  ) {
    if (
      now -
        safeNumber(
          sentAt,
          0
        ) >
      PART10_CONFIG
        .confirmationGuardMaxAgeMs
    ) {
      delete PART10_RUNTIME
        .confirmationGuards[
          key
        ];
    }
  }
}


function getPart10ConfirmationGuardKey(
  coin,
  pendingToken
) {
  return `${normalizeCoin(
    coin
  )}:${String(
    pendingToken ||
    "NO_TOKEN"
  )}`;
}


async function sendPart10BuyConfirmationOnce({
  chatId,
  coin,
  pendingToken,
  capitalMYR,
}) {
  prunePart10ConfirmationGuards();

  const key =
    getPart10ConfirmationGuardKey(
      coin,
      pendingToken
    );

  const existingAt =
    safeNumber(
      PART10_RUNTIME
        .confirmationGuards[
          key
        ],
      0
    );

  if (
    existingAt >
      0 &&
    Date.now() -
      existingAt <=
    PART10_CONFIG
      .confirmationGuardMaxAgeMs
  ) {
    return {
      sent: false,
      duplicate: true,
      reason:
        "BUY CONFIRMATION ALREADY SENT",
    };
  }

  const result =
    await sendPart9BuyConfirmation({
      chatId,
      coin,
      pendingToken,
      capitalMYR,
    });

  if (
    result
      ?.sent
  ) {
    PART10_RUNTIME
      .confirmationGuards[
        key
      ] =
      Date.now();
  }

  return result;
}


/* ============================================================
   SAFE JSON
============================================================ */

function safePart10WriteJSON(
  file,
  data
) {
  try {
    const temp =
      `${file}.tmp`;

    fs.writeFileSync(
      temp,
      JSON.stringify(
        data,
        null,
        2
      ),
      "utf8"
    );

    fs.renameSync(
      temp,
      file
    );

    return true;

  } catch (
    error
  ) {
    console.log(
      `PART10 write error ${file}:`,
      error.message
    );

    return false;
  }
}


function safePart10ReadJSON(
  file,
  fallback = null
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

    return raw
      ? JSON.parse(
          raw
        )
      : fallback;

  } catch (
    error
  ) {
    console.log(
      `PART10 read error ${file}:`,
      error.message
    );

    return fallback;
  }
}


/* ============================================================
   ACTIVE TRADE PERSISTENCE
============================================================ */

function getRecoverableActiveTradesSnapshot() {
  const snapshot =
    {};

  for (
    const [
      coin,
      trade,
    ] of Object.entries(
      ACTIVE_TRADES
    )
  ) {
    if (
      !trade ||
      trade.status ===
        "CLOSED"
    ) {
      continue;
    }

    snapshot[
      coin
    ] =
      trade;
  }

  return snapshot;
}


function savePart10ActiveTradeState() {
  if (
    PART10_RUNTIME
      .recovery
      .persistenceBlocked
  ) {
    PART10_RUNTIME
      .persistence
      .errors++;

    return false;
  }

  const ok =
    safePart10WriteJSON(
      ACTIVE_TRADE_STATE_FILE,
      {
        savedAt:
          Date.now(),

        activeTrades:
          getRecoverableActiveTradesSnapshot(),
      }
    );

  if (ok) {
    PART10_RUNTIME
      .persistence
      .saves++;

    PART10_RUNTIME
      .persistence
      .lastAt =
      Date.now();

  } else {
    PART10_RUNTIME
      .persistence
      .errors++;
  }

  return ok;
}


function savePart10SemiAutoSnapshot() {
  return safePart10WriteJSON(
    SEMI_AUTO_STATE_FILE,
    {
      savedAt:
        Date.now(),

      session: {
        enabled:
          false,

        state:
          SEMI_AUTO_SESSION_STATES
            .OFF,

        cycleCount:
          safeNumber(
            SEMI_AUTO_SESSION
              .cycleCount,
            0
          ),

        successCount:
          safeNumber(
            SEMI_AUTO_SESSION
              .successCount,
            0
          ),

        failCount:
          safeNumber(
            SEMI_AUTO_SESSION
              .failCount,
            0
          ),

        lastDecision:
          SEMI_AUTO_SESSION
            .lastDecision ||
          null,

        lastError:
          SEMI_AUTO_SESSION
            .lastError ||
          null,
      },
    }
  );
}


function saveAllPart10PersistentState() {
  return {
    activeTrades:
      savePart10ActiveTradeState(),

    semiAuto:
      savePart10SemiAutoSnapshot(),

    learning:
      saveGRTBuyNowHistory(),

    tuning:
      saveGRTTuning(),

    daily:
      saveDailyWatchState(),
  };
}


/* ============================================================
   FORCE SEMI-AUTO OFF AFTER RESTART
============================================================ */

function forceSemiAutoOffOnBoot() {
  SEMI_AUTO_SESSION
    .enabled =
    false;

  SEMI_AUTO_SESSION
    .state =
    SEMI_AUTO_SESSION_STATES
      .OFF;

  SEMI_AUTO_SESSION
    .chatId =
    null;

  SEMI_AUTO_SESSION
    .capitalMYR =
    0;

  SEMI_AUTO_SESSION
    .startedAt =
    null;

  SEMI_AUTO_SESSION
    .updatedAt =
    Date.now();

  SEMI_AUTO_SESSION
    .pendingCandidate =
    null;

  SEMI_AUTO_SESSION
    .pendingOrderPlan =
    null;

  SEMI_AUTO_SESSION
    .lastDecision =
    "AUTO OFF AFTER RESTART";

  SEMI_AUTO_SESSION
    .lastError =
    null;


  for (
    const coin of
    Object.keys(
      PENDING_ENTRIES
    )
  ) {
    delete PENDING_ENTRIES[
      coin
    ];
  }


  PART7_EXECUTION_RUNTIME
    .buyIntents =
    {};

  PART7_EXECUTION_RUNTIME
    .sellIntents =
    {};

  PART7_EXECUTION_RUNTIME
    .locks =
    {};

  return true;
}


/* ============================================================
   RECONCILE DURABLE PART 7 ORDER JOURNAL

   IMPORTANT:
   - BEFORE active-trade recovery.
   - NEVER submits an order.
   - Unknown / filled-but-local-state-unknown remains unresolved.
============================================================ */

async function reconcilePart10OrderJournal() {
  const unresolved =
    getPart7UnresolvedOrderJournalEntries();

  const results =
    [];

  let remaining =
    0;


  PART10_RUNTIME
    .recovery
    .journalCheckedAt =
    Date.now();


  if (
    !unresolved.length
  ) {
    PART10_RUNTIME
      .recovery
      .unresolvedJournalCount =
      0;

    PART10_RUNTIME
      .recovery
      .journalResults =
      [];

    PART10_RUNTIME
      .recovery
      .journalBlocked =
      false;

    refreshPart10PersistenceBlock();

    return {
      checked:
        true,

      unresolved:
        0,

      results:
        [],
    };
  }


  if (
    !LUNO_API_STATUS
      .tradeReady
  ) {
    PART10_RUNTIME
      .recovery
      .unresolvedJournalCount =
      unresolved.length;

    PART10_RUNTIME
      .recovery
      .journalBlocked =
      true;

    refreshPart10PersistenceBlock();

    PART10_RUNTIME
      .recovery
      .journalResults =
      unresolved.map(
        (
          entry
        ) => ({
          clientOrderId:
            entry.clientOrderId,

          coin:
            entry.coin ||
            null,

          side:
            entry.side ||
            null,

          resolved:
            false,

          reason:
            "TRADE API NOT READY",
        })
      );

    return {
      checked:
        false,

      unresolved:
        unresolved.length,

      reason:
        "TRADE API NOT READY",

      results:
        PART10_RUNTIME
          .recovery
          .journalResults,
    };
  }


  for (
    const entry of
    unresolved
  ) {
    const clientOrderId =
      entry.clientOrderId;

    try {
      const reconciled =
        await reconcilePart7SubmittedOrder({
          orderId:
            entry.orderId ||
            null,

          clientOrderId,
        });


      if (
        !reconciled.found
      ) {
        remaining++;

        upsertPart7OrderJournalEntry(
          clientOrderId,
          {
            status:
              entry.status ||
              "UNRESOLVED",

            resolved:
              false,

            lastRecoveryCheckAt:
              Date.now(),

            lastRecoveryError:
              reconciled.error ||
              "ORDER NOT FOUND YET",
          }
        );

        results.push({
          clientOrderId,

          coin:
            entry.coin ||
            null,

          side:
            entry.side ||
            null,

          resolved:
            false,

          reason:
            reconciled.error ||
            "ORDER NOT FOUND YET",
        });

        continue;
      }


      const execution =
        normalizePart7Execution(
          reconciled.order,
          {
            orderId:
              entry.orderId ||
              null,

            clientOrderId,

            pair:
              entry.pair ||
              null,

            side:
              entry.side ||
              null,
          }
        );


      if (
        isPart7SuccessfulOrderState(
          execution.state
        )
      ) {
        const side =
          String(
            entry.side ||
            "ORDER"
          ).toUpperCase();

        upsertPart7OrderJournalEntry(
          clientOrderId,
          {
            status:
              `${side}_FILLED_LOCAL_STATE_PENDING`,

            resolved:
              false,

            orderId:
              execution.orderId ||
              entry.orderId ||
              null,

            orderState:
              execution.state,

            execution,

            lastRecoveryCheckAt:
              Date.now(),
          }
        );

        remaining++;

        results.push({
          clientOrderId,

          coin:
            entry.coin ||
            null,

          side,

          resolved:
            false,

          filled:
            true,

          reason:
            "LUNO FILLED — LOCAL STATE MUST BE VERIFIED",

          execution,
        });

        continue;
      }


      if (
        isPart7FinalOrderState(
          execution.state
        )
      ) {
        const side =
          String(
            entry.side ||
            "ORDER"
          ).toUpperCase();

        resolvePart7OrderJournalEntry(
          clientOrderId,
          `${side}_FINAL_NOT_FILLED`,
          {
            orderId:
              execution.orderId ||
              entry.orderId ||
              null,

            orderState:
              execution.state,

            execution,

            recoveredAt:
              Date.now(),
          }
        );

        results.push({
          clientOrderId,

          coin:
            entry.coin ||
            null,

          side,

          resolved:
            true,

          filled:
            false,

          state:
            execution.state,
        });

        continue;
      }


      remaining++;

      upsertPart7OrderJournalEntry(
        clientOrderId,
        {
          status:
            `${String(
              entry.side ||
              "ORDER"
            ).toUpperCase()}_UNRESOLVED`,

          resolved:
            false,

          orderId:
            execution.orderId ||
            entry.orderId ||
            null,

          orderState:
            execution.state,

          execution,

          lastRecoveryCheckAt:
            Date.now(),
        }
      );

      results.push({
        clientOrderId,

        coin:
          entry.coin ||
          null,

        side:
          entry.side ||
          null,

        resolved:
          false,

        state:
          execution.state,
      });

    } catch (
      error
    ) {
      remaining++;

      results.push({
        clientOrderId,

        coin:
          entry.coin ||
          null,

        side:
          entry.side ||
          null,

        resolved:
          false,

        reason:
          error?.message ||
          String(error),
      });
    }
  }


  PART10_RUNTIME
    .recovery
    .unresolvedJournalCount =
    remaining;

  PART10_RUNTIME
    .recovery
    .journalResults =
    results;

  PART10_RUNTIME
    .recovery
    .journalBlocked =
    remaining >
    0;

  refreshPart10PersistenceBlock();


  return {
    checked:
      true,

    unresolved:
      remaining,

    results,
  };
}


/* ============================================================
   VERIFY SAVED ACTIVE POSITION
============================================================ */

async function verifyPart10RecoveredTrade(
  coin,
  rawTrade,
  balances
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const savedQuantity =
    safeNumber(
      rawTrade
        ?.quantity,
      0
    );


  if (
    !rawTrade ||
    rawTrade.status ===
      "CLOSED"
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        "NOT ACTIVE",
    };
  }


  if (
    !normalized ||
    !isPart9SupportedTradeCoin(
      normalized
    )
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        "UNSUPPORTED RECOVERY COIN",
    };
  }


  if (
    savedQuantity <=
      0 ||
    safeNumber(
      rawTrade
        .entryPrice,
      0
    ) <=
      0
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        "INVALID SAVED POSITION",
    };
  }


  const available =
    getPart7AvailableBalance(
      balances,
      normalized
    );


  if (
    available <=
    PART10_CONFIG
      .recoveryBalanceTolerance
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        "NO LIVE TRADE BALANCE",
    };
  }


  let buyOrder =
    null;


  try {
    if (
      rawTrade
        .buyOrderId
    ) {
      buyOrder =
        await getPart7Order(
          rawTrade
            .buyOrderId
        );

    } else if (
      rawTrade
        .buyClientOrderId
    ) {
      buyOrder =
        await getPart7OrderByClientOrderId(
          rawTrade
            .buyClientOrderId
        );

    } else {
      return {
        verified:
          false,

        coin:
          normalized,

        reason:
          "BUY ORDER REFERENCE MISSING",
      };
    }

  } catch (
    error
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        `BUY ORDER VERIFY FAILED: ${error.message}`,
    };
  }


  const state =
    String(
      buyOrder
        ?.state ||
      buyOrder
        ?.status ||
      "UNKNOWN"
    ).toUpperCase();


  if (
    !isPart7SuccessfulOrderState(
      state
    )
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        `BUY ORDER NOT COMPLETE: ${state}`,
    };
  }


  const restoredQuantity =
    Math.min(
      savedQuantity,
      available
    );


  if (
    restoredQuantity <=
    PART10_CONFIG
      .recoveryBalanceTolerance
  ) {
    return {
      verified:
        false,

      coin:
        normalized,

      reason:
        "RECOVERABLE QUANTITY ZERO",
    };
  }


  return {
    verified:
      true,

    coin:
      normalized,

    liveAvailable:
      available,

    restoredQuantity,

    quantityAdjusted:
      restoredQuantity +
        PART10_CONFIG
          .recoveryBalanceTolerance <
      savedQuantity,

    buyOrderState:
      state,
  };
}


function restorePart10VerifiedTrade(
  rawTrade,
  check
) {
  ACTIVE_TRADES[
    check.coin
  ] = {
    ...rawTrade,

    coin:
      check.coin,

    quantity:
      check
        .restoredQuantity,

    status:
      "ACTIVE",

    sellIntentToken:
      null,

    lastSellSignalAt:
      null,

    recoveredAt:
      Date.now(),

    recoveryVerified:
      true,

    recoveryLiveBalance:
      check
        .liveAvailable,

    recoveryQuantityAdjusted:
      check
        .quantityAdjusted,
  };

  return ACTIVE_TRADES[
    check.coin
  ];
}


function prunePart10SavedActiveTrade(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const saved =
    safePart10ReadJSON(
      ACTIVE_TRADE_STATE_FILE,
      null
    );

  if (
    !saved ||
    !saved.activeTrades ||
    typeof saved.activeTrades !==
      "object" ||
    Array.isArray(
      saved.activeTrades
    )
  ) {
    return true;
  }

  if (
    !Object.prototype
      .hasOwnProperty
      .call(
        saved.activeTrades,
        normalized
      )
  ) {
    return true;
  }

  delete saved
    .activeTrades[
      normalized
    ];

  saved.savedAt =
    Date.now();

  return safePart10WriteJSON(
    ACTIVE_TRADE_STATE_FILE,
    saved
  );
}


async function reconcilePart10FilledLocalStatePending() {
  const pending =
    getPart7UnresolvedOrderJournalEntries()
      .filter(
        (
          entry
        ) =>
          String(
            entry
              ?.status ||
            ""
          ).endsWith(
            "_FILLED_LOCAL_STATE_PENDING"
          )
      );

  if (
    !pending.length
  ) {
    PART10_RUNTIME
      .recovery
      .unresolvedJournalCount =
      getPart7UnresolvedOrderJournalEntries()
        .length;

    PART10_RUNTIME
      .recovery
      .journalBlocked =
      PART10_RUNTIME
        .recovery
        .unresolvedJournalCount >
      0;

    refreshPart10PersistenceBlock();

    return {
      checked: true,
      resolved: 0,
      unresolved:
        PART10_RUNTIME
          .recovery
          .unresolvedJournalCount,
      results: [],
    };
  }

  if (
    !LUNO_API_STATUS
      .tradeReady
  ) {
    PART10_RUNTIME
      .recovery
      .journalBlocked =
      true;

    PART10_RUNTIME
      .recovery
      .unresolvedJournalCount =
      getPart7UnresolvedOrderJournalEntries()
        .length;

    refreshPart10PersistenceBlock();

    return {
      checked: false,
      resolved: 0,
      unresolved:
        PART10_RUNTIME
          .recovery
          .unresolvedJournalCount,
      reason:
        "TRADE API NOT READY",
      results: [],
    };
  }

  const balances =
    await getPart7TradeBalances();

  const saved =
    safePart10ReadJSON(
      ACTIVE_TRADE_STATE_FILE,
      null
    );

  const savedTrades =
    saved
      ?.activeTrades &&
    typeof saved.activeTrades ===
      "object" &&
    !Array.isArray(
      saved.activeTrades
    )
      ? saved.activeTrades
      : {};

  const results =
    [];

  let resolved =
    0;

  for (
    const entry of
    pending
  ) {
    const clientOrderId =
      entry.clientOrderId;

    const coin =
      normalizeCoin(
        entry.coin
      );

    const side =
      String(
        entry.side ||
        ""
      ).toUpperCase();

    if (
      !clientOrderId ||
      !coin ||
      !side
    ) {
      results.push({
        clientOrderId:
          clientOrderId ||
          null,
        coin:
          coin ||
          null,
        side:
          side ||
          null,
        resolved: false,
        reason:
          "MISSING JOURNAL IDENTITY",
      });

      continue;
    }

    if (
      side ===
      "BUY"
    ) {
      const rawTrade =
        savedTrades[
          coin
        ];

      const check =
        await verifyPart10RecoveredTrade(
          coin,
          rawTrade,
          balances
        );

      if (
        !check.verified
      ) {
        results.push({
          clientOrderId,
          coin,
          side,
          resolved: false,
          reason:
            check.reason ||
            "BUY LOCAL STATE NOT VERIFIED",
        });

        continue;
      }

      restorePart10VerifiedTrade(
        rawTrade,
        check
      );

      resolvePart7OrderJournalEntry(
        clientOrderId,
        "BUY_FILLED_LOCAL_STATE_VERIFIED",
        {
          recoveredAt:
            Date.now(),
          recoveryVerified:
            true,
          liveBalance:
            check.liveAvailable,
        }
      );

      resolved++;

      results.push({
        clientOrderId,
        coin,
        side,
        resolved: true,
        reason:
          "BUY POSITION VERIFIED AGAINST LIVE ACCOUNT",
      });

      continue;
    }

    if (
      side ===
      "SELL"
    ) {
      const available =
        getPart7AvailableBalance(
          balances,
          coin
        );

      if (
        available >
        PART10_CONFIG
          .recoveryBalanceTolerance
      ) {
        results.push({
          clientOrderId,
          coin,
          side,
          resolved: false,
          reason:
            "LIVE BALANCE STILL PRESENT AFTER SELL",
          liveBalance:
            available,
        });

        continue;
      }

      delete ACTIVE_TRADES[
        coin
      ];

      const pruned =
        prunePart10SavedActiveTrade(
          coin
        );

      if (
        !pruned
      ) {
        results.push({
          clientOrderId,
          coin,
          side,
          resolved: false,
          reason:
            "FAILED TO PRUNE STALE SAVED POSITION",
        });

        continue;
      }

      resolvePart7OrderJournalEntry(
        clientOrderId,
        "SELL_FILLED_LOCAL_STATE_VERIFIED",
        {
          recoveredAt:
            Date.now(),
          recoveryVerified:
            true,
          liveBalance:
            available,
        }
      );

      resolved++;

      results.push({
        clientOrderId,
        coin,
        side,
        resolved: true,
        reason:
          "SELL VERIFIED — LIVE POSITION CLOSED",
      });

      continue;
    }

    results.push({
      clientOrderId,
      coin,
      side,
      resolved: false,
      reason:
        "UNSUPPORTED JOURNAL SIDE",
    });
  }

  const remaining =
    getPart7UnresolvedOrderJournalEntries()
      .length;

  PART10_RUNTIME
    .recovery
    .unresolvedJournalCount =
    remaining;

  PART10_RUNTIME
    .recovery
    .journalBlocked =
    remaining >
    0;

  refreshPart10PersistenceBlock();

  return {
    checked: true,
    resolved,
    unresolved:
      remaining,
    results,
  };
}


/* ============================================================
   RECOVER ACTIVE TRADES
============================================================ */

async function recoverPart10ActiveTrades() {
  PART10_RUNTIME
    .recovery
    .lastAt =
    Date.now();

  PART10_RUNTIME
    .recovery
    .results =
    [];

  PART10_RUNTIME
    .recovery
    .error =
    null;


  try {
    const saved =
      safePart10ReadJSON(
        ACTIVE_TRADE_STATE_FILE,
        null
      );

    const active =
      saved
        ?.activeTrades;


    if (
      !active ||
      typeof active !==
        "object" ||
      Array.isArray(
        active
      )
    ) {
      PART10_RUNTIME
        .recovery
        .loaded =
        true;

      PART10_RUNTIME
        .recovery
        .activeTradeCount =
        0;

      PART10_RUNTIME
        .recovery
        .verifiedCount =
        0;

      PART10_RUNTIME
        .recovery
        .rejectedCount =
        0;

      PART10_RUNTIME
        .recovery
        .activeRecoveryBlocked =
        false;

      refreshPart10PersistenceBlock();

      return {
        recovered:
          true,

        count:
          0,

        verified:
          0,

        rejected:
          0,

        results:
          [],
      };
    }


    const entries =
      Object.entries(
        active
      );


    if (
      !entries.length
    ) {
      PART10_RUNTIME
        .recovery
        .loaded =
        true;

      PART10_RUNTIME
        .recovery
        .activeTradeCount =
        0;

      PART10_RUNTIME
        .recovery
        .verifiedCount =
        0;

      PART10_RUNTIME
        .recovery
        .rejectedCount =
        0;

      PART10_RUNTIME
        .recovery
        .activeRecoveryBlocked =
        false;

      refreshPart10PersistenceBlock();

      return {
        recovered:
          true,

        count:
          0,

        verified:
          0,

        rejected:
          0,

        results:
          [],
      };
    }


    if (
      !LUNO_API_STATUS
        .tradeReady
    ) {
      PART10_RUNTIME
        .recovery
        .loaded =
        true;

      PART10_RUNTIME
        .recovery
        .error =
        "TRADE API NOT READY — RECOVERY DEFERRED";

      PART10_RUNTIME
        .recovery
        .rejectedCount =
        entries.length;

      PART10_RUNTIME
        .recovery
        .activeRecoveryBlocked =
        true;

      refreshPart10PersistenceBlock();

      return {
        recovered:
          false,

        deferred:
          true,

        count:
          0,

        verified:
          0,

        rejected:
          entries.length,

        error:
          PART10_RUNTIME
            .recovery
            .error,

        results:
          [],
      };
    }


    const balances =
      await getPart7TradeBalances();


    let verified =
      0;

    let rejected =
      0;

    const results =
      [];


    for (
      const [
        rawCoin,
        rawTrade,
      ] of entries
    ) {
      const check =
        await verifyPart10RecoveredTrade(
          rawCoin,
          rawTrade,
          balances
        );

      results.push(
        check
      );


      if (
        !check.verified
      ) {
        rejected++;

        continue;
      }


      restorePart10VerifiedTrade(
        rawTrade,
        check
      );

      verified++;
    }


    PART10_RUNTIME
      .recovery
      .loaded =
      true;

    PART10_RUNTIME
      .recovery
      .activeTradeCount =
      verified;

    PART10_RUNTIME
      .recovery
      .verifiedCount =
      verified;

    PART10_RUNTIME
      .recovery
      .rejectedCount =
      rejected;

    PART10_RUNTIME
      .recovery
      .results =
      results;


    PART10_RUNTIME
      .recovery
      .activeRecoveryBlocked =
      rejected >
      0;

    refreshPart10PersistenceBlock();

    if (
      !PART10_RUNTIME
        .recovery
        .persistenceBlocked
    ) {
      savePart10ActiveTradeState();
    }


    return {
      recovered:
        rejected ===
        0,

      count:
        verified,

      verified,

      rejected,

      results,

      persistenceBlocked:
        PART10_RUNTIME
          .recovery
          .persistenceBlocked,
    };

  } catch (
    error
  ) {
    PART10_RUNTIME
      .recovery
      .loaded =
      true;

    PART10_RUNTIME
      .recovery
      .error =
      error.message;

    PART10_RUNTIME
      .recovery
      .activeTradeCount =
      0;

    PART10_RUNTIME
      .recovery
      .activeRecoveryBlocked =
      true;

    refreshPart10PersistenceBlock();

    return {
      recovered:
        false,

      deferred:
        true,

      count:
        0,

      verified:
        0,

      rejected:
        0,

      error:
        error.message,

      results:
        [],
    };
  }
}


/* ============================================================
   EXECUTED TRADE COLLECTOR
============================================================ */

async function collectPart10ExecutedTradesForCoin(
  coin
) {
  const normalized =
    normalizeCoin(
      coin
    );

  const memory =
    TRADE_HISTORY[
      normalized
    ] ||
    [];

  const latest =
    memory[
      memory.length -
      1
    ];

  const since =
    latest
      ?.timestamp ||
    null;

  const trades =
    await getRecentTrades(
      normalized,
      since
    );

  let added =
    0;


  for (
    const trade of
    trades
  ) {
    if (
      storeExecutedTrade(
        normalized,
        trade
      )
    ) {
      added++;

      updateDailyWatchTrade(
        normalized,
        trade
      );
    }
  }


  return {
    coin:
      normalized,

    received:
      trades.length,

    added,
  };
}


/* ============================================================
   EXECUTED TRADE COLLECTOR RUNNER
============================================================ */

async function runPart10ExecutedTradeCollector() {
  const runtime =
    PART10_RUNTIME
      .collector
      .trades;


  if (
    runtime.running ||
    TRADE_HISTORY_BUSY
  ) {
    return {
      skipped:
        true,

      reason:
        "TRADE COLLECTOR BUSY",
    };
  }


  runtime.running =
    true;

  TRADE_HISTORY_BUSY =
    true;


  try {
    const results =
      [];


    for (
      const coin of
      SCAN_COINS
    ) {
      try {
        results.push(
          await collectPart10ExecutedTradesForCoin(
            coin
          )
        );

      } catch (
        error
      ) {
        runtime.errors++;

        results.push({
          coin,

          error:
            error.message,
        });
      }
    }


    runtime.runs++;

    runtime.lastAt =
      Date.now();

    const successCount =
      results.filter(
        (
          item
        ) =>
          !item.error
      ).length;

    SYSTEM_HEALTH
      .tradeCollectorReady =
      successCount >
      0;

    if (
      !SYSTEM_HEALTH
        .tradeCollectorReady
    ) {
      SYSTEM_HEALTH
        .lastCriticalError =
        "TRADE COLLECTOR: NO COIN SUCCEEDED";
    }


    return {
      skipped:
        false,

      results,
    };

  } finally {
    runtime.running =
      false;

    TRADE_HISTORY_BUSY =
      false;
  }
}


/* ============================================================
   PRICE COLLECTOR
============================================================ */

async function runPart10PriceCollector() {
  const runtime =
    PART10_RUNTIME
      .collector
      .prices;


  if (
    runtime.running
  ) {
    return {
      skipped:
        true,

      reason:
        "PRICE COLLECTOR BUSY",
    };
  }


  runtime.running =
    true;


  try {
    const results =
      [];


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
          results.push({
            coin,

            ready:
              false,
          });

          continue;
        }


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

          ready:
            true,

          price:
            ticker.currentPrice,
        });

      } catch (
        error
      ) {
        runtime.errors++;

        results.push({
          coin,

          ready:
            false,

          error:
            error.message,
        });
      }
    }


    runtime.runs++;

    runtime.lastAt =
      Date.now();

    const successCount =
      results.filter(
        (
          item
        ) =>
          item.ready ===
          true
      ).length;

    SYSTEM_HEALTH
      .priceCollectorReady =
      successCount >
      0;

    if (
      !SYSTEM_HEALTH
        .priceCollectorReady
    ) {
      SYSTEM_HEALTH
        .lastCriticalError =
        "PRICE COLLECTOR: NO COIN SUCCEEDED";
    }


    return {
      skipped:
        false,

      results,
    };

  } finally {
    runtime.running =
      false;
  }
}


/* ============================================================
   STAGE SEMI-AUTO ENTRY
============================================================ */

function stagePart10PendingEntry(
  candidate
) {
  if (
    !candidate
      ?.allowed ||
    !candidate
      ?.coin
  ) {
    return {
      staged:
        false,

      reason:
        "INVALID CANDIDATE",
    };
  }


  const coin =
    normalizeCoin(
      candidate.coin
    );


  if (
    ACTIVE_TRADES[
      coin
    ]
  ) {
    return {
      staged:
        false,

      reason:
        "ACTIVE TRADE EXISTS",
    };
  }


  const existing =
    PENDING_ENTRIES[
      coin
    ];


  if (
    existing &&
    Date.now() -
      safeNumber(
        existing.pendingAt,
        0
      ) <=
      PART7_EXECUTION_CONFIG
        .entryIntentMaxAgeMs
  ) {
    return {
      staged:
        true,

      pending:
        existing,

      existing:
        true,
    };
  }


  const pendingToken =
    createPart7IntentToken(
      "ENTRY",
      coin
    );


  const pending = {
    ...candidate,

    coin,

    pendingToken,

    status:
      "PENDING_USER_ACTION",

    source:
      candidate.source ||
      (
        coin ===
          "GRT"
          ? "GRT_SCALPING"
          : "ALTCOIN_SCANNER"
      ),

    pendingAt:
      Date.now(),
  };


  PENDING_ENTRIES[
    coin
  ] =
    pending;


  return {
    staged:
      true,

    pending,

    existing:
      false,
  };
}


/* ============================================================
   PROCESS GRT CANDIDATE
============================================================ */

async function processPart10GRTCandidate(
  ticker,
  decision
) {
  if (
    !decision ||
    decision.status !==
      "BUY_NOW"
  ) {
    return {
      ready:
        false,

      reason:
        decision
          ?.status ||
        "NO BUY NOW",
    };
  }


  const candidate =
    await buildGRTScalpingCandidate(
      ticker,
      decision
    );


  if (
    !candidate.allowed
  ) {
    return {
      ready:
        false,

      reason:
        candidate.reason,

      candidate,
    };
  }


  if (
    SEMI_AUTO_SESSION
      .enabled &&
    SEMI_AUTO_SESSION
      .state ===
      SEMI_AUTO_SESSION_STATES
        .WAITING_SETUP &&
    SEMI_AUTO_SESSION
      .chatId &&
    safeNumber(
      SEMI_AUTO_SESSION
        .capitalMYR,
      0
    ) >
      0 &&
    isPart9AuthorizedChat(
      SEMI_AUTO_SESSION
        .chatId
    )
  ) {
    const staged =
      stagePart10PendingEntry(
        candidate
      );


    if (
      !staged.staged
    ) {
      return {
        ready:
          false,

        reason:
          staged.reason,

        candidate,
      };
    }


    const sent =
      await sendPart10BuyConfirmationOnce({
        chatId:
          SEMI_AUTO_SESSION
            .chatId,

        coin:
          candidate.coin,

        pendingToken:
          staged.pending
            .pendingToken,

        capitalMYR:
          SEMI_AUTO_SESSION
            .capitalMYR,
      });


    return {
      ready:
        Boolean(
          sent
            ?.sent
        ),

      mode:
        "SEMI_AUTO_CONFIRMATION",

      reason:
        sent
          ?.sent
          ? "BUY CONFIRMATION SENT"
          : sent
              ?.reason,

      candidate,
    };
  }


  const alert =
    await sendScalpingEntry(
      candidate
    );


  return {
    ready:
      Boolean(
        alert
          ?.sent
      ),

    mode:
      "MANUAL_ENTRY_ALERT",

    reason:
      alert
        ?.sent
        ? "ENTRY ALERT SENT"
        : alert
            ?.reason,

    candidate,
  };
}


/* ============================================================
   GRT MASTER SCANNER
============================================================ */

async function runPart10GRTMasterScanner() {
  const runtime =
    PART10_RUNTIME
      .grtScanner;


  if (
    runtime.running
  ) {
    return {
      skipped:
        true,

      reason:
        "GRT SCANNER BUSY",
    };
  }


  runtime.running =
    true;


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

        ready:
          false,

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


    const decision =
      snapshot
        ?.decision ||
      null;


    if (
      decision
        ?.status ===
      "BUY_NOW"
    ) {
      const cooldown =
        getGRTBuyNowCooldown();


      if (
        !cooldown.active
      ) {
        recordGRTBuyNowSignal(
          ticker,
          decision
        );
      }
    }


    const processed =
      await processPart10GRTCandidate(
        ticker,
        decision
      );


    runtime.runs++;

    runtime.lastAt =
      Date.now();

    runtime.lastResult = {
      status:
        decision
          ?.status ||
        "UNKNOWN",

      confidence:
        safeNumber(
          decision
            ?.confidence,
          0
        ),

      processed,
    };


    SYSTEM_HEALTH
      .grtScannerReady =
      true;

    SYSTEM_HEALTH
      .grtBaselineReady =
      Boolean(
        GRT_ENGINE_HAS_BEEN_READY
      );

    SYSTEM_HEALTH
      .globalLeadReady =
      Boolean(
        GRT_GLOBAL_LEAD_RUNTIME
          .ready
      );


    return {
      skipped:
        false,

      snapshot,

      processed,
    };

  } catch (
    error
  ) {
    runtime.errors++;

    SYSTEM_HEALTH
      .lastCriticalError =
      `GRT SCANNER: ${error.message}`;

    console.log(
      "PART10 GRT scanner error:",
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
   ACTIVE TRADE MONITOR
============================================================ */

async function runPart10ActiveTradeMonitor() {
  try {
    const result =
      await monitorActiveTrades();


    SYSTEM_HEALTH
      .activeTradeMonitorReady =
      true;


    if (
      SEMI_AUTO_SESSION
        .enabled
    ) {
      const activeCoins =
        Object.keys(
          ACTIVE_TRADES
        ).filter(
          (
            coin
          ) =>
            ACTIVE_TRADES[
              coin
            ]
        );


      if (
        activeCoins.length
      ) {
        SEMI_AUTO_SESSION
          .state =
          SEMI_AUTO_SESSION_STATES
            .POSITION_ACTIVE;

      } else if (
        SEMI_AUTO_SESSION
          .state ===
        SEMI_AUTO_SESSION_STATES
          .POSITION_ACTIVE
      ) {
        SEMI_AUTO_SESSION
          .state =
          SEMI_AUTO_SESSION_STATES
            .WAITING_SETUP;
      }


      SEMI_AUTO_SESSION
        .updatedAt =
        Date.now();
    }


    return result;

  } catch (
    error
  ) {
    SYSTEM_HEALTH
      .lastCriticalError =
      `ACTIVE MONITOR: ${error.message}`;

    console.log(
      "PART10 active monitor error:",
      error.message
    );


    return {
      error:
        error.message,
    };
  }
}


/* ============================================================
   CHOOSE PENDING SETUP
============================================================ */

function choosePart10PendingSetup() {
  return (
    Object.values(
      PENDING_ENTRIES
    )
      .filter(
        (
          item
        ) =>
          item
            ?.allowed &&
          item
            ?.coin
      )
      .filter(
        (
          item
        ) =>
          !ACTIVE_TRADES[
            normalizeCoin(
              item.coin
            )
          ]
      )
      .filter(
        (
          item
        ) =>
          Date.now() -
            safeNumber(
              item.pendingAt,
              item.createdAt ||
                0
            ) <=
          PART7_EXECUTION_CONFIG
            .entryIntentMaxAgeMs
      )
      .sort(
        (
          a,
          b
        ) =>
          safeNumber(
            b.score,
            0
          ) -
          safeNumber(
            a.score,
            0
          )
      )[0] ||
    null
  );
}


/* ============================================================
   SEMI-AUTO MONITOR

   NEVER EXECUTES A REAL ORDER.
============================================================ */

async function runPart10SemiAutoMonitor() {
  const runtime =
    PART10_RUNTIME
      .semiAuto;


  if (
    runtime.running
  ) {
    return {
      skipped:
        true,

      reason:
        "SEMI AUTO MONITOR BUSY",
    };
  }


  if (
    !SEMI_AUTO_SESSION
      .enabled
  ) {
    return {
      skipped:
        true,

      reason:
        "SEMI AUTO OFF",
    };
  }


  if (
    !isPart9AuthorizedChat(
      SEMI_AUTO_SESSION
        .chatId
    )
  ) {
    resetPart9SemiAutoSession(
      "UNAUTHORIZED SESSION CHAT"
    );

    return {
      skipped:
        true,

      reason:
        "UNAUTHORIZED SESSION CHAT",
    };
  }


  if (
    SEMI_AUTO_SESSION
      .state !==
    SEMI_AUTO_SESSION_STATES
      .WAITING_SETUP
  ) {
    return {
      skipped:
        true,

      reason:
        `STATE ${SEMI_AUTO_SESSION.state}`,
    };
  }


  if (
    Object.values(
      ACTIVE_TRADES
    ).some(
      Boolean
    )
  ) {
    SEMI_AUTO_SESSION
      .state =
      SEMI_AUTO_SESSION_STATES
        .POSITION_ACTIVE;

    SEMI_AUTO_SESSION
      .updatedAt =
      Date.now();

    return {
      skipped:
        true,

      reason:
        "POSITION ACTIVE",
    };
  }


  runtime.running =
    true;


  try {
    let candidate =
      choosePart10PendingSetup();


    if (
      !candidate
    ) {
      const grtResult =
        await runPart10GRTMasterScanner();


      if (
        grtResult
          ?.processed
          ?.mode ===
        "SEMI_AUTO_CONFIRMATION"
      ) {
        runtime.runs++;

        runtime.lastAt =
          Date.now();

        runtime.lastReason =
          grtResult
            .processed
            .reason;


        return {
          skipped:
            false,

          ready:
            Boolean(
              grtResult
                .processed
                .ready
            ),

          source:
            "GRT",

          result:
            grtResult
              .processed,
        };
      }


      candidate =
        choosePart10PendingSetup();
    }


    if (
      !candidate
    ) {
      runtime.runs++;

      runtime.lastAt =
        Date.now();

      runtime.lastReason =
        "NO QUALIFIED SETUP";


      return {
        skipped:
          false,

        ready:
          false,

        reason:
          runtime.lastReason,
      };
    }


    const sent =
      await sendPart10BuyConfirmationOnce({
        chatId:
          SEMI_AUTO_SESSION
            .chatId,

        coin:
          candidate.coin,

        pendingToken:
          candidate.pendingToken,

        capitalMYR:
          SEMI_AUTO_SESSION
            .capitalMYR,
      });


    runtime.runs++;

    runtime.lastAt =
      Date.now();

    runtime.lastReason =
      sent
        ?.sent
        ? "BUY CONFIRMATION SENT"
        : sent
            ?.reason ||
          "CONFIRMATION FAILED";


    return {
      skipped:
        false,

      ready:
        Boolean(
          sent
            ?.sent
        ),

      candidate,

      reason:
        runtime.lastReason,
    };

  } catch (
    error
  ) {
    runtime.errors++;

    runtime.lastReason =
      error.message;

    SEMI_AUTO_SESSION
      .lastError =
      error.message;

    SEMI_AUTO_SESSION
      .updatedAt =
      Date.now();


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
   DAILY MAINTENANCE
============================================================ */

async function runPart10DailyMaintenance() {
  const result =
    await checkDailyWatchRollover();

  saveDailyWatchState();

  return result;
}


/* ============================================================
   SAFE INTERVAL — NO OVERLAP
============================================================ */

function createPart10SafeInterval(
  name,
  handler,
  intervalMs
) {
  if (
    PART10_RUNTIME
      .intervals[
        name
      ]
  ) {
    return PART10_RUNTIME
      .intervals[
        name
      ];
  }


  let running =
    false;


  const timer =
    setInterval(
      async () => {
        if (
          running
        ) {
          return;
        }

        running =
          true;


        try {
          await handler();

        } catch (
          error
        ) {
          console.log(
            `PART10 ${name} interval error:`,
            error.message
          );

          SYSTEM_HEALTH
            .lastCriticalError =
            `${name}: ${error.message}`;

        } finally {
          running =
            false;
        }
      },

      intervalMs
    );


  PART10_RUNTIME
    .intervals[
      name
    ] =
    timer;


  return timer;
}


/* ============================================================
   START SCHEDULER
============================================================ */

function startPart10Scheduler() {
  if (
    PART10_RUNTIME
      .schedulerStarted
  ) {
    return {
      started:
        false,

      reason:
        "SCHEDULER ALREADY STARTED",
    };
  }


  createPart10SafeInterval(
    "tradeCollector",
    runPart10ExecutedTradeCollector,
    TRADE_COLLECT_INTERVAL
  );


  createPart10SafeInterval(
    "priceCollector",
    runPart10PriceCollector,
    PRICE_MEMORY_INTERVAL
  );


  createPart10SafeInterval(
    "grtMasterScanner",
    runPart10GRTMasterScanner,
    GRT_MASTER_SCAN_INTERVAL
  );


  createPart10SafeInterval(
    "altcoinScanner",
    runAltcoinScalpingScanner,
    ALTCOIN_SCALPING_SCAN_INTERVAL
  );


  createPart10SafeInterval(
    "priceAlert",
    runPriceAlert,
    PRICE_ALERT_INTERVAL
  );


  createPart10SafeInterval(
    "marketStructure",
    runMarketStructureAlert,
    MARKET_STRUCTURE_INTERVAL
  );


  createPart10SafeInterval(
    "activeTradeMonitor",
    runPart10ActiveTradeMonitor,
    TRADE_MONITOR_INTERVAL
  );


  createPart10SafeInterval(
    "grtLearning",
    monitorGRTBuyNowLearning,
    GRT_BUY_NOW_MONITOR_INTERVAL
  );


  createPart10SafeInterval(
    "dailyWatch",
    runPart10DailyMaintenance,
    DAILY_WATCH_CHECK_INTERVAL
  );


  createPart10SafeInterval(
    "dailySave",
    async () =>
      saveDailyWatchState(),

    DAILY_WATCH_SAVE_INTERVAL
  );


  createPart10SafeInterval(
    "semiAutoMonitor",
    runPart10SemiAutoMonitor,
    PART10_CONFIG
      .semiAutoScanIntervalMs
  );


  createPart10SafeInterval(
    "persistentState",
    async () =>
      saveAllPart10PersistentState(),

    PART10_CONFIG
      .persistenceIntervalMs
  );


  /*
     Retry unresolved order journal once per minute.
     Still READ/RECONCILIATION only.
  */

  createPart10SafeInterval(
    "journalRecovery",

    async () => {
      await reconcilePart10OrderJournal();

      const filledLocal =
        await reconcilePart10FilledLocalStatePending();

      if (
        PART10_RUNTIME
          .recovery
          .activeRecoveryBlocked ||
        safeNumber(
          filledLocal
            ?.resolved,
          0
        ) >
          0
      ) {
        await recoverPart10ActiveTrades();
      }

      refreshPart10PersistenceBlock();

      if (
        !PART10_RUNTIME
          .recovery
          .persistenceBlocked
      ) {
        savePart10ActiveTradeState();
      }
    },

    60 *
    1000
  );


  PART10_RUNTIME
    .schedulerStarted =
    true;


  return {
    started:
      true,

    jobs:
      Object.keys(
        PART10_RUNTIME
          .intervals
      ),
  };
}


/* ============================================================
   BACKGROUND STATUS
============================================================ */

function getPart10BackgroundStatus() {
  return {
    started:
      PART10_RUNTIME
        .started,

    startedAt:
      PART10_RUNTIME
        .startedAt,

    schedulerStarted:
      PART10_RUNTIME
        .schedulerStarted,

    jobs:
      Object.keys(
        PART10_RUNTIME
          .intervals
      ),

    collector:
      PART10_RUNTIME
        .collector,

    grtScanner:
      PART10_RUNTIME
        .grtScanner,

    semiAuto:
      PART10_RUNTIME
        .semiAuto,

    persistence:
      PART10_RUNTIME
        .persistence,

    recovery:
      PART10_RUNTIME
        .recovery,

    altcoinScanner:
      getAltcoinScannerStatus(),

    activeTrade:
      getPart7ExecutionStatus(),

    learning:
      getPart8Status(),
  };
}


/* ============================================================
   STARTUP WARMUP
============================================================ */

async function warmupPart10Services() {
  return {
    priceCollector:
      await runPart10PriceCollector(),

    tradeCollector:
      await runPart10ExecutedTradeCollector(),

    grt:
      await runPart10GRTMasterScanner(),
  };
}


/* ============================================================
   RECOVERY WARNING
============================================================ */

async function sendPart10RecoveryWarning(
  recovery
) {
  const unresolved =
    safeNumber(
      PART10_RUNTIME
        .recovery
        .unresolvedJournalCount,
      0
    );


  if (
    !recovery ||
    (
      !recovery.rejected &&
      !recovery.error &&
      !unresolved
    )
  ) {
    return false;
  }


  const rejected =
    Array.isArray(
      recovery.results
    )
      ? recovery.results.filter(
          (
            item
          ) =>
            !item.verified
        )
      : [];


  const details =
    rejected
      .slice(
        0,
        5
      )
      .map(
        (
          item
        ) =>
          `• ${item.coin}: ${item.reason}`
      )
      .join(
        "\n"
      );


  return sendTelegram(
`⚠️ ACTIVE TRADE RECOVERY CHECK

Verified: ${safeNumber(
  recovery.verified,
  0
)}
Rejected/Unverified: ${safeNumber(
  recovery.rejected,
  0
)}
Unresolved Orders: ${unresolved}${
  recovery.error
    ? `\nError: ${recovery.error}`
    : ""
}${
  details
    ? `\n\n${details}`
    : ""
}

No real order was submitted.`
  );
}


/* ============================================================
   STARTUP MESSAGE
============================================================ */

async function sendPart10StartupMessage() {
  const api =
    getLunoApiReadiness();


  const active =
    Object.keys(
      ACTIVE_TRADES
    ).filter(
      (
        coin
      ) =>
        ACTIVE_TRADES[
          coin
        ]
    );


  return sendTelegram(
`🤖 ${BUILD_NAME} ONLINE

✅ SERVICE ACTIVE
📍 ${SERVICE_CODE}

📡 MAIN API: ${
  api.mainReady
    ? "READY"
    : "NOT READY"
}
💳 TRADE API: ${
  api.tradeReady
    ? "READY"
    : "NOT READY"
}

🧠 GRT Scanner: 1 MIN
🚨 Price Alert: 5 MIN
📊 Market Structure: 15 MIN
🌊 Executed Flow Collector: ${Math.round(
  TRADE_COLLECT_INTERVAL /
  1000
)} SEC
💾 Price Memory: ${Math.round(
  PRICE_MEMORY_INTERVAL /
  1000
)} SEC
📈 Active Trade Monitor: ${Math.round(
  TRADE_MONITOR_INTERVAL /
  1000
)} SEC
🪙 Altcoin Scanner: ${Math.round(
  ALTCOIN_SCALPING_SCAN_INTERVAL /
  60000
)} MIN

🤖 SEMI-AUTO: OFF AFTER STARTUP
🔐 Every real BUY/SELL requires confirmation.

♻️ Verified Recovered Active Trades:
${
  active.length
    ? active.join(
        ", "
      )
    : "NONE"
}
⚠️ Unresolved Orders: ${safeNumber(
  PART10_RUNTIME
    .recovery
    .unresolvedJournalCount,
  0
)}
💾 Recovery Persistence: ${
  PART10_RUNTIME
    .recovery
    .persistenceBlocked
    ? "BLOCKED UNTIL VERIFIED"
    : "READY"
}`
  );
}


/* ============================================================
   BOOTSTRAP
============================================================ */

async function bootstrapPart10() {
  if (
    PART10_RUNTIME
      .bootstrapping
  ) {
    return {
      started:
        false,

      reason:
        "BOOTSTRAP ALREADY RUNNING",
    };
  }


  if (
    PART10_RUNTIME
      .started
  ) {
    return {
      started:
        false,

      reason:
        "ALREADY STARTED",
    };
  }


  PART10_RUNTIME
    .bootstrapping =
    true;


  try {
    /*
       1. HARD SAFETY RESET
    */

    forceSemiAutoOffOnBoot();


    /*
       2. ANALYTICAL STATE
    */

    loadGRTBuyNowHistory();

    loadGRTTuning();

    loadDailyWatchState();

    await checkDailyWatchRollover();


    /*
       3. DURABLE ORDER JOURNAL FIRST
    */

    const journalRecovery =
      await reconcilePart10OrderJournal();

    const filledLocalRecovery =
      await reconcilePart10FilledLocalStatePending();


    /*
       4. ACTIVE POSITION RECOVERY SECOND
    */

    const recovery =
      await recoverPart10ActiveTrades();


    /*
       5. SHORT DELAY
    */

    if (
      PART10_CONFIG
        .startupWarmupDelayMs >
      0
    ) {
      await sleep(
        PART10_CONFIG
          .startupWarmupDelayMs
      );
    }


    /*
       6. WARMUP BEFORE INTERVALS
    */

    const warmup =
      await warmupPart10Services();


    /*
       7. SCHEDULER LAST
    */

    const scheduler =
      startPart10Scheduler();


    PART10_RUNTIME
      .started =
      true;

    PART10_RUNTIME
      .startedAt =
      Date.now();


    const api =
      getLunoApiReadiness();


    SYSTEM_HEALTH
      .mainApiReady =
      api.mainReady;

    SYSTEM_HEALTH
      .tradeApiReady =
      api.tradeReady;


    setTimeout(
      async () => {
        try {
          await runAltcoinScalpingScanner();

        } catch (
          error
        ) {
          console.log(
            "PART10 initial altcoin scan error:",
            error.message
          );
        }
      },

      PART10_CONFIG
        .initialAltcoinScanDelayMs
    );


    await sendPart10RecoveryWarning(
      recovery
    );


    await sendPart10StartupMessage();


    console.log(
      "✅ PART 10 BOOTSTRAP COMPLETE"
    );

    console.log(
      "🤖 SEMI-AUTO DEFAULT: OFF"
    );


    return {
      started:
        true,

      journalRecovery,

      filledLocalRecovery,

      recovery,

      scheduler,

      warmup,
    };

  } catch (
    error
  ) {
    SYSTEM_HEALTH
      .lastCriticalError =
      `BOOTSTRAP: ${error.message}`;

    console.log(
      "PART10 bootstrap error:",
      error.message
    );


    return {
      started:
        false,

      error:
        error.message,
    };

  } finally {
    PART10_RUNTIME
      .bootstrapping =
      false;
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
        BUILD_NAME,

      buildMode:
        BUILD_MODE,

      serviceCode:
        SERVICE_CODE,

      status:
        "ONLINE",

      uptimeSeconds:
        Math.floor(
          (
            Date.now() -
            BOT_STARTED_AT
          ) /
          1000
        ),

      semiAuto: {
        enabled:
          SEMI_AUTO_SESSION
            .enabled,

        state:
          SEMI_AUTO_SESSION
            .state,
      },

      activeTrades:
        Object.keys(
          ACTIVE_TRADES
        ).filter(
          (
            coin
          ) =>
            ACTIVE_TRADES[
              coin
            ]
        ),

      unresolvedOrders:
        getPart7UnresolvedOrderJournalEntries()
          .length,

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   HTTP HEALTH
============================================================ */

app.get(
  "/health",
  (
    req,
    res
  ) => {
    if (
      !PART10_HEALTH_TOKEN
    ) {
      return res
        .status(503)
        .json({
          ok: false,
          error:
            "HEALTH_TOKEN_NOT_CONFIGURED",
        });
    }

    if (
      !isPart10HttpHealthAuthorized(
        req
      )
    ) {
      return res
        .status(403)
        .json({
          ok: false,
          error:
            "FORBIDDEN",
        });
    }

    res.json({
      ok:
        true,

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

      api:
        getLunoApiReadiness(),

      systemHealth:
        SYSTEM_HEALTH,

      semiAuto:
        getPart9SessionStatus(),

      execution:
        getPart7ExecutionStatus(),

      background:
        getPart10BackgroundStatus(),

      timestamp:
        Date.now(),
    });
  }
);


/* ============================================================
   TELEGRAM /health — OWNER ONLY
============================================================ */

bot.onText(
  /^\/health(?:@\w+)?$/i,

  async (
    msg
  ) => {
    if (
      !isPart9AuthorizedChat(
        msg
          ?.chat
          ?.id
      )
    ) {
      return;
    }


    const api =
      getLunoApiReadiness();


    const background =
      getPart10BackgroundStatus();


    await replyTelegram(
      msg.chat.id,

`🩺 HEALTH

📡 MAIN API: ${
  api.mainReady
    ? "READY"
    : "NOT READY"
}
💳 TRADE API: ${
  api.tradeReady
    ? "READY"
    : "NOT READY"
}

💾 Price Collector: ${
  background
    .collector
    .prices
    .running
    ? "RUNNING"
    : "READY"
}
🌊 Trade Collector: ${
  background
    .collector
    .trades
    .running
    ? "RUNNING"
    : "READY"
}
🧠 GRT Scanner: ${
  background
    .grtScanner
    .running
    ? "RUNNING"
    : "READY"
}
🪙 Altcoin Scanner: ${
  background
    .altcoinScanner
    .running
    ? "RUNNING"
    : "READY"
}
📈 Active Monitor: ${
  background
    .activeTrade
    .monitorRunning
    ? "RUNNING"
    : "READY"
}

🤖 Semi-Auto: ${
  SEMI_AUTO_SESSION
    .enabled
    ? SEMI_AUTO_SESSION
        .state
    : "OFF"
}
📈 Active Trades: ${
  background
    .activeTrade
    .activeTrades
    .length
}

♻️ Recovery Verified: ${safeNumber(
  background
    .recovery
    .verifiedCount,
  0
)}
⚠️ Recovery Rejected: ${safeNumber(
  background
    .recovery
    .rejectedCount,
  0
)}
🧾 Unresolved Orders: ${safeNumber(
  background
    .recovery
    .unresolvedJournalCount,
  0
)}
💾 Persistence: ${
  background
    .recovery
    .persistenceBlocked
    ? "BLOCKED"
    : "READY"
}

⚠️ Last Critical Error:
${
  SYSTEM_HEALTH
    .lastCriticalError ||
  "NONE"
}`
    );
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
    const message =
      reason
        ?.message ||
      String(reason);

    console.log(
      "Unhandled rejection:",
      message
    );

    SYSTEM_HEALTH
      .lastCriticalError =
      `UNHANDLED REJECTION: ${message}`;
  }
);


function stopPart10Intervals() {
  for (
    const timer of
    Object.values(
      PART10_RUNTIME
        .intervals
    )
  ) {
    clearInterval(
      timer
    );
  }

  PART10_RUNTIME
    .intervals =
    {};

  PART10_RUNTIME
    .schedulerStarted =
    false;
}


process.on(
  "uncaughtException",

  (
    error
  ) => {
    if (
      PART10_RUNTIME
        .fatalShutdownStarted
    ) {
      process.exit(1);
    }

    PART10_RUNTIME
      .fatalShutdownStarted =
      true;

    const message =
      error
        ?.message ||
      String(error);

    console.log(
      "Uncaught exception:",
      message
    );

    SYSTEM_HEALTH
      .lastCriticalError =
      `UNCAUGHT: ${message}`;

    try {
      forceSemiAutoOffOnBoot();
      saveAllPart10PersistentState();
      stopPart10Intervals();

    } catch (
      shutdownError
    ) {
      console.log(
        "Fatal shutdown save error:",
        shutdownError.message
      );
    }

    process.exit(1);
  }
);


/* ============================================================
   SAFE SHUTDOWN
============================================================ */

function shutdownPart10(
  signal
) {
  console.log(
    `PART10 shutdown: ${signal}`
  );


  saveAllPart10PersistentState();


  stopPart10Intervals();


  process.exit(
    0
  );
}


process.once(
  "SIGTERM",

  () =>
    shutdownPart10(
      "SIGTERM"
    )
);


process.once(
  "SIGINT",

  () =>
    shutdownPart10(
      "SIGINT"
    )
);


/* ============================================================
   EXPRESS SERVER
============================================================ */

app.listen(
  PORT,

  () => {
    console.log(
      `${BUILD_NAME} running on port ${PORT}`
    );

    console.log(
      `Service code: ${SERVICE_CODE}`
    );

    console.log(
      "🤖 SEMI-AUTO DEFAULT: OFF"
    );
  }
);


/* ============================================================
   START BACKGROUND ENGINE
============================================================ */

bootstrapPart10();


/* ============================================================
   END PART 10
   END SAFWAN CRIPTO AI ALERT REBUILD
============================================================ */
