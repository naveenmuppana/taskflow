const API_URL = 'http://localhost:8000/api/v1';

// State
let currentAuthTab = 'login';
const token = localStorage.getItem('token');

// Redirect if already logged in
if (token) {
    window.location.href = 'dashboard.html';
}

// DOM Elements
const authSubmitBtn = document.getElementById('auth-submit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');

// Tabs
function switchAuthTab(tab) {
    currentAuthTab = tab;
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    authSubmitBtn.textContent = tab === 'login' ? 'Login' : 'Register';
    authError.textContent = '';
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--${type}-color)`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Auth Submission
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

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('userEmail', email); // Save email for the dashboard navbar
    
    // Redirect to the dashboard
    window.location.href = 'dashboard.html';
}

async function register(email, password) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
        if (Array.isArray(data.detail)) {
            throw new Error(data.detail[0].msg);
        }
        throw new Error(data.detail || 'Registration failed');
    }
}

function togglePassword() {
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.innerHTML = '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>';
    } else {
        pwdInput.type = 'password';
        eyeIcon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
    }
}