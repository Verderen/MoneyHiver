function createTradingViewWidget(pair) {
    new TradingView.widget({
        "autosize": true,
        "symbol": `FX_IDC:${pair}`,
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

createTradingViewWidget("USDRUB");

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

async function updateCurrencyPrice(currency, elementClass) {
    try {
        const response = await fetch(`/api/currency/${currency}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        document.querySelector(`.${elementClass}`).textContent = `₽${data.price}`;
    } catch (error) {
        console.error(`Error fetching ${currency} rate:`, error);
        document.querySelector(`.${elementClass}`).textContent = 'Error loading data';
    };
};

async function updatePrices() {
    await updateCurrencyPrice('usd', 'usd-price');
    await updateCurrencyPrice('eur', 'eur-price');
    await updateCurrencyPrice('cny', 'cny-price');
    await updateCurrencyPrice('chf', 'chf-price');
};

updatePrices();
setInterval(updatePrices, 50000);