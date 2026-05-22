// =====================================
// RANGE FILTER
// =====================================

const supportRange =
coin === "BTC"
?
0.992
:
0.985;

const resistanceRange =
coin === "BTC"
?
1.005
:
1.01;

// =====================================
// FILTER SUPPORT
// =====================================

const filteredBids =
bids.filter(bid => {

    const price =
    parseFloat(
        bid.price
    );

    return (

        price >=
        currentPrice *
        supportRange

        &&

        price <=
        currentPrice

    );

});

// =====================================
// FILTER RESISTANCE
// =====================================

const filteredAsks =
asks.filter(ask => {

    const price =
    parseFloat(
        ask.price
    );

    return (

        price <=
        currentPrice *
        resistanceRange

        &&

        price >=
        currentPrice

    );

});

// =====================================
// STRONGEST WALLS
// =====================================

const strongestSupport =
getStrongestSupport(

    filteredBids.length > 0
    ?
    filteredBids
    :
    bids.slice(0,5)

);

const strongestResistance =
getStrongestResistance(

    filteredAsks.length > 0
    ?
    filteredAsks
    :
    asks.slice(0,5)

);