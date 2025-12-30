async function updateCryptoPrices() {
    try {

        const [btcResponse, ethResponse] = await Promise.all([
            fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
            fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
        ]);

        const btcData = await btcResponse.json();
        const ethData = await ethResponse.json();

        document.querySelector('.bitcoin-price').textContent = `$${parseFloat(btcData.price).toFixed(2)}`;
        document.querySelector('.ethereum-price').textContent = `$${parseFloat(ethData.price).toFixed(2)}`;
    } catch (error) {
        console.error('Error fetching crypto prices:', error);

        try {
            const response = await fetch('/api/crypto');
            const data = await response.json();
            document.querySelector('.bitcoin-price').textContent = `$${data.btc_price.toFixed(2)}`;
            document.querySelector('.ethereum-price').textContent = `$${data.eth_price.toFixed(2)}`;
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
        }
    }
}

updateCryptoPrices();
setInterval(updateCryptoPrices, 5000);

let currentDays = '1';
let currentCrypto = 'bitcoin';
let cryptoChart = null;

function getBinanceInterval(days) {
    switch (days) {
        case '1': return '1h';
        case '7': return '4h';
        case '30': return '1d';
        case '90': return '1d';
        default: return '1h';
    }
}

function getLimitForDays(days) {
    switch (days) {
        case '1': return 24;
        case '7': return 42;
        case '30': return 30;
        case '90': return 90;
        default: return 24;
    }
}

async function fetchBinanceData(symbol, interval, limit) {
    try {
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );

        if (!response.ok) throw new Error('Error fetching data from Binance');
        const data = await response.json();

        const prices = data.map(candle => [
            candle[0],
            parseFloat(candle[4])
        ]);

        return { prices };
    } catch (error) {
        console.error(`Error fetching ${symbol} data from Binance:`, error);

        return generateFallbackData(parseInt(days));
    }
}

function generateFallbackData(days) {
    const now = Date.now();
    const prices = [];
    const basePrice = currentCrypto === 'bitcoin' ? 50000 : 3000;
    const hours = days * 24;

    for (let i = 0; i <= hours; i++) {
        const time = now - ((hours - i) * 3600000);
        const price = basePrice + Math.random() * basePrice * 0.1;
        prices.push([time, price]);
    }

    return { prices };
}

function updateLastUpdateTime() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update').textContent = formattedTime;
}

async function loadChartData() {
    try {
        const cryptoName = currentCrypto === 'bitcoin' ? 'Bitcoin' : 'Ethereum';
        const symbol = currentCrypto === 'bitcoin' ? 'BTCUSDT' : 'ETHUSDT';
        const interval = getBinanceInterval(currentDays);
        const limit = getLimitForDays(currentDays);

        const container = document.getElementById('crypto-chart');
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.style.display = 'none';
        }

        let loadingIndicator = container.querySelector('.loading-indicator');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Loading chart data...</p>';
            container.appendChild(loadingIndicator);
        }
        loadingIndicator.style.display = 'block';

        const data = await fetchBinanceData(symbol, interval, limit);

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (canvas) {
            canvas.style.display = 'block';
        }

        createChart(data, cryptoName);

        updateLastUpdateTime();

    } catch (error) {
        console.error('Error loading chart:', error);

        const container = document.getElementById('crypto-chart');
        let errorDiv = container.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            container.appendChild(errorDiv);
        }
        errorDiv.innerHTML = '<p>Unable to load chart data from Binance. Please try again.</p>';
        errorDiv.style.display = 'block';

        const loadingIndicator = container.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

function createChart(data, cryptoName) {
    const ctx = document.getElementById('crypto-chart').getContext('2d');

    if (cryptoChart) {
        cryptoChart.destroy();
    }

    const labels = [];
    const prices = [];

    const interval = Math.max(1, Math.floor(data.prices.length / 10));

    data.prices.forEach((point, index) => {
        const date = new Date(point[0]);
        let label;

        if (currentDays === '1') {

            if (index % interval === 0) {
                label = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                label = '';
            }
        } else if (currentDays === '7') {

            if (index % interval === 0) {
                label = date.toLocaleDateString('en-US', {
                    weekday: 'short'
                });
            } else {
                label = '';
            }
        } else {

            if (index % interval === 0) {
                label = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            } else {
                label = '';
            }
        }

        labels.push(label);
        prices.push(point[1]);
    });

    const lineColor = currentCrypto === 'bitcoin' ? '#2e7d32' : '#2196f3';
    const fillColor = currentCrypto === 'bitcoin'
        ? 'rgba(46, 125, 50, 0.1)'
        : 'rgba(33, 150, 243, 0.1)';

    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${cryptoName} Price (USDT)`,
                data: prices,
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1,
                pointBackgroundColor: lineColor,
                pointBorderColor: '#fff',
                pointHoverRadius: 4
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        },
                        title: function(context) {
                            const date = new Date(data.prices[context[0].dataIndex][0]);
                            if (currentDays === '1') {
                                return date.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            } else {
                                return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                });
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        autoSkip: true,
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            });
                        }
                    },
                    beginAtZero: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function initChartControls() {

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

    document.getElementById('crypto-select').addEventListener('change', function() {
        currentCrypto = this.value;
        loadChartData();
    });
}

function startChartAutoRefresh() {
    setInterval(() => {
        loadChartData();
        updateLastUpdateTime();
    }, 30000);
}

document.addEventListener('DOMContentLoaded', function() {

    initChartControls();

    loadChartData();

    startChartAutoRefresh();
});