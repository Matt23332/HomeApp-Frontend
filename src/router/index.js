import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', name: 'LandingPage', component: () => import('@/components/LandingPage.vue') },
  { path: '/login', name: 'Login', component: () => import('@/components/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/components/Register.vue') },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/components/ForgotPassword.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/components/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/expenses', name: 'Expenses', component: () => import('@/components/Expenses.vue'), meta: { requiresAuth: true } },
  { path: '/reports', name: 'Reports', component: () => import('@/components/Reports.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/components/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/payments', name: 'Payments', component: () => import('@/components/Payments.vue'), meta: { requiresAuth: true } },
  { path: '/bills', name: 'Bills', component: () => import('@/components/Bills.vue'), meta: { requiresAuth: true } },
  { path: '/shopping-items', name: 'ShoppingItems', component: () => import('@/components/ShoppingItems.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('@/components/Setting.vue'), meta: { requiresAuth: true } },
  { path: '/notifications', name: 'Notifications', component: () => import('@/components/Notification.vue'), meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: () => import('@/components/Admin.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login' }
  }

  if (to.meta.requiresAdmin && auth.userRole !== 'Admin') {
    return { path: '/dashboard' }
  }

  if ((to.path === '/login' || to.path === '/register') && auth.isLoggedIn) {
    return { path: '/dashboard' }
  }
})

export default router
