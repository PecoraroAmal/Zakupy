// Rilevamento lingua
function isItalian() {
    return document.documentElement.lang === 'it' || window.location.pathname.includes('cronologia.html');
}

// Testi multilingua
const TEXTS = {
    confirmClear: isItalian() ? 
        'Sei sicuro di voler cancellare tutta la cronologia? Questa azione non può essere annullata!' : 
        'Are you sure you want to clear all history? This action cannot be undone!',
    clearAll: isItalian() ? 'Cancella Tutto' : 'Clear All'
};

// Gestione dello storage locale
const STORAGE_KEYS = {
    ITEMS: 'zakupy_items',
    RECURRING: 'zakupy_recurring',
    LOCATIONS: 'zakupy_locations',
    HISTORY: 'zakupy_history'
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

// Funzione per capitalizzare la prima lettera
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Funzione per generare ID univoco
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Inizializzazione
let historyItems = getFromStorage(STORAGE_KEYS.HISTORY);
let locations = getFromStorage(STORAGE_KEYS.LOCATIONS);

// Elementi DOM
const historyListDiv = document.getElementById('historyList');
const emptyStateDiv = document.getElementById('emptyState');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const closeModalBtn = document.querySelector('.close-modal');
const cancelConfirmBtn = document.querySelector('.cancel-confirm');
const confirmRestoreBtn = document.querySelector('.confirm-restore');

let pendingRestoreLocation = null;

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

// Renderizza la cronologia
function renderHistory() {
    if (historyItems.length === 0) {
        historyListDiv.style.display = 'none';
        emptyStateDiv.style.display = 'block';
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    historyListDiv.style.display = 'block';
    emptyStateDiv.style.display = 'none';
    clearHistoryBtn.style.display = 'inline-flex';
    
    // Raggruppa per location
    const itemsByLocation = {};
    historyItems.forEach(item => {
        const location = item.location || 'Unknown';
        if (!itemsByLocation[location]) {
            itemsByLocation[location] = [];
        }
        itemsByLocation[location].push(item);
    });
    
    // Ordina le locations alfabeticamente
    const sortedLocations = Object.keys(itemsByLocation).sort();
    
    // Costruisce l'HTML
    let html = '';
    sortedLocations.forEach(location => {
        const locationItems = itemsByLocation[location];
        const locationColor = getLocationColor(location);
        
        html += `
            <div class="location-group">
                <div class="location-group-header" style="border-left-color: ${locationColor};">
                    <h3>${capitalize(location)}</h3>
                    <span style="opacity: 0.6; font-size: 14px; margin-left: auto;">${locationItems.length} items</span>
                    <button class="btn-icon btn-add" onclick="restoreLocationItems('${location}')" title="Restore all items from this location" style="margin-left: 12px;">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
                <div class="location-group-items">
        `;
        
        locationItems.forEach(item => {
            html += `
                <div class="history-item" data-id="${item.id}">
                    <div class="item-info" style="flex: 1; display: flex; align-items: center; gap: 12px;">
                        <div class="item-name" style="flex: 1;">${capitalize(item.name)}</div>
                        <div class="item-details" style="margin-left: auto;">
                            <i class="fa-solid fa-scale-balanced"></i> ${item.quantity}
                        </div>
                    </div>
                    <button class="btn-icon" onclick="restoreItem('${item.id}')" title="Restore to shopping list">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    historyListDiv.innerHTML = html;
}

// Ripristina un elemento nella lista della spesa
function restoreItem(id) {
    const item = historyItems.find(i => i.id === id);
    if (!item) return;
    
    // Rimuove dalla cronologia
    historyItems = historyItems.filter(i => i.id !== id);
    saveToStorage(STORAGE_KEYS.HISTORY, historyItems);
    
    // Aggiunge alla lista della spesa con checked = false
    const items = getFromStorage(STORAGE_KEYS.ITEMS);
    const restoredItem = {
        id: generateId(),
        name: item.name,
        quantity: item.quantity,
        location: item.location,
        checked: false
    };
    items.push(restoredItem);
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    
    // Aggiorna la visualizzazione
    renderHistory();
}

// Ripristina tutti gli elementi di una location
function restoreLocationItems(location) {
    const locationItems = historyItems.filter(item => 
        (item.location || 'Unknown').toLowerCase() === location.toLowerCase()
    );
    
    if (locationItems.length === 0) return;
    
    // Mostra modal di conferma
    pendingRestoreLocation = location;
    confirmMessage.textContent = `Restore all ${locationItems.length} items from ${capitalize(location)}?`;
    confirmModal.classList.add('show');
}

// Esegue il ripristino confermato
function executeRestoreLocation() {
    if (!pendingRestoreLocation) return;
    
    // Caso speciale per clear all history
    if (pendingRestoreLocation === 'CLEAR_ALL') {
        historyItems = [];
        saveToStorage(STORAGE_KEYS.HISTORY, historyItems);
        closeConfirmModal();
        renderHistory();
        // Reset bottone
        confirmRestoreBtn.innerHTML = '<i class="fas fa-undo"></i> Restore';
        confirmRestoreBtn.className = 'btn btn-success';
        return;
    }
    
    const location = pendingRestoreLocation;
    const locationItems = historyItems.filter(item => 
        (item.location || 'Unknown').toLowerCase() === location.toLowerCase()
    );
    
    const items = getFromStorage(STORAGE_KEYS.ITEMS);
    
    // Aggiunge tutti gli items alla shopping list
    locationItems.forEach(item => {
        const restoredItem = {
            id: generateId(),
            name: item.name,
            quantity: item.quantity,
            location: item.location,
            checked: false
        };
        items.push(restoredItem);
    });
    
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    
    // Rimuove dalla cronologia
    historyItems = historyItems.filter(item => 
        (item.location || 'Unknown').toLowerCase() !== location.toLowerCase()
    );
    saveToStorage(STORAGE_KEYS.HISTORY, historyItems);
    
    // Chiudi modal e aggiorna
    closeConfirmModal();
    renderHistory();
}

// Chiudi modal di conferma
function closeConfirmModal() {
    confirmModal.classList.remove('show');
    pendingRestoreLocation = null;
}

// Gestione modal
closeModalBtn.addEventListener('click', closeConfirmModal);
cancelConfirmBtn.addEventListener('click', closeConfirmModal);
confirmRestoreBtn.addEventListener('click', executeRestoreLocation);

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeConfirmModal();
    }
});

// Modal per clear history
let clearHistoryModal = null;

function showClearHistoryConfirm() {
    pendingRestoreLocation = 'CLEAR_ALL';
    confirmMessage.textContent = TEXTS.confirmClear;
    confirmRestoreBtn.innerHTML = `<i class="fas fa-trash"></i> ${TEXTS.clearAll}`;
    confirmRestoreBtn.className = 'btn btn-danger';
    confirmModal.classList.add('show');
}

// Cancella tutta la cronologia
clearHistoryBtn.addEventListener('click', showClearHistoryConfirm);

// Inizializzazione
renderHistory();

// Rende le funzioni globali per poterle chiamare dall'HTML
window.restoreItem = restoreItem;
window.restoreLocationItems = restoreLocationItems;
