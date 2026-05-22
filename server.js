const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

// =====================================
// SERVER
// =====================================

const app = express();

const PORT =
process.env.PORT || 3000;

const SERVER_CODE =
process.env.SERVER_CODE || "APM3";

app.get("/",(req,res)=>{

    res.json({

        status:"BOT ACTIVE",
        server:SERVER_CODE

    });

});

app.listen(PORT,()=>{

    console.log(
        `SERVER RUNNING ${PORT}`
    );

});

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
// CONFIG
// =====================================

const COINS = {

    BTC:"XBTMYR",
    GRT:"GRTMYR"

};

const BUY_FEE = 0.002;
const SELL_FEE = 0.002;

const LAST_PRICE = {};
const LAST_ALERT = {};

const ACTIVE_TRADES = {};
const USER_FLOW = {};

const ALERTS = {

    breakout:{},
    breakdown:{},
    whale:{},
    rejection:{},
    liquidity:{}

};

const ALERT_COOLDOWN = {

    breakout:600000,
    breakdown:600000,
    whale:900000,
    rejection:600000,
    liquidity:600000

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
    ).toFixed(2);

}

async function sendTelegram(
    message,
    options = {}
){

    try{

        await bot.sendMessage(
            CHAT_ID,
            message,
            {
                parse_mode:"HTML",
                ...options
            }
        );

    }catch(err){

        console.log(err.message);

    }

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

// =====================================
// MARKET HELPERS
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
// GET TICKER
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

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(
    coin
){

    try{

        const response =
        await axios.get(
            `https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`
        );

        const bids =
        response.data.bids;

        const asks =
        response.data.asks;

        const currentPrice =
        parseFloat(
            bids[0].price
        );

        const askPrice =
        parseFloat(
            asks[0].price
        );

        const spread =
        askPrice -
        currentPrice;

        const spreadPercent =
        spread /
        currentPrice;

        // =====================================
        // FILTER SUPPORT
        // =====================================

        const filteredBids =
        bids.filter(bid=>{

            const price =
            parseFloat(
                bid.price
            );

            return (

                price >=
                currentPrice * 0.99

                &&

                price <=
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

        // =====================================
        // FILTER RESISTANCE
        // =====================================

        const filteredAsks =
        asks.filter(ask=>{

            const price =
            parseFloat(
                ask.price
            );

            return (

                price <=
                currentPrice * 1.01

                &&

                price >=
                currentPrice

            );

        });

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
            pressure > 1.1
        ){
            trend =
            "BULLISH";
        }

        if(
            pressure < 0.9
        ){
            trend =
            "BEARISH";
        }

        return {

            currentPrice,
            askPrice,

            bestBidPrice:
            currentPrice,

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

            buyVolume,
            sellVolume,

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
// MARKET STRUCTURE ALERT
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

        const pressureText =
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

${pressureText}

🟢 Strong Support
RM${formatPrice(
    coin,
    data.supportPrice
)}

(${formatUnit(
    coin,
    data.supportVolume
)})

🔴 Strong Resistance
RM${formatPrice(
    coin,
    data.resistancePrice
)}

(${formatUnit(
    coin,
    data.resistanceVolume
)})
`;

    }

    await sendTelegram(
        message
    );

}

// =====================================
// SCALPING ENTRY
// =====================================

async function sendScalpingEntry(
    coin,
    data
){

    const tp =
    data.currentPrice * 1.006;

    const sl =
    data.supportPrice * 0.997;

    await sendTelegram(
`
🔄 SCALPING ENTRY

🟢 ${coin}

Entry Price
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask Price
RM${formatPrice(
    coin,
    data.askPrice
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
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ START ENTRY",
callback_data:
`start_scalp_${coin}_${data.currentPrice}_${data.askPrice}_${tp}_${sl}`
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
    data.currentPrice * 1.02;

    const sl =
    data.supportPrice * 0.99;

    await sendTelegram(
`
🚀 NORMAL ENTRY

🟢 ${coin}

Entry Price
RM${formatPrice(
    coin,
    data.currentPrice
)}

⚠️ Best Ask Price
RM${formatPrice(
    coin,
    data.askPrice
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
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ START ENTRY",
callback_data:
`start_normal_${coin}_${data.currentPrice}_${data.askPrice}_${tp}_${sl}`
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

        // BREAKOUT

        if(
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

📈 Resistance breakout
RM${formatPrice(
    coin,
    data.resistancePrice
)}

🔥 Buyer momentum increasing

⚠️ Seller wall semakin menipis
`
            );

            await sendNormalEntry(
                coin,
                data
            );

        }

        // SCALPING

        if(
            data.pressure > 1.1
            &&
            data.pressure < 1.35
        ){

            await sendScalpingEntry(
                coin,
                data
            );

        }

        // BREAKDOWN

        if(
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

📉 Support breakdown

⚠️ Seller pressure increasing

💧 Buyer wall weakening
`
            );

        }

        // WHALE

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
🐋 SMART WHALE INFLOW

🟢 ${coin}

⚠️ Whale accumulation detected

🪙 Buy Wall
${formatUnit(
    coin,
    data.supportVolume
)} ${coin}
`
            );

        }

        // REJECTION

        if(
            data.pressure > 0.9
            &&
            data.pressure < 1
        ){

            await sendTelegram(
`
❌ REJECTION ALERT

🔴 ${coin}

📉 Resistance rejection detected

⚠️ Strong seller wall defended
`
            );

        }

        // LIQUIDITY

        if(
            data.spreadPercent >
            0.005
        ){

            await sendTelegram(
`
💧 LIQUIDITY ALERT

⚠️ Thin orderbook detected

📉 Spread widening rapidly
`
            );

        }

    }

}

// =====================================
// CALLBACKS
// =====================================

bot.on(
    "callback_query",
    async query=>{

    const data =
    query.data;

    const userId =
    query.from.id;

    // START ENTRY

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

    // CONFIRM ENTRY

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

    // CANCEL ENTRY

    if(
        data ===
        "cancel_entry"
    ){

        delete USER_FLOW[userId];

        await sendTelegram(
            "❌ ENTRY CANCELLED"
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

    // WAIT PROFIT

    if(
        flow.step ===
        "WAIT_PROFIT"
    ){

        flow.targetProfit =
        Number(text);

        const diff =
        flow.tp -
        flow.entryPrice;

        const quantity =
        flow.targetProfit /
        diff;

        flow.quantity =
        quantity;

        const estimatedBuyValue =
        quantity *
        flow.entryPrice;

        flow.step =
        "WAIT_CONFIRM_ENTRY";

        await sendTelegram(
`
🪙 Suggested Quantity

${formatUnit(
    flow.coin,
    quantity
)} ${flow.coin}

💰 Estimated Buy Value
RM${estimatedBuyValue.toFixed(2)}

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
text:
"✅ CONFIRM ENTRY",

callback_data:
"confirm_entry"
},
{
text:
"❌ CANCEL ENTRY",

callback_data:
"cancel_entry"
}
]
]
}
}
        );

    }

    // WAIT MATCHED PRICE

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

            sellTriggered:false,
            cutlossTriggered:false

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

});

// =====================================
// LIVE MONITOR
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

        const liveBid =
        data.bestBidPrice;

        // SELL

        if(
            liveBid >= trade.tp
            &&
            !trade.sellTriggered
        ){

            trade.sellTriggered =
            true;

            const saleValue =
            trade.netBuyUnit *
            liveBid;

            const estimatedProfit =
            saleValue -
            trade.netBuyValue;

            await sendTelegram(
`
🚀 SELL NOW

🟢 ${trade.coin}

📈 TP HIT

💰 Estimated Profit
RM${estimatedProfit.toFixed(2)}
`
            );

        }

        // CUTLOSS

        if(
            liveBid <= trade.sl
            &&
            !trade.cutlossTriggered
        ){

            trade.cutlossTriggered =
            true;

            const lossValue =
            (
                trade.netBuyUnit *
                liveBid
            ) -
            trade.netBuyValue;

            await sendTelegram(
`
🛑 CUTLOSS NOW

🔴 ${trade.coin}

📉 Estimated Loss
RM${lossValue.toFixed(2)}
`
            );

        }

    }

}

// =====================================
// START BOT
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
        180000
    );

    setInterval(
        monitorTrades,
        15000
    );

},5000);