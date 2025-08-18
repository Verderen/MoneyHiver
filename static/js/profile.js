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

    // ========== Функционал для работы с активами (новый код) ==========

    // Функции для работы с модальным окном добавления
    const closeAddItemModal = () => {
        addItemModal.style.display = "none";
        // Сброс формы при закрытии
        cryptoForm.style.display = "none";
        currencyForm.style.display = "none";
    };

    if (closeAddItemBtn) closeAddItemBtn.addEventListener('click', closeAddItemModal);
    if (cancelAddItemBtn) cancelAddItemBtn.addEventListener('click', closeAddItemModal);

    // Выбор типа актива
    if (selectCryptoBtn) {
        selectCryptoBtn.addEventListener('click', function() {
            cryptoForm.style.display = "block";
            currencyForm.style.display = "none";
        });
    }

    // Обработчики кнопок добавления
    addItemButtons.forEach(button => {
        button.addEventListener('click', function() {
            addItemModal.style.display = "block";
            // Сброс форм при открытии
            cryptoForm.style.display = "none";
            currencyForm.style.display = "none";
        });
    });

    // Функции для работы с активами
    async function loadAssets() {
        try {
            const response = await fetch('/api/assets');
            if (!response.ok) throw new Error('Ошибка загрузки активов');
            const data = await response.json();
            renderAssets(data.assets);
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить активы: ' + error.message);
        }
    }

    function renderAssets(assets) {
        cryptoAssetsList.innerHTML = '';

        assets.forEach(asset => {
            const itemElement = createAssetElement(asset);
            if (asset.type === 'crypto') {
                cryptoAssetsList.appendChild(itemElement);
            }
        });
    }

    function createAssetElement(asset) {
        const itemElement = document.createElement('div');
        itemElement.className = 'asset-item';
        itemElement.dataset.id = asset.id || asset.asset_id;

        if (asset.type === 'crypto') {
            itemElement.innerHTML = `
                <div class="asset-header">
                    <h4>${asset.crypto_type}</h4>
                    <div class="asset-actions">
                        <button class="edit-asset">✏️</button>
                        <button class="delete-asset">🗑️</button>
                    </div>
                </div>
                <div class="asset-details">
                    <p>Amount: ${asset.amount}</p>
                    <p>Price: ${asset.price_per_unit} ${asset.price_currency}</p>
                </div>
            `;
        } else {
            itemElement.innerHTML = `
                <div class="asset-header">
                    <h4>${asset.currency_type} → ${asset.exchange_for}</h4>
                    <div class="asset-actions">
                        <button class="edit-asset">✏️</button>
                        <button class="delete-asset">🗑️</button>
                    </div>
                </div>
                <div class="asset-details">
                    <p>Amount: ${asset.amount}</p>
                    <p>Rate: 1 ${asset.currency_type} = ${asset.exchange_rate} ${asset.exchange_for}</p>
                </div>
            `;
        }

        itemElement.querySelector('.delete-asset').addEventListener('click', () => deleteAsset(asset));
        itemElement.querySelector('.edit-asset').addEventListener('click', () => editAsset(asset));

        return itemElement;
    }

    async function deleteAsset(asset) {
        if (!confirm('Вы уверены, что хотите удалить этот актив?')) return;

        try {
            const endpoint = `/api/assets/${asset.type}/${asset.id || asset.asset_id}`;
            const response = await fetch(endpoint, { method: 'DELETE' });

            if (!response.ok) throw new Error('Ошибка удаления');
            loadAssets();
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось удалить актив: ' + error.message);
        }
    }

    function editAsset(asset) {
        addItemModal.style.display = "block";

        if (asset.type === 'crypto') {
            selectCryptoBtn.click();
            document.getElementById('cryptoType').value = asset.crypto_type;
            document.getElementById('cryptoAmount').value = asset.amount;
            document.getElementById('cryptoPrice').value = asset.price_per_unit;
            document.getElementById('cryptoPriceCurrency').value = asset.price_currency;
        } else {
            selectCurrencyBtn.click();
            document.getElementById('currencyType').value = asset.currency_type;
            document.getElementById('currencyAmount').value = asset.amount;
            document.getElementById('exchangeCurrency').value = asset.exchange_for;
            document.getElementById('exchangeRate').value = asset.exchange_rate;
        }
    }

saveItemBtn.addEventListener('click', async function() {
    let itemData = {};
    let endpoint = '';
    let method = 'POST';

    if (cryptoForm.style.display === "block") {
        const cryptoType = document.getElementById("cryptoType").value;
        const cryptoAmount = document.getElementById("cryptoAmount").value;
        const cryptoPrice = document.getElementById("cryptoPrice").value;
        const cryptoPriceCurrency = document.getElementById("cryptoPriceCurrency").value;

        if (!cryptoType || !cryptoAmount || !cryptoPrice || !cryptoPriceCurrency) {
            alert("Please fill all crypto fields");
            return;
        }

        itemData = {
            crypto_type: cryptoType,
            amount: parseFloat(cryptoAmount),
            price_per_unit: parseFloat(cryptoPrice),
            price_currency: cryptoPriceCurrency
        };
        endpoint = '/api/assets/crypto';
    } else {
        alert("Please select item type first");
        return;
    }

    try {
        console.log("Sending data:", itemData); // Логируем отправляемые данные

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(itemData),
            credentials: 'include' // Важно для передачи куки
        });

        console.log("Response status:", response.status); // Логируем статус ответа

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const responseData = await response.json();
        console.log("Server response:", responseData); // Логируем ответ сервера

        closeAddItemModal();
        loadAssets();
    } catch (error) {
        console.error('Error saving asset:', error);
        alert(`Error saving asset: ${error.message}`);
    }
});

    // Инициализация - загрузка активов при старте
    loadAssets();
});