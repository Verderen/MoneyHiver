// Глобальные переменные для графика
let stockChart = null;
let currentDays = '1';
let currentStock = 'AAPL';

// Форматирование чисел
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
}

// Форматирование даты
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Получение данных об акциях через твой API
async function fetchStockData(symbol) {
    try {
        const response = await fetch(`/api/stocks/${symbol.toLowerCase()}`);

        if (!response.ok) throw new Error('Error fetching stock data');
        const data = await response.json();

        return data.price;
    } catch (error) {
        console.error(`Error fetching ${symbol} data:`, error);
        return null;
    }
}

// Получение исторических данных (симуляция, так как у тебя нет исторического API)
// В реальном проекте нужно было бы добавить API для исторических данных
async function fetchHistoricalData(symbol, days = 1) {
    try {
        // Симулируем исторические данные на основе текущей цены
        const currentPrice = await fetchStockData(symbol);
        if (!currentPrice) return null;

        // Генерируем симулированные данные
        const prices = [];
        const now = Date.now();

        // Количество точек данных в зависимости от периода
        let pointCount;
        if (days === '1') pointCount = 24; // Каждый час
        else if (days === '7') pointCount = 7; // Каждый день
        else if (days === '30') pointCount = 30; // Каждый день
        else pointCount = 90; // Каждый день

        for (let i = pointCount - 1; i >= 0; i--) {
            const timeOffset = (pointCount - i - 1) *
                (days === '1' ? 3600000 : // 1 час для 1D
                 days === '7' ? 86400000 : // 1 день для 7D
                 days === '30' ? 86400000 : // 1 день для 30D
                 86400000); // 1 день для 90D

            const timestamp = now - (i * timeOffset);
            // Симулируем цену с небольшими колебаниями
            const variation = (Math.random() - 0.5) * 0.1 * currentPrice;
            const price = currentPrice + variation;

            prices.push([timestamp, price]);
        }

        return { prices };
    } catch (error) {
        console.error(`Error generating historical data for ${symbol}:`, error);
        return null;
    }
}

// Обновление графика
function updateChart(prices, stockName) {
    const labels = [];
    const dataPoints = [];

    // Подготовка данных
    prices.forEach(point => {
        const date = new Date(point[0]);

        let label;
        if (currentDays === '1') {
            label = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (currentDays === '7') {
            label = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        labels.push(label);
        dataPoints.push(point[1]);
    });

    // Если график уже существует, обновляем его
    if (stockChart) {
        stockChart.data.labels = labels;
        stockChart.data.datasets[0].data = dataPoints;
        stockChart.data.datasets[0].label = `${stockName} Price (USD)`;
        stockChart.update();
        return;
    }

    // Создаем новый график
    const ctx = document.getElementById('stock-chart').getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${stockName} Price (USD)`,
                data: dataPoints,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${formatPrice(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + formatPrice(value);
                        }
                    }
                }
            }
        }
    });
}

async function loadChartData() {
    const stockName = document.querySelector(`#stock-select option[value="${currentStock}"]`).textContent;

    try {
        // Загружаем данные для графика
        const chartData = await fetchHistoricalData(currentStock, currentDays);

        // Обновляем график
        if (chartData) {
            updateChart(chartData.prices, stockName);
            document.getElementById('last-update').textContent = formatDate(new Date());
        } else {
            console.error('No chart data received');
            document.getElementById('last-update').textContent = 'Error loading data';
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        document.getElementById('last-update').textContent = 'Error loading data';
    }
}

function initChartControls() {
    // Кнопки временных диапазонов
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            currentDays = this.getAttribute('data-days');
            loadChartData();
        });
    });

    // Селектор акций
    document.getElementById('stock-select').addEventListener('change', function() {
        currentStock = this.value;
        loadChartData();
    });
}

// Функции для обновления цен акций (оставляем старые)
async function updateAllStockPrices() {
    await Promise.all([
        loadApplePrice(),
        loadNvidiaPrice(),
        loadTeslaPrice(),
        loadAmazonPrice()
    ]);
}

async function loadApplePrice() {
    try {
        const price = await fetchStockData('AAPL');
        if (price) {
            document.querySelector('.apple-price').textContent = `$${formatPrice(price)}`;
        }
    } catch (error) {
        console.error('Error loading Apple price:', error);
        document.querySelector('.apple-price').textContent = 'Error';
    }
}

async function loadNvidiaPrice() {
    try {
        const price = await fetchStockData('NVDA');
        if (price) {
            document.querySelector('.nvidia-price').textContent = `$${formatPrice(price)}`;
        }
    } catch (error) {
        console.error('Error loading NVIDIA price:', error);
        document.querySelector('.nvidia-price').textContent = 'Error';
    }
}

async function loadTeslaPrice() {
    try {
        const price = await fetchStockData('TSLA');
        if (price) {
            document.querySelector('.tesla-price').textContent = `$${formatPrice(price)}`;
        }
    } catch (error) {
        console.error('Error loading Tesla price:', error);
        document.querySelector('.tesla-price').textContent = 'Error';
    }
}

async function loadAmazonPrice() {
    try {
        const price = await fetchStockData('AMZN');
        if (price) {
            document.querySelector('.amazon-price').textContent = `$${formatPrice(price)}`;
        }
    } catch (error) {
        console.error('Error loading Amazon price:', error);
        document.querySelector('.amazon-price').textContent = 'Error';
    }
}

// Автообновление графика
function startChartAutoRefresh() {
    setInterval(async () => {
        await updateAllStockPrices();
        await loadChartData();
    }, 30000); // Обновление каждые 30 секунд
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем начальные цены
    updateAllStockPrices();

    // Инициализация контролов графика
    initChartControls();

    // Загрузка начальных данных графика
    loadChartData();

    // Запуск автообновления
    startChartAutoRefresh();

    // Обновление цен каждую минуту
    setInterval(updateAllStockPrices, 60000);
});