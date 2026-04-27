<script setup>

import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api';

const router = useRouter();
const route = useRoute();

const form = reactive({
    'email': '',
    'password': '',
});

const errors = ref({});
const serverError = ref('');
const successMessage = ref('');
const loading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);
const showDemo = ref(false);

onMounted(() => {
    if (route.query.registered) {
        successMessage.value = 'Registration successful! Please log in.';
        setTimeout(() => {
            successMessage.value = '';
        }, 5000);
    }

    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        form.email = rememberedEmail;
        rememberMe.value = true;
    }

    if (import.meta.env.DEV) {
        showDemo.value = true;
    }
});

const handleLogin = async () => {
    loading.value = true;
    errors.value = {};
    serverError.value = '';

    try {
        const response = await api.post('/login', {
            email: form.email,
            password: form.password,
            rememberMe: rememberMe.value,
        });

        const { token, user, redirect_url } = response.data;
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (rememberMe.value) {
            localStorage.setItem('rememberedEmail', form.email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Login successful: ', response.data);
        const redirectPath = redirect_url || (user.role === 'Admin' ? '/admin' : '/dashboard');
        setTimeout(() => {
            router.push(redirectPath);
        }, 1000);
    } catch (error) {
        console.error('Login error: ', error);

        if (error.response) {
            serverError.value = 'Invalid email or password. Please try again.';
        } else if (error.response?.status === 422) {
            errors.value = error.response.data.errors || {};
        } else if (error.response?.status === 403) {
            serverError.value = 'Your account is inactive. Kindly activate it to continue.';
        } else if (error.response?.status === 429) {
            serverError.value = 'Too many login attempts. Try again later.';
        } else {
            serverError.value = error.response?.data?.message || 'Login failed. Please try again.';
        }
    } finally {
        loading.value = false;
    }
};

const socialLogin = (provider) => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`;
};

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Copied to clipboard: ', text);
    } catch (err) {
        console.error('Failed to copy: ', err); 
    }
}
</script>

<template>
    <div class="login-page">

        <div class="left-panel">
            <div class="left-content">
                <div class="brand">
                    <span class="brand-icon">🏠</span>
                    <span class="brand-name">Nyumba<em>Yangu</em></span>
                </div>

                <h1 class="panel-title">
                    Welcome<br>Back To<br><em>NyumbaYangu.</em>
                </h1>

                <p class="panel-subtitle">
                    Track your household expenses, manage your bills and take control of your household finances with ease.
                    Login in to your account to continue your journey.
                </p>

                <div class="testimonial">
                    <div class="quote-icon">❝</div>
                    <p class="testimonial-text">
                        "NyumbaYangu has transformed the way I manage my household expenses. 
                        It's intuitive, efficient, and has saved me so much time. 
                        Highly recommended!"
                    </p>
                    <div class="testimonial-author">
                        <div class="author-avatar">👤</div>
                        <div class="author-info">
                            <div class="author-name">Anonymous</div>
                            <div class="author-title">Happy User</div>
                        </div>
                    </div>
                </div>

                <div class="security-badge">
                    <span class="badge-icon">🔒</span>
                    <span class="badge-text">Secure & Private</span>
                </div>
            </div>

            <div class="deco-lines">
                <div v-for="n in 6" :key="n" class="deco-line" :style="{ animationDelay: `${n * 0.15}s` }"></div>
            </div>
        </div>

        <div class="right-panel">
            <div class="form-card">
                <div class="form-header">
                    <div class="form-eyebrow">Sign In</div>
                    <h2 class="form-title">Welcome Back</h2>
                    <div class="form-bar"></div>
                </div>

                <div v-if="serverError" class="alert alert-error">
                    <span class="alert-icon">⚠️</span>
                    <div class="alert-content">
                        <strong>Login Failed</strong>
                        <p>{{ serverError }}</p>
                    </div>
                </div>

                <div v-if="successMessage" class="alert alert-success">
                    <span class="alert-icon">✅</span>
                    <div class="alert-content">
                        <strong>Success</strong>
                        <p>{{ successMessage }}</p>
                    </div>
                </div>

                <form @submit.prevent="handleLogin" class="login-form">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <div class="input-wrapper">
                            <span class="input-icon">📧</span>
                            <input v-model="form.email" type="email" class="form-input" :class="{ 'is-invalid': errors.email }" placeholder="email@example.com" autocomplete="email" autofocus />
                        </div>
                        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="input-wrapper">
                            <span class="input-icon">🔒</span>
                            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-input" :class="{ 'is-invalid': errors.password }" placeholder="Enter your password" autocomplete="current-password" />
                            <button type="button" class="toggle-password" @click="showPassword = !showPassword" :title="showPassword ? 'Hide Password' : 'Show Password'">
                                {{ showPassword ? '🙈' : '👁️' }}
                            </button>
                        </div>
                        <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
                    </div>

                    <div class="form-options">
                        <label class="checkbox-label">
                            <input type="checkbox" v-model="rememberMe" class="checkbox-input" />
                            <span class="checkbox-custom"></span>
                            <span class="checkbox-text">Remember Me</span>
                        </label>
                        <router-link to="/forgot-password" class="forgot-link">Forgot Password?</router-link>
                    </div>

                    <button type="submit" class="btn btn-primary btn-login" :disabled="loading">
                        <span v-if="!loading">LOGIN</span>
                        <div v-else class="spinner">
                            <span></span><span></span><span></span>
                        </div>
                    </button>
                </form>

                <div class="demo-credentials" v-if="showDemo">
                    <div class="demo-header">
                        <span class="demo-icon">🧪</span>
                        <span class="demo-title">Demo Credentials</span>
                        <button class="demo-toggle" @click="showDemo = !showDemo">Hide</button>
                    </div>
                    <div class="demo-content">
                        <div class="demo-item">
                            <span class="demo-label">Email:</span>
                            <code class="demo-value">demo@example.com</code>
                            <button class="copy-btn" @click="copyToClipboard('demo@example.com')"></button>
                        </div>
                        <div class="demo-item">
                            <span class="demo-label">Password:</span>
                            <code class="demo-value">password123</code>
                            <button class="copy-btn" @click="copyToClipboard('password123')"></button>
                        </div>
                    </div>
                </div>

                <div class="form-footer">
                    Don't have an account?
                    <router-link to="/register" class="footer-link">Register Here</router-link>
                </div>

                <div class="social-login">
                    <div class="divider">
                        <span class="divider-text">Or login with</span>
                    </div>
                    <div class="social-buttons">
                        <button class="social-btn google" @click="socialLogin('google')">
                            <span class="social-icon">G</span>
                            <span>Google</span>
                        </button>
                        <button class="social-btn facebook" @click="socialLogin('facebook')">
                            <span class="social-icon">F</span>
                            <span>Facebook</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.login-page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0f1a;
    overflow: hidden;
    position: relative;
}

.left-panel {
    background: linear-gradient(135deg, #0a0f1a, #0d1525 100%);
    position: relative;
    display: flex;
    align-items: center;
    padding: 3rem;
    overflow: hidden;
}

.left-content {
    position: relative;
    z-index: 2;
    max-width: 480px;
}

.brand {
    display: flex;
    align-items: center;
    margin-bottom: 3rem;
    gap: 0.75rem;
    animation: slideInLeft 0.6s ease;
}

.brand-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    animation: bounce 1s ease;
}

.brand-name {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.5px;
    animation: fadeIn 1s ease;
}

.brand-name em {
    color: #3b82f6;
    font-style: italic;
    font-weight: 800;
}

.panel-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    color: #fff;
    margin-bottom: 1.5rem;
    animation: slideInLeft 0.6s ease 0.1s both;
}

.panel-title em {
    color: #3b82f6;
    font-style: italic;
}

.panel-subtitle {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin-bottom: 2.5rem;
    font-size: 1rem;
    animation: slideInLeft 0.6s ease 0.2s both;
}

.tesitmonial {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
    animation: slideInLeft 0.6s ease 0.3s both;
}

.quote-icon {
    font-size: 3rem;
    color: #3b82f6;
    opacity: 0.3;
    margin-bottom: 0.5rem;
    line-height: 1;
}

.testimonial-text {
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
    margin-bottom: 1rem;
    line-height: 1.6;
}

.testimonial-author {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.author-avatar {
    width: 40px;
    height: 40px;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.author-name {
    color: #fff;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.author-title {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
}

.security-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    animation: slideInLeft 0.6s ease 0.4s both;
}

.badge-icon {
    font-size: 0.875rem;
}

.deco-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.deco-line {
    position: absolute;
    bottom: -20px;
    width: 1px;
    background: linear-gradient(to top, rgba(59, 130, 246, 0.3), transparent);
    animation: riseLine 3s ease-in-out infinite alternate;
}

.deco-line:nth-child(1) { left: 10%; height: 30%; animation-delay: 0s; }
.deco-line:nth-child(2) { left: 25%; height: 50%; animation-delay: 0.3s; }
.deco-line:nth-child(3) { left: 40%; height: 40%; animation-delay: 0.6s; }
.deco-line:nth-child(4) { left: 60%; height: 60%; animation-delay: 0.9s; }
.deco-line:nth-child(5) { left: 75%; height: 45%; animation-delay: 1.2s; }
.deco-line:nth-child(6) { left: 90%; height: 55%; animation-delay: 1.5s; }

@keyframes riseLine {
    0% { transform: translateY(0); opacity: 0; }
    50% { opacity: 0.5; }
    100% { transform: translateY(-60px); opacity: 0; }
}

@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-30px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-5px);
    }
}

.right-panel {
    background: #0f1420;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    overflow-y: auto;
}

.form-card {
    background: rgba(255, 255, 255, 0.02);
    width: 100%;
    max-width: 480px;
    border-radius: 1rem;
    padding: 2rem;
    animation: slideInRight 0.6s ease;
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(30px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.form-header {
    margin-bottom: 2rem;
}

.form-eyebrow {
    font-size: 0.7rem;
    letter-spacing: 3px;
    color: #3b82f6;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
}

.form-title {
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 1rem;
    line-height: 1.2;
}

.form-title em {
    color: #3b82f6;
    font-style: italic;
}

.form-bar {
    width: 50px;
    height: 4px;
    background: #3b82f6;
    border-radius: 2px;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 1rem;
    font-size: 1.2rem;
    opacity: 0.5;
    pointer-events: none;
}

.form-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 2.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 0.5rem;
    color: #fff;
    transition: all 0.2s;
    font-size: 0.95rem;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
}

.form-input.is-invalid {
    border-color: #ef4444;
}

.toggle-password {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.5s;
    transition: opacity 0.2s;
    padding: 0;
}

.toggle-password:hover {
    opacity: 1;
}

.form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.5rem 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.checkbox-input {
    display: none;
}

.checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    position: relative;
    transition: all 0.2s;
}

.checkbox-input:checked + .checkbox-custom {
    background: #3b82f6;
    border-color: #3b82f6;
}

.checkbox-input:checked + .checkbox-custom::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 11px;
}

.checkbox-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
}

.forgot-link {
    font-size: 0.8rem;
    color: #3b82f6;
    text-decoration: none;
    transition: opacity 0.2s;
}

.forgot-link:hover {
    opacity: 0.8;
    text-decoration: underline;
}

.btn {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-primary {
    background: #3b82f6;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-login {
    width: 100%;
    margin-top: 0.5rem;
}

.spinner {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
}

.dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    animation: bounce 0.6s ease-in-out infinite;
}

.dot:nth-child(2) {
    animation-delay: 0.1s;
}

.dot:nth-child(3) {
    animation-delay: 0.2s;
}

@keyframes bounce {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.6;
    }
    40% {
        transform: scale(1.2);
        opacity: 1;
    }
}

.alert {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 0.75rem;
    animation: slideDown 0.3s ease;
}

@keyframes alideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alert-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.alert-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.alert-content strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
}

.alert-content p {
    font-size: 0.875rem;
    margin: 0;
}

.alert-error .alert-content {
    color: #ef4444;
}

.alert-success .alert-content {
    color: #10b981;
}

.error-message {
    color: #ef4444;
    font-size: 0.7rem;
}

.demo-credentials {
    margin-top: 1.5rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    overflow: hidden;
}

.demo-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(59, 130, 246, 0.1);
    font-size: 0.8rem;
    font-weight: 550;
    color: #3b82f6;
    padding: 0.5rem 1rem;
}

.demo-icon {
    font-size: 1rem;
}

.demo-toggle {
    margin-left: auto;
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: background 0.2s;
}

.demo-toggle:hover {
    background: rgba(59, 130, 246, 0.2);
}

.demo-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.demo-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.demo-label {
    color: rgba(255, 255, 255, 0.6);
    min-width: 55px;
}

.demo-code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.75rem;
    color: #3b82f6;
    flex: 1;
}

.copy-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    padding: 0.25rem;
}

.copy-btn:hover {
    opacity: 1;
}

.form-footer {
    margin-top: 1.5rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
}

.footer-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
}

.footer-link:hover {
    text-decoration: underline;
}

.social-login {
    margin-top: 2rem;
}

.divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
}

.divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
}

.divider-text {
    position: relative;
    background: #0f1420;
    padding: 0 1rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.social-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.social-btn {
    flex: 1;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.social-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
}

.social-icon {
    font-size: 1.2rem;
    font-weight: bold;
}

/* Responsive Styles */
@media (max-width: 968px) {
    .login-page {
        grid-template-columns: 1fr;
    }

    .left-panel {
        display: none;
    }

    .right-panel {
        padding: 1rem;
    }

    .form-card {
        padding: 1.5rem;
    }
}

@media (max-width: 480px) {
    .form-title {
        font-size: 1.5rem;
    }

    .social-buttons {
        flex-direction: column;
    }

    .demo-item {
        flex-wrap: wrap;
    }

    .demo-code {
        flex: auto;
        width: 100%;
        order: 2;
    }

    .copy-btn {
        order: 3;
    }
}

.form-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.form-input:focus-visible,
.btn:focus-visible,
.social-btn:focus-visible,
.toggle-password:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
</style>