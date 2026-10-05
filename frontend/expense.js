// ==================== API URL CONFIGURATION ====================
// Dynamically detects environment: switches to deployed backend when published, falls back to localhost
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://expense-lime-ten.vercel.app'; // Replace with your actual deployed backend URL

const API_URL = `${API_BASE_URL}/expense`;
const PURCHASE_URL = `${API_BASE_URL}/purchase`;

// ==================== CASHFREE SDK INITIALIZATION ====================
const cashfree = Cashfree({
    mode: "sandbox"
});

// ==================== STATE MANAGEMENT ====================
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// ==================== PAGE INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    fetchExpenses(currentPage);
    checkPremiumStatus();

    const leaderboardBtn = document.getElementById('show-leaderboard-btn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', fetchLeaderboard);
    }
});

// ==================== CHECK USER PREMIUM STATUS ====================
async function checkPremiumStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/user/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user status');

        const data = await response.json();
        const isPremium = Boolean(data.isPremiumUser);

        localStorage.setItem('isPremium', isPremium ? 'true' : 'false');

        if (isPremium) {
            showPremiumUI();
        } else {
            checkUserPremiumAndEnableDownload();
        }
    } catch (err) {
        console.error('Error checking premium status:', err);
        checkUserPremiumAndEnableDownload();
    }
}

// ==================== APPLY PREMIUM UI CHANGES ====================
function showPremiumUI() {
    const banner = document.getElementById('premium-banner');
    if (banner) {
        banner.innerText = 'You are a premium user now';
        banner.style.display = 'block';
    }

    const buyBtn = document.getElementById('buy-premium-btn');
    const leaderboardBtn = document.getElementById('show-leaderboard-btn');

    if (buyBtn) buyBtn.style.display = 'none';
    if (leaderboardBtn) leaderboardBtn.style.display = 'inline-block';

    checkUserPremiumAndEnableDownload();
}

// ==================== FETCH EXPENSES WITH PAGINATION ====================
async function fetchExpenses(page = 1) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/get-expense?page=${page}&limit=${ITEMS_PER_PAGE}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch expenses');

        const data = await response.json();

        // Safe extraction for both Object { expenses: [...] } and direct Array [...] responses
        let expenses = [];
        let pagination = { currentPage: page, lastPage: 1 };

        if (Array.isArray(data)) {
            expenses = data;
        } else if (data && Array.isArray(data.expenses)) {
            expenses = data.expenses;
            if (data.pagination) {
                pagination = data.pagination;
            }
        }

        currentPage = pagination.currentPage;

        // Render Table Rows
        const expenseList = document.getElementById('expense-list');
        if (expenseList) {
            expenseList.innerHTML = '';

            if (expenses.length === 0) {
                expenseList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No expenses found.</td></tr>';
            } else {
                expenses.forEach(exp => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>₹${exp.amount}</td>
                        <td>${exp.description}</td>
                        <td><strong>${exp.category}</strong></td>
                        <td>
                            <button onclick="deleteExpense('${exp._id || exp.id}')">Delete</button>
                        </td>
                    `;
                    expenseList.appendChild(tr);
                });
            }
        }

        // Render Pagination Controls
        renderPaginationControls(pagination);

    } catch (error) {
        console.error('Fetch Expenses Error:', error);
    }
}

// ==================== RENDER PAGINATION CONTROLS ====================
function renderPaginationControls(pagination) {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    container.innerHTML = '';

    const { currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage } = pagination;

    // Previous Button
    if (hasPreviousPage) {
        const prevBtn = document.createElement('button');
        prevBtn.innerText = '◄ Prev';
        prevBtn.onclick = () => fetchExpenses(previousPage);
        container.appendChild(prevBtn);
    }

    // Page 1 Jump Button
    if (currentPage !== 1 && previousPage !== 1) {
        const page1Btn = document.createElement('button');
        page1Btn.innerText = '1';
        page1Btn.onclick = () => fetchExpenses(1);
        container.appendChild(page1Btn);

        if (currentPage > 3) {
            const dots = document.createElement('span');
            dots.innerText = '...';
            container.appendChild(dots);
        }
    }

    // Current Page Badge
    const currentBtn = document.createElement('button');
    currentBtn.innerText = `Page ${currentPage} of ${lastPage}`;
    currentBtn.className = 'page-active';
    container.appendChild(currentBtn);

    // Next Button
    if (hasNextPage) {
        const nextBtn = document.createElement('button');
        nextBtn.innerText = 'Next ►';
        nextBtn.onclick = () => fetchExpenses(nextPage);
        container.appendChild(nextBtn);
    }

    // Last Page Jump Button
    if (currentPage !== lastPage && nextPage !== lastPage) {
        if (currentPage < lastPage - 2) {
            const dots = document.createElement('span');
            dots.innerText = '...';
            container.appendChild(dots);
        }

        const lastBtn = document.createElement('button');
        lastBtn.innerText = `Last (${lastPage})`;
        lastBtn.onclick = () => fetchExpenses(lastPage);
        container.appendChild(lastBtn);
    }
}

// ==================== ADD EXPENSE (FORM SUBMIT) ====================
document.getElementById('expense-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Session expired. Please log in again.');
        window.location.href = 'login.html';
        return;
    }

    const submitBtn = document.getElementById('add-btn');
    const originalBtnText = submitBtn.innerText;

    try {
        if (category === 'auto') {
            submitBtn.innerText = '🤖 AI Categorizing...';
            submitBtn.disabled = true;
        }

        const response = await fetch(`${API_URL}/add-expense`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount, description, category })
        });

        if (response.ok) {
            document.getElementById('expense-form').reset();
            fetchExpenses(1); // Jump to page 1 to highlight the newly added expense
        } else {
            alert('Failed to add expense.');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ==================== DELETE EXPENSE ====================
async function deleteExpense(id) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in again.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/delete-expense/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            fetchExpenses(currentPage);
        } else {
            alert('Failed to delete expense');
        }
    } catch (error) {
        console.error('Delete Expense Error:', error);
    }
}

// ==================== AI SPENDING INSIGHTS ====================
async function fetchAIInsights() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Please log in first.');
        return;
    }

    const insightsList = document.getElementById('insights-list');
    const insightsBtn = document.getElementById('get-insights-btn');

    try {
        insightsBtn.innerText = 'Analyzing...';
        insightsBtn.disabled = true;
        insightsList.innerHTML = '<li>⏳ AI is analyzing your spending patterns...</li>';

        const response = await fetch(`${API_URL}/spending-insights`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch AI insights');

        const data = await response.json();
        insightsList.innerHTML = '';

        if (data.insights && data.insights.length > 0) {
            data.insights.forEach(tip => {
                const li = document.createElement('li');
                li.style.marginBottom = '8px';
                li.innerHTML = `💡 ${tip}`;
                insightsList.appendChild(li);
            });
        } else {
            insightsList.innerHTML = '<li>No insights available. Add more expenses first!</li>';
        }
    } catch (err) {
        console.error('Error loading AI insights:', err);
        insightsList.innerHTML = '<li style="color: red;">Failed to load AI insights. Try again.</li>';
    } finally {
        insightsBtn.innerText = 'Get AI Insights';
        insightsBtn.disabled = false;
    }
}

// ==================== FETCH LEADERBOARD ====================
async function fetchLeaderboard() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Please log in first.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/premium/showLeaderBoard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const leaderboardData = await response.json();
        const leaderboardList = document.getElementById('leaderboard-list');

        if (!leaderboardList) return;
        leaderboardList.innerHTML = '';

        leaderboardData.forEach((user, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>#${index + 1}</strong> ${user.name} - <span>₹${user.totalExpenses || user.totalExpense || 0}</span>
            `;
            leaderboardList.appendChild(li);
        });

    } catch (err) {
        console.error('Error loading leaderboard:', err);
        alert('Failed to load leaderboard.');
    }
}

// ==================== BUY PREMIUM MEMBERSHIP ====================
window.buyPremium = async function buyPremium() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Please log in to purchase premium membership.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${PURCHASE_URL}/buy-premium`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Failed to initiate premium purchase.');
            return;
        }

        const checkoutOptions = {
            paymentSessionId: data.paymentSessionId,
            redirectTarget: "_modal"
        };

        cashfree.checkout(checkoutOptions).then(async () => {
            const verifyResponse = await fetch(`${PURCHASE_URL}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId: data.orderId })
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.status === 'SUCCESS') {
                alert('Transaction successful');
                localStorage.setItem('isPremium', 'true');
                showPremiumUI();
            } else {
                alert('TRANSACTION FAILED');
            }
        });

    } catch (error) {
        console.error('Checkout Error:', error);
        alert('TRANSACTION FAILED');
    }
};

// ==================== PREMIUM ACCESS FOR DOWNLOAD BUTTON ====================
function checkUserPremiumAndEnableDownload() {
    const downloadBtn = document.getElementById('download-expenses-btn');
    if (!downloadBtn) return;

    // Clone element to prevent multiple click listener bindings
    const newBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

    const isPremium = localStorage.getItem('isPremium') === 'true';

    if (isPremium) {
        newBtn.disabled = false;
        newBtn.style.cursor = 'pointer';
        newBtn.style.opacity = '1';
        newBtn.title = 'Click to view and download reports';

        newBtn.addEventListener('click', () => {
            window.location.href = 'reports.html';
        });
    } else {
        newBtn.disabled = true;
        newBtn.style.cursor = 'not-allowed';
        newBtn.style.opacity = '0.6';
        newBtn.title = 'Download feature is available for Premium users only';

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('This is a Premium Feature. Please buy Premium to download reports!');
        });
    }
}