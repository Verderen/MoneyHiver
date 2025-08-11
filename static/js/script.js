document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
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
    const amount = parseFloat(document.getElementById("usdamount").value);
    const asset = document.getElementById("usdto-asset").value;
    const priceBefore = parseFloat(document.getElementById("price-before").value);
    const priceAfter = parseFloat(document.getElementById("price-after").value);
    const modal = document.getElementById("profitloss-modal");
    const resultContent = document.getElementById("profitloss-result");

    // Проверка ввода
    if (isNaN(amount) || isNaN(priceBefore) || isNaN(priceAfter)) {
        showAlert('error', 'Error', 'Please enter valid numbers!');
        return;
    }

    if (amount <= 0 || priceBefore <= 0 || priceAfter <= 0) {
        showAlert('error', 'Error', 'All values must be greater than zero!');
        return;
    }

    try {
        // Показываем спиннер загрузки
        const calculateBtn = document.getElementById("usdcalculate-btn");
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
                amount: amount,
                asset: asset,
                price_before: priceBefore,
                price_after: priceAfter
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;
            const profitClass = result.profit_loss >= 0 ? 'profit' : 'loss';

            resultContent.innerHTML = `
                <div class="pl-result">
                    <p>Initial Investment: $${result.initial_investment.toFixed(2)} in ${result.asset}</p>
                    <p>Current Value: $${result.current_value.toFixed(2)}</p>
                    <p class="${profitClass}">
                        ${result.profit_loss >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(result.profit_loss).toFixed(2)} (${result.percentage.toFixed(2)}%)
                    </p>
                </div>
            `;

            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Calculation failed');
        console.error("Calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        const calculateBtn = document.getElementById("usdcalculate-btn");
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
};

async function calculateAccruedInterest() {
    const amount = parseFloat(document.getElementById("aiamount").value);
    const fromCurrency = document.getElementById("aifrom-currency").value;
    const timePeriod = document.getElementById("time-period").value;
    const interestRate = parseFloat(document.getElementById("interest_rate").value);
    const modal = document.getElementById("conversion-modal"); // Можно использовать существующее модальное окно или создать новое
    const resultContent = document.getElementById("conversion-result");

    // Проверка ввода
    if (isNaN(amount) || isNaN(interestRate)) {
        showAlert('error', 'Error', 'Please enter valid numbers!');
        return;
    }

    if (amount <= 0) {
        showAlert('error', 'Error', 'Amount must be greater than zero!');
        return;
    }

    if (interestRate <= 0) {
        showAlert('error', 'Error', 'Interest rate must be greater than zero!');
        return;
    }

    try {
        // Показываем спиннер загрузки
        const calculateBtn = document.getElementById("aicalculate-btn");
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.innerHTML = `<span class="loading-spinner"></span>${originalBtnText}`;
        calculateBtn.disabled = true;

        // Отправляем данные на сервер
        const response = await fetch("/accrued_interest", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                from_currency: fromCurrency,
                time_period: timePeriod,
                interest_rate: interestRate
            })
        });

        const data = await response.json();

        if (data.status === "success") {
            const result = data.result;
            // Форматируем результат
            resultContent.innerHTML = `
                <div class="ai-result">
                    <p>Initial Amount: ${result.amount.toFixed(2)} ${result.from_currency}</p>
                    <p>Time Period: ${result.time_period}</p>
                    <p>Interest Rate: ${result.interest_rate}%</p>
                    <p class="interest-amount">Interest Amount: ${result.percentage.toFixed(2)} ${result.from_currency}</p>
                    <p class="total-profit"><strong>Total: ${result.profit.toFixed(2)} ${result.from_currency}</strong></p>
                </div>
            `;
            // Показываем модальное окно
            modal.classList.add('active');
        } else {
            showAlert('error', 'Error', data.error || 'Calculation failed');
        }
    } catch (error) {
        showAlert('error', 'Error', error.message || 'Calculation failed');
        console.error("Calculation error:", error);
    } finally {
        // Восстанавливаем кнопку
        const calculateBtn = document.getElementById("aicalculate-btn");
        calculateBtn.textContent = "Calculate";
        calculateBtn.disabled = false;
    }
};

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