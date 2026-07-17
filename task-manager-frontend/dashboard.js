const API_URL = 'http://localhost:8000/api/v1';

// State & Auth Guard
const token = localStorage.getItem('token');
const userEmail = localStorage.getItem('userEmail');

if (!token) {
    window.location.href = 'index.html';
}

let currentFilter = 'ALL';
let currentSearchTerm = '';
let tasks = [];
let categories = [];
let tags = [];

// DOM Elements
const tasksContainer = document.getElementById('tasks-container');
const userEmailSpan = document.getElementById('user-email');
const currentViewTitle = document.getElementById('current-view-title');

// Create Modal Elements
const taskModal = document.getElementById('task-modal');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskPriorityInput = document.getElementById('task-priority');
const taskDueDateInput = document.getElementById('task-due-date');
const taskCategorySelect = document.getElementById('task-category');
const taskTagsSelect = document.getElementById('task-tags');

// Initialization
async function init() {
    userEmailSpan.textContent = userEmail || 'User';
    await Promise.all([
        fetchCategories(),
        fetchTags(),
        fetchTasks()
    ]);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--${type})`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Modals ---
function openModal() {
    document.getElementById('task-id').value = '';
    taskModal.classList.add('active');
    document.getElementById('modal-title').textContent = 'Create New Task';
    document.getElementById('subtasks-section').style.display = 'none';
    taskTitleInput.focus();
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('task-id').value = task.id;
    document.getElementById('modal-title').textContent = 'Edit Task';
    
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || '';
    taskPriorityInput.value = task.priority || 'MEDIUM';
    
    if (task.category_id) {
        taskCategorySelect.value = task.category_id;
    } else {
        taskCategorySelect.value = '';
    }
    
    // Set tags
    const tagIds = (task.tags || []).map(t => t.id.toString());
    Array.from(taskTagsSelect.options).forEach(opt => {
        opt.selected = tagIds.includes(opt.value);
    });

    if (task.due_date) {
        const dt = new Date(task.due_date);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        taskDueDateInput.value = dt.toISOString().slice(0, 16);
    } else {
        taskDueDateInput.value = '';
    }

    // Subtasks
    document.getElementById('subtasks-section').style.display = 'block';
    renderSubtasks(task);

    taskModal.classList.add('active');
    taskTitleInput.focus();
}

function closeModal(modalId = 'task-modal') {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.remove('active');
    
    if (modalId === 'task-modal') {
        document.getElementById('task-id').value = '';
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskDueDateInput.value = '';
        taskPriorityInput.value = 'MEDIUM';
        taskCategorySelect.value = '';
        Array.from(taskTagsSelect.options).forEach(opt => opt.selected = false);
    }
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) closeModal(modal.id);
    });
});

// --- Search & Filter ---
function handleSearch(e) {
    currentSearchTerm = e.target.value.toLowerCase();
    renderTasks();
}

function filterTasks(status) {
    currentFilter = status;
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (status === 'ALL') currentViewTitle.textContent = 'All Tasks';
    else if (status === 'PENDING') currentViewTitle.textContent = 'Pending Tasks';
    else if (status === 'IN_PROGRESS') currentViewTitle.textContent = 'In Progress Tasks';
    else if (status === 'COMPLETED') currentViewTitle.textContent = 'Completed Tasks';

    renderTasks();
}

function applyFilters() {
    renderTasks();
}

// --- Categories ---
async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/categories/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        categories = await res.json();
        
        // Populate modal selects
        let optionsHtml = '<option value="">None</option>';
        categories.forEach(c => {
            optionsHtml += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
        taskCategorySelect.innerHTML = optionsHtml;
        
        // Populate filter
        let filterHtml = '<option value="">All Categories</option>';
        categories.forEach(c => {
            filterHtml += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
        document.getElementById('filter-category').innerHTML = filterHtml;
        
        // Populate manage modal
        const list = document.getElementById('categories-list');
        list.innerHTML = categories.map(c => `
            <li>
                <div><span class="item-color-indicator" style="background:${c.color}"></span> ${escapeHtml(c.name)}</div>
                <button class="btn-icon delete" onclick="deleteCategory(${c.id})" title="Delete">✕</button>
            </li>
        `).join('');
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

function openCategoryModal() {
    document.getElementById('category-modal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('active');
}

async function saveCategory(e) {
    e.preventDefault();
    const name = document.getElementById('new-category-name').value;
    const color = document.getElementById('new-category-color').value;
    
    try {
        const res = await fetch(`${API_URL}/categories/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        if (res.ok) {
            document.getElementById('new-category-name').value = '';
            showToast('Category created');
            fetchCategories();
        }
    } catch (err) {
        showToast('Error saving category', 'danger');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    try {
        const res = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Category deleted');
            fetchCategories();
            fetchTasks(); // refresh tasks since category might be removed
        }
    } catch (err) {
        showToast('Error deleting category', 'danger');
    }
}

// --- Tags ---
async function fetchTags() {
    try {
        const res = await fetch(`${API_URL}/tags/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        tags = await res.json();
        
        // Populate modal selects
        let optionsHtml = '';
        tags.forEach(t => {
            optionsHtml += `<option value="${t.id}">${escapeHtml(t.name)}</option>`;
        });
        taskTagsSelect.innerHTML = optionsHtml;
        
        // Populate manage modal
        const list = document.getElementById('tags-list');
        list.innerHTML = tags.map(t => `
            <li>
                <div><span class="item-color-indicator" style="background:${t.color}"></span> ${escapeHtml(t.name)}</div>
                <button class="btn-icon delete" onclick="deleteTag(${t.id})" title="Delete">✕</button>
            </li>
        `).join('');
    } catch (err) {
        console.error('Failed to load tags', err);
    }
}

function openTagModal() {
    document.getElementById('tag-modal').classList.add('active');
}

function closeTagModal() {
    document.getElementById('tag-modal').classList.remove('active');
}

async function saveTag(e) {
    e.preventDefault();
    const name = document.getElementById('new-tag-name').value;
    const color = document.getElementById('new-tag-color').value;
    
    try {
        const res = await fetch(`${API_URL}/tags/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        if (res.ok) {
            document.getElementById('new-tag-name').value = '';
            showToast('Tag created');
            fetchTags();
        }
    } catch (err) {
        showToast('Error saving tag', 'danger');
    }
}

async function deleteTag(id) {
    if (!confirm('Delete this tag?')) return;
    try {
        const res = await fetch(`${API_URL}/tags/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Tag deleted');
            fetchTags();
            fetchTasks(); // refresh tasks
        }
    } catch (err) {
        showToast('Error deleting tag', 'danger');
    }
}


// --- API Calls ---
async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout();
        
        tasks = await res.json();
        
        // Stats update
        const total = tasks.length;
        const pending = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-overdue').textContent = overdue;

        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

async function saveTask(e) {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    
    const payload = {
        title: taskTitleInput.value,
        description: taskDescInput.value || null,
        priority: taskPriorityInput.value,
    };

    if (taskDueDateInput.value) {
        payload.due_date = new Date(taskDueDateInput.value).toISOString();
    } else {
        payload.due_date = null;
    }
    
    if (taskCategorySelect.value) {
        payload.category_id = parseInt(taskCategorySelect.value);
    } else {
        payload.category_id = null;
    }

    const selectedTags = Array.from(taskTagsSelect.selectedOptions).map(opt => parseInt(opt.value));
    if (selectedTags.length > 0) {
        payload.tag_ids = selectedTags;
    } else {
        payload.tag_ids = [];
    }

    try {
        let res;
        if (id) {
            // Update
            const task = tasks.find(t => t.id == id);
            payload.status = task.status; // preserve status
            res = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create
            res = await fetch(`${API_URL}/tasks/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            closeModal('task-modal');
            showToast(id ? 'Task updated!' : 'Task created!');
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
        const payload = {
            title: task.title,
            description: task.description,
            status: newStatus,
            priority: task.priority,
            due_date: task.due_date,
            category_id: task.category_id,
            tag_ids: (task.tags || []).map(t => t.id)
        };
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) fetchTasks();
    } catch (err) {
        showToast('Failed to update task status', 'danger');
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

// --- Subtasks ---
function renderSubtasks(task) {
    const list = document.getElementById('subtasks-list');
    const subtasks = task.subtasks || [];
    
    list.innerHTML = subtasks.map(st => `
        <div class="subtask-item ${st.is_completed ? 'completed' : ''}">
            <input type="checkbox" ${st.is_completed ? 'checked' : ''} onchange="toggleSubtask(${st.id}, ${!st.is_completed})">
            <span>${escapeHtml(st.title)}</span>
            <button type="button" class="btn-icon delete" style="width:24px;height:24px" onclick="deleteSubtask(${st.id})">✕</button>
        </div>
    `).join('');
}

async function addSubtask() {
    const titleInput = document.getElementById('new-subtask-title');
    const title = titleInput.value.trim();
    const taskId = document.getElementById('task-id').value;
    
    if (!title || !taskId) return;
    
    try {
        const res = await fetch(`${API_URL}/subtasks/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, task_id: parseInt(taskId) })
        });
        if (res.ok) {
            titleInput.value = '';
            await fetchTasks();
            renderSubtasks(tasks.find(t => t.id == taskId));
        }
    } catch (err) {
        showToast('Failed to add subtask', 'danger');
    }
}

async function toggleSubtask(subtaskId, isCompleted) {
    const taskId = document.getElementById('task-id').value;
    try {
        const res = await fetch(`${API_URL}/subtasks/${subtaskId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: isCompleted })
        });
        if (res.ok) {
            await fetchTasks();
            renderSubtasks(tasks.find(t => t.id == taskId));
        }
    } catch (err) {
        showToast('Failed to update subtask', 'danger');
    }
}

async function deleteSubtask(subtaskId) {
    const taskId = document.getElementById('task-id').value;
    try {
        const res = await fetch(`${API_URL}/subtasks/${subtaskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await fetchTasks();
            renderSubtasks(tasks.find(t => t.id == taskId));
        }
    } catch (err) {
        showToast('Failed to delete subtask', 'danger');
    }
}

// --- Render Logic ---
function renderTasks() {
    tasksContainer.innerHTML = '';
    
    let filteredTasks = tasks;
    
    // Tab Filter
    if (currentFilter !== 'ALL') {
        filteredTasks = filteredTasks.filter(t => t.status === currentFilter);
    }
    
    // Search
    if (currentSearchTerm) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(currentSearchTerm) || 
            (t.description && t.description.toLowerCase().includes(currentSearchTerm))
        );
    }
    
    // Toolbar Filters
    const priorityFilter = document.getElementById('filter-priority').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
    }
    if (categoryFilter) {
        filteredTasks = filteredTasks.filter(t => t.category_id == categoryFilter);
    }
    
    // Sorting
    const sortVal = document.getElementById('sort-select').value;
    filteredTasks.sort((a, b) => {
        if (sortVal === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortVal === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortVal === 'due_date') {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        }
        if (sortVal === 'alphabetically') return a.title.localeCompare(b.title);
        // Priority
        const pMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (sortVal === 'priority') return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
        return 0;
    });

    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">${currentSearchTerm ? '🔍' : '📭'}</div>
                <h3>${currentSearchTerm ? 'No tasks match your search' : 'No tasks found'}</h3>
                <p>${currentSearchTerm ? 'Try adjusting your keywords.' : 'Click the + button in the corner to create one.'}</p>
            </div>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        
        const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const icon = task.status === 'COMPLETED' ? '↺' : '✓';
        const opacityStyle = task.status === 'COMPLETED' ? 'opacity: 0.5;' : '';
        const lineStyle = task.status === 'COMPLETED' ? 'text-decoration: line-through;' : '';
        
        let dueDateHtml = '';
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const isOverdue = dueDate < new Date() && task.status !== 'COMPLETED';
            dueDateHtml = `<span class="due-date ${isOverdue ? 'overdue' : ''}">📅 ${dueDate.toLocaleDateString()}</span>`;
        }
        
        let categoryHtml = '';
        if (task.category) {
            categoryHtml = `<span class="badge task-category" style="border-color:${task.category.color}; color:${task.category.color}">${escapeHtml(task.category.name)}</span>`;
        }
        
        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = task.tags.map(t => `<span class="badge task-tag" style="border-color:${t.color}; color:${t.color}">#${escapeHtml(t.name)}</span>`).join(' ');
        }

        div.innerHTML = `
            <div class="task-content" style="${opacityStyle}">
                <div class="task-title" style="${lineStyle}">${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
                
                <div class="badges-container">
                    <span class="badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                    <span class="badge priority-${task.priority}">Priority: ${task.priority}</span>
                    ${categoryHtml}
                    ${tagsHtml}
                </div>
                
                <div class="task-meta">
                    ${dueDateHtml}
                    <span>Created: ${new Date(task.created_at).toLocaleDateString()}</span>
                    ${task.subtasks && task.subtasks.length > 0 ? `<span>📋 ${task.subtasks.filter(s=>s.is_completed).length}/${task.subtasks.length} Subtasks</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="updateTaskStatus(${task.id}, '${nextStatus}')" title="${task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Complete'}">${icon}</button>
                <button class="btn-icon" onclick="openEditModal(${task.id})" title="Edit Task">✎</button>
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

init();
