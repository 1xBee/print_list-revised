let csvData = [];
let selectedItems = new Set();
let lastFileContent = null;
let lastFileName = null;

// Resize functionality
let isResizing = false;
let startX = 0;
let startLeftWidth = 0;

document.getElementById('csvFile').addEventListener('change', handleFileLoad);

// Check if we have saved file data on page load
window.addEventListener('load', function() {
    const savedContent = sessionStorage.getItem('csvFileContent');
    const savedName = sessionStorage.getItem('csvFileName');
    
    if (savedContent && savedName) {
        lastFileContent = savedContent;
        lastFileName = savedName;
        parseCsv(savedContent);
        updateFileStatus(`File loaded: ${savedName}`, true);
        document.getElementById('reloadBtn').disabled = false;
    }

    // Initialize resize functionality
    initializeResize();
    
    // Initialize title input
    initializeTitleInput();
});

function initializeResize() {
    const resizeHandle = document.getElementById('resizeHandle');
    const container = document.querySelector('.container');
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');

    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startLeftWidth = leftPanel.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const containerWidth = container.offsetWidth - 8; // Subtract resize handle width
        const newLeftWidth = startLeftWidth + deltaX;
        
        // Set minimum widths (25% of container)
        const minWidth = containerWidth * 0.25;
        const maxWidth = containerWidth * 0.75;
        
        if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
            const leftPercent = (newLeftWidth / containerWidth) * 100;
            const rightPercent = 100 - leftPercent;
            
            leftPanel.style.width = leftPercent + '%';
            rightPanel.style.width = rightPercent + '%';
        }
    });

    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

function initializeTitleInput() {
    const titleInput = document.getElementById('printTitleInput');
    const printTitle = document.querySelector('.print-title');
    
    // Set default value
    titleInput.value = 'ITEM LIST';
    
    // Update print title when input changes
    titleInput.addEventListener('input', function() {
        const value = this.value.trim() || 'ITEM LIST';
        printTitle.textContent = value;
    });
    
    // Initialize print title
    printTitle.textContent = 'ITEM LIST';
}

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

function updateFileStatus(message, isSuccess) {
    const statusDiv = document.getElementById('fileStatus');
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'file-status loaded' : 'file-status';
    statusDiv.style.display = 'block';
    
    // Immediately hide file input after successful load (no wait time)
    if (isSuccess) {
        hideFileInput();
    }
}

function hideFileInput() {
    const fileInputSection = document.getElementById('fileInputSection');
    const settingsBtn = document.getElementById('settingsBtn');
    
    fileInputSection.classList.add('hidden');
    settingsBtn.classList.add('visible');
}

function showFileInput() {
    const fileInputSection = document.getElementById('fileInputSection');
    
    fileInputSection.classList.remove('hidden');
}

function toggleFileInput() {
    const fileInputSection = document.getElementById('fileInputSection');
    
    if (fileInputSection.classList.contains('hidden')) {
        showFileInput();
    } else {
        hideFileInput();
    }
}

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
            
            html += `
                <div class="item">
                    <span class="item-name">${escapeHtml(itemName)}</span>
                    <button class="add-btn" onclick="addItem('${safeItemKey}')">Add</button>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function generateSafeId(str) {
    // Create a safe ID by removing special characters and using base64 encoding
    return 'id_' + btoa(str).replace(/[+/=]/g, '');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleCollection(collectionId) {
    const content = document.getElementById(`content-${collectionId}`);
    const icon = document.getElementById(`icon-${collectionId}`);
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.classList.remove('rotated');
    } else {
        content.classList.add('open');
        icon.classList.add('rotated');
    }
}

function addItem(safeItemKey) {
    if (selectedItems.has(safeItemKey)) {
        alert('This item is already added!');
        return;
    }

    selectedItems.add(safeItemKey);
    renderSelectedItems();
    
    // Scroll to show the newly added item
    setTimeout(() => {
        scrollToNewItem();
    }, 100);
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
        
        // Add a subtle highlight effect
        lastItem.style.transition = 'background-color 0.3s ease';
        lastItem.style.backgroundColor = '#e8f5e8';
        
        setTimeout(() => {
            lastItem.style.backgroundColor = '';
        }, 1000);
    }
}

function removeItem(safeItemKey) {
    selectedItems.delete(safeItemKey);
    renderSelectedItems();
}

function removeAllItems() {
    if (selectedItems.size === 0) return;
    
    if (confirm('Are you sure you want to remove all selected items?')) {
        selectedItems.clear();
        renderSelectedItems();
    }
}

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
    selectedItems.forEach(safeItemKey => {
        try {
            const itemKey = atob(safeItemKey); // Decode base64
            const [collectionName, itemName] = itemKey.split('|||');
            
            const itemData = csvData.filter(row => 
                row.collection === collectionName && row.item === itemName
            );

            if (itemData.length > 0) {
                html += `
                    <div class="selected-item">
                        <div class="selected-item-header">
                            <span class="selected-item-name">${escapeHtml(itemName)} [${escapeHtml(collectionName)}]</span>
                            <button class="remove-btn" onclick="removeItem('${safeItemKey}')">Remove</button>
                        </div>
                        <div class="box-list">
                `;

                itemData.forEach(box => {
                    html += `
                        <div class="box-row">
                            <div class="box-quantity">Qty: ${escapeHtml(box.boxCount)}</div>
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