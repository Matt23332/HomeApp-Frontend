import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import api from '../services/api';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') ?? null)
    const user = ref(JSON.parse(localStorage.getItem('user')) ?? null)

    const isLoggedIn = computed(() => !!token.value)
    const userRole = computed(() => {
        if (!user.value) return null;
        return user.value.role?.name || user.value.role || null;
    })

    const login = async (credentials) => {
        try {
            const response = await api.post('/login', credentials)
            console.log('Full response: ', response)
            console.log('Response data: ', response.data)
            console.log('User data: ', response.data.user)
            console.log('Role value: ', response.data.user?.role)

            if (response.data.token) {
                token.value = response.data.token
                user.value = response.data.user

                localStorage.setItem('token', response.data.token)
                localStorage.setItem('user', JSON.stringify(response.data.user))
                console.log('Login successful. User role: ', user.value.role)

                await router.push('/homePage')
                return true
            }
        } catch (err) {
            console.error('Login failed:', err)
            throw err
        }
    }

    const getUserRole = computed(() => {
        if (!user.value) return null;

        if (user.value.role?.name) return user.value.role.name;
        if (typeof user.value.role === 'string') return user.value.role;
        if (user.value.role_id) {
            const roleMap = { 1: 'Admin', 2: 'Customer', 3: 'Provider' };
            return roleMap[user.value.role_id];
        }
        return null;
    })

    const logout = async () => {
        try {
            await api.post('/logout')
        } catch (err) {
            console.error(err);
        } finally {
            token.value = null
            user.value = null
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
        }
    }

    return { token, user, isLoggedIn, userRole, login, logout }
})