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
// TELEGRAM ENV
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
// INSTANCE
// =====================================

const INSTANCE =
Math.random().toString(36).substring(7);

console.log(
    "INSTANCE:",
    INSTANCE
);

// =====================================
// COINS
// =====================================

const COINS = {

    BTC: "XBTMYR",
    XRP: "XRPMYR",
    XLM: "XLMMYR",
    GRT: "GRTMYR",
    AAVE: "AAVEMYR",
    CRV: "CRVMYR"

};

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

    if(coin === "BTC"){

        return price.toFixed(2);

    }

    if(
        coin === "XLM" ||
        coin === "CRV"
    ){

        return price.toFixed(3);

    }

    return price.toFixed(4);

}

// =====================================
// SEND TELEGRAM
// =====================================

async function sendTelegram(message){

    try{

        await axios.post(

            `${TELEGRAM_API}/sendMessage`,

            {

                chat_id: CHAT_ID,

                text:
                `[${INSTANCE}]\n\n${message}`

            }

        );

        console.log(
            "✅ TELEGRAM SENT"
        );

    }catch(err){

        console.log(
            "❌ TELEGRAM FAILED"
        );

    }

}

// =====================================
// SET COMMANDS
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
                        "Live crypto prices"
                    },

                    {
                        command: "market",
                        description:
                        "Market structure"
                    },

                    {
                        command: "entry",
                        description:
                        "Possible entry"
                    },

                    {
                        command: "scanner",
                        description:
                        "Scanner status"
                    },

                    {
                        command: "list",
                        description:
                        "Command list"
                    }

                ]

            }

        );

        console.log(
            "✅ COMMANDS UPDATED"
        );

    }catch(err){

        console.log(
            "❌ COMMAND UPDATE FAILED"
        );

    }

}

// =====================================
// HOMEPAGE
// =====================================

app.get("/", (req,res)=>{

    res.json({

        status:
        "SMART SCANNER ACTIVE",

        instance:
        INSTANCE

    });

});

// =====================================
// LIVE PRICE API
// =====================================

app.get('/price/:pair', async (req,res)=>{

    try{

        const pair =
        req.params.pair.toUpperCase();

        const lunoPair =
        COINS[pair];

        if(!lunoPair){

            return res.status(404).json({

                error:
                "PAIR NOT FOUND"

            });

        }

        const response =
        await axios.get(

            `https://api.luno.com/api/1/ticker?pair=${lunoPair}`

        );

        const price =
        parseFloat(
            response.data.last_trade
        );

        res.json({

            pair,
            price

        });

    }catch(err){

        console.log(err);

        res.status(500).json({

            error:
            "FAILED"

        });

    }

});

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

    }catch{

        return null;

    }

}

// =====================================
// MARKET STRUCTURE
// =====================================

async function getMarketStructure(coin){

    try{

        const pair =
        COINS[coin];

        const response =
        await axios.get(

            `https://api.luno.com/api/1/orderbook?pair=${pair}`

        );

        const bids =
        response.data.bids;

        const asks =
        response.data.asks;

        const buyVolume =
        bids.reduce((sum,b)=>

            sum + parseFloat(b.volume)

        ,0);

        const sellVolume =
        asks.reduce((sum,a)=>

            sum + parseFloat(a.volume)

        ,0);

        if(buyVolume > sellVolume){

            return "BULLISH";

        }

        if(sellVolume > buyVolume){

            return "BEARISH";

        }

        return "SIDEWAYS";

    }catch{

        return "UNKNOWN";

    }

}

// =====================================
// PRICE COMMAND
// =====================================

async function sendPriceCommand(){

    try{

        let message =
`📊 LIVE PRICE

`;

        for(const coin in COINS){

            const price =
            await getLivePrice(coin);

            if(!price){

                continue;

            }

            message +=

`${coin}
RM${formatPrice(
coin,
price
)}

`;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "PRICE COMMAND FAILED"
        );

    }

}

// =====================================
// MARKET COMMAND
// =====================================

async function sendMarketCommand(){

    try{

        let message =
`📈 MARKET STRUCTURE

`;

        for(const coin in COINS){

            const trend =
            await getMarketStructure(coin);

            const price =
            await getLivePrice(coin);

            let icon = "⚪";

            if(trend === "BULLISH"){

                icon = "🟢";

            }

            if(trend === "BEARISH"){

                icon = "🔴";

            }

            message +=

`${icon} ${coin}

Trend:
${trend}

Price:
RM${formatPrice(
coin,
price
)}

`;

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "MARKET COMMAND FAILED"
        );

    }

}

// =====================================
// ENTRY COMMAND
// =====================================

async function sendEntryCommand(){

    try{

        let found = false;

        let message =
`🎯 POSSIBLE ENTRY

`;

        for(const coin in COINS){

            const trend =
            await getMarketStructure(coin);

            const price =
            await getLivePrice(coin);

            if(
                trend === "BULLISH"
            ){

                found = true;

                const tp =
                price * 1.02;

                const sl =
                price * 0.98;

                message +=

`🚀 ${coin}

Entry:
RM${formatPrice(
coin,
price
)}

TP:
RM${formatPrice(
coin,
tp
)}

SL:
RM${formatPrice(
coin,
sl
)}

`;

            }

        }

        if(!found){

            message +=
            "❌ NO ENTRY FOUND";

        }

        await sendTelegram(message);

    }catch(err){

        console.log(
            "ENTRY COMMAND FAILED"
        );

    }

}

// =====================================
// SCANNER STATUS
// =====================================

async function sendScannerStatus(){

    await sendTelegram(

`🤖 SCANNER STATUS

✅ ACTIVE
✅ LIVE MONITORING
✅ API CONNECTED
✅ TELEGRAM CONNECTED`

    );

}

// =====================================
// COMMAND LIST
// =====================================

async function sendCommandList(){

    await sendTelegram(

`📋 COMMAND LIST

/price
/market
/entry
/scanner
/list`

    );

}

// =====================================
// TELEGRAM COMMAND HANDLER
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

            if(
                !update.message ||
                !update.message.text
            ){

                continue;

            }

            const text =
            update.message.text
            .toLowerCase();

            console.log(
                "COMMAND:",
                text
            );

            // =====================================
            // PRICE
            // =====================================

            if(text === "/price"){

                await sendPriceCommand();

            }

            // =====================================
            // MARKET
            // =====================================

            else if(text === "/market"){

                await sendMarketCommand();

            }

            // =====================================
            // ENTRY
            // =====================================

            else if(text === "/entry"){

                await sendEntryCommand();

            }

            // =====================================
            // SCANNER
            // =====================================

            else if(text === "/scanner"){

                await sendScannerStatus();

            }

            // =====================================
            // LIST
            // =====================================

            else if(text === "/list"){

                await sendCommandList();

            }

        }

    }catch(err){

        console.log(
            "COMMAND ERROR",
            err.message
        );

    }

}

// =====================================
// START SERVER
// =====================================

app.listen(PORT, ()=>{

    console.log(
        "SERVER RUNNING ON PORT",
        PORT
    );

});

// =====================================
// START SYSTEM
// =====================================

setTimeout(async ()=>{

    console.log(
        "🚀 SYSTEM STARTED"
    );

    await setTelegramCommands();

    setInterval(

        checkTelegramCommands,

        5000

    );

}, 5000);