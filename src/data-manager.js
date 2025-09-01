// Global variables
let inventoryData = [];
let authPassword = null;

// Authentication functions
function submitPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value.trim();
    
    if (!password) {
        showAuthError('Please enter a password');
        return;
    }
    
    authPassword = password;
    fetchInventoryData(true);
}

function handlePasswordKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitPassword();
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Clear error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showAuthLoading(show = true) {
    const loadingDiv = document.getElementById('authLoading');
    const submitBtn = document.querySelector('.auth-submit-btn');
    const passwordInput = document.getElementById('passwordInput');
    
    if (show) {
        loadingDiv.style.display = 'flex';
        submitBtn.disabled = true;
        passwordInput.disabled = true;
    } else {
        loadingDiv.style.display = 'none';
        submitBtn.disabled = false;
        passwordInput.disabled = false;
    }
}

function hideAuthModal() {
    const authModal = document.getElementById('authModal');
    authModal.classList.add('fade-out');
    
    setTimeout(() => {
        authModal.style.display = 'none';
    }, 300);
}

// API functions
async function fetchInventoryData(includeDeliveryParams = false) {
    if (!authPassword) {
        showAuthError('No password provided');
        return;
    }
    
    showAuthLoading(true);
    
    try {
        // Encode password for Basic auth
        const encodedPassword = btoa(authPassword);
        const authHeader = `Basic ${encodedPassword}`;

        let url = '/api/data';
        if (includeDeliveryParams && window.deliveryParams) {
            url += `?items=${encodeURIComponent(window.deliveryParams)}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            inventoryData = data;
            hideAuthModal();
            renderCollections();
        } else if (response.status === 401) {
            showAuthError('Invalid password. Please try again.');
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        } else {
            showAuthError(`Error loading data: Server returned ${response.status}`);
        }
    } catch (error) {
        console.error('API Error:', error);
        showAuthError('Connection error. Please check your network and try again.');
    } finally {
        showAuthLoading(false);
    }
}

async function refreshData() {
    // Check if user has authenticated
    if (!authPassword) {
        // Show auth modal again
        const authModal = document.getElementById('authModal');
        authModal.classList.remove('fade-out');
        authModal.style.display = 'flex';
        return;
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshText = refreshBtn.querySelector('span');

    refreshText.textContent = 'Loading...';
    refreshBtn.disabled = true;
    
    try {
        const encodedPassword = btoa(authPassword);
        const authHeader = `Basic ${encodedPassword}`;
        
        const response = await fetch('/api/data', {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            inventoryData = data;
            renderCollections();
        } else if (response.status === 401) {
            alert('Session expired. Please reload the page and re-authenticate.');
            location.reload();
        } else {
            alert(`Error refreshing data: Server returned ${response.status}`);
        }
    } catch (error) {
        console.error('Refresh Error:', error);
        alert('Connection error. Please check your network and try again.');
    } finally {
        refreshText.textContent = 'Refresh Data';
        refreshBtn.disabled = false;
    }
}

// Badge management
function updateSingleBadge(safeItemKey, quantity) {
    const badgeId = `badge-${safeItemKey}`;
    let badge = document.getElementById(badgeId);
    
    if (quantity > 0) {
        if (!badge) {
            // Create new badge
            const itemElement = document.querySelector(`input[data-item="${safeItemKey}"]`)?.closest('.item');
            if (itemElement) {
                const itemLeft = itemElement.querySelector('.item-left');
                badge = document.createElement('span');
                badge.className = 'badge';
                badge.id = badgeId;
                itemLeft.appendChild(badge);
            }
        }
        if (badge) {
            badge.textContent = quantity;
        }
    } else {
        // Remove badge if quantity is 0
        if (badge) {
            badge.remove();
        }
    }
}

// Data transformation and rendering
function transformDataForRendering() {
    // Transform API JSON data to the format expected by rendering functions
    const transformedData = [];
    
    inventoryData.forEach(collection => {
        collection.items.forEach(item => {
            item.boxes.forEach(box => {
                transformedData.push({
                    collection: collection.collection,
                    item: item.item,
                    id: item.id.toString(),
                    boxCount: box.qty.toString(),
                    boxDescription: box.description
                });
            });
        });
    });
    
    return transformedData;
}

function renderCollections() {
    const container = document.getElementById('collections-container');
    
    if (inventoryData.length === 0) {
        container.innerHTML = '<div class="no-data">No inventory data available</div>';
        return;
    }

    // Transform data and group by collection and item
    const csvData = transformDataForRendering();
    const collections = {};
    
    csvData.forEach(row => {
        if (!collections[row.collection]) {
            collections[row.collection] = {};
        }
        if (!collections[row.collection][row.item]) {
            collections[row.collection][row.item] = [];
        }
        collections[row.collection][row.item].push({
            id: row.id,
            boxCount: row.boxCount,
            boxDescription: row.boxDescription
        });
    });

    // Sort collections alphabetically
    const sortedCollections = Object.keys(collections).sort((a, b) => a.localeCompare(b));

    let html = '';
    sortedCollections.forEach(collectionName => {
        const safeCollectionId = generateSafeId(collectionName);
        
        html += `
            <div class="collection">
                <div class="collection-header" onclick="toggleCollection('${safeCollectionId}')">
                    <span>${escapeHtml(collectionName)}</span>
                    <span class="expand-icon" id="icon-${safeCollectionId}">▶</span>
                </div>
                <div class="collection-content" id="content-${safeCollectionId}">
        `;
        
        // Sort items within collection alphabetically
        const sortedItems = Object.keys(collections[collectionName]).sort((a, b) => a.localeCompare(b));
        
        sortedItems.forEach(itemName => {
            const itemKey = `${collectionName}|||${itemName}`;
            const safeItemKey = btoa(itemKey); // Base64 encode for safety
            const currentQty = selectedItems.get(safeItemKey) || 0;
            
            html += `
                <div class="item" onclick="focusQuantityInput('${safeItemKey}')">
                    <div class="item-left">
                        <span class="item-name">${escapeHtml(itemName)}</span>
                        ${currentQty > 0 ? `<span class="badge" id="badge-${safeItemKey}">${currentQty}</span>` : ''}
                    </div>
                    <div class="item-controls">
                        <input type="number" class="qty-input" value="1" min="1" data-item="${safeItemKey}" onchange="updateQuantityInputVisibility()" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){addItem('${safeItemKey}'); event.preventDefault();}">
                        <button class="add-btn" onclick="addItem('${safeItemKey}'); event.stopPropagation()">Add</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateQuantityInputVisibility();
}

function renderSelectedItems() {
    const container = document.getElementById('selected-items-container');
    const removeAllBtn = document.getElementById('removeAllBtn');
    
    if (selectedItems.size === 0) {
        container.innerHTML = '<div class="no-data">Click "Add" buttons to add items here</div>';
        removeAllBtn.style.display = 'none';
        updatePrintButton();
        return;
    }

    removeAllBtn.style.display = 'block';
    updatePrintButton();

    // Transform data for lookup
    const csvData = transformDataForRendering();
    let html = '';
    
    selectedItems.forEach((quantity, safeItemKey) => {
        try {
            const itemKey = atob(safeItemKey); // Decode base64
            const [collectionName, itemName] = itemKey.split('|||');
            
            const itemData = csvData.filter(row => 
                row.collection === collectionName && row.item === itemName
            );

            if (itemData.length > 0) {
                const displayName = itemName;
                const qtyDisplay = quantity > 1 ? ` <span class="qty-display">(Qty: ${quantity})</span>` : '';
                
                html += `
                    <div class="selected-item">
                        <div class="selected-item-header">
                            <span class="selected-item-name">${displayName} [${escapeHtml(collectionName)}]${qtyDisplay}</span>
                            <div class="remove-controls">
                                <button class="remove-btn" onclick="removeItem('${safeItemKey}')">Remove</button>
                                <span class="item-dropdown-arrow" onclick="showRemovePopup('${safeItemKey}')" title="Remove specific quantity">▼</span>
                            </div>
                        </div>
                        <div class="box-list">
                `;

                itemData.forEach(box => {
                    const multipliedCount = parseInt(box.boxCount) * quantity;
                    html += `
                        <div class="box-row">
                            <div class="box-quantity">Qty: ${multipliedCount}</div>
                            <div class="box-description">${escapeHtml(box.boxDescription)}</div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error processing item:', error);
        }
    });

    container.innerHTML = html;
}

// Item management functions
function addItem(safeItemKey) {
    const qtyInput = document.querySelector(`input[data-item="${safeItemKey}"]`);
    const addQty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    
    const currentQty = selectedItems.get(safeItemKey) || 0;
    const newQty = currentQty + addQty;
    selectedItems.set(safeItemKey, newQty);
    
    // Reset input to 1 if it exists
    if (qtyInput) {
        qtyInput.value = 1;
        updateQuantityInputVisibility();
    }
    
    renderSelectedItems();
    updateSingleBadge(safeItemKey, newQty);
    
    // Scroll to show the newly added item
    setTimeout(() => {
        scrollToNewItem();
    }, 100);
}

function removeItem(safeItemKey) {
    selectedItems.delete(safeItemKey);
    renderSelectedItems();
    updateSingleBadge(safeItemKey, 0);
}

function removeAllItems() {
    if (selectedItems.size === 0) return;
    
    if (confirm('Are you sure you want to remove all selected items?')) {
        // Update all badges to 0 before clearing
        selectedItems.forEach((qty, safeItemKey) => {
            updateSingleBadge(safeItemKey, 0);
        });
        
        selectedItems.clear();
        renderSelectedItems();
    }
}

function scrollToNewItem() {
    const container = document.getElementById('selected-items-container');
    const selectedItemElements = container.querySelectorAll('.selected-item');
    
    if (selectedItemElements.length > 0) {
        const lastItem = selectedItemElements[selectedItemElements.length - 1];
        
        lastItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
}

// Utility functions
function generateSafeId(str) {
    return 'id_' + btoa(str).replace(/[+/=]/g, '');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Print functionality
function printList() {
    if (selectedItems.size === 0) {
        return;
    }
    
    const titleInput = document.getElementById('printTitleInput');
    const printTitle = document.querySelector('.print-title');
    const titleValue = titleInput.value.trim() || 'ITEM LIST';
    printTitle.textContent = titleValue;
    
    window.print();
}

function updatePrintButton() {
    const printBtn = document.getElementById('printBtn');
    printBtn.disabled = selectedItems.size === 0;
}