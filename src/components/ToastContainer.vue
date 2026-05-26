<script setup>
import { useNotifications } from '@/composables/useNotifications';

const { toasts, removeToast } = useNotifications();
const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' };
</script>

<template>
    <Teleport to="body">
        <div class="toast-container">
            <TransitionGroup name="toast">
                <div v-for="t in toasts" :key="t.id" :class="['toast', `toast-${t.type}`]">
                    <span class="toast-icon">{{ icons[t.type] }}</span>
                    <div class="toast-body">
                        <p>{{ t.title }}</p>
                        <span v-if="t.message">{{ t.message }}</span>
                    </div>
                    <button @click="removeToast(t.id)" class="toast-close">&times;</button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem; right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 12px 14px;
  min-width: 300px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.toast-success {
    border-left: 3px solid #10b981;
}

.toast-error {
    border-left: 3px solid #ef4444;
}

.toast-warning {
    border-left: 3px solid #f59e0b;
}

.toast-info {
    border-left: 3px solid #3b82f6;
}

.toast-icon {
    font-size: 16px;
}

.toast-body {
    flex: 1;
}

.toast-body p {
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    margin: 0;
}

.toast-body span {
    font-size: 12px;
    color: #6b7280;
}

.toast-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 13px;
    padding: 2px;
}

.toast-close:hover {
    color: #374151;
}

.toast-enter-active {
    transition: all 0.25s ease;
}

.toast-leave-active {
    transition: all 0.2s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(20px);
}
</style>