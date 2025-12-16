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

// Elementi DOM
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const exportBtn = document.getElementById('exportBtn');
const demoBtn = document.getElementById('demoBtn');
const clearBtn = document.getElementById('clearBtn');
const installBtn = document.getElementById('installBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmAction = document.getElementById('confirmAction');
const cancelConfirm = document.getElementById('cancelConfirm');
const toast = document.getElementById('toast');

let pendingAction = null;
let deferredPrompt = null;

// Dati demo
const demoData = [
    { name: 'Milk', quantity: '2', location: 'Supermarket' },
    { name: 'Bread', quantity: '1', location: 'Bakery' },
    { name: 'Eggs', quantity: '12', location: 'Supermarket' },
    { name: 'Coffee', quantity: '500', location: 'Supermarket' },
    { name: 'Apples', quantity: '1', location: 'Grocery Store' },
    { name: 'Chicken', quantity: '1', location: 'Butcher' },
    { name: 'Tomatoes', quantity: '0.5', location: 'Grocery Store' },
    { name: 'Cheese', quantity: '200', location: 'Supermarket' }
];

const demoLocations = [
    { name: 'Supermarket', color: '#4CAF50' },
    { name: 'Bakery', color: '#FF9800' },
    { name: 'Grocery Store', color: '#2196F3' },
    { name: 'Butcher', color: '#f44336' }
];

// Mostra toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Mostra modal di conferma
function showConfirmModal(message, onConfirm, isSuccess = false) {
    confirmMessage.textContent = message;
    confirmModal.classList.add('show');
    pendingAction = onConfirm;
    
    // Cambia colore bottone conferma
    if (isSuccess) {
        confirmAction.className = 'btn btn-success';
    } else {
        confirmAction.className = 'btn btn-danger';
    }
}

// Chiudi modal di conferma
function closeConfirmModal() {
    confirmModal.classList.remove('show');
    pendingAction = null;
}

// Gestione conferma azione
confirmAction.addEventListener('click', () => {
    if (pendingAction) {
        pendingAction();
        closeConfirmModal();
    }
});

cancelConfirm.addEventListener('click', closeConfirmModal);

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeConfirmModal();
    }
});

// Import dati
importBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            // Valida i dati
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format');
            }
            
            // Verifica che ogni elemento abbia i campi necessari
            const isValid = data.every(item => 
                item.name && item.quantity && item.location
            );
            
            if (!isValid) {
                throw new Error('Invalid data structure');
            }
            
            showConfirmModal(
                `This will replace your current recurring items with ${data.length} items from the file. Continue?`,
                () => {
                    // Genera nuovi ID per gli elementi importati
                    const itemsWithIds = data.map(item => ({
                        ...item,
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2)
                    }));
                    
                    // Salva i dati
                    saveToStorage(STORAGE_KEYS.RECURRING, itemsWithIds);
                    
                    // Aggiorna le location
                    const newLocations = [...new Set(data.map(item => item.location))];
                    const existingLocations = getFromStorage(STORAGE_KEYS.LOCATIONS);
                    const mergedLocations = [...new Set([...existingLocations, ...newLocations])];
                    saveToStorage(STORAGE_KEYS.LOCATIONS, mergedLocations);
                    
                    showToast('Data imported successfully!', 'success');
                    
                    // Reset input file
                    importFile.value = '';
                },
                true
            );
            
        } catch (error) {
            showToast('Error importing file. Please check the file format.', 'error');
            console.error('Errore import:', error);
        }
    };
    
    reader.onerror = () => {
        showToast('Error reading file.', 'error');
    };
    
    reader.readAsText(file);
});

// Export dati
exportBtn.addEventListener('click', () => {
    const recurringItems = getFromStorage(STORAGE_KEYS.RECURRING);
    
    if (recurringItems.length === 0) {
        showToast('No recurring items to export.', 'error');
        return;
    }
    
    // Rimuove gli ID prima dell'export per avere un file più pulito
    const dataToExport = recurringItems.map(({ id, ...item }) => item);
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zakupy-recurring-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
});

// Carica dati demo
demoBtn.addEventListener('click', () => {
    showConfirmModal(
        'Load demo data? This will add sample recurring items to your list.',
        () => {
            const existingItems = getFromStorage(STORAGE_KEYS.RECURRING);
            
            // Aggiunge ID ai dati demo
            const demoWithIds = demoData.map(item => ({
                ...item,
                id: Date.now().toString(36) + Math.random().toString(36).substr(2)
            }));
            
            // Aggiunge i dati demo agli elementi esistenti
            const mergedItems = [...existingItems, ...demoWithIds];
            saveToStorage(STORAGE_KEYS.RECURRING, mergedItems);
            
            // Aggiorna le location con colori
            const existingLocations = getFromStorage(STORAGE_KEYS.LOCATIONS);
            
            // Genera ID per le demo locations
            const demoLocationsWithIds = demoLocations.map(loc => ({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                name: loc.name,
                color: loc.color
            }));
            
            // Rimuove duplicati per nome (case-insensitive) e mantiene i nuovi colori
            const locationMap = new Map();
            existingLocations.forEach(loc => {
                const locName = typeof loc === 'object' ? loc.name : loc;
                locationMap.set(locName.toLowerCase(), loc);
            });
            demoLocationsWithIds.forEach(loc => {
                locationMap.set(loc.name.toLowerCase(), loc);
            });
            
            const mergedLocations = Array.from(locationMap.values());
            saveToStorage(STORAGE_KEYS.LOCATIONS, mergedLocations);
            
            showToast('Demo data loaded successfully!', 'success');
        },
        true
    );
});

// Cancella tutti i dati
clearBtn.addEventListener('click', () => {
    showConfirmModal(
        'Are you sure you want to clear all data? This action cannot be undone!',
        () => {
            // Cancella tutti i dati
            localStorage.removeItem(STORAGE_KEYS.ITEMS);
            localStorage.removeItem(STORAGE_KEYS.RECURRING);
            localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
            
            showToast('All data has been cleared.', 'success');
            
            // Reindirizza alla home dopo 1 secondo
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    );
});

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    // Previeni il prompt automatico
    e.preventDefault();
    deferredPrompt = e;
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
        showToast('App already installed or not available for installation', 'error');
        return;
    }
    
    // Mostra il prompt di installazione
    deferredPrompt.prompt();
    
    // Aspetta la risposta dell'utente
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        showToast('App installed successfully!', 'success');
    } else {
        showToast('Installation cancelled', 'error');
    }
    
    // Reset del prompt
    deferredPrompt = null;
});

// Notifica quando l'app è installata
window.addEventListener('appinstalled', () => {
    showToast('Zakupy™ installed successfully!', 'success');
});
