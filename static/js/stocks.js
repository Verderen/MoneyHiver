// Функции для загрузки цен отдельных акций (оставляем как есть)
async function loadApplePrice() {
    try {
        const response = await fetch('/api/stocks/aapl');
        const data = await response.json();
        document.querySelector('.apple-price').textContent = `${data.price} USD`;
    } catch (error) {
        console.error('Ошибка при загрузке цены Apple:', error);
        document.querySelector('.apple-price').textContent = 'Ошибка загрузки';
    }
}

async function loadNvidiaPrice() {
    try {
        const response = await fetch('/api/stocks/nvda');
        const data = await response.json();
        document.querySelector('.nvidia-price').textContent = `${data.price} USD`;
    } catch (error) {
        console.error('Ошибка при загрузке цены NVIDIA:', error);
        document.querySelector('.nvidia-price').textContent = 'Ошибка загрузки';
    }
}

async function loadTeslaPrice() {
    try {
        const response = await fetch('/api/stocks/tsla');
        const data = await response.json();
        document.querySelector('.tesla-price').textContent = `${data.price} USD`;
    } catch (error) {
        console.error('Ошибка при загрузке цены Tesla:', error);
        document.querySelector('.tesla-price').textContent = 'Ошибка загрузки';
    }
}

async function loadAmazonPrice() {
    try {
        const response = await fetch('/api/stocks/amzn');
        const data = await response.json();
        document.querySelector('.amazon-price').textContent = `${data.price} USD`;
    } catch (error) {
        console.error('Ошибка при загрузке цены Amazon:', error);
        document.querySelector('.amazon-price').textContent = 'Ошибка загрузки';
    }
}

// Функция для обновления всех цен акций
async function updateAllStockPrices() {
    await Promise.all([
        loadApplePrice(),
        loadNvidiaPrice(),
        loadTeslaPrice(),
        loadAmazonPrice()
    ]);
}

// Функция для создания графика TradingView (оставляем как есть)
function createTradingViewWidget(symbol) {
    new TradingView.widget({
        "autosize": true,
        "symbol": `NASDAQ:${symbol}`,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "ru",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": false,
        "container_id": "main-chart-container"
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем цены всех акций при старте
    updateAllStockPrices();

    // Инициализация графика с первой акцией (Apple)
    createTradingViewWidget("AAPL");

    // Обработчики событий для переключения акций
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            const symbol = this.getAttribute('data-pair');
            document.getElementById('main-chart-container').innerHTML = '';
            createTradingViewWidget(symbol);
        });
    });

    // Обновляем цены каждые 60 секунд (опционально)
    setInterval(updateAllStockPrices, 60000);
});