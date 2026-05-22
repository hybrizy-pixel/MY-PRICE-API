require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const PORT =
process.env.PORT || 3000;

const TELEGRAM_TOKEN =
process.env.TELEGRAM_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// TELEGRAM BOT
// =====================================

const bot =
new TelegramBot(

    TELEGRAM_TOKEN,

    {
        polling: true
    }

);

// =====================================
// INSTANCE CODE
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
        coin === "XRP" ||
        coin === "AAVE"
    ){

        return Number(price)
        .toFixed(2);

    }

    return Number(price)
    .toFixed(4);

}

// =====================================
// FORMAT VOLUME
// =====================================

function formatVolume(
    coin,
    volume
){

    if(coin === "BTC"){

        return `${Number(volume)
        .toFixed(4)} BTC`;

    }

    return `${Math.floor(
        Number(volume)
    ).toLocaleString()} ${coin}`;

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

        await bot.sendMessage(

            CHAT_ID,

`[${INSTANCE}]

${message}`,

            extra

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

        console.log(
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

        const data =
        await getOrderbook(
            coin
        );

        if(
            !data ||
            !data.bids ||
            !data.asks ||
            data.bids.length === 0 ||
            data.asks.length === 0
        ){

            return null;

        }

        const currentPrice =
        parseFloat(
            data.bids[0].price
        );

        const supports =
        data.bids.filter(b=>{

            const price =
            parseFloat(
                b.price
            );

            return (

                price <
                currentPrice

                &&

                price >
                currentPrice * 0.99

            );

        });

        const resistances =
        data.asks.filter(a=>{

            const price =
            parseFloat(
                a.price
            );

            return (

                price >
                currentPrice

                &&

                price <
                currentPrice * 1.01

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
                parseFloat(
                    s.volume
                ) >

                parseFloat(
                    support.volume
                )
            ){

                support = s;

            }

        }

        let resistance =
        resistances[0];

        for(const r of resistances){

            if(
                parseFloat(
                    r.volume
                ) >

                parseFloat(
                    resistance.volume
                )
            ){

                resistance = r;

            }

        }

        const buyVolume =
        data.bids.reduce(

            (sum,b)=>

            sum +
            parseFloat(
                b.volume
            )

        ,0);

        const sellVolume =
        data.asks.reduce(

            (sum,a)=>

            sum +
            parseFloat(
                a.volume
            )

        ,0);

        return {

            currentPrice,

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
            err.message
        );

        return null;

    }

}

// =====================================
// AUTO PRICE ALERT
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

            btcMessage =

`${emoji} BTC
RM${formatPrice(
"BTC",
old
)} → RM${formatPrice(
"BTC",
btc
)}`;

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

            grtMessage =

`${emoji} GRT
RM${formatPrice(
"GRT",
old
)} → RM${formatPrice(
"GRT",
grt
)}`;

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

        if(!btc || !grt){

            return;

        }

        await sendTelegram(

`📊 MARKET STRUCTURE

₿ BTC

RM${formatPrice(
"BTC",
btc.currentPrice
)}

🟢 Support
RM${formatPrice(
"BTC",
btc.support
)} (${formatVolume(
"BTC",
btc.supportVolume
)})

🔴 Resistance
RM${formatPrice(
"BTC",
btc.resistance
)} (${formatVolume(
"BTC",
btc.resistanceVolume
)})

──────────────

🟢 GRT

RM${formatPrice(
"GRT",
grt.currentPrice
)}

🟢 Support
RM${formatPrice(
"GRT",
grt.support
)} (${formatVolume(
"GRT",
grt.supportVolume
)})

🔴 Resistance
RM${formatPrice(
"GRT",
grt.resistance
)} (${formatVolume(
"GRT",
grt.resistanceVolume
)})`

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// ENTRY DETECTION
// =====================================

async function sendEntryUpdate(){

    try{

        let found =
        false;

        for(const coin of Object.keys(COINS)){

            const structure =
            await getMarketStructure(
                coin
            );

            if(!structure){

                continue;

            }

            const pressure =

            structure.sellVolume > 0

            ?

            structure.buyVolume /
            structure.sellVolume

            :

            0;

            const resistanceDistance =
            (
                structure.resistance -
                structure.currentPrice
            ) / structure.currentPrice;

            // =====================================
            // NORMAL ENTRY
            // =====================================

            if(

                pressure > 1.15

                &&

                resistanceDistance < 0.005

            ){

                found = true;

                await sendTelegram(

`🚀 NORMAL ENTRY

🟢 ${coin}

RM${formatPrice(
coin,
structure.currentPrice
)}

🟢 Support
RM${formatPrice(
coin,
structure.support
)} (${formatVolume(
coin,
structure.supportVolume
)})

🔴 Resistance
RM${formatPrice(
coin,
structure.resistance
)} (${formatVolume(
coin,
structure.resistanceVolume
)})

📈 BUYER MULA MEMBELI

💵 Minimum Entry
RM65

⚡ 86% Setup`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ CONFIRM ENTRY",

callback_data:
`confirm_${coin}_${structure.currentPrice}_${structure.support}`
}
]

]

}

}

                );

                break;

            }

            // =====================================
            // SCALPING ENTRY
            // =====================================

            if(

                pressure > 0.9

                &&

                pressure < 1.15

            ){

                found = true;

                const scalpTarget =
                structure.currentPrice * 1.01;

                await sendTelegram(

`🔄 SCALPING ENTRY

🟢 ${coin}

RM${formatPrice(
coin,
structure.currentPrice
)}

🟢 Strong Support Bounce

📈 Scalping Target
RM${formatPrice(
coin,
scalpTarget
)}

⚡ Quick Scalp Setup

💵 Minimum Entry
RM65

⚡ 72% Setup`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ CONFIRM ENTRY",

callback_data:
`confirm_${coin}_${structure.currentPrice}_${structure.support}`
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
// TEST ENTRY
// =====================================

bot.onText(

/\/testentry/,

async ()=>{

    await sendTelegram(

`🚀 NORMAL ENTRY

🟢 XLM

RM0.5123

🟢 Support
RM0.5010

🔴 Resistance
RM0.5200`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ CONFIRM ENTRY",

callback_data:
"confirm_XLM_0.5123_0.5010"
}
]

]

}

}

    );

}

);

// =====================================
// TEST SCALP
// =====================================

bot.onText(

/\/testscalp/,

async ()=>{

    await sendTelegram(

`🔄 SCALPING ENTRY

🟢 GRT

RM0.1001

🟢 Strong Support Bounce

📈 Scalping Target
RM0.1012`,

{

reply_markup: {

inline_keyboard: [

[
{
text:
"✅ CONFIRM ENTRY",

callback_data:
"confirm_GRT_0.1001_0.0998"
}
]

]

}

}

    );

}

);

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

}

);

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
        !USER_ENTRY_FLOW[userId]
    ){

        return;

    }

    const flow =
    USER_ENTRY_FLOW[userId];

    // =====================================
    // WAIT UNIT
    // =====================================

    if(
        flow.step ===
        "WAIT_UNIT"
    ){

        flow.unit =
        Number(text);

        flow.step =
        "WAIT_PROFIT";

        await sendTelegram(

`💸 Nak profit berapa RM?`

        );

        return;

    }

    // =====================================
    // WAIT PROFIT
    // =====================================

    if(
        flow.step ===
        "WAIT_PROFIT"
    ){

        const targetProfit =
        Number(text);

        const netBuy =
        flow.unit * 0.994;

        const netBuyValue =
        netBuy * flow.entry;

        const tpPrice =
        (
            netBuyValue +
            targetProfit
        ) / netBuy;

        const sl =
        flow.support * 0.995;

        const netSellAmount =
        netBuy - 0.5;

        ACTIVE_TRADES[
            userId
        ] = {

            coin:
            flow.coin,

            tpPrice,

            sl,

            targetProfit,

            netBuy,

            netBuyValue,

            netSellAmount

        };

        await sendTelegram(

`✅ ENTRY CONFIRMED

🟢 ${flow.coin}

🪙 Unit Buy
${flow.unit} ${flow.coin}

🪙 Net Buy
${netBuy.toFixed(2)} ${flow.coin}

💰 Net Buy Value
RM${netBuyValue.toFixed(2)}

💸 Target Profit
RM${targetProfit}

📈 TP
RM${formatPrice(
flow.coin,
tpPrice
)}

🛑 SL
RM${formatPrice(
flow.coin,
sl
)}

👀 Live monitoring activated`

        );

        delete USER_ENTRY_FLOW[
            userId
        ];

    }

}

);

// =====================================
// MONITOR TRADES
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
                profit >=
                trade.targetProfit
            ){

                await sendTelegram(

`🚀 SELL NOW

🟢 ${trade.coin}

🪙 Net Sell Amount
${trade.netSellAmount.toFixed(2)} ${trade.coin}

💰 Value After Sales
RM${sellValue.toFixed(2)}

💸 Estimated Profit
RM${profit.toFixed(2)}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}`

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

                await sendTelegram(

`🛑 CUT LOSS NOW

🔴 ${trade.coin}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}`

                );

                delete ACTIVE_TRADES[
                    userId
                ];

            }

        }

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// ROUTE
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

    await autoPriceUpdate();

    await sendMarketStructure();

    await sendEntryUpdate();

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