<script setup>
import { ref } from 'vue'

const features = ref([
  { 
    title: 'Expense Tracking', 
    description: 'Log and categorize every expense to see where your money goes', 
    icon: 'mdi mdi-chart-line',
    image: '/expense-tracking.jpg' 
  },
  { 
    title: 'Bill Management', 
    description: 'Never miss a payment with due date reminders and status tracking', 
    icon: 'mdi mdi-currency-usd',
    image: '/bills.jpg' 
  },
  { 
    title: 'Shopping Lists', 
    description: 'Create and manage shopping lists with estimated costs', 
    icon: 'mdi mdi-cart',
    image: '/shopping.jpg' 
  },
  { 
    title: 'Smart Reports', 
    description: 'Generate detailed reports to analyze spending patterns', 
    icon: 'mdi mdi-chart-areaspline',
    image: '/smart-reports.jpg' 
  },
  { 
    title: 'Payment History', 
    description: 'Keep track of all payments made across bills and expenses', 
    icon: 'mdi mdi-credit-card',
    image: '/payment.jpg' 
  },
  { 
    title: 'Multi-User Support', 
    description: 'Add family members and manage household finances together', 
    icon: 'mdi mdi-account-multiple',
    image: '/multi-user.jpg' 
  }
])

const previewCards = ref([
  {
    title: 'Expense Analytics',
    description: 'Visual charts of your spending',
    image: '/analytics.jpg'
  },
  {
    title: 'Bill Reminders',
    description: 'Never miss a due date',
    image: '/reminders.jpg'
  },
  {
    title: 'Smart Shopping',
    description: 'Organized shopping lists',
    image: '/smart-shopping.jpg'
  }
])

const stats = ref([
  { number: '10+', label: 'Active Users' },
  { number: '$100+', label: 'Expenses Tracked' },
  { number: '99%', label: 'On-time Payments' },
  { number: '24/7', label: 'Support' }
])
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          Take Control of Your<br />
          <span class="blue-text">Home Finances</span>
        </h1>
        <p class="hero-subtitle">
          Track expenses, manage bills, create shopping lists, and generate insightful reports - all in one place.
        </p>
        <div class="hero-buttons">
          <router-link to="/register" class="btn-primary">Get Started Free</router-link>
          <router-link to="/login" class="btn-secondary">Login</router-link>
        </div>
      </div>
      <div class="hero-image">
        <div class="dashboard-preview">
          <div class="preview-card" v-for="(card, index) in previewCards" :key="index">
            <img :src="card.image" :alt="card.title" class="preview-image">
            <div class="preview-overlay">
              <h4>{{ card.title }}</h4>
              <p>{{ card.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">Everything You Need</h2>
        <p class="section-subtitle">Simple, powerful tools to manage your household finances</p>
        
        <div class="features-grid">
          <div class="feature-card" v-for="feature in features" :key="feature.title">
            <div class="feature-image-container">
              <img :src="feature.image" :alt="feature.title" class="feature-image">
              <div class="feature-icon-overlay">
                <i :class="feature.icon"></i>
              </div>
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item" v-for="stat in stats" :key="stat.label">
            <div class="stat-number">{{ stat.number }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of households managing their finances smarter</p>
        <router-link to="/register" class="btn-primary-large">Start Your Free Trial</router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: white;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 4rem 8%;
  min-height: 90vh;
}

.hero-title {
  font-size: 3.5rem;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  color: #1a1a1a;
}

.blue-text {
  color: #2563eb;
  position: relative;
  display: inline-block;
}

.blue-text::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
}

.btn-primary, .btn-secondary {
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-block;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: 2px solid #2563eb;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
}

.btn-secondary {
  background: transparent;
  color: #2563eb;
  border: 2px solid #2563eb;
}

.btn-secondary:hover {
  background: #eff6ff;
  transform: translateY(-2px);
}

.dashboard-preview {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.preview-card {
  position: relative;
  height: 100px;
  background: white;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.preview-card:hover {
  transform: translateY(-5px);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.preview-card:hover .preview-image {
  transform: scale(1.05);
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
  padding: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-card:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
}

.preview-overlay p {
  margin: 0;
  font-size: 0.75rem;
}

/* Features Section */
.features {
  padding: 5rem 8%;
  background: #f8fafc;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.section-subtitle {
  text-align: center;
  color: #6b7280;
  margin-bottom: 3rem;
  font-size: 1.1rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 30px rgba(0, 0, 0, 0.1);
}

.feature-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.feature-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-image {
  transform: scale(1.05);
}

.feature-icon-overlay {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #2563eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon-overlay {
  transform: scale(1.1);
  background: #2563eb;
  color: white;
}

.feature-card h3 {
  padding: 1.5rem 1.5rem 0.5rem;
  margin: 0;
  color: #1a1a1a;
}

.feature-card p {
  padding: 0 1.5rem 1.5rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.stats {
  padding: 4rem 8%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  text-align: center;
}

.stat-number {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1.1rem;
  opacity: 0.9;
}

.cta {
  padding: 5rem 8%;
  text-align: center;
}

.cta h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.cta p {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.btn-primary-large {
  background: #2563eb;
  color: white;
  padding: 1rem 2.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-primary-large:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 2rem 5%;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-buttons {
    justify-content: center;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-card {
    height: 80px;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-card, .preview-card {
  animation: fadeIn 0.6s ease-out forwards;
}

.feature-card:nth-child(1) { animation-delay: 0.1s; }
.feature-card:nth-child(2) { animation-delay: 0.2s; }
.feature-card:nth-child(3) { animation-delay: 0.3s; }
.feature-card:nth-child(4) { animation-delay: 0.4s; }
.feature-card:nth-child(5) { animation-delay: 0.5s; }
.feature-card:nth-child(6) { animation-delay: 0.6s; }
</style>