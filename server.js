require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

// =====================================
// EXPRESS
// =====================================

const app = express();

const PORT =
process.env.PORT || 3000;

// =====================================
// RANDOM SERVER CODE
// =====================================

function generateServerCode(){

    const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let result = "";

    for(let i=0;i<4;i++){

        result += chars.charAt(
            Math.floor(
                Math.random() *
                chars.length
            )
        );

    }

    return `[${result}]`;

}

const SERVER_CODE =
generateServerCode();

// =====================================
// TELEGRAM
// =====================================

const TOKEN =
process.env.BOT_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

if(
    !TOKEN ||
    !CHAT_ID
){

    console.log(
        "BOT TOKEN / CHAT ID MISSING"
    );

    process.exit(1);

}

const bot =
new TelegramBot(
    TOKEN,
    {
        polling:true
    }
);

// =====================================
// COINS
// =====================================

const COINS = {

    BTC:"XBTMYR",
    GRT:"GRTMYR"

};

// =====================================
// FEES
// =====================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

// =====================================
// MEMORY
// =====================================

const LAST_PRICE = {};

const USER_FLOW = {};

const ACTIVE_TRADES = {};

const ALERTS = {

    breakout:{},
    breakdown:{},
    whale:{},
    rejection:{},
    liquidity:{},

    scalp:{},
    normal:{},

    lastEntryPrice:{}

};

// =====================================
// COOLDOWN
// =====================================

const ALERT_COOLDOWN = {

    breakout:900000,
    breakdown:900000,

    whale:1800000,
    rejection:1800000,
    liquidity:1800000,

    scalp:1200000,
    normal:1200000

};

// =====================================
// HELPERS
// =====================================

function now(){

    return Date.now();

}

function createTradeId(){

    return (
        "TRADE_" +
        Date.now()
    );

}

function cooldownPassed(
    storage,
    coin,
    cooldown
){

    if(
        !storage[coin]
    ){
        return true;
    }

    return (
        now() -
        storage[coin]
    ) > cooldown;

}

function setCooldown(
    storage,
    coin
){

    storage[coin] =
    now();

}

function formatPrice(
    coin,
    value
){

    if(
        coin === "BTC"
    ){

        return Number(
            value
        ).toFixed(2);

    }

    return Number(
        value
    ).toFixed(4);

}

function formatUnit(
    coin,
    value
){

    if(
        coin === "BTC"
    ){

        return Number(
            value
        ).toFixed(6);

    }

    return Number(
        value
    ).toFixed(0);

}

async function sendTelegram(
    message,
    options = {}
){

    try{

        const timestamp =
        new Date().toLocaleTimeString(
            "en-MY",
            {
                hour12:false
            }
        );

        await bot.sendMessage(
            CHAT_ID,
            `${SERVER_CODE} [${timestamp}] ${message}`,
            {
                parse_mode:"HTML",
                ...options
            }
        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// API
// =====================================

async function getTicker(
    coin
){

    try{

        const response =
        await axios.get(
            `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`,
            {
                timeout:5000
            }
        );

        return response.data;

    }catch(err){

        return null;

    }

}

async function getOrderbook(
    coin
){

    try{

        const response =
        await axios.get(
            `https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`,
            {
                timeout:5000
            }
        );

        return response.data;

    }catch(err){

        return null;

    }

}

// =====================================
// STRONGEST WALL
// =====================================

function getStrongestSupport(
    bids
){

    return bids.reduce(
        (
            strongest,
            current
        ) => {

            return (
                parseFloat(
                    current.volume
                ) >
                parseFloat(
                    strongest.volume
                )
            )
            ?
            current
            :
            strongest;

        }
    );

}

function getStrongestResistance(
    asks
){

    return asks.reduce(
        (
            strongest,
            current
        ) => {

            return (
                parseFloat(
                    current.volume
                ) >
                parseFloat(
                    strongest.volume
                )
            )
            ?
            current
            :
            strongest;

        }
    );

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(
    coin
){

    try{

        const [
            orderbook,
            ticker
        ] = await Promise.all([
            getOrderbook(coin),
            getTicker(coin)
        ]);

        if(
            !orderbook ||
            !ticker
        ){
            return null;
        }

        const bids =
        orderbook.bids;

        const asks =
        orderbook.asks;

        if(
            !bids.length ||
            !asks.length
        ){
            return null;
        }

        // =====================================
        // DISPLAY PRICE (LUNO UI)
        // =====================================

        const displayPrice =
        parseFloat(
            ticker.last_trade
        );

        // =====================================
        // REAL EXECUTION PRICE
        // =====================================

        const bestBidPrice =
        parseFloat(
            bids[0].price
        );

        const bestAskPrice =
        parseFloat(
            asks[0].price
        );

        // =====================================
        // LIVE MARKET PRICE
        // =====================================

        const marketPrice =
        (
            bestBidPrice +
            bestAskPrice
        ) / 2;

        // =====================================
        // MAIN ENGINE PRICE
        // =====================================

        const currentPrice =
        marketPrice;

        // =====================================
        // SPREAD
        // =====================================

        const spread =
        bestAskPrice -
        bestBidPrice;

        const spreadPercent =
        spread /
        currentPrice;

        // =====================================
        // RANGE FILTER
        // =====================================

        const supportRange =
        coin === "BTC"
        ?
        0.992
        :
        0.985;

        const resistanceRange =
        coin === "BTC"
        ?
        1.005
        :
        1.01;

        // =====================================
        // SUPPORT FILTER
        // =====================================

        const filteredBids =
        bids.filter(bid=>{

            const price =
            parseFloat(
                bid.price
            );

            return (

                price >=
                currentPrice *
                supportRange

                &&

                price <=
                currentPrice

            );

        });

        // =====================================
        // RESISTANCE FILTER
        // =====================================

        const filteredAsks =
        asks.filter(ask=>{

            const price =
            parseFloat(
                ask.price
            );

            return (

                price <=
                currentPrice *
                resistanceRange

                &&

                price >=
                currentPrice

            );

        });

        const strongestSupport =
        getStrongestSupport(

            filteredBids.length > 0
            ?
            filteredBids
            :
            bids.slice(0,5)

        );

        const strongestResistance =
        getStrongestResistance(

            filteredAsks.length > 0
            ?
            filteredAsks
            :
            asks.slice(0,5)

        );

        // =====================================
        // BUY PRESSURE
        // =====================================

        let buyVolume = 0;

        for(
            const bid of bids
        ){

            if(
                parseFloat(
                    bid.price
                ) >=
                currentPrice * 0.995
            ){

                buyVolume +=
                parseFloat(
                    bid.volume
                );

            }

        }

        // =====================================
        // SELL PRESSURE
        // =====================================

        let sellVolume = 0;

        for(
            const ask of asks
        ){

            if(
                parseFloat(
                    ask.price
                ) <=
                currentPrice * 1.005
            ){

                sellVolume +=
                parseFloat(
                    ask.volume
                );

            }

        }

        // =====================================
        // PRESSURE
        // =====================================

        const pressure =
        buyVolume /
        sellVolume;

        // =====================================
        // TREND
        // =====================================

        let trend =
        "SIDEWAYS";

        if(
            pressure > 1.2
            &&
            spreadPercent < 0.0012
        ){

            trend =
            "BULLISH";

        }

        if(
            pressure < 0.85
            &&
            spreadPercent > 0.0015
        ){

            trend =
            "BEARISH";

        }

        return {

            displayPrice,

            currentPrice,

            marketPrice,

            bestBidPrice,
            bestAskPrice,

            supportPrice:
            parseFloat(
                strongestSupport.price
            ),

            supportVolume:
            parseFloat(
                strongestSupport.volume
            ),

            resistancePrice:
            parseFloat(
                strongestResistance.price
            ),

            resistanceVolume:
            parseFloat(
                strongestResistance.volume
            ),

            pressure,
            trend,
            spread,
            spreadPercent

        };

    }catch(err){

        console.log(
            err.message
        );

        return null;

    }

}

// =====================================
// PRICE ALERT
// =====================================

async function sendPriceAlert(){

    let message =
`\n📡 PRICE ALERT\n`;

    for(
        const coin of
        ["BTC","GRT"]
    ){

        const ticker =
        await getTicker(
            coin
        );

        if(!ticker){
            continue;
        }

        const price =
        parseFloat(
            ticker.last_trade
        );

        let emoji =
        "➖";

        if(
            LAST_PRICE[coin]
        ){

            if(
                price >
                LAST_PRICE[coin]
            ){
                emoji = "🟢";
            }

            if(
                price <
                LAST_PRICE[coin]
            ){
                emoji = "🔴";
            }

        }

        LAST_PRICE[coin] =
        price;

        message += `

${emoji} ${coin}

RM${formatPrice(
    coin,
    price
)}
`;

    }

    await sendTelegram(
        message
    );

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function sendMarketStructure(){

    let message =
`\n📊 MARKET STRUCTURE\n`;

    for(
        const coin of
        ["BTC","GRT"]
    ){

        const data =
        await getMarketStructure(
            coin
        );

        if(!data){
            continue;
        }

        const trendText =
        data.trend === "BULLISH"
        ?
        "🔥 Buyer control"
        :
        data.trend === "BEARISH"
        ?
        "⚠️ Seller control"
        :
        "➖ Sideways market";

        message += `

🪙 ${coin}

💵 Luno Price
RM${formatPrice(
    coin,
    data.displayPrice
)}

⚡ Live Market
RM${formatPrice(
    coin,
    data.marketPrice
)}

📊 Spread
${data.spread.toFixed(
    coin === "BTC"
    ? 2
    : 4
)}

${trendText}

🟢 Support
RM${formatPrice(
    coin,
    data.supportPrice
)}

🔴 Resistance
RM${formatPrice(
    coin,
    data.resistancePrice
)}
`;

    }

    await sendTelegram(
        message
    );

}

// =====================================
// START SERVER
// =====================================

app.get("/",(req,res)=>{

    res.json({

        status:"BOT ACTIVE",
        server:SERVER_CODE

    });

});

app.listen(PORT,()=>{

    console.log(
        `SERVER RUNNING ${PORT}`
    );

});

// =====================================
// STARTUP
// =====================================

setTimeout(
    async ()=>{

    await sendTelegram(
`
✅ BOT ONLINE

🚀 SMART TERMINAL ACTIVE
`
    );

    await sendPriceAlert();

    await sendMarketStructure();

    setInterval(
        sendPriceAlert,
        300000
    );

    setInterval(
        sendMarketStructure,
        60000
    );

},5000);
