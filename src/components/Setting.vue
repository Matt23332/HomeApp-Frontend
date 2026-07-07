<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useTheme } from 'vuetify';
import api from '../services/api';

const vuetifyTheme = useTheme();

const loading = ref(false);   // saving server-persisted settings
const fetching = ref(false);  // initial load

const toast = ref({ show: false, message: '', type: 'success' });

// --- Theme: client-side, applied immediately, persisted in localStorage ---
const theme = ref(localStorage.getItem('theme') || 'system');

const applyTheme = (value) => {
    const resolved = value === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : value;
    // Drive our own CSS variables (custom-styled pages)...
    document.documentElement.setAttribute('data-theme', resolved);
    // ...and Vuetify's theme (v-app, v-cards, etc.) so both stay in sync.
    vuetifyTheme.global.name.value = resolved;
};

const setTheme = (value) => {
    theme.value = value;
    localStorage.setItem('theme', value);
    applyTheme(value);
};

// --- Server-persisted preferences (GET/PUT /user/settings) ---
const settings = reactive({
    currency: 'KES',
    email_notifications: true,
    bill_reminders: true,
    weekly_summary: false,
});

const currencies = [
    { code: 'KES', label: 'Kenyan Shilling (KSh)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
];

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type };
    setTimeout(() => { toast.value.show = false; }, 3000);
};

const fetchSettings = async () => {
    fetching.value = true;
    try {
        const { data } = await api.get('/user/settings');
        const s = data.settings || data.data || data;
        Object.assign(settings, {
            currency: s.currency ?? settings.currency,
            email_notifications: s.email_notifications ?? settings.email_notifications,
            bill_reminders: s.bill_reminders ?? settings.bill_reminders,
            weekly_summary: s.weekly_summary ?? settings.weekly_summary,
        });
    } catch (error) {
        // No endpoint yet / first load — fall back to defaults silently.
        if (error.response && error.response.status !== 404) {
            showToast('Could not load settings', 'error');
        }
    } finally {
        fetching.value = false;
    }
};

const saveSettings = async () => {
    loading.value = true;
    try {
        await api.put('/user/settings', { ...settings });
        showToast('Settings saved successfully!');
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    applyTheme(theme.value);
    fetchSettings();
});
</script>

<template>
    <div class="settings-page">
        <div class="settings-container">
            <header class="settings-header">
                <h1>Settings</h1>
                <p>Manage your preferences and how the app behaves for you.</p>
            </header>

            <!-- Appearance (client-side) -->
            <section class="settings-card">
                <div class="card-header">
                    <h3>Appearance</h3>
                </div>
                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-icon">🎨</span>
                        <div>
                            <h4>Theme</h4>
                            <p>Choose how Nyumba Yangu looks on this device.</p>
                        </div>
                    </div>
                    <div class="theme-options">
                        <button v-for="opt in ['light', 'dark', 'system']" :key="opt"
                            class="theme-btn" :class="{ active: theme === opt }"
                            @click="setTheme(opt)">
                            {{ opt.charAt(0).toUpperCase() + opt.slice(1) }}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Preferences (server-persisted) -->
            <section class="settings-card">
                <div class="card-header">
                    <h3>Preferences</h3>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-icon">💰</span>
                        <div>
                            <h4>Default Currency</h4>
                            <p>Used across bills, expenses and reports.</p>
                        </div>
                    </div>
                    <select v-model="settings.currency" class="currency-select" :disabled="fetching">
                        <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.label }}</option>
                    </select>
                </div>
            </section>

            <!-- Notifications (server-persisted) -->
            <section class="settings-card">
                <div class="card-header">
                    <h3>Notifications</h3>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-icon">📧</span>
                        <div>
                            <h4>Email Notifications</h4>
                            <p>Receive important account updates by email.</p>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" v-model="settings.email_notifications" :disabled="fetching" />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-icon">🔔</span>
                        <div>
                            <h4>Bill Reminders</h4>
                            <p>Get notified before bills are due.</p>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" v-model="settings.bill_reminders" :disabled="fetching" />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-row">
                    <div class="setting-info">
                        <span class="setting-icon">📊</span>
                        <div>
                            <h4>Weekly Summary</h4>
                            <p>A weekly digest of your household spending.</p>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" v-model="settings.weekly_summary" :disabled="fetching" />
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </section>

            <div class="settings-actions">
                <button class="btn-primary" :disabled="loading || fetching" @click="saveSettings">
                    {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
            </div>
        </div>

        <Teleport to="body">
            <div v-if="toast.show" class="toast" :class="toast.type">
                <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠️' }}</span>
                <span class="toast-message">{{ toast.message }}</span>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.settings-page {
    min-height: 100vh;
    background: var(--bg);
    padding: 2rem;
    transition: background-color 0.3s ease;
}

.settings-container {
    max-width: 800px;
    margin: 0 auto;
}

.settings-header {
    margin-bottom: 1.5rem;
}

.settings-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
}

.settings-header p {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.settings-card {
    background: var(--surface);
    border-radius: 1rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow);
}

.card-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
}

.card-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text);
}

.setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--border-soft);
}

.setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.setting-info {
    display: flex;
    gap: 0.875rem;
    align-items: center;
}

.setting-icon {
    font-size: 1.4rem;
}

.setting-info h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 0.15rem;
}

.setting-info p {
    font-size: 0.75rem;
    color: var(--text-muted);
}

/* Theme buttons */
.theme-options {
    display: flex;
    gap: 0.375rem;
    background: var(--surface-muted);
    padding: 0.25rem;
    border-radius: 0.5rem;
}

.theme-btn {
    padding: 0.375rem 0.875rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
}

.theme-btn.active {
    background: var(--surface);
    color: var(--primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Currency select */
.currency-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
    font-size: 0.875rem;
    color: var(--text);
    cursor: pointer;
    min-width: 200px;
}

.currency-select:focus {
    outline: none;
    border-color: var(--primary);
}

/* Toggle switch */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 24px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: var(--primary);
}

input:checked + .toggle-slider:before {
    transform: translateX(20px);
}

input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Actions */
.settings-actions {
    display: flex;
    justify-content: flex-end;
}

.btn-primary {
    padding: 0.625rem 1.5rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-1px);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Toast */
.toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1100;
    animation: slideIn 0.3s ease;
}

.toast.success {
    border-left: 4px solid #10b981;
}

.toast.error {
    border-left: 4px solid #ef4444;
}

.toast-icon {
    font-size: 1.2rem;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }

    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@media (max-width: 640px) {
    .settings-page {
        padding: 1rem;
    }

    .setting-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .currency-select {
        width: 100%;
    }
}
</style>
