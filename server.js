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

/*
  Market Structure sekarang ORDERBOOK-FIRST.

  Bot cari support/resistance daripada
  live Luno bids/asks.

  Wall terlalu jauh daripada current price
  tidak dianggap current support/resistance.
*/

const ORDERBOOK_STRUCTURE_RANGE_PCT = {
  BTC: 2.00,
  GRT: 3.00,
  XRP: 3.00,
  XLM: 3.00,
  CRV: 3.00,
  AAVE: 3.00,
};

/*
  Kita tak terus pilih order paling dekat.

  Orders berhampiran digabung menjadi zone
  supaya fragmented wall masih boleh dikesan.
*/

const ORDERBOOK_CLUSTER_PCT = {
  BTC: 0.08,
  GRT: 0.15,
  XRP: 0.15,
  XLM: 0.15,
  CRV: 0.15,
  AAVE: 0.15,
};

/*
  Wall minimum mesti sekurang-kurangnya
  sedikit lebih besar daripada typical
  orderbook zone.

  Ini mengelakkan order kecil dipanggil
  support/resistance.
*/

const MIN_WALL_RELATIVE_RATIO =
  1.20;

/*
  Bila dua wall hampir sama strength,
  wall lebih dekat dengan current price
  diberi sedikit keutamaan.
*/

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

/*
  Confirmation lama tak boleh digunakan
  kalau resistance/wall yang berkaitan
  sudah tidak relevan dengan current structure.
*/

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
   BASIC HELPERS
============================================================ */

function now() {
  return Date.now();
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
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
  if (!from) {
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

function average(values) {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
      0
    ) /
    values.length
  );
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) =>
      a - b
  );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2
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
      valid: false,
      value: null,
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
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
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
    coin === "BTC"
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
    coin === "BTC"
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
        response.data?.asks
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
                order.price > 0 &&
                order.volume > 0
            )
            .sort(
              (a, b) =>
                a.price -
                b.price
            )
        : [];

    const bids =
      Array.isArray(
        response.data?.bids
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
                order.price > 0 &&
                order.volume > 0
            )
            .sort(
              (a, b) =>
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
          response.data?.timestamp
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
        response.data?.trades
      )
        ? response.data.trades
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
          trade.timestamp > 0 &&
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
   TREND / MOMENTUM ONLY

   NOT primary support/resistance anymore.
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
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  purgeOldTrades(
    coin
  );

  newTrades.sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );

  for (
    const trade of
    newTrades
  ) {
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
      sorted[0].timestamp,

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

  const buildLine = (
    coin,
    ticker
  ) => {
    const previous =
      LAST_PRICE[
        coin
      ];

    let emoji =
      "➖";

    let changeText =
      "";

    if (
      previous
    ) {
      const change =
        percentChange(
          previous,
          ticker.currentPrice
        );

      if (
        change > 0
      ) {
        emoji =
          "🟢";
      } else if (
        change < 0
      ) {
        emoji =
          "🔴";
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

    LAST_PRICE[
      coin
    ] =
      ticker.currentPrice;

    return `${emoji} ${coin}
RM${formatPrice(
      coin,
      ticker.currentPrice
    )}${changeText}`;
  };

  await sendTelegram(
    `📡 PRICE ALERT

${buildLine(
  "BTC",
  btc
)}

${buildLine(
  "GRT",
  grt
)}`
  );
}
/* ============================================================
   ORDERBOOK ZONE CLUSTERING
============================================================ */

/*
  Fragmented orders yang sangat dekat
  digabung sebagai satu liquidity zone.

  Example:
  0.0774  50k
  0.0775  70k
  0.0775  40k

  Boleh dianggap satu resistance zone
  jika masih dalam cluster tolerance.
*/

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

    /*
      Weighted average price
      by volume.
    */

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
      totalVolume > 0
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
   WALL RATING 1-10
============================================================ */

/*
  Rating bukan berdasarkan unit mentah.

  Contoh:
  300k GRT mungkin besar,
  tapi 300k BTC mustahil dibanding
  dengan cara sama.

  Jadi kita compare wall volume
  dengan typical zone volume
  dalam orderbook coin itu sendiri.
*/

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

  /*
    Base rating from relative depth.
  */

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

  /*
    Very near wall gets small
    practical relevance boost.

    Cap remains 10.
  */

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

/*
  Kita tak semestinya pilih wall PALING BESAR.

  Wall dekat current price lebih relevant
  kepada scalping.

  Score:
  relative wall strength
  minus distance penalty.
*/

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
    clusters.map(
      (cluster) => {
        const strength =
          rateOrderBookWall({
            cluster,
            stats,
            currentPrice,
          });

        /*
          Require some relative significance
          unless book has very few zones.
        */

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
    /*
      Fallback:
      choose nearest zone instead of N/A
      if valid book data exists.
    */

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
   NEXT RESISTANCE FROM ORDERBOOK
============================================================ */

/*
  Next resistance untuk TP room
  juga sekarang orderbook-first.
*/

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

  /*
    Sort by price.
    We need nearest meaningful wall.
  */

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

  /*
    Prefer first meaningful resistance.
  */

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

/*
  Elak masalah lama:

  Resistance dah berubah / hilang
  tetapi status masih tulis
  BREAKOUT CONFIRMED — SCALPER ACTIVE.
*/

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

  /*
    Kalau breakout record ada
    tetapi current resistance tiada,
    kita tidak display old confirmed state.
  */

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

  /*
    Same wall zone:
    preserve evidence.
  */

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

  /*
    ORDERBOOK-FIRST
  */

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

  /*
    Direction still needs price memory.

    If bot just restarted and 15m history
    is not ready, use shorter/latest fallback
    instead of making whole structure N/A.
  */

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

  /*
    Executed trades determine pressure.
  */

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

/*
  TIADA scheduled 2H Telegram alert.

  Digunakan untuk:
  - hidden scalping safety
  - /flow
  - /flow/:coin
*/

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
      summary.totalVolume > 0
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
      ratio: null,
      label: null,
    };
  }

  const avg =
    average(
      previousSummaries.map(
        (item) =>
          item.totalVolume
      )
    );

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

  if (
    ratio < 0.8
  ) {
    label =
      "LOW VOLUME";
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
    startMove > 0.03
  ) {
    return {
      direction:
        "UP",

      value:
        startMove,
    };
  }

  if (
    startMove < -0.03
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
    dominantPct >= 62;

  const mildDominance =
    dominantPct >= 55;

  const volumeRatio =
    relativeVolume.ratio;

  const highVolume =
    volumeRatio !== null &&
    volumeRatio >= 1.25;

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
      priceTrend.value > 0
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
   ANALYZE 2H
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

  if (!summary) {
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

  if (!ticker) {
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
   BREAKOUT EVIDENCE
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
   TRADE EVIDENCE WEIGHT
============================================================ */

function getTradeEvidenceWeight(
  coin,
  trade
) {
  const normal =
    getRecentMedianTradeVolume(
      coin
    );

  if (!normal) {
    return 1;
  }

  const multiple =
    trade.volume /
    normal;

  if (
    multiple >= 5
  ) {
    return 3;
  }

  if (
    multiple >= 2
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
     ABOVE RESISTANCE
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

    /*
      Re-read live structure.

      Orderbook wall may have moved,
      so we must not blindly confirm
      old resistance.
    */

    const structure =
      await analyzeMarketStructure(
        coin
      );

    if (!structure) {
      return;
    }

    const pressureOkay =
      !structure.pressure.includes(
        "JUAL"
      );

    /*
      If new live resistance suddenly moves
      far away from watched wall,
      old wall was probably removed/consumed.

      That's acceptable as breakout evidence,
      but confirmation still needs executed trades.
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
     SMALL DIP
  ========================================================= */

  if (
    trade.price >=
    failureThreshold
  ) {
    return;
  }

  /* =========================================================
     FAILURE
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
    bestAsk <= 0
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
   ROOM TO TP
   ORDERBOOK-FIRST
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

  /*
    No meaningful wall above
    within configured range.
  */

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

  /*
    TP sedikit sebelum wall.
  */

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
    score >= 80
  ) {
    return "STRONG";
  }

  if (
    score >= 65
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
    score >= 80
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
   HIDDEN 2H SAFETY
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
   -> DIRECT SCALPING ENTRY
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

    /*
      BTC/GRT yang dekat live resistance
      diserahkan kepada BREAKOUT WATCH.
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

    /*
      Generic scanner perlukan
      sekurang-kurangnya sedikit
      short-term history.
    */

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

    /* ========================================================
       HIDDEN 2H FILTER
    ======================================================== */

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

    /* ========================================================
       TECHNICAL ENTRY
    ======================================================== */

    const technicalEntry =
      ticker.currentPrice;

    const preliminary =
      choosePreliminaryEntry({
        technicalEntry,

        bestAsk:
          ticker.bestAsk,
      });

    /* ========================================================
       ORDERBOOK ROOM CHECK
    ======================================================== */

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

/*
  Target profit menentukan quantity.

  Quantity pula menentukan berapa jauh
  bot perlu naik dalam ASK orderbook
  untuk cuba dapat full fill.

  Bila Final Limit Entry berubah,
  TP / room / required quantity juga berubah.

  Jadi kita buat beberapa iteration
  sampai entry stabil.
*/

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
      netPerUnit <= 0
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

    /*
      Entry dah stabil.

      Harga yang diperlukan untuk quantity
      sama dengan harga iteration semasa.
    */

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

    /*
      Orderbook memerlukan harga berbeza.

      Recalculate TP, SL dan quantity
      menggunakan harga baru.
    */

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
    netPerUnit <= 0
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

  /* ========================================================
     FINAL ORDERBOOK SAFETY
  ======================================================== */

  /*
    Orderbook mungkin berubah semasa
    semua calculation di atas dibuat.

    Jadi harga daripada final depth check
    MESTI sama dengan entryPrice yang
    digunakan untuk kira:

    - quantity
    - TP
    - SL
    - target profit
    - fees

    Kalau berubah, jangan bagi user
    stale Suggested Limit Order.
  */

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

━━━━━━━━━━━━━━

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

    /* ======================================================
       STOP LOSS
    ====================================================== */

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

━━━━━━━━━━━━━━

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

    /* ======================================================
       TRADE DURATION
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

━━━━━━━━━━━━━━

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
       IGNORE
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
       PLACE ORDER YES
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
       PLACE ORDER NO
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

    if (!state) {
      return;
    }

    /*
      Command jangan diproses
      sebagai numeric input.
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

      if (!entry) {
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
         RESOLVE FINAL QUANTITY-AWARE ORDER
      ==================================================== */

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

      /* ====================================================
         LOCK FINAL ORDER
      ==================================================== */

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

━━━━━━━━━━━━━━

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

      /*
        "abc" tidak akan jadi 0.
      */

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

      if (!entry) {
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
         ZERO MATCH
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

        /*
          No trade happened,
          release entry cooldown.
        */

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

      /* ====================================================
         ACTUAL MATCH > 0
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
        state.targetProfit > 0
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

      if (!trade) {
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
   MANUAL COMMANDS
============================================================ */

/* ============================================================
   /structure
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
   /flow

   Manual 2H background analysis.
   Tiada scheduled 2H Telegram alert.
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
          .ratio !== null &&
        analysis.relativeVolume
          .ratio !== undefined
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
   /watch
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
            return `${coin}:
NO BREAKOUT WATCH`;
          }

          return `${coin}:

🔴 Resistance:
RM${formatPrice(
            coin,
            watch.resistance
          )}

⭐ Resistance Strength:
${watch.resistanceStrength}/10

🧾 Executed Above:
${watch.aboveTradeCount}

📊 Buyer Evidence:
${watch.buyEvidenceScore}

📈 Acceptance Score:
${watch.acceptanceScore}

⚠️ Failure Score:
${watch.failureScore}`;
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
   /status
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
          } trades stored`
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

    await replyTelegram(
      msg.chat.id,
      `✅ BOT ACTIVE

${stored}

📡 Price Alert:
5 MIN

📊 Market Structure:
15 MIN

🟢 Support:
LIVE ORDERBOOK BUY WALL

🔴 Resistance:
LIVE ORDERBOOK SELL WALL

⭐ Wall Rating:
1–10 RELATIVE DEPTH

👀 Breakout Watch:
EXECUTED-TRADE BASED

🧾 Anti Fake Breakout:
ACTIVE

📚 Orderbook Entry:
QUANTITY-AWARE

🎯 Max Entry Chase:
${MAX_ENTRY_CHASE_PCT.toFixed(
        2
      )}%

🚀 Scalping Entry:
INTERACTIVE

📦 Matched Quantity:
ACTIVE

🧠 2H Analysis:
BACKGROUND ONLY

📈 Active Trades:
${
  active.length
    ? active.join(", ")
    : "NONE"
}

⏳ Pending Entries:
${
  pending.length
    ? pending.join(", ")
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

      breakoutWatch:
        Object.fromEntries(
          CORE_COINS.map(
            (coin) => {
              const watch =
                BREAKOUT_WATCH[
                  coin
                ];

              return [
                coin,

                watch
                  ? {
                      resistance:
                        watch.resistance,

                      resistanceStrength:
                        watch.resistanceStrength,

                      startedAt:
                        watch.startedAt,

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
                    }
                  : null,
              ];
            }
          )
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
   ORDERBOOK STRUCTURE ENDPOINT
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

    /*
      Start collectors immediately.
    */

    await collectTradeHistory();

    await updateMemory();

    /*
      Test orderbook structure immediately.
      Tidak perlu tunggu 15 minit
      untuk support/resistance.
    */

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
5 MIN

📊 MARKET STRUCTURE:
15 MIN

🟢 SUPPORT:
LIVE BUY WALL

🔴 RESISTANCE:
LIVE SELL WALL

⭐ WALL RATING:
RELATIVE DEPTH 1–10

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
BACKGROUND ONLY`
    );
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

   Used for trend/momentum only.
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
   PRICE ALERT
   EVERY 5 MINUTES
============================================================ */

setInterval(
  sendPriceAlert,
  PRICE_ALERT_INTERVAL
);

/* ============================================================
   MARKET STRUCTURE
   EVERY 15 MINUTES

   Support/Resistance read live
   from orderbook on every run.
============================================================ */

setInterval(
  sendMarketStructure,
  MARKET_STRUCTURE_INTERVAL
);

/* ============================================================
   NO SCHEDULED 2H TELEGRAM ALERT

   2H still used for:
   - hidden scalper safety
   - /flow
   - /flow/:coin
============================================================ */

/* ============================================================
   ACTIVE TRADE MONITOR
   EVERY 15 SECONDS
============================================================ */

setInterval(
  monitorTrades,
  TRADE_MONITOR_INTERVAL
);
