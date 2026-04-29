<script setup>
import { RouterView, useRoute } from 'vue-router';
import { computed, watch, onMounted, onUnmounted } from 'vue';
import Navbar from './components/Navbar.vue';

const route = useRoute();

const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
const isAuthPage = computed(() => {
  return authPages.includes(route.path);
});

// Handle body classes and styling
watch(isAuthPage, (isAuth) => {
  if (isAuth) {
    document.body.classList.add('auth-page');
    document.body.classList.remove('authenticated-page');
  } else {
    document.body.classList.remove('auth-page');
    document.body.classList.add('authenticated-page');
  }
}, { immediate: true });

// Clean up on component unmount
onUnmounted(() => {
  document.body.classList.remove('auth-page', 'authenticated-page');
});
</script>

<template>
  <v-app>
    <Navbar v-if="!isAuthPage" />
    <v-main class="main-content" :class="{ 'has-navbar': !isAuthPage }">
      <RouterView />
    </v-main>
  </v-app>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app, .v-application {
  min-height: 100vh;
}

/* Auth pages styling */
.auth-page {
  background: linear-gradient(135deg, #0a0f1a 0%, #0d1525 100%);
}

/* Authenticated pages styling */
.authenticated-page {
  background: #f8fafc;
}

/* Main content styles */
.main-content {
  transition: margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: calc(100vh - 70px);
}

.main-content.has-navbar {
  margin-top: 70px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .main-content.has-navbar {
    margin-top: 60px;
  }
  
  .main-content {
    min-height: calc(100vh - 60px);
  }
}

/* Ensure Vuetify components don't add extra padding */
.v-application--wrap {
  min-height: 100vh !important;
}
</style>