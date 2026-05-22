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

        polling: {

            interval: 300,

            autoStart: true,

            params: {

                timeout: 10

            }

        }

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
            "TELEGRAM ERROR:",
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

`https://api.luno.com/api/1/ticker?pair=${pair}`,

            {
                timeout: 10000
            }

        );

        return parseFloat(
            response.data.last_trade
        );

    }catch(err){

        console.log(
            "LUNO API ERROR:",
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

`https://api.luno.com/api/1/orderbook?pair=${pair}`,

            {
                timeout: 10000
            }

        );

        return response.data;

    }catch(err){

        console.log(
            "ORDERBOOK ERROR:",
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
            "MARKET STRUCTURE ERROR:",
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

        console.log(
            "RUNNING PRICE ALERT..."
        );

        const btc =
        await getLivePrice(
            "BTC"
        );

        const grt =
        await getLivePrice(
            "GRT"
        );

        if(!btc || !grt){

            console.log(
                "PRICE FETCH FAILED"
            );

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

`📡 PRICE ALERT

${btcMessage}

${grtMessage}`

        );

        console.log(
            "PRICE ALERT SENT"
        );

    }catch(err){

        console.log(
            "PRICE ALERT ERROR:",
            err.message
        );

    }

}

// =====================================
// MARKET STRUCTURE
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
// TEST COMMAND
// =====================================

bot.onText(

/\/test/,

async ()=>{

    await sendTelegram(
        "✅ TEST MESSAGE"
    );

}

);

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

    await sendTelegram(
        "✅ BOT ONLINE"
    );

    await autoPriceUpdate();

    await sendMarketStructure();

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

}, 5000);