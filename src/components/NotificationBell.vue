<script setup>
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useNotifications } from '@/composables/useNotifications';

const { notifications, markAsRead, unreadCount, markAllAsRead } = useNotifications();
const open = ref(false);
const wrapper = ref(null);

onClickOutside(wrapper, () => open.value = false);

const iconMap = {
    user: '👤',
    check: '✅',
    'alert-triangle': '⚠️',
    message: '💬',
    info: 'ℹ️',
}

const iconBgMap = {
    info: '#e6f1fb',
    success: '#eaf3de',
    warning: '#faeeda',
    danger: '#fcebeb',
}
</script>

<template>
    <div ref="wrapper" style="position: relative; display: inline-block;">
        <button @click="open = !open" class="bell-btn" aria-label="Notifications">
            🔔
            <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </button>

        <div v-show="open" class="dropdown">
            <div class="dd-header">
                <span>Notifications</span>
                <button @click="markAllAsRead" class="mark-read-btn">Mark all as read</button>
            </div>
            <div class="notif-list">
                <div v-for="n in notifications" :key="n.id" :class="['notif-item', { unread: !n.read }]" @click="markAsRead(n.id)">
                    <div class="notif-icon" :style="{background: iconBgMap[n.type] }">
                        {{ iconMap[n.icon] || iconMap[n.type] }}
                    </div>
                    <div class="notif-body">
                        <p>{{ n.text }}</p>
                        <span>{{ n.time }}</span>
                    </div>
                    <span v-if="!n.read" class="unread-dot" />
                </div>
                <div v-if="notifications.length === 0" class="empty">
                    No notifications
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bell-btn {
  position: relative;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}
.bell-btn:hover { border-color: #3b82f6; }

.badge {
  position: absolute;
  top: 4px; right: 4px;
  background: #3b82f6;
  color: white;
  font-size: 10px;
  font-weight: 700;
  width: 16px; height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid white;
}

.dropdown {
  position: absolute;
  top: 48px; right: 0;
  width: 320px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 1000;
  overflow: hidden;
}

.dd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.dd-header span { font-size: 14px; font-weight: 600; color: #1a1a1a; }

.mark-read-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
}
.mark-read-btn:hover { color: #2563eb; }

.notif-list { max-height: 360px; overflow-y: auto; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #f9fafb; }
.notif-item.unread { background: #eff6ff; }
.notif-item.unread:hover { background: #dbeafe; }

.notif-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.notif-body { flex: 1; }
.notif-body p { font-size: 13px; color: #1a1a1a; line-height: 1.4; margin: 0 0 2px; }
.notif-body span { font-size: 11px; color: #9ca3af; }

.unread-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  flex-shrink: 0;
  margin-top: 4px;
}

.empty { padding: 2rem; text-align: center; color: #9ca3af; font-size: 13px; }
</style>