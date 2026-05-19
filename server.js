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

            let strength =
            "";

            if(

                supportVolume >
                resistanceVolume * 1.5

            ){

                strength =
                "🔥 Buyer pressure kuat";

            }

            else if(

                resistanceVolume >
                supportVolume * 1.5

            ){

                strength =
                "⚠️ Resistance kuat";

            }

            else{

                strength =
                "➖ Market masih seimbang";

            }

            message +=

`📊 ${coin}

🟢 Support RM${formatPrice(
coin,
support
)}

Volume: ${supportVolume.toFixed(2)}

🔴 Resistance RM${formatPrice(
coin,
resistance
)}

Volume: ${resistanceVolume.toFixed(2)}

${strength}

`;

            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

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
// REALTIME 5 SEC
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
                    // EARLY BUYER MOMENTUM
                    // =====================================

                    if(

                        !MOMENTUM_ACTIVE[coin] &&

                        change > 0.3 &&
                        ratio > 1.5

                    ){

                        sendTelegram(

`🚀 ${coin} BUYER MOMENTUM

RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🔥 Buyer acceleration detected`

                        );

                        MOMENTUM_ACTIVE[coin] =
                        true;

                        LAST_ALERT_TIME[coin] =
                        now;

                    }

                    // =====================================
                    // SELLER MOMENTUM
                    // =====================================

                    else if(

                        resistanceVolume >
                        supportVolume * 2 &&

                        change < -0.5

                    ){

                        sendTelegram(

`🔴 ${coin} SELLER MOMENTUM

RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

📉 Momentum ke bawah`

                        );

                        LAST_ALERT_TIME[coin] =
                        now;

                    }

                    // =====================================
                    // SMART BREAKOUT FILTER
                    // =====================================

                    else if(

                        !BREAKOUT_ACTIVE[coin] &&

                        price >=
                        resistance * 0.999 &&

                        ratio > 1.4

                    ){

                        // FIRST DETECTION

                        if(!BREAKOUT_CANDIDATE[coin]){

                            BREAKOUT_CANDIDATE[coin] =
                            true;

                            BREAKOUT_TIMER[coin] =
                            now;

                            sendTelegram(

`⚠️ ${coin} POTENTIAL BREAKOUT

RM${formatPrice(
coin,
price
)}

👀 Monitoring breakout strength`

                            );

                        }

                        // CONFIRM BREAKOUT

                        else if(

                            now -
                            BREAKOUT_TIMER[coin]
                            >= BREAKOUT_CONFIRM_MS

                        ){

                            sendTelegram(

`🚀 ${coin} CONFIRMED BREAKOUT

RM${formatPrice(
coin,
price
)}

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

                    // RESET BREAKOUT CANDIDATE

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

RM${formatPrice(
coin,
price
)}

🔴 Heavy resistance detected`

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