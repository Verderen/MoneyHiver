async function updateCurrencyPrices() {
    try {
        const response = await fetch('/api/currency');
        const data = await response.json();

        document.querySelector('.usd-price').textContent = `${data.usdprice.toFixed(2)} RUB`;
        document.querySelector('.eur-price').textContent = `${data.eurprice.toFixed(2)} RUB`;
        document.querySelector('.cny-price').textContent = `${data.cnyprice.toFixed(2)} RUB`;
        document.querySelector('.chf-price').textContent = `${data.chfprice.toFixed(2)} RUB`;
    } catch (error) {
        console.error('Error fetching currency prices:', error);
    }
}

// Автообновление цен
updateCurrencyPrices();
setInterval(updateCurrencyPrices, 10000);

// Глобальные переменные для графика
let currencyChart = null;
let currentDays = '1';
let currentCurrency = 'USDRUB';

// Форматирование чисел
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
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

// Получение исторических данных о валюте
async function fetchCurrencyData(currencySymbol, days = 1) {
    try {
        // Определяем базовую валюту и целевую валюту из символа
        let baseCurrency, targetCurrency;

        switch(currencySymbol) {
            case 'USDRUB':
                baseCurrency = 'USD';
                targetCurrency = 'RUB';
                break;
            case 'EURRUB':
                baseCurrency = 'EUR';
                targetCurrency = 'RUB';
                break;
            case 'CNYRUB':
                baseCurrency = 'CNY';
                targetCurrency = 'RUB';
                break;
            case 'CHFRUB':
                baseCurrency = 'CHF';
                targetCurrency = 'RUB';
                break;
            default:
                baseCurrency = 'USD';
                targetCurrency = 'RUB';
        }

        // Определяем дату начала (текущая дата минус days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Форматируем даты для API
        const formatDateForAPI = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Для коротких периодов (1 день) используем почасовые данные
        if (days <= 1) {
            // Используем текущий API для получения курса
            const response = await fetch('/api/currency');
            const currentData = await response.json();

            let currentPrice;
            switch(currencySymbol) {
                case 'USDRUB':
                    currentPrice = currentData.usdprice;
                    break;
                case 'EURRUB':
                    currentPrice = currentData.eurprice;
                    break;
                case 'CNYRUB':
                    currentPrice = currentData.cnyprice;
                    break;
                case 'CHFRUB':
                    currentPrice = currentData.chfprice;
                    break;
            }

            // Создаем искусственные данные для графика (симуляция изменения в течение дня)
            const prices = [];
            const now = new Date();
            const hoursInDay = 24;

            for (let i = 0; i < hoursInDay; i++) {
                const time = new Date(now);
                time.setHours(time.getHours() - (hoursInDay - i));

                // Создаем небольшое случайное изменение вокруг текущей цены
                const fluctuation = 0.98 + Math.random() * 0.04; // ±2% флуктуация
                const price = currentPrice * fluctuation;

                prices.push([time.getTime(), price]);
            }

            return { prices };
        } else {
            // Для более длительных периодов используем имитацию данных
            // В реальном проекте здесь должен быть вызов исторического API
            const prices = [];
            const now = new Date();

            // Получаем текущую цену
            const currentResponse = await fetch('/api/currency');
            const currentData = await currentResponse.json();

            let currentPrice;
            switch(currencySymbol) {
                case 'USDRUB':
                    currentPrice = currentData.usdprice;
                    break;
                case 'EURRUB':
                    currentPrice = currentData.eurprice;
                    break;
                case 'CNYRUB':
                    currentPrice = currentData.cnyprice;
                    break;
                case 'CHFRUB':
                    currentPrice = currentData.chfprice;
                    break;
            }

            // Создаем исторические данные с трендом
            for (let i = days; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);

                // Создаем тренд с небольшими флуктуациями
                const trendFactor = 1 + (Math.random() - 0.5) * 0.1; // ±5% дневное изменение
                const basePrice = currentPrice * (0.95 + (i / days) * 0.1); // Общий восходящий тренд
                const price = basePrice * trendFactor;

                prices.push([date.getTime(), price]);
            }

            return { prices };
        }
    } catch (error) {
        console.error(`Error fetching ${currencySymbol} data:`, error);
        return null;
    }
}

// Обновление графика
function updateChart(prices, currencyName) {
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
        } else if (currentDays === '30') {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        labels.push(label);
        dataPoints.push(point[1]);
    });

    // Если график уже существует, обновляем его
    if (currencyChart) {
        currencyChart.data.labels = labels;
        currencyChart.data.datasets[0].data = dataPoints;
        currencyChart.data.datasets[0].label = `${currencyName} Exchange Rate`;
        currencyChart.update();
        return;
    }

    // Создаем новый график
    const ctx = document.getElementById('currency-chart').getContext('2d');
    currencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${currencyName} Exchange Rate`,
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
                            return `Rate: ${formatPrice(context.parsed.y)} RUB`;
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
                            return formatPrice(value) + ' RUB';
                        }
                    }
                }
            }
        }
    });
}

// Получение названия валюты по символу
function getCurrencyName(symbol) {
    const currencyNames = {
        'USDRUB': 'USD/RUB',
        'EURRUB': 'EUR/RUB',
        'CNYRUB': 'CNY/RUB',
        'CHFRUB': 'CHF/RUB'
    };
    return currencyNames[symbol] || symbol;
}

// Загрузка данных графика
async function loadChartData() {
    const currencyName = getCurrencyName(currentCurrency);

    try {
        // Загружаем данные для графика
        const chartData = await fetchCurrencyData(currentCurrency, parseInt(currentDays));

        // Обновляем график
        if (chartData) {
            updateChart(chartData.prices, currencyName);
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

// Инициализация контролов графика
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

    // Селектор валюты
    document.getElementById('currency-select').addEventListener('change', function() {
        currentCurrency = this.value;
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

    // Обновление текущих цен при загрузке
    updateCurrencyPrices();
});