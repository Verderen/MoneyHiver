document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('pl-type')?.addEventListener('change', showPLFields);

    function showPLFields() {
        document.querySelectorAll('.pl-fields').forEach(field => {
            field.style.display = 'none';
        });

        const selectedType = document.getElementById('pl-type').value;
        if (selectedType) {
            document.getElementById(`pl-${selectedType}-fields`).style.display = 'block';
        }
    }

    const marginTypeSelect = document.getElementById('type-margin');
    if (marginTypeSelect) {
        marginTypeSelect.addEventListener('change', showMarginFields);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

document.getElementById('contactForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const form = e.target;
    const emailInput = document.getElementById('contact-email');

    // Проверка авторизации
    if (!emailInput.value) {
        showAlert('error', 'Error!', 'Please sign in to contact us');
        return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;

    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
    form.classList.add('form-loading');

    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showAlert('success', 'Success!', data.success);
            form.reset();
        } else if (data.error) {
            showAlert('error', 'Error!', data.error);
        }
    })
    .catch(error => {
        const errorMsg = error.error || 'Failed to send message. Please try again.';
        showAlert('error', 'Error!', errorMsg);
    })
    .finally(() => {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalBtnText;
        form.classList.remove('form-loading');
    });
});

document.getElementById('subscribeForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;

    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
    form.classList.add('form-loading');

    try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', 'Success!', data.success);
            form.reset();
        } else if (data.error) {
            showAlert('error', 'Error!', data.error);
        }
    } catch (error) {
        showAlert('error', 'Error!', 'Failed to subscribe. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalBtnText;
        form.classList.remove('form-loading');
    }
});

});

    // Функция для показа алертов
function showAlert(type, title, message) {
    const alertContainer = document.getElementById('alert-container');

    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;

    const icons = {
        success: '✓',
        error: '✕'
    };

    alertElement.innerHTML = `
        <span class="alert-icon">${icons[type] || 'i'}</span>
        <div>
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
        <span class="alert-close">&times;</span>
    `;

    alertContainer.appendChild(alertElement);

    setTimeout(() => {
        alertElement.classList.add('show');
    }, 10);

    // Закрытие по клику на крестик
    const closeBtn = alertElement.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    });

    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 5000);
}

// Модальное окно для кнопки Count
async function convert() {
    const amount = parseFloat(document.getElementById("amount").value);
    const fromCurrency = document.getElementById("from-currency").value;
    const toAsset = document.getElementById("to-asset").value;
    const modal = document.getElementById("conversion-modal");
    const resultContent = document.getElementById("conversion-result");

    // Проверка ввода
    if (isNaN(amount)) {
        showAlert('error', 'Error', 'Please enter a valid amount!');
        return;
    }

    if (amount <= 0) {
        showAlert('error', 'Error', 'Amount must be greater than zero!');
        return;
    }

    try {
        // Показываем спиннер загрузки
        const calculateBtn = document.getElementById("calculate-btn");
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/calculate_conversion", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                from_currency: fromCurrency,
                to_asset: toAsset
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;
            // Форматируем результат
            resultContent.innerHTML = `
                <p class="conversion-amount">${result.amount.toFixed(2)} ${result.from_currency} = <strong>${result.converted_amount.toFixed(2)} ${result.to_asset}</strong></p>
                <p class="conversion-rate">Exchange rate: 1 ${result.from_currency} = ${result.exchange_rate.toFixed(6)} ${result.to_asset}</p>
            `;
            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Conversion failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Conversion failed');
        console.error("Conversion error:", error);
    } finally {
        // Восстанавливаем кнопку
        const calculateBtn = document.getElementById("calculate-btn");
        calculateBtn.textContent = "Convert";
        calculateBtn.disabled = false;
    }
};

async function calculateProfitLoss() {
    const assetType = document.getElementById('pl-type').value;
    const modal = document.getElementById("profitloss-modal");
    const resultContent = document.getElementById("profitloss-result");
    const calculateBtn = document.getElementById("pl-calculate-btn");

    if (!assetType) {
        showAlert('error', 'Error', 'Please select asset type');
        return;
    }

    try {
        let openPrice, closePrice, amount, pair, volume = null, leverage = null;

        // Получаем значения в зависимости от типа актива
        if (assetType === 'crypto') {
            openPrice = parseFloat(document.getElementById('pl-crypto-open-price').value);
            closePrice = parseFloat(document.getElementById('pl-crypto-close-price').value);
            amount = parseFloat(document.getElementById('pl-crypto-amount').value);
            pair = document.getElementById('pl-crypto-pair').value;
            leverage = document.getElementById('pl-crypto-leverage').value ?
                parseFloat(document.getElementById('pl-crypto-leverage').value) : null;
        } else if (assetType === 'forex') {
            openPrice = parseFloat(document.getElementById('pl-forex-open-price').value);
            closePrice = parseFloat(document.getElementById('pl-forex-close-price').value);
            amount = parseFloat(document.getElementById('pl-forex-lots').value);
            pair = document.getElementById('pl-forex-pair').value;
            volume = parseInt(document.getElementById('pl-forex-volume').value);
            leverage = parseFloat(document.getElementById('pl-forex-lev').value);
        } else if (assetType === 'stocks') {
            openPrice = parseFloat(document.getElementById('pl-stocks-open-price').value);
            closePrice = parseFloat(document.getElementById('pl-stocks-close-price').value);
            amount = parseFloat(document.getElementById('pl-stocks-amount').value);
            pair = document.getElementById('pl-stocks-pair').value;
            leverage = document.getElementById('pl-stocks-leverage').value ?
                parseFloat(document.getElementById('pl-stocks-leverage').value) : null;
        }

        // Проверка ввода
        if (isNaN(openPrice) || isNaN(closePrice) || isNaN(amount)) {
            showAlert('error', 'Error', 'Please enter valid numbers!');
            return;
        }

        if (openPrice <= 0 || closePrice <= 0 || amount <= 0) {
            showAlert('error', 'Error', 'All values must be greater than zero!');
            return;
        }

        // Для forex проверяем дополнительные поля
        if (assetType === 'forex' && (isNaN(volume) || isNaN(leverage))) {
            showAlert('error', 'Error', 'Volume and leverage are required for forex!');
            return;
        }

        // Показываем спиннер загрузки
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/calculate_profit_loss", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                asset_type: assetType,
                pair: pair,
                open_price: openPrice,
                close_price: closePrice,
                amount: amount,
                volume: volume,
                leverage: leverage
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;
            const profitClass = result.profit_loss >= 0 ? 'profit' : 'loss';
            const profitLossType = result.profit_loss >= 0 ? 'Profit' : 'Loss';

            resultContent.innerHTML = `
                <div class="pl-result">
                    <h4>Profit/Loss Calculation Results</h4>

                    <div class="result-group">
                        <p class="result-label">Asset Type:</p>
                        <p class="result-value">${result.asset_type.charAt(0).toUpperCase() + result.asset_type.slice(1)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Pair/Symbol:</p>
                        <p class="result-value">${result.pair}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Open Price:</p>
                        <p class="result-value">$${result.open_price.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Close Price:</p>
                        <p class="result-value">$${result.close_price.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Amount:</p>
                        <p class="result-value">${result.amount}</p>
                    </div>

                    ${result.volume ? `
                    <div class="result-group">
                        <p class="result-label">Volume:</p>
                        <p class="result-value">${result.volume}</p>
                    </div>
                    ` : ''}

                    ${result.leverage ? `
                    <div class="result-group">
                        <p class="result-label">Leverage:</p>
                        <p class="result-value">${result.leverage}x</p>
                    </div>
                    ` : ''}

                    <div class="result-group">
                        <p class="result-label">Position Size:</p>
                        <p class="result-value">$${result.position_size.toFixed(2)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">${profitLossType}:</p>
                        <p class="result-value ${profitClass}">$${Math.abs(result.profit_loss).toFixed(2)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">${profitLossType} Yield:</p>
                        <p class="result-value ${profitClass}">${result.profit_loss_yield.toFixed(2)}%</p>
                    </div>

                    ${result.margin ? `
                    <div class="result-group">
                        <p class="result-label">Margin:</p>
                        <p class="result-value">$${result.margin.toFixed(2)}</p>
                    </div>
                    ` : ''}
                </div>
            `;

            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Profit/Loss calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Profit/Loss calculation failed');
        console.error("Profit/Loss calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
}

// Добавляем обработчик изменения типа актива
document.getElementById('pl-type')?.addEventListener('change', function() {
    document.querySelectorAll('.pl-fields').forEach(field => {
        field.style.display = 'none';
    });

    const selectedType = this.value;
    if (selectedType) {
        document.getElementById(`pl-${selectedType}-fields`).style.display = 'block';
    }
});

async function calculateDividend() {
    const priceOf1Share = parseFloat(document.getElementById("div-priceshare").value);
    const fromCurrency = document.getElementById("div-fromcurrency").value;
    const numberOfShares = parseFloat(document.getElementById("div-numbershares").value);
    const divPer1Share = parseFloat(document.getElementById("div-divshare").value);
    const payPeriod = document.getElementById("div-payperiod").value;
    const ownPeriod = parseFloat(document.getElementById("div-ownperiod").value);
    const taxRate = parseFloat(document.getElementById("div-taxrate").value);
    const divGrowth = parseFloat(document.getElementById("div-divgrowth").value) || 0;

    const modal = document.getElementById("div-modal");
    const resultContent = document.getElementById("div-modal-result");
    const calculateBtn = document.getElementById("div-calculate-btn");

    // Проверка ввода
    if (isNaN(priceOf1Share) || isNaN(numberOfShares) || isNaN(divPer1Share) ||
        isNaN(ownPeriod) || isNaN(taxRate)) {
        showAlert('error', 'Error', 'Please fill in all required fields with valid numbers!');
        return;
    }

    if (priceOf1Share <= 0 || numberOfShares <= 0 || divPer1Share <= 0 ||
        ownPeriod <= 0 || taxRate <= 0) {
        showAlert('error', 'Error', 'All values must be greater than zero!');
        return;
    }

    try {
        // Показываем спиннер загрузки
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/dividend", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                price_of_1_share: priceOf1Share,
                from_currency: fromCurrency,
                number_of_shares: numberOfShares,
                div_per_1_share: divPer1Share,
                pay_period: payPeriod,
                own_period: ownPeriod,
                tax_rate: taxRate,
                div_growth: divGrowth
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;

            // Форматируем результат
            resultContent.innerHTML = `
                <div class="div-result">
                    <h4>Dividend Calculation Results</h4>

                    <div class="result-group">
                        <p class="result-label">Total Dividend (with tax and growth):</p>
                        <p class="result-value">${result.total_with_div_tax.toFixed(2)} ${fromCurrency}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Dividend (with tax, no growth):</p>
                        <p class="result-value">${result.total_with_tax_no_div.toFixed(2)} ${fromCurrency}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Dividend (no tax, with growth):</p>
                        <p class="result-value">${result.total_with_div_no_tax.toFixed(2)} ${fromCurrency}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Dividend (no tax, no growth):</p>
                        <p class="result-value">${result.total_no_div_no_tax.toFixed(2)} ${fromCurrency}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Dividend Yield (with tax):</p>
                        <p class="result-value">${result.div_yield_with_tax.toFixed(2)}%</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Dividend Yield (no tax):</p>
                        <p class="result-value">${result.div_yield_no_tax.toFixed(2)}%</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Period Dividend Yield (with tax):</p>
                        <p class="result-value">${result.div_yield_with_tax_whole_period.toFixed(2)}%</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Period Dividend Yield (no tax):</p>
                        <p class="result-value">${result.div_yield_no_tax_whole_period.toFixed(2)}%</p>
                    </div>
                </div>
            `;

            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Dividend calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Dividend calculation failed');
        console.error("Dividend calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
}

function showMarginFields() {

    document.querySelectorAll('.margin-fields').forEach(field => {
        field.style.display = 'none';
    });

    const selectedType = document.getElementById('type-margin').value;
    if (selectedType) {
        document.getElementById(`${selectedType}-fields`).style.display = 'block';
    }
}

async function calculateMargin() {
    const assetType = document.getElementById('type-margin').value;
    const modal = document.getElementById("mar-modal");
    const resultContent = document.getElementById("mar-modal-result");
    const calculateBtn = document.getElementById("mar-calculate-btn");

    if (!assetType) {
        showAlert('error', 'Error', 'Please select asset type');
        return;
    }

    try {
        let pricePerShare, numberOfShares, leverage, pair;

        // Получаем значения в зависимости от типа актива
        if (assetType === 'crypto') {
            pricePerShare = parseFloat(document.getElementById('crypto-1-share').value);
            numberOfShares = parseFloat(document.getElementById('crypto-num-shares').value);
            leverage = parseFloat(document.getElementById('crypto-leverage').value);
            pair = document.getElementById('crypto-pair').value;
        } else if (assetType === 'forex') {
            pricePerShare = parseFloat(document.getElementById('forex-1-share').value);
            numberOfShares = parseFloat(document.getElementById('forex-num-shares').value);
            leverage = parseFloat(document.getElementById('forex-leverage').value);
            pair = document.getElementById('forex-pair').value;
        } else if (assetType === 'futures') {
            pricePerShare = parseFloat(document.getElementById('futures-1-share').value);
            numberOfShares = parseFloat(document.getElementById('futures-num-shares').value);
            leverage = parseFloat(document.getElementById('futures-leverage').value);
            pair = document.getElementById('futures-contract').value;
        } else if (assetType === 'stocks') {
            pricePerShare = parseFloat(document.getElementById('stocks-1-share').value);
            numberOfShares = parseFloat(document.getElementById('stocks-num-shares').value);
            leverage = parseFloat(document.getElementById('stocks-leverage').value);
            pair = document.getElementById('stocks-symbol').value;
        }

        // Проверка ввода
        if (isNaN(pricePerShare) || isNaN(numberOfShares) || isNaN(leverage) || !pair) {
            showAlert('error', 'Error', 'Please fill in all fields with valid values');
            return;
        }

        if (pricePerShare <= 0 || numberOfShares <= 0 || leverage <= 0) {
            showAlert('error', 'Error', 'All values must be greater than zero');
            return;
        }

        // Показываем спиннер загрузки
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/margin", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                asset_type: assetType,
                pair: pair,
                price_per_1_share: pricePerShare,
                number_of_shares: numberOfShares,
                leverage: leverage
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;
            const volume = pricePerShare * numberOfShares;
            const margin = volume / leverage;

            // Форматируем результат
            resultContent.innerHTML = `
                <div class="result-card">
                    <h3>Margin Calculation Result</h3>
                    <div class="result-group">
                        <p class="result-label">Asset Type:</p>
                        <p class="result-value">${assetType.charAt(0).toUpperCase() + assetType.slice(1)}</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Pair/Symbol:</p>
                        <p class="result-value">${pair}</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Price per Share:</p>
                        <p class="result-value">$${pricePerShare.toFixed(2)}</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Number of Shares:</p>
                        <p class="result-value">${numberOfShares}</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Trade Volume:</p>
                        <p class="result-value">$${volume.toFixed(2)}</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Leverage:</p>
                        <p class="result-value">${leverage}x</p>
                    </div>
                    <div class="result-group">
                        <p class="result-label">Required Margin:</p>
                        <p class="result-value">$${margin.toFixed(2)}</p>
                    </div>
                </div>
            `;

            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Margin calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Margin calculation failed');
        console.error("Margin calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
}

async function RRRCalculate() {
    const openPrice = parseFloat(document.getElementById("open-price").value);
    const takeProfit = parseFloat(document.getElementById("take-profit").value);
    const stopLoss = parseFloat(document.getElementById("stop-loss").value);
    const balance = parseFloat(document.getElementById("balance").value);
    const riskPerTrade = parseFloat(document.getElementById("risk-per-trade").value);

    const modal = document.getElementById("rrr-modal");
    const resultContent = document.getElementById("rrr-modal-result");
    const calculateBtn = document.getElementById("rrr-calculate-btn");

    // Проверка ввода
    if (isNaN(openPrice) || isNaN(takeProfit) || isNaN(stopLoss) ||
        isNaN(balance) || isNaN(riskPerTrade)) {
        showAlert('error', 'Error', 'Please fill in all fields with valid numbers!');
        return;
    }

    if (openPrice <= 0 || takeProfit <= 0 || stopLoss <= 0 ||
        balance <= 0 || riskPerTrade <= 0) {
        showAlert('error', 'Error', 'All values must be greater than zero!');
        return;
    }

    if (stopLoss >= openPrice) {
        showAlert('error', 'Error', 'Stop loss must be less than open price!');
        return;
    }

    if (takeProfit <= openPrice) {
        showAlert('error', 'Error', 'Take profit must be greater than open price!');
        return;
    }

    try {
        // Показываем спиннер загрузки
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/rrr", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                open_price: openPrice,
                take_profit: takeProfit,
                stop_loss: stopLoss,
                balance: balance,
                risk_per_trade: riskPerTrade
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;

            // Форматируем результат
            resultContent.innerHTML = `
                <div class="rrr-result">
                    <h4>Risk/Reward Ratio & Position Size Calculation Results</h4>

                    <div class="result-group">
                        <p class="result-label">Open Price:</p>
                        <p class="result-value">$${openPrice.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Take Profit:</p>
                        <p class="result-value">$${takeProfit.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Stop Loss:</p>
                        <p class="result-value">$${stopLoss.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Balance:</p>
                        <p class="result-value">$${balance.toFixed(2)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Risk per Trade:</p>
                        <p class="result-value">${riskPerTrade.toFixed(2)}%</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Position Size:</p>
                        <p class="result-value">${result.position_size.toFixed(4)} shares</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Position Cost:</p>
                        <p class="result-value">$${result.position_cost.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Risk/Reward Ratio:</p>
                        <p class="result-value">${result.rrr.toFixed(2)}:1</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Profit per Share:</p>
                        <p class="result-value">$${result.profit_per_share.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Risk per Share:</p>
                        <p class="result-value">$${result.risk_per_share.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Profit:</p>
                        <p class="result-value profit">$${result.total_profit.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Total Risk:</p>
                        <p class="result-value loss">$${result.total_risk.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Balance after Profit:</p>
                        <p class="result-value profit">$${result.balance_after_profit.toFixed(4)}</p>
                    </div>

                    <div class="result-group">
                        <p class="result-label">Balance after Loss:</p>
                        <p class="result-value loss">$${result.balance_after_loss.toFixed(4)}</p>
                    </div>
                </div>
            `;

            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Risk/Reward calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Risk/Reward calculation failed');
        console.error("Risk/Reward calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
}

////////////////////

// Обработка навигации с якорями
function handleAnchorNavigation() {
    // Проверяем, есть ли якорь в URL при загрузке страницы
    const hash = window.location.hash;
    if (hash) {
        scrollToAnchor(hash);
    }

    // Обработка кликов по ссылкам с якорями
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // Если ссылка ведет на другую страницу с якорем
            if (this.href.includes('/#') && !this.href.startsWith(window.location.origin + window.location.pathname)) {
                e.preventDefault();

                const urlParts = this.href.split('#');
                const baseUrl = urlParts[0];
                const anchorId = '#' + urlParts[1];

                // Переходим на страницу и затем прокручиваем к якорю
                window.location.href = baseUrl;

                // Сохраняем якорь для использования после загрузки
                sessionStorage.setItem('targetAnchor', anchorId);
            }
        });
    });
}

// Функция для прокрутки к якорю
function scrollToAnchor(anchorId) {
    const targetElement = document.querySelector(anchorId);
    if (targetElement) {
        setTimeout(() => {
            window.scrollTo({
                top: targetElement.offsetTop - 100, // Отступ сверху
                behavior: 'smooth'
            });

            // Добавляем подсветку для лучшей видимости
            targetElement.style.transition = 'background-color 0.5s ease';
            targetElement.style.backgroundColor = '#ffffff';

            setTimeout(() => {
                targetElement.style.backgroundColor = '';
            }, 2000);
        }, 100); // Небольшая задержка для полной загрузки страницы
    }
}

// Проверяем сохраненный якорь при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    handleAnchorNavigation();

    // Проверяем, есть ли сохраненный якорь из sessionStorage
    const savedAnchor = sessionStorage.getItem('targetAnchor');
    if (savedAnchor) {
        scrollToAnchor(savedAnchor);
        sessionStorage.removeItem('targetAnchor'); // Очищаем после использования
    }

    // Также проверяем якорь в текущем URL
    const currentHash = window.location.hash;
    if (currentHash) {
        setTimeout(() => {
            scrollToAnchor(currentHash);
        }, 100);
    }
});

////////////////////

document.querySelector('.notification-form form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;

    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;

    try {
        const formData = new FormData(form);
        const response = await fetch("/subscribe", {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', 'Success!', data.success);
            form.reset();
        } else if (data.error) {
            showAlert('error', 'Error!', data.error);
        }
    } catch (error) {
        showAlert('error', 'Error!', 'Failed to subscribe. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalBtnText;
    }
});

// Добавляем обработчики закрытия модальных окон
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });

    // Закрытие по клику вне модального окна
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
});