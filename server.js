const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

// =====================================
// TELEGRAM
// =====================================

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// INSTANCE
// =====================================

const INSTANCE =
Math.random().toString(36).substring(7);

console.log("INSTANCE:", INSTANCE);

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
// FORMAT PRICE
// =====================================

function formatPrice(coin, price){

    if(!price){
        return "0";
    }

    if(coin === "BTC"){
        return price.toFixed(2);
    }

    // GRT 4 DECIMAL

    if(coin === "GRT"){
        return price.toFixed(4);
    }

    // ALT SMALL DECIMAL

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

        console.log("Telegram sent");

    }catch(err){

        console.log("Telegram failed");
        console.log(err.message);

    }

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req, res) => {

    res.json({

        status: "SMART SCANNER RUNNING 🔥",
        instance: INSTANCE

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

        for(const coin in MAIN_COINS){

            const pair =
            MAIN_COINS[coin];

            const response =
            await axios.get(
                `https://api.luno.com/api/1/ticker?pair=${pair}`
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
// EVERY 15 MINUTES
// =====================================

async function marketStructure(){

    try{

        let message =
        "📊 MARKET STRUCTURE\n\n";

        for(const coin in MAIN_COINS){

            const pair =
            MAIN_COINS[coin];

            const ticker =
            await axios.get(
                `https://api.luno.com/api/1/ticker?pair=${pair}`
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

            const orderbook =
            await axios.get(
                `https://api.luno.com/api/1/orderbook?pair=${pair}`
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
// =====================================

async function eventScanner(){

    try{

        for(const coin in EVENT_COINS){

            const pair =
            EVENT_COINS[coin];

            const ticker =
            await axios.get(
                `https://api.luno.com/api/1/ticker?pair=${pair}`
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

            const orderbook =
            await axios.get(
                `https://api.luno.com/api/1/orderbook?pair=${pair}`
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

            if(!LAST_PRICES[coin]){

                LAST_PRICES[coin] =
                price;

                continue;

            }

            const oldPrice =
            LAST_PRICES[coin];

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

            if(!LAST_ALERT_TIME[coin]){

                LAST_ALERT_TIME[coin] =
                0;

            }

            // 5 MINUTE COOLDOWN

            if(
                now -
                LAST_ALERT_TIME[coin]
                < 300000
            ){

                continue;

            }

            // BTC LOGIC

            if(coin === "BTC"){

                if(

                    ratio > 3 &&
                    change > 1 &&
                    price >
                    oldPrice * 1.005

                ){

                    await sendTelegram(

`🚀 BTC BUYER MOMENTUM

RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🔥 Real upward momentum`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                else if(

                    resistanceVolume >
                    supportVolume * 3 &&

                    change < -1

                ){

                    await sendTelegram(

`🔴 BTC SELLER MOMENTUM

RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

📉 Real downward momentum`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                else if(

                    price >
                    resistance * 1.002 &&

                    ratio > 2.5

                ){

                    await sendTelegram(

`🚀 BTC BREAKOUT

RM${formatPrice(
coin,
price
)}

🔥 Bullish continuation`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

            }

            // ALTCOIN LOGIC

            else{

                if(

                    change > 1 &&
                    ratio > 2

                ){

                    await sendTelegram(

`🚀 ${coin} BUYER MOMENTUM

RM${formatPrice(
coin,
oldPrice
)} → RM${formatPrice(
coin,
price
)}

🔥 Momentum ke atas`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                else if(

                    resistanceVolume >
                    supportVolume * 2 &&

                    change < -1

                ){

                    await sendTelegram(

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

                else if(

                    price >
                    resistance * 1.002 &&
                    ratio > 2

                ){

                    await sendTelegram(

`🚀 ${coin} BREAKOUT

RM${formatPrice(
coin,
price
)}

🔥 Bullish momentum`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                else if(

                    price < resistance &&
                    resistanceVolume >
                    supportVolume * 2

                ){

                    await sendTelegram(

`⚠️ ${coin} REJECTION

RM${formatPrice(
coin,
price
)} gagal lepas RM${formatPrice(
coin,
resistance
)}

🔴 Resistance wall tebal`

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

            }

            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

            LAST_PRICES[coin] =
            price;

        }

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

            let summary =
            "";

            const lower =
            title.toLowerCase();

            if(lower.includes("bitcoin")){
                summary =
                "🟠 Berita berkaitan Bitcoin";
            }

            else if(lower.includes("ethereum")){
                summary =
                "🟣 Berita berkaitan Ethereum";
            }

            else if(lower.includes("xrp")){
                summary =
                "⚫ Berita berkaitan XRP";
            }

            else if(lower.includes("etf")){
                summary =
                "🏦 Berita ETF kripto";
            }

            else if(lower.includes("sec")){
                summary =
                "⚖️ Berita regulator SEC";
            }

            else if(lower.includes("binance")){
                summary =
                "🟡 Berita Binance";
            }

            else if(lower.includes("hack")){
                summary =
                "🚨 Berita hack/exploit";
            }

            else if(lower.includes("whale")){
                summary =
                "🐋 Aktiviti whale dikesan";
            }

            else if(lower.includes("bull")){
                summary =
                "📈 Sentimen bullish";
            }

            else if(lower.includes("bear")){
                summary =
                "📉 Sentimen bearish";
            }

            else{
                summary =
                "📰 Update pasaran kripto";
            }

            await sendTelegram(

`📰 LIVE CRYPTO NEWS

${title}

${summary}`

            );

        }

    }catch(err){

        console.log(
            "Crypto news scanner failed"
        );

        console.log(err.message);

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

    setInterval(
        scanPrices,
        300000
    );

    setInterval(
        marketStructure,
        900000
    );

    setInterval(
        eventScanner,
        300000
    );

    // CHECK NEWS EVERY 30 MINUTES

    setInterval(
        cryptoNewsScanner,
        1800000
    );

}, 10000);