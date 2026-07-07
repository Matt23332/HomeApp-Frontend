<script setup>
import { RouterView, useRoute } from 'vue-router';
import { computed, watch, onUnmounted } from 'vue';
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
/* ── Theme tokens ──────────────────────────────────────────────
   Light is the default (:root). Dark applies when <html data-theme="dark">.
   Components should reference these vars instead of hardcoding colors,
   so the whole app responds to the Settings theme toggle.            */
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-translucent: rgba(255, 255, 255, 0.98);
  --surface-muted: #f1f5f9;
  --text: #1a1a1a;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --border-soft: #f1f5f9;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

html[data-theme="dark"] {
  --bg: #0d1525;
  --surface: #131c2e;
  --surface-translucent: rgba(19, 28, 46, 0.98);
  --surface-muted: #1e293b;
  --text: #e5e7eb;
  --text-muted: #94a3b8;
  --border: #243044;
  --border-soft: #1e293b;
  --primary: #3b82f6;
  --primary-hover: #60a5fa;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* ── Bootstrap bridge ──────────────────────────────────────────
   Several pages use Bootstrap components (.card, .table, .form-control,
   .modal) whose colors come from bootstrap.min.css, not our scoped styles.
   Point Bootstrap's own CSS variables at our tokens so they follow the
   theme everywhere, without editing each page.                       */
.card {
  --bs-card-bg: var(--surface);
  --bs-card-color: var(--text);
  --bs-card-border-color: var(--border);
  --bs-card-cap-bg: var(--surface-muted);
  --bs-card-cap-color: var(--text);
}

.table {
  --bs-table-bg: var(--surface);
  --bs-table-color: var(--text);
  --bs-table-hover-bg: var(--surface-muted);
  --bs-table-hover-color: var(--text);
  --bs-table-striped-bg: var(--surface-muted);
  --bs-table-striped-color: var(--text);
  --bs-table-border-color: var(--border);
}

.modal-content {
  --bs-modal-bg: var(--surface);
  --bs-modal-color: var(--text);
  --bs-modal-border-color: var(--border);
  --bs-modal-header-border-color: var(--border);
  --bs-modal-footer-border-color: var(--border);
}

/* .form-control/.form-select read --bs-body-bg/color; set them directly so
   inputs are legible in dark mode. Scoped to authed pages to beat Bootstrap. */
.authenticated-page .form-control,
.authenticated-page .form-select {
  background-color: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.authenticated-page .form-control::placeholder {
  color: var(--text-muted);
}

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
  background: var(--bg);
  transition: background-color 0.3s ease;
}

/* Main content styles */
.main-content {
  transition: margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: calc(100vh - 70px);
}

.main-content.has-navbar {
  margin-top: 70px;
  background: var(--bg);
  min-height: 100vh;
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