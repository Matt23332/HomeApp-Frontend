<script setup>

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const isScrolled = ref(false);
const mobileMenuOpen = ref(false);
const userMenuOpen = ref(false);
const notificationsOpen = ref(false);
const unreadCount = ref(3);
const user = computed (() => auth.user);

const navigationItems = ref([
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Expenses', path: '/expenses', icon: '💰' },
    { name: 'Bills', path: '/bills', icon: '📄' },
    { name: 'Shopping', path: '/shopping-items', icon: '🛒' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'Payments', path: '/payments', icon: '💳' },
]);

const notifications = ref([
    {
        id: 1,
        title: 'Bill Reminder',
        message: 'Electricity bill is due in 2 days', 
        icon: '⚡',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
        id: 2,
        title: 'Payment Confirmed',
        message: 'Your payment has been recieved.',
        icon: '✅',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    {
        id: 3,
        title: 'Budget Alert',
        message: 'You have used 60% of your total budget this month',
        icon: '⚠️',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24)
    }
]);

const userAvatarColor = computed(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    if (!user.value?.name) return colors[0];
    const index = user.value.name.length % colors.length;
    return colors[index];
});

const isActiveRoute = (path) => {
    if (path === '/dashboard') {
        return route.path === '/dashboard';
    }
    return route.path.startsWith(path);
}

const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}

const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
    if (mobileMenuOpen.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
    document.body.style.overflow = '';
}

const toggleUserMenu = () => {
    userMenuOpen.value = !userMenuOpen.value;
    notificationsOpen.value = false;
}

const closeUserMenu = () => {
    userMenuOpen.value = false;
}

const toggleNotifications = () => {
    notificationsOpen.value = !notificationsOpen.value;
    userMenuOpen.value = false;
    if (notificationsOpen.value && unreadCount.value > 0) {
        // Fetch notifications from here
    }
}

const closeNotifications = () => {
    notificationsOpen.value = false;
}

const markAllAsRead = () => {
    notifications.value.forEach(notif => notif.read = true);
    unreadCount.value = 0;
}

const handleNotificationClick = (notification) => {
    if (!notification.read) {
        notification.read = true;
        unreadCount.value--;
    }

    if (notification.title === 'Bill Reminder') {
        router.push('/bills');
    }

    notificationsOpen.value = false;
}

const handleScroll = () => {
    isScrolled.value = window.scrollY > 10;
}

const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
}

const vClickOutside = {
    mounted(el, binding) {
        el.clickOutsideEvent = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value();
            }
        };
        document.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    }
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    document.body.style.overflow = '';
});
</script>

<template>
    <nav class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
        <div class="navbar-container">
            <div class="navbar-brand">
                <router-link to="/dashboard" class="brand-link">
                    <div class="brand-icon">
                        <span class="icon">🏠</span>
                    </div>
                    <div class="brand-text">
                        Nyumba<span class="brand-highlight">Yangu</span>
                    </div>
                </router-link>
            </div>

            <div class="navbar-links" :class="{ 'navbar-links-mobile': mobileMenuOpen }">
                <div class="nav-links-container">
                    <router-link v-for="item in navigationItems" :key="item.path" :to="item.path" class="nav-link" :class="{ 'nav-link-active': isActiveRoute(item.path) }" @click="closeMobileMenu">
                        <span class="nav-icon">{{ item.icon }}</span>
                        <span class="nav-text">{{ item.name }}</span>
                        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
                    </router-link>
                </div>

                <div class="navbar-user">
                    <div class="dropdown notification-dropdown" v-click-outside="closeNotifications">
                        <button class="user-action-btn" @click="toggleNotifications" :class="{ 'action-active': notificationsOpen }">
                            <span class="action-icon">🔔</span>
                            <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
                        </button>

                        <div v-if="notificationsOpen" class="dropdown-menu notifications-menu">
                            <div class="dropdown-header">
                                <h4>Notifications</h4>
                                <button class="mark-all-btn" @click="markAllAsRead">Mark All Read</button>
                            </div>
                            <div class="dropdown-content">
                                <div v-if="notifications.length === 0" class="empty-state">
                                    <span class="empty-icon">🔕</span>
                                    <p>No new notifications</p>
                                </div>
                                <div v-for="notification in notifications" :key="notification.id" class="notification.item" :class="{ 'notification.unread': !notification.read }" @click="handleNotificationClick(notification)">
                                    <div class="notification-icon">{{ notification.icon }}</div>
                                    <div class="notification-content">
                                        <div class="notification-title">{{ notification.title }}</div>
                                        <div class="notification-message">{{ notification.message }}</div>
                                        <div class="notification-time">{{ notification.created_at }}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="dropdown-footer">
                                <router-link to="/notifications" class="view-all-link">View All Notifications</router-link>
                            </div>
                        </div>
                    </div>

                    <div class="dropdown user-dropdown" v-click-outside="closeUserMenu">
                        <button class="user-menu-btn" @click="toggleUserMenu" :class="{ 'menu-active': userMenuOpen }">
                            <div class="user-avatar" :style="{ backgroundColor: userAvatarColor }">
                                <span v-if="user">{{ getInitials(user.name) }}</span>
                                <span v-else class="icon">👤</span>
                            </div>
                            <div class="user-info">
                                <span class="user-name">{{ user?.name || 'Guest' }}</span>
                                <span class="user-role">{{ user?.role || 'User' }}</span>
                            </div>
                            <span class="dropdown-arrow">▼</span>
                        </button>

                        <div v-if="userMenuOpen" class="dropdown-menu user-menu">
                            <div class="user-profile-preview">
                                <div class="preview-avatar" :style="{ backgroundColor: userAvatarColor }">
                                    {{ getInitials(user?.name) }}
                                </div>
                                <div class="preview-info">
                                    <div class="preview-name">{{ user?.name }}</div>
                                    <div class="preview-email">{{ user?.email }}</div>
                                </div>
                            </div>

                            <div class="dropdown-divider"></div>

                            <router-link to="/profile" class="dropdown-item" @click="closeUserMenu">
                                <span class="item-icon">👤</span>
                                <span class="item-text">My Profile</span>
                            </router-link>

                            <router-link to="/setting" class="dropdown-item" @click="closeUserMenu">
                                <span class="item-icon">⚙️</span>
                                <span class="item-text">Settings</span>
                            </router-link>

                            <router-link to="/billing" class="dropdown-item" v-if="user?.role === 'Admin'">
                                <span class="item-icon">💳</span>
                                <span class="item-text">Billing</span>
                            </router-link>

                            <div class="dropdown-divider"></div>

                            <button class="dropdown-item logout-item" @click="handleLogout">
                                <span class="item-icon">🚪</span>
                                <span class="item-text">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <button class="mobile-menu-btn" @click="toggleMobileMenu">
                <span class="menu-icon" :class="{'menu-open': mobileMenuOpen }">
                    <span></span><span></span><span></span>
                </span>
            </button>
        </div>

        <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
    </nav>
</template>

<style scoped>
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
    transition: all 0.3s ease;
}

.navbar-scrolled {
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-bottom-color: rgba(59, 130, 246, 0.2);
}

.navbar-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    padding: 0.75rem 2rem;
    align-items: center;
    justify-content: space-between;
}

.navbar-brand {
    flex-shrink: 0;
}

.brand-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    gap: 0.75rem;
    transition: transform 0.2s ease;
}

.brand-link:hover {
    transform: scale(1.02);
}

.brand-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.brand-icon .icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.brand-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.5px;
}

.brand-highlight {
    color: #3b82f6;
}

.navbar-links {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex: 1;
    justify-content: flex-end;
}

.nav-links-container {
    display: flex;
    gap: 0.75rem;
}

.nav-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    color: #6b7280;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease;
    font-weight: 500;
}

.nav-link:hover {
    background: rgba(59, 130, 246, 0.05);
    color: #3b82f6;
    transform: translateY(-1px);
}

.nav-link-active {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    font-weight: 600;
}

.nav-link-active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 30%;
    height: 2px;
    background: #3b82f6;
    border-radius: 2px;
}

.nav-icon {
    font-size: 1.1rem;
}

.nav-text {
    font-size: 0.9rem;
}

.nav-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
}

.navbar-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.user-action-btn {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.user-action-btn:hover {
    background: rgba(59, 130, 246, 0.05);
}

.action-active {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.action-icon {
    font-size: 1.2rem;
}

.notification-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
    min-width: 18px;
}

.user-menu-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
}

.user-menu-btn:hover {
    background: rgba(59, 130, 246, 0.05);
}

.menu-active {
    background: rgba(59, 130, 246, 0.1);
}

.user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
}

.user-info {
    text-align: left;
    line-height: 1.2;
}

.user-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a1a1a;
    display: block;
}

.user-role {
    font-size: 0.75rem;
    color: #6b7280;
    display: block;
}

.dropdown-arrow {
    font-size: 0.7rem;
    color: #9ca3af;
    transition: transform 0.2s ease;
}

.menu-active .dropdown-arrow {
    transform: rotate(180deg);
}

.dropdown {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    min-width: 280px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    z-index: 1000;
}

.user-menu-btn:focus + .dropdown-menu,
.dropdown:hover .dropdown-menu,
.dropdown-menu.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.user-menu {
    min-width: 260px;
}

.user-profile-preview {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.02));
}

.preview-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1.1rem;
}

.preview-name {
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 0.25rem;
}

.preview-email {
    font-size: 0.75rem;
    color: #6b7280;
}

.dropdown-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.5rem 0;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: #374151;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    border: none;
    background: none;
    font-size: 0.9rem;
}

.dropdown-item:hover {
    background: rgba(59, 130, 246, 0.05);
    color: #3b82f6;
}

.logout-item {
    color: #ef4444;
}

.logout-item:hover {
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
}

.item-icon {
    font-size: 1.1rem;
}

.notifications-menu {
    min-width: 320px;
    max-height: 480px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.dropdown-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e5e7eb;
}

.dropdown-header h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.mark-all-btn {
    background: none;
    border: none;
    color: #3b82f6;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    transition: all 0.2s;
}

.mark-all-btn:hover {
    background: rgba(59, 130, 246, 0.1);
}

.dropdown-content {
    flex: 1;
    overflow-y: auto;
    max-height: 320px;
}

.empty-state {
    padding: 2rem;
    text-align: center;
    color: #9ca3af;
}

.empty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
}

.notification-item {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid #f3f4f6;
}

.notification-item:hover {
    background: rgba(58, 130, 246, 0.05);
}

.notification-unread {
    background: rgba(59, 130, 246, 0.03);
}

.notification-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.notification-content {
    flex: 1;
}

.notification-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: #1a1a1a;
    margin-bottom: 0.25rem;
}

.notification-message {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
}

.notification-time {
    font-size: 0.75rem;
    color: #9ca3af;
}

.dropdown-footer {
    padding: 0.75rem 1rem;
    text-align: center;
    border-top: 1px solid #e5e7eb;
}

.view-all-link {
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.2s;
}

.view-all-link:hover {
    text-decoration: underline;
}

.mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    z-index: 1001;
}

.menu-icon {
    width: 24px;
    height: 20px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.menu-icon span {
    display: block;
    height: 2px;
    background: #1a1a1a;
    border-radius: 2px;
    transition: all 0.3s ease;
}

.menu-open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
}

.menu-open span:nth-child(2) {
    opacity: 0;
}

.menu-open span:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -7px);
}

.mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@media (max-width: 968px) {
    .mobile-menu-btn {
        display: block;
    }

    .navbar-links {
        position: fixed;
        top: 0;
        right: -100%;
        width: 80%;
        max-width: 320px;
        height: 100vh;
        background: white;
        flex-direction: column;
        justify-content: flex-start;
        padding: 5rem 1rem 2rem;
        transition: right 0.3s ease;
        z-index: 1000;
        box-shadow: -5px 0 2px rgba(0, 0, 0, 0.05);
    }

    .navbar-links-mobile {
        right: 0;
    }

    .nav-links-container {
        flex-direction: column;
        gap: 0;
        width: 100%;
    }

    .nav-link {
        width: 100%;
        padding: 0.875rem 1rem;
    }

    .navbar-user {
        flex-direction: column;
        width: 100%;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }

    .dropdown {
        width: 100%;
    }

    .user-menu-btn {
        width: 100%;
        justify-content: flex-start;
    }

    .dropdown-menu {
        position: static;
        box-shadow: none;
        margin-top: 0.5rem;
        width: 100%;
    }
}

@media (max-width: 640px) {
    .navbar-container {
        padding: 0.5rem 1rem;
    }

    .brand-text {
        font-size: 1.25rem;
    }

    .brand-icon {
        width: 32px;
        height: 32px;
    }

    .brand-icon .icon {
        font-size: 1.2rem;
    }

    .user-info {
        display: none;
    }
}
</style>