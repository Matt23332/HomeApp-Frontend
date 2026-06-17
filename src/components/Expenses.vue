<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import api from '../services/api';
import Chart from 'chart.js/auto';

const expenses = ref([]);
const bills = ref([]);
const selectedBillId = ref('');
const loadingExpenses = ref(false);
const loadingSummary = ref(false);
const expenseData = ref({
    title: '',
    amount: '',
    category: 'Bills',
    expense_date: new Date().toISOString().split('T')[0]
})

const manualExpense = ref({
    title: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0]
})

const summary = ref([]);
const summaryPeriod = ref('monthly');
const searchQuery = ref('');
const isProcessing = ref(false);
const editingExpense = ref(null);
const showEditModal = ref(false);
const toast = ref({
    show: false,
    message: '',
    type: 'success'
})

let summaryChart = null;
const summaryChartCanvas = ref(null);

const selectedBill = computed(() => {
    return bills.value.find(bill => bill.id === selectedBillId.value);
})

const filteredExpenses = computed(() => {
    if (!expenses.value) return [];
    const valid = expenses.value.filter(Boolean);
    if (!searchQuery.value) return expenses.value;
    return expenses.value.filter(expense =>
        (expense.title || '').toLowerCase().includes(searchQuery.value.toLowerCase()) || (expense.category || '').toLowerCase().includes(searchQuery.value.toLocaleLowerCase())
    );
})

const getBillName = (bill) => {
    return bill.name || 'Unnamed Bill';
}

const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
}

const formatDate = (date) => {
    if (!date) return 'No Date';
    const [year, month, day] = date.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString();
}

const getCategoryClass = (category) => {
    const classes = {
        'Groceries': 'category-success',
        'Food': 'category-warning',
        'Transportation': 'category-info',
        'Entertainment': 'category-danger',
        'Utilities': 'category-secondary',
        'Health': 'category-dark',
        'Dining': 'category-primary',
        'Education': 'category-light',
        'Shopping': 'category-light',
        'Other': 'category-muted'
    }
    return classes[category] || 'category-secondary';
}

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type };
    setTimeout(() => {
        toast.value.show = false;
    }, 3000);
}

const loadExpenses = async () => {
    loadingExpenses.value = true;
    try {
        const response = await api.get('/expenses');
        expenses.value = (response.data.data?.data ?? response.data.data ?? response.data).filter(Boolean);
    } catch (error) {
        showToast('Failed to load expenses', 'error');
    } finally {
        loadingExpenses.value = false;
    }
}

const loadBills = async () => {
    try {
        const response = await api.get('/bills');
        bills.value = (response.data.data?.data ?? response.data.data ?? response.data).filter(Boolean);
    } catch (error) {
        showToast('Failed to load bills', 'error');
    }
}

const loadSummary = async () => {
    loadingSummary.value = true;
    try {
        const response = await api.get('/expenses/summary', {
            params: { period: summaryPeriod.value }
        })
        summary.value = response.data.data || response.data;
        await nextTick();
        updateChart();
    } catch (error) {
        showToast('Failed to load summary', 'error');
    } finally {
        loadingSummary.value = false;
    }
}

const payBillAndCreateExpense = async () => {
    if (!selectedBillId.value) {
        showToast('Please select a bill', 'error');
        return;
    }

    isProcessing.value = true;

    try {
        const expensePayload = {
            title: getBillName(selectedBill.value),
            amount: selectedBill.value.amount,
            category: expenseData.value.category,
            expense_date: expenseData.value.expense_date
        }

        const expenseResponse = await api.post('/expenses', expensePayload);
        if (expenseResponse.status === 201 || expenseResponse.status === 200) {
            await api.delete(`/bills/${selectedBillId.value}`);
            showToast('Bill paid and expense created successfully');
            resetForm();
            await Promise.all([loadExpenses(), loadBills(), loadSummary()]);
        }
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to process bill payment', 'error');
    } finally {
        isProcessing.value = false;
    }
}

const createManualExpense = async () => {
    if (!manualExpense.value.amount || isNaN(parseFloat(manualExpense.value.amount))) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const payload = {
            title: manualExpense.value.title,
            amount: parseFloat(manualExpense.value.amount),
            category: manualExpense.value.category,
            expense_date: manualExpense.value.expense_date
        }

        const response = await api.post('/expenses', payload);
        if (response.status === 201 || response.status === 200) {
            manualExpense.value = {
                title: '',
                amount: '',
                category: '',
                expense_date: new Date().toISOString().split('T')[0]
            }
            await Promise.all([loadExpenses(), loadSummary()]);
            showToast('Expense added successfully');
        }
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to create expense', 'error');
    }
}

const updateExpense = async () => {
    try {
        const payload = {
            title: editingExpense.value.title,
            amount: parseFloat(editingExpense.value.amount),
            category: editingExpense.value.category,
            expense_date: editingExpense.value.expense_date
        }

        const response = await api.put(`/expenses/${editingExpense.value.id}`, payload);
        if (response.status === 200) {
            showToast('Expense updated successfully');
            await Promise.all([loadExpenses(), loadSummary()]);
            closeEditModal();
        }
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to update expense', 'error');
    }
}

const deleteExpense = async (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            await api.delete(`/expenses/${id}`);
            showToast('Expense deleted successfully');
            await Promise.all([loadExpenses(), loadSummary()]);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to delete expense', 'error');
        }
    }
}

const updateChart = () => {
    if (summaryChart) {
        summaryChart.destroy();
    }

    if (summary.value.length > 0 && summaryChartCanvas.value) {
        const ctx = summaryChartCanvas.value.getContext('2d');
        summaryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: summary.value.map(item => item.category),
                datasets: [{
                    data: summary.value.map(item => parseFloat(item.total)),
                    backgroundColor: [
                        '#4A90E2', '#5BA3F5', '#6BB3FB', '#7BC3FB',
                        '#3498DB', '#2980B9', '#2471A3', '#1F618D'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#2c3e50',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        })
    }
}

const editExpense = (expense) => {
    editingExpense.value = {
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expense_date
    }
    showEditModal.value = true;
    document.body.style.overflow = 'hidden';
}

const closeEditModal = () => {
    showEditModal.value = false;
    editingExpense.value = null;
    document.body.style.overflow = '';
}

const resetForm = () => {
    selectedBillId.value = '';
    expenseData.value = {
        title: '',
        amount: '',
        category: 'Other',
        expense_date: new Date().toISOString().split('T')[0]
    }
}

watch(selectedBillId, (newValue) => {
    if (newValue && selectedBill.value) {
        expenseData.value.amount = selectedBill.value.amount;
        expenseData.value.title = `Paid: ${getBillName(selectedBill.value)}`;
    }
})

onMounted(() => {
    loadExpenses();
    loadBills();
    loadSummary();
})

onUnmounted(() => {
    if (summaryChart) {
        summaryChart.destroy();
        summaryChart = null;
    }
})
</script>

<template>
    <div class="expense-manager">
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h4 class="mb-0">Pay Bill and Manage Expenses</h4>
                    </div>
                    <div class="card-body">
                        <form @submit.prevent="payBillAndCreateExpense">
                            <div class="form-group mb-3">
                                <label class="form-label">Select Bill</label>
                                <select v-model="selectedBillId" class="form-control" required>
                                    <option value="">Select a bill to pay</option>
                                    <option v-for="bill in bills" :key="bill.id" :value="bill.id">
                                        {{ getBillName(bill) }} - Due: {{ formatDate(bill.due_date) }} - Ksh{{
                                        formatAmount(bill.amount) }}
                                    </option>
                                </select>
                            </div>

                            <div v-if="selectedBill" class="bill-details mb-3">
                                <div class="alert alert-info">
                                    <strong>Bill Details:</strong><br>
                                    Name: {{ getBillName(selectedBill) }}<br>
                                    Amount: Ksh{{ formatAmount(selectedBill.amount) }}<br>
                                    Due Date: {{ formatDate(selectedBill.due_date) }}
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label">Expense Category</label>
                                <select v-model="expenseData.category" class="form-control" required>
                                    <option value="">Select Category</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Food">Food</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Health">Health</option>
                                    <option value="Dining">Dining</option>
                                    <option value="Education">Education</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label">Expense Title</label>
                                <input type="text" v-model="expenseData.title" class="form-control"
                                    placeholder="e.g. Utilities Bill" required />
                            </div>

                            <div class="form-group mb-3">
                                <label class="form-label">Expense Date</label>
                                <input type="date" v-model="expenseData.expense_date" class="form-control" required />
                            </div>
                            <button type="submit" class="btn btn-primary w-100" :disabled="isProcessing">
                                <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
                                {{ isProcessing ? 'Processing...' : 'Pay Bill' }}
                            </button>
                        </form>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h4 class="mb-0">Add Manual Expense</h4>
                    </div>
                    <div class="card-body">
                        <form @submit.prevent="createManualExpense">
                            <div class="form-group mb-3">
                                <label class="form-label">Title</label>
                                <input type="text" v-model="manualExpense.title" class="form-control" required />
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Amount</label>
                                <input type="number" v-model="manualExpense.amount" class="form-control" step="0.01"
                                    required />
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Category</label>
                                <select v-model="manualExpense.category" class="form-control" required>
                                    <option value="">Select Category</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Food">Food</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Health">Health</option>
                                    <option value="Dining">Dining</option>
                                    <option value="Education">Education</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Expense Date</label>
                                <input type="date" v-model="manualExpense.expense_date" class="form-control" required />
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Add Expense</button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h4 class="mb-0">Expense Summary</h4>
                            <select v-model="summaryPeriod" @change="loadSummary" class="form-select w-auto">
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        <div v-if="loadingSummary" class="text-center py-4">
                            <div class="spinner-border text-primary" role="status"></div>
                            <div class="text-muted mt-2">Loading summary...</div>
                        </div>
                        <div v-else-if="summary.length === 0" class="text-muted text-center py-4">
                            No expenses for this period
                        </div>
                        <div v-else>
                            <canvas ref="summaryChartCanvas"></canvas>
                            <div class="table-responsive mt-4">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Category</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in summary" :key="item.category">
                                            <td>{{ item.category }}</td>
                                            <td class="fw-bold">Ksh{{ formatAmount(item.total) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h4 class="mb-0">Recent Expenses</h4>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <input type="text" v-model="searchQuery" class="form-control" placeholder="Search expenses..." />
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th>Title</th>
                                        <th>Amount</th>
                                        <th>Category</th>
                                        <th>Date</th>
                                        <th class="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="expense in filteredExpenses" :key="expense.id">
                                        <td class="fw-medium">{{ expense.title }}</td>
                                        <td class="text-primary fw-bold">Ksh{{ formatAmount(expense.amount) }}</td>
                                        <td>
                                            <span class="category-badge" :class="getCategoryClass(expense.category)">
                                                {{ expense.category || 'Uncategorized' }}
                                            </span>
                                        </td>
                                        <td>{{ formatDate(expense.expense_date) }}</td>
                                        <td class="text-end">
                                            <button @click="editExpense(expense)"
                                                class="btn btn-sm btn-outline-primary me-2">Edit</button>
                                            <button @click="deleteExpense(expense.id)"
                                                class="btn btn-sm btn-outline-danger">Delete</button>
                                        </td>
                                    </tr>
                                    <tr v-if="loadingExpenses">
                                        <td colspan="5" class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status"></div>
                                            <div class="text-muted mt-2">Loading expenses...</div>
                                        </td>
                                    </tr>
                                    <tr v-if="!loadingExpenses && filteredExpenses.length === 0">
                                        <td colspan="5" class="text-center text-muted py-4">
                                            No expenses found
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="showEditModal" class="modal" @click.self="closeEditModal">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Expense</h5>
                        <button type="button" class="close-btn" @click="closeEditModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="updateExpense">
                            <div class="form-group mb-3">
                                <label class="form-label">Title</label>
                                <input type="text" v-model="editingExpense.title" class="form-control" required />
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Amount</label>
                                <input type="number" v-model="editingExpense.amount" class="form-control" step="0.01"
                                    required />
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Category</label>
                                <select v-model="editingExpense.category" class="form-control" required>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Food">Food</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Health">Health</option>
                                    <option value="Dining">Dining</option>
                                    <option value="Education">Education</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Expense Date</label>
                                <input type="date" v-model="editingExpense.expense_date" class="form-control"
                                    required />
                            </div>
                            <div class="d-flex gap-2">
                                <button type="submit" class="btn btn-primary flex-grow-1">Update Expense</button>
                                <button type="button" class="btn btn-secondary" @click="closeEditModal">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="toast.show" class="toast-notification" :class="toast.type">
            <span class="toast-icon">{{ toast.type === 'success' ? '✔️' : '❌' }}</span>
            <span class="toast-message">{{ toast.message }}</span>
        </div>
    </div>
</template>

<style scoped>
.fw-bold {
    font-weight: 700;
}

.fw-medium {
    font-weight: 500;
}

.text-primary {
    color: #4A90E2;
}

.text-muted {
    color: #6c757d;
}

.text-center {
    text-align: center;
}

.text-end {
    text-align: right;
}

.expense-manager {
    padding: 20px;
    background-color: #f8f9fa;
    min-height: 100vh;
}

.table-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

/* Card Styling */
.card {
    border: none;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin-bottom: 20px;
    transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-bottom: 2px solid #e9ecef;
    padding: 1.25rem 1.5rem;
    border-radius: 12px 12px 0 0;
}

.card-header h4 {
    color: #1a3a6f;
    font-weight: 600;
    font-size: 1.25rem;
}

.card-body {
    padding: 1.5rem;
}

/* Form Controls */
.form-label {
    color: #2c3e50;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.form-control,
.form-select {
    border: 1px solid #d1d9e6;
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    transition: all 0.2s;
}

.form-control:focus,
.form-select:focus {
    border-color: #4A90E2;
    box-shadow: 0 0 0 0.2rem rgba(74, 144, 226, 0.15);
    outline: none;
}

/* Buttons */
.btn {
    display: inline-block;
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
}

.btn-primary {
    background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-weight: 500;
    transition: all 0.2s;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #357ABD 0%, #2E6BA3 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(74, 144, 226, 0.3);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-outline-primary {
    border: 1px solid #4A90E2;
    color: #4A90E2;
    border-radius: 6px;
    transition: all 0.2s;
    background: transparent;
}

.btn-outline-primary:hover {
    background: #4A90E2;
    color: white;
    transform: translateY(-1px);
}

.btn-outline-danger {
    border: 1px solid #dc3545;
    color: #dc3545;
    border-radius: 6px;
    transition: all 0.2s;
    background: transparent;
}

.btn-outline-danger:hover {
    background: #dc3545;
    color: white;
    transform: translateY(-1px);
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1rem;
}

.btn-secondary:hover {
    background: #5a6268;
}

.btn-sm {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
}

/* Alert Styling */
.alert-info {
    background-color: #e8f4f8;
    border: 1px solid #b8e0f0;
    border-radius: 8px;
    color: #1a6b8a;
}

/* Table Styling */
.table {
    margin-bottom: 0;
}

.table-light {
    background-color: #f8f9fa;
}

.table th {
    color: #1a3a6f;
    font-weight: 600;
    border-bottom: 2px solid #e9ecef;
}

.table td {
    vertical-align: middle;
    color: #2c3e50;
}

.table-hover tbody tr:hover {
    background-color: #f8f9fa;
    transition: background-color 0.2s;
}

.table td[colspan] {
    color: #6c757d;
}

/* Category Badges */
.category-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
}

.category-primary {
    background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
    color: white;
}

.category-info {
    background: #5bc0de;
    color: white;
}

.category-secondary {
    background: #6c757d;
    color: white;
}

.category-success {
    background: #28a745;
    color: white;
}

.category-warning {
    background: #ffc107;
    color: #2c3e50;
}

.category-danger {
    background: #dc3545;
    color: white;
}

.category-dark {
    background: #343a40;
    color: white;
}

.category-light {
    background: #f8f9fa;
    color: #2c3e50;
    border: 1px solid #dee2e6;
}

.category-muted {
    background: #adb5bd;
    color: white;
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
}

.modal-dialog {
    width: 90%;
    max-width: 500px;
}

.modal-content {
    border-radius: 12px;
    border: none;
    background: white;
}

.modal-header {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-bottom: 2px solid #e9ecef;
    border-radius: 12px 12px 0 0;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    color: #1a3a6f;
    font-weight: 600;
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
}

.close-btn:hover {
    color: #333;
}

.modal-body {
    padding: 1.5rem;
}

/* Toast Notification */
.toast-notification {
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

.toast-notification.success {
    border-left: 4px solid #28a745;
    color: #28a745;
}

.toast-notification.error {
    border-left: 4px solid #dc3545;
    color: #dc3545;
}

.toast-icon {
    font-size: 1.2rem;
    font-weight: bold;
}

.period-select {
    width: auto;
    min-width: 120px;
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

/* Bill Details Animation */
.bill-details {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Loading Spinner */
.spinner-border {
    display: inline-block;
    width: 2rem;
    height: 2rem;
    border: 0.25em solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
    to { transform: rotate(360deg); }
}

/* Chart Container */
canvas {
    max-height: 300px;
    margin-bottom: 1rem;
}

/* Gap utility */
.gap-2 {
    gap: 0.5rem;
}

.flex-wrap {
    flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 768px) {
    .expense-manager {
        padding: 10px;
    }

    .card-header {
        flex-direction: column;
        gap: 10px;
    }

    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    .toast-notification {
        bottom: 1rem;
        right: 1rem;
        left: 1rem;
    }
}
</style>