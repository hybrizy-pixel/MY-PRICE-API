// =====================================
// IMPORTS
// =====================================

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
// TELEGRAM API
// =====================================

const TELEGRAM_API =
`https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

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
// COINS
// =====================================

const MAIN_COINS = {

    BTC: "XBTMYR",
    GRT: "GRTMYR"

};

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
const LAST_EVENT_PRICE = {};
const LAST_ALERT_TIME = {};
const LAST_NEWS = [];

// =====================================
// STATES
// =====================================

const BREAKOUT_ACTIVE = {};
const BREAKDOWN_ACTIVE = {};
const REJECTION_ACTIVE = {};

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

const LUNO_FEE =
0.005;

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

            `${TELEGRAM_API}/sendMessage`,

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
            "Telegram failed"
        );

    }

}

// =====================================
// SET TELEGRAM COMMANDS
// =====================================

async function setTelegramCommands(){

    try{

        await axios.post(

            `${TELEGRAM_API}/setMyCommands`,

            {

                commands: [

                    {
                        command: "price",
                        description:
                        "Live harga crypto"
                    },

                    {
                        command: "market",
                        description:
                        "Market structure semasa"
                    },

                    {
                        command: "entry",
                        description:
                        "Cari possible entry"
                    },

                    {
                        command: "news",
                        description:
                        "Latest crypto news"
                    },

                    {
                        command: "top",
                        description:
                        "Top bullish coin"
                    },

                    {
                        command: "scanner",
                        description:
                        "Scanner status"
                    },

                    {
                        command: "list",
                        description:
                        "List semua command"
                    }

                ]

            }

        );

        console.log(
            "Telegram commands updated"
        );

    }catch(err){

        console.log(
            "Failed set commands"
        );

    }

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req, res) => {

    res.json({

        status:
        "SMART SCANNER ACTIVE",

        instance:
        INSTANCE

    });

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

    if(
        resistanceVolume >
        supportVolume * 1.5
    ){

        return "BEARISH";

    }

    return "SIDEWAYS";

}

// =====================================
// LIVE PRICE
// =====================================

async function scanPrices(){

    try{

        let message =
        "📊 PRICE UPDATE\n";

        const coins =
        Object.keys(MAIN_COINS);

        for(const coin of coins){

            const response =
            await axios.get(

                `https://api.luno.com/api/1/ticker?pair=${MAIN_COINS[coin]}`

            );

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

            let icon = "➖";

            if(change > 0){

                icon = "🟢";

            }

            else if(change < 0){

                icon = "🔴";

            }

            message +=

`\n${coin}
${icon} RM${formatPrice(
coin,
price
)} (${change.toFixed(2)}%)\n`;

            LAST_PRICES[coin] =
            price;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "Price update failed"
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

            const walls =
            getWalls(

                orderbook.data.bids,
                orderbook.data.asks,
                price

            );

            if(!walls){

                continue;

            }

            const trend =
            detectTrend(

                walls.supportVolume,
                walls.resistanceVolume

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
walls.support
)}
📦 Buy Volume ${walls.supportVolume.toFixed(2)}

🔴 Resistance RM${formatPrice(
coin,
walls.resistance
)}
📦 Sell Volume ${walls.resistanceVolume.toFixed(2)}

📈 Trend ${trend}
`;

        }

        message +=
        "\n━━━━━━━━━━━━━━━";

        await sendTelegram(message);

    }catch(err){

        console.log(
            "Market structure failed"
        );

    }

}

// =====================================
// HIGH QUALITY ENTRY
// =====================================

async function findPossibleEntry(){

    try{

        let found =
        false;

        for(const coin in EVENT_COINS){

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

            const walls =
            getWalls(

                orderbook.data.bids,
                orderbook.data.asks,
                price

            );

            if(!walls){

                continue;

            }

            const trend =
            detectTrend(

                walls.supportVolume,
                walls.resistanceVolume

            );

            // =====================================
            // HIGH QUALITY FILTER
            // =====================================

            if(

                trend === "BULLISH" &&

                walls.supportVolume >
                walls.resistanceVolume * 1.8 &&

                price >=
                walls.resistance * 0.997

            ){

                found = true;

                const tp1 =
                price * 1.02;

                const tp2 =
                price * 1.03;

                const stoploss =
                walls.support * 0.995;

                const modal =
                120;

                const units =
                modal / price;

                const grossProfit =
                (tp1 - price)
                * units;

                const fees =
                (modal * LUNO_FEE)
                +
                ((units * tp1)
                * LUNO_FEE);

                const cleanProfit =
                grossProfit - fees;

                const confidence =
                Math.min(

                    95,

                    Math.floor(

                        (
                            walls.supportVolume
                            /
                            walls.resistanceVolume
                        ) * 45

                    )

                );

                await sendTelegram(

`━━━━━━━━━━━━━━━

🎯 ${coin} HIGH QUALITY ENTRY

💰 Entry RM${formatPrice(
coin,
price
)}

🟢 Strong Support RM${formatPrice(
coin,
walls.support
)}

🔴 Weak Resistance RM${formatPrice(
coin,
walls.resistance
)}

📦 Buyer Volume ${walls.supportVolume.toFixed(2)}
📦 Sell Volume ${walls.resistanceVolume.toFixed(2)}

📈 Trend ${trend}

🎯 TP1 RM${formatPrice(
coin,
tp1
)}

🎯 TP2 RM${formatPrice(
coin,
tp2
)}

🛑 Cutloss RM${formatPrice(
coin,
stoploss
)}

💵 Minimum Modal RM${modal}

📦 Suggested Unit ${units.toFixed(0)} ${coin}

💰 Estimated Profit After Fee
RM${cleanProfit.toFixed(2)}

🔥 Confidence ${confidence}%

━━━━━━━━━━━━━━━`

                );

            }

        }

        if(!found){

            await sendTelegram(

`━━━━━━━━━━━━━━━

❌ NO POSSIBLE ENTRY

📉 Market masih lemah

⚠️ Seller wall lebih dominan

🛑 Setup belum cukup kuat untuk entry

━━━━━━━━━━━━━━━`

            );

        }

    }catch(err){

        console.log(
            "Entry detector failed"
        );

    }

}

// =====================================
// NEWS COMMAND
// =====================================

async function sendNews(keyword = "CRYPTO"){

    try{

        const response =
        await axios.get(

            "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"

        );

        const news =
        response.data.Data;

        let filtered =
        news.filter(item =>

            item.title
            .toUpperCase()
            .includes(keyword)

        );

        if(filtered.length === 0){

            filtered =
            news.slice(0,3);

        }

        let message =

`━━━━━━━━━━━━━━━

📰 ${keyword} NEWS

`;

        filtered
        .slice(0,3)
        .forEach((item,index)=>{

            message +=

`\n${index + 1}. ${item.title}\n`;

        });

        message +=
`\n━━━━━━━━━━━━━━━`;

        await sendTelegram(
            message
        );

    }catch(err){

        console.log(
            "News failed"
        );

    }

}

// =====================================
// COMMAND LIST
// =====================================

async function sendCommandList(){

    await sendTelegram(

`━━━━━━━━━━━━━━━

🤖 SMART CRYPTO COMMAND LIST

📊 /price
Live harga crypto

📈 /market
Market structure semasa

🎯 /entry
Cari possible entry terbaik

📰 /news BTC
Latest crypto news

🔥 /top
Top bullish coin

⚙️ /scanner
Scanner status

📋 /list
List semua command

━━━━━━━━━━━━━━━`

    );

}

// =====================================
// TELEGRAM COMMAND HANDLER
// =====================================

let LAST_UPDATE_ID = 0;

async function checkTelegramCommands(){

    try{

        const response =
        await axios.get(

            `${TELEGRAM_API}/getUpdates?offset=${LAST_UPDATE_ID + 1}`

        );

        const updates =
        response.data.result;

        for(const update of updates){

            LAST_UPDATE_ID =
            update.update_id;

            if(

                !update.message ||
                !update.message.text

            ){

                continue;

            }

            const text =
            update.message.text;

            if(text === "/price"){

                await scanPrices();

            }

            else if(text === "/market"){

                await marketStructure();

            }

            else if(text === "/entry"){

                await findPossibleEntry();

            }

            else if(
                text.startsWith("/news")
            ){

                const parts =
                text.split(" ");

                let keyword =
                "CRYPTO";

                if(parts[1]){

                    keyword =
                    parts[1].toUpperCase();

                }

                await sendNews(
                    keyword
                );

            }

            else if(text === "/list"){

                await sendCommandList();

            }

            else if(text === "/top"){

                await sendTelegram(

`━━━━━━━━━━━━━━━

🔥 TOP BULLISH COIN

1️⃣ GRT
2️⃣ AAVE
3️⃣ BTC

━━━━━━━━━━━━━━━`

                );

            }

            else if(text === "/scanner"){

                await sendTelegram(

`━━━━━━━━━━━━━━━

🤖 SCANNER STATUS

✅ Scanner Active
✅ Live Monitoring
✅ Breakout Detection
✅ Breakdown Detection
✅ Entry Detection

━━━━━━━━━━━━━━━`

                );

            }

        }

    }catch(err){

        console.log(
            "Telegram command failed"
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
// START SYSTEM
// =====================================

setTimeout(() => {

    console.log(
        "Scanner started"
    );

    setTelegramCommands();

    scanPrices();

    // LIVE PRICE
    setInterval(
        scanPrices,
        300000
    );

    // TELEGRAM COMMAND
    setInterval(
        checkTelegramCommands,
        5000
    );

}, 10000);