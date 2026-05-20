// =====================================
// IMPORTS
// =====================================

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT =
process.env.PORT || 3000;

// =====================================
// ENV
// =====================================

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

const CRYPTOPANIC_API_KEY =
process.env.CRYPTOPANIC_API_KEY;

// =====================================
// RANDOM INSTANCE CODE
// =====================================

const INSTANCE =
Math.random()
.toString(36)
.substring(2,6)
.toUpperCase();

// =====================================
// TELEGRAM API
// =====================================

const TELEGRAM_API =
`https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// =====================================
// COINS
// =====================================

const COINS = {

    BTC: "XBTMYR",
    GRT: "GRTMYR",
    XRP: "XRPMYR",
    XLM: "XLMMYR",
    AAVE: "AAVEMYR",
    CRV: "CRVMYR"

};

// =====================================
// MEMORY
// =====================================

const LAST_PRICE_MEMORY = {

    BTC: null,
    GRT: null

};

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

    // 2 DECIMAL

    if(

        coin === "BTC" ||
        coin === "AAVE" ||
        coin === "XRP"

    ){

        return Number(price)
        .toFixed(2);

    }

    // 4 DECIMAL

    if(

        coin === "XLM" ||
        coin === "CRV" ||
        coin === "GRT"

    ){

        return Number(price)
        .toFixed(4);

    }

    return Number(price)
    .toFixed(2);

}

// =====================================
// FORMAT PERCENT
// =====================================

function formatPercent(percent){

    if(percent > 0){

        return `+${percent.toFixed(2)}%`;

    }

    return `${percent.toFixed(2)}%`;

}

// =====================================
// PRICE EMOJI
// =====================================

function getPriceEmoji(percent){

    if(percent > 0){

        return "🟢";

    }

    if(percent < 0){

        return "🔴";

    }

    return "➖";

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

                text:
`[${INSTANCE}]

${message}`

            }

        );

        console.log(
            "✅ TELEGRAM SENT"
        );

    }catch(err){

        console.log(
            "❌ TELEGRAM FAILED",
            err.message
        );

    }

}

// =====================================
// SET COMMANDS
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
                        "BTC & GRT price"
                    },

                    {
                        command: "market",
                        description:
                        "Market structure"
                    },

                    {
                        command: "entry",
                        description:
                        "High entry scanner"
                    },

                    {
                        command: "news",
                        description:
                        "Crypto news"
                    },

                    {
                        command: "status",
                        description:
                        "Bot status"
                    }

                ]

            }

        );

        console.log(
            "✅ COMMANDS UPDATED"
        );

    }catch(err){

        console.log(
            "COMMAND ERROR",
            err.message
        );

    }

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req,res)=>{

    res.json({

        status:
        "SMART SCANNER ACTIVE",

        instance:
        INSTANCE

    });

});

// =====================================
// GET LIVE PRICE
// =====================================

async function getLivePrice(coin){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${pair}`

        );

        return parseFloat(
            response.data.last_trade
        );

    }catch(err){

        console.log(
            "PRICE ERROR",
            err.message
        );

        return null;

    }

}

// =====================================
// GET ORDERBOOK
// =====================================

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

        console.log(
            "ORDERBOOK ERROR",
            err.message
        );

        return null;

    }

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(coin){

    try{

        const orderbook =
        await getOrderbook(
            coin
        );

        const currentPrice =
        await getLivePrice(
            coin
        );

        if(
            !orderbook ||
            !currentPrice
        ){

            return null;

        }

        // =====================================
        // VALID SUPPORT
        // =====================================

        const validBids =
        orderbook.bids.filter(b=>{

            const price =
            parseFloat(
                b.price
            );

            return (

                price <
                currentPrice

                &&

                price >
                currentPrice * 0.995

            );

        });

        // =====================================
        // VALID RESISTANCE
        // =====================================

        const validAsks =
        orderbook.asks.filter(a=>{

            const price =
            parseFloat(
                a.price
            );

            return (

                price >
                currentPrice

                &&

                price <
                currentPrice * 1.005

            );

        });

        if(
            validBids.length === 0 ||
            validAsks.length === 0
        ){

            return null;

        }

        // =====================================
        // BIGGEST SUPPORT WALL
        // =====================================

        let support =
        validBids[0];

        for(const bid of validBids){

            if(

                parseFloat(
                    bid.volume
                ) >

                parseFloat(
                    support.volume
                )

            ){

                support = bid;

            }

        }

        // =====================================
        // BIGGEST RESISTANCE WALL
        // =====================================

        let resistance =
        validAsks[0];

        for(const ask of validAsks){

            if(

                parseFloat(
                    ask.volume
                ) >

                parseFloat(
                    resistance.volume
                )

            ){

                resistance = ask;

            }

        }

        // =====================================
        // TOTAL VOLUME
        // =====================================

        const buyVolume =
        orderbook.bids.reduce(

            (sum,b)=>

            sum +
            parseFloat(
                b.volume
            )

        ,0);

        const sellVolume =
        orderbook.asks.reduce(

            (sum,a)=>

            sum +
            parseFloat(
                a.volume
            )

        ,0);

        return {

            support:
            parseFloat(
                support.price
            ),

            supportVolume:
            parseFloat(
                support.volume
            ),

            resistance:
            parseFloat(
                resistance.price
            ),

            resistanceVolume:
            parseFloat(
                resistance.volume
            ),

            buyVolume,
            sellVolume

        };

    }catch(err){

        console.log(
            "MARKET STRUCTURE ERROR",
            err.message
        );

        return null;

    }

}

// =====================================
// MARKET COMMENT
// =====================================

function getMarketComment(
    buyVolume,
    sellVolume
){

    if(
        buyVolume >
        sellVolume * 2
    ){

        return "🔥 Buyer kuat";

    }

    if(
        sellVolume >
        buyVolume * 1.5
    ){

        return "⚠️ Seller kuat";

    }

    return "⚖️ Market neutral";

}

// =====================================
// MINIMUM ENTRY
// =====================================

function calculateMinimumBuy(price){

    const minimum =
    65;

    const coin =
    minimum / price;

    return {

        minimum,
        coin

    };

}

// =====================================
// PRICE ALERT
// =====================================

async function autoPriceUpdate(){

    try{

        const btc =
        await getLivePrice(
            "BTC"
        );

        const grt =
        await getLivePrice(
            "GRT"
        );

        if(
            !btc ||
            !grt
        ){

            return;

        }

        let btcMessage = "";
        let grtMessage = "";

        // =====================================
        // BTC
        // =====================================

        if(
            LAST_PRICE_MEMORY.BTC
        ){

            const old =
            LAST_PRICE_MEMORY.BTC;

            const percent =
            (
                (
                    btc - old
                ) / old
            ) * 100;

            const emoji =
            getPriceEmoji(
                percent
            );

            if(
                old.toFixed(2) ===
                btc.toFixed(2)
            ){

                btcMessage =

`${emoji} BTC
RM${formatPrice(
"BTC",
btc
)} (0.00%)`;

            }else{

                btcMessage =

`${emoji} BTC
RM${formatPrice(
"BTC",
old
)} → RM${formatPrice(
"BTC",
btc
)} (${formatPercent(
percent
)})`;

            }

        }else{

            btcMessage =

`➖ BTC
RM${formatPrice(
"BTC",
btc
)}`;

        }

        // =====================================
        // GRT
        // =====================================

        if(
            LAST_PRICE_MEMORY.GRT
        ){

            const old =
            LAST_PRICE_MEMORY.GRT;

            const percent =
            (
                (
                    grt - old
                ) / old
            ) * 100;

            const emoji =
            getPriceEmoji(
                percent
            );

            if(
                old.toFixed(4) ===
                grt.toFixed(4)
            ){

                grtMessage =

`${emoji} GRT
RM${formatPrice(
"GRT",
grt
)} (0.00%)`;

            }else{

                grtMessage =

`${emoji} GRT
RM${formatPrice(
"GRT",
old
)} → RM${formatPrice(
"GRT",
grt
)} (${formatPercent(
percent
)})`;

            }

        }else{

            grtMessage =

`➖ GRT
RM${formatPrice(
"GRT",
grt
)}`;

        }

        LAST_PRICE_MEMORY.BTC =
        btc;

        LAST_PRICE_MEMORY.GRT =
        grt;

        await sendTelegram(

`${btcMessage}

──────────────

${grtMessage}`

        );

    }catch(err){

        console.log(
            "AUTO PRICE ERROR",
            err.message
        );

    }

}

// =====================================
// MARKET STRUCTURE ALERT
// =====================================

async function sendMarketCommand(){

    try{

        const btc =
        await getMarketStructure(
            "BTC"
        );

        const btcPrice =
        await getLivePrice(
            "BTC"
        );

        const grt =
        await getMarketStructure(
            "GRT"
        );

        const grtPrice =
        await getLivePrice(
            "GRT"
        );

        if(

            !btc ||
            !grt ||
            !btcPrice ||
            !grtPrice

        ){

            return;

        }

        await sendTelegram(

`📊 MARKET STRUCTURE

₿ BTC

RM${formatPrice(
"BTC",
btcPrice
)}

${getMarketComment(
btc.buyVolume,
btc.sellVolume
)}

🟢 Support
RM${formatPrice(
"BTC",
btc.support
)} (${btc.supportVolume.toFixed(2)} BTC)

🔴 Resistance
RM${formatPrice(
"BTC",
btc.resistance
)} (${btc.resistanceVolume.toFixed(2)} BTC)

──────────────

🟢 GRT

RM${formatPrice(
"GRT",
grtPrice
)}

${getMarketComment(
grt.buyVolume,
grt.sellVolume
)}

🟢 Support
RM${formatPrice(
"GRT",
grt.support
)} (${grt.supportVolume.toFixed(0)} GRT)

🔴 Resistance
RM${formatPrice(
"GRT",
grt.resistance
)} (${grt.resistanceVolume.toFixed(0)} GRT)`

        );

    }catch(err){

        console.log(
            "MARKET ALERT ERROR",
            err.message
        );

    }

}

// =====================================
// ENTRY ALERT
// =====================================

async function sendEntryCommand(){

    try{

        let found =
        false;

        let message = "";

        for(const coin in COINS){

            const structure =
            await getMarketStructure(
                coin
            );

            const price =
            await getLivePrice(
                coin
            );

            if(
                !structure ||
                !price
            ){

                continue;

            }

            const pressure =
            structure.buyVolume /
            structure.sellVolume;

            const nearBreakout =
            price >=
            structure.resistance * 0.995;

            if(

                pressure > 2

                &&

                nearBreakout

            ){

                found = true;

                const tp =
                price * 1.10;

                const sl =
                structure.support * 0.995;

                const minimum =
                calculateMinimumBuy(
                    price
                );

                const confidence =
                Math.min(

                    95,

                    Math.floor(
                        pressure * 35
                    )

                );

                message +=

`

🎯 HIGH ENTRY

🪙 ${coin}

RM${formatPrice(
coin,
price
)}

🟢 Support
RM${formatPrice(
coin,
structure.support
)} (${structure.supportVolume.toFixed(2)})

🔴 Resistance
RM${formatPrice(
coin,
structure.resistance
)} (${structure.resistanceVolume.toFixed(2)})

💵 Minimum Entry
RM${minimum.minimum}

🪙 Minimum Coin
${minimum.coin.toFixed(2)}

🎯 Target 10%
RM${formatPrice(
coin,
tp
)}

🛑 SL
RM${formatPrice(
coin,
sl
)}

⚡ ${confidence}% Setup`;

            }

        }

        if(!found){

            await sendTelegram(

`⏳ ENTRY UPDATE

No Best Entry Now`

            );

            return;

        }

        await sendTelegram(
            message
        );

    }catch(err){

        console.log(
            "ENTRY ERROR",
            err.message
        );

    }

}

// =====================================
// NEWS
// =====================================

async function sendNews(){

    try{

        const response =
        await axios.get(

`https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY}&currencies=BTC&kind=news`

        );

        const news =
        response.data.results[0];

        if(!news){

            return;

        }

        await sendTelegram(

`📰 NEWS

${news.title}`

        );

    }catch(err){

        console.log(
            "NEWS ERROR",
            err.message
        );

    }

}

// =====================================
// TELEGRAM COMMANDS
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
            update.message.text
            .toLowerCase();

            if(text === "/price"){

                await autoPriceUpdate();

            }

            else if(text === "/market"){

                await sendMarketCommand();

            }

            else if(text === "/entry"){

                await sendEntryCommand();

            }

            else if(text === "/news"){

                await sendNews();

            }

            else if(text === "/status"){

                await sendTelegram(
                    "🤖 BOT ONLINE"
                );

            }

        }

    }catch(err){

        console.log(
            "COMMAND ERROR",
            err.message
        );

    }

}

// =====================================
// SERVER
// =====================================

app.listen(PORT, ()=>{

    console.log(
        `SERVER RUNNING ${PORT}`
    );

});

// =====================================
// START SYSTEM
// =====================================

setTimeout(async ()=>{

    console.log(
        "🚀 SYSTEM STARTED"
    );

    await setTelegramCommands();

    // =====================================
    // FIRST RUN
    // =====================================

    await autoPriceUpdate();

    await sendMarketCommand();

    await sendEntryCommand();

    // =====================================
    // COMMAND LOOP
    // =====================================

    setInterval(

        checkTelegramCommands,

        5000

    );

    // =====================================
    // PRICE ALERT
    // =====================================

    setInterval(

        autoPriceUpdate,

        300000

    );

    // =====================================
    // MARKET STRUCTURE
    // =====================================

    setInterval(

        sendMarketCommand,

        900000

    );

    // =====================================
    // ENTRY UPDATE
    // =====================================

    setInterval(

        sendEntryCommand,

        1200000

    );

}, 5000);