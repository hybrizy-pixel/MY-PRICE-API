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
// LIVE PRICE API
// =====================================

app.get('/price/:pair', async (req,res)=>{

    try{

        const pair =
        req.params.pair.toUpperCase();

        let lunoPair = '';

        if(pair === 'BTC'){

            lunoPair = 'XBTMYR';

        }else{

            lunoPair = pair + 'MYR';

        }

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${lunoPair}`

        );

        const price =
        parseFloat(
            response.data.last_trade
        );

        res.json({
            price
        });

    }catch(err){

        console.log(err);

        res.status(500).json({
            error:'FAILED'
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

    setInterval(
        scanPrices,
        300000
    );

}, 10000);