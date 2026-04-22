<script setup>

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
    loading.value = true;
    errorMessage.value = '';

    try {
        const { data } = await api.post('/login', {
            email: email.value,
            password: password.value,
        });

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        router.push('/dashboard');
    } catch (err) {
        console.log(err.response?.data);
        if (err.response?.status === 401) {
            errorMessage.value =  'Invalid email or password.';
        } else if (err.response?.status === 403) {
            errorMessage.value = 'Please verify your email before logging in.';
        } else {
            errorMessage.value = err.response?.data?.message || 'Something went wrong.';
        }
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
        <v-col cols="12" md="6" lg="4">
            <v-card>
            <v-card-title class="text-h5">Login</v-card-title>
            <v-card-text>
                <v-form @submit.prevent="handleLogin">
                <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    required
                />
                <v-text-field
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    label="Password"
                    required
                    append-icon="mdi-eye"
                    @click:append="showPassword = !showPassword"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    :loading="loading"
                    block
                >
                    Login
                </v-btn>
                </v-form>
                <p class="mt-3 text-center">
                Don't have an account?
                <RouterLink to="/register">Register here</RouterLink>
                </p>
                <p v-if="errorMessage" class="mt-2 text-center text-error">{{ errorMessage }}</p>
            </v-card-text>
            </v-card>
        </v-col>
        </v-row>
    </v-container>
</template>