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