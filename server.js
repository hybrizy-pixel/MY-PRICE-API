require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

// ======================================
// EXPRESS
// ======================================

const app = express();

const PORT =
process.env.PORT || 3000;

// ======================================
// SERVER CODE
// ======================================

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

// ======================================
// TELEGRAM
// ======================================

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

// ======================================
// COINS
// ======================================

const COINS = {

    BTC:"XBTMYR",
    GRT:"GRTMYR"

};

// ======================================
// SETTINGS
// ======================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

const SIGNAL_EXPIRY =
15 * 60 * 1000;

const EXIT_EXPIRY =
15 * 60 * 1000;

const MAX_QUANTITY = {

    BTC:10,
    GRT:1000000

};

// ======================================
// MEMORY
// ======================================

const LAST_PRICE = {};

const USER_FLOW = {};

const ACTIVE_TRADES = {};

const PENDING_SIGNALS = {};

const ACTIVE_EXITS = {};

const ALERTS = {

    scalp:{},
    normal:{},

    breakout:{},
    breakdown:{},
    rejection:{},
    whale:{}

};

// ======================================
// COOLDOWN
// ======================================

const ALERT_COOLDOWN = {

    scalp:20 * 60 * 1000,
    normal:30 * 60 * 1000,

    breakout:15 * 60 * 1000,
    breakdown:15 * 60 * 1000,
    rejection:20 * 60 * 1000,
    whale:20 * 60 * 1000

};

// ======================================
// HELPERS
// ======================================

function now(){

    return Date.now();

}

function createSignalId(){

    return (
        "SIGNAL_" +
        Date.now()
    );

}

function createTradeId(){

    return (
        "TRADE_" +
        Date.now()
    );

}

function createExitId(){

    return (
        "EXIT_" +
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
    options={}
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

        return true;

    }catch(err){

        console.log(
            err.message
        );

        return false;

    }

}

// ======================================
// API
// ======================================

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

// ======================================
// MARKET STRUCTURE
// ======================================

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

        const currentPrice =
        parseFloat(
            ticker.last_trade
        );

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

        // ======================================
        // SUPPORT ZONE
        // ======================================

        const supportZone =
        bids.filter(
            bid => {

                const price =
                parseFloat(
                    bid.price
                );

                return (
                    price <
                    currentPrice * 0.999
                    &&
                    price >
                    currentPrice * 0.97
                );

            }
        );

        // ======================================
        // RESISTANCE ZONE
        // ======================================

        const resistanceZone =
        asks.filter(
            ask => {

                const price =
                parseFloat(
                    ask.price
                );

                return (
                    price >
                    currentPrice * 1.001
                    &&
                    price <
                    currentPrice * 1.03
                );

            }
        );

        if(
            supportZone.length === 0 ||
            resistanceZone.length === 0
        ){

            return null;

        }

        const strongestSupport =
        supportZone.reduce(
            (a,b)=>
            parseFloat(a.volume)
            >
            parseFloat(b.volume)
            ? a : b
        );

        const strongestResistance =
        resistanceZone.reduce(
            (a,b)=>
            parseFloat(a.volume)
            >
            parseFloat(b.volume)
            ? a : b
        );

        let buyVolume = 0;
        let sellVolume = 0;

        for(
            const bid of supportZone
        ){

            buyVolume +=
            parseFloat(
                bid.volume
            );

        }

        for(
            const ask of resistanceZone
        ){

            sellVolume +=
            parseFloat(
                ask.volume
            );

        }

        const pressure =
        buyVolume /
        sellVolume;

        let trend =
        "SIDEWAYS";

        if(
            pressure > 1.15 &&
            spreadPercent < 0.0025
        ){

            trend =
            "BULLISH";

        }

        if(
            pressure < 0.85
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

// ======================================
// PRICE ALERT
// ======================================

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

// ======================================
// MARKET STRUCTURE ALERT
// ======================================

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

// ======================================
// MARKET EVENTS
// ======================================

async function marketEventEngine(){

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
            data.currentPrice >
            data.resistancePrice
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
    data.currentPrice
)}
→
RM${formatPrice(
    coin,
    data.resistancePrice
)}

🔥 Buyer momentum increasing
`
            );

        }

        // BREAKDOWN

        if(
            data.currentPrice <
            data.supportPrice
            &&
            data.pressure < 0.85
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
    data.currentPrice
)}
→
RM${formatPrice(
    coin,
    data.supportPrice
)}

⚠️ Seller pressure increasing
`
            );

        }

        // REJECTION

        if(
            data.currentPrice >
            data.resistancePrice * 0.998
            &&
            data.pressure < 1
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

⚠️ Seller wall defended
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
🐋 WHALE INFLOW

🟢 ${coin}

🪙 Buy Wall
${formatUnit(
    coin,
    data.supportVolume
)} ${coin}

⚠️ Whale accumulation detected
`
            );

        }

    }

}

// ======================================
// SCALPING ENTRY
// ======================================

async function sendScalpEntry(
    coin,
    data
){

    let tpMultiplier =
    1.02;

    if(
        data.pressure > 1.30
    ){
        tpMultiplier =
        1.03;
    }

    if(
        data.pressure > 1.50
    ){
        tpMultiplier =
        1.05;
    }

    const tp =
    data.currentPrice *
    tpMultiplier;

    const sl =
    data.supportPrice *
    0.995;

    const tpDistance =
    (
        tp -
        data.currentPrice
    )
    /
    data.currentPrice;

    // FILTER

    if(
        tpDistance < 0.015
    ){
        return;
    }

    if(
        data.resistancePrice <
        tp * 0.985
    ){
        return;
    }

    const signalId =
    createSignalId();

    const sent =
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

🔥 Momentum continuation detected.

⌛ Signal expired in 15 minutes.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ START ENTRY",
callback_data:
`start_${signalId}_${coin}_${data.currentPrice}_${data.bestAskPrice}_${tp}_${sl}`
}
]
]
}
}
    );

    if(sent){

        PENDING_SIGNALS[
            signalId
        ] = {

            signalId,
            coin,

            createdAt:
            now(),

            expired:false,

            sent:true

        };

    }

}

// ======================================
// SIGNAL ENGINE
// ======================================

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

        if(
            data.trend === "BULLISH"
            &&
            data.pressure > 1.15
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

            await sendScalpEntry(
                coin,
                data
            );

        }

    }

}

// ======================================
// CALLBACK QUERY
// ======================================

bot.on(
    "callback_query",
    async query=>{

    const data =
    query.data;

    const userId =
    query.from.id;

    // ======================================
    // START ENTRY
    // ======================================

    if(
        data.startsWith(
            "start_"
        )
    ){

        const split =
        data.split("_");

        const signalId =
        split[1];

        const signal =
        PENDING_SIGNALS[
            signalId
        ];

        if(
            !signal ||
            signal.expired
        ){

            await sendTelegram(
`
⌛ ENTRY CANCELLED

⚠️ Signal expired.
`
            );

            return;

        }

        delete PENDING_SIGNALS[
            signalId
        ];

        USER_FLOW[userId] = {

            step:"WAIT_PROFIT",

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
`
💸 TARGET PROFIT RM?
`
        );

    }

    // ======================================
    // YES ENTRY
    // ======================================

    if(
        data ===
        "yes_entry"
    ){

        USER_FLOW[userId].step =
        "WAIT_MATCHED_PRICE";

        await sendTelegram(
`
📌 Masukkan Matched Buy Price

Contoh:
0.1039
`
        );

    }

    // ======================================
    // NO ENTRY
    // ======================================

    if(
        data ===
        "no_entry"
    ){

        delete USER_FLOW[
            userId
        ];

        await sendTelegram(
`
❌ ENTRY CANCELLED

🟡 Trade dibatalkan user.
`
        );

    }

    // ======================================
    // CONFIRM SELL
    // ======================================

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

        const trade =
        ACTIVE_TRADES[
            tradeId
        ];

        if(!trade){
            return;
        }

        ACTIVE_EXITS[
            tradeId
        ].step =
        "WAIT_SELL_PRICE";

        ACTIVE_EXITS[
            tradeId
        ].type =
        "SELL";

        await sendTelegram(
`
📌 Masukkan Matched Sell Price

Contoh:
0.1067
`
        );

    }

    // ======================================
    // HOLD SELL
    // ======================================

    if(
        data.startsWith(
            "hold_sell_"
        )
    ){

        const tradeId =
        data.replace(
            "hold_sell_",
            ""
        );

        delete ACTIVE_EXITS[
            tradeId
        ];

        ACTIVE_TRADES[
            tradeId
        ].sellTriggered =
        false;

        await sendTelegram(
`
🟡 SELL NOW dibatalkan.

👀 Monitoring diteruskan.
`
        );

    }

    // ======================================
    // CONFIRM CUTLOSS
    // ======================================

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

        ACTIVE_EXITS[
            tradeId
        ].step =
        "WAIT_CUTLOSS_PRICE";

        ACTIVE_EXITS[
            tradeId
        ].type =
        "CUTLOSS";

        await sendTelegram(
`
📌 Masukkan Matched Sell Price

Contoh:
0.1022
`
        );

    }

    // ======================================
    // HOLD CUTLOSS
    // ======================================

    if(
        data.startsWith(
            "hold_cutloss_"
        )
    ){

        const tradeId =
        data.replace(
            "hold_cutloss_",
            ""
        );

        delete ACTIVE_EXITS[
            tradeId
        ];

        ACTIVE_TRADES[
            tradeId
        ].slTriggered =
        false;

        await sendTelegram(
`
🟡 CUTLOSS dibatalkan.

👀 Monitoring diteruskan.
`
        );

    }

});

// ======================================
// MESSAGE FLOW
// ======================================

bot.on(
    "message",
    async msg=>{

    const userId =
    msg.from.id;

    const text =
    msg.text;

    // ======================================
    // ENTRY FLOW
    // ======================================

    if(
        USER_FLOW[userId]
    ){

        const flow =
        USER_FLOW[userId];

        // TARGET PROFIT

        if(
            flow.step ===
            "WAIT_PROFIT"
        ){

            flow.targetProfit =
            Number(text);

            if(
                isNaN(
                    flow.targetProfit
                )
            ){

                await sendTelegram(
`
⚠️ Masukkan nombor sahaja.
`
                );

                return;

            }

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

            // SAFETY

            if(
                adjustedDiff <= 0
            ){

                await sendTelegram(
`
⚠️ Setup tidak sesuai.

📉 TP terlalu dekat selepas fees.
`
                );

                delete USER_FLOW[
                    userId
                ];

                return;

            }

            const quantity =
            flow.targetProfit /
            adjustedDiff;

            if(
                quantity <= 0
            ){

                await sendTelegram(
`
⚠️ Invalid quantity.
`
                );

                delete USER_FLOW[
                    userId
                ];

                return;

            }

            if(
                quantity >
                MAX_QUANTITY[
                    flow.coin
                ]
            ){

                await sendTelegram(
`
⚠️ Quantity terlalu besar.

🟡 Setup tidak practical.
`
                );

                delete USER_FLOW[
                    userId
                ];

                return;

            }

            flow.quantity =
            quantity;

            const buyFeeUnit =
            quantity *
            BUY_FEE;

            const netBuyUnit =
            quantity -
            buyFeeUnit;

            const sellFeeUnit =
            netBuyUnit *
            SELL_FEE;

            const netSellUnit =
            netBuyUnit -
            sellFeeUnit;

            const estimatedBuyValue =
            netBuyUnit *
            flow.bestAsk;

            const estimatedSaleValue =
            netSellUnit *
            flow.tp;

            const estimatedProfit =
            estimatedSaleValue -
            estimatedBuyValue;

            flow.step =
            "WAIT_CONFIRM";

            await sendTelegram(
`
🪙 Suggested Buy

Unit:
${formatUnit(
    flow.coin,
    quantity
)} ${flow.coin}

🪙 Net Buy Unit
${formatUnit(
    flow.coin,
    netBuyUnit
)} ${flow.coin}

🪙 Net Sell Unit
${formatUnit(
    flow.coin,
    netSellUnit
)} ${flow.coin}

💰 Estimated Buy Value
RM${estimatedBuyValue.toFixed(2)}

💰 Estimated Sale Value
RM${estimatedSaleValue.toFixed(2)}

🔥 Estimated Profit
RM${estimatedProfit.toFixed(2)}

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
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ YES",
callback_data:"yes_entry"
},
{
text:"❌ NO",
callback_data:"no_entry"
}
]
]
}
}
            );

            return;

        }

        // MATCHED BUY

        if(
            flow.step ===
            "WAIT_MATCHED_PRICE"
        ){

            const matchedPrice =
            Number(text);

            if(
                isNaN(
                    matchedPrice
                )
            ){

                await sendTelegram(
`
⚠️ Invalid price.
`
                );

                return;

            }

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

                netBuyUnit,
                netBuyValue,

                sellTriggered:false,
                slTriggered:false

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

📌 Matched Buy
RM${formatPrice(
    flow.coin,
    matchedPrice
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

👀 Live monitoring activated.
`
            );

            delete USER_FLOW[
                userId
            ];

            return;

        }

    }

    // ======================================
    // EXIT FLOW
    // ======================================

    for(
        const tradeId in
        ACTIVE_EXITS
    ){

        const exit =
        ACTIVE_EXITS[
            tradeId
        ];

        const trade =
        ACTIVE_TRADES[
            tradeId
        ];

        if(
            !trade
        ){
            continue;
        }

        // SELL PRICE

        if(
            exit.step ===
            "WAIT_SELL_PRICE"
        ){

            const matchedSell =
            Number(text);

            if(
                isNaN(
                    matchedSell
                )
            ){

                await sendTelegram(
`
⚠️ Invalid sell price.
`
                );

                return;

            }

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSellUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const finalSaleValue =
            netSellUnit *
            matchedSell;

            const finalProfit =
            finalSaleValue -
            trade.netBuyValue;

            await sendTelegram(
`
✅ TRADE CLOSED

🟢 ${trade.coin}

📌 Matched Sell
RM${formatPrice(
    trade.coin,
    matchedSell
)}

🪙 Net Sell Unit
${formatUnit(
    trade.coin,
    netSellUnit
)} ${trade.coin}

💰 Final Sale Value
RM${finalSaleValue.toFixed(2)}

🔥 Final Profit
RM${finalProfit.toFixed(2)}
`
            );

            delete ACTIVE_EXITS[
                tradeId
            ];

            delete ACTIVE_TRADES[
                tradeId
            ];

            return;

        }

        // CUTLOSS PRICE

        if(
            exit.step ===
            "WAIT_CUTLOSS_PRICE"
        ){

            const matchedSell =
            Number(text);

            if(
                isNaN(
                    matchedSell
                )
            ){

                await sendTelegram(
`
⚠️ Invalid sell price.
`
                );

                return;

            }

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSellUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const finalSaleValue =
            netSellUnit *
            matchedSell;

            const finalLoss =
            finalSaleValue -
            trade.netBuyValue;

            await sendTelegram(
`
✅ TRADE CLOSED

🔴 ${trade.coin}

📌 Matched Sell
RM${formatPrice(
    trade.coin,
    matchedSell
)}

🪙 Net Sell Unit
${formatUnit(
    trade.coin,
    netSellUnit
)} ${trade.coin}

💰 Final Sale Value
RM${finalSaleValue.toFixed(2)}

📉 Final Loss
RM${finalLoss.toFixed(2)}
`
            );

            delete ACTIVE_EXITS[
                tradeId
            ];

            delete ACTIVE_TRADES[
                tradeId
            ];

            return;

        }

    }

});

// ======================================
// TRADE MONITOR
// ======================================

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

        // ======================================
        // TP HIT
        // ======================================

        if(
            data.currentPrice >=
            trade.tp
            &&
            !trade.sellTriggered
        ){

            trade.sellTriggered =
            true;

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSellUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const estimatedSaleValue =
            netSellUnit *
            data.bestBidPrice;

            const estimatedProfit =
            estimatedSaleValue -
            trade.netBuyValue;

            const exitId =
            createExitId();

            ACTIVE_EXITS[
                tradeId
            ] = {

                exitId,

                tradeId,

                type:"SELL",

                createdAt:
                now(),

                expired:false

            };

            await sendTelegram(
`
🚀 SELL NOW

🟢 ${trade.coin}

📈 TP HIT
RM${formatPrice(
    trade.coin,
    trade.tp
)}

⚠️ Best Bid
RM${formatPrice(
    trade.coin,
    data.bestBidPrice
)}

🪙 Net Sell Unit
${formatUnit(
    trade.coin,
    netSellUnit
)} ${trade.coin}

💰 Estimated Sale Value
RM${estimatedSaleValue.toFixed(2)}

🔥 Estimated Profit
RM${estimatedProfit.toFixed(2)}

⌛ Sell request expires in 15 minutes.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ CONFIRM SELL",
callback_data:
`confirm_sell_${tradeId}`
},
{
text:"❌ HOLD",
callback_data:
`hold_sell_${tradeId}`
}
]
]
}
}
            );

        }

        // ======================================
        // SL HIT
        // ======================================

        if(
            data.currentPrice <=
            trade.sl
            &&
            !trade.slTriggered
        ){

            trade.slTriggered =
            true;

            const sellFeeUnit =
            trade.netBuyUnit *
            SELL_FEE;

            const netSellUnit =
            trade.netBuyUnit -
            sellFeeUnit;

            const estimatedSaleValue =
            netSellUnit *
            data.bestBidPrice;

            const estimatedLoss =
            estimatedSaleValue -
            trade.netBuyValue;

            const exitId =
            createExitId();

            ACTIVE_EXITS[
                tradeId
            ] = {

                exitId,

                tradeId,

                type:"CUTLOSS",

                createdAt:
                now(),

                expired:false

            };

            await sendTelegram(
`
🛑 CUTLOSS NOW

🔴 ${trade.coin}

📉 SL HIT
RM${formatPrice(
    trade.coin,
    trade.sl
)}

⚠️ Best Bid
RM${formatPrice(
    trade.coin,
    data.bestBidPrice
)}

🪙 Net Sell Unit
${formatUnit(
    trade.coin,
    netSellUnit
)} ${trade.coin}

💰 Estimated Sale Value
RM${estimatedSaleValue.toFixed(2)}

📉 Estimated Loss
RM${estimatedLoss.toFixed(2)}

⌛ Cutloss request expires in 15 minutes.
`,
{
reply_markup:{
inline_keyboard:[
[
{
text:"✅ CONFIRM CUTLOSS",
callback_data:
`confirm_cutloss_${tradeId}`
},
{
text:"❌ HOLD",
callback_data:
`hold_cutloss_${tradeId}`
}
]
]
}
}
            );

        }

    }

}

// ======================================
// ENTRY EXPIRY
// ======================================

async function monitorExpiredSignals(){

    for(
        const signalId in
        PENDING_SIGNALS
    ){

        const signal =
        PENDING_SIGNALS[
            signalId
        ];

        if(
            signal.expired
        ){
            continue;
        }

        if(
            now() -
            signal.createdAt >
            SIGNAL_EXPIRY
        ){

            signal.expired =
            true;

            await sendTelegram(
`
⌛ ENTRY CANCELLED

🟡 ${signal.coin}

⚠️ No entry confirmed within 15 minutes.

📉 Entry signal expired.
`
            );

            delete PENDING_SIGNALS[
                signalId
            ];

        }

    }

}

// ======================================
// EXIT EXPIRY
// ======================================

async function monitorExitExpiry(){

    for(
        const tradeId in
        ACTIVE_EXITS
    ){

        const exit =
        ACTIVE_EXITS[
            tradeId
        ];

        if(
            exit.expired
        ){
            continue;
        }

        if(
            now() -
            exit.createdAt >
            EXIT_EXPIRY
        ){

            exit.expired =
            true;

            // SELL EXPIRED

            if(
                exit.type ===
                "SELL"
            ){

                ACTIVE_TRADES[
                    tradeId
                ].sellTriggered =
                false;

                await sendTelegram(
`
⌛ SELL NOW CANCELLED

🟡 ${ACTIVE_TRADES[
    tradeId
].coin}

⚠️ No sell confirmation within 15 minutes.

📉 Sell request expired.
`
                );

            }

            // CUTLOSS EXPIRED

            if(
                exit.type ===
                "CUTLOSS"
            ){

                ACTIVE_TRADES[
                    tradeId
                ].slTriggered =
                false;

                await sendTelegram(
`
⌛ CUTLOSS CANCELLED

🟡 ${ACTIVE_TRADES[
    tradeId
].coin}

⚠️ No cutloss confirmation within 15 minutes.

📉 Cutloss request expired.
`
                );

            }

            delete ACTIVE_EXITS[
                tradeId
            ];

        }

    }

}

// ======================================
// STARTUP
// ======================================

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

    await marketEventEngine();

    await smartSignalEngine();

    // ======================================
    // INTERVALS
    // ======================================

    setInterval(
        sendPriceAlert,
        300000
    );

    setInterval(
        sendMarketStructure,
        900000
    );

    setInterval(
        marketEventEngine,
        120000
    );

    setInterval(
        smartSignalEngine,
        120000
    );

    setInterval(
        monitorTrades,
        10000
    );

    setInterval(
        monitorExpiredSignals,
        60000
    );

    setInterval(
        monitorExitExpiry,
        60000
    );

},5000);

// ======================================
// EXPRESS
// ======================================

app.get(
    "/",
    (req,res)=>{

    res.json({

        status:"BOT ACTIVE",
        server:SERVER_CODE

    });

});

app.listen(
    PORT,
    ()=>{

    console.log(
        `SERVER RUNNING ${PORT}`
    );

});
