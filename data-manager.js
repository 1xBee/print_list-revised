// File handling functions
function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        
        // Save file content and name
        lastFileContent = csvText;
        lastFileName = file.name;
        sessionStorage.setItem('csvFileContent', csvText);
        sessionStorage.setItem('csvFileName', file.name);
        
        parseCsv(csvText);
        updateFileStatus(`File loaded: ${file.name}`, true);
        document.getElementById('reloadBtn').disabled = false;
    };
    reader.readAsText(file);
}

function reloadLastFile() {
    if (lastFileContent) {
        parseCsv(lastFileContent);
        updateFileStatus(`File reloaded: ${lastFileName}`, true);
    }
}

// CSV parsing functions
function parseCsv(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
    }

    // Skip header row and parse data
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length >= 5) {
            csvData.push({
                collection: fields[0].trim(),
                item: fields[1].trim(),
                id: fields[2].trim(),
                boxCount: fields[3].trim(),
                boxDescription: fields[4].trim()
            });
        }
    }

    renderCollections();
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Efficient badge management
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

// Rendering functions
function renderCollections() {
    const container = document.getElementById('collections-container');
    
    if (csvData.length === 0) {
        container.innerHTML = '<div class="no-data">No data found in CSV file</div>';
        return;
    }

    // Group data by collection and item, then sort
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
                        <input type="number" class="qty-input" value="1" min="1" data-item="${safeItemKey}" onchange="updateQuantityInputVisibility()" onclick="event.stopPropagation()">
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
    updateSingleBadge(safeItemKey, newQty); // Only update this specific badge
    
    // Scroll to show the newly added item
    setTimeout(() => {
        scrollToNewItem();
    }, 100);
}

function removeItem(safeItemKey) {
    selectedItems.delete(safeItemKey);
    renderSelectedItems();
    updateSingleBadge(safeItemKey, 0); // Only update this specific badge
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
        
        // Smooth scroll to the new item
        lastItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
}

// Utility functions
function generateSafeId(str) {
    // Create a safe ID by removing special characters and using base64 encoding
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
        return; // Button should be disabled anyway
    }
    
    // Update print title before printing
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