require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// =====================================
// RANDOM DEPLOYMENT CODE
// =====================================

function generateServerCode() {

    const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let result = "";

    for(let i = 0; i < 4; i++){

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
// CONFIG
// =====================================

const PORT =
process.env.PORT || 3000;

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// BOT
// =====================================

const bot =
new TelegramBot(
    TELEGRAM_TOKEN,
    {
        polling:true
    }
);

// =====================================
// COINS
// =====================================

const COINS = {

    BTC:"XBTMYR",
    GRT:"GRTMYR",
    XRP:"XRPMYR",
    XLM:"XLMMYR",
    AAVE:"AAVEMYR",
    CRV:"CRVMYR"

};

// =====================================
// FEES
// =====================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

// =====================================
// MEMORY
// =====================================

const USER_FLOW = {};
const ACTIVE_TRADES = {};
const TRADE_HISTORY = {};
const LAST_PRICE = {};

const ALERTS = {

    breakout:{},
    breakdown:{},
    whale:{},
    rejection:{},
    liquidity:{},
    scalp:{},
    normal:{}

};

// =====================================
// HELPERS
// =====================================

function now(){
    return Date.now();
}

function cooldownPassed(
    store,
    coin,
    cooldown = 600000
){

    if(!store[coin]){
        return true;
    }

    return (
        now() -
        store[coin]
    ) > cooldown;

}

function setCooldown(
    store,
    coin
){

    store[coin] =
    now();

}

function createTradeId(){

    return (
        "TRD_" +
        Date.now() +
        "_" +
        Math.floor(
            Math.random()*999999
        )
    );

}

function formatPrice(
    coin,
    price
){

    if(!price){
        return "0";
    }

    if(coin === "BTC"){

        return Number(price)
        .toFixed(2);

    }

    return Number(price)
    .toFixed(4);

}

function formatUnit(
    coin,
    unit
){

    if(
        coin === "BTC"
        ||
        coin === "AAVE"
    ){

        return Number(unit)
        .toFixed(6);

    }

    return Math.floor(unit)
    .toLocaleString();

}

function hasActiveTrade(
    userId,
    coin
){

    for(
        const tradeId in
        ACTIVE_TRADES
    ){

        const trade =
        ACTIVE_TRADES[tradeId];

        if(
            trade.userId ==
            userId
            &&
            trade.coin ==
            coin
        ){

            return true;

        }

    }

    return false;

}

async function sendTelegram(
    message,
    extra = {}
){

    try{

        await bot.sendMessage(
            CHAT_ID,
            `${SERVER_CODE} ${message}`,
            extra
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

async function getTicker(coin){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(
            `https://api.luno.com/api/1/ticker?pair=${pair}`
        );

        return response.data;

    }catch(err){

        return null;

    }

}

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

        return null;

    }

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(coin){

    const orderbook =
    await getOrderbook(
        coin
    );

    if(!orderbook){
        return null;
    }

    const bids =
    orderbook.bids;

    const asks =
    orderbook.asks;

    if(
        bids.length < 10
        ||
        asks.length < 10
    ){
        return null;
    }

    const bestBid =
    bids[0];

    const bestAsk =
    asks[0];

    const support =
    bids[5];

    const resistance =
    asks[5];

    const currentPrice =
    parseFloat(bestBid.price);

    const askPrice =
    parseFloat(bestAsk.price);

    const spread =
    askPrice -
    currentPrice;

    const spreadPercent =
    spread /
    currentPrice;

    const buyVolume =
    bids.reduce(
        (a,b)=>
        a + parseFloat(b.volume),
        0
    );

    const sellVolume =
    asks.reduce(
        (a,b)=>
        a + parseFloat(b.volume),
        0
    );

    const pressure =
    buyVolume /
    sellVolume;

    // =====================================
    // RESISTANCE LAYERS
    // =====================================

    let consumedResistance = 0;

    let oldResistance =
    parseFloat(
        asks[0].price
    );

    let newResistance =
    parseFloat(
        asks[0].price
    );

    for(let i=0;i<3;i++){

        const layer =
        asks[i];

        if(
            parseFloat(
                layer.volume
            ) < 30000
        ){

            consumedResistance++;

            newResistance =
            parseFloat(
                layer.price
            );

        }

    }

    // =====================================
    // SUPPORT LAYERS
    // =====================================

    let collapsedSupport = 0;

    let oldSupport =
    parseFloat(
        bids[0].price
    );

    let newSupport =
    parseFloat(
        bids[0].price
    );

    for(let i=0;i<3;i++){

        const layer =
        bids[i];

        if(
            parseFloat(
                layer.volume
            ) < 30000
        ){

            collapsedSupport++;

            newSupport =
            parseFloat(
                layer.price
            );

        }

    }

    return {

        currentPrice,
        askPrice,

        bestBidPrice:
        parseFloat(
            bestBid.price
        ),

        bestAskPrice:
        parseFloat(
            bestAsk.price
        ),

        supportPrice:
        parseFloat(
            support.price
        ),

        resistancePrice:
        parseFloat(
            resistance.price
        ),

        supportVolume:
        parseFloat(
            support.volume
        ),

        resistanceVolume:
        parseFloat(
            resistance.volume
        ),

        buyVolume,
        sellVolume,

        spread,
        spreadPercent,

        pressure,

        consumedResistance,
        oldResistance,
        newResistance,

        collapsedSupport,
        oldSupport,
        newSupport

    };

}

// =====================================
// PRICE ALERT
// =====================================

async function sendPriceAlert(){

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

        let emoji = "➖";

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

        await sendTelegram(
`
📡 PRICE ALERT

${emoji} ${coin}

RM${formatPrice(
    coin,
    price
)}
`
        );

    }

}

// =====================================
// MARKET STRUCTURE ALERT
// =====================================

async function sendMarketStructure(){

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
        data.pressure > 1
        ?
        "🔥 Buyer control"
        :
        "⚠️ Seller control";

        await sendTelegram(
`
📊 MARKET STRUCTURE

🪙 ${coin}

RM${formatPrice(
    coin,
    data.currentPrice
)}

${pressureText}

🟢 Support
RM${formatPrice(
    coin,
    data.supportPrice
)}

(${formatUnit(
    coin,
    data.supportVolume
)})

🔴 Resistance
RM${formatPrice(
    coin,
    data.resistancePrice
)}

(${formatUnit(
    coin,
    data.resistanceVolume
)})
`
        );

    }

}

// =====================================
// SCALPING ENTRY
// =====================================

async function sendScalpEntry(
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
            data.consumedResistance >= 2
            &&
            cooldownPassed(
                ALERTS.breakout,
                coin
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
    data.oldResistance
)}
→
RM${formatPrice(
    coin,
    data.newResistance
)}

🔥 ${data.consumedResistance} resistance layer hilang dimakan buyer.

⚠️ Seller wall semakin menipis.
Buyer semakin mudah naikkan harga.
`
            );

        }

        // BREAKDOWN

        if(
            data.pressure < 0.75
            &&
            data.collapsedSupport >= 2
            &&
            cooldownPassed(
                ALERTS.breakdown,
                coin
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
RM${formatPrice(
    coin,
    data.oldSupport
)}
→
RM${formatPrice(
    coin,
    data.newSupport
)}

⚠️ ${data.collapsedSupport} support layer runtuh ditekan seller.

💧 Buyer wall semakin lemah.
Seller semakin mudah tekan harga turun.
`
            );

        }

        // WHALE INFLOW

        if(
            data.supportVolume > 100000
            &&
            cooldownPassed(
                ALERTS.whale,
                coin
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
)}
`
            );

        }

        // REJECTION ALERT

        if(
            data.pressure > 0.9
            &&
            data.pressure < 1
            &&
            cooldownPassed(
                ALERTS.rejection,
                coin
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

📉 Resistance rejection detected

⚠️ Strong seller wall defended

🛑 Possible fake breakout
`
            );

        }

        // LIQUIDITY ALERT

        if(
            data.spreadPercent > 0.0015
            &&
            cooldownPassed(
                ALERTS.liquidity,
                coin
            )
        ){

            setCooldown(
                ALERTS.liquidity,
                coin
            );

            await sendTelegram(
`
💧 LIQUIDITY ALERT

⚠️ Seller wall semakin menipis.

📉 Spread semakin melebar.

⚠️ Risiko slippage semakin tinggi.
`
            );

        }

        // SCALPING ENTRY

        if(
            data.pressure > 1.15
            &&
            data.pressure < 1.35
            &&
            data.spreadPercent < 0.0012
            &&
            cooldownPassed(
                ALERTS.scalp,
                coin
            )
        ){

            setCooldown(
                ALERTS.scalp,
                coin
            );

            await sendScalpEntry(
                coin,
                data
            );

        }

        // NORMAL ENTRY

        if(
            data.pressure >= 1.35
            &&
            data.supportVolume > 50000
            &&
            cooldownPassed(
                ALERTS.normal,
                coin
            )
        ){

            setCooldown(
                ALERTS.normal,
                coin
            );

            await sendNormalEntry(
                coin,
                data
            );

        }

    }

}

// =====================================
// CALLBACK FLOW
// =====================================

bot.on(
    "callback_query",
    async (query)=>{

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

        const entryType =
        split[1];

        const coin =
        split[2];

        if(
            hasActiveTrade(
                userId,
                coin
            )
        ){

            await sendTelegram(
`
⚠️ Anda masih ada trade aktif untuk ${coin}.
`
            );

            return;

        }

        USER_FLOW[userId] = {

            step:"WAIT_PROFIT",

            entryType,

            coin,

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
`
💸 PROFIT TARGET RM?
`
        );

    }

    // CONFIRM ENTRY

    if(
        data ===
        "confirm_entry"
    ){

        USER_FLOW[userId]
        .step =
        "WAIT_MATCHED_PRICE";

        await sendTelegram(
`
📌 Matched Price?
`
        );

    }

    // CANCEL ENTRY

    if(
        data ===
        "cancel_entry"
    ){

        delete USER_FLOW[userId];

        await sendTelegram(
`
❌ ENTRY CANCELLED
`
        );

    }

    // CANCEL ACTIVE TRADE

    if(
        data.startsWith(
            "cancel_trade_"
        )
    ){

        const tradeId =
        data.replace(
            "cancel_trade_",
            ""
        );

        delete ACTIVE_TRADES[
            tradeId
        ];

        await sendTelegram(
`
❌ ACTIVE TRADE CANCELLED
`
        );

    }

    // CONFIRM SELL

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

            step:
            "WAIT_MATCHED_SELL",

            tradeId

        };

        await sendTelegram(
`
📌 Matched Sell Price?
`
        );

    }

    // CONFIRM CUTLOSS

    if(
        data.startsWith(
            "confirm_cutloss_"
        )
    ){

        const tradeId =
        data.replace(
            "confirm_cutloss_",
            ""
        );

        USER_FLOW[userId] = {

            step:
            "WAIT_MATCHED_CUTLOSS",

            tradeId

        };

        await sendTelegram(
`
📌 Matched Sell Price?
`
        );

    }

});

// =====================================
// MESSAGE FLOW
// =====================================

bot.on(
    "message",
    async (msg)=>{

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

        const adjustedDiff =
        (
            flow.tp *
            (1 - SELL_FEE)
        )
        -
        (
            flow.entryPrice *
            (1 + BUY_FEE)
        );

        const quantity =
        flow.targetProfit /
        adjustedDiff;

        flow.quantity =
        quantity;

        const estimatedBuyValue =
        quantity *
        flow.entryPrice;

        let warning = "";

        if(
            flow.bestAsk >
            flow.entryPrice
        ){

            warning =
            "⚠️ Profit estimate mungkin lebih rendah jika matched pada best ask semasa.";

        }

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

💸 Profit Estimate With TP
RM${flow.targetProfit}

📈 TP
RM${formatPrice(
    flow.coin,
    flow.tp
)}

⚠️ Current Best Ask
RM${formatPrice(
    flow.coin,
    flow.bestAsk
)}

${warning}

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

    // WAIT MATCHED BUY

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

        const sellFeeUnit =
        netBuyUnit *
        SELL_FEE;

        const netSaleUnit =
        netBuyUnit -
        sellFeeUnit;

        const estimatedProfit =
        (
            netSaleUnit *
            flow.tp
        )
        -
        netBuyValue;

        const tradeId =
        createTradeId();

        ACTIVE_TRADES[
            tradeId
        ] = {

            tradeId,

            userId,

            coin:
            flow.coin,

            entryType:
            flow.entryType,

            tp:
            flow.tp,

            sl:
            flow.sl,

            matchedPrice,

            netBuyUnit,

            netBuyValue,

            createdAt:
            now(),

            sellTriggered:false,
            cutlossTriggered:false

        };

        await sendTelegram(
`
✅ TRADE CONFIRMED

🟢 ${flow.coin}

📌 Trade Type
${flow.entryType.toUpperCase()}

🪙 Net Buy Unit
${formatUnit(
    flow.coin,
    netBuyUnit
)} ${flow.coin}

💰 Net Buy Value
RM${netBuyValue.toFixed(2)}

📌 Matched Price
RM${formatPrice(
    flow.coin,
    matchedPrice
)}

💸 Profit Estimate With TP
RM${estimatedProfit.toFixed(2)}

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

    // WAIT MATCHED SELL

    if(
        flow.step ===
        "WAIT_MATCHED_SELL"
    ){

        const matchedSellPrice =
        Number(text);

        const trade =
        ACTIVE_TRADES[
            flow.tradeId
        ];

        if(!trade){
            return;
        }

        const sellFeeUnit =
        trade.netBuyUnit *
        SELL_FEE;

        const netSaleUnit =
        trade.netBuyUnit -
        sellFeeUnit;

        const saleValue =
        netSaleUnit *
        matchedSellPrice;

        const finalProfit =
        saleValue -
        trade.netBuyValue;

        let profitComment =
        "✅ Profit hampir sama dengan target asal.";

        if(
            matchedSellPrice <
            trade.tp
        ){

            profitComment =
            "⚠️ Profit lebih rendah kerana matched sell price lebih rendah daripada TP.";

        }

        if(
            matchedSellPrice >
            trade.tp
        ){

            profitComment =
            "🔥 Profit lebih tinggi kerana matched sell price lebih tinggi daripada TP.";

        }

        TRADE_HISTORY[
            trade.tradeId
        ] = {

            ...trade,

            finalProfit,

            closedAt:
            now()

        };

        await sendTelegram(
`
✅ CONFIRM SOLD

🟢 ${trade.coin}

🪙 Net Unit Sold
${formatUnit(
    trade.coin,
    netSaleUnit
)} ${trade.coin}

💰 Sale Value
RM${saleValue.toFixed(2)}

📌 Matched Sell Price
RM${formatPrice(
    trade.coin,
    matchedSellPrice
)}

💸 Final Profit
RM${finalProfit.toFixed(2)}

${profitComment}

🛑 Live monitoring stopped
`
        );

        delete ACTIVE_TRADES[
            flow.tradeId
        ];

        delete USER_FLOW[
            userId
        ];

    }

    // WAIT MATCHED CUTLOSS

    if(
        flow.step ===
        "WAIT_MATCHED_CUTLOSS"
    ){

        const matchedSellPrice =
        Number(text);

        const trade =
        ACTIVE_TRADES[
            flow.tradeId
        ];

        if(!trade){
            return;
        }

        const sellFeeUnit =
        trade.netBuyUnit *
        SELL_FEE;

        const netSaleUnit =
        trade.netBuyUnit -
        sellFeeUnit;

        const saleValue =
        netSaleUnit *
        matchedSellPrice;

        const finalLoss =
        saleValue -
        trade.netBuyValue;

        TRADE_HISTORY[
            trade.tradeId
        ] = {

            ...trade,

            finalLoss,

            closedAt:
            now()

        };

        await sendTelegram(
`
🛑 CUTLOSS CONFIRMED

🔴 ${trade.coin}

🪙 Net Unit Sold
${formatUnit(
    trade.coin,
    netSaleUnit
)} ${trade.coin}

💰 Sale Value
RM${saleValue.toFixed(2)}

📌 Matched Sell Price
RM${formatPrice(
    trade.coin,
    matchedSellPrice
)}

📉 Final Loss
RM${finalLoss.toFixed(2)}

⚠️ Loss meningkat kerana matched sell price lebih rendah daripada SL.

🛑 Live monitoring stopped
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

        const liveAsk =
        data.bestAskPrice;

        const liveBid =
        data.bestBidPrice;

        // REVERSAL DETECTION

        if(
            data.pressure < 0.85
            &&
            !trade.reversalAlerted
        ){

            trade.reversalAlerted =
            true;

            await sendTelegram(
`
⚠️ REVERSAL DETECTED

🔴 ${trade.coin}

Buyer momentum semakin lemah.

⚠️ Seller pressure increasing.
`
            );

        }

        // SELL NOW

        if(
            liveBid >= trade.tp
            &&
            !trade.sellTriggered
        ){

            trade.sellTriggered =
            true;

            trade.sellTime =
            now();

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSaleUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const saleValue =
            netSaleUnit *
            liveBid;

            const estimatedProfit =
            saleValue -
            trade.netBuyValue;

            let spreadComment =
            "💡 Spread masih dalam julat profit.";

            if(
                data.spreadPercent >
                0.0012
            ){

                spreadComment =
                "⚠️ Spread semakin melebar. Profit margin semakin kecil.";

            }

            await sendTelegram(
`
🚀 SELL NOW

🟢 ${trade.coin}

📈 TP Price
RM${formatPrice(
    trade.coin,
    trade.tp
)}

⚠️ Asking Price
RM${formatPrice(
    trade.coin,
    liveBid
)}

🪙 Net Sale Unit
${formatUnit(
    trade.coin,
    netSaleUnit
)} ${trade.coin}

⚠️ Reserved For Luno Fees
${formatUnit(
    trade.coin,
    sellFeeUnit
)} ${trade.coin}

💰 Estimated Sale Value
RM${saleValue.toFixed(2)}

💸 Estimated Profit
RM${estimatedProfit.toFixed(2)}

${spreadComment}
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:
"✅ CONFIRM SELL",

callback_data:
`confirm_sell_${trade.tradeId}`
},
{
text:
"❌ CANCEL ACTIVE TRADE",

callback_data:
`cancel_trade_${trade.tradeId}`
}
]
]
}
}
            );

        }

        // CUTLOSS NOW

        if(
            liveBid <= trade.sl
            &&
            !trade.cutlossTriggered
        ){

            trade.cutlossTriggered =
            true;

            trade.cutlossTime =
            now();

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSaleUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const saleValue =
            netSaleUnit *
            liveBid;

            const estimatedLoss =
            saleValue -
            trade.netBuyValue;

            await sendTelegram(
`
🛑 CUTLOSS NOW

🔴 ${trade.coin}

🛑 SL Price
RM${formatPrice(
    trade.coin,
    trade.sl
)}

⚠️ Asking Price
RM${formatPrice(
    trade.coin,
    liveBid
)}

🪙 Net Sale Unit
${formatUnit(
    trade.coin,
    netSaleUnit
)} ${trade.coin}

⚠️ Reserved For Luno Fees
${formatUnit(
    trade.coin,
    sellFeeUnit
)} ${trade.coin}

💰 Estimated Sale Value
RM${saleValue.toFixed(2)}

📉 Estimated Loss
RM${estimatedLoss.toFixed(2)}

⚠️ Seller pressure increasing.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:
"✅ CONFIRM CUTLOSS",

callback_data:
`confirm_cutloss_${trade.tradeId}`
},
{
text:
"❌ CANCEL ACTIVE TRADE",

callback_data:
`cancel_trade_${trade.tradeId}`
}
]
]
}
}
            );

        }

        // SELL TIMEOUT

        if(
            trade.sellTriggered
            &&
            now() -
            trade.sellTime >
            1800000
        ){

            await sendTelegram(
`
⚠️ NO SELL CONFIRMED

🛑 Live monitoring stopped
`
            );

            delete ACTIVE_TRADES[
                tradeId
            ];

        }

        // CUTLOSS TIMEOUT

        if(
            trade.cutlossTriggered
            &&
            now() -
            trade.cutlossTime >
            1800000
        ){

            await sendTelegram(
`
⚠️ NO CUTLOSS CONFIRMED

🛑 Live monitoring stopped
`
            );

            delete ACTIVE_TRADES[
                tradeId
            ];

        }

    }

}

// =====================================
// EXPRESS
// =====================================

app.get(
    "/",
    (req,res)=>{

    res.json({

        status:"BOT ACTIVE",

        server:
        SERVER_CODE

    });

});

app.listen(
    PORT,
    ()=>{

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