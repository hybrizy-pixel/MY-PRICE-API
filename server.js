```javascript id="srvfull1"
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

// COINS
const PAIRS = {
    BTC: "XBTMYR",
    GRT: "GRTMYR"
};

// HOMEPAGE
app.get("/", (req, res) => {

    res.json({
        message: "SAFWAN LUNO API RUNNING 🔥"
    });

});

// SINGLE COIN PRICE
app.get("/price/:coin", async (req, res) => {

    try {

        const coin =
        req.params.coin.toUpperCase();

        if (!PAIRS[coin]) {

            return res.json({
                error: "Coin not supported"
            });

        }

        const pair = PAIRS[coin];

        // CACHE
        const cachedData =
        cache.get(pair);

        if (cachedData) {

            return res.json({
                source: "cache",
                ...cachedData
            });

        }

        // LUNO API
        const response =
        await axios.get(
            "https://api.luno.com/api/1/ticker?pair=" + pair
        );

        const data =
        response.data;

        const result = {
            source: "luno",
            coin,
            pair: data.pair,
            price: data.last_trade,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.timestamp
        };

        cache.set(pair, result);

        res.json(result);

    } catch (error) {

        res.json({
            error: "Failed to fetch price"
        });

    }

});

// MARKET
app.get("/market", async (req, res) => {

    try {

        const marketData = [];

        for (const coin in PAIRS) {

            const pair = PAIRS[coin];

            const response =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const ticker =
            response.data;

            marketData.push({
                coin,
                price: ticker.last_trade
            });

        }

        res.json({
            total: marketData.length,
            data: marketData
        });

    } catch (error) {

        res.json({
            error: "Failed to fetch market data"
        });

    }

});

// START SERVER
app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});

// ===============================
// TELEGRAM SCANNER
// ===============================

// TELEGRAM TOKEN
const TELEGRAM_TOKEN =
"8979342744:AAFbamnzNXbeJCAIxuUf78NAxKspoWvymGs";

const CHAT_ID =
"7161546";

// ACTIVE COINS
const COINS = [
    "BTC",
    "GRT"
];

// SAVE LAST PRICE
const LAST_PRICES = {};

// SAVE LAST ALERT
const LAST_ALERT = {};

// SEND TELEGRAM
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

// MAIN SCANNER
async function scanCoins(){

    try{

        let priceMessage = "";

        for(const coin of COINS){

            const pair =
            PAIRS[coin];

            // LIVE PRICE
            const response =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                response.data.last_trade
            );

            // ORDER BOOK
            const orderbook =
            await axios.get(
                "https://api.luno.com/api/1/orderbook?pair=" + pair
            );

            const bids =
            orderbook.data.bids;

            const asks =
            orderbook.data.asks;

            // BIGGEST BUY WALL
            const biggestBid =
            bids.reduce((a,b)=>
                parseFloat(a.volume) >
                parseFloat(b.volume)
                ? a : b
            );

            // BIGGEST SELL WALL
            const biggestAsk =
            asks.reduce((a,b)=>
                parseFloat(a.volume) >
                parseFloat(b.volume)
                ? a : b
            );

            const support =
            parseFloat(biggestBid.price);

            const resistance =
            parseFloat(biggestAsk.price);

            // PRICE UPDATE MESSAGE
            priceMessage +=
`${coin} RM${price.toFixed(4)}
`;

            // FIRST SAVE
            if(!LAST_PRICES[coin]){

                LAST_PRICES[coin] = price;

            }

            const oldPrice =
            LAST_PRICES[coin];

            const change =
            ((price - oldPrice) / oldPrice) * 100;

            const now =
            Date.now();

            // COOLDOWN
            if(
                LAST_ALERT[coin] &&
                now - LAST_ALERT[coin]
                < 1800000
            ){

                LAST_PRICES[coin] = price;
                continue;

            }

            // BREAKOUT
            if(
                price > resistance &&
                change > 2
            ){

                await sendTelegram(
`🚀 ${coin} BREAKOUT

PECAH NAIK RM${resistance.toFixed(4)} 🔥`
                );

                LAST_ALERT[coin] = now;

            }

            // BREAKDOWN
            if(
                price < support &&
                change < -2
            ){

                await sendTelegram(
`⚠️ ${coin} BREAKDOWN

PECAH TURUN RM${support.toFixed(4)} 🔥`
                );

                LAST_ALERT[coin] = now;

            }

            // REJECTION
            if(
                price < resistance &&
                change > 1
            ){

                await sendTelegram(
`⚠️ ${coin} TAK LEPAS RM${resistance.toFixed(4)}

KENA REJECT 🔥`
                );

                LAST_ALERT[coin] = now;

            }

            // VOLUME SPIKE
            if(
                parseFloat(biggestBid.volume) > 5
            ){

                await sendTelegram(
`🐋 ${coin} VOLUME BESAR

SMART MONEY MASUK 🔥`
                );

                LAST_ALERT[coin] = now;

            }

            // SUPPORT UPDATE
            if(
                Math.abs(change) > 3
            ){

                await sendTelegram(
`🟢 ${coin} SUPPORT BERUBAH

Buyer besar muncul RM${support.toFixed(4)} 🔥`
                );

                LAST_ALERT[coin] = now;

            }

            // SAVE PRICE
            LAST_PRICES[coin] = price;

        }

        // SEND PRICE UPDATE
        await sendTelegram(
            priceMessage
        );

    }catch(err){

        console.log(
            "Scanner failed"
        );

    }

}

// FIRST RUN
scanCoins();

// EVERY 5 MINUTES
setInterval(
    scanCoins,
    300000
);
```
