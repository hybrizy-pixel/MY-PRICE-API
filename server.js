const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const cors = require("cors");

const app = express();

app.use(cors());

const cache = new NodeCache({
    stdTTL: 5
});

const PORT = process.env.PORT || 3000;

const PAIRS = {
    BTC: "XBTMYR",
    XRP: "XRPMYR",
    XLM: "XLMMYR",
    CRV: "CRVMYR",
    GRT: "GRTMYR",
    AAVE: "AAVEMYR"
};

// HOMEPAGE
app.get("/", (req, res) => {

    res.json({
        message: "Safwan Luno API Running"
    });

});

// SINGLE COIN
app.get("/price/:coin", async (req, res) => {

    try {

        const coin = req.params.coin.toUpperCase();

        if (!PAIRS[coin]) {

            return res.json({
                error: "Coin not supported"
            });

        }

        const pair = PAIRS[coin];

        const cachedData = cache.get(pair);

        if (cachedData) {

            return res.json({
                source: "cache",
                ...cachedData
            });

        }

        const response = await axios.get(
            `https://api.luno.com/api/1/ticker?pair=${pair}`
        );

        const data = response.data;

        const result = {
            source: "luno",
            coin,
            pair: data.pair,
            price: data.last_trade,
            bid: data.bid,
            ask: data.ask,
            timestamp: data.timestamp
        };

        cache.set(pair, result);

        res.json(result);

    } catch (error) {

        res.json({
            error: "Failed to fetch price"
        });

    }

});

// MARKET
app.get("/market", async (req, res) => {

    try {

        const marketData = [];

        for (const coin in PAIRS) {

            const pair = PAIRS[coin];

            let data;

            const cachedData = cache.get(pair);

            if (cachedData) {

                data = cachedData;

            } else {

                const response = await axios.get(
                    `https://api.luno.com/api/1/ticker?pair=${pair}`
                );

                const ticker = response.data;

                data = {
                    source: "luno",
                    coin,
                    pair: ticker.pair,
                    price: ticker.last_trade,
                    bid: ticker.bid,
                    ask: ticker.ask,
                    timestamp: ticker.timestamp
                };

                cache.set(pair, data);

            }

            marketData.push(data);

        }

        res.json({
            total: marketData.length,
            data: marketData
        });

    } catch (error) {

        res.json({
            error: "Failed to fetch market data"
        });

    }

});

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});
// TELEGRAM BOT
const TELEGRAM_TOKEN = "8979342744:AAFbamnzNXbeJCAIxuUf78NAxKspoWvymGs";

const CHAT_ID = "7161546";

// AUTO GRT ALERT
async function sendGRTUpdate(){

    try{

        // GET LIVE PRICE
        const response = await axios.get(
            "https://api.luno.com/api/1/ticker?pair=GRTMYR"
        );

        const price = parseFloat(
            response.data.last_trade
        );

        // CREATE ALERT MESSAGE
        const message =
`🚨 GRT RM ${price.toFixed(4)}

LIVE PRICE UPDATE 🔥

Powered by SAFWAN LUNO PRICE API`;

        // SEND TELEGRAM
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message
            }
        );

        console.log("Telegram alert sent");

    }catch(err){

        console.log("Telegram failed");

    }

}

// SEND EVERY 5 MINUTES
setInterval(sendGRTUpdate, 300000);
