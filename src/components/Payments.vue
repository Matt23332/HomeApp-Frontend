<template>
  <div class="payments-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Payment History</h1>
        <p class="subtitle">A record of all M-Pesa transactions made through NyumbaYangu</p>
      </div>
      <button @click="fetchPayments" class="btn btn-secondary" :disabled="loading">
        <span class="refresh-icon" :class="{ spinning: loading }">↻</span>
        Refresh
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon">🧾</div>
        <div class="summary-info">
          <div class="summary-label">Total Transactions</div>
          <div class="summary-value">{{ payments.length }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-label">Total Paid</div>
          <div class="summary-value">KSH {{ totalPaid }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📅</div>
        <div class="summary-info">
          <div class="summary-label">This Month</div>
          <div class="summary-value">KSH {{ thisMonthTotal }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">✅</div>
        <div class="summary-info">
          <div class="summary-label">Successful</div>
          <div class="summary-value" style="color: #10b981;">{{ successCount }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">❌</div>
        <div class="summary-info">
          <div class="summary-label">Failed</div>
          <div class="summary-value" style="color: #ef4444;">{{ failedCount }}</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by bill name, receipt or phone..."
          class="search-input"
        />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="all">All Statuses</option>
        <option value="success">Successful</option>
        <option value="failed">Failed</option>
        <option value="pending">Pending</option>
      </select>
      <select v-model="periodFilter" class="filter-select">
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="year">This Year</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading payment history...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h3>Failed to load payments</h3>
      <p>{{ error }}</p>
      <button @click="fetchPayments" class="btn btn-primary">Try Again</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPayments.length === 0 && payments.length === 0" class="empty-state">
      <div class="empty-icon">🧾</div>
      <h3>No payments yet</h3>
      <p>Your M-Pesa payment history will appear here once you make a payment via Bills.</p>
    </div>

    <div v-else-if="filteredPayments.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No results found</h3>
      <p>Try adjusting your search or filters.</p>
      <button @click="clearFilters" class="btn btn-secondary">Clear Filters</button>
    </div>

    <!-- Payments Table -->
    <div v-else class="table-wrapper">
      <div class="table-meta">
        <span class="results-count">{{ filteredPayments.length }} transaction{{ filteredPayments.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="table-scroll">
        <table class="payments-table">
          <thead>
            <tr>
              <th @click="sortBy('created_at')" class="sortable">
                Date <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
              </th>
              <th @click="sortBy('bill_name')" class="sortable">
                Bill / Description <span class="sort-icon">{{ getSortIcon('bill_name') }}</span>
              </th>
              <th @click="sortBy('amount')" class="sortable">
                Amount <span class="sort-icon">{{ getSortIcon('amount') }}</span>
              </th>
              <th>Phone</th>
              <th>M-Pesa Receipt</th>
              <th @click="sortBy('status')" class="sortable">
                Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="payment in filteredPayments"
              :key="payment.id"
              class="payment-row"
              @click="openDetail(payment)"
            >
              <td class="date-cell">
                <div class="date-primary">{{ formatDate(payment.created_at || payment.paid_at) }}</div>
                <div class="date-time">{{ formatTime(payment.created_at || payment.paid_at) }}</div>
              </td>
              <td class="bill-cell">
                <div class="bill-icon-name">
                  <span class="bill-icon">{{ getPaymentIcon(payment) }}</span>
                  <span class="bill-name">{{ payment.bill_name || payment.description || payment.account_reference || 'N/A' }}</span>
                </div>
              </td>
              <td class="amount-cell">
                KSH {{ formatAmount(payment.amount) }}
              </td>
              <td class="phone-cell">
                {{ maskPhone(payment.phone_number || payment.phone) }}
              </td>
              <td class="receipt-cell">
                <span v-if="payment.mpesa_receipt_number || payment.receipt_number" class="receipt-badge">
                  {{ payment.mpesa_receipt_number || payment.receipt_number }}
                </span>
                <span v-else class="receipt-na">—</span>
              </td>
              <td class="status-cell">
                <span class="status-badge" :class="getStatusClass(payment.status)">
                  {{ getStatusLabel(payment.status) }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <button @click="openDetail(payment)" class="icon-btn view" title="View Details">
                  👁 View Payment
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedPayment" class="modal" @click.self="closeDetail">
      <div class="modal-content">
        <div class="modal-header" :class="getStatusClass(selectedPayment.status)">
          <div class="modal-title-row">
            <span class="modal-icon">{{ getPaymentIcon(selectedPayment) }}</span>
            <h2>Payment Details</h2>
          </div>
          <button class="close-btn" @click="closeDetail">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-status-banner" :class="getStatusClass(selectedPayment.status)">
            <span class="detail-status-icon">{{ getStatusIcon(selectedPayment.status) }}</span>
            <span class="detail-status-text">{{ getStatusLabel(selectedPayment.status) }}</span>
          </div>

          <div class="detail-amount">
            KSH {{ formatAmount(selectedPayment.amount) }}
          </div>

          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-label">Bill / Description</span>
              <span class="detail-value">{{ selectedPayment.bill_name || selectedPayment.description || selectedPayment.account_reference || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date & Time</span>
              <span class="detail-value">{{ formatDate(selectedPayment.created_at || selectedPayment.paid_at) }} at {{ formatTime(selectedPayment.created_at || selectedPayment.paid_at) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone Number</span>
              <span class="detail-value">{{ maskPhone(selectedPayment.phone_number || selectedPayment.phone) }}</span>
            </div>
            <div class="detail-row" v-if="selectedPayment.mpesa_receipt_number || selectedPayment.receipt_number">
              <span class="detail-label">M-Pesa Receipt</span>
              <span class="detail-value receipt-value">{{ selectedPayment.mpesa_receipt_number || selectedPayment.receipt_number }}</span>
            </div>
            <div class="detail-row" v-if="selectedPayment.checkout_request_id">
              <span class="detail-label">Checkout Request ID</span>
              <span class="detail-value mono">{{ selectedPayment.checkout_request_id }}</span>
            </div>
            <div class="detail-row" v-if="selectedPayment.transaction_desc">
              <span class="detail-label">Transaction Description</span>
              <span class="detail-value">{{ selectedPayment.transaction_desc }}</span>
            </div>
            <div class="detail-row" v-if="selectedPayment.failure_reason">
              <span class="detail-label">Failure Reason</span>
              <span class="detail-value error-text">{{ selectedPayment.failure_reason }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDetail" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';

const payments = ref([]);
const loading = ref(false);
const error = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');
const periodFilter = ref('all');
const sortKey = ref('created_at');
const sortDir = ref('desc');
const selectedPayment = ref(null);
// --- Helpers ---

const isSuccess = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'success' || s === 'completed' || s === 'paid';
};

const isFailed = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'failed' || s === 'cancelled' || s === 'rejected';
};

const getStatusClass = (status) => {
  if (isSuccess(status)) return 'status-success';
  if (isFailed(status)) return 'status-failed';
  return 'status-pending';
};

const getStatusLabel = (status) => {
  if (isSuccess(status)) return 'Successful';
  if (isFailed(status)) return 'Failed';
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'Pending';
  return status || 'Unknown';
};

const getStatusIcon = (status) => {
  if (isSuccess(status)) return '✅';
  if (isFailed(status)) return '❌';
  return '⏳';
};

const getPaymentIcon = (payment) => {
  const name = (payment.bill_name || payment.description || payment.account_reference || '').toLowerCase();
  const icons = {
    electricity: '⚡', water: '💧', internet: '🌐', netflix: '📺',
    spotify: '🎵', rent: '🏠', mortgage: '🏡', insurance: '🛡️',
    phone: '📱', gas: '⛽', groceries: '🛒', subscription: '📅',
  };
  for (const [key, icon] of Object.entries(icons)) {
    if (name.includes(key)) return icon;
  }
  return '💳';
};

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  return parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const maskPhone = (phone) => {
  if (!phone) return '—';
  const p = String(phone);
  if (p.length <= 4) return p;
  return p.slice(0, -4).replace(/\d/g, '*') + p.slice(-4);
};

// --- Computed ---

const totalPaid = computed(() => {
  const total = payments.value
    .filter(p => isSuccess(p.status))
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  return total.toFixed(2);
});

const thisMonthTotal = computed(() => {
  const now = new Date();
  const total = payments.value
    .filter(p => {
      if (!isSuccess(p.status)) return false;
      const d = new Date(p.created_at || p.paid_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  return total.toFixed(2);
});

const successCount = computed(() => payments.value.filter(p => isSuccess(p.status)).length);
const failedCount = computed(() => payments.value.filter(p => isFailed(p.status)).length);

const filteredPayments = computed(() => {
  let result = [...payments.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(p =>
      (p.bill_name || p.description || p.account_reference || '').toLowerCase().includes(q) ||
      (p.mpesa_receipt_number || p.receipt_number || '').toLowerCase().includes(q) ||
      (p.phone_number || p.phone || '').includes(q)
    );
  }

  if (statusFilter.value !== 'all') {
    result = result.filter(p => {
      const s = (p.status || '').toLowerCase();
      if (statusFilter.value === 'success') return isSuccess(p.status);
      if (statusFilter.value === 'failed') return isFailed(p.status);
      if (statusFilter.value === 'pending') return s === 'pending';
      return true;
    });
  }

  if (periodFilter.value !== 'all') {
    const now = new Date();
    result = result.filter(p => {
      const d = new Date(p.created_at || p.paid_at);
      if (periodFilter.value === 'today') return d.toDateString() === now.toDateString();
      if (periodFilter.value === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (periodFilter.value === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (periodFilter.value === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  result.sort((a, b) => {
    let valA = a[sortKey.value] ?? '';
    let valB = b[sortKey.value] ?? '';
    if (sortKey.value === 'amount') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    } else if (sortKey.value === 'created_at') {
      valA = new Date(valA);
      valB = new Date(valB);
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
});

// --- Actions ---

const fetchPayments = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get('/payments');
    const paymentsData = response.data?.data?.data ?? response.data?.data ?? response.data;
    payments.value = Array.isArray(paymentsData) ? paymentsData : [];
  } catch (err) {
    console.error('Error fetching payments:', err);
    error.value = err.response?.data?.message || 'Could not load payment history. Please try again.';
  } finally {
    loading.value = false;
  }
};

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'desc';
  }
};

const getSortIcon = (key) => {
  if (sortKey.value !== key) return '↕';
  return sortDir.value === 'asc' ? '↑' : '↓';
};

const clearFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'all';
  periodFilter.value = 'all';
};

const openDetail = (payment) => { selectedPayment.value = payment; };
const closeDetail = () => { selectedPayment.value = null; };

onMounted(fetchPayments);
</script>

<style scoped>
.payments-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--bg);
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.refresh-icon {
  color: var(--primary);
  display: inline-block;
  margin-right: 0.25rem;
  font-style: normal;
  transition: transform 0.6s linear;
}

.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 2.5rem;
}

.summary-info {
  flex: 1;
  min-width: 0;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  position: relative;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  opacity: 0.5;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface);
  color: var(--text);
  box-sizing: border-box;
  transition: all 0.2s;
}

.search-input::placeholder { color: var(--text-muted); }

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select {
  padding: 0.625rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary);
}

/* Table */
.table-wrapper {
  background: var(--surface);
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-meta {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.results-count {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.payments-table thead tr {
  background: var(--bg);
}

.payments-table th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
  user-select: none;
}

.payments-table th.sortable {
  cursor: pointer;
}

.payments-table th.sortable:hover {
  color: var(--primary);
}

.sort-icon {
  margin-left: 0.25rem;
  font-size: 0.875rem;
  opacity: 0.5;
}

.payment-row {
  cursor: pointer;
  transition: background 0.15s;
}

.payment-row:hover {
  background: var(--bg);
}

.payment-row td {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
  color: var(--text);
  font-size: 0.875rem;
}

.payment-row:last-child td {
  border-bottom: none;
}

/* Cell types */
.date-cell .date-primary {
  font-weight: 500;
  color: var(--text);
}

.date-cell .date-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.bill-cell .bill-icon-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bill-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.bill-name {
  font-weight: 500;
}

.amount-cell {
  font-weight: 700;
  color: #00a651;
  white-space: nowrap;
}

.phone-cell {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 0.8rem;
}

.receipt-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: #eff6ff;
  color: var(--primary);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.receipt-na {
  color: #d1d5db;
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-success {
  background: #ecfdf5;
  color: #10b981;
}

.status-failed {
  background: #fef2f2;
  color: #ef4444;
}

.status-pending {
  background: #fffbeb;
  color: #f59e0b;
}

.actions-cell {
  text-align: right;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: all 0.2s;
  opacity: 0.6;
}

.icon-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.icon-btn.view:hover {
  background: #eff6ff;
}

/* Loading / Empty */
.loading-state {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border);
  border-top-color: #00a651;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  background: var(--surface);
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
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
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.25s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header.status-success { background: #ecfdf5; }
.modal-header.status-failed  { background: #fef2f2; }
.modal-header.status-pending { background: #fffbeb; }

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s;
  line-height: 1;
}

.close-btn:hover { color: var(--text); }

.modal-body {
  padding: 1.5rem;
}

.detail-status-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

.detail-status-banner.status-success { background: #ecfdf5; }
.detail-status-banner.status-failed  { background: #fef2f2; }
.detail-status-banner.status-pending { background: #fffbeb; }

.detail-status-icon { font-size: 1.25rem; }

.detail-status-text {
  font-weight: 600;
  font-size: 0.875rem;
}

.detail-status-banner.status-success .detail-status-text { color: #10b981; }
.detail-status-banner.status-failed  .detail-status-text { color: #ef4444; }
.detail-status-banner.status-pending .detail-status-text { color: #f59e0b; }

.detail-amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin-bottom: 1.5rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  text-align: right;
  word-break: break-all;
}

.receipt-value {
  font-family: monospace;
  color: var(--primary);
  font-size: 0.875rem;
}

.mono {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.error-text {
  color: #ef4444;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
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
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f3f4f6;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.btn:disabled {
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
  background: var(--surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  animation: slideInRight 0.3s ease;
  min-width: 250px;
}

.toast.success { border-left: 4px solid #10b981; }
.toast.error   { border-left: 4px solid #ef4444; }

.toast-message {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .payments-container { padding: 1rem; }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar { flex-direction: column; }

  .filter-select { width: 100%; }

  .toast {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>
