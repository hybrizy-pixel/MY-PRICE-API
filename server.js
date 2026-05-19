const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

// =====================================
// TELEGRAM ENV
// =====================================

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// ENV CHECK
// =====================================

console.log(
    "TOKEN EXISTS:",
    !!TELEGRAM_TOKEN
);

console.log(
    "CHAT ID EXISTS:",
    !!CHAT_ID
);

// =====================================
// INSTANCE
// =====================================

const INSTANCE =
Math.random().toString(36).substring(7);

console.log(
    "INSTANCE:",
    INSTANCE
);

// =====================================
// MAIN COINS
// =====================================

const MAIN_COINS = {

    BTC: "XBTMYR",
    GRT: "GRTMYR"

};

// =====================================
// EVENT COINS
// =====================================

const EVENT_COINS = {

    BTC: "XBTMYR",
    XRP: "XRPMYR",
    XLM: "XLMMYR",
    CRV: "CRVMYR",
    AAVE: "AAVEMYR"

};

// =====================================
// MEMORY
// =====================================

const LAST_PRICES = {};
const LAST_SUPPORT = {};
const LAST_RESISTANCE = {};
const LAST_ALERT_TIME = {};
const LAST_NEWS = [];

// =====================================
// SMART MEMORY
// =====================================

const BREAKOUT_ACTIVE = {};
const REJECTION_ACTIVE = {};
const MOMENTUM_ACTIVE = {};

const BREAKOUT_CANDIDATE = {};
const BREAKOUT_TIMER = {};

const LAST_EVENT_PRICE = {};
const TREND_DIRECTION = {};

// =====================================
// SETTINGS
// =====================================

const ALERT_COOLDOWN =
300000;

const BREAKOUT_CONFIRM_MS =
5000;

// =====================================
// FORMAT PRICE
// =====================================

function formatPrice(
    coin,
    price
){

    if(!price){

        return "0";

    }

    if(coin === "BTC"){

        return price.toFixed(2);

    }

    if(coin === "GRT"){

        return price.toFixed(4);

    }

    if(
        coin === "CRV" ||
        coin === "XLM"
    ){

        return price.toFixed(3);

    }

    return price.toFixed(2);

}

// =====================================
// SEND TELEGRAM
// =====================================

async function sendTelegram(message){

    try{

        await axios.post(

            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,

            {

                chat_id: CHAT_ID,
                text: `[${INSTANCE}]\n\n${message}`

            }

        );

        console.log(
            "✅ Telegram sent"
        );

    }catch(err){

        console.log(
            "❌ Telegram failed"
        );

        if(err.response){

            console.log(
                err.response.data
            );

        }else{

            console.log(
                err.message
            );

        }

    }

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req, res) => {

    res.json({

        status:
        "SMART SCANNER RUNNING 🔥",

        instance:
        INSTANCE,

        scanner:
        "ACTIVE"

    });

});

// =====================================
// LIVE PRICE API
// =====================================

app.get("/price/:symbol", async (req, res) => {

    try{

        const symbol =
        req.params.symbol.toUpperCase();

        let pair = "";

        if(symbol === "BTC"){

            pair = "XBTMYR";

        }else{

            pair = symbol + "MYR";

        }

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${pair}`

        );

        res.json({

            success: true,
            symbol: symbol,
            pair: pair,
            price: response.data.last_trade

        });

    }catch(err){

        res.status(500).json({

            success: false,
            error: "Failed to fetch price"

        });

    }

});

// =====================================
// GET WALLS
// =====================================

function getWalls(
    bids,
    asks,
    currentPrice
){

    try{

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

        const topBid =
        filteredBids
        .sort((a,b)=>

            parseFloat(b.volume) -
            parseFloat(a.volume)

        )[0];

        const topAsk =
        filteredAsks
        .sort((a,b)=>

            parseFloat(b.volume) -
            parseFloat(a.volume)

        )[0];

        if(!topBid || !topAsk){

            return null;

        }

        return {

            support:
            parseFloat(topBid.price),

            supportVolume:
            parseFloat(topBid.volume),

            resistance:
            parseFloat(topAsk.price),

            resistanceVolume:
            parseFloat(topAsk.volume)

        };

    }catch{

        return null;

    }

}

// =====================================
// TREND DETECTOR
// =====================================

function detectTrend(
    price,
    support,
    resistance,
    supportVolume,
    resistanceVolume
){

    const ratio =
    supportVolume /
    resistanceVolume;

    // STRONG BULLISH

    if(

        price > support &&
        ratio > 1.8

    ){

        return "BULLISH";

    }

    // WEAK / SIDEWAYS

    if(

        ratio > 0.8 &&
        ratio < 1.3

    ){

        return "SIDEWAYS";

    }

    // BEARISH

    if(

        resistanceVolume >
        supportVolume * 1.5

    ){

        return "BEARISH";

    }

    return "NEUTRAL";

}

// =====================================
// PRICE UPDATE
// EVERY 5 MINUTES
// =====================================

async function scanPrices(){

    try{

        let message =
        "📊 PRICE UPDATE\n\n";

        const coins =
        Object.keys(MAIN_COINS);

        const responses =
        await Promise.all(

            coins.map(coin =>

                axios.get(

                    `https://api.luno.com/api/1/ticker?pair=${MAIN_COINS[coin]}`

                )

            )

        );

        for(let i = 0; i < coins.length; i++){

            const coin =
            coins[i];

            const response =
            responses[i];

            const price =
            parseFloat(
                response.data.last_trade
            );

            if(!LAST_PRICES[coin]){

                LAST_PRICES[coin] =
                price;

            }

            const oldPrice =
            LAST_PRICES[coin];

            const change =
            (
                (price - oldPrice)
                / oldPrice
            ) * 100;

            let direction = "➖";

            if(change > 0){

                direction = "🟢";

            }

            else if(change < 0){

                direction = "🔴";

            }

            message +=

`${direction} ${coin} RM${formatPrice(
coin,
price
)} (${change.toFixed(2)}%)\n`;

            LAST_PRICES[coin] =
            price;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "Price scanner failed"
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

        for(const coin in MAIN_COINS){

            const pair =
            MAIN_COINS[coin];

            const [
                ticker,
                orderbook
            ] = await Promise.all([

                axios.get(

                    `https://api.luno.com/api/1/ticker?pair=${pair}`

                ),

                axios.get(

                    `https://api.luno.com/api/1/orderbook?pair=${pair}`

                )

            ]);

            const price =
            parseFloat(
                ticker.data.last_trade
            );

            const bids =
            orderbook.data.bids;

            const asks =
            orderbook.data.asks;

            const walls =
            getWalls(
                bids,
                asks,
                price
            );

            if(!walls){

                continue;

            }

            const {

                support,
                supportVolume,
                resistance,
                resistanceVolume

            } = walls;

            const trend =
            detectTrend(

                price,
                support,
                resistance,
                supportVolume,
                resistanceVolume

            );

            message +=

`📊 ${coin}

💰 Price RM${formatPrice(
coin,
price
)}

🟢 Support RM${formatPrice(
coin,
support
)}

📦 Buy Volume ${supportVolume.toFixed(2)}

🔴 Resistance RM${formatPrice(
coin,
resistance
)}

📦 Sell Volume ${resistanceVolume.toFixed(2)}

📈 Trend ${trend}

`;

            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

            TREND_DIRECTION[coin] =
            trend;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "Structure scanner failed"
        );

    }

}

// =====================================
// EVENT SCANNER
// =====================================

async function eventScanner(){

    try{

        const coins =
        Object.keys(EVENT_COINS);

        await Promise.all(

            coins.map(async (coin) => {

                try{

                    const pair =
                    EVENT_COINS[coin];

                    const [
                        ticker,
                        orderbook
                    ] = await Promise.all([

                        axios.get(

                            `https://api.luno.com/api/1/ticker?pair=${pair}`

                        ),

                        axios.get(

                            `https://api.luno.com/api/1/orderbook?pair=${pair}`

                        )

                    ]);

                    const price =
                    parseFloat(
                        ticker.data.last_trade
                    );

                    const bids =
                    orderbook.data.bids;

                    const asks =
                    orderbook.data.asks;

                    const walls =
                    getWalls(
                        bids,
                        asks,
                        price
                    );

                    if(!walls){

                        return;

                    }

                    const {

                        support,
                        supportVolume,
                        resistance,
                        resistanceVolume

                    } = walls;

                    const trend =
                    detectTrend(

                        price,
                        support,
                        resistance,
                        supportVolume,
                        resistanceVolume

                    );

                    // =====================================
                    // TREND FILTER
                    // =====================================

                    if(

                        trend === "BEARISH"

                    ){

                        console.log(
                            `${coin} bearish trend filtered`
                        );

                        return;

                    }

                    // =====================================
                    // FIRST MEMORY
                    // =====================================

                    if(!LAST_EVENT_PRICE[coin]){

                        LAST_EVENT_PRICE[coin] =
                        price;

                        return;

                    }

                    const oldPrice =
                    LAST_EVENT_PRICE[coin];

                    const change =
                    (
                        (price - oldPrice)
                        / oldPrice
                    ) * 100;

                    const ratio =
                    supportVolume /
                    resistanceVolume;

                    const now =
                    Date.now();

                    // =====================================
                    // COOLDOWN
                    // =====================================

                    if(!LAST_ALERT_TIME[coin]){

                        LAST_ALERT_TIME[coin] =
                        0;

                    }

                    if(

                        now -
                        LAST_ALERT_TIME[coin]
                        < ALERT_COOLDOWN

                    ){

                        LAST_EVENT_PRICE[coin] =
                        price;

                        return;

                    }

                    // =====================================
                    // RESET STATES
                    // =====================================

                    if(price < resistance){

                        BREAKOUT_ACTIVE[coin] =
                        false;

                    }

                    if(price > support){

                        REJECTION_ACTIVE[coin] =
                        false;

                    }

                    if(change < 0.2){

                        MOMENTUM_ACTIVE[coin] =
                        false;

                    }

                    // =====================================
                    // BUYER MOMENTUM
                    // =====================================

                    if(

                        !MOMENTUM_ACTIVE[coin] &&

                        change > 0.3 &&
                        ratio > 1.8 &&
                        trend === "BULLISH"

                    ){

                        sendTelegram(

`🚀 ${coin} BUYER MOMENTUM

💰 RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🟢 Buyer wall semakin kuat

📦 Buy Volume ${supportVolume.toFixed(2)}

📈 Trend ${trend}

🔥 Momentum increasing`

                        );

                        MOMENTUM_ACTIVE[coin] =
                        true;

                        LAST_ALERT_TIME[coin] =
                        now;

                    }

                    // =====================================
                    // ACCUMULATION DETECTOR
                    // =====================================

                    else if(

                        !BREAKOUT_ACTIVE[coin] &&

                        !BREAKOUT_CANDIDATE[coin] &&

                        ratio > 1.5 &&

                        price >= resistance * 0.998 &&

                        supportVolume >
                        resistanceVolume * 1.5 &&

                        trend === "BULLISH"

                    ){

                        sendTelegram(

`👀 ${coin} ACCUMULATION DETECTED

💰 Price RM${formatPrice(
coin,
price
)}

🟢 Buyer wall meningkat

🔴 Resistance makin lemah

📦 Buy Volume ${supportVolume.toFixed(2)}

📦 Sell Volume ${resistanceVolume.toFixed(2)}

📈 Trend ${trend}

⚠️ Possible breakout brewing`

                        );

                        BREAKOUT_CANDIDATE[coin] =
                        true;

                        BREAKOUT_TIMER[coin] =
                        now;

                    }

                    // =====================================
                    // CONFIRMED BREAKOUT
                    // =====================================

                    else if(

                        BREAKOUT_CANDIDATE[coin] &&

                        !BREAKOUT_ACTIVE[coin] &&

                        price >
                        resistance * 1.002 &&

                        ratio > 1.8 &&

                        trend === "BULLISH"

                    ){

                        if(

                            now -
                            BREAKOUT_TIMER[coin]
                            >= BREAKOUT_CONFIRM_MS

                        ){

                            sendTelegram(

`🚀 ${coin} CONFIRMED BREAKOUT

💰 Price RM${formatPrice(
coin,
price
)}

🔴 Resistance Broken RM${formatPrice(
coin,
resistance
)}

📦 Buyer Volume ${supportVolume.toFixed(2)}

📈 Trend ${trend}

🔥 Breakout confirmed`

                            );

                            BREAKOUT_ACTIVE[coin] =
                            true;

                            BREAKOUT_CANDIDATE[coin] =
                            false;

                            LAST_ALERT_TIME[coin] =
                            now;

                        }

                    }

                    // =====================================
                    // RESET BREAKOUT
                    // =====================================

                    else{

                        BREAKOUT_CANDIDATE[coin] =
                        false;

                    }

                    // =====================================
                    // REJECTION
                    // =====================================

                    if(

                        !REJECTION_ACTIVE[coin] &&

                        resistanceVolume >
                        supportVolume * 2

                    ){

                        sendTelegram(

`⚠️ ${coin} REJECTION

💰 Price RM${formatPrice(
coin,
price
)}

🔴 Resistance RM${formatPrice(
coin,
resistance
)}

📦 Sell Volume ${resistanceVolume.toFixed(2)}

🟢 Support RM${formatPrice(
coin,
support
)}

📦 Buy Volume ${supportVolume.toFixed(2)}

📉 Trend ${trend}

⚠️ Seller wall lebih kuat`

                        );

                        REJECTION_ACTIVE[coin] =
                        true;

                        LAST_ALERT_TIME[coin] =
                        now;

                    }

                    LAST_SUPPORT[coin] =
                    support;

                    LAST_RESISTANCE[coin] =
                    resistance;

                    LAST_EVENT_PRICE[coin] =
                    price;

                    LAST_PRICES[coin] =
                    price;

                    TREND_DIRECTION[coin] =
                    trend;

                }catch(err){

                    console.log(
                        `${coin} scanner failed`
                    );

                }

            })

        );

    }catch(err){

        console.log(
            "Event scanner failed"
        );

        console.log(err.message);

    }

}

// =====================================
// LIVE CRYPTO NEWS
// =====================================

async function cryptoNewsScanner(){

    try{

        const response =
        await axios.get(

            "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"

        );

        const news =
        response.data.Data;

        if(!news || news.length === 0){

            return;

        }

        for(const item of news.slice(0,5)){

            const title =
            item.title;

            if(
                LAST_NEWS.includes(title)
            ){

                continue;

            }

            LAST_NEWS.push(title);

            if(LAST_NEWS.length > 30){

                LAST_NEWS.shift();

            }

            sendTelegram(

`📰 LIVE CRYPTO NEWS

${title}

📰 Update pasaran kripto`

            );

        }

    }catch(err){

        console.log(
            "Crypto news scanner failed"
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
// SAFE START
// =====================================

setTimeout(() => {

    console.log(
        "Scanner started"
    );

    scanPrices();
    marketStructure();
    eventScanner();
    cryptoNewsScanner();

    // PRICE UPDATE
    // EVERY 5 MINUTES

    setInterval(
        scanPrices,
        300000
    );

    // MARKET STRUCTURE
    // EVERY 15 MINUTES

    setInterval(
        marketStructure,
        900000
    );

    // REALTIME EVENT SCANNER
    // EVERY 5 SECONDS

    setInterval(
        eventScanner,
        5000
    );

    // NEWS
    // EVERY 30 MINUTES

    setInterval(
        cryptoNewsScanner,
        1800000
    );

}, 10000);