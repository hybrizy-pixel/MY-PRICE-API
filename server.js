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

        await bot.sendMessage(
            CHAT_ID,
            `${SERVER_CODE} ${message}`,
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
        // DISPLAY PRICE
        // =====================================

        const displayPrice =
        parseFloat(
            ticker.last_trade
        );

        // =====================================
        // REAL ORDERBOOK PRICE
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
        // MARKET PRICE
        // =====================================

        const marketPrice =
        (
            bestBidPrice +
            bestAskPrice
        ) / 2;

        const currentPrice =
        displayPrice;

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
        // BUY VOLUME
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
        // SELL VOLUME
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
            pressure > 1.02
            &&
            spreadPercent < 0.0025
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

💵 Current Price
RM${formatPrice(
    coin,
    data.displayPrice
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
// SCALPING ENTRY
// =====================================

async function sendScalpEntry(
    coin,
    data
){

    const tp =
    coin === "BTC"
    ?
    data.currentPrice * 1.004
    :
    data.currentPrice * 1.006;

    const sl =
    coin === "BTC"
    ?
    data.supportPrice * 0.997
    :
    data.supportPrice * 0.995;

    await sendTelegram(
`
🔄 SCALPING ENTRY

🟢 ${coin}

📌 Entry Signal
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask
RM${formatPrice(
    coin,
    data.bestAskPrice
)}

📈 TP
RM${formatPrice(
    coin,
    tp
)}

🛑 SL
RM${formatPrice(
    coin,
    sl
)}

⚡ Fast bullish momentum detected.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ START ENTRY",
callback_data:
`start_scalp_${coin}_${data.currentPrice}_${data.bestAskPrice}_${tp}_${sl}`
}
]
]
}
}
    );

}

// =====================================
// NORMAL ENTRY
// =====================================

async function sendNormalEntry(
    coin,
    data
){

    const tp =

    coin === "BTC"

    ?

    data.currentPrice * 1.008

    :

    data.currentPrice * 1.01;

    const sl =

    coin === "BTC"

    ?

    data.supportPrice * 0.996

    :

    data.supportPrice * 0.995;

    await sendTelegram(
`
🚀 NORMAL ENTRY

🟢 ${coin}

📌 Entry Signal
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask
RM${formatPrice(
    coin,
    data.bestAskPrice
)}

📈 TP
RM${formatPrice(
    coin,
    tp
)}

🛑 SL
RM${formatPrice(
    coin,
    sl
)}

🔥 Strong bullish continuation.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ START ENTRY",
callback_data:
`start_normal_${coin}_${data.currentPrice}_${data.bestAskPrice}_${tp}_${sl}`
}
]
]
}
}
    );

}

// =====================================
// SMART SIGNAL ENGINE
// =====================================

async function smartSignalEngine(){

    for(
        const coin of
        Object.keys(COINS)
    ){

        const data =
        await getMarketStructure(
            coin
        );

        if(!data){
            continue;
        }

        // =====================================
        // ENTRY ANTI SPAM
        // =====================================

        if(

            ALERTS.lastEntryPrice[coin]

            &&

            Math.abs(

                (
                    data.currentPrice -
                    ALERTS.lastEntryPrice[coin]
                )

                /

                data.currentPrice

            ) < 0.003

        ){

            continue;

        }

        // =====================================
        // BREAKOUT
        // =====================================

        if(
            data.trend === "BULLISH"
            &&
            data.pressure > 1.15
            &&
            cooldownPassed(
                ALERTS.breakout,
                coin,
                ALERT_COOLDOWN.breakout
            )
        ){

            setCooldown(
                ALERTS.breakout,
                coin
            );

            await sendTelegram(
`
🚀 BREAKOUT DETECTED

🟢 ${coin}

📈 Breakout
RM${formatPrice(
    coin,
    data.currentPrice * 0.998
)}
→
RM${formatPrice(
    coin,
    data.resistancePrice
)}

🔥 Buyer momentum semakin kuat.
`
            );

        }

        // =====================================
        // NORMAL ENTRY
        // =====================================

        if(
            data.trend === "BULLISH"
            &&
            data.pressure > 1.12
            &&
            cooldownPassed(
                ALERTS.normal,
                coin,
                ALERT_COOLDOWN.normal
            )
        ){

            setCooldown(
                ALERTS.normal,
                coin
            );

            ALERTS.lastEntryPrice[coin] =
            data.currentPrice;

            await sendNormalEntry(
                coin,
                data
            );

        }

        // =====================================
        // SCALPING ENTRY
        // =====================================

        if(
            data.trend === "BULLISH"
            &&
            data.pressure > 1.02
            &&
            data.pressure < 1.30
            &&
            data.spreadPercent < 0.0025
            &&
            cooldownPassed(
                ALERTS.scalp,
                coin,
                ALERT_COOLDOWN.scalp
            )
        ){

            setCooldown(
                ALERTS.scalp,
                coin
            );

            ALERTS.lastEntryPrice[coin] =
            data.currentPrice;

            await sendScalpEntry(
                coin,
                data
            );

        }

        // =====================================
        // BREAKDOWN
        // =====================================

        if(
            data.trend === "BEARISH"
            &&
            data.pressure < 0.75
            &&
            cooldownPassed(
                ALERTS.breakdown,
                coin,
                ALERT_COOLDOWN.breakdown
            )
        ){

            setCooldown(
                ALERTS.breakdown,
                coin
            );

            await sendTelegram(
`
🛑 BREAKDOWN ALERT

🔴 ${coin}

📉 Breakdown
RM${formatPrice(
    coin,
    data.supportPrice * 1.002
)}
→
RM${formatPrice(
    coin,
    data.supportPrice
)}

⚠️ Seller pressure semakin kuat.
`
            );

        }

        // =====================================
        // WHALE
        // =====================================

        if(
            data.supportVolume > 100000
            &&
            cooldownPassed(
                ALERTS.whale,
                coin,
                ALERT_COOLDOWN.whale
            )
        ){

            setCooldown(
                ALERTS.whale,
                coin
            );

            await sendTelegram(
`
🐋 WHALE INFLOW

🟢 ${coin}

🪙 Buy Wall
${formatUnit(
    coin,
    data.supportVolume
)} ${coin}

📌 Support Area
RM${formatPrice(
    coin,
    data.supportPrice
)}

⚠️ Whale nampak tengah collect.
`
            );

        }

        // =====================================
        // REJECTION
        // =====================================

        if(
            data.pressure > 0.9
            &&
            data.pressure < 1
            &&
            data.spreadPercent > 0.0008
            &&
            cooldownPassed(
                ALERTS.rejection,
                coin,
                ALERT_COOLDOWN.rejection
            )
        ){

            setCooldown(
                ALERTS.rejection,
                coin
            );

            await sendTelegram(
`
❌ REJECTION ALERT

🔴 ${coin}

📉 Reject
RM${formatPrice(
    coin,
    data.currentPrice
)}
→
RM${formatPrice(
    coin,
    data.resistancePrice
)}

⚠️ Seller masih kuat defend atas.
`
            );

        }

    }

}

// =====================================
// CALLBACK QUERY
// =====================================

bot.on(
    "callback_query",
    async query=>{

    const data =
    query.data;

    const userId =
    query.from.id;

    // =====================================
    // START ENTRY
    // =====================================

    if(
        data.startsWith(
            "start_"
        )
    ){

        const split =
        data.split("_");

        USER_FLOW[userId] = {

            step:"WAIT_PROFIT",

            entryType:
            split[1],

            coin:
            split[2],

            entryPrice:
            Number(split[3]),

            bestAsk:
            Number(split[4]),

            tp:
            Number(split[5]),

            sl:
            Number(split[6])

        };

        await sendTelegram(
            "💸 PROFIT TARGET RM?"
        );

    }

});

// =====================================
// EXPRESS
// =====================================

app.get("/",(req,res)=>{

    res.json({

        status:"BOT ACTIVE",
        server:SERVER_CODE

    });

});

// =====================================
// START SERVER
// =====================================

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

    await smartSignalEngine();

    setInterval(
        sendPriceAlert,
        300000
    );

    setInterval(
        sendMarketStructure,
        900000
    );

    setInterval(
        smartSignalEngine,
        120000
    );

},5000);
