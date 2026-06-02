// ============================================
// Auth Guard — redirect to login if not signed in
// ============================================
(function authGuard() {
    const user = sessionStorage.getItem('tms_user');
    if (!user) {
        window.location.replace('/login.html');
    } else {
        // Populate sidebar user info from session
        const userData = JSON.parse(user);
        const nameEl = document.querySelector('.user-info h4');
        const roleEl = document.querySelector('.user-info p');
        if (nameEl) nameEl.innerText = userData.username || 'Admin User';
        if (roleEl) roleEl.innerText = userData.role || 'Laboratory Manager';
    }
})();

// In-memory data mirroring server state
let testsData = [];

// Initialize Full-Stack Client
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupNavigation();
    setupFiltersAndSearch();
});

/**
 * Load stats and test records from backend
 */
async function loadAllData() {
    await fetchStats();
    await fetchTests();
}

/**
 * Fetch statistics summary for the overview cards
 */
async function fetchStats() {
    try {
        const response = await fetch('/api/tests/stats');
        if (!response.ok) throw new Error('Failed to retrieve statistics.');
        
        const stats = await response.json();
        
        // Update stats card values in Overview UI
        const totalCard = document.querySelector('.stats-grid .stat-card:nth-child(1) h2');
        const pendingCard = document.querySelector('.stats-grid .stat-card:nth-child(2) h2');
        const completedCard = document.querySelector('.stats-grid .stat-card:nth-child(3) h2');
        const patientsCard = document.querySelector('.stats-grid .stat-card:nth-child(4) h2');
        
        if (totalCard) totalCard.innerText = stats.totalTests.toLocaleString();
        if (pendingCard) pendingCard.innerText = stats.pendingTests.toLocaleString();
        if (completedCard) completedCard.innerText = stats.completedToday.toLocaleString();
        if (patientsCard) patientsCard.innerText = stats.newPatients.toLocaleString();
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Unable to synchronize system statistics.');
    }
}

/**
 * Fetch test records with search queries and dropdown filters
 */
async function fetchTests() {
    try {
        const searchInput = document.querySelector('.search-bar input');
        const filterStatus = document.getElementById('filter-status');
        const filterType = document.getElementById('filter-type');

        const params = new URLSearchParams();
        if (searchInput && searchInput.value.trim()) {
            params.append('q', searchInput.value.trim());
        }
        if (filterStatus && filterStatus.value !== 'All') {
            params.append('status', filterStatus.value);
        }
        if (filterType && filterType.value !== 'All') {
            params.append('type', filterType.value);
        }

        const response = await fetch(`/api/tests?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to retrieve tests list.');
        
        const rawTests = await response.json();
        
        // Map database fields to standard frontend shape to keep logic unchanged
        testsData = rawTests.map(t => ({
            id: t.test_id_string,
            name: t.patient_name,
            contact: t.contact_number,
            email: t.email_address || '',
            dob: t.dob,
            type: t.test_type,
            date: t.test_date,
            status: t.status,
            result: t.result_summary || '',
            notes: t.notes || ''
        }));
        
        // Re-populate both tables
        populateDashboardTable();
        populateRecordsTable();
        
    } catch (error) {
        console.error('Error loading tests:', error);
        showToast('Failed to load test data from server.');
    }
}

/**
 * Hook up real-time search typing and filter select events
 */
function setupFiltersAndSearch() {
    const filterStatus = document.getElementById('filter-status');
    const filterType = document.getElementById('filter-type');
    const applyFiltersBtn = document.querySelector('.records-filters .secondary-btn');
    const searchInput = document.querySelector('.search-bar input');

    // Filter changes
    if (filterStatus) filterStatus.addEventListener('change', fetchTests);
    if (filterType) filterType.addEventListener('change', fetchTests);
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fetchTests();
        });
    }

    // Dynamic search with a responsive 250ms keyboard debounce
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchTests();
            }, 250);
        });
    }
}

// View Navigation
function switchView(viewId) {
    // Update active nav link
    document.querySelectorAll('.nav-links li').forEach(li => {
        if(li.dataset.target === viewId) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });

    // Update active view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active-view');
    });
    
    document.getElementById(viewId).classList.add('active-view');
    
    // Proactively reload data when returning to Dashboard or Test Records
    if (viewId === 'dashboard' || viewId === 'records') {
        loadAllData();
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.addEventListener('click', () => {
            switchView(li.dataset.target);
        });
    });
}

// Generate Tables Helper
function getStatusBadge(status) {
    const icon = status === 'Completed' ? 'bx-check' : 'bx-time-five';
    const className = status.toLowerCase();
    return `<span class="status-badge ${className}"><i class='bx ${icon}'></i> ${status}</span>`;
}

function populateDashboardTable() {
    const tbody = document.querySelector('#dashboard-table tbody');
    tbody.innerHTML = '';
    
    // Show only first 3 for dashboard overview
    const recentTests = testsData.slice(0, 3);
    
    if (recentTests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No recent tests found.</td></tr>`;
        return;
    }

    recentTests.forEach(test => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${test.id}</strong></td>
            <td>${test.name}</td>
            <td>${test.type}</td>
            <td>${test.date}</td>
            <td>${getStatusBadge(test.status)}</td>
            <td>
                <button class="text-btn" onclick="openUpdateModal('${test.id}')">
                    ${test.status === 'Pending' ? 'Update' : 'View'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateRecordsTable() {
    const tbody = document.querySelector('#records-table tbody');
    tbody.innerHTML = '';
    
    if (testsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-secondary);">No matching test records found.</td></tr>`;
        return;
    }

    testsData.forEach(test => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${test.id}</strong></td>
            <td>${test.name}</td>
            <td>${test.contact}</td>
            <td>${test.type}</td>
            <td>${test.date}</td>
            <td>${getStatusBadge(test.status)}</td>
            <td>
                <button class="text-btn" onclick="openUpdateModal('${test.id}')">
                    ${test.status === 'Pending' ? 'Update Result' : 'View Result'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Handle form submission for registering a new test
 */
async function handleRegistration(e) {
    e.preventDefault();
    
    const payload = {
        name: document.getElementById('patientName').value,
        contact: document.getElementById('contactNumber').value,
        email: document.getElementById('emailAddress').value || '',
        dob: document.getElementById('dob').value,
        type: document.getElementById('testType').value,
        notes: document.getElementById('notes').value || ''
    };
    
    try {
        const response = await fetch('/api/tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to register test on the server.');
        }
        
        // Reset form inputs
        e.target.reset();
        
        // Show success alert toast
        showToast('Test successfully registered!');
        
        // Synchronize data immediately
        await loadAllData();
        
        // Switch to records view
        setTimeout(() => {
            switchView('records');
        }, 1200);
        
    } catch (error) {
        console.error('Registration failed:', error);
        showToast(error.message || 'Server error. Failed to save registration.');
    }
}

// Modal Handling
function openUpdateModal(id) {
    const test = testsData.find(t => t.id === id);
    if (!test) return;
    
    document.getElementById('update-id').value = test.id;
    document.getElementById('update-status').value = test.status;
    document.getElementById('update-result').value = test.result;
    
    const modal = document.getElementById('updateModal');
    if (modal) modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('updateModal');
    if (modal) modal.classList.remove('show');
}

/**
 * Handle updating test status and findings summary
 */
async function handleUpdateResult(e) {
    e.preventDefault();
    
    const testId = document.getElementById('update-id').value;
    const status = document.getElementById('update-status').value;
    const resultSummary = document.getElementById('update-result').value;
    
    try {
        const response = await fetch(`/api/tests/${testId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: status,
                result_summary: resultSummary
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update test record on the server.');
        }
        
        // Close modal and show success toast
        closeModal();
        showToast('Result updated successfully!');
        
        // Synchronize data immediately
        await loadAllData();
        
    } catch (error) {
        console.error('Result update failed:', error);
        showToast(error.message || 'Server error. Failed to update results.');
    }
}

// Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (toast && toastMsg) {
        toastMsg.innerText = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('updateModal');
    if (event.target === modal) {
        closeModal();
    }
}

// ============================================
// Logout
// ============================================
function handleLogout() {
    sessionStorage.removeItem('tms_user');
    window.location.replace('/login.html');
}
