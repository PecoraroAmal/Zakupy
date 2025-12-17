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
        alertNoLocation: isIt ? 'Seleziona o aggiungi un luogo' : 'Please select or add a location'
    };
}

const TEXTS = getTexts();

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

// Funzione per pulire duplicati di location con case diverso
function cleanDuplicateLocations(locationsList) {
    const seen = new Map();
    const cleaned = [];
    
    locationsList.forEach(loc => {
        const locName = typeof loc === 'object' ? loc.name : loc;
        const lowerCase = locName.toLowerCase();
        const existing = seen.get(lowerCase);
        
        if (!existing) {
            // Prima occorrenza - salva l'oggetto o crea uno nuovo
            const locationObj = typeof loc === 'object' ? loc : {
                id: generateId(),
                name: capitalize(loc),
                color: '#4CAF50'
            };
            seen.set(lowerCase, locationObj);
            cleaned.push(locationObj);
        } else if (typeof loc === 'object' && loc.name === capitalize(loc.name)) {
            // Se esiste già ma questa è capitalizzata correttamente, sostituisci
            const index = cleaned.findIndex(l => l.name.toLowerCase() === lowerCase);
            if (index !== -1) {
                cleaned[index] = loc;
                seen.set(lowerCase, loc);
            }
        }
    });
    
    return cleaned;
}

// Inizializzazione
let items = getFromStorage(STORAGE_KEYS.ITEMS);
let locations = cleanDuplicateLocations(getFromStorage(STORAGE_KEYS.LOCATIONS));
saveToStorage(STORAGE_KEYS.LOCATIONS, locations);
let hiddenLocations = JSON.parse(localStorage.getItem('zakupy_hidden_locations') || '[]');

// Elementi DOM
const addItemForm = document.getElementById('addItemForm');
const itemNameInput = document.getElementById('itemName');
const itemQuantityInput = document.getElementById('itemQuantity');
const itemLocationSelect = document.getElementById('itemLocation');
const newLocationInput = document.getElementById('newLocation');
const isRecurringCheckbox = document.getElementById('isRecurring');
const shoppingListDiv = document.getElementById('shoppingList');
const emptyStateDiv = document.getElementById('emptyState');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtns = document.querySelectorAll('.close-alert-modal');

// Funzione per mostrare alert modal
function showAlert(message) {
    alertMessage.textContent = message;
    alertModal.classList.add('show');
}

// Chiudi alert modal
function closeAlertModal() {
    alertModal.classList.remove('show');
}

closeAlertBtns.forEach(btn => btn.addEventListener('click', closeAlertModal));

alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) {
        closeAlertModal();
    }
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

// Popola il dropdown delle location
function populateLocations() {
    // Pulisce il select lasciando solo l'opzione di default
    itemLocationSelect.innerHTML = `<option value="">${TEXTS.selectLocation}</option>`;
    
    // Aggiunge le location esistenti
    locations.forEach(location => {
        const option = document.createElement('option');
        const locationName = typeof location === 'object' ? location.name : location;
        option.value = locationName;
        option.textContent = locationName;
        itemLocationSelect.appendChild(option);
    });
}

// Aggiungi elemento alla lista
addItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Determina la location
    let location = itemLocationSelect.value;
    const newLocation = newLocationInput.value.trim();
    
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
        populateLocations();
    } else if (!location) {
        // Location può essere null solo se new location non è null
        showAlert(TEXTS.alertNoLocation);
        return;
    }
    
    const item = {
        id: generateId(),
        name: itemNameInput.value.trim(),
        quantity: itemQuantityInput.value.trim(),
        location: location,
        checked: false
    };
    
    // Se è ricorrente, salva anche negli elementi ricorrenti
    if (isRecurringCheckbox.checked) {
        const recurringItems = getFromStorage(STORAGE_KEYS.RECURRING);
        const recurringItem = {
            id: generateId(),
            name: item.name,
            quantity: item.quantity,
            location: item.location
        };
        recurringItems.push(recurringItem);
        saveToStorage(STORAGE_KEYS.RECURRING, recurringItems);
    }
    
    // Aggiunge l'elemento alla lista
    items.push(item);
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    
    // Reset del form
    addItemForm.reset();
    
    // Aggiorna la visualizzazione
    renderShoppingList();
});

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

// Renderizza la lista della spesa
function renderShoppingList() {
    if (items.length === 0) {
        shoppingListDiv.style.display = 'none';
        emptyStateDiv.style.display = 'block';
        return;
    }
    
    shoppingListDiv.style.display = 'block';
    emptyStateDiv.style.display = 'none';
    
    // Raggruppa gli elementi per location
    const itemsByLocation = {};
    items.forEach(item => {
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
        const allChecked = locationItems.every(item => item.checked);
        const checkedCount = locationItems.filter(item => item.checked).length;
        const isHidden = hiddenLocations.includes(location);
        
        html += `
            <div class="location-group">
                <div class="location-group-header" style="border-left-color: ${locationColor}; cursor: pointer;" onclick="toggleLocationVisibility('${location}')">
                    <input type="checkbox" ${allChecked ? 'checked' : ''} onclick="toggleLocationCheck('${location}', event)" style="width: 18px; height: 18px; cursor: pointer; margin-right: 4px;">
                    <h3>${capitalize(location)}</h3>
                    <span style="opacity: 0.6; font-size: 14px; margin-left: auto;">${checkedCount}/${locationItems.length}</span>
                    <i class="fas fa-chevron-${isHidden ? 'down' : 'up'}" style="margin-left: 8px; opacity: 0.6; font-size: 12px;"></i>
                </div>
                <div class="location-group-items" style="display: ${isHidden ? 'none' : 'flex'};">
        `;
        
        locationItems.forEach(item => {
            html += `
                <div class="item ${item.checked ? 'completed' : ''}" data-id="${item.id}">
                    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1;">
                        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItem('${item.id}')" style="width: 20px; height: 20px; cursor: pointer;">
                        <div class="item-name" style="flex: 1;">${capitalize(item.name)}</div>
                        <div class="item-details" style="margin-left: auto;">
                            <i class="fa-solid fa-scale-balanced"></i> ${item.quantity}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    shoppingListDiv.innerHTML = html;
    
    // Controlla se tutti gli elementi di una location sono spuntati
    checkLocationComplete();
}

// Toggle dello stato checked di un elemento
function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        saveToStorage(STORAGE_KEYS.ITEMS, items);
        renderShoppingList();
    }
}

// Controlla se tutti gli elementi di una location sono completati e li elimina
function checkLocationComplete() {
    const itemsByLocation = {};
    items.forEach(item => {
        if (!itemsByLocation[item.location]) {
            itemsByLocation[item.location] = [];
        }
        itemsByLocation[item.location].push(item);
    });
    
    // Per ogni location, controlla se tutti gli elementi sono spuntati
    Object.keys(itemsByLocation).forEach(location => {
        const locationItems = itemsByLocation[location];
        const allChecked = locationItems.every(item => item.checked);
        
        if (allChecked && locationItems.length > 0) {
            // Sposta gli elementi nella cronologia invece di eliminarli
            const history = getFromStorage(STORAGE_KEYS.HISTORY) || [];
            locationItems.forEach(item => {
                history.push({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    location: item.location,
                    completedAt: new Date().toISOString()
                });
            });
            saveToStorage(STORAGE_KEYS.HISTORY, history);
            
            // Rimuove dalla lista attiva
            items = items.filter(item => item.location !== location);
            saveToStorage(STORAGE_KEYS.ITEMS, items);
            
            // Mostra una notifica
            setTimeout(() => {
                renderShoppingList();
            }, 500);
        }
    });
}

// Gestione del cambio di location nel select
itemLocationSelect.addEventListener('change', () => {
    if (itemLocationSelect.value) {
        newLocationInput.value = '';
    }
});

newLocationInput.addEventListener('input', () => {
    if (newLocationInput.value.trim()) {
        itemLocationSelect.value = '';
    }
});

// Toggle visibilità location
function toggleLocationVisibility(location) {
    const index = hiddenLocations.indexOf(location);
    if (index > -1) {
        hiddenLocations.splice(index, 1);
    } else {
        hiddenLocations.push(location);
    }
    localStorage.setItem('zakupy_hidden_locations', JSON.stringify(hiddenLocations));
    renderShoppingList();
}

// Toggle check di tutti gli elementi di una location
function toggleLocationCheck(location, event) {
    event.stopPropagation();
    
    const locationItems = items.filter(item => item.location === location);
    const allChecked = locationItems.every(item => item.checked);
    
    // Se tutti sono checked, li deseleziona, altrimenti li seleziona tutti
    locationItems.forEach(item => {
        item.checked = !allChecked;
    });
    
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    renderShoppingList();
}

// Inizializzazione
populateLocations();
renderShoppingList();

// Rende le funzioni globali per poterle chiamare dall'HTML
window.toggleItem = toggleItem;
window.toggleLocationVisibility = toggleLocationVisibility;
window.toggleLocationCheck = toggleLocationCheck;
