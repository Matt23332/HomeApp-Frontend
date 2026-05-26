<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import api from '../services/api';

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const startDate = ref(firstOfMonth);
const endDate = ref(today);
const loading = ref(false);
const exporting = ref(false);
const reportData = ref(null);
const expenses = ref([]);
const searchQuery = ref('');
const toast = ref({ show: false, message: '', type: 'success' });

const barChartCanvas = ref(null);
const doughnutChartCanvas = ref(null);
let barChart = null;
let doughnutChart = null;

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const totalSpent = computed(() => {
  if (!reportData.value?.categoryBreakdown?.length) return 0;
  return reportData.value.categoryBreakdown.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);
});

const topCategory = computed(() => {
  if (!reportData.value?.categoryBreakdown?.length) return '—';
  return [...reportData.value.categoryBreakdown].sort((a, b) => parseFloat(b.total) - parseFloat(a.total))[0].category;
});

const filteredExpenses = computed(() => {
  let list = expenses.value;
  if (startDate.value) list = list.filter(e => (e.expense_date || e.date || '') >= startDate.value);
  if (endDate.value) list = list.filter(e => (e.expense_date || e.date || '') <= endDate.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(e =>
      (e.title || e.name || e.description || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => new Date(b.expense_date || b.date) - new Date(a.expense_date || a.date));
});

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
};

const formatAmount = (amount) => parseFloat(amount || 0).toFixed(2);

const formatDate = (date) => {
  if (!date) return '—';
  const [y, m, d] = date.split('T')[0].split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const destroyCharts = () => {
  if (barChart) { barChart.destroy(); barChart = null; }
  if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
};

const renderCharts = () => {
  destroyCharts();
  const breakdown = reportData.value?.categoryBreakdown;
  if (!breakdown?.length) return;

  const labels = breakdown.map(c => c.category);
  const data = breakdown.map(c => parseFloat(c.total));
  const colors = breakdown.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

  if (barChartCanvas.value) {
    barChart = new Chart(barChartCanvas.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Amount (KSH)',
          data,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => `KSH ${Number(v).toLocaleString()}` },
            grid: { color: '#f3f4f6' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  if (doughnutChartCanvas.value) {
    doughnutChart = new Chart(doughnutChartCanvas.value.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          borderRadius: 6,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 12 }, padding: 12, usePointStyle: true, pointStyle: 'circle' },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: KSH ${Number(ctx.raw).toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
        cutout: '60%',
      },
    });
  }
};

const generateReport = async () => {
  if (!startDate.value || !endDate.value) {
    showToast('Please select both start and end dates', 'error');
    return;
  }
  if (startDate.value > endDate.value) {
    showToast('Start date must be before end date', 'error');
    return;
  }
  loading.value = true;
  try {
    const [reportRes, expenseRes] = await Promise.all([
      api.get('/reports/expenses', { params: { start_date: startDate.value, end_date: endDate.value } }),
      api.get('/expenses'),
    ]);
    reportData.value = reportRes.data.data || reportRes.data;
    expenses.value = expenseRes.data.data || expenseRes.data || [];
    await nextTick();
    renderCharts();
  } catch {
    showToast('Failed to generate report', 'error');
  } finally {
    loading.value = false;
  }
};

const exportCSV = async () => {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const response = await api.get('/reports/summary', {
      params: { start_date: startDate.value, end_date: endDate.value },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${startDate.value}_to_${endDate.value}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast('Report exported successfully');
  } catch {
    showToast('Failed to export report', 'error');
  } finally {
    exporting.value = false;
  }
};

onBeforeUnmount(destroyCharts);
</script>

<template>
  <div class="reports-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Reports</h1>
        <p class="subtitle">Analyse your spending by category and time period</p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-card">
      <div class="filter-row">
        <div class="date-group">
          <label class="filter-label">From</label>
          <input type="date" v-model="startDate" class="date-input" :max="endDate" />
        </div>
        <div class="date-group">
          <label class="filter-label">To</label>
          <input type="date" v-model="endDate" class="date-input" :min="startDate" :max="today" />
        </div>
        <div class="filter-actions">
          <button @click="generateReport" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Generating...' : 'Generate Report' }}
          </button>
          <button
            @click="exportCSV"
            class="btn btn-secondary"
            :disabled="exporting || !reportData"
            title="Export as CSV"
          >
            {{ exporting ? 'Exporting...' : '⬇ Export CSV' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Generating report...</p>
    </div>

    <!-- Initial empty state -->
    <div v-else-if="!reportData" class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No report generated yet</h3>
      <p>Select a date range and click <strong>Generate Report</strong> to get started.</p>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-icon">💸</div>
          <div class="summary-info">
            <div class="summary-label">Total Spent</div>
            <div class="summary-value">KSH {{ Number(totalSpent).toLocaleString('en-KE', { minimumFractionDigits: 2 }) }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">🏆</div>
          <div class="summary-info">
            <div class="summary-label">Top Category</div>
            <div class="summary-value">{{ topCategory }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">🧾</div>
          <div class="summary-info">
            <div class="summary-label">Transactions</div>
            <div class="summary-value">{{ filteredExpenses.length }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">📅</div>
          <div class="summary-info">
            <div class="summary-label">Period</div>
            <div class="summary-value period-value">{{ formatDate(startDate) }} – {{ formatDate(endDate) }}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">Spending by Category</h3>
          <div class="chart-wrap">
            <canvas ref="barChartCanvas"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">Category Breakdown</h3>
          <div class="chart-wrap">
            <canvas ref="doughnutChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Category Table -->
      <div class="table-card">
        <div class="card-header">
          <h3>By Category</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th class="text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in [...(reportData.categoryBreakdown || [])].sort((a,b) => b.total - a.total)" :key="item.category">
              <td>
                <span class="category-dot" :style="{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }"></span>
                {{ item.category }}
              </td>
              <td class="text-right">KSH {{ Number(formatAmount(item.total)).toLocaleString() }}</td>
              <td class="text-right">
                {{ totalSpent > 0 ? ((parseFloat(item.total) / totalSpent) * 100).toFixed(1) : 0 }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Transactions Table -->
      <div class="table-card">
        <div class="card-header">
          <h3>Transactions</h3>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="searchQuery" type="text" placeholder="Search transactions..." class="search-input" />
          </div>
        </div>
        <div v-if="!filteredExpenses.length" class="table-empty">
          <p>No transactions found for this period.</p>
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="expense in filteredExpenses" :key="expense.id">
              <td class="date-cell">{{ formatDate(expense.expense_date || expense.date) }}</td>
              <td>{{ expense.title || expense.name || expense.description || '—' }}</td>
              <td><span class="category-badge">{{ expense.category || 'Other' }}</span></td>
              <td class="text-right amount-cell">KSH {{ formatAmount(expense.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠️' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.reports-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8fafc;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Filter card */
.filter-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #1a1a1a;
  background: white;
  transition: border-color 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
  align-items: flex-end;
}

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.summary-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.summary-label {
  font-size: 0.7rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: #1a1a1a;
}

.period-value {
  font-size: 0.8rem;
  font-weight: 600;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.chart-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 1rem;
}

.chart-wrap {
  height: 280px;
  position: relative;
}

/* Tables */
.table-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.card-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover td {
  background: #f9fafb;
}

.text-right {
  text-align: right;
}

.date-cell {
  white-space: nowrap;
  color: #6b7280;
  font-size: 0.8rem;
}

.amount-cell {
  font-weight: 600;
  color: #1a1a1a;
}

.category-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.category-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 600;
  background: #eff6ff;
  color: #3b82f6;
}

.table-empty {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Search */
.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  opacity: 0.5;
  pointer-events: none;
}

.search-input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #1a1a1a;
  transition: border-color 0.2s;
  min-width: 220px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading / empty */
.loading-state,
.empty-state {
  text-align: center;
  padding: 5rem 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
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
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  animation: slideInRight 0.3s ease;
  min-width: 250px;
}

.toast.success { border-left: 4px solid #10b981; }
.toast.error   { border-left: 4px solid #ef4444; }

.toast-icon   { font-size: 1.2rem; }
.toast-message { font-size: 0.875rem; color: #1a1a1a; font-weight: 500; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .reports-container { padding: 1rem; }
  .charts-row { grid-template-columns: 1fr; }
  .filter-row { flex-direction: column; align-items: stretch; }
  .filter-actions { margin-left: 0; flex-direction: column; }
  .btn { width: 100%; text-align: center; }
  .search-input { min-width: unset; width: 100%; }
  .card-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
}
</style>
