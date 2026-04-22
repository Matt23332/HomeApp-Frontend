<script setup>

import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const scrolled = ref(false);

const handleScroll = () => {
    scrolled.value = window.scrollY > 0;
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
    <v-app-bar :elevation="scrolled ? 4 : 0" app color="primary" dark>
        <v-toolbar-title>Nyumba Yangu</v-toolbar-title>
        <v-spacer></v-spacer>
        <div v-if="auth.isLoggedIn">
            <v-btn to="/dashboard">Dashboard</v-btn>
            <v-btn to="/profile">Profile</v-btn>
            <v-btn to="/bills">Bills</v-btn>
            <v-btn to="/expenses">Expenses</v-btn>
            <v-btn to="/payments">Payments</v-btn>
            <v-btn to="/shopping-items">Shopping Items</v-btn>
            <v-btn to="/reports">Reports</v-btn>
            <v-btn @click="auth.logout">Logout</v-btn>
        </div>
        <div v-else>
            <v-btn to="/login">Login</v-btn>
            <v-btn to="/register">Register</v-btn>
        </div>
    </v-app-bar>
</template>