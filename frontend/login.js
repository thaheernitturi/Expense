// Base URL for API requests (Auto-detects localhost vs production)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://expense-lime-ten.vercel.app'; // Replace with your deployed backend URL

// DOM Elements
const loginSection = document.getElementById('login-section');
const forgotSection = document.getElementById('forgot-password-section');
const showForgotBtn = document.getElementById('show-forgot-btn');
const showLoginBtn = document.getElementById('show-login-btn');

// Toggle between Login and Forgot Password UI
showForgotBtn.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    forgotSection.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    forgotSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// ==================== 1. USER LOGIN REQUEST ====================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');

    const originalText = loginBtn.innerText;
    loginBtn.innerText = 'Logging in...';
    loginBtn.disabled = true;

    try {
        const response = await axios.post(`${API_BASE_URL}/user/login`, {
            email: email,
            password: password
        });

        if (response.status === 200) {
            alert(response.data.message || 'Login successful!');
            
            // Store authorization token in LocalStorage
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            // Redirect to expense dashboard
            window.location.href = 'expense.html';
        }
    } catch (error) {
        console.error('Login Error:', error);
        if (error.response && error.response.data && error.response.data.message) {
            alert(error.response.data.message);
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } finally {
        loginBtn.innerText = originalText;
        loginBtn.disabled = false;
    }
});

// ==================== 2. FORGOT PASSWORD REQUEST ====================
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value;
    const submitBtn = document.getElementById('forgot-submit-btn');

    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Sending Email...';
    submitBtn.disabled = true;

    try {
        const response = await axios.post(`${API_BASE_URL}/password/forgotpassword`, {
            email: email
        });

        if (response.status === 200) {
            alert(response.data.message || 'Password reset link sent to your email.');
            document.getElementById('forgot-password-form').reset();
            
            // Switch back to login view
            forgotSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Forgot Password Error:', error);
        if (error.response && error.response.data && error.response.data.message) {
            alert(error.response.data.message);
        } else {
            alert('Failed to send reset email. Please try again.');
        }
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});