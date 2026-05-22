<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const changingPassword = ref(false);
const editMode = ref(false);
const activeTab = ref('personal');
const avatarPreview = ref(null);
const avatarInput = ref(null);
const showDeleteConfirm = ref(false);
const deleteConfirmText = ref('');

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const toast = ref({
    show: false,
    message: 'User updated successfully!',
    type: 'success'
});

const userData = ref({
    name: '',
    email: ''
});

const passwordData = ref({
    current_password: '',
    password: '',
    password_confirmation: ''
});

const activeSessions = ref([]);

const tabs = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
];

const userInitials = computed(() => {
    const name = userData.value.name || authStore.user.name || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const userRole = computed(() => {
    return authStore.user?.role?.name || authStore.user?.role || 'User';
});

const memberSince = computed(() => {
    const date = authStore.user?.created_at;
    if (!date) return 'Recent';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
});

const avatarColor = computed(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const index = (userData.value.name?.length || 0) % colors.length;
    return colors[index];
});

const isProfileComplete = computed(() => {
    return userData.value.name && userData.value.email;
});

const passwordStrength = computed(() => {
    const password = passwordData.value.password;
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
});

const strengthText = computed(() => {
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return texts[passwordStrength.value];
});

const passwordsMatch = computed(() => {
    return passwordData.value.password && passwordData.value.password_confirmation && passwordData.value.password === passwordData.value.password_confirmation;
});

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type };
    setTimeout(() => {
        toast.value.show = false;
    }, 3000);
}

const triggerAvatarUpload = () => {
    avatarInput.value.click();
}

const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPreview.value = e.target.result;
        }
        reader.readAsDataURL(file);
        showToast('Profile picture updated!');
    }
}

const fetchUserData = async () => {
    try {
        const response = await api.get('/user');
        userData.value.name = response.data.name;
        userData.value.email = response.data.email;

        authStore.user = response.data;
        localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
        console.error('Error fetching user data:', error);
        if (authStore.user) {
            userData.value.name = authStore.user.name;
            userData.value.email = authStore.user.email;
        }
    }
}

const updateProfile = async () => {
    loading.value = true;
    try {
        const response = await api.put('/user', {
            name: userData.value.name,
            email: userData.value.email
        });

        console.log('Profile update response:', response.data);

        authStore.user = response.data.user || response.data;
        localStorage.setItem('user', JSON.stringify(authStore.user));
        showToast('Profile updated successfully!');
        editMode.value = false;
    } catch (error) {
        console.error('Error updating profile:', error.response);
        showToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
        loading.value = false;
    }
}

const changePassword = async () => {
    if (!passwordsMatch.value) {
        showToast('Passwords do not match', 'error');
        return;
    }

    changingPassword.value = true;
    try {
        await api.post('/user/change-password', {
            current_password: passwordData.value.current_password,
            password: passwordData.value.password,
            password_confirmation: passwordData.value.password_confirmation
        });

        showToast('Password changed successfully!');
        passwordData.value = {
            current_password: '',
            password: '',
            password_confirmation: ''
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
        changingPassword.value = false;
    }
}

const fetchSessions = async () => {
    try {
        const response = await api.get('/user/sessions');
        activeSessions.value = response.data.sessions || [];
    } catch (error) {
        console.error('Error fetching sessions:', error);
        activeSessions.value = [
            {
                id: 1,
                device: 'Desktop',
                browser: navigator.userAgent,
                last_active: 'Current Session',
                is_current_device: true
            }
        ];
    }
}

const revokeSession = async (sessionId) => {
    try {
        await api.delete(`/user/sessions/${sessionId}`);
        showToast('Session revoked successfully!');
        await fetchSessions();
    } catch (error) {
        console.error('Error revoking session:', error);
        showToast(error.response?.data?.message || 'Failed to revoke session', 'error');
    }
}

const revokeAllSessions = async () => {
    try {
        await api.delete('/user/sessions');
        showToast('All sessions revoked successfully!');
        await fetchSessions();
    } catch (error) {
        console.error('Error revoking all sessions:', error);
        showToast(error.response?.data?.message || 'Failed to revoke sessions', 'error');
    }
}

const deleteAccount = async () => {
    if (deleteConfirmText.value !== 'DELETE') return;

    try {
        await api.delete('/user');
        showToast('Account deleted successfully!');
        authStore.logout();
        router.push('/login');
    } catch (error) {
        console.error('Error deleting account:', error);
        showToast(error.response?.data?.message || 'Failed to delete account', 'error');
    }
}

const cancelEdit = () => {
    editMode.value = false;
    fetchUserData();
}

onMounted(() => {
    fetchUserData();
    // fetchSessions();
});
</script>

<template>
    <div class="profile-page">
        <div class="profile-container">
            <!-- Profile Header -->
            <div class="profile-header">
                <div class="header-background"></div>
                <div class="profile-avatar-section">
                    <div class="avatar-wrapper">
                        <div class="avatar" :style="{ backgroundColor: avatarColor }">
                            <span v-if="!avatarPreview">{{ userInitials }}</span>
                            <img v-else :src="avatarPreview" alt="Avatar" class="avatar-image">
                            <button class="edit-avatar-btn" @click="triggerAvatarUpload">
                                📷
                            </button>
                        </div>
                        <input type="file" ref="avatarInput" accept="image/*" style="display: none"
                            @change="handleAvatarUpload" />
                    </div>
                    <h1 class="profile-name">{{ userData.name }}</h1>
                    <p class="profile-role">{{ userRole }}</p>
                    <div class="profile-status" :class="isProfileComplete ? 'status-complete' : 'status-incomplete'">
                        {{ isProfileComplete ? '✓ Profile Complete' : '⚠️ Profile Incomplete' }}
                    </div>
                </div>
            </div>

            <!-- Profile Content Tabs -->
            <div class="profile-tabs">
                <button v-for="tab in tabs" :key="tab.id" class="tab-btn"
                    :class="{ 'tab-active': activeTab === tab.id }" @click="activeTab = tab.id">
                    <span class="tab-icon">{{ tab.icon }}</span>
                    <span class="tab-label">{{ tab.label }}</span>
                </button>
            </div>

            <!-- Personal Information Tab -->
            <div v-show="activeTab === 'personal'" class="tab-content">
                <div class="info-card">
                    <div class="card-header">
                        <h3>Personal Information</h3>
                        <button class="edit-btn" @click="editMode = !editMode">
                            {{ editMode ? 'Cancel' : 'Edit' }}
                        </button>
                    </div>

                    <form @submit.prevent="updateProfile" class="profile-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <div class="input-wrapper">
                                    <span class="input-icon">👤</span>
                                    <input v-model="userData.name" type="text" class="form-input" :disabled="!editMode"
                                        :class="{ 'is-editing': editMode }" required />
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <div class="input-wrapper">
                                    <span class="input-icon">📧</span>
                                    <input v-model="userData.email" type="email" class="form-input"
                                        :disabled="!editMode" :class="{ 'is-editing': editMode }" required />
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <div class="input-wrapper">
                                    <span class="input-icon">👥</span>
                                    <input :value="userRole" type="text" class="form-input" disabled />
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Member Since</label>
                                <div class="input-wrapper">
                                    <span class="input-icon">🎉</span>
                                    <input :value="memberSince" type="text" class="form-input" disabled />
                                </div>
                            </div>
                        </div>

                        <div v-if="editMode" class="form-actions">
                            <button type="button" class="btn-secondary" @click="cancelEdit">Cancel</button>
                            <button type="submit" class="btn-primary" :disabled="loading">
                                {{ loading ? 'Saving...' : 'Save Changes' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Security Tab -->
            <div v-show="activeTab === 'security'" class="tab-content">
                <div class="info-card">
                    <div class="card-header">
                        <h3>Change Password</h3>
                    </div>

                    <form @submit.prevent="changePassword" class="profile-form">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <div class="input-wrapper">
                                <span class="input-icon">🔒</span>
                                <input v-model="passwordData.current_password"
                                    :type="showCurrentPassword ? 'text' : 'password'" class="form-input" required />
                                <button type="button" class="toggle-password"
                                    @click="showCurrentPassword = !showCurrentPassword">
                                    {{ showCurrentPassword ? '👁️' : '👁️‍🗨️' }}
                                </button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <div class="input-wrapper">
                                <span class="input-icon">🔑</span>
                                <input v-model="passwordData.password" :type="showNewPassword ? 'text' : 'password'"
                                    class="form-input" required />
                                <button type="button" class="toggle-password"
                                    @click="showNewPassword = !showNewPassword">
                                    {{ showNewPassword ? '👁️' : '👁️‍🗨️' }}
                                </button>
                            </div>
                            <div v-if="passwordData.password" class="password-strength">
                                <div class="strength-bars">
                                    <div v-for="i in 4" :key="i" class="strength-bar"
                                        :class="{ active: i <= passwordStrength }"></div>
                                </div>
                                <span class="strength-text">{{ strengthText }}</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <div class="input-wrapper">
                                <span class="input-icon">✓</span>
                                <input v-model="passwordData.password_confirmation"
                                    :type="showConfirmPassword ? 'text' : 'password'" class="form-input" required />
                                <button type="button" class="toggle-password"
                                    @click="showConfirmPassword = !showConfirmPassword">
                                    {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
                                </button>
                            </div>
                            <div v-if="passwordData.password_confirmation" class="password-match"
                                :class="{ match: passwordsMatch }">
                                {{ passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match' }}
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn-primary" :disabled="changingPassword || !passwordsMatch">
                                {{ changingPassword ? 'Updating...' : 'Update Password' }}
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Account Sessions -->
                <div class="info-card">
                    <div class="card-header">
                        <h3>Active Sessions</h3>
                        <button class="edit-btn" @click="fetchSessions">Refresh</button>
                    </div>
                    <div class="sessions-list">
                        <div v-for="session in activeSessions" :key="session.id" class="session-item">
                            <div class="session-icon">{{ session.device === 'Mobile' ? '📱' : '💻' }}</div>
                            <div class="session-info">
                                <div class="session-device">{{ session.device || 'Unknown Device' }}</div>
                                <div class="session-details">{{ session.browser || 'Unknown Browser' }}</div>
                                <div class="session-time">Last active: {{ session.last_active || 'Current session' }}
                                </div>
                                <div class="session-time" v-if="session.is_current_device">
                                    <span class="current-badge">Current Device</span>
                                </div>
                            </div>
                            <button v-if="!session.is_current_device" class="revoke-btn"
                                @click="revokeSession(session.id)">
                                Revoke
                            </button>
                            <span v-else class="current-badge-text">Active Now</span>
                        </div>
                    </div>
                    <button v-if="activeSessions.length > 1" class="revoke-all-btn" @click="revokeAllSessions">
                        Revoke All Other Sessions
                    </button>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone">
            <h3>Danger Zone</h3>
            <div class="danger-item">
                <div class="danger-info">
                    <div class="danger-icon">⚠️</div>
                    <div>
                        <h4>Delete Account</h4>
                        <p>Permanently delete your account and all data</p>
                    </div>
                </div>
                <button class="danger-btn" @click="showDeleteConfirm = true">Delete Account</button>
            </div>
        </div>

        <!-- Delete Account Confirmation Modal -->
        <div v-if="showDeleteConfirm" class="modal" @click.self="showDeleteConfirm = false">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Delete Account</h2>
                    <button class="close-btn" @click="showDeleteConfirm = false">×</button>
                </div>
                <div class="modal-body">
                    <div class="warning-icon">⚠️</div>
                    <p>Are you sure you want to delete your account?</p>
                    <p class="warning-text">This action cannot be undone. All your data will be permanently lost.</p>
                    <div class="form-group">
                        <label>Type "DELETE" to confirm</label>
                        <input v-model="deleteConfirmText" type="text" placeholder="DELETE" class="form-input">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
                    <button class="btn-danger" @click="deleteAccount" :disabled="deleteConfirmText !== 'DELETE'">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <Teleport to="body">
        <div v-if="toast.show" class="toast" :class="toast.type">
            <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠️' }}</span>
            <span class="toast-message">{{ toast.message }}</span>
        </div>
    </Teleport>
</template>

<style scoped>
.profile-page {
    min-height: 100vh;
    background: #f8fafc;
    padding: 2rem;
}

.profile-container {
    max-width: 1000px;
    margin: 0 auto;
}

/* Profile Header */
.profile-header {
    background: white;
    border-radius: 1rem;
    overflow: hidden;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-background {
    height: 120px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.profile-avatar-section {
    text-align: center;
    margin-top: -60px;
    padding-bottom: 1.5rem;
}

.avatar-wrapper {
    display: inline-block;
    position: relative;
}

.avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: bold;
    color: white;
    border: 4px solid white;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.edit-avatar-btn {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: white;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
}

.edit-avatar-btn:hover {
    transform: scale(1.1);
}

.profile-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 1rem 0 0.25rem;
}

.profile-role {
    color: #3b82f6;
    font-size: 0.875rem;
    font-weight: 500;
}

.profile-status {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    margin-top: 0.5rem;
}

.status-complete {
    background: #d1fae5;
    color: #059669;
}

.status-incomplete {
    background: #fef3c7;
    color: #d97706;
}

/* Tabs */
.profile-tabs {
    display: flex;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem;
    border-radius: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab-btn {
    flex: 1;
    padding: 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
}

.tab-btn:hover {
    background: #f8fafc;
    color: #3b82f6;
}

.tab-active {
    background: #eff6ff;
    color: #3b82f6;
}

.tab-icon {
    font-size: 1.1rem;
}

.tab-label {
    font-size: 0.875rem;
}

/* Info Cards */
.info-card {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a1a;
}

.edit-btn {
    padding: 0.375rem 1rem;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
}

.edit-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
}

/* Form */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 0.75rem;
    font-size: 1rem;
    opacity: 0.5;
    pointer-events: none;
}

.form-input {
    width: 100%;
    padding: 0.625rem 0.75rem 0.625rem 2rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #1a1a1a;
    transition: all 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
}

.form-input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
}

.form-input.is-editing {
    background: white;
    border-color: #3b82f6;
}

/* Password Section */
.toggle-password {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.5;
}

.password-strength {
    margin-top: 0.5rem;
}

.strength-bars {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.25rem;
}

.strength-bar {
    flex: 1;
    height: 3px;
    background: #e5e7eb;
    border-radius: 2px;
}

.strength-bar.active {
    background: #10b981;
}

.strength-text {
    font-size: 0.7rem;
    color: #6b7280;
}

.password-match {
    font-size: 0.7rem;
    margin-top: 0.25rem;
    color: #ef4444;
}

.password-match.match {
    color: #10b981;
}

/* Form Actions */
.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
}

.btn-primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
    background: #f9fafb;
}

/* Security Settings */
.security-setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
}

.setting-info {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.setting-icon {
    font-size: 1.5rem;
}

.setting-details h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.setting-details p {
    font-size: 0.75rem;
    color: #6b7280;
}

.setting-btn {
    padding: 0.375rem 1rem;
    background: #e5e7eb;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.setting-btn.active {
    background: #ef4444;
    color: white;
}

/* Sessions */
.sessions-list {
    margin-bottom: 1rem;
}

.session-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
}

.session-icon {
    font-size: 1.5rem;
}

.session-info {
    flex: 1;
}

.session-device {
    font-weight: 600;
    font-size: 0.875rem;
}

.session-details {
    font-size: 0.75rem;
    color: #6b7280;
}

.session-time {
    font-size: 0.7rem;
    color: #9ca3af;
}

.revoke-btn {
    padding: 0.25rem 0.75rem;
    background: transparent;
    border: 1px solid #ef4444;
    color: #ef4444;
    border-radius: 0.375rem;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s;
}

.revoke-btn:hover {
    background: #ef4444;
    color: white;
}

.revoke-all-btn {
    width: 100%;
    padding: 0.625rem;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
}

.revoke-all-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
}

/* Preferences */
.preferences-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.preference-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
}

.preference-info {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.preference-icon {
    font-size: 1.25rem;
}

.preference-info h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.preference-info p {
    font-size: 0.75rem;
    color: #6b7280;
}

.currency-select {
    padding: 0.375rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
}

/* Toggle Switch */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
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

input:checked+.toggle-slider {
    background-color: #3b82f6;
}

input:checked+.toggle-slider:before {
    transform: translateX(20px);
}

/* Danger Zone */
.danger-zone {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid #fee2e2;
}

.danger-zone h3 {
    color: #ef4444;
    font-size: 1rem;
    margin-bottom: 1rem;
}

.danger-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #fef2f2;
    border-radius: 0.5rem;
}

.danger-info {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.danger-icon {
    font-size: 1.25rem;
}

.danger-info h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.danger-info p {
    font-size: 0.75rem;
    color: #6b7280;
}

.danger-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
}

.danger-btn:hover {
    background: #dc2626;
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 1rem;
    width: 90%;
    max-width: 450px;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #9ca3af;
}

.modal-body {
    padding: 1.5rem;
    text-align: center;
}

.warning-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.warning-text {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.5rem;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    justify-content: flex-end;
    border-top: 1px solid #e5e7eb;
}

.btn-danger {
    padding: 0.625rem 1.25rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
}

.btn-danger:disabled {
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
    background: white;
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

/* Responsive */
@media (max-width: 768px) {
    .profile-page {
        padding: 1rem;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }

    .tab-label {
        display: none;
    }

    .preference-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .danger-item {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
    }
}
</style>