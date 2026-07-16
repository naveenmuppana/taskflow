const API_URL = 'http://localhost:8000/api/v1';

// State & Auth Guard
const token = localStorage.getItem('token');
const userEmail = localStorage.getItem('userEmail');

if (!token) {
    // Kicked out if not logged in
    window.location.href = 'index.html';
}

let currentFilter = 'ALL';
let tasks = [];
let searchTimeout = null;

// DOM Elements
const tasksContainer = document.getElementById('tasks-container');
const userEmailSpan = document.getElementById('user-email');
const currentViewTitle = document.getElementById('current-view-title');
const taskModal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskPriorityInput = document.getElementById('task-priority');
const taskDueDateInput = document.getElementById('task-due-date');
const taskCategoryInput = document.getElementById('task-category');

// Filter/Sort DOM Elements
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
const filterCategory = document.getElementById('filter-category');
const sortSelect = document.getElementById('sort-select');

// Initialization
function init() {
    userEmailSpan.textContent = userEmail || 'User';
    fetchTasks();
}

// --- Navigation & Logout ---
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}

// --- Toast Notifications ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--${type}-color)`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Modal Management (FAB) ---
function openModal(taskId = null) {
    if (taskId) {
        modalTitle.textContent = 'Edit Task';
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            taskIdInput.value = task.id;
            taskTitleInput.value = task.title;
            taskDescInput.value = task.description || '';
            taskPriorityInput.value = task.priority || 'MEDIUM';
            // convert UTC ISO string to datetime-local format
            taskDueDateInput.value = task.due_date ? new Date(task.due_date).toISOString().slice(0,16) : '';
            taskCategoryInput.value = task.category || '';
        }
    } else {
        modalTitle.textContent = 'Create New Task';
        taskIdInput.value = '';
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskPriorityInput.value = 'MEDIUM';
        taskDueDateInput.value = '';
        taskCategoryInput.value = '';
    }
    taskModal.classList.add('active');
    taskTitleInput.focus();
}

function closeModal() {
    taskModal.classList.remove('active');
}

// Close modal if clicked outside
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeModal();
    }
});

// --- Debounce Search ---
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchTasks();
    }, 300);
}

function applyFilters() {
    fetchTasks();
}

// --- Task API Operations ---
async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/tasks/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('stat-total').textContent = stats.total_tasks;
            document.getElementById('stat-pending').textContent = stats.pending_tasks;
            document.getElementById('stat-completed').textContent = stats.completed_tasks;
            document.getElementById('stat-overdue').textContent = stats.overdue_tasks;
        }
    } catch (err) {
        console.error('Failed to load stats', err);
    }
}

async function fetchTasks() {
    try {
        // Always refresh stats when tasks change
        fetchStats();

        const queryParams = new URLSearchParams();
        
        const searchVal = searchInput.value.trim();
        if (searchVal) queryParams.append('search', searchVal);
        
        if (currentFilter !== 'ALL') queryParams.append('status', currentFilter);
        
        const priorityVal = filterPriority.value;
        if (priorityVal) queryParams.append('priority', priorityVal);
        
        const categoryVal = filterCategory.value.trim();
        if (categoryVal) queryParams.append('category', categoryVal);
        
        const sortVal = sortSelect.value;
        if (sortVal) queryParams.append('sort_by', sortVal);

        const res = await fetch(`${API_URL}/tasks/?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout(); // Token expired
        
        tasks = await res.json();
        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

async function saveTask(e) {
    e.preventDefault();
    const id = taskIdInput.value;
    
    const payload = {
        title: taskTitleInput.value,
        description: taskDescInput.value || null,
        priority: taskPriorityInput.value,
        due_date: taskDueDateInput.value ? new Date(taskDueDateInput.value).toISOString() : null,
        category: taskCategoryInput.value || null
    };

    try {
        const url = id ? `${API_URL}/tasks/${id}` : `${API_URL}/tasks/`;
        const method = id ? 'PUT' : 'POST';
        
        // If creating, ensure status is PENDING by default
        if (!id) payload.status = 'PENDING';

        const res = await fetch(url, {
            method: method,
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal();
            showToast(id ? 'Task updated!' : 'Task created!');
            fetchTasks(); // Refresh list
        } else {
            const data = await res.json();
            showToast(Array.isArray(data.detail) ? data.detail[0].msg : data.detail, 'danger');
        }
    } catch (err) {
        showToast('Network error', 'danger');
    }
}

async function updateTaskStatus(id, newStatus) {
    try {
        const task = tasks.find(t => t.id === id);
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                status: newStatus,
                priority: task.priority,
                due_date: task.due_date,
                category: task.category
            })
        });

        if (res.ok) fetchTasks();
    } catch (err) {
        showToast('Failed to update task', 'danger');
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Task deleted');
            fetchTasks();
        }
    } catch (err) {
        showToast('Failed to delete task', 'danger');
    }
}

// --- UI Rendering ---
function filterTasksByStatus(status, element) {
    currentFilter = status;
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    
    // Update Header Title
    if (status === 'ALL') currentViewTitle.textContent = 'All Tasks';
    else if (status === 'PENDING') currentViewTitle.textContent = 'Pending Tasks';
    else if (status === 'IN_PROGRESS') currentViewTitle.textContent = 'In Progress Tasks';
    else if (status === 'COMPLETED') currentViewTitle.textContent = 'Completed Tasks';

    fetchTasks();
}
// For backward compat with HTML onclicks
window.filterTasks = function(status) {
    filterTasksByStatus(status, event.currentTarget);
}

function renderTasks() {
    tasksContainer.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📭</div>
                <h3>No tasks found</h3>
                <p>Click the + button in the corner to create one.</p>
            </div>
        `;
        return;
    }

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        
        const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const icon = task.status === 'COMPLETED' ? '↺' : '✓';
        const opacityStyle = task.status === 'COMPLETED' ? 'opacity: 0.6;' : '';
        const lineStyle = task.status === 'COMPLETED' ? 'text-decoration: line-through;' : '';
        
        let overdueClass = '';
        if (task.due_date && task.status !== 'COMPLETED') {
            const dueDate = new Date(task.due_date);
            if (dueDate < new Date()) {
                overdueClass = 'overdue';
            }
        }

        const dueDateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
        
        div.innerHTML = `
            <div class="task-content ${overdueClass}" style="${opacityStyle}" onclick="openModal(${task.id})">
                <div class="task-title" style="${lineStyle}">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                    <span class="status-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                    ${task.category ? `<span class="category-badge">${escapeHtml(task.category)}</span>` : ''}
                    <span class="${overdueClass ? 'overdue-text' : ''}">Due: ${dueDateDisplay}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="updateTaskStatus(${task.id}, '${nextStatus}')" title="${task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Complete'}">${icon}</button>
                <button class="btn-icon delete" onclick="deleteTask(${task.id})" title="Delete Task">✕</button>
            </div>
        `;
        tasksContainer.appendChild(div);
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Start app
init();
