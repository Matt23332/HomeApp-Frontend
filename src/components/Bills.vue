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
          <div class="summary-value">${{ totalAmount }}</div>
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
            ${{ formatAmount(bill.amount) }}
          </div>
          <div class="bill-due">
            <span class="label">Due Date:</span>
            <span class="value">{{ formatDate(bill.due_date) }}</span>
          </div>
          <div class="bill-status" :class="getStatusClass(bill.due_date)">
            {{ getStatus(bill.due_date) }}
          </div>
          <div class="bill-progress" v-if="getDaysRemaining(bill.due_date) <= 7 && getDaysRemaining(bill.due_date) >= 0">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getProgressPercentage(bill.due_date) + '%' }"></div>
            </div>
            <div class="progress-text">{{ getDaysRemaining(bill.due_date) }} days remaining</div>
          </div>
        </div>
      </div>
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
              placeholder="e.g., Netflix Subscription, Electricity Bill"
              :class="{ 'error': errors.name }"
            />
            <span v-if="errors.name" class="error-message">{{ getErrorMessage(errors.name) }}</span>
          </div>

          <div class="form-group">
            <label for="amount">Amount *</label>
            <div class="input-with-icon">
              <span class="input-currency">$</span>
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
          <button @click="deleteBill" class="btn btn-danger">Delete Bill</button>
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

<script>
import api from '../services/api';

export default {
  name: 'Bills',
  data() {
    return {
      bills: [],
      loading: false,
      saving: false,
      showFormModal: false,
      showDeleteModal: false,
      isEditing: false,
      currentBillId: null,
      billToDelete: null,
      searchQuery: '',
      statusFilter: 'all',
      form: {
        name: '',
        amount: '',
        due_date: '',
        status: 'unpaid'
      },
      errors: {},
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
    }
  },
  computed: {
    todayDate() {
      return new Date().toISOString().split('T')[0];
    },
    totalAmount() {
      if (!this.bills.length) return '0.00';
      return this.bills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0).toFixed(2);
    },
    overdueCount() {
      return this.bills.filter(bill => this.getStatus(bill.due_date) === 'Overdue').length;
    },
    dueThisWeekCount() {
      return this.bills.filter(bill => {
        const status = this.getStatus(bill.due_date);
        return status === 'Due Today' || status === 'Due Soon';
      }).length;
    },
    filteredBills() {
      let filtered = [...this.bills];
      
      // Apply search filter
      if (this.searchQuery && this.searchQuery.trim()) {
        filtered = filtered.filter(bill => {
          const name = this.getBillName(bill);
          return name.toLowerCase().includes(this.searchQuery.toLowerCase());
        });
      }
      
      // Apply status filter
      if (this.statusFilter !== 'all') {
        filtered = filtered.filter(bill => {
          const status = this.getStatus(bill.due_date);
          if (this.statusFilter === 'overdue') return status === 'Overdue';
          if (this.statusFilter === 'due_today') return status === 'Due Today';
          if (this.statusFilter === 'due_soon') return status === 'Due Soon';
          if (this.statusFilter === 'upcoming') return status === 'Upcoming';
          return true;
        });
      }
      
      // Sort by due date (closest first)
      return filtered.sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA - dateB;
      });
    }
  },
  mounted() {
    this.fetchBills();
  },
  methods: {
    // Helper method to get bill name safely
    getBillName(bill) {
      if (!bill) return 'Untitled Bill';
      return bill.bill_name || bill.name || 'Untitled Bill';
    },
    
    // Helper method to get error message
    getErrorMessage(error) {
      if (Array.isArray(error)) {
        return error[0];
      }
      if (typeof error === 'string') {
        return error;
      }
      return 'Invalid input';
    },
    
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    },
    
    formatAmount(amount) {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    },
    
    formatDate(date) {
      if (!date) return 'No date';
      try {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    },
    
    getDaysRemaining(dueDate) {
      if (!dueDate) return 999;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      } catch (error) {
        return 999;
      }
    },
    
    getProgressPercentage(dueDate) {
      const daysRemaining = this.getDaysRemaining(dueDate);
      if (daysRemaining >= 7) return 100;
      if (daysRemaining <= 0) return 0;
      return (daysRemaining / 7) * 100;
    },
    
    getStatus(dueDate) {
      const daysRemaining = this.getDaysRemaining(dueDate);
      
      if (daysRemaining < 0) return 'Overdue';
      if (daysRemaining === 0) return 'Due Today';
      if (daysRemaining <= 3) return 'Due Soon';
      return 'Upcoming';
    },
    
    getStatusClass(dueDate) {
      const status = this.getStatus(dueDate);
      if (status === 'Overdue') return 'status-overdue';
      if (status === 'Due Today') return 'status-today';
      if (status === 'Due Soon') return 'status-soon';
      if (status === 'Upcoming') return 'status-upcoming';
      return '';
    },
    
    getBillIcon(bill) {
      const name = this.getBillName(bill).toLowerCase();
      const icons = {
        'electricity': '⚡',
        'water': '💧',
        'internet': '🌐',
        'netflix': '📺',
        'spotify': '🎵',
        'rent': '🏠',
        'mortgage': '🏡',
        'insurance': '🛡️',
        'phone': '📱',
        'gas': '⛽',
        'groceries': '🛒',
        'subscription': '📅'
      };
      
      for (const [key, icon] of Object.entries(icons)) {
        if (name.includes(key)) {
          return icon;
        }
      }
      return '📄';
    },
    
    async fetchBills() {
      this.loading = true;
      try {
        const response = await api.get('/bills');
        // Handle different response structures
        let billsData = response.data;
        if (billsData && billsData.data) {
          billsData = billsData.data;
        }
        if (Array.isArray(billsData)) {
          this.bills = billsData;
        } else {
          this.bills = [];
        }
        console.log('Bills fetched:', this.bills);
      } catch (error) {
        console.error('Error fetching bills:', error);
        this.showToast('Failed to load bills', 'error');
        this.bills = [];
      } finally {
        this.loading = false;
      }
    },
    
    openCreateModal() {
      this.isEditing = false;
      this.currentBillId = null;
      this.form = {
        name: '',
        amount: '',
        due_date: this.todayDate,
        status: 'unpaid'
      };
      this.errors = {};
      this.showFormModal = true;
    },
    
    openEditModal(bill) {
      this.isEditing = true;
      this.currentBillId = bill.id;
      this.form = {
        name: this.getBillName(bill),
        amount: bill.amount || '',
        due_date: bill.due_date ? bill.due_date.split('T')[0] : this.todayDate,
        status: bill.status || 'unpaid'
      };
      this.errors = {};
      this.showFormModal = true;
    },
    
    async saveBill() {
      this.saving = true;
      this.errors = {};
      console.log('Sending payload:', JSON.stringify(this.form));
      
      try {
        let response;
        if (this.isEditing) {
          response = await api.put(`/bills/${this.currentBillId}`, this.form);
          const index = this.bills.findIndex(b => b.id === this.currentBillId);
          if (index !== -1) {
            this.bills[index] = response.data.data || response.data;
          }
          this.showToast('Bill updated successfully');
        } else {
          response = await api.post('/bills', this.form);
          const newBill = response.data.data || response.data;
          this.bills.unshift(newBill);
          this.showToast('Bill created successfully');
        }
        
        this.closeFormModal();
      } catch (error) {
        console.error('Validation errors:', error.response?.data);
        console.error('Error saving bill:', error);
        if (error.response?.data?.errors) {
          this.errors = error.response.data.errors;
        } else {
          this.showToast(error.response?.data?.message || 'Failed to save bill', 'error');
        }
      } finally {
        this.saving = false;
      }
    },
    
    confirmDelete(bill) {
      this.billToDelete = bill;
      this.showDeleteModal = true;
    },
    
    async deleteBill() {
      try {
        await api.delete(`/bills/${this.billToDelete.id}`);
        this.bills = this.bills.filter(b => b.id !== this.billToDelete.id);
        this.closeDeleteModal();
        this.showToast('Bill deleted successfully');
      } catch (error) {
        console.error('Error deleting bill:', error);
        this.showToast('Failed to delete bill', 'error');
      }
    },
    
    closeFormModal() {
      this.showFormModal = false;
      this.form = {
        name: '',
        amount: '',
        due_date: '',
        status: 'unpaid'
      };
      this.errors = {};
    },
    
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.billToDelete = null;
    },
    
    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = 'all';
    }
  }
}
</script>

<style scoped>
/* All the styles remain the same as previous */
.bills-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8fafc;
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
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
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
  background: white;
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
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
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
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #1a1a1a;
  transition: all 0.2s;
}

.search-input::placeholder {
  color: #9ca3af;
  opacity: 1;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  color: #1a1a1a;
  background: #fff;
}

.filter-select {
  padding: 0.625rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Bills Grid */
.bills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.bill-card {
  background: white;
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
  border-left: 4px solid #3b82f6;
}

.bill-card.status-upcoming {
  border-left: 4px solid #10b981;
}

.bill-header {
  padding: 1.25rem;
  background: white;
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
  color: #1a1a1a;
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
  color: #3b82f6;
  margin-bottom: 1rem;
}

.bill-due {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.bill-due .label {
  color: #6b7280;
}

.bill-due .value {
  color: #1a1a1a;
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
  color: #3b82f6;
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
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #3b82f6);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.7rem;
  color: #6b7280;
  text-align: right;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
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
  background: white;
  border-radius: 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
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
  background: white;
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
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #1a1a1a;
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
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.625rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #1a1a1a;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input::placeholder {
  color: #9ca3af;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
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
  color: #374151;
}

input, select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
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
  color: #6b7280;
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

.btn-secondary:hover {
  background: #e5e7eb;
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
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  animation: slideInRight 0.3s ease;
  min-width: 250px;
}

.toast-message {
  font-size: 0.875rem;
  color: #1a1a1a;
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