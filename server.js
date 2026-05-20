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
// INSTANCE CODE
// =====================================

const INSTANCE =
Math.random()
.toString(36)
.substring(2,6)
.toUpperCase();

// =====================================
// TELEGRAM API
// =====================================

const TELEGRAM_API =
`https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

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

    // 2 DECIMAL

    if(

        coin === "BTC" ||
        coin === "AAVE" ||
        coin === "XRP"

    ){

        return Number(price)
        .toFixed(2);

    }

    // 4 DECIMAL

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
                        "BTC & GRT price"
                    },

                    {
                        command: "testentry",
                        description:
                        "Test entry flow"
                    },

                    {
                        command: "testtp",
                        description:
                        "Test TP alert"
                    },

                    {
                        command: "testsl",
                        description:
                        "Test SL alert"
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
            "COMMAND ERROR",
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
            "PRICE ERROR",
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

        }else{

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
            "AUTO PRICE ERROR",
            err.message
        );

    }

}

// =====================================
// TEST ENTRY
// =====================================

async function sendTestEntry(){

    await sendTelegram(

`🎯 HIGH ENTRY

🟢 XLM

RM0.5123

🟢 Support
RM0.5010 (120000 XLM)

🔴 Resistance
RM0.5200 (85000 XLM)

💵 Minimum Entry
RM65

🪙 Minimum Coin
126 XLM

⚡ 91% Setup`,

        {

            reply_markup: {

                inline_keyboard: [

                    [

                        {

                            text:
                            "✅ CONFIRM ENTRY",

                            callback_data:
                            "confirm_entry_XLM_0.5123_0.4980"

                        }

                    ]

                ]

            }

        }

    );

}

// =====================================
// TEST TP
// =====================================

async function sendTestTP(){

    await sendTelegram(

`🚀 SELL NOW

🟢 XLM

🎯 Target Profit Hit
RM10

🪙 Net Sell Amount
194.20 XLM

💸 Estimated Profit
RM10.02`

    );

}

// =====================================
// TEST SL
// =====================================

async function sendTestSL(){

    await sendTelegram(

`🛑 CUT LOSS NOW

🔴 XLM

⚠️ Stop Loss Hit
RM0.4980

🪙 Net Sell Amount
194.20 XLM

📉 Estimated Loss
-RM3.20`

    );

}

// =====================================
// LIVE TRADE MONITOR
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

            // =====================================
            // TP HIT
            // =====================================

            if(
                livePrice >= trade.tp
            ){

                await sendTelegram(

`🚀 SELL NOW

🟢 ${trade.coin}

🎯 Target Profit Hit
RM${trade.targetProfit}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}

🪙 Net Sell Amount
${trade.sellAmount.toFixed(2)} ${trade.coin}

💸 Estimated Profit
RM${trade.targetProfit}`

                );

                delete ACTIVE_TRADES[
                    userId
                ];

                continue;

            }

            // =====================================
            // SL HIT
            // =====================================

            if(
                livePrice <= trade.sl
            ){

                await sendTelegram(

`🛑 CUT LOSS NOW

🔴 ${trade.coin}

⚠️ Stop Loss Hit
RM${formatPrice(
trade.coin,
trade.sl
)}

📈 Current Price
RM${formatPrice(
trade.coin,
livePrice
)}

🪙 Net Sell Amount
${trade.sellAmount.toFixed(2)} ${trade.coin}`

                );

                delete ACTIVE_TRADES[
                    userId
                ];

            }

        }

    }catch(err){

        console.log(
            "MONITOR ERROR",
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
            // BUTTON CALLBACK
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
                        "confirm_entry"
                    )
                ){

                    const split =
                    data.split("_");

                    const coin =
                    split[2];

                    const entry =
                    Number(
                        split[3]
                    );

                    const sl =
                    Number(
                        split[4]
                    );

                    USER_ENTRY_FLOW[
                        userId
                    ] = {

                        step:
                        "WAIT_MODAL",

                        coin,
                        entry,
                        sl

                    };

                    await sendTelegram(

`💵 Masukkan modal`

                    );

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
            // WAIT MODAL
            // =====================================

            if(

                USER_ENTRY_FLOW[userId]

                &&

                USER_ENTRY_FLOW[userId]
                .step === "WAIT_MODAL"

            ){

                USER_ENTRY_FLOW[
                    userId
                ].modal = Number(text);

                USER_ENTRY_FLOW[
                    userId
                ].step = "WAIT_PROFIT";

                await sendTelegram(

`💸 Profit berapa?`

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

                const modal =
                flow.modal;

                const profit =
                Number(text);

                const coin =
                flow.coin;

                const entry =
                flow.entry;

                const sl =
                flow.sl;

                const estimatedSell =
                modal + profit;

                const tpPrice =
                entry * (
                    estimatedSell / modal
                );

                const sellAmount =
                (
                    modal / entry
                ) * 0.994;

                // =====================================
                // SAVE ACTIVE TRADE
                // =====================================

                ACTIVE_TRADES[
                    userId
                ] = {

                    coin,

                    entry,

                    tp:
                    tpPrice,

                    sl,

                    sellAmount,

                    targetProfit:
                    profit

                };

                await sendTelegram(

`✅ ENTRY CONFIRMED

🟢 ${coin}

💵 Modal
RM${modal}

💰 Entry
RM${formatPrice(
coin,
entry
)}

🪙 Net Sell Amount
${sellAmount.toFixed(2)} ${coin}

💸 Target Profit
RM${profit}

📈 Anggaran TP
RM${formatPrice(
coin,
tpPrice
)}

💵 Anggaran Jual
RM${estimatedSell}

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
                lower === "/testentry"
            ){

                await sendTestEntry();

            }

            else if(
                lower === "/testtp"
            ){

                await sendTestTP();

            }

            else if(
                lower === "/testsl"
            ){

                await sendTestSL();

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
            "COMMAND ERROR",
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
        INSTANCE,

        activeTrades:
        Object.keys(
            ACTIVE_TRADES
        ).length

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
    // FIRST RUN
    // =====================================

    await autoPriceUpdate();

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
    // LIVE TRADE MONITOR
    // =====================================

    setInterval(

        monitorTrades,

        10000

    );

}, 5000);