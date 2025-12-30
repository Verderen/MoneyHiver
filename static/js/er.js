const mql5WidgetConfigs = {
    'USDRUB': {
        filter: ['USDRUB'],
        width: 700,
        height: 420,
        period: 'D1',
        lang: 'en'
    },
    'EURRUB': {
        filter: ['EURRUB'],
        width: 700,
        height: 420,
        period: 'D1',
        lang: 'en'
    },
    'EURUSD': {
        filter: ['EURUSD'],
        width: 700,
        height: 420,
        period: 'D1',
        lang: 'en'
    },
    'USDJPY': {
        filter: ['USDJPY'],
        width: 700,
        height: 420,
        period: 'D1',
        lang: 'en'
    }
};

let currentCurrency = 'USDRUB';
let currentWidget = null;

async function updateCurrencyPrices() {
    try {
        const response = await fetch('/api/currency');
        const data = await response.json();

        document.querySelector('.usd-price').textContent = `${data.usdprice.toFixed(2)} RUB`;
        document.querySelector('.eur-price').textContent = `${data.eurprice.toFixed(2)} RUB`;
        document.querySelector('.cny-price').textContent = `${data.cnyprice.toFixed(2)} RUB`;
        document.querySelector('.chf-price').textContent = `${data.chfprice.toFixed(2)} RUB`;

        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching currency prices:', error);
    }
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

function loadMQL5Widget(currency) {
    const config = mql5WidgetConfigs[currency];
    if (!config) {
        console.error('No configuration found for currency:', currency);
        return;
    }

    const container = document.getElementById('mql5-widget-container');
    container.innerHTML = '';

    showLoadingIndicator();

    const widgetId = `quotesWidget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const widgetConfig = {
        type: 'overview',
        style: 'tiles',
        filter: config.filter,
        width: config.width,
        height: config.height,
        period: config.period,
        lang: config.lang,
        id: widgetId,
        fw: 'html'
    };

    const widgetDiv = document.createElement('div');
    widgetDiv.id = widgetId;

    const copyrightDiv = document.createElement('div');
    copyrightDiv.className = 'qw-copyright';
    copyrightDiv.innerHTML = `
        <a href="https://www.mql5.com/?utm_source=quotes.widget&utm_medium=link&utm_term=quotes.overview&utm_content=visit.mql5.quotes&utm_campaign=quotes.overview.widget"
           rel="noopener nofollow" target="_blank">
           MQL5 Algo Trading Community
        </a>
    `;

    const script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.dataset.type = 'quotes-widget';
    script.src = 'https://c.mql5.com/js/widgets/quotes/widget.js?v=3';

    script.textContent = JSON.stringify(widgetConfig);

    container.appendChild(widgetDiv);
    container.appendChild(copyrightDiv);
    container.appendChild(script);

    currentWidget = {
        id: widgetId,
        currency: currency
    };

    setTimeout(() => {
        hideLoadingIndicator();

        const widgetElement = document.getElementById(widgetId);
        const hasWidgetContent = widgetElement &&
            (widgetElement.children.length > 0 ||
             widgetElement.innerHTML.trim() !== '');

        if (!hasWidgetContent) {

            showErrorMessage('Failed to load chart. Please try again or select another currency.');
        }
    }, 4000);

    script.onload = function() {
        setTimeout(() => {
            hideLoadingIndicator();
        }, 1000);
    };
}

function showLoadingIndicator() {
    const container = document.getElementById('mql5-widget-container');
    let loadingIndicator = container.querySelector('.loading-indicator');

    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Loading chart...</p>';
        container.appendChild(loadingIndicator);
    }

    loadingIndicator.style.display = 'flex';

    const errorMessage = container.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

function hideLoadingIndicator() {
    const container = document.getElementById('mql5-widget-container');
    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const container = document.getElementById('mql5-widget-container');
    let errorDiv = container.querySelector('.error-message');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        container.appendChild(errorDiv);
    }

    errorDiv.innerHTML = `<p>${message}</p>`;
    errorDiv.style.display = 'flex';
}

function handleCurrencyChange() {
    const select = document.getElementById('currency-select');
    currentCurrency = select.value;

    loadMQL5Widget(currentCurrency);
}

document.addEventListener('DOMContentLoaded', function() {

    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', handleCurrencyChange);
        currencySelect.value = currentCurrency;
    }

    loadMQL5Widget(currentCurrency);

    updateCurrencyPrices();

    setInterval(updateCurrencyPrices, 30000);
});