import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Dashboard from '@/components/Dashboard.vue'
import LandingPage from '@/components/LandingPage.vue'
import Login from '@/components/Login.vue'
import Register from '@/components/Register.vue'
import Expenses from '@/components/Expenses.vue'
import Reports from '@/components/Reports.vue'
import Profile from '@/components/Profile.vue'
import Payments from '@/components/Payments.vue'
import Bills from '@/components/Bills.vue'
import ShoppingItems from '@/components/ShoppingItems.vue'
import Admin from '@/components/Admin.vue'

const routes = [
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/', name: 'LandingPage', component: LandingPage },
  { path: '/login', name: 'Login', component: Login},
  { path: '/register', name: 'Register', component: Register },
  { path: '/expenses', name: 'Expenses', component: Expenses },
  { path: '/reports', name: 'Reports', component: Reports },
  { path: '/profile', name: 'Profile', component: Profile },
  { path: '/payments', name: 'Payments', component: Payments },
  { path: '/bills', name: 'Bills', component: Bills },
  { path: '/shopping-items', name: 'ShoppingItems', component: ShoppingItems },
  { path: '/admin', name: 'Admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } },
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

  if ((to.path === '/login' || to.path === '/register') && auth.isLoggedIn) {
    return { path: '/dashboard' }
  }
})

export default router
