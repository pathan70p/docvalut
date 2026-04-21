class AuthHandler {
    constructor() {
        this.API_URL = '/api';
        this.init();
    }

    init() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        this.initInputValidation();
    }

    initInputValidation() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateInput(e.target));
            input.addEventListener('input', (e) => this.clearError(e.target));
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        let errorMsg = '';

        // EMAIL
        if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value || !emailRegex.test(value)) {
                errorMsg = 'Enter valid email';
            }
        }

        // PASSWORD (fix 🔥)
        if (input.id.toLowerCase().includes('password')) {
            if (!value || value.length < 8) {
                errorMsg = 'Password must be at least 8 characters';
            }
        }

        // USERNAME
        if (input.id === 'regUsername') {
            if (!value || value.length < 3) {
                errorMsg = 'Username min 3 characters';
            }
        }

        if (errorMsg) {
            this.showError(input, errorMsg);
            return false;
        }

        return true;
    }

    clearError(input) {
        const errorElement = document.getElementById(input.id + 'Error');
        if (errorElement) {
            errorElement.textContent = '';
            input.parentElement.classList.remove('error');
        }
    }

    showError(input, message) {
        const errorElement = document.getElementById(input.id + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
            input.parentElement.classList.add('error');
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Validation
        if (!this.validateInput(emailInput) || !this.validateInput(passwordInput)) {
            return;
        }

        this.setLoading(submitBtn, true, 'login');

        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            this.showNotification("Login successful ✅", "success");

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Login error:', error);
        } finally {
            this.setLoading(submitBtn, false, 'login');
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            this.showNotification("Passwords do not match ❌", "error");
            return;
        }

        this.setLoading(submitBtn, true, 'register');

        try {
            const response = await fetch(`${this.API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.showNotification("Account created ✅ Redirecting...", "success");

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Register error:', error);
        } finally {
            this.setLoading(submitBtn, false, 'register');
        }
    }

    setLoading(button, loading, type) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            button.disabled = false;

            if (type === 'login') {
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            } else {
                button.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => notification.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthHandler();
});