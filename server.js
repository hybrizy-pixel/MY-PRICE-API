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
const WALL_MEMORY = {};
const LAST_ALERT_TIME = {};

// =====================================
// PRICE FORMAT
// =====================================

function formatPrice(coin, price){

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
// SEND TELEGRAM
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

        console.log("Telegram sent");

    }catch(err){

        console.log("Telegram failed");

    }

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
            "https://api.luno.com/api/1/ticker?pair=" + pair
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

            }

            else if(change < 0){

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
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

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
                "https://api.luno.com/api/1/ticker?pair=" + pair
            );

            const price =
            parseFloat(
                ticker.data.last_trade
            );

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

                LAST_PRICES[coin]
                = price;

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

            // =====================================
            // ALERT COOLDOWN
            // =====================================

            const now = Date.now();

            if(
                !LAST_ALERT_TIME[coin]
            ){

                LAST_ALERT_TIME[coin] = 0;

            }

            if(
                now -
                LAST_ALERT_TIME[coin]
                < 300000
            ){

                continue;

            }

            // =====================================
            // BTC SPECIAL LOGIC
            // =====================================

            if(coin === "BTC"){

                // VALID BUYER MOMENTUM

                if(

                    ratio > 3 &&

                    change > 1 &&

                    price >
                    oldPrice * 1.005 &&

                    support >
                    (LAST_SUPPORT[coin] || support)

                ){

                    await sendTelegram(

                        "🚀 BTC BUYER MOMENTUM\n\n" +

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

                        "\n\n✅ Orderbook ratio: " +
                        ratio.toFixed(2) + "x" +

                        "\n🔥 Real upward momentum"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                // VALID SELLER MOMENTUM

                else if(

                    resistanceVolume >
                    supportVolume * 3 &&

                    change < -1 &&

                    price <
                    oldPrice * 0.995

                ){

                    await sendTelegram(

                        "🔴 BTC SELLER MOMENTUM\n\n" +

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

                        "\n\n⚠️ Seller ratio dominate" +

                        "\n📉 Real downward momentum"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                // BREAKOUT

                else if(

                    price >
                    resistance * 1.002 &&

                    ratio > 2.5 &&

                    change > 1

                ){

                    await sendTelegram(

                        "🚀 BTC BREAKOUT\n\n" +

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

                        "\n🔥 Bullish continuation"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

            }

            // =====================================
            // ALTCOIN LOGIC
            // =====================================

            else{

                // BUYER MOMENTUM

                if(

                    change > 1 &&

                    price >
                    oldPrice * 1.005 &&

                    ratio > 2

                ){

                    await sendTelegram(

                        "🚀 " + coin +
                        " BUYER MOMENTUM\n\n" +

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

                        "\n\n✅ Buyer pressure kuat" +

                        "\n🔥 Momentum ke atas"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                // SELLER MOMENTUM

                else if(

                    resistanceVolume >
                    supportVolume * 2 &&

                    change < -1 &&

                    price <
                    oldPrice * 0.995

                ){

                    await sendTelegram(

                        "🔴 " + coin +
                        " SELLER MOMENTUM\n\n" +

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

                        "\n\n⚠️ Seller pressure tinggi" +

                        "\n📉 Momentum ke bawah"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                // BREAKOUT

                else if(

                    price >
                    resistance * 1.002 &&

                    ratio > 2 &&

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

                        "\n🔥 Bullish momentum"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

                // REJECTION

                else if(

                    price < resistance &&

                    resistanceVolume >
                    supportVolume * 2 &&

                    Math.abs(change) < 0.5

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

                        "\n\n🔴 Resistance wall tebal"

                    );

                    LAST_ALERT_TIME[coin] =
                    now;

                }

            }

            LAST_SUPPORT[coin]
            = support;

            LAST_RESISTANCE[coin]
            = resistance;

            LAST_PRICES[coin]
            = price;

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