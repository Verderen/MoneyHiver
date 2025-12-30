document.addEventListener('DOMContentLoaded', function() {

    let currentDeleteId = null;
    let currentDeleteType = null;

    function loadSavedCalculations() {

        fetch('/get_saved_pl')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'transaction-history-list', 'saved-transaction-history', 'pl');
                }
            })
            .catch(error => console.error('Error loading saved PL:', error));

        fetch('/get_saved_div')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'dividend-payments-list', 'saved-dividend-payments', 'div');
                }
            })
            .catch(error => console.error('Error loading saved DIV:', error));

        fetch('/get_saved_rrr')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.calculations && data.calculations.length > 0) {
                    displaySavedCalculations(data.calculations, 'trading-ideas-list', 'saved-trading-ideas', 'rrr');
                }
            })
            .catch(error => console.error('Error loading saved RRR:', error));
    }

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

            let dateDisplay = '';
            if (calc.calculation_date) {
                try {

                    const dateObj = new Date(calc.calculation_date);
                    dateDisplay = dateObj.toLocaleDateString();
                } catch (e) {
                    console.warn('Error parsing date:', e);
                    dateDisplay = calc.calculation_date;
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

        sectionElement.style.display = 'block';
    }

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
                    showNotification('Error loading calculation details: ' + (data.error || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading calculation details', 'error');
            });
    }

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

    window.deleteCalculation = function(calculationId, type) {
        currentDeleteId = calculationId;
        currentDeleteType = type;

        const itemElement = document.querySelector(`.saved-calculation-item[data-id="${calculationId}"][data-type="${type}"]`);
        let title = 'Untitled';

        if (itemElement) {
            const titleElement = itemElement.querySelector('.calculation-title');
            if (titleElement) {
                title = titleElement.textContent;
            }
        }

        document.getElementById('delete-item-title').textContent = title;

        document.getElementById('deleteConfirmationModal').style.display = 'block';
    }

    window.confirmDelete = function() {
        if (!currentDeleteId || !currentDeleteType) {
            console.error('No calculation selected for deletion');
            return;
        }

        let endpoint = '';
        switch(currentDeleteType) {
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
                console.error('Unknown calculation type:', currentDeleteType);
                return;
        }

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ calculation_id: currentDeleteId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {

                const itemToRemove = document.querySelector(`.saved-calculation-item[data-id="${currentDeleteId}"][data-type="${currentDeleteType}"]`);
                if (itemToRemove) {
                    itemToRemove.remove();
                }

                const listElement = document.querySelector(`#${currentDeleteType === 'pl' ? 'transaction-history-list' : currentDeleteType === 'div' ? 'dividend-payments-list' : 'trading-ideas-list'}`);
                if (listElement && listElement.children.length === 0) {
                    const sectionElement = document.getElementById(`${currentDeleteType === 'pl' ? 'saved-transaction-history' : currentDeleteType === 'div' ? 'saved-dividend-payments' : 'saved-trading-ideas'}`);
                    if (sectionElement) {
                        sectionElement.style.display = 'none';
                    }
                }

                showNotification('Calculation deleted successfully', 'success');
            } else {
                showNotification('Error deleting calculation: ' + (data.error || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error deleting calculation', 'error');
        })
        .finally(() => {
            closeDeleteModal();
        });
    }

    window.closeDeleteModal = function() {
        document.getElementById('deleteConfirmationModal').style.display = 'none';
        currentDeleteId = null;
        currentDeleteType = null;
    }

    function showNotification(message, type) {

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#2e7d32';
        } else {
            notification.style.backgroundColor = '#dc3545';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    const detailsModalCloseBtn = document.querySelector('#calculationDetailsModal .close-modal');
    if (detailsModalCloseBtn) {
        detailsModalCloseBtn.addEventListener('click', function() {
            document.getElementById('calculationDetailsModal').style.display = 'none';
        });
    }

    const deleteModalCloseBtn = document.querySelector('#deleteConfirmationModal .close-modal');
    if (deleteModalCloseBtn) {
        deleteModalCloseBtn.addEventListener('click', closeDeleteModal);
    }

    window.addEventListener('click', function(event) {
        const detailsModal = document.getElementById('calculationDetailsModal');
        const deleteModal = document.getElementById('deleteConfirmationModal');

        if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        }
        if (event.target == deleteModal) {
            closeDeleteModal();
        }
    });

    loadSavedCalculations();
});