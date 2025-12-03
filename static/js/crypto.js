async function updateCryptoPrices() {
    try {
        const response = await fetch('/api/crypto');
        const data = await response.json();

        document.querySelector('.bitcoin-price').textContent = `$${data.btc_price.toFixed(2)}`;
        document.querySelector('.ethereum-price').textContent = `$${data.eth_price.toFixed(2)}`;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
    }
}

updateCryptoPrices();
setInterval(updateCryptoPrices, 500);

function createTradingViewWidget(pair) {
    new TradingView.widget({
        "autosize": true,
        "symbol": pair,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": false,
        "container_id": "main-chart-container"
    });
}

createTradingViewWidget("BINANCE:BTCUSDT");

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        const pair = this.getAttribute('data-pair');
        document.getElementById('main-chart-container').innerHTML = '';
        createTradingViewWidget(pair);
    });
});