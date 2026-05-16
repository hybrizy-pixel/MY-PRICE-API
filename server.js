const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");

const app = express();

const cache = new NodeCache({
    stdTTL: 5
});

const PORT = 3000;

const PAIRS = {
    BTC: "XBTMYR",
    XRP: "XRPMYR",
    XLM: "XLMMYR",
    CRV: "CRVMYR",
    GRT: "GRTMYR",
    AAVE: "AAVEMYR"
};

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

        // CHECK CACHE
        const cachedData = cache.get(pair);

        if (cachedData) {

            return res.json({
                source: "cache",
                ...cachedData
            });

        }

        // FETCH LUNO
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

        // SAVE CACHE
        cache.set(pair, result);

        res.json(result);

    } catch (error) {

        res.json({
            error: "Failed to fetch price"
        });

    }

});

// ALL MARKET
app.get("/market", async (req, res) => {

    try {

        const marketData = [];

        for (const coin in PAIRS) {

            const pair = PAIRS[coin];

            let data;

            // CHECK CACHE
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
