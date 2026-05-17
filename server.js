const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const cors = require("cors");

const app = express();

app.use(cors());

const cache = new NodeCache({
    stdTTL: 5
});

const PORT = process.env.PORT || 3000;

// =====================================
// COINS
// =====================================

const PAIRS = {
    BTC: "XBTMYR",
    GRT: "GRTMYR"
};

// =====================================
// TELEGRAM
// =====================================

const TELEGRAM_TOKEN =
"YOUR_TELEGRAM_BOT_TOKEN";

const CHAT_ID =
"YOUR_CHAT_ID";

// =====================================
// ACTIVE COINS
// =====================================

const COINS = [
    "BTC",
    "GRT"
];

// =====================================
// MEMORY
// =====================================

const LAST_PRICES = {};
const LAST_SUPPORT = {};
const LAST_RESISTANCE = {};
const CANDLE_CONFIRMATION = {};
const LAST_ALERT = {};

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req, res) => {

    res.json({
        status: "RUNNING 🔥"
    });

});

// =====================================
// SINGLE PRICE
// =====================================

app.get("/price/:coin", async (req, res) => {

    try{

        const coin =
        req.params.coin.toUpperCase();

        if(!PAIRS[coin]){

            return res.json({
                error: "Coin not supported"
            });

        }

        const pair =
        PAIRS[coin];

        const cached =
        cache.get(pair);

        if(cached){

            return res.json(cached);

        }

        const response =
        await axios.get(
            "https://api.luno.com/api/1/ticker?pair=" + pair
        );

        const data =
        response.data;

        const result = {
            coin,
            pair,
            price: data.last_trade,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.timestamp
        };

        cache.set(pair, result);

        res.json(result);

    }catch(err){

        res.json({
            error: "Failed to fetch"
        });

    }

});

// =====================================
// TELEGRAM FUNCTION
// =====================================

async function sendTelegram(message){

    try{

        await axios.post(

            "https://api.telegram.org/bot" +
            TELEGRAM_TOKEN +
            "/sendMessage",

            {
                chat_id: CHAT_ID,
                text: message
            }

        );

        console.log("Telegram sent");

    }catch(err){

        console.log("Telegram failed");

    }

}

// =====================================
// GET VALID SUPPORT RESISTANCE
// =====================================

function getValidWalls(
    bids,
    asks,
    currentPrice
){

    // ONLY NEARBY WALLS
    const filteredBids =
    bids.filter(b =>
        parseFloat(b.price) >
        currentPrice * 0.98
    );

    const filteredAsks =
    asks.filter(a =>
        parseFloat(a.price) <
        currentPrice * 1.02
    );

    // TOP 5 BUY WALLS
    const topBids =
    filteredBids
    .sort((a,b)=>
        parseFloat(b.volume) -
        parseFloat(a.volume)
    )
    .slice(0,5);

    // TOP 5 SELL WALLS
    const topAsks =
    filteredAsks
    .sort((a,b)=>
        parseFloat(b.volume) -
        parseFloat(a.volume)
    )
    .slice(0,5);

    // SUPPORT
    const support =
    topBids.reduce(
        (sum,b)=>
        sum + parseFloat(b.price),
        0
    ) / topBids.length;

    // RESISTANCE
    const resistance =
    topAsks.reduce(
        (sum,a)=>
        sum + parseFloat(a.price),
        0
    ) / topAsks.length;

    // BUY VOLUME
    const buyVolume =
    topBids.reduce(
        (sum,b)=>
        sum + parseFloat(b.volume),
        0
    );

    // SELL VOLUME
    const sellVolume =
    topAsks.reduce(
        (sum,a)=>
        sum + parseFloat(a.volume),
        0
    );

    return {
        support,
        resistance,
        buyVolume,
        sellVolume
    };

}

// =====================================
// MAIN SCANNER
// =====================================

async function scanCoins(){

    try{

        for(const coin of COINS){

            const pair =
            PAIRS[coin];

            // =====================================
            // GET PRICE
            // =====================================

            const ticker =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

            // =====================================
            // GET ORDERBOOK
            // =====================================

            const orderbook =
            await axios.get(
                "https://api.luno.com/api/1/orderbook?pair=" + pair
            );

            const bids =
            orderbook.data.bids;

            const asks =
            orderbook.data.asks;

            // =====================================
            // VALID WALLS
            // =====================================

            const {
                support,
                resistance,
                buyVolume,
                sellVolume
            } =
            getValidWalls(
                bids,
                asks,
                price
            );

            // =====================================
            // FIRST SAVE
            // =====================================

            if(!LAST_PRICES[coin]){

                LAST_PRICES[coin] =
                price;

            }

            if(!LAST_SUPPORT[coin]){

                LAST_SUPPORT[coin] =
                support;

            }

            if(!LAST_RESISTANCE[coin]){

                LAST_RESISTANCE[coin] =
                resistance;

            }

            const oldPrice =
            LAST_PRICES[coin];

            const change =
            (
                (price - oldPrice)
                / oldPrice
            ) * 100;

            const now =
            Date.now();

            let reasons = [];

            // =====================================
            // STRONG MOVE UPWARD
            // =====================================

            if(

                change > 0.5 &&

                price >
                oldPrice * 1.005 &&

                buyVolume >
                sellVolume * 1.5 &&

                support >
                LAST_SUPPORT[coin] * 1.002

            ){

                // BUYER DOMINATION
                if(
                    buyVolume >
                    sellVolume * 2
                ){

                    reasons.push(
                        "Buyer volume dominate"
                    );

                }

                // SUPPORT INCREASE
                if(
                    support >
                    LAST_SUPPORT[coin]
                ){

                    reasons.push(
                        "Support meningkat"
                    );

                }

                // NEAR BREAKOUT
                if(
                    price >
                    resistance * 0.995
                ){

                    reasons.push(
                        "Hampir breakout resistance"
                    );

                }

                // STRONG MOMENTUM
                if(
                    change > 1
                ){

                    reasons.push(
                        "Momentum bullish kuat"
                    );

                }

                // CONFIRMATION
                if(
                    !CANDLE_CONFIRMATION[coin]
                ){

                    CANDLE_CONFIRMATION[coin] = 0;

                }

                CANDLE_CONFIRMATION[coin]++;

                if(
                    CANDLE_CONFIRMATION[coin] >= 2
                ){

                    await sendTelegram(

                        "🟢 " + coin +
                        " STRONG MOVE UPWARD\n\n" +

                        "Price:\nRM" +
                        oldPrice.toFixed(4) +
                        " → RM" +
                        price.toFixed(4) +

                        "\n\nChange:\n" +
                        change.toFixed(2) +
                        "%\n\n" +

                        "Support:\nRM" +
                        support.toFixed(4) +

                        "\n\nResistance:\nRM" +
                        resistance.toFixed(4) +

                        "\n\nReason:\n✅ " +
                        reasons.join(
                            "\n✅ "
                        ) +

                        "\n\n🔥 Bullish Momentum"

                    );

                    CANDLE_CONFIRMATION[coin] = 0;

                    LAST_ALERT[coin] = now;

                }

            }

            // =====================================
            // STRONG MOVE DOWNWARD
            // =====================================

            else if(

                change < -0.5 &&

                price <
                oldPrice * 0.995 &&

                sellVolume >
                buyVolume * 1.5 &&

                resistance <
                LAST_RESISTANCE[coin] * 0.998

            ){

                reasons = [];

                // SELLER DOMINATION
                if(
                    sellVolume >
                    buyVolume * 2
                ){

                    reasons.push(
                        "Seller volume dominate"
                    );

                }

                // RESISTANCE DROP
                if(
                    resistance <
                    LAST_RESISTANCE[coin]
                ){

                    reasons.push(
                        "Resistance menurun"
                    );

                }

                // SUPPORT BREAKDOWN
                if(
                    price < support
                ){

                    reasons.push(
                        "Support breakdown"
                    );

                }

                // STRONG BEARISH
                if(
                    change < -1
                ){

                    reasons.push(
                        "Momentum bearish kuat"
                    );

                }

                // CONFIRMATION
                if(
                    !CANDLE_CONFIRMATION[coin]
                ){

                    CANDLE_CONFIRMATION[coin] = 0;

                }

                CANDLE_CONFIRMATION[coin]++;

                if(
                    CANDLE_CONFIRMATION[coin] >= 2
                ){

                    await sendTelegram(

                        "🔴 " + coin +
                        " STRONG MOVE DOWNWARD\n\n" +

                        "Price:\nRM" +
                        oldPrice.toFixed(4) +
                        " → RM" +
                        price.toFixed(4) +

                        "\n\nChange:\n" +
                        change.toFixed(2) +
                        "%\n\n" +

                        "Support:\nRM" +
                        support.toFixed(4) +

                        "\n\nResistance:\nRM" +
                        resistance.toFixed(4) +

                        "\n\nReason:\n⚠️ " +
                        reasons.join(
                            "\n⚠️ "
                        ) +

                        "\n\n📉 Bearish Pressure"

                    );

                    CANDLE_CONFIRMATION[coin] = 0;

                    LAST_ALERT[coin] = now;

                }

            }

            // RESET
            else{

                CANDLE_CONFIRMATION[coin] = 0;

            }

            // SAVE
            LAST_PRICES[coin] =
            price;

            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

        }

    }catch(err){

        console.log(
            "Scanner failed"
        );

    }

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function marketStructure(){

    try{

        let message =
        "📊 MARKET STRUCTURE\n\n";

        for(const coin of COINS){

            const pair =
            PAIRS[coin];

            // PRICE
            const ticker =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

            // ORDERBOOK
            const orderbook =
            await axios.get(
                "https://api.luno.com/api/1/orderbook?pair=" + pair
            );

            const bids =
            orderbook.data.bids;

            const asks =
            orderbook.data.asks;

            const {
                support,
                resistance
            } =
            getValidWalls(
                bids,
                asks,
                price
            );

            message +=

            "🟢 " + coin +
            " Support RM" +
            support.toFixed(4) +

            "\n🔴 " + coin +
            " Resistance RM" +
            resistance.toFixed(4) +

            "\n\n";

        }

        await sendTelegram(
            message
        );

    }catch(err){

        console.log(
            "Market structure failed"
        );

    }

}

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {

    console.log(
        "Server running on port " +
        PORT
    );

});

// =====================================
// RUN
// =====================================

scanCoins();
marketStructure();

// EVERY 5 MINUTES
setInterval(
    scanCoins,
    300000
);

// EVERY 15 MINUTES
setInterval(
    marketStructure,
    900000
);