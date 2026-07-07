<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import NotificationBell from '../components/NotificationBell.vue';
import ToastContainer from '../components/ToastContainer.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useRouter } from 'vue-router';
import api from '../services/api';
import Chart from 'chart.js/auto';

const { addToast, addNotification } = useNotifications();
const authStore = useAuthStore();
const router = useRouter();

const expenseChartRef = ref(null);
const loading = ref(true);
const submitting = ref(false);
const showExpenseModal = ref(false);
const showBillModal = ref(false);
const showBudgetModal = ref(false);
const chartPeriod = ref('monthly');
let expenseChart = null;

const summary = ref({
  total_balance: 0,
  monthly_expenses: 0,
  expense_change: 0,
  pending_bills: 0,
  overdue_bills: 0,
  savings_rate: 0,
});

const userData = ref({
  name: '',
  email: '',
  role: '',
});

const recentTransactions = ref([]);
const upcomingBills = ref([]);
const shoppingItems = ref([]);
const budgets = ref([]);
const expenseBreakdown = ref([]);

const newExpense = ref({
  title: '',
  amount: '',
  category: '',
  expense_date: new Date().toISOString().split('T')[0]
});

const currentDate = computed(() => {
  const date = new Date();
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
});

const currentMonthYear = computed(() => {
  const date = new Date();
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

const formatNumber = (value) => {
  if (!value && value !== 0) return '0.00';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

const getProgressColor = (percentage) => {
  if (percentage < 50) return '#10b981';
  if (percentage < 80) return '#f59e0b';
  return '#ef4444';
}

const getBudgetStatus = (percentage) => {
  if (percentage < 50) return 'good';
  if (percentage < 80) return 'warning';
  return 'danger';
}

const getBudgetStatusText = (percentage) => {
  if (percentage < 50) return 'On Track';
  if (percentage < 80) return 'Approaching Limit';
  return 'Over Budget';
}

const fetchDashboardData = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const response = await api.get('/dashboard');
    const data = response.data;

    summary.value = data.summary ?? summary.value;
    userData.value = data.user ?? userData.value;
    recentTransactions.value = (data.recent_transactions ?? []).filter(Boolean);
    upcomingBills.value = (data.upcoming_bills ?? []).filter(Boolean);
    shoppingItems.value = data.shopping_items ?? [];
    budgets.value = data.budgets ?? [];
    expenseBreakdown.value = data.expense_breakdown ?? [];

    setTimeout(() => {
      initExpenseChart();
    }, 100);
  } catch (error) {
    addToast({ type: 'error', title: 'Failed to fetch dashboard data', message: 'Please try again later.' });
  } finally {
    loading.value = false;
  }
}

const refreshData = () => {
  fetchDashboardData();
}

const togglePurchase = async (item) => {
  const newStatus = item.status === 'purchased' ? 'pending' : 'purchased';
  const oldStatus = item.status;
  item.status = newStatus;
  try {
    await api.put(`/shopping-items/${item.id}`, { status: newStatus });
  } catch (error) {
    item.status = oldStatus;
    addToast({ type: 'error', title: 'Failed to update purchase status', message: 'Please try again later.' });
  }
}

const addExpense = async () => {
  submitting.value = true;
  try {
    await api.post('/expenses', newExpense.value);
    addToast({ type: 'success', title: 'Expense added successfully!', message: `${newExpense.value.title} saved.` });
    showExpenseModal.value = false;
    newExpense.value = {
      title: '',
      amount: '',
      category: '',
      expense_date: new Date().toISOString().split('T')[0]
    };

    await fetchDashboardData();
  } catch (error) {
    addToast({ type: 'error', title: 'Failed to add expense', message: 'Please try again later.' });
  } finally {
    submitting.value = false;
  }
}

const generateReport = async () => {
  try {
    const response = await api.get('/reports/expenses', {
      params: {
        start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    addToast({ type: 'error', title: 'Failed to generate report', message: 'Please try again later.' });
  }
}

const exportData = async () => {
  try {
    const response = await api.get('/expenses', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'expenses.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    addToast({ type: 'error', title: 'Failed to export data', message: 'Please try again later.' });
  }
}

const initExpenseChart = () => {
  if (!expenseChartRef.value) return;
  const ctx = expenseChartRef.value.getContext('2d');
  if (!ctx) return;

  if (expenseChart) {
    expenseChart.destroy();
  }

  let chartLabels = [];
  let chartData = [];

  if (expenseBreakdown.value && expenseBreakdown.value.length > 0) {
    chartLabels = expenseBreakdown.value.map(item => item.category);
    chartData = expenseBreakdown.value.map(item => item.total);
  } else {
    chartLabels = ['No Data'];
    chartData = [1];
  }

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: ['var(--primary)', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff', '#e0e7ff', '#c7d2fe'],
        borderWidth: 0,
        borderRadius: 8,
        spacing: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: $${value.toLocaleString()} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

const updateChart = async () => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const response = await api.get('/dashboard', {
      params: {
        period: chartPeriod.value
      }
    });
    expenseBreakdown.value = response.data.expense_breakdown ?? [];
    initExpenseChart();
  } catch (error) {
    if (error.response?.status === 401) {
      const dashboardResponse = await api.get('/dashboard');
      expenseBreakdown.value = dashboardResponse.data.expense_breakdown ?? [];
      initExpenseChart();
    }
  }
}

const closeModals = () => {
  showExpenseModal.value = false;
  showBillModal.value = false;
  showBudgetModal.value = false;
}

watch(chartPeriod, () => {
  updateChart();
});

onMounted(async () => {
  if (authStore.user) {
    userData.value = authStore.user;
  }

  await fetchDashboardData();
  updateChart();
});

onUnmounted(() => {
  if (expenseChart) {
    expenseChart.destroy();
  }
});
</script>

<template>
  <div class="dashboard">
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading dashboard data...</p>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Welcome Section -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1 class="welcome-title">
            Welcome back, <span class="user-name">{{ userData.name?.split(' ')[0] || 'User' }}</span>!
          </h1>
          <p class="welcome-subtitle">
            Here's what's happening with your household finances today.
          </p>
        </div>
        <div class="date-display" @click="refreshData">
          <div class="date-icon">📅</div>
          <div class="date-info">
            <div class="date-day">{{ currentDate }}</div>
            <div class="date-month">{{ currentMonthYear }}</div>
          </div>
          <div class="refresh-icon" title="Refresh data">🔄</div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon total-icon">💰</span>
            <span class="stat-label">Total Balance</span>
          </div>
          <div class="stat-value">${{ formatNumber(summary.total_balance) }}</div>
          <div class="stat-change positive">
            <span>↑ {{ Math.abs(summary.expense_change) }}%</span>
            <span class="change-text">from last month</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon expense-icon">📉</span>
            <span class="stat-label">Monthly Expenses</span>
          </div>
          <div class="stat-value">${{ formatNumber(summary.monthly_expenses) }}</div>
          <div class="stat-change" :class="summary.expense_change > 0 ? 'negative' : 'positive'">
            <span>{{ summary.expense_change > 0 ? '↑' : '↓' }} {{ Math.abs(summary.expense_change) }}%</span>
            <span class="change-text">from last month</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bill-icon">📄</span>
            <span class="stat-label">Pending Bills</span>
          </div>
          <div class="stat-value">{{ summary.pending_bills }}</div>
          <div class="stat-change" :class="summary.overdue_bills > 0 ? 'warning' : 'positive'">
            <span>{{ summary.overdue_bills }} overdue</span>
            <span class="change-text">needs attention</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon saving-icon">💎</span>
            <span class="stat-label">Savings Rate</span>
          </div>
          <div class="stat-value">{{ summary.savings_rate }}%</div>
          <div class="stat-change positive">
            <span>↑ 5%</span>
            <span class="change-text">target</span>
          </div>
        </div>
      </div>

      <!-- Charts and Recent Activity Row -->
      <div class="dashboard-row">
        <!-- Expense Chart -->
        <div class="chart-card">
          <div class="card-header">
            <h3>Expense Breakdown</h3>
            <select v-model="chartPeriod" @change="updateChart" class="period-select">
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="yearly">This Year</option>
            </select>
          </div>
          <div class="chart-container">
            <canvas ref="expenseChartRef"></canvas>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="transactions-card">
          <div class="card-header">
            <h3>Recent Transactions</h3>
            <router-link to="/expenses" class="view-all-link">View All →</router-link>
          </div>
          <div class="transactions-list">
            <div v-for="transaction in recentTransactions" :key="transaction.id" class="transaction-item">
              <div class="transaction-icon" :style="{ backgroundColor: transaction.icon_bg }">
                {{ transaction.icon }}
              </div>
              <div class="transaction-details">
                <div class="transaction-title">{{ transaction.title }}</div>
                <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
              </div>
              <div class="transaction-amount" :class="transaction.type">
                {{ transaction.type === 'expense' ? '-' : '+' }}${{ formatNumber(transaction.amount) }}
              </div>
            </div>
            <div v-if="recentTransactions.length === 0" class="empty-state">
              <span>📭</span>
              <p>No transactions yet</p>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-row">
        <!-- Upcoming Bills -->
        <div class="bills-card">
          <div class="card-header">
            <h3>Upcoming Bills</h3>
            <router-link to="/bills" class="view-all-link">Manage Bills →</router-link>
          </div>
          <div class="bills-list">
            <div v-for="bill in upcomingBills" :key="bill.id" class="bill-item">
              <div class="bill-info">
                <div class="bill-name">{{ bill.title }}</div>
                <div class="bill-due">Due: {{ formatDate(bill.due_date) }}</div>
              </div>
              <div class="bill-amount">${{ formatNumber(bill.amount) }}</div>
              <div class="bill-status" :class="bill.status">
                {{ bill.status }}
              </div>
            </div>
            <div v-if="upcomingBills.length === 0" class="empty-state">
              <span>🎉</span>
              <p>No upcoming bills! Enjoy your financial freedom.</p>
            </div>
          </div>
        </div>

        <!-- Shopping List Preview -->
        <div class="shopping-card">
          <div class="card-header">
            <h3>Shopping List</h3>
            <router-link to="/shopping-items" class="view-all-link">View All →</router-link>
          </div>
          <div class="shopping-list">
            <div v-for="item in shoppingItems" :key="item.id" class="shopping-item">
              <input type="checkbox" :checked="item.status === 'purchased'" @change="togglePurchase(item)"
                class="shopping-checkbox" />
              <div class="shopping-info">
                <div class="shopping-name" :class="{ purchased: item.status === 'purchased' }">
                  {{ item.name }}
                </div>
                <div class="shopping-category">{{ item.category || 'Uncategorized' }}</div>
              </div>
              <div class="shopping-price">${{ formatNumber(item.price || 0) }}</div>
            </div>
            <div v-if="shoppingItems.length === 0" class="empty-state">
              <span>🛒</span>
              <p>Your shopping list is empty. Add items to get started!</p>
              <router-link to="/shopping-items" class="add-link">Add Items →</router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Progress Section -->
      <div class="budget-section">
        <div class="card-header">
          <h3>Budget Progress</h3>
          <button class="adjust-budget-btn" @click="showBudgetModal = true">Adjust Budgets</button>
        </div>
        <div class="budget-grid">
          <div v-for="budget in budgets" :key="budget.category" class="budget-item">
            <div class="budget-header">
              <span class="budget-category">{{ budget.category }}</span>
              <span class="budget-amount">${{ formatNumber(budget.spent) }} / ${{ formatNumber(budget.limit) }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill"
                :style="{ width: budget.percentage + '%', backgroundColor: getProgressColor(budget.percentage) }"></div>
            </div>
            <div class="budget-status" :class="getBudgetStatus(budget.percentage)">
              {{ getBudgetStatusText(budget.percentage) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="action-btn" @click="showExpenseModal = true">
          <span class="action-icon">➕</span>
          Add Expense
        </button>
        <button class="action-btn" @click="showBillModal = true">
          <span class="action-icon">📄</span>
          Pay Bill
        </button>
        <button class="action-btn" @click="generateReport">
          <span class="action-icon">📊</span>
          Generate Report
        </button>
        <button class="action-btn" @click="exportData">
          <span class="action-icon">📥</span>
          Export Data
        </button>
      </div>
    </div>

    <!-- Add Expense Modal -->
    <div v-if="showExpenseModal" class="modal" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add Expense</h2>
          <button class="close-btn" @click="showExpenseModal = false">×</button>
        </div>
        <form @submit.prevent="addExpense">
          <div class="form-group">
            <label>Category</label>
            <select v-model="newExpense.category" required>
              <option value="">Select Category</option>
              <option value="Groceries">Groceries</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Transportation">Transportation</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Shopping">Shopping</option>
              <option value="Dining">Dining</option>
              <option value="Rent">Rent</option>
            </select>
          </div>
          <div class="form-group">
            <label>Title</label>
            <input type="text" v-model="newExpense.title" placeholder="Enter title" required>
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input type="number" v-model="newExpense.amount" step="0.01" required>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" v-model="newExpense.expense_date" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showExpenseModal = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="submitting">Add Expense</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <ToastContainer />
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--bg);
  min-height: 100vh;
}

/* Welcome Section */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: var(--surface);
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.welcome-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.user-name {
  color: var(--primary);
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome-subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--bg);
  border-radius: 1rem;
}

.date-icon {
  font-size: 2rem;
}

.date-info {
  text-align: right;
}

.date-day {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.date-month {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), #60a5fa);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.stat-change {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  align-items: center;
}

.stat-change.positive {
  color: #10b981;
}

.stat-change.negative {
  color: #ef4444;
}

.stat-change.warning {
  color: #f59e0b;
}

/* Dashboard Rows */
.dashboard-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 1200px) {
  .dashboard-row {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.chart-card,
.transactions-card,
.bills-card,
.shopping-card {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.view-all-link {
  color: var(--primary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: var(--primary-hover);
}

.period-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--text);
  background: var(--surface);
  cursor: pointer;
}

.chart-container {
  height: 280px;
  position: relative;
}

/* Transactions List */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.transaction-item:hover {
  background: var(--surface-muted);
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.transaction-details {
  flex: 1;
}

.transaction-title {
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.transaction-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.transaction-amount {
  font-weight: 600;
  font-size: 0.875rem;
}

.transaction-amount.expense {
  color: #ef4444;
}

.transaction-amount.income {
  color: #10b981;
}

/* Bills List */
.bills-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--surface-muted);
}

.bill-info {
  flex: 1;
}

.bill-name {
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.bill-due {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.bill-amount {
  font-weight: 600;
  color: var(--text);
}

.bill-status {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.bill-status.pending {
  background: #fef3c7;
  color: #d97706;
}

.bill-status.overdue {
  background: #fee2e2;
  color: #dc2626;
}

.bill-status.paid {
  background: #d1fae5;
  color: #059669;
}

/* Shopping List */
.shopping-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shopping-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.shopping-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.shopping-info {
  flex: 1;
}

.shopping-name {
  font-weight: 500;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.shopping-name.purchased {
  text-decoration: line-through;
  color: var(--text-muted);
}

.shopping-category {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.shopping-price {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.empty-state span {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.add-link {
  color: var(--primary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Budget Section */
.budget-section {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.budget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.budget-item {
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--surface-muted);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.budget-category {
  font-weight: 500;
  color: var(--text);
}

.budget-amount {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.budget-status {
  font-size: 0.75rem;
  font-weight: 500;
}

.budget-status.good {
  color: #10b981;
}

.budget-status.warning {
  color: #f59e0b;
}

.budget-status.danger {
  color: #ef4444;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.action-btn {
  flex: 1;
  min-width: 150px;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.action-icon {
  font-size: 1.25rem;
}

.adjust-budget-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.adjust-budget-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--surface);
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text);
}

.modal form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-muted);
  border-color: #d1d5db;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Loading State */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.25rem;
  color: var(--primary);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.refresh-icon {
  margin-left: 1rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s, transform 0.2s;
}

.refresh-icon:hover {
  opacity: 1;
  transform: rotate(180deg);
}
</style>