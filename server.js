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

        const cachedData =
        cache.get(pair);

        if (cachedData) {

            return res.json({
                source: "cache",
                ...cachedData
            });

        }

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
        "Server running on port " + PORT
    );

});

// =====================================
// TELEGRAM SCANNER
// =====================================

// TELEGRAM TOKEN
const TELEGRAM_TOKEN =
"8979342744:AAFbamnzNXbeJCAIxuUf78NAxKspoWvymGs";

// CHAT ID
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

// MULTI CANDLE MEMORY
const CANDLE_CONFIRMATION = {};

// LAST SUPPORT & RESISTANCE
const LAST_SUPPORT = {};
const LAST_RESISTANCE = {};

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

            // ORDERBOOK
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

            // BUY & SELL PRESSURE
            const buyVolume =
            parseFloat(biggestBid.volume);

            const sellVolume =
            parseFloat(biggestAsk.volume);

            // PRICE UPDATE
            priceMessage +=
            coin + " RM" +
            price.toFixed(4) +
            "\n";

            // FIRST SAVE
            if(!LAST_PRICES[coin]){

                LAST_PRICES[coin] = price;

            }

            if(!LAST_SUPPORT[coin]){

                LAST_SUPPORT[coin] = support;

            }

            if(!LAST_RESISTANCE[coin]){

                LAST_RESISTANCE[coin] = resistance;

            }

            const oldPrice =
            LAST_PRICES[coin];

            const change =
            ((price - oldPrice) / oldPrice) * 100;

            const now =
            Date.now();

            // =====================================
            // MULTI CANDLE ACCUMULATION
            // =====================================

            if(
                buyVolume > sellVolume * 1.5 &&
                change > 0.3 &&
                price > support
            ){

                if(!CANDLE_CONFIRMATION[coin]){

                    CANDLE_CONFIRMATION[coin] = 0;

                }

                CANDLE_CONFIRMATION[coin]++;

                if(
                    CANDLE_CONFIRMATION[coin] >= 3
                ){

                    let confidence = 75;

                    if(
                        buyVolume >
                        sellVolume * 2
                    ){
                        confidence += 10;
                    }

                    if(change > 1){
                        confidence += 10;
                    }

                    if(price > support){
                        confidence += 5;
                    }

                    await sendTelegram(
                        "🟢 " + coin +
                        " CONFIRMED ACCUMULATION\n\n" +
                        "Confidence: " +
                        confidence +
                        "% 🔥"
                    );

                    CANDLE_CONFIRMATION[coin] = 0;

                    LAST_ALERT[coin] = now;

                }

            }else{

                CANDLE_CONFIRMATION[coin] = 0;

            }

            // =====================================
            // VALIDATED MOVEMENT
            // =====================================

            // PERGERAKAN KE ATAS
            if(

                change > 0.8 &&
                buyVolume > sellVolume * 1.5 &&
                support > LAST_SUPPORT[coin]

            ){

                if(!CANDLE_CONFIRMATION[coin]){

                    CANDLE_CONFIRMATION[coin] = 0;

                }

                CANDLE_CONFIRMATION[coin]++;

                if(
                    CANDLE_CONFIRMATION[coin] >= 2
                ){

                    await sendTelegram(
                        "🟢 " + coin +
                        " PERGERAKAN KE ATAS\n\n" +
                        "Buyer masih mengawal market 🔥"
                    );

                    CANDLE_CONFIRMATION[coin] = 0;

                    LAST_ALERT[coin] = now;

                }

            }

            // PERGERAKAN KE BAWAH
            else if(

                change < -0.8 &&
                sellVolume > buyVolume * 1.5 &&
                resistance < LAST_RESISTANCE[coin]

            ){

                if(!CANDLE_CONFIRMATION[coin]){

                    CANDLE_CONFIRMATION[coin] = 0;

                }

                CANDLE_CONFIRMATION[coin]++;

                if(
                    CANDLE_CONFIRMATION[coin] >= 2
                ){

                    await sendTelegram(
                        "🔴 " + coin +
                        " PERGERAKAN KE BAWAH\n\n" +
                        "Seller masih mengawal market ⚠️"
                    );

                    CANDLE_CONFIRMATION[coin] = 0;

                    LAST_ALERT[coin] = now;

                }

            }else{

                CANDLE_CONFIRMATION[coin] = 0;

            }

            // =====================================
            // DISTRIBUTION
            // =====================================

            if(
                sellVolume > buyVolume * 1.5 &&
                change < -0.3
            ){

                await sendTelegram(
                    "🔴 " + coin +
                    " DISTRIBUTION DETECTED ⚠️"
                );

                LAST_ALERT[coin] = now;

            }

            // =====================================
            // CONFIRMED BREAKOUT
            // =====================================

            if(
                price > resistance &&
                change > 2 &&
                buyVolume > sellVolume
            ){

                await sendTelegram(
                    "🚀 " + coin +
                    " CONFIRMED BREAKOUT 🔥"
                );

                LAST_ALERT[coin] = now;

            }

            // =====================================
            // FAKE BREAKOUT
            // =====================================

            if(
                price > resistance &&
                change < 0.5
            ){

                await sendTelegram(
                    "⚠️ " + coin +
                    " FAKE BREAKOUT"
                );

                LAST_ALERT[coin] = now;

            }

            // =====================================
            // REJECTION
            // =====================================

            if(
                price < resistance &&
                change > 1
            ){

                await sendTelegram(
                    "⚠️ " + coin +
                    " gagal lepas RM" +
                    resistance.toFixed(4)
                );

                LAST_ALERT[coin] = now;

            }

            // SAVE PRICE
            LAST_PRICES[coin] = price;

        }

        // LIVE PRICE UPDATE
        await sendTelegram(
            "📊 LIVE PRICE UPDATE\n\n" +
            priceMessage
        );

    }catch(err){

        console.log(
            "Scanner failed"
        );

    }

}

// =====================================
// MARKET STRUCTURE UPDATE
// =====================================

async function marketStructure(){

    try{

        let structureMessage =
        "📊 MARKET STRUCTURE\n\n";

        for(const coin of COINS){

            const pair =
            PAIRS[coin];

            const orderbook =
            await axios.get(
                "https://api.luno.com/api/1/orderbook?pair=" + pair
            );

            const bids =
            orderbook.data.bids;

            const asks =
            orderbook.data.asks;

            const biggestBid =
            bids.reduce((a,b)=>
                parseFloat(a.volume) >
                parseFloat(b.volume)
                ? a : b
            );

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

            // FIRST SAVE
            if(!LAST_SUPPORT[coin]){

                LAST_SUPPORT[coin] = support;

            }

            if(!LAST_RESISTANCE[coin]){

                LAST_RESISTANCE[coin] = resistance;

            }

            // SUPPORT
            if(
                LAST_SUPPORT[coin] !== support
            ){

                structureMessage +=
                "🟢 " + coin +
                " Support RM" +
                LAST_SUPPORT[coin].toFixed(4) +
                " → RM" +
                support.toFixed(4) +
                "\n";

            }else{

                structureMessage +=
                "🟢 " + coin +
                " Support kekal RM" +
                support.toFixed(4) +
                "\n";

            }

            // RESISTANCE
            if(
                LAST_RESISTANCE[coin] !== resistance
            ){

                structureMessage +=
                "🔴 " + coin +
                " Resistance RM" +
                LAST_RESISTANCE[coin].toFixed(4) +
                " → RM" +
                resistance.toFixed(4) +
                "\n\n";

            }else{

                structureMessage +=
                "🔴 " + coin +
                " Resistance kekal RM" +
                resistance.toFixed(4) +
                "\n\n";

            }

            // SAVE NEW
            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

        }

        await sendTelegram(
            structureMessage
        );

    }catch(err){

        console.log(
            "Market structure failed"
        );

    }

}

// FIRST RUN
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
