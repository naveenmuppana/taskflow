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

// DOM Elements
const tasksContainer = document.getElementById('tasks-container');
const userEmailSpan = document.getElementById('user-email');
const currentViewTitle = document.getElementById('current-view-title');
const taskModal = document.getElementById('task-modal');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');

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
function openModal() {
    taskModal.classList.add('active');
    taskTitleInput.focus();
}

function closeModal() {
    taskModal.classList.remove('active');
    taskTitleInput.value = '';
    taskDescInput.value = '';
}

// Close modal if clicked outside
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeModal();
    }
});

// --- Task API Operations ---
async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout(); // Token expired
        
        tasks = await res.json();
        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

async function createTask(e) {
    e.preventDefault();
    
    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: taskTitleInput.value,
                description: taskDescInput.value || null
            })
        });

        if (res.ok) {
            closeModal();
            showToast('Task created!');
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
                status: newStatus
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
function filterTasks(status) {
    currentFilter = status;
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Update Header Title
    if (status === 'ALL') currentViewTitle.textContent = 'All Tasks';
    else if (status === 'PENDING') currentViewTitle.textContent = 'Pending Tasks';
    else if (status === 'IN_PROGRESS') currentViewTitle.textContent = 'In Progress Tasks';
    else if (status === 'COMPLETED') currentViewTitle.textContent = 'Completed Tasks';

    renderTasks();
}

function renderTasks() {
    tasksContainer.innerHTML = '';
    
    const filteredTasks = currentFilter === 'ALL' 
        ? tasks 
        : tasks.filter(t => t.status === currentFilter);

    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📭</div>
                <h3>No tasks found</h3>
                <p>Click the + button in the corner to create one.</p>
            </div>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        
        // Logic for toggling status quickly via the check icon
        const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const icon = task.status === 'COMPLETED' ? '↺' : '✓';
        const opacityStyle = task.status === 'COMPLETED' ? 'opacity: 0.6;' : '';
        const lineStyle = task.status === 'COMPLETED' ? 'text-decoration: line-through;' : '';
        
        div.innerHTML = `
            <div class="task-content" style="${opacityStyle}">
                <div class="task-title" style="${lineStyle}">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                    <span>Created: ${new Date(task.created_at).toLocaleDateString()}</span>
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
