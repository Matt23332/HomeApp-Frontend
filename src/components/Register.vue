<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

const router = useRouter();

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: ''
});

const errors = ref({});
const serverError = ref('');
const loading = ref(false);
const agreed = ref(false);
const showPassword = ref(false);
const showConfirm = ref(false);
const currentStep = ref(1);

const steps = ['Personal Info', 'Security'];
const roles = ['User', 'Admin'];

const passwordsMatch = computed(() => {
  return form.value.password && form.value.password_confirmation && 
         form.value.password === form.value.password_confirmation;
});

const passwordStrength = computed(() => {
  const pwd = form.value.password;
  if (!pwd) return 0;
  
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  
  return score;
});

const strengthLabel = computed(() => {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[passwordStrength.value];
});

const getStrengthColor = () => {
  const colors = ['#ff4444', '#ff8844', '#ffcc00', '#44cc44', '#00aa00'];
  return colors[passwordStrength.value];
};

const nextStep = () => {
  if (validateStep1()) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const validateStep1 = () => {
  const stepErrors = {};
  
  if (!form.value.name) {
    stepErrors.name = ['Name is required'];
  } else if (form.value.name.length < 2) {
    stepErrors.name = ['Name must be at least 2 characters'];
  }
  
  if (!form.value.email) {
    stepErrors.email = ['Email is required'];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    stepErrors.email = ['Please enter a valid email address'];
  }
  
  if (!form.value.role) {
    stepErrors.role = ['Please select a role'];
  }
  
  errors.value = stepErrors;
  return Object.keys(stepErrors).length === 0;
};

const handleSubmit = async () => {
  if (!passwordsMatch.value) {
    errors.value.password_confirmation = ['Passwords do not match'];
    return;
  }
  
  loading.value = true;
  errors.value = {};
  serverError.value = '';

  try {
    const response = await api.post('/register', {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      password_confirmation: form.value.password_confirmation,
      role: form.value.role
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirect based on role
    if (user.role === 'Admin') {
      router.push('/admin');
    } else {
      router.push('/login');
    }
  } catch (err) {
    console.error('Registration error:', err);
    
    if (err.response?.status === 422) {
      errors.value = err.response.data.errors || {};
    } else if (err.response?.status === 409) {
      serverError.value = 'Email already exists. Please use a different email or login.';
    } else {
      serverError.value = err.response?.data?.message || 'Registration failed. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-page">
    <!-- Left Panel -->
    <div class="left-panel">
      <div class="left-content">
        <div class="brand">
          <span class="brand-icon">🏠</span>
          <span class="brand-name">Nyumba<em>Yangu</em></span>
        </div>
        
        <h1 class="panel-title">
          CONTROL<br>YOUR<br><em>HOUSEHOLD.</em>
        </h1>
        
        <p class="panel-subtitle">
          Manage your home efficiently and effectively. 
          Register now and begin your journey to better household management.
        </p>

        <div class="panel-stats">
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">Happy Homes</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">2K+</span>
            <span class="stat-label">Active Users</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">98%</span>
            <span class="stat-label">Satisfaction</span>
          </div>
        </div>
      </div>

      <div class="deco-lines">
        <div v-for="n in 6" :key="n" class="deco-line" :style="{ animationDelay: `${n * 0.15}s` }"></div>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="right-panel">
      <div class="form-card">
        <div class="form-header">
          <div class="form-eyebrow">GET STARTED</div>
          <h2 class="form-title">CREATE YOUR<br><em>ACCOUNT</em></h2>
          <div class="form-bar"></div>
        </div>

        <!-- Step Indicator -->
        <div class="step-indicator">
          <div 
            v-for="(label, index) in steps" 
            :key="index" 
            class="step"
            :class="{
              'step-active': currentStep === index + 1,
              'step-completed': currentStep > index + 1
            }"
          >
            <div class="step-circle">
              <span v-if="currentStep > index + 1">✓</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ label }}</span>
            <div v-if="index < steps.length - 1" class="step-line"></div>
          </div>
        </div>

        <!-- Error Messages -->
        <div v-if="serverError" class="alert alert-error">
          <i class="alert-icon">⚠️</i>
          {{ serverError }}
        </div>

        <form @submit.prevent="handleSubmit">
          <!-- Step 1: Personal Information -->
          <div v-show="currentStep === 1" class="form-step">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <div class="input-wrapper">
                <i class="input-icon">👤</i>
                <input 
                  v-model="form.name" 
                  type="text" 
                  class="form-input"
                  :class="{ 'is-invalid': errors.name }"
                  placeholder="John Doe"
                  autocomplete="name"
                />
              </div>
              <span v-if="errors.name" class="error-message">{{ errors.name[0] }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <div class="input-wrapper">
                <i class="input-icon">📧</i>
                <input 
                  v-model="form.email" 
                  type="email" 
                  class="form-input"
                  :class="{ 'is-invalid': errors.email }"
                  placeholder="john@example.com"
                  autocomplete="email"
                />
              </div>
              <span v-if="errors.email" class="error-message">{{ errors.email[0] }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Role</label>
              <div class="input-wrapper">
                <i class="input-icon">👥</i>
                <select v-model="form.role" class="form-input" :class="{ 'is-invalid': errors.role }">
                  <option value="" disabled>Select your role</option>
                  <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
                </select>
                <i class="select-arrow">▼</i>
              </div>
              <span v-if="errors.role" class="error-message">{{ errors.role[0] }}</span>
            </div>

            <button type="button" class="btn btn-primary btn-next" @click="nextStep">
              Continue
              <span class="btn-arrow">→</span>
            </button>
          </div>

          <!-- Step 2: Security -->
          <div v-show="currentStep === 2" class="form-step">
            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-wrapper">
                <i class="input-icon">🔒</i>
                <input 
                  v-model="form.password" 
                  :type="showPassword ? 'text' : 'password'"
                  class="form-input"
                  :class="{ 'is-invalid': errors.password }"
                  placeholder="Create a strong password"
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
              
              <!-- Password Strength -->
              <div v-if="form.password" class="password-strength">
                <div class="strength-bars">
                  <div 
                    v-for="level in 4" 
                    :key="level"
                    class="strength-bar"
                    :class="{
                      'strength-weak': passwordStrength >= 1 && level === 1,
                      'strength-fair': passwordStrength >= 2 && level <= 2,
                      'strength-good': passwordStrength >= 3 && level <= 3,
                      'strength-strong': passwordStrength >= 4 && level <= 4
                    }"
                    :style="{ 
                      backgroundColor: passwordStrength >= level ? getStrengthColor() : 'rgba(255,255,255,0.1)'
                    }"
                  ></div>
                </div>
                <span class="strength-text" :style="{ color: getStrengthColor() }">
                  {{ strengthLabel }}
                </span>
              </div>
              <span v-if="errors.password" class="error-message">{{ errors.password[0] }}</span>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <div class="input-wrapper">
                <i class="input-icon">✓</i>
                <input 
                  v-model="form.password_confirmation" 
                  :type="showConfirm ? 'text' : 'password'"
                  class="form-input"
                  :class="{ 
                    'is-valid': form.password_confirmation && passwordsMatch,
                    'is-invalid': form.password_confirmation && !passwordsMatch
                  }"
                  placeholder="Confirm your password"
                />
                <button type="button" class="toggle-password" @click="showConfirm = !showConfirm">
                  {{ showConfirm ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
              
              <!-- Password Match Indicator -->
              <div v-if="form.password_confirmation" class="password-match" :class="{ 'match-success': passwordsMatch }">
                <span class="match-icon">{{ passwordsMatch ? '✓' : '⚠️' }}</span>
                <span>{{ passwordsMatch ? 'Passwords match' : 'Passwords do not match' }}</span>
              </div>
            </div>

            <label class="checkbox-label">
              <input type="checkbox" v-model="agreed" class="checkbox-input" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">
                I agree to the 
                <a href="#" class="link">Terms of Service</a> and 
                <a href="#" class="link">Privacy Policy</a>
              </span>
            </label>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="prevStep">
                ← Back
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="loading || !agreed || !passwordsMatch"
              >
                <span v-if="!loading">Create Account →</span>
                <div v-else class="spinner">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </button>
            </div>
          </div>
        </form>

        <div class="form-footer">
          Already have an account?
          <router-link to="/login" class="footer-link">Sign in instead</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.register-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0a0f1a;
  overflow: hidden;
}

/* Left Panel */
.left-panel {
  position: relative;
  background: linear-gradient(135deg, #0a0f1a 0%, #0d1525 100%);
  padding: 3rem;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.left-content {
  position: relative;
  z-index: 2;
  max-width: 480px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 3rem;
}

.brand-icon {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.brand-name {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.brand-name em {
  color: #3b82f6;
  font-style: italic;
  font-weight: 800;
}

.panel-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: #ffffff;
  margin-bottom: 1.5rem;
}

.panel-title em {
  color: #3b82f6;
  font-style: italic;
}

.panel-subtitle {
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin-bottom: 2.5rem;
  font-size: 1rem;
}

.panel-stats {
  display: flex;
  gap: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-divider {
  width: 1px;
  background: rgba(255,255,255,0.1);
}

/* Decorative Lines */
.deco-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco-line {
  position: absolute;
  bottom: -20%;
  width: 1px;
  background: linear-gradient(to top, rgba(59,130,246,0.3), transparent);
  animation: riseLine 3s ease-in-out infinite alternate;
}

.deco-line:nth-child(1) { left: 10%; height: 30%; animation-delay: 0s; }
.deco-line:nth-child(2) { left: 25%; height: 50%; animation-delay: 0.3s; }
.deco-line:nth-child(3) { left: 40%; height: 40%; animation-delay: 0.6s; }
.deco-line:nth-child(4) { left: 60%; height: 60%; animation-delay: 0.9s; }
.deco-line:nth-child(5) { left: 75%; height: 35%; animation-delay: 1.2s; }
.deco-line:nth-child(6) { left: 90%; height: 45%; animation-delay: 1.5s; }

@keyframes riseLine {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-60px);
    opacity: 0;
  }
}

/* Right Panel */
.right-panel {
  background: #0f1420;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow-y: auto;
}

.form-card {
  width: 100%;
  max-width: 500px;
  background: rgba(255,255,255,0.02);
  border-radius: 1rem;
  padding: 2rem;
}

.form-header {
  margin-bottom: 2rem;
}

.form-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 3px;
  color: #3b82f6;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.form-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  margin-bottom: 1rem;
}

.form-title em {
  color: #3b82f6;
  font-style: italic;
}

.form-bar {
  width: 50px;
  height: 3px;
  background: #3b82f6;
  border-radius: 2px;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex: 1;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  transition: all 0.3s ease;
}

.step-active .step-circle {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.step-completed .step-circle {
  background: rgba(59,130,246,0.2);
  border-color: #3b82f6;
  color: #3b82f6;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-active .step-label {
  color: #ffffff;
}

.step-line {
  position: absolute;
  left: calc(100% + 0.5rem);
  width: calc(100% - 1rem);
  height: 1px;
  background: rgba(255,255,255,0.1);
}

/* Form Elements */
.form-step {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.1rem;
  opacity: 0.5;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 2.5rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(59,130,246,0.05);
}

.form-input.is-invalid {
  border-color: #ef4444;
}

.form-input.is-valid {
  border-color: #10b981;
}

select.form-input {
  cursor: pointer;
  appearance: none;
  padding-right: 2.5rem;
}

.select-arrow {
  position: absolute;
  right: 1rem;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.3);
  pointer-events: none;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.toggle-password:hover {
  opacity: 1;
}

/* Password Strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.strength-bars {
  display: flex;
  gap: 4px;
  flex: 1;
}

.strength-bar {
  height: 3px;
  flex: 1;
  border-radius: 2px;
  transition: background-color 0.3s ease;
}

.strength-text {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.password-match {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.password-match.match-success {
  color: #10b981;
}

.match-icon {
  font-size: 0.875rem;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  margin: 0.5rem 0;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s;
}

.checkbox-input:checked + .checkbox-custom {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 11px;
}

.checkbox-text {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
  line-height: 1.4;
}

.link {
  color: #3b82f6;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

/* Buttons */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
}

.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.btn-next {
  width: 100%;
  margin-top: 1rem;
}

.btn-arrow {
  transition: transform 0.2s;
}

.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

/* Spinner */
.spinner {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: bounce 0.6s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.1s;
}

.dot:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Alert */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.alert-error {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
}

.error-message {
  font-size: 0.7rem;
  color: #ef4444;
}

/* Footer */
.form-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
}

.footer-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.footer-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 968px) {
  .register-page {
    grid-template-columns: 1fr;
  }
  
  .left-panel {
    display: none;
  }
  
  .right-panel {
    padding: 1rem;
  }
  
  .form-card {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  .form-title {
    font-size: 1.5rem;
  }
  
  .step-label {
    display: none;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>