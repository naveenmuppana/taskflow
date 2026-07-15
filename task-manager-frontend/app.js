const API_URL = 'http://localhost:8000/api/v1';

// State
let token = localStorage.getItem('token');
let currentAuthTab = 'login';
let currentFilter = 'ALL';
let tasks = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const authSubmitBtn = document.getElementById('auth-submit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const tasksContainer = document.getElementById('tasks-container');

// Initialization
function init() {
    if (token) {
        showDashboard();
    } else {
        showAuth();
    }
}

// --- Views & UI ---
function showAuth() {
    authView.classList.add('active');
    dashboardView.classList.remove('active');
}

function showDashboard() {
    authView.classList.remove('active');
    dashboardView.classList.add('active');
    fetchTasks();
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    authSubmitBtn.textContent = tab === 'login' ? 'Login' : 'Register';
    authError.textContent = '';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--${type}-color)`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Authentication ---
async function handleAuth(e) {
    e.preventDefault();
    authError.textContent = '';
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        if (currentAuthTab === 'login') {
            await login(email, password);
        } else {
            await register(email, password);
            showToast('Registration successful! Logging you in...');
            await login(email, password);
        }
    } catch (err) {
        authError.textContent = err.message;
    }
}

async function login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');

    token = data.access_token;
    localStorage.setItem('token', token);
    document.getElementById('user-email').textContent = email;
    showDashboard();
}

async function register(email, password) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
        // FastAPI sometimes returns array of Validation errors
        if (Array.isArray(data.detail)) {
            throw new Error(data.detail[0].msg);
        }
        throw new Error(data.detail || 'Registration failed');
    }
}

function logout() {
    token = null;
    localStorage.removeItem('token');
    showAuth();
}

// --- Task Management ---
async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) return logout();
        
        tasks = await res.json();
        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

async function createTask(e) {
    e.preventDefault();
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-desc');
    
    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: titleInput.value,
                description: descInput.value || null
            })
        });

        if (res.ok) {
            titleInput.value = '';
            descInput.value = '';
            showToast('Task created!');
            fetchTasks();
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

function filterTasks(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderTasks();
}

function renderTasks() {
    tasksContainer.innerHTML = '';
    
    const filteredTasks = currentFilter === 'ALL' 
        ? tasks 
        : tasks.filter(t => t.status === currentFilter);

    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `<p style="text-align:center; color:var(--text-secondary); margin-top:2rem;">No tasks found.</p>`;
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
                <button class="btn-icon" onclick="updateTaskStatus(${task.id}, '${nextStatus}')" title="Toggle Status">${icon}</button>
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
