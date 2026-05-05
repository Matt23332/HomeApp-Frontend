import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import api from '../services/api';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('access_token') ?? null);
    const user = ref(JSON.parse(localStorage.getItem('user')) ?? null);

    const isLoggedIn = computed(() => !!token.value);

    const userRole = computed(() => {
        if (!user.value) return null;
        if (user.value.role?.name) return user.value.role.name;
        if (typeof user.value.role === 'string') return user.value.role;
        if (user.value.role_id) {
            const roleMap = { 1: 'Admin', 2: 'User' };
            return roleMap[user.value.role_id];
        }
        return null;
    });

    // Called from login component after successful API response
    const setToken = (newToken) => {
        token.value = newToken;
        localStorage.setItem('access_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const setUser = (newUser) => {
        user.value = newUser;
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (err) {
            console.error(err);
        } finally {
            token.value = null;
            user.value = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
            router.push('/login');
        }
    };

    return { token, user, isLoggedIn, userRole, setToken, setUser, logout };
});