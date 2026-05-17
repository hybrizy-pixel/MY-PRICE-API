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
"8979342744:AAFbamnzNXbeJCAIxuUf78NAxKspoWvymGs";

const CHAT_ID =
"7161546";

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
const WALL_MEMORY = {};

// =====================================
// PRICE FORMAT
// =====================================

function formatPrice(
    coin,
    price
){

    if(coin === "BTC"){

        return price.toFixed(2);

    }

    if(coin === "GRT"){

        return price.toFixed(4);

    }

    if(coin === "XRP"){

        return price.toFixed(2);

    }

    if(coin === "AAVE"){

        return price.toFixed(2);

    }

    if(coin === "CRV"){

        return price.toFixed(3);

    }

    if(coin === "XLM"){

        return price.toFixed(3);

    }

    return price.toFixed(2);

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req, res) => {

    res.json({
        status: "SMART SCANNER RUNNING 🔥"
    });

});

// =====================================
// TELEGRAM
// =====================================

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

        console.log(
            "Telegram sent"
        );

    }catch(err){

        console.log(
            "Telegram failed"
        );

    }

}

// =====================================
// GET WALLS
// =====================================

function getWalls(
    bids,
    asks,
    currentPrice
){

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
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                response.data.last_trade
            );

            if(
                !LAST_PRICES[coin]
            ){

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

            }else if(change < 0){

                direction = "🔴";

            }

            message +=

            direction + " " +
            coin +

            " RM" +
            formatPrice(
                coin,
                price
            ) +

            " (" +
            change.toFixed(2) +
            "%)\n";

            LAST_PRICES[coin] =
            price;

        }

        // FORCE ALERT
        await sendTelegram(
            message
        );

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

            // PRICE
            const ticker =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
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

            const {

                support,
                supportVolume,

                resistance,
                resistanceVolume

            } =
            getWalls(
                bids,
                asks,
                price
            );

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

            "📊 " + coin +

            "\n\n🟢 Support RM" +
            formatPrice(
                coin,
                support
            ) +

            "\nVolume: " +
            supportVolume.toFixed(2) +

            "\n\n🔴 Resistance RM" +
            formatPrice(
                coin,
                resistance
            ) +

            "\nVolume: " +
            resistanceVolume.toFixed(2) +

            "\n\n" +
            strength +

            "\n\n";

            LAST_SUPPORT[coin] =
            support;

            LAST_RESISTANCE[coin] =
            resistance;

        }

        // FORCE ALERT
        await sendTelegram(
            message
        );

    }catch(err){

        console.log(
            "Structure scanner failed"
        );

    }

}

// =====================================
// EVENT SCANNER
// ONLY ALERT IF EVENT HAPPEN
// =====================================

async function eventScanner(){

    try{

        for(const coin in EVENT_COINS){

            const pair =
            EVENT_COINS[coin];

            // PRICE
            const ticker =
            await axios.get(
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
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

            const {

                support,
                supportVolume,

                resistance,
                resistanceVolume

            } =
            getWalls(
                bids,
                asks,
                price
            );

            if(
                !LAST_PRICES[coin]
            ){

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

            // =====================================
            // BREAKOUT
            // =====================================

            if(

                price >
                resistance * 1.002 &&

                supportVolume >
                resistanceVolume * 2 &&

                change > 1

            ){

                await sendTelegram(

                    "🚀 " + coin +
                    " BREAKOUT\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        oldPrice
                    ) +

                    " → RM" +

                    formatPrice(
                        coin,
                        price
                    ) +

                    "\n\n✅ Resistance pecah" +

                    "\n✅ Buyer volume kuat" +

                    "\n🔥 Bullish momentum"

                );

            }

            // =====================================
            // REJECTION
            // =====================================

            else if(

                price < resistance &&

                resistanceVolume >
                supportVolume * 2 &&

                change < 0.3

            ){

                await sendTelegram(

                    "⚠️ " + coin +
                    " REJECTION\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        price
                    ) +

                    " gagal lepas RM" +

                    formatPrice(
                        coin,
                        resistance
                    ) +

                    "\n\n🔴 Resistance wall tebal" +

                    "\n🔴 Sell volume " +
                    resistanceVolume.toFixed(2)

                );

            }

            // =====================================
            // BUYER SPIKE
            // =====================================

            else if(

                supportVolume >
                resistanceVolume * 3 &&

                change > 1

            ){

                await sendTelegram(

                    "🟢 " + coin +
                    " BUYER SPIKE\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        oldPrice
                    ) +

                    " → RM" +

                    formatPrice(
                        coin,
                        price
                    ) +

                    "\n\n✅ Buyer dominate" +

                    "\n✅ Buy volume spike" +

                    "\n🔥 Bullish pressure"

                );

            }

            // =====================================
            // SELLER SPIKE
            // =====================================

            else if(

                resistanceVolume >
                supportVolume * 3 &&

                change < -1

            ){

                await sendTelegram(

                    "🔴 " + coin +
                    " SELLER SPIKE\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        oldPrice
                    ) +

                    " → RM" +

                    formatPrice(
                        coin,
                        price
                    ) +

                    "\n\n⚠️ Seller dominate" +

                    "\n⚠️ Volume spike besar" +

                    "\n📉 Bearish pressure"

                );

            }

            // =====================================
            // REVERSAL
            // =====================================

            else if(

                change > 1 &&

                supportVolume >
                resistanceVolume * 2

            ){

                await sendTelegram(

                    "🔄 " + coin +
                    " REVERSAL\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        oldPrice
                    ) +

                    " → RM" +

                    formatPrice(
                        coin,
                        price
                    ) +

                    "\n\n✅ Buyer mula ambil alih" +

                    "\n🔥 Possible bullish reversal"

                );

            }

            // =====================================
            // LIQUIDITY SWEEP
            // =====================================

            else if(

                price < support &&

                supportVolume >
                resistanceVolume * 2

            ){

                await sendTelegram(

                    "⚠️ " + coin +
                    " LIQUIDITY SWEEP\n\n" +

                    "Harga sweep support lalu reverse." +

                    "\n\n🔥 Buyer absorb seller" +

                    "\n🔥 Possible trap movement"

                );

            }

            // =====================================
            // VOLUME SURGE
            // =====================================

            else if(

                supportVolume >
                resistanceVolume * 4

            ){

                await sendTelegram(

                    "🚀 " + coin +
                    " VOLUME SURGE\n\n" +

                    "Volume buyer meningkat kuat." +

                    "\n\n🔥 Momentum sedang masuk"

                );

            }

            // =====================================
            // WHALE DETECTION
            // =====================================

            if(
                !WALL_MEMORY[coin]
            ){

                WALL_MEMORY[coin] = 0;

            }

            if(

                supportVolume >
                100000

            ){

                WALL_MEMORY[coin]++;

            }

            else{

                WALL_MEMORY[coin] = 0;

            }

            if(

                WALL_MEMORY[coin] >= 3

            ){

                await sendTelegram(

                    "🐋 " + coin +
                    " WHALE BUY WALL\n\n" +

                    "RM" +

                    formatPrice(
                        coin,
                        support
                    ) +

                    "\n\nVolume: " +
                    supportVolume.toFixed(2) +

                    "\n\n🔥 Wall sustain lama" +

                    "\n🔥 Buyer besar defend support"

                );

                WALL_MEMORY[coin] = 0;

            }

            LAST_PRICES[coin] =
            price;

        }

    }catch(err){

        console.log(
            "Event scanner failed"
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
// FIRST RUN
// =====================================

scanPrices();
marketStructure();
eventScanner();

// =====================================
// AUTO RUN
// =====================================

// EVERY 5 MINUTES
setInterval(
    scanPrices,
    300000
);

// EVERY 15 MINUTES
setInterval(
    marketStructure,
    900000
);

// EVENT SCANNER
setInterval(
    eventScanner,
    300000
);