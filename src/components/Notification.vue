<script setup>
import { onMounted } from 'vue';
import { useNotifications } from '@/composables/useNotifications';
import { useRouter } from 'vue-router';

const router = useRouter();
const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
const iconMap = {
    'Bill Reminder': '⏰',
    'Expense Alert': '💸',
    'Payment Received': '✅',
    'Budget Warning': '⚠️',
    'General': 'ℹ️',
}

const handleClick = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.title === 'Bill Reminder') router.push('/bills');
}

onMounted(() => {
    fetchNotifications();
})
</script>

<template>
    <div class="notifications-page">
        <div class="page-header">
            <div>
                <h1>Notifications</h1>
                <p>{{ unreadCount }} unread</p>
            </div>
            <button v-if="unreadCount > 0" @click="markAllAsRead" class="mark-all-btn">Mark All as Read</button>
        </div>
        <div class="notifications-list">
            <div v-for="n in notifications" :key="n.id" :class="['notification-item', { unread: !n.read }]" @click="handleClick(n)">
                <div class="notif-icon">{{ iconMap[n.title] || '🔔' }}</div>
                <div class="notif-body">
                    <p class="notif-title">{{ n.title || n.text }}</p>
                    <p class="notif-message">{{ n.message || n.text }}</p>
                    <span class="notif-time">{{ n.time }}</span>
                </div>
                <span v-if="!n.read" class="unread-dot" />
            </div>
            <div v-if="notifications.length === 0" class="empty-state">
                <span>🔕</span>
                <p>You're all caught up!</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.notifications-page {
  max-width: 720px;
  margin: 2rem auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.page-header p {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.mark-all-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.2s;
}

.mark-all-btn:hover {
  background: #eff6ff;
  border-color: var(--primary);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}

.notification-item.unread {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.notif-icon { font-size: 1.5rem; flex-shrink: 0; }

.notif-body { flex: 1; }

.notif-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  margin: 0 0 0.25rem;
}

.notif-message {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.25rem;
}

.notif-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-muted);
}

.empty-state span { font-size: 3rem; display: block; margin-bottom: 1rem; }
.empty-state p { font-size: 0.875rem; }
</style>