const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const SERVICE_ID = process.env.SERVICE_ID || "APM3"; // Kod pengenalan kau
const bot = new TelegramBot(TOKEN, { polling: true });

const COINS = { 'BTC': 'BTC/MYR', 'GRT': 'GRT/MYR' };
let ACTIVE_TRADES = {};
let USER_ENTRY_FLOW = {};

async function sendTelegram(msg, options = {}) {
    try {
        await bot.sendMessage(CHAT_ID, msg, { ...options, parse_mode: 'HTML' });
    } catch (e) { console.error(e); }
}

// FUNGSI PENGESAHAN DEPLOYMENT (Ini yang kau nak!)
async function onStart() {
    await sendTelegram(`🚀 <b>DEPLOY BERJAYA!</b>\nService ID: <code>${SERVICE_ID}</code>\nStatus: Bot Baru Saja Dihidupkan.`);
    console.log(`Bot started with Service ID: ${SERVICE_ID}`);
}

async function getMarketStructure(coin) {
    try {
        const response = await axios.get(`https://api.luno.com/api/1/orderbook?pair=${COINS[coin]}`);
        const data = response.data;
        const currentPrice = parseFloat(data.bids[0].price);
        let buyVolume = 0;
        data.bids.forEach(b => { if (parseFloat(b.price) > currentPrice * 0.995) buyVolume += parseFloat(b.volume); });
        let sellVolume = 0;
        data.asks.forEach(a => { if (parseFloat(a.price) < currentPrice * 1.005) sellVolume += parseFloat(a.volume); });
        return { currentPrice, buyVolume, sellVolume, majorSupport: buyVolume > (sellVolume * 2), support: currentPrice };
    } catch (e) { return null; }
}

async function autoPriceUpdate() {
    for (const coin of Object.keys(COINS)) {
        const structure = await getMarketStructure(coin);
        if (structure) await sendTelegram(`📊 [${SERVICE_ID}] ${coin}: ${structure.currentPrice}`);
    }
}

async function sendMarketStructure() {
    for (const coin of Object.keys(COINS)) {
        const structure = await getMarketStructure(coin);
        if (structure) await sendTelegram(`📈 [${SERVICE_ID}] ${coin} Structure\nSupport: ${structure.support}`);
    }
}

async function sendEntryUpdate(specificCoin = null) {
    const coinsToScan = specificCoin ? [specificCoin] : Object.keys(COINS);
    for (const coin of coinsToScan) {
        const structure = await getMarketStructure(coin);
        if (!structure) continue;
        const pressure = structure.buyVolume / structure.sellVolume;
        if (pressure > 2 && structure.majorSupport) {
            await sendTelegram(`🎯 HIGH CONFIDENCE: ${coin}\nPressure: ${pressure.toFixed(2)}`, { reply_markup: { inline_keyboard: [[{ text: "✅ CONFIRM", callback_data: `confirm_${coin}_${structure.currentPrice}_${structure.support}` }]] } });
        } else if (pressure > 1.3) {
            await new Promise(r => setTimeout(r, 10000));
            const reCheck = await getMarketStructure(coin);
            if (reCheck && (reCheck.buyVolume / reCheck.sellVolume) > 1.3) {
                await sendTelegram(`⚡ SCALPING ALERT: ${coin}\nPressure: ${(reCheck.buyVolume / reCheck.sellVolume).toFixed(2)}`, { reply_markup: { inline_keyboard: [[{ text: "✅ CONFIRM", callback_data: `confirm_${coin}_${reCheck.currentPrice}_${reCheck.support}` }]] } });
            }
        }
    }
}

bot.on('callback_query', async (query) => {
    const data = query.data;
    const userId = query.from.id;
    if (data.startsWith('confirm_')) {
        const [_, coin, entry, support] = data.split('_');
        USER_ENTRY_FLOW[userId] = { step: 'WAIT_UNIT', coin, entry, support };
        await sendTelegram(`Masukkan jumlah unit untuk ${coin}:`);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text;
    const userId = msg.from.id;
    if (text.startsWith('/test')) {
        const coinSymbol = text.split(" ")[1]?.toUpperCase();
        if (COINS[coinSymbol]) await sendEntryUpdate(coinSymbol);
        else await sendTelegram("⚠️ Coin tidak valid.");
        return;
    }
    if (USER_ENTRY_FLOW[userId]) {
        const flow = USER_ENTRY_FLOW[userId];
        if (flow.step === 'WAIT_UNIT') {
            flow.unit = Number(text); flow.step = 'WAIT_PROFIT';
            await sendTelegram("Masukkan target profit (RM):");
        } else if (flow.step === 'WAIT_PROFIT') {
            const targetProfit = Number(text);
            const netBuy = flow.unit * 0.994;
            const tpPrice = ((netBuy * flow.entry) + targetProfit) / netBuy;
            ACTIVE_TRADES[userId] = { coin: flow.coin, entry: flow.entry, support: flow.support, netSellAmount: netBuy * 0.995, tpPrice: tpPrice };
            delete USER_ENTRY_FLOW[userId];
            await sendTelegram(`✅ Trade Aktif!\nTarget Price: ${tpPrice.toFixed(2)}`);
        }
    }
});

async function monitorTrades() {
    for (const userId in ACTIVE_TRADES) {
        const trade = ACTIVE_TRADES[userId];
        const structure = await getMarketStructure(trade.coin);
        if (!structure) continue;
        if (structure.currentPrice >= trade.tpPrice) {
            await sendTelegram(`🚀 SELL NOW\nCoin: ${trade.coin}\nAmount: ${trade.netSellAmount.toFixed(4)}`);
            delete ACTIVE_TRADES[userId];
        } else if (structure.currentPrice <= (trade.support * 0.995)) {
            await sendTelegram(`🛑 CUT LOSS NOW\nCoin: ${trade.coin}\nAmount: ${trade.netSellAmount.toFixed(4)}`);
            delete ACTIVE_TRADES[userId];
        }
    }
}

// Start bot
onStart(); 
setInterval(sendEntryUpdate, 60000);
setInterval(monitorTrades, 10000);
setInterval(autoPriceUpdate, 300000);
setInterval(sendMarketStructure, 900000);