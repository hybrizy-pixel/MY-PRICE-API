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

// =====================================
// TELEGRAM API
// =====================================

const TELEGRAM_API =
`https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// =====================================
// RANDOM INSTANCE CODE
// =====================================

const INSTANCE =
Math.random()
.toString(36)
.substring(2,6)
.toUpperCase();

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

const LAST_BREAKOUT = {};
const LAST_BREAKDOWN = {};

const USER_ENTRY_FLOW = {};

const ACTIVE_TRADES = {};

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

    if(

        coin === "BTC" ||
        coin === "AAVE" ||
        coin === "XRP"

    ){

        return Number(price)
        .toFixed(2);

    }

    if(

        coin === "GRT" ||
        coin === "XLM" ||
        coin === "CRV"

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

    if(
        Math.abs(percent) < 0.01
    ){

        return "➖";

    }

    if(percent > 0){

        return "🟢";

    }

    return "🔴";

}

// =====================================
// SEND TELEGRAM
// =====================================

async function sendTelegram(
    message,
    extra = {}
){

    try{

        await axios.post(

            `${TELEGRAM_API}/sendMessage`,

            {

                chat_id: CHAT_ID,

                text:
`[${INSTANCE}]

${message}`,

                parse_mode: "HTML",

                ...extra

            }

        );

    }catch(err){

        console.log(
            "TELEGRAM ERROR",
            err.message
        );

    }

}

// =====================================
// TELEGRAM COMMANDS
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
                        "Price alert"
                    },

                    {
                        command: "market",
                        description:
                        "Market structure"
                    },

                    {
                        command: "entry",
                        description:
                        "High entry"
                    },

                    {
                        command: "testentry",
                        description:
                        "Test entry"
                    },

                    {
                        command: "testsell",
                        description:
                        "Test sell"
                    },

                    {
                        command: "testextend",
                        description:
                        "Test profit extend"
                    },

                    {
                        command: "testcutloss",
                        description:
                        "Test cutloss"
                    },

                    {
                        command: "testoff",
                        description:
                        "Test monitor off"
                    },

                    {
                        command: "status",
                        description:
                        "Bot status"
                    }

                ]

            }

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

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

        const supports =
        orderbook.bids.filter(b=>{

            const price =
            parseFloat(b.price);

            return (

                price <
                currentPrice

                &&

                price >
                currentPrice * 0.995

            );

        });

        const resistances =
        orderbook.asks.filter(a=>{

            const price =
            parseFloat(a.price);

            return (

                price >
                currentPrice

                &&

                price <
                currentPrice * 1.005

            );

        });

        if(
            supports.length === 0 ||
            resistances.length === 0
        ){

            return null;

        }

        let support =
        supports[0];

        for(const s of supports){

            if(

                parseFloat(s.volume) >
                parseFloat(support.volume)

            ){

                support = s;

            }

        }

        let resistance =
        resistances[0];

        for(const r of resistances){

            if(

                parseFloat(r.volume) >
                parseFloat(resistance.volume)

            ){

                resistance = r;

            }

        }

        let majorSupport =
        null;

        for(const s of supports){

            if(

                parseFloat(s.volume) >
                parseFloat(support.volume) * 2

            ){

                majorSupport = s;

                break;

            }

        }

        let majorResistance =
        null;

        for(const r of resistances){

            if(

                parseFloat(r.volume) >
                parseFloat(resistance.volume) * 2

            ){

                majorResistance = r;

                break;

            }

        }

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

            majorSupport:
            majorSupport
            ?
            parseFloat(
                majorSupport.price
            )
            :
            null,

            majorSupportVolume:
            majorSupport
            ?
            parseFloat(
                majorSupport.volume
            )
            :
            null,

            majorResistance:
            majorResistance
            ?
            parseFloat(
                majorResistance.price
            )
            :
            null,

            majorResistanceVolume:
            majorResistance
            ?
            parseFloat(
                majorResistance.volume
            )
            :
            null,

            buyVolume,
            sellVolume

        };

    }catch(err){

        return null;

    }

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

        if(!btc || !grt){

            return;

        }

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

            const emoji =
            getPriceEmoji(
                percent
            );

            if(
                Math.abs(percent) < 0.01
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

        }

        else{

            btcMessage =

`➖ BTC
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

            const emoji =
            getPriceEmoji(
                percent
            );

            if(
                Math.abs(percent) < 0.01
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

        }

        else{

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

${grtMessage}`

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// MARKET STRUCTURE ALERT
// =====================================

async function sendMarketStructure(){

    try{

        const btc =
        await getMarketStructure(
            "BTC"
        );

        const grt =
        await getMarketStructure(
            "GRT"
        );

        const btcPrice =
        await getLivePrice(
            "BTC"
        );

        const grtPrice =
        await getLivePrice(
            "GRT"
        );

        if(
            !btc ||
            !grt
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

${btc.majorSupport
?
`🧱 Major Support
RM${formatPrice(
"BTC",
btc.majorSupport
)} (${btc.majorSupportVolume.toFixed(2)} BTC)`
:
""
}

🔴 Resistance
RM${formatPrice(
"BTC",
btc.resistance
)} (${btc.resistanceVolume.toFixed(2)} BTC)

${btc.majorResistance
?
`🧱 Major Resistance
RM${formatPrice(
"BTC",
btc.majorResistance
)} (${btc.majorResistanceVolume.toFixed(2)} BTC)`
:
""
}

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

${grt.majorSupport
?
`🧱 Major Support
RM${formatPrice(
"GRT",
grt.majorSupport
)} (${grt.majorSupportVolume.toFixed(0)} GRT)`
:
""
}

🔴 Resistance
RM${formatPrice(
"GRT",
grt.resistance
)} (${grt.resistanceVolume.toFixed(0)} GRT)

${grt.majorResistance
?
`🧱 Major Resistance
RM${formatPrice(
"GRT",
grt.majorResistance
)} (${grt.majorResistanceVolume.toFixed(0)} GRT)`
:
""
}`

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// ENTRY UPDATE
// =====================================

async function sendEntryUpdate(){

    try{

        let found =
        false;

        let message = "";

        for(const coin of Object.keys(COINS)){

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

            if(
                pressure > 2
            ){

                found = true;

                const setup =
                Math.min(

                    95,

                    Math.floor(
                        pressure * 30
                    )

                );

                message +=

`🎯 HIGH ENTRY

🟢 ${coin}

RM${formatPrice(
coin,
price
)}

🟢 Support
RM${formatPrice(
coin,
structure.support
)} (${structure.supportVolume.toFixed(0)} ${coin})

🔴 Resistance
RM${formatPrice(
coin,
structure.resistance
)} (${structure.resistanceVolume.toFixed(0)} ${coin})

💵 Minimum Entry
RM65

🪙 Minimum Coin
126 ${coin}

⚡ ${setup}% Setup`;

                await sendTelegram(

message,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ CONFIRM ENTRY",

callback_data:
`confirm_${coin}_${price}_${structure.support}`
}
]

]

}

}

                );

                break;

            }

        }

        if(!found){

            await sendTelegram(

`⏳ ENTRY UPDATE

No Best Entry Now`

            );

        }

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// TEST COMMANDS
// =====================================

async function sendTestSell(){

    await sendTelegram(

`🚀 SELL NOW

🟢 XLM

🎯 Profit Target Hit

🪙 Net Sell Amount
993.50 XLM

💰 Value After Sales
RM522.10

💸 Anggaran Profit
RM10.86

📈 Current Price
RM0.5230`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE SELL",

callback_data:
"done_sell"
}
]

]

}

}

    );

}

async function sendTestExtend(){

    await sendTelegram(

`🚀 PROFIT EXTENDED SELL NOW

🟢 XLM

🔥 Profit melebihi target asal

💸 Current Profit
RM15.20

📈 Current Price
RM0.5280`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE SELL",

callback_data:
"done_sell"
}
]

]

}

}

    );

}

async function sendTestCutloss(){

    await sendTelegram(

`🛑 CUT LOSS NOW

🔴 XLM

⚠️ Stop Loss Hit

🪙 Net Sell Amount
993.50 XLM

💰 Value After Sales
RM501.10

📉 Anggaran Loss
-RM8.14

📈 Current Price
RM0.4980`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE CUTLOSS",

callback_data:
"done_cutloss"
}
]

]

}

}

    );

}

async function sendTestOff(){

    await sendTelegram(

`⚠️ TRADE MONITOR OFF

🟡 XLM

⏰ Tiada pengesahan DONE SELL dalam 15 minit

📴 Live monitoring dihentikan`

    );

}

// =====================================
// MONITOR ACTIVE TRADES
// =====================================

async function monitorTrades(){

    try{

        for(const userId in ACTIVE_TRADES){

            const trade =
            ACTIVE_TRADES[userId];

            const livePrice =
            await getLivePrice(
                trade.coin
            );

            if(!livePrice){

                continue;

            }

            const sellValue =
            trade.netSellAmount *
            livePrice;

            const profit =
            sellValue -
            trade.netBuyValue;

            // =====================================
            // SELL NOW
            // =====================================

            if(

                !trade.tpTriggered

                &&

                profit >=
                trade.targetProfit

            ){

                trade.tpTriggered =
                true;

                trade.tpTime =
                Date.now();

                await sendTelegram(

`🚀 SELL NOW

🟢 ${trade.coin}

🎯 Profit Target Hit

🪙 Net Sell Amount
${trade.netSellAmount.toFixed(2)} ${trade.coin}

💰 Value After Sales
RM${sellValue.toFixed(2)}

💸 Anggaran Profit
RM${profit.toFixed(2)}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE SELL",

callback_data:
`done_sell_${userId}`
}
]

]

}

}

                );

            }

            // =====================================
            // PROFIT EXTENDED
            // =====================================

            if(

                trade.tpTriggered

                &&

                !trade.extendedTriggered

                &&

                profit >=
                trade.targetProfit * 1.3

            ){

                trade.extendedTriggered =
                true;

                trade.extendTime =
                Date.now();

                await sendTelegram(

`🚀 PROFIT EXTENDED SELL NOW

🟢 ${trade.coin}

🔥 Profit melebihi target asal

💸 Current Profit
RM${profit.toFixed(2)}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE SELL",

callback_data:
`done_sell_${userId}`
}
]

]

}

}

                );

            }

            // =====================================
            // AUTO MONITOR OFF
            // =====================================

            if(

                trade.extendedTriggered

                &&

                Date.now() -
                trade.extendTime >

                900000

            ){

                await sendTelegram(

`⚠️ TRADE MONITOR OFF

🟡 ${trade.coin}

⏰ Tiada pengesahan DONE SELL dalam 15 minit

📴 Live monitoring dihentikan`

                );

                delete ACTIVE_TRADES[
                    userId
                ];

                continue;

            }

            // =====================================
            // CUTLOSS
            // =====================================

            if(
                livePrice <=
                trade.sl
            ){

                if(
                    !trade.cutlossTriggered
                ){

                    trade.cutlossTriggered =
                    true;

                    trade.cutlossTime =
                    Date.now();

                    await sendTelegram(

`🛑 CUT LOSS NOW

🔴 ${trade.coin}

⚠️ Stop Loss Hit

🪙 Net Sell Amount
${trade.netSellAmount.toFixed(2)} ${trade.coin}

💰 Value After Sales
RM${sellValue.toFixed(2)}

📉 Anggaran Loss
RM${profit.toFixed(2)}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ DONE CUTLOSS",

callback_data:
`done_cutloss_${userId}`
}
]

]

}

}

                    );

                }

                // =====================================
                // CUTLOSS AUTO OFF
                // =====================================

                if(

                    trade.cutlossTriggered

                    &&

                    Date.now() -
                    trade.cutlossTime >

                    300000

                ){

                    await sendTelegram(

`⚠️ TRADE MONITOR OFF

🔴 ${trade.coin}

⏰ Tiada pengesahan DONE CUTLOSS dalam 5 minit

📴 Live monitoring dihentikan`

                    );

                    delete ACTIVE_TRADES[
                        userId
                    ];

                }

            }

        }

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// TELEGRAM HANDLER
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

            // =====================================
            // CALLBACK BUTTON
            // =====================================

            if(
                update.callback_query
            ){

                const callback =
                update.callback_query;

                const data =
                callback.data;

                const userId =
                callback.from.id;

                // =====================================
                // CONFIRM ENTRY
                // =====================================

                if(
                    data.startsWith(
                        "confirm_"
                    )
                ){

                    const split =
                    data.split("_");

                    USER_ENTRY_FLOW[
                        userId
                    ] = {

                        step:
                        "WAIT_UNIT",

                        coin:
                        split[1],

                        entry:
                        Number(split[2]),

                        support:
                        Number(split[3])

                    };

                    await sendTelegram(

`🪙 Masukkan jumlah unit`

                    );

                }

                // =====================================
                // DONE SELL
                // =====================================

                if(
                    data.startsWith(
                        "done_sell"
                    )
                ){

                    await sendTelegram(

`✅ Trade Closed

🟢 Monitoring stopped`

                    );

                    delete ACTIVE_TRADES[
                        userId
                    ];

                }

                // =====================================
                // DONE CUTLOSS
                // =====================================

                if(
                    data.startsWith(
                        "done_cutloss"
                    )
                ){

                    await sendTelegram(

`✅ Trade Closed

🔴 Monitoring stopped`

                    );

                    delete ACTIVE_TRADES[
                        userId
                    ];

                }

            }

            // =====================================
            // MESSAGE
            // =====================================

            if(
                !update.message ||
                !update.message.text
            ){

                continue;

            }

            const text =
            update.message.text;

            const lower =
            text.toLowerCase();

            const userId =
            update.message.from.id;

            // =====================================
            // WAIT UNIT
            // =====================================

            if(

                USER_ENTRY_FLOW[userId]

                &&

                USER_ENTRY_FLOW[userId]
                .step === "WAIT_UNIT"

            ){

                USER_ENTRY_FLOW[
                    userId
                ].unit = Number(text);

                USER_ENTRY_FLOW[
                    userId
                ].step = "WAIT_PROFIT";

                await sendTelegram(

`💸 Nak profit berapa RM?`

                );

                continue;

            }

            // =====================================
            // WAIT PROFIT
            // =====================================

            if(

                USER_ENTRY_FLOW[userId]

                &&

                USER_ENTRY_FLOW[userId]
                .step === "WAIT_PROFIT"

            ){

                const flow =
                USER_ENTRY_FLOW[userId];

                const coin =
                flow.coin;

                const unit =
                flow.unit;

                const entry =
                flow.entry;

                const support =
                flow.support;

                const targetProfit =
                Number(text);

                const netBuy =
                unit * 0.994;

                const netBuyValue =
                netBuy * entry;

                const tpPrice =
                (
                    netBuyValue +
                    targetProfit
                ) / netBuy;

                const sl =
                support * 0.995;

                const netSellAmount =
                netBuy - 0.5;

                ACTIVE_TRADES[
                    userId
                ] = {

                    coin,

                    entry,

                    support,

                    sl,

                    targetProfit,

                    netBuy,

                    netBuyValue,

                    netSellAmount,

                    tpPrice,

                    tpTriggered:
                    false,

                    extendedTriggered:
                    false,

                    cutlossTriggered:
                    false

                };

                await sendTelegram(

`✅ ENTRY CONFIRMED

🟢 ${coin}

🪙 Unit Buy
${unit} ${coin}

🪙 Net Buy
${netBuy.toFixed(2)} ${coin}

💰 Net Buy Value
RM${netBuyValue.toFixed(2)}

🟢 Support
RM${formatPrice(
coin,
support
)}

💸 Target Profit
RM${targetProfit}

📈 Anggaran TP
RM${formatPrice(
coin,
tpPrice
)}

🛑 SL
RM${formatPrice(
coin,
sl
)}

👀 Live monitoring activated`

                );

                delete USER_ENTRY_FLOW[
                    userId
                ];

                continue;

            }

            // =====================================
            // COMMANDS
            // =====================================

            if(
                lower === "/price"
            ){

                await autoPriceUpdate();

            }

            else if(
                lower === "/market"
            ){

                await sendMarketStructure();

            }

            else if(
                lower === "/entry"
            ){

                await sendEntryUpdate();

            }

            else if(
                lower === "/testentry"
            ){

                await sendEntryUpdate();

            }

            else if(
                lower === "/testsell"
            ){

                await sendTestSell();

            }

            else if(
                lower === "/testextend"
            ){

                await sendTestExtend();

            }

            else if(
                lower === "/testcutloss"
            ){

                await sendTestCutloss();

            }

            else if(
                lower === "/testoff"
            ){

                await sendTestOff();

            }

            else if(
                lower === "/status"
            ){

                await sendTelegram(

`🤖 BOT ONLINE`

                );

            }

        }

    }catch(err){

        console.log(
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
        "BOT ACTIVE",

        instance:
        INSTANCE

    });

});

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
        "SYSTEM STARTED"
    );

    await setTelegramCommands();

    // =====================================
    // AUTO START ALERT
    // =====================================

    await autoPriceUpdate();

    await sendMarketStructure();

    await sendEntryUpdate();

    // =====================================
    // TELEGRAM LOOP
    // =====================================

    setInterval(

        checkTelegramCommands,

        3000

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

        sendMarketStructure,

        900000

    );

    // =====================================
    // ENTRY UPDATE
    // =====================================

    setInterval(

        sendEntryUpdate,

        1200000

    );

    // =====================================
    // LIVE MONITOR
    // =====================================

    setInterval(

        monitorTrades,

        10000

    );

}, 5000);