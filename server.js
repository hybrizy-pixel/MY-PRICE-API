const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const SERVICE_ID = process.env.SERVICE_ID || "APM3";

if (!TOKEN || !CHAT_ID) {
    console.error("FATAL ERROR: BOT_TOKEN atau CHAT_ID tidak dijumpai di Environment Variables!");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// FIX: Guna simbol Luno yang betul (XBTMYR, bukan BTC/MYR)
const COINS = { 
    'BTC': 'XBTMYR', 
    'GRT': 'GRTMYR' 
};

let ACTIVE_TRADES = {};
let USER_ENTRY_FLOW = {};

async function sendTelegram(msg, options = {}) {
    try {
        await bot.sendMessage(CHAT_ID, `[${SERVICE_ID}]\n\n${msg}`, { ...options, parse_mode: 'HTML' });
    } catch (e) { console.error("Error Telegram:", e); }
}

async function getMarketStructure(coin) {
    try {
        const pair = COINS[coin];
        const response = await axios.get(`https://api.luno.com/api/1/orderbook?pair=${pair}`);
        const ticker = await axios.get(`https://api.luno.com/api/1/ticker?pair=${pair}`);
        
        return {
            currentPrice: parseFloat(ticker.data.last_trade),
            buyVolume: response.data.bids.reduce((sum, b) => sum + parseFloat(b.volume), 0),
            sellVolume: response.data.asks.reduce((sum, a) => sum + parseFloat(a.volume), 0),
            support: parseFloat(response.data.bids[0].price)
        };
    } catch (e) { 
        console.error(`Error fetching data for ${coin}:`, e.message);
        return null; 
    }
}

async function sendEntryUpdate() {
    for (const coin of Object.keys(COINS)) {
        const structure = await getMarketStructure(coin);
        if (!structure) continue;
        
        if (structure.buyVolume > structure.sellVolume) {
            await sendTelegram(`🚀 <b>Entry Signal</b>\nCoin: ${coin}\nPrice: RM${structure.currentPrice}\n\n<i>Buyer kuat, sila periksa setup!</i>`, {
                reply_markup: {
                    inline_keyboard: [[{ text: "✅ Confirm Entry", callback_data: `confirm_${coin}_${structure.currentPrice}_${structure.support}` }]]
                }
            });
        }
    }
}

bot.on('callback_query', async (query) => {
    const data = query.data;
    const userId = query.from.id;

    if (data.startsWith('confirm_')) {
        const parts = data.split('_');
        USER_ENTRY_FLOW[userId] = { coin: parts[1], entry: parts[2], support: parts[3] };
        await bot.sendMessage(userId, "Masukkan jumlah unit:");
    }
});

bot.on('message', async (msg) => {
    const userId = msg.from.id;
    if (USER_ENTRY_FLOW[userId] && !isNaN(msg.text)) {
        const flow = USER_ENTRY_FLOW[userId];
        const unit = parseFloat(msg.text);
        const tpPrice = (parseFloat(flow.entry) * 1.02);

        ACTIVE_TRADES[userId] = { 
            coin: flow.coin, 
            entry: flow.entry, 
            support: flow.support, 
            netSellAmount: unit * 0.995, 
            tpPrice: tpPrice 
        };
        
        delete USER_ENTRY_FLOW[userId];
        await sendTelegram(`✅ <b>Trade Aktif!</b>\nCoin: ${flow.coin}\nTarget Price: RM${tpPrice.toFixed(2)}`);
    }
});

async function monitorTrades() {
    for (const userId in ACTIVE_TRADES) {
        const trade = ACTIVE_TRADES[userId];
        const structure = await getMarketStructure(trade.coin);
        if (!structure) continue;

        if (structure.currentPrice >= trade.tpPrice) {
            await sendTelegram(`🚀 <b>SELL NOW</b>\nCoin: ${trade.coin}\nAmount: ${trade.netSellAmount.toFixed(4)}`);
            delete ACTIVE_TRADES[userId];
        } else if (structure.currentPrice <= (trade.support * 0.99)) {
            await sendTelegram(`🛑 <b>CUT LOSS NOW</b>\nCoin: ${trade.coin}\nAmount: ${trade.netSellAmount.toFixed(4)}`);
            delete ACTIVE_TRADES[userId];
        }
    }
}

setInterval(monitorTrades, 15000);
setInterval(sendEntryUpdate, 60000);