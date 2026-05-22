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
            `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`
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
            `https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`
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

        const orderbook =
        await getOrderbook(
            coin
        );

        const ticker =
        await getTicker(
            coin
        );

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

        // =====================================
        // LIVE MARKET PRICE
        // =====================================

        const currentPrice =
        parseFloat(
            ticker.last_trade
        );

        // =====================================
        // REAL EXECUTION PRICE
        // =====================================

        const bestBidPrice =
        parseFloat(
            bids[0].price
        );

        const bestAskPrice =
        parseFloat(
            asks[0].price
        );

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

        const pressure =
        buyVolume /
        sellVolume;

        let trend =
        "SIDEWAYS";

        if(
            pressure > 1.2
            &&
            spreadPercent < 0.0012
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

            currentPrice,

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
            spreadPercent

        };

    }catch(err){

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

RM${formatPrice(
    coin,
    data.currentPrice
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

📌 Entry Signal:
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask:
RM${formatPrice(
    coin,
    data.bestAskPrice
)}

📈 TP:
RM${formatPrice(
    coin,
    tp
)}

🛑 SL:
RM${formatPrice(
    coin,
    sl
)}

⚡ Fast momentum detected.
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

📌 Entry Signal:
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask:
RM${formatPrice(
    coin,
    data.bestAskPrice
)}

📈 TP:
RM${formatPrice(
    coin,
    tp
)}

🛑 SL:
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
            data.pressure > 1.35
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

📈 Breakout:
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
            data.pressure > 1.35
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
            data.pressure > 1.1
            &&
            data.pressure < 1.35
            &&
            data.spreadPercent < 0.0012
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

📉 Breakdown:
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

🪙 Buy wall:
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

📉 Reject:
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

    // =====================================
    // CONFIRM ENTRY
    // =====================================

    if(
        data ===
        "confirm_entry"
    ){

        USER_FLOW[userId].step =
        "WAIT_MATCHED_PRICE";

        await sendTelegram(
            "📌 Matched Buy Price?"
        );

    }

    // =====================================
    // CONFIRM SELL
    // =====================================

    if(
        data.startsWith(
            "confirm_sell_"
        )
    ){

        const tradeId =
        data.replace(
            "confirm_sell_",
            ""
        );

        USER_FLOW[userId] = {

            step:"WAIT_MATCHED_SELL",

            tradeId

        };

        await sendTelegram(
            "💵 Matched Sell Price?"
        );

    }

});

// =====================================
// MESSAGE FLOW
// =====================================

bot.on(
    "message",
    async msg=>{

    const userId =
    msg.from.id;

    const text =
    msg.text;

    if(
        !USER_FLOW[userId]
    ){
        return;
    }

    const flow =
    USER_FLOW[userId];

    // =====================================
    // WAIT PROFIT
    // =====================================

    if(
        flow.step ===
        "WAIT_PROFIT"
    ){

        flow.targetProfit =
        Number(text);

        const adjustedDiff =

        (
            flow.tp *
            (1 - SELL_FEE)
        )

        -

        (
            flow.bestAsk *
            (1 + BUY_FEE)
        );

        const quantity =
        flow.targetProfit /
        adjustedDiff;

        flow.quantity =
        quantity;

        flow.step =
        "WAIT_CONFIRM";

        const estimatedBuyValue =
        quantity *
        flow.bestAsk;

        await sendTelegram(
`
🪙 Suggested Quantity

${formatUnit(
    flow.coin,
    quantity
)} ${flow.coin}

💰 Estimated Buy Value
RM${estimatedBuyValue.toFixed(2)}

📌 Entry Signal
RM${formatPrice(
    flow.coin,
    flow.entryPrice
)}

⚠️ Best Ask
RM${formatPrice(
    flow.coin,
    flow.bestAsk
)}

📈 TP
RM${formatPrice(
    flow.coin,
    flow.tp
)}

🛑 SL
RM${formatPrice(
    flow.coin,
    flow.sl
)}

❓ Confirm Entry?
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ CONFIRM ENTRY",
callback_data:"confirm_entry"
}
]
]
}
}
        );

    }

    // =====================================
    // WAIT MATCHED BUY
    // =====================================

    if(
        flow.step ===
        "WAIT_MATCHED_PRICE"
    ){

        const matchedPrice =
        Number(text);

        const buyFeeUnit =
        flow.quantity *
        BUY_FEE;

        const netBuyUnit =
        flow.quantity -
        buyFeeUnit;

        const netBuyValue =
        netBuyUnit *
        matchedPrice;

        const tradeId =
        createTradeId();

        ACTIVE_TRADES[
            tradeId
        ] = {

            tradeId,

            coin:
            flow.coin,

            tp:
            flow.tp,

            sl:
            flow.sl,

            matchedPrice,

            netBuyUnit,

            netBuyValue,

            sellTriggered:false

        };

        await sendTelegram(
`
✅ TRADE CONFIRMED

🟢 ${flow.coin}

🪙 Net Buy Unit
${formatUnit(
    flow.coin,
    netBuyUnit
)} ${flow.coin}

💰 Net Buy Value
RM${netBuyValue.toFixed(2)}

📈 TP
RM${formatPrice(
    flow.coin,
    flow.tp
)}

🛑 SL
RM${formatPrice(
    flow.coin,
    flow.sl
)}

👀 Live monitoring activated
`
        );

        delete USER_FLOW[
            userId
        ];

    }

    // =====================================
    // WAIT MATCHED SELL
    // =====================================

    if(
        flow.step ===
        "WAIT_MATCHED_SELL"
    ){

        const trade =
        ACTIVE_TRADES[
            flow.tradeId
        ];

        const matchedSell =
        Number(text);

        const sellFeeUnit =
        trade.netBuyUnit *
        SELL_FEE;

        const netSellUnit =
        trade.netBuyUnit -
        sellFeeUnit;

        const finalSale =
        netSellUnit *
        matchedSell;

        const finalProfit =
        finalSale -
        trade.netBuyValue;

        await sendTelegram(
`
✅ CONFIRM SOLD

🟢 ${trade.coin}

🪙 Sold:
${formatUnit(
    trade.coin,
    netSellUnit
)} ${trade.coin}

💵 Matched Sell:
RM${formatPrice(
    trade.coin,
    matchedSell
)}

💰 Final Profit:
RM${finalProfit.toFixed(2)}

⚠️ Profit mungkin berubah ikut matched sell price sebenar.
`
        );

        delete ACTIVE_TRADES[
            flow.tradeId
        ];

        delete USER_FLOW[
            userId
        ];

    }

});

// =====================================
// MONITOR TRADES
// =====================================

async function monitorTrades(){

    for(
        const tradeId in
        ACTIVE_TRADES
    ){

        const trade =
        ACTIVE_TRADES[
            tradeId
        ];

        const data =
        await getMarketStructure(
            trade.coin
        );

        if(!data){
            continue;
        }

        // =====================================
        // SELL NOW
        // =====================================

        if(
            data.currentPrice >=
            trade.tp
            &&
            !trade.sellTriggered
        ){

            trade.sellTriggered =
            true;

            const estimatedSale =
            trade.netBuyUnit *
            data.bestBidPrice;

            const estimatedProfit =
            estimatedSale -
            trade.netBuyValue;

            await sendTelegram(
`
🚀 SELL NOW

🟢 ${trade.coin}

📈 TP Hit:
RM${formatPrice(
    trade.coin,
    trade.tp
)}

⚠️ Best Bid:
RM${formatPrice(
    trade.coin,
    data.bestBidPrice
)}

💰 Estimated Profit:
RM${estimatedProfit.toFixed(2)}
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ CONFIRM SELL",
callback_data:
`confirm_sell_${tradeId}`
}
]
]
}
}
            );

        }

        // =====================================
        // CUTLOSS
        // =====================================

        if(
            data.currentPrice <=
            trade.sl
        ){

            await sendTelegram(
`
🛑 CUTLOSS NOW

🔴 ${trade.coin}

📉 Support pecah:
RM${formatPrice(
    trade.coin,
    trade.sl
)}

⚠️ Selling pressure semakin kuat.
`
            );

        }

    }

}

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

    setInterval(
        monitorTrades,
        10000
    );

},5000);