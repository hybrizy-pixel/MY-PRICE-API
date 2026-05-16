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

