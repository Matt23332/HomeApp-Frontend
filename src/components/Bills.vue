<template>
  <div class="bills-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>My Bills</h1>
        <p class="subtitle">Manage and track all your recurring bills</p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <span class="btn-icon">+</span>
        Add New Bill
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon">📊</div>
        <div class="summary-info">
          <div class="summary-label">Total Bills</div>
          <div class="summary-value">{{ bills.length }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-info">
          <div class="summary-label">Total Amount</div>
          <div class="summary-value">KSH{{ totalAmount }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">⚠️</div>
        <div class="summary-info">
          <div class="summary-label">Overdue</div>
          <div class="summary-value" style="color: #ef4444;">{{ overdueCount }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📅</div>
        <div class="summary-info">
          <div class="summary-label">Due This Week</div>
          <div class="summary-value" style="color: #f59e0b;">{{ dueThisWeekCount }}</div>
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
          placeholder="Search bills..."
          class="search-input"
        />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="all">All Bills</option>
        <option value="overdue">Overdue</option>
        <option value="due_today">Due Today</option>
        <option value="due_soon">Due Soon</option>
        <option value="upcoming">Upcoming</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading bills...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredBills.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <h3>No bills found</h3>
      <p v-if="searchQuery || statusFilter !== 'all'">Try adjusting your filters</p>
      <p v-else>Get started by creating your first bill</p>
      <button @click="openCreateModal" class="btn btn-primary" v-if="!searchQuery && statusFilter === 'all'">
        Create Bill
      </button>
      <button @click="clearFilters" class="btn btn-secondary" v-else>
        Clear Filters
      </button>
    </div>

    <!-- Bills Grid -->
    <div v-else class="bills-grid">
      <div v-for="bill in filteredBills" :key="bill.id" class="bill-card" :class="getStatusClass(bill.due_date)">
        <div class="bill-header">
          <div class="bill-title-section">
            <div class="bill-icon">{{ getBillIcon(bill) }}</div>
            <h3>{{ getBillName(bill) }}</h3>
          </div>
          <div class="bill-actions">
            <button @click="openEditModal(bill)" class="icon-btn edit" title="Edit">
              ✏️
            </button>
            <button @click="confirmDelete(bill)" class="icon-btn delete" title="Delete">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="bill-body">
          <div class="bill-amount">
            KSH{{ formatAmount(bill.amount) }}
          </div>
          <div class="bill-due">
            <span class="label">Due Date:</span>
            <span class="value">{{ formatDate(bill.due_date) }}</span>
          </div>
          <div class="bill-status" :class="getStatusClass(bill.due_date)">
            {{bill.status === 'paid' ? '✅ Paid' : getStatus(bill.due_date) }}
          </div>
          <div class="bill-progress" v-if="getDaysRemaining(bill.due_date) <= 7 && getDaysRemaining(bill.due_date) >= 0">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getProgressPercentage(bill.due_date) + '%' }"></div>
            </div>
            <div class="progress-text">{{ getDaysRemaining(bill.due_date) }} days remaining</div>
          </div>

          <!--Mpesa Button-->
          <button v-if="bill.status !== 'paid'" @click="openMpesaModal(bill)" class="btn btn-mpesa">
            <span class="mpesa-logo">M</span> Pay with M-Pesa
          </button>
          <div v-else class="paid-badge">✅ Paid with M-Pesa</div>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="pagination.currentPage < pagination.lastPage" class="load-more-wrap">
      <button @click="loadMore" class="btn btn-secondary" :disabled="loadingMore">
        {{ loadingMore ? 'Loading...' : `Load More (${bills.length} of ${pagination.total})` }}
      </button>
    </div>

    <!-- Bill Form Modal (Create/Edit) -->
    <div v-if="showFormModal" class="modal" @click.self="closeFormModal">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Bill' : 'Create New Bill' }}</h2>
          <button class="close-btn" @click="closeFormModal">&times;</button>
        </div>
        
        <form @submit.prevent="saveBill">
          <div class="form-group">
            <label for="title">Bill Name *</label>
            <input 
              type="text" 
              id="title" 
              v-model="form.name" 
              required
              placeholder="e.g., Internet Bill, Electricity Bill"
              :class="{ 'error': errors.name }"
            />
            <span v-if="errors.name" class="error-message">{{ getErrorMessage(errors.name) }}</span>
          </div>

          <div class="form-group">
            <label for="amount">Amount *</label>
            <div class="input-with-icon">
              <span class="input-currency">KSH</span>
              <input 
                type="number" 
                id="amount" 
                v-model="form.amount" 
                required
                step="0.01"
                placeholder="0.00"
                :class="{ 'error': errors.amount }"
              />
            </div>
            <span v-if="errors.amount" class="error-message">{{ getErrorMessage(errors.amount) }}</span>
          </div>

          <div class="form-group">
            <label for="due_date">Due Date *</label>
            <input 
              type="date" 
              id="due_date" 
              v-model="form.due_date" 
              required
              :min="todayDate"
              :class="{ 'error': errors.due_date }"
            />
            <span v-if="errors.due_date" class="error-message">{{ getErrorMessage(errors.due_date) }}</span>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" v-model="form.status">
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeFormModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : (isEditing ? 'Update Bill' : 'Create Bill') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- M-Pesa Payment Modal -->
     <div v-if="showMpesaModal" class="modal" @click.self="closeMpesaModal">
      <div class="modal-content mpesa-modal">
        <div class="modal-header mpesa-header">
          <div class="mpesa-title-row">
            <div class="mpesa-badge">M-Pesa</div>
            <h2>Pay Bill: {{ mpesaBill ? getBillName(mpesaBill) : '' }}</h2>
          </div>
          <button class="close-btn" @click="closeMpesaModal" :disabled="mpesaStatus === 'pending'">&times;</button>
        </div>

        <!--Step 1: Enter phone number-->
        <div v-if="mpesaStatus === 'idle'" class="mpesa-body">
          <div class="mpesa-bill-summary">
            <div class="mpesa-bill-name">{{ getBillName(mpesaBill) }}</div>
            <div class="mpesa-bill-amount">KSH {{ formatAmount(mpesaBill.amount) }}</div>
          </div>
          <div class="form-group">
            <label for="mpesa_phone">M-Pesa Phone Number</label>
            <div class="input-with-icon">
              <span class="input-currency">🇰🇪</span>
              <input type="tel" id="mpesa_phone" v-model="mpesaPhone" placeholder="e.g. 07********" :class="{ 'error': mpesaPhoneError }" maxlength="13" />
            </div>
            <span v-if="mpesaPhoneError" class="error-message">{{ mpesaPhoneError }}</span>
            <p class="mpesa-hint">You shall receive a push notification on this number to confirm payment.</p>
          </div>
          <div class="form-actions">
            <button @click="closeMpesaModal" class="btn btn-secondary">Cancel</button>
            <button @click="initiateMpesaPayment" class="btn btn-mpesa-submit" :disabled="!mpesaPhone || mpesaSubmitting">
              <span class="mpesa-logo">M</span> Send STK Push
            </button>
          </div>
        </div>

        <!--Step 2: Waiting for payment confirmation-->
        <div v-if="mpesaStatus === 'pending'" class="mpesa-body mpesa-waiting">
          <div class="mpesa-spinner-wrap">
            <div class="mpesa-spinner"></div>
          </div>
          <h3>Waiting for payment confirmation...</h3>
          <p>Check your phone <strong>{{ mpesaPhone }}</strong> and enter your M-Pesa PIN to complete the payment.</p>
          <div class="mpesa-amount-confirm">KSH {{ formatAmount(mpesaBill.amount) }}</div>
          <p class="mpesa-hint">This will automatically update once the payment is confirmed.</p>
        </div>

        <!--Step 3: Payment success-->
        <div v-if="mpesaStatus === 'success'" class="mpesa-body mpesa-result mpesa-success">
          <div class="result-icon">✅</div>
          <h3>Payment Successful!</h3>
          <p>KSH {{ formatAmount(mpesaBill.amount) }} paid for <strong>{{ getBillName(mpesaBill) }}</strong>.</p>
          <button @click="closeMpesaModal" class="btn btn-primary">Done</button>
        </div>

        <!--Step 4: Payment failed-->
        <div v-if="mpesaStatus === 'failed'" class="mpesa-body mpesa-result mpesa-error">
          <div class="result-icon">❌</div>
          <h3>Payment Failed</h3>
          <p>{{ mpesaErrorMessage || 'The payment was not completed. Please try again.' }}</p>
          <div class="form-actions" style="justify-content: center;">
            <button @click="closeMpesaModal" class="btn btn-secondary">Cancel</button>
            <button @click="retryMpesa" class="btn btn-mpesa-submit">
              <span class="mpesa-logo">M</span> Retry Payment
            </button>
          </div>
        </div>

        <!--Step 5: Payment timeout-->
        <div v-if="mpesaStatus === 'timeout'" class="mpesa-body mpesa-result mpesa-timeout">
          <div class="result-icon">⏰</div>
          <h3>Payment Timeout</h3>
          <p>The payment process took too long and has timed out. Please try again.</p>
          <div class="form-actions" style="justify-content: center;">
            <button @click="closeMpesaModal" class="btn btn-secondary">Cancel</button>
            <button @click="recheckPayment" class="btn btn-mpesa-submit" :disabled="recheckingPayment">
              <span class="mpesa-logo">M</span> {{ recheckingPayment ? 'Checking...' : 'Retry Payment' }}
            </button>
          </div>
        </div>
      </div>
     </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal" @click.self="closeDeleteModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Delete Bill</h2>
          <button class="close-btn" @click="closeDeleteModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="warning-icon">⚠️</div>
          <p>Are you sure you want to delete <strong>{{ billToDelete ? getBillName(billToDelete) : '' }}</strong>?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        <div class="modal-actions">
          <button @click="closeDeleteModal" class="btn btn-secondary">Cancel</button>
          <button @click="deleteBill" class="btn btn-danger" :disabled="deleting">{{ deleting ? 'Deleting...' : 'Delete Bill' }}</button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '⚠️' }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import api from '../services/api';

const bills = ref([]);
const pagination = reactive({ currentPage: 1, lastPage: 1, total: 0 });
const loadingMore = ref(false);
const loading = ref(false);
const saving = ref(false);
const showFormModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const currentBillId = ref(null);
const billToDelete = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');
const form = reactive({
  name: '',
  amount: '',
  due_date: '',
  status: 'unpaid'
});
const errors = ref({});
const toast = reactive({ show: false, message: '', type: 'success' });
const showMpesaModal = ref(false);
const mpesaBill = ref(null);
const mpesaPhone = ref('');
const mpesaPhoneError = ref('');
const mpesaStatus = ref('idle');
const mpesaErrorMessage = ref('');
const mpesaCheckoutRequestId = ref(null);
const mpesaPollingTimer = ref(null);
const mpesaSubmitting = ref(false);
const recheckingPayment = ref(false);
const deleting = ref(false);

const todayDate = computed(() => new Date().toISOString().split('T')[0]);

const totalAmount = computed(() => {
  if (!bills.value.length) return '0.00';
  return bills.value.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0).toFixed(2);
});

const overdueCount = computed(() =>
  bills.value.filter(bill => getStatus(bill.due_date) === 'Overdue').length
);

const dueThisWeekCount = computed(() =>
  bills.value.filter(bill => {
    const status = getStatus(bill.due_date);
    return status === 'Due Today' || status === 'Due Soon';
  }).length
);

const filteredBills = computed(() => {
  let filtered = [...bills.value];
  if (searchQuery.value.trim()) {
    filtered = filtered.filter(bill =>
      getBillName(bill).toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(bill => {
      const status = getStatus(bill.due_date);
      if (statusFilter.value === 'overdue') return status === 'Overdue';
      if (statusFilter.value === 'due_today') return status === 'Due Today';
      if (statusFilter.value === 'due_soon') return status === 'Due Soon';
      if (statusFilter.value === 'upcoming') return status === 'Upcoming';
      return true;
    });
  }
  return filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
});

onMounted(() => {
  fetchBills();
  const saved = localStorage.getItem('mpesa_phone');
  if (saved) mpesaPhone.value = saved;
});

onBeforeUnmount(() => clearPolling());

function getBillName(bill) {
  if (!bill) return 'Untitled Bill';
  return bill.bill_name || bill.name || 'Untitled Bill';
}

function getErrorMessage(error) {
  if (Array.isArray(error)) return error[0];
  if (typeof error === 'string') return error;
  return 'Invalid input';
}

function showToast(message, type = 'success') {
  toast.show = true;
  toast.message = message;
  toast.type = type;
  setTimeout(() => { toast.show = false; }, 3000);
}

function formatAmount(amount) {
  if (!amount && amount !== 0) return '0.00';
  return parseFloat(amount).toFixed(2);
}

function formatDate(date) {
  if (!date) return 'No date';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

function getDaysRemaining(dueDate) {
  if (!dueDate) return 999;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

function getProgressPercentage(dueDate) {
  const d = getDaysRemaining(dueDate);
  if (d >= 7) return 100;
  if (d <= 0) return 0;
  return (d / 7) * 100;
}

function getStatus(dueDate) {
  const d = getDaysRemaining(dueDate);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Due Today';
  if (d <= 3) return 'Due Soon';
  return 'Upcoming';
}

function getStatusClass(dueDate) {
  const status = getStatus(dueDate);
  if (status === 'Overdue') return 'status-overdue';
  if (status === 'Due Today') return 'status-today';
  if (status === 'Due Soon') return 'status-soon';
  return 'status-upcoming';
}

function getBillIcon(bill) {
  const name = getBillName(bill).toLowerCase();
  const icons = {
    electricity: '⚡', water: '💧', internet: '🌐', netflix: '📺',
    spotify: '🎵', rent: '🏠', mortgage: '🏡', insurance: '🛡️',
    phone: '📱', gas: '⛽', groceries: '🛒', subscription: '📅',
  };
  for (const [key, icon] of Object.entries(icons)) {
    if (name.includes(key)) return icon;
  }
  return '📄';
}

async function fetchBills(page = 1) {
  if (page === 1) {
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  try {
    const response = await api.get('/bills', { params: { page } });
    const wrapper = response.data.data;
    const items = Array.isArray(wrapper) ? wrapper : (wrapper?.data ?? []);
    if (page === 1) {
      bills.value = items;
    } else {
      bills.value.push(...items);
    }
    if (wrapper && !Array.isArray(wrapper)) {
      pagination.currentPage = wrapper.current_page ?? 1;
      pagination.lastPage = wrapper.last_page ?? 1;
      pagination.total = wrapper.total ?? items.length;
    }
  } catch {
    showToast('Failed to load bills', 'error');
    if (page === 1) bills.value = [];
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadMore() {
  if (pagination.currentPage < pagination.lastPage) {
    await fetchBills(pagination.currentPage + 1);
  }
}

function openCreateModal() {
  isEditing.value = false;
  currentBillId.value = null;
  Object.assign(form, { name: '', amount: '', due_date: todayDate.value, status: 'unpaid' });
  errors.value = {};
  showFormModal.value = true;
}

function openEditModal(bill) {
  isEditing.value = true;
  currentBillId.value = bill.id;
  Object.assign(form, {
    name: getBillName(bill),
    amount: bill.amount || '',
    due_date: bill.due_date ? bill.due_date.split('T')[0] : todayDate.value,
    status: bill.status || 'unpaid',
  });
  errors.value = {};
  showFormModal.value = true;
}

async function saveBill() {
  saving.value = true;
  errors.value = {};
  try {
    if (isEditing.value) {
      const response = await api.put(`/bills/${currentBillId.value}`, form);
      const index = bills.value.findIndex(b => b.id === currentBillId.value);
      if (index !== -1) bills.value[index] = response.data.data || response.data;
      showToast('Bill updated successfully');
    } else {
      const response = await api.post('/bills', form);
      bills.value.unshift(response.data.data || response.data);
      showToast('Bill created successfully');
    }
    closeFormModal();
  } catch (error) {
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors;
    } else {
      showToast(error.response?.data?.message || 'Failed to save bill', 'error');
    }
  } finally {
    saving.value = false;
  }
}

function confirmDelete(bill) {
  billToDelete.value = bill;
  showDeleteModal.value = true;
}

async function deleteBill() {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await api.delete(`/bills/${billToDelete.value.id}`);
    bills.value = bills.value.filter(b => b.id !== billToDelete.value.id);
    closeDeleteModal();
    showToast('Bill deleted successfully');
  } catch {
    showToast('Failed to delete bill', 'error');
  } finally {
    deleting.value = false;
  }
}

function closeFormModal() {
  showFormModal.value = false;
  Object.assign(form, { name: '', amount: '', due_date: '', status: 'unpaid' });
  errors.value = {};
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  billToDelete.value = null;
}

function clearFilters() {
  searchQuery.value = '';
  statusFilter.value = 'all';
}

function openMpesaModal(bill) {
  mpesaBill.value = bill;
  mpesaStatus.value = 'idle';
  mpesaErrorMessage.value = '';
  mpesaCheckoutRequestId.value = null;
  mpesaPhoneError.value = '';
  showMpesaModal.value = true;
}

function closeMpesaModal() {
  if (mpesaStatus.value === 'pending') return;
  clearPolling();
  showMpesaModal.value = false;
  mpesaBill.value = null;
  mpesaStatus.value = 'idle';
  mpesaCheckoutRequestId.value = null;
}

function retryMpesa() {
  mpesaStatus.value = 'idle';
  mpesaErrorMessage.value = '';
}

function validatePhone(phone) {
  return /^(\+?254|0)[17]\d{8}$/.test(phone.replace(/\s+/g, ''));
}

function normalizePhone(phone) {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+254')) return cleaned.replace('+', '');
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  return cleaned;
}

async function initiateMpesaPayment() {
  if (mpesaSubmitting.value) return;
  mpesaSubmitting.value = true;
  mpesaPhoneError.value = '';
  if (!validatePhone(mpesaPhone.value)) {
    mpesaPhoneError.value = 'Please enter a valid Kenyan phone number';
    mpesaSubmitting.value = false;
    return;
  }
  localStorage.setItem('mpesa_phone', mpesaPhone.value);
  const normalizedPhone = normalizePhone(mpesaPhone.value);
  mpesaStatus.value = 'pending';
  try {
    const response = await api.post('/mpesa/stkpush', {
      phone: normalizedPhone,
      amount: Math.ceil(parseFloat(mpesaBill.value.amount)),
      bill_id: mpesaBill.value.id,
      account_reference: getBillName(mpesaBill.value),
      transaction_desc: `Payment for ${getBillName(mpesaBill.value)}`,
    });
    mpesaCheckoutRequestId.value =
      response.data.mpesaCheckoutRequestID ||
      response.data.checkout_request_id ||
      response.data.data?.checkout_request_id ||
      response.data.data?.CheckoutRequestID ||
      response.data.CheckoutRequestID;
    if (!mpesaCheckoutRequestId.value) {
      mpesaStatus.value = 'failed';
      mpesaErrorMessage.value = 'Payment initiation failed: no checkout ID received from server.';
      return;
    }
    startPolling();
  } catch (error) {
    mpesaStatus.value = 'failed';
    mpesaErrorMessage.value = error.response?.data?.message || 'Failed to initiate M-Pesa Payment. Kindly try again.';
  } finally {
    mpesaSubmitting.value = false;
  }
}

function startPolling() {
  let attempts = 0;
  const maxAttempts = 20;
  mpesaPollingTimer.value = setInterval(async () => {
    attempts++;
    try {
      const response = await api.get(`/mpesa/status/${mpesaCheckoutRequestId.value}`);
      const status = response.data.status || response.data.ResultCode;
      if (status === 'success' || status === 0) {
        clearPolling();
        await onPaymentSuccess();
      } else if (status === 'failed' || (status !== 'pending' && status !== undefined && status !== 0)) {
        clearPolling();
        mpesaStatus.value = 'failed';
        mpesaErrorMessage.value = response.data.message || 'Payment failed. Please try again.';
      } else if (attempts >= maxAttempts) {
        clearPolling();
        mpesaStatus.value = 'timeout';
      }
    } catch {
      if (attempts >= maxAttempts) {
        clearPolling();
        mpesaStatus.value = 'failed';
        mpesaErrorMessage.value = 'Payment confirmation timed out. Please check your phone and try again.';
      }
    }
  }, 3000);
}

function clearPolling() {
  if (mpesaPollingTimer.value) {
    clearInterval(mpesaPollingTimer.value);
    mpesaPollingTimer.value = null;
  }
}

async function onPaymentSuccess() {
  try {
    await api.patch(`/bills/${mpesaBill.value.id}/mark-as-paid`);
    const index = bills.value.findIndex(b => b.id === mpesaBill.value.id);
    if (index !== -1) bills.value[index] = { ...bills.value[index], status: 'paid' };
    await api.post('/expenses', {
      title: getBillName(mpesaBill.value),
      amount: mpesaBill.value.amount,
      expense_date: new Date().toISOString().split('T')[0],
      category: 'Other',
      bill_id: mpesaBill.value.id,
      payment_method: 'mpesa',
      notes: `Paid via M-Pesa from ${mpesaPhone.value}`,
    });
    mpesaStatus.value = 'success';
    showToast(`${getBillName(mpesaBill.value)} paid successfully via M-Pesa.`);
  } catch {
    mpesaStatus.value = 'success';
    showToast('Payment received! Note: expense record may need manual sync.', 'error');
  }
}

async function recheckPayment() {
  if (recheckingPayment.value) return;
  recheckingPayment.value = true;
  try {
    const response = await api.get(`/mpesa/status/${mpesaCheckoutRequestId.value}`);
    if (response.data.status === 'success') {
      await onPaymentSuccess();
    } else {
      showToast('Payment has not been confirmed yet. Check your messages.', 'error');
    }
  } catch {
    showToast('Failed to recheck payment status. Please try again.', 'error');
  } finally {
    recheckingPayment.value = false;
  }
}
</script>

<style scoped>
.bills-container {
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

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
}

.summary-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
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
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface);
  color: var(--text);
  transition: all 0.2s;
}

.search-input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  color: var(--text);
  background: var(--surface);
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

/* Bills Grid */
.bills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.bill-card {
  background: var(--surface);
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
}

.bill-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.bill-card.status-overdue {
  border-left: 4px solid #ef4444;
}

.bill-card.status-today {
  border-left: 4px solid #f59e0b;
}

.bill-card.status-soon {
  border-left: 4px solid var(--primary);
}

.bill-card.status-upcoming {
  border-left: 4px solid #10b981;
}

.bill-header {
  padding: 1.25rem;
  background: var(--surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.bill-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bill-icon {
  font-size: 1.5rem;
}

.bill-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.bill-actions {
  display: flex;
  gap: 0.5rem;
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
  transform: scale(1.05);
}

.icon-btn.edit:hover {
  background: #eff6ff;
}

.icon-btn.delete:hover {
  background: #fef2f2;
}

.bill-body {
  padding: 1.25rem;
}

.bill-amount {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 1rem;
}

.bill-due {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.bill-due .label {
  color: var(--text-muted);
}

.bill-due .value {
  color: var(--text);
  font-weight: 500;
}

.bill-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.status-overdue {
  background: #fef2f2;
  color: #ef4444;
}

.status-today {
  background: #fffbeb;
  color: #f59e0b;
}

.status-soon {
  background: #eff6ff;
  color: var(--primary);
}

.status-upcoming {
  background: #ecfdf5;
  color: #10b981;
}

.bill-progress {
  margin-top: 1rem;
}

.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, var(--primary));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: right;
}

/* Mpesa */
.btn-mpesa {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 1rem;
  padding: 0.625rem 1rem;
  background: #00a651;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
}

.btn-mpesa:hover {
  background: #008c44;
  transform: translateY(-1px);
}

.btn-mpesa:active {
  transform: translateY(0);
}

.mpesa-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--surface);
  color: #00a651;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: bold;
}

.paid-badge {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #10b981;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
}

.mpesa-modal {
  max-width: 500px;
}

.mpesa-header {
  background: #00a651;
  border-radius: 1rem 1rem 0 0;
}

.mpesa-header h2 {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.mpesa-header .close-btn {
  color: rgba(255, 255, 255, 0.8);
}

.mpesa-header .close-btn:hover {
  color: white;
}

.mpesa-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mpesa-badge {
  background: var(--surface);
  color: #00a651;
  font-size: 0.625rem;
  font-weight: 900;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  letter-spacing: 1px;
}

.mpesa-body { padding: 1.5rem; }
 
.mpesa-bill-summary {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mpesa-bill-name { font-weight: 600; color: var(--text); }
.mpesa-bill-amount { font-size: 1.25rem; font-weight: 700; color: #00a651; }
 
.mpesa-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; }
 
.btn-mpesa-submit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #00a651;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-mpesa-submit:hover:not(:disabled) {
  background: #008c44;
}

.btn-mpesa-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mpesa-waiting {
  text-align: center;
  padding: 2rem 1.5rem;
}

.mpesa-spinner-wrap {
  margin: 0 auto 1.5rem;
  width: 64px;
  height: 64px;
}

.mpesa-spinner {
  width: 64px;
  height: 64px;
  border: 4px solid #bbf7d0;
  border-top-color: #00a651;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.mpesa-waiting h3 {
  color: var(--text);
  margin-bottom: 0.75rem;
}

.mpesa-waiting p {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.mpesa-amount-confirm {
  font-size: 2rem;
  font-weight: 700;
  color: #00a651;
  margin: 1rem 0;
}

.mpesa-result {
  text-align: center;
  padding: 2rem 1.5rem;
}

.result-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.mpesa-result h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--text);
}

.mpesa-result p {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.mpesa-success .result-icon {
  filter: none;
}

/* Load More */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem;
  background: var(--surface);
  border-radius: 1rem;
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
}

/* Modal Styles */
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
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--surface);
  border-radius: 1rem;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}

.modal-large {
  max-width: 600px;
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
  margin: 0;
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

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.warning-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.modal form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
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
  padding: 0.625rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: var(--surface);
  color: var(--text);
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.error,
.form-group select.error {
  border-color: #ef4444;
}

.form-group select {
  appearance: none;
  -webkit-appearance: none;
  background: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
  cursor: pointer;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

input, select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input.error, select.error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.input-with-icon {
  position: relative;
}

.input-currency {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-weight: 500;
}

.input-with-icon input {
  padding-left: 1.75rem;
}

.form-actions, .modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
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

.toast-message {
  font-size: 0.875rem;
  color: var(--text);
  font-weight: 500;
}

.toast.success {
  border-left: 4px solid #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast-icon {
  font-size: 1.2rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .bills-container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .bills-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .toast {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>