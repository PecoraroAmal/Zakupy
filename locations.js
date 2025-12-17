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
        alertExists: isIt ? 'Esiste già un luogo con questo nome!' : 'A location with this name already exists!',
        confirmDelete: (name) => isIt ? 
            `Sei sicuro di voler eliminare "${name}"? Questa azione non può essere annullata!` : 
            `Are you sure you want to delete "${name}"? This action cannot be undone!`,
        selectLocation: isIt ? 'Seleziona luogo...' : 'Select location...'
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

// Funzione per capitalizzare la prima lettera
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Funzione per generare ID univoco
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Migrazione da array a oggetti location
function migrateLocations() {
    const locations = getFromStorage(STORAGE_KEYS.LOCATIONS);
    
    // Se già sono oggetti, non fare nulla
    if (locations.length > 0 && typeof locations[0] === 'object' && locations[0].name) {
        return locations;
    }
    
    // Converti da string[] a Location[]
    const migratedLocations = locations.map(loc => ({
        id: generateId(),
        name: typeof loc === 'string' ? capitalize(loc) : loc,
        color: '#FF0000'
    }));
    
    saveToStorage(STORAGE_KEYS.LOCATIONS, migratedLocations);
    return migratedLocations;
}

// Inizializzazione
let locations = migrateLocations();
let currentEditingId = null;

// Palette di colori (tonalità con saturazione e valore al massimo)
const COLOR_PALETTE = [
    '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
    '#CCFF00', '#99FF00', '#66FF00', '#33FF00', '#00FF00', '#00FF33',
    '#00FF66', '#00FF99', '#00FFCC', '#00FFFF', '#00CCFF', '#0099FF',
    '#0066FF', '#0033FF', '#0000FF', '#3300FF', '#6600FF', '#9900FF',
    '#CC00FF', '#FF00FF', '#FF00CC', '#FF0099', '#FF0066', '#FF0033'
];

// Funzione per creare la griglia di colori
function createColorGrid(containerId, inputId, initialColor) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    container.innerHTML = '';
    
    COLOR_PALETTE.forEach(color => {
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = color;
        
        if (color === initialColor) {
            colorBox.classList.add('selected');
        }
        
        colorBox.addEventListener('click', () => {
            // Rimuovi selezione precedente
            container.querySelectorAll('.color-box').forEach(box => {
                box.classList.remove('selected');
            });
            
            // Aggiungi selezione al box cliccato
            colorBox.classList.add('selected');
            input.value = color;
        });
        
        container.appendChild(colorBox);
    });
}

// Elementi DOM
const addLocationForm = document.getElementById('addLocationForm');
const locationNameInput = document.getElementById('locationName');
const locationColorInput = document.getElementById('locationColor');
const locationsListDiv = document.getElementById('locationsList');
const emptyStateDiv = document.getElementById('emptyState');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const closeAlertBtns = document.querySelectorAll('.close-alert-modal');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const closeConfirmBtn = document.querySelector('.close-confirm-modal');
const cancelConfirmBtn = document.querySelector('.cancel-confirm');
const confirmActionBtn = document.querySelector('.confirm-action');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editNameInput = document.getElementById('editName');
const editColorInput = document.getElementById('editColor');
const editColorHexInput = document.getElementById('editColorHex');
const closeModalBtn = document.querySelector('.close-modal');
const cancelEditBtn = document.querySelector('.cancel-edit');

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
confirmActionBtn.addEventListener('click', () => {
    if (pendingDeleteId) {
        pendingDeleteId();
        closeConfirmModal();
    }
});
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirmModal();
});

// Inizializza le griglie di colori
createColorGrid('colorGrid', 'locationColor', '#FF0000');

// Aggiungi nuova location
addLocationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = capitalize(locationNameInput.value.trim());
    const color = locationColorInput.value;
    
    // Controlla se esiste già una location con lo stesso nome (case-insensitive)
    const existingLocation = locations.find(loc => loc.name.toLowerCase() === name.toLowerCase());
    
    if (existingLocation) {
        showAlert(TEXTS.alertExists);
        return;
    }
    
    const newLocation = {
        id: generateId(),
        name: name,
        color: color
    };
    
    locations.push(newLocation);
    saveToStorage(STORAGE_KEYS.LOCATIONS, locations);
    
    // Reset form
    addLocationForm.reset();
    createColorGrid('colorGrid', 'locationColor', '#FF0000');
    
    renderLocations();
});

// Renderizza la lista delle location
function renderLocations() {
    if (locations.length === 0) {
        locationsListDiv.style.display = 'none';
        emptyStateDiv.style.display = 'block';
        return;
    }
    
    locationsListDiv.style.display = 'block';
    emptyStateDiv.style.display = 'none';
    
    let html = '';
    locations.forEach(location => {
        html += `
            <div class="location-item">
                <div class="location-info">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="color: ${location.color}; font-size: 20px;">
                            <i class="fa-solid fa-shop"></i>
                        </div>
                        <div class="item-name">${location.name}</div>
                    </div>
                </div>
                <div class="location-actions">
                    <button class="btn-icon btn-edit" onclick="editLocation('${location.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteLocation('${location.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <br>
        `;
    });
    
    locationsListDiv.innerHTML = html;
}

// Modifica una location
function editLocation(id) {
    currentEditingId = id;
    const location = locations.find(l => l.id === id);
    
    if (location) {
        editNameInput.value = location.name;
        createColorGrid('editColorGrid', 'editColor', location.color);
        
        editModal.classList.add('show');
    }
}

// Elimina una location
function deleteLocation(id) {
    const location = locations.find(l => l.id === id);
    
    if (!location) return;
    
    showConfirm(
        TEXTS.confirmDelete(location.name),
        () => {
            locations = locations.filter(l => l.id !== id);
            saveToStorage(STORAGE_KEYS.LOCATIONS, locations);
            renderLocations();
        }
    );
}

// Chiudi modal
function closeModal() {
    editModal.classList.remove('show');
    currentEditingId = null;
    editForm.reset();
}

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
    
    const location = locations.find(l => l.id === currentEditingId);
    if (!location) return;
    
    const newName = capitalize(editNameInput.value.trim());
    const newColor = editColorInput.value;
    
    // Controlla se il nuovo nome esiste già (escludendo la location corrente)
    const existingLocation = locations.find(l => 
        l.id !== currentEditingId && 
        l.name.toLowerCase() === newName.toLowerCase()
    );
    
    if (existingLocation) {
        showAlert(TEXTS.alertExists);
        return;
    }
    
    // Aggiorna la location
    const oldName = location.name;
    location.name = newName;
    location.color = newColor;
    
    saveToStorage(STORAGE_KEYS.LOCATIONS, locations);
    
    // Aggiorna anche gli items che usano questa location
    if (oldName !== newName) {
        updateItemsLocation(oldName, newName);
    }
    
    renderLocations();
    closeModal();
});

// Aggiorna la location negli items e recurring items
function updateItemsLocation(oldName, newName) {
    // Aggiorna items
    const items = getFromStorage(STORAGE_KEYS.ITEMS);
    items.forEach(item => {
        if (item.location.toLowerCase() === oldName.toLowerCase()) {
            item.location = newName;
        }
    });
    saveToStorage(STORAGE_KEYS.ITEMS, items);
    
    // Aggiorna recurring items
    const recurringItems = getFromStorage(STORAGE_KEYS.RECURRING);
    recurringItems.forEach(item => {
        if (item.location.toLowerCase() === oldName.toLowerCase()) {
            item.location = newName;
        }
    });
    saveToStorage(STORAGE_KEYS.RECURRING, recurringItems);
    
    // Aggiorna history items
    const historyItems = getFromStorage(STORAGE_KEYS.HISTORY);
    historyItems.forEach(item => {
        if (item.location.toLowerCase() === oldName.toLowerCase()) {
            item.location = newName;
        }
    });
    saveToStorage(STORAGE_KEYS.HISTORY, historyItems);
}

// Inizializzazione
renderLocations();

// Rende le funzioni globali per poterle chiamare dall'HTML
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
