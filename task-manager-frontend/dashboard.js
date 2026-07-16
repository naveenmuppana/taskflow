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
let categories = [];
let tags = [];
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
const taskTagsInput = document.getElementById('task-tags');

// Filter/Sort DOM Elements
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
const filterCategory = document.getElementById('filter-category');
const sortSelect = document.getElementById('sort-select');

// Initialization
async function init() {
    userEmailSpan.textContent = userEmail || 'User';
    await fetchCategories();
    await fetchTags();
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
            taskCategoryInput.value = task.category ? task.category.id : '';
            
            // Set tags
            const taskTagIds = task.tags ? task.tags.map(t => t.id) : [];
            Array.from(taskTagsInput.options).forEach(opt => {
                opt.selected = taskTagIds.includes(parseInt(opt.value));
            });
            
            // Subtasks section
            document.getElementById('subtasks-section').style.display = 'block';
            renderSubtasksList(task.subtasks || [], task.id);
        }
    } else {
        modalTitle.textContent = 'Create New Task';
        taskIdInput.value = '';
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskPriorityInput.value = 'MEDIUM';
        taskDueDateInput.value = '';
        taskCategoryInput.value = '';
        Array.from(taskTagsInput.options).forEach(opt => opt.selected = false);
        document.getElementById('subtasks-section').style.display = 'none';
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

const categoryModal = document.getElementById('category-modal');
function openCategoryModal() {
    categoryModal.classList.add('active');
}

function closeCategoryModal() {
    categoryModal.classList.remove('active');
}

categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        closeCategoryModal();
    }
});

const tagModal = document.getElementById('tag-modal');
function openTagModal() {
    tagModal.classList.add('active');
}
function closeTagModal() {
    tagModal.classList.remove('active');
}
tagModal.addEventListener('click', (e) => {
    if (e.target === tagModal) {
        closeTagModal();
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

// --- Tasks API Operations ---
async function fetchTasks(updateModal = false) {
    try {
        // Always refresh stats when tasks change
        fetchStats();

        const queryParams = new URLSearchParams();
        
        const searchVal = searchInput.value.trim();
        if (searchVal) queryParams.append('search', searchVal);
        
        if (currentFilter !== 'ALL') queryParams.append('status', currentFilter);
        
        const priorityVal = filterPriority.value;
        if (priorityVal) queryParams.append('priority', priorityVal);
        
        const categoryVal = filterCategory.value;
        if (categoryVal) queryParams.append('category_id', categoryVal);
        
        const sortVal = sortSelect.value;
        if (sortVal) queryParams.append('sort_by', sortVal);

        const res = await fetch(`${API_URL}/tasks/?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) return logout(); // Token expired
        
        tasks = await res.json();
        renderTasks();

        if (updateModal) {
            const currentTaskId = document.getElementById('task-id').value;
            if (currentTaskId) {
                const currentTask = tasks.find(t => t.id === parseInt(currentTaskId));
                if (currentTask) {
                    renderSubtasksList(currentTask.subtasks || [], currentTask.id);
                }
            }
        }
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

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

async function saveTask(e) {
    e.preventDefault();
    const id = taskIdInput.value;
    
    const selectedTags = Array.from(taskTagsInput.selectedOptions).map(opt => parseInt(opt.value));
    
    const payload = {
        title: taskTitleInput.value,
        description: taskDescInput.value || null,
        priority: taskPriorityInput.value,
        due_date: taskDueDateInput.value ? new Date(taskDueDateInput.value).toISOString() : null,
        category_id: taskCategoryInput.value ? parseInt(taskCategoryInput.value) : null,
        tag_ids: selectedTags
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
                category_id: task.category ? task.category.id : null,
                tag_ids: task.tags ? task.tags.map(t => t.id) : []
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
                    ${task.category ? `<span class="category-badge" style="background-color: ${task.category.color}20; color: ${task.category.color}; border: 1px solid ${task.category.color}; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${escapeHtml(task.category.name)}</span>` : ''}
                    ${task.tags && task.tags.length > 0 ? task.tags.map(t => `<span class="tag-badge" style="background-color: ${t.color}20; color: ${t.color}; border: 1px solid ${t.color}; padding: 0.1rem 0.4rem; border-radius: 12px; font-size: 0.7rem;">#${escapeHtml(t.name)}</span>`).join(' ') : ''}
                    <span class="${overdueClass ? 'overdue-text' : ''}">Due: ${dueDateDisplay}</span>
                </div>
                ${task.subtasks && task.subtasks.length > 0 ? `
                <div class="task-subtasks" style="margin-top: 10px; font-size: 0.85rem;">
                    <strong>Subtasks:</strong>
                    <ul style="list-style: none; padding-left: 0; margin: 4px 0 0 0;">
                        ${task.subtasks.map(st => `
                            <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; ${st.is_completed ? 'opacity: 0.6;' : ''}">
                                <input type="checkbox" ${st.is_completed ? 'checked' : ''} onclick="toggleSubtaskStatus(${st.id}, ${task.id}, ${!st.is_completed})">
                                <span style="${st.is_completed ? 'text-decoration: line-through;' : ''}">${escapeHtml(st.title)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>` : ''}
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

// --- Category API Operations ---
async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/categories/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            categories = await res.json();
            renderCategories();
        }
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

async function saveCategory(e) {
    e.preventDefault();
    const name = document.getElementById('new-category-name').value;
    const color = document.getElementById('new-category-color').value;

    try {
        const res = await fetch(`${API_URL}/categories/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color })
        });

        if (res.ok) {
            document.getElementById('new-category-name').value = '';
            fetchCategories();
            showToast('Category created!');
        } else {
            const data = await res.json();
            showToast(data.detail, 'danger');
        }
    } catch (err) {
        showToast('Failed to create category', 'danger');
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? All tasks in this category will lose it.')) return;
    try {
        const res = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchCategories();
            fetchTasks(); // refresh tasks since category was deleted
            showToast('Category deleted');
        }
    } catch (err) {
        showToast('Failed to delete category', 'danger');
    }
}

function renderCategories() {
    // Render list in modal
    const list = document.getElementById('categories-list');
    list.innerHTML = '';
    
    // Render in Task Select
    const taskSelect = document.getElementById('task-category');
    taskSelect.innerHTML = '<option value="">None</option>';
    
    // Render in Filter Select
    const filterSelect = document.getElementById('filter-category');
    filterSelect.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(cat => {
        // Modal List
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        li.style.padding = '8px';
        li.style.borderBottom = '1px solid var(--border-color)';
        li.innerHTML = `
            <div style="display: flex; alignItems: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${cat.color}"></div>
                <span>${escapeHtml(cat.name)}</span>
            </div>
            <button class="btn-icon delete" onclick="deleteCategory(${cat.id})">✕</button>
        `;
        list.appendChild(li);

        // Task Select
        taskSelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
        
        // Filter Select
        filterSelect.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
    });
}

// --- Tag API Operations ---
async function fetchTags() {
    try {
        const res = await fetch(`${API_URL}/tags/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            tags = await res.json();
            renderTags();
        }
    } catch (err) {
        console.error('Failed to load tags', err);
    }
}

async function saveTag(e) {
    e.preventDefault();
    const name = document.getElementById('new-tag-name').value;
    const color = document.getElementById('new-tag-color').value;

    try {
        const res = await fetch(`${API_URL}/tags/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color })
        });

        if (res.ok) {
            document.getElementById('new-tag-name').value = '';
            fetchTags();
            showToast('Tag created!');
        } else {
            const data = await res.json();
            showToast(data.detail, 'danger');
        }
    } catch (err) {
        showToast('Failed to create tag', 'danger');
    }
}

async function deleteTag(id) {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all tasks.')) return;
    try {
        const res = await fetch(`${API_URL}/tags/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchTags();
            fetchTasks(); 
            showToast('Tag deleted');
        }
    } catch (err) {
        showToast('Failed to delete tag', 'danger');
    }
}

function renderTags() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '';
    
    const taskTags = document.getElementById('task-tags');
    taskTags.innerHTML = '';

    tags.forEach(t => {
        // Modal List
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        li.style.padding = '8px';
        li.style.borderBottom = '1px solid var(--border-color)';
        li.innerHTML = `
            <div style="display: flex; alignItems: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border-radius: 4px; background-color: ${t.color}"></div>
                <span>#${escapeHtml(t.name)}</span>
            </div>
            <button class="btn-icon delete" onclick="deleteTag(${t.id})">✕</button>
        `;
        list.appendChild(li);

        // Task Select
        taskTags.innerHTML += `<option value="${t.id}">${escapeHtml(t.name)}</option>`;
    });
}

// --- Subtask API Operations ---
function renderSubtasksList(subtasks, taskId) {
    const list = document.getElementById('subtasks-list');
    list.innerHTML = '';
    subtasks.forEach(st => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '4px 0';
        div.style.borderBottom = '1px solid var(--border-color)';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" ${st.is_completed ? 'checked' : ''} onchange="toggleSubtaskStatus(${st.id}, ${taskId}, this.checked)">
                <span style="${st.is_completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(st.title)}</span>
            </div>
            <button type="button" class="btn-icon delete" onclick="deleteSubtask(${st.id}, ${taskId})" style="width: 20px; height: 20px; font-size: 10px;">✕</button>
        `;
        list.appendChild(div);
    });
}

async function addSubtask() {
    const taskId = document.getElementById('task-id').value;
    const titleInput = document.getElementById('new-subtask-title');
    const title = titleInput.value.trim();
    if (!taskId || !title) return;

    try {
        const res = await fetch(`${API_URL}/subtasks/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task_id: parseInt(taskId), title: title, is_completed: false })
        });
        if (res.ok) {
            titleInput.value = '';
            fetchTasks(true); // Refetch tasks to update state, true flag to re-render modal
        } else {
            showToast('Failed to add subtask', 'danger');
        }
    } catch (err) {
        showToast('Error adding subtask', 'danger');
    }
}

async function toggleSubtaskStatus(subtaskId, taskId, isCompleted) {
    try {
        const res = await fetch(`${API_URL}/subtasks/${subtaskId}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_completed: isCompleted })
        });
        if (res.ok) {
            fetchTasks(true); 
        }
    } catch (err) {
        showToast('Error updating subtask', 'danger');
    }
}

async function deleteSubtask(subtaskId, taskId) {
    if (!confirm('Delete subtask?')) return;
    try {
        const res = await fetch(`${API_URL}/subtasks/${subtaskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchTasks(true);
        }
    } catch (err) {
        showToast('Error deleting subtask', 'danger');
    }
}

// Start app
init();
