document.addEventListener('DOMContentLoaded', function() {
    // Элементы основного модального окна
    const modal = document.getElementById("editProfileModal");
    const editBtn = document.querySelector(".edit-profile");
    const closeBtn = document.querySelector(".close-modal");

    // Элементы модального окна изменения описания
    const descriptionModal = document.getElementById("changeDescriptionModal");
    const changeDescBtn = document.querySelector(".change-description");
    const closeDescBtn = document.querySelector(".close-description-modal");
    const cancelDescBtn = document.querySelector(".cancel-description");
    const saveDescBtn = document.querySelector(".save-description");

    // Элементы для работы с активами
    const addItemModal = document.getElementById("addItemModal");
    const addItemButtons = document.querySelectorAll('.add-item-button');
    const closeAddItemBtn = document.querySelector(".close-add-item-modal");
    const cancelAddItemBtn = document.querySelector(".cancel-add-item");
    const saveItemBtn = document.querySelector(".save-item");
    const selectCryptoBtn = document.querySelector(".select-crypto");
    const cryptoForm = document.getElementById("cryptoForm");
    const cryptoAssetsList = document.getElementById('cryptoAssetsList');

    // ========== Обработчики модальных окон (старый код) ==========

    // Открытие/закрытие основного модального окна
    if (editBtn) editBtn.addEventListener("click", () => modal.style.display = "block");
    if (closeBtn) closeBtn.addEventListener("click", () => modal.style.display = "none");

    // Открытие/закрытие модального окна описания
    if (changeDescBtn) changeDescBtn.addEventListener("click", () => {
        modal.style.display = "none";
        descriptionModal.style.display = "block";
    });

    const closeDescriptionModal = () => descriptionModal.style.display = "none";
    if (closeDescBtn) closeDescBtn.addEventListener("click", closeDescriptionModal);
    if (cancelDescBtn) cancelDescBtn.addEventListener("click", closeDescriptionModal);

    // Сохранение описания
    if (saveDescBtn) {
        saveDescBtn.addEventListener("click", function() {
            const newDesc = document.getElementById("newDescription").value.trim();
            if (!newDesc) {
                alert("Описание не может быть пустым");
                return;
            }

            fetch('/update_description', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ description: newDesc })
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                document.querySelector(".description").textContent = newDesc;
                closeDescriptionModal();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Ошибка при сохранении: ' + error.message);
            });
        });
    }

    // Закрытие модальных окон при клике вне их области
    window.addEventListener("click", function(event) {
        if (event.target == modal) modal.style.display = "none";
        if (event.target == descriptionModal) closeDescriptionModal();
        if (event.target == addItemModal) closeAddItemModal();
    });

    // ========== Функции для работы с сохраненными расчетами ==========

    // Функция для загрузки сохраненных расчетов
    function loadSavedCalculations() {
        // Загрузка сохраненных Profit/Loss расчетов
        fetch('/get_saved_pl')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'transaction-history-list', 'saved-transaction-history', 'pl');
                }
            })
            .catch(error => console.error('Error loading saved PL:', error));

        // Загрузка сохраненных Dividend расчетов
        fetch('/get_saved_div')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'dividend-payments-list', 'saved-dividend-payments', 'div');
                }
            })
            .catch(error => console.error('Error loading saved DIV:', error));

        // Загрузка сохраненных RRR расчетов
        fetch('/get_saved_rrr')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'trading-ideas-list', 'saved-trading-ideas', 'rrr');
                }
            })
            .catch(error => console.error('Error loading saved RRR:', error));
    }

    // Функция для отображения сохраненных расчетов
function displaySavedCalculations(calculations, listId, sectionId, type) {
    const listElement = document.getElementById(listId);
    const sectionElement = document.getElementById(sectionId);

    if (!listElement || !sectionElement) {
        console.error(`Element not found: ${listId} or ${sectionId}`);
        return;
    }

    listElement.innerHTML = '';

    if (calculations.length === 0) {
        sectionElement.style.display = 'none';
        return;
    }

    calculations.forEach(calc => {
        const calculationItem = document.createElement('div');
        calculationItem.className = 'saved-calculation-item';
        calculationItem.dataset.id = calc.calculation_id;
        calculationItem.dataset.type = type;

        // Форматируем дату
        let dateDisplay = '';
        if (calc.calculation_date) {
            try {
                // Парсим дату из ISO формата
                const dateObj = new Date(calc.calculation_date);
                dateDisplay = dateObj.toLocaleDateString();
            } catch (e) {
                console.warn('Error parsing date:', e);
                dateDisplay = calc.calculation_date; // используем как есть, если не удалось распарсить
            }
        }

        calculationItem.innerHTML = `
            <div class="calculation-header">
                <div>
                    <h4 class="calculation-title">${calc.title || 'Untitled'}</h4>
                    ${dateDisplay ? `<p class="calculation-date">${dateDisplay}</p>` : ''}
                </div>
            </div>
            <div class="calculation-actions">
                <button class="details-btn" onclick="showCalculationDetails(${calc.calculation_id}, '${type}')">Details</button>
                <button class="delete-btn" onclick="deleteCalculation(${calc.calculation_id}, '${type}')">Delete</button>
            </div>
        `;

        listElement.appendChild(calculationItem);
    });

    // Показываем секцию
    sectionElement.style.display = 'block';
}

    // Функция для показа деталей расчета
    window.showCalculationDetails = function(calculationId, type) {
        let endpoint = '';
        switch(type) {
            case 'pl':
                endpoint = '/get_pl_details';
                break;
            case 'div':
                endpoint = '/get_div_details';
                break;
            case 'rrr':
                endpoint = '/get_rrr_details';
                break;
            default:
                console.error('Unknown calculation type:', type);
                return;
        }

        fetch(`${endpoint}?id=${calculationId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayCalculationDetails(data.calculation, type);
                } else {
                    alert('Error loading calculation details: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error loading calculation details');
            });
    }

    // Функция для отображения деталей расчета в модальном окне
    function displayCalculationDetails(calculation, type) {
        const modal = document.getElementById('calculationDetailsModal');
        const titleElement = document.getElementById('details-modal-title');
        const contentElement = document.getElementById('calculation-details-content');

        if (!modal || !titleElement || !contentElement) {
            console.error('Modal elements not found');
            return;
        }

        titleElement.textContent = calculation.title || 'Calculation Details';

        let detailsHTML = '';

        if (type === 'pl') {
            detailsHTML = `
                <div class="detail-section">
                    <h4>Input Parameters</h4>
                    <div class="detail-group">
                        <p class="detail-label">Asset Type</p>
                        <p class="detail-value">${calculation.asset_type || 'N/A'}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Open Price</p>
                        <p class="detail-value">$${(calculation.open_price || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Close Price</p>
                        <p class="detail-value">$${(calculation.close_price || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Amount</p>
                        <p class="detail-value">${calculation.amount || 0}</p>
                    </div>
                    ${calculation.volume ? `
                    <div class="detail-group">
                        <p class="detail-label">Volume</p>
                        <p class="detail-value">${calculation.volume}</p>
                    </div>
                    ` : ''}
                    ${calculation.leverage ? `
                    <div class="detail-group">
                        <p class="detail-label">Leverage</p>
                        <p class="detail-value">${calculation.leverage}x</p>
                    </div>
                    ` : ''}
                </div>
                <div class="detail-section">
                    <h4>Calculation Results</h4>
                    <div class="detail-group">
                        <p class="detail-label">Position Size</p>
                        <p class="detail-value">$${(calculation.position_size || 0).toFixed(2)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Profit/Loss</p>
                        <p class="detail-value ${(calculation.profit_loss || 0) >= 0 ? 'profit' : 'loss'}">$${Math.abs(calculation.profit_loss || 0).toFixed(2)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Profit/Loss Yield</p>
                        <p class="detail-value">${(calculation.profit_loss_yield || 0).toFixed(2)}%</p>
                    </div>
                    ${calculation.margin ? `
                    <div class="detail-group">
                        <p class="detail-label">Margin</p>
                        <p class="detail-value">$${(calculation.margin || 0).toFixed(2)}</p>
                    </div>
                    ` : ''}
                </div>
            `;
        } else if (type === 'div') {
            detailsHTML = `
                <div class="detail-section">
                    <h4>Input Parameters</h4>
                    <div class="detail-group">
                        <p class="detail-label">Price per Share</p>
                        <p class="detail-value">${(calculation.price_of_1_share || 0).toFixed(2)} ${calculation.from_currency || 'USD'}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Number of Shares</p>
                        <p class="detail-value">${calculation.number_of_shares || 0}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Dividend per Share</p>
                        <p class="detail-value">${(calculation.div_per_1_share || 0).toFixed(2)} ${calculation.from_currency || 'USD'}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Payment Period</p>
                        <p class="detail-value">${calculation.pay_period === 'month' ? 'Monthly' : 'Yearly'}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Ownership Period</p>
                        <p class="detail-value">${calculation.own_period || 0} years</p>
                    </div>
                    ${calculation.tax_rate ? `
                    <div class="detail-group">
                        <p class="detail-label">Tax Rate</p>
                        <p class="detail-value">${calculation.tax_rate}%</p>
                    </div>
                    ` : ''}
                    ${calculation.div_growth ? `
                    <div class="detail-group">
                        <p class="detail-label">Dividend Growth</p>
                        <p class="detail-value">${calculation.div_growth}% annually</p>
                    </div>
                    ` : ''}
                </div>
                <div class="detail-section">
                    <h4>Calculation Results</h4>
                    <div class="detail-group">
                        <p class="detail-label">Total Dividend Income</p>
                        <p class="detail-value">${(calculation.total_div || 0).toFixed(2)} ${calculation.from_currency || 'USD'}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Annual Dividend Yield</p>
                        <p class="detail-value">${(calculation.div_yield || 0).toFixed(2)}%</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Total Period Dividend Yield</p>
                        <p class="detail-value">${(calculation.total_div_yield || 0).toFixed(2)}%</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Average Annual Return</p>
                        <p class="detail-value">${(calculation.ave_ann_ret || 0).toFixed(2)}%</p>
                    </div>
                </div>
            `;
        } else if (type === 'rrr') {
            detailsHTML = `
                <div class="detail-section">
                    <h4>Input Parameters</h4>
                    <div class="detail-group">
                        <p class="detail-label">Open Price</p>
                        <p class="detail-value">$${(calculation.open_price || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Take Profit</p>
                        <p class="detail-value">$${(calculation.take_profit || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Stop Loss</p>
                        <p class="detail-value">$${(calculation.stop_loss || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Balance</p>
                        <p class="detail-value">$${(calculation.balance || 0).toFixed(2)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Risk per Trade</p>
                        <p class="detail-value">${(calculation.risk_per_trade || 0).toFixed(2)}%</p>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Calculation Results</h4>
                    <div class="detail-group">
                        <p class="detail-label">Position Size</p>
                        <p class="detail-value">${(calculation.position_size || 0).toFixed(4)} shares</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Position Cost</p>
                        <p class="detail-value">$${(calculation.position_cost || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Risk/Reward Ratio</p>
                        <p class="detail-value">${(calculation.rrr || 0).toFixed(2)}:1</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Total Profit</p>
                        <p class="detail-value profit">$${(calculation.total_profit || 0).toFixed(4)}</p>
                    </div>
                    <div class="detail-group">
                        <p class="detail-label">Total Risk</p>
                        <p class="detail-value loss">$${(calculation.total_risk || 0).toFixed(4)}</p>
                    </div>
                </div>
            `;
        }

        contentElement.innerHTML = detailsHTML;
        modal.style.display = 'block';
    }

    // Функция для удаления расчета
    window.deleteCalculation = function(calculationId, type) {
        if (!confirm('Are you sure you want to delete this calculation?')) {
            return;
        }

        let endpoint = '';
        switch(type) {
            case 'pl':
                endpoint = '/delete_pl';
                break;
            case 'div':
                endpoint = '/delete_div';
                break;
            case 'rrr':
                endpoint = '/delete_rrr';
                break;
            default:
                console.error('Unknown calculation type:', type);
                return;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ calculation_id: calculationId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Удаляем элемент из DOM
                const itemToRemove = document.querySelector(`.saved-calculation-item[data-id="${calculationId}"][data-type="${type}"]`);
                if (itemToRemove) {
                    itemToRemove.remove();
                }

                // Проверяем, остались ли еще элементы в списке
                const listElement = document.querySelector(`#${type === 'pl' ? 'transaction-history-list' : type === 'div' ? 'dividend-payments-list' : 'trading-ideas-list'}`);
                if (listElement && listElement.children.length === 0) {
                    const sectionElement = document.getElementById(`${type === 'pl' ? 'saved-transaction-history' : type === 'div' ? 'saved-dividend-payments' : 'saved-trading-ideas'}`);
                    if (sectionElement) {
                        sectionElement.style.display = 'none';
                    }
                }

                alert('Calculation deleted successfully');
            } else {
                alert('Error deleting calculation: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting calculation');
        });
    }

    // Добавляем обработчик закрытия модального окна с деталями
    const detailsModalCloseBtn = document.querySelector('#calculationDetailsModal .close-modal');
    if (detailsModalCloseBtn) {
        detailsModalCloseBtn.addEventListener('click', function() {
            document.getElementById('calculationDetailsModal').style.display = 'none';
        });
    }

    // Закрытие модального окна при клике вне его области
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('calculationDetailsModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Загружаем сохраненные расчеты при загрузке страницы
    loadSavedCalculations();

    // ========== Вспомогательные функции ==========

    function closeAddItemModal() {
        if (addItemModal) {
            addItemModal.style.display = 'none';
        }
    }

    // Инициализация других обработчиков, если они есть
    if (addItemButtons) {
        addItemButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Логика открытия модального окна добавления элемента
                if (addItemModal) {
                    addItemModal.style.display = 'block';
                }
            });
        });
    }

    if (closeAddItemBtn) {
        closeAddItemBtn.addEventListener('click', closeAddItemModal);
    }

    if (cancelAddItemBtn) {
        cancelAddItemBtn.addEventListener('click', closeAddItemModal);
    }
});