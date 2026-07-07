<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import api from '../services/api';
import Chart from 'chart.js/auto';

const activeTab = ref('users');
const refreshing = ref(false);
const saving = ref(false);
const userSearch = ref('');
const expenseSearch = ref('');
const billSearch = ref('');
const shoppingItemsSearch = ref('');
const expenseFilter = ref('all');
const billStatusFilter = ref('all');
const shoppingItemsStatusFilter = ref('all');
const showAddUserModal = ref(false);
const showEditUserModal = ref(false);
const showDeleteConfirm = ref(false);
const showUserDetails = ref(false);
const editingUser = ref(null);
const selectedUser = ref(null);
const deleteItem = ref(null);
const deleteType = ref('');

const reportFilters = ref({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
});

const stats = ref({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalExpenses: 0,
    totalBills: 0,
    totalShoppingItems: 0,
    expensesGrowth: 0,
    overdueBills: 0,
    purchasedItems: 0,
});

const users = ref([]);
const expenses = ref([]);
const bills = ref([]);
const shoppingItems = ref([]);
const reportData = ref({
    totalExpenses: 0,
    totalBillsPaid: 0,
    activeUsers: 0,
    avgExpensePerUser: 0,
    topUsers: [],
});

const userForm = ref({
    name: '',
    email: '',
    password: '',
    role: 'User',
    //is_active: true,
});

const toast = ref({
    show: false,
    message: '',
    type: 'success',
});

const expenseCategoryChart = ref(null);
const topUsersChart = ref(null);
let categoryChart = null;
let usersChart = null;

const tabs = [
    {id: 'users', label: 'Users', icon: '👥'},
    {id: 'expenses', label: 'Expenses', icon: '💰'},
    {id: 'bills', label: 'Bills', icon: '📄'},
    {id: 'shopping-items', label: 'Shopping Items', icon: '🛒'},
    {id: 'reports', label: 'Reports', icon: '📊'},
];

const categories = ['Bills', 'Groceries', 'Entertainment', 'Utilities', 'Transportation', 'Healthcare', 'Shopping', 'Other'];
const currentDate = computed(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
})

const filteredUsers = computed(() => {
    if (!userSearch.value) return users.value;
    return users.value.filter(user => 
        user.name.toLowerCase().includes(userSearch.value.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.value.toLowerCase())
    );
})

const filteredExpenses = computed(() => {
    let filtered = [...expenses.value];
    if (expenseSearch.value) {
        filtered = filtered.filter(expense => 
            (expense.description || expense.title || '').toLowerCase().includes(expenseSearch.value.toLowerCase())
        );
    }
    if (expenseFilter.value !== 'all') {
        filtered = filtered.filter(expense => expense.category === expenseFilter.value);
    }
    return filtered;
})

const filteredBills = computed(() => {
    let filtered = [...bills.value];
    if (billSearch.value) {
        filtered = filtered.filter(bill => 
            (bill.name || '').toLowerCase().includes(billSearch.value.toLowerCase())
        );
    }
    if (billStatusFilter.value !== 'all') {
        filtered = filtered.filter(bill => {
            const status = getBillStatus(bill.status, bill.due_date);
            return status === billStatusFilter.value;
        });
    }
    return filtered;
})

const filteredShoppingItems = computed(() => {
    let filtered = [...shoppingItems.value];
    if (shoppingItemsSearch.value) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(shoppingItemsSearch.value.toLowerCase())
        );
    }
    if (shoppingItemsStatusFilter.value !== 'all') {
        filtered = filtered.filter(item => 
            item.status === shoppingItemsStatusFilter.value
        );
    }
    return filtered;
})

const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
}

const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString();
}

const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const getAvatarColor = (name) => {
    const colors = ['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];
    const index = (name?.length || 0) % colors.length;
    return colors[index];
}

const getRoleClass = (role) => {
    if (role === 'Admin') return 'admin-role';
    return 'role-user'
}

const getBillStatus = (status, dueDate) => {
    if (status === 'paid') return 'Paid';
    const due = new Date(dueDate);
    const today = new Date();
    if (due < today) return 'Overdue';
    return 'Unpaid';
}

const getBillStatusClass = (status, dueDate) => {
    const billStatus = getBillStatus(status, dueDate);
    if (billStatus === 'Paid') return 'success';
    if (billStatus === 'Overdue') return 'danger';
    return 'warning';
}

const getCategoryColor = (category) => {
    const colors = {
        Bills: 'var(--primary)',
        Groceries: '#10b981',
        Entertainment: '#f59e0b',
        Utilities: '#ef4444',
        Transportation: '#8b5cf6',
        Healthcare: '#ec489a',
        Shopping: '#14b8a6',
        Other: 'var(--text-muted)',  
    }
    return colors[category] || 'var(--text-muted)';
}

const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type };
    setTimeout(() => {
        toast.value.show = false;
    }, 3000);
}

const fetchDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard');
        stats.value = response.data;
    } catch (error) {
        showToast('Failed to load dashboard stats', 'error');
    }
}

const fetchUsers = async () => {
    try {
        const response = await api.get('/users');
        users.value = response.data;
    } catch (error) {
        showToast('Failed to load users', 'error');
    }
}

const fetchExpenses = async () => {
    try {
        const response = await api.get('/expenses');
        expenses.value = response.data;
    } catch (error) {
        showToast('Failed to load expenses', 'error');
    }
}

const fetchBills = async () => {
    try {
        const response = await api.get('/bills');
        bills.value = response.data;
    } catch (error) {
        showToast('Failed to load bills', 'error');
    }
}

const fetchShoppingItems = async () => {
    try {
        const response = await api.get('/shopping-items');
        shoppingItems.value = response.data;
    } catch (error) {
        showToast('Failed to load shopping items', 'error');
    }
}

const saveUser = async () => {
    saving.value = true;
    try {
        if (editingUser.value) {
            await api.put(`/users/${editingUser.value.id}`, userForm.value);
            showToast('User updated successfully');
        } else {
            await api.post('/users', userForm.value);
            showToast('User created successfully');
        }
        closeUserModal();
        await fetchUsers();
        await fetchDashboardStats();
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to save user', 'error');
    } finally {
        saving.value = false;
    }
}

const editUser = (user) => {
    editingUser.value = user;
    userForm.value = {
        name: user.name,
        email: user.email,
        role: user.role || 'User',
        //is_active: user.is_active !== false,
    }
    showEditUserModal.value = true;
}

const viewUserDetails = (user) => {
    selectedUser.value = user;
    showUserDetails.value = true;
}

const confirmDeleteUser = (user) => {
    deleteItem.value = user;
    deleteType.value = 'user';
    showDeleteConfirm.value = true;
}

const deleteExpense = async (id) => {
    if (confirm('Delete this expense?')) {
        try {
            await api.delete(`/expenses/${id}`);
            showToast('Expense deleted successfully');
            await fetchExpenses();
            await fetchDashboardStats();
        } catch (error) {
            showToast('Failed to delete expense', 'error');
        }
    }
}

const deleteBill = async (id) => {
    if (confirm('Delete this bill?')) {
        try {
            await api.delete(`/bills/${id}`);
            showToast('Bill deleted successfully');
            await fetchBills();
            await fetchDashboardStats();
        } catch (error) {
            showToast('Failed to delete bill', 'error');
        }
    }
}

const deleteShoppingItem = async (id) => {
    if (confirm('Delete this shopping item?')) {
        try {
            await api.delete(`/shopping-items/${id}`);
            showToast('Shopping item deleted successfully');
            await fetchShoppingItems();
            await fetchDashboardStats();
        } catch (error) {
            showToast('Failed to delete shopping item', 'error');
        }
    }
}

const performDelete = async () => {
    try {
        if (deleteType.value === 'user') {
            await api.delete(`/users/${deleteItem.value.id}`);
            showToast('User deleted successfully');
            await fetchUsers();
            await fetchDashboardStats();
        }
        showDeleteConfirm.value = false;
        deleteItem.value = null;
    } catch (error) {
        showToast('Failed to delete item', 'error');
    }
}

const generateReport = async () => {
    refreshing.value = true;
    try {
        const response = await api.get('/reports/expenses', {
            params: {
                start_date: reportFilters.value.start_date,
                end_date: reportFilters.value.end_date,
            }
        });
        reportData.value = response.data;
        await nextTick();
        updateCharts();
    } catch (error) {
        showToast('Failed to generate report', 'error');
    } finally {
        refreshing.value = false;
    }
}

const exportReport = async () => {
    try {
        const response = await api.get('reports/summary', {
            params: {
                start_date: reportFilters.value.start_date,
                end_date: reportFilters.value.end_date,
            },
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report_${reportFilters.value.start_date}_to_${reportFilters.value.end_date}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Report exported successfully');
    } catch (error) {
        showToast('Failed to export report', 'error');
    }
}

const updateCharts = () => {
    if (categoryChart) categoryChart.destroy();
    if (expenseCategoryChart.value && reportData.value.categoryBreakdown) {
        const ctx = expenseCategoryChart.value.getContext('2d');
        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: reportData.value.categoryBreakdown.map(c => c.category) || [],
                datasets: [{
                    label: 'Amount',
                    data: reportData.value.categoryBreakdown?.map(c => c.total) || [],
                    backgroundColor: 'var(--primary)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    if (usersChart) usersChart.destroy();
    if (topUsersChart.value && reportData.value.topUsers) {
        const ctx = topUsersChart.value.getContext('2d');
        usersChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: reportData.value.topUsers?.slice(0, 5).map(u => u.name) || [],
                datasets: [{
                    label: 'Total Spent',
                    data: reportData.value.topUsers?.slice(0, 5).map(u => u.total_spent) || [],
                    backgroundColor: '#10b981',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

const refreshData = async () => {
    refreshing.value = true;
    await Promise.all([
        fetchDashboardStats(),
        fetchUsers(),
        fetchExpenses(),
        fetchBills(),
        fetchShoppingItems(),
    ]);
    refreshing.value = false;
    showToast('Data refreshed successfully');
}

const closeUserModal = () => {
    showAddUserModal.value = false;
    showEditUserModal.value = false;
    editingUser.value = null;
    userForm.value = {
        name: '',
        email: '',
        password: '',
        role: 'User',
        //is_active: true,
    }
}

watch(activeTab, (newTab) => {
    if (newTab === 'reports') {
        generateReport();
    }
})

onMounted(() => {
    refreshData();
})
</script>

<template>
    <div class="admin-dashboard">
        <div class="admin-header">
            <div class="header-left">
                <h1>Admin Dashboard</h1>
                <p class="header-subtitle">System Overview and Management</p>
            </div>
            <div class="header-right">
                <div class="date-display">
                    <span class="date-icon">📅</span>
                    <span>{{ currentDate }}</span>
                </div>
                <button class="refresh-btn" @click="refreshData" :disabled="refreshing">
                    <span class="refresh-icon">🔄</span>
                    {{ refreshing ? 'Refreshing...' : 'Refresh' }}
                </button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card stat-primary">
                <div class="stat-icon">👥</div>
                <div class="stat-info">
                    <div class="stat-value">{{ stats.totalUsers }}</div>
                    <div class="stat-label">Total Users</div>
                    <div class="stat-trend positive">{{ stats.newUsersThisMonth }} this month</div>
                </div>
            </div>

            <div class="stat-card stat-success">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-value">{{ formatAmount(stats.totalExpenses) }}</div>
                    <div class="stat-label">Total Expenses</div>
                    <div class="stat-trend positive">{{ stats.expensesGrowth }} %</div>
                </div>
            </div>

            <div class="stat-card stat-info">
                <div class="stat-icon">📄</div>
                <div class="stat-info">
                    <div class="stat-value">{{ stats.totalBills }}</div>
                    <div class="stat-label">Total Bills</div>
                    <div class="stat-trend negative">{{ stats.overdueBills }} overdue</div>
                </div>
            </div>

            <div class="stat-card stat-warning">
                <div class="stat-icon">🛒</div>
                <div class="stat-info">
                    <div class="stat-value">{{ stats.totalShoppingItems }}</div>
                    <div class="stat-label">Shopping Items</div>
                    <div class="stat-trend positive">{{ stats.purchasedItems }} purchased</div>
                </div>
            </div>
        </div>

        <div class="admin-tabs">
            <button v-for="tab in tabs" :key="tab.id" class="tab-btn" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id" >
                <span class="tab-icon">{{ tab.icon }}</span>
                <span>{{ tab.label }}</span>
                <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
            </button>
        </div>

        <div v-if="activeTab === 'users'" class="tab-panel">
            <div class="panel-header">
                <h2>Users</h2>
                <div class="panel-actions">
                    <div class="search-box">
                        <input v-model="userSearch" type="text" class="search-input" placeholder="Search users..." />
                    </div>
                    <button class="btn-primary" @click="showAddUserModal = true">Add User</button>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Expenses</th>
                            <th>Bills</th>
                            <th>Status</th>
                            <th>Actions</th> 
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in filteredUsers" :key="user.id">
                            <td>{{ user.id }}</td>
                            <td class="user-cell">
                                <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(user.name) }">
                                    {{ getUserInitials(user.name) }}
                                </div>
                                <span class="user-name">{{ user.name }}</span>
                            </td>
                            <td>{{ user.email }}</td>
                            <td>
                                <span class="role-badge" :class="getRoleClass(user.role)">
                                    {{ user.role || 'User' }}
                                </span>
                            </td>
                            <td>{{ formatDate(user.created_at) }}</td>
                            <td>{{ user.expenses_count || 0 }}</td>
                            <td>{{ user.bills_count || 0 }}</td>
                            <td>
                                <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                                    {{ user.is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="actions-cell">
                                <button class="icon-btn" @click="editUser(user)" title="Edit">✏️</button>
                                <button class="icon-btn danger" @click="confirmDeleteUser(user)" title="Delete">🗑️</button>
                                <button class="icon-btn" @click="viewUserDetails(user)" title="View Details">🔍</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="activeTab === 'expenses'" class="tab-panel">
            <div class="panel-header">
                <h2>Expenses</h2>
                <div class="panel-actions">
                    <div class="search-box">
                        <input v-model="expenseSearch" type="text" placeholder="Search expenses..." class="search-input" />
                    </div>
                    <select v-model="expenseFilter" class="filter-select">
                        <option value="all">All Categories</option>
                        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Amount</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>User</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="expense in filteredExpenses" :key="expense.id">
                            <td>{{ expense.id }}</td>
                            <td>
                                <div class="user-cell">
                                    <span class="user-name">{{ expense.user?.name || 'Unknown' }}</span>
                                </div>
                            </td>
                            <td>{{ expense.title }}</td>
                            <td>
                                <span class="category-tag" :style="{ background: getCategoryColor(expense.category) + '22', color: getCategoryColor(expense.category) }">
                                    {{ expense.category }}
                                </span>
                            </td>
                            <td class="amount-cell">{{ formatAmount(expense.amount) }}</td>
                            <td>{{ formatDate(expense.date) }}</td>
                            <td class="actions-cell">
                                <button class="icon-btn" @click="deleteExpense(expense.id)" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="activeTab === 'bills'" class="tab-panel">
            <div class="panel-header">
                <h2>Bills</h2>
                <div class="panel-actions">
                    <div class="search-box">
                        <input v-model="billSearch" type="text" placeholder="Search bills..." class="search-input" />
                    </div>
                    <select v-model="billStatusFilter" class="filter-select">
                        <option value="all">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Unpaid">Unpaid</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>User</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="bill in filteredBills" :key="bill.id">
                            <td>{{ bill.id }}</td>
                            <td>{{ bill.name }}</td>
                            <td>{{ formatAmount(bill.amount) }}</td>
                            <td>{{ formatDate(bill.dueDate) }}</td>
                            <td>
                                <span class="status-badge" :class="getBillStatusClass(bill.status, bill.due_date)">
                                    {{ getBillStatus(bill.status, bill.due_date) }}
                                </span>
                            </td>
                            <td>
                                <div class="user-cell">
                                    <span class="user-name">{{ bill.user?.name || 'Unknown' }}</span>
                                </div>
                            </td>
                            <td class="actions-cell">
                                <button class="icon-btn" @click="deleteBill(bill.id)" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="activeTab === 'shopping-items'" class="tab-panel">
            <div class="panel-header">
                <h2>Shopping Items</h2>
                <div class="panel-actions">
                    <div class="search-box">
                        <input v-model="shoppingItemsSearch" type="text" placeholder="Search shopping items..." class="search-input" />
                    </div>
                    <select v-model="shoppingItemsStatusFilter" class="filter-select">
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="purchased">Purchased</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>User</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in filteredShoppingItems" :key="item.id">
                            <td>{{ item.id }}</td>
                            <td>{{ item.name }}</td>
                            <td>{{ formatAmount(item.price) }}</td>
                            <td>{{ item.quantity }}</td>
                            <td>
                                <span class="status-badge" :class="item.status === 'purchased' ? 'success' : 'warning'">
                                    {{ item.status === 'purchased' ? 'Purchased' : 'Pending' }}
                                </span>
                            </td>
                            <td>
                                <div class="user-cell">
                                    <span class="user-name">{{ item.user?.name || 'Unknown' }}</span>
                                </div>
                            </td>
                            <td class="actions-cell">
                                <button class="icon-btn" @click="deleteShoppingItem(item.id)" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="activeTab === 'reports'" class="tab-panel">
            <div class="reports-container">
                <div class="report-filters">
                    <div class="filter-group">
                        <label>Date Range</label>
                        <input type="date" v-model="reportFilters.start_date" />
                        <span>to</span>
                        <input type="date" v-model="reportFilters.end_date" />
                    </div>
                    <button class="btn-primary" @click="generateReport">Generate Report</button>
                    <button class="btn-secondary" @click="exportReport">Export CSV</button>
                </div>
                <div class="report-summary">
                    <div class="summary-item">
                        <div class="summary-title">Total Expenses</div>
                        <div class="summary-value">Ksh{{ formatAmount(reportData.totalExpenses) }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-title">Total Bills Paid</div>
                        <div class="summary-value">{{ reportData.totalBillsPaid }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-title">Active Users</div>
                        <div class="summary-value">{{ reportData.activeUsers }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-title">Avg Expense Per User</div>
                        <div class="summary-value">Ksh{{ formatAmount(reportData.avgExpensePerUser) }}</div>
                    </div>
                </div>
                <div class="chart-grid">
                    <div class="chart-card">
                        <h3>Expenses by Category</h3>
                        <canvas ref="expenseCategoryChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Top Spending Customers</h3>
                        <canvas ref="topUsersChart"></canvas>
                    </div>
                </div>
                <div class="data-card">
                    <h3>Top Spending Users</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>User</th>
                                <th>Total Spending</th>
                                <th>Bill Paid</th>
                                <th>Items Purchased</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(user, index) in reportData.topUsers" :key="user.id">
                                <td>{{ index + 1 }}</td>
                                <td>{{ user.name }}</td>
                                <td>{{ formatAmount(user.total_spent) }}</td>
                                <td>{{ user.bills_count || 0 }}</td>
                                <td>{{ user.items_purchased || 0 }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div v-if="showAddUserModal || showEditUserModal" class="modal" @click.self="closeUserModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>{{ editingUser ? 'Edit User' : 'Add New User' }}</h2>
                    <button class="close-btn" @click="closeUserModal">&times;</button>
                </div>
                <form @submit.prevent="saveUser" class="modal-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" v-model="userForm.name" required />
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" v-model="userForm.email" required />
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" v-model="userForm.password" :required="!editingUser" />
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select v-model="userForm.role" required>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" @click="closeUserModal">Cancel</button>
                        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : (editingUser ? 'Update' : 'Save') }}</button>
                    </div>
                </form>
            </div>
        </div>

        <div v-if="showDeleteConfirm" class="modal" @click.self="showDeleteConfirm = false">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Confirm Delete</h2>
                    <button class="close-btn" @click="showDeleteConfirm = false">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="warning-icon">⚠️</div>
                    <p>Are you sure you want to delete <strong>{{ deleteItem?.name }}</strong>?</p>
                    <p class="warning-text">This action cannot be undone.</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
                    <button class="btn-danger" @click="performDelete">Delete</button>
                </div>
            </div>
        </div>

        <div v-if="showUserDetails" class="modal" @click.self="showUserDetails = false">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>User Details: {{ selectedUser?.name }}</h2>
                    <button class="close-btn" @click="showUserDetails = false">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-profile">
                        <div class="profile-avatar" :style="{ backgroundColor: getAvatarColor(selectedUser?.name) }">
                            {{ getUserInitials(selectedUser?.name) }}
                        </div>
                        <div class="profile-info">
                            <p><strong>Email:</strong> {{ selectedUser?.email }}</p>
                            <p><strong>Role:</strong> {{ selectedUser?.role }}</p>
                            <p><strong>Joined:</strong> {{ formatDate(selectedUser?.created_at) }}</p>
                            <p><strong>Status:</strong> <span class="status-badge" :class="selectedUser?.is_active ? 'active' : 'inactive'">
                                {{ selectedUser?.is_active ? 'Active' : 'Inactive' }}</span></p>
                        </div>
                    </div>
                    <div class="user-stats">
                        <div class="stat-box">
                            <div class="stat-number">{{ selectedUser?.expenses_count || 0 }}</div>
                            <div class="stat-label">Expenses</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{{ selectedUser?.bills_count || 0 }}</div>
                            <div class="stat-label">Bills</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">Ksh{{ formatAmount(selectedUser?.total_spent || 0) }}</div>
                            <div class="stat-label">Total Spent</div>
                        </div>
                    </div>
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
.admin-dashboard {
  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
}

/* Header */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.header-subtitle {
  color: #64748b;
  font-size: 0.875rem;
}

.header-right {
  display: flex;
  gap: 16px;
  align-items: center;
}

.date-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--surface-muted);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-trend {
  font-size: 0.7rem;
}

.stat-trend.positive {
  color: #10b981;
}

.stat-trend.negative {
  color: #ef4444;
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: 8px;
  background: var(--surface);
  padding: 6px;
  border-radius: 14px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  background: var(--surface-muted);
  color: var(--text);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.tab-badge {
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
}

/* Panel */
.tab-panel {
  animation: fadeIn 0.3s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.panel-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}

.panel-actions {
  display: flex;
  gap: 12px;
}

/* Search */
.search-box {
  position: relative;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  width: 250px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: var(--surface);
  cursor: pointer;
}

/* Table */
.table-container {
  background: var(--surface);
  border-radius: 16px;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead th {
  text-align: left;
  padding: 16px;
  background: var(--bg);
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.data-table tbody td {
  padding: 14px 16px;
  font-size: 0.875rem;
  color: var(--text);
  border-bottom: 1px solid var(--surface-muted);
}

.data-table tbody tr:hover {
  background: var(--bg);
}

/* User Cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
}

.user-name {
  font-weight: 500;
}

/* Badges */
.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.role-admin {
  background: var(--primary);
  color: white;
}

.role-user {
  background: #e2e8f0;
  color: #475569;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-badge.active,
.status-badge.success {
  background: #d1fae5;
  color: #059669;
}

.status-badge.inactive,
.status-badge.danger {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.warning {
  background: #fed7aa;
  color: #ea580c;
}

.category-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.amount-cell {
  font-weight: 600;
  color: var(--primary);
}

/* Actions */
.actions-cell {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: transparent;
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.icon-btn:hover {
  background: var(--surface-muted);
}

.icon-btn.danger:hover {
  background: #fee2e2;
  border-color: #ef4444;
}

/* Buttons */
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
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
  background: var(--surface-muted);
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Reports */
.reports-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.report-filters {
  background: var(--surface);
  padding: 20px;
  border-radius: 16px;
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
  border: 1px solid #e2e8f0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.filter-group input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item {
  background: var(--surface);
  padding: 20px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.summary-title {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  background: var(--surface);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.chart-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.data-card {
  background: var(--surface);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.data-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
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

.modal-content {
  background: var(--surface);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #94a3b8;
}

.modal-body {
  padding: 24px;
}

.modal-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.warning-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 16px;
}

.warning-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 8px;
}

/* User Profile */
.user-profile {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.5rem;
}

.profile-info p {
  margin-bottom: 8px;
}

.user-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-box {
  text-align: center;
  padding: 16px;
  background: var(--bg);
  border-radius: 12px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: var(--surface);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  animation: slideIn 0.3s ease;
}

.toast.success {
  border-left: 4px solid #10b981;
  color: #10b981;
}

.toast.error {
  border-left: 4px solid #ef4444;
  color: #ef4444;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
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
@media (max-width: 1024px) {
  .admin-dashboard {
    padding: 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: auto;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .panel-actions {
    flex-direction: column;
  }
  
  .search-input {
    width: 100%;
  }
  
  .report-filters {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>