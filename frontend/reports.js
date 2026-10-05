// Dynamic Base URL for local development and production deployment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://your-backend.onrender.com'; // Replace with your production backend URL

let currentTimeframe = 'daily';
let isPremiumUser = false;
let allTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
    checkUserPremiumStatus();
    await fetchUserTransactions();
});

function checkUserPremiumStatus() {
    isPremiumUser = localStorage.getItem('isPremium') === 'true';

    const badge = document.getElementById('user-status-badge');
    const downloadBtn = document.getElementById('download-btn');

    if (badge) {
        badge.innerText = isPremiumUser ? 'PREMIUM' : 'FREE PLAN';
        badge.className = isPremiumUser ? 'premium-badge' : 'non-premium-badge';
    }

    if (downloadBtn) {
        downloadBtn.disabled = !isPremiumUser;
        downloadBtn.title = isPremiumUser ? "Download report as CSV" : "Download is a Premium feature";
    }
}

async function fetchUserTransactions() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('User not authenticated. Redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    try {
        // Updated to /expense/get-expense with Bearer token header
        const response = await axios.get(`${API_BASE_URL}/expense/get-expense`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Safely extract array whether backend returns { expenses: [...] } or plain array [...]
        const data = response.data;
        let fetchedData = [];

        if (Array.isArray(data)) {
            fetchedData = data;
        } else if (data && Array.isArray(data.expenses)) {
            fetchedData = data.expenses;
        }
        
        allTransactions = fetchedData.map(item => ({
            id: item._id || item.id,
            type: item.type || 'expense',
            category: item.category || 'General',
            description: item.description || '',
            amount: Number(item.amount || 0),
            date: item.createdAt || item.date || new Date().toISOString()
        }));

        renderReport();
    } catch (error) {
        console.error('Error fetching transactions for report:', error);
        renderReport();
    }
}

function setTimeframe(type) {
    currentTimeframe = type;

    document.getElementById('btn-daily')?.classList.toggle('active', type === 'daily');
    document.getElementById('btn-weekly')?.classList.toggle('active', type === 'weekly');
    document.getElementById('btn-monthly')?.classList.toggle('active', type === 'monthly');

    renderReport();
}

function getFilteredTransactions() {
    const now = new Date();

    return allTransactions.filter(txn => {
        const txnDate = new Date(txn.date);

        if (currentTimeframe === 'daily') {
            return txnDate.toDateString() === now.toDateString();
        } else if (currentTimeframe === 'weekly') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            return txnDate >= startOfWeek && txnDate <= now;
        } else if (currentTimeframe === 'monthly') {
            return txnDate.getMonth() === now.getMonth() && txnDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

function renderReport() {
    const filtered = getFilteredTransactions();
    const listContainer = document.getElementById('transaction-list');

    let totalIncome = 0;
    let totalExpense = 0;

    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">No transactions recorded for this ${currentTimeframe} period.</div>`;
    } else {
        filtered.forEach(txn => {
            if (txn.type === 'income') {
                totalIncome += txn.amount;
            } else {
                totalExpense += txn.amount;
            }

            const isIncome = txn.type === 'income';
            const formattedDate = new Date(txn.date).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            const itemHtml = `
                <div class="transaction-item">
                    <div class="txn-info">
                        <span class="txn-category">${txn.category}</span>
                        <span class="txn-desc">${txn.description || 'No description'} • ${formattedDate}</span>
                    </div>
                    <span class="txn-amount ${isIncome ? 'income-text' : 'expense-text'}">
                        ${isIncome ? '+' : '-'}₹${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    const netBalance = totalIncome - totalExpense;

    const totalIncomeElem = document.getElementById('total-income');
    const totalExpenseElem = document.getElementById('total-expense');
    const netBalanceElem = document.getElementById('net-balance');

    if (totalIncomeElem) totalIncomeElem.innerText = `+₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (totalExpenseElem) totalExpenseElem.innerText = `-₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (netBalanceElem) netBalanceElem.innerText = `₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function handleDownload() {
    if (!isPremiumUser) {
        alert('Downloading reports is a Premium feature. Please upgrade your account!');
        return;
    }

    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
        alert('No transactions available to download for this timeframe.');
        return;
    }

    let csvRows = ['Type,Category,Description,Amount,Date'];
    
    filtered.forEach(t => {
        const row = [
            `"${t.type}"`,
            `"${t.category}"`,
            `"${t.description.replace(/"/g, '""')}"`,
            t.amount,
            `"${new Date(t.date).toLocaleString('en-IN')}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', `Expense_Report_${currentTimeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}