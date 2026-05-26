// src/composables/useNotifications.js
import { reactive, readonly, computed } from 'vue'
import api from '../services/api'

const state = reactive({
  notifications: [],
  toasts: [],
  unreadCount: 0,
})

let toastId = 0

export function useNotifications() {

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications')
      state.notifications = data.notifications
      state.unreadCount = data.unread_count
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      state.notifications.forEach(n => n.read = true)
      state.unreadCount = 0
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  async function markRead(id) {
    try {
      await api.post(`/notifications/${id}/read`)
      const n = state.notifications.find(n => n.id === id)
      if (n) {
        n.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  function addToast({ type = 'info', title, message, duration = 4000 }) {
    const id = ++toastId
    state.toasts.push({ id, type, title, message })
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id) {
    const i = state.toasts.findIndex(t => t.id === id)
    if (i !== -1) state.toasts.splice(i, 1)
  }

  return {                          
    notifications: readonly(state.notifications),
    toasts: readonly(state.toasts),
    unreadCount: computed(() => state.unreadCount),
    fetchNotifications,
    markAllRead,
    markRead,
    addToast,
    removeToast,
  }
}