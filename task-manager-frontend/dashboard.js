// Theme Initialization & Logic
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    }
}

let activeApiRequests = 0;
function showGlobalLoader() {
    activeApiRequests++;
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('opacity-0', 'pointer-events-none');
}

function hideGlobalLoader() {
    activeApiRequests--;
    if (activeApiRequests <= 0) {
        activeApiRequests = 0;
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.add('opacity-0', 'pointer-events-none');
    }
}

const API_URL = 'https://taskflow-cr3c.onrender.com/api/v1';

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
const taskRemindAtInput = document.getElementById('task-remind-at');
const taskCategorySelect = document.getElementById('task-category');
const taskTagsSelect = document.getElementById('task-tags');
const taskIsRecurringInput = document.getElementById('task-is-recurring');
const taskRecurrenceRuleSelect = document.getElementById('task-recurrence-rule');
const recurrenceRuleGroup = document.getElementById('recurrence-rule-group');

if (taskIsRecurringInput) {
    taskIsRecurringInput.addEventListener('change', (e) => {
        if (e.target.checked) {
            recurrenceRuleGroup.style.display = 'block';
        } else {
            recurrenceRuleGroup.style.display = 'none';
        }
    });
}

// Initialization
async function init() {
    userEmailSpan.textContent = userEmail || 'User';
    setupColorSwatches();
    await Promise.all([
        fetchCategories(),
        fetchTags(),
        fetchTasks()
    ]);
}

// Setup color swatch selectors
function setupColorSwatches() {
    document.querySelectorAll('.color-swatches').forEach(container => {
        const inputId = container.id === 'category-color-swatches' ? 'new-category-color' : 'new-tag-color';
        const hiddenInput = document.getElementById(inputId);
        const swatches = container.querySelectorAll('.swatch');
        
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                if (hiddenInput) {
                    hiddenInput.value = swatch.getAttribute('data-color');
                }
            });
        });
    });
}

// --- Navigation & Logout ---
async function logout() {
    // Call the backend to revoke the token before clearing local state
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
        } catch (e) {
            // Continue with local logout even if server call fails
        }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('refreshToken');
    window.location.href = 'index.html';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--${type})`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Loading State Helper
function setLoading(btn, isLoading, originalText = '') {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = `<span class="spinner w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5 inline-block align-middle"></span> <span class="align-middle">Processing...</span>`;
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        if (originalText !== null) btn.textContent = originalText;
    }
}

// Format local date for datetime-local input safely
function formatLocalDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Modals ---
function openModal() {
    document.getElementById('task-id').value = '';
    taskModal.classList.add('active');
    document.getElementById('modal-title').textContent = 'Create New Task';
    document.getElementById('subtasks-section').style.display = 'none';
    document.getElementById('task-status').value = 'PENDING';
    
    taskIsRecurringInput.checked = false;
    recurrenceRuleGroup.style.display = 'none';
    taskRecurrenceRuleSelect.value = 'daily';
    
    taskTitleInput.focus();
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('task-id').value = task.id;
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('task-status').value = task.status || 'PENDING';
    
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
        taskDueDateInput.value = formatLocalDateForInput(task.due_date);
    } else {
        taskDueDateInput.value = '';
    }

    if (task.remind_at) {
        taskRemindAtInput.value = formatLocalDateForInput(task.remind_at);
    } else {
        taskRemindAtInput.value = '';
    }
    
    if (task.is_recurring) {
        taskIsRecurringInput.checked = true;
        recurrenceRuleGroup.style.display = 'block';
        taskRecurrenceRuleSelect.value = task.recurrence_rule || 'daily';
    } else {
        taskIsRecurringInput.checked = false;
        recurrenceRuleGroup.style.display = 'none';
        taskRecurrenceRuleSelect.value = 'daily';
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
        taskRemindAtInput.value = '';
        taskPriorityInput.value = 'MEDIUM';
        taskCategorySelect.value = '';
        Array.from(taskTagsSelect.options).forEach(opt => opt.selected = false);
        
        taskIsRecurringInput.checked = false;
        recurrenceRuleGroup.style.display = 'none';
        taskRecurrenceRuleSelect.value = 'daily';
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

function switchView(viewType) {
    const tasksContainer = document.getElementById('tasks-container');
    const calendarContainer = document.getElementById('calendar-container');
    const kanbanContainer = document.getElementById('kanban-container');

    tasksContainer.style.display = 'none';
    calendarContainer.style.display = 'none';
    if (kanbanContainer) kanbanContainer.style.display = 'none';

    if (viewType === 'CALENDAR') {
        calendarContainer.style.display = 'block';
    } else if (viewType === 'KANBAN') {
        if (kanbanContainer) kanbanContainer.style.display = 'flex';
    } else {
        tasksContainer.style.display = 'flex';
        tasksContainer.style.flexDirection = 'column';
    }
}

function filterTasks(status) {
    currentFilter = status;
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`button[data-filter="${status}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    if (status === 'ALL') currentViewTitle.textContent = 'All Tasks';
    else if (status === 'PENDING') currentViewTitle.textContent = 'Pending Tasks';
    else if (status === 'IN_PROGRESS') currentViewTitle.textContent = 'In Progress Tasks';
    else if (status === 'COMPLETED') currentViewTitle.textContent = 'Completed Tasks';
    else if (status === 'CANCELLED') currentViewTitle.textContent = 'Cancelled Tasks';

    switchView('LIST');
    renderTasks();
}

function toggleKanbanView() {
    currentFilter = 'KANBAN';
    currentViewTitle.textContent = 'Kanban Board';
    
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    const kBtn = document.querySelector('button[data-filter="KANBAN"]');
    if (kBtn) kBtn.classList.add('active');
    
    switchView('KANBAN');
    renderKanban();
}

function applyFilters() {
    if (currentFilter === 'KANBAN') {
        renderKanban();
    } else {
        renderTasks();
    }
}

// --- Categories ---
async function fetchCategories() {
    try {
        const res = await apiFetch(`${API_URL}/categories/`);
        if (!res) return;
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
            <li class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div class="flex items-center gap-3"><span class="item-color-indicator w-3 h-3 rounded-full" style="background:${c.color}"></span> <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(c.name)}</span></div>
                <button class="btn-icon delete w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors opacity-0 group-hover:opacity-100" onclick="deleteCategory(${c.id})" title="Delete">✕</button>
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
    const btn = e.target.querySelector('button[type="submit"]');
    const name = document.getElementById('new-category-name').value;
    const color = document.getElementById('new-category-color').value;
    
    setLoading(btn, true, 'Add');
    try {
        const res = await apiFetch(`${API_URL}/categories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        if (res && res.ok) {
            const newCat = await res.json();
            document.getElementById('new-category-name').value = '';
            showToast('Category created');
            
            // Preserve form selection
            const currentSelected = taskCategorySelect.value;
            await fetchCategories();
            taskCategorySelect.value = newCat.id || currentSelected;
            
            closeCategoryModal();
        }
    } catch (err) {
        showToast('Error saving category', 'danger');
    } finally {
        setLoading(btn, false, 'Add');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    try {
        const res = await apiFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('Category deleted');
            fetchCategories();
            fetchTasks();
        }
    } catch (err) {
        showToast('Error deleting category', 'danger');
    }
}

// --- Tags ---
async function fetchTags() {
    try {
        const res = await apiFetch(`${API_URL}/tags/`);
        if (!res) return;
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
            <li class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                <div class="flex items-center gap-3"><span class="item-color-indicator w-3 h-3 rounded-full" style="background:${t.color}"></span> <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(t.name)}</span></div>
                <button class="btn-icon delete w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors opacity-0 group-hover:opacity-100" onclick="deleteTag(${t.id})" title="Delete">✕</button>
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
    const btn = e.target.querySelector('button[type="submit"]');
    const name = document.getElementById('new-tag-name').value;
    const color = document.getElementById('new-tag-color').value;
    
    setLoading(btn, true, 'Add');
    try {
        const res = await apiFetch(`${API_URL}/tags/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        if (res && res.ok) {
            const newTag = await res.json();
            document.getElementById('new-tag-name').value = '';
            showToast('Tag created');
            
            // Preserve form selection
            const currentSelected = Array.from(taskTagsSelect.selectedOptions).map(o => o.value);
            await fetchTags();
            
            Array.from(taskTagsSelect.options).forEach(opt => {
                if (currentSelected.includes(opt.value) || opt.value == newTag.id) {
                    opt.selected = true;
                }
            });
            
            closeTagModal();
        }
    } catch (err) {
        showToast('Error saving tag', 'danger');
    } finally {
        setLoading(btn, false, 'Add');
    }
}

async function deleteTag(id) {
    if (!confirm('Delete this tag?')) return;
    try {
        const res = await apiFetch(`${API_URL}/tags/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('Tag deleted');
            fetchTags();
            fetchTasks();
        }
    } catch (err) {
        showToast('Error deleting tag', 'danger');
    }
}


// --- Token Refresh Helper ---
let isRefreshing = false;

async function refreshAccessToken() {
    if (isRefreshing) return false;
    isRefreshing = true;
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
        // Update the module-level token constant by reloading the page state
        window.location.reload();
        return true;
    } catch (e) {
        return false;
    } finally {
        isRefreshing = false;
    }
}

async function apiFetch(url, options = {}) {
    showGlobalLoader();
    try {
        const currentToken = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${currentToken}`, ...options.headers };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                await logout();
                return null;
            }
        }
        return res;
    } finally {
        hideGlobalLoader();
    }
}

// --- API Calls ---
async function fetchTasks() {
    try {
        const [tasksRes, statsRes] = await Promise.all([
            apiFetch(`${API_URL}/tasks/`),
            apiFetch(`${API_URL}/tasks/stats`)
        ]);

        if (!tasksRes || !statsRes) return;

        tasks = await tasksRes.json();

        // Use server-computed stats (accurate even with pagination or timezone)
        const stats = await statsRes.json();
        document.getElementById('stat-total').textContent = stats.total_tasks;
        document.getElementById('stat-pending').textContent = stats.pending_tasks;
        document.getElementById('stat-completed').textContent = stats.completed_tasks;
        document.getElementById('stat-overdue').textContent = stats.overdue_tasks;

        renderTasks();
    } catch (err) {
        showToast('Failed to load tasks', 'danger');
    }
}

async function saveTask(e) {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = 'Save Task';
    
    const payload = {
        title: taskTitleInput.value,
        description: taskDescInput.value || null,
        priority: taskPriorityInput.value,
        status: document.getElementById('task-status').value
    };

    if (taskDueDateInput.value) {
        payload.due_date = new Date(taskDueDateInput.value).toISOString();
    } else {
        payload.due_date = null;
    }

    if (taskRemindAtInput.value) {
        payload.remind_at = new Date(taskRemindAtInput.value).toISOString();
    } else {
        payload.remind_at = null;
    }
    
    if (taskCategorySelect.value) {
        payload.category_id = parseInt(taskCategorySelect.value);
    } else {
        payload.category_id = null;
    }
    
    payload.is_recurring = taskIsRecurringInput.checked;
    if (payload.is_recurring) {
        payload.recurrence_rule = taskRecurrenceRuleSelect.value;
    } else {
        payload.recurrence_rule = null;
    }

    const selectedTags = Array.from(taskTagsSelect.selectedOptions).map(opt => parseInt(opt.value));
    if (selectedTags.length > 0) {
        payload.tag_ids = selectedTags;
    } else {
        payload.tag_ids = [];
    }

    setLoading(btn, true, originalText);
    try {
        let res;
        if (id) {
            // Update
            res = await apiFetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create
            res = await apiFetch(`${API_URL}/tasks/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res && res.ok) {
            closeModal('task-modal');
            showToast(id ? 'Task updated!' : 'Task created!');
            fetchTasks();
        } else if (res) {
            const data = await res.json();
            showToast(Array.isArray(data.detail) ? data.detail[0].msg : data.detail, 'danger');
        }
    } catch (err) {
        showToast('Network error', 'danger');
    } finally {
        setLoading(btn, false, originalText);
    }
}


async function updateTaskStatus(id, newStatus) {
    try {
        // Send only the status field — TaskUpdate now has all fields optional
        const res = await apiFetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res && res.ok) fetchTasks();
    } catch (err) {
        showToast('Failed to update task status', 'danger');
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
        const res = await apiFetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
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
        <div class="subtask-item flex items-center justify-between p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors group ${st.is_completed ? 'opacity-60 line-through' : ''}">
            <div class="flex items-center gap-3">
                <input type="checkbox" class="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer" ${st.is_completed ? 'checked' : ''} onchange="toggleSubtask(${st.id}, ${!st.is_completed})">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(st.title)}</span>
            </div>
            <button type="button" class="btn-icon delete w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors opacity-0 group-hover:opacity-100" onclick="deleteSubtask(${st.id})">✕</button>
        </div>
    `).join('');
}

async function addSubtask() {
    const titleInput = document.getElementById('new-subtask-title');
    const title = titleInput.value.trim();
    const taskId = document.getElementById('task-id').value;
    
    if (!title || !taskId) return;
    
    try {
        const res = await apiFetch(`${API_URL}/subtasks/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, task_id: parseInt(taskId) })
        });
        if (res && res.ok) {
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
        const res = await apiFetch(`${API_URL}/subtasks/${subtaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: isCompleted })
        });
        if (res && res.ok) {
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
        const res = await apiFetch(`${API_URL}/subtasks/${subtaskId}`, { method: 'DELETE' });
        if (res && res.ok) {
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
            <div class="empty-state flex flex-col items-center justify-center py-20 text-center">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">${currentSearchTerm ? '🔍' : '📭'}</div>
                <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">${currentSearchTerm ? 'No tasks match your search' : 'No tasks found'}</h3>
                <p class="text-slate-500 dark:text-slate-400">${currentSearchTerm ? 'Try adjusting your keywords.' : 'Click the + button in the corner to create one.'}</p>
            </div>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item flex justify-between p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group';
        
        const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const icon = task.status === 'COMPLETED' ? '↺' : '✓';
        const opacityStyle = task.status === 'COMPLETED' ? 'opacity: 0.5;' : '';
        const lineStyle = task.status === 'COMPLETED' ? 'text-decoration: line-through;' : '';
        
        let dueDateHtml = '';
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const now = new Date();
            const diffTime = dueDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const isOverdue = dueDate < now && task.status !== 'COMPLETED';
            const isSoon = diffDays > 0 && diffDays <= 2 && task.status !== 'COMPLETED';
            
            let dateClass = '';
            let dateText = dueDate.toLocaleDateString();
            
            if (isOverdue) {
                dateClass = 'text-rose-500 font-bold';
                dateText = `Overdue by ${Math.abs(diffDays)} days`;
            } else if (isSoon) {
                dateClass = 'text-amber-500 font-bold';
                dateText = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
            }
            
            dueDateHtml = `<span class="due-date ${dateClass}">📅 ${dateText}</span>`;
        }
        
        let categoryHtml = '';
        if (task.category) {
            categoryHtml = `<span class="badge task-category px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-900 border" style="border-color:${task.category.color}; color:${task.category.color}">${escapeHtml(task.category.name)}</span>`;
        }
        
        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = task.tags.map(t => `<span class="badge task-tag px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white dark:bg-slate-900 border" style="border-color:${t.color}; color:${t.color}">#${escapeHtml(t.name)}</span>`).join(' ');
        }
        
        let recurringHtml = '';
        if (task.is_recurring) {
            recurringHtml = `<span title="Recurring Task (${task.recurrence_rule})" style="margin-right: 5px; cursor: help;">🔁</span>`;
        }

        div.innerHTML = `
            <div class="task-content flex-1 pr-4" style="${opacityStyle}">
                <div class="task-title text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1" style="${lineStyle}">${recurringHtml}${escapeHtml(task.title)}</div>
                ${task.description ? `<div class="task-desc text-sm text-slate-500 dark:text-slate-400 mb-3">${escapeHtml(task.description)}</div>` : ''}
                
                <div class="badges-container flex flex-wrap gap-2 mb-3">
                    <span class="badge status-${task.status} px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${task.status.replace('_', ' ')}</span>
                    <span class="badge priority-${task.priority} px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Priority: ${task.priority}</span>
                    ${categoryHtml}
                    ${tagsHtml}
                </div>
                
                <div class="task-meta flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                    ${dueDateHtml}
                    <span>Created: ${new Date(task.created_at).toLocaleDateString()}</span>
                    ${task.subtasks && task.subtasks.length > 0 ? `<span>📋 ${task.subtasks.filter(s=>s.is_completed).length}/${task.subtasks.length} Subtasks</span>` : ''}
                </div>
            </div>
            <div class="task-actions flex items-start gap-1 ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                <button type="button" class="btn-icon w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary dark:hover:text-primary-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onclick="event.stopPropagation(); openFocusMode(${task.id})" title="Focus Mode">🎯</button>
                <button type="button" class="btn-icon w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" onclick="event.stopPropagation(); updateTaskStatus(${task.id}, '${nextStatus}')" title="${task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Complete'}">${icon}</button>
                <button type="button" class="btn-icon w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" onclick="event.stopPropagation(); openEditModal(${task.id})" title="Edit Task">✎</button>
                <button type="button" class="btn-icon delete w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" onclick="event.stopPropagation(); deleteTask(${task.id})" title="Delete Task">✕</button>
            </div>
        `;
        tasksContainer.appendChild(div);
    });
}

// --- Kanban View ---
let kanbanSortables = [];

function renderKanban() {
    const kanbanContainer = document.getElementById('kanban-container');
    if (!kanbanContainer) return;

    // Filter tasks based on current search and other filters, except status
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const priorityFilter = document.getElementById('filter-priority').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    let filteredTasks = tasks.filter(t => {
        if (searchTerm && !t.title.toLowerCase().includes(searchTerm) && !(t.description && t.description.toLowerCase().includes(searchTerm))) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        if (categoryFilter && t.category_id != categoryFilter) return false;
        return true;
    });

    const columns = {
        'PENDING': document.querySelector('.kanban-column[data-status="PENDING"] .kanban-tasks'),
        'IN_PROGRESS': document.querySelector('.kanban-column[data-status="IN_PROGRESS"] .kanban-tasks'),
        'COMPLETED': document.querySelector('.kanban-column[data-status="COMPLETED"] .kanban-tasks'),
        'CANCELLED': document.querySelector('.kanban-column[data-status="CANCELLED"] .kanban-tasks')
    };

    // Clear columns
    Object.values(columns).forEach(col => {
        if (col) col.innerHTML = '';
    });

    filteredTasks.forEach(task => {
        const col = columns[task.status];
        if (!col) return;

        const div = document.createElement('div');
        div.className = 'kanban-card p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer cursor-grab active:cursor-grabbing';
        div.dataset.id = task.id;
        
        let recurringHtml = task.is_recurring ? `<span title="Recurring Task (${task.recurrence_rule})">🔁</span> ` : '';
        let tagsHtml = task.tags ? task.tags.map(t => `<span class="badge px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-white dark:bg-slate-900 border" style="border-color:${t.color}; color:${t.color}">#${escapeHtml(t.name)}</span>`).join(' ') : '';
        
        div.innerHTML = `
            <div class="kanban-card-title font-semibold text-slate-800 dark:text-slate-100 mb-2">${recurringHtml}${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="kanban-card-desc text-xs text-slate-500 dark:text-slate-400 mb-3">${escapeHtml(task.description).substring(0, 60)}${task.description.length > 60 ? '...' : ''}</div>` : ''}
            <div class="kanban-card-meta flex flex-wrap gap-1.5 mb-2">
                <span class="badge priority-${task.priority} px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${task.priority}</span>
                ${tagsHtml}
            </div>
            <div class="task-actions flex justify-end gap-1 border-t border-slate-100 dark:border-slate-700/50 pt-2" style="margin-top: 10px;">
                <button type="button" class="btn-icon w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" onclick="event.stopPropagation(); openEditModal(${task.id})" title="Edit Task">✎</button>
                <button type="button" class="btn-icon delete w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" onclick="event.stopPropagation(); deleteTask(${task.id})" title="Delete Task">✕</button>
            </div>
        `;
        
        // Add click listener to open edit modal directly
        div.addEventListener('click', (e) => {
            // Prevent if a button was clicked inside
            if (!e.target.closest('button')) {
                openEditModal(task.id);
            }
        });

        col.appendChild(div);
    });

    // Initialize Sortable if not already initialized
    kanbanSortables.forEach(s => s.destroy());
    kanbanSortables = [];
    
    if (typeof Sortable !== 'undefined') {
        Object.entries(columns).forEach(([status, col]) => {
            if (col) {
                const sortable = new Sortable(col, {
                    group: 'kanban',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: function (evt) {
                        const itemEl = evt.item;
                        const taskId = itemEl.dataset.id;
                        const newStatus = evt.to.closest('.kanban-column').dataset.status;
                        
                        if (evt.from !== evt.to) {
                            updateTaskStatus(taskId, newStatus);
                        }
                    }
                });
                kanbanSortables.push(sortable);
            }
        });
    }
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

// --- Focus Mode ---
let focusInterval = null;
let focusTimeLeft = 25 * 60; // 25 mins

function openFocusMode(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('focus-task-title').textContent = task.title;
    document.getElementById('focus-modal').classList.add('active');
    resetFocusTimer();
    
    // Automatically transition to IN_PROGRESS if currently PENDING
    if (task.status === 'PENDING') {
        updateTaskStatus(taskId, 'IN_PROGRESS');
    }
}

function closeFocusMode() {
    document.getElementById('focus-modal').classList.remove('active');
    clearInterval(focusInterval);
    focusInterval = null;
}

function toggleFocusTimer() {
    const btn = document.getElementById('focus-play-btn');
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
        btn.textContent = '▶';
    } else {
        btn.textContent = '⏸';
        focusInterval = setInterval(() => {
            focusTimeLeft--;
            updateFocusDisplay();
            if (focusTimeLeft <= 0) {
                clearInterval(focusInterval);
                focusInterval = null;
                btn.textContent = '▶';
                showToast('Focus session complete!', 'success');
            }
        }, 1000);
    }
}

function resetFocusTimer() {
    clearInterval(focusInterval);
    focusInterval = null;
    focusTimeLeft = 25 * 60;
    document.getElementById('focus-play-btn').textContent = '▶';
    updateFocusDisplay();
}

function updateFocusDisplay() {
    const m = Math.floor(focusTimeLeft / 60).toString().padStart(2, '0');
    const s = (focusTimeLeft % 60).toString().padStart(2, '0');
    document.getElementById('focus-timer').textContent = `${m}:${s}`;
}

// --- Calendar View ---
let calendar = null;

async function toggleCalendarView() {
    currentFilter = 'CALENDAR';
    currentViewTitle.textContent = 'Calendar View';
    
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    const calBtn = document.querySelector('button[data-filter="CALENDAR"]');
    if (calBtn) calBtn.classList.add('active');
    
    switchView('CALENDAR');
    
    if (!calendar) {
        const calendarEl = document.getElementById('calendar-container');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 'auto',
            events: function(info, successCallback, failureCallback) {
                let events = [];
                // Add Tasks
                tasks.forEach(task => {
                    if (task.due_date) {
                        events.push({
                            title: task.title,
                            start: task.due_date,
                            color: task.status === 'COMPLETED' ? 'var(--success)' : 'var(--primary)',
                            allDay: true
                        });
                    }
                });
                
                // Indian National Holidays 2026
                const indianHolidays2026 = [
                    { date: '2026-01-26', name: 'Republic Day' },
                    { date: '2026-03-03', name: 'Holi' },
                    { date: '2026-04-03', name: 'Good Friday' },
                    { date: '2026-08-15', name: 'Independence Day' },
                    { date: '2026-10-02', name: 'Gandhi Jayanti' },
                    { date: '2026-10-19', name: 'Dussehra' },
                    { date: '2026-11-08', name: 'Diwali' },
                    { date: '2026-12-25', name: 'Christmas Day' }
                ];
                
                indianHolidays2026.forEach(h => {
                    events.push({
                        title: `🎉 ${h.name}`,
                        start: h.date,
                        color: 'var(--danger)',
                        allDay: true,
                        display: 'background'
                    });
                });

                successCallback(events);
            }
        });
        calendar.render();
        // Force a resize fix for FullCalendar initially hiding in flex containers
        setTimeout(() => calendar.updateSize(), 100);
    } else {
        calendar.refetchEvents();
    }
}


// --- Reminders ---
let notifiedTaskIds = new Set();

function checkReminders() {
    if (Notification.permission !== 'granted') return;
    
    const now = new Date();
    tasks.forEach(task => {
        if (task.status !== 'COMPLETED' && task.remind_at) {
            const remindTime = new Date(task.remind_at);
            if (remindTime <= now && !notifiedTaskIds.has(task.id)) {
                new Notification("Task Reminder", {
                    body: `It's time to work on: ${task.title}`,
                    icon: "https://cdn-icons-png.flaticon.com/512/1828/1828640.png"
                });
                notifiedTaskIds.add(task.id);
            }
        }
    });
}

// Request permission and start polling
if ("Notification" in window) {
    Notification.requestPermission();
    setInterval(checkReminders, 60000); // Check every minute
}

init();
