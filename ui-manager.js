// Global variables
let csvData = [];
let selectedItems = new Map(); // Using Map to store quantities
let lastFileContent = null;
let lastFileName = null;
let currentRemoveItem = null;

// Resize functionality
let isResizing = false;
let startX = 0;
let startLeftWidth = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', handleFileLoad);

    // Check if we have saved file data on page load
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

function updateQuantityInputVisibility() {
    document.querySelectorAll('.qty-input').forEach(input => {
        const value = parseInt(input.value) || 1;
        if (value > 1) {
            input.classList.add('has-quantity');
        } else {
            input.classList.remove('has-quantity');
        }
    });
}

function showRemovePopup(safeItemKey) {
    currentRemoveItem = safeItemKey;
    const currentQty = selectedItems.get(safeItemKey) || 1;
    
    const removeInput = document.getElementById('removeQtyInput');
    removeInput.value = 1;
    removeInput.max = currentQty;
    
    const overlay = document.getElementById('removePopupOverlay');
    overlay.classList.add('show');
    
    // Wait for CSS transition to complete
    setTimeout(() => {
        removeInput.focus();
        removeInput.select();
    }, 250);
}

function hideRemovePopup(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('removePopupOverlay').classList.remove('show');
    currentRemoveItem = null;
}

function confirmRemove() {
    if (!currentRemoveItem) return;
    
    const removeQty = parseInt(document.getElementById('removeQtyInput').value) || 1;
    const currentQty = selectedItems.get(currentRemoveItem) || 1;
    
    if (removeQty >= currentQty) {
        selectedItems.delete(currentRemoveItem);
    } else {
        selectedItems.set(currentRemoveItem, currentQty - removeQty);
    }
    
    renderSelectedItems();
    renderCollections(); // Update badges
    hideRemovePopup();
}

function addItem(safeItemKey) {
    const qtyInput = document.querySelector(`input[data-item="${safeItemKey}"]`);
    const addQty = parseInt(qtyInput.value) || 1;
    
    const currentQty = selectedItems.get(safeItemKey) || 0;
    selectedItems.set(safeItemKey, currentQty + addQty);
    
    // Reset input to 1
    qtyInput.value = 1;
    updateQuantityInputVisibility();
    
    renderSelectedItems();
    renderCollections(); // Update badges
    
    // Scroll to show the newly added item
    setTimeout(() => {
        scrollToNewItem();
    }, 100);
}

function removeItem(safeItemKey) {
    selectedItems.delete(safeItemKey);
    renderSelectedItems();
    updateSingleBadge(safeItemKey, 0); // Update badges
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

// Quantity input visibility management
function updateQuantityInputVisibility() {
    document.querySelectorAll('.qty-input').forEach(input => {
        const value = parseInt(input.value) || 1;
        if (value > 1) {
            input.classList.add('has-quantity');
        } else {
            input.classList.remove('has-quantity');
        }
    });
}

// Remove popup functions
function showRemovePopup(safeItemKey) {
    currentRemoveItem = safeItemKey;
    const currentQty = selectedItems.get(safeItemKey) || 1;
    
    const overlay = document.getElementById('removePopupOverlay');
    const removeInput = document.getElementById('removeQtyInput');
    
    removeInput.value = 1;
    removeInput.max = currentQty;
    
    // Show the popup
    overlay.classList.add('show');
    
    // Wait for the CSS transition to complete, then focus
    overlay.addEventListener('transitionend', function focusHandler(e) {
        // Only listen for the opacity transition, not nested element transitions
        if (e.target === overlay && e.propertyName === 'opacity') {
            removeInput.focus();
            removeInput.select();
            overlay.removeEventListener('transitionend', focusHandler);
        }
    });
}

function confirmRemove() {
    if (!currentRemoveItem) return;
    
    const removeQty = parseInt(document.getElementById('removeQtyInput').value) || 1;
    const currentQty = selectedItems.get(currentRemoveItem) || 1;
    
    let newQty; // Define the variable
    
    if (removeQty >= currentQty) {
        selectedItems.delete(currentRemoveItem);
        newQty = 0; // Set to 0 when item is completely removed
    } else {
        newQty = currentQty - removeQty; // Calculate and store the new quantity
        selectedItems.set(currentRemoveItem, newQty);
    }
    
    renderSelectedItems();
    updateSingleBadge(currentRemoveItem, newQty); // Now newQty is properly defined
    hideRemovePopup();
}

// Collection toggle function
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

function focusQuantityInput(safeItemKey) {
    const input = document.querySelector(`input[data-item="${safeItemKey}"]`);
    if (input) {
        input.focus();
        input.select();
    }
}

function handleRemoveInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        confirmRemove();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        hideRemovePopup();
    }
}