/**
 * NameHub - Frontend Controller
 * Complete CRUD, Filtering, Sorting, Theming & Real-time State Management
 */

// Determine API Base URL dynamically
const API_BASE = (window.location.protocol.startsWith('http')) 
    ? window.location.origin 
    : 'http://localhost:9191';

// Application State
let namesCache = [];
let filteredNames = [];
let currentFilter = '';
let currentSort = 'id-asc';
let currentView = 'table';
let pendingDeleteId = null;
let currentInspectedItem = null;

// Color palette generator for user initials/avatars
const AVATAR_COLORS = [
    { bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', dot: 'bg-indigo-500' },
    { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
    { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500' },
    { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', dot: 'bg-purple-500' },
    { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
    { bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', dot: 'bg-rose-500' },
    { bg: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300', dot: 'bg-teal-500' },
    { bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', dot: 'bg-sky-500' }
];

function getAvatarStyle(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log(`[Toast ${type}]: ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium max-w-sm transition-all`;

    let iconSvg = '';
    let typeClasses = '';

    switch (type) {
        case 'success':
            typeClasses = 'bg-white dark:bg-slate-900 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/10';
            iconSvg = `<svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
            break;
        case 'error':
            typeClasses = 'bg-white dark:bg-slate-900 border-rose-500/30 text-rose-800 dark:text-rose-300 shadow-rose-500/10';
            iconSvg = `<svg class="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
            break;
        case 'warning':
            typeClasses = 'bg-white dark:bg-slate-900 border-amber-500/30 text-amber-800 dark:text-amber-300 shadow-amber-500/10';
            iconSvg = `<svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
            break;
        default:
            typeClasses = 'bg-white dark:bg-slate-900 border-indigo-500/30 text-slate-800 dark:text-slate-200 shadow-indigo-500/10';
            iconSvg = `<svg class="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
            break;
    }

    toast.className += ` ${typeClasses}`;
    toast.innerHTML = `
        ${iconSvg}
        <span class="flex-1">${message}</span>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 p-0.5" onclick="this.parentElement.remove()">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

/* ==========================================================================
   API Connectivity & Health Ping
   ========================================================================== */
function updateApiStatus(isOnline, message = '') {
    const dot = document.getElementById('apiStatusDot');
    const text = document.getElementById('apiStatusText');
    if (!dot || !text) return;

    if (isOnline) {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        text.textContent = 'API Connected (:9191)';
        text.className = 'text-emerald-700 dark:text-emerald-400';
    } else {
        dot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-ping';
        text.textContent = message || 'API Offline (Check port 9191)';
        text.className = 'text-rose-600 dark:text-rose-400';
    }
}

/* ==========================================================================
   Core CRUD Operations
   ========================================================================== */

/**
 * Fetch all names from backend
 */
async function getAllNames(isManualRefresh = false) {
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    const tableBody = document.getElementById('nameTableBody');
    const refreshIcon = document.getElementById('refreshIcon');

    if (refreshIcon) refreshIcon.classList.add('animate-spin');
    if (loadingSkeleton && namesCache.length === 0) loadingSkeleton.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE}/name/getAllNames`);
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        const data = await response.json();
        namesCache = Array.isArray(data) ? data : [];
        updateApiStatus(true);

        if (isManualRefresh) {
            showToast('Refreshed directory records', 'info');
        }

        renderDirectory();
        updateStats();

    } catch (error) {
        console.error('Failed to fetch names:', error);
        updateApiStatus(false, 'Cannot reach Spring Boot server');
        if (isManualRefresh) {
            showToast('Unable to connect to http://localhost:9191/name/getAllNames', 'error');
        }
        renderDirectory();
    } finally {
        if (loadingSkeleton) loadingSkeleton.classList.add('hidden');
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('animate-spin'), 300);
        }
    }
}

/**
 * Add a new name
 */
async function addName() {
    const input = document.getElementById('nameInput');
    const addBtn = document.getElementById('addBtn');
    const addBtnText = document.getElementById('addBtnText');

    if (!input) return;
    const nameVal = input.value.trim();

    if (!nameVal) {
        showToast('Please enter a valid name', 'warning');
        input.focus();
        return;
    }

    if (addBtn) {
        addBtn.disabled = true;
        if (addBtnText) addBtnText.textContent = 'Saving...';
    }

    try {
        const response = await fetch(`${API_BASE}/name/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: nameVal })
        });

        if (!response.ok) {
            throw new Error(`Failed to save: HTTP ${response.status}`);
        }

        const reply = await response.text();
        showToast(`"${nameVal}" saved successfully!`, 'success');

        input.value = '';
        updateCharCounter();
        await getAllNames();

    } catch (error) {
        console.error('Error adding name:', error);
        showToast('Failed to save name. Ensure Spring Boot is running.', 'error');
    } finally {
        if (addBtn) {
            addBtn.disabled = false;
            if (addBtnText) addBtnText.textContent = 'Save Record';
        }
    }
}

/**
 * Lookup single name by ID (Quick Inspector)
 */
async function lookupNameById() {
    const input = document.getElementById('lookupIdInput');
    const resultCard = document.getElementById('inspectorResultCard');
    const notFoundCard = document.getElementById('inspectorNotFound');
    const badgeId = document.getElementById('inspectBadgeId');
    const resultName = document.getElementById('inspectResultName');
    const editBtn = document.getElementById('inspectEditBtn');
    const deleteBtn = document.getElementById('inspectDeleteBtn');

    if (!input) return;
    const idVal = input.value.trim();

    if (!idVal || isNaN(idVal)) {
        showToast('Please enter a valid numeric ID', 'warning');
        input.focus();
        return;
    }

    if (resultCard) resultCard.classList.add('hidden');
    if (notFoundCard) notFoundCard.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/name/getById/${idVal}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.id) {
            currentInspectedItem = data;
            if (badgeId) badgeId.textContent = `#${data.id}`;
            if (resultName) resultName.textContent = data.name || 'Unnamed';
            if (resultCard) resultCard.classList.remove('hidden');

            if (editBtn) {
                editBtn.onclick = () => openEditModal(data.id, data.name);
            }
            if (deleteBtn) {
                deleteBtn.onclick = () => confirmDelete(data.id, data.name);
            }

            showToast(`Found record #${data.id}`, 'info');
        } else {
            currentInspectedItem = null;
            if (notFoundCard) notFoundCard.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error in lookup:', error);
        currentInspectedItem = null;
        if (notFoundCard) notFoundCard.classList.remove('hidden');
    }
}

/**
 * Dedicated function for searchById.html
 */
async function getNameById() {
    const searchInput = document.getElementById('searchId');
    const spinner = document.getElementById('searchSpinner');
    const resultCard = document.getElementById('resultCard');
    const notFoundCard = document.getElementById('notFoundCard');
    const resultBadgeId = document.getElementById('resultBadgeId');
    const resultNameDisplay = document.getElementById('resultNameDisplay');
    const fallbackResult = document.getElementById('result');

    if (!searchInput) return;
    const id = searchInput.value.trim();

    if (!id || isNaN(id)) {
        showToast('Please enter an ID number', 'warning');
        searchInput.focus();
        return;
    }

    if (spinner) spinner.classList.remove('hidden');
    if (resultCard) resultCard.classList.add('hidden');
    if (notFoundCard) notFoundCard.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/name/getById/${id}`);
        const data = await response.json();

        if (spinner) spinner.classList.add('hidden');

        if (data && data.id) {
            currentInspectedItem = data;
            if (resultBadgeId) resultBadgeId.textContent = `#${data.id}`;
            if (resultNameDisplay) resultNameDisplay.textContent = data.name;
            if (resultCard) resultCard.classList.remove('hidden');

            if (fallbackResult) {
                fallbackResult.textContent = `ID: ${data.id} - Name: ${data.name}`;
            }
            showToast(`Record #${data.id} located`, 'success');
        } else {
            currentInspectedItem = null;
            if (notFoundCard) notFoundCard.classList.remove('hidden');
            if (fallbackResult) fallbackResult.textContent = 'Name not found';
        }
    } catch (error) {
        if (spinner) spinner.classList.add('hidden');
        if (notFoundCard) notFoundCard.classList.remove('hidden');
        if (fallbackResult) fallbackResult.textContent = 'Name not found';
        console.error('Error fetching name by id:', error);
    }
}

function copyResultText() {
    if (currentInspectedItem && currentInspectedItem.name) {
        copyToClipboard(currentInspectedItem.name, `Copied "${currentInspectedItem.name}" to clipboard`);
    }
}

async function deleteFromPage() {
    if (!currentInspectedItem || !currentInspectedItem.id) return;
    if (!confirm(`Are you sure you want to delete record #${currentInspectedItem.id} (${currentInspectedItem.name})?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/name/delete/${currentInspectedItem.id}`, { method: 'DELETE' });
        showToast(`Record #${currentInspectedItem.id} deleted`, 'info');
        document.getElementById('resultCard')?.classList.add('hidden');
        document.getElementById('searchId').value = '';
        currentInspectedItem = null;
    } catch (err) {
        showToast('Failed to delete record', 'error');
    }
}

/* ==========================================================================
   Edit / Update Operations
   ========================================================================== */
function openEditModal(id, currentName) {
    const modal = document.getElementById('editModal');
    const idField = document.getElementById('editModalId');
    const nameField = document.getElementById('editModalName');

    if (!modal || !idField || !nameField) return;

    idField.value = id;
    nameField.value = currentName || '';
    modal.classList.remove('hidden');
    nameField.focus();
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('hidden');
}

async function submitEdit() {
    const idField = document.getElementById('editModalId');
    const nameField = document.getElementById('editModalName');
    const saveBtn = document.getElementById('saveEditBtn');

    if (!idField || !nameField) return;
    const id = parseInt(idField.value, 10);
    const updatedName = nameField.value.trim();

    if (!updatedName) {
        showToast('Name cannot be empty', 'warning');
        nameField.focus();
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    try {
        // Try PUT /name/update first; fall back to POST /name/add with ID
        let response = await fetch(`${API_BASE}/name/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, name: updatedName })
        }).catch(() => null);

        if (!response || !response.ok) {
            response = await fetch(`${API_BASE}/name/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, name: updatedName })
            });
        }

        if (!response.ok) {
            throw new Error(`Failed to update: HTTP ${response.status}`);
        }

        closeEditModal();
        showToast(`Record #${id} updated successfully!`, 'success');
        await getAllNames();

        // If inspector is showing this item, update it too
        if (currentInspectedItem && currentInspectedItem.id === id) {
            currentInspectedItem.name = updatedName;
            const inspectName = document.getElementById('inspectResultName');
            if (inspectName) inspectName.textContent = updatedName;
        }

    } catch (error) {
        console.error('Update error:', error);
        showToast('Failed to update record', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

/* ==========================================================================
   Delete Operations
   ========================================================================== */
function confirmDelete(id, name) {
    pendingDeleteId = id;
    const modal = document.getElementById('deleteModal');
    const targetLabel = document.getElementById('deleteModalTarget');

    if (!modal) {
        if (confirm(`Delete record #${id} (${name})?`)) {
            executeDeleteDirect(id);
        }
        return;
    }

    if (targetLabel) {
        targetLabel.textContent = `#${id} (${name || 'Unnamed'})`;
    }
    modal.classList.remove('hidden');
}

function closeDeleteModal() {
    pendingDeleteId = null;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
}

async function executeDelete() {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    const btn = document.getElementById('confirmDeleteBtn');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Deleting...';
    }

    await executeDeleteDirect(idToDelete);
    closeDeleteModal();

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete Record';
    }
}

async function executeDeleteDirect(id) {
    try {
        const response = await fetch(`${API_BASE}/name/delete/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Delete failed: HTTP ${response.status}`);
        }

        showToast(`Record #${id} deleted`, 'info');

        // Hide inspector if it matches deleted ID
        if (currentInspectedItem && currentInspectedItem.id === id) {
            document.getElementById('inspectorResultCard')?.classList.add('hidden');
            currentInspectedItem = null;
        }

        await getAllNames();

    } catch (error) {
        console.error('Error deleting record:', error);
        showToast(`Failed to delete record #${id}`, 'error');
    }
}

/* ==========================================================================
   Delete All Operations
   ========================================================================== */
function confirmDeleteAll() {
    if (namesCache.length === 0) {
        showToast('No records to delete', 'warning');
        return;
    }

    const modal = document.getElementById('deleteAllModal');
    const targetCount = document.getElementById('deleteAllTargetCount');

    if (targetCount) {
        targetCount.textContent = `${namesCache.length} ${namesCache.length === 1 ? 'record' : 'records'}`;
    }

    if (modal) {
        modal.classList.remove('hidden');
    } else {
        if (confirm(`Are you sure you want to delete ALL ${namesCache.length} records? This cannot be undone.`)) {
            executeDeleteAll();
        }
    }
}

function closeDeleteAllModal() {
    const modal = document.getElementById('deleteAllModal');
    if (modal) modal.classList.add('hidden');
}

async function executeDeleteAll() {
    const btn = document.getElementById('confirmDeleteAllBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Deleting All...</span>
        `;
    }

    try {
        const response = await fetch(`${API_BASE}/name/deleteAll`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Delete all failed: HTTP ${response.status}`);
        }

        showToast('All records deleted. Next entry will start from ID #1', 'info');

        // Reset inspector
        document.getElementById('inspectorResultCard')?.classList.add('hidden');
        currentInspectedItem = null;

        closeDeleteAllModal();
        await getAllNames();

    } catch (error) {
        console.error('Error deleting all records:', error);
        showToast('Failed to delete all records from server', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Yes, Delete All</span>
            `;
        }
    }
}

/* ==========================================================================
   Resequence Operation
   ========================================================================== */
async function resequenceRecords() {
    if (namesCache.length === 0) {
        showToast('No records to re-sequence', 'warning');
        return;
    }

    const btn = document.getElementById('resequenceBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50');
    }

    try {
        let res = await fetch(`${API_BASE}/name/resequence`, { method: 'POST' }).catch(() => null);
        if (!res || !res.ok) {
            res = await fetch(`${API_BASE}/name/resequence`);
        }

        showToast('Records re-sequenced into consecutive order (1, 2, 3...)', 'success');
        await getAllNames();

    } catch (err) {
        console.error('Error resequencing:', err);
        showToast('Failed to resequence records', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
        }
    }
}

/* ==========================================================================
   Filtering & Sorting Engine
   ========================================================================== */
function handleFilterChange() {
    const input = document.getElementById('filterInput');
    const clearBtn = document.getElementById('clearFilterBtn');

    currentFilter = (input ? input.value : '').trim().toLowerCase();

    if (clearBtn) {
        clearBtn.classList.toggle('hidden', currentFilter.length === 0);
    }

    renderDirectory();
    updateStats();
}

function clearFilter() {
    const input = document.getElementById('filterInput');
    if (input) input.value = '';
    handleFilterChange();
    input?.focus();
}

function handleSortChange() {
    const select = document.getElementById('sortSelect');
    if (select) currentSort = select.value;
    renderDirectory();
}

function setViewMode(mode) {
    currentView = mode;
    const tableBtn = document.getElementById('tableViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');
    const tableContainer = document.getElementById('tableViewContainer');
    const gridContainer = document.getElementById('gridViewContainer');

    if (mode === 'table') {
        tableBtn?.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-600', 'dark:text-slate-300');
        tableBtn?.classList.remove('text-slate-400');
        gridBtn?.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-600', 'dark:text-slate-300');
        gridBtn?.classList.add('text-slate-400');

        tableContainer?.classList.remove('hidden');
        gridContainer?.classList.add('hidden');
    } else {
        gridBtn?.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-600', 'dark:text-slate-300');
        gridBtn?.classList.remove('text-slate-400');
        tableBtn?.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-600', 'dark:text-slate-300');
        tableBtn?.classList.add('text-slate-400');

        gridContainer?.classList.remove('hidden');
        tableContainer?.classList.add('hidden');
    }

    renderDirectory();
}

/* ==========================================================================
   DOM Rendering & UI Views
   ========================================================================== */
function renderDirectory() {
    const tableBody = document.getElementById('nameTableBody');
    const gridContainer = document.getElementById('gridViewContainer');
    const emptyState = document.getElementById('emptyState');
    const emptyStateTitle = document.getElementById('emptyStateTitle');
    const emptyStateDesc = document.getElementById('emptyStateDesc');

    if (!tableBody && !gridContainer) return;

    // Filter
    filteredNames = namesCache.filter(item => {
        if (!currentFilter) return true;
        const idMatch = String(item.id).includes(currentFilter);
        const nameMatch = (item.name || '').toLowerCase().includes(currentFilter);
        return idMatch || nameMatch;
    });

    // Sort
    filteredNames.sort((a, b) => {
        switch (currentSort) {
            case 'id-asc':
                return a.id - b.id;
            case 'id-desc':
                return b.id - a.id;
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');
            default:
                return a.id - b.id;
        }
    });

    // Check Empty State
    if (filteredNames.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (gridContainer) gridContainer.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            if (currentFilter) {
                if (emptyStateTitle) emptyStateTitle.textContent = 'No matching records';
                if (emptyStateDesc) emptyStateDesc.textContent = `No names found matching "${currentFilter}". Try a different filter term.`;
            } else {
                if (emptyStateTitle) emptyStateTitle.textContent = 'No names in database yet';
                if (emptyStateDesc) emptyStateDesc.textContent = 'Start by registering your first name record using the card above.';
            }
        }
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Render Table
    if (tableBody) {
        tableBody.innerHTML = filteredNames.map((item, index) => {
            const seqNumber = index + 1;
            const avatar = getAvatarStyle(item.name);
            const initials = getInitials(item.name);
            const safeName = escapeHtml(item.name);

            return `
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group">
                    <td class="py-3.5 px-6 font-mono text-xs font-bold text-slate-400">
                        #${seqNumber}
                    </td>
                    <td class="py-3.5 px-6 font-mono text-xs font-semibold">
                        <button 
                            onclick="copyToClipboard('${item.id}', 'Copied ID #${item.id}')"
                            title="Click to copy ID"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/60 dark:hover:text-brand-300 transition"
                        >
                            <span>ID: ${item.id}</span>
                            <svg class="w-3 h-3 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        </button>
                    </td>
                    <td class="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                        ${safeName}
                    </td>
                    <td class="py-3.5 px-6">
                        <div class="inline-flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg ${avatar.bg} font-bold text-xs flex items-center justify-center font-mono">
                                ${initials}
                            </span>
                            <span class="w-1.5 h-1.5 rounded-full ${avatar.dot}"></span>
                        </div>
                    </td>
                    <td class="py-3.5 px-6 text-right">
                        <div class="inline-flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                            <button 
                                onclick="openEditModal(${item.id}, '${escapeQuote(item.name)}')" 
                                title="Edit Record"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 transition"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button 
                                onclick="confirmDelete(${item.id}, '${escapeQuote(item.name)}')" 
                                title="Delete Record"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render Grid Cards
    if (gridContainer) {
        gridContainer.innerHTML = filteredNames.map((item, index) => {
            const seqNumber = index + 1;
            const avatar = getAvatarStyle(item.name);
            const initials = getInitials(item.name);
            const safeName = escapeHtml(item.name);

            return `
                <div class="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition group flex flex-col justify-between">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-2.5">
                            <div class="w-10 h-10 rounded-xl ${avatar.bg} font-bold text-sm flex items-center justify-center font-mono shadow-sm">
                                ${initials}
                            </div>
                            <span class="text-xs font-mono font-bold text-slate-400">#${seqNumber}</span>
                        </div>
                        <button 
                            onclick="copyToClipboard('${item.id}', 'Copied ID #${item.id}')"
                            title="Click to copy ID"
                            class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-500 transition"
                        >
                            ID: ${item.id}
                        </button>
                    </div>

                    <div class="mb-4">
                        <h4 class="font-bold text-sm text-slate-900 dark:text-white truncate" title="${safeName}">${safeName}</h4>
                        <span class="text-[11px] text-slate-400">Database Entry</span>
                    </div>

                    <div class="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <button 
                            onclick="copyToClipboard('${escapeQuote(item.name)}', 'Copied name to clipboard')"
                            class="text-xs text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 transition"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                            Copy
                        </button>
                        <div class="flex items-center space-x-1">
                            <button 
                                onclick="openEditModal(${item.id}, '${escapeQuote(item.name)}')" 
                                class="p-1 rounded text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button 
                                onclick="confirmDelete(${item.id}, '${escapeQuote(item.name)}')" 
                                class="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

/* ==========================================================================
   Stats & Overview Updates
   ========================================================================== */
function updateStats() {
    const totalCount = document.getElementById('statTotalCount');
    const latestId = document.getElementById('statLatestId');
    const filteredCount = document.getElementById('statFilteredCount');
    const directoryBadge = document.getElementById('directoryBadgeCount');
    const footerCount = document.getElementById('footerRecordCount');
    const filterStatusText = document.getElementById('filterStatusText');

    const total = namesCache.length;
    const shown = filteredNames.length;

    if (totalCount) totalCount.textContent = total;
    if (filteredCount) filteredCount.textContent = shown;
    if (directoryBadge) directoryBadge.textContent = `${total} ${total === 1 ? 'entry' : 'entries'}`;
    if (footerCount) footerCount.textContent = `Showing ${shown} of ${total} records`;

    if (latestId) {
        if (total > 0) {
            const maxId = Math.max(...namesCache.map(i => i.id));
            latestId.textContent = `#${maxId}`;
        } else {
            latestId.textContent = '-';
        }
    }

    if (filterStatusText) {
        if (currentFilter) {
            filterStatusText.textContent = `Filtered by "${currentFilter}"`;
        } else {
            filterStatusText.textContent = 'All records visible';
        }
    }

    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.disabled = (total === 0);
    }

    const resequenceBtn = document.getElementById('resequenceBtn');
    if (resequenceBtn) {
        resequenceBtn.disabled = (total === 0);
    }
}

/* ==========================================================================
   Export Data (CSV & JSON)
   ========================================================================== */
function exportData(format) {
    if (namesCache.length === 0) {
        showToast('No records available to export', 'warning');
        return;
    }

    if (format === 'csv') {
        const headers = 'ID,Name\n';
        const rows = namesCache.map(item => `${item.id},"${(item.name || '').replace(/"/g, '""')}"`).join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        downloadFile(blob, `namehub_export_${Date.now()}.csv`);
        showToast('Exported CSV file', 'success');
    } else if (format === 'json') {
        const jsonStr = JSON.stringify(namesCache, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        downloadFile(blob, `namehub_export_${Date.now()}.json`);
        showToast('Exported JSON file', 'success');
    }
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ==========================================================================
   Utility Functions
   ========================================================================== */
function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg, 'info');
        }).catch(() => fallbackCopy(text, successMsg));
    } else {
        fallbackCopy(text, successMsg);
    }
}

function fallbackCopy(text, successMsg) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast(successMsg, 'info');
    } catch (e) {
        showToast('Unable to copy', 'warning');
    }
    document.body.removeChild(textarea);
}

function updateCharCounter() {
    const input = document.getElementById('nameInput');
    const counter = document.getElementById('charCounter');
    if (input && counter) {
        counter.textContent = `${input.value.length}/80`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ==========================================================================
   Theme Management (Dark / Light)
   ========================================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('namehub_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    applyTheme(isDark);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentIsDark = document.documentElement.classList.contains('dark');
            applyTheme(!currentIsDark);
            localStorage.setItem('namehub_theme', !currentIsDark ? 'dark' : 'light');
        });
    }
}

function applyTheme(isDark) {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    if (isDark) {
        document.documentElement.classList.add('dark');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    }
}

/* ==========================================================================
   Event Listeners & Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.addEventListener('input', updateCharCounter);
    }

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        // '/' key focuses filter bar (if not typing in input)
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const filterInput = document.getElementById('filterInput');
            filterInput?.focus();
        }

        // 'Escape' closes any open modals
        if (e.key === 'Escape') {
            closeEditModal();
            closeDeleteModal();
            closeDeleteAllModal();
        }
    });

    // Initial fetch if on home page
    if (document.getElementById('nameTableBody') || document.getElementById('nameList')) {
        getAllNames();
    }
});
