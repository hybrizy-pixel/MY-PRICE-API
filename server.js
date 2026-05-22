require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// =====================================
// RANDOM DEPLOYMENT CODE
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
// CONFIG
// =====================================

const PORT =
process.env.PORT || 3000;

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// BOT
// =====================================

const bot =
new TelegramBot(
    TELEGRAM_TOKEN,
    {
        polling:true
    }
);

// =====================================
// COINS
// =====================================

const COINS = {

    BTC:"XBTMYR",
    GRT:"GRTMYR",
    XRP:"XRPMYR",
    XLM:"XLMMYR",
    AAVE:"AAVEMYR",
    CRV:"CRVMYR"

};

// =====================================
// FEES
// =====================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

// =====================================
// ALERT COOLDOWN
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
// MEMORY
// =====================================

const USER_FLOW = {};
const ACTIVE_TRADES = {};
const TRADE_HISTORY = {};
const LAST_PRICE = {};

const ALERTS = {

    breakout:{},
    breakdown:{},
    whale:{},
    rejection:{},
    liquidity:{},
    scalp:{},
    normal:{}

};

// =====================================
// HELPERS
// =====================================

function now(){
    return Date.now();
}

function cooldownPassed(
    store,
    coin,
    cooldown = 600000
){

    if(!store[coin]){
        return true;
    }

    return (
        now() -
        store[coin]
    ) > cooldown;

}

function setCooldown(
    store,
    coin
){

    store[coin] =
    now();

}

function createTradeId(){

    return (
        "TRD_" +
        Date.now() +
        "_" +
        Math.floor(
            Math.random()*999999
        )
    );

}

function formatPrice(
    coin,
    price
){

    if(!price){
        return "0";
    }

    if(coin === "BTC"){

        return Number(price)
        .toFixed(2);

    }

    return Number(price)
    .toFixed(4);

}

function formatUnit(
    coin,
    unit
){

    if(
        coin === "BTC"
        ||
        coin === "AAVE"
    ){

        return Number(unit)
        .toFixed(6);

    }

    return Math.floor(unit)
    .toLocaleString();

}

function hasActiveTrade(
    userId,
    coin
){

    for(
        const tradeId in
        ACTIVE_TRADES
    ){

        const trade =
        ACTIVE_TRADES[tradeId];

        if(
            trade.userId ==
            userId
            &&
            trade.coin ==
            coin
        ){

            return true;

        }

    }

    return false;

}

async function sendTelegram(
    message,
    extra = {}
){

    try{

        await bot.sendMessage(
            CHAT_ID,
            `${SERVER_CODE} ${message}`,
            extra
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

async function getTicker(coin){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(
            `https://api.luno.com/api/1/ticker?pair=${pair}`
        );

        return response.data;

    }catch(err){

        return null;

    }

}

async function getOrderbook(coin){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(
            `https://api.luno.com/api/1/orderbook?pair=${pair}`
        );

        return response.data;

    }catch(err){

        return null;

    }

}

// =====================================
// STRONGEST WALL DETECTION
// =====================================

function getStrongestSupport(bids){

    let strongest =
    bids[0];

    for(const bid of bids){

        if(
            parseFloat(bid.volume)
            >
            parseFloat(
                strongest.volume
            )
        ){

            strongest = bid;

        }

    }

    return {

        price:
        parseFloat(
            strongest.price
        ),

        volume:
        parseFloat(
            strongest.volume
        )

    };

}

function getStrongestResistance(asks){

    let strongest =
    asks[0];

    for(const ask of asks){

        if(
            parseFloat(ask.volume)
            >
            parseFloat(
                strongest.volume
            )
        ){

            strongest = ask;

        }

    }

    return {

        price:
        parseFloat(
            strongest.price
        ),

        volume:
        parseFloat(
            strongest.volume
        )

    };

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(coin){

    const orderbook =
    await getOrderbook(
        coin
    );

    if(!orderbook){
        return null;
    }

    const bids =
    orderbook.bids;

    const asks =
    orderbook.asks;

    if(
        bids.length < 10
        ||
        asks.length < 10
    ){
        return null;
    }

    const bestBid =
    bids[0];

    const bestAsk =
    asks[0];

    const currentPrice =
    parseFloat(
        bestBid.price
    );

    const askPrice =
    parseFloat(
        bestAsk.price
    );

    const spread =
    askPrice -
    currentPrice;

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
    // FILTER SUPPORT
    // =====================================

    const filteredBids =
    bids.filter(bid => {

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
    // FILTER RESISTANCE
    // =====================================

    const filteredAsks =
    asks.filter(ask => {

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

    // =====================================
    // STRONGEST WALLS
    // =====================================

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

    const buyVolume =
    bids.reduce(
        (a,b)=>
        a + parseFloat(b.volume),
        0
    );

    const sellVolume =
    asks.reduce(
        (a,b)=>
        a + parseFloat(b.volume),
        0
    );

    const pressure =
    buyVolume /
    sellVolume;

    let consumedResistance = 0;

    let oldResistance =
    parseFloat(
        asks[0].price
    );

    let newResistance =
    parseFloat(
        asks[0].price
    );

    for(let i=0;i<5;i++){

        const layer =
        asks[i];

        const volume =
        parseFloat(
            layer.volume
        );

        if(volume < 10000){

            consumedResistance++;

            newResistance =
            parseFloat(
                layer.price
            );

        }

    }

    let collapsedSupport = 0;

    let oldSupport =
    parseFloat(
        bids[0].price
    );

    let newSupport =
    parseFloat(
        bids[0].price
    );

    for(let i=0;i<5;i++){

        const layer =
        bids[i];

        const volume =
        parseFloat(
            layer.volume
        );

        if(volume < 10000){

            collapsedSupport++;

            newSupport =
            parseFloat(
                layer.price
            );

        }

    }

    let trend =
    "SIDEWAYS";

    if(
        pressure > 1.2
        &&
        spreadPercent < 0.0012
    ){

        trend = "BULLISH";

    }

    if(
        pressure < 0.85
        &&
        spreadPercent > 0.0015
    ){

        trend = "BEARISH";

    }

    return {

        currentPrice,
        askPrice,

        bestBidPrice:
        parseFloat(
            bestBid.price
        ),

        bestAskPrice:
        parseFloat(
            bestAsk.price
        ),

        supportPrice:
        strongestSupport.price,

        supportVolume:
        strongestSupport.volume,

        resistancePrice:
        strongestResistance.price,

        resistanceVolume:
        strongestResistance.volume,

        buyVolume,
        sellVolume,

        spread,
        spreadPercent,

        pressure,

        trend,

        consumedResistance,
        oldResistance,
        newResistance,

        collapsedSupport,
        oldSupport,
        newSupport

    };

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

        let emoji = "➖";

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

        const pressureText =
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

RM${formatPrice(
    coin,
    data.currentPrice
)}

${pressureText}

🟢 Strong Support
RM${formatPrice(
    coin,
    data.supportPrice
)}

(${formatUnit(
    coin,
    data.supportVolume
)})