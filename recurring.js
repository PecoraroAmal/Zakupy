// Rilevamento lingua
function isItalian() {
    const htmlLang = document.documentElement.lang;
    const pathname = window.location.pathname;
    return htmlLang === 'it' || pathname.includes('indice.html') || pathname.includes('ricorrenti.html') || pathname.includes('posizioni.html') || pathname.includes('cronologia.html') || pathname.includes('impostazioni.html');
}

// Testi multilingua (valutati dinamicamente)
function getTexts() {
    const isIt = isItalian();
    return {
        selectLocation: isIt ? 'Seleziona luogo...' : 'Select location...',
        alertNoLocation: isIt ? 'Seleziona o aggiungi un luogo' : 'Please select or add a location',
        alertNoItems: isIt ? 'Nessun articolo ricorrente da caricare' : 'No recurring items to load',
        confirmDelete: isIt ? 'Sei sicuro di voler eliminare questo articolo ricorrente?' : 'Are you sure you want to delete this recurring item?',
        successAdded: isIt ? 'articoli aggiunti alla lista della spesa!' : 'items added to shopping list!'
    };
}

const TEXTS = getTexts();

// Gestione dello storage locale
const STORAGE_KEYS = {
    ITEMS: 'zakupy_items',
    RECURRING: 'zakupy_recurring',
    LOCATIONS: 'zakupy_locations'
};

// Funzioni di utilità per localStorage
function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Errore nel recupero dei dati:', error);
        return [];
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Errore nel salvataggio dei dati:', error);
    }
}

// Inizializzazione
let recurringItems = getFromStorage(STORAGE_KEYS.RECURRING);
let locations = getFromStorage(STORAGE_KEYS.LOCATIONS);
let currentEditingId = null;

// Elementi DOM
const recurringListDiv = document.getElementById('recurringList');
const emptyStateDiv = document.getElementById('emptyState');
const loadAllBtn = document.getElementById('loadAllBtn');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtns = document.querySelectorAll('.close-alert-modal');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const closeConfirmBtn = document.querySelector('.close-confirm-modal');
const cancelConfirmBtn = document.querySelector('.cancel-confirm');
const confirmDeleteBtn = document.querySelector('.confirm-delete');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editNameInput = document.getElementById('editName');
const editQuantityInput = document.getElementById('editQuantity');
const editLocationSelect = document.getElementById('editLocation');
const editNewLocationInput = document.getElementById('editNewLocation');
const closeModalBtn = document.querySelector('.close-modal');
const cancelEditBtn = document.querySelector('.cancel-edit');
const successModal = document.getElementById('successModal');
const successMessage = document.getElementById('successMessage');
const goToShoppingListBtn = document.getElementById('goToShoppingList');

let pendingDeleteId = null;

// Funzioni modal
function showAlert(message) {
    alertMessage.textContent = message;
    alertModal.classList.add('show');
}

function closeAlertModal() {
    alertModal.classList.remove('show');
}

function showConfirm(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmModal.classList.add('show');
    pendingDeleteId = onConfirm;
}

function closeConfirmModal() {
    confirmModal.classList.remove('show');
    pendingDeleteId = null;
}

closeAlertBtns.forEach(btn => btn.addEventListener('click', closeAlertModal));
alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) closeAlertModal();
});

closeConfirmBtn.addEventListener('click', closeConfirmModal);
cancelConfirmBtn.addEventListener('click', closeConfirmModal);
confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteId) {
        pendingDeleteId();
        closeConfirmModal();
    }
});
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirmModal();
});

// Funzione per generare ID univoco
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Funzione per capitalizzare la prima lettera
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Popola il dropdown delle location nel modal
function populateEditLocations() {
    editLocationSelect.innerHTML = `<option value="">${TEXTS.selectLocation}</option>`;
    
    locations.forEach(location => {
        const option = document.createElement('option');
        const locationName = typeof location === 'object' ? location.name : location;
        option.value = locationName;
        option.textContent = locationName;
        editLocationSelect.appendChild(option);
    });
}

// Funzione per ottenere il colore di una location
function getLocationColor(locationName) {
    const location = locations.find(loc => {
        const locName = typeof loc === 'object' ? loc.name : loc;
        return locName.toLowerCase() === locationName.toLowerCase();
    });
    
    if (location && typeof location === 'object' && location.color) {
        return location.color;
    }
    return '#4CAF50'; // Colore di default
}

// Renderizza la lista degli elementi ricorrenti
function renderRecurringList() {
    if (recurringItems.length === 0) {
        recurringListDiv.style.display = 'none';
        emptyStateDiv.style.display = 'block';
        loadAllBtn.style.display = 'none';
        return;
    }
    
    recurringListDiv.style.display = 'block';
    emptyStateDiv.style.display = 'none';
    loadAllBtn.style.display = 'inline-flex';
    
    // Raggruppa gli elementi per location
    const itemsByLocation = {};
    recurringItems.forEach(item => {
        const location = item.location || 'Unknown';
        if (!itemsByLocation[location]) {
            itemsByLocation[location] = [];
        }
        itemsByLocation[location].push(item);
    });
    
    // Ordina le locations alfabeticamente
    const sortedLocations = Object.keys(itemsByLocation).sort();
    
    let html = '';
    sortedLocations.forEach(location => {
        const items = itemsByLocation[location];
        const locationColor = getLocationColor(location);
        
        html += `
            <div class="location-group">
                <div class="location-group-header" style="border-left-color: ${locationColor};">
                    <h3>${capitalize(location)}</h3>
                    <span style="opacity: 0.6; font-size: 14px; margin-left: auto;">(${items.length})</span>
                </div>
                <div class="location-group-items">
        `;
        
        items.forEach(item => {
            html += `
                <div class="recurring-item">
                    <div class="recurring-item-info">
                        <span class="recurring-item-name">${capitalize(item.name)}</span>
                        <span class="recurring-item-details">
                            <i class="fa-solid fa-scale-balanced"></i> ${item.quantity}
                        </span>
                    </div>
                    <div class="recurring-item-actions">
                        <button class="btn-icon btn-edit" onclick="editItem('${item.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteItem('${item.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    recurringListDiv.innerHTML = html;
}

// Modifica un elemento ricorrente
function editItem(id) {
    currentEditingId = id;
    const item = recurringItems.find(i => i.id === id);
    
    if (item) {
        populateEditLocations();
        editNameInput.value = item.name;
        editQuantityInput.value = item.quantity;
        editLocationSelect.value = item.location;
        editNewLocationInput.value = '';
        
        editModal.classList.add('show');
    }
}

// Elimina un elemento ricorrente
function deleteItem(id) {
    showConfirm(
        TEXTS.confirmDelete,
        () => {
            recurringItems = recurringItems.filter(item => item.id !== id);
            saveToStorage(STORAGE_KEYS.RECURRING, recurringItems);
            renderRecurringList();
        }
    );
}

// Chiudi modal
function closeModal() {
    editModal.classList.remove('show');
    currentEditingId = null;
    editForm.reset();
}

// Gestione eventi modal
closeModalBtn.addEventListener('click', closeModal);
cancelEditBtn.addEventListener('click', closeModal);

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeModal();
    }
});

// Salva le modifiche
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentEditingId) return;
    
    const item = recurringItems.find(i => i.id === currentEditingId);
    if (!item) return;
    
    // Determina la location
    let location = editLocationSelect.value;
    const newLocation = editNewLocationInput.value.trim();
    
    if (newLocation) {
        // Capitalizza la nuova location
        location = capitalize(newLocation);
        
        // Rimuove eventuali duplicati con case diverso
        const locationLower = location.toLowerCase();
        locations = locations.filter(loc => {
            const locName = typeof loc === 'object' ? loc.name : loc;
            return locName.toLowerCase() !== locationLower;
        });
        
        // Aggiunge la nuova location come oggetto
        const newLocationObj = {
            id: generateId(),
            name: location,
            color: '#FF0000'
        };
        locations.push(newLocationObj);
        saveToStorage(STORAGE_KEYS.LOCATIONS, locations);
    } else if (!location) {
        // Location può essere null solo se new location non è null
        showAlert(TEXTS.alertNoLocation);
        return;
    }
    
    // Aggiorna l'elemento
    item.name = editNameInput.value.trim();
    item.quantity = editQuantityInput.value.trim();
    item.location = location;
    
    saveToStorage(STORAGE_KEYS.RECURRING, recurringItems);
    renderRecurringList();
    closeModal();
});

// Gestione del cambio di location nel modal
editLocationSelect.addEventListener('change', () => {
    if (editLocationSelect.value) {
        editNewLocationInput.value = '';
    }
});

editNewLocationInput.addEventListener('input', () => {
    if (editNewLocationInput.value.trim()) {
        editLocationSelect.value = '';
    }
});

// Carica tutti gli elementi ricorrenti nella lista della spesa
loadAllBtn.addEventListener('click', () => {
    if (recurringItems.length === 0) {
        showAlert(TEXTS.alertNoItems);
        return;
    }
    
    const items = getFromStorage(STORAGE_KEYS.ITEMS);
    
    // Aggiunge tutti gli elementi ricorrenti alla lista della spesa
    recurringItems.forEach(recurringItem => {
        const newItem = {
            id: generateId(),
            name: recurringItem.name,
            quantity: recurringItem.quantity,
            location: recurringItem.location,
            checked: false
        };
        items.push(newItem);
    });
    
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    
    // Mostra modal di successo
    successMessage.textContent = `${recurringItems.length} ${TEXTS.successAdded}`;
    successModal.classList.add('show');
});

// Handler per il bottone del modal di successo
goToShoppingListBtn.addEventListener('click', () => {
    window.location.href = isItalian() ? 'indice.html?v=2.7' : 'index.html?v=2.7';
});

// Chiudi modal di successo cliccando fuori
successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
        successModal.classList.remove('show');
    }
});

// Inizializzazione
renderRecurringList();

// Rende le funzioni globali per poterle chiamare dall'HTML
window.editItem = editItem;
window.deleteItem = deleteItem;
