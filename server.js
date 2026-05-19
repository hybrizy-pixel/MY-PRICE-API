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

const LAST_ALERT_TIME = {};

const LAST_BREAKOUT_STATE = {};
const LAST_BREAKDOWN_STATE = {};
const LAST_BUILDUP_STATE = {};
const LAST_ACCUMULATION_STATE = {};

const LAST_PRICE_MEMORY = {

    BTC: null,
    GRT: null

};

// =====================================
// SETTINGS
// =====================================

const ALERT_COOLDOWN =
1800000;

const BREAKOUT_CONFIRMATIONS =
3;

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

        return price.toFixed(2);

    }

    // 4 DECIMAL

    if(

        coin === "XLM" ||
        coin === "CRV" ||
        coin === "GRT"

    ){

        return price.toFixed(4);

    }

    return price.toFixed(2);

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
            "❌ TELEGRAM FAILED"
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
                        command: "scanner",
                        description:
                        "Scanner status"
                    },

                    {
                        command: "status",
                        description:
                        "Bot status"
                    },

                    {
                        command: "help",
                        description:
                        "Help menu"
                    }

                ]

            }

        );

        console.log(
            "✅ COMMANDS UPDATED"
        );

    }catch(err){

        console.log(
            "❌ COMMAND UPDATE FAILED"
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
// LIVE PRICE API
// =====================================

app.get('/price/:pair', async (req,res)=>{

    try{

        const pair =
        req.params.pair.toUpperCase();

        const lunoPair =
        COINS[pair];

        if(!lunoPair){

            return res.status(404).json({

                error:
                "PAIR NOT FOUND"

            });

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

            pair,
            price

        });

    }catch(err){

        console.log(err);

        res.status(500).json({

            error:
            "FAILED"

        });

    }

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

    }catch{

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

    }catch{

        return null;

    }

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(coin){

    try{

        const orderbook =
        await getOrderbook(coin);

        if(!orderbook){

            return null;

        }

        const buyVolume =
        orderbook.bids.reduce(

            (sum,b)=>

            sum +
            parseFloat(b.volume)

        ,0);

        const sellVolume =
        orderbook.asks.reduce(

            (sum,a)=>

            sum +
            parseFloat(a.volume)

        ,0);

        return {

            support:
            parseFloat(
                orderbook.bids[0].price
            ),

            supportVolume:
            parseFloat(
                orderbook.bids[0].volume
            ),

            resistance:
            parseFloat(
                orderbook.asks[0].price
            ),

            resistanceVolume:
            parseFloat(
                orderbook.asks[0].volume
            ),

            buyVolume,
            sellVolume

        };

    }catch{

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
// MINIMUM BUY
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
// PRICE COMMAND
// =====================================

async function sendPriceCommand(){

    try{

        const btc =
        await getLivePrice(
            "BTC"
        );

        const grt =
        await getLivePrice(
            "GRT"
        );

        await sendTelegram(

`₿ BTC

RM${formatPrice(
"BTC",
btc
)}

──────────────

🟢 GRT

RM${formatPrice(
"GRT",
grt
)}`

        );

    }catch(err){

        console.log(
            "PRICE COMMAND FAILED"
        );

    }

}

// =====================================
// MARKET COMMAND
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
            "MARKET COMMAND FAILED"
        );

    }

}

// =====================================
// HIGH ENTRY
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

                const tp1 =
                price * 1.02;

                const tp2 =
                price * 1.04;

                const sl =
                structure.support * 0.995;

                const confidence =
                Math.min(

                    95,

                    Math.floor(
                        pressure * 35
                    )

                );

                const minimum =
                calculateMinimumBuy(
                    price
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

💵 Minimum Buy
RM${minimum.minimum}

🪙 Minimum Coin
${minimum.coin.toFixed(2)}

🎯 TP1: RM${formatPrice(
coin,
tp1
)}

🎯 TP2: RM${formatPrice(
coin,
tp2
)}

🛑 SL: RM${formatPrice(
coin,
sl
)}

⚡ ${confidence}% Setup

──────────────`;

            }

        }

        if(!found){

            return;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "ENTRY COMMAND FAILED"
        );

    }

}

// =====================================
// AUTO PRICE UPDATE
// =====================================

async function autoPriceUpdate(){

    try{

        const btc =
        await getLivePrice("BTC");

        const grt =
        await getLivePrice("GRT");

        let btcMessage = "";
        let grtMessage = "";

        // BTC

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

            if(
                old.toFixed(2) ===
                btc.toFixed(2)
            ){

                btcMessage =

`₿ BTC

RM${formatPrice(
"BTC",
btc
)} (0.00%)`;

            }else{

                btcMessage =

`₿ BTC

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

`₿ BTC

RM${formatPrice(
"BTC",
btc
)}`;

        }

        // GRT

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

            if(
                old.toFixed(4) ===
                grt.toFixed(4)
            ){

                grtMessage =

`🟢 GRT

RM${formatPrice(
"GRT",
grt
)} (0.00%)`;

            }else{

                grtMessage =

`🟢 GRT

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

`🟢 GRT

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
            "AUTO PRICE FAILED"
        );

    }

}

// =====================================
// GET NEWS
// =====================================

async function getCryptoNews(){

    try{

        const response =
        await axios.get(

`https://cryptopanic.com/api/v1/posts/?auth_token=${CRYPTOPANIC_API_KEY}&currencies=BTC&kind=news`

        );

        const news =
        response.data.results[0];

        if(!news){

            return null;

        }

        return {

            title:
            news.title

        };

    }catch{

        return null;

    }

}

// =====================================
// NEWS COMMAND
// =====================================

async function sendNews(){

    try{

        const news =
        await getCryptoNews();

        if(!news){

            return;
        }

        await sendTelegram(

`📰 NEWS

${news.title}`

        );

    }catch(err){

        console.log(
            "NEWS FAILED"
        );

    }

}

// =====================================
// AUTO SCANNER
// =====================================

async function runAutoScanner(){

    try{

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

            const now =
            Date.now();

            if(
                !LAST_ALERT_TIME[coin]
            ){

                LAST_ALERT_TIME[coin] =
                0;

            }

            const pressure =
            structure.buyVolume /
            structure.sellVolume;

            const nearBreakout =
            price >=
            structure.resistance * 0.995;

            const nearBreakdown =
            price <=
            structure.support * 1.005;

            // =====================================
            // BUILDUP
            // =====================================

            if(

                pressure > 1.5

                &&

                !nearBreakout

            ){

                if(
                    !LAST_BUILDUP_STATE[coin]
                ){

                    LAST_BUILDUP_STATE[
                        coin
                    ] = 1;

                }else{

                    LAST_BUILDUP_STATE[
                        coin
                    ]++;

                }

                if(

                    LAST_BUILDUP_STATE[
                        coin
                    ] === 2

                ){

                    await sendTelegram(

`👀 MOMENTUM BUILDUP

🪙 ${coin}

RM${formatPrice(
coin,
price
)}`

                    );

                }

            }else{

                LAST_BUILDUP_STATE[
                    coin
                ] = 0;

            }

            // =====================================
            // BREAKOUT
            // =====================================

            if(

                pressure > 2

                &&

                nearBreakout

            ){

                if(
                    !LAST_BREAKOUT_STATE[
                        coin
                    ]
                ){

                    LAST_BREAKOUT_STATE[
                        coin
                    ] = 1;

                }else{

                    LAST_BREAKOUT_STATE[
                        coin
                    ]++;

                }

                if(

                    LAST_BREAKOUT_STATE[
                        coin
                    ] >=
                    BREAKOUT_CONFIRMATIONS

                    &&

                    now -
                    LAST_ALERT_TIME[
                        coin
                    ] >
                    ALERT_COOLDOWN

                ){

                    LAST_ALERT_TIME[
                        coin
                    ] = now;

                    LAST_BREAKOUT_STATE[
                        coin
                    ] = 0;

                    await sendTelegram(

`🚀 BREAKOUT CONFIRMED

🪙 ${coin}

RM${formatPrice(
coin,
price
)}

🟢 Support
RM${formatPrice(
coin,
structure.support
)}

🔴 Resistance
RM${formatPrice(
coin,
structure.resistance
)}

📈 Resistance naik ke:
RM${formatPrice(
coin,
price * 1.03
)}`

                    );

                }

            }else{

                LAST_BREAKOUT_STATE[
                    coin
                ] = 0;

            }

            // =====================================
            // BREAKDOWN
            // =====================================

            if(

                pressure < 0.6

                &&

                nearBreakdown

            ){

                if(
                    !LAST_BREAKDOWN_STATE[
                        coin
                    ]
                ){

                    LAST_BREAKDOWN_STATE[
                        coin
                    ] = 1;

                }else{

                    LAST_BREAKDOWN_STATE[
                        coin
                    ]++;

                }

                if(

                    LAST_BREAKDOWN_STATE[
                        coin
                    ] >= 2

                    &&

                    now -
                    LAST_ALERT_TIME[
                        coin
                    ] >
                    ALERT_COOLDOWN

                ){

                    LAST_ALERT_TIME[
                        coin
                    ] = now;

                    LAST_BREAKDOWN_STATE[
                        coin
                    ] = 0;

                    await sendTelegram(

`🔴 BREAKDOWN

🪙 ${coin}

RM${formatPrice(
coin,
price
)}

⚠️ Support pecah

🟢 Support
RM${formatPrice(
coin,
structure.support
)}

🔴 Resistance
RM${formatPrice(
coin,
structure.resistance
)}

📉 Seller kuat

📉 Support turun ke:
RM${formatPrice(
coin,
structure.support * 0.98
)}`

                    );

                }

            }else{

                LAST_BREAKDOWN_STATE[
                    coin
                ] = 0;

            }

            // =====================================
            // ACCUMULATION
            // =====================================

            if(

                pressure > 1.5

                &&

                !nearBreakout

                &&

                !nearBreakdown

            ){

                if(
                    !LAST_ACCUMULATION_STATE[
                        coin
                    ]
                ){

                    LAST_ACCUMULATION_STATE[
                        coin
                    ] = 1;

                }else{

                    LAST_ACCUMULATION_STATE[
                        coin
                    ]++;

                }

                if(

                    LAST_ACCUMULATION_STATE[
                        coin
                    ] >= 4

                    &&

                    now -
                    LAST_ALERT_TIME[
                        coin
                    ] >
                    ALERT_COOLDOWN

                ){

                    LAST_ALERT_TIME[
                        coin
                    ] = now;

                    LAST_ACCUMULATION_STATE[
                        coin
                    ] = 0;

                    await sendTelegram(

`🟢 ACCUMULATION

🪙 ${coin}

RM${formatPrice(
coin,
price
)}`

                    );

                }

            }else{

                LAST_ACCUMULATION_STATE[
                    coin
                ] = 0;

            }

        }

    }catch(err){

        console.log(
            "AUTO SCANNER FAILED"
        );

    }

}

// =====================================
// COMMAND LIST
// =====================================

async function sendCommandList(){

    await sendTelegram(

`📋 COMMAND LIST

/price
/market
/entry
/news
/scanner
/status
/help`

    );

}

// =====================================
// TELEGRAM COMMAND HANDLER
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

            console.log(
                "COMMAND:",
                text
            );

            if(text === "/price"){

                await sendPriceCommand();

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

            else if(text === "/scanner"){

                await sendTelegram(
                    "🔍 SCANNER ACTIVE"
                );

            }

            else if(text === "/status"){

                await sendTelegram(
                    "🤖 BOT ONLINE"
                );

            }

            else if(text === "/help"){

                await sendCommandList();

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
// START SERVER
// =====================================

app.listen(PORT, ()=>{

    console.log(
        "SERVER RUNNING ON PORT",
        PORT
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
    // COMMAND LOOP
    // =====================================

    setInterval(

        checkTelegramCommands,

        5000

    );

    // =====================================
    // AUTO SCANNER
    // =====================================

    setInterval(

        runAutoScanner,

        30000

    );

    // =====================================
    // PRICE UPDATE
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

}, 5000);