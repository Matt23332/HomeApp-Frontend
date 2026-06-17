<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../services/api';

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const currentItemId = ref(null);
const itemToDelete = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');

const form = ref({
    name: '',
    price: '',
    quantity: 1,
    status: 'pending'
});

const errors = ref({});
const toast = ref({
    show: false,
    message: '',
    type: 'success'
});

const totalValue = computed(() => {
    if (!items.value.length) return '0.00';
    const total = items.value.reduce((sum, item) => {
        return sum + (parseFloat(item.price || 0) * item.quantity || 0);
    }, 0);
    return total.toFixed(2);
})

const purchasedCount = computed(() => {
    return items.value.filter(item => item.status === 'purchased').length;
})

const pendingCount = computed(() => {
    return items.value.filter(item => item.status === 'pending').length;
})

const filteredItems = computed(() => {
    let filtered = [...items.value];

    if (searchQuery.value && searchQuery.value.trim()) {
        filtered = filtered.filter(item => {
            const name = getItemName(item);
            return name.toLowerCase().includes(searchQuery.value.toLowerCase());
        });
    }

    if (statusFilter.value !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter.value);
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

const getItemName = (item) => {
    if (!item) return 'Unknown Item';
    return item.name || 'Unnamed Item';
}

const getErrorMessage = (error) => {
    if (Array.isArray(error)) return error[0];
    if (typeof error === 'string') return error;
    return 'Invalid input';
}

const getItemIcon = (name) => {
    const icons = {
    'milk': '🥛', 'bread': '🍞', 'egg': '🥚', 'rice': '🍚',
    'pasta': '🍝', 'apple': '🍎', 'banana': '🍌', 'orange': '🍊',
    'coffee': '☕', 'tea': '🍵', 'water': '💧', 'soda': '🥤',
    'laptop': '💻', 'phone': '📱', 'tv': '📺', 'shirt': '👕',
    'pants': '👖', 'shoes': '👟'
    };

    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    return '🛒';
}

const getItemStatusClass = (status) => {
    return {
        'status-pending': status === 'pending',
        'status-purchased': status === 'purchased',
        'status-completed': status === 'completed'
    }
}

const getStatusText = (status) => {
    const statusMap = {
        'pending': 'Pending',
        'purchased': 'Purchased',
        'completed': 'Completed'
    }
    return statusMap[status] || status;
}

const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
}

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type };
    setTimeout(() => {
        toast.value.show = false;
    }, 3000);
}

const fetchItems = async () => {
    loading.value = true;
    try {
        const response = await api.get('/shopping-items');
        const itemsData = response.data?.data?.data ?? response.data?.data ?? response.data;
        items.value = Array.isArray(itemsData) ? itemsData : [];
    } catch (error) {
        showToast('Failed to load items. Please try again.', 'error');
        items.value = [];
    } finally {
        loading.value = false;
    }
}

const saveItem = async () => {
    saving.value = true;
    errors.value = {};
    try {
        let response;
        const payload = {
            name: form.value.name?.trim(),
            price: form.value.price !== '' ? parseFloat(form.value.price) : null,
            quantity: form.value.quantity !== '' ? parseInt(form.value.quantity) : null,
            status: form.value.status
        }

        if (isEditing.value) {
            response = await api.put(`/shopping-items/${currentItemId.value}`, payload);
            const index = items.value.findIndex(item => item.id === currentItemId.value);
            if (index !== -1) {
                items.value[index] = response.data.data || response.data;
            }
            closeModal();
            showToast('Item updated successfully');
        } else {
            response = await api.post('/shopping-items', payload);
            const newItem = response.data.data || response.data;
            items.value.unshift(newItem);
            closeModal();
            showToast('Item added successfully');
        }
    } catch (error) {
        if (error.response?.data?.errors) {
            errors.value = error.response.data.errors;
            showToast('Please fill in the form correctly', 'error');
        } else {
            showToast(error.response?.data?.message || 'Failed to save item', 'error');
        }
    } finally {
        saving.value = false;
    }
}

const deleteItem = async () => {
    try {
        await api.delete(`/shopping-items/${itemToDelete.value.id}`);
        items.value = items.value.filter(item => item.id !== itemToDelete.value.id);
        closeDeleteModal();
        showToast('Item deleted successfully');
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to delete item', 'error');
    }
}

const openCreateModal = () => {
    isEditing.value = false;
    currentItemId.value = null;
    form.value = {
        name: '',
        price: '',
        quantity: 1,
        status: 'pending'
    }
    errors.value = {};
    showModal.value = true;
}

const openEditModal = (item) => {
    isEditing.value = true;
    currentItemId.value = item.id;
    form.value = {
        name: item.name || '',
        price: item.price ? parseFloat(item.price).toFixed(2) : '',
        quantity: item.quantity || 1,
        status: item.status || 'pending'
    }
    errors.value = {};
    showModal.value = true;
}

const confirmDelete = (item) => {
    itemToDelete.value = item;
    showDeleteModal.value = true;
}

const closeModal = () => {
    showModal.value = false;
    isEditing.value = false;
    currentItemId.value = null;
    form.value = {
        name: '',
        price: '',
        quantity: 1,
        status: 'pending'
    }
    errors.value = {};
}

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    itemToDelete.value = null;
}

const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = 'all';
}

onMounted(() => {
    fetchItems();
});
</script>

<template>
    <div class="shopping-container">
        <div class="page-header">
            <div>
                <h1>Shopping List</h1>
                <p class="subtitle">Manage your shopping items from here.</p>
            </div>
            <button @click="openCreateModal" class="btn btn-primary">
                <span class="btn-icon">+</span>
                Add New Item
            </button>
        </div>

        <div class="summary-cards">
            <div class="summary-card">
                <div class="summary-icon">🛒</div>
                <div class="summary-info">
                    <div class="summary-label">Total Items</div>
                    <div class="summary-value">{{ items.length }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">💰</div>
                <div class="summary-info">
                    <div class="summary-label">Total Value</div>
                    <div class="summary-value">${{ totalValue }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">✅</div>
                <div class="summary-info">
                    <div class="summary-label">Purchased</div>
                    <div class="summary-value">{{ purchasedCount }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">⏳</div>
                <div class="summary-info">
                    <div class="summary-label">Pending</div>
                    <div class="summary-value">{{ pendingCount }}</div>
                </div>
            </div>
        </div>

        <div class="filters-bar">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search items..."
                    class="search-input"
                />
            </div>
            <select v-model="statusFilter" class="filter-select">
                <option value="all">All Items</option>
                <option value="pending">Pending</option>
                <option value="purchased">Purchased</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            Loading items...
        </div>
        <div v-else-if="filteredItems.length === 0" class="empty-state">
            <div class="empty-icon">🛍️</div>
            <h3>No items found.</h3>
            <p v-if="searchQuery || statusFilter !== 'all'">Adjust your search filters.</p>
            <p v-else>Start adding items to your shopping list.</p>
            <button @click="openCreateModal" class="btn btn-primary" v-if="!searchQuery && statusFilter === 'all'">
                Add Item
            </button>
            <button @click="clearFilters" class="btn btn-secondary" v-else>
                Clear Filters
            </button>
        </div>

        <div v-else class="items-grid">
            <div v-for="item in filteredItems" :key="item.id" class="item-card" :class="getItemStatusClass(item.status)">
                <div class="item-header">
                    <div class="item-title-section">
                        <div class="item-icon">{{ getItemIcon(item.name) }}</div>
                        <h3>{{ getItemName(item) }}</h3>
                    </div>
                    <div class="item-actions">
                        <button @click="openEditModal(item)" class="icon-btn edit" title="Edit">
                            ✏️
                        </button>
                        <button @click="confirmDelete(item)" class="icon-btn delete" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="item-body">
                    <div class="item-price">
                        Ksh{{ formatAmount(item.price) }}
                    </div>
                    <div class="item-details">
                        <div class="detail-item">
                            <span class="label">Quantity:</span>
                            <span class="value">{{ item.quantity }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Total:</span>
                            <span class="value total">Ksh{{ formatAmount(item.price * item.quantity) }}</span>
                        </div>
                    </div>
                    <div class="item-status" :class="getItemStatusClass(item.status)">
                        {{ getStatusText(item.status) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals and Toast -->
         <div v-if="showModal" class="modal" @click.self="closeModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>{{ isEditing ? 'Edit Item' : 'Add New Item' }}</h2>
                    <button class="close-btn" @click="closeModal">&times;</button>
                </div>

                <form @submit.prevent="saveItem" class="modal-form">
                    <div class="form-group">
                        <label for="name">Item Name</label>
                        <input type="text" id="name" v-model="form.name" required placeholder="e.g. Milk, Bread" :class="{ 'error': errors.name }" />
                        <span v-if="errors.name" class="error-message">{{ getErrorMessage(errors.name) }}</span>
                    </div>
                    <div class="form-group">
                        <label for="price">Price</label>
                        <div class="input-with-icon">
                            <span class="input-currency">Ksh</span>
                            <input type="number" id="price" v-model="form.price" step="0.01" required :class="{ 'error': errors.price }" />
                        </div>
                        <span v-if="errors.price" class="error-message">{{ getErrorMessage(errors.price) }}</span>
                    </div>
                    <div class="form-group">
                        <label for="quantity">Quantity</label>
                        <input type="number" id="quantity" v-model="form.quantity" min="1" required :class="{ 'error': errors.quantity }" />
                        <span v-if="errors.quantity" class="error-message">{{ getErrorMessage(errors.quantity) }}</span>
                    </div>
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" v-model="form.status" :class="{ 'error': errors.status }">
                            <option value="pending">Pending</option>
                            <option value="purchased">Purchased</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary" :disabled="saving">
                            {{ saving ? 'Saving...' : (isEditing ? 'Update Item' : 'Add Item') }}
                        </button>
                    </div>
                </form>
            </div>
         </div>

         <div v-if="showDeleteModal" class="modal" @click.self="closeDeleteModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Delete Item</h2>
                    <button class="close-btn" @click="closeDeleteModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="warning-icon">⚠️</div>
                    <p>Are you sure you want to delete <strong>{{ getItemName(itemToDelete) }}</strong>?</p>
                    <p class="warning-text">This action cannot be undone.</p>
                </div>
                <div class="modal-actions">
                    <button @click="closeDeleteModal" class="btn btn-secondary">Cancel</button>
                    <button @click="deleteItem" class="btn btn-danger">Delete</button>
                </div>
            </div>
         </div>
         <div v-if="toast.show" class="toast" :class="toast.type">
            <span class="toast-icon">{{ toast.type === 'success' ? '✅' : '❌' }}</span>
            <span class="toast-message">{{ toast.message }}</span>
         </div>
    </div>
</template>

<style scoped>
.shopping-container {
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
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #1a1a1a;
  box-sizing: border-box;
  transition: all 0.2s;
}

.search-input::placeholder {
    color: #9ca3af;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  height: 40px;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M0 4l6 6 6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  box-sizing: border-box;
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.item-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.item-card.status-pending {
  border-left: 4px solid #f59e0b;
}

.item-card.status-purchased {
  border-left: 4px solid #10b981;
}

.item-card.status-cancelled {
  border-left: 4px solid #ef4444;
}

.item-header {
  padding: 1.25rem;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.item-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-icon {
  font-size: 1.5rem;
}

.item-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
}

.item-actions {
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

.item-body {
  padding: 1.25rem;
}

.item-price {
  font-size: 1.75rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 1rem;
}

.item-details {
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.detail-item .label {
  color: #6b7280;
}

.detail-item .value {
  color: #1a1a1a;
  font-weight: 500;
}

.detail-item .value.total {
  color: #3b82f6;
  font-weight: 700;
}

.item-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-pending {
  background: #fffbeb;
  color: #f59e0b;
}

.status-purchased {
  background: #ecfdf5;
  color: #10b981;
}

.status-completed {
  background: #fef2f2;
  color: #ef4444;
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

.modal-form {
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
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M0 4l6 6 6-6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2rem;
    cursor: pointer;
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
  padding-left: 2.75rem;
}

.form-actions,
.modal-actions {
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

.btn-icon {
  margin-right: 0.5rem;
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
}

.toast-message {
    color: #1a1a1a;
    font-size: 0.875rem;
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
  .shopping-container {
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
  
  .items-grid {
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