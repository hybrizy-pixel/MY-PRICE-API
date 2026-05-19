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
const LAST_EVENT_PRICE = {};
const LAST_NEWS = [];

// =====================================
// SMART STATES
// =====================================

const BREAKOUT_ACTIVE = {};
const BREAKDOWN_ACTIVE = {};

const ACCUMULATION_ACTIVE = {};
const ACCUMULATION_CONFIRMED = {};
const ACCUMULATION_TIMER = {};

// =====================================
// SETTINGS
// =====================================

const ALERT_COOLDOWN =
300000;

const ACCUMULATION_CONFIRM_MS =
15000;

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
    supportVolume,
    resistanceVolume
){

    const ratio =
    supportVolume /
    resistanceVolume;

    if(ratio > 1.8){

        return "BULLISH";

    }

    if(resistanceVolume > supportVolume * 1.5){

        return "BEARISH";

    }

    return "SIDEWAYS";

}

// =====================================
// PRICE UPDATE
// =====================================

async function scanPrices(){

    try{

        let message =
        "📊 PRICE UPDATE\n";

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

`\n━━━━━━━━━━━━━━━

📊 ${coin}

${direction} RM${formatPrice(
coin,
price
)}

📈 Change ${change.toFixed(2)}%
`;

            LAST_PRICES[coin] =
            price;

        }

        message +=
        "\n━━━━━━━━━━━━━━━";

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
        "📊 MARKET STRUCTURE\n";

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
                supportVolume,
                resistanceVolume
            );

            message +=

`\n━━━━━━━━━━━━━━━

📊 ${coin}

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

        }

        message +=
        "\n━━━━━━━━━━━━━━━";

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
                        supportVolume,
                        resistanceVolume
                    );

                    if(!LAST_EVENT_PRICE[coin]){

                        LAST_EVENT_PRICE[coin] =
                        price;

                        return;

                    }

                    const oldPrice =
                    LAST_EVENT_PRICE[coin];

                    const now =
                    Date.now();

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

                    // RESET BREAKOUT

                    if(price < resistance){

                        BREAKOUT_ACTIVE[coin] =
                        false;

                    }

                    // RESET BREAKDOWN

                    if(price > support){

                        BREAKDOWN_ACTIVE[coin] =
                        false;

                    }

                    // RESET ACCUMULATION

                    if(trend !== "BULLISH"){

                        ACCUMULATION_ACTIVE[coin] =
                        false;

                        ACCUMULATION_CONFIRMED[coin] =
                        false;

                    }

                    // =====================================
                    // EARLY ACCUMULATION
                    // =====================================

                    if(

                        !ACCUMULATION_ACTIVE[coin] &&

                        trend === "BULLISH" &&

                        supportVolume >
                        resistanceVolume * 1.5 &&

                        price >=
                        resistance * 0.997

                    ){

                        ACCUMULATION_ACTIVE[coin] =
                        true;

                        ACCUMULATION_TIMER[coin] =
                        now;

                        LAST_ALERT_TIME[coin] =
                        now;

                        sendTelegram(

`━━━━━━━━━━━━━━━

👀 ${coin} EARLY ACCUMULATION DIKESAN

💰 Price RM${formatPrice(
coin,
price
)}

🟢 Buyer wall mula meningkat

📦 Buy Volume ${supportVolume.toFixed(2)}

🔴 Resistance masih bertahan

📦 Sell Volume ${resistanceVolume.toFixed(2)}

⚠️ Sistem sedang scan market

━━━━━━━━━━━━━━━`

                        );

                    }

                    // =====================================
                    // ACCUMULATION CONFIRMED
                    // =====================================

                    else if(

                        ACCUMULATION_ACTIVE[coin] &&

                        !ACCUMULATION_CONFIRMED[coin] &&

                        trend === "BULLISH" &&

                        supportVolume >
                        resistanceVolume * 1.8

                    ){

                        if(

                            now -
                            ACCUMULATION_TIMER[coin]
                            >= ACCUMULATION_CONFIRM_MS

                        ){

                            ACCUMULATION_CONFIRMED[coin] =
                            true;

                            LAST_ALERT_TIME[coin] =
                            now;

                            sendTelegram(

`━━━━━━━━━━━━━━━

🚀 ${coin} EARLY ACCUMULATION CONFIRMED

💰 RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🟢 Buyer pressure semakin kuat

🔴 Resistance makin lemah

📦 Buy Volume ${supportVolume.toFixed(2)}

🔥 Breakout probability tinggi

━━━━━━━━━━━━━━━`

                            );

                        }

                    }

                    // =====================================
                    // VALID BREAKOUT
                    // =====================================

                    else if(

                        !BREAKOUT_ACTIVE[coin] &&

                        trend === "BULLISH" &&

                        supportVolume >
                        resistanceVolume * 1.8 &&

                        price >
                        resistance * 1.002

                    ){

                        BREAKOUT_ACTIVE[coin] =
                        true;

                        LAST_ALERT_TIME[coin] =
                        now;

                        sendTelegram(

`━━━━━━━━━━━━━━━

🚀 ${coin} BREAKOUT KE ATAS

💰 RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🔴 Resistance pecah RM${formatPrice(
coin,
resistance
)}

📦 Buyer Volume ${supportVolume.toFixed(2)}

📈 Trend ${trend}

🔥 Buyer takeover market

━━━━━━━━━━━━━━━`

                        );

                    }

                    // =====================================
                    // VALID BREAKDOWN
                    // =====================================

                    else if(

                        !BREAKDOWN_ACTIVE[coin] &&

                        trend === "BEARISH" &&

                        resistanceVolume >
                        supportVolume * 1.8 &&

                        price <
                        support * 0.998

                    ){

                        BREAKDOWN_ACTIVE[coin] =
                        true;

                        LAST_ALERT_TIME[coin] =
                        now;

                        sendTelegram(

`━━━━━━━━━━━━━━━

🔻 ${coin} BREAKDOWN KE BAWAH

💰 RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🟢 Support pecah RM${formatPrice(
coin,
support
)}

📦 Sell Volume ${resistanceVolume.toFixed(2)}

📉 Trend ${trend}

⚠️ Seller takeover market

━━━━━━━━━━━━━━━`

                        );

                    }

                    // =====================================
                    // REJECTION
                    // =====================================

                    else if(

                        resistanceVolume >
                        supportVolume * 2

                    ){

                        LAST_ALERT_TIME[coin] =
                        now;

                        sendTelegram(

`━━━━━━━━━━━━━━━

⚠️ ${coin} REJECTION

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

⚠️ Seller wall lebih kuat

━━━━━━━━━━━━━━━`

                        );

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

`━━━━━━━━━━━━━━━

📰 LIVE CRYPTO NEWS

${title}

📰 Update pasaran kripto

━━━━━━━━━━━━━━━`

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

    setInterval(
        scanPrices,
        300000
    );

    // MARKET STRUCTURE

    setInterval(
        marketStructure,
        900000
    );

    // EVENT SCANNER

    setInterval(
        eventScanner,
        5000
    );

    // NEWS

    setInterval(
        cryptoNewsScanner,
        1800000
    );

}, 10000);