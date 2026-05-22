// =====================================
// IMPORTS
// =====================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

const PORT =
process.env.PORT || 3000;

// =====================================
// ENV
// =====================================

const BOT_TOKEN =
process.env.BOT_TOKEN;

const CHAT_ID =
process.env.CHAT_ID;

// =====================================
// FEES
// =====================================

const BUY_FEE = 0.005;
const SELL_FEE = 0.005;

// =====================================
// SERVER CODE
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

if(
    !BOT_TOKEN ||
    !CHAT_ID
){

    console.log(
        "TOKEN / CHAT_ID MISSING"
    );

    process.exit(1);

}

const bot =
new TelegramBot(
    BOT_TOKEN,
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
// MEMORY
// =====================================

const LAST_PRICE = {};

const LAST_EVENT = {};

const USER_STATE = {};

const ACTIVE_TRADES = {};

// =====================================
// HELPERS
// =====================================

function formatPrice(
    coin,
    value
){

    if(!value){
        return "0";
    }

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

function formatPercent(percent){

    if(percent > 0){

        return `+${percent.toFixed(2)}%`;

    }

    return `${percent.toFixed(2)}%`;

}

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

function cooldownPassed(
    key,
    cooldown
){

    if(
        !LAST_EVENT[key]
    ){

        return true;

    }

    return (

        Date.now() -
        LAST_EVENT[key]

    ) > cooldown;

}

function setCooldown(key){

    LAST_EVENT[key] =
    Date.now();

}

// =====================================
// SEND TELEGRAM
// =====================================

async function sendTelegram(
    message,
    options = {}
){

    try{

        await bot.sendMessage(

            CHAT_ID,

`${SERVER_CODE}

${message}`,

            options

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// LIVE PRICE
// =====================================

async function getLivePrice(
    coin
){

    try{

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${COINS[coin]}`

        );

        return parseFloat(
            response.data.last_trade
        );

    }catch(err){

        return null;

    }

}

// =====================================
// ORDERBOOK
// =====================================

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
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(
    coin
){

    try{

        const [
            currentPrice,
            orderbook
        ] = await Promise.all([

            getLivePrice(coin),

            getOrderbook(coin)

        ]);

        if(
            !currentPrice ||
            !orderbook
        ){

            return null;

        }

        const supports =
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

        const resistances =
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
            supports.length === 0 ||
            resistances.length === 0
        ){

            return null;

        }

        let support =
        supports[0];

        for(
            const s of supports
        ){

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

        for(
            const r of resistances
        ){

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

        const bestAsk =
        parseFloat(
            orderbook.asks[0].price
        );

        const bestBid =
        parseFloat(
            orderbook.bids[0].price
        );

        const spread =
        bestAsk - bestBid;

        const spreadPercent =
        spread / currentPrice;

        return {

            currentPrice,

            bestAsk,
            bestBid,

            spreadPercent,

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

        return null;

    }

}

// =====================================
// AUTO PRICE ALERT
// =====================================

async function autoPriceUpdate(){

    try{

        const [
            btc,
            grt
        ] = await Promise.all([

            getLivePrice("BTC"),

            getLivePrice("GRT")

        ]);

        if(
            !btc ||
            !grt
        ){

            return;

        }

        if(

            LAST_PRICE.BTC === btc

            &&

            LAST_PRICE.GRT === grt

        ){

            return;

        }

        let btcMessage = "";
        let grtMessage = "";

        // BTC

        if(
            LAST_PRICE.BTC
        ){

            const percent =
            (
                (
                    btc -
                    LAST_PRICE.BTC
                ) /
                LAST_PRICE.BTC
            ) * 100;

            btcMessage =

`${getPriceEmoji(percent)} BTC
RM${formatPrice(
"BTC",
btc
)} (${formatPercent(
percent
)})`;

        }else{

            btcMessage =

`➖ BTC
RM${formatPrice(
"BTC",
btc
)}`;

        }

        // GRT

        if(
            LAST_PRICE.GRT
        ){

            const percent =
            (
                (
                    grt -
                    LAST_PRICE.GRT
                ) /
                LAST_PRICE.GRT
            ) * 100;

            grtMessage =

`${getPriceEmoji(percent)} GRT
RM${formatPrice(
"GRT",
grt
)} (${formatPercent(
percent
)})`;

        }else{

            grtMessage =

`➖ GRT
RM${formatPrice(
"GRT",
grt
)}`;

        }

        LAST_PRICE.BTC =
        btc;

        LAST_PRICE.GRT =
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
// MARKET STRUCTURE
// =====================================

async function sendMarketCommand(){

    try{

        const [
            btc,
            grt
        ] = await Promise.all([

            getMarketStructure("BTC"),

            getMarketStructure("GRT")

        ]);

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
btc.currentPrice
)}

🟢 Support
RM${formatPrice(
"BTC",
btc.support
)}

🔴 Resistance
RM${formatPrice(
"BTC",
btc.resistance
)}

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
)}

🔴 Resistance
RM${formatPrice(
"GRT",
grt.resistance
)}`

        );

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// SCALPING ENTRY
// =====================================

async function scanScalpingEntry(){

    try{

        const structure =
        await getMarketStructure(
            "GRT"
        );

        if(
            !structure
        ){

            return;

        }

        const {

            currentPrice,
            resistance,
            support,
            buyVolume,
            sellVolume,
            supportVolume,
            resistanceVolume,
            bestAsk

        } = structure;

        const buyerPressure =

            buyVolume >
            sellVolume * 1.8;

        const nearBreakout =

            (
                resistance -
                currentPrice
            ) <
            currentPrice * 0.003;

        const strongSupport =

            supportVolume >
            resistanceVolume;

        const healthySpread =

            structure.spreadPercent <
            0.002;

        if(

            buyerPressure &&
            nearBreakout &&
            strongSupport &&
            healthySpread

        ){

            if(
                !cooldownPassed(
                    "SCALP_GRT",
                    900000
                )
            ){

                return;

            }

            setCooldown(
                "SCALP_GRT"
            );

            const tp =
            currentPrice * 1.007;

            const sl =
            support * 0.997;

            await sendTelegram(

`⚡ SCALPING ENTRY

🟢 GRT

📌 Entry Signal:
RM${formatPrice(
"GRT",
currentPrice
)}

⚠️ Best Ask:
RM${formatPrice(
"GRT",
bestAsk
)}

📈 TP:
RM${formatPrice(
"GRT",
tp
)}

🛑 SL:
RM${formatPrice(
"GRT",
sl
)}

🔥 Momentum Breakout Incoming`,

                {

reply_markup:{

inline_keyboard:[

[
{
text:"✅ START ENTRY",
callback_data:"START_SCALP_GRT"
}
]

]

}

}

            );

        }

    }catch(err){

        console.log(
            err.message
        );

    }

}

// =====================================
// CALLBACK
// =====================================

bot.on(
    "callback_query",
    async query=>{

        const data =
        query.data;

        const chatId =
        query.message.chat.id;

        if(
            data ===
            "START_SCALP_GRT"
        ){

            USER_STATE[
                chatId
            ] = {

                mode:"WAIT_TARGET"

            };

            await bot.sendMessage(

                chatId,

"💸 PROFIT TARGET RM?"

            );

        }

    }
);

// =====================================
// USER INPUT
// =====================================

bot.on(
    "message",
    async msg=>{

        const chatId =
        msg.chat.id;

        if(
            !USER_STATE[
                chatId
            ]
        ){

            return;

        }

        const state =
        USER_STATE[
            chatId
        ];

        if(
            state.mode ===
            "WAIT_TARGET"
        ){

            const targetProfit =
            parseFloat(
                msg.text
            );

            const structure =
            await getMarketStructure(
                "GRT"
            );

            if(
                !structure
            ){

                return;

            }

            const entry =
            structure.bestAsk;

            const tp =
            structure.currentPrice * 1.007;

            const sl =
            structure.support * 0.997;

            const expectedProfitPerUnit =
            tp - entry;

            const quantity =
            targetProfit /
            expectedProfitPerUnit;

            const buyValue =
            quantity * entry;

            USER_STATE[
                chatId
            ] = {

                mode:"WAIT_CONFIRM",

                quantity,
                buyValue,
                tp,
                sl,
                entry

            };

            await bot.sendMessage(

                chatId,

`🪙 Suggested Quantity

${quantity.toFixed(0)} GRT

💰 Estimated Buy Value
RM${buyValue.toFixed(2)}

📈 TP
RM${tp.toFixed(4)}

🛑 SL
RM${sl.toFixed(4)}`,

                {

reply_markup:{

inline_keyboard:[

[
{
text:"✅ CONFIRM ENTRY",
callback_data:"CONFIRM_ENTRY"
},
{
text:"❌ CANCEL",
callback_data:"CANCEL_ENTRY"
}
]

]

}

}

            );

        }

    }
);

// =====================================
// EXPRESS
// =====================================

app.get("/",(req,res)=>{

    res.json({

        status:
        "SMART BOT ACTIVE",

        server:
        SERVER_CODE

    });

});

// =====================================
// SERVER
// =====================================

app.listen(PORT,()=>{

    console.log(
        `SERVER RUNNING ${PORT}`
    );

});

// =====================================
// STARTUP
// =====================================

setTimeout(async ()=>{

    await sendTelegram(

`✅ BOT ONLINE

🚀 SMART TERMINAL ACTIVE`

    );

    // PRICE ALERT
    setInterval(

        autoPriceUpdate,

        300000

    );

    // MARKET STRUCTURE
    setInterval(

        sendMarketCommand,

        900000

    );

    // SCALPING ENTRY
    setInterval(

        scanScalpingEntry,

        30000

    );

},5000);
