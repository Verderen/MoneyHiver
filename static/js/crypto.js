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

// Глобальные переменные для графика
let cryptoChart = null;
let currentDays = '1';
let currentCrypto = 'bitcoin';

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

// Получение данных о криптовалюте
async function fetchCryptoData(cryptoId, days = 1) {
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`
        );

        if (!response.ok) throw new Error('Error fetching data');
        const data = await response.json();

        return {
            prices: data.prices
        };
    } catch (error) {
        console.error(`Error fetching ${cryptoId} data:`, error);
        return null;
    }
}

// Обновление графика
function updateChart(prices, cryptoName) {
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
    if (cryptoChart) {
        cryptoChart.data.labels = labels;
        cryptoChart.data.datasets[0].data = dataPoints;
        cryptoChart.data.datasets[0].label = `${cryptoName} Price (USD)`;
        cryptoChart.update();
        return;
    }

    // Создаем новый график
    const ctx = document.getElementById('crypto-chart').getContext('2d');
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${cryptoName} Price (USD)`,
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
    const cryptoName = currentCrypto === 'bitcoin' ? 'Bitcoin' : 'Ethereum';

    try {
        // Загружаем данные для графика
        const chartData = await fetchCryptoData(currentCrypto, currentDays);

        // Обновляем график
        if (chartData) {
            updateChart(chartData.prices, cryptoName);
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

    // Селектор криптовалюты
    document.getElementById('crypto-select').addEventListener('change', function() {
        currentCrypto = this.value;
        loadChartData();
    });
}

// Автообновление графика
function startChartAutoRefresh() {
    setInterval(loadChartData, 30000); // Обновление каждые 30 секунд
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация контролов графика
    initChartControls();

    // Загрузка начальных данных графика
    loadChartData();

    // Запуск автообновления графика
    startChartAutoRefresh();
});