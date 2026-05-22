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
// RANDOM INSTANCE CODE
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
    GRT:"GRTMYR",

    XRP:"XRPMYR",
    XLM:"XLMMYR",

    AAVE:"AAVEMYR",
    CRV:"CRVMYR"

};

// =====================================
// MEMORY
// =====================================

const LAST_PRICE = {};

const LAST_BREAKOUT = {};

const LAST_BREAKDOWN = {};

// =====================================
// REQUEST LOCK
// =====================================

let FETCHING_PRICE = false;

// =====================================
// HELPERS
// =====================================

function formatPrice(
    coin,
    value
){

    if(
        !value
    ){
        return "0";
    }

    if(

        coin === "BTC" ||
        coin === "AAVE" ||
        coin === "XRP"

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

// =====================================
// SEND TELEGRAM
// =====================================

async function sendTelegram(
    message
){

    try{



        await bot.sendMessage(

            CHAT_ID,

`${SERVER_CODE} 

${message}`

        );

        console.log(
            "✅ TELEGRAM SENT"
        );

    }catch(err){

        console.log(
            "❌ TELEGRAM ERROR",
            err.message
        );

    }

}

// =====================================
// GET LIVE PRICE
// =====================================

async function getLivePrice(
    coin
){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${pair}`,

            {
                timeout:5000
            }

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

async function getOrderbook(
    coin
){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(

            `https://api.luno.com/api/1/orderbook?pair=${pair}`,

            {
                timeout:5000
            }

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
// GET MARKET STRUCTURE
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

        // =====================================
        // SUPPORT
        // =====================================

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

        // =====================================
        // RESISTANCE
        // =====================================

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

        // =====================================
        // SUPPORT
        // =====================================

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

        // =====================================
        // RESISTANCE
        // =====================================

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
            "MARKET STRUCTURE ERROR",
            err.message
        );

        return null;

    }

}

// =====================================
// AUTO PRICE UPDATE
// =====================================

async function autoPriceUpdate(){

    if(
        FETCHING_PRICE
    ){

        return;

    }

    FETCHING_PRICE =
    true;

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

        let btcMessage = "";
        let grtMessage = "";

        // =====================================
        // BTC
        // =====================================

        if(
            LAST_PRICE.BTC
        ){

            const old =
            LAST_PRICE.BTC;

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

        // =====================================
        // GRT
        // =====================================

        if(
            LAST_PRICE.GRT
        ){

            const old =
            LAST_PRICE.GRT;

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
            "PRICE UPDATE ERROR",
            err.message
        );

    }finally{

        FETCHING_PRICE =
        false;

    }

}

// =====================================
// MARKET STRUCTURE ALERT
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

${getMarketComment(
btc.buyVolume,
btc.sellVolume
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

${getMarketComment(
grt.buyVolume,
grt.sellVolume
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
            "MARKET ERROR",
            err.message
        );

    }

}

// =====================================
// BREAKOUT SCAN
// =====================================

async function scanBreakout(){

    try{

        for(
            const coin of
            ["BTC","GRT"]
        ){

            const structure =
            await getMarketStructure(
                coin
            );

            if(
                !structure
            ){

                continue;

            }

            const price =
            structure.currentPrice;

            // =====================================
            // BREAKOUT
            // =====================================

            if(
                price >
                structure.resistance
            ){

                if(
                    LAST_BREAKOUT[
                        coin
                    ]
                ){

                    continue;

                }

                LAST_BREAKOUT[
                    coin
                ] = true;

                await sendTelegram(

`🚀 BREAKOUT

🟢 ${coin}

RM${formatPrice(
coin,
price
)}

🔥 Resistance Break
RM${formatPrice(
coin,
structure.resistance
)}`

                );

            }else{

                LAST_BREAKOUT[
                    coin
                ] = false;

            }

            // =====================================
            // BREAKDOWN
            // =====================================

            if(
                price <
                structure.support
            ){

                if(
                    LAST_BREAKDOWN[
                        coin
                    ]
                ){

                    continue;

                }

                LAST_BREAKDOWN[
                    coin
                ] = true;

                await sendTelegram(

`🔴 BREAKDOWN

🔴 ${coin}

RM${formatPrice(
coin,
price
)}

⚠️ Support Break
RM${formatPrice(
coin,
structure.support
)}`

                );

            }else{

                LAST_BREAKDOWN[
                    coin
                ] = false;

            }

        }

    }catch(err){

        console.log(
            "SCAN ERROR",
            err.message
        );

    }

}

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

    console.log(
        "🚀 SYSTEM STARTED"
    );

    await sendTelegram(

`✅ BOT ONLINE

🚀 SMART TERMINAL ACTIVE`

    );

    // =====================================
    // FIRST RUN
    // =====================================

    // =====================================
    // FAST PRICE REFRESH
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
    // BREAKOUT SCAN
    // =====================================

    setInterval(

        scanBreakout,

        30000

    );

},5000);
